"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { ChatHistorySidebar } from "@/components/chatbot/chat-history-sidebar";
import { VideoTimelinePanel } from "@/components/chatbot/video-timeline-panel";
import ChatPage from "@/components/chatbot/ai-assistant-panel";
import { VideoProvider } from "@/context/VideoContext";
import { useChatUserId } from "@/hooks/use-chat-user";
import { initChat } from "@/lib/chat-api";

export interface ChatMetadata {
  id: string;
  user_id: string;
  title: string;
  video_id: string | null;
  created_at: string;
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function toUiMessages(records: StoredMessage[]): UIMessage[] {
  return records.map((record) => ({
    id: record.id,
    role: record.role,
    parts: [{ type: "text" as const, text: record.content }],
  }));
}

interface ChatSessionShellProps {
  chatId: string;
}

export function ChatSessionShell({ chatId }: ChatSessionShellProps) {
  const router = useRouter();
  const userId = useChatUserId();
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [boundVideoId, setBoundVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !chatId) return;

    let cancelled = false;

    async function hydrateSession() {
      setLoading(true);

      try {
        const [metaRes, messagesRes] = await Promise.all([
          fetch(`/api/chats/${chatId}?user_id=${encodeURIComponent(userId)}`),
          fetch(
            `/api/chats/${chatId}/messages?user_id=${encodeURIComponent(userId)}`
          ),
        ]);

        if (!metaRes.ok) {
          if (!cancelled) {
            const newId = await initChat(userId);
            router.replace(`/chat/${newId}`);
          }
          return;
        }

        const metadata = (await metaRes.json()) as ChatMetadata;
        const messages = messagesRes.ok
          ? ((await messagesRes.json()) as StoredMessage[])
          : [];

        if (metadata.user_id !== userId) {
          if (!cancelled) router.replace("/chat");
          return;
        }

        if (!cancelled) {
          setBoundVideoId(metadata.video_id ?? null);
          setInitialMessages(toUiMessages(messages));
        }
      } catch {
        if (!cancelled) router.replace("/chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [chatId, userId, router]);

  const handleVideoBound = useCallback((videoId: string) => {
    setBoundVideoId(videoId);
  }, []);

  const handleNewChat = useCallback(async () => {
    if (!userId) return;
    const newId = await initChat(userId);
    router.push(`/chat/${newId}`);
  }, [userId, router]);

  if (!userId) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-[#050816] text-slate-400">
        Please sign in to use chat.
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-[#050816] text-slate-400">
        Loading chat…
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full overflow-hidden text-slate-200">
      <VideoProvider initialVideoId={boundVideoId}>
        <ChatHistorySidebar
          activeChatId={chatId}
          userId={userId}
          onNewChat={handleNewChat}
        />
        <VideoTimelinePanel
          chatId={chatId}
          userId={userId}
          onVideoBound={handleVideoBound}
        />
        <ChatPage
          chatId={chatId}
          userId={userId}
          boundVideoId={boundVideoId}
          onNewChat={handleNewChat}
          initialMessages={initialMessages}
        />
      </VideoProvider>
    </main>
  );
}
