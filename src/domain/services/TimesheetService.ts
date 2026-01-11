/**
 * Timesheet Service - v4
 * Business logic for timesheet entries
 */

import type {
  TimesheetEntry,
  CreateTimesheetEntryInput,
  UpdateTimesheetEntryInput,
  TimesheetWeek,
  TimesheetMonth,
  Project,
  ProjectWeeklySummary,
  UserHoursSummary,
  TaskHoursSummary,
  WeeklyProjectOverview,
} from '@/domain/models';
import {
  Result,
  Ok,
  Err,
  isValidHours,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getDaysInMonth,
  formatDate,
  parseDate,
} from '@/domain/models';
import { TimesheetRepository } from '@/data/repositories/TimesheetRepository';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// TIMESHEET SERVICE
// ============================================

export const TimesheetService = {
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get all timesheet entries
   */
  async getAll(): Promise<TimesheetEntry[]> {
    return TimesheetRepository.getAll();
  },

  /**
   * Get entry by ID
   */
  async getById(id: string): Promise<TimesheetEntry | null> {
    return TimesheetRepository.getById(id);
  },

  /**
   * Get entries for a specific user
   */
  async getByUser(userId: string): Promise<TimesheetEntry[]> {
    return TimesheetRepository.getByUser(userId);
  },

  /**
   * Get entries for a specific project
   */
  async getByProject(projectId: string): Promise<TimesheetEntry[]> {
    return TimesheetRepository.getByProject(projectId);
  },

  /**
   * Get entries for a date range
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<TimesheetEntry[]> {
    return TimesheetRepository.getByDateRange(startDate, endDate, userId);
  },

  /**
   * Get weekly view data for a specific week
   */
  async getWeeklyView(
    weekDate: Date,
    userId?: string
  ): Promise<TimesheetWeek> {
    const startDate = getWeekStart(weekDate);
    const endDate = getWeekEnd(weekDate);

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const entries = await TimesheetRepository.getByDateRange(startStr, endStr, userId);

    // Calculate daily totals
    const dailyTotals: Record<string, number> = {};
    let weekTotal = 0;

    // Initialize all days of the week
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dailyTotals[formatDate(d)] = 0;
    }

    // Sum hours per day
    for (const entry of entries) {
      dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + entry.hours;
      weekTotal += entry.hours;
    }

    return {
      startDate: startStr,
      endDate: endStr,
      entries,
      dailyTotals,
      weekTotal,
    };
  },

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new timesheet entry
   */
  async createEntry(
    input: CreateTimesheetEntryInput,
    context: AuditContext
  ): Promise<Result<TimesheetEntry, string>> {
    // Validate hours
    if (!isValidHours(input.hours)) {
      return Err('Hours must be between 0 and 24, in 0.25 increments');
    }

    // Validate billing rate
    if (input.billable && input.billingRate !== undefined && input.billingRate < 0) {
      return Err('Billing rate must be >= 0');
    }

    // Validate project exists and is not CLOSED
    const project = await ProjectRepository.getById(input.projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.status === 'CLOSED') {
      return Err('Cannot add timesheet entries to closed projects');
    }

    // Create entry
    const entry = await TimesheetRepository.create(
      input,
      context.userId,
      context.userName
    );

    // Log the creation
    await AuditService.logCreate(context, 'TimesheetEntry', entry.id, {
      projectId: input.projectId,
      date: input.date,
      hours: input.hours,
      billable: input.billable,
    });

    return Ok(entry);
  },

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update a timesheet entry
   */
  async updateEntry(
    id: string,
    updates: UpdateTimesheetEntryInput,
    context: AuditContext
  ): Promise<Result<TimesheetEntry, string>> {
    const existing = await TimesheetRepository.getById(id);
    if (!existing) {
      return Err('Timesheet entry not found');
    }

    // Check project is not CLOSED
    const project = await ProjectRepository.getById(existing.projectId);
    if (project && project.status === 'CLOSED') {
      return Err('Cannot modify timesheet entries for closed projects');
    }

    // If changing project, check new project
    if (updates.projectId && updates.projectId !== existing.projectId) {
      const newProject = await ProjectRepository.getById(updates.projectId);
      if (!newProject) {
        return Err('New project not found');
      }
      if (newProject.status === 'CLOSED') {
        return Err('Cannot move entry to a closed project');
      }
    }

    // Validate hours
    if (updates.hours !== undefined && !isValidHours(updates.hours)) {
      return Err('Hours must be between 0 and 24, in 0.25 increments');
    }

    // Validate billing rate
    if (updates.billingRate !== undefined && updates.billingRate < 0) {
      return Err('Billing rate must be >= 0');
    }

    const updated = await TimesheetRepository.update(id, updates, context.userId);
    if (!updated) {
      return Err('Failed to update entry');
    }

    await AuditService.logUpdate(
      context,
      'TimesheetEntry',
      id,
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    );

    return Ok(updated);
  },

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a timesheet entry
   */
  async deleteEntry(
    id: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const existing = await TimesheetRepository.getById(id);
    if (!existing) {
      return Err('Timesheet entry not found');
    }

    // Check project is not CLOSED
    const project = await ProjectRepository.getById(existing.projectId);
    if (project && project.status === 'CLOSED') {
      return Err('Cannot delete timesheet entries for closed projects');
    }

    await TimesheetRepository.delete(id);

    await AuditService.log(
      context,
      'UPDATE',
      'TimesheetEntry',
      id,
      `Deleted timesheet entry: ${existing.date} - ${existing.hours}h on project`
    );

    return Ok(undefined);
  },

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get default billable value for a project
   * Internal projects default to non-billable
   */
  async getDefaultBillable(projectId: string): Promise<boolean> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return true;
    return !project.isInternal;
  },

  /**
   * Check if user can modify an entry
   * Users can modify their own entries, admins/managers can modify all
   */
  canModifyEntry(
    entry: TimesheetEntry,
    userId: string,
    canManage: boolean
  ): boolean {
    return entry.userId === userId || canManage;
  },

  /**
   * Get total hours for user in current week
   */
  async getCurrentWeekTotal(userId: string): Promise<number> {
    const today = new Date();
    const startDate = formatDate(getWeekStart(today));
    const endDate = formatDate(getWeekEnd(today));
    return TimesheetRepository.getTotalHours(userId, startDate, endDate);
  },

  // ============================================
  // REPORT AGGREGATIONS
  // ============================================

  /**
   * Get weekly overview grouped by project
   * @param weekDate - Any date within the target week
   * @param userId - If provided, filter to this user's entries only (permission scoping)
   */
  async getWeeklyProjectOverview(
    weekDate: Date,
    userId?: string
  ): Promise<WeeklyProjectOverview[]> {
    const startDate = getWeekStart(weekDate);
    const endDate = getWeekEnd(weekDate);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const entries = await TimesheetRepository.getByDateRange(startStr, endStr, userId);
    const projects = await ProjectRepository.getAll();

    // Group entries by project
    const projectMap = new Map<string, {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
    }>();

    for (const entry of entries) {
      const existing = projectMap.get(entry.projectId) || {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
      };
      existing.totalHours += entry.hours;
      if (entry.billable) {
        existing.billableHours += entry.hours;
      } else {
        existing.nonBillableHours += entry.hours;
      }
      projectMap.set(entry.projectId, existing);
    }

    // Build result with project details
    const result: WeeklyProjectOverview[] = [];
    for (const [projectId, stats] of projectMap) {
      const project = projects.find((p) => p.id === projectId);
      result.push({
        projectId,
        projectTitle: project?.title || 'Unknown Project',
        isInternal: project?.isInternal,
        totalHours: stats.totalHours,
        billableHours: stats.billableHours,
        nonBillableHours: stats.nonBillableHours,
      });
    }

    // Sort by total hours descending
    return result.sort((a, b) => b.totalHours - a.totalHours);
  },

  /**
   * Get project weekly summary with user and task breakdowns
   * @param projectId - Project to summarize
   * @param weekDate - Any date within the target week
   * @param userId - If provided, filter to this user's entries only (permission scoping)
   */
  async getProjectWeeklySummary(
    projectId: string,
    weekDate: Date,
    userId?: string
  ): Promise<ProjectWeeklySummary | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return null;

    const startDate = getWeekStart(weekDate);
    const endDate = getWeekEnd(weekDate);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    let entries = await TimesheetRepository.getByDateRange(startStr, endStr, userId);
    // Filter to this project
    entries = entries.filter((e) => e.projectId === projectId);

    // Calculate totals
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    // Group by user
    const userMap = new Map<string, UserHoursSummary>();
    // Group by task
    const taskMap = new Map<string, { taskTitle: string; totalHours: number }>();

    for (const entry of entries) {
      totalHours += entry.hours;
      if (entry.billable) {
        billableHours += entry.hours;
      } else {
        nonBillableHours += entry.hours;
      }

      // User breakdown
      const userStats = userMap.get(entry.userId) || {
        userId: entry.userId,
        userName: entry.userName,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
      };
      userStats.totalHours += entry.hours;
      if (entry.billable) {
        userStats.billableHours += entry.hours;
      } else {
        userStats.nonBillableHours += entry.hours;
      }
      userMap.set(entry.userId, userStats);

      // Task breakdown (only if taskId is present)
      if (entry.taskId) {
        const taskStats = taskMap.get(entry.taskId) || {
          taskTitle: this.getTaskTitle(project, entry.taskId),
          totalHours: 0,
        };
        taskStats.totalHours += entry.hours;
        taskMap.set(entry.taskId, taskStats);
      }
    }

    // Build breakdowns
    const userBreakdown: UserHoursSummary[] = Array.from(userMap.values())
      .sort((a, b) => b.totalHours - a.totalHours);

    const taskBreakdown: TaskHoursSummary[] = Array.from(taskMap.entries())
      .map(([taskId, stats]) => ({
        taskId,
        taskTitle: stats.taskTitle,
        totalHours: stats.totalHours,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      projectId,
      projectTitle: project.title,
      isInternal: project.isInternal,
      totalHours,
      billableHours,
      nonBillableHours,
      userBreakdown,
      taskBreakdown,
    };
  },

  /**
   * Get user breakdown for a project in a week
   * @param projectId - Project to summarize
   * @param weekDate - Any date within the target week
   * @param userId - If provided, filter to this user's entries only (permission scoping)
   */
  async getUserBreakdownForProject(
    projectId: string,
    weekDate: Date,
    userId?: string
  ): Promise<UserHoursSummary[]> {
    const summary = await this.getProjectWeeklySummary(projectId, weekDate, userId);
    return summary?.userBreakdown || [];
  },

  /**
   * Get task breakdown for a project in a week
   * @param projectId - Project to summarize
   * @param weekDate - Any date within the target week
   * @param userId - If provided, filter to this user's entries only (permission scoping)
   */
  async getTaskBreakdownForProject(
    projectId: string,
    weekDate: Date,
    userId?: string
  ): Promise<TaskHoursSummary[]> {
    const summary = await this.getProjectWeeklySummary(projectId, weekDate, userId);
    return summary?.taskBreakdown || [];
  },

  /**
   * Helper to get task title from project
   */
  getTaskTitle(project: Project, taskId: string): string {
    const task = project.tasks?.find((t) => t.id === taskId);
    return task?.title || 'Unknown Task';
  },

  // ============================================
  // MONTHLY AGGREGATIONS
  // ============================================

  /**
   * Get monthly view data for a specific month
   */
  async getMonthlyView(
    monthDate: Date,
    userId?: string
  ): Promise<TimesheetMonth> {
    const startDate = getMonthStart(monthDate);
    const endDate = getMonthEnd(monthDate);

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const entries = await TimesheetRepository.getByDateRange(startStr, endStr, userId);

    // Calculate daily totals
    const dailyTotals: Record<string, number> = {};
    let monthTotal = 0;

    // Initialize all days of the month
    const daysInMonth = getDaysInMonth(monthDate);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(startDate);
      d.setDate(i);
      dailyTotals[formatDate(d)] = 0;
    }

    // Sum hours per day
    for (const entry of entries) {
      dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + entry.hours;
      monthTotal += entry.hours;
    }

    return {
      startDate: startStr,
      endDate: endStr,
      entries,
      dailyTotals,
      monthTotal,
    };
  },

  /**
   * Get monthly overview grouped by project
   * @param monthDate - Any date within the target month
   * @param userId - If provided, filter to this user's entries only (permission scoping)
   */
  async getMonthlyProjectOverview(
    monthDate: Date,
    userId?: string
  ): Promise<WeeklyProjectOverview[]> {
    const startDate = getMonthStart(monthDate);
    const endDate = getMonthEnd(monthDate);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const entries = await TimesheetRepository.getByDateRange(startStr, endStr, userId);
    const projects = await ProjectRepository.getAll();

    // Group entries by project (reuse same logic as weekly)
    const projectMap = new Map<string, {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
    }>();

    for (const entry of entries) {
      const existing = projectMap.get(entry.projectId) || {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
      };
      existing.totalHours += entry.hours;
      if (entry.billable) {
        existing.billableHours += entry.hours;
      } else {
        existing.nonBillableHours += entry.hours;
      }
      projectMap.set(entry.projectId, existing);
    }

    // Build result with project details
    const result: WeeklyProjectOverview[] = [];
    for (const [projectId, stats] of projectMap) {
      const project = projects.find((p) => p.id === projectId);
      result.push({
        projectId,
        projectTitle: project?.title || 'Unknown Project',
        isInternal: project?.isInternal,
        totalHours: stats.totalHours,
        billableHours: stats.billableHours,
        nonBillableHours: stats.nonBillableHours,
      });
    }

    // Sort by total hours descending
    return result.sort((a, b) => b.totalHours - a.totalHours);
  },

  /**
   * Get project monthly summary with user and task breakdowns
   * @param projectId - Project to summarize
   * @param monthDate - Any date within the target month
   * @param userId - If provided, filter to this user's entries only (permission scoping)
   */
  async getProjectMonthlySummary(
    projectId: string,
    monthDate: Date,
    userId?: string
  ): Promise<ProjectWeeklySummary | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return null;

    const startDate = getMonthStart(monthDate);
    const endDate = getMonthEnd(monthDate);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    let entries = await TimesheetRepository.getByDateRange(startStr, endStr, userId);
    // Filter to this project
    entries = entries.filter((e) => e.projectId === projectId);

    // Reuse same aggregation logic as weekly
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    const userMap = new Map<string, UserHoursSummary>();
    const taskMap = new Map<string, { taskTitle: string; totalHours: number }>();

    for (const entry of entries) {
      totalHours += entry.hours;
      if (entry.billable) {
        billableHours += entry.hours;
      } else {
        nonBillableHours += entry.hours;
      }

      // User breakdown
      const userStats = userMap.get(entry.userId) || {
        userId: entry.userId,
        userName: entry.userName,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
      };
      userStats.totalHours += entry.hours;
      if (entry.billable) {
        userStats.billableHours += entry.hours;
      } else {
        userStats.nonBillableHours += entry.hours;
      }
      userMap.set(entry.userId, userStats);

      // Task breakdown
      if (entry.taskId) {
        const taskStats = taskMap.get(entry.taskId) || {
          taskTitle: this.getTaskTitle(project, entry.taskId),
          totalHours: 0,
        };
        taskStats.totalHours += entry.hours;
        taskMap.set(entry.taskId, taskStats);
      }
    }

    const userBreakdown: UserHoursSummary[] = Array.from(userMap.values())
      .sort((a, b) => b.totalHours - a.totalHours);

    const taskBreakdown: TaskHoursSummary[] = Array.from(taskMap.entries())
      .map(([taskId, stats]) => ({
        taskId,
        taskTitle: stats.taskTitle,
        totalHours: stats.totalHours,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      projectId,
      projectTitle: project.title,
      isInternal: project.isInternal,
      totalHours,
      billableHours,
      nonBillableHours,
      userBreakdown,
      taskBreakdown,
    };
  },
};
