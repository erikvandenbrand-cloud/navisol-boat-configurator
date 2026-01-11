/**
 * Shopfloor Board Screen - v4
 * Execution view showing tasks grouped by status with drag-and-drop
 * Aggregates planning tasks across all projects
 */

'use client';

import { useState, useMemo, useCallback, useEffect, type DragEvent } from 'react';
import {
  Clipboard,
  FolderOpen,
  Calendar,
  User,
  ExternalLink,
  Info,
  AlertCircle,
  Lock,
  GripVertical,
  Filter,
} from 'lucide-react';
import type {
  Project,
  PlanningTask,
  PlanningResource,
  PlanningTaskStatus,
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

interface TaskCard {
  task: PlanningTask;
  project: Project;
  assigneeName: string | null;
  dateRange: string;
}

interface DragData {
  projectId: string;
  taskId: string;
  currentStatus: PlanningTaskStatus;
}

type WeekWindow = 'this-week' | 'next-week';

const WEEK_WINDOW_OPTIONS: { value: WeekWindow; label: string }[] = [
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
];

const STATUS_ORDER: PlanningTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

// Filter constants
const ALL_ASSIGNEES = '__all__';
const UNASSIGNED = '__unassigned__';
const ALL_PROJECTS = '__all__';

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

function formatDateShort(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
// STATUS COLORS
// ============================================

const STATUS_COLORS: Record<string, { bg: string; border: string; header: string; dropActive: string }> = {
  TODO: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    header: 'bg-slate-100 text-slate-700',
    dropActive: 'bg-slate-100 border-slate-400',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    header: 'bg-blue-100 text-blue-700',
    dropActive: 'bg-blue-100 border-blue-400',
  },
  DONE: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    header: 'bg-green-100 text-green-700',
    dropActive: 'bg-green-100 border-green-400',
  },
};

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

// ============================================
// SHOPFLOOR BOARD SCREEN
// ============================================

interface ShopfloorBoardScreenProps {
  onNavigateToProject?: (projectId: string, tab?: string) => void;
}

export function ShopfloorBoardScreen({ onNavigateToProject }: ShopfloorBoardScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekWindow, setWeekWindow] = useState<WeekWindow>('this-week');
  const [dragOverStatus, setDragOverStatus] = useState<PlanningTaskStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filter state (in-memory only)
  const [selectedAssignee, setSelectedAssignee] = useState<string>(ALL_ASSIGNEES);
  const [selectedProject, setSelectedProject] = useState<string>(ALL_PROJECTS);

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

  // Update task status
  const updateTaskStatus = useCallback(async (
    projectId: string,
    taskId: string,
    newStatus: PlanningTaskStatus
  ) => {
    // Find the project
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // Don't allow updates for CLOSED projects
    if (project.status === 'CLOSED') return;

    // Find the task
    const tasks = project.planning?.tasks || [];
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = tasks[taskIndex];

    // No-op if already has this status
    if (task.status === newStatus) return;

    // Create updated tasks array with only status changed
    const updatedTasks = tasks.map((t, idx) =>
      idx === taskIndex ? { ...t, status: newStatus } : t
    );

    // Update project via repository
    const updatedProject = await ProjectRepository.update(projectId, {
      planning: {
        ...project.planning,
        tasks: updatedTasks,
      },
    });

    if (updatedProject) {
      // Update local state
      setProjects((prev) =>
        prev.map((p) => p.id === projectId ? updatedProject : p)
      );
    }
  }, [projects]);

  // Drag handlers
  const handleDragStart = useCallback((
    e: DragEvent<HTMLDivElement>,
    card: TaskCard
  ) => {
    // Prevent dragging for CLOSED projects
    if (card.project.status === 'CLOSED') {
      e.preventDefault();
      return;
    }

    const dragData: DragData = {
      projectId: card.project.id,
      taskId: card.task.id,
      currentStatus: card.task.status || 'TODO',
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOverStatus(null);
  }, []);

  const handleDragOver = useCallback((
    e: DragEvent<HTMLDivElement>,
    status: PlanningTaskStatus
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column entirely (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverStatus(null);
    }
  }, []);

  const handleDrop = useCallback(async (
    e: DragEvent<HTMLDivElement>,
    targetStatus: PlanningTaskStatus
  ) => {
    e.preventDefault();
    setDragOverStatus(null);
    setIsDragging(false);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      const dragData: DragData = JSON.parse(dataStr);

      // Only update if status is different
      if (dragData.currentStatus !== targetStatus) {
        await updateTaskStatus(dragData.projectId, dragData.taskId, targetStatus);
      }
    } catch (error) {
      console.error('Failed to process drop:', error);
    }
  }, [updateTaskStatus]);

  // Calculate week window dates
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { windowStart, windowEnd, windowLabel } = useMemo(() => {
    const currentWeekStart = startOfWeek(today);
    const start = weekWindow === 'this-week'
      ? currentWeekStart
      : addDays(currentWeekStart, 7);
    const end = addDays(start, 6);

    const label = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return { windowStart: start, windowEnd: end, windowLabel: label };
  }, [today, weekWindow]);

  // Build resource lookup map for all projects
  const resourceMap = useMemo(() => {
    const map = new Map<string, { projectId: string; resource: PlanningResource }>();
    for (const project of projects) {
      const resources = project.planning?.resources || [];
      for (const resource of resources) {
        map.set(`${project.id}:${resource.id}`, { projectId: project.id, resource });
      }
    }
    return map;
  }, [projects]);

  // Get assignee name for a task
  const getAssigneeName = useCallback((task: PlanningTask, projectId: string): string | null => {
    if (!task.assigneeResourceIds || task.assigneeResourceIds.length === 0) {
      return null;
    }
    const firstAssigneeId = task.assigneeResourceIds[0];
    const entry = resourceMap.get(`${projectId}:${firstAssigneeId}`);
    return entry?.resource.name || null;
  }, [resourceMap]);

  // Aggregate ALL tasks from all projects (before filtering)
  const { allTasksWithDates, allTasksWithoutDates } = useMemo(() => {
    const withDates: TaskCard[] = [];
    const withoutDates: TaskCard[] = [];

    for (const project of projects) {
      const tasks = project.planning?.tasks || [];

      for (const task of tasks) {
        const startDate = task.startDate;
        const effectiveEnd = getEffectiveEndDate(task);

        // Check if task has valid dates
        if (!startDate || !effectiveEnd) {
          // Task without dates
          withoutDates.push({
            task,
            project,
            assigneeName: getAssigneeName(task, project.id),
            dateRange: 'No dates',
          });
          continue;
        }

        // Check if task overlaps with the selected week window
        const taskStart = parseDate(startDate);
        const taskEnd = parseDate(effectiveEnd);

        // Task overlaps if it starts before window ends AND ends after window starts
        if (taskStart <= windowEnd && taskEnd >= windowStart) {
          withDates.push({
            task,
            project,
            assigneeName: getAssigneeName(task, project.id),
            dateRange: `${formatDateShort(startDate)} - ${formatDateShort(effectiveEnd)}`,
          });
        }
      }
    }

    return { allTasksWithDates: withDates, allTasksWithoutDates: withoutDates };
  }, [projects, windowStart, windowEnd, getAssigneeName]);

  // Build available assignee names from tasks in the current week window
  const availableAssignees = useMemo(() => {
    const names = new Set<string>();
    let hasUnassigned = false;

    for (const card of allTasksWithDates) {
      if (card.assigneeName) {
        names.add(card.assigneeName);
      } else {
        hasUnassigned = true;
      }
    }
    for (const card of allTasksWithoutDates) {
      if (card.assigneeName) {
        names.add(card.assigneeName);
      } else {
        hasUnassigned = true;
      }
    }

    const sortedNames = Array.from(names).sort((a, b) => a.localeCompare(b));
    return { names: sortedNames, hasUnassigned };
  }, [allTasksWithDates, allTasksWithoutDates]);

  // Build available projects from tasks in the current week window
  const availableProjects = useMemo(() => {
    const projectMap = new Map<string, { id: string; number: string; title: string }>();

    for (const card of allTasksWithDates) {
      if (!projectMap.has(card.project.id)) {
        projectMap.set(card.project.id, {
          id: card.project.id,
          number: card.project.projectNumber,
          title: card.project.title,
        });
      }
    }
    for (const card of allTasksWithoutDates) {
      if (!projectMap.has(card.project.id)) {
        projectMap.set(card.project.id, {
          id: card.project.id,
          number: card.project.projectNumber,
          title: card.project.title,
        });
      }
    }

    return Array.from(projectMap.values()).sort((a, b) => a.number.localeCompare(b.number));
  }, [allTasksWithDates, allTasksWithoutDates]);

  // Reset filters when they become invalid (e.g., week window changes)
  useEffect(() => {
    // Reset assignee filter if selected assignee no longer exists
    if (selectedAssignee !== ALL_ASSIGNEES && selectedAssignee !== UNASSIGNED) {
      if (!availableAssignees.names.includes(selectedAssignee)) {
        setSelectedAssignee(ALL_ASSIGNEES);
      }
    }
    if (selectedAssignee === UNASSIGNED && !availableAssignees.hasUnassigned) {
      setSelectedAssignee(ALL_ASSIGNEES);
    }
  }, [availableAssignees, selectedAssignee]);

  useEffect(() => {
    // Reset project filter if selected project no longer exists
    if (selectedProject !== ALL_PROJECTS) {
      if (!availableProjects.some((p) => p.id === selectedProject)) {
        setSelectedProject(ALL_PROJECTS);
      }
    }
  }, [availableProjects, selectedProject]);

  // Apply filters to tasks
  const filterTasks = useCallback((cards: TaskCard[]): TaskCard[] => {
    return cards.filter((card) => {
      // Assignee filter
      if (selectedAssignee !== ALL_ASSIGNEES) {
        if (selectedAssignee === UNASSIGNED) {
          if (card.assigneeName !== null) return false;
        } else {
          if (card.assigneeName !== selectedAssignee) return false;
        }
      }

      // Project filter
      if (selectedProject !== ALL_PROJECTS) {
        if (card.project.id !== selectedProject) return false;
      }

      return true;
    });
  }, [selectedAssignee, selectedProject]);

  // Filtered tasks
  const tasksWithDates = useMemo(() => filterTasks(allTasksWithDates), [filterTasks, allTasksWithDates]);
  const tasksWithoutDates = useMemo(() => filterTasks(allTasksWithoutDates), [filterTasks, allTasksWithoutDates]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, TaskCard[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const card of tasksWithDates) {
      const status = card.task.status || 'TODO';
      if (grouped[status]) {
        grouped[status].push(card);
      } else {
        grouped.TODO.push(card);
      }
    }

    // Sort each column by project number, then task title
    for (const status of Object.keys(grouped)) {
      grouped[status].sort((a, b) => {
        const projectCompare = a.project.projectNumber.localeCompare(b.project.projectNumber);
        if (projectCompare !== 0) return projectCompare;
        return a.task.title.localeCompare(b.task.title);
      });
    }

    return grouped;
  }, [tasksWithDates]);

  // Check if any planning data exists
  const hasPlanningData = useMemo(() => {
    return projects.some((p) => (p.planning?.tasks?.length || 0) > 0);
  }, [projects]);

  // Build filter summary text
  const filterSummary = useMemo(() => {
    const parts: string[] = [];

    // Week
    parts.push(weekWindow === 'this-week' ? 'This Week' : 'Next Week');

    // Assignee
    if (selectedAssignee === ALL_ASSIGNEES) {
      parts.push('All Assignees');
    } else if (selectedAssignee === UNASSIGNED) {
      parts.push('Unassigned');
    } else {
      parts.push(selectedAssignee);
    }

    // Project
    if (selectedProject === ALL_PROJECTS) {
      parts.push('All Projects');
    } else {
      const proj = availableProjects.find((p) => p.id === selectedProject);
      parts.push(proj ? proj.number : 'Selected Project');
    }

    return `Showing: ${parts.join(' / ')}`;
  }, [weekWindow, selectedAssignee, selectedProject, availableProjects]);

  // Check if any filters are active
  const hasActiveFilters = selectedAssignee !== ALL_ASSIGNEES || selectedProject !== ALL_PROJECTS;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Clipboard className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading shopfloor board...</p>
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
            <Clipboard className="h-7 w-7 text-teal-600" />
            Shopfloor Board
          </h1>
          <p className="text-slate-600 mt-1">
            Execution view for day-to-day task management
          </p>
        </div>

        {/* Week Toggle */}
        <div className="flex items-center gap-2">
          {WEEK_WINDOW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={weekWindow === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWeekWindow(option.value)}
              className={weekWindow === option.value ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filters Row */}
      {hasPlanningData && (allTasksWithDates.length > 0 || allTasksWithoutDates.length > 0) && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Assignee Filter */}
          {(availableAssignees.names.length > 0 || availableAssignees.hasUnassigned) && (
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-[180px] h-9">
                <User className="h-3.5 w-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ASSIGNEES}>All Assignees</SelectItem>
                {availableAssignees.hasUnassigned && (
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                )}
                {availableAssignees.names.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Project Filter */}
          {availableProjects.length > 1 && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[220px] h-9">
                <FolderOpen className="h-3.5 w-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
                {availableProjects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.number} - {proj.title.length > 20 ? `${proj.title.slice(0, 20)}...` : proj.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAssignee(ALL_ASSIGNEES);
                setSelectedProject(ALL_PROJECTS);
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Filter Summary & Week Range Display */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Calendar className="h-4 w-4" />
        <span>{filterSummary}</span>
        <span className="text-slate-400">({windowLabel})</span>
      </div>

      {/* Banner */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
        <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-amber-800">
          Execution view — drag cards between columns to update status
        </span>
      </div>

      {/* Empty State */}
      {!hasPlanningData ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Clipboard className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Planning Data
              </h3>
              <p className="text-slate-600 max-w-md">
                No projects have planning tasks defined yet.
                Add planning data to individual projects to see tasks on the shopfloor board.
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
                  <li>Set task status (To Do, In Progress, Done)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : tasksWithDates.length === 0 && tasksWithoutDates.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {hasActiveFilters ? 'No Matching Tasks' : 'No Tasks This Week'}
              </h3>
              <p className="text-slate-600 max-w-md">
                {hasActiveFilters
                  ? 'No tasks match the current filter criteria. Try adjusting the filters or clearing them.'
                  : `No tasks with dates overlap with ${weekWindow === 'this-week' ? 'this week' : 'next week'}. Try switching to ${weekWindow === 'this-week' ? 'next week' : 'this week'} or add dates to your tasks.`}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSelectedAssignee(ALL_ASSIGNEES);
                    setSelectedProject(ALL_PROJECTS);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-3 gap-4" data-testid="shopfloor-board">
          {STATUS_ORDER.map((status) => {
            const colors = STATUS_COLORS[status];
            const cards = tasksByStatus[status];
            const isDropTarget = dragOverStatus === status;

            return (
              <div
                key={status}
                data-testid={`column-${status.toLowerCase()}`}
                className={`rounded-lg border-2 min-h-[400px] flex flex-col transition-all duration-150 ${
                  isDropTarget && isDragging
                    ? colors.dropActive
                    : `${colors.bg} ${colors.border}`
                } ${isDragging ? 'border-dashed' : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 rounded-t-md ${colors.header} flex items-center justify-between`}>
                  <h3 className="font-semibold">{STATUS_LABELS[status]}</h3>
                  <Badge variant="secondary" className="bg-white/50">
                    {cards.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {cards.length === 0 ? (
                    <p className={`text-sm text-slate-500 text-center py-8 ${
                      isDropTarget && isDragging ? 'text-slate-700 font-medium' : ''
                    }`}>
                      {isDropTarget && isDragging ? 'Drop here' : 'No tasks'}
                    </p>
                  ) : (
                    cards.map((card) => (
                      <TaskCardComponent
                        key={`${card.project.id}-${card.task.id}`}
                        card={card}
                        onNavigate={() => navigateToProjectPlanning(card.project.id)}
                        onDragStart={(e) => handleDragStart(e, card)}
                        onDragEnd={handleDragEnd}
                        isDraggable={card.project.status !== 'CLOSED'}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks Without Dates */}
      {tasksWithoutDates.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Tasks Without Dates ({tasksWithoutDates.length})
            </CardTitle>
            <CardDescription>
              These tasks are missing start or end dates and are not shown on the board above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasksWithoutDates.slice(0, 12).map((card) => (
                <TaskCardComponent
                  key={`${card.project.id}-${card.task.id}`}
                  card={card}
                  onNavigate={() => navigateToProjectPlanning(card.project.id)}
                  compact
                  isDraggable={false}
                />
              ))}
              {tasksWithoutDates.length > 12 && (
                <div className="flex items-center justify-center text-sm text-slate-500 py-4">
                  +{tasksWithoutDates.length - 12} more tasks without dates
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// TASK CARD COMPONENT
// ============================================

interface TaskCardComponentProps {
  card: TaskCard;
  onNavigate: () => void;
  compact?: boolean;
  isDraggable?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

function TaskCardComponent({
  card,
  onNavigate,
  compact,
  isDraggable = true,
  onDragStart,
  onDragEnd,
}: TaskCardComponentProps) {
  const { task, project, assigneeName, dateRange } = card;
  const isClosed = project.status === 'CLOSED';

  return (
    <div
      draggable={isDraggable && !isClosed}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate();
        }
      }}
      role="button"
      tabIndex={0}
      className={`w-full text-left bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all group ${
        compact ? 'p-3' : 'p-4'
      } ${isDraggable && !isClosed ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      title={isClosed ? 'Project is closed (read-only)' : 'Drag to change status, click to open project'}
    >
      {/* Project Info */}
      <div className="flex items-center gap-2 mb-2">
        {isDraggable && !isClosed && (
          <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 group-hover:text-slate-400" />
        )}
        {isClosed && (
          <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />
        )}
        <FolderOpen className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-medium text-slate-500 truncate">
          {project.projectNumber}
        </span>
        <span className="text-xs text-slate-400 truncate flex-1">
          {project.title}
        </span>
        <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {/* Task Title */}
      <h4 className={`font-medium text-slate-900 mb-2 ${compact ? 'text-sm' : ''}`}>
        {task.title}
      </h4>

      {/* Meta Info */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {/* Assignee */}
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span className={assigneeName ? '' : 'italic text-slate-400'}>
            {assigneeName || 'Unassigned'}
          </span>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span className={dateRange === 'No dates' ? 'italic text-amber-500' : ''}>
            {dateRange}
          </span>
        </div>
      </div>
    </div>
  );
}
