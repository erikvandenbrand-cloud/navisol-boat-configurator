'use client';

import { useState, useEffect } from 'react';
import {
  Ship, ChevronRight, ChevronLeft, Check, Save, X,
  Anchor, Zap, Fuel, Flame, Droplets, Shield, Wind,
  Settings, Info, Ruler, Navigation
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { useAuth } from '@/lib/auth-store';
import {
  type VesselSpecification,
  type ClientBoat,
  DEFAULT_VESSEL_SPECIFICATION,
  DESIGN_CATEGORY_INFO,
  type DesignCategory,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Wizard steps
const WIZARD_STEPS = [
  { id: 'general', title: 'General Info', icon: Info, description: 'Basic vessel identification' },
  { id: 'dimensions', title: 'Dimensions', icon: Ruler, description: 'Size and construction' },
  { id: 'propulsion', title: 'Propulsion', icon: Navigation, description: 'Engine and power' },
  { id: 'steering', title: 'Steering', icon: Anchor, description: 'Helm and control' },
  { id: 'electrical', title: 'Electrical', icon: Zap, description: 'Power systems' },
  { id: 'fuel', title: 'Fuel System', icon: Fuel, description: 'Fuel tanks and lines' },
  { id: 'gas', title: 'Gas System', icon: Flame, description: 'LPG installation' },
  { id: 'water', title: 'Water/Waste', icon: Droplets, description: 'Fresh and waste water' },
  { id: 'safety', title: 'Safety', icon: Shield, description: 'Safety equipment' },
  { id: 'sailing', title: 'Sailing', icon: Wind, description: 'Sails and rigging' },
  { id: 'additional', title: 'Additional', icon: Settings, description: 'Extra equipment' },
];

interface VesselSpecificationEditorProps {
  boatId: string;
  onClose: () => void;
  onSave: (spec: VesselSpecification) => void;
  initialSpec?: VesselSpecification;
}

export function VesselSpecificationEditor({
  boatId,
  onClose,
  onSave,
  initialSpec
}: VesselSpecificationEditorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spec, setSpec] = useState<VesselSpecification>(
    initialSpec || { ...DEFAULT_VESSEL_SPECIFICATION }
  );
  const [hasChanges, setHasChanges] = useState(false);

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  // Update a nested field in spec - using loose typing for Select component compatibility
  const updateField = <T extends keyof VesselSpecification>(
    section: T,
    field: keyof VesselSpecification[T],
    value: string | number | boolean | null | string[]
  ) => {
    setSpec(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Update electric propulsion subfields - using loose typing for Select component compatibility
  const updateElectric = (
    field: keyof VesselSpecification['propulsion']['electric'],
    value: string | number | boolean | null | string[]
  ) => {
    setSpec(prev => ({
      ...prev,
      propulsion: {
        ...prev.propulsion,
        electric: {
          ...prev.propulsion.electric,
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(spec);
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (WIZARD_STEPS[currentStep].id) {
      case 'general':
        return <GeneralStep spec={spec} updateField={updateField} />;
      case 'dimensions':
        return <DimensionsStep spec={spec} updateField={updateField} />;
      case 'propulsion':
        return <PropulsionStep spec={spec} updateField={updateField} updateElectric={updateElectric} />;
      case 'steering':
        return <SteeringStep spec={spec} updateField={updateField} />;
      case 'electrical':
        return <ElectricalStep spec={spec} updateField={updateField} />;
      case 'fuel':
        return <FuelStep spec={spec} updateField={updateField} />;
      case 'gas':
        return <GasStep spec={spec} updateField={updateField} />;
      case 'water':
        return <WaterStep spec={spec} updateField={updateField} />;
      case 'safety':
        return <SafetyStep spec={spec} updateField={updateField} />;
      case 'sailing':
        return <SailingStep spec={spec} updateField={updateField} />;
      case 'additional':
        return <AdditionalStep spec={spec} updateField={updateField} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Ship className="h-6 w-6 text-teal-600" />
            Vessel Specification Editor
          </DialogTitle>
          <DialogDescription>
            Complete the vessel specifications for CE documentation
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="px-6 py-2">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="px-6">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {WIZARD_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-teal-100 text-teal-800 font-medium'
                      : isCompleted
                      ? 'bg-slate-100 text-slate-700'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <StepIcon className={`h-4 w-4 ${isCompleted ? 'text-green-600' : ''}`} />
                  <span className="hidden md:inline">{step.title}</span>
                  {isCompleted && <Check className="h-3 w-3 text-green-600" />}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Step Content */}
        <ScrollArea className="h-[400px] p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const StepIcon = WIZARD_STEPS[currentStep].icon;
                return <StepIcon className="h-6 w-6 text-teal-600" />;
              })()}
              <div>
                <h3 className="font-semibold text-lg">{WIZARD_STEPS[currentStep].title}</h3>
                <p className="text-sm text-slate-500">{WIZARD_STEPS[currentStep].description}</p>
              </div>
            </div>
            {renderStepContent()}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <DialogFooter className="p-6 pt-4">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {currentStep === WIZARD_STEPS.length - 1 ? (
                <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Specification
                </Button>
              ) : (
                <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700">
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
interface StepProps {
  spec: VesselSpecification;
  updateField: <T extends keyof VesselSpecification>(
    section: T,
    field: keyof VesselSpecification[T],
    value: string | number | boolean | null | string[]
  ) => void;
}

function GeneralStep({ spec, updateField }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Manufacturer</Label>
        <Input
          value={spec.general.manufacturer}
          onChange={(e) => updateField('general', 'manufacturer', e.target.value)}
          placeholder="NAVISOL B.V."
        />
      </div>
      <div>
        <Label>Model Name</Label>
        <Input
          value={spec.general.model_name}
          onChange={(e) => updateField('general', 'model_name', e.target.value)}
          placeholder="Eagle 25TS"
        />
      </div>
      <div>
        <Label>Year of Build</Label>
        <Input
          type="number"
          value={spec.general.year_of_build ?? ''}
          onChange={(e) => updateField('general', 'year_of_build', e.target.value ? parseInt(e.target.value) : null)}
          placeholder={new Date().getFullYear().toString()}
        />
      </div>
      <div>
        <Label>CIN/WIN (Hull ID)</Label>
        <Input
          value={spec.general.cin_win}
          onChange={(e) => updateField('general', 'cin_win', e.target.value)}
          placeholder="NL-NAV00001A123"
        />
      </div>
      <div>
        <Label>Design Category</Label>
        <Select
          value={spec.general.design_category}
          onValueChange={(v) => updateField('general', 'design_category', v as DesignCategory)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {(['A', 'B', 'C', 'D'] as DesignCategory[]).map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat} - {DESIGN_CATEGORY_INFO[cat].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {spec.general.design_category && (
          <p className="text-xs text-slate-500 mt-1">
            {DESIGN_CATEGORY_INFO[spec.general.design_category as DesignCategory]?.description}
          </p>
        )}
      </div>
      <div>
        <Label>Vessel Type</Label>
        <Select
          value={spec.general.vessel_type}
          onValueChange={(v) => updateField('general', 'vessel_type', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="console">Console</SelectItem>
            <SelectItem value="cabin">Cabin</SelectItem>
            <SelectItem value="sailing">Sailing</SelectItem>
            <SelectItem value="catamaran">Catamaran</SelectItem>
            <SelectItem value="rib">RIB</SelectItem>
            <SelectItem value="electric">Electric</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label>Intended Use</Label>
        <Select
          value={spec.general.intended_use}
          onValueChange={(v) => updateField('general', 'intended_use', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select intended use" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="leisure">Leisure</SelectItem>
            <SelectItem value="day_cruising">Day Cruising</SelectItem>
            <SelectItem value="offshore">Offshore</SelectItem>
            <SelectItem value="coastal">Coastal</SelectItem>
            <SelectItem value="inland">Inland</SelectItem>
            <SelectItem value="fishing">Fishing</SelectItem>
            <SelectItem value="racing">Racing</SelectItem>
            <SelectItem value="charter">Charter</SelectItem>
            <SelectItem value="training">Training</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DimensionsStep({ spec, updateField }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Length Overall (m)</Label>
        <Input
          type="number"
          step="0.01"
          value={spec.dimensions.length_overall_m ?? ''}
          onChange={(e) => updateField('dimensions', 'length_overall_m', e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="8.50"
        />
      </div>
      <div>
        <Label>Beam (m)</Label>
        <Input
          type="number"
          step="0.01"
          value={spec.dimensions.beam_m ?? ''}
          onChange={(e) => updateField('dimensions', 'beam_m', e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="2.80"
        />
      </div>
      <div>
        <Label>Draft (m)</Label>
        <Input
          type="number"
          step="0.01"
          value={spec.dimensions.draft_m ?? ''}
          onChange={(e) => updateField('dimensions', 'draft_m', e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="0.45"
        />
      </div>
      <div>
        <Label>Light Craft Mass (kg)</Label>
        <Input
          type="number"
          value={spec.dimensions.light_craft_mass_kg ?? ''}
          onChange={(e) => updateField('dimensions', 'light_craft_mass_kg', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="2500"
        />
      </div>
      <div>
        <Label>Maximum Load (kg)</Label>
        <Input
          type="number"
          value={spec.dimensions.max_load_kg ?? ''}
          onChange={(e) => updateField('dimensions', 'max_load_kg', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="800"
        />
      </div>
      <div>
        <Label>Hull Material</Label>
        <Select
          value={spec.dimensions.hull_material}
          onValueChange={(v) => updateField('dimensions', 'hull_material', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Aluminium">Aluminium</SelectItem>
            <SelectItem value="GRP">GRP (Fiberglass)</SelectItem>
            <SelectItem value="Steel">Steel</SelectItem>
            <SelectItem value="Wood">Wood</SelectItem>
            <SelectItem value="Carbon">Carbon</SelectItem>
            <SelectItem value="Composite">Composite</SelectItem>
            <SelectItem value="HDPE">HDPE</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Deck Material</Label>
        <Select
          value={spec.dimensions.deck_material}
          onValueChange={(v) => updateField('dimensions', 'deck_material', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Aluminium">Aluminium</SelectItem>
            <SelectItem value="GRP">GRP (Fiberglass)</SelectItem>
            <SelectItem value="Teak">Teak</SelectItem>
            <SelectItem value="Synthetic">Synthetic Teak</SelectItem>
            <SelectItem value="Composite">Composite</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Hull Type</Label>
        <Select
          value={spec.dimensions.hull_type}
          onValueChange={(v) => updateField('dimensions', 'hull_type', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select hull type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="displacement">Displacement</SelectItem>
            <SelectItem value="semi_displacement">Semi-Displacement</SelectItem>
            <SelectItem value="planing">Planing</SelectItem>
            <SelectItem value="monohull">Monohull</SelectItem>
            <SelectItem value="catamaran">Catamaran</SelectItem>
            <SelectItem value="trimaran">Trimaran</SelectItem>
            <SelectItem value="rib">RIB</SelectItem>
            <SelectItem value="pontoon">Pontoon</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface PropulsionStepProps extends StepProps {
  updateElectric: (
    field: keyof VesselSpecification['propulsion']['electric'],
    value: string | number | boolean | null | string[]
  ) => void;
}

function PropulsionStep({ spec, updateField, updateElectric }: PropulsionStepProps) {
  const isElectric = spec.propulsion.propulsion_type === 'electric' || spec.propulsion.propulsion_type === 'hybrid';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Propulsion Type</Label>
          <Select
            value={spec.propulsion.propulsion_type}
            onValueChange={(v) => updateField('propulsion', 'propulsion_type', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electric">Electric</SelectItem>
              <SelectItem value="outboard">Outboard</SelectItem>
              <SelectItem value="inboard">Inboard</SelectItem>
              <SelectItem value="sterndrive">Sterndrive</SelectItem>
              <SelectItem value="saildrive">Saildrive</SelectItem>
              <SelectItem value="pod">Pod Drive</SelectItem>
              <SelectItem value="jet">Jet</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="human">Human (Oars/Paddles)</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Number of Motors</Label>
          <Input
            type="number"
            min="0"
            value={spec.propulsion.number_of_motors ?? ''}
            onChange={(e) => updateField('propulsion', 'number_of_motors', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="1"
          />
        </div>
        <div>
          <Label>Power per Motor (kW)</Label>
          <Input
            type="number"
            step="0.1"
            value={spec.propulsion.power_per_motor_kw ?? ''}
            onChange={(e) => updateField('propulsion', 'power_per_motor_kw', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="30"
          />
        </div>
        <div>
          <Label>Fuel Type</Label>
          <Select
            value={spec.propulsion.fuel_type}
            onValueChange={(v) => updateField('propulsion', 'fuel_type', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fuel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Electric)</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="petrol">Petrol</SelectItem>
              <SelectItem value="lpg">LPG</SelectItem>
              <SelectItem value="hydrogen">Hydrogen</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Maximum Speed (knots)</Label>
          <Input
            type="number"
            step="0.1"
            value={spec.propulsion.max_speed_knots ?? ''}
            onChange={(e) => updateField('propulsion', 'max_speed_knots', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="25"
          />
        </div>
        <div>
          <Label>Cruising Speed (knots)</Label>
          <Input
            type="number"
            step="0.1"
            value={spec.propulsion.cruising_speed_knots ?? ''}
            onChange={(e) => updateField('propulsion', 'cruising_speed_knots', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="15"
          />
        </div>
        <div>
          <Label>Range (nm)</Label>
          <Input
            type="number"
            value={spec.propulsion.range_nm ?? ''}
            onChange={(e) => updateField('propulsion', 'range_nm', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="100"
          />
        </div>
      </div>

      {isElectric && (
        <>
          <Separator />
          <h4 className="font-semibold text-teal-700 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Electric Propulsion Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Battery Capacity (kWh)</Label>
              <Input
                type="number"
                step="0.1"
                value={spec.propulsion.electric.battery_capacity_kwh ?? ''}
                onChange={(e) => updateElectric('battery_capacity_kwh', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="40"
              />
            </div>
            <div>
              <Label>Battery Voltage (V)</Label>
              <Input
                type="number"
                value={spec.propulsion.electric.battery_voltage_v ?? ''}
                onChange={(e) => updateElectric('battery_voltage_v', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="48"
              />
            </div>
            <div>
              <Label>Battery Chemistry</Label>
              <Select
                value={spec.propulsion.electric.battery_chemistry}
                onValueChange={(v) => updateElectric('battery_chemistry', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chemistry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LFP">LFP (Lithium Iron Phosphate)</SelectItem>
                  <SelectItem value="NMC">NMC (Lithium Nickel Manganese Cobalt)</SelectItem>
                  <SelectItem value="NCA">NCA (Lithium Nickel Cobalt Aluminum)</SelectItem>
                  <SelectItem value="Lead_Acid_AGM">Lead Acid AGM</SelectItem>
                  <SelectItem value="Lead_Acid_GEL">Lead Acid GEL</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Charging Power (kW)</Label>
              <Input
                type="number"
                step="0.1"
                value={spec.propulsion.electric.max_charging_power_kw ?? ''}
                onChange={(e) => updateElectric('max_charging_power_kw', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="7.2"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Charging Methods</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['shore_power_ac', 'dc_fast', 'onboard_generator', 'solar_pv', 'wind_turbine', 'regenerative_sailing'].map(method => (
                  <label key={method} className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-slate-50">
                    <Checkbox
                      checked={spec.propulsion.electric.charging_methods.includes(method as never)}
                      onCheckedChange={(checked) => {
                        const methods = spec.propulsion.electric.charging_methods;
                        if (checked) {
                          updateElectric('charging_methods', [...methods, method] as never);
                        } else {
                          updateElectric('charging_methods', methods.filter(m => m !== method) as never);
                        }
                      }}
                    />
                    <span className="text-sm">{method.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SteeringStep({ spec, updateField }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Steering Type</Label>
        <Select
          value={spec.steering.steering_type}
          onValueChange={(v) => updateField('steering', 'steering_type', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hydraulic">Hydraulic</SelectItem>
            <SelectItem value="mechanical_cable">Mechanical (Cable)</SelectItem>
            <SelectItem value="wheel">Wheel</SelectItem>
            <SelectItem value="tiller">Tiller</SelectItem>
            <SelectItem value="joystick">Joystick</SelectItem>
            <SelectItem value="dual_station">Dual Station</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Number of Helm Stations</Label>
        <Input
          type="number"
          min="1"
          value={spec.steering.number_of_helm_stations ?? ''}
          onChange={(e) => updateField('steering', 'number_of_helm_stations', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="1"
        />
      </div>
      <div>
        <Label>Visibility Type</Label>
        <Select
          value={spec.steering.visibility_type}
          onValueChange={(v) => updateField('steering', 'visibility_type', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="assisted_camera">Camera Assisted</SelectItem>
            <SelectItem value="flybridge">Flybridge</SelectItem>
            <SelectItem value="enclosed_helm">Enclosed Helm</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.steering.autopilot_installed}
            onCheckedChange={(v) => updateField('steering', 'autopilot_installed', v)}
          />
          <Label>Autopilot Installed</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.steering.emergency_steering}
            onCheckedChange={(v) => updateField('steering', 'emergency_steering', v)}
          />
          <Label>Emergency Steering</Label>
        </div>
      </div>
    </div>
  );
}

function ElectricalStep({ spec, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <Label>DC System</Label>
          <Switch
            checked={spec.electrical_system.dc_system}
            onCheckedChange={(v) => updateField('electrical_system', 'dc_system', v)}
          />
        </div>
        {spec.electrical_system.dc_system && (
          <div>
            <Label>DC Voltage</Label>
            <Select
              value={spec.electrical_system.dc_voltage?.toString() || ''}
              onValueChange={(v) => updateField('electrical_system', 'dc_voltage', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voltage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12V</SelectItem>
                <SelectItem value="24">24V</SelectItem>
                <SelectItem value="48">48V</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <Label>AC System</Label>
          <Switch
            checked={spec.electrical_system.ac_system}
            onCheckedChange={(v) => updateField('electrical_system', 'ac_system', v)}
          />
        </div>
        {spec.electrical_system.ac_system && (
          <div>
            <Label>AC Voltage</Label>
            <Select
              value={spec.electrical_system.ac_voltage?.toString() || ''}
              onValueChange={(v) => updateField('electrical_system', 'ac_voltage', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voltage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="110">110V</SelectItem>
                <SelectItem value="230">230V</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Number of Batteries</Label>
          <Input
            type="number"
            min="0"
            value={spec.electrical_system.number_of_batteries ?? ''}
            onChange={(e) => updateField('electrical_system', 'number_of_batteries', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="2"
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { field: 'battery_switches', label: 'Battery Switches' },
          { field: 'fuse_panels', label: 'Fuse/Breaker Panels' },
          { field: 'shore_power_inlet', label: 'Shore Power Inlet' },
          { field: 'inverter_charger', label: 'Inverter/Charger' },
          { field: 'generator_installed', label: 'Generator Installed' },
          { field: 'solar_panels_installed', label: 'Solar Panels' },
        ].map(item => (
          <div key={item.field} className="flex items-center gap-2">
            <Switch
              checked={spec.electrical_system[item.field as keyof typeof spec.electrical_system] as boolean}
              onCheckedChange={(v) => updateField('electrical_system', item.field as keyof typeof spec.electrical_system, v)}
            />
            <Label className="text-sm">{item.label}</Label>
          </div>
        ))}
      </div>

      {spec.electrical_system.generator_installed && (
        <div className="w-1/2">
          <Label>Generator Power (kW)</Label>
          <Input
            type="number"
            step="0.1"
            value={spec.electrical_system.generator_power_kw ?? ''}
            onChange={(e) => updateField('electrical_system', 'generator_power_kw', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="5"
          />
        </div>
      )}

      {spec.electrical_system.solar_panels_installed && (
        <div className="w-1/2">
          <Label>Solar Capacity (W)</Label>
          <Input
            type="number"
            value={spec.electrical_system.solar_capacity_w ?? ''}
            onChange={(e) => updateField('electrical_system', 'solar_capacity_w', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="400"
          />
        </div>
      )}
    </div>
  );
}

function FuelStep({ spec, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
        <div>
          <Label className="text-base">Has Fuel Tank</Label>
          <p className="text-sm text-slate-500">Enable if vessel has a permanently installed fuel system</p>
        </div>
        <Switch
          checked={spec.fuel_system.has_fuel_tank}
          onCheckedChange={(v) => updateField('fuel_system', 'has_fuel_tank', v)}
        />
      </div>

      {spec.fuel_system.has_fuel_tank && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tank Capacity (L)</Label>
            <Input
              type="number"
              value={spec.fuel_system.tank_capacity_l ?? ''}
              onChange={(e) => updateField('fuel_system', 'tank_capacity_l', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="200"
            />
          </div>
          <div>
            <Label>Tank Material</Label>
            <Select
              value={spec.fuel_system.tank_material}
              onValueChange={(v) => updateField('fuel_system', 'tank_material', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aluminium">Aluminium</SelectItem>
                <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
                <SelectItem value="polyethylene">Polyethylene</SelectItem>
                <SelectItem value="steel">Steel</SelectItem>
                <SelectItem value="grp">GRP</SelectItem>
                <SelectItem value="flexible_bladder">Flexible Bladder</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ventilation</Label>
            <Select
              value={spec.fuel_system.ventilation}
              onValueChange={(v) => updateField('fuel_system', 'ventilation', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ventilation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="natural">Natural</SelectItem>
                <SelectItem value="forced_blower">Forced (Blower)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Filler Type</Label>
            <Select
              value={spec.fuel_system.filler_type}
              onValueChange={(v) => updateField('fuel_system', 'filler_type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select filler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flush_deck">Flush Deck</SelectItem>
                <SelectItem value="raised_deck">Raised Deck</SelectItem>
                <SelectItem value="quick_connect">Quick Connect</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={spec.fuel_system.fuel_filter_installed}
              onCheckedChange={(v) => updateField('fuel_system', 'fuel_filter_installed', v)}
            />
            <Label>Fuel Filter Installed</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={spec.fuel_system.fuel_shutoff_valve}
              onCheckedChange={(v) => updateField('fuel_system', 'fuel_shutoff_valve', v)}
            />
            <Label>Fuel Shut-off Valve</Label>
          </div>
        </div>
      )}
    </div>
  );
}

function GasStep({ spec, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
        <div>
          <Label className="text-base">Has Gas System (LPG)</Label>
          <p className="text-sm text-slate-500">Enable if vessel has LPG gas installation</p>
        </div>
        <Switch
          checked={spec.gas_installation.has_gas_system}
          onCheckedChange={(v) => updateField('gas_installation', 'has_gas_system', v)}
        />
      </div>

      {spec.gas_installation.has_gas_system && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Number of Cylinders</Label>
            <Input
              type="number"
              min="1"
              value={spec.gas_installation.number_of_cylinders ?? ''}
              onChange={(e) => updateField('gas_installation', 'number_of_cylinders', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="1"
            />
          </div>
          <div>
            <Label>Gas Locker Location</Label>
            <Select
              value={spec.gas_installation.gas_locker_location}
              onValueChange={(v) => updateField('gas_installation', 'gas_locker_location', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cockpit_locker">Cockpit Locker</SelectItem>
                <SelectItem value="aft_locker">Aft Locker</SelectItem>
                <SelectItem value="dedicated_vented">Dedicated Vented</SelectItem>
                <SelectItem value="external_mount">External Mount</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pipe Material</Label>
            <Select
              value={spec.gas_installation.pipe_material}
              onValueChange={(v) => updateField('gas_installation', 'pipe_material', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="copper">Copper</SelectItem>
                <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
                <SelectItem value="approved_flexible_hose">Approved Flexible Hose</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={spec.gas_installation.regulator_present}
                onCheckedChange={(v) => updateField('gas_installation', 'regulator_present', v)}
              />
              <Label>Regulator Present</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={spec.gas_installation.gas_detector_installed}
                onCheckedChange={(v) => updateField('gas_installation', 'gas_detector_installed', v)}
              />
              <Label>Gas Detector Installed</Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WaterStep({ spec, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <h4 className="font-medium">Fresh Water System</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.water_waste.fresh_water_tank}
            onCheckedChange={(v) => updateField('water_waste', 'fresh_water_tank', v)}
          />
          <Label>Fresh Water Tank</Label>
        </div>
        {spec.water_waste.fresh_water_tank && (
          <div>
            <Label>Capacity (L)</Label>
            <Input
              type="number"
              value={spec.water_waste.fresh_water_capacity_l ?? ''}
              onChange={(e) => updateField('water_waste', 'fresh_water_capacity_l', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="100"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.water_waste.water_pump}
            onCheckedChange={(v) => updateField('water_waste', 'water_pump', v)}
          />
          <Label>Water Pump</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.water_waste.pressure_water_system}
            onCheckedChange={(v) => updateField('water_waste', 'pressure_water_system', v)}
          />
          <Label>Pressure Water System</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.water_waste.boiler}
            onCheckedChange={(v) => updateField('water_waste', 'boiler', v)}
          />
          <Label>Hot Water Boiler</Label>
        </div>
        {spec.water_waste.boiler && (
          <div>
            <Label>Boiler Capacity (L)</Label>
            <Input
              type="number"
              value={spec.water_waste.boiler_capacity_l ?? ''}
              onChange={(e) => updateField('water_waste', 'boiler_capacity_l', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="20"
            />
          </div>
        )}
      </div>

      <Separator />

      <h4 className="font-medium">Waste Systems</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Toilet Type</Label>
          <Select
            value={spec.water_waste.toilet_type}
            onValueChange={(v) => updateField('water_waste', 'toilet_type', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select toilet type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="chemical_portable">Chemical Portable</SelectItem>
              <SelectItem value="manual_marine">Manual Marine</SelectItem>
              <SelectItem value="electric_marine">Electric Marine</SelectItem>
              <SelectItem value="vacuum_toilet">Vacuum Toilet</SelectItem>
              <SelectItem value="composting">Composting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.water_waste.holding_tank}
            onCheckedChange={(v) => updateField('water_waste', 'holding_tank', v)}
          />
          <Label>Holding Tank</Label>
        </div>
        {spec.water_waste.holding_tank && (
          <div>
            <Label>Holding Tank Capacity (L)</Label>
            <Input
              type="number"
              value={spec.water_waste.holding_tank_capacity_l ?? ''}
              onChange={(e) => updateField('water_waste', 'holding_tank_capacity_l', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="50"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.water_waste.waste_water_tank}
            onCheckedChange={(v) => updateField('water_waste', 'waste_water_tank', v)}
          />
          <Label>Waste Water (Grey) Tank</Label>
        </div>
        {spec.water_waste.waste_water_tank && (
          <div>
            <Label>Waste Water Capacity (L)</Label>
            <Input
              type="number"
              value={spec.water_waste.waste_water_capacity_l ?? ''}
              onChange={(e) => updateField('water_waste', 'waste_water_capacity_l', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="50"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch
            checked={spec.water_waste.deck_drain}
            onCheckedChange={(v) => updateField('water_waste', 'deck_drain', v)}
          />
          <Label>Deck Drain</Label>
        </div>
      </div>
    </div>
  );
}

function SafetyStep({ spec, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { field: 'navigation_lights', label: 'Navigation Lights' },
          { field: 'anchor_light', label: 'Anchor Light' },
          { field: 'fire_blanket', label: 'Fire Blanket' },
          { field: 'kill_switch', label: 'Kill Switch' },
          { field: 'first_aid_kit', label: 'First Aid Kit' },
          { field: 'flares', label: 'Flares' },
          { field: 'vhf_radio', label: 'VHF Radio' },
          { field: 'epirb', label: 'EPIRB' },
          { field: 'radar_reflector', label: 'Radar Reflector' },
          { field: 'horn_whistle', label: 'Horn/Whistle' },
          { field: 'liferaft', label: 'Liferaft' },
        ].map(item => (
          <div key={item.field} className="flex items-center gap-2">
            <Switch
              checked={spec.safety[item.field as keyof typeof spec.safety] as boolean}
              onCheckedChange={(v) => updateField('safety', item.field as keyof typeof spec.safety, v)}
            />
            <Label className="text-sm">{item.label}</Label>
          </div>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Bilge Pump Type</Label>
          <Select
            value={spec.safety.bilge_pump}
            onValueChange={(v) => updateField('safety', 'bilge_pump', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="electric">Electric</SelectItem>
              <SelectItem value="automatic_electric">Automatic Electric</SelectItem>
              <SelectItem value="both">Both Manual & Electric</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Number of Fire Extinguishers</Label>
          <Input
            type="number"
            min="0"
            value={spec.safety.fire_extinguishers ?? ''}
            onChange={(e) => updateField('safety', 'fire_extinguishers', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="2"
          />
        </div>
        <div>
          <Label>Maximum Persons</Label>
          <Input
            type="number"
            min="1"
            value={spec.safety.max_persons ?? ''}
            onChange={(e) => updateField('safety', 'max_persons', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="8"
          />
        </div>
        {spec.safety.liferaft && (
          <div>
            <Label>Liferaft Capacity (persons)</Label>
            <Input
              type="number"
              min="1"
              value={spec.safety.liferaft_capacity ?? ''}
              onChange={(e) => updateField('safety', 'liferaft_capacity', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="6"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SailingStep({ spec, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
        <div>
          <Label className="text-base">Has Sails</Label>
          <p className="text-sm text-slate-500">Enable if vessel has sailing capability</p>
        </div>
        <Switch
          checked={spec.sailing_equipment.has_sails}
          onCheckedChange={(v) => updateField('sailing_equipment', 'has_sails', v)}
        />
      </div>

      {spec.sailing_equipment.has_sails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Rig Type</Label>
            <Select
              value={spec.sailing_equipment.rig_type}
              onValueChange={(v) => updateField('sailing_equipment', 'rig_type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rig type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sloop">Sloop</SelectItem>
                <SelectItem value="cutter">Cutter</SelectItem>
                <SelectItem value="ketch">Ketch</SelectItem>
                <SelectItem value="yawl">Yawl</SelectItem>
                <SelectItem value="cat">Cat</SelectItem>
                <SelectItem value="schooner">Schooner</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Number of Winches</Label>
            <Input
              type="number"
              min="0"
              value={spec.sailing_equipment.winches ?? ''}
              onChange={(e) => updateField('sailing_equipment', 'winches', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="2"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={spec.sailing_equipment.mainsail}
              onCheckedChange={(v) => updateField('sailing_equipment', 'mainsail', v)}
            />
            <Label>Mainsail</Label>
          </div>
          {spec.sailing_equipment.mainsail && (
            <div>
              <Label>Mainsail Area (m²)</Label>
              <Input
                type="number"
                step="0.1"
                value={spec.sailing_equipment.mainsail_area_m2 ?? ''}
                onChange={(e) => updateField('sailing_equipment', 'mainsail_area_m2', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="30"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={spec.sailing_equipment.headsail}
              onCheckedChange={(v) => updateField('sailing_equipment', 'headsail', v)}
            />
            <Label>Headsail</Label>
          </div>
          {spec.sailing_equipment.headsail && (
            <div>
              <Label>Headsail Area (m²)</Label>
              <Input
                type="number"
                step="0.1"
                value={spec.sailing_equipment.headsail_area_m2 ?? ''}
                onChange={(e) => updateField('sailing_equipment', 'headsail_area_m2', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="25"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={spec.sailing_equipment.spinnaker}
              onCheckedChange={(v) => updateField('sailing_equipment', 'spinnaker', v)}
            />
            <Label>Spinnaker</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={spec.sailing_equipment.furling_systems}
              onCheckedChange={(v) => updateField('sailing_equipment', 'furling_systems', v)}
            />
            <Label>Furling Systems</Label>
          </div>
        </div>
      )}
    </div>
  );
}

function AdditionalStep({ spec, updateField }: StepProps) {
  const equipmentItems = [
    { field: 'bow_thruster', label: 'Bow Thruster' },
    { field: 'stern_thruster', label: 'Stern Thruster' },
    { field: 'trim_tabs', label: 'Trim Tabs' },
    { field: 'anchor_windlass', label: 'Anchor Windlass' },
    { field: 'davits', label: 'Davits' },
    { field: 'cockpit_table', label: 'Cockpit Table' },
    { field: 'bimini_top', label: 'Bimini Top' },
    { field: 'spray_hood', label: 'Spray Hood' },
    { field: 'cockpit_cover', label: 'Cockpit Cover' },
    { field: 'swimming_platform', label: 'Swimming Platform' },
    { field: 'swimming_ladder', label: 'Swimming Ladder' },
    { field: 'deck_shower', label: 'Deck Shower' },
    { field: 'refrigerator', label: 'Refrigerator' },
    { field: 'stove', label: 'Stove' },
    { field: 'oven', label: 'Oven' },
    { field: 'microwave', label: 'Microwave' },
    { field: 'heating', label: 'Heating' },
    { field: 'air_conditioning', label: 'Air Conditioning' },
    { field: 'stereo_system', label: 'Stereo System' },
    { field: 'chartplotter', label: 'Chartplotter' },
    { field: 'depth_sounder', label: 'Depth Sounder' },
    { field: 'wind_instruments', label: 'Wind Instruments' },
    { field: 'ais', label: 'AIS' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {equipmentItems.map(item => (
        <div key={item.field} className="flex items-center gap-2 p-2 border rounded-lg">
          <Switch
            checked={spec.additional[item.field as keyof typeof spec.additional] as boolean}
            onCheckedChange={(v) => updateField('additional', item.field as keyof typeof spec.additional, v)}
          />
          <Label className="text-sm">{item.label}</Label>
        </div>
      ))}
    </div>
  );
}

export default VesselSpecificationEditor;
