'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ship, Users, FolderOpen, Settings, Database, User, LayoutDashboard, LogOut, Shield, ChevronDown, Lock, Clock, Hash, CalendarDays, LayoutGrid, Clipboard, ChevronRight, History, Folder } from 'lucide-react';
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
import { StaffScreen } from './StaffScreen';
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

type Screen =
  | { type: 'dashboard' }
  | { type: 'projects'; filters?: ProjectFilters }
  | { type: 'project-detail'; projectId: string; initialTab?: string }
  | { type: 'clients' }
  | { type: 'library' }
  | { type: 'settings' }
  | { type: 'timesheets' }
  | { type: 'win-register' }
  | { type: 'resource-planner' }
  | { type: 'project-planner' }
  | { type: 'shopfloor-board' }
  | { type: 'staff' };

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
      const tabParam = queryPart ? new URLSearchParams(queryPart).get('tab') : null;
      return { type: 'project-detail', projectId, initialTab: tabParam || undefined };
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

  if (path === '/staff') {
    return { type: 'staff' };
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
    </AuthProvider>
  );
}

/**
 * No Access Screen - shown when user lacks permission for a screen
 */
function NoAccessScreen({ screenName }: { screenName: string }) {
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
        <Badge variant="outline" className="text-slate-500">
          Your current role doesn't include access to this area
        </Badge>
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

  function navigateToStaff() {
    updateHash('/staff');
    setCurrentScreen({ type: 'staff' });
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

  // Permission checks for screens
  const canAccessProjects = can('project:read');
  const canAccessClients = can('client:read');
  const canAccessLibrary = can('library:read');
  const canAccessSettings = can('settings:read');
  const canAccessTimesheets = can('timesheet:read');

  // Render appropriate screen content
  function renderScreenContent() {
    switch (currentScreen.type) {
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigateToProject={navigateToProject}
            onNavigateToProjects={navigateToProjects}
          />
        );

      case 'projects':
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Projects" />;
        }
        return (
          <ProjectListScreen
            onSelectProject={navigateToProject}
            initialFilters={currentScreen.filters}
          />
        );

      case 'project-detail':
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Projects" />;
        }
        return (
          <ProjectDetailScreen
            projectId={currentScreen.projectId}
            onBack={navigateToProjects}
            initialTab={currentScreen.initialTab}
          />
        );

      case 'clients':
        if (!canAccessClients) {
          return <NoAccessScreen screenName="Clients" />;
        }
        return <ClientListScreen />;

      case 'library':
        if (!canAccessLibrary) {
          return <NoAccessScreen screenName="Library" />;
        }
        return <LibraryScreen />;

      case 'settings':
        if (!canAccessSettings) {
          return <NoAccessScreen screenName="Settings" />;
        }
        return <SettingsScreen />;

      case 'timesheets':
        if (!canAccessTimesheets) {
          return <NoAccessScreen screenName="Timesheets" />;
        }
        return <TimesheetsScreen />;

      case 'win-register':
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="WIN Register" />;
        }
        return <WINRegisterScreen onNavigateToProject={navigateToProject} />;

      case 'resource-planner':
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Resource Planner" />;
        }
        return <ResourcePlannerScreen />;

      case 'project-planner':
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Project Planner" />;
        }
        return <ProjectPlannerScreen onNavigateToProject={navigateToProject} />;

      case 'shopfloor-board':
        if (!canAccessProjects) {
          return <NoAccessScreen screenName="Shopfloor Board" />;
        }
        return <ShopfloorBoardScreen onNavigateToProject={navigateToProject} />;

      case 'staff':
        if (!canAccessSettings) {
          return <NoAccessScreen screenName="Staff" />;
        }
        return <StaffScreen />;

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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            <NavItem
              icon={LayoutDashboard}
              label="Dashboard"
              active={currentScreen.type === 'dashboard'}
              onClick={navigateToDashboard}
            />
          </div>

          {/* Projects Section */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
              Projects
            </div>
            <NavItem
              icon={FolderOpen}
              label="All Projects"
              active={currentScreen.type === 'projects' || currentScreen.type === 'project-detail'}
              onClick={() => navigateToProjects()}
              disabled={!canAccessProjects}
            />
            <NavItem
              icon={Users}
              label="Clients"
              active={currentScreen.type === 'clients'}
              onClick={navigateToClients}
              disabled={!canAccessClients}
            />
            <NavItem
              icon={Hash}
              label="WIN Register"
              active={currentScreen.type === 'win-register'}
              onClick={navigateToWINRegister}
              disabled={!canAccessProjects}
            />
            <NavItem
              icon={Clock}
              label="Timesheets"
              active={currentScreen.type === 'timesheets'}
              onClick={navigateToTimesheets}
              disabled={!canAccessTimesheets}
            />

            {/* Recent Projects Shortcut */}
            {recentProjects.length > 0 && canAccessProjects && (
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

          {/* Portfolio Section */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
              Portfolio
            </div>
            <NavItem
              icon={Clipboard}
              label="Shopfloor Board"
              active={currentScreen.type === 'shopfloor-board'}
              onClick={navigateToShopfloorBoard}
              disabled={!canAccessProjects}
            />
            <NavItem
              icon={CalendarDays}
              label="Resource Planner"
              active={currentScreen.type === 'resource-planner'}
              onClick={navigateToResourcePlanner}
              disabled={!canAccessProjects}
            />
            <NavItem
              icon={LayoutGrid}
              label="Project Planner"
              active={currentScreen.type === 'project-planner'}
              onClick={navigateToProjectPlanner}
              disabled={!canAccessProjects}
            />
          </div>

          {/* Library Section */}
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

          {/* Settings Section */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
              System
            </div>
            <NavItem
              icon={Users}
              label="Staff"
              active={currentScreen.type === 'staff'}
              onClick={navigateToStaff}
              disabled={!canAccessSettings}
            />
            <NavItem
              icon={Settings}
              label="Settings"
              active={currentScreen.type === 'settings'}
              onClick={navigateToSettings}
              disabled={!canAccessSettings}
            />
          </div>
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
