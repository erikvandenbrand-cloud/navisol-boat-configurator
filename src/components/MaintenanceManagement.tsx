'use client';

import { useState, useMemo } from 'react';
import {
  Wrench, Plus, Calendar, AlertTriangle, History,
  Edit, Trash2, CheckCircle2, Bell, Ship, ClipboardCheck,
  FileText, ChevronDown, Search, Filter, RotateCcw, Settings,
  ListChecks, Check, X, UserCheck, PenLine
} from 'lucide-react';
import { useNavisol } from '@/lib/store';
import { useAuth } from '@/lib/auth-store';
import { useMaintenance } from '@/lib/maintenance-store';
import { formatEuroCurrency, formatEuroDate, generateId } from '@/lib/formatting';
import {
  type MaintenanceRecord,
  type MaintenanceSchedule,
  type MaintenanceType,
  type RecurrenceType,
  type RecurrenceRule,
  type ProjectCategory,
  type ChecklistItem,
  type CompletedChecklistItem,
  MAINTENANCE_TYPE_INFO,
  RECURRENCE_INFO,
  PROJECT_CATEGORY_INFO,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function MaintenanceManagement() {
  const { currentUser, hasPermission } = useAuth();
  const { clientBoats } = useNavisol();
  const {
    records, schedules, isLoading,
    addRecord, updateRecord, deleteRecord,
    addSchedule, updateSchedule, deleteSchedule,
    markScheduleCompleted, toggleScheduleActive,
    getUpcomingAlerts, getMaintenanceCostsByCategory,
  } = useMaintenance();

  const [activeTab, setActiveTab] = useState<'alerts' | 'history' | 'schedules' | 'reports'>('alerts');
  const [filterVessel, setFilterVessel] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState<MaintenanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'record' | 'schedule'; id: string; name: string } | null>(null);

  // Record form with checklist support
  const [recordForm, setRecordForm] = useState<Partial<MaintenanceRecord>>({
    vessel_id: '', maintenance_type: 'routine', title: '', work_performed: '',
    labor_hours: 0, labor_cost: 0, parts_cost: 0, total_cost: 0, status: 'completed',
    checklist_items: [], signoff_required: false,
  });

  // Schedule form with checklist template
  const [scheduleForm, setScheduleForm] = useState<Partial<MaintenanceSchedule>>({
    vessel_id: '', title: '', maintenance_type: 'routine',
    recurrence: { type: 'monthly', interval: 1 },
    first_due_date: new Date().toISOString().split('T')[0],
    next_due_date: new Date().toISOString().split('T')[0],
    reminder_days_before: 7, overdue_alert: true, estimated_hours: 1, estimated_cost: 0,
    is_active: true, checklist: [], requires_signoff: false,
  });

  // Checklist item input
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Checklist completion state for dialog
  const [checklistState, setChecklistState] = useState<CompletedChecklistItem[]>([]);
  const [signoffNotes, setSignoffNotes] = useState('');

  const vesselsByCategory = useMemo(() => {
    const grouped: Record<ProjectCategory, string[]> = { new_build: [], maintenance: [], refit: [] };
    clientBoats.forEach(boat => grouped[boat.project_category || 'new_build'].push(boat.id));
    return grouped;
  }, [clientBoats]);

  const alerts = useMemo(() => {
    return getUpcomingAlerts(30).map(alert => ({
      ...alert,
      vessel_name: clientBoats.find(b => b.id === alert.vessel_id)?.boat_name ||
                   clientBoats.find(b => b.id === alert.vessel_id)?.boat_model || 'Unknown',
    }));
  }, [getUpcomingAlerts, clientBoats]);

  const overdueCount = alerts.filter(a => a.is_overdue).length;
  const upcomingCount = alerts.filter(a => !a.is_overdue && a.days_until_due <= 7).length;

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (filterVessel) result = result.filter(r => r.vessel_id === filterVessel);
    if (filterCategory) result = result.filter(r => vesselsByCategory[filterCategory as ProjectCategory]?.includes(r.vessel_id));
    if (filterType) result = result.filter(r => r.maintenance_type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.title.toLowerCase().includes(q) || r.work_performed.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
  }, [records, filterVessel, filterCategory, filterType, searchQuery, vesselsByCategory]);

  const filteredSchedules = useMemo(() => {
    let result = [...schedules];
    if (filterVessel) result = result.filter(s => s.vessel_id === filterVessel);
    if (filterCategory) result = result.filter(s => vesselsByCategory[filterCategory as ProjectCategory]?.includes(s.vessel_id));
    return result.sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
  }, [schedules, filterVessel, filterCategory, vesselsByCategory]);

  const costsByCategory = useMemo(() => getMaintenanceCostsByCategory(vesselsByCategory), [getMaintenanceCostsByCategory, vesselsByCategory]);

  const getVesselName = (vesselId: string): string => {
    const boat = clientBoats.find(b => b.id === vesselId);
    return boat?.boat_name || boat?.boat_model || 'Unknown';
  };

  const getVesselCategory = (vesselId: string): ProjectCategory => clientBoats.find(b => b.id === vesselId)?.project_category || 'new_build';

  // Add checklist item to schedule template
  const addChecklistItemToSchedule = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: generateId(),
      description: newChecklistItem.trim(),
      required: true,
      order: (scheduleForm.checklist?.length || 0) + 1,
    };
    setScheduleForm(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), newItem],
    }));
    setNewChecklistItem('');
  };

  // Remove checklist item from schedule template
  const removeChecklistItemFromSchedule = (itemId: string) => {
    setScheduleForm(prev => ({
      ...prev,
      checklist: (prev.checklist || []).filter(item => item.id !== itemId),
    }));
  };

  // Toggle required status of checklist item
  const toggleChecklistItemRequired = (itemId: string) => {
    setScheduleForm(prev => ({
      ...prev,
      checklist: (prev.checklist || []).map(item =>
        item.id === itemId ? { ...item, required: !item.required } : item
      ),
    }));
  };

  // Open checklist completion dialog
  const openChecklistDialog = (record: MaintenanceRecord) => {
    const items: CompletedChecklistItem[] = record.checklist_items || [];
    setChecklistState(items);
    setSignoffNotes('');
    setShowChecklistDialog(record);
  };

  // Toggle checklist item completion
  const toggleChecklistCompletion = (itemId: string) => {
    if (!currentUser) return;
    setChecklistState(prev => prev.map(item => {
      if (item.item_id !== itemId) return item;
      const nowCompleted = !item.completed;
      return {
        ...item,
        completed: nowCompleted,
        completed_by_id: nowCompleted ? currentUser.id : undefined,
        completed_by_name: nowCompleted ? `${currentUser.firstName} ${currentUser.lastName}` : undefined,
        completed_at: nowCompleted ? new Date().toISOString() : undefined,
      };
    }));
  };

  // Save checklist completion and sign-off
  const saveChecklistCompletion = () => {
    if (!showChecklistDialog || !currentUser) return;
    const allRequiredComplete = checklistState.filter(i => i.required).every(i => i.completed);

    updateRecord(showChecklistDialog.id, {
      checklist_items: checklistState,
      checklist_complete: allRequiredComplete,
      signoff_completed: allRequiredComplete && showChecklistDialog.signoff_required,
      signoff_by_id: allRequiredComplete ? currentUser.id : undefined,
      signoff_by_name: allRequiredComplete ? `${currentUser.firstName} ${currentUser.lastName}` : undefined,
      signoff_at: allRequiredComplete ? new Date().toISOString() : undefined,
      signoff_notes: signoffNotes || undefined,
    });
    setShowChecklistDialog(null);
  };

  const handleSaveRecord = () => {
    if (!currentUser || !recordForm.vessel_id || !recordForm.title || !recordForm.work_performed) return;
    const totalCost = (recordForm.labor_cost || 0) + (recordForm.parts_cost || 0);

    if (editingRecord) {
      updateRecord(editingRecord.id, { ...recordForm, total_cost: totalCost } as Partial<MaintenanceRecord>);
    } else {
      addRecord({
        vessel_id: recordForm.vessel_id!,
        maintenance_type: recordForm.maintenance_type as MaintenanceType || 'routine',
        title: recordForm.title!,
        work_performed: recordForm.work_performed!,
        parts_used: [],
        labor_hours: recordForm.labor_hours || 0,
        labor_cost: recordForm.labor_cost || 0,
        parts_cost: recordForm.parts_cost || 0,
        total_cost: totalCost,
        status: recordForm.status as MaintenanceRecord['status'] || 'completed',
        completed_at: recordForm.status === 'completed' ? new Date().toISOString() : undefined,
        technician_name: `${currentUser.firstName} ${currentUser.lastName}`,
        technician_id: currentUser.id,
        created_by_id: currentUser.id,
        checklist_items: recordForm.checklist_items || [],
        signoff_required: recordForm.signoff_required || false,
      });
    }
    setShowRecordDialog(false);
    setEditingRecord(null);
    resetRecordForm();
  };

  const handleSaveSchedule = () => {
    if (!currentUser || !scheduleForm.vessel_id || !scheduleForm.title) return;

    if (editingSchedule) {
      updateSchedule(editingSchedule.id, scheduleForm as Partial<MaintenanceSchedule>);
    } else {
      addSchedule({
        vessel_id: scheduleForm.vessel_id!,
        title: scheduleForm.title!,
        description: scheduleForm.description,
        maintenance_type: scheduleForm.maintenance_type as MaintenanceType || 'routine',
        recurrence: scheduleForm.recurrence as RecurrenceRule || { type: 'monthly', interval: 1 },
        first_due_date: scheduleForm.first_due_date!,
        next_due_date: scheduleForm.next_due_date || scheduleForm.first_due_date!,
        reminder_days_before: scheduleForm.reminder_days_before || 7,
        overdue_alert: scheduleForm.overdue_alert ?? true,
        estimated_hours: scheduleForm.estimated_hours || 1,
        estimated_cost: scheduleForm.estimated_cost || 0,
        checklist: scheduleForm.checklist || [],
        requires_signoff: scheduleForm.requires_signoff ?? false,
        is_active: scheduleForm.is_active ?? true,
        created_by_id: currentUser.id,
      });
    }
    setShowScheduleDialog(false);
    setEditingSchedule(null);
    resetScheduleForm();
  };

  const resetRecordForm = () => {
    setRecordForm({
      vessel_id: '', maintenance_type: 'routine', title: '', work_performed: '',
      labor_hours: 0, labor_cost: 0, parts_cost: 0, total_cost: 0, status: 'completed',
      checklist_items: [], signoff_required: false,
    });
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      vessel_id: '', title: '', maintenance_type: 'routine',
      recurrence: { type: 'monthly', interval: 1 },
      first_due_date: new Date().toISOString().split('T')[0],
      next_due_date: new Date().toISOString().split('T')[0],
      reminder_days_before: 7, overdue_alert: true, estimated_hours: 1, estimated_cost: 0,
      is_active: true, checklist: [], requires_signoff: false,
    });
    setNewChecklistItem('');
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'record') deleteRecord(deleteConfirm.id);
    else deleteSchedule(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // Start service from schedule (creates record with checklist)
  const startServiceFromSchedule = (schedule: MaintenanceSchedule) => {
    if (!currentUser) return;
    const checklistItems: CompletedChecklistItem[] = (schedule.checklist || []).map(item => ({
      item_id: item.id,
      description: item.description,
      required: item.required,
      completed: false,
    }));

    const newRecord = addRecord({
      vessel_id: schedule.vessel_id,
      maintenance_type: schedule.maintenance_type,
      title: schedule.title,
      description: schedule.description,
      work_performed: '',
      parts_used: [],
      labor_hours: schedule.estimated_hours,
      labor_cost: 0,
      parts_cost: 0,
      total_cost: 0,
      status: 'in_progress',
      related_schedule_id: schedule.id,
      technician_name: `${currentUser.firstName} ${currentUser.lastName}`,
      technician_id: currentUser.id,
      created_by_id: currentUser.id,
      checklist_items: checklistItems,
      signoff_required: schedule.requires_signoff,
    });

    // Open checklist dialog for the new record
    if (checklistItems.length > 0) {
      openChecklistDialog(newRecord);
    }
  };

  const canManage = hasPermission('manageTasks');

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Wrench className="h-7 w-7 text-orange-600" />
            Maintenance Management
          </h1>
          <p className="text-slate-600">Track maintenance with checklists and sign-off requirements</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button variant="outline" onClick={() => { resetScheduleForm(); setShowScheduleDialog(true); }}><Calendar className="h-4 w-4 mr-2" />New Schedule</Button>
              <Button onClick={() => { resetRecordForm(); setShowRecordDialog(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="h-4 w-4 mr-2" />Log Service</Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className={overdueCount > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${overdueCount > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                <AlertTriangle className={`h-6 w-6 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              </div>
              <div><p className="text-sm text-slate-500">Overdue</p><p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{overdueCount}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className={upcomingCount > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${upcomingCount > 0 ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                <Bell className={`h-6 w-6 ${upcomingCount > 0 ? 'text-yellow-600' : 'text-slate-400'}`} />
              </div>
              <div><p className="text-sm text-slate-500">Due This Week</p><p className={`text-2xl font-bold ${upcomingCount > 0 ? 'text-yellow-600' : 'text-slate-900'}`}>{upcomingCount}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-teal-100"><History className="h-6 w-6 text-teal-600" /></div>
              <div><p className="text-sm text-slate-500">Total Records</p><p className="text-2xl font-bold text-slate-900">{records.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100"><RotateCcw className="h-6 w-6 text-purple-600" /></div>
              <div><p className="text-sm text-slate-500">Active Schedules</p><p className="text-2xl font-bold text-slate-900">{schedules.filter(s => s.is_active).length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100"><ClipboardCheck className="h-6 w-6 text-green-600" /></div>
              <div><p className="text-sm text-slate-500">Pending Sign-off</p><p className="text-2xl font-bold text-slate-900">{records.filter(r => r.signoff_required && !r.signoff_completed).length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="alerts" className="gap-2"><Bell className="h-4 w-4" />Alerts{(overdueCount + upcomingCount) > 0 && <Badge variant="destructive" className="ml-1 text-xs py-0">{overdueCount + upcomingCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />History</TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2"><Calendar className="h-4 w-4" />Schedules</TabsTrigger>
          <TabsTrigger value="reports" className="gap-2"><FileText className="h-4 w-4" />Reports</TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" /><p className="text-lg font-medium text-slate-700">All caught up!</p><p className="text-slate-500">No maintenance due in the next 30 days</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => {
                const catInfo = PROJECT_CATEGORY_INFO[getVesselCategory(alert.vessel_id)];
                const typeInfo = MAINTENANCE_TYPE_INFO[alert.maintenance_type];
                const schedule = schedules.find(s => s.id === alert.schedule_id);
                const hasChecklist = schedule && schedule.checklist && schedule.checklist.length > 0;
                return (
                  <Card key={alert.id} className={alert.is_overdue ? 'border-red-300 bg-red-50' : alert.days_until_due <= 7 ? 'border-yellow-300 bg-yellow-50' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${alert.is_overdue ? 'bg-red-100' : 'bg-orange-100'}`}><Wrench className={`h-5 w-5 ${alert.is_overdue ? 'text-red-600' : 'text-orange-600'}`} /></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{alert.title}</p>
                              <Badge className={`${typeInfo.color} text-white text-xs`}>{typeInfo.label_en}</Badge>
                              {hasChecklist && <Badge variant="outline" className="text-xs gap-1"><ListChecks className="h-3 w-3" />{schedule.checklist.length} items</Badge>}
                              {schedule?.requires_signoff && <Badge variant="outline" className="text-xs gap-1 text-purple-600"><UserCheck className="h-3 w-3" />Sign-off</Badge>}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500"><Ship className="h-3 w-3" /><span>{alert.vessel_name}</span><Badge variant="outline" className={`text-xs ${catInfo.bgColor} ${catInfo.color} border-0`}>{catInfo.label_en}</Badge></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-medium ${alert.is_overdue ? 'text-red-600' : alert.days_until_due <= 7 ? 'text-yellow-600' : 'text-slate-700'}`}>
                              {alert.is_overdue ? `${Math.abs(alert.days_until_due)} days overdue` : alert.days_until_due === 0 ? 'Due today' : `Due in ${alert.days_until_due} days`}
                            </p>
                            <p className="text-sm text-slate-500">{formatEuroDate(alert.due_date)}</p>
                          </div>
                          {canManage && schedule && (
                            <Button variant="outline" size="sm" onClick={() => startServiceFromSchedule(schedule)}>
                              <PenLine className="h-4 w-4 mr-1" />Start Service
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card><CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
              <Select value={filterVessel || 'all'} onValueChange={(v) => setFilterVessel(v === 'all' ? '' : v)}><SelectTrigger className="w-48"><Ship className="h-4 w-4 mr-2" /><SelectValue placeholder="All vessels" /></SelectTrigger><SelectContent><SelectItem value="all">All vessels</SelectItem>{clientBoats.map(b => <SelectItem key={b.id} value={b.id}>{b.boat_name || b.boat_model}</SelectItem>)}</SelectContent></Select>
              <Select value={filterCategory || 'all'} onValueChange={(v) => setFilterCategory(v === 'all' ? '' : v)}><SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem><SelectItem value="new_build">New Build</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="refit">Refit</SelectItem></SelectContent></Select>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500"><History className="h-16 w-16 mx-auto mb-4 opacity-20" /><p className="text-lg font-medium">No maintenance records</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Vessel</TableHead><TableHead>Type</TableHead><TableHead>Service</TableHead><TableHead>Checklist</TableHead><TableHead className="text-right">Cost</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredRecords.slice(0, 20).map(record => {
                    const typeInfo = MAINTENANCE_TYPE_INFO[record.maintenance_type];
                    const catInfo = PROJECT_CATEGORY_INFO[getVesselCategory(record.vessel_id)];
                    const hasChecklist = record.checklist_items && record.checklist_items.length > 0;
                    const completedItems = record.checklist_items?.filter(i => i.completed).length || 0;
                    const totalItems = record.checklist_items?.length || 0;
                    const allComplete = completedItems === totalItems && totalItems > 0;
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{formatEuroDate(record.completed_at || record.created_at)}</TableCell>
                        <TableCell><div className="flex items-center gap-2"><Badge variant="outline" className={`text-xs ${catInfo.bgColor} ${catInfo.color} border-0 py-0`}>{catInfo.label_en.charAt(0)}</Badge>{getVesselName(record.vessel_id)}</div></TableCell>
                        <TableCell><Badge className={`${typeInfo.color} text-white text-xs`}>{typeInfo.label_en}</Badge></TableCell>
                        <TableCell><p className="font-medium">{record.title}</p></TableCell>
                        <TableCell>
                          {hasChecklist ? (
                            <div className="flex items-center gap-2">
                              <Badge variant={allComplete ? 'default' : 'secondary'} className={`text-xs gap-1 ${allComplete ? 'bg-green-500' : ''}`}>
                                <ListChecks className="h-3 w-3" />{completedItems}/{totalItems}
                              </Badge>
                              {record.signoff_required && (
                                record.signoff_completed ? (
                                  <Badge variant="outline" className="text-xs gap-1 text-green-600"><UserCheck className="h-3 w-3" />Signed</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs gap-1 text-orange-600"><UserCheck className="h-3 w-3" />Pending</Badge>
                                )
                              )}
                              {canManage && !allComplete && (
                                <Button variant="ghost" size="sm" onClick={() => openChecklistDialog(record)}><PenLine className="h-3 w-3" /></Button>
                              )}
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatEuroCurrency(record.total_cost)}</TableCell>
                        <TableCell>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {hasChecklist && <DropdownMenuItem onClick={() => openChecklistDialog(record)}><ListChecks className="h-4 w-4 mr-2" />Checklist</DropdownMenuItem>}
                                <DropdownMenuItem onClick={() => { setRecordForm(record); setEditingRecord(record); setShowRecordDialog(true); }}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteConfirm({ type: 'record', id: record.id, name: record.title })} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card><CardContent className="pt-6">
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-12 text-slate-500"><Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" /><p className="text-lg font-medium">No maintenance schedules</p></div>
            ) : (
              <div className="space-y-3">
                {filteredSchedules.map(schedule => {
                  const typeInfo = MAINTENANCE_TYPE_INFO[schedule.maintenance_type];
                  const recInfo = RECURRENCE_INFO[schedule.recurrence.type];
                  const catInfo = PROJECT_CATEGORY_INFO[getVesselCategory(schedule.vessel_id)];
                  const isOverdue = new Date(schedule.next_due_date) < new Date();
                  const hasChecklist = schedule.checklist && schedule.checklist.length > 0;
                  return (
                    <div key={schedule.id} className={`p-4 rounded-lg border ${!schedule.is_active ? 'opacity-50 bg-slate-50' : isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${schedule.is_active ? 'bg-orange-100' : 'bg-slate-100'}`}><RotateCcw className={`h-5 w-5 ${schedule.is_active ? 'text-orange-600' : 'text-slate-400'}`} /></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{schedule.title}</p>
                              <Badge className={`${typeInfo.color} text-white text-xs`}>{typeInfo.label_en}</Badge>
                              <Badge variant="outline" className="text-xs">{recInfo.label_en}</Badge>
                              {hasChecklist && <Badge variant="outline" className="text-xs gap-1"><ListChecks className="h-3 w-3" />{schedule.checklist.length} items</Badge>}
                              {schedule.requires_signoff && <Badge variant="outline" className="text-xs gap-1 text-purple-600"><UserCheck className="h-3 w-3" />Sign-off required</Badge>}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500"><Ship className="h-3 w-3" /><span>{getVesselName(schedule.vessel_id)}</span><Badge variant="outline" className={`text-xs ${catInfo.bgColor} ${catInfo.color} border-0`}>{catInfo.label_en}</Badge></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right"><p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>Next: {formatEuroDate(schedule.next_due_date)}</p><p className="text-xs text-slate-500">Est. {schedule.estimated_hours}h • {formatEuroCurrency(schedule.estimated_cost)}</p></div>
                          {canManage && <div className="flex items-center gap-2">
                            <Switch checked={schedule.is_active} onCheckedChange={() => toggleScheduleActive(schedule.id)} />
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><Settings className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startServiceFromSchedule(schedule)}><PenLine className="h-4 w-4 mr-2" />Start Service</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => markScheduleCompleted(schedule.id, new Date().toISOString().split('T')[0])}><CheckCircle2 className="h-4 w-4 mr-2" />Mark Complete</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setScheduleForm(schedule); setEditingSchedule(schedule); setShowScheduleDialog(true); }}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteConfirm({ type: 'schedule', id: schedule.id, name: schedule.title })} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu>
                          </div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['new_build', 'maintenance', 'refit'] as ProjectCategory[]).map(cat => {
              const catInfo = PROJECT_CATEGORY_INFO[cat];
              const costs = costsByCategory[cat];
              const borderColor = cat === 'new_build' ? 'border-l-blue-500' : cat === 'maintenance' ? 'border-l-orange-500' : 'border-l-purple-500';
              return (
                <Card key={cat} className={`border-l-4 ${borderColor}`}>
                  <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Badge className={`${catInfo.bgColor} ${catInfo.color} border-0`}>{catInfo.label_en}</Badge></CardTitle><CardDescription>{costs.count} records</CardDescription></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Labor</span><span className="font-medium">{formatEuroCurrency(costs.labor)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Parts</span><span className="font-medium">{formatEuroCurrency(costs.parts)}</span></div>
                      <Separator />
                      <div className="flex justify-between"><span className="font-medium">Total</span><span className="font-bold text-lg">{formatEuroCurrency(costs.total)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editingRecord ? 'Edit Service Record' : 'Log Maintenance Service'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Vessel *</Label><Select value={recordForm.vessel_id || ''} onValueChange={(v) => setRecordForm(p => ({ ...p, vessel_id: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select vessel..." /></SelectTrigger><SelectContent>{clientBoats.map(b => <SelectItem key={b.id} value={b.id}>{b.boat_name || b.boat_model}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type *</Label><Select value={recordForm.maintenance_type || 'routine'} onValueChange={(v) => setRecordForm(p => ({ ...p, maintenance_type: v as MaintenanceType }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(MAINTENANCE_TYPE_INFO) as MaintenanceType[]).map(t => <SelectItem key={t} value={t}>{MAINTENANCE_TYPE_INFO[t].label_en}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={recordForm.status || 'completed'} onValueChange={(v) => setRecordForm(p => ({ ...p, status: v as MaintenanceRecord['status'] }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Title *</Label><Input value={recordForm.title || ''} onChange={(e) => setRecordForm(p => ({ ...p, title: e.target.value }))} className="mt-1" /></div>
            <div><Label>Work Performed *</Label><Textarea value={recordForm.work_performed || ''} onChange={(e) => setRecordForm(p => ({ ...p, work_performed: e.target.value }))} className="mt-1" rows={3} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Hours</Label><Input type="number" min="0" step="0.5" value={recordForm.labor_hours || 0} onChange={(e) => setRecordForm(p => ({ ...p, labor_hours: parseFloat(e.target.value) || 0 }))} className="mt-1" /></div>
              <div><Label>Labor Cost</Label><Input type="number" min="0" value={recordForm.labor_cost || 0} onChange={(e) => setRecordForm(p => ({ ...p, labor_cost: parseFloat(e.target.value) || 0 }))} className="mt-1" /></div>
              <div><Label>Parts Cost</Label><Input type="number" min="0" value={recordForm.parts_cost || 0} onChange={(e) => setRecordForm(p => ({ ...p, parts_cost: parseFloat(e.target.value) || 0 }))} className="mt-1" /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={recordForm.signoff_required || false} onCheckedChange={(v) => setRecordForm(p => ({ ...p, signoff_required: v }))} /><Label className="flex items-center gap-1"><UserCheck className="h-4 w-4" />Requires Sign-off</Label></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowRecordDialog(false); setEditingRecord(null); }}>Cancel</Button><Button onClick={handleSaveRecord} className="bg-orange-600 hover:bg-orange-700" disabled={!recordForm.vessel_id || !recordForm.title || !recordForm.work_performed}>{editingRecord ? 'Save' : 'Log Service'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog with Checklist Builder */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create Maintenance Schedule'}</DialogTitle><DialogDescription>Define recurring maintenance with checklist requirements</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Vessel *</Label><Select value={scheduleForm.vessel_id || ''} onValueChange={(v) => setScheduleForm(p => ({ ...p, vessel_id: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select vessel..." /></SelectTrigger><SelectContent>{clientBoats.map(b => <SelectItem key={b.id} value={b.id}>{b.boat_name || b.boat_model}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type</Label><Select value={scheduleForm.maintenance_type || 'routine'} onValueChange={(v) => setScheduleForm(p => ({ ...p, maintenance_type: v as MaintenanceType }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(MAINTENANCE_TYPE_INFO) as MaintenanceType[]).map(t => <SelectItem key={t} value={t}>{MAINTENANCE_TYPE_INFO[t].label_en}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Title *</Label><Input value={scheduleForm.title || ''} onChange={(e) => setScheduleForm(p => ({ ...p, title: e.target.value }))} className="mt-1" placeholder="e.g., Annual Engine Service" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Recurrence</Label><Select value={scheduleForm.recurrence?.type || 'monthly'} onValueChange={(v) => setScheduleForm(p => ({ ...p, recurrence: { ...p.recurrence!, type: v as RecurrenceType } }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(RECURRENCE_INFO) as RecurrenceType[]).map(t => <SelectItem key={t} value={t}>{RECURRENCE_INFO[t].label_en}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>First Due Date</Label><Input type="date" value={scheduleForm.first_due_date || ''} onChange={(e) => setScheduleForm(p => ({ ...p, first_due_date: e.target.value, next_due_date: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Est. Hours</Label><Input type="number" min="0" step="0.5" value={scheduleForm.estimated_hours || 1} onChange={(e) => setScheduleForm(p => ({ ...p, estimated_hours: parseFloat(e.target.value) || 1 }))} className="mt-1" /></div>
              <div><Label>Est. Cost</Label><Input type="number" min="0" value={scheduleForm.estimated_cost || 0} onChange={(e) => setScheduleForm(p => ({ ...p, estimated_cost: parseFloat(e.target.value) || 0 }))} className="mt-1" /></div>
            </div>

            {/* Checklist Builder */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base"><ListChecks className="h-5 w-5 text-teal-600" />Checklist Items</Label>
                <div className="flex items-center gap-2"><Switch checked={scheduleForm.requires_signoff || false} onCheckedChange={(v) => setScheduleForm(p => ({ ...p, requires_signoff: v }))} /><Label className="text-sm flex items-center gap-1"><UserCheck className="h-4 w-4" />Require Sign-off</Label></div>
              </div>
              <div className="flex gap-2">
                <Input value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} placeholder="Add checklist item..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItemToSchedule())} />
                <Button type="button" variant="outline" onClick={addChecklistItemToSchedule}><Plus className="h-4 w-4" /></Button>
              </div>
              {scheduleForm.checklist && scheduleForm.checklist.length > 0 && (
                <ScrollArea className="h-[150px] border rounded p-2">
                  <div className="space-y-2">
                    {scheduleForm.checklist.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                        <span className="flex-1 text-sm">{item.description}</span>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleChecklistItemRequired(item.id)} className={item.required ? 'text-red-600' : 'text-slate-400'} title={item.required ? 'Required' : 'Optional'}>
                            {item.required ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeChecklistItemFromSchedule(item.id)} className="text-red-500"><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <p className="text-xs text-slate-500">Items marked with <Check className="h-3 w-3 inline text-red-600" /> are required for completion</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={scheduleForm.is_active ?? true} onCheckedChange={(v) => setScheduleForm(p => ({ ...p, is_active: v }))} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={scheduleForm.overdue_alert ?? true} onCheckedChange={(v) => setScheduleForm(p => ({ ...p, overdue_alert: v }))} /><Label>Overdue Alert</Label></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowScheduleDialog(false); setEditingSchedule(null); }}>Cancel</Button><Button onClick={handleSaveSchedule} className="bg-orange-600 hover:bg-orange-700" disabled={!scheduleForm.vessel_id || !scheduleForm.title}>{editingSchedule ? 'Save' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checklist Completion Dialog */}
      <Dialog open={!!showChecklistDialog} onOpenChange={() => setShowChecklistDialog(null)}>
        <DialogContent className="max-w-lg">
          {showChecklistDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-600" />Complete Checklist</DialogTitle>
                <DialogDescription>{showChecklistDialog.title} - {getVesselName(showChecklistDialog.vessel_id)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <ScrollArea className="h-[300px] border rounded-lg p-4">
                  <div className="space-y-3">
                    {checklistState.map((item, idx) => (
                      <div key={item.item_id} className={`flex items-start gap-3 p-3 rounded-lg border ${item.completed ? 'bg-green-50 border-green-200' : item.required ? 'bg-orange-50 border-orange-200' : 'bg-slate-50'}`}>
                        <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklistCompletion(item.item_id)} className="mt-1" />
                        <div className="flex-1">
                          <p className={`text-sm ${item.completed ? 'line-through text-slate-500' : ''}`}>{item.description}</p>
                          {item.completed && item.completed_by_name && (
                            <p className="text-xs text-green-600 mt-1">Completed by {item.completed_by_name} • {item.completed_at && formatEuroDate(item.completed_at)}</p>
                          )}
                        </div>
                        {item.required && !item.completed && <Badge variant="outline" className="text-xs text-red-600">Required</Badge>}
                        {item.completed && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {showChecklistDialog.signoff_required && (
                  <div className="border-t pt-4">
                    <Label className="flex items-center gap-2 mb-2"><UserCheck className="h-4 w-4 text-purple-600" />Sign-off Notes</Label>
                    <Textarea value={signoffNotes} onChange={(e) => setSignoffNotes(e.target.value)} placeholder="Optional notes for sign-off..." rows={2} />
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Progress: {checklistState.filter(i => i.completed).length}/{checklistState.length} items</span>
                  {checklistState.filter(i => i.required && !i.completed).length > 0 && (
                    <span className="text-orange-600">{checklistState.filter(i => i.required && !i.completed).length} required items remaining</span>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowChecklistDialog(null)}>Cancel</Button>
                <Button onClick={saveChecklistCompletion} className="bg-teal-600 hover:bg-teal-700" disabled={checklistState.filter(i => i.required).some(i => !i.completed)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {showChecklistDialog.signoff_required ? 'Complete & Sign-off' : 'Save Progress'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent><DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Delete {deleteConfirm?.type}</DialogTitle><DialogDescription>Delete "{deleteConfirm?.name}"? This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

export default MaintenanceManagement;
