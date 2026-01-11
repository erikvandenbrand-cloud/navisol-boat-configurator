/**
 * Task Model - v4
 * Production tasks, assignments, and time tracking
 */

import type { Entity } from './common';

// ============================================
// TASK STATUS
// ============================================

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

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
// TASK
// ============================================

export interface ProjectTask extends Entity {
  projectId: string;
  taskNumber: number;

  // Production stage link (optional)
  stageId?: string;

  // Article link (optional) - for accessing pinned article attachments
  articleVersionId?: string;

  // Planning task link (optional) - reference to a PlanningTask for navigation only
  // No data sync - just a reference ID for traceability between Production and Planning
  planningTaskId?: string;

  // Provenance: source information when task was copied from a template
  // These are read-only metadata fields
  sourceProcedureId?: string;
  sourceProcedureVersionId?: string;
  sourceTaskSetTemplateId?: string;
  copiedFromTemplateAt?: string;

  // Details
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;

  // Assignment
  assignedTo?: string;
  assignedAt?: string;

  // Timing
  estimatedHours?: number;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;

  // Dependencies
  dependsOn?: string[]; // Task IDs
  blockedBy?: string[]; // Task IDs

  // Time logs
  timeLogs: TaskTimeLog[];
  totalLoggedHours: number;

  // Notes
  notes?: string;

  createdBy: string;
}

// ============================================
// TIME LOG
// ============================================

export interface TaskTimeLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;

  // Time
  date: string;
  hours: number;
  description?: string;

  createdAt: string;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateTaskInput {
  title: string;
  description?: string;
  category: TaskCategory;
  priority?: TaskPriority;
  estimatedHours?: number;
  dueDate?: string;
  assignedTo?: string;
  stageId?: string; // Link to production stage
  articleVersionId?: string; // Link to pinned article version for attachments
  planningTaskId?: string; // Link to planning task (reference only, no sync)

  // Provenance (set when copying from task set template)
  sourceProcedureId?: string;
  sourceProcedureVersionId?: string;
  sourceTaskSetTemplateId?: string;
}

export interface LogTimeInput {
  date: string;
  hours: number;
  description?: string;
}
