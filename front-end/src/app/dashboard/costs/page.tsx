import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CostBreakdownCard } from "@/components/dashboard/charts";

export const metadata = { title: "Costs · VidBrain" };

export default function CostsPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Costs"
      title="Costs"
      subtitle="AI spend across every provider — OpenAI, Pinecone, Tavily, and more."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CostBreakdownCard />
      </div>
    </DashboardShell>
  );
}
