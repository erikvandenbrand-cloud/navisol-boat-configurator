'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  MessageSquare,
  Image,
  Plus,
  ChevronDown,
  ChevronUp,
  Send,
  Trash2,
  X,
  ClipboardList,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Edit,
  Eye,
  Tag,
  FileStack,
  Calendar,
} from 'lucide-react';
import type {
  Project,
  ProductionStage,
  ProductionStageStatus,
  ProductionComment,
  ProductionPhoto,
  ProductionSummary,
  ProjectTask,
  CreateTaskInput,
  TaskCategory,
  TaskStatus,
  ProductionObservation,
} from '@/domain/models';
import { PRODUCTION_STAGE_STATUS_LABELS, PRODUCTION_STAGE_STATUS_COLORS } from '@/domain/models';
import { ProductionService, TaskService } from '@/domain/services';
import { useAuth, PermissionGuard } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TaskStatusBadge, TaskPriorityBadge } from '@/v4/components/StatusBadge';
import { ArticleAttachmentsButton } from '@/v4/components/ArticleAttachmentsViewer';
import { AddFromTaskSetDialog } from '@/v4/components/AddFromTaskSetDialog';

// ============================================
// TYPES
// ============================================

interface ProductionTabProps {
  project: Project;
  onRefresh: () => Promise<void>;
}

interface StageTaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  progressPercent: number;
}

// ============================================
// STATUS ICON
// ============================================

function StageStatusIcon({ status }: { status: ProductionStageStatus }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'IN_PROGRESS':
      return <Play className="h-5 w-5 text-blue-600" />;
    case 'BLOCKED':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    default:
      return <Circle className="h-5 w-5 text-slate-400" />;
  }
}

// Task categories for select
const TASK_CATEGORIES: TaskCategory[] = [
  'HULL', 'PROPULSION', 'ELECTRICAL', 'INTERIOR', 'EXTERIOR',
  'NAVIGATION', 'SAFETY', 'FINISHING', 'TESTING', 'DELIVERY', 'OTHER',
];

// Predefined tag suggestions for production feedback
const OBSERVATION_TAG_SUGGESTIONS = [
  'quality',
  'defect',
  'delay',
  'material',
  'safety',
  'progress',
  'issue',
  'resolved',
];

// ============================================
// PRODUCTION TAB COMPONENT
// ============================================

export function ProductionTab({ project, onRefresh }: ProductionTabProps) {
  const { getAuditContext, can } = useAuth();
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoTags, setPhotoTags] = useState('');
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [stageTasks, setStageTasks] = useState<Record<string, ProjectTask[]>>({});
  const [stageTaskSummaries, setStageTaskSummaries] = useState<Record<string, StageTaskSummary>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Task creation dialog
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [createTaskStageId, setCreateTaskStageId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('OTHER');
  const [newTaskEstimatedHours, setNewTaskEstimatedHours] = useState('');
  const [newTaskArticleVersionId, setNewTaskArticleVersionId] = useState<string>('');

  // Unassigned tasks and bulk assign
  const [unassignedTasks, setUnassignedTasks] = useState<ProjectTask[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [bulkAssignStageId, setBulkAssignStageId] = useState<string>('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');

  // Production Feedback / Observations
  const [observations, setObservations] = useState<ProductionObservation[]>([]);
  const [newObservationText, setNewObservationText] = useState('');
  const [newObservationTags, setNewObservationTags] = useState('');
  const [editingObservationId, setEditingObservationId] = useState<string | null>(null);
  const [editObservationText, setEditObservationText] = useState('');
  const [editObservationTags, setEditObservationTags] = useState('');

  // Add from Task Set dialog (NEW_BUILD only)
  const [showAddFromTaskSetDialog, setShowAddFromTaskSetDialog] = useState(false);

  const stages = project.productionStages || [];
  const isNewBuildProject = project.type === 'NEW_BUILD';
  const canUpdate = can('production:update');
  const canComment = can('production:comment');
  const canPhoto = can('production:photo');
  const canManageTasks = can('task:create') && can('task:update');

  // Check if project is in production and not closed
  const isInProduction = stages.length > 0 || project.status === 'IN_PRODUCTION';
  const isProjectClosed = project.status === 'CLOSED';
  const canManageObservations = can('production:comment') && !isProjectClosed;

  // Load summary, unassigned tasks, and observations on mount
  useEffect(() => {
    ProductionService.getSummary(project.id).then(setSummary);
    loadUnassignedTasks();
    loadObservations();
  }, [project.id]);

  // Load unassigned tasks
  const loadUnassignedTasks = async () => {
    const tasks = await TaskService.getUnassignedTasks(project.id);
    setUnassignedTasks(tasks);
  };

  // Load observations
  const loadObservations = async () => {
    const obs = await ProductionService.getObservations(project.id);
    setObservations(obs);
  };

  // Toggle stage expansion and load tasks
  const toggleStage = async (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
      await loadStageTasks(stageId);
    }
    setExpandedStages(newExpanded);
  };

  // Load tasks for a stage
  const loadStageTasks = async (stageId: string) => {
    const [tasks, taskSummary] = await Promise.all([
      ProductionService.getTasksForStage(project.id, stageId),
      ProductionService.getStageTaskSummary(project.id, stageId),
    ]);
    setStageTasks((prev) => ({ ...prev, [stageId]: tasks }));
    setStageTaskSummaries((prev) => ({ ...prev, [stageId]: taskSummary }));
  };

  // Refresh all expanded stages and unassigned tasks
  const refreshExpandedStages = async () => {
    for (const stageId of expandedStages) {
      await loadStageTasks(stageId);
    }
    const newSummary = await ProductionService.getSummary(project.id);
    setSummary(newSummary);
    await loadUnassignedTasks();
    await loadObservations();
  };

  // Update stage status
  const handleUpdateStatus = async (stageId: string, status: ProductionStageStatus) => {
    setIsLoading(true);
    const result = await ProductionService.updateStageProgress(
      project.id,
      stageId,
      { status },
      getAuditContext()
    );
    if (result.ok) {
      await onRefresh();
      await refreshExpandedStages();
    }
    setIsLoading(false);
  };

  // Update stage progress (manual)
  const handleUpdateProgress = async (stageId: string, progress: number) => {
    const result = await ProductionService.updateStageProgress(
      project.id,
      stageId,
      { progressPercent: progress },
      getAuditContext()
    );
    if (result.ok) {
      await onRefresh();
    }
  };

  // Toggle auto progress from tasks
  const handleToggleAutoProgress = async (stageId: string, enabled: boolean) => {
    const result = await ProductionService.toggleAutoProgress(
      project.id,
      stageId,
      enabled,
      getAuditContext()
    );
    if (result.ok) {
      await onRefresh();
      await loadStageTasks(stageId);
    }
  };

  // Update planned dates (informational only)
  const handleUpdatePlannedDates = async (
    stageId: string,
    plannedStartDate: string | undefined,
    plannedEndDate: string | undefined
  ) => {
    const result = await ProductionService.updateStageProgress(
      project.id,
      stageId,
      {
        plannedStartDate: plannedStartDate || undefined,
        plannedEndDate: plannedEndDate || undefined,
      },
      getAuditContext()
    );
    if (result.ok) {
      await onRefresh();
    }
  };

  // Add comment
  const handleAddComment = async (stageId: string) => {
    const content = commentText[stageId]?.trim();
    if (!content) return;

    const result = await ProductionService.addComment(
      project.id,
      stageId,
      { content },
      getAuditContext()
    );
    if (result.ok) {
      setCommentText((prev) => ({ ...prev, [stageId]: '' }));
      await onRefresh();
    }
  };

  // Delete comment
  const handleDeleteComment = async (stageId: string, commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    const result = await ProductionService.deleteComment(
      project.id,
      stageId,
      commentId,
      getAuditContext()
    );
    if (result.ok) {
      await onRefresh();
    }
  };

  // Open photo dialog
  const openPhotoDialog = (stageId: string) => {
    setSelectedStageId(stageId);
    setPhotoCaption('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoTags('');
    setShowPhotoDialog(true);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload photo
  const handleUploadPhoto = async () => {
    if (!selectedStageId || !photoPreview) return;

    const tags = photoTags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

    const result = await ProductionService.addPhoto(
      project.id,
      selectedStageId,
      { caption: photoCaption, dataUrl: photoPreview, tags },
      getAuditContext()
    );
    if (result.ok) {
      setShowPhotoDialog(false);
      await onRefresh();
    }
  };

  // Delete photo
  const handleDeletePhoto = async (stageId: string, photoId: string) => {
    if (!confirm('Delete this photo?')) return;
    const result = await ProductionService.deletePhoto(
      project.id,
      stageId,
      photoId,
      getAuditContext()
    );
    if (result.ok) {
      await onRefresh();
    }
  };

  // Open create task dialog
  const openCreateTaskDialog = (stageId: string) => {
    setCreateTaskStageId(stageId);
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskCategory('OTHER');
    setNewTaskEstimatedHours('');
    setNewTaskArticleVersionId('');
    setShowCreateTaskDialog(true);
  };

  // Create task for stage
  const handleCreateTask = async () => {
    if (!createTaskStageId || !newTaskTitle.trim()) return;

    const input: CreateTaskInput = {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      category: newTaskCategory,
      stageId: createTaskStageId,
      estimatedHours: newTaskEstimatedHours ? parseFloat(newTaskEstimatedHours) : undefined,
      articleVersionId: newTaskArticleVersionId || undefined,
    };

    const result = await TaskService.createTask(project.id, input, getAuditContext());
    if (result.ok) {
      setShowCreateTaskDialog(false);
      await onRefresh();
      await loadStageTasks(createTaskStageId);
    }
  };

  // Update task status (quick action)
  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus, stageId: string) => {
    const result = await TaskService.updateTaskStatus(project.id, taskId, status, getAuditContext());
    if (result.ok) {
      await onRefresh();
      await loadStageTasks(stageId);
    }
  };

  // Toggle task selection for bulk assign
  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  // Select all unassigned tasks
  const selectAllUnassigned = () => {
    if (selectedTaskIds.size === unassignedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(unassignedTasks.map((t) => t.id)));
    }
  };

  // Open bulk assign dialog
  const openBulkAssignDialog = () => {
    if (selectedTaskIds.size === 0) return;
    setBulkAssignStageId(stages[0]?.id || '');
    setBulkAssignee('');
    setBulkDueDate('');
    setShowBulkAssignDialog(true);
  };

  // Execute bulk assign
  const handleBulkAssign = async () => {
    if (!bulkAssignStageId || selectedTaskIds.size === 0) return;

    setIsLoading(true);
    const result = await TaskService.bulkAssignToStage(
      project.id,
      Array.from(selectedTaskIds),
      bulkAssignStageId,
      {
        assignedTo: bulkAssignee || undefined,
        dueDate: bulkDueDate || undefined,
      },
      getAuditContext()
    );

    if (result.ok) {
      setShowBulkAssignDialog(false);
      setSelectedTaskIds(new Set());
      await onRefresh();
      await refreshExpandedStages();
    }
    setIsLoading(false);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date/time helper for observations
  const formatObservationDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format planned dates for stage header display
  // Returns null if neither date exists, otherwise shows "Planned: start → end" with graceful handling
  const formatPlannedDatesDisplay = (plannedStartDate?: string, plannedEndDate?: string): string | null => {
    if (!plannedStartDate && !plannedEndDate) return null;

    const formatShortDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    };

    if (plannedStartDate && plannedEndDate) {
      return `${formatShortDate(plannedStartDate)} → ${formatShortDate(plannedEndDate)}`;
    } else if (plannedStartDate) {
      return `From ${formatShortDate(plannedStartDate)}`;
    } else if (plannedEndDate) {
      return `Until ${formatShortDate(plannedEndDate)}`;
    }
    return null;
  };

  // Add observation
  const handleAddObservation = async () => {
    if (!newObservationText.trim()) return;

    const tags = newObservationTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const result = await ProductionService.addObservation(
      project.id,
      { text: newObservationText.trim(), tags },
      getAuditContext()
    );

    if (result.ok) {
      setNewObservationText('');
      setNewObservationTags('');
      await loadObservations();
      await onRefresh();
    }
  };

  // Start editing observation
  const handleStartEditObservation = (obs: ProductionObservation) => {
    setEditingObservationId(obs.id);
    setEditObservationText(obs.text);
    setEditObservationTags(obs.tags.join(', '));
  };

  // Save edited observation
  const handleSaveObservation = async () => {
    if (!editingObservationId || !editObservationText.trim()) return;

    const tags = editObservationTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const result = await ProductionService.updateObservation(
      project.id,
      editingObservationId,
      { text: editObservationText.trim(), tags },
      getAuditContext()
    );

    if (result.ok) {
      setEditingObservationId(null);
      setEditObservationText('');
      setEditObservationTags('');
      await loadObservations();
      await onRefresh();
    }
  };

  // Cancel editing
  const handleCancelEditObservation = () => {
    setEditingObservationId(null);
    setEditObservationText('');
    setEditObservationTags('');
  };

  // Delete observation
  const handleDeleteObservation = async (observationId: string) => {
    if (!confirm('Delete this observation?')) return;

    const result = await ProductionService.deleteObservation(
      project.id,
      observationId,
      getAuditContext()
    );

    if (result.ok) {
      await loadObservations();
      await onRefresh();
    }
  };

  // No stages yet
  if (stages.length === 0) {
    const isInProduction = project.status === 'IN_PRODUCTION';
    const isOrderConfirmed = project.status === 'ORDER_CONFIRMED';
    const isOfferSent = project.status === 'OFFER_SENT';
    const hasAcceptedQuote = project.quotes?.some((q) => q.status === 'ACCEPTED');

    // Determine what step the user needs to take
    let statusMessage = '';
    let actionHint = '';

    if (isInProduction) {
      statusMessage = 'Initializing production...';
      actionHint = 'Production stages are being set up.';
    } else if (isOrderConfirmed) {
      statusMessage = 'Order confirmed - Ready to start production';
      actionHint = 'Click "Start Production" in the header to initialize production stages.';
    } else if (isOfferSent && hasAcceptedQuote) {
      statusMessage = 'Quote accepted - Confirm the order';
      actionHint = 'Click "Confirm Order" in the header to freeze the configuration, then start production.';
    } else if (isOfferSent) {
      statusMessage = 'Waiting for quote acceptance';
      actionHint = 'Once the client accepts the quote, you can confirm the order and start production.';
    } else {
      statusMessage = 'Not in production yet';
      actionHint = 'Complete the quote workflow to reach production: Create Quote → Send → Accept → Confirm Order → Start Production.';
    }

    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${isOrderConfirmed ? 'bg-teal-100' : 'bg-slate-100'}`}>
            <Clock className={`h-7 w-7 ${isOrderConfirmed ? 'text-teal-600' : 'text-slate-400'}`} />
          </div>
          <h4 className="text-base font-medium text-slate-900 mb-1">
            {statusMessage}
          </h4>
          <p className="text-sm text-slate-500 max-w-sm">
            {actionHint}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Production Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500">Overall Progress</p>
              <p className="text-2xl font-bold">{summary.overallProgress}%</p>
              <Progress value={summary.overallProgress} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">
                {summary.completedStages}/{summary.totalStages}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-blue-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-700">{summary.inProgressStages}</p>
            </CardContent>
          </Card>
          <Card className={summary.blockedStages > 0 ? 'bg-red-50' : 'bg-slate-50'}>
            <CardContent className="pt-4 pb-3">
              <p className={`text-xs ${summary.blockedStages > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                Blocked
              </p>
              <p className={`text-2xl font-bold ${summary.blockedStages > 0 ? 'text-red-700' : ''}`}>
                {summary.blockedStages}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-amber-600">Est. Days Left</p>
              <p className="text-2xl font-bold text-amber-700">{summary.estimatedDaysRemaining}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stages Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Stages Overview
          </CardTitle>
          <CardDescription>Summary of all production stages with planned dates</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead>Planned Start</TableHead>
                <TableHead>Planned End</TableHead>
                <TableHead className="text-right">Est. Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages
                .sort((a, b) => a.order - b.order)
                .map((stage) => {
                  const statusColors = PRODUCTION_STAGE_STATUS_COLORS[stage.status];
                  return (
                    <TableRow key={stage.id}>
                      <TableCell className="font-medium">{stage.name}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                          {PRODUCTION_STAGE_STATUS_LABELS[stage.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{stage.progressPercent}%</TableCell>
                      <TableCell>
                        {stage.plannedStartDate ? (
                          <span className="text-sm text-slate-700">
                            {new Date(stage.plannedStartDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stage.plannedEndDate ? (
                          <span className="text-sm text-slate-700">
                            {new Date(stage.plannedEndDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {stage.estimatedDays}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Production Stages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Production Stages</CardTitle>
            <CardDescription>Track progress through each production phase</CardDescription>
          </div>
          {/* Add from Task Set - NEW_BUILD only */}
          {isNewBuildProject && canManageTasks && (
            <Button variant="outline" onClick={() => setShowAddFromTaskSetDialog(true)}>
              <FileStack className="h-4 w-4 mr-2" />
              Add from Template
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {stages
            .sort((a, b) => a.order - b.order)
            .map((stage) => {
              const isExpanded = expandedStages.has(stage.id);
              const statusColors = PRODUCTION_STAGE_STATUS_COLORS[stage.status];
              const tasks = stageTasks[stage.id] || [];
              const taskSummary = stageTaskSummaries[stage.id];

              return (
                <Collapsible
                  key={stage.id}
                  open={isExpanded}
                  onOpenChange={() => toggleStage(stage.id)}
                >
                  <div
                    className={`border rounded-lg transition-colors ${
                      stage.status === 'BLOCKED' ? 'border-red-200 bg-red-50/50' : ''
                    }`}
                  >
                    {/* Stage Header */}
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50/50">
                        <StageStatusIcon status={stage.status} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.name}</span>
                            <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                              {PRODUCTION_STAGE_STATUS_LABELS[stage.status]}
                            </Badge>
                            {stage.autoProgressFromTasks && (
                              <Badge variant="outline" className="text-xs">
                                <ClipboardList className="h-3 w-3 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span>Est: {stage.estimatedDays} days</span>
                            {stage.actualDays !== undefined && (
                              <span>Actual: {stage.actualDays} days</span>
                            )}
                            {/* Planned dates display (read-only) */}
                            {formatPlannedDatesDisplay(stage.plannedStartDate, stage.plannedEndDate) && (
                              <span className="flex items-center gap-1 text-teal-600">
                                <Calendar className="h-3 w-3" />
                                {formatPlannedDatesDisplay(stage.plannedStartDate, stage.plannedEndDate)}
                              </span>
                            )}
                            {taskSummary && taskSummary.total > 0 && (
                              <span className="flex items-center gap-1">
                                <ClipboardList className="h-3 w-3" />
                                {taskSummary.completed}/{taskSummary.total} tasks
                              </span>
                            )}
                            {stage.comments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {stage.comments.length}
                              </span>
                            )}
                            {stage.photos.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Image className="h-3 w-3" />
                                {stage.photos.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="w-32 hidden md:block">
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                            <span>Progress</span>
                            <span>{stage.progressPercent}%</span>
                          </div>
                          <Progress value={stage.progressPercent} className="h-2" />
                        </div>

                        {/* Actions */}
                        <PermissionGuard permission="production:update">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {stage.status === 'NOT_STARTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(stage.id, 'IN_PROGRESS')}
                                disabled={isLoading}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Start
                              </Button>
                            )}
                            {stage.status === 'IN_PROGRESS' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(stage.id, 'BLOCKED')}
                                  disabled={isLoading}
                                  className="text-red-600"
                                >
                                  <Pause className="h-3 w-3 mr-1" />
                                  Block
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(stage.id, 'COMPLETED')}
                                  disabled={isLoading}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Button>
                              </>
                            )}
                            {stage.status === 'BLOCKED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(stage.id, 'IN_PROGRESS')}
                                disabled={isLoading}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Unblock
                              </Button>
                            )}
                          </div>
                        </PermissionGuard>

                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </CollapsibleTrigger>

                    {/* Expanded Content */}
                    <CollapsibleContent>
                      <div className="border-t px-4 py-4 space-y-4">
                        {/* Progress Controls */}
                        {canUpdate && (
                          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`auto-progress-${stage.id}`}
                                checked={stage.autoProgressFromTasks}
                                onCheckedChange={(checked) => handleToggleAutoProgress(stage.id, checked)}
                              />
                              <Label htmlFor={`auto-progress-${stage.id}`} className="text-sm">
                                Auto progress from tasks
                              </Label>
                            </div>

                            {!stage.autoProgressFromTasks && stage.status === 'IN_PROGRESS' && (
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm text-slate-600">Manual:</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={stage.progressPercent}
                                  onChange={(e) => handleUpdateProgress(stage.id, parseInt(e.target.value))}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-12">{stage.progressPercent}%</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Planned Dates (informational only) */}
                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`planned-start-${stage.id}`} className="text-sm text-slate-600 whitespace-nowrap">
                              Planned Start
                            </Label>
                            <Input
                              id={`planned-start-${stage.id}`}
                              type="date"
                              value={stage.plannedStartDate || ''}
                              onChange={(e) => handleUpdatePlannedDates(stage.id, e.target.value, stage.plannedEndDate)}
                              disabled={isProjectClosed || !canUpdate}
                              className="w-36 h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`planned-end-${stage.id}`} className="text-sm text-slate-600 whitespace-nowrap">
                              Planned End
                            </Label>
                            <Input
                              id={`planned-end-${stage.id}`}
                              type="date"
                              value={stage.plannedEndDate || ''}
                              onChange={(e) => handleUpdatePlannedDates(stage.id, stage.plannedStartDate, e.target.value)}
                              disabled={isProjectClosed || !canUpdate}
                              className="w-36 h-8 text-sm"
                            />
                          </div>
                          <span className="text-xs text-slate-400">(informational only)</span>
                        </div>

                        {/* Tasks Section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              <ClipboardList className="h-4 w-4" />
                              Tasks
                              {taskSummary && (
                                <span className="text-xs text-slate-500">
                                  ({taskSummary.completed}/{taskSummary.total} completed)
                                </span>
                              )}
                            </h5>
                            <PermissionGuard permission="task:create">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCreateTaskDialog(stage.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Task
                              </Button>
                            </PermissionGuard>
                          </div>

                          {tasks.length === 0 ? (
                            <p className="text-sm text-slate-500 py-2">No tasks assigned to this stage</p>
                          ) : (
                            <div className="space-y-2">
                              {tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between p-3 bg-slate-50 rounded-md"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-xs text-slate-400 font-mono">#{task.taskNumber}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : ''}`}>
                                        {task.title}
                                      </p>
                                      {task.estimatedHours && (
                                        <p className="text-xs text-slate-500">{task.estimatedHours}h estimated</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <TaskStatusBadge status={task.status} />
                                    <TaskPriorityBadge priority={task.priority} />

                                    {/* Article Attachments (read-only for shop floor) */}
                                    {task.articleVersionId && (
                                      <ArticleAttachmentsButton
                                        articleVersionId={task.articleVersionId}
                                        projectId={project.id}
                                      />
                                    )}

                                    {/* Quick Status Actions */}
                                    <PermissionGuard permission="task:update">
                                      <div className="flex items-center gap-1">
                                        {task.status === 'TODO' && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS', stage.id)}
                                            title="Start"
                                          >
                                            <Play className="h-3 w-3 text-blue-600" />
                                          </Button>
                                        )}
                                        {task.status === 'IN_PROGRESS' && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED', stage.id)}
                                            title="Complete"
                                          >
                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                          </Button>
                                        )}
                                        {task.status === 'ON_HOLD' && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS', stage.id)}
                                            title="Resume"
                                          >
                                            <Play className="h-3 w-3 text-blue-600" />
                                          </Button>
                                        )}
                                      </div>
                                    </PermissionGuard>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Photos */}
                        {stage.photos.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-slate-700 mb-2">Photos</h5>
                            <div className="grid grid-cols-4 gap-2">
                              {stage.photos.map((photo) => (
                                <div key={photo.id} className="relative group">
                                  <img
                                    src={photo.dataUrl}
                                    alt={photo.caption || 'Production photo'}
                                    className="w-full h-24 object-cover rounded-md"
                                  />
                                  {canPhoto && (
                                    <button
                                      onClick={() => handleDeletePhoto(stage.id, photo.id)}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                  <div className="mt-1">
                                    {photo.caption && (
                                      <p className="text-xs text-slate-500 truncate">{photo.caption}</p>
                                    )}
                                    {photo.tags && photo.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {photo.tags.map((tag, i) => (
                                          <span key={i} className="text-[10px] bg-slate-200 px-1 rounded">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Photo Button */}
                        {canPhoto && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPhotoDialog(stage.id)}
                          >
                            <Image className="h-4 w-4 mr-2" />
                            Add Photo
                          </Button>
                        )}

                        {/* Comments */}
                        <div>
                          <h5 className="text-sm font-medium text-slate-700 mb-2">Comments</h5>
                          {stage.comments.length === 0 ? (
                            <p className="text-sm text-slate-500">No comments yet</p>
                          ) : (
                            <div className="space-y-2 mb-3">
                              {stage.comments.map((comment) => (
                                <div key={comment.id} className="p-3 bg-slate-50 rounded-md">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-700">
                                      {comment.userName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500">
                                        {formatDateTime(comment.createdAt)}
                                      </span>
                                      {canComment && (
                                        <button
                                          onClick={() => handleDeleteComment(stage.id, comment.id)}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-600">{comment.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Comment */}
                          {canComment && (
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Add a comment..."
                                value={commentText[stage.id] || ''}
                                onChange={(e) =>
                                  setCommentText((prev) => ({ ...prev, [stage.id]: e.target.value }))
                                }
                                className="flex-1 min-h-[60px]"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(stage.id)}
                                disabled={!commentText[stage.id]?.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
        </CardContent>
      </Card>

      {/* Unassigned Tasks Section */}
      {unassignedTasks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-amber-600" />
                Unassigned Tasks
                <Badge variant="secondary">{unassignedTasks.length}</Badge>
              </CardTitle>
              <CardDescription>
                Tasks not yet assigned to a production stage
              </CardDescription>
            </div>
            <PermissionGuard permission="task:update">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAllUnassigned}
                  disabled={unassignedTasks.length === 0}
                >
                  {selectedTaskIds.size === unassignedTasks.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  size="sm"
                  onClick={openBulkAssignDialog}
                  disabled={selectedTaskIds.size === 0}
                >
                  Assign to Stage ({selectedTaskIds.size})
                </Button>
              </div>
            </PermissionGuard>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedTasks.map((task) => {
                const isSelected = selectedTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                      isSelected ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-transparent'
                    }`}
                  >
                    <PermissionGuard permission="task:update">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </PermissionGuard>

                    <span className="text-xs text-slate-400 font-mono">#{task.taskNumber}</span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-500 truncate">{task.description}</p>
                      )}
                    </div>

                    <Badge variant="outline" className="text-xs">
                      {task.category}
                    </Badge>
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />

                    {/* Article Attachments (read-only for shop floor) */}
                    {task.articleVersionId && (
                      <ArticleAttachmentsButton
                        articleVersionId={task.articleVersionId}
                        projectId={project.id}
                      />
                    )}

                    {task.estimatedHours && (
                      <span className="text-xs text-slate-500">{task.estimatedHours}h</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Feedback Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Production Feedback
            {observations.length > 0 && (
              <Badge variant="secondary" className="ml-1">{observations.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Shop floor feedback, observations, and issues during production
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {observations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No feedback or observations yet</p>
              <p className="text-xs text-slate-400 mt-1">Add notes about quality, issues, or progress</p>
            </div>
          ) : (
            <div className="space-y-3 mb-5">
              {observations.map((obs) =>
                editingObservationId === obs.id ? (
                  /* Edit Mode */
                  <div key={obs.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-700">
                          {obs.createdByName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-800">
                          {obs.createdByName}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          {formatObservationDateTime(obs.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Textarea
                      value={editObservationText}
                      onChange={(e) => setEditObservationText(e.target.value)}
                      className="mb-3 bg-white"
                      rows={3}
                    />
                    <div className="mb-3">
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tags</label>
                      <Input
                        value={editObservationTags}
                        onChange={(e) => setEditObservationTags(e.target.value)}
                        placeholder="quality, issue, resolved..."
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {OBSERVATION_TAG_SUGGESTIONS.map((tag) => {
                        const currentTags = editObservationTags.split(',').map((t) => t.trim().toLowerCase());
                        const isActive = currentTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isActive) return;
                              const newTags = editObservationTags.trim()
                                ? `${editObservationTags}, ${tag}`
                                : tag;
                              setEditObservationTags(newTags);
                            }}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              isActive
                                ? 'bg-blue-100 border-blue-300 text-blue-700 cursor-default'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            {isActive ? tag : `+ ${tag}`}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-blue-200">
                      <Button size="sm" onClick={handleSaveObservation} disabled={!editObservationText.trim()}>
                        Save Changes
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEditObservation}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div key={obs.id} className="p-4 bg-slate-50 rounded-lg border-l-4 border-l-blue-400 border border-slate-200">
                    {/* Header: Author + Timestamp + Actions */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-slate-600">
                            {obs.createdByName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-800">
                            {obs.createdByName}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {formatObservationDateTime(obs.createdAt)}
                          </span>
                        </div>
                      </div>
                      {canManageObservations && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditObservation(obs)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteObservation(obs.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm text-slate-700 leading-relaxed pl-9">{obs.text}</p>

                    {/* Tags */}
                    {obs.tags && obs.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pl-9">
                        {obs.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* Add New Observation Form */}
          {canManageObservations && (
            <div className="border-t pt-4 mt-4">
              <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Feedback
              </h5>
              <div className="space-y-3">
                <Textarea
                  placeholder="What did you observe? Note quality issues, progress updates, or anything relevant..."
                  value={newObservationText}
                  onChange={(e) => setNewObservationText(e.target.value)}
                  className="min-h-[80px]"
                  rows={3}
                />
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tags (optional)</label>
                  <Input
                    placeholder="quality, issue, resolved..."
                    value={newObservationTags}
                    onChange={(e) => setNewObservationTags(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-slate-500 mr-1 py-1">Quick add:</span>
                  {OBSERVATION_TAG_SUGGESTIONS.map((tag) => {
                    const currentTags = newObservationTags.split(',').map((t) => t.trim().toLowerCase());
                    const isActive = currentTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isActive) return;
                          const newTags = newObservationTags.trim()
                            ? `${newObservationTags}, ${tag}`
                            : tag;
                          setNewObservationTags(newTags);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          isActive
                            ? 'bg-blue-100 border-blue-300 text-blue-700 cursor-default'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        {isActive ? tag : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleAddObservation}
                    disabled={!newObservationText.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Add Feedback
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tasks to Stage</DialogTitle>
            <DialogDescription>
              Assign {selectedTaskIds.size} selected task(s) to a production stage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Production Stage</Label>
              <Select value={bulkAssignStageId} onValueChange={setBulkAssignStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assignee (optional)</Label>
              <Input
                placeholder="Enter assignee name..."
                value={bulkAssignee}
                onChange={(e) => setBulkAssignee(e.target.value)}
              />
            </div>

            <div>
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssign} disabled={!bulkAssignStageId || isLoading}>
              {isLoading ? 'Assigning...' : `Assign ${selectedTaskIds.size} Task(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo</DialogTitle>
            <DialogDescription>Upload a photo to document production progress</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {photoPreview && (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-md"
                />
              </div>
            )}

            <div>
              <Label>Caption (optional)</Label>
              <Input
                placeholder="Describe this photo..."
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
              />
            </div>

            <div>
              <Label>Tags (optional, comma-separated)</Label>
              <Input
                placeholder="e.g., quality, progress, issue"
                value={photoTags}
                onChange={(e) => setPhotoTags(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhotoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadPhoto} disabled={!photoPreview}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to this production stage</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Task description..."
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newTaskCategory} onValueChange={(v) => setNewTaskCategory(v as TaskCategory)}>
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
                <Label>Estimated Hours (optional)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newTaskEstimatedHours}
                  onChange={(e) => setNewTaskEstimatedHours(e.target.value)}
                />
              </div>
            </div>

            {/* Link to Article (for accessing attachments on shop floor) */}
            {project.configuration.isFrozen && project.configuration.items.some(item => item.articleVersionId) && (
              <div>
                <Label>Link to Article (optional)</Label>
                <Select value={newTaskArticleVersionId} onValueChange={setNewTaskArticleVersionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select article for attachments..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {project.configuration.items
                      .filter(item => item.articleVersionId)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.articleVersionId!}>
                          {item.articleNumber ? `${item.articleNumber} - ` : ''}{item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Linking to an article allows shop floor users to access its attachments
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add from Task Set Dialog (NEW_BUILD only) */}
      {isNewBuildProject && (
        <AddFromTaskSetDialog
          open={showAddFromTaskSetDialog}
          onOpenChange={setShowAddFromTaskSetDialog}
          projectId={project.id}
          onSuccess={async () => {
            await onRefresh();
            await refreshExpandedStages();
          }}
        />
      )}
    </div>
  );
}
