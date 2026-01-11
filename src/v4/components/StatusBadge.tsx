'use client';

import type { ProjectStatus, QuoteStatus, DocumentStatus, TaskStatus } from '@/domain/models';

/**
 * Centralized status badge component for consistent styling across the app
 * Uses softer, calmer colors for a more pleasant experience
 */

// ============================================
// STATUS CONFIGURATIONS
// ============================================

const PROJECT_STATUS_STYLES: Record<ProjectStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  QUOTED: { label: 'Quoted', className: 'bg-sky-50 text-sky-700' },
  OFFER_SENT: { label: 'Offer Sent', className: 'bg-indigo-50 text-indigo-700' },
  ORDER_CONFIRMED: { label: 'Confirmed', className: 'bg-teal-50 text-teal-700' },
  IN_PRODUCTION: { label: 'In Production', className: 'bg-amber-50 text-amber-700' },
  READY_FOR_DELIVERY: { label: 'Ready', className: 'bg-emerald-50 text-emerald-700' },
  DELIVERED: { label: 'Delivered', className: 'bg-green-50 text-green-700' },
  CLOSED: { label: 'Closed', className: 'bg-slate-50 text-slate-500' },
};

const QUOTE_STATUS_STYLES: Record<QuoteStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  SENT: { label: 'Sent', className: 'bg-sky-50 text-sky-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-600' },
  EXPIRED: { label: 'Expired', className: 'bg-amber-50 text-amber-600' },
  SUPERSEDED: { label: 'Superseded', className: 'bg-slate-50 text-slate-500' },
};

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  FINAL: { label: 'Final', className: 'bg-green-50 text-green-700 border border-green-200' },
  SUPERSEDED: { label: 'Superseded', className: 'bg-slate-50 text-slate-500 border border-slate-200' },
  ARCHIVED: { label: 'Archived', className: 'bg-slate-50 text-slate-400 border border-slate-100' },
};

const TASK_STATUS_STYLES: Record<TaskStatus, { label: string; className: string }> = {
  TODO: { label: 'To Do', className: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-sky-50 text-sky-700' },
  ON_HOLD: { label: 'On Hold', className: 'bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-50 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-50 text-red-600' },
};

const TASK_PRIORITY_STYLES: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-slate-50 text-slate-500' },
  MEDIUM: { label: 'Medium', className: 'bg-sky-50 text-sky-600' },
  HIGH: { label: 'High', className: 'bg-amber-50 text-amber-700' },
  URGENT: { label: 'Urgent', className: 'bg-red-50 text-red-700' },
};

// ============================================
// COMPONENTS
// ============================================

interface StatusBadgeProps {
  className?: string;
}

interface ProjectStatusBadgeProps extends StatusBadgeProps {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status, className = '' }: ProjectStatusBadgeProps) {
  const config = PROJECT_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

interface QuoteStatusBadgeProps extends StatusBadgeProps {
  status: QuoteStatus;
}

export function QuoteStatusBadge({ status, className = '' }: QuoteStatusBadgeProps) {
  const config = QUOTE_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

interface DocumentStatusBadgeProps extends StatusBadgeProps {
  status: DocumentStatus;
}

export function DocumentStatusBadge({ status, className = '' }: DocumentStatusBadgeProps) {
  const config = DOCUMENT_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

interface TaskStatusBadgeProps extends StatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status, className = '' }: TaskStatusBadgeProps) {
  const config = TASK_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

interface TaskPriorityBadgeProps extends StatusBadgeProps {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export function TaskPriorityBadge({ priority, className = '' }: TaskPriorityBadgeProps) {
  const config = TASK_PRIORITY_STYLES[priority];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

// Export style configs for use in other components
export {
  PROJECT_STATUS_STYLES,
  QUOTE_STATUS_STYLES,
  DOCUMENT_STATUS_STYLES,
  TASK_STATUS_STYLES,
  TASK_PRIORITY_STYLES,
};
