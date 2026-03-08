/**
 * Project Integrity Assertions - Dev Only
 *
 * These assertions validate that project data follows architectural invariants.
 * They run in development mode only and do NOT block production.
 *
 * Invariants checked:
 * 1. All task-like entities live in project.workItems
 * 2. Every WorkItem has id + kind
 * 3. Planning items with summarizes: productionWorkItemIds exists, referenced IDs are production
 * 4. Production items never reference planning items
 * 5. No legacy writes (planning.tasks, project.tasks should be empty after migration)
 * 6. Date format: planning dates are YYYY-MM-DD or undefined
 */

import type { Project, WorkItem, PlanningSummary } from '@/domain/models';

// ============================================
// TYPES
// ============================================

export interface IntegrityViolation {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
}

export interface IntegrityResult {
  valid: boolean;
  violations: IntegrityViolation[];
}

// ============================================
// DATE FORMAT REGEX
// ============================================

/**
 * Valid date format: YYYY-MM-DD (ISO 8601 date only, no time component)
 */
const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check if a date string is valid YYYY-MM-DD format
 */
function isValidDateFormat(dateStr: string | undefined): boolean {
  if (!dateStr) return true; // undefined is valid
  return YYYY_MM_DD_REGEX.test(dateStr);
}

// ============================================
// INVARIANT CHECKS
// ============================================

/**
 * Check that all WorkItems have required fields (id, kind)
 */
function checkWorkItemsHaveRequiredFields(project: Project): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];
  const workItems = project.workItems || [];

  for (let i = 0; i < workItems.length; i++) {
    const item = workItems[i];

    if (!item.id) {
      violations.push({
        code: 'MISSING_ID',
        message: `WorkItem at index ${i} is missing id`,
        path: `workItems[${i}]`,
        severity: 'error',
      });
    }

    if (!item.kind) {
      violations.push({
        code: 'MISSING_KIND',
        message: `WorkItem ${item.id || i} is missing kind discriminator`,
        path: `workItems[${i}].kind`,
        severity: 'error',
      });
    } else if (item.kind !== 'planning' && item.kind !== 'production') {
      violations.push({
        code: 'INVALID_KIND',
        message: `WorkItem ${item.id || i} has invalid kind: ${item.kind}`,
        path: `workItems[${i}].kind`,
        severity: 'error',
      });
    }
  }

  return violations;
}

/**
 * Check that planning summaries reference valid production items
 */
function checkPlanningSummariesReferences(project: Project): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];
  const workItems = project.workItems || [];

  // Build set of production item IDs
  const productionIds = new Set<string>();
  for (const item of workItems) {
    if (item.kind === 'production') {
      productionIds.add(item.id);
    }
  }

  // Check planning summaries
  for (const item of workItems) {
    if (item.kind !== 'planning' || !item.summarizes) continue;

    const summarizes = item.summarizes;

    // Check that productionWorkItemIds is an array
    if (!Array.isArray(summarizes.productionWorkItemIds)) {
      violations.push({
        code: 'INVALID_PRODUCTION_IDS',
        message: `Planning summary ${item.id} has invalid productionWorkItemIds (not an array)`,
        path: `workItems[${item.id}].summarizes.productionWorkItemIds`,
        severity: 'error',
      });
      continue;
    }

    // Check that referenced IDs exist and are production items
    for (const refId of summarizes.productionWorkItemIds) {
      if (!productionIds.has(refId)) {
        // This might be a warning if we allow dangling references temporarily
        violations.push({
          code: 'INVALID_PRODUCTION_REF',
          message: `Planning summary ${item.id} references non-existent or non-production item: ${refId}`,
          path: `workItems[${item.id}].summarizes.productionWorkItemIds`,
          severity: 'warning', // Warning because items might be deleted
        });
      }
    }

    // Check that summaryType is valid
    if (summarizes.summaryType) {
      if (summarizes.summaryType !== 'stage' && summarizes.summaryType !== 'procedure') {
        violations.push({
          code: 'INVALID_SUMMARY_TYPE',
          message: `Planning summary ${item.id} has invalid summaryType: ${summarizes.summaryType}`,
          path: `workItems[${item.id}].summarizes.summaryType`,
          severity: 'error',
        });
      }

      // Stage summaries should have stageId
      if (summarizes.summaryType === 'stage' && !summarizes.stageId && !summarizes.category) {
        violations.push({
          code: 'MISSING_STAGE_ID',
          message: `Stage summary ${item.id} is missing stageId (and has no legacy category)`,
          path: `workItems[${item.id}].summarizes.stageId`,
          severity: 'warning',
        });
      }

      // Procedure summaries should have procedureId
      if (summarizes.summaryType === 'procedure' && !summarizes.procedureId) {
        violations.push({
          code: 'MISSING_PROCEDURE_ID',
          message: `Procedure summary ${item.id} is missing procedureId`,
          path: `workItems[${item.id}].summarizes.procedureId`,
          severity: 'warning',
        });
      }
    }
  }

  return violations;
}

/**
 * Check that production items don't reference planning items in dependsOnIds
 */
function checkNoProductionToPlanningRefs(project: Project): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];
  const workItems = project.workItems || [];

  // Build set of planning item IDs
  const planningIds = new Set<string>();
  for (const item of workItems) {
    if (item.kind === 'planning') {
      planningIds.add(item.id);
    }
  }

  // Check production items
  for (const item of workItems) {
    if (item.kind !== 'production') continue;

    const dependsOnIds = item.dependsOnIds || [];
    for (const depId of dependsOnIds) {
      if (planningIds.has(depId)) {
        violations.push({
          code: 'PRODUCTION_REFS_PLANNING',
          message: `Production item ${item.id} has dependency on planning item: ${depId}`,
          path: `workItems[${item.id}].dependsOnIds`,
          severity: 'error',
        });
      }
    }
  }

  return violations;
}

/**
 * Check that legacy task structures are empty (migration complete)
 */
function checkNoLegacyTasks(project: Project): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];

  // Check for legacy project.tasks
  const legacyTasks = (project as any).tasks;
  if (Array.isArray(legacyTasks) && legacyTasks.length > 0) {
    violations.push({
      code: 'LEGACY_TASKS_EXIST',
      message: `Project has ${legacyTasks.length} legacy tasks in project.tasks (should be migrated)`,
      path: 'tasks',
      severity: 'warning', // Warning because migration should handle this
    });
  }

  // Check for legacy planning.tasks
  const planningTasks = project.planning?.tasks;
  if (Array.isArray(planningTasks) && planningTasks.length > 0) {
    violations.push({
      code: 'LEGACY_PLANNING_TASKS_EXIST',
      message: `Project has ${planningTasks.length} legacy tasks in planning.tasks (should be migrated)`,
      path: 'planning.tasks',
      severity: 'warning',
    });
  }

  return violations;
}

/**
 * Check that planning dates are in YYYY-MM-DD format
 */
function checkDateFormats(project: Project): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];
  const workItems = project.workItems || [];

  for (const item of workItems) {
    if (item.kind !== 'planning') continue;

    // Check startDate
    if (item.startDate && !isValidDateFormat(item.startDate)) {
      violations.push({
        code: 'INVALID_START_DATE_FORMAT',
        message: `Planning item ${item.id} has invalid startDate format: ${item.startDate} (expected YYYY-MM-DD)`,
        path: `workItems[${item.id}].startDate`,
        severity: 'warning',
      });
    }

    // Check endDate
    if (item.endDate && !isValidDateFormat(item.endDate)) {
      violations.push({
        code: 'INVALID_END_DATE_FORMAT',
        message: `Planning item ${item.id} has invalid endDate format: ${item.endDate} (expected YYYY-MM-DD)`,
        path: `workItems[${item.id}].endDate`,
        severity: 'warning',
      });
    }
  }

  return violations;
}

/**
 * Check for duplicate WorkItem IDs
 */
function checkNoDuplicateIds(project: Project): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];
  const workItems = project.workItems || [];

  const seenIds = new Set<string>();
  for (const item of workItems) {
    if (!item.id) continue;

    if (seenIds.has(item.id)) {
      violations.push({
        code: 'DUPLICATE_WORKITEM_ID',
        message: `Duplicate WorkItem ID found: ${item.id}`,
        path: `workItems[${item.id}]`,
        severity: 'error',
      });
    }
    seenIds.add(item.id);
  }

  return violations;
}

// ============================================
// MAIN ASSERTION FUNCTION
// ============================================

/**
 * Assert project integrity in development mode only.
 * Returns result with violations list. Does NOT throw in production.
 *
 * @param project - The project to validate
 * @param context - Optional context for logging (e.g., 'after-load', 'after-update')
 * @returns IntegrityResult with validity and violations
 */
export function assertProjectIntegrity(
  project: Project,
  context?: string
): IntegrityResult {
  const violations: IntegrityViolation[] = [];

  // Run all checks
  violations.push(...checkWorkItemsHaveRequiredFields(project));
  violations.push(...checkNoDuplicateIds(project));
  violations.push(...checkPlanningSummariesReferences(project));
  violations.push(...checkNoProductionToPlanningRefs(project));
  violations.push(...checkNoLegacyTasks(project));
  violations.push(...checkDateFormats(project));

  const hasErrors = violations.some((v) => v.severity === 'error');
  const valid = !hasErrors;

  // Log in development mode only
  if (process.env.NODE_ENV === 'development' && violations.length > 0) {
    const contextStr = context ? ` [${context}]` : '';
    console.group(`🔍 Project Integrity Check${contextStr}: ${project.projectNumber}`);

    for (const v of violations) {
      const icon = v.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} [${v.code}] ${v.message}`);
      if (v.path) {
        console.log(`   Path: ${v.path}`);
      }
    }

    console.groupEnd();
  }

  return { valid, violations };
}

/**
 * Run integrity check and throw if invalid (dev-only, for testing).
 * In production, this is a no-op.
 */
export function assertProjectIntegrityStrict(
  project: Project,
  context?: string
): void {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    return; // No-op in production
  }

  const result = assertProjectIntegrity(project, context);

  if (!result.valid) {
    const errors = result.violations.filter((v) => v.severity === 'error');
    throw new Error(
      `Project integrity check failed with ${errors.length} error(s):\n` +
        errors.map((e) => `  - [${e.code}] ${e.message}`).join('\n')
    );
  }
}

/**
 * Normalize a date string to YYYY-MM-DD format.
 * Returns undefined if the input is invalid or undefined.
 */
export function normalizeDateToYYYYMMDD(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;

  // Already valid
  if (YYYY_MM_DD_REGEX.test(dateStr)) {
    return dateStr;
  }

  // Try to parse and convert ISO datetime strings
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}
