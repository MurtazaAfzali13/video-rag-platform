"use client";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { VideoProvider } from "@/context/Video_context";
import { TodayUploadsStat } from "@/components/dashboard/videos/TodayUploadsStat";
import { VideoGrid } from "@/components/dashboard/videos/VideoGrid";

export default function VideosPage() {
  return (
    <DashboardShell
      breadcrumb="Dashboard / Videos"
      title="Videos"
      subtitle="Every video indexed into your knowledge base."
    >
      <VideoProvider>
        <TodayUploadsStat />
        <VideoGrid />
      </VideoProvider>
    </DashboardShell>
  );
}
