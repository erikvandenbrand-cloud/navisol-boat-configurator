/**
 * Resource Planner Screen - v4
 * Read-only multi-project resource planner
 * Aggregates planning tasks across ALL projects by resource name
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Users,
  Calendar,
  FolderOpen,
  User2,
  AlertCircle,
  ExternalLink,
  Filter,
} from 'lucide-react';
import type {
  Project,
  PlanningTask,
  PlanningResource,
  PlanningTaskStatus,
  ProjectStatus,
  ProjectType,
} from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================
// TYPES
// ============================================

interface AggregatedTask {
  projectId: string;
  projectTitle: string;
  projectNumber: string;
  task: PlanningTask;
}

interface ResourceRow {
  resourceName: string;
  isUnassigned: boolean;
  weeklyTasks: Map<number, AggregatedTask[]>; // weekIndex -> tasks
  capacityPct?: number; // from PlanningResource.capacityPct (first found)
}

// Filter types
type StatusFilterValue = 'ALL' | 'DRAFT' | 'CLOSED';
type TypeFilterValue = 'ALL' | ProjectType;

const STATUS_FILTER_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CLOSED', label: 'Closed' },
];

const TYPE_FILTER_OPTIONS: { value: TypeFilterValue; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'NEW_BUILD', label: 'New Build' },
  { value: 'REFIT', label: 'Refit' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

// ============================================
// DATE HELPERS
// ============================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return 'No dates';
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  if (startDate && !endDate) return `From ${formatDate(startDate)}`;
  if (!startDate && endDate) return `Until ${formatDate(endDate)}`;
  return `${formatDate(startDate!)} - ${formatDate(endDate!)}`;
}

function getEffectiveEndDate(task: PlanningTask): string | undefined {
  if (task.endDate) return task.endDate;
  if (task.startDate && task.durationDays && task.durationDays > 0) {
    const start = parseDate(task.startDate);
    const end = addDays(start, task.durationDays - 1);
    return formatDateISO(end);
  }
  return undefined;
}

function taskOverlapsWeek(task: PlanningTask, weekStart: Date, weekEnd: Date): boolean {
  if (!task.startDate) return false;
  const effectiveEnd = getEffectiveEndDate(task);
  if (!effectiveEnd) return false;

  const taskStart = parseDate(task.startDate);
  const taskEnd = parseDate(effectiveEnd);

  // Task overlaps week if task starts before week ends AND task ends after week starts
  return taskStart <= weekEnd && taskEnd >= weekStart;
}

// ============================================
// STATUS DISPLAY
// ============================================

const TASK_STATUS_COLORS: Record<PlanningTaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
};

const TASK_STATUS_LABELS: Record<PlanningTaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

function getStatusBadge(status?: PlanningTaskStatus) {
  if (!status) return <Badge variant="outline">-</Badge>;
  return <Badge className={`${TASK_STATUS_COLORS[status]} border-0`}>{TASK_STATUS_LABELS[status]}</Badge>;
}

// ============================================
// RESOURCE PLANNER SCREEN
// ============================================

export function ResourcePlannerScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewOffset, setViewOffset] = useState(0); // Weeks offset from current week
  const [selectedCell, setSelectedCell] = useState<{
    resourceName: string;
    weekIndex: number;
    tasks: AggregatedTask[];
  } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('ALL');

  // Navigate to project's Planning tab
  const navigateToProjectPlanning = useCallback((projectId: string) => {
    // Close the dialog first
    setSelectedCell(null);
    // Navigate using hash routing with tab parameter
    window.location.hash = `/projects/${projectId}?tab=planning`;
  }, []);

  // Load all projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await ProjectRepository.getAll();
      // Filter to non-archived projects
      const active = all.filter((p) => !p.archivedAt);
      setProjects(active);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Apply filters to projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'ALL' && p.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [projects, statusFilter, typeFilter]);

  // Calculate 4-week window
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weeks = useMemo(() => {
    const currentWeekStart = startOfWeek(today);
    const baseStart = addDays(currentWeekStart, viewOffset * 7);

    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = addDays(baseStart, i * 7);
      const weekEnd = addDays(weekStart, 6);
      return {
        index: i,
        start: weekStart,
        end: weekEnd,
        label: `W${i + 1}`,
        dateRange: `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        isCurrentWeek: formatDateISO(weekStart) === formatDateISO(startOfWeek(today)),
      };
    });
  }, [today, viewOffset]);

  // Aggregate tasks by resource name across filtered projects
  const resourceRows = useMemo(() => {
    const resourceMap = new Map<string, ResourceRow>();

    // Initialize unassigned row
    const unassignedRow: ResourceRow = {
      resourceName: 'Unassigned',
      isUnassigned: true,
      weeklyTasks: new Map(),
      // No capacityPct for unassigned
    };

    for (const project of filteredProjects) {
      const tasks = project.planning?.tasks || [];
      const resources = project.planning?.resources || [];

      // Build resource id -> name map for this project
      const resourceIdToName = new Map<string, string>();
      // Also track capacityPct per resource name
      const resourceNameToCapacity = new Map<string, number | undefined>();
      for (const resource of resources) {
        resourceIdToName.set(resource.id, resource.name);
        // Track capacityPct if available
        if (resource.capacityPct !== undefined) {
          resourceNameToCapacity.set(resource.name, resource.capacityPct);
        }
      }

      for (const task of tasks) {
        // Skip tasks without valid dates
        if (!task.startDate || !getEffectiveEndDate(task)) continue;

        const aggregatedTask: AggregatedTask = {
          projectId: project.id,
          projectTitle: project.title,
          projectNumber: project.projectNumber,
          task,
        };

        // Get first assignee's name (consistent with project gantt)
        const firstAssigneeId = task.assigneeResourceIds?.[0];
        const resourceName = firstAssigneeId ? resourceIdToName.get(firstAssigneeId) : undefined;

        // Determine which weeks this task overlaps
        for (const week of weeks) {
          if (taskOverlapsWeek(task, week.start, week.end)) {
            if (resourceName) {
              // Get or create resource row
              if (!resourceMap.has(resourceName)) {
                resourceMap.set(resourceName, {
                  resourceName,
                  isUnassigned: false,
                  weeklyTasks: new Map(),
                  capacityPct: resourceNameToCapacity.get(resourceName),
                });
              }
              const row = resourceMap.get(resourceName)!;
              // Update capacityPct if not yet set and available
              if (row.capacityPct === undefined && resourceNameToCapacity.has(resourceName)) {
                row.capacityPct = resourceNameToCapacity.get(resourceName);
              }
              if (!row.weeklyTasks.has(week.index)) {
                row.weeklyTasks.set(week.index, []);
              }
              row.weeklyTasks.get(week.index)!.push(aggregatedTask);
            } else {
              // Unassigned
              if (!unassignedRow.weeklyTasks.has(week.index)) {
                unassignedRow.weeklyTasks.set(week.index, []);
              }
              unassignedRow.weeklyTasks.get(week.index)!.push(aggregatedTask);
            }
          }
        }
      }
    }

    // Convert map to sorted array
    const rows = Array.from(resourceMap.values()).sort((a, b) =>
      a.resourceName.localeCompare(b.resourceName)
    );

    // Add unassigned at the end if it has any tasks
    const hasUnassignedTasks = Array.from(unassignedRow.weeklyTasks.values()).some(
      (tasks) => tasks.length > 0
    );
    if (hasUnassignedTasks) {
      rows.push(unassignedRow);
    }

    return rows;
  }, [filteredProjects, weeks]);

  // Check if any planning data exists in filtered projects
  const hasPlanningData = useMemo(() => {
    return filteredProjects.some(
      (p) => (p.planning?.tasks?.length || 0) > 0 || (p.planning?.resources?.length || 0) > 0
    );
  }, [filteredProjects]);

  // Filter summary text
  const filterSummary = useMemo(() => {
    const statusLabel = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label || 'All';
    const typeLabel = TYPE_FILTER_OPTIONS.find((o) => o.value === typeFilter)?.label || 'All';
    return `${statusLabel} / ${typeLabel}`;
  }, [statusFilter, typeFilter]);

  // Navigation
  const navigateView = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setViewOffset(0);
    } else if (direction === 'prev') {
      setViewOffset((prev) => prev - 1);
    } else {
      setViewOffset((prev) => prev + 1);
    }
  };

  // Handle cell click
  const handleCellClick = (resourceName: string, weekIndex: number, tasks: AggregatedTask[]) => {
    if (tasks.length > 0) {
      setSelectedCell({ resourceName, weekIndex, tasks });
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading resource planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-teal-600" />
            Resource Planner
          </h1>
          <p className="text-slate-600 mt-1">
            Aggregate view of resource allocation across all projects
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateView('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateView('today')}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateView('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filters:</span>
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilterValue)}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter summary */}
        <span className="text-sm text-slate-500">
          Showing: {filterSummary} ({filteredProjects.length} of {projects.length} projects)
        </span>
      </div>

      {/* Banner */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
        <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-amber-800">
          Overview only — no automatic scheduling
        </span>
      </div>

      {/* Empty State */}
      {!hasPlanningData ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Planning Data
              </h3>
              <p className="text-slate-600 max-w-md">
                No projects have planning tasks or resources defined yet.
                Add planning data to individual projects to see aggregated resource allocation here.
              </p>
              <div className="mt-6 p-4 bg-slate-50 rounded-lg text-left max-w-md">
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  How to add planning data:
                </h4>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Open a project</li>
                  <li>Navigate to the Planning tab</li>
                  <li>Add resources (people/equipment)</li>
                  <li>Create tasks with dates and assign resources</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : resourceRows.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Tasks in This Period
              </h3>
              <p className="text-slate-600 max-w-md">
                No planning tasks overlap with the current 4-week window.
                Use the navigation buttons to view other time periods.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Resource Table */
        <Card data-testid="resource-planner-table">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              Resource Load ({resourceRows.length} {resourceRows.length === 1 ? 'resource' : 'resources'})
            </CardTitle>
            <CardDescription>
              Task counts per resource per week. Click on a cell to see task details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Resource</TableHead>
                  {weeks.map((week) => (
                    <TableHead
                      key={week.index}
                      className={`text-center ${week.isCurrentWeek ? 'bg-teal-50' : ''}`}
                    >
                      <div className="font-medium">{week.label}</div>
                      <div className="text-xs font-normal text-slate-500">{week.dateRange}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourceRows.map((row) => (
                  <TableRow key={row.resourceName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.isUnassigned ? (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <User2 className="h-4 w-4 text-slate-500" />
                        )}
                        <span
                          className={`font-medium ${row.isUnassigned ? 'text-amber-700' : ''}`}
                        >
                          {row.resourceName}
                        </span>
                        {row.capacityPct !== undefined && (
                          <span
                            className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                            title="Resource capacity (from project planning)"
                          >
                            Capacity: <span className="font-semibold">{row.capacityPct}%</span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {weeks.map((week) => {
                      const tasks = row.weeklyTasks.get(week.index) || [];
                      const taskCount = tasks.length;

                      // Only show "Load: X" for resources with capacityPct set
                      if (row.capacityPct !== undefined) {
                        return (
                          <TableCell
                            key={week.index}
                            className={`text-center ${week.isCurrentWeek ? 'bg-teal-50/50' : ''}`}
                          >
                            {taskCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleCellClick(row.resourceName, week.index, tasks)}
                                className="inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-md bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors cursor-pointer text-sm font-medium"
                                data-testid={`cell-${row.resourceName}-w${week.index + 1}`}
                              >
                                <span>
                                  Load: <span className="font-semibold">{taskCount}</span>
                                </span>
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                        );
                      } else {
                        // For unassigned or resources without capacityPct, show just task count
                        return (
                          <TableCell
                            key={week.index}
                            className={`text-center ${week.isCurrentWeek ? 'bg-teal-50/50' : ''}`}
                          >
                            {taskCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleCellClick(row.resourceName, week.index, tasks)}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors cursor-pointer text-sm font-medium"
                                data-testid={`cell-${row.resourceName}-w${week.index + 1}`}
                              >
                                {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                        );
                      }
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Task Details Dialog */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User2 className="h-5 w-5 text-teal-600" />
              {selectedCell?.resourceName}
            </DialogTitle>
            <DialogDescription>
              {selectedCell && weeks[selectedCell.weekIndex]?.dateRange} —{' '}
              {selectedCell?.tasks.length} {selectedCell?.tasks.length === 1 ? 'task' : 'tasks'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-3">
              {selectedCell?.tasks.map((item, index) => (
                <div
                  key={`${item.projectId}-${item.task.id}-${index}`}
                  className="p-3 border rounded-lg bg-slate-50"
                >
                  {/* Project info - clickable to navigate to Planning tab */}
                  <button
                    type="button"
                    onClick={() => navigateToProjectPlanning(item.projectId)}
                    className="flex items-center gap-2 mb-2 group hover:bg-slate-100 -mx-1 px-1 py-0.5 rounded transition-colors cursor-pointer"
                    title="Open project Planning tab"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-slate-500 group-hover:text-teal-600" />
                    <span className="text-xs text-slate-600 font-medium group-hover:text-teal-700">
                      {item.projectNumber}
                    </span>
                    <span className="text-xs text-slate-500 group-hover:text-teal-600">
                      {item.projectTitle}
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* Task info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">
                        {item.task.title}
                      </h4>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {formatDateRange(item.task.startDate, getEffectiveEndDate(item.task))}
                      </p>
                    </div>
                    {getStatusBadge(item.task.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
