/**
 * Auth State Hook - v4
 * User authentication and authorization with role-based permissions
 */

'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { UserRole, Permission, UserSession, User } from '@/domain/models';
import { hasPermission, hasAnyPermission, hasAllPermissions, isRoleAtLeast } from '@/domain/models';
import { AuthService } from '@/domain/services/AuthService';
import type { AuditContext } from '@/domain/audit/AuditService';

// ============================================
// TYPES
// ============================================

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: CurrentUser | null;
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // Permission checking
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  isAtLeast: (role: UserRole) => boolean;
  // Helpers
  getAuditContext: () => AuditContext;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize - check for existing session and set up default users
  useEffect(() => {
    async function init() {
      try {
        // Initialize default users if needed
        await AuthService.initializeDefaultUser();

        // Validate existing session against stored users
        const validation = await AuthService.validateSession();
        if (validation.valid && validation.user) {
          const currentSession = AuthService.getCurrentSession();
          if (currentSession) {
            setSession(currentSession);
            setUser({
              id: validation.user.id,
              name: validation.user.name,
              email: validation.user.email,
              role: validation.user.role,
            });
          }
        } else {
          // Session invalid or user doesn't exist - clear state
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        // On error, ensure clean state
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await AuthService.login({ email, password });

    if (result.ok) {
      const newSession = result.value;
      setSession(newSession);
      setUser({
        id: newSession.userId,
        name: newSession.name,
        email: newSession.email,
        role: newSession.role,
      });
      return { success: true };
    }

    return { success: false, error: result.error };
  }, []);

  const logout = useCallback(() => {
    AuthService.logout();
    setSession(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    // Validate session after refresh
    const validation = await AuthService.validateSession();
    if (validation.valid && validation.user) {
      const currentSession = AuthService.getCurrentSession();
      if (currentSession) {
        setSession(currentSession);
        setUser({
          id: validation.user.id,
          name: validation.user.name,
          email: validation.user.email,
          role: validation.user.role,
        });
      }
    } else {
      setSession(null);
      setUser(null);
    }
  }, []);

  // Permission checking functions
  const can = useCallback((permission: Permission): boolean => {
    if (!session) return false;
    return hasPermission(session.role, permission);
  }, [session]);

  const canAll = useCallback((permissions: Permission[]): boolean => {
    if (!session) return false;
    return hasAllPermissions(session.role, permissions);
  }, [session]);

  const canAny = useCallback((permissions: Permission[]): boolean => {
    if (!session) return false;
    return hasAnyPermission(session.role, permissions);
  }, [session]);

  const isAtLeast = useCallback((role: UserRole): boolean => {
    if (!session) return false;
    return isRoleAtLeast(session.role, role);
  }, [session]);

  const getAuditContext = useCallback((): AuditContext => {
    return {
      userId: user?.id || 'anonymous',
      userName: user?.name || 'Anonymous',
    };
  }, [user]);

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    can,
    canAll,
    canAny,
    isAtLeast,
    getAuditContext,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Get audit context for service calls
 * Returns a valid context even outside React (for testing/scripts)
 */
export function getDefaultAuditContext(): AuditContext {
  if (typeof window === 'undefined') {
    return {
      userId: 'server',
      userName: 'Server Process',
    };
  }

  const session = AuthService.getCurrentSession();
  if (session) {
    return {
      userId: session.userId,
      userName: session.name,
    };
  }

  return {
    userId: 'anonymous',
    userName: 'Anonymous',
  };
}

// ============================================
// PERMISSION GUARD COMPONENT
// ============================================

interface PermissionGuardProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  minRole?: UserRole;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component to guard content based on permissions
 */
export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  minRole,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can, canAll, canAny, isAtLeast, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check minimum role
  if (minRole && !isAtLeast(minRole)) {
    return <>{fallback}</>;
  }

  // Check single permission
  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasPerms = requireAll ? canAll(permissions) : canAny(permissions);
    if (!hasPerms) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// ============================================
// AUTH GUARD COMPONENT
// ============================================

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to guard content for authenticated users only
 */
export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
