'use client';

import React, { useState, useMemo } from 'react';
import {
  Ship, Plus, Search, Filter, MoreHorizontal, Eye, Trash2,
  Calendar, Euro, User, Clock, ChevronRight, FolderKanban,
  Wrench, Settings
} from 'lucide-react';
import { useStoreV3 } from '@/lib/store-v3';
import { PROJECT_STATUS_CONFIG, type ProjectStatus, type ProjectType } from '@/lib/types-v3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectWizard } from './ProjectWizard';
import { ProjectDetail } from './ProjectDetail';

interface ProjectsListProps {
  filterType?: ProjectType;
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

// Format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function ProjectsList({ filterType }: ProjectsListProps) {
  const { projects, clients, models, deleteProject, getClient, getModel } = useStoreV3();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'ALL'>('ALL');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filter by type if specified
    if (filterType) {
      result = result.filter(p => p.projectType === filterType);
    } else if (typeFilter !== 'ALL') {
      result = result.filter(p => p.projectType === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => {
        const client = getClient(p.clientId);
        const model = p.modelId ? getModel(p.modelId) : null;
        return (
          p.projectNumber.toLowerCase().includes(query) ||
          p.title.toLowerCase().includes(query) ||
          client?.name.toLowerCase().includes(query) ||
          model?.name.toLowerCase().includes(query) ||
          p.boatIdentity.hullId?.toLowerCase().includes(query) ||
          p.boatIdentity.boatName?.toLowerCase().includes(query)
        );
      });
    }

    // Sort by created date (newest first)
    return result.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [projects, filterType, typeFilter, statusFilter, searchQuery, getClient, getModel]);

  // Status statistics
  const statusStats = useMemo(() => {
    const relevantProjects = filterType
      ? projects.filter(p => p.projectType === filterType)
      : projects;

    const stats: Record<string, number> = { total: relevantProjects.length };
    for (const status of Object.keys(PROJECT_STATUS_CONFIG)) {
      stats[status] = relevantProjects.filter(p => p.status === status).length;
    }
    return stats;
  }, [projects, filterType]);

  // Handle project creation complete
  const handleProjectCreated = (projectId: string) => {
    setIsWizardOpen(false);
    setSelectedProjectId(projectId);
  };

  // Handle delete
  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(projectId);
    }
  };

  // Get title based on filter
  const getTitle = () => {
    switch (filterType) {
      case 'NEW_BUILD':
        return 'New Build Projects';
      case 'REFIT':
        return 'Refit Projects';
      case 'MAINTENANCE':
        return 'Maintenance Projects';
      default:
        return 'All Projects';
    }
  };

  // Get project type icon
  const getProjectTypeIcon = (type: ProjectType) => {
    switch (type) {
      case 'NEW_BUILD':
        return <Ship className="w-4 h-4 text-emerald-600" />;
      case 'REFIT':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'MAINTENANCE':
        return <Settings className="w-4 h-4 text-orange-600" />;
    }
  };

  // Show project detail if selected
  if (selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-emerald-600" />
            {getTitle()}
          </h1>
          <p className="text-slate-600 mt-1">
            Manage and track your boat projects
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setIsWizardOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-lg border text-center transition-all ${
            statusFilter === 'ALL'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <p className="text-2xl font-bold text-slate-900">{statusStats.total}</p>
          <p className="text-xs text-slate-500">All</p>
        </button>
        {(['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'] as ProjectStatus[]).map(status => {
          const config = PROJECT_STATUS_CONFIG[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`p-3 rounded-lg border text-center transition-all ${
                statusFilter === status
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <p className={`text-2xl font-bold ${config.color}`}>
                {statusStats[status] || 0}
              </p>
              <p className="text-xs text-slate-500">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by project number, title, client, or boat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {!filterType && (
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ProjectType | 'ALL')}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Project Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="NEW_BUILD">New Build</SelectItem>
                  <SelectItem value="REFIT">Refit</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Projects ({filteredProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Ship className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No projects found</p>
              <Button
                className="mt-4"
                onClick={() => setIsWizardOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Model / Vessel</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => {
                  const client = getClient(project.clientId);
                  const model = project.modelId ? getModel(project.modelId) : null;
                  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

                  return (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.title}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {project.projectNumber}
                            {project.boatIdentity.hullId && (
                              <span className="ml-2">HIN: {project.boatIdentity.hullId}</span>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getProjectTypeIcon(project.projectType)}
                          <span className="text-sm">
                            {project.projectType === 'NEW_BUILD' ? 'New Build' :
                             project.projectType === 'REFIT' ? 'Refit' : 'Maintenance'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{client.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {model ? (
                          <div className="flex items-center gap-2">
                            <Ship className="w-4 h-4 text-slate-400" />
                            <span>{model.name}</span>
                          </div>
                        ) : project.boatIdentity.boatName ? (
                          <span>{project.boatIdentity.boatName}</span>
                        ) : (
                          <span className="text-slate-400">Custom</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono">
                          {formatCurrency(project.equipment.totalInclVat)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(project.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedProjectId(project.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(project.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Project Wizard */}
      <ProjectWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleProjectCreated}
        defaultProjectType={filterType}
      />
    </div>
  );
}

export default ProjectsList;
