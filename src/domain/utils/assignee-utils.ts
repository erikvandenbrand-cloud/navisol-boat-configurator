/**
 * Assignee Identity Utilities (v324)
 *
 * GOVERNANCE: This module provides stable assignee identity resolution.
 * - New assignments use User.id (stable across name changes)
 * - Legacy assignments (string names) are supported via fallback
 * - No migration required - backward compatible
 */

import type { User, PlanningResource } from '@/domain/models';
import type { WorkItem } from '@/domain/models';

// ============================================
// TYPES
// ============================================

/**
 * Resolved assignee information for display
 */
export interface ResolvedAssignee {
  /** User ID if resolved, or null for legacy/free-text */
  userId: string | null;
  /** Display name for UI */
  displayName: string;
  /** Email for disambiguation (optional) */
  email?: string;
  /** Whether this is a legacy (string-based) assignment */
  isLegacy: boolean;
}

/**
 * Assignee selection value (for UI components)
 */
export interface AssigneeValue {
  /** User ID (stable) */
  userId: string;
  /** Display name (for legacy field and display) */
  displayName: string;
  /** Email for disambiguation */
  email: string;
}

// ============================================
// RESOLUTION FUNCTIONS
// ============================================

/**
 * Resolve assignees from a WorkItem, preferring stable User IDs.
 *
 * Resolution order:
 * 1. If assigneeUserIds present → resolve to User records
 * 2. Else if assigneeIds present → try to match to Users, fallback to string
 * 3. Return empty array if no assignees
 */
export function resolveAssignees(
  item: Pick<WorkItem, 'assigneeIds' | 'assigneeUserIds'>,
  usersMap: Map<string, User>
): ResolvedAssignee[] {
  const results: ResolvedAssignee[] = [];

  // Prefer stable User ID-based assignees (v324+)
  if (item.assigneeUserIds && item.assigneeUserIds.length > 0) {
    for (const userId of item.assigneeUserIds) {
      const user = usersMap.get(userId);
      if (user) {
        results.push({
          userId: user.id,
          displayName: user.name,
          email: user.email,
          isLegacy: false,
        });
      } else {
        // User ID no longer exists - show as unknown
        results.push({
          userId,
          displayName: `[Unknown User: ${userId.slice(0, 8)}...]`,
          isLegacy: false,
        });
      }
    }
    return results;
  }

  // Fallback to legacy string-based assignees
  if (item.assigneeIds && item.assigneeIds.length > 0) {
    for (const legacyId of item.assigneeIds) {
      // Try to match by name (case-insensitive)
      let matchedUser: User | undefined;
      for (const user of usersMap.values()) {
        if (user.name.toLowerCase() === legacyId.toLowerCase()) {
          matchedUser = user;
          break;
        }
      }

      if (matchedUser) {
        results.push({
          userId: matchedUser.id,
          displayName: matchedUser.name,
          email: matchedUser.email,
          isLegacy: true,
        });
      } else {
        // Legacy free-text assignee or resource ID
        results.push({
          userId: null,
          displayName: legacyId,
          isLegacy: true,
        });
      }
    }
  }

  return results;
}

/**
 * Get primary assignee display name (first assignee)
 */
export function getPrimaryAssigneeDisplay(
  item: Pick<WorkItem, 'assigneeIds' | 'assigneeUserIds'>,
  usersMap: Map<string, User>
): string | undefined {
  const resolved = resolveAssignees(item, usersMap);
  if (resolved.length === 0) return undefined;
  return resolved[0].displayName;
}

/**
 * Format assignee for dropdown display: "DisplayName — email"
 */
export function formatAssigneeForDropdown(user: User): string {
  return `${user.name} — ${user.email}`;
}

/**
 * Format resolved assignee for display
 */
export function formatResolvedAssignee(assignee: ResolvedAssignee): string {
  if (assignee.email) {
    return `${assignee.displayName} — ${assignee.email}`;
  }
  return assignee.displayName;
}

// ============================================
// WRITE HELPERS
// ============================================

/**
 * Create assignment fields from selected users.
 * Populates both assigneeUserIds (stable) and assigneeIds (legacy compat).
 */
export function createAssignmentFields(
  selectedUsers: AssigneeValue[]
): Pick<WorkItem, 'assigneeIds' | 'assigneeUserIds'> {
  return {
    assigneeUserIds: selectedUsers.map((u) => u.userId),
    assigneeIds: selectedUsers.map((u) => u.displayName), // Legacy: store display names
  };
}

/**
 * Merge new User-based assignments with existing legacy data.
 * Called when updating a WorkItem with new assignments.
 */
export function mergeAssignmentUpdate(
  selectedUserIds: string[],
  usersMap: Map<string, User>
): Pick<WorkItem, 'assigneeIds' | 'assigneeUserIds'> {
  const assigneeUserIds = selectedUserIds;
  const assigneeIds: string[] = [];

  for (const userId of selectedUserIds) {
    const user = usersMap.get(userId);
    if (user) {
      assigneeIds.push(user.name); // Legacy field uses display name
    }
  }

  return { assigneeUserIds, assigneeIds };
}

// ============================================
// USER MAP BUILDER
// ============================================

/**
 * Build a Map of userId -> User for efficient lookups
 */
export function buildUsersMap(users: User[]): Map<string, User> {
  const map = new Map<string, User>();
  for (const user of users) {
    map.set(user.id, user);
  }
  return map;
}

/**
 * Build a Map of userName (lowercase) -> User for legacy resolution
 */
export function buildUsersByNameMap(users: User[]): Map<string, User> {
  const map = new Map<string, User>();
  for (const user of users) {
    map.set(user.name.toLowerCase(), user);
  }
  return map;
}

// ============================================
// PLANNING RESOURCE RESOLUTION (v324)
// ============================================

/**
 * Resolved assignee from PlanningResource
 */
export interface ResolvedResourceAssignee {
  /** Resource ID */
  resourceId: string;
  /** Display name (resolved from User if sourceUserId present, otherwise resource.name) */
  displayName: string;
  /** Email if resolved from User */
  email?: string;
  /** Source User ID if resource was created from a User */
  sourceUserId?: string;
  /** Whether name was resolved from User (stable) or resource (may be stale) */
  isStableIdentity: boolean;
}

/**
 * Resolve assignees from WorkItem via PlanningResources.
 *
 * For each assigneeId (which is a resource ID):
 * 1. Find the PlanningResource
 * 2. If resource has sourceUserId → resolve current name from User
 * 3. Else → use resource.name (may be stale if User renamed)
 */
export function resolveAssigneesFromResources(
  item: Pick<WorkItem, 'assigneeIds' | 'assigneeUserIds'>,
  resourcesMap: Map<string, PlanningResource>,
  usersMap: Map<string, User>
): ResolvedResourceAssignee[] {
  const results: ResolvedResourceAssignee[] = [];

  // First check for direct User ID assignments (v324+)
  if (item.assigneeUserIds && item.assigneeUserIds.length > 0) {
    for (const userId of item.assigneeUserIds) {
      const user = usersMap.get(userId);
      if (user) {
        results.push({
          resourceId: userId, // Use userId as resourceId for direct assignments
          displayName: user.name,
          email: user.email,
          sourceUserId: userId,
          isStableIdentity: true,
        });
      } else {
        results.push({
          resourceId: userId,
          displayName: `[Unknown: ${userId.slice(0, 8)}...]`,
          sourceUserId: userId,
          isStableIdentity: false,
        });
      }
    }
    return results;
  }

  // Fallback to resource-based assignments
  if (item.assigneeIds && item.assigneeIds.length > 0) {
    for (const assigneeId of item.assigneeIds) {
      const resource = resourcesMap.get(assigneeId);

      if (resource) {
        // Check if resource has a sourceUserId for stable identity
        if (resource.sourceUserId) {
          const user = usersMap.get(resource.sourceUserId);
          if (user) {
            results.push({
              resourceId: resource.id,
              displayName: user.name, // Current name from User (stable)
              email: user.email,
              sourceUserId: resource.sourceUserId,
              isStableIdentity: true,
            });
          } else {
            // User was deleted but resource still exists
            results.push({
              resourceId: resource.id,
              displayName: resource.name, // Fallback to stored name
              sourceUserId: resource.sourceUserId,
              isStableIdentity: false,
            });
          }
        } else {
          // Resource without sourceUserId (manually created or legacy)
          results.push({
            resourceId: resource.id,
            displayName: resource.name,
            isStableIdentity: false, // May be stale if manually renamed
          });
        }
      } else {
        // assigneeId might be a legacy name string
        // Try to find user by name
        let matchedUser: User | undefined;
        for (const user of usersMap.values()) {
          if (user.name.toLowerCase() === assigneeId.toLowerCase()) {
            matchedUser = user;
            break;
          }
        }

        if (matchedUser) {
          results.push({
            resourceId: assigneeId,
            displayName: matchedUser.name,
            email: matchedUser.email,
            sourceUserId: matchedUser.id,
            isStableIdentity: true, // Matched to user
          });
        } else {
          // Truly legacy free-text or deleted resource
          results.push({
            resourceId: assigneeId,
            displayName: assigneeId,
            isStableIdentity: false,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Get primary assignee display name using resource resolution
 */
export function getPrimaryResourceAssigneeDisplay(
  item: Pick<WorkItem, 'assigneeIds' | 'assigneeUserIds'>,
  resourcesMap: Map<string, PlanningResource>,
  usersMap: Map<string, User>
): string | undefined {
  const resolved = resolveAssigneesFromResources(item, resourcesMap, usersMap);
  if (resolved.length === 0) return undefined;
  return resolved[0].displayName;
}

/**
 * Build a Map of resourceId -> PlanningResource for efficient lookups
 */
export function buildResourcesMap(resources: PlanningResource[]): Map<string, PlanningResource> {
  const map = new Map<string, PlanningResource>();
  for (const resource of resources) {
    map.set(resource.id, resource);
  }
  return map;
}
