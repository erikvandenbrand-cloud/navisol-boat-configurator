/**
 * Date Utilities - Planning Work Items
 *
 * Centralized date computation for planning items.
 * All date-related logic should go here, not in UI components.
 *
 * Key principles:
 * - Derivation happens ONLY on explicit actions (Generate/Refresh/Recalculate)
 * - No render-time recomputation
 * - No background sync
 * - All dates are YYYY-MM-DD format
 */

import type { WorkItem } from '@/domain/models';

// ============================================
// DATE FORMAT
// ============================================

/**
 * Valid date format: YYYY-MM-DD (ISO 8601 date only)
 */
const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check if a date string is valid YYYY-MM-DD format
 */
export function isValidDateFormat(dateStr: string | undefined): boolean {
  if (!dateStr) return true;
  return YYYY_MM_DD_REGEX.test(dateStr);
}

/**
 * Parse a YYYY-MM-DD date string to Date object.
 * Returns undefined if invalid.
 */
export function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

/**
 * Format a Date object to YYYY-MM-DD string.
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate difference in days between two dates.
 */
export function diffDays(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// EFFECTIVE END DATE
// ============================================

/**
 * Get effective end date for a work item.
 *
 * Priority:
 * 1. endDate if present
 * 2. startDate + durationDays - 1 if both present
 * 3. undefined otherwise
 *
 * This is the ONLY place where effective end date is computed.
 * UI components should call this function, not implement their own logic.
 */
export function getEffectiveEndDate(item: WorkItem): string | undefined {
  // Direct endDate takes priority
  if (item.endDate) {
    return item.endDate;
  }

  // Calculate from startDate + durationDays
  if (item.startDate && item.durationDays && item.durationDays > 0) {
    const start = parseDate(item.startDate);
    if (!start) return undefined;
    const end = addDays(start, item.durationDays - 1);
    return formatDateISO(end);
  }

  return undefined;
}

/**
 * Check if a work item has a valid date range for Gantt display.
 *
 * Requires:
 * - startDate is present
 * - Either endDate is present OR durationDays > 0
 */
export function hasValidDateRange(item: WorkItem): boolean {
  if (!item.startDate) return false;
  return !!item.endDate || !!(item.durationDays && item.durationDays > 0);
}

/**
 * Check if a work item can be displayed on a Gantt chart.
 * Alias for hasValidDateRange for semantic clarity.
 */
export function canShowOnGantt(item: WorkItem): boolean {
  return hasValidDateRange(item);
}

// ============================================
// DATE DERIVATION (PRODUCTION ITEMS)
// ============================================

/**
 * Derive start date from production items.
 * Returns the minimum startDate from items that have a startDate.
 * Returns undefined if no items have a startDate.
 */
export function deriveMinStartDate(productionItems: WorkItem[]): string | undefined {
  const startDates = productionItems
    .map((i) => i.startDate)
    .filter((d): d is string => !!d);

  if (startDates.length === 0) return undefined;

  return startDates.sort()[0];
}

/**
 * Derive end date from production items.
 * Returns the maximum of endDate/dueDate/completedAt from items.
 * Returns undefined if no items have any end date.
 */
export function deriveMaxEndDate(productionItems: WorkItem[]): string | undefined {
  const endDates = productionItems
    .map((i) => i.endDate || i.dueDate || i.completedAt)
    .filter((d): d is string => !!d);

  if (endDates.length === 0) return undefined;

  // Sort descending to get max
  return endDates.sort().reverse()[0];
}

// ============================================
// DATE RANGE FORMATTING
// ============================================

/**
 * Format a date range for display.
 * Examples:
 * - "Jan 15 → Feb 28"
 * - "From Jan 15"
 * - "Until Feb 28"
 * - "—" (no dates)
 */
export function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '—';

  const formatSingle = (dateStr: string): string => {
    const date = parseDate(dateStr);
    if (!date) return dateStr;
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (startDate && !endDate) return `From ${formatSingle(startDate)}`;
  if (!startDate && endDate) return `Until ${formatSingle(endDate)}`;
  return `${formatSingle(startDate!)} → ${formatSingle(endDate!)}`;
}

/**
 * Format a single date for display.
 * Example: "15 Jan"
 */
export function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// ============================================
// NORMALIZE DATE
// ============================================

/**
 * Normalize a date string to YYYY-MM-DD format.
 * Handles ISO datetime strings by extracting the date portion.
 * Returns undefined if the input is invalid.
 */
export function normalizeDateToYYYYMMDD(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;

  // Already valid YYYY-MM-DD
  if (YYYY_MM_DD_REGEX.test(dateStr)) {
    return dateStr;
  }

  // Try to parse and convert (handles ISO datetime, etc.)
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return formatDateISO(date);
  } catch {
    return undefined;
  }
}
