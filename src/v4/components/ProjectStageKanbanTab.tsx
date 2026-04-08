/**
 * Project Stage Kanban Tab - v4
 * Kanban-style board for production tasks organized by production stages.
 *
 * Columns: One per ProductionStage (ordered by `order`), plus "Unassigned" on the left
 * Cards: WorkItems where kind === 'production'
 * Drag-and-drop:
 * - Between columns: Changes stageId via TaskService.updateWorkItem
 * - Within column: Reorders tasks by updating stageSortOrder
 */

'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Layers,
  User,
  Calendar,
  GripVertical,
  AlertCircle,
  Clock,
  CheckCircle,
  Pause,
  XCircle,
  MoreVertical,
  Plus,
  FileText,
} from 'lucide-react';
import type { Project, WorkItem, ProductionStage, WorkItemStatus } from '@/domain/models';
import { TaskService } from '@/domain/services';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { LinkedInstructionIndicator } from '@/v4/components/WorkInstructionQuickView';

// ============================================
// TYPES
// ============================================

interface ProjectStageKanbanTabProps {
  project: Project;
  onRefresh: () => Promise<void>;
  onOpenTaskDialog: (task: WorkItem | null) => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  stageId: string | null; // null for "Unassigned"
  tasks: WorkItem[];
  stage: ProductionStage | null;
  order: number;
}

interface DropPosition {
  columnId: string;
  insertBeforeTaskId: string | null; // null means drop at the end
}

// ============================================
// STATUS STYLING
// ============================================

const STATUS_CONFIG: Record<WorkItemStatus, {
  icon: typeof CheckCircle;
  color: string;
  bg: string;
  label: string;
}> = {
  TODO: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100', label: 'To Do' },
  IN_PROGRESS: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Progress' },
  ON_HOLD: { icon: Pause, color: 'text-amber-600', bg: 'bg-amber-100', label: 'On Hold' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Completed' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Cancelled' },
};

// ============================================
// HELPER: Sort tasks by stageSortOrder
// ============================================

function sortTasksByOrder(tasks: WorkItem[]): WorkItem[] {
  return [...tasks].sort((a, b) => {
    // Use stageSortOrder if available, otherwise fall back to workItemNumber
    const orderA = a.stageSortOrder ?? a.workItemNumber * 1000;
    const orderB = b.stageSortOrder ?? b.workItemNumber * 1000;
    return orderA - orderB;
  });
}

// ============================================
// KANBAN CARD COMPONENT
// ============================================

interface KanbanCardProps {
  task: WorkItem;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragOver: (e: React.DragEvent, taskId: string) => void;
  isDragging: boolean;
  showDropIndicatorBefore: boolean;
}

function KanbanCard({
  task,
  onClick,
  onDragStart,
  onDragOver,
  isDragging,
  showDropIndicatorBefore,
}: KanbanCardProps) {
  const statusConfig = STATUS_CONFIG[task.status];
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getAssigneeDisplay = () => {
    if (!task.assigneeIds || task.assigneeIds.length === 0) return null;
    return task.assigneeIds[0];
  };

  return (
    <div className="relative">
      {/* Drop indicator before this card */}
      {showDropIndicatorBefore && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-teal-500 rounded-full z-10" />
      )}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        onDragOver={(e) => onDragOver(e, task.id)}
        onClick={onClick}
        className={`bg-white border rounded-lg p-3 mb-2 cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all group ${
          isDragging ? 'opacity-50 border-teal-400' : 'border-slate-200'
        }`}
        data-task-id={task.id}
      >
        {/* Drag handle and title row */}
        <div className="flex items-start gap-2">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5">
            <GripVertical className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-900 line-clamp-2">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Status and metadata row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 text-[10px] py-0 px-1.5`}>
            <StatusIcon className="h-3 w-3 mr-0.5" />
            {statusConfig.label}
          </Badge>

          {task.category && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {task.category}
            </Badge>
          )}

          {getAssigneeDisplay() && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <User className="h-3 w-3" />
              {getAssigneeDisplay()}
            </span>
          )}

          {(task.dueDate || task.startDate || task.endDate) && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate || task.startDate || task.endDate)}
            </span>
          )}
        </div>

        {/* Work instruction link */}
        {task.workInstructionId && (
          <div className="mt-2">
            <LinkedInstructionIndicator workInstructionId={task.workInstructionId} />
          </div>
        )}

        {/* Task number for reference */}
        <div className="mt-2 text-[10px] text-slate-400 font-mono">
          #{task.workItemNumber}
        </div>
      </div>
    </div>
  );
}

// ============================================
// KANBAN COLUMN COMPONENT
// ============================================

interface KanbanColumnProps {
  column: KanbanColumn;
  onCardClick: (task: WorkItem) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragOver: (e: React.DragEvent, columnId: string, taskId: string | null) => void;
  onDrop: (e: React.DragEvent) => void;
  isDropTarget: boolean;
  draggedTaskId: string | null;
  dropPosition: DropPosition | null;
}

function KanbanColumn({
  column,
  onCardClick,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
  draggedTaskId,
  dropPosition,
}: KanbanColumnProps) {
  // Count tasks by status
  const todoCount = column.tasks.filter(t => t.status === 'TODO').length;
  const inProgressCount = column.tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completedCount = column.tasks.filter(t => t.status === 'COMPLETED').length;

  // Get stage status badge color
  const getStageStatusColor = () => {
    if (!column.stage) return 'bg-slate-200 text-slate-700';
    switch (column.stage.status) {
      case 'NOT_STARTED': return 'bg-slate-200 text-slate-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'BLOCKED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-200 text-slate-700';
    }
  };

  // Handle drag over the column empty area (for dropping at the end)
  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're over the empty area (not over a card)
    const target = e.target as HTMLElement;
    if (!target.closest('[data-task-id]')) {
      onDragOver(e, column.id, null);
    }
  };

  // Check if drop indicator should show at the end of the column
  const showDropIndicatorAtEnd =
    dropPosition?.columnId === column.id &&
    dropPosition?.insertBeforeTaskId === null &&
    column.tasks.length > 0;

  return (
    <div
      className={`flex-shrink-0 w-72 flex flex-col bg-slate-50 rounded-lg border transition-colors ${
        isDropTarget ? 'border-teal-400 bg-teal-50/50' : 'border-slate-200'
      }`}
      onDragOver={handleColumnDragOver}
      onDrop={onDrop}
      data-column-id={column.id}
    >
      {/* Column header */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-sm text-slate-900 truncate">
            {column.title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {column.tasks.length}
          </Badge>
        </div>

        {/* Stage status / progress indicators */}
        <div className="flex items-center gap-2 text-[10px]">
          {column.stage && (
            <Badge className={`${getStageStatusColor()} border-0 py-0 px-1.5`}>
              {column.stage.status.replace('_', ' ')}
            </Badge>
          )}
          {column.tasks.length > 0 && (
            <div className="flex items-center gap-1 text-slate-500">
              <span className="text-slate-400">{todoCount} todo</span>
              <span className="text-blue-500">{inProgressCount} active</span>
              <span className="text-green-500">{completedCount} done</span>
            </div>
          )}
        </div>
      </div>

      {/* Column content - scrollable */}
      <div className="flex-1 p-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-350px)]">
        {column.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
            <Layers className="h-8 w-8 mb-2 opacity-50" />
            <p>No tasks</p>
            <p className="text-xs mt-1">Drag tasks here</p>
          </div>
        ) : (
          <>
            {column.tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onClick={() => onCardClick(task)}
                onDragStart={onDragStart}
                onDragOver={(e, taskId) => onDragOver(e, column.id, taskId)}
                isDragging={draggedTaskId === task.id}
                showDropIndicatorBefore={
                  dropPosition?.columnId === column.id &&
                  dropPosition?.insertBeforeTaskId === task.id &&
                  draggedTaskId !== task.id
                }
              />
            ))}
            {/* Drop indicator at the end of the column */}
            {showDropIndicatorAtEnd && (
              <div className="h-1 bg-teal-500 rounded-full mb-2" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN KANBAN TAB COMPONENT
// ============================================

export function ProjectStageKanbanTab({
  project,
  onRefresh,
  onOpenTaskDialog,
}: ProjectStageKanbanTabProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter to only production work items
  const productionTasks = useMemo(() => {
    return (project.workItems || []).filter((w) => w.kind === 'production');
  }, [project.workItems]);

  // Get ordered production stages
  const orderedStages = useMemo(() => {
    return [...(project.productionStages || [])].sort((a, b) => a.order - b.order);
  }, [project.productionStages]);

  // Build columns: "Unassigned" + one per stage
  const columns = useMemo((): KanbanColumn[] => {
    // Unassigned column (tasks without stageId)
    const unassignedTasks = productionTasks.filter((t) => !t.stageId);
    const unassignedColumn: KanbanColumn = {
      id: 'unassigned',
      title: 'Unassigned',
      stageId: null,
      tasks: sortTasksByOrder(unassignedTasks),
      stage: null,
      order: -1,
    };

    // Stage columns
    const stageColumns: KanbanColumn[] = orderedStages.map((stage) => {
      const stageTasks = productionTasks.filter((t) => t.stageId === stage.id);
      return {
        id: stage.id,
        title: stage.name,
        stageId: stage.id,
        tasks: sortTasksByOrder(stageTasks),
        stage,
        order: stage.order,
      };
    });

    return [unassignedColumn, ...stageColumns];
  }, [productionTasks, orderedStages]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string, insertBeforeTaskId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropPosition({ columnId, insertBeforeTaskId });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');

    if (!taskId || isUpdating || !dropPosition) {
      handleDragEnd();
      return;
    }

    // Find the task being dragged
    const task = productionTasks.find((t) => t.id === taskId);
    if (!task) {
      handleDragEnd();
      return;
    }

    // Find the target column
    const targetColumn = columns.find((c) => c.id === dropPosition.columnId);
    if (!targetColumn) {
      handleDragEnd();
      return;
    }

    // Determine if this is a same-column reorder or a cross-column move
    const currentColumnId = task.stageId || 'unassigned';
    const isSameColumn = currentColumnId === dropPosition.columnId;

    // Get the target stage ID (null for unassigned)
    const targetStageId = targetColumn.stageId;

    setIsUpdating(true);
    const context = getDefaultAuditContext();

    try {
      if (isSameColumn) {
        // Reorder within the same column
        const columnTasks = [...targetColumn.tasks];

        // Remove the dragged task from its current position
        const currentIndex = columnTasks.findIndex((t) => t.id === taskId);
        if (currentIndex === -1) {
          handleDragEnd();
          return;
        }
        columnTasks.splice(currentIndex, 1);

        // Find the insert position
        let insertIndex: number;
        if (dropPosition.insertBeforeTaskId === null) {
          // Insert at the end
          insertIndex = columnTasks.length;
        } else {
          insertIndex = columnTasks.findIndex((t) => t.id === dropPosition.insertBeforeTaskId);
          if (insertIndex === -1) insertIndex = columnTasks.length;
        }

        // Insert the task at the new position
        columnTasks.splice(insertIndex, 0, task);

        // Calculate new sort orders for all tasks in the column
        const updates: Array<{ id: string; stageSortOrder: number }> = [];
        columnTasks.forEach((t, index) => {
          const newSortOrder = (index + 1) * 100; // Use 100 increments for future insertions
          if (t.stageSortOrder !== newSortOrder) {
            updates.push({ id: t.id, stageSortOrder: newSortOrder });
          }
        });

        // Update all affected tasks
        for (const update of updates) {
          await TaskService.updateWorkItem(
            project.id,
            update.id,
            { stageSortOrder: update.stageSortOrder },
            context
          );
        }
      } else {
        // Move to a different column
        // Get the tasks in the target column
        const targetTasks = [...targetColumn.tasks];

        // Find insert position
        let insertIndex: number;
        if (dropPosition.insertBeforeTaskId === null) {
          insertIndex = targetTasks.length;
        } else {
          insertIndex = targetTasks.findIndex((t) => t.id === dropPosition.insertBeforeTaskId);
          if (insertIndex === -1) insertIndex = targetTasks.length;
        }

        // Calculate the new sort order
        let newSortOrder: number;
        if (targetTasks.length === 0) {
          newSortOrder = 100;
        } else if (insertIndex === 0) {
          // Insert at the beginning
          const firstTaskOrder = targetTasks[0].stageSortOrder ?? 100;
          newSortOrder = Math.max(1, firstTaskOrder - 100);
        } else if (insertIndex >= targetTasks.length) {
          // Insert at the end
          const lastTaskOrder = targetTasks[targetTasks.length - 1].stageSortOrder ?? (targetTasks.length * 100);
          newSortOrder = lastTaskOrder + 100;
        } else {
          // Insert in the middle
          const prevTaskOrder = targetTasks[insertIndex - 1].stageSortOrder ?? ((insertIndex) * 100);
          const nextTaskOrder = targetTasks[insertIndex].stageSortOrder ?? ((insertIndex + 1) * 100);
          newSortOrder = Math.floor((prevTaskOrder + nextTaskOrder) / 2);

          // If there's no room, rebalance the entire column
          if (newSortOrder <= prevTaskOrder || newSortOrder >= nextTaskOrder) {
            // Rebalance: assign new sort orders to all tasks
            const allTasks = [...targetTasks];
            allTasks.splice(insertIndex, 0, task);
            for (let i = 0; i < allTasks.length; i++) {
              const t = allTasks[i];
              const sortOrder = (i + 1) * 100;
              if (t.id === taskId) {
                newSortOrder = sortOrder;
              } else if (t.stageSortOrder !== sortOrder) {
                await TaskService.updateWorkItem(project.id, t.id, { stageSortOrder: sortOrder }, context);
              }
            }
          }
        }

        // Update the dragged task with new stage and sort order
        const result = await TaskService.updateWorkItem(
          project.id,
          taskId,
          {
            stageId: targetStageId || undefined,
            stageSortOrder: newSortOrder,
          },
          context
        );

        if (!result.ok) {
          console.error('Failed to update task:', result.error);
          alert(`Failed to move task: ${result.error}`);
        }
      }

      await onRefresh();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsUpdating(false);
      handleDragEnd();
    }
  }, [project.id, productionTasks, columns, dropPosition, isUpdating, onRefresh, handleDragEnd]);

  // Handle card click
  const handleCardClick = useCallback((task: WorkItem) => {
    onOpenTaskDialog(task);
  }, [onOpenTaskDialog]);

  // Empty state when no stages exist
  if (orderedStages.length === 0 && productionTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Layers className="h-12 w-12 mb-4 text-slate-300" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">No Production Stages</h3>
        <p className="text-sm text-center max-w-md">
          Production stages are created when the project enters the "In Production" status.
          Create production tasks first in the Production tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" onDragEnd={handleDragEnd}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-600" />
            Production Kanban
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Drag tasks between stages or reorder within a column. Click a card to edit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {productionTasks.length} tasks
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenTaskDialog(null)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCardClick={handleCardClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDropTarget={dropPosition?.columnId === column.id && draggedTaskId !== null}
              draggedTaskId={draggedTaskId}
              dropPosition={dropPosition}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Loading overlay */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent" />
            <span className="text-sm text-slate-600">Updating...</span>
          </div>
        </div>
      )}
    </div>
  );
}
