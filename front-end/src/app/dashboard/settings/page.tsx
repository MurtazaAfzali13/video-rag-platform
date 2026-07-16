"use client";

import { Settings } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ComingSoonPanel } from "@/components/dashboard/shared";

export default function SettingsPage() {
  return (
    <DashboardShell breadcrumb="Dashboard / Settings" title="Settings" subtitle="Workspace, API keys, and preferences.">
      <ComingSoonPanel
        icon={Settings}
        title="Workspace settings"
        description="API keys, team members, notification preferences, and integrations."
      />
    </DashboardShell>
  );
}
