"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, SectionTitle } from "../shared";
import { useDashboard } from "@/context/DashboardContext";
import { workflowDistribution as defaultWorkflowDistribution } from "@/mock/dashboard";

const CORE_NODE_IDS = ["retriever", "validator", "generator", "web-search"] as const;

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <p className="text-sm font-semibold text-white">{d.label}</p>
      <p className="text-xs text-white/50">
        {d.value.toLocaleString("en-US")} runs · {d.percentage}%
      </p>
    </div>
  );
}

export function NodeExecutionBarChart() {
  const { state } = useDashboard();
  const { workflowDistribution, isLoading } = state;

  const chartData = useMemo(() => {
    return CORE_NODE_IDS.map((nodeId) => {
      const blueprint = defaultWorkflowDistribution.find((d) => d.id === nodeId)!;
      const fromApi = workflowDistribution.find((d) => d.id === nodeId);
      return fromApi ?? { ...blueprint, value: 0, percentage: 0 };
    });
  }, [workflowDistribution]);

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
      <div className="p-5 pb-0">
        <SectionTitle title="Node Execution" subtitle="Runs per LangGraph node" />
      </div>

      <div className="h-56 px-2 pb-4 pt-4 sm:px-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1000}>
                {chartData.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
