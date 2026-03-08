'use client';

import { useState, useEffect } from 'react';
import { Package, Save } from 'lucide-react';
import type { EquipmentCatalogItem, CreateEquipmentItemInput } from '@/domain/services/EquipmentCatalogService';
import { EQUIPMENT_CATEGORIES } from '@/domain/services/EquipmentCatalogService';
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

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EquipmentCatalogItem | null; // null = create new
  onSave: (input: CreateEquipmentItemInput) => Promise<void>;
  onUpdate?: (updates: Partial<EquipmentCatalogItem>) => Promise<void>;
}

export function EquipmentDialog({
  open,
  onOpenChange,
  item,
  onSave,
  onUpdate,
}: EquipmentDialogProps) {
  const isEdit = item !== null;

  // Form state
  const [articleNumber, setArticleNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [listPriceExclVat, setListPriceExclVat] = useState(0);
  const [costPrice, setCostPrice] = useState<number | undefined>();
  const [supplier, setSupplier] = useState('');
  const [supplierArticleNumber, setSupplierArticleNumber] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState<number | undefined>();
  const [ceRelevant, setCeRelevant] = useState(false);
  const [safetyCritical, setSafetyCritical] = useState(false);
  const [unit, setUnit] = useState('pcs');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setArticleNumber(item.articleNumber);
      setName(item.name);
      setDescription(item.description || '');
      setCategory(item.category);
      setListPriceExclVat(item.listPriceExclVat);
      setCostPrice(item.costPrice);
      setSupplier(item.supplier || '');
      setSupplierArticleNumber(item.supplierArticleNumber || '');
      setLeadTimeDays(item.leadTimeDays);
      setCeRelevant(item.ceRelevant);
      setSafetyCritical(item.safetyCritical);
      setUnit(item.unit);
    } else {
      // Reset for create
      setArticleNumber('');
      setName('');
      setDescription('');
      setCategory('Other');
      setListPriceExclVat(0);
      setCostPrice(undefined);
      setSupplier('');
      setSupplierArticleNumber('');
      setLeadTimeDays(undefined);
      setCeRelevant(false);
      setSafetyCritical(false);
      setUnit('pcs');
    }
  }, [item, open]);

  async function handleSave() {
    if (!articleNumber.trim() || !name.trim()) {
      alert('Article number and name are required');
      return;
    }

    setIsLoading(true);
    try {
      const input: CreateEquipmentItemInput = {
        articleNumber: articleNumber.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        listPriceExclVat,
        costPrice,
        supplier: supplier.trim() || undefined,
        supplierArticleNumber: supplierArticleNumber.trim() || undefined,
        leadTimeDays,
        ceRelevant,
        safetyCritical,
        unit,
      };

      if (isEdit && onUpdate) {
        await onUpdate(input);
      } else {
        await onSave(input);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate margin if cost price is set
  const margin = costPrice && listPriceExclVat > 0
    ? Math.round(((listPriceExclVat - costPrice) / listPriceExclVat) * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            {isEdit ? 'Edit Equipment Item' : 'Add Equipment Item'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update equipment catalog item' : 'Add a new item to the equipment catalog'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Article Number *</Label>
              <Input
                value={articleNumber}
                onChange={(e) => setArticleNumber(e.target.value)}
                placeholder="e.g. EM-40"
                className="mt-1"
                disabled={isEdit} // Can't change article number on edit
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Equipment name"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Pricing */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-slate-500">Pricing</Label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>List Price *</Label>
              <Input
                type="number"
                step={10}
                min={0}
                value={listPriceExclVat}
                onChange={(e) => setListPriceExclVat(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cost Price</Label>
              <Input
                type="number"
                step={10}
                min={0}
                value={costPrice ?? ''}
                onChange={(e) => setCostPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {margin !== null && (
            <p className={`text-sm ${margin >= 30 ? 'text-green-600' : margin >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
              Margin: {margin}%
            </p>
          )}

          {/* Supplier */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-slate-500">Supplier Info</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Supplier</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Lead Time (days)</Label>
              <Input
                type="number"
                min={0}
                value={leadTimeDays ?? ''}
                onChange={(e) => setLeadTimeDays(e.target.value ? parseInt(e.target.value) : undefined)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Supplier Article #</Label>
            <Input
              value={supplierArticleNumber}
              onChange={(e) => setSupplierArticleNumber(e.target.value)}
              placeholder="Supplier's article number"
              className="mt-1"
            />
          </div>

          {/* Flags */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-slate-500">Flags</Label>
          </div>

          <div className="flex items-center gap-6">
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
            disabled={isLoading || !articleNumber.trim() || !name.trim()}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
