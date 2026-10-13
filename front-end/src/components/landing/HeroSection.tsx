"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Youtube, LayoutDashboard, ArrowRight } from "lucide-react";

export default function HeroSection() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  // تابع بررسی لاگین برای دکمه‌ها
  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    if (isSignedIn) {
      router.push(path);
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-[#050816] px-4 py-24">
      {/* هاله نوری پس‌زمینه دقیقاً مشابه FeaturesSection */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* برچسب کوچک بالای تیتر */}
        <p className="text-xs text-purple-400 uppercase tracking-widest mb-4 font-medium">
          VidBrain AI
        </p>
        
        {/* تیتر اصلی */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
          Chat with any <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            YouTube video
          </span>
        </h1>
        
        {/* توضیحات کوتاه */}
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
          Transform YouTube content into an interactive AI experience. Ask questions, get timestamped answers, and discover insights in seconds.
        </p>

        {/* دکمه‌ها */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleNavigation("/chatbot")}
            className="group flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            <Youtube className="size-4" />
            <span>Start Chatting</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          
          <button
            onClick={handleNavigation("/dashboard")}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-800/50 bg-[#08101F] text-sm font-medium text-slate-300 hover:border-purple-500/30 hover:bg-[#0A1220] hover:text-white active:scale-95 transition-all duration-200"
          >
            <LayoutDashboard className="size-4 text-slate-400 group-hover:text-purple-400" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </section>
  );
}