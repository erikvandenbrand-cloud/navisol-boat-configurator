/**
 * Work Instruction Quick View - v4
 * A popover/dialog for quick viewing work instruction content from task context.
 * Used in Kanban cards and task lists.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  ExternalLink,
  Clock,
  CheckCircle,
  Globe,
  Ship,
  X,
} from 'lucide-react';
import type { WorkInstruction } from '@/domain/models/work-instruction';
import { DEFAULT_PRODUCTION_STAGES } from '@/domain/models/production';
import { WorkInstructionService } from '@/domain/services/WorkInstructionService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================
// TYPES
// ============================================

interface WorkInstructionQuickViewProps {
  workInstructionId: string;
  children: React.ReactNode;
  mode?: 'popover' | 'dialog';
  onOpenFull?: () => void;
}

interface WorkInstructionBadgeProps {
  workInstructionId: string;
  className?: string;
  onOpenQuickView?: () => void;
}

// ============================================
// MARKDOWN RENDERER (simplified)
// ============================================

function renderMarkdownSimple(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold mt-3 mb-1 text-sm">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold mt-4 mb-2 text-sm">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold mt-4 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/- \[ \] (.+)$/gm, '<div class="flex items-center gap-1 my-0.5 text-xs"><span class="w-3 h-3 border border-slate-300 rounded-sm inline-block"></span>$1</div>')
    .replace(/- \[x\] (.+)$/gm, '<div class="flex items-center gap-1 my-0.5 text-xs text-slate-500 line-through"><span class="w-3 h-3 bg-green-500 rounded-sm inline-block"></span>$1</div>')
    .replace(/^- (.+)$/gm, '<li class="ml-3 text-xs">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-1.5 text-xs">')
    .replace(/\n/g, '<br>');
}

// ============================================
// WORK INSTRUCTION BADGE (inline indicator)
// ============================================

export function WorkInstructionBadge({
  workInstructionId,
  className = '',
  onOpenQuickView,
}: WorkInstructionBadgeProps) {
  const [instruction, setInstruction] = useState<WorkInstruction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    WorkInstructionService.getById(workInstructionId)
      .then(setInstruction)
      .finally(() => setIsLoading(false));
  }, [workInstructionId]);

  if (isLoading || !instruction) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenQuickView?.();
      }}
      className={`flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700 hover:underline ${className}`}
      title={`Work Instruction: ${instruction.title}`}
    >
      <FileText className="h-3 w-3" />
      <span className="max-w-[80px] truncate">{instruction.title}</span>
    </button>
  );
}

// ============================================
// QUICK VIEW CONTENT
// ============================================

interface QuickViewContentProps {
  instruction: WorkInstruction;
  onOpenFull?: () => void;
  onClose?: () => void;
}

function QuickViewContent({ instruction, onOpenFull, onClose }: QuickViewContentProps) {
  const getStageName = (code: string) => {
    const stage = DEFAULT_PRODUCTION_STAGES.find((s) => s.code === code);
    return stage?.name || code;
  };

  const isPublished = instruction.status === 'published';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">{instruction.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>{getStageName(instruction.stageCategory)}</span>
            <span>•</span>
            {instruction.scope === 'general' ? (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                General
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Ship className="h-3 w-3" />
                Model Specific
              </span>
            )}
          </div>
        </div>
        <Badge
          variant={isPublished ? 'default' : 'outline'}
          className={`text-[10px] ${
            isPublished
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'border-amber-300 text-amber-700 bg-amber-50'
          }`}
        >
          {isPublished ? (
            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
          ) : (
            <Clock className="h-2.5 w-2.5 mr-0.5" />
          )}
          {isPublished ? 'Published' : 'Draft'}
        </Badge>
      </div>

      {/* Content preview */}
      <ScrollArea className="max-h-[250px]">
        {instruction.content ? (
          <div
            className="text-xs text-slate-700 pr-2"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Controlled markdown
            dangerouslySetInnerHTML={{
              __html: `<p class="my-1.5 text-xs">${renderMarkdownSimple(instruction.content)}</p>`,
            }}
          />
        ) : (
          <p className="text-xs text-slate-400 italic">No content</p>
        )}
      </ScrollArea>

      {/* Footer */}
      {onOpenFull && (
        <div className="pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFull}
            className="w-full text-xs h-7 gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View Full Instruction
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// QUICK VIEW POPOVER
// ============================================

export function WorkInstructionQuickView({
  workInstructionId,
  children,
  mode = 'popover',
  onOpenFull,
}: WorkInstructionQuickViewProps) {
  const [instruction, setInstruction] = useState<WorkInstruction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadInstruction = useCallback(async () => {
    if (instruction) return;
    setIsLoading(true);
    try {
      const data = await WorkInstructionService.getById(workInstructionId);
      setInstruction(data);
    } finally {
      setIsLoading(false);
    }
  }, [workInstructionId, instruction]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadInstruction();
    }
  }, [loadInstruction]);

  if (mode === 'dialog') {
    return (
      <>
        <div onClick={() => handleOpenChange(true)}>{children}</div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" />
                Work Instruction
              </DialogTitle>
            </DialogHeader>
            {isLoading ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                Loading...
              </div>
            ) : instruction ? (
              <QuickViewContent
                instruction={instruction}
                onOpenFull={onOpenFull}
                onClose={() => setIsOpen(false)}
              />
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm">
                Instruction not found
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-3" side="right" align="start">
        {isLoading ? (
          <div className="py-4 text-center text-slate-500 text-sm">
            Loading...
          </div>
        ) : instruction ? (
          <QuickViewContent
            instruction={instruction}
            onOpenFull={onOpenFull}
          />
        ) : (
          <div className="py-4 text-center text-slate-500 text-sm">
            Instruction not found
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// LINKED INSTRUCTION INDICATOR (for task cards)
// ============================================

interface LinkedInstructionIndicatorProps {
  workInstructionId: string;
  compact?: boolean;
}

export function LinkedInstructionIndicator({
  workInstructionId,
  compact = false,
}: LinkedInstructionIndicatorProps) {
  const [instruction, setInstruction] = useState<WorkInstruction | null>(null);

  useEffect(() => {
    WorkInstructionService.getById(workInstructionId).then(setInstruction);
  }, [workInstructionId]);

  if (!instruction) return null;

  if (compact) {
    return (
      <WorkInstructionQuickView workInstructionId={workInstructionId}>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700"
          title={`Work Instruction: ${instruction.title}`}
        >
          <FileText className="h-3 w-3" />
        </button>
      </WorkInstructionQuickView>
    );
  }

  return (
    <WorkInstructionQuickView workInstructionId={workInstructionId}>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700 hover:underline"
        title={`Work Instruction: ${instruction.title}`}
      >
        <FileText className="h-3 w-3" />
        <span className="max-w-[100px] truncate">{instruction.title}</span>
      </button>
    </WorkInstructionQuickView>
  );
}
