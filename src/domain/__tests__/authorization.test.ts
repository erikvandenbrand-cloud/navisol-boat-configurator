/**
 * Authorization Tests - v4
 * Tests for role-based access control
 */

import { Authorization, type Role, type User } from '../auth';

function createUser(role: Role): User {
  return {
    id: `user-${role}`,
    name: `Test ${role}`,
    email: `${role}@test.com`,
    role,
  };
}

describe('Authorization', () => {
  describe('Admin role', () => {
    const admin = createUser('admin');

    it('can approve library versions', () => {
      expect(Authorization.canApproveLibrary(admin)).toBe(true);
    });

    it('can create projects', () => {
      expect(Authorization.canCreateProject(admin)).toBe(true);
    });

    it('can confirm orders', () => {
      expect(Authorization.canConfirmOrder(admin)).toBe(true);
    });

    it('can mark delivered', () => {
      expect(Authorization.canMarkDelivered(admin)).toBe(true);
    });

    it('can approve amendments', () => {
      expect(Authorization.canApproveAmendment(admin)).toBe(true);
    });

    it('can emergency unlock', () => {
      expect(Authorization.canEmergencyUnlock(admin)).toBe(true);
    });

    it('can manage tasks', () => {
      expect(Authorization.canManageTasks(admin)).toBe(true);
    });

    it('can create quotes', () => {
      expect(Authorization.canCreateQuote(admin)).toBe(true);
    });
  });

  describe('Manager role', () => {
    const manager = createUser('manager');

    it('can approve library versions', () => {
      expect(Authorization.canApproveLibrary(manager)).toBe(true);
    });

    it('can create projects', () => {
      expect(Authorization.canCreateProject(manager)).toBe(true);
    });

    it('can confirm orders', () => {
      expect(Authorization.canConfirmOrder(manager)).toBe(true);
    });

    it('can mark delivered', () => {
      expect(Authorization.canMarkDelivered(manager)).toBe(true);
    });

    it('can approve amendments', () => {
      expect(Authorization.canApproveAmendment(manager)).toBe(true);
    });

    it('CANNOT emergency unlock', () => {
      expect(Authorization.canEmergencyUnlock(manager)).toBe(false);
    });
  });

  describe('Sales role', () => {
    const sales = createUser('sales');

    it('CANNOT approve library versions', () => {
      expect(Authorization.canApproveLibrary(sales)).toBe(false);
    });

    it('can create projects', () => {
      expect(Authorization.canCreateProject(sales)).toBe(true);
    });

    it('can confirm orders', () => {
      expect(Authorization.canConfirmOrder(sales)).toBe(true);
    });

    it('CANNOT mark delivered', () => {
      expect(Authorization.canMarkDelivered(sales)).toBe(false);
    });

    it('CANNOT approve amendments', () => {
      expect(Authorization.canApproveAmendment(sales)).toBe(false);
    });

    it('CANNOT emergency unlock', () => {
      expect(Authorization.canEmergencyUnlock(sales)).toBe(false);
    });

    it('can create quotes', () => {
      expect(Authorization.canCreateQuote(sales)).toBe(true);
    });

    it('can send quotes', () => {
      expect(Authorization.canSendQuote(sales)).toBe(true);
    });
  });

  describe('Production role', () => {
    const production = createUser('production');

    it('CANNOT approve library versions', () => {
      expect(Authorization.canApproveLibrary(production)).toBe(false);
    });

    it('CANNOT create projects', () => {
      expect(Authorization.canCreateProject(production)).toBe(false);
    });

    it('CANNOT confirm orders', () => {
      expect(Authorization.canConfirmOrder(production)).toBe(false);
    });

    it('CANNOT mark delivered', () => {
      expect(Authorization.canMarkDelivered(production)).toBe(false);
    });

    it('can manage tasks', () => {
      expect(Authorization.canManageTasks(production)).toBe(true);
    });

    it('CANNOT create quotes', () => {
      expect(Authorization.canCreateQuote(production)).toBe(false);
    });
  });

  describe('Viewer role', () => {
    const viewer = createUser('viewer');

    it('CANNOT approve library versions', () => {
      expect(Authorization.canApproveLibrary(viewer)).toBe(false);
    });

    it('CANNOT create projects', () => {
      expect(Authorization.canCreateProject(viewer)).toBe(false);
    });

    it('CANNOT confirm orders', () => {
      expect(Authorization.canConfirmOrder(viewer)).toBe(false);
    });

    it('CANNOT mark delivered', () => {
      expect(Authorization.canMarkDelivered(viewer)).toBe(false);
    });

    it('CANNOT approve amendments', () => {
      expect(Authorization.canApproveAmendment(viewer)).toBe(false);
    });

    it('CANNOT emergency unlock', () => {
      expect(Authorization.canEmergencyUnlock(viewer)).toBe(false);
    });

    it('CANNOT manage tasks', () => {
      expect(Authorization.canManageTasks(viewer)).toBe(false);
    });

    it('CANNOT create quotes', () => {
      expect(Authorization.canCreateQuote(viewer)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns true for valid permission', () => {
      expect(Authorization.hasPermission('admin', 'emergency.unlock')).toBe(true);
    });

    it('returns false for invalid permission', () => {
      expect(Authorization.hasPermission('viewer', 'project.create')).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('returns all permissions for admin', () => {
      const perms = Authorization.getPermissions('admin');
      expect(perms.length).toBeGreaterThan(10);
      expect(perms).toContain('emergency.unlock');
    });

    it('returns empty array for viewer', () => {
      const perms = Authorization.getPermissions('viewer');
      expect(perms).toEqual([]);
    });
  });

  describe('getRoleInfo', () => {
    it('returns correct info for admin', () => {
      const info = Authorization.getRoleInfo('admin');
      expect(info.label).toBe('Administrator');
      expect(info.description).toContain('emergency');
    });

    it('returns correct info for viewer', () => {
      const info = Authorization.getRoleInfo('viewer');
      expect(info.label).toBe('Viewer');
      expect(info.description).toContain('View-only');
    });
  });

  describe('getAllRoles', () => {
    it('returns all 5 roles', () => {
      const roles = Authorization.getAllRoles();
      expect(roles).toHaveLength(5);
      expect(roles).toContain('admin');
      expect(roles).toContain('manager');
      expect(roles).toContain('sales');
      expect(roles).toContain('production');
      expect(roles).toContain('viewer');
    });
  });
});
