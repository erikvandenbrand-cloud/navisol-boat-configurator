/**
 * Compliance Tab Component - v4
 *
 * Evidence-First Architecture:
 * - Technical Dossier is the PRIMARY compliance surface (canonical evidence)
 * - Certification Packs are INTERPRETIVE VIEWS (lenses) on the same evidence
 * - No workflow implied, no completion flow, no "next steps"
 *
 * Mental Model:
 * - Evidence first, certification as interpretation
 * - All certification-to-dossier relationships derived at render time
 * - No state duplication between dossier and certification
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  Lock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type {
  Project,
  CertificationType,
} from '@/domain/models';
import {
  CERTIFICATION_LABELS,
  validateCertification,
} from '@/domain/models';
import { ComplianceService } from '@/domain/services';
import { getAuditContext } from '@/domain/auth';
import { useAuth, PermissionGuard } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

// Import the main panels
import { ComplianceScopePanel } from './ComplianceScopePanel';
import { EvidenceFirstPanel } from './EvidenceFirstPanel';
import { DeliverablesPanel } from './DeliverablesPanel';

import type { DossierDeepLinkParams } from '@/domain/utils/information-linking';

// ============================================
// TYPES
// ============================================

interface ComplianceTabProps {
  project: Project;
  onRefresh: () => void;
  dossierDeepLink?: DossierDeepLinkParams;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ComplianceTab({ project, onRefresh, dossierDeepLink }: ComplianceTabProps) {
  const { can } = useAuth();
  const [showNewCertDialog, setShowNewCertDialog] = useState(false);
  const [finalizeTarget, setFinalizeTarget] = useState<{
    certId: string;
    name: string;
    validation?: {
      hasWarnings: boolean;
      summary: string;
    };
  } | null>(null);

  const packs = project.compliancePacks || [];
  const canCreate = can('compliance:create');

  async function handleCreateCertification(type: CertificationType, name?: string) {
    const result = await ComplianceService.initializeCertification(
      project.id,
      { type, name },
      getAuditContext()
    );

    if (result.ok) {
      setShowNewCertDialog(false);
      onRefresh();
    } else {
      alert(result.error);
    }
  }

  async function handleFinalize() {
    if (!finalizeTarget) return;

    const result = await ComplianceService.finalizeCertification(
      project.id,
      finalizeTarget.certId,
      getAuditContext()
    );

    if (result?.ok) {
      setFinalizeTarget(null);
      onRefresh();
    } else if (result) {
      alert(result.error);
    }
  }

  // ============================================
  // RENDER - EVIDENCE-FIRST ARCHITECTURE
  // ============================================

  return (
    <div className="space-y-6">
      {/* ============================================
          PANEL 1: COMPLIANCE SCOPE (Inputs)
          What applies to this vessel - editable structured data
          ============================================ */}
      <ComplianceScopePanel project={project} onRefresh={onRefresh} />

      {/* ============================================
          PANEL 2: EVIDENCE (Technical Dossier)
          Primary compliance surface with certification lenses

          This is THE main view. Certification packs are shown
          as contextual overlays (badges, highlights) - not as
          a separate workflow or screen.
          ============================================ */}
      <EvidenceFirstPanel
        project={project}
        onRefresh={onRefresh}
        onCreateCertPack={canCreate ? () => setShowNewCertDialog(true) : undefined}
        onFinalizeCertPack={(packId, packName) => {
          const pack = packs.find(p => p.id === packId);
          if (!pack) return;
          const validation = validateCertification(pack);
          setFinalizeTarget({
            certId: packId,
            name: packName,
            validation: {
              hasWarnings: !validation.isValid,
              summary: validation.finalizeSummary,
            },
          });
        }}
        dossierDeepLink={dossierDeepLink}
      />

      {/* ============================================
          PANEL 3: DELIVERABLES (Outputs)
          Generated compliance documents
          ============================================ */}
      <DeliverablesPanel project={project} onRefresh={onRefresh} />

      {/* ============================================
          DIALOGS
          ============================================ */}

      {/* New Certification Dialog */}
      <NewCertificationDialog
        open={showNewCertDialog}
        onOpenChange={setShowNewCertDialog}
        existingTypes={packs.filter(p => p.status !== 'FINAL').map(p => p.type)}
        onCreate={handleCreateCertification}
      />

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
              Finalize Certification Pack
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to finalize <strong>{finalizeTarget?.name}</strong>.
                  This will lock all content and prevent further edits.
                </p>

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
                      <p className={`text-sm ${
                        finalizeTarget.validation.hasWarnings ? 'text-amber-700' : 'text-green-700'
                      }`}>
                        {finalizeTarget.validation.summary}
                      </p>
                    </div>
                  </div>
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
    </div>
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
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            New Certification Lens
          </DialogTitle>
          <DialogDescription>
            Create a certification lens to interpret your evidence through a specific compliance framework.
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-1" />
            Create Lens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
