"use client";

import { useUsers } from "@/context/UsersContext";
import { RecentTransactionsTable } from "@/components/dashboard/tables";
import { TopUsers } from "@/components/dashboard/widgets";
import { Card, SectionTitle, Avatar } from "@/components/dashboard/shared";

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
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function UsersView() {
  const { users, isAdmin, isLoading, error } = useUsers();

  if (isLoading) {
    return (
      <div className="flex h-[248px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }


  if (!isAdmin) {
    const me = users[0];

    if (!me) {
      return (
        <Card initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="p-6 text-sm text-white/50">هنوز هیچ فعالیتی از شما ثبت نشده است.</div>
        </Card>
      );
    }

    const stats = [
      { label: "Chats", value: me.chats_count },
      { label: "Videos Processed", value: me.videos_count },
      { label: "Questions Asked", value: me.questions_count },
    ];

    return (
      <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SectionTitle title="My Profile" subtitle="Your activity on this platform" />
        <div className="flex items-center gap-4 p-5">
          {me.image_url ? (
            <img
              src={me.image_url}
              alt={me.name}
              className="size-10 shrink-0 rounded-full object-cover ring-2 ring-purple-500/20"
            />
          ) : (
            <Avatar initials={initialsFromName(me.name)} size="sm" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white/90">{me.name}</p>
            {me.email && <p className="truncate text-xs text-white/40">{me.email}</p>}
            <p className="text-xs text-white/40">Last active: {formatLastActive(me.last_active)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-white/[0.05] p-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center">
              <p className="text-xl font-bold text-white/90">{s.value}</p>
              <p className="mt-1 text-[11px] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Admin: the full platform breakdown — unchanged grid layout from before.
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <RecentTransactionsTable />
      </div>
      <div className="xl:col-span-1">
        <TopUsers />
      </div>
    </div>
  );
}
