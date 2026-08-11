"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { VideoItem } from "@/context/VideoContext";

interface VideoModalProps {
  video: VideoItem | null;
  onClose: () => void;
}

/**
 * The ONLY place an actual YouTube <iframe> is rendered. It mounts on open
 * and unmounts on close, so a closed dashboard never has N background
 * players eating memory/network — only ever at most one, while the modal
 * is open.
 */
export function VideoModal({ video, onClose }: VideoModalProps) {
  useEffect(() => {
    if (!video) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [video, onClose]);

  return (
    <AnimatePresence>
      {video && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <h2 className="line-clamp-1 text-sm font-medium text-white/90">{video.title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close video"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <iframe
                key={video.youtube_id}
                src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
