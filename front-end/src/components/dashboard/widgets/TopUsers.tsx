"use client";

import { motion } from "framer-motion";
import { Card, SectionTitle, Avatar, ProgressBar } from "../shared";
import { useUsers, type UserOverview } from "@/context/UsersContext";

const barColors = [
  "from-purple-500 to-pink-400",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-pink-500 to-rose-400",
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Real Clerk photo when available, otherwise falls back to initials — same
 * pattern as the profile block in Sidebar.tsx. */
function UserAvatar({ user }: { user: UserOverview }) {
  if (user.image_url) {
    return (
      <img
        src={user.image_url}
        alt={user.name}
        className="size-7 shrink-0 rounded-full object-cover ring-2 ring-purple-500/20"
      />
    );
  }
  return <Avatar initials={initialsFromName(user.name)} size="sm" />;
}

export function TopUsers() {
  const { users, isLoading, error } = useUsers();

  const ranked = [...users].sort((a, b) => b.questions_count - a.questions_count).slice(0, 5);
  const max = Math.max(1, ranked[0]?.questions_count ?? 1);

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
      <SectionTitle
        title="Top Users by Activity"
        subtitle="Ranked by total questions asked, all-time"
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

      {isLoading && (
        <div className="px-5 py-8 text-center text-sm text-white/40">در حال بارگذاری…</div>
      )}

      {!isLoading && error && (
        <div className="px-5 py-8 text-center text-sm text-red-300">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4 p-5">
          {ranked.map((u: UserOverview, i: number) => (
            <motion.div
              key={u.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-3"
            >
              <span className="w-4 shrink-0 text-xs font-semibold text-white/30">{i + 1}</span>
              <UserAvatar user={u} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white/85">{u.name}</p>
                  <p className="shrink-0 text-xs text-white/40">{u.questions_count} Questions</p>
                </div>
                <ProgressBar
                  percentage={Math.round((u.questions_count / max) * 100)}
                  colorClass={barColors[i % barColors.length]}
                  className="mt-1.5"
                  delay={0.1 + i * 0.06}
                />
              </div>
            </motion.div>
          ))}
          {ranked.length === 0 && (
            <p className="text-sm text-white/40">هنوز فعالیتی برای رتبه‌بندی وجود ندارد.</p>
          )}
        </div>
      )}
    </Card>
  );
}
