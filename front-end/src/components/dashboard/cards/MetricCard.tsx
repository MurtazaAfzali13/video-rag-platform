"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card } from "../shared/Card";
import { cn } from "@/lib/dashboard-cn";
import type { DashboardMetric } from "@/types/dashboard";

const colorMap = {
  blue: { text: "text-blue-400", bg: "bg-blue-500/10", stroke: "#3b82f6", ring: "ring-blue-500/20" },
  purple: { text: "text-purple-400", bg: "bg-purple-500/10", stroke: "#a855f7", ring: "ring-purple-500/20" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500/10", stroke: "#22d3ee", ring: "ring-cyan-500/20" },
  pink: { text: "text-pink-400", bg: "bg-pink-500/10", stroke: "#ec4899", ring: "ring-pink-500/20" },
  green: { text: "text-emerald-400", bg: "bg-emerald-500/10", stroke: "#34d399", ring: "ring-emerald-500/20" },
  red: { text: "text-red-400", bg: "bg-red-500/10", stroke: "#f87171", ring: "ring-red-500/20" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", stroke: "#fbbf24", ring: "ring-amber-500/20" },
} as const;

/** Animates a numeric value counting up from 0. */
function useCountUp(target: number, duration = 1.1) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function formatValue(raw: number, template: string) {
  if (template.includes("$")) return `$${raw.toFixed(2)}`;
  if (template.includes("%")) return `${raw.toFixed(1)}%`;
  if (template.includes("s")) return `${raw.toFixed(1)}s`;
  return Math.round(raw).toLocaleString("en-US");
}

interface MetricCardProps {
  metric: DashboardMetric;
  index: number;
}

export function MetricCard({ metric, index }: MetricCardProps) {
  const { label, rawValue, value, change, trend, icon: Icon, color, spark } = metric;
  const palette = colorMap[color];
  const animatedValue = useCountUp(rawValue);
  const isPositiveTrend = trend === "up";

  return (
    <Card
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group p-4"
    >
      <div className="flex items-start justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl ring-1", palette.bg, palette.ring)}>
          <Icon className={cn("h-[18px] w-[18px]", palette.text)} />
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
            isPositiveTrend ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
          )}
        >
          {isPositiveTrend ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(change)}%
        </span>
      </div>

      <p className="mt-3 text-xs text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{formatValue(animatedValue, value)}</p>

      <div className="mt-2 h-10 opacity-70 transition-opacity group-hover:opacity-100">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={palette.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={palette.stroke}
              strokeWidth={2}
              fill={`url(#spark-${metric.id})`}
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
