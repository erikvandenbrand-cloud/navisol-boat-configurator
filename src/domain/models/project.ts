/**
 * Project Layer Models - v4
 * Project-specific instances and immutable snapshots
 */

import type { Entity, Archivable, PropulsionType, DocumentType } from './common';
import type { ProjectTask } from './task';
import type { ProductionStage, ProductionObservation } from './production';
import type { ComplianceCertification } from './compliance';
import type { TechnicalFile } from './technical-file';
import type { ProjectDocumentTemplate } from './document-template';

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

export type PlanningTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

/**
 * A planning task for production scheduling.
 * Part of the project planning container.
 */
export interface PlanningTask {
  id: string;
  title: string;
  startDate?: string;       // ISO yyyy-mm-dd
  endDate?: string;         // ISO yyyy-mm-dd
  durationDays?: number;
  status?: PlanningTaskStatus;
  assigneeResourceIds?: string[];
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
}

/**
 * Production planning container for the project.
 * Contains tasks and resources for scheduling and resource allocation.
 * Optional, defaults to empty on legacy projects.
 */
export interface ProjectPlanning {
  tasks?: PlanningTask[];
  resources?: PlanningResource[];
}

// ============================================
// BOAT INSTANCE (SERIAL PRODUCTION)
// ============================================

export interface BoatInstance {
  id: string;
  label: string;  // "Boat 01", "Boat 02", …
  win?: string;   // WIN/CIN per boat
}

// ============================================
// APPLIED STANDARD (CE COMPLIANCE)
// ============================================

/**
 * An applied standard or harmonised technical specification.
 * Part of the Technical Dossier for CE compliance.
 * Standards can be EN-ISO harmonised standards (presumption of conformity)
 * or other relevant specifications applied to demonstrate compliance.
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

  // Production tasks
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
  // Each project can have multiple boats with individual WIN/CIN
  boats?: BoatInstance[];

  // @deprecated - Use boats[].win instead. Kept for backward compatibility.
  // Watercraft Identification Number (WIN/CIN) - for NEW_BUILD projects
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

  // Applied Standards (CE compliance)
  // List of applied harmonised standards and technical specifications
  // Part of the Technical Dossier for RCD 2013/53/EU compliance
  appliedStandards?: AppliedStandard[];

  // Production Planning container
  // Contains tasks and resources for scheduling and resource allocation
  // Optional, defaults to undefined on legacy projects
  planning?: ProjectPlanning;

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

  // Source
  configurationSnapshotId: string;

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

  // Cost estimation tracking
  isEstimated: boolean; // true if cost was estimated (no actual costPrice)
  estimationRatio?: number; // The ratio used for estimation (e.g., 0.6 = 60%)
  sellPrice?: number; // Original sell price (for reference when estimated)

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
