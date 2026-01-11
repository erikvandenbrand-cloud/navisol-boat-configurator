/**
 * Timesheets Period Toggle - v4
 * Week/Month toggle with period navigation
 */

'use client';

import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  formatDate,
  formatMonth,
} from '@/domain/models';

// ============================================
// TYPES
// ============================================

export type PeriodMode = 'week' | 'month';

interface TimesheetsPeriodToggleProps {
  periodMode: PeriodMode;
  currentDate: Date;
  periodTotal: number;
  onPeriodModeChange: (mode: PeriodMode) => void;
  onDateChange: (date: Date) => void;
}

// ============================================
// COMPONENT
// ============================================

export function TimesheetsPeriodToggle({
  periodMode,
  currentDate,
  periodTotal,
  onPeriodModeChange,
  onDateChange,
}: TimesheetsPeriodToggleProps) {
  // Period navigation
  function goToPrevious() {
    const prev = new Date(currentDate);
    if (periodMode === 'week') {
      prev.setDate(prev.getDate() - 7);
    } else {
      prev.setMonth(prev.getMonth() - 1);
    }
    onDateChange(prev);
  }

  function goToNext() {
    const next = new Date(currentDate);
    if (periodMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    onDateChange(next);
  }

  function goToToday() {
    onDateChange(new Date());
  }

  // Get period dates
  const periodStart = periodMode === 'week' ? getWeekStart(currentDate) : getMonthStart(currentDate);
  const periodEnd = periodMode === 'week' ? getWeekEnd(currentDate) : getMonthStart(currentDate);

  // Check if this is current period
  const isCurrentPeriod = periodMode === 'week'
    ? formatDate(getWeekStart(new Date())) === formatDate(periodStart)
    : (new Date().getMonth() === periodStart.getMonth() && new Date().getFullYear() === periodStart.getFullYear());

  // Period display text
  const periodDisplayText = periodMode === 'week'
    ? `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${getWeekEnd(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : formatMonth(periodStart);

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Period Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mr-4">
            <Button
              variant={periodMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPeriodModeChange('week')}
              className={periodMode === 'week' ? 'bg-white shadow-sm' : ''}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Week
            </Button>
            <Button
              variant={periodMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPeriodModeChange('month')}
              className={periodMode === 'month' ? 'bg-white shadow-sm' : ''}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Month
            </Button>
          </div>

          {/* Navigation */}
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentPeriod && (
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
          )}
        </div>

        <div className="text-center">
          <h2 className="font-semibold text-slate-900">
            {periodDisplayText}
          </h2>
        </div>

        <div className="text-right">
          <span className="text-sm text-slate-500">{periodMode === 'week' ? 'Week' : 'Month'} Total:</span>
          <span className="ml-2 font-bold text-lg text-slate-900">
            {periodTotal.toFixed(2)}h
          </span>
        </div>
      </div>
    </div>
  );
}
