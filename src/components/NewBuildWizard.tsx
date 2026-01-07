'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Ship, User, Package, FileText, ChevronRight, ChevronLeft, Check,
  Plus, Search, Zap, Battery, Anchor, Euro, AlertCircle, X, Fuel
} from 'lucide-react';
import { useStoreV3 } from '@/lib/store-v3';
import type { BoatModel, Client, EquipmentItem, PropulsionType } from '@/lib/types-v3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface NewBuildWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (projectId: string) => void;
}

type WizardStep = 'client' | 'model' | 'equipment' | 'review';

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'client', label: 'Klant', icon: <User className="w-5 h-5" /> },
  { id: 'model', label: 'Model', icon: <Ship className="w-5 h-5" /> },
  { id: 'equipment', label: 'Equipment', icon: <Package className="w-5 h-5" /> },
  { id: 'review', label: 'Controleren', icon: <FileText className="w-5 h-5" /> },
];

// Sample equipment items for demo
const SAMPLE_EQUIPMENT: Omit<EquipmentItem, 'id'>[] = [
  // Propulsion
  { category: 'Propulsion', name: 'Torqeedo Cruise 10.0', description: 'Electric outboard motor', quantity: 1, unit: 'st', unitPriceExclVat: 8500, lineTotalExclVat: 8500, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 1 },
  { category: 'Propulsion', name: 'Lithium Battery Pack 48V 10kWh', description: 'High capacity battery system', quantity: 1, unit: 'st', unitPriceExclVat: 6500, lineTotalExclVat: 6500, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 2 },
  { category: 'Propulsion', name: 'Battery Management System', description: 'BMS with monitoring', quantity: 1, unit: 'st', unitPriceExclVat: 1200, lineTotalExclVat: 1200, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 3 },
  // Electrical
  { category: 'Electrical', name: 'Shore Power Inlet 230V', description: 'CEE connector', quantity: 1, unit: 'st', unitPriceExclVat: 450, lineTotalExclVat: 450, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: false, sortOrder: 10 },
  { category: 'Electrical', name: 'Victron Charger 3000W', description: 'Onboard battery charger', quantity: 1, unit: 'st', unitPriceExclVat: 1800, lineTotalExclVat: 1800, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: false, safetyCritical: false, sortOrder: 11 },
  { category: 'Electrical', name: 'LED Navigation Lights', description: 'Complete set', quantity: 1, unit: 'set', unitPriceExclVat: 650, lineTotalExclVat: 650, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 12 },
  // Navigation
  { category: 'Navigation', name: 'Garmin ECHOMAP 93sv', description: '9" Chartplotter with sonar', quantity: 1, unit: 'st', unitPriceExclVat: 1850, lineTotalExclVat: 1850, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 20 },
  { category: 'Navigation', name: 'VHF Radio', description: 'Fixed mount with DSC', quantity: 1, unit: 'st', unitPriceExclVat: 450, lineTotalExclVat: 450, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 21 },
  // Safety
  { category: 'Safety', name: 'Fire Extinguisher 2kg', description: 'ABC powder type', quantity: 2, unit: 'st', unitPriceExclVat: 45, lineTotalExclVat: 90, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 30 },
  { category: 'Safety', name: 'Life Jackets 150N', description: 'Automatic inflatable', quantity: 6, unit: 'st', unitPriceExclVat: 125, lineTotalExclVat: 750, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 31 },
  { category: 'Safety', name: 'First Aid Kit', description: 'Marine approved', quantity: 1, unit: 'st', unitPriceExclVat: 85, lineTotalExclVat: 85, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 32 },
  { category: 'Safety', name: 'Bilge Pump Electric', description: 'Automatic with float switch', quantity: 1, unit: 'st', unitPriceExclVat: 180, lineTotalExclVat: 180, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 33 },
  // Comfort
  { category: 'Comfort', name: 'Premium Upholstery Package', description: 'Marine grade vinyl', quantity: 1, unit: 'set', unitPriceExclVat: 3500, lineTotalExclVat: 3500, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: false, safetyCritical: false, sortOrder: 40 },
  { category: 'Comfort', name: 'Bimini Top', description: 'With stainless frame', quantity: 1, unit: 'st', unitPriceExclVat: 1800, lineTotalExclVat: 1800, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 41 },
  { category: 'Comfort', name: 'Swimming Ladder', description: 'Telescopic stainless', quantity: 1, unit: 'st', unitPriceExclVat: 350, lineTotalExclVat: 350, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: false, safetyCritical: false, sortOrder: 42 },
  // Deck
  { category: 'Deck', name: 'Anchor Package', description: 'Anchor, chain, rope', quantity: 1, unit: 'set', unitPriceExclVat: 450, lineTotalExclVat: 450, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: false, safetyCritical: false, sortOrder: 50 },
  { category: 'Deck', name: 'Fender Set', description: '4x fenders with lines', quantity: 1, unit: 'set', unitPriceExclVat: 280, lineTotalExclVat: 280, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: false, safetyCritical: false, sortOrder: 51 },
  { category: 'Deck', name: 'Mooring Lines', description: '4x 10m polyester', quantity: 1, unit: 'set', unitPriceExclVat: 120, lineTotalExclVat: 120, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: false, safetyCritical: false, sortOrder: 52 },
];

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function NewBuildWizard({ isOpen, onClose, onComplete }: NewBuildWizardProps) {
  const { clients, models, createProject, addClient, addEquipmentItem, recalculateEquipmentTotals } = useStoreV3();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('client');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Form data
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedPropulsion, setSelectedPropulsion] = useState<PropulsionType>('Electric');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [equipmentItems, setEquipmentItems] = useState<(Omit<EquipmentItem, 'id'> & { tempId: string })[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // New client form
  const [newClient, setNewClient] = useState({
    name: '',
    type: 'private' as 'company' | 'private',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: '',
    country: 'Nederland',
  });

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('client');
      setSelectedClientId('');
      setSelectedModelId('');
      setSelectedPropulsion('Electric');
      setProjectTitle('');
      setProjectNotes('');
      setEquipmentItems([]);
      setClientSearch('');
      setModelSearch('');
      setIsCreatingClient(false);
    }
  }, [isOpen]);

  // Get selected entities
  const selectedClient = useMemo(() =>
    clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedModel = useMemo(() =>
    models.find(m => m.id === selectedModelId),
    [models, selectedModelId]
  );

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const search = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search)
    );
  }, [clients, clientSearch]);

  // Filter models by search (show all models, not just active)
  const filteredModels = useMemo(() => {
    let result = models;
    if (modelSearch.trim()) {
      const search = modelSearch.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(search) ||
        m.range?.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      );
    }
    // Sort: active first, then by name
    return result.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models, modelSearch]);

  // Calculate equipment totals
  const equipmentTotals = useMemo(() => {
    const included = equipmentItems.filter(i => i.isIncluded);
    const subtotal = included.reduce((sum, i) => sum + i.lineTotalExclVat, 0);
    const vatRate = 21;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    return { subtotal, vatRate, vatAmount, total, itemCount: included.length };
  }, [equipmentItems]);

  // Initialize equipment when model is selected
  const initializeEquipment = (model: BoatModel) => {
    // Add base boat
    const items: (Omit<EquipmentItem, 'id'> & { tempId: string })[] = [
      {
        tempId: `temp-${Date.now()}-base`,
        category: 'Base',
        name: `${model.name} - Basis Boot`,
        description: `Complete ${model.name} aluminium romp`,
        quantity: 1,
        unit: 'st',
        unitPriceExclVat: model.basePriceExclVat,
        lineTotalExclVat: model.basePriceExclVat,
        isStandard: true,
        isOptional: false,
        isIncluded: true,
        ceRelevant: true,
        safetyCritical: false,
        sortOrder: 0,
      },
      // Add sample equipment
      ...SAMPLE_EQUIPMENT.map((item, idx) => ({
        ...item,
        tempId: `temp-${Date.now()}-${idx}`,
      })),
    ];
    setEquipmentItems(items);
  };

  // Handle client selection (toggle)
  const handleClientSelect = (clientId: string) => {
    if (selectedClientId === clientId) {
      // Deselect if clicking same client
      setSelectedClientId('');
    } else {
      setSelectedClientId(clientId);
    }
  };

  // Handle model selection (toggle)
  const handleModelSelect = (modelId: string) => {
    if (selectedModelId === modelId) {
      // Deselect if clicking same model
      setSelectedModelId('');
      setEquipmentItems([]);
      setProjectTitle('');
    } else {
      setSelectedModelId(modelId);
      const model = models.find(m => m.id === modelId);
      if (model) {
        setSelectedPropulsion(model.defaultPropulsion);
        initializeEquipment(model);
        // Auto-generate project title
        if (selectedClient) {
          setProjectTitle(`${selectedClient.name} - ${model.name} ${model.defaultPropulsion}`);
        } else {
          setProjectTitle(`${model.name} ${model.defaultPropulsion}`);
        }
      }
    }
  };

  // Toggle equipment item
  const toggleEquipmentItem = (tempId: string) => {
    setEquipmentItems(prev => prev.map(item =>
      item.tempId === tempId ? { ...item, isIncluded: !item.isIncluded } : item
    ));
  };

  // Step navigation
  const canProceed = () => {
    switch (currentStep) {
      case 'client':
        return !!selectedClientId;
      case 'model':
        return !!selectedModelId;
      case 'equipment':
        return equipmentItems.some(i => i.isIncluded);
      case 'review':
        return !!projectTitle && !!selectedClientId && !!selectedModelId;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    const currentIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[currentIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(WIZARD_STEPS[currentIndex - 1].id);
    }
  };

  // Create project
  const handleCreateProject = () => {
    if (!selectedClientId || !selectedModelId || !projectTitle) return;

    // Create the project
    const project = createProject({
      title: projectTitle,
      projectType: 'NEW_BUILD',
      clientId: selectedClientId,
      modelId: selectedModelId,
      propulsionType: selectedPropulsion,
    });

    // Add equipment items
    for (const item of equipmentItems) {
      if (item.isIncluded) {
        const { tempId, ...itemData } = item;
        addEquipmentItem(project.id, itemData);
      }
    }

    // Recalculate totals
    recalculateEquipmentTotals(project.id);

    // Complete
    onComplete(project.id);
  };

  // Handle create new client
  const handleCreateClient = () => {
    if (!newClient.name) return;

    const client = addClient({
      ...newClient,
      status: 'active',
    });

    setSelectedClientId(client.id);
    setIsCreatingClient(false);
    setNewClient({
      name: '',
      type: 'private',
      email: '',
      phone: '',
      street: '',
      postalCode: '',
      city: '',
      country: 'Nederland',
    });
  };

  // Update title when client or model changes
  useEffect(() => {
    if (selectedClient && selectedModel) {
      setProjectTitle(`${selectedClient.name} - ${selectedModel.name} ${selectedPropulsion}`);
    } else if (selectedModel) {
      setProjectTitle(`${selectedModel.name} ${selectedPropulsion}`);
    }
  }, [selectedClient, selectedModel, selectedPropulsion]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Ship className="w-6 h-6 text-emerald-600" />
            Nieuwe Nieuwbouw
          </DialogTitle>
          <DialogDescription>
            Configureer een nieuw bouwproject stap voor stap
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-slate-50 border-b">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const isCurrent = step.id === currentStep;
              const isPast = WIZARD_STEPS.findIndex(s => s.id === currentStep) > index;

              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      // Allow clicking on past steps to go back
                      if (isPast) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`flex items-center gap-2 ${isPast ? 'cursor-pointer' : 'cursor-default'}`}
                    disabled={!isPast && !isCurrent}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isPast ? 'bg-emerald-500 text-white' :
                        isCurrent ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' :
                        'bg-slate-200 text-slate-500'}
                    `}>
                      {isPast ? <Check className="w-5 h-5" /> : step.icon}
                    </div>
                    <span className={`text-sm font-medium ${isCurrent ? 'text-emerald-700' : isPast ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {step.label}
                    </span>
                  </button>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${isPast ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6">
            {/* Step 1: Client Selection */}
            {currentStep === 'client' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Selecteer Klant</h3>
                    <p className="text-sm text-slate-600">Kies een bestaande klant of maak een nieuwe aan</p>
                  </div>
                  <Button onClick={() => setIsCreatingClient(true)} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Klant
                  </Button>
                </div>

                {/* Selected client indicator */}
                {selectedClient && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">Geselecteerd: {selectedClient.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClientId('')}
                      className="ml-auto text-slate-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoek op naam of email..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  {filteredClients.map(client => (
                    <div
                      key={client.id}
                      onClick={() => handleClientSelect(client.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedClientId === client.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.email && (
                            <p className="text-sm text-slate-600">{client.email}</p>
                          )}
                          {client.city && (
                            <p className="text-sm text-slate-500">{client.city}, {client.country}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {client.type === 'company' ? 'Bedrijf' : 'Particulier'}
                          </Badge>
                          {selectedClientId === client.id && (
                            <Check className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredClients.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Geen klanten gevonden</p>
                    <Button onClick={() => setIsCreatingClient(true)} className="mt-4" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Nieuwe Klant Aanmaken
                    </Button>
                  </div>
                )}

                {/* New Client Dialog */}
                <Dialog open={isCreatingClient} onOpenChange={setIsCreatingClient}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Klant</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Naam *</Label>
                        <Input
                          value={newClient.name}
                          onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                          placeholder="Volledige naam of bedrijfsnaam"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={newClient.type}
                          onValueChange={(v) => setNewClient({ ...newClient, type: v as 'company' | 'private' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Particulier</SelectItem>
                            <SelectItem value="company">Bedrijf</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Telefoon</Label>
                          <Input
                            value={newClient.phone}
                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Adres</Label>
                        <Input
                          value={newClient.street}
                          onChange={(e) => setNewClient({ ...newClient, street: e.target.value })}
                          placeholder="Straat en huisnummer"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Postcode</Label>
                          <Input
                            value={newClient.postalCode}
                            onChange={(e) => setNewClient({ ...newClient, postalCode: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Plaats</Label>
                          <Input
                            value={newClient.city}
                            onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Land</Label>
                          <Input
                            value={newClient.country}
                            onChange={(e) => setNewClient({ ...newClient, country: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreatingClient(false)}>
                        Annuleren
                      </Button>
                      <Button onClick={handleCreateClient} disabled={!newClient.name}>
                        Klant Aanmaken
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Step 2: Model Selection */}
            {currentStep === 'model' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Selecteer Boot Model</h3>
                  <p className="text-sm text-slate-600">Kies het Eagle Boats model voor dit project</p>
                </div>

                {/* Selected model indicator */}
                {selectedModel && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">Geselecteerd: {selectedModel.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedModelId('');
                        setEquipmentItems([]);
                      }}
                      className="ml-auto text-slate-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Zoek op modelnaam..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Models count */}
                <div className="text-sm text-slate-500">
                  {filteredModels.length} model{filteredModels.length !== 1 ? 'len' : ''} beschikbaar
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto">
                  {filteredModels.map(model => (
                    <div
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedModelId === model.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : model.isActive
                            ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            : 'border-slate-100 bg-slate-50 opacity-60'}
                      `}
                    >
                      <div className="flex gap-4">
                        {model.imageUrl ? (
                          <div className="w-24 h-16 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={model.imageUrl}
                              alt={model.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-16 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                            <Ship className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{model.name}</p>
                            <div className="flex items-center gap-1">
                              {model.range && <Badge variant="outline" className="text-xs">{model.range}</Badge>}
                              {!model.isActive && <Badge variant="outline" className="text-xs bg-slate-100">Inactief</Badge>}
                              {selectedModelId === model.id && <Check className="w-5 h-5 text-emerald-600" />}
                            </div>
                          </div>
                          {model.description && (
                            <p className="text-sm text-slate-600 line-clamp-1">{model.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>{model.lengthM}m x {model.beamM}m</span>
                            <span>Max {model.maxPersons} pers.</span>
                            <span>Cat. {model.designCategory}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm font-medium text-emerald-600">
                              Vanaf {formatCurrency(model.basePriceExclVat)}
                            </p>
                            <div className="flex gap-1">
                              {model.availablePropulsion?.map(prop => (
                                <span key={prop} className="text-xs text-slate-400">
                                  {prop === 'Electric' && <Zap className="w-3 h-3 inline" />}
                                  {prop === 'Hybrid' && <Battery className="w-3 h-3 inline" />}
                                  {prop === 'Diesel' && <Fuel className="w-3 h-3 inline" />}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredModels.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Ship className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Geen modellen gevonden</p>
                  </div>
                )}

                {/* Propulsion Selection */}
                {selectedModel && selectedModel.availablePropulsion && selectedModel.availablePropulsion.length > 1 && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                    <Label className="mb-3 block">Voortstuwing Type</Label>
                    <RadioGroup
                      value={selectedPropulsion}
                      onValueChange={(v) => setSelectedPropulsion(v as PropulsionType)}
                      className="flex gap-4"
                    >
                      {selectedModel.availablePropulsion.map(prop => (
                        <div key={prop} className="flex items-center space-x-2">
                          <RadioGroupItem value={prop} id={prop} />
                          <Label htmlFor={prop} className="flex items-center gap-2 cursor-pointer">
                            {prop === 'Electric' && <Zap className="w-4 h-4 text-emerald-500" />}
                            {prop === 'Hybrid' && <Battery className="w-4 h-4 text-blue-500" />}
                            {prop === 'Diesel' && <Fuel className="w-4 h-4 text-slate-500" />}
                            {prop === 'Outboard' && <Anchor className="w-4 h-4 text-slate-500" />}
                            {prop}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Equipment Configuration */}
            {currentStep === 'equipment' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Equipment Configuratie</h3>
                    <p className="text-sm text-slate-600">Selecteer de uitrusting voor deze boot</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">{equipmentTotals.itemCount} items geselecteerd</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(equipmentTotals.total)}</p>
                  </div>
                </div>

                {/* Group by category */}
                {['Base', 'Propulsion', 'Electrical', 'Navigation', 'Safety', 'Comfort', 'Deck'].map(category => {
                  const items = equipmentItems.filter(i => i.category === category);
                  if (items.length === 0) return null;

                  const categoryLabels: Record<string, string> = {
                    Base: 'Basis Boot',
                    Propulsion: 'Voortstuwing',
                    Electrical: 'Elektrisch',
                    Navigation: 'Navigatie',
                    Safety: 'Veiligheid',
                    Comfort: 'Comfort',
                    Deck: 'Dekuitrusting',
                  };

                  return (
                    <div key={category} className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 font-medium text-slate-700">
                        {categoryLabels[category] || category}
                      </div>
                      <div className="divide-y">
                        {items.map(item => (
                          <div
                            key={item.tempId}
                            className={`flex items-center gap-4 p-4 ${
                              item.isIncluded ? 'bg-white' : 'bg-slate-50 opacity-60'
                            }`}
                          >
                            <Checkbox
                              checked={item.isIncluded}
                              onCheckedChange={() => toggleEquipmentItem(item.tempId)}
                              disabled={item.isStandard && !item.isOptional}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{item.name}</p>
                                {item.isStandard && (
                                  <Badge variant="outline" className="text-xs">Standaard</Badge>
                                )}
                                {item.isOptional && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Optie</Badge>
                                )}
                                {item.ceRelevant && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">CE</Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-slate-500">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm">{item.quantity} {item.unit}</p>
                              <p className="font-mono font-medium">{formatCurrency(item.lineTotalExclVat)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {equipmentItems.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Selecteer eerst een model om equipment te configureren</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Controleer en Bevestig</h3>
                  <p className="text-sm text-slate-600">Controleer de projectgegevens voordat u doorgaat</p>
                </div>

                {/* Project Title */}
                <div>
                  <Label>Project Titel *</Label>
                  <Input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Bijv. Van der Berg - Eagle 28TS Electric"
                    className="mt-1"
                  />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-600" />
                        Klant
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedClient ? (
                        <div className="text-sm">
                          <p className="font-medium">{selectedClient.name}</p>
                          {selectedClient.email && <p className="text-slate-600">{selectedClient.email}</p>}
                          {selectedClient.city && <p className="text-slate-600">{selectedClient.city}</p>}
                        </div>
                      ) : (
                        <p className="text-sm text-red-500">Geen klant geselecteerd</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Model */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Ship className="w-4 h-4 text-blue-600" />
                        Boot Model
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedModel ? (
                        <div className="text-sm">
                          <p className="font-medium">{selectedModel.name}</p>
                          <p className="text-slate-600">{selectedPropulsion} voortstuwing</p>
                          <p className="text-slate-600">
                            {selectedModel.lengthM}m - Max {selectedModel.maxPersons} personen
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-500">Geen model geselecteerd</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Equipment Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-600" />
                      Equipment Samenvatting
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Aantal items</span>
                        <span>{equipmentTotals.itemCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subtotaal excl. BTW</span>
                        <span className="font-mono">{formatCurrency(equipmentTotals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>BTW ({equipmentTotals.vatRate}%)</span>
                        <span className="font-mono">{formatCurrency(equipmentTotals.vatAmount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Totaal incl. BTW</span>
                        <span className="font-mono text-emerald-600">{formatCurrency(equipmentTotals.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <div>
                  <Label>Opmerkingen (optioneel)</Label>
                  <Textarea
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    placeholder="Eventuele opmerkingen over dit project..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Validation warnings */}
                {(!selectedClientId || !selectedModelId) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>
                      {!selectedClientId && 'Selecteer een klant. '}
                      {!selectedModelId && 'Selecteer een model.'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 'client' ? onClose : goToPrevStep}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {currentStep === 'client' ? 'Annuleren' : 'Vorige'}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep !== 'review' ? (
              <Button
                onClick={goToNextStep}
                disabled={!canProceed()}
              >
                Volgende
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateProject}
                disabled={!canProceed()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Project Aanmaken
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewBuildWizard;
