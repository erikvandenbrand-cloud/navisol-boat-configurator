'use client';

import { useState, useEffect } from 'react';
import { Ship, Save, Plus, Trash2, Package, Layers } from 'lucide-react';
import type {
  BoatModel,
  BoatModelVersion,
  CreateBoatModelInput,
  CreateBoatModelVersionInput,
  DefaultConfigurationItem,
} from '@/domain/services/BoatModelService';
import { generateUUID } from '@/domain/models';
import { LibraryItemPicker, type PickedItem } from './LibraryItemPicker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BoatModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: BoatModel | null; // null = create new
  currentVersion: BoatModelVersion | null;
  mode: 'create' | 'edit' | 'new-version';
  onSave: (input: CreateBoatModelInput) => Promise<void>;
  onUpdate?: (updates: Partial<BoatModel>) => Promise<void>;
  onCreateVersion?: (input: CreateBoatModelVersionInput) => Promise<void>;
}

const RANGES = ['Sport', 'Touring', 'Cruiser', 'Grand Touring', 'Commercial'];
const CE_CATEGORIES = ['A', 'B', 'C', 'D'];

export function BoatModelDialog({
  open,
  onOpenChange,
  model,
  currentVersion,
  mode,
  onSave,
  onUpdate,
  onCreateVersion,
}: BoatModelDialogProps) {
  // Form state
  const [name, setName] = useState('');
  const [range, setRange] = useState('Sport');
  const [description, setDescription] = useState('');
  const [lengthM, setLengthM] = useState(8);
  const [beamM, setBeamM] = useState(2.5);
  const [draftM, setDraftM] = useState<number | undefined>();
  const [maxPassengers, setMaxPassengers] = useState<number | undefined>();
  const [ceCategory, setCeCategory] = useState<'A' | 'B' | 'C' | 'D'>('C');
  const [basePrice, setBasePrice] = useState(50000);
  const [versionLabel, setVersionLabel] = useState('1.0.0');

  // Default configuration items
  const [defaultItems, setDefaultItems] = useState<DefaultConfigurationItem[]>([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (model && currentVersion) {
      setName(model.name);
      setRange(model.range);
      setDescription(model.description || '');
      setLengthM(currentVersion.lengthM);
      setBeamM(currentVersion.beamM);
      setDraftM(currentVersion.draftM);
      setMaxPassengers(currentVersion.maxPassengers);
      setCeCategory(currentVersion.ceCategory || 'C');
      setBasePrice(currentVersion.basePrice);
      setDefaultItems(currentVersion.defaultConfigurationItems || []);

      // For new version, increment version number
      if (mode === 'new-version') {
        const parts = currentVersion.versionLabel.split('.');
        const minor = parseInt(parts[1] || '0') + 1;
        setVersionLabel(`${parts[0]}.${minor}.0`);
      } else {
        setVersionLabel(currentVersion.versionLabel);
      }
    } else {
      // Reset for create
      setName('');
      setRange('Sport');
      setDescription('');
      setLengthM(8);
      setBeamM(2.5);
      setDraftM(undefined);
      setMaxPassengers(undefined);
      setCeCategory('C');
      setBasePrice(50000);
      setVersionLabel('1.0.0');
      setDefaultItems([]);
    }
  }, [model, currentVersion, mode, open]);

  function handleItemPicked(picked: PickedItem) {
    const newItem: DefaultConfigurationItem = {
      id: generateUUID(),
      itemType: picked.type,
      articleId: picked.type === 'ARTICLE' ? picked.id : undefined,
      articleVersionId: picked.type === 'ARTICLE' ? picked.versionId : undefined,
      kitId: picked.type === 'KIT' ? picked.id : undefined,
      kitVersionId: picked.type === 'KIT' ? picked.versionId : undefined,
      category: picked.category,
      subcategory: picked.subcategory,
      articleNumber: picked.code,
      name: picked.name,
      quantity: 1,
      unit: picked.unit,
      unitPriceExclVat: picked.sellPrice,
      isIncluded: true,
      ceRelevant: picked.tags?.includes('CE_CRITICAL') || false,
      safetyCritical: picked.tags?.includes('SAFETY_CRITICAL') || false,
      sortOrder: defaultItems.length,
    };
    setDefaultItems([...defaultItems, newItem]);
  }

  function handleRemoveItem(itemId: string) {
    setDefaultItems(defaultItems.filter(item => item.id !== itemId));
  }

  function handleUpdateQuantity(itemId: string, quantity: number) {
    setDefaultItems(defaultItems.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'create') {
        await onSave({
          name: name.trim(),
          range,
          description: description.trim() || undefined,
          lengthM,
          beamM,
          draftM,
          maxPassengers,
          ceCategory,
          basePrice,
          defaultConfigurationItems: defaultItems,
        });
      } else if (mode === 'edit' && onUpdate) {
        await onUpdate({
          name: name.trim(),
          range,
          description: description.trim() || undefined,
        });
      } else if (mode === 'new-version' && onCreateVersion) {
        await onCreateVersion({
          versionLabel,
          lengthM,
          beamM,
          draftM,
          maxPassengers,
          ceCategory,
          basePrice,
          defaultConfigurationItems: defaultItems,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const title = mode === 'create'
    ? 'Create New Boat Model'
    : mode === 'edit'
      ? `Edit ${model?.name}`
      : `New Version for ${model?.name}`;

  const description_text = mode === 'create'
    ? 'Add a new boat model to the library with default configuration'
    : mode === 'edit'
      ? 'Update boat model information'
      : 'Create a new version with updated specifications and defaults';

  // Calculate total of default items
  const defaultItemsTotal = defaultItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceExclVat,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description_text}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info - always shown for create/edit */}
          {(mode === 'create' || mode === 'edit') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Model Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eagle 32"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Range</Label>
                  <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RANGES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the model..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Version info - shown for new-version mode */}
          {mode === 'new-version' && (
            <div>
              <Label>Version Label *</Label>
              <Input
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="e.g. 2.0.0"
                className="mt-1"
              />
            </div>
          )}

          {/* Specifications - shown for create and new-version */}
          {(mode === 'create' || mode === 'new-version') && (
            <>
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-slate-500">Specifications</Label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Length (m) *</Label>
                  <Input
                    type="number"
                    step={0.1}
                    min={3}
                    max={30}
                    value={lengthM}
                    onChange={(e) => setLengthM(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Beam (m) *</Label>
                  <Input
                    type="number"
                    step={0.1}
                    min={1}
                    max={10}
                    value={beamM}
                    onChange={(e) => setBeamM(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Draft (m)</Label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={5}
                    value={draftM ?? ''}
                    onChange={(e) => setDraftM(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Passengers</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxPassengers ?? ''}
                    onChange={(e) => setMaxPassengers(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>CE Category</Label>
                  <Select value={ceCategory} onValueChange={(v) => setCeCategory(v as 'A' | 'B' | 'C' | 'D')}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          Category {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Base Price (excl. VAT) *</Label>
                <Input
                  type="number"
                  step={1000}
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              {/* Default Configuration Items Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-medium text-slate-500">Default Configuration</Label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Items added here will be automatically included in NEW_BUILD projects
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLibraryPicker(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {defaultItems.length === 0 ? (
                  <div className="p-6 border-2 border-dashed rounded-lg text-center text-slate-500">
                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">No default items configured</p>
                    <p className="text-xs mt-1">
                      Add articles or kits from the library as default equipment
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-24 text-right">Qty</TableHead>
                          <TableHead className="w-28 text-right">Unit Price</TableHead>
                          <TableHead className="w-28 text-right">Total</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {defaultItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.itemType === 'KIT' ? (
                                  <Layers className="h-4 w-4 text-teal-600" />
                                ) : (
                                  <Package className="h-4 w-4 text-slate-400" />
                                )}
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {item.category}
                                    {item.articleNumber && ` • ${item.articleNumber}`}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-16 text-right h-7 px-2"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              €{item.unitPriceExclVat.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              €{(item.quantity * item.unitPriceExclVat).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={3} className="font-medium text-right">
                            Default Equipment Total:
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            €{defaultItemsTotal.toLocaleString()}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {defaultItems.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2 text-right">
                    Total with base: €{(basePrice + defaultItemsTotal).toLocaleString()} excl. VAT
                  </p>
                )}
              </div>
            </>
          )}
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
            {mode === 'create' ? 'Create Model' : mode === 'edit' ? 'Save Changes' : 'Create Version'}
          </Button>
        </DialogFooter>

        {/* Library Item Picker */}
        <LibraryItemPicker
          open={showLibraryPicker}
          onOpenChange={setShowLibraryPicker}
          onPick={handleItemPicked}
        />
      </DialogContent>
    </Dialog>
  );
}
