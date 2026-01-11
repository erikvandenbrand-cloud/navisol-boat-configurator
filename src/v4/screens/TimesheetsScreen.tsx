/**
 * Timesheets Screen - v4
 * Time entry with weekly view and reports
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  Save,
  DollarSign,
  Users,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  TimesheetEntry,
  Project,
  ProjectTask,
} from '@/domain/models';
import {
  getWeekStart,
  formatDate,
  parseDate,
} from '@/domain/models';
import { TimesheetService } from '@/domain/services/TimesheetService';
import { ProjectRepository } from '@/data/repositories';
import { useAuth, getDefaultAuditContext } from '@/v4/state/useAuth';
import { TimesheetsPeriodToggle, type PeriodMode } from '@/v4/components/TimesheetsPeriodToggle';
import { TimesheetsReportsView } from '@/v4/components/TimesheetsReportsView';

// ============================================
// TYPES
// ============================================

type TabType = 'entries' | 'reports';

interface EntryFormData {
  date: string;
  hours: string;
  projectId: string;
  taskId: string;
  billable: boolean;
  billingRate: string;
  note: string;
}

const INITIAL_FORM: EntryFormData = {
  date: formatDate(new Date()),
  hours: '',
  projectId: '',
  taskId: '',
  billable: true,
  billingRate: '',
  note: '',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================
// MAIN COMPONENT
// ============================================

export function TimesheetsScreen() {
  const { user, can } = useAuth();
  const canViewAll = can('timesheet:view_all');
  const canManage = can('timesheet:manage');
  const canCreate = can('timesheet:create');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('entries');

  // Period state (week or month)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('week');

  // State
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [weekTotal, setWeekTotal] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [formData, setFormData] = useState<EntryFormData>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Selected project tasks
  const [selectedProjectTasks, setSelectedProjectTasks] = useState<ProjectTask[]>([]);

  // Reports state
  const [selectedReportProjectId, setSelectedReportProjectId] = useState<string | null>(null);
  const [reportsTotal, setReportsTotal] = useState(0);

  // Load entries data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load projects
      const allProjects = await ProjectRepository.getAll();
      setProjects(allProjects.filter((p) => p.status !== 'CLOSED' || showAllUsers));

      // Load weekly view
      const userId = showAllUsers && canViewAll ? undefined : user?.id;
      const weekData = await TimesheetService.getWeeklyView(currentWeek, userId);
      setEntries(weekData.entries);
      setDailyTotals(weekData.dailyTotals);
      setWeekTotal(weekData.weekTotal);
    } catch (error) {
      console.error('Failed to load timesheet data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWeek, showAllUsers, canViewAll, user?.id]);

  useEffect(() => {
    if (activeTab === 'entries') {
      loadData();
    }
  }, [activeTab, loadData]);

  // Get week dates
  const weekStart = getWeekStart(currentWeek);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(formatDate(d));
  }

  // Entry dialog handlers
  function handleOpenNewEntry(date?: string) {
    setEditingEntry(null);
    setFormData({
      ...INITIAL_FORM,
      date: date || formatDate(new Date()),
    });
    setFormError('');
    setSelectedProjectTasks([]);
    setShowEntryDialog(true);
  }

  function handleOpenEditEntry(entry: TimesheetEntry) {
    // Check if user can edit this entry
    if (!canManage && entry.userId !== user?.id) {
      return;
    }

    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      hours: entry.hours.toString(),
      projectId: entry.projectId,
      taskId: entry.taskId || '',
      billable: entry.billable,
      billingRate: entry.billingRate?.toString() || '',
      note: entry.note || '',
    });
    setFormError('');

    // Load project tasks
    const project = projects.find((p) => p.id === entry.projectId);
    setSelectedProjectTasks(project?.tasks || []);

    setShowEntryDialog(true);
  }

  async function handleProjectChange(projectId: string) {
    setFormData((prev) => ({ ...prev, projectId, taskId: '' }));

    // Load project tasks
    const project = projects.find((p) => p.id === projectId);
    setSelectedProjectTasks(project?.tasks || []);

    // Set default billable based on project.isInternal
    if (project) {
      const defaultBillable = !project.isInternal;
      setFormData((prev) => ({
        ...prev,
        billable: defaultBillable,
        billingRate: defaultBillable ? prev.billingRate : '',
      }));
    }
  }

  async function handleSaveEntry() {
    setFormError('');

    // Validate
    const hours = parseFloat(formData.hours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setFormError('Hours must be between 0 and 24');
      return;
    }

    // Check 0.25 increments
    if ((hours * 4) % 1 !== 0) {
      setFormError('Hours must be in 0.25 increments (e.g., 0.25, 0.5, 0.75, 1.0)');
      return;
    }

    if (!formData.projectId) {
      setFormError('Please select a project');
      return;
    }

    const billingRate = formData.billable && formData.billingRate
      ? parseFloat(formData.billingRate)
      : undefined;

    if (formData.billable && billingRate !== undefined && billingRate < 0) {
      setFormError('Billing rate must be >= 0');
      return;
    }

    setIsSaving(true);
    try {
      const context = getDefaultAuditContext();

      if (editingEntry) {
        // Check if project is closed
        const project = projects.find((p) => p.id === formData.projectId);
        if (project?.status === 'CLOSED') {
          setFormError('Cannot modify entries for closed projects');
          setIsSaving(false);
          return;
        }

        const result = await TimesheetService.updateEntry(
          editingEntry.id,
          {
            date: formData.date,
            hours,
            projectId: formData.projectId,
            taskId: formData.taskId || undefined,
            billable: formData.billable,
            billingRate: formData.billable ? billingRate : undefined,
            note: formData.note || undefined,
          },
          context
        );

        if (!result.ok) {
          setFormError(result.error);
          setIsSaving(false);
          return;
        }
      } else {
        const result = await TimesheetService.createEntry(
          {
            date: formData.date,
            hours,
            projectId: formData.projectId,
            taskId: formData.taskId || undefined,
            billable: formData.billable,
            billingRate: formData.billable ? billingRate : undefined,
            note: formData.note || undefined,
          },
          context
        );

        if (!result.ok) {
          setFormError(result.error);
          setIsSaving(false);
          return;
        }
      }

      setShowEntryDialog(false);
      await loadData();
    } catch (error) {
      setFormError('Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEntry(entry: TimesheetEntry) {
    // Check if user can delete
    if (!canManage && entry.userId !== user?.id) {
      return;
    }

    if (!confirm('Delete this time entry?')) return;

    try {
      const context = getDefaultAuditContext();
      const result = await TimesheetService.deleteEntry(entry.id, context);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      await loadData();
    } catch (error) {
      alert('Failed to delete entry');
    }
  }

  // Group entries by date
  const entriesByDate: Record<string, TimesheetEntry[]> = {};
  for (const date of weekDates) {
    entriesByDate[date] = entries.filter((e) => e.date === date);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-7 w-7 text-teal-600" />
              Timesheets
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your work hours
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View toggle (admin only) */}
            {canViewAll && (
              <div className="flex items-center gap-2">
                <Button
                  variant={showAllUsers ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => setShowAllUsers(false)}
                >
                  My Entries
                </Button>
                <Button
                  variant={showAllUsers ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowAllUsers(true)}
                >
                  <Users className="h-4 w-4 mr-1" />
                  All Entries
                </Button>
              </div>
            )}

            {/* Add entry button (only in entries tab) */}
            {canCreate && activeTab === 'entries' && (
              <Button onClick={() => handleOpenNewEntry()} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b -mb-4 -mx-6 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'entries'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-1.5" />
            Entries
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              setSelectedReportProjectId(null);
            }}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-1.5" />
            Reports
          </button>
        </div>
      </header>

      {/* Period Navigation */}
      <TimesheetsPeriodToggle
        periodMode={periodMode}
        currentDate={currentWeek}
        periodTotal={activeTab === 'entries' ? weekTotal : reportsTotal}
        onPeriodModeChange={setPeriodMode}
        onDateChange={setCurrentWeek}
      />

      {/* Content */}
      {activeTab === 'entries' ? (
        <EntriesView
          isLoading={isLoading}
          weekDates={weekDates}
          entriesByDate={entriesByDate}
          dailyTotals={dailyTotals}
          projects={projects}
          showAllUsers={showAllUsers}
          canManage={canManage}
          canCreate={canCreate}
          userId={user?.id}
          onOpenNewEntry={handleOpenNewEntry}
          onOpenEditEntry={handleOpenEditEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      ) : (
        <TimesheetsReportsView
          periodMode={periodMode}
          currentDate={currentWeek}
          projects={projects}
          selectedProjectId={selectedReportProjectId}
          showAllUsers={showAllUsers}
          canViewAll={canViewAll}
          userId={user?.id}
          onProjectChange={setSelectedReportProjectId}
          onTotalChange={setReportsTotal}
        />
      )}

      {/* Entry Dialog */}
      <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-600" />
              {editingEntry ? 'Edit Time Entry' : 'New Time Entry'}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? 'Update this time entry' : 'Log your work hours'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={formData.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((p) => p.status !== 'CLOSED')
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span>{project.title}</span>
                          {project.isInternal && (
                            <Badge variant="outline" className="text-[10px]">Internal</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task (optional) */}
            {selectedProjectTasks.length > 0 && (
              <div className="space-y-2">
                <Label>Task (optional)</Label>
                <Select
                  value={formData.taskId}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, taskId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific task</SelectItem>
                    {selectedProjectTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hours */}
            <div className="space-y-2">
              <Label>Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                placeholder="e.g., 2.5"
                value={formData.hours}
                onChange={(e) => setFormData((prev) => ({ ...prev, hours: e.target.value }))}
              />
              <p className="text-xs text-slate-500">Use 0.25 increments (0.25, 0.5, 0.75, 1.0, etc.)</p>
            </div>

            {/* Billable */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="billable"
                checked={formData.billable}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    billable: !!checked,
                    billingRate: checked ? prev.billingRate : '',
                  }))
                }
              />
              <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
            </div>

            {/* Billing Rate (only if billable) */}
            {formData.billable && (
              <div className="space-y-2">
                <Label>Billing Rate (optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 75.00"
                    className="pl-9"
                    value={formData.billingRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, billingRate: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-slate-500">Stored for reference only, no calculations</p>
              </div>
            )}

            {/* Note */}
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="What did you work on?"
                value={formData.note}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntryDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEntry}
              disabled={isSaving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSaving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// ENTRIES VIEW COMPONENT
// ============================================

interface EntriesViewProps {
  isLoading: boolean;
  weekDates: string[];
  entriesByDate: Record<string, TimesheetEntry[]>;
  dailyTotals: Record<string, number>;
  projects: Project[];
  showAllUsers: boolean;
  canManage: boolean;
  canCreate: boolean;
  userId?: string;
  onOpenNewEntry: (date?: string) => void;
  onOpenEditEntry: (entry: TimesheetEntry) => void;
  onDeleteEntry: (entry: TimesheetEntry) => void;
}

function EntriesView({
  isLoading,
  weekDates,
  entriesByDate,
  dailyTotals,
  projects,
  showAllUsers,
  canManage,
  canCreate,
  userId,
  onOpenNewEntry,
  onOpenEditEntry,
  onDeleteEntry,
}: EntriesViewProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <Clock className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-7 gap-4">
        {weekDates.map((date, idx) => {
          const dayEntries = entriesByDate[date] || [];
          const dayTotal = dailyTotals[date] || 0;
          const isToday = date === formatDate(new Date());
          const dateObj = parseDate(date);
          const isWeekend = idx >= 5;

          return (
            <Card
              key={date}
              className={`min-h-[200px] ${isToday ? 'ring-2 ring-teal-500' : ''} ${isWeekend ? 'bg-slate-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium text-slate-500">
                      {DAY_NAMES[idx]}
                    </CardTitle>
                    <p className={`text-lg font-bold ${isToday ? 'text-teal-600' : 'text-slate-900'}`}>
                      {dateObj.getDate()}
                    </p>
                  </div>
                  <Badge variant={dayTotal > 0 ? 'default' : 'outline'} className="text-xs">
                    {dayTotal.toFixed(2)}h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayEntries.map((entry) => {
                  const project = projects.find((p) => p.id === entry.projectId);
                  const canEdit = canManage || entry.userId === userId;
                  const isClosed = project?.status === 'CLOSED';

                  return (
                    <div
                      key={entry.id}
                      className={`p-2 rounded border text-xs ${isClosed ? 'bg-slate-100 opacity-60' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" title={project?.title || 'Unknown'}>
                            {project?.title || 'Unknown Project'}
                          </p>
                          {showAllUsers && entry.userName && (
                            <p className="text-slate-400 truncate">{entry.userName}</p>
                          )}
                          <p className="text-slate-600 mt-1">{entry.hours}h</p>
                          {entry.billable && (
                            <Badge variant="outline" className="text-[10px] mt-1 text-green-600 border-green-300">
                              <DollarSign className="h-2 w-2 mr-0.5" />
                              Billable
                            </Badge>
                          )}
                        </div>
                        {canEdit && !isClosed && (
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditEntry(entry)}
                              className="p-1 hover:bg-slate-200 rounded"
                            >
                              <Edit2 className="h-3 w-3 text-slate-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEntry(entry)}
                              className="p-1 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                      {entry.note && (
                        <p className="text-slate-400 mt-1 truncate" title={entry.note}>
                          {entry.note}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Quick add for this day */}
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => onOpenNewEntry(date)}
                    className="w-full p-2 border border-dashed rounded text-slate-400 hover:text-teal-600 hover:border-teal-300 transition-colors text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
