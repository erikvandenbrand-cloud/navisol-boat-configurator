'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ship, Users, FolderOpen, Settings, Database, User, LayoutDashboard, LogOut, Shield, ChevronDown, Lock, Clock, Hash, CalendarDays, LayoutGrid, Clipboard, ChevronRight, History, Folder, Factory, ShoppingCart } from 'lucide-react';
import { DashboardScreen } from './DashboardScreen';
import { ProjectListScreen } from './ProjectListScreen';
import { ProjectDetailScreen } from './ProjectDetailScreen';
import { ClientListScreen } from './ClientListScreen';
import { LibraryScreen } from './LibraryScreen';
import { SettingsScreen } from './SettingsScreen';
import { TimesheetsScreen } from './TimesheetsScreen';
import { WINRegisterScreen } from './WINRegisterScreen';
import { ResourcePlannerScreen } from './ResourcePlannerScreen';
import { ProjectPlannerScreen } from './ProjectPlannerScreen';
import { ShopfloorBoardScreen } from './ShopfloorBoardScreen';
import { ProductionScreen } from './ProductionScreen';
/**
 * @deprecated Staff concept removed in v323 — Users managed in SettingsScreen
 * StaffScreen import removed - user management is now unified in Settings → Users tab
 */
// import { StaffScreen } from './StaffScreen';
import { ShopFloorOrdersScreen } from './ShopFloorOrdersScreen';
import { LoginScreen } from './LoginScreen';
import { initializeSampleData } from '@/v4/data/sampleData';
import { AuthProvider, useAuth } from '@/v4/state/useAuth';
import { ProjectRepository } from '@/data/repositories';
import type { Project } from '@/domain/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS } from '@/domain/models';
import type { ProjectFilters } from '@/v4/navigation';
import { buildQueryString, parseQueryString } from '@/v4/navigation';

// ============================================
// RECENT PROJECTS SERVICE (localStorage, UI-only)
// ============================================

const RECENT_PROJECTS_KEY = 'navisol_v4_recent_projects';
const MAX_RECENT_PROJECTS = 5;

interface RecentProject {
  id: string;
  title: string;
  projectNumber: string;
  lastOpenedAt: string;
}

function getRecentProjects(): RecentProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentProject(project: { id: string; title: string; projectNumber: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentProjects();
    // Remove if already exists
    const filtered = recent.filter((p) => p.id !== project.id);
    // Add to front with timestamp
    filtered.unshift({
      ...project,
      lastOpenedAt: new Date().toISOString(),
    });
    // Keep only last N
    const trimmed = filtered.slice(0, MAX_RECENT_PROJECTS);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore errors
  }
}

// ============================================
// TYPES
// ============================================

import type { DossierDeepLinkParams } from '@/domain/utils/information-linking';
import { parseDossierDeepLinkParams } from '@/domain/utils/information-linking';

type Screen =
  | { type: 'dashboard' }
  | { type: 'projects'; filters?: ProjectFilters }
  | { type: 'project-detail'; projectId: string; initialTab?: string; dossierDeepLink?: DossierDeepLinkParams }
  | { type: 'clients' }
  | { type: 'library' }
  | { type: 'settings' }
  | { type: 'timesheets' }
  | { type: 'win-register' }
  | { type: 'resource-planner' }
  | { type: 'project-planner' }
  | { type: 'shopfloor-board' }
  | { type: 'production' }
  | { type: 'staff' }
  | { type: 'shop-floor-orders' };

// ============================================
// NAV VISIBILITY BY ROLE (v320 plan)
// ============================================
// Visibility only. Real enforcement may add route guards later.
// This controls which sidebar items are rendered per role.
// Hidden items do NOT appear at all (not disabled, truly hidden).

import type { UserRole } from '@/domain/models';

type NavScreen =
  | 'dashboard'
  | 'projects'
  | 'clients'
  | 'win-register'
  | 'timesheets'
  | 'shopfloor-board'
  | 'resource-planner'
  | 'project-planner'
  | 'production'
  | 'shop-floor-orders'
  | 'library'
  | 'staff'
  | 'settings';

/**
 * Nav visibility matrix by role.
 * true = visible, false = hidden
 */
const NAV_VISIBILITY: Record<UserRole, Record<NavScreen, boolean>> = {
  ADMIN: {
    dashboard: true,
    projects: true,
    clients: true,
    'win-register': true,
    timesheets: true,
    'shopfloor-board': true,
    'resource-planner': true,
    'project-planner': true,
    production: true,
    'shop-floor-orders': true,
    library: true,
    staff: false, // Staff concept removed in v323 — user management in Settings → Users
    settings: true,
  },
  OFFICE: {
    dashboard: true,
    projects: true,
    clients: true,
    'win-register': true,
    timesheets: true,
    'shopfloor-board': true,
    'resource-planner': true,
    'project-planner': true,
    production: true,
    'shop-floor-orders': true,
    library: true,
    staff: false, // Office cannot manage staff
    settings: false, // Office cannot access settings
  },
  SALES: {
    dashboard: true,
    projects: true, // Read-only access
    clients: true, // Read-only access
    'win-register': false,
    timesheets: false,
    'shopfloor-board': false,
    'resource-planner': false,
    'project-planner': false,
    production: false,
    'shop-floor-orders': false,
    library: false, // Sales cannot access library
    staff: false,
    settings: false,
  },
  PRODUCTION: {
    dashboard: false, // Production goes straight to portfolio
    projects: false, // No project list - access via portfolio screens only
    clients: false,
    'win-register': false,
    timesheets: true, // Own timesheets
    'shopfloor-board': true, // Primary work surface
    'resource-planner': false,
    'project-planner': false,
    production: true, // Production kanban
    'shop-floor-orders': true, // Shop floor orders
    library: false, // Read-only articles accessed via work instructions
    staff: false,
    settings: false,
  },
};

function isNavVisible(role: UserRole, screen: NavScreen): boolean {
  return NAV_VISIBILITY[role]?.[screen] ?? false;
}

/**
 * Parse screen from current URL hash
 * Uses hash-based routing to avoid 404s on hosts without SPA support
 * Format: #/screen or #/screen?param=value or #/projects/projectId
 */
function parseScreenFromHash(): Screen {
  if (typeof window === 'undefined') {
    return { type: 'dashboard' };
  }

  // Get hash without the leading #
  const hash = window.location.hash.slice(1) || '';

  // Split hash into path and query parts
  const [pathPart, queryPart] = hash.split('?');
  const path = pathPart || '';
  const filters = queryPart ? parseQueryString(`?${queryPart}`) : {};

  // Parse screen from hash path
  if (path.startsWith('/projects/')) {
    const projectId = path.split('/projects/')[1]?.split('/')[0];
    if (projectId) {
      // Support ?tab=planning query param for deep linking to specific tabs
      const searchParams = queryPart ? new URLSearchParams(queryPart) : new URLSearchParams();
      const tabParam = searchParams.get('tab');

      // Parse dossier deep link params (dossierSection, subheading, lens)
      const dossierDeepLink = parseDossierDeepLinkParams(searchParams);
      const hasDossierDeepLink = dossierDeepLink.dossierSection !== undefined;

      return {
        type: 'project-detail',
        projectId,
        initialTab: tabParam || undefined,
        dossierDeepLink: hasDossierDeepLink ? dossierDeepLink : undefined,
      };
    }
  }

  if (path === '/projects' || path.startsWith('/projects?')) {
    return { type: 'projects', filters };
  }

  if (path === '/clients') {
    return { type: 'clients' };
  }

  if (path === '/library') {
    return { type: 'library' };
  }

  if (path === '/settings') {
    return { type: 'settings' };
  }

  if (path === '/timesheets') {
    return { type: 'timesheets' };
  }

  if (path === '/win-register') {
    return { type: 'win-register' };
  }

  if (path === '/resource-planner') {
    return { type: 'resource-planner' };
  }

  if (path === '/project-planner') {
    return { type: 'project-planner' };
  }

  if (path === '/shopfloor-board') {
    return { type: 'shopfloor-board' };
  }

  if (path === '/production') {
    return { type: 'production' };
  }

  if (path === '/staff') {
    return { type: 'staff' };
  }

  if (path === '/shop-floor-orders') {
    return { type: 'shop-floor-orders' };
  }

  // Default to dashboard (empty hash, root, or /dashboard)
  return { type: 'dashboard' };
}

/**
 * Main V4 App wrapper with AuthProvider
 */
export function V4App() {
  return (
    <AuthProvider>
      <V4AppContent />
      {/* Dev-only migration test panel - only loads in development */}
      {process.env.NODE_ENV === 'development' && <DevMigrationTestPanel />}
    </AuthProvider>
  );
}

/**
 * Lazy-loaded dev panel to avoid bundling in production
 */
function DevMigrationTestPanel() {
  // Dynamic import to ensure tree-shaking in production
  const [Panel, setPanel] = useState<React.ComponentType | null>(null);
  const [loadAttempted, setLoadAttempted] = useState(false);

  useEffect(() => {
    // Only import in development
    if (process.env.NODE_ENV === 'development' && !loadAttempted) {
      setLoadAttempted(true);
      // Use relative import path for dynamic import compatibility
      import('../../__dev__/MigrationTestPanel')
        .then((mod) => setPanel(() => mod.MigrationTestPanel))
        .catch((err) => {
          // Silently fail if dev module not found
          console.warn('Dev migration test panel not available:', err.message);
        });
    }
  }, [loadAttempted]);

  if (!Panel) return null;
  return <Panel />;
}

/**
 * No Access Screen - shown when user lacks permission for a screen
 * Route guard v1: Simple role-based access denial with role-appropriate redirect
 */
function NoAccessScreen({
  screenName,
  userRole,
  onNavigateToPortfolio,
  onNavigateToDashboard,
}: {
  screenName: string;
  userRole?: UserRole;
  onNavigateToPortfolio?: () => void;
  onNavigateToDashboard?: () => void;
}) {
  // Determine appropriate redirect based on role
  const isProduction = userRole === 'PRODUCTION';
  const redirectLabel = isProduction ? 'Go to Portfolio' : 'Go to Dashboard';
  const handleRedirect = isProduction ? onNavigateToPortfolio : onNavigateToDashboard;

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 mb-4">
          You don't have permission to access {screenName}. Contact your administrator if you believe this is an error.
        </p>
        <Badge variant="outline" className="text-slate-500 mb-6">
          Your current role doesn't include access to this area
        </Badge>
        {handleRedirect && (
          <div className="mt-6">
            <Button onClick={handleRedirect} variant="default">
              {redirectLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main app content (inside AuthProvider)
 */
function V4AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>({ type: 'dashboard' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const { user, session, isLoading: authLoading, isAuthenticated, logout, can, isAtLeast } = useAuth();

  // Load recent projects on mount
  useEffect(() => {
    setRecentProjects(getRecentProjects());
  }, []);

  // Parse screen from URL hash
  const syncScreenFromHash = useCallback(() => {
    const screen = parseScreenFromHash();
    setCurrentScreen(screen);
  }, []);

  // Parse initial URL on mount and listen for hashchange (browser back/forward, hash navigation)
  useEffect(() => {
    syncScreenFromHash();

    // Handle browser back/forward navigation and hash changes
    const handleHashChange = () => {
      syncScreenFromHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [syncScreenFromHash]);

  useEffect(() => {
    // Initialize sample data on first load
    initializeSampleData().then(() => {
      setIsLoaded(true);
    });
  }, []);

  /**
   * Update URL hash without triggering page reload
   */
  function updateHash(hashPath: string, replace = false) {
    if (typeof window !== 'undefined') {
      const newHash = `#${hashPath}`;
      if (replace) {
        // Replace current history entry
        const url = new URL(window.location.href);
        url.hash = hashPath;
        window.history.replaceState({}, '', url.toString());
      } else {
        // Push new history entry
        window.location.hash = hashPath;
      }
    }
  }

  function navigateToDashboard() {
    updateHash('/');
    setCurrentScreen({ type: 'dashboard' });
  }

  async function navigateToProject(projectId: string, initialTab?: string) {
    // Fetch project info to add to recent projects
    try {
      const project = await ProjectRepository.getById(projectId);
      if (project) {
        addRecentProject({
          id: project.id,
          title: project.title,
          projectNumber: project.projectNumber,
        });
        setRecentProjects(getRecentProjects());
      }
    } catch {
      // Continue even if fetch fails
    }

    const tabQuery = initialTab ? `?tab=${initialTab}` : '';
    updateHash(`/projects/${projectId}${tabQuery}`);
    setCurrentScreen({ type: 'project-detail', projectId, initialTab });
  }

  function navigateToProjects(filters?: ProjectFilters) {
    const queryStr = buildQueryString(filters || {});
    updateHash(`/projects${queryStr}`);
    setCurrentScreen({ type: 'projects', filters });
  }

  function navigateToClients() {
    updateHash('/clients');
    setCurrentScreen({ type: 'clients' });
  }

  function navigateToLibrary() {
    updateHash('/library');
    setCurrentScreen({ type: 'library' });
  }

  function navigateToSettings() {
    updateHash('/settings');
    setCurrentScreen({ type: 'settings' });
  }

  function navigateToTimesheets() {
    updateHash('/timesheets');
    setCurrentScreen({ type: 'timesheets' });
  }

  function navigateToWINRegister() {
    updateHash('/win-register');
    setCurrentScreen({ type: 'win-register' });
  }

  function navigateToResourcePlanner() {
    updateHash('/resource-planner');
    setCurrentScreen({ type: 'resource-planner' });
  }

  function navigateToProjectPlanner() {
    updateHash('/project-planner');
    setCurrentScreen({ type: 'project-planner' });
  }

  function navigateToShopfloorBoard() {
    updateHash('/shopfloor-board');
    setCurrentScreen({ type: 'shopfloor-board' });
  }

  function navigateToProduction() {
    updateHash('/production');
    setCurrentScreen({ type: 'production' });
  }

  /**
   * @deprecated Staff concept removed in v323 — redirects to Settings.
   */
  function navigateToStaff() {
    // Redirect to settings where user management now lives
    navigateToSettings();
  }

  function navigateToShopFloorOrders() {
    updateHash('/shop-floor-orders');
    setCurrentScreen({ type: 'shop-floor-orders' });
  }

  // Show loading state
  if (!isLoaded || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Ship className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading Navisol v4...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Permission checks for screens (legacy, still used for some checks)
  const canAccessProjects = can('project:read');
  const canAccessClients = can('client:read');
  const canAccessTimesheets = can('timesheet:read');

  // ============================================
  // ROUTE GUARDS v1 — Role-based access control
  // ============================================
  // These are explicit role-based guards for sensitive screens.
  // This is NOT a generic permissions engine — just simple role checks.
  // Guards are local to this routing layer.

  const userRole = user?.role;

  // Staff: removed in v323 — user management unified in Settings → Users
  // const canAccessStaff = userRole === 'ADMIN';

  // Settings: ADMIN only
  const canAccessSettings = userRole === 'ADMIN';

  // Library (CRUD): ADMIN and OFFICE only
  const canAccessLibrary = userRole === 'ADMIN' || userRole === 'OFFICE';

  // Project creation: ADMIN and OFFICE only (checked in ProjectListScreen)
  const canCreateProject = userRole === 'ADMIN' || userRole === 'OFFICE';

  // WIN Register: ADMIN and OFFICE only (sensitive project data)
  const canAccessWINRegister = userRole === 'ADMIN' || userRole === 'OFFICE';

  // Resource/Project Planner: ADMIN and OFFICE only (planning screens)
  const canAccessPlanners = userRole === 'ADMIN' || userRole === 'OFFICE';

  // Helper for NoAccessScreen props
  const noAccessProps = {
    userRole,
    onNavigateToPortfolio: navigateToShopfloorBoard,
    onNavigateToDashboard: navigateToDashboard,
  };

  // Render appropriate screen content
  function renderScreenContent() {
    switch (currentScreen.type) {
      case 'dashboard':
        // PRODUCTION users should go to portfolio, not dashboard
        if (userRole === 'PRODUCTION') {
          // Redirect Production to Shopfloor Board as their home
          navigateToShopfloorBoard();
          return null;
        }
        return (
          <DashboardScreen
            onNavigateToProject={navigateToProject}
            onNavigateToProjects={navigateToProjects}
          />
        );

      case 'projects':
        // PRODUCTION cannot access project list (uses portfolio screens)
        if (userRole === 'PRODUCTION') {
          return <NoAccessScreen screenName="Projects" {...noAccessProps} />;
        }
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Projects" {...noAccessProps} />;
        }
        return (
          <ProjectListScreen
            onSelectProject={navigateToProject}
            initialFilters={currentScreen.filters}
          />
        );

      case 'project-detail':
        // All roles can view project details (accessed via portfolio for Production)
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Projects" {...noAccessProps} />;
        }
        return (
          <ProjectDetailScreen
            projectId={currentScreen.projectId}
            onBack={navigateToProjects}
            initialTab={currentScreen.initialTab}
            dossierDeepLink={currentScreen.dossierDeepLink}
          />
        );

      case 'clients':
        // PRODUCTION cannot access clients
        if (userRole === 'PRODUCTION') {
          return <NoAccessScreen screenName="Clients" {...noAccessProps} />;
        }
        if (!canAccessClients) {
          return <NoAccessScreen screenName="Clients" {...noAccessProps} />;
        }
        return <ClientListScreen />;

      case 'library':
        // Route guard: ADMIN and OFFICE only
        if (!canAccessLibrary) {
          return <NoAccessScreen screenName="Library" {...noAccessProps} />;
        }
        return <LibraryScreen />;

      case 'settings':
        // Route guard: ADMIN only
        if (!canAccessSettings) {
          return <NoAccessScreen screenName="Settings" {...noAccessProps} />;
        }
        return <SettingsScreen />;

      case 'timesheets':
        if (!canAccessTimesheets) {
          return <NoAccessScreen screenName="Timesheets" {...noAccessProps} />;
        }
        return <TimesheetsScreen />;

      case 'win-register':
        // Route guard: ADMIN and OFFICE only
        if (!canAccessWINRegister) {
          return <NoAccessScreen screenName="WIN Register" {...noAccessProps} />;
        }
        return <WINRegisterScreen onNavigateToProject={navigateToProject} />;

      case 'resource-planner':
        // Route guard: ADMIN and OFFICE only
        if (!canAccessPlanners) {
          return <NoAccessScreen screenName="Resource Planner" {...noAccessProps} />;
        }
        return <ResourcePlannerScreen />;

      case 'project-planner':
        // Route guard: ADMIN and OFFICE only
        if (!canAccessPlanners) {
          return <NoAccessScreen screenName="Project Planner" {...noAccessProps} />;
        }
        return <ProjectPlannerScreen onNavigateToProject={navigateToProject} />;

      case 'shopfloor-board':
        // Available to all roles that can read projects
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Shopfloor Board" {...noAccessProps} />;
        }
        return <ShopfloorBoardScreen onNavigateToProject={navigateToProject} />;

      case 'production':
        // Available to all roles that can read projects
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Production" {...noAccessProps} />;
        }
        return <ProductionScreen onNavigateToProject={navigateToProject} />;

      case 'staff':
        /**
         * GOVERNANCE: Staff concept removed in v323 — redirect to Settings.
         * User management is now unified in Settings → Users tab.
         */
        // Redirect to settings with users tab
        navigateToSettings();
        return null;

      case 'shop-floor-orders':
        // Available to all roles that can read projects
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Shop Floor Orders" {...noAccessProps} />;
        }
        return <ShopFloorOrdersScreen onNavigateToProject={navigateToProject} />;

      default:
        return (
          <DashboardScreen
            onNavigateToProject={navigateToProject}
            onNavigateToProjects={navigateToProjects}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Ship className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">NAVISOL</h1>
              <Badge variant="outline" className="text-[10px] border-teal-500 text-teal-400">
                v4 BETA
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation - Role-based visibility (v320 plan) */}
        {/* Visibility only. Real enforcement may add route guards later. */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Main Navigation - Dashboard */}
          {user && isNavVisible(user.role, 'dashboard') && (
            <div className="space-y-1">
              <NavItem
                icon={LayoutDashboard}
                label="Dashboard"
                active={currentScreen.type === 'dashboard'}
                onClick={navigateToDashboard}
              />
            </div>
          )}

          {/* Projects Section - Only for ADMIN, OFFICE, SALES */}
          {user && (isNavVisible(user.role, 'projects') || isNavVisible(user.role, 'clients') || isNavVisible(user.role, 'win-register')) && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                Projects
              </div>
              {isNavVisible(user.role, 'projects') && (
                <NavItem
                  icon={FolderOpen}
                  label="All Projects"
                  active={currentScreen.type === 'projects' || currentScreen.type === 'project-detail'}
                  onClick={() => navigateToProjects()}
                  disabled={!canAccessProjects}
                />
              )}
              {isNavVisible(user.role, 'clients') && (
                <NavItem
                  icon={Users}
                  label="Clients"
                  active={currentScreen.type === 'clients'}
                  onClick={navigateToClients}
                  disabled={!canAccessClients}
                />
              )}
              {isNavVisible(user.role, 'win-register') && (
                <NavItem
                  icon={Hash}
                  label="WIN Register"
                  active={currentScreen.type === 'win-register'}
                  onClick={navigateToWINRegister}
                  disabled={!canAccessProjects}
                />
              )}
              {isNavVisible(user.role, 'timesheets') && (
                <NavItem
                  icon={Clock}
                  label="Timesheets"
                  active={currentScreen.type === 'timesheets'}
                  onClick={navigateToTimesheets}
                  disabled={!canAccessTimesheets}
                />
              )}

              {/* Recent Projects Shortcut - only for roles that can access projects */}
              {recentProjects.length > 0 && canAccessProjects && isNavVisible(user.role, 'projects') && (
                <div className="pt-2">
                  <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 uppercase tracking-wider px-3 py-1">
                    <History className="h-3 w-3" />
                    Recent
                  </div>
                  <div className="space-y-0.5">
                    {recentProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => navigateToProject(project.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors truncate"
                        title={`${project.projectNumber} - ${project.title}`}
                      >
                        <Folder className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{project.projectNumber}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Portfolio Section - Primary for PRODUCTION, available for ADMIN/OFFICE */}
          {user && (isNavVisible(user.role, 'shopfloor-board') || isNavVisible(user.role, 'production') || isNavVisible(user.role, 'shop-floor-orders')) && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                Portfolio
              </div>
              {isNavVisible(user.role, 'shopfloor-board') && (
                <NavItem
                  icon={Clipboard}
                  label="Shopfloor Board"
                  active={currentScreen.type === 'shopfloor-board'}
                  onClick={navigateToShopfloorBoard}
                  disabled={!canAccessProjects}
                />
              )}
              {isNavVisible(user.role, 'resource-planner') && (
                <NavItem
                  icon={CalendarDays}
                  label="Resource Planner"
                  active={currentScreen.type === 'resource-planner'}
                  onClick={navigateToResourcePlanner}
                  disabled={!canAccessProjects}
                />
              )}
              {isNavVisible(user.role, 'project-planner') && (
                <NavItem
                  icon={LayoutGrid}
                  label="Project Planner"
                  active={currentScreen.type === 'project-planner'}
                  onClick={navigateToProjectPlanner}
                  disabled={!canAccessProjects}
                />
              )}
              {isNavVisible(user.role, 'production') && (
                <NavItem
                  icon={Factory}
                  label="Production"
                  active={currentScreen.type === 'production'}
                  onClick={navigateToProduction}
                  disabled={!canAccessProjects}
                />
              )}
              {/*
                GOVERNANCE: INTENT LOCK — Shop Floor Orders
                This is an operational production view for manual order tracking.
                - This screen must NOT expand into planning or purchasing dashboards.
                - No analytics, KPIs, supplier management, or procurement workflows.
                - Must remain a simple operational log only.
              */}
              {isNavVisible(user.role, 'shop-floor-orders') && (
                <NavItem
                  icon={ShoppingCart}
                  label="Shop Floor Orders"
                  active={currentScreen.type === 'shop-floor-orders'}
                  onClick={navigateToShopFloorOrders}
                  disabled={!canAccessProjects}
                />
              )}
              {/* Timesheets for Production - shown in Portfolio section */}
              {user.role === 'PRODUCTION' && isNavVisible(user.role, 'timesheets') && (
                <NavItem
                  icon={Clock}
                  label="Timesheets"
                  active={currentScreen.type === 'timesheets'}
                  onClick={navigateToTimesheets}
                  disabled={!canAccessTimesheets}
                />
              )}
            </div>
          )}

          {/* Library Section - ADMIN and OFFICE only */}
          {user && isNavVisible(user.role, 'library') && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                Library
              </div>
              <NavItem
                icon={Database}
                label="Library"
                active={currentScreen.type === 'library'}
                onClick={navigateToLibrary}
                disabled={!canAccessLibrary}
              />
            </div>
          )}

          {/* System Section - ADMIN only */}
          {user && (isNavVisible(user.role, 'staff') || isNavVisible(user.role, 'settings')) && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                System
              </div>
              {/* Staff nav item removed in v323 — user management in Settings → Users */}
              {isNavVisible(user.role, 'settings') && (
                <NavItem
                  icon={Settings}
                  label="Settings"
                  active={currentScreen.type === 'settings'}
                  onClick={navigateToSettings}
                  disabled={!canAccessSettings}
                />
              )}
            </div>
          )}
        </nav>

        {/* User Menu */}
        {user && session && (
          <div className="p-4 border-t border-slate-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {ROLE_LABELS[user.role]}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-slate-500 font-normal">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Navisol v4 Architecture
          </p>
          <p className="text-xs text-slate-600">
            Project-centric • Library-versioned
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderScreenContent()}
      </main>
    </div>
  );
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, active, disabled, onClick }: NavItemProps) {
  // Explicit color classes for visibility - no opacity tricks
  const baseClasses = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors';

  let stateClasses: string;
  if (active) {
    stateClasses = 'bg-teal-600 text-white';
  } else if (disabled) {
    stateClasses = 'text-slate-400 cursor-not-allowed';
  } else {
    // Inactive but enabled - clearly visible white text
    stateClasses = 'text-white hover:bg-slate-800';
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {disabled && (
        <Badge variant="outline" className="ml-auto text-[10px] border-slate-500 text-slate-400">
          No Access
        </Badge>
      )}
    </button>
  );
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  );
}
