/**
 * Authentication Types for Navisol System
 */

// User roles with increasing permission levels
export type UserRole = 'viewer' | 'production' | 'sales' | 'manager' | 'admin';

// User interface
export interface User {
  id: string;
  username: string;
  password: string; // In production, this would be hashed
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// Session interface
export interface AuthSession {
  user: Omit<User, 'password'>;
  loginTime: string;
  expiresAt: string;
}

// Role permissions
export interface RolePermissions {
  // Dashboard
  viewDashboard: boolean;

  // Clients
  viewClients: boolean;
  manageClients: boolean;

  // Articles
  viewArticles: boolean;
  manageArticles: boolean;

  // Configurations
  viewConfigurations: boolean;
  createConfigurations: boolean;
  deleteConfigurations: boolean;

  // Documents
  viewDocuments: boolean;
  createDocuments: boolean;

  // Quotations
  viewQuotations: boolean;
  createQuotations: boolean;
  sendQuotations: boolean;

  // Production
  viewProduction: boolean;
  updateProduction: boolean;

  // CE Documents
  viewCEDocs: boolean;
  createCEDocs: boolean;

  // Media / Photos (Internal Technical Dossier)
  viewMedia: boolean;
  manageMedia: boolean;

  // Tasks & Time Tracking
  viewTasks: boolean;
  manageTasks: boolean;

  // Settings
  viewSettings: boolean;
  manageSettings: boolean;

  // User Management
  viewUsers: boolean;
  manageUsers: boolean;
}

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  viewer: {
    viewDashboard: true,
    viewClients: true,
    manageClients: false,
    viewArticles: true,
    manageArticles: false,
    viewConfigurations: true,
    createConfigurations: false,
    deleteConfigurations: false,
    viewDocuments: true,
    createDocuments: false,
    viewQuotations: true,
    createQuotations: false,
    sendQuotations: false,
    viewProduction: true,
    updateProduction: false,
    viewCEDocs: true,
    createCEDocs: false,
    viewMedia: false, // Viewers cannot access internal photos
    manageMedia: false,
    viewTasks: true,
    manageTasks: false,
    viewSettings: false,
    manageSettings: false,
    viewUsers: false,
    manageUsers: false,
  },
  production: {
    viewDashboard: true,
    viewClients: true,
    manageClients: false,
    viewArticles: true,
    manageArticles: false,
    viewConfigurations: true,
    createConfigurations: false,
    deleteConfigurations: false,
    viewDocuments: true,
    createDocuments: false,
    viewQuotations: true,
    createQuotations: false,
    sendQuotations: false,
    viewProduction: true,
    updateProduction: true,
    viewCEDocs: true,
    createCEDocs: false,
    viewMedia: true, // Production can view internal photos
    manageMedia: true, // Production can upload/edit photos
    viewTasks: true,
    manageTasks: true, // Production can manage tasks and time
    viewSettings: false,
    manageSettings: false,
    viewUsers: false,
    manageUsers: false,
  },
  sales: {
    viewDashboard: true,
    viewClients: true,
    manageClients: true,
    viewArticles: true,
    manageArticles: false,
    viewConfigurations: true,
    createConfigurations: true,
    deleteConfigurations: false,
    viewDocuments: true,
    createDocuments: true,
    viewQuotations: true,
    createQuotations: true,
    sendQuotations: true,
    viewProduction: true,
    updateProduction: false,
    viewCEDocs: true,
    createCEDocs: false,
    viewMedia: true, // Sales can view internal photos
    manageMedia: false, // Sales cannot manage photos
    viewTasks: true,
    manageTasks: false, // Sales can view but not manage tasks
    viewSettings: false,
    manageSettings: false,
    viewUsers: false,
    manageUsers: false,
  },
  manager: {
    viewDashboard: true,
    viewClients: true,
    manageClients: true,
    viewArticles: true,
    manageArticles: true,
    viewConfigurations: true,
    createConfigurations: true,
    deleteConfigurations: true,
    viewDocuments: true,
    createDocuments: true,
    viewQuotations: true,
    createQuotations: true,
    sendQuotations: true,
    viewProduction: true,
    updateProduction: true,
    viewCEDocs: true,
    createCEDocs: true,
    viewMedia: true,
    manageMedia: true,
    viewTasks: true,
    manageTasks: true,
    viewSettings: true,
    manageSettings: false,
    viewUsers: true,
    manageUsers: false,
  },
  admin: {
    viewDashboard: true,
    viewClients: true,
    manageClients: true,
    viewArticles: true,
    manageArticles: true,
    viewConfigurations: true,
    createConfigurations: true,
    deleteConfigurations: true,
    viewDocuments: true,
    createDocuments: true,
    viewQuotations: true,
    createQuotations: true,
    sendQuotations: true,
    viewProduction: true,
    updateProduction: true,
    viewCEDocs: true,
    createCEDocs: true,
    viewMedia: true,
    manageMedia: true,
    viewTasks: true,
    manageTasks: true,
    viewSettings: true,
    manageSettings: true,
    viewUsers: true,
    manageUsers: true,
  },
};

// Role display names
export const ROLE_NAMES: Record<UserRole, { en: string; nl: string }> = {
  viewer: { en: 'Viewer', nl: 'Kijker' },
  production: { en: 'Production', nl: 'Productie' },
  sales: { en: 'Sales', nl: 'Verkoop' },
  manager: { en: 'Manager', nl: 'Manager' },
  admin: { en: 'Administrator', nl: 'Beheerder' },
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, { en: string; nl: string }> = {
  viewer: {
    en: 'Read-only access to all data',
    nl: 'Alleen-lezen toegang tot alle gegevens'
  },
  production: {
    en: 'Can update production timelines',
    nl: 'Kan productietijdlijnen bijwerken'
  },
  sales: {
    en: 'Can manage clients and create quotations',
    nl: 'Kan klanten beheren en offertes maken'
  },
  manager: {
    en: 'Full access except user management',
    nl: 'Volledige toegang behalve gebruikersbeheer'
  },
  admin: {
    en: 'Full system access including user management',
    nl: 'Volledige systeemtoegang inclusief gebruikersbeheer'
  },
};

// Default admin user (for initial setup)
export const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  username: 'admin',
  password: 'admin123', // In production, use proper hashing
  firstName: 'System',
  lastName: 'Administrator',
  email: 'admin@navisol.nl',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
};

// Session duration (8 hours)
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
