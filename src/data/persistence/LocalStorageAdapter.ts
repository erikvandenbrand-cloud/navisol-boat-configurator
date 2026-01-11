/**
 * LocalStorage Adapter - v4
 * Implements PersistenceAdapter using browser LocalStorage
 * Will be replaced with NeonAdapter for production
 */

import type { PersistenceAdapter } from './PersistenceAdapter';
import type { Entity, QueryFilter, Transaction } from './types';
import { ConflictError } from './types';

export class LocalStorageAdapter implements PersistenceAdapter {
  private prefix = 'navisol_v4_';

  private getKey(namespace: string): string {
    return `${this.prefix}${namespace}`;
  }

  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  async save<T extends Entity>(namespace: string, entity: T): Promise<void> {
    if (!this.isClient()) return;

    const key = this.getKey(namespace);
    const data = await this.getAll<T>(namespace);

    const index = data.findIndex((e) => e.id === entity.id);

    if (index >= 0) {
      // Update existing - check optimistic locking only if versions are defined
      const existing = data[index];
      // Only enforce version check if both have versions defined and entity version is not 0 (new)
      // This allows updates while preventing accidental overwrites
      if (
        entity.version !== undefined &&
        existing.version !== undefined &&
        entity.version > 0 &&
        existing.version > 0 &&
        entity.version <= existing.version
      ) {
        throw new ConflictError(
          `Entity ${entity.id} was modified by another process. Current version ${existing.version}, attempted version ${entity.version}`
        );
      }
      data[index] = entity;
    } else {
      // Create new
      data.push(entity);
    }

    localStorage.setItem(key, JSON.stringify(data));
  }

  async getById<T extends Entity>(namespace: string, id: string): Promise<T | null> {
    const data = await this.getAll<T>(namespace);
    return data.find((e) => e.id === id) || null;
  }

  async getAll<T extends Entity>(namespace: string): Promise<T[]> {
    if (!this.isClient()) return [];

    const key = this.getKey(namespace);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  async query<T extends Entity>(namespace: string, filter: QueryFilter): Promise<T[]> {
    let data = await this.getAll<T>(namespace);

    // Apply where filter
    if (filter.where) {
      data = data.filter((entity) =>
        Object.entries(filter.where!).every(([key, value]) => {
          const entityValue = (entity as Record<string, unknown>)[key];

          // Handle array contains
          if (Array.isArray(value)) {
            return value.includes(entityValue);
          }

          // Handle null/undefined
          if (value === null || value === undefined) {
            return entityValue === value;
          }

          // Exact match
          return entityValue === value;
        })
      );
    }

    // Apply ordering
    if (filter.orderBy) {
      const { field, direction } = filter.orderBy;
      data.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[field];
        const bVal = (b as Record<string, unknown>)[field];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const cmp = aVal < bVal ? -1 : 1;
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    // Apply pagination
    if (filter.offset) {
      data = data.slice(filter.offset);
    }
    if (filter.limit) {
      data = data.slice(0, filter.limit);
    }

    return data;
  }

  async delete(namespace: string, id: string): Promise<void> {
    if (!this.isClient()) return;

    const key = this.getKey(namespace);
    const data = await this.getAll(namespace);
    const filtered = data.filter((e) => e.id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  async saveMany<T extends Entity>(namespace: string, entities: T[]): Promise<void> {
    for (const entity of entities) {
      await this.save(namespace, entity);
    }
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    // LocalStorage doesn't support real transactions
    // Just execute the function directly
    // Neon adapter will implement proper transactions
    const mockTx: Transaction = { id: `tx-${Date.now()}` };
    return fn(mockTx);
  }

  async clear(namespace: string): Promise<void> {
    if (!this.isClient()) return;
    localStorage.removeItem(this.getKey(namespace));
  }

  async count(namespace: string, filter?: QueryFilter): Promise<number> {
    if (filter) {
      const data = await this.query(namespace, filter);
      return data.length;
    }
    const data = await this.getAll(namespace);
    return data.length;
  }
}

// Singleton instance
let adapterInstance: LocalStorageAdapter | null = null;

export function getAdapter(): PersistenceAdapter {
  if (!adapterInstance) {
    adapterInstance = new LocalStorageAdapter();
  }
  return adapterInstance;
}
