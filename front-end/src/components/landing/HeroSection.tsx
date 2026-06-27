"use client";

import Link from "next/link";
import { ArrowRight, Youtube, Sparkles, Zap } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#050816]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-purple-600/8 blur-[140px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[100px]" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-purple-800/5 blur-[80px]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,58,237,1) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,1) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-600/10 text-purple-300 text-sm">
          <Sparkles className="size-3.5" />
          <span>AI-Powered YouTube Analysis</span>
          <span className="w-1 h-1 rounded-full bg-purple-400" />
          <span className="text-purple-400 text-xs">New</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          <span className="text-white">Chat with any</span>
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
            YouTube video
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          VideoGPT transforms YouTube content into an interactive AI experience.
          Ask questions, get timestamped answers, and discover insights you would have missed.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/chatbot"
            className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold text-sm hover:from-purple-500 hover:to-purple-600 transition-all duration-200 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/40 active:scale-95"
          >
            <Youtube className="size-4" />
            Start for free
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="#how-it-works"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-700/50 text-slate-300 text-sm hover:border-purple-500/40 hover:text-white hover:bg-purple-600/5 transition-all duration-200"
          >
            See how it works
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 pt-4">
          {[
            { value: "10K+", label: "Videos analyzed" },
            { value: "50K+", label: "Questions answered" },
            { value: "99%", label: "Accuracy rate" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Demo mockup hint */}
        <div className="relative mt-8 max-w-3xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-600/5 to-purple-600/10 rounded-3xl blur-xl" />
          <div className="relative rounded-3xl border border-slate-700/40 bg-[#08101F]/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-purple-500/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#0C1426] border border-slate-700/40 text-xs text-slate-500">
                  <Zap className="size-3 text-purple-400" />
                  videogpt.ai/chat
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3 h-40">
              <div className="col-span-2 rounded-xl bg-black/60 border border-slate-800/40 flex items-center justify-center">
                <Youtube className="size-8 text-purple-400/40" />
              </div>
              <div className="col-span-3 rounded-xl bg-[#0C1426]/60 border border-slate-800/40 flex flex-col gap-2 p-3">
                <div className="h-2 rounded bg-slate-700/50 w-3/4" />
                <div className="h-2 rounded bg-purple-600/30 w-full" />
                <div className="h-2 rounded bg-slate-700/50 w-2/3" />
                <div className="mt-auto flex gap-1.5">
                  <div className="h-6 w-16 rounded-lg bg-purple-600/40 border border-purple-500/30" />
                  <div className="h-6 w-12 rounded-lg bg-purple-600/40 border border-purple-500/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
