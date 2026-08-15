"use client";

/**
 * PreflightIndicator
 * -------------------
 * جایگزین ظریف‌تر LoadingSkeleton قدیمی، برای همان چند صدم ثانیه‌ی کوتاهی که
 * بین ارسال پیام و رسیدن اولین رویداد "progress" از SSE فاصله می‌افتد
 * (یعنی هنوز مشخص نیست کدام گره از LangGraph شروع به کار می‌کند).
 *
 * به‌جای اسکلتون بزرگ با خط‌های جعلی متن، فقط ۴ نقطه‌ی گرادیانت با یک
 * موج نرم و هم‌راستا با پالت بنفش پروژه نمایش داده می‌شود — سبک‌تر، شیک‌تر
 * و کمتر شلوغ، بلافاصله بعد از اولین progress event با NodeProgressIndicator
 * جایگزین می‌شود.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

const DOT_COUNT = 4;

export function PreflightIndicator() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex justify-start w-full">
      <div className="mr-3 mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
        <Sparkles className="size-3.5 animate-pulse text-white motion-reduce:animate-none" />
      </div>

      <div className="flex items-center gap-3 rounded-2xl rounded-tl-md border border-white/[0.08] bg-[#101A2E]/80 px-5 py-4 backdrop-blur-[10px] shadow-lg shadow-purple-950/10">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <motion.span
              key={i}
              className="block size-2 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 shadow-sm shadow-purple-500/50"
              animate={
                prefersReducedMotion
                  ? { opacity: [0.4, 1, 0.4] }
                  : {
                      y: [0, -5, 0],
                      opacity: [0.45, 1, 0.45],
                      scale: [0.85, 1.05, 0.85],
                    }
              }
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>

        <span className="text-[11px] text-slate-400 tracking-wide">
          در حال آماده‌سازی پاسخ…
        </span>
      </div>
    </div>
  );
}

export default PreflightIndicator;
