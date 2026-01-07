'use client';

import { useState, useMemo } from 'react';
import {
  Ship, FileText, ClipboardCheck, Camera, Clock, DollarSign, Settings,
  Anchor, Shield, Wrench, RefreshCw, ChevronRight, Calendar, User,
  FileCheck, BookOpen, Package, X, Edit, AlertTriangle, CheckCircle2,
  Gauge, Droplets, Thermometer, Battery, Zap, Navigation, LifeBuoy,
  ClipboardList, Timer, Truck, History, TrendingUp, Award, Star
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { useAuth } from '@/lib/auth-store';
import { useProcedures } from '@/lib/procedures-store';
import { formatEuroDate, generateId } from '@/lib/formatting';
import {
  type ClientBoat,
  type ProjectCategory,
  type ChecklistTemplate,
  PROJECT_CATEGORY_INFO,
  PRODUCTION_STAGES,
  MAINTENANCE_STAGES,
  CHECKLIST_CATEGORIES_BY_PROJECT,
  getDefaultChecklistForProject,
} from '@/lib/types';
import { ProductionTimeline } from './ProductionTimeline';
import { VesselCompletionChecklist } from './VesselCompletionChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VesselDetailViewProps {
  boat: ClientBoat;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

// Project type specific theme colors
const PROJECT_THEMES: Record<ProjectCategory, {
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  icon: typeof Ship;
  gradient: string;
}> = {
  new_build: {
    primary: 'text-blue-700',
    secondary: 'bg-blue-50',
    accent: 'bg-blue-600',
    border: 'border-blue-200',
    icon: Ship,
    gradient: 'from-blue-500 to-blue-700',
  },
  maintenance: {
    primary: 'text-orange-700',
    secondary: 'bg-orange-50',
    accent: 'bg-orange-600',
    border: 'border-orange-200',
    icon: Wrench,
    gradient: 'from-orange-500 to-orange-700',
  },
  refit: {
    primary: 'text-purple-700',
    secondary: 'bg-purple-50',
    accent: 'bg-purple-600',
    border: 'border-purple-200',
    icon: RefreshCw,
    gradient: 'from-purple-500 to-purple-700',
  },
};

// Get tabs configuration based on project type
const getTabsForProjectType = (category: ProjectCategory) => {
  if (category === 'new_build') {
    return [
      { id: 'overview', label: 'Overview', icon: Ship },
      { id: 'timeline', label: 'Production', icon: Calendar },
      { id: 'specifications', label: 'Specifications', icon: Settings },
      { id: 'ce-docs', label: 'CE Docs', icon: FileCheck },
      { id: 'checklist', label: 'Completion', icon: ClipboardCheck },
      { id: 'photos', label: 'Photos', icon: Camera },
      { id: 'parts', label: 'Parts', icon: Package },
    ];
  }

  if (category === 'maintenance') {
    return [
      { id: 'overview', label: 'Overview', icon: Wrench },
      { id: 'timeline', label: 'Service', icon: Calendar },
      { id: 'service-info', label: 'Service Info', icon: ClipboardList },
      { id: 'checklist', label: 'Checklist', icon: ClipboardCheck },
      { id: 'photos', label: 'Photos', icon: Camera },
      { id: 'history', label: 'History', icon: History },
      { id: 'parts', label: 'Parts Used', icon: Package },
    ];
  }

  // Refit
  return [
    { id: 'overview', label: 'Overview', icon: RefreshCw },
    { id: 'timeline', label: 'Refit Progress', icon: Calendar },
    { id: 'scope', label: 'Scope', icon: ClipboardList },
    { id: 'checklist', label: 'Completion', icon: ClipboardCheck },
    { id: 'photos', label: 'Before/After', icon: Camera },
    { id: 'ce-update', label: 'CE Update', icon: FileCheck },
    { id: 'parts', label: 'Parts', icon: Package },
  ];
};

// Get status badge color
const getStatusBadge = (status: ClientBoat['status']) => {
  switch (status) {
    case 'ordered': return 'bg-slate-500';
    case 'in_production': return 'bg-blue-500';
    case 'delivered': return 'bg-green-500';
    case 'warranty': return 'bg-orange-500';
    default: return 'bg-slate-500';
  }
};

export function VesselDetailView({ boat, open, onClose, onEdit }: VesselDetailViewProps) {
  const { updateClientBoat, getClientById } = useNavisol();
  const { hasPermission } = useAuth();
  const { getTemplatesForBoat, templates, applyTemplateToChecklist } = useProcedures();

  const projectCategory = boat.project_category || 'new_build';
  const categoryInfo = PROJECT_CATEGORY_INFO[projectCategory];
  const theme = PROJECT_THEMES[projectCategory];
  const tabs = getTabsForProjectType(projectCategory);
  const stages = projectCategory === 'maintenance' ? MAINTENANCE_STAGES : PRODUCTION_STAGES;

  const [activeTab, setActiveTab] = useState('overview');
  const [showChecklist, setShowChecklist] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const client = boat.client_id ? getClientById(boat.client_id) : undefined;

  // Get available templates for this boat
  const availableTemplates = useMemo(() => {
    const checklistType = projectCategory === 'new_build' ? 'vessel_completion' : 'maintenance';
    return getTemplatesForBoat(boat.boat_model, checklistType);
  }, [boat.boat_model, projectCategory, getTemplatesForBoat]);

  // Calculate production progress
  const progress = useMemo(() => {
    const timeline = boat.production_timeline || [];
    const completed = timeline.filter(t => t.status === 'completed').length;
    const total = stages.length;
    const inProgress = timeline.filter(t => t.status === 'in_progress').length;
    const delayed = timeline.filter(t => t.status === 'delayed').length;
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      inProgress,
      delayed,
    };
  }, [boat.production_timeline, stages]);

  // Checklist progress
  const checklistProgress = useMemo(() => {
    const items = boat.completion_checklist || [];
    const total = items.length;
    const completed = items.filter(i => i.completed).length;
    const required = items.filter(i => i.required).length;
    const requiredCompleted = items.filter(i => i.required && i.completed).length;
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      required,
      requiredCompleted,
      allRequiredComplete: requiredCompleted === required,
    };
  }, [boat.completion_checklist]);

  const ProjectIcon = theme.icon;
  const canManage = hasPermission('updateProduction');

  // Project-specific quick stats
  const getQuickStats = () => {
    if (projectCategory === 'new_build') {
      return [
        { label: 'Production Stage', value: `${progress.completed}/${progress.total}`, icon: TrendingUp },
        { label: 'Est. Delivery', value: boat.estimated_delivery_date ? formatEuroDate(boat.estimated_delivery_date) : 'TBD', icon: Calendar },
        { label: 'Checklist', value: `${checklistProgress.percent}%`, icon: ClipboardCheck },
        { label: 'CE Status', value: boat.vessel_specification ? 'Ready' : 'Pending', icon: FileCheck },
      ];
    }

    if (projectCategory === 'maintenance') {
      return [
        { label: 'Engine Hours', value: boat.engine_hours?.toLocaleString() || 'N/A', icon: Gauge },
        { label: 'Service Stage', value: `${progress.completed}/${progress.total}`, icon: Wrench },
        { label: 'Checklist', value: `${checklistProgress.percent}%`, icon: ClipboardCheck },
        { label: 'Est. Ready', value: boat.estimated_delivery_date ? formatEuroDate(boat.estimated_delivery_date) : 'TBD', icon: Calendar },
      ];
    }

    // Refit
    return [
      { label: 'Refit Stage', value: `${progress.completed}/${progress.total}`, icon: RefreshCw },
      { label: 'Completion', value: `${progress.percent}%`, icon: TrendingUp },
      { label: 'Checklist', value: `${checklistProgress.percent}%`, icon: ClipboardCheck },
      { label: 'CE Update', value: 'TBD', icon: FileCheck },
    ];
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Project Type Header Banner */}
          <div className={`bg-gradient-to-r ${theme.gradient} text-white px-6 py-4`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <ProjectIcon className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium opacity-90">{categoryInfo.label_en}</span>
                    <Badge className={`${getStatusBadge(boat.status)} text-xs`}>
                      {boat.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold">{boat.boat_name || boat.boat_model}</h2>
                  <p className="text-sm opacity-80">
                    {boat.hull_identification_number || 'No HIN'} • {boat.boat_model}
                    {client && ` • ${client.first_name} ${client.last_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onEdit && canManage && (
                  <Button variant="secondary" size="sm" onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              {getQuickStats().map((stat, idx) => (
                <div key={idx} className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                    <stat.icon className="h-3 w-3" />
                    {stat.label}
                  </div>
                  <div className="font-semibold">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Progress Bar */}
          <div className="px-6 py-3 border-b bg-slate-50">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600 font-medium">
                {projectCategory === 'new_build' ? 'Production Progress' :
                 projectCategory === 'maintenance' ? 'Service Progress' : 'Refit Progress'}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-medium">{progress.percent}%</span>
                {progress.delayed > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {progress.delayed} delayed
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progress.percent} className={`h-2 ${theme.accent}`} />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-2 border-b bg-white">
              <TabsList className="flex-wrap h-auto gap-1 p-0 bg-transparent">
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`text-xs gap-1 data-[state=active]:${theme.secondary} data-[state=active]:${theme.primary}`}
                  >
                    <tab.icon className="h-3 w-3" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {/* ==================== OVERVIEW TAB ==================== */}
                <TabsContent value="overview" className="m-0">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Vessel Info Card */}
                    <Card className={`${theme.border} border-2`}>
                      <CardHeader className={`pb-2 ${theme.secondary}`}>
                        <CardTitle className={`text-sm flex items-center gap-2 ${theme.primary}`}>
                          <Ship className="h-4 w-4" />
                          Vessel Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2 pt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Model</span>
                          <span className="font-medium">{boat.boat_model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Propulsion</span>
                          <span className="font-medium">{boat.propulsion_type}</span>
                        </div>
                        {boat.year_built && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Year</span>
                            <span className="font-medium">{boat.year_built}</span>
                          </div>
                        )}
                        {boat.home_port && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Home Port</span>
                            <span className="font-medium">{boat.home_port}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Project Status Card */}
                    <Card className={`${theme.border} border-2`}>
                      <CardHeader className={`pb-2 ${theme.secondary}`}>
                        <CardTitle className={`text-sm flex items-center gap-2 ${theme.primary}`}>
                          <ProjectIcon className="h-4 w-4" />
                          {projectCategory === 'new_build' ? 'Build Status' :
                           projectCategory === 'maintenance' ? 'Service Status' : 'Refit Status'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2 pt-4">
                        {boat.production_start_date && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Started</span>
                            <span className="font-medium">{formatEuroDate(boat.production_start_date)}</span>
                          </div>
                        )}
                        {boat.estimated_delivery_date && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Est. Completion</span>
                            <span className="font-medium">{formatEuroDate(boat.estimated_delivery_date)}</span>
                          </div>
                        )}
                        {boat.delivery_date && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Delivered</span>
                            <span className="font-medium text-green-600">{formatEuroDate(boat.delivery_date)}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                          <span className="text-slate-500">Stages Completed</span>
                          <span className="font-medium">{progress.completed} / {progress.total}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* PROJECT-SPECIFIC CARDS */}

                    {/* New Build: CE Documentation Card */}
                    {projectCategory === 'new_build' && (
                      <Card className="col-span-2 border-2 border-blue-200">
                        <CardHeader className="pb-2 bg-blue-50">
                          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                            <FileCheck className="h-4 w-4" />
                            CE Documentation Suite
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Required per Recreational Craft Directive 2013/53/EU
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <Settings className="h-6 w-6 mx-auto text-slate-400 mb-2" />
                              <p className="text-xs text-slate-500">Specifications</p>
                              <p className="font-medium text-sm flex items-center justify-center gap-1 mt-1">
                                {boat.vessel_specification ? (
                                  <><CheckCircle2 className="h-4 w-4 text-green-500" /> Complete</>
                                ) : (
                                  <><AlertTriangle className="h-4 w-4 text-orange-500" /> Pending</>
                                )}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <FileText className="h-6 w-6 mx-auto text-blue-400 mb-2" />
                              <p className="text-xs text-slate-500">Owner's Manual</p>
                              <p className="font-medium text-sm flex items-center justify-center gap-1 mt-1">
                                <AlertTriangle className="h-4 w-4 text-orange-500" /> Generate
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <FileCheck className="h-6 w-6 mx-auto text-purple-400 mb-2" />
                              <p className="text-xs text-slate-500">Technical File</p>
                              <p className="font-medium text-sm flex items-center justify-center gap-1 mt-1">
                                <AlertTriangle className="h-4 w-4 text-orange-500" /> Generate
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <Shield className="h-6 w-6 mx-auto text-green-400 mb-2" />
                              <p className="text-xs text-slate-500">Declaration</p>
                              <p className="font-medium text-sm flex items-center justify-center gap-1 mt-1">
                                <AlertTriangle className="h-4 w-4 text-orange-500" /> Pending
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Maintenance: Service Information Card */}
                    {projectCategory === 'maintenance' && (
                      <Card className="col-span-2 border-2 border-orange-200">
                        <CardHeader className="pb-2 bg-orange-50">
                          <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                            <Gauge className="h-4 w-4" />
                            Service Information
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Current service details and vessel condition
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <Gauge className="h-6 w-6 mx-auto text-orange-400 mb-2" />
                              <p className="text-xs text-slate-500">Engine Hours</p>
                              <p className="font-medium text-lg">{boat.engine_hours?.toLocaleString() || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <Calendar className="h-6 w-6 mx-auto text-blue-400 mb-2" />
                              <p className="text-xs text-slate-500">Last Service</p>
                              <p className="font-medium text-sm">
                                {boat.last_engine_hours_update ? formatEuroDate(boat.last_engine_hours_update) : 'N/A'}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <Wrench className="h-6 w-6 mx-auto text-purple-400 mb-2" />
                              <p className="text-xs text-slate-500">Service Type</p>
                              <p className="font-medium text-sm">Annual Service</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-center">
                              <Timer className="h-6 w-6 mx-auto text-green-400 mb-2" />
                              <p className="text-xs text-slate-500">Est. Duration</p>
                              <p className="font-medium text-sm">2 Days</p>
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-xs text-orange-700">
                              <strong>Note:</strong> CE documentation is not required for routine maintenance. Only structural modifications or major upgrades may require CE update.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Refit: Scope Overview Card */}
                    {projectCategory === 'refit' && (
                      <Card className="col-span-2 border-2 border-purple-200">
                        <CardHeader className="pb-2 bg-purple-50">
                          <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                            <RefreshCw className="h-4 w-4" />
                            Refit Scope
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Planned modifications and upgrade summary
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-2">Structural Changes</p>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium">To be assessed</span>
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-2">System Upgrades</p>
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium">Planned</span>
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-2">CE Update Required</p>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium">TBD</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-700">
                              <strong>Important:</strong> Major structural or propulsion changes require updated CE documentation and may need re-certification.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick Actions */}
                    <Card className="col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowChecklist(true)} className={theme.primary}>
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            {projectCategory === 'new_build' ? 'Completion Checklist' :
                             projectCategory === 'maintenance' ? 'Service Checklist' : 'Refit Checklist'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setActiveTab('timeline')}>
                            <Calendar className="h-4 w-4 mr-1" />
                            View Timeline
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setActiveTab('photos')}>
                            <Camera className="h-4 w-4 mr-1" />
                            {projectCategory === 'new_build' ? 'Build Photos' :
                             projectCategory === 'maintenance' ? 'Service Photos' : 'Before/After'}
                          </Button>
                          {projectCategory === 'new_build' && (
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('ce-docs')}>
                              <FileText className="h-4 w-4 mr-1" />
                              CE Documents
                            </Button>
                          )}
                        </div>

                        {/* Template Selection for Checklist */}
                        {availableTemplates.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <label className="text-xs text-slate-500 mb-2 block">Use Checklist Template:</label>
                            <div className="flex gap-2">
                              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select a template..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTemplates.map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name} ({t.items.length} items)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={!selectedTemplate}
                                onClick={() => {
                                  // Apply template to vessel
                                  const checklistItems = applyTemplateToChecklist(selectedTemplate);
                                  if (checklistItems) {
                                    updateClientBoat(boat.id, {
                                      completion_checklist: checklistItems,
                                    });
                                    setSelectedTemplate('');
                                    setShowChecklist(true);
                                  }
                                }}
                              >
                                Apply Template
                              </Button>
                            </div>
                            {boat.completion_checklist && boat.completion_checklist.length > 0 && (
                              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Applying a template will replace the current checklist
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* ==================== TIMELINE TAB ==================== */}
                <TabsContent value="timeline" className="m-0">
                  <ProductionTimeline
                    boat={boat}
                    onUpdate={(boatId, updates) => updateClientBoat(boatId, updates)}
                  />
                </TabsContent>

                {/* ==================== CHECKLIST TAB ==================== */}
                <TabsContent value="checklist" className="m-0">
                  <Card className={`${theme.border} border-2`}>
                    <CardHeader className={theme.secondary}>
                      <CardTitle className={`flex items-center gap-2 ${theme.primary}`}>
                        <ClipboardCheck className="h-5 w-5" />
                        {projectCategory === 'new_build' ? 'Vessel Completion Checklist' :
                         projectCategory === 'maintenance' ? 'Service Checklist' : 'Refit Completion Checklist'}
                      </CardTitle>
                      <CardDescription>
                        {projectCategory === 'new_build'
                          ? 'Complete all required items before vessel delivery'
                          : projectCategory === 'maintenance'
                          ? 'Service checklist items for quality assurance'
                          : 'Refit completion verification'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {/* Checklist Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Checklist Progress</span>
                          <span className="font-medium">{checklistProgress.percent}%</span>
                        </div>
                        <Progress value={checklistProgress.percent} className="h-2" />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>{checklistProgress.completed}/{checklistProgress.total} items</span>
                          <span>{checklistProgress.requiredCompleted}/{checklistProgress.required} required</span>
                        </div>
                      </div>

                      <Button onClick={() => setShowChecklist(true)} className={theme.accent}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Open Full Checklist
                      </Button>

                      {boat.completion_signoff?.completed && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">Sign-off Completed</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1">
                            Signed by {boat.completion_signoff.signoff_by_name} on{' '}
                            {boat.completion_signoff.signoff_at && formatEuroDate(boat.completion_signoff.signoff_at)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ==================== CE DOCS TAB (New Build Only) ==================== */}
                {projectCategory === 'new_build' && (
                  <TabsContent value="ce-docs" className="m-0">
                    <div className="space-y-4">
                      <Card className="border-2 border-blue-200">
                        <CardHeader className="bg-blue-50">
                          <CardTitle className="flex items-center gap-2 text-blue-700">
                            <FileCheck className="h-5 w-5" />
                            CE Documentation Suite
                          </CardTitle>
                          <CardDescription>
                            Required documentation per Recreational Craft Directive 2013/53/EU
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                          <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-blue-600" />
                              <div>
                                <p className="font-medium">Owner's Manual</p>
                                <p className="text-sm text-slate-500">15-chapter CE-compliant manual</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Generate</Button>
                          </div>
                          <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-purple-600" />
                              <div>
                                <p className="font-medium">Technical File</p>
                                <p className="text-sm text-slate-500">Technical construction file</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Generate</Button>
                          </div>
                          <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <Shield className="h-8 w-8 text-green-600" />
                              <div>
                                <p className="font-medium">Declaration of Conformity</p>
                                <p className="text-sm text-slate-500">CE marking declaration</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Generate</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                )}

                {/* ==================== SPECIFICATIONS TAB (New Build Only) ==================== */}
                {projectCategory === 'new_build' && (
                  <TabsContent value="specifications" className="m-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-slate-600" />
                          Vessel Specifications
                        </CardTitle>
                        <CardDescription>
                          Technical specifications for CE documentation
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {boat.vessel_specification ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="font-medium">Specifications Complete</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-slate-500 text-xs">Design Category</p>
                                <p className="font-medium">{boat.vessel_specification.general.design_category || 'Not set'}</p>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-slate-500 text-xs">Vessel Type</p>
                                <p className="font-medium">{boat.vessel_specification.general.vessel_type || 'Not set'}</p>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-slate-500 text-xs">Length Overall</p>
                                <p className="font-medium">{boat.vessel_specification.dimensions.length_overall_m || 'N/A'} m</p>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-slate-500 text-xs">Max Persons</p>
                                <p className="font-medium">{boat.vessel_specification.safety.max_persons || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Settings className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 mb-4">No specifications entered yet</p>
                            <Button variant="outline">
                              <Settings className="h-4 w-4 mr-2" />
                              Fill Vessel Specifications
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ==================== SERVICE INFO TAB (Maintenance Only) ==================== */}
                {projectCategory === 'maintenance' && (
                  <TabsContent value="service-info" className="m-0">
                    <Card className="border-2 border-orange-200">
                      <CardHeader className="bg-orange-50">
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                          <ClipboardList className="h-5 w-5" />
                          Service Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Current Engine Hours</p>
                            <p className="text-2xl font-bold text-orange-700">{boat.engine_hours?.toLocaleString() || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Service Type</p>
                            <p className="text-lg font-semibold">Annual Service</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <h4 className="font-medium text-sm">Service Items:</h4>
                          <ul className="text-sm space-y-1 text-slate-600">
                            <li>• Engine oil and filter change</li>
                            <li>• Fuel system inspection</li>
                            <li>• Cooling system check</li>
                            <li>• Electrical system inspection</li>
                            <li>• Safety equipment verification</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ==================== HISTORY TAB (Maintenance Only) ==================== */}
                {projectCategory === 'maintenance' && (
                  <TabsContent value="history" className="m-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5 text-slate-600" />
                          Service History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-slate-400">
                          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Previous service records will be shown here</p>
                          <p className="text-sm">Access via Maintenance module</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ==================== SCOPE TAB (Refit Only) ==================== */}
                {projectCategory === 'refit' && (
                  <TabsContent value="scope" className="m-0">
                    <Card className="border-2 border-purple-200">
                      <CardHeader className="bg-purple-50">
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <RefreshCw className="h-5 w-5" />
                          Refit Scope & Modifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="text-center py-8 text-slate-400">
                          <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Refit specifications and modifications will be defined here</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ==================== CE UPDATE TAB (Refit Only) ==================== */}
                {projectCategory === 'refit' && (
                  <TabsContent value="ce-update" className="m-0">
                    <Card className="border-2 border-purple-200">
                      <CardHeader className="bg-purple-50">
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <FileCheck className="h-5 w-5" />
                          CE Documentation Update
                        </CardTitle>
                        <CardDescription>
                          Assess whether modifications require CE update
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-800">Assessment Required</p>
                              <p className="text-sm text-yellow-700 mt-1">
                                The following modifications may require CE documentation update:
                              </p>
                              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                                <li>• Structural modifications affecting hull integrity</li>
                                <li>• Propulsion system changes</li>
                                <li>• Electrical system major upgrades</li>
                                <li>• Changes affecting max persons or load capacity</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ==================== PHOTOS TAB ==================== */}
                <TabsContent value="photos" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-teal-600" />
                        {projectCategory === 'new_build' ? 'Build Documentation Photos' :
                         projectCategory === 'maintenance' ? 'Service Photos' : 'Before/After Photos'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-slate-400">
                        <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Photo gallery will be shown here</p>
                        <p className="text-sm">Access via Vessel Photos section</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ==================== PARTS TAB ==================== */}
                <TabsContent value="parts" className="m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-600" />
                        {projectCategory === 'new_build' ? 'Parts & Equipment List' :
                         projectCategory === 'maintenance' ? 'Parts Replaced' : 'Parts Used in Refit'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-slate-400">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Parts list will be shown here</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      {showChecklist && (
        <VesselCompletionChecklist
          boat={boat}
          open={showChecklist}
          onClose={() => setShowChecklist(false)}
        />
      )}
    </>
  );
}

export default VesselDetailView;
