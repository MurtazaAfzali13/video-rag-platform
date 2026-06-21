"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  Video,
  MessageSquare,
} from "lucide-react";

export default function Loading() {
  return (
    <div className="h-screen w-full overflow-hidden bg-[#050816]">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-pink-600/20 blur-3xl" />
      </div>

      <div className="relative flex h-full items-center justify-center px-6">

        <div className="w-full max-w-4xl">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12 flex flex-col items-center"
          >
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                repeat: Infinity,
                duration: 8,
                ease: "linear",
              }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl" />

              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-purple-500/30 bg-gradient-to-r from-purple-600 to-fuchsia-600">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </motion.div>

            <h1 className="mt-6 text-4xl font-bold text-white">
              VidIQ AI
            </h1>

            <p className="mt-2 text-slate-400">
              Initializing your AI workspace...
            </p>
          </motion.div>

          {/* Processing Steps */}
          <div className="grid gap-6 md:grid-cols-3">

            <LoadingCard
              icon={<Video />}
              title="Loading Video Engine"
              delay={0}
            />

            <LoadingCard
              icon={<Brain />}
              title="Preparing AI Analysis"
              delay={0.4}
            />

            <LoadingCard
              icon={<MessageSquare />}
              title="Building Chat Session"
              delay={0.8}
            />

          </div>

          {/* Progress */}
          <div className="mt-12">
            <div className="mb-3 flex justify-between text-sm text-slate-400">
              <span>Preparing experience</span>
              <span>Loading...</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: "0%" }}
                animate={{
                  width: ["10%", "40%", "75%", "100%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500"
              />
            </div>
          </div>

          {/* Skeleton Preview */}
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">

            <div className="mb-6 flex gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-3 w-52 animate-pulse rounded bg-white/5" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-4 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-white/10" />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function LoadingCard({
  icon,
  title,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.3 }}
      animate={{
        opacity: [0.3, 1, 0.3],
      }}
      transition={{
        repeat: Infinity,
        duration: 2,
        delay,
      }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
        {icon}
      </div>

      <h3 className="font-medium text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        Please wait a moment...
      </p>
    </motion.div>
  );
}