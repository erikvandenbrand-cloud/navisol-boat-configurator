/**
 * Compliance Pack Models - v4
 * Project-scoped certification management with chapters and attachments
 * Supports CE, ES-TRIN, Lloyds and other certification types
 */

import type { AttachmentType } from './library-v4';

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
  chapterNumber: string; // e.g. "1", "2", "A", "B"
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
// CE SCAFFOLD (15 CHAPTERS)
// ============================================

/**
 * CE Technical File structure per RCD 2013/53/EU
 * 15 chapters covering all essential requirements
 */
export const CE_CHAPTER_SCAFFOLD: Omit<ComplianceChapter, 'id' | 'certificationId' | 'status' | 'attachments' | 'sections' | 'checklist' | 'finalizedAt' | 'finalizedBy'>[] = [
  {
    chapterNumber: '1',
    title: 'General Description',
    description: 'Overall description of the watercraft including principal dimensions, intended use, and design category.',
    notes: undefined,
    sortOrder: 1,
  },
  {
    chapterNumber: '2',
    title: 'Stability and Buoyancy',
    description: 'Stability calculations, buoyancy requirements, and flotation tests.',
    notes: undefined,
    sortOrder: 2,
  },
  {
    chapterNumber: '3',
    title: 'Structural Requirements',
    description: 'Hull and deck construction, structural calculations, and material specifications.',
    notes: undefined,
    sortOrder: 3,
  },
  {
    chapterNumber: '4',
    title: 'Handling Characteristics',
    description: 'Manoeuvrability, steering, and handling under various conditions.',
    notes: undefined,
    sortOrder: 4,
  },
  {
    chapterNumber: '5',
    title: 'Cockpit and Hull Openings',
    description: 'Cockpit drainage, hatch and portlight requirements, watertight integrity.',
    notes: undefined,
    sortOrder: 5,
  },
  {
    chapterNumber: '6',
    title: 'Maximum Load',
    description: 'Maximum load calculations, load capacity plate requirements.',
    notes: undefined,
    sortOrder: 6,
  },
  {
    chapterNumber: '7',
    title: 'Propulsion Installation',
    description: 'Engine installation, fuel system, exhaust system, and propulsion components.',
    notes: undefined,
    sortOrder: 7,
  },
  {
    chapterNumber: '8',
    title: 'Electrical System',
    description: 'Electrical installation, battery systems, protection devices, and wiring.',
    notes: undefined,
    sortOrder: 8,
  },
  {
    chapterNumber: '9',
    title: 'Steering System',
    description: 'Steering mechanism, emergency steering provisions.',
    notes: undefined,
    sortOrder: 9,
  },
  {
    chapterNumber: '10',
    title: 'Gas System',
    description: 'LPG installation, gas detection, ventilation requirements (if applicable).',
    notes: undefined,
    sortOrder: 10,
  },
  {
    chapterNumber: '11',
    title: 'Fire Protection',
    description: 'Fire-fighting equipment, fire prevention measures, material fire ratings.',
    notes: undefined,
    sortOrder: 11,
  },
  {
    chapterNumber: '12',
    title: 'Navigation Lights',
    description: 'Navigation light installation and compliance with COLREGS.',
    notes: undefined,
    sortOrder: 12,
  },
  {
    chapterNumber: '13',
    title: 'Discharge Prevention',
    description: 'Waste water systems, holding tanks, discharge prevention measures.',
    notes: undefined,
    sortOrder: 13,
  },
  {
    chapterNumber: '14',
    title: 'Builders Plate and HIN',
    description: 'Hull Identification Number (HIN), builders plate specifications.',
    notes: undefined,
    sortOrder: 14,
  },
  {
    chapterNumber: '15',
    title: "Owner's Manual and DoC",
    description: "Owner's manual requirements and Declaration of Conformity.",
    notes: undefined,
    sortOrder: 15,
  },
];

// ============================================
// ES-TRIN SCAFFOLD (SIMPLIFIED)
// ============================================

export const ES_TRIN_CHAPTER_SCAFFOLD: Omit<ComplianceChapter, 'id' | 'certificationId' | 'status' | 'attachments' | 'sections' | 'checklist' | 'finalizedAt' | 'finalizedBy'>[] = [
  {
    chapterNumber: '1',
    title: 'Shipbuilding',
    description: 'Hull construction, stability, freeboard requirements.',
    notes: undefined,
    sortOrder: 1,
  },
  {
    chapterNumber: '2',
    title: 'Machinery',
    description: 'Engine room, propulsion, auxiliary machinery.',
    notes: undefined,
    sortOrder: 2,
  },
  {
    chapterNumber: '3',
    title: 'Electrical Installations',
    description: 'Electrical systems, power supply, emergency power.',
    notes: undefined,
    sortOrder: 3,
  },
  {
    chapterNumber: '4',
    title: 'Safety Equipment',
    description: 'Life-saving appliances, fire protection, signaling.',
    notes: undefined,
    sortOrder: 4,
  },
  {
    chapterNumber: '5',
    title: 'Accommodation',
    description: 'Living quarters, sanitary facilities, ventilation.',
    notes: undefined,
    sortOrder: 5,
  },
];

// ============================================
// LLOYDS SCAFFOLD (SIMPLIFIED)
// ============================================

export const LLOYDS_CHAPTER_SCAFFOLD: Omit<ComplianceChapter, 'id' | 'certificationId' | 'status' | 'attachments' | 'sections' | 'checklist' | 'finalizedAt' | 'finalizedBy'>[] = [
  {
    chapterNumber: '1',
    title: 'Classification and Survey',
    description: 'Classification requirements, survey schedule.',
    notes: undefined,
    sortOrder: 1,
  },
  {
    chapterNumber: '2',
    title: 'Hull Structure',
    description: 'Hull construction materials, scantlings, structural integrity.',
    notes: undefined,
    sortOrder: 2,
  },
  {
    chapterNumber: '3',
    title: 'Machinery and Systems',
    description: 'Main and auxiliary machinery, systems installation.',
    notes: undefined,
    sortOrder: 3,
  },
  {
    chapterNumber: '4',
    title: 'Electrical Systems',
    description: 'Electrical installations, emergency power.',
    notes: undefined,
    sortOrder: 4,
  },
  {
    chapterNumber: '5',
    title: 'Fire and Safety',
    description: 'Fire protection, life-saving appliances.',
    notes: undefined,
    sortOrder: 5,
  },
];

// ============================================
// CE CHECKLIST SCAFFOLD (Default Items per Chapter)
// ============================================

/**
 * Default CE checklist items mapped by chapter number
 * Based on RCD 2013/53/EU mandatory requirements
 */
export const CE_CHECKLIST_SCAFFOLD: Record<string, Omit<ComplianceChecklistItem, 'id' | 'chapterId' | 'sectionId' | 'status' | 'attachments' | 'verifiedBy' | 'verifiedAt'>[]> = {
  '1': [
    // General Description
    { title: 'Boat identification (HIN, name, model)', type: 'DOC', mandatory: true, sortOrder: 1 },
    { title: 'Principal dimensions documented', type: 'DOC', mandatory: true, sortOrder: 2 },
    { title: 'Design category classification', type: 'DOC', mandatory: true, sortOrder: 3 },
    { title: 'Intended use description', type: 'DOC', mandatory: true, sortOrder: 4 },
    { title: 'General arrangement drawings', type: 'DOC', mandatory: true, sortOrder: 5 },
  ],
  '2': [
    // Stability and Buoyancy
    { title: 'Stability calculations completed', type: 'CALC', mandatory: true, sortOrder: 1 },
    { title: 'Flotation test performed', type: 'INSPECTION', mandatory: true, sortOrder: 2 },
    { title: 'Buoyancy material specification', type: 'DOC', mandatory: true, sortOrder: 3 },
    { title: 'Swamp test (if applicable)', type: 'INSPECTION', mandatory: false, sortOrder: 4 },
  ],
  '3': [
    // Structural Requirements
    { title: 'Hull laminate specification', type: 'DOC', mandatory: true, sortOrder: 1 },
    { title: 'Structural calculations', type: 'CALC', mandatory: true, sortOrder: 2 },
    { title: 'Material certificates', type: 'DOC', mandatory: true, sortOrder: 3 },
    { title: 'Hull integrity inspection', type: 'INSPECTION', mandatory: true, sortOrder: 4 },
  ],
  '4': [
    // Handling Characteristics
    { title: 'Handling test performed', type: 'INSPECTION', mandatory: true, sortOrder: 1 },
    { title: 'Maneuverability assessment', type: 'INSPECTION', mandatory: true, sortOrder: 2 },
    { title: 'Speed trial results', type: 'DOC', mandatory: false, sortOrder: 3 },
  ],
  '5': [
    // Cockpit and Hull Openings
    { title: 'Cockpit drainage adequacy', type: 'INSPECTION', mandatory: true, sortOrder: 1 },
    { title: 'Portlight/hatch specifications', type: 'DOC', mandatory: true, sortOrder: 2 },
    { title: 'Watertight integrity test', type: 'INSPECTION', mandatory: true, sortOrder: 3 },
  ],
  '6': [
    // Maximum Load
    { title: 'Load capacity calculation', type: 'CALC', mandatory: true, sortOrder: 1 },
    { title: 'Maximum persons calculation', type: 'CALC', mandatory: true, sortOrder: 2 },
    { title: 'Builders plate data verified', type: 'CONFIRM', mandatory: true, sortOrder: 3 },
  ],
  '7': [
    // Propulsion Installation
    { title: 'Engine installation drawings', type: 'DOC', mandatory: true, sortOrder: 1 },
    { title: 'Fuel system compliance', type: 'INSPECTION', mandatory: true, sortOrder: 2 },
    { title: 'Exhaust system inspection', type: 'INSPECTION', mandatory: true, sortOrder: 3 },
    { title: 'Propulsion system test', type: 'INSPECTION', mandatory: true, sortOrder: 4 },
    { title: 'Engine CE certificate', type: 'DOC', mandatory: true, sortOrder: 5 },
  ],
  '8': [
    // Electrical System
    { title: 'Electrical diagram', type: 'DOC', mandatory: true, sortOrder: 1 },
    { title: 'Battery installation check', type: 'INSPECTION', mandatory: true, sortOrder: 2 },
    { title: 'Circuit protection verification', type: 'INSPECTION', mandatory: true, sortOrder: 3 },
    { title: 'Bonding/grounding inspection', type: 'INSPECTION', mandatory: true, sortOrder: 4 },
    { title: 'Electrical isolation test', type: 'INSPECTION', mandatory: true, sortOrder: 5 },
  ],
  '9': [
    // Steering System
    { title: 'Steering system drawings', type: 'DOC', mandatory: true, sortOrder: 1 },
    { title: 'Steering mechanism inspection', type: 'INSPECTION', mandatory: true, sortOrder: 2 },
    { title: 'Emergency steering provisions', type: 'CONFIRM', mandatory: true, sortOrder: 3 },
  ],
  '10': [
    // Gas System
    { title: 'Gas system drawings (if installed)', type: 'DOC', mandatory: false, sortOrder: 1 },
    { title: 'LPG installation inspection', type: 'INSPECTION', mandatory: false, sortOrder: 2 },
    { title: 'Gas detection system test', type: 'INSPECTION', mandatory: false, sortOrder: 3 },
    { title: 'Ventilation adequacy check', type: 'INSPECTION', mandatory: false, sortOrder: 4 },
  ],
  '11': [
    // Fire Protection
    { title: 'Fire extinguisher installation', type: 'INSPECTION', mandatory: true, sortOrder: 1 },
    { title: 'Fire prevention measures', type: 'CONFIRM', mandatory: true, sortOrder: 2 },
    { title: 'Material fire ratings documented', type: 'DOC', mandatory: true, sortOrder: 3 },
  ],
  '12': [
    // Navigation Lights
    { title: 'Navigation lights installed', type: 'INSPECTION', mandatory: true, sortOrder: 1 },
    { title: 'Light positions per COLREGS', type: 'CONFIRM', mandatory: true, sortOrder: 2 },
    { title: 'Light type certificates', type: 'DOC', mandatory: true, sortOrder: 3 },
  ],
  '13': [
    // Discharge Prevention
    { title: 'Holding tank installation', type: 'INSPECTION', mandatory: true, sortOrder: 1 },
    { title: 'Discharge prevention measures', type: 'CONFIRM', mandatory: true, sortOrder: 2 },
    { title: 'Y-valve sealing (if applicable)', type: 'INSPECTION', mandatory: false, sortOrder: 3 },
  ],
  '14': [
    // Builders Plate and HIN
    { title: 'HIN format verification', type: 'INSPECTION', mandatory: true, sortOrder: 1 },
    { title: 'HIN location compliant', type: 'INSPECTION', mandatory: true, sortOrder: 2 },
    { title: 'Builders plate data correct', type: 'CONFIRM', mandatory: true, sortOrder: 3 },
    { title: 'Builders plate permanently affixed', type: 'INSPECTION', mandatory: true, sortOrder: 4 },
  ],
  '15': [
    // Owner's Manual and DoC
    { title: "Owner's manual complete", type: 'DOC', mandatory: true, sortOrder: 1 },
    { title: 'Safety instructions included', type: 'DOC', mandatory: true, sortOrder: 2 },
    { title: 'Maintenance schedule included', type: 'DOC', mandatory: true, sortOrder: 3 },
    { title: 'Declaration of Conformity prepared', type: 'DOC', mandatory: true, sortOrder: 4 },
    { title: 'Technical file complete', type: 'CONFIRM', mandatory: true, sortOrder: 5 },
  ],
};

/**
 * Get default checklist items for a chapter
 */
export function getChapterChecklist(certType: CertificationType, chapterNumber: string): typeof CE_CHECKLIST_SCAFFOLD['1'] {
  if (certType === 'CE') {
    return CE_CHECKLIST_SCAFFOLD[chapterNumber] || [];
  }
  // Other certification types can have their own scaffolds
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
 * Get the chapter scaffold for a certification type
 */
export function getChapterScaffold(type: CertificationType): typeof CE_CHAPTER_SCAFFOLD {
  switch (type) {
    case 'CE':
      return CE_CHAPTER_SCAFFOLD;
    case 'ES_TRIN':
      return ES_TRIN_CHAPTER_SCAFFOLD;
    case 'LLOYDS':
      return LLOYDS_CHAPTER_SCAFFOLD;
    case 'OTHER':
      return [];
  }
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
