/**
 * Work Instruction Repository
 * Persistence layer for work instructions and comments
 *
 * Architecture:
 * - Uses localStorage adapter (same as other repositories)
 * - Work instructions and comments stored in separate namespaces
 * - Read operations exposed; write operations go through service
 */

import type { WorkInstruction, WorkInstructionComment } from '@/domain/models/work-instruction';
import { getAdapter } from '@/data/persistence';

// ============================================
// NAMESPACES
// ============================================

const NS = {
  WORK_INSTRUCTIONS: 'library_work_instructions',
  WORK_INSTRUCTION_COMMENTS: 'library_work_instruction_comments',
} as const;

// ============================================
// WORK INSTRUCTION REPOSITORY
// ============================================

export const WorkInstructionRepository = {
  /**
   * Get all work instructions
   */
  async getAll(): Promise<WorkInstruction[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstruction>(NS.WORK_INSTRUCTIONS);
    return all.sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Get work instruction by ID
   */
  async getById(id: string): Promise<WorkInstruction | null> {
    const adapter = getAdapter();
    return adapter.getById<WorkInstruction>(NS.WORK_INSTRUCTIONS, id);
  },

  /**
   * Get work instructions by stage category
   */
  async getByStageCategory(stageCategory: string): Promise<WorkInstruction[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstruction>(NS.WORK_INSTRUCTIONS);
    return all
      .filter((wi) => wi.stageCategory === stageCategory)
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Get work instructions by scope
   */
  async getByScope(scope: 'general' | 'modelSpecific'): Promise<WorkInstruction[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstruction>(NS.WORK_INSTRUCTIONS);
    return all
      .filter((wi) => wi.scope === scope)
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Get work instructions by model reference
   */
  async getByModelRef(modelRef: string): Promise<WorkInstruction[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstruction>(NS.WORK_INSTRUCTIONS);
    return all
      .filter((wi) => wi.modelRef === modelRef)
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Get published work instructions only
   */
  async getPublished(): Promise<WorkInstruction[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstruction>(NS.WORK_INSTRUCTIONS);
    return all
      .filter((wi) => wi.status === 'published')
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Search work instructions by title
   */
  async search(query: string): Promise<WorkInstruction[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstruction>(NS.WORK_INSTRUCTIONS);
    const lowerQuery = query.toLowerCase();
    return all.filter((wi) =>
      wi.title.toLowerCase().includes(lowerQuery) ||
      wi.content.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Save a work instruction (internal - use service for writes)
   */
  async save(workInstruction: WorkInstruction): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.WORK_INSTRUCTIONS, workInstruction);
  },

  /**
   * Delete a work instruction (internal - use service for writes)
   */
  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS.WORK_INSTRUCTIONS, id);
  },

  /**
   * Count all work instructions
   */
  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NS.WORK_INSTRUCTIONS);
  },
};

// ============================================
// WORK INSTRUCTION COMMENT REPOSITORY
// ============================================

export const WorkInstructionCommentRepository = {
  /**
   * Get all comments for a work instruction
   */
  async getByWorkInstructionId(workInstructionId: string): Promise<WorkInstructionComment[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstructionComment>(NS.WORK_INSTRUCTION_COMMENTS);
    return all
      .filter((c) => c.workInstructionId === workInstructionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  /**
   * Get comment by ID
   */
  async getById(id: string): Promise<WorkInstructionComment | null> {
    const adapter = getAdapter();
    return adapter.getById<WorkInstructionComment>(NS.WORK_INSTRUCTION_COMMENTS, id);
  },

  /**
   * Save a comment (internal - use service for writes)
   */
  async save(comment: WorkInstructionComment): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NS.WORK_INSTRUCTION_COMMENTS, comment);
  },

  /**
   * Delete all comments for a work instruction (internal - cascade delete)
   */
  async deleteByWorkInstructionId(workInstructionId: string): Promise<void> {
    const adapter = getAdapter();
    const all = await adapter.getAll<WorkInstructionComment>(NS.WORK_INSTRUCTION_COMMENTS);
    const toDelete = all.filter((c) => c.workInstructionId === workInstructionId);
    for (const comment of toDelete) {
      await adapter.delete(NS.WORK_INSTRUCTION_COMMENTS, comment.id);
    }
  },

  /**
   * Count comments for a work instruction
   */
  async countByWorkInstructionId(workInstructionId: string): Promise<number> {
    const comments = await this.getByWorkInstructionId(workInstructionId);
    return comments.length;
  },
};
