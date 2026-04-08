/**
 * Order Item Service - v4 (Patch 7.1 - Supplier Source-of-Truth)
 * Business logic for Shop Floor Order Items.
 *
 * ============================================
 * GOVERNANCE: INTENT LOCK — OPERATIONAL LOG ONLY
 * ============================================
 * This is an operational log, NOT a procurement system.
 * All status transitions are MANUAL and EXPLICIT.
 *
 * STATUS TRANSITION RULES (GOVERNANCE):
 * - NOT_ORDERED → ORDERED (explicit user action only)
 * - ORDERED → NOT_ORDERED (manual revert, explicit user action only)
 * - ORDERED → RECEIVED (explicit user action only)
 * - RECEIVED is TERMINAL (no further transitions allowed)
 * - RECEIVED items cannot be deleted
 * - NO automatic transitions under any circumstance
 *
 * SUPPLIER PERMISSIONS (Patch 7):
 * - Only ADMIN and OFFICE roles can set/change supplierId
 * - Other roles see supplier as read-only
 *
 * SUPPLIER SOURCE-OF-TRUTH (Patch 7.1):
 * - supplierId is the ONLY source of truth
 * - supplierName is DERIVED from Supplier entity, never independently set
 *
 * AUDIT LOGGING (GOVERNANCE):
 * - Audit log is internal only; no operational or reporting meaning.
 * - Audit records contain: timestamp, userId, action, orderItemId
 * - Audit logs are WRITE-ONLY — no UI exposure, no reports, no analytics
 * - No retention logic or cleanup automation
 */

import type {
  OrderItem,
  OrderItemStatus,
  OrderItemScopeType,
  CreateOrderItemInput,
  UpdateOrderItemInput,
  OrderItemFilters,
} from '@/domain/models/order-item';
import { canEditSupplier, canMarkReceived } from '@/domain/models/order-item';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { OrderItemRepository } from '@/data/repositories/OrderItemRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { SupplierService } from './SupplierService';

// ============================================
// EXTENDED CONTEXT WITH ROLE
// ============================================

export interface OrderItemAuditContext extends AuditContext {
  /** User role for permission checks */
  userRole?: string;
}

// ============================================
// HELPER: Derive supplier name from ID
// ============================================

async function deriveSupplierName(supplierId: string | null | undefined): Promise<string | null> {
  if (!supplierId) return null;
  const supplier = await SupplierService.getById(supplierId);
  return supplier?.name || null;
}

// ============================================
// SERVICE
// ============================================

export const OrderItemService = {
  /**
   * Get all order items
   */
  async getAll(): Promise<OrderItem[]> {
    return OrderItemRepository.getAll();
  },

  /**
   * Get order item by ID
   */
  async getById(id: string): Promise<OrderItem | null> {
    return OrderItemRepository.getById(id);
  },

  /**
   * Get order items for a specific project
   */
  async getByProjectId(projectId: string): Promise<OrderItem[]> {
    return OrderItemRepository.getByProjectId(projectId);
  },

  /**
   * Get general (non-project) order items
   */
  async getGeneral(): Promise<OrderItem[]> {
    return OrderItemRepository.getGeneral();
  },

  /**
   * Get order items with filters
   */
  async getFiltered(filters: OrderItemFilters): Promise<OrderItem[]> {
    return OrderItemRepository.getFiltered(filters);
  },

  /**
   * Get counts by status
   */
  async getStatusCounts(): Promise<Record<OrderItemStatus, number>> {
    return OrderItemRepository.countByStatus();
  },

  /**
   * Get counts by status for a specific project
   */
  async getProjectStatusCounts(projectId: string): Promise<Record<OrderItemStatus, number>> {
    return OrderItemRepository.countByProject(projectId);
  },

  /**
   * Create a new order item.
   * Status starts at NOT_ORDERED.
   * Supplier name is DERIVED from supplierId (Patch 7.1).
   */
  async create(
    input: CreateOrderItemInput,
    context: OrderItemAuditContext
  ): Promise<Result<OrderItem, string>> {
    // Validate partName (required in Patch 7)
    if (!input.partName || !input.partName.trim()) {
      return Err('Part name is required');
    }

    // Determine scope type
    let scopeType: OrderItemScopeType;
    if (input.scopeType) {
      scopeType = input.scopeType;
    } else {
      scopeType = input.projectId ? 'project' : 'general';
    }

    // Validate: if scopeType is 'project', projectId is required
    if (scopeType === 'project' && !input.projectId) {
      return Err('Project ID is required when scope type is "project"');
    }

    // Validate: if scopeType is 'general', projectId should be null
    const projectId = scopeType === 'general' ? null : input.projectId;

    // Supplier permission check and name derivation (Patch 7.1)
    let supplierId: string | null = null;
    let supplierName: string | null = null;
    if (input.supplierId && context.userRole && canEditSupplier(context.userRole)) {
      supplierId = input.supplierId;
      // Derive name from Supplier entity - single source of truth
      supplierName = await deriveSupplierName(supplierId);
    }
    // Silently ignore supplier assignment for non-authorized users

    const item: OrderItem = {
      id: generateUUID(),
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      createdByUserId: context.userId,
      scopeType,
      projectId,
      partName: input.partName.trim(),
      description: input.description?.trim() || null,
      articleId: input.articleId || null,
      articleCode: input.articleCode || null,
      quantity: input.quantity || null,
      unit: input.unit || null,
      status: 'NOT_ORDERED',
      note: input.note?.trim() || null,
      supplierId,
      supplierName,
      photoUrl: input.photoUrl || null,
      priority: input.priority || null,
    };

    await OrderItemRepository.save(item);

    await AuditService.log(
      context,
      'CREATE',
      'OrderItem',
      item.id,
      `Created order item: ${item.partName}${item.projectId ? ` (project: ${item.projectId})` : ' (general)'}`
    );

    return Ok(item);
  },

  /**
   * Update an existing order item.
   * Cannot change status through this method - use markAsOrdered/markAsReceived.
   * Supplier name is DERIVED from supplierId (Patch 7.1).
   */
  async update(
    id: string,
    input: UpdateOrderItemInput,
    context: OrderItemAuditContext
  ): Promise<Result<OrderItem, string>> {
    const existing = await OrderItemRepository.getById(id);
    if (!existing) {
      return Err('Order item not found');
    }

    // Don't allow updates to RECEIVED items
    if (existing.status === 'RECEIVED') {
      return Err('Cannot update received items');
    }

    // Handle supplier permission and name derivation (Patch 7.1)
    let supplierId = existing.supplierId;
    let supplierName = existing.supplierName;
    if (input.supplierId !== undefined) {
      if (context.userRole && canEditSupplier(context.userRole)) {
        supplierId = input.supplierId;
        // Derive name from Supplier entity - single source of truth
        supplierName = await deriveSupplierName(supplierId);
      }
      // Silently ignore if user doesn't have permission
    }

    const updated: OrderItem = {
      ...existing,
      partName: input.partName?.trim() ?? existing.partName,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      articleId: input.articleId !== undefined ? input.articleId : existing.articleId,
      articleCode: input.articleCode !== undefined ? input.articleCode : existing.articleCode,
      quantity: input.quantity !== undefined ? input.quantity : existing.quantity,
      unit: input.unit !== undefined ? input.unit : existing.unit,
      note: input.note !== undefined ? input.note?.trim() || null : existing.note,
      supplierId,
      supplierName,
      photoUrl: input.photoUrl !== undefined ? input.photoUrl : existing.photoUrl,
      priority: input.priority !== undefined ? input.priority : existing.priority,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await OrderItemRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'OrderItem',
      id,
      `Updated order item: ${updated.partName}`
    );

    return Ok(updated);
  },

  /**
   * Mark an item as ORDERED.
   * Only valid transition: NOT_ORDERED → ORDERED
   *
   * GOVERNANCE: This transition occurs ONLY via explicit user action.
   * No automatic ordering, no scheduled transitions, no workflow triggers.
   */
  async markAsOrdered(
    id: string,
    context: AuditContext
  ): Promise<Result<OrderItem, string>> {
    const existing = await OrderItemRepository.getById(id);
    if (!existing) {
      return Err('Order item not found');
    }

    if (existing.status !== 'NOT_ORDERED') {
      return Err(`Cannot mark as ordered: current status is ${existing.status}`);
    }

    const updated: OrderItem = {
      ...existing,
      status: 'ORDERED',
      orderedAt: now(),
      orderedByUserId: context.userId,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await OrderItemRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'OrderItem',
      id,
      `Marked order item as ORDERED: ${updated.partName}`
    );

    return Ok(updated);
  },

  /**
   * Mark an item as RECEIVED.
   * Only valid transition: ORDERED → RECEIVED
   *
   * GOVERNANCE: This transition occurs ONLY via explicit user action.
   * RECEIVED is a TERMINAL state — no further transitions allowed.
   * RECEIVED items cannot be deleted or modified.
   *
   * PERMISSION (Patch 8.1): Only ADMIN and OFFICE roles can mark as received.
   * Production users cannot confirm receipt of goods.
   */
  async markAsReceived(
    id: string,
    context: OrderItemAuditContext
  ): Promise<Result<OrderItem, string>> {
    // Permission check: only ADMIN/OFFICE can mark as received
    if (context.userRole && !canMarkReceived(context.userRole)) {
      return Err('You do not have permission to mark items as received. Contact office staff.');
    }

    const existing = await OrderItemRepository.getById(id);
    if (!existing) {
      return Err('Order item not found');
    }

    if (existing.status !== 'ORDERED') {
      return Err(`Cannot mark as received: current status is ${existing.status}`);
    }

    const updated: OrderItem = {
      ...existing,
      status: 'RECEIVED',
      receivedAt: now(),
      receivedByUserId: context.userId,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await OrderItemRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'OrderItem',
      id,
      `Marked order item as RECEIVED: ${updated.partName}`
    );

    return Ok(updated);
  },

  /**
   * Revert an ORDERED item back to NOT_ORDERED.
   * Only valid if status is ORDERED (not yet received).
   *
   * GOVERNANCE: This is a manual revert, explicit user action only.
   * Cannot revert from RECEIVED (terminal state).
   */
  async revertToNotOrdered(
    id: string,
    context: AuditContext
  ): Promise<Result<OrderItem, string>> {
    const existing = await OrderItemRepository.getById(id);
    if (!existing) {
      return Err('Order item not found');
    }

    if (existing.status !== 'ORDERED') {
      return Err(`Cannot revert: current status is ${existing.status}`);
    }

    const updated: OrderItem = {
      ...existing,
      status: 'NOT_ORDERED',
      orderedAt: null,
      orderedByUserId: null,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await OrderItemRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'OrderItem',
      id,
      `Reverted order item to NOT_ORDERED: ${updated.partName}`
    );

    return Ok(updated);
  },

  /**
   * Delete an order item.
   * Only allowed if status is NOT_ORDERED.
   *
   * GOVERNANCE: Deletion is restricted to prevent data loss.
   * - ORDERED items cannot be deleted (order history must be preserved)
   * - RECEIVED items cannot be deleted (terminal state, audit trail)
   */
  async delete(
    id: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const existing = await OrderItemRepository.getById(id);
    if (!existing) {
      return Err('Order item not found');
    }

    if (existing.status !== 'NOT_ORDERED') {
      return Err('Cannot delete: only NOT_ORDERED items can be deleted');
    }

    await OrderItemRepository.delete(id);

    await AuditService.log(
      context,
      'DELETE',
      'OrderItem',
      id,
      `Deleted order item: ${existing.partName}`
    );

    return Ok(undefined);
  },

  /**
   * Get count of items needing attention (NOT_ORDERED or ORDERED)
   */
  async getPendingCount(): Promise<number> {
    const counts = await OrderItemRepository.countByStatus();
    return counts.NOT_ORDERED + counts.ORDERED;
  },

  /**
   * Get count of pending items for a specific project
   */
  async getProjectPendingCount(projectId: string): Promise<number> {
    const counts = await OrderItemRepository.countByProject(projectId);
    return counts.NOT_ORDERED + counts.ORDERED;
  },
};
