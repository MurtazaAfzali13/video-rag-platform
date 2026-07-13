"use client";

import { ScrollText } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ComingSoonPanel } from "@/components/dashboard/shared";
import { FutureWidgetsGrid } from "@/components/dashboard/widgets";

export default function LogsPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Logs & Traces"
      title="Logs & Traces"
      subtitle="Node-by-node LangGraph execution traces."
    >
      <div className="space-y-6">
        <ComingSoonPanel
          icon={ScrollText}
          title="Trace explorer"
          description="Step through every Supervisor → Retriever → Validator → Generator run, node by node."
        />
        <FutureWidgetsGrid />
      </div>
    </DashboardShell>
  );
}
