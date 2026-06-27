"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  Youtube,
  Crown,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useChatUserId } from "@/hooks/useChatUserId";
import { fetchChats } from "@/lib/chat-api";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Chat } from "@/types";
import { Progress } from "@/components/ui/progress";

function groupChatsByDate(chats: Chat[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Chat[]> = {
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

export default function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const userId = useChatUserId();

  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadChats = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchChats(userId);
      // فیلتر کردن چت‌های خالی (New Chat)
      const validChats = data.filter(
        (chat) => chat.title?.trim().toLowerCase() !== "new chat"
      );
      setChats(validChats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [loadChats]);

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const groupedChats = useMemo(() => groupChatsByDate(filtered), [filtered]);

  const handleNewChat = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      router.push("/chatbot");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="relative flex w-[280px] shrink-0 flex-col h-full bg-gradient-to-b from-[#0B0F19] via-[#0A0E17] to-[#080C14] border-r border-white/[0.06]">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-transparent" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-purple-600/20 blur-xl group-hover:bg-purple-600/30 transition-all" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/30">
              <Youtube className="size-4 text-white" />
            </div>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">VideoGPT</span>
        </Link>

        <button
          onClick={handleNewChat}
          disabled={isCreating}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-600/20 transition-all duration-200 group"
          title="New Chat"
        >
          {isCreating ? (
            <Loader2 className="size-4 text-purple-400 animate-spin" />
          ) : (
            <Plus className="size-4 text-slate-400 group-hover:text-purple-400" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative px-3 py-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus-within:border-purple-500/50 transition-all duration-200">
          <Search className="size-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          <span className="text-[10px] text-slate-600 border border-white/10 rounded px-1.5 py-0.5">⌘K</span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="relative px-3 pb-3">
        <button
          onClick={handleNewChat}
          disabled={isCreating}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/10 border border-purple-500/20 hover:border-purple-500/40 hover:from-purple-600/30 transition-all duration-200 group disabled:opacity-60"
        >
          {isCreating ? (
            <Loader2 className="size-4 text-purple-400 animate-spin" />
          ) : (
            <>
              <Plus className="size-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">New Chat</span>
              <Sparkles className="size-3.5 text-purple-400/60 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar">
        <p className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <MessageSquare className="size-3" />
          Chat History
        </p>

        {isLoading ? (
          <div className="space-y-1.5 px-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-white/5 animate-pulse"
                style={{ opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        ) : groupedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-2xl" />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-700/20 border border-purple-500/20">
                <MessageSquare className="size-6 text-purple-400/60" />
              </div>
            </div>
            <p className="text-sm text-slate-400 font-medium">No chats yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Process a video to start
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedChats.map(([group, groupChats]) => (
              <div key={group}>
                <p className="px-2 py-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {groupChats.map((chat) => {
                    const isActive = pathname === `/chatbot/chat/${chat.id}`;
                    return (
                      <li key={chat.id}>
                        <Link
                          href={`/chatbot/chat/${chat.id}`}
                          className={cn(
                            "group relative flex w-full items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-purple-600/15 to-purple-700/5 border border-purple-500/20 shadow-lg shadow-purple-500/5"
                              : "hover:bg-white/5 border border-transparent"
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full" />
                          )}
                          <div className="flex items-center justify-center w-6 h-6 rounded bg-white/5 shrink-0">
                            <Youtube
                              className={cn(
                                "size-3.5",
                                isActive ? "text-purple-400" : "text-slate-500"
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-xs font-medium truncate leading-snug",
                                isActive ? "text-white" : "text-slate-300"
                              )}
                            >
                              {chat.title}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {formatRelativeTime(chat.created_at)}
                            </p>
                          </div>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative space-y-3 border-t border-white/[0.06] p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Free Plan</span>
            <span className="text-purple-400 font-semibold">68%</span>
          </div>
          <Progress value={68} className="h-1 bg-white/10" />
        </div>

        <button className="w-full py-2 rounded-lg border border-purple-500/30 bg-purple-600/5 text-xs font-medium text-purple-400 hover:bg-purple-600/10 hover:border-purple-500/50 transition-all duration-200">
          <span className="flex items-center justify-center gap-2">
            <Crown className="size-3.5" />
            Upgrade to Pro
          </span>
        </button>

        <div className="space-y-1 pt-1">
          <button className="flex w-full items-center gap-3 px-2 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-200">
            <Settings className="size-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => signOut(() => router.push("/"))}
            className="flex w-full items-center gap-3 px-2 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-white/[0.06]">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || "User"}
              className="size-7 rounded-full ring-2 ring-purple-500/20"
            />
          ) : (
            <div className="size-7 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-purple-500/20">
              {user?.firstName?.[0] ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-300 truncate font-medium">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || "User"}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 58, 237, 0.5);
        }
      `}</style>
    </aside>
  );
}