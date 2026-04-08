/**
 * Planning Summary Drilldown - v4.2
 *
 * View-only dialog showing production tasks that a planning summary references.
 * No editing allowed here; this is purely for visibility into underlying tasks.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Tag,
  Layers,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { WorkItem, TaskCategory, WorkItemStatus } from '@/domain/models';
import { PlanningSummaryService, CATEGORY_LABELS } from '@/domain/services/PlanningSummaryService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

// ============================================
// STATUS DISPLAY
// ============================================

const STATUS_CONFIG: Record<WorkItemStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  TODO: { label: 'To Do', color: 'bg-slate-100 text-slate-700', icon: AlertCircle },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

function StatusBadge({ status }: { status: WorkItemStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ============================================
// PROPS
// ============================================

interface PlanningSummaryDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** The summary work item (accepts either 'summary' or 'summaryTask' prop name) */
  summary?: WorkItem | null;
  summaryTask?: WorkItem | null;
  onNavigateToTask?: (taskId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export function PlanningSummaryDrilldown({
  open,
  onOpenChange,
  projectId,
  summary: summaryProp,
  summaryTask,
  onNavigateToTask,
}: PlanningSummaryDrilldownProps) {
  // Accept either summary or summaryTask prop
  const summary = summaryProp || summaryTask;
  const [productionItems, setProductionItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && summary?.id) {
      loadProductionItems();
    }
  }, [open, summary?.id]);

  async function loadProductionItems() {
    if (!summary) return;
    setIsLoading(true);
    try {
      const items = await PlanningSummaryService.getProductionItemsForSummary(
        projectId,
        summary.id
      );
      setProductionItems(items);
    } finally {
      setIsLoading(false);
    }
  }

  if (!summary || !summary.summarizes) {
    return null;
  }

  // Get label based on summary type (stage, procedure, or legacy category)
  const summarizes = summary.summarizes;
  let summaryLabel: string;
  if (summarizes.summaryType === 'stage' && summarizes.stageId) {
    summaryLabel = summary.title; // Stage name is in title
  } else if (summarizes.summaryType === 'procedure' && summarizes.procedureId) {
    summaryLabel = summary.title; // Procedure name is in title
  } else if (summarizes.category) {
    summaryLabel = CATEGORY_LABELS[summarizes.category] || summary.title;
  } else {
    summaryLabel = summary.title;
  }

  // Calculate stats
  const completedCount = productionItems.filter((i) => i.status === 'COMPLETED').length;
  const inProgressCount = productionItems.filter((i) => i.status === 'IN_PROGRESS').length;
  const totalEstimatedHours = productionItems.reduce(
    (sum, i) => sum + (i.estimatedHours || 0),
    0
  );
  const totalLoggedHours = productionItems.reduce(
    (sum, i) => sum + (i.totalLoggedHours || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-600" />
            {summaryLabel} Tasks
            <Badge variant="outline" className="ml-2">
              {productionItems.length} production tasks
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View-only list of production tasks summarized by this planning item.
            To edit tasks, go to the Production tab.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 py-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-700">{productionItems.length}</p>
            <p className="text-xs text-slate-500">Total Tasks</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{completedCount}</p>
            <p className="text-xs text-green-600">Completed</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{inProgressCount}</p>
            <p className="text-xs text-blue-600">In Progress</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {totalLoggedHours}/{totalEstimatedHours}h
            </p>
            <p className="text-xs text-amber-600">Hours (Logged/Est.)</p>
          </div>
        </div>

        {/* Last Generated Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pb-2 border-b">
          <RefreshCw className="h-3 w-3" />
          <span>
            Last generated:{' '}
            {new Date(summary.summarizes.lastGeneratedAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Task Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : productionItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500">No production tasks found.</p>
              <p className="text-sm text-slate-400">
                The referenced tasks may have been deleted.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Est. Hours</TableHead>
                  <TableHead className="text-right">Logged</TableHead>
                  <TableHead>Due Date</TableHead>
                  {onNavigateToTask && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionItems.map((item) => (
                  <TableRow key={item.id} className={item.status === 'COMPLETED' ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {item.workItemNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className={`font-medium ${item.status === 'COMPLETED' ? 'line-through' : ''}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.estimatedHours ? `${item.estimatedHours}h` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {(item.totalLoggedHours || 0) > 0 ? `${item.totalLoggedHours}h` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : '-'}
                    </TableCell>
                    {onNavigateToTask && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => onNavigateToTask(item.id)}
                          title="Go to task in Production tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-slate-500">
            <Eye className="h-3 w-3 inline mr-1" />
            This is a view-only list. Edit tasks in the Production tab.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlanningSummaryDrilldown;
