/**
 * Technical File Models - v4
 * Project-scoped Technical File structure with 10 fixed sections
 * Per RCD 2013/53/EU requirements for CE compliance documentation
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
// ITEM TYPES
// ============================================

export interface TechnicalFileAttachmentRef {
  kind: 'attachmentRef';
  attachmentId: string;
  note?: string;
}

// Future-proofing: can add more item kinds later
export type TechnicalFileItem = TechnicalFileAttachmentRef;

// ============================================
// SECTION STRUCTURE
// ============================================

export interface TechnicalFileSection {
  id: TechnicalFileSectionId;
  title: string;
  items: TechnicalFileItem[];
}

// ============================================
// TECHNICAL FILE ROOT
// ============================================

export interface TechnicalFile {
  sections: TechnicalFileSection[];
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create an empty Technical File with all 10 sections initialized
 */
export function createEmptyTechnicalFile(): TechnicalFile {
  return {
    sections: TECHNICAL_FILE_SECTION_IDS.map((id) => ({
      id,
      title: TECHNICAL_FILE_SECTION_TITLES[id],
      items: [],
    })),
  };
}

/**
 * Ensure a project's technicalFile has all 10 sections.
 * Used for backward compatibility when loading projects without technicalFile.
 * Returns a valid TechnicalFile (creates empty if missing, fills missing sections if partial).
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
      });
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
