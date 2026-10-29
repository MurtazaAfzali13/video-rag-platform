"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, SectionTitle } from "../shared";
import { useMonitoring, type MonitoringTimeframe } from "@/context/MonitoringContext";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 3; // visual gap between arcs

const TIMEFRAME_OPTIONS: { value: MonitoringTimeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];

/** Per-question counts returned by the backend (one run = one user question). */
type HealthBreakdown = {
  total_runs: number;
  answered_from_video: number;
  answered_via_web: number;
  failed: number;
};

function readBreakdown(health: unknown): HealthBreakdown | null {
  const b = (health as { breakdown?: Partial<HealthBreakdown> } | null)?.breakdown;
  if (!b) return null;
  const video = Number(b.answered_from_video ?? 0);
  const web = Number(b.answered_via_web ?? 0);
  const failed = Number(b.failed ?? 0);
  const total = Number(b.total_runs ?? video + web + failed);
  return { total_runs: total, answered_from_video: video, answered_via_web: web, failed };
}

function tier(score: number): { label: string; className: string } {
  if (score >= 97) return { label: "Excellent", className: "text-emerald-400" };
  if (score >= 90) return { label: "Good", className: "text-cyan-300" };
  return { label: "Needs attention", className: "text-amber-400" };
}

const pct = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 1000) / 10 : 0;

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

  const breakdown = readBreakdown(healthScore);
  const total = breakdown?.total_runs ?? 0;
  const hasData = breakdown ? total > 0 : true;

  // Score = grounded answers (video + web fallback) without errors.
  // Falls back to the backend score if no breakdown is provided.
  const score = breakdown
    ? hasData
      ? Math.round(((breakdown.answered_from_video + breakdown.answered_via_web) / total) * 1000) / 10
      : 0
    : healthScore?.score ?? 0;

  const status = breakdown
    ? hasData
      ? tier(score)
      : { label: "No data yet", className: "text-white/50" }
    : { label: healthScore?.label ?? "—", className: "text-emerald-400" };

  // Arc segments
  type Segment = { key: string; value: number; stroke: string };
  const segments: Segment[] = breakdown
    ? [
        { key: "video", value: breakdown.answered_from_video, stroke: "url(#healthVideoGradient)" },
        { key: "web", value: breakdown.answered_via_web, stroke: "url(#healthWebGradient)" },
        { key: "failed", value: breakdown.failed, stroke: "#f87171" },
      ].filter((s) => s.value > 0)
    : [{ key: "score", value: score, stroke: "url(#healthVideoGradient)" }];

  const denominator = breakdown ? total : 100;
  let cursor = 0;
  const arcs =
    denominator > 0
      ? segments.map((s) => {
          const len = (s.value / denominator) * CIRCUMFERENCE;
          const start = cursor;
          cursor += len;
          const gap = segments.length > 1 ? SEGMENT_GAP : 0;
          return { ...s, dash: Math.max(len - gap, 0.01), start };
        })
      : [];

  const legend = breakdown
    ? [
        {
          key: "video",
          label: "Answered from the video",
          hint: "Evidence found in the transcript",
          value: breakdown.answered_from_video,
          dot: "bg-gradient-to-r from-emerald-400 to-cyan-400",
        },
        {
          key: "web",
          label: "Web search fallback",
          hint: "No evidence in the video, so the agent searched the web",
          value: breakdown.answered_via_web,
          dot: "bg-amber-400",
        },
        {
          key: "failed",
          label: "Failed runs",
          hint: "Errors or empty answers",
          value: breakdown.failed,
          dot: "bg-red-400",
        },
      ]
    : [];

  return (
    <Card
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="flex h-full flex-col"
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <SectionTitle title="AI Health Score" subtitle="Grounded answers, no errors" />
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
          Failed to load health score: {healthError}
        </div>
      ) : (
        <motion.div
          key={healthTimeframe}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-1 flex-col items-center gap-5 px-5 py-6"
        >
          {/* Gauge */}
          <div className="relative flex h-52 w-52 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="healthVideoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <linearGradient id="healthWebGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              {arcs.map((a, i) => (
                <motion.circle
                  key={`${healthTimeframe}-${a.key}`}
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke={a.stroke}
                  strokeWidth="10"
                  strokeLinecap="butt"
                  strokeDashoffset={-a.start}
                  initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
                  animate={{ strokeDasharray: `${a.dash} ${CIRCUMFERENCE - a.dash}` }}
                  transition={{ duration: 1.1, delay: i * 0.15, ease: "easeOut" }}
                />
              ))}
            </svg>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="text-4xl font-bold tracking-tight text-white">
                {hasData ? `${score}%` : "—"}
              </span>
              <span className={`mt-1 text-sm font-medium ${status.className}`}>{status.label}</span>
              {breakdown && hasData && (
                <span className="mt-0.5 text-[11px] text-white/40">
                  {total} {total === 1 ? "question" : "questions"}
                </span>
              )}
            </motion.div>
          </div>

          {/* Legend */}
          {breakdown && (
            <ul className="w-full max-w-sm space-y-2.5">
              {legend.map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} />
                    <div>
                      <p className="text-[13px] font-medium text-white/90">{item.label}</p>
                      <p className="text-[11px] leading-snug text-white/45">{item.hint}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-white">{item.value}</p>
                    <p className="text-[11px] text-white/45">{pct(item.value, total)}%</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Why web search exists */}
          {breakdown && (
            <p className="w-full max-w-sm rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-relaxed text-white/60">
              <span className="font-semibold text-amber-300">Why web search?</span> When the evidence gate finds
              nothing in the video, the agent searches the web instead of guessing. This prevents hallucinated
              answers, and web-sourced answers are clearly flagged. It counts as a grounded answer, not a failure.
            </p>
          )}
        </motion.div>
      )}
    </Card>
  );
}