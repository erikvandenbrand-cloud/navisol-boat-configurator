/**
 * Audit Log Model - v4
 * Append-only audit entries
 */

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'STATUS_TRANSITION'
  | 'APPROVE'
  | 'FREEZE'
  | 'GENERATE_DOCUMENT'
  | 'AMENDMENT'
  | 'EMERGENCY_UNLOCK'
  | 'IMPORT';

export interface AuditEntry {
  id: string;
  timestamp: string;
  createdAt: string; // Alias for timestamp, for Entity compatibility

  // Who
  userId: string;
  userName: string;

  // What happened
  action: AuditAction;
  entityType: string;
  entityId: string;

  // Details
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateAuditEntryInput {
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
