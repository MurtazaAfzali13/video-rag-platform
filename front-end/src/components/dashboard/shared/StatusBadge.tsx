import { cn } from "@/lib/dashboard-cn";
import type { HealthState } from "@/types/dashboard";

type Status = HealthState | "Completed" | "Pending" | "Failed";

const config: Record<Status, { label: string; dot: string; text: string }> = {
  healthy: { label: "Operational", dot: "bg-emerald-400", text: "text-emerald-300" },
  warning: { label: "Degraded", dot: "bg-amber-400", text: "text-amber-300" },
  offline: { label: "Offline", dot: "bg-red-400", text: "text-red-300" },
  Completed: { label: "Completed", dot: "bg-emerald-400", text: "text-emerald-300" },
  Pending: { label: "Pending", dot: "bg-amber-400", text: "text-amber-300" },
  Failed: { label: "Failed", dot: "bg-red-400", text: "text-red-300" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, dot, text } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", text, className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", dot)} />
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dot)} />
      </span>
      {label}
    </span>
  );
}
