/**
 * User Persistence Tests
 * Tests for user data persistence across reloads and session management
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import { AuthService } from '@/domain/services/AuthService';
import { getAdapter } from '@/data/persistence';
import type { User } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';

const USER_NAMESPACE = 'users';

const adminContext = {
  userId: 'admin-user',
  userName: 'Admin User',
};

// Generate unique emails for each test
function uniqueEmail(prefix: string): string {
  return `${prefix}-${generateUUID().slice(0, 8)}@test.com`;
}

// ============================================
// PERSISTENCE TESTS
// ============================================

describe('User Persistence - CRUD Operations', () => {
  test('created user should be persisted in storage', async () => {
    const email = uniqueEmail('persist-create');
    const result = await AuthService.createUser({
      email,
      name: 'Persisted User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify user exists in storage via getAllUsers
    const allUsers = await AuthService.getAllUsers();
    const found = allUsers.find(u => u.id === result.value.id);

    expect(found).toBeDefined();
    expect(found?.email).toBe(email.toLowerCase());
    expect(found?.name).toBe('Persisted User');
  });

  test('updated user should persist changes', async () => {
    const email = uniqueEmail('persist-update');
    const createResult = await AuthService.createUser({
      email,
      name: 'Original Name',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Update the user
    const updateResult = await AuthService.updateUser(
      createResult.value.id,
      { name: 'Updated Name', role: 'SALES' },
      adminContext
    );

    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;

    // Verify changes persisted
    const allUsers = await AuthService.getAllUsers();
    const found = allUsers.find(u => u.id === createResult.value.id);

    expect(found?.name).toBe('Updated Name');
    expect(found?.role).toBe('SALES');
  });

  test('deactivated user should persist inactive status', async () => {
    const email = uniqueEmail('persist-deactivate');
    const createResult = await AuthService.createUser({
      email,
      name: 'To Be Deactivated',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Deactivate the user
    const deactivateResult = await AuthService.deactivateUser(
      createResult.value.id,
      adminContext
    );

    expect(deactivateResult.ok).toBe(true);

    // Verify status persisted
    const allUsers = await AuthService.getAllUsers();
    const found = allUsers.find(u => u.id === createResult.value.id);

    expect(found?.isActive).toBe(false);
  });

  test('activated user should persist active status', async () => {
    const email = uniqueEmail('persist-activate');
    const createResult = await AuthService.createUser({
      email,
      name: 'To Be Activated',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Deactivate then activate
    await AuthService.deactivateUser(createResult.value.id, adminContext);
    const activateResult = await AuthService.activateUser(
      createResult.value.id,
      adminContext
    );

    expect(activateResult.ok).toBe(true);

    // Verify status persisted
    const allUsers = await AuthService.getAllUsers();
    const found = allUsers.find(u => u.id === createResult.value.id);

    expect(found?.isActive).toBe(true);
  });

  test('password change should persist', async () => {
    const email = uniqueEmail('persist-password');
    const createResult = await AuthService.createUser({
      email,
      name: 'Password Change User',
      role: 'VIEWER',
      password: 'oldpassword',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Change password
    const changeResult = await AuthService.changePassword(
      createResult.value.id,
      'newpassword123',
      adminContext
    );

    expect(changeResult.ok).toBe(true);

    // Verify new password works via login
    const loginResult = await AuthService.login({
      email,
      password: 'newpassword123',
    });

    expect(loginResult.ok).toBe(true);

    // Logout after test
    AuthService.logout();
  });
});

// ============================================
// VERSION TRACKING TESTS
// ============================================

describe('User Persistence - Version Tracking', () => {
  test('user version should increment on update', async () => {
    const email = uniqueEmail('version-test');
    const createResult = await AuthService.createUser({
      email,
      name: 'Version Test User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    expect(createResult.value.version).toBe(0);

    // First update
    const update1 = await AuthService.updateUser(
      createResult.value.id,
      { name: 'Updated Once' },
      adminContext
    );

    expect(update1.ok).toBe(true);
    if (update1.ok) {
      expect(update1.value.version).toBe(1);
    }

    // Second update
    const update2 = await AuthService.updateUser(
      createResult.value.id,
      { name: 'Updated Twice' },
      adminContext
    );

    expect(update2.ok).toBe(true);
    if (update2.ok) {
      expect(update2.value.version).toBe(2);
    }
  });

  test('user version should increment on status change', async () => {
    const email = uniqueEmail('version-status');
    const createResult = await AuthService.createUser({
      email,
      name: 'Version Status User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const initialVersion = createResult.value.version;

    // Deactivate
    await AuthService.deactivateUser(createResult.value.id, adminContext);

    // Check version incremented
    const user = await AuthService.getUserById(createResult.value.id);
    expect(user?.version).toBe(initialVersion + 1);

    // Activate
    await AuthService.activateUser(createResult.value.id, adminContext);

    // Check version incremented again
    const userAfterActivate = await AuthService.getUserById(createResult.value.id);
    expect(userAfterActivate?.version).toBe(initialVersion + 2);
  });
});

// ============================================
// SESSION VALIDATION TESTS
// ============================================

describe('User Persistence - Session Validation', () => {
  test('session validation should return false for non-existent user', async () => {
    // Ensure no session exists
    AuthService.logout();

    const validation = await AuthService.validateSession();
    expect(validation.valid).toBe(false);
    expect(validation.user).toBeUndefined();
  });

  test('getCurrentUser should return null for deactivated user session', async () => {
    const email = uniqueEmail('session-deactivate');

    // Create user
    const createResult = await AuthService.createUser({
      email,
      name: 'Session Deactivate User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Login as this user
    const loginResult = await AuthService.login({
      email,
      password: 'password123',
    });

    expect(loginResult.ok).toBe(true);

    // Deactivate the user (by admin)
    await AuthService.deactivateUser(createResult.value.id, adminContext);

    // getCurrentUser should return null and clear session
    const currentUser = await AuthService.getCurrentUser();
    expect(currentUser).toBeNull();
  });

  test('isLoggedIn should return true after login', async () => {
    const email = uniqueEmail('session-check');

    await AuthService.createUser({
      email,
      name: 'Session Check User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    AuthService.logout(); // Start fresh
    expect(AuthService.isLoggedIn()).toBe(false);

    await AuthService.login({ email, password: 'password123' });
    expect(AuthService.isLoggedIn()).toBe(true);

    AuthService.logout();
    expect(AuthService.isLoggedIn()).toBe(false);
  });
});

// ============================================
// RELOAD SIMULATION TESTS
// ============================================

describe('User Persistence - Reload Behavior', () => {
  test('users should persist after simulated reload (re-read from storage)', async () => {
    const email = uniqueEmail('reload-test');

    // Create a user
    const createResult = await AuthService.createUser({
      email,
      name: 'Reload Test User',
      role: 'SALES',
      password: 'password123',
      department: 'Test Dept',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const userId = createResult.value.id;

    // Simulate reload by re-fetching all users
    const usersAfterReload = await AuthService.getAllUsers();
    const foundUser = usersAfterReload.find(u => u.id === userId);

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(email.toLowerCase());
    expect(foundUser?.name).toBe('Reload Test User');
    expect(foundUser?.role).toBe('SALES');
    expect(foundUser?.department).toBe('Test Dept');
    expect(foundUser?.isActive).toBe(true);
  });

  test('user updates should persist after simulated reload', async () => {
    const email = uniqueEmail('reload-update');

    // Create and update user
    const createResult = await AuthService.createUser({
      email,
      name: 'Original Reload Name',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    await AuthService.updateUser(
      createResult.value.id,
      { name: 'Updated Reload Name', role: 'MANAGER' },
      adminContext
    );

    // Simulate reload
    const usersAfterReload = await AuthService.getAllUsers();
    const foundUser = usersAfterReload.find(u => u.id === createResult.value.id);

    expect(foundUser?.name).toBe('Updated Reload Name');
    expect(foundUser?.role).toBe('MANAGER');
  });

  test('multiple user operations should persist correctly', async () => {
    const email1 = uniqueEmail('multi-op-1');
    const email2 = uniqueEmail('multi-op-2');

    // Create two users
    const user1 = await AuthService.createUser({
      email: email1,
      name: 'Multi Op User 1',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    const user2 = await AuthService.createUser({
      email: email2,
      name: 'Multi Op User 2',
      role: 'SALES',
      password: 'password123',
    }, adminContext);

    expect(user1.ok).toBe(true);
    expect(user2.ok).toBe(true);
    if (!user1.ok || !user2.ok) return;

    // Update user 1
    await AuthService.updateUser(user1.value.id, { name: 'Updated User 1' }, adminContext);

    // Deactivate user 2
    await AuthService.deactivateUser(user2.value.id, adminContext);

    // Verify all changes persisted
    const allUsers = await AuthService.getAllUsers();

    const found1 = allUsers.find(u => u.id === user1.value.id);
    const found2 = allUsers.find(u => u.id === user2.value.id);

    expect(found1?.name).toBe('Updated User 1');
    expect(found2?.isActive).toBe(false);
  });
});

// ============================================
// AUDIT LOG TESTS
// ============================================

describe('User Persistence - Audit Logging', () => {
  test('user creation should create audit entry', async () => {
    const { AuditService } = await import('@/domain/audit/AuditService');
    const beforeCount = (await AuditService.getAll()).length;

    const email = uniqueEmail('audit-create');
    const createResult = await AuthService.createUser({
      email,
      name: 'Audit Test User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const afterCount = (await AuditService.getAll()).length;
    expect(afterCount).toBeGreaterThan(beforeCount);

    // Check audit entry for this specific user
    const history = await AuditService.getHistory('User', createResult.value.id);
    expect(history.length).toBeGreaterThan(0);

    const createEntry = history.find(e => e.action === 'CREATE');
    expect(createEntry).toBeDefined();
    expect(createEntry?.entityType).toBe('User');
  });

  test('user update should create audit entry', async () => {
    const { AuditService } = await import('@/domain/audit/AuditService');

    const email = uniqueEmail('audit-update');
    const createResult = await AuthService.createUser({
      email,
      name: 'Audit Update User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    if (!createResult.ok) return;

    await AuthService.updateUser(
      createResult.value.id,
      { name: 'Audit Updated User' },
      adminContext
    );

    // Check audit entry for this specific user
    const history = await AuditService.getHistory('User', createResult.value.id);
    expect(history.length).toBeGreaterThanOrEqual(2); // CREATE + UPDATE

    const updateEntry = history.find(e => e.action === 'UPDATE');
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.entityType).toBe('User');
  });

  test('user deactivation should create audit entry', async () => {
    const { AuditService } = await import('@/domain/audit/AuditService');

    const email = uniqueEmail('audit-deactivate');
    const createResult = await AuthService.createUser({
      email,
      name: 'Audit Deactivate User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    if (!createResult.ok) return;

    await AuthService.deactivateUser(createResult.value.id, adminContext);

    // Check audit entry for this specific user
    const history = await AuditService.getHistory('User', createResult.value.id);

    const deactivateEntry = history.find(e =>
      e.action === 'UPDATE' && e.description.includes('Deactivated')
    );
    expect(deactivateEntry).toBeDefined();
    expect(deactivateEntry?.entityType).toBe('User');
  });

  test('password change should create audit entry', async () => {
    const { AuditService } = await import('@/domain/audit/AuditService');

    const email = uniqueEmail('audit-password');
    const createResult = await AuthService.createUser({
      email,
      name: 'Audit Password User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    if (!createResult.ok) return;

    await AuthService.changePassword(
      createResult.value.id,
      'newpassword456',
      adminContext
    );

    // Check audit entry for this specific user
    const history = await AuditService.getHistory('User', createResult.value.id);

    const passwordEntry = history.find(e =>
      e.action === 'UPDATE' && e.description.includes('Password changed')
    );
    expect(passwordEntry).toBeDefined();
    expect(passwordEntry?.entityType).toBe('User');
  });
});

// ============================================
// DEFAULT USER INITIALIZATION TESTS
// ============================================

describe('User Persistence - Initialization', () => {
  test('getAllUsers should return array', async () => {
    const users = await AuthService.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
  });

  test('getUserById should return user or null', async () => {
    const email = uniqueEmail('getbyid');
    const createResult = await AuthService.createUser({
      email,
      name: 'GetById Test',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    if (!createResult.ok) return;

    const found = await AuthService.getUserById(createResult.value.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(createResult.value.id);

    const notFound = await AuthService.getUserById('non-existent-id');
    expect(notFound).toBeNull();
  });

  test('duplicate email should be rejected', async () => {
    const email = uniqueEmail('duplicate-persist');

    // Create first user
    await AuthService.createUser({
      email,
      name: 'First User',
      role: 'VIEWER',
      password: 'password123',
    }, adminContext);

    // Try to create duplicate
    const duplicate = await AuthService.createUser({
      email, // Same email
      name: 'Duplicate User',
      role: 'SALES',
      password: 'password456',
    }, adminContext);

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error).toContain('already exists');
    }
  });
});
