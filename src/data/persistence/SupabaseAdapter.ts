/**
 * Supabase Adapter - v4
 * Implements PersistenceAdapter using Supabase (PostgreSQL)
 *
 * This adapter stores all entities in a single `entities` table using JSONB.
 * This approach allows us to keep the same flexible schema as LocalStorage
 * while gaining the benefits of a persistent database.
 *
 * Table structure:
 * - id: UUID (primary key)
 * - namespace: VARCHAR (e.g., 'projects', 'clients')
 * - data: JSONB (the full entity data)
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 */

import type { PersistenceAdapter } from './PersistenceAdapter';
import type { Entity, QueryFilter, Transaction } from './types';
import { ConflictError } from './types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

// Table name for all entities
const ENTITIES_TABLE = 'entities';

export class SupabaseAdapter implements PersistenceAdapter {
  /**
   * Check if we're on the client side and Supabase is configured
   */
  private canOperate(): boolean {
    return typeof window !== 'undefined' && isSupabaseConfigured();
  }

  /**
   * Get the Supabase client, returning null if not available
   */
  private getClient() {
    return getSupabaseClient();
  }

  /**
   * Save an entity (create or update)
   */
  async save<T extends Entity>(namespace: string, entity: T): Promise<void> {
    const client = this.getClient();
    if (!this.canOperate() || !client) {
      console.warn('SupabaseAdapter: Cannot save - not configured or not on client');
      return;
    }

    // Check if entity exists
    const { data: existing } = await client
      .from(ENTITIES_TABLE)
      .select('data')
      .eq('id', entity.id)
      .eq('namespace', namespace)
      .single();

    if (existing) {
      // Update existing - check optimistic locking
      const existingEntity = existing.data as T;
      if (
        entity.version !== undefined &&
        existingEntity.version !== undefined &&
        entity.version > 0 &&
        existingEntity.version > 0 &&
        entity.version <= existingEntity.version
      ) {
        throw new ConflictError(
          `Entity ${entity.id} was modified by another process. Current version ${existingEntity.version}, attempted version ${entity.version}`
        );
      }

      const { error } = await client
        .from(ENTITIES_TABLE)
        .update({
          data: entity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entity.id)
        .eq('namespace', namespace);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`Failed to update entity: ${error.message}`);
      }
    } else {
      // Insert new
      const { error } = await client.from(ENTITIES_TABLE).insert({
        id: entity.id,
        namespace,
        data: entity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Failed to insert entity: ${error.message}`);
      }
    }
  }

  /**
   * Get entity by ID
   */
  async getById<T extends Entity>(namespace: string, id: string): Promise<T | null> {
    const client = this.getClient();
    if (!this.canOperate() || !client) return null;

    const { data, error } = await client
      .from(ENTITIES_TABLE)
      .select('data')
      .eq('id', id)
      .eq('namespace', namespace)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - not an error
        return null;
      }
      console.error('Supabase getById error:', error);
      return null;
    }

    return data?.data as T || null;
  }

  /**
   * Get all entities in namespace
   */
  async getAll<T extends Entity>(namespace: string): Promise<T[]> {
    const client = this.getClient();
    if (!this.canOperate() || !client) return [];

    const { data, error } = await client
      .from(ENTITIES_TABLE)
      .select('data')
      .eq('namespace', namespace);

    if (error) {
      console.error('Supabase getAll error:', error);
      return [];
    }

    return (data || []).map((row) => row.data as T);
  }

  /**
   * Query entities with filters
   */
  async query<T extends Entity>(namespace: string, filter: QueryFilter): Promise<T[]> {
    if (!this.canOperate()) return [];

    // Get all data first, then filter in memory
    // This is a pragmatic approach that maintains compatibility with LocalStorage
    // For production with large datasets, consider using Supabase's JSONB operators
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

  /**
   * Delete entity
   */
  async delete(namespace: string, id: string): Promise<void> {
    const client = this.getClient();
    if (!this.canOperate() || !client) return;

    const { error } = await client
      .from(ENTITIES_TABLE)
      .delete()
      .eq('id', id)
      .eq('namespace', namespace);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete entity: ${error.message}`);
    }
  }

  /**
   * Save multiple entities
   */
  async saveMany<T extends Entity>(namespace: string, entities: T[]): Promise<void> {
    const client = this.getClient();
    if (!this.canOperate() || !client) return;

    // Use upsert for batch operations
    const rows = entities.map((entity) => ({
      id: entity.id,
      namespace,
      data: entity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from(ENTITIES_TABLE)
      .upsert(rows, { onConflict: 'id,namespace' });

    if (error) {
      console.error('Supabase saveMany error:', error);
      throw new Error(`Failed to save entities: ${error.message}`);
    }
  }

  /**
   * Execute operations in a transaction
   * Note: Supabase doesn't support client-side transactions directly.
   * For critical operations, consider using Supabase Edge Functions with SQL transactions.
   */
  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    // Execute the function directly
    // For true ACID transactions, use Supabase Edge Functions
    const mockTx: Transaction = { id: `tx-${Date.now()}` };
    return fn(mockTx);
  }

  /**
   * Clear all data in a namespace
   */
  async clear(namespace: string): Promise<void> {
    const client = this.getClient();
    if (!this.canOperate() || !client) return;

    const { error } = await client
      .from(ENTITIES_TABLE)
      .delete()
      .eq('namespace', namespace);

    if (error) {
      console.error('Supabase clear error:', error);
      throw new Error(`Failed to clear namespace: ${error.message}`);
    }
  }

  /**
   * Get count of entities
   */
  async count(namespace: string, filter?: QueryFilter): Promise<number> {
    const client = this.getClient();
    if (!this.canOperate() || !client) return 0;

    if (filter) {
      const data = await this.query(namespace, filter);
      return data.length;
    }

    const { count, error } = await client
      .from(ENTITIES_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('namespace', namespace);

    if (error) {
      console.error('Supabase count error:', error);
      return 0;
    }

    return count || 0;
  }
}

// Singleton instance
let supabaseAdapterInstance: SupabaseAdapter | null = null;

export function getSupabaseAdapter(): PersistenceAdapter {
  if (!supabaseAdapterInstance) {
    supabaseAdapterInstance = new SupabaseAdapter();
  }
  return supabaseAdapterInstance;
}
