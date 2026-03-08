/**
 * Deliverables Panel - v4
 * Generated compliance documents with preview, export, and file-to-dossier actions.
 *
 * Deliverables:
 * - Owner's Manual (opens block builder from here)
 * - Declaration of Conformity
 * - Equipment List
 *
 * Each deliverable shows:
 * - Input dependency checklist (ready/incomplete)
 * - Actions: Preview, Export PDF, File to Dossier
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Book,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Edit,
  Eye,
  FileCheck,
  FileText,
  FolderOpen,
  AlertCircle,
  List,
  Lock,
  Printer,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { Project } from '@/domain/models';
import {
  getDraftVersion,
  getApprovedVersion,
  isModularOwnerManual,
} from '@/domain/models/document-template';
import {
  OUTPUT_TO_SECTION_MAPPING,
  TECHNICAL_FILE_SECTION_TITLES,
  ensureTechnicalFile,
  getVisibleSubheadings,
  type TechnicalFileSectionId,
  type TechnicalFileGeneratedArtifact,
  type TechnicalFileSubheading,
} from '@/domain/models/technical-file';
import { ProjectRepository } from '@/data/repositories';
import { generateUUID, now } from '@/domain/models';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import OwnerManualBlocksEditor from './OwnerManualBlocksEditor';
import OwnerManualPreview from './OwnerManualPreview';

// ============================================
// TYPES
// ============================================

interface DeliverablesPanelProps {
  project: Project;
  onRefresh: () => void;
}

interface DeliverableStatus {
  id: string;
  type: string;
  label: string;
  icon: React.ReactNode;
  status: 'ready' | 'incomplete' | 'not-applicable';
  statusMessage: string;
  inputsUsed: { label: string; complete: boolean }[];
  canPreview: boolean;
  canExport: boolean;
  canFile: boolean;
  recommendedSection: TechnicalFileSectionId;
  onOpenBuilder?: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DeliverablesPanel({ project, onRefresh }: DeliverablesPanelProps) {
  const { can } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [fileToDialogOpen, setFileToDialogOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableStatus | null>(null);
  const [selectedSubheadingId, setSelectedSubheadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = can('compliance:update');
  const isReadOnly = project.status === 'CLOSED';

  // Owner's Manual data
  const ownerManualTemplate = useMemo(() => {
    return project.documentTemplates?.find((t) => t.type === 'DOC_OWNERS_MANUAL');
  }, [project.documentTemplates]);

  const currentVersion = useMemo(() => {
    if (!ownerManualTemplate) return undefined;
    return getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate);
  }, [ownerManualTemplate]);

  const hasModularBlocks = useMemo(() => {
    return currentVersion && isModularOwnerManual(currentVersion);
  }, [currentVersion]);

  const isEditable = currentVersion?.status === 'DRAFT';

  // Get deliverable statuses
  const deliverables = useMemo(() => {
    const items: DeliverableStatus[] = [];

    // Owner's Manual
    const includedBlocks = hasModularBlocks
      ? (currentVersion?.ownerManualBlocks?.filter((b: { included: boolean }) => b.included)?.length || 0)
      : 0;
    const hasBlockContent = hasModularBlocks
      ? currentVersion?.ownerManualBlocks?.some(
          (b: { included: boolean; content?: string }) => b.included && b.content && b.content.trim().length > 0
        )
      : false;

    const vesselIdentityComplete = !!(project.vesselIdentity?.modelName && project.vesselIdentity?.win);
    const systemsConfigured = (project.systems?.length || 0) > 0;

    items.push({
      id: 'owner-manual',
      type: 'DOC_OWNERS_MANUAL',
      label: "Owner's Manual",
      icon: <Book className="h-5 w-5" />,
      status: hasModularBlocks && includedBlocks > 0 && hasBlockContent ? 'ready' : 'incomplete',
      statusMessage: hasModularBlocks
        ? `${includedBlocks} sections${hasBlockContent ? ' with content' : ' - needs content'}`
        : 'No block template',
      inputsUsed: [
        { label: 'Vessel Identity', complete: vesselIdentityComplete },
        { label: 'Vessel Systems', complete: systemsConfigured },
        { label: 'Applied Standards', complete: (project.appliedStandards?.length || 0) > 0 },
      ],
      canPreview: !!(hasModularBlocks && includedBlocks > 0),
      canExport: !!(hasModularBlocks && includedBlocks > 0 && hasBlockContent),
      canFile: !!(hasModularBlocks && includedBlocks > 0 && hasBlockContent),
      recommendedSection: 'conformity-assessment',
      onOpenBuilder: () => setShowBuilderDialog(true),
    });

    // Declaration of Conformity
    const declarationsComplete = !!(
      project.declarations?.docReferenceNumber &&
      project.declarations?.docSignatory &&
      project.declarations?.conformityModule
    );

    items.push({
      id: 'doc',
      type: 'DOC_DOC',
      label: 'Declaration of Conformity',
      icon: <FileCheck className="h-5 w-5" />,
      status: vesselIdentityComplete && declarationsComplete ? 'ready' : 'incomplete',
      statusMessage: declarationsComplete ? 'Ready to generate' : 'Missing declaration data',
      inputsUsed: [
        { label: 'Vessel Identity', complete: vesselIdentityComplete },
        { label: 'Declarations', complete: declarationsComplete },
        { label: 'Applied Standards', complete: (project.appliedStandards?.length || 0) > 0 },
      ],
      canPreview: false, // DoC preview not implemented yet
      canExport: vesselIdentityComplete && declarationsComplete,
      canFile: vesselIdentityComplete && declarationsComplete,
      recommendedSection: 'conformity-assessment',
    });

    // Equipment List
    const hasEquipmentList = (project.equipmentLists?.length || 0) > 0;
    const latestEquipmentList = project.equipmentLists?.[project.equipmentLists.length - 1];

    items.push({
      id: 'equipment-list',
      type: 'DOC_EQUIPMENT_LIST',
      label: 'Equipment List',
      icon: <List className="h-5 w-5" />,
      status: hasEquipmentList ? 'ready' : 'incomplete',
      statusMessage: hasEquipmentList
        ? `${latestEquipmentList?.totalItemCount || 0} items`
        : 'Not generated',
      inputsUsed: [
        { label: 'Configuration', complete: project.configuration.items.length > 0 },
      ],
      canPreview: hasEquipmentList,
      canExport: hasEquipmentList,
      canFile: hasEquipmentList,
      recommendedSection: 'materials',
    });

    return items;
  }, [project, hasModularBlocks, currentVersion]);

  // Count ready
  const readyCount = deliverables.filter((d) => d.status === 'ready').length;
  const totalCount = deliverables.length;

  // Project type check
  const isNewBuild = project.type === 'NEW_BUILD';
  if (!isNewBuild) {
    return null;
  }

  // Handlers
  async function handleBlocksChange(nextBlocks: any) {
    if (!ownerManualTemplate || !currentVersion || !isEditable) return;
    setSaving(true);
    try {
      const updatedVersion = {
        ...currentVersion,
        ownerManualBlocks: nextBlocks,
        updatedAt: new Date().toISOString(),
      };
      const updatedTemplates = (project.documentTemplates || []).map((t) => {
        if (t.id !== ownerManualTemplate.id) return t;
        return {
          ...t,
          versions: t.versions.map((v) => (v.id === currentVersion.id ? updatedVersion : v)),
          updatedAt: new Date().toISOString(),
        };
      });
      await ProjectRepository.update(project.id, { documentTemplates: updatedTemplates });
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  function handleFileToDossier(deliverable: DeliverableStatus) {
    setSelectedDeliverable(deliverable);
    // Get visible subheadings for the recommended section
    const technicalFile = ensureTechnicalFile(project.technicalFile);
    const section = technicalFile.sections.find((s) => s.id === deliverable.recommendedSection);
    if (section) {
      const visibleSubheadings = getVisibleSubheadings(section);
      // Default to first subheading if available
      if (visibleSubheadings.length > 0) {
        setSelectedSubheadingId(visibleSubheadings[0].id);
      } else {
        setSelectedSubheadingId(null);
      }
    }
    setFileToDialogOpen(true);
  }

  async function handleConfirmFile() {
    if (!selectedDeliverable) return;

    const technicalFile = ensureTechnicalFile(project.technicalFile);
    const section = technicalFile.sections.find((s) => s.id === selectedDeliverable.recommendedSection);
    if (!section) return;

    const artifact: TechnicalFileGeneratedArtifact = {
      kind: 'generatedArtifact',
      id: generateUUID(),
      sourceType: selectedDeliverable.type as TechnicalFileGeneratedArtifact['sourceType'],
      title: selectedDeliverable.label,
      filename: `${selectedDeliverable.label.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 0,
      generatedAt: now(),
      generatedBy: 'user',
      filedAt: now(),
      filedBy: 'user',
    };

    // File to specific subheading if selected, otherwise use legacy section items
    if (selectedSubheadingId) {
      const subheading = section.subheadings.find((sh) => sh.id === selectedSubheadingId);
      if (subheading) {
        subheading.items.push(artifact);
      } else {
        // Fallback to section items if subheading not found
        section.items.push(artifact);
      }
    } else {
      section.items.push(artifact);
    }

    await ProjectRepository.update(project.id, { technicalFile, updatedAt: now() });
    setFileToDialogOpen(false);
    setSelectedDeliverable(null);
    setSelectedSubheadingId(null);
    onRefresh();
  }

  return (
    <>
      <Card data-testid="deliverables-panel">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      3. Deliverables
                      <Badge
                        className={
                          readyCount === totalCount
                            ? 'bg-green-100 text-green-700 border-0 text-xs'
                            : 'bg-amber-100 text-amber-700 border-0 text-xs'
                        }
                      >
                        {readyCount}/{totalCount} ready
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Generated compliance documents - preview, export PDF, file to dossier
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {deliverables.map((deliverable) => (
                <DeliverableCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  canEdit={canEdit && !isReadOnly}
                  onFileToDossier={() => handleFileToDossier(deliverable)}
                  onPreview={
                    deliverable.id === 'owner-manual' && deliverable.canPreview
                      ? () => setShowPreviewDialog(true)
                      : undefined
                  }
                />
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Owner's Manual Builder Dialog */}
      <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-teal-600" />
              Owner's Manual Builder
              {currentVersion?.status === 'APPROVED' && (
                <Badge variant="outline" className="ml-2 border-green-300 text-green-700">
                  <Lock className="h-3 w-3 mr-1" />
                  Approved (Read-Only)
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditable
                ? 'Select sections to include and edit content for each block.'
                : 'Viewing approved version. Create a new draft to make changes.'}
            </DialogDescription>
          </DialogHeader>

          {hasModularBlocks && currentVersion?.ownerManualBlocks && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <OwnerManualBlocksEditor
                value={currentVersion.ownerManualBlocks}
                onChange={handleBlocksChange}
                readOnly={!isEditable || !canEdit}
                projectSystems={project.systems}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Owner's Manual Preview */}
      {hasModularBlocks && currentVersion?.ownerManualBlocks && (
        <OwnerManualPreview
          blocks={currentVersion.ownerManualBlocks}
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          projectTitle={project.title}
        />
      )}

      {/* File to Dossier Confirmation */}
      <Dialog open={fileToDialogOpen} onOpenChange={setFileToDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-teal-600" />
              File to Technical Dossier
            </DialogTitle>
            <DialogDescription>
              File <strong>{selectedDeliverable?.label}</strong> to the Technical Dossier.
            </DialogDescription>
          </DialogHeader>

          {selectedDeliverable && (
            <FileToSubheadingPicker
              project={project}
              sectionId={selectedDeliverable.recommendedSection}
              selectedSubheadingId={selectedSubheadingId}
              onSubheadingChange={setSelectedSubheadingId}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmFile} className="bg-teal-600 hover:bg-teal-700">
              <FolderOpen className="h-4 w-4 mr-1" />
              File to Dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// FILE TO SUBHEADING PICKER
// ============================================

interface FileToSubheadingPickerProps {
  project: Project;
  sectionId: TechnicalFileSectionId;
  selectedSubheadingId: string | null;
  onSubheadingChange: (id: string | null) => void;
}

function FileToSubheadingPicker({
  project,
  sectionId,
  selectedSubheadingId,
  onSubheadingChange,
}: FileToSubheadingPickerProps) {
  const technicalFile = ensureTechnicalFile(project.technicalFile);
  const section = technicalFile.sections.find((s) => s.id === sectionId);
  const visibleSubheadings = section ? getVisibleSubheadings(section) : [];

  return (
    <div className="py-4 space-y-4">
      <div className="p-3 bg-slate-50 rounded-lg space-y-3">
        <div>
          <Label className="text-sm text-slate-600">Section:</Label>
          <div className="flex items-center gap-2 mt-1">
            <FolderOpen className="h-4 w-4 text-teal-600" />
            <span className="font-medium text-slate-900">
              {TECHNICAL_FILE_SECTION_TITLES[sectionId]}
            </span>
          </div>
        </div>

        {visibleSubheadings.length > 0 && (
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">File under subheading:</Label>
            <Select
              value={selectedSubheadingId || ''}
              onValueChange={(value) => onSubheadingChange(value || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a subheading..." />
              </SelectTrigger>
              <SelectContent>
                {visibleSubheadings.map((subheading) => (
                  <SelectItem key={subheading.id} value={subheading.id}>
                    {subheading.title}
                    {subheading.items.length > 0 && (
                      <span className="text-xs text-slate-400 ml-2">
                        ({subheading.items.length} files)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1.5">
              Only non-archived subheadings are shown.
            </p>
          </div>
        )}

        {visibleSubheadings.length === 0 && (
          <p className="text-sm text-amber-600">
            No subheadings available. The file will be added to the section root.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// DELIVERABLE CARD
// ============================================

interface DeliverableCardProps {
  deliverable: DeliverableStatus;
  canEdit: boolean;
  onFileToDossier: () => void;
  onPreview?: () => void;
}

function DeliverableCard({ deliverable, canEdit, onFileToDossier, onPreview }: DeliverableCardProps) {
  const isReady = deliverable.status === 'ready';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isReady ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={isReady ? 'text-green-600' : 'text-slate-400'}>{deliverable.icon}</div>
          <div>
            <h4 className="font-medium text-slate-900">{deliverable.label}</h4>
            <p className="text-xs text-slate-500">{deliverable.statusMessage}</p>
          </div>
        </div>
        <Badge
          className={
            isReady ? 'bg-green-100 text-green-700 border-0' : 'bg-slate-100 text-slate-600 border-0'
          }
        >
          {isReady ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 mr-1" />
              Incomplete
            </>
          )}
        </Badge>
      </div>

      {/* Inputs Used */}
      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-1.5">Inputs:</p>
        <div className="flex flex-wrap gap-1.5">
          {deliverable.inputsUsed.map((input) => (
            <Badge
              key={input.label}
              variant="outline"
              className={`text-xs ${
                input.complete
                  ? 'border-green-300 text-green-700 bg-green-50'
                  : 'border-amber-300 text-amber-700 bg-amber-50'
              }`}
            >
              {input.complete ? (
                <Check className="h-2.5 w-2.5 mr-1" />
              ) : (
                <XCircle className="h-2.5 w-2.5 mr-1" />
              )}
              {input.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        {deliverable.onOpenBuilder && canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={deliverable.onOpenBuilder}
          >
            <Edit className="h-3.5 w-3.5" />
            Open Builder
          </Button>
        )}
        {onPreview && (
          <Button variant="outline" size="sm" className="gap-1" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        )}
        {deliverable.canExport && (
          <Button variant="outline" size="sm" className="gap-1">
            <Printer className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        )}
        {deliverable.canFile && canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-teal-300 text-teal-700 hover:bg-teal-50"
            onClick={onFileToDossier}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            File to Dossier
          </Button>
        )}
      </div>
    </div>
  );
}
