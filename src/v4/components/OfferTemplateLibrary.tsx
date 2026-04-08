/**
 * Offer Template Library - v4
 * UI for managing Offer Templates in the library.
 *
 * Features:
 * - List all templates
 * - Create new templates
 * - Edit template blocks
 * - Set default template
 * - Archive templates
 */

'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Check,
  Star,
  StarOff,
  Archive,
  RotateCcw,
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  Copy,
  Sparkles,
} from 'lucide-react';
import type {
  OfferTemplate,
  OfferTemplateBlock,
  CreateOfferTemplateInput,
} from '@/domain/models/offer-template';
import { OfferTemplateService } from '@/domain/services/OfferTemplateService';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { generateUUID } from '@/domain/models';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

interface BlockFormData {
  blockId: string;
  title: string;
  defaultText: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function OfferTemplateLibrary() {
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OfferTemplate | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<OfferTemplate | null>(null);

  // Form state for create/edit
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBlocks, setFormBlocks] = useState<BlockFormData[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoading(true);
    try {
      await OfferTemplateService.initializeSeedData();
      const all = await OfferTemplateService.getAll();
      setTemplates(all);
    } catch (error) {
      console.error('Failed to load offer templates:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormDescription('');
    setFormBlocks([]);
    setExpandedBlocks(new Set());
  }

  function openCreateDialog() {
    resetForm();
    // Start with a default block
    const defaultBlock: BlockFormData = {
      blockId: generateUUID(),
      title: 'Introduction',
      defaultText: 'Dear {{clientName}},\n\nThank you for your interest...',
    };
    setFormBlocks([defaultBlock]);
    setExpandedBlocks(new Set([defaultBlock.blockId]));
    setShowCreateDialog(true);
  }

  function openEditDialog(template: OfferTemplate) {
    setFormName(template.name);
    setFormDescription(template.description || '');
    setFormBlocks(
      template.blocks.map((b) => ({
        blockId: b.blockId,
        title: b.title,
        defaultText: b.defaultText,
      }))
    );
    setExpandedBlocks(new Set(template.blocks.map((b) => b.blockId)));
    setEditingTemplate(template);
  }

  function addBlock() {
    const newBlock: BlockFormData = {
      blockId: generateUUID(),
      title: `Block ${formBlocks.length + 1}`,
      defaultText: '',
    };
    setFormBlocks([...formBlocks, newBlock]);
    setExpandedBlocks((prev) => new Set([...prev, newBlock.blockId]));
  }

  function removeBlock(blockId: string) {
    setFormBlocks(formBlocks.filter((b) => b.blockId !== blockId));
  }

  function updateBlock(blockId: string, field: 'title' | 'defaultText', value: string) {
    setFormBlocks(
      formBlocks.map((b) => (b.blockId === blockId ? { ...b, [field]: value } : b))
    );
  }

  function moveBlock(blockId: string, direction: 'up' | 'down') {
    const index = formBlocks.findIndex((b) => b.blockId === blockId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formBlocks.length) return;

    const newBlocks = [...formBlocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setFormBlocks(newBlocks);
  }

  async function handleCreate() {
    if (!formName.trim()) {
      alert('Template name is required');
      return;
    }
    if (formBlocks.length === 0) {
      alert('At least one block is required');
      return;
    }

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.create(
      {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        blocks: formBlocks.map((b) => ({
          blockId: b.blockId,
          title: b.title.trim(),
          defaultText: b.defaultText,
        })),
      },
      context
    );

    if (result.ok) {
      setShowCreateDialog(false);
      resetForm();
      loadTemplates();
    } else {
      alert(result.error);
    }
  }

  async function handleUpdate() {
    if (!editingTemplate) return;
    if (!formName.trim()) {
      alert('Template name is required');
      return;
    }
    if (formBlocks.length === 0) {
      alert('At least one block is required');
      return;
    }

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.update(
      editingTemplate.id,
      {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        blocks: formBlocks.map((b) => ({
          blockId: b.blockId,
          title: b.title.trim(),
          defaultText: b.defaultText,
        })),
      },
      context
    );

    if (result.ok) {
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } else {
      alert(result.error);
    }
  }

  async function handleSetDefault(templateId: string) {
    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.update(templateId, { isDefault: true }, context);
    if (result.ok) {
      loadTemplates();
    } else {
      alert(result.error);
    }
  }

  async function handleArchive(templateId: string) {
    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.archive(templateId, context);
    if (result.ok) {
      setArchiveTarget(null);
      loadTemplates();
    } else {
      alert(result.error);
    }
  }

  async function handleDuplicate(template: OfferTemplate) {
    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.create(
      {
        name: `${template.name} (Copy)`,
        description: template.description,
        blocks: template.blocks.map((b) => ({
          blockId: generateUUID(),
          title: b.title,
          defaultText: b.defaultText,
          variables: b.variables,
        })),
      },
      context
    );

    if (result.ok) {
      loadTemplates();
    } else {
      alert(result.error);
    }
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
              <Sparkles className="h-5 w-5 text-teal-600" />
              Offer Templates
            </CardTitle>
            <CardDescription>
              Templates for customer offer text in quotations
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">No templates</h4>
              <p className="text-sm text-slate-500 max-w-xs mb-5">
                Create offer templates to use when generating quotations.
              </p>
              <Button variant="outline" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => openEditDialog(template)}
                  onSetDefault={() => handleSetDefault(template.id)}
                  onArchive={() => setArchiveTarget(template)}
                  onDuplicate={() => handleDuplicate(template)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <TemplateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Create Offer Template"
        description="Create a new template with blocks for customer offers."
        formName={formName}
        formDescription={formDescription}
        formBlocks={formBlocks}
        expandedBlocks={expandedBlocks}
        onNameChange={setFormName}
        onDescriptionChange={setFormDescription}
        onUpdateBlock={updateBlock}
        onAddBlock={addBlock}
        onRemoveBlock={removeBlock}
        onMoveBlock={moveBlock}
        onToggleBlockExpanded={(blockId) =>
          setExpandedBlocks((prev) => {
            const next = new Set(prev);
            if (next.has(blockId)) {
              next.delete(blockId);
            } else {
              next.add(blockId);
            }
            return next;
          })
        }
        onSubmit={handleCreate}
        submitLabel="Create Template"
      />

      {/* Edit Dialog */}
      <TemplateFormDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        title="Edit Offer Template"
        description="Update the template blocks and content."
        formName={formName}
        formDescription={formDescription}
        formBlocks={formBlocks}
        expandedBlocks={expandedBlocks}
        onNameChange={setFormName}
        onDescriptionChange={setFormDescription}
        onUpdateBlock={updateBlock}
        onAddBlock={addBlock}
        onRemoveBlock={removeBlock}
        onMoveBlock={moveBlock}
        onToggleBlockExpanded={(blockId) =>
          setExpandedBlocks((prev) => {
            const next = new Set(prev);
            if (next.has(blockId)) {
              next.delete(blockId);
            } else {
              next.add(blockId);
            }
            return next;
          })
        }
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />

      {/* Archive Confirmation */}
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archiveTarget?.name}"? Archived templates cannot be
              used for new offers but existing offers are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveTarget && handleArchive(archiveTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

// ============================================
// TEMPLATE CARD
// ============================================

interface TemplateCardProps {
  template: OfferTemplate;
  onEdit: () => void;
  onSetDefault: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
}

function TemplateCard({
  template,
  onEdit,
  onSetDefault,
  onArchive,
  onDuplicate,
}: TemplateCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-teal-50">
          <FileText className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{template.name}</span>
            {template.isDefault && (
              <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] py-0">
                <Star className="h-3 w-3 mr-0.5 fill-current" />
                Default
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-slate-500 mt-0.5">{template.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{template.blocks.length} blocks</span>
            <span>•</span>
            <span>v{template.version}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!template.isDefault && (
              <DropdownMenuItem onClick={onSetDefault}>
                <Star className="h-4 w-4 mr-2" />
                Set as Default
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onArchive} className="text-red-600">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================
// TEMPLATE FORM DIALOG
// ============================================

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formName: string;
  formDescription: string;
  formBlocks: BlockFormData[];
  expandedBlocks: Set<string>;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onUpdateBlock: (blockId: string, field: 'title' | 'defaultText', value: string) => void;
  onAddBlock: () => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  onToggleBlockExpanded: (blockId: string) => void;
  onSubmit: () => void;
  submitLabel: string;
}

function TemplateFormDialog({
  open,
  onOpenChange,
  title,
  description,
  formName,
  formDescription,
  formBlocks,
  expandedBlocks,
  onNameChange,
  onDescriptionChange,
  onUpdateBlock,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onToggleBlockExpanded,
  onSubmit,
  submitLabel,
}: TemplateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Name and Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={formName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g., Standard Offer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description</Label>
              <Input
                id="templateDescription"
                value={formDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="e.g., Default template for new quotations"
              />
            </div>
          </div>

          {/* Blocks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Blocks</Label>
              <Button variant="outline" size="sm" onClick={onAddBlock}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Block
              </Button>
            </div>

            <div className="space-y-2">
              {formBlocks.map((block, index) => (
                <Collapsible
                  key={block.blockId}
                  open={expandedBlocks.has(block.blockId)}
                  onOpenChange={() => onToggleBlockExpanded(block.blockId)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-slate-300" />
                          {expandedBlocks.has(block.blockId) ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="font-medium text-sm">{block.title || 'Untitled Block'}</span>
                          <Badge variant="outline" className="text-[10px] py-0 text-slate-400">
                            #{index + 1}
                          </Badge>
                        </div>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onMoveBlock(block.blockId, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronDown className="h-3 w-3 rotate-180" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onMoveBlock(block.blockId, 'down')}
                            disabled={index === formBlocks.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          {formBlocks.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              onClick={() => onRemoveBlock(block.blockId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="p-3 pt-0 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`block-title-${block.blockId}`}>Block Title</Label>
                          <Input
                            id={`block-title-${block.blockId}`}
                            value={block.title}
                            onChange={(e) => onUpdateBlock(block.blockId, 'title', e.target.value)}
                            placeholder="e.g., Introduction"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`block-text-${block.blockId}`}>Default Text</Label>
                          <Textarea
                            id={`block-text-${block.blockId}`}
                            value={block.defaultText}
                            onChange={(e) =>
                              onUpdateBlock(block.blockId, 'defaultText', e.target.value)
                            }
                            placeholder="Enter the default text for this block. Use {{variableName}} for variables."
                            rows={6}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-slate-500">
                            Variables: {'{{clientName}}'}, {'{{boatModel}}'}, {'{{deliveryWeeks}}'}, {'{{validUntil}}'}, {'{{totalExclVat}}'}
                          </p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            <Check className="h-4 w-4 mr-1" />
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
