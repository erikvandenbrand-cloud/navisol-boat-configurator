'use client';

import React, { useState } from 'react';
import {
  Ship,
  Zap,
  Battery,
  Users,
  Ruler,
  Weight,
  Anchor,
  Shield,
  Star,
  ChevronRight,
  Search,
  Filter,
  Grid,
  List,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStoreV2 } from '@/lib/store-v2';
import { BOAT_RANGES, type BoatRange, type Model, type PropulsionType } from '@/lib/types-v2';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const PROPULSION_ICONS: Record<PropulsionType, { icon: React.ElementType; color: string }> = {
  Electric: { icon: Zap, color: 'text-emerald-500' },
  Hybrid: { icon: Battery, color: 'text-blue-500' },
  Diesel: { icon: Anchor, color: 'text-slate-500' },
  Outboard: { icon: Ship, color: 'text-orange-500' },
};

const CE_CATEGORY_INFO: Record<string, { label: string; description: string; color: string }> = {
  A: { label: 'Ocean', description: 'Designed for extended voyages', color: 'bg-blue-600' },
  B: { label: 'Offshore', description: 'Designed for offshore voyages', color: 'bg-blue-500' },
  C: { label: 'Inshore', description: 'Designed for coastal waters', color: 'bg-emerald-500' },
  D: { label: 'Sheltered', description: 'Designed for sheltered waters', color: 'bg-amber-500' },
};

export function BoatModelsCatalog() {
  const { models } = useStoreV2();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<string>('all');
  const [selectedPropulsion, setSelectedPropulsion] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const activeModels = models.filter(m => m.is_active);

  const filteredModels = activeModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRange = selectedRange === 'all' || model.range === selectedRange;
    const matchesPropulsion = selectedPropulsion === 'all' ||
      model.available_propulsion.includes(selectedPropulsion as PropulsionType);
    return matchesSearch && matchesRange && matchesPropulsion;
  });

  // Group by range
  const groupedModels: Record<BoatRange, Model[]> = {
    TS: [],
    CLASSIC: [],
    SG: [],
    HYBRUUT: [],
    FORCE: [],
    SALOON: [],
    CUSTOM: [],
  };

  for (const model of filteredModels) {
    if (groupedModels[model.range]) {
      groupedModels[model.range].push(model);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Eagle Boats Catalog</h1>
          <p className="text-slate-500 mt-1">
            Dutch-built aluminium boats with electric and hybrid propulsion
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200">
          <Zap className="w-3 h-3" />
          Electric First
        </Badge>
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

            <Select value={selectedRange} onValueChange={setSelectedRange}>
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

            <Select value={selectedPropulsion} onValueChange={setSelectedPropulsion}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Propulsion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Propulsion</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-900">{activeModels.length}</p>
            <p className="text-sm text-slate-500">Active Models</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">
              {activeModels.filter(m => m.available_propulsion.includes('Electric')).length}
            </p>
            <p className="text-sm text-slate-500">Electric Options</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {activeModels.filter(m => m.available_propulsion.includes('Hybrid')).length}
            </p>
            <p className="text-sm text-slate-500">Hybrid Options</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-900">
              {Math.min(...activeModels.map(m => m.length_m || 0)).toFixed(1)}m - {Math.max(...activeModels.map(m => m.length_m || 0)).toFixed(1)}m
            </p>
            <p className="text-sm text-slate-500">Length Range</p>
          </CardContent>
        </Card>
      </div>

      {/* Models by Range */}
      {viewMode === 'grid' ? (
        <div className="space-y-8">
          {(Object.entries(groupedModels) as [BoatRange, Model[]][]).map(([range, rangeModels]) => {
            if (rangeModels.length === 0) return null;
            const rangeInfo = BOAT_RANGES[range];

            return (
              <div key={range}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">{rangeInfo.name}</h2>
                  <p className="text-sm text-slate-500">{rangeInfo.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rangeModels.map(model => (
                    <Card
                      key={model.id}
                      className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                      onClick={() => setSelectedModel(model)}
                    >
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden">
                        {model.image_url ? (
                          <img
                            src={model.image_url}
                            alt={model.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                            <Ship className="w-16 h-16 text-slate-300" />
                          </div>
                        )}

                        {/* Award Badge */}
                        {model.tagline?.includes('HISWA') && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-amber-500 gap-1">
                              <Star className="w-3 h-3" />
                              Award Winner
                            </Badge>
                          </div>
                        )}

                        {/* Propulsion Badges */}
                        <div className="absolute bottom-3 left-3 flex gap-1">
                          {model.available_propulsion.map(prop => {
                            const config = PROPULSION_ICONS[prop];
                            const Icon = config.icon;
                            return (
                              <Badge key={prop} variant="secondary" className="bg-white/90 gap-1">
                                <Icon className={`w-3 h-3 ${config.color}`} />
                                {prop}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Content */}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900">{model.name}</h3>
                            {model.tagline && (
                              <p className="text-sm text-slate-500">{model.tagline}</p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </div>

                        {/* Specs */}
                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div className="text-center">
                            <Ruler className="w-4 h-4 mx-auto text-slate-400" />
                            <p className="font-medium mt-1">{model.length_m}m</p>
                            <p className="text-xs text-slate-500">Length</p>
                          </div>
                          <div className="text-center">
                            <Users className="w-4 h-4 mx-auto text-slate-400" />
                            <p className="font-medium mt-1">{model.max_persons}</p>
                            <p className="text-xs text-slate-500">Persons</p>
                          </div>
                          <div className="text-center">
                            <Shield className="w-4 h-4 mx-auto text-slate-400" />
                            <p className="font-medium mt-1">CE-{model.ce_category}</p>
                            <p className="text-xs text-slate-500">Category</p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                          <span className="text-sm text-slate-500">Starting from</span>
                          <span className="text-lg font-bold text-slate-900">
                            {formatCurrency(model.base_price_excl_vat)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Model</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Range</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Length</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Beam</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Persons</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">CE</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Propulsion</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Base Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredModels.map(model => (
                  <tr
                    key={model.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedModel(model)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {model.image_url ? (
                          <img
                            src={model.image_url}
                            alt={model.name}
                            className="w-12 h-8 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center">
                            <Ship className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{model.name}</p>
                          {model.tagline?.includes('HISWA') && (
                            <Badge className="bg-amber-500 text-xs mt-0.5">Award</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {BOAT_RANGES[model.range]?.name || model.range}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{model.length_m}m</td>
                    <td className="px-4 py-3 text-center text-sm">{model.beam_m}m</td>
                    <td className="px-4 py-3 text-center text-sm">{model.max_persons}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline">{model.ce_category}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {model.available_propulsion.map(prop => {
                          const config = PROPULSION_ICONS[prop];
                          const Icon = config.icon;
                          return (
                            <Icon key={prop} className={`w-4 h-4 ${config.color}`} />
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(model.base_price_excl_vat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Model Detail Dialog */}
      <Dialog open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
        <DialogContent className="max-w-2xl">
          {selectedModel && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedModel.name}</DialogTitle>
                <DialogDescription>{selectedModel.tagline}</DialogDescription>
              </DialogHeader>

              {/* Image */}
              {selectedModel.image_url && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={selectedModel.image_url}
                    alt={selectedModel.name}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Description */}
              {selectedModel.description && (
                <p className="text-slate-600">{selectedModel.description}</p>
              )}

              {/* Specifications */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Ruler className="w-5 h-5 mx-auto text-slate-400" />
                  <p className="font-semibold mt-1">{selectedModel.length_m}m</p>
                  <p className="text-xs text-slate-500">Length</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Ruler className="w-5 h-5 mx-auto text-slate-400 rotate-90" />
                  <p className="font-semibold mt-1">{selectedModel.beam_m}m</p>
                  <p className="text-xs text-slate-500">Beam</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Weight className="w-5 h-5 mx-auto text-slate-400" />
                  <p className="font-semibold mt-1">{selectedModel.weight_kg?.toLocaleString()}kg</p>
                  <p className="text-xs text-slate-500">Weight</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Users className="w-5 h-5 mx-auto text-slate-400" />
                  <p className="font-semibold mt-1">{selectedModel.max_persons}</p>
                  <p className="text-xs text-slate-500">Max Persons</p>
                </div>
              </div>

              {/* CE Category */}
              {selectedModel.ce_category && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${CE_CATEGORY_INFO[selectedModel.ce_category]?.color || 'bg-slate-500'}`}>
                    {selectedModel.ce_category}
                  </div>
                  <div>
                    <p className="font-medium">CE Category {selectedModel.ce_category} - {CE_CATEGORY_INFO[selectedModel.ce_category]?.label}</p>
                    <p className="text-sm text-slate-500">{CE_CATEGORY_INFO[selectedModel.ce_category]?.description}</p>
                  </div>
                </div>
              )}

              {/* Propulsion */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Available Propulsion</p>
                <div className="flex gap-2">
                  {selectedModel.available_propulsion.map(prop => {
                    const config = PROPULSION_ICONS[prop];
                    const Icon = config.icon;
                    return (
                      <Badge key={prop} variant="secondary" className="gap-1 px-3 py-1">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        {prop}
                        {prop === selectedModel.default_propulsion && (
                          <span className="text-xs text-slate-400 ml-1">(default)</span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Highlights */}
              {selectedModel.highlights && selectedModel.highlights.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Highlights</p>
                  <ul className="space-y-1">
                    {selectedModel.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-slate-500">Starting from</span>
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(selectedModel.base_price_excl_vat)}
                </span>
              </div>

              {/* Action */}
              <div className="flex gap-3">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  <Ship className="w-4 h-4 mr-2" />
                  Start New Build Project
                </Button>
                <Button variant="outline">
                  View Equipment Template
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BoatModelsCatalog;
