import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RecentTransactionsTable } from "@/components/dashboard/tables";
import { TopUsers } from "@/components/dashboard/widgets";

export const metadata = { title: "Users · VidBrain" };

export default function UsersPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Users"
      title="Users"
      subtitle="Every user on your platform — plans, activity, and billing status."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentTransactionsTable />
        </div>
        <div className="xl:col-span-1">
          <TopUsers />
        </div>
      </div>
    </DashboardShell>
  );
}
