/**
 * Data Migration Service
 *
 * Utilities for migrating data between persistence adapters.
 * Primarily used to migrate from LocalStorage to Supabase.
 */

import { LocalStorageAdapter } from '@/data/persistence/LocalStorageAdapter';
import { SupabaseAdapter } from '@/data/persistence/SupabaseAdapter';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Entity } from '@/data/persistence/types';

// All known namespaces in the application
export const ALL_NAMESPACES = [
  // Core entities
  'projects',
  'clients',
  'users',
  'settings',
  'audit',
  'staff',

  // Library entities
  'library_categories',
  'library_subcategories',
  'library_articles',
  'library_article_versions',
  'library_kits',
  'library_kit_versions',
  'library_boat_models',
  'library_boat_model_versions',
  'library_standards',
  'library_work_instructions',
  'library_work_instruction_comments',
  'library_production_procedures',
  'library_production_procedure_versions',
  'library_catalogs',
  'library_catalog_versions',
  'library_templates',
  'library_template_versions',
  'library_procedures',
  'library_procedure_versions',

  // Operational entities
  'shop_floor_orders',
  'suppliers',
  'timesheets',
  'offer_templates',
] as const;

export type Namespace = typeof ALL_NAMESPACES[number];

export interface MigrationProgress {
  namespace: string;
  total: number;
  migrated: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  totalEntities: number;
  migratedEntities: number;
  errors: string[];
  progress: MigrationProgress[];
}

export const DataMigrationService = {
  /**
   * Check if migration is possible (both adapters available)
   */
  canMigrate(): { canMigrate: boolean; reason?: string } {
    if (typeof window === 'undefined') {
      return { canMigrate: false, reason: 'Migration can only run in browser' };
    }

    if (!isSupabaseConfigured()) {
      return { canMigrate: false, reason: 'Supabase is not configured' };
    }

    return { canMigrate: true };
  },

  /**
   * Get counts of entities in LocalStorage by namespace
   */
  async getLocalStorageCounts(): Promise<Record<string, number>> {
    const localStorage = new LocalStorageAdapter();
    const counts: Record<string, number> = {};

    for (const namespace of ALL_NAMESPACES) {
      const count = await localStorage.count(namespace);
      if (count > 0) {
        counts[namespace] = count;
      }
    }

    return counts;
  },

  /**
   * Get counts of entities in Supabase by namespace
   */
  async getSupabaseCounts(): Promise<Record<string, number>> {
    if (!isSupabaseConfigured()) {
      return {};
    }

    const supabase = new SupabaseAdapter();
    const counts: Record<string, number> = {};

    for (const namespace of ALL_NAMESPACES) {
      const count = await supabase.count(namespace);
      if (count > 0) {
        counts[namespace] = count;
      }
    }

    return counts;
  },

  /**
   * Migrate all data from LocalStorage to Supabase
   *
   * @param onProgress - Callback for progress updates
   * @returns Migration result with success status and any errors
   */
  async migrateLocalStorageToSupabase(
    onProgress?: (progress: MigrationProgress[]) => void
  ): Promise<MigrationResult> {
    const { canMigrate, reason } = this.canMigrate();
    if (!canMigrate) {
      return {
        success: false,
        totalEntities: 0,
        migratedEntities: 0,
        errors: [reason || 'Cannot migrate'],
        progress: [],
      };
    }

    const localStorage = new LocalStorageAdapter();
    const supabase = new SupabaseAdapter();

    const progress: MigrationProgress[] = ALL_NAMESPACES.map(ns => ({
      namespace: ns,
      total: 0,
      migrated: 0,
      status: 'pending' as const,
    }));

    const errors: string[] = [];
    let totalEntities = 0;
    let migratedEntities = 0;

    // First pass: count all entities
    for (let i = 0; i < ALL_NAMESPACES.length; i++) {
      const namespace = ALL_NAMESPACES[i];
      const count = await localStorage.count(namespace);
      progress[i].total = count;
      totalEntities += count;
    }

    onProgress?.(progress);

    // Second pass: migrate each namespace
    for (let i = 0; i < ALL_NAMESPACES.length; i++) {
      const namespace = ALL_NAMESPACES[i];

      if (progress[i].total === 0) {
        progress[i].status = 'completed';
        continue;
      }

      progress[i].status = 'in_progress';
      onProgress?.(progress);

      try {
        // Get all entities from LocalStorage
        const entities = await localStorage.getAll<Entity>(namespace);

        // Migrate in batches of 50
        const batchSize = 50;
        for (let j = 0; j < entities.length; j += batchSize) {
          const batch = entities.slice(j, j + batchSize);

          // Save each entity to Supabase
          for (const entity of batch) {
            try {
              await supabase.save(namespace, entity);
              progress[i].migrated++;
              migratedEntities++;
            } catch (entityError) {
              const errorMsg = `Failed to migrate ${namespace}/${entity.id}: ${entityError}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          }

          onProgress?.(progress);
        }

        progress[i].status = 'completed';
      } catch (namespaceError) {
        const errorMsg = `Failed to migrate namespace ${namespace}: ${namespaceError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        progress[i].status = 'error';
        progress[i].error = String(namespaceError);
      }

      onProgress?.(progress);
    }

    return {
      success: errors.length === 0,
      totalEntities,
      migratedEntities,
      errors,
      progress,
    };
  },

  /**
   * Export all data from current adapter as JSON
   */
  async exportAllData(): Promise<Record<string, Entity[]>> {
    const localStorage = new LocalStorageAdapter();
    const data: Record<string, Entity[]> = {};

    for (const namespace of ALL_NAMESPACES) {
      const entities = await localStorage.getAll<Entity>(namespace);
      if (entities.length > 0) {
        data[namespace] = entities;
      }
    }

    return data;
  },

  /**
   * Import data from JSON export
   *
   * @param data - Data exported from exportAllData()
   * @param targetAdapter - 'localStorage' or 'supabase'
   */
  async importData(
    data: Record<string, Entity[]>,
    targetAdapter: 'localStorage' | 'supabase' = 'supabase'
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const adapter = targetAdapter === 'supabase'
      ? new SupabaseAdapter()
      : new LocalStorageAdapter();

    let imported = 0;
    const errors: string[] = [];

    for (const [namespace, entities] of Object.entries(data)) {
      for (const entity of entities) {
        try {
          await adapter.save(namespace, entity);
          imported++;
        } catch (error) {
          errors.push(`Failed to import ${namespace}/${entity.id}: ${error}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  },

  /**
   * Clear all data from LocalStorage (use after successful migration)
   */
  async clearLocalStorage(): Promise<void> {
    const localStorage = new LocalStorageAdapter();

    for (const namespace of ALL_NAMESPACES) {
      await localStorage.clear(namespace);
    }
  },

  /**
   * Download data as JSON file
   */
  async downloadExport(): Promise<void> {
    const data = await this.exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `navisol-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
