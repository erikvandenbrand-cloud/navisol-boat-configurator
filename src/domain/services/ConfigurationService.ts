/**
 * Configuration Service - v4
 * Handles configuration management, freezing, and snapshots
 * All pricing logic delegated to /domain/pricing
 */

import type {
  Project,
  ProjectConfiguration,
  ConfigurationItem,
  ConfigurationSnapshot,
  AddConfigurationItemInput,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { StatusMachine } from '@/domain/workflow';
import {
  calculateLineTotalExclVat,
  calculateConfigurationPricing,
  DEFAULT_VAT_RATE,
} from '@/domain/pricing';
import { ConfigurationRules } from '@/domain/rules';

// Helper to calculate totals using pricing module
function calculateConfigurationTotals(
  items: ConfigurationItem[],
  discountPercent?: number
): Pick<
  ProjectConfiguration,
  'subtotalExclVat' | 'discountAmount' | 'totalExclVat' | 'vatRate' | 'vatAmount' | 'totalInclVat'
> {
  const pricing = calculateConfigurationPricing(items, discountPercent, DEFAULT_VAT_RATE);
  return {
    subtotalExclVat: pricing.subtotalExclVat,
    discountAmount: pricing.discountAmount,
    totalExclVat: pricing.totalExclVat,
    vatRate: pricing.vatRate,
    vatAmount: pricing.vatAmount,
    totalInclVat: pricing.totalInclVat,
  };
}

// ============================================
// CONFIGURATION SERVICE
// ============================================

export const ConfigurationService = {
  /**
   * Add an item to the configuration
   */
  async addItem(
    projectId: string,
    input: AddConfigurationItemInput,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Check if configuration is frozen
    if (project.configuration.isFrozen) {
      return Err('Configuration is frozen. Use amendments to make changes.');
    }

    // Check if project status allows editing
    if (!StatusMachine.isEditable(project.status)) {
      return Err(`Cannot edit configuration in ${project.status} status`);
    }

    const lineTotalExclVat = calculateLineTotalExclVat(input.quantity, input.unitPriceExclVat);

    const newItem: ConfigurationItem = {
      id: generateUUID(),
      // Item type (Library v4)
      itemType: input.itemType,
      // Source references based on item type
      articleId: input.articleId,
      articleVersionId: input.articleVersionId,
      kitId: input.kitId,
      kitVersionId: input.kitVersionId,
      // Legacy support
      catalogItemId: input.catalogItemId,
      catalogVersionId: input.catalogVersionId,
      isCustom: input.isCustom,
      category: input.category,
      subcategory: input.subcategory,
      articleNumber: input.articleNumber,
      name: input.name,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      unitPriceExclVat: input.unitPriceExclVat,
      lineTotalExclVat,
      isIncluded: true,
      ceRelevant: input.ceRelevant || false,
      safetyCritical: input.safetyCritical || false,
      sortOrder: project.configuration.items.length,
    };

    const updatedItems = [...project.configuration.items, newItem];
    const totals = calculateConfigurationTotals(
      updatedItems,
      project.configuration.discountPercent
    );

    const updatedConfiguration: ProjectConfiguration = {
      ...project.configuration,
      items: updatedItems,
      ...totals,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    const updated = await ProjectRepository.updateConfiguration(projectId, updatedConfiguration);
    if (!updated) {
      return Err('Failed to update configuration');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectConfiguration',
      projectId,
      `Added item: ${input.name}`,
      { after: { itemId: newItem.id, name: input.name, quantity: input.quantity } }
    );

    return Ok(updated);
  },

  /**
   * Update an item in the configuration
   */
  async updateItem(
    projectId: string,
    itemId: string,
    updates: Partial<ConfigurationItem>,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.configuration.isFrozen) {
      return Err('Configuration is frozen. Use amendments to make changes.');
    }

    if (!StatusMachine.isEditable(project.status)) {
      return Err(`Cannot edit configuration in ${project.status} status`);
    }

    const itemIndex = project.configuration.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return Err('Item not found in configuration');
    }

    const existingItem = project.configuration.items[itemIndex];
    const updatedItem: ConfigurationItem = {
      ...existingItem,
      ...updates,
      lineTotalExclVat: calculateLineTotalExclVat(
        updates.quantity ?? existingItem.quantity,
        updates.unitPriceExclVat ?? existingItem.unitPriceExclVat
      ),
    };

    const updatedItems = [...project.configuration.items];
    updatedItems[itemIndex] = updatedItem;

    const totals = calculateConfigurationTotals(
      updatedItems,
      project.configuration.discountPercent
    );

    const updatedConfiguration: ProjectConfiguration = {
      ...project.configuration,
      items: updatedItems,
      ...totals,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    const updated = await ProjectRepository.updateConfiguration(projectId, updatedConfiguration);
    if (!updated) {
      return Err('Failed to update configuration');
    }

    await AuditService.logUpdate(
      context,
      'ConfigurationItem',
      itemId,
      existingItem as unknown as Record<string, unknown>,
      updatedItem as unknown as Record<string, unknown>
    );

    return Ok(updated);
  },

  /**
   * Remove an item from the configuration
   */
  async removeItem(
    projectId: string,
    itemId: string,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.configuration.isFrozen) {
      return Err('Configuration is frozen. Use amendments to make changes.');
    }

    if (!StatusMachine.isEditable(project.status)) {
      return Err(`Cannot edit configuration in ${project.status} status`);
    }

    const item = project.configuration.items.find((i) => i.id === itemId);
    if (!item) {
      return Err('Item not found in configuration');
    }

    const updatedItems = project.configuration.items.filter((i) => i.id !== itemId);
    const totals = calculateConfigurationTotals(
      updatedItems,
      project.configuration.discountPercent
    );

    const updatedConfiguration: ProjectConfiguration = {
      ...project.configuration,
      items: updatedItems,
      ...totals,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    const updated = await ProjectRepository.updateConfiguration(projectId, updatedConfiguration);
    if (!updated) {
      return Err('Failed to update configuration');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectConfiguration',
      projectId,
      `Removed item: ${item.name}`,
      { before: { itemId, name: item.name } }
    );

    return Ok(updated);
  },

  /**
   * Set discount percentage
   */
  async setDiscount(
    projectId: string,
    discountPercent: number,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.configuration.isFrozen) {
      return Err('Configuration is frozen');
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return Err('Discount must be between 0 and 100');
    }

    const totals = calculateConfigurationTotals(
      project.configuration.items,
      discountPercent
    );

    const updatedConfiguration: ProjectConfiguration = {
      ...project.configuration,
      discountPercent,
      ...totals,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    const updated = await ProjectRepository.updateConfiguration(projectId, updatedConfiguration);
    if (!updated) {
      return Err('Failed to update configuration');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectConfiguration',
      projectId,
      `Set discount to ${discountPercent}%`
    );

    return Ok(updated);
  },

  /**
   * Freeze the configuration and create a snapshot
   */
  async freeze(
    projectId: string,
    trigger: 'ORDER_CONFIRMED' | 'AMENDMENT' | 'MANUAL',
    triggerReason: string | undefined,
    context: AuditContext
  ): Promise<Result<ConfigurationSnapshot, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.configuration.isFrozen && trigger !== 'AMENDMENT') {
      return Err('Configuration is already frozen');
    }

    // Create snapshot
    const snapshotNumber = project.configurationSnapshots.length + 1;
    const snapshot: ConfigurationSnapshot = {
      id: generateUUID(),
      projectId,
      snapshotNumber,
      data: { ...project.configuration, isFrozen: true },
      trigger,
      triggerReason,
      createdAt: now(),
      createdBy: context.userId,
    };

    // Update configuration to frozen state
    const updatedConfiguration: ProjectConfiguration = {
      ...project.configuration,
      isFrozen: true,
      frozenAt: now(),
      frozenBy: context.userId,
    };

    const updated = await ProjectRepository.update(projectId, {
      configuration: updatedConfiguration,
      configurationSnapshots: [...project.configurationSnapshots, snapshot],
    });

    if (!updated) {
      return Err('Failed to freeze configuration');
    }

    await AuditService.logFreeze(context, projectId, snapshot.id);

    return Ok(snapshot);
  },

  /**
   * Get the current configuration snapshot
   */
  async getCurrentSnapshot(projectId: string): Promise<ConfigurationSnapshot | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project || project.configurationSnapshots.length === 0) {
      return null;
    }

    return project.configurationSnapshots[project.configurationSnapshots.length - 1];
  },

  /**
   * Get all configuration snapshots for a project
   */
  async getSnapshots(projectId: string): Promise<ConfigurationSnapshot[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.configurationSnapshots;
  },

  /**
   * Recalculate totals for a project
   */
  async recalculateTotals(
    projectId: string,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Recalculate line totals
    const updatedItems = project.configuration.items.map((item) => ({
      ...item,
      lineTotalExclVat: calculateLineTotalExclVat(item.quantity, item.unitPriceExclVat),
    }));

    const totals = calculateConfigurationTotals(
      updatedItems,
      project.configuration.discountPercent
    );

    const updatedConfiguration: ProjectConfiguration = {
      ...project.configuration,
      items: updatedItems,
      ...totals,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    const updated = await ProjectRepository.updateConfiguration(projectId, updatedConfiguration);
    if (!updated) {
      return Err('Failed to recalculate totals');
    }

    return Ok(updated);
  },

  /**
   * Reorder items in the configuration
   */
  async reorderItems(
    projectId: string,
    orderedItemIds: string[],
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.configuration.isFrozen) {
      return Err('Configuration is frozen');
    }

    if (!StatusMachine.isEditable(project.status)) {
      return Err(`Cannot edit configuration in ${project.status} status`);
    }

    // Reorder items based on provided order
    const itemMap = new Map(project.configuration.items.map((item) => [item.id, item]));
    const reorderedItems: ConfigurationItem[] = [];

    for (let i = 0; i < orderedItemIds.length; i++) {
      const item = itemMap.get(orderedItemIds[i]);
      if (item) {
        reorderedItems.push({ ...item, sortOrder: i });
      }
    }

    // Add any items not in the order list at the end
    for (const item of project.configuration.items) {
      if (!orderedItemIds.includes(item.id)) {
        reorderedItems.push({ ...item, sortOrder: reorderedItems.length });
      }
    }

    const updatedConfiguration: ProjectConfiguration = {
      ...project.configuration,
      items: reorderedItems,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    const updated = await ProjectRepository.updateConfiguration(projectId, updatedConfiguration);
    if (!updated) {
      return Err('Failed to reorder items');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectConfiguration',
      projectId,
      'Reordered configuration items'
    );

    return Ok(updated);
  },

  /**
   * Move an item up or down in the order
   */
  async moveItem(
    projectId: string,
    itemId: string,
    direction: 'up' | 'down',
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.configuration.isFrozen) {
      return Err('Configuration is frozen');
    }

    const items = [...project.configuration.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = items.findIndex((i) => i.id === itemId);

    if (currentIndex === -1) {
      return Err('Item not found');
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= items.length) {
      return Ok(project); // No change needed
    }

    // Swap items
    [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]];

    // Update sort orders
    const reorderedItems = items.map((item, i) => ({ ...item, sortOrder: i }));

    return this.reorderItems(
      projectId,
      reorderedItems.map((i) => i.id),
      context
    );
  },

  /**
   * Check if boatModelVersionId can be changed
   * It is immutable after project creation - requires an Amendment to change
   */
  canChangeBoatModel(project: Project): { allowed: boolean; reason?: string } {
    // boatModelVersionId is set at project creation and cannot be changed
    // Changing the boat model requires creating an Amendment
    if (project.configuration.boatModelVersionId) {
      return {
        allowed: false,
        reason: 'Boat model version is pinned at project creation. Use an Amendment to change the model.',
      };
    }
    return { allowed: true };
  },

  /**
   * Validate configuration update
   * Prevents modification of immutable fields like boatModelVersionId
   */
  validateConfigurationUpdate(
    existing: ProjectConfiguration,
    updates: Partial<ProjectConfiguration>
  ): Result<void, string> {
    // boatModelVersionId cannot be changed after being set
    if (
      existing.boatModelVersionId &&
      updates.boatModelVersionId !== undefined &&
      updates.boatModelVersionId !== existing.boatModelVersionId
    ) {
      return Err('Boat model version cannot be changed after project creation. Use an Amendment instead.');
    }

    return Ok(undefined);
  },
};
