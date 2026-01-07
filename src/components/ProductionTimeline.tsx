'use client';

import { useState, useMemo } from 'react';
import {
  Ship, Calendar, Clock, CheckCircle2, AlertCircle, Circle,
  ChevronRight, Play, Pause, RotateCcw, Edit, Save, X,
  Anchor, Zap, Wrench, Settings, Sofa, Shield, Waves, Flag
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { formatEuroDate, generateId } from '@/lib/formatting';
import { getStageName, getStatusName } from '@/lib/translations';
import type { ClientBoat, ProductionStage, ProductionTimelineEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Production stages in order
const PRODUCTION_STAGES: { id: ProductionStage; icon: typeof Ship; color: string }[] = [
  { id: 'order_confirmed', icon: Flag, color: 'text-blue-500' },
  { id: 'hull_construction', icon: Ship, color: 'text-slate-600' },
  { id: 'structural_work', icon: Wrench, color: 'text-orange-500' },
  { id: 'propulsion_installation', icon: Settings, color: 'text-purple-500' },
  { id: 'electrical_systems', icon: Zap, color: 'text-yellow-500' },
  { id: 'interior_finishing', icon: Sofa, color: 'text-pink-500' },
  { id: 'deck_equipment', icon: Anchor, color: 'text-teal-500' },
  { id: 'quality_inspection', icon: Shield, color: 'text-green-500' },
  { id: 'sea_trial', icon: Waves, color: 'text-cyan-500' },
  { id: 'final_delivery', icon: CheckCircle2, color: 'text-emerald-500' },
];

// Default timeline template
function createDefaultTimeline(): ProductionTimelineEntry[] {
  return PRODUCTION_STAGES.map(stage => ({
    id: generateId(),
    stage: stage.id,
    status: 'pending',
  }));
}

interface ProductionTimelineProps {
  boat: ClientBoat;
  onUpdate: (boatId: string, updates: Partial<ClientBoat>) => void;
}

export function ProductionTimeline({ boat, onUpdate }: ProductionTimelineProps) {
  const [editingStage, setEditingStage] = useState<ProductionTimelineEntry | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Get or create timeline - memoize to prevent unnecessary recalculations
  const timeline = useMemo(() => boat.production_timeline || [], [boat.production_timeline]);
  const hasTimeline = timeline.length > 0;

  // Calculate progress
  const progress = useMemo(() => {
    if (timeline.length === 0) return 0;
    const completed = timeline.filter(t => t.status === 'completed').length;
    return Math.round((completed / PRODUCTION_STAGES.length) * 100);
  }, [timeline]);

  // Get current stage
  const currentStage = useMemo(() => {
    if (timeline.length === 0) return null;
    const inProgress = timeline.find(t => t.status === 'in_progress');
    if (inProgress) return inProgress;
    const pending = timeline.find(t => t.status === 'pending');
    return pending || timeline[timeline.length - 1];
  }, [timeline]);

  // Initialize timeline for the boat
  const handleInitialize = () => {
    const newTimeline = createDefaultTimeline();
    // Set first stage to in_progress
    newTimeline[0].status = 'in_progress';
    newTimeline[0].actual_start_date = new Date().toISOString();

    onUpdate(boat.id, {
      production_timeline: newTimeline,
      production_start_date: new Date().toISOString(),
      status: 'in_production',
    });
  };

  // Update a stage
  const handleUpdateStage = (stageId: string, updates: Partial<ProductionTimelineEntry>) => {
    const newTimeline = timeline.map(t =>
      t.id === stageId ? { ...t, ...updates } : t
    );

    // If completing a stage, start the next one
    if (updates.status === 'completed') {
      const currentIndex = newTimeline.findIndex(t => t.id === stageId);
      if (currentIndex >= 0 && currentIndex < newTimeline.length - 1) {
        newTimeline[currentIndex + 1].status = 'in_progress';
        newTimeline[currentIndex + 1].actual_start_date = new Date().toISOString();
      }

      // If all completed, update boat status
      const allCompleted = newTimeline.every(t => t.status === 'completed');
      if (allCompleted) {
        onUpdate(boat.id, {
          production_timeline: newTimeline,
          status: 'delivered',
        });
        return;
      }
    }

    onUpdate(boat.id, { production_timeline: newTimeline });
  };

  // Complete current stage and move to next
  const handleCompleteStage = (stageId: string) => {
    handleUpdateStage(stageId, {
      status: 'completed',
      actual_end_date: new Date().toISOString(),
    });
  };

  // Save stage edit
  const handleSaveStageEdit = () => {
    if (!editingStage) return;
    handleUpdateStage(editingStage.id, editingStage);
    setEditingStage(null);
  };

  // Get stage icon
  const getStageIcon = (stageId: ProductionStage) => {
    const stage = PRODUCTION_STAGES.find(s => s.id === stageId);
    return stage?.icon || Circle;
  };

  // Get stage color
  const getStageColor = (stageId: ProductionStage) => {
    const stage = PRODUCTION_STAGES.find(s => s.id === stageId);
    return stage?.color || 'text-slate-400';
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-600">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case 'delayed':
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (!hasTimeline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Production Timeline
          </CardTitle>
          <CardDescription>
            Track the production progress for this boat
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Ship className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="font-semibold text-lg mb-2">No Production Timeline</h3>
          <p className="text-slate-500 mb-6">
            Start tracking production by initializing the timeline.
          </p>
          <Button onClick={handleInitialize} className="bg-emerald-600 hover:bg-emerald-700">
            <Play className="h-4 w-4 mr-2" />
            Start Production Tracking
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Production Progress
              </CardTitle>
              <CardDescription>
                {boat.boat_name || boat.boat_model} - {boat.propulsion_type}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-600">{progress}%</div>
              <div className="text-sm text-slate-500">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3 mb-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-slate-500">Started</p>
              <p className="font-medium">
                {boat.production_start_date ? formatEuroDate(boat.production_start_date) : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-slate-500">Est. Delivery</p>
              <p className="font-medium">
                {boat.estimated_delivery_date ? formatEuroDate(boat.estimated_delivery_date) : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-slate-500">Current Stage</p>
              <p className="font-medium">
                {currentStage ? getStageName(currentStage.stage) : '-'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-slate-500">Status</p>
              <p className="font-medium capitalize">{boat.status.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Production Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {timeline.map((entry, idx) => {
              const Icon = getStageIcon(entry.stage);
              const isLast = idx === timeline.length - 1;
              const isActive = entry.status === 'in_progress';
              const isCompleted = entry.status === 'completed';

              return (
                <div key={entry.id} className="relative">
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "absolute left-5 top-10 w-0.5 h-full -ml-px",
                        isCompleted ? "bg-emerald-300" : "bg-slate-200"
                      )}
                    />
                  )}

                  {/* Stage row */}
                  <div
                    className={cn(
                      "relative flex items-start gap-4 p-3 rounded-lg transition-colors",
                      isActive && "bg-blue-50 border border-blue-200",
                      isCompleted && "opacity-80"
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                        isCompleted && "bg-emerald-100",
                        isActive && "bg-blue-100",
                        !isCompleted && !isActive && "bg-slate-100"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Icon className={cn("h-5 w-5", getStageColor(entry.stage))} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium">{getStageName(entry.stage)}</h4>
                        {getStatusBadge(entry.status)}
                      </div>

                      {/* Dates */}
                      {(entry.actual_start_date || entry.planned_start_date) && (
                        <div className="flex gap-4 mt-1 text-xs text-slate-500">
                          {entry.actual_start_date && (
                            <span>Started: {formatEuroDate(entry.actual_start_date)}</span>
                          )}
                          {entry.actual_end_date && (
                            <span>Completed: {formatEuroDate(entry.actual_end_date)}</span>
                          )}
                        </div>
                      )}

                      {entry.notes && (
                        <p className="text-sm text-slate-600 mt-1">{entry.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-1">
                      {isActive && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteStage(entry.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingStage(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Stage Dialog */}
      {editingStage && (
        <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stage: {getStageName(editingStage.stage)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={editingStage.status}
                  onValueChange={(v) => setEditingStage({ ...editingStage, status: v as ProductionTimelineEntry['status'] })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Planned Start</Label>
                  <Input
                    type="date"
                    value={editingStage.planned_start_date?.split('T')[0] || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, planned_start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Planned End</Label>
                  <Input
                    type="date"
                    value={editingStage.planned_end_date?.split('T')[0] || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, planned_end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Actual Start</Label>
                  <Input
                    type="date"
                    value={editingStage.actual_start_date?.split('T')[0] || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, actual_start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Actual End</Label>
                  <Input
                    type="date"
                    value={editingStage.actual_end_date?.split('T')[0] || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, actual_end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Completed By</Label>
                <Input
                  value={editingStage.completed_by || ''}
                  onChange={(e) => setEditingStage({ ...editingStage, completed_by: e.target.value })}
                  placeholder="Name of person who completed this stage"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingStage.notes || ''}
                  onChange={(e) => setEditingStage({ ...editingStage, notes: e.target.value })}
                  placeholder="Additional notes about this stage"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStage(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStageEdit} className="bg-emerald-600 hover:bg-emerald-700">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
