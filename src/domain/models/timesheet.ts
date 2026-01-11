/**
 * Timesheet Model - v4
 * Time entries for project work tracking
 */

import type { Entity } from './common';

// ============================================
// TIMESHEET ENTRY
// ============================================

export interface TimesheetEntry extends Entity {
  userId: string;
  userName: string; // Snapshot for display

  // Time
  date: string; // YYYY-MM-DD
  hours: number; // 0.25 increments allowed, max 24

  // References
  projectId: string;
  taskId?: string; // Optional link to specific task

  // Billing
  billable: boolean;
  billingRate?: number; // Store only, no calculations

  // Notes
  note?: string;

  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateTimesheetEntryInput {
  date: string;
  hours: number;
  projectId: string;
  taskId?: string;
  billable: boolean;
  billingRate?: number;
  note?: string;
}

export interface UpdateTimesheetEntryInput {
  date?: string;
  hours?: number;
  projectId?: string;
  taskId?: string;
  billable?: boolean;
  billingRate?: number;
  note?: string;
}

// ============================================
// WEEKLY VIEW TYPES
// ============================================

export interface TimesheetWeek {
  startDate: string; // Monday YYYY-MM-DD
  endDate: string; // Sunday YYYY-MM-DD
  entries: TimesheetEntry[];
  dailyTotals: Record<string, number>; // date -> total hours
  weekTotal: number;
}

// ============================================
// MONTHLY VIEW TYPES
// ============================================

export interface TimesheetMonth {
  startDate: string; // First day of month YYYY-MM-DD
  endDate: string; // Last day of month YYYY-MM-DD
  entries: TimesheetEntry[];
  dailyTotals: Record<string, number>; // date -> total hours
  monthTotal: number;
}

// ============================================
// REPORT TYPES
// ============================================

export interface ProjectWeeklySummary {
  projectId: string;
  projectTitle: string;
  isInternal?: boolean;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  userBreakdown: UserHoursSummary[];
  taskBreakdown: TaskHoursSummary[];
}

export interface UserHoursSummary {
  userId: string;
  userName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
}

export interface TaskHoursSummary {
  taskId: string;
  taskTitle: string;
  totalHours: number;
}

export interface WeeklyProjectOverview {
  projectId: string;
  projectTitle: string;
  isInternal?: boolean;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate hours value (0.25 increments, max 24)
 */
export function isValidHours(hours: number): boolean {
  if (hours <= 0 || hours > 24) return false;
  // Check 0.25 increments
  return (hours * 4) % 1 === 0;
}

/**
 * Round hours to nearest 0.25
 */
export function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

/**
 * Get the Monday of the week for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Sunday of the week for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

/**
 * Get the first day of the month for a given date
 */
export function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the last day of the month for a given date
 */
export function getMonthEnd(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // Last day of previous month
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get number of days in a month
 */
export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Format month for display (e.g., "January 2025")
 */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD to Date
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}
