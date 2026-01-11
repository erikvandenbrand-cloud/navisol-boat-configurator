/**
 * Production Procedures Tab - v4
 * Manage library-level production procedures with task set templates
 */

'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Lock,
  Play,
  FileCheck,
} from 'lucide-react';
import type {
  ProductionProcedure,
  ProductionProcedureVersion,
  TaskSetTemplate,
  TemplateTask,
  TaskCategory,
  TaskPriority,
  ProductionStageCode,
  VersionStatus,
} from '@/domain/models';
import { PRODUCTION_PROCEDURE_CATEGORIES, DEFAULT_PRODUCTION_STAGES } from '@/domain/models';
import { ProductionProcedureService } from '@/domain/services/ProductionProcedureService';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================
// STATUS BADGE
// ============================================

const STATUS_BADGE: Record<VersionStatus, { bg: string; text: string; icon: React.ElementType }> = {
  DRAFT: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: Check },
  DEPRECATED: { bg: 'bg-slate-100', text: 'text-slate-500', icon: AlertTriangle },
};

const TASK_CATEGORIES: TaskCategory[] = [
  'HULL', 'PROPULSION', 'ELECTRICAL', 'INTERIOR', 'EXTERIOR',
  'NAVIGATION', 'SAFETY', 'FINISHING', 'TESTING', 'DELIVERY', 'OTHER',
];

const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

// ============================================
// MAIN COMPONENT
// ============================================

export function ProductionProceduresTab() {
  const [procedures, setProcedures] = useState<ProductionProcedure[]>([]);
  const [procedureVersions, setProcedureVersions] = useState<Record<string, ProductionProcedureVersion[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());

  // Create procedure dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProcedureName, setNewProcedureName] = useState('');
  const [newProcedureDescription, setNewProcedureDescription] = useState('');
  const [newProcedureCategory, setNewProcedureCategory] = useState('general');

  // Edit procedure dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<ProductionProcedure | null>(null);

  // Create version dialog
  const [showCreateVersionDialog, setShowCreateVersionDialog] = useState(false);
  const [createVersionProcedureId, setCreateVersionProcedureId] = useState<string | null>(null);
  const [newVersionLabel, setNewVersionLabel] = useState('');

  // Task set dialog
  const [showTaskSetDialog, setShowTaskSetDialog] = useState(false);
  const [taskSetVersionId, setTaskSetVersionId] = useState<string | null>(null);
  const [editingTaskSet, setEditingTaskSet] = useState<TaskSetTemplate | null>(null);
  const [taskSetName, setTaskSetName] = useState('');
  const [taskSetDescription, setTaskSetDescription] = useState('');

  // Task dialog
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskVersionId, setTaskVersionId] = useState<string | null>(null);
  const [taskSetId, setTaskSetId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('OTHER');
  const [taskStageCode, setTaskStageCode] = useState<ProductionStageCode | ''>('');
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');

  useEffect(() => {
    loadProcedures();
  }, []);

  async function loadProcedures() {
    setIsLoading(true);
    try {
      // Initialize defaults if needed (idempotent)
      const context = getDefaultAuditContext();
      await ProductionProcedureService.initializeDefaults(context);

      const procs = await ProductionProcedureService.getAllProcedures();
      setProcedures(procs);

      // Load versions for each procedure
      const versions: Record<string, ProductionProcedureVersion[]> = {};
      for (const proc of procs) {
        const data = await ProductionProcedureService.getProcedureWithVersions(proc.id);
        if (data) {
          versions[proc.id] = data.versions;
        }
      }
      setProcedureVersions(versions);
    } catch (error) {
      console.error('Failed to load procedures:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleProcedure(id: string) {
    const next = new Set(expandedProcedures);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedProcedures(next);
  }

  // ============================================
  // CREATE PROCEDURE
  // ============================================

  async function handleCreateProcedure() {
    if (!newProcedureName.trim()) return;

    const context = getDefaultAuditContext();
    const result = await ProductionProcedureService.createProcedure(
      {
        name: newProcedureName.trim(),
        description: newProcedureDescription.trim() || undefined,
        category: newProcedureCategory,
      },
      context
    );

    if (result.ok) {
      setShowCreateDialog(false);
      setNewProcedureName('');
      setNewProcedureDescription('');
      setNewProcedureCategory('general');
      await loadProcedures();
    } else {
      alert(result.error);
    }
  }

  // ============================================
  // EDIT PROCEDURE
  // ============================================

  function openEditDialog(procedure: ProductionProcedure) {
    setEditingProcedure(procedure);
    setNewProcedureName(procedure.name);
    setNewProcedureDescription(procedure.description || '');
    setNewProcedureCategory(procedure.category || 'general');
    setShowEditDialog(true);
  }

  async function handleUpdateProcedure() {
    if (!editingProcedure || !newProcedureName.trim()) return;

    const context = getDefaultAuditContext();
    const result = await ProductionProcedureService.updateProcedure(
      editingProcedure.id,
      {
        name: newProcedureName.trim(),
        description: newProcedureDescription.trim() || undefined,
        category: newProcedureCategory,
      },
      context
    );

    if (result.ok) {
      setShowEditDialog(false);
      setEditingProcedure(null);
      await loadProcedures();
    } else {
      alert(result.error);
    }
  }

  async function handleDeleteProcedure(id: string) {
    if (!confirm('Delete this procedure? This cannot be undone.')) return;

    const context = getDefaultAuditContext();
    const result = await ProductionProcedureService.deleteProcedure(id, context);

    if (result.ok) {
      await loadProcedures();
    } else {
      alert(result.error);
    }
  }

  // ============================================
  // VERSION MANAGEMENT
  // ============================================

  function openCreateVersionDialog(procedureId: string) {
    setCreateVersionProcedureId(procedureId);
    const versions = procedureVersions[procedureId] || [];
    const nextVersion = versions.length > 0
      ? `${parseInt(versions[0].versionLabel.split('.')[0] || '0') + 1}.0`
      : '1.0';
    setNewVersionLabel(nextVersion);
    setShowCreateVersionDialog(true);
  }

  async function handleCreateVersion() {
    if (!createVersionProcedureId || !newVersionLabel.trim()) return;

    const context = getDefaultAuditContext();
    const result = await ProductionProcedureService.createVersion(
      createVersionProcedureId,
      newVersionLabel.trim(),
      context
    );

    if (result.ok) {
      setShowCreateVersionDialog(false);
      setCreateVersionProcedureId(null);
      setNewVersionLabel('');
      await loadProcedures();
      // Expand the procedure to show the new version
      setExpandedProcedures((prev) => new Set([...prev, createVersionProcedureId]));
    } else {
      alert(result.error);
    }
  }

  async function handleApproveVersion(versionId: string) {
    if (!confirm('Approve this version? It will become immutable.')) return;

    const context = getDefaultAuditContext();
    const result = await ProductionProcedureService.approveVersion(versionId, context);

    if (result.ok) {
      await loadProcedures();
    } else {
      alert(result.error);
    }
  }

  // ============================================
  // TASK SET MANAGEMENT
  // ============================================

  function openAddTaskSetDialog(versionId: string) {
    setTaskSetVersionId(versionId);
    setEditingTaskSet(null);
    setTaskSetName('');
    setTaskSetDescription('');
    setShowTaskSetDialog(true);
  }

  function openEditTaskSetDialog(versionId: string, taskSet: TaskSetTemplate) {
    setTaskSetVersionId(versionId);
    setEditingTaskSet(taskSet);
    setTaskSetName(taskSet.name);
    setTaskSetDescription(taskSet.description || '');
    setShowTaskSetDialog(true);
  }

  async function handleSaveTaskSet() {
    if (!taskSetVersionId || !taskSetName.trim()) return;

    const context = getDefaultAuditContext();

    if (editingTaskSet) {
      // Update existing task set
      const result = await ProductionProcedureService.updateTaskSet(
        taskSetVersionId,
        editingTaskSet.id,
        {
          name: taskSetName.trim(),
          description: taskSetDescription.trim() || undefined,
        },
        context
      );

      if (!result.ok) {
        alert(result.error);
        return;
      }
    } else {
      // Add new task set
      const result = await ProductionProcedureService.addTaskSet(
        taskSetVersionId,
        {
          name: taskSetName.trim(),
          description: taskSetDescription.trim() || undefined,
        },
        context
      );

      if (!result.ok) {
        alert(result.error);
        return;
      }
    }

    setShowTaskSetDialog(false);
    setTaskSetVersionId(null);
    setEditingTaskSet(null);
    await loadProcedures();
  }

  async function handleRemoveTaskSet(versionId: string, taskSetId: string) {
    if (!confirm('Remove this task set?')) return;

    const context = getDefaultAuditContext();
    const result = await ProductionProcedureService.removeTaskSet(versionId, taskSetId, context);

    if (result.ok) {
      await loadProcedures();
    } else {
      alert(result.error);
    }
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================

  function openAddTaskDialog(versionId: string, taskSetId: string) {
    setTaskVersionId(versionId);
    setTaskSetId(taskSetId);
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskCategory('OTHER');
    setTaskStageCode('');
    setTaskEstimatedHours('');
    setTaskPriority('MEDIUM');
    setShowTaskDialog(true);
  }

  function openEditTaskDialog(versionId: string, taskSetId: string, task: TemplateTask) {
    setTaskVersionId(versionId);
    setTaskSetId(taskSetId);
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskCategory(task.category);
    setTaskStageCode(task.defaultStageCode || '');
    setTaskEstimatedHours(task.estimatedHours?.toString() || '');
    setTaskPriority(task.priority || 'MEDIUM');
    setShowTaskDialog(true);
  }

  async function handleSaveTask() {
    if (!taskVersionId || !taskSetId || !taskTitle.trim()) return;

    const context = getDefaultAuditContext();

    if (editingTask) {
      // Update existing task
      const result = await ProductionProcedureService.updateTemplateTask(
        taskVersionId,
        taskSetId,
        editingTask.id,
        {
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          category: taskCategory,
          defaultStageCode: taskStageCode || undefined,
          estimatedHours: taskEstimatedHours ? parseFloat(taskEstimatedHours) : undefined,
          priority: taskPriority,
        },
        context
      );

      if (!result.ok) {
        alert(result.error);
        return;
      }
    } else {
      // Add new task
      const result = await ProductionProcedureService.addTemplateTask(
        taskVersionId,
        taskSetId,
        {
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          category: taskCategory,
          defaultStageCode: taskStageCode || undefined,
          estimatedHours: taskEstimatedHours ? parseFloat(taskEstimatedHours) : undefined,
          priority: taskPriority,
        },
        context
      );

      if (!result.ok) {
        alert(result.error);
        return;
      }
    }

    setShowTaskDialog(false);
    setTaskVersionId(null);
    setTaskSetId(null);
    setEditingTask(null);
    await loadProcedures();
  }

  async function handleRemoveTask(versionId: string, taskSetId: string, taskId: string) {
    if (!confirm('Remove this task?')) return;

    const context = getDefaultAuditContext();
    const result = await ProductionProcedureService.removeTemplateTask(versionId, taskSetId, taskId, context);

    if (result.ok) {
      await loadProcedures();
    } else {
      alert(result.error);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Production Procedures</h3>
          <p className="text-sm text-slate-500">
            Define reusable task sets for NEW_BUILD projects
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Procedure
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Clock className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : procedures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No production procedures defined yet</p>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Procedure
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {procedures.map((procedure) => {
            const versions = procedureVersions[procedure.id] || [];
            const isExpanded = expandedProcedures.has(procedure.id);
            const currentVersion = versions.find((v) => v.id === procedure.currentVersionId);

            return (
              <Card key={procedure.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleProcedure(procedure.id)}>
                  <CardHeader className="cursor-pointer hover:bg-slate-50" onClick={() => toggleProcedure(procedure.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <CardTitle className="text-base">{procedure.name}</CardTitle>
                          {procedure.description && (
                            <CardDescription>{procedure.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {currentVersion && (
                          <Badge className={`${STATUS_BADGE[currentVersion.status].bg} ${STATUS_BADGE[currentVersion.status].text}`}>
                            v{currentVersion.versionLabel}
                          </Badge>
                        )}
                        <Badge variant="outline">{procedure.category || 'general'}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(procedure)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => handleDeleteProcedure(procedure.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="border-t pt-4 space-y-4">
                        {/* Versions */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-slate-700">Versions</h4>
                          <Button size="sm" variant="outline" onClick={() => openCreateVersionDialog(procedure.id)}>
                            <Plus className="h-3 w-3 mr-1" />
                            New Version
                          </Button>
                        </div>

                        {versions.length === 0 ? (
                          <p className="text-sm text-slate-500 py-4 text-center">
                            No versions yet. Create a version to add task sets.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {versions.map((version) => (
                              <VersionCard
                                key={version.id}
                                version={version}
                                onApprove={() => handleApproveVersion(version.id)}
                                onAddTaskSet={() => openAddTaskSetDialog(version.id)}
                                onEditTaskSet={(ts) => openEditTaskSetDialog(version.id, ts)}
                                onRemoveTaskSet={(tsId) => handleRemoveTaskSet(version.id, tsId)}
                                onAddTask={(tsId) => openAddTaskDialog(version.id, tsId)}
                                onEditTask={(tsId, task) => openEditTaskDialog(version.id, tsId, task)}
                                onRemoveTask={(tsId, taskId) => handleRemoveTask(version.id, tsId, taskId)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Procedure Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Production Procedure</DialogTitle>
            <DialogDescription>
              Create a new procedure to define reusable task sets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newProcedureName}
                onChange={(e) => setNewProcedureName(e.target.value)}
                placeholder="e.g., Standard Build Process"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newProcedureCategory} onValueChange={setNewProcedureCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_PROCEDURE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={newProcedureDescription}
                onChange={(e) => setNewProcedureDescription(e.target.value)}
                placeholder="Describe when this procedure should be used..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProcedure} disabled={!newProcedureName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Procedure Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Procedure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newProcedureName}
                onChange={(e) => setNewProcedureName(e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newProcedureCategory} onValueChange={setNewProcedureCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_PROCEDURE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newProcedureDescription}
                onChange={(e) => setNewProcedureDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProcedure} disabled={!newProcedureName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Version Dialog */}
      <Dialog open={showCreateVersionDialog} onOpenChange={setShowCreateVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Version</DialogTitle>
            <DialogDescription>
              Create a new draft version for this procedure
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Version Label</Label>
            <Input
              value={newVersionLabel}
              onChange={(e) => setNewVersionLabel(e.target.value)}
              placeholder="e.g., 1.0, 2.0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateVersionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={!newVersionLabel.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Set Dialog */}
      <Dialog open={showTaskSetDialog} onOpenChange={setShowTaskSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTaskSet ? 'Edit Task Set' : 'Add Task Set'}</DialogTitle>
            <DialogDescription>
              A task set is a group of related tasks that can be copied to projects
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={taskSetName}
                onChange={(e) => setTaskSetName(e.target.value)}
                placeholder="e.g., Electrical Installation Tasks"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={taskSetDescription}
                onChange={(e) => setTaskSetDescription(e.target.value)}
                placeholder="Describe this task set..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskSetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTaskSet} disabled={!taskSetName.trim()}>
              {editingTaskSet ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title..."
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Task description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={taskCategory} onValueChange={(v) => setTaskCategory(v as TaskCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0) + cat.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Stage (optional)</Label>
                <Select value={taskStageCode} onValueChange={(v) => setTaskStageCode(v as ProductionStageCode | '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {DEFAULT_PRODUCTION_STAGES.map((stage) => (
                      <SelectItem key={stage.code} value={stage.code}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Hours (optional)</Label>
                <Input
                  type="number"
                  value={taskEstimatedHours}
                  onChange={(e) => setTaskEstimatedHours(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={!taskTitle.trim()}>
              {editingTask ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// VERSION CARD
// ============================================

interface VersionCardProps {
  version: ProductionProcedureVersion;
  onApprove: () => void;
  onAddTaskSet: () => void;
  onEditTaskSet: (taskSet: TaskSetTemplate) => void;
  onRemoveTaskSet: (taskSetId: string) => void;
  onAddTask: (taskSetId: string) => void;
  onEditTask: (taskSetId: string, task: TemplateTask) => void;
  onRemoveTask: (taskSetId: string, taskId: string) => void;
}

function VersionCard({
  version,
  onApprove,
  onAddTaskSet,
  onEditTaskSet,
  onRemoveTaskSet,
  onAddTask,
  onEditTask,
  onRemoveTask,
}: VersionCardProps) {
  const [expandedTaskSets, setExpandedTaskSets] = useState<Set<string>>(new Set());
  const statusInfo = STATUS_BADGE[version.status];
  const StatusIcon = statusInfo.icon;
  const isDraft = version.status === 'DRAFT';

  function toggleTaskSet(id: string) {
    const next = new Set(expandedTaskSets);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedTaskSets(next);
  }

  const totalTasks = version.taskSets.reduce((sum, ts) => sum + ts.tasks.length, 0);

  return (
    <div className={`border rounded-lg p-4 ${version.status === 'APPROVED' ? 'bg-green-50/30 border-green-200' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={`${statusInfo.bg} ${statusInfo.text}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            v{version.versionLabel}
          </Badge>
          <span className="text-sm text-slate-500">
            {version.taskSets.length} task set(s) - {totalTasks} task(s)
          </span>
          {version.status === 'APPROVED' && (
            <Lock className="h-4 w-4 text-green-600" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <Button size="sm" variant="outline" onClick={onAddTaskSet}>
                <Plus className="h-3 w-3 mr-1" />
                Add Task Set
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300"
                onClick={onApprove}
                disabled={version.taskSets.length === 0 || totalTasks === 0}
              >
                <FileCheck className="h-3 w-3 mr-1" />
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Task Sets */}
      {version.taskSets.length > 0 && (
        <div className="space-y-2">
          {version.taskSets.map((taskSet) => {
            const isExpanded = expandedTaskSets.has(taskSet.id);

            return (
              <div key={taskSet.id} className="border rounded bg-white">
                <div
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleTaskSet(taskSet.id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="font-medium text-sm">{taskSet.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {taskSet.tasks.length} task(s)
                    </Badge>
                  </div>
                  {isDraft && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => onEditTaskSet(taskSet)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => onRemoveTaskSet(taskSet.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t p-3">
                    {taskSet.description && (
                      <p className="text-sm text-slate-500 mb-3">{taskSet.description}</p>
                    )}

                    {taskSet.tasks.length === 0 ? (
                      <p className="text-sm text-slate-400 py-2 text-center">No tasks in this set</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Est.</TableHead>
                            {isDraft && <TableHead className="w-16"></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taskSet.tasks.sort((a, b) => a.order - b.order).map((task) => (
                            <TableRow key={task.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{task.title}</p>
                                  {task.description && (
                                    <p className="text-xs text-slate-500">{task.description}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {task.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {task.defaultStageCode || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {task.estimatedHours ? `${task.estimatedHours}h` : '-'}
                              </TableCell>
                              {isDraft && (
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => onEditTask(taskSet.id, task)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600"
                                      onClick={() => onRemoveTask(taskSet.id, task.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {isDraft && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => onAddTask(taskSet.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Task
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
