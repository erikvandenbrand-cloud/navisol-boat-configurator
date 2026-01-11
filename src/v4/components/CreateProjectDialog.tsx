'use client';

import { useState, useEffect } from 'react';
import { Ship, User, Plus, Check, Anchor, Layers } from 'lucide-react';
import type { Client, ProjectType, PropulsionType, ProductionMode } from '@/domain/models';
import { ClientRepository, ProjectRepository } from '@/data/repositories';
import {
  BoatModelService,
  type BoatModel,
  type BoatModelVersion,
} from '@/domain/services/BoatModelService';
import { ConfigurationService } from '@/domain/services/ConfigurationService';
import { getAuditContext } from '@/domain/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type Step = 'type' | 'model' | 'client' | 'details';

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: 'NEW_BUILD', label: 'New Build', description: 'Build a new boat from scratch' },
  { value: 'REFIT', label: 'Refit', description: 'Major renovation of existing vessel' },
  { value: 'MAINTENANCE', label: 'Maintenance', description: 'Regular service and repairs' },
];

const PROPULSION_TYPES: PropulsionType[] = ['Electric', 'Hybrid', 'Diesel', 'Outboard'];

interface BoatModelWithVersion {
  model: BoatModel;
  version: BoatModelVersion;
}

export function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const [step, setStep] = useState<Step>('type');
  const [clients, setClients] = useState<Client[]>([]);
  const [boatModels, setBoatModels] = useState<BoatModelWithVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Form state
  const [projectType, setProjectType] = useState<ProjectType>('NEW_BUILD');
  const [selectedModelVersionId, setSelectedModelVersionId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectTitle, setProjectTitle] = useState('');
  const [propulsionType, setPropulsionType] = useState<PropulsionType>('Electric');
  // Production mode for NEW_BUILD projects
  const [productionMode, setProductionMode] = useState<ProductionMode>('single');
  const [initialBoatCount, setInitialBoatCount] = useState<number>(2);

  // New client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientType, setNewClientType] = useState<'company' | 'private'>('private');

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

  async function loadData() {
    const [clientList, modelList] = await Promise.all([
      ClientRepository.getActive(),
      BoatModelService.getAll(),
    ]);

    setClients(clientList);

    // Load current versions for each model
    const modelsWithVersions: BoatModelWithVersion[] = [];
    for (const model of modelList) {
      const version = await BoatModelService.getCurrentVersion(model.id);
      if (version && version.status === 'APPROVED') {
        modelsWithVersions.push({ model, version });
      }
    }
    setBoatModels(modelsWithVersions);
  }

  function resetForm() {
    setStep('type');
    setProjectType('NEW_BUILD');
    setSelectedModelVersionId('');
    setSelectedClientId('');
    setProjectTitle('');
    setPropulsionType('Electric');
    setProductionMode('single');
    setInitialBoatCount(2);
    setIsCreatingClient(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientType('private');
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return;

    setIsLoading(true);
    try {
      const client = await ClientRepository.create({
        name: newClientName.trim(),
        type: newClientType,
        email: newClientEmail || undefined,
        country: 'Netherlands',
        status: 'active',
      });

      setClients((prev) => [client, ...prev]);
      setSelectedClientId(client.id);
      setIsCreatingClient(false);
      setNewClientName('');
      setNewClientEmail('');
    } catch (error) {
      console.error('Failed to create client:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!selectedClientId || !projectTitle.trim()) return;

    setIsLoading(true);
    try {
      // Find the selected model and version
      const selectedModelData = boatModels.find(
        (m) => m.version.id === selectedModelVersionId
      );

      // Create project with pinned boat model version
      const project = await ProjectRepository.create(
        {
          title: projectTitle.trim(),
          type: projectType,
          clientId: selectedClientId,
          boatModelVersionId: selectedModelVersionId || undefined,
          propulsionType,
          // Pass production mode and boat count for NEW_BUILD projects
          productionMode: projectType === 'NEW_BUILD' ? productionMode : undefined,
          initialBoatCount: projectType === 'NEW_BUILD' && productionMode === 'serial' ? initialBoatCount : undefined,
        },
        'system' // TODO: Use actual user ID
      );

      // If a boat model was selected, add its base price as a configuration item
      if (selectedModelData) {
        const context = getAuditContext();

        await ConfigurationService.addItem(project.id, {
          itemType: 'LEGACY', // Hull/base is from boat model catalog
          isCustom: false,
          catalogItemId: selectedModelData.model.id,
          catalogVersionId: selectedModelData.version.id,
          category: 'Hull & Base',
          name: `${selectedModelData.model.name} (${selectedModelData.version.versionLabel})`,
          description: `Base vessel - ${selectedModelData.model.range} range, ${selectedModelData.version.lengthM}m x ${selectedModelData.version.beamM}m`,
          quantity: 1,
          unit: 'pcs',
          unitPriceExclVat: selectedModelData.version.basePrice,
          ceRelevant: true,
          safetyCritical: false,
        }, context);
      }

      onCreated();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 'type':
        return !!projectType;
      case 'model':
        // Model selection is optional for REFIT/MAINTENANCE
        return projectType !== 'NEW_BUILD' || !!selectedModelVersionId;
      case 'client':
        return !!selectedClientId;
      case 'details':
        return !!projectTitle.trim();
      default:
        return false;
    }
  }

  function nextStep() {
    if (step === 'type') {
      // Skip model selection for non-new-build projects or go to model
      if (projectType === 'NEW_BUILD') {
        setStep('model');
      } else {
        setStep('client');
      }
    } else if (step === 'model') {
      setStep('client');
    } else if (step === 'client') {
      // Auto-generate title
      const client = clients.find((c) => c.id === selectedClientId);
      const selectedModel = boatModels.find((m) => m.version.id === selectedModelVersionId);
      if (client && !projectTitle) {
        const modelName = selectedModel?.model.name || '';
        const typeLabel = PROJECT_TYPES.find((t) => t.value === projectType)?.label || projectType;
        setProjectTitle(
          modelName
            ? `${client.name} - ${modelName} ${propulsionType}`
            : `${client.name} - ${typeLabel}`
        );
      }
      setStep('details');
    }
  }

  function prevStep() {
    if (step === 'model') setStep('type');
    else if (step === 'client') {
      if (projectType === 'NEW_BUILD') {
        setStep('model');
      } else {
        setStep('type');
      }
    } else if (step === 'details') setStep('client');
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedModel = boatModels.find((m) => m.version.id === selectedModelVersionId);

  const steps = projectType === 'NEW_BUILD'
    ? ['type', 'model', 'client', 'details']
    : ['type', 'client', 'details'];

  const currentStepIndex = steps.indexOf(step);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-teal-600" />
            New Project
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Select the type of project you want to create'}
            {step === 'model' && 'Select a boat model for this project'}
            {step === 'client' && 'Select or create a client for this project'}
            {step === 'details' && 'Enter the project details'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 py-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-teal-600 text-white'
                    : currentStepIndex > i
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {currentStepIndex > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    currentStepIndex > i
                      ? 'bg-teal-600'
                      : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="py-4">
          {step === 'type' && (
            <RadioGroup value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <div className="space-y-3">
                {PROJECT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      projectType === type.value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <RadioGroupItem value={type.value} />
                    <div>
                      <p className="font-medium text-slate-900">{type.label}</p>
                      <p className="text-sm text-slate-500">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          )}

          {step === 'model' && (
            <div className="space-y-4">
              <div className="max-h-80 overflow-y-auto space-y-2">
                {boatModels.map(({ model, version }) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedModelVersionId(version.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedModelVersionId === version.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Anchor className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{model.name}</p>
                          <p className="text-sm text-slate-500">
                            {version.lengthM}m x {version.beamM}m • {model.range}
                          </p>
                          <p className="text-xs text-slate-400">
                            Version {version.versionLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-teal-600">
                          {formatCurrency(version.basePrice)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          CE Cat {version.ceCategory || 'C'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
                {boatModels.length === 0 && (
                  <p className="text-center text-slate-500 py-4">
                    No approved boat models available. Create one in the Library first.
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">
                The selected model version will be pinned to this project. Future updates to the model will not affect this project.
              </p>
            </div>
          )}

          {step === 'client' && (
            <div className="space-y-4">
              {isCreatingClient ? (
                <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                  <h4 className="font-medium">New Client</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Client name"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newClientType} onValueChange={(v) => setNewClientType(v as 'company' | 'private')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsCreatingClient(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateClient} disabled={!newClientName.trim() || isLoading}>
                      Create Client
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIsCreatingClient(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Client
                  </Button>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          selectedClientId === client.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{client.name}</p>
                            <p className="text-sm text-slate-500">{client.email || 'No email'}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {client.type}
                          </Badge>
                        </div>
                      </button>
                    ))}
                    {clients.length === 0 && (
                      <p className="text-center text-slate-500 py-4">
                        No clients found. Create one above.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="space-y-2">
                {selectedModel && (
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <Anchor className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{selectedModel.model.name}</p>
                      <p className="text-sm text-slate-500">
                        Version {selectedModel.version.versionLabel} • {formatCurrency(selectedModel.version.basePrice)}
                      </p>
                    </div>
                  </div>
                )}
                {selectedClient && (
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{selectedClient.name}</p>
                      <p className="text-sm text-slate-500">{selectedClient.email}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Project Title *</Label>
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Smith - Eagle 28TS Electric"
                />
              </div>

              <div>
                <Label>Propulsion Type</Label>
                <Select value={propulsionType} onValueChange={(v) => setPropulsionType(v as PropulsionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPULSION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Production Mode - NEW_BUILD only */}
              {projectType === 'NEW_BUILD' && (
                <div className="space-y-3">
                  <Label>Production Type</Label>
                  <RadioGroup
                    value={productionMode}
                    onValueChange={(v) => setProductionMode(v as ProductionMode)}
                    className="space-y-2"
                  >
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        productionMode === 'single'
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <RadioGroupItem value="single" />
                      <div className="flex items-center gap-2 flex-1">
                        <Ship className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-900">Single Boat</p>
                          <p className="text-xs text-slate-500">Build one unique vessel</p>
                        </div>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        productionMode === 'serial'
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <RadioGroupItem value="serial" />
                      <div className="flex items-center gap-2 flex-1">
                        <Layers className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="font-medium text-slate-900">Serial Production</p>
                          <p className="text-xs text-slate-500">Build multiple identical vessels</p>
                        </div>
                      </div>
                      {productionMode === 'serial' && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={2}
                            max={99}
                            value={initialBoatCount}
                            onChange={(e) => setInitialBoatCount(Math.max(2, Math.min(99, parseInt(e.target.value) || 2)))}
                            className="w-16 h-8 text-center"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm text-slate-500">boats</span>
                        </div>
                      )}
                    </label>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step !== 'type' && (
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
          )}
          {step === 'details' ? (
            <Button
              onClick={handleCreateProject}
              disabled={!canProceed() || isLoading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Create Project
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
