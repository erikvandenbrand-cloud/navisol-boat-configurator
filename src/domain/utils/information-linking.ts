/**
 * Information Linking Helpers - v4
 *
 * Read-only helpers to derive relationships between:
 * - Boat Model (library defaults)
 * - Project inputs (overrides)
 * - Technical Dossier (evidence files)
 * - Certification Packs (checklists)
 *
 * These are UI-only, render-time computations.
 * No state mutations. No persistence.
 *
 * Aligns with v4 principles:
 * - Explicit > Implicit: Make relationships visible
 * - Calm UI: Context without navigation
 * - Single write path: No mutations here
 */

import type { Project, ComplianceCertification, ComplianceChapter, ComplianceChecklistItem } from '../models';
import type { TechnicalFileSectionId, TechnicalFileSection, TechnicalFileSubheading } from '../models/technical-file';
import { TECHNICAL_FILE_SECTION_TITLES, ensureTechnicalFile } from '../models/technical-file';
import { getChapterChecklistStats } from '../models/compliance';

// ============================================
// SOURCE INFO TYPES
// ============================================

export type FieldSourceType = 'boatModel' | 'project' | 'dossier' | 'derived' | 'unknown';

export interface FieldSource {
  type: FieldSourceType;
  label: string;
  /** Additional context (e.g., section name for dossier) */
  context?: string;
  /** Whether the value differs from the source */
  isOverride?: boolean;
}

// ============================================
// COMPLIANCE INPUT SOURCE DERIVATION
// ============================================

/**
 * Derives where a vessel identity field value comes from.
 * Compares project values against boat model defaults.
 */
export function getVesselFieldSource(
  fieldName: string,
  projectValue: string | number | undefined,
  boatModelValue: string | number | undefined
): FieldSource {
  // No value at all
  if (projectValue === undefined || projectValue === '') {
    if (boatModelValue !== undefined && boatModelValue !== '') {
      return {
        type: 'boatModel',
        label: 'From Boat Model',
        context: `Default: ${boatModelValue}`,
      };
    }
    return { type: 'unknown', label: 'Not set' };
  }

  // Value exists - check if it's an override
  if (boatModelValue !== undefined && boatModelValue !== '' && projectValue !== boatModelValue) {
    return {
      type: 'project',
      label: 'Overridden in Project',
      isOverride: true,
      context: `Model default: ${boatModelValue}`,
    };
  }

  // Value matches model or no model default
  if (boatModelValue !== undefined && boatModelValue !== '' && projectValue === boatModelValue) {
    return {
      type: 'boatModel',
      label: 'From Boat Model',
    };
  }

  return {
    type: 'project',
    label: 'Project Input',
  };
}

/**
 * Maps compliance input fields to their corresponding dossier sections.
 * Used to show "Stored as Evidence in: Technical Dossier → Section X"
 */
/**
 * PATCH 6: Simplified after legacy field removal.
 * Model facts (LOA, Beam, etc.) are now in BoatModel.specifications - no per-project storage.
 */
export const COMPLIANCE_FIELD_DOSSIER_MAP: Record<string, TechnicalFileSectionId> = {
  // Vessel Identity (project-owned fields only)
  modelName: 'general-description',
  win: 'general-description',
  intendedUse: 'general-description',

  // Declaration fields
  docReferenceNumber: 'conformity-assessment',
  docIssueDate: 'conformity-assessment',
  docSignatory: 'conformity-assessment',
  conformityModule: 'conformity-assessment',
  notifiedBodyName: 'conformity-assessment',
  notifiedBodyNumber: 'conformity-assessment',
};

/**
 * Get the dossier section where evidence for a compliance field is stored
 */
export function getFieldDossierEvidence(fieldName: string): { sectionId: TechnicalFileSectionId; sectionTitle: string } | null {
  const sectionId = COMPLIANCE_FIELD_DOSSIER_MAP[fieldName];
  if (!sectionId) return null;

  return {
    sectionId,
    sectionTitle: TECHNICAL_FILE_SECTION_TITLES[sectionId],
  };
}

// ============================================
// DOSSIER TO CERTIFICATION PACK LINKING
// ============================================

export interface CertPackReference {
  packId: string;
  packName: string;
  packType: string;
  chapterId: string;
  chapterTitle: string;
  checklistItemCount: number;
  stats: {
    passed: number;
    failed: number;
    inProgress: number;
    notStarted: number;
    na: number;
    total: number;
  };
}

/**
 * Get all certification packs that reference a specific dossier section.
 * Derived at render time from checklist item dossierSectionId fields.
 */
export function getCertPacksReferencingSection(
  project: Project,
  sectionId: TechnicalFileSectionId
): CertPackReference[] {
  const packs = project.compliancePacks || [];
  const references: CertPackReference[] = [];

  for (const pack of packs) {
    for (const chapter of pack.chapters) {
      // Count checklist items that reference this section
      const matchingItems = (chapter.checklist || []).filter(
        item => item.dossierSectionId === sectionId
      );

      if (matchingItems.length > 0) {
        // Calculate stats for matching items
        const stats = {
          passed: 0,
          failed: 0,
          inProgress: 0,
          notStarted: 0,
          na: 0,
          total: matchingItems.length,
        };

        for (const item of matchingItems) {
          switch (item.status) {
            case 'PASSED': stats.passed++; break;
            case 'FAILED': stats.failed++; break;
            case 'IN_PROGRESS': stats.inProgress++; break;
            case 'NA': stats.na++; break;
            default: stats.notStarted++;
          }
        }

        references.push({
          packId: pack.id,
          packName: pack.name,
          packType: pack.type,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          checklistItemCount: matchingItems.length,
          stats,
        });
      }
    }
  }

  return references;
}

/**
 * Get all certification packs that reference a specific dossier subheading.
 * More granular than section-level linking.
 */
export function getCertPacksReferencingSubheading(
  project: Project,
  sectionId: TechnicalFileSectionId,
  subheadingId: string
): CertPackReference[] {
  const packs = project.compliancePacks || [];
  const references: CertPackReference[] = [];

  for (const pack of packs) {
    for (const chapter of pack.chapters) {
      const matchingItems = (chapter.checklist || []).filter(
        item => item.dossierSectionId === sectionId && item.dossierSubheadingId === subheadingId
      );

      if (matchingItems.length > 0) {
        const stats = {
          passed: 0,
          failed: 0,
          inProgress: 0,
          notStarted: 0,
          na: 0,
          total: matchingItems.length,
        };

        for (const item of matchingItems) {
          switch (item.status) {
            case 'PASSED': stats.passed++; break;
            case 'FAILED': stats.failed++; break;
            case 'IN_PROGRESS': stats.inProgress++; break;
            case 'NA': stats.na++; break;
            default: stats.notStarted++;
          }
        }

        references.push({
          packId: pack.id,
          packName: pack.name,
          packType: pack.type,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          checklistItemCount: matchingItems.length,
          stats,
        });
      }
    }
  }

  return references;
}

/**
 * Aggregate cert pack stats for a dossier section.
 * Shows overall passed/todo/failed across all packs referencing this section.
 */
export interface SectionCertStats {
  totalItems: number;
  passed: number;
  failed: number;
  todo: number;
  na: number;
  packCount: number;
}

export function getAggregatedCertStatsForSection(
  project: Project,
  sectionId: TechnicalFileSectionId
): SectionCertStats {
  const refs = getCertPacksReferencingSection(project, sectionId);

  const result: SectionCertStats = {
    totalItems: 0,
    passed: 0,
    failed: 0,
    todo: 0,
    na: 0,
    packCount: refs.length,
  };

  for (const ref of refs) {
    result.totalItems += ref.stats.total;
    result.passed += ref.stats.passed;
    result.failed += ref.stats.failed;
    result.todo += ref.stats.inProgress + ref.stats.notStarted;
    result.na += ref.stats.na;
  }

  return result;
}

// ============================================
// EVIDENCE LOCATION FOR CHECKLIST ITEMS
// ============================================

export interface EvidenceLocation {
  sectionId: TechnicalFileSectionId;
  sectionTitle: string;
  subheadingId: string;
  subheadingTitle: string;
  fileCount: number;
  isArchived: boolean;
}

/**
 * Get the evidence location details for a checklist item.
 * Returns null if no dossier link exists.
 */
export function getChecklistEvidenceLocation(
  project: Project,
  item: ComplianceChecklistItem
): EvidenceLocation | null {
  if (!item.dossierSectionId || !item.dossierSubheadingId) {
    return null;
  }

  const technicalFile = ensureTechnicalFile(project.technicalFile);
  const section = technicalFile.sections.find(s => s.id === item.dossierSectionId);
  if (!section) return null;

  const subheading = section.subheadings.find(sh => sh.id === item.dossierSubheadingId);
  if (!subheading) return null;

  return {
    sectionId: item.dossierSectionId,
    sectionTitle: TECHNICAL_FILE_SECTION_TITLES[item.dossierSectionId],
    subheadingId: item.dossierSubheadingId,
    subheadingTitle: subheading.title,
    fileCount: subheading.items.length,
    isArchived: !!subheading.archived,
  };
}

/**
 * Get evidence file count for a checklist item's linked dossier subheading.
 * Returns 0 if no link exists or subheading not found.
 */
export function getChecklistEvidenceCount(
  project: Project,
  item: ComplianceChecklistItem
): number {
  const location = getChecklistEvidenceLocation(project, item);
  return location?.fileCount ?? 0;
}

/**
 * Check if a checklist item has a dossier link (sectionId + subheadingId).
 */
export function hasChecklistDossierLink(item: ComplianceChecklistItem): boolean {
  return !!(item.dossierSectionId && item.dossierSubheadingId);
}

// ============================================
// NAVIGATION DEEP LINKS
// ============================================

/**
 * Generate a deep link identifier for navigating to a dossier section.
 * The UI can use this to scroll to and highlight the section.
 */
export function getDossierDeepLink(sectionId: TechnicalFileSectionId, subheadingId?: string): string {
  if (subheadingId) {
    return `dossier:${sectionId}:${subheadingId}`;
  }
  return `dossier:${sectionId}`;
}

/**
 * Parse a dossier deep link.
 */
export function parseDossierDeepLink(link: string): { sectionId: TechnicalFileSectionId; subheadingId?: string } | null {
  if (!link.startsWith('dossier:')) return null;

  const parts = link.split(':');
  if (parts.length < 2) return null;

  return {
    sectionId: parts[1] as TechnicalFileSectionId,
    subheadingId: parts[2],
  };
}

/**
 * Generate a deep link for navigating to a certification pack checklist item.
 */
export function getCertPackDeepLink(packId: string, chapterId: string, itemId?: string): string {
  if (itemId) {
    return `certpack:${packId}:${chapterId}:${itemId}`;
  }
  return `certpack:${packId}:${chapterId}`;
}

/**
 * Parse a certification pack deep link.
 */
export function parseCertPackDeepLink(link: string): { packId: string; chapterId: string; itemId?: string } | null {
  if (!link.startsWith('certpack:')) return null;

  const parts = link.split(':');
  if (parts.length < 3) return null;

  return {
    packId: parts[1],
    chapterId: parts[2],
    itemId: parts[3],
  };
}

// ============================================
// LENS VIEW TYPES AND HELPERS
// ============================================

/**
 * Lens view mode for Compliance UI.
 * 'evidence' = default view showing Technical Dossier.
 * Specific pack types show the same dossier with certification overlay.
 */
export type ComplianceLensMode = 'evidence' | 'CE' | 'ES_TRIN' | 'LLOYDS' | 'OTHER';

export interface LensChecklistItem {
  packId: string;
  packName: string;
  packType: string;
  chapterId: string;
  chapterTitle: string;
  item: ComplianceChecklistItem;
}

export interface SubheadingLensContext {
  /** All checklist items referencing this subheading */
  checklistItems: LensChecklistItem[];
  /** Aggregate stats */
  stats: {
    passed: number;
    failed: number;
    inProgress: number;
    notStarted: number;
    na: number;
    total: number;
  };
  /** Whether this subheading is referenced by the active lens pack */
  isHighlighted: boolean;
}

export interface SectionLensContext {
  /** All checklist items referencing this section (any subheading) */
  checklistItems: LensChecklistItem[];
  /** Aggregate stats */
  stats: {
    passed: number;
    failed: number;
    inProgress: number;
    notStarted: number;
    na: number;
    total: number;
  };
  /** Map of subheading ID to subheading context */
  subheadings: Map<string, SubheadingLensContext>;
  /** Whether this section has any referenced subheadings */
  isHighlighted: boolean;
}

/**
 * Build a lens index: Map<dossierSubheadingId, LensChecklistItem[]>
 * This is the core derived data structure for lens views.
 */
export function buildSubheadingLensIndex(
  project: Project,
  lensMode: ComplianceLensMode
): Map<string, LensChecklistItem[]> {
  const index = new Map<string, LensChecklistItem[]>();
  const packs = project.compliancePacks || [];

  // Filter packs by lens mode
  const filteredPacks = lensMode === 'evidence'
    ? packs // Evidence view: all packs
    : packs.filter(p => p.type === lensMode);

  for (const pack of filteredPacks) {
    for (const chapter of pack.chapters) {
      for (const item of chapter.checklist || []) {
        if (item.dossierSubheadingId) {
          const existing = index.get(item.dossierSubheadingId) || [];
          existing.push({
            packId: pack.id,
            packName: pack.name,
            packType: pack.type,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            item,
          });
          index.set(item.dossierSubheadingId, existing);
        }
      }
    }
  }

  return index;
}

/**
 * Build a section-level lens index.
 */
export function buildSectionLensIndex(
  project: Project,
  lensMode: ComplianceLensMode
): Map<TechnicalFileSectionId, SectionLensContext> {
  const subheadingIndex = buildSubheadingLensIndex(project, lensMode);
  const sectionIndex = new Map<TechnicalFileSectionId, SectionLensContext>();
  const packs = project.compliancePacks || [];

  // Filter packs by lens mode
  const filteredPacks = lensMode === 'evidence'
    ? packs
    : packs.filter(p => p.type === lensMode);

  // Build section-level index
  for (const pack of filteredPacks) {
    for (const chapter of pack.chapters) {
      for (const item of chapter.checklist || []) {
        if (item.dossierSectionId) {
          const sectionId = item.dossierSectionId as TechnicalFileSectionId;

          if (!sectionIndex.has(sectionId)) {
            sectionIndex.set(sectionId, {
              checklistItems: [],
              stats: { passed: 0, failed: 0, inProgress: 0, notStarted: 0, na: 0, total: 0 },
              subheadings: new Map(),
              isHighlighted: false,
            });
          }

          const sectionCtx = sectionIndex.get(sectionId)!;
          const lensItem: LensChecklistItem = {
            packId: pack.id,
            packName: pack.name,
            packType: pack.type,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            item,
          };

          sectionCtx.checklistItems.push(lensItem);
          sectionCtx.stats.total++;
          sectionCtx.isHighlighted = true;

          // Update stats
          switch (item.status) {
            case 'PASSED': sectionCtx.stats.passed++; break;
            case 'FAILED': sectionCtx.stats.failed++; break;
            case 'IN_PROGRESS': sectionCtx.stats.inProgress++; break;
            case 'NA': sectionCtx.stats.na++; break;
            default: sectionCtx.stats.notStarted++;
          }

          // Add to subheading map
          if (item.dossierSubheadingId) {
            if (!sectionCtx.subheadings.has(item.dossierSubheadingId)) {
              sectionCtx.subheadings.set(item.dossierSubheadingId, {
                checklistItems: [],
                stats: { passed: 0, failed: 0, inProgress: 0, notStarted: 0, na: 0, total: 0 },
                isHighlighted: false,
              });
            }

            const subCtx = sectionCtx.subheadings.get(item.dossierSubheadingId)!;
            subCtx.checklistItems.push(lensItem);
            subCtx.stats.total++;
            subCtx.isHighlighted = true;

            switch (item.status) {
              case 'PASSED': subCtx.stats.passed++; break;
              case 'FAILED': subCtx.stats.failed++; break;
              case 'IN_PROGRESS': subCtx.stats.inProgress++; break;
              case 'NA': subCtx.stats.na++; break;
              default: subCtx.stats.notStarted++;
            }
          }
        }
      }
    }
  }

  return sectionIndex;
}

/**
 * Get available lens modes based on project's certification packs.
 */
export function getAvailableLensModes(project: Project): ComplianceLensMode[] {
  const modes: ComplianceLensMode[] = ['evidence'];
  const packs = project.compliancePacks || [];

  const packTypes = new Set(packs.map(p => p.type));

  if (packTypes.has('CE')) modes.push('CE');
  if (packTypes.has('ES_TRIN')) modes.push('ES_TRIN');
  if (packTypes.has('LLOYDS')) modes.push('LLOYDS');
  if (packTypes.has('OTHER')) modes.push('OTHER');

  return modes;
}

/**
 * Get certification pack for a lens mode.
 */
export function getCertPackForLens(
  project: Project,
  lensMode: ComplianceLensMode
): ComplianceCertification | null {
  if (lensMode === 'evidence') return null;
  return project.compliancePacks?.find(p => p.type === lensMode) || null;
}

/**
 * Get lens mode display label.
 */
export function getLensModeLabel(mode: ComplianceLensMode): string {
  switch (mode) {
    case 'evidence': return 'Evidence';
    case 'CE': return 'CE Marking';
    case 'ES_TRIN': return 'ES-TRIN';
    case 'LLOYDS': return 'Lloyds';
    case 'OTHER': return 'Other';
  }
}

/**
 * Get lens mode icon color.
 */
export function getLensModeColor(mode: ComplianceLensMode): string {
  switch (mode) {
    case 'evidence': return 'text-slate-600';
    case 'CE': return 'text-teal-600';
    case 'ES_TRIN': return 'text-blue-600';
    case 'LLOYDS': return 'text-purple-600';
    case 'OTHER': return 'text-amber-600';
  }
}

/**
 * Get lens mode background color.
 */
export function getLensModeBgColor(mode: ComplianceLensMode): string {
  switch (mode) {
    case 'evidence': return 'bg-slate-50';
    case 'CE': return 'bg-teal-50';
    case 'ES_TRIN': return 'bg-blue-50';
    case 'LLOYDS': return 'bg-purple-50';
    case 'OTHER': return 'bg-amber-50';
  }
}

/**
 * Format checklist stats as a summary string.
 */
export function formatLensStats(stats: SubheadingLensContext['stats']): string {
  const effective = stats.total - stats.na;
  if (effective === 0) return 'N/A';

  const parts: string[] = [];
  if (stats.passed > 0) parts.push(`${stats.passed} passed`);
  if (stats.failed > 0) parts.push(`${stats.failed} failed`);
  const todo = stats.inProgress + stats.notStarted;
  if (todo > 0) parts.push(`${todo} todo`);

  return parts.join(', ') || 'No items';
}

// ============================================
// URL DEEP LINK HELPERS
// ============================================

/**
 * Dossier deep link query params structure.
 */
export interface DossierDeepLinkParams {
  /** Target dossier section to scroll to */
  dossierSection?: TechnicalFileSectionId;
  /** Optional target subheading within the section */
  subheading?: string;
  /** Optional lens mode to activate */
  lens?: ComplianceLensMode;
}

/**
 * Build a URL query string for navigating to a specific dossier location.
 * Designed for hash-based routing: /projects/:id?tab=compliance&dossierSection=xxx&subheading=yyy
 */
export function buildDossierDeepLinkUrl(
  projectId: string,
  sectionId: TechnicalFileSectionId,
  subheadingId?: string,
  lens?: ComplianceLensMode
): string {
  const params = new URLSearchParams();
  params.set('tab', 'compliance');
  params.set('dossierSection', sectionId);

  if (subheadingId) {
    params.set('subheading', subheadingId);
  }

  if (lens && lens !== 'evidence') {
    params.set('lens', lens);
  }

  return `/projects/${projectId}?${params.toString()}`;
}

/**
 * Build just the query params portion for dossier deep linking.
 * Useful when you already have the base URL.
 */
export function buildDossierDeepLinkParams(
  sectionId: TechnicalFileSectionId,
  subheadingId?: string,
  lens?: ComplianceLensMode
): string {
  const params = new URLSearchParams();
  params.set('tab', 'compliance');
  params.set('dossierSection', sectionId);

  if (subheadingId) {
    params.set('subheading', subheadingId);
  }

  if (lens && lens !== 'evidence') {
    params.set('lens', lens);
  }

  return params.toString();
}

/**
 * Parse dossier deep link params from a URL search string or URLSearchParams.
 */
export function parseDossierDeepLinkParams(
  searchParams: URLSearchParams | string
): DossierDeepLinkParams {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;

  const dossierSection = params.get('dossierSection') as TechnicalFileSectionId | null;
  const subheading = params.get('subheading');
  const lens = params.get('lens') as ComplianceLensMode | null;

  return {
    dossierSection: dossierSection || undefined,
    subheading: subheading || undefined,
    lens: lens || undefined,
  };
}

/**
 * Clear dossier deep link params from URL (call after navigation is complete).
 * Returns a clean URL without the dossier-specific params.
 */
export function clearDossierDeepLinkParams(currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  params.delete('dossierSection');
  params.delete('subheading');
  // Keep 'tab' and 'lens' as they're part of normal navigation
  return params.toString();
}

/**
 * Navigate to a dossier location via hash routing.
 * This is the main function to call when user clicks a deep link.
 */
export function navigateToDossierSection(
  projectId: string,
  sectionId: TechnicalFileSectionId,
  subheadingId?: string,
  lens?: ComplianceLensMode
): void {
  const url = buildDossierDeepLinkUrl(projectId, sectionId, subheadingId, lens);
  window.location.hash = url;
}
