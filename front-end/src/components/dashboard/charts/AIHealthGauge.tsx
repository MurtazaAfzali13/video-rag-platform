"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, SectionTitle } from "../shared";
import { useMonitoring, type MonitoringTimeframe } from "@/context/MonitoringContext";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIMEFRAME_OPTIONS: { value: MonitoringTimeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];

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
                layoutId="dashboard-health-timeframe-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 ring-1 ring-emerald-400/40"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={isActive ? "relative text-emerald-200" : "relative text-white/50 hover:text-white/80"}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AIHealthGauge() {
  const { state, fetchHealthScore } = useMonitoring();
  const { healthScore, healthTimeframe, isHealthLoading, healthError } = state;

  useEffect(() => {
    fetchHealthScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = healthScore?.score ?? 0;
  const label = healthScore?.label ?? "—";
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <Card
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="flex h-full flex-col"
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <SectionTitle title="AI Health Score" subtitle="Overall CRAG pipeline reliability" />
        <TimeframeToggle
          value={healthTimeframe}
          disabled={isHealthLoading}
          onChange={(tf) => fetchHealthScore(tf)}
        />
      </div>

      {isHealthLoading && !healthScore ? (
        <div className="flex flex-1 items-center justify-center py-14">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-emerald-500" />
        </div>
      ) : healthError && !healthScore ? (
        <div className="flex flex-1 items-center justify-center p-5 text-center text-sm text-red-400">
          خطا در بارگذاری امتیاز سلامت: {healthError}
        </div>
      ) : (
        <motion.div
          key={healthTimeframe}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-1 items-center justify-center py-6"
        >
          <div className="relative flex h-56 w-56 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <motion.circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="url(#dashboardHealthGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="dashboardHealthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="text-4xl font-bold tracking-tight text-white">{score}%</span>
              <span className="mt-1 text-sm font-medium text-emerald-400">{label}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
