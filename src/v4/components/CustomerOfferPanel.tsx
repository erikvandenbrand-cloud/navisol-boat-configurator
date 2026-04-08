/**
 * Customer Offer Panel - v325 (Sales Track)
 *
 * Displays and manages Customer Offer deliverables for a Quote.
 * Allows explicit generation, editing, preview, and regeneration.
 *
 * GOVERNANCE:
 * - Generation is explicit user action only
 * - No auto-regeneration when quote/model changes
 * - Production role cannot access this component
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  BookOpen,
  Image,
  List,
  DollarSign,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import type {
  CustomerOffer,
  CustomerOfferBlock,
  GenerateCustomerOfferInput,
} from '@/domain/models/customer-offer';
import type { Project, ProjectQuote } from '@/domain/models';
import { CustomerOfferService } from '@/domain/services/CustomerOfferService';
import { BoatModelService, type BoatModel, type SalesSection, type SalesImage } from '@/domain/services/BoatModelService';
import { getAuditContext } from '@/domain/auth';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ============================================
// TYPES
// ============================================

interface CustomerOfferPanelProps {
  project: Project;
  quote: ProjectQuote;
  onRefresh: () => void;
}

// ============================================
// BLOCK TYPE ICONS
// ============================================

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  COVER: <FileText className="h-4 w-4" />,
  MODEL_INTRO: <BookOpen className="h-4 w-4" />,
  IMAGE_GALLERY: <Image className="h-4 w-4" />,
  EQUIPMENT_LIST: <List className="h-4 w-4" />,
  PRICING_SUMMARY: <DollarSign className="h-4 w-4" />,
  TERMS: <FileCheck className="h-4 w-4" />,
};

const BLOCK_LABELS: Record<string, string> = {
  COVER: 'Cover Page',
  MODEL_INTRO: 'Model Introduction',
  IMAGE_GALLERY: 'Image Gallery',
  EQUIPMENT_LIST: 'Equipment List',
  PRICING_SUMMARY: 'Pricing Summary',
  TERMS: 'Terms & Conditions',
};

// ============================================
// MAIN COMPONENT
// ============================================

export function CustomerOfferPanel({ project, quote, onRefresh }: CustomerOfferPanelProps) {
  const { can, user } = useAuth();
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boatModel, setBoatModel] = useState<BoatModel | null>(null);

  // Dialog states
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [selectedOffer, setSelectedOffer] = useState<CustomerOffer | null>(null);
  const [editingBlock, setEditingBlock] = useState<CustomerOfferBlock | null>(null);

  // Generate options
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [includeEquipment, setIncludeEquipment] = useState(true);
  const [includePricing, setIncludePricing] = useState(true);
  const [initialTerms, setInitialTerms] = useState('');

  const canEdit = can('quote:update');
  const isQuoteDraft = quote.status === 'DRAFT';

  // Load offers and boat model
  useEffect(() => {
    loadData();
  }, [quote.id, project.configuration.boatModelVersionId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [offerList, model] = await Promise.all([
        CustomerOfferService.getByQuoteId(quote.id),
        project.configuration.boatModelVersionId
          ? BoatModelService.getById(project.configuration.boatModelVersionId)
          : Promise.resolve(null),
      ]);
      setOffers(offerList);
      setBoatModel(model);

      // Pre-select all sections and images
      if (model) {
        setSelectedSectionIds(
          model.salesSections?.filter(s => !s.archived).map(s => s.id) || []
        );
        setSelectedImageIds(model.salesImages?.map(i => i.id) || []);
      }
    } catch (error) {
      console.error('Failed to load customer offers:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const currentOffer = useMemo(() => {
    // Get the most recent draft, or the most recent finalized
    const drafts = offers.filter(o => o.status === 'DRAFT');
    if (drafts.length > 0) return drafts[drafts.length - 1];
    return offers[offers.length - 1] || null;
  }, [offers]);

  const hasSalesContent = useMemo(() => {
    return (
      (boatModel?.salesSections?.filter(s => !s.archived)?.length || 0) > 0 ||
      (boatModel?.salesImages?.length || 0) > 0
    );
  }, [boatModel]);

  // ============================================
  // ACTIONS
  // ============================================

  async function handleGenerate() {
    const input: GenerateCustomerOfferInput = {
      quoteId: quote.id,
      projectId: project.id,
      includeSalesSectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
      includeSalesImageIds: selectedImageIds.length > 0 ? selectedImageIds : undefined,
      includeEquipmentList: includeEquipment,
      includePricingSummary: includePricing,
      termsText: initialTerms.trim() || undefined,
    };

    const result = await CustomerOfferService.generate(input, getAuditContext());
    if (result.ok) {
      await loadData();
      setShowGenerateDialog(false);
      onRefresh();
    } else {
      alert(`Failed to generate: ${result.error}`);
    }
  }

  async function handleRegenerate() {
    if (!currentOffer) return;

    const input: GenerateCustomerOfferInput = {
      quoteId: quote.id,
      projectId: project.id,
      includeSalesSectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
      includeSalesImageIds: selectedImageIds.length > 0 ? selectedImageIds : undefined,
      includeEquipmentList: includeEquipment,
      includePricingSummary: includePricing,
      termsText: initialTerms.trim() || undefined,
    };

    const result = await CustomerOfferService.regenerate(currentOffer.id, input, getAuditContext());
    if (result.ok) {
      await loadData();
      setShowRegenerateConfirm(false);
      onRefresh();
    } else {
      alert(`Failed to regenerate: ${result.error}`);
    }
  }

  async function handleSaveBlock() {
    if (!currentOffer || !editingBlock) return;

    const result = await CustomerOfferService.updateBlock(
      currentOffer.id,
      {
        blockId: editingBlock.id,
        heading: editingBlock.heading,
        content: editingBlock.content,
        included: editingBlock.included,
      },
      getAuditContext()
    );

    if (result.ok) {
      setSelectedOffer(result.value);
      setEditingBlock(null);
      await loadData();
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  }

  async function handleFinalize() {
    if (!currentOffer) return;

    const result = await CustomerOfferService.finalize(currentOffer.id, getAuditContext());
    if (result.ok) {
      await loadData();
      onRefresh();
    } else {
      alert(`Failed to finalize: ${result.error}`);
    }
  }

  async function handleDelete() {
    if (!currentOffer) return;

    const result = await CustomerOfferService.delete(currentOffer.id, getAuditContext());
    if (result.ok) {
      setShowDeleteConfirm(false);
      setSelectedOffer(null);
      await loadData();
      onRefresh();
    } else {
      alert(`Failed to delete: ${result.error}`);
    }
  }

  function handlePreview() {
    if (!currentOffer) return;
    setSelectedOffer(currentOffer);
    setShowPreviewDialog(true);
  }

  function handleEditBlock(block: CustomerOfferBlock) {
    setEditingBlock({ ...block });
    setShowEditDialog(true);
  }

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          Loading...
        </CardContent>
      </Card>
    );
  }

  // Production role cannot see this
  if (user?.role === 'PRODUCTION') {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              Customer Offer
            </CardTitle>
            <CardDescription>
              Brochure-style document generated from this quote
            </CardDescription>
          </div>
          {!currentOffer && (
            <Button
              onClick={() => setShowGenerateDialog(true)}
              disabled={!canEdit}
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Offer
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!currentOffer ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-medium text-slate-900 mb-1">No Customer Offer</h4>
              <p className="text-sm text-slate-500 max-w-xs mb-4">
                Generate a brochure-style offer document from this quote with model info, equipment list, and pricing.
              </p>
              {!hasSalesContent && boatModel && (
                <div className="flex items-center gap-2 text-amber-600 text-xs mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No sales content on Boat Model. Add sections in Library first.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Offer Header */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-teal-600" />
                  <div>
                    <p className="font-medium">Customer Offer for {quote.quoteNumber}</p>
                    <p className="text-sm text-slate-500">
                      Generated {new Date(currentOffer.generatedAt).toLocaleDateString('en-GB')}
                      {currentOffer.boatModelName && ` • ${currentOffer.boatModelName}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={currentOffer.status === 'DRAFT' ? 'outline' : 'default'}>
                    {currentOffer.status}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={handlePreview}>
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  {currentOffer.status === 'DRAFT' && canEdit && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRegenerateConfirm(true)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleFinalize}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Finalize
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Block List */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 px-1 text-sm font-medium text-slate-700 hover:text-slate-900">
                  <ChevronDown className="h-4 w-4" />
                  Document Blocks ({currentOffer.blocks.filter(b => b.included).length} included)
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {currentOffer.blocks
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((block) => (
                        <div
                          key={block.id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            block.included ? 'bg-white' : 'bg-slate-50 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-slate-400">
                              {BLOCK_ICONS[block.type] || <FileText className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{block.heading || BLOCK_LABELS[block.type]}</p>
                              <p className="text-xs text-slate-500">{BLOCK_LABELS[block.type]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!block.included && (
                              <Badge variant="outline" className="text-xs">Hidden</Badge>
                            )}
                            {currentOffer.status === 'DRAFT' && canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditBlock(block)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Customer Offer</DialogTitle>
            <DialogDescription>
              Create a brochure-style document for {quote.quoteNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sales Sections Selection */}
            {boatModel?.salesSections && boatModel.salesSections.filter(s => !s.archived).length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Model Sales Sections</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {boatModel.salesSections
                    .filter(s => !s.archived)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((section) => (
                      <div key={section.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSectionIds.includes(section.id)}
                          onCheckedChange={(checked) => {
                            setSelectedSectionIds(
                              checked
                                ? [...selectedSectionIds, section.id]
                                : selectedSectionIds.filter(id => id !== section.id)
                            );
                          }}
                        />
                        <span className="text-sm">{section.heading || '(Untitled)'}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Sales Images Selection */}
            {boatModel?.salesImages && boatModel.salesImages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Model Images</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {boatModel.salesImages
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((img, idx) => (
                      <div key={img.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedImageIds.includes(img.id)}
                          onCheckedChange={(checked) => {
                            setSelectedImageIds(
                              checked
                                ? [...selectedImageIds, img.id]
                                : selectedImageIds.filter(id => id !== img.id)
                            );
                          }}
                        />
                        <span className="text-sm">{img.caption || `Image ${idx + 1}`}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Include Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Include Blocks</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={includeEquipment}
                    onCheckedChange={(checked) => setIncludeEquipment(!!checked)}
                  />
                  <span className="text-sm">Equipment List</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={includePricing}
                    onCheckedChange={(checked) => setIncludePricing(!!checked)}
                  />
                  <span className="text-sm">Pricing Summary</span>
                </div>
              </div>
            </div>

            {/* Initial Terms */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Terms & Conditions (optional)</Label>
              <Textarea
                value={initialTerms}
                onChange={(e) => setInitialTerms(e.target.value)}
                placeholder="Enter any terms, conditions, or notes..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate}>
              <FileText className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Customer Offer Preview</DialogTitle>
            <DialogDescription>
              {selectedOffer?.quoteNumber} • {selectedOffer?.boatModelName || 'Custom Configuration'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-lg bg-white" style={{ height: '70vh' }}>
            {selectedOffer && (
              <iframe
                srcDoc={CustomerOfferService.generateHtmlPreview(selectedOffer)}
                className="w-full h-full"
                title="Customer Offer Preview"
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedOffer) {
                  const html = CustomerOfferService.generateHtmlPreview(selectedOffer);
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `customer-offer-${selectedOffer.quoteNumber}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download HTML
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Block Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
            <DialogDescription>
              {editingBlock && BLOCK_LABELS[editingBlock.type]}
            </DialogDescription>
          </DialogHeader>

          {editingBlock && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingBlock.included}
                  onCheckedChange={(checked) =>
                    setEditingBlock({ ...editingBlock, included: !!checked })
                  }
                />
                <Label className="text-sm">Include in document</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Heading</Label>
                <Input
                  value={editingBlock.heading}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, heading: e.target.value })
                  }
                  placeholder="Block heading..."
                />
              </div>

              {editingBlock.type !== 'IMAGE_GALLERY' &&
                editingBlock.type !== 'EQUIPMENT_LIST' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Content</Label>
                    <Textarea
                      value={editingBlock.content}
                      onChange={(e) =>
                        setEditingBlock({ ...editingBlock, content: e.target.value })
                      }
                      placeholder="Block content... (supports markdown)"
                      rows={8}
                      className="text-sm font-mono"
                    />
                  </div>
                )}

              {(editingBlock.type === 'IMAGE_GALLERY' ||
                editingBlock.type === 'EQUIPMENT_LIST') && (
                <p className="text-xs text-slate-500">
                  This block's content is generated from source data and cannot be edited directly.
                  You can change the heading and visibility.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlock}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirm */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Customer Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the current draft and create a new one from the quote data.
              All manual edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the draft Customer Offer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
