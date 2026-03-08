/**
 * Technical File Models - v4
 * Project-scoped Technical File structure with 10 fixed sections
 * Per RCD 2013/53/EU requirements for CE compliance documentation
 *
 * The Technical Dossier is the CANONICAL ARCHIVE for:
 * - Uploaded evidence files (calculations, drawings, test reports, certificates)
 * - Generated artifacts (PDFs of Owner's Manual, DoC, Equipment List, etc.)
 * - References to structured compliance inputs (read-only pointers)
 *
 * The 10 sections are for FILING and AUDIT, not primary data entry.
 *
 * HIERARCHY:
 * Technical File → Sections (10 fixed) → Subheadings (user-manageable) → Items (files)
 *
 * Certification Pack checklist items reference subheadings by stable ID.
 */

// ============================================
// TECHNICAL FILE SECTION IDS
// ============================================

export const TECHNICAL_FILE_SECTION_IDS = [
  'general-description',
  'design-drawings',
  'calculations',
  'materials',
  'essential-requirements',
  'stability-buoyancy',
  'electrical-systems',
  'fuel-systems',
  'steering-systems',
  'conformity-assessment',
] as const;

export type TechnicalFileSectionId = (typeof TECHNICAL_FILE_SECTION_IDS)[number];

// ============================================
// SECTION TITLES (FIXED)
// ============================================

export const TECHNICAL_FILE_SECTION_TITLES: Record<TechnicalFileSectionId, string> = {
  'general-description': 'General Description',
  'design-drawings': 'Design Drawings & Plans',
  'calculations': 'Structural & Engineering Calculations',
  'materials': 'Materials & Components',
  'essential-requirements': 'Essential Requirements Checklist',
  'stability-buoyancy': 'Stability & Buoyancy Assessment',
  'electrical-systems': 'Electrical Systems',
  'fuel-systems': 'Fuel Systems',
  'steering-systems': 'Steering & Control Systems',
  'conformity-assessment': 'Conformity Assessment Documentation',
};

// ============================================
// SECTION DESCRIPTIONS
// ============================================

export const TECHNICAL_FILE_SECTION_DESCRIPTIONS: Record<TechnicalFileSectionId, string> = {
  'general-description': 'Overall description including principal dimensions, intended use, design category, and vessel identification (WIN, builders plate).',
  'design-drawings': 'General arrangement drawings, hull lines, deck layout, cockpit and hull opening specifications.',
  'calculations': 'Structural calculations, stability calculations, maximum load calculations, and buoyancy assessments.',
  'materials': 'Hull construction materials, laminate specifications, material certificates, and component specifications.',
  'essential-requirements': 'Fire protection, navigation lights, discharge prevention, gas systems, and other essential safety requirements.',
  'stability-buoyancy': 'Stability test results, flotation tests, buoyancy material specifications, and swamp tests.',
  'electrical-systems': 'Electrical diagrams, battery installation, circuit protection, bonding/grounding, and isolation tests.',
  'fuel-systems': 'Engine installation, fuel system drawings, exhaust system, propulsion components, and engine CE certificates.',
  'steering-systems': 'Steering system drawings, mechanism inspections, emergency steering provisions, and handling tests.',
  'conformity-assessment': "Owner's manual, Declaration of Conformity, safety instructions, maintenance schedules, and technical file completion.",
};

// ============================================
// RECOMMENDED FILING (for generated outputs)
// ============================================

/**
 * Maps generated document types to their recommended Technical File section.
 * Used for "File to Dossier" actions.
 */
export const OUTPUT_TO_SECTION_MAPPING: Record<string, TechnicalFileSectionId> = {
  'DOC_OWNERS_MANUAL': 'conformity-assessment',
  'DOC_DOC': 'conformity-assessment',
  'DOC_CE_CERT': 'conformity-assessment',
  'DOC_EQUIPMENT_LIST': 'materials',
  'DOC_ANNEX_INDEX': 'conformity-assessment',
  'BOM': 'materials',
};

// ============================================
// ITEM TYPES (Extended for full dossier support)
// ============================================

/**
 * Type 1: Direct reference to a compliance pack attachment
 * Points to an existing attachment in compliancePacks[].chapters[].attachments[]
 */
export interface TechnicalFileAttachmentRef {
  kind: 'attachmentRef';
  attachmentId: string;
  note?: string;
  filedAt?: string;
  filedBy?: string;
}

/**
 * Type 2: Generated artifact (PDF snapshot filed into dossier)
 * Created when user explicitly files a generated document
 */
export interface TechnicalFileGeneratedArtifact {
  kind: 'generatedArtifact';
  id: string;
  sourceType: 'DOC_OWNERS_MANUAL' | 'DOC_DOC' | 'DOC_CE_CERT' | 'DOC_EQUIPMENT_LIST' | 'DOC_ANNEX_INDEX' | 'BOM' | 'OTHER';
  sourceId?: string; // ID of the source document/template version
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string; // Base64 PDF data
  generatedAt: string;
  generatedBy: string;
  filedAt: string;
  filedBy: string;
  note?: string;
}

/**
 * Type 3: Reference to structured compliance input
 * Read-only pointer to structured data (not editable here)
 */
export type ComplianceInputRefType =
  | 'vesselIdentity'
  | 'appliedStandards'
  | 'declarations'
  | 'vesselSystems'
  | 'technicalReferences';

export interface TechnicalFileInputRef {
  kind: 'inputRef';
  inputType: ComplianceInputRefType;
  label: string;
  note?: string;
  filedAt?: string;
  filedBy?: string;
}

// Union of all item types
export type TechnicalFileItem =
  | TechnicalFileAttachmentRef
  | TechnicalFileGeneratedArtifact
  | TechnicalFileInputRef;

// ============================================
// SUBHEADING STRUCTURE (NEW)
// ============================================

/**
 * Subheading within a Technical Dossier section.
 * Subheadings provide organization for files within sections.
 *
 * IMPORTANT: Subheadings have STABLE IDs that:
 * - Are referenced by Certification Pack checklist items
 * - Cannot be deleted if referenced by checklist items
 * - Cannot be deleted if they contain files
 * - Can be archived instead of deleted (hidden from file pickers but preserved)
 */
export interface TechnicalFileSubheading {
  /** Stable ID - referenced by checklist items. Format: `{sectionId}-{slug}` */
  id: string;
  /** Display title (user can rename without affecting references) */
  title: string;
  /** Items filed under this subheading */
  items: TechnicalFileItem[];
  /** Sort order within section */
  sortOrder: number;
  /** When true, hidden from file picker but still visible if contains items */
  archived?: boolean;
  /** Created timestamp */
  createdAt?: string;
  /** Created by user ID */
  createdBy?: string;
}

// ============================================
// DEFAULT SUBHEADINGS PER SECTION
// ============================================

/**
 * Default subheadings for each Technical Dossier section.
 * These provide a starting organizational structure.
 * Users can add, rename, reorder, or archive subheadings.
 */
export const DEFAULT_SUBHEADINGS: Record<TechnicalFileSectionId, { id: string; title: string }[]> = {
  'general-description': [
    { id: 'general-description-vessel-id', title: 'Vessel Identification' },
    { id: 'general-description-dimensions', title: 'Principal Dimensions' },
    { id: 'general-description-design-cat', title: 'Design Category' },
    { id: 'general-description-builders-plate', title: 'Builders Plate' },
    { id: 'general-description-other', title: 'Other Documentation' },
  ],
  'design-drawings': [
    { id: 'design-drawings-ga', title: 'General Arrangement' },
    { id: 'design-drawings-hull-lines', title: 'Hull Lines' },
    { id: 'design-drawings-deck-layout', title: 'Deck Layout' },
    { id: 'design-drawings-cockpit', title: 'Cockpit Specifications' },
    { id: 'design-drawings-openings', title: 'Hull Openings & Hatches' },
    { id: 'design-drawings-other', title: 'Other Drawings' },
  ],
  'calculations': [
    { id: 'calculations-structural', title: 'Structural Calculations' },
    { id: 'calculations-stability', title: 'Stability Calculations' },
    { id: 'calculations-load', title: 'Load Capacity' },
    { id: 'calculations-buoyancy', title: 'Buoyancy Assessment' },
    { id: 'calculations-other', title: 'Other Calculations' },
  ],
  'materials': [
    { id: 'materials-hull', title: 'Hull Materials' },
    { id: 'materials-laminate', title: 'Laminate Specifications' },
    { id: 'materials-certificates', title: 'Material Certificates' },
    { id: 'materials-components', title: 'Component Specifications' },
    { id: 'materials-buoyancy', title: 'Buoyancy Materials' },
    { id: 'materials-other', title: 'Other Materials' },
  ],
  'essential-requirements': [
    { id: 'essential-requirements-fire', title: 'Fire Protection' },
    { id: 'essential-requirements-nav-lights', title: 'Navigation Lights' },
    { id: 'essential-requirements-discharge', title: 'Discharge Prevention' },
    { id: 'essential-requirements-gas', title: 'Gas/LPG Systems' },
    { id: 'essential-requirements-ventilation', title: 'Ventilation' },
    { id: 'essential-requirements-other', title: 'Other Requirements' },
  ],
  'stability-buoyancy': [
    { id: 'stability-buoyancy-tests', title: 'Stability Tests' },
    { id: 'stability-buoyancy-flotation', title: 'Flotation Tests' },
    { id: 'stability-buoyancy-swamp', title: 'Swamp Tests' },
    { id: 'stability-buoyancy-other', title: 'Other Assessments' },
  ],
  'electrical-systems': [
    { id: 'electrical-systems-diagrams', title: 'Electrical Diagrams' },
    { id: 'electrical-systems-battery', title: 'Battery Installation' },
    { id: 'electrical-systems-protection', title: 'Circuit Protection' },
    { id: 'electrical-systems-bonding', title: 'Bonding & Grounding' },
    { id: 'electrical-systems-tests', title: 'Isolation Tests' },
    { id: 'electrical-systems-other', title: 'Other Electrical' },
  ],
  'fuel-systems': [
    { id: 'fuel-systems-engine', title: 'Engine Installation' },
    { id: 'fuel-systems-fuel', title: 'Fuel System' },
    { id: 'fuel-systems-exhaust', title: 'Exhaust System' },
    { id: 'fuel-systems-propulsion', title: 'Propulsion Components' },
    { id: 'fuel-systems-certificates', title: 'Engine Certificates' },
    { id: 'fuel-systems-other', title: 'Other Fuel Systems' },
  ],
  'steering-systems': [
    { id: 'steering-systems-drawings', title: 'Steering Drawings' },
    { id: 'steering-systems-mechanism', title: 'Steering Mechanism' },
    { id: 'steering-systems-emergency', title: 'Emergency Steering' },
    { id: 'steering-systems-tests', title: 'Handling Tests' },
    { id: 'steering-systems-other', title: 'Other Controls' },
  ],
  'conformity-assessment': [
    { id: 'conformity-assessment-owners-manual', title: "Owner's Manual" },
    { id: 'conformity-assessment-doc', title: 'Declaration of Conformity' },
    { id: 'conformity-assessment-safety', title: 'Safety Instructions' },
    { id: 'conformity-assessment-maintenance', title: 'Maintenance Schedule' },
    { id: 'conformity-assessment-completion', title: 'Technical File Completion' },
    { id: 'conformity-assessment-other', title: 'Other Documentation' },
  ],
};

// ============================================
// SECTION STRUCTURE
// ============================================

export interface TechnicalFileSection {
  id: TechnicalFileSectionId;
  title: string;
  /** @deprecated Use subheadings instead. Kept for backward compatibility. */
  items: TechnicalFileItem[];
  /** Subheadings within this section (new structure) */
  subheadings: TechnicalFileSubheading[];
}

// ============================================
// TECHNICAL FILE ROOT
// ============================================

export interface TechnicalFile {
  sections: TechnicalFileSection[];
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create default subheadings for a section
 */
export function createDefaultSubheadings(sectionId: TechnicalFileSectionId): TechnicalFileSubheading[] {
  const defaults = DEFAULT_SUBHEADINGS[sectionId] || [];
  return defaults.map((def, index) => ({
    id: def.id,
    title: def.title,
    items: [],
    sortOrder: index + 1,
    archived: false,
    createdAt: new Date().toISOString(),
  }));
}

/**
 * Create an empty Technical File with all 10 sections initialized
 */
export function createEmptyTechnicalFile(): TechnicalFile {
  return {
    sections: TECHNICAL_FILE_SECTION_IDS.map((id) => ({
      id,
      title: TECHNICAL_FILE_SECTION_TITLES[id],
      items: [], // Legacy - kept empty
      subheadings: createDefaultSubheadings(id),
    })),
  };
}

/**
 * Ensure a project's technicalFile has all 10 sections with subheadings.
 * Used for backward compatibility when loading projects without technicalFile.
 * Returns a valid TechnicalFile (creates empty if missing, fills missing sections if partial).
 * Migrates legacy items[] to subheadings if needed.
 */
export function ensureTechnicalFile(technicalFile?: TechnicalFile): TechnicalFile {
  if (!technicalFile) {
    return createEmptyTechnicalFile();
  }

  // Ensure all 10 sections exist (in case of partial import)
  const existingSectionIds = new Set(technicalFile.sections.map((s) => s.id));
  const sections = [...technicalFile.sections];

  for (const id of TECHNICAL_FILE_SECTION_IDS) {
    if (!existingSectionIds.has(id)) {
      sections.push({
        id,
        title: TECHNICAL_FILE_SECTION_TITLES[id],
        items: [],
        subheadings: createDefaultSubheadings(id),
      });
    }
  }

  // Migrate legacy sections without subheadings
  for (const section of sections) {
    if (!section.subheadings || section.subheadings.length === 0) {
      section.subheadings = createDefaultSubheadings(section.id);

      // Migrate legacy items to first "Other" subheading if any exist
      if (section.items && section.items.length > 0) {
        const otherSubheading = section.subheadings.find(sh => sh.id.endsWith('-other'));
        if (otherSubheading) {
          otherSubheading.items = [...section.items];
        }
      }
    }
  }

  // Sort sections by the fixed order
  sections.sort((a, b) => {
    const indexA = TECHNICAL_FILE_SECTION_IDS.indexOf(a.id);
    const indexB = TECHNICAL_FILE_SECTION_IDS.indexOf(b.id);
    return indexA - indexB;
  });

  return { sections };
}

// ============================================
// SUBHEADING MANAGEMENT HELPERS
// ============================================

/**
 * Generate a new stable subheading ID
 */
export function generateSubheadingId(sectionId: TechnicalFileSectionId, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  const timestamp = Date.now().toString(36);
  return `${sectionId}-${slug}-${timestamp}`;
}

/**
 * Add a new subheading to a section
 */
export function addSubheading(
  section: TechnicalFileSection,
  title: string,
  createdBy?: string
): TechnicalFileSubheading {
  const maxSortOrder = Math.max(0, ...section.subheadings.map(sh => sh.sortOrder));
  const newSubheading: TechnicalFileSubheading = {
    id: generateSubheadingId(section.id, title),
    title,
    items: [],
    sortOrder: maxSortOrder + 1,
    archived: false,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  section.subheadings.push(newSubheading);
  return newSubheading;
}

/**
 * Rename a subheading (does not change ID, preserving references)
 */
export function renameSubheading(
  section: TechnicalFileSection,
  subheadingId: string,
  newTitle: string
): boolean {
  const subheading = section.subheadings.find(sh => sh.id === subheadingId);
  if (!subheading) return false;
  subheading.title = newTitle;
  return true;
}

/**
 * Reorder subheadings within a section
 */
export function reorderSubheadings(
  section: TechnicalFileSection,
  orderedIds: string[]
): void {
  const subheadingMap = new Map(section.subheadings.map(sh => [sh.id, sh]));
  orderedIds.forEach((id, index) => {
    const sh = subheadingMap.get(id);
    if (sh) sh.sortOrder = index + 1;
  });
  section.subheadings.sort((a, b) => a.sortOrder - b.sortOrder);
}

// ============================================
// DELETION PROTECTION TYPES
// ============================================

/**
 * Result of checking if a subheading can be deleted
 */
export interface SubheadingDeletionCheck {
  /** Whether deletion is allowed */
  canDelete: boolean;
  /** Reason deletion is blocked */
  blockReason?: 'HAS_CHECKLIST_REFS' | 'HAS_ITEMS';
  /** Number of checklist items referencing this subheading */
  checklistRefCount: number;
  /** Number of items (files) in this subheading */
  itemCount: number;
  /** User-friendly message explaining the block */
  message?: string;
}

/**
 * Check if a subheading can be deleted.
 * Requires external data about checklist references.
 *
 * @param subheading The subheading to check
 * @param checklistRefCount Number of checklist items referencing this subheading
 */
export function checkSubheadingDeletion(
  subheading: TechnicalFileSubheading,
  checklistRefCount: number
): SubheadingDeletionCheck {
  const itemCount = subheading.items.length;

  // Rule 1: Block if referenced by checklist items
  if (checklistRefCount > 0) {
    return {
      canDelete: false,
      blockReason: 'HAS_CHECKLIST_REFS',
      checklistRefCount,
      itemCount,
      message: `Cannot delete: referenced by ${checklistRefCount} checklist item${checklistRefCount === 1 ? '' : 's'}`,
    };
  }

  // Rule 2: Block if contains items
  if (itemCount > 0) {
    return {
      canDelete: false,
      blockReason: 'HAS_ITEMS',
      checklistRefCount,
      itemCount,
      message: `Cannot delete: contains ${itemCount} file${itemCount === 1 ? '' : 's'}`,
    };
  }

  // Rule 3: Allow deletion
  return {
    canDelete: true,
    checklistRefCount: 0,
    itemCount: 0,
  };
}

/**
 * Archive a subheading (soft delete).
 * Archived subheadings are hidden from file pickers but:
 * - Still visible if they contain items
 * - Links from checklist items remain valid
 */
export function archiveSubheading(
  section: TechnicalFileSection,
  subheadingId: string
): boolean {
  const subheading = section.subheadings.find(sh => sh.id === subheadingId);
  if (!subheading) return false;
  subheading.archived = true;
  return true;
}

/**
 * Unarchive a subheading
 */
export function unarchiveSubheading(
  section: TechnicalFileSection,
  subheadingId: string
): boolean {
  const subheading = section.subheadings.find(sh => sh.id === subheadingId);
  if (!subheading) return false;
  subheading.archived = false;
  return true;
}

/**
 * Permanently delete a subheading (only if deletion check passes)
 */
export function deleteSubheading(
  section: TechnicalFileSection,
  subheadingId: string,
  checklistRefCount: number
): { success: boolean; check: SubheadingDeletionCheck } {
  const subheading = section.subheadings.find(sh => sh.id === subheadingId);
  if (!subheading) {
    return {
      success: false,
      check: {
        canDelete: false,
        checklistRefCount: 0,
        itemCount: 0,
        message: 'Subheading not found',
      },
    };
  }

  const check = checkSubheadingDeletion(subheading, checklistRefCount);
  if (!check.canDelete) {
    return { success: false, check };
  }

  // Safe to delete
  const index = section.subheadings.findIndex(sh => sh.id === subheadingId);
  if (index >= 0) {
    section.subheadings.splice(index, 1);
  }
  return { success: true, check };
}

/**
 * Get subheadings for file picker (excludes archived unless they have items)
 */
export function getVisibleSubheadings(section: TechnicalFileSection): TechnicalFileSubheading[] {
  return section.subheadings.filter(sh => !sh.archived || sh.items.length > 0);
}

/**
 * Get subheadings for admin management (includes all, with archive status)
 */
export function getAllSubheadings(section: TechnicalFileSection): TechnicalFileSubheading[] {
  return [...section.subheadings].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ============================================
// HELPER FUNCTIONS (SECTION LEVEL)
// ============================================

/**
 * Get the count of items in a section by kind (includes all subheadings)
 */
export function getSectionItemCounts(section: TechnicalFileSection): {
  total: number;
  attachmentRefs: number;
  generatedArtifacts: number;
  inputRefs: number;
} {
  let attachmentRefs = 0;
  let generatedArtifacts = 0;
  let inputRefs = 0;

  // Count items from all subheadings
  for (const subheading of section.subheadings) {
    for (const item of subheading.items) {
      switch (item.kind) {
        case 'attachmentRef':
          attachmentRefs++;
          break;
        case 'generatedArtifact':
          generatedArtifacts++;
          break;
        case 'inputRef':
          inputRefs++;
          break;
      }
    }
  }

  // Also count legacy items (backward compatibility)
  for (const item of section.items) {
    switch (item.kind) {
      case 'attachmentRef':
        attachmentRefs++;
        break;
      case 'generatedArtifact':
        generatedArtifacts++;
        break;
      case 'inputRef':
        inputRefs++;
        break;
    }
  }

  const total = attachmentRefs + generatedArtifacts + inputRefs;

  return {
    total,
    attachmentRefs,
    generatedArtifacts,
    inputRefs,
  };
}

/**
 * Get counts for a specific subheading
 */
export function getSubheadingItemCounts(subheading: TechnicalFileSubheading): {
  total: number;
  attachmentRefs: number;
  generatedArtifacts: number;
  inputRefs: number;
} {
  let attachmentRefs = 0;
  let generatedArtifacts = 0;
  let inputRefs = 0;

  for (const item of subheading.items) {
    switch (item.kind) {
      case 'attachmentRef':
        attachmentRefs++;
        break;
      case 'generatedArtifact':
        generatedArtifacts++;
        break;
      case 'inputRef':
        inputRefs++;
        break;
    }
  }

  return {
    total: subheading.items.length,
    attachmentRefs,
    generatedArtifacts,
    inputRefs,
  };
}

/**
 * Get total item counts across all sections
 */
export function getTechnicalFileCounts(technicalFile: TechnicalFile): {
  totalItems: number;
  totalAttachmentRefs: number;
  totalGeneratedArtifacts: number;
  totalInputRefs: number;
  populatedSections: number;
  totalSubheadings: number;
  archivedSubheadings: number;
} {
  let totalItems = 0;
  let totalAttachmentRefs = 0;
  let totalGeneratedArtifacts = 0;
  let totalInputRefs = 0;
  let populatedSections = 0;
  let totalSubheadings = 0;
  let archivedSubheadings = 0;

  for (const section of technicalFile.sections) {
    const counts = getSectionItemCounts(section);
    totalItems += counts.total;
    totalAttachmentRefs += counts.attachmentRefs;
    totalGeneratedArtifacts += counts.generatedArtifacts;
    totalInputRefs += counts.inputRefs;
    if (counts.total > 0) populatedSections++;

    totalSubheadings += section.subheadings.length;
    archivedSubheadings += section.subheadings.filter(sh => sh.archived).length;
  }

  return {
    totalItems,
    totalAttachmentRefs,
    totalGeneratedArtifacts,
    totalInputRefs,
    populatedSections,
    totalSubheadings,
    archivedSubheadings,
  };
}

/**
 * Find a section by ID
 */
export function findSection(
  technicalFile: TechnicalFile,
  sectionId: TechnicalFileSectionId
): TechnicalFileSection | undefined {
  return technicalFile.sections.find((s) => s.id === sectionId);
}

/**
 * Find a subheading by ID across all sections
 */
export function findSubheading(
  technicalFile: TechnicalFile,
  subheadingId: string
): { section: TechnicalFileSection; subheading: TechnicalFileSubheading } | undefined {
  for (const section of technicalFile.sections) {
    const subheading = section.subheadings.find(sh => sh.id === subheadingId);
    if (subheading) {
      return { section, subheading };
    }
  }
  return undefined;
}

/**
 * Get all subheading IDs in the technical file
 */
export function getAllSubheadingIds(technicalFile: TechnicalFile): string[] {
  const ids: string[] = [];
  for (const section of technicalFile.sections) {
    for (const subheading of section.subheadings) {
      ids.push(subheading.id);
    }
  }
  return ids;
}
