/**
 * Task Service - v4
 * Manages production tasks, assignments, and time tracking
 */

import type {
  Project,
  ProjectTask,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskTimeLog,
  CreateTaskInput,
  LogTimeInput,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// TASK SERVICE
// ============================================

export const TaskService = {
  /**
   * Create a new task for a project
   */
  async createTask(
    projectId: string,
    input: CreateTaskInput,
    context: AuditContext
  ): Promise<Result<ProjectTask, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const taskNumber = (project.tasks?.length || 0) + 1;

    const task: ProjectTask = {
      id: generateUUID(),
      projectId,
      taskNumber,
      stageId: input.stageId, // Link to production stage
      articleVersionId: input.articleVersionId, // Link to pinned article version for attachments
      planningTaskId: input.planningTaskId, // Link to planning task (reference only)
      // Provenance (when copied from template)
      sourceProcedureId: input.sourceProcedureId,
      sourceProcedureVersionId: input.sourceProcedureVersionId,
      sourceTaskSetTemplateId: input.sourceTaskSetTemplateId,
      copiedFromTemplateAt: input.sourceProcedureVersionId ? now() : undefined,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority || 'MEDIUM',
      status: 'TODO',
      estimatedHours: input.estimatedHours,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      assignedAt: input.assignedTo ? now() : undefined,
      timeLogs: [],
      totalLoggedHours: 0,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      createdBy: context.userId,
    };

    const tasks = [...(project.tasks || []), task];

    const updated = await ProjectRepository.update(projectId, { tasks });
    if (!updated) {
      return Err('Failed to create task');
    }

    await AuditService.logCreate(context, 'ProjectTask', task.id, {
      taskNumber,
      title: input.title,
      category: input.category,
    });

    return Ok(task);
  },

  /**
   * Update a task
   */
  async updateTask(
    projectId: string,
    taskId: string,
    updates: Partial<Pick<ProjectTask, 'title' | 'description' | 'category' | 'priority' | 'status' | 'estimatedHours' | 'dueDate' | 'assignedTo' | 'notes' | 'stageId' | 'articleVersionId' | 'planningTaskId'>>,
    context: AuditContext
  ): Promise<Result<ProjectTask, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const taskIndex = project.tasks?.findIndex((t) => t.id === taskId) ?? -1;
    if (taskIndex === -1) {
      return Err('Task not found');
    }

    const task = project.tasks[taskIndex];
    const updatedTask: ProjectTask = {
      ...task,
      ...updates,
      updatedAt: now(),
      version: task.version + 1,
    };

    // Handle status transitions
    if (updates.status && updates.status !== task.status) {
      if (updates.status === 'IN_PROGRESS' && !task.startedAt) {
        updatedTask.startedAt = now();
      }
      if (updates.status === 'COMPLETED') {
        updatedTask.completedAt = now();
      }
    }

    // Handle assignment changes
    if (updates.assignedTo !== undefined && updates.assignedTo !== task.assignedTo) {
      updatedTask.assignedAt = updates.assignedTo ? now() : undefined;
    }

    const tasks = [...project.tasks];
    tasks[taskIndex] = updatedTask;

    const updated = await ProjectRepository.update(projectId, { tasks });
    if (!updated) {
      return Err('Failed to update task');
    }

    await AuditService.logUpdate(
      context,
      'ProjectTask',
      taskId,
      task as unknown as Record<string, unknown>,
      updatedTask as unknown as Record<string, unknown>
    );

    return Ok(updatedTask);
  },

  /**
   * Update task status
   * Also triggers stage progress recalculation if task is linked to a stage
   */
  async updateTaskStatus(
    projectId: string,
    taskId: string,
    status: TaskStatus,
    context: AuditContext
  ): Promise<Result<ProjectTask, string>> {
    const result = await this.updateTask(projectId, taskId, { status }, context);

    // If task has a stageId, trigger stage progress recalculation
    if (result.ok && result.value.stageId) {
      // Lazy import to avoid circular dependencies
      const { ProductionService } = await import('./ProductionService');
      await ProductionService.recalculateStageProgress(projectId, result.value.stageId, context);
    }

    return result;
  },

  /**
   * Assign task to a user
   */
  async assignTask(
    projectId: string,
    taskId: string,
    assignedTo: string | undefined,
    context: AuditContext
  ): Promise<Result<ProjectTask, string>> {
    return this.updateTask(projectId, taskId, { assignedTo }, context);
  },

  /**
   * Log time against a task
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

    const taskIndex = project.tasks?.findIndex((t) => t.id === taskId) ?? -1;
    if (taskIndex === -1) {
      return Err('Task not found');
    }

    const task = project.tasks[taskIndex];

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

    const updatedTask: ProjectTask = {
      ...task,
      timeLogs: [...task.timeLogs, timeLog],
      totalLoggedHours: task.totalLoggedHours + input.hours,
      updatedAt: now(),
      version: task.version + 1,
    };

    const tasks = [...project.tasks];
    tasks[taskIndex] = updatedTask;

    const updated = await ProjectRepository.update(projectId, { tasks });
    if (!updated) {
      return Err('Failed to log time');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'TaskTimeLog',
      timeLog.id,
      `Logged ${input.hours}h on task #${task.taskNumber}: ${task.title}`
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

    const taskIndex = project.tasks?.findIndex((t) => t.id === taskId) ?? -1;
    if (taskIndex === -1) {
      return Err('Task not found');
    }

    const task = project.tasks[taskIndex];
    const timeLog = task.timeLogs.find((tl) => tl.id === timeLogId);
    if (!timeLog) {
      return Err('Time log not found');
    }

    const updatedTask: ProjectTask = {
      ...task,
      timeLogs: task.timeLogs.filter((tl) => tl.id !== timeLogId),
      totalLoggedHours: task.totalLoggedHours - timeLog.hours,
      updatedAt: now(),
      version: task.version + 1,
    };

    const tasks = [...project.tasks];
    tasks[taskIndex] = updatedTask;

    const updated = await ProjectRepository.update(projectId, { tasks });
    if (!updated) {
      return Err('Failed to delete time log');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'TaskTimeLog',
      timeLogId,
      `Deleted time log (${timeLog.hours}h) from task #${task.taskNumber}`
    );

    return Ok(undefined);
  },

  /**
   * Delete a task
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

    const task = project.tasks?.find((t) => t.id === taskId);
    if (!task) {
      return Err('Task not found');
    }

    // Don't allow deleting completed tasks
    if (task.status === 'COMPLETED') {
      return Err('Cannot delete completed tasks');
    }

    const tasks = project.tasks.filter((t) => t.id !== taskId);

    const updated = await ProjectRepository.update(projectId, { tasks });
    if (!updated) {
      return Err('Failed to delete task');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectTask',
      taskId,
      `Deleted task #${task.taskNumber}: ${task.title}`
    );

    return Ok(undefined);
  },

  /**
   * Get all tasks for a project
   */
  async getTasks(projectId: string): Promise<ProjectTask[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.tasks || [];
  },

  /**
   * Get task by ID
   */
  async getTaskById(projectId: string, taskId: string): Promise<ProjectTask | null> {
    const tasks = await this.getTasks(projectId);
    return tasks.find((t) => t.id === taskId) || null;
  },

  /**
   * Get tasks by status
   */
  async getTasksByStatus(projectId: string, status: TaskStatus): Promise<ProjectTask[]> {
    const tasks = await this.getTasks(projectId);
    return tasks.filter((t) => t.status === status);
  },

  /**
   * Get total logged hours for a project
   */
  async getTotalLoggedHours(projectId: string): Promise<number> {
    const tasks = await this.getTasks(projectId);
    return tasks.reduce((sum, task) => sum + task.totalLoggedHours, 0);
  },

  /**
   * Get total estimated hours for a project
   */
  async getTotalEstimatedHours(projectId: string): Promise<number> {
    const tasks = await this.getTasks(projectId);
    return tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
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
    const tasks = await this.getTasks(projectId);

    const byStatus: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    let totalEstimated = 0;
    let totalLogged = 0;

    for (const task of tasks) {
      byStatus[task.status]++;
      totalEstimated += task.estimatedHours || 0;
      totalLogged += task.totalLoggedHours;
    }

    return {
      total: tasks.length,
      byStatus,
      totalEstimated,
      totalLogged,
    };
  },

  /**
   * Get tasks grouped by category
   */
  async getTasksByCategory(projectId: string): Promise<Map<TaskCategory, ProjectTask[]>> {
    const tasks = await this.getTasks(projectId);
    const grouped = new Map<TaskCategory, ProjectTask[]>();

    for (const task of tasks) {
      if (!grouped.has(task.category)) {
        grouped.set(task.category, []);
      }
      grouped.get(task.category)!.push(task);
    }

    return grouped;
  },

  /**
   * Calculate labor cost estimate
   * Uses a default hourly rate if not specified
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
   * Get tasks by production stage
   */
  async getTasksByStage(projectId: string, stageId: string): Promise<ProjectTask[]> {
    const tasks = await this.getTasks(projectId);
    return tasks.filter((t) => t.stageId === stageId);
  },

  /**
   * Get tasks without a stage (unassigned to production stages)
   */
  async getUnassignedTasks(projectId: string): Promise<ProjectTask[]> {
    const tasks = await this.getTasks(projectId);
    return tasks.filter((t) => !t.stageId);
  },

  /**
   * Get task progress for a stage (% completed)
   * Returns the percentage of completed tasks in the stage
   */
  async getStageTaskProgress(projectId: string, stageId: string): Promise<{
    total: number;
    completed: number;
    progressPercent: number;
  }> {
    const tasks = await this.getTasksByStage(projectId, stageId);
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const total = tasks.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, progressPercent };
  },

  /**
   * Assign task to a production stage
   */
  async assignToStage(
    projectId: string,
    taskId: string,
    stageId: string | undefined,
    context: AuditContext
  ): Promise<Result<ProjectTask, string>> {
    return this.updateTask(projectId, taskId, { stageId }, context);
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
    const tasks = await this.getTasksByStage(projectId, stageId);

    const byStatus: Record<TaskStatus, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    let totalEstimated = 0;
    let totalLogged = 0;

    for (const task of tasks) {
      byStatus[task.status]++;
      totalEstimated += task.estimatedHours || 0;
      totalLogged += task.totalLoggedHours;
    }

    return {
      total: tasks.length,
      byStatus,
      totalEstimated,
      totalLogged,
    };
  },

  /**
   * Bulk assign tasks to a production stage
   * Optionally set assignee and/or due date
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
  ): Promise<Result<ProjectTask[], string>> {
    // Handle empty task list gracefully
    if (taskIds.length === 0) {
      return Ok([]);
    }

    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.tasks || project.tasks.length === 0) {
      return Err('No tasks found');
    }

    const updatedTasks: ProjectTask[] = [];
    const tasks = [...project.tasks];

    for (const taskId of taskIds) {
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) continue;

      const task = tasks[taskIndex];
      const updatedTask: ProjectTask = {
        ...task,
        stageId,
        assignedTo: options?.assignedTo ?? task.assignedTo,
        assignedAt: options?.assignedTo && !task.assignedTo ? now() : task.assignedAt,
        dueDate: options?.dueDate ?? task.dueDate,
        updatedAt: now(),
        version: task.version + 1,
      };

      tasks[taskIndex] = updatedTask;
      updatedTasks.push(updatedTask);
    }

    const updated = await ProjectRepository.update(projectId, { tasks });
    if (!updated) {
      return Err('Failed to bulk assign tasks');
    }

    // Recalculate stage progress if autoProgressFromTasks is enabled
    const { ProductionService } = await import('./ProductionService');
    await ProductionService.recalculateStageProgress(projectId, stageId, context);

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectTask',
      projectId,
      `Bulk assigned ${updatedTasks.length} tasks to production stage`
    );

    return Ok(updatedTasks);
  },
};
