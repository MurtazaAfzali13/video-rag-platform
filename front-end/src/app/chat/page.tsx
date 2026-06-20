"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatUserId } from "@/hooks/use-chat-user";
import { initChat } from "@/lib/chat-api";

export default function ChatBootstrapPage() {
  const router = useRouter();
  const userId = useChatUserId();

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function bootstrap() {
      try {
        const chatId = await initChat(userId);
        if (!cancelled) router.replace(`/chat/${chatId}`);
      } catch {
        if (!cancelled) router.replace("/");
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  return (
    <main className="flex h-screen w-full items-center justify-center bg-[#050816] text-slate-400">
      {userId ? "Creating new chat…" : "Please sign in to use chat."}
    </main>
  );
}
