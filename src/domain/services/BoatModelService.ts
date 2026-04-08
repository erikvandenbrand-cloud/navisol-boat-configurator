/**
 * Boat Model Service - v4 (Simplified - No Versioning)
 * Manages boat models in the library with direct configuration
 *
 * PATCH 6 - HARD CLEANUP: All legacy fields removed.
 * Canonical sources only:
 * - specifications.dimensions for LOA/Beam/Draft
 * - specifications.compliance for Design Category/Max Persons
 * - specifications.weightCapacity for Displacement/Max Load
 */

import type { VersionStatus, ConfigurationItemType } from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { SettingsService } from './SettingsService';

// ============================================
// TYPES
// ============================================

/**
 * Default configuration item for a BoatModel
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

/**
 * Hull construction and material specifications
 */
export interface HullSpecifications {
  material: 'ALUMINIUM' | 'FIBREGLASS' | 'STEEL' | 'COMPOSITE' | 'OTHER';
  materialDescription?: string;
  constructionType: 'WELDED' | 'RIVETED' | 'LAMINATED' | 'MOULDED' | 'OTHER';
  hullType: 'PLANING' | 'SEMI_DISPLACEMENT' | 'DISPLACEMENT' | 'CATAMARAN' | 'OTHER';
  deadriseAngleDeg?: number;
  hullColor?: string;
  winFormat?: string;
}

/**
 * Detailed dimensional specifications
 */
export interface DimensionalSpecifications {
  lengthOverallM: number;
  lengthWaterlineM?: number;
  beamOverallM: number;
  beamWaterlineM?: number;
  draftM?: number;
  freeboardMinM?: number;
  freeboardMaxM?: number;
  airDraftM?: number;
  bridgeClearanceM?: number;
}

/**
 * Weight and capacity specifications
 */
export interface WeightCapacitySpecifications {
  displacementLightKg?: number;
  displacementLoadedKg?: number;
  maxLoadKg?: number;
  fuelCapacityL?: number;
  waterCapacityL?: number;
  holdingTankCapacityL?: number;
  cargoCapacityKg?: number;
}

/**
 * Propulsion system specifications
 */
export interface PropulsionSpecifications {
  propulsionType: 'ELECTRIC' | 'HYBRID' | 'OUTBOARD' | 'INBOARD' | 'POD' | 'SAIL';
  maxPowerKw?: number;
  recommendedPowerKw?: number;
  maxSpeedKn?: number;
  cruisingSpeedKn?: number;
  rangeNm?: number;
  propellerType?: string;
  engineMountType?: 'TRANSOM' | 'INBOARD' | 'STERNDRIVE' | 'POD';
}

/**
 * Electrical system specifications
 */
export interface ElectricalSpecifications {
  systemVoltage: number;
  batteryCapacityAh?: number;
  batteryType?: 'LEAD_ACID' | 'AGM' | 'GEL' | 'LITHIUM' | 'LIFEPO4';
  shoreConnectionAmp?: number;
  hasSolarPanels?: boolean;
  solarCapacityWp?: number;
  hasGenerator?: boolean;
  generatorPowerKw?: number;
  chargingSystemType?: string;
}

/**
 * CE/RCD Compliance specifications
 */
export interface ComplianceSpecifications {
  designCategory: 'A' | 'B' | 'C' | 'D';
  designCategoryDescription?: string;
  maxPersons: number;
  maxCrewWeight?: number;
  minFreeboard?: number;
  stabilityIndex?: number;
  floodedStabilityCompliant?: boolean;
  rcdModuleApplied?: 'A' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  notifiedBodyNumber?: string;
  applicableStandards?: string[];
}

/**
 * Standard safety equipment requirements for the model
 */
export interface SafetyEquipmentRequirements {
  lifeJacketsAdult: number;
  lifeJacketsChild?: number;
  lifebuoys: number;
  fireExtinguishers: number;
  fireExtinguisherType?: string;
  firstAidKit: boolean;
  distressFlares?: number;
  epirb?: boolean;
  vhfRadio?: boolean;
  radarReflector?: boolean;
  navigationLights: boolean;
  anchor?: boolean;
  bilgePump?: boolean;
  soundSignalDevice?: boolean;
  additionalRequirements?: string[];
}

/**
 * Complete model specifications bundle
 */
export interface ModelSpecifications {
  hull?: HullSpecifications;
  dimensions?: DimensionalSpecifications;
  weightCapacity?: WeightCapacitySpecifications;
  propulsion?: PropulsionSpecifications;
  electrical?: ElectricalSpecifications;
  compliance?: ComplianceSpecifications;
  safetyEquipment?: SafetyEquipmentRequirements;
  notes?: string;
}

// ============================================
// SALES CONTENT (v325 - Sales Track)
// ============================================

/**
 * A sales narrative section for brochure-style content.
 * These are reusable per boat model and can be selected when generating Customer Offers.
 *
 * GOVERNANCE: These are fully editable internal fields.
 * No implicit generation from raw specs. No background sync.
 */
export interface SalesSection {
  /** Stable ID */
  id: string;
  /** Section heading (e.g., "Design Philosophy", "Key Features") */
  heading: string;
  /** Narrative body text (supports markdown) */
  bodyText: string;
  /** Display order */
  sortOrder: number;
  /** Soft delete flag */
  archived?: boolean;
}

/**
 * An image slot for sales/brochure content.
 * Can store file reference (preferred) or external URL as fallback.
 *
 * GOVERNANCE: External URLs are reference only - no auto-fetch.
 * Internal content (fileRef) is the authoritative source once set.
 */
export interface SalesImage {
  /** Stable ID */
  id: string;
  /** Optional caption for the image */
  caption?: string;
  /** File reference (preferred - internal upload) */
  fileRef?: string;
  /** External source URL (reference only, not fetched automatically) */
  sourceUrl?: string;
  /** Note about the source (e.g., "From eagleboats.nl product page") */
  sourceNote?: string;
  /** Display order */
  sortOrder: number;
}

/**
 * Metadata about where sales content was imported from.
 * Purely informational - no sync occurs after import.
 *
 * GOVERNANCE: Import is explicit user action with preview + confirm.
 * After confirmation, internal content is single source of truth.
 */
export interface SalesContentSource {
  /** URL that content was imported from */
  importedFromUrl?: string;
  /** When content was imported */
  importedAt?: string;
  /** User who performed the import */
  importedByUserId?: string;
}

/**
 * Boat Model - Simplified without versioning (PATCH 6 - Legacy fields removed)
 * Each model has ONE configuration directly attached
 *
 * CANONICAL SOURCES:
 * - specifications.dimensions for LOA, Beam, Draft
 * - specifications.compliance for Design Category, Max Persons
 * - specifications.weightCapacity for Displacement, Max Load
 */
export interface BoatModel {
  id: string;
  name: string;
  range: string; // Sport, Touring, Cruiser, etc.
  description?: string;
  imageUrl?: string;

  // Pricing
  basePrice: number;

  // Default configuration items (applied on NEW_BUILD project creation)
  defaultConfigurationItems: DefaultConfigurationItem[];

  // Detailed specifications for templates and compliance (REQUIRED - canonical source)
  specifications: ModelSpecifications;

  /**
   * Suggested standard IDs from the Standards Library.
   * These are SUGGESTIONS only - must be explicitly applied to projects.
   * No background sync - suggestions are copied at apply-time.
   */
  suggestedStandardIds?: string[];

  // ============================================
  // SALES CONTENT (v325 - Sales Track)
  // ============================================

  /**
   * Sales narrative sections for brochure-style content.
   * Editable internal content - no background sync from external sources.
   */
  salesSections?: SalesSection[];

  /**
   * Image slots for sales/marketing content.
   * Can store internal file refs or external URLs as references.
   */
  salesImages?: SalesImage[];

  /**
   * Optional metadata about sales content import source.
   * Purely informational - no sync after import.
   */
  salesSource?: SalesContentSource;

  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt?: string;
}

// Keep BoatModelVersion as an alias for backward compatibility with existing code
export type BoatModelVersion = BoatModel & {
  modelId: string;
  versionLabel: string;
  status: 'APPROVED';
};

export interface CreateBoatModelInput {
  name: string;
  range: string;
  description?: string;
  basePrice: number;
  defaultConfigurationItems?: DefaultConfigurationItem[];
  specifications: ModelSpecifications; // REQUIRED - canonical source
  suggestedStandardIds?: string[];
  // Sales content (v325)
  salesSections?: SalesSection[];
  salesImages?: SalesImage[];
  salesSource?: SalesContentSource;
}

export interface UpdateBoatModelInput {
  name?: string;
  range?: string;
  description?: string;
  basePrice?: number;
  defaultConfigurationItems?: DefaultConfigurationItem[];
  specifications?: ModelSpecifications;
  suggestedStandardIds?: string[];
  // Sales content (v325)
  salesSections?: SalesSection[];
  salesImages?: SalesImage[];
  salesSource?: SalesContentSource;
}

// Legacy alias for backward compatibility
export type CreateBoatModelVersionInput = CreateBoatModelInput;

// ============================================
// REPOSITORY
// ============================================

const MODEL_NAMESPACE = 'library_boat_models';

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
   * Get versions for a model - returns the model itself wrapped as a "version" for backward compatibility
   */
  async getVersions(modelId: string): Promise<BoatModelVersion[]> {
    const model = await BoatModelRepository.getById(modelId);
    if (!model) return [];
    // Return the model as a single "version" for backward compatibility
    return [{
      ...model,
      modelId: model.id,
      versionLabel: '1.0',
      status: 'APPROVED' as const,
    }];
  },

  /**
   * Get current version for a model - returns the model itself for backward compatibility
   */
  async getCurrentVersion(modelId: string): Promise<BoatModelVersion | null> {
    const model = await BoatModelRepository.getById(modelId);
    if (!model) return null;
    return {
      ...model,
      modelId: model.id,
      versionLabel: '1.0',
      status: 'APPROVED' as const,
    };
  },

  /**
   * Get version by ID - same as getById for backward compatibility
   */
  async getVersionById(versionId: string): Promise<BoatModelVersion | null> {
    const model = await BoatModelRepository.getById(versionId);
    if (!model) return null;
    return {
      ...model,
      modelId: model.id,
      versionLabel: '1.0',
      status: 'APPROVED' as const,
    };
  },

  /**
   * Create a new boat model
   */
  async create(
    input: CreateBoatModelInput,
    context: AuditContext
  ): Promise<Result<BoatModel, string>> {
    const model: BoatModel = {
      id: generateUUID(),
      name: input.name,
      range: input.range,
      description: input.description,
      basePrice: input.basePrice,
      defaultConfigurationItems: input.defaultConfigurationItems || [],
      specifications: input.specifications,
      suggestedStandardIds: input.suggestedStandardIds,
      // Sales content (v325)
      salesSections: input.salesSections,
      salesImages: input.salesImages,
      salesSource: input.salesSource,
      createdAt: now(),
      createdBy: context.userId,
      updatedAt: now(),
    };

    await BoatModelRepository.save(model);

    await AuditService.logCreate(context, 'BoatModel', model.id, {
      name: input.name,
      range: input.range,
    });

    return Ok(model);
  },

  /**
   * Update boat model - all fields can be updated
   */
  async update(
    id: string,
    updates: UpdateBoatModelInput,
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
   * Create version - for backward compatibility, just updates the model
   */
  async createVersion(
    modelId: string,
    input: CreateBoatModelVersionInput,
    context: AuditContext
  ): Promise<Result<BoatModelVersion, string>> {
    const result = await this.update(modelId, input, context);
    if (!result.ok) return Err(result.error);

    return Ok({
      ...result.value,
      modelId: result.value.id,
      versionLabel: '1.0',
      status: 'APPROVED' as const,
    });
  },

  /**
   * Approve version - no-op for backward compatibility (models are always "approved")
   */
  async approveVersion(
    versionId: string,
    context: AuditContext
  ): Promise<Result<BoatModelVersion, string>> {
    const model = await BoatModelRepository.getById(versionId);
    if (!model) return Err('Model not found');

    return Ok({
      ...model,
      modelId: model.id,
      versionLabel: '1.0',
      status: 'APPROVED' as const,
    });
  },

  /**
   * Update default configuration items
   */
  async updateDefaultConfiguration(
    modelId: string,
    items: DefaultConfigurationItem[],
    context: AuditContext
  ): Promise<Result<BoatModel, string>> {
    return this.update(modelId, { defaultConfigurationItems: items }, context);
  },

  /**
   * Update model specifications
   */
  async updateSpecifications(
    modelId: string,
    specifications: ModelSpecifications,
    context: AuditContext
  ): Promise<Result<BoatModel, string>> {
    return this.update(modelId, { specifications }, context);
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
   * Initialize default boat models - only runs once, even if data is deleted
   */
  async initializeDefaults(context: AuditContext): Promise<void> {
    // Check the persistent initialization flag
    const alreadyInitialized = await SettingsService.hasInitialized('defaultBoatModels');
    if (alreadyInitialized) return;

    // Check if data exists (for backward compatibility)
    const existing = await BoatModelRepository.getAll();
    if (existing.length > 0) {
      await SettingsService.markInitialized('defaultBoatModels');
      return;
    }

    const defaults: CreateBoatModelInput[] = [
      {
        name: 'Eagle 28',
        range: 'Sport',
        basePrice: 89000,
        specifications: {
          dimensions: { lengthOverallM: 8.5, beamOverallM: 2.8 },
          compliance: { designCategory: 'C', maxPersons: 8 },
        },
      },
      {
        name: 'Eagle 32',
        range: 'Sport',
        basePrice: 125000,
        specifications: {
          dimensions: { lengthOverallM: 9.8, beamOverallM: 3.2 },
          compliance: { designCategory: 'B', maxPersons: 10 },
        },
      },
      {
        name: 'Eagle 36 TS',
        range: 'Touring',
        basePrice: 185000,
        specifications: {
          dimensions: { lengthOverallM: 11.0, beamOverallM: 3.5 },
          compliance: { designCategory: 'B', maxPersons: 12 },
        },
      },
      {
        name: 'Eagle 40',
        range: 'Cruiser',
        basePrice: 245000,
        specifications: {
          dimensions: { lengthOverallM: 12.2, beamOverallM: 3.8 },
          compliance: { designCategory: 'A', maxPersons: 14 },
        },
      },
      {
        name: 'Eagle 44 GTS',
        range: 'Grand Touring',
        basePrice: 320000,
        specifications: {
          dimensions: { lengthOverallM: 13.4, beamOverallM: 4.2 },
          compliance: { designCategory: 'A', maxPersons: 16 },
        },
      },
    ];

    for (const input of defaults) {
      await this.create(input, context);
    }

    // Mark as initialized so deleted data won't be re-seeded
    await SettingsService.markInitialized('defaultBoatModels');
  },
};
