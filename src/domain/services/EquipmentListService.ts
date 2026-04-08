/**
 * Equipment List Service - v4
 *
 * Generates non-priced equipment lists from project configuration.
 *
 * Contract compliance:
 * - NO pricing in output (no unitPrice, lineTotal, subtotal, VAT, etc.)
 * - Generates from configuration or configuration snapshot
 * - Project-scoped (with optional unit scope)
 * - Brand-aware output
 * - Can be linked to quotes
 * - No alerts/notifications
 * - Soft flows only
 */

import type {
  Project,
  ProjectConfiguration,
  ConfigurationItem,
  ConfigurationSnapshot,
  EquipmentListDocument,
  EquipmentListSection,
  EquipmentListItem,
  EquipmentListBrand,
  GenerateEquipmentListInput,
  QuoteEquipmentListRef,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err, DEFAULT_EQUIPMENT_LIST_BRANDS } from '@/domain/models';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// MAPPING: Configuration -> Equipment List Items
// ============================================

/**
 * Maps a ConfigurationItem to an EquipmentListItem.
 * STRIPS ALL PRICING FIELDS.
 */
function mapConfigurationItemToEquipmentItem(
  item: ConfigurationItem,
  index: number
): EquipmentListItem {
  return {
    id: generateUUID(),
    configurationItemId: item.id,
    category: item.category,
    subcategory: item.subcategory,
    articleNumber: item.articleNumber,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    // NO PRICING FIELDS - this is intentional per contract
    notes: undefined, // Can be populated from item.description if needed
    ceRelevant: item.ceRelevant,
    safetyCritical: item.safetyCritical,
    sortOrder: item.sortOrder ?? index,
  };
}

/**
 * Groups configuration items into sections by category.
 */
function groupItemsByCategory(items: ConfigurationItem[]): EquipmentListSection[] {
  // Filter to included items only
  const includedItems = items.filter(item => item.isIncluded);

  // Group by category
  const categoryMap = new Map<string, ConfigurationItem[]>();

  for (const item of includedItems) {
    const category = item.category || 'Other';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(item);
  }

  // Convert to sections
  const sections: EquipmentListSection[] = [];

  // Sort categories alphabetically
  const sortedCategories = Array.from(categoryMap.keys()).sort();

  for (const category of sortedCategories) {
    const categoryItems = categoryMap.get(category)!;

    // Sort items within category by sortOrder, then by name
    categoryItems.sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

    // Map to equipment list items (strips pricing)
    const equipmentItems = categoryItems.map((item, idx) =>
      mapConfigurationItemToEquipmentItem(item, idx)
    );

    sections.push({
      category,
      items: equipmentItems,
      itemCount: equipmentItems.length,
    });
  }

  return sections;
}

// ============================================
// SERVICE
// ============================================

export const EquipmentListService = {
  /**
   * Get available brand templates.
   */
  getBrands(): EquipmentListBrand[] {
    return DEFAULT_EQUIPMENT_LIST_BRANDS;
  },

  /**
   * Get a specific brand by key.
   */
  getBrand(brandKey: string): EquipmentListBrand | undefined {
    return DEFAULT_EQUIPMENT_LIST_BRANDS.find(b => b.key === brandKey);
  },

  /**
   * Generate an equipment list from project configuration.
   *
   * @param input - Generation parameters
   * @param context - Audit context
   * @returns Generated EquipmentListDocument
   */
  async generate(
    input: GenerateEquipmentListInput,
    context: AuditContext
  ): Promise<Result<EquipmentListDocument, string>> {
    // Load project
    const project = await ProjectRepository.getById(input.projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Determine source configuration
    let configuration: ProjectConfiguration;
    let snapshotId: string | undefined;

    if (input.configurationSnapshotId) {
      // Use specified snapshot
      const snapshot = project.configurationSnapshots.find(
        s => s.id === input.configurationSnapshotId
      );
      if (!snapshot) {
        return Err('Configuration snapshot not found');
      }
      configuration = snapshot.data;
      snapshotId = snapshot.id;
    } else {
      // Use current configuration
      configuration = project.configuration;
    }

    // Validate unit if specified (for multi-unit projects)
    let unitLabel: string | undefined;
    if (input.unitId) {
      const unit = project.boats?.find(b => b.id === input.unitId);
      if (!unit) {
        return Err('Unit not found in project');
      }
      unitLabel = unit.label;
    }

    // Load client for display
    let clientName: string | undefined;
    if (project.clientId) {
      const client = await ClientRepository.getById(project.clientId);
      clientName = client?.name;
    }

    // Get brand (default if not specified)
    const brandKey = input.brandKey || 'default';
    const brand = this.getBrand(brandKey);
    if (!brand) {
      return Err(`Brand '${brandKey}' not found`);
    }

    // Generate sections from configuration (strips pricing)
    const sections = groupItemsByCategory(configuration.items);
    const totalItemCount = sections.reduce((sum, s) => sum + s.itemCount, 0);

    // Calculate version number
    const existingLists = project.equipmentLists || [];
    const relevantLists = existingLists.filter(l =>
      l.unitId === input.unitId && l.brandKey === brandKey
    );
    const version = relevantLists.length + 1;

    // Create the document
    const document: EquipmentListDocument = {
      id: generateUUID(),
      projectId: project.id,
      unitId: input.unitId,
      configurationSnapshotId: snapshotId,
      brandKey,
      version,
      projectNumber: project.projectNumber,
      projectTitle: project.title,
      clientName,
      unitLabel,
      boatModelName: undefined, // Could be populated from boat model lookup
      propulsionType: configuration.propulsionType,
      sections,
      totalItemCount,
      generatedAt: now(),
      generatedBy: context.userId,
      notes: input.notes,
      createdAt: now(),
      updatedAt: now(),
    };

    // Save to project
    const updatedLists = [...existingLists, document];
    await ProjectRepository.update(project.id, {
      equipmentLists: updatedLists,
    });

    // Audit log
    await AuditService.log(
      context,
      'GENERATE_DOCUMENT',
      'EQUIPMENT_LIST',
      document.id,
      `Generated equipment list v${version} for ${project.projectNumber}${unitLabel ? ` (${unitLabel})` : ''} using ${brand.name} template`,
      {
        metadata: {
          projectId: project.id,
          brandKey,
          version,
          itemCount: totalItemCount,
        },
      }
    );

    return Ok(document);
  },

  /**
   * Get all equipment lists for a project.
   */
  async getForProject(projectId: string): Promise<EquipmentListDocument[]> {
    const project = await ProjectRepository.getById(projectId);
    return project?.equipmentLists || [];
  },

  /**
   * Get a specific equipment list by ID.
   */
  async getById(projectId: string, listId: string): Promise<EquipmentListDocument | undefined> {
    const project = await ProjectRepository.getById(projectId);
    return project?.equipmentLists?.find(l => l.id === listId);
  },

  /**
   * Get the latest equipment list for a project (optionally filtered by unit and brand).
   */
  async getLatest(
    projectId: string,
    unitId?: string,
    brandKey?: string
  ): Promise<EquipmentListDocument | undefined> {
    const project = await ProjectRepository.getById(projectId);
    if (!project?.equipmentLists?.length) return undefined;

    let lists = project.equipmentLists;

    if (unitId !== undefined) {
      lists = lists.filter(l => l.unitId === unitId);
    }
    if (brandKey) {
      lists = lists.filter(l => l.brandKey === brandKey);
    }

    // Sort by version descending and return first
    lists.sort((a, b) => b.version - a.version);
    return lists[0];
  },

  /**
   * Link an equipment list to a quote.
   */
  async linkToQuote(
    projectId: string,
    quoteId: string,
    equipmentListId: string,
    includeAs: 'attachment' | 'link',
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Verify equipment list exists
    const equipmentList = project.equipmentLists?.find(l => l.id === equipmentListId);
    if (!equipmentList) {
      return Err('Equipment list not found');
    }

    // Find the quote
    const quoteIndex = project.quotes.findIndex(q => q.id === quoteId);
    if (quoteIndex < 0) {
      return Err('Quote not found');
    }

    // Update quote with equipment list reference
    const updatedQuotes = [...project.quotes];
    updatedQuotes[quoteIndex] = {
      ...updatedQuotes[quoteIndex],
      equipmentListRef: {
        equipmentListId,
        includeAs,
        linkedAt: now(),
      },
    };

    await ProjectRepository.update(project.id, { quotes: updatedQuotes });

    // Audit log
    await AuditService.log(
      context,
      'UPDATE',
      'QUOTE',
      quoteId,
      `Linked equipment list v${equipmentList.version} to quote ${updatedQuotes[quoteIndex].quoteNumber}`,
      {
        metadata: {
          projectId: project.id,
          equipmentListId,
          includeAs,
        },
      }
    );

    return Ok(undefined);
  },

  /**
   * Unlink equipment list from a quote.
   */
  async unlinkFromQuote(
    projectId: string,
    quoteId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quoteIndex = project.quotes.findIndex(q => q.id === quoteId);
    if (quoteIndex < 0) {
      return Err('Quote not found');
    }

    // Remove equipment list reference
    const updatedQuotes = [...project.quotes];
    updatedQuotes[quoteIndex] = {
      ...updatedQuotes[quoteIndex],
      equipmentListRef: undefined,
    };

    await ProjectRepository.update(project.id, { quotes: updatedQuotes });

    return Ok(undefined);
  },

  /**
   * Delete an equipment list.
   */
  async delete(
    projectId: string,
    listId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const list = project.equipmentLists?.find(l => l.id === listId);
    if (!list) {
      return Err('Equipment list not found');
    }

    // Check if linked to any quote
    const linkedQuote = project.quotes.find(q => q.equipmentListRef?.equipmentListId === listId);
    if (linkedQuote) {
      return Err(`Cannot delete: linked to quote ${linkedQuote.quoteNumber}`);
    }

    // Remove from project
    const updatedLists = project.equipmentLists?.filter(l => l.id !== listId) || [];
    await ProjectRepository.update(project.id, { equipmentLists: updatedLists });

    // Audit log
    await AuditService.log(
      context,
      'DELETE',
      'EQUIPMENT_LIST',
      listId,
      `Deleted equipment list v${list.version} from ${project.projectNumber}`,
      {
        metadata: {
          projectId: project.id,
        },
      }
    );

    return Ok(undefined);
  },
};
