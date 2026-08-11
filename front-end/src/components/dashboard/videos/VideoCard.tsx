"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { VideoItem } from "@/context/VideoContext";

interface VideoCardProps {
  video: VideoItem;
  index: number;
  onPlay: (video: VideoItem) => void;
}

/** Turns an ISO timestamp into a short "3h ago" / "2d ago" style label. */
function timeAgo(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];

  let value = diffSeconds;
  for (const [divisor, label] of units) {
    if (value < divisor || !Number.isFinite(divisor)) {
      return label === "s" && value < 5 ? "just now" : `${Math.floor(value)}${label} ago`;
    }
    value = value / divisor;
  }
  return "just now";
}

/**
 * We deliberately never render an <iframe> here — only the static YouTube
 * thumbnail image — so a grid of N videos costs N image requests instead of
 * N embedded players. The real <iframe> only mounts inside VideoModal, once
 * a user actually clicks a card.
 */
export function VideoCard({ video, index, onPlay }: VideoCardProps) {
  const [thumbnailSrc, setThumbnailSrc] = useState(
    `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`
  );
  const [hasFallenBack, setHasFallenBack] = useState(false);

  const handleThumbnailError = () => {
    // Not every video has a maxres thumbnail (needs an HD source upload) —
    // hqdefault.jpg always exists for a valid video id, so fall back once.
    if (!hasFallenBack) {
      setThumbnailSrc(`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`);
      setHasFallenBack(true);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={() => onPlay(video)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -3 }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white/[0.03] text-left ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.05] hover:ring-purple-500/30"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-white/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element -- external CDN thumbnail, not a local asset */}
        <img
          src={thumbnailSrc}
          alt={video.title}
          loading="lazy"
          onError={handleThumbnailError}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <span className="flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-slate-900 text-slate-900" />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-4 py-3">
        <h3 className="line-clamp-2 text-sm font-medium text-white/90">{video.title}</h3>
        <span className="text-xs text-white/40">{timeAgo(video.created_at)}</span>
      </div>
    </motion.button>
  );
}
