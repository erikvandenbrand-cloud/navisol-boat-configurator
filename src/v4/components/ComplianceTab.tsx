/**
 * Compliance Tab Component - v4
 * Displays and manages certification packs for a project
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Upload,
  Trash2,
  Paperclip,
  Check,
  AlertTriangle,
  Copy,
  CheckCircle,
  XCircle,
  Circle,
  Clock,
  MinusCircle,
  ClipboardCheck,
  FolderOpen,
  Filter,
} from 'lucide-react';
import type {
  Project,
  ComplianceCertification,
  ComplianceChapter,
  ComplianceSection,
  ComplianceAttachment,
  ComplianceChecklistItem,
  CertificationType,
  AttachmentType,
  ChecklistItemStatus,
} from '@/domain/models';
import {
  CERTIFICATION_LABELS,
  ATTACHMENT_TYPE_LABELS,
  CHECKLIST_TYPE_LABELS,
  CHECKLIST_STATUS_LABELS,
  getCertificationStats,
  getChapterChecklistStats,
  validateCertification,
  validateChapterChecklist,
  getChapterWarningsSummary,
} from '@/domain/models';
import { ComplianceService } from '@/domain/services';
import { getAuditContext } from '@/domain/auth';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { DocumentTemplatesSection } from './DocumentTemplatesSection';
import { VesselSystemsSection } from './VesselSystemsSection';
import { AppliedStandardsSection } from './AppliedStandardsSection';

// ============================================
// TYPES
// ============================================

interface ComplianceTabProps {
  project: Project;
  onRefresh: () => void;
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get all attachment IDs that are "used" by references in the project.
 * An attachment is "used" if its ID appears in:
 * - project.appliedStandards[].evidenceAttachmentIds
 * - project.technicalFile.sections[].items[].attachmentId (when kind is 'attachmentRef')
 */
function getUsedAttachmentIds(project: Project): Set<string> {
  const usedIds = new Set<string>();

  // Collect from Applied Standards evidence references
  for (const standard of project.appliedStandards || []) {
    for (const attId of standard.evidenceAttachmentIds || []) {
      usedIds.add(attId);
    }
  }

  // Collect from Technical File section items
  for (const section of project.technicalFile?.sections || []) {
    for (const item of section.items || []) {
      if (item.kind === 'attachmentRef' && item.attachmentId) {
        usedIds.add(item.attachmentId);
      }
    }
  }

  return usedIds;
}

export type AttachmentUsageFilter = 'all' | 'used' | 'unused';

// ============================================
// MAIN COMPONENT
// ============================================

export function ComplianceTab({ project, onRefresh }: ComplianceTabProps) {
  const { can } = useAuth();
  const [showNewCertDialog, setShowNewCertDialog] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [uploadTarget, setUploadTarget] = useState<{
    certId: string;
    chapterId: string;
    sectionId?: string;
  } | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<{
    type: 'certification' | 'chapter' | 'section';
    certId: string;
    chapterId?: string;
    sectionId?: string;
    name: string;
    validation?: {
      hasWarnings: boolean;
      failedCount: number;
      incompleteCount: number;
      summary: string;
    };
  } | null>(null);
  const [attachmentFilter, setAttachmentFilter] = useState<AttachmentUsageFilter>('all');

  // Compute used attachment IDs from project references
  const usedAttachmentIds = useMemo(() => getUsedAttachmentIds(project), [project]);

  const packs = project.compliancePacks || [];
  const selectedCert = packs.find(p => p.id === selectedCertId);

  const canCreate = can('compliance:create');
  const canUpdate = can('compliance:update');
  const canFinalize = can('compliance:finalize');

  // Project type gating: REFIT and MAINTENANCE don't require compliance by default
  const isComplianceOptionalType = project.type === 'REFIT' || project.type === 'MAINTENANCE';
  const hasExistingComplianceData = packs.length > 0;
  // Show compliance not required message only for optional types with no existing data
  const showComplianceNotRequired = isComplianceOptionalType && !hasExistingComplianceData;

  function toggleChapter(chapterId: string) {
    const next = new Set(expandedChapters);
    if (next.has(chapterId)) {
      next.delete(chapterId);
    } else {
      next.add(chapterId);
    }
    setExpandedChapters(next);
  }

  async function handleCreateCertification(type: CertificationType, name?: string) {
    const result = await ComplianceService.initializeCertification(
      project.id,
      { type, name },
      getAuditContext()
    );

    if (result.ok) {
      setShowNewCertDialog(false);
      onRefresh();
      setSelectedCertId(result.value.id);
    } else {
      alert(result.error);
    }
  }

  async function handleDuplicateCertification(certId: string) {
    const result = await ComplianceService.duplicateCertification(
      project.id,
      certId,
      getAuditContext()
    );

    if (result.ok) {
      onRefresh();
      setSelectedCertId(result.value.id);
    } else {
      alert(result.error);
    }
  }

  async function handleFinalize() {
    if (!finalizeTarget) return;

    let result;
    if (finalizeTarget.type === 'certification') {
      result = await ComplianceService.finalizeCertification(
        project.id,
        finalizeTarget.certId,
        getAuditContext()
      );
    } else if (finalizeTarget.type === 'chapter' && finalizeTarget.chapterId) {
      result = await ComplianceService.finalizeChapter(
        project.id,
        finalizeTarget.certId,
        finalizeTarget.chapterId,
        getAuditContext()
      );
    } else if (finalizeTarget.type === 'section' && finalizeTarget.chapterId && finalizeTarget.sectionId) {
      result = await ComplianceService.finalizeSection(
        project.id,
        finalizeTarget.certId,
        finalizeTarget.chapterId,
        finalizeTarget.sectionId,
        getAuditContext()
      );
    }

    if (result?.ok) {
      setFinalizeTarget(null);
      onRefresh();
    } else if (result) {
      alert(result.error);
    }
  }

  async function handleFileUpload(files: FileList) {
    if (!uploadTarget) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        const attachmentType: AttachmentType = file.type.includes('pdf') ? 'CERTIFICATE' :
          file.name.endsWith('.step') || file.name.endsWith('.stp') ? '3D' :
          file.name.endsWith('.dwg') || file.name.endsWith('.dxf') ? 'DRAWING' :
          'OTHER';

        let result;
        if (uploadTarget.sectionId) {
          result = await ComplianceService.addSectionAttachment(
            project.id,
            uploadTarget.certId,
            uploadTarget.chapterId,
            uploadTarget.sectionId,
            {
              type: attachmentType,
              filename: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              dataUrl,
            },
            getAuditContext()
          );
        } else {
          result = await ComplianceService.addChapterAttachment(
            project.id,
            uploadTarget.certId,
            uploadTarget.chapterId,
            {
              type: attachmentType,
              filename: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              dataUrl,
            },
            getAuditContext()
          );
        }

        if (!result.ok) {
          alert(result.error);
        }
      };
      reader.readAsDataURL(file);
    }

    setUploadTarget(null);
    // Small delay to allow all files to upload
    setTimeout(onRefresh, 500);
  }

  async function handleRemoveAttachment(certId: string, chapterId: string, attachmentId: string) {
    const result = await ComplianceService.removeChapterAttachment(
      project.id,
      certId,
      chapterId,
      attachmentId,
      getAuditContext()
    );

    if (result.ok) {
      onRefresh();
    } else {
      alert(result.error);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-600" />
              Compliance & Certifications
            </CardTitle>
            <CardDescription>
              {showComplianceNotRequired
                ? `Compliance certification is typically not required for ${project.type === 'REFIT' ? 'refit' : 'maintenance'} projects`
                : 'Manage certification evidence and documentation for CE, ES-TRIN, Lloyds, and other standards'
              }
            </CardDescription>
          </div>
          {/* Only show New Certification button for NEW_BUILD or when compliance data already exists */}
          {(!isComplianceOptionalType || hasExistingComplianceData) && (
            <PermissionGuard permission="compliance:create">
              <Button onClick={() => setShowNewCertDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Certification
              </Button>
            </PermissionGuard>
          )}
        </CardHeader>
        <CardContent>
          {/* Show "Compliance not required" message for REFIT/MAINTENANCE with no existing data */}
          {showComplianceNotRequired ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Shield className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">Compliance not required for this project type</h4>
              <p className="text-sm text-slate-500 max-w-xs mb-5">
                {project.type === 'REFIT'
                  ? 'Refit projects typically do not require new CE certification or compliance documentation. If certification is needed, you can still create a compliance pack.'
                  : 'Maintenance projects typically do not require new CE certification or compliance documentation. If certification is needed, you can still create a compliance pack.'
                }
              </p>
              {canCreate && (
                <Button variant="outline" onClick={() => setShowNewCertDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Certification Pack Anyway
                </Button>
              )}
            </div>
          ) : packs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Shield className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">No certifications</h4>
              <p className="text-sm text-slate-500 max-w-xs mb-5">
                Create a certification pack to start collecting evidence and documentation for compliance.
              </p>
              {canCreate && (
                <Button variant="outline" onClick={() => setShowNewCertDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Certification Pack
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packs.map((cert) => {
                const stats = getCertificationStats(cert);
                const isSelected = selectedCertId === cert.id;

                return (
                  <button
                    key={cert.id}
                    type="button"
                    onClick={() => setSelectedCertId(cert.id)}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileCheck className={`h-5 w-5 ${cert.status === 'FINAL' ? 'text-green-600' : 'text-teal-600'}`} />
                        <Badge
                          className={
                            cert.status === 'FINAL'
                              ? 'bg-green-100 text-green-700 border-0'
                              : 'bg-amber-100 text-amber-700 border-0'
                          }
                        >
                          {cert.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400">v{cert.version}</span>
                    </div>
                    <h4 className="font-medium text-slate-900 mb-1">{cert.name}</h4>
                    <p className="text-xs text-slate-500 mb-2">
                      {stats.finalChapters}/{stats.totalChapters} chapters • {stats.passedChecklistItems}/{stats.totalChecklistItems - stats.naChecklistItems} checks
                    </p>
                    <Progress value={stats.checklistPercentComplete} className="h-1.5" />
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>{stats.totalAttachments} attachments</span>
                      <span>{stats.checklistPercentComplete}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Certification Detail */}
      {selectedCert && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedCert.name}
                {selectedCert.status === 'FINAL' && (
                  <Lock className="h-4 w-4 text-green-600" />
                )}
              </CardTitle>
              <CardDescription>
                Created {formatDate(selectedCert.createdAt)} by {selectedCert.createdBy}
                {selectedCert.finalizedAt && (
                  <> • Finalized {formatDate(selectedCert.finalizedAt)}</>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedCert.status === 'FINAL' && canCreate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateCertification(selectedCert.id)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  New Version
                </Button>
              )}
              {selectedCert.status === 'DRAFT' && canFinalize && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    const validation = validateCertification(selectedCert);
                    setFinalizeTarget({
                      type: 'certification',
                      certId: selectedCert.id,
                      name: selectedCert.name,
                      validation: {
                        hasWarnings: !validation.isValid,
                        failedCount: validation.totalFailedMandatory,
                        incompleteCount: validation.totalIncompleteMandatory,
                        summary: validation.finalizeSummary,
                      },
                    });
                  }}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Finalize All
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Certification-Level Validation Banner */}
          {selectedCert.status === 'DRAFT' && (() => {
            const validation = validateCertification(selectedCert);
            if (!validation.isValid) {
              return (
                <div className="mx-6 mb-4 p-3 rounded-lg border bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">Validation Warnings</p>
                      <p className="text-sm text-amber-700 mt-1">
                        {validation.totalMandatory} mandatory items across all chapters: {' '}
                        {validation.totalFailedMandatory > 0 && (
                          <span className="text-red-600 font-medium">
                            {validation.totalFailedMandatory} failed
                          </span>
                        )}
                        {validation.totalFailedMandatory > 0 && validation.totalIncompleteMandatory > 0 && ', '}
                        {validation.totalIncompleteMandatory > 0 && (
                          <span className="text-amber-600 font-medium">
                            {validation.totalIncompleteMandatory} incomplete
                          </span>
                        )}
                      </p>
                      {validation.chapterResults.filter(r => !r.isValid).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {validation.chapterResults.filter(r => !r.isValid).map(r => (
                            <Badge
                              key={r.chapterId}
                              variant="outline"
                              className={`text-[10px] ${
                                r.failedMandatoryCount > 0
                                  ? 'border-red-300 text-red-600'
                                  : 'border-amber-300 text-amber-600'
                              }`}
                            >
                              Ch. {r.chapterNumber}: {r.failedMandatoryCount > 0 ? `${r.failedMandatoryCount} failed` : `${r.incompleteMandatoryCount} incomplete`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <CardContent className="space-y-4">
            {/* Attachment Filter Toggle */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                <span>Filter attachments:</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={attachmentFilter === 'all' ? 'default' : 'outline'}
                  className={`h-7 px-2 text-xs ${attachmentFilter === 'all' ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                  onClick={() => setAttachmentFilter('all')}
                  data-testid="attachment-filter-all"
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={attachmentFilter === 'used' ? 'default' : 'outline'}
                  className={`h-7 px-2 text-xs ${attachmentFilter === 'used' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setAttachmentFilter('used')}
                  data-testid="attachment-filter-used"
                >
                  Used
                </Button>
                <Button
                  size="sm"
                  variant={attachmentFilter === 'unused' ? 'default' : 'outline'}
                  className={`h-7 px-2 text-xs ${attachmentFilter === 'unused' ? 'bg-slate-600 hover:bg-slate-700' : ''}`}
                  onClick={() => setAttachmentFilter('unused')}
                  data-testid="attachment-filter-unused"
                >
                  Unused
                </Button>
              </div>
            </div>

            {/* Chapters */}
            {selectedCert.chapters.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                certId={selectedCert.id}
                projectId={project.id}
                isExpanded={expandedChapters.has(chapter.id)}
                onToggle={() => toggleChapter(chapter.id)}
                onUpload={(sectionId) =>
                  setUploadTarget({
                    certId: selectedCert.id,
                    chapterId: chapter.id,
                    sectionId,
                  })
                }
                onFinalize={(sectionId) => {
                  const chapterValidation = validateChapterChecklist(chapter);
                  setFinalizeTarget({
                    type: sectionId ? 'section' : 'chapter',
                    certId: selectedCert.id,
                    chapterId: chapter.id,
                    sectionId,
                    name: sectionId
                      ? chapter.sections.find(s => s.id === sectionId)?.title || 'Section'
                      : chapter.title,
                    validation: sectionId ? undefined : {
                      hasWarnings: !chapterValidation.isValid,
                      failedCount: chapterValidation.failedMandatoryCount,
                      incompleteCount: chapterValidation.incompleteMandatoryCount,
                      summary: chapterValidation.isValid
                        ? 'All mandatory checklist items are complete.'
                        : `${chapterValidation.failedMandatoryCount} failed, ${chapterValidation.incompleteMandatoryCount} incomplete mandatory items.`,
                    },
                  });
                }}
                onRemoveAttachment={(attachmentId) =>
                  handleRemoveAttachment(selectedCert.id, chapter.id, attachmentId)
                }
                onChecklistUpdate={onRefresh}
                canUpdate={canUpdate && selectedCert.status === 'DRAFT'}
                canFinalize={canFinalize && selectedCert.status === 'DRAFT'}
                usedAttachmentIds={usedAttachmentIds}
                attachmentFilter={attachmentFilter}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* New Certification Dialog */}
      <NewCertificationDialog
        open={showNewCertDialog}
        onOpenChange={setShowNewCertDialog}
        existingTypes={packs.filter(p => p.status !== 'FINAL').map(p => p.type)}
        onCreate={handleCreateCertification}
      />

      {/* Upload Dialog */}
      <Dialog open={!!uploadTarget} onOpenChange={(open) => !open && setUploadTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
            <DialogDescription>
              Add evidence documents, certificates, or drawings
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.step,.stp,.dwg,.dxf,.xlsx,.xls"
            />
            <p className="text-xs text-slate-500 mt-2">
              Supported: PDF, Word, Images, 3D (STEP), CAD (DWG/DXF), Excel
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={!!finalizeTarget} onOpenChange={(open) => !open && setFinalizeTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {finalizeTarget?.validation?.hasWarnings ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Lock className="h-5 w-5 text-green-500" />
              )}
              Finalize {finalizeTarget?.type === 'certification' ? 'Certification' : finalizeTarget?.type === 'chapter' ? 'Chapter' : 'Section'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {finalizeTarget?.type === 'certification' ? (
                  <p>
                    You are about to finalize <strong>{finalizeTarget.name}</strong> and all its chapters.
                    This will lock all content and prevent further edits. To make changes, you will need
                    to create a new version.
                  </p>
                ) : (
                  <p>
                    You are about to finalize <strong>{finalizeTarget?.name}</strong>.
                    This will lock the content and prevent further edits.
                  </p>
                )}

                {/* Validation Summary */}
                {finalizeTarget?.validation && (
                  <div className={`p-3 rounded-lg border ${
                    finalizeTarget.validation.hasWarnings
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {finalizeTarget.validation.hasWarnings ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          finalizeTarget.validation.hasWarnings ? 'text-amber-800' : 'text-green-800'
                        }`}>
                          {finalizeTarget.validation.hasWarnings ? 'Validation Warnings' : 'Validation Passed'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          finalizeTarget.validation.hasWarnings ? 'text-amber-700' : 'text-green-700'
                        }`}>
                          {finalizeTarget.validation.summary}
                        </p>
                        {finalizeTarget.validation.hasWarnings && (
                          <div className="flex gap-4 mt-2 text-xs">
                            {finalizeTarget.validation.failedCount > 0 && (
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-3 w-3" />
                                {finalizeTarget.validation.failedCount} failed
                              </span>
                            )}
                            {finalizeTarget.validation.incompleteCount > 0 && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Clock className="h-3 w-3" />
                                {finalizeTarget.validation.incompleteCount} incomplete
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {finalizeTarget?.validation?.hasWarnings && (
                  <p className="text-xs text-slate-500">
                    Proceeding will permanently lock these issues. You may want to resolve them first.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalize}
              className={finalizeTarget?.validation?.hasWarnings
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-green-600 hover:bg-green-700'
              }
            >
              <Lock className="h-4 w-4 mr-1" />
              {finalizeTarget?.validation?.hasWarnings ? 'Finalize Anyway' : 'Finalize'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Technical Dossier Section (informational only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-teal-600" />
            Technical Dossier
          </CardTitle>
          <CardDescription>
            Internal evidence container (attachments only). Not a generated document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Attach evidence in the certification packs above. Each certification chapter can hold attachments such as certificates, drawings, calculations, and test reports.
          </p>
        </CardContent>
      </Card>

      {/* Applied Standards Section */}
      <AppliedStandardsSection project={project} onRefresh={onRefresh} />

      {/* Vessel Systems Section (Owner's Manual applicability) */}
      <VesselSystemsSection project={project} onRefresh={onRefresh} />

      {/* Document Templates Section */}
      <DocumentTemplatesSection project={project} onRefresh={onRefresh} />
    </div>
  );
}

// ============================================
// CHAPTER CARD
// ============================================

interface ChapterCardProps {
  chapter: ComplianceChapter;
  certId: string;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onUpload: (sectionId?: string) => void;
  onFinalize: (sectionId?: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onChecklistUpdate: () => void;
  canUpdate: boolean;
  canFinalize: boolean;
  usedAttachmentIds: Set<string>;
  attachmentFilter: AttachmentUsageFilter;
}

function ChapterCard({
  chapter,
  certId,
  projectId,
  isExpanded,
  onToggle,
  onUpload,
  onFinalize,
  onRemoveAttachment,
  onChecklistUpdate,
  canUpdate,
  canFinalize,
  usedAttachmentIds,
  attachmentFilter,
}: ChapterCardProps) {
  const isFinal = chapter.status === 'FINAL';
  const checklistStats = getChapterChecklistStats(chapter);
  const warningsSummary = getChapterWarningsSummary(chapter);

  async function handleStatusChange(itemId: string, status: ChecklistItemStatus, naReason?: string) {
    const result = await ComplianceService.updateChecklistStatus(
      projectId,
      certId,
      chapter.id,
      itemId,
      status,
      naReason,
      getAuditContext()
    );
    if (result.ok) {
      onChecklistUpdate();
    }
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`border rounded-lg ${isFinal ? 'bg-green-50/30 border-green-200' : ''}`}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {chapter.chapterNumber}. {chapter.title}
                  </span>
                  {isFinal ? (
                    <Lock className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
                {chapter.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{chapter.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Warning indicators */}
              {!isFinal && warningsSummary.hasErrors && (
                <Badge variant="outline" className="border-red-300 text-red-600 text-[10px] px-1.5 py-0">
                  <XCircle className="h-3 w-3 mr-1" />
                  {warningsSummary.errorCount} failed
                </Badge>
              )}
              {!isFinal && warningsSummary.hasWarnings && !warningsSummary.hasErrors && (
                <Badge variant="outline" className="border-amber-300 text-amber-600 text-[10px] px-1.5 py-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {warningsSummary.warningCount} incomplete
                </Badge>
              )}
              {!isFinal && !warningsSummary.hasErrors && !warningsSummary.hasWarnings && checklistStats.mandatory > 0 && (
                <Badge variant="outline" className="border-green-300 text-green-600 text-[10px] px-1.5 py-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
              {checklistStats.total > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <ClipboardCheck className={`h-3 w-3 ${
                    checklistStats.percentComplete === 100 ? 'text-green-600' : 'text-slate-400'
                  }`} />
                  <span className={checklistStats.percentComplete === 100 ? 'text-green-600' : 'text-slate-500'}>
                    {checklistStats.passed}/{checklistStats.total - checklistStats.na}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Paperclip className="h-3 w-3" />
                {chapter.attachments.length}
              </div>
              <Badge
                className={
                  isFinal
                    ? 'bg-green-100 text-green-700 border-0'
                    : 'bg-slate-100 text-slate-600 border-0'
                }
              >
                {chapter.status}
              </Badge>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-4 border-t">
            {/* Attachments */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-slate-700">Attachments</h5>
                {canUpdate && !isFinal && (
                  <Button size="sm" variant="outline" onClick={() => onUpload()}>
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </Button>
                )}
              </div>
              {(() => {
                // Filter attachments based on usage filter
                const filteredAttachments = chapter.attachments.filter((att) => {
                  const isUsed = usedAttachmentIds.has(att.id);
                  if (attachmentFilter === 'used') return isUsed;
                  if (attachmentFilter === 'unused') return !isUsed;
                  return true; // 'all'
                });

                if (chapter.attachments.length === 0) {
                  return <p className="text-xs text-slate-500 italic">No attachments yet</p>;
                }

                if (filteredAttachments.length === 0) {
                  return (
                    <p className="text-xs text-slate-500 italic">
                      No {attachmentFilter} attachments (showing {chapter.attachments.length} total)
                    </p>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filteredAttachments.map((att) => (
                      <AttachmentRow
                        key={att.id}
                        attachment={att}
                        onRemove={() => onRemoveAttachment(att.id)}
                        canRemove={canUpdate && !isFinal}
                        isUsed={usedAttachmentIds.has(att.id)}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Checklist */}
            {(chapter.checklist?.length || 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Checklist
                    <Badge variant="outline" className="text-xs">
                      {checklistStats.passed}/{checklistStats.total - checklistStats.na} passed
                    </Badge>
                  </h5>
                  {checklistStats.mandatory > 0 && (
                    <span className="text-xs text-slate-500">
                      {checklistStats.mandatoryComplete}/{checklistStats.mandatory} mandatory
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {chapter.checklist?.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onStatusChange={(status, naReason) => handleStatusChange(item.id, status, naReason)}
                      canUpdate={canUpdate && !isFinal}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {chapter.sections.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-slate-700 mb-2">Subsections</h5>
                <div className="space-y-2">
                  {chapter.sections.map((section) => (
                    <SectionRow
                      key={section.id}
                      section={section}
                      onUpload={() => onUpload(section.id)}
                      onFinalize={() => onFinalize(section.id)}
                      canUpdate={canUpdate && !isFinal}
                      canFinalize={canFinalize && !isFinal}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Chapter Actions */}
            {canFinalize && !isFinal && (
              <div className="pt-2 border-t flex justify-end">
                <Button size="sm" variant="outline" onClick={() => onFinalize()}>
                  <Check className="h-3 w-3 mr-1" />
                  Finalize Chapter
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
// SECTION ROW
// ============================================

interface SectionRowProps {
  section: ComplianceSection;
  onUpload: () => void;
  onFinalize: () => void;
  canUpdate: boolean;
  canFinalize: boolean;
}

function SectionRow({ section, onUpload, onFinalize, canUpdate, canFinalize }: SectionRowProps) {
  const isFinal = section.status === 'FINAL';

  return (
    <div className={`p-3 bg-slate-50 rounded-lg ${isFinal ? 'bg-green-50/50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            {section.sectionNumber}. {section.title}
          </span>
          <Badge
            variant="outline"
            className={isFinal ? 'border-green-300 text-green-700' : ''}
          >
            {section.status}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Paperclip className="h-3 w-3" />
            {section.attachments.length}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canUpdate && !isFinal && (
            <Button size="sm" variant="ghost" onClick={onUpload}>
              <Upload className="h-3 w-3" />
            </Button>
          )}
          {canFinalize && !isFinal && (
            <Button size="sm" variant="ghost" onClick={onFinalize}>
              <Check className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ATTACHMENT ROW
// ============================================

interface AttachmentRowProps {
  attachment: ComplianceAttachment;
  onRemove: () => void;
  canRemove: boolean;
  isUsed?: boolean;
}

function AttachmentRow({ attachment, onRemove, canRemove, isUsed }: AttachmentRowProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-white border rounded text-sm">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-slate-400" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-700">{attachment.filename}</p>
            {isUsed !== undefined && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  isUsed
                    ? 'border-green-300 text-green-700 bg-green-50'
                    : 'border-slate-300 text-slate-500'
                }`}
                data-testid={`attachment-usage-badge-${attachment.id}`}
              >
                {isUsed ? 'Used' : 'Unused'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {ATTACHMENT_TYPE_LABELS[attachment.type]} • {formatFileSize(attachment.sizeBytes)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {attachment.dataUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const link = document.createElement('a');
              link.href = attachment.dataUrl!;
              link.download = attachment.filename;
              link.click();
            }}
          >
            Download
          </Button>
        )}
        {canRemove && (
          <Button size="sm" variant="ghost" className="text-red-600" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// CHECKLIST ITEM ROW
// ============================================

interface ChecklistItemRowProps {
  item: ComplianceChecklistItem;
  onStatusChange: (status: ChecklistItemStatus, naReason?: string) => void;
  canUpdate: boolean;
}

function ChecklistItemRow({ item, onStatusChange, canUpdate }: ChecklistItemRowProps) {
  const [showNaDialog, setShowNaDialog] = useState(false);
  const [naReason, setNaReason] = useState(item.naReason || '');

  function getStatusIcon() {
    switch (item.status) {
      case 'PASSED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'NA':
        return <MinusCircle className="h-4 w-4 text-slate-400" />;
      default:
        return <Circle className="h-4 w-4 text-slate-300" />;
    }
  }

  function handleNaConfirm() {
    if (naReason.trim()) {
      onStatusChange('NA', naReason.trim());
      setShowNaDialog(false);
    }
  }

  return (
    <>
      <div className={`flex items-center justify-between p-2 rounded-lg border ${
        item.status === 'PASSED' ? 'bg-green-50/50 border-green-200' :
        item.status === 'FAILED' ? 'bg-red-50/50 border-red-200' :
        item.status === 'NA' ? 'bg-slate-50 border-slate-200' :
        'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${item.status === 'NA' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {item.title}
              </span>
              {item.mandatory && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-300 text-amber-600">
                  Required
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {CHECKLIST_TYPE_LABELS[item.type]}
              </Badge>
            </div>
            {item.status === 'NA' && item.naReason && (
              <p className="text-xs text-slate-400 mt-0.5">N/A: {item.naReason}</p>
            )}
            {item.verifiedBy && (
              <p className="text-xs text-slate-500 mt-0.5">
                Verified by {item.verifiedBy}
              </p>
            )}
          </div>
        </div>
        {canUpdate && (
          <div className="flex items-center gap-1">
            {item.status !== 'PASSED' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                onClick={() => onStatusChange('PASSED')}
                title="Mark as Passed"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            {item.status !== 'FAILED' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                onClick={() => onStatusChange('FAILED')}
                title="Mark as Failed"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            {item.status !== 'NA' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-50"
                onClick={() => setShowNaDialog(true)}
                title="Mark as N/A"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            )}
            {item.status !== 'NOT_STARTED' && item.status !== 'IN_PROGRESS' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-50"
                onClick={() => onStatusChange('NOT_STARTED')}
                title="Reset"
              >
                <Circle className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* N/A Reason Dialog */}
      <AlertDialog open={showNaDialog} onOpenChange={setShowNaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Not Applicable</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason why this checklist item is not applicable to this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={naReason}
              onChange={(e) => setNaReason(e.target.value)}
              placeholder="e.g., No gas system installed on this vessel"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNaReason(item.naReason || '')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleNaConfirm} disabled={!naReason.trim()}>
              <MinusCircle className="h-4 w-4 mr-1" />
              Mark as N/A
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================
// NEW CERTIFICATION DIALOG
// ============================================

interface NewCertificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTypes: CertificationType[];
  onCreate: (type: CertificationType, name?: string) => void;
}

function NewCertificationDialog({
  open,
  onOpenChange,
  existingTypes,
  onCreate,
}: NewCertificationDialogProps) {
  const [type, setType] = useState<CertificationType>('CE');
  const [name, setName] = useState('');

  const availableTypes: CertificationType[] = ['CE', 'ES_TRIN', 'LLOYDS', 'OTHER'];

  function handleCreate() {
    onCreate(type, name || undefined);
    setType('CE');
    setName('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Certification Pack</DialogTitle>
          <DialogDescription>
            Select the certification type to create a new compliance pack with its standard chapter structure.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Certification Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CertificationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t} disabled={existingTypes.includes(t)}>
                    {CERTIFICATION_LABELS[t]}
                    {existingTypes.includes(t) && ' (in progress)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Custom Name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={CERTIFICATION_LABELS[type]}
            />
          </div>
          {type === 'CE' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                CE certification includes a 15-chapter structure based on the Recreational Craft Directive (RCD 2013/53/EU).
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
