"use client";

import { useState, type ReactNode } from "react";
import { Sidebar, Header, Footer } from "./layout";
import { ThemeProvider } from "./theme/ThemeProvider";

interface DashboardShellProps {
  children: ReactNode;
  breadcrumb?: string;
  title?: string;
  subtitle?: string;
}

export function DashboardShell({ children, breadcrumb, title, subtitle }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
        {/* Ambient background glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-cyan-500/5 blur-[120px]" />
        </div>

        {/* Sidebar never scrolls with the page */}
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        {/* This column is the ONLY scroll container; header sticks to its top */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header onOpenMobileMenu={() => setMobileOpen(true)} breadcrumb={breadcrumb} title={title} subtitle={subtitle} />
          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
          <Footer />
        </div>
      </div>
    </ThemeProvider>
  );
}
