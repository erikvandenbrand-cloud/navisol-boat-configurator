/**
 * Production Procedure Models - v4
 * Library-level versioned procedures with task set templates
 * For one-time copying into projects (NEW_BUILD only)
 */

import type { Entity, VersionStatus } from './common';
import type { TaskCategory, TaskPriority } from './task';
import type { ProductionStageCode } from './production';

// ============================================
// PRODUCTION PROCEDURE (Library Entity)
// ============================================

/**
 * A library-level production procedure that contains task set templates.
 * Procedures are versioned like other library items.
 */
export interface ProductionProcedure extends Entity {
  name: string;
  description?: string;
  category?: string; // e.g., 'NEW_BUILD', 'ELECTRICAL', 'HULL', etc.
  currentVersionId?: string;
}

// ============================================
// PRODUCTION PROCEDURE VERSION
// ============================================

/**
 * A versioned snapshot of a production procedure.
 * Contains task sets that can be copied to projects.
 * Once APPROVED, it's immutable.
 */
export interface ProductionProcedureVersion extends Entity {
  procedureId: string;
  versionLabel: string; // e.g., "1.0", "2.0"
  status: VersionStatus; // DRAFT | APPROVED | DEPRECATED

  // Task set templates within this version
  taskSets: TaskSetTemplate[];

  // Optional applicability
  applicableModelIds?: string[]; // Boat models this applies to

  // Approval tracking
  approvedAt?: string;
  approvedBy?: string;
  createdBy: string;
}

// ============================================
// TASK SET TEMPLATE
// ============================================

/**
 * A template containing a group of tasks that can be copied to a project.
 */
export interface TaskSetTemplate {
  id: string;
  name: string;
  description?: string;

  // The tasks in this set
  tasks: TemplateTask[];

  // Ordering
  order: number;
}

// ============================================
// TEMPLATE TASK
// ============================================

/**
 * A task template within a task set.
 * When copied to a project, becomes a real ProjectTask.
 */
export interface TemplateTask {
  id: string;
  title: string;
  description?: string;

  // Category for the task
  category: TaskCategory;

  // Optional stage assignment (uses stage code instead of ID)
  defaultStageCode?: ProductionStageCode;

  // Estimation
  estimatedHours?: number;

  // Priority
  priority?: TaskPriority;

  // Optional role requirement (informational)
  requiredRole?: string;

  // Order within the task set
  order: number;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateProductionProcedureInput {
  name: string;
  description?: string;
  category?: string;
}

export interface CreateProductionProcedureVersionInput {
  procedureId: string;
  versionLabel: string;
  taskSets?: TaskSetTemplate[];
  applicableModelIds?: string[];
}

export interface CreateTaskSetTemplateInput {
  name: string;
  description?: string;
  tasks?: Omit<TemplateTask, 'id'>[];
}

export interface CreateTemplateTaskInput {
  title: string;
  description?: string;
  category: TaskCategory;
  defaultStageCode?: ProductionStageCode;
  estimatedHours?: number;
  priority?: TaskPriority;
  requiredRole?: string;
}

// ============================================
// TASK PROVENANCE (for copied tasks)
// ============================================

/**
 * Provenance information added to ProjectTask when copied from a template.
 * These fields are read-only metadata.
 */
export interface TaskProvenance {
  sourceProcedureId?: string;
  sourceProcedureVersionId?: string;
  sourceTaskSetTemplateId?: string;
  copiedAt?: string;
}

// ============================================
// PROCEDURE CATEGORIES
// ============================================

export const PRODUCTION_PROCEDURE_CATEGORIES = [
  { id: 'general', label: 'General', description: 'General production procedures' },
  { id: 'hull', label: 'Hull & Structure', description: 'Hull construction and structural work' },
  { id: 'propulsion', label: 'Propulsion', description: 'Engine and propulsion installation' },
  { id: 'electrical', label: 'Electrical', description: 'Electrical systems installation' },
  { id: 'interior', label: 'Interior', description: 'Interior fit-out and finishing' },
  { id: 'testing', label: 'Testing & QA', description: 'Testing and quality assurance' },
  { id: 'delivery', label: 'Delivery', description: 'Delivery preparation and handover' },
] as const;

export type ProductionProcedureCategory = typeof PRODUCTION_PROCEDURE_CATEGORIES[number]['id'];
