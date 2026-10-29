"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MetricsGrid } from "@/components/dashboard/cards/MetricsGrid";
import {
  SalesOverviewChart,
  WorkflowDistributionCard,
  NodeExecutionBarChart,
  AIHealthGauge,
} from "@/components/dashboard/charts";
// import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed"; // مسیر کامپوننت خودت
import { useDashboard } from "@/context/DashboardContext";

export function DashboardOverview() {
  const {
    fetchMetrics,
    fetchQuestionsMetrics,
    fetchWorkflowDistribution,
    fetchVideoMetrics,
  } = useDashboard();
  const { user } = useUser();

  useEffect(() => {
    fetchMetrics();
    fetchQuestionsMetrics();
    fetchWorkflowDistribution();
    fetchVideoMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.firstName || "there";

  return (
    <DashboardShell
      breadcrumb="Dashboard / Overview"
      title="Dashboard"
      subtitle={`Welcome back, ${firstName}! Here's what's happening with your AI platform today.`}
    >
      <div className="space-y-6">
        <MetricsGrid />

        {/* items-start: هر ستون به اندازه‌ی محتوای خودش می‌ماند و کش نمی‌آید */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
          {/* ستون چپ: نمودار + دو کارت زیرش */}
          <div className="space-y-6 xl:col-span-2">
            <SalesOverviewChart />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <WorkflowDistributionCard />
              <NodeExecutionBarChart />
            </div>
          </div>

          {/* ستون راست: گیج + فید زنده */}
          <div className="space-y-6 xl:col-span-1">
            <AIHealthGauge />
            {/* <LiveActivityFeed /> */}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}