"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Info, CheckCircle2, AlertOctagon } from "lucide-react";
import { Card, SectionTitle } from "../shared";
import { cn } from "@/lib/dashboard-cn";
import { notifications } from "@/mock/dashboard";
import type { Notification } from "@/types/dashboard";

const levelConfig: Record<Notification["level"], { icon: typeof Info; classes: string }> = {
  critical: { icon: AlertOctagon, classes: "bg-red-500/10 text-red-300" },
  warning: { icon: AlertTriangle, classes: "bg-amber-500/10 text-amber-300" },
  info: { icon: Info, classes: "bg-blue-500/10 text-blue-300" },
  success: { icon: CheckCircle2, classes: "bg-emerald-500/10 text-emerald-300" },
};

export function AlertsPanel() {
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
      <SectionTitle
        title="Alerts & Notifications"
        action={<button className="text-xs font-medium text-purple-300 hover:text-purple-200">View All</button>}
      />
      <ul className="space-y-1 p-3">
        {notifications.map((n, i) => {
          const { icon: Icon, classes } = levelConfig[n.level];
          return (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.03]"
            >
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", classes)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/85">{n.title}</p>
                <p className="truncate text-xs text-white/40">{n.description}</p>
              </div>
              <span className="shrink-0 text-[11px] text-white/30">{n.timestamp}</span>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
