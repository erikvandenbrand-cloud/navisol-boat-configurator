/**
 * Audit Repository - v4
 * Append-only audit log
 */

import type { AuditEntry, CreateAuditEntryInput } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import type { QueryFilter } from '@/data/persistence';

const NAMESPACE = 'audit';

export const AuditRepository = {
  async getAll(): Promise<AuditEntry[]> {
    const adapter = getAdapter();
    return adapter.getAll<AuditEntry>(NAMESPACE);
  },

  async getByEntity(entityType: string, entityId: string): Promise<AuditEntry[]> {
    const adapter = getAdapter();
    return adapter.query<AuditEntry>(NAMESPACE, {
      where: { entityType, entityId },
      orderBy: { field: 'timestamp', direction: 'desc' },
    });
  },

  async getByUser(userId: string): Promise<AuditEntry[]> {
    const adapter = getAdapter();
    return adapter.query<AuditEntry>(NAMESPACE, {
      where: { userId },
      orderBy: { field: 'timestamp', direction: 'desc' },
    });
  },

  async query(filter: QueryFilter): Promise<AuditEntry[]> {
    const adapter = getAdapter();
    return adapter.query<AuditEntry>(NAMESPACE, filter);
  },

  async create(input: CreateAuditEntryInput): Promise<AuditEntry> {
    const adapter = getAdapter();

    const timestamp = now();
    const entry: AuditEntry = {
      id: generateUUID(),
      timestamp,
      createdAt: timestamp,
      userId: input.userId,
      userName: input.userName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
    };

    await adapter.save(NAMESPACE, entry);
    return entry;
  },

  async getRecent(limit: number = 50): Promise<AuditEntry[]> {
    const adapter = getAdapter();
    return adapter.query<AuditEntry>(NAMESPACE, {
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit,
    });
  },

  // Note: Audit entries should never be deleted
  // This method is only for development/testing
  async _clearForTesting(): Promise<void> {
    const adapter = getAdapter();
    await adapter.clear(NAMESPACE);
  },
};
