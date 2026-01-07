'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Ship, User, Package, FileText, ChevronRight, ChevronLeft, Check,
  Plus, Search, Zap, Battery, Anchor, AlertCircle, X, Fuel,
  Wrench, Settings, Info
} from 'lucide-react';
import { useStoreV3 } from '@/lib/store-v3';
import type { BoatModel, Client, EquipmentItem, PropulsionType, ProjectType } from '@/lib/types-v3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (projectId: string) => void;
  defaultProjectType?: ProjectType;
}

type WizardStep = 'type' | 'client' | 'boat' | 'scope' | 'review';

const PROJECT_TYPE_INFO: Record<ProjectType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = {
  NEW_BUILD: {
    label: 'New Build',
    description: 'Build a new boat from scratch based on a model template',
    icon: <Ship className="w-8 h-8" />,
    color: 'emerald',
  },
  REFIT: {
    label: 'Refit',
    description: 'Major renovation or modification of an existing vessel',
    icon: <Wrench className="w-8 h-8" />,
    color: 'blue',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    description: 'Regular maintenance, repairs, or service work',
    icon: <Settings className="w-8 h-8" />,
    color: 'orange',
  },
};

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'type', label: 'Project Type', icon: <FileText className="w-5 h-5" /> },
  { id: 'client', label: 'Client', icon: <User className="w-5 h-5" /> },
  { id: 'boat', label: 'Boat', icon: <Ship className="w-5 h-5" /> },
  { id: 'scope', label: 'Scope', icon: <Package className="w-5 h-5" /> },
  { id: 'review', label: 'Review', icon: <Check className="w-5 h-5" /> },
];

// Equipment items for New Build
const NEW_BUILD_EQUIPMENT: Omit<EquipmentItem, 'id'>[] = [
  { category: 'Propulsion', name: 'Torqeedo Cruise 10.0', description: 'Electric outboard motor', quantity: 1, unit: 'pcs', unitPriceExclVat: 8500, lineTotalExclVat: 8500, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 1 },
  { category: 'Propulsion', name: 'Lithium Battery Pack 48V 10kWh', description: 'High capacity battery system', quantity: 1, unit: 'pcs', unitPriceExclVat: 6500, lineTotalExclVat: 6500, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 2 },
  { category: 'Electrical', name: 'Shore Power Inlet 230V', description: 'CEE connector', quantity: 1, unit: 'pcs', unitPriceExclVat: 450, lineTotalExclVat: 450, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: false, sortOrder: 10 },
  { category: 'Electrical', name: 'LED Navigation Lights', description: 'Complete set', quantity: 1, unit: 'set', unitPriceExclVat: 650, lineTotalExclVat: 650, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 11 },
  { category: 'Safety', name: 'Fire Extinguisher 2kg', description: 'ABC powder type', quantity: 2, unit: 'pcs', unitPriceExclVat: 45, lineTotalExclVat: 90, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 30 },
  { category: 'Safety', name: 'Life Jackets 150N', description: 'Automatic inflatable', quantity: 6, unit: 'pcs', unitPriceExclVat: 125, lineTotalExclVat: 750, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: true, sortOrder: 31 },
  { category: 'Navigation', name: 'Garmin ECHOMAP 93sv', description: '9" Chartplotter with sonar', quantity: 1, unit: 'pcs', unitPriceExclVat: 1850, lineTotalExclVat: 1850, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 20 },
  { category: 'Comfort', name: 'Bimini Top', description: 'With stainless frame', quantity: 1, unit: 'pcs', unitPriceExclVat: 1800, lineTotalExclVat: 1800, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 40 },
];

// Equipment items for Refit
const REFIT_EQUIPMENT: Omit<EquipmentItem, 'id'>[] = [
  { category: 'Hull Work', name: 'Antifouling Renewal', description: 'Strip and repaint with new antifouling', quantity: 1, unit: 'job', unitPriceExclVat: 2500, lineTotalExclVat: 2500, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 1 },
  { category: 'Hull Work', name: 'Hull Inspection & Report', description: 'Full survey and condition report', quantity: 1, unit: 'job', unitPriceExclVat: 850, lineTotalExclVat: 850, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 2 },
  { category: 'Propulsion', name: 'Engine Service', description: 'Full engine service and oil change', quantity: 1, unit: 'job', unitPriceExclVat: 650, lineTotalExclVat: 650, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 10 },
  { category: 'Electrical', name: 'Battery Replacement', description: 'New batteries with installation', quantity: 1, unit: 'set', unitPriceExclVat: 3500, lineTotalExclVat: 3500, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 20 },
  { category: 'Interior', name: 'Upholstery Renovation', description: 'New cushion covers and panels', quantity: 1, unit: 'set', unitPriceExclVat: 5500, lineTotalExclVat: 5500, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 30 },
  { category: 'Safety', name: 'Safety Equipment Update', description: 'New flares, fire ext., first aid', quantity: 1, unit: 'set', unitPriceExclVat: 650, lineTotalExclVat: 650, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: true, safetyCritical: true, sortOrder: 40 },
];

// Equipment items for Maintenance
const MAINTENANCE_EQUIPMENT: Omit<EquipmentItem, 'id'>[] = [
  { category: 'Service', name: 'Annual Service Package', description: 'Full annual maintenance check', quantity: 1, unit: 'job', unitPriceExclVat: 950, lineTotalExclVat: 950, isStandard: false, isOptional: true, isIncluded: true, ceRelevant: false, safetyCritical: false, sortOrder: 1 },
  { category: 'Service', name: 'Pre-Season Check', description: 'Spring commissioning service', quantity: 1, unit: 'job', unitPriceExclVat: 450, lineTotalExclVat: 450, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 2 },
  { category: 'Cleaning', name: 'Full Detail Cleaning', description: 'Interior and exterior cleaning', quantity: 1, unit: 'job', unitPriceExclVat: 350, lineTotalExclVat: 350, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 10 },
  { category: 'Repair', name: 'Gel Coat Touch-Up', description: 'Small repairs and touch-ups', quantity: 1, unit: 'job', unitPriceExclVat: 150, lineTotalExclVat: 150, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 20 },
  { category: 'Labor', name: 'Workshop Labor', description: 'General workshop time', quantity: 1, unit: 'hour', unitPriceExclVat: 85, lineTotalExclVat: 85, isStandard: false, isOptional: true, isIncluded: false, ceRelevant: false, safetyCritical: false, sortOrder: 100 },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(value);
}

export function ProjectWizard({ isOpen, onClose, onComplete, defaultProjectType }: ProjectWizardProps) {
  const { clients, models, createProject, addClient, addEquipmentItem, recalculateEquipmentTotals } = useStoreV3();

  const [currentStep, setCurrentStep] = useState<WizardStep>(defaultProjectType ? 'client' : 'type');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType>(defaultProjectType || 'NEW_BUILD');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedPropulsion, setSelectedPropulsion] = useState<PropulsionType>('Electric');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [equipmentItems, setEquipmentItems] = useState<(Omit<EquipmentItem, 'id'> & { tempId: string })[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  const [existingBoat, setExistingBoat] = useState({
    name: '', hullId: '', make: '', model: '', year: new Date().getFullYear(),
    registrationNumber: '', homePort: '', engineHours: 0,
  });

  const [newClient, setNewClient] = useState({
    name: '', type: 'private' as 'company' | 'private', email: '', phone: '',
    street: '', postalCode: '', city: '', country: 'Netherlands',
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(defaultProjectType ? 'client' : 'type');
      setProjectType(defaultProjectType || 'NEW_BUILD');
      setSelectedClientId('');
      setSelectedModelId('');
      setSelectedPropulsion('Electric');
      setProjectTitle('');
      setProjectNotes('');
      setEquipmentItems([]);
      setClientSearch('');
      setModelSearch('');
      setIsCreatingClient(false);
      setExistingBoat({ name: '', hullId: '', make: '', model: '', year: new Date().getFullYear(), registrationNumber: '', homePort: '', engineHours: 0 });
    }
  }, [isOpen, defaultProjectType]);

  const activeSteps = useMemo(() => WIZARD_STEPS, []);
  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
  const selectedModel = useMemo(() => models.find(m => m.id === selectedModelId), [models, selectedModelId]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const search = clientSearch.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(search) || c.email?.toLowerCase().includes(search));
  }, [clients, clientSearch]);

  const filteredModels = useMemo(() => {
    let result = models;
    if (modelSearch.trim()) {
      const search = modelSearch.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(search) || m.range?.toLowerCase().includes(search));
    }
    return result.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models, modelSearch]);

  const equipmentTotals = useMemo(() => {
    const included = equipmentItems.filter(i => i.isIncluded);
    const subtotal = included.reduce((sum, i) => sum + i.lineTotalExclVat, 0);
    const vatRate = 21;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    return { subtotal, vatRate, vatAmount, total, itemCount: included.length };
  }, [equipmentItems]);

  const initializeEquipment = (type: ProjectType, model?: BoatModel) => {
    let items: Omit<EquipmentItem, 'id'>[] = [];
    if (type === 'NEW_BUILD' && model) {
      items = [
        { category: 'Base', name: `${model.name} - Base Boat`, description: `Complete ${model.name} aluminum hull`, quantity: 1, unit: 'pcs', unitPriceExclVat: model.basePriceExclVat, lineTotalExclVat: model.basePriceExclVat, isStandard: true, isOptional: false, isIncluded: true, ceRelevant: true, safetyCritical: false, sortOrder: 0 },
        ...NEW_BUILD_EQUIPMENT,
      ];
    } else if (type === 'REFIT') {
      items = REFIT_EQUIPMENT;
    } else {
      items = MAINTENANCE_EQUIPMENT;
    }
    setEquipmentItems(items.map((item, idx) => ({ ...item, tempId: `temp-${Date.now()}-${idx}` })));
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(selectedClientId === clientId ? '' : clientId);
  };

  const handleModelSelect = (modelId: string) => {
    if (selectedModelId === modelId) {
      setSelectedModelId('');
      setEquipmentItems([]);
      setProjectTitle('');
    } else {
      setSelectedModelId(modelId);
      const model = models.find(m => m.id === modelId);
      if (model) {
        setSelectedPropulsion(model.defaultPropulsion);
        initializeEquipment('NEW_BUILD', model);
        setProjectTitle(selectedClient ? `${selectedClient.name} - ${model.name} ${model.defaultPropulsion}` : `${model.name} ${model.defaultPropulsion}`);
      }
    }
  };

  const toggleEquipmentItem = (tempId: string) => {
    setEquipmentItems(prev => prev.map(item => item.tempId === tempId ? { ...item, isIncluded: !item.isIncluded } : item));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type': return !!projectType;
      case 'client': return !!selectedClientId;
      case 'boat': return projectType === 'NEW_BUILD' ? !!selectedModelId : !!(existingBoat.name || existingBoat.hullId);
      case 'scope': return equipmentItems.some(i => i.isIncluded);
      case 'review': return !!projectTitle && !!selectedClientId;
      default: return false;
    }
  };

  const goToNextStep = () => {
    const currentIndex = activeSteps.findIndex(s => s.id === currentStep);
    if (currentIndex < activeSteps.length - 1) {
      const nextStep = activeSteps[currentIndex + 1].id;
      if (nextStep === 'scope' && equipmentItems.length === 0 && projectType !== 'NEW_BUILD') {
        initializeEquipment(projectType);
      }
      setCurrentStep(nextStep);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = activeSteps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) setCurrentStep(activeSteps[currentIndex - 1].id);
  };

  const handleCreateProject = () => {
    if (!selectedClientId || !projectTitle) return;
    const project = createProject({
      title: projectTitle,
      projectType,
      clientId: selectedClientId,
      modelId: projectType === 'NEW_BUILD' ? selectedModelId : undefined,
      propulsionType: selectedPropulsion,
    });
    for (const item of equipmentItems) {
      if (item.isIncluded) {
        const { tempId, ...itemData } = item;
        addEquipmentItem(project.id, itemData);
      }
    }
    recalculateEquipmentTotals(project.id);
    onComplete(project.id);
  };

  const handleCreateClient = () => {
    if (!newClient.name) return;
    const client = addClient({ ...newClient, status: 'active' });
    setSelectedClientId(client.id);
    setIsCreatingClient(false);
    setNewClient({ name: '', type: 'private', email: '', phone: '', street: '', postalCode: '', city: '', country: 'Netherlands' });
  };

  useEffect(() => {
    if (projectType === 'NEW_BUILD' && selectedClient && selectedModel) {
      setProjectTitle(`${selectedClient.name} - ${selectedModel.name} ${selectedPropulsion}`);
    } else if (projectType !== 'NEW_BUILD') {
      const boatInfo = existingBoat.name || existingBoat.hullId || 'Unknown Vessel';
      const typeLabel = projectType === 'REFIT' ? 'Refit' : 'Service';
      setProjectTitle(selectedClient ? `${selectedClient.name} - ${boatInfo} ${typeLabel}` : `${boatInfo} ${typeLabel}`);
    }
  }, [selectedClient, selectedModel, selectedPropulsion, projectType, existingBoat.name, existingBoat.hullId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            {projectType === 'NEW_BUILD' && <Ship className="w-6 h-6 text-emerald-600" />}
            {projectType === 'REFIT' && <Wrench className="w-6 h-6 text-blue-600" />}
            {projectType === 'MAINTENANCE' && <Settings className="w-6 h-6 text-orange-600" />}
            New {PROJECT_TYPE_INFO[projectType].label} Project
          </DialogTitle>
          <DialogDescription>Configure your project step by step</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 bg-slate-50 border-b">
          <div className="flex items-center justify-between">
            {activeSteps.map((step, index) => {
              const isCurrent = step.id === currentStep;
              const isPast = activeSteps.findIndex(s => s.id === currentStep) > index;
              return (
                <React.Fragment key={step.id}>
                  <button type="button" onClick={() => isPast && setCurrentStep(step.id)} className={`flex items-center gap-2 ${isPast ? 'cursor-pointer' : 'cursor-default'}`} disabled={!isPast && !isCurrent}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isPast ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' : 'bg-slate-200 text-slate-500'}`}>
                      {isPast ? <Check className="w-5 h-5" /> : step.icon}
                    </div>
                    <span className={`text-sm font-medium ${isCurrent ? 'text-emerald-700' : isPast ? 'text-emerald-600' : 'text-slate-600'}`}>{step.label}</span>
                  </button>
                  {index < activeSteps.length - 1 && <div className={`flex-1 h-0.5 mx-4 ${isPast ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6">
            {currentStep === 'type' && (
              <div className="space-y-4">
                <div><h3 className="text-lg font-semibold">Select Project Type</h3><p className="text-sm text-slate-600">What kind of project are you starting?</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['NEW_BUILD', 'REFIT', 'MAINTENANCE'] as ProjectType[]).map(type => {
                    const info = PROJECT_TYPE_INFO[type];
                    const isSelected = projectType === type;
                    return (
                      <button key={type} type="button" onClick={() => setProjectType(type)} className={`p-6 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className={`mb-3 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>{info.icon}</div>
                        <h4 className="font-semibold text-lg">{info.label}</h4>
                        <p className="text-sm text-slate-600 mt-1">{info.description}</p>
                        {isSelected && <div className="mt-3 flex items-center text-sm font-medium text-emerald-600"><Check className="w-4 h-4 mr-1" />Selected</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 'client' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-lg font-semibold">Select Client</h3><p className="text-sm text-slate-600">Choose an existing client or create a new one</p></div>
                  <Button onClick={() => setIsCreatingClient(true)} variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" />New Client</Button>
                </div>
                {selectedClient && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Check className="w-5 h-5 text-emerald-600" /><span className="font-medium text-emerald-700">Selected: {selectedClient.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedClientId('')} className="ml-auto text-slate-500 hover:text-red-600"><X className="w-4 h-4" /></Button>
                  </div>
                )}
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search by name or email..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-10" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  {filteredClients.map(client => (
                    <div key={client.id} onClick={() => handleClientSelect(client.id)} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedClientId === client.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-start justify-between">
                        <div><p className="font-medium">{client.name}</p>{client.email && <p className="text-sm text-slate-600">{client.email}</p>}{client.city && <p className="text-sm text-slate-500">{client.city}, {client.country}</p>}</div>
                        <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{client.type === 'company' ? 'Company' : 'Private'}</Badge>{selectedClientId === client.id && <Check className="w-5 h-5 text-emerald-600" />}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredClients.length === 0 && <div className="text-center py-8 text-slate-500"><User className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No clients found</p><Button onClick={() => setIsCreatingClient(true)} className="mt-4" variant="outline"><Plus className="w-4 h-4 mr-2" />Create New Client</Button></div>}
                <Dialog open={isCreatingClient} onOpenChange={setIsCreatingClient}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Name *</Label><Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Full name or company name" /></div>
                      <div><Label>Type</Label><Select value={newClient.type} onValueChange={(v) => setNewClient({ ...newClient, type: v as 'company' | 'private' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="private">Private</SelectItem><SelectItem value="company">Company</SelectItem></SelectContent></Select></div>
                      <div className="grid grid-cols-2 gap-4"><div><Label>Email</Label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} /></div><div><Label>Phone</Label><Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} /></div></div>
                      <div><Label>Address</Label><Input value={newClient.street} onChange={(e) => setNewClient({ ...newClient, street: e.target.value })} placeholder="Street and number" /></div>
                      <div className="grid grid-cols-3 gap-4"><div><Label>Postal Code</Label><Input value={newClient.postalCode} onChange={(e) => setNewClient({ ...newClient, postalCode: e.target.value })} /></div><div><Label>City</Label><Input value={newClient.city} onChange={(e) => setNewClient({ ...newClient, city: e.target.value })} /></div><div><Label>Country</Label><Input value={newClient.country} onChange={(e) => setNewClient({ ...newClient, country: e.target.value })} /></div></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsCreatingClient(false)}>Cancel</Button><Button onClick={handleCreateClient} disabled={!newClient.name}>Create Client</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {currentStep === 'boat' && (
              <div className="space-y-4">
                {projectType === 'NEW_BUILD' ? (
                  <>
                    <div><h3 className="text-lg font-semibold">Select Boat Model</h3><p className="text-sm text-slate-600">Choose the Eagle Boats model for this project</p></div>
                    {selectedModel && <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg"><Check className="w-5 h-5 text-emerald-600" /><span className="font-medium text-emerald-700">Selected: {selectedModel.name}</span><Button variant="ghost" size="sm" onClick={() => { setSelectedModelId(''); setEquipmentItems([]); }} className="ml-auto text-slate-500 hover:text-red-600"><X className="w-4 h-4" /></Button></div>}
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search by model name..." value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} className="pl-10" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto">
                      {filteredModels.map(model => (
                        <div key={model.id} onClick={() => handleModelSelect(model.id)} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedModelId === model.id ? 'border-emerald-500 bg-emerald-50' : model.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                          <div className="flex gap-4">
                            {model.imageUrl ? <div className="w-24 h-16 bg-slate-100 rounded overflow-hidden flex-shrink-0"><img src={model.imageUrl} alt={model.name} className="w-full h-full object-cover" /></div> : <div className="w-24 h-16 bg-slate-100 rounded flex items-center justify-center flex-shrink-0"><Ship className="w-8 h-8 text-slate-400" /></div>}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between"><p className="font-semibold">{model.name}</p><div className="flex items-center gap-1">{model.range && <Badge variant="outline" className="text-xs">{model.range}</Badge>}{!model.isActive && <Badge variant="outline" className="text-xs bg-slate-100">Inactive</Badge>}{selectedModelId === model.id && <Check className="w-5 h-5 text-emerald-600" />}</div></div>
                              {model.description && <p className="text-sm text-slate-600 line-clamp-1">{model.description}</p>}
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500"><span>{model.lengthM}m x {model.beamM}m</span><span>Max {model.maxPersons} pers.</span></div>
                              <p className="text-sm font-medium text-emerald-600 mt-1">From {formatCurrency(model.basePriceExclVat)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedModel && selectedModel.availablePropulsion && selectedModel.availablePropulsion.length > 1 && (
                      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                        <Label className="mb-3 block">Propulsion Type</Label>
                        <RadioGroup value={selectedPropulsion} onValueChange={(v) => setSelectedPropulsion(v as PropulsionType)} className="flex gap-4">
                          {selectedModel.availablePropulsion.map(prop => (<div key={prop} className="flex items-center space-x-2"><RadioGroupItem value={prop} id={prop} /><Label htmlFor={prop} className="flex items-center gap-2 cursor-pointer">{prop === 'Electric' && <Zap className="w-4 h-4 text-emerald-500" />}{prop === 'Hybrid' && <Battery className="w-4 h-4 text-blue-500" />}{prop === 'Diesel' && <Fuel className="w-4 h-4 text-slate-500" />}{prop}</Label></div>))}
                        </RadioGroup>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div><h3 className="text-lg font-semibold">{projectType === 'REFIT' ? 'Vessel Information' : 'Boat Information'}</h3><p className="text-sm text-slate-600">{projectType === 'REFIT' ? 'Enter details about the vessel to be refitted' : 'Enter details about the boat requiring service'}</p></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Boat Name</Label><Input value={existingBoat.name} onChange={(e) => setExistingBoat({ ...existingBoat, name: e.target.value })} placeholder="e.g. Sea Spirit" /></div>
                      <div><Label>Hull ID (HIN)</Label><Input value={existingBoat.hullId} onChange={(e) => setExistingBoat({ ...existingBoat, hullId: e.target.value })} placeholder="e.g. NL-ABC12345D678" /></div>
                      <div><Label>Make</Label><Input value={existingBoat.make} onChange={(e) => setExistingBoat({ ...existingBoat, make: e.target.value })} placeholder="e.g. Eagle Boats" /></div>
                      <div><Label>Model</Label><Input value={existingBoat.model} onChange={(e) => setExistingBoat({ ...existingBoat, model: e.target.value })} placeholder="e.g. Eagle 28TS" /></div>
                      <div><Label>Year Built</Label><Input type="number" value={existingBoat.year} onChange={(e) => setExistingBoat({ ...existingBoat, year: parseInt(e.target.value) })} /></div>
                      <div><Label>Engine Hours</Label><Input type="number" value={existingBoat.engineHours} onChange={(e) => setExistingBoat({ ...existingBoat, engineHours: parseInt(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><div className="flex items-start gap-2"><Info className="w-5 h-5 text-blue-600 mt-0.5" /><div><p className="font-medium text-blue-800">{projectType === 'REFIT' ? 'Refit Project' : 'Maintenance Project'}</p><p className="text-sm text-blue-700 mt-1">{projectType === 'REFIT' ? 'A refit involves major work such as engine replacement, hull modifications, or propulsion system upgrades.' : 'Maintenance covers routine servicing, minor repairs, cleaning, and seasonal work.'}</p></div></div></div>
                  </>
                )}
              </div>
            )}

            {currentStep === 'scope' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><h3 className="text-lg font-semibold">{projectType === 'NEW_BUILD' ? 'Equipment Configuration' : 'Work Scope'}</h3><p className="text-sm text-slate-600">{projectType === 'NEW_BUILD' ? 'Select the equipment for this build' : 'Select the work items to include'}</p></div>
                  <div className="text-right"><p className="text-sm text-slate-600">{equipmentTotals.itemCount} items selected</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(equipmentTotals.total)}</p></div>
                </div>
                {(() => {
                  const categories = projectType === 'NEW_BUILD' ? ['Base', 'Propulsion', 'Electrical', 'Navigation', 'Safety', 'Comfort'] : projectType === 'REFIT' ? ['Hull Work', 'Propulsion', 'Electrical', 'Interior', 'Safety'] : ['Service', 'Cleaning', 'Repair', 'Labor'];
                  return categories.map(category => {
                    const items = equipmentItems.filter(i => i.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 font-medium text-slate-700">{category}</div>
                        <div className="divide-y">
                          {items.map(item => (
                            <div key={item.tempId} className={`flex items-center gap-4 p-4 ${item.isIncluded ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
                              <Checkbox checked={item.isIncluded} onCheckedChange={() => toggleEquipmentItem(item.tempId)} disabled={item.isStandard && !item.isOptional} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2"><p className="font-medium">{item.name}</p>{item.isStandard && <Badge variant="outline" className="text-xs">Standard</Badge>}{item.isOptional && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Optional</Badge>}</div>
                                {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                              </div>
                              <div className="text-right"><p className="font-mono text-sm">{item.quantity} {item.unit}</p><p className="font-mono font-medium">{formatCurrency(item.lineTotalExclVat)}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {currentStep === 'review' && (
              <div className="space-y-6">
                <div><h3 className="text-lg font-semibold">Review and Confirm</h3><p className="text-sm text-slate-600">Review the project details before creating</p></div>
                <div><Label>Project Title *</Label><Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="e.g. Smith - Eagle 28TS Electric" className="mt-1" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-purple-600" />Client</CardTitle></CardHeader><CardContent>{selectedClient ? <div className="text-sm"><p className="font-medium">{selectedClient.name}</p>{selectedClient.email && <p className="text-slate-600">{selectedClient.email}</p>}</div> : <p className="text-sm text-red-500">No client selected</p>}</CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Ship className="w-4 h-4 text-blue-600" />{projectType === 'NEW_BUILD' ? 'Boat Model' : 'Vessel'}</CardTitle></CardHeader><CardContent>{projectType === 'NEW_BUILD' ? (selectedModel ? <div className="text-sm"><p className="font-medium">{selectedModel.name}</p><p className="text-slate-600">{selectedPropulsion} propulsion</p></div> : <p className="text-sm text-red-500">No model selected</p>) : <div className="text-sm"><p className="font-medium">{existingBoat.name || existingBoat.hullId || 'Unknown Vessel'}</p>{existingBoat.make && <p className="text-slate-600">{existingBoat.make} {existingBoat.model}</p>}</div>}</CardContent></Card>
                </div>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-emerald-600" />{projectType === 'NEW_BUILD' ? 'Equipment Summary' : 'Work Scope Summary'}</CardTitle></CardHeader><CardContent><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Number of items</span><span>{equipmentTotals.itemCount}</span></div><div className="flex justify-between"><span>Subtotal excl. VAT</span><span className="font-mono">{formatCurrency(equipmentTotals.subtotal)}</span></div><div className="flex justify-between text-slate-600"><span>VAT ({equipmentTotals.vatRate}%)</span><span className="font-mono">{formatCurrency(equipmentTotals.vatAmount)}</span></div><Separator /><div className="flex justify-between font-bold"><span>Total incl. VAT</span><span className="font-mono text-emerald-600">{formatCurrency(equipmentTotals.total)}</span></div></div></CardContent></Card>
                <div><Label>Notes (optional)</Label><Textarea value={projectNotes} onChange={(e) => setProjectNotes(e.target.value)} placeholder="Any additional notes about this project..." rows={3} className="mt-1" /></div>
                {(!selectedClientId || (projectType === 'NEW_BUILD' && !selectedModelId)) && <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" /><span>{!selectedClientId && 'Please select a client. '}{projectType === 'NEW_BUILD' && !selectedModelId && 'Please select a model.'}</span></div>}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <Button variant="outline" onClick={currentStep === activeSteps[0].id ? onClose : goToPrevStep}><ChevronLeft className="w-4 h-4 mr-2" />{currentStep === activeSteps[0].id ? 'Cancel' : 'Previous'}</Button>
          <div className="flex items-center gap-2">
            {currentStep !== 'review' ? <Button onClick={goToNextStep} disabled={!canProceed()}>Next<ChevronRight className="w-4 h-4 ml-2" /></Button> : <Button onClick={handleCreateProject} disabled={!canProceed()} className="bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 mr-2" />Create Project</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProjectWizard;
