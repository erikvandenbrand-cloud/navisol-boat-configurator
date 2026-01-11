/**
 * Project Planner Screen - v4
 * Read-only portfolio-level Gantt view
 * Shows all projects with their planning tasks on a 4-week timeline
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  FolderOpen,
  Calendar,
  ExternalLink,
  Filter,
  LayoutGrid,
} from 'lucide-react';
import type {
  Project,
  PlanningTask,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================
// TYPES
// ============================================

interface ProjectRow {
  project: Project;
  tasks: PlanningTask[];
  projectSpan: { startDate: string; endDate: string } | null; // min start to max end
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

function getEffectiveEndDate(task: PlanningTask): string | undefined {
  if (task.endDate) return task.endDate;
  if (task.startDate && task.durationDays && task.durationDays > 0) {
    const start = parseDate(task.startDate);
    const end = addDays(start, task.durationDays - 1);
    return formatDateISO(end);
  }
  return undefined;
}

// ============================================
// TASK STATUS COLORS
// ============================================

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-300',
  IN_PROGRESS: 'bg-blue-400',
  DONE: 'bg-green-400',
};

// ============================================
// PROJECT PLANNER SCREEN
// ============================================

interface ProjectPlannerScreenProps {
  onNavigateToProject?: (projectId: string, tab?: string) => void;
}

export function ProjectPlannerScreen({ onNavigateToProject }: ProjectPlannerScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewOffset, setViewOffset] = useState(0); // Weeks offset from current week

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('ALL');

  // Navigate to project's Planning tab
  const navigateToProjectPlanning = useCallback((projectId: string) => {
    if (onNavigateToProject) {
      onNavigateToProject(projectId, 'planning');
    } else {
      // Fallback to hash navigation
      window.location.hash = `/projects/${projectId}?tab=planning`;
    }
  }, [onNavigateToProject]);

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

  // Calculate 4-week window (28 days)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const windowStart = useMemo(() => {
    const currentWeekStart = startOfWeek(today);
    return addDays(currentWeekStart, viewOffset * 7);
  }, [today, viewOffset]);

  const windowEnd = useMemo(() => {
    return addDays(windowStart, 27); // 4 weeks = 28 days (0-27)
  }, [windowStart]);

  const weeks = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = addDays(windowStart, i * 7);
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
  }, [windowStart, today]);

  // Build project rows with tasks that have valid dates
  const projectRows = useMemo(() => {
    const rows: ProjectRow[] = [];

    for (const project of filteredProjects) {
      const allTasks = project.planning?.tasks || [];

      // Filter to tasks with valid dates
      const tasksWithDates = allTasks.filter((task) => {
        if (!task.startDate) return false;
        const effectiveEnd = getEffectiveEndDate(task);
        if (!effectiveEnd) return false;
        return true;
      });

      // Calculate project span (min start, max end)
      let projectSpan: { startDate: string; endDate: string } | null = null;
      if (tasksWithDates.length > 0) {
        let minStart = tasksWithDates[0].startDate!;
        let maxEnd = getEffectiveEndDate(tasksWithDates[0])!;

        for (const task of tasksWithDates) {
          if (task.startDate! < minStart) {
            minStart = task.startDate!;
          }
          const taskEnd = getEffectiveEndDate(task)!;
          if (taskEnd > maxEnd) {
            maxEnd = taskEnd;
          }
        }
        projectSpan = { startDate: minStart, endDate: maxEnd };
      }

      rows.push({
        project,
        tasks: tasksWithDates,
        projectSpan,
      });
    }

    // Sort by project number
    rows.sort((a, b) => a.project.projectNumber.localeCompare(b.project.projectNumber));

    return rows;
  }, [filteredProjects]);

  // Filter to rows that have at least one task overlapping the current window
  const visibleRows = useMemo(() => {
    return projectRows.filter((row) => {
      if (!row.projectSpan) return false;

      const spanStart = parseDate(row.projectSpan.startDate);
      const spanEnd = parseDate(row.projectSpan.endDate);

      // Project overlaps window if it starts before window ends AND ends after window starts
      return spanStart <= windowEnd && spanEnd >= windowStart;
    });
  }, [projectRows, windowStart, windowEnd]);

  // Check if any planning data exists
  const hasPlanningData = useMemo(() => {
    return filteredProjects.some(
      (p) => (p.planning?.tasks?.length || 0) > 0
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

  // Calculate bar position and width for a task within the 28-day window
  const calculateBarStyle = (startDate: string, endDate: string) => {
    const taskStart = parseDate(startDate);
    const taskEnd = parseDate(endDate);

    // Clamp to window bounds
    const visibleStart = taskStart < windowStart ? windowStart : taskStart;
    const visibleEnd = taskEnd > windowEnd ? windowEnd : taskEnd;

    // Calculate position as percentage of 28 days
    const startOffset = Math.floor((visibleStart.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));
    const endOffset = Math.floor((visibleEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));

    const left = (startOffset / 28) * 100;
    const width = ((endOffset - startOffset + 1) / 28) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2)}%`, // Minimum 2% width for visibility
    };
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <LayoutGrid className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading project planner...</p>
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
            <LayoutGrid className="h-7 w-7 text-teal-600" />
            Project Planner
          </h1>
          <p className="text-slate-600 mt-1">
            Portfolio timeline view across all projects
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
                No projects have planning tasks with dates defined yet.
                Add planning data to individual projects to see the portfolio timeline here.
              </p>
              <div className="mt-6 p-4 bg-slate-50 rounded-lg text-left max-w-md">
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  How to add planning data:
                </h4>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Open a project</li>
                  <li>Navigate to the Planning tab</li>
                  <li>Create tasks with start dates and durations</li>
                  <li>Assign resources to tasks</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : visibleRows.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Projects in This Period
              </h3>
              <p className="text-slate-600 max-w-md">
                No project tasks overlap with the current 4-week window.
                Use the navigation buttons to view other time periods.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Project Timeline */
        <Card data-testid="project-planner-gantt">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              Project Timeline ({visibleRows.length} {visibleRows.length === 1 ? 'project' : 'projects'})
            </CardTitle>
            <CardDescription>
              Click on a project row to navigate to its Planning tab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Week Headers */}
            <div className="flex border-b border-slate-200 mb-2">
              <div className="w-64 flex-shrink-0 px-3 py-2 text-sm font-medium text-slate-600">
                Project
              </div>
              <div className="flex-1 flex">
                {weeks.map((week) => (
                  <div
                    key={week.index}
                    className={`flex-1 px-2 py-2 text-center border-l border-slate-100 ${
                      week.isCurrentWeek ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-700">{week.label}</div>
                    <div className="text-xs text-slate-500">{week.dateRange}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Rows */}
            <div className="space-y-1">
              {visibleRows.map((row) => (
                <div
                  key={row.project.id}
                  className="flex items-stretch border border-slate-100 rounded-lg hover:border-teal-200 hover:bg-slate-50/50 transition-colors group"
                >
                  {/* Project Info */}
                  <button
                    type="button"
                    onClick={() => navigateToProjectPlanning(row.project.id)}
                    className="w-64 flex-shrink-0 px-3 py-3 text-left flex items-center gap-2 hover:bg-slate-100 transition-colors rounded-l-lg"
                    title="Open project Planning tab"
                  >
                    <FolderOpen className="h-4 w-4 text-slate-500 group-hover:text-teal-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          {row.project.projectNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1 py-0 ${
                            row.project.status === 'CLOSED'
                              ? 'border-green-300 text-green-700'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          {row.project.status}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {row.project.title}
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>

                  {/* Timeline Area */}
                  <div className="flex-1 relative py-2 pr-2">
                    {/* Week grid lines */}
                    <div className="absolute inset-0 flex">
                      {weeks.map((week) => (
                        <div
                          key={week.index}
                          className={`flex-1 border-l border-slate-100 ${
                            week.isCurrentWeek ? 'bg-teal-50/30' : ''
                          }`}
                        />
                      ))}
                    </div>

                    {/* Project span bar (background) */}
                    {row.projectSpan && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-6 rounded bg-slate-100 border border-slate-200"
                        style={calculateBarStyle(row.projectSpan.startDate, row.projectSpan.endDate)}
                        title={`Project span: ${row.projectSpan.startDate} to ${row.projectSpan.endDate}`}
                      />
                    )}

                    {/* Task bars */}
                    <div className="relative h-8 flex items-center">
                      {row.tasks.slice(0, 5).map((task, idx) => {
                        const effectiveEnd = getEffectiveEndDate(task)!;
                        const barStyle = calculateBarStyle(task.startDate!, effectiveEnd);
                        const statusColor = TASK_STATUS_COLORS[task.status || 'TODO'];

                        return (
                          <div
                            key={task.id}
                            className={`absolute h-4 rounded ${statusColor} shadow-sm`}
                            style={{
                              ...barStyle,
                              top: `${50 - 8 + (idx % 2) * 2}%`, // Slight vertical offset for overlapping bars
                              zIndex: 10 + idx,
                            }}
                            title={`${task.title}: ${task.startDate} to ${effectiveEnd}`}
                          />
                        );
                      })}
                      {row.tasks.length > 5 && (
                        <div
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-slate-500 bg-white px-1 rounded z-20"
                        >
                          +{row.tasks.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6">
              <span className="text-xs text-slate-500">Task status:</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-300" />
                  <span className="text-xs text-slate-600">To Do</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-400" />
                  <span className="text-xs text-slate-600">In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-400" />
                  <span className="text-xs text-slate-600">Done</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                <span className="text-xs text-slate-600">Project span</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
