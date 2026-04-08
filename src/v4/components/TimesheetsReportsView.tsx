/**
 * Timesheets Reports View - v4
 * Reports tab content: project selector, overview, and project detail
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  BarChart3,
  Building2,
  Users,
  Briefcase,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  Project,
  WeeklyProjectOverview,
  ProjectWeeklySummary,
  TimesheetEntry,
} from '@/domain/models';
import { TimesheetService } from '@/domain/services/TimesheetService';
import { TimesheetsOverviewChart } from './TimesheetsOverviewChart';
import { TimesheetsProjectSplitChart } from './TimesheetsProjectSplitChart';
import type { DateRange } from './DateRangePicker';

// ============================================
// TYPES
// ============================================

interface TimesheetsReportsViewProps {
  dateRange: DateRange;
  projects: Project[];
  selectedProjectId: string | null;
  showAllUsers: boolean;
  canViewAll: boolean;
  userId?: string;
  onProjectChange: (projectId: string | null) => void;
  onTotalChange?: (total: number) => void;
}

// Format date for API
function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TimesheetsReportsView({
  dateRange,
  projects,
  selectedProjectId,
  showAllUsers,
  canViewAll,
  userId,
  onProjectChange,
  onTotalChange,
}: TimesheetsReportsViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [overview, setOverview] = useState<WeeklyProjectOverview[]>([]);
  const [projectSummary, setProjectSummary] = useState<ProjectWeeklySummary | null>(null);

  // Load reports data
  const loadReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const effectiveUserId = showAllUsers && canViewAll ? undefined : userId;
      const startStr = formatDateStr(dateRange.from);
      const endStr = formatDateStr(dateRange.to);

      // Get entries for the date range
      const entries = await TimesheetService.getByDateRange(startStr, endStr, effectiveUserId);

      if (!selectedProjectId) {
        // Build overview by project from entries
        const projectMap = new Map<string, { totalHours: number; billableHours: number; entries: TimesheetEntry[] }>();

        for (const entry of entries) {
          const existing = projectMap.get(entry.projectId) || { totalHours: 0, billableHours: 0, entries: [] };
          existing.totalHours += entry.hours;
          if (entry.billable) {
            existing.billableHours += entry.hours;
          }
          existing.entries.push(entry);
          projectMap.set(entry.projectId, existing);
        }

        const overviewData: WeeklyProjectOverview[] = [];
        for (const [projectId, data] of projectMap.entries()) {
          const project = projects.find((p) => p.id === projectId);
          overviewData.push({
            projectId,
            projectTitle: project?.title || 'Unknown Project',
            isInternal: project?.isInternal,
            totalHours: data.totalHours,
            billableHours: data.billableHours,
            nonBillableHours: data.totalHours - data.billableHours,
          });
        }

        // Sort by total hours descending
        overviewData.sort((a, b) => b.totalHours - a.totalHours);

        setOverview(overviewData);
        setProjectSummary(null);

        // Report total back
        const total = overviewData.reduce((sum, p) => sum + p.totalHours, 0);
        onTotalChange?.(total);
      } else {
        // Build project summary from entries
        const projectEntries = entries.filter((e) => e.projectId === selectedProjectId);
        const project = projects.find((p) => p.id === selectedProjectId);

        // Group by user
        const userMap = new Map<string, { userName: string; totalHours: number; billableHours: number }>();
        // Group by task
        const taskMap = new Map<string, { taskTitle: string; totalHours: number }>();

        let totalHours = 0;
        let billableHours = 0;

        for (const entry of projectEntries) {
          totalHours += entry.hours;
          if (entry.billable) {
            billableHours += entry.hours;
          }

          // User breakdown
          const userExisting = userMap.get(entry.userId) || { userName: entry.userName, totalHours: 0, billableHours: 0 };
          userExisting.totalHours += entry.hours;
          if (entry.billable) {
            userExisting.billableHours += entry.hours;
          }
          userMap.set(entry.userId, userExisting);

          // Task breakdown
          if (entry.taskId) {
            const taskExisting = taskMap.get(entry.taskId) || { taskTitle: 'Task', totalHours: 0 };
            taskExisting.totalHours += entry.hours;
            taskMap.set(entry.taskId, taskExisting);
          }
        }

        const nonBillableHours = totalHours - billableHours;

        const summary: ProjectWeeklySummary = {
          projectId: selectedProjectId,
          projectTitle: project?.title || 'Unknown Project',
          isInternal: project?.isInternal,
          totalHours,
          billableHours,
          nonBillableHours,
          userBreakdown: Array.from(userMap.entries()).map(([uId, data]) => ({
            userId: uId,
            userName: data.userName || 'Unknown',
            totalHours: data.totalHours,
            billableHours: data.billableHours,
            nonBillableHours: data.totalHours - data.billableHours,
          })),
          taskBreakdown: Array.from(taskMap.entries()).map(([tId, data]) => ({
            taskId: tId,
            taskTitle: data.taskTitle,
            totalHours: data.totalHours,
          })),
        };

        setProjectSummary(summary);

        // Report total back
        onTotalChange?.(summary.totalHours);
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedProjectId, showAllUsers, canViewAll, userId, onTotalChange, projects]);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Project Selector Filter */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-slate-500 mb-1.5 block">Filter by Project</Label>
                <Select
                  value={selectedProjectId || ''}
                  onValueChange={(v) => onProjectChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects (Overview)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
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
              {selectedProjectId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onProjectChange(null)}
                  className="mt-6"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <BarChart3 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : selectedProjectId && projectSummary ? (
          <ProjectDetailSection
            summary={projectSummary}
            showAllUsers={showAllUsers}
            canViewAll={canViewAll}
          />
        ) : (
          <OverviewSection
            overview={overview}
            showAllUsers={showAllUsers}
            canViewAll={canViewAll}
            onViewProject={onProjectChange}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// OVERVIEW SECTION
// ============================================

interface OverviewSectionProps {
  overview: WeeklyProjectOverview[];
  showAllUsers: boolean;
  canViewAll: boolean;
  onViewProject: (projectId: string | null) => void;
}

function OverviewSection({
  overview,
  showAllUsers,
  canViewAll,
  onViewProject,
}: OverviewSectionProps) {
  const totalHours = overview.reduce((sum, p) => sum + p.totalHours, 0);
  const totalBillable = overview.reduce((sum, p) => sum + p.billableHours, 0);
  const totalNonBillable = overview.reduce((sum, p) => sum + p.nonBillableHours, 0);

  return (
    <>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          {showAllUsers && canViewAll ? 'All team members' : 'Your hours only'}
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Total Hours</p>
            <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Billable</p>
            <p className="text-2xl font-bold text-green-600">{totalBillable.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Non-Billable</p>
            <p className="text-2xl font-bold text-slate-600">{totalNonBillable.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overview Bar Chart */}
      <TimesheetsOverviewChart data={overview} />

      {/* Project Table */}
      {overview.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No time entries for this period</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Non-Billable</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.map((project) => (
                <TableRow key={project.projectId} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{project.projectTitle}</span>
                      {project.isInternal && (
                        <Badge variant="outline" className="text-[10px]">Internal</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {project.totalHours.toFixed(2)}h
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {project.billableHours.toFixed(2)}h
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {project.nonBillableHours.toFixed(2)}h
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewProject(project.projectId)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}

// ============================================
// PROJECT DETAIL SECTION
// ============================================

interface ProjectDetailSectionProps {
  summary: ProjectWeeklySummary;
  showAllUsers: boolean;
  canViewAll: boolean;
}

function ProjectDetailSection({
  summary,
  showAllUsers,
  canViewAll,
}: ProjectDetailSectionProps) {
  return (
    <>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-600" />
          {summary.projectTitle}
          {summary.isInternal && (
            <Badge variant="outline" className="text-xs">Internal</Badge>
          )}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Project {showAllUsers && canViewAll ? ' (All team members)' : ' (Your hours only)'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Total Hours</p>
            <p className="text-2xl font-bold text-slate-900">{summary.totalHours.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Billable</p>
            <p className="text-2xl font-bold text-green-600">{summary.billableHours.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Non-Billable</p>
            <p className="text-2xl font-bold text-slate-600">{summary.nonBillableHours.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Billable vs Non-Billable Pie Chart */}
      <TimesheetsProjectSplitChart summary={summary} />

      {/* User Breakdown */}
      {summary.userBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-600" />
              {showAllUsers && canViewAll ? 'Team Breakdown' : 'Your Breakdown'}
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Non-Billable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.userBreakdown.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell className="text-right">{user.totalHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right text-green-600">
                    {user.billableHours.toFixed(2)}h
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {user.nonBillableHours.toFixed(2)}h
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Task Breakdown */}
      {summary.taskBreakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-teal-600" />
              Task Breakdown
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.taskBreakdown.map((task) => (
                <TableRow key={task.taskId}>
                  <TableCell className="font-medium">{task.taskTitle}</TableCell>
                  <TableCell className="text-right">{task.totalHours.toFixed(2)}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-slate-500">
            No task-level breakdown available (entries not linked to specific tasks)
          </CardContent>
        </Card>
      )}
    </>
  );
}
