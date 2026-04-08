/**
 * Production Screen - v4 Portfolio Level
 * Shows all projects in production with their own Kanban boards.
 * Each project card displays columns for production stages with tasks.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Factory,
  Ship,
  Layers,
  User,
  Calendar,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Clock,
  CheckCircle,
  Pause,
  XCircle,
  AlertCircle,
  ExternalLink,
  FileText,
} from 'lucide-react';
import type {
  Project,
  WorkItem,
  ProductionStage,
  WorkItemStatus,
} from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { TaskService } from '@/domain/services';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LinkedInstructionIndicator } from '@/v4/components/WorkInstructionQuickView';

// ============================================
// TYPES
// ============================================

interface ProductionScreenProps {
  onNavigateToProject?: (projectId: string) => void;
}

interface ProjectKanbanData {
  project: Project;
  stages: ProductionStage[];
  tasksByStage: Map<string | null, WorkItem[]>;
  totalTasks: number;
  completedTasks: number;
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
// HELPER FUNCTIONS
// ============================================

function sortTasksByOrder(tasks: WorkItem[]): WorkItem[] {
  return [...tasks].sort((a, b) => {
    const orderA = a.stageSortOrder ?? a.workItemNumber * 1000;
    const orderB = b.stageSortOrder ?? b.workItemNumber * 1000;
    return orderA - orderB;
  });
}

function getStageStatusColor(status: ProductionStage['status']): string {
  switch (status) {
    case 'NOT_STARTED': return 'bg-slate-200 text-slate-700';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
    case 'COMPLETED': return 'bg-green-100 text-green-700';
    case 'BLOCKED': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-200 text-slate-700';
  }
}

// ============================================
// MINI TASK CARD COMPONENT
// ============================================

interface MiniTaskCardProps {
  task: WorkItem;
  onDragStart: (e: React.DragEvent, projectId: string, taskId: string) => void;
  projectId: string;
  isDragging: boolean;
}

function MiniTaskCard({ task, onDragStart, projectId, isDragging }: MiniTaskCardProps) {
  const statusConfig = STATUS_CONFIG[task.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, projectId, task.id)}
      className={`bg-white border rounded p-2 mb-1.5 cursor-grab active:cursor-grabbing hover:border-teal-300 transition-all text-xs group ${
        isDragging ? 'opacity-50 border-teal-400' : 'border-slate-200'
      }`}
      data-task-id={task.id}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 line-clamp-2 leading-tight">
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 text-[9px] py-0 px-1`}>
              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
              {statusConfig.label}
            </Badge>
            {task.assigneeIds?.[0] && (
              <span className="flex items-center gap-0.5 text-[9px] text-slate-500">
                <User className="h-2.5 w-2.5" />
                {task.assigneeIds[0]}
              </span>
            )}
            {task.workInstructionId && (
              <LinkedInstructionIndicator
                workInstructionId={task.workInstructionId}
                compact
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STAGE COLUMN COMPONENT
// ============================================

interface StageColumnProps {
  stage: ProductionStage | null;
  stageId: string | null;
  title: string;
  tasks: WorkItem[];
  projectId: string;
  onDragStart: (e: React.DragEvent, projectId: string, taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, projectId: string, stageId: string | null) => void;
  isDropTarget: boolean;
  draggedTaskId: string | null;
}

function StageColumn({
  stage,
  stageId,
  title,
  tasks,
  projectId,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
  draggedTaskId,
}: StageColumnProps) {
  return (
    <div
      className={`flex-shrink-0 w-44 flex flex-col rounded border transition-colors ${
        isDropTarget ? 'border-teal-400 bg-teal-50/50' : 'border-slate-200 bg-slate-50/50'
      }`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, projectId, stageId)}
      data-stage-id={stageId || 'unassigned'}
    >
      {/* Column header */}
      <div className="p-2 border-b border-slate-200 bg-white/50 rounded-t">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-xs text-slate-700 truncate">{title}</h4>
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {tasks.length}
          </Badge>
        </div>
        {stage && (
          <Badge className={`${getStageStatusColor(stage.status)} border-0 text-[9px] py-0 px-1 mt-1`}>
            {stage.status.replace('_', ' ')}
          </Badge>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 p-1.5 overflow-y-auto max-h-48 min-h-[60px]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-[10px]">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <MiniTaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              onDragStart={onDragStart}
              isDragging={draggedTaskId === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// PROJECT KANBAN CARD COMPONENT
// ============================================

interface ProjectKanbanCardProps {
  data: ProjectKanbanData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigateToProject?: (projectId: string) => void;
  onDragStart: (e: React.DragEvent, projectId: string, taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, projectId: string, stageId: string | null) => void;
  dragState: { projectId: string; taskId: string } | null;
  dropTargetStage: { projectId: string; stageId: string | null } | null;
}

function ProjectKanbanCard({
  data,
  isExpanded,
  onToggleExpand,
  onNavigateToProject,
  onDragStart,
  onDragOver,
  onDrop,
  dragState,
  dropTargetStage,
}: ProjectKanbanCardProps) {
  const { project, stages, tasksByStage, totalTasks, completedTasks } = data;

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Build columns: Unassigned + stages
  const columns = useMemo(() => {
    const unassignedTasks = tasksByStage.get(null) || [];
    const cols: Array<{
      id: string | null;
      title: string;
      stage: ProductionStage | null;
      tasks: WorkItem[];
    }> = [];

    // Add unassigned column if there are unassigned tasks
    if (unassignedTasks.length > 0) {
      cols.push({
        id: null,
        title: 'Unassigned',
        stage: null,
        tasks: sortTasksByOrder(unassignedTasks),
      });
    }

    // Add stage columns
    for (const stage of stages) {
      const stageTasks = tasksByStage.get(stage.id) || [];
      cols.push({
        id: stage.id,
        title: stage.name,
        stage,
        tasks: sortTasksByOrder(stageTasks),
      });
    }

    return cols;
  }, [stages, tasksByStage]);

  return (
    <Card className="mb-4">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
                <Ship className="h-5 w-5 text-teal-600" />
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {project.title}
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-mono">
                    {project.projectNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 w-12 text-right">
                    {completedTasks}/{totalTasks}
                  </span>
                </div>

                {/* Status badge */}
                <Badge
                  variant="outline"
                  className={
                    project.status === 'IN_PRODUCTION'
                      ? 'border-blue-300 text-blue-700 bg-blue-50'
                      : project.status === 'READY_FOR_DELIVERY'
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-slate-300 text-slate-600'
                  }
                >
                  {project.status.replace(/_/g, ' ')}
                </Badge>

                {/* Navigate button */}
                {onNavigateToProject && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToProject(project.id);
                    }}
                    title="Open project"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3">
            {columns.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                <Layers className="h-5 w-5 mr-2" />
                No production stages or tasks
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {columns.map((col) => (
                    <StageColumn
                      key={col.id || 'unassigned'}
                      stage={col.stage}
                      stageId={col.id}
                      title={col.title}
                      tasks={col.tasks}
                      projectId={project.id}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      isDropTarget={
                        dropTargetStage?.projectId === project.id &&
                        dropTargetStage?.stageId === col.id
                      }
                      draggedTaskId={
                        dragState?.projectId === project.id ? dragState.taskId : null
                      }
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// MAIN PRODUCTION SCREEN COMPONENT
// ============================================

export function ProductionScreen({ onNavigateToProject }: ProductionScreenProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  // Drag state
  const [dragState, setDragState] = useState<{ projectId: string; taskId: string } | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<{ projectId: string; stageId: string | null } | null>(null);

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    try {
      const allProjects = await ProjectRepository.getAll();
      // Filter to projects that are in production or have production stages/tasks
      const productionProjects = allProjects.filter((p) => {
        const hasProductionStages = (p.productionStages?.length || 0) > 0;
        const hasProductionTasks = (p.workItems || []).some((w) => w.kind === 'production');
        const isInProduction = ['IN_PRODUCTION', 'READY_FOR_DELIVERY'].includes(p.status);
        return isInProduction || hasProductionStages || hasProductionTasks;
      });
      setProjects(productionProjects);

      // Expand all by default
      setExpandedProjects(new Set(productionProjects.map((p) => p.id)));
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Build kanban data for each project
  const projectKanbanData = useMemo((): ProjectKanbanData[] => {
    return projects
      .filter((project) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = project.title.toLowerCase().includes(query);
          const matchesNumber = project.projectNumber.toLowerCase().includes(query);
          if (!matchesTitle && !matchesNumber) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && project.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .map((project) => {
        const stages = [...(project.productionStages || [])].sort((a, b) => a.order - b.order);
        const productionTasks = (project.workItems || []).filter((w) => w.kind === 'production');

        // Group tasks by stage
        const tasksByStage = new Map<string | null, WorkItem[]>();
        for (const task of productionTasks) {
          const stageId = task.stageId || null;
          if (!tasksByStage.has(stageId)) {
            tasksByStage.set(stageId, []);
          }
          tasksByStage.get(stageId)!.push(task);
        }

        const completedTasks = productionTasks.filter((t) => t.status === 'COMPLETED').length;

        return {
          project,
          stages,
          tasksByStage,
          totalTasks: productionTasks.length,
          completedTasks,
        };
      });
  }, [projects, searchQuery, statusFilter]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, projectId: string, taskId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ projectId, taskId }));
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ projectId, taskId });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Find the stage column we're over
    const target = e.target as HTMLElement;
    const stageCol = target.closest('[data-stage-id]') as HTMLElement | null;
    const projectCard = target.closest('[data-project-id]') as HTMLElement | null;

    if (stageCol && dragState) {
      const stageId = stageCol.dataset.stageId;
      const projectId = dragState.projectId; // Only allow drops within the same project
      setDropTargetStage({
        projectId,
        stageId: stageId === 'unassigned' ? null : stageId || null,
      });
    }
  }, [dragState]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDropTargetStage(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, projectId: string, stageId: string | null) => {
    e.preventDefault();

    if (!dragState || isUpdating) {
      handleDragEnd();
      return;
    }

    // Only allow drops within the same project
    if (dragState.projectId !== projectId) {
      handleDragEnd();
      return;
    }

    const { taskId } = dragState;

    // Find the task
    const project = projects.find((p) => p.id === projectId);
    const task = project?.workItems?.find((w) => w.id === taskId);

    if (!task) {
      handleDragEnd();
      return;
    }

    // Skip if dropping in the same stage
    const currentStageId = task.stageId || null;
    if (currentStageId === stageId) {
      handleDragEnd();
      return;
    }

    setIsUpdating(true);
    const context = getDefaultAuditContext();

    try {
      const result = await TaskService.updateWorkItem(
        projectId,
        taskId,
        { stageId: stageId || undefined },
        context
      );

      if (!result.ok) {
        console.error('Failed to update task:', result.error);
        alert(`Failed to move task: ${result.error}`);
      } else {
        await loadProjects();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsUpdating(false);
      handleDragEnd();
    }
  }, [dragState, projects, isUpdating, handleDragEnd]);

  // Toggle project expansion
  const toggleProjectExpanded = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all
  const expandAll = useCallback(() => {
    setExpandedProjects(new Set(projectKanbanData.map((d) => d.project.id)));
  }, [projectKanbanData]);

  const collapseAll = useCallback(() => {
    setExpandedProjects(new Set());
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Factory className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading production data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" onDragEnd={handleDragEnd}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Factory className="h-7 w-7 text-teal-600" />
            Production Overview
          </h1>
          <p className="text-slate-500 mt-1">
            All projects in production with their task boards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="IN_PRODUCTION">In Production</SelectItem>
            <SelectItem value="READY_FOR_DELIVERY">Ready for Delivery</SelectItem>
            <SelectItem value="ORDER_CONFIRMED">Order Confirmed</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary">
          {projectKanbanData.length} project{projectKanbanData.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Project Kanban Cards */}
      {projectKanbanData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Factory className="h-12 w-12 mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No Production Projects</h3>
          <p className="text-sm text-center max-w-md">
            {searchQuery || statusFilter !== 'all'
              ? 'No projects match your filters. Try adjusting your search or status filter.'
              : 'Projects will appear here when they enter production status or have production tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {projectKanbanData.map((data) => (
            <div key={data.project.id} data-project-id={data.project.id}>
              <ProjectKanbanCard
                data={data}
                isExpanded={expandedProjects.has(data.project.id)}
                onToggleExpand={() => toggleProjectExpanded(data.project.id)}
                onNavigateToProject={onNavigateToProject}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                dragState={dragState}
                dropTargetStage={dropTargetStage}
              />
            </div>
          ))}
        </div>
      )}

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
