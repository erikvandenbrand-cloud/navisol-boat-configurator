/**
 * Standards Library Repository
 * Persistence layer for the Standards Library entities.
 */

import type { Standard } from '@/domain/models/standard';
import { getAdapter } from '@/data/persistence';

// ============================================
// NAMESPACE
// ============================================

const NAMESPACE = 'library_standards';

// ============================================
// STANDARD REPOSITORY
// ============================================

export const StandardsLibraryRepository = {
  /**
   * Get all standards (excluding archived by default)
   */
  async getAll(includeArchived = false): Promise<Standard[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<Standard>(NAMESPACE);
    const filtered = includeArchived ? all : all.filter((s) => !s.archived);
    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  },

  /**
   * Get a standard by ID
   */
  async getById(id: string): Promise<Standard | null> {
    const adapter = getAdapter();
    return adapter.getById<Standard>(NAMESPACE, id);
  },

  /**
   * Get standards by IDs
   */
  async getByIds(ids: string[]): Promise<Standard[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<Standard>(NAMESPACE);
    return all.filter((s) => ids.includes(s.id));
  },

  /**
   * Save a standard
   */
  async save(standard: Standard): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NAMESPACE, standard);
  },

  /**
   * Delete a standard permanently
   */
  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NAMESPACE, id);
  },

  /**
   * Get count of standards
   */
  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NAMESPACE);
  },

  /**
   * Search standards by code or title
   */
  async search(query: string): Promise<Standard[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return all.filter(
      (s) =>
        s.code.toLowerCase().includes(lowerQuery) ||
        s.title.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Get standards by tags
   */
  async getByTags(tags: string[]): Promise<Standard[]> {
    const all = await this.getAll();
    return all.filter((s) =>
      s.tags?.some((tag) => tags.includes(tag))
    );
  },
};
