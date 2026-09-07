"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, SectionTitle } from "../shared";
import { salesOverview as defaultSalesOverview } from "@/mock/dashboard";
import { useDashboard, type QuestionsTimeframe } from "@/context/DashboardContext";
import type { ChartPoint } from "@/types/dashboard";


const TIMEFRAME_OPTIONS: { value: QuestionsTimeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];


function QuestionsTimeframeToggle({
  value,
  onChange,
  disabled,
}: {
  value: QuestionsTimeframe;
  onChange: (v: QuestionsTimeframe) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-0.5 rounded-full bg-white/5 p-0.5 ring-1 ring-white/10">
      {TIMEFRAME_OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="relative rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            {isActive && (
              <motion.span
                layoutId="questions-timeframe-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 ring-1 ring-cyan-400/40"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={isActive ? "relative text-cyan-200" : "relative text-white/50 hover:text-white/80"}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white">
        Questions:{" "}
        <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-teal-200 bg-clip-text text-transparent">
          {payload[0].value.toLocaleString("en-US")}
        </span>
      </p>
    </div>
  );
}

export function SalesOverviewChart() {
  const { state, fetchQuestionsMetrics } = useDashboard();
  const { questionsMetrics, questionsTimeframe, isQuestionsLoading } = state;

 const chartData = useMemo<ChartPoint[]>(() => {
    if (questionsMetrics?.chart_data?.length) {
      return questionsMetrics.chart_data.map((point) => {
        let displayLabel = point.label;
        
        if (questionsTimeframe === "today") {
          try {
             const date = new Date(`1970-01-01T${point.label}:00Z`); 
             displayLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
             displayLabel = point.label;
          }
        }

        return {
          label: displayLabel,
          value: point.value,
        };
      });
    }
    return defaultSalesOverview;
  }, [questionsMetrics, questionsTimeframe]);

  return (
    <Card
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <SectionTitle
          title="Questions Overview"
          subtitle="Questions asked across all workspaces"
        />
        <QuestionsTimeframeToggle
          value={questionsTimeframe}
          onChange={(tf) => fetchQuestionsMetrics(tf)}
          disabled={isQuestionsLoading}
        />
      </div>

      <div className="relative h-64 px-2 pb-4 pt-4 sm:h-72 sm:px-4">
        {isQuestionsLoading && !questionsMetrics && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-cyan-500" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart key={questionsTimeframe} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* گرادیانت خط اصلی: سبز-زمردی → سیان → تیل روشن، شبیه رفرنس */}
              <linearGradient id="questionsLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="45%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>

              {/* گرادیانت پرکننده‌ی زیر منحنی: تیل/سیان پررنگ که به تیره محو می‌شود */}
              <linearGradient id="questionsFillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.55} />
                <stop offset="40%" stopColor="#0891b2" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#0e7490" stopOpacity={0} />
              </linearGradient>

              {/* افکت درخشش (glow) پشت خط */}
              <filter id="questionsGlow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(45,212,191,0.35)", strokeWidth: 1 }} />

            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#questionsLineGradient)"
              strokeWidth={6}
              strokeOpacity={0.35}
              fill="none"
              filter="url(#questionsGlow)"
              isAnimationActive={false}
              legendType="none"
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#questionsLineGradient)"
              strokeWidth={2.5}
              fill="url(#questionsFillGradient)"
              animationDuration={1200}
              dot={false}
              activeDot={{ r: 5, fill: "#2dd4bf", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
