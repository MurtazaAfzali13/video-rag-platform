"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Card, SectionTitle } from "../shared";
import { cn } from "@/lib/dashboard-cn";
import { activities as defaultActivities } from "@/mock/dashboard";
import { useDashboard } from "@/context/DashboardContext";

const colorMap: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
  purple: "bg-purple-500/10 text-purple-300 ring-purple-500/20",
  cyan: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/20",
  pink: "bg-pink-500/10 text-pink-300 ring-pink-500/20",
  green: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  red: "bg-red-500/10 text-red-300 ring-red-500/20",
};

export function ActivityFeed({ userId }: { userId?: string }) {
  const { state, fetchMetrics, fetchWorkflowDistribution } = useDashboard();

  useEffect(() => {
    if (!userId) return;
    fetchMetrics(userId);
    fetchWorkflowDistribution(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const displayActivities = useMemo(() => {
    const webSearchCount = state.metricsData?.web_searches;
    const validatorRuns = state.workflowDistribution.find((d) => d.id === "validator")?.value;

    return defaultActivities.map((activity) => {
      if (activity.type === "web_search" && webSearchCount !== undefined) {
        return {
          ...activity,
          title: "Web search executed",
          description: `Tavily · ${webSearchCount} total fallback${webSearchCount === 1 ? "" : "s"}`,
        };
      }
      if (activity.type === "validator" && validatorRuns !== undefined) {
        return {
          ...activity,
          title: `Validator executed ${validatorRuns} time${validatorRuns === 1 ? "" : "s"}`,
          description: "Context relevance grading (LangGraph)",
        };
      }
      return activity;
    });
  }, [state.metricsData, state.workflowDistribution]);

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
      <SectionTitle
        title="Live Activity Feed"
        action={
          <button className="text-xs font-medium text-purple-300 hover:text-purple-200">View All</button>
        }
      />
      <ul className="space-y-1 p-3">
        {displayActivities.map((activity, i) => {
          const Icon = activity.icon;
          return (
            <motion.li
              key={activity.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.03]"
            >
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", colorMap[activity.color])}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/85">{activity.title}</p>
                <p className="truncate text-xs text-white/40">{activity.description}</p>
              </div>
              <span className="shrink-0 text-[11px] text-white/30">{activity.timestamp}</span>
            </motion.li>
          );
        })}
      </ul>
      <button className="flex w-full items-center justify-center gap-1 border-t border-white/[0.05] py-3 text-xs font-medium text-purple-300 hover:text-purple-200">
        View All Activities <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </Card>
  );
}
