/**
 * Technical Dossier Section - v4
 * The canonical archive for compliance documentation.
 *
 * The Technical Dossier represents the official Technical File and contains:
 * - Uploaded evidence files (calculations, drawings, test reports, certificates)
 * - Generated artifacts (PDFs of Owner's Manual, DoC, Equipment List, etc.)
 * - References to structured compliance inputs (read-only pointers)
 *
 * The 10 sections are fixed and canonical (no renaming, no reordering).
 * The Dossier is for FILING and AUDIT, not primary data entry.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  FolderOpen,
  Link2,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { Project, ComplianceAttachment } from '@/domain/models';
import {
  TECHNICAL_FILE_SECTION_TITLES,
  TECHNICAL_FILE_SECTION_DESCRIPTIONS,
  ensureTechnicalFile,
  getSectionItemCounts,
  getSubheadingItemCounts,
  getTechnicalFileCounts,
  getAllSubheadings,
  addSubheading,
  renameSubheading,
  archiveSubheading,
  unarchiveSubheading,
  deleteSubheading,
  checkSubheadingDeletion,
  type TechnicalFileSectionId,
  type TechnicalFileSection,
  type TechnicalFileSubheading,
  type TechnicalFileItem,
} from '@/domain/models/technical-file';
import { getSubheadingRefCountMap } from '@/domain/models/compliance';
import {
  getCertPacksReferencingSection,
  getCertPacksReferencingSubheading,
  getAggregatedCertStatsForSection,
} from '@/domain/utils/information-linking';
import { CertPackReferences, CertStatsSummary } from './CertPackReferences';
import { ProjectRepository } from '@/data/repositories';
import { generateUUID, now } from '@/domain/models';
import { useAuth, PermissionGuard } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

interface TechnicalDossierSectionProps {
  project: Project;
  onRefresh: () => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Get all attachments from compliance packs for reference linking
 */
function getAllAttachments(project: Project): ComplianceAttachment[] {
  const attachments: ComplianceAttachment[] = [];

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
 * Get item type label
 */
function getItemTypeLabel(item: TechnicalFileItem): string {
  switch (item.kind) {
    case 'attachmentRef':
      return 'Evidence';
    case 'generatedArtifact':
      return 'Generated';
    case 'inputRef':
      return 'Input Ref';
    default:
      return 'Item';
  }
}

/**
 * Get item icon color
 */
function getItemTypeColor(item: TechnicalFileItem): string {
  switch (item.kind) {
    case 'attachmentRef':
      return 'text-blue-600';
    case 'generatedArtifact':
      return 'text-purple-600';
    case 'inputRef':
      return 'text-teal-600';
    default:
      return 'text-slate-600';
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TechnicalDossierSection({ project, onRefresh }: TechnicalDossierSectionProps) {
  const { can } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Set<TechnicalFileSectionId>>(new Set());
  const [expandedSubheadings, setExpandedSubheadings] = useState<Set<string>>(new Set());
  const [showFileToDialog, setShowFileToDialog] = useState(false);
  const [fileToTarget, setFileToTarget] = useState<{ sectionId: TechnicalFileSectionId; subheadingId: string } | null>(null);

  // Subheading management state
  const [showAddSubheadingDialog, setShowAddSubheadingDialog] = useState(false);
  const [addSubheadingTarget, setAddSubheadingTarget] = useState<TechnicalFileSectionId | null>(null);
  const [newSubheadingTitle, setNewSubheadingTitle] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ sectionId: TechnicalFileSectionId; subheadingId: string; currentTitle: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ sectionId: TechnicalFileSectionId; subheadingId: string; title: string } | null>(null);
  const [deleteCheck, setDeleteCheck] = useState<ReturnType<typeof checkSubheadingDeletion> | null>(null);

  const canEdit = can('compliance:update');
  const isReadOnly = project.status === 'CLOSED';

  // Ensure technical file exists
  const technicalFile = useMemo(() => ensureTechnicalFile(project.technicalFile), [project.technicalFile]);

  // Get counts
  const counts = useMemo(() => getTechnicalFileCounts(technicalFile), [technicalFile]);

  // Get all available attachments for filing
  const availableAttachments = useMemo(() => getAllAttachments(project), [project]);

  // Get checklist reference counts for all subheadings
  const subheadingRefCounts = useMemo(() => {
    return getSubheadingRefCountMap(project.compliancePacks || []);
  }, [project.compliancePacks]);

  // Project type check
  const isNewBuild = project.type === 'NEW_BUILD';
  if (!isNewBuild && counts.totalItems === 0) {
    return null;
  }

  function toggleSection(sectionId: TechnicalFileSectionId) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function toggleSubheading(subheadingId: string) {
    setExpandedSubheadings((prev) => {
      const next = new Set(prev);
      if (next.has(subheadingId)) {
        next.delete(subheadingId);
      } else {
        next.add(subheadingId);
      }
      return next;
    });
  }

  function handleFileAttachment(sectionId: TechnicalFileSectionId, subheadingId: string) {
    setFileToTarget({ sectionId, subheadingId });
    setShowFileToDialog(true);
  }

  async function handleAddAttachmentToSubheading(sectionId: TechnicalFileSectionId, subheadingId: string, attachmentId: string) {
    const updatedTechnicalFile = ensureTechnicalFile(project.technicalFile);
    const section = updatedTechnicalFile.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const subheading = section.subheadings.find((sh) => sh.id === subheadingId);
    if (!subheading) return;

    // Check if already filed
    const alreadyFiled = subheading.items.some(
      (item) => item.kind === 'attachmentRef' && item.attachmentId === attachmentId
    );
    if (alreadyFiled) return;

    // Add the attachment reference
    subheading.items.push({
      kind: 'attachmentRef',
      attachmentId,
      filedAt: now(),
      filedBy: 'user',
    });

    await ProjectRepository.update(project.id, {
      technicalFile: updatedTechnicalFile,
      updatedAt: now(),
    });

    onRefresh();
    setShowFileToDialog(false);
  }

  async function handleRemoveItem(sectionId: TechnicalFileSectionId, subheadingId: string, itemIndex: number) {
    const updatedTechnicalFile = ensureTechnicalFile(project.technicalFile);
    const section = updatedTechnicalFile.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const subheading = section.subheadings.find((sh) => sh.id === subheadingId);
    if (!subheading) return;

    subheading.items.splice(itemIndex, 1);

    await ProjectRepository.update(project.id, {
      technicalFile: updatedTechnicalFile,
      updatedAt: now(),
    });

    onRefresh();
  }

  // Subheading management handlers
  function handleOpenAddSubheading(sectionId: TechnicalFileSectionId) {
    setAddSubheadingTarget(sectionId);
    setNewSubheadingTitle('');
    setShowAddSubheadingDialog(true);
  }

  async function handleConfirmAddSubheading() {
    if (!addSubheadingTarget || !newSubheadingTitle.trim()) return;

    const updatedTechnicalFile = ensureTechnicalFile(project.technicalFile);
    const section = updatedTechnicalFile.sections.find((s) => s.id === addSubheadingTarget);
    if (!section) return;

    addSubheading(section, newSubheadingTitle.trim(), 'user');

    await ProjectRepository.update(project.id, {
      technicalFile: updatedTechnicalFile,
      updatedAt: now(),
    });

    setShowAddSubheadingDialog(false);
    setNewSubheadingTitle('');
    setAddSubheadingTarget(null);
    onRefresh();
  }

  function handleOpenRename(sectionId: TechnicalFileSectionId, subheadingId: string, currentTitle: string) {
    setRenameTarget({ sectionId, subheadingId, currentTitle });
    setRenameValue(currentTitle);
    setShowRenameDialog(true);
  }

  async function handleConfirmRename() {
    if (!renameTarget || !renameValue.trim()) return;

    const updatedTechnicalFile = ensureTechnicalFile(project.technicalFile);
    const section = updatedTechnicalFile.sections.find((s) => s.id === renameTarget.sectionId);
    if (!section) return;

    renameSubheading(section, renameTarget.subheadingId, renameValue.trim());

    await ProjectRepository.update(project.id, {
      technicalFile: updatedTechnicalFile,
      updatedAt: now(),
    });

    setShowRenameDialog(false);
    setRenameTarget(null);
    setRenameValue('');
    onRefresh();
  }

  async function handleArchiveSubheading(sectionId: TechnicalFileSectionId, subheadingId: string) {
    const updatedTechnicalFile = ensureTechnicalFile(project.technicalFile);
    const section = updatedTechnicalFile.sections.find((s) => s.id === sectionId);
    if (!section) return;

    archiveSubheading(section, subheadingId);

    await ProjectRepository.update(project.id, {
      technicalFile: updatedTechnicalFile,
      updatedAt: now(),
    });

    onRefresh();
  }

  async function handleUnarchiveSubheading(sectionId: TechnicalFileSectionId, subheadingId: string) {
    const updatedTechnicalFile = ensureTechnicalFile(project.technicalFile);
    const section = updatedTechnicalFile.sections.find((s) => s.id === sectionId);
    if (!section) return;

    unarchiveSubheading(section, subheadingId);

    await ProjectRepository.update(project.id, {
      technicalFile: updatedTechnicalFile,
      updatedAt: now(),
    });

    onRefresh();
  }

  function handleOpenDelete(sectionId: TechnicalFileSectionId, subheading: TechnicalFileSubheading) {
    const refCount = subheadingRefCounts.get(subheading.id) || 0;
    const check = checkSubheadingDeletion(subheading, refCount);

    setDeleteTarget({ sectionId, subheadingId: subheading.id, title: subheading.title });
    setDeleteCheck(check);
    setShowDeleteConfirm(true);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !deleteCheck?.canDelete) return;

    const updatedTechnicalFile = ensureTechnicalFile(project.technicalFile);
    const section = updatedTechnicalFile.sections.find((s) => s.id === deleteTarget.sectionId);
    if (!section) return;

    const refCount = subheadingRefCounts.get(deleteTarget.subheadingId) || 0;
    const result = deleteSubheading(section, deleteTarget.subheadingId, refCount);

    if (result.success) {
      await ProjectRepository.update(project.id, {
        technicalFile: updatedTechnicalFile,
        updatedAt: now(),
      });
      onRefresh();
    }

    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setDeleteCheck(null);
  }

  return (
    <TooltipProvider>
    <Card data-testid="technical-dossier-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-teal-600" />
          2. Technical Dossier
        </CardTitle>
        <CardDescription>
          Canonical archive with 10 fixed sections per RCD 2013/53/EU. Subheadings organize files within sections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <FolderOpen className="h-4 w-4" />
              <span className="text-xs font-medium">Sections</span>
            </div>
            <p className="text-xl font-bold text-slate-800">
              {counts.populatedSections}
              <span className="text-sm font-normal text-slate-500"> / 10</span>
            </p>
            <p className="text-xs text-slate-500">with items</p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Paperclip className="h-4 w-4" />
              <span className="text-xs font-medium">Evidence</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{counts.totalAttachmentRefs}</p>
            <p className="text-xs text-blue-500">attachments filed</p>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Generated</span>
            </div>
            <p className="text-xl font-bold text-purple-700">{counts.totalGeneratedArtifacts}</p>
            <p className="text-xs text-purple-500">artifacts filed</p>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <FolderOpen className="h-4 w-4" />
              <span className="text-xs font-medium">Subheadings</span>
            </div>
            <p className="text-xl font-bold text-amber-700">
              {counts.totalSubheadings - counts.archivedSubheadings}
              {counts.archivedSubheadings > 0 && (
                <span className="text-sm font-normal text-amber-500"> (+{counts.archivedSubheadings} archived)</span>
              )}
            </p>
            <p className="text-xs text-amber-500">active subheadings</p>
          </div>
        </div>

        {/* Completion Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600">Dossier Completion</span>
            <span className="text-slate-900 font-medium">
              {counts.populatedSections}/10 sections
            </span>
          </div>
          <Progress value={(counts.populatedSections / 10) * 100} className="h-2" />
        </div>

        {/* Sections List */}
        <div className="space-y-2">
          {technicalFile.sections.map((section, index) => {
            const sectionCounts = getSectionItemCounts(section);
            const isExpanded = expandedSections.has(section.id);
            const hasItems = sectionCounts.total > 0;

            // Get cert pack references for this section
            const sectionCertRefs = getCertPacksReferencingSection(project, section.id as TechnicalFileSectionId);
            const sectionCertStats = getAggregatedCertStatsForSection(project, section.id as TechnicalFileSectionId);

            return (
              <Collapsible
                key={section.id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
              >
                <div className={`border rounded-lg ${hasItems ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">{index + 1}.</span>
                            <span className="font-medium text-slate-900">{section.title}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {TECHNICAL_FILE_SECTION_DESCRIPTIONS[section.id]}
                          </p>
                          {/* Show cert pack references summary */}
                          {sectionCertStats.packCount > 0 && (
                            <CertStatsSummary stats={sectionCertStats} className="mt-1" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-slate-600 border-slate-200">
                          {section.subheadings.filter(sh => !sh.archived).length} subheadings
                        </Badge>
                        {sectionCounts.total > 0 && (
                          <Badge className="bg-teal-100 text-teal-700 border-0">
                            {sectionCounts.total} items
                          </Badge>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t">
                      {/* Subheadings List */}
                      <div className="space-y-2 mt-3">
                        {getAllSubheadings(section).map((subheading) => {
                          const subheadingCounts = getSubheadingItemCounts(subheading);
                          const isSubheadingExpanded = expandedSubheadings.has(subheading.id);
                          const refCount = subheadingRefCounts.get(subheading.id) || 0;
                          const isArchived = subheading.archived;
                          const subheadingHasItems = subheadingCounts.total > 0;

                          // Get cert pack references for this subheading
                          const subheadingCertRefs = getCertPacksReferencingSubheading(
                            project,
                            section.id as TechnicalFileSectionId,
                            subheading.id
                          );

                          return (
                            <SubheadingCard
                              key={subheading.id}
                              section={section}
                              subheading={subheading}
                              subheadingCounts={subheadingCounts}
                              refCount={refCount}
                              certPackRefs={subheadingCertRefs}
                              isExpanded={isSubheadingExpanded}
                              onToggle={() => toggleSubheading(subheading.id)}
                              availableAttachments={availableAttachments}
                              canEdit={canEdit && !isReadOnly}
                              onFileAttachment={() => handleFileAttachment(section.id, subheading.id)}
                              onRemoveItem={(itemIndex) => handleRemoveItem(section.id, subheading.id, itemIndex)}
                              onRename={() => handleOpenRename(section.id, subheading.id, subheading.title)}
                              onArchive={() => handleArchiveSubheading(section.id, subheading.id)}
                              onUnarchive={() => handleUnarchiveSubheading(section.id, subheading.id)}
                              onDelete={() => handleOpenDelete(section.id, subheading)}
                              project={project}
                            />
                          );
                        })}
                      </div>

                      {/* Add Subheading Action */}
                      {canEdit && !isReadOnly && (
                        <div className="mt-4 pt-3 border-t border-dashed">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-slate-700"
                            onClick={() => handleOpenAddSubheading(section.id)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Subheading
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>

      {/* File Attachment Dialog */}
      <FileAttachmentDialog
        open={showFileToDialog}
        onOpenChange={setShowFileToDialog}
        targetSection={fileToTarget?.sectionId || null}
        targetSubheading={fileToTarget?.subheadingId || null}
        availableAttachments={availableAttachments}
        technicalFile={technicalFile}
        onFile={(attachmentId) => fileToTarget && handleAddAttachmentToSubheading(fileToTarget.sectionId, fileToTarget.subheadingId, attachmentId)}
      />

      {/* Add Subheading Dialog */}
      <Dialog open={showAddSubheadingDialog} onOpenChange={setShowAddSubheadingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              Add Subheading
            </DialogTitle>
            <DialogDescription>
              Add a new subheading to organize files in{' '}
              {addSubheadingTarget ? TECHNICAL_FILE_SECTION_TITLES[addSubheadingTarget] : 'this section'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subheading-title">Title</Label>
              <Input
                id="subheading-title"
                value={newSubheadingTitle}
                onChange={(e) => setNewSubheadingTitle(e.target.value)}
                placeholder="Enter subheading title..."
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSubheadingDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddSubheading}
              disabled={!newSubheadingTitle.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Subheading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Subheading Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-teal-600" />
              Rename Subheading
            </DialogTitle>
            <DialogDescription>
              Renaming does not affect checklist references (they use stable IDs).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-title">New Title</Label>
              <Input
                id="rename-title"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new title..."
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRename}
              disabled={!renameValue.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteCheck?.canDelete ? (
                <Trash2 className="h-5 w-5 text-red-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              {deleteCheck?.canDelete ? 'Delete Subheading?' : 'Cannot Delete Subheading'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteCheck?.canDelete ? (
                  <p>
                    Are you sure you want to permanently delete "{deleteTarget?.title}"? This action cannot be undone.
                  </p>
                ) : (
                  <>
                    <p className="text-amber-700">{deleteCheck?.message}</p>
                    <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Checklist references:</span>
                        <Badge variant="outline" className={deleteCheck?.checklistRefCount ? 'border-amber-300 text-amber-700' : ''}>
                          {deleteCheck?.checklistRefCount || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Contains files:</span>
                        <Badge variant="outline" className={deleteCheck?.itemCount ? 'border-amber-300 text-amber-700' : ''}>
                          {deleteCheck?.itemCount || 0}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      Consider <strong>archiving</strong> this subheading instead. Archived subheadings are hidden from file pickers but preserve existing files and checklist links.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleteCheck?.canDelete ? (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => {
                  if (deleteTarget) {
                    handleArchiveSubheading(deleteTarget.sectionId, deleteTarget.subheadingId);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive Instead
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    </TooltipProvider>
  );
}

// ============================================
// DOSSIER ITEM ROW
// ============================================

interface DossierItemRowProps {
  item: TechnicalFileItem;
  project: Project;
  availableAttachments: ComplianceAttachment[];
  canRemove: boolean;
  onRemove: () => void;
}

function DossierItemRow({ item, project, availableAttachments, canRemove, onRemove }: DossierItemRowProps) {
  const typeLabel = getItemTypeLabel(item);
  const typeColor = getItemTypeColor(item);

  // Get details based on item type
  let title = '';
  let subtitle = '';
  let icon = <FileText className="h-4 w-4" />;

  if (item.kind === 'attachmentRef') {
    const attachment = availableAttachments.find((a) => a.id === item.attachmentId);
    title = attachment?.filename || 'Unknown attachment';
    subtitle = attachment ? `${(attachment.sizeBytes / 1024).toFixed(1)} KB` : '';
    icon = <Paperclip className="h-4 w-4" />;
  } else if (item.kind === 'generatedArtifact') {
    title = item.title;
    subtitle = `Generated ${item.generatedAt ? new Date(item.generatedAt).toLocaleDateString() : ''}`;
    icon = <Sparkles className="h-4 w-4" />;
  } else if (item.kind === 'inputRef') {
    title = item.label;
    subtitle = `Reference: ${item.inputType}`;
    icon = <Link2 className="h-4 w-4" />;
  }

  return (
    <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
      <div className="flex items-center gap-2">
        <div className={typeColor}>{icon}</div>
        <div>
          <p className="font-medium text-slate-700">{title}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-xs ${typeColor}`}>
          {typeLabel}
        </Badge>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// SUBHEADING CARD
// ============================================

interface SubheadingCardProps {
  section: TechnicalFileSection;
  subheading: TechnicalFileSubheading;
  subheadingCounts: ReturnType<typeof getSubheadingItemCounts>;
  refCount: number;
  certPackRefs: ReturnType<typeof getCertPacksReferencingSubheading>;
  isExpanded: boolean;
  onToggle: () => void;
  availableAttachments: ComplianceAttachment[];
  canEdit: boolean;
  onFileAttachment: () => void;
  onRemoveItem: (itemIndex: number) => void;
  onRename: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  project: Project;
}

function SubheadingCard({
  section,
  subheading,
  subheadingCounts,
  refCount,
  certPackRefs,
  isExpanded,
  onToggle,
  availableAttachments,
  canEdit,
  onFileAttachment,
  onRemoveItem,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
  project,
}: SubheadingCardProps) {
  const hasItems = subheadingCounts.total > 0;
  const isArchived = subheading.archived;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={`border rounded-lg ${
          isArchived
            ? 'border-dashed border-slate-300 bg-slate-50/50'
            : hasItems
              ? 'border-slate-200 bg-white'
              : 'border-dashed border-slate-200 bg-white'
        }`}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-2.5 text-left hover:bg-slate-50/80 rounded-lg"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${isArchived ? 'text-slate-500' : 'text-slate-800'}`}>
                    {subheading.title}
                  </span>
                  {isArchived && (
                    <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">
                      <Archive className="h-2.5 w-2.5 mr-1" />
                      Archived
                    </Badge>
                  )}
                </div>
                {/* Usage info */}
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  {refCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 text-teal-600">
                          <Link2 className="h-3 w-3" />
                          {refCount} checklist ref{refCount !== 1 ? 's' : ''}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Referenced by {refCount} checklist item{refCount !== 1 ? 's' : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {hasItems && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {subheadingCounts.total} file{subheadingCounts.total !== 1 ? 's' : ''}
                    </span>
                  )}
                  {/* Show cert pack references */}
                  {certPackRefs.length > 0 && (
                    <CertPackReferences references={certPackRefs} compact className="ml-1" />
                  )}
                </div>
              </div>
            </div>

            {/* Actions (stop propagation to prevent toggle) */}
            {canEdit && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                      onClick={onRename}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rename</TooltipContent>
                </Tooltip>

                {isArchived ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-teal-600"
                        onClick={onUnarchive}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Unarchive</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600"
                        onClick={onArchive}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Archive</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t border-slate-100">
            {/* Items List */}
            {subheading.items.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {subheading.items.map((item, itemIndex) => (
                  <DossierItemRow
                    key={itemIndex}
                    item={item}
                    project={project}
                    availableAttachments={availableAttachments}
                    canRemove={canEdit}
                    onRemove={() => onRemoveItem(itemIndex)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400">
                No files in this subheading
              </div>
            )}

            {/* Add File Action */}
            {canEdit && !isArchived && (
              <div className="mt-2 pt-2 border-t border-dashed border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500 hover:text-teal-600"
                  onClick={onFileAttachment}
                >
                  <Paperclip className="h-3 w-3 mr-1" />
                  File Attachment
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================
// FILE ATTACHMENT DIALOG
// ============================================

interface FileAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetSection: TechnicalFileSectionId | null;
  targetSubheading: string | null;
  availableAttachments: ComplianceAttachment[];
  technicalFile: ReturnType<typeof ensureTechnicalFile>;
  onFile: (attachmentId: string) => void;
}

function FileAttachmentDialog({
  open,
  onOpenChange,
  targetSection,
  targetSubheading,
  availableAttachments,
  technicalFile,
  onFile,
}: FileAttachmentDialogProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<string>('');

  // Get already filed attachments for the target subheading
  const alreadyFiledIds = useMemo(() => {
    if (!targetSection || !targetSubheading) return new Set<string>();
    const section = technicalFile.sections.find((s) => s.id === targetSection);
    if (!section) return new Set<string>();
    const subheading = section.subheadings.find((sh) => sh.id === targetSubheading);
    if (!subheading) return new Set<string>();
    return new Set(
      subheading.items
        .filter((item) => item.kind === 'attachmentRef')
        .map((item) => (item as { attachmentId: string }).attachmentId)
    );
  }, [targetSection, targetSubheading, technicalFile]);

  // Get subheading title for display
  const subheadingTitle = useMemo(() => {
    if (!targetSection || !targetSubheading) return '';
    const section = technicalFile.sections.find((s) => s.id === targetSection);
    if (!section) return '';
    const subheading = section.subheadings.find((sh) => sh.id === targetSubheading);
    return subheading?.title || '';
  }, [targetSection, targetSubheading, technicalFile]);

  // Filter to show only not-yet-filed attachments
  const unfiledAttachments = availableAttachments.filter((a) => !alreadyFiledIds.has(a.id));

  function handleFile() {
    if (selectedAttachment) {
      onFile(selectedAttachment);
      setSelectedAttachment('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-teal-600" />
            File Attachment to Dossier
          </DialogTitle>
          <DialogDescription>
            Select an evidence attachment to file to "{subheadingTitle}".
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {unfiledAttachments.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Paperclip className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No unfiled attachments available.</p>
              <p className="text-xs text-slate-400 mt-1">
                Upload evidence in the Compliance Packs section first.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unfiledAttachments.map((att) => (
                <button
                  key={att.id}
                  type="button"
                  onClick={() => setSelectedAttachment(att.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded border text-left transition-colors ${
                    selectedAttachment === att.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Paperclip className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{att.filename}</p>
                    <p className="text-xs text-slate-500">
                      {(att.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleFile}
            disabled={!selectedAttachment}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <FolderOpen className="h-4 w-4 mr-1" />
            File to Dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
