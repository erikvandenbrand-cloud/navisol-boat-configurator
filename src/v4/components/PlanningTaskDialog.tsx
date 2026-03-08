/**
 * Unified Planning Task Dialog - v4.1
 * Reusable dialog for creating/editing planning work items across all screens.
 * Now uses unified WorkItem model with kind: 'planning'
 *
 * Supports two modes:
 * 1. Controlled mode: Uses onSave callback (for PlanningTab)
 * 2. Standalone mode: Uses projectId to save directly (for portfolio views)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPlus, FolderOpen, ExternalLink, Lock, Unlock, RefreshCw } from 'lucide-react';
import type {
  WorkItem,
  WorkItemStatus,
  PlanningResource,
  Project,
  AutoSyncDatesMode,
} from '@/domain/models';
import type { User } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuthService } from '@/domain/services/AuthService';
import { PlanningSummaryService } from '@/domain/services/PlanningSummaryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================
// EXPORTS - Status options for reuse
// ============================================

/**
 * Planning status options using unified WorkItemStatus.
 * Note: 'DONE' is now 'COMPLETED' in the unified model.
 */
export const PLANNING_STATUS_OPTIONS: { value: WorkItemStatus; label: string; color: string }[] = [
  { value: 'TODO', label: 'To Do', color: 'bg-slate-100 text-slate-700' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'COMPLETED', label: 'Done', color: 'bg-green-100 text-green-700' },
];

/**
 * AutoSyncDates options for planning summaries.
 */
export const AUTO_SYNC_DATES_OPTIONS: { value: AutoSyncDatesMode; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'Never auto-update dates on refresh' },
  { value: 'whenEmpty', label: 'When Empty', description: 'Update only if no dates set' },
  { value: 'whenUnlocked', label: 'When Unlocked', description: 'Update if dates not locked (default)' },
];

/**
 * Type alias for planning work item (WorkItem with kind: 'planning')
 */
export type PlanningWorkItem = WorkItem & { kind: 'planning' };

// ============================================
// TYPES
// ============================================

interface PlanningTaskDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PlanningWorkItem | null;
}

// Controlled mode: used in PlanningTab with callbacks
interface ControlledModeProps extends PlanningTaskDialogBaseProps {
  mode: 'controlled';
  resources: PlanningResource[];
  tasks: PlanningWorkItem[];
  onSave: (data: Partial<PlanningWorkItem>) => Promise<void>;
  /** GOVERNANCE: Staff concept removed in v323 — uses User instead */
  onQuickAddResource?: (user: User) => Promise<PlanningResource>;
}

// Standalone mode: used in portfolio views with projectId
interface StandaloneModeProps extends PlanningTaskDialogBaseProps {
  mode: 'standalone';
  projectId: string;
  projectNumber?: string;
  projectTitle?: string;
  onSaved?: () => void; // Called after successful save
  onNavigateToProject?: (projectId: string) => void;
}

export type PlanningTaskDialogProps = ControlledModeProps | StandaloneModeProps;

// ============================================
// COMPONENT
// ============================================

export function PlanningTaskDialog(props: PlanningTaskDialogProps) {
  const { open, onOpenChange, task } = props;
  const isEdit = task !== null;
  const isSummary = task?.summarizes != null;

  // Form state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<number | undefined>();
  const [status, setStatus] = useState<WorkItemStatus>('TODO');
  const [notes, setNotes] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [autoSyncDates, setAutoSyncDates] = useState<AutoSyncDatesMode>('whenUnlocked');
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Track original dates for summaries to detect manual edits
  const originalDatesRef = useRef<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });

  // Resources and tasks (loaded in standalone mode)
  const [localResources, setLocalResources] = useState<PlanningResource[]>([]);
  const [localTasks, setLocalTasks] = useState<PlanningWorkItem[]>([]);
  const [project, setProject] = useState<Project | null>(null);

  // User quick-add state — Staff concept removed in v323
  const [userList, setUserList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Determine mode
  const isControlled = props.mode === 'controlled';

  // Get resources and tasks based on mode
  const resources = isControlled ? props.resources : localResources;
  const tasks = isControlled ? props.tasks : localTasks;

  // Load data when dialog opens (standalone mode)
  useEffect(() => {
    if (open && !isControlled) {
      loadProjectData();
    }
  }, [open, isControlled, props.mode === 'standalone' ? props.projectId : null]);

  // Load user list when dialog opens — Staff concept removed in v323
  useEffect(() => {
    if (open) {
      loadUserList();
    }
  }, [open]);

  // Reset form when dialog opens or task changes
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setStartDate(task.startDate || '');
        setEndDate(task.endDate || '');
        setDurationDays(task.durationDays);
        setStatus(task.status || 'TODO');
        setNotes(task.notes || '');
        // Use unified field names
        setSelectedAssignees(task.assigneeIds || []);
        setSelectedDependencies(task.dependsOnIds || []);
        // Load autoSyncDates from summary
        setAutoSyncDates(task.summarizes?.autoSyncDates ?? 'whenUnlocked');
        // Store original dates for summary date-lock detection
        originalDatesRef.current = {
          startDate: task.startDate || '',
          endDate: task.endDate || '',
        };
      } else {
        setTitle('');
        setStartDate('');
        setEndDate('');
        setDurationDays(undefined);
        setStatus('TODO');
        setNotes('');
        setSelectedAssignees([]);
        setSelectedDependencies([]);
        setAutoSyncDates('whenUnlocked');
        originalDatesRef.current = { startDate: '', endDate: '' };
      }
      setShowUserPicker(false);
    }
  }, [open, task]);

  async function loadProjectData() {
    if (props.mode !== 'standalone') return;

    try {
      const proj = await ProjectRepository.getById(props.projectId);
      if (proj) {
        setProject(proj);
        setLocalResources(proj.planning?.resources || []);
        // Use workItems with kind: 'planning'
        const planningItems = (proj.workItems || []).filter(
          (w): w is PlanningWorkItem => w.kind === 'planning'
        );
        setLocalTasks(planningItems);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  }

  /**
   * GOVERNANCE: Staff concept removed in v323 — uses User instead.
   * Loads active users for quick-add as planning resources.
   */
  async function loadUserList() {
    setIsLoadingUsers(true);
    try {
      const allUsers = await AuthService.getAllUsers();
      const activeUsers = allUsers.filter((u) => u.isActive);
      activeUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUserList(activeUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }

  // Get users not yet added as resources (for quick-add)
  const availableUsersForQuickAdd = userList.filter((u) => {
    const alreadyResource = resources.some(
      (r) => r.name.toLowerCase() === u.name.toLowerCase()
    );
    return !alreadyResource;
  });

  const handleQuickAddUser = useCallback(async (user: User) => {
    if (isControlled && props.onQuickAddResource) {
      try {
        const newResource = await props.onQuickAddResource(user);
        setSelectedAssignees((prev) => [...prev, newResource.id]);
        setShowUserPicker(false);
      } catch (error) {
        console.error('Failed to quick-add user:', error);
      }
    } else if (!isControlled && project) {
      // Standalone mode: create resource directly
      // v324: Store sourceUserId for stable identity resolution
      const newResource: PlanningResource = {
        id: generateUUID(),
        name: user.name,
        role: user.department, // Use department as role hint (was Staff.label)
        sourceUserId: user.id, // v324: Enable stable identity even if name changes
      };

      const currentResources = [...localResources, newResource];
      setLocalResources(currentResources);
      setSelectedAssignees((prev) => [...prev, newResource.id]);
      setShowUserPicker(false);

      // Save resources to project (planning.resources still holds resources)
      await ProjectRepository.update(project.id, {
        planning: {
          ...project.planning,
          resources: currentResources,
        },
      });
    }
  }, [isControlled, props, project, localResources]);

  async function handleSave() {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      // Detect if dates were changed for summary items
      const datesChanged = isSummary && (
        startDate !== originalDatesRef.current.startDate ||
        endDate !== originalDatesRef.current.endDate
      );

      // Build task data using unified WorkItem fields
      const taskData: Partial<PlanningWorkItem> = {
        title: title.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        durationDays: durationDays,
        status,
        notes: notes.trim() || undefined,
        // Use unified field names
        assigneeIds: selectedAssignees,
        dependsOnIds: selectedDependencies,
      };

      if (isControlled) {
        await props.onSave(taskData);
      } else if (project) {
        // Standalone mode: save directly to repository using workItems
        const currentWorkItems = [...(project.workItems || [])];
        const currentTimestamp = now();

        if (task) {
          // Update existing task
          const index = currentWorkItems.findIndex((t) => t.id === task.id);
          if (index >= 0) {
            const existingTask = currentWorkItems[index];

            // If this is a summary, update summarizes settings
            let updatedSummarizes = existingTask.summarizes;
            if (existingTask.summarizes) {
              updatedSummarizes = {
                ...existingTask.summarizes,
                // Lock dates if changed
                datesLocked: datesChanged ? true : existingTask.summarizes.datesLocked,
                // Update autoSyncDates if changed
                autoSyncDates: autoSyncDates,
              };
            }

            currentWorkItems[index] = {
              ...existingTask,
              ...taskData,
              summarizes: updatedSummarizes,
              updatedAt: currentTimestamp,
              version: existingTask.version + 1,
            };
          }
        } else {
          // Add new planning work item
          const maxNumber = currentWorkItems.reduce(
            (max, w) => Math.max(max, w.workItemNumber || 0),
            0
          );
          const newWorkItem: PlanningWorkItem = {
            id: generateUUID(),
            projectId: project.id,
            workItemNumber: maxNumber + 1,
            kind: 'planning',
            title: taskData.title || 'Untitled Task',
            status: taskData.status || 'TODO',
            startDate: taskData.startDate,
            endDate: taskData.endDate,
            durationDays: taskData.durationDays,
            assigneeIds: taskData.assigneeIds || [],
            dependsOnIds: taskData.dependsOnIds || [],
            notes: taskData.notes,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
            version: 0,
            createdBy: 'user', // TODO: Get from context
          };
          currentWorkItems.push(newWorkItem);
        }

        await ProjectRepository.update(project.id, {
          workItems: currentWorkItems,
        });

        if (props.mode === 'standalone' && props.onSaved) {
          props.onSaved();
        }
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleAssignee(resourceId: string) {
    setSelectedAssignees((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  }

  function toggleDependency(taskId: string) {
    setSelectedDependencies((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  // Handle recalculate dates for summary items
  async function handleRecalculateDates() {
    if (!task || !isSummary || !project) return;

    setIsRecalculating(true);
    try {
      const result = await PlanningSummaryService.recalculateDates(
        project.id,
        task.id,
        { userId: 'user', userName: 'User' }
      );

      if (result.ok) {
        // Update form with recalculated dates
        setStartDate(result.value.startDate || '');
        setEndDate(result.value.endDate || '');
        // Update original dates ref so we don't detect as "changed"
        originalDatesRef.current = {
          startDate: result.value.startDate || '',
          endDate: result.value.endDate || '',
        };
        // Reload project data
        await loadProjectData();
      }
    } catch (error) {
      console.error('Failed to recalculate dates:', error);
    } finally {
      setIsRecalculating(false);
    }
  }

  // Filter out current task from dependencies (prevent self-dependency)
  const availableDependencies = tasks.filter((t) => t.id !== task?.id);

  // Project info for standalone mode
  const showProjectInfo = !isControlled && (props.projectNumber || props.projectTitle);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'Add Task'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update task details.' : 'Create a new planning task.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 -mx-6 px-6">
          {/* Project info (standalone mode) */}
          {showProjectInfo && props.mode === 'standalone' && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
              <FolderOpen className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                {props.projectNumber}
              </span>
              <span className="text-sm text-slate-500 truncate flex-1">
                {props.projectTitle}
              </span>
              {props.onNavigateToProject && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    props.onNavigateToProject?.(props.projectId);
                  }}
                  className="text-teal-600 hover:text-teal-700"
                  title="Open project"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          {/* Dates */}
          <div className="space-y-2">
            {/* Summary date lock indicator */}
            {isSummary && task?.summarizes?.datesLocked && (
              <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">Dates locked</span>
                  <span className="text-xs text-amber-600">(manually edited)</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculateDates}
                  disabled={isRecalculating}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRecalculating ? 'animate-spin' : ''}`} />
                  {isRecalculating ? 'Recalculating...' : 'Recalculate'}
                </Button>
              </div>
            )}
            {isSummary && !task?.summarizes?.datesLocked && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                <Unlock className="h-4 w-4" />
                <span className="text-sm">Dates auto-calculated from production tasks</span>
                <span className="text-xs text-slate-500">(editing will lock them)</span>
              </div>
            )}
            {/* AutoSyncDates control for summaries */}
            {isSummary && (
              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="auto-sync-dates" className="text-sm text-slate-700">
                    Date sync on refresh:
                  </Label>
                </div>
                <Select
                  value={autoSyncDates}
                  onValueChange={(v) => setAutoSyncDates(v as AutoSyncDatesMode)}
                >
                  <SelectTrigger id="auto-sync-dates" className="w-[150px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTO_SYNC_DATES_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-start">Start Date</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-end">End Date</Label>
                <Input
                  id="task-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Duration & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-duration">Duration (days)</Label>
              <Input
                id="task-duration"
                type="number"
                min={1}
                value={durationDays || ''}
                onChange={(e) => setDurationDays(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WorkItemStatus)}>
                <SelectTrigger id="task-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PLANNING_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>Assignees</Label>

            {resources.length === 0 ? (
              <div className="text-sm text-slate-500">
                No resources available.
                {/* User quick-add — Staff concept removed in v323 */}
                {availableUsersForQuickAdd.length > 0 && (
                  <>
                    {' '}
                    <Popover open={showUserPicker} onOpenChange={setShowUserPicker}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-teal-600 hover:text-teal-700 underline underline-offset-2"
                        >
                          Quick add from Users
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-700">Select user to add:</p>
                          {isLoadingUsers ? (
                            <p className="text-xs text-slate-500">Loading...</p>
                          ) : (
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {availableUsersForQuickAdd.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => handleQuickAddUser(user)}
                                  className="w-full flex items-center gap-2 p-2 text-left text-sm rounded hover:bg-slate-100 transition-colors"
                                >
                                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-teal-700">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{user.name}</p>
                                    {user.department && (
                                      <p className="text-xs text-slate-500 truncate">{user.department}</p>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500">
                            Creates a resource and auto-assigns to this task.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                    {' or add resources in the project.'}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                  {resources.map((resource) => (
                    <label
                      key={resource.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                    >
                      <Checkbox
                        checked={selectedAssignees.includes(resource.id)}
                        onCheckedChange={() => toggleAssignee(resource.id)}
                      />
                      <span className="text-sm">{resource.name}</span>
                      {resource.role && (
                        <span className="text-xs text-slate-500">({resource.role})</span>
                      )}
                    </label>
                  ))}
                </div>
                {/* Quick add from users — Staff concept removed in v323 */}
                {availableUsersForQuickAdd.length > 0 && (
                  <Popover open={showUserPicker} onOpenChange={setShowUserPicker}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                      >
                        <UserPlus className="h-3 w-3" />
                        Quick add from Users...
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-700">Select user to add:</p>
                        {isLoadingUsers ? (
                          <p className="text-xs text-slate-500">Loading...</p>
                        ) : (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {availableUsersForQuickAdd.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => handleQuickAddUser(user)}
                                className="w-full flex items-center gap-2 p-2 text-left text-sm rounded hover:bg-slate-100 transition-colors"
                              >
                                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-teal-700">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{user.name}</p>
                                  {user.department && (
                                    <p className="text-xs text-slate-500 truncate">{user.department}</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500">
                          Creates a resource and auto-assigns to this task.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div className="space-y-2">
            <Label>Dependencies</Label>
            {availableDependencies.length === 0 ? (
              <p className="text-sm text-slate-500">No other tasks available to depend on.</p>
            ) : (
              <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                {availableDependencies.map((depTask) => (
                  <label
                    key={depTask.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                  >
                    <Checkbox
                      checked={selectedDependencies.includes(depTask.id)}
                      onCheckedChange={() => toggleDependency(depTask.id)}
                    />
                    <span className="text-sm">{depTask.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
