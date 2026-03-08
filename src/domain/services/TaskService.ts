/**
 * Task Service - v4.1 Unified
 * Manages work items (both planning and production tasks)
 *
 * Migration: Uses WorkItem model but maintains backward-compatible API
 */

import type {
  Project,
  WorkItem,
  WorkItemStatus,
  WorkItemKind,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskTimeLog,
  CreateTaskInput,
  CreateWorkItemInput,
  LogTimeInput,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err, normalizeStatus } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get next work item number for a project
 */
function getNextWorkItemNumber(project: Project): number {
  const workItems = project.workItems || [];
  if (workItems.length === 0) return 1;
  return Math.max(...workItems.map(w => w.workItemNumber)) + 1;
}

/**
 * Get work items by kind
 */
function getItemsByKind(project: Project, kind: WorkItemKind): WorkItem[] {
  return (project.workItems || []).filter(w => w.kind === kind);
}

// ============================================
// TASK SERVICE
// ============================================

export const TaskService = {
  /**
   * Create a new work item (unified)
   */
  async createWorkItem(
    projectId: string,
    input: CreateWorkItemInput,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItemNumber = getNextWorkItemNumber(project);

    const workItem: WorkItem = {
      id: generateUUID(),
      projectId,
      workItemNumber,
      kind: input.kind,
      title: input.title,
      description: input.description,
      status: 'TODO',
      notes: input.notes,
      // Scheduling fields
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays: input.durationDays,
      // Production fields
      category: input.category,
      priority: input.priority || 'MEDIUM',
      dueDate: input.dueDate,
      estimatedHours: input.estimatedHours,
      // Assignment (v324: support both stable and legacy fields)
      assigneeIds: input.assigneeIds || [],
      assigneeUserIds: input.assigneeUserIds || [],
      assignedAt: (input.assigneeIds?.length || input.assigneeUserIds?.length) ? now() : undefined,
      // Dependencies
      dependsOnIds: input.dependsOnIds || [],
      // Links
      stageId: input.stageId,
      articleVersionId: input.articleVersionId,
      workInstructionId: input.workInstructionId,
      // Provenance
      sourceProcedureId: input.sourceProcedureId,
      sourceProcedureVersionId: input.sourceProcedureVersionId,
      sourceTaskSetTemplateId: input.sourceTaskSetTemplateId,
      copiedFromTemplateAt: input.sourceProcedureVersionId ? now() : undefined,
      // Time tracking
      timeLogs: [],
      totalLoggedHours: 0,
      // Audit
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      createdBy: context.userId,
    };

    const workItems = [...(project.workItems || []), workItem];

    const updated = await ProjectRepository.update(projectId, { workItems });
    if (!updated) {
      return Err('Failed to create work item');
    }

    await AuditService.logCreate(context, 'WorkItem', workItem.id, {
      workItemNumber,
      kind: input.kind,
      title: input.title,
      category: input.category,
    });

    return Ok(workItem);
  },

  /**
   * Create a new task (legacy API - creates production work item)
   * @deprecated Use createWorkItem instead
   */
  async createTask(
    projectId: string,
    input: CreateTaskInput,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    return this.createWorkItem(projectId, {
      kind: 'production',
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      estimatedHours: input.estimatedHours,
      dueDate: input.dueDate,
      assigneeIds: input.assignedTo ? [input.assignedTo] : [],
      stageId: input.stageId,
      articleVersionId: input.articleVersionId,
      sourceProcedureId: input.sourceProcedureId,
      sourceProcedureVersionId: input.sourceProcedureVersionId,
      sourceTaskSetTemplateId: input.sourceTaskSetTemplateId,
    }, context);
  },

  /**
   * Update a work item
   */
  async updateWorkItem(
    projectId: string,
    workItemId: string,
    updates: Partial<Omit<WorkItem, 'id' | 'projectId' | 'workItemNumber' | 'kind' | 'createdAt' | 'createdBy'>>,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const itemIndex = workItems.findIndex(w => w.id === workItemId);
    if (itemIndex === -1) {
      return Err('Work item not found');
    }

    const item = workItems[itemIndex];
    const updatedItem: WorkItem = {
      ...item,
      ...updates,
      updatedAt: now(),
      version: item.version + 1,
    };

    // Handle status transitions
    if (updates.status && updates.status !== item.status) {
      if (updates.status === 'IN_PROGRESS' && !item.startedAt) {
        updatedItem.startedAt = now();
      }
      if (updates.status === 'COMPLETED') {
        updatedItem.completedAt = now();
      }
    }

    // Handle assignment changes (v324: support both stable and legacy fields)
    const hadAssignees = (item.assigneeIds?.length || 0) > 0 || (item.assigneeUserIds?.length || 0) > 0;
    if (updates.assigneeIds !== undefined || updates.assigneeUserIds !== undefined) {
      const hasAssigneesNow = (updates.assigneeIds?.length || 0) > 0 || (updates.assigneeUserIds?.length || 0) > 0;
      if (hasAssigneesNow && !hadAssignees) {
        updatedItem.assignedAt = now();
      } else if (!hasAssigneesNow && hadAssignees) {
        updatedItem.assignedAt = undefined;
      }
    }

    const newWorkItems = [...workItems];
    newWorkItems[itemIndex] = updatedItem;

    const updated = await ProjectRepository.update(projectId, { workItems: newWorkItems });
    if (!updated) {
      return Err('Failed to update work item');
    }

    await AuditService.logUpdate(
      context,
      'WorkItem',
      workItemId,
      item as unknown as Record<string, unknown>,
      updatedItem as unknown as Record<string, unknown>
    );

    return Ok(updatedItem);
  },

  /**
   * Update a task (legacy API)
   * @deprecated Use updateWorkItem instead
   */
  async updateTask(
    projectId: string,
    taskId: string,
    updates: Partial<Pick<WorkItem, 'title' | 'description' | 'category' | 'priority' | 'status' | 'estimatedHours' | 'dueDate' | 'notes' | 'stageId' | 'articleVersionId'>> & { assignedTo?: string },
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    // Convert legacy assignedTo to assigneeIds
    const normalizedUpdates: Partial<WorkItem> = { ...updates };
    if ('assignedTo' in updates) {
      normalizedUpdates.assigneeIds = updates.assignedTo ? [updates.assignedTo] : [];
      delete (normalizedUpdates as any).assignedTo;
    }
    return this.updateWorkItem(projectId, taskId, normalizedUpdates, context);
  },

  /**
   * Update work item status
   */
  async updateTaskStatus(
    projectId: string,
    taskId: string,
    status: WorkItemStatus,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    const result = await this.updateWorkItem(projectId, taskId, { status }, context);

    // If task has a stageId, trigger stage progress recalculation
    if (result.ok && result.value.stageId) {
      const { ProductionService } = await import('./ProductionService');
      await ProductionService.recalculateStageProgress(projectId, result.value.stageId, context);
    }

    return result;
  },

  /**
   * Assign work item
   */
  async assignTask(
    projectId: string,
    taskId: string,
    assignedTo: string | undefined,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    return this.updateWorkItem(projectId, taskId, {
      assigneeIds: assignedTo ? [assignedTo] : []
    }, context);
  },

  /**
   * Log time against a work item
   */
  async logTime(
    projectId: string,
    taskId: string,
    input: LogTimeInput,
    context: AuditContext
  ): Promise<Result<TaskTimeLog, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const itemIndex = workItems.findIndex(w => w.id === taskId);
    if (itemIndex === -1) {
      return Err('Work item not found');
    }

    const item = workItems[itemIndex];

    const timeLog: TaskTimeLog = {
      id: generateUUID(),
      taskId,
      userId: context.userId,
      userName: context.userName,
      date: input.date,
      hours: input.hours,
      description: input.description,
      createdAt: now(),
    };

    const updatedItem: WorkItem = {
      ...item,
      timeLogs: [...(item.timeLogs || []), timeLog],
      totalLoggedHours: (item.totalLoggedHours || 0) + input.hours,
      updatedAt: now(),
      version: item.version + 1,
    };

    const newWorkItems = [...workItems];
    newWorkItems[itemIndex] = updatedItem;

    const updated = await ProjectRepository.update(projectId, { workItems: newWorkItems });
    if (!updated) {
      return Err('Failed to log time');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'TaskTimeLog',
      timeLog.id,
      `Logged ${input.hours}h on work item #${item.workItemNumber}: ${item.title}`
    );

    return Ok(timeLog);
  },

  /**
   * Delete a time log
   */
  async deleteTimeLog(
    projectId: string,
    taskId: string,
    timeLogId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const itemIndex = workItems.findIndex(w => w.id === taskId);
    if (itemIndex === -1) {
      return Err('Work item not found');
    }

    const item = workItems[itemIndex];
    const timeLog = item.timeLogs?.find(tl => tl.id === timeLogId);
    if (!timeLog) {
      return Err('Time log not found');
    }

    const updatedItem: WorkItem = {
      ...item,
      timeLogs: (item.timeLogs || []).filter(tl => tl.id !== timeLogId),
      totalLoggedHours: (item.totalLoggedHours || 0) - timeLog.hours,
      updatedAt: now(),
      version: item.version + 1,
    };

    const newWorkItems = [...workItems];
    newWorkItems[itemIndex] = updatedItem;

    const updated = await ProjectRepository.update(projectId, { workItems: newWorkItems });
    if (!updated) {
      return Err('Failed to delete time log');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'TaskTimeLog',
      timeLogId,
      `Deleted time log (${timeLog.hours}h) from work item #${item.workItemNumber}`
    );

    return Ok(undefined);
  },

  /**
   * Delete a work item
   */
  async deleteTask(
    projectId: string,
    taskId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const item = workItems.find(w => w.id === taskId);
    if (!item) {
      return Err('Work item not found');
    }

    // Don't allow deleting completed tasks
    if (item.status === 'COMPLETED') {
      return Err('Cannot delete completed work items');
    }

    const newWorkItems = workItems.filter(w => w.id !== taskId);

    // Also remove this item from any dependencies
    const cleanedWorkItems = newWorkItems.map(w => ({
      ...w,
      dependsOnIds: w.dependsOnIds?.filter(id => id !== taskId),
      blockedByIds: w.blockedByIds?.filter(id => id !== taskId),
    }));

    const updated = await ProjectRepository.update(projectId, { workItems: cleanedWorkItems });
    if (!updated) {
      return Err('Failed to delete work item');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'WorkItem',
      taskId,
      `Deleted work item #${item.workItemNumber}: ${item.title}`
    );

    return Ok(undefined);
  },

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get all work items for a project
   */
  async getWorkItems(projectId: string): Promise<WorkItem[]> {
    const project = await ProjectRepository.getById(projectId);
    return project?.workItems || [];
  },

  /**
   * Get all tasks (production work items) for a project
   * @deprecated Use getWorkItems and filter by kind
   */
  async getTasks(projectId: string): Promise<WorkItem[]> {
    const workItems = await this.getWorkItems(projectId);
    return workItems.filter(w => w.kind === 'production');
  },

  /**
   * Get all planning items for a project
   */
  async getPlanningItems(projectId: string): Promise<WorkItem[]> {
    const workItems = await this.getWorkItems(projectId);
    return workItems.filter(w => w.kind === 'planning');
  },

  /**
   * Get work item by ID
   */
  async getTaskById(projectId: string, taskId: string): Promise<WorkItem | null> {
    const workItems = await this.getWorkItems(projectId);
    return workItems.find(w => w.id === taskId) || null;
  },

  /**
   * Get work items by status
   */
  async getTasksByStatus(projectId: string, status: WorkItemStatus): Promise<WorkItem[]> {
    const workItems = await this.getWorkItems(projectId);
    return workItems.filter(w => w.status === status);
  },

  /**
   * Get total logged hours for a project
   */
  async getTotalLoggedHours(projectId: string): Promise<number> {
    const workItems = await this.getWorkItems(projectId);
    return workItems.reduce((sum, item) => sum + (item.totalLoggedHours || 0), 0);
  },

  /**
   * Get total estimated hours for a project
   */
  async getTotalEstimatedHours(projectId: string): Promise<number> {
    const workItems = await this.getWorkItems(projectId);
    return workItems.reduce((sum, item) => sum + (item.estimatedHours || 0), 0);
  },

  /**
   * Get task summary by status
   */
  async getTaskSummary(projectId: string): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    totalEstimated: number;
    totalLogged: number;
  }> {
    const workItems = await this.getTasks(projectId); // Production items only

    const byStatus: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    let totalEstimated = 0;
    let totalLogged = 0;

    for (const item of workItems) {
      byStatus[item.status]++;
      totalEstimated += item.estimatedHours || 0;
      totalLogged += item.totalLoggedHours || 0;
    }

    return {
      total: workItems.length,
      byStatus,
      totalEstimated,
      totalLogged,
    };
  },

  /**
   * Get work items grouped by category
   */
  async getTasksByCategory(projectId: string): Promise<Map<TaskCategory, WorkItem[]>> {
    const workItems = await this.getTasks(projectId);
    const grouped = new Map<TaskCategory, WorkItem[]>();

    for (const item of workItems) {
      if (item.category) {
        if (!grouped.has(item.category)) {
          grouped.set(item.category, []);
        }
        grouped.get(item.category)!.push(item);
      }
    }

    return grouped;
  },

  /**
   * Calculate labor cost estimate
   */
  async calculateLaborCost(projectId: string, hourlyRate = 75): Promise<{
    estimatedCost: number;
    actualCost: number;
    variance: number;
    variancePercent: number;
  }> {
    const summary = await this.getTaskSummary(projectId);

    const estimatedCost = summary.totalEstimated * hourlyRate;
    const actualCost = summary.totalLogged * hourlyRate;
    const variance = actualCost - estimatedCost;
    const variancePercent = estimatedCost > 0 ? Math.round((variance / estimatedCost) * 100) : 0;

    return { estimatedCost, actualCost, variance, variancePercent };
  },

  /**
   * Get work items by production stage
   */
  async getTasksByStage(projectId: string, stageId: string): Promise<WorkItem[]> {
    const workItems = await this.getTasks(projectId);
    return workItems.filter(w => w.stageId === stageId);
  },

  /**
   * Get work items without a stage
   */
  async getUnassignedTasks(projectId: string): Promise<WorkItem[]> {
    const workItems = await this.getTasks(projectId);
    return workItems.filter(w => !w.stageId);
  },

  /**
   * Get task progress for a stage
   */
  async getStageTaskProgress(projectId: string, stageId: string): Promise<{
    total: number;
    completed: number;
    progressPercent: number;
  }> {
    const workItems = await this.getTasksByStage(projectId, stageId);
    const completed = workItems.filter(w => w.status === 'COMPLETED').length;
    const total = workItems.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, progressPercent };
  },

  /**
   * Assign work item to a production stage
   */
  async assignToStage(
    projectId: string,
    taskId: string,
    stageId: string | undefined,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    return this.updateWorkItem(projectId, taskId, { stageId }, context);
  },

  /**
   * Get task summary for a specific stage
   */
  async getStageSummary(projectId: string, stageId: string): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    totalEstimated: number;
    totalLogged: number;
  }> {
    const workItems = await this.getTasksByStage(projectId, stageId);

    const byStatus: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    let totalEstimated = 0;
    let totalLogged = 0;

    for (const item of workItems) {
      byStatus[item.status]++;
      totalEstimated += item.estimatedHours || 0;
      totalLogged += item.totalLoggedHours || 0;
    }

    return {
      total: workItems.length,
      byStatus,
      totalEstimated,
      totalLogged,
    };
  },

  /**
   * Bulk assign work items to a production stage
   */
  async bulkAssignToStage(
    projectId: string,
    taskIds: string[],
    stageId: string,
    options: {
      assignedTo?: string;
      dueDate?: string;
    } | undefined,
    context: AuditContext
  ): Promise<Result<WorkItem[], string>> {
    if (taskIds.length === 0) {
      return Ok([]);
    }

    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    if (workItems.length === 0) {
      return Err('No work items found');
    }

    const updatedItems: WorkItem[] = [];
    const newWorkItems = [...workItems];

    for (const taskId of taskIds) {
      const itemIndex = newWorkItems.findIndex(w => w.id === taskId);
      if (itemIndex === -1) continue;

      const item = newWorkItems[itemIndex];
      const updatedItem: WorkItem = {
        ...item,
        stageId,
        assigneeIds: options?.assignedTo ? [options.assignedTo] : item.assigneeIds,
        assignedAt: options?.assignedTo && !(item.assigneeIds?.length) ? now() : item.assignedAt,
        dueDate: options?.dueDate || item.dueDate,
        updatedAt: now(),
        version: item.version + 1,
      };

      newWorkItems[itemIndex] = updatedItem;
      updatedItems.push(updatedItem);
    }

    const updated = await ProjectRepository.update(projectId, { workItems: newWorkItems });
    if (!updated) {
      return Err('Failed to bulk assign work items');
    }

    // Recalculate stage progress
    const { ProductionService } = await import('./ProductionService');
    await ProductionService.recalculateStageProgress(projectId, stageId, context);

    await AuditService.log(
      context,
      'UPDATE',
      'WorkItem',
      projectId,
      `Bulk assigned ${updatedItems.length} work items to production stage`
    );

    return Ok(updatedItems);
  },
};
