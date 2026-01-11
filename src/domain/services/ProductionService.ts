/**
 * Production Service - v4
 * Manages production stages, progress tracking, comments, and photos
 */

import type {
  Project,
  ProductionStage,
  ProductionStageStatus,
  ProductionComment,
  ProductionPhoto,
  ProductionSummary,
  UpdateStageProgressInput,
  AddCommentInput,
  AddPhotoInput,
  ProductionObservation,
  AddObservationInput,
  UpdateObservationInput,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err, DEFAULT_PRODUCTION_STAGES } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// PRODUCTION SERVICE
// ============================================

export const ProductionService = {
  /**
   * Initialize production stages for a project
   * Called when project transitions to IN_PRODUCTION
   */
  async initializeStages(
    projectId: string,
    context: AuditContext
  ): Promise<Result<ProductionStage[], string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Don't reinitialize if stages already exist
    if (project.productionStages && project.productionStages.length > 0) {
      return Ok(project.productionStages);
    }

    // Create default stages
    const stages: ProductionStage[] = DEFAULT_PRODUCTION_STAGES.map((stage) => ({
      id: generateUUID(),
      projectId,
      code: stage.code,
      name: stage.name,
      order: stage.order,
      status: 'NOT_STARTED' as ProductionStageStatus,
      progressPercent: 0,
      autoProgressFromTasks: false, // Manual progress by default
      estimatedDays: stage.estimatedDays,
      taskIds: [],
      comments: [],
      photos: [],
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    }));

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to initialize production stages');
    }

    await AuditService.log(
      context,
      'CREATE',
      'ProductionStages',
      projectId,
      `Initialized ${stages.length} production stages`
    );

    return Ok(stages);
  },

  /**
   * Get production stages for a project
   */
  async getStages(projectId: string): Promise<ProductionStage[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.productionStages || [];
  },

  /**
   * Get a single stage by ID
   */
  async getStageById(projectId: string, stageId: string): Promise<ProductionStage | null> {
    const stages = await this.getStages(projectId);
    return stages.find((s) => s.id === stageId) || null;
  },

  /**
   * Update stage progress
   */
  async updateStageProgress(
    projectId: string,
    stageId: string,
    input: UpdateStageProgressInput,
    context: AuditContext
  ): Promise<Result<ProductionStage, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const stage = project.productionStages[stageIndex];
    const updatedStage: ProductionStage = {
      ...stage,
      ...input,
      lastUpdatedBy: context.userId,
      lastUpdatedAt: now(),
      updatedAt: now(),
      version: stage.version + 1,
    };

    // Handle status transitions
    if (input.status && input.status !== stage.status) {
      if (input.status === 'IN_PROGRESS' && !stage.actualStartDate) {
        updatedStage.actualStartDate = now();
      }
      if (input.status === 'COMPLETED') {
        updatedStage.actualEndDate = now();
        updatedStage.progressPercent = 100;
        // Calculate actual days
        if (updatedStage.actualStartDate) {
          const start = new Date(updatedStage.actualStartDate);
          const end = new Date();
          const diffTime = Math.abs(end.getTime() - start.getTime());
          updatedStage.actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    }

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to update stage');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionStage',
      stageId,
      `Updated stage "${updatedStage.name}": status=${updatedStage.status}, progress=${updatedStage.progressPercent}%`
    );

    return Ok(updatedStage);
  },

  /**
   * Start a stage
   */
  async startStage(
    projectId: string,
    stageId: string,
    context: AuditContext
  ): Promise<Result<ProductionStage, string>> {
    return this.updateStageProgress(projectId, stageId, { status: 'IN_PROGRESS' }, context);
  },

  /**
   * Complete a stage
   */
  async completeStage(
    projectId: string,
    stageId: string,
    context: AuditContext
  ): Promise<Result<ProductionStage, string>> {
    return this.updateStageProgress(projectId, stageId, { status: 'COMPLETED', progressPercent: 100 }, context);
  },

  /**
   * Block a stage
   */
  async blockStage(
    projectId: string,
    stageId: string,
    context: AuditContext
  ): Promise<Result<ProductionStage, string>> {
    return this.updateStageProgress(projectId, stageId, { status: 'BLOCKED' }, context);
  },

  /**
   * Add a comment to a stage
   */
  async addComment(
    projectId: string,
    stageId: string,
    input: AddCommentInput,
    context: AuditContext
  ): Promise<Result<ProductionComment, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const comment: ProductionComment = {
      id: generateUUID(),
      stageId,
      userId: context.userId,
      userName: context.userName,
      content: input.content,
      createdAt: now(),
    };

    const stage = project.productionStages[stageIndex];
    const updatedStage: ProductionStage = {
      ...stage,
      comments: [...stage.comments, comment],
      lastUpdatedBy: context.userId,
      lastUpdatedAt: now(),
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to add comment');
    }

    await AuditService.log(
      context,
      'CREATE',
      'ProductionComment',
      comment.id,
      `Added comment to stage "${stage.name}"`
    );

    return Ok(comment);
  },

  /**
   * Delete a comment from a stage
   */
  async deleteComment(
    projectId: string,
    stageId: string,
    commentId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const stage = project.productionStages[stageIndex];
    const comment = stage.comments.find((c) => c.id === commentId);
    if (!comment) {
      return Err('Comment not found');
    }

    const updatedStage: ProductionStage = {
      ...stage,
      comments: stage.comments.filter((c) => c.id !== commentId),
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to delete comment');
    }

    await AuditService.log(
      context,
      'DELETE',
      'ProductionComment',
      commentId,
      `Deleted comment from stage "${stage.name}"`
    );

    return Ok(undefined);
  },

  /**
   * Add a photo to a stage
   */
  async addPhoto(
    projectId: string,
    stageId: string,
    input: AddPhotoInput,
    context: AuditContext
  ): Promise<Result<ProductionPhoto, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const photo: ProductionPhoto = {
      id: generateUUID(),
      stageId,
      userId: context.userId,
      userName: context.userName,
      caption: input.caption,
      dataUrl: input.dataUrl,
      tags: input.tags,
      references: input.references,
      createdAt: now(),
    };

    const stage = project.productionStages[stageIndex];
    const updatedStage: ProductionStage = {
      ...stage,
      photos: [...stage.photos, photo],
      lastUpdatedBy: context.userId,
      lastUpdatedAt: now(),
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to add photo');
    }

    await AuditService.log(
      context,
      'CREATE',
      'ProductionPhoto',
      photo.id,
      `Added photo to stage "${stage.name}"`
    );

    return Ok(photo);
  },

  /**
   * Delete a photo from a stage
   */
  async deletePhoto(
    projectId: string,
    stageId: string,
    photoId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const stage = project.productionStages[stageIndex];
    const photo = stage.photos.find((p) => p.id === photoId);
    if (!photo) {
      return Err('Photo not found');
    }

    const updatedStage: ProductionStage = {
      ...stage,
      photos: stage.photos.filter((p) => p.id !== photoId),
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to delete photo');
    }

    await AuditService.log(
      context,
      'DELETE',
      'ProductionPhoto',
      photoId,
      `Deleted photo from stage "${stage.name}"`
    );

    return Ok(undefined);
  },

  /**
   * Link a task to a stage
   */
  async linkTaskToStage(
    projectId: string,
    stageId: string,
    taskId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const stage = project.productionStages[stageIndex];
    if (stage.taskIds.includes(taskId)) {
      return Ok(undefined); // Already linked
    }

    const updatedStage: ProductionStage = {
      ...stage,
      taskIds: [...stage.taskIds, taskId],
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to link task');
    }

    return Ok(undefined);
  },

  /**
   * Unlink a task from a stage
   */
  async unlinkTaskFromStage(
    projectId: string,
    stageId: string,
    taskId: string,
    _context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const stage = project.productionStages[stageIndex];
    const updatedStage: ProductionStage = {
      ...stage,
      taskIds: stage.taskIds.filter((id) => id !== taskId),
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to unlink task');
    }

    return Ok(undefined);
  },

  /**
   * Get production summary
   */
  async getSummary(projectId: string): Promise<ProductionSummary> {
    const stages = await this.getStages(projectId);

    if (stages.length === 0) {
      return {
        totalStages: 0,
        completedStages: 0,
        inProgressStages: 0,
        blockedStages: 0,
        overallProgress: 0,
        estimatedDaysRemaining: 0,
        isOnSchedule: true,
      };
    }

    const completedStages = stages.filter((s) => s.status === 'COMPLETED').length;
    const inProgressStages = stages.filter((s) => s.status === 'IN_PROGRESS').length;
    const blockedStages = stages.filter((s) => s.status === 'BLOCKED').length;

    // Calculate overall progress as weighted average
    const totalProgress = stages.reduce((sum, s) => sum + s.progressPercent, 0);
    const overallProgress = Math.round(totalProgress / stages.length);

    // Estimate remaining days based on incomplete stages
    const remainingDays = stages
      .filter((s) => s.status !== 'COMPLETED')
      .reduce((sum, s) => sum + s.estimatedDays, 0);

    // Check if on schedule (simplified - just checks if any stage is blocked)
    const isOnSchedule = blockedStages === 0;

    return {
      totalStages: stages.length,
      completedStages,
      inProgressStages,
      blockedStages,
      overallProgress,
      estimatedDaysRemaining: remainingDays,
      isOnSchedule,
    };
  },

  /**
   * Get tasks for a stage (using task.stageId field)
   */
  async getTasksForStage(projectId: string, stageId: string): Promise<ProjectTask[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    // Use task.stageId field (new approach)
    return project.tasks?.filter((t) => t.stageId === stageId) || [];
  },

  /**
   * Toggle auto progress from tasks for a stage
   */
  async toggleAutoProgress(
    projectId: string,
    stageId: string,
    enabled: boolean,
    context: AuditContext
  ): Promise<Result<ProductionStage, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const stage = project.productionStages[stageIndex];

    // Calculate progress from tasks if enabling auto-progress
    let newProgress = stage.progressPercent;
    if (enabled) {
      const tasks = project.tasks?.filter((t) => t.stageId === stageId) || [];
      const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
      newProgress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    }

    const updatedStage: ProductionStage = {
      ...stage,
      autoProgressFromTasks: enabled,
      progressPercent: newProgress,
      lastUpdatedBy: context.userId,
      lastUpdatedAt: now(),
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to toggle auto progress');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionStage',
      stageId,
      `${enabled ? 'Enabled' : 'Disabled'} auto progress from tasks for "${stage.name}"`
    );

    return Ok(updatedStage);
  },

  /**
   * Recalculate stage progress from tasks
   * Called when a task status changes and stage has autoProgressFromTasks enabled
   */
  async recalculateStageProgress(
    projectId: string,
    stageId: string,
    context: AuditContext
  ): Promise<Result<ProductionStage, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.productionStages || project.productionStages.length === 0) {
      return Err('Production stages not initialized');
    }

    const stageIndex = project.productionStages.findIndex((s) => s.id === stageId);
    if (stageIndex === -1) {
      return Err('Stage not found');
    }

    const stage = project.productionStages[stageIndex];

    // Only recalculate if autoProgressFromTasks is enabled
    if (!stage.autoProgressFromTasks) {
      return Ok(stage);
    }

    const tasks = project.tasks?.filter((t) => t.stageId === stageId) || [];
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const newProgress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    // No change needed
    if (newProgress === stage.progressPercent) {
      return Ok(stage);
    }

    const updatedStage: ProductionStage = {
      ...stage,
      progressPercent: newProgress,
      lastUpdatedBy: context.userId,
      lastUpdatedAt: now(),
      updatedAt: now(),
      version: stage.version + 1,
    };

    const stages = [...project.productionStages];
    stages[stageIndex] = updatedStage;

    const updated = await ProjectRepository.update(projectId, { productionStages: stages });
    if (!updated) {
      return Err('Failed to recalculate progress');
    }

    return Ok(updatedStage);
  },

  /**
   * Get stage task summary (count by status)
   */
  async getStageTaskSummary(projectId: string, stageId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    progressPercent: number;
  }> {
    const tasks = await this.getTasksForStage(projectId, stageId);

    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const total = tasks.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, todo, inProgress, completed, progressPercent };
  },

  // ============================================
  // PRODUCTION OBSERVATIONS / FEEDBACK
  // ============================================

  /**
   * Get all observations for a project (newest first)
   */
  async getObservations(projectId: string): Promise<ProductionObservation[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }
    const observations = project.productionFeedback || [];
    // Return newest first
    return [...observations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Add an observation to a project
   * Only allowed if project is not CLOSED
   */
  async addObservation(
    projectId: string,
    input: AddObservationInput,
    context: AuditContext
  ): Promise<Result<ProductionObservation, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Check if project is closed
    if (project.status === 'CLOSED') {
      return Err('Cannot add observations to a closed project');
    }

    const observation: ProductionObservation = {
      id: generateUUID(),
      projectId,
      text: input.text.trim(),
      tags: input.tags || [],
      createdAt: now(),
      createdBy: context.userId,
      createdByName: context.userName,
    };

    const feedback = [...(project.productionFeedback || []), observation];

    const updated = await ProjectRepository.update(projectId, { productionFeedback: feedback });
    if (!updated) {
      return Err('Failed to add observation');
    }

    await AuditService.log(
      context,
      'CREATE',
      'ProductionObservation',
      observation.id,
      `Added production observation: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`
    );

    return Ok(observation);
  },

  /**
   * Update an observation
   * Only allowed if project is not CLOSED
   */
  async updateObservation(
    projectId: string,
    observationId: string,
    input: UpdateObservationInput,
    context: AuditContext
  ): Promise<Result<ProductionObservation, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Check if project is closed
    if (project.status === 'CLOSED') {
      return Err('Cannot update observations on a closed project');
    }

    const feedback = project.productionFeedback || [];
    const index = feedback.findIndex((o) => o.id === observationId);
    if (index === -1) {
      return Err('Observation not found');
    }

    const existing = feedback[index];
    const updated: ProductionObservation = {
      ...existing,
      text: input.text !== undefined ? input.text.trim() : existing.text,
      tags: input.tags !== undefined ? input.tags : existing.tags,
      updatedAt: now(),
      updatedBy: context.userId,
    };

    const newFeedback = [...feedback];
    newFeedback[index] = updated;

    const result = await ProjectRepository.update(projectId, { productionFeedback: newFeedback });
    if (!result) {
      return Err('Failed to update observation');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionObservation',
      observationId,
      `Updated production observation`
    );

    return Ok(updated);
  },

  /**
   * Delete an observation
   * Only allowed if project is not CLOSED
   */
  async deleteObservation(
    projectId: string,
    observationId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Check if project is closed
    if (project.status === 'CLOSED') {
      return Err('Cannot delete observations from a closed project');
    }

    const feedback = project.productionFeedback || [];
    const observation = feedback.find((o) => o.id === observationId);
    if (!observation) {
      return Err('Observation not found');
    }

    const newFeedback = feedback.filter((o) => o.id !== observationId);

    const result = await ProjectRepository.update(projectId, { productionFeedback: newFeedback });
    if (!result) {
      return Err('Failed to delete observation');
    }

    await AuditService.log(
      context,
      'DELETE',
      'ProductionObservation',
      observationId,
      `Deleted production observation`
    );

    return Ok(undefined);
  },
};

// Import type for JSDoc reference
import type { ProjectTask } from '@/domain/models';
