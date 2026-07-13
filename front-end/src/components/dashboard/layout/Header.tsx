"use client";

import { motion } from "framer-motion";
import { Menu, Bell, Calendar, Download, RefreshCw, Sun, Moon, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SearchInput } from "../shared/SearchInput";
import { Avatar } from "../shared/Avatar";
import { cn } from "@/lib/dashboard-cn";
import { useTheme } from "../theme/ThemeProvider";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  breadcrumb?: string;
  title?: string;
  subtitle?: string;
}

export function Header({
  onOpenMobileMenu,
  breadcrumb = "Dashboard / Overview",
  title = "Dashboard",
  subtitle = "Welcome back, Armin! Here's what's happening with your AI platform today.",
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-900/70 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-4 py-4 md:px-8">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="rounded-lg p-2 text-white/60 hover:bg-white/5 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 hidden text-xs text-white/30 sm:block">{breadcrumb}</p>
          <h1 className="truncate text-xl font-bold text-white md:text-2xl">{title}</h1>
          <p className="hidden truncate text-xs text-white/40 sm:block md:text-sm">{subtitle}</p>
        </div>

        {/* Desktop controls */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <SearchInput placeholder="Search anything..." className="w-56" />

          <button className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white/70 transition-colors hover:bg-white/[0.06]">
            <Calendar className="h-4 w-4 text-white/40" />
            Dec 21 – Dec 27
          </button>

          <button
            onClick={handleRefresh}
            aria-label="Refresh data"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.06]"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.06]"
          >
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <button
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.06]"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-pink-500" />
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-purple-600/25"
          >
            <Download className="h-4 w-4" />
            Export Report
          </motion.button>

          <button className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 hover:bg-white/[0.06]">
            <Avatar initials="AA" size="sm" />
            <ChevronDown className="h-3.5 w-3.5 text-white/40" />
          </button>
        </div>

        {/* Mobile: just bell + avatar */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/60"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-pink-500" />
          </button>
          <Avatar initials="AA" size="sm" />
        </div>
      </div>
    </header>
  );
}
