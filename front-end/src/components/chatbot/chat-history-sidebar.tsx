"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Settings, LogOut, Loader2 } from "lucide-react";
import { initChat } from "@/lib/chat-api";

interface ChatSummary {
  id: string;
  title: string;
  video_id?: string | null;
  created_at: string;
}

function groupChatsByDate(chats: ChatSummary[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, ChatSummary[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const chat of chats) {
    const created = new Date(chat.created_at);
    if (created >= today) groups.Today.push(chat);
    else if (created >= yesterday) groups.Yesterday.push(chat);
    else if (created >= weekAgo) groups["Last 7 days"].push(chat);
    else groups.Older.push(chat);
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function ChatHistorySidebar({
  activeChatId,
  userId,
  onNewChat,
}: {
  activeChatId?: string | null;
  userId: string;
  onNewChat?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleNewChat = async () => {
    if (creating) return;
    setCreating(true);
    try {
      if (onNewChat) {
        await onNewChat();
      } else {
        const chatId = await initChat(userId);
        router.push(`/chat/${chatId}`);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadChats() {
      try {
        const response = await fetch(
          `/api/chats?user_id=${encodeURIComponent(userId)}`
        );
        const data = (await response.json()) as ChatSummary[];
        if (!cancelled && response.ok) {
          setChats(data);
        }
      } catch {
        // sidebar falls back to empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChats();
    return () => {
      cancelled = true;
    };
  }, [userId, activeChatId]);

  const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);

  return (
    <aside className="relative flex w-[20%] min-w-[260px] flex-col overflow-hidden border-r border-slate-700/30 bg-gradient-to-b from-[#08101F] via-[#050816] to-[#050816] backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-transparent" />

      <div className="relative border-b border-slate-700/30 p-5">
        <Button
          onClick={handleNewChat}
          disabled={creating}
          className="w-full gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 py-5 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] hover:from-purple-500 hover:to-purple-600 hover:shadow-purple-500/30 active:scale-98 disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          <span className="font-medium">{creating ? "Creating…" : "New Chat"}</span>
        </Button>
      </div>

      <ScrollArea className="custom-scrollbar-sidebar flex-1 px-3 py-4">
        {loading ? (
          <p className="px-3 text-xs text-slate-500">Loading chats…</p>
        ) : groupedChats.length === 0 ? (
          <p className="px-3 text-xs text-slate-500">No chats yet</p>
        ) : (
          <div className="space-y-6">
            {groupedChats.map(([group, sectionChats]) => (
              <div key={group}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group}
                </p>
                <ul className="space-y-1">
                  {sectionChats.map((chat) => {
                    const isActive = activeChatId === chat.id;
                    return (
                      <li key={chat.id}>
                        <button
                          type="button"
                          onClick={() => router.push(`/chat/${chat.id}`)}
                          className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                            isActive
                              ? "border border-purple-500/40 bg-purple-600/15 text-slate-100 shadow-lg shadow-purple-500/10"
                              : "text-slate-300 hover:border hover:border-purple-500/20 hover:bg-[#101A2E] hover:text-slate-100"
                          }`}
                        >
                          <MessageSquare
                            className={`size-4 shrink-0 ${
                              isActive ? "text-purple-300" : "text-purple-400 group-hover:text-purple-300"
                            }`}
                          />
                          <span className="flex-1 truncate text-[13px] font-medium">
                            {chat.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="relative space-y-4 border-t border-slate-700/30 p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-400">Free Plan Usage</span>
            <span className="font-semibold text-purple-400">68%</span>
          </div>
          <Progress value={68} className="h-1.5 bg-slate-800/50" />
        </div>

        <Button
          variant="outline"
          className="w-full rounded-lg border-purple-500/30 py-2 text-xs font-medium text-purple-400 transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300"
        >
          Upgrade to Pro
        </Button>

        <div className="space-y-1 pt-2">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-all duration-200 hover:bg-[#101A2E] hover:text-slate-200">
            <Settings className="size-4" />
            <span>Settings</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-all duration-200 hover:bg-[#101A2E] hover:text-red-400">
            <LogOut className="size-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar-sidebar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-track {
          background: #0c1426;
          border-radius: 10px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb {
          background: #7c3aed;
          border-radius: 10px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
      `}</style>
    </aside>
  );
}
