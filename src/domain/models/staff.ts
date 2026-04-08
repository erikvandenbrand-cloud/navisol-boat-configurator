/**
 * Staff Model - v4
 *
 * @deprecated Staff concept removed in v323 — use User instead.
 *
 * This model is maintained for backward compatibility only.
 * All new code should use the User model from user.ts.
 *
 * Migration: StaffMember → User
 * - name → name
 * - label → department
 * - isActive → isActive
 * - notes → (dropped)
 *
 * GOVERNANCE: See .same/STAFF_USER_INVENTORY.md for details.
 */

import type { Entity } from './common';

// ============================================
// STAFF MEMBER
// ============================================

/**
 * A staff member in the global staff list.
 * Used for consistent name selection in Planning and Production tasks.
 * Optional - free-text assignees still work.
 */
export interface StaffMember extends Entity {
  /** Display name (required) */
  name: string;

  /** Optional label/role hint (e.g., "Electrician", "Yard") */
  label?: string;

  /** Whether this staff member is active (defaults to true) */
  isActive: boolean;

  /** Optional notes */
  notes?: string;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateStaffInput {
  name: string;
  label?: string;
  notes?: string;
}

export interface UpdateStaffInput {
  name?: string;
  label?: string;
  notes?: string;
  isActive?: boolean;
}
