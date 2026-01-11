/**
 * User & Role Models - v4
 * User authentication and role-based permissions
 */

import type { Entity } from './common';

// ============================================
// ROLES
// ============================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'PRODUCTION' | 'VIEWER';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  MANAGER: 80,
  SALES: 60,
  PRODUCTION: 50,
  VIEWER: 10,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  SALES: 'Sales',
  PRODUCTION: 'Production',
  VIEWER: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Full access to all features, user management, and settings',
  MANAGER: 'Manage projects, clients, library, and approve items',
  SALES: 'Create and manage quotes, clients, and projects',
  PRODUCTION: 'View projects, log time, update tasks',
  VIEWER: 'Read-only access to projects and documents',
};

// ============================================
// PERMISSIONS
// ============================================

export type Permission =
  // Project permissions
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'project:archive'
  | 'project:transition'
  // Configuration permissions
  | 'configuration:read'
  | 'configuration:update'
  | 'configuration:freeze'
  // Quote permissions
  | 'quote:create'
  | 'quote:read'
  | 'quote:update'
  | 'quote:send'
  | 'quote:accept'
  // Amendment permissions
  | 'amendment:create'
  | 'amendment:read'
  | 'amendment:approve'
  // BOM permissions
  | 'bom:read'
  | 'bom:generate'
  | 'bom:export'
  // Document permissions
  | 'document:read'
  | 'document:generate'
  | 'document:finalize'
  // Task permissions
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'task:log_time'
  // Production permissions
  | 'production:read'
  | 'production:update'
  | 'production:comment'
  | 'production:photo'
  // Compliance permissions
  | 'compliance:read'
  | 'compliance:create'
  | 'compliance:update'
  | 'compliance:finalize'
  // Client permissions
  | 'client:create'
  | 'client:read'
  | 'client:update'
  | 'client:delete'
  // Library permissions
  | 'library:read'
  | 'library:create'
  | 'library:update'
  | 'library:approve'
  | 'library:archive'
  // Settings permissions
  | 'settings:read'
  | 'settings:update'
  // User management permissions
  | 'user:read'
  | 'user:create'
  | 'user:update'
  | 'user:delete'
  // Audit permissions
  | 'audit:read'
  // Timesheet permissions
  | 'timesheet:create'
  | 'timesheet:read'
  | 'timesheet:update'
  | 'timesheet:delete'
  | 'timesheet:view_all'
  | 'timesheet:manage';

/**
 * Permission matrix by role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    // All permissions
    'project:create', 'project:read', 'project:update', 'project:delete', 'project:archive', 'project:transition',
    'configuration:read', 'configuration:update', 'configuration:freeze',
    'quote:create', 'quote:read', 'quote:update', 'quote:send', 'quote:accept',
    'amendment:create', 'amendment:read', 'amendment:approve',
    'bom:read', 'bom:generate', 'bom:export',
    'document:read', 'document:generate', 'document:finalize',
    'task:create', 'task:read', 'task:update', 'task:delete', 'task:log_time',
    'production:read', 'production:update', 'production:comment', 'production:photo',
    'compliance:read', 'compliance:create', 'compliance:update', 'compliance:finalize',
    'client:create', 'client:read', 'client:update', 'client:delete',
    'library:read', 'library:create', 'library:update', 'library:approve', 'library:archive',
    'settings:read', 'settings:update',
    'user:read', 'user:create', 'user:update', 'user:delete',
    'audit:read',
    'timesheet:create', 'timesheet:read', 'timesheet:update', 'timesheet:delete', 'timesheet:view_all', 'timesheet:manage',
  ],
  MANAGER: [
    'project:create', 'project:read', 'project:update', 'project:archive', 'project:transition',
    'configuration:read', 'configuration:update', 'configuration:freeze',
    'quote:create', 'quote:read', 'quote:update', 'quote:send', 'quote:accept',
    'amendment:create', 'amendment:read', 'amendment:approve',
    'bom:read', 'bom:generate', 'bom:export',
    'document:read', 'document:generate', 'document:finalize',
    'task:create', 'task:read', 'task:update', 'task:delete', 'task:log_time',
    'production:read', 'production:update', 'production:comment', 'production:photo',
    'compliance:read', 'compliance:create', 'compliance:update', 'compliance:finalize',
    'client:create', 'client:read', 'client:update',
    'library:read', 'library:create', 'library:update', 'library:approve',
    'settings:read',
    'user:read',
    'audit:read',
    'timesheet:create', 'timesheet:read', 'timesheet:update', 'timesheet:delete', 'timesheet:view_all', 'timesheet:manage',
  ],
  SALES: [
    'project:create', 'project:read', 'project:update', 'project:transition', // Sales can transition to confirm orders
    'configuration:read', 'configuration:update',
    'quote:create', 'quote:read', 'quote:update', 'quote:send',
    'amendment:create', 'amendment:read',
    'bom:read',
    'document:read', 'document:generate',
    'task:read',
    'production:read', // Sales can VIEW production but not update
    'client:create', 'client:read', 'client:update',
    'library:read',
    'settings:read',
    'timesheet:create', 'timesheet:read', 'timesheet:update', 'timesheet:delete',
  ],
  PRODUCTION: [
    'project:read',
    'configuration:read',
    'quote:read',
    'amendment:read',
    'bom:read', 'bom:export',
    'document:read',
    'task:create', 'task:read', 'task:update', 'task:log_time',
    'production:read', 'production:update', 'production:comment', 'production:photo',
    'compliance:read', 'compliance:update', // Production can view and update compliance evidence
    'client:read',
    'library:read',
    'timesheet:create', 'timesheet:read', 'timesheet:update', 'timesheet:delete',
  ],
  VIEWER: [
    'project:read',
    'configuration:read',
    'quote:read',
    'amendment:read',
    'bom:read',
    'document:read',
    'task:read',
    'production:read', // Viewers can view production progress
    'compliance:read', // Viewers can view compliance packs
    'client:read',
    'library:read',
    'timesheet:read', // Viewers can view their own timesheets
  ],
};

// ============================================
// USER MODEL
// ============================================

export interface User extends Entity {
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt?: string;
  avatarUrl?: string;
  phone?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  loginAt: string;
  expiresAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  phone?: string;
  department?: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  phone?: string;
  department?: string;
  isActive?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role is at least as privileged as another role
 */
export function isRoleAtLeast(role: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}
