"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, SectionTitle } from "../shared";
import { useMonitoring, type MonitoringTimeframe } from "@/context/MonitoringContext";

const TIMEFRAME_OPTIONS: { value: MonitoringTimeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];

const SUBTITLE_BY_TIMEFRAME: Record<MonitoringTimeframe, string> = {
  today: "Average latency vs yesterday",
  week: "Average latency vs last week",
  month: "Average latency vs last month",
  all: "All-time average latency",
};

const COMPARISON_LABEL_BY_TIMEFRAME: Record<MonitoringTimeframe, string> = {
  today: "vs yesterday",
  week: "vs last week",
  month: "vs last month",
  all: "all-time",
};

function TimeframeToggle({
  value,
  onChange,
  disabled,
}: {
  value: MonitoringTimeframe;
  onChange: (v: MonitoringTimeframe) => void;
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
                layoutId="response-time-timeframe-pill"
                className="absolute inset-0 rounded-full bg-cyan-500/20 ring-1 ring-cyan-400/40"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={isActive ? "relative text-cyan-300" : "relative text-white/50 hover:text-white/80"}>
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
      <p className="text-sm font-semibold text-cyan-300">{payload[0].value}s avg</p>
    </div>
  );
}

export function ResponseTimeChart() {
  const { state, fetchResponseTime } = useMonitoring();
  const { responseTimeMetrics, responseTimeTimeframe, isResponseTimeLoading, responseTimeError } = state;

  useEffect(() => {
    fetchResponseTime();
  }, []);


  const isGoodTrend = responseTimeMetrics?.trend !== "up";
  const changeLabel =
    responseTimeMetrics != null
      ? `${responseTimeMetrics.percentage_change > 0 ? "+" : ""}${responseTimeMetrics.percentage_change}% ${COMPARISON_LABEL_BY_TIMEFRAME[responseTimeTimeframe]}`
      : null;

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <SectionTitle title="Response Time (Avg.)" subtitle={SUBTITLE_BY_TIMEFRAME[responseTimeTimeframe]} />
        <TimeframeToggle
          value={responseTimeTimeframe}
          disabled={isResponseTimeLoading}
          onChange={(tf) => fetchResponseTime(tf)}
        />
      </div>

      {isResponseTimeLoading && !responseTimeMetrics ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-cyan-500" />
        </div>
      ) : responseTimeError && !responseTimeMetrics ? (
        <div className="flex h-40 items-center justify-center p-5 text-center text-sm text-red-400">
          خطا در بارگذاری زمان پاسخ: {responseTimeError}
        </div>
      ) : (
        <motion.div
          key={responseTimeTimeframe}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-5 pb-2 pt-1">
            <span className="text-2xl font-bold text-white">{responseTimeMetrics?.avg_response_time_s ?? 0}s</span>
            {changeLabel && (
              <span
                className={`ml-2 text-xs font-medium ${isGoodTrend ? "text-emerald-400" : "text-red-400"}`}
              >
                {changeLabel}
              </span>
            )}
          </div>
          <div className="h-32 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimeMetrics?.chart_data ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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
        </motion.div>
      )}
    </Card>
  );
}
