/**
 * Offer Template Repository
 * Persistence layer for Offer Template entities.
 */

import type { OfferTemplate } from '@/domain/models/offer-template';
import { getAdapter } from '@/data/persistence';

// ============================================
// NAMESPACE
// ============================================

const NAMESPACE = 'offer_templates';

// ============================================
// OFFER TEMPLATE REPOSITORY
// ============================================

export const OfferTemplateRepository = {
  /**
   * Get all offer templates (excluding archived by default)
   */
  async getAll(includeArchived = false): Promise<OfferTemplate[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<OfferTemplate>(NAMESPACE);
    const filtered = includeArchived ? all : all.filter((t) => !t.archived);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Get an offer template by ID
   */
  async getById(id: string): Promise<OfferTemplate | null> {
    const adapter = getAdapter();
    return adapter.getById<OfferTemplate>(NAMESPACE, id);
  },

  /**
   * Get the default template (if any)
   */
  async getDefault(): Promise<OfferTemplate | null> {
    const all = await this.getAll();
    return all.find((t) => t.isDefault) || null;
  },

  /**
   * Save an offer template
   */
  async save(template: OfferTemplate): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NAMESPACE, template);
  },

  /**
   * Delete an offer template permanently
   */
  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NAMESPACE, id);
  },

  /**
   * Get count of templates
   */
  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NAMESPACE);
  },

  /**
   * Clear default flag from all templates
   */
  async clearDefault(): Promise<void> {
    const all = await this.getAll(true);
    for (const template of all) {
      if (template.isDefault) {
        await this.save({ ...template, isDefault: false });
      }
    }
  },
};
