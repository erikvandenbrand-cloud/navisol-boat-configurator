/**
 * Document Templates Section - v4
 * UI for viewing and editing project document templates (DRAFT only)
 * No preview, no PDF, no placeholder substitution - just raw content editing
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FileText,
  ChevronRight,
  ChevronDown,
  Edit,
  Lock,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type {
  Project,
  ProjectDocumentTemplate,
  ProjectDocumentTemplateVersion,
  DocumentTemplateImageSlot,
} from '@/domain/models';
import {
  CE_DOCUMENT_TEMPLATE_LABELS,
  getDraftVersion,
  getApprovedVersion,
  isTemplateVersionEditable,
  isModularOwnerManual,
} from '@/domain/models/document-template';
import { ProjectRepository } from '@/data/repositories';
import { useAuth, PermissionGuard } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import OwnerManualBlocksEditor from './OwnerManualBlocksEditor';
import OwnerManualPreview from './OwnerManualPreview';

// ============================================
// TYPES
// ============================================

interface DocumentTemplatesSectionProps {
  project: Project;
  onRefresh: () => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Extract unique {{IMAGE:key}} tokens from template content.
 * Returns array of unique keys.
 */
function extractImageKeys(content: string): string[] {
  const regex = /\{\{IMAGE:([a-zA-Z0-9_]+)\}\}/g;
  const keys = new Set<string>();
  let match: RegExpExecArray | null = null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard pattern for regex iteration
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

/**
 * Get current status of a template.
 */
function getTemplateStatus(template: ProjectDocumentTemplate): 'DRAFT' | 'APPROVED' {
  const approved = getApprovedVersion(template);
  if (approved) return 'APPROVED';
  return 'DRAFT';
}

/**
 * Get the current working version (draft if exists, otherwise approved).
 */
function getCurrentVersion(template: ProjectDocumentTemplate): ProjectDocumentTemplateVersion | undefined {
  return getDraftVersion(template) || getApprovedVersion(template);
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DocumentTemplatesSection({ project, onRefresh }: DocumentTemplatesSectionProps) {
  const { can } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showImageSlotsPanel, setShowImageSlotsPanel] = useState(false);
  const [showOwnerManualPreview, setShowOwnerManualPreview] = useState(false);

  const templates = project.documentTemplates || [];
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const currentVersion = selectedTemplate ? getCurrentVersion(selectedTemplate) : undefined;
  const isEditable = currentVersion ? isTemplateVersionEditable(currentVersion) : false;

  // Permission check
  const canEdit = can('compliance:update');

  // Project type check: only show for NEW_BUILD or if templates exist for REFIT/MAINTENANCE
  const isNewBuild = project.type === 'NEW_BUILD';
  const hasTemplates = templates.length > 0;

  // Don't show section for REFIT/MAINTENANCE without templates
  if (!isNewBuild && !hasTemplates) {
    return null;
  }

  // ============================================
  // HANDLERS
  // ============================================

  function handleOpenTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    const version = getCurrentVersion(template);
    if (version) {
      setEditedContent(version.content);
    }
    setIsEditing(false);
    setShowImageSlotsPanel(false);
  }

  function handleCloseTemplate() {
    setSelectedTemplateId(null);
    setIsEditing(false);
    setEditedContent('');
    setShowImageSlotsPanel(false);
  }

  function handleStartEditing() {
    if (!currentVersion || !isEditable) return;
    setEditedContent(currentVersion.content);
    setIsEditing(true);
  }

  function handleCancelEditing() {
    if (currentVersion) {
      setEditedContent(currentVersion.content);
    }
    setIsEditing(false);
  }

  async function handleSaveContent() {
    if (!selectedTemplate || !currentVersion || !isEditable) return;

    setSaving(true);
    try {
      // Update the version content
      const updatedVersion: ProjectDocumentTemplateVersion = {
        ...currentVersion,
        content: editedContent,
        updatedAt: new Date().toISOString(),
      };

      // Update template versions
      const updatedTemplates = templates.map((t) => {
        if (t.id !== selectedTemplate.id) return t;
        return {
          ...t,
          versions: t.versions.map((v) =>
            v.id === currentVersion.id ? updatedVersion : v
          ),
          updatedAt: new Date().toISOString(),
        };
      });

      // Save to project
      await ProjectRepository.update(project.id, {
        documentTemplates: updatedTemplates,
      });

      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to save template content:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageSlotUpdate(slotKey: string, dataUrl: string | undefined, caption?: string) {
    if (!selectedTemplate || !currentVersion || !isEditable) return;

    setSaving(true);
    try {
      // Find or create the image slot
      const updatedSlots = currentVersion.imageSlots.map((slot) => {
        if (slot.key !== slotKey) return slot;
        return {
          ...slot,
          dataUrl,
          caption,
        };
      });

      // If slot doesn't exist, add it (for {{IMAGE:key}} tokens in content)
      const existingKeys = currentVersion.imageSlots.map((s) => s.key);
      if (!existingKeys.includes(slotKey)) {
        updatedSlots.push({
          key: slotKey,
          label: slotKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          dataUrl,
        });
      }

      const updatedVersion: ProjectDocumentTemplateVersion = {
        ...currentVersion,
        imageSlots: updatedSlots,
        updatedAt: new Date().toISOString(),
      };

      const updatedTemplates = templates.map((t) => {
        if (t.id !== selectedTemplate.id) return t;
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
      console.error('Failed to update image slot:', error);
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Card className="mt-6" data-testid="document-templates-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-600" />
          Document Templates
        </CardTitle>
        <CardDescription>
          Editable templates for CE compliance documentation (Declaration of Conformity, Owner's Manual, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No document templates available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => {
              const status = getTemplateStatus(template);
              const version = getCurrentVersion(template);

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleOpenTemplate(template.id)}
                  className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left"
                  data-testid={`template-item-${template.type}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{template.name}</p>
                      {version && (
                        <p className="text-xs text-slate-500">
                          Version {version.versionNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        status === 'APPROVED'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }
                    >
                      {status === 'APPROVED' ? (
                        <Lock className="h-3 w-3 mr-1" />
                      ) : (
                        <Edit className="h-3 w-3 mr-1" />
                      )}
                      {status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Template Editor Dialog */}
        <Dialog open={!!selectedTemplateId} onOpenChange={(open) => !open && handleCloseTemplate()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                {selectedTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                {isEditable ? (
                  'Edit template content and manage image slots'
                ) : (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Lock className="h-3.5 w-3.5" />
                    This version is approved and read-only
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {currentVersion && (
              <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        currentVersion.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }
                    >
                      {currentVersion.status === 'APPROVED' ? (
                        <Lock className="h-3 w-3 mr-1" />
                      ) : (
                        <Edit className="h-3 w-3 mr-1" />
                      )}
                      {currentVersion.status}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      Version {currentVersion.versionNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Preview and Edit buttons for Owner's Manual */}
                    {selectedTemplate?.type === 'DOC_OWNERS_MANUAL' &&
                      currentVersion &&
                      isModularOwnerManual(currentVersion) && (
                        <div className="flex items-center gap-2">
                          {/* Edit Owner's Manual button - scrolls to and highlights editor */}
                          {isEditable && canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Scroll to the editor area
                                const editor = document.querySelector('[data-testid="owner-manual-blocks-editor"]');
                                if (editor) {
                                  editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }}
                              className="gap-1"
                              data-testid="edit-owner-manual-button"
                              title="Edit Owner's Manual blocks"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Owner's Manual
                            </Button>
                          )}
                          <div className="flex flex-col items-end gap-0.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowOwnerManualPreview(true)}
                              className="gap-1"
                              data-testid="owner-manual-preview-button"
                              disabled={
                                !currentVersion.ownerManualBlocks ||
                                currentVersion.ownerManualBlocks.filter((b: any) => b.included).length === 0
                              }
                              title={
                                !currentVersion.ownerManualBlocks ||
                                currentVersion.ownerManualBlocks.filter((b: any) => b.included).length === 0
                                  ? 'No sections included'
                                  : 'Open preview'
                              }
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </Button>
                            <span className="text-[10px] text-slate-500">
                              Preview reflects the current draft blocks.
                            </span>
                          </div>
                        </div>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageSlotsPanel(!showImageSlotsPanel)}
                      className="gap-1"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Image Slots
                      {showImageSlotsPanel ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                    {isEditable && canEdit && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartEditing}
                        className="gap-1"
                        data-testid="edit-template-button"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Content
                      </Button>
                    )}
                  </div>
                </div>

                {/* Image Slots Panel */}
                {showImageSlotsPanel && (
                  <ImageSlotsPanel
                    version={currentVersion}
                    content={isEditing ? editedContent : currentVersion.content}
                    isEditable={isEditable && canEdit}
                    onUpdate={handleImageSlotUpdate}
                    saving={saving}
                  />
                )}

                {/* Content Editor/Viewer */}
                <div className="flex-1 min-h-0 overflow-auto border rounded-lg bg-slate-50">
                  {/* Owner's Manual with modular blocks uses dedicated editor */}
                  {selectedTemplate?.type === 'DOC_OWNERS_MANUAL' &&
                  currentVersion &&
                  isModularOwnerManual(currentVersion) ? (
                    <OwnerManualBlocksEditor
                      value={currentVersion.ownerManualBlocks}
                      onChange={async (nextBlocks: any) => {
                        if (!isEditable) return;
                        setSaving(true);
                        try {
                          const updatedVersion = {
                            ...currentVersion,
                            ownerManualBlocks: nextBlocks,
                            updatedAt: new Date().toISOString(),
                          };
                          const updatedTemplates = templates.map((t) => {
                            if (t.id !== selectedTemplate.id) return t;
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
                      }}
                      readOnly={!isEditable || !canEdit}
                      aiAssisted={currentVersion.aiAssisted}
                      projectSystems={project.systems}
                    />
                  ) : isEditing ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full min-h-[400px] font-mono text-sm resize-none border-0 bg-transparent focus-visible:ring-0"
                      placeholder="Template content..."
                      data-testid="template-content-editor"
                    />
                  ) : (
                    <pre
                      className="p-4 text-sm whitespace-pre-wrap font-mono text-slate-700"
                      data-testid="template-content-viewer"
                    >
                      {currentVersion.content}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancelEditing} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveContent}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700"
                    data-testid="save-template-button"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={handleCloseTemplate}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Owner's Manual Preview Dialog */}
        {selectedTemplate?.type === 'DOC_OWNERS_MANUAL' &&
          currentVersion &&
          isModularOwnerManual(currentVersion) && (
            <OwnerManualPreview
              blocks={currentVersion.ownerManualBlocks || []}
              open={showOwnerManualPreview}
              onOpenChange={setShowOwnerManualPreview}
              projectTitle={project.title}
            />
          )}
      </CardContent>
    </Card>
  );
}

// ============================================
// IMAGE SLOTS PANEL
// ============================================

interface ImageSlotsPanelProps {
  version: ProjectDocumentTemplateVersion;
  content: string;
  isEditable: boolean;
  onUpdate: (slotKey: string, dataUrl: string | undefined, caption?: string) => void;
  saving: boolean;
}

function ImageSlotsPanel({ version, content, isEditable, onUpdate, saving }: ImageSlotsPanelProps) {
  // Get all image keys from content
  const contentKeys = extractImageKeys(content);

  // Merge with existing slots
  const existingSlotMap = new Map(version.imageSlots.map((s) => [s.key, s]));

  // All unique keys (from content + existing slots)
  const allKeys = Array.from(new Set([...contentKeys, ...version.imageSlots.map((s) => s.key)]));

  if (allKeys.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-slate-50">
        <p className="text-sm text-slate-500 text-center">
          No image slots found. Add <code className="bg-slate-200 px-1 rounded">{'{{IMAGE:key}}'}</code> to your content to create image slots.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white p-4 space-y-3" data-testid="image-slots-panel">
      <h4 className="text-sm font-medium text-slate-900">Image Slots</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allKeys.map((key) => {
          const slot = existingSlotMap.get(key);
          const isInContent = contentKeys.includes(key);

          return (
            <ImageSlotItem
              key={key}
              slotKey={key}
              slot={slot}
              isInContent={isInContent}
              isEditable={isEditable}
              onUpdate={onUpdate}
              saving={saving}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// IMAGE SLOT ITEM
// ============================================

interface ImageSlotItemProps {
  slotKey: string;
  slot?: DocumentTemplateImageSlot;
  isInContent: boolean;
  isEditable: boolean;
  onUpdate: (slotKey: string, dataUrl: string | undefined, caption?: string) => void;
  saving: boolean;
}

function ImageSlotItem({ slotKey, slot, isInContent, isEditable, onUpdate, saving }: ImageSlotItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captionValue, setCaptionValue] = useState(slot?.caption || '');

  const label = slot?.label || slotKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const hasImage = !!slot?.dataUrl;

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onUpdate(slotKey, dataUrl, captionValue);
      };
      reader.readAsDataURL(file);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [slotKey, captionValue, onUpdate]
  );

  const handleRemoveImage = useCallback(() => {
    onUpdate(slotKey, undefined, captionValue);
  }, [slotKey, captionValue, onUpdate]);

  const handleCaptionBlur = useCallback(() => {
    if (slot?.dataUrl && captionValue !== slot?.caption) {
      onUpdate(slotKey, slot.dataUrl, captionValue);
    }
  }, [slotKey, slot, captionValue, onUpdate]);

  return (
    <div
      className={`border rounded-lg p-3 ${
        isInContent ? 'bg-white' : 'bg-slate-50 border-dashed'
      }`}
      data-testid={`image-slot-${slotKey}`}
    >
      <div className="flex items-start gap-3">
        {/* Image Preview or Placeholder */}
        <div className="w-16 h-16 rounded border bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {hasImage ? (
            <img
              src={slot.dataUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-slate-300" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-slate-900 truncate">{label}</p>
            {!isInContent && (
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">
                Unused
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-2">
            <code className="bg-slate-100 px-1 rounded">{`{{IMAGE:${slotKey}}}`}</code>
          </p>

          {isEditable && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={saving}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="h-7 text-xs"
                data-testid={`upload-image-${slotKey}`}
              >
                <Upload className="h-3 w-3 mr-1" />
                {hasImage ? 'Replace' : 'Upload'}
              </Button>
              {hasImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={saving}
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          )}

          {hasImage && isEditable && (
            <div className="mt-2">
              <Input
                type="text"
                placeholder="Caption (optional)"
                value={captionValue}
                onChange={(e) => setCaptionValue(e.target.value)}
                onBlur={handleCaptionBlur}
                className="h-7 text-xs"
                disabled={saving}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
