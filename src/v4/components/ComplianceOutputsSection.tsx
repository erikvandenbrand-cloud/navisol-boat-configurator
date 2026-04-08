/**
 * Compliance Outputs Section - v4
 * Generated compliance documents with preview, export, and explicit filing actions.
 *
 * Outputs include:
 * - Owner's Manual (Block Builder)
 * - Declaration of Conformity
 * - Equipment List
 * - Technical Documentation / Technical File export
 *
 * Rules:
 * - Outputs are generated ONLY from structured inputs
 * - Outputs are previewable and exportable as PDF
 * - Filing to Technical Dossier is an explicit user action
 * - Each output shows which Compliance Inputs it uses
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Book,
  Check,
  CheckCircle,
  Download,
  Eye,
  FileCheck,
  FileText,
  FolderOpen,
  AlertCircle,
  List,
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
  type TechnicalFileSectionId,
  type TechnicalFileGeneratedArtifact,
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
import { openPDFWindow } from '@/domain/services/PDFService';

// ============================================
// TYPES
// ============================================

interface ComplianceOutputsSectionProps {
  project: Project;
  onRefresh: () => void;
}

interface OutputStatus {
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
  isFiledToDossier: boolean;
}

// ============================================
// HELPERS
// ============================================

function getOutputStatuses(project: Project): OutputStatus[] {
  const outputs: OutputStatus[] = [];

  // Owner's Manual
  const ownerManualTemplate = project.documentTemplates?.find((t) => t.type === 'DOC_OWNERS_MANUAL');
  const ownerManualVersion = ownerManualTemplate
    ? getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate)
    : undefined;
  const hasModularBlocks = ownerManualVersion && isModularOwnerManual(ownerManualVersion);
  const includedBlocks = hasModularBlocks
    ? (ownerManualVersion?.ownerManualBlocks?.filter((b: { included: boolean }) => b.included)?.length || 0)
    : 0;
  const hasBlockContent = hasModularBlocks
    ? ownerManualVersion?.ownerManualBlocks?.some(
        (b: { included: boolean; content?: string }) => b.included && b.content && b.content.trim().length > 0
      )
    : false;

  const vesselIdentityComplete = !!(project.vesselIdentity?.modelName && project.vesselIdentity?.win);
  const systemsConfigured = (project.systems?.length || 0) > 0;

  outputs.push({
    id: 'owner-manual',
    type: 'DOC_OWNERS_MANUAL',
    label: "Owner's Manual",
    icon: <Book className="h-5 w-5" />,
    status: hasModularBlocks && includedBlocks > 0 && hasBlockContent ? 'ready' : 'incomplete',
    statusMessage: hasModularBlocks
      ? `${includedBlocks} sections included${hasBlockContent ? ', has content' : ', needs content'}`
      : 'No block template configured',
    inputsUsed: [
      { label: 'Vessel Identity', complete: vesselIdentityComplete },
      { label: 'Vessel Systems', complete: systemsConfigured },
      { label: 'Applied Standards (owner-manual)', complete: (project.appliedStandards?.length || 0) > 0 },
    ],
    canPreview: !!(hasModularBlocks && includedBlocks > 0),
    canExport: !!(hasModularBlocks && includedBlocks > 0 && hasBlockContent),
    canFile: !!(hasModularBlocks && includedBlocks > 0 && hasBlockContent),
    recommendedSection: 'conformity-assessment',
    isFiledToDossier: false,
  });

  // Declaration of Conformity
  const docTemplate = project.documentTemplates?.find((t) => t.type === 'DOC_DOC');
  const docVersion = docTemplate
    ? getDraftVersion(docTemplate) || getApprovedVersion(docTemplate)
    : undefined;

  const declarationsComplete = !!(
    project.declarations?.docReferenceNumber &&
    project.declarations?.docSignatory &&
    project.declarations?.conformityModule
  );
  const standardsForDoc = project.appliedStandards?.filter((s) => s.tags?.includes('doc'));

  outputs.push({
    id: 'doc',
    type: 'DOC_DOC',
    label: 'Declaration of Conformity',
    icon: <FileCheck className="h-5 w-5" />,
    status: vesselIdentityComplete && declarationsComplete ? 'ready' : 'incomplete',
    statusMessage: declarationsComplete ? 'Ready to generate' : 'Missing declaration data',
    inputsUsed: [
      { label: 'Vessel Identity', complete: vesselIdentityComplete },
      { label: 'Declarations', complete: declarationsComplete },
      { label: 'Applied Standards (doc)', complete: (standardsForDoc?.length || 0) > 0 },
    ],
    canPreview: !!docVersion,
    canExport: vesselIdentityComplete && declarationsComplete,
    canFile: vesselIdentityComplete && declarationsComplete,
    recommendedSection: 'conformity-assessment',
    isFiledToDossier: false,
  });

  // Equipment List
  const hasEquipmentList = (project.equipmentLists?.length || 0) > 0;
  const latestEquipmentList = project.equipmentLists?.[project.equipmentLists.length - 1];

  outputs.push({
    id: 'equipment-list',
    type: 'DOC_EQUIPMENT_LIST',
    label: 'Equipment List',
    icon: <List className="h-5 w-5" />,
    status: hasEquipmentList ? 'ready' : 'incomplete',
    statusMessage: hasEquipmentList
      ? `${latestEquipmentList?.totalItemCount || 0} items`
      : 'No equipment list generated',
    inputsUsed: [
      { label: 'Configuration', complete: project.configuration.items.length > 0 },
    ],
    canPreview: hasEquipmentList,
    canExport: hasEquipmentList,
    canFile: hasEquipmentList,
    recommendedSection: 'materials',
    isFiledToDossier: false,
  });

  return outputs;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ComplianceOutputsSection({ project, onRefresh }: ComplianceOutputsSectionProps) {
  const { can } = useAuth();
  const [fileToDialogOpen, setFileToDialogOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<OutputStatus | null>(null);

  const canEdit = can('compliance:update');
  const isReadOnly = project.status === 'CLOSED';

  // Get output statuses
  const outputs = useMemo(() => getOutputStatuses(project), [project]);

  // Count ready outputs
  const readyCount = outputs.filter((o) => o.status === 'ready').length;
  const totalCount = outputs.length;

  // Project type check
  const isNewBuild = project.type === 'NEW_BUILD';
  if (!isNewBuild) {
    return null;
  }

  function handleFileToDossier(output: OutputStatus) {
    setSelectedOutput(output);
    setFileToDialogOpen(true);
  }

  async function handleConfirmFile() {
    if (!selectedOutput) return;

    // Get the technical file and add a generated artifact reference
    const technicalFile = ensureTechnicalFile(project.technicalFile);
    const section = technicalFile.sections.find((s) => s.id === selectedOutput.recommendedSection);

    if (!section) return;

    // Create a generated artifact entry
    const artifact: TechnicalFileGeneratedArtifact = {
      kind: 'generatedArtifact',
      id: generateUUID(),
      sourceType: selectedOutput.type as TechnicalFileGeneratedArtifact['sourceType'],
      title: selectedOutput.label,
      filename: `${selectedOutput.label.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 0, // Will be populated if we generate actual PDF
      generatedAt: now(),
      generatedBy: 'user',
      filedAt: now(),
      filedBy: 'user',
    };

    section.items.push(artifact);

    await ProjectRepository.update(project.id, {
      technicalFile,
      updatedAt: now(),
    });

    setFileToDialogOpen(false);
    setSelectedOutput(null);
    onRefresh();
  }

  return (
    <Card data-testid="compliance-outputs-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-600" />
          Compliance Outputs
        </CardTitle>
        <CardDescription>
          Generated documents from compliance inputs. Preview, export, and file to Technical Dossier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-500" />
            <span className="text-sm text-slate-600">
              <strong>{readyCount}</strong> of {totalCount} outputs ready
            </span>
          </div>
          <Badge
            className={
              readyCount === totalCount
                ? 'bg-green-100 text-green-700 border-0'
                : 'bg-amber-100 text-amber-700 border-0'
            }
          >
            {readyCount === totalCount ? 'All Ready' : 'Incomplete'}
          </Badge>
        </div>

        {/* Outputs Grid */}
        <div className="space-y-3">
          {outputs.map((output) => (
            <OutputCard
              key={output.id}
              output={output}
              canEdit={canEdit && !isReadOnly}
              onFileToDossier={() => handleFileToDossier(output)}
            />
          ))}
        </div>
      </CardContent>

      {/* File to Dossier Confirmation Dialog */}
      <Dialog open={fileToDialogOpen} onOpenChange={setFileToDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-teal-600" />
              File to Technical Dossier
            </DialogTitle>
            <DialogDescription>
              File <strong>{selectedOutput?.label}</strong> to the Technical Dossier.
            </DialogDescription>
          </DialogHeader>

          {selectedOutput && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">This will create a reference in:</p>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-teal-600" />
                  <span className="font-medium text-slate-900">
                    {TECHNICAL_FILE_SECTION_TITLES[selectedOutput.recommendedSection]}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    The generated document will be recorded as a filed artifact in the Technical Dossier.
                    This action is for audit trail purposes.
                  </p>
                </div>
              </div>
            </div>
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
    </Card>
  );
}

// ============================================
// OUTPUT CARD
// ============================================

interface OutputCardProps {
  output: OutputStatus;
  canEdit: boolean;
  onFileToDossier: () => void;
}

function OutputCard({ output, canEdit, onFileToDossier }: OutputCardProps) {
  const isReady = output.status === 'ready';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isReady ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={isReady ? 'text-green-600' : 'text-slate-400'}>{output.icon}</div>
          <div>
            <h4 className="font-medium text-slate-900">{output.label}</h4>
            <p className="text-xs text-slate-500">{output.statusMessage}</p>
          </div>
        </div>
        <Badge
          className={
            isReady
              ? 'bg-green-100 text-green-700 border-0'
              : 'bg-slate-100 text-slate-600 border-0'
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
        <p className="text-xs text-slate-500 mb-1.5">Inputs used:</p>
        <div className="flex flex-wrap gap-1.5">
          {output.inputsUsed.map((input) => (
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
        {output.canPreview && (
          <Button variant="outline" size="sm" className="gap-1">
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        )}
        {output.canExport && (
          <Button variant="outline" size="sm" className="gap-1">
            <Printer className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        )}
        {output.canFile && canEdit && (
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
        {output.isFiledToDossier && (
          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
            <Check className="h-2.5 w-2.5 mr-1" />
            Filed
          </Badge>
        )}
      </div>
    </div>
  );
}
