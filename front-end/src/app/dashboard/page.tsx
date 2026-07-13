import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MetricsGrid } from "@/components/dashboard/cards/MetricsGrid";
import { SalesOverviewChart, WorkflowDistributionCard } from "@/components/dashboard/charts";
import { ActivityFeed } from "@/components/dashboard/activity";

export const metadata = {
  title: "Dashboard · VidBrain",
  description: "AI Operations Dashboard for the VidBrain Agentic CRAG Platform",
};


export default function DashboardPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Overview"
      title="Dashboard"
      subtitle="Welcome back, Armin! Here's what's happening with your AI platform today."
    >
      <div className="space-y-6">
        {/* Row 1: KPI metric cards */}
        <MetricsGrid />

        {/* Row 2: Analytics + Workflow distribution + Live activity */}
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
