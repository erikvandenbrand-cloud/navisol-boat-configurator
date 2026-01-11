/**
 * Owner's Manual Preview - v4
 * Read-only HTML preview of the Owner's Manual blocks.
 * Renders only included blocks with content and images.
 * Opens in a dialog with watermark banner.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Book,
  Eye,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  getChapterTitle,
  getSubchapterTitle,
} from '@/domain/models/document-template';

// ============================================
// TYPES
// ============================================

interface ManualBlockImageSlot {
  key: string;
  label?: string;
  dataUrl?: string;
  caption?: string;
}

interface ManualBlock {
  id: string;
  chapterId: string;
  subchapterId: string;
  included: boolean;
  content: string;
  imageSlots: ManualBlockImageSlot[];
}

interface OwnerManualPreviewProps {
  /** The Owner's Manual blocks data */
  blocks: ManualBlock[];
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Project title for header */
  projectTitle?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Group blocks by chapterId, preserving order.
 */
function groupBlocksByChapter(blocks: ManualBlock[]): Map<string, ManualBlock[]> {
  const grouped = new Map<string, ManualBlock[]>();
  for (const block of blocks) {
    const existing = grouped.get(block.chapterId) || [];
    existing.push(block);
    grouped.set(block.chapterId, existing);
  }
  return grouped;
}

/**
 * Convert markdown-like content to simple HTML.
 * Handles headings, paragraphs, bold, italic, and lists.
 */
function renderContentToHtml(content: string): string {
  if (!content || content.trim() === '') {
    return '<p class="text-slate-400 italic">No content</p>';
  }

  // Split into lines
  const lines = content.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Empty line
    if (trimmedLine === '') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    // Heading 3 (###)
    if (trimmedLine.startsWith('### ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h4 class="text-sm font-semibold text-slate-800 mt-4 mb-2">${formatInlineMarkdown(trimmedLine.slice(4))}</h4>`;
      continue;
    }

    // Heading 2 (##)
    if (trimmedLine.startsWith('## ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h3 class="text-base font-semibold text-slate-900 mt-4 mb-2">${formatInlineMarkdown(trimmedLine.slice(3))}</h3>`;
      continue;
    }

    // Heading 1 (#)
    if (trimmedLine.startsWith('# ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h2 class="text-lg font-bold text-slate-900 mt-4 mb-2">${formatInlineMarkdown(trimmedLine.slice(2))}</h2>`;
      continue;
    }

    // List item (- or *)
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (!inList) {
        html += '<ul class="list-disc list-inside my-2 text-slate-700">';
        inList = true;
      }
      html += `<li class="text-sm">${formatInlineMarkdown(trimmedLine.slice(2))}</li>`;
      continue;
    }

    // Regular paragraph
    if (inList) {
      html += '</ul>';
      inList = false;
    }
    html += `<p class="text-sm text-slate-700 my-2 leading-relaxed">${formatInlineMarkdown(trimmedLine)}</p>`;
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

/**
 * Escape HTML entities.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format inline markdown (bold, italic) and highlight unresolved tokens.
 */
function formatInlineMarkdown(text: string): string {
  let result = escapeHtml(text);
  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');
  // Highlight unresolved tokens: {{FIELD}} or {{IMAGE:key}}
  result = highlightUnresolvedTokens(result);
  return result;
}

/**
 * Detect and wrap unresolved {{FIELD}} and {{IMAGE:key}} tokens in a visual badge.
 * Tokens are highlighted with a yellow background and tooltip.
 */
function highlightUnresolvedTokens(html: string): string {
  // Match both {{FIELD}} and {{IMAGE:key}} patterns (already HTML-escaped: {{ becomes &#123;&#123; etc)
  // But since we escape before this, tokens look like: {{FIELD}}
  // Wait - escapeHtml replaces < > " ' & only, not { }, so tokens remain as-is

  // Pattern: {{IMAGE:key}} or {{FIELD_NAME}}
  const tokenRegex = /\{\{([A-Z0-9_:]+)\}\}/g;

  return html.replace(tokenRegex, (match, tokenContent) => {
    // Determine tooltip text based on token type
    const isImageToken = tokenContent.startsWith('IMAGE:');
    const tooltipText = isImageToken ? 'Image not set' : 'Value not set';

    return `<span class="unresolved-token" title="${tooltipText}" style="background-color: #fef9c3; color: #854d0e; padding: 0 4px; border-radius: 3px; font-size: 0.85em; font-family: monospace; border: 1px solid #fde047; cursor: help;">${match}</span>`;
  });
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OwnerManualPreview({
  blocks,
  open,
  onOpenChange,
  projectTitle,
}: OwnerManualPreviewProps) {
  // Filter to included blocks only
  const includedBlocks = useMemo(
    () => blocks.filter((b) => b.included),
    [blocks]
  );

  // Group by chapter
  const chapterGroups = useMemo(
    () => groupBlocksByChapter(includedBlocks),
    [includedBlocks]
  );
  const chapterIds = useMemo(
    () => Array.from(chapterGroups.keys()),
    [chapterGroups]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="owner-manual-preview-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-teal-600" />
            Owner's Manual Preview
          </DialogTitle>
          <DialogDescription>
            {projectTitle && <span className="font-medium">{projectTitle}</span>}
            {projectTitle && ' — '}
            Read-only preview of included sections
          </DialogDescription>
        </DialogHeader>

        {/* Draft Preview Banner */}
        <div
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg"
          data-testid="preview-draft-banner"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            Draft preview — not an approved document
          </p>
        </div>

        {/* Preview Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {includedBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Book className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm text-slate-500">No sections included in the manual.</p>
              <p className="text-xs text-slate-400 mt-1">
                Toggle sections to include them in the preview.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-8">
                {chapterIds.map((chapterId, chapterIndex) => {
                  const chapterBlocks = chapterGroups.get(chapterId) || [];
                  const chapterTitle = getChapterTitle(chapterId);

                  return (
                    <div key={chapterId} className="space-y-4">
                      {/* Chapter Header */}
                      <div className="border-b border-slate-200 pb-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {chapterIndex + 1}. {chapterTitle}
                        </h2>
                      </div>

                      {/* Subchapters */}
                      {chapterBlocks.map((block, blockIndex) => {
                        const subchapterTitle = getSubchapterTitle(
                          block.chapterId,
                          block.subchapterId
                        );

                        return (
                          <div
                            key={block.id}
                            className="pl-4 border-l-2 border-slate-100"
                          >
                            {/* Subchapter Header */}
                            <h3 className="text-base font-semibold text-slate-800 mb-3">
                              {chapterIndex + 1}.{blockIndex + 1} {subchapterTitle}
                            </h3>

                            {/* Content */}
                            <div
                              className="prose prose-sm max-w-none"
                              // biome-ignore lint/security/noDangerouslySetInnerHtml: rendering markdown preview
                              dangerouslySetInnerHTML={{
                                __html: renderContentToHtml(block.content),
                              }}
                            />

                            {/* Images */}
                            {block.imageSlots.filter((s) => s.dataUrl).length > 0 && (
                              <div className="mt-4 grid grid-cols-2 gap-4">
                                {block.imageSlots
                                  .filter((slot) => slot.dataUrl)
                                  .map((slot) => (
                                    <div
                                      key={slot.key}
                                      className="border rounded-lg overflow-hidden bg-slate-50"
                                    >
                                      <img
                                        src={slot.dataUrl}
                                        alt={slot.label || slot.key}
                                        className="w-full h-auto max-h-48 object-contain"
                                      />
                                      {slot.caption && (
                                        <p className="text-xs text-slate-500 text-center py-2 px-2 border-t bg-white">
                                          {slot.caption}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Footer */}
                <div className="pt-6 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-400">
                    End of Owner's Manual Preview — {includedBlocks.length} section
                    {includedBlocks.length !== 1 ? 's' : ''} included
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Badge variant="outline" className="mr-auto text-xs text-slate-500">
            <Eye className="h-3 w-3 mr-1" />
            Preview Mode
          </Badge>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// PREVIEW BUTTON (for toolbar use)
// ============================================

interface OwnerManualPreviewButtonProps {
  blocks: ManualBlock[];
  projectTitle?: string;
}

export function OwnerManualPreviewButton({
  blocks,
  projectTitle,
}: OwnerManualPreviewButtonProps) {
  const [open, setOpen] = useState(false);

  const includedCount = blocks.filter((b) => b.included).length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1"
        data-testid="owner-manual-preview-button"
        disabled={includedCount === 0}
        title={includedCount === 0 ? 'No sections included' : 'Open preview'}
      >
        <Eye className="h-4 w-4" />
        Preview
      </Button>
      <OwnerManualPreview
        blocks={blocks}
        open={open}
        onOpenChange={setOpen}
        projectTitle={projectTitle}
      />
    </>
  );
}
