/**
 * Order Item Model - v4 (Patch 7.1 - Tightened Supplier Source-of-Truth)
 * Shop Floor Order List for operational purchasing outside BOM.
 *
 * ============================================
 * GOVERNANCE: INTENT LOCK — OPERATIONAL LOG ONLY
 * ============================================
 * This is an operational log, NOT a procurement system.
 * - No automatic purchasing
 * - No inventory management
 * - No accounting integration
 * - No background sync
 * - No BOM mutations
 * - No cost allocation logic
 * - No analytics, KPIs, or dashboards
 * - No notifications or alerts
 *
 * Items can be:
 * - Project-specific (linked to a project)
 * - General (not linked to any project)
 *
 * All fields are either operational state or inert metadata.
 * No logic should depend on metadata fields for automation.
 *
 * SUPPLIER SOURCE-OF-TRUTH (Patch 7.1):
 * - supplierId is the ONLY source of truth for supplier selection
 * - supplierName is a DERIVED CACHE, never independently edited
 * - Service layer derives supplierName from Supplier entity on save
 */

import type { Entity } from './common';

// ============================================
// ORDER ITEM STATUS
// ============================================

/**
 * Order item status - explicit manual transitions only.
 * NOT_ORDERED → ORDERED → RECEIVED
 */
export type OrderItemStatus = 'NOT_ORDERED' | 'ORDERED' | 'RECEIVED';

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  NOT_ORDERED: 'Not Ordered',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
};

export const ORDER_ITEM_STATUS_COLORS: Record<OrderItemStatus, { bg: string; text: string; border: string }> = {
  NOT_ORDERED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  ORDERED: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  RECEIVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
};

// ============================================
// SCOPE TYPE (Patch 7)
// ============================================

/**
 * Scope type determines whether an order item is linked to a project or is general.
 */
export type OrderItemScopeType = 'project' | 'general';

// ============================================
// SUPPLIER ENTITY (Patch 7)
// ============================================

/**
 * Supplier entity for order items.
 * Simple master data - just name, no contacts/addresses.
 */
export interface Supplier extends Entity {
  /** Supplier name (unique, case-insensitive) */
  name: string;
}

export interface CreateSupplierInput {
  name: string;
}

// ============================================
// ORDER ITEM ENTITY
// ============================================

/**
 * Shop Floor Order Item.
 * Represents a part/tool/material that production staff needs,
 * which is NOT in the BOM.
 */
export interface OrderItem extends Entity {
  /** User who created this order item */
  createdByUserId: string;

  /**
   * Scope type - 'project' or 'general' (Patch 7)
   * If 'project', projectId is required.
   * If 'general', projectId must be null.
   */
  scopeType: OrderItemScopeType;

  /** Project ID if scopeType='project', null for 'general' */
  projectId?: string | null;

  /**
   * Part name - primary identifier for the item (Patch 7)
   * REQUIRED field.
   */
  partName: string;

  /**
   * Description of the item (free text).
   * Additional details about the part.
   */
  description?: string | null;

  /**
   * Optional reference to a library article.
   * This is just a reference for convenience - no pricing logic.
   */
  articleId?: string | null;

  /**
   * Optional article code for display (cached from article if linked).
   */
  articleCode?: string | null;

  /** Quantity needed (optional) */
  quantity?: number | null;

  /** Unit of measure (optional, e.g., "pcs", "m", "set") */
  unit?: string | null;

  /** Current status - manual transitions only */
  status: OrderItemStatus;

  /** When the item was marked as ordered */
  orderedAt?: string | null;

  /** User who marked the item as ordered */
  orderedByUserId?: string | null;

  /** When the item was marked as received */
  receivedAt?: string | null;

  /** User who marked the item as received */
  receivedByUserId?: string | null;

  /** Free text notes */
  note?: string | null;

  /**
   * Supplier ID reference (Patch 7)
   * Links to Supplier entity. Can only be edited by users with supplier permissions.
   * GOVERNANCE: This is the ONLY source of truth for supplier selection.
   */
  supplierId?: string | null;

  /**
   * Supplier name - DERIVED CACHE (Patch 7.1)
   * Automatically populated from Supplier entity when supplierId is set.
   * GOVERNANCE: Never edit independently - always derived from supplierId.
   */
  supplierName?: string | null;

  /**
   * @deprecated Use supplierId instead. Kept for backward compatibility.
   * Free text supplier name from before Patch 7.
   */
  supplier?: string | null;

  /**
   * Photo URL for the order item (Patch 7)
   * Single photo attachment for visual reference.
   * Can be a data URL or external URL.
   */
  photoUrl?: string | null;

  /**
   * Priority level (optional).
   * GOVERNANCE: This is INERT METADATA only.
   * - No auto-sorting by priority
   * - No escalation logic or alerts
   * - No workflow dependencies
   * - Purely informational for human reference
   */
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
}

// ============================================
// CREATE / UPDATE INPUTS
// ============================================

export interface CreateOrderItemInput {
  /** Scope type - determines if project-linked or general */
  scopeType?: OrderItemScopeType; // Defaults to 'project' if projectId provided, else 'general'
  projectId?: string | null;
  /** Part name - required */
  partName: string;
  description?: string | null;
  articleId?: string | null;
  articleCode?: string | null;
  quantity?: number | null;
  unit?: string | null;
  note?: string | null;
  /**
   * Supplier ID - requires permission to set.
   * supplierName is DERIVED automatically from this ID.
   */
  supplierId?: string | null;
  photoUrl?: string | null;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
}

export interface UpdateOrderItemInput {
  partName?: string;
  description?: string | null;
  articleId?: string | null;
  articleCode?: string | null;
  quantity?: number | null;
  unit?: string | null;
  note?: string | null;
  /**
   * Supplier ID - requires permission to change.
   * supplierName is DERIVED automatically from this ID.
   */
  supplierId?: string | null;
  photoUrl?: string | null;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
}

// ============================================
// FILTERS
// ============================================

export interface OrderItemFilters {
  /** Filter by status */
  status?: OrderItemStatus | 'ALL';
  /** Filter by scope type (Patch 7) */
  scopeType?: OrderItemScopeType | 'ALL';
  /** Filter by project ID (use 'GENERAL' for non-project items) */
  projectId?: string | 'GENERAL' | 'ALL';
  /** Filter by supplier ID (Patch 7) */
  supplierId?: string | 'ALL';
  /** Filter by creator */
  createdByUserId?: string;
  /** Search in partName and description */
  searchQuery?: string;
}

// ============================================
// SUPPLIER PERMISSION CHECK (Patch 7)
// ============================================

/**
 * Roles/flags that can edit supplier assignments.
 * GOVERNANCE: Only ADMIN and OFFICE roles can manage suppliers.
 */
export const SUPPLIER_EDIT_ROLES = ['ADMIN', 'OFFICE'] as const;

/**
 * Check if a user role can edit supplier assignments.
 */
export function canEditSupplier(role: string): boolean {
  return SUPPLIER_EDIT_ROLES.includes(role as 'ADMIN' | 'OFFICE');
}

// ============================================
// RECEIVING PERMISSION CHECK (Patch 8.1)
// ============================================

/**
 * Roles that can mark items as received.
 * GOVERNANCE: Only ADMIN and OFFICE roles can confirm receipt of goods.
 * Production users can create orders and mark as ordered, but receiving
 * is an office function (verification against purchase orders).
 */
export const RECEIVE_ROLES = ['ADMIN', 'OFFICE'] as const;

/**
 * Check if a user role can mark items as received.
 */
export function canMarkReceived(role: string): boolean {
  return RECEIVE_ROLES.includes(role as 'ADMIN' | 'OFFICE');
}
