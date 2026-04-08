/**
 * Work Instruction Model - v4
 * Library-level work instructions for production stages
 *
 * Architecture notes:
 * - Independent from Project WorkItems (library module, not project-scoped)
 * - Categorized by ProductionStageCode (reuses existing enum)
 * - Scope: 'general' applies to all, 'modelSpecific' references a BoatModel
 * - Markdown content with attachments
 * - Comments are append-only for collaboration
 * - Single write path via WorkInstructionService
 */

import type { ProductionStageCode } from './production';

// ============================================
// WORK INSTRUCTION TYPES
// ============================================

/**
 * Status of a work instruction
 * - draft: Work in progress, not visible to production staff
 * - published: Ready for use in production
 */
export type WorkInstructionStatus = 'draft' | 'published';

/**
 * Scope of a work instruction
 * - general: Applies to all boat models
 * - modelSpecific: Applies to a specific boat model (requires modelRef)
 */
export type WorkInstructionScope = 'general' | 'modelSpecific';

// ============================================
// ATTACHMENT (reuses pattern from ComplianceAttachment)
// ============================================

export interface WorkInstructionAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string; // Base64 data URL for localStorage
  url?: string; // External URL (alternative to dataUrl)
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

// ============================================
// COMMENT (append-only)
// ============================================

/**
 * Comment on a work instruction
 * Append-only: once created, cannot be edited or deleted
 */
export interface WorkInstructionComment {
  id: string;
  workInstructionId: string;
  body: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

// ============================================
// WORK INSTRUCTION
// ============================================

/**
 * Work Instruction entity
 * Library-level instructions for production stages
 */
export interface WorkInstruction {
  id: string;

  /** Title of the work instruction */
  title: string;

  /** Production stage category (reuses existing ProductionStageCode) */
  stageCategory: ProductionStageCode;

  /** Scope: general or model-specific */
  scope: WorkInstructionScope;

  /** Reference to BoatModel.id when scope is 'modelSpecific' */
  modelRef?: string;

  /** Markdown content */
  content: string;

  /** Attached files (documents, images, etc.) */
  attachments: WorkInstructionAttachment[];

  /** Publication status */
  status: WorkInstructionStatus;

  /** Comments (append-only) - stored separately, not inline */
  // Comments are stored in a separate collection for scalability

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================
// INPUT TYPES
// ============================================

export interface CreateWorkInstructionInput {
  title: string;
  stageCategory: ProductionStageCode;
  scope: WorkInstructionScope;
  modelRef?: string;
  content?: string;
}

export interface UpdateWorkInstructionInput {
  title?: string;
  stageCategory?: ProductionStageCode;
  scope?: WorkInstructionScope;
  modelRef?: string;
  content?: string;
}

export interface AddWorkInstructionAttachmentInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  url?: string;
  description?: string;
}

export interface AddWorkInstructionCommentInput {
  body: string;
}

// ============================================
// AI DRAFT TYPES
// ============================================

/**
 * Input for AI draft generation
 * Uses stageCategory and optional modelRef to generate content
 */
export interface GenerateWorkInstructionDraftInput {
  stageCategory: ProductionStageCode;
  modelRef?: string;
  additionalContext?: string;
}

/**
 * Output from AI draft generation
 * User must review and save explicitly
 */
export interface WorkInstructionDraft {
  title: string;
  content: string;
}

// ============================================
// FILTER TYPES
// ============================================

export interface WorkInstructionFilters {
  stageCategory?: ProductionStageCode;
  scope?: WorkInstructionScope;
  modelRef?: string;
  status?: WorkInstructionStatus;
  searchQuery?: string;
}

// ============================================
// LABELS & HELPERS
// ============================================

export const WORK_INSTRUCTION_STATUS_LABELS: Record<WorkInstructionStatus, string> = {
  draft: 'Draft',
  published: 'Published',
};

export const WORK_INSTRUCTION_SCOPE_LABELS: Record<WorkInstructionScope, string> = {
  general: 'General (All Models)',
  modelSpecific: 'Model Specific',
};

/**
 * Create an empty work instruction (for editor initialization)
 */
export function createEmptyWorkInstruction(
  stageCategory: ProductionStageCode,
  createdBy: string
): Omit<WorkInstruction, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: '',
    stageCategory,
    scope: 'general',
    content: '',
    attachments: [],
    status: 'draft',
    createdBy,
    updatedBy: createdBy,
  };
}
