/**
 * NAVISOL v3.0 - Project-Centric Architecture
 *
 * Core Principle: Everything is organized around the PROJECT (the boat being built/serviced).
 * Each project contains its complete history: quotes, BOM, documents, etc.
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type ProjectType = 'NEW_BUILD' | 'REFIT' | 'MAINTENANCE';

export type ProjectStatus =
  | 'DRAFT'           // Initial state, configuration in progress
  | 'QUOTED'          // Quotation sent to client
  | 'CONFIRMED'       // Order confirmed, ready for production
  | 'IN_PRODUCTION'   // Active build/work
  | 'QUALITY_CHECK'   // QA and testing phase
  | 'READY_DELIVERY'  // Ready for handover
  | 'DELIVERED'       // Handed over to client
  | 'CLOSED';         // Project archived

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, {
  label: string;
  labelNL: string;
  color: string;
  bgColor: string;
  nextStatuses: ProjectStatus[];
}> = {
  DRAFT: {
    label: 'Draft',
    labelNL: 'Concept',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    nextStatuses: ['QUOTED', 'CONFIRMED'],
  },
  QUOTED: {
    label: 'Quoted',
    labelNL: 'Geoffreerd',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    nextStatuses: ['CONFIRMED', 'DRAFT', 'CLOSED'],
  },
  CONFIRMED: {
    label: 'Confirmed',
    labelNL: 'Bevestigd',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    nextStatuses: ['IN_PRODUCTION'],
  },
  IN_PRODUCTION: {
    label: 'In Production',
    labelNL: 'In Productie',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    nextStatuses: ['QUALITY_CHECK'],
  },
  QUALITY_CHECK: {
    label: 'Quality Check',
    labelNL: 'Kwaliteitscontrole',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    nextStatuses: ['READY_DELIVERY', 'IN_PRODUCTION'],
  },
  READY_DELIVERY: {
    label: 'Ready for Delivery',
    labelNL: 'Klaar voor Levering',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    nextStatuses: ['DELIVERED'],
  },
  DELIVERED: {
    label: 'Delivered',
    labelNL: 'Geleverd',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    nextStatuses: ['CLOSED'],
  },
  CLOSED: {
    label: 'Closed',
    labelNL: 'Afgesloten',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    nextStatuses: [],
  },
};

export type PropulsionType = 'Electric' | 'Diesel' | 'Hybrid' | 'Outboard';
export type DesignCategory = 'A' | 'B' | 'C' | 'D';
export type DocumentType =
  | 'QUOTATION'
  | 'BOM'
  | 'OWNERS_MANUAL'
  | 'CE_DECLARATION'
  | 'TECHNICAL_FILE'
  | 'INVOICE'
  | 'DELIVERY_NOTE'
  | 'TEST_REPORT'
  | 'PHOTO'
  | 'OTHER';

// ============================================
// CLIENT
// ============================================

export interface Client {
  id: string;
  name: string;
  type: 'company' | 'private';
  // Contact
  email?: string;
  phone?: string;
  // Address
  street?: string;
  postalCode?: string;
  city?: string;
  country: string;
  // Business
  vatNumber?: string;
  kvkNumber?: string;
  // Meta
  status: 'active' | 'prospect' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// BOAT MODEL (Template/Catalog)
// ============================================

export interface BoatModel {
  id: string;
  name: string;                    // e.g., "Eagle 28TS"
  range: string;                   // e.g., "TS", "Classic", "Hybruut"

  // Base Specifications (template values)
  lengthM: number;
  beamM: number;
  draftM: number;
  weightKg: number;
  maxPersons: number;
  designCategory: DesignCategory;

  // Propulsion options for this model
  availablePropulsion: PropulsionType[];
  defaultPropulsion: PropulsionType;

  // Pricing
  basePriceExclVat: number;

  // Display
  description?: string;
  highlights?: string[];
  imageUrl?: string;

  // Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PROJECT - The Central Entity
// ============================================

export interface Project {
  id: string;
  projectNumber: string;          // PRJ-2025-001
  title: string;                  // "Van der Berg - Eagle 28TS Electric"
  projectType: ProjectType;
  status: ProjectStatus;

  // Links
  clientId: string;
  modelId?: string;               // For new builds

  // Boat Identity (filled as project progresses)
  boatIdentity: BoatIdentity;

  // Specification (derived from model + configuration)
  specification: ProjectSpecification;

  // Configuration (what's being built)
  equipment: EquipmentList;

  // Documents Archive (complete history)
  documents: ProjectDocument[];

  // Production (for new builds)
  production?: ProductionData;

  // Delivery
  delivery?: DeliveryData;

  // Meta
  createdById: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// ============================================
// BOAT IDENTITY
// ============================================

export interface BoatIdentity {
  hullId?: string;                // HIN/CIN - Hull Identification Number
  boatName?: string;              // Client's chosen name
  registrationNumber?: string;
  homePort?: string;
  yearBuilt?: number;
  engineHours?: number;
  lastEngineHoursUpdate?: string;
}

// ============================================
// PROJECT SPECIFICATION
// (Auto-derived from Model + Equipment, with overrides)
// ============================================

export interface ProjectSpecification {
  // From Model (can be overridden for custom builds)
  lengthM: number;
  beamM: number;
  draftM: number;
  weightKg: number;
  maxPersons: number;
  designCategory: DesignCategory;

  // From Configuration
  propulsionType: PropulsionType;

  // Propulsion Details (derived from equipment)
  propulsion: {
    motorCount: number;
    totalPowerKw: number;
    batteryCapacityKwh?: number;
    batteryVoltage?: number;
    fuelType?: string;
    fuelCapacityL?: number;
    rangeNm?: number;
    maxSpeedKnots?: number;
  };

  // Electrical (derived from equipment)
  electrical: {
    dcVoltage?: number;
    acSystem: boolean;
    shorepower: boolean;
    solarCapacityW?: number;
    inverterCharger: boolean;
  };

  // Safety (derived from equipment)
  safety: {
    fireExtinguishers: number;
    lifeJackets: number;
    lifebuoy: boolean;
    vhfRadio: boolean;
    epirb: boolean;
    flares: boolean;
    firstAidKit: boolean;
    bilgePump: boolean;
    navigationLights: boolean;
  };

  // CE Compliance
  ceMarking: {
    manufacturer: string;
    declarationDate?: string;
    notifiedBody?: string;
    standardsApplied: string[];
  };

  // Custom overrides (for non-standard specs)
  customOverrides?: Record<string, unknown>;

  // Last derived timestamp
  lastDerivedAt: string;
}

// ============================================
// EQUIPMENT LIST
// (The boat's configuration - what's installed)
// ============================================

export interface EquipmentList {
  version: number;                // Version tracking
  status: 'DRAFT' | 'FROZEN';     // Frozen when order confirmed
  frozenAt?: string;
  frozenById?: string;

  // Items organized by category
  items: EquipmentItem[];

  // Pricing summary
  subtotalExclVat: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;

  // Meta
  lastModifiedAt: string;
  lastModifiedById: string;
}

export interface EquipmentItem {
  id: string;
  articleId?: string;             // Link to parts database
  category: string;
  subcategory?: string;
  name: string;
  description?: string;

  // Quantity & Pricing
  quantity: number;
  unit: string;
  unitPriceExclVat: number;
  lineTotalExclVat: number;

  // Type
  isStandard: boolean;            // Standard equipment for this model
  isOptional: boolean;            // Optional extra
  isIncluded: boolean;            // Included in this configuration

  // CE Relevance
  ceRelevant: boolean;
  safetyCritical: boolean;

  // For grouping/sorting
  sortOrder: number;
}

// ============================================
// PROJECT DOCUMENTS
// (Complete history of all documents)
// ============================================

export interface ProjectDocument {
  id: string;
  type: DocumentType;
  title: string;
  description?: string;

  // Version tracking
  version: number;
  versionLabel?: string;          // e.g., "v1.2", "Final"

  // File info
  filename: string;
  fileUrl: string;                // Storage URL or base64
  fileSizeKb?: number;
  mimeType: string;

  // Status
  status: 'DRAFT' | 'FINAL' | 'SUPERSEDED' | 'ARCHIVED';

  // For quotations
  quotationData?: {
    quoteNumber: string;
    validUntil: string;
    status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
    sentAt?: string;
    acceptedAt?: string;
    rejectedAt?: string;
  };

  // For BOM
  bomData?: {
    equipmentVersion: number;
    partsCount: number;
    totalCost: number;
  };

  // Meta
  createdById: string;
  createdByName: string;
  createdAt: string;
  notes?: string;
  tags?: string[];
}

// ============================================
// PRODUCTION DATA
// ============================================

export interface ProductionData {
  // Timeline
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;

  // Stages
  stages: ProductionStage[];
  currentStageId?: string;

  // Tasks
  tasks: ProjectTask[];

  // Time tracking
  timeEntries: TimeEntry[];
  totalHoursWorked: number;
  totalHoursBillable: number;
}

export interface ProductionStage {
  id: string;
  name: string;
  nameNL: string;
  order: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

  // Dates
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;

  // Work
  estimatedHours?: number;
  actualHours?: number;

  // Completion
  completedById?: string;
  completedByName?: string;
  completedAt?: string;
  notes?: string;
}

export interface ProjectTask {
  id: string;
  stageId?: string;
  title: string;
  description?: string;

  // Assignment
  assignedToId?: string;
  assignedToName?: string;

  // Status
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

  // Dates
  dueDate?: string;
  completedAt?: string;

  // Time
  estimatedHours?: number;
  actualHours?: number;

  // Meta
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  taskId?: string;
  userId: string;
  userName: string;

  // Time
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;

  // Billing
  isBillable: boolean;
  hourlyRate?: number;

  // Notes
  description?: string;

  // Meta
  createdAt: string;
}

// ============================================
// DELIVERY DATA
// ============================================

export interface DeliveryData {
  // Checklist
  checklist: ChecklistItem[];
  checklistComplete: boolean;

  // Sign-off
  signoff?: {
    completed: boolean;
    signedById?: string;
    signedByName?: string;
    signedAt?: string;
    clientSignature?: string;
    notes?: string;
  };

  // Handover
  handoverDate?: string;
  handoverLocation?: string;
  handoverNotes?: string;

  // Warranty
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyTerms?: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  isRequired: boolean;

  // Completion
  isCompleted: boolean;
  completedById?: string;
  completedByName?: string;
  completedAt?: string;

  // Evidence
  requiresPhoto: boolean;
  photos?: string[];              // URLs

  // Notes
  notes?: string;

  // Waiver (if required but not done)
  isWaived?: boolean;
  waivedById?: string;
  waivedByName?: string;
  waivedAt?: string;
  waiverReason?: string;

  // Link to procedure
  procedureId?: string;

  // Order
  sortOrder: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Derive specification from model and equipment
 */
export function deriveSpecificationFromEquipment(
  model: BoatModel,
  equipment: EquipmentList,
  propulsionType: PropulsionType
): ProjectSpecification {
  // Start with model base specs
  const spec: ProjectSpecification = {
    lengthM: model.lengthM,
    beamM: model.beamM,
    draftM: model.draftM,
    weightKg: model.weightKg,
    maxPersons: model.maxPersons,
    designCategory: model.designCategory,
    propulsionType,
    propulsion: {
      motorCount: 0,
      totalPowerKw: 0,
    },
    electrical: {
      acSystem: false,
      shorepower: false,
      inverterCharger: false,
    },
    safety: {
      fireExtinguishers: 0,
      lifeJackets: 0,
      lifebuoy: false,
      vhfRadio: false,
      epirb: false,
      flares: false,
      firstAidKit: false,
      bilgePump: false,
      navigationLights: false,
    },
    ceMarking: {
      manufacturer: 'NAVISOL B.V.',
      standardsApplied: ['ISO 12217', 'ISO 14946', 'ISO 10133'],
    },
    lastDerivedAt: new Date().toISOString(),
  };

  // Derive from equipment items
  for (const item of equipment.items) {
    if (!item.isIncluded) continue;

    const nameLower = item.name.toLowerCase();
    const catLower = item.category.toLowerCase();

    // Count motors
    if (nameLower.includes('motor') || nameLower.includes('engine')) {
      spec.propulsion.motorCount += item.quantity;
    }

    // Battery capacity (look for kWh in name)
    const kwhMatch = item.name.match(/(\d+)\s*kwh/i);
    if (kwhMatch) {
      spec.propulsion.batteryCapacityKwh = (spec.propulsion.batteryCapacityKwh || 0) +
        parseInt(kwhMatch[1]) * item.quantity;
    }

    // Safety equipment
    if (nameLower.includes('fire extinguisher')) {
      spec.safety.fireExtinguishers += item.quantity;
    }
    if (nameLower.includes('life jacket') || nameLower.includes('lifejacket')) {
      spec.safety.lifeJackets += item.quantity;
    }
    if (nameLower.includes('lifebuoy')) {
      spec.safety.lifebuoy = true;
    }
    if (nameLower.includes('vhf')) {
      spec.safety.vhfRadio = true;
    }
    if (nameLower.includes('epirb')) {
      spec.safety.epirb = true;
    }
    if (nameLower.includes('flare')) {
      spec.safety.flares = true;
    }
    if (nameLower.includes('first aid')) {
      spec.safety.firstAidKit = true;
    }
    if (nameLower.includes('bilge pump')) {
      spec.safety.bilgePump = true;
    }
    if (nameLower.includes('navigation light')) {
      spec.safety.navigationLights = true;
    }

    // Electrical
    if (nameLower.includes('shore power') || nameLower.includes('shorepower')) {
      spec.electrical.shorepower = true;
    }
    if (nameLower.includes('inverter') || nameLower.includes('charger')) {
      spec.electrical.inverterCharger = true;
    }
    if (nameLower.includes('solar')) {
      const wattMatch = item.name.match(/(\d+)\s*w/i);
      if (wattMatch) {
        spec.electrical.solarCapacityW = (spec.electrical.solarCapacityW || 0) +
          parseInt(wattMatch[1]) * item.quantity;
      }
    }
  }

  return spec;
}

/**
 * Generate default production stages for a new build
 */
export function getDefaultProductionStages(): Omit<ProductionStage, 'id'>[] {
  return [
    { name: 'Order Confirmed', nameNL: 'Order Bevestigd', order: 1, status: 'PENDING' },
    { name: 'Hull Construction', nameNL: 'Cascobouw', order: 2, status: 'PENDING' },
    { name: 'Structural Work', nameNL: 'Constructiewerk', order: 3, status: 'PENDING' },
    { name: 'Propulsion Installation', nameNL: 'Voortstuwing Installatie', order: 4, status: 'PENDING' },
    { name: 'Electrical Systems', nameNL: 'Elektrische Systemen', order: 5, status: 'PENDING' },
    { name: 'Interior Finishing', nameNL: 'Interieur Afwerking', order: 6, status: 'PENDING' },
    { name: 'Deck Equipment', nameNL: 'Dekuitrusting', order: 7, status: 'PENDING' },
    { name: 'Quality Inspection', nameNL: 'Kwaliteitscontrole', order: 8, status: 'PENDING' },
    { name: 'Sea Trial', nameNL: 'Proefvaart', order: 9, status: 'PENDING' },
    { name: 'Final Delivery', nameNL: 'Eindlevering', order: 10, status: 'PENDING' },
  ];
}

/**
 * Generate default delivery checklist
 */
export function getDefaultDeliveryChecklist(): Omit<ChecklistItem, 'id'>[] {
  return [
    // Safety
    { category: 'Safety', description: 'Fire extinguishers installed and inspected', isRequired: true, isCompleted: false, requiresPhoto: true, sortOrder: 1 },
    { category: 'Safety', description: 'Life jackets on board (per max persons)', isRequired: true, isCompleted: false, requiresPhoto: true, sortOrder: 2 },
    { category: 'Safety', description: 'Navigation lights tested', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 3 },
    { category: 'Safety', description: 'Bilge pump operational', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 4 },
    // Documentation
    { category: 'Documentation', description: 'CE Declaration of Conformity prepared', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 10 },
    { category: 'Documentation', description: "Owner's Manual printed", isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 11 },
    { category: 'Documentation', description: 'Technical File complete', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 12 },
    { category: 'Documentation', description: 'Warranty documentation prepared', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 13 },
    // Systems
    { category: 'Systems', description: 'Propulsion system tested', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 20 },
    { category: 'Systems', description: 'Electrical systems tested', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 21 },
    { category: 'Systems', description: 'Steering system tested', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 22 },
    // Quality
    { category: 'Quality', description: 'Final visual inspection completed', isRequired: true, isCompleted: false, requiresPhoto: true, sortOrder: 30 },
    { category: 'Quality', description: 'Sea trial completed successfully', isRequired: true, isCompleted: false, requiresPhoto: true, sortOrder: 31 },
    { category: 'Quality', description: 'Defects/snag list resolved', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 32 },
    // Handover
    { category: 'Handover', description: 'Client walkthrough completed', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 40 },
    { category: 'Handover', description: 'Keys and access devices handed over', isRequired: true, isCompleted: false, requiresPhoto: false, sortOrder: 41 },
    { category: 'Handover', description: 'Cleaning completed', isRequired: true, isCompleted: false, requiresPhoto: true, sortOrder: 42 },
  ];
}

// ============================================
// DEFAULT/SAMPLE DATA
// ============================================

export const DEFAULT_BOAT_MODELS: Omit<BoatModel, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Eagle 25TS',
    range: 'TS',
    lengthM: 7.50,
    beamM: 2.50,
    draftM: 0.45,
    weightKg: 1800,
    maxPersons: 8,
    designCategory: 'C',
    availablePropulsion: ['Electric'],
    defaultPropulsion: 'Electric',
    basePriceExclVat: 89000,
    description: 'HISWA Electric Boat of the Year 2025',
    highlights: ['Award-winning design', 'Premium aluminium construction', 'Extended range battery'],
    imageUrl: 'https://ext.same-assets.com/1354135331/803860996.jpeg',
    isActive: true,
  },
  {
    name: 'Eagle 28TS',
    range: 'TS',
    lengthM: 8.50,
    beamM: 2.80,
    draftM: 0.55,
    weightKg: 2800,
    maxPersons: 10,
    designCategory: 'C',
    availablePropulsion: ['Electric', 'Hybrid'],
    defaultPropulsion: 'Electric',
    basePriceExclVat: 125000,
    description: 'Spacious day cruiser with overnight capability',
    highlights: ['Overnight cabin option', 'Dual battery banks', 'Premium helm station'],
    imageUrl: 'https://ext.same-assets.com/1354135331/624305291.webp',
    isActive: true,
  },
  {
    name: 'Eagle 32TS',
    range: 'TS',
    lengthM: 9.70,
    beamM: 3.20,
    draftM: 0.65,
    weightKg: 4200,
    maxPersons: 12,
    designCategory: 'B',
    availablePropulsion: ['Electric', 'Hybrid'],
    defaultPropulsion: 'Electric',
    basePriceExclVat: 185000,
    description: 'Flagship of the TS series',
    highlights: ['Flagship model', 'Full standing headroom cabin', 'Premium sound system'],
    imageUrl: 'https://ext.same-assets.com/1354135331/3150293400.jpeg',
    isActive: true,
  },
  {
    name: 'Eagle C720',
    range: 'Classic',
    lengthM: 7.20,
    beamM: 2.40,
    draftM: 0.40,
    weightKg: 1400,
    maxPersons: 8,
    designCategory: 'C',
    availablePropulsion: ['Electric'],
    defaultPropulsion: 'Electric',
    basePriceExclVat: 68000,
    description: 'Grand tourer of the Classic series',
    highlights: ['Spacious deck layout', 'Full sunbed option', 'Premium upholstery'],
    imageUrl: 'https://ext.same-assets.com/1354135331/2734770259.jpeg',
    isActive: true,
  },
  {
    name: 'Eagle C999',
    range: 'Classic',
    lengthM: 9.99,
    beamM: 3.00,
    draftM: 0.55,
    weightKg: 3500,
    maxPersons: 12,
    designCategory: 'C',
    availablePropulsion: ['Electric', 'Hybrid'],
    defaultPropulsion: 'Electric',
    basePriceExclVat: 145000,
    description: 'Ultimate classic sloep',
    highlights: ['Flagship classic model', 'Hybrid option available', 'Full cabin possibility'],
    imageUrl: 'https://ext.same-assets.com/1354135331/3910772652.jpeg',
    isActive: true,
  },
];
