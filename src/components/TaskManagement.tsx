'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ListTodo, Plus, Play, Pause, Square, Clock, Timer,
  Edit, Trash2, Check, X, Calendar, User, Ship,
  FileDown, BarChart3, Filter, Search, ChevronDown,
  AlertCircle, CheckCircle2, Circle, Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { useTasks } from '@/lib/task-store';
import { useNavisol } from '@/lib/store';
import { formatEuroDate } from '@/lib/formatting';
import {
  type Task,
  type TimeEntry,
  type TaskStatus,
  type ProjectType,
  type TimeReportGroupBy,
  TASK_STATUS_INFO,
  PROJECT_TYPE_INFO,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Format minutes to hours:minutes display
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

// Format timer display (mm:ss or hh:mm:ss)
function formatTimerDisplay(minutes: number): string {
  const totalSeconds = Math.floor(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TaskManagement() {
  const { currentUser, hasPermission } = useAuth();
  const { clientBoats, clients, getClientById } = useNavisol();
  const {
    tasks,
    timeEntries,
    activeTimer,
    isLoading,
    getTasks,
    getTasksWithTime,
    createTask,
    updateTask,
    deleteTask,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getTimerElapsed,
    generateReport,
    exportReportCSV,
  } = useTasks();

  // State
  const [activeTab, setActiveTab] = useState<'tasks' | 'timer' | 'reports'>('tasks');
  const [filterVessel, setFilterVessel] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [selectedTaskForEntry, setSelectedTaskForEntry] = useState<string>('');

  // New task form state
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    vessel_instance_id: '',
    status: 'open',
    billable: true,
    project_type: 'external',
  });

  // Manual time entry form
  const [manualEntry, setManualEntry] = useState({
    task_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    minutes: 0,
    billable: true,
    notes: '',
  });

  // Report state
  const [reportGroupBy, setReportGroupBy] = useState<TimeReportGroupBy>('vessel');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportBillable, setReportBillable] = useState<string>('');

  // Timer state for live updates
  const [timerDisplay, setTimerDisplay] = useState('00:00');

  // Update timer display every second
  useEffect(() => {
    if (activeTimer && !activeTimer.is_paused) {
      const interval = setInterval(() => {
        const elapsed = getTimerElapsed();
        setTimerDisplay(formatTimerDisplay(elapsed));
      }, 1000);
      return () => clearInterval(interval);
    } else if (activeTimer?.is_paused) {
      const elapsed = getTimerElapsed();
      setTimerDisplay(formatTimerDisplay(elapsed));
    } else {
      setTimerDisplay('00:00');
    }
  }, [activeTimer, getTimerElapsed]);

  // Get filtered tasks
  const filteredTasks = useMemo(() => {
    let result = getTasksWithTime();

    if (filterVessel) {
      result = result.filter(t => t.vessel_instance_id === filterVessel);
    }

    if (filterStatus) {
      result = result.filter(t => t.status === filterStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [getTasksWithTime, filterVessel, filterStatus, searchQuery]);

  // Get vessel name helper
  const getVesselName = (vesselId: string): string => {
    const boat = clientBoats.find(b => b.id === vesselId);
    if (!boat) return 'Unknown Vessel';
    return boat.boat_name || `${boat.boat_model} (${boat.hull_identification_number || 'No HIN'})`;
  };

  // Get active timer task
  const activeTimerTask = useMemo(() => {
    if (!activeTimer) return null;
    return tasks.find(t => t.id === activeTimer.task_id);
  }, [activeTimer, tasks]);

  // Handle create/update task
  const handleSaveTask = () => {
    if (!currentUser || !newTask.title || !newTask.vessel_instance_id) return;

    if (editingTask) {
      updateTask(editingTask.id, {
        title: newTask.title,
        description: newTask.description,
        vessel_instance_id: newTask.vessel_instance_id,
        status: newTask.status as TaskStatus,
        billable: newTask.billable,
        project_type: newTask.project_type as ProjectType,
        due_date: newTask.due_date,
        assigned_to_id: newTask.assigned_to_id,
      });
    } else {
      createTask({
        title: newTask.title!,
        description: newTask.description,
        vessel_instance_id: newTask.vessel_instance_id!,
        status: (newTask.status || 'open') as TaskStatus,
        billable: newTask.billable ?? true,
        project_type: (newTask.project_type || 'external') as ProjectType,
        due_date: newTask.due_date,
        assigned_to_id: newTask.assigned_to_id,
        created_by_id: currentUser.id,
      });
    }

    setShowTaskDialog(false);
    setEditingTask(null);
    resetNewTask();
  };

  const resetNewTask = () => {
    setNewTask({
      title: '',
      description: '',
      vessel_instance_id: '',
      status: 'open',
      billable: true,
      project_type: 'external',
    });
  };

  // Handle delete task
  const handleDeleteTask = () => {
    if (!deleteConfirm) return;
    deleteTask(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // Handle manual time entry
  const handleAddManualEntry = () => {
    if (!currentUser || !manualEntry.task_id) return;

    const totalMinutes = (manualEntry.hours * 60) + manualEntry.minutes;
    if (totalMinutes < 1) return;

    const startAt = new Date(manualEntry.date);
    startAt.setHours(9, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + totalMinutes * 60 * 1000);

    addTimeEntry({
      task_id: manualEntry.task_id,
      user_id: currentUser.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      duration_min: totalMinutes,
      billable: manualEntry.billable,
      notes: manualEntry.notes || undefined,
    });

    setShowTimeEntryDialog(false);
    setManualEntry({
      task_id: '',
      date: new Date().toISOString().split('T')[0],
      hours: 0,
      minutes: 0,
      billable: true,
      notes: '',
    });
  };

  // Handle stop timer
  const handleStopTimer = (billable: boolean = true) => {
    const entry = stopTimer(billable);
    if (entry) {
      // Timer stopped and entry saved
    }
  };

  // Handle report export
  const handleExportCSV = () => {
    const csv = exportReportCSV(reportGroupBy, {
      date_from: reportDateFrom || undefined,
      date_to: reportDateTo || undefined,
      billable: reportBillable === '' ? undefined : reportBillable === 'true',
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get report data
  const reportData = useMemo(() => {
    return generateReport(reportGroupBy, {
      date_from: reportDateFrom || undefined,
      date_to: reportDateTo || undefined,
      billable: reportBillable === '' ? undefined : reportBillable === 'true',
    });
  }, [generateReport, reportGroupBy, reportDateFrom, reportDateTo, reportBillable]);

  // Check permissions
  const canManageTasks = hasPermission('manageTasks');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ListTodo className="h-7 w-7 text-teal-600" />
            Task Management
          </h1>
          <p className="text-slate-600">Manage tasks and track time for vessel projects</p>
        </div>

        {/* Active Timer Display */}
        {activeTimer && activeTimerTask && (
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Timer className={`h-5 w-5 ${activeTimer.is_paused ? 'text-orange-500' : 'text-teal-600 animate-pulse'}`} />
                  <span className="font-mono text-2xl font-bold text-teal-700">
                    {timerDisplay}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-700">{activeTimerTask.title}</p>
                  <p className="text-slate-500 text-xs">{getVesselName(activeTimerTask.vessel_instance_id)}</p>
                </div>
                <div className="flex gap-1">
                  {activeTimer.is_paused ? (
                    <Button size="sm" variant="ghost" onClick={resumeTimer}>
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={pauseTimer}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleStopTimer(true)} className="text-red-600">
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="timer" className="gap-2">
            <Timer className="h-4 w-4" />
            Time Tracking
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterVessel || 'all'} onValueChange={(v) => setFilterVessel(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full md:w-64">
                    <Ship className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All vessels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vessels</SelectItem>
                    {clientBoats.map(boat => (
                      <SelectItem key={boat.id} value={boat.id}>
                        {boat.boat_name || boat.boat_model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                {canManageTasks && (
                  <Button onClick={() => { resetNewTask(); setShowTaskDialog(true); }} className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task List */}
          <Card>
            <CardContent className="pt-6">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ListTodo className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No tasks found</p>
                  <p className="text-sm">Create a new task to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        activeTimer?.task_id === task.id
                          ? 'border-teal-300 bg-teal-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {task.status === 'done' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : task.status === 'in_progress' ? (
                              <Circle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            )}
                            <h3 className={`font-medium ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                              {task.title}
                            </h3>
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-500 mb-2 ml-7">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 ml-7">
                            <Badge variant="outline" className="text-xs">
                              <Ship className="h-3 w-3 mr-1" />
                              {getVesselName(task.vessel_instance_id)}
                            </Badge>
                            <Badge className={`text-xs ${TASK_STATUS_INFO[task.status].color} text-white`}>
                              {TASK_STATUS_INFO[task.status].label}
                            </Badge>
                            <Badge variant={task.billable ? 'default' : 'secondary'} className="text-xs">
                              {task.billable ? 'Billable' : 'Non-billable'}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${PROJECT_TYPE_INFO[task.project_type].color} text-white`}>
                              {PROJECT_TYPE_INFO[task.project_type].label}
                            </Badge>
                            {task.total_time_min > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(task.total_time_min)}
                              </Badge>
                            )}
                            {task.due_date && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatEuroDate(task.due_date)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Timer controls */}
                          {task.status !== 'done' && currentUser && (
                            activeTimer?.task_id === task.id ? (
                              <div className="flex gap-1">
                                {activeTimer.is_paused ? (
                                  <Button size="sm" variant="outline" onClick={resumeTimer}>
                                    <Play className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={pauseTimer}>
                                    <Pause className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleStopTimer(true)} className="text-red-600">
                                  <Square className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startTimer(task.id, currentUser.id)}
                                disabled={!!activeTimer}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )
                          )}

                          {/* Actions dropdown */}
                          {canManageTasks && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setNewTask(task);
                                  setEditingTask(task);
                                  setShowTaskDialog(true);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setManualEntry(prev => ({ ...prev, task_id: task.id }));
                                  setSelectedTaskForEntry(task.id);
                                  setShowTimeEntryDialog(true);
                                }}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Add Time Entry
                                </DropdownMenuItem>
                                {task.status !== 'done' && (
                                  <DropdownMenuItem onClick={() => updateTask(task.id, { status: 'done' })}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirm(task)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      {/* Time entries (collapsible) */}
                      {task.time_entries.length > 0 && (
                        <Collapsible className="mt-3 ml-7">
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                            <ChevronDown className="h-4 w-4" />
                            {task.time_entries.length} time entries
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="space-y-2">
                              {task.time_entries.slice(0, 5).map(entry => (
                                <div key={entry.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">{formatEuroDate(entry.start_at)}</span>
                                    <span className="font-medium">{formatDuration(entry.duration_min)}</span>
                                    {entry.billable && <Badge variant="outline" className="text-xs">Billable</Badge>}
                                  </div>
                                  {entry.notes && <span className="text-slate-500 text-xs">{entry.notes}</span>}
                                </div>
                              ))}
                              {task.time_entries.length > 5 && (
                                <p className="text-xs text-slate-500">+ {task.time_entries.length - 5} more entries</p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timer Tab */}
        <TabsContent value="timer" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Timer Start */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-teal-600" />
                  Quick Timer
                </CardTitle>
                <CardDescription>Start tracking time for a task</CardDescription>
              </CardHeader>
              <CardContent>
                {activeTimer ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-5xl font-mono font-bold text-teal-600 mb-2">
                        {timerDisplay}
                      </p>
                      <p className="text-lg font-medium">{activeTimerTask?.title}</p>
                      <p className="text-sm text-slate-500">
                        {activeTimerTask && getVesselName(activeTimerTask.vessel_instance_id)}
                      </p>
                      <Badge variant={activeTimer.is_paused ? 'secondary' : 'default'} className="mt-2">
                        {activeTimer.is_paused ? 'Paused' : 'Running'}
                      </Badge>
                    </div>
                    <div className="flex justify-center gap-2">
                      {activeTimer.is_paused ? (
                        <Button onClick={resumeTimer} className="bg-teal-600 hover:bg-teal-700">
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      ) : (
                        <Button onClick={pauseTimer} variant="outline">
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      )}
                      <Button onClick={() => handleStopTimer(true)} variant="destructive">
                        <Square className="h-4 w-4 mr-2" />
                        Stop
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-slate-500">Select a task to start timing</p>
                    <Select
                      onValueChange={(taskId) => {
                        if (currentUser && taskId) {
                          startTimer(taskId, currentUser.id);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task to start..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks
                          .filter(t => t.status !== 'done')
                          .map(task => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title} - {getVesselName(task.vessel_instance_id)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Time Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-teal-600" />
                  Manual Entry
                </CardTitle>
                <CardDescription>Add time entries manually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Task</Label>
                  <Select
                    value={manualEntry.task_id}
                    onValueChange={(v) => setManualEntry(prev => ({ ...prev, task_id: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={manualEntry.date}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      value={manualEntry.hours}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={manualEntry.minutes}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={manualEntry.billable}
                    onCheckedChange={(v) => setManualEntry(prev => ({ ...prev, billable: v }))}
                  />
                  <Label>Billable</Label>
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    value={manualEntry.notes}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="What did you work on?"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleAddManualEntry}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  disabled={!manualEntry.task_id || (manualEntry.hours === 0 && manualEntry.minutes === 0)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {timeEntries.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No time entries yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries
                      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
                      .slice(0, 10)
                      .map(entry => {
                        const task = tasks.find(t => t.id === entry.task_id);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{task?.title || 'Unknown'}</TableCell>
                            <TableCell>{formatEuroDate(entry.start_at)}</TableCell>
                            <TableCell>{formatDuration(entry.duration_min)}</TableCell>
                            <TableCell>
                              <Badge variant={entry.billable ? 'default' : 'secondary'}>
                                {entry.billable ? 'Yes' : 'No'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500">{entry.notes || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {/* Report Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div>
                  <Label>Group By</Label>
                  <Select value={reportGroupBy} onValueChange={(v) => setReportGroupBy(v as TimeReportGroupBy)}>
                    <SelectTrigger className="w-40 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vessel">Vessel</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Billable</Label>
                  <Select value={reportBillable || 'all'} onValueChange={(v) => setReportBillable(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-32 mt-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Billable</SelectItem>
                      <SelectItem value="false">Non-billable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleExportCSV} variant="outline">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Time Report</CardTitle>
              <CardDescription>
                Grouped by {reportGroupBy}
                {reportDateFrom && ` from ${formatEuroDate(reportDateFrom)}`}
                {reportDateTo && ` to ${formatEuroDate(reportDateTo)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No data for selected filters</p>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-slate-50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-slate-500">Total Hours</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {reportData.reduce((sum, r) => sum + r.total_hours, 0).toFixed(1)}h
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-teal-50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-slate-500">Billable Hours</p>
                        <p className="text-2xl font-bold text-teal-600">
                          {reportData.reduce((sum, r) => sum + r.billable_hours, 0).toFixed(1)}h
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-slate-500">Non-Billable Hours</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {reportData.reduce((sum, r) => sum + r.non_billable_hours, 0).toFixed(1)}h
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-slate-500">Total Entries</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData.reduce((sum, r) => sum + r.total_entries, 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Report Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{reportGroupBy.charAt(0).toUpperCase() + reportGroupBy.slice(1)}</TableHead>
                        <TableHead className="text-right">Total Hours</TableHead>
                        <TableHead className="text-right">Billable</TableHead>
                        <TableHead className="text-right">Non-Billable</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map(row => (
                        <TableRow key={row.group_key}>
                          <TableCell className="font-medium">
                            {reportGroupBy === 'vessel'
                              ? getVesselName(row.group_key)
                              : row.group_name}
                          </TableCell>
                          <TableCell className="text-right">{row.total_hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right text-teal-600">{row.billable_hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right text-orange-600">{row.non_billable_hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right">{row.total_entries}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update task details' : 'Add a new task for time tracking'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newTask.title || ''}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newTask.description || ''}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>Vessel *</Label>
              <Select
                value={newTask.vessel_instance_id || ''}
                onValueChange={(v) => setNewTask(prev => ({ ...prev, vessel_instance_id: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vessel..." />
                </SelectTrigger>
                <SelectContent>
                  {clientBoats.map(boat => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.boat_name || boat.boat_model} - {boat.hull_identification_number || 'No HIN'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={newTask.status || 'open'}
                  onValueChange={(v) => setNewTask(prev => ({ ...prev, status: v as TaskStatus }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Project Type</Label>
                <Select
                  value={newTask.project_type || 'external'}
                  onValueChange={(v) => setNewTask(prev => ({ ...prev, project_type: v as ProjectType }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={newTask.due_date?.split('T')[0] || ''}
                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newTask.billable ?? true}
                onCheckedChange={(v) => setNewTask(prev => ({ ...prev, billable: v }))}
              />
              <Label>Billable</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTaskDialog(false); setEditingTask(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTask}
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!newTask.title || !newTask.vessel_instance_id}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Delete Task
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This will also delete all associated time entries. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Time Entry Dialog */}
      <Dialog open={showTimeEntryDialog} onOpenChange={setShowTimeEntryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Entry</DialogTitle>
            <DialogDescription>Manually add a time entry for this task</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={manualEntry.date}
                onChange={(e) => setManualEntry(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  min="0"
                  value={manualEntry.hours}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={manualEntry.minutes}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={manualEntry.billable}
                onCheckedChange={(v) => setManualEntry(prev => ({ ...prev, billable: v }))}
              />
              <Label>Billable</Label>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={manualEntry.notes}
                onChange={(e) => setManualEntry(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="What did you work on?"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeEntryDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setManualEntry(prev => ({ ...prev, task_id: selectedTaskForEntry }));
                handleAddManualEntry();
              }}
              className="bg-teal-600 hover:bg-teal-700"
              disabled={manualEntry.hours === 0 && manualEntry.minutes === 0}
            >
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TaskManagement;
