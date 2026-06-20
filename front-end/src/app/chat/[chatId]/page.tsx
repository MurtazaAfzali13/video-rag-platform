"use client";

import { use } from "react";
import { ChatSessionShell } from "@/components/chatbot/chat-session-shell";

export default function ChatSessionPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  return <ChatSessionShell chatId={chatId} />;
}
