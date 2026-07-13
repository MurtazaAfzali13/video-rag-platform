"use client";

import { BookOpen } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ComingSoonPanel } from "@/components/dashboard/shared";

export default function KnowledgeBasePage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Knowledge Base"
      title="Knowledge Base"
      subtitle="Namespaces, collections, and vector index health."
    >
      <ComingSoonPanel
        icon={BookOpen}
        title="Knowledge base explorer"
        description="Inspect Pinecone namespaces, chunk counts, and embedding freshness per user."
      />
    </DashboardShell>
  );
}
