"use client";

import { Crown } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ComingSoonPanel } from "@/components/dashboard/shared";

export default function SubscriptionsPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Subscriptions"
      title="Subscriptions"
      subtitle="Plan upgrades, downgrades, and churn across your workspace."
    >
      <ComingSoonPanel
        icon={Crown}
        title="Subscription management"
        description="Manage plan tiers, seats, and renewal dates for every workspace."
      />
    </DashboardShell>
  );
}
