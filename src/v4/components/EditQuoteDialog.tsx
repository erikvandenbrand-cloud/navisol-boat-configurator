'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Calendar,
  Percent,
  DollarSign,
} from 'lucide-react';
import type { ProjectQuote, QuoteLine } from '@/domain/models';
import { generateUUID } from '@/domain/models';
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

interface EditQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: ProjectQuote | null;
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
    }
  }, [quote]);

  // Calculate totals
  const subtotalExclVat = lines.reduce((sum, line) => sum + line.lineTotalExclVat, 0);
  const discountAmount = Math.round(subtotalExclVat * (discountPercent / 100) * 100) / 100;
  const totalExclVat = subtotalExclVat - discountAmount;
  const vatAmount = Math.round(totalExclVat * (vatRate / 100) * 100) / 100;
  const totalInclVat = totalExclVat + vatAmount;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Edit Quote: {quote.quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Modify quote lines, pricing, terms, and validity
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
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
        </div>

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
  );
}
