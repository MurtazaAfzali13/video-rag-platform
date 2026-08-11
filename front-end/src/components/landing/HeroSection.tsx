"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Youtube, Sparkles } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#09090F] px-4 py-20 sm:px-6 lg:px-8">
      {/* خلفية بسيطة (مثل FeaturesSection) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(139,92,246,0.15),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_100%_50%,rgba(59,130,246,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_0%_80%,rgba(168,85,247,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#09090F_80%)]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,1) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-center gap-12 lg:flex-row lg:gap-16 min-h-[calc(100vh-6rem)]">
        {/* ستون چپ: متن و دکمه */}
        <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          {/* نشانگر "AI-Powered" */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-200 shadow-[0_0_24px_rgba(168,85,247,0.12)] backdrop-blur-sm">
            <Sparkles className="size-3.5 text-purple-300" />
            <span>AI-Powered YouTube Analysis</span>
            <span className="h-1 w-1 rounded-full bg-purple-400" />
            <span className="rounded-full bg-purple-600/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
              New
            </span>
          </div>

          {/* عنوان اصلی */}
          <h1 className="mt-8 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
            Chat with any
            <br />
            <span className="bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#818CF8] bg-clip-text text-transparent">
              YouTube video
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
            VideoGPT transforms YouTube content into an interactive AI experience.
            Ask questions, get timestamped answers, and discover insights you would
            have missed.
          </p>

          {/* دکمه‌ها */}
          <div className="mt-10 flex w-full flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <Link
              href="/chatbot"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(168,85,247,0.35)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(168,85,247,0.45)] active:scale-[0.98] sm:w-auto"
            >
              <Youtube className="size-4" />
              <span>Start for free</span>
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white/80 backdrop-blur-md transition-all duration-300 hover:border-purple-500/30 hover:bg-white/[0.07] hover:text-white sm:w-auto"
            >
              See how it works
            </Link>
          </div>

          {/* اعتماد اجتماعی ساده */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {["from-violet-500", "from-purple-500", "from-fuchsia-500"].map(
                (gradient, i) => (
                  <div
                    key={gradient}
                    className={`flex size-8 items-center justify-center rounded-full border-2 border-[#09090F] bg-gradient-to-br ${gradient} to-purple-800 text-[10px] font-bold text-white shadow-lg`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                )
              )}
            </div>
            <div>
              <p className="text-xs text-white/50">Loved by 10,000+ learners</p>
            </div>
          </div>
        </div>

        {/* ستون راست: تصویر شبه mockup با حاشیه‌ای شیشه‌ای (ساده) */}
        <div className="flex w-full max-w-lg flex-1 justify-center lg:justify-end">
          <div className="relative w-full max-w-[580px]">
            {/* شیشه‌ای ساده و تمیز - بدون حلقه‌ها و انیمیشن‌ها */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] p-3 shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a12]">
                <Image
                  src="/images/image-hero.png"
                  alt="VideoGPT AI workspace"
                  width={1200}
                  height={750}
                  priority
                  className="h-auto w-full object-cover"
                />
                {/* سایه‌ی نرم در پایین */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}