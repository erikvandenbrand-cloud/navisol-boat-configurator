/**
 * Timesheets Overview Chart - v4
 * Bar chart showing total hours per project for the current period
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { WeeklyProjectOverview } from '@/domain/models';

interface TimesheetsOverviewChartProps {
  data: WeeklyProjectOverview[];
  periodLabel: string;
}

const COLORS = [
  '#0d9488', // teal-600
  '#0891b2', // cyan-600
  '#0284c7', // sky-600
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#c026d3', // fuchsia-600
  '#db2777', // pink-600
  '#e11d48', // rose-600
];

export function TimesheetsOverviewChart({ data, periodLabel }: TimesheetsOverviewChartProps) {
  // No chart if no data
  if (data.length === 0) {
    return null;
  }

  // Prepare chart data - limit to top 8 projects for readability
  const chartData = data.slice(0, 8).map((project, index) => ({
    name: project.projectTitle.length > 20
      ? project.projectTitle.slice(0, 18) + '...'
      : project.projectTitle,
    fullName: project.projectTitle,
    hours: project.totalHours,
    billable: project.billableHours,
    nonBillable: project.nonBillableHours,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-teal-600" />
          {periodLabel} Hours by Project
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tickFormatter={(value) => `${value}h`}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={95}
                fontSize={11}
                tick={{ fill: '#64748b' }}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)}h`, 'Total Hours']}
                labelFormatter={(label, payload) => {
                  if (payload?.[0]?.payload?.fullName) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
