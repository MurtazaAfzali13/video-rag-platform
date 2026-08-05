"use client";

import { useMemo } from "react";
import { Card, SectionTitle } from "../shared";
import { DonutChart } from "./DonutChart";
import { useDashboard, type DonutDatum } from "@/context/DashboardContext";
import { workflowDistribution as defaultWorkflowDistribution } from "@/mock/dashboard";

const CORE_NODE_IDS = ["retriever", "validator", "generator", "web-search"] as const;

function recalculatePercentages(data: DonutDatum[]): DonutDatum[] {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return data.map((d) => ({
    ...d,
    percentage: total > 0 ? Number(((d.value / total) * 100).toFixed(1)) : 0,
  }));
}

export function WorkflowDistributionCard() {
  const { state } = useDashboard();
  const { workflowDistribution, isLoading, error } = state;

  const displayDistribution = useMemo(() => {
    const source =
      workflowDistribution.length > 0 ? workflowDistribution : defaultWorkflowDistribution;

    const coreNodes = CORE_NODE_IDS.map((nodeId) => {
      const fromApi = source.find((d) => d.id === nodeId);
      const fromMock = defaultWorkflowDistribution.find((d) => d.id === nodeId);
      return fromApi ?? fromMock!;
    });

    const otherNode = source.find((d) => d.id === "other");
    const merged = otherNode ? [...coreNodes, otherNode] : coreNodes;

    return recalculatePercentages(merged);
  }, [workflowDistribution]);

  const total = useMemo(
    () => displayDistribution.reduce((sum, d) => sum + d.value, 0),
    [displayDistribution]
  );

  if (isLoading) {
    return (
      <Card className="flex h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
      </Card>
    );
  }

  if (error && workflowDistribution.length === 0) {
    return (
      <Card className="flex h-[320px] items-center justify-center p-5 text-center text-sm text-red-400">
        خطا در بارگذاری توزیع پردازش: {error}
      </Card>
    );
  }

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
      <SectionTitle title="AI Workflow Distribution" subtitle="Node execution share (LangGraph)" />
      <div className="p-5">
        {displayDistribution.length > 0 ? (
          <DonutChart
            data={displayDistribution}
            centerLabel="Total Runs"
            centerValue={total.toLocaleString("en-US")}
          />
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-white/40">
            هیچ تِرِیس یا جریانی برای این کاربر ثبت نشده است.
          </div>
        )}
      </div>
    </Card>
  );
}
