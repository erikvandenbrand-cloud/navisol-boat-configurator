/**
 * Project Layer Models - v4
 * Project-specific instances and immutable snapshots
 */

import type { Entity, Archivable, PropulsionType, DocumentType } from './common';
import type { WorkItem, ProjectTask, PlanningTaskStatus } from './task';
import type { ProductionStage, ProductionObservation } from './production';
import type { ComplianceCertification } from './compliance';
import type { TechnicalFile } from './technical-file';
import type { ProjectDocumentTemplate } from './document-template';
import type { EquipmentListDocument, QuoteEquipmentListRef } from './equipment-list';
import type { ProjectOffer } from './offer-template';

// Re-export PlanningTaskStatus for backward compatibility
export type { PlanningTaskStatus };

// ============================================
// PROJECT STATUS
// ============================================

export type ProjectType = 'NEW_BUILD' | 'REFIT' | 'MAINTENANCE';

export type ProjectStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'OFFER_SENT'
  | 'ORDER_CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CLOSED';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED';

export type AmendmentType =
  | 'EQUIPMENT_ADD'
  | 'EQUIPMENT_REMOVE'
  | 'EQUIPMENT_CHANGE'
  | 'SCOPE_CHANGE'
  | 'PRICE_ADJUSTMENT'
  | 'SPECIFICATION_CHANGE';

export type DocumentStatus = 'DRAFT' | 'FINAL' | 'SUPERSEDED' | 'ARCHIVED';

// ============================================
// PLANNING (PRODUCTION PLANNING)
// ============================================

/**
 * @deprecated Use WorkItem with kind: 'planning' instead
 * Legacy interface kept for backward compatibility during migration.
 * This interface definition is re-exported from task.ts.
 */
export interface PlanningTask {
  id: string;
  title: string;
  startDate?: string;       // ISO yyyy-mm-dd
  endDate?: string;         // ISO yyyy-mm-dd
  durationDays?: number;
  status?: PlanningTaskStatus;
  /** @deprecated Use assigneeIds on WorkItem instead */
  assigneeResourceIds?: string[];
  /** @deprecated Use dependsOnIds on WorkItem instead */
  dependsOnTaskIds?: string[];
  notes?: string;
}

/**
 * A planning resource (person, equipment, etc.) for production scheduling.
 * Part of the project planning container.
 */
export interface PlanningResource {
  id: string;
  name: string;
  role?: string;
  capacityPct?: number;     // 0..100 (no validation)
  notes?: string;

  /**
   * Source User ID if this resource was created from a User (v324+).
   * Enables stable identity resolution when the User's display name changes.
   * If present, use this to resolve current name from User record.
   */
  sourceUserId?: string;
}

/**
 * Production planning container for the project.
 * Contains resources for scheduling and resource allocation.
 * Tasks are now stored in project.workItems with kind: 'planning'.
 */
export interface ProjectPlanning {
  /**
   * @deprecated Use project.workItems.filter(w => w.kind === 'planning') instead
   * Migrated to workItems on load
   */
  tasks?: PlanningTask[];

  /** Planning resources (people/equipment) */
  resources?: PlanningResource[];
}

// ============================================
// BOAT INSTANCE (SERIAL PRODUCTION)
// ============================================

export interface BoatInstance {
  id: string;
  label: string;  // "Boat 01", "Boat 02", …
  win?: string;   // Watercraft Identification Number (WIN) per boat
}

// ============================================
// APPLIED STANDARD (CE COMPLIANCE)
// ============================================

/**
 * An applied standard or harmonised technical specification.
 * Part of the Technical Dossier for CE compliance.
 * Standards can be EN-ISO harmonised standards (presumption of conformity)
 * or other relevant specifications applied to demonstrate compliance.
 *
 * Standards are a SHARED COMPLIANCE INPUT used by multiple documents.
 * Documents reference standards via tags, not by copying them.
 */
export interface AppliedStandard {
  id: string;
  /** ISO/EN standard code, e.g., "EN ISO 12217-1" (required) */
  code: string;
  /** Full title, e.g., "Stability and buoyancy - Part 1: Non-sailing boats" */
  title?: string;
  /** Publication year, e.g., "2015" */
  year?: string;
  /** Scope note explaining how this standard applies to the project */
  scopeNote?: string;
  /** Whether this is an EU Official Journal harmonised standard */
  isHarmonised?: boolean;
  /** IDs of existing project attachments serving as evidence */
  evidenceAttachmentIds?: string[];
  /**
   * Tags for filtering standards in documents.
   * Common tags: 'electrical', 'stability', 'fuel', 'steering', 'doc', 'owner-manual', 'hull', 'fire'
   * Documents can filter by tag to show relevant standards.
   */
  tags?: string[];
}

// ============================================
// STANDARD TAGS (Pre-defined for filtering)
// ============================================

export const STANDARD_TAGS = [
  'electrical',
  'stability',
  'buoyancy',
  'fuel',
  'steering',
  'hull',
  'fire',
  'navigation',
  'gas',
  'discharge',
  'doc',           // For Declaration of Conformity
  'owner-manual',  // For Owner's Manual
  'general',       // General applicability
] as const;

export type StandardTag = (typeof STANDARD_TAGS)[number];

export const STANDARD_TAG_LABELS: Record<StandardTag, string> = {
  electrical: 'Electrical Systems',
  stability: 'Stability',
  buoyancy: 'Buoyancy',
  fuel: 'Fuel Systems',
  steering: 'Steering',
  hull: 'Hull & Structure',
  fire: 'Fire Protection',
  navigation: 'Navigation',
  gas: 'Gas/LPG Systems',
  discharge: 'Discharge Prevention',
  doc: 'Declaration of Conformity',
  'owner-manual': "Owner's Manual",
  general: 'General',
};

// ============================================
// VESSEL IDENTITY (CE COMPLIANCE INPUT)
// ============================================

/**
 * Vessel Identity and General Description - Structured Compliance Input
 * Core identification data for CE compliance documentation.
 * This data feeds into multiple outputs (DoC, Owner's Manual, Builder's Plate, etc.)
 */
/**
 * Metadata about a one-time vessel identity initialization from a Boat Model.
 * This tracks WHEN and FROM WHICH model the init happened - no sync implied.
 */
export interface VesselIdentityInit {
  /** ID of the boat model used for initialization */
  boatModelId: string;
  /** Name of the boat model (cached for display) */
  boatModelName: string;
  /** Timestamp of initialization */
  initializedAt: string;
  /** User who performed the initialization */
  initializedBy?: string;
}

/**
 * Vessel Identity - Project-specific identification data for CE compliance.
 *
 * GOVERNANCE (Patch 5):
 * - Project owns: vesselName, modelName, win, yearOfConstruction, intendedUse, specialConditions
 * - BoatModel owns: LOA, Beam, Draft, Max Persons, Design Category, Displacement, Max Load
 *   → Resolved via BoatModelService at read-time (no storage in vesselIdentity)
 * - Settings owns: Builder name, address
 *   → Resolved via SettingsService at read-time (no storage in vesselIdentity)
 */
export interface VesselIdentity {
  /** Vessel name (optional) */
  vesselName?: string;
  /** Vessel model name */
  modelName?: string;
  /** Watercraft Identification Number (WIN) per RCD 2013/53/EU */
  win?: string;
  /** Year of construction */
  yearOfConstruction?: string;
  /** Intended use description */
  intendedUse?: string;
  /** Special conditions / limitations */
  specialConditions?: string;
  /** Initialization metadata - tracks one-time copy from Boat Model (no sync) */
  initFromModel?: VesselIdentityInit;

  // ============================================
  // DEPRECATED FIELDS - DO NOT USE
  // These remain for backward compatibility during migration.
  // UI and documents should NOT read these; use BoatModel/Settings resolvers.
  // ============================================

  /**
   * @deprecated Use SettingsService.getCompanyInfo().name instead.
   * Builder identity is owned by Settings, not per-project.
   */
  builderName?: string;
  /**
   * @deprecated Use SettingsService.getCompanyInfo() for address.
   * Builder identity is owned by Settings, not per-project.
   */
  builderAddress?: string;
  /**
   * @deprecated Use BoatModel.specifications.compliance.designCategory instead.
   * Model facts are owned by BoatModel, resolved at read-time.
   */
  designCategory?: 'A' | 'B' | 'C' | 'D';
  /**
   * @deprecated Use BoatModel.specifications.compliance.maxPersons instead.
   * Model facts are owned by BoatModel, resolved at read-time.
   */
  maxPersons?: number;
  /**
   * @deprecated Use BoatModel.specifications.weightCapacity.maxLoadKg instead.
   * Model facts are owned by BoatModel, resolved at read-time.
   */
  maxLoadKg?: number;
  /**
   * @deprecated Use BoatModel.specifications.dimensions.lengthOverallM instead.
   * Model facts are owned by BoatModel, resolved at read-time.
   */
  loaMeters?: number;
  /**
   * @deprecated Use BoatModel.specifications.dimensions.beamOverallM instead.
   * Model facts are owned by BoatModel, resolved at read-time.
   */
  beamMeters?: number;
  /**
   * @deprecated Use BoatModel.specifications.dimensions.draftM instead.
   * Model facts are owned by BoatModel, resolved at read-time.
   */
  draftMeters?: number;
  /**
   * @deprecated Use BoatModel.specifications.weightCapacity.displacementLightKg instead.
   * Model facts are owned by BoatModel, resolved at read-time.
   */
  displacementKg?: number;
  /**
   * @deprecated Use vesselIdentityInit instead.
   */
  prefillSource?: 'model' | 'template' | string;
}

// ============================================
// DECLARATIONS & RATINGS (CE COMPLIANCE INPUT)
// ============================================

/**
 * Declarations and Ratings - Structured Compliance Input
 * CE certification declarations and conformity assessment data.
 */
export interface ComplianceDeclarations {
  /** Declaration of Conformity reference number */
  docReferenceNumber?: string;
  /** DoC issue date (ISO date) */
  docIssueDate?: string;
  /** DoC signatory name */
  docSignatory?: string;
  /** DoC signatory role/title */
  docSignatoryRole?: string;
  /** Notified Body number (if applicable, e.g., Module A1) */
  notifiedBodyNumber?: string;
  /** Notified Body name */
  notifiedBodyName?: string;
  /** Conformity assessment module (A, A1, B+C, etc.) */
  conformityModule?: 'A' | 'A1' | 'B+C' | 'B+D' | 'B+E' | 'B+F' | 'G' | 'H';
  /** Post-construction assessment (for imported boats) */
  postConstructionAssessment?: boolean;
  /** PCA reference if applicable */
  pcaReference?: string;
  /** Additional declarations or certifications */
  additionalCertifications?: string[];
}

// ============================================
// TECHNICAL REFERENCE (INDEX ENTRY)
// ============================================

/**
 * Technical Reference - An indexed drawing or technical document
 * This is an INDEX entry, not the file itself.
 * Actual files are stored in the Technical Dossier.
 */
export interface TechnicalReference {
  id: string;
  /** Reference code (e.g., "DWG-001", "CALC-001") */
  referenceCode: string;
  /** Title / description */
  title: string;
  /** Reference type */
  type: 'drawing' | 'calculation' | 'specification' | 'certificate' | 'test-report' | 'other';
  /** Revision / version */
  revision?: string;
  /** Issue date */
  issueDate?: string;
  /** Associated Technical File section */
  technicalFileSection?: string;
  /** IDs of attachments in the Technical Dossier */
  attachmentIds?: string[];
  /** Notes */
  notes?: string;
}

// ============================================
// PROJECT (AGGREGATE ROOT)
// ============================================

export interface Project extends Entity, Archivable {
  projectNumber: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;

  // Relationships
  clientId: string;

  // Working configuration (editable until frozen)
  configuration: ProjectConfiguration;

  // Immutable snapshots (created at milestones)
  configurationSnapshots: ConfigurationSnapshot[];

  // Versioned quotes
  quotes: ProjectQuote[];
  currentQuoteId?: string;

  // BOM baselines
  bomSnapshots: BOMSnapshot[];

  // Generated documents
  documents: ProjectDocument[];

  // Post-freeze changes
  amendments: ProjectAmendment[];

  // ============================================
  // UNIFIED WORK ITEMS (v4.1+)
  // ============================================

  /**
   * Unified work items array replacing both tasks and planning.tasks
   * Contains both 'planning' and 'production' kind items
   */
  workItems?: WorkItem[];

  // ============================================
  // LEGACY TASK FIELDS (DEPRECATED)
  // ============================================

  /**
   * @deprecated Use workItems.filter(w => w.kind === 'production') instead
   * Production tasks - migrated to workItems on load
   */
  tasks: ProjectTask[];

  // Production stages (initialized when project enters IN_PRODUCTION)
  productionStages?: ProductionStage[];

  // Compliance/Certification packs (CE, ES-TRIN, Lloyds, etc.)
  compliancePacks?: ComplianceCertification[];

  // Production feedback / observations (project-level, independent of tasks)
  productionFeedback?: ProductionObservation[];

  // Library version pins (set at OrderConfirmed)
  libraryPins?: LibraryPins;

  // Internal project flag (affects timesheet billable default)
  isInternal?: boolean;

  // Boat instances for serial production (NEW_BUILD)
  // Each project can have multiple boats with individual WIN numbers
  boats?: BoatInstance[];

  // @deprecated - Use boats[].win instead. Kept for backward compatibility.
  // Watercraft Identification Number (WIN) - for NEW_BUILD projects
  // Format per RCD 2013/53/EU: country code + builder code + serial + model year + production year
  win?: string;

  // Technical File structure (per RCD 2013/53/EU)
  // Contains 10 fixed sections with attachment references for CE documentation
  technicalFile?: TechnicalFile;

  // CE Document Templates (DoC, Owner's Manual, CE Marking Cert, Annex Index)
  // Required for NEW_BUILD projects, optional for REFIT/MAINTENANCE
  // Each template is versioned: DRAFT → APPROVED (immutable)
  documentTemplates?: ProjectDocumentTemplate[];

  // Systems/Features installed on this vessel (for Owner's Manual modular content)
  // Free-form keys like: electric_propulsion, fuel_system, shore_power, hydraulic_steering,
  // bilge_pump, fire_extinguishers, heating, fresh_water, waste_water, navigation_lights, etc.
  systems?: string[];

  // ============================================
  // COMPLIANCE INPUTS (Structured Editable Data)
  // ============================================

  // Applied Standards (CE compliance)
  // List of applied harmonised standards and technical specifications
  // SHARED INPUT: Referenced by multiple documents via tags
  appliedStandards?: AppliedStandard[];

  // Vessel Identity and General Description
  // Core identification data for CE compliance
  // SHARED INPUT: Feeds DoC, Owner's Manual, Builder's Plate
  vesselIdentity?: VesselIdentity;

  // Declarations and Ratings (CE conformity assessment data)
  // SHARED INPUT: Feeds DoC and compliance outputs
  declarations?: ComplianceDeclarations;

  // Technical References (indexed drawings/documents)
  // INDEX only - actual files stored in Technical Dossier
  technicalReferences?: TechnicalReference[];

  // Production Planning container
  // Contains tasks and resources for scheduling and resource allocation
  // Optional, defaults to undefined on legacy projects
  planning?: ProjectPlanning;

  // Equipment Lists (non-priced, informational)
  // Generated from configuration, can be included with quotes
  equipmentLists?: EquipmentListDocument[];

  // Created by
  createdBy: string;
}

// ============================================
// CONFIGURATION ITEM TYPE
// ============================================

export type ConfigurationItemType = 'ARTICLE' | 'KIT' | 'CUSTOM' | 'LEGACY';

// ============================================
// CONFIGURATION
// ============================================

export interface ProjectConfiguration {
  // Model selection
  boatModelVersionId?: string;
  propulsionType: PropulsionType;

  // Equipment
  items: ConfigurationItem[];

  // Pricing
  subtotalExclVat: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;

  // Status
  isFrozen: boolean;
  frozenAt?: string;
  frozenBy?: string;

  lastModifiedAt: string;
  lastModifiedBy: string;
}

export interface ConfigurationItem {
  id: string;

  // Item type (explicit typing for Library v4)
  itemType: ConfigurationItemType;

  // Source references (mutually exclusive based on itemType)
  // For ARTICLE items:
  articleId?: string;
  articleVersionId?: string;
  // For KIT items:
  kitId?: string;
  kitVersionId?: string;
  // Legacy support (deprecated - use for migration only)
  catalogItemId?: string;
  catalogVersionId?: string;

  isCustom: boolean;

  // Item details
  category: string;
  subcategory?: string;
  articleNumber?: string;
  name: string;
  description?: string;

  // Quantity & pricing
  quantity: number;
  unit: string;
  unitPriceExclVat: number;
  lineTotalExclVat: number;

  // Flags
  isIncluded: boolean;
  ceRelevant: boolean;
  safetyCritical: boolean;

  sortOrder: number;
}

export interface ConfigurationSnapshot {
  id: string;
  projectId: string;
  snapshotNumber: number;

  // Complete copy of configuration at this point
  data: ProjectConfiguration;

  // Why was this snapshot created?
  trigger: 'ORDER_CONFIRMED' | 'AMENDMENT' | 'MANUAL';
  triggerReason?: string;

  createdAt: string;
  createdBy: string;
}

// ============================================
// QUOTES
// ============================================

export interface ProjectQuote {
  id: string;
  projectId: string;
  quoteNumber: string;
  version: number;
  status: QuoteStatus;

  // Pricing snapshot
  lines: QuoteLine[];
  subtotalExclVat: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;

  // Terms
  validUntil: string;
  paymentTerms: string;
  deliveryTerms: string;
  deliveryWeeks?: number;
  notes?: string;

  // Template used
  templateVersionId?: string;

  // PDF snapshot (immutable after SENT)
  pdfRef?: string;
  pdfData?: string; // Base64 for LocalStorage
  pdfGeneratedAt?: string;

  // Status tracking
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  supersededAt?: string;
  supersededBy?: string;

  // Equipment list inclusion (optional)
  equipmentListRef?: QuoteEquipmentListRef;

  /**
   * Project Offer - customer-facing offer text derived from template.
   * GOVERNANCE:
   * - Initialized explicitly from OfferTemplate (no auto-init)
   * - Blocks are editable per-quote (owned copy)
   * - Re-apply from template is explicit action only
   * - No background sync with template changes
   */
  offer?: ProjectOffer;

  createdAt: string;
  createdBy: string;
}

export interface QuoteLine {
  id: string;
  configurationItemId: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceExclVat: number;
  lineTotalExclVat: number;
  isOptional: boolean;
}

// ============================================
// BOM (BILL OF MATERIALS)
// ============================================

export interface BOMSnapshot {
  id: string;
  projectId: string;
  snapshotNumber: number;

  // Source: Configuration snapshot used
  configurationSnapshotId: string;

  // Source: Quote that triggered/owns this BOM
  // BOM can only be generated from a Quote (enforced invariant)
  sourceQuoteId: string;
  sourceQuoteNumber: string;
  sourceQuoteVersion: number;

  // BOM data
  items: BOMItem[];
  totalParts: number;
  totalCostExclVat: number;

  // Cost estimation summary
  estimatedCostCount: number; // Number of items with estimated costs
  estimatedCostTotal: number; // Total value of estimated costs
  actualCostTotal: number; // Total value of actual (non-estimated) costs
  costEstimationRatio: number; // The ratio used for this BOM (e.g., 0.6)

  // Status
  status: 'BASELINE' | 'REVISED';

  createdAt: string;
  createdBy: string;
}

/**
 * Cost source for BOM items - indicates where the cost value came from.
 * - LIBRARY: From Article.supplierCostExclVat (default supplier cost in library)
 * - ESTIMATED: Calculated using estimation ratio from sell price (no supplier cost available)
 * - OVERRIDE: Manually edited by user on the BOM line (project-owned)
 */
export type BOMCostSource = 'LIBRARY' | 'ESTIMATED' | 'OVERRIDE';

export interface BOMItem {
  id: string;
  category: string;
  articleNumber?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  leadTimeDays?: number;

  /**
   * Cost source tracking - indicates where the cost value came from.
   * - LIBRARY: From Article.supplierCostExclVat
   * - ESTIMATED: Calculated using estimation ratio from sell price
   * - OVERRIDE: Manually edited by user on the BOM line
   */
  costSource: BOMCostSource;

  // Cost estimation tracking (legacy, kept for backward compatibility)
  isEstimated: boolean; // true if cost was estimated (no actual costPrice)
  estimationRatio?: number; // The ratio used for estimation (e.g., 0.6 = 60%)
  sellPrice?: number; // Original sell price (for reference when estimated)

  /** Original library supplier cost (for tooltip display when source is LIBRARY) */
  librarySupplierCost?: number;

  /** Library supplier cost source note (for tooltip display when source is LIBRARY) */
  librarySupplierCostNote?: string;

  // Article version reference for click-through to pinned article details
  articleVersionId?: string;
  articleId?: string;
}

// ============================================
// DOCUMENTS
// ============================================

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;

  // Version tracking
  version: number;
  status: DocumentStatus;

  // Source template
  templateVersionId?: string;

  // Input data used to generate (for reproducibility)
  inputSnapshot: Record<string, unknown>;

  // Generated file
  fileRef?: string;
  fileData?: string; // Base64 for LocalStorage
  mimeType: string;
  fileSizeBytes?: number;

  // Tracking
  generatedAt: string;
  generatedBy: string;
  finalizedAt?: string;
  finalizedBy?: string;

  createdAt: string;
}

// ============================================
// AMENDMENTS
// ============================================

export interface ProjectAmendment {
  id: string;
  projectId: string;
  amendmentNumber: number;

  // What changed
  type: AmendmentType;
  reason: string;

  // Before/after snapshots
  beforeSnapshotId: string;
  afterSnapshotId: string;

  // Impact
  priceImpactExclVat: number;
  affectedItems: string[];

  // Approval
  requestedBy: string;
  requestedAt: string;
  approvedBy: string;
  approvedAt: string;

  createdAt: string;
}

// ============================================
// LIBRARY PINS
// ============================================

export interface LibraryPins {
  boatModelVersionId: string;
  catalogVersionId: string;
  templateVersionIds: Partial<Record<DocumentType, string>>;
  procedureVersionIds: string[];

  pinnedAt: string;
  pinnedBy: string;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

// Production mode for NEW_BUILD projects
export type ProductionMode = 'single' | 'serial';

export interface CreateProjectInput {
  title: string;
  type: ProjectType;
  clientId: string;
  boatModelVersionId?: string;
  propulsionType?: PropulsionType;
  // For NEW_BUILD projects: choose single boat or serial production
  productionMode?: ProductionMode;
  // Number of boats to create for serial production (min 2, default 2)
  initialBoatCount?: number;
  // Systems/features installed on this vessel (for Owner's Manual modular content)
  systems?: string[];
}

export interface AddConfigurationItemInput {
  // Item type (explicit typing for Library v4)
  itemType: ConfigurationItemType;

  // Source references (based on itemType)
  articleId?: string;
  articleVersionId?: string;
  kitId?: string;
  kitVersionId?: string;
  // Legacy support (deprecated)
  catalogItemId?: string;
  catalogVersionId?: string;

  isCustom: boolean;
  category: string;
  subcategory?: string;
  articleNumber?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPriceExclVat: number;
  ceRelevant?: boolean;
  safetyCritical?: boolean;
}
