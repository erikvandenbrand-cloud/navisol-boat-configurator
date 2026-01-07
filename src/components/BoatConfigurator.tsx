'use client';

import { useState, useMemo } from 'react';
import {
  Ship, Zap, Fuel, Battery, Anchor, Gauge,
  ChevronRight, ChevronLeft, Check, Plus, Minus,
  Trash2, Save, RefreshCw,
  type LucideIcon
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { formatEuroCurrency, calculateLineTotal, calculateTotalInclVAT, calculateVAT } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { BoatModel, PropulsionType, SteeringType, Article } from '@/lib/types';

const BOAT_MODELS: { id: BoatModel; name: string; length: string; description: string }[] = [
  // TS Series
  { id: 'Eagle 525T', name: 'Eagle 525T', length: '5.25m', description: 'Compact electric tender' },
  { id: 'Eagle 25TS', name: 'Eagle 25TS', length: '7.50m', description: 'HISWA Award 2025 winner' },
  { id: 'Eagle 28TS', name: 'Eagle 28TS', length: '8.50m', description: 'Spacious electric cruiser' },
  { id: 'Eagle 32TS', name: 'Eagle 32TS', length: '9.70m', description: 'Flagship electric yacht' },
  // Classic Series
  { id: 'Eagle C550', name: 'Eagle C550', length: '5.50m', description: 'Classic Dutch sloep' },
  { id: 'Eagle C570', name: 'Eagle C570', length: '5.70m', description: 'Classic sloep with more space' },
  { id: 'Eagle C720', name: 'Eagle C720', length: '7.20m', description: 'Mid-size classic sloep' },
  { id: 'Eagle C999', name: 'Eagle C999', length: '9.99m', description: 'Large classic with cabin' },
  // Other Series
  { id: 'Eagle 28SG', name: 'Eagle 28SG', length: '8.50m', description: 'Sport Grand performance cruiser' },
  { id: 'Eagle Hybruut 28', name: 'Eagle Hybruut 28', length: '8.50m', description: 'Innovative hybrid boat' },
  { id: 'Custom', name: 'Custom Build', length: 'Variable', description: 'Bespoke design' },
];

const PROPULSION_TYPES: { id: PropulsionType; name: string; icon: LucideIcon; description: string }[] = [
  { id: 'Electric', name: 'Full Electric', icon: Zap, description: 'Zero emissions, quiet operation' },
  { id: 'Diesel', name: 'Diesel', icon: Fuel, description: 'Traditional reliability and range' },
  { id: 'Hybrid', name: 'Hybrid', icon: Battery, description: 'Best of both worlds' },
  { id: 'Outboard', name: 'Outboard', icon: Anchor, description: 'Flexible outboard motor' },
];

const STEERING_TYPES: { id: SteeringType; name: string; description: string }[] = [
  { id: 'Hydraulic', name: 'Hydraulic Steering', description: 'Smooth and powerful steering response' },
  { id: 'Mechanical', name: 'Mechanical Steering', description: 'Direct cable-operated system' },
  { id: 'Electronic', name: 'Electronic Steering', description: 'Advanced CAN-bus controlled' },
];

const STEPS = [
  { id: 1, name: 'Boat Model', description: 'Select your Eagle model' },
  { id: 2, name: 'Propulsion', description: 'Choose propulsion type' },
  { id: 3, name: 'Drivetrain', description: 'Shaft, propeller, components' },
  { id: 4, name: 'Steering', description: 'Steering system selection' },
  { id: 5, name: 'Electrical', description: 'Power, navigation, lights' },
  { id: 6, name: 'Deck & Safety', description: 'Equipment and safety gear' },
  { id: 7, name: 'Interior', description: 'Finishing and comfort' },
  { id: 8, name: 'Review', description: 'Finalize configuration' },
];

export function BoatConfigurator() {
  const {
    articles,
    currentStep,
    setCurrentStep,
    currentConfig,
    updateCurrentConfig,
    selectedItems,
    addItemToConfig,
    removeItemFromConfig,
    updateItemQuantity,
    toggleItemInclusion,
    saveConfiguration,
    resetConfiguration,
    settings
  } = useNavisol();

  const [configName, setConfigName] = useState('');

  // Filter articles based on current selections
  const availableArticles = useMemo(() => {
    let filtered = articles;

    // Filter by boat model
    if (currentConfig.boat_model && currentConfig.boat_model !== 'Custom') {
      filtered = filtered.filter(a =>
        a.boat_model_compat.includes(currentConfig.boat_model!) ||
        a.boat_model_compat.includes('Custom')
      );
    }

    // Filter by propulsion type
    if (currentConfig.propulsion_type) {
      filtered = filtered.filter(a => {
        if (currentConfig.propulsion_type === 'Electric') return a.electric_compatible;
        if (currentConfig.propulsion_type === 'Diesel') return a.diesel_compatible;
        if (currentConfig.propulsion_type === 'Hybrid') return a.hybrid_compatible;
        return true;
      });
    }

    return filtered;
  }, [articles, currentConfig.boat_model, currentConfig.propulsion_type]);

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    for (const item of selectedItems.filter(i => i.included)) {
      subtotal += calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
    }
    const vat = calculateVAT(subtotal, settings.vat_rate);
    const total = subtotal + vat;
    return { subtotal, vat, total };
  }, [selectedItems, settings.vat_rate]);

  // Get articles by category for current step
  const getArticlesForStep = (step: number) => {
    const categoryMap: { [key: number]: string[] } = {
      3: ['2. Propulsion & Drivetrain'],
      4: ['3. Steering System'],
      5: ['4. Electrical System & Navigation'],
      6: ['5. Deck Equipment & Comfort', '7. Safety & Certification'],
      7: ['6. Interior & Finishing', '8. Plumbing & Ventilation', '9. Project & Operational Costs'],
    };

    const categories = categoryMap[step] || [];
    return availableArticles.filter(a => categories.some(cat => a.category.startsWith(cat.split('.')[0])));
  };

  const handleSave = () => {
    updateCurrentConfig({ name: configName || `${currentConfig.boat_model} ${currentConfig.propulsion_type}` });
    const saved = saveConfiguration();
    if (saved) {
      alert(`Configuration saved: ${saved.name}`);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!currentConfig.boat_model;
      case 2: return !!currentConfig.propulsion_type;
      case 4: return !!currentConfig.steering_type;
      default: return true;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[100px]",
                      currentStep === step.id
                        ? "bg-emerald-100 text-emerald-900"
                        : currentStep > step.id
                          ? "text-emerald-600"
                          : "text-slate-400"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                      currentStep === step.id
                        ? "bg-emerald-600 text-white"
                        : currentStep > step.id
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-200 text-slate-500"
                    )}>
                      {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">{step.name}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-slate-300 mx-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1]?.name}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1]?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Boat Model */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BOAT_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => updateCurrentConfig({ boat_model: model.id })}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                      currentConfig.boat_model === model.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Ship className={cn(
                        "h-8 w-8",
                        currentConfig.boat_model === model.id ? "text-emerald-600" : "text-slate-400"
                      )} />
                      {currentConfig.boat_model === model.id && (
                        <Badge className="bg-emerald-600">Selected</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">{model.name}</h3>
                    <p className="text-sm text-slate-500 mb-1">{model.length}</p>
                    <p className="text-sm text-slate-600">{model.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Propulsion */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROPULSION_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => updateCurrentConfig({ propulsion_type: type.id })}
                    className={cn(
                      "p-6 rounded-xl border-2 text-left transition-all hover:shadow-md",
                      currentConfig.propulsion_type === type.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <type.icon className={cn(
                        "h-10 w-10",
                        currentConfig.propulsion_type === type.id ? "text-emerald-600" : "text-slate-400"
                      )} />
                      {currentConfig.propulsion_type === type.id && (
                        <Badge className="bg-emerald-600">Selected</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-xl mb-1">{type.name}</h3>
                    <p className="text-slate-600">{type.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 3-7: Article Selection */}
            {currentStep >= 3 && currentStep <= 7 && (
              <ArticleSelector
                articles={getArticlesForStep(currentStep)}
                selectedItems={selectedItems}
                onAdd={addItemToConfig}
                onRemove={removeItemFromConfig}
                onQuantityChange={updateItemQuantity}
              />
            )}

            {/* Step 4 also includes steering selection */}
            {currentStep === 4 && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Steering Type</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {STEERING_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => updateCurrentConfig({ steering_type: type.id })}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all",
                        currentConfig.steering_type === type.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <h4 className="font-medium">{type.name}</h4>
                      <p className="text-sm text-slate-600">{type.description}</p>
                    </button>
                  ))}
                </div>
                <Separator className="my-6" />
                <h4 className="font-medium mb-3">Steering Components</h4>
              </div>
            )}

            {/* Step 8: Review */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Boat Model</p>
                      <p className="font-semibold text-lg">{currentConfig.boat_model || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Propulsion</p>
                      <p className="font-semibold text-lg">{currentConfig.propulsion_type || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Steering</p>
                      <p className="font-semibold text-lg">{currentConfig.steering_type || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-500">Components</p>
                      <p className="font-semibold text-lg">{selectedItems.length}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Label htmlFor="config-name">Configuration Name</Label>
                  <Input
                    id="config-name"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder={`${currentConfig.boat_model || 'Eagle'} ${currentConfig.propulsion_type || 'Electric'}`}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                  <Button variant="outline" onClick={resetConfiguration}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
            disabled={currentStep === STEPS.length || !canProceed()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {currentStep === STEPS.length ? 'Complete' : 'Next'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Sidebar - Selected Items Summary */}
      <div className="w-full lg:w-80 space-y-4">
        <Card className="sticky top-24">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Model:</span>
                <span className="font-medium">{currentConfig.boat_model || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Propulsion:</span>
                <span className="font-medium">{currentConfig.propulsion_type || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Steering:</span>
                <span className="font-medium">{currentConfig.steering_type || '-'}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Selected Items ({selectedItems.filter(i => i.included).length})</p>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {selectedItems.filter(i => i.included).map((item) => (
                    <div key={item.article.id} className="flex justify-between text-sm">
                      <span className="truncate flex-1 pr-2">{item.article.part_name}</span>
                      <span className="text-slate-500 whitespace-nowrap">
                        {item.quantity}x {formatEuroCurrency(item.article.sales_price_excl_vat)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal (excl. VAT)</span>
                <span className="font-mono">{formatEuroCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>VAT 21%</span>
                <span className="font-mono">{formatEuroCurrency(totals.vat)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total (incl. VAT)</span>
                <span className="font-mono text-emerald-600">{formatEuroCurrency(totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Article Selector Component
interface ArticleSelectorProps {
  articles: Article[];
  selectedItems: { article: Article; quantity: number; included: boolean }[];
  onAdd: (article: Article, qty?: number) => void;
  onRemove: (articleId: string) => void;
  onQuantityChange: (articleId: string, qty: number) => void;
}

function ArticleSelector({ articles, selectedItems, onAdd, onRemove, onQuantityChange }: ArticleSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredArticles = articles.filter(a =>
    a.part_name.toLowerCase().includes(search.toLowerCase()) ||
    a.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedIds = new Set(selectedItems.map(i => i.article.id));

  // Group by subcategory
  const grouped = new Map<string, Article[]>();
  for (const article of filteredArticles) {
    if (!grouped.has(article.subcategory)) {
      grouped.set(article.subcategory, []);
    }
    grouped.get(article.subcategory)!.push(article);
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search components..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ScrollArea className="h-[400px]">
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([subcategory, items]) => (
            <div key={subcategory}>
              <h4 className="font-medium text-sm text-slate-500 mb-2">{subcategory}</h4>
              <div className="space-y-2">
                {items.map((article) => {
                  const selected = selectedItems.find(i => i.article.id === article.id);

                  return (
                    <div
                      key={article.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{article.part_name}</span>
                            <Badge variant={article.standard_or_optional === 'Standard' ? "default" : "outline"} className={article.standard_or_optional === 'Standard' ? "bg-emerald-600 text-xs" : "text-xs"}>
                              {article.standard_or_optional}
                            </Badge>
                          </div>
                          {article.brand && (
                            <p className="text-sm text-slate-500">{article.brand}</p>
                          )}
                          {article.voltage_power && (
                            <p className="text-sm text-slate-500">{article.voltage_power}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm whitespace-nowrap">
                            {formatEuroCurrency(article.sales_price_excl_vat)}
                          </span>

                          {selected ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => {
                                  if (selected.quantity <= 1) {
                                    onRemove(article.id);
                                  } else {
                                    onQuantityChange(article.id, selected.quantity - 1);
                                  }
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{selected.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => onQuantityChange(article.id, selected.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500"
                                onClick={() => onRemove(article.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={() => onAdd(article)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
