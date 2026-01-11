/**
 * Common types used across the v4 domain
 */

// ============================================
// BASE ENTITY
// ============================================

export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number; // Optimistic locking
}

export interface Archivable {
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
}

// ============================================
// ENUMS
// ============================================

export type PropulsionType = 'Electric' | 'Hybrid' | 'Diesel' | 'Outboard';

export type DesignCategory = 'A' | 'B' | 'C' | 'D';

export type DocumentType =
  | 'QUOTE'
  | 'OWNERS_MANUAL'
  | 'CE_DECLARATION'
  | 'TECHNICAL_FILE'
  | 'INVOICE'
  | 'DELIVERY_NOTE';

export type VersionStatus = 'DRAFT' | 'APPROVED' | 'DEPRECATED';

// ============================================
// RESULT TYPE (for error handling)
// ============================================

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function generateNumber(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}
