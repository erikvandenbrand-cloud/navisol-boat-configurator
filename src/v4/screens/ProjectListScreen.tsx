'use client';

import { useState, useEffect } from 'react';
import {
  Ship,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  User,
  MoreVertical,
  FolderOpen,
  X,
} from 'lucide-react';
import type { Project, Client, ProjectStatus, QuoteStatus } from '@/domain/models';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import type { ProjectFilters } from '@/v4/navigation';
import { describeFilters } from '@/v4/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateProjectDialog } from '@/v4/components/CreateProjectDialog';
import { PROJECT_STATUS_STYLES } from '@/v4/components/StatusBadge';

// Use centralized status styles for consistency
const STATUS_CONFIG = Object.fromEntries(
  Object.entries(PROJECT_STATUS_STYLES).map(([key, val]) => [
    key,
    { label: val.label, color: val.className.split(' ')[1] || 'text-slate-600', bgColor: val.className.split(' ')[0] || 'bg-slate-100' }
  ])
) as Record<ProjectStatus, { label: string; color: string; bgColor: string }>;

interface ProjectListScreenProps {
  onSelectProject?: (projectId: string) => void;
  initialFilters?: ProjectFilters;
}

export function ProjectListScreen({ onSelectProject, initialFilters }: ProjectListScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.status || 'all');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<QuoteStatus | undefined>(initialFilters?.quoteStatus);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Update filters when initialFilters change
  useEffect(() => {
    if (initialFilters?.status) {
      setStatusFilter(initialFilters.status);
    } else {
      setStatusFilter('all');
    }
    setQuoteStatusFilter(initialFilters?.quoteStatus);
  }, [initialFilters]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [projectList, clientList] = await Promise.all([
        ProjectRepository.getAll(),
        ClientRepository.getAll(),
      ]);

      setProjects(projectList);

      const clientMap = new Map<string, Client>();
      clientList.forEach((c) => clientMap.set(c.id, c));
      setClients(clientMap);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredProjects = projects
    .filter((p) => !p.archivedAt)
    .filter((p) => {
      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Quote status filter (show projects with at least one quote in this status)
      if (quoteStatusFilter) {
        const hasMatchingQuote = p.quotes.some((q) => q.status === quoteStatusFilter);
        if (!hasMatchingQuote) return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const client = clients.get(p.clientId);
        return (
          p.title.toLowerCase().includes(query) ||
          p.projectNumber.toLowerCase().includes(query) ||
          client?.name.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate active filter description
  const activeFilterDescription = describeFilters({
    status: statusFilter !== 'all' ? statusFilter as ProjectStatus : undefined,
    quoteStatus: quoteStatusFilter,
  });

  const statusCounts = projects.reduce(
    (acc, p) => {
      if (!p.archivedAt) {
        acc[p.status] = (acc[p.status] || 0) + 1;
        acc.total++;
      }
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  async function handleProjectCreated() {
    setShowCreateDialog(false);
    await loadData();
  }

  function handleSelectProject(projectId: string) {
    if (onSelectProject) {
      onSelectProject(projectId);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Ship className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <FolderOpen className="h-7 w-7 text-teal-600" />
            Projects
          </h1>
          <p className="text-slate-600 mt-1">
            Manage boat building projects from quote to delivery
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Total" value={statusCounts.total || 0} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => (
          <StatCard
            key={status}
            label={STATUS_CONFIG[status].label}
            value={statusCounts[status] || 0}
            color={STATUS_CONFIG[status].bgColor}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, project number, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter indicator */}
          {(statusFilter !== 'all' || quoteStatusFilter) && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-slate-500">Filtered by:</span>
              <Badge variant="secondary" className="gap-1">
                {activeFilterDescription}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setQuoteStatusFilter(undefined);
                  }}
                  className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                <FolderOpen className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No matching projects' : 'No projects yet'}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                  : 'Start by creating your first boat building project. You can configure equipment, generate quotes, and track production.'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
              {(searchQuery || statusFilter !== 'all') && (
                <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setQuoteStatusFilter(undefined); }}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const client = clients.get(project.clientId);
            const statusConfig = STATUS_CONFIG[project.status];

            return (
              <Card
                key={project.id}
                className="hover:border-teal-300 transition-colors cursor-pointer"
                onClick={() => handleSelectProject(project.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Project Icon */}
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Ship className="h-6 w-6 text-teal-600" />
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {project.title}
                        </h3>
                        <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {project.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="font-mono">{project.projectNumber}</span>
                        {client && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {client.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(project.configuration.totalInclVat)}
                      </p>
                      <p className="text-xs text-slate-500">incl. VAT</p>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectProject(project.id); }}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Edit Configuration</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Generate Quote</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, color = 'bg-slate-100', active, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-lg text-center transition-all ${
        active ? 'ring-2 ring-teal-500 ring-offset-2' : ''
      } ${color} hover:opacity-80`}
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600 truncate">{label}</p>
    </button>
  );
}
