"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk, useAuth } from "@clerk/nextjs";
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
  AlertCircle,
} from "lucide-react";
import { fetchChats } from "@/lib/chat-api";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Chat } from "@/types";
import { Progress } from "@/components/ui/progress";

/*
 * Color tokens (from the reference screenshot)
 * Sidebar bg      : #060B1E -> #040616
 * Card bg         : #0A1230   border #1B2757
 * Active row      : #3A2D9F -> #4C3BC2, border #6D5CF0
 * Accent          : #5B4FE9 -> #8B5CF6 (violet)
 * Title text      : #EEF1FA   Muted: #8590B5
 */

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

export default function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const chatsLengthRef = useRef(0);
  useEffect(() => {
    chatsLengthRef.current = chats.length;
  }, [chats.length]);

  const loadChats = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    const hadChatsBefore = chatsLengthRef.current > 0;
    if (chatsLengthRef.current === 0) {
      setIsLoading(true);
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("نشست شما نامعتبر است. لطفاً دوباره وارد شوید.");
      }

      const data = await fetchChats(token);

      const validChats = data.filter(
        (chat: Chat) => chat.title?.trim().toLowerCase() !== "new chat"
      );
      setChats(validChats);
      setError(null);
    } catch (e: any) {
      console.error("Failed to load chat history:", e);
      if (!hadChatsBefore) {
        setError(e.message || "خطا در بارگذاری تاریخچه چت‌ها.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  const loadChatsRef = useRef(loadChats);
  useEffect(() => {
    loadChatsRef.current = loadChats;
  }, [loadChats]);


  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    loadChatsRef.current();
    const interval = setInterval(() => {
      loadChatsRef.current();
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn]);

  const isFirstPathnameRun = useRef(true);
  useEffect(() => {
    if (isFirstPathnameRun.current) {
      isFirstPathnameRun.current = false;
      return;
    }
    if (!isLoaded || !isSignedIn) return;
    loadChatsRef.current();
  }, [pathname, isLoaded, isSignedIn]);

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const groupedChats = useMemo(() => groupChatsByDate(filtered), [filtered]);

  const handleNewChat = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      onNavigate?.();
      const newChatId = crypto.randomUUID();
      router.push("/chatbot");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="relative flex h-full w-[280px] shrink-0 flex-col bg-gradient-to-b from-[#060B1E] via-[#050A1C] to-[#040616] border-r border-[#1B2757]/60">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(91,79,233,0.14),transparent_45%)]" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-violet-500/25 blur-xl group-hover:bg-violet-500/40 transition-all" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B4FE9] to-[#8B5CF6] shadow-[0_0_16px_rgba(124,92,246,0.5)]">
              <Youtube className="size-4 text-white" />
            </div>
          </div>

         
          <span className="text-lg font-bold text-white tracking-tight">
            Vid<span className="text-[#8B5CF6]">Brain</span>
          </span>

        </Link>


        <button
          onClick={handleNewChat}
          disabled={isCreating}
          className="hidden items-center justify-center w-8 h-8 rounded-lg bg-[#0A1230] border border-[#1B2757] hover:border-violet-400/60 hover:bg-violet-500/20 transition-all duration-200 group md:flex"
          title="New Chat"
        >
          {isCreating ? (
            <Loader2 className="size-4 text-violet-300 animate-spin" />
          ) : (
            <Plus className="size-4 text-[#8590B5] group-hover:text-violet-300" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative px-3 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0A1230]/80 border border-[#1B2757] focus-within:border-violet-400/60 transition-all duration-200">
          <Search className="size-3.5 text-[#8590B5] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-[#5E688C] focus:outline-none"
          />
          <span className="text-[10px] text-[#5E688C] border border-[#1B2757] rounded px-1.5 py-0.5">⌘K</span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="relative px-3 pb-3">
        <button
          onClick={handleNewChat}
          disabled={isCreating}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#5B4FE9]/25 to-[#8B5CF6]/10 border border-violet-400/25 hover:border-violet-400/50 hover:from-[#5B4FE9]/35 transition-all duration-200 group disabled:opacity-60"
        >
          {isCreating ? (
            <Loader2 className="size-4 text-violet-300 animate-spin" />
          ) : (
            <>
              <Plus className="size-4 text-violet-300" />
              <span className="text-sm text-violet-200 font-medium">New Chat</span>
              <Sparkles className="size-3.5 text-violet-300/70 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </button>
      </div>

      {/* Chat History (card) */}
      <div className="relative mx-3 mb-3 flex-1 overflow-y-auto rounded-2xl border border-[#1B2757]/70 bg-[#0A1230]/60 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] custom-scrollbar">
        <p className="px-2 py-2.5 text-[13px] font-medium text-white flex items-center gap-2">
          <MessageSquare className="size-3.5 text-[#B4BCD8]" />
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="size-6 text-red-400/80 mb-3" />
            <p className="text-xs text-red-400 font-medium">{error}</p>
            <button
              onClick={loadChats}
              className="mt-4 px-3 py-1.5 rounded bg-white/5 text-[10px] text-violet-300 border border-violet-400/25 hover:bg-white/10 transition-colors"
            >
              تلاش دوباره
            </button>
          </div>
        ) : groupedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 border border-indigo-400/20">
                <MessageSquare className="size-6 text-violet-300/70" />
              </div>
            </div>
            <p className="text-sm text-[#8590B5] font-medium">No chats yet</p>
            <p className="text-xs text-[#5E688C] mt-1">
              Process a video to start
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedChats.map(([group, groupChats]) => (
              <div key={group}>
                <p className="px-2 py-1 text-xs text-[#8590B5] font-medium">
                  {group}
                </p>
                <ul>
                  {groupChats.map((chat) => {
                    const displayTitle = chat.title || "New Chat";
                    const isActive = pathname === `/chatbot/chat/${chat.id}`;
                    return (
                      <li
                        key={chat.id}
                        className={cn(
                          "border-b last:border-b-0",
                          isActive ? "border-transparent" : "border-white/[0.06]"
                        )}
                      >
                        <Link
                          href={`/chatbot/chat/${chat.id}`}
                          onClick={onNavigate}
                          className={cn(
                            "group relative flex w-full items-center gap-3 px-2.5 py-3 rounded-xl text-left transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-[#3A2D9F] to-[#4C3BC2] border border-[#6D5CF0]/70 shadow-[0_0_20px_rgba(109,92,240,0.30)]"
                              : "hover:bg-white/[0.04] border border-transparent"
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-violet-300 rounded-full" />
                          )}
                          <div
                            className={cn(
                              "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
                              isActive
                                ? "bg-[#6D5CF0]"
                                : "bg-[#101A40] border border-[#26397A]/60"
                            )}
                          >
                            <Youtube
                              className={cn(
                                "size-3.5",
                                isActive ? "text-white" : "text-[#B4BCD8]"
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-[13px] font-medium truncate leading-snug",
                                isActive ? "text-white" : "text-[#EEF1FA]"
                              )}
                            >
                              {displayTitle}
                            </p>
                            <p
                              className={cn(
                                "text-[11px] mt-0.5",
                                isActive ? "text-indigo-200/80" : "text-[#8590B5]"
                              )}
                            >
                              {formatRelativeTime(chat.created_at)}
                            </p>
                          </div>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-200 shrink-0" />
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
      <div className="relative space-y-3 p-3 pt-0">
        {/* Plan card */}
        <div className="space-y-3 rounded-2xl border border-[#1B2757]/80 bg-[#0A1230]/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Free Plan</span>
              <span className="text-xs font-semibold text-violet-300">68%</span>
            </div>
            <Progress
              value={68}
              className="h-1.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#5B4FE9] [&>div]:to-[#8B5CF6]"
            />
          </div>

          <button className="w-full py-2.5 rounded-lg border border-white/10 bg-[#0D1736] text-xs font-medium text-white hover:bg-[#14204A] hover:border-violet-400/40 transition-all duration-200">
            <span className="flex items-center justify-center gap-2">
              <Crown className="size-3.5 text-yellow-400" />
              Upgrade to Pro
            </span>
          </button>
        </div>

        <div className="space-y-1">
          <button className="flex w-full items-center gap-3 px-2 py-2 rounded-lg text-sm text-[#8590B5] hover:bg-white/5 hover:text-slate-200 transition-all duration-200">
            <Settings className="size-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => signOut(() => router.push("/"))}
            className="flex w-full items-center gap-3 px-2 py-2 rounded-lg text-sm text-[#8590B5] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.06]">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || "User"}
              className="size-7 rounded-full ring-2 ring-violet-400/30"
            />
          ) : (
            <div className="size-7 rounded-full bg-gradient-to-br from-[#5B4FE9] to-[#8B5CF6] flex items-center justify-center text-xs font-bold text-white shadow-[0_0_12px_rgba(124,92,246,0.4)]">
              {user?.firstName?.[0] ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#EEF1FA] truncate font-medium">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || "User"}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(167, 139, 250, 0.55);
        }
      `}</style>
    </aside>
  );
}
