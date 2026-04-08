'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Calendar,
  Percent,
  DollarSign,
  Sparkles,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Edit2,
  AlertTriangle,
} from 'lucide-react';
import type { ProjectQuote, QuoteLine, Project, ProjectOffer, OfferTemplate, ProjectOfferBlock, ReapplyMode, OfferVariableContext } from '@/domain/models';
import { generateUUID } from '@/domain/models';
import { OfferTemplateService } from '@/domain/services/OfferTemplateService';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: ProjectQuote | null;
  project?: Project | null;
  clientName?: string;
  boatModelName?: string;
  onSave: (updates: Partial<ProjectQuote>) => Promise<void>;
}

const DEFAULT_PAYMENT_TERMS = [
  '30% deposit, 60% before delivery, 10% at delivery',
  '50% deposit, 50% at delivery',
  '100% before delivery',
  '30 days net',
  'Custom',
];

const DEFAULT_DELIVERY_TERMS = [
  'Ex Works, Elburg, Netherlands',
  'FOB Dutch Port',
  'DAP Buyer Location',
  'Custom',
];

export function EditQuoteDialog({
  open,
  onOpenChange,
  quote,
  project,
  clientName,
  boatModelName,
  onSave,
}: EditQuoteDialogProps) {
  // Form state
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [deliveryWeeks, setDeliveryWeeks] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [vatRate, setVatRate] = useState(21);

  const [isLoading, setIsLoading] = useState(false);
  const [customPaymentTerms, setCustomPaymentTerms] = useState('');
  const [customDeliveryTerms, setCustomDeliveryTerms] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'lines' | 'offer'>('lines');

  // Offer state
  const [offer, setOffer] = useState<ProjectOffer | undefined>(undefined);
  const [offerTemplates, setOfferTemplates] = useState<OfferTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showInitOfferDialog, setShowInitOfferDialog] = useState(false);
  const [showReapplyDialog, setShowReapplyDialog] = useState(false);
  const [reapplyMode, setReapplyMode] = useState<ReapplyMode>('non-edited');
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showResetBlockDialog, setShowResetBlockDialog] = useState<string | null>(null);

  useEffect(() => {
    if (quote) {
      setLines([...quote.lines]);
      setDiscountPercent(quote.discountPercent || 0);
      setValidUntil(quote.validUntil.split('T')[0]); // Get date part only
      setPaymentTerms(
        DEFAULT_PAYMENT_TERMS.includes(quote.paymentTerms)
          ? quote.paymentTerms
          : 'Custom'
      );
      setCustomPaymentTerms(
        DEFAULT_PAYMENT_TERMS.includes(quote.paymentTerms)
          ? ''
          : quote.paymentTerms
      );
      setDeliveryTerms(
        DEFAULT_DELIVERY_TERMS.includes(quote.deliveryTerms)
          ? quote.deliveryTerms
          : 'Custom'
      );
      setCustomDeliveryTerms(
        DEFAULT_DELIVERY_TERMS.includes(quote.deliveryTerms)
          ? ''
          : quote.deliveryTerms
      );
      setDeliveryWeeks(quote.deliveryWeeks);
      setNotes(quote.notes || '');
      setVatRate(quote.vatRate);
      setOffer(quote.offer);
      // Expand all blocks by default if offer exists
      if (quote.offer) {
        setExpandedBlocks(new Set(quote.offer.blocks.map(b => b.blockId)));
      }
    }
  }, [quote]);

  // Load offer templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        await OfferTemplateService.initializeSeedData();
        const templates = await OfferTemplateService.getAll();
        setOfferTemplates(templates);
        // Pre-select default template
        const defaultTemplate = templates.find(t => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        } else if (templates.length > 0) {
          setSelectedTemplateId(templates[0].id);
        }
      } catch (error) {
        console.error('Failed to load offer templates:', error);
      }
    }
    if (open) {
      loadTemplates();
    }
  }, [open]);

  // Calculate totals
  const subtotalExclVat = lines.reduce((sum, line) => sum + line.lineTotalExclVat, 0);
  const discountAmount = Math.round(subtotalExclVat * (discountPercent / 100) * 100) / 100;
  const totalExclVat = subtotalExclVat - discountAmount;
  const vatAmount = Math.round(totalExclVat * (vatRate / 100) * 100) / 100;
  const totalInclVat = totalExclVat + vatAmount;

  // Build variable context for offer template
  const variableContext: OfferVariableContext = useMemo(() => ({
    projectNumber: project?.projectNumber,
    projectTitle: project?.title,
    clientName: clientName || 'Customer',
    boatModel: boatModelName || project?.configuration.boatModelVersionId || 'Boat',
    deliveryWeeks: deliveryWeeks,
    totalExclVat: totalExclVat,
    totalInclVat: totalInclVat,
    quoteNumber: quote?.quoteNumber,
    validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
  }), [project, clientName, boatModelName, deliveryWeeks, totalExclVat, totalInclVat, quote?.quoteNumber, validUntil]);

  function handleLineChange(index: number, field: keyof QuoteLine, value: unknown) {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate line total if quantity or price changed
    if (field === 'quantity' || field === 'unitPriceExclVat') {
      const qty = field === 'quantity' ? (value as number) : updated[index].quantity;
      const price = field === 'unitPriceExclVat' ? (value as number) : updated[index].unitPriceExclVat;
      updated[index].lineTotalExclVat = qty * price;
    }

    setLines(updated);
  }

  function handleAddLine() {
    const newLine: QuoteLine = {
      id: generateUUID(),
      configurationItemId: '',
      category: 'Other',
      description: 'New item',
      quantity: 1,
      unit: 'pcs',
      unitPriceExclVat: 0,
      lineTotalExclVat: 0,
      isOptional: false,
    };
    setLines([...lines, newLine]);
  }

  function handleRemoveLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  // ============================================
  // OFFER HANDLERS
  // ============================================

  async function handleInitializeOffer() {
    if (!selectedTemplateId) return;

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.initializeFromTemplate(
      selectedTemplateId,
      variableContext,
      context
    );

    if (result.ok) {
      setOffer(result.value);
      setExpandedBlocks(new Set(result.value.blocks.map(b => b.blockId)));
      setShowInitOfferDialog(false);
    } else {
      alert(result.error);
    }
  }

  function handleStartEditBlock(block: ProjectOfferBlock) {
    setEditingBlockId(block.blockId);
    setEditingText(block.text);
  }

  function handleSaveBlockEdit() {
    if (!offer || !editingBlockId) return;

    const context = getDefaultAuditContext();
    const result = OfferTemplateService.updateBlock(offer, editingBlockId, editingText, context);

    if (result.ok) {
      setOffer(result.value);
      setEditingBlockId(null);
      setEditingText('');
    } else {
      alert(result.error);
    }
  }

  function handleCancelBlockEdit() {
    setEditingBlockId(null);
    setEditingText('');
  }

  async function handleResetBlock(blockId: string) {
    if (!offer) return;

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.resetBlock(offer, blockId, variableContext, context);

    if (result.ok) {
      setOffer(result.value);
      setShowResetBlockDialog(null);
    } else {
      alert(result.error);
    }
  }

  async function handleReapplyTemplate() {
    if (!offer) return;

    const context = getDefaultAuditContext();
    const result = await OfferTemplateService.reapplyTemplate(
      offer,
      {
        mode: reapplyMode,
        selectedBlockIds: reapplyMode === 'selected' ? selectedBlockIds : undefined,
      },
      variableContext,
      context
    );

    if (result.ok) {
      setOffer(result.value);
      setShowReapplyDialog(false);
      setReapplyMode('non-edited');
      setSelectedBlockIds([]);
    } else {
      alert(result.error);
    }
  }

  function toggleBlockExpanded(blockId: string) {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }

  function toggleSelectBlock(blockId: string) {
    setSelectedBlockIds(prev =>
      prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]
    );
  }

  const editedBlockCount = offer ? OfferTemplateService.getEditedBlockCount(offer) : 0;

  async function handleSave() {
    if (!quote) return;

    setIsLoading(true);
    try {
      const finalPaymentTerms = paymentTerms === 'Custom' ? customPaymentTerms : paymentTerms;
      const finalDeliveryTerms = deliveryTerms === 'Custom' ? customDeliveryTerms : deliveryTerms;

      await onSave({
        lines,
        subtotalExclVat,
        discountPercent,
        discountAmount,
        totalExclVat,
        vatRate,
        vatAmount,
        totalInclVat,
        validUntil: new Date(validUntil).toISOString(),
        paymentTerms: finalPaymentTerms,
        deliveryTerms: finalDeliveryTerms,
        deliveryWeeks,
        notes: notes || undefined,
        offer,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save quote:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  if (!quote) return null;

  return (
    <TooltipProvider>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Edit Quote: {quote.quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Modify quote lines, pricing, terms, customer offer, and validity
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lines' | 'offer')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mb-4">
            <TabsTrigger value="lines">
              Quote Lines & Terms
            </TabsTrigger>
            <TabsTrigger value="offer" className="flex items-center gap-2">
              Customer Offer
              {offer && (
                <Badge variant="secondary" className="text-[10px] py-0 ml-1">
                  {offer.blocks.length} blocks
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lines" className="flex-1 overflow-y-auto space-y-6">
          {/* Quote Lines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Quote Lines</Label>
              <Button size="sm" variant="outline" onClick={handleAddLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Optional</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => handleLineChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-8 w-16 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.unit}
                        onValueChange={(v) => handleLineChange(index, 'unit', v)}
                      >
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">pcs</SelectItem>
                          <SelectItem value="set">set</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="m²">m²</SelectItem>
                          <SelectItem value="hrs">hrs</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unitPriceExclVat}
                        onChange={(e) => handleLineChange(index, 'unitPriceExclVat', parseFloat(e.target.value) || 0)}
                        className="h-8 w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(line.lineTotalExclVat)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={line.isOptional}
                        onCheckedChange={(checked) => handleLineChange(index, 'isOptional', !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => handleRemoveLine(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pricing Summary */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Discount */}
              <div>
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Discount
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm text-slate-500">%</span>
                  {discountAmount > 0 && (
                    <span className="text-sm text-green-600">
                      (-{formatCurrency(discountAmount)})
                    </span>
                  )}
                </div>
              </div>

              {/* Validity */}
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Valid Until
                </Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Delivery Weeks */}
              <div>
                <Label>Delivery Time (weeks)</Label>
                <Input
                  type="number"
                  min={1}
                  value={deliveryWeeks || ''}
                  onChange={(e) => setDeliveryWeeks(parseInt(e.target.value) || undefined)}
                  placeholder="e.g. 12"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotalExclVat)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Total excl. VAT</span>
                <span className="font-medium">{formatCurrency(totalExclVat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">VAT ({vatRate}%)</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-lg">
                <span className="font-semibold">Total incl. VAT</span>
                <span className="font-bold text-teal-600">{formatCurrency(totalInclVat)}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_PAYMENT_TERMS.map((term) => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentTerms === 'Custom' && (
                <Textarea
                  value={customPaymentTerms}
                  onChange={(e) => setCustomPaymentTerms(e.target.value)}
                  placeholder="Enter custom payment terms..."
                  className="mt-2"
                  rows={2}
                />
              )}
            </div>
            <div>
              <Label>Delivery Terms</Label>
              <Select value={deliveryTerms} onValueChange={setDeliveryTerms}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_DELIVERY_TERMS.map((term) => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deliveryTerms === 'Custom' && (
                <Textarea
                  value={customDeliveryTerms}
                  onChange={(e) => setCustomDeliveryTerms(e.target.value)}
                  placeholder="Enter custom delivery terms..."
                  className="mt-2"
                  rows={2}
                />
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes & Special Conditions</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or special conditions..."
              className="mt-1"
              rows={3}
            />
          </div>
          </TabsContent>

          {/* Customer Offer Tab */}
          <TabsContent value="offer" className="flex-1 overflow-y-auto">
            {!offer ? (
              // No offer yet - show empty state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-slate-400" />
                </div>
                <h4 className="text-base font-medium text-slate-900 mb-1">No customer offer</h4>
                <p className="text-sm text-slate-500 max-w-xs mb-5">
                  Initialize from a template to add terms, warranty, and delivery information.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowInitOfferDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Initialize from Template
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Offer header */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Based on "{offer.templateName}"</span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        v{offer.templateVersionUsed}
                      </Badge>
                      {editedBlockCount > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-200">
                          {editedBlockCount} edited
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Initialized {new Date(offer.initializedAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReapplyDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-apply Template
                  </Button>
                </div>

                {/* Offer blocks */}
                <div className="space-y-2">
                  {offer.blocks.map((block) => (
                    <OfferBlockEditor
                      key={block.blockId}
                      block={block}
                      isEditing={editingBlockId === block.blockId}
                      editingText={editingText}
                      onEditingTextChange={setEditingText}
                      isExpanded={expandedBlocks.has(block.blockId)}
                      onToggleExpanded={() => toggleBlockExpanded(block.blockId)}
                      onStartEdit={() => handleStartEditBlock(block)}
                      onSaveEdit={handleSaveBlockEdit}
                      onCancelEdit={handleCancelBlockEdit}
                      onReset={() => setShowResetBlockDialog(block.blockId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || lines.length === 0}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Initialize Offer Dialog */}
    <Dialog open={showInitOfferDialog} onOpenChange={setShowInitOfferDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            Initialize Customer Offer
          </DialogTitle>
          <DialogDescription>
            Select a template to create the offer text. Variables will be automatically filled in.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {offerTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <span className="flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          Default
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplateId && (
            <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
              <p className="font-medium mb-1">
                {offerTemplates.find(t => t.id === selectedTemplateId)?.name}
              </p>
              <p className="text-slate-500">
                {offerTemplates.find(t => t.id === selectedTemplateId)?.blocks.length || 0} blocks
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowInitOfferDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleInitializeOffer} disabled={!selectedTemplateId}>
            <Check className="h-4 w-4 mr-2" />
            Initialize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Re-apply Template Dialog */}
    <Dialog open={showReapplyDialog} onOpenChange={setShowReapplyDialog}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-teal-600" />
            Re-apply Template
          </DialogTitle>
          <DialogDescription>
            Update offer blocks from the template. Choose which blocks to overwrite.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Re-apply mode selection */}
          <div className="space-y-3">
            <ReapplyModeOption
              mode="all"
              currentMode={reapplyMode}
              onSelect={() => setReapplyMode('all')}
              title="Overwrite all blocks"
              description="Replace all blocks with template defaults. Edited changes will be lost."
            />
            <ReapplyModeOption
              mode="non-edited"
              currentMode={reapplyMode}
              onSelect={() => setReapplyMode('non-edited')}
              title="Only non-edited blocks"
              description="Keep your edited blocks, update the rest from template."
            />
            <ReapplyModeOption
              mode="selected"
              currentMode={reapplyMode}
              onSelect={() => setReapplyMode('selected')}
              title="Select specific blocks"
              description="Choose exactly which blocks to overwrite."
            />
          </div>

          {/* Block selection (when mode is 'selected') */}
          {reapplyMode === 'selected' && offer && (
            <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {offer.blocks.map((block) => (
                <div key={block.blockId} className="flex items-center gap-2">
                  <Checkbox
                    id={`reapply-block-${block.blockId}`}
                    checked={selectedBlockIds.includes(block.blockId)}
                    onCheckedChange={() => toggleSelectBlock(block.blockId)}
                  />
                  <Label
                    htmlFor={`reapply-block-${block.blockId}`}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    {block.title}
                    {block.isEdited && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-[10px] py-0 text-amber-600 border-amber-200"
                      >
                        Edited
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {/* Warning for 'all' mode */}
          {reapplyMode === 'all' && editedBlockCount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                This will overwrite {editedBlockCount} edited block{editedBlockCount !== 1 ? 's' : ''}.
                Your changes will be lost.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowReapplyDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReapplyTemplate}
            disabled={reapplyMode === 'selected' && selectedBlockIds.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Reset Block Confirmation */}
    <AlertDialog
      open={!!showResetBlockDialog}
      onOpenChange={(open) => !open && setShowResetBlockDialog(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Block to Template</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace the block content with the template default. Your edits will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => showResetBlockDialog && handleResetBlock(showResetBlockDialog)}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset Block
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

interface ReapplyModeOptionProps {
  mode: ReapplyMode;
  currentMode: ReapplyMode;
  onSelect: () => void;
  title: string;
  description: string;
}

function ReapplyModeOption({ mode, currentMode, onSelect, title, description }: ReapplyModeOptionProps) {
  const isSelected = mode === currentMode;
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-4 h-4 rounded-full border-2 ${
            isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
          }`}
        >
          {isSelected && <Check className="h-3 w-3 text-white mx-auto mt-0.5" />}
        </div>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1 ml-6">{description}</p>
    </div>
  );
}

interface OfferBlockEditorProps {
  block: ProjectOfferBlock;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onReset: () => void;
}

function OfferBlockEditor({
  block,
  isEditing,
  editingText,
  onEditingTextChange,
  isExpanded,
  onToggleExpanded,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onReset,
}: OfferBlockEditorProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div
            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 ${
              isExpanded ? 'border-b' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
              <span className="font-medium text-slate-900">{block.title}</span>
              {block.isEdited && (
                <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-200">
                  Edited
                </Badge>
              )}
            </div>

            {!isEditing && isExpanded && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onStartEdit}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
                {block.isEdited && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                        onClick={onReset}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset to template</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="p-3">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editingText}
                  onChange={(e) => onEditingTextChange(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={onCancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={onSaveEdit}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{block.text}</div>
            )}

            {/* Edit metadata */}
            {block.isEdited && block.editedAt && !isEditing && (
              <div className="mt-3 pt-2 border-t text-xs text-slate-400">
                Last edited {new Date(block.editedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
