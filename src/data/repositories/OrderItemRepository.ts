/**
 * Order Item Repository
 * Persistence layer for Shop Floor Order Items.
 *
 * Updated in Patch 7 to support:
 * - scopeType filtering (project/general)
 * - supplierId filtering
 * - partName search
 */

import type { OrderItem, OrderItemFilters, OrderItemStatus } from '@/domain/models/order-item';
import { getAdapter } from '@/data/persistence';

// ============================================
// NAMESPACE
// ============================================

const NAMESPACE = 'shop_floor_orders';

// ============================================
// ORDER ITEM REPOSITORY
// ============================================

export const OrderItemRepository = {
  /**
   * Get all order items
   */
  async getAll(): Promise<OrderItem[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<OrderItem>(NAMESPACE);
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Get order item by ID
   */
  async getById(id: string): Promise<OrderItem | null> {
    const adapter = getAdapter();
    return adapter.getById<OrderItem>(NAMESPACE, id);
  },

  /**
   * Get order items by project ID
   */
  async getByProjectId(projectId: string): Promise<OrderItem[]> {
    const all = await this.getAll();
    return all.filter((item) => item.projectId === projectId);
  },

  /**
   * Get general (non-project) order items
   */
  async getGeneral(): Promise<OrderItem[]> {
    const all = await this.getAll();
    return all.filter((item) => item.scopeType === 'general' || !item.projectId);
  },

  /**
   * Get order items by status
   */
  async getByStatus(status: OrderItemStatus): Promise<OrderItem[]> {
    const all = await this.getAll();
    return all.filter((item) => item.status === status);
  },

  /**
   * Get order items with filters (Patch 7 - enhanced)
   */
  async getFiltered(filters: OrderItemFilters): Promise<OrderItem[]> {
    let items = await this.getAll();

    // Filter by status
    if (filters.status && filters.status !== 'ALL') {
      items = items.filter((item) => item.status === filters.status);
    }

    // Filter by scope type (Patch 7)
    if (filters.scopeType && filters.scopeType !== 'ALL') {
      items = items.filter((item) => {
        if (filters.scopeType === 'general') {
          return item.scopeType === 'general' || !item.projectId;
        }
        return item.scopeType === 'project' || !!item.projectId;
      });
    }

    // Filter by project
    if (filters.projectId) {
      if (filters.projectId === 'GENERAL') {
        items = items.filter((item) => item.scopeType === 'general' || !item.projectId);
      } else if (filters.projectId !== 'ALL') {
        items = items.filter((item) => item.projectId === filters.projectId);
      }
    }

    // Filter by supplier (Patch 7)
    if (filters.supplierId && filters.supplierId !== 'ALL') {
      items = items.filter((item) => item.supplierId === filters.supplierId);
    }

    // Filter by creator
    if (filters.createdByUserId) {
      items = items.filter((item) => item.createdByUserId === filters.createdByUserId);
    }

    // Search in partName and description (Patch 7 - partName is primary)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.partName?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.articleCode?.toLowerCase().includes(query) ||
          item.supplierName?.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query)
      );
    }

    return items;
  },

  /**
   * Save an order item (create or update)
   */
  async save(item: OrderItem): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NAMESPACE, item);
  },

  /**
   * Delete an order item
   */
  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NAMESPACE, id);
  },

  /**
   * Get count of order items
   */
  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NAMESPACE);
  },

  /**
   * Get count by status
   */
  async countByStatus(): Promise<Record<OrderItemStatus, number>> {
    const all = await this.getAll();
    return {
      NOT_ORDERED: all.filter((i) => i.status === 'NOT_ORDERED').length,
      ORDERED: all.filter((i) => i.status === 'ORDERED').length,
      RECEIVED: all.filter((i) => i.status === 'RECEIVED').length,
    };
  },

  /**
   * Get count by project
   */
  async countByProject(projectId: string): Promise<Record<OrderItemStatus, number>> {
    const items = await this.getByProjectId(projectId);
    return {
      NOT_ORDERED: items.filter((i) => i.status === 'NOT_ORDERED').length,
      ORDERED: items.filter((i) => i.status === 'ORDERED').length,
      RECEIVED: items.filter((i) => i.status === 'RECEIVED').length,
    };
  },
};
