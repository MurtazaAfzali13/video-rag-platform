"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Youtube, ArrowRight, Sparkles, Link2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function ChatbotHomePage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const newChatId = uuidv4();
    router.push(`/chatbot/chat/${newChatId}?videoUrl=${encodeURIComponent(url)}`);
  };

  return (
    <div className="relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden bg-[#050816] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-purple-600/5 blur-[80px] sm:h-[600px] sm:w-[600px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/3 h-[200px] w-[200px] rounded-full bg-blue-600/5 blur-[60px] sm:h-[400px] sm:w-[400px] sm:blur-[100px]" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 text-center sm:gap-8">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="relative float-anim">
            <div className="absolute inset-0 rounded-2xl bg-purple-600/30 blur-xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-2xl shadow-purple-500/30 sm:h-16 sm:w-16">
              <Youtube className="size-7 text-white sm:size-8" />
            </div>
          </div>
          <div className="px-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              What video would you like to explore?
            </h1>
            <p className="mt-2 text-xs text-slate-400 sm:text-sm">
              Paste any YouTube URL and start asking questions with AI
            </p>
          </div>
        </div>

        <form
          onSubmit={handleStart}
          className="relative flex w-full flex-col gap-3 rounded-2xl border border-slate-700/50 bg-[#08101F] p-3 transition-all duration-300 focus-within:border-purple-500/50 focus-within:shadow-lg focus-within:shadow-purple-500/20 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link2 className="size-4 shrink-0 text-slate-500" />
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
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:from-purple-500 hover:to-purple-600 active:scale-95 disabled:opacity-50 sm:w-auto sm:py-2"
          >
            <Sparkles className="size-4" />
            Process
            <ArrowRight className="size-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
