"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Workflow,
  Users,
  Video,
  BookOpen,
  DollarSign,
  Activity,
  ScrollText,
  Bell,
  Settings,
  CreditCard,
  Crown,
  ChevronsLeft,
  ChevronsRight,
  X,
  Brain,
} from "lucide-react";
import { SidebarItem } from "./SidebarItem";
import { Avatar } from "../shared/Avatar";
import { cn } from "@/lib/dashboard-cn";

import { useUser, useClerk } from "@clerk/nextjs";

const NAV_SECTIONS = [
  {
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    label: "Insights",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
      { id: "workflows", label: "AI Workflows", icon: Workflow, href: "/dashboard/workflows" },
      { id: "monitoring", label: "Monitoring", icon: Activity, href: "/dashboard/monitoring" },
      { id: "logs", label: "Logs & Traces", icon: ScrollText, href: "/dashboard/logs" },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "users", label: "Users", icon: Users, href: "/dashboard/users" },
      { id: "videos", label: "Videos", icon: Video, href: "/dashboard/videos" },
      { id: "knowledge-base", label: "Knowledge Base", icon: BookOpen, href: "/dashboard/knowledge-base" },
      { id: "costs", label: "Costs", icon: DollarSign, href: "/dashboard/costs" },
      { id: "alerts", label: "Alerts", icon: Bell, href: "/dashboard/alerts", badge: "5" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "billing", label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
      { id: "subscriptions", label: "Subscriptions", icon: Crown, href: "/dashboard/subscriptions" },
      { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  /** "/dashboard" is only active on an exact match; nested routes match by prefix. */
  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname?.startsWith(href + "/");
  }

  const content = (collapsedView: boolean) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-4 py-5", collapsedView && "justify-center px-0")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 shadow-lg shadow-purple-500/30">
          <Brain className="h-5 w-5 text-white" />
        </div>
        {!collapsedView && (
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-lg font-bold text-transparent">
            VidBrain
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
        {NAV_SECTIONS.map((section, i) => (
          <div key={i}>
            {section.label && !collapsedView && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  badge={"badge" in item ? item.badge : undefined}
                  collapsed={collapsedView}
                  active={isActive(item.href)}
                  onNavigate={onCloseMobile}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer profile */}
      <div className="border-t border-white/[0.06] p-3">
        {!collapsedView ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500/15 to-blue-500/10 p-3 ring-1 ring-purple-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                <Crown className="h-3.5 w-3.5" /> Pro Plan
              </div>
              <p className="mt-1 text-[11px] text-white/40">Manage your subscription and billing details.</p>
              <button className="mt-2 w-full rounded-lg bg-white/10 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/15">
                Manage Plan
              </button>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">

              <div className="flex items-center gap-2.5 pt-2 border-t border-white/[0.06]">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="size-7 rounded-full ring-2 ring-purple-500/20"
                  />
                ) : (
                  <div className="size-7 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-purple-500/20">
                    {user?.firstName?.[0] ?? "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 truncate font-medium">
                    {user?.fullName || user?.primaryEmailAddress?.emailAddress || "User"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar initials="AA" size="md" />
          </div>
        )}
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden items-center justify-center gap-2 border-t border-white/[0.06] py-2.5 text-white/30 transition-colors hover:text-white/70 md:flex"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 84 : 264 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="hidden h-full shrink-0 border-r border-white/[0.06] bg-slate-900/80 backdrop-blur-xl md:block"
      >
        {content(collapsed)}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/[0.06] bg-slate-950 md:hidden"
            >
              <button
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              {content(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
