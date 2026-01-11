/**
 * Persistence Types - v4
 */

export interface Entity {
  id: string;
  createdAt: string;
  updatedAt?: string;
  version?: number;
}

export interface QueryFilter {
  where?: Record<string, unknown>;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export interface Transaction {
  // Placeholder for transaction context
  // Will be implemented properly for Neon
  id: string;
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}
