'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Save,
  Clock,
  User,
  Calendar,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  ProjectTask,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  CreateTaskInput,
  TaskTimeLog,
} from '@/domain/models';
import { StaffSelect } from '@/v4/components/StaffSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ProjectTask | null; // null = create new
  onSave: (input: CreateTaskInput) => Promise<void>;
  onUpdate?: (updates: Partial<ProjectTask>) => Promise<void>;
  onLogTime?: (hours: number, date: string, description?: string) => Promise<void>;
  onDeleteTimeLog?: (timeLogId: string) => Promise<void>;
}

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'HULL', label: 'Hull' },
  { value: 'PROPULSION', label: 'Propulsion' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'INTERIOR', label: 'Interior' },
  { value: 'EXTERIOR', label: 'Exterior' },
  { value: 'NAVIGATION', label: 'Navigation' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'FINISHING', label: 'Finishing' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'bg-slate-100 text-slate-700' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSave,
  onUpdate,
  onLogTime,
  onDeleteTimeLog,
}: TaskDialogProps) {
  const isEdit = task !== null;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('OTHER');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>();
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  // Time logging state
  const [logHours, setLogHours] = useState(1);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logDescription, setLogDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setCategory(task.category);
      setPriority(task.priority);
      setEstimatedHours(task.estimatedHours);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setAssignedTo(task.assignedTo || '');
      setNotes(task.notes || '');
    } else {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setCategory('OTHER');
      setPriority('MEDIUM');
      setEstimatedHours(undefined);
      setDueDate('');
      setAssignedTo('');
      setNotes('');
    }
    setActiveTab('details');
  }, [task, open]);

  async function handleSave() {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit && onUpdate) {
        await onUpdate({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          estimatedHours,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          assignedTo: assignedTo.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSave({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          estimatedHours,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          assignedTo: assignedTo.trim() || undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogTime() {
    if (!onLogTime || logHours <= 0) return;

    setIsLoading(true);
    try {
      await onLogTime(logHours, logDate, logDescription.trim() || undefined);
      // Reset form
      setLogHours(1);
      setLogDescription('');
    } catch (error) {
      console.error('Failed to log time:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteTimeLog(timeLogId: string) {
    if (!onDeleteTimeLog) return;
    if (!confirm('Delete this time entry?')) return;

    try {
      await onDeleteTimeLog(timeLogId);
    } catch (error) {
      console.error('Failed to delete time log:', error);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" />
            {isEdit ? `Edit Task #${task.taskNumber}` : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update task details and log time'
              : 'Add a new production task to this project'}
          </DialogDescription>
        </DialogHeader>

        {isEdit ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="time">
                Time Logs
                {task.timeLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {task.totalLoggedHours}h
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto space-y-4 py-4">
              <TaskFormFields
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                priority={priority}
                setPriority={setPriority}
                estimatedHours={estimatedHours}
                setEstimatedHours={setEstimatedHours}
                dueDate={dueDate}
                setDueDate={setDueDate}
                assignedTo={assignedTo}
                setAssignedTo={setAssignedTo}
                notes={notes}
                setNotes={setNotes}
              />
            </TabsContent>

            <TabsContent value="time" className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                {/* Log new time */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Log Time
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label>Hours</Label>
                      <Input
                        type="number"
                        min={0.25}
                        step={0.25}
                        value={logHours}
                        onChange={(e) => setLogHours(parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Description (optional)</Label>
                      <Input
                        value={logDescription}
                        onChange={(e) => setLogDescription(e.target.value)}
                        placeholder="What did you work on?"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={handleLogTime}
                    disabled={isLoading || logHours <= 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Log Time
                  </Button>
                </div>

                {/* Time log history */}
                <div>
                  <h4 className="font-medium mb-3">Time History</h4>
                  {task.timeLogs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No time logged yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {task.timeLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{formatDate(log.date)}</TableCell>
                            <TableCell className="font-medium">{log.hours}h</TableCell>
                            <TableCell>{log.userName}</TableCell>
                            <TableCell className="text-slate-600">{log.description || '-'}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600"
                                onClick={() => handleDeleteTimeLog(log.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-teal-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-teal-800">Total Logged</span>
                    <span className="text-xl font-bold text-teal-700">
                      {task.totalLoggedHours}h
                    </span>
                  </div>
                  {task.estimatedHours && (
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-teal-700">vs Estimated ({task.estimatedHours}h)</span>
                      <span className={task.totalLoggedHours > task.estimatedHours ? 'text-red-600' : 'text-green-600'}>
                        {task.totalLoggedHours > task.estimatedHours ? '+' : ''}
                        {task.totalLoggedHours - task.estimatedHours}h
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <TaskFormFields
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              category={category}
              setCategory={setCategory}
              priority={priority}
              setPriority={setPriority}
              estimatedHours={estimatedHours}
              setEstimatedHours={setEstimatedHours}
              dueDate={dueDate}
              setDueDate={setDueDate}
              assignedTo={assignedTo}
              setAssignedTo={setAssignedTo}
              notes={notes}
              setNotes={setNotes}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Extracted form fields component
function TaskFormFields({
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  priority,
  setPriority,
  estimatedHours,
  setEstimatedHours,
  dueDate,
  setDueDate,
  assignedTo,
  setAssignedTo,
  notes,
  setNotes,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: TaskCategory;
  setCategory: (v: TaskCategory) => void;
  priority: TaskPriority;
  setPriority: (v: TaskPriority) => void;
  estimatedHours: number | undefined;
  setEstimatedHours: (v: number | undefined) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  assignedTo: string;
  setAssignedTo: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
    <>
      {/* Title */}
      <div>
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="mt-1"
        />
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed task description..."
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Category & Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estimated Hours & Due Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Estimated Hours
          </Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={estimatedHours ?? ''}
            onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g. 8"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Due Date
          </Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Assignee */}
      <div>
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Assign To
        </Label>
        <StaffSelect
          value={assignedTo}
          onChange={setAssignedTo}
          placeholder="Select staff or type name..."
          className="mt-1 w-full"
        />
        <p className="text-xs text-slate-500 mt-1">
          Optional. Select from staff list or type any name.
        </p>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          className="mt-1"
          rows={2}
        />
      </div>
    </>
  );
}
