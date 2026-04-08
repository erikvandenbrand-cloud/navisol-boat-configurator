'use client';

import { useState, useEffect } from 'react';
import { Ship, Save, Plus, Trash2, Package, Layers, ChevronDown, Settings2, Shield, Zap, Anchor, Gauge, BookOpen, Scale, Check, X, GripVertical, Image, FileText, Sparkles, ArrowUp, ArrowDown, Download, Globe, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import type {
  BoatModel,
  CreateBoatModelInput,
  UpdateBoatModelInput,
  DefaultConfigurationItem,
  ModelSpecifications,
  HullSpecifications,
  DimensionalSpecifications,
  WeightCapacitySpecifications,
  PropulsionSpecifications,
  ElectricalSpecifications,
  ComplianceSpecifications,
  SafetyEquipmentRequirements,
  SalesSection,
  SalesImage,
  SalesContentSource,
} from '@/domain/services/BoatModelService';
import type { Standard } from '@/domain/models/standard';
import { generateUUID, now } from '@/domain/models';
import { StandardsLibraryService } from '@/domain/services/StandardsLibraryService';
import { EagleboatsModelImportService, type EagleboatsImportCandidate } from '@/domain/services/EagleboatsModelImportService';
import { useAuth } from '@/v4/state/useAuth';
import { LibraryItemPicker, type PickedItem } from './LibraryItemPicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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

interface BoatModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: BoatModel | null; // null = create new
  mode: 'create' | 'edit';
  onSave: (input: CreateBoatModelInput) => Promise<void>;
  onUpdate?: (id: string, updates: UpdateBoatModelInput) => Promise<void>;
}

const RANGES = ['Sport', 'Touring', 'Cruiser', 'Grand Touring', 'Commercial'];
const CE_CATEGORIES = ['A', 'B', 'C', 'D'];

// Default sales section headings (empty content, just placeholders)
const DEFAULT_SALES_HEADINGS = [
  'Overview',
  'Key Features',
  'Propulsion & Energy',
  'Layout & Comfort',
  'Options & Customization',
];

// ============================================
// IMPORT MODE TYPES
// ============================================

type ImportMode = 'ADD_ONLY' | 'OVERWRITE';

interface ImportSelections {
  coreFields: {
    name: boolean;
    range: boolean;
    description: boolean;
  };
  specs: {
    lengthOverallM: boolean;
    beamOverallM: boolean;
    draftM: boolean;
    displacementLightKg: boolean;
    maxPersons: boolean;
  };
  salesSections: boolean[];
  salesImages: boolean[];
  mode: ImportMode;
}

export function BoatModelDialog({
  open,
  onOpenChange,
  model,
  mode,
  onSave,
  onUpdate,
}: BoatModelDialogProps) {
  // Form state (PATCH 6 - legacy fields removed, use specifications only)
  const [name, setName] = useState('');
  const [range, setRange] = useState('Sport');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(50000);

  // Default configuration items
  const [defaultItems, setDefaultItems] = useState<DefaultConfigurationItem[]>([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  // Specifications state
  const [specifications, setSpecifications] = useState<ModelSpecifications>({});
  const [activeSpecTab, setActiveSpecTab] = useState('hull');

  // Suggested standards state
  const [availableStandards, setAvailableStandards] = useState<Standard[]>([]);
  const [suggestedStandardIds, setSuggestedStandardIds] = useState<string[]>([]);
  const [isLoadingStandards, setIsLoadingStandards] = useState(false);

  // Sales content state (v325 - Sales Track)
  const [salesSections, setSalesSections] = useState<SalesSection[]>([]);
  const [salesImages, setSalesImages] = useState<SalesImage[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // ===========================
  // EAGLEBOATS IMPORT STATE
  // ===========================
  const { user } = useAuth();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isLoadingImport, setIsLoadingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedImport, setSelectedImport] = useState<{
    modelName: string;
    range?: string;
    description?: string;
    lengthOverallM?: number;
    beamOverallM?: number;
    draftM?: number;
    displacementLightKg?: number;
    maxPersons?: number;
    salesSections: Array<{ heading: string; bodyText: string }>;
    salesImages: Array<{ sourceUrl: string; caption?: string; sourceNote: string }>;
    source: { url: string; fetchedAt: string };
  } | null>(null);
  const [importSelections, setImportSelections] = useState<ImportSelections | null>(null);
  const [importStep, setImportStep] = useState<'pick' | 'fields' | 'confirm'>('pick');
  const [importing, setImporting] = useState(false);

  // Load available standards from library
  useEffect(() => {
    async function loadStandards() {
      setIsLoadingStandards(true);
      try {
        await StandardsLibraryService.initializeSeedData();
        const standards = await StandardsLibraryService.getAll(false);
        setAvailableStandards(standards);
      } catch (error) {
        console.error('Failed to load standards:', error);
      } finally {
        setIsLoadingStandards(false);
      }
    }
    if (open) {
      loadStandards();
    }
  }, [open]);

  // Initialize form from model (PATCH 6 - legacy fields removed)
  useEffect(() => {
    if (model) {
      setName(model.name);
      setRange(model.range);
      setDescription(model.description || '');
      setBasePrice(model.basePrice);
      setDefaultItems(model.defaultConfigurationItems || []);
      setSpecifications(model.specifications || {});
      setSuggestedStandardIds(model.suggestedStandardIds || []);
      // Sales content
      setSalesSections(model.salesSections || []);
      setSalesImages(model.salesImages || []);
    } else {
      // Reset for create
      setName('');
      setRange('Sport');
      setDescription('');
      setBasePrice(50000);
      setDefaultItems([]);
      // Initialize empty specifications - user must fill in Dimensions/Compliance tabs
      setSpecifications({});
      setSuggestedStandardIds([]);
      // Reset sales content
      setSalesSections([]);
      setSalesImages([]);
    }
  }, [model, open]);

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

  // Helper to update nested specification fields
  function updateHull(updates: Partial<HullSpecifications>) {
    setSpecifications(prev => ({
      ...prev,
      hull: { ...prev.hull, ...updates } as HullSpecifications,
    }));
  }

  function updateDimensions(updates: Partial<DimensionalSpecifications>) {
    setSpecifications(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, ...updates } as DimensionalSpecifications,
    }));
  }

  function updateWeightCapacity(updates: Partial<WeightCapacitySpecifications>) {
    setSpecifications(prev => ({
      ...prev,
      weightCapacity: { ...prev.weightCapacity, ...updates } as WeightCapacitySpecifications,
    }));
  }

  function updatePropulsion(updates: Partial<PropulsionSpecifications>) {
    setSpecifications(prev => ({
      ...prev,
      propulsion: { ...prev.propulsion, ...updates } as PropulsionSpecifications,
    }));
  }

  function updateElectrical(updates: Partial<ElectricalSpecifications>) {
    setSpecifications(prev => ({
      ...prev,
      electrical: { ...prev.electrical, ...updates } as ElectricalSpecifications,
    }));
  }

  function updateCompliance(updates: Partial<ComplianceSpecifications>) {
    setSpecifications(prev => ({
      ...prev,
      compliance: { ...prev.compliance, ...updates } as ComplianceSpecifications,
    }));
  }

  function updateSafety(updates: Partial<SafetyEquipmentRequirements>) {
    setSpecifications(prev => ({
      ...prev,
      safetyEquipment: { ...prev.safetyEquipment, ...updates } as SafetyEquipmentRequirements,
    }));
  }

  // Toggle a standard in the suggested list
  function toggleSuggestedStandard(standardId: string) {
    setSuggestedStandardIds(prev =>
      prev.includes(standardId)
        ? prev.filter(id => id !== standardId)
        : [...prev, standardId]
    );
  }

  // ============================================
  // SALES CONTENT HELPERS (v325 - Sales Track)
  // ============================================

  function handleCreateDefaultSalesHeadings() {
    // Create empty sections with default headings - NO auto-generated content
    const newSections: SalesSection[] = DEFAULT_SALES_HEADINGS.map((heading, index) => ({
      id: generateUUID(),
      heading,
      bodyText: '', // Empty - user must fill in
      sortOrder: index,
    }));
    setSalesSections(newSections);
  }

  function handleAddSalesSection() {
    const newSection: SalesSection = {
      id: generateUUID(),
      heading: '',
      bodyText: '',
      sortOrder: salesSections.length,
    };
    setSalesSections([...salesSections, newSection]);
  }

  function handleUpdateSalesSection(id: string, updates: Partial<SalesSection>) {
    setSalesSections(salesSections.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ));
  }

  function handleRemoveSalesSection(id: string) {
    setSalesSections(salesSections.filter(s => s.id !== id));
  }

  function handleMoveSalesSection(id: string, direction: 'up' | 'down') {
    const index = salesSections.findIndex(s => s.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === salesSections.length - 1) return;

    const newSections = [...salesSections];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
    // Update sortOrder
    newSections.forEach((s, i) => s.sortOrder = i);
    setSalesSections(newSections);
  }

  function handleAddSalesImage() {
    const newImage: SalesImage = {
      id: generateUUID(),
      caption: '',
      sourceUrl: '',
      sortOrder: salesImages.length,
    };
    setSalesImages([...salesImages, newImage]);
  }

  function handleUpdateSalesImage(id: string, updates: Partial<SalesImage>) {
    setSalesImages(salesImages.map(img =>
      img.id === id ? { ...img, ...updates } : img
    ));
  }

  function handleRemoveSalesImage(id: string) {
    setSalesImages(salesImages.filter(img => img.id !== id));
  }

  // ============================================
  // SAVE HANDLER
  // ============================================

  async function handleSave() {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    // Validate that at least dimensions are set in Technical Specs (PATCH 6 - required)
    if (!specifications.dimensions?.lengthOverallM || !specifications.dimensions?.beamOverallM) {
      alert('Length and Beam are required. Set them in Technical Specifications → Dimensions.');
      return;
    }

    setIsLoading(true);
    try {
      // PATCH 6 - Save specifications only (no legacy fields)
      const data = {
        name: name.trim(),
        range,
        description: description.trim() || undefined,
        basePrice,
        defaultConfigurationItems: defaultItems,
        specifications, // Canonical source for all model facts
        suggestedStandardIds: suggestedStandardIds.length > 0 ? suggestedStandardIds : undefined,
        // Sales content (v325)
        salesSections: salesSections.length > 0 ? salesSections : undefined,
        salesImages: salesImages.length > 0 ? salesImages : undefined,
      };

      if (mode === 'create') {
        await onSave(data);
      } else if (mode === 'edit' && onUpdate && model) {
        await onUpdate(model.id, data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // EAGLEBOATS IMPORT HANDLERS
  // ============================================

  const [importUrl, setImportUrl] = useState('');

  function handleOpenImportDialog() {
    setShowImportDialog(true);
    setIsLoadingImport(false);
    setImportError(null);
    setSelectedImport(null);
    setImportSelections(null);
    setImportStep('pick');
    setImportUrl('');
  }

  async function handleFetchImportUrl() {
    if (!importUrl.trim()) {
      setImportError('Please enter a URL');
      return;
    }

    setIsLoadingImport(true);
    setImportError(null);
    try {
      const result = await EagleboatsModelImportService.fetchAndParse(importUrl.trim());
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      // Map the candidate to the format expected by the UI
      const candidate = result.value;
      const mapped = EagleboatsModelImportService.mapToBoatModelFields(candidate);

      // Create a combined import candidate with all the info (PATCH 6 - use canonical names)
      const importData: EagleboatsImportCandidate & {
        salesSections: Array<{ heading: string; bodyText: string }>;
        salesImages: Array<{ sourceUrl: string; caption?: string; sourceNote: string }>;
        lengthOverallM?: number;
        beamOverallM?: number;
        draftM?: number;
        displacementLightKg?: number;
        maxPersons?: number;
        description?: string;
        id: string;
      } = {
        ...candidate,
        id: candidate.source.url,
        salesSections: mapped.salesSections,
        salesImages: mapped.salesImages,
        lengthOverallM: mapped.specs.lengthM,
        beamOverallM: mapped.specs.beamM,
        draftM: mapped.specs.draftM,
        displacementLightKg: mapped.specs.displacementKg,
        maxPersons: mapped.specs.maxPassengers,
        description: mapped.coreFields.description,
      };

      setSelectedImport(importData as any);

      // Set default selections (PATCH 6 - use canonical names)
      setImportSelections({
        coreFields: {
          name: true,
          range: true,
          description: true,
        },
        specs: {
          lengthOverallM: !!mapped.specs.lengthM,
          beamOverallM: !!mapped.specs.beamM,
          draftM: !!mapped.specs.draftM,
          displacementLightKg: !!mapped.specs.displacementKg,
          maxPersons: !!mapped.specs.maxPassengers,
        },
        salesSections: mapped.salesSections.map(() => true),
        salesImages: mapped.salesImages.map(() => true),
        mode: 'ADD_ONLY',
      });
      setImportStep('fields');
    } catch (err: any) {
      setImportError(err.message || 'Failed to fetch page');
    } finally {
      setIsLoadingImport(false);
    }
  }

  function handleImportFieldToggle(section: string, group: 'coreFields' | 'specs') {
    if (!importSelections) return;
    if (group === 'coreFields') {
      const key = section as keyof ImportSelections['coreFields'];
      setImportSelections({
        ...importSelections,
        coreFields: {
          ...importSelections.coreFields,
          [key]: !importSelections.coreFields[key],
        },
      });
    } else {
      const key = section as keyof ImportSelections['specs'];
      setImportSelections({
        ...importSelections,
        specs: {
          ...importSelections.specs,
          [key]: !importSelections.specs[key],
        },
      });
    }
  }

  function handleImportSalesSectionToggle(idx: number) {
    if (!importSelections) return;
    const arr = [...importSelections.salesSections];
    arr[idx] = !arr[idx];
    setImportSelections({ ...importSelections, salesSections: arr });
  }

  function handleImportSalesImageToggle(idx: number) {
    if (!importSelections) return;
    const arr = [...importSelections.salesImages];
    arr[idx] = !arr[idx];
    setImportSelections({ ...importSelections, salesImages: arr });
  }

  function handleImportModeChange(mode: ImportMode) {
    if (!importSelections) return;
    setImportSelections({ ...importSelections, mode });
  }

  function handleImportBack() {
    if (importStep === 'fields') {
      setSelectedImport(null);
      setImportSelections(null);
      setImportStep('pick');
    } else if (importStep === 'confirm') {
      setImportStep('fields');
    }
  }

  function handleImportNext() {
    if (importStep === 'fields') {
      setImportStep('confirm');
    }
  }

  async function handleDoImport() {
    if (!selectedImport || !importSelections) return;
    setImporting(true);

    // Compose import (PATCH 6 - write to specifications only)
    // ADD_ONLY: only fill empty fields, append sections/images
    // OVERWRITE: overwrite checked fields, replace checked sections/images
    const c = selectedImport;
    const sel = importSelections;

    // Core fields
    if (sel.coreFields.name && (sel.mode === 'OVERWRITE' || !name)) setName(c.modelName);
    if (sel.coreFields.range && (sel.mode === 'OVERWRITE' || !range)) setRange(c.range || 'Sport');
    if (sel.coreFields.description && (sel.mode === 'OVERWRITE' || !description)) setDescription(c.description || '');

    // Specs - write to specifications (canonical source, PATCH 6)
    if (sel.specs.lengthOverallM && c.lengthOverallM) {
      const shouldUpdate = sel.mode === 'OVERWRITE' || !specifications.dimensions?.lengthOverallM;
      if (shouldUpdate) {
        updateDimensions({ lengthOverallM: c.lengthOverallM });
      }
    }
    if (sel.specs.beamOverallM && c.beamOverallM) {
      const shouldUpdate = sel.mode === 'OVERWRITE' || !specifications.dimensions?.beamOverallM;
      if (shouldUpdate) {
        updateDimensions({ beamOverallM: c.beamOverallM });
      }
    }
    if (sel.specs.draftM && c.draftM) {
      const shouldUpdate = sel.mode === 'OVERWRITE' || !specifications.dimensions?.draftM;
      if (shouldUpdate) {
        updateDimensions({ draftM: c.draftM });
      }
    }
    if (sel.specs.displacementLightKg && c.displacementLightKg) {
      const shouldUpdate = sel.mode === 'OVERWRITE' || !specifications.weightCapacity?.displacementLightKg;
      if (shouldUpdate) {
        updateWeightCapacity({ displacementLightKg: c.displacementLightKg });
      }
    }
    if (sel.specs.maxPersons && c.maxPersons) {
      const shouldUpdate = sel.mode === 'OVERWRITE' || !specifications.compliance?.maxPersons;
      if (shouldUpdate) {
        updateCompliance({ maxPersons: c.maxPersons });
      }
    }

    // Sales sections
    if (c.salesSections && c.salesSections.length > 0) {
      const toImport: SalesSection[] = c.salesSections
        .map((s, i) => ({ s, i }))
        .filter(({ i }) => sel.salesSections[i])
        .map(({ s }, idx) => ({
          id: generateUUID(),
          heading: s.heading,
          bodyText: s.bodyText,
          sortOrder: salesSections.length + idx,
        }));
      if (sel.mode === 'OVERWRITE') {
        setSalesSections(toImport);
      } else {
        setSalesSections(prev => [...prev, ...toImport]);
      }
    }

    // Sales images
    if (c.salesImages && c.salesImages.length > 0) {
      const toImport: SalesImage[] = c.salesImages
        .map((img, i) => ({ img, i }))
        .filter(({ i }) => sel.salesImages[i])
        .map(({ img }, idx) => ({
          id: generateUUID(),
          sourceUrl: img.sourceUrl,
          caption: img.caption,
          sourceNote: img.sourceNote,
          sortOrder: salesImages.length + idx,
        }));
      if (sel.mode === 'OVERWRITE') {
        setSalesImages(toImport);
      } else {
        setSalesImages(prev => [...prev, ...toImport]);
      }
    }

    setShowImportDialog(false);
    setImporting(false);
  }

  const title = mode === 'create' ? 'Create New Boat Model' : `Edit ${model?.name}`;
  const description_text = mode === 'create'
    ? 'Add a new boat model to the library with specifications and default equipment'
    : 'Update boat model specifications and default equipment';

  // Calculate total of default items
  const defaultItemsTotal = defaultItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceExclVat,
    0
  );

  // Count active (non-archived) sales sections
  const activeSalesSections = salesSections.filter(s => !s.archived);

  return (
    <>
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
            {/* Basic Info */}
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

            {/* Import from eagleboats.nl */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleOpenImportDialog}
              >
                <Download className="h-4 w-4" />
                Import from eagleboats.nl
              </Button>
            </div>

            {/* Base Price (keep editable in main form) */}
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

            {/* Specifications Summary (PATCH 6 - canonical source only) */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-slate-500">Specifications Summary</Label>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Edit these values in Technical Specifications → Dimensions / Compliance tabs below.
              </p>
              <div className="grid grid-cols-5 gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-slate-500">LOA</p>
                  <p className="text-sm font-medium">
                    {specifications.dimensions?.lengthOverallM
                      ? `${specifications.dimensions.lengthOverallM} m`
                      : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Beam</p>
                  <p className="text-sm font-medium">
                    {specifications.dimensions?.beamOverallM
                      ? `${specifications.dimensions.beamOverallM} m`
                      : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Draft</p>
                  <p className="text-sm font-medium">
                    {specifications.dimensions?.draftM
                      ? `${specifications.dimensions.draftM} m`
                      : '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Max Persons</p>
                  <p className="text-sm font-medium">
                    {specifications.compliance?.maxPersons ?? '—'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">CE Category</p>
                  <p className="text-sm font-medium">
                    {specifications.compliance?.designCategory ?? '—'}
                  </p>
                </div>
              </div>
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

            {/* Technical Specifications Section */}
            <div className="border-t pt-4">
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-3">
                  <Settings2 className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-slate-700">Technical Specifications</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {Object.keys(specifications).filter(k => specifications[k as keyof ModelSpecifications]).length} sections
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-xs text-slate-500 mb-3">
                    Detailed specifications for templates and compliance documents.
                    <span className="text-teal-600 font-medium ml-1">
                      Fill in dimensions and compliance under Dimensions / Compliance tabs.
                    </span>
                  </p>
                  <Tabs value={activeSpecTab} onValueChange={setActiveSpecTab} className="w-full">
                    <TabsList className="w-full justify-start flex-wrap h-auto">
                      <TabsTrigger value="hull" className="text-xs gap-1">
                        <Anchor className="h-3 w-3" />
                        Hull
                      </TabsTrigger>
                      <TabsTrigger value="dimensions" className="text-xs gap-1">
                        <Gauge className="h-3 w-3" />
                        Dimensions
                      </TabsTrigger>
                      <TabsTrigger value="propulsion" className="text-xs gap-1">
                        <Zap className="h-3 w-3" />
                        Propulsion
                      </TabsTrigger>
                      <TabsTrigger value="electrical" className="text-xs gap-1">
                        <Zap className="h-3 w-3" />
                        Electrical
                      </TabsTrigger>
                      <TabsTrigger value="compliance" className="text-xs gap-1">
                        <Shield className="h-3 w-3" />
                        Compliance
                      </TabsTrigger>
                      <TabsTrigger value="safety" className="text-xs gap-1">
                        <Shield className="h-3 w-3" />
                        Safety
                      </TabsTrigger>
                    </TabsList>

                    {/* Hull Tab */}
                    <TabsContent value="hull" className="space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Hull Material</Label>
                          <Select
                            value={specifications.hull?.material || ''}
                            onValueChange={(v) => updateHull({ material: v as HullSpecifications['material'] })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALUMINIUM">Aluminium</SelectItem>
                              <SelectItem value="FIBREGLASS">Fibreglass</SelectItem>
                              <SelectItem value="STEEL">Steel</SelectItem>
                              <SelectItem value="COMPOSITE">Composite</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Material Description</Label>
                          <Input
                            value={specifications.hull?.materialDescription || ''}
                            onChange={(e) => updateHull({ materialDescription: e.target.value })}
                            placeholder="e.g. Marine grade 5083-H111"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Construction Type</Label>
                          <Select
                            value={specifications.hull?.constructionType || ''}
                            onValueChange={(v) => updateHull({ constructionType: v as HullSpecifications['constructionType'] })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WELDED">Welded</SelectItem>
                              <SelectItem value="RIVETED">Riveted</SelectItem>
                              <SelectItem value="LAMINATED">Laminated</SelectItem>
                              <SelectItem value="MOULDED">Moulded</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Hull Type</Label>
                          <Select
                            value={specifications.hull?.hullType || ''}
                            onValueChange={(v) => updateHull({ hullType: v as HullSpecifications['hullType'] })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select hull type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PLANING">Planing</SelectItem>
                              <SelectItem value="SEMI_DISPLACEMENT">Semi-displacement</SelectItem>
                              <SelectItem value="DISPLACEMENT">Displacement</SelectItem>
                              <SelectItem value="CATAMARAN">Catamaran</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Deadrise Angle (°)</Label>
                          <Input
                            type="number"
                            step={0.5}
                            value={specifications.hull?.deadriseAngleDeg || ''}
                            onChange={(e) => updateHull({ deadriseAngleDeg: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="e.g. 21"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">WIN Format Pattern</Label>
                          <Input
                            value={specifications.hull?.winFormat || ''}
                            onChange={(e) => updateHull({ winFormat: e.target.value })}
                            placeholder="e.g. NL-EAG-{SERIAL}-{YEAR}"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Dimensions Tab */}
                    <TabsContent value="dimensions" className="space-y-3 mt-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">LOA (m)</Label>
                          <Input
                            type="number"
                            step={0.01}
                            value={specifications.dimensions?.lengthOverallM || ''}
                            onChange={(e) => updateDimensions({ lengthOverallM: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">LWL (m)</Label>
                          <Input
                            type="number"
                            step={0.01}
                            value={specifications.dimensions?.lengthWaterlineM || ''}
                            onChange={(e) => updateDimensions({ lengthWaterlineM: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Beam (m)</Label>
                          <Input
                            type="number"
                            step={0.01}
                            value={specifications.dimensions?.beamOverallM || ''}
                            onChange={(e) => updateDimensions({ beamOverallM: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Draft (m)</Label>
                          <Input
                            type="number"
                            step={0.01}
                            value={specifications.dimensions?.draftM || ''}
                            onChange={(e) => updateDimensions({ draftM: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Air Draft (m)</Label>
                          <Input
                            type="number"
                            step={0.01}
                            value={specifications.dimensions?.airDraftM || ''}
                            onChange={(e) => updateDimensions({ airDraftM: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Height above waterline"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Bridge Clearance (m)</Label>
                          <Input
                            type="number"
                            step={0.01}
                            value={specifications.dimensions?.bridgeClearanceM || ''}
                            onChange={(e) => updateDimensions({ bridgeClearanceM: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Propulsion Tab */}
                    <TabsContent value="propulsion" className="space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Propulsion Type</Label>
                          <Select
                            value={specifications.propulsion?.propulsionType || ''}
                            onValueChange={(v) => updatePropulsion({ propulsionType: v as PropulsionSpecifications['propulsionType'] })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ELECTRIC">Electric</SelectItem>
                              <SelectItem value="HYBRID">Hybrid</SelectItem>
                              <SelectItem value="OUTBOARD">Outboard</SelectItem>
                              <SelectItem value="INBOARD">Inboard</SelectItem>
                              <SelectItem value="POD">Pod Drive</SelectItem>
                              <SelectItem value="SAIL">Sail</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Max Power (kW)</Label>
                          <Input
                            type="number"
                            value={specifications.propulsion?.maxPowerKw || ''}
                            onChange={(e) => updatePropulsion({ maxPowerKw: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max Speed (kn)</Label>
                          <Input
                            type="number"
                            step={0.1}
                            value={specifications.propulsion?.maxSpeedKn || ''}
                            onChange={(e) => updatePropulsion({ maxSpeedKn: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cruising Speed (kn)</Label>
                          <Input
                            type="number"
                            step={0.1}
                            value={specifications.propulsion?.cruisingSpeedKn || ''}
                            onChange={(e) => updatePropulsion({ cruisingSpeedKn: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Range (NM)</Label>
                          <Input
                            type="number"
                            value={specifications.propulsion?.rangeNm || ''}
                            onChange={(e) => updatePropulsion({ rangeNm: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="At cruising speed"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Propeller Type</Label>
                          <Input
                            value={specifications.propulsion?.propellerType || ''}
                            onChange={(e) => updatePropulsion({ propellerType: e.target.value })}
                            placeholder="e.g. Fixed 3-blade"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Electrical Tab */}
                    <TabsContent value="electrical" className="space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">System Voltage (V)</Label>
                          <Select
                            value={specifications.electrical?.systemVoltage?.toString() || ''}
                            onValueChange={(v) => updateElectrical({ systemVoltage: parseInt(v) })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select voltage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12V</SelectItem>
                              <SelectItem value="24">24V</SelectItem>
                              <SelectItem value="48">48V</SelectItem>
                              <SelectItem value="400">400V</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Battery Capacity (Ah)</Label>
                          <Input
                            type="number"
                            value={specifications.electrical?.batteryCapacityAh || ''}
                            onChange={(e) => updateElectrical({ batteryCapacityAh: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Battery Type</Label>
                          <Select
                            value={specifications.electrical?.batteryType || ''}
                            onValueChange={(v) => updateElectrical({ batteryType: v as ElectricalSpecifications['batteryType'] })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LEAD_ACID">Lead Acid</SelectItem>
                              <SelectItem value="AGM">AGM</SelectItem>
                              <SelectItem value="GEL">Gel</SelectItem>
                              <SelectItem value="LITHIUM">Lithium-ion</SelectItem>
                              <SelectItem value="LIFEPO4">LiFePO4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Shore Connection (A)</Label>
                          <Input
                            type="number"
                            value={specifications.electrical?.shoreConnectionAmp || ''}
                            onChange={(e) => updateElectrical({ shoreConnectionAmp: e.target.value ? parseFloat(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <Switch
                            checked={specifications.electrical?.hasSolarPanels || false}
                            onCheckedChange={(v) => updateElectrical({ hasSolarPanels: v })}
                          />
                          <Label className="text-xs">Solar Panels</Label>
                        </div>
                        {specifications.electrical?.hasSolarPanels && (
                          <div>
                            <Label className="text-xs">Solar Capacity (Wp)</Label>
                            <Input
                              type="number"
                              value={specifications.electrical?.solarCapacityWp || ''}
                              onChange={(e) => updateElectrical({ solarCapacityWp: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="h-8 text-xs mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Compliance Tab (PATCH 6 - canonical source only) */}
                    <TabsContent value="compliance" className="space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Design Category</Label>
                          <Select
                            value={specifications.compliance?.designCategory || ''}
                            onValueChange={(v) => updateCompliance({ designCategory: v as ComplianceSpecifications['designCategory'] })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A - Ocean</SelectItem>
                              <SelectItem value="B">B - Offshore</SelectItem>
                              <SelectItem value="C">C - Inshore</SelectItem>
                              <SelectItem value="D">D - Sheltered Waters</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Max Persons</Label>
                          <Input
                            type="number"
                            value={specifications.compliance?.maxPersons || ''}
                            onChange={(e) => updateCompliance({ maxPersons: e.target.value ? parseInt(e.target.value) : 0 })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Category Description</Label>
                          <Input
                            value={specifications.compliance?.designCategoryDescription || ''}
                            onChange={(e) => updateCompliance({ designCategoryDescription: e.target.value })}
                            placeholder="e.g. Offshore - wind force up to 8 Beaufort"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">RCD Module Applied</Label>
                          <Select
                            value={specifications.compliance?.rcdModuleApplied || ''}
                            onValueChange={(v) => updateCompliance({ rcdModuleApplied: v as ComplianceSpecifications['rcdModuleApplied'] })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select module" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">Module A</SelectItem>
                              <SelectItem value="A1">Module A1</SelectItem>
                              <SelectItem value="B">Module B</SelectItem>
                              <SelectItem value="C">Module C</SelectItem>
                              <SelectItem value="D">Module D</SelectItem>
                              <SelectItem value="E">Module E</SelectItem>
                              <SelectItem value="F">Module F</SelectItem>
                              <SelectItem value="G">Module G</SelectItem>
                              <SelectItem value="H">Module H</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Notified Body Number</Label>
                          <Input
                            value={specifications.compliance?.notifiedBodyNumber || ''}
                            onChange={(e) => updateCompliance({ notifiedBodyNumber: e.target.value })}
                            placeholder="e.g. 0123"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Applicable Standards (comma-separated)</Label>
                          <Input
                            value={specifications.compliance?.applicableStandards?.join(', ') || ''}
                            onChange={(e) => updateCompliance({
                              applicableStandards: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                            placeholder="e.g. ISO 12215, ISO 12217, ISO 10240"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Safety Tab */}
                    <TabsContent value="safety" className="space-y-3 mt-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Adult Life Jackets</Label>
                          <Input
                            type="number"
                            value={specifications.safetyEquipment?.lifeJacketsAdult || ''}
                            onChange={(e) => updateSafety({ lifeJacketsAdult: e.target.value ? parseInt(e.target.value) : 0 })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Child Life Jackets</Label>
                          <Input
                            type="number"
                            value={specifications.safetyEquipment?.lifeJacketsChild || ''}
                            onChange={(e) => updateSafety({ lifeJacketsChild: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Lifebuoys</Label>
                          <Input
                            type="number"
                            value={specifications.safetyEquipment?.lifebuoys || ''}
                            onChange={(e) => updateSafety({ lifebuoys: e.target.value ? parseInt(e.target.value) : 0 })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Fire Extinguishers</Label>
                          <Input
                            type="number"
                            value={specifications.safetyEquipment?.fireExtinguishers || ''}
                            onChange={(e) => updateSafety({ fireExtinguishers: e.target.value ? parseInt(e.target.value) : 0 })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Distress Flares</Label>
                          <Input
                            type="number"
                            value={specifications.safetyEquipment?.distressFlares || ''}
                            onChange={(e) => updateSafety({ distressFlares: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.firstAidKit || false}
                            onCheckedChange={(v) => updateSafety({ firstAidKit: v })}
                          />
                          <Label className="text-xs">First Aid Kit</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.epirb || false}
                            onCheckedChange={(v) => updateSafety({ epirb: v })}
                          />
                          <Label className="text-xs">EPIRB</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.vhfRadio || false}
                            onCheckedChange={(v) => updateSafety({ vhfRadio: v })}
                          />
                          <Label className="text-xs">VHF Radio</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.navigationLights || false}
                            onCheckedChange={(v) => updateSafety({ navigationLights: v })}
                          />
                          <Label className="text-xs">Nav Lights</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.anchor || false}
                            onCheckedChange={(v) => updateSafety({ anchor: v })}
                          />
                          <Label className="text-xs">Anchor</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.bilgePump || false}
                            onCheckedChange={(v) => updateSafety({ bilgePump: v })}
                          />
                          <Label className="text-xs">Bilge Pump</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.radarReflector || false}
                            onCheckedChange={(v) => updateSafety({ radarReflector: v })}
                          />
                          <Label className="text-xs">Radar Reflector</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={specifications.safetyEquipment?.soundSignalDevice || false}
                            onCheckedChange={(v) => updateSafety({ soundSignalDevice: v })}
                          />
                          <Label className="text-xs">Sound Signal</Label>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Suggested Standards Section */}
            <div className="border-t pt-4">
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-3">
                  <Scale className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-slate-700">Suggested Standards</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {suggestedStandardIds.length} selected
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-xs text-slate-500 mb-3">
                    Select standards from the library that are typically applicable to this model.
                    These will be available as suggestions when applying standards to projects.
                  </p>

                  {isLoadingStandards ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      Loading standards...
                    </div>
                  ) : availableStandards.length === 0 ? (
                    <div className="p-4 border-2 border-dashed rounded-lg text-center text-slate-500">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm">No standards in library</p>
                      <p className="text-xs mt-1">
                        Add standards to the Standards Library first
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg max-h-[240px] overflow-y-auto">
                      {availableStandards.map(standard => (
                        <div
                          key={standard.id}
                          className={`flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer ${
                            suggestedStandardIds.includes(standard.id) ? 'bg-teal-50' : ''
                          }`}
                          onClick={() => toggleSuggestedStandard(standard.id)}
                        >
                          <Checkbox
                            checked={suggestedStandardIds.includes(standard.id)}
                            onCheckedChange={() => toggleSuggestedStandard(standard.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                {standard.code}
                              </code>
                              {standard.editionOrYear && (
                                <span className="text-xs text-slate-500">{standard.editionOrYear}</span>
                              )}
                              {standard.isHarmonised && (
                                <Badge className="bg-green-100 text-green-700 border-0 text-[10px] py-0">
                                  <Check className="h-2.5 w-2.5 mr-0.5" />
                                  Harmonised
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 truncate">{standard.title}</p>
                            {standard.tags && standard.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {standard.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 text-slate-500">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {suggestedStandardIds.length > 0 && (
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{suggestedStandardIds.length} standard{suggestedStandardIds.length !== 1 ? 's' : ''} selected as suggestions</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-slate-500"
                        onClick={() => setSuggestedStandardIds([])}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear all
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Sales Content Section (v325 - Sales Track) */}
            <div className="border-t pt-4">
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-3">
                  <FileText className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-slate-700">Sales Content</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {activeSalesSections.length} sections, {salesImages.length} images
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-500">
                      Add narrative sections and images for customer-facing brochures and offers.
                      This content is reusable when generating Customer Offers from quotes.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-7 flex-shrink-0 ml-2"
                      onClick={handleOpenImportDialog}
                    >
                      <Download className="h-3 w-3" />
                      Import from Website
                    </Button>
                  </div>

                  {/* Sales Sections */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-600">Narrative Sections</Label>
                      <div className="flex gap-2">
                        {salesSections.length === 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCreateDefaultSalesHeadings}
                            className="text-xs h-7"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Create Default Headings
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddSalesSection}
                          className="text-xs h-7"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Section
                        </Button>
                      </div>
                    </div>

                    {salesSections.length === 0 ? (
                      <div className="p-4 border-2 border-dashed rounded-lg text-center text-slate-500">
                        <FileText className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                        <p className="text-xs">No sales sections yet</p>
                        <p className="text-xs mt-1">
                          Click "Create Default Headings" to start with common sections
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {salesSections.map((section, index) => (
                          <div
                            key={section.id}
                            className={`border rounded-lg p-3 ${section.archived ? 'bg-slate-50 opacity-60' : 'bg-white'}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex flex-col gap-1 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  disabled={index === 0}
                                  onClick={() => handleMoveSalesSection(section.id, 'up')}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  disabled={index === salesSections.length - 1}
                                  onClick={() => handleMoveSalesSection(section.id, 'down')}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={section.heading}
                                  onChange={(e) => handleUpdateSalesSection(section.id, { heading: e.target.value })}
                                  placeholder="Section heading..."
                                  className="h-8 text-sm font-medium"
                                />
                                <Textarea
                                  value={section.bodyText}
                                  onChange={(e) => handleUpdateSalesSection(section.id, { bodyText: e.target.value })}
                                  placeholder="Section content... (supports markdown)"
                                  rows={3}
                                  className="text-xs"
                                />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveSalesSection(section.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sales Images */}
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-600">Image Gallery</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddSalesImage}
                        className="text-xs h-7"
                      >
                        <Image className="h-3 w-3 mr-1" />
                        Add Image
                      </Button>
                    </div>

                    {salesImages.length === 0 ? (
                      <div className="p-4 border-2 border-dashed rounded-lg text-center text-slate-500">
                        <Image className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                        <p className="text-xs">No images yet</p>
                        <p className="text-xs mt-1">
                          Add image URLs for brochure content
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {salesImages.map((img) => (
                          <div key={img.id} className="border rounded-lg p-2 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Image #{salesImages.indexOf(img) + 1}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-red-500"
                                onClick={() => handleRemoveSalesImage(img.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              value={img.sourceUrl || ''}
                              onChange={(e) => handleUpdateSalesImage(img.id, { sourceUrl: e.target.value })}
                              placeholder="Image URL..."
                              className="h-7 text-xs"
                            />
                            <Input
                              value={img.caption || ''}
                              onChange={(e) => handleUpdateSalesImage(img.id, { caption: e.target.value })}
                              placeholder="Caption (optional)..."
                              className="h-7 text-xs"
                            />
                            <Input
                              value={img.sourceNote || ''}
                              onChange={(e) => handleUpdateSalesImage(img.id, { sourceNote: e.target.value })}
                              placeholder="Source note (e.g., from website)..."
                              className="h-7 text-xs text-slate-500"
                            />
                            {img.sourceUrl && (
                              <div className="h-20 bg-slate-100 rounded overflow-hidden">
                                <img
                                  src={img.sourceUrl}
                                  alt={img.caption || 'Preview'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
              {mode === 'create' ? 'Create Model' : 'Save Changes'}
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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-teal-600" />
              Import from eagleboats.nl
            </DialogTitle>
            <DialogDescription>
              Import model data from the public eagleboats.nl website.
            </DialogDescription>
          </DialogHeader>

          {importStep === 'pick' && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <a
                  href="https://eagleboats.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-blue-600 flex items-center gap-1"
                >
                  Visit eagleboats.nl <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Model Page URL</Label>
                <p className="text-xs text-slate-500">
                  Paste the URL of a model page from eagleboats.nl (e.g., https://eagleboats.nl/models/eagle-25ts)
                </p>
                <div className="flex gap-2">
                  <Input
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://eagleboats.nl/models/..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleFetchImportUrl}
                    disabled={isLoadingImport || !importUrl.trim()}
                  >
                    {isLoadingImport ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span className="ml-1">Fetch</span>
                  </Button>
                </div>
              </div>

              {importError && (
                <div className="flex items-center gap-2 text-red-600 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{importError}</span>
                </div>
              )}

              <div className="text-xs text-slate-500 border-t pt-3">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Visit eagleboats.nl and find the model you want</li>
                  <li>Copy the model page URL</li>
                  <li>Paste the URL above and click "Fetch"</li>
                  <li>Preview the extracted data and select what to import</li>
                  <li>Confirm to import the selected content</li>
                </ol>
                <p className="mt-2 text-slate-400">
                  Content is imported once and becomes editable. No automatic sync.
                </p>
              </div>
            </div>
          )}

          {importStep === 'fields' && selectedImport && importSelections && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleImportBack}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <span className="text-xs text-slate-500">Choose fields to import</span>
              </div>
              <div className="border rounded p-2">
                <div className="font-medium mb-1">{selectedImport.modelName}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Checkbox
                      checked={importSelections.coreFields.name}
                      onCheckedChange={() => handleImportFieldToggle('name', 'coreFields')}
                    /> <span className="text-xs">Name</span>
                  </div>
                  <div>
                    <Checkbox
                      checked={importSelections.coreFields.range}
                      onCheckedChange={() => handleImportFieldToggle('range', 'coreFields')}
                    /> <span className="text-xs">Range</span>
                  </div>
                  <div>
                    <Checkbox
                      checked={importSelections.coreFields.description}
                      onCheckedChange={() => handleImportFieldToggle('description', 'coreFields')}
                    /> <span className="text-xs">Description</span>
                  </div>
                </div>
              </div>
              <div className="border rounded p-2">
                <div className="font-medium mb-1">Specs</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Checkbox
                      checked={importSelections.specs.lengthOverallM}
                      onCheckedChange={() => handleImportFieldToggle('lengthOverallM', 'specs')}
                    /> <span className="text-xs">Length</span>
                  </div>
                  <div>
                    <Checkbox
                      checked={importSelections.specs.beamOverallM}
                      onCheckedChange={() => handleImportFieldToggle('beamOverallM', 'specs')}
                    /> <span className="text-xs">Beam</span>
                  </div>
                  <div>
                    <Checkbox
                      checked={importSelections.specs.draftM}
                      onCheckedChange={() => handleImportFieldToggle('draftM', 'specs')}
                    /> <span className="text-xs">Draft</span>
                  </div>
                  <div>
                    <Checkbox
                      checked={importSelections.specs.displacementLightKg}
                      onCheckedChange={() => handleImportFieldToggle('displacementLightKg', 'specs')}
                    /> <span className="text-xs">Displacement</span>
                  </div>
                  <div>
                    <Checkbox
                      checked={importSelections.specs.maxPersons}
                      onCheckedChange={() => handleImportFieldToggle('maxPersons', 'specs')}
                    /> <span className="text-xs">Max Persons</span>
                  </div>
                </div>
              </div>
              <div className="border rounded p-2">
                <div className="font-medium mb-1">Sales Sections</div>
                <div className="space-y-1">
                  {selectedImport.salesSections.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        checked={importSelections.salesSections[i]}
                        onCheckedChange={() => handleImportSalesSectionToggle(i)}
                      />
                      <span className="text-xs">{s.heading}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded p-2">
                <div className="font-medium mb-1">Sales Images</div>
                <div className="space-y-1">
                  {selectedImport.salesImages.map((img, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        checked={importSelections.salesImages[i]}
                        onCheckedChange={() => handleImportSalesImageToggle(i)}
                      />
                      <span className="text-xs">{img.caption || img.sourceUrl}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Import Mode:</Label>
                <Select value={importSelections.mode} onValueChange={handleImportModeChange as any}>
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD_ONLY">Add Only</SelectItem>
                    <SelectItem value="OVERWRITE">Overwrite</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-400">
                  {importSelections.mode === 'ADD_ONLY'
                    ? 'Only fills empty fields, appends sections/images'
                    : 'Overwrites checked fields, replaces checked sections/images'}
                </span>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleImportNext}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {importStep === 'confirm' && selectedImport && importSelections && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleImportBack}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <span className="text-xs text-slate-500">Confirm import</span>
              </div>
              <div className="text-xs mb-2">
                You are about to import data from <span className="font-medium">{selectedImport.modelName}</span> ({selectedImport.range}) from eagleboats.nl.
              </div>
              <div className="text-xs mb-2">
                <span className="font-medium">Mode:</span> {importSelections.mode === 'ADD_ONLY' ? 'Add Only' : 'Overwrite'}
              </div>
              <div className="text-xs mb-2">
                <span className="font-medium">Fields:</span>
                <ul className="list-disc ml-5">
                  {Object.entries(importSelections.coreFields).filter(([_, v]) => v).map(([k]) => (
                    <li key={k}>{k}</li>
                  ))}
                  {Object.entries(importSelections.specs).filter(([_, v]) => v).map(([k]) => (
                    <li key={k}>spec: {k}</li>
                  ))}
                  {importSelections.salesSections.filter(Boolean).length > 0 && (
                    <li>Sales Sections ({importSelections.salesSections.filter(Boolean).length})</li>
                  )}
                  {importSelections.salesImages.filter(Boolean).length > 0 && (
                    <li>Sales Images ({importSelections.salesImages.filter(Boolean).length})</li>
                  )}
                </ul>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleDoImport}
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={importing}
                >
                  {importing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Import
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
