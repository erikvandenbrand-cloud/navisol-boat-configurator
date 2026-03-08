/**
 * Project Planner Screen - v4.2
 * Portfolio-level Gantt view with inline editing capability
 * Shows all projects with their planning work items on a 4-week timeline
 *
 * v4.2: Default view shows category summaries (planning WorkItems with summarizes)
 * - Toggle to switch between "Summaries" (default) and "All Tasks" (advanced)
 * - Each category summary renders as its own bar (separate lanes)
 * - Drill-down available to view underlying production tasks
 * - Edit dates/assignees on summary items (soft planning)
 * - Date locking: manual edits lock dates from refresh
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  FolderOpen,
  Calendar,
  CalendarClock,
  ExternalLink,
  Filter,
  LayoutGrid,
  Edit,
  Plus,
  Layers,
  Eye,
  Lock,
  RefreshCw,
} from 'lucide-react';
import type {
  Project,
  WorkItem,
  WorkItemStatus,
  ProjectStatus,
  ProjectType,
  TaskCategory,
} from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { PlanningSummaryService, CATEGORY_LABELS } from '@/domain/services/PlanningSummaryService';
import {
  getEffectiveEndDate,
  addDays,
  formatDateISO,
  parseDate as parseDateUtil,
} from '@/domain/utils/dateUtils';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlanningTaskDialog, type PlanningWorkItem } from '@/v4/components/PlanningTaskDialog';
import { PlanningSummaryDrilldown } from '@/v4/components/PlanningSummaryDrilldown';

// ============================================
// TYPES
// ============================================

interface ProjectRow {
  project: Project;
  tasks: PlanningWorkItem[];
  summaryTasks: PlanningWorkItem[]; // Tasks with summarizes field
  projectSpan: { startDate: string; endDate: string } | null;
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

// Category colors for summary bars
const CATEGORY_COLORS: Record<TaskCategory, string> = {
  HULL: 'bg-amber-500',
  PROPULSION: 'bg-blue-500',
  ELECTRICAL: 'bg-yellow-500',
  INTERIOR: 'bg-pink-500',
  EXTERIOR: 'bg-cyan-500',
  NAVIGATION: 'bg-indigo-500',
  SAFETY: 'bg-red-500',
  FINISHING: 'bg-purple-500',
  TESTING: 'bg-green-500',
  DELIVERY: 'bg-teal-500',
  OTHER: 'bg-slate-500',
};

// ============================================
// DATE HELPERS
// ============================================

// Date utilities imported from @/domain/utils/dateUtils

/**
 * Get start of week (Monday).
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Parse date with non-null guarantee for Gantt rendering.
 */
function parseDateForGantt(dateStr: string): Date {
  const parsed = parseDateUtil(dateStr);
  return parsed || new Date();
}

// ============================================
// TASK STATUS COLORS - Updated for WorkItemStatus
// ============================================

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-slate-300',
  IN_PROGRESS: 'bg-blue-400',
  COMPLETED: 'bg-green-400',
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

  // View toggle: summary (default) or all-tasks
  const [showAllTasks, setShowAllTasks] = useState(false);

  // Task editing state (for inline editing)
  const [editingTask, setEditingTask] = useState<{
    task: PlanningWorkItem | null;
    projectId: string;
    projectNumber: string;
    projectTitle: string;
  } | null>(null);

  // Drilldown state for summary items
  const [drilldownSummary, setDrilldownSummary] = useState<{
    task: PlanningWorkItem;
    projectId: string;
  } | null>(null);

  // Navigate to project's Planning tab
  const navigateToProjectPlanning = useCallback((projectId: string) => {
    if (onNavigateToProject) {
      onNavigateToProject(projectId, 'planning');
    } else {
      window.location.hash = `/projects/${projectId}?tab=planning`;
    }
  }, [onNavigateToProject]);

  // Load all projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await ProjectRepository.getAll();
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
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }
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

  // Build project rows with planning work items
  const projectRows = useMemo(() => {
    const rows: ProjectRow[] = [];

    for (const project of filteredProjects) {
      const allTasks: PlanningWorkItem[] = (project.workItems?.filter(
        (wi: WorkItem) => wi.kind === 'planning'
      ) as PlanningWorkItem[]) || [];

      // Separate summary tasks from regular tasks
      const summaryTasks = allTasks.filter((t) => !!t.summarizes);
      const regularTasks = allTasks.filter((t) => !t.summarizes);

      // Filter to tasks with valid dates
      const tasksWithDates = allTasks.filter((task) => {
        if (!task.startDate) return false;
        const effectiveEnd = getEffectiveEndDate(task);
        if (!effectiveEnd) return false;
        return true;
      });

      // Calculate project span
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
        tasks: regularTasks.filter((t) => t.startDate && getEffectiveEndDate(t)),
        summaryTasks: summaryTasks.filter((t) => t.startDate && getEffectiveEndDate(t)),
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
      // In summary mode, check if any summary tasks exist in window
      // In all-tasks mode, check if any tasks exist in window
      const tasksToCheck = showAllTasks ? [...row.tasks, ...row.summaryTasks] : row.summaryTasks;

      if (tasksToCheck.length === 0) {
        // Also show if projectSpan overlaps (for projects without summaries)
        if (!row.projectSpan) return false;
        const spanStart = parseDateForGantt(row.projectSpan.startDate);
        const spanEnd = parseDateForGantt(row.projectSpan.endDate);
        return spanStart <= windowEnd && spanEnd >= windowStart;
      }

      return tasksToCheck.some((task) => {
        if (!task.startDate) return false;
        const effectiveEnd = getEffectiveEndDate(task);
        if (!effectiveEnd) return false;
        const taskStart = parseDateForGantt(task.startDate);
        const taskEnd = parseDateForGantt(effectiveEnd);
        return taskStart <= windowEnd && taskEnd >= windowStart;
      });
    });
  }, [projectRows, windowStart, windowEnd, showAllTasks]);

  // Check if any planning data exists
  const hasPlanningData = useMemo(() => {
    return filteredProjects.some(
      (p) => (p.workItems?.filter((wi: WorkItem) => wi.kind === 'planning').length || 0) > 0
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
    const taskStart = parseDateForGantt(startDate);
    const taskEnd = parseDateForGantt(endDate);

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
      width: `${Math.max(width, 2)}%`,
    };
  };

  // Handle task click for editing
  const handleTaskClick = (task: PlanningWorkItem, project: Project) => {
    setEditingTask({
      task,
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectTitle: project.title,
    });
  };

  // Handle add new task for a project
  const handleAddTaskClick = (project: Project) => {
    setEditingTask({
      task: null,
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectTitle: project.title,
    });
  };

  // Handle drilldown for summary
  const handleDrilldown = (task: PlanningWorkItem, projectId: string) => {
    setDrilldownSummary({ task, projectId });
  };

  // Handle recalculate dates for a locked summary
  const handleRecalculateDates = async (task: PlanningWorkItem, projectId: string) => {
    try {
      await PlanningSummaryService.recalculateDates(projectId, task.id, {
        userId: 'user',
        userName: 'User',
      });
      await loadProjects();
    } catch (error) {
      console.error('Failed to recalculate dates:', error);
    }
  };

  // Handle task saved - refresh data
  const handleTaskSaved = async () => {
    await loadProjects();
    setEditingTask(null);
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
    <TooltipProvider>
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

          {/* View toggle */}
          <div className="flex items-center gap-2 ml-4">
            <Label htmlFor="planner-view-toggle" className="text-sm text-slate-700 flex items-center gap-1">
              <Layers className="h-4 w-4 text-teal-600" />
              Summaries
            </Label>
            <Switch
              id="planner-view-toggle"
              checked={showAllTasks}
              onCheckedChange={setShowAllTasks}
              aria-label="Toggle between summary and all-tasks view"
            />
            <Label htmlFor="planner-view-toggle" className="text-sm text-slate-700 flex items-center gap-1">
              <Eye className="h-4 w-4 text-teal-600" />
              All Tasks
            </Label>
          </div>
        </div>

        {/* Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">
            {showAllTasks
              ? <>Viewing <b>all planning tasks</b>. Click a bar to edit dates and assignees.</>
              : <>Viewing <b>category summaries</b>. Each bar = one category. Click to edit or drill down to production tasks. <Lock className="inline h-3 w-3" /> = dates locked from refresh.</>
            }
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
                    <li>Create production tasks, then generate summaries</li>
                    <li>Set dates and assign resources</li>
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
                  {showAllTasks
                    ? 'No project tasks overlap with the current 4-week window.'
                    : 'No category summaries overlap with the current 4-week window. Generate summaries from the Planning tab.'}
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
                {showAllTasks
                  ? 'Click a task bar to edit. Click project name to view full planning tab.'
                  : 'Each colored bar = one category summary. Click to edit dates or drill down to see production tasks.'}
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
                {visibleRows.map((row) => {
                  // Determine which tasks to display
                  const displayTasks = showAllTasks
                    ? [...row.tasks, ...row.summaryTasks]
                    : row.summaryTasks;

                  // Calculate row height based on number of summary categories
                  const rowHeight = showAllTasks
                    ? Math.max(48, Math.min(displayTasks.length * 20, 80))
                    : Math.max(48, row.summaryTasks.length * 24 + 8);

                  return (
                    <div
                      key={row.project.id}
                      className="flex items-stretch border border-slate-100 rounded-lg hover:border-teal-200 hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* Project Info */}
                      <div className="w-64 flex-shrink-0 px-3 py-3 flex items-center gap-2 rounded-l-lg">
                        <button
                          type="button"
                          onClick={() => navigateToProjectPlanning(row.project.id)}
                          className="flex-1 flex items-center gap-2 text-left hover:bg-slate-100 -mx-1 px-1 rounded transition-colors"
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
                        {/* Add task button */}
                        <button
                          type="button"
                          onClick={() => handleAddTaskClick(row.project)}
                          className="p-1 rounded hover:bg-teal-100 text-slate-400 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Add new task"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Timeline Area */}
                      <div
                        className="flex-1 relative py-1 pr-2"
                        style={{ minHeight: `${rowHeight}px` }}
                      >
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

                        {/* Project span bar (background) - only in all tasks mode */}
                        {showAllTasks && row.projectSpan && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-6 rounded bg-slate-100 border border-slate-200 opacity-50"
                            style={calculateBarStyle(row.projectSpan.startDate, row.projectSpan.endDate)}
                            title={`Project span: ${row.projectSpan.startDate} to ${row.projectSpan.endDate}`}
                          />
                        )}

                        {/* Task bars */}
                        {showAllTasks ? (
                          /* All tasks mode - stacked bars */
                          <div className="relative h-full flex flex-col justify-center gap-0.5 py-1">
                            {displayTasks.slice(0, 5).map((task, idx) => {
                              const effectiveEnd = getEffectiveEndDate(task)!;
                              const isSummary = !!task.summarizes;
                              // Use category color for legacy summaries, otherwise use status color
                              const statusColor = isSummary && task.summarizes?.category
                                ? CATEGORY_COLORS[task.summarizes.category]
                                : TASK_STATUS_COLORS[task.status || 'TODO'];
                              const barStyle = calculateBarStyle(task.startDate!, effectiveEnd);

                              return (
                                <div key={task.id} className="relative h-4">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskClick(task, row.project);
                                    }}
                                    className={`absolute h-full rounded ${statusColor} shadow-sm hover:ring-2 hover:ring-teal-400 hover:ring-offset-1 transition-all cursor-pointer`}
                                    style={barStyle}
                                    title={`${task.title}: ${task.startDate} to ${effectiveEnd}`}
                                  />
                                </div>
                              );
                            })}
                            {displayTasks.length > 5 && (
                              <div className="text-[10px] text-slate-500 text-right pr-1">
                                +{displayTasks.length - 5} more
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Summary mode - one bar per summary, stacked vertically */
                          <div className="relative h-full flex flex-col justify-center gap-1 py-1">
                            {row.summaryTasks.map((task) => {
                              const effectiveEnd = getEffectiveEndDate(task);
                              if (!effectiveEnd || !task.startDate) return null;

                              // Get color and label based on summary type
                              const summarizes = task.summarizes;
                              let barColor: string;
                              let barLabel: string;

                              if (summarizes?.category) {
                                // Legacy category-based summaries
                                barColor = CATEGORY_COLORS[summarizes.category];
                                barLabel = CATEGORY_LABELS[summarizes.category];
                              } else {
                                // Stage or procedure-based summaries - use status color
                                barColor = TASK_STATUS_COLORS[task.status || 'TODO'];
                                barLabel = task.title;
                              }

                              const barStyle = calculateBarStyle(task.startDate, effectiveEnd);
                              const isLocked = summarizes?.datesLocked;
                              const usedStageFallback = summarizes?.usedStageFallback;
                              const isStageType = summarizes?.summaryType === 'stage';

                              return (
                                <div key={task.id} className="relative h-5 group/bar">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTaskClick(task, row.project);
                                        }}
                                        className={`absolute h-full rounded-sm ${barColor} shadow-sm hover:ring-2 hover:ring-teal-400 hover:ring-offset-1 transition-all cursor-pointer flex items-center justify-between px-1 text-white text-[10px] font-medium overflow-hidden`}
                                        style={barStyle}
                                      >
                                        <span className="truncate">{barLabel}</span>
                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                          {/* Stage fallback indicator - show when using stage dates */}
                                          {isStageType && usedStageFallback && !isLocked && (
                                            <CalendarClock className="h-2.5 w-2.5 opacity-70" />
                                          )}
                                          {isLocked && <Lock className="h-2.5 w-2.5" />}
                                          <Edit className="h-2.5 w-2.5 opacity-0 group-hover/bar:opacity-100" />
                                        </div>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <div className="text-xs space-y-1">
                                        <div className="font-medium">{barLabel}</div>
                                        <div>{task.startDate} to {effectiveEnd}</div>
                                        <div className="text-slate-400">{task.description}</div>
                                        {/* Stage fallback indicator in tooltip */}
                                        {isStageType && usedStageFallback && !isLocked && (
                                          <div className="text-blue-400 flex items-center gap-1">
                                            <CalendarClock className="h-3 w-3" />
                                            Dates from Stage (production tasks have no dates)
                                          </div>
                                        )}
                                        {isLocked && (
                                          <div className="text-amber-500 flex items-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            Dates locked (manually edited)
                                          </div>
                                        )}
                                        <div className="pt-1 border-t border-slate-600 text-slate-400">
                                          Click to edit • Right-click for drilldown
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* Context actions on hover */}
                                  <div
                                    className="absolute -right-20 top-0 h-full flex items-center gap-1 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                    style={{ left: `calc(${barStyle.left} + ${barStyle.width})` }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDrilldown(task, row.project.id);
                                      }}
                                      className="p-0.5 rounded bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700"
                                      title="Drill down to production tasks"
                                    >
                                      <Layers className="h-3 w-3" />
                                    </button>
                                    {isLocked && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRecalculateDates(task, row.project.id);
                                        }}
                                        className="p-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700"
                                        title="Recalculate dates from production tasks"
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {row.summaryTasks.length === 0 && (
                              <div className="text-[10px] text-slate-400 italic">
                                No summaries - generate from Planning tab
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {showAllTasks ? (
                  <div className="flex items-center gap-6">
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
                        <span className="text-xs text-slate-600">Completed</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">Category colors:</div>
                    <div className="flex flex-wrap items-center gap-3">
                      {(Object.entries(CATEGORY_COLORS) as [TaskCategory, string][]).map(([cat, color]) => (
                        <div key={cat} className="flex items-center gap-1">
                          <div className={`w-3 h-3 rounded ${color}`} />
                          <span className="text-xs text-slate-600">{CATEGORY_LABELS[cat]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-600">Dates locked (manually edited)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="h-3 w-3 text-blue-400" />
                        <span className="text-xs text-slate-600">Dates from Stage</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-600">Hover for drilldown</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Editing Dialog */}
        {editingTask && (
          <PlanningTaskDialog
            mode="standalone"
            open={true}
            onOpenChange={(open) => {
              if (!open) setEditingTask(null);
            }}
            task={editingTask.task}
            projectId={editingTask.projectId}
            projectNumber={editingTask.projectNumber}
            projectTitle={editingTask.projectTitle}
            onSaved={handleTaskSaved}
            onNavigateToProject={(projectId) => navigateToProjectPlanning(projectId)}
          />
        )}

        {/* Summary Drilldown Dialog */}
        {drilldownSummary && (
          <PlanningSummaryDrilldown
            open={!!drilldownSummary}
            onOpenChange={(open) => !open && setDrilldownSummary(null)}
            summaryTask={drilldownSummary.task}
            projectId={drilldownSummary.projectId}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
