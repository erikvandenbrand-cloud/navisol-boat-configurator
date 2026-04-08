/**
 * Applied Standards Section - v4
 * CRUD table for managing applied harmonised standards and technical specifications
 * Part of the Technical Dossier for CE compliance
 *
 * Supports:
 * - Manual standard entry
 * - "Add from library" action (select from Standards Library)
 * - "Apply suggested from Boat Model" flow with preview
 * - Origin tracking (LIBRARY, MODEL_SUGGESTED, MANUAL)
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Ship,
  Library,
  ChevronRight,
  Info,
  Search,
  X,
} from 'lucide-react';
import type { Project, AppliedStandard, ComplianceAttachment, StandardTag } from '@/domain/models';
import type { Standard, AppliedStandardOrigin } from '@/domain/models/standard';
import { generateUUID, now, STANDARD_TAGS, STANDARD_TAG_LABELS } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { StandardsLibraryService } from '@/domain/services/StandardsLibraryService';
import { BoatModelService, type BoatModel } from '@/domain/services/BoatModelService';
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

interface AppliedStandardsSectionProps {
  project: Project;
  onRefresh: () => void;
}

/** Extended AppliedStandard with origin tracking */
interface AppliedStandardExtended extends AppliedStandard {
  /** Reference to the library standard (if from library) */
  libraryStandardId?: string;
  /** Origin of this standard on the project */
  origin?: AppliedStandardOrigin;
}

interface StandardFormData {
  code: string;
  title: string;
  year: string;
  scopeNote: string;
  isHarmonised: boolean;
  evidenceAttachmentIds: string[];
  tags: string[];
  libraryStandardId?: string;
  origin?: AppliedStandardOrigin;
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
    tags: [],
    origin: 'MANUAL',
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

/** Get origin badge for display */
function getOriginBadge(origin?: AppliedStandardOrigin) {
  switch (origin) {
    case 'LIBRARY':
      return (
        <Badge variant="outline" className="text-[10px] px-1 py-0 text-teal-600 border-teal-200">
          <Library className="h-2.5 w-2.5 mr-0.5" />
          Library
        </Badge>
      );
    case 'MODEL_SUGGESTED':
      return (
        <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-200">
          <Ship className="h-2.5 w-2.5 mr-0.5" />
          Model
        </Badge>
      );
    default:
      return null;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AppliedStandardsSection({ project, onRefresh }: AppliedStandardsSectionProps) {
  const { can } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [editingStandard, setEditingStandard] = useState<AppliedStandardExtended | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppliedStandardExtended | null>(null);

  // Library standards and model data
  const [libraryStandards, setLibraryStandards] = useState<Standard[]>([]);
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);
  const [suggestedStandards, setSuggestedStandards] = useState<Standard[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const standards = (project.appliedStandards || []) as AppliedStandardExtended[];
  const isReadOnly = project.status === 'CLOSED';
  const canUpdate = can('compliance:update') && !isReadOnly;

  // Get all available attachments from compliance packs
  const availableAttachments = useMemo(() => getAllAttachments(project), [project]);

  // Load library standards and boat model data
  useEffect(() => {
    async function loadData() {
      setIsLoadingLibrary(true);
      try {
        // Initialize and load standards
        await StandardsLibraryService.initializeSeedData();
        const allStandards = await StandardsLibraryService.getAll(false);
        setLibraryStandards(allStandards);

        // Load boat model if project has one
        if (project.configuration.boatModelVersionId) {
          const model = await BoatModelService.getById(project.configuration.boatModelVersionId);
          setBoatModel(model);

          // Load suggested standards from model
          if (model?.suggestedStandardIds && model.suggestedStandardIds.length > 0) {
            const suggested = await StandardsLibraryService.getByIds(model.suggestedStandardIds);
            setSuggestedStandards(suggested);
          }
        }
      } catch (error) {
        console.error('Failed to load library data:', error);
      } finally {
        setIsLoadingLibrary(false);
      }
    }
    loadData();
  }, [project.configuration.boatModelVersionId]);

  // Filter library standards based on search and exclude already applied
  const filteredLibraryStandards = useMemo(() => {
    const appliedIds = new Set(
      standards.filter(s => s.libraryStandardId).map(s => s.libraryStandardId)
    );
    const appliedCodes = new Set(standards.map(s => s.code.toLowerCase()));

    return libraryStandards.filter(s => {
      // Exclude already applied
      if (appliedIds.has(s.id) || appliedCodes.has(s.code.toLowerCase())) {
        return false;
      }
      // Filter by search
      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        return (
          s.code.toLowerCase().includes(lowerQuery) ||
          s.title.toLowerCase().includes(lowerQuery) ||
          s.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      }
      return true;
    });
  }, [libraryStandards, standards, searchQuery]);

  // Get new suggestions (not already applied)
  const newSuggestions = useMemo(() => {
    const appliedIds = new Set(
      standards.filter(s => s.libraryStandardId).map(s => s.libraryStandardId)
    );
    const appliedCodes = new Set(standards.map(s => s.code.toLowerCase()));

    return suggestedStandards.filter(
      s => !appliedIds.has(s.id) && !appliedCodes.has(s.code.toLowerCase())
    );
  }, [suggestedStandards, standards]);

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
          tags: data.tags.length > 0 ? data.tags : undefined,
          libraryStandardId: data.libraryStandardId,
          origin: data.origin,
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
        tags: data.tags.length > 0 ? data.tags : undefined,
        libraryStandardId: data.libraryStandardId,
        origin: data.origin || 'MANUAL',
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

  async function handleAddFromLibrary(standard: Standard) {
    await handleSave({
      code: standard.code,
      title: standard.title,
      year: standard.editionOrYear || '',
      scopeNote: '',
      isHarmonised: standard.isHarmonised || false,
      evidenceAttachmentIds: [],
      tags: standard.tags || [],
      libraryStandardId: standard.id,
      origin: 'LIBRARY',
    });
    setShowLibraryPicker(false);
  }

  async function handleApplySuggestions() {
    if (selectedSuggestions.length === 0) return;

    const updatedStandards = [...standards];
    const standardsToAdd = suggestedStandards.filter(s => selectedSuggestions.includes(s.id));

    for (const standard of standardsToAdd) {
      updatedStandards.push({
        id: generateUUID(),
        code: standard.code,
        title: standard.title || undefined,
        year: standard.editionOrYear || undefined,
        isHarmonised: standard.isHarmonised || undefined,
        tags: standard.tags,
        libraryStandardId: standard.id,
        origin: 'MODEL_SUGGESTED',
      });
    }

    const result = await ProjectRepository.update(project.id, {
      ...project,
      appliedStandards: updatedStandards,
      updatedAt: now(),
    });

    if (result) {
      setShowModelSuggestions(false);
      setSelectedSuggestions([]);
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

  function toggleSuggestion(id: string) {
    setSelectedSuggestions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function selectAllSuggestions() {
    setSelectedSuggestions(newSuggestions.map(s => s.id));
  }

  // Don't show section for non-NEW_BUILD projects unless they already have standards
  if (project.type !== 'NEW_BUILD' && standards.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Standard
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowLibraryPicker(true)}>
                    <Library className="h-4 w-4 mr-2" />
                    Add from Library
                  </DropdownMenuItem>
                  {boatModel && newSuggestions.length > 0 && (
                    <DropdownMenuItem onClick={() => setShowModelSuggestions(true)}>
                      <Ship className="h-4 w-4 mr-2" />
                      Apply from Boat Model
                      <Badge variant="secondary" className="ml-auto text-[10px] py-0">
                        {newSuggestions.length}
                      </Badge>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Enter Manually
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowLibraryPicker(true)}>
                    <Library className="h-4 w-4 mr-2" />
                    Add from Library
                  </Button>
                  {boatModel && newSuggestions.length > 0 && (
                    <Button variant="outline" onClick={() => setShowModelSuggestions(true)}>
                      <Ship className="h-4 w-4 mr-2" />
                      Apply from Model
                      <Badge variant="secondary" className="ml-2 text-[10px] py-0">
                        {newSuggestions.length}
                      </Badge>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Model suggestions banner */}
              {canUpdate && boatModel && newSuggestions.length > 0 && (
                <div className="flex items-center gap-3 p-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Ship className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      <strong>{newSuggestions.length}</strong> suggested standard{newSuggestions.length !== 1 ? 's' : ''} from{' '}
                      <strong>{boatModel.name}</strong> available to apply
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => setShowModelSuggestions(true)}
                  >
                    Review & Apply
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[180px]">Code</TableHead>
                      <TableHead className="w-[80px]">Year</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-[100px] text-center">Harmonised</TableHead>
                      <TableHead className="w-[120px]">Tags</TableHead>
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
            </>
          )}
        </CardContent>

        {/* Manual Add Dialog */}
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

        {/* Library Picker Dialog */}
        <Dialog open={showLibraryPicker} onOpenChange={setShowLibraryPicker}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Library className="h-5 w-5 text-teal-600" />
                Add from Standards Library
              </DialogTitle>
              <DialogDescription>
                Select a standard from the library to apply to this project.
              </DialogDescription>
            </DialogHeader>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by code, title, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg min-h-[200px] max-h-[400px]">
              {isLoadingLibrary ? (
                <div className="p-8 text-center text-slate-500">Loading standards...</div>
              ) : filteredLibraryStandards.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p>{searchQuery ? 'No matching standards' : 'All library standards already applied'}</p>
                </div>
              ) : (
                filteredLibraryStandards.map(standard => (
                  <div
                    key={standard.id}
                    className="flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleAddFromLibrary(standard)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                          {standard.code}
                        </code>
                        {standard.editionOrYear && (
                          <span className="text-xs text-slate-500">{standard.editionOrYear}</span>
                        )}
                        {standard.isHarmonised && (
                          <Badge className="bg-green-100 text-green-700 border-0 text-[10px] py-0">
                            Harmonised
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5">{standard.title}</p>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLibraryPicker(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Model Suggestions Dialog */}
        <Dialog open={showModelSuggestions} onOpenChange={setShowModelSuggestions}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-blue-600" />
                Apply Suggested Standards
              </DialogTitle>
              <DialogDescription>
                Select standards suggested by <strong>{boatModel?.name}</strong> to apply to this project.
                This is a one-time copy - changes to the model won't affect applied standards.
              </DialogDescription>
            </DialogHeader>

            {newSuggestions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All suggested standards have been applied</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">
                    {selectedSuggestions.length} of {newSuggestions.length} selected
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={selectAllSuggestions}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-lg min-h-[200px] max-h-[400px]">
                  {newSuggestions.map(standard => (
                    <div
                      key={standard.id}
                      className={`flex items-start gap-3 p-3 border-b last:border-b-0 cursor-pointer ${
                        selectedSuggestions.includes(standard.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleSuggestion(standard.id)}
                    >
                      <Checkbox
                        checked={selectedSuggestions.includes(standard.id)}
                        onCheckedChange={() => toggleSuggestion(standard.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                            {standard.code}
                          </code>
                          {standard.editionOrYear && (
                            <span className="text-xs text-slate-500">{standard.editionOrYear}</span>
                          )}
                          {standard.isHarmonised && (
                            <Badge className="bg-green-100 text-green-700 border-0 text-[10px] py-0">
                              Harmonised
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-0.5">{standard.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModelSuggestions(false)}>
                Cancel
              </Button>
              {newSuggestions.length > 0 && (
                <Button
                  onClick={handleApplySuggestions}
                  disabled={selectedSuggestions.length === 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Apply {selectedSuggestions.length} Standard{selectedSuggestions.length !== 1 ? 's' : ''}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
    </TooltipProvider>
  );
}

// ============================================
// STANDARD ROW
// ============================================

interface StandardRowProps {
  standard: AppliedStandardExtended;
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
          {getOriginBadge(standard.origin)}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
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
  initialData?: AppliedStandardExtended;
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
          tags: initialData.tags || [],
          libraryStandardId: initialData.libraryStandardId,
          origin: initialData.origin || 'MANUAL',
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
        tags: initialData.tags || [],
        libraryStandardId: initialData.libraryStandardId,
        origin: initialData.origin || 'MANUAL',
      });
    } else if (newOpen && !initialData) {
      setFormData(getDefaultFormData());
    }
    onOpenChange(newOpen);
  };

  function toggleTag(tag: string) {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }

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

          {/* Tags Selection */}
          <div className="space-y-2">
            <Label>Tags (for document filtering)</Label>
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
                  {STANDARD_TAG_LABELS[tag]}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Tags help filter standards in documents (e.g., DoC shows only standards tagged 'doc').
            </p>
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
