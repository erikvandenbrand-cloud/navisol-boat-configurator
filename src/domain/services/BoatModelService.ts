/**
 * Boat Model Service - v4
 * Manages boat models in the library with versioning
 */

import type { VersionStatus, ConfigurationItemType } from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// TYPES
// ============================================

/**
 * Default configuration item for a BoatModelVersion
 * References approved ArticleVersionId or KitVersionId
 */
export interface DefaultConfigurationItem {
  id: string;
  itemType: 'ARTICLE' | 'KIT';
  // For ARTICLE
  articleId?: string;
  articleVersionId?: string;
  // For KIT
  kitId?: string;
  kitVersionId?: string;
  // Item details (cached from article/kit for display)
  category: string;
  subcategory?: string;
  articleNumber?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPriceExclVat: number;
  // Flags
  isIncluded: boolean;
  ceRelevant: boolean;
  safetyCritical: boolean;
  sortOrder: number;
}

export interface BoatModel {
  id: string;
  name: string;
  range: string; // Sport, Touring, Cruiser, etc.
  description?: string;
  currentVersionId?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface BoatModelVersion {
  id: string;
  modelId: string;
  versionLabel: string;
  status: VersionStatus;

  // Specifications
  lengthM: number;
  beamM: number;
  draftM?: number;
  displacementKg?: number;
  maxPassengers?: number;
  ceCategory?: 'A' | 'B' | 'C' | 'D';

  // Pricing
  basePrice: number;

  // Default configuration items (applied on NEW_BUILD project creation)
  defaultConfigurationItems: DefaultConfigurationItem[];

  // Legacy field (deprecated, use defaultConfigurationItems)
  defaultEquipment?: string[];

  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CreateBoatModelInput {
  name: string;
  range: string;
  description?: string;
  lengthM: number;
  beamM: number;
  draftM?: number;
  displacementKg?: number;
  maxPassengers?: number;
  ceCategory?: 'A' | 'B' | 'C' | 'D';
  basePrice: number;
  defaultConfigurationItems?: DefaultConfigurationItem[];
}

export interface CreateBoatModelVersionInput {
  lengthM: number;
  beamM: number;
  draftM?: number;
  displacementKg?: number;
  maxPassengers?: number;
  ceCategory?: 'A' | 'B' | 'C' | 'D';
  basePrice: number;
  versionLabel: string;
  defaultConfigurationItems?: DefaultConfigurationItem[];
}

// ============================================
// REPOSITORY
// ============================================

const MODEL_NAMESPACE = 'library_boat_models';
const VERSION_NAMESPACE = 'library_boat_model_versions';

const BoatModelRepository = {
  async getAll(): Promise<BoatModel[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<BoatModel>(MODEL_NAMESPACE);
    return all.filter(m => !m.archivedAt).sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<BoatModel | null> {
    const adapter = getAdapter();
    return adapter.getById<BoatModel>(MODEL_NAMESPACE, id);
  },

  async save(model: BoatModel): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(MODEL_NAMESPACE, model);
  },

  async getVersions(modelId: string): Promise<BoatModelVersion[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<BoatModelVersion>(VERSION_NAMESPACE);
    return all
      .filter(v => v.modelId === modelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getVersionById(id: string): Promise<BoatModelVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<BoatModelVersion>(VERSION_NAMESPACE, id);
  },

  async saveVersion(version: BoatModelVersion): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(VERSION_NAMESPACE, version);
  },
};

// ============================================
// SERVICE
// ============================================

export const BoatModelService = {
  /**
   * Get all boat models
   */
  async getAll(): Promise<BoatModel[]> {
    return BoatModelRepository.getAll();
  },

  /**
   * Get boat model by ID
   */
  async getById(id: string): Promise<BoatModel | null> {
    return BoatModelRepository.getById(id);
  },

  /**
   * Get versions for a model
   */
  async getVersions(modelId: string): Promise<BoatModelVersion[]> {
    return BoatModelRepository.getVersions(modelId);
  },

  /**
   * Get current approved version for a model
   */
  async getCurrentVersion(modelId: string): Promise<BoatModelVersion | null> {
    const model = await BoatModelRepository.getById(modelId);
    if (!model?.currentVersionId) return null;
    return BoatModelRepository.getVersionById(model.currentVersionId);
  },

  /**
   * Get version by ID directly
   */
  async getVersionById(versionId: string): Promise<BoatModelVersion | null> {
    return BoatModelRepository.getVersionById(versionId);
  },

  /**
   * Create a new boat model with initial version
   */
  async create(
    input: CreateBoatModelInput,
    context: AuditContext
  ): Promise<Result<BoatModel, string>> {
    const modelId = generateUUID();
    const versionId = generateUUID();

    // Create initial version
    const version: BoatModelVersion = {
      id: versionId,
      modelId,
      versionLabel: '1.0.0',
      status: 'DRAFT',
      lengthM: input.lengthM,
      beamM: input.beamM,
      draftM: input.draftM,
      displacementKg: input.displacementKg,
      maxPassengers: input.maxPassengers,
      ceCategory: input.ceCategory,
      basePrice: input.basePrice,
      defaultConfigurationItems: input.defaultConfigurationItems || [],
      createdAt: now(),
      createdBy: context.userId,
    };

    await BoatModelRepository.saveVersion(version);

    // Create model
    const model: BoatModel = {
      id: modelId,
      name: input.name,
      range: input.range,
      description: input.description,
      currentVersionId: versionId,
      createdAt: now(),
      createdBy: context.userId,
      updatedAt: now(),
    };

    await BoatModelRepository.save(model);

    await AuditService.logCreate(context, 'BoatModel', modelId, {
      name: input.name,
      range: input.range,
    });

    return Ok(model);
  },

  /**
   * Update boat model info (not version data)
   */
  async update(
    id: string,
    updates: Partial<Pick<BoatModel, 'name' | 'range' | 'description'>>,
    context: AuditContext
  ): Promise<Result<BoatModel, string>> {
    const model = await BoatModelRepository.getById(id);
    if (!model) return Err('Boat model not found');

    const updated: BoatModel = {
      ...model,
      ...updates,
      updatedAt: now(),
    };

    await BoatModelRepository.save(updated);

    await AuditService.logUpdate(
      context,
      'BoatModel',
      id,
      model as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    );

    return Ok(updated);
  },

  /**
   * Create a new version for a model
   */
  async createVersion(
    modelId: string,
    input: CreateBoatModelVersionInput,
    context: AuditContext
  ): Promise<Result<BoatModelVersion, string>> {
    const model = await BoatModelRepository.getById(modelId);
    if (!model) return Err('Boat model not found');

    const version: BoatModelVersion = {
      id: generateUUID(),
      modelId,
      versionLabel: input.versionLabel,
      status: 'DRAFT',
      lengthM: input.lengthM,
      beamM: input.beamM,
      draftM: input.draftM,
      displacementKg: input.displacementKg,
      maxPassengers: input.maxPassengers,
      ceCategory: input.ceCategory,
      basePrice: input.basePrice,
      defaultConfigurationItems: input.defaultConfigurationItems || [],
      createdAt: now(),
      createdBy: context.userId,
    };

    await BoatModelRepository.saveVersion(version);

    await AuditService.log(
      context,
      'CREATE',
      'BoatModelVersion',
      version.id,
      `Created version ${input.versionLabel} for ${model.name}`
    );

    return Ok(version);
  },

  /**
   * Approve a version
   */
  async approveVersion(
    versionId: string,
    context: AuditContext
  ): Promise<Result<BoatModelVersion, string>> {
    const version = await BoatModelRepository.getVersionById(versionId);
    if (!version) return Err('Version not found');
    if (version.status !== 'DRAFT') return Err('Only draft versions can be approved');

    // Deprecate current approved version
    const model = await BoatModelRepository.getById(version.modelId);
    if (model?.currentVersionId) {
      const currentVersion = await BoatModelRepository.getVersionById(model.currentVersionId);
      if (currentVersion && currentVersion.status === 'APPROVED') {
        const deprecated: BoatModelVersion = {
          ...currentVersion,
          status: 'DEPRECATED',
        };
        await BoatModelRepository.saveVersion(deprecated);
      }
    }

    // Approve new version
    const approved: BoatModelVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy: context.userId,
    };

    await BoatModelRepository.saveVersion(approved);

    // Update model's current version
    if (model) {
      await BoatModelRepository.save({
        ...model,
        currentVersionId: versionId,
        updatedAt: now(),
      });
    }

    await AuditService.log(
      context,
      'UPDATE',
      'BoatModelVersion',
      versionId,
      `Approved version ${version.versionLabel}`
    );

    return Ok(approved);
  },

  /**
   * Update default configuration items for a version
   * Only allowed for DRAFT versions
   */
  async updateDefaultConfiguration(
    versionId: string,
    items: DefaultConfigurationItem[],
    context: AuditContext
  ): Promise<Result<BoatModelVersion, string>> {
    const version = await BoatModelRepository.getVersionById(versionId);
    if (!version) return Err('Version not found');
    if (version.status !== 'DRAFT') {
      return Err('Can only update default configuration for DRAFT versions');
    }

    const updated: BoatModelVersion = {
      ...version,
      defaultConfigurationItems: items,
    };

    await BoatModelRepository.saveVersion(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'BoatModelVersion',
      versionId,
      `Updated default configuration (${items.length} items)`
    );

    return Ok(updated);
  },

  /**
   * Archive a boat model
   */
  async archive(
    id: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const model = await BoatModelRepository.getById(id);
    if (!model) return Err('Boat model not found');

    const archived: BoatModel = {
      ...model,
      archivedAt: now(),
      updatedAt: now(),
    };

    await BoatModelRepository.save(archived);

    await AuditService.log(
      context,
      'UPDATE',
      'BoatModel',
      id,
      `Archived boat model: ${model.name}`
    );

    return Ok(undefined);
  },

  /**
   * Initialize default boat models if none exist
   */
  async initializeDefaults(context: AuditContext): Promise<void> {
    const existing = await BoatModelRepository.getAll();
    if (existing.length > 0) return;

    const defaults: CreateBoatModelInput[] = [
      { name: 'Eagle 28', range: 'Sport', lengthM: 8.5, beamM: 2.8, basePrice: 89000, ceCategory: 'C', maxPassengers: 8 },
      { name: 'Eagle 32', range: 'Sport', lengthM: 9.8, beamM: 3.2, basePrice: 125000, ceCategory: 'B', maxPassengers: 10 },
      { name: 'Eagle 36 TS', range: 'Touring', lengthM: 11.0, beamM: 3.5, basePrice: 185000, ceCategory: 'B', maxPassengers: 12 },
      { name: 'Eagle 40', range: 'Cruiser', lengthM: 12.2, beamM: 3.8, basePrice: 245000, ceCategory: 'A', maxPassengers: 14 },
      { name: 'Eagle 44 GTS', range: 'Grand Touring', lengthM: 13.4, beamM: 4.2, basePrice: 320000, ceCategory: 'A', maxPassengers: 16 },
    ];

    for (const input of defaults) {
      const result = await this.create(input, context);
      if (result.ok) {
        // Auto-approve default models
        const model = result.value;
        if (model.currentVersionId) {
          await this.approveVersion(model.currentVersionId, context);
        }
      }
    }
  },
};
