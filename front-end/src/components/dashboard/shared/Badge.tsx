import type { ReactNode } from "react";
import { cn } from "@/lib/dashboard-cn";

type BadgeTone = "blue" | "purple" | "cyan" | "pink" | "green" | "red" | "amber" | "slate";

const toneClasses: Record<BadgeTone, string> = {
  blue: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
  purple: "bg-purple-500/10 text-purple-300 ring-purple-500/20",
  cyan: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/20",
  pink: "bg-pink-500/10 text-pink-300 ring-pink-500/20",
  green: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  red: "bg-red-500/10 text-red-300 ring-red-500/20",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  slate: "bg-white/5 text-white/60 ring-white/10",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "slate", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
