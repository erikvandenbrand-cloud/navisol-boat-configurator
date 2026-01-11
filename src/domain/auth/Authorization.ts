/**
 * Authorization - v4
 * Role-based access control
 */

export type Role = 'admin' | 'manager' | 'sales' | 'production' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// ============================================
// AUTHORIZATION MATRIX
// ============================================

type Permission =
  | 'library.approve'
  | 'project.create'
  | 'project.edit'
  | 'project.confirm_order'
  | 'project.mark_delivered'
  | 'project.archive'
  | 'amendment.approve'
  | 'emergency.unlock'
  | 'task.manage'
  | 'time.entry'
  | 'quote.create'
  | 'quote.send'
  | 'client.manage';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'library.approve',
    'project.create',
    'project.edit',
    'project.confirm_order',
    'project.mark_delivered',
    'project.archive',
    'amendment.approve',
    'emergency.unlock',
    'task.manage',
    'time.entry',
    'quote.create',
    'quote.send',
    'client.manage',
  ],
  manager: [
    'library.approve',
    'project.create',
    'project.edit',
    'project.confirm_order',
    'project.mark_delivered',
    'project.archive',
    'amendment.approve',
    'task.manage',
    'time.entry',
    'quote.create',
    'quote.send',
    'client.manage',
  ],
  sales: [
    'project.create',
    'project.edit',
    'project.confirm_order',
    'quote.create',
    'quote.send',
    'client.manage',
  ],
  production: [
    'task.manage',
    'time.entry',
  ],
  viewer: [],
};

// ============================================
// AUTHORIZATION SERVICE
// ============================================

export const Authorization = {
  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  },

  /**
   * Check if user can perform action
   */
  canPerform(user: User, permission: Permission): boolean {
    return this.hasPermission(user.role, permission);
  },

  /**
   * Get all permissions for a role
   */
  getPermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  },

  /**
   * Check if user can approve library versions
   */
  canApproveLibrary(user: User): boolean {
    return this.canPerform(user, 'library.approve');
  },

  /**
   * Check if user can create projects
   */
  canCreateProject(user: User): boolean {
    return this.canPerform(user, 'project.create');
  },

  /**
   * Check if user can edit projects
   */
  canEditProject(user: User): boolean {
    return this.canPerform(user, 'project.edit');
  },

  /**
   * Check if user can confirm orders
   */
  canConfirmOrder(user: User): boolean {
    return this.canPerform(user, 'project.confirm_order');
  },

  /**
   * Check if user can mark projects as delivered
   */
  canMarkDelivered(user: User): boolean {
    return this.canPerform(user, 'project.mark_delivered');
  },

  /**
   * Check if user can approve amendments
   */
  canApproveAmendment(user: User): boolean {
    return this.canPerform(user, 'amendment.approve');
  },

  /**
   * Check if user can perform emergency unlock
   */
  canEmergencyUnlock(user: User): boolean {
    return this.canPerform(user, 'emergency.unlock');
  },

  /**
   * Check if user can manage tasks
   */
  canManageTasks(user: User): boolean {
    return this.canPerform(user, 'task.manage');
  },

  /**
   * Check if user can create quotes
   */
  canCreateQuote(user: User): boolean {
    return this.canPerform(user, 'quote.create');
  },

  /**
   * Check if user can send quotes
   */
  canSendQuote(user: User): boolean {
    return this.canPerform(user, 'quote.send');
  },

  /**
   * Get display info for a role
   */
  getRoleInfo(role: Role): { label: string; description: string } {
    const info: Record<Role, { label: string; description: string }> = {
      admin: {
        label: 'Administrator',
        description: 'Full system access including emergency operations',
      },
      manager: {
        label: 'Manager',
        description: 'Manage projects, approvals, and team operations',
      },
      sales: {
        label: 'Sales',
        description: 'Create projects, quotes, and manage clients',
      },
      production: {
        label: 'Production',
        description: 'Manage tasks and log time entries',
      },
      viewer: {
        label: 'Viewer',
        description: 'View-only access to projects',
      },
    };

    return info[role];
  },

  /**
   * Get all available roles
   */
  getAllRoles(): Role[] {
    return ['admin', 'manager', 'sales', 'production', 'viewer'];
  },
};

// ============================================
// DEFAULT SYSTEM USER
// ============================================

export const SYSTEM_USER: User = {
  id: 'system',
  name: 'System',
  email: 'system@navisol.nl',
  role: 'admin',
};

// ============================================
// USER CONTEXT
// ============================================

// For now, we'll use a mock user until proper auth is implemented
let currentUser: User = SYSTEM_USER;

export function getCurrentUser(): User {
  return currentUser;
}

export function setCurrentUser(user: User): void {
  currentUser = user;
}

export function getAuditContext(): { userId: string; userName: string } {
  return {
    userId: currentUser.id,
    userName: currentUser.name,
  };
}
