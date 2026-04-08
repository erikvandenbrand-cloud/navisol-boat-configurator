/**
 * Standards Library Tab - v4
 * CRUD interface for managing the Standards Library.
 *
 * Standards are internal representations of external standards (ISO, EN, etc.)
 * Each entry allows a manual sourceNote for provenance visibility.
 * No external synchronization - all data is manually maintained.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Check,
  Search,
  AlertCircle,
  Info,
  ExternalLink,
} from 'lucide-react';
import type { Standard, CreateStandardInput, UpdateStandardInput } from '@/domain/models';
import { STANDARD_TAGS, STANDARD_TAG_LABELS, now, generateUUID } from '@/domain/models';
import { StandardsLibraryService } from '@/domain/services/StandardsLibraryService';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

interface StandardFormData {
  code: string;
  title: string;
  editionOrYear: string;
  sourceNote: string;
  isHarmonised: boolean;
  tags: string[];
  notes: string;
}

// ============================================
// HELPERS
// ============================================

function getDefaultFormData(): StandardFormData {
  return {
    code: '',
    title: '',
    editionOrYear: '',
    sourceNote: '',
    isHarmonised: false,
    tags: [],
    notes: '',
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StandardsLibraryTab() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Standard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Standard | null>(null);

  // Load standards
  useEffect(() => {
    loadStandards();
  }, [showArchived]);

  async function loadStandards() {
    setIsLoading(true);
    try {
      // Initialize seed data if empty
      await StandardsLibraryService.initializeSeedData();
      const data = await StandardsLibraryService.getAll(showArchived);
      setStandards(data);
    } catch (error) {
      console.error('Failed to load standards:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter standards based on search query
  const filteredStandards = useMemo(() => {
    if (!searchQuery.trim()) return standards;
    const lowerQuery = searchQuery.toLowerCase();
    return standards.filter(
      (s) =>
        s.code.toLowerCase().includes(lowerQuery) ||
        s.title.toLowerCase().includes(lowerQuery) ||
        s.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }, [standards, searchQuery]);

  // Stats
  const totalCount = standards.length;
  const harmonisedCount = standards.filter((s) => s.isHarmonised).length;
  const archivedCount = standards.filter((s) => s.archived).length;

  // ============================================
  // HANDLERS
  // ============================================

  async function handleCreate(data: StandardFormData) {
    const context = getDefaultAuditContext();
    const result = await StandardsLibraryService.create(
      {
        code: data.code.trim(),
        title: data.title.trim(),
        editionOrYear: data.editionOrYear.trim() || undefined,
        sourceNote: data.sourceNote.trim() || undefined,
        isHarmonised: data.isHarmonised,
        tags: data.tags.length > 0 ? data.tags : undefined,
        notes: data.notes.trim() || undefined,
      },
      context
    );

    if (result.ok) {
      setShowCreateDialog(false);
      loadStandards();
    } else {
      alert(result.error);
    }
  }

  async function handleUpdate(id: string, data: StandardFormData) {
    const context = getDefaultAuditContext();
    const result = await StandardsLibraryService.update(
      id,
      {
        code: data.code.trim(),
        title: data.title.trim(),
        editionOrYear: data.editionOrYear.trim() || undefined,
        sourceNote: data.sourceNote.trim() || undefined,
        isHarmonised: data.isHarmonised,
        tags: data.tags.length > 0 ? data.tags : undefined,
        notes: data.notes.trim() || undefined,
      },
      context
    );

    if (result.ok) {
      setEditingStandard(null);
      loadStandards();
    } else {
      alert(result.error);
    }
  }

  async function handleArchive(id: string) {
    const context = getDefaultAuditContext();
    const result = await StandardsLibraryService.archive(id, context);
    if (result.ok) {
      setArchiveTarget(null);
      loadStandards();
    } else {
      alert(result.error);
    }
  }

  async function handleUnarchive(id: string) {
    const context = getDefaultAuditContext();
    const result = await StandardsLibraryService.unarchive(id, context);
    if (result.ok) {
      loadStandards();
    } else {
      alert(result.error);
    }
  }

  async function handleDelete(id: string) {
    const context = getDefaultAuditContext();
    const result = await StandardsLibraryService.delete(id, context);
    if (result.ok) {
      setDeleteTarget(null);
      loadStandards();
    } else {
      alert(result.error);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-600" />
                Standards Library
              </CardTitle>
              <CardDescription>
                Internal library of standards for CE compliance. Add standards here and apply them to projects.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Standard
            </Button>
          </CardHeader>
          <CardContent>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Total Standards</p>
                <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Harmonised</p>
                <p className="text-2xl font-bold text-green-800">{harmonisedCount}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Archived</p>
                <p className="text-2xl font-bold text-slate-600">{archivedCount}</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by code, title, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <Checkbox
                  checked={showArchived}
                  onCheckedChange={(checked) => setShowArchived(checked === true)}
                />
                <span>Show archived</span>
              </label>
            </div>

            {/* Standards Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-slate-400">Loading standards...</div>
              </div>
            ) : filteredStandards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <BookOpen className="h-7 w-7 text-slate-400" />
                </div>
                <h4 className="text-base font-medium text-slate-900 mb-1">
                  {searchQuery ? 'No matching standards' : 'No standards in library'}
                </h4>
                <p className="text-sm text-slate-500 max-w-xs mb-5">
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'Add standards to the library to use them across projects.'}
                </p>
                {!searchQuery && (
                  <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
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
                      <TableHead className="w-[80px]">Edition</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[90px] text-center">Harmonised</TableHead>
                      <TableHead className="w-[120px]">Tags</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStandards.map((standard) => (
                      <StandardRow
                        key={standard.id}
                        standard={standard}
                        onEdit={() => setEditingStandard(standard)}
                        onArchive={() => setArchiveTarget(standard)}
                        onUnarchive={() => handleUnarchive(standard.id)}
                        onDelete={() => setDeleteTarget(standard)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Standards are internal representations</p>
            <p className="text-blue-700">
              Each standard entry represents an external standard (ISO, EN, etc.) for internal use.
              Use the "Source Note" field to record provenance. Standards can be linked to Boat Models
              as suggestions, and applied to projects explicitly.
            </p>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <StandardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleCreate}
        title="Add Standard"
        description="Add a new standard to the library."
      />

      {/* Edit Dialog */}
      {editingStandard && (
        <StandardDialog
          open={!!editingStandard}
          onOpenChange={(open) => !open && setEditingStandard(null)}
          onSave={(data) => handleUpdate(editingStandard.id, data)}
          initialData={editingStandard}
          title="Edit Standard"
          description="Update the standard details."
        />
      )}

      {/* Archive Confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Standard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{archiveTarget?.code}</strong>?
              Archived standards won't appear in selection lists but can be unarchived later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveTarget && handleArchive(archiveTarget.id)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Standard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.code}</strong>?
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
    </TooltipProvider>
  );
}

// ============================================
// STANDARD ROW
// ============================================

interface StandardRowProps {
  standard: Standard;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

function StandardRow({ standard, onEdit, onArchive, onUnarchive, onDelete }: StandardRowProps) {
  return (
    <TableRow className={`hover:bg-slate-50 ${standard.archived ? 'opacity-60' : ''}`}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">
            {standard.code}
          </code>
          {standard.archived && (
            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">
              Archived
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-slate-600 text-sm">
        {standard.editionOrYear || '—'}
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm text-slate-900">{standard.title}</p>
          {standard.sourceNote && (
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[300px]" title={standard.sourceNote}>
              Source: {standard.sourceNote}
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
      <TableCell>
        {standard.tags && standard.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {standard.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 text-teal-700 border-teal-200">
                {tag}
              </Badge>
            ))}
            {standard.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">+{standard.tags.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          {standard.archived ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onUnarchive}>
                  <ArchiveRestore className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unarchive</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700" onClick={onArchive}>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
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
  initialData?: Standard;
  title: string;
  description: string;
}

function StandardDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  title,
  description,
}: StandardDialogProps) {
  const [formData, setFormData] = useState<StandardFormData>(() =>
    initialData
      ? {
          code: initialData.code,
          title: initialData.title,
          editionOrYear: initialData.editionOrYear || '',
          sourceNote: initialData.sourceNote || '',
          isHarmonised: initialData.isHarmonised || false,
          tags: initialData.tags || [],
          notes: initialData.notes || '',
        }
      : getDefaultFormData()
  );

  // Reset form when dialog opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && initialData) {
      setFormData({
        code: initialData.code,
        title: initialData.title,
        editionOrYear: initialData.editionOrYear || '',
        sourceNote: initialData.sourceNote || '',
        isHarmonised: initialData.isHarmonised || false,
        tags: initialData.tags || [],
        notes: initialData.notes || '',
      });
    } else if (newOpen && !initialData) {
      setFormData(getDefaultFormData());
    }
    onOpenChange(newOpen);
  };

  function toggleTag(tag: string) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  function handleSubmit() {
    if (!formData.code.trim() || !formData.title.trim()) return;
    onSave(formData);
  }

  const isValid = formData.code.trim().length > 0 && formData.title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="code">Standard Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., EN ISO 12217-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editionOrYear">Edition/Year</Label>
              <Input
                id="editionOrYear"
                value={formData.editionOrYear}
                onChange={(e) => setFormData((prev) => ({ ...prev, editionOrYear: e.target.value }))}
                placeholder="e.g., 2015"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Stability and buoyancy assessment"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceNote">Source Note</Label>
            <Input
              id="sourceNote"
              value={formData.sourceNote}
              onChange={(e) => setFormData((prev) => ({ ...prev, sourceNote: e.target.value }))}
              placeholder="e.g., EU Official Journal 2022/C 282"
            />
            <p className="text-xs text-slate-500">
              Record the provenance of this standard for reference.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isHarmonised"
              checked={formData.isHarmonised}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isHarmonised: checked === true }))
              }
            />
            <Label htmlFor="isHarmonised" className="text-sm cursor-pointer">
              EU Harmonised Standard (gives presumption of conformity)
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
              {STANDARD_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    formData.tags.includes(tag)
                      ? 'bg-teal-100 border-teal-300 text-teal-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {STANDARD_TAG_LABELS[tag as keyof typeof STANDARD_TAG_LABELS] || tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this standard..."
              rows={2}
            />
          </div>
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
