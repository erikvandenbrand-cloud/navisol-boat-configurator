/**
 * Owner's Manual Section - v4
 * First-class entry point to the Owner's Manual block builder workflow.
 * Provides clear access to the modular content editor without burying it in templates.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Book,
  Edit,
  Eye,
  Lock,
  CheckSquare,
  Settings2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { Project } from '@/domain/models';
import {
  getDraftVersion,
  getApprovedVersion,
  isModularOwnerManual,
} from '@/domain/models/document-template';
import { ProjectRepository } from '@/data/repositories';
import { useAuth } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import OwnerManualBlocksEditor from './OwnerManualBlocksEditor';
import OwnerManualPreview from './OwnerManualPreview';

// ============================================
// TYPES
// ============================================

interface OwnerManualSectionProps {
  project: Project;
  onRefresh: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function OwnerManualSection({ project, onRefresh }: OwnerManualSectionProps) {
  const { can } = useAuth();
  const [showBuilder, setShowBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = can('compliance:update');

  // Find the Owner's Manual template
  const ownerManualTemplate = useMemo(() => {
    return project.documentTemplates?.find((t) => t.type === 'DOC_OWNERS_MANUAL');
  }, [project.documentTemplates]);

  // Get the current version (draft or approved)
  const currentVersion = useMemo(() => {
    if (!ownerManualTemplate) return undefined;
    return getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate);
  }, [ownerManualTemplate]);

  // Check if it's a modular owner's manual
  const hasModularBlocks = useMemo(() => {
    return currentVersion && isModularOwnerManual(currentVersion);
  }, [currentVersion]);

  // Calculate block stats
  const blockStats = useMemo(() => {
    if (!hasModularBlocks || !currentVersion?.ownerManualBlocks) {
      return { total: 0, included: 0, hasContent: false };
    }
    const blocks = currentVersion.ownerManualBlocks;
    const total = blocks.length;
    const included = blocks.filter((b: any) => b.included).length;
    const hasContent = blocks.some((b: any) => b.content && b.content.trim().length > 0);
    return { total, included, hasContent };
  }, [hasModularBlocks, currentVersion]);

  // Is editable?
  const isEditable = currentVersion?.status === 'DRAFT';

  // Project type check
  const isNewBuild = project.type === 'NEW_BUILD';
  const showSection = isNewBuild || ownerManualTemplate;

  // Don't show section for REFIT/MAINTENANCE without template
  if (!showSection) {
    return null;
  }

  // ============================================
  // HANDLERS
  // ============================================

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
          versions: t.versions.map((v) =>
            v.id === currentVersion.id ? updatedVersion : v
          ),
          updatedAt: new Date().toISOString(),
        };
      });
      await ProjectRepository.update(project.id, {
        documentTemplates: updatedTemplates,
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to save Owner\'s Manual blocks:', error);
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <Card data-testid="owner-manual-section">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-teal-600" />
              Owner's Manual (Blocks)
            </CardTitle>
            <CardDescription>
              Modular content builder for the vessel Owner's Manual
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasModularBlocks && blockStats.included > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            )}
            {hasModularBlocks && isEditable && canEdit && (
              <Button
                onClick={() => setShowBuilder(true)}
                className="gap-1 bg-teal-600 hover:bg-teal-700"
                data-testid="open-owner-manual-builder-button"
              >
                <Edit className="h-4 w-4" />
                Open Builder
              </Button>
            )}
            {hasModularBlocks && !isEditable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBuilder(true)}
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
                View Blocks
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!ownerManualTemplate ? (
            // No template yet
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <Book className="h-6 w-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-medium text-slate-900 mb-1">No Owner's Manual template</h4>
              <p className="text-sm text-slate-500 max-w-sm">
                The Owner's Manual template needs to be initialized in the Document Templates section below.
              </p>
            </div>
          ) : !hasModularBlocks ? (
            // Template exists but no modular blocks
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="text-sm font-medium text-slate-900 mb-1">Legacy template format</h4>
              <p className="text-sm text-slate-500 max-w-sm">
                This Owner's Manual uses the legacy template format. Edit it in the Document Templates section below.
              </p>
            </div>
          ) : (
            // Modular blocks available
            <div className="space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium">Blocks</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">
                    {blockStats.included}
                    <span className="text-sm font-normal text-slate-500"> / {blockStats.total}</span>
                  </p>
                  <p className="text-xs text-slate-500">sections included</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Settings2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Status</span>
                  </div>
                  <Badge
                    className={
                      currentVersion?.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700 border-0'
                        : 'bg-amber-100 text-amber-700 border-0'
                    }
                  >
                    {currentVersion?.status === 'APPROVED' ? (
                      <Lock className="h-3 w-3 mr-1" />
                    ) : (
                      <Edit className="h-3 w-3 mr-1" />
                    )}
                    {currentVersion?.status || 'DRAFT'}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1">
                    Version {currentVersion?.versionNumber || 1}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-xs font-medium">Content</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {blockStats.hasContent ? (
                      <span className="text-green-600">Has content</span>
                    ) : (
                      <span className="text-amber-600">Needs content</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">in included blocks</p>
                </div>

                {/* GOVERNANCE: No AI-assisted indicator - AI suggestions don't create persistent metadata */}
              </div>

              {/* Quick Actions */}
              {isEditable && canEdit && (
                <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-teal-800">Ready to edit</p>
                    <p className="text-xs text-teal-600">
                      Select which sections to include and add content for each block.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowBuilder(true)}
                    className="gap-1 bg-teal-600 hover:bg-teal-700"
                  >
                    <Edit className="h-4 w-4" />
                    Open Builder
                  </Button>
                </div>
              )}

              {/* Vessel Systems Hint */}
              {(project.systems?.length || 0) > 0 && (
                <div className="flex items-start gap-2 text-xs text-slate-500">
                  <Settings2 className="h-3.5 w-3.5 mt-0.5" />
                  <span>
                    {project.systems?.length} vessel system(s) configured - matching blocks will be highlighted in the builder.
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Owner's Manual Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
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
                ? 'Select sections to include and edit content for each block. Changes are saved automatically.'
                : 'Viewing approved version. Create a new draft to make changes.'}
            </DialogDescription>
          </DialogHeader>

          {hasModularBlocks && currentVersion?.ownerManualBlocks && (
            <div
              className="flex-1 min-h-0 overflow-hidden"
              data-testid="owner-manual-blocks-editor"
            >
              <OwnerManualBlocksEditor
                value={currentVersion.ownerManualBlocks}
                onChange={handleBlocksChange}
                readOnly={!isEditable || !canEdit}
                projectSystems={project.systems}
                project={project}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Owner's Manual Preview */}
      {hasModularBlocks && currentVersion?.ownerManualBlocks && (
        <OwnerManualPreview
          blocks={currentVersion.ownerManualBlocks}
          open={showPreview}
          onOpenChange={setShowPreview}
          projectTitle={project.title}
        />
      )}
    </>
  );
}
