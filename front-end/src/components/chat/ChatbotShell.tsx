"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { useSidebar } from "@/context/SidebarContext";

export default function ChatbotShell({ children }: { children: React.ReactNode }) {
  // 🔧 قبلاً اینجا یک useState محلی جدا بود که فقط خودِ ChatbotShell می‌دیدش.
  // حالا از SidebarContext مشترک استفاده می‌کنیم تا هم این drawer، هم دکمه‌ی
  // همبرگر داخل ChatInterface (بالای صفحه‌ی چت) دقیقاً یک state را کنترل کنند.
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#050816]">
      {/*
        🔧 نوار بالای مخصوص موبایل («VideoGPT» + همبرگر) از اینجا حذف شد.
        دلیل: الان ChatInterface خودش یک هدر با دکمه‌ی همبرگر دارد (دقیقاً بالای
        بخش چت) و طبق عکس مرجع، نباید یک نوار برند اضافه‌ی جدا بالای همه‌چیز
        باشد — ویدیو باید مستقیماً بالاترین چیز روی صفحه باشد.
        اگر بعداً به یک برند/هدر سراسری روی موبایل نیاز داشتی، به‌جای برگردوندن
        این بلوک بهتر است به لوگوی داخل خودِ ChatSidebar (که هر بار drawer باز
        می‌شود دیده می‌شود) تکیه کنی.
      */}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar — persistent */}
        <div className="hidden h-full shrink-0 md:flex">
          <ChatSidebar />
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={close}
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
                    onClick={close}
                    className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white md:hidden"
                    aria-label="Close chat history"
                  >
                    <X className="size-4" />
                  </button>
                  <ChatSidebar onNavigate={close} />
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
