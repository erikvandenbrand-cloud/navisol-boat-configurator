/**
 * Auth Service - v4
 * Handles user authentication, sessions, and permission checking
 */

import type {
  User,
  UserRole,
  Permission,
  UserSession,
  CreateUserInput,
  UpdateUserInput,
  LoginInput,
} from '@/domain/models';
import {
  generateUUID,
  now,
  Result,
  Ok,
  Err,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isRoleAtLeast,
} from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// REPOSITORY
// ============================================

const USER_NAMESPACE = 'users';
const SESSION_KEY = 'navisol_session';
const INIT_FLAG_KEY = 'navisol_users_initialized';

const UserRepository = {
  async getAll(): Promise<User[]> {
    const adapter = getAdapter();
    return adapter.getAll<User>(USER_NAMESPACE);
  },

  async getById(id: string): Promise<User | null> {
    const adapter = getAdapter();
    return adapter.getById<User>(USER_NAMESPACE, id);
  },

  async getByEmail(email: string): Promise<User | null> {
    const adapter = getAdapter();
    const all = await adapter.getAll<User>(USER_NAMESPACE);
    return all.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async save(user: User): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(USER_NAMESPACE, user);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(USER_NAMESPACE, id);
  },
};

// ============================================
// PASSWORD HASHING (Simple for demo - use bcrypt in production)
// ============================================

/**
 * Simple hash function for demo purposes
 * In production, use bcrypt or argon2
 */
function hashPassword(password: string): string {
  // Simple hash - NOT secure for production!
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function getStoredSession(): UserSession | null {
  if (!isClient()) return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as UserSession;

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function storeSession(session: UserSession): void {
  if (!isClient()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  if (!isClient()) return;
  localStorage.removeItem(SESSION_KEY);
}

function isInitialized(): boolean {
  if (!isClient()) return false;
  return localStorage.getItem(INIT_FLAG_KEY) === 'true';
}

function setInitialized(): void {
  if (!isClient()) return;
  localStorage.setItem(INIT_FLAG_KEY, 'true');
}

// ============================================
// AUTH SERVICE
// ============================================

export const AuthService = {
  /**
   * Get the current session
   */
  getCurrentSession(): UserSession | null {
    return getStoredSession();
  },

  /**
   * Get the current user from session
   * Validates user still exists in storage
   */
  async getCurrentUser(): Promise<User | null> {
    const session = getStoredSession();
    if (!session) return null;

    const user = await UserRepository.getById(session.userId);

    // If user no longer exists or is deactivated, clear session
    if (!user || !user.isActive) {
      clearSession();
      return null;
    }

    return user;
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return getStoredSession() !== null;
  },

  /**
   * Validate session - checks if session is valid and user exists
   */
  async validateSession(): Promise<{ valid: boolean; user?: User }> {
    const session = getStoredSession();
    if (!session) {
      return { valid: false };
    }

    const user = await UserRepository.getById(session.userId);
    if (!user || !user.isActive) {
      clearSession();
      return { valid: false };
    }

    return { valid: true, user };
  },

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<Result<UserSession, string>> {
    const user = await UserRepository.getByEmail(input.email);

    if (!user) {
      return Err('Invalid email or password');
    }

    if (!user.isActive) {
      return Err('Account is deactivated. Please contact an administrator.');
    }

    if (!verifyPassword(input.password, user.passwordHash)) {
      return Err('Invalid email or password');
    }

    // Create session (expires in 8 hours)
    const session: UserSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      loginAt: now(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };

    storeSession(session);

    // Update last login - read fresh to avoid version conflicts
    const freshUser = await UserRepository.getById(user.id);
    if (freshUser) {
      await UserRepository.save({
        ...freshUser,
        lastLoginAt: now(),
        updatedAt: now(),
        version: freshUser.version + 1,
      });
    }

    return Ok(session);
  },

  /**
   * Logout current user
   */
  logout(): void {
    clearSession();
  },

  /**
   * Create a new user (Admin only)
   */
  async createUser(
    input: CreateUserInput,
    context: AuditContext
  ): Promise<Result<User, string>> {
    // Check if email already exists
    const existing = await UserRepository.getByEmail(input.email);
    if (existing) {
      return Err('A user with this email already exists');
    }

    // Validate password
    if (input.password.length < 6) {
      return Err('Password must be at least 6 characters');
    }

    const user: User = {
      id: generateUUID(),
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      passwordHash: hashPassword(input.password),
      isActive: true,
      phone: input.phone,
      department: input.department,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await UserRepository.save(user);

    await AuditService.log(
      context,
      'CREATE',
      'User',
      user.id,
      `Created user: ${user.name} (${user.email}) with role ${user.role}`
    );

    return Ok(user);
  },

  /**
   * Update a user
   */
  async updateUser(
    userId: string,
    updates: UpdateUserInput,
    context: AuditContext
  ): Promise<Result<User, string>> {
    // Get fresh user data to avoid version conflicts
    const user = await UserRepository.getById(userId);
    if (!user) {
      return Err('User not found');
    }

    const updated: User = {
      ...user,
      ...updates,
      updatedAt: now(),
      version: user.version + 1,
    };

    await UserRepository.save(updated);

    await AuditService.logUpdate(
      context,
      'User',
      userId,
      { name: user.name, role: user.role, isActive: user.isActive },
      { name: updated.name, role: updated.role, isActive: updated.isActive }
    );

    return Ok(updated);
  },

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    newPassword: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    // Get fresh user data
    const user = await UserRepository.getById(userId);
    if (!user) {
      return Err('User not found');
    }

    if (newPassword.length < 6) {
      return Err('Password must be at least 6 characters');
    }

    await UserRepository.save({
      ...user,
      passwordHash: hashPassword(newPassword),
      updatedAt: now(),
      version: user.version + 1,
    });

    await AuditService.log(
      context,
      'UPDATE',
      'User',
      userId,
      'Password changed'
    );

    return Ok(undefined);
  },

  /**
   * Deactivate a user
   */
  async deactivateUser(
    userId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    // Get fresh user data
    const user = await UserRepository.getById(userId);
    if (!user) {
      return Err('User not found');
    }

    // Cannot deactivate the last admin
    const allUsers = await UserRepository.getAll();
    const activeAdmins = allUsers.filter(u => u.role === 'ADMIN' && u.isActive && u.id !== userId);
    if (user.role === 'ADMIN' && activeAdmins.length === 0) {
      return Err('Cannot deactivate the last active administrator');
    }

    await UserRepository.save({
      ...user,
      isActive: false,
      updatedAt: now(),
      version: user.version + 1,
    });

    await AuditService.log(
      context,
      'UPDATE',
      'User',
      userId,
      `Deactivated user: ${user.name}`
    );

    return Ok(undefined);
  },

  /**
   * Activate a user
   */
  async activateUser(
    userId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    // Get fresh user data
    const user = await UserRepository.getById(userId);
    if (!user) {
      return Err('User not found');
    }

    await UserRepository.save({
      ...user,
      isActive: true,
      updatedAt: now(),
      version: user.version + 1,
    });

    await AuditService.log(
      context,
      'UPDATE',
      'User',
      userId,
      `Activated user: ${user.name}`
    );

    return Ok(undefined);
  },

  /**
   * Delete a user permanently
   */
  async deleteUser(
    userId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const user = await UserRepository.getById(userId);
    if (!user) {
      return Err('User not found');
    }

    // Cannot delete the last admin
    const allUsers = await UserRepository.getAll();
    const admins = allUsers.filter(u => u.role === 'ADMIN' && u.id !== userId);
    if (user.role === 'ADMIN' && admins.length === 0) {
      return Err('Cannot delete the last administrator');
    }

    await UserRepository.delete(userId);

    await AuditService.log(
      context,
      'DELETE',
      'User',
      userId,
      `Deleted user: ${user.name} (${user.email})`
    );

    return Ok(undefined);
  },

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return UserRepository.getAll();
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return UserRepository.getById(id);
  },

  /**
   * Check if current user has a permission
   */
  can(permission: Permission): boolean {
    const session = getStoredSession();
    if (!session) return false;
    return hasPermission(session.role, permission);
  },

  /**
   * Check if current user has all of the specified permissions
   */
  canAll(permissions: Permission[]): boolean {
    const session = getStoredSession();
    if (!session) return false;
    return hasAllPermissions(session.role, permissions);
  },

  /**
   * Check if current user has any of the specified permissions
   */
  canAny(permissions: Permission[]): boolean {
    const session = getStoredSession();
    if (!session) return false;
    return hasAnyPermission(session.role, permissions);
  },

  /**
   * Check if current user has at least the specified role level
   */
  isAtLeast(minRole: UserRole): boolean {
    const session = getStoredSession();
    if (!session) return false;
    return isRoleAtLeast(session.role, minRole);
  },

  /**
   * Get audit context for current user
   */
  getAuditContext(): AuditContext | null {
    const session = getStoredSession();
    if (!session) return null;

    return {
      userId: session.userId,
      userName: session.name,
    };
  },

  /**
   * Initialize default admin user if no users exist
   * Uses a persistent flag to prevent race conditions
   */
  async initializeDefaultUser(): Promise<void> {
    // Skip if not on client
    if (!isClient()) return;

    // Check initialization flag first
    if (isInitialized()) {
      return;
    }

    // Double-check by looking at actual users
    const users = await UserRepository.getAll();
    if (users.length > 0) {
      // Users exist, set flag and return
      setInitialized();
      return;
    }

    // Create default admin user with fixed ID
    const adminUser: User = {
      id: 'user-admin',
      email: 'admin@eagleboats.nl',
      name: 'System Administrator',
      role: 'ADMIN',
      passwordHash: hashPassword('admin123'),
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await UserRepository.save(adminUser);

    // Create demo users for each role with fixed IDs to prevent duplicates
    const demoUsers: User[] = [
      {
        id: 'user-manager',
        email: 'manager@eagleboats.nl',
        name: 'Peter de Vries',
        role: 'MANAGER',
        passwordHash: hashPassword('manager123'),
        isActive: true,
        department: 'Operations',
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      },
      {
        id: 'user-sales',
        email: 'sales@eagleboats.nl',
        name: 'Anna Jansen',
        role: 'SALES',
        passwordHash: hashPassword('sales123'),
        isActive: true,
        department: 'Sales',
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      },
      {
        id: 'user-production',
        email: 'production@eagleboats.nl',
        name: 'Erik van Dam',
        role: 'PRODUCTION',
        passwordHash: hashPassword('production123'),
        isActive: true,
        department: 'Production',
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      },
      {
        id: 'user-viewer',
        email: 'viewer@eagleboats.nl',
        name: 'Lisa Bakker',
        role: 'VIEWER',
        passwordHash: hashPassword('viewer123'),
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      },
    ];

    for (const user of demoUsers) {
      await UserRepository.save(user);
    }

    // Mark as initialized
    setInitialized();

    console.log('Default users created. Login as admin@eagleboats.nl / admin123');
  },

  /**
   * Reset initialization flag (for testing purposes only)
   */
  _resetInitFlag(): void {
    if (!isClient()) return;
    localStorage.removeItem(INIT_FLAG_KEY);
  },

  /**
   * Clear all users (for testing purposes only)
   */
  async _clearAllUsers(): Promise<void> {
    const adapter = getAdapter();
    await adapter.clear(USER_NAMESPACE);
  },
};
