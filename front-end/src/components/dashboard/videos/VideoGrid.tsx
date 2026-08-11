"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { useVideos, type VideoItem } from "@/context/Video_context";
import { VideoCard } from "./VideoCard";
import { VideoModal } from "./VideoModal";
import { Pagination } from "./Pagination";

export function VideoGrid() {
  const {
    videos,
    isLoading,
    error,
    page,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
  } = useVideos();

  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.03] px-6 py-16 text-center ring-1 ring-white/[0.06]">
        <p className="text-sm font-medium text-white/80">Couldn't load your videos</p>
        <p className="max-w-sm text-xs text-white/40">{error.message}</p>
      </div>
    );
  }

  if (isLoading && videos.length === 0) {
    return <VideoGridSkeleton />;
  }

  if (!isLoading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/[0.03] px-6 py-20 text-center ring-1 ring-white/[0.06]">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/15 to-blue-500/10 ring-1 ring-purple-500/20">
          <Video className="h-7 w-7 text-purple-300" />
        </span>
        <div className="max-w-sm space-y-1.5">
          <h2 className="text-lg font-semibold text-white">No videos yet</h2>
          <p className="text-sm text-white/40">Process a YouTube video and it will show up here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video, index) => (
          <VideoCard key={video.id} video={video} index={index} onPlay={setSelectedVideo} />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onNext={nextPage}
        onPrevious={previousPage}
        onGoToPage={goToPage}
      />

      <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}

function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="animate-pulse overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
          <div className="aspect-video w-full bg-white/[0.05]" />
          <div className="space-y-2 px-4 py-3">
            <div className="h-3.5 w-4/5 rounded bg-white/[0.06]" />
            <div className="h-3 w-1/3 rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}
