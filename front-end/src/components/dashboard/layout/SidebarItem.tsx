"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/dashboard-cn";

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  badge?: string;
  /** Called after navigating - used to close the mobile drawer. */
  onNavigate?: () => void;
}

export function SidebarItem({ href, icon: Icon, label, active, collapsed, badge, onNavigate }: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className="block"
    >
      <motion.span
        whileHover={{ x: collapsed ? 0 : 3 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40",
          active ? "text-white" : "text-white/50 hover:text-white/90 hover:bg-white/[0.04]",
          collapsed && "justify-center px-0"
        )}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/10 ring-1 ring-purple-500/30"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <Icon className={cn("relative z-10 h-[18px] w-[18px] shrink-0", active && "text-purple-300")} />
        {!collapsed && <span className="relative z-10 truncate">{label}</span>}
        {!collapsed && badge && (
          <span className="relative z-10 ml-auto rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
            {badge}
          </span>
        )}
      </motion.span>
    </Link>
  );
}
