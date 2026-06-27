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

    // ۱. تولید فوری آیدی در سمت کلاینت برای جلوگیری از نشست‌های روح
    const newChatId = uuidv4();
    
    // ۲. انتقال آنی به صفحه چت و پاس دادن لینک ویدیو در کوئری استرینگ
    router.push(`/chatbot/chat/${newChatId}?videoUrl=${encodeURIComponent(url)}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 bg-[#050816] relative overflow-hidden h-full">
      {/* هاله های نوری پس زمینه */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative float-anim">
            <div className="absolute inset-0 rounded-2xl bg-purple-600/30 blur-xl" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-2xl shadow-purple-500/30">
              <Youtube className="size-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              What video would you like to explore?
            </h1>
            <p className="mt-2 text-slate-400 text-sm">
              Paste any YouTube URL and start asking questions with AI
            </p>
          </div>
        </div>

        {/* فرم ورودی تک دکمه‌ای یکپارچه */}
        <form onSubmit={handleStart} className="w-full relative flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#08101F] px-4 py-3 focus-within:border-purple-500/50 focus-within:shadow-lg focus-within:shadow-purple-500/20 transition-all duration-300">
          <Link2 className="shrink-0 size-4 text-slate-500" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 bg-transparent text-white placeholder:text-slate-500 text-sm focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 rounded-xl text-sm font-medium shadow-lg shadow-purple-500/20 transition-all duration-200 active:scale-95"
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