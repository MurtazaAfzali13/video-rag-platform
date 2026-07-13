import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AlertsPanel } from "@/components/dashboard/widgets";

export const metadata = { title: "Alerts · VidBrain" };

export default function AlertsPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Alerts"
      title="Alerts"
      subtitle="Notification center — cost spikes, slow providers, and system warnings."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AlertsPanel />
      </div>
    </DashboardShell>
  );
}
