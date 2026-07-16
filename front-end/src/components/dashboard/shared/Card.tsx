"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/dashboard-cn";

interface CardProps extends HTMLMotionProps<"div"> {
  glow?: boolean;
}

/**
 * Base glassmorphism surface used by every widget on the dashboard.
 * Dark translucent background, soft border, subtle inner highlight.
 */
export function Card({ className, glow = false, children, ...props }: CardProps) {
  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.06]",
        "bg-white/[0.03] backdrop-blur-xl",
        "shadow-[0_0_0_1px_var(--card-ring-color),0_8px_30px_var(--card-shadow-color)]",
        glow &&
          "before:absolute before:-inset-24 before:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.15),transparent_60%)] before:pointer-events-none",
        className
      )}
      {...props}
    >
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
