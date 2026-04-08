/**
 * Project Service - v4
 * Orchestrates project operations and status transitions
 */

import type {
  Project,
  ProjectStatus,
  ProjectType,
  CreateProjectInput,
  LibraryPins,
  BOMSnapshot,
  BOMItem,
  VesselIdentity,
  VesselIdentityInit,
} from '@/domain/models';
import type { DocumentType } from '@/domain/models';
import { BoatModelService } from './BoatModelService';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import { TemplateRepository, ProcedureRepository } from '@/data/repositories/LibraryRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { StatusMachine } from '@/domain/workflow';
import { ConfigurationService } from './ConfigurationService';
import { QuoteService } from './QuoteService';
import { ProductionService } from './ProductionService';

// ============================================
// PROJECT SERVICE
// ============================================

export const ProjectService = {
  /**
   * Create a new project
   */
  async create(
    input: CreateProjectInput,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    // Validate client exists
    const client = await ClientRepository.getById(input.clientId);
    if (!client) {
      return Err('Client not found');
    }

    const project = await ProjectRepository.create(input, context.userId);

    await AuditService.logCreate(
      context,
      'Project',
      project.id,
      project as unknown as Record<string, unknown>
    );

    return Ok(project);
  },

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | null> {
    return ProjectRepository.getById(id);
  },

  /**
   * Get all active projects
   */
  async getActive(): Promise<Project[]> {
    return ProjectRepository.getActive();
  },

  /**
   * Transition project to a new status
   */
  async transitionStatus(
    projectId: string,
    newStatus: ProjectStatus,
    context: AuditContext,
    options?: {
      force?: boolean;
      reason?: string;
    }
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const currentStatus = project.status;

    // Validate transition
    const validation = StatusMachine.validateTransition(currentStatus, newStatus, {
      hasQuoteDraft: await QuoteService.hasDraftQuote(projectId),
      hasQuoteSent: await QuoteService.hasSentQuote(projectId),
      hasQuoteAccepted: await QuoteService.hasAcceptedQuote(projectId),
      configurationItemCount: project.configuration.items.length,
    });

    if (!validation.isValid && !options?.force) {
      return Err(validation.errors.join('. '));
    }

    // Execute milestone effects
    const milestoneEffects = StatusMachine.getMilestoneEffects(newStatus);
    for (const effect of milestoneEffects) {
      const effectResult = await this.executeMilestoneEffect(project, effect.type, context);
      if (!effectResult.ok) {
        return effectResult;
      }
    }

    // Update status
    const updated = await ProjectRepository.updateStatus(projectId, newStatus);
    if (!updated) {
      return Err('Failed to update project status');
    }

    await AuditService.logStatusTransition(
      context,
      'Project',
      projectId,
      currentStatus,
      newStatus,
      options?.reason
    );

    return Ok(updated);
  },

  /**
   * Execute a milestone effect
   */
  async executeMilestoneEffect(
    project: Project,
    effectType: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    switch (effectType) {
      case 'LOCK_QUOTE': {
        // Lock is handled by quote status change
        return Ok(undefined);
      }

      case 'FREEZE_CONFIGURATION': {
        const freezeResult = await ConfigurationService.freeze(
          project.id,
          'ORDER_CONFIRMED',
          'Order confirmed by client',
          context
        );
        if (!freezeResult.ok) {
          return Err(freezeResult.error);
        }
        return Ok(undefined);
      }

      case 'GENERATE_BOM': {
        // Find the accepted quote to generate BOM from
        // Prefer ACCEPTED quote, fall back to most recent quote
        const acceptedQuote = project.quotes.find(q => q.status === 'ACCEPTED');
        const latestQuote = project.quotes.length > 0
          ? project.quotes[project.quotes.length - 1]
          : null;
        const quoteToUse = acceptedQuote || latestQuote;

        if (!quoteToUse) {
          return Err('Cannot generate BOM: No quotes exist');
        }

        const bomResult = await this.generateBOM(project.id, quoteToUse.id, context);
        if (!bomResult.ok) {
          return Err(bomResult.error);
        }
        return Ok(undefined);
      }

      case 'PIN_LIBRARY_VERSIONS': {
        const pinResult = await this.pinLibraryVersions(project.id, context);
        if (!pinResult.ok) {
          return Err(pinResult.error);
        }
        return Ok(undefined);
      }

      case 'FINALIZE_DOCUMENTS': {
        // TODO: Implement document finalization
        return Ok(undefined);
      }

      case 'INITIALIZE_PRODUCTION': {
        const productionResult = await ProductionService.initializeStages(project.id, context);
        if (!productionResult.ok) {
          return Err(productionResult.error);
        }
        return Ok(undefined);
      }

      default:
        return Ok(undefined);
    }
  },

  /**
   * Generate BOM baseline from a Quote
   *
   * INVARIANT: A BOM can only be generated if at least one Quote exists.
   * The BOM is always linked to the specific Quote it was generated from.
   *
   * @deprecated Use BOMService.generateBOM instead for full Library v4 support
   */
  async generateBOM(
    projectId: string,
    quoteId: string,
    context: AuditContext
  ): Promise<Result<BOMSnapshot, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // HARD INVARIANT: Must have at least one quote to generate BOM
    if (project.quotes.length === 0) {
      return Err('Cannot generate BOM: No quotes exist. Create a quote first.');
    }

    // Find the specified quote
    const quote = project.quotes.find(q => q.id === quoteId);
    if (!quote) {
      return Err('Quote not found');
    }

    // Get latest configuration snapshot
    const configSnapshot = await ConfigurationService.getCurrentSnapshot(projectId);
    if (!configSnapshot) {
      return Err('No configuration snapshot found');
    }

    // Convert configuration items to BOM items (estimate cost at 60% of sell price)
    // NOTE: This is a legacy method - prefer BOMService.generateBOM for new code
    const estimationRatio = 0.6;
    const bomItems: BOMItem[] = project.configuration.items
      .filter((item) => item.isIncluded)
      .map((item) => {
        const unitCost = Math.round(item.unitPriceExclVat * estimationRatio);
        return {
          id: generateUUID(),
          category: item.category,
          articleNumber: item.articleNumber,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitCost,
          totalCost: unitCost * item.quantity,
          costSource: 'ESTIMATED' as const, // All items from this legacy method are estimated
          isEstimated: true,
          estimationRatio,
          sellPrice: item.unitPriceExclVat,
        };
      });

    const snapshotNumber = project.bomSnapshots.length + 1;
    const totalCostExclVat = bomItems.reduce((sum, item) => sum + item.totalCost, 0);

    const bomSnapshot: BOMSnapshot = {
      id: generateUUID(),
      projectId,
      snapshotNumber,
      configurationSnapshotId: configSnapshot.id,
      // Quote linkage (traceability)
      sourceQuoteId: quote.id,
      sourceQuoteNumber: quote.quoteNumber,
      sourceQuoteVersion: quote.version,
      items: bomItems,
      totalParts: bomItems.reduce((sum, item) => sum + item.quantity, 0),
      totalCostExclVat,
      // All items are estimated in this legacy method
      estimatedCostCount: bomItems.length,
      estimatedCostTotal: totalCostExclVat,
      actualCostTotal: 0,
      costEstimationRatio: estimationRatio,
      status: 'BASELINE',
      createdAt: now(),
      createdBy: context.userId,
    };

    const updated = await ProjectRepository.update(projectId, {
      bomSnapshots: [...project.bomSnapshots, bomSnapshot],
    });

    if (!updated) {
      return Err('Failed to save BOM');
    }

    await AuditService.log(
      context,
      'CREATE',
      'BOMSnapshot',
      bomSnapshot.id,
      `Generated BOM baseline #${snapshotNumber} from Quote ${quote.quoteNumber} v${quote.version}`,
      { after: { snapshotNumber, totalParts: bomSnapshot.totalParts, totalCost: bomSnapshot.totalCostExclVat } }
    );

    return Ok(bomSnapshot);
  },

  /**
   * Pin library versions to project
   * Called when project transitions to ORDER_CONFIRMED
   * Captures current approved versions of all library items
   */
  async pinLibraryVersions(
    projectId: string,
    context: AuditContext
  ): Promise<Result<LibraryPins, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Query all approved template versions
    const templates = await TemplateRepository.getAll();
    const templateVersionIds: Partial<Record<DocumentType, string>> = {};

    for (const template of templates) {
      if (template.currentVersionId) {
        const versions = await TemplateRepository.getVersions(template.id);
        const currentVersion = versions.find(v => v.id === template.currentVersionId);
        if (currentVersion?.status === 'APPROVED') {
          templateVersionIds[template.type] = currentVersion.id;
        }
      }
    }

    // Query all approved procedure versions
    const procedures = await ProcedureRepository.getAll();
    const procedureVersionIds: string[] = [];

    for (const procedure of procedures) {
      if (procedure.currentVersionId) {
        const versions = await ProcedureRepository.getVersions(procedure.id);
        const currentVersion = versions.find(v => v.id === procedure.currentVersionId);
        if (currentVersion?.status === 'APPROVED') {
          procedureVersionIds.push(currentVersion.id);
        }
      }
    }

    // Create pins with actual library versions
    const pins: LibraryPins = {
      boatModelVersionId: project.configuration.boatModelVersionId || '',
      catalogVersionId: `catalog-${new Date().getFullYear()}`, // Equipment items are individually versioned
      templateVersionIds,
      procedureVersionIds,
      pinnedAt: now(),
      pinnedBy: context.userId,
    };

    const updated = await ProjectRepository.update(projectId, {
      libraryPins: pins,
    });

    if (!updated) {
      return Err('Failed to pin library versions');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'Project',
      projectId,
      `Pinned library versions: ${Object.keys(templateVersionIds).length} templates, ${procedureVersionIds.length} procedures`,
      { after: pins as unknown as Record<string, unknown> }
    );

    return Ok(pins);
  },

  /**
   * Archive a project
   */
  async archive(
    projectId: string,
    reason: string,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (StatusMachine.isFrozen(project.status) && project.status !== 'CLOSED') {
      return Err('Cannot archive a frozen project that is not closed');
    }

    const archived = await ProjectRepository.archive(projectId, context.userId, reason);
    if (!archived) {
      return Err('Failed to archive project');
    }

    await AuditService.logArchive(context, 'Project', projectId, reason);

    return Ok(archived);
  },

  /**
   * Emergency unlock a frozen project (Admin only)
   */
  async emergencyUnlock(
    projectId: string,
    reason: string,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (!project.configuration.isFrozen) {
      return Err('Project configuration is not frozen');
    }

    // Unfreeze configuration
    const updatedConfiguration = {
      ...project.configuration,
      isFrozen: false,
      frozenAt: undefined,
      frozenBy: undefined,
    };

    const updated = await ProjectRepository.updateConfiguration(projectId, updatedConfiguration);
    if (!updated) {
      return Err('Failed to unlock project');
    }

    await AuditService.logEmergencyUnlock(context, projectId, reason);

    return Ok(updated);
  },

  /**
   * Update project type
   * Only allowed when project is not CLOSED
   */
  async updateProjectType(
    projectId: string,
    newType: ProjectType,
    context: AuditContext
  ): Promise<Result<Project, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Block type change when project is CLOSED
    if (project.status === 'CLOSED') {
      return Err('Cannot change project type when project is closed');
    }

    const oldType = project.type;
    if (oldType === newType) {
      return Ok(project);
    }

    const updated = await ProjectRepository.update(projectId, {
      type: newType,
    });

    if (!updated) {
      return Err('Failed to update project type');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'Project',
      projectId,
      `Changed project type from ${oldType} to ${newType}`,
      { before: { type: oldType }, after: { type: newType } }
    );

    return Ok(updated);
  },

  /**
   * Get project summary for display
   */
  async getProjectSummary(projectId: string): Promise<{
    project: Project;
    clientName: string;
    currentQuote: { quoteNumber: string; status: string; total: number } | null;
    statusInfo: ReturnType<typeof StatusMachine.getStatusInfo>;
    isEditable: boolean;
    isFrozen: boolean;
    isLocked: boolean;
  } | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return null;
    }

    const client = await ClientRepository.getById(project.clientId);
    const currentQuote = await QuoteService.getCurrentQuote(projectId);

    return {
      project,
      clientName: client?.name || 'Unknown',
      currentQuote: currentQuote
        ? {
            quoteNumber: currentQuote.quoteNumber,
            status: currentQuote.status,
            total: currentQuote.totalInclVat,
          }
        : null,
      statusInfo: StatusMachine.getStatusInfo(project.status),
      isEditable: StatusMachine.isEditable(project.status),
      isFrozen: StatusMachine.isFrozen(project.status),
      isLocked: StatusMachine.isLocked(project.status),
    };
  },

  /**
   * Initialize Vessel Identity from Boat Model (one-time copy, no sync)
   *
   * GOVERNANCE (Patch 5):
   * - Manual action only (user clicks button)
   * - One-time copy of PROJECT-OWNED fields only
   * - Model facts (LOA, Beam, Draft, etc.) are NOT copied - read from BoatModel at display-time
   * - Builder identity is NOT copied - read from Settings at display-time
   * - Can be re-run with confirmation (overwrites existing values)
   */
  async initializeVesselIdentityFromBoatModel(
    projectId: string,
    context: AuditContext
  ): Promise<Result<VesselIdentity, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    // Get boat model from configuration
    const boatModelId = project.configuration.boatModelVersionId;
    if (!boatModelId) {
      return Err('No boat model selected for this project');
    }

    // Fetch boat model data
    const boatModel = await BoatModelService.getById(boatModelId);
    if (!boatModel) {
      return Err('Boat model not found in library');
    }

    // Build initialization metadata
    const initMetadata: VesselIdentityInit = {
      boatModelId: boatModel.id,
      boatModelName: boatModel.name,
      initializedAt: now(),
      initializedBy: context.userId,
    };

    // Preserve existing project-specific fields
    const existingIdentity = project.vesselIdentity || {};

    // GOVERNANCE (Patch 5): Only project-owned fields are stored in vesselIdentity.
    // Model facts (LOA, Beam, Draft, Max Persons, Design Category, Displacement, Max Load)
    // are resolved from BoatModel at read-time - NOT stored here.
    // Builder identity (name, address) is resolved from Settings at read-time - NOT stored here.
    const newVesselIdentity: VesselIdentity = {
      // Project-owned fields
      vesselName: existingIdentity.vesselName,
      modelName: boatModel.name, // Copy model name for display purposes
      win: existingIdentity.win || project.win,
      yearOfConstruction: existingIdentity.yearOfConstruction,
      intendedUse: existingIdentity.intendedUse,
      specialConditions: existingIdentity.specialConditions,

      // Set init metadata to track that initialization happened
      initFromModel: initMetadata,

      // NOTE: Model facts are NOT copied here anymore (Patch 5).
      // UI and documents resolve these from BoatModel.specifications at read-time:
      // - LOA, Beam, Draft → specifications.dimensions
      // - Max Persons, Design Category → specifications.compliance
      // - Displacement, Max Load → specifications.weightCapacity

      // NOTE: Builder identity is NOT copied here (already removed in Patch 2).
      // Documents resolve builder info from SettingsService at generate-time.
    };

    // Save to project
    const updated = await ProjectRepository.update(projectId, {
      vesselIdentity: newVesselIdentity,
      updatedAt: now(),
    });

    if (!updated) {
      return Err('Failed to save vessel identity');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'Project',
      projectId,
      `Initialized vessel identity from Boat Model: ${boatModel.name}`,
      {
        before: { vesselIdentity: project.vesselIdentity },
        after: { vesselIdentity: newVesselIdentity },
      }
    );

    return Ok(newVesselIdentity);
  },
};
