/**
 * Planning Tab - v4
 * CRUD for planning tasks and resources
 * With interactive Gantt view for direct date manipulation
 */

'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  Link2,
  ClipboardList,
  User2,
  AlertCircle,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import type {
  Project,
  PlanningTask,
  PlanningResource,
  PlanningTaskStatus,
} from '@/domain/models';
import { generateUUID } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// ============================================
// TYPES
// ============================================

interface PlanningTabProps {
  project: Project;
  onRefresh: () => Promise<void>;
}

// ============================================
// STATUS DISPLAY
// ============================================

const STATUS_OPTIONS: { value: PlanningTaskStatus; label: string; color: string }[] = [
  { value: 'TODO', label: 'To Do', color: 'bg-slate-100 text-slate-700' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'DONE', label: 'Done', color: 'bg-green-100 text-green-700' },
];

function getStatusBadge(status?: PlanningTaskStatus) {
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  if (!option) return <Badge variant="outline">—</Badge>;
  return <Badge className={`${option.color} border-0`}>{option.label}</Badge>;
}

// ============================================
// GANTT CHART HELPERS
// ============================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status?: PlanningTaskStatus;
  originalTask: PlanningTask;
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

function canShowOnGantt(task: PlanningTask): boolean {
  const hasStart = !!task.startDate;
  const hasEnd = !!task.endDate || !!(task.durationDays && task.durationDays > 0);
  return hasStart && hasEnd;
}

// ============================================
// DEPENDENCY CONNECTOR TYPES
// ============================================

interface DependencyConnector {
  fromTaskId: string;
  toTaskId: string;
  fromX: number; // Right edge of dependency bar
  fromY: number; // Center of dependency bar row
  toX: number;   // Left edge of dependent bar
  toY: number;   // Center of dependent bar row
}

// ============================================
// GANTT CHART COMPONENT
// ============================================

interface GanttChartProps {
  tasks: PlanningTask[];
  resources: PlanningResource[];
  isReadOnly: boolean;
  onEditTask: (task: PlanningTask) => void;
  onUpdateTaskDates: (taskId: string, startDate: string, endDate: string) => Promise<void>;
}

function GanttChart({ tasks, resources, isReadOnly, onEditTask, onUpdateTaskDates }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewOffset, setViewOffset] = useState(0); // Days offset from today
  const [isDragging, setIsDragging] = useState(false);
  const [groupByAssignee, setGroupByAssignee] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    taskId: string;
    type: 'move' | 'resize';
    startX: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);
  const [tempDates, setTempDates] = useState<{ start: Date; end: Date } | null>(null);

  // Configuration
  const DAYS_TO_SHOW = 28; // 4 weeks visible
  const DAY_WIDTH = 36; // pixels per day
  const ROW_HEIGHT = 40; // pixels per task row
  const TASK_NAME_WIDTH = 192; // w-48 = 12rem = 192px

  // Calculate view range
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const viewStart = addDays(today, viewOffset);
  const viewEnd = addDays(viewStart, DAYS_TO_SHOW - 1);

  // Filter tasks that can be shown on Gantt
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks
      .filter(canShowOnGantt)
      .map((task) => ({
        id: task.id,
        title: task.title,
        startDate: parseDate(task.startDate!),
        endDate: parseDate(getEffectiveEndDate(task)!),
        status: task.status,
        originalTask: task,
      }));
  }, [tasks]);

  // Tasks without dates
  const tasksNeedingDates = useMemo(() => {
    return tasks.filter((t) => !canShowOnGantt(t));
  }, [tasks]);

  // Group tasks by assignee resource (first assignee)
  const tasksByResource = useMemo(() => {
    if (!groupByAssignee) return null;

    const groups: { resourceId: string | null; resourceName: string; tasks: GanttTask[] }[] = [];
    const resourceMap = new Map<string | null, GanttTask[]>();

    // Initialize groups for each resource
    for (const resource of resources) {
      resourceMap.set(resource.id, []);
    }
    resourceMap.set(null, []); // Unassigned

    // Assign tasks to groups
    for (const task of ganttTasks) {
      const firstAssignee = task.originalTask.assigneeResourceIds?.[0] || null;
      const existing = resourceMap.get(firstAssignee);
      if (existing) {
        existing.push(task);
      } else {
        // Resource was deleted but task still references it - put in unassigned
        resourceMap.get(null)!.push(task);
      }
    }

    // Build groups array (only include non-empty or if we want to show empty lanes)
    for (const resource of resources) {
      const tasksInLane = resourceMap.get(resource.id) || [];
      if (tasksInLane.length > 0) {
        groups.push({
          resourceId: resource.id,
          resourceName: resource.name,
          tasks: tasksInLane,
        });
      }
    }

    // Add unassigned at the end if it has tasks
    const unassignedTasks = resourceMap.get(null) || [];
    if (unassignedTasks.length > 0) {
      groups.push({
        resourceId: null,
        resourceName: 'Unassigned',
        tasks: unassignedTasks,
      });
    }

    return groups;
  }, [groupByAssignee, ganttTasks, resources]);

  // Build task row index map for dependency drawing
  const taskRowIndexMap = useMemo(() => {
    const map = new Map<string, number>();

    if (groupByAssignee && tasksByResource) {
      let rowIndex = 0;
      for (const group of tasksByResource) {
        rowIndex++; // Resource header row
        for (const task of group.tasks) {
          map.set(task.id, rowIndex);
          rowIndex++;
        }
      }
    } else {
      ganttTasks.forEach((task, index) => {
        map.set(task.id, index);
      });
    }

    return map;
  }, [groupByAssignee, tasksByResource, ganttTasks]);

  // Generate day headers
  const dayHeaders = useMemo(() => {
    const headers: { date: Date; dayNum: number; dayName: string; isWeekend: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const date = addDays(viewStart, i);
      const dayOfWeek = date.getDay();
      headers.push({
        date,
        dayNum: date.getDate(),
        dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: formatDateISO(date) === formatDateISO(today),
      });
    }
    return headers;
  }, [viewStart, today]);

  // Calculate bar position for a task (returns numeric values for connector calculation)
  const getBarPosition = useCallback(
    (task: GanttTask): { left: number; right: number; visible: boolean } | null => {
      const displayStart = dragInfo?.taskId === task.id && tempDates ? tempDates.start : task.startDate;
      const displayEnd = dragInfo?.taskId === task.id && tempDates ? tempDates.end : task.endDate;

      const startOffset = diffDays(viewStart, displayStart);
      const duration = diffDays(displayStart, displayEnd) + 1;

      // Only show if at least partially visible
      if (startOffset + duration < 0 || startOffset >= DAYS_TO_SHOW) {
        return null;
      }

      const left = Math.max(0, startOffset * DAY_WIDTH);
      const width = Math.min(
        (Math.min(startOffset + duration, DAYS_TO_SHOW) - Math.max(startOffset, 0)) * DAY_WIDTH - 4,
        (duration * DAY_WIDTH) - 4
      );

      return {
        left,
        right: left + Math.max(width, 20),
        visible: true,
      };
    },
    [viewStart, dragInfo, tempDates, DAYS_TO_SHOW, DAY_WIDTH]
  );

  // Calculate bar position for a task (returns style object)
  const getBarStyle = useCallback(
    (task: GanttTask) => {
      const pos = getBarPosition(task);
      if (!pos) return null;

      return {
        left: `${pos.left}px`,
        width: `${pos.right - pos.left}px`,
      };
    },
    [getBarPosition]
  );

  // Calculate dependency connectors
  const dependencyConnectors = useMemo((): DependencyConnector[] => {
    if (!showDependencies) return [];

    const connectors: DependencyConnector[] = [];
    const ganttTaskMap = new Map(ganttTasks.map((t) => [t.id, t]));

    for (const task of ganttTasks) {
      const dependsOnIds = task.originalTask.dependsOnTaskIds || [];

      for (const depId of dependsOnIds) {
        const depTask = ganttTaskMap.get(depId);
        if (!depTask) continue; // Dependency not visible on Gantt

        const fromPos = getBarPosition(depTask);
        const toPos = getBarPosition(task);

        if (!fromPos || !toPos) continue; // One or both bars not visible

        const fromRowIndex = taskRowIndexMap.get(depTask.id);
        const toRowIndex = taskRowIndexMap.get(task.id);

        if (fromRowIndex === undefined || toRowIndex === undefined) continue;

        connectors.push({
          fromTaskId: depTask.id,
          toTaskId: task.id,
          fromX: fromPos.right,
          fromY: fromRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
          toX: toPos.left,
          toY: toRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
        });
      }
    }

    return connectors;
  }, [showDependencies, ganttTasks, getBarPosition, taskRowIndexMap, ROW_HEIGHT]);

  // Handle drag start (move entire bar)
  const handleDragStart = useCallback(
    (e: React.MouseEvent, task: GanttTask, type: 'move' | 'resize') => {
      if (isReadOnly) return;
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      setDragInfo({
        taskId: task.id,
        type,
        startX: e.clientX,
        originalStart: task.startDate,
        originalEnd: task.endDate,
      });
      setTempDates({ start: task.startDate, end: task.endDate });
    },
    [isReadOnly]
  );

  // Handle drag move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragInfo || !tempDates) return;

      const deltaX = e.clientX - dragInfo.startX;
      const deltaDays = Math.round(deltaX / DAY_WIDTH);

      if (dragInfo.type === 'move') {
        const newStart = addDays(dragInfo.originalStart, deltaDays);
        const newEnd = addDays(dragInfo.originalEnd, deltaDays);
        setTempDates({ start: newStart, end: newEnd });
      } else if (dragInfo.type === 'resize') {
        const newEnd = addDays(dragInfo.originalEnd, deltaDays);
        // Ensure end is not before start
        if (newEnd >= tempDates.start) {
          setTempDates({ start: tempDates.start, end: newEnd });
        }
      }
    },
    [isDragging, dragInfo, tempDates]
  );

  // Handle drag end
  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !dragInfo || !tempDates) return;

    const task = ganttTasks.find((t) => t.id === dragInfo.taskId);
    if (!task) {
      setIsDragging(false);
      setDragInfo(null);
      setTempDates(null);
      return;
    }

    // Check if dates actually changed
    const startChanged = formatDateISO(tempDates.start) !== formatDateISO(task.startDate);
    const endChanged = formatDateISO(tempDates.end) !== formatDateISO(task.endDate);

    if (startChanged || endChanged) {
      await onUpdateTaskDates(
        task.id,
        formatDateISO(tempDates.start),
        formatDateISO(tempDates.end)
      );
    }

    setIsDragging(false);
    setDragInfo(null);
    setTempDates(null);
  }, [isDragging, dragInfo, tempDates, ganttTasks, onUpdateTaskDates]);

  // Attach global mouse listeners when dragging
  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  // Use effect for drag listeners
  const [, setListenersActive] = useState(false);
  if (isDragging) {
    if (!document.body.classList.contains('gantt-dragging')) {
      document.body.classList.add('gantt-dragging');
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  } else {
    if (document.body.classList.contains('gantt-dragging')) {
      document.body.classList.remove('gantt-dragging');
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }

  // Navigate view
  const navigateView = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setViewOffset(0);
    } else if (direction === 'prev') {
      setViewOffset((prev) => prev - 7);
    } else {
      setViewOffset((prev) => prev + 7);
    }
  };

  // Get status color for bar
  const getBarColor = (status?: PlanningTaskStatus) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      default:
        return 'bg-teal-500';
    }
  };

  // Render dependency connectors as SVG
  const renderDependencyConnectors = () => {
    if (!showDependencies || dependencyConnectors.length === 0) return null;

    // Calculate total height of the grid
    let totalRows = ganttTasks.length;
    if (groupByAssignee && tasksByResource) {
      totalRows = tasksByResource.reduce((sum, g) => sum + g.tasks.length + 1, 0);
    }
    const totalHeight = totalRows * ROW_HEIGHT;
    const totalWidth = DAYS_TO_SHOW * DAY_WIDTH;

    return (
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: `${totalWidth}px`,
          height: `${totalHeight}px`,
          overflow: 'visible',
        }}
        data-testid="gantt-dependency-connectors"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
          </marker>
        </defs>
        {dependencyConnectors.map((conn, i) => {
          // Draw a simple path: horizontal from source, then vertical, then horizontal to target
          const midX = conn.fromX + 8;
          const path = conn.fromY === conn.toY
            // Same row: straight line
            ? `M ${conn.fromX} ${conn.fromY} L ${conn.toX} ${conn.toY}`
            // Different rows: step connector
            : `M ${conn.fromX} ${conn.fromY}
               L ${midX} ${conn.fromY}
               L ${midX} ${conn.toY}
               L ${conn.toX} ${conn.toY}`;

          return (
            <path
              key={`${conn.fromTaskId}-${conn.toTaskId}-${i}`}
              d={path}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              markerEnd="url(#arrowhead)"
              opacity="0.7"
            />
          );
        })}
      </svg>
    );
  };

  // Render a single task row (reusable for both modes)
  const renderTaskRow = (task: GanttTask, showTaskName: boolean = true) => {
    const barStyle = getBarStyle(task);
    const isCurrentlyDragging = dragInfo?.taskId === task.id;

    return (
      <div key={task.id} className="flex border-b last:border-b-0 hover:bg-slate-50/50" style={{ height: `${ROW_HEIGHT}px` }}>
        {/* Task name */}
        {showTaskName && (
          <div
            className="w-48 flex-shrink-0 p-2 border-r flex items-center gap-2 cursor-pointer hover:bg-slate-100"
            onClick={() => onEditTask(task.originalTask)}
            title="Click to edit task"
          >
            <span className="text-sm font-medium truncate">{task.title}</span>
          </div>
        )}
        {/* Timeline area */}
        <div className={`flex-1 relative h-10 ${!showTaskName ? 'ml-0' : ''}`}>
          {/* Day grid lines */}
          <div className="absolute inset-0 flex">
            {dayHeaders.map((day, i) => (
              <div
                key={i}
                className={`flex-shrink-0 border-r last:border-r-0 ${
                  day.isToday
                    ? 'bg-teal-50/50'
                    : day.isWeekend
                      ? 'bg-slate-50/50'
                      : ''
                }`}
                style={{ width: `${DAY_WIDTH}px` }}
              />
            ))}
          </div>
          {/* Task bar */}
          {barStyle && (
            <div
              className={`absolute top-1.5 h-7 rounded flex items-center ${getBarColor(task.status)} ${
                isReadOnly ? 'cursor-default' : 'cursor-grab'
              } ${isCurrentlyDragging ? 'opacity-80 shadow-lg' : 'shadow'}`}
              style={barStyle}
              onClick={(e) => {
                if (!isDragging) {
                  e.stopPropagation();
                  onEditTask(task.originalTask);
                }
              }}
              onMouseDown={(e) => handleDragStart(e, task, 'move')}
              title={isReadOnly ? task.title : 'Drag to move, click to edit'}
            >
              {/* Drag handle (left side) */}
              {!isReadOnly && (
                <div className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-grab opacity-0 hover:opacity-100">
                  <GripVertical className="h-3 w-3 text-white/70" />
                </div>
              )}
              {/* Task title (truncated) */}
              <span className="text-[11px] text-white font-medium px-2 truncate">
                {task.title}
              </span>
              {/* Resize handle (right edge) */}
              {!isReadOnly && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleDragStart(e, task, 'resize');
                  }}
                  title="Drag to resize"
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card data-testid="planning-gantt-section">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              Timeline
            </CardTitle>
            <CardDescription>
              Drag bars to move tasks, resize right edge to change duration
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* Show dependencies toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={showDependencies}
                onCheckedChange={(checked) => setShowDependencies(!!checked)}
                data-testid="gantt-show-dependencies-toggle"
              />
              <span className="text-sm text-slate-600">Show dependencies</span>
            </label>
            {/* Group by assignee toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={groupByAssignee}
                onCheckedChange={(checked) => setGroupByAssignee(!!checked)}
                data-testid="gantt-group-by-assignee-toggle"
              />
              <span className="text-sm text-slate-600">Group by assignee</span>
            </label>
            {/* Navigation buttons */}
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
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Banner */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">
            Planning timeline — manual edits only (no automatic scheduling)
          </span>
        </div>

        {ganttTasks.length === 0 && tasksNeedingDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="text-base font-medium text-slate-900 mb-1">No tasks to display</h4>
            <p className="text-sm text-slate-500 max-w-xs">
              Add planning tasks with dates to see them on the timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gantt Grid */}
            {ganttTasks.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                {/* Header with days */}
                <div className="flex border-b bg-slate-50">
                  {/* Task/Resource name column */}
                  <div className="w-48 flex-shrink-0 p-2 border-r font-medium text-sm text-slate-600">
                    {groupByAssignee ? 'Resource / Task' : 'Task'}
                  </div>
                  {/* Day columns */}
                  <div className="flex overflow-hidden" ref={containerRef}>
                    {dayHeaders.map((day, i) => (
                      <div
                        key={i}
                        className={`flex-shrink-0 text-center border-r last:border-r-0 ${
                          day.isToday
                            ? 'bg-teal-100'
                            : day.isWeekend
                              ? 'bg-slate-100'
                              : ''
                        }`}
                        style={{ width: `${DAY_WIDTH}px` }}
                      >
                        <div className="text-[10px] text-slate-500">{day.dayName}</div>
                        <div className={`text-xs font-medium ${day.isToday ? 'text-teal-700' : 'text-slate-700'}`}>
                          {day.dayNum}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task rows wrapper with dependency overlay */}
                <div className="relative">
                  {/* Task rows - either grouped or flat */}
                  {groupByAssignee && tasksByResource ? (
                    // Grouped by resource (swim lanes)
                    tasksByResource.map((group) => (
                      <div key={group.resourceId || 'unassigned'} data-testid={`gantt-swim-lane-${group.resourceId || 'unassigned'}`}>
                        {/* Resource header row */}
                        <div className="flex border-b bg-slate-100/80" style={{ height: `${ROW_HEIGHT}px` }}>
                          <div className="w-48 flex-shrink-0 p-2 border-r flex items-center gap-2">
                            <User2 className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-semibold text-slate-700">
                              {group.resourceName}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {group.tasks.length}
                            </Badge>
                          </div>
                          {/* Empty timeline area for header */}
                          <div className="flex-1 relative h-10">
                            <div className="absolute inset-0 flex">
                              {dayHeaders.map((day, i) => (
                                <div
                                  key={i}
                                  className={`flex-shrink-0 border-r last:border-r-0 ${
                                    day.isToday
                                      ? 'bg-teal-50/30'
                                      : day.isWeekend
                                        ? 'bg-slate-50/30'
                                        : ''
                                  }`}
                                  style={{ width: `${DAY_WIDTH}px` }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Tasks in this resource's lane */}
                        {group.tasks.map((task) => renderTaskRow(task, true))}
                      </div>
                    ))
                  ) : (
                    // Flat list (no grouping)
                    ganttTasks.map((task) => renderTaskRow(task, true))
                  )}

                  {/* Dependency connectors SVG overlay */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: 0,
                      left: `${TASK_NAME_WIDTH}px`,
                    }}
                  >
                    {renderDependencyConnectors()}
                  </div>
                </div>
              </div>
            )}

            {/* Tasks needing dates */}
            {tasksNeedingDates.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Needs Dates ({tasksNeedingDates.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tasksNeedingDates.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className={`px-3 py-1.5 text-sm rounded-lg border border-dashed border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors ${
                        isReadOnly ? 'cursor-default' : 'cursor-pointer'
                      }`}
                      title={isReadOnly ? task.title : 'Click to set dates'}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// PLANNING TAB COMPONENT
// ============================================

export function PlanningTab({ project, onRefresh }: PlanningTabProps) {
  const isReadOnly = project.status === 'CLOSED';

  // Get planning data with fallbacks
  const tasks = project.planning?.tasks || [];
  const resources = project.planning?.resources || [];

  // Task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanningTask | null>(null);

  // Resource dialog state
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<PlanningResource | null>(null);

  // Delete confirmation state
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);

  // ============================================
  // TASK CRUD
  // ============================================

  function handleOpenAddTask() {
    setEditingTask(null);
    setTaskDialogOpen(true);
  }

  function handleOpenEditTask(task: PlanningTask) {
    setEditingTask(task);
    setTaskDialogOpen(true);
  }

  async function handleSaveTask(taskData: Partial<PlanningTask>) {
    const currentTasks = [...tasks];

    if (editingTask) {
      // Update existing task
      const index = currentTasks.findIndex((t) => t.id === editingTask.id);
      if (index >= 0) {
        currentTasks[index] = { ...currentTasks[index], ...taskData };
      }
    } else {
      // Add new task
      const newTask: PlanningTask = {
        id: generateUUID(),
        title: taskData.title || 'Untitled Task',
        startDate: taskData.startDate,
        endDate: taskData.endDate,
        durationDays: taskData.durationDays,
        status: taskData.status,
        assigneeResourceIds: taskData.assigneeResourceIds || [],
        dependsOnTaskIds: taskData.dependsOnTaskIds || [],
        notes: taskData.notes,
      };
      currentTasks.push(newTask);
    }

    await ProjectRepository.update(project.id, {
      planning: {
        ...project.planning,
        tasks: currentTasks,
        resources: resources,
      },
    });

    setTaskDialogOpen(false);
    setEditingTask(null);
    await onRefresh();
  }

  async function handleDeleteTask() {
    if (!deleteTaskId) return;

    const updatedTasks = tasks.filter((t) => t.id !== deleteTaskId);

    // Also remove this task from any dependsOnTaskIds
    const cleanedTasks = updatedTasks.map((t) => ({
      ...t,
      dependsOnTaskIds: t.dependsOnTaskIds?.filter((id) => id !== deleteTaskId),
    }));

    await ProjectRepository.update(project.id, {
      planning: {
        ...project.planning,
        tasks: cleanedTasks,
        resources: resources,
      },
    });

    setDeleteTaskId(null);
    await onRefresh();
  }

  // Handle Gantt date updates (direct manipulation)
  async function handleUpdateTaskDates(taskId: string, startDate: string, endDate: string) {
    const currentTasks = [...tasks];
    const index = currentTasks.findIndex((t) => t.id === taskId);
    if (index < 0) return;

    // Update only this task with explicit startDate and endDate
    // Clear durationDays since we now have explicit dates
    currentTasks[index] = {
      ...currentTasks[index],
      startDate,
      endDate,
      durationDays: undefined,
    };

    await ProjectRepository.update(project.id, {
      planning: {
        ...project.planning,
        tasks: currentTasks,
        resources: resources,
      },
    });

    await onRefresh();
  }

  // ============================================
  // RESOURCE CRUD
  // ============================================

  function handleOpenAddResource() {
    setEditingResource(null);
    setResourceDialogOpen(true);
  }

  function handleOpenEditResource(resource: PlanningResource) {
    setEditingResource(resource);
    setResourceDialogOpen(true);
  }

  async function handleSaveResource(resourceData: Partial<PlanningResource>) {
    const currentResources = [...resources];

    if (editingResource) {
      // Update existing resource
      const index = currentResources.findIndex((r) => r.id === editingResource.id);
      if (index >= 0) {
        currentResources[index] = { ...currentResources[index], ...resourceData };
      }
    } else {
      // Add new resource
      const newResource: PlanningResource = {
        id: generateUUID(),
        name: resourceData.name || 'Unnamed Resource',
        role: resourceData.role,
        capacityPct: resourceData.capacityPct,
        notes: resourceData.notes,
      };
      currentResources.push(newResource);
    }

    await ProjectRepository.update(project.id, {
      planning: {
        ...project.planning,
        tasks: tasks,
        resources: currentResources,
      },
    });

    setResourceDialogOpen(false);
    setEditingResource(null);
    await onRefresh();
  }

  async function handleDeleteResource() {
    if (!deleteResourceId) return;

    const updatedResources = resources.filter((r) => r.id !== deleteResourceId);

    // Also remove this resource from any assigneeResourceIds
    const cleanedTasks = tasks.map((t) => ({
      ...t,
      assigneeResourceIds: t.assigneeResourceIds?.filter((id) => id !== deleteResourceId),
    }));

    await ProjectRepository.update(project.id, {
      planning: {
        ...project.planning,
        tasks: cleanedTasks,
        resources: updatedResources,
      },
    });

    setDeleteResourceId(null);
    await onRefresh();
  }

  // ============================================
  // HELPERS
  // ============================================

  function formatDateRange(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return '—';
    if (startDate && !endDate) return `From ${formatDate(startDate)}`;
    if (!startDate && endDate) return `Until ${formatDate(endDate)}`;
    return `${formatDate(startDate!)} → ${formatDate(endDate!)}`;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  }

  function getResourceName(resourceId: string): string {
    return resources.find((r) => r.id === resourceId)?.name || 'Unknown';
  }

  function getTaskTitle(taskId: string): string {
    return tasks.find((t) => t.id === taskId)?.title || 'Unknown';
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Gantt Chart Section */}
      <GanttChart
        tasks={tasks}
        resources={resources}
        isReadOnly={isReadOnly}
        onEditTask={handleOpenEditTask}
        onUpdateTaskDates={handleUpdateTaskDates}
      />

      {/* Tasks Section */}
      <Card data-testid="planning-tasks-section">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-teal-600" />
              Tasks
            </CardTitle>
            <CardDescription>
              Planning tasks for production scheduling
            </CardDescription>
          </div>
          {!isReadOnly && (
            <Button onClick={handleOpenAddTask} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <ClipboardList className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">No planning tasks</h4>
              <p className="text-sm text-slate-500 max-w-xs">
                Add tasks to plan and schedule production activities.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Assignees</TableHead>
                  <TableHead className="text-center">Dependencies</TableHead>
                  {!isReadOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDateRange(task.startDate, task.endDate)}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-center">
                      {(task.assigneeResourceIds?.length || 0) > 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {task.assigneeResourceIds?.length}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(task.dependsOnTaskIds?.length || 0) > 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <Link2 className="h-3 w-3" />
                          {task.dependsOnTaskIds?.length}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleOpenEditTask(task)}
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600"
                            onClick={() => setDeleteTaskId(task.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resources Section */}
      <Card data-testid="planning-resources-section">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User2 className="h-5 w-5 text-teal-600" />
              Resources
            </CardTitle>
            <CardDescription>
              People and equipment for task assignments
            </CardDescription>
          </div>
          {!isReadOnly && (
            <Button onClick={handleOpenAddResource} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Resource
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <User2 className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">No resources</h4>
              <p className="text-sm text-slate-500 max-w-xs">
                Add resources to assign to planning tasks.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Notes</TableHead>
                  {!isReadOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">{resource.name}</TableCell>
                    <TableCell className="text-slate-600">{resource.role || '—'}</TableCell>
                    <TableCell>
                      {resource.capacityPct !== undefined ? (
                        <Badge variant="outline">{resource.capacityPct}%</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">
                      {resource.notes || '—'}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleOpenEditResource(resource)}
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600"
                            onClick={() => setDeleteResourceId(resource.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Task Dialog */}
      <TaskPlanningDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        resources={resources}
        tasks={tasks}
        onSave={handleSaveTask}
      />

      {/* Resource Dialog */}
      <ResourcePlanningDialog
        open={resourceDialogOpen}
        onOpenChange={(open) => {
          setResourceDialogOpen(open);
          if (!open) setEditingResource(null);
        }}
        resource={editingResource}
        onSave={handleSaveResource}
      />

      {/* Delete Task Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
              Any dependencies referencing this task will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={!!deleteResourceId} onOpenChange={(open) => !open && setDeleteResourceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resource? This action cannot be undone.
              Any task assignments referencing this resource will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResource}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================
// TASK DIALOG
// ============================================

interface TaskPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PlanningTask | null;
  resources: PlanningResource[];
  tasks: PlanningTask[];
  onSave: (data: Partial<PlanningTask>) => Promise<void>;
}

function TaskPlanningDialog({
  open,
  onOpenChange,
  task,
  resources,
  tasks,
  onSave,
}: TaskPlanningDialogProps) {
  const isEdit = task !== null;

  // Form state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<number | undefined>();
  const [status, setStatus] = useState<PlanningTaskStatus>('TODO');
  const [notes, setNotes] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setStartDate(task.startDate || '');
        setEndDate(task.endDate || '');
        setDurationDays(task.durationDays);
        setStatus(task.status || 'TODO');
        setNotes(task.notes || '');
        setSelectedAssignees(task.assigneeResourceIds || []);
        setSelectedDependencies(task.dependsOnTaskIds || []);
      } else {
        setTitle('');
        setStartDate('');
        setEndDate('');
        setDurationDays(undefined);
        setStatus('TODO');
        setNotes('');
        setSelectedAssignees([]);
        setSelectedDependencies([]);
      }
    }
  });

  // Also use effect for when task changes
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevTask, setPrevTask] = useState(task);
  if (open !== prevOpen || task !== prevTask) {
    setPrevOpen(open);
    setPrevTask(task);
    if (open) {
      if (task) {
        setTitle(task.title);
        setStartDate(task.startDate || '');
        setEndDate(task.endDate || '');
        setDurationDays(task.durationDays);
        setStatus(task.status || 'TODO');
        setNotes(task.notes || '');
        setSelectedAssignees(task.assigneeResourceIds || []);
        setSelectedDependencies(task.dependsOnTaskIds || []);
      } else {
        setTitle('');
        setStartDate('');
        setEndDate('');
        setDurationDays(undefined);
        setStatus('TODO');
        setNotes('');
        setSelectedAssignees([]);
        setSelectedDependencies([]);
      }
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        durationDays: durationDays,
        status,
        notes: notes.trim() || undefined,
        assigneeResourceIds: selectedAssignees,
        dependsOnTaskIds: selectedDependencies,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function toggleAssignee(resourceId: string) {
    setSelectedAssignees((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  }

  function toggleDependency(taskId: string) {
    setSelectedDependencies((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  // Filter out current task from dependencies (prevent self-dependency)
  const availableDependencies = tasks.filter((t) => t.id !== task?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'Add Task'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update task details.' : 'Create a new planning task.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-start">Start Date</Label>
              <Input
                id="task-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-end">End Date</Label>
              <Input
                id="task-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Duration & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-duration">Duration (days)</Label>
              <Input
                id="task-duration"
                type="number"
                min={1}
                value={durationDays || ''}
                onChange={(e) => setDurationDays(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PlanningTaskStatus)}>
                <SelectTrigger id="task-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>Assignees</Label>
            {resources.length === 0 ? (
              <p className="text-sm text-slate-500">No resources available. Add resources first.</p>
            ) : (
              <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                {resources.map((resource) => (
                  <label
                    key={resource.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                  >
                    <Checkbox
                      checked={selectedAssignees.includes(resource.id)}
                      onCheckedChange={() => toggleAssignee(resource.id)}
                    />
                    <span className="text-sm">{resource.name}</span>
                    {resource.role && (
                      <span className="text-xs text-slate-500">({resource.role})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div className="space-y-2">
            <Label>Dependencies</Label>
            {availableDependencies.length === 0 ? (
              <p className="text-sm text-slate-500">No other tasks available to depend on.</p>
            ) : (
              <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                {availableDependencies.map((depTask) => (
                  <label
                    key={depTask.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                  >
                    <Checkbox
                      checked={selectedDependencies.includes(depTask.id)}
                      onCheckedChange={() => toggleDependency(depTask.id)}
                    />
                    <span className="text-sm">{depTask.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// RESOURCE DIALOG
// ============================================

interface ResourcePlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: PlanningResource | null;
  onSave: (data: Partial<PlanningResource>) => Promise<void>;
}

function ResourcePlanningDialog({
  open,
  onOpenChange,
  resource,
  onSave,
}: ResourcePlanningDialogProps) {
  const isEdit = resource !== null;

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [capacityPct, setCapacityPct] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // State tracking for form reset
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevResource, setPrevResource] = useState(resource);
  if (open !== prevOpen || resource !== prevResource) {
    setPrevOpen(open);
    setPrevResource(resource);
    if (open) {
      if (resource) {
        setName(resource.name);
        setRole(resource.role || '');
        setCapacityPct(resource.capacityPct);
        setNotes(resource.notes || '');
      } else {
        setName('');
        setRole('');
        setCapacityPct(undefined);
        setNotes('');
      }
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim() || undefined,
        capacityPct: capacityPct,
        notes: notes.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update resource details.' : 'Create a new planning resource.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="resource-name">Name *</Label>
            <Input
              id="resource-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Resource name"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="resource-role">Role</Label>
            <Input
              id="resource-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Technician, Engineer..."
            />
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="resource-capacity">Capacity (%)</Label>
            <Input
              id="resource-capacity"
              type="number"
              min={0}
              max={100}
              value={capacityPct ?? ''}
              onChange={(e) => setCapacityPct(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0 - 100"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="resource-notes">Notes</Label>
            <Textarea
              id="resource-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
