'use client';

import React, { useState } from 'react';
import {
  Ship,
  FolderKanban,
  Users,
  FileText,
  TrendingUp,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Euro,
  Anchor,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ListTodo,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStoreV2 } from '@/lib/store-v2';
import { PROJECT_STATUS_INFO, type ProjectType } from '@/lib/types-v2';
import { NewBuildWizard } from './NewBuildWizard';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DashboardV2() {
  const { projects, clients, models, vessels, quotations, tasks, settings } = useStoreV2();
  const [showNewBuildWizard, setShowNewBuildWizard] = useState(false);

  // Calculate statistics
  const activeProjects = projects.filter(p =>
    !['CLOSED', 'DELIVERED', 'COMPLETE'].includes(p.status)
  );
  const newBuilds = projects.filter(p => p.project_type === 'NEW_BUILD');
  const refits = projects.filter(p => p.project_type === 'REFIT');
  const maintenance = projects.filter(p => p.project_type === 'MAINTENANCE');

  const activeNewBuilds = newBuilds.filter(p => !['CLOSED', 'DELIVERED'].includes(p.status));
  const activeRefits = refits.filter(p => !['CLOSED', 'COMPLETE'].includes(p.status));
  const activeMaintenance = maintenance.filter(p => !['CLOSED', 'COMPLETE'].includes(p.status));

  const pendingQuotations = quotations.filter(q => q.status === 'SENT');
  const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED');

  const openTasks = tasks.filter(t => t.status === 'TODO' || t.status === 'DOING');
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED');

  const activeClients = clients.filter(c => c.status === 'active');
  const activeModels = models.filter(m => m.is_active);

  // Calculate pipeline value
  const pipelineValue = pendingQuotations.reduce((sum, q) => sum + q.total_excl_vat, 0);
  const wonValue = acceptedQuotations.reduce((sum, q) => sum + q.total_excl_vat, 0);

  // Project type colors
  const projectTypeColors: Record<ProjectType, { bg: string; text: string; icon: React.ElementType }> = {
    NEW_BUILD: { bg: 'bg-blue-500', text: 'text-blue-500', icon: Ship },
    REFIT: { bg: 'bg-orange-500', text: 'text-orange-500', icon: Wrench },
    MAINTENANCE: { bg: 'bg-purple-500', text: 'text-purple-500', icon: Clock },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Welcome to {settings.company.name} Manufacturing System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="w-3 h-3 text-emerald-500" />
            Electric First
          </Badge>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Active Projects</p>
                <p className="text-3xl font-bold mt-1">{activeProjects.length}</p>
                <p className="text-blue-100 text-xs mt-2">
                  {activeNewBuilds.length} builds • {activeRefits.length} refits • {activeMaintenance.length} service
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FolderKanban className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Pipeline Value</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(pipelineValue)}</p>
                <p className="text-emerald-100 text-xs mt-2">
                  {pendingQuotations.length} pending quotes
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Euro className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Open Tasks</p>
                <p className="text-3xl font-bold mt-1">{openTasks.length}</p>
                <p className="text-orange-100 text-xs mt-2">
                  {blockedTasks.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {blockedTasks.length} blocked
                    </span>
                  ) : (
                    'All tasks on track'
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ListTodo className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm font-medium">Active Clients</p>
                <p className="text-3xl font-bold mt-1">{activeClients.length}</p>
                <p className="text-slate-300 text-xs mt-2">
                  {vessels.length} vessels in fleet
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['NEW_BUILD', 'REFIT', 'MAINTENANCE'] as ProjectType[]).map(type => {
          const typeProjects = projects.filter(p => p.project_type === type);
          const activeCount = typeProjects.filter(p =>
            !['CLOSED', 'DELIVERED', 'COMPLETE'].includes(p.status)
          ).length;
          const config = projectTypeColors[type];
          const Icon = config.icon;

          return (
            <Card key={type} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {type === 'NEW_BUILD' ? 'New Builds' : type === 'REFIT' ? 'Refits' : 'Maintenance'}
                    </CardTitle>
                    <CardDescription>{typeProjects.length} total projects</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{activeCount}</div>
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {typeProjects
                    .filter(p => !['CLOSED', 'DELIVERED', 'COMPLETE'].includes(p.status))
                    .slice(0, 3)
                    .map(project => {
                      const statusInfo = PROJECT_STATUS_INFO[project.status];
                      return (
                        <div
                          key={project.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-600 truncate max-w-[150px]">
                            {project.project_number}
                          </span>
                          <Badge variant="outline" className={`${statusInfo?.color} text-xs`}>
                            {statusInfo?.label || project.status}
                          </Badge>
                        </div>
                      );
                    })}
                  {activeCount === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">
                      No active {type.toLowerCase().replace('_', ' ')}s
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Model Lineup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Anchor className="w-5 h-5 text-emerald-600" />
                Eagle Boats Product Line
              </CardTitle>
              <CardDescription>
                {activeModels.length} active models available for new builds
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {activeModels.slice(0, 10).map(model => (
              <div
                key={model.id}
                className="group relative rounded-lg overflow-hidden border hover:shadow-md transition-all"
              >
                {model.image_url ? (
                  <div
                    className="h-24 bg-cover bg-center"
                    style={{ backgroundImage: `url(${model.image_url})` }}
                  />
                ) : (
                  <div className="h-24 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Ship className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div className="p-2 bg-white">
                  <p className="font-medium text-sm truncate">{model.name}</p>
                  <p className="text-xs text-slate-500">{model.length_m}m</p>
                </div>
                {model.tagline?.includes('HISWA') && (
                  <div className="absolute top-1 right-1">
                    <Badge className="bg-amber-500 text-xs px-1">Award</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowNewBuildWizard(true)}
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Ship className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">New Build</p>
                <p className="text-xs text-slate-500">Start a project</p>
              </div>
            </button>

            <button
              type="button"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-sm">New Refit</p>
                <p className="text-xs text-slate-500">Service request</p>
              </div>
            </button>

            <button
              type="button"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Create Quote</p>
                <p className="text-xs text-slate-500">New quotation</p>
              </div>
            </button>

            <button
              type="button"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Add Client</p>
                <p className="text-xs text-slate-500">New customer</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-slate-600">Boat Models</span>
              <span className="font-medium">{activeModels.length} active</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-slate-600">Total Projects</span>
              <span className="font-medium">{projects.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-slate-600">Registered Vessels</span>
              <span className="font-medium">{vessels.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-slate-600">Total Clients</span>
              <span className="font-medium">{clients.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Won This Year</span>
              <span className="font-medium text-emerald-600">{formatCurrency(wonValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Build Wizard */}
      <NewBuildWizard
        isOpen={showNewBuildWizard}
        onClose={() => setShowNewBuildWizard(false)}
        onComplete={(projectId) => {
          setShowNewBuildWizard(false);
          // Could navigate to projects or show success message
        }}
      />
    </div>
  );
}

export default DashboardV2;
