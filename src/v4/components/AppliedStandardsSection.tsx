/**
 * Applied Standards Section - v4
 * CRUD table for managing applied harmonised standards and technical specifications
 * Part of the Technical Dossier for CE compliance
 */

'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Check,
  FileText,
  ExternalLink,
  Paperclip,
  Download,
} from 'lucide-react';
import type { Project, AppliedStandard, ComplianceAttachment } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { useAuth, PermissionGuard } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================
// TYPES
// ============================================

interface AppliedStandardsSectionProps {
  project: Project;
  onRefresh: () => void;
}

interface StandardFormData {
  code: string;
  title: string;
  year: string;
  scopeNote: string;
  isHarmonised: boolean;
  evidenceAttachmentIds: string[];
}

// ============================================
// HELPERS
// ============================================

function getDefaultFormData(): StandardFormData {
  return {
    code: '',
    title: '',
    year: '',
    scopeNote: '',
    isHarmonised: false,
    evidenceAttachmentIds: [],
  };
}

function getAllAttachments(project: Project): ComplianceAttachment[] {
  const attachments: ComplianceAttachment[] = [];

  // Collect from all compliance packs
  for (const pack of project.compliancePacks || []) {
    for (const chapter of pack.chapters) {
      for (const att of chapter.attachments) {
        attachments.push(att);
      }
      for (const section of chapter.sections) {
        for (const att of section.attachments) {
          attachments.push(att);
        }
      }
    }
  }

  return attachments;
}

/**
 * Open a compliance attachment in a new tab or download it.
 * Reuses the same pattern as ArticleDialog for consistency.
 */
function openComplianceAttachment(att: ComplianceAttachment) {
  if (att.dataUrl) {
    const win = window.open();
    if (win) {
      win.document.write(`
        <html>
          <head><title>${att.filename}</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9;">
            ${att.mimeType.startsWith('image/')
              ? `<img src="${att.dataUrl}" style="max-width:100%;max-height:100vh;" alt="${att.filename}" />`
              : `<iframe src="${att.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`
            }
          </body>
        </html>
      `);
      win.document.close();
    }
  } else if (att.url) {
    window.open(att.url, '_blank', 'noopener,noreferrer');
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AppliedStandardsSection({ project, onRefresh }: AppliedStandardsSectionProps) {
  const { can } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStandard, setEditingStandard] = useState<AppliedStandard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppliedStandard | null>(null);

  const standards = project.appliedStandards || [];
  const isReadOnly = project.status === 'CLOSED';
  const canUpdate = can('compliance:update') && !isReadOnly;

  // Get all available attachments from compliance packs
  const availableAttachments = useMemo(() => getAllAttachments(project), [project]);

  async function handleSave(data: StandardFormData, existingId?: string) {
    const updatedStandards = [...standards];

    if (existingId) {
      // Update existing
      const index = updatedStandards.findIndex(s => s.id === existingId);
      if (index >= 0) {
        updatedStandards[index] = {
          id: existingId,
          code: data.code.trim(),
          title: data.title.trim() || undefined,
          year: data.year.trim() || undefined,
          scopeNote: data.scopeNote.trim() || undefined,
          isHarmonised: data.isHarmonised || undefined,
          evidenceAttachmentIds: data.evidenceAttachmentIds.length > 0 ? data.evidenceAttachmentIds : undefined,
        };
      }
    } else {
      // Add new
      updatedStandards.push({
        id: generateUUID(),
        code: data.code.trim(),
        title: data.title.trim() || undefined,
        year: data.year.trim() || undefined,
        scopeNote: data.scopeNote.trim() || undefined,
        isHarmonised: data.isHarmonised || undefined,
        evidenceAttachmentIds: data.evidenceAttachmentIds.length > 0 ? data.evidenceAttachmentIds : undefined,
      });
    }

    const result = await ProjectRepository.update(project.id, {
      ...project,
      appliedStandards: updatedStandards,
      updatedAt: now(),
    });

    if (result) {
      setShowAddDialog(false);
      setEditingStandard(null);
      onRefresh();
    }
  }

  async function handleDelete(standardId: string) {
    const updatedStandards = standards.filter(s => s.id !== standardId);

    const result = await ProjectRepository.update(project.id, {
      ...project,
      appliedStandards: updatedStandards,
      updatedAt: now(),
    });

    if (result) {
      setDeleteTarget(null);
      onRefresh();
    }
  }

  // Don't show section for non-NEW_BUILD projects unless they already have standards
  if (project.type !== 'NEW_BUILD' && standards.length === 0) {
    return null;
  }

  return (
    <Card data-testid="applied-standards-section">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Applied Standards
          </CardTitle>
          <CardDescription>
            Harmonised standards and technical specifications applied for CE compliance
          </CardDescription>
        </div>
        {canUpdate && (
          <PermissionGuard permission="compliance:update">
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Standard
            </Button>
          </PermissionGuard>
        )}
      </CardHeader>
      <CardContent>
        {standards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <BookOpen className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="text-base font-medium text-slate-900 mb-1">No applied standards</h4>
            <p className="text-sm text-slate-500 max-w-xs mb-5">
              Add harmonised standards and technical specifications to document CE compliance.
            </p>
            {canUpdate && (
              <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Standard
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[180px]">Code</TableHead>
                  <TableHead className="w-[80px]">Year</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px] text-center">Harmonised</TableHead>
                  <TableHead className="w-[80px] text-center">Evidence</TableHead>
                  {canUpdate && <TableHead className="w-[100px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {standards.map((standard) => (
                  <StandardRow
                    key={standard.id}
                    standard={standard}
                    availableAttachments={availableAttachments}
                    canUpdate={canUpdate}
                    onEdit={() => setEditingStandard(standard)}
                    onDelete={() => setDeleteTarget(standard)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add Dialog */}
      <StandardDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={(data) => handleSave(data)}
        availableAttachments={availableAttachments}
        title="Add Applied Standard"
      />

      {/* Edit Dialog */}
      <StandardDialog
        open={!!editingStandard}
        onOpenChange={(open) => !open && setEditingStandard(null)}
        onSave={(data) => handleSave(data, editingStandard?.id)}
        availableAttachments={availableAttachments}
        initialData={editingStandard || undefined}
        title="Edit Applied Standard"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Applied Standard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.code}</strong> from the applied standards list?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================
// STANDARD ROW
// ============================================

interface StandardRowProps {
  standard: AppliedStandard;
  availableAttachments: ComplianceAttachment[];
  canUpdate: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function StandardRow({ standard, availableAttachments, canUpdate, onEdit, onDelete }: StandardRowProps) {
  const evidenceCount = standard.evidenceAttachmentIds?.length || 0;
  const linkedAttachments = availableAttachments.filter(
    att => standard.evidenceAttachmentIds?.includes(att.id)
  );

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">
            {standard.code}
          </code>
        </div>
      </TableCell>
      <TableCell className="text-slate-600">
        {standard.year || '—'}
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm text-slate-900">{standard.title || '—'}</p>
          {standard.scopeNote && (
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[300px]" title={standard.scopeNote}>
              {standard.scopeNote}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {standard.isHarmonised ? (
          <Badge className="bg-green-100 text-green-700 border-0">
            <Check className="h-3 w-3 mr-1" />
            Yes
          </Badge>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {evidenceCount > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Paperclip className="h-3.5 w-3.5 mr-1" />
                {evidenceCount}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Linked Evidence</h4>
                {linkedAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 text-xs group">
                    <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <button
                      type="button"
                      onClick={() => openComplianceAttachment(att)}
                      className="flex-1 text-left truncate text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                      title={`Open ${att.filename}`}
                    >
                      {att.filename}
                    </button>
                    <button
                      type="button"
                      onClick={() => openComplianceAttachment(att)}
                      className="p-1 text-slate-400 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Open attachment"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        )}
      </TableCell>
      {canUpdate && (
        <TableCell>
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

// ============================================
// STANDARD DIALOG
// ============================================

interface StandardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: StandardFormData) => void;
  availableAttachments: ComplianceAttachment[];
  initialData?: AppliedStandard;
  title: string;
}

function StandardDialog({
  open,
  onOpenChange,
  onSave,
  availableAttachments,
  initialData,
  title,
}: StandardDialogProps) {
  const [formData, setFormData] = useState<StandardFormData>(() =>
    initialData
      ? {
          code: initialData.code,
          title: initialData.title || '',
          year: initialData.year || '',
          scopeNote: initialData.scopeNote || '',
          isHarmonised: initialData.isHarmonised || false,
          evidenceAttachmentIds: initialData.evidenceAttachmentIds || [],
        }
      : getDefaultFormData()
  );

  // Reset form when dialog opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && initialData) {
      setFormData({
        code: initialData.code,
        title: initialData.title || '',
        year: initialData.year || '',
        scopeNote: initialData.scopeNote || '',
        isHarmonised: initialData.isHarmonised || false,
        evidenceAttachmentIds: initialData.evidenceAttachmentIds || [],
      });
    } else if (newOpen && !initialData) {
      setFormData(getDefaultFormData());
    }
    onOpenChange(newOpen);
  };

  function toggleAttachment(attachmentId: string) {
    setFormData(prev => ({
      ...prev,
      evidenceAttachmentIds: prev.evidenceAttachmentIds.includes(attachmentId)
        ? prev.evidenceAttachmentIds.filter(id => id !== attachmentId)
        : [...prev.evidenceAttachmentIds, attachmentId],
    }));
  }

  function handleSubmit() {
    if (!formData.code.trim()) return;
    onSave(formData);
  }

  const isValid = formData.code.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Add a harmonised standard or technical specification applied for CE compliance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="code">Standard Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., EN ISO 12217-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                placeholder="e.g., 2015"
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Stability and buoyancy - Part 1: Non-sailing boats"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scopeNote">Scope Note</Label>
            <Textarea
              id="scopeNote"
              value={formData.scopeNote}
              onChange={(e) => setFormData(prev => ({ ...prev, scopeNote: e.target.value }))}
              placeholder="Describe how this standard applies to the project..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isHarmonised"
              checked={formData.isHarmonised}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, isHarmonised: checked === true }))
              }
            />
            <Label htmlFor="isHarmonised" className="text-sm cursor-pointer">
              EU Harmonised Standard (Official Journal)
            </Label>
          </div>

          {availableAttachments.length > 0 && (
            <div className="space-y-2">
              <Label>Link Evidence Attachments</Label>
              <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                {availableAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`att-${att.id}`}
                      checked={formData.evidenceAttachmentIds.includes(att.id)}
                      onCheckedChange={() => toggleAttachment(att.id)}
                    />
                    <Label htmlFor={`att-${att.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate max-w-[280px]">{att.filename}</span>
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Select existing compliance attachments as evidence for this standard.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            <Check className="h-4 w-4 mr-1" />
            {initialData ? 'Save Changes' : 'Add Standard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
