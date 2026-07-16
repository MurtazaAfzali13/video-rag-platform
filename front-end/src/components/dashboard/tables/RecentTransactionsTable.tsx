"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Card, SectionTitle, Avatar, StatusBadge, Badge } from "../shared";
import { usersTable } from "@/mock/dashboard";

export function RecentTransactionsTable() {
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
      <SectionTitle
        title="Recent Transactions"
        subtitle="Latest billing activity across your workspace"
        action={
          <button className="flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-purple-200">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* Desktop table */}
      <div className="hidden overflow-x-auto px-2 pb-2 pt-3 sm:block">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-white/35">
              <th className="px-3 pb-2 font-medium">User</th>
              <th className="px-3 pb-2 font-medium">Plan</th>
              <th className="px-3 pb-2 font-medium">Amount</th>
              <th className="px-3 pb-2 font-medium">Status</th>
              <th className="px-3 pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {usersTable.map((u, i) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={u.avatar} size="sm" />
                    <span className="font-medium text-white/85">{u.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={u.plan === "Pro Plan" ? "purple" : "slate"}>{u.plan}</Badge>
                </td>
                <td className="px-3 py-2.5 font-medium text-white/85">${u.amount.toFixed(2)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-3 py-2.5 text-white/40">{u.lastActive}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 p-3 sm:hidden">
        {usersTable.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2.5">
              <Avatar initials={u.avatar} size="sm" />
              <div>
                <p className="text-sm font-medium text-white/85">{u.name}</p>
                <p className="text-[11px] text-white/40">{u.lastActive}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white/85">${u.amount.toFixed(2)}</p>
              <StatusBadge status={u.status} className="justify-end" />
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
