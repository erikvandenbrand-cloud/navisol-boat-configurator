'use client';

import { useState, useEffect } from 'react';
import { Package, Save } from 'lucide-react';
import type { ConfigurationItem } from '@/domain/models';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditConfigurationItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ConfigurationItem | null;
  onSave: (updates: Partial<ConfigurationItem>) => Promise<void>;
}

const CATEGORIES = [
  'Hull', 'Propulsion', 'Navigation', 'Safety', 'Comfort',
  'Electronics', 'Deck Equipment', 'Interior', 'Exterior', 'Other',
];

export function EditConfigurationItemDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: EditConfigurationItemDialogProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [unitPriceExclVat, setUnitPriceExclVat] = useState(0);
  const [ceRelevant, setCeRelevant] = useState(false);
  const [safetyCritical, setSafetyCritical] = useState(false);
  const [isIncluded, setIsIncluded] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setCategory(item.category);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setUnitPriceExclVat(item.unitPriceExclVat);
      setCeRelevant(item.ceRelevant);
      setSafetyCritical(item.safetyCritical);
      setIsIncluded(item.isIncluded);
    }
  }, [item, open]);

  async function handleSave() {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const lineTotalExclVat = quantity * unitPriceExclVat;

      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        quantity,
        unit,
        unitPriceExclVat,
        lineTotalExclVat,
        ceRelevant,
        safetyCritical,
        isIncluded,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save:', error);
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

  const lineTotal = quantity * unitPriceExclVat;

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Edit Configuration Item
          </DialogTitle>
          <DialogDescription>
            Modify the equipment item details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Quantity & Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="set">set</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="m²">m2</SelectItem>
                  <SelectItem value="hrs">hrs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Price</Label>
              <Input
                type="number"
                min={0}
                step={10}
                value={unitPriceExclVat}
                onChange={(e) => setUnitPriceExclVat(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Line Total */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Line Total</span>
              <span className="text-lg font-bold">{formatCurrency(lineTotal)}</span>
            </div>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isIncluded"
                checked={isIncluded}
                onCheckedChange={(checked) => setIsIncluded(!!checked)}
              />
              <Label htmlFor="isIncluded" className="cursor-pointer">Include in Quote</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ceRelevant"
                checked={ceRelevant}
                onCheckedChange={(checked) => setCeRelevant(!!checked)}
              />
              <Label htmlFor="ceRelevant" className="cursor-pointer">CE Relevant</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="safetyCritical"
                checked={safetyCritical}
                onCheckedChange={(checked) => setSafetyCritical(!!checked)}
              />
              <Label htmlFor="safetyCritical" className="cursor-pointer">Safety Critical</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
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
