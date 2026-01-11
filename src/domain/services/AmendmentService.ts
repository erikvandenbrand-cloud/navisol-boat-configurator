/**
 * Amendment Service - v4
 * Handles post-freeze changes with full audit trail
 */

import type {
  Project,
  ProjectAmendment,
  AmendmentType,
  ConfigurationSnapshot,
  ConfigurationItem,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { StatusMachine } from '@/domain/workflow';
import { Authorization, type User } from '@/domain/auth';

// ============================================
// AMENDMENT SERVICE
// ============================================

export const AmendmentService = {
  /**
   * Request an amendment (changes after ORDER_CONFIRMED)
   */
  async requestAmendment(
    projectId: string,
    amendmentType: AmendmentType,
    reason: string,
    changes: {
      itemsToAdd?: Omit<ConfigurationItem, 'id'>[];
      itemsToRemove?: string[];
      itemsToUpdate?: { id: string; updates: Partial<ConfigurationItem> }[];
    },
    context: AuditContext,
    approver: User
  ): Promise<Result<ProjectAmendment, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Check if project is in a frozen state
    if (!StatusMachine.isFrozen(project.status)) {
      return Err('Project is not frozen. Edit configuration directly.');
    }

    // Check if project is locked (DELIVERED or CLOSED)
    if (StatusMachine.isLocked(project.status)) {
      return Err('Project is locked. Cannot make amendments after delivery.');
    }

    // Check authorization
    if (!Authorization.canApproveAmendment(approver)) {
      return Err('User is not authorized to approve amendments');
    }

    // Capture before snapshot
    const beforeSnapshotNumber = project.configurationSnapshots.length + 1;
    const beforeSnapshot: ConfigurationSnapshot = {
      id: generateUUID(),
      projectId,
      snapshotNumber: beforeSnapshotNumber,
      data: { ...project.configuration },
      trigger: 'AMENDMENT',
      triggerReason: `Before amendment: ${reason}`,
      createdAt: now(),
      createdBy: context.userId,
    };

    // Apply changes to create new configuration
    let updatedItems = [...project.configuration.items];
    const affectedItems: string[] = [];
    let priceImpact = 0;

    // Remove items
    if (changes.itemsToRemove) {
      for (const itemId of changes.itemsToRemove) {
        const item = updatedItems.find((i) => i.id === itemId);
        if (item) {
          priceImpact -= item.lineTotalExclVat;
          affectedItems.push(item.name);
          updatedItems = updatedItems.filter((i) => i.id !== itemId);
        }
      }
    }

    // Update items
    if (changes.itemsToUpdate) {
      for (const { id, updates } of changes.itemsToUpdate) {
        const index = updatedItems.findIndex((i) => i.id === id);
        if (index >= 0) {
          const oldItem = updatedItems[index];
          const newItem = {
            ...oldItem,
            ...updates,
            lineTotalExclVat: (updates.quantity ?? oldItem.quantity) * (updates.unitPriceExclVat ?? oldItem.unitPriceExclVat),
          };
          priceImpact += newItem.lineTotalExclVat - oldItem.lineTotalExclVat;
          affectedItems.push(oldItem.name);
          updatedItems[index] = newItem;
        }
      }
    }

    // Add items
    if (changes.itemsToAdd) {
      for (const item of changes.itemsToAdd) {
        const newItem: ConfigurationItem = {
          ...item,
          id: generateUUID(),
          lineTotalExclVat: item.quantity * item.unitPriceExclVat,
          sortOrder: updatedItems.length,
        };
        priceImpact += newItem.lineTotalExclVat;
        affectedItems.push(newItem.name);
        updatedItems.push(newItem);
      }
    }

    // Calculate new totals
    const subtotalExclVat = updatedItems
      .filter((item) => item.isIncluded)
      .reduce((sum, item) => sum + item.lineTotalExclVat, 0);

    const discountAmount = project.configuration.discountPercent
      ? Math.round(subtotalExclVat * (project.configuration.discountPercent / 100) * 100) / 100
      : 0;

    const totalExclVat = subtotalExclVat - discountAmount;
    const vatAmount = Math.round(totalExclVat * (project.configuration.vatRate / 100) * 100) / 100;
    const totalInclVat = totalExclVat + vatAmount;

    // Create new configuration (still frozen)
    const newConfiguration = {
      ...project.configuration,
      items: updatedItems,
      subtotalExclVat,
      discountAmount,
      totalExclVat,
      vatAmount,
      totalInclVat,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    // Capture after snapshot
    const afterSnapshotNumber = beforeSnapshotNumber + 1;
    const afterSnapshot: ConfigurationSnapshot = {
      id: generateUUID(),
      projectId,
      snapshotNumber: afterSnapshotNumber,
      data: newConfiguration,
      trigger: 'AMENDMENT',
      triggerReason: `After amendment: ${reason}`,
      createdAt: now(),
      createdBy: context.userId,
    };

    // Create amendment record
    const amendmentNumber = project.amendments.length + 1;
    const amendment: ProjectAmendment = {
      id: generateUUID(),
      projectId,
      amendmentNumber,
      type: amendmentType,
      reason,
      beforeSnapshotId: beforeSnapshot.id,
      afterSnapshotId: afterSnapshot.id,
      priceImpactExclVat: priceImpact,
      affectedItems,
      requestedBy: context.userId,
      requestedAt: now(),
      approvedBy: approver.id,
      approvedAt: now(),
      createdAt: now(),
    };

    // Save everything
    const updated = await ProjectRepository.update(projectId, {
      configuration: newConfiguration,
      configurationSnapshots: [
        ...project.configurationSnapshots,
        beforeSnapshot,
        afterSnapshot,
      ],
      amendments: [...project.amendments, amendment],
    });

    if (!updated) {
      return Err('Failed to save amendment');
    }

    await AuditService.logAmendment(
      context,
      projectId,
      amendment.id,
      amendmentType,
      reason,
      priceImpact
    );

    return Ok(amendment);
  },

  /**
   * Get all amendments for a project
   */
  async getAmendments(projectId: string): Promise<ProjectAmendment[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.amendments;
  },

  /**
   * Get amendment by ID
   */
  async getAmendmentById(
    projectId: string,
    amendmentId: string
  ): Promise<ProjectAmendment | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return null;
    }

    return project.amendments.find((a) => a.id === amendmentId) || null;
  },

  /**
   * Get total price impact of all amendments
   */
  async getTotalPriceImpact(projectId: string): Promise<number> {
    const amendments = await this.getAmendments(projectId);
    return amendments.reduce((sum, a) => sum + a.priceImpactExclVat, 0);
  },

  /**
   * Check if amendment is possible for project
   */
  async canAmend(projectId: string): Promise<{ canAmend: boolean; reason?: string }> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return { canAmend: false, reason: 'Project not found' };
    }

    if (!StatusMachine.isFrozen(project.status)) {
      return { canAmend: false, reason: 'Project is not frozen - edit configuration directly' };
    }

    if (StatusMachine.isLocked(project.status)) {
      return { canAmend: false, reason: 'Project is locked after delivery' };
    }

    return { canAmend: true };
  },
};
