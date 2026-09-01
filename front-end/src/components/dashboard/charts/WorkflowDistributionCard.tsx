"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, SectionTitle } from "../shared";
import { DonutChart } from "./DonutChart";
import { useDashboard, type DonutDatum, type WorkflowTimeframe } from "@/context/DashboardContext";
import { workflowDistribution as defaultWorkflowDistribution } from "@/mock/dashboard";

const CORE_NODE_IDS = ["retriever", "validator", "generator", "web-search"] as const;

const TIMEFRAME_OPTIONS: { value: WorkflowTimeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];

function recalculatePercentages(data: DonutDatum[]): DonutDatum[] {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return data.map((d) => ({
    ...d,
    percentage: total > 0 ? Number(((d.value / total) * 100).toFixed(1)) : 0,
  }));
}

function TimeframeToggle({
  value,
  onChange,
  disabled,
}: {
  value: WorkflowTimeframe;
  onChange: (v: WorkflowTimeframe) => void;
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
                layoutId="workflow-timeframe-pill"
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

export function WorkflowDistributionCard() {
  const { state, fetchWorkflowDistribution } = useDashboard();
  const { workflowDistribution, workflowTimeframe, isLoading, error } = state;

  const displayDistribution = useMemo(() => {
  
    const coreNodes = CORE_NODE_IDS.map((nodeId) => {
      const blueprint = defaultWorkflowDistribution.find((d) => d.id === nodeId)!;
      const fromApi = workflowDistribution.find((d) => d.id === nodeId);

      return fromApi
        ? fromApi
        : { ...blueprint, value: 0, percentage: 0 };
    });

    const otherFromApi = workflowDistribution.find((d) => d.id === "other");
    const otherBlueprint = defaultWorkflowDistribution.find((d) => d.id === "other");
    const otherNode = otherFromApi
      ? otherFromApi
      : otherBlueprint
      ? { ...otherBlueprint, value: 0, percentage: 0 }
      : undefined;

    const merged = otherNode ? [...coreNodes, otherNode] : coreNodes;

    return recalculatePercentages(merged);
  }, [workflowDistribution]);

  const total = useMemo(
    () => displayDistribution.reduce((sum, d) => sum + d.value, 0),
    [displayDistribution]
  );

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <SectionTitle title="AI Workflow Distribution" subtitle="Node execution share (LangGraph)" />
        <TimeframeToggle
          value={workflowTimeframe}
          disabled={isLoading}
          onChange={(tf) => fetchWorkflowDistribution(tf)}
        />
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex h-[248px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
          </div>
        ) : error && workflowDistribution.length === 0 ? (
          <div className="flex h-[248px] items-center justify-center p-5 text-center text-sm text-red-400">
            خطا در بارگذاری توزیع پردازش: {error}
          </div>
        ) : displayDistribution.length > 0 ? (
          <motion.div
            key={workflowTimeframe} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <DonutChart
              data={displayDistribution}
              centerLabel="Total Runs"
              centerValue={total.toLocaleString("en-US")}
            />
          </motion.div>
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-white/40">
            هیچ تِرِیس یا جریانی برای این بازه‌ی زمانی ثبت نشده است.
          </div>
        )}
      </div>
    </Card>
  );
}
