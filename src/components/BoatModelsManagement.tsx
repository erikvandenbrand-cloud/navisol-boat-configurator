'use client';

import { useState } from 'react';
import {
  Plus, Search, Ship, Edit, Trash2, Copy, MoreHorizontal,
  Check, X, Anchor, Ruler, Users, DollarSign, Zap, Settings2
} from 'lucide-react';
import { useBoatModels } from '@/lib/boat-models-store';
import type { Article } from '@/lib/types';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { BoatModelDefinition, PropulsionType } from '@/lib/types';

const PROPULSION_TYPES: PropulsionType[] = ['Electric', 'Diesel', 'Hybrid', 'Outboard'];
const CE_CATEGORIES = ['A', 'B', 'C', 'D'] as const;

export function BoatModelsManagement() {
  const { models, addModel, updateModel, deleteModel, duplicateModel, isLoading } = useBoatModels();
  const { articles } = useNavisol();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<BoatModelDefinition | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Filter models
  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle duplicate
  const handleDuplicate = () => {
    if (duplicatingId && duplicateName.trim()) {
      duplicateModel(duplicatingId, duplicateName.trim());
      setDuplicatingId(null);
      setDuplicateName('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-500">Loading boat models...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Boat Models</h1>
          <p className="text-slate-600">Create and manage your boat models</p>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Model
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search boat models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">{models.length}</div>
                <div className="text-xs text-slate-600">Total Models</div>
              </div>
              <Ship className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {models.filter(m => m.is_active).length}
                </div>
                <div className="text-xs text-slate-600">Active</div>
              </div>
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {models.filter(m => m.is_default).length}
                </div>
                <div className="text-xs text-slate-600">Built-in</div>
              </div>
              <Anchor className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {models.filter(m => !m.is_default).length}
                </div>
                <div className="text-xs text-slate-600">Custom</div>
              </div>
              <Settings2 className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id} className={`hover:shadow-md transition-shadow ${!model.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${model.is_default ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                    <Ship className={`h-6 w-6 ${model.is_default ? 'text-blue-600' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {model.name}
                      {model.is_default && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Built-in</Badge>
                      )}
                    </CardTitle>
                    {!model.is_active && (
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600">Inactive</Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingModel(model)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setDuplicatingId(model.id);
                      setDuplicateName(`${model.name} (Copy)`);
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateModel(model.id, { is_active: !model.is_active })}>
                      {model.is_active ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    {!model.is_default && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteModel(model.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {model.description && (
                <CardDescription className="mt-2 line-clamp-2">{model.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Price */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Base Price</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatEuroCurrency(model.base_price_excl_vat)}
                  </span>
                </div>

                {/* Specifications */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {model.length_m && (
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-500">Length</div>
                      <div className="font-medium text-sm">{model.length_m}m</div>
                    </div>
                  )}
                  {model.beam_m && (
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-500">Beam</div>
                      <div className="font-medium text-sm">{model.beam_m}m</div>
                    </div>
                  )}
                  {model.max_persons && (
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-500">Persons</div>
                      <div className="font-medium text-sm">{model.max_persons}</div>
                    </div>
                  )}
                </div>

                {/* Propulsion types */}
                <div className="flex flex-wrap gap-1">
                  {model.available_propulsion.map(p => (
                    <Badge
                      key={p}
                      variant="outline"
                      className={`text-xs ${p === model.default_propulsion ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}`}
                    >
                      {p === 'Electric' && <Zap className="h-3 w-3 mr-1" />}
                      {p}
                    </Badge>
                  ))}
                </div>

                {/* CE Category */}
                {model.ce_category && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600">CE Category:</span>
                    <Badge variant="outline">{model.ce_category}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Ship className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No boat models found</h3>
            <p className="text-slate-500 mb-4">Create your first custom boat model</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Model
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <BoatModelDialog
        open={isCreateOpen || !!editingModel}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingModel(null);
          }
        }}
        model={editingModel}
        articles={articles}
        onSubmit={(data) => {
          if (editingModel) {
            updateModel(editingModel.id, data);
          } else {
            addModel(data);
          }
          setIsCreateOpen(false);
          setEditingModel(null);
        }}
      />

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicatingId} onOpenChange={() => setDuplicatingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Boat Model</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>New Model Name</Label>
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="Enter name for the duplicate"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicatingId(null)}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={!duplicateName.trim()}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Boat Model Form Dialog
interface BoatModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: BoatModelDefinition | null;
  articles: Article[];
  onSubmit: (data: Omit<BoatModelDefinition, 'id' | 'created_at' | 'updated_at'>) => void;
}

function BoatModelDialog({ open, onOpenChange, model, articles, onSubmit }: BoatModelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [lengthM, setLengthM] = useState<number | undefined>();
  const [beamM, setBeamM] = useState<number | undefined>();
  const [draftM, setDraftM] = useState<number | undefined>();
  const [weightKg, setWeightKg] = useState<number | undefined>();
  const [maxPersons, setMaxPersons] = useState<number | undefined>();
  const [ceCategory, setCeCategory] = useState<'A' | 'B' | 'C' | 'D' | undefined>();
  const [availablePropulsion, setAvailablePropulsion] = useState<PropulsionType[]>(['Electric', 'Diesel']);
  const [defaultPropulsion, setDefaultPropulsion] = useState<PropulsionType>('Electric');
  const [isActive, setIsActive] = useState(true);

  // Load model data when editing
  useState(() => {
    if (model) {
      setName(model.name);
      setDescription(model.description || '');
      setBasePrice(model.base_price_excl_vat);
      setLengthM(model.length_m);
      setBeamM(model.beam_m);
      setDraftM(model.draft_m);
      setWeightKg(model.weight_kg);
      setMaxPersons(model.max_persons);
      setCeCategory(model.ce_category);
      setAvailablePropulsion(model.available_propulsion);
      setDefaultPropulsion(model.default_propulsion);
      setIsActive(model.is_active);
    }
  });

  // Reset form when dialog opens
  const resetForm = () => {
    if (model) {
      setName(model.name);
      setDescription(model.description || '');
      setBasePrice(model.base_price_excl_vat);
      setLengthM(model.length_m);
      setBeamM(model.beam_m);
      setDraftM(model.draft_m);
      setWeightKg(model.weight_kg);
      setMaxPersons(model.max_persons);
      setCeCategory(model.ce_category);
      setAvailablePropulsion(model.available_propulsion);
      setDefaultPropulsion(model.default_propulsion);
      setIsActive(model.is_active);
    } else {
      setName('');
      setDescription('');
      setBasePrice(0);
      setLengthM(undefined);
      setBeamM(undefined);
      setDraftM(undefined);
      setWeightKg(undefined);
      setMaxPersons(undefined);
      setCeCategory(undefined);
      setAvailablePropulsion(['Electric', 'Diesel']);
      setDefaultPropulsion('Electric');
      setIsActive(true);
    }
  };

  // Toggle propulsion type
  const togglePropulsion = (type: PropulsionType) => {
    if (availablePropulsion.includes(type)) {
      if (availablePropulsion.length > 1) {
        const newTypes = availablePropulsion.filter(t => t !== type);
        setAvailablePropulsion(newTypes);
        if (defaultPropulsion === type) {
          setDefaultPropulsion(newTypes[0]);
        }
      }
    } else {
      setAvailablePropulsion([...availablePropulsion, type]);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      name,
      description: description || undefined,
      base_price_excl_vat: basePrice,
      length_m: lengthM,
      beam_m: beamM,
      draft_m: draftM,
      weight_kg: weightKg,
      max_persons: maxPersons,
      ce_category: ceCategory,
      available_propulsion: availablePropulsion,
      default_propulsion: defaultPropulsion,
      standard_part_ids: model?.standard_part_ids || [],
      optional_part_ids: model?.optional_part_ids || [],
      is_active: isActive,
      is_default: model?.is_default || false,
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetForm();
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-emerald-600" />
            {model ? 'Edit Boat Model' : 'Create New Boat Model'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Model Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Eagle 950 Sport"
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this model..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Base Price (excl. VAT) *</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={basePrice || ''}
                      onChange={(e) => setBasePrice(Number.parseFloat(e.target.value) || 0)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
                  <Label htmlFor="active" className="font-normal cursor-pointer">Active Model</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Specifications */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Specifications</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Length (m)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={lengthM || ''}
                    onChange={(e) => setLengthM(Number.parseFloat(e.target.value) || undefined)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Beam (m)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={beamM || ''}
                    onChange={(e) => setBeamM(Number.parseFloat(e.target.value) || undefined)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Draft (m)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={draftM || ''}
                    onChange={(e) => setDraftM(Number.parseFloat(e.target.value) || undefined)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={weightKg || ''}
                    onChange={(e) => setWeightKg(Number.parseInt(e.target.value) || undefined)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max Persons</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxPersons || ''}
                    onChange={(e) => setMaxPersons(Number.parseInt(e.target.value) || undefined)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>CE Category</Label>
                  <Select value={ceCategory || 'none'} onValueChange={(v) => setCeCategory(v === 'none' ? undefined : v as 'A' | 'B' | 'C' | 'D')}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {CE_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>Category {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Propulsion */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Propulsion Options</h3>
              <div>
                <Label className="mb-2 block">Available Propulsion Types *</Label>
                <div className="flex flex-wrap gap-2">
                  {PROPULSION_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant="outline"
                      className={`cursor-pointer text-sm py-1 px-3 ${
                        availablePropulsion.includes(type)
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                      onClick={() => togglePropulsion(type)}
                    >
                      {availablePropulsion.includes(type) && <Check className="h-3 w-3 mr-1" />}
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Default Propulsion</Label>
                <Select value={defaultPropulsion} onValueChange={(v) => setDefaultPropulsion(v as PropulsionType)}>
                  <SelectTrigger className="mt-1 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePropulsion.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || basePrice <= 0 || availablePropulsion.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {model ? 'Update Model' : 'Create Model'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
