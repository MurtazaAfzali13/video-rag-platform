"use client";

import { Video } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ComingSoonPanel } from "@/components/dashboard/shared";

export default function VideosPage() {
  return (
    <DashboardShell breadcrumb="Dashboard / Videos" title="Videos" subtitle="Every video indexed into your knowledge base.">
      <ComingSoonPanel
        icon={Video}
        title="Video library"
        description="Browse, search, and manage every video indexed into Pinecone, with per-video timestamp coverage."
      />
    </DashboardShell>
  );
}
