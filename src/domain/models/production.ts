/**
 * Production Stage Model - v4
 * Production workflow with stages, progress tracking, and photos/comments
 */

import type { Entity } from './common';

// ============================================
// PRODUCTION STAGE STATUS
// ============================================

export type ProductionStageStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED';

// ============================================
// DEFAULT PRODUCTION STAGES
// ============================================

export const DEFAULT_PRODUCTION_STAGES = [
  { code: 'PREP', name: 'Preparation', order: 1, estimatedDays: 5 },
  { code: 'HULL', name: 'Hull Construction', order: 2, estimatedDays: 15 },
  { code: 'PROPULSION', name: 'Propulsion Installation', order: 3, estimatedDays: 7 },
  { code: 'ELECTRICAL', name: 'Electrical Systems', order: 4, estimatedDays: 10 },
  { code: 'INTERIOR', name: 'Interior Fit-out', order: 5, estimatedDays: 12 },
  { code: 'EXTERIOR', name: 'Exterior & Finishing', order: 6, estimatedDays: 8 },
  { code: 'SYSTEMS', name: 'Navigation & Safety Systems', order: 7, estimatedDays: 5 },
  { code: 'TESTING', name: 'Testing & Quality Assurance', order: 8, estimatedDays: 5 },
  { code: 'FINAL', name: 'Final Inspection & Handover Prep', order: 9, estimatedDays: 3 },
] as const;

export type ProductionStageCode = typeof DEFAULT_PRODUCTION_STAGES[number]['code'];

// ============================================
// PRODUCTION STAGE
// ============================================

export interface ProductionStage extends Entity {
  projectId: string;
  code: ProductionStageCode;
  name: string;
  order: number;
  status: ProductionStageStatus;

  // Progress
  progressPercent: number; // 0-100 (manual or auto-calculated)
  autoProgressFromTasks: boolean; // If true, progress is derived from task completion %
  estimatedDays: number;
  actualDays?: number;

  // Dates
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;

  // Related tasks (legacy - now tasks have stageId)
  taskIds: string[]; // Deprecated: use task.stageId instead

  // Comments and photos
  comments: ProductionComment[];
  photos: ProductionPhoto[];

  // Tracking
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

// ============================================
// PRODUCTION COMMENT
// ============================================

export interface ProductionComment {
  id: string;
  stageId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

// ============================================
// PRODUCTION PHOTO
// ============================================

export interface ProductionPhoto {
  id: string;
  stageId: string;
  userId: string;
  userName: string;
  caption?: string;
  // Base64 data URL for localStorage
  dataUrl: string;
  thumbnailUrl?: string;

  // Tags and references for future linking
  tags?: string[]; // e.g., ['quality', 'defect', 'progress']
  references?: PhotoReference[]; // Links to tasks, procedures, etc.

  createdAt: string;
}

// Photo reference for linking to other entities
export interface PhotoReference {
  entityType: 'Task' | 'Procedure' | 'Document' | 'Stage';
  entityId: string;
  label?: string;
}

// ============================================
// PRODUCTION SUMMARY
// ============================================

export interface ProductionSummary {
  totalStages: number;
  completedStages: number;
  inProgressStages: number;
  blockedStages: number;
  overallProgress: number; // 0-100
  estimatedDaysRemaining: number;
  isOnSchedule: boolean;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface UpdateStageProgressInput {
  status?: ProductionStageStatus;
  progressPercent?: number;
  autoProgressFromTasks?: boolean;
  actualStartDate?: string;
  actualEndDate?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface AddCommentInput {
  content: string;
}

export interface AddPhotoInput {
  caption?: string;
  dataUrl: string;
  tags?: string[];
  references?: PhotoReference[];
}

// ============================================
// PRODUCTION OBSERVATIONS / FEEDBACK
// ============================================

/**
 * Production observation/feedback entry at project level.
 * Independent of tasks or stages.
 * Mutable until project is CLOSED.
 */
export interface ProductionObservation {
  id: string;
  projectId: string;
  text: string;
  tags: string[]; // Optional free-text tags
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AddObservationInput {
  text: string;
  tags?: string[];
}

export interface UpdateObservationInput {
  text?: string;
  tags?: string[];
}

// ============================================
// STAGE LABELS & STYLES
// ============================================

export const PRODUCTION_STAGE_STATUS_LABELS: Record<ProductionStageStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
};

export const PRODUCTION_STAGE_STATUS_COLORS: Record<ProductionStageStatus, { text: string; bg: string }> = {
  NOT_STARTED: { text: 'text-slate-600', bg: 'bg-slate-100' },
  IN_PROGRESS: { text: 'text-blue-700', bg: 'bg-blue-100' },
  COMPLETED: { text: 'text-green-700', bg: 'bg-green-100' },
  BLOCKED: { text: 'text-red-700', bg: 'bg-red-100' },
};
