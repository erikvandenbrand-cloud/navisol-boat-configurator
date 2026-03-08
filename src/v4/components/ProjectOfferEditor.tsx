/**
 * Project Offer Editor - v4
 * UI for managing customer offer text on a quotation.
 *
 * Features:
 * - Initialize offer from template (explicit action)
 * - Edit individual blocks
 * - Re-apply template (full, non-edited, or selected blocks)
 * - Reset individual blocks to template
 *
 * GOVERNANCE:
 * - No background sync
 * - All template applications are explicit user actions
 * - Edited blocks are visually marked
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Check,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  Copy,
  ClipboardPaste,
} from 'lucide-react';
import type {
  ProjectOffer,
  ProjectOfferBlock,
  OfferTemplate,
  ReapplyMode,
  OfferVariableContext,
} from '@/domain/models/offer-template';
import type { ProjectQuote, Project } from '@/domain/models';
import { OfferTemplateService } from '@/domain/services/OfferTemplateService';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

interface ProjectOfferEditorProps {
  /** The project containing this quote */
  project: Project;
  /** The quote being edited */
  quote: ProjectQuote;
  /** Client name for variable resolution */
  clientName?: string;
  /** Boat model name for variable resolution */
  boatModelName?: string;
  /** Callback when offer is updated */
  onOfferChange: (offer: ProjectOffer) => void;
  /** Whether the quote is read-only (SENT, ACCEPTED, etc.) */
  readOnly?: boolean;
}

// ============================================
// HELPERS
// ============================================

function buildVariableContext(
  project: Project,
  quote: ProjectQuote,
  clientName?: string,
  boatModelName?: string
): OfferVariableContext {
  return {
    projectNumber: project.projectNumber,
    projectTitle: project.title,
    clientName: clientName || 'Customer',
    boatModel: boatModelName || project.configuration.boatModelVersionId || 'Boat',
    deliveryWeeks: quote.deliveryWeeks,
    totalExclVat: quote.totalExclVat,
    totalInclVat: quote.totalInclVat,
    quoteNumber: quote.quoteNumber,
    validUntil: quote.validUntil,
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProjectOfferEditor({
  project,
  quote,
  clientName,
  boatModelName,
  onOfferChange,
  readOnly = false,
}: ProjectOfferEditorProps) {
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Dialog states
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showReapplyDialog, setShowReapplyDialog] = useState(false);
  const [showResetBlockDialog, setShowResetBlockDialog] = useState<string | null>(null);

  // Editing state
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Re-apply options
  const [reapplyMode, setReapplyMode] = useState<ReapplyMode>('non-edited');
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  // Collapsed state for blocks
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const offer = quote.offer;

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      setIsLoadingTemplates(true);
      try {
        await OfferTemplateService.initializeSeedData();
        const all = await OfferTemplateService.getAll();
        setTemplates(all);

        // Pre-select default template
        const defaultTemplate = all.find((t) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        } else if (all.length > 0) {
          setSelectedTemplateId(all[0].id);
        }
      } catch (error) {
        console.error('Failed to load offer templates:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  // Expand all blocks by default when offer is first loaded
  useEffect(() => {
    if (offer && expandedBlocks.size === 0) {
      setExpandedBlocks(new Set(offer.blocks.map((b) => b.blockId)));
    }
  }, [offer, expandedBlocks.size]);

  // Variable context for template rendering
  const variableContext = useMemo(
    () => buildVariableContext(project, quote, clientName, boatModelName),
    [project, quote, clientName, boatModelName]
  );

  // Stats
  const editedCount = offer ? OfferTemplateService.getEditedBlockCount(offer) : 0;
  const totalBlocks = offer?.blocks.length || 0;

  // ============================================
  // HANDLERS
  // ============================================

  async function handleInitialize() {
    if (!selectedTemplateId) return;

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.initializeFromTemplate(
      selectedTemplateId,
      variableContext,
      context
    );

    if (result.ok) {
      onOfferChange(result.value);
      setShowInitDialog(false);
    } else {
      alert(result.error);
    }
  }

  function handleStartEdit(block: ProjectOfferBlock) {
    setEditingBlockId(block.blockId);
    setEditingText(block.text);
  }

  function handleSaveEdit() {
    if (!offer || !editingBlockId) return;

    const context = getDefaultAuditContext();
    const result = OfferTemplateService.updateBlock(offer, editingBlockId, editingText, context);

    if (result.ok) {
      onOfferChange(result.value);
      setEditingBlockId(null);
      setEditingText('');
    } else {
      alert(result.error);
    }
  }

  function handleCancelEdit() {
    setEditingBlockId(null);
    setEditingText('');
  }

  async function handleResetBlock(blockId: string) {
    if (!offer) return;

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.resetBlock(offer, blockId, variableContext, context);

    if (result.ok) {
      onOfferChange(result.value);
      setShowResetBlockDialog(null);
    } else {
      alert(result.error);
    }
  }

  async function handleReapply() {
    if (!offer) return;

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.reapplyTemplate(
      offer,
      {
        mode: reapplyMode,
        selectedBlockIds: reapplyMode === 'selected' ? selectedBlockIds : undefined,
      },
      variableContext,
      context
    );

    if (result.ok) {
      onOfferChange(result.value);
      setShowReapplyDialog(false);
      setReapplyMode('non-edited');
      setSelectedBlockIds([]);
    } else {
      alert(result.error);
    }
  }

  function toggleBlockExpanded(blockId: string) {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }

  function toggleSelectBlock(blockId: string) {
    setSelectedBlockIds((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId]
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              Customer Offer
            </CardTitle>
            <CardDescription>
              {offer
                ? `Based on "${offer.templateName}" template`
                : 'Initialize from a template to create offer text'}
            </CardDescription>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {offer ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReapplyDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-apply Template
                  </Button>
                </>
              ) : (
                <Button onClick={() => setShowInitDialog(true)} disabled={isLoadingTemplates}>
                  <Plus className="h-4 w-4 mr-2" />
                  Initialize from Template
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {!offer ? (
            // No offer yet - show empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">No offer text</h4>
              <p className="text-sm text-slate-500 max-w-xs mb-5">
                Initialize customer offer from a template to include terms, delivery info, and
                warranty details.
              </p>
              {!readOnly && (
                <Button
                  variant="outline"
                  onClick={() => setShowInitDialog(true)}
                  disabled={isLoadingTemplates}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Initialize from Template
                </Button>
              )}
            </div>
          ) : (
            // Show offer blocks
            <div className="space-y-3">
              {/* Stats bar */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>{totalBlocks} blocks</span>
                  {editedCount > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      {editedCount} edited
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Template v{offer.templateVersionUsed} · Initialized{' '}
                  {new Date(offer.initializedAt).toLocaleDateString('en-GB')}
                </div>
              </div>

              {/* Blocks */}
              {offer.blocks.map((block) => (
                <OfferBlockCard
                  key={block.blockId}
                  block={block}
                  isEditing={editingBlockId === block.blockId}
                  editingText={editingText}
                  onEditingTextChange={setEditingText}
                  isExpanded={expandedBlocks.has(block.blockId)}
                  onToggleExpanded={() => toggleBlockExpanded(block.blockId)}
                  onStartEdit={() => handleStartEdit(block)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onReset={() => setShowResetBlockDialog(block.blockId)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initialize Dialog */}
      <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              Initialize Customer Offer
            </DialogTitle>
            <DialogDescription>
              Select a template to create the offer text. Variables like client name and delivery
              time will be automatically filled in.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="flex items-center gap-2">
                        {template.name}
                        {template.isDefault && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Default
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateId && (
              <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                <p className="font-medium mb-1">
                  {templates.find((t) => t.id === selectedTemplateId)?.name}
                </p>
                <p className="text-slate-500">
                  {templates.find((t) => t.id === selectedTemplateId)?.blocks.length || 0} blocks
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitialize} disabled={!selectedTemplateId}>
              <Check className="h-4 w-4 mr-2" />
              Initialize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-apply Dialog */}
      <Dialog open={showReapplyDialog} onOpenChange={setShowReapplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-teal-600" />
              Re-apply Template
            </DialogTitle>
            <DialogDescription>
              Update offer blocks from the template. Choose which blocks to overwrite.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Re-apply mode selection */}
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  reapplyMode === 'all'
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setReapplyMode('all')}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      reapplyMode === 'all'
                        ? 'border-teal-600 bg-teal-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {reapplyMode === 'all' && (
                      <Check className="h-3 w-3 text-white mx-auto mt-0.5" />
                    )}
                  </div>
                  <span className="font-medium text-sm">Overwrite all blocks</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Replace all blocks with template defaults. Edited changes will be lost.
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  reapplyMode === 'non-edited'
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setReapplyMode('non-edited')}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      reapplyMode === 'non-edited'
                        ? 'border-teal-600 bg-teal-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {reapplyMode === 'non-edited' && (
                      <Check className="h-3 w-3 text-white mx-auto mt-0.5" />
                    )}
                  </div>
                  <span className="font-medium text-sm">Only non-edited blocks</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Keep your edited blocks, update the rest from template.
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  reapplyMode === 'selected'
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setReapplyMode('selected')}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      reapplyMode === 'selected'
                        ? 'border-teal-600 bg-teal-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {reapplyMode === 'selected' && (
                      <Check className="h-3 w-3 text-white mx-auto mt-0.5" />
                    )}
                  </div>
                  <span className="font-medium text-sm">Select specific blocks</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Choose exactly which blocks to overwrite.
                </p>
              </div>
            </div>

            {/* Block selection (when mode is 'selected') */}
            {reapplyMode === 'selected' && offer && (
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {offer.blocks.map((block) => (
                  <div key={block.blockId} className="flex items-center gap-2">
                    <Checkbox
                      id={`block-${block.blockId}`}
                      checked={selectedBlockIds.includes(block.blockId)}
                      onCheckedChange={() => toggleSelectBlock(block.blockId)}
                    />
                    <Label
                      htmlFor={`block-${block.blockId}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {block.title}
                      {block.isEdited && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] py-0 text-amber-600 border-amber-200"
                        >
                          Edited
                        </Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {/* Warning for 'all' mode */}
            {reapplyMode === 'all' && editedCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This will overwrite {editedCount} edited block{editedCount !== 1 ? 's' : ''}.
                  Your changes will be lost.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReapplyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReapply}
              disabled={reapplyMode === 'selected' && selectedBlockIds.length === 0}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Block Confirmation */}
      <AlertDialog
        open={!!showResetBlockDialog}
        onOpenChange={(open) => !open && setShowResetBlockDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Block to Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the block content with the template default. Your edits will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => showResetBlockDialog && handleResetBlock(showResetBlockDialog)}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

// ============================================
// OFFER BLOCK CARD
// ============================================

interface OfferBlockCardProps {
  block: ProjectOfferBlock;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onReset: () => void;
  readOnly: boolean;
}

function OfferBlockCard({
  block,
  isEditing,
  editingText,
  onEditingTextChange,
  isExpanded,
  onToggleExpanded,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onReset,
  readOnly,
}: OfferBlockCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div
            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 ${
              isExpanded ? 'border-b' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
              <span className="font-medium text-slate-900">{block.title}</span>
              {block.isEdited && (
                <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-200">
                  Edited
                </Badge>
              )}
            </div>

            {!readOnly && !isEditing && isExpanded && (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onStartEdit}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
                {block.isEdited && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                        onClick={onReset}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset to template</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="p-3">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editingText}
                  onChange={(e) => onEditingTextChange(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={onCancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={onSaveEdit}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{block.text}</div>
            )}

            {/* Edit metadata */}
            {block.isEdited && block.editedAt && !isEditing && (
              <div className="mt-3 pt-2 border-t text-xs text-slate-400">
                Last edited {new Date(block.editedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
