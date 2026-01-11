/**
 * Timesheet Charts Tests
 * Minimal tests to ensure charts render without crashing
 */

import { describe, test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { TimesheetsOverviewChart } from '@/v4/components/TimesheetsOverviewChart';
import { TimesheetsProjectSplitChart } from '@/v4/components/TimesheetsProjectSplitChart';
import type { WeeklyProjectOverview, ProjectWeeklySummary } from '@/domain/models';

// ============================================
// OVERVIEW CHART TESTS
// ============================================

describe('TimesheetsOverviewChart', () => {
  test('should render without crashing when data exists', () => {
    const data: WeeklyProjectOverview[] = [
      {
        projectId: 'p1',
        projectTitle: 'Project Alpha',
        totalHours: 20,
        billableHours: 15,
        nonBillableHours: 5,
      },
      {
        projectId: 'p2',
        projectTitle: 'Project Beta',
        totalHours: 10,
        billableHours: 10,
        nonBillableHours: 0,
      },
    ];

    // Should not throw
    const html = renderToString(
      <TimesheetsOverviewChart data={data} periodLabel="Weekly" />
    );

    // Check for key elements (HTML comments may split text)
    expect(html).toContain('Weekly');
    expect(html).toContain('Hours by Project');
    expect(html).toContain('recharts');
  });

  test('should return null when data is empty', () => {
    const html = renderToString(
      <TimesheetsOverviewChart data={[]} periodLabel="Weekly" />
    );

    // Should render nothing (empty string or minimal wrapper)
    expect(html).toBe('');
  });

  test('should handle long project names', () => {
    const data: WeeklyProjectOverview[] = [
      {
        projectId: 'p1',
        projectTitle: 'This Is A Very Long Project Name That Should Be Truncated',
        totalHours: 8,
        billableHours: 8,
        nonBillableHours: 0,
      },
    ];

    const html = renderToString(
      <TimesheetsOverviewChart data={data} periodLabel="Monthly" />
    );

    expect(html).toContain('Monthly');
    expect(html).toContain('Hours by Project');
  });
});

// ============================================
// PROJECT SPLIT CHART TESTS
// ============================================

describe('TimesheetsProjectSplitChart', () => {
  test('should render without crashing when summary has hours', () => {
    const summary: ProjectWeeklySummary = {
      projectId: 'p1',
      projectTitle: 'Test Project',
      totalHours: 30,
      billableHours: 20,
      nonBillableHours: 10,
      userBreakdown: [],
      taskBreakdown: [],
    };

    const html = renderToString(
      <TimesheetsProjectSplitChart summary={summary} periodLabel="Weekly" />
    );

    expect(html).toContain('Weekly');
    expect(html).toContain('Hours Distribution');
    expect(html).toContain('Billable');
  });

  test('should return null when totalHours is zero', () => {
    const summary: ProjectWeeklySummary = {
      projectId: 'p1',
      projectTitle: 'Empty Project',
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      userBreakdown: [],
      taskBreakdown: [],
    };

    const html = renderToString(
      <TimesheetsProjectSplitChart summary={summary} periodLabel="Weekly" />
    );

    expect(html).toBe('');
  });

  test('should calculate correct billable percentage', () => {
    const summary: ProjectWeeklySummary = {
      projectId: 'p1',
      projectTitle: 'Test Project',
      totalHours: 100,
      billableHours: 75,
      nonBillableHours: 25,
      userBreakdown: [],
      taskBreakdown: [],
    };

    const html = renderToString(
      <TimesheetsProjectSplitChart summary={summary} periodLabel="Monthly" />
    );

    // Should show 75% billable
    expect(html).toContain('75');
    expect(html).toContain('%');
  });

  test('should handle all billable hours (100%)', () => {
    const summary: ProjectWeeklySummary = {
      projectId: 'p1',
      projectTitle: 'All Billable',
      totalHours: 40,
      billableHours: 40,
      nonBillableHours: 0,
      userBreakdown: [],
      taskBreakdown: [],
    };

    const html = renderToString(
      <TimesheetsProjectSplitChart summary={summary} periodLabel="Weekly" />
    );

    expect(html).toContain('100');
  });

  test('should handle all non-billable hours (0% billable)', () => {
    const summary: ProjectWeeklySummary = {
      projectId: 'p1',
      projectTitle: 'All Non-Billable',
      totalHours: 20,
      billableHours: 0,
      nonBillableHours: 20,
      userBreakdown: [],
      taskBreakdown: [],
    };

    const html = renderToString(
      <TimesheetsProjectSplitChart summary={summary} periodLabel="Weekly" />
    );

    // Should show 0%
    expect(html).toContain('>0<');
  });
});
