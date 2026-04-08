/**
 * ComplianceLensSelector Component - v4
 *
 * A top-level view selector for Compliance UI.
 * "View as: Evidence | CE | ES-TRIN | ..."
 *
 * Evidence = default view showing Technical Dossier.
 * Certification modes = same dossier with contextual overlays.
 *
 * This selector does NOT change data, only rendering.
 * Follows v4 principles: Explicit, Calm UI, No state mutations.
 */

'use client';

import { Archive, Eye, Shield } from 'lucide-react';
import type { ComplianceLensMode } from '@/domain/utils/information-linking';
import {
  getLensModeLabel,
  getLensModeColor,
  getLensModeBgColor,
} from '@/domain/utils/information-linking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

interface ComplianceLensSelectorProps {
  availableModes: ComplianceLensMode[];
  currentMode: ComplianceLensMode;
  onModeChange: (mode: ComplianceLensMode) => void;
  className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ComplianceLensSelector({
  availableModes,
  currentMode,
  onModeChange,
  className = '',
}: ComplianceLensSelectorProps) {
  if (availableModes.length <= 1) {
    // Only Evidence mode available, no selector needed
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-500 flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" />
        View as:
      </span>
      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
        {availableModes.map((mode) => {
          const isActive = currentMode === mode;
          const label = getLensModeLabel(mode);
          const color = getLensModeColor(mode);
          const bgColor = isActive ? getLensModeBgColor(mode) : '';

          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onModeChange(mode)}
                  className={`h-7 px-2.5 text-xs transition-all ${
                    isActive
                      ? `${bgColor} ${color} font-medium shadow-sm`
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'evidence' ? (
                    <Archive className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 mr-1" />
                  )}
                  {label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {mode === 'evidence' ? (
                  <p>View Technical Dossier as canonical evidence archive</p>
                ) : (
                  <p>View through {label} certification lens</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// LENS CONTEXT BADGE
// ============================================

interface LensContextBadgeProps {
  mode: ComplianceLensMode;
  stats?: {
    passed: number;
    failed: number;
    todo: number;
    total: number;
  };
  compact?: boolean;
  className?: string;
}

export function LensContextBadge({
  mode,
  stats,
  compact = false,
  className = '',
}: LensContextBadgeProps) {
  if (mode === 'evidence') return null;

  const label = getLensModeLabel(mode);
  const color = getLensModeColor(mode);

  if (compact) {
    return (
      <Badge
        variant="outline"
        className={`text-[9px] px-1 py-0 ${color} border-current/30 ${className}`}
      >
        <Shield className="h-2 w-2 mr-0.5" />
        {mode}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-[10px] ${color} ${className}`}>
      <Shield className="h-3 w-3" />
      <span className="font-medium">{label}</span>
      {stats && stats.total > 0 && (
        <span className="text-slate-500">
          {stats.passed}/{stats.total - (stats.total - stats.passed - stats.failed - stats.todo)} items
        </span>
      )}
    </div>
  );
}

// ============================================
// LENS STATUS INDICATOR
// ============================================

interface LensStatusIndicatorProps {
  stats: {
    passed: number;
    failed: number;
    inProgress: number;
    notStarted: number;
    na: number;
    total: number;
  };
  showLabels?: boolean;
  className?: string;
}

export function LensStatusIndicator({
  stats,
  showLabels = false,
  className = '',
}: LensStatusIndicatorProps) {
  const todo = stats.inProgress + stats.notStarted;
  const effective = stats.total - stats.na;

  if (effective === 0) {
    return (
      <span className={`text-[10px] text-slate-400 ${className}`}>
        N/A
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-[10px] ${className}`}>
      {stats.passed > 0 && (
        <span className="flex items-center gap-0.5 text-green-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {stats.passed}
          {showLabels && ' passed'}
        </span>
      )}
      {todo > 0 && (
        <span className="flex items-center gap-0.5 text-amber-600">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {todo}
          {showLabels && ' todo'}
        </span>
      )}
      {stats.failed > 0 && (
        <span className="flex items-center gap-0.5 text-red-600">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {stats.failed}
          {showLabels && ' failed'}
        </span>
      )}
    </div>
  );
}

// ============================================
// LENS HIGHLIGHTED BORDER
// ============================================

interface LensHighlightWrapperProps {
  isHighlighted: boolean;
  mode: ComplianceLensMode;
  children: React.ReactNode;
  className?: string;
}

export function LensHighlightWrapper({
  isHighlighted,
  mode,
  children,
  className = '',
}: LensHighlightWrapperProps) {
  if (!isHighlighted || mode === 'evidence') {
    return <>{children}</>;
  }

  const getBorderColor = () => {
    switch (mode) {
      case 'CE': return 'border-l-teal-500';
      case 'ES_TRIN': return 'border-l-blue-500';
      case 'LLOYDS': return 'border-l-purple-500';
      case 'OTHER': return 'border-l-amber-500';
      default: return '';
    }
  };

  return (
    <div className={`border-l-2 ${getBorderColor()} ${className}`}>
      {children}
    </div>
  );
}
