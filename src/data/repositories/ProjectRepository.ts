/**
 * Project Repository - v4.1
 * With WorkItem migration support
 */

import type {
  Project,
  ProjectStatus,
  CreateProjectInput,
  ProjectConfiguration,
  ConfigurationItem,
  BoatInstance,
  WorkItem,
  PlanningTask,
  ProjectTask,
} from '@/domain/models';
import {
  generateUUID,
  generateNumber,
  now,
  createEmptyTechnicalFile,
  createAllDocumentTemplates,
  normalizeStatus,
} from '@/domain/models';

/**
 * Create boat instances for a NEW_BUILD project.
 * @param productionMode - 'single' (1 boat) or 'serial' (multiple boats)
 * @param boatCount - Number of boats for serial production (min 2, default 2)
 * @returns Array of BoatInstance
 */
function createBoatInstances(productionMode: 'single' | 'serial' | undefined, boatCount: number | undefined): BoatInstance[] {
  // Default: single boat for backward compatibility
  const mode = productionMode || 'single';

  if (mode === 'single') {
    return [{
      id: generateUUID(),
      label: 'Boat 01',
      win: undefined,
    }];
  }

  // Serial production: create multiple boats (min 2)
  const count = Math.max(2, boatCount || 2);
  const boats: BoatInstance[] = [];

  for (let i = 1; i <= count; i++) {
    boats.push({
      id: generateUUID(),
      label: `Boat ${String(i).padStart(2, '0')}`,
      win: undefined,
    });
  }

  return boats;
}

/**
 * Migrate legacy task structures to unified WorkItems.
 * Called automatically on load to ensure backward compatibility.
 *
 * Migration rules:
 * - PlanningTask (planning.tasks) → WorkItem (kind: 'planning')
 * - ProjectTask (tasks) → WorkItem (kind: 'production')
 * - Status DONE → COMPLETED
 * - assignedTo (string) → assigneeIds (string[])
 * - assigneeResourceIds → assigneeIds
 * - dependsOn, dependsOnTaskIds → dependsOnIds
 */
function migrateToWorkItems(project: Project): Project {
  // Already migrated (has workItems and no legacy tasks)
  if (project.workItems && project.workItems.length > 0) {
    // Check if migration is complete (no legacy data remaining)
    const hasLegacyTasks = (project.tasks?.length || 0) > 0;
    const hasLegacyPlanningTasks = (project.planning?.tasks?.length || 0) > 0;

    if (!hasLegacyTasks && !hasLegacyPlanningTasks) {
      return project; // Already fully migrated
    }
  }

  const workItems: WorkItem[] = [...(project.workItems || [])];
  let nextNumber = workItems.length > 0
    ? Math.max(...workItems.map(w => w.workItemNumber)) + 1
    : 1;

  // Collect existing IDs to avoid duplicates
  const existingIds = new Set(workItems.map(w => w.id));

  // Migrate planning tasks (kind: 'planning')
  const planningTasks = project.planning?.tasks || [];
  for (const pt of planningTasks) {
    if (existingIds.has(pt.id)) continue; // Skip if already migrated

    const workItem: WorkItem = {
      id: pt.id,
      projectId: project.id,
      workItemNumber: nextNumber++,
      kind: 'planning',
      title: pt.title,
      description: undefined,
      status: normalizeStatus(pt.status),
      notes: pt.notes,
      startDate: pt.startDate,
      endDate: pt.endDate,
      durationDays: pt.durationDays,
      assigneeIds: pt.assigneeResourceIds || [],
      dependsOnIds: pt.dependsOnTaskIds || [],
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      createdBy: 'migration',
    };
    workItems.push(workItem);
    existingIds.add(pt.id);
  }

  // Migrate production tasks (kind: 'production')
  // Cast to any to handle legacy fields that may exist in stored data
  const productionTasks = (project.tasks || []) as any[];
  for (const pt of productionTasks) {
    if (existingIds.has(pt.id)) continue; // Skip if already migrated

    const workItem: WorkItem = {
      id: pt.id,
      projectId: project.id,
      workItemNumber: nextNumber++,
      kind: 'production',
      title: pt.title,
      description: pt.description,
      status: normalizeStatus(pt.status),
      notes: pt.notes,
      category: pt.category,
      priority: pt.priority,
      dueDate: pt.dueDate,
      estimatedHours: pt.estimatedHours,
      startedAt: pt.startedAt,
      completedAt: pt.completedAt,
      // Convert single assignee to array (handle legacy assignedTo field)
      assigneeIds: pt.assigneeIds || (pt.assignedTo ? [pt.assignedTo] : []),
      assignedAt: pt.assignedAt,
      // Handle legacy field names
      dependsOnIds: pt.dependsOnIds || pt.dependsOn || [],
      blockedByIds: pt.blockedByIds || pt.blockedBy || [],
      timeLogs: pt.timeLogs || [],
      totalLoggedHours: pt.totalLoggedHours || 0,
      stageId: pt.stageId,
      articleVersionId: pt.articleVersionId,
      sourceProcedureId: pt.sourceProcedureId,
      sourceProcedureVersionId: pt.sourceProcedureVersionId,
      sourceTaskSetTemplateId: pt.sourceTaskSetTemplateId,
      copiedFromTemplateAt: pt.copiedFromTemplateAt,
      createdAt: pt.createdAt,
      updatedAt: pt.updatedAt,
      version: pt.version,
      createdBy: pt.createdBy,
    };
    workItems.push(workItem);
    existingIds.add(pt.id);
  }

  // Return migrated project with workItems
  // Keep legacy fields for backward compatibility but clear their data
  return {
    ...project,
    workItems,
  };
}

import { getAdapter } from '@/data/persistence';
import type { QueryFilter } from '@/data/persistence';
import { BoatModelService, type DefaultConfigurationItem } from '@/domain/services/BoatModelService';
import { assertProjectIntegrity } from '@/domain/invariants';

/**
 * Run integrity checks in development mode only.
 * Does not block or throw - just logs warnings/errors.
 */
function runDevIntegrityCheck(project: Project, context: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    assertProjectIntegrity(project, context);
  }
}

const NAMESPACE = 'projects';

// Track sequence number
let projectSequence = 0;

async function getNextSequence(): Promise<number> {
  const adapter = getAdapter();
  const projects = await adapter.getAll<Project>(NAMESPACE);

  if (projects.length === 0) {
    projectSequence = 1;
  } else {
    const maxSeq = projects.reduce((max, project) => {
      const match = project.projectNumber.match(/PRJ-\d{4}-(\d{4})/);
      if (match) {
        const seq = parseInt(match[1], 10);
        return seq > max ? seq : max;
      }
      return max;
    }, 0);
    projectSequence = maxSeq + 1;
  }

  return projectSequence++;
}

function createEmptyConfiguration(userId: string): ProjectConfiguration {
  return {
    propulsionType: 'Electric',
    items: [],
    subtotalExclVat: 0,
    totalExclVat: 0,
    vatRate: 21,
    vatAmount: 0,
    totalInclVat: 0,
    isFrozen: false,
    lastModifiedAt: now(),
    lastModifiedBy: userId,
  };
}

export const ProjectRepository = {
  async getById(id: string): Promise<Project | null> {
    const adapter = getAdapter();
    const project = await adapter.getById<Project>(NAMESPACE, id);
    if (!project) return null;
    // Apply migration on load
    const migrated = migrateToWorkItems(project);
    // Run integrity check in dev
    runDevIntegrityCheck(migrated, 'after-load');
    return migrated;
  },

  async getAll(): Promise<Project[]> {
    const adapter = getAdapter();
    const projects = await adapter.getAll<Project>(NAMESPACE);
    // Apply migration on load
    const migrated = projects.map(migrateToWorkItems);
    // Run integrity check in dev (only on first 5 to avoid spam)
    for (const project of migrated.slice(0, 5)) {
      runDevIntegrityCheck(project, 'after-load-all');
    }
    return migrated;
  },

  async getByStatus(status: ProjectStatus): Promise<Project[]> {
    const adapter = getAdapter();
    return adapter.query<Project>(NAMESPACE, {
      where: { status, archivedAt: undefined },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  async getByClient(clientId: string): Promise<Project[]> {
    const adapter = getAdapter();
    return adapter.query<Project>(NAMESPACE, {
      where: { clientId, archivedAt: undefined },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  async getActive(): Promise<Project[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<Project>(NAMESPACE);
    return all
      .filter((p) => !p.archivedAt && p.status !== 'CLOSED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async query(filter: QueryFilter): Promise<Project[]> {
    const adapter = getAdapter();
    return adapter.query<Project>(NAMESPACE, filter);
  },

  async create(input: CreateProjectInput, userId: string): Promise<Project> {
    const adapter = getAdapter();
    const seq = await getNextSequence();

    // Prepare configuration
    let configItems: ConfigurationItem[] = [];
    let basePrice = 0;

    // For NEW_BUILD projects with a boatModelVersionId, apply default configuration
    if (input.type === 'NEW_BUILD' && input.boatModelVersionId) {
      const boatModelVersion = await BoatModelService.getVersionById(input.boatModelVersionId);
      if (boatModelVersion) {
        basePrice = boatModelVersion.basePrice;

        // Convert DefaultConfigurationItem[] to ConfigurationItem[]
        if (boatModelVersion.defaultConfigurationItems?.length > 0) {
          configItems = boatModelVersion.defaultConfigurationItems.map(
            (item: DefaultConfigurationItem, index: number): ConfigurationItem => ({
              id: generateUUID(),
              itemType: item.itemType,
              articleId: item.articleId,
              articleVersionId: item.articleVersionId,
              kitId: item.kitId,
              kitVersionId: item.kitVersionId,
              isCustom: false,
              category: item.category,
              subcategory: item.subcategory,
              articleNumber: item.articleNumber,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPriceExclVat: item.unitPriceExclVat,
              lineTotalExclVat: item.quantity * item.unitPriceExclVat,
              isIncluded: item.isIncluded,
              ceRelevant: item.ceRelevant,
              safetyCritical: item.safetyCritical,
              sortOrder: index,
            })
          );
        }
      }
    }

    // Calculate totals
    const subtotalExclVat = configItems.reduce((sum, item) => sum + item.lineTotalExclVat, 0);
    const vatRate = 21;
    const vatAmount = Math.round(subtotalExclVat * (vatRate / 100) * 100) / 100;
    const totalInclVat = subtotalExclVat + vatAmount;

    // Generate project ID first so templates can reference it
    const projectId = generateUUID();

    // Initialize document templates for NEW_BUILD projects only
    // REFIT/MAINTENANCE projects don't require templates by default
    // Pass systems for modular Owner's Manual content
    const documentTemplates =
      input.type === 'NEW_BUILD' ? createAllDocumentTemplates(projectId, userId, input.systems) : undefined;

    // Create boat instances for NEW_BUILD projects
    // Based on production mode: 'single' = 1 boat, 'serial' = multiple boats
    const boats =
      input.type === 'NEW_BUILD'
        ? createBoatInstances(input.productionMode, input.initialBoatCount)
        : undefined;

    const project: Project = {
      id: projectId,
      projectNumber: generateNumber('PRJ', seq),
      title: input.title,
      type: input.type,
      status: 'DRAFT',
      clientId: input.clientId,
      configuration: {
        ...createEmptyConfiguration(userId),
        boatModelVersionId: input.boatModelVersionId,
        propulsionType: input.propulsionType || 'Electric',
        items: configItems,
        subtotalExclVat,
        totalExclVat: subtotalExclVat,
        vatRate,
        vatAmount,
        totalInclVat,
      },
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      workItems: [],
      tasks: [], // Legacy - kept for backward compatibility
      technicalFile: createEmptyTechnicalFile(),
      documentTemplates,
      boats,
      systems: input.systems, // For modular Owner's Manual
      createdBy: userId,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NAMESPACE, project);
    return project;
  },

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<Project>(NAMESPACE, id);

    if (!existing) return null;

    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: now(),
      version: existing.version + 1,
    };

    // Run integrity check before save in dev
    runDevIntegrityCheck(updated, 'before-update');

    await adapter.save(NAMESPACE, updated);
    return updated;
  },

  async updateStatus(id: string, status: ProjectStatus): Promise<Project | null> {
    return this.update(id, { status });
  },

  async updateConfiguration(
    id: string,
    configuration: ProjectConfiguration
  ): Promise<Project | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    // Protect boatModelVersionId from changes after being set
    if (
      existing.configuration.boatModelVersionId &&
      configuration.boatModelVersionId !== undefined &&
      configuration.boatModelVersionId !== existing.configuration.boatModelVersionId
    ) {
      console.error('Cannot change boatModelVersionId after project creation');
      return null;
    }

    return this.update(id, { configuration });
  },

  async archive(id: string, userId: string, reason: string): Promise<Project | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<Project>(NAMESPACE, id);

    if (!existing) return null;

    const archived: Project = {
      ...existing,
      archivedAt: now(),
      archivedBy: userId,
      archiveReason: reason,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NAMESPACE, archived);
    return archived;
  },

  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NAMESPACE);
  },

  async search(query: string): Promise<Project[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<Project>(NAMESPACE);

    const lowerQuery = query.toLowerCase();
    return all.filter(
      (project) =>
        project.title.toLowerCase().includes(lowerQuery) ||
        project.projectNumber.toLowerCase().includes(lowerQuery)
    );
  },
};
