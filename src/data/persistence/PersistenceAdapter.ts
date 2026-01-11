/**
 * Persistence Adapter Interface - v4
 * Abstract interface for data persistence
 * Implementations: LocalStorageAdapter (now), NeonAdapter (future)
 */

import type { Entity, QueryFilter, Transaction } from './types';

export interface PersistenceAdapter {
  /**
   * Save an entity (create or update)
   */
  save<T extends Entity>(namespace: string, entity: T): Promise<void>;

  /**
   * Get entity by ID
   */
  getById<T extends Entity>(namespace: string, id: string): Promise<T | null>;

  /**
   * Get all entities in namespace
   */
  getAll<T extends Entity>(namespace: string): Promise<T[]>;

  /**
   * Query entities with filters
   */
  query<T extends Entity>(namespace: string, filter: QueryFilter): Promise<T[]>;

  /**
   * Delete entity (soft delete recommended at domain level)
   */
  delete(namespace: string, id: string): Promise<void>;

  /**
   * Save multiple entities
   */
  saveMany<T extends Entity>(namespace: string, entities: T[]): Promise<void>;

  /**
   * Execute operations in a transaction
   * LocalStorage: just executes (no real transactions)
   * Neon: proper database transactions
   */
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;

  /**
   * Clear all data in a namespace (use with caution)
   */
  clear(namespace: string): Promise<void>;

  /**
   * Get count of entities
   */
  count(namespace: string, filter?: QueryFilter): Promise<number>;
}
