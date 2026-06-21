"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
export default function ChatbotRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat");
  }, [router]);

  return (
     <main className="flex h-screen w-full items-center justify-center bg-[#050816]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/30" />
          <div className="relative rounded-full bg-purple-600 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">
            Loading AI Assistant
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Preparing your workspace...
          </p>
        </div>
      </div>
    </main>
  );
}
