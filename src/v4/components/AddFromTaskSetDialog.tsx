/**
 * Add From Task Set Dialog - v4
 * Allows copying tasks from a library task set template to a project
 * Only available for NEW_BUILD projects
 */

'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Check,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type {
  ProductionProcedure,
  ProductionProcedureVersion,
  TaskSetTemplate,
} from '@/domain/models';
import { ProductionProcedureService } from '@/domain/services/ProductionProcedureService';
import { getDefaultAuditContext } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ============================================
// TYPES
// ============================================

interface AddFromTaskSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => Promise<void>;
}

interface AvailableTaskSet {
  procedure: ProductionProcedure;
  version: ProductionProcedureVersion;
  taskSets: TaskSetTemplate[];
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AddFromTaskSetDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: AddFromTaskSetDialogProps) {
  const [availableTaskSets, setAvailableTaskSets] = useState<AvailableTaskSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProcedures, setExpandedProcedures] = useState<Set<string>>(new Set());
  const [selectedTaskSet, setSelectedTaskSet] = useState<{
    procedureVersionId: string;
    taskSetId: string;
    taskSetName: string;
    taskCount: number;
  } | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingDuplicateTaskSet, setPendingDuplicateTaskSet] = useState<{
    procedureVersionId: string;
    taskSetId: string;
    taskSetName: string;
    taskCount: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadAvailableTaskSets();
    }
  }, [open, projectId]);

  async function loadAvailableTaskSets() {
    setIsLoading(true);
    try {
      const available = await ProductionProcedureService.getAvailableTaskSetsForProject(projectId);
      setAvailableTaskSets(available);

      // Auto-expand if only one procedure
      if (available.length === 1) {
        setExpandedProcedures(new Set([available[0].procedure.id]));
      }
    } catch (error) {
      console.error('Failed to load task sets:', error);
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

  function handleSelectTaskSet(
    procedureVersionId: string,
    taskSet: TaskSetTemplate
  ) {
    setSelectedTaskSet({
      procedureVersionId,
      taskSetId: taskSet.id,
      taskSetName: taskSet.name,
      taskCount: taskSet.tasks.length,
    });
  }

  async function handleCopy(forceDuplicate: boolean = false) {
    const taskSetToUse = forceDuplicate ? pendingDuplicateTaskSet : selectedTaskSet;
    if (!taskSetToUse) return;

    setIsCopying(true);
    try {
      const context = getDefaultAuditContext();
      const result = await ProductionProcedureService.copyTaskSetToProject(
        projectId,
        taskSetToUse.procedureVersionId,
        taskSetToUse.taskSetId,
        context,
        forceDuplicate
      );

      if (result.ok) {
        onOpenChange(false);
        setSelectedTaskSet(null);
        setShowDuplicateConfirm(false);
        setPendingDuplicateTaskSet(null);
        await onSuccess();
      } else if (result.error.startsWith('DUPLICATE_TASK_SET:')) {
        // Show duplicate confirmation dialog
        setPendingDuplicateTaskSet(taskSetToUse);
        setShowDuplicateConfirm(true);
      } else {
        alert(result.error);
      }
    } finally {
      setIsCopying(false);
    }
  }

  function handleCancelDuplicate() {
    setShowDuplicateConfirm(false);
    setPendingDuplicateTaskSet(null);
  }

  function handleConfirmDuplicate() {
    handleCopy(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" />
            Add Tasks from Template
          </DialogTitle>
          <DialogDescription>
            Select a task set to copy into this project. Tasks will be created as new project tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Clock className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : availableTaskSets.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">No task templates available</p>
              <p className="text-sm text-slate-400">
                Create production procedures with approved task sets in the Library to use them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableTaskSets.map(({ procedure, version, taskSets }) => {
                const isExpanded = expandedProcedures.has(procedure.id);

                return (
                  <div key={procedure.id} className="border rounded-lg">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleProcedure(procedure.id)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-400" />
                            )}
                            <div className="text-left">
                              <p className="font-medium">{procedure.name}</p>
                              {procedure.description && (
                                <p className="text-sm text-slate-500">{procedure.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              v{version.versionLabel}
                            </Badge>
                            <Badge variant="secondary">
                              {taskSets.length} set(s)
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-2">
                          {taskSets.map((taskSet) => {
                            const isSelected =
                              selectedTaskSet?.taskSetId === taskSet.id &&
                              selectedTaskSet?.procedureVersionId === version.id;

                            return (
                              <button
                                key={taskSet.id}
                                type="button"
                                onClick={() => handleSelectTaskSet(version.id, taskSet)}
                                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                  isSelected
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{taskSet.name}</p>
                                    {taskSet.description && (
                                      <p className="text-sm text-slate-500">{taskSet.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {taskSet.tasks.length} task(s)
                                    </Badge>
                                    {isSelected && (
                                      <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Preview tasks */}
                                {taskSet.tasks.length > 0 && (
                                  <div className="mt-2 text-xs text-slate-500">
                                    {taskSet.tasks.slice(0, 3).map((t) => (
                                      <span key={t.id} className="inline-block mr-2">
                                        - {t.title}
                                      </span>
                                    ))}
                                    {taskSet.tasks.length > 3 && (
                                      <span className="text-slate-400">
                                        +{taskSet.tasks.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Summary */}
        {selectedTaskSet && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-teal-600" />
              <div>
                <p className="font-medium text-teal-800">
                  {selectedTaskSet.taskSetName}
                </p>
                <p className="text-sm text-teal-600">
                  {selectedTaskSet.taskCount} task(s) will be copied to this project
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => handleCopy(false)}
            disabled={!selectedTaskSet || isCopying}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isCopying ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Copy to Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Duplicate Task Set Confirmation Dialog */}
      <Dialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Duplicate Task Set
            </DialogTitle>
            <DialogDescription>
              This task set has already been added to this project. Are you sure you want to add it again?
            </DialogDescription>
          </DialogHeader>
          {pendingDuplicateTaskSet && (
            <div className="py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="font-medium text-amber-800">
                  {pendingDuplicateTaskSet.taskSetName}
                </p>
                <p className="text-sm text-amber-600">
                  {pendingDuplicateTaskSet.taskCount} task(s) will be copied again
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDuplicate} disabled={isCopying}>
              No
            </Button>
            <Button
              onClick={handleConfirmDuplicate}
              disabled={isCopying}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isCopying ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                'Yes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
