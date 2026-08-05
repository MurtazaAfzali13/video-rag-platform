"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, SectionTitle } from "../shared";
import { salesOverview as defaultSalesOverview } from "@/mock/dashboard";
import { useDashboard } from "@/context/DashboardContext";
import type { ChartPoint } from "@/types/dashboard";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white">
        Questions:{" "}
        <span className="text-purple-300">{payload[0].value.toLocaleString("en-US")}</span>
      </p>
    </div>
  );
}

export function SalesOverviewChart() {
  const { state } = useDashboard();
  const { questionsMetrics, isQuestionsLoading } = state;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (questionsMetrics?.chart_data?.length) {
      return questionsMetrics.chart_data.map((point) => ({
        label: point.label,
        value: point.value,
      }));
    }
    return defaultSalesOverview;
  }, [questionsMetrics]);

  return (
    <Card
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <SectionTitle
        title="Questions Overview"
        subtitle="Questions asked across all workspaces this week"
        action={
          <select
            className="rounded-lg border border-white/[0.06] bg-gray-400 px-2.5 py-1.5 text-xs text-white/60 outline-none"
            defaultValue="week"
            aria-label="Select time range"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        }
      />
      <div className="relative h-64 px-2 pb-4 pt-4 sm:h-72 sm:px-4">
        {isQuestionsLoading && !questionsMetrics && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#60a5fa"
              strokeWidth={2.5}
              fill="url(#salesGradient)"
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
