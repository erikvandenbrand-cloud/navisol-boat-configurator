/**
 * Work Instructions Tab - v4
 * Tab component for managing work instructions within the Library screen
 *
 * Features:
 * - Search by title/content
 * - Filter by stage category, scope, model, status
 * - List grouped by stage category (in stage order)
 * - Create/view/edit instructions
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronDown,
  Ship,
  Globe,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type {
  WorkInstruction,
  WorkInstructionScope,
  WorkInstructionStatus,
} from '@/domain/models/work-instruction';
import type { ProductionStageCode } from '@/domain/models/production';
import { DEFAULT_PRODUCTION_STAGES } from '@/domain/models/production';
import { WorkInstructionService } from '@/domain/services/WorkInstructionService';
import { BoatModelService, type BoatModel } from '@/domain/services/BoatModelService';
import { useAuth } from '@/v4/state/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { WorkInstructionViewer } from '@/v4/components/WorkInstructionViewer';
import { WorkInstructionEditor } from '@/v4/components/WorkInstructionEditor';

// ============================================
// TYPES
// ============================================

type ViewMode = 'list' | 'view' | 'edit' | 'create';

// ============================================
// CONSTANTS
// ============================================

const ALL_STAGES = '__all__';
const ALL_SCOPES = '__all__';
const ALL_MODELS = '__all__';
const ALL_STATUSES = '__all__';

// ============================================
// MAIN COMPONENT
// ============================================

export function WorkInstructionsTab() {
  // State
  const [instructions, setInstructions] = useState<WorkInstruction[]>([]);
  const [boatModels, setBoatModels] = useState<BoatModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>(ALL_STAGES);
  const [scopeFilter, setScopeFilter] = useState<string>(ALL_SCOPES);
  const [modelFilter, setModelFilter] = useState<string>(ALL_MODELS);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);

  // Auth
  const { can } = useAuth();
  const canCreate = can('library:create');
  const canEdit = can('library:update');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [instructionsData, modelsData] = await Promise.all([
        WorkInstructionService.getAll(),
        BoatModelService.getAll(),
      ]);
      setInstructions(instructionsData);
      setBoatModels(modelsData);

      // Expand all stages by default
      const stageSet = new Set<string>();
      for (const stage of DEFAULT_PRODUCTION_STAGES) {
        stageSet.add(stage.code);
      }
      setExpandedStages(stageSet);
    } catch (error) {
      console.error('Failed to load work instructions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter instructions
  const filteredInstructions = useMemo(() => {
    let result = [...instructions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (wi) =>
          wi.title.toLowerCase().includes(query) ||
          wi.content.toLowerCase().includes(query)
      );
    }

    if (stageFilter !== ALL_STAGES) {
      result = result.filter((wi) => wi.stageCategory === stageFilter);
    }

    if (scopeFilter !== ALL_SCOPES) {
      result = result.filter((wi) => wi.scope === scopeFilter);
    }

    if (modelFilter !== ALL_MODELS) {
      result = result.filter((wi) => wi.modelRef === modelFilter);
    }

    if (statusFilter !== ALL_STATUSES) {
      result = result.filter((wi) => wi.status === statusFilter);
    }

    return result;
  }, [instructions, searchQuery, stageFilter, scopeFilter, modelFilter, statusFilter]);

  // Group by stage category
  const groupedInstructions = useMemo(() => {
    const grouped = new Map<ProductionStageCode, WorkInstruction[]>();

    // Initialize with all stages in order
    for (const stage of DEFAULT_PRODUCTION_STAGES) {
      grouped.set(stage.code, []);
    }

    // Group filtered instructions
    for (const wi of filteredInstructions) {
      const list = grouped.get(wi.stageCategory) || [];
      list.push(wi);
      grouped.set(wi.stageCategory, list);
    }

    return grouped;
  }, [filteredInstructions]);

  // Get model name by ID
  const getModelName = useCallback((modelId: string | undefined) => {
    if (!modelId) return null;
    const model = boatModels.find((m) => m.id === modelId);
    return model?.name || 'Unknown Model';
  }, [boatModels]);

  // Toggle stage expansion
  const toggleStage = useCallback((stageCode: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageCode)) {
        next.delete(stageCode);
      } else {
        next.add(stageCode);
      }
      return next;
    });
  }, []);

  // View instruction
  const handleView = useCallback((id: string) => {
    setSelectedInstructionId(id);
    setViewMode('view');
  }, []);

  // Edit instruction
  const handleEdit = useCallback((id: string) => {
    setSelectedInstructionId(id);
    setViewMode('edit');
  }, []);

  // Create new instruction
  const handleCreate = useCallback(() => {
    setSelectedInstructionId(null);
    setViewMode('create');
  }, []);

  // Back to list
  const handleBack = useCallback(() => {
    setSelectedInstructionId(null);
    setViewMode('list');
    loadData(); // Refresh data
  }, []);

  // Handle duplicated - switch to edit the new copy
  const handleDuplicated = useCallback((newId: string) => {
    setSelectedInstructionId(newId);
    setViewMode('edit');
    loadData(); // Refresh data in background
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStageFilter(ALL_STAGES);
    setScopeFilter(ALL_SCOPES);
    setModelFilter(ALL_MODELS);
    setStatusFilter(ALL_STATUSES);
  }, []);

  const hasActiveFilters =
    searchQuery !== '' ||
    stageFilter !== ALL_STAGES ||
    scopeFilter !== ALL_SCOPES ||
    modelFilter !== ALL_MODELS ||
    statusFilter !== ALL_STATUSES;

  // Render view/edit mode (full screen overlay within tab)
  if (viewMode === 'view' && selectedInstructionId) {
    return (
      <WorkInstructionViewer
        workInstructionId={selectedInstructionId}
        onBack={handleBack}
        onEdit={canEdit ? () => handleEdit(selectedInstructionId) : undefined}
        onDuplicated={handleDuplicated}
      />
    );
  }

  if (viewMode === 'edit' && selectedInstructionId) {
    return (
      <WorkInstructionEditor
        workInstructionId={selectedInstructionId}
        onBack={handleBack}
        onSaved={handleBack}
      />
    );
  }

  if (viewMode === 'create') {
    return (
      <WorkInstructionEditor
        workInstructionId={null}
        onBack={handleBack}
        onSaved={handleBack}
      />
    );
  }

  // Render list mode
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <FileText className="h-12 w-12 text-teal-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading work instructions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600">
            Production work instructions organized by stage
          </p>
        </div>

        {canCreate && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Instruction
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search instructions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Stage filter */}
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STAGES}>All Stages</SelectItem>
                {DEFAULT_PRODUCTION_STAGES.map((stage) => (
                  <SelectItem key={stage.code} value={stage.code}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Scope filter */}
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCOPES}>All Scopes</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="modelSpecific">Model Specific</SelectItem>
              </SelectContent>
            </Select>

            {/* Model filter (only show if scope is modelSpecific or all) */}
            {scopeFilter !== 'general' && boatModels.length > 0 && (
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MODELS}>All Models</SelectItem>
                  {boatModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Filter className="h-4 w-4" />
        <span>
          Showing {filteredInstructions.length} of {instructions.length} instructions
        </span>
      </div>

      {/* Instructions grouped by stage */}
      {filteredInstructions.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {hasActiveFilters ? 'No Matching Instructions' : 'No Work Instructions'}
              </h3>
              <p className="text-slate-600 max-w-md">
                {hasActiveFilters
                  ? 'No instructions match your filters. Try adjusting the filters or clearing them.'
                  : 'Get started by creating your first work instruction.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              {!hasActiveFilters && canCreate && (
                <Button className="mt-4 gap-2" onClick={handleCreate}>
                  <Plus className="h-4 w-4" />
                  Create Instruction
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {DEFAULT_PRODUCTION_STAGES.map((stage) => {
            const stageInstructions = groupedInstructions.get(stage.code) || [];
            if (stageInstructions.length === 0 && stageFilter !== ALL_STAGES) {
              return null; // Hide empty stages when filtering
            }

            const isExpanded = expandedStages.has(stage.code);

            return (
              <Card key={stage.code}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleStage(stage.code)}>
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer hover:bg-slate-50/50 transition-colors p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          )}
                          <span className="text-sm font-semibold">
                            {stage.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {stageInstructions.length}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {stage.code}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3">
                      {stageInstructions.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">
                          No instructions for this stage
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {stageInstructions.map((wi) => (
                            <InstructionRow
                              key={wi.id}
                              instruction={wi}
                              modelName={getModelName(wi.modelRef)}
                              onClick={() => handleView(wi.id)}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// INSTRUCTION ROW COMPONENT
// ============================================

interface InstructionRowProps {
  instruction: WorkInstruction;
  modelName: string | null;
  onClick: () => void;
}

function InstructionRow({ instruction, modelName, onClick }: InstructionRowProps) {
  const isDraft = instruction.status === 'draft';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left group"
    >
      <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">
          {instruction.title}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
          {/* Scope indicator */}
          {instruction.scope === 'general' ? (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              General
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Ship className="h-3 w-3" />
              {modelName || 'Model Specific'}
            </span>
          )}

          {/* Attachment count */}
          {instruction.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {instruction.attachments.length} file{instruction.attachments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge
        variant={isDraft ? 'outline' : 'default'}
        className={
          isDraft
            ? 'border-amber-300 text-amber-700 bg-amber-50'
            : 'bg-green-100 text-green-700 border-green-200'
        }
      >
        {isDraft ? (
          <>
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </>
        ) : (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Published
          </>
        )}
      </Badge>

      <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
