/**
 * SourceHint Component - v4
 *
 * Displays a small "Source" hint for compliance fields showing:
 * - From Boat Model
 * - Overridden in Project
 * - Stored as Evidence in: Technical Dossier → Section X
 *
 * Also includes ChecklistEvidenceHint for checklist items showing:
 * - Evidence count (N files)
 * - "Open Dossier Location" action
 * - "No dossier link" indicator
 *
 * UI-only, read-only annotation. No state mutations.
 * Follows v4 principles: Explicit > Implicit, Calm UI.
 */

'use client';

import {
  Database,
  ExternalLink,
  FileEdit,
  FolderOpen,
  HelpCircle,
  Info,
  Paperclip,
  Unlink,
} from 'lucide-react';
import type { Project, ComplianceChecklistItem } from '@/domain/models';
import type { FieldSource, EvidenceLocation, ComplianceLensMode } from '@/domain/utils/information-linking';
import {
  navigateToDossierSection,
  getChecklistEvidenceLocation,
  hasChecklistDossierLink,
} from '@/domain/utils/information-linking';
import type { TechnicalFileSectionId } from '@/domain/models/technical-file';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// FIELD SOURCE HINT
// ============================================

interface SourceHintProps {
  source: FieldSource;
  className?: string;
}

export function SourceHint({ source, className = '' }: SourceHintProps) {
  const getIcon = () => {
    switch (source.type) {
      case 'boatModel':
        return <Database className="h-2.5 w-2.5" />;
      case 'project':
        return <FileEdit className="h-2.5 w-2.5" />;
      case 'dossier':
        return <FolderOpen className="h-2.5 w-2.5" />;
      default:
        return <HelpCircle className="h-2.5 w-2.5" />;
    }
  };

  const getColors = () => {
    switch (source.type) {
      case 'boatModel':
        return 'text-blue-500 bg-blue-50';
      case 'project':
        return source.isOverride ? 'text-amber-600 bg-amber-50' : 'text-teal-600 bg-teal-50';
      case 'dossier':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-slate-400 bg-slate-50';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium cursor-help ${getColors()} ${className}`}>
          {getIcon()}
          <span className="hidden sm:inline">{source.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-xs">
          <p className="font-medium">{source.label}</p>
          {source.context && (
            <p className="text-slate-400 mt-0.5">{source.context}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// EVIDENCE LOCATION HINT
// ============================================

interface EvidenceHintProps {
  evidence: EvidenceLocation;
  /** Custom navigate handler. If not provided and projectId is given, uses deep link navigation. */
  onNavigate?: () => void;
  /** Project ID for deep link navigation. Required if onNavigate is not provided. */
  projectId?: string;
  /** Optional lens mode to activate when navigating */
  lens?: ComplianceLensMode;
  className?: string;
}

export function EvidenceHint({ evidence, onNavigate, projectId, lens, className = '' }: EvidenceHintProps) {
  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    } else if (projectId) {
      navigateToDossierSection(
        projectId,
        evidence.sectionId,
        evidence.subheadingId,
        lens
      );
    }
  };

  const canNavigate = onNavigate || projectId;

  return (
    <div className={`flex items-center gap-1 text-[10px] ${className}`}>
      <FolderOpen className="h-3 w-3 text-purple-500 flex-shrink-0" />
      <span className="text-slate-500">Evidence:</span>
      {canNavigate ? (
        <button
          type="button"
          onClick={handleNavigate}
          className="text-purple-600 hover:text-purple-700 hover:underline truncate max-w-[200px]"
        >
          {evidence.sectionTitle} → {evidence.subheadingTitle}
        </button>
      ) : (
        <span className="text-purple-600 truncate max-w-[200px]">
          {evidence.sectionTitle} → {evidence.subheadingTitle}
        </span>
      )}
      {evidence.fileCount > 0 && (
        <span className="text-slate-400">({evidence.fileCount} files)</span>
      )}
      {evidence.isArchived && (
        <span className="text-amber-500">(archived)</span>
      )}
    </div>
  );
}

// ============================================
// DOSSIER SECTION LINK HINT
// ============================================

interface DossierSectionHintProps {
  sectionId: string;
  sectionTitle: string;
  /** Custom navigate handler. If not provided and projectId is given, uses deep link navigation. */
  onNavigate?: () => void;
  /** Project ID for deep link navigation. Required if onNavigate is not provided. */
  projectId?: string;
  /** Optional subheading ID to target */
  subheadingId?: string;
  /** Optional lens mode to activate when navigating */
  lens?: ComplianceLensMode;
  className?: string;
}

export function DossierSectionHint({
  sectionId,
  sectionTitle,
  onNavigate,
  projectId,
  subheadingId,
  lens,
  className = ''
}: DossierSectionHintProps) {
  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    } else if (projectId) {
      navigateToDossierSection(
        projectId,
        sectionId as TechnicalFileSectionId,
        subheadingId,
        lens
      );
    }
  };

  const canNavigate = onNavigate || projectId;

  return (
    <div className={`flex items-center gap-1 text-[10px] ${className}`}>
      <FolderOpen className="h-3 w-3 text-purple-500 flex-shrink-0" />
      <span className="text-slate-500">Evidence in:</span>
      {canNavigate ? (
        <button
          type="button"
          onClick={handleNavigate}
          className="text-purple-600 hover:text-purple-700 hover:underline"
        >
          Technical Dossier → {sectionTitle}
        </button>
      ) : (
        <span className="text-purple-600">
          Technical Dossier → {sectionTitle}
        </span>
      )}
    </div>
  );
}

// ============================================
// CHECKLIST EVIDENCE HINT
// ============================================

interface ChecklistEvidenceHintProps {
  /** The checklist item to show evidence for */
  item: ComplianceChecklistItem;
  /** The project containing the technical file */
  project: Project;
  /** Optional lens mode to activate when navigating */
  lens?: ComplianceLensMode;
  /** Whether to show the "Open" button (default: true) */
  showOpenButton?: boolean;
  /** Callback when dossier location is opened */
  onNavigate?: () => void;
  className?: string;
}

/**
 * ChecklistEvidenceHint - Shows evidence location and count for a checklist item.
 * Includes "Open Dossier Location" action when item has dossier link.
 * Shows "No dossier link" when mapping is missing.
 */
export function ChecklistEvidenceHint({
  item,
  project,
  lens,
  showOpenButton = true,
  onNavigate,
  className = '',
}: ChecklistEvidenceHintProps) {
  const hasDossierLink = hasChecklistDossierLink(item);
  const evidenceLocation = hasDossierLink
    ? getChecklistEvidenceLocation(project, item)
    : null;

  function handleOpenDossierLocation() {
    if (!item.dossierSectionId || !item.dossierSubheadingId) return;

    navigateToDossierSection(
      project.id,
      item.dossierSectionId,
      item.dossierSubheadingId,
      lens
    );

    onNavigate?.();
  }

  if (!hasDossierLink) {
    return (
      <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${className}`}>
        <Unlink className="h-3 w-3" />
        <span className="italic">No dossier link</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      {/* Evidence info */}
      <div className="flex items-center gap-1.5 text-[10px] min-w-0">
        <FolderOpen className="h-3 w-3 text-purple-500 flex-shrink-0" />
        <span className="text-slate-500">Evidence:</span>
        {evidenceLocation ? (
          <>
            <span className="text-purple-600 truncate max-w-[150px]">
              {evidenceLocation.sectionTitle} → {evidenceLocation.subheadingTitle}
            </span>
            <Badge
              variant="outline"
              className={`text-[9px] px-1 py-0 flex-shrink-0 ${
                evidenceLocation.fileCount > 0
                  ? 'border-teal-300 text-teal-700 bg-teal-50'
                  : 'border-amber-300 text-amber-700 bg-amber-50'
              }`}
            >
              <Paperclip className="h-2.5 w-2.5 mr-0.5" />
              {evidenceLocation.fileCount} file{evidenceLocation.fileCount !== 1 ? 's' : ''}
            </Badge>
            {evidenceLocation.isArchived && (
              <span className="text-amber-500 text-[9px]">(archived)</span>
            )}
          </>
        ) : (
          <span className="text-amber-500 italic">Section not found</span>
        )}
      </div>

      {/* Open button */}
      {showOpenButton && evidenceLocation && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 flex-shrink-0"
              onClick={handleOpenDossierLocation}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              <span className="text-[10px]">Open</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Open dossier location</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ============================================
// EVIDENCE COUNT BADGE
// ============================================

interface EvidenceCountBadgeProps {
  fileCount: number;
  className?: string;
}

/**
 * Simple badge showing file count with appropriate coloring.
 */
export function EvidenceCountBadge({ fileCount, className = '' }: EvidenceCountBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1 py-0 ${
        fileCount > 0
          ? 'border-teal-300 text-teal-700 bg-teal-50'
          : 'border-amber-300 text-amber-700 bg-amber-50'
      } ${className}`}
    >
      <Paperclip className="h-2.5 w-2.5 mr-0.5" />
      {fileCount} file{fileCount !== 1 ? 's' : ''}
    </Badge>
  );
}
