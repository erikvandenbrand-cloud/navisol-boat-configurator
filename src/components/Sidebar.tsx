'use client';

import {
  Database,
  Ship,
  FileText,
  FileCheck,
  BarChart3,
  Settings,
  Package,
  ClipboardList,
  Receipt,
  Scale,
  LayoutDashboard,
  Users,
  UserCog,
  Shield,
  Camera,
  ListTodo,
  GanttChart,
  Wrench,
  BookOpen,
  ClipboardCheck,
  ShoppingCart,
  Anchor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';
import { ROLE_NAMES } from '@/lib/auth-types';
import type { RolePermissions } from '@/lib/auth-types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: keyof RolePermissions;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navItems: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'viewDashboard' },
    ]
  },
  {
    group: 'Clients',
    items: [
      { id: 'clients', label: 'Client Management', icon: Users, permission: 'viewClients' },
    ]
  },
  {
    group: 'Database',
    items: [
      { id: 'articles', label: 'Parts Database', icon: Database, permission: 'viewArticles' },
    ]
  },
  {
    group: 'Configuration',
    items: [
      { id: 'boat-models', label: 'Boat Models', icon: Anchor, permission: 'viewConfigurations' },
      { id: 'configurator', label: 'Boat Configurator', icon: Ship, permission: 'viewConfigurations' },
      { id: 'configurations', label: 'Saved Configs', icon: Package, permission: 'viewConfigurations' },
    ]
  },
  {
    group: 'Documents',
    items: [
      { id: 'parts-list', label: 'Parts List', icon: ClipboardList, permission: 'viewDocuments' },
      { id: 'equipment-list', label: 'Equipment List', icon: FileText, permission: 'viewDocuments' },
      { id: 'quotation', label: 'Quotation', icon: Receipt, permission: 'viewQuotations' },
      { id: 'comparison', label: 'Cost Comparison', icon: Scale, permission: 'viewDocuments' },
    ]
  },
  {
    group: 'CE & Technical',
    items: [
      { id: 'ce-documents', label: 'CE Documents', icon: FileCheck, permission: 'viewCEDocs' },
      { id: 'technical-file', label: 'Technical File', icon: BarChart3, permission: 'viewCEDocs' },
      { id: 'vessel-photos', label: 'Vessel Photos', icon: Camera, permission: 'viewMedia' },
    ]
  },
  {
    group: 'Project Management',
    items: [
      { id: 'production-orders', label: 'Production Orders', icon: ShoppingCart, permission: 'viewProduction' },
      { id: 'tasks', label: 'Tasks & Time', icon: ListTodo, permission: 'viewTasks' },
      { id: 'production-calendar', label: 'Production Calendar', icon: GanttChart, permission: 'viewProduction' },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench, permission: 'viewTasks' },
      { id: 'procedures', label: 'Operating Procedures', icon: BookOpen, permission: 'viewCEDocs' },
      { id: 'templates', label: 'Checklist Templates', icon: ClipboardCheck, permission: 'createCEDocs' },
    ]
  },
];

export function Sidebar({ activeTab, onTabChange, className }: SidebarProps) {
  const { currentUser, hasPermission } = useAuth();

  // Filter items based on permissions
  const filteredNavItems = navItems.map(group => ({
    ...group,
    items: group.items.filter(item =>
      !item.permission || hasPermission(item.permission)
    )
  })).filter(group => group.items.length > 0);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'manager': return 'bg-purple-600';
      case 'sales': return 'bg-blue-600';
      case 'production': return 'bg-orange-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className={cn("flex flex-col w-64 bg-slate-50 border-r", className)}>
      {/* User Info */}
      {currentUser && (
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 font-semibold text-sm">
                {currentUser.firstName[0]}{currentUser.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <Badge className={`${getRoleBadgeColor(currentUser.role)} text-xs py-0`}>
                {ROLE_NAMES[currentUser.role].en}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 py-4">
        <div className="space-y-6 px-3">
          {filteredNavItems.map((group, idx) => (
            <div key={group.group}>
              <h3 className="mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 font-normal",
                      activeTab === item.id && "bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                    )}
                    onClick={() => onTabChange(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                ))}
              </div>
              {idx < filteredNavItems.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-white space-y-1">
        {hasPermission('viewUsers') && (
          <Button
            variant={activeTab === 'users' ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 font-normal",
              activeTab === 'users' && "bg-purple-100 text-purple-900 hover:bg-purple-100"
            )}
            onClick={() => onTabChange('users')}
          >
            <UserCog className="h-4 w-4" />
            User Management
          </Button>
        )}
        {hasPermission('viewSettings') && (
          <Button
            variant={activeTab === 'settings' ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 font-normal text-slate-600",
              activeTab === 'settings' && "bg-slate-200 text-slate-900"
            )}
            onClick={() => onTabChange('settings')}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        )}
      </div>
    </div>
  );
}
