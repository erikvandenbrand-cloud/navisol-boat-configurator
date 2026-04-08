/**
 * Planning Tab - v4.3
 * CRUD for planning work items and resources
 * Now uses unified WorkItem model with kind: 'planning'
 * With interactive Gantt view for direct date manipulation
 *
 * v4.2: Added planning summaries grouped by production task category
 * v4.3: Changed to stage/procedure grouping with UI selector
 * - User can select "Group by: Stage" or "Group by: Procedure"
 * - "Generate Summary" action creates/updates summaries by selected grouping
 * - Summaries show in Gantt with drill-down to underlying production tasks
 * - Backward compatibility for legacy category-based summaries
 */

'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  CalendarClock,
  Users,
  Link2,
  ClipboardList,
  User2,
  AlertCircle,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Info,
  UserPlus,
  Layers,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import type {
  Project,
  WorkItem,
  WorkItemStatus,
  PlanningResource,
  PlanningSummaryType,
  AutoSyncDatesMode,
} from '@/domain/models';
import type { User } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuthService } from '@/domain/services/AuthService';
import { PlanningSummaryService, CATEGORY_LABELS } from '@/domain/services/PlanningSummaryService';
import { getAuditContext } from '@/domain/auth';
import {
  getEffectiveEndDate,
  canShowOnGantt,
  formatDateRange,
  addDays,
  diffDays,
  formatDateISO,
  parseDate as parseDateUtil,
} from '@/domain/utils/dateUtils';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlanningTaskDialog, PLANNING_STATUS_OPTIONS, AUTO_SYNC_DATES_OPTIONS, type PlanningWorkItem } from '@/v4/components/PlanningTaskDialog';
import { PlanningSummaryDrilldown } from '@/v4/components/PlanningSummaryDrilldown';

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

// Use unified status options from PlanningTaskDialog
const STATUS_OPTIONS = PLANNING_STATUS_OPTIONS;

// Use autoSyncDates options from PlanningTaskDialog
const DATE_SYNC_OPTIONS = AUTO_SYNC_DATES_OPTIONS;

function getStatusBadge(status?: WorkItemStatus) {
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  if (!option) return <Badge variant="outline">—</Badge>;
  return <Badge className={`${option.color} border-0`}>{option.label}</Badge>;
}

// ============================================
// GANTT CHART HELPERS
// ============================================

// Date utilities imported from @/domain/utils/dateUtils
// - getEffectiveEndDate, canShowOnGantt, formatDateRange, addDays, diffDays, formatDateISO, parseDateUtil

/**
 * Parse date with non-null guarantee for Gantt rendering.
 * Uses imported parseDateUtil with fallback to current date.
 */
function parseDateForGantt(dateStr: string): Date {
  const parsed = parseDateUtil(dateStr);
  return parsed || new Date();
}

interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status?: WorkItemStatus;
  originalTask: PlanningWorkItem;
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
  tasks: PlanningWorkItem[];
  resources: PlanningResource[];
  isReadOnly: boolean;
  onEditTask: (task: PlanningWorkItem) => void;
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
        startDate: parseDateForGantt(task.startDate!),
        endDate: parseDateForGantt(getEffectiveEndDate(task)!),
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

    // Assign tasks to groups - use unified assigneeIds field
    for (const task of ganttTasks) {
      const firstAssignee = task.originalTask.assigneeIds?.[0] || null;
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

  // Calculate dependency connectors - use unified dependsOnIds field
  const dependencyConnectors = useMemo((): DependencyConnector[] => {
    if (!showDependencies) return [];

    const connectors: DependencyConnector[] = [];
    const ganttTaskMap = new Map(ganttTasks.map((t) => [t.id, t]));

    for (const task of ganttTasks) {
      const dependsOnIds = task.originalTask.dependsOnIds || [];

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

  // Get status color for bar - updated for WorkItemStatus
  const getBarColor = (status?: WorkItemStatus) => {
    switch (status) {
      case 'COMPLETED':
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

  // Get planning data with fallbacks - use workItems for tasks
  const planningTasks: PlanningWorkItem[] = useMemo(() => {
    return (project.workItems || []).filter(
      (w): w is PlanningWorkItem => w.kind === 'planning'
    );
  }, [project.workItems]);
  const resources = project.planning?.resources || [];

  // Task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanningWorkItem | null>(null);

  // Resource dialog state
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<PlanningResource | null>(null);

  // Add from Staff dialog state
  const [addFromUsersDialogOpen, setAddFromUsersDialogOpen] = useState(false);

  // Delete confirmation state
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);

  // Planning summary state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [drilldownSummary, setDrilldownSummary] = useState<PlanningWorkItem | null>(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [summaryGroupingType, setSummaryGroupingType] = useState<PlanningSummaryType>('stage');

  // Separate summary items from manual planning items
  const summaryItems = useMemo(() => {
    return planningTasks.filter((t) => !!t.summarizes);
  }, [planningTasks]);

  const manualPlanningItems = useMemo(() => {
    return planningTasks.filter((t) => !t.summarizes);
  }, [planningTasks]);

  // Check if project has production tasks to summarize
  const hasProductionTasks = useMemo(() => {
    return (project.workItems || []).some((w) => w.kind === 'production');
  }, [project.workItems]);

  // ============================================
  // PLANNING SUMMARY ACTIONS
  // ============================================

  async function handleGeneratePlanningSummary(summaryType: 'stage' | 'procedure' = 'stage') {
    setIsGeneratingSummary(true);
    try {
      const result = await PlanningSummaryService.generateSummaries(
        project.id,
        {
          summaryType,
          boatInstanceId: undefined, // No boat instance filter for now
          defaultAutoSyncDates: 'whenUnlocked',
        },
        getAuditContext()
      );

      if (result.ok) {
        await onRefresh();
      } else {
        // Silent fail - no alerts as per requirements
        console.error('Failed to generate summaries:', result.error);
      }
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  async function handleRefreshSummary(summaryId: string) {
    const result = await PlanningSummaryService.refreshSummary(
      project.id,
      summaryId,
      getAuditContext()
    );

    if (result.ok) {
      await onRefresh();
    } else {
      alert(`Failed to refresh summary: ${result.error}`);
    }
  }

  async function handleRecalculateDates(summaryId: string) {
    const result = await PlanningSummaryService.recalculateDates(
      project.id,
      summaryId,
      getAuditContext()
    );

    if (result.ok) {
      await onRefresh();
    } else {
      alert(`Failed to recalculate dates: ${result.error}`);
    }
  }

  async function handleUpdateAutoSyncMode(summaryId: string, mode: AutoSyncDatesMode) {
    const result = await PlanningSummaryService.updateAutoSyncMode(
      project.id,
      summaryId,
      mode,
      getAuditContext()
    );

    if (result.ok) {
      await onRefresh();
    }
    // Silent fail - no alerts as per requirements
  }

  function handleOpenDrilldown(summary: PlanningWorkItem) {
    setDrilldownSummary(summary);
    setShowDrilldown(true);
  }

  // ============================================
  // TASK CRUD
  // ============================================

  function handleOpenAddTask() {
    setEditingTask(null);
    setTaskDialogOpen(true);
  }

  function handleOpenEditTask(task: PlanningWorkItem) {
    setEditingTask(task);
    setTaskDialogOpen(true);
  }

  async function handleSaveTask(taskData: Partial<PlanningWorkItem>) {
    const currentWorkItems = [...(project.workItems || [])];
    const currentTimestamp = now();

    if (editingTask) {
      // Update existing task
      const index = currentWorkItems.findIndex((t) => t.id === editingTask.id);
      if (index >= 0) {
        const existingTask = currentWorkItems[index];

        // Check if this is a summary and if dates were changed
        let updatedSummarizes = existingTask.summarizes;
        if (existingTask.summarizes) {
          const datesChanged =
            taskData.startDate !== existingTask.startDate ||
            taskData.endDate !== existingTask.endDate;

          if (datesChanged) {
            // Lock dates when user manually edits them
            updatedSummarizes = {
              ...existingTask.summarizes,
              datesLocked: true,
            };
          }
        }

        currentWorkItems[index] = {
          ...existingTask,
          ...taskData,
          summarizes: updatedSummarizes,
          updatedAt: currentTimestamp,
          version: existingTask.version + 1,
        };
      }
    } else {
      // Add new planning work item
      const maxNumber = currentWorkItems.reduce(
        (max, w) => Math.max(max, w.workItemNumber || 0),
        0
      );
      const newWorkItem: PlanningWorkItem = {
        id: generateUUID(),
        projectId: project.id,
        workItemNumber: maxNumber + 1,
        kind: 'planning',
        title: taskData.title || 'Untitled Task',
        status: taskData.status || 'TODO',
        startDate: taskData.startDate,
        endDate: taskData.endDate,
        durationDays: taskData.durationDays,
        assigneeIds: taskData.assigneeIds || [],
        dependsOnIds: taskData.dependsOnIds || [],
        notes: taskData.notes,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
        version: 0,
        createdBy: 'user', // TODO: Get from context
      };
      currentWorkItems.push(newWorkItem);
    }

    await ProjectRepository.update(project.id, {
      workItems: currentWorkItems,
    });

    setTaskDialogOpen(false);
    setEditingTask(null);
    await onRefresh();
  }

  async function handleDeleteTask() {
    if (!deleteTaskId) return;

    const updatedWorkItems = (project.workItems || []).filter((t) => t.id !== deleteTaskId);

    // Also remove this task from any dependsOnIds
    const cleanedWorkItems = updatedWorkItems.map((t) => ({
      ...t,
      dependsOnIds: t.dependsOnIds?.filter((id) => id !== deleteTaskId),
    }));

    await ProjectRepository.update(project.id, {
      workItems: cleanedWorkItems,
    });

    setDeleteTaskId(null);
    await onRefresh();
  }

  // Handle Gantt date updates (direct manipulation)
  async function handleUpdateTaskDates(taskId: string, startDate: string, endDate: string) {
    const currentWorkItems = [...(project.workItems || [])];
    const index = currentWorkItems.findIndex((t) => t.id === taskId);
    if (index < 0) return;

    // Update only this task with explicit startDate and endDate
    // Clear durationDays since we now have explicit dates
    currentWorkItems[index] = {
      ...currentWorkItems[index],
      startDate,
      endDate,
      durationDays: undefined,
      updatedAt: now(),
      version: currentWorkItems[index].version + 1,
    };

    await ProjectRepository.update(project.id, {
      workItems: currentWorkItems,
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

  function handleOpenAddResourceFromUsers() {
    setAddFromUsersDialogOpen(true);
  }

  /**
   * GOVERNANCE: Staff concept removed in v323 — uses User instead.
   * Creates a planning resource from a User record (one-time copy, no sync).
   */
  async function handleAddResourceFromUser(user: User) {
    // Check if resource with same name already exists
    const existingResource = resources.find(
      (r) => r.name.toLowerCase() === user.name.toLowerCase()
    );
    if (existingResource) {
      // Resource already exists - silently skip (shouldn't happen as UI filters these)
      return;
    }

    // Create new resource from user (one-time copy, no sync)
    // v324: Store sourceUserId for stable identity resolution
    const newResource: PlanningResource = {
      id: generateUUID(),
      name: user.name,
      role: user.department, // Use department as role hint (was Staff.label)
      sourceUserId: user.id, // v324: Enable stable identity even if name changes
    };

    const currentResources = [...resources, newResource];

    await ProjectRepository.update(project.id, {
      planning: {
        ...project.planning,
        resources: currentResources,
      },
    });

    setAddFromUsersDialogOpen(false);
    await onRefresh();
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

    // Also remove this resource from any assigneeIds in workItems
    const cleanedWorkItems = (project.workItems || []).map((t) => ({
      ...t,
      assigneeIds: t.assigneeIds?.filter((id) => id !== deleteResourceId),
    }));

    await ProjectRepository.update(project.id, {
      workItems: cleanedWorkItems,
      planning: {
        ...project.planning,
        resources: updatedResources,
      },
    });

    setDeleteResourceId(null);
    await onRefresh();
  }

  /**
   * Quick-add resource from user (used in task dialog)
   * GOVERNANCE: Staff concept removed in v323 — uses User instead.
   */
  async function handleQuickAddResourceFromUser(user: User): Promise<PlanningResource> {
    // Check if resource with same name already exists
    const existingResource = resources.find(
      (r) => r.name.toLowerCase() === user.name.toLowerCase()
    );
    if (existingResource) {
      return existingResource; // Just return existing
    }

    // Create new resource from user
    // v324: Store sourceUserId for stable identity resolution
    const newResource: PlanningResource = {
      id: generateUUID(),
      name: user.name,
      role: user.department, // Use department as role hint (was Staff.label)
      sourceUserId: user.id, // v324: Enable stable identity even if name changes
    };

    const currentResources = [...resources, newResource];

    await ProjectRepository.update(project.id, {
      planning: {
        ...project.planning,
        resources: currentResources,
      },
    });

    // Don't call onRefresh here as we're in the middle of task editing
    // The resource list will be refreshed when task dialog closes
    // But we need to update local state for immediate selection
    return newResource;
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
    return planningTasks.find((t) => t.id === taskId)?.title || 'Unknown';
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Gantt Chart Section */}
      <GanttChart
        tasks={planningTasks}
        resources={resources}
        isReadOnly={isReadOnly}
        onEditTask={handleOpenEditTask}
        onUpdateTaskDates={handleUpdateTaskDates}
      />

      {/* Planning Summaries Section */}
      {summaryItems.length > 0 && (
        <Card data-testid="planning-summaries-section">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-600" />
                Planning Summaries
                <Badge variant="outline" className="ml-1">{summaryItems.length}</Badge>
              </CardTitle>
              <CardDescription>
                Summaries grouped by {summaryGroupingType === 'stage' ? 'production stage' : 'procedure'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Grouping selector */}
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="summary-grouping" className="text-sm text-slate-600 whitespace-nowrap">
                    Group by:
                  </Label>
                  <Select
                    value={summaryGroupingType}
                    onValueChange={(v) => setSummaryGroupingType(v as PlanningSummaryType)}
                  >
                    <SelectTrigger id="summary-grouping" className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isReadOnly && (
                <Button
                  onClick={() => handleGeneratePlanningSummary(summaryGroupingType)}
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingSummary || !hasProductionTasks}
                >
                  {isGeneratingSummary ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh Summaries
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Summary</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Date Sync</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Tasks</TableHead>
                  <TableHead className="text-right">Est. Hours</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryItems.map((summary) => {
                  const isLocked = summary.summarizes?.datesLocked;
                  const usedStageFallback = summary.summarizes?.usedStageFallback;
                  const isStageType = summary.summarizes?.summaryType === 'stage';
                  const summarizes = summary.summarizes;
                  // Determine label based on summary type
                  let summaryLabel: string;
                  let summaryTypeLabel: string;
                  if (summarizes?.summaryType === 'stage') {
                    summaryLabel = summary.title;
                    summaryTypeLabel = 'Stage';
                  } else if (summarizes?.summaryType === 'procedure') {
                    summaryLabel = summary.title;
                    summaryTypeLabel = 'Procedure';
                  } else if (summarizes?.category) {
                    summaryLabel = CATEGORY_LABELS[summarizes.category];
                    summaryTypeLabel = 'Category';
                  } else {
                    summaryLabel = summary.title;
                    summaryTypeLabel = 'Summary';
                  }
                  return (
                    <TableRow key={summary.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-slate-50">
                            {summaryLabel}
                          </Badge>
                          <span className="text-xs text-slate-400">{summaryTypeLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-slate-600">
                            {formatDateRange(summary.startDate, summary.endDate)}
                          </span>
                          {/* Stage fallback indicator - only for stage summaries with fallback */}
                          {isStageType && usedStageFallback && !isLocked && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-blue-500 cursor-help">
                                    <CalendarClock className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">
                                    Dates from Stage (production tasks have no dates)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {/* Lock indicator - primary when locked */}
                          {isLocked && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-amber-500 cursor-help">
                                    <Lock className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">
                                    Dates locked (manually edited)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      {/* Date Sync dropdown */}
                      <TableCell>
                        {!isReadOnly ? (
                          <Select
                            value={summarizes?.autoSyncDates ?? 'whenUnlocked'}
                            onValueChange={(v) => handleUpdateAutoSyncMode(summary.id, v as AutoSyncDatesMode)}
                          >
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DATE_SYNC_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className="text-xs">{opt.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {DATE_SYNC_OPTIONS.find((o) => o.value === (summarizes?.autoSyncDates ?? 'whenUnlocked'))?.label || 'When Unlocked'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(summary.status)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {summary.summarizes?.productionWorkItemIds?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {summary.estimatedHours ? `${summary.estimatedHours}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleOpenDrilldown(summary)}
                            title="View production tasks"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {!isReadOnly && isLocked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                              onClick={() => handleRecalculateDates(summary.id)}
                              title="Recalculate dates from production tasks"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          {!isReadOnly && !isLocked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleRefreshSummary(summary.id)}
                              title="Refresh summary"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tasks Section (manual planning items) */}
      <Card data-testid="planning-tasks-section">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-teal-600" />
              Planning Items
            </CardTitle>
            <CardDescription>
              {summaryItems.length > 0
                ? 'Additional manual planning items (not auto-generated summaries)'
                : 'Planning tasks for production scheduling'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && hasProductionTasks && summaryItems.length === 0 && (
              <>
                {/* Grouping selector */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="summary-grouping-init" className="text-sm text-slate-600 whitespace-nowrap">
                    Group by:
                  </Label>
                  <Select
                    value={summaryGroupingType}
                    onValueChange={(v) => setSummaryGroupingType(v as PlanningSummaryType)}
                  >
                    <SelectTrigger id="summary-grouping-init" className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => handleGeneratePlanningSummary(summaryGroupingType)}
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingSummary}
                  title={`Generate planning summaries from production tasks grouped by ${summaryGroupingType}`}
                >
                  {isGeneratingSummary ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4 mr-1" />
                  )}
                  Generate Summary
                </Button>
              </>
            )}
            {!isReadOnly && (
              <Button onClick={handleOpenAddTask} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {planningTasks.length === 0 ? (
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
                {planningTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDateRange(task.startDate, task.endDate)}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-center">
                      {(task.assigneeIds?.length || 0) > 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {task.assigneeIds?.length}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(task.dependsOnIds?.length || 0) > 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <Link2 className="h-3 w-3" />
                          {task.dependsOnIds?.length}
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
            <div className="flex items-center gap-2">
              <Button onClick={handleOpenAddResourceFromUsers} variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Add from Users
              </Button>
              <Button onClick={handleOpenAddResource} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Resource
              </Button>
            </div>
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

      {/* Task Dialog - using unified PlanningTaskDialog */}
      <PlanningTaskDialog
        mode="controlled"
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) {
            setEditingTask(null);
            // Refresh to pick up any quick-added resources
            onRefresh();
          }
        }}
        task={editingTask}
        resources={resources}
        tasks={planningTasks}
        onSave={handleSaveTask}
        onQuickAddResource={handleQuickAddResourceFromUser}
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

      {/* Add from Users Dialog — Staff concept removed in v323 */}
      <AddFromUsersDialog
        open={addFromUsersDialogOpen}
        onOpenChange={setAddFromUsersDialogOpen}
        existingResourceNames={resources.map((r) => r.name.toLowerCase())}
        onAdd={handleAddResourceFromUser}
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

      {/* Planning Summary Drilldown */}
      <PlanningSummaryDrilldown
        open={showDrilldown}
        onOpenChange={setShowDrilldown}
        projectId={project.id}
        summary={drilldownSummary}
      />
    </div>
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

// ============================================
// ADD FROM USERS DIALOG
// ============================================
// GOVERNANCE: Staff concept removed in v323 — uses User instead.

interface AddFromUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingResourceNames: string[];
  onAdd: (user: User) => Promise<void>;
}

function AddFromUsersDialog({
  open,
  onOpenChange,
  existingResourceNames,
  onAdd,
}: AddFromUsersDialogProps) {
  const [userList, setUserList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load users when dialog opens
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSearchQuery('');
      loadUsers();
    }
  }

  async function loadUsers() {
    setIsLoading(true);
    try {
      const allUsers = await AuthService.getAllUsers();
      const activeUsers = allUsers.filter((u) => u.isActive);
      activeUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUserList(activeUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter users based on search and exclude already-added
  const availableUsers = userList.filter((u) => {
    // Exclude already added resources (by name, case-insensitive)
    if (existingResourceNames.includes(u.name.toLowerCase())) {
      return false;
    }
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.department?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  async function handleAdd(user: User) {
    setIsAdding(true);
    try {
      await onAdd(user);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" />
            Add from Users
          </DialogTitle>
          <DialogDescription>
            Select a user to add as a planning resource. This creates a copy (no sync).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Search */}
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          {/* User list */}
          <div className="border rounded-md max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-slate-500">Loading users...</div>
            ) : availableUsers.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                {userList.length === 0
                  ? 'No users defined yet. Go to Settings → Users to add users.'
                  : searchQuery
                    ? 'No matching users found.'
                    : 'All users are already added as resources.'}
              </div>
            ) : (
              <div className="divide-y">
                {availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-teal-700">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        {user.department && (
                          <p className="text-xs text-slate-500">{user.department}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdd(user)}
                      disabled={isAdding}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info note */}
          <p className="text-xs text-slate-500 mt-3">
            Resources are copied from users. Changes to user list won't affect existing resources.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
