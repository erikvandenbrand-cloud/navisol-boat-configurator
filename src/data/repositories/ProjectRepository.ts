/**
 * Project Repository - v4
 */

import type {
  Project,
  ProjectStatus,
  CreateProjectInput,
  ProjectConfiguration,
  ConfigurationItem,
  BoatInstance,
} from '@/domain/models';
import { generateUUID, generateNumber, now, createEmptyTechnicalFile, createAllDocumentTemplates } from '@/domain/models';

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
import { getAdapter } from '@/data/persistence';
import type { QueryFilter } from '@/data/persistence';
import { BoatModelService, type DefaultConfigurationItem } from '@/domain/services/BoatModelService';

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
    return adapter.getById<Project>(NAMESPACE, id);
  },

  async getAll(): Promise<Project[]> {
    const adapter = getAdapter();
    return adapter.getAll<Project>(NAMESPACE);
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
      tasks: [],
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
