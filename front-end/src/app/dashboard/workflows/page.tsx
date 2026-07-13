"use client";

import { motion } from "framer-motion";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WorkflowDistributionCard } from "@/components/dashboard/charts";
import { FutureWidgetsGrid } from "@/components/dashboard/widgets";
import { Card } from "@/components/dashboard/shared";
import { workflowDistribution } from "@/mock/dashboard";

export default function WorkflowsPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / AI Workflows"
      title="AI Workflows"
      subtitle="LangGraph node execution across the Corrective RAG pipeline."
    >
      <div className="space-y-6">
        <WorkflowDistributionCard />

        <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {workflowDistribution.map((node, i) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
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
