'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  Ship,
  Database,
  ClipboardList,
  BookOpen,
  FolderKanban,
  Wrench,
  Settings,
  Calendar,
  GanttChart,
  ListTodo,
  Clock,
  Receipt,
  FileText,
  TrendingUp,
  Files,
  FileCheck,
  Camera,
  ClipboardCheck,
  UserCog,
  ChevronDown,
  ChevronRight,
  Anchor,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStoreV2 } from '@/lib/store-v2';
import { useAuth } from '@/lib/auth-store';
import { NAVIGATION_STRUCTURE, type PermissionKey } from '@/lib/types-v2';

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  Ship,
  Database,
  ClipboardList,
  BookOpen,
  FolderKanban,
  Wrench,
  Settings,
  Calendar,
  GanttChart,
  ListTodo,
  Clock,
  Receipt,
  FileText,
  TrendingUp,
  Files,
  FileCheck,
  Camera,
  ClipboardCheck,
  UserCog,
};

interface SidebarV2Props {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function SidebarV2({ currentView, onNavigate }: SidebarV2Props) {
  // Use v1.0 auth for permissions, v2.0 for settings
  const { hasPermission: hasAuthPermission, currentUser } = useAuth();
  const { settings } = useStoreV2();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    dashboard: true,
    projects: true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isActive = (itemId: string) => currentView === itemId;

  const canView = (permission?: PermissionKey) => {
    // For now, show all items - component-level permission checks still apply
    if (!permission) return true;
    // Try to use v1 auth permission check
    try {
      return hasAuthPermission(permission as never) ?? true;
    } catch {
      return true;
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full">
      {/* Logo Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{settings.company.name}</h1>
            <p className="text-xs text-slate-400">{settings.company.tagline || 'Manufacturing System'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAVIGATION_STRUCTURE.map(group => {
          // Filter items based on permissions
          const visibleItems = group.items.filter(item => canView(item.permission));
          if (visibleItems.length === 0) return null;

          const isExpanded = expandedGroups[group.id] ?? false;
          const GroupIcon = ICONS[group.icon] || Package;

          return (
            <div key={group.id} className="mb-1">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="w-4 h-4" />
                  {group.label}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map(item => {
                    const ItemIcon = ICONS[item.icon] || FileText;
                    const active = isActive(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all',
                          active
                            ? 'bg-emerald-600/20 text-emerald-400 border-r-2 border-emerald-500'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        <ItemIcon className={cn('w-4 h-4', active ? 'text-emerald-400' : 'text-slate-400')} />
                        <span>{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="ml-auto px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      {currentUser && (
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-slate-400 capitalize">{currentUser.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Version */}
      <div className="px-4 py-2 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>v2.0</span>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-500" />
            <span className="text-emerald-500">Electric</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default SidebarV2;
