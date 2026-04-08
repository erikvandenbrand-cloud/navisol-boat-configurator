/**
 * Audit Service - v4
 * Domain service for audit logging
 */

import type { AuditAction, AuditEntry, CreateAuditEntryInput } from '@/domain/models';
import { AuditRepository } from '@/data/repositories';

export interface AuditContext {
  userId: string;
  userName: string;
}

export const AuditService = {
  /**
   * Log an audit entry
   */
  async log(
    context: AuditContext,
    action: AuditAction,
    entityType: string,
    entityId: string,
    description: string,
    options?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<AuditEntry> {
    const input: CreateAuditEntryInput = {
      userId: context.userId,
      userName: context.userName,
      action,
      entityType,
      entityId,
      description,
      before: options?.before,
      after: options?.after,
      metadata: options?.metadata,
    };

    return AuditRepository.create(input);
  },

  /**
   * Log entity creation
   */
  async logCreate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    entity: Record<string, unknown>
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'CREATE',
      entityType,
      entityId,
      `Created ${entityType}`,
      { after: entity }
    );
  },

  /**
   * Log entity update
   */
  async logUpdate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'UPDATE',
      entityType,
      entityId,
      `Updated ${entityType}`,
      { before, after }
    );
  },

  /**
   * Log entity archive
   */
  async logArchive(
    context: AuditContext,
    entityType: string,
    entityId: string,
    reason: string
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'ARCHIVE',
      entityType,
      entityId,
      `Archived ${entityType}: ${reason}`,
      { metadata: { reason } }
    );
  },

  /**
   * Log status transition
   */
  async logStatusTransition(
    context: AuditContext,
    entityType: string,
    entityId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'STATUS_TRANSITION',
      entityType,
      entityId,
      `${entityType} status: ${fromStatus} → ${toStatus}${reason ? ` (${reason})` : ''}`,
      { metadata: { fromStatus, toStatus, reason } }
    );
  },

  /**
   * Log library version approval
   */
  async logApproval(
    context: AuditContext,
    entityType: string,
    entityId: string,
    version: string
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'APPROVE',
      entityType,
      entityId,
      `Approved ${entityType} version ${version}`,
      { metadata: { version } }
    );
  },

  /**
   * Log configuration freeze
   */
  async logFreeze(
    context: AuditContext,
    projectId: string,
    snapshotId: string
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'FREEZE',
      'Project',
      projectId,
      'Configuration frozen',
      { metadata: { snapshotId } }
    );
  },

  /**
   * Log document generation
   */
  async logDocumentGeneration(
    context: AuditContext,
    projectId: string,
    documentId: string,
    documentType: string
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'GENERATE_DOCUMENT',
      'ProjectDocument',
      documentId,
      `Generated ${documentType}`,
      { metadata: { projectId, documentType } }
    );
  },

  /**
   * Log amendment
   */
  async logAmendment(
    context: AuditContext,
    projectId: string,
    amendmentId: string,
    amendmentType: string,
    reason: string,
    priceImpact: number
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'AMENDMENT',
      'Project',
      projectId,
      `Amendment: ${amendmentType} - ${reason}`,
      { metadata: { amendmentId, amendmentType, reason, priceImpact } }
    );
  },

  /**
   * Log emergency unlock
   */
  async logEmergencyUnlock(
    context: AuditContext,
    projectId: string,
    reason: string
  ): Promise<AuditEntry> {
    return this.log(
      context,
      'EMERGENCY_UNLOCK',
      'Project',
      projectId,
      `EMERGENCY UNLOCK: ${reason}`,
      { metadata: { reason, warningLevel: 'CRITICAL' } }
    );
  },

  /**
   * Get audit history for an entity
   */
  async getHistory(entityType: string, entityId: string): Promise<AuditEntry[]> {
    return AuditRepository.getByEntity(entityType, entityId);
  },

  /**
   * Get recent audit entries
   */
  async getRecent(limit: number = 50): Promise<AuditEntry[]> {
    return AuditRepository.getRecent(limit);
  },

  /**
   * Get all audit entries
   */
  async getAll(): Promise<AuditEntry[]> {
    return AuditRepository.getAll();
  },
};
