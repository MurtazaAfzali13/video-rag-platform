"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, SectionTitle } from "../shared";
import { cn } from "@/lib/dashboard-cn";
import { aiHealthScore as defaultHealthScore, healthSubMetrics as defaultHealthSubMetrics } from "@/mock/dashboard";
import { useDashboard } from "@/context/DashboardContext";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface AIHealthScoreProps {
  userId?: string;
}

export function AIHealthScore({ userId }: AIHealthScoreProps) {
  const { state, fetchWorkflowDistribution, fetchMetrics } = useDashboard();

  useEffect(() => {
    if (!userId) return;
    fetchWorkflowDistribution(userId);
    fetchMetrics(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const { score, label, subMetrics } = useMemo(() => {
    const distribution = state.workflowDistribution;
    if (distribution.length === 0) {
      return {
        score: defaultHealthScore.score,
        label: defaultHealthScore.label,
        subMetrics: defaultHealthSubMetrics,
      };
    }

    const total = distribution.reduce((sum, d) => sum + d.value, 0);
    const nodeShare = (nodeId: string) => {
      const node = distribution.find((d) => d.id === nodeId);
      if (!node || total === 0) return null;
      return Number(((node.value / total) * 100).toFixed(1));
    };

    const retrievalShare = nodeShare("retriever");
    const validationShare = nodeShare("validator");
    const webSearchShare = nodeShare("web-search");

    const mergedSubMetrics = defaultHealthSubMetrics.map((metric) => {
      if (metric.id === "retrieval" && retrievalShare !== null) {
        return { ...metric, value: retrievalShare };
      }
      if (metric.id === "validation" && validationShare !== null) {
        return { ...metric, value: validationShare };
      }
      if (metric.id === "retry" && webSearchShare !== null) {
        return { ...metric, label: "Web Search Fallbacks", value: webSearchShare };
      }
      return metric;
    });

    const derivedScore = Math.min(
      100,
      Math.round(
        (retrievalShare ?? defaultHealthScore.score) * 0.4 +
          (validationShare ?? defaultHealthScore.score) * 0.4 +
          (100 - (webSearchShare ?? 12)) * 0.2
      )
    );

    return {
      score: derivedScore,
      label: derivedScore >= 90 ? "Excellent" : derivedScore >= 75 ? "Good" : "Fair",
      subMetrics: mergedSubMetrics,
    };
  }, [state.workflowDistribution]);

  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} glow>
      <SectionTitle title="AI Health Score" subtitle="Overall CRAG pipeline reliability" />
      <div className="flex flex-col items-center gap-6 p-5 lg:flex-row lg:items-center">
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
          {subMetrics.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
            >
              <p className="text-[11px] text-white/40">{m.label}</p>
              <p className="mt-1 text-lg font-bold text-white">{m.value}%</p>
              <span
                className={cn(
                  "mt-1 flex items-center gap-0.5 text-[11px] font-medium",
                  m.tone === "positive" ? "text-emerald-400" : "text-red-400"
                )}
              >
                {m.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(m.change)}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}
