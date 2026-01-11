'use client';

import { useState } from 'react';
import { Plus, Package, Search, Database, AlertTriangle } from 'lucide-react';
import type { AddConfigurationItemInput } from '@/domain/models';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LibraryItemPicker, type PickedItem } from './LibraryItemPicker';

interface AddConfigurationItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: AddConfigurationItemInput) => Promise<void>;
}

const CATEGORIES = [
  'Hull',
  'Propulsion',
  'Navigation',
  'Safety',
  'Comfort',
  'Electronics',
  'Deck Equipment',
  'Interior',
  'Exterior',
  'Other',
];

const UNITS = ['pcs', 'set', 'm', 'm²', 'kg', 'l', 'hrs'];

// Sample catalog items for quick selection
const CATALOG_ITEMS = [
  { category: 'Propulsion', name: 'Electric Motor 20kW', price: 18000, unit: 'set', ce: true, safety: true },
  { category: 'Propulsion', name: 'Electric Motor 40kW', price: 35000, unit: 'set', ce: true, safety: true },
  { category: 'Propulsion', name: 'Battery Pack 40kWh', price: 25000, unit: 'set', ce: true, safety: true },
  { category: 'Propulsion', name: 'Battery Pack 80kWh', price: 45000, unit: 'set', ce: true, safety: true },
  { category: 'Propulsion', name: 'Shore Power Charger 22kW', price: 4500, unit: 'pcs', ce: true },
  { category: 'Navigation', name: 'Raymarine Axiom+ 9" Display', price: 2800, unit: 'pcs' },
  { category: 'Navigation', name: 'Raymarine Axiom+ 12" Display', price: 4200, unit: 'pcs' },
  { category: 'Navigation', name: 'VHF Radio with AIS', price: 1200, unit: 'pcs', ce: true },
  { category: 'Navigation', name: 'Autopilot System', price: 3500, unit: 'set' },
  { category: 'Navigation', name: 'Radar 4kW', price: 2800, unit: 'pcs' },
  { category: 'Safety', name: 'Life Jacket Set (4 pcs)', price: 480, unit: 'set', ce: true, safety: true },
  { category: 'Safety', name: 'Fire Extinguisher 2kg', price: 85, unit: 'pcs', ce: true, safety: true },
  { category: 'Safety', name: 'First Aid Kit', price: 120, unit: 'pcs', ce: true },
  { category: 'Safety', name: 'Bilge Pump Automatic', price: 280, unit: 'pcs', ce: true, safety: true },
  { category: 'Safety', name: 'Navigation Lights LED Set', price: 650, unit: 'set', ce: true },
  { category: 'Comfort', name: 'Luxury Interior Package', price: 22000, unit: 'set' },
  { category: 'Comfort', name: 'Heating System 5kW', price: 3800, unit: 'set' },
  { category: 'Comfort', name: 'Air Conditioning 12000 BTU', price: 4500, unit: 'pcs' },
  { category: 'Comfort', name: 'Refrigerator 85L', price: 1200, unit: 'pcs' },
  { category: 'Comfort', name: 'Freshwater System 100L', price: 1800, unit: 'set' },
  { category: 'Deck Equipment', name: 'Electric Anchor Winch', price: 2200, unit: 'pcs' },
  { category: 'Deck Equipment', name: 'Stainless Steel Cleats (set of 6)', price: 480, unit: 'set' },
  { category: 'Deck Equipment', name: 'Teak Deck Finishing', price: 8500, unit: 'm²' },
  { category: 'Deck Equipment', name: 'Swimming Platform', price: 3200, unit: 'pcs' },
  { category: 'Electronics', name: 'USB Charging Points (4x)', price: 320, unit: 'set' },
  { category: 'Electronics', name: 'LED Interior Lighting Package', price: 1800, unit: 'set' },
  { category: 'Electronics', name: 'Bluetooth Audio System', price: 1200, unit: 'set' },
];

export function AddConfigurationItemDialog({
  open,
  onOpenChange,
  onAdd,
}: AddConfigurationItemDialogProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'catalog' | 'custom'>('library');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  // Legacy catalog confirmation
  const [pendingLegacyItem, setPendingLegacyItem] = useState<typeof CATALOG_ITEMS[0] | null>(null);
  const [showLegacyConfirm, setShowLegacyConfirm] = useState(false);

  // Custom item form state
  const [customItem, setCustomItem] = useState({
    category: '',
    name: '',
    description: '',
    quantity: 1,
    unit: 'pcs',
    unitPriceExclVat: 0,
    ceRelevant: false,
    safetyCritical: false,
  });

  function resetForm() {
    setCustomItem({
      category: '',
      name: '',
      description: '',
      quantity: 1,
      unit: 'pcs',
      unitPriceExclVat: 0,
      ceRelevant: false,
      safetyCritical: false,
    });
    setSearchQuery('');
    setSelectedCategory('all');
  }

  function handleRequestAddLegacyItem(item: typeof CATALOG_ITEMS[0]) {
    // Show confirmation dialog before adding legacy items
    setPendingLegacyItem(item);
    setShowLegacyConfirm(true);
  }

  async function handleConfirmAddLegacyItem() {
    if (!pendingLegacyItem) return;

    setIsLoading(true);
    try {
      await onAdd({
        itemType: 'LEGACY', // Mark as legacy catalog item
        isCustom: false,
        catalogItemId: `catalog-${pendingLegacyItem.name.toLowerCase().replace(/\s+/g, '-')}`,
        category: pendingLegacyItem.category,
        name: pendingLegacyItem.name,
        quantity: 1,
        unit: pendingLegacyItem.unit,
        unitPriceExclVat: pendingLegacyItem.price,
        ceRelevant: pendingLegacyItem.ce || false,
        safetyCritical: pendingLegacyItem.safety || false,
      });
      setShowLegacyConfirm(false);
      setPendingLegacyItem(null);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancelLegacyItem() {
    setShowLegacyConfirm(false);
    setPendingLegacyItem(null);
  }

  async function handleAddCustomItem() {
    if (!customItem.name || !customItem.category) return;

    setIsLoading(true);
    try {
      await onAdd({
        itemType: 'CUSTOM',
        isCustom: true,
        category: customItem.category,
        name: customItem.name,
        description: customItem.description || undefined,
        quantity: customItem.quantity,
        unit: customItem.unit,
        unitPriceExclVat: customItem.unitPriceExclVat,
        ceRelevant: customItem.ceRelevant,
        safetyCritical: customItem.safetyCritical,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCatalogItems = CATALOG_ITEMS.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
    }
    return true;
  });

  const catalogCategories = [...new Set(CATALOG_ITEMS.map((item) => item.category))];

  async function handleLibraryItemPicked(item: PickedItem) {
    setIsLoading(true);
    try {
      await onAdd({
        itemType: item.type, // ARTICLE or KIT from Library v4
        isCustom: false,
        // Set appropriate IDs based on item type
        articleId: item.type === 'ARTICLE' ? item.id : undefined,
        articleVersionId: item.type === 'ARTICLE' ? item.versionId : undefined,
        kitId: item.type === 'KIT' ? item.id : undefined,
        kitVersionId: item.type === 'KIT' ? item.versionId : undefined,
        category: item.category,
        subcategory: item.subcategory,
        articleNumber: item.code,
        name: item.name,
        quantity: 1,
        unit: item.unit,
        unitPriceExclVat: item.sellPrice,
        ceRelevant: item.tags?.includes('CE_CRITICAL') || false,
        safetyCritical: item.tags?.includes('SAFETY_CRITICAL') || false,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Add Equipment Item
          </DialogTitle>
          <DialogDescription>
            Select from the catalog or add a custom item
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'catalog' | 'custom')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="gap-2">
              <Database className="h-4 w-4" />
              From Library
            </TabsTrigger>
            <TabsTrigger value="catalog">Legacy Catalog</TabsTrigger>
            <TabsTrigger value="custom">Custom Item</TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 overflow-hidden flex flex-col items-center justify-center mt-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Add from Library</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                Select versioned articles or kits from the library. Projects pin to specific versions for consistency.
              </p>
              <Button onClick={() => setShowLibraryPicker(true)} className="bg-teal-600 hover:bg-teal-700">
                <Package className="h-4 w-4 mr-2" />
                Browse Library
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* Deprecation Warning */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Legacy Catalog (Deprecated)</p>
                  <p className="text-xs text-amber-700">
                    Use "From Library" for new items. Legacy items lack versioning and BOM support.
                  </p>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {catalogCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Catalog Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredCatalogItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No items found
                </div>
              ) : (
                filteredCatalogItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg flex items-center justify-between hover:border-teal-300 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{item.category}</span>
                        {item.ce && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">CE</span>}
                        {item.safety && <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded">Safety</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">€{item.price.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">per {item.unit}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestAddLegacyItem(item)}
                        disabled={isLoading}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={customItem.category}
                    onValueChange={(v) => setCustomItem({ ...customItem, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={customItem.unit}
                    onValueChange={(v) => setCustomItem({ ...customItem, unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Item Name *</Label>
                <Input
                  value={customItem.name}
                  onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                  placeholder="e.g. Custom Navigation Display"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={customItem.description}
                  onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customItem.quantity}
                    onChange={(e) => setCustomItem({ ...customItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Unit Price (excl. VAT)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={customItem.unitPriceExclVat}
                    onChange={(e) => setCustomItem({ ...customItem, unitPriceExclVat: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ceRelevant"
                    checked={customItem.ceRelevant}
                    onCheckedChange={(checked) => setCustomItem({ ...customItem, ceRelevant: !!checked })}
                  />
                  <Label htmlFor="ceRelevant" className="text-sm font-normal">CE Relevant</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="safetyCritical"
                    checked={customItem.safetyCritical}
                    onCheckedChange={(checked) => setCustomItem({ ...customItem, safetyCritical: !!checked })}
                  />
                  <Label htmlFor="safetyCritical" className="text-sm font-normal">Safety Critical</Label>
                </div>
              </div>

              {/* Preview */}
              {customItem.name && customItem.unitPriceExclVat > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Line Total</p>
                  <p className="text-xl font-bold">
                    €{(customItem.quantity * customItem.unitPriceExclVat).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomItem}
                disabled={!customItem.name || !customItem.category || isLoading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Add Item
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>

        {/* Library Item Picker */}
        <LibraryItemPicker
          open={showLibraryPicker}
          onOpenChange={setShowLibraryPicker}
          onPick={handleLibraryItemPicked}
        />

        {/* Legacy Item Confirmation Dialog */}
        <Dialog open={showLegacyConfirm} onOpenChange={setShowLegacyConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Add Legacy Item?
              </DialogTitle>
              <DialogDescription>
                You are about to add a legacy catalog item to this project.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {pendingLegacyItem && (
                <div className="p-3 bg-slate-50 rounded-lg mb-4">
                  <p className="font-medium">{pendingLegacyItem.name}</p>
                  <p className="text-sm text-slate-500">
                    {pendingLegacyItem.category} - €{pendingLegacyItem.price.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">Legacy items have limitations:</p>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>No version tracking - updates not captured</li>
                  <li>BOM costs are estimated at 60%</li>
                  <li>Cannot track supplier or lead times</li>
                  <li>Consider migrating to Library articles</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelLegacyItem}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleCancelLegacyItem();
                  setActiveTab('library');
                }}
                className="text-teal-600 border-teal-300 hover:bg-teal-50"
              >
                Use Library Instead
              </Button>
              <Button
                onClick={handleConfirmAddLegacyItem}
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Add Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
