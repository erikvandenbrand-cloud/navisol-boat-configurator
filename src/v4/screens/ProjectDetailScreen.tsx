'use client';

import { useState, useEffect } from 'react';
import {
  Ship,
  ArrowLeft,
  User,
  Calendar,
  FileText,
  Package,
  Clock,
  Settings,
  History,
  ChevronRight,
  Plus,
  Edit,
  Send,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  X,
  Copy,
  FileEdit,
  DollarSign,
  ArrowUpDown,
  Download,
  RefreshCw,
  BarChart3,
  ClipboardList,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Archive,
  PackageCheck,
  Eye,
  Book,
  Paperclip,
  BookOpen,
  Info,
} from 'lucide-react';
import type { Project, Client, ProjectQuote, ConfigurationItem, ProjectStatus, ProjectType, AddConfigurationItemInput, AmendmentType, ProjectAmendment, ProjectTask, CreateTaskInput, TaskStatus } from '@/domain/models';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import { ProjectService, QuoteService, ConfigurationService, DocumentService, AmendmentService, BOMService, TaskService, DeliveryPackService, generateQuotePDF, openPDFWindow, type QuotePDFData, type QuoteCategoryGroup, type QuoteCategoryItem } from '@/domain/services';
import { StatusMachine } from '@/domain/workflow';
import { getAuditContext } from '@/domain/auth';
import { AuditRepository } from '@/data/repositories';
import type { AuditEntry } from '@/domain/models';
import { AddConfigurationItemDialog } from '@/v4/components/AddConfigurationItemDialog';
import { EditConfigurationItemDialog } from '@/v4/components/EditConfigurationItemDialog';
import { EditQuoteDialog } from '@/v4/components/EditQuoteDialog';
import { AmendmentDialog } from '@/v4/components/AmendmentDialog';
import { TaskDialog } from '@/v4/components/TaskDialog';
import { ProductionTab } from '@/v4/components/ProductionTab';
import { ComplianceTab } from '@/v4/components/ComplianceTab';
import { PlanningTab } from '@/v4/components/PlanningTab';
import { BoatsSection } from '@/v4/components/BoatsSection';
import { ProjectContextPanel } from '@/v4/components/ProjectContextPanel';
import { PreviewIndexDialog } from '@/v4/components/PreviewIndexDialog';
import { ViewArticleButton } from '@/v4/components/ArticleDetailViewer';
import { QuoteStatusBadge, DocumentStatusBadge, TaskStatusBadge, TaskPriorityBadge, PROJECT_STATUS_STYLES } from '@/v4/components/StatusBadge';
import OwnerManualPreview from '@/v4/components/OwnerManualPreview';
import {
  getDraftVersion,
  getApprovedVersion,
  isModularOwnerManual,
} from '@/domain/models/document-template';
import { useAuth, PermissionGuard } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  NEW_BUILD: 'New Build',
  REFIT: 'Refit',
  MAINTENANCE: 'Maintenance',
};

interface ProjectDetailScreenProps {
  projectId: string;
  onBack: () => void;
  initialTab?: string;
}

export function ProjectDetailScreen({ projectId, onBack, initialTab }: ProjectDetailScreenProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    status: ProjectStatus | null;
    effects: { type: string; description: string }[];
  }>({ open: false, status: null, effects: [] });
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigurationItem | null>(null);
  const [showEditQuoteDialog, setShowEditQuoteDialog] = useState(false);
  const [editingQuote, setEditingQuote] = useState<ProjectQuote | null>(null);
  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [taskSummary, setTaskSummary] = useState<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    totalEstimated: number;
    totalLogged: number;
  } | null>(null);
  const [showOwnerManualPreview, setShowOwnerManualPreview] = useState(false);
  const [showPreviewIndex, setShowPreviewIndex] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    setIsLoading(true);
    try {
      const [p, history, summary] = await Promise.all([
        ProjectRepository.getById(projectId),
        AuditRepository.getByEntity('Project', projectId),
        TaskService.getTaskSummary(projectId),
      ]);

      if (p) {
        setProject(p);
        const c = await ClientRepository.getById(p.clientId);
        setClient(c);
      }
      setAuditEntries(history);
      setTaskSummary(summary);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTransitionStatus(newStatus: ProjectStatus) {
    if (!project) return;

    const validation = StatusMachine.validateTransition(project.status, newStatus, {
      hasQuoteDraft: project.quotes.some((q) => q.status === 'DRAFT'),
      hasQuoteSent: project.quotes.some((q) => q.status === 'SENT'),
      hasQuoteAccepted: project.quotes.some((q) => q.status === 'ACCEPTED'),
      configurationItemCount: project.configuration.items.length,
    });

    if (validation.milestoneEffects && validation.milestoneEffects.length > 0) {
      setTransitionDialog({
        open: true,
        status: newStatus,
        effects: validation.milestoneEffects,
      });
    } else {
      await executeTransition(newStatus);
    }
  }

  async function executeTransition(newStatus: ProjectStatus) {
    if (!project) return;

    const result = await ProjectService.transitionStatus(
      projectId,
      newStatus,
      getAuditContext()
    );

    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to transition: ${result.error}`);
    }

    setTransitionDialog({ open: false, status: null, effects: [] });
  }

  async function handleCreateQuote() {
    if (!project) return;

    const result = await QuoteService.createDraft(projectId, getAuditContext());
    if (result.ok) {
      await loadProject();
      setActiveTab('quotes');
    } else {
      alert(`Failed to create quote: ${result.error}`);
    }
  }

  async function handleMarkQuoteSent(quoteId: string) {
    const result = await QuoteService.markAsSent(projectId, quoteId, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to mark quote as sent: ${result.error}`);
    }
  }

  async function handleMarkQuoteAccepted(quoteId: string) {
    const result = await QuoteService.markAsAccepted(projectId, quoteId, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to mark quote as accepted: ${result.error}`);
    }
  }

  async function handleMarkQuoteRejected(quoteId: string) {
    if (!confirm('Mark this quote as rejected?')) return;
    const result = await QuoteService.markAsRejected(projectId, quoteId, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to mark quote as rejected: ${result.error}`);
    }
  }

  function handleEditQuote(quote: ProjectQuote) {
    setEditingQuote(quote);
    setShowEditQuoteDialog(true);
  }

  async function handleSaveQuote(updates: Partial<ProjectQuote>) {
    if (!editingQuote) return;
    const result = await QuoteService.updateDraft(projectId, editingQuote.id, updates, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to save quote: ${result.error}`);
    }
  }

  async function handleCreateNewQuoteVersion(fromQuoteId: string) {
    const result = await QuoteService.createNewVersion(projectId, fromQuoteId, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to create new version: ${result.error}`);
    }
  }

  async function handleSubmitAmendment(amendment: {
    type: AmendmentType;
    reason: string;
    changes: {
      itemsToAdd?: Omit<ConfigurationItem, 'id'>[];
      itemsToRemove?: string[];
      itemsToUpdate?: { id: string; updates: Partial<ConfigurationItem> }[];
    };
  }) {
    const context = getAuditContext();
    // For simplicity, the current user is the approver (in real system, this would go through approval workflow)
    const approver = { id: context.userId, name: context.userName, email: 'admin@eagleboats.nl', role: 'admin' as const };

    const result = await AmendmentService.requestAmendment(
      projectId,
      amendment.type,
      amendment.reason,
      amendment.changes,
      context,
      approver
    );

    if (result.ok) {
      await loadProject();
      setActiveTab('amendments');
    } else {
      alert(`Failed to submit amendment: ${result.error}`);
    }
  }

  async function handleAddConfigurationItem(input: AddConfigurationItemInput) {
    const result = await ConfigurationService.addItem(projectId, input, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to add item: ${result.error}`);
    }
  }

  function handleEditConfigurationItem(item: ConfigurationItem) {
    setEditingItem(item);
    setShowEditItemDialog(true);
  }

  async function handleSaveConfigurationItem(updates: Partial<ConfigurationItem>) {
    if (!editingItem) return;
    const result = await ConfigurationService.updateItem(projectId, editingItem.id, updates, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to update item: ${result.error}`);
    }
  }

  async function handleRemoveConfigurationItem(itemId: string) {
    if (!confirm('Remove this item from the configuration?')) return;
    const result = await ConfigurationService.removeItem(projectId, itemId, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to remove item: ${result.error}`);
    }
  }

  async function handleMoveConfigurationItem(itemId: string, direction: 'up' | 'down') {
    const result = await ConfigurationService.moveItem(projectId, itemId, direction, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to move item: ${result.error}`);
    }
  }

  async function handleDownloadQuotePdf(quoteId: string) {
    if (!project || !client) {
      alert('Project or client data not available');
      return;
    }

    const quote = project.quotes.find(q => q.id === quoteId);
    if (!quote) {
      alert('Quote not found');
      return;
    }

    // Build category-grouped lines for client-facing quotation
    // Group lines by category, articles show description + qty only (no prices)
    // Only category totals are shown to the client
    const categoryMap = new Map<string, { items: QuoteCategoryItem[]; total: number }>();

    for (const line of quote.lines) {
      const category = line.category || 'Other';
      const existing = categoryMap.get(category) || { items: [], total: 0 };

      existing.items.push({
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        isOptional: line.isOptional,
      });
      existing.total += line.lineTotalExclVat;

      categoryMap.set(category, existing);
    }

    // Convert map to array of category groups
    const categoryGroups: QuoteCategoryGroup[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        items: data.items,
        categoryTotal: data.total,
      })
    );

    // Build PDF data using PDFService
    const pdfData: QuotePDFData = {
      // Company info (hardcoded for now - will come from Settings)
      companyName: 'Eagle Boats B.V.',
      companyAddress: 'Havenweg 12, 6051 CS Maasbracht, Netherlands',
      companyPhone: '+31 475 123 456',
      companyEmail: 'info@eagleboats.nl',
      companyVat: 'NL123456789B01',
      companyKvk: '12345678',

      // Client info
      clientName: client.name,
      clientAddress: `${client.street || ''}, ${client.postalCode || ''} ${client.city || ''}, ${client.country || ''}`.trim(),
      clientVat: client.vatNumber,

      // Quote info
      quoteNumber: quote.quoteNumber,
      quoteDate: quote.createdAt,
      validUntil: quote.validUntil,
      projectTitle: project.title,
      projectNumber: project.projectNumber,

      // Legacy lines (still provided for backward compatibility)
      lines: quote.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPriceExclVat,
        total: line.lineTotalExclVat,
        isOptional: line.isOptional,
      })),

      // Category-grouped lines for client-facing quotation
      // This takes priority over legacy lines when rendering
      categoryGroups,

      // Pricing
      subtotal: quote.subtotalExclVat,
      discountPercent: quote.discountPercent,
      discountAmount: quote.discountAmount,
      totalExclVat: quote.totalExclVat,
      vatRate: quote.vatRate,
      vatAmount: quote.vatAmount,
      totalInclVat: quote.totalInclVat,

      // Terms
      paymentTerms: quote.paymentTerms,
      deliveryTerms: quote.deliveryTerms,
      deliveryWeeks: quote.deliveryWeeks,
      notes: quote.notes,

      // Status
      status: quote.status === 'DRAFT' ? 'DRAFT' : 'FINAL',
    };

    const html = generateQuotePDF(pdfData);
    openPDFWindow(html);
  }

  async function handleGenerateDocument(type: 'OWNERS_MANUAL' | 'CE_DECLARATION' | 'TECHNICAL_FILE' | 'DELIVERY_NOTE' | 'INVOICE') {
    // Use the new template-based generation
    const result = await DocumentService.generateFromTemplate(
      projectId,
      type,
      getAuditContext()
    );

    if (!result.ok) {
      alert(`Failed to generate document: ${result.error}`);
      return;
    }

    await loadProject();
    setActiveTab('documents');

    // Open in new window
    if (result.value.fileData) {
      const html = decodeURIComponent(escape(atob(result.value.fileData)));
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    }
  }

  async function handleFinalizeDocument(documentId: string) {
    const result = await DocumentService.finalizeDocument(
      projectId,
      documentId,
      getAuditContext()
    );

    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to finalize: ${result.error}`);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Delete this draft document?')) return;

    const result = await DocumentService.deleteDocument(
      projectId,
      documentId,
      getAuditContext()
    );

    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to delete: ${result.error}`);
    }
  }

  async function handleGenerateBOM() {
    const result = await BOMService.generateBOM(projectId, getAuditContext(), 'MANUAL');

    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to generate BOM: ${result.error}`);
    }
  }

  function handleExportBOMToCSV(bomId: string) {
    if (!project) return;
    const bom = project.bomSnapshots.find(b => b.id === bomId);
    if (!bom) return;

    const csv = BOMService.exportToCSV(bom);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM-${project.projectNumber}-${bom.snapshotNumber}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================
  // TASK HANDLERS
  // ============================================

  function handleOpenCreateTask() {
    setEditingTask(null);
    setShowTaskDialog(true);
  }

  function handleEditTask(task: ProjectTask) {
    setEditingTask(task);
    setShowTaskDialog(true);
  }

  async function handleCreateTask(input: CreateTaskInput) {
    const result = await TaskService.createTask(projectId, input, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to create task: ${result.error}`);
    }
  }

  async function handleUpdateTask(updates: Partial<ProjectTask>) {
    if (!editingTask) return;
    const result = await TaskService.updateTask(projectId, editingTask.id, updates, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to update task: ${result.error}`);
    }
  }

  async function handleUpdateTaskStatus(taskId: string, status: TaskStatus) {
    const result = await TaskService.updateTaskStatus(projectId, taskId, status, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to update task status: ${result.error}`);
    }
  }

  async function handleLogTime(hours: number, date: string, description?: string) {
    if (!editingTask) return;
    const result = await TaskService.logTime(projectId, editingTask.id, { date, hours, description }, getAuditContext());
    if (result.ok) {
      await loadProject();
      // Re-fetch the task to update the dialog
      const updatedProject = await ProjectRepository.getById(projectId);
      if (updatedProject) {
        const updatedTask = updatedProject.tasks?.find(t => t.id === editingTask.id);
        if (updatedTask) {
          setEditingTask(updatedTask);
        }
      }
    } else {
      alert(`Failed to log time: ${result.error}`);
    }
  }

  async function handleDeleteTimeLog(timeLogId: string) {
    if (!editingTask) return;
    const result = await TaskService.deleteTimeLog(projectId, editingTask.id, timeLogId, getAuditContext());
    if (result.ok) {
      await loadProject();
      // Re-fetch the task to update the dialog
      const updatedProject = await ProjectRepository.getById(projectId);
      if (updatedProject) {
        const updatedTask = updatedProject.tasks?.find(t => t.id === editingTask.id);
        if (updatedTask) {
          setEditingTask(updatedTask);
        }
      }
    } else {
      alert(`Failed to delete time log: ${result.error}`);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    const result = await TaskService.deleteTask(projectId, taskId, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to delete task: ${result.error}`);
    }
  }

  async function handleUpdateProjectType(newType: ProjectType) {
    const result = await ProjectService.updateProjectType(projectId, newType, getAuditContext());
    if (result.ok) {
      await loadProject();
    } else {
      alert(`Failed to update project type: ${result.error}`);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  if (isLoading || !project) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Ship className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading project...</p>
        </div>
      </div>
    );
  }

  const statusInfo = StatusMachine.getStatusInfo(project.status);
  const nextStatuses = StatusMachine.getValidNextStatuses(project.status);
  const isEditable = StatusMachine.isEditable(project.status);
  const isFrozen = StatusMachine.isFrozen(project.status);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
              <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                {statusInfo.label}
              </Badge>
              {isFrozen && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Frozen
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span className="font-mono">{project.projectNumber}</span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {client?.name || 'Unknown Client'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {formatDate(project.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Status Transitions */}
        <PermissionGuard permission="project:transition">
          <div className="flex items-center gap-2">
            {nextStatuses.map((status) => {
              // Determine button style based on transition type
              const isForwardProgress = ['ORDER_CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERED', 'CLOSED'].includes(status);
              const isImportantMilestone = ['ORDER_CONFIRMED', 'IN_PRODUCTION'].includes(status);

              // Check if transition prerequisites are met
              const validation = StatusMachine.validateTransition(project.status, status, {
                hasQuoteDraft: project.quotes.some((q) => q.status === 'DRAFT'),
                hasQuoteSent: project.quotes.some((q) => q.status === 'SENT'),
                hasQuoteAccepted: project.quotes.some((q) => q.status === 'ACCEPTED'),
                configurationItemCount: project.configuration.items.length,
              });
              const canTransition = validation.isValid;

              return (
                <Button
                  key={status}
                  variant={isImportantMilestone && canTransition ? 'default' : 'outline'}
                  className={isImportantMilestone && canTransition ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => handleTransitionStatus(status)}
                  disabled={!canTransition}
                  title={!canTransition ? validation.errors.join('. ') : undefined}
                >
                  {isForwardProgress ? <ChevronRight className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
                  {status === 'ORDER_CONFIRMED' ? 'Confirm Order' :
                   status === 'IN_PRODUCTION' ? 'Start Production' :
                   StatusMachine.getStatusInfo(status).label}
                </Button>
              );
            })}
          </div>
        </PermissionGuard>
      </div>

      {/* Quick Actions Row */}
      {(() => {
        // Find Owner's Manual template and check availability
        const ownerManualTemplate = project.documentTemplates?.find(
          (t) => t.type === 'DOC_OWNERS_MANUAL'
        );
        const currentVersion = ownerManualTemplate
          ? getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate)
          : undefined;
        const hasModularBlocks =
          currentVersion && isModularOwnerManual(currentVersion);
        const includedBlocksCount =
          hasModularBlocks && currentVersion.ownerManualBlocks
            ? currentVersion.ownerManualBlocks.filter((b: any) => b.included).length
            : 0;
        const hasCompliancePacks = (project.compliancePacks?.length || 0) > 0;

        // Only show Quick Actions for NEW_BUILD projects with document templates
        if (project.type !== 'NEW_BUILD' || !ownerManualTemplate) {
          return null;
        }

        return (
          <div className="flex items-center gap-2" data-testid="quick-actions-row">
            <span className="text-sm text-slate-500 mr-2">Quick actions:</span>
            {/* Edit Owner's Manual */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveTab('compliance');
                // After tab switch, scroll to editor (after render)
                setTimeout(() => {
                  const editor = document.querySelector(
                    '[data-testid="owner-manual-blocks-editor"]'
                  );
                  if (editor) {
                    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              disabled={!hasModularBlocks}
              title={
                !hasModularBlocks
                  ? "Owner's Manual not available"
                  : "Edit Owner's Manual"
              }
              className="gap-1"
              data-testid="quick-action-edit-manual"
            >
              <Book className="h-4 w-4" />
              Edit Owner's Manual
            </Button>
            {/* Preview Owner's Manual */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOwnerManualPreview(true)}
              disabled={!hasModularBlocks || includedBlocksCount === 0}
              title={
                !hasModularBlocks
                  ? "Owner's Manual not available"
                  : includedBlocksCount === 0
                    ? 'No sections included'
                    : "Preview Owner's Manual"
              }
              className="gap-1"
              data-testid="quick-action-preview-manual"
            >
              <Eye className="h-4 w-4" />
              Preview Owner's Manual
            </Button>
            {/* Attachments */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('compliance')}
              disabled={!hasCompliancePacks}
              title={
                !hasCompliancePacks
                  ? 'No compliance packs available'
                  : 'View Attachments'
              }
              className="gap-1"
              data-testid="quick-action-attachments"
            >
              <Paperclip className="h-4 w-4" />
              Attachments
            </Button>
            {/* All Previews */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewIndex(true)}
              className="gap-1"
              data-testid="quick-action-all-previews"
            >
              <Eye className="h-4 w-4" />
              All Previews
            </Button>
          </div>
        );
      })()}

      {/* Project Snapshot Row (read-only derived data) */}
      {(() => {
        // Owner's Manual: count included blocks
        const ownerManualTemplate = project.documentTemplates?.find(
          (t) => t.type === 'DOC_OWNERS_MANUAL'
        );
        const currentVersion = ownerManualTemplate
          ? getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate)
          : undefined;
        const hasModularBlocks =
          currentVersion && isModularOwnerManual(currentVersion);
        const includedBlocksCount =
          hasModularBlocks && currentVersion.ownerManualBlocks
            ? currentVersion.ownerManualBlocks.filter((b: any) => b.included).length
            : 0;
        const totalBlocksCount =
          hasModularBlocks && currentVersion.ownerManualBlocks
            ? currentVersion.ownerManualBlocks.length
            : 0;

        // Applied Standards count
        const appliedStandardsCount = project.appliedStandards?.length || 0;

        // Attachments: total and used counts
        let totalAttachments = 0;
        for (const pack of project.compliancePacks || []) {
          for (const chapter of pack.chapters) {
            totalAttachments += chapter.attachments.length;
            for (const section of chapter.sections) {
              totalAttachments += section.attachments.length;
            }
          }
        }

        // Count used attachment IDs (referenced in appliedStandards or technicalFile)
        const usedAttachmentIds = new Set<string>();
        for (const standard of project.appliedStandards || []) {
          for (const attId of standard.evidenceAttachmentIds || []) {
            usedAttachmentIds.add(attId);
          }
        }
        for (const section of project.technicalFile?.sections || []) {
          for (const item of section.items || []) {
            if (item.kind === 'attachmentRef' && item.attachmentId) {
              usedAttachmentIds.add(item.attachmentId);
            }
          }
        }
        const usedAttachmentsCount = usedAttachmentIds.size;

        // Project status display
        const projectStatusLabel = project.status === 'CLOSED' ? 'CLOSED' : 'DRAFT';

        return (
          <div
            className="flex items-center gap-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            data-testid="project-snapshot-row"
          >
            <div className="flex items-center gap-1 text-slate-500">
              <Info className="h-4 w-4" />
              <span className="font-medium text-slate-600">Snapshot:</span>
            </div>

            {/* Owner's Manual */}
            <button
              type="button"
              className={`flex items-center gap-1.5 ${
                hasModularBlocks
                  ? 'hover:bg-slate-100 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors cursor-pointer'
                  : 'cursor-default'
              }`}
              onClick={() => {
                if (!hasModularBlocks) return;
                setActiveTab('compliance');
                setTimeout(() => {
                  const editor = document.querySelector(
                    '[data-testid="owner-manual-blocks-editor"]'
                  );
                  if (editor) {
                    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              disabled={!hasModularBlocks}
              title={hasModularBlocks ? "Open Owner's Manual editor" : undefined}
              data-testid="snapshot-owner-manual"
            >
              <Book className="h-4 w-4 text-teal-600" />
              <span className="text-slate-700">
                Owner's Manual:{' '}
                <span className={`font-medium ${hasModularBlocks ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                  {!ownerManualTemplate
                    ? '—'
                    : !hasModularBlocks
                      ? 'Not started'
                      : `${includedBlocksCount}/${totalBlocksCount} blocks`}
                </span>
              </span>
            </button>

            {/* Applied Standards */}
            <button
              type="button"
              className={`flex items-center gap-1.5 ${
                appliedStandardsCount > 0
                  ? 'hover:bg-slate-100 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors cursor-pointer'
                  : 'cursor-default'
              }`}
              onClick={() => {
                if (appliedStandardsCount === 0) return;
                setActiveTab('compliance');
                setTimeout(() => {
                  const section = document.querySelector(
                    '[data-testid="applied-standards-section"]'
                  );
                  if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              disabled={appliedStandardsCount === 0}
              title={appliedStandardsCount > 0 ? 'View Applied Standards' : undefined}
              data-testid="snapshot-applied-standards"
            >
              <BookOpen className="h-4 w-4 text-teal-600" />
              <span className="text-slate-700">
                Standards:{' '}
                <span className={`font-medium ${appliedStandardsCount > 0 ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                  {appliedStandardsCount > 0 ? appliedStandardsCount : '—'}
                </span>
              </span>
            </button>

            {/* Attachments */}
            <button
              type="button"
              className={`flex items-center gap-1.5 ${
                totalAttachments > 0
                  ? 'hover:bg-slate-100 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors cursor-pointer'
                  : 'cursor-default'
              }`}
              onClick={() => {
                if (totalAttachments === 0) return;
                setActiveTab('compliance');
              }}
              disabled={totalAttachments === 0}
              title={totalAttachments > 0 ? 'View Attachments in Compliance tab' : undefined}
              data-testid="snapshot-attachments"
            >
              <Paperclip className="h-4 w-4 text-teal-600" />
              <span className="text-slate-700">
                Attachments:{' '}
                <span className={`font-medium ${totalAttachments > 0 ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                  {totalAttachments > 0
                    ? `${totalAttachments} (${usedAttachmentsCount} used)`
                    : '—'}
                </span>
              </span>
            </button>

            {/* Project Status */}
            <div className="flex items-center gap-1.5" data-testid="snapshot-status">
              {project.status === 'CLOSED' ? (
                <Lock className="h-4 w-4 text-slate-500" />
              ) : (
                <FileEdit className="h-4 w-4 text-teal-600" />
              )}
              <span className="text-slate-700">
                Status:{' '}
                <Badge
                  variant="outline"
                  className={
                    project.status === 'CLOSED'
                      ? 'border-slate-400 text-slate-600 text-xs px-1.5 py-0'
                      : 'border-teal-400 text-teal-700 text-xs px-1.5 py-0'
                  }
                >
                  {projectStatusLabel}
                </Badge>
              </span>
            </div>
          </div>
        );
      })()}

      {/* Owner's Manual Preview Dialog (for quick action) */}
      {(() => {
        const ownerManualTemplate = project.documentTemplates?.find(
          (t) => t.type === 'DOC_OWNERS_MANUAL'
        );
        const currentVersion = ownerManualTemplate
          ? getDraftVersion(ownerManualTemplate) || getApprovedVersion(ownerManualTemplate)
          : undefined;
        if (
          currentVersion &&
          isModularOwnerManual(currentVersion) &&
          currentVersion.ownerManualBlocks
        ) {
          return (
            <OwnerManualPreview
              blocks={currentVersion.ownerManualBlocks}
              open={showOwnerManualPreview}
              onOpenChange={setShowOwnerManualPreview}
              projectTitle={project.title}
            />
          );
        }
        return null;
      })()}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">
            Configuration
            <Badge variant="secondary" className="ml-2">
              {project.configuration.items.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="quotes">
            Quotes
            <Badge variant="secondary" className="ml-2">
              {project.quotes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="bom">BOM</TabsTrigger>
          <TabsTrigger value="amendments">
            Amendments
            {project.amendments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {project.amendments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="production">
            Production
            {((project.productionStages?.length || 0) > 0 || (project.tasks?.length || 0) > 0) && (
              <Badge variant="secondary" className="ml-2">
                {(project.productionStages?.filter(s => s.status !== 'COMPLETED').length || 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            Compliance
            {(project.compliancePacks?.length || 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {project.compliancePacks?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="planning">
            Planning
            {((project.planning?.tasks?.length || 0) > 0) && (
              <Badge variant="secondary" className="ml-2">
                {project.planning?.tasks?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Type</p>
                  {project.status !== 'CLOSED' ? (
                    <PermissionGuard permission="project:update" fallback={
                      <p className="font-medium">{PROJECT_TYPE_LABELS[project.type]}</p>
                    }>
                      <Select
                        value={project.type}
                        onValueChange={(v) => handleUpdateProjectType(v as ProjectType)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW_BUILD">New Build</SelectItem>
                          <SelectItem value="REFIT">Refit</SelectItem>
                          <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </PermissionGuard>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{PROJECT_TYPE_LABELS[project.type]}</p>
                      <span title="Cannot change type when project is closed">
                        <Lock className="h-3 w-3 text-slate-400" />
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Propulsion</p>
                  <p className="font-medium">{project.configuration.propulsionType}</p>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {client ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-500">Name</p>
                      <p className="font-medium">{client.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="font-medium">{client.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Type</p>
                      <Badge variant="outline">{client.type}</Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500">Client not found</p>
                )}
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Subtotal (excl. VAT)</p>
                  <p className="font-medium">{formatCurrency(project.configuration.subtotalExclVat)}</p>
                </div>
                {project.configuration.discountAmount && project.configuration.discountAmount > 0 && (
                  <div>
                    <p className="text-xs text-slate-500">Discount ({project.configuration.discountPercent}%)</p>
                    <p className="font-medium text-green-600">-{formatCurrency(project.configuration.discountAmount)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">VAT ({project.configuration.vatRate}%)</p>
                  <p className="font-medium">{formatCurrency(project.configuration.vatAmount)}</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-slate-500">Total (incl. VAT)</p>
                  <p className="text-xl font-bold">{formatCurrency(project.configuration.totalInclVat)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {isEditable && (
                <Button onClick={() => setActiveTab('configuration')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Configuration
                </Button>
              )}
              <Button variant="outline" onClick={handleCreateQuote} disabled={project.configuration.items.length === 0}>
                <FileText className="h-4 w-4 mr-2" />
                Create Quote
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('bom')}>
                <Package className="h-4 w-4 mr-2" />
                View BOM
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('planning')}>
                <Calendar className="h-4 w-4 mr-2" />
                Planning
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('production')}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Production
              </Button>
            </CardContent>
          </Card>

          {/* Next Up Hint - Status-aware guidance */}
          {(() => {
            // Determine what the user should look at next based on project status
            let hintText: string | null = null;
            let hintIcon: React.ReactNode = null;
            let hintAction: { label: string; tab: string } | null = null;

            if (project.status === 'DRAFT') {
              if (project.configuration.items.length === 0) {
                hintText = 'Start by adding equipment to the configuration.';
                hintIcon = <Settings className="h-4 w-4 text-teal-600" />;
                hintAction = { label: 'Add Equipment', tab: 'configuration' };
              } else if (project.quotes.length === 0) {
                hintText = 'Configuration ready. Create a quote to send to the client.';
                hintIcon = <FileText className="h-4 w-4 text-teal-600" />;
                hintAction = { label: 'Create Quote', tab: 'quotes' };
              }
            } else if (project.status === 'QUOTED' || project.status === 'OFFER_SENT') {
              const hasAcceptedQuote = project.quotes.some((q) => q.status === 'ACCEPTED');
              if (hasAcceptedQuote) {
                hintText = 'Quote accepted! Confirm the order to freeze the configuration.';
                hintIcon = <Check className="h-4 w-4 text-green-600" />;
              } else {
                const hasSentQuote = project.quotes.some((q) => q.status === 'SENT');
                if (hasSentQuote) {
                  hintText = 'Waiting for client response on the sent quote.';
                  hintIcon = <Clock className="h-4 w-4 text-amber-600" />;
                  hintAction = { label: 'View Quotes', tab: 'quotes' };
                }
              }
            } else if (project.status === 'ORDER_CONFIRMED') {
              hintText = 'Order confirmed. Start production when ready.';
              hintIcon = <Play className="h-4 w-4 text-blue-600" />;
              hintAction = { label: 'View Production', tab: 'production' };
            } else if (project.status === 'IN_PRODUCTION') {
              const completedStages = project.productionStages?.filter((s) => s.status === 'COMPLETED').length || 0;
              const totalStages = project.productionStages?.length || 0;
              const blockedStages = project.productionStages?.filter((s) => s.status === 'BLOCKED').length || 0;
              if (blockedStages > 0) {
                hintText = `${blockedStages} production stage${blockedStages !== 1 ? 's' : ''} blocked. Review and resolve issues.`;
                hintIcon = <AlertTriangle className="h-4 w-4 text-red-600" />;
                hintAction = { label: 'View Production', tab: 'production' };
              } else if (totalStages > 0) {
                hintText = `Production in progress: ${completedStages}/${totalStages} stages completed.`;
                hintIcon = <Play className="h-4 w-4 text-blue-600" />;
                hintAction = { label: 'View Production', tab: 'production' };
              } else {
                hintText = 'Initialize production stages to track progress.';
                hintIcon = <Play className="h-4 w-4 text-blue-600" />;
                hintAction = { label: 'View Production', tab: 'production' };
              }
            } else if (project.status === 'READY_FOR_DELIVERY') {
              hintText = 'Project ready for delivery. Prepare delivery documents.';
              hintIcon = <PackageCheck className="h-4 w-4 text-green-600" />;
              hintAction = { label: 'View Documents', tab: 'documents' };
            } else if (project.status === 'DELIVERED') {
              hintText = 'Project delivered. Close the project when all follow-ups are complete.';
              hintIcon = <CheckCircle className="h-4 w-4 text-green-600" />;
            } else if (project.status === 'CLOSED') {
              hintText = 'Project closed. All data is now read-only.';
              hintIcon = <Lock className="h-4 w-4 text-slate-500" />;
            }

            if (!hintText) return null;

            return (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg" data-testid="next-up-hint">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200">
                  {hintIcon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">Next up</p>
                  <p className="text-sm text-slate-600">{hintText}</p>
                </div>
                {hintAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab(hintAction.tab)}
                  >
                    {hintAction.label}
                  </Button>
                )}
              </div>
            );
          })()}

          {/* Project Context Panel - Summary, Suggestions, Relationships */}
          <ProjectContextPanel
            project={project}
            onNavigateToTab={setActiveTab}
          />

          {/* Boats Section (NEW_BUILD only) */}
          {project.type === 'NEW_BUILD' && (
            <BoatsSection project={project} onRefresh={loadProject} />
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Equipment Configuration</CardTitle>
                <CardDescription>
                  {isEditable ? 'Add and manage equipment items' : 'Configuration is frozen'}
                </CardDescription>
              </div>
              {isEditable && (
                <Button onClick={() => setShowAddItemDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {project.configuration.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <Package className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">No equipment added</h4>
                  <p className="text-sm text-slate-500 max-w-xs mb-5">
                    Add equipment and options from the catalog to build your configuration.
                  </p>
                  {isEditable && (
                    <Button variant="outline" onClick={() => setShowAddItemDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Equipment
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isEditable && <TableHead className="w-16">Order</TableHead>}
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Flags</TableHead>
                      {isEditable && <TableHead className="w-24">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...project.configuration.items]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item, index) => (
                      <TableRow key={item.id} className={!item.isIncluded ? 'opacity-50' : ''}>
                        {isEditable && (
                          <TableCell>
                            <div className="flex flex-col">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                disabled={index === 0}
                                onClick={() => handleMoveConfigurationItem(item.id, 'up')}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                disabled={index === project.configuration.items.length - 1}
                                onClick={() => handleMoveConfigurationItem(item.id, 'down')}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <p className={`font-medium ${!item.isIncluded ? 'line-through' : ''}`}>{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-slate-500">{item.description}</p>
                            )}
                            {!item.isIncluded && (
                              <Badge variant="outline" className="text-xs mt-1">Excluded</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPriceExclVat)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.lineTotalExclVat)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.ceRelevant && (
                              <Badge variant="outline" className="text-xs">CE</Badge>
                            )}
                            {item.safetyCritical && (
                              <Badge variant="outline" className="text-xs border-red-300 text-red-600">Safety</Badge>
                            )}
                          </div>
                        </TableCell>
                        {isEditable && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditConfigurationItem(item)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600"
                                onClick={() => handleRemoveConfigurationItem(item.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          {/* Next Step Guidance - Show when quote is accepted but order not confirmed */}
          {project.quotes.some((q) => q.status === 'ACCEPTED') && project.status === 'OFFER_SENT' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-800">Quote Accepted</h4>
                    <p className="text-sm text-green-700">
                      The client has accepted the quote. Click <strong>"Confirm Order"</strong> above to freeze the configuration and start production.
                    </p>
                  </div>
                  <PermissionGuard permission="project:transition">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleTransitionStatus('ORDER_CONFIRMED')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Confirm Order
                    </Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Quotes</CardTitle>
                <CardDescription>Quote history and versions</CardDescription>
              </div>
              <Button onClick={handleCreateQuote} disabled={project.configuration.items.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            </CardHeader>
            <CardContent>
              {project.quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileText className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">No quotes created</h4>
                  <p className="text-sm text-slate-500 max-w-xs mb-5">
                    {project.configuration.items.length === 0
                      ? 'Add equipment to your configuration first, then create a quote.'
                      : 'Create a quote to share pricing with your client.'}
                  </p>
                  <Button variant="outline" onClick={handleCreateQuote} disabled={project.configuration.items.length === 0}>
                    Create Quote
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-slate-400" />
                        <div>
                          <p className="font-medium">{quote.quoteNumber}</p>
                          <p className="text-sm text-slate-500">
                            Created {formatDate(quote.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(quote.totalInclVat)}</p>
                          <p className="text-xs text-slate-500">Valid until {formatDate(quote.validUntil)}</p>
                        </div>
                        <QuoteStatusBadge status={quote.status} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleDownloadQuotePdf(quote.id)}>
                            <FileText className="h-3 w-3 mr-1" />
                            PDF
                          </Button>
                          {quote.status === 'DRAFT' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEditQuote(quote)}>
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button size="sm" onClick={() => handleMarkQuoteSent(quote.id)}>
                                <Send className="h-3 w-3 mr-1" />
                                Mark Sent
                              </Button>
                            </>
                          )}
                          {quote.status === 'SENT' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleMarkQuoteAccepted(quote.id)}>
                                <Check className="h-3 w-3 mr-1" />
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleMarkQuoteRejected(quote.id)}>
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {(quote.status === 'REJECTED' || quote.status === 'SUPERSEDED') && (
                            <Button size="sm" variant="outline" onClick={() => handleCreateNewQuoteVersion(quote.id)}>
                              <Copy className="h-3 w-3 mr-1" />
                              New Version
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bill of Materials</CardTitle>
                <CardDescription>
                  {project.bomSnapshots.length > 0
                    ? project.bomSnapshots.length > 1
                      ? `Showing latest BOM (${project.bomSnapshots.length - 1} older snapshot${project.bomSnapshots.length > 2 ? 's' : ''} hidden)`
                      : '1 baseline generated'
                    : 'BOM will be generated when order is confirmed'}
                </CardDescription>
              </div>
              {project.configuration.items.length > 0 && (
                <Button onClick={handleGenerateBOM} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate BOM
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {project.bomSnapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <Package className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">No bill of materials</h4>
                  <p className="text-sm text-slate-500 max-w-xs mb-5">
                    {project.configuration.items.length > 0
                      ? 'Generate a BOM to see parts breakdown and cost analysis.'
                      : 'Add equipment to your configuration first.'}
                  </p>
                  {project.configuration.items.length > 0 && (
                    <Button variant="outline" onClick={handleGenerateBOM}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate BOM
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Show only the latest BOM snapshot (older snapshots hidden but data preserved) */}
                  {[project.bomSnapshots[project.bomSnapshots.length - 1]].map((bom) => {
                    // Calculate cost summary by category
                    const categoryTotals = new Map<string, number>();
                    for (const item of bom.items) {
                      const current = categoryTotals.get(item.category) || 0;
                      categoryTotals.set(item.category, current + item.totalCost);
                    }
                    const costSummary = Array.from(categoryTotals.entries())
                      .map(([category, cost]) => ({
                        category,
                        cost,
                        percentage: bom.totalCostExclVat > 0 ? Math.round((cost / bom.totalCostExclVat) * 100) : 0,
                      }))
                      .sort((a, b) => b.cost - a.cost);

                    return (
                      <div key={bom.id} className="border rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-slate-50 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                              <Package className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">BOM Baseline #{bom.snapshotNumber}</h4>
                              <p className="text-sm text-slate-500">{formatDateTime(bom.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(bom.totalCostExclVat)}</p>
                              <p className="text-xs text-slate-500">{bom.totalParts} parts • {bom.items.length} line items</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleExportBOMToCSV(bom.id)}>
                              <Download className="h-4 w-4 mr-1" />
                              CSV
                            </Button>
                          </div>
                        </div>

                        {/* Cost Estimation Summary */}
                        {bom.estimatedCostCount > 0 && (
                          <div className="p-4 border-b bg-amber-50/50">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <span className="text-sm font-medium text-amber-700">Cost Estimation Summary</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-white rounded-lg p-3 border border-amber-200">
                                <p className="text-xs text-amber-600">Estimated Items</p>
                                <p className="text-xl font-bold text-amber-700">
                                  {bom.estimatedCostCount} <span className="text-sm font-normal text-amber-500">/ {bom.items.length}</span>
                                </p>
                                <p className="text-xs text-amber-500 mt-1">
                                  {bom.items.length > 0 ? Math.round((bom.estimatedCostCount / bom.items.length) * 100) : 0}% of items
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-amber-200">
                                <p className="text-xs text-amber-600">Estimated Cost</p>
                                <p className="text-xl font-bold text-amber-700">{formatCurrency(bom.estimatedCostTotal)}</p>
                                <p className="text-xs text-amber-500 mt-1">
                                  {bom.totalCostExclVat > 0 ? Math.round((bom.estimatedCostTotal / bom.totalCostExclVat) * 100) : 0}% of total
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-green-200">
                                <p className="text-xs text-green-600">Actual Cost</p>
                                <p className="text-xl font-bold text-green-700">{formatCurrency(bom.actualCostTotal)}</p>
                                <p className="text-xs text-green-500 mt-1">
                                  {bom.totalCostExclVat > 0 ? Math.round((bom.actualCostTotal / bom.totalCostExclVat) * 100) : 0}% of total
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-200">
                                <p className="text-xs text-slate-600">Estimation Ratio</p>
                                <p className="text-xl font-bold text-slate-700">{Math.round((bom.costEstimationRatio || 0.6) * 100)}%</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  of sell price used
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-amber-600 mt-3">
                              Items with estimated costs are marked below. Actual supplier costs may differ.
                            </p>
                          </div>
                        )}

                        {/* Cost Summary */}
                        <div className="p-4 border-b">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Cost Breakdown by Category</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {costSummary.slice(0, 4).map(({ category, cost, percentage }) => (
                              <div key={category} className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500">{category}</p>
                                <p className="font-semibold">{formatCurrency(cost)}</p>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1">
                                  <div
                                    className="h-full bg-teal-500 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{percentage}%</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Article #</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bom.items.slice(0, 10).map((item) => (
                                <TableRow key={item.id} className={item.isEstimated ? 'bg-amber-50/30' : ''}>
                                  <TableCell className="font-mono text-xs">{item.articleNumber || '-'}</TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium">{item.name}</p>
                                        {item.isEstimated && (
                                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                                            Estimated
                                          </Badge>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-xs text-slate-500">{item.description}</p>
                                      )}
                                      {item.isEstimated && item.sellPrice && (
                                        <p className="text-[10px] text-amber-600">
                                          Based on {Math.round((item.estimationRatio || 0.6) * 100)}% of sell price ({formatCurrency(item.sellPrice)})
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600">{item.supplier || '-'}</TableCell>
                                  <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                  <TableCell className={`text-right ${item.isEstimated ? 'text-amber-700' : ''}`}>
                                    {formatCurrency(item.unitCost)}
                                    {item.isEstimated && <span className="text-[10px] text-amber-500 ml-1">*</span>}
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${item.isEstimated ? 'text-amber-700' : ''}`}>
                                    {formatCurrency(item.totalCost)}
                                  </TableCell>
                                  <TableCell>
                                    {item.articleVersionId && (
                                      <ViewArticleButton
                                        articleVersionId={item.articleVersionId}
                                        articleId={item.articleId}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {bom.items.length > 10 && (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center text-slate-500 py-4">
                                    +{bom.items.length - 10} more items (export CSV for full list)
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>

                          {/* Estimation Legend */}
                          {bom.estimatedCostCount > 0 && (
                            <div className="mt-3 pt-3 border-t border-dashed flex items-center gap-2 text-xs text-slate-500">
                              <span className="text-amber-500">*</span>
                              <span>Estimated costs are calculated at {Math.round((bom.costEstimationRatio || 0.6) * 100)}% of sell price. Actual procurement costs may vary.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amendments Tab */}
        <TabsContent value="amendments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Amendments</CardTitle>
                <CardDescription>
                  Changes made after order confirmation
                </CardDescription>
              </div>
              {isFrozen && !StatusMachine.isLocked(project.status) && (
                <Button onClick={() => setShowAmendmentDialog(true)} variant="outline">
                  <FileEdit className="h-4 w-4 mr-2" />
                  Request Amendment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!isFrozen ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileEdit className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">Amendments not available</h4>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Amendments can only be made after the order is confirmed.
                    Edit the configuration directly while in {project.status.replace('_', ' ')} status.
                  </p>
                </div>
              ) : project.amendments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileEdit className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">No amendments</h4>
                  <p className="text-sm text-slate-500 max-w-xs mb-5">
                    Configuration changes after order confirmation are tracked as amendments.
                  </p>
                  {!StatusMachine.isLocked(project.status) && (
                    <Button variant="outline" onClick={() => setShowAmendmentDialog(true)}>
                      <FileEdit className="h-4 w-4 mr-2" />
                      Request Amendment
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {project.amendments.map((amendment) => (
                    <div key={amendment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <FileEdit className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium">Amendment #{amendment.amendmentNumber}</p>
                            <p className="text-sm text-slate-500">
                              {amendment.type.replace(/_/g, ' ')} • {formatDate(amendment.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              amendment.priceImpactExclVat >= 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            {amendment.priceImpactExclVat >= 0 ? '+' : ''}
                            {formatCurrency(amendment.priceImpactExclVat)}
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 mb-3">{amendment.reason}</p>

                      {amendment.affectedItems.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-2">Affected Items</p>
                          <div className="flex flex-wrap gap-2">
                            {amendment.affectedItems.map((item, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>Requested by: {amendment.requestedBy}</span>
                        <span>Approved by: {amendment.approvedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-6">
          {/* Production Stages */}
          <ProductionTab project={project} onRefresh={loadProject} />

          {/* Task Summary */}
          {taskSummary && taskSummary.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-slate-50">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-slate-500">Total Tasks</p>
                  <p className="text-2xl font-bold">{taskSummary.total}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-blue-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">{taskSummary.byStatus.IN_PROGRESS || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{taskSummary.byStatus.COMPLETED || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-amber-600">Estimated Hours</p>
                  <p className="text-2xl font-bold text-amber-700">{taskSummary.totalEstimated}h</p>
                </CardContent>
              </Card>
              <Card className="bg-teal-50">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-teal-600">Logged Hours</p>
                  <p className="text-2xl font-bold text-teal-700">{taskSummary.totalLogged}h</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Task List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-teal-600" />
                  Production Tasks
                </CardTitle>
                <CardDescription>
                  Manage tasks, assignments, and time tracking
                </CardDescription>
              </div>
              <PermissionGuard permission="task:create">
                <Button onClick={handleOpenCreateTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </PermissionGuard>
            </CardHeader>
            <CardContent>
              {(project.tasks?.length || 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <ClipboardList className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">No production tasks</h4>
                  <p className="text-sm text-slate-500 max-w-xs mb-5">
                    Create tasks to track work, assignments, and time spent on this project.
                  </p>
                  <Button variant="outline" onClick={handleOpenCreateTask}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Est.</TableHead>
                      <TableHead className="text-right">Logged</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.tasks?.map((task) => {
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                      const isOverBudget = task.estimatedHours && task.totalLoggedHours > task.estimatedHours;

                      return (
                        <TableRow key={task.id} className={task.status === 'COMPLETED' ? 'opacity-60' : ''}>
                          <TableCell className="font-mono text-xs text-slate-500">{task.taskNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p className={`font-medium ${task.status === 'COMPLETED' ? 'line-through' : ''}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-slate-500 truncate max-w-xs">{task.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{task.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <TaskPriorityBadge priority={task.priority} />
                          </TableCell>
                          <TableCell>
                            <TaskStatusBadge status={task.status} />
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {task.estimatedHours ? `${task.estimatedHours}h` : '-'}
                          </TableCell>
                          <TableCell className={`text-right text-sm font-medium ${isOverBudget ? 'text-red-600' : ''}`}>
                            {task.totalLoggedHours > 0 ? `${task.totalLoggedHours}h` : '-'}
                          </TableCell>
                          <TableCell className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                            {task.dueDate ? formatDate(task.dueDate) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* Quick status actions */}
                              {task.status === 'TODO' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                                  title="Start"
                                >
                                  <Play className="h-3 w-3 text-blue-600" />
                                </Button>
                              )}
                              {task.status === 'IN_PROGRESS' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleUpdateTaskStatus(task.id, 'ON_HOLD')}
                                    title="Pause"
                                  >
                                    <Pause className="h-3 w-3 text-amber-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                                    title="Complete"
                                  >
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  </Button>
                                </>
                              )}
                              {task.status === 'ON_HOLD' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                                  title="Resume"
                                >
                                  <Play className="h-3 w-3 text-blue-600" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditTask(task)}
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {task.status !== 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-600"
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="Delete"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <ComplianceTab project={project} onRefresh={loadProject} />
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning" className="space-y-4">
          <PlanningTab project={project} onRefresh={loadProject} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {/* Generate Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Documents</CardTitle>
              <CardDescription>Create documents using library templates with placeholders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => handleGenerateDocument('CE_DECLARATION')}>
                  <FileText className="h-4 w-4 mr-2" />
                  CE Declaration
                </Button>
                <Button variant="outline" onClick={() => handleGenerateDocument('OWNERS_MANUAL')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Owner's Manual
                </Button>
                <div className="flex flex-col items-start">
                  <Button variant="outline" onClick={() => handleGenerateDocument('TECHNICAL_FILE')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Technical File
                  </Button>
                  <p className="text-xs text-slate-500 mt-1 ml-1">Generated snapshot (not the dossier)</p>
                </div>
                <Button variant="outline" onClick={() => handleGenerateDocument('DELIVERY_NOTE')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Delivery Note
                </Button>
                <Button variant="outline" onClick={() => handleGenerateDocument('INVOICE')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Document List Card */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Documents</CardTitle>
              <CardDescription>
                Document lifecycle: DRAFT → FINAL → SUPERSEDED → ARCHIVED
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileText className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">No documents generated</h4>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Use the buttons above to generate CE declarations, manuals, and other project documents.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.documents
                    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                    .map((doc) => {
                      return (
                        <div key={doc.id} className="p-4 border rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              doc.status === 'FINAL' ? 'bg-green-100' :
                              doc.status === 'DRAFT' ? 'bg-amber-100' : 'bg-slate-100'
                            }`}>
                              <FileText className={`h-5 w-5 ${
                                doc.status === 'FINAL' ? 'text-green-600' :
                                doc.status === 'DRAFT' ? 'text-amber-600' : 'text-slate-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-sm text-slate-500">
                                {doc.type.replace(/_/g, ' ')} • Generated {formatDate(doc.generatedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DocumentStatusBadge status={doc.status} />
                            {doc.fileData && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const html = decodeURIComponent(escape(atob(doc.fileData!)));
                                  const win = window.open('', '_blank');
                                  if (win) {
                                    win.document.write(html);
                                    win.document.close();
                                  }
                                }}
                              >
                                View
                              </Button>
                            )}
                            {doc.status === 'DRAFT' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => handleFinalizeDocument(doc.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Finalize
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                            {doc.status === 'FINAL' && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <Lock className="h-3 w-3 mr-1" />
                                Immutable
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Pack Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-teal-600" />
                Delivery Pack
              </CardTitle>
              <CardDescription>
                Generate a ZIP bundle of all finalized documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const finalDocs = project.documents.filter(d => d.status === 'FINAL');
                const requiredTypes = ['CE_DECLARATION', 'OWNERS_MANUAL', 'DELIVERY_NOTE'];
                const hasRequiredDocs = requiredTypes.every(type =>
                  finalDocs.some(d => d.type === type)
                );

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-teal-600">{finalDocs.length}</p>
                        <p className="text-xs text-slate-500">Finalized Documents</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-slate-600">
                          {project.documents.filter(d => d.status === 'DRAFT').length}
                        </p>
                        <p className="text-xs text-slate-500">Drafts Pending</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                        {hasRequiredDocs ? (
                          <>
                            <Check className="h-6 w-6 text-green-500 mx-auto" />
                            <p className="text-xs text-green-600 mt-1">Ready</p>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto" />
                            <p className="text-xs text-amber-600 mt-1">Missing Docs</p>
                          </>
                        )}
                      </div>
                    </div>

                    {!hasRequiredDocs && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-700">
                          <strong>Missing required documents:</strong> {requiredTypes
                            .filter(type => !finalDocs.some(d => d.type === type))
                            .map(t => t.replace(/_/g, ' '))
                            .join(', ')}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Generate and finalize these documents before creating the delivery pack.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          const context = getAuditContext();
                          const result = await DeliveryPackService.generateDeliveryPack(
                            project.id,
                            context
                          );
                          if (result.ok) {
                            DeliveryPackService.downloadDeliveryPack(result.value);
                          } else {
                            alert(result.error);
                          }
                        }}
                        disabled={!hasRequiredDocs}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Download Delivery Pack
                      </Button>
                      {finalDocs.length > 0 && (
                        <p className="text-xs text-slate-500 self-center">
                          Includes {finalDocs.length} finalized document{finalDocs.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
              <CardDescription>All changes and actions on this project</CardDescription>
            </CardHeader>
            <CardContent>
              {auditEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <History className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="text-base font-medium text-slate-900 mb-1">No history yet</h4>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Changes and actions will be logged here as you work on this project.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditEntries.map((entry) => (
                    <div key={entry.id} className="p-3 border rounded-lg flex items-start gap-3">
                      <Clock className="h-4 w-4 mt-1 text-slate-400" />
                      <div className="flex-1">
                        <p className="font-medium">{entry.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span>{entry.userName}</span>
                          <span>•</span>
                          <span>{formatDateTime(entry.timestamp)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transition Confirmation Dialog */}
      <AlertDialog open={transitionDialog.open} onOpenChange={(open) => setTransitionDialog({ ...transitionDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Status Change
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to change the project status to{' '}
                <strong>{transitionDialog.status && StatusMachine.getStatusInfo(transitionDialog.status).label}</strong>.
              </p>
              {transitionDialog.effects.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="font-medium text-amber-800 mb-2">The following actions will be taken:</p>
                  <ul className="space-y-2">
                    {transitionDialog.effects.map((effect) => (
                      <li key={effect.type} className="flex items-start gap-2 text-sm text-amber-700">
                        <Check className="h-4 w-4 mt-0.5" />
                        {effect.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => transitionDialog.status && executeTransition(transitionDialog.status)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Configuration Item Dialog */}
      <AddConfigurationItemDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        onAdd={handleAddConfigurationItem}
      />

      {/* Edit Configuration Item Dialog */}
      <EditConfigurationItemDialog
        open={showEditItemDialog}
        onOpenChange={setShowEditItemDialog}
        item={editingItem}
        onSave={handleSaveConfigurationItem}
      />

      {/* Edit Quote Dialog */}
      <EditQuoteDialog
        open={showEditQuoteDialog}
        onOpenChange={setShowEditQuoteDialog}
        quote={editingQuote}
        onSave={handleSaveQuote}
      />

      {/* Amendment Dialog */}
      <AmendmentDialog
        open={showAmendmentDialog}
        onOpenChange={setShowAmendmentDialog}
        project={project}
        onSubmit={handleSubmitAmendment}
      />

      {/* Task Dialog */}
      <TaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        task={editingTask}
        onSave={handleCreateTask}
        onUpdate={handleUpdateTask}
        onLogTime={handleLogTime}
        onDeleteTimeLog={handleDeleteTimeLog}
      />

      {/* Preview Index Dialog */}
      <PreviewIndexDialog
        project={project}
        open={showPreviewIndex}
        onOpenChange={setShowPreviewIndex}
      />
    </div>
  );
}
