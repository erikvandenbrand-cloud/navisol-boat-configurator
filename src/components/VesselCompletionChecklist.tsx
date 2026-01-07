'use client';

import { useState, useMemo, useRef } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, Ship, UserCheck,
  ChevronDown, ChevronRight, Shield, FileText, Cog, Star, Handshake,
  Camera, X, Plus, Download, Image as ImageIcon, Printer
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { useAuth } from '@/lib/auth-store';
import { formatEuroDate, generateId } from '@/lib/formatting';
import {
  type ClientBoat,
  type VesselChecklistItem,
  type ChecklistItemPhoto,
  type ProjectCategory,
  getDefaultChecklistForProject,
  CHECKLIST_CATEGORIES_BY_PROJECT,
  PROJECT_CATEGORY_INFO,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Extended checklist item with photos
interface ChecklistItemWithPhotos extends VesselChecklistItem {
  photos?: ChecklistItemPhoto[];
  photo_required?: boolean;
  photo_count?: number;
}

interface VesselCompletionChecklistProps {
  boat: ClientBoat;
  open: boolean;
  onClose: () => void;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, typeof Shield> = {
  safety: Shield,
  documentation: FileText,
  systems: Cog,
  quality: Star,
  handover: Handshake,
  intake: ClipboardCheck,
  service: Cog,
  testing: CheckCircle2,
  completion: Handshake,
  survey: ClipboardCheck,
  structural: Cog,
};

// Get category info based on project type
const getCategoryInfo = (projectCategory: ProjectCategory) => {
  return CHECKLIST_CATEGORIES_BY_PROJECT[projectCategory] || CHECKLIST_CATEGORIES_BY_PROJECT.new_build;
};

export function VesselCompletionChecklist({ boat, open, onClose }: VesselCompletionChecklistProps) {
  const { updateClientBoat, settings } = useNavisol();
  const { currentUser, hasPermission } = useAuth();

  const projectCategory = boat.project_category || 'new_build';
  const categoryInfo = getCategoryInfo(projectCategory);
  const projectInfo = PROJECT_CATEGORY_INFO[projectCategory];

  // Get title based on project type
  const checklistTitle = projectCategory === 'new_build'
    ? 'Vessel Completion Checklist'
    : projectCategory === 'maintenance'
    ? 'Service Completion Checklist'
    : 'Refit Completion Checklist';

  // Initialize checklist from boat or default for project type
  const [checklist, setChecklist] = useState<ChecklistItemWithPhotos[]>(() => {
    if (boat.completion_checklist && boat.completion_checklist.length > 0) {
      return boat.completion_checklist.map(item => ({
        ...item,
        photos: (item as ChecklistItemWithPhotos).photos || [],
        photo_required: (item as ChecklistItemWithPhotos).photo_required || false,
      }));
    }
    // Initialize with defaults based on project type
    const defaultChecklist = getDefaultChecklistForProject(projectCategory);
    return defaultChecklist.map((item, idx) => ({
      ...item,
      id: generateId(),
      completed: false,
      photos: [],
      // Set photo requirements for first item and quality items
      photo_required: idx === 0 || item.category === 'quality',
      photo_count: 1,
    }));
  });

  const [signoffNotes, setSignoffNotes] = useState(boat.completion_signoff?.notes || '');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['safety', 'documentation', 'systems', 'quality', 'handover']);
  const [photoDialogItem, setPhotoDialogItem] = useState<ChecklistItemWithPhotos | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItemWithPhotos[]> = {};
    checklist.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [checklist]);

  // Calculate progress
  const progress = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter(i => i.completed).length;
    const requiredTotal = checklist.filter(i => i.required).length;
    const requiredCompleted = checklist.filter(i => i.required && i.completed).length;
    // Check photo requirements
    const photoRequiredItems = checklist.filter(i => i.photo_required);
    const photosSatisfied = photoRequiredItems.every(i =>
      (i.photos?.length || 0) >= (i.photo_count || 1)
    );
    return {
      total,
      completed,
      percent: Math.round((completed / total) * 100),
      requiredTotal,
      requiredCompleted,
      allRequiredComplete: requiredCompleted === requiredTotal,
      photosSatisfied,
      canSignOff: requiredCompleted === requiredTotal && photosSatisfied,
    };
  }, [checklist]);

  // Toggle item completion
  const toggleItem = (itemId: string) => {
    if (!currentUser) return;
    setChecklist(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const nowCompleted = !item.completed;
      return {
        ...item,
        completed: nowCompleted,
        completed_by_id: nowCompleted ? currentUser.id : undefined,
        completed_by_name: nowCompleted ? `${currentUser.firstName} ${currentUser.lastName}` : undefined,
        completed_at: nowCompleted ? new Date().toISOString() : undefined,
      };
    }));
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Handle photo upload
  const handlePhotoUpload = (file: File) => {
    if (!photoDialogItem || !currentUser) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const newPhoto: ChecklistItemPhoto = {
        id: generateId(),
        checklist_item_id: photoDialogItem.id,
        image_url: e.target?.result as string,
        caption: photoCaption || undefined,
        uploaded_by_id: currentUser.id,
        uploaded_by_name: `${currentUser.firstName} ${currentUser.lastName}`,
        uploaded_at: new Date().toISOString(),
      };

      setChecklist(prev => prev.map(item => {
        if (item.id !== photoDialogItem.id) return item;
        return {
          ...item,
          photos: [...(item.photos || []), newPhoto],
        };
      }));
      setPhotoCaption('');
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const removePhoto = (itemId: string, photoId: string) => {
    setChecklist(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        photos: (item.photos || []).filter(p => p.id !== photoId),
      };
    }));
  };

  // Save checklist without sign-off
  const saveProgress = () => {
    updateClientBoat(boat.id, {
      completion_checklist: checklist as VesselChecklistItem[],
    });
    onClose();
  };

  // Complete sign-off
  const completeSignoff = () => {
    if (!currentUser || !progress.canSignOff) return;

    updateClientBoat(boat.id, {
      completion_checklist: checklist as VesselChecklistItem[],
      completion_signoff: {
        completed: true,
        signoff_by_id: currentUser.id,
        signoff_by_name: `${currentUser.firstName} ${currentUser.lastName}`,
        signoff_at: new Date().toISOString(),
        notes: signoffNotes || undefined,
      },
      status: 'delivered',
      delivery_date: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  // Export to PDF
  const exportToPdf = async () => {
    const html2pdf = (await import('html2pdf.js')).default;

    const content = document.createElement('div');
    content.innerHTML = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        h1 { font-size: 20px; color: #0f766e; margin-bottom: 5px; }
        h2 { font-size: 14px; color: #334155; margin: 15px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
        .header { margin-bottom: 20px; border-bottom: 2px solid #0f766e; padding-bottom: 15px; }
        .meta { color: #64748b; font-size: 11px; }
        .item { display: flex; align-items: flex-start; gap: 10px; margin: 8px 0; padding: 8px; background: #f8fafc; border-radius: 4px; }
        .checkbox { width: 16px; height: 16px; border: 2px solid #0f766e; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .checked { background: #0f766e; color: white; }
        .item-text { flex: 1; }
        .item-status { font-size: 10px; color: #22c55e; }
        .required { color: #dc2626; font-size: 10px; }
        .photos { margin-top: 5px; }
        .photo { display: inline-block; margin: 2px; }
        .photo img { max-height: 60px; border-radius: 4px; }
        .signoff { margin-top: 30px; padding: 15px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; }
        .signoff-title { font-weight: bold; color: #065f46; margin-bottom: 10px; }
        .signature-line { margin-top: 40px; border-top: 1px solid #334155; padding-top: 5px; width: 250px; }
      </style>
      <div class="header">
        <h1>VESSEL COMPLETION CHECKLIST</h1>
        <div class="meta">
          <strong>${boat.boat_name || boat.boat_model}</strong> | HIN: ${boat.hull_identification_number || 'N/A'}<br/>
          Generated: ${new Date().toLocaleDateString('nl-NL')} | ${settings.company_name}
        </div>
      </div>

      ${Object.entries(categoryInfo).map(([catId, catInfoPdf]) => {
        const items = groupedItems[catId] || [];
        const pdfCatData = catInfoPdf as { label: string; icon: string; color: string; bgColor: string };
        return `
          <h2>${pdfCatData.label}</h2>
          ${items.map(item => `
            <div class="item">
              <div class="checkbox ${item.completed ? 'checked' : ''}">${item.completed ? '✓' : ''}</div>
              <div class="item-text">
                <div>${item.description} ${item.required ? '<span class="required">*Required</span>' : ''}</div>
                ${item.completed ? `<div class="item-status">Completed by ${item.completed_by_name} on ${item.completed_at ? formatEuroDate(item.completed_at) : ''}</div>` : ''}
                ${item.photos && item.photos.length > 0 ? `
                  <div class="photos">
                    ${item.photos.map(p => `<span class="photo"><img src="${p.image_url}" alt="Evidence"/></span>`).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        `;
      }).join('')}

      ${boat.completion_signoff?.completed ? `
        <div class="signoff">
          <div class="signoff-title">SIGN-OFF COMPLETED</div>
          <div>Signed off by: <strong>${boat.completion_signoff.signoff_by_name}</strong></div>
          <div>Date: ${boat.completion_signoff.signoff_at ? formatEuroDate(boat.completion_signoff.signoff_at) : ''}</div>
          ${boat.completion_signoff.notes ? `<div>Notes: ${boat.completion_signoff.notes}</div>` : ''}
        </div>
      ` : `
        <div style="margin-top: 40px;">
          <div class="signature-line">Signature Production Manager</div>
          <div class="signature-line" style="margin-top: 30px;">Signature Quality Control</div>
        </div>
      `}
    `;

    const opt = {
      margin: 10,
      filename: `Checklist_${boat.boat_name || boat.boat_model}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(content).save();
  };

  const canManage = hasPermission('updateProduction');
  const isAlreadySignedOff = boat.completion_signoff?.completed;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-teal-600" />
              Vessel Completion Checklist
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              {boat.boat_name || boat.boat_model} - {boat.hull_identification_number || 'No HIN'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Summary */}
          <div className="space-y-3 py-4 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={exportToPdf}>
                  <Download className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
                <span className="text-sm text-slate-500">{progress.completed}/{progress.total} items ({progress.percent}%)</span>
              </div>
            </div>
            <Progress value={progress.percent} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className={progress.allRequiredComplete ? 'text-green-600' : 'text-orange-600'}>
                  {progress.requiredCompleted}/{progress.requiredTotal} required items
                </span>
                {!progress.photosSatisfied && (
                  <span className="text-orange-600 flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    Photos required for some items
                  </span>
                )}
              </div>
              {isAlreadySignedOff && (
                <Badge className="bg-green-500 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Signed off by {boat.completion_signoff?.signoff_by_name}
                </Badge>
              )}
            </div>
          </div>

          {/* Checklist Items */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              {Object.entries(categoryInfo).map(([categoryId, catInfo]) => {
                const items = groupedItems[categoryId] || [];
                const categoryCompleted = items.filter(i => i.completed).length;
                const categoryTotal = items.length;
                const isExpanded = expandedCategories.includes(categoryId);
                const Icon = CATEGORY_ICONS[categoryId] || Shield;
                const catData = catInfo as { label: string; icon: string; color: string; bgColor: string };

                return (
                  <Collapsible key={categoryId} open={isExpanded} onOpenChange={() => toggleCategory(categoryId)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${catData.bgColor}`}>
                            <Icon className={`h-4 w-4 ${catData.color}`} />
                          </div>
                          <span className="font-medium">{catData.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={categoryCompleted === categoryTotal ? 'default' : 'secondary'} className={categoryCompleted === categoryTotal ? 'bg-green-500' : ''}>
                            {categoryCompleted}/{categoryTotal}
                          </Badge>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 mt-2 ml-4">
                        {items.map(item => {
                          const photosNeeded = item.photo_required ? (item.photo_count || 1) : 0;
                          const photosHave = item.photos?.length || 0;
                          const photosOk = photosHave >= photosNeeded;

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-lg border ${
                                item.completed
                                  ? 'bg-green-50 border-green-200'
                                  : item.required
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={item.completed}
                                  onCheckedChange={() => canManage && !isAlreadySignedOff && toggleItem(item.id)}
                                  disabled={!canManage || isAlreadySignedOff}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${item.completed ? 'line-through text-slate-500' : ''}`}>
                                    {item.description}
                                  </p>
                                  {item.completed && item.completed_by_name && (
                                    <p className="text-xs text-green-600 mt-1">
                                      {item.completed_by_name} • {item.completed_at && formatEuroDate(item.completed_at)}
                                    </p>
                                  )}

                                  {/* Photos */}
                                  {(item.photo_required || (item.photos && item.photos.length > 0)) && (
                                    <div className="mt-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Camera className="h-3 w-3 text-slate-400" />
                                        <span className="text-xs text-slate-500">
                                          Photos: {photosHave}{item.photo_required ? `/${photosNeeded} required` : ''}
                                        </span>
                                        {canManage && !isAlreadySignedOff && (
                                          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setPhotoDialogItem(item)}>
                                            <Plus className="h-3 w-3 mr-1" />Add
                                          </Button>
                                        )}
                                      </div>
                                      {item.photos && item.photos.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {item.photos.map(photo => (
                                            <div key={photo.id} className="relative group">
                                              <img src={photo.image_url} alt={photo.caption || 'Evidence'} className="h-16 w-16 object-cover rounded border" />
                                              {canManage && !isAlreadySignedOff && (
                                                <button
                                                  type="button"
                                                  onClick={() => removePhoto(item.id, photo.id)}
                                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.photo_required && !photosOk && (
                                    <Badge variant="outline" className="text-xs text-orange-600 shrink-0">
                                      <Camera className="h-3 w-3 mr-1" />Photo
                                    </Badge>
                                  )}
                                  {item.required && !item.completed && (
                                    <Badge variant="outline" className="text-xs text-red-600 shrink-0">Required</Badge>
                                  )}
                                  {item.completed && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>

          {/* Sign-off Section */}
          {!isAlreadySignedOff && progress.canSignOff && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">All requirements met - Ready for sign-off</span>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                  Sign-off Notes (Optional)
                </Label>
                <Textarea
                  value={signoffNotes}
                  onChange={(e) => setSignoffNotes(e.target.value)}
                  placeholder="Add any notes for the delivery sign-off..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {!progress.canSignOff && !isAlreadySignedOff && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">
                  {!progress.allRequiredComplete && `${progress.requiredTotal - progress.requiredCompleted} required items remaining. `}
                  {!progress.photosSatisfied && 'Some items require photos.'}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {isAlreadySignedOff ? 'Close' : 'Cancel'}
            </Button>
            {!isAlreadySignedOff && canManage && (
              <>
                <Button variant="outline" onClick={saveProgress}>
                  Save Progress
                </Button>
                <Button
                  onClick={completeSignoff}
                  disabled={!progress.canSignOff}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Complete Sign-off & Deliver
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Dialog */}
      <Dialog open={!!photoDialogItem} onOpenChange={() => setPhotoDialogItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-teal-600" />
              Add Photo Evidence
            </DialogTitle>
            <DialogDescription>
              {photoDialogItem?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
              />
              <ImageIcon className="h-12 w-12 mx-auto text-slate-300 mb-2" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" />
                Select Photo
              </Button>
              <p className="text-xs text-slate-500 mt-2">JPG, PNG up to 10MB</p>
            </div>
            <div>
              <Label>Caption (Optional)</Label>
              <Input
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Describe the photo..."
                className="mt-1"
              />
            </div>

            {/* Existing photos */}
            {photoDialogItem?.photos && photoDialogItem.photos.length > 0 && (
              <div>
                <Label>Uploaded Photos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {photoDialogItem.photos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <img src={photo.image_url} alt={photo.caption || ''} className="h-20 w-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => photoDialogItem && removePhoto(photoDialogItem.id, photo.id)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoDialogItem(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VesselCompletionChecklist;
