/**
 * Compliance Pack Models - v4
 * Project-scoped certification management with chapters and attachments
 * Supports CE, ES-TRIN, Lloyds and other certification types
 *
 * IMPORTANT: All certification packs use the 10 fixed Technical Dossier sections
 * as their chapter structure. These sections are defined in technical-file.ts.
 */

import type { AttachmentType } from './library-v4';
import {
  TECHNICAL_FILE_SECTION_IDS,
  TECHNICAL_FILE_SECTION_TITLES,
  type TechnicalFileSectionId,
} from './technical-file';

// ============================================
// CERTIFICATION TYPES
// ============================================

export type CertificationType = 'CE' | 'ES_TRIN' | 'LLOYDS' | 'OTHER';

export const CERTIFICATION_LABELS: Record<CertificationType, string> = {
  CE: 'CE Marking (RCD)',
  ES_TRIN: 'ES-TRIN',
  LLOYDS: 'Lloyds Classification',
  OTHER: 'Other Certification',
};

export type ComplianceChapterStatus = 'DRAFT' | 'FINAL';

// ============================================
// CHECKLIST ITEM TYPES
// ============================================

export type ChecklistItemType = 'DOC' | 'INSPECTION' | 'CALC' | 'CONFIRM';

export const CHECKLIST_TYPE_LABELS: Record<ChecklistItemType, string> = {
  DOC: 'Documentation',
  INSPECTION: 'Inspection',
  CALC: 'Calculation',
  CONFIRM: 'Confirmation',
};

export type ChecklistItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'NA';

export const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  PASSED: 'Passed',
  FAILED: 'Failed',
  NA: 'N/A',
};

// ============================================
// COMPLIANCE CHECKLIST ITEM
// ============================================

export interface ComplianceChecklistItem {
  id: string;
  chapterId: string;
  sectionId?: string; // Optional - if set, belongs to section; otherwise to chapter
  title: string;
  type: ChecklistItemType;
  status: ChecklistItemStatus;
  mandatory: boolean;
  notes?: string;
  naReason?: string; // Required when status is NA
  attachments: ComplianceAttachment[];
  verifiedBy?: string;
  verifiedAt?: string;
  sortOrder: number;

  // ============================================
  // DOSSIER SUBHEADING REFERENCE (NEW)
  // ============================================

  /**
   * Reference to a Technical Dossier subheading where evidence files live.
   * Links this checklist item to a specific subheading for auto-evidence counting.
   * The subheading is the canonical location for files; this is just a reference.
   */
  dossierSectionId?: TechnicalFileSectionId;

  /**
   * Stable ID of the subheading within the dossier section.
   * Used to link checklist items to specific subheadings.
   * The subheading cannot be deleted if any checklist items reference it.
   */
  dossierSubheadingId?: string;
}

// ============================================
// COMPLIANCE ATTACHMENT
// ============================================

/**
 * Compliance attachment - reuses the same pattern as ArticleAttachment
 * but is scoped to a specific chapter/section within a certification pack
 */
export interface ComplianceAttachment {
  id: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string; // Base64 data URL for localStorage
  url?: string; // External URL (alternative to dataUrl)
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
}

// ============================================
// COMPLIANCE SECTION (SUBCHAPTER)
// ============================================

export interface ComplianceSection {
  id: string;
  chapterId: string;
  sectionNumber: string; // e.g. "2.1", "2.2"
  title: string;
  description?: string;
  status: ComplianceChapterStatus;
  attachments: ComplianceAttachment[];
  checklist: ComplianceChecklistItem[];
  notes?: string;
  sortOrder: number;
  finalizedAt?: string;
  finalizedBy?: string;
}

// ============================================
// COMPLIANCE CHAPTER
// ============================================

export interface ComplianceChapter {
  id: string;
  certificationId: string;
  chapterNumber: string; // Now uses TechnicalFileSectionId (e.g. "general-description")
  title: string;
  description?: string;
  status: ComplianceChapterStatus;
  attachments: ComplianceAttachment[];
  sections: ComplianceSection[];
  checklist: ComplianceChecklistItem[];
  notes?: string;
  sortOrder: number;
  finalizedAt?: string;
  finalizedBy?: string;
}

// ============================================
// CERTIFICATION PACK
// ============================================

export interface ComplianceCertification {
  id: string;
  projectId: string;
  type: CertificationType;
  name: string; // Display name, e.g. "CE Marking (RCD 2013/53/EU)"
  version: number;
  status: ComplianceChapterStatus;
  chapters: ComplianceChapter[];
  notes?: string;
  createdAt: string;
  createdBy: string;
  finalizedAt?: string;
  finalizedBy?: string;
}

// ============================================
// DOSSIER SECTION DESCRIPTIONS
// ============================================

/**
 * Descriptions for each Technical Dossier section.
 * Used when creating certification chapters.
 */
export const DOSSIER_SECTION_DESCRIPTIONS: Record<TechnicalFileSectionId, string> = {
  'general-description': 'Overall description of the watercraft including principal dimensions, intended use, design category, and identification (WIN, builders plate).',
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
// LEGACY CHAPTER MAPPING (for backward compatibility)
// ============================================

/**
 * LEGACY CE CHAPTER STRUCTURE (BEFORE REFACTOR)
 * The original CE scaffold had 15 chapters with numeric IDs.
 * This mapping preserves visibility of legacy data by mapping old chapter numbers
 * to the new 10-section Technical Dossier structure.
 *
 * Original 15 CE Chapters → 10 Dossier Sections:
 *
 * | Legacy # | Legacy Title                           | Maps To Section ID        |
 * |----------|----------------------------------------|---------------------------|
 * | 1        | General Description & Identification   | general-description       |
 * | 2        | Design Drawings & GA Plans             | design-drawings           |
 * | 3        | Hull & Deck Construction               | materials                 |
 * | 4        | Structural Calculations                | calculations              |
 * | 5        | Stability Assessment                   | stability-buoyancy        |
 * | 6        | Buoyancy & Flotation                   | stability-buoyancy        |
 * | 7        | Electrical Systems                     | electrical-systems        |
 * | 8        | Engine & Propulsion                    | fuel-systems              |
 * | 9        | Fuel Systems                           | fuel-systems              |
 * | 10       | Steering & Control Systems             | steering-systems          |
 * | 11       | Fire Protection                        | essential-requirements    |
 * | 12       | Navigation Lights                      | essential-requirements    |
 * | 13       | Discharge Prevention                   | essential-requirements    |
 * | 14       | LPG/Gas Systems                        | essential-requirements    |
 * | 15       | Conformity & Documentation             | conformity-assessment     |
 */
export const LEGACY_CE_CHAPTER_TO_DOSSIER: Record<string, TechnicalFileSectionId> = {
  '1': 'general-description',
  '2': 'design-drawings',
  '3': 'materials',
  '4': 'calculations',
  '5': 'stability-buoyancy',
  '6': 'stability-buoyancy',
  '7': 'electrical-systems',
  '8': 'fuel-systems',
  '9': 'fuel-systems',
  '10': 'steering-systems',
  '11': 'essential-requirements',
  '12': 'essential-requirements',
  '13': 'essential-requirements',
  '14': 'essential-requirements',
  '15': 'conformity-assessment',
};

/**
 * LEGACY ES-TRIN CHAPTER STRUCTURE
 * ES-TRIN had 5 chapters that map to dossier sections.
 */
export const LEGACY_ES_TRIN_CHAPTER_TO_DOSSIER: Record<string, TechnicalFileSectionId> = {
  '1': 'general-description',
  '2': 'calculations',
  '3': 'stability-buoyancy',
  '4': 'essential-requirements',
  '5': 'conformity-assessment',
};

/**
 * LEGACY LLOYDS CHAPTER STRUCTURE
 * Lloyds had 5 chapters that map to dossier sections.
 */
export const LEGACY_LLOYDS_CHAPTER_TO_DOSSIER: Record<string, TechnicalFileSectionId> = {
  '1': 'general-description',
  '2': 'materials',
  '3': 'calculations',
  '4': 'stability-buoyancy',
  '5': 'conformity-assessment',
};

/**
 * Detect if a chapter number is a legacy numeric format
 */
export function isLegacyChapterNumber(chapterNumber: string): boolean {
  // Legacy chapters used numeric strings like "1", "2", ..., "15"
  // New chapters use section IDs like "general-description"
  return /^\d+$/.test(chapterNumber);
}

/**
 * Map a legacy chapter number to the corresponding Technical Dossier section ID.
 * Returns the chapterNumber unchanged if it's already a valid dossier section ID.
 */
export function mapLegacyChapterToDossierSection(
  chapterNumber: string,
  certType: CertificationType
): TechnicalFileSectionId | string {
  // If it's already a valid dossier section ID, return as-is
  if (TECHNICAL_FILE_SECTION_IDS.includes(chapterNumber as TechnicalFileSectionId)) {
    return chapterNumber as TechnicalFileSectionId;
  }

  // If it's a legacy numeric chapter, map it
  if (isLegacyChapterNumber(chapterNumber)) {
    switch (certType) {
      case 'CE':
        return LEGACY_CE_CHAPTER_TO_DOSSIER[chapterNumber] || 'general-description';
      case 'ES_TRIN':
        return LEGACY_ES_TRIN_CHAPTER_TO_DOSSIER[chapterNumber] || 'general-description';
      case 'LLOYDS':
        return LEGACY_LLOYDS_CHAPTER_TO_DOSSIER[chapterNumber] || 'general-description';
      default:
        return 'general-description';
    }
  }

  // Unknown format, return as-is
  return chapterNumber;
}

/**
 * Get display title for a chapter (handles legacy chapters)
 */
export function getChapterDisplayTitle(
  chapter: ComplianceChapter,
  certType: CertificationType
): { displayTitle: string; dossierSectionId: TechnicalFileSectionId | null; isLegacy: boolean } {
  const isLegacy = isLegacyChapterNumber(chapter.chapterNumber);

  if (isLegacy) {
    const dossierSectionId = mapLegacyChapterToDossierSection(chapter.chapterNumber, certType) as TechnicalFileSectionId;
    const dossierTitle = TECHNICAL_FILE_SECTION_TITLES[dossierSectionId] || 'Unknown Section';
    return {
      displayTitle: `${chapter.title} → ${dossierTitle}`,
      dossierSectionId,
      isLegacy: true,
    };
  }

  // New format - chapter number is already the dossier section ID
  const sectionId = chapter.chapterNumber as TechnicalFileSectionId;
  const title = TECHNICAL_FILE_SECTION_TITLES[sectionId] || chapter.title;
  return {
    displayTitle: title,
    dossierSectionId: TECHNICAL_FILE_SECTION_IDS.includes(sectionId) ? sectionId : null,
    isLegacy: false,
  };
}

/**
 * Group legacy chapters by their mapped dossier section for consolidated display.
 * This allows viewing all legacy chapters that map to the same dossier section together.
 */
export function groupLegacyChaptersByDossierSection(
  chapters: ComplianceChapter[],
  certType: CertificationType
): Map<TechnicalFileSectionId, ComplianceChapter[]> {
  const grouped = new Map<TechnicalFileSectionId, ComplianceChapter[]>();

  // Initialize with all dossier sections
  for (const sectionId of TECHNICAL_FILE_SECTION_IDS) {
    grouped.set(sectionId, []);
  }

  for (const chapter of chapters) {
    const mappedSection = mapLegacyChapterToDossierSection(chapter.chapterNumber, certType);
    if (TECHNICAL_FILE_SECTION_IDS.includes(mappedSection as TechnicalFileSectionId)) {
      const existing = grouped.get(mappedSection as TechnicalFileSectionId) || [];
      existing.push(chapter);
      grouped.set(mappedSection as TechnicalFileSectionId, existing);
    }
  }

  return grouped;
}

/**
 * Check if a certification has any legacy chapters
 */
export function hasLegacyChapters(cert: ComplianceCertification): boolean {
  return cert.chapters.some(ch => isLegacyChapterNumber(ch.chapterNumber));
}

/**
 * Get aggregated attachment count for a dossier section across all legacy chapters
 */
export function getDossierSectionAttachmentCount(
  chapters: ComplianceChapter[],
  sectionId: TechnicalFileSectionId,
  certType: CertificationType
): number {
  let count = 0;
  for (const chapter of chapters) {
    const mapped = mapLegacyChapterToDossierSection(chapter.chapterNumber, certType);
    if (mapped === sectionId) {
      count += chapter.attachments.length;
      // Also count section attachments
      for (const section of chapter.sections) {
        count += section.attachments.length;
      }
      // Also count checklist item attachments
      for (const item of chapter.checklist || []) {
        count += item.attachments.length;
      }
    }
  }
  return count;
}

// ============================================
// UNIFIED DOSSIER CHAPTER SCAFFOLD (10 SECTIONS)
// ============================================

/**
 * All certification types use the same 10 Technical Dossier sections.
 * This ensures consistent structure across CE, ES-TRIN, Lloyds, and other certifications.
 */
export const DOSSIER_CHAPTER_SCAFFOLD: Omit<ComplianceChapter, 'id' | 'certificationId' | 'status' | 'attachments' | 'sections' | 'checklist' | 'finalizedAt' | 'finalizedBy'>[] =
  TECHNICAL_FILE_SECTION_IDS.map((sectionId, index) => ({
    chapterNumber: sectionId,
    title: TECHNICAL_FILE_SECTION_TITLES[sectionId],
    description: DOSSIER_SECTION_DESCRIPTIONS[sectionId],
    notes: undefined,
    sortOrder: index + 1,
  }));

// ============================================
// LEGACY SCAFFOLDS (DEPRECATED - kept for migration)
// ============================================

/**
 * @deprecated Use DOSSIER_CHAPTER_SCAFFOLD instead.
 * Kept for backward compatibility with existing data.
 */
export const CE_CHAPTER_SCAFFOLD = DOSSIER_CHAPTER_SCAFFOLD;

/**
 * @deprecated Use DOSSIER_CHAPTER_SCAFFOLD instead.
 */
export const ES_TRIN_CHAPTER_SCAFFOLD = DOSSIER_CHAPTER_SCAFFOLD;

/**
 * @deprecated Use DOSSIER_CHAPTER_SCAFFOLD instead.
 */
export const LLOYDS_CHAPTER_SCAFFOLD = DOSSIER_CHAPTER_SCAFFOLD;

// ============================================
// CE CHECKLIST SCAFFOLD (Mapped to Dossier Sections)
// ============================================

/**
 * CE checklist items mapped by Technical Dossier section ID.
 * Based on RCD 2013/53/EU mandatory requirements, organized under the 10 dossier sections.
 *
 * Each checklist item includes:
 * - dossierSectionId: The section where evidence files should be found
 * - dossierSubheadingId: The specific subheading (stable ID) for evidence files
 *
 * These links enable auto-evidence counting from the Technical Dossier.
 */
export const CE_CHECKLIST_SCAFFOLD: Record<TechnicalFileSectionId, Omit<ComplianceChecklistItem, 'id' | 'chapterId' | 'sectionId' | 'status' | 'attachments' | 'verifiedBy' | 'verifiedAt'>[]> = {
  'general-description': [
    { title: 'Boat identification (WIN, name, model)', type: 'DOC', mandatory: true, sortOrder: 1, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-vessel-id' },
    { title: 'Principal dimensions documented', type: 'DOC', mandatory: true, sortOrder: 2, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-dimensions' },
    { title: 'Design category classification', type: 'DOC', mandatory: true, sortOrder: 3, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-design-cat' },
    { title: 'Intended use description', type: 'DOC', mandatory: true, sortOrder: 4, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-other' },
    { title: 'WIN format verification', type: 'INSPECTION', mandatory: true, sortOrder: 5, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-vessel-id' },
    { title: 'WIN location compliant', type: 'INSPECTION', mandatory: true, sortOrder: 6, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-vessel-id' },
    { title: 'Builders plate data correct', type: 'CONFIRM', mandatory: true, sortOrder: 7, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-builders-plate' },
    { title: 'Builders plate permanently affixed', type: 'INSPECTION', mandatory: true, sortOrder: 8, dossierSectionId: 'general-description', dossierSubheadingId: 'general-description-builders-plate' },
  ],
  'design-drawings': [
    { title: 'General arrangement drawings', type: 'DOC', mandatory: true, sortOrder: 1, dossierSectionId: 'design-drawings', dossierSubheadingId: 'design-drawings-ga' },
    { title: 'Cockpit drainage adequacy', type: 'INSPECTION', mandatory: true, sortOrder: 2, dossierSectionId: 'design-drawings', dossierSubheadingId: 'design-drawings-cockpit' },
    { title: 'Portlight/hatch specifications', type: 'DOC', mandatory: true, sortOrder: 3, dossierSectionId: 'design-drawings', dossierSubheadingId: 'design-drawings-openings' },
    { title: 'Watertight integrity test', type: 'INSPECTION', mandatory: true, sortOrder: 4, dossierSectionId: 'design-drawings', dossierSubheadingId: 'design-drawings-openings' },
    { title: 'Handling test performed', type: 'INSPECTION', mandatory: true, sortOrder: 5, dossierSectionId: 'design-drawings', dossierSubheadingId: 'design-drawings-other' },
    { title: 'Maneuverability assessment', type: 'INSPECTION', mandatory: true, sortOrder: 6, dossierSectionId: 'design-drawings', dossierSubheadingId: 'design-drawings-other' },
    { title: 'Speed trial results', type: 'DOC', mandatory: false, sortOrder: 7, dossierSectionId: 'design-drawings', dossierSubheadingId: 'design-drawings-other' },
  ],
  'calculations': [
    { title: 'Structural calculations', type: 'CALC', mandatory: true, sortOrder: 1, dossierSectionId: 'calculations', dossierSubheadingId: 'calculations-structural' },
    { title: 'Stability calculations completed', type: 'CALC', mandatory: true, sortOrder: 2, dossierSectionId: 'calculations', dossierSubheadingId: 'calculations-stability' },
    { title: 'Load capacity calculation', type: 'CALC', mandatory: true, sortOrder: 3, dossierSectionId: 'calculations', dossierSubheadingId: 'calculations-load' },
    { title: 'Maximum persons calculation', type: 'CALC', mandatory: true, sortOrder: 4, dossierSectionId: 'calculations', dossierSubheadingId: 'calculations-load' },
  ],
  'materials': [
    { title: 'Hull laminate specification', type: 'DOC', mandatory: true, sortOrder: 1, dossierSectionId: 'materials', dossierSubheadingId: 'materials-laminate' },
    { title: 'Material certificates', type: 'DOC', mandatory: true, sortOrder: 2, dossierSectionId: 'materials', dossierSubheadingId: 'materials-certificates' },
    { title: 'Hull integrity inspection', type: 'INSPECTION', mandatory: true, sortOrder: 3, dossierSectionId: 'materials', dossierSubheadingId: 'materials-hull' },
    { title: 'Buoyancy material specification', type: 'DOC', mandatory: true, sortOrder: 4, dossierSectionId: 'materials', dossierSubheadingId: 'materials-buoyancy' },
  ],
  'essential-requirements': [
    { title: 'Fire extinguisher installation', type: 'INSPECTION', mandatory: true, sortOrder: 1, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-fire' },
    { title: 'Fire prevention measures', type: 'CONFIRM', mandatory: true, sortOrder: 2, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-fire' },
    { title: 'Material fire ratings documented', type: 'DOC', mandatory: true, sortOrder: 3, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-fire' },
    { title: 'Navigation lights installed', type: 'INSPECTION', mandatory: true, sortOrder: 4, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-nav-lights' },
    { title: 'Light positions per COLREGS', type: 'CONFIRM', mandatory: true, sortOrder: 5, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-nav-lights' },
    { title: 'Light type certificates', type: 'DOC', mandatory: true, sortOrder: 6, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-nav-lights' },
    { title: 'Holding tank installation', type: 'INSPECTION', mandatory: true, sortOrder: 7, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-discharge' },
    { title: 'Discharge prevention measures', type: 'CONFIRM', mandatory: true, sortOrder: 8, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-discharge' },
    { title: 'Y-valve sealing (if applicable)', type: 'INSPECTION', mandatory: false, sortOrder: 9, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-discharge' },
    { title: 'Gas system drawings (if installed)', type: 'DOC', mandatory: false, sortOrder: 10, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-gas' },
    { title: 'LPG installation inspection', type: 'INSPECTION', mandatory: false, sortOrder: 11, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-gas' },
    { title: 'Gas detection system test', type: 'INSPECTION', mandatory: false, sortOrder: 12, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-gas' },
    { title: 'Ventilation adequacy check', type: 'INSPECTION', mandatory: false, sortOrder: 13, dossierSectionId: 'essential-requirements', dossierSubheadingId: 'essential-requirements-ventilation' },
  ],
  'stability-buoyancy': [
    { title: 'Flotation test performed', type: 'INSPECTION', mandatory: true, sortOrder: 1, dossierSectionId: 'stability-buoyancy', dossierSubheadingId: 'stability-buoyancy-flotation' },
    { title: 'Swamp test (if applicable)', type: 'INSPECTION', mandatory: false, sortOrder: 2, dossierSectionId: 'stability-buoyancy', dossierSubheadingId: 'stability-buoyancy-swamp' },
    { title: 'Builders plate data verified', type: 'CONFIRM', mandatory: true, sortOrder: 3, dossierSectionId: 'stability-buoyancy', dossierSubheadingId: 'stability-buoyancy-other' },
  ],
  'electrical-systems': [
    { title: 'Electrical diagram', type: 'DOC', mandatory: true, sortOrder: 1, dossierSectionId: 'electrical-systems', dossierSubheadingId: 'electrical-systems-diagrams' },
    { title: 'Battery installation check', type: 'INSPECTION', mandatory: true, sortOrder: 2, dossierSectionId: 'electrical-systems', dossierSubheadingId: 'electrical-systems-battery' },
    { title: 'Circuit protection verification', type: 'INSPECTION', mandatory: true, sortOrder: 3, dossierSectionId: 'electrical-systems', dossierSubheadingId: 'electrical-systems-protection' },
    { title: 'Bonding/grounding inspection', type: 'INSPECTION', mandatory: true, sortOrder: 4, dossierSectionId: 'electrical-systems', dossierSubheadingId: 'electrical-systems-bonding' },
    { title: 'Electrical isolation test', type: 'INSPECTION', mandatory: true, sortOrder: 5, dossierSectionId: 'electrical-systems', dossierSubheadingId: 'electrical-systems-tests' },
  ],
  'fuel-systems': [
    { title: 'Engine installation drawings', type: 'DOC', mandatory: true, sortOrder: 1, dossierSectionId: 'fuel-systems', dossierSubheadingId: 'fuel-systems-engine' },
    { title: 'Fuel system compliance', type: 'INSPECTION', mandatory: true, sortOrder: 2, dossierSectionId: 'fuel-systems', dossierSubheadingId: 'fuel-systems-fuel' },
    { title: 'Exhaust system inspection', type: 'INSPECTION', mandatory: true, sortOrder: 3, dossierSectionId: 'fuel-systems', dossierSubheadingId: 'fuel-systems-exhaust' },
    { title: 'Propulsion system test', type: 'INSPECTION', mandatory: true, sortOrder: 4, dossierSectionId: 'fuel-systems', dossierSubheadingId: 'fuel-systems-propulsion' },
    { title: 'Engine CE certificate', type: 'DOC', mandatory: true, sortOrder: 5, dossierSectionId: 'fuel-systems', dossierSubheadingId: 'fuel-systems-certificates' },
  ],
  'steering-systems': [
    { title: 'Steering system drawings', type: 'DOC', mandatory: true, sortOrder: 1, dossierSectionId: 'steering-systems', dossierSubheadingId: 'steering-systems-drawings' },
    { title: 'Steering mechanism inspection', type: 'INSPECTION', mandatory: true, sortOrder: 2, dossierSectionId: 'steering-systems', dossierSubheadingId: 'steering-systems-mechanism' },
    { title: 'Emergency steering provisions', type: 'CONFIRM', mandatory: true, sortOrder: 3, dossierSectionId: 'steering-systems', dossierSubheadingId: 'steering-systems-emergency' },
  ],
  'conformity-assessment': [
    { title: "Owner's manual complete", type: 'DOC', mandatory: true, sortOrder: 1, dossierSectionId: 'conformity-assessment', dossierSubheadingId: 'conformity-assessment-owners-manual' },
    { title: 'Safety instructions included', type: 'DOC', mandatory: true, sortOrder: 2, dossierSectionId: 'conformity-assessment', dossierSubheadingId: 'conformity-assessment-safety' },
    { title: 'Maintenance schedule included', type: 'DOC', mandatory: true, sortOrder: 3, dossierSectionId: 'conformity-assessment', dossierSubheadingId: 'conformity-assessment-maintenance' },
    { title: 'Declaration of Conformity prepared', type: 'DOC', mandatory: true, sortOrder: 4, dossierSectionId: 'conformity-assessment', dossierSubheadingId: 'conformity-assessment-doc' },
    { title: 'Technical dossier complete', type: 'CONFIRM', mandatory: true, sortOrder: 5, dossierSectionId: 'conformity-assessment', dossierSubheadingId: 'conformity-assessment-completion' },
  ],
};

/**
 * Get default checklist items for a dossier section
 */
export function getChapterChecklist(
  certType: CertificationType,
  sectionId: string
): typeof CE_CHECKLIST_SCAFFOLD['general-description'] {
  // CE uses the full checklist scaffold
  if (certType === 'CE') {
    return CE_CHECKLIST_SCAFFOLD[sectionId as TechnicalFileSectionId] || [];
  }
  // Other certification types can have their own scaffolds in the future
  // For now, they use empty checklists (user can add manually)
  return [];
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateCertificationInput {
  type: CertificationType;
  name?: string;
  notes?: string;
}

export interface CreateChapterInput {
  chapterNumber: string;
  title: string;
  description?: string;
  notes?: string;
  sortOrder?: number;
}

export interface CreateSectionInput {
  sectionNumber: string;
  title: string;
  description?: string;
  notes?: string;
  sortOrder?: number;
}

export interface AddComplianceAttachmentInput {
  type: AttachmentType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  url?: string;
  notes?: string;
}

export interface CreateChecklistItemInput {
  title: string;
  type: ChecklistItemType;
  mandatory: boolean;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateChecklistItemInput {
  title?: string;
  type?: ChecklistItemType;
  status?: ChecklistItemStatus;
  mandatory?: boolean;
  notes?: string;
  naReason?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the chapter scaffold for a certification type.
 * All certification types now use the unified 10-section Technical Dossier structure.
 */
export function getChapterScaffold(_type: CertificationType): typeof DOSSIER_CHAPTER_SCAFFOLD {
  // All certification types use the same 10 dossier sections
  return DOSSIER_CHAPTER_SCAFFOLD;
}

/**
 * Check if a certification is fully finalized (all chapters FINAL)
 */
export function isCertificationFullyFinalized(cert: ComplianceCertification): boolean {
  if (cert.status !== 'FINAL') return false;

  for (const chapter of cert.chapters) {
    if (chapter.status !== 'FINAL') return false;
    for (const section of chapter.sections) {
      if (section.status !== 'FINAL') return false;
    }
  }

  return true;
}

/**
 * Get completion stats for a certification
 */
export function getCertificationStats(cert: ComplianceCertification): {
  totalChapters: number;
  finalChapters: number;
  totalSections: number;
  finalSections: number;
  totalAttachments: number;
  totalChecklistItems: number;
  passedChecklistItems: number;
  failedChecklistItems: number;
  naChecklistItems: number;
  mandatoryChecklistItems: number;
  mandatoryPassedItems: number;
  checklistPercentComplete: number;
  percentComplete: number;
} {
  let totalChapters = cert.chapters.length;
  let finalChapters = 0;
  let totalSections = 0;
  let finalSections = 0;
  let totalAttachments = 0;
  let totalChecklistItems = 0;
  let passedChecklistItems = 0;
  let failedChecklistItems = 0;
  let naChecklistItems = 0;
  let mandatoryChecklistItems = 0;
  let mandatoryPassedItems = 0;

  for (const chapter of cert.chapters) {
    if (chapter.status === 'FINAL') finalChapters++;
    totalAttachments += chapter.attachments.length;

    // Count checklist items
    for (const item of chapter.checklist || []) {
      totalChecklistItems++;
      if (item.mandatory) mandatoryChecklistItems++;
      if (item.status === 'PASSED') {
        passedChecklistItems++;
        if (item.mandatory) mandatoryPassedItems++;
      }
      if (item.status === 'FAILED') failedChecklistItems++;
      if (item.status === 'NA') {
        naChecklistItems++;
        if (item.mandatory) mandatoryPassedItems++; // NA counts as "complete" for mandatory items
      }
      totalAttachments += item.attachments.length;
    }

    for (const section of chapter.sections) {
      totalSections++;
      if (section.status === 'FINAL') finalSections++;
      totalAttachments += section.attachments.length;

      // Count section checklist items
      for (const item of section.checklist || []) {
        totalChecklistItems++;
        if (item.mandatory) mandatoryChecklistItems++;
        if (item.status === 'PASSED') {
          passedChecklistItems++;
          if (item.mandatory) mandatoryPassedItems++;
        }
        if (item.status === 'FAILED') failedChecklistItems++;
        if (item.status === 'NA') {
          naChecklistItems++;
          if (item.mandatory) mandatoryPassedItems++;
        }
        totalAttachments += item.attachments.length;
      }
    }
  }

  const totalItems = totalChapters + totalSections;
  const finalItems = finalChapters + finalSections;
  const percentComplete = totalItems > 0 ? Math.round((finalItems / totalItems) * 100) : 0;

  // Checklist completion: (passed + NA) / total applicable items
  const applicableItems = totalChecklistItems - naChecklistItems;
  const checklistPercentComplete = applicableItems > 0
    ? Math.round((passedChecklistItems / applicableItems) * 100)
    : totalChecklistItems > 0 ? 100 : 0;

  return {
    totalChapters,
    finalChapters,
    totalSections,
    finalSections,
    totalAttachments,
    totalChecklistItems,
    passedChecklistItems,
    failedChecklistItems,
    naChecklistItems,
    mandatoryChecklistItems,
    mandatoryPassedItems,
    checklistPercentComplete,
    percentComplete,
  };
}

/**
 * Get checklist stats for a single chapter
 */
export function getChapterChecklistStats(chapter: ComplianceChapter): {
  total: number;
  passed: number;
  failed: number;
  na: number;
  inProgress: number;
  notStarted: number;
  mandatory: number;
  mandatoryComplete: number;
  percentComplete: number;
} {
  const items = chapter.checklist || [];
  let passed = 0;
  let failed = 0;
  let na = 0;
  let inProgress = 0;
  let notStarted = 0;
  let mandatory = 0;
  let mandatoryComplete = 0;

  for (const item of items) {
    if (item.mandatory) mandatory++;
    switch (item.status) {
      case 'PASSED':
        passed++;
        if (item.mandatory) mandatoryComplete++;
        break;
      case 'FAILED':
        failed++;
        break;
      case 'NA':
        na++;
        if (item.mandatory) mandatoryComplete++;
        break;
      case 'IN_PROGRESS':
        inProgress++;
        break;
      case 'NOT_STARTED':
        notStarted++;
        break;
    }
  }

  const total = items.length;
  const applicableItems = total - na;
  const percentComplete = applicableItems > 0
    ? Math.round((passed / applicableItems) * 100)
    : total > 0 ? 100 : 0;

  return {
    total,
    passed,
    failed,
    na,
    inProgress,
    notStarted,
    mandatory,
    mandatoryComplete,
    percentComplete,
  };
}

// ============================================
// VALIDATION WARNINGS
// ============================================

export type ComplianceWarningLevel = 'ERROR' | 'WARNING' | 'INFO';

export interface ComplianceWarning {
  level: ComplianceWarningLevel;
  chapterId?: string;
  chapterNumber?: string;
  itemId?: string;
  itemTitle?: string;
  message: string;
}

export interface ChapterValidationResult {
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string;
  isValid: boolean;
  warnings: ComplianceWarning[];
  failedMandatoryCount: number;
  incompleteMandatoryCount: number;
  totalMandatory: number;
}

export interface CertificationValidationResult {
  certificationId: string;
  isValid: boolean;
  warnings: ComplianceWarning[];
  chapterResults: ChapterValidationResult[];
  totalFailedMandatory: number;
  totalIncompleteMandatory: number;
  totalMandatory: number;
  canFinalize: boolean;
  finalizeSummary: string;
}

/**
 * Validate a chapter's checklist for warnings
 * Returns warnings for:
 * - Mandatory items that are FAILED
 * - Mandatory items that are NOT_STARTED or IN_PROGRESS (incomplete)
 */
export function validateChapterChecklist(chapter: ComplianceChapter): ChapterValidationResult {
  const warnings: ComplianceWarning[] = [];
  let failedMandatoryCount = 0;
  let incompleteMandatoryCount = 0;
  let totalMandatory = 0;

  const checklist = chapter.checklist || [];

  for (const item of checklist) {
    if (item.mandatory) {
      totalMandatory++;

      if (item.status === 'FAILED') {
        failedMandatoryCount++;
        warnings.push({
          level: 'ERROR',
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          itemId: item.id,
          itemTitle: item.title,
          message: `Mandatory item "${item.title}" has FAILED status`,
        });
      } else if (item.status === 'NOT_STARTED' || item.status === 'IN_PROGRESS') {
        incompleteMandatoryCount++;
        warnings.push({
          level: 'WARNING',
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          itemId: item.id,
          itemTitle: item.title,
          message: `Mandatory item "${item.title}" is ${item.status === 'NOT_STARTED' ? 'not started' : 'in progress'}`,
        });
      }
      // PASSED and NA are considered complete - no warning
    }
  }

  const isValid = failedMandatoryCount === 0 && incompleteMandatoryCount === 0;

  return {
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    chapterTitle: chapter.title,
    isValid,
    warnings,
    failedMandatoryCount,
    incompleteMandatoryCount,
    totalMandatory,
  };
}

/**
 * Validate entire certification for warnings
 * Aggregates warnings from all chapters
 */
export function validateCertification(cert: ComplianceCertification): CertificationValidationResult {
  const warnings: ComplianceWarning[] = [];
  const chapterResults: ChapterValidationResult[] = [];
  let totalFailedMandatory = 0;
  let totalIncompleteMandatory = 0;
  let totalMandatory = 0;

  for (const chapter of cert.chapters) {
    const result = validateChapterChecklist(chapter);
    chapterResults.push(result);
    warnings.push(...result.warnings);
    totalFailedMandatory += result.failedMandatoryCount;
    totalIncompleteMandatory += result.incompleteMandatoryCount;
    totalMandatory += result.totalMandatory;
  }

  const isValid = totalFailedMandatory === 0 && totalIncompleteMandatory === 0;

  // Generate finalize summary
  let finalizeSummary = '';
  if (totalFailedMandatory > 0 || totalIncompleteMandatory > 0) {
    const parts: string[] = [];
    if (totalFailedMandatory > 0) {
      parts.push(`${totalFailedMandatory} failed mandatory item${totalFailedMandatory !== 1 ? 's' : ''}`);
    }
    if (totalIncompleteMandatory > 0) {
      parts.push(`${totalIncompleteMandatory} incomplete mandatory item${totalIncompleteMandatory !== 1 ? 's' : ''}`);
    }
    finalizeSummary = `Warning: ${parts.join(' and ')} detected. Finalizing will lock these issues.`;
  } else {
    finalizeSummary = 'All mandatory checklist items are complete. Ready to finalize.';
  }

  return {
    certificationId: cert.id,
    isValid,
    warnings,
    chapterResults,
    totalFailedMandatory,
    totalIncompleteMandatory,
    totalMandatory,
    canFinalize: true, // We allow finalization with warnings (user must confirm)
    finalizeSummary,
  };
}

/**
 * Get a summary of chapter warnings for display
 */
export function getChapterWarningsSummary(chapter: ComplianceChapter): {
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
  summary: string;
} {
  const result = validateChapterChecklist(chapter);

  const hasErrors = result.failedMandatoryCount > 0;
  const hasWarnings = result.incompleteMandatoryCount > 0;
  const errorCount = result.failedMandatoryCount;
  const warningCount = result.incompleteMandatoryCount;

  let summary = '';
  if (hasErrors && hasWarnings) {
    summary = `${errorCount} failed, ${warningCount} incomplete`;
  } else if (hasErrors) {
    summary = `${errorCount} failed mandatory`;
  } else if (hasWarnings) {
    summary = `${warningCount} incomplete mandatory`;
  } else if (result.totalMandatory > 0) {
    summary = 'All mandatory complete';
  }

  return { hasErrors, hasWarnings, errorCount, warningCount, summary };
}

// ============================================
// DOSSIER SUBHEADING REFERENCE HELPERS
// ============================================

/**
 * Get all checklist items from a certification
 */
export function getAllChecklistItems(cert: ComplianceCertification): ComplianceChecklistItem[] {
  const items: ComplianceChecklistItem[] = [];

  for (const chapter of cert.chapters) {
    // Chapter-level checklist items
    if (chapter.checklist) {
      items.push(...chapter.checklist);
    }

    // Section-level checklist items
    for (const section of chapter.sections) {
      if (section.checklist) {
        items.push(...section.checklist);
      }
    }
  }

  return items;
}

/**
 * Get all checklist items across all certifications
 */
export function getAllChecklistItemsAcrossCertifications(
  certifications: ComplianceCertification[]
): ComplianceChecklistItem[] {
  const items: ComplianceChecklistItem[] = [];

  for (const cert of certifications) {
    items.push(...getAllChecklistItems(cert));
  }

  return items;
}

/**
 * Count how many checklist items reference a specific dossier subheading.
 * Used for deletion protection checks.
 */
export function countChecklistRefsToSubheading(
  certifications: ComplianceCertification[],
  subheadingId: string
): number {
  let count = 0;

  for (const cert of certifications) {
    const items = getAllChecklistItems(cert);
    for (const item of items) {
      if (item.dossierSubheadingId === subheadingId) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Get all checklist items that reference a specific dossier subheading.
 * Useful for displaying "Used by: X checklist items" in admin UI.
 */
export function getChecklistItemsReferencingSubheading(
  certifications: ComplianceCertification[],
  subheadingId: string
): Array<{ certification: ComplianceCertification; item: ComplianceChecklistItem }> {
  const results: Array<{ certification: ComplianceCertification; item: ComplianceChecklistItem }> = [];

  for (const cert of certifications) {
    const items = getAllChecklistItems(cert);
    for (const item of items) {
      if (item.dossierSubheadingId === subheadingId) {
        results.push({ certification: cert, item });
      }
    }
  }

  return results;
}

/**
 * Get a map of subheading IDs to their checklist reference counts.
 * Useful for bulk admin display of usage counts.
 */
export function getSubheadingRefCountMap(
  certifications: ComplianceCertification[]
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const cert of certifications) {
    const items = getAllChecklistItems(cert);
    for (const item of items) {
      if (item.dossierSubheadingId) {
        const current = counts.get(item.dossierSubheadingId) || 0;
        counts.set(item.dossierSubheadingId, current + 1);
      }
    }
  }

  return counts;
}

/**
 * Link a checklist item to a dossier subheading
 */
export function linkChecklistItemToSubheading(
  item: ComplianceChecklistItem,
  sectionId: TechnicalFileSectionId,
  subheadingId: string
): void {
  item.dossierSectionId = sectionId;
  item.dossierSubheadingId = subheadingId;
}

/**
 * Unlink a checklist item from its dossier subheading
 */
export function unlinkChecklistItemFromSubheading(
  item: ComplianceChecklistItem
): void {
  item.dossierSectionId = undefined;
  item.dossierSubheadingId = undefined;
}
