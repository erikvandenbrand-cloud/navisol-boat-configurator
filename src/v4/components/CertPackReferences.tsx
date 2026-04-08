/**
 * CertPackReferences Component - v4
 *
 * Shows which certification packs reference a dossier section/subheading.
 * Displays counts per pack (passed / todo / failed).
 * Provides "Open certification pack at item" navigation links.
 *
 * UI-only, read-only annotation. No state mutations.
 * Derived at render time from existing data.
 */

'use client';

import { Shield, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import type { CertPackReference, SectionCertStats } from '@/domain/utils/information-linking';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// SECTION CERT STATS SUMMARY
// ============================================

interface CertStatsSummaryProps {
  stats: SectionCertStats;
  className?: string;
}

export function CertStatsSummary({ stats, className = '' }: CertStatsSummaryProps) {
  if (stats.packCount === 0) {
    return null;
  }

  const percentComplete = stats.totalItems > 0
    ? Math.round(((stats.passed + stats.na) / stats.totalItems) * 100)
    : 0;

  return (
    <div className={`flex items-center gap-2 text-[10px] ${className}`}>
      <Shield className="h-3 w-3 text-teal-500 flex-shrink-0" />
      <span className="text-slate-500">
        Referenced by {stats.packCount} pack{stats.packCount !== 1 ? 's' : ''}:
      </span>
      <div className="flex items-center gap-1.5">
        {stats.passed > 0 && (
          <span className="flex items-center gap-0.5 text-green-600">
            <CheckCircle className="h-2.5 w-2.5" />
            {stats.passed}
          </span>
        )}
        {stats.todo > 0 && (
          <span className="flex items-center gap-0.5 text-amber-600">
            <Clock className="h-2.5 w-2.5" />
            {stats.todo}
          </span>
        )}
        {stats.failed > 0 && (
          <span className="flex items-center gap-0.5 text-red-600">
            <XCircle className="h-2.5 w-2.5" />
            {stats.failed}
          </span>
        )}
      </div>
      <span className="text-slate-400">({percentComplete}%)</span>
    </div>
  );
}

// ============================================
// PACK REFERENCE BADGE
// ============================================

interface PackReferenceBadgeProps {
  ref: CertPackReference;
  onNavigate?: () => void;
}

export function PackReferenceBadge({ ref, onNavigate }: PackReferenceBadgeProps) {
  const getTypeColor = () => {
    switch (ref.packType) {
      case 'CE':
        return 'border-teal-300 bg-teal-50 text-teal-700';
      case 'ES_TRIN':
        return 'border-blue-300 bg-blue-50 text-blue-700';
      case 'LLOYDS':
        return 'border-purple-300 bg-purple-50 text-purple-700';
      default:
        return 'border-slate-300 bg-slate-50 text-slate-700';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium hover:opacity-80 transition-opacity ${getTypeColor()}`}
          >
            <Shield className="h-2.5 w-2.5" />
            {ref.packType}
            <span className="text-[8px] opacity-70">
              {ref.stats.passed}/{ref.stats.total - ref.stats.na}
            </span>
          </button>
        ) : (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium ${getTypeColor()}`}>
            <Shield className="h-2.5 w-2.5" />
            {ref.packType}
            <span className="text-[8px] opacity-70">
              {ref.stats.passed}/{ref.stats.total - ref.stats.na}
            </span>
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-xs space-y-1">
          <p className="font-medium">{ref.packName}</p>
          <p className="text-slate-400">Chapter: {ref.chapterTitle}</p>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
            <span className="text-green-400">{ref.stats.passed} passed</span>
            <span className="text-amber-400">{ref.stats.inProgress + ref.stats.notStarted} todo</span>
            {ref.stats.failed > 0 && <span className="text-red-400">{ref.stats.failed} failed</span>}
          </div>
          {onNavigate && (
            <p className="text-teal-400 text-[10px] pt-1">Click to open pack</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// CERT PACK REFERENCES LIST
// ============================================

interface CertPackReferencesProps {
  references: CertPackReference[];
  onNavigate?: (packId: string, chapterId: string) => void;
  compact?: boolean;
  className?: string;
}

export function CertPackReferences({ references, onNavigate, compact = false, className = '' }: CertPackReferencesProps) {
  if (references.length === 0) {
    return null;
  }

  if (compact) {
    // Compact mode: just show badges
    return (
      <div className={`flex items-center gap-1 flex-wrap ${className}`}>
        {references.map((ref) => (
          <PackReferenceBadge
            key={`${ref.packId}-${ref.chapterId}`}
            ref={ref}
            onNavigate={onNavigate ? () => onNavigate(ref.packId, ref.chapterId) : undefined}
          />
        ))}
      </div>
    );
  }

  // Full mode: show as list with navigation
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        <Shield className="h-3 w-3 text-teal-500" />
        <span>Referenced by {references.length} certification pack{references.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-1 pl-4">
        {references.map((ref) => (
          <div
            key={`${ref.packId}-${ref.chapterId}`}
            className="flex items-center justify-between p-1.5 bg-slate-50 rounded text-[10px]"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] px-1 py-0 border-teal-200 text-teal-700">
                {ref.packType}
              </Badge>
              <span className="text-slate-700">{ref.packName}</span>
              <span className="text-slate-400">→ {ref.chapterTitle}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Stats */}
              <div className="flex items-center gap-1">
                <span className="text-green-600">{ref.stats.passed}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500">{ref.stats.total - ref.stats.na}</span>
              </div>

              {/* Navigate button */}
              {onNavigate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                  onClick={() => onNavigate(ref.packId, ref.chapterId)}
                >
                  <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                  Open
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
