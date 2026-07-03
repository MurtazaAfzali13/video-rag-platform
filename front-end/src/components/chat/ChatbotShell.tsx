"use client";

import { useState, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatSidebar from "@/components/chat/ChatSidebar";

export default function ChatbotShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#050816]">
      {/* Mobile top bar with hamburger */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0B0F19]/95 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-purple-500/40 hover:text-white"
          aria-label="Open chat history"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-sm font-semibold text-white">VideoGPT</span>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar — persistent */}
        <div className="hidden h-full shrink-0 md:flex">
          <ChatSidebar />
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={closeSidebar}
                aria-label="Close sidebar backdrop"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,85vw)] shadow-2xl md:hidden"
              >
                <div className="relative flex h-full w-full flex-col">
                  <button
                    type="button"
                    onClick={closeSidebar}
                    className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white md:hidden"
                    aria-label="Close chat history"
                  >
                    <X className="size-4" />
                  </button>
                  <ChatSidebar onNavigate={closeSidebar} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
