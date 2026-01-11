/**
 * Timesheets Project Split Chart - v4
 * Donut chart showing billable vs non-billable hours for a project
 */

'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon } from 'lucide-react';
import type { ProjectWeeklySummary } from '@/domain/models';

interface TimesheetsProjectSplitChartProps {
  summary: ProjectWeeklySummary;
  periodLabel: string;
}

const COLORS = {
  billable: '#16a34a', // green-600
  nonBillable: '#64748b', // slate-500
};

export function TimesheetsProjectSplitChart({
  summary,
  periodLabel,
}: TimesheetsProjectSplitChartProps) {
  // No chart if no hours
  if (summary.totalHours === 0) {
    return null;
  }

  const chartData = [
    { name: 'Billable', value: summary.billableHours, color: COLORS.billable },
    { name: 'Non-Billable', value: summary.nonBillableHours, color: COLORS.nonBillable },
  ].filter((d) => d.value > 0);

  // If only one type, still show it
  if (chartData.length === 0) {
    return null;
  }

  const billablePercent = summary.totalHours > 0
    ? Math.round((summary.billableHours / summary.totalHours) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-teal-600" />
          {periodLabel} Hours Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full flex items-center">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}h`, '']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-xs text-slate-600">
                      {value}: {entry.payload.value.toFixed(2)}h
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-24 text-center">
            <div className="text-3xl font-bold text-green-600">{billablePercent}%</div>
            <div className="text-xs text-slate-500">Billable</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
