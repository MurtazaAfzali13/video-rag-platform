import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SalesOverviewChart, ResponseTimeChart, WorkflowDistributionCard } from "@/components/dashboard/charts";

export const metadata = { title: "Analytics · VidBrain" };

export default function AnalyticsPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Analytics"
      title="Analytics"
      subtitle="Deep-dive into questions, uploads, and AI request volume."
    >
      <div className="space-y-6">
        <SalesOverviewChart />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WorkflowDistributionCard />
          <ResponseTimeChart />
        </div>
      </div>
    </DashboardShell>
  );
}
