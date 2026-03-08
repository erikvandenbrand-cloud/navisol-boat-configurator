/**
 * Task Model - v4 Unified
 * Consolidated WorkItem model replacing both ProjectTask and PlanningTask
 *
 * Migration Notes:
 * - PlanningTask (planning.tasks) → WorkItem (kind: 'planning')
 * - ProjectTask (tasks) → WorkItem (kind: 'production')
 * - PlanningTaskStatus.DONE → WorkItemStatus.COMPLETED
 * - assignedTo (string) → assigneeIds (string[])
 * - assigneeResourceIds → assigneeIds
 * - dependsOn, dependsOnTaskIds → dependsOnIds
 *
 * Planning Summary (v4.2):
 * - Planning items with `summarizes` field are category summaries
 * - They aggregate production items by category for Gantt/scheduling views
 * - No duplication of task meaning; summaries reference production items
 */

import type { Entity } from './common';

// ============================================
// WORK ITEM KIND (DISCRIMINATOR)
// ============================================

/**
 * Discriminator for work item type.
 * - 'planning': Scheduling-focused summaries (dates, Gantt, resources)
 * - 'production': Execution-focused tasks (stages, time logging, categories)
 */
export type WorkItemKind = 'planning' | 'production';

// ============================================
// WORK ITEM STATUS (UNIFIED)
// ============================================

/**
 * Unified status enum combining old TaskStatus and PlanningTaskStatus.
 * - TODO: Not started
 * - IN_PROGRESS: Work in progress
 * - ON_HOLD: Paused (production only)
 * - COMPLETED: Finished (replaces DONE)
 * - CANCELLED: Cancelled (production only)
 */
export type WorkItemStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

// ============================================
// LEGACY TYPE ALIASES (DEPRECATED)
// ============================================

/**
 * @deprecated Use WorkItemStatus instead
 * Alias for backward compatibility during migration
 */
export type TaskStatus = WorkItemStatus;

/**
 * @deprecated Use WorkItemStatus instead
 * Alias for backward compatibility - DONE maps to COMPLETED
 */
export type PlanningTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

// ============================================
// PRIORITY & CATEGORY
// ============================================

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskCategory =
  | 'HULL'
  | 'PROPULSION'
  | 'ELECTRICAL'
  | 'INTERIOR'
  | 'EXTERIOR'
  | 'NAVIGATION'
  | 'SAFETY'
  | 'FINISHING'
  | 'TESTING'
  | 'DELIVERY'
  | 'OTHER';

// ============================================
// TIME LOG (unchanged)
// ============================================

export interface TaskTimeLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  date: string;
  hours: number;
  description?: string;
  createdAt: string;
}

// ============================================
// PLANNING SUMMARY (v4.3 - Stage/Procedure based)
// ============================================

/**
 * Type of summary grouping - by production stage or by procedure template.
 */
export type PlanningSummaryType = 'stage' | 'procedure';

/**
 * Auto-sync dates behavior for planning summaries.
 * - 'off': Never auto-update dates on refresh
 * - 'whenEmpty': Update only if summary has no dates AND is not locked
 * - 'whenUnlocked': Update only if datesLocked=false
 */
export type AutoSyncDatesMode = 'off' | 'whenEmpty' | 'whenUnlocked';

/**
 * Planning summary metadata for stage/procedure-grouped planning items.
 * When a planning WorkItem has this field, it acts as a summary
 * that references underlying production work items.
 *
 * v4.3: Changed from category-based to stage/procedure-based grouping.
 * Each summary represents either:
 * - All production tasks in a specific Stage (summaryType='stage')
 * - All production tasks from a specific Procedure template (summaryType='procedure')
 */
export interface PlanningSummary {
  /**
   * How this summary groups production items.
   * - 'stage': Groups by stageId
   * - 'procedure': Groups by sourceProcedureId
   */
  summaryType: PlanningSummaryType;

  /**
   * Stage ID when summaryType='stage'.
   * References a ProductionStage in project.productionConfig.stages.
   */
  stageId?: string;

  /**
   * Procedure ID when summaryType='procedure'.
   * References a ProductionProcedure template.
   */
  procedureId?: string;

  /**
   * IDs of production work items summarized by this planning item.
   * These are view-only references; the production items remain the source of truth.
   */
  productionWorkItemIds: string[];

  /**
   * Optional boat instance ID for serial production scoping.
   * If set, this summary only covers production items for this specific boat.
   */
  boatInstanceId?: string;

  /**
   * When the summary was last generated/refreshed.
   */
  lastGeneratedAt: string;

  /**
   * Who generated/refreshed the summary.
   */
  generatedBy: string;

  /**
   * If true, dates were manually edited by user and will not be
   * overwritten during refresh. Use "Recalculate Dates" to reset.
   */
  datesLocked?: boolean;

  /**
   * Controls automatic date sync behavior on refresh.
   * - 'off': Never auto-update dates
   * - 'whenEmpty': Update only if summary has no dates AND not locked
   * - 'whenUnlocked': Update only if datesLocked=false
   * Default: 'whenUnlocked'
   */
  autoSyncDates?: AutoSyncDatesMode;

  /**
   * If true, the summary dates came from Stage entity (plannedStartDate/plannedEndDate)
   * because all referenced production items had no dates.
   * Only applicable for summaryType='stage'.
   * Set at generate/refresh time; display-only for UI.
   */
  usedStageFallback?: boolean;

  /**
   * @deprecated Use stageId or procedureId instead.
   * Kept for migration from v4.2 category-based summaries.
   */
  category?: TaskCategory;
}

// ============================================
// WORK ITEM (UNIFIED TASK MODEL)
// ============================================

/**
 * Unified work item model consolidating ProjectTask and PlanningTask.
 *
 * Usage:
 * - Planning tasks (Gantt, resources): kind = 'planning'
 * - Production tasks (stages, time): kind = 'production'
 *
 * Planning Summaries (v4.2):
 * - Planning items with `summarizes` are category summaries
 * - They show in Gantt/planner but reference production items
 * - Drill-down available to view underlying tasks
 *
 * Stored in: project.workItems: WorkItem[]
 */
export interface WorkItem extends Entity {
  projectId: string;

  /**
   * Sequential number within the project (replaces taskNumber)
   */
  workItemNumber: number;

  /**
   * Discriminator: 'planning' for scheduling, 'production' for execution
   */
  kind: WorkItemKind;

  // ============================================
  // CORE FIELDS (ALL WORK ITEMS)
  // ============================================

  title: string;
  description?: string;
  status: WorkItemStatus;
  notes?: string;

  // ============================================
  // PLANNING SUMMARY (NEW - v4.2/v4.3)
  // ============================================

  /**
   * If present, this planning item is a summary.
   * It aggregates production work items for scheduling views.
   * Only valid when kind = 'planning'.
   */
  summarizes?: PlanningSummary;

  // ============================================
  // SCHEDULING (FROM PLANNINGTASK)
  // ============================================

  /** Start date (ISO yyyy-mm-dd) - primarily for 'planning' items */
  startDate?: string;

  /** End date (ISO yyyy-mm-dd) - primarily for 'planning' items */
  endDate?: string;

  /** Duration in days (alternative to endDate) */
  durationDays?: number;

  // ============================================
  // PRODUCTION (FROM PROJECTTASK)
  // ============================================

  /** Task category - primarily for 'production' items */
  category?: TaskCategory;

  /** Priority - primarily for 'production' items */
  priority?: TaskPriority;

  /** Due date (ISO) - primarily for 'production' items */
  dueDate?: string;

  /** Estimated hours for the task */
  estimatedHours?: number;

  /** When work actually started */
  startedAt?: string;

  /** When work was completed */
  completedAt?: string;

  // ============================================
  // ASSIGNMENT (UNIFIED)
  // ============================================

  /**
   * @deprecated Legacy field - stores resource IDs or names as strings.
   * Use assigneeUserIds for stable User-based assignments.
   *
   * Kept for backward compatibility with existing data.
   * Previously stored:
   * - PlanningResource IDs (stable)
   * - Staff/User names (fragile - breaks if name changes)
   */
  assigneeIds?: string[];

  /**
   * Stable User ID-based assignees (v324+).
   *
   * GOVERNANCE: New assignments should populate this field.
   * - Stores User.id values which are stable across name changes.
   * - On read: prefer this field, fallback to assigneeIds for legacy data.
   * - On write: populate both this and assigneeIds (for backward compat).
   */
  assigneeUserIds?: string[];

  /** When assignment was made */
  assignedAt?: string;

  // ============================================
  // DEPENDENCIES (UNIFIED)
  // ============================================

  /**
   * IDs of work items this item depends on.
   * Replaces: dependsOn, dependsOnTaskIds
   */
  dependsOnIds?: string[];

  /**
   * IDs of work items blocking this item.
   * Kept from ProjectTask for production context.
   */
  blockedByIds?: string[];

  // ============================================
  // TIME TRACKING (FROM PROJECTTASK)
  // ============================================

  /** Time log entries - primarily for 'production' items */
  timeLogs?: TaskTimeLog[];

  /** Total logged hours (sum of timeLogs) */
  totalLoggedHours?: number;

  // ============================================
  // PRODUCTION STAGE LINK
  // ============================================

  /** Link to production stage - for 'production' items */
  stageId?: string;

  /**
   * Sort order within the production stage for Kanban display.
   * Lower values appear first. Updated when reordering within a column.
   */
  stageSortOrder?: number;

  // ============================================
  // ARTICLE LINK
  // ============================================

  /** Link to pinned article version - for 'production' items */
  articleVersionId?: string;

  // ============================================
  // WORK INSTRUCTION LINK
  // ============================================

  /** Link to library work instruction - for 'production' items */
  workInstructionId?: string;

  // ============================================
  // TEMPLATE PROVENANCE
  // ============================================

  /** Source procedure ID if copied from template */
  sourceProcedureId?: string;

  /** Source procedure version ID */
  sourceProcedureVersionId?: string;

  /** Source task set template ID */
  sourceTaskSetTemplateId?: string;

  /** When copied from template */
  copiedFromTemplateAt?: string;

  // ============================================
  // AUDIT
  // ============================================

  createdBy: string;
}

// ============================================
// LEGACY TYPE ALIASES (BACKWARD COMPATIBILITY)
// ============================================

/**
 * @deprecated Use WorkItem with kind: 'production' instead
 * Type alias for backward compatibility during migration.
 */
export type ProjectTask = WorkItem & { kind: 'production' };

/**
 * @deprecated Use WorkItem with kind: 'planning' instead
 * Type alias for backward compatibility during migration.
 * Note: status 'DONE' should be read as 'COMPLETED'.
 */
export type PlanningTask = Omit<WorkItem, 'status'> & {
  kind: 'planning';
  status?: PlanningTaskStatus;
  /** @deprecated Use assigneeIds instead */
  assigneeResourceIds?: string[];
  /** @deprecated Use dependsOnIds instead */
  dependsOnTaskIds?: string[];
};

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateWorkItemInput {
  kind: WorkItemKind;
  title: string;
  description?: string;

  // Scheduling
  startDate?: string;
  endDate?: string;
  durationDays?: number;

  // Production
  category?: TaskCategory;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;

  // Assignment
  /** @deprecated Use assigneeUserIds for stable assignments */
  assigneeIds?: string[];
  /** Stable User ID-based assignees (v324+) */
  assigneeUserIds?: string[];

  // Dependencies
  dependsOnIds?: string[];

  // Links
  stageId?: string;
  articleVersionId?: string;
  workInstructionId?: string;

  // Template provenance
  sourceProcedureId?: string;
  sourceProcedureVersionId?: string;
  sourceTaskSetTemplateId?: string;

  notes?: string;
}

/**
 * @deprecated Use CreateWorkItemInput instead
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  category: TaskCategory;
  priority?: TaskPriority;
  estimatedHours?: number;
  dueDate?: string;
  assignedTo?: string;
  stageId?: string;
  articleVersionId?: string;
  planningTaskId?: string;
  sourceProcedureId?: string;
  sourceProcedureVersionId?: string;
  sourceTaskSetTemplateId?: string;
}

export interface LogTimeInput {
  date: string;
  hours: number;
  description?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a work item is a planning item
 */
export function isPlanningItem(item: WorkItem): boolean {
  return item.kind === 'planning';
}

/**
 * Check if a work item is a production item
 */
export function isProductionItem(item: WorkItem): boolean {
  return item.kind === 'production';
}

/**
 * Normalize legacy DONE status to COMPLETED
 */
export function normalizeStatus(status: string | undefined): WorkItemStatus {
  if (status === 'DONE') return 'COMPLETED';
  if (!status) return 'TODO';
  return status as WorkItemStatus;
}

/**
 * Get effective end date (endDate or calculated from startDate + durationDays)
 */
export function getEffectiveEndDate(item: WorkItem): string | undefined {
  if (item.endDate) return item.endDate;
  if (item.startDate && item.durationDays && item.durationDays > 0) {
    const start = new Date(item.startDate + 'T00:00:00');
    start.setDate(start.getDate() + item.durationDays - 1);
    return start.toISOString().split('T')[0];
  }
  return undefined;
}

/**
 * Get first assignee ID (for backward compatibility with single assignee)
 */
export function getPrimaryAssignee(item: WorkItem): string | undefined {
  return item.assigneeIds?.[0];
}

/**
 * Check if item has valid date range for Gantt display
 */
export function hasValidDateRange(item: WorkItem): boolean {
  if (!item.startDate) return false;
  return !!item.endDate || !!(item.durationDays && item.durationDays > 0);
}
