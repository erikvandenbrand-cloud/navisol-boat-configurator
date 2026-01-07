'use client';

import React, { useState, useMemo } from 'react';
import {
  Ship,
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Euro,
  Copy,
  Settings2,
  Filter,
  Save,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useStoreV2 } from '@/lib/store-v2';
import { formatEuroCurrency } from '@/lib/formatting';
import {
  EQUIPMENT_TEMPLATES,
  EQUIPMENT_CATEGORIES,
  type EquipmentTemplate,
  type EquipmentTemplateItem,
} from '@/lib/equipment-templates';

// Local state for editing (since templates are currently static)
// In a real app, these would be persisted to a database

export function EquipmentTemplatesManager() {
  const { models } = useStoreV2();
  const activeModels = models.filter(m => m.is_active);

  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'standard' | 'optional'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentTemplateItem | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Form state for editing/adding
  const [formData, setFormData] = useState<Partial<EquipmentTemplateItem>>({});

  // Get template for selected model
  const selectedTemplate = useMemo(() => {
    return EQUIPMENT_TEMPLATES.find(t => t.modelId === selectedModelId);
  }, [selectedModelId]);

  const selectedModel = activeModels.find(m => m.id === selectedModelId);

  // Filter and group items
  const filteredItems = useMemo(() => {
    if (!selectedTemplate) return [];

    return selectedTemplate.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchesType = filterType === 'all' ||
        (filterType === 'standard' && item.isStandard) ||
        (filterType === 'optional' && item.isOptional);
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [selectedTemplate, searchQuery, filterCategory, filterType]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, EquipmentTemplateItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Stats
  const stats = useMemo(() => {
    if (!selectedTemplate) return { total: 0, standard: 0, optional: 0, totalValue: 0 };
    const items = selectedTemplate.items;
    return {
      total: items.length,
      standard: items.filter(i => i.isStandard).length,
      optional: items.filter(i => i.isOptional).length,
      totalValue: items.filter(i => i.isOptional).reduce((sum, i) => sum + i.price, 0),
    };
  }, [selectedTemplate]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleEditItem = (item: EquipmentTemplateItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setEditDialogOpen(true);
  };

  const handleAddItem = () => {
    setFormData({
      category: EQUIPMENT_CATEGORIES[0],
      name: '',
      description: '',
      isStandard: false,
      isOptional: true,
      price: 0,
      unit: 'pcs',
      qty: 1,
    });
    setAddDialogOpen(true);
  };

  const handleSaveEdit = () => {
    // In a real app, this would update the database
    console.log('Saving item:', formData);
    setEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleSaveNew = () => {
    // In a real app, this would add to the database
    console.log('Adding new item:', formData);
    setAddDialogOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    // In a real app, this would delete from the database
    console.log('Deleting item:', itemId);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipment Templates</h1>
          <p className="text-slate-500 mt-1">
            Manage standard and optional equipment for each Eagle Boats model
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Package className="w-3 h-3" />
          {EQUIPMENT_TEMPLATES.length} Templates
        </Badge>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Model</CardTitle>
          <CardDescription>Choose a boat model to view and edit its equipment template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {activeModels.map(model => {
              const template = EQUIPMENT_TEMPLATES.find(t => t.modelId === model.id);
              const itemCount = template?.items.length || 0;
              const isSelected = selectedModelId === model.id;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModelId(model.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Ship className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="font-medium text-sm truncate">{model.name}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {itemCount} items
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Template Content */}
      {selectedModelId && selectedTemplate ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Total Items</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Standard</p>
                <p className="text-2xl font-bold text-blue-600">{stats.standard}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Optional</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.optional}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Options Value</p>
                <p className="text-2xl font-bold text-orange-600">{formatEuroCurrency(stats.totalValue)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search equipment..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EQUIPMENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Equipment List by Category */}
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, items]) => (
              <Card key={category}>
                <Collapsible
                  open={expandedCategories[category] !== false}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedCategories[category] === false ? (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                          <CardTitle className="text-base">{category}</CardTitle>
                          <Badge variant="secondary">{items.length}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{items.filter(i => i.isStandard).length} standard</span>
                          <span>•</span>
                          <span>{items.filter(i => i.isOptional).length} optional</span>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[300px]">Item</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead className="w-[80px] text-center">Qty</TableHead>
                            <TableHead className="w-[80px]">Unit</TableHead>
                            <TableHead className="w-[120px] text-right">Price</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  {item.description && (
                                    <p className="text-xs text-slate-500">{item.description}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.isStandard ? (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                    Standard
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                                    Optional
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">{item.qty}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell className="text-right">
                                {item.isOptional && item.price > 0 ? (
                                  <span className="font-medium text-emerald-600">
                                    +{formatEuroCurrency(item.price)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditItem(item)}
                                  >
                                    <Pencil className="w-4 h-4 text-slate-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-slate-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No equipment items found</p>
                <p className="text-sm text-slate-400">Try adjusting your filters</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Ship className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">Select a Model</h3>
            <p className="text-slate-500">
              Choose a boat model above to view and edit its equipment template
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Equipment Item</DialogTitle>
            <DialogDescription>
              Modify the equipment item details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.qty || 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Price (if optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.price || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Standard Equipment</Label>
                    <p className="text-xs text-slate-500">Included in base price</p>
                  </div>
                  <Switch
                    checked={formData.isStandard || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      isStandard: checked,
                      isOptional: !checked,
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Equipment Item</DialogTitle>
            <DialogDescription>
              Add a new equipment item to {selectedModel?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., GPS Chartplotter 12&quot;"
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Unit</Label>
                <Select
                  value={formData.unit || 'pcs'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.qty || 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Price (if optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.price || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Standard Equipment</Label>
                    <p className="text-xs text-slate-500">Included in base price (otherwise optional)</p>
                  </div>
                  <Switch
                    checked={formData.isStandard || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      isStandard: checked,
                      isOptional: !checked,
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNew}
              disabled={!formData.name}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EquipmentTemplatesManager;
