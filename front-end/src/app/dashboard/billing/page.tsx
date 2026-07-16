"use client";

import { CreditCard } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ComingSoonPanel } from "@/components/dashboard/shared";

export default function BillingPage() {
  return (
    <DashboardShell breadcrumb="Dashboard / Billing" title="Billing" subtitle="Invoices and usage-based billing history.">
      <ComingSoonPanel
        icon={CreditCard}
        title="Billing history"
        description="Invoices, payment methods, and usage-based charges will appear here."
      />
    </DashboardShell>
  );
}
