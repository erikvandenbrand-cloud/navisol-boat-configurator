/**
 * Owner's Manual Blocks Editor - v4
 * Modular editor for Owner's Manual template with chapters and subchapters.
 * Renders blocks grouped by chapter, with include toggles and content editing.
 * Uses catalogue titles when available.
 */

'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Book,
  ChevronRight,
  ChevronDown,
  Edit,
  Eye,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Settings2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  getChapterTitle,
  getSubchapterTitle,
  getCatalogueSubchapter,
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
  aiAssisted?: boolean;
}

interface OwnerManualBlocksEditorProps {
  /** The Owner's Manual blocks data (ManualBlock[] structure) */
  value: ManualBlock[] | any;
  /** Callback when blocks are modified */
  onChange: (next: ManualBlock[]) => void;
  /** If true, editor is read-only (APPROVED version) */
  readOnly?: boolean;
  /** If true, this version contains AI-assisted seed content */
  aiAssisted?: boolean;
  /** Project systems array for displaying system key indicators */
  projectSystems?: string[];
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a chapter/subchapter ID into a readable label.
 * Falls back to this when catalogue lookup fails.
 * e.g., "vessel-identification" -> "Vessel Identification"
 */
function formatLabel(id: string): string {
  return id
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a system key for display.
 * e.g., "shore_power" -> "shore_power" (kept short for badge)
 */
function formatSystemKey(key: string): string {
  return key.replace(/_/g, '_');
}

/**
 * Group blocks by chapterId, preserving order of first appearance.
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
 * Get the active system key for a block (if its catalogue subchapter has a systemKey
 * and that key is present in projectSystems).
 */
function getActiveSystemKey(
  block: ManualBlock,
  projectSystems: string[] | undefined
): string | null {
  if (!projectSystems || projectSystems.length === 0) return null;

  const subchapter = getCatalogueSubchapter(block.chapterId, block.subchapterId);
  if (!subchapter?.systemKey) return null;

  if (projectSystems.includes(subchapter.systemKey)) {
    return subchapter.systemKey;
  }

  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OwnerManualBlocksEditor({
  value,
  onChange,
  readOnly = false,
  aiAssisted = false,
  projectSystems,
}: OwnerManualBlocksEditorProps) {
  // Ensure value is an array
  const blocks: ManualBlock[] = Array.isArray(value) ? value : [];

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
    // Start with first chapter expanded
    const chapters = new Set<string>();
    if (blocks.length > 0) {
      chapters.add(blocks[0].chapterId);
    }
    return chapters;
  });
  const [showDebug, setShowDebug] = useState(false);

  // Group blocks by chapter
  const chapterGroups = useMemo(() => groupBlocksByChapter(blocks), [blocks]);
  const chapterIds = useMemo(() => Array.from(chapterGroups.keys()), [chapterGroups]);

  // Find selected block
  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId),
    [blocks, selectedBlockId]
  );

  // Get active system key for selected block
  const selectedBlockSystemKey = useMemo(
    () => selectedBlock ? getActiveSystemKey(selectedBlock, projectSystems) : null,
    [selectedBlock, projectSystems]
  );

  // ============================================
  // HANDLERS
  // ============================================

  function handleToggleChapter(chapterId: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  function handleSelectBlock(blockId: string) {
    setSelectedBlockId(blockId);
  }

  function handleToggleIncluded(blockId: string) {
    if (readOnly) return;
    const updatedBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      return { ...block, included: !block.included };
    });
    onChange(updatedBlocks);
  }

  function handleContentChange(blockId: string, newContent: string) {
    if (readOnly) return;
    const updatedBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      return { ...block, content: newContent };
    });
    onChange(updatedBlocks);
  }

  function handleImageUpload(blockId: string, slotKey: string, dataUrl: string) {
    if (readOnly) return;
    const updatedBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      const updatedSlots = block.imageSlots.map((slot) => {
        if (slot.key !== slotKey) return slot;
        return { ...slot, dataUrl };
      });
      return { ...block, imageSlots: updatedSlots };
    });
    onChange(updatedBlocks);
  }

  function handleImageRemove(blockId: string, slotKey: string) {
    if (readOnly) return;
    const updatedBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      const updatedSlots = block.imageSlots.map((slot) => {
        if (slot.key !== slotKey) return slot;
        return { ...slot, dataUrl: undefined, caption: undefined };
      });
      return { ...block, imageSlots: updatedSlots };
    });
    onChange(updatedBlocks);
  }

  function handleCaptionChange(blockId: string, slotKey: string, caption: string) {
    if (readOnly) return;
    const updatedBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      const updatedSlots = block.imageSlots.map((slot) => {
        if (slot.key !== slotKey) return slot;
        return { ...slot, caption };
      });
      return { ...block, imageSlots: updatedSlots };
    });
    onChange(updatedBlocks);
  }

  // ============================================
  // RENDER
  // ============================================

  if (blocks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full min-h-[400px] text-center py-12 bg-slate-50 rounded-lg"
        data-testid="owner-manual-blocks-editor"
      >
        <Book className="h-12 w-12 text-slate-200 mb-3" />
        <p className="text-sm text-slate-500">No modular blocks available.</p>
        <p className="text-xs text-slate-400 mt-1">
          This Owner's Manual template does not have structured blocks.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full min-h-[500px] border rounded-lg bg-white"
      data-testid="owner-manual-blocks-editor"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-teal-600" />
          <h3 className="font-medium text-slate-900">Owner's Manual Editor</h3>
          {readOnly && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Read-only
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            {blocks.filter((b) => b.included).length} / {blocks.length} sections included
          </span>
        </div>
      </div>

      {/* AI-Assisted Draft Banner */}
      {!readOnly && aiAssisted && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 border-b border-purple-200"
          data-testid="ai-assisted-banner"
        >
          <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0" />
          <p className="text-sm text-purple-700">
            AI-assisted draft text — review before approval
          </p>
        </div>
      )}

      {/* Systems Linkage Info Banner */}
      {projectSystems && projectSystems.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 border-b border-slate-200"
          data-testid="systems-linkage-banner"
        >
          <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-600">
            Systems affect default inclusion; your manual edits are not auto-overwritten.
          </p>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Column: Chapters/Subchapters */}
        <div className="w-72 border-r bg-slate-50 flex flex-col">
          <div className="px-3 py-2 border-b">
            <h4 className="text-sm font-medium text-slate-700">Chapters</h4>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chapterIds.map((chapterId) => {
                const chapterBlocks = chapterGroups.get(chapterId) || [];
                const isExpanded = expandedChapters.has(chapterId);
                const includedCount = chapterBlocks.filter((b) => b.included).length;

                return (
                  <div key={chapterId} className="space-y-0.5">
                    {/* Chapter Header */}
                    <button
                      type="button"
                      onClick={() => handleToggleChapter(chapterId)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="font-medium truncate flex-1 text-left">
                        {getChapterTitle(chapterId)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {includedCount}/{chapterBlocks.length}
                      </span>
                    </button>

                    {/* Subchapters (when expanded) */}
                    {isExpanded && (
                      <div className="ml-4 space-y-0.5">
                        {chapterBlocks.map((block) => {
                          const isSelected = selectedBlockId === block.id;
                          const activeSystemKey = getActiveSystemKey(block, projectSystems);

                          return (
                            <div
                              key={block.id}
                              className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                                isSelected
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {/* Include checkbox */}
                              <Checkbox
                                checked={block.included}
                                onCheckedChange={() => handleToggleIncluded(block.id)}
                                disabled={readOnly}
                                className="h-3.5 w-3.5"
                              />
                              {/* Subchapter label (clickable to select) */}
                              <button
                                type="button"
                                onClick={() => handleSelectBlock(block.id)}
                                className="flex-1 text-left text-xs truncate"
                              >
                                {getSubchapterTitle(block.chapterId, block.subchapterId)}
                              </button>
                              {/* System key indicator */}
                              {activeSystemKey && (
                                <span
                                  className="text-[9px] bg-cyan-100 text-cyan-700 px-1 rounded flex items-center gap-0.5 flex-shrink-0"
                                  title={`Auto-included via Vessel Systems: ${activeSystemKey}`}
                                  data-testid={`system-key-badge-${block.id}`}
                                >
                                  <Settings2 className="h-2.5 w-2.5" />
                                  {formatSystemKey(activeSystemKey)}
                                </span>
                              )}
                              {/* AI assisted indicator */}
                              {block.aiAssisted && (
                                <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded">
                                  AI
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedBlock ? (
            <>
              {/* Block Header */}
              <div className="px-4 py-2 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-900 truncate">
                    {getChapterTitle(selectedBlock.chapterId)}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {getSubchapterTitle(selectedBlock.chapterId, selectedBlock.subchapterId)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* System key indicator in header */}
                  {selectedBlockSystemKey && (
                    <span
                      className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded flex items-center gap-1"
                      title={`This section is auto-included via Vessel Systems: ${selectedBlockSystemKey}`}
                      data-testid="selected-block-system-key"
                    >
                      <Settings2 className="h-3 w-3" />
                      Auto: {formatSystemKey(selectedBlockSystemKey)}
                    </span>
                  )}
                  {/* Include toggle */}
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <Checkbox
                      checked={selectedBlock.included}
                      onCheckedChange={() => handleToggleIncluded(selectedBlock.id)}
                      disabled={readOnly}
                    />
                    <span>Include</span>
                  </label>
                  {selectedBlock.aiAssisted && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                      AI-assisted
                    </span>
                  )}
                </div>
              </div>

              {/* Content Editor */}
              <div className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-auto">
                {/* Content Textarea */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Content</Label>
                  <Textarea
                    value={selectedBlock.content}
                    onChange={(e) => handleContentChange(selectedBlock.id, e.target.value)}
                    disabled={readOnly}
                    className="min-h-[200px] font-mono text-sm resize-y"
                    placeholder="Enter section content..."
                  />
                </div>

                {/* Image Slots */}
                {selectedBlock.imageSlots.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Image Slots</Label>
                    <div className="space-y-3">
                      {selectedBlock.imageSlots.map((slot) => (
                        <ImageSlotEditor
                          key={slot.key}
                          slot={slot}
                          readOnly={readOnly}
                          onUpload={(dataUrl) =>
                            handleImageUpload(selectedBlock.id, slot.key, dataUrl)
                          }
                          onRemove={() => handleImageRemove(selectedBlock.id, slot.key)}
                          onCaptionChange={(caption) =>
                            handleCaptionChange(selectedBlock.id, slot.key, caption)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No block selected */
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Book className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm text-slate-500">
                Select a section from the left panel to edit its content.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel (collapsible) */}
      <div className="border-t bg-slate-50 px-3 py-1">
        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
        >
          {showDebug ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Debug
        </button>
        {showDebug && (
          <pre className="mt-2 p-2 bg-slate-100 rounded overflow-auto max-h-40 text-xs text-slate-600">
            {JSON.stringify(value, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ============================================
// IMAGE SLOT EDITOR
// ============================================

interface ImageSlotEditorProps {
  slot: ManualBlockImageSlot;
  readOnly: boolean;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
  onCaptionChange: (caption: string) => void;
}

function ImageSlotEditor({
  slot,
  readOnly,
  onUpload,
  onRemove,
  onCaptionChange,
}: ImageSlotEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onUpload(dataUrl);
      };
      reader.readAsDataURL(file);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onUpload]
  );

  const label = slot.label || formatLabel(slot.key);
  const hasImage = !!slot.dataUrl;

  return (
    <div className="border rounded-lg p-3 bg-white" data-testid={`block-image-slot-${slot.key}`}>
      <div className="flex items-start gap-3">
        {/* Image Preview or Placeholder */}
        <div className="w-16 h-16 rounded border bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {hasImage ? (
            <img src={slot.dataUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-slate-300" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{label}</p>
          <p className="text-xs text-slate-500 mb-2">
            <code className="bg-slate-100 px-1 rounded">{`{{IMAGE:${slot.key}}}`}</code>
          </p>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                {hasImage ? 'Replace' : 'Upload'}
              </Button>
              {hasImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          )}

          {hasImage && (
            <div className="mt-2">
              <Input
                type="text"
                placeholder="Caption (optional)"
                value={slot.caption || ''}
                onChange={(e) => onCaptionChange(e.target.value)}
                disabled={readOnly}
                className="h-7 text-xs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
