"use client";

import { useEffect } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MetricsGrid } from "@/components/dashboard/cards/MetricsGrid";
import { SalesOverviewChart, WorkflowDistributionCard } from "@/components/dashboard/charts";
import { ActivityFeed } from "@/components/dashboard/activity";
import { useDashboard } from "@/context/DashboardContext";

const CURRENT_USER_ID = "user_3FOfWMpgxPu5eB5bUWAn5E4bsqV";

export function DashboardOverview() {
  const { fetchMetrics, fetchQuestionsMetrics, fetchWorkflowDistribution } = useDashboard();

  useEffect(() => {
    fetchMetrics(CURRENT_USER_ID);
    fetchQuestionsMetrics(CURRENT_USER_ID);
    fetchWorkflowDistribution(CURRENT_USER_ID);
  }, [fetchMetrics, fetchQuestionsMetrics, fetchWorkflowDistribution]);

  return (
    <DashboardShell
      breadcrumb="Dashboard / Overview"
      title="Dashboard"
      subtitle="Welcome back, Armin! Here's what's happening with your AI platform today."
    >
      <div className="space-y-6">
        <MetricsGrid />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <SalesOverviewChart />
          </div>
          <div className="xl:col-span-1">
            <WorkflowDistributionCard />
          </div>
          <div className="xl:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
