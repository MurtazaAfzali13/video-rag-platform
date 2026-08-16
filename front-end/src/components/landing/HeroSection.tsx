"use client";

import Link from "next/link";
import { ArrowRight, Youtube, Sparkles } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08101F] px-4 py-20 sm:px-6 lg:px-8">
      {/* خطوط بالا و پایین مشابه HowItWorks */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-600/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-600/20 to-transparent" />

      {/* هاله‌های نوری پس‌زمینه منطبق با تم بنفش */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute top-0 h-[500px] w-[800px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
        {/* نشانگر "AI-Powered" با رنگ‌بندی جدید */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-600/10 px-4 py-1.5 text-sm text-purple-300 shadow-[0_0_24px_rgba(147,51,234,0.15)] backdrop-blur-sm">
          <Sparkles className="size-3.5 text-purple-400" />
          <span>AI-Powered YouTube Analysis</span>
          <span className="h-1 w-1 rounded-full bg-purple-400" />
          <span className="rounded-full bg-purple-600/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-200">
            New
          </span>
        </div>

        {/* عنوان اصلی */}
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Chat with any
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-purple-500 to-purple-400 bg-clip-text text-transparent">
            YouTube video
          </span>
        </h1>

        {/* متن توضیحات (رنگ مشابه کامپوننت دوم - text-slate-400) */}
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg md:text-xl">
          VideoGPT transforms YouTube content into an interactive AI experience.
          Ask questions, get timestamped answers, and discover insights you would
          have missed.
        </p>

        {/* دکمه‌ها (طراحی شده برای قرارگیری در وسط و موبایل فرندلی) */}
        <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/chatbot"
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(147,51,234,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(147,51,234,0.35)] active:scale-[0.98] sm:w-auto"
          >
            <Youtube className="size-4" />
            <span>Start for free</span>
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#0C1426] to-[#08101F] px-8 py-3.5 text-sm font-medium text-slate-300 transition-all duration-300 hover:border-purple-500/50 hover:text-white sm:w-auto"
          >
            dashboard
          </Link>
        </div>

        {/* اعتماد اجتماعی (Social Proof) متمرکز در وسط */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex -space-x-2.5">
            {["from-violet-500", "from-purple-500", "from-fuchsia-500"].map(
              (gradient, i) => (
                <div
                  key={gradient}
                  className={`flex size-8 items-center justify-center rounded-full border-2 border-[#08101F] bg-gradient-to-br ${gradient} to-purple-800 text-[10px] font-bold text-white shadow-lg`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              )
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">
              Loved by 10,000+ learners
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}