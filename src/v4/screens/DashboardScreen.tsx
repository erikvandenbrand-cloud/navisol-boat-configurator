'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Ship,
  TrendingUp,
  Clock,
  FileText,
  Users,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  DollarSign,
  Activity,
} from 'lucide-react';
import type { Project, ProjectStatus, ProjectQuote, QuoteStatus } from '@/domain/models';
import type { AuditEntry } from '@/domain/models';
import { ProjectRepository, ClientRepository, AuditRepository } from '@/data/repositories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ProjectFilters } from '@/v4/navigation';
import { resolveActivityLink } from '@/v4/navigation';

// ============================================
// TYPES
// ============================================

interface StatusCount {
  status: ProjectStatus;
  count: number;
  label: string;
  color: string;
}

interface RevenuePipeline {
  draft: { count: number; value: number };
  sent: { count: number; value: number };
  accepted: { count: number; value: number };
  total: number;
}

interface DashboardData {
  projectsByStatus: StatusCount[];
  totalProjects: number;
  activeProjects: number;
  revenuePipeline: RevenuePipeline;
  recentActivity: AuditEntry[];
  clientCount: number;
}

// ============================================
// HELPERS
// ============================================

import { PROJECT_STATUS_STYLES } from '@/v4/components/StatusBadge';

// Use centralized status styles for consistency
const STATUS_CONFIG = PROJECT_STATUS_STYLES;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ============================================
// DASHBOARD SCREEN
// ============================================

interface DashboardScreenProps {
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToProjects?: (filters?: ProjectFilters) => void;
}

export function DashboardScreen({ onNavigateToProject, onNavigateToProjects }: DashboardScreenProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      // Load all data in parallel
      const [projects, clients, auditEntries] = await Promise.all([
        ProjectRepository.getAll(),
        ClientRepository.getActive(),
        AuditRepository.getRecent(20),
      ]);

      // Calculate projects by status
      const statusCounts = new Map<ProjectStatus, number>();
      for (const project of projects) {
        if (!project.archivedAt) {
          statusCounts.set(project.status, (statusCounts.get(project.status) || 0) + 1);
        }
      }

      const projectsByStatus: StatusCount[] = Object.entries(STATUS_CONFIG)
        .map(([status, config]) => ({
          status: status as ProjectStatus,
          count: statusCounts.get(status as ProjectStatus) || 0,
          label: config.label,
          color: config.className,
        }))
        .filter(s => s.count > 0 || ['DRAFT', 'ORDER_CONFIRMED', 'IN_PRODUCTION'].includes(s.status));

      // Calculate revenue pipeline from quotes
      const revenuePipeline: RevenuePipeline = {
        draft: { count: 0, value: 0 },
        sent: { count: 0, value: 0 },
        accepted: { count: 0, value: 0 },
        total: 0,
      };

      for (const project of projects) {
        if (project.archivedAt) continue;

        for (const quote of project.quotes) {
          if (quote.status === 'DRAFT') {
            revenuePipeline.draft.count++;
            revenuePipeline.draft.value += quote.totalInclVat;
          } else if (quote.status === 'SENT') {
            revenuePipeline.sent.count++;
            revenuePipeline.sent.value += quote.totalInclVat;
          } else if (quote.status === 'ACCEPTED') {
            revenuePipeline.accepted.count++;
            revenuePipeline.accepted.value += quote.totalInclVat;
          }
        }
      }
      revenuePipeline.total =
        revenuePipeline.draft.value +
        revenuePipeline.sent.value +
        revenuePipeline.accepted.value;

      // Count active projects
      const activeProjects = projects.filter(
        p => !p.archivedAt && !['CLOSED', 'DELIVERED'].includes(p.status)
      ).length;

      setData({
        projectsByStatus,
        totalProjects: projects.filter(p => !p.archivedAt).length,
        activeProjects,
        revenuePipeline,
        recentActivity: auditEntries,
        clientCount: clients.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LayoutDashboard className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const pipelineTotal = data.revenuePipeline.total || 1; // Avoid division by zero

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-teal-600" />
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Overview of your boat manufacturing operations</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          Last updated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Projects</p>
                <p className="text-3xl font-bold text-slate-900">{data.totalProjects}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Ship className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Projects</p>
                <p className="text-3xl font-bold text-slate-900">{data.activeProjects}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pipeline Value</p>
                <p className="text-3xl font-bold text-teal-600">{formatCurrency(data.revenuePipeline.total)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Clients</p>
                <p className="text-3xl font-bold text-slate-900">{data.clientCount}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects by Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Projects by Status</CardTitle>
            <CardDescription>Current project distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.projectsByStatus.map((item) => (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => onNavigateToProjects?.({ status: item.status })}
                  className="w-full flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={item.color}>{item.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{
                          width: `${data.totalProjects > 0 ? (item.count / data.totalProjects) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{item.count}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
              {data.projectsByStatus.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <Ship className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">No projects yet</p>
                  <p className="text-xs text-slate-400">Create your first project to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Pipeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Revenue Pipeline
            </CardTitle>
            <CardDescription>Quote status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Draft Quotes */}
              <button
                type="button"
                onClick={() => onNavigateToProjects?.({ quoteStatus: 'DRAFT' })}
                className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-400 rounded-full" />
                    <span className="text-sm">Draft</span>
                    <Badge variant="outline" className="text-xs">{data.revenuePipeline.draft.count}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(data.revenuePipeline.draft.value)}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <Progress
                  value={pipelineTotal > 0 ? (data.revenuePipeline.draft.value / pipelineTotal) * 100 : 0}
                  className="h-2"
                />
              </button>

              {/* Sent Quotes */}
              <button
                type="button"
                onClick={() => onNavigateToProjects?.({ quoteStatus: 'SENT' })}
                className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm">Sent</span>
                    <Badge variant="outline" className="text-xs">{data.revenuePipeline.sent.count}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(data.revenuePipeline.sent.value)}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <Progress
                  value={pipelineTotal > 0 ? (data.revenuePipeline.sent.value / pipelineTotal) * 100 : 0}
                  className="h-2"
                />
              </button>

              {/* Accepted Quotes */}
              <button
                type="button"
                onClick={() => onNavigateToProjects?.({ quoteStatus: 'ACCEPTED' })}
                className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm">Accepted</span>
                    <Badge variant="outline" className="text-xs">{data.revenuePipeline.accepted.count}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(data.revenuePipeline.accepted.value)}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <Progress
                  value={pipelineTotal > 0 ? (data.revenuePipeline.accepted.value / pipelineTotal) * 100 : 0}
                  className="h-2"
                />
              </button>

              {/* Total */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Pipeline</span>
                  <span className="text-lg font-bold text-teal-600">{formatCurrency(data.revenuePipeline.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions from audit log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.slice(0, 10).map((entry) => {
                  const link = resolveActivityLink(entry.entityType, entry.entityId, entry.metadata);
                  const isClickable = !!link && !!onNavigateToProject;

                  const content = (
                    <>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        entry.action === 'CREATE' ? 'bg-green-100' :
                        entry.action === 'UPDATE' ? 'bg-blue-100' :
                        entry.action === 'ARCHIVE' ? 'bg-red-100' :
                        entry.action === 'STATUS_TRANSITION' ? 'bg-purple-100' :
                        entry.action === 'GENERATE_DOCUMENT' ? 'bg-amber-100' : 'bg-slate-100'
                      }`}>
                        {entry.action === 'CREATE' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {entry.action === 'UPDATE' && <FileText className="h-4 w-4 text-blue-600" />}
                        {entry.action === 'ARCHIVE' && <AlertCircle className="h-4 w-4 text-red-600" />}
                        {entry.action === 'STATUS_TRANSITION' && <Activity className="h-4 w-4 text-purple-600" />}
                        {entry.action === 'GENERATE_DOCUMENT' && <FileText className="h-4 w-4 text-amber-600" />}
                        {!['CREATE', 'UPDATE', 'ARCHIVE', 'STATUS_TRANSITION', 'GENERATE_DOCUMENT'].includes(entry.action) && (
                          <Activity className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 truncate">{entry.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{entry.userName}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(entry.timestamp)}</span>
                        </div>
                      </div>
                      {isClickable && <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                    </>
                  );

                  return isClickable ? (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onNavigateToProject(link.projectId)}
                      className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left"
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-2 rounded-lg"
                    >
                      {content}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">No activity yet</p>
                  <p className="text-xs text-slate-400">Actions will appear here as you work</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
