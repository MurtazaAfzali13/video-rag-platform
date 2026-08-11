"use client";

import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { useVideos } from "@/context/Video_context";

export function TodayUploadsStat() {
  const { todayCount, todayCountLoading, totalCount } = useVideos();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/[0.06]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 ring-1 ring-purple-500/20">
        <Upload className="h-5 w-5 text-purple-300" />
      </span>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-white">
          {todayCountLoading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-white/[0.08]" /> : todayCount ?? 0}
        </span>
        <span className="text-sm text-white/40">videos indexed today</span>
      </div>

      <div className="ml-auto text-sm text-white/40">
        <span className="font-medium text-white/70">{totalCount}</span> total in library
      </div>
    </motion.div>
  );
}
