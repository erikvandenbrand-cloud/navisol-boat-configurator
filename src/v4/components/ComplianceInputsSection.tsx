/**
 * Compliance Inputs Section - v4
 * Structured, editable compliance inputs that feed documents and the Technical Dossier.
 *
 * Inputs include:
 * - Vessel Identity & General Description
 * - Vessel Systems (existing)
 * - Applied Standards (existing)
 * - Declarations & Ratings (CE related)
 * - Technical References (index, not files)
 *
 * Rules:
 * - Inputs are editable structured data, not PDFs
 * - Inputs may link to evidence in the Technical Dossier
 * - Inputs are reusable across multiple documents
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Anchor,
  BookOpen,
  Building2,
  ClipboardList,
  Edit,
  FileText,
  Info,
  Layers,
  Plus,
  Settings2,
  Ship,
  Check,
  X,
  AlertCircle,
  Download,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type {
  Project,
  VesselIdentity,
  VesselIdentityInit,
  ComplianceDeclarations,
} from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { ProjectService } from '@/domain/services/ProjectService';
import { BoatModelService, type BoatModel } from '@/domain/services/BoatModelService';
import { SettingsService, type CompanyInfo } from '@/domain/services/SettingsService';
import { useAuth, PermissionGuard } from '@/v4/state/useAuth';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import {
  getFieldDossierEvidence,
} from '@/domain/utils/information-linking';
import { DossierSectionHint } from './SourceHint';
import { BoatModelDialog } from './BoatModelDialog';
// NOTE: AI suggestions are NOT available for vessel identity fields
// AI is restricted to text-authoring surfaces (Owner's Manual sections, compliance snippets)

// ============================================
// TYPES
// ============================================

interface ComplianceInputsSectionProps {
  project: Project;
  onRefresh: () => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Check completeness of project-owned vessel identity fields only.
 * Model facts (LOA, Beam, Draft, etc.) are owned by BoatModel - not counted here.
 * Builder identity is owned by Settings - not counted here.
 */
function getVesselIdentityCompleteness(identity?: VesselIdentity): { complete: number; total: number } {
  // Only project-owned fields count toward completeness
  if (!identity) return { complete: 0, total: 4 };

  const projectOwnedFields = [
    identity.modelName,
    identity.win,
    identity.yearOfConstruction,
    identity.intendedUse,
  ];

  const complete = projectOwnedFields.filter((f) => f !== undefined && f !== '').length;
  return { complete, total: 4 };
}

function getDeclarationsCompleteness(declarations?: ComplianceDeclarations): { complete: number; total: number } {
  if (!declarations) return { complete: 0, total: 5 };

  const fields = [
    declarations.docReferenceNumber,
    declarations.docIssueDate,
    declarations.docSignatory,
    declarations.conformityModule,
    declarations.docSignatoryRole,
  ];

  const complete = fields.filter((f) => f !== undefined && f !== '').length;
  return { complete, total: 5 };
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ComplianceInputsSection({ project, onRefresh }: ComplianceInputsSectionProps) {
  const { can } = useAuth();
  const [showVesselDialog, setShowVesselDialog] = useState(false);
  const [showDeclarationsDialog, setShowDeclarationsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('vessel');

  const canEdit = can('compliance:update');
  const isReadOnly = project.status === 'CLOSED';

  // Stats
  const vesselStats = getVesselIdentityCompleteness(project.vesselIdentity);
  const declarationsStats = getDeclarationsCompleteness(project.declarations);
  const standardsCount = project.appliedStandards?.length || 0;
  const systemsCount = project.systems?.length || 0;
  const refsCount = project.technicalReferences?.length || 0;

  // Project type check: only show for NEW_BUILD or if any inputs exist
  const isNewBuild = project.type === 'NEW_BUILD';
  const hasInputs =
    project.vesselIdentity ||
    project.declarations ||
    standardsCount > 0 ||
    systemsCount > 0 ||
    refsCount > 0;

  if (!isNewBuild && !hasInputs) {
    return null;
  }

  return (
    <TooltipProvider>
    <Card data-testid="compliance-inputs-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-teal-600" />
          Compliance Inputs
        </CardTitle>
        <CardDescription>
          Structured data that feeds compliance documents. Edit here, not in the Technical Dossier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="vessel" className="gap-1">
              <Ship className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vessel</span>
            </TabsTrigger>
            <TabsTrigger value="declarations" className="gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">DoC</span>
            </TabsTrigger>
            <TabsTrigger value="standards" className="gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Standards</span>
            </TabsTrigger>
            <TabsTrigger value="systems" className="gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Systems</span>
            </TabsTrigger>
            <TabsTrigger value="refs" className="gap-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refs</span>
            </TabsTrigger>
          </TabsList>

          {/* Vessel Identity Tab */}
          <TabsContent value="vessel">
            <VesselIdentityCard
              vesselIdentity={project.vesselIdentity}
              project={project}
              stats={vesselStats}
              canEdit={canEdit && !isReadOnly}
              onEdit={() => setShowVesselDialog(true)}
              onRefresh={onRefresh}
            />
          </TabsContent>

          {/* Declarations Tab */}
          <TabsContent value="declarations">
            <DeclarationsCard
              declarations={project.declarations}
              project={project}
              stats={declarationsStats}
              canEdit={canEdit && !isReadOnly}
              onEdit={() => setShowDeclarationsDialog(true)}
            />
          </TabsContent>

          {/* Standards Tab */}
          <TabsContent value="standards">
            <StandardsOverviewCard
              standardsCount={standardsCount}
              appliedStandards={project.appliedStandards}
            />
          </TabsContent>

          {/* Systems Tab */}
          <TabsContent value="systems">
            <SystemsOverviewCard
              systemsCount={systemsCount}
              systems={project.systems}
            />
          </TabsContent>

          {/* Technical References Tab */}
          <TabsContent value="refs">
            <TechnicalRefsCard
              refsCount={refsCount}
              technicalReferences={project.technicalReferences}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Vessel Identity Dialog */}
      <VesselIdentityDialog
        open={showVesselDialog}
        onOpenChange={setShowVesselDialog}
        project={project}
        onRefresh={onRefresh}
      />

      {/* Declarations Dialog */}
      <DeclarationsDialog
        open={showDeclarationsDialog}
        onOpenChange={setShowDeclarationsDialog}
        project={project}
        onRefresh={onRefresh}
      />
    </Card>
    </TooltipProvider>
  );
}

// ============================================
// VESSEL IDENTITY CARD
// ============================================

interface VesselIdentityCardProps {
  vesselIdentity?: VesselIdentity;
  project: Project;
  stats: { complete: number; total: number };
  canEdit: boolean;
  onEdit: () => void;
  onRefresh: () => void;
}

function VesselIdentityCard({ vesselIdentity, project, stats, canEdit, onEdit, onRefresh }: VesselIdentityCardProps) {
  const { user } = useAuth();
  const isComplete = stats.complete === stats.total;
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [showReinitConfirm, setShowReinitConfirm] = useState(false);

  // Check if project has a boat model selected
  const hasBoatModel = !!project.configuration.boatModelVersionId;
  const hasExistingInit = !!vesselIdentity?.initFromModel;

  // Load boat model and company info on mount
  useEffect(() => {
    if (project.configuration.boatModelVersionId) {
      BoatModelService.getById(project.configuration.boatModelVersionId).then(setBoatModel);
    }
    // Load company info from Settings for builder identity
    SettingsService.getCompanyInfo().then(setCompanyInfo);
  }, []);

  // Handle initialize from boat model
  async function handleInitFromModel() {
    if (!user) return;

    // If already initialized, show confirmation
    if (hasExistingInit) {
      setShowReinitConfirm(true);
      return;
    }

    await performInit();
  }

  async function performInit() {
    if (!user) return;

    setInitializing(true);
    try {
      const result = await ProjectService.initializeVesselIdentityFromBoatModel(
        project.id,
        { userId: user.id, userName: user.name }
      );
      if (result.ok) {
        onRefresh();
      } else {
        console.error('Failed to initialize vessel identity:', result.error);
      }
    } catch (error) {
      console.error('Failed to initialize vessel identity:', error);
    } finally {
      setInitializing(false);
      setShowReinitConfirm(false);
    }
  }

  // Format initialization timestamp
  function formatInitDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-slate-500" />
          <h4 className="font-medium text-slate-900">Vessel Identity & Description</h4>
          <Badge
            variant="outline"
            className={isComplete ? 'border-green-300 text-green-700' : 'border-amber-300 text-amber-700'}
          >
            {stats.complete}/{stats.total} fields
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && hasBoatModel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInitFromModel}
                  disabled={initializing}
                  className="text-teal-700 border-teal-300 hover:bg-teal-50"
                >
                  {hasExistingInit ? (
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${initializing ? 'animate-spin' : ''}`} />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  {hasExistingInit ? 'Re-initialize' : 'Init from Model'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {hasExistingInit
                    ? 'Re-copy values from Boat Model (will overwrite current values)'
                    : 'Copy vessel specifications from the selected Boat Model'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Initialization metadata hint */}
      {vesselIdentity?.initFromModel && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
          <Download className="h-3.5 w-3.5 text-teal-600" />
          <span>
            Initialized from <strong className="text-slate-700">{vesselIdentity.initFromModel.boatModelName}</strong>
            {' '}on {formatInitDate(vesselIdentity.initFromModel.initializedAt)}
          </span>
          <span className="text-slate-400">—</span>
          <span className="text-slate-400">All fields remain editable</span>
        </div>
      )}

      {!vesselIdentity ? (
        <div className="p-6 bg-slate-50 rounded-lg text-center">
          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No vessel identity data entered yet.</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {canEdit && hasBoatModel && (
              <Button
                variant="default"
                size="sm"
                onClick={handleInitFromModel}
                disabled={initializing}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Initialize from Boat Model
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Enter Manually
              </Button>
            )}
          </div>
          {!hasBoatModel && canEdit && (
            <p className="text-xs text-slate-400 mt-2">
              Select a Boat Model in Configuration to enable auto-initialization.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Project-specific fields */}
          <VesselField
            label="Model Name"
            value={vesselIdentity.modelName || project.title}
            fieldName="modelName"
            initFromModel={vesselIdentity.initFromModel}
            boatModelValue={boatModel?.name}
          />
          <VesselField
            label="WIN"
            value={vesselIdentity.win || project.win}
            fieldName="win"
            initFromModel={vesselIdentity.initFromModel}
            isProjectSpecific
          />
          <VesselField
            label="Builder"
            value={companyInfo?.legalName || companyInfo?.name}
            fieldName="builderName"
            isSettingsFact
          />
          <VesselField
            label="Year"
            value={vesselIdentity.yearOfConstruction}
            fieldName="yearOfConstruction"
            initFromModel={vesselIdentity.initFromModel}
            isProjectSpecific
          />

          {/* Model facts - read-only from Boat Model specifications (canonical source, PATCH 6) */}
          <VesselField
            label="LOA"
            value={boatModel?.specifications?.dimensions?.lengthOverallM ? `${boatModel.specifications.dimensions.lengthOverallM}m` : undefined}
            fieldName="loaMeters"
            isModelFact
            hasBoatModel={!!boatModel}
          />
          <VesselField
            label="Beam"
            value={boatModel?.specifications?.dimensions?.beamOverallM ? `${boatModel.specifications.dimensions.beamOverallM}m` : undefined}
            fieldName="beamMeters"
            isModelFact
            hasBoatModel={!!boatModel}
          />
          <VesselField
            label="Draft"
            value={boatModel?.specifications?.dimensions?.draftM ? `${boatModel.specifications.dimensions.draftM}m` : undefined}
            fieldName="draftMeters"
            isModelFact
            hasBoatModel={!!boatModel}
          />
          <VesselField
            label="Max Persons"
            value={boatModel?.specifications?.compliance?.maxPersons?.toString()}
            fieldName="maxPersons"
            isModelFact
            hasBoatModel={!!boatModel}
          />
          <VesselField
            label="Design Category"
            value={boatModel?.specifications?.compliance?.designCategory}
            fieldName="designCategory"
            isModelFact
            hasBoatModel={!!boatModel}
          />
          <VesselField
            label="Displacement"
            value={boatModel?.specifications?.weightCapacity?.displacementLightKg ? `${boatModel.specifications.weightCapacity.displacementLightKg} kg` : undefined}
            fieldName="displacementKg"
            isModelFact
            hasBoatModel={!!boatModel}
          />
          <VesselField
            label="Max Load"
            value={boatModel?.specifications?.weightCapacity?.maxLoadKg ? `${boatModel.specifications.weightCapacity.maxLoadKg} kg` : undefined}
            fieldName="maxLoadKg"
            isModelFact
            hasBoatModel={!!boatModel}
          />
          <VesselField
            label="Intended Use"
            value={vesselIdentity.intendedUse}
            fieldName="intendedUse"
            initFromModel={vesselIdentity.initFromModel}
            isProjectSpecific
          />
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            This data feeds the Declaration of Conformity, Owner's Manual, and Builder's Plate.
            Edit here to update all documents.
          </p>
        </div>
      </div>

      {/* Re-initialization confirmation dialog */}
      <AlertDialog open={showReinitConfirm} onOpenChange={setShowReinitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-initialize Vessel Identity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current vessel identity values with data from the selected Boat Model.
              Project-specific fields (WIN, Year, Intended Use) will be preserved.
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={initializing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performInit}
              disabled={initializing}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {initializing ? 'Initializing...' : 'Re-initialize'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================
// VESSEL FIELD WITH SOURCE HINT
// ============================================

interface VesselFieldProps {
  label: string;
  value?: string;
  fieldName: string;
  initFromModel?: VesselIdentityInit;
  boatModelValue?: string;
  isProjectSpecific?: boolean;
  /** For model facts (LOA, Beam, Draft, Max Persons, Design Category) - read-only from Boat Model */
  isModelFact?: boolean;
  /** Whether a Boat Model is selected */
  hasBoatModel?: boolean;
  /** For builder identity fields - read-only from Settings */
  isSettingsFact?: boolean;
}

function VesselField({
  label,
  value,
  fieldName,
  initFromModel,
  boatModelValue,
  isProjectSpecific = false,
  isModelFact = false,
  hasBoatModel = false,
  isSettingsFact = false,
}: VesselFieldProps) {
  const dossierEvidence = getFieldDossierEvidence(fieldName);

  // Determine source hint
  let sourceHint: 'model' | 'overridden' | 'project' | 'modelFact' | 'settingsFact' | null = null;

  if (isSettingsFact) {
    // Settings facts always show "From Settings" badge
    sourceHint = 'settingsFact';
  } else if (isModelFact) {
    // Model facts always show "From Boat Model" badge when a boat model is selected
    sourceHint = hasBoatModel ? 'modelFact' : null;
  } else if (initFromModel && !isProjectSpecific) {
    if (boatModelValue && value === boatModelValue) {
      sourceHint = 'model';
    } else if (boatModelValue && value !== boatModelValue) {
      sourceHint = 'overridden';
    } else if (!boatModelValue && value) {
      sourceHint = 'model'; // Assume from model if we have a value and init happened
    }
  } else if (isProjectSpecific && value) {
    sourceHint = 'project';
  }

  return (
    <div className="p-2 bg-slate-50 rounded">
      <div className="flex items-center gap-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        {sourceHint === 'settingsFact' && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">Settings</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Read-only from Settings → Company</p>
            </TooltipContent>
          </Tooltip>
        )}
        {sourceHint === 'modelFact' && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[9px] bg-teal-100 text-teal-700 px-1 rounded">Boat Model</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Read-only from Boat Model Technical Specifications</p>
            </TooltipContent>
          </Tooltip>
        )}
        {sourceHint === 'model' && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[9px] bg-teal-100 text-teal-700 px-1 rounded">Model</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Value from Boat Model</p>
            </TooltipContent>
          </Tooltip>
        )}
        {sourceHint === 'overridden' && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">Edited</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Modified from Boat Model value</p>
            </TooltipContent>
          </Tooltip>
        )}
        {sourceHint === 'project' && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded">Project</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Project-specific value</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className={`text-sm ${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
        {value || (isSettingsFact ? 'Set in Settings' : (isModelFact && !hasBoatModel ? 'Set in Boat Model' : 'Not set'))}
      </p>
      {dossierEvidence && value && (
        <DossierSectionHint
          sectionId={dossierEvidence.sectionId}
          sectionTitle={dossierEvidence.sectionTitle}
          className="mt-1"
        />
      )}
    </div>
  );
}

// ============================================
// DECLARATIONS CARD
// ============================================

interface DeclarationsCardProps {
  declarations?: ComplianceDeclarations;
  project: Project;
  stats: { complete: number; total: number };
  canEdit: boolean;
  onEdit: () => void;
}

function DeclarationsCard({ declarations, project, stats, canEdit, onEdit }: DeclarationsCardProps) {
  const isComplete = stats.complete === stats.total;
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);

  // Load boat model on mount
  useEffect(() => {
    if (project.configuration.boatModelVersionId) {
      BoatModelService.getById(project.configuration.boatModelVersionId).then(setBoatModel);
    }
  }, [project.configuration.boatModelVersionId]);

  // === CANONICAL RESOLVERS for RCD Module and Notified Body ===
  // effectiveRcdModule: project override (if set) else model default
  const modelRcdModule = boatModel?.specifications?.compliance?.rcdModuleApplied;
  const modelNotifiedBody = boatModel?.specifications?.compliance?.notifiedBodyNumber;

  // Determine if project has overrides
  const hasProjectOverride = !!(declarations?.conformityModule || declarations?.notifiedBodyNumber);
  const effectiveRcdModule = declarations?.conformityModule || modelRcdModule;
  const effectiveNotifiedBody = declarations?.notifiedBodyNumber || modelNotifiedBody;

  // Source indication
  const rcdSource: 'model' | 'override' | 'none' =
    declarations?.conformityModule ? 'override' :
    modelRcdModule ? 'model' : 'none';
  const nbSource: 'model' | 'override' | 'none' =
    declarations?.notifiedBodyNumber ? 'override' :
    modelNotifiedBody ? 'model' : 'none';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          <h4 className="font-medium text-slate-900">Declaration of Conformity Data</h4>
          <Badge
            variant="outline"
            className={isComplete ? 'border-green-300 text-green-700' : 'border-amber-300 text-amber-700'}
          >
            {stats.complete}/{stats.total} fields
          </Badge>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {!declarations ? (
        <div className="p-6 bg-slate-50 rounded-lg text-center">
          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No declaration data entered yet.</p>
          {canEdit && (
            <Button variant="link" className="mt-2" onClick={onEdit}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Declaration Data
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Standard DoC fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoField label="DoC Reference" value={declarations.docReferenceNumber} fieldName="docReferenceNumber" showDossierHint />
            <InfoField label="Issue Date" value={declarations.docIssueDate} fieldName="docIssueDate" showDossierHint />
            <InfoField label="Signatory" value={declarations.docSignatory} fieldName="docSignatory" showDossierHint />
            <InfoField label="Role" value={declarations.docSignatoryRole} />
          </div>

          {/* RCD Module & Notified Body - with source indication */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Conformity Assessment</span>
              {hasProjectOverride && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Project Override</span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-2 bg-white rounded border">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">RCD Module</p>
                  {rcdSource === 'model' && (
                    <span className="text-[9px] bg-teal-100 text-teal-700 px-1 rounded">Model</span>
                  )}
                  {rcdSource === 'override' && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">Override</span>
                  )}
                </div>
                <p className={`text-sm ${effectiveRcdModule ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                  {effectiveRcdModule || 'Not set'}
                </p>
              </div>
              <div className="p-2 bg-white rounded border">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Notified Body</p>
                  {nbSource === 'model' && (
                    <span className="text-[9px] bg-teal-100 text-teal-700 px-1 rounded">Model</span>
                  )}
                  {nbSource === 'override' && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">Override</span>
                  )}
                </div>
                <p className={`text-sm ${effectiveNotifiedBody ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                  {effectiveNotifiedBody || 'Not required'}
                </p>
              </div>
              <div className="p-2 bg-white rounded border">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">NB Name</p>
                <p className={`text-sm ${declarations.notifiedBodyName ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                  {declarations.notifiedBodyName || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* PCA indicator */}
          {declarations.postConstructionAssessment && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700 font-medium">Post-Construction Assessment (PCA)</span>
                {declarations.pcaReference && (
                  <span className="text-xs text-amber-600">Ref: {declarations.pcaReference}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            RCD Module and Notified Body default from the Boat Model.
            Project overrides are for PCA/refit cases only.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STANDARDS OVERVIEW CARD
// ============================================

interface StandardsOverviewCardProps {
  standardsCount: number;
  appliedStandards?: Project['appliedStandards'];
}

function StandardsOverviewCard({ standardsCount, appliedStandards }: StandardsOverviewCardProps) {
  const harmonisedCount = appliedStandards?.filter((s) => s.isHarmonised).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-slate-500" />
        <h4 className="font-medium text-slate-900">Applied Standards</h4>
        <Badge variant="outline">{standardsCount} total</Badge>
        {harmonisedCount > 0 && (
          <Badge className="bg-green-100 text-green-700 border-0">
            {harmonisedCount} harmonised
          </Badge>
        )}
      </div>

      {standardsCount === 0 ? (
        <div className="p-6 bg-slate-50 rounded-lg text-center">
          <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No standards applied yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Scroll down to the Applied Standards section to add standards.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {appliedStandards?.slice(0, 5).map((std) => (
            <div key={std.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
              <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">{std.code}</code>
              <span className="text-slate-600 truncate flex-1">{std.title}</span>
              {std.isHarmonised && (
                <Check className="h-3.5 w-3.5 text-green-600" />
              )}
              {std.tags && std.tags.length > 0 && (
                <div className="flex gap-1">
                  {std.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] bg-teal-100 text-teal-700 px-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {standardsCount > 5 && (
            <p className="text-xs text-slate-400 text-center">
              +{standardsCount - 5} more standards
            </p>
          )}
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Standards are a shared input. Documents reference standards by tag.
            Edit in the Applied Standards section below.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SYSTEMS OVERVIEW CARD
// ============================================

interface SystemsOverviewCardProps {
  systemsCount: number;
  systems?: string[];
}

function SystemsOverviewCard({ systemsCount, systems }: SystemsOverviewCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-slate-500" />
        <h4 className="font-medium text-slate-900">Vessel Systems</h4>
        <Badge variant="outline">{systemsCount} configured</Badge>
      </div>

      {systemsCount === 0 ? (
        <div className="p-6 bg-slate-50 rounded-lg text-center">
          <Settings2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No vessel systems configured yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Scroll down to the Vessel Systems section to add systems.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {systems?.map((system) => (
            <Badge key={system} variant="outline" className="text-sm">
              {system.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Systems drive Owner's Manual section inclusion.
            Edit in the Vessel Systems section below.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TECHNICAL REFS CARD
// ============================================

interface TechnicalRefsCardProps {
  refsCount: number;
  technicalReferences?: Project['technicalReferences'];
}

function TechnicalRefsCard({ refsCount, technicalReferences }: TechnicalRefsCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-slate-500" />
        <h4 className="font-medium text-slate-900">Technical References</h4>
        <Badge variant="outline">{refsCount} indexed</Badge>
      </div>

      {refsCount === 0 ? (
        <div className="p-6 bg-slate-50 rounded-lg text-center">
          <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No technical references indexed yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Technical references are an index of drawings and calculations.
            Actual files are stored in the Technical Dossier.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {technicalReferences?.slice(0, 5).map((ref) => (
            <div key={ref.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
              <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">{ref.referenceCode}</code>
              <span className="text-slate-600 truncate flex-1">{ref.title}</span>
              <span className="text-[10px] text-slate-400">{ref.type}</span>
            </div>
          ))}
          {refsCount > 5 && (
            <p className="text-xs text-slate-400 text-center">
              +{refsCount - 5} more references
            </p>
          )}
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            This is an index only. Actual files should be uploaded to the Technical Dossier.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// INFO FIELD HELPER
// ============================================

interface InfoFieldProps {
  label: string;
  value?: string;
  fieldName?: string;
  showDossierHint?: boolean;
}

function InfoField({ label, value, fieldName, showDossierHint = false }: InfoFieldProps) {
  const dossierEvidence = fieldName && showDossierHint ? getFieldDossierEvidence(fieldName) : null;

  return (
    <div className="p-2 bg-slate-50 rounded">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm ${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
        {value || 'Not set'}
      </p>
      {dossierEvidence && value && (
        <DossierSectionHint
          sectionId={dossierEvidence.sectionId}
          sectionTitle={dossierEvidence.sectionTitle}
          className="mt-1"
        />
      )}
    </div>
  );
}

// ============================================
// VESSEL IDENTITY DIALOG
// ============================================

interface VesselIdentityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onRefresh: () => void;
}

function VesselIdentityDialog({ open, onOpenChange, project, onRefresh }: VesselIdentityDialogProps) {
  const [form, setForm] = useState<VesselIdentity>(
    project.vesselIdentity || {
      modelName: project.title,
      win: project.win,
    }
  );
  const [saving, setSaving] = useState(false);
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [showBoatModelDialog, setShowBoatModelDialog] = useState(false);

  // Load boat model and company info when dialog opens
  useEffect(() => {
    if (open) {
      // Load company info from Settings for builder identity
      SettingsService.getCompanyInfo().then(setCompanyInfo);

      if (project.configuration.boatModelVersionId) {
        setLoadingModel(true);
        BoatModelService.getById(project.configuration.boatModelVersionId)
          .then(setBoatModel)
          .catch(() => setBoatModel(null))
          .finally(() => setLoadingModel(false));
      }
    }
  }, [open, project.configuration.boatModelVersionId]);

  // === CANONICAL RESOLVERS: Model facts from Boat Model ===
  // Canonical resolvers - from specifications only (PATCH 6 - legacy fallbacks removed)
  function resolveLoaMeters(): number | undefined {
    return boatModel?.specifications?.dimensions?.lengthOverallM;
  }

  function resolveBeamMeters(): number | undefined {
    return boatModel?.specifications?.dimensions?.beamOverallM;
  }

  function resolveDraftMeters(): number | undefined {
    return boatModel?.specifications?.dimensions?.draftM;
  }

  function resolveMaxPersons(): number | undefined {
    return boatModel?.specifications?.compliance?.maxPersons;
  }

  function resolveDesignCategory(): 'A' | 'B' | 'C' | 'D' | undefined {
    return boatModel?.specifications?.compliance?.designCategory;
  }

  function resolveDisplacementKg(): number | undefined {
    return boatModel?.specifications?.weightCapacity?.displacementLightKg;
  }

  function resolveMaxLoadKg(): number | undefined {
    return boatModel?.specifications?.weightCapacity?.maxLoadKg;
  }

  async function handleSave() {
    setSaving(true);
    try {
      // GOVERNANCE (Patch 5): Only save project-owned fields to vesselIdentity.
      // Model facts (LOA, Beam, Draft, MaxPersons, DesignCategory, Displacement, MaxLoad)
      // are owned by BoatModel - NOT stored here.
      // Builder identity (name, address) is owned by Settings - NOT stored here.
      const projectOwnedFields: VesselIdentity = {
        // Project-owned fields only
        vesselName: form.vesselName,
        modelName: form.modelName,
        win: form.win,
        yearOfConstruction: form.yearOfConstruction,
        intendedUse: form.intendedUse,
        specialConditions: form.specialConditions,
        // Preserve init metadata
        initFromModel: form.initFromModel,
        // NOTE: Deprecated fields are NOT saved. Existing values in storage
        // will remain but are ignored by UI and document generators.
      };

      await ProjectRepository.update(project.id, {
        vesselIdentity: projectOwnedFields,
        updatedAt: new Date().toISOString(),
      });
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save vessel identity:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleBoatModelUpdated() {
    // Refresh boat model after editing
    if (project.configuration.boatModelVersionId) {
      const updated = await BoatModelService.getById(project.configuration.boatModelVersionId);
      setBoatModel(updated);
    }
    setShowBoatModelDialog(false);
  }

  const hasBoatModel = !!project.configuration.boatModelVersionId;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-teal-600" />
              Vessel Identity & Description
            </DialogTitle>
            <DialogDescription>
              Core identification data for CE compliance documentation.
              Model specifications (LOA, Beam, Draft, Displacement, Max Load, Max Persons, Design Category) are read-only from the Boat Model.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project-Specific Fields - EDITABLE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vessel/Model Name</Label>
                <Input
                  value={form.modelName || ''}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                  placeholder="e.g., Ranger 42"
                />
              </div>
              <div className="space-y-2">
                <Label>WIN (Watercraft ID)</Label>
                <Input
                  value={form.win || ''}
                  onChange={(e) => setForm({ ...form, win: e.target.value })}
                  placeholder="e.g., NL-ABC12345D123"
                />
                <p className="text-[10px] text-slate-500">Project-specific identifier</p>
              </div>
            </div>

            {/* Builder Identity - READ-ONLY from Settings */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium text-slate-700">Builder Identity</Label>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">From Settings</span>
                </div>
                <Link href="/settings" passHref>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Edit in Settings
                  </Button>
                </Link>
              </div>

              {companyInfo ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                  <ReadOnlySettingsFact
                    label="Builder Name"
                    value={companyInfo.legalName || companyInfo.name}
                  />
                  <ReadOnlySettingsFact
                    label="Builder Address"
                    value={`${companyInfo.street}, ${companyInfo.postalCode} ${companyInfo.city}`}
                  />
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-700 font-medium">Company info not loaded</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Builder identity is managed in Settings → Company.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-2">
                Builder identity is managed in Settings → Company. It cannot be edited per-project.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Year Built</Label>
              <Input
                value={form.yearOfConstruction || ''}
                onChange={(e) => setForm({ ...form, yearOfConstruction: e.target.value })}
                placeholder="e.g., 2025"
                maxLength={4}
              />
              <p className="text-[10px] text-slate-500">Project-specific</p>
            </div>

            {/* Model Facts - READ-ONLY from Boat Model */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-teal-600" />
                  <Label className="text-sm font-medium text-slate-700">Model Specifications</Label>
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">From Boat Model</span>
                </div>
                {hasBoatModel && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setShowBoatModelDialog(true)}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Edit in Boat Model
                  </Button>
                )}
              </div>

              {loadingModel ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-sm text-slate-500">Loading model specifications...</p>
                </div>
              ) : !hasBoatModel ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-700 font-medium">No Boat Model selected</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Select a Boat Model in Project Configuration to display model specifications.
                        These values cannot be entered here.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
                  <ReadOnlyModelFact
                    label="LOA"
                    value={resolveLoaMeters()}
                    unit="m"
                    hint="Dimensions"
                  />
                  <ReadOnlyModelFact
                    label="Beam"
                    value={resolveBeamMeters()}
                    unit="m"
                    hint="Dimensions"
                  />
                  <ReadOnlyModelFact
                    label="Draft"
                    value={resolveDraftMeters()}
                    unit="m"
                    hint="Dimensions"
                  />
                  <ReadOnlyModelFact
                    label="Displacement"
                    value={resolveDisplacementKg()}
                    unit="kg"
                    hint="Weight/Capacity"
                  />
                  <ReadOnlyModelFact
                    label="Max Load"
                    value={resolveMaxLoadKg()}
                    unit="kg"
                    hint="Weight/Capacity"
                  />
                  <ReadOnlyModelFact
                    label="Max Persons"
                    value={resolveMaxPersons()}
                    hint="Compliance"
                  />
                  <ReadOnlyModelFact
                    label="Design Category"
                    value={resolveDesignCategory()}
                    hint="Compliance"
                  />
                </div>
              )}

              {hasBoatModel && !loadingModel && (
                <p className="text-[10px] text-slate-400 mt-2">
                  These values are managed in Boat Model → Technical Specifications.
                </p>
              )}
            </div>

            {/* GOVERNANCE: AI suggestions are NOT available for vessel identity fields.
                These are compliance-critical spec fields, not text-authoring surfaces.
                Users must enter these values manually. */}
            <div className="space-y-2">
              <Label>Intended Use</Label>
              <Textarea
                value={form.intendedUse || ''}
                onChange={(e) => setForm({ ...form, intendedUse: e.target.value })}
                placeholder="e.g., Recreational cruising, day sailing, overnight passages"
                rows={2}
              />
              <p className="text-[10px] text-slate-500">Project-specific</p>
            </div>

            <div className="space-y-2">
              <Label>Special Conditions / Limitations</Label>
              <Textarea
                value={form.specialConditions || ''}
                onChange={(e) => setForm({ ...form, specialConditions: e.target.value })}
                placeholder="e.g., Not suitable for use in wind speeds above Beaufort 6"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              <Check className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boat Model Dialog for editing at source */}
      {showBoatModelDialog && boatModel && (
        <BoatModelDialog
          open={showBoatModelDialog}
          onOpenChange={setShowBoatModelDialog}
          model={boatModel}
          mode="edit"
          onSave={async () => {}}
          onUpdate={async (id, updates) => {
            await BoatModelService.update(id, updates, { userId: 'system', userName: 'System' });
            await handleBoatModelUpdated();
          }}
        />
      )}
    </>
  );
}

// ============================================
// READ-ONLY MODEL FACT DISPLAY
// ============================================

interface ReadOnlyModelFactProps {
  label: string;
  value?: string | number;
  unit?: string;
  hint?: string;
}

function ReadOnlyModelFact({ label, value, unit, hint }: ReadOnlyModelFactProps) {
  const hasValue = value !== undefined && value !== null && value !== 0 && value !== '';

  return (
    <div className="text-center">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium ${hasValue ? 'text-slate-900' : 'text-slate-400'}`}>
        {hasValue ? (
          <>
            {value}
            {unit && <span className="text-slate-500 ml-0.5">{unit}</span>}
          </>
        ) : (
          '—'
        )}
      </p>
      {!hasValue && hint && (
        <p className="text-[9px] text-slate-400 mt-0.5">Set in {hint}</p>
      )}
    </div>
  );
}

// ============================================
// READ-ONLY SETTINGS FACT DISPLAY
// ============================================

interface ReadOnlySettingsFactProps {
  label: string;
  value?: string;
}

function ReadOnlySettingsFact({ label, value }: ReadOnlySettingsFactProps) {
  const hasValue = value !== undefined && value !== null && value !== '';

  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium ${hasValue ? 'text-slate-900' : 'text-slate-400'}`}>
        {hasValue ? value : '—'}
      </p>
      {!hasValue && (
        <p className="text-[9px] text-slate-400 mt-0.5">Set in Settings</p>
      )}
    </div>
  );
}

// ============================================
// DECLARATIONS DIALOG
// ============================================

interface DeclarationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onRefresh: () => void;
}

function DeclarationsDialog({ open, onOpenChange, project, onRefresh }: DeclarationsDialogProps) {
  const [form, setForm] = useState<ComplianceDeclarations>(project.declarations || {});
  const [saving, setSaving] = useState(false);
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);

  // Override toggle: determines if project-specific RCD module / notified body values are active
  // Default to ON if there are existing project overrides
  const [useProjectOverride, setUseProjectOverride] = useState(
    !!(project.declarations?.conformityModule || project.declarations?.notifiedBodyNumber)
  );

  // Load boat model when dialog opens
  useEffect(() => {
    if (open && project.configuration.boatModelVersionId) {
      setLoadingModel(true);
      BoatModelService.getById(project.configuration.boatModelVersionId)
        .then(setBoatModel)
        .catch(() => setBoatModel(null))
        .finally(() => setLoadingModel(false));
    }
  }, [open, project.configuration.boatModelVersionId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm(project.declarations || {});
      setUseProjectOverride(!!(project.declarations?.conformityModule || project.declarations?.notifiedBodyNumber));
    }
  }, [open, project.declarations]);

  // === Model defaults for RCD Module and Notified Body ===
  const modelRcdModule = boatModel?.specifications?.compliance?.rcdModuleApplied;
  const modelNotifiedBody = boatModel?.specifications?.compliance?.notifiedBodyNumber;

  // === Canonical resolvers (used for display and document generation) ===
  // effectiveRcdModule = project override (if set) else model default
  const effectiveRcdModule = form.conformityModule || modelRcdModule;
  const effectiveNotifiedBody = form.notifiedBodyNumber || modelNotifiedBody;

  async function handleSave() {
    setSaving(true);
    try {
      // If override is OFF, clear project-specific RCD/Notified Body values
      const declarationsToSave: ComplianceDeclarations = {
        ...form,
        conformityModule: useProjectOverride ? form.conformityModule : undefined,
        notifiedBodyNumber: useProjectOverride ? form.notifiedBodyNumber : undefined,
        // Keep notifiedBodyName only if there's a notified body number override
        notifiedBodyName: useProjectOverride && form.notifiedBodyNumber ? form.notifiedBodyName : undefined,
      };

      await ProjectRepository.update(project.id, {
        declarations: declarationsToSave,
        updatedAt: new Date().toISOString(),
      });
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save declarations:', error);
    } finally {
      setSaving(false);
    }
  }

  const hasBoatModel = !!project.configuration.boatModelVersionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Declaration of Conformity Data
          </DialogTitle>
          <DialogDescription>
            Conformity assessment data for the Declaration of Conformity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Standard DoC fields - always editable */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>DoC Reference Number</Label>
              <Input
                value={form.docReferenceNumber || ''}
                onChange={(e) => setForm({ ...form, docReferenceNumber: e.target.value })}
                placeholder="e.g., DOC-2025-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={form.docIssueDate || ''}
                onChange={(e) => setForm({ ...form, docIssueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Signatory Name</Label>
              <Input
                value={form.docSignatory || ''}
                onChange={(e) => setForm({ ...form, docSignatory: e.target.value })}
                placeholder="e.g., Jan de Vries"
              />
            </div>
            <div className="space-y-2">
              <Label>Signatory Role</Label>
              <Input
                value={form.docSignatoryRole || ''}
                onChange={(e) => setForm({ ...form, docSignatoryRole: e.target.value })}
                placeholder="e.g., Technical Director"
              />
            </div>
          </div>

          {/* RCD Module & Notified Body - Model default with optional project override */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-teal-600" />
                <Label className="text-sm font-medium text-slate-700">RCD Module & Notified Body</Label>
                {!useProjectOverride && hasBoatModel && (
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">From Boat Model</span>
                )}
                {useProjectOverride && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Project Override</span>
                )}
              </div>
            </div>

            {/* Model defaults display (read-only) */}
            {hasBoatModel && !loadingModel && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg mb-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Model Default: RCD Module</p>
                  <p className={`text-sm font-medium ${modelRcdModule ? 'text-slate-900' : 'text-slate-400'}`}>
                    {modelRcdModule || '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Model Default: Notified Body</p>
                  <p className={`text-sm font-medium ${modelNotifiedBody ? 'text-slate-900' : 'text-slate-400'}`}>
                    {modelNotifiedBody || 'Not required'}
                  </p>
                </div>
              </div>
            )}

            {!hasBoatModel && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    No Boat Model selected. RCD Module and Notified Body must be set manually.
                  </p>
                </div>
              </div>
            )}

            {/* Override toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="override-toggle" className="text-sm font-medium cursor-pointer">
                    Use project override (PCA / refit)
                  </Label>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Enable to set project-specific values instead of model defaults
                </p>
              </div>
              <Switch
                id="override-toggle"
                checked={useProjectOverride}
                onCheckedChange={setUseProjectOverride}
              />
            </div>

            {/* Warning when override is enabled */}
            {useProjectOverride && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>Project override active.</strong> These values override the Boat Model defaults.
                    Use only for Post-Construction Assessment (PCA) or refit cases.
                  </p>
                </div>
              </div>
            )}

            {/* Editable fields - only shown when override is ON */}
            {useProjectOverride && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Conformity Module</Label>
                  <Select
                    value={form.conformityModule || ''}
                    onValueChange={(v) => setForm({ ...form, conformityModule: v as ComplianceDeclarations['conformityModule'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Internal production control</SelectItem>
                      <SelectItem value="A1">A1 - With supervised testing</SelectItem>
                      <SelectItem value="B+C">B+C - EU-type + conformity</SelectItem>
                      <SelectItem value="B+D">B+D - EU-type + QA</SelectItem>
                      <SelectItem value="B+E">B+E - EU-type + product QA</SelectItem>
                      <SelectItem value="B+F">B+F - EU-type + verification</SelectItem>
                      <SelectItem value="G">G - Unit verification</SelectItem>
                      <SelectItem value="H">H - Full quality assurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notified Body Number</Label>
                  <Input
                    value={form.notifiedBodyNumber || ''}
                    onChange={(e) => setForm({ ...form, notifiedBodyNumber: e.target.value })}
                    placeholder="e.g., 0123"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notified Body Name</Label>
                  <Input
                    value={form.notifiedBodyName || ''}
                    onChange={(e) => setForm({ ...form, notifiedBodyName: e.target.value })}
                    placeholder="e.g., Bureau Veritas"
                  />
                </div>
              </div>
            )}

            {/* Effective values summary */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-700 font-medium">Effective values for documents:</p>
                  <p className="text-xs text-blue-600 mt-1">
                    RCD Module: <strong>{effectiveRcdModule || 'Not set'}</strong>
                    {' | '}
                    Notified Body: <strong>{effectiveNotifiedBody || 'None'}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PCA checkbox */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.postConstructionAssessment || false}
                onChange={(e) => setForm({ ...form, postConstructionAssessment: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Post-Construction Assessment (PCA)</span>
            </label>
            {form.postConstructionAssessment && (
              <div className="mt-2">
                <Label>PCA Reference</Label>
                <Input
                  value={form.pcaReference || ''}
                  onChange={(e) => setForm({ ...form, pcaReference: e.target.value })}
                  placeholder="e.g., PCA-2025-001"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Check className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
