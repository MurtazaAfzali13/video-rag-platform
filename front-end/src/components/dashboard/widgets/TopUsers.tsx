"use client";

import { motion } from "framer-motion";
import { Card, SectionTitle, Avatar, ProgressBar } from "../shared";
import { topUsers } from "@/mock/dashboard";

const barColors = [
  "from-purple-500 to-pink-400",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-pink-500 to-rose-400",
];

export function TopUsers() {
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
      <SectionTitle
        title="Top Users by Activity"
        action={
          <select
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60 outline-none"
            defaultValue="week"
            aria-label="Select time range"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        }
      />
      <div className="space-y-4 p-5">
        {topUsers.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="flex items-center gap-3"
          >
            <span className="w-4 shrink-0 text-xs font-semibold text-white/30">{u.rank}</span>
            <Avatar initials={u.avatar} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-white/85">{u.name}</p>
                <p className="shrink-0 text-xs text-white/40">{u.questions} Questions</p>
              </div>
              <ProgressBar percentage={u.percentage} colorClass={barColors[i % barColors.length]} className="mt-1.5" delay={0.1 + i * 0.06} />
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
