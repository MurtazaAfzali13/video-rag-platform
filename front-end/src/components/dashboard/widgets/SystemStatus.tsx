"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Cpu, Database, Globe, Radio, Server, Boxes, type LucideIcon } from "lucide-react";
import { Card, SectionTitle, StatusBadge } from "../shared";
import { cn } from "@/lib/dashboard-cn";
import { useMonitoring, type ServiceStatus } from "@/context/MonitoringContext";

// آیکون‌ها محلی‌اند و بر اساس `id` مچ می‌شوند — چون بک‌اند فقط
// id/name/status/latency برمی‌گرداند، یک کامپوننت React را نمی‌شود
// serialize کرد. اگر بک‌اند یک id جدید اضافه کرد که اینجا نیست، به‌جای
// کرش، آیکون پیش‌فرض (Server) استفاده می‌شود.
const SERVICE_ICONS: Record<string, LucideIcon> = {
  "api-server": Server,
  pinecone: Boxes,
  openai: Cpu,
  tavily: Globe,
  database: Database,
  redis: Radio,
};

const REFRESH_INTERVAL_MS = 60_000; // بک‌اند خودش هر ۳۰ ثانیه یک‌بار کش می‌شود؛ همین کافی است

export function SystemStatus() {
  const { state, fetchSystemStatus } = useMonitoring();
  const { systemStatus, isSystemStatusLoading, systemStatusError } = state;

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const services = systemStatus?.services ?? [];

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
      <SectionTitle
        title="System Status"
        action={<button className="text-xs font-medium text-purple-300 hover:text-purple-200">View All</button>}
      />

      {isSystemStatusLoading && services.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
        </div>
      ) : systemStatusError && services.length === 0 ? (
        <div className="flex h-40 items-center justify-center p-5 text-center text-sm text-red-400">
          خطا در بارگذاری وضعیت سیستم: {systemStatusError}
        </div>
      ) : (
        <ul className="space-y-1 p-3">
          {services.map((s, i) => {
            const Icon = SERVICE_ICONS[s.id] ?? Server;
            return (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                title={s.detail ?? undefined}
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
                <StatusBadge status={s.status as ServiceStatus} />
              </motion.li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
