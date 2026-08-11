"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs"; // 🛡️ اضافه کردن هوک Clerk برای دریافت اطلاعات کاربر
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MetricsGrid } from "@/components/dashboard/cards/MetricsGrid";
import { SalesOverviewChart, WorkflowDistributionCard } from "@/components/dashboard/charts";
import { ActivityFeed } from "@/components/dashboard/activity";
import { useDashboard } from "@/context/DashboardContext";

export function DashboardOverview() {
  const { fetchMetrics, fetchQuestionsMetrics, fetchWorkflowDistribution, fetchVideoMetrics } = useDashboard();
  const { user } = useUser();
  useEffect(() => {
    fetchMetrics();
    fetchQuestionsMetrics();
    fetchWorkflowDistribution();
    fetchVideoMetrics();
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
