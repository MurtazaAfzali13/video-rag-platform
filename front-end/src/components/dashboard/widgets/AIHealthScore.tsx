"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, SectionTitle } from "../shared";
import { cn } from "@/lib/dashboard-cn";
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
                layoutId="health-timeframe-pill"
                className="absolute inset-0 rounded-full bg-blue-500/20 ring-1 ring-blue-400/40"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={isActive ? "relative text-blue-300" : "relative text-white/50 hover:text-white/80"}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AIHealthScore() {
  const { state, fetchHealthScore } = useMonitoring();
  const { healthScore, healthTimeframe, isHealthLoading, healthError } = state;

  useEffect(() => {
    fetchHealthScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = healthScore?.score ?? 0;
  const label = healthScore?.label ?? "—";
  const metrics = healthScore?.metrics ?? [];
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} glow>
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <SectionTitle title="AI Health Score" subtitle="Overall CRAG pipeline reliability" />
        <TimeframeToggle
          value={healthTimeframe}
          disabled={isHealthLoading}
          onChange={(tf) => fetchHealthScore(tf)}
        />
      </div>

      {isHealthLoading && !healthScore ? (
        <div className="flex h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
        </div>
      ) : healthError && !healthScore ? (
        <div className="flex h-[200px] items-center justify-center p-5 text-center text-sm text-red-400">
          خطا در بارگذاری امتیاز سلامت: {healthError}
        </div>
      ) : (
        <motion.div
          key={healthTimeframe}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-6 p-5 lg:flex-row lg:items-center"
        >
          <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <motion.circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="url(#healthGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold text-white">{score}%</span>
              <span className="text-xs font-medium text-emerald-400">{label}</span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metrics.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
              >
                <p className="text-[11px] text-white/40">{m.label}</p>

                {!m.available ? (
                  <>
                    <p className="mt-1 text-lg font-bold text-white/30">—</p>
                    <span className="mt-1 block text-[11px] font-medium text-white/30">Coming soon</span>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-lg font-bold text-white">{m.value}%</p>
                    <span
                      className={cn(
                        "mt-1 flex items-center gap-0.5 text-[11px] font-medium",
                        m.tone === "positive" ? "text-emerald-400" : m.tone === "negative" ? "text-red-400" : "text-white/40"
                      )}
                    >
                      {m.trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : m.trend === "down" ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : null}
                      {m.change !== null ? Math.abs(m.change) : 0}%
                    </span>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </Card>
  );
}
