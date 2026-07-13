"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/dashboard-cn";

interface ProgressBarProps {
  percentage: number;
  colorClass?: string;
  className?: string;
  delay?: number;
}

export function ProgressBar({
  percentage,
  colorClass = "from-blue-500 to-purple-500",
  className,
  delay = 0,
}: ProgressBarProps) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <motion.div
        className={cn("h-full rounded-full bg-gradient-to-r", colorClass)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        transition={{ duration: 1, delay, ease: "easeOut" }}
      />
    </div>
  );
}
