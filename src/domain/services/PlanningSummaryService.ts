/**
 * Planning Summary Service - v4.3.1
 *
 * Generates and manages planning summaries grouped by production stage or procedure.
 *
 * Architecture-safe principles:
 * - Production WorkItems (kind='production') are source of truth
 * - Planning summaries store only references + optional dates + lock/autosync flags
 * - NO background sync, NO render-time recomputation
 * - Dates derived ONLY on explicit Generate/Refresh actions
 * - Stage fallback dates used only when all production items have missing dates
 *
 * Key concepts:
 * - One planning summary per Stage OR per Procedure (user's choice)
 * - No duplication: summaries reference production items, don't copy them
 * - Manual generation: user triggers "Generate Planning Summary" action
 * - autoSyncDates controls whether dates are auto-updated on refresh
 */

import type {
  Project,
  WorkItem,
  WorkItemStatus,
  TaskCategory,
  PlanningSummary,
  PlanningSummaryType,
  AutoSyncDatesMode,
  ProductionStage,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// CATEGORY LABELS (kept for backward compatibility)
// ============================================

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  HULL: 'Hull',
  PROPULSION: 'Propulsion',
  ELECTRICAL: 'Electrical',
  INTERIOR: 'Interior',
  EXTERIOR: 'Exterior',
  NAVIGATION: 'Navigation',
  SAFETY: 'Safety',
  FINISHING: 'Finishing',
  TESTING: 'Testing',
  DELIVERY: 'Delivery',
  OTHER: 'Other',
};

// ============================================
// TYPES
// ============================================

export interface GenerateSummaryOptions {
  /**
   * How to group production items for summaries.
   * - 'stage': One summary per production stage (stageId)
   * - 'procedure': One summary per procedure template (sourceProcedureId)
   */
  summaryType: PlanningSummaryType;

  /**
   * Optional boat instance ID for serial production.
   * If provided, only production items linked to this boat are included.
   */
  boatInstanceId?: string;

  /**
   * Default autoSyncDates mode for new summaries.
   * Default: 'whenUnlocked'
   */
  defaultAutoSyncDates?: AutoSyncDatesMode;
}

export interface SummaryGroup {
  /** The grouping key (stageId or procedureId) */
  groupKey: string;
  /** Display label for the group */
  label: string;
  /** Production items in this group */
  productionItems: WorkItem[];
  /** Total estimated hours */
  totalEstimatedHours: number;
  /** Completed count */
  completedCount: number;
  /** Total count */
  totalCount: number;
  /** Progress percentage */
  progressPercent: number;
  /** min(startDate) from production items with dates */
  earliestStart?: string;
  /** max(endDate) from production items with dates */
  latestEnd?: string;
  /** Stage fallback start date (only for stage summaries when all production dates missing) */
  stageFallbackStart?: string;
  /** Stage fallback end date (only for stage summaries when all production dates missing) */
  stageFallbackEnd?: string;
  /** Whether dates came from stage fallback (for UI display) */
  usedStageFallback?: boolean;
}

export interface SummaryGenerationResult {
  created: number;
  updated: number;
  unchanged: number;
  summaries: WorkItem[];
}

// ============================================
// HELPER: Get stage name from project
// ============================================

function getStageName(project: Project, stageId: string): string {
  const stage = project.productionStages?.find((s) => s.id === stageId);
  return stage?.name || `Stage ${stageId.slice(0, 8)}`;
}

// ============================================
// HELPER: Get stage entity from project
// ============================================

function getStageEntity(project: Project, stageId: string): ProductionStage | undefined {
  return project.productionStages?.find((s) => s.id === stageId);
}

// ============================================
// HELPER: Get stage fallback dates
// ============================================

/**
 * Get fallback dates from Stage entity (plannedStartDate, plannedEndDate).
 * Used only when all production items have missing dates.
 * Only applicable for stage summaries.
 */
function getStageFallbackDates(
  project: Project,
  stageId: string
): { startDate?: string; endDate?: string } {
  const stage = getStageEntity(project, stageId);
  if (!stage) return {};

  return {
    startDate: stage.plannedStartDate,
    endDate: stage.plannedEndDate,
  };
}

// ============================================
// HELPER: Get procedure name (would need procedure repository)
// ============================================

function getProcedureName(procedureId: string): string {
  // For now, return a placeholder. In a real implementation,
  // you'd look up the procedure from a repository.
  return `Procedure ${procedureId.slice(0, 8)}`;
}

// ============================================
// PLANNING SUMMARY SERVICE
// ============================================

export const PlanningSummaryService = {
  /**
   * Get production work items grouped by stage or procedure.
   * This is the source data for generating planning summaries.
   *
   * Date derivation rules:
   * - startDate = min(production.startDate) from items with dates
   * - endDate = max(production.endDate) from items with dates
   * - Ignore missing dates
   * - If ALL dates missing AND summaryType='stage': fallback to Stage entity dates
   */
  getProductionItemsByGroup(
    project: Project,
    options: GenerateSummaryOptions
  ): SummaryGroup[] {
    const workItems = project.workItems || [];

    // Filter to production items only
    const productionItems = workItems.filter((w) => w.kind === 'production');

    // Group by the selected key
    const groupMap = new Map<string, WorkItem[]>();

    for (const item of productionItems) {
      let groupKey: string | undefined;

      if (options.summaryType === 'stage') {
        groupKey = item.stageId;
      } else if (options.summaryType === 'procedure') {
        groupKey = item.sourceProcedureId;
      }

      // Skip items without a valid group key
      if (!groupKey) continue;

      const existing = groupMap.get(groupKey) || [];
      existing.push(item);
      groupMap.set(groupKey, existing);
    }

    // Build groups with aggregated data
    const groups: SummaryGroup[] = [];

    for (const [groupKey, items] of groupMap) {
      const completedCount = items.filter((i) => i.status === 'COMPLETED').length;
      const totalEstimatedHours = items.reduce(
        (sum, i) => sum + (i.estimatedHours || 0),
        0
      );

      // Find date range from production items (ignore missing)
      const startDates = items
        .map((i) => i.startDate)
        .filter(Boolean) as string[];
      const endDates = items
        .map((i) => i.endDate || i.dueDate || i.completedAt)
        .filter(Boolean) as string[];

      // min(startDate) - earliest start from production items
      const earliestStart = startDates.length > 0
        ? startDates.sort()[0]
        : undefined;
      // max(endDate) - latest end from production items
      const latestEnd = endDates.length > 0
        ? endDates.sort().reverse()[0]
        : undefined;

      // Stage fallback dates (only for stage summaries when all production dates missing)
      let stageFallbackStart: string | undefined;
      let stageFallbackEnd: string | undefined;
      let usedStageFallback = false;

      if (options.summaryType === 'stage' && !earliestStart && !latestEnd) {
        // All production items have missing dates - try stage fallback
        const fallback = getStageFallbackDates(project, groupKey);
        stageFallbackStart = fallback.startDate;
        stageFallbackEnd = fallback.endDate;
        if (stageFallbackStart || stageFallbackEnd) {
          usedStageFallback = true;
        }
      }

      // Get label based on summary type
      const label = options.summaryType === 'stage'
        ? getStageName(project, groupKey)
        : getProcedureName(groupKey);

      groups.push({
        groupKey,
        label,
        productionItems: items,
        totalEstimatedHours,
        completedCount,
        totalCount: items.length,
        progressPercent: items.length > 0
          ? Math.round((completedCount / items.length) * 100)
          : 0,
        earliestStart,
        latestEnd,
        stageFallbackStart,
        stageFallbackEnd,
        usedStageFallback,
      });
    }

    // Sort by stage order if available
    if (options.summaryType === 'stage' && project.productionStages) {
      const stageOrder = project.productionStages.map((s) => s.id);
      groups.sort((a, b) => {
        const aIdx = stageOrder.indexOf(a.groupKey);
        const bIdx = stageOrder.indexOf(b.groupKey);
        return aIdx - bIdx;
      });
    }

    return groups;
  },

  /**
   * Get effective dates for a summary group.
   * Prefers production-derived dates, falls back to stage dates for stage summaries.
   */
  getEffectiveDatesForGroup(group: SummaryGroup): { startDate?: string; endDate?: string } {
    // Prefer production-derived dates
    if (group.earliestStart || group.latestEnd) {
      return {
        startDate: group.earliestStart,
        endDate: group.latestEnd,
      };
    }

    // Fall back to stage dates (only available for stage summaries)
    if (group.usedStageFallback) {
      return {
        startDate: group.stageFallbackStart,
        endDate: group.stageFallbackEnd,
      };
    }

    return {};
  },

  /**
   * Find existing planning summary for a stage or procedure.
   */
  findExistingSummary(
    project: Project,
    summaryType: PlanningSummaryType,
    groupKey: string,
    boatInstanceId?: string
  ): WorkItem | undefined {
    return (project.workItems || []).find((w) => {
      if (w.kind !== 'planning' || !w.summarizes) return false;
      if (w.summarizes.summaryType !== summaryType) return false;
      if (w.summarizes.boatInstanceId !== boatInstanceId) return false;

      if (summaryType === 'stage') {
        return w.summarizes.stageId === groupKey;
      } else {
        return w.summarizes.procedureId === groupKey;
      }
    });
  },

  /**
   * Derive summary status from aggregated production items.
   * - All COMPLETED → COMPLETED
   * - Any IN_PROGRESS → IN_PROGRESS
   * - Otherwise → TODO
   */
  deriveSummaryStatus(productionItems: WorkItem[]): WorkItemStatus {
    if (productionItems.length === 0) return 'TODO';

    const completedCount = productionItems.filter((i) => i.status === 'COMPLETED').length;
    const inProgressCount = productionItems.filter((i) => i.status === 'IN_PROGRESS').length;

    if (completedCount === productionItems.length) return 'COMPLETED';
    if (inProgressCount > 0 || completedCount > 0) return 'IN_PROGRESS';
    return 'TODO';
  },

  /**
   * Determine if dates should be auto-synced based on autoSyncDates mode.
   */
  shouldAutoSyncDates(
    summary: WorkItem,
    mode: AutoSyncDatesMode | undefined
  ): boolean {
    const effectiveMode = mode ?? 'whenUnlocked';
    const datesLocked = summary.summarizes?.datesLocked ?? false;
    const hasDates = !!summary.startDate || !!summary.endDate;

    switch (effectiveMode) {
      case 'off':
        return false;
      case 'whenEmpty':
        return !hasDates && !datesLocked;
      case 'whenUnlocked':
        return !datesLocked;
      default:
        return !datesLocked;
    }
  },

  /**
   * Generate or update planning summaries grouped by stage or procedure.
   *
   * This is a MANUAL action triggered by the user (explicit refresh only).
   * It creates one planning summary per stage/procedure, referencing ALL matching production items.
   *
   * Date derivation (on generate/refresh only):
   * - startDate = min(production.startDate) from referenced items
   * - endDate = max(production.endDate) from referenced items
   * - If all dates missing AND stage summary: fallback to Stage entity dates
   * - Respects datesLocked and autoSyncDates settings
   */
  async generateSummaries(
    projectId: string,
    options: GenerateSummaryOptions,
    context: AuditContext
  ): Promise<Result<SummaryGenerationResult, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Get production items grouped by stage or procedure
    const groups = this.getProductionItemsByGroup(project, options);

    if (groups.length === 0) {
      const groupName = options.summaryType === 'stage' ? 'stages' : 'procedures';
      return Err(`No production tasks with ${groupName} found. Assign tasks to ${groupName} first.`);
    }

    const workItems = [...(project.workItems || [])];
    let nextNumber = workItems.length > 0
      ? Math.max(...workItems.map((w) => w.workItemNumber)) + 1
      : 1;

    const result: SummaryGenerationResult = {
      created: 0,
      updated: 0,
      unchanged: 0,
      summaries: [],
    };

    for (const group of groups) {
      const existingSummary = this.findExistingSummary(
        { ...project, workItems },
        options.summaryType,
        group.groupKey,
        options.boatInstanceId
      );

      // ALL matching production items get referenced
      const productionIds = group.productionItems.map((i) => i.id);
      const derivedStatus = this.deriveSummaryStatus(group.productionItems);

      // Get effective dates (production-derived or stage fallback)
      const effectiveDates = this.getEffectiveDatesForGroup(group);

      if (existingSummary) {
        // Check if update is needed
        const currentIds = existingSummary.summarizes?.productionWorkItemIds || [];
        const idsMatch =
          currentIds.length === productionIds.length &&
          currentIds.every((id) => productionIds.includes(id));
        const statusMatch = existingSummary.status === derivedStatus;

        if (idsMatch && statusMatch) {
          // No changes needed
          result.unchanged++;
          result.summaries.push(existingSummary);
          continue;
        }

        // Check if dates should be auto-synced (respects lock/autosync settings)
        const autoSyncMode = existingSummary.summarizes?.autoSyncDates;
        const shouldSyncDates = this.shouldAutoSyncDates(existingSummary, autoSyncMode);

        // Update existing summary
        const updatedSummary: WorkItem = {
          ...existingSummary,
          status: derivedStatus,
          description: `${group.totalCount} tasks, ${group.completedCount} completed (${group.progressPercent}%)`,
          summarizes: {
            ...existingSummary.summarizes!,
            productionWorkItemIds: productionIds,
            lastGeneratedAt: now(),
            generatedBy: context.userId,
            // Update fallback flag if dates are being synced
            usedStageFallback: shouldSyncDates
              ? group.usedStageFallback
              : existingSummary.summarizes!.usedStageFallback,
          },
          // Only update dates if autoSync allows (respects datesLocked)
          startDate: shouldSyncDates
            ? (effectiveDates.startDate || existingSummary.startDate)
            : existingSummary.startDate,
          endDate: shouldSyncDates
            ? (effectiveDates.endDate || existingSummary.endDate)
            : existingSummary.endDate,
          estimatedHours: group.totalEstimatedHours,
          updatedAt: now(),
          version: existingSummary.version + 1,
        };

        const idx = workItems.findIndex((w) => w.id === existingSummary.id);
        if (idx >= 0) {
          workItems[idx] = updatedSummary;
        }

        result.updated++;
        result.summaries.push(updatedSummary);
      } else {
        // Create new summary with ALL matching production items
        const summarizes: PlanningSummary = {
          summaryType: options.summaryType,
          stageId: options.summaryType === 'stage' ? group.groupKey : undefined,
          procedureId: options.summaryType === 'procedure' ? group.groupKey : undefined,
          productionWorkItemIds: productionIds,
          boatInstanceId: options.boatInstanceId,
          lastGeneratedAt: now(),
          generatedBy: context.userId,
          datesLocked: false,
          autoSyncDates: options.defaultAutoSyncDates ?? 'whenUnlocked',
          // Track if stage fallback dates were used (display-only for UI)
          usedStageFallback: group.usedStageFallback,
        };

        const newSummary: WorkItem = {
          id: generateUUID(),
          projectId,
          workItemNumber: nextNumber++,
          kind: 'planning',
          title: `${group.label}`,
          description: `${group.totalCount} tasks, ${group.completedCount} completed (${group.progressPercent}%)`,
          status: derivedStatus,
          summarizes,
          // Set date range from production items OR stage fallback
          startDate: effectiveDates.startDate,
          endDate: effectiveDates.endDate,
          estimatedHours: group.totalEstimatedHours,
          createdAt: now(),
          updatedAt: now(),
          version: 0,
          createdBy: context.userId,
        };

        workItems.push(newSummary);
        result.created++;
        result.summaries.push(newSummary);
      }
    }

    // Save updated workItems (single write path)
    const updated = await ProjectRepository.update(projectId, { workItems });
    if (!updated) {
      return Err('Failed to save planning summaries');
    }

    const typeName = options.summaryType === 'stage' ? 'stage' : 'procedure';
    await AuditService.log(
      context,
      'CREATE',
      'PlanningSummary',
      projectId,
      `Generated planning summaries by ${typeName}: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged`
    );

    return Ok(result);
  },

  /**
   * Refresh a single planning summary.
   * Updates the production item references and derived status.
   * Respects autoSyncDates mode and datesLocked for date updates.
   *
   * Date derivation (on explicit refresh only):
   * - startDate = min(production.startDate) from referenced items
   * - endDate = max(production.endDate) from referenced items
   * - If all dates missing AND stage summary: fallback to Stage entity dates
   */
  async refreshSummary(
    projectId: string,
    summaryId: string,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const summaryIdx = workItems.findIndex((w) => w.id === summaryId);

    if (summaryIdx === -1) {
      return Err('Planning summary not found');
    }

    const summary = workItems[summaryIdx];
    if (summary.kind !== 'planning' || !summary.summarizes) {
      return Err('Work item is not a planning summary');
    }

    const summarizes = summary.summarizes;
    const summaryType = summarizes.summaryType || 'stage';
    const groupKey = summaryType === 'stage' ? summarizes.stageId : summarizes.procedureId;

    if (!groupKey) {
      return Err('Summary has no valid grouping key');
    }

    // Get current production items for this group
    const groups = this.getProductionItemsByGroup(project, {
      summaryType,
      boatInstanceId: summarizes.boatInstanceId,
    });

    const group = groups.find((g) => g.groupKey === groupKey);

    if (!group) {
      // No production items for this group anymore
      const updatedSummary: WorkItem = {
        ...summary,
        status: 'TODO',
        description: 'No production tasks',
        summarizes: {
          ...summarizes,
          productionWorkItemIds: [],
          lastGeneratedAt: now(),
          generatedBy: context.userId,
        },
        updatedAt: now(),
        version: summary.version + 1,
      };

      const newWorkItems = [...workItems];
      newWorkItems[summaryIdx] = updatedSummary;

      await ProjectRepository.update(projectId, { workItems: newWorkItems });
      return Ok(updatedSummary);
    }

    // Check if dates should be auto-synced (respects lock/autosync settings)
    const shouldSyncDates = this.shouldAutoSyncDates(summary, summarizes.autoSyncDates);

    // Update with ALL current production items for this group
    const productionIds = group.productionItems.map((i) => i.id);
    const derivedStatus = this.deriveSummaryStatus(group.productionItems);

    // Get effective dates (production-derived or stage fallback)
    const effectiveDates = this.getEffectiveDatesForGroup(group);

    const updatedSummary: WorkItem = {
      ...summary,
      status: derivedStatus,
      description: `${group.totalCount} tasks, ${group.completedCount} completed (${group.progressPercent}%)`,
      summarizes: {
        ...summarizes,
        productionWorkItemIds: productionIds,
        lastGeneratedAt: now(),
        generatedBy: context.userId,
        // Update fallback flag if dates are being synced
        usedStageFallback: shouldSyncDates
          ? group.usedStageFallback
          : summarizes.usedStageFallback,
      },
      // Only update dates if autoSync allows (respects datesLocked)
      startDate: shouldSyncDates
        ? (effectiveDates.startDate || summary.startDate)
        : summary.startDate,
      endDate: shouldSyncDates
        ? (effectiveDates.endDate || summary.endDate)
        : summary.endDate,
      estimatedHours: group.totalEstimatedHours,
      updatedAt: now(),
      version: summary.version + 1,
    };

    const newWorkItems = [...workItems];
    newWorkItems[summaryIdx] = updatedSummary;

    await ProjectRepository.update(projectId, { workItems: newWorkItems });

    const lockedInfo = summarizes.datesLocked ? ' (dates locked)' : '';
    const fallbackInfo = updatedSummary.summarizes?.usedStageFallback ? ' (using stage fallback dates)' : '';
    await AuditService.log(
      context,
      'UPDATE',
      'PlanningSummary',
      summaryId,
      `Refreshed planning summary "${summary.title}"${lockedInfo}${fallbackInfo}`
    );

    return Ok(updatedSummary);
  },

  /**
   * Recalculate dates from production items.
   * This resets datesLocked to false and recomputes startDate/endDate.
   *
   * Date derivation:
   * - startDate = min(production.startDate) from referenced items
   * - endDate = max(production.endDate) from referenced items
   * - If all dates missing AND stage summary: fallback to Stage entity dates
   */
  async recalculateDates(
    projectId: string,
    summaryId: string,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const summaryIdx = workItems.findIndex((w) => w.id === summaryId);

    if (summaryIdx === -1) {
      return Err('Planning summary not found');
    }

    const summary = workItems[summaryIdx];
    if (summary.kind !== 'planning' || !summary.summarizes) {
      return Err('Work item is not a planning summary');
    }

    const summarizes = summary.summarizes;
    const summaryType = summarizes.summaryType || 'stage';
    const groupKey = summaryType === 'stage' ? summarizes.stageId : summarizes.procedureId;

    // Get current production items for this group
    let group: SummaryGroup | undefined;
    if (groupKey) {
      const groups = this.getProductionItemsByGroup(project, {
        summaryType,
        boatInstanceId: summarizes.boatInstanceId,
      });
      group = groups.find((g) => g.groupKey === groupKey);
    }

    // Get effective dates (production-derived or stage fallback)
    const effectiveDates = group
      ? this.getEffectiveDatesForGroup(group)
      : {};

    const newStartDate = effectiveDates.startDate;
    const newEndDate = effectiveDates.endDate;

    const updatedSummary: WorkItem = {
      ...summary,
      summarizes: {
        ...summarizes,
        // Reset datesLocked to false
        datesLocked: false,
        lastGeneratedAt: now(),
        generatedBy: context.userId,
        // Update fallback flag based on current state
        usedStageFallback: group?.usedStageFallback ?? false,
      },
      // Set dates from production items OR stage fallback (or undefined if no dates)
      startDate: newStartDate,
      endDate: newEndDate,
      updatedAt: now(),
      version: summary.version + 1,
    };

    const newWorkItems = [...workItems];
    newWorkItems[summaryIdx] = updatedSummary;

    await ProjectRepository.update(projectId, { workItems: newWorkItems });

    const fallbackInfo = updatedSummary.summarizes?.usedStageFallback ? ' (using stage fallback)' : '';
    await AuditService.log(
      context,
      'UPDATE',
      'PlanningSummary',
      summaryId,
      `Recalculated dates for planning summary "${summary.title}": ${newStartDate || 'none'} - ${newEndDate || 'none'}${fallbackInfo}`
    );

    return Ok(updatedSummary);
  },

  /**
   * Update autoSyncDates mode for a planning summary.
   */
  async updateAutoSyncMode(
    projectId: string,
    summaryId: string,
    autoSyncDates: AutoSyncDatesMode,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const summaryIdx = workItems.findIndex((w) => w.id === summaryId);

    if (summaryIdx === -1) {
      return Err('Planning summary not found');
    }

    const summary = workItems[summaryIdx];
    if (summary.kind !== 'planning' || !summary.summarizes) {
      return Err('Work item is not a planning summary');
    }

    const updatedSummary: WorkItem = {
      ...summary,
      summarizes: {
        ...summary.summarizes,
        autoSyncDates,
      },
      updatedAt: now(),
      version: summary.version + 1,
    };

    const newWorkItems = [...workItems];
    newWorkItems[summaryIdx] = updatedSummary;

    await ProjectRepository.update(projectId, { workItems: newWorkItems });

    return Ok(updatedSummary);
  },

  /**
   * Lock dates for a planning summary (called when user manually edits dates).
   */
  async lockDates(
    projectId: string,
    summaryId: string,
    context: AuditContext
  ): Promise<Result<WorkItem, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const summaryIdx = workItems.findIndex((w) => w.id === summaryId);

    if (summaryIdx === -1) {
      return Err('Planning summary not found');
    }

    const summary = workItems[summaryIdx];
    if (summary.kind !== 'planning' || !summary.summarizes) {
      return Err('Work item is not a planning summary');
    }

    // Already locked, no action needed
    if (summary.summarizes.datesLocked) {
      return Ok(summary);
    }

    const updatedSummary: WorkItem = {
      ...summary,
      summarizes: {
        ...summary.summarizes,
        datesLocked: true,
      },
      updatedAt: now(),
      version: summary.version + 1,
    };

    const newWorkItems = [...workItems];
    newWorkItems[summaryIdx] = updatedSummary;

    await ProjectRepository.update(projectId, { workItems: newWorkItems });

    return Ok(updatedSummary);
  },

  /**
   * Delete a planning summary.
   * Only deletes the summary, not the underlying production items.
   */
  async deleteSummary(
    projectId: string,
    summaryId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const workItems = project.workItems || [];
    const summary = workItems.find((w) => w.id === summaryId);

    if (!summary) {
      return Err('Planning summary not found');
    }

    if (summary.kind !== 'planning' || !summary.summarizes) {
      return Err('Work item is not a planning summary');
    }

    const newWorkItems = workItems.filter((w) => w.id !== summaryId);

    await ProjectRepository.update(projectId, { workItems: newWorkItems });

    await AuditService.log(
      context,
      'DELETE',
      'PlanningSummary',
      summaryId,
      `Deleted planning summary "${summary.title}"`
    );

    return Ok(undefined);
  },

  /**
   * Get production items for a planning summary (for drill-down view).
   * Returns ALL production items referenced by productionWorkItemIds.
   */
  async getProductionItemsForSummary(
    projectId: string,
    summaryId: string
  ): Promise<WorkItem[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return [];

    const summary = (project.workItems || []).find((w) => w.id === summaryId);
    if (!summary || !summary.summarizes) return [];

    const productionIds = summary.summarizes.productionWorkItemIds || [];
    return (project.workItems || []).filter(
      (w) => w.kind === 'production' && productionIds.includes(w.id)
    );
  },

  /**
   * Check if a work item is a planning summary (has summarizes field).
   */
  isSummary(item: WorkItem): boolean {
    return item.kind === 'planning' && !!item.summarizes;
  },

  /**
   * Get all planning summaries for a project.
   */
  async getSummaries(projectId: string): Promise<WorkItem[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return [];

    return (project.workItems || []).filter(
      (w) => w.kind === 'planning' && w.summarizes
    );
  },

  /**
   * Get all planning items (both summaries and manual planning items).
   * This is what planning screens should display.
   */
  async getPlanningItems(projectId: string): Promise<WorkItem[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return [];

    return (project.workItems || []).filter((w) => w.kind === 'planning');
  },

  /**
   * Get summary label for display.
   */
  getSummaryLabel(summary: WorkItem, project?: Project): string {
    if (!summary.summarizes) return summary.title;

    const summarizes = summary.summarizes;
    if (summarizes.summaryType === 'stage' && summarizes.stageId && project) {
      return getStageName(project, summarizes.stageId);
    }
    if (summarizes.summaryType === 'procedure' && summarizes.procedureId) {
      return getProcedureName(summarizes.procedureId);
    }
    // Fallback for legacy category-based summaries
    if (summarizes.category) {
      return CATEGORY_LABELS[summarizes.category] || summary.title;
    }
    return summary.title;
  },
};
