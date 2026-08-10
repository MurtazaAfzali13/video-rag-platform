"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WorkflowDistributionCard } from "@/components/dashboard/charts";
import { FutureWidgetsGrid } from "@/components/dashboard/widgets";
import { Card } from "@/components/dashboard/shared";
import { useDashboard, type DonutDatum } from "@/context/DashboardContext";
import { workflowDistribution as defaultWorkflowDistribution } from "@/mock/dashboard";

const CORE_NODE_IDS = ["retriever", "validator", "generator", "web-search"] as const;

// تابع کمکی برای محاسبه درصدها (همان تابعی که در چارت دونات استفاده شد)
function recalculatePercentages(data: DonutDatum[]): DonutDatum[] {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return data.map((d) => ({
    ...d,
    percentage: total > 0 ? Number(((d.value / total) * 100).toFixed(1)) : 0,
  }));
}

export default function WorkflowsPage() {
  const { state } = useDashboard();
  const { workflowDistribution } = state;

  // محاسبه مجدد داده‌ها دقیقاً شبیه به WorkflowDistributionCard
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

  return (
    <DashboardShell
      breadcrumb="Dashboard / AI Workflows"
      title="AI Workflows"
      subtitle="LangGraph node execution across the Corrective RAG pipeline."
    >
      <div className="space-y-6">
        {/* کامپوننت بالایی که چارت دونات را نشان می‌دهد */}
        <WorkflowDistributionCard />

        {/* لیست کارت‌های پایین که حالا از داده‌های محاسبه‌شده استفاده می‌کند */}
        <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {displayDistribution.map((node, i) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
                <p className="mt-2 text-sm font-medium text-white/85">{node.label}</p>
                <p className="mt-1 text-xl font-bold text-white">{node.value.toLocaleString("en-US")}</p>
                <p className="text-xs text-white/40">{node.percentage}% of total runs</p>
              </motion.div>
            ))}
          </div>
        </Card>

        <FutureWidgetsGrid />
      </div>
    </DashboardShell>
  );
}