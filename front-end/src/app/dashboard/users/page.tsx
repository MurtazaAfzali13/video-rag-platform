import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { UsersProvider } from "@/context/UsersContext";
import { UsersView } from "./UsersView";

export const metadata = { title: "Users · VidBrain" };

export default function UsersPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Users"
      title="Users"
      subtitle="Every user on your platform — activity and usage."
    >
      <UsersProvider>
        <UsersView />
      </UsersProvider>
    </DashboardShell>
  );
}
