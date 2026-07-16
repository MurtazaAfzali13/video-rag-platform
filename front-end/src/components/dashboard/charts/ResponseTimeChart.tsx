"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, SectionTitle } from "../shared";
import { responseTime } from "@/mock/dashboard";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-sm font-semibold text-cyan-300">{payload[0].value}s avg</p>
    </div>
  );
}

export function ResponseTimeChart() {
  const avg = (responseTime.reduce((s, d) => s + d.value, 0) / responseTime.length).toFixed(1);
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
      <SectionTitle title="Response Time (Avg.)" subtitle="Average latency vs last week" />
      <div className="px-5 pb-2 pt-1">
        <span className="text-2xl font-bold text-white">{avg}s</span>
        <span className="ml-2 text-xs font-medium text-emerald-400">-8.3% vs last week</span>
      </div>
      <div className="h-32 px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={responseTime} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
