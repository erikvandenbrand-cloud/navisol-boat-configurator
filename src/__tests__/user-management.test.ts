/**
 * User Management Tests
 * Tests for user permissions and validation
 */

import { describe, test, expect } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import { AuthService } from '@/domain/services/AuthService';
import type { UserRole } from '@/domain/models';
import { generateUUID } from '@/domain/models';

// ============================================
// TEST CONTEXT
// ============================================

const adminContext = {
  userId: 'admin-user',
  userName: 'Admin User',
};

// Generate unique emails for each test
function uniqueEmail(prefix: string): string {
  return `${prefix}-${generateUUID().slice(0, 8)}@test.com`;
}

// ============================================
// USER CREATION TESTS
// ============================================

describe('User Management - Create User', () => {
  test('should create a new user successfully', async () => {
    const email = uniqueEmail('newuser');
    const result = await AuthService.createUser({
      email,
      name: 'New User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe(email.toLowerCase());
      expect(result.value.name).toBe('New User');
      expect(result.value.role).toBe('VIEWER');
      expect(result.value.isActive).toBe(true);
    }
  });

  test('should reject duplicate email', async () => {
    const email = uniqueEmail('duplicate');

    // Create first user
    const first = await AuthService.createUser({
      email,
      name: 'First User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);
    expect(first.ok).toBe(true);

    // Try to create second user with same email
    const result = await AuthService.createUser({
      email,
      name: 'Second User',
      role: 'SALES',
      password: 'password456',
    }, adminContext);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('already exists');
    }
  });

  test('should reject password shorter than 6 characters', async () => {
    const result = await AuthService.createUser({
      email: uniqueEmail('shortpass'),
      name: 'Short Password User',
      role: 'VIEWER',
      password: '12345', // Only 5 characters
    }, adminContext);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('at least 6 characters');
    }
  });

  test('should create users with all role types', async () => {
    const roles: UserRole[] = ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'VIEWER'];

    for (const role of roles) {
      const result = await AuthService.createUser({
        email: uniqueEmail(role.toLowerCase()),
        name: `${role} User`,
        role,
        password: 'password123',
      }, adminContext);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.role).toBe(role);
      }
    }
  });

  test('should store optional fields correctly', async () => {
    const result = await AuthService.createUser({
      email: uniqueEmail('fulluser'),
      name: 'Full User',
      role: 'SALES',
      password: 'password123',
      department: 'Sales Department',
      phone: '+31 123 456 789',
    }, adminContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.department).toBe('Sales Department');
      expect(result.value.phone).toBe('+31 123 456 789');
    }
  });

  test('should store email in lowercase', async () => {
    const result = await AuthService.createUser({
      email: 'UPPERCASE@TEST.COM',
      name: 'Uppercase Email',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('uppercase@test.com');
    }
  });
});

// ============================================
// PASSWORD VALIDATION TESTS
// ============================================

describe('User Management - Password Validation', () => {
  test('should accept 6 character password', async () => {
    const result = await AuthService.createUser({
      email: uniqueEmail('sixchar'),
      name: 'Six Char Password',
      role: 'VIEWER',
      password: '123456', // Exactly 6 characters
    }, adminContext);

    expect(result.ok).toBe(true);
  });

  test('should accept long passwords', async () => {
    const result = await AuthService.createUser({
      email: uniqueEmail('longpass'),
      name: 'Long Password',
      role: 'VIEWER',
      password: 'this-is-a-very-long-and-secure-password-123!',
    }, adminContext);

    expect(result.ok).toBe(true);
  });
});

// ============================================
// PERMISSION MATRIX TESTS
// ============================================

describe('User Management - Permission Matrix', () => {
  test('Admin role should have all user management permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('ADMIN', 'user:create')).toBe(true);
    expect(hasPermission('ADMIN', 'user:read')).toBe(true);
    expect(hasPermission('ADMIN', 'user:update')).toBe(true);
    expect(hasPermission('ADMIN', 'user:delete')).toBe(true);
  });

  test('Manager role should have read-only user permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('MANAGER', 'user:read')).toBe(true);
    expect(hasPermission('MANAGER', 'user:create')).toBe(false);
    expect(hasPermission('MANAGER', 'user:update')).toBe(false);
    expect(hasPermission('MANAGER', 'user:delete')).toBe(false);
  });

  test('Sales role should not have user management permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('SALES', 'user:read')).toBe(false);
    expect(hasPermission('SALES', 'user:create')).toBe(false);
    expect(hasPermission('SALES', 'user:update')).toBe(false);
    expect(hasPermission('SALES', 'user:delete')).toBe(false);
  });

  test('Production role should not have user management permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('PRODUCTION', 'user:read')).toBe(false);
    expect(hasPermission('PRODUCTION', 'user:create')).toBe(false);
    expect(hasPermission('PRODUCTION', 'user:update')).toBe(false);
    expect(hasPermission('PRODUCTION', 'user:delete')).toBe(false);
  });

  test('Viewer role should not have user management permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('VIEWER', 'user:read')).toBe(false);
    expect(hasPermission('VIEWER', 'user:create')).toBe(false);
    expect(hasPermission('VIEWER', 'user:update')).toBe(false);
    expect(hasPermission('VIEWER', 'user:delete')).toBe(false);
  });
});

// ============================================
// ROLE HIERARCHY TESTS
// ============================================

describe('User Management - Role Hierarchy', () => {
  test('Admin should be higher than all other roles', async () => {
    const { isRoleAtLeast, ROLE_HIERARCHY } = await import('@/domain/models');

    expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.MANAGER);
    expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.SALES);
    expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.PRODUCTION);
    expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.VIEWER);
  });

  test('isRoleAtLeast should correctly compare roles', async () => {
    const { isRoleAtLeast } = await import('@/domain/models');

    expect(isRoleAtLeast('ADMIN', 'VIEWER')).toBe(true);
    expect(isRoleAtLeast('MANAGER', 'VIEWER')).toBe(true);
    expect(isRoleAtLeast('VIEWER', 'ADMIN')).toBe(false);
    expect(isRoleAtLeast('SALES', 'MANAGER')).toBe(false);
  });
});

// ============================================
// DEFAULT OPTIONS TESTS
// ============================================

describe('User Management - Defaults', () => {
  test('new user should be active by default', async () => {
    const result = await AuthService.createUser({
      email: uniqueEmail('activedefault'),
      name: 'Active By Default',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isActive).toBe(true);
    }
  });

  test('new user should have version 0', async () => {
    const result = await AuthService.createUser({
      email: uniqueEmail('versionzero'),
      name: 'Version Zero',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(0);
    }
  });

  test('new user should have createdAt and updatedAt timestamps', async () => {
    const result = await AuthService.createUser({
      email: uniqueEmail('timestamps'),
      name: 'Timestamp User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.createdAt).toBeDefined();
      expect(result.value.updatedAt).toBeDefined();
    }
  });
});

// ============================================
// GET ALL USERS TESTS
// ============================================

describe('User Management - Get All Users', () => {
  test('should return an array of users', async () => {
    const users = await AuthService.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
  });
});

// ============================================
// ROLE LABELS TESTS
// ============================================

describe('User Management - Role Labels', () => {
  test('all roles should have labels defined', async () => {
    const { ROLE_LABELS } = await import('@/domain/models');
    const roles: UserRole[] = ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'VIEWER'];

    for (const role of roles) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe('string');
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  test('all roles should have descriptions defined', async () => {
    const { ROLE_DESCRIPTIONS } = await import('@/domain/models');
    const roles: UserRole[] = ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'VIEWER'];

    for (const role of roles) {
      expect(ROLE_DESCRIPTIONS[role]).toBeDefined();
      expect(typeof ROLE_DESCRIPTIONS[role]).toBe('string');
      expect(ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(0);
    }
  });
});
