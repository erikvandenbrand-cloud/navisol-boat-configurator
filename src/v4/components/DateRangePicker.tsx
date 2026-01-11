/**
 * DateRangePicker - v4
 * Reusable date range picker with From/To inputs and presets
 * UI-only filtering component, does NOT mutate any data
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================
// TYPES
// ============================================

export interface DateRange {
  from: Date;
  to: Date;
}

export type DateRangePreset = 'this-week' | 'next-week' | 'last-7-days' | 'this-month';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  showPresets?: boolean;
  className?: string;
}

// ============================================
// DATE HELPERS
// ============================================

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateDisplayLong(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================
// PRESET HELPERS
// ============================================

export function getPresetRange(preset: DateRangePreset): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'this-week':
      return { from: startOfWeek(today), to: endOfWeek(today) };
    case 'next-week': {
      const nextWeekStart = addDays(startOfWeek(today), 7);
      return { from: nextWeekStart, to: endOfWeek(nextWeekStart) };
    }
    case 'last-7-days':
      return { from: addDays(today, -6), to: today };
    case 'this-month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    default:
      return { from: startOfWeek(today), to: endOfWeek(today) };
  }
}

export function getActivePreset(range: DateRange): DateRangePreset | null {
  const presets: DateRangePreset[] = ['this-week', 'next-week', 'last-7-days', 'this-month'];

  for (const preset of presets) {
    const presetRange = getPresetRange(preset);
    if (
      formatDateISO(range.from) === formatDateISO(presetRange.from) &&
      formatDateISO(range.to) === formatDateISO(presetRange.to)
    ) {
      return preset;
    }
  }
  return null;
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
  'this-week': 'This Week',
  'next-week': 'Next Week',
  'last-7-days': 'Last 7 Days',
  'this-month': 'This Month',
};

// ============================================
// COMPONENT
// ============================================

export function DateRangePicker({
  value,
  onChange,
  showPresets = true,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Detect active preset
  const activePreset = useMemo(() => getActivePreset(value), [value]);

  // Display text
  const displayText = useMemo(() => {
    if (activePreset) {
      return PRESET_LABELS[activePreset];
    }
    return `${formatDateDisplay(value.from)} - ${formatDateDisplayLong(value.to)}`;
  }, [value, activePreset]);

  // Handle preset click
  const handlePresetClick = useCallback((preset: DateRangePreset) => {
    onChange(getPresetRange(preset));
    setIsOpen(false);
  }, [onChange]);

  // Handle manual date change
  const handleFromChange = useCallback((dateStr: string) => {
    const newFrom = parseDate(dateStr);
    if (!Number.isNaN(newFrom.getTime())) {
      onChange({ from: newFrom, to: value.to >= newFrom ? value.to : newFrom });
    }
  }, [onChange, value.to]);

  const handleToChange = useCallback((dateStr: string) => {
    const newTo = parseDate(dateStr);
    if (!Number.isNaN(newTo.getTime())) {
      onChange({ from: value.from <= newTo ? value.from : newTo, to: newTo });
    }
  }, [onChange, value.from]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 min-w-[180px] justify-between ${className}`}
          data-testid="date-range-picker-trigger"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span>{displayText}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          {/* Presets */}
          {showPresets && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Presets
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PRESET_LABELS) as DateRangePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    variant={activePreset === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetClick(preset)}
                    className={activePreset === preset ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  >
                    {PRESET_LABELS[preset]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Date Range */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Custom Range
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="date-from" className="text-xs text-slate-600">
                  From
                </label>
                <Input
                  id="date-from"
                  type="date"
                  value={formatDateISO(value.from)}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="date-range-from"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="date-to" className="text-xs text-slate-600">
                  To
                </label>
                <Input
                  id="date-to"
                  type="date"
                  value={formatDateISO(value.to)}
                  onChange={(e) => handleToChange(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="date-range-to"
                />
              </div>
            </div>
          </div>

          {/* Apply button for custom range */}
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// HELPER EXPORT FOR DISPLAY
// ============================================

export function formatRangeLabel(range: DateRange): string {
  const preset = getActivePreset(range);
  if (preset) {
    return PRESET_LABELS[preset];
  }
  return `${formatDateDisplay(range.from)} - ${formatDateDisplayLong(range.to)}`;
}
