'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Ship, ChevronLeft, ChevronRight, Filter, Search, Clock, CheckCircle2,
  AlertCircle, Play, Users, User, GripHorizontal, Move, Save, X, Plus, ClipboardCheck
} from 'lucide-react';
import { VesselCompletionChecklist } from './VesselCompletionChecklist';
import { useNavisol } from '@/lib/store';
import { useAuth } from '@/lib/auth-store';
import { formatEuroDate, generateId } from '@/lib/formatting';
import {
  type ClientBoat,
  type ProductionStage,
  type ProductionTimelineEntry,
  type ProjectCategory,
  type MaintenanceStage,
  PRODUCTION_STAGES,
  MAINTENANCE_STAGES,
  PROJECT_CATEGORY_INFO,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// Stage colors for new builds / refits
const STAGE_COLORS: Record<ProductionStage, string> = {
  order_confirmed: 'bg-slate-500',
  hull_construction: 'bg-blue-600',
  structural_work: 'bg-indigo-600',
  propulsion_installation: 'bg-purple-600',
  electrical_systems: 'bg-yellow-500',
  interior_finishing: 'bg-orange-500',
  deck_equipment: 'bg-teal-500',
  quality_inspection: 'bg-cyan-500',
  sea_trial: 'bg-emerald-500',
  final_delivery: 'bg-green-600',
};

// Stage colors for maintenance projects (shorter workflow)
const MAINTENANCE_STAGE_COLORS: Record<MaintenanceStage, string> = {
  intake: 'bg-slate-500',
  diagnosis: 'bg-blue-500',
  parts_ordering: 'bg-yellow-500',
  repair_work: 'bg-orange-500',
  testing: 'bg-cyan-500',
  delivery: 'bg-green-600',
};

// Get stage color based on project category
const getStageColor = (stageId: string, category: ProjectCategory): string => {
  if (category === 'maintenance') {
    return MAINTENANCE_STAGE_COLORS[stageId as MaintenanceStage] || 'bg-slate-400';
  }
  return STAGE_COLORS[stageId as ProductionStage] || 'bg-slate-400';
};

// Get stages for a project category
const getStagesForProject = (category: ProjectCategory) => {
  if (category === 'maintenance') {
    return MAINTENANCE_STAGES;
  }
  return PRODUCTION_STAGES;
};

const STATUS_COLORS = {
  pending: 'bg-slate-300',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  delayed: 'bg-red-500',
};

// Worker interface
interface ProductionWorker {
  id: string;
  name: string;
  role: string;
  skills: ProductionStage[];
  availability: 'available' | 'busy' | 'unavailable';
  color: string;
}

// Sample workers
const SAMPLE_WORKERS: ProductionWorker[] = [
  { id: 'w1', name: 'Jan de Vries', role: 'Hull Specialist', skills: ['hull_construction', 'structural_work'], availability: 'available', color: 'bg-blue-500' },
  { id: 'w2', name: 'Pieter Bakker', role: 'Electrician', skills: ['electrical_systems', 'propulsion_installation'], availability: 'available', color: 'bg-yellow-500' },
  { id: 'w3', name: 'Kees Jansen', role: 'Interior', skills: ['interior_finishing', 'deck_equipment'], availability: 'busy', color: 'bg-orange-500' },
  { id: 'w4', name: 'Willem van Dijk', role: 'QA', skills: ['quality_inspection', 'sea_trial', 'final_delivery'], availability: 'available', color: 'bg-green-500' },
  { id: 'w5', name: 'Hendrik Smit', role: 'Technician', skills: ['hull_construction', 'structural_work', 'deck_equipment'], availability: 'available', color: 'bg-purple-500' },
];

type ViewMode = 'month' | 'quarter' | 'year';
type TabMode = 'gantt' | 'resources';

const getStageInfo = (stageId: string, category: ProjectCategory = 'new_build') => {
  if (category === 'maintenance') {
    return MAINTENANCE_STAGES.find(s => s.id === stageId);
  }
  return PRODUCTION_STAGES.find(s => s.id === stageId);
};
const formatDateISO = (date: Date): string => date.toISOString().split('T')[0];
const parseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};
const daysBetween = (start: Date, end: Date): number => Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDefaultStageDuration = (stage: ProductionStage): number => {
  const durations: Record<ProductionStage, number> = {
    order_confirmed: 7, hull_construction: 30, structural_work: 21,
    propulsion_installation: 14, electrical_systems: 14, interior_finishing: 21,
    deck_equipment: 14, quality_inspection: 7, sea_trial: 3, final_delivery: 2,
  };
  return durations[stage] || 14;
};

interface DragState {
  boatId: string;
  stageId: string;
  originalStart: Date;
  originalEnd: Date;
  dragType: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  currentOffset: number;
}

export function ProductionCalendar() {
  const { clientBoats, getClientById, updateClientBoat } = useNavisol();
  const { hasPermission } = useAuth();
  const timelineRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabMode>('gantt');
  const [viewMode, setViewMode] = useState<ViewMode>('quarter');
  const [viewDate, setViewDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedBoat, setSelectedBoat] = useState<ClientBoat | null>(null);
  const [showCompletionChecklist, setShowCompletionChecklist] = useState<ClientBoat | null>(null);
  const [hoveredStage, setHoveredStage] = useState<{ boatId: string; stageId: string } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, { boatId: string; stageId: string; newStart: string; newEnd: string }>>(new Map());
  const [showAssignDialog, setShowAssignDialog] = useState<{ boatId: string; stage: ProductionTimelineEntry } | null>(null);
  const [workers] = useState<ProductionWorker[]>(SAMPLE_WORKERS);

  const viewRange = useMemo(() => {
    const start = new Date(viewDate);
    const end = new Date(viewDate);
    switch (viewMode) {
      case 'month': start.setDate(1); end.setMonth(end.getMonth() + 1, 0); break;
      case 'quarter': start.setDate(1); end.setMonth(end.getMonth() + 3, 0); break;
      case 'year': start.setMonth(0, 1); end.setMonth(11, 31); break;
    }
    return { start, end, days: daysBetween(start, end) + 1 };
  }, [viewDate, viewMode]);

  const columns = useMemo(() => {
    const cols: { date: Date; label: string; isWeekend: boolean; isToday: boolean; isMonthStart: boolean }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let currentDate = new Date(viewRange.start);
    while (currentDate <= viewRange.end) {
      cols.push({
        date: new Date(currentDate),
        label: currentDate.getDate().toString(),
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        isToday: currentDate.getTime() === today.getTime(),
        isMonthStart: currentDate.getDate() === 1,
      });
      currentDate = addDays(currentDate, 1);
    }
    return cols;
  }, [viewRange]);

  const monthHeaders = useMemo(() => {
    const months: { month: string; year: number; startCol: number; span: number }[] = [];
    let currentMonth = -1, currentYear = -1, startCol = 0;
    columns.forEach((col, idx) => {
      const month = col.date.getMonth(), year = col.date.getFullYear();
      if (month !== currentMonth || year !== currentYear) {
        if (currentMonth !== -1) months[months.length - 1].span = idx - startCol;
        months.push({ month: col.date.toLocaleString('en-US', { month: 'short' }), year, startCol: idx, span: 1 });
        currentMonth = month; currentYear = year; startCol = idx;
      }
    });
    if (months.length > 0) months[months.length - 1].span = columns.length - months[months.length - 1].startCol;
    return months;
  }, [columns]);

  const filteredBoats = useMemo(() => {
    let boats = [...clientBoats];
    if (filterStatus && filterStatus !== 'all') boats = boats.filter(b => b.status === filterStatus);
    if (filterCategory && filterCategory !== 'all') boats = boats.filter(b => (b.project_category || 'new_build') === filterCategory);
    if (!showCompleted) boats = boats.filter(b => b.status !== 'delivered');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      boats = boats.filter(b => b.boat_name?.toLowerCase().includes(q) || b.boat_model.toLowerCase().includes(q));
    }
    boats.sort((a, b) => new Date(a.production_start_date || a.created_at).getTime() - new Date(b.production_start_date || b.created_at).getTime());
    return boats;
  }, [clientBoats, filterStatus, filterCategory, showCompleted, searchQuery]);

  // Aggregate counts by project category
  const categoryStats = useMemo(() => {
    const stats = {
      new_build: { total: 0, in_production: 0 },
      maintenance: { total: 0, in_production: 0 },
      refit: { total: 0, in_production: 0 },
    };
    clientBoats.forEach(boat => {
      const cat = boat.project_category || 'new_build';
      stats[cat].total++;
      if (boat.status === 'in_production') stats[cat].in_production++;
    });
    return stats;
  }, [clientBoats]);

  const navigateTime = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    const delta = direction === 'next' ? 1 : -1;
    switch (viewMode) {
      case 'month': newDate.setMonth(newDate.getMonth() + delta); break;
      case 'quarter': newDate.setMonth(newDate.getMonth() + delta * 3); break;
      case 'year': newDate.setFullYear(newDate.getFullYear() + delta); break;
    }
    setViewDate(newDate);
  };

  const getStagePosition = (stage: ProductionTimelineEntry, rangeStart: Date, totalDays: number, pendingChange?: { newStart: string; newEnd: string }) => {
    const startDateStr = pendingChange?.newStart || stage.actual_start_date || stage.planned_start_date;
    const endDateStr = pendingChange?.newEnd || stage.actual_end_date || stage.planned_end_date;
    const startDate = parseDate(startDateStr);
    if (!startDate) return null;
    const effectiveEnd = parseDate(endDateStr) || addDays(startDate, getDefaultStageDuration(stage.stage));
    const startOffset = daysBetween(rangeStart, startDate);
    const duration = daysBetween(startDate, effectiveEnd) + 1;
    if (startOffset + duration < 0 || startOffset > totalDays) return null;
    const left = Math.max(0, (startOffset / totalDays) * 100);
    const width = Math.min(((Math.min(startOffset + duration, totalDays) - Math.max(startOffset, 0)) / totalDays) * 100, 100 - left);
    return { left, width: Math.max(width, 0.5), startDate, endDate: effectiveEnd };
  };

  const handleDragStart = useCallback((e: React.MouseEvent, boatId: string, stage: ProductionTimelineEntry, dragType: 'move' | 'resize-start' | 'resize-end') => {
    if (!hasPermission('updateProduction')) return;
    e.preventDefault(); e.stopPropagation();
    const startDate = parseDate(stage.actual_start_date || stage.planned_start_date);
    const endDate = parseDate(stage.actual_end_date || stage.planned_end_date) || (startDate ? addDays(startDate, getDefaultStageDuration(stage.stage)) : null);
    if (!startDate || !endDate) return;
    setDragState({ boatId, stageId: stage.id, originalStart: startDate, originalEnd: endDate, dragType, startX: e.clientX, currentOffset: 0 });
  }, [hasPermission]);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !timelineRef.current) return;
    const containerWidth = timelineRef.current.offsetWidth - 200;
    const pixelsPerDay = containerWidth / viewRange.days;
    const daysDelta = Math.round((e.clientX - dragState.startX) / pixelsPerDay);
    if (daysDelta !== dragState.currentOffset) {
      let newStart = dragState.originalStart, newEnd = dragState.originalEnd;
      switch (dragState.dragType) {
        case 'move': newStart = addDays(dragState.originalStart, daysDelta); newEnd = addDays(dragState.originalEnd, daysDelta); break;
        case 'resize-start': newStart = addDays(dragState.originalStart, daysDelta); if (newStart >= newEnd) newStart = addDays(newEnd, -1); break;
        case 'resize-end': newEnd = addDays(dragState.originalEnd, daysDelta); if (newEnd <= newStart) newEnd = addDays(newStart, 1); break;
      }
      const key = `${dragState.boatId}-${dragState.stageId}`;
      setPendingChanges(prev => { const next = new Map(prev); next.set(key, { boatId: dragState.boatId, stageId: dragState.stageId, newStart: formatDateISO(newStart), newEnd: formatDateISO(newEnd) }); return next; });
      setDragState(prev => prev ? { ...prev, currentOffset: daysDelta } : null);
    }
  }, [dragState, viewRange.days]);

  const handleDragEnd = useCallback(() => setDragState(null), []);

  const applyChanges = useCallback(() => {
    pendingChanges.forEach((change) => {
      const boat = clientBoats.find(b => b.id === change.boatId);
      if (!boat) return;
      const updatedTimeline = (boat.production_timeline || []).map(stage => stage.id === change.stageId ? { ...stage, planned_start_date: change.newStart, planned_end_date: change.newEnd } : stage);
      updateClientBoat(change.boatId, { production_timeline: updatedTimeline });
    });
    setPendingChanges(new Map());
  }, [pendingChanges, clientBoats, updateClientBoat]);

  const handleAssignWorkers = (workerIds: string[]) => {
    if (!showAssignDialog) return;
    const boat = clientBoats.find(b => b.id === showAssignDialog.boatId);
    if (!boat) return;
    const updatedTimeline = (boat.production_timeline || []).map(stage => stage.id === showAssignDialog.stage.id ? { ...stage, assigned_workers: workerIds } : stage);
    updateClientBoat(showAssignDialog.boatId, { production_timeline: updatedTimeline });
    setShowAssignDialog(null);
  };

  const getClientName = (clientId: string): string => { const client = getClientById(clientId); return client ? `${client.first_name} ${client.last_name}` : 'Unknown'; };
  const getProductionProgress = (boat: ClientBoat) => {
    const timeline = boat.production_timeline || [];
    const completed = timeline.filter(t => t.status === 'completed').length;
    const category = boat.project_category || 'new_build';
    const totalStages = category === 'maintenance' ? MAINTENANCE_STAGES.length : PRODUCTION_STAGES.length;
    return { completed, total: totalStages, percent: Math.round((completed / totalStages) * 100) };
  };
  const getWorkerById = (id: string) => workers.find(w => w.id === id);
  const getWorkerWorkload = (workerId: string) => {
    const assignments: { boat: ClientBoat; stage: ProductionTimelineEntry }[] = [];
    clientBoats.forEach(boat => { boat.production_timeline?.forEach(stage => { if (stage.assigned_workers?.includes(workerId) && stage.status !== 'completed') assignments.push({ boat, stage }); }); });
    return { total: assignments.length, stages: assignments };
  };

  const canEdit = hasPermission('updateProduction');
  const cellWidth = viewMode === 'month' ? 32 : viewMode === 'quarter' ? 16 : 8;

  return (
    <TooltipProvider>
      <div className="space-y-6" onMouseMove={dragState ? handleDragMove : undefined} onMouseUp={dragState ? handleDragEnd : undefined} onMouseLeave={dragState ? handleDragEnd : undefined}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Ship className="h-7 w-7 text-teal-600" />
              Production Calendar
            </h1>
            <p className="text-slate-600">Gantt view with drag-and-drop scheduling</p>
          </div>
          <div className="flex items-center gap-2">
            {(['month', 'quarter', 'year'] as ViewMode[]).map(mode => (
              <Button key={mode} variant={viewMode === mode ? 'default' : 'outline'} size="sm" onClick={() => setViewMode(mode)}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Pending Changes Banner */}
        {pendingChanges.size > 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Move className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800">{pendingChanges.size} unsaved change{pendingChanges.size > 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPendingChanges(new Map())}><X className="h-4 w-4 mr-1" />Discard</Button>
                  <Button size="sm" onClick={applyChanges} className="bg-amber-600 hover:bg-amber-700"><Save className="h-4 w-4 mr-1" />Save</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabMode)}>
          <TabsList>
            <TabsTrigger value="gantt" className="gap-2"><Ship className="h-4 w-4" />Gantt View</TabsTrigger>
            <TabsTrigger value="resources" className="gap-2"><Users className="h-4 w-4" />Resources</TabsTrigger>
          </TabsList>

          {/* Gantt Tab */}
          <TabsContent value="gantt" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => navigateTime('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" onClick={() => setViewDate(new Date())}>Today</Button>
                      <Button variant="outline" size="icon" onClick={() => navigateTime('next')}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div className="text-lg font-semibold text-slate-700">
                      {viewRange.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {viewRange.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input placeholder="Search vessels..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    {/* Project Category Filter - Primary distinction */}
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-44">
                        <Ship className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All projects</SelectItem>
                        <SelectItem value="new_build">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            New Build
                          </div>
                        </SelectItem>
                        <SelectItem value="maintenance">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            Maintenance
                          </div>
                        </SelectItem>
                        <SelectItem value="refit">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            Refit
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="in_production">In Production</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch checked={showCompleted} onCheckedChange={setShowCompleted} id="show-completed" />
                      <Label htmlFor="show-completed" className="text-sm cursor-pointer">Show Delivered</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Project Categories Legend */}
                  <span className="text-sm font-medium text-slate-600">Projects:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs text-slate-600">New Build ({categoryStats.new_build.in_production}/{categoryStats.new_build.total})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-xs text-slate-600">Maintenance ({categoryStats.maintenance.in_production}/{categoryStats.maintenance.total})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-xs text-slate-600">Refit ({categoryStats.refit.in_production}/{categoryStats.refit.total})</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm font-medium text-slate-600">Stages:</span>
                  {PRODUCTION_STAGES.slice(0, 4).map(stage => (
                    <div key={stage.id} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${STAGE_COLORS[stage.id]}`} />
                      <span className="text-xs text-slate-600">{stage.name_en}</span>
                    </div>
                  ))}
                  <span className="text-xs text-slate-400">+6 more</span>
                  {canEdit && <><Separator orientation="vertical" className="h-4" /><span className="text-xs text-slate-500 flex items-center gap-1"><GripHorizontal className="h-3 w-3" />Drag to reschedule</span></>}
                </div>
              </CardContent>
            </Card>

            {/* Gantt Chart */}
            <Card>
              <CardContent className="p-0">
                {filteredBoats.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Ship className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No vessels found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div ref={timelineRef} style={{ minWidth: `${200 + columns.length * cellWidth}px` }}>
                      {/* Header */}
                      <div className="flex border-b bg-slate-50 sticky top-0 z-10">
                        <div className="w-[200px] min-w-[200px] p-3 font-semibold text-slate-700 border-r bg-slate-100 sticky left-0 z-20">Vessel</div>
                        <div className="flex flex-col flex-1">
                          <div className="flex border-b">
                            {monthHeaders.map((month, idx) => (
                              <div key={idx} className="text-center text-xs font-semibold text-slate-600 py-1 border-r bg-slate-50" style={{ width: `${month.span * cellWidth}px` }}>
                                {month.month} {month.year}
                              </div>
                            ))}
                          </div>
                          <div className="flex">
                            {columns.map((col, idx) => (
                              <div key={idx} className={`text-center text-[10px] py-1 border-r ${col.isToday ? 'bg-teal-100 text-teal-800 font-bold' : col.isWeekend ? 'bg-slate-100 text-slate-400' : 'text-slate-500'}`} style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}>
                                {viewMode !== 'year' && col.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Rows */}
                      {filteredBoats.map((boat) => {
                        const progress = getProductionProgress(boat);
                        const timeline = boat.production_timeline || [];
                        const category = boat.project_category || 'new_build';
                        const categoryInfo = PROJECT_CATEGORY_INFO[category];
                        const categoryBorderColor = category === 'new_build' ? 'border-l-blue-500' : category === 'maintenance' ? 'border-l-orange-500' : 'border-l-purple-500';
                        return (
                          <div key={boat.id} className="flex border-b hover:bg-slate-50/50">
                            <div className={`w-[200px] min-w-[200px] p-3 border-r border-l-4 ${categoryBorderColor} bg-white sticky left-0 z-10 cursor-pointer hover:bg-slate-50`} onClick={() => setSelectedBoat(boat)}>
                              <div className="flex items-center gap-2">
                                <Ship className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-medium text-slate-900 truncate text-sm">{boat.boat_name || boat.boat_model}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className={`text-[10px] py-0 px-1 ${categoryInfo.bgColor} ${categoryInfo.color} border-0`}>
                                      {categoryInfo.label_en}
                                    </Badge>
                                    <span className="text-xs text-slate-400">•</span>
                                    <p className="text-xs text-slate-500 truncate">{boat.hull_identification_number || 'No HIN'}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${progress.percent}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 font-medium">{progress.percent}%</span>
                              </div>
                            </div>
                            <div className="relative flex-1" style={{ height: '80px' }}>
                              {/* Grid */}
                              <div className="absolute inset-0 flex">
                                {columns.map((col, idx) => (
                                  <div key={idx} className={`h-full border-r ${col.isToday ? 'bg-teal-50/50' : col.isWeekend ? 'bg-slate-50/50' : ''}`} style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }} />
                                ))}
                              </div>
                              {/* Today line */}
                              {columns.findIndex(c => c.isToday) >= 0 && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-teal-500 z-10" style={{ left: `${(columns.findIndex(c => c.isToday) / columns.length) * 100}%` }} />
                              )}
                              {/* Bars */}
                              <div className="absolute inset-0 p-2">
                                {timeline.map((stage, stageIdx) => {
                                  const key = `${boat.id}-${stage.id}`;
                                  const pendingChange = pendingChanges.get(key);
                                  const pos = getStagePosition(stage, viewRange.start, viewRange.days, pendingChange);
                                  if (!pos) return null;
                                  const stageInfo = getStageInfo(stage.stage, category);
                                  const stageColor = getStageColor(stage.stage, category);
                                  const isDragging = dragState?.boatId === boat.id && dragState?.stageId === stage.id;
                                  const hasWorkers = stage.assigned_workers && stage.assigned_workers.length > 0;
                                  return (
                                    <Tooltip key={stage.id}>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={`absolute h-6 rounded ${stageColor} ${stage.status === 'delayed' ? 'ring-2 ring-red-400' : ''} ${isDragging ? 'ring-2 ring-white shadow-lg scale-105 z-20' : ''} ${pendingChange ? 'ring-2 ring-amber-400' : ''} ${canEdit ? 'cursor-move' : ''}`}
                                          style={{ left: `${pos.left}%`, width: `${pos.width}%`, top: `${8 + (stageIdx % 2) * 28}px`, opacity: stage.status === 'completed' ? 0.8 : 1 }}
                                          onMouseDown={(e) => handleDragStart(e, boat.id, stage, 'move')}
                                          onDoubleClick={() => canEdit && setShowAssignDialog({ boatId: boat.id, stage })}
                                        >
                                          {canEdit && pos.width > 3 && (
                                            <>
                                              <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" onMouseDown={(e) => handleDragStart(e, boat.id, stage, 'resize-start')} />
                                              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" onMouseDown={(e) => handleDragStart(e, boat.id, stage, 'resize-end')} />
                                            </>
                                          )}
                                          {pos.width > 8 && <div className="px-1.5 py-0.5 text-[10px] text-white truncate font-medium flex items-center gap-1">{canEdit && <GripHorizontal className="h-3 w-3 opacity-50" />}{stageInfo?.name_en}</div>}
                                          <div className={`absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${STATUS_COLORS[stage.status]}`} />
                                          {hasWorkers && pos.width > 6 && (
                                            <div className="absolute -bottom-1 left-1 flex -space-x-1">
                                              {stage.assigned_workers!.slice(0, 3).map(wId => { const worker = getWorkerById(wId); return worker ? <div key={wId} className={`w-3 h-3 rounded-full border border-white ${worker.color}`} title={worker.name} /> : null; })}
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <div className="space-y-1">
                                          <p className="font-semibold">{stageInfo?.name_en}</p>
                                          <p className="text-xs">Status: <Badge variant="outline" className="text-xs py-0">{stage.status}</Badge></p>
                                          <p className="text-xs text-slate-500">{formatEuroDate(formatDateISO(pos.startDate))} - {formatEuroDate(formatDateISO(pos.endDate))}</p>
                                          {hasWorkers && <p className="text-xs">Workers: {stage.assigned_workers!.map(wId => getWorkerById(wId)?.name).filter(Boolean).join(', ')}</p>}
                                          {canEdit && <p className="text-xs text-slate-400 italic">Drag to move • Double-click to assign</p>}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-teal-600" />Production Team</CardTitle>
                  <CardDescription>{workers.length} workers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workers.map(worker => {
                      const workload = getWorkerWorkload(worker.id);
                      return (
                        <div key={worker.id} className="p-3 rounded-lg border hover:border-teal-300">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${worker.color} flex items-center justify-center text-white font-semibold`}>
                              {worker.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900">{worker.name}</p>
                              <p className="text-xs text-slate-500">{worker.role}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={worker.availability === 'available' ? 'default' : worker.availability === 'busy' ? 'secondary' : 'outline'} className="text-xs">{worker.availability}</Badge>
                              <p className="text-xs text-slate-500 mt-1">{workload.total} task{workload.total !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {worker.skills.slice(0, 3).map(skill => <Badge key={skill} variant="outline" className="text-[10px] py-0">{getStageInfo(skill)?.name_en}</Badge>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Workload Overview</CardTitle>
                  <CardDescription>Active assignments per worker</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workers.map(worker => {
                      const workload = getWorkerWorkload(worker.id);
                      const maxLoad = 5, loadPercent = Math.min((workload.total / maxLoad) * 100, 100);
                      return (
                        <div key={worker.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full ${worker.color} flex items-center justify-center text-white text-xs font-semibold`}>{worker.name.split(' ').map(n => n[0]).join('')}</div>
                              <span className="font-medium text-sm">{worker.name}</span>
                            </div>
                            <span className="text-sm text-slate-500">{workload.total} / {maxLoad} tasks</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${loadPercent > 80 ? 'bg-red-500' : loadPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${loadPercent}%` }} />
                          </div>
                          {workload.stages.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {workload.stages.map(({ boat, stage }) => <Badge key={`${boat.id}-${stage.id}`} variant="outline" className="text-[10px] py-0">{boat.boat_name || boat.boat_model}: {getStageInfo(stage.stage)?.name_en}</Badge>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assignment Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Matrix</CardTitle>
                <CardDescription>Worker assignments across vessels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium text-slate-600">Vessel</th>
                        {PRODUCTION_STAGES.map(stage => (
                          <th key={stage.id} className="text-center p-2 font-medium text-slate-600 min-w-[80px]">
                            <div className={`w-3 h-3 rounded mx-auto mb-1 ${STAGE_COLORS[stage.id]}`} />
                            <span className="text-[10px]">{stage.name_en.split(' ')[0]}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBoats.filter(b => b.status !== 'delivered').slice(0, 10).map(boat => (
                        <tr key={boat.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-medium">{boat.boat_name || boat.boat_model}</td>
                          {PRODUCTION_STAGES.map(stageInfo => {
                            const stage = boat.production_timeline?.find(t => t.stage === stageInfo.id);
                            const assignedWorkers = stage?.assigned_workers || [];
                            return (
                              <td key={stageInfo.id} className="p-2 text-center">
                                {stage ? (
                                  <div className="flex justify-center -space-x-1">
                                    {assignedWorkers.length === 0 ? (
                                      <button onClick={() => canEdit && stage && setShowAssignDialog({ boatId: boat.id, stage })} className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-teal-400 hover:text-teal-500">
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    ) : (
                                      assignedWorkers.slice(0, 2).map(wId => {
                                        const worker = getWorkerById(wId);
                                        return worker ? (
                                          <Tooltip key={wId}>
                                            <TooltipTrigger>
                                              <div className={`w-6 h-6 rounded-full ${worker.color} border-2 border-white flex items-center justify-center text-white text-[10px] font-semibold cursor-pointer`} onClick={() => canEdit && stage && setShowAssignDialog({ boatId: boat.id, stage })}>
                                                {worker.name.split(' ').map(n => n[0]).join('')}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>{worker.name}</TooltipContent>
                                          </Tooltip>
                                        ) : null;
                                      })
                                    )}
                                    {assignedWorkers.length > 2 && <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-white text-[10px]">+{assignedWorkers.length - 2}</div>}
                                  </div>
                                ) : <span className="text-slate-300">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary Cards - By Project Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* New Builds */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Ship className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">New Builds</p>
                  <p className="text-2xl font-bold text-blue-700">{categoryStats.new_build.total}</p>
                  <p className="text-xs text-slate-400">{categoryStats.new_build.in_production} in production</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Maintenance */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Maintenance</p>
                  <p className="text-2xl font-bold text-orange-700">{categoryStats.maintenance.total}</p>
                  <p className="text-xs text-slate-400">{categoryStats.maintenance.in_production} in progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Refits */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Ship className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Refits</p>
                  <p className="text-2xl font-bold text-purple-700">{categoryStats.refit.total}</p>
                  <p className="text-xs text-slate-400">{categoryStats.refit.in_production} in progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Available Workers */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-teal-100">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Available Workers</p>
                  <p className="text-2xl font-bold text-slate-900">{workers.filter(w => w.availability === 'available').length}</p>
                  <p className="text-xs text-slate-400">of {workers.length} total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Delayed */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Delayed Stages</p>
                  <p className="text-2xl font-bold text-red-600">{filteredBoats.reduce((acc, b) => acc + (b.production_timeline?.filter(t => t.status === 'delayed').length || 0), 0)}</p>
                  <p className="text-xs text-slate-400">needs attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vessel Detail Dialog */}
        <Dialog open={!!selectedBoat} onOpenChange={() => setSelectedBoat(null)}>
          <DialogContent className="max-w-2xl">
            {selectedBoat && (() => {
              const cat = selectedBoat.project_category || 'new_build';
              const catInfo = PROJECT_CATEGORY_INFO[cat];
              return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Ship className="h-5 w-5 text-teal-600" />
                    {selectedBoat.boat_name || selectedBoat.boat_model}
                    <Badge className={`ml-2 ${catInfo.bgColor} ${catInfo.color} border-0`}>
                      {catInfo.label_en}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>{selectedBoat.hull_identification_number || 'No HIN'}{selectedBoat.client_id && ` • ${getClientName(selectedBoat.client_id)}`}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2"><span className="font-medium">Overall Progress</span><span className="text-lg font-bold text-teal-600">{getProductionProgress(selectedBoat).percent}%</span></div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${getProductionProgress(selectedBoat).percent}%` }} /></div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {PRODUCTION_STAGES.map(stageInfo => {
                        const stage = selectedBoat.production_timeline?.find(t => t.stage === stageInfo.id);
                        const status = stage?.status || 'pending';
                        const assignedWorkers = stage?.assigned_workers || [];
                        return (
                          <div key={stageInfo.id} className={`p-3 rounded-lg border ${status === 'completed' ? 'bg-green-50 border-green-200' : status === 'in_progress' ? 'bg-blue-50 border-blue-200' : status === 'delayed' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'in_progress' ? 'bg-blue-500' : status === 'delayed' ? 'bg-red-500' : 'bg-slate-300'}`} />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{stageInfo.name_en}</p>
                                {stage?.actual_start_date && <p className="text-xs text-slate-500">{formatEuroDate(stage.actual_start_date)}{stage.actual_end_date && ` - ${formatEuroDate(stage.actual_end_date)}`}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {assignedWorkers.length > 0 && <div className="flex -space-x-1">{assignedWorkers.slice(0, 3).map(wId => { const worker = getWorkerById(wId); return worker ? <div key={wId} className={`w-6 h-6 rounded-full ${worker.color} border-2 border-white flex items-center justify-center text-white text-[10px]`} title={worker.name}>{worker.name.split(' ').map(n => n[0]).join('')}</div> : null; })}</div>}
                                <Badge variant={status === 'completed' ? 'default' : status === 'in_progress' ? 'secondary' : status === 'delayed' ? 'destructive' : 'outline'}>{status.replace('_', ' ')}</Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
                <DialogFooter className="flex justify-between">
                  <div>
                    {selectedBoat.project_category !== 'maintenance' && selectedBoat.status === 'in_production' && (
                      <Button variant="outline" onClick={() => { setSelectedBoat(null); setShowCompletionChecklist(selectedBoat); }} className="gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Completion Checklist
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setSelectedBoat(null)}>Close</Button>
                </DialogFooter>
              </>
            );
            })()}
          </DialogContent>
        </Dialog>

        {/* Vessel Completion Checklist */}
        {showCompletionChecklist && (
          <VesselCompletionChecklist
            boat={showCompletionChecklist}
            open={!!showCompletionChecklist}
            onClose={() => setShowCompletionChecklist(null)}
          />
        )}

        {/* Assign Workers Dialog */}
        <Dialog open={!!showAssignDialog} onOpenChange={() => setShowAssignDialog(null)}>
          <DialogContent>
            {showAssignDialog && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-teal-600" />Assign Workers</DialogTitle>
                  <DialogDescription>{getStageInfo(showAssignDialog.stage.stage)?.name_en}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {workers.map(worker => {
                    const isAssigned = showAssignDialog.stage.assigned_workers?.includes(worker.id) || false;
                    const canDoStage = worker.skills.includes(showAssignDialog.stage.stage);
                    return (
                      <label key={worker.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${isAssigned ? 'bg-teal-50 border-teal-200' : 'hover:bg-slate-50'} ${!canDoStage ? 'opacity-50' : ''}`}>
                        <Checkbox checked={isAssigned} onCheckedChange={(checked) => { const currentWorkers = showAssignDialog.stage.assigned_workers || []; const newWorkers = checked ? [...currentWorkers, worker.id] : currentWorkers.filter(id => id !== worker.id); handleAssignWorkers(newWorkers); }} />
                        <div className={`w-8 h-8 rounded-full ${worker.color} flex items-center justify-center text-white font-semibold text-sm`}>{worker.name.split(' ').map(n => n[0]).join('')}</div>
                        <div className="flex-1"><p className="font-medium">{worker.name}</p><p className="text-xs text-slate-500">{worker.role}</p></div>
                        <Badge variant={worker.availability === 'available' ? 'default' : worker.availability === 'busy' ? 'secondary' : 'outline'} className="text-xs">{worker.availability}</Badge>
                        {!canDoStage && <Badge variant="outline" className="text-xs text-orange-600">No skill</Badge>}
                      </label>
                    );
                  })}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setShowAssignDialog(null)}>Done</Button></DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default ProductionCalendar;
