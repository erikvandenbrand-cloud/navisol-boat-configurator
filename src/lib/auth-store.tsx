'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthSession, UserRole, RolePermissions } from './auth-types';
import { ROLE_PERMISSIONS, DEFAULT_ADMIN, SESSION_DURATION_MS } from './auth-types';
import { generateId } from './formatting';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: Omit<User, 'password'> | null;
  session: AuthSession | null;
  users: User[];

  // Permissions
  permissions: RolePermissions | null;
  hasPermission: (permission: keyof RolePermissions) => boolean;

  // Auth actions
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;

  // User management
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => User | null;
  updateUser: (id: string, updates: Partial<User>) => boolean;
  deleteUser: (id: string) => boolean;
  resetPassword: (id: string, newPassword: string) => boolean;
  getUserById: (id: string) => User | undefined;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEYS = {
  users: 'navisol_users',
  session: 'navisol_session',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);

  // Derived state
  const isAuthenticated = session !== null;
  const currentUser = session?.user || null;
  const permissions = currentUser ? ROLE_PERMISSIONS[currentUser.role] : null;

  // Load data from localStorage on mount
  useEffect(() => {
    loadStoredData();
  }, []);

  // Save users when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoading && users.length > 0) {
      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    }
  }, [users, isLoading]);

  // Check session expiry
  useEffect(() => {
    if (session) {
      const expiresAt = new Date(session.expiresAt).getTime();
      const now = Date.now();

      if (now >= expiresAt) {
        logout();
      } else {
        // Set timeout to auto-logout when session expires
        const timeout = setTimeout(logout, expiresAt - now);
        return () => clearTimeout(timeout);
      }
    }
  }, [session]);

  const loadStoredData = () => {
    // Safety check for SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      // Load users
      const storedUsers = localStorage.getItem(STORAGE_KEYS.users);
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        setUsers(parsedUsers);
      } else {
        // Initialize with default admin
        setUsers([DEFAULT_ADMIN]);
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify([DEFAULT_ADMIN]));
      }

      // Load session
      const storedSession = localStorage.getItem(STORAGE_KEYS.session);
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession) as AuthSession;
        const expiresAt = new Date(parsedSession.expiresAt).getTime();

        if (Date.now() < expiresAt) {
          setSession(parsedSession);
        } else {
          localStorage.removeItem(STORAGE_KEYS.session);
        }
      }
    } catch (e) {
      console.error('Failed to load auth data:', e);
      setUsers([DEFAULT_ADMIN]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!permissions) return false;
    return permissions[permission];
  };

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    // Create session
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    const newSession: AuthSession = {
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: now.toISOString(),
      },
      loginTime: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Update last login
    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, lastLogin: now.toISOString() } : u
    ));

    setSession(newSession);
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(newSession));

    return { success: true };
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEYS.session);
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User | null => {
    // Check if username already exists
    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      return null;
    }

    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>): boolean => {
    // Prevent changing username to existing one
    if (updates.username) {
      const existing = users.find(
        u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== id
      );
      if (existing) return false;
    }

    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));

    // Update session if current user was updated
    if (session?.user.id === id) {
      const updatedUser = users.find(u => u.id === id);
      if (updatedUser) {
        const newSession = {
          ...session,
          user: {
            ...session.user,
            ...updates,
          },
        };
        setSession(newSession as AuthSession);
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(newSession));
      }
    }

    return true;
  };

  const deleteUser = (id: string): boolean => {
    // Prevent deleting the last admin
    const user = users.find(u => u.id === id);
    if (!user) return false;

    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
      if (adminCount <= 1) return false;
    }

    // Prevent deleting yourself
    if (session?.user.id === id) return false;

    setUsers(prev => prev.filter(u => u.id !== id));
    return true;
  };

  const resetPassword = (id: string, newPassword: string): boolean => {
    if (!newPassword || newPassword.length < 4) return false;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword } : u));
    return true;
  };

  const getUserById = (id: string): User | undefined => {
    return users.find(u => u.id === id);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      currentUser,
      session,
      users,
      permissions,
      hasPermission,
      login,
      logout,
      addUser,
      updateUser,
      deleteUser,
      resetPassword,
      getUserById,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
