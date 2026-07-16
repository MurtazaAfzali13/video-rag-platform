"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface ComingSoonPanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Full-width empty-state used for sidebar sections that will be wired up
 * to real data in a later pass (Videos, Knowledge Base, Billing, ...).
 */
export function ComingSoonPanel({ icon: Icon, title, description }: ComingSoonPanelProps) {
  return (
    <Card
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      glow
      className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center"
    >
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/15 to-blue-500/10 ring-1 ring-purple-500/20"
      >
        <Icon className="h-7 w-7 text-purple-300" />
      </motion.span>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-white/40">{description}</p>
      </div>
      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/40 ring-1 ring-white/[0.06]">
        Connecting to backend soon
      </span>
    </Card>
  );
}
