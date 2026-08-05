// فایل: DashboardPage.tsx
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MetricsGrid } from "@/components/dashboard/cards/MetricsGrid";
import { SalesOverviewChart, WorkflowDistributionCard } from "@/components/dashboard/charts";
import { ActivityFeed } from "@/components/dashboard/activity";

export const metadata = {
  title: "Dashboard · VidBrain",
  description: "AI Operations Dashboard for the VidBrain Agentic CRAG Platform",
};

export default function DashboardPage() {
  // این همان آیدی کاربری است که در لاگ‌های بک‌اند شما ثبت شده بود
  const currentUserId = "user_3FOfWMpgxPu5eB5bUWAn5E4bsqV";

  return (
    <DashboardShell
      breadcrumb="Dashboard / Overview"
      title="Dashboard"
      subtitle="Welcome back, Armin! Here's what's happening with your AI platform today."
    >
      <div className="space-y-6">
        {/* Row 1: KPI metric cards */}
        <MetricsGrid userId={currentUserId} />

        
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <SalesOverviewChart />
          </div>
          <div className="xl:col-span-1">
            <WorkflowDistributionCard userId={currentUserId} />
          </div>
          <div className="xl:col-span-1">
            <ActivityFeed userId={currentUserId} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}