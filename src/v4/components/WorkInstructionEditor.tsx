/**
 * Work Instruction Editor - v4
 * Create and edit work instructions
 *
 * Features:
 * - Edit title, stage category, scope, content
 * - Manage attachments
 * - Explicit Save (draft) and Publish actions
 * - Generate draft with AI (fills but does not save)
 * - Authorized users only
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  FileText,
  Save,
  Send,
  Sparkles,
  Trash2,
  Paperclip,
  Upload,
  X,
  AlertCircle,
  Loader2,
  Globe,
  Ship,
} from 'lucide-react';
import type {
  WorkInstruction,
  WorkInstructionScope,
  AddWorkInstructionAttachmentInput,
} from '@/domain/models/work-instruction';
import type { ProductionStageCode } from '@/domain/models/production';
import { DEFAULT_PRODUCTION_STAGES } from '@/domain/models/production';
import { WorkInstructionService } from '@/domain/services/WorkInstructionService';
import { BoatModelService, type BoatModel } from '@/domain/services/BoatModelService';
import { useAuth, getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';

// ============================================
// TYPES
// ============================================

interface WorkInstructionEditorProps {
  workInstructionId: string | null; // null = create mode
  onBack: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  stageCategory: ProductionStageCode;
  scope: WorkInstructionScope;
  modelRef: string;
  content: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WorkInstructionEditor({
  workInstructionId,
  onBack,
  onSaved,
}: WorkInstructionEditorProps) {
  const isCreateMode = workInstructionId === null;

  // State
  const [instruction, setInstruction] = useState<WorkInstruction | null>(null);
  const [boatModels, setBoatModels] = useState<BoatModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>({
    title: '',
    stageCategory: 'PREP',
    scope: 'general',
    modelRef: '',
    content: '',
  });

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [workInstructionId]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const modelsData = await BoatModelService.getAll();
      setBoatModels(modelsData);

      if (!isCreateMode && workInstructionId) {
        const instructionData = await WorkInstructionService.getById(workInstructionId);
        if (!instructionData) {
          setError('Work instruction not found');
          setIsLoading(false);
          return;
        }
        setInstruction(instructionData);
        setForm({
          title: instructionData.title,
          stageCategory: instructionData.stageCategory,
          scope: instructionData.scope,
          modelRef: instructionData.modelRef || '',
          content: instructionData.content,
        });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  // Update form field
  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle scope change
  const handleScopeChange = useCallback((scope: WorkInstructionScope) => {
    setForm((prev) => ({
      ...prev,
      scope,
      modelRef: scope === 'general' ? '' : prev.modelRef,
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    if (form.scope === 'modelSpecific' && !form.modelRef) {
      setError('Please select a boat model');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const context = getDefaultAuditContext();

      if (isCreateMode) {
        // Create new
        const result = await WorkInstructionService.create(
          {
            title: form.title.trim(),
            stageCategory: form.stageCategory,
            scope: form.scope,
            modelRef: form.scope === 'modelSpecific' ? form.modelRef : undefined,
            content: form.content,
          },
          context
        );

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setInstruction(result.value);
        setHasUnsavedChanges(false);
        onSaved();
      } else if (instruction) {
        // Update existing
        const result = await WorkInstructionService.update(
          instruction.id,
          {
            title: form.title.trim(),
            stageCategory: form.stageCategory,
            scope: form.scope,
            modelRef: form.scope === 'modelSpecific' ? form.modelRef : undefined,
            content: form.content,
          },
          context
        );

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setInstruction(result.value);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save work instruction');
    } finally {
      setIsSaving(false);
    }
  }, [form, isCreateMode, instruction, onSaved]);

  // Publish
  const handlePublish = useCallback(async () => {
    if (!instruction) return;

    // Save first if there are unsaved changes
    if (hasUnsavedChanges) {
      await handleSave();
    }

    setIsPublishing(true);
    setError(null);

    try {
      const context = getDefaultAuditContext();
      const result = await WorkInstructionService.publish(instruction.id, context);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setInstruction(result.value);
      onSaved();
    } catch (err) {
      console.error('Failed to publish:', err);
      setError('Failed to publish work instruction');
    } finally {
      setIsPublishing(false);
    }
  }, [instruction, hasUnsavedChanges, handleSave, onSaved]);

  // Unpublish
  const handleUnpublish = useCallback(async () => {
    if (!instruction) return;

    setIsPublishing(true);
    setError(null);

    try {
      const context = getDefaultAuditContext();
      const result = await WorkInstructionService.unpublish(instruction.id, context);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setInstruction(result.value);
    } catch (err) {
      console.error('Failed to unpublish:', err);
      setError('Failed to revert to draft');
    } finally {
      setIsPublishing(false);
    }
  }, [instruction]);

  // Generate AI draft
  const handleGenerateDraft = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await WorkInstructionService.generateDraft({
        stageCategory: form.stageCategory,
        modelRef: form.scope === 'modelSpecific' ? form.modelRef : undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Fill form with draft (does not save)
      setForm((prev) => ({
        ...prev,
        title: result.value.title,
        content: result.value.content,
      }));
      setHasUnsavedChanges(true);
    } catch (err) {
      console.error('Failed to generate draft:', err);
      setError('Failed to generate draft');
    } finally {
      setIsGenerating(false);
    }
  }, [form.stageCategory, form.scope, form.modelRef]);

  // Delete
  const handleDelete = useCallback(async () => {
    if (!instruction) return;

    setIsDeleting(true);
    setError(null);

    try {
      const context = getDefaultAuditContext();
      const result = await WorkInstructionService.delete(instruction.id, context);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete work instruction');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [instruction, onSaved]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !instruction) return;

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      const input: AddWorkInstructionAttachmentInput = {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        dataUrl,
      };

      try {
        const context = getDefaultAuditContext();
        const result = await WorkInstructionService.addAttachment(instruction.id, input, context);

        if (result.ok) {
          // Refresh instruction to get updated attachments
          const updated = await WorkInstructionService.getById(instruction.id);
          if (updated) {
            setInstruction(updated);
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('Failed to upload file:', err);
        setError('Failed to upload file');
      }
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [instruction]);

  // Remove attachment
  const handleRemoveAttachment = useCallback(async (attachmentId: string) => {
    if (!instruction) return;

    try {
      const context = getDefaultAuditContext();
      const result = await WorkInstructionService.removeAttachment(instruction.id, attachmentId, context);

      if (result.ok) {
        setInstruction((prev) => prev ? {
          ...prev,
          attachments: prev.attachments.filter((a) => a.id !== attachmentId),
        } : null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to remove attachment:', err);
      setError('Failed to remove attachment');
    }
  }, [instruction]);

  // Handle back with unsaved changes check
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      pendingNavigationRef.current = onBack;
      setShowUnsavedDialog(true);
    } else {
      onBack();
    }
  }, [hasUnsavedChanges, onBack]);

  // Confirm navigation
  const confirmNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !instruction && !isCreateMode) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{error}</h3>
              <Button variant="outline" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPublished = instruction?.status === 'published';

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={handleBack} className="mb-2 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-7 w-7 text-teal-600" />
            {isCreateMode ? 'New Work Instruction' : 'Edit Work Instruction'}
          </h1>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">
              Unsaved changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Delete button (edit mode only, draft only) */}
          {!isCreateMode && !isPublished && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}

          {/* Unpublish button */}
          {isPublished && (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={isPublishing}
            >
              Revert to Draft
            </Button>
          )}

          {/* Save button */}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || !form.title.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>

          {/* Publish button (edit mode only) */}
          {!isCreateMode && !isPublished && (
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !form.content.trim()}
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Enter instruction title..."
                />
              </div>

              {/* Stage category */}
              <div className="space-y-2">
                <Label htmlFor="stageCategory">Production Stage *</Label>
                <Select
                  value={form.stageCategory}
                  onValueChange={(v) => updateField('stageCategory', v as ProductionStageCode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PRODUCTION_STAGES.map((stage) => (
                      <SelectItem key={stage.code} value={stage.code}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label>Scope *</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleScopeChange('general')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      form.scope === 'general'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Globe className="h-5 w-5 mx-auto mb-1 text-teal-600" />
                    <p className="text-sm font-medium">General</p>
                    <p className="text-xs text-slate-500">All models</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('modelSpecific')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      form.scope === 'modelSpecific'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Ship className="h-5 w-5 mx-auto mb-1 text-teal-600" />
                    <p className="text-sm font-medium">Model Specific</p>
                    <p className="text-xs text-slate-500">One model</p>
                  </button>
                </div>
              </div>

              {/* Model selection (if model-specific) */}
              {form.scope === 'modelSpecific' && (
                <div className="space-y-2">
                  <Label htmlFor="modelRef">Boat Model *</Label>
                  <Select
                    value={form.modelRef}
                    onValueChange={(v) => updateField('modelRef', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {boatModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.range})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Content</CardTitle>
                <CardDescription>Write in Markdown format</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Draft with AI
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="Write your work instruction content here...

# Heading
## Subheading

- List item
- [ ] Checkbox

**Bold** and *italic* text"
                className="min-h-[400px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Attachments (edit mode only) */}
          {!isCreateMode && instruction && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({instruction.attachments.length})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </CardHeader>
              <CardContent>
                {instruction.attachments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No attachments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {instruction.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-sm">{attachment.filename}</p>
                            <p className="text-xs text-slate-500">
                              {(attachment.sizeBytes / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant={isPublished ? 'default' : 'outline'}
                className={
                  isPublished
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'border-amber-300 text-amber-700 bg-amber-50'
                }
              >
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
              <p className="text-xs text-slate-500 mt-2">
                {isPublished
                  ? 'This instruction is visible to production staff.'
                  : 'This instruction is only visible to editors.'}
              </p>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>
                <strong>Save Draft</strong> saves your changes without publishing.
              </p>
              <p>
                <strong>Publish</strong> makes the instruction visible to production staff.
              </p>
              <p>
                <strong>Generate Draft</strong> creates starter content based on the selected stage.
              </p>
              <p>
                Use <strong>Markdown</strong> for formatting: # headings, **bold**, *italic*, - lists.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Instruction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this work instruction and all its comments.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
