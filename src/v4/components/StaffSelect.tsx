/**
 * @deprecated Staff concept removed in v323 — use UserSelect instead.
 *
 * GOVERNANCE: This file is maintained only for backward compatibility.
 * All imports of StaffSelect/useStaffList should migrate to UserSelect/useUserList.
 */

'use client';

// Re-export everything from UserSelect for backward compatibility
export { UserSelect as StaffSelect, useUserList as useStaffList } from './UserSelect';
export { UserSelect, useUserList } from './UserSelect';
