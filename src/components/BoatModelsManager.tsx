'use client';

import React, { useState } from 'react';
import {
  Ship,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Zap,
  Battery,
  Anchor,
  Ruler,
  Users,
  Weight,
  Euro,
  Image,
  Star,
  MoreHorizontal,
  Copy,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useStoreV2 } from '@/lib/store-v2';
import { formatEuroCurrency } from '@/lib/formatting';
import { BOAT_RANGES, type BoatRange, type PropulsionType, type CECategory, type Model } from '@/lib/types-v2';

const PROPULSION_OPTIONS: { value: PropulsionType; label: string; icon: React.ElementType }[] = [
  { value: 'Electric', label: 'Electric', icon: Zap },
  { value: 'Hybrid', label: 'Hybrid', icon: Battery },
  { value: 'Diesel', label: 'Diesel', icon: Anchor },
  { value: 'Outboard', label: 'Outboard', icon: Ship },
];

const CE_CATEGORIES: { value: CECategory; label: string; description: string }[] = [
  { value: 'A', label: 'A - Ocean', description: 'Wind force > 8, wave height > 4m' },
  { value: 'B', label: 'B - Offshore', description: 'Wind force ≤ 8, wave height ≤ 4m' },
  { value: 'C', label: 'C - Inshore', description: 'Wind force ≤ 6, wave height ≤ 2m' },
  { value: 'D', label: 'D - Sheltered', description: 'Wind force ≤ 4, wave height ≤ 0.3m' },
];

interface ModelFormData {
  name: string;
  range: BoatRange;
  tagline: string;
  description: string;
  length_m: number | undefined;
  beam_m: number | undefined;
  draft_m: number | undefined;
  weight_kg: number | undefined;
  max_persons: number | undefined;
  ce_category: CECategory | undefined;
  available_propulsion: PropulsionType[];
  default_propulsion: PropulsionType;
  base_price_excl_vat: number;
  highlights: string[];
  image_url: string;
  is_active: boolean;
}

const defaultFormData: ModelFormData = {
  name: '',
  range: 'TS',
  tagline: '',
  description: '',
  length_m: undefined,
  beam_m: undefined,
  draft_m: undefined,
  weight_kg: undefined,
  max_persons: undefined,
  ce_category: 'C',
  available_propulsion: ['Electric'],
  default_propulsion: 'Electric',
  base_price_excl_vat: 0,
  highlights: [],
  image_url: '',
  is_active: true,
};

export function BoatModelsManager() {
  const { models, addModel, updateModel, deleteModel } = useStoreV2();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRange, setFilterRange] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState<ModelFormData>(defaultFormData);
  const [highlightInput, setHighlightInput] = useState('');

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);

  // Filter models
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRange = filterRange === 'all' || model.range === filterRange;
    const matchesActive = showInactive || model.is_active;
    return matchesSearch && matchesRange && matchesActive;
  });

  // Stats
  const activeCount = models.filter(m => m.is_active).length;
  const totalCount = models.length;

  const handleAddNew = () => {
    setEditingModel(null);
    setFormData(defaultFormData);
    setHighlightInput('');
    setDialogOpen(true);
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      range: model.range,
      tagline: model.tagline || '',
      description: model.description || '',
      length_m: model.length_m,
      beam_m: model.beam_m,
      draft_m: model.draft_m,
      weight_kg: model.weight_kg,
      max_persons: model.max_persons,
      ce_category: model.ce_category,
      available_propulsion: model.available_propulsion,
      default_propulsion: model.default_propulsion,
      base_price_excl_vat: model.base_price_excl_vat,
      highlights: model.highlights || [],
      image_url: model.image_url || '',
      is_active: model.is_active,
    });
    setHighlightInput('');
    setDialogOpen(true);
  };

  const handleDuplicate = (model: Model) => {
    setEditingModel(null);
    setFormData({
      name: `${model.name} (Copy)`,
      range: model.range,
      tagline: model.tagline || '',
      description: model.description || '',
      length_m: model.length_m,
      beam_m: model.beam_m,
      draft_m: model.draft_m,
      weight_kg: model.weight_kg,
      max_persons: model.max_persons,
      ce_category: model.ce_category,
      available_propulsion: [...model.available_propulsion],
      default_propulsion: model.default_propulsion,
      base_price_excl_vat: model.base_price_excl_vat,
      highlights: [...(model.highlights || [])],
      image_url: model.image_url || '',
      is_active: true,
    });
    setHighlightInput('');
    setDialogOpen(true);
  };

  const handleDelete = (model: Model) => {
    setModelToDelete(model);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (modelToDelete) {
      deleteModel(modelToDelete.id);
      setDeleteDialogOpen(false);
      setModelToDelete(null);
    }
  };

  const handleSave = () => {
    if (!formData.name) return;

    const modelData = {
      name: formData.name,
      range: formData.range,
      tagline: formData.tagline || undefined,
      description: formData.description || undefined,
      length_m: formData.length_m,
      beam_m: formData.beam_m,
      draft_m: formData.draft_m,
      weight_kg: formData.weight_kg,
      max_persons: formData.max_persons,
      ce_category: formData.ce_category,
      available_propulsion: formData.available_propulsion,
      default_propulsion: formData.default_propulsion,
      base_price_excl_vat: formData.base_price_excl_vat,
      highlights: formData.highlights.length > 0 ? formData.highlights : undefined,
      image_url: formData.image_url || undefined,
      is_active: formData.is_active,
      is_default: false,
    };

    if (editingModel) {
      updateModel(editingModel.id, modelData);
    } else {
      addModel(modelData);
    }

    setDialogOpen(false);
    setEditingModel(null);
  };

  const handlePropulsionToggle = (propulsion: PropulsionType) => {
    setFormData(prev => {
      const current = prev.available_propulsion;
      const updated = current.includes(propulsion)
        ? current.filter(p => p !== propulsion)
        : [...current, propulsion];

      // Ensure at least one propulsion is selected
      if (updated.length === 0) return prev;

      // Update default if it's no longer available
      const newDefault = updated.includes(prev.default_propulsion)
        ? prev.default_propulsion
        : updated[0];

      return {
        ...prev,
        available_propulsion: updated,
        default_propulsion: newDefault,
      };
    });
  };

  const addHighlight = () => {
    if (highlightInput.trim()) {
      setFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, highlightInput.trim()],
      }));
      setHighlightInput('');
    }
  };

  const removeHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Boat Models</h1>
          <p className="text-slate-500 mt-1">
            Manage the Eagle Boats product lineup
          </p>
        </div>
        <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" />
          Add Model
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Models</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Inactive</p>
            <p className="text-2xl font-bold text-slate-400">{totalCount - activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Ranges</p>
            <p className="text-2xl font-bold">{new Set(models.map(m => m.range)).size}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterRange} onValueChange={setFilterRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Ranges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranges</SelectItem>
                {Object.entries(BOAT_RANGES).map(([key, range]) => (
                  <SelectItem key={key} value={key}>{range.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked === true)}
              />
              Show inactive
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map(model => (
          <Card key={model.id} className={`overflow-hidden ${!model.is_active ? 'opacity-60' : ''}`}>
            {/* Image */}
            <div className="relative h-40">
              {model.image_url ? (
                <img
                  src={model.image_url}
                  alt={model.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <Ship className="w-12 h-12 text-slate-300" />
                </div>
              )}

              {/* Status badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                {!model.is_active && (
                  <Badge variant="secondary" className="bg-slate-800 text-white">
                    Inactive
                  </Badge>
                )}
                {model.is_default && (
                  <Badge className="bg-amber-500">
                    <Star className="w-3 h-3 mr-1" />
                    Default
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(model)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(model)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(model)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Content */}
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{model.name}</h3>
                  <p className="text-sm text-slate-500">{model.tagline}</p>
                </div>
                <Badge variant="outline">{BOAT_RANGES[model.range]?.name || model.range}</Badge>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div className="text-center p-2 bg-slate-50 rounded">
                  <Ruler className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="font-medium">{model.length_m || '—'}m</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <Users className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="font-medium">{model.max_persons || '—'}</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <Anchor className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <p className="font-medium">CE-{model.ce_category || '—'}</p>
                </div>
              </div>

              {/* Propulsion */}
              <div className="flex gap-1 mt-3">
                {model.available_propulsion.map(prop => (
                  <Badge key={prop} variant="secondary" className="text-xs">
                    {prop === 'Electric' && <Zap className="w-3 h-3 mr-1 text-emerald-500" />}
                    {prop === 'Hybrid' && <Battery className="w-3 h-3 mr-1 text-blue-500" />}
                    {prop}
                  </Badge>
                ))}
              </div>

              {/* Price */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <span className="text-sm text-slate-500">Base price</span>
                <span className="font-bold text-emerald-600">
                  {formatEuroCurrency(model.base_price_excl_vat)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Ship className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No models found</p>
            <Button onClick={handleAddNew} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-1" />
              Add First Model
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? 'Edit Boat Model' : 'Add Boat Model'}
            </DialogTitle>
            <DialogDescription>
              {editingModel
                ? 'Update the boat model specifications'
                : 'Create a new boat model for the Eagle Boats lineup'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-slate-700">Basic Information</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label>Model Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Eagle 28TS"
                    className="mt-1"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Range</Label>
                  <Select
                    value={formData.range}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, range: v as BoatRange }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BOAT_RANGES).map(([key, range]) => (
                        <SelectItem key={key} value={key}>{range.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Tagline</Label>
                  <Input
                    value={formData.tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="e.g., Premium comfort"
                    className="mt-1"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the boat model..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-slate-700">Specifications</h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Length (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.length_m || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, length_m: parseFloat(e.target.value) || undefined }))}
                    placeholder="8.50"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Beam (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.beam_m || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, beam_m: parseFloat(e.target.value) || undefined }))}
                    placeholder="2.80"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Draft (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.draft_m || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, draft_m: parseFloat(e.target.value) || undefined }))}
                    placeholder="0.55"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={formData.weight_kg || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: parseInt(e.target.value) || undefined }))}
                    placeholder="2800"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max Persons</Label>
                  <Input
                    type="number"
                    value={formData.max_persons || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_persons: parseInt(e.target.value) || undefined }))}
                    placeholder="10"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>CE Category</Label>
                  <Select
                    value={formData.ce_category}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, ce_category: v as CECategory }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Base Price (excl. VAT)</Label>
                  <Input
                    type="number"
                    step="1000"
                    value={formData.base_price_excl_vat || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_price_excl_vat: parseFloat(e.target.value) || 0 }))}
                    placeholder="125000"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Propulsion */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-slate-700">Propulsion Options</h4>

              <div className="flex flex-wrap gap-3">
                {PROPULSION_OPTIONS.map(option => {
                  const Icon = option.icon;
                  const isSelected = formData.available_propulsion.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handlePropulsionToggle(option.value)}
                      />
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </label>
                  );
                })}
              </div>

              {formData.available_propulsion.length > 1 && (
                <div>
                  <Label>Default Propulsion</Label>
                  <Select
                    value={formData.default_propulsion}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, default_propulsion: v as PropulsionType }))}
                  >
                    <SelectTrigger className="mt-1 w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.available_propulsion.map(prop => (
                        <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Image & Highlights */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-slate-700">Image & Highlights</h4>

              <div>
                <Label>Image URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
                {formData.image_url && (
                  <div className="mt-2 h-24 w-40 rounded overflow-hidden border">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Highlights</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    placeholder="e.g., Award-winning design"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                  />
                  <Button type="button" variant="outline" onClick={addHighlight}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.highlights.map((h, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {h}
                        <button
                          type="button"
                          onClick={() => removeHighlight(i)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-slate-500">Model is available for new builds</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {editingModel ? 'Save Changes' : 'Add Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{modelToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BoatModelsManager;
