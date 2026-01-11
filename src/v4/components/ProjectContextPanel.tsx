/**
 * Project Context Panel - v4
 * Shows project relationships, summaries, and light AI suggestions.
 *
 * This component focuses on VISIBILITY and LINKING:
 * - Shows what's connected to what
 * - Summarizes project state in plain text
 * - Suggests next actions (text only, user decides)
 *
 * NO automation, NO enforcement, NO mandatory steps.
 */
'use client';

import { useState, useMemo } from 'react';
import {
  Lightbulb,
  Users,
  Link2,
  ClipboardList,
  ArrowRight,
  Calendar,
  Package,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  ExternalLink,
  Play,
  FileCheck,
  Ship,
} from 'lucide-react';
import type {
  Project,
  ProjectTask,
  PlanningTask,
  PlanningResource,
  ProductionStage,
} from '@/domain/models';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ============================================
// TYPES
// ============================================

interface ProjectContextPanelProps {
  project: Project;
  onNavigateToTab: (tab: string) => void;
}

interface Suggestion {
  id: string;
  icon: React.ReactNode;
  text: string;
  action?: {
    label: string;
    tab: string;
  };
  priority: 'high' | 'medium' | 'low';
}

interface Relationship {
  type: 'planning-production' | 'task-staff' | 'stage-task' | 'document-section';
  fromLabel: string;
  toLabel: string;
  count: number;
  navigateTab?: string;
}

// ============================================
// HELPERS
// ============================================

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    QUOTED: 'Quoted',
    OFFER_SENT: 'Offer Sent',
    ORDER_CONFIRMED: 'Order Confirmed',
    IN_PRODUCTION: 'In Production',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    DELIVERED: 'Delivered',
    CLOSED: 'Closed',
  };
  return labels[status] || status;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProjectContextPanel({ project, onNavigateToTab }: ProjectContextPanelProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showRelationships, setShowRelationships] = useState(true);
  const [editingSummary, setEditingSummary] = useState(false);
  const [customSummary, setCustomSummary] = useState('');

  // ============================================
  // COMPUTED DATA
  // ============================================

  // Planning data
  const planningTasks = useMemo(() => project.planning?.tasks || [], [project.planning]);
  const planningResources = useMemo(() => project.planning?.resources || [], [project.planning]);

  // Production data
  const productionTasks = useMemo(() => project.tasks || [], [project.tasks]);
  const productionStages = useMemo(() => project.productionStages || [], [project.productionStages]);

  // Linked tasks (production tasks that reference planning tasks)
  const linkedTasks = useMemo(() => {
    return productionTasks.filter((t) => t.planningTaskId);
  }, [productionTasks]);

  // Unlinked production tasks
  const unlinkedProductionTasks = useMemo(() => {
    return productionTasks.filter((t) => !t.planningTaskId);
  }, [productionTasks]);

  // Assigned production tasks
  const assignedProductionTasks = useMemo(() => {
    return productionTasks.filter((t) => t.assignedTo);
  }, [productionTasks]);

  // Unique assignees in production
  const productionAssignees = useMemo(() => {
    const assignees = new Set<string>();
    productionTasks.forEach((t) => {
      if (t.assignedTo) assignees.add(t.assignedTo);
    });
    return Array.from(assignees);
  }, [productionTasks]);

  // Tasks by stage
  const tasksByStage = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    productionTasks.forEach((t) => {
      if (t.stageId) {
        const existing = map.get(t.stageId) || [];
        existing.push(t);
        map.set(t.stageId, existing);
      }
    });
    return map;
  }, [productionTasks]);

  // Document templates count
  const documentTemplates = useMemo(() => project.documentTemplates || [], [project.documentTemplates]);

  // Compliance packs
  const compliancePacks = useMemo(() => project.compliancePacks || [], [project.compliancePacks]);

  // ============================================
  // RELATIONSHIPS
  // ============================================

  const relationships = useMemo((): Relationship[] => {
    const rels: Relationship[] = [];

    // Planning ↔ Production links
    if (linkedTasks.length > 0) {
      rels.push({
        type: 'planning-production',
        fromLabel: 'Planning Tasks',
        toLabel: 'Production Tasks',
        count: linkedTasks.length,
        navigateTab: 'production',
      });
    }

    // Tasks ↔ Staff
    if (assignedProductionTasks.length > 0) {
      rels.push({
        type: 'task-staff',
        fromLabel: 'Production Tasks',
        toLabel: 'Staff Members',
        count: productionAssignees.length,
        navigateTab: 'production',
      });
    }

    // Stages ↔ Tasks
    if (productionStages.length > 0) {
      const stagesWithTasks = Array.from(tasksByStage.keys()).length;
      if (stagesWithTasks > 0) {
        rels.push({
          type: 'stage-task',
          fromLabel: 'Production Stages',
          toLabel: 'Assigned Tasks',
          count: stagesWithTasks,
          navigateTab: 'production',
        });
      }
    }

    // Documents
    if (documentTemplates.length > 0) {
      rels.push({
        type: 'document-section',
        fromLabel: 'Document Templates',
        toLabel: 'Compliance',
        count: documentTemplates.length,
        navigateTab: 'compliance',
      });
    }

    return rels;
  }, [linkedTasks, assignedProductionTasks, productionAssignees, productionStages, tasksByStage, documentTemplates]);

  // ============================================
  // AUTO-GENERATED SUMMARY
  // ============================================

  const autoSummary = useMemo(() => {
    const parts: string[] = [];

    // Status context
    parts.push(`Project is currently ${getStatusLabel(project.status).toLowerCase()}.`);

    // Configuration
    const itemCount = project.configuration.items.length;
    if (itemCount > 0) {
      parts.push(`Configuration has ${itemCount} item${itemCount !== 1 ? 's' : ''}.`);
    } else {
      parts.push('Configuration is empty.');
    }

    // Quotes
    const quoteCount = project.quotes.length;
    if (quoteCount > 0) {
      const latestQuote = project.quotes[project.quotes.length - 1];
      parts.push(`${quoteCount} quote${quoteCount !== 1 ? 's' : ''} created, latest is ${latestQuote.status.toLowerCase().replace('_', ' ')}.`);
    }

    // Planning
    if (planningTasks.length > 0) {
      const doneTasks = planningTasks.filter((t) => t.status === 'DONE').length;
      parts.push(`Planning: ${doneTasks}/${planningTasks.length} tasks done.`);
    }

    // Production
    if (productionStages.length > 0) {
      const completedStages = productionStages.filter((s) => s.status === 'COMPLETED').length;
      parts.push(`Production: ${completedStages}/${productionStages.length} stages completed.`);
    }

    if (productionTasks.length > 0) {
      const completedTasks = productionTasks.filter((t) => t.status === 'COMPLETED').length;
      parts.push(`${completedTasks}/${productionTasks.length} production tasks done.`);
    }

    // Staff
    if (productionAssignees.length > 0) {
      parts.push(`${productionAssignees.length} staff member${productionAssignees.length !== 1 ? 's' : ''} assigned.`);
    }

    return parts.join(' ');
  }, [project, planningTasks, productionStages, productionTasks, productionAssignees]);

  // ============================================
  // SUGGESTIONS
  // ============================================

  const suggestions = useMemo((): Suggestion[] => {
    const suggs: Suggestion[] = [];

    // Empty configuration
    if (project.configuration.items.length === 0 && project.status === 'DRAFT') {
      suggs.push({
        id: 'add-config',
        icon: <Package className="h-4 w-4 text-amber-600" />,
        text: 'Configuration is empty. Add equipment items to get started.',
        action: { label: 'Add Items', tab: 'configuration' },
        priority: 'high',
      });
    }

    // No quotes yet
    if (project.quotes.length === 0 && project.configuration.items.length > 0) {
      suggs.push({
        id: 'create-quote',
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        text: 'Configuration is ready. Consider creating a quote.',
        action: { label: 'View Quotes', tab: 'quotes' },
        priority: 'medium',
      });
    }

    // Quote draft not sent
    const draftQuote = project.quotes.find((q) => q.status === 'DRAFT');
    if (draftQuote) {
      suggs.push({
        id: 'send-quote',
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        text: `Quote v${draftQuote.version} is in draft. Review and send when ready.`,
        action: { label: 'View Quote', tab: 'quotes' },
        priority: 'medium',
      });
    }

    // In production but no stages
    if (project.status === 'IN_PRODUCTION' && productionStages.length === 0) {
      suggs.push({
        id: 'init-production',
        icon: <Play className="h-4 w-4 text-green-600" />,
        text: 'Project is in production. Initialize production stages to track progress.',
        action: { label: 'Go to Production', tab: 'production' },
        priority: 'high',
      });
    }

    // In production but no planning
    if (project.status === 'IN_PRODUCTION' && planningTasks.length === 0) {
      suggs.push({
        id: 'add-planning',
        icon: <Calendar className="h-4 w-4 text-teal-600" />,
        text: 'No planning tasks yet. Add tasks and resources to schedule work.',
        action: { label: 'Go to Planning', tab: 'planning' },
        priority: 'medium',
      });
    }

    // Unlinked production tasks
    if (unlinkedProductionTasks.length > 0 && planningTasks.length > 0) {
      suggs.push({
        id: 'link-tasks',
        icon: <Link2 className="h-4 w-4 text-slate-600" />,
        text: `${unlinkedProductionTasks.length} production task${unlinkedProductionTasks.length !== 1 ? 's are' : ' is'} not linked to planning. Link them for better traceability.`,
        action: { label: 'View Tasks', tab: 'production' },
        priority: 'low',
      });
    }

    // Unassigned production tasks
    const unassignedTasks = productionTasks.filter((t) => !t.assignedTo && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    if (unassignedTasks.length > 0) {
      suggs.push({
        id: 'assign-tasks',
        icon: <Users className="h-4 w-4 text-slate-600" />,
        text: `${unassignedTasks.length} production task${unassignedTasks.length !== 1 ? 's' : ''} without assignee.`,
        action: { label: 'View Tasks', tab: 'production' },
        priority: 'low',
      });
    }

    // NEW_BUILD without boats
    if (project.type === 'NEW_BUILD' && (!project.boats || project.boats.length === 0)) {
      suggs.push({
        id: 'add-boats',
        icon: <Ship className="h-4 w-4 text-teal-600" />,
        text: 'No boats defined. Add boat instances with WIN/CIN for serial production.',
        action: { label: 'View Overview', tab: 'overview' },
        priority: 'low',
      });
    }

    // Compliance documents not started
    if (project.type === 'NEW_BUILD' && documentTemplates.length === 0 && project.status !== 'DRAFT') {
      suggs.push({
        id: 'add-docs',
        icon: <FileCheck className="h-4 w-4 text-teal-600" />,
        text: 'No compliance documents started. Consider creating Declaration of Conformity and Owner\'s Manual.',
        action: { label: 'View Compliance', tab: 'compliance' },
        priority: 'low',
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggs.slice(0, 5); // Max 5 suggestions
  }, [project, planningTasks, productionStages, productionTasks, unlinkedProductionTasks, documentTemplates]);

  // ============================================
  // RENDER
  // ============================================

  const displaySummary = customSummary || autoSummary;

  return (
    <div className="space-y-4">
      {/* Project Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-medium">Project Summary</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                if (editingSummary) {
                  setEditingSummary(false);
                } else {
                  setCustomSummary(displaySummary);
                  setEditingSummary(true);
                }
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              {editingSummary ? 'Done' : 'Edit'}
            </Button>
          </div>
          <CardDescription className="text-xs">
            {customSummary ? 'Custom summary' : 'Auto-generated from project data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editingSummary ? (
            <div className="space-y-2">
              <Textarea
                value={customSummary}
                onChange={(e) => setCustomSummary(e.target.value)}
                placeholder="Write your own project summary..."
                className="min-h-[80px] text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomSummary('');
                    setEditingSummary(false);
                  }}
                >
                  Reset to Auto
                </Button>
                <Button
                  size="sm"
                  onClick={() => setEditingSummary(false)}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">
              {displaySummary}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Relationships */}
      {relationships.length > 0 && (
        <Collapsible open={showRelationships} onOpenChange={setShowRelationships}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-teal-600" />
                    <CardTitle className="text-sm font-medium">Connections</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {relationships.length}
                    </Badge>
                  </div>
                  {showRelationships ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">{rel.fromLabel}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-600">{rel.toLabel}</span>
                        <Badge variant="outline" className="text-xs">
                          {rel.count}
                        </Badge>
                      </div>
                      {rel.navigateTab && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => onNavigateToTab(rel.navigateTab!)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {suggestions.length}
                    </Badge>
                  </div>
                  {showSuggestions ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <CardDescription className="text-xs">
                  Suggestions based on project state (no auto-actions)
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {suggestions.map((sugg) => (
                    <div
                      key={sugg.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        sugg.priority === 'high'
                          ? 'bg-amber-50 border border-amber-100'
                          : sugg.priority === 'medium'
                            ? 'bg-blue-50 border border-blue-100'
                            : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <div className="mt-0.5">{sugg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{sugg.text}</p>
                      </div>
                      {sugg.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => onNavigateToTab(sugg.action!.tab)}
                        >
                          {sugg.action.label}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Staff Overview - Enhanced */}
      {(() => {
        // Collect all unique staff names from both planning and production
        const allStaffNames = new Set<string>();

        // From production tasks
        productionTasks.forEach((t) => {
          if (t.assignedTo) allStaffNames.add(t.assignedTo);
        });

        // From planning resources
        planningResources.forEach((r) => {
          allStaffNames.add(r.name);
        });

        // From planning task assignees
        planningTasks.forEach((t) => {
          t.assigneeResourceIds?.forEach((id) => {
            const resource = planningResources.find((r) => r.id === id);
            if (resource) allStaffNames.add(resource.name);
          });
        });

        // Count unassigned tasks
        const unassignedProductionTasks = productionTasks.filter(
          (t) => !t.assignedTo && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
        ).length;
        const unassignedPlanningTasks = planningTasks.filter(
          (t) => !t.assigneeResourceIds || t.assigneeResourceIds.length === 0
        ).length;

        // Build staff summary with task counts
        const staffSummary = Array.from(allStaffNames).map((name) => {
          const prodTasks = productionTasks.filter((t) => t.assignedTo === name);
          const inProgress = prodTasks.filter((t) => t.status === 'IN_PROGRESS').length;
          const completed = prodTasks.filter((t) => t.status === 'COMPLETED').length;
          const total = prodTasks.length;

          // Find in planning resources for label
          const planningResource = planningResources.find((r) => r.name === name);

          return {
            name,
            label: planningResource?.role,
            total,
            inProgress,
            completed,
          };
        }).sort((a, b) => b.total - a.total);

        // Don't render if no staff involvement and no unassigned tasks
        if (staffSummary.length === 0 && unassignedProductionTasks === 0 && unassignedPlanningTasks === 0) {
          return null;
        }

        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-600" />
                  <CardTitle className="text-sm font-medium">Staff Involvement</CardTitle>
                  {staffSummary.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {staffSummary.length}
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs">
                Staff assigned across Planning and Production
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Staff list with task counts */}
              {staffSummary.length > 0 && (
                <div className="space-y-2">
                  {staffSummary.map((staff, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-teal-700">
                            {staff.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{staff.name}</p>
                          {staff.label && (
                            <p className="text-[10px] text-slate-500">{staff.label}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {staff.inProgress > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5">
                            {staff.inProgress} active
                          </Badge>
                        )}
                        {staff.completed > 0 && (
                          <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5">
                            {staff.completed} done
                          </Badge>
                        )}
                        <span className="text-slate-400">
                          {staff.total} task{staff.total !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unassigned tasks alert */}
              {(unassignedProductionTasks > 0 || unassignedPlanningTasks > 0) && (
                <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-700">
                      <p className="font-medium">Unassigned tasks</p>
                      <ul className="mt-1 space-y-0.5">
                        {unassignedProductionTasks > 0 && (
                          <li>
                            {unassignedProductionTasks} production task{unassignedProductionTasks !== 1 ? 's' : ''}
                            <Button
                              variant="link"
                              size="sm"
                              className="h-4 text-[10px] px-1 text-amber-700"
                              onClick={() => onNavigateToTab('production')}
                            >
                              View
                            </Button>
                          </li>
                        )}
                        {unassignedPlanningTasks > 0 && (
                          <li>
                            {unassignedPlanningTasks} planning task{unassignedPlanningTasks !== 1 ? 's' : ''}
                            <Button
                              variant="link"
                              size="sm"
                              className="h-4 text-[10px] px-1 text-amber-700"
                              onClick={() => onNavigateToTab('planning')}
                            >
                              View
                            </Button>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Planning resources not in production */}
              {planningResources.length > 0 && (
                <p className="text-[10px] text-slate-500">
                  {planningResources.length} resource{planningResources.length !== 1 ? 's' : ''} defined in Planning
                </p>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
