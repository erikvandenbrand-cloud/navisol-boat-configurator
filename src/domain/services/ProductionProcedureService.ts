/**
 * Production Procedure Service - v4
 * Manages library-level production procedures with task set templates
 * Supports copy-once pattern for NEW_BUILD projects only
 */

import type {
  ProductionProcedure,
  ProductionProcedureVersion,
  TaskSetTemplate,
  TemplateTask,
  CreateProductionProcedureInput,
  CreateTaskSetTemplateInput,
  CreateTemplateTaskInput,
  Project,
  ProjectTask,
  CreateTaskInput,
  ProductionStage,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProductionProcedureRepository } from '@/data/repositories/ProductionProcedureRepository';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { TaskService } from './TaskService';

// ============================================
// PRODUCTION PROCEDURE SERVICE
// ============================================

export const ProductionProcedureService = {
  // ============================================
  // PROCEDURE CRUD
  // ============================================

  /**
   * Get all production procedures
   */
  async getAllProcedures(): Promise<ProductionProcedure[]> {
    return ProductionProcedureRepository.getAll();
  },

  /**
   * Get procedure by ID
   */
  async getProcedureById(id: string): Promise<ProductionProcedure | null> {
    return ProductionProcedureRepository.getById(id);
  },

  /**
   * Get procedure with all versions
   */
  async getProcedureWithVersions(procedureId: string): Promise<{
    procedure: ProductionProcedure;
    versions: ProductionProcedureVersion[];
  } | null> {
    const procedure = await ProductionProcedureRepository.getById(procedureId);
    if (!procedure) return null;

    const versions = await ProductionProcedureRepository.getVersions(procedureId);
    return { procedure, versions };
  },

  /**
   * Create a new production procedure
   */
  async createProcedure(
    input: CreateProductionProcedureInput,
    context: AuditContext
  ): Promise<Result<ProductionProcedure, string>> {
    try {
      const procedure = await ProductionProcedureRepository.create(input);

      await AuditService.logCreate(context, 'ProductionProcedure', procedure.id, {
        name: input.name,
        category: input.category,
      });

      return Ok(procedure);
    } catch (error) {
      return Err(`Failed to create procedure: ${error}`);
    }
  },

  /**
   * Update a production procedure
   */
  async updateProcedure(
    procedureId: string,
    updates: Partial<Pick<ProductionProcedure, 'name' | 'description' | 'category'>>,
    context: AuditContext
  ): Promise<Result<ProductionProcedure, string>> {
    const existing = await ProductionProcedureRepository.getById(procedureId);
    if (!existing) {
      return Err('Procedure not found');
    }

    const updated = await ProductionProcedureRepository.update(procedureId, updates);
    if (!updated) {
      return Err('Failed to update procedure');
    }

    await AuditService.logUpdate(
      context,
      'ProductionProcedure',
      procedureId,
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    );

    return Ok(updated);
  },

  /**
   * Delete a production procedure (and all versions)
   */
  async deleteProcedure(
    procedureId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const procedure = await ProductionProcedureRepository.getById(procedureId);
    if (!procedure) {
      return Err('Procedure not found');
    }

    // Check if any versions are APPROVED (cannot delete approved procedures)
    const versions = await ProductionProcedureRepository.getVersions(procedureId);
    const hasApproved = versions.some((v) => v.status === 'APPROVED');
    if (hasApproved) {
      return Err('Cannot delete procedure with approved versions');
    }

    await ProductionProcedureRepository.delete(procedureId);

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionProcedure',
      procedureId,
      `Deleted production procedure: ${procedure.name}`
    );

    return Ok(undefined);
  },

  // ============================================
  // VERSION MANAGEMENT
  // ============================================

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<ProductionProcedureVersion | null> {
    return ProductionProcedureRepository.getVersion(versionId);
  },

  /**
   * Get current (approved) version for a procedure
   */
  async getCurrentVersion(procedureId: string): Promise<ProductionProcedureVersion | null> {
    return ProductionProcedureRepository.getCurrentVersion(procedureId);
  },

  /**
   * Get all approved versions (for use in project)
   */
  async getApprovedVersions(): Promise<ProductionProcedureVersion[]> {
    return ProductionProcedureRepository.getApprovedVersions();
  },

  /**
   * Create a new version
   */
  async createVersion(
    procedureId: string,
    versionLabel: string,
    context: AuditContext
  ): Promise<Result<ProductionProcedureVersion, string>> {
    const procedure = await ProductionProcedureRepository.getById(procedureId);
    if (!procedure) {
      return Err('Procedure not found');
    }

    try {
      const version = await ProductionProcedureRepository.createVersion(
        procedureId,
        versionLabel,
        [],
        [],
        context.userId
      );

      await AuditService.logCreate(context, 'ProductionProcedureVersion', version.id, {
        procedureId,
        versionLabel,
      });

      return Ok(version);
    } catch (error) {
      return Err(`Failed to create version: ${error}`);
    }
  },

  /**
   * Update a draft version
   */
  async updateVersion(
    versionId: string,
    updates: {
      taskSets?: TaskSetTemplate[];
      applicableModelIds?: string[];
    },
    context: AuditContext
  ): Promise<Result<ProductionProcedureVersion, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Cannot update a non-draft version');
    }

    const updated = await ProductionProcedureRepository.updateVersion(versionId, updates);
    if (!updated) {
      return Err('Failed to update version');
    }

    await AuditService.logUpdate(
      context,
      'ProductionProcedureVersion',
      versionId,
      version as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    );

    return Ok(updated);
  },

  /**
   * Approve a version (locks it)
   */
  async approveVersion(
    versionId: string,
    context: AuditContext
  ): Promise<Result<ProductionProcedureVersion, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Only draft versions can be approved');
    }

    // Validate version has at least one task set with at least one task
    if (version.taskSets.length === 0) {
      return Err('Cannot approve version with no task sets');
    }

    const hasEmptyTaskSet = version.taskSets.some((ts) => ts.tasks.length === 0);
    if (hasEmptyTaskSet) {
      return Err('Cannot approve version with empty task sets');
    }

    const approved = await ProductionProcedureRepository.approveVersion(versionId, context.userId);
    if (!approved) {
      return Err('Failed to approve version');
    }

    await AuditService.logApproval(context, 'ProductionProcedureVersion', versionId, approved.versionLabel);

    return Ok(approved);
  },

  /**
   * Deprecate a version
   */
  async deprecateVersion(
    versionId: string,
    context: AuditContext
  ): Promise<Result<ProductionProcedureVersion, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'APPROVED') {
      return Err('Only approved versions can be deprecated');
    }

    const deprecated = await ProductionProcedureRepository.deprecateVersion(versionId);
    if (!deprecated) {
      return Err('Failed to deprecate version');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionProcedureVersion',
      versionId,
      `Deprecated version ${version.versionLabel}`
    );

    return Ok(deprecated);
  },

  // ============================================
  // TASK SET MANAGEMENT
  // ============================================

  /**
   * Add a task set to a draft version
   */
  async addTaskSet(
    versionId: string,
    input: CreateTaskSetTemplateInput,
    context: AuditContext
  ): Promise<Result<TaskSetTemplate, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Cannot modify a non-draft version');
    }

    const taskSet: TaskSetTemplate = {
      id: generateUUID(),
      name: input.name,
      description: input.description,
      tasks: (input.tasks || []).map((t, i) => ({
        id: generateUUID(),
        ...t,
        order: i,
      })),
      order: version.taskSets.length,
    };

    const taskSets = [...version.taskSets, taskSet];
    const updated = await ProductionProcedureRepository.updateVersion(versionId, { taskSets });

    if (!updated) {
      return Err('Failed to add task set');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionProcedureVersion',
      versionId,
      `Added task set: ${input.name}`
    );

    return Ok(taskSet);
  },

  /**
   * Update a task set in a draft version
   */
  async updateTaskSet(
    versionId: string,
    taskSetId: string,
    updates: Partial<Pick<TaskSetTemplate, 'name' | 'description' | 'tasks' | 'order'>>,
    context: AuditContext
  ): Promise<Result<TaskSetTemplate, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Cannot modify a non-draft version');
    }

    const taskSetIndex = version.taskSets.findIndex((ts) => ts.id === taskSetId);
    if (taskSetIndex === -1) {
      return Err('Task set not found');
    }

    const taskSets = [...version.taskSets];
    taskSets[taskSetIndex] = {
      ...taskSets[taskSetIndex],
      ...updates,
    };

    const updated = await ProductionProcedureRepository.updateVersion(versionId, { taskSets });
    if (!updated) {
      return Err('Failed to update task set');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionProcedureVersion',
      versionId,
      `Updated task set: ${taskSets[taskSetIndex].name}`
    );

    return Ok(taskSets[taskSetIndex]);
  },

  /**
   * Remove a task set from a draft version
   */
  async removeTaskSet(
    versionId: string,
    taskSetId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Cannot modify a non-draft version');
    }

    const taskSet = version.taskSets.find((ts) => ts.id === taskSetId);
    if (!taskSet) {
      return Err('Task set not found');
    }

    const taskSets = version.taskSets.filter((ts) => ts.id !== taskSetId);
    const updated = await ProductionProcedureRepository.updateVersion(versionId, { taskSets });

    if (!updated) {
      return Err('Failed to remove task set');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionProcedureVersion',
      versionId,
      `Removed task set: ${taskSet.name}`
    );

    return Ok(undefined);
  },

  /**
   * Add a task to a task set in a draft version
   */
  async addTemplateTask(
    versionId: string,
    taskSetId: string,
    input: CreateTemplateTaskInput,
    context: AuditContext
  ): Promise<Result<TemplateTask, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Cannot modify a non-draft version');
    }

    const taskSetIndex = version.taskSets.findIndex((ts) => ts.id === taskSetId);
    if (taskSetIndex === -1) {
      return Err('Task set not found');
    }

    const task: TemplateTask = {
      id: generateUUID(),
      title: input.title,
      description: input.description,
      category: input.category,
      defaultStageCode: input.defaultStageCode,
      estimatedHours: input.estimatedHours,
      priority: input.priority,
      requiredRole: input.requiredRole,
      order: version.taskSets[taskSetIndex].tasks.length,
    };

    const taskSets = [...version.taskSets];
    taskSets[taskSetIndex] = {
      ...taskSets[taskSetIndex],
      tasks: [...taskSets[taskSetIndex].tasks, task],
    };

    const updated = await ProductionProcedureRepository.updateVersion(versionId, { taskSets });
    if (!updated) {
      return Err('Failed to add task');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProductionProcedureVersion',
      versionId,
      `Added task "${input.title}" to task set`
    );

    return Ok(task);
  },

  /**
   * Update a template task
   */
  async updateTemplateTask(
    versionId: string,
    taskSetId: string,
    taskId: string,
    updates: Partial<Omit<TemplateTask, 'id'>>,
    context: AuditContext
  ): Promise<Result<TemplateTask, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Cannot modify a non-draft version');
    }

    const taskSetIndex = version.taskSets.findIndex((ts) => ts.id === taskSetId);
    if (taskSetIndex === -1) {
      return Err('Task set not found');
    }

    const taskIndex = version.taskSets[taskSetIndex].tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      return Err('Task not found');
    }

    const taskSets = [...version.taskSets];
    const tasks = [...taskSets[taskSetIndex].tasks];
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    taskSets[taskSetIndex] = { ...taskSets[taskSetIndex], tasks };

    const updated = await ProductionProcedureRepository.updateVersion(versionId, { taskSets });
    if (!updated) {
      return Err('Failed to update task');
    }

    return Ok(tasks[taskIndex]);
  },

  /**
   * Remove a template task
   */
  async removeTemplateTask(
    versionId: string,
    taskSetId: string,
    taskId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const version = await ProductionProcedureRepository.getVersion(versionId);
    if (!version) {
      return Err('Version not found');
    }

    if (version.status !== 'DRAFT') {
      return Err('Cannot modify a non-draft version');
    }

    const taskSetIndex = version.taskSets.findIndex((ts) => ts.id === taskSetId);
    if (taskSetIndex === -1) {
      return Err('Task set not found');
    }

    const taskSets = [...version.taskSets];
    taskSets[taskSetIndex] = {
      ...taskSets[taskSetIndex],
      tasks: taskSets[taskSetIndex].tasks.filter((t) => t.id !== taskId),
    };

    const updated = await ProductionProcedureRepository.updateVersion(versionId, { taskSets });
    if (!updated) {
      return Err('Failed to remove task');
    }

    return Ok(undefined);
  },

  // ============================================
  // COPY TO PROJECT
  // ============================================

  /**
   * Check if a task set has already been applied to a project
   * Detects via existing task provenance (sourceTaskSetTemplateId)
   */
  async isTaskSetAlreadyApplied(
    projectId: string,
    taskSetId: string
  ): Promise<boolean> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) return false;

    // Check if any task in the project has this sourceTaskSetTemplateId
    return project.tasks.some((task) => task.sourceTaskSetTemplateId === taskSetId);
  },

  /**
   * Copy a task set to a project as real tasks
   * Only allowed for NEW_BUILD projects
   * @param forceDuplicate - Must be true to allow duplicate task sets
   */
  async copyTaskSetToProject(
    projectId: string,
    procedureVersionId: string,
    taskSetId: string,
    context: AuditContext,
    forceDuplicate: boolean = false
  ): Promise<Result<ProjectTask[], string>> {
    // Get project and validate type
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Project type gating: only NEW_BUILD
    if (project.type !== 'NEW_BUILD') {
      return Err('Task sets can only be copied to NEW_BUILD projects');
    }

    // Get procedure version
    const version = await ProductionProcedureRepository.getVersion(procedureVersionId);
    if (!version) {
      return Err('Procedure version not found');
    }

    if (version.status !== 'APPROVED') {
      return Err('Only approved versions can be copied to projects');
    }

    // Find task set
    const taskSet = version.taskSets.find((ts) => ts.id === taskSetId);
    if (!taskSet) {
      return Err('Task set not found');
    }

    // Check for duplicate task set application
    const isAlreadyApplied = await this.isTaskSetAlreadyApplied(projectId, taskSetId);
    if (isAlreadyApplied && !forceDuplicate) {
      return Err('DUPLICATE_TASK_SET: This task set has already been added to this project. Set forceDuplicate=true to allow.');
    }

    // Get production stages to map stage codes to stage IDs
    const stageMap = new Map<string, string>();
    if (project.productionStages) {
      for (const stage of project.productionStages) {
        stageMap.set(stage.code, stage.id);
      }
    }

    // Create tasks
    const createdTasks: ProjectTask[] = [];

    for (const templateTask of taskSet.tasks.sort((a, b) => a.order - b.order)) {
      const stageId = templateTask.defaultStageCode
        ? stageMap.get(templateTask.defaultStageCode)
        : undefined;

      const input: CreateTaskInput = {
        title: templateTask.title,
        description: templateTask.description,
        category: templateTask.category,
        priority: templateTask.priority,
        estimatedHours: templateTask.estimatedHours,
        stageId,
        // Provenance
        sourceProcedureId: version.procedureId,
        sourceProcedureVersionId: version.id,
        sourceTaskSetTemplateId: taskSetId,
      };

      const result = await TaskService.createTask(projectId, input, context);
      if (result.ok) {
        createdTasks.push(result.value);
      }
    }

    // Log the copy action
    await AuditService.log(
      context,
      'CREATE',
      'ProjectTask',
      projectId,
      `Copied ${createdTasks.length} tasks from task set "${taskSet.name}"`,
      {
        after: {
          procedureVersionId,
          taskSetId,
          taskSetName: taskSet.name,
          tasksCreated: createdTasks.length,
        },
      }
    );

    return Ok(createdTasks);
  },

  /**
   * Get available task sets for a project (approved versions only)
   */
  async getAvailableTaskSetsForProject(projectId: string): Promise<{
    procedure: ProductionProcedure;
    version: ProductionProcedureVersion;
    taskSets: TaskSetTemplate[];
  }[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project || project.type !== 'NEW_BUILD') {
      return [];
    }

    const procedures = await ProductionProcedureRepository.getAll();
    const result: {
      procedure: ProductionProcedure;
      version: ProductionProcedureVersion;
      taskSets: TaskSetTemplate[];
    }[] = [];

    for (const procedure of procedures) {
      if (!procedure.currentVersionId) continue;

      const version = await ProductionProcedureRepository.getVersion(procedure.currentVersionId);
      if (!version || version.status !== 'APPROVED') continue;

      // Check applicability
      if (
        version.applicableModelIds &&
        version.applicableModelIds.length > 0 &&
        project.configuration.boatModelVersionId
      ) {
        // Filter by applicable models if specified
        // For now, we skip this check and include all approved versions
      }

      if (version.taskSets.length > 0) {
        result.push({
          procedure,
          version,
          taskSets: version.taskSets,
        });
      }
    }

    return result;
  },

  // ============================================
  // DEFAULT PROCEDURE INITIALIZATION
  // ============================================

  /**
   * Initialize default production procedures if none exist
   * Called once on first Library load - idempotent
   */
  async initializeDefaults(context: AuditContext): Promise<void> {
    const existing = await ProductionProcedureRepository.getAll();
    if (existing.length > 0) {
      // Already have procedures, don't duplicate
      return;
    }

    console.log('Initializing default production procedures...');

    // Create and approve default procedures
    for (const defaultProc of DEFAULT_PRODUCTION_PROCEDURES) {
      // Create procedure
      const procedure = await ProductionProcedureRepository.create({
        name: defaultProc.name,
        description: defaultProc.description,
        category: defaultProc.category,
      });

      // Create version with task sets
      const taskSets: TaskSetTemplate[] = defaultProc.taskSets.map((ts, tsIndex) => ({
        id: generateUUID(),
        name: ts.name,
        description: ts.description,
        order: tsIndex,
        tasks: ts.tasks.map((task, taskIndex) => ({
          id: generateUUID(),
          title: task.title,
          description: task.description,
          category: task.category,
          defaultStageCode: task.defaultStageCode,
          estimatedHours: task.estimatedHours,
          priority: task.priority || 'MEDIUM',
          order: taskIndex,
        })),
      }));

      const version = await ProductionProcedureRepository.createVersion(
        procedure.id,
        '1.0',
        taskSets,
        [], // No model restrictions
        context.userId
      );

      // Approve the version immediately (so it's usable)
      await ProductionProcedureRepository.approveVersion(version.id, context.userId);
    }

    console.log(`Initialized ${DEFAULT_PRODUCTION_PROCEDURES.length} default production procedures`);
  },
};

// ============================================
// DEFAULT PRODUCTION PROCEDURES DATA
// ============================================

import type { TaskCategory, TaskPriority, ProductionStageCode } from '@/domain/models';

interface DefaultTaskDef {
  title: string;
  description?: string;
  category: TaskCategory;
  defaultStageCode?: ProductionStageCode;
  estimatedHours?: number;
  priority?: TaskPriority;
}

interface DefaultTaskSetDef {
  name: string;
  description?: string;
  tasks: DefaultTaskDef[];
}

interface DefaultProcedureDef {
  name: string;
  description?: string;
  category: string;
  taskSets: DefaultTaskSetDef[];
}

const DEFAULT_PRODUCTION_PROCEDURES: DefaultProcedureDef[] = [
  {
    name: 'Standard New Build Process',
    description: 'Complete production procedure for new boat builds with all major phases',
    category: 'general',
    taskSets: [
      {
        name: 'Preparation & Planning',
        description: 'Initial setup and planning tasks before production begins',
        tasks: [
          {
            title: 'Review project specifications',
            description: 'Review client requirements and configuration details',
            category: 'OTHER',
            defaultStageCode: 'PREP',
            estimatedHours: 2,
            priority: 'HIGH',
          },
          {
            title: 'Verify BOM availability',
            description: 'Check stock levels and order missing materials',
            category: 'OTHER',
            defaultStageCode: 'PREP',
            estimatedHours: 4,
            priority: 'HIGH',
          },
          {
            title: 'Prepare workspace',
            description: 'Set up tools, jigs, and work area for hull construction',
            category: 'OTHER',
            defaultStageCode: 'PREP',
            estimatedHours: 3,
            priority: 'MEDIUM',
          },
          {
            title: 'Schedule production milestones',
            description: 'Plan key dates and assign team members',
            category: 'OTHER',
            defaultStageCode: 'PREP',
            estimatedHours: 2,
            priority: 'MEDIUM',
          },
        ],
      },
      {
        name: 'Hull Construction',
        description: 'Core hull building tasks',
        tasks: [
          {
            title: 'Mold preparation',
            description: 'Prepare and condition hull mold',
            category: 'HULL',
            defaultStageCode: 'HULL',
            estimatedHours: 4,
            priority: 'HIGH',
          },
          {
            title: 'Gelcoat application',
            description: 'Apply gelcoat layer to mold',
            category: 'HULL',
            defaultStageCode: 'HULL',
            estimatedHours: 3,
            priority: 'HIGH',
          },
          {
            title: 'Lamination - outer skin',
            description: 'Apply outer fiberglass lamination layers',
            category: 'HULL',
            defaultStageCode: 'HULL',
            estimatedHours: 8,
            priority: 'HIGH',
          },
          {
            title: 'Core material placement',
            description: 'Install foam or balsa core material',
            category: 'HULL',
            defaultStageCode: 'HULL',
            estimatedHours: 6,
            priority: 'HIGH',
          },
          {
            title: 'Lamination - inner skin',
            description: 'Apply inner fiberglass lamination layers',
            category: 'HULL',
            defaultStageCode: 'HULL',
            estimatedHours: 6,
            priority: 'HIGH',
          },
          {
            title: 'Hull demold',
            description: 'Release hull from mold',
            category: 'HULL',
            defaultStageCode: 'HULL',
            estimatedHours: 4,
            priority: 'MEDIUM',
          },
          {
            title: 'Hull inspection',
            description: 'Quality check for defects and dimensional accuracy',
            category: 'HULL',
            defaultStageCode: 'HULL',
            estimatedHours: 2,
            priority: 'HIGH',
          },
        ],
      },
      {
        name: 'Final Inspection & Handover',
        description: 'Quality assurance and delivery preparation',
        tasks: [
          {
            title: 'Pre-delivery inspection',
            description: 'Complete final quality checklist',
            category: 'TESTING',
            defaultStageCode: 'FINAL',
            estimatedHours: 4,
            priority: 'HIGH',
          },
          {
            title: 'Sea trial',
            description: 'Conduct water test and performance verification',
            category: 'TESTING',
            defaultStageCode: 'TESTING',
            estimatedHours: 4,
            priority: 'HIGH',
          },
          {
            title: 'Documentation package',
            description: 'Prepare owner manual, CE docs, and warranty papers',
            category: 'DELIVERY',
            defaultStageCode: 'FINAL',
            estimatedHours: 3,
            priority: 'MEDIUM',
          },
          {
            title: 'Client handover briefing',
            description: 'Walk through boat systems with owner',
            category: 'DELIVERY',
            defaultStageCode: 'FINAL',
            estimatedHours: 2,
            priority: 'HIGH',
          },
        ],
      },
    ],
  },
  {
    name: 'Electrical Systems Installation',
    description: 'Comprehensive electrical installation procedure for boats with electric propulsion',
    category: 'electrical',
    taskSets: [
      {
        name: 'Main Electrical Setup',
        description: 'Primary electrical system installation tasks',
        tasks: [
          {
            title: 'Install battery bank',
            description: 'Mount and secure main battery pack',
            category: 'ELECTRICAL',
            defaultStageCode: 'ELECTRICAL',
            estimatedHours: 4,
            priority: 'HIGH',
          },
          {
            title: 'Run main power cables',
            description: 'Route and secure primary DC power cables',
            category: 'ELECTRICAL',
            defaultStageCode: 'ELECTRICAL',
            estimatedHours: 6,
            priority: 'HIGH',
          },
          {
            title: 'Install battery management system',
            description: 'Connect BMS and configure cell monitoring',
            category: 'ELECTRICAL',
            defaultStageCode: 'ELECTRICAL',
            estimatedHours: 3,
            priority: 'HIGH',
          },
          {
            title: 'Install shore power connection',
            description: 'Mount inlet and connect charger circuit',
            category: 'ELECTRICAL',
            defaultStageCode: 'ELECTRICAL',
            estimatedHours: 3,
            priority: 'MEDIUM',
          },
          {
            title: 'Install main switch panel',
            description: 'Mount and wire main electrical panel',
            category: 'ELECTRICAL',
            defaultStageCode: 'ELECTRICAL',
            estimatedHours: 4,
            priority: 'HIGH',
          },
        ],
      },
      {
        name: 'Lighting & Accessories',
        description: 'Secondary electrical systems',
        tasks: [
          {
            title: 'Install navigation lights',
            description: 'Mount and wire nav lights per COLREGS',
            category: 'ELECTRICAL',
            defaultStageCode: 'SYSTEMS',
            estimatedHours: 3,
            priority: 'HIGH',
          },
          {
            title: 'Install interior lighting',
            description: 'Mount and wire cabin lights',
            category: 'ELECTRICAL',
            defaultStageCode: 'INTERIOR',
            estimatedHours: 4,
            priority: 'MEDIUM',
          },
          {
            title: 'Install bilge pump',
            description: 'Wire automatic bilge pump with float switch',
            category: 'SAFETY',
            defaultStageCode: 'ELECTRICAL',
            estimatedHours: 2,
            priority: 'HIGH',
          },
          {
            title: 'USB/12V outlets installation',
            description: 'Install accessory power outlets',
            category: 'ELECTRICAL',
            defaultStageCode: 'INTERIOR',
            estimatedHours: 2,
            priority: 'LOW',
          },
        ],
      },
      {
        name: 'Electrical Testing',
        description: 'Safety testing and verification',
        tasks: [
          {
            title: 'Insulation resistance test',
            description: 'Test all circuits for proper insulation',
            category: 'TESTING',
            defaultStageCode: 'TESTING',
            estimatedHours: 2,
            priority: 'HIGH',
          },
          {
            title: 'Load test battery system',
            description: 'Verify battery capacity and discharge rate',
            category: 'TESTING',
            defaultStageCode: 'TESTING',
            estimatedHours: 3,
            priority: 'HIGH',
          },
          {
            title: 'Verify all circuit protection',
            description: 'Test fuses and breakers trip correctly',
            category: 'TESTING',
            defaultStageCode: 'TESTING',
            estimatedHours: 2,
            priority: 'HIGH',
          },
        ],
      },
    ],
  },
  {
    name: 'Propulsion System Installation',
    description: 'Electric motor and drive system installation procedure',
    category: 'propulsion',
    taskSets: [
      {
        name: 'Motor & Drive Installation',
        description: 'Core propulsion system tasks',
        tasks: [
          {
            title: 'Install motor mounts',
            description: 'Prepare and install motor mounting brackets',
            category: 'PROPULSION',
            defaultStageCode: 'PROPULSION',
            estimatedHours: 3,
            priority: 'HIGH',
          },
          {
            title: 'Mount electric motor',
            description: 'Install and align main propulsion motor',
            category: 'PROPULSION',
            defaultStageCode: 'PROPULSION',
            estimatedHours: 4,
            priority: 'HIGH',
          },
          {
            title: 'Install motor controller',
            description: 'Mount and wire motor controller/inverter',
            category: 'PROPULSION',
            defaultStageCode: 'PROPULSION',
            estimatedHours: 3,
            priority: 'HIGH',
          },
          {
            title: 'Connect throttle controls',
            description: 'Wire throttle to controller',
            category: 'PROPULSION',
            defaultStageCode: 'PROPULSION',
            estimatedHours: 2,
            priority: 'HIGH',
          },
          {
            title: 'Install propeller shaft',
            description: 'Fit shaft, stern tube, and seals',
            category: 'PROPULSION',
            defaultStageCode: 'PROPULSION',
            estimatedHours: 4,
            priority: 'HIGH',
          },
          {
            title: 'Install propeller',
            description: 'Fit and torque propeller to spec',
            category: 'PROPULSION',
            defaultStageCode: 'PROPULSION',
            estimatedHours: 1,
            priority: 'MEDIUM',
          },
        ],
      },
      {
        name: 'Propulsion Testing',
        description: 'Motor and drive system verification',
        tasks: [
          {
            title: 'Static motor test',
            description: 'Test motor operation in neutral',
            category: 'TESTING',
            defaultStageCode: 'TESTING',
            estimatedHours: 1,
            priority: 'HIGH',
          },
          {
            title: 'Propulsion sea trial',
            description: 'Test motor performance underway',
            category: 'TESTING',
            defaultStageCode: 'TESTING',
            estimatedHours: 3,
            priority: 'HIGH',
          },
          {
            title: 'Verify cooling system',
            description: 'Check motor temperature under load',
            category: 'TESTING',
            defaultStageCode: 'TESTING',
            estimatedHours: 1,
            priority: 'HIGH',
          },
        ],
      },
    ],
  },
];
