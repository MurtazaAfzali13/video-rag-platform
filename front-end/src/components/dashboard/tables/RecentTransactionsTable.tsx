"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Card, SectionTitle, Avatar } from "../shared";
import { useUsers, type UserOverview } from "@/context/UsersContext";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function RecentTransactionsTable() {
  const { users, isLoading, error } = useUsers();

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
      <SectionTitle
        title="All Users"
        subtitle="Every user's activity across your workspace"
        action={
          <button className="flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-purple-200">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      {isLoading && (
        <div className="px-5 py-8 text-center text-sm text-white/40">در حال بارگذاری کاربران…</div>
      )}

      {!isLoading && error && (
        <div className="px-5 py-8 text-center text-sm text-red-300">{error}</div>
      )}

      {!isLoading && !error && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto px-2 pb-2 pt-3 sm:block">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-white/35">
                  <th className="px-3 pb-2 font-medium">User</th>
                  <th className="px-3 pb-2 font-medium">Chats</th>
                  <th className="px-3 pb-2 font-medium">Videos</th>
                  <th className="px-3 pb-2 font-medium">Questions</th>
                  <th className="px-3 pb-2 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: UserOverview, i: number) => (
                  <motion.tr
                    key={u.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={u} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white/85">{u.name}</p>
                          {u.email && <p className="truncate text-[11px] text-white/35">{u.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-white/70">{u.chats_count}</td>
                    <td className="px-3 py-2.5 text-white/70">{u.videos_count}</td>
                    <td className="px-3 py-2.5 text-white/70">{u.questions_count}</td>
                    <td className="px-3 py-2.5 text-white/40">{formatLastActive(u.last_active)}</td>
                  </motion.tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-white/40">
                      هنوز هیچ کاربری فعالیتی ثبت نکرده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-2 p-3 sm:hidden">
            {users.map((u: UserOverview, i: number) => (
              <motion.div
                key={u.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={u} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/85">{u.name}</p>
                    <p className="text-[11px] text-white/40">{formatLastActive(u.last_active)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-white/60">
                  <p>{u.questions_count} Q</p>
                  <p className="text-white/35">
                    {u.chats_count} chats · {u.videos_count} videos
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
