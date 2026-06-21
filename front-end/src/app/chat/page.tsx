"use client";

import { useChatUserId } from "@/hooks/use-chat-user";
import { ChatSessionShell } from "@/components/chatbot/chat-session-shell";

export default function ChatBootstrapPage() {
  const userId = useChatUserId();

  if (!userId) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-[#050816] text-slate-400">
        Please sign in to use chat.
      </main>
    );
  }


  return <ChatSessionShell />; 
}