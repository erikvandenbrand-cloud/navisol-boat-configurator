/**
 * EvidenceFirstPanel Component - v4
 *
 * The PRIMARY compliance surface showing Technical Dossier.
 * Certification Packs are contextual overlays ("lenses") - NOT separate workflows.
 *
 * Core Concept:
 * - Technical Dossier = canonical evidence (always visible)
 * - Certification Packs = verification overlays that highlight & annotate
 * - No progress bars implying workflow completion
 * - No "next steps" or completion flow
 *
 * Mental Model: Evidence first, certification as interpretation.
 * All certification-to-dossier relationships derived at render time.
 */

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Archive,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  LinkIcon,
  Lock,
  Paperclip,
  Plus,
  Shield,
  Unlink,
  XCircle,
} from 'lucide-react';
import type { Project, ComplianceChecklistItem } from '@/domain/models';
import {
  TECHNICAL_FILE_SECTION_TITLES,
  TECHNICAL_FILE_SECTION_DESCRIPTIONS,
  ensureTechnicalFile,
  getSectionItemCounts,
  getSubheadingItemCounts,
  getTechnicalFileCounts,
  getAllSubheadings,
  type TechnicalFileSectionId,
  type TechnicalFileSection,
  type TechnicalFileSubheading,
} from '@/domain/models/technical-file';
import type {
  ComplianceLensMode,
  LensChecklistItem,
  SectionLensContext,
  SubheadingLensContext,
  DossierDeepLinkParams,
} from '@/domain/utils/information-linking';
import {
  buildSectionLensIndex,
  getAvailableLensModes,
  getCertPackForLens,
  getLensModeLabel,
  getLensModeColor,
  getLensModeBgColor,
  clearDossierDeepLinkParams,
  getChecklistEvidenceLocation,
  hasChecklistDossierLink,
  navigateToDossierSection,
} from '@/domain/utils/information-linking';
import {
  ComplianceLensSelector,
  LensStatusIndicator,
  LensHighlightWrapper,
} from './ComplianceLensSelector';
import { CertStatsSummary } from './CertPackReferences';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================
// TYPES
// ============================================

interface EvidenceFirstPanelProps {
  project: Project;
  onRefresh: () => void;
  onCreateCertPack?: () => void;
  onFinalizeCertPack?: (packId: string, packName: string) => void;
  /** Deep link params to auto-navigate to a specific section/subheading */
  dossierDeepLink?: DossierDeepLinkParams;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EvidenceFirstPanel({
  project,
  onRefresh,
  onCreateCertPack,
  onFinalizeCertPack,
  dossierDeepLink,
}: EvidenceFirstPanelProps) {
  const [lensMode, setLensMode] = useState<ComplianceLensMode>('evidence');
  const [expandedSections, setExpandedSections] = useState<Set<TechnicalFileSectionId>>(new Set());
  const [expandedSubheadings, setExpandedSubheadings] = useState<Set<string>>(new Set());
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [dialogChecklistItems, setDialogChecklistItems] = useState<LensChecklistItem[]>([]);
  const [dialogTitle, setDialogTitle] = useState('');

  // Deep link state: which subheading is currently highlighted (briefly after navigation)
  const [highlightedSubheading, setHighlightedSubheading] = useState<string | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<TechnicalFileSectionId | null>(null);

  // Refs for scroll targets
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const subheadingRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Track if deep link has been processed to avoid re-processing
  const deepLinkProcessedRef = useRef<string | null>(null);

  // Get available lens modes
  const availableModes = useMemo(() => getAvailableLensModes(project), [project]);

  // Handle deep link navigation on mount or when params change
  useEffect(() => {
    if (!dossierDeepLink?.dossierSection) return;

    // Create a unique key for this deep link to avoid re-processing
    const deepLinkKey = `${dossierDeepLink.dossierSection}-${dossierDeepLink.subheading || ''}`;
    if (deepLinkProcessedRef.current === deepLinkKey) return;
    deepLinkProcessedRef.current = deepLinkKey;

    const targetSection = dossierDeepLink.dossierSection;
    const targetSubheading = dossierDeepLink.subheading;

    // Apply lens mode if specified
    if (dossierDeepLink.lens && availableModes.includes(dossierDeepLink.lens)) {
      setLensMode(dossierDeepLink.lens);
    }

    // Expand the target section
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.add(targetSection);
      return next;
    });

    // If subheading specified, expand it too
    if (targetSubheading) {
      setExpandedSubheadings((prev) => {
        const next = new Set(prev);
        next.add(targetSubheading);
        return next;
      });
    }

    // Set highlighted state for visual feedback
    setHighlightedSection(targetSection);
    if (targetSubheading) {
      setHighlightedSubheading(targetSubheading);
    }

    // Schedule scroll after DOM updates
    const scrollTimeout = setTimeout(() => {
      const targetRef = targetSubheading
        ? subheadingRefs.current.get(targetSubheading)
        : sectionRefs.current.get(targetSection);

      if (targetRef) {
        targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Clear highlight after a few seconds (calm UI)
    const highlightTimeout = setTimeout(() => {
      setHighlightedSection(null);
      setHighlightedSubheading(null);

      // Clear deep link params from URL (keep it clean)
      const currentHash = window.location.hash;
      const [pathPart, queryPart] = currentHash.slice(1).split('?');
      if (queryPart) {
        const cleanedParams = clearDossierDeepLinkParams(queryPart);
        const newHash = cleanedParams ? `${pathPart}?${cleanedParams}` : pathPart;
        // Use replaceState to avoid adding history entry
        window.history.replaceState(null, '', `#${newHash}`);
      }
    }, 3000);

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(highlightTimeout);
    };
  }, [dossierDeepLink, availableModes]);

  // Callback to register section refs
  const registerSectionRef = useCallback((sectionId: string, el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(sectionId, el);
    } else {
      sectionRefs.current.delete(sectionId);
    }
  }, []);

  // Callback to register subheading refs
  const registerSubheadingRef = useCallback((subheadingId: string, el: HTMLDivElement | null) => {
    if (el) {
      subheadingRefs.current.set(subheadingId, el);
    } else {
      subheadingRefs.current.delete(subheadingId);
    }
  }, []);

  // Build lens index for current mode
  const sectionLensIndex = useMemo(
    () => buildSectionLensIndex(project, lensMode),
    [project, lensMode]
  );

  // Technical file data
  const technicalFile = useMemo(() => ensureTechnicalFile(project.technicalFile), [project.technicalFile]);
  const counts = useMemo(() => getTechnicalFileCounts(technicalFile), [technicalFile]);

  // Active certification pack (if lens mode is not 'evidence')
  const activePack = useMemo(() => getCertPackForLens(project, lensMode), [project, lensMode]);

  // Project type check
  const isNewBuild = project.type === 'NEW_BUILD';
  const showPanel = isNewBuild || counts.totalItems > 0;

  if (!showPanel) {
    return null;
  }

  function toggleSection(sectionId: TechnicalFileSectionId) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function toggleSubheading(subheadingId: string) {
    setExpandedSubheadings((prev) => {
      const next = new Set(prev);
      if (next.has(subheadingId)) {
        next.delete(subheadingId);
      } else {
        next.add(subheadingId);
      }
      return next;
    });
  }

  function handleOpenChecklistItems(items: LensChecklistItem[], title: string) {
    setDialogChecklistItems(items);
    setDialogTitle(title);
    setShowChecklistDialog(true);
  }

  const isLensActive = lensMode !== 'evidence';
  const lensColor = getLensModeColor(lensMode);
  const lensBgColor = getLensModeBgColor(lensMode);
  const hasCertPacks = (project.compliancePacks?.length || 0) > 0;

  return (
    <TooltipProvider>
      <Card data-testid="evidence-first-panel">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-teal-600" />
                Technical Dossier
                {isLensActive && activePack && (
                  <Badge className={`${lensBgColor} ${lensColor} border-0 text-xs ml-2`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getLensModeLabel(lensMode)} Lens
                    {activePack.status === 'DRAFT' && (
                      <span className="ml-1 opacity-70">(Draft)</span>
                    )}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {isLensActive
                  ? `Viewing evidence through ${getLensModeLabel(lensMode)} certification lens`
                  : 'Canonical evidence archive per RCD 2013/53/EU'
                }
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Lens Selector */}
              <ComplianceLensSelector
                availableModes={availableModes}
                currentMode={lensMode}
                onModeChange={setLensMode}
              />

              {/* Create Lens Button (when no packs exist) */}
              {!hasCertPacks && onCreateCertPack && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateCertPack}
                  className="text-teal-600 border-teal-200 hover:bg-teal-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Lens
                </Button>
              )}

              {/* Finalize Button (when lens is active and pack is draft) */}
              {isLensActive && activePack?.status === 'DRAFT' && onFinalizeCertPack && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFinalizeCertPack(activePack.id, activePack.name)}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Finalize
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Stats - Informational only, no progress/workflow implied */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <FolderOpen className="h-4 w-4" />
                <span className="text-xs font-medium">Sections</span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {counts.populatedSections}
                <span className="text-sm font-normal text-slate-500"> / 10</span>
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Paperclip className="h-4 w-4" />
                <span className="text-xs font-medium">Evidence Files</span>
              </div>
              <p className="text-xl font-bold text-blue-700">{counts.totalAttachmentRefs}</p>
            </div>

            {isLensActive && activePack ? (
              <>
                <div className={`p-3 ${lensBgColor} rounded-lg`}>
                  <div className={`flex items-center gap-2 ${lensColor} mb-1`}>
                    <Link2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Linked Checks</span>
                  </div>
                  <p className={`text-xl font-bold ${lensColor}`}>
                    {Array.from(sectionLensIndex.values()).reduce(
                      (acc, ctx) => acc + ctx.checklistItems.length,
                      0
                    )}
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                  <p className="text-xl font-bold text-green-700">
                    {Array.from(sectionLensIndex.values()).reduce(
                      (acc, ctx) => acc + ctx.stats.passed,
                      0
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Link2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Referenced</span>
                  </div>
                  <p className="text-xl font-bold text-purple-700">
                    {Array.from(sectionLensIndex.values()).reduce(
                      (acc, ctx) => acc + ctx.checklistItems.length,
                      0
                    )}
                  </p>
                  <p className="text-xs text-purple-500">by checklists</p>
                </div>

                <div className="p-3 bg-teal-50 rounded-lg">
                  <div className="flex items-center gap-2 text-teal-600 mb-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-medium">Cert Lenses</span>
                  </div>
                  <p className="text-xl font-bold text-teal-700">
                    {project.compliancePacks?.length || 0}
                  </p>
                  <p className="text-xs text-teal-500">available</p>
                </div>
              </>
            )}
          </div>

          {/* Sections List with Lens Overlay */}
          <div className="space-y-2">
            {technicalFile.sections.map((section, index) => {
              const sectionCounts = getSectionItemCounts(section);
              const isExpanded = expandedSections.has(section.id as TechnicalFileSectionId);

              // Get lens context for this section
              const sectionLensCtx = sectionLensIndex.get(section.id as TechnicalFileSectionId);

              return (
                <LensSectionCard
                  key={section.id}
                  section={section}
                  sectionIndex={index}
                  sectionCounts={sectionCounts}
                  lensContext={sectionLensCtx}
                  lensMode={lensMode}
                  isExpanded={isExpanded}
                  expandedSubheadings={expandedSubheadings}
                  onToggle={() => toggleSection(section.id as TechnicalFileSectionId)}
                  onToggleSubheading={toggleSubheading}
                  onOpenChecklistItems={handleOpenChecklistItems}
                  project={project}
                  registerSectionRef={registerSectionRef}
                  registerSubheadingRef={registerSubheadingRef}
                  isDeepLinkHighlighted={highlightedSection === section.id}
                  highlightedSubheadingId={highlightedSubheading}
                />
              );
            })}
          </div>

          {/* Create Lens CTA when no packs and this is a new build */}
          {!hasCertPacks && isNewBuild && onCreateCertPack && (
            <div className="mt-6 p-4 border border-dashed border-teal-300 rounded-lg bg-teal-50/50 text-center">
              <Shield className="h-8 w-8 text-teal-400 mx-auto mb-2" />
              <p className="text-sm text-teal-700 font-medium">
                Add a certification lens to verify this evidence
              </p>
              <p className="text-xs text-teal-600 mt-1 mb-3">
                Certification lenses overlay verification status on your evidence
              </p>
              <Button
                size="sm"
                onClick={onCreateCertPack}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create CE Lens
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist Items Dialog */}
      <ChecklistItemsDialog
        open={showChecklistDialog}
        onOpenChange={setShowChecklistDialog}
        title={dialogTitle}
        items={dialogChecklistItems}
        project={project}
      />
    </TooltipProvider>
  );
}

// ============================================
// LENS SECTION CARD
// ============================================

interface LensSectionCardProps {
  section: TechnicalFileSection;
  sectionIndex: number;
  sectionCounts: ReturnType<typeof getSectionItemCounts>;
  lensContext?: SectionLensContext;
  lensMode: ComplianceLensMode;
  isExpanded: boolean;
  expandedSubheadings: Set<string>;
  onToggle: () => void;
  onToggleSubheading: (id: string) => void;
  onOpenChecklistItems: (items: LensChecklistItem[], title: string) => void;
  project: Project;
  /** Callback to register section ref for scrolling */
  registerSectionRef: (sectionId: string, el: HTMLDivElement | null) => void;
  /** Callback to register subheading ref for scrolling */
  registerSubheadingRef: (subheadingId: string, el: HTMLDivElement | null) => void;
  /** Whether this section is highlighted from deep link navigation */
  isDeepLinkHighlighted: boolean;
  /** Currently highlighted subheading ID from deep link */
  highlightedSubheadingId: string | null;
}

function LensSectionCard({
  section,
  sectionIndex,
  sectionCounts,
  lensContext,
  lensMode,
  isExpanded,
  expandedSubheadings,
  onToggle,
  onToggleSubheading,
  onOpenChecklistItems,
  project,
  registerSectionRef,
  registerSubheadingRef,
  isDeepLinkHighlighted,
  highlightedSubheadingId,
}: LensSectionCardProps) {
  const hasItems = sectionCounts.total > 0;
  const isLensActive = lensMode !== 'evidence';
  const isHighlighted = isLensActive && lensContext?.isHighlighted;
  const lensColor = getLensModeColor(lensMode);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <LensHighlightWrapper
        isHighlighted={!!isHighlighted}
        mode={lensMode}
        className="pl-2"
      >
        <div
          ref={(el) => registerSectionRef(section.id, el)}
          className={`border rounded-lg transition-all duration-500 ${
            isDeepLinkHighlighted
              ? 'border-teal-400 bg-teal-50/50 ring-2 ring-teal-200'
              : isHighlighted
                ? `border-current/30 ${getLensModeBgColor(lensMode)}/30`
                : hasItems
                  ? 'border-slate-200'
                  : 'border-dashed border-slate-300'
          }`}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{sectionIndex + 1}.</span>
                    <span className="font-medium text-slate-900">{section.title}</span>
                    {isHighlighted && (
                      <Badge className={`${getLensModeBgColor(lensMode)} ${lensColor} border-0 text-[9px]`}>
                        <Shield className="h-2.5 w-2.5 mr-0.5" />
                        {lensContext?.stats.total} items
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {TECHNICAL_FILE_SECTION_DESCRIPTIONS[section.id as TechnicalFileSectionId]}
                  </p>

                  {/* Show lens stats or cert pack references */}
                  {isLensActive && lensContext ? (
                    <div className="flex items-center gap-2 mt-1">
                      <LensStatusIndicator stats={lensContext.stats} showLabels />
                    </div>
                  ) : !isLensActive && lensContext && lensContext.checklistItems.length > 0 ? (
                    <CertStatsSummary
                      stats={{
                        totalItems: lensContext.stats.total,
                        passed: lensContext.stats.passed,
                        failed: lensContext.stats.failed,
                        todo: lensContext.stats.inProgress + lensContext.stats.notStarted,
                        na: lensContext.stats.na,
                        packCount: new Set(lensContext.checklistItems.map(i => i.packId)).size,
                      }}
                      className="mt-1"
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sectionCounts.total > 0 && (
                  <Badge className="bg-teal-100 text-teal-700 border-0">
                    {sectionCounts.total} files
                  </Badge>
                )}
                <Badge variant="outline" className="text-slate-600 border-slate-200">
                  {section.subheadings.filter(sh => !sh.archived).length} subheadings
                </Badge>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t">
              <div className="space-y-2 mt-3">
                {getAllSubheadings(section).map((subheading) => {
                  const subheadingCounts = getSubheadingItemCounts(subheading);
                  const isSubheadingExpanded = expandedSubheadings.has(subheading.id);
                  const subheadingLensCtx = lensContext?.subheadings.get(subheading.id);

                  return (
                    <LensSubheadingCard
                      key={subheading.id}
                      subheading={subheading}
                      subheadingCounts={subheadingCounts}
                      lensContext={subheadingLensCtx}
                      lensMode={lensMode}
                      isExpanded={isSubheadingExpanded}
                      onToggle={() => onToggleSubheading(subheading.id)}
                      onOpenChecklistItems={onOpenChecklistItems}
                      registerSubheadingRef={registerSubheadingRef}
                      isDeepLinkHighlighted={highlightedSubheadingId === subheading.id}
                    />
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </LensHighlightWrapper>
    </Collapsible>
  );
}

// ============================================
// LENS SUBHEADING CARD
// ============================================

interface LensSubheadingCardProps {
  subheading: TechnicalFileSubheading;
  subheadingCounts: ReturnType<typeof getSubheadingItemCounts>;
  lensContext?: SubheadingLensContext;
  lensMode: ComplianceLensMode;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenChecklistItems: (items: LensChecklistItem[], title: string) => void;
  /** Callback to register subheading ref for scrolling */
  registerSubheadingRef: (subheadingId: string, el: HTMLDivElement | null) => void;
  /** Whether this subheading is highlighted from deep link navigation */
  isDeepLinkHighlighted: boolean;
}

function LensSubheadingCard({
  subheading,
  subheadingCounts,
  lensContext,
  lensMode,
  isExpanded,
  onToggle,
  onOpenChecklistItems,
  registerSubheadingRef,
  isDeepLinkHighlighted,
}: LensSubheadingCardProps) {
  const hasItems = subheadingCounts.total > 0;
  const isArchived = subheading.archived;
  const isLensActive = lensMode !== 'evidence';
  const isHighlighted = isLensActive && lensContext?.isHighlighted;
  const lensColor = getLensModeColor(lensMode);

  return (
    <LensHighlightWrapper
      isHighlighted={!!isHighlighted}
      mode={lensMode}
      className="pl-2"
    >
      <div
        ref={(el) => registerSubheadingRef(subheading.id, el)}
        className={`border rounded-lg transition-all duration-500 ${
          isDeepLinkHighlighted
            ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-200'
            : isArchived
              ? 'border-dashed border-slate-300 bg-slate-50/50'
              : isHighlighted
                ? `border-current/20 ${getLensModeBgColor(lensMode)}/20`
                : hasItems
                  ? 'border-slate-200 bg-white'
                  : 'border-dashed border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between p-2.5">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-medium text-sm ${isArchived ? 'text-slate-500' : 'text-slate-800'}`}>
                  {subheading.title}
                </span>
                {isArchived && (
                  <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">
                    <Archive className="h-2.5 w-2.5 mr-1" />
                    Archived
                  </Badge>
                )}
                {isHighlighted && (
                  <Badge className={`${getLensModeBgColor(lensMode)} ${lensColor} border-0 text-[9px]`}>
                    <Shield className="h-2.5 w-2.5 mr-0.5" />
                    {lensContext?.stats.total}
                  </Badge>
                )}
              </div>

              {/* Usage info */}
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                {hasItems && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {subheadingCounts.total} file{subheadingCounts.total !== 1 ? 's' : ''}
                  </span>
                )}

                {/* Show lens checklist stats */}
                {lensContext && lensContext.checklistItems.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChecklistItems(
                            lensContext.checklistItems,
                            `Checklist items for "${subheading.title}"`
                          );
                        }}
                        className={`flex items-center gap-1 ${isLensActive ? lensColor : 'text-teal-600'} hover:underline`}
                      >
                        <Link2 className="h-3 w-3" />
                        {lensContext.checklistItems.length} check{lensContext.checklistItems.length !== 1 ? 's' : ''}
                        <LensStatusIndicator stats={lensContext.stats} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to view linked checklist items</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* Files count badge */}
          {hasItems && (
            <Badge variant="outline" className="text-xs">
              {subheadingCounts.total} files
            </Badge>
          )}
        </div>
      </div>
    </LensHighlightWrapper>
  );
}

// ============================================
// CHECKLIST ITEMS DIALOG
// ============================================

interface ChecklistItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: LensChecklistItem[];
  project: Project;
}

function ChecklistItemsDialog({
  open,
  onOpenChange,
  title,
  items,
  project,
}: ChecklistItemsDialogProps) {
  function getStatusIcon(status: ComplianceChecklistItem['status']) {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-3.5 w-3.5 text-red-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-3.5 w-3.5 text-blue-600" />;
      default:
        return <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />;
    }
  }

  function handleOpenDossierLocation(lensItem: LensChecklistItem) {
    const item = lensItem.item;
    if (!item.dossierSectionId || !item.dossierSubheadingId) return;

    // Navigate to the dossier location with deep link
    navigateToDossierSection(
      project.id,
      item.dossierSectionId,
      item.dossierSubheadingId
    );

    // Close the dialog after navigation
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {items.length} checklist item{items.length !== 1 ? 's' : ''} linked to this evidence
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {items.map((lensItem) => {
            const hasDossierLink = hasChecklistDossierLink(lensItem.item);
            const evidenceLocation = hasDossierLink
              ? getChecklistEvidenceLocation(project, lensItem.item)
              : null;

            return (
              <div
                key={`${lensItem.packId}-${lensItem.chapterId}-${lensItem.item.id}`}
                className={`flex flex-col gap-2 p-3 rounded border ${
                  lensItem.item.status === 'PASSED'
                    ? 'bg-green-50/50 border-green-200'
                    : lensItem.item.status === 'FAILED'
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-white border-slate-200'
                }`}
              >
                {/* Title and status row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {getStatusIcon(lensItem.item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">{lensItem.item.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 mr-1"
                        >
                          {lensItem.packType}
                        </Badge>
                        {lensItem.packName} → {lensItem.chapterTitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evidence location row */}
                <div className="flex items-center justify-between gap-2 pl-5">
                  {hasDossierLink ? (
                    <>
                      {/* Evidence count hint */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <FolderOpen className="h-3 w-3 text-purple-500" />
                        <span className="text-slate-500">Evidence:</span>
                        {evidenceLocation ? (
                          <>
                            <span className="text-purple-600">
                              {evidenceLocation.sectionTitle} → {evidenceLocation.subheadingTitle}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 ${
                                evidenceLocation.fileCount > 0
                                  ? 'border-teal-300 text-teal-700 bg-teal-50'
                                  : 'border-amber-300 text-amber-700 bg-amber-50'
                              }`}
                            >
                              <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                              {evidenceLocation.fileCount} file{evidenceLocation.fileCount !== 1 ? 's' : ''}
                            </Badge>
                            {evidenceLocation.isArchived && (
                              <span className="text-amber-500">(archived)</span>
                            )}
                          </>
                        ) : (
                          <span className="text-amber-500 italic">Section not found</span>
                        )}
                      </div>

                      {/* Open Dossier Location button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => handleOpenDossierLocation(lensItem)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            <span className="text-[10px]">Open</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Open dossier location</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    /* No dossier link indicator */
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Unlink className="h-3 w-3" />
                      <span className="italic">No dossier link</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No checklist items linked</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
