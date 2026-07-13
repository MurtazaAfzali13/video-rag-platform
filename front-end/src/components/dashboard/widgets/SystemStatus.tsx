"use client";

import { motion } from "framer-motion";
import { Card, SectionTitle, StatusBadge } from "../shared";
import { cn } from "@/lib/dashboard-cn";
import { systemHealth } from "@/mock/dashboard";

export function SystemStatus() {
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
      <SectionTitle
        title="System Status"
        action={<button className="text-xs font-medium text-purple-300 hover:text-purple-200">View All</button>}
      />
      <ul className="space-y-1 p-3">
        {systemHealth.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-2.5 text-sm text-white/75">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    s.status === "healthy" && "bg-emerald-500/10",
                    s.status === "warning" && "bg-amber-500/10",
                    s.status === "offline" && "bg-red-500/10"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                </span>
                {s.name}
              </span>
              <StatusBadge status={s.status} />
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
