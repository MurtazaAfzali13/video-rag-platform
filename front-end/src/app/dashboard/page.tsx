// فایل: DashboardPage.tsx
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MetricsGrid } from "@/components/dashboard/cards/MetricsGrid";
import { QuestionsOverviewChart, WorkflowDistributionCard } from "@/components/dashboard/charts";
import { ActivityFeed } from "@/components/dashboard/activity";

import { DashboardProvider } from "@/context/DashboardContext"; 

export const metadata = {
  title: "Dashboard · VidBrain",
  description: "AI Operations Dashboard for the VidBrain Agentic CRAG Platform",
};

export default function DashboardPage() {
  const currentUserId = "user_3FOfWMpgxPu5eB5bUWAn5E4bsqV";

  return (
    <DashboardProvider userId={currentUserId}>
      <DashboardShell
        breadcrumb="Dashboard / Overview"
        title="Dashboard"
        subtitle="Welcome back, Armin! Here's what's happening with your AI platform today."
      >
        <div className="space-y-6">
     
          <MetricsGrid />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-1">
              <QuestionsOverviewChart />
            </div>
            <div className="xl:col-span-1">
              <WorkflowDistributionCard userId={currentUserId} />
            </div>
            <div className="xl:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </DashboardShell>
    </DashboardProvider>
  );
}