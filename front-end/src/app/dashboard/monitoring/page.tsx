import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AIHealthScore, SystemStatus } from "@/components/dashboard/widgets";
import { ResponseTimeChart } from "@/components/dashboard/charts";

export const metadata = { title: "Monitoring · VidBrain" };

export default function MonitoringPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Monitoring"
      title="Monitoring"
      subtitle="Live infrastructure health and pipeline reliability."
    >
      <div className="space-y-6">
        <AIHealthScore />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SystemStatus />
          <ResponseTimeChart />
        </div>
      </div>
    </DashboardShell>
  );
}
