/**
 * Compliance Scope Panel - v4
 * Consolidated panel for all compliance inputs:
 * - Vessel Identity
 * - Declarations
 * - Applied Standards
 * - Vessel Systems
 * - Technical References
 *
 * Each section shows a summary with an "Edit" action that opens
 * an inline editor or dialog. These are NOT separate top-level sections anymore.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Anchor,
  AlertCircle,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Ship,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  Project,
  VesselIdentity,
  ComplianceDeclarations,
  AppliedStandard,
  TechnicalReference,
} from '@/domain/models';
import { generateUUID, now, STANDARD_TAGS, STANDARD_TAG_LABELS } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { ProjectService, BoatModelService } from '@/domain/services';
import { SettingsService, type CompanyInfo } from '@/domain/services/SettingsService';
import type { BoatModel } from '@/domain/services/BoatModelService';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Switch } from '@/components/ui/switch';

// Import VesselSystemsSection content (we'll embed parts of it)
import { SYSTEM_KEYS } from '@/domain/models/document-template';

// ============================================
// TYPES
// ============================================

interface ComplianceScopePanelProps {
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
  return { complete: projectOwnedFields.filter((f) => f !== undefined && f !== '').length, total: 4 };
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
  return { complete: fields.filter((f) => f !== undefined && f !== '').length, total: 5 };
}

function formatSystemKey(key: string): string {
  return key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ComplianceScopePanel({ project, onRefresh }: ComplianceScopePanelProps) {
  const { can } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showVesselDialog, setShowVesselDialog] = useState(false);
  const [showDeclarationsDialog, setShowDeclarationsDialog] = useState(false);
  const [showStandardsDialog, setShowStandardsDialog] = useState(false);
  const [showSystemsDialog, setShowSystemsDialog] = useState(false);
  const [showRefsDialog, setShowRefsDialog] = useState(false);

  const canEdit = can('compliance:update');
  const isReadOnly = project.status === 'CLOSED';

  // Stats
  const vesselStats = getVesselIdentityCompleteness(project.vesselIdentity);
  const declarationsStats = getDeclarationsCompleteness(project.declarations);
  const standardsCount = project.appliedStandards?.length || 0;
  const harmonisedCount = project.appliedStandards?.filter((s) => s.isHarmonised).length || 0;
  const systemsCount = project.systems?.length || 0;
  const refsCount = project.technicalReferences?.length || 0;

  // Project type check
  const isNewBuild = project.type === 'NEW_BUILD';
  const hasAnyInputs =
    project.vesselIdentity ||
    project.declarations ||
    standardsCount > 0 ||
    systemsCount > 0 ||
    refsCount > 0;

  if (!isNewBuild && !hasAnyInputs) {
    return null;
  }

  // Overall scope completeness
  const scopeComplete = vesselStats.complete >= 4 && declarationsStats.complete >= 3 && standardsCount > 0;

  return (
    <Card data-testid="compliance-scope-panel">
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
                    <ClipboardList className="h-5 w-5 text-teal-600" />
                    1. Compliance Scope
                    <Badge
                      className={
                        scopeComplete
                          ? 'bg-green-100 text-green-700 border-0 text-xs'
                          : 'bg-amber-100 text-amber-700 border-0 text-xs'
                      }
                    >
                      {scopeComplete ? 'Defined' : 'Incomplete'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    What applies to this vessel - identity, declarations, standards, systems
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Prefill hint if applicable */}
            {project.vesselIdentity?.prefillSource && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pre-filled from model template. Review and customize as needed.</span>
              </div>
            )}

            {/* Vessel Identity Row */}
            <ScopeRow
              icon={<Ship className="h-4 w-4" />}
              title="Vessel Identity"
              status={`${vesselStats.complete}/${vesselStats.total} fields`}
              isComplete={vesselStats.complete >= 4}
              summary={
                project.vesselIdentity?.modelName
                  ? `${project.vesselIdentity.modelName}${project.vesselIdentity.win ? ` • ${project.vesselIdentity.win}` : ''}`
                  : 'Not defined'
              }
              canEdit={canEdit && !isReadOnly}
              onEdit={() => setShowVesselDialog(true)}
            />

            {/* Declarations Row */}
            <ScopeRow
              icon={<FileText className="h-4 w-4" />}
              title="Declarations (DoC)"
              status={`${declarationsStats.complete}/${declarationsStats.total} fields`}
              isComplete={declarationsStats.complete >= 3}
              summary={
                project.declarations?.docReferenceNumber
                  ? `${project.declarations.docReferenceNumber}${project.declarations.conformityModule ? ` • Module ${project.declarations.conformityModule}` : ''}`
                  : 'Not defined'
              }
              canEdit={canEdit && !isReadOnly}
              onEdit={() => setShowDeclarationsDialog(true)}
            />

            {/* Applied Standards Row */}
            <ScopeRow
              icon={<BookOpen className="h-4 w-4" />}
              title="Applied Standards"
              status={`${standardsCount} standard${standardsCount !== 1 ? 's' : ''}`}
              isComplete={standardsCount > 0}
              summary={
                standardsCount > 0
                  ? `${harmonisedCount} harmonised${standardsCount > harmonisedCount ? `, ${standardsCount - harmonisedCount} other` : ''}`
                  : 'None applied'
              }
              canEdit={canEdit && !isReadOnly}
              onEdit={() => setShowStandardsDialog(true)}
              badge={standardsCount > 0 ? `${standardsCount}` : undefined}
            />

            {/* Vessel Systems Row */}
            <ScopeRow
              icon={<Settings2 className="h-4 w-4" />}
              title="Vessel Systems"
              status={`${systemsCount} system${systemsCount !== 1 ? 's' : ''}`}
              isComplete={systemsCount > 0}
              summary={
                systemsCount > 0
                  ? project.systems?.slice(0, 3).map(formatSystemKey).join(', ') + (systemsCount > 3 ? '...' : '')
                  : 'None configured'
              }
              canEdit={canEdit && !isReadOnly}
              onEdit={() => setShowSystemsDialog(true)}
              badge={systemsCount > 0 ? `${systemsCount}` : undefined}
            />

            {/* Technical References Row */}
            <ScopeRow
              icon={<Layers className="h-4 w-4" />}
              title="Technical References"
              status={`${refsCount} reference${refsCount !== 1 ? 's' : ''}`}
              isComplete={refsCount > 0}
              summary={refsCount > 0 ? `${refsCount} drawings/documents indexed` : 'None indexed'}
              canEdit={canEdit && !isReadOnly}
              onEdit={() => setShowRefsDialog(true)}
              badge={refsCount > 0 ? `${refsCount}` : undefined}
            />

            {/* Info Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600">
                  Compliance scope data feeds generated documents (Owner's Manual, Declaration of Conformity, etc.).
                  Edit here to update all dependent outputs.
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Dialogs */}
      <VesselIdentityDialog
        open={showVesselDialog}
        onOpenChange={setShowVesselDialog}
        project={project}
        onRefresh={onRefresh}
      />
      <DeclarationsDialog
        open={showDeclarationsDialog}
        onOpenChange={setShowDeclarationsDialog}
        project={project}
        onRefresh={onRefresh}
      />
      <StandardsDialog
        open={showStandardsDialog}
        onOpenChange={setShowStandardsDialog}
        project={project}
        onRefresh={onRefresh}
      />
      <SystemsDialog
        open={showSystemsDialog}
        onOpenChange={setShowSystemsDialog}
        project={project}
        onRefresh={onRefresh}
      />
      <TechnicalRefsDialog
        open={showRefsDialog}
        onOpenChange={setShowRefsDialog}
        project={project}
        onRefresh={onRefresh}
      />
    </Card>
  );
}

// ============================================
// SCOPE ROW (reusable)
// ============================================

interface ScopeRowProps {
  icon: React.ReactNode;
  title: string;
  status: string;
  isComplete: boolean;
  summary: string;
  canEdit: boolean;
  onEdit: () => void;
  badge?: string;
}

function ScopeRow({ icon, title, status, isComplete, summary, canEdit, onEdit, badge }: ScopeRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={isComplete ? 'text-teal-600' : 'text-slate-400'}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 text-sm">{title}</span>
            {badge && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                isComplete ? 'border-green-300 text-green-700' : 'border-amber-300 text-amber-700'
              }`}
            >
              {status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{summary}</p>
        </div>
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit} className="ml-2">
          <Edit className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ============================================
// VESSEL IDENTITY DIALOG
// ============================================

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onRefresh: () => void;
}

function VesselIdentityDialog({ open, onOpenChange, project, onRefresh }: DialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<VesselIdentity>(
    project.vesselIdentity || { modelName: project.title, win: project.win }
  );
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Check if project has a boat model selected
  const hasBoatModel = !!project.configuration.boatModelVersionId;
  const hasExistingInit = !!project.vesselIdentity?.initFromModel;

  // Load boat model and company info when dialog opens
  useEffect(() => {
    if (open) {
      if (project.configuration.boatModelVersionId) {
        BoatModelService.getById(project.configuration.boatModelVersionId).then(setBoatModel);
      }
      SettingsService.getCompanyInfo().then(setCompanyInfo);
    }
  }, [open, project.configuration.boatModelVersionId]);

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

  // Handle initialize from boat model
  async function handleInitFromModel() {
    if (!user) return;

    setInitializing(true);
    try {
      const result = await ProjectService.initializeVesselIdentityFromBoatModel(
        project.id,
        { userId: user.id, userName: user.name }
      );
      if (result.ok) {
        onRefresh();
        onOpenChange(false);
      } else {
        console.error('Failed to initialize vessel identity:', result.error);
        alert(`Failed to initialize: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to initialize vessel identity:', error);
    } finally {
      setInitializing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // GOVERNANCE (Patch 5): Only save project-owned fields to vesselIdentity.
      // Model facts (LOA, Beam, Draft, etc.) are owned by BoatModel - NOT stored here.
      // Builder identity (name, address) is owned by Settings - NOT stored here.
      const projectOwnedFields: VesselIdentity = {
        vesselName: form.vesselName,
        modelName: form.modelName,
        win: form.win,
        yearOfConstruction: form.yearOfConstruction,
        intendedUse: form.intendedUse,
        specialConditions: form.specialConditions,
        initFromModel: form.initFromModel,
        // Deprecated fields are NOT saved - they remain in storage but are ignored.
      };
      await ProjectRepository.update(project.id, {
        vesselIdentity: projectOwnedFields,
        updatedAt: now(),
      });
      onRefresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save vessel identity:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-teal-600" />
            Vessel Identity & Description
          </DialogTitle>
          <DialogDescription>
            Core identification data for CE compliance documentation.
          </DialogDescription>
        </DialogHeader>

        {/* Initialize from Boat Model button */}
        {hasBoatModel && (
          <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-teal-600" />
              <div>
                <p className="text-sm font-medium text-teal-900">
                  {hasExistingInit ? 'Re-initialize from Boat Model' : 'Initialize from Boat Model'}
                </p>
                <p className="text-xs text-teal-700">
                  {boatModel ? `Copy specs from ${boatModel.name}` : 'Copy vessel specs from the selected boat model'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleInitFromModel}
              disabled={initializing}
              className="text-teal-700 border-teal-300 hover:bg-teal-100"
            >
              {initializing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : hasExistingInit ? (
                <RefreshCw className="h-4 w-4 mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              {hasExistingInit ? 'Re-initialize' : 'Initialize'}
            </Button>
          </div>
        )}

        {/* Show initialization metadata if exists */}
        {project.vesselIdentity?.initFromModel && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span>
              Initialized from <strong className="text-slate-700">{project.vesselIdentity.initFromModel.boatModelName}</strong>
              {' '}on {new Date(project.vesselIdentity.initFromModel.initializedAt).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="space-y-4 py-4">
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
              <Label>WIN</Label>
              <Input
                value={form.win || ''}
                onChange={(e) => setForm({ ...form, win: e.target.value })}
                placeholder="e.g., NL-ABC12345D123"
              />
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
                <Button type="button" variant="outline" size="sm" className="gap-1 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  Edit in Settings
                </Button>
              </Link>
            </div>

            {companyInfo ? (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Builder Name</p>
                  <p className="text-sm font-medium text-slate-900">
                    {companyInfo.legalName || companyInfo.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Builder Address</p>
                  <p className="text-sm font-medium text-slate-900">
                    {companyInfo.street ? `${companyInfo.street}, ${companyInfo.postalCode} ${companyInfo.city}` : '—'}
                  </p>
                </div>
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

          {/* Model Facts - READ-ONLY from Boat Model */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-teal-600" />
                <Label className="text-sm font-medium text-slate-700">Model Specifications</Label>
                <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">From Boat Model</span>
              </div>
            </div>

            {hasBoatModel ? (
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">LOA</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveLoaMeters() ? `${resolveLoaMeters()}m` : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Beam</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveBeamMeters() ? `${resolveBeamMeters()}m` : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Draft</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveDraftMeters() ? `${resolveDraftMeters()}m` : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Displacement</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveDisplacementKg() ? `${resolveDisplacementKg()} kg` : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Max Load</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveMaxLoadKg() ? `${resolveMaxLoadKg()} kg` : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Max Persons</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveMaxPersons() ?? '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Design Category</p>
                  <p className="text-sm font-medium text-slate-900">
                    {resolveDesignCategory() ?? '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-700 font-medium">No Boat Model selected</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Select a Boat Model in Configuration to display model specifications.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-2">
              Model specifications are managed in Boat Model → Technical Specifications.
            </p>
          </div>

          {/* Project-specific fields - EDITABLE */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Ship className="h-4 w-4 text-slate-500" />
              <Label className="text-sm font-medium text-slate-700">Project-Specific Fields</Label>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Editable</span>
            </div>

            <div className="space-y-2">
              <Label>Year Built</Label>
              <Input
                value={form.yearOfConstruction || ''}
                onChange={(e) => setForm({ ...form, yearOfConstruction: e.target.value })}
                placeholder="e.g., 2025"
                maxLength={4}
              />
            </div>
          </div>

          {/* Intended Use and Special Conditions - Project-specific, editable */}
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
  );
}

// ============================================
// DECLARATIONS DIALOG
// ============================================

function DeclarationsDialog({ open, onOpenChange, project, onRefresh }: DialogProps) {
  const [form, setForm] = useState<ComplianceDeclarations>(project.declarations || {});
  const [saving, setSaving] = useState(false);
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);

  // Override toggle: determines if project-specific RCD module / notified body values are active
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

  // Model defaults for RCD Module and Notified Body
  const modelRcdModule = boatModel?.specifications?.compliance?.rcdModuleApplied;
  const modelNotifiedBody = boatModel?.specifications?.compliance?.notifiedBodyNumber;

  // Effective values (used for display and documents)
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
        notifiedBodyName: useProjectOverride && form.notifiedBodyNumber ? form.notifiedBodyName : undefined,
      };

      await ProjectRepository.update(project.id, {
        declarations: declarationsToSave,
        updatedAt: now(),
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
          {/* Standard DoC fields */}
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

            {/* Model defaults display */}
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
                  <Label htmlFor="override-toggle-scope" className="text-sm font-medium cursor-pointer">
                    Use project override (PCA / refit)
                  </Label>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Enable to set project-specific values instead of model defaults
                </p>
              </div>
              <Switch
                id="override-toggle-scope"
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
                    <strong>Project override active.</strong> Use only for PCA or refit cases.
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
              <Checkbox
                checked={form.postConstructionAssessment || false}
                onCheckedChange={(checked) => setForm({ ...form, postConstructionAssessment: checked === true })}
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

// ============================================
// STANDARDS DIALOG (Inline CRUD)
// ============================================

function StandardsDialog({ open, onOpenChange, project, onRefresh }: DialogProps) {
  const standards = project.appliedStandards || [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function handleAdd(data: Partial<AppliedStandard>) {
    const updated = [
      ...standards,
      { id: generateUUID(), code: data.code || '', ...data },
    ];
    await ProjectRepository.update(project.id, { appliedStandards: updated, updatedAt: now() });
    onRefresh();
    setShowAddForm(false);
  }

  async function handleUpdate(id: string, data: Partial<AppliedStandard>) {
    const updated = standards.map((s) => (s.id === id ? { ...s, ...data } : s));
    await ProjectRepository.update(project.id, { appliedStandards: updated, updatedAt: now() });
    onRefresh();
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const updated = standards.filter((s) => s.id !== id);
    await ProjectRepository.update(project.id, { appliedStandards: updated, updatedAt: now() });
    onRefresh();
    setDeleteTarget(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Applied Standards
          </DialogTitle>
          <DialogDescription>
            Harmonised standards and technical specifications for CE compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {standards.length === 0 && !showAddForm ? (
            <div className="text-center py-8 text-slate-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No standards applied yet.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-20 text-center">Harmonised</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standards.map((std) => (
                    <TableRow key={std.id}>
                      <TableCell className="font-mono text-sm">{std.code}</TableCell>
                      <TableCell className="text-sm">{std.title || '—'}</TableCell>
                      <TableCell className="text-center">
                        {std.isHarmonised ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(std.id)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => setDeleteTarget(std.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <StandardForm
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Edit Form */}
          {editingId && (
            <StandardForm
              initial={standards.find((s) => s.id === editingId)}
              onSave={(data) => handleUpdate(editingId, data)}
              onCancel={() => setEditingId(null)}
            />
          )}

          {!showAddForm && !editingId && (
            <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add Standard
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Standard</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this standard?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function StandardForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: AppliedStandard;
  onSave: (data: Partial<AppliedStandard>) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initial?.code || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [year, setYear] = useState(initial?.year || '');
  const [isHarmonised, setIsHarmonised] = useState(initial?.isHarmonised || false);
  const [scopeNote, setScopeNote] = useState(initial?.scopeNote || '');

  return (
    <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Input placeholder="Code (e.g., EN ISO 12217-1)" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} maxLength={4} />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isHarmonised} onCheckedChange={(c) => setIsHarmonised(c === true)} />
          Harmonised
        </label>
      </div>
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Scope note (optional)" value={scopeNote} onChange={(e) => setScopeNote(e.target.value)} rows={2} />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave({ code, title, year, isHarmonised, scopeNote })} disabled={!code.trim()}>
          <Check className="h-3.5 w-3.5 mr-1" />
          {initial ? 'Update' : 'Add'}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// SYSTEMS DIALOG (Simplified)
// ============================================

const SYSTEM_CATEGORIES = [
  { title: 'Propulsion', keys: ['electric_propulsion', 'diesel_propulsion', 'outboard_propulsion', 'inboard_propulsion'] },
  { title: 'Fuel', keys: ['fuel_system'] },
  { title: 'Electrical', keys: ['shore_power', 'solar_power', 'generator'] },
  { title: 'Steering', keys: ['hydraulic_steering', 'cable_steering', 'autopilot'] },
  { title: 'Safety', keys: ['bilge_pump', 'fire_extinguishers', 'navigation_lights'] },
  { title: 'Climate', keys: ['heating', 'air_conditioning'] },
  { title: 'Water', keys: ['fresh_water', 'hot_water', 'waste_water', 'holding_tank'] },
  { title: 'Deck', keys: ['anchor_windlass', 'bow_thruster', 'stern_thruster', 'swimming_platform'] },
];

function SystemsDialog({ open, onOpenChange, project, onRefresh }: DialogProps) {
  const [systems, setSystems] = useState<string[]>(project.systems || []);
  const [saving, setSaving] = useState(false);

  function toggleSystem(key: string) {
    setSystems((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await ProjectRepository.update(project.id, { systems, updatedAt: now() });
      onRefresh();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-teal-600" />
            Vessel Systems
          </DialogTitle>
          <DialogDescription>
            Select installed systems to auto-include relevant Owner's Manual sections.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 grid grid-cols-2 gap-4">
          {SYSTEM_CATEGORIES.map((cat) => (
            <div key={cat.title} className="space-y-2">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{cat.title}</h4>
              <div className="space-y-1">
                {cat.keys.map((key) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm ${
                      systems.includes(key) ? 'bg-teal-50 border border-teal-200' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Checkbox checked={systems.includes(key)} onCheckedChange={() => toggleSystem(key)} />
                    {formatSystemKey(key)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Check className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// TECHNICAL REFS DIALOG (Placeholder)
// ============================================

function TechnicalRefsDialog({ open, onOpenChange, project, onRefresh }: DialogProps) {
  const refs = project.technicalReferences || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-600" />
            Technical References
          </DialogTitle>
          <DialogDescription>
            Index of drawings, calculations, and technical documents.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {refs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No technical references indexed yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                This is an index only. Actual files are stored in the Technical Dossier.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {refs.map((ref) => (
                <div key={ref.id} className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                  <code className="text-xs bg-slate-200 px-2 py-1 rounded">{ref.referenceCode}</code>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{ref.title}</p>
                    <p className="text-xs text-slate-500">{ref.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
