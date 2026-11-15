"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Youtube,
  ArrowRight,
  Sparkles,
  Link2,
  Menu,
  Cpu,
  MessageSquare,
  ShieldCheck,
  Clock,
  Lock,
  CornerDownLeft,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useSidebar } from "@/context/SidebarContext";

/* ---------- design-only data (fixed values, so no hydration mismatch) ---------- */

const particles = [
  { l: "8%", t: "18%", d: 0, s: 2 },
  { l: "18%", t: "72%", d: 1.2, s: 3 },
  { l: "26%", t: "34%", d: 0.6, s: 2 },
  { l: "34%", t: "86%", d: 2.1, s: 2 },
  { l: "47%", t: "12%", d: 1.6, s: 3 },
  { l: "58%", t: "78%", d: 0.3, s: 2 },
  { l: "66%", t: "26%", d: 2.4, s: 2 },
  { l: "74%", t: "62%", d: 0.9, s: 3 },
  { l: "83%", t: "16%", d: 1.9, s: 2 },
  { l: "90%", t: "48%", d: 0.4, s: 2 },
  { l: "94%", t: "82%", d: 1.4, s: 3 },
  { l: "4%", t: "52%", d: 2.7, s: 2 },
];

const steps = [
  { icon: Link2, label: "Paste" },
  { icon: Cpu, label: "Index" },
  { icon: MessageSquare, label: "Ask" },
  { icon: ShieldCheck, label: "Verify" },
];

const chips = [
  { icon: Clock, label: "Timestamped answers" },
  { icon: ShieldCheck, label: "Self-verified" },
  { icon: Lock, label: "Private to you" },
];

export default function ChatbotHomePage() {
  const [url, setUrl] = useState("");
  const router = useRouter();
  const { toggle: toggleSidebar } = useSidebar();
  const rootRef = useRef<HTMLDivElement>(null);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const newChatId = uuidv4();
    router.push(`/chatbot/chat/${newChatId}?videoUrl=${encodeURIComponent(url)}`);
  };

  // design only: cursor spotlight
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const hasText = !!url.trim();

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMove}
      className="relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden bg-[#050816] px-4 py-8 sm:px-6"
    >
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute left-4 top-4 z-20 flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-purple-500/40 hover:bg-white/10 hover:text-white md:hidden"
        aria-label="Open chat history"
      >
        <Menu className="size-5" />
      </button>

      {/* ---------- background ---------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-1/2 top-[12%] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[80px] sm:h-[560px] sm:w-[560px] sm:blur-[120px]"
          animate={{ x: [0, 50, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[10%] left-[22%] h-[200px] w-[200px] rounded-full bg-blue-600/10 blur-[60px] sm:h-[400px] sm:w-[400px] sm:blur-[100px]"
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[18%] right-[12%] h-[180px] w-[180px] rounded-full bg-cyan-500/10 blur-[70px] sm:h-[340px] sm:w-[340px] sm:blur-[110px]"
          animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 65% 55% at 50% 45%, black 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 45%, black 20%, transparent 75%)",
          }}
        />

        {/* floating particles */}
        {particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-purple-300"
            style={{ left: p.l, top: p.t, width: p.s, height: p.s }}
            animate={{ y: [0, -16, 0], opacity: [0.15, 0.8, 0.15] }}
            transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: p.d, ease: "easeInOut" }}
          />
        ))}

        {/* cursor spotlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx, 50%) var(--my, 40%), rgba(168,85,247,0.10), transparent 60%)",
          }}
        />
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,#050816_100%)]" />
      </div>

      {/* ---------- content ---------- */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 text-center sm:gap-8">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          {/* logo with orbit rings */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative float-anim"
          >
            <motion.div
              className="absolute inset-0 rounded-2xl bg-purple-600/40 blur-xl"
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="absolute -inset-3 sm:-inset-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 rounded-full border border-dashed border-purple-400/25" />
              <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_3px_rgba(103,232,249,0.8)]" />
            </motion.div>
            <motion.div
              className="absolute -inset-6 sm:-inset-8"
              animate={{ rotate: -360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 rounded-full border border-white/5" />
              <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-purple-300 shadow-[0_0_8px_2px_rgba(192,132,252,0.8)]" />
            </motion.div>

            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/20 bg-gradient-to-br from-purple-600 to-purple-800 shadow-2xl shadow-purple-500/30 sm:h-16 sm:w-16">
              <Youtube className="size-7 text-white sm:size-8" />
            </div>
          </motion.div>

          <div className="px-2">
            <motion.h1
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl font-bold tracking-tight text-white sm:text-4xl"
            >
              What video would you like to{" "}
              <motion.span
                className="bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent"
                style={{ backgroundSize: "200% auto" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
                transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                explore?
              </motion.span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-2 text-xs text-slate-400 sm:text-sm"
            >
              Paste any YouTube URL and start asking questions with AI
            </motion.p>
          </div>
        </div>

        {/* ---------- form ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full"
        >
          <div
            className={`pointer-events-none absolute -inset-3 rounded-[28px] bg-gradient-to-r from-purple-600/25 via-fuchsia-500/15 to-cyan-500/25 blur-2xl transition-opacity duration-500 ${
              hasText ? "opacity-100" : "opacity-40"
            }`}
          />

          <form
            onSubmit={handleStart}
            className="group relative w-full overflow-hidden rounded-2xl p-px transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-purple-500/20"
          >
            {/* rotating gradient border */}
            <motion.div
              className="absolute -inset-[100%] opacity-30 transition-opacity duration-300 group-focus-within:opacity-100"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0 60%, rgba(168,85,247,0.95) 80%, rgba(103,232,249,0.95) 100%)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 rounded-2xl border border-slate-700/50" />

            <div className="relative flex flex-col gap-4 rounded-[15px] bg-[#08101F] p-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 sm:gap-3 sm:py-0">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300 ${
                    hasText
                      ? "border-purple-400/40 bg-purple-500/15 text-purple-300"
                      : "border-white/10 bg-white/5 text-slate-500"
                  }`}
                >
                  <Link2 className="size-4" />
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!url.trim()}
                className="group/btn relative flex w-full shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:from-purple-500 hover:to-purple-600 hover:shadow-purple-500/40 active:scale-95 disabled:opacity-50 sm:w-auto sm:py-2"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                <Sparkles className="relative size-4 transition-transform duration-300 group-hover/btn:rotate-12 group-hover/btn:scale-110" />
                <span className="relative">Process</span>
                <ArrowRight className="relative size-3 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </form>
        </motion.div>

        {/* ---------- pipeline strip ---------- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex w-full max-w-md items-center justify-between"
          aria-hidden
        >
          {steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <motion.span
                  className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-purple-300"
                  animate={{
                    opacity: [0.45, 1, 0.45],
                    scale: [1, 1.12, 1],
                    borderColor: ["rgba(255,255,255,0.1)", "rgba(168,85,247,0.6)", "rgba(255,255,255,0.1)"],
                  }}
                  transition={{
                    duration: 0.9,
                    delay: i * 0.9,
                    repeat: Infinity,
                    repeatDelay: (steps.length - 1) * 0.9,
                  }}
                >
                  <s.icon className="size-4" />
                </motion.span>
                <span className="text-[10px] text-slate-500">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="relative mx-2 mb-5 h-px flex-1 bg-white/10">
                  <motion.span
                    className="absolute -top-[2px] size-[5px] rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.7)]"
                    animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 0.9,
                      delay: i * 0.9 + 0.45,
                      repeat: Infinity,
                      repeatDelay: (steps.length - 1) * 0.9,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* ---------- chips + hint ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            {chips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:border-purple-500/30 hover:text-slate-200"
              >
                <c.icon className="size-3 text-purple-400" />
                {c.label}
              </span>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
            Press
            <kbd className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] text-slate-400">
              Enter <CornerDownLeft className="size-2.5" />
            </kbd>
            to process
          </p>
        </motion.div>
      </div>
    </div>
  );
}