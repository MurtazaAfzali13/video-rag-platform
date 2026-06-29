"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { 
  Send, 
  Sparkles, 
  Bot, 
  Copy, 
  Check, 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  ArrowUpRight,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVideo } from "@/context/VideoContext";
import { cn } from "@/lib/utils";
import type { Message, Chat } from "@/types";

interface Props {
  chatId: string;
  chat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onRegenerate?: () => void;
  onClearChat?: () => void;
}

type QuestionType = "general" | "about_video";

// ==========================================
// Helper Functions (Inline for portability)
// ==========================================

function parseTimestampToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1] || 0;
}

function extractTimestamps(text: string): string[] {
  const regex = /\[?\b(\d{1,2}:\d{2}(?::\d{2})?)\b\]?/g;
  const matches = [...text.matchAll(regex)];
  return Array.from(new Set(matches.map(m => m[1])));
}

function removeTimestampsFromText(text: string): string {
  // Removes timestamps and cleans up extra spaces
  return text.replace(/\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?/g, '').replace(/\s{2,}/g, ' ').trim();
}

const isVideoSummary = (content: string) => {
  const trimmed = content.trim();
  return trimmed.startsWith("{") && trimmed.includes("key_takeaways");
};

// ==========================================
// Components
// ==========================================

const TimestampPill = memo(function TimestampPill({
  time,
  onClick,
}: {
  time: string;
  onClick: (seconds: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(parseTimestampToSeconds(time))}
      className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-gradient-to-r from-violet-600/20 to-purple-700/20 px-3 py-1.5 text-xs font-medium text-purple-300 shadow-sm shadow-purple-500/10 transition-all duration-200 hover:scale-105 hover:border-purple-400/70 hover:from-violet-600/40 hover:to-purple-700/40 hover:text-purple-100 active:scale-95 group"
      aria-label={`Jump to ${time}`}
    >
      <span className="shrink-0 font-mono">[{time}]</span>
      <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  );
});

const CopyButton = memo(function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-700/50 hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
      title="Copy response"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
});

function LoadingSkeleton() {
  return (
    <div className="flex justify-start w-full">
      <div className="mr-3 mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
        <Sparkles className="size-3.5 animate-pulse text-white" />
      </div>
      <div className="w-full max-w-md space-y-2.5 rounded-2xl rounded-tl-md border border-white/[0.08] bg-[#101A2E]/80 px-5 py-4 backdrop-blur-[10px]">
        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-700/60" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-700/50" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-slate-700/40" />
        <div className="flex items-center gap-1.5 pt-1">
          <div className="size-1.5 animate-bounce rounded-full bg-purple-400" />
          <div className="size-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:150ms]" />
          <div className="size-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

const AssistantContent = memo(function AssistantContent({
  content,
  isStreaming,
  onJumpToTime,
}: {
  content: string;
  isStreaming: boolean;
  onJumpToTime: (seconds: number) => void;
}) {
  // 1. Check for Structured Data (JSON)
  if (isVideoSummary(content) && !isStreaming) {
    try {
      // In a real app, you might want to use 'jsonrepair' here if the LLM output is malformed
      const parsed = JSON.parse(content);
      const takeaways = parsed.key_takeaways || [];

      return (
        <div className="flex w-full flex-col gap-4 text-sm">
          <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2 text-xs text-purple-400">
            <Sparkles className="size-4" />
            <span className="font-medium">AI Video Summary</span>
          </div>
          {parsed.overall_summary && (
            <p className="leading-relaxed text-slate-300">{parsed.overall_summary}</p>
          )}
          {takeaways.length > 0 && (
            <div className="mt-2 space-y-3">
              {takeaways.map((item: any, i: number) => (
                <div key={i} className="flex flex-col gap-1.5 rounded-lg bg-white/5 p-3 border border-white/5">
                  <p className="text-slate-300 text-sm leading-relaxed">{item.point}</p>
                  {item.timestamp && (
                    <div className="flex justify-end">
                      <TimestampPill time={item.timestamp} onClick={onJumpToTime} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } catch (e) {
      // Fallback to normal text processing if JSON parse fails
      console.error("Failed to parse video summary JSON", e);
    }
  }

  // 2. Standard Text Processing (Extract timestamps, clean text)
  const timestamps = extractTimestamps(content);
  const cleanContent = removeTimestampsFromText(content);

  return (
    <div className="flex w-full flex-col gap-3 text-sm">
      {cleanContent && (
        <div className="prose prose-invert max-w-none leading-relaxed whitespace-pre-wrap text-slate-300 [&_code]:rounded [&_code]:bg-slate-800/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:bg-slate-900/80">
          {cleanContent}
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-purple-400 align-middle"
              aria-hidden="true"
            />
          )}
        </div>
      )}
      
      {/* Show timestamps only at the bottom */}
      {timestamps.length > 0 && !isStreaming && (
        <div className="mt-2 pt-3 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <ArrowUpRight className="size-3" />
            Sources
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {timestamps.map((timestamp, index) => (
              <TimestampPill
                key={`${timestamp}-${index}`}
                time={timestamp}
                onClick={onJumpToTime}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});



export default function ChatInterface({
  chatId,
  chat,
  messages,
  isLoading,
  isTyping,
  onSendMessage,
  onRegenerate,
  onClearChat,
}: Props) {
  const [input, setInput] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("about_video");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { jumpToTime } = useVideo();

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;
    
    // You could pass `questionType` inside the message or context if your backend needs it.
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section
      className="relative flex min-w-0 flex-1 flex-col h-full"
      style={{
        background: "radial-gradient(circle at top, rgba(124,58,237,0.12), transparent 40%), linear-gradient(180deg, #08101F 0%, #050816 100%)",
      }}
    >
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 flex-shrink-0 border-b border-slate-700/30 bg-[#08101F]/40 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-white sm:text-sm truncate">
                {chat?.title || "AI Assistant"}
              </h2>
            </div>
          </div>

          {/* Type Toggle Options */}
          <div className="flex gap-1 rounded-lg border border-slate-700/30 bg-[#0C1426] p-0.5">
            <button
              type="button"
              onClick={() => setQuestionType("general")}
              className={`rounded-md px-2.5 py-1 text-xs transition-all duration-200 sm:px-3 ${
                questionType === "general"
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("about_video")}
              className={`rounded-md px-2.5 py-1 text-xs transition-all duration-200 sm:px-3 ${
                questionType === "about_video"
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              About Video
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="flex flex-col items-center gap-3">
                <div className="size-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                <p className="text-sm text-slate-400">Loading conversation…</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[280px] sm:h-[320px] text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-700/20 border border-purple-500/20">
                <MessageSquare className="size-8 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Ask anything about this video</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md">
                I can help you understand the content better.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const isLast = index === messages.length - 1;
                const isStreaming = !isUser && isLast && isTyping;

                if (isUser) {
                  return (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-purple-700 px-4 py-3 shadow-lg shadow-purple-500/20 sm:max-w-[88%] sm:px-5">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                          {msg.content}
                        </p>
                      </div>
                    </motion.div>
                  );
                }

                // Assistant Message
                return (
                  <motion.div
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start w-full"
                  >
                    <div className="mr-3 mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
                      <Sparkles className="size-3.5 text-white" />
                    </div>
                    <div className="group relative max-w-[85%] min-w-0 rounded-2xl rounded-tl-md border border-white/[0.08] bg-[#101A2E]/80 shadow-xl backdrop-blur-[10px] sm:max-w-[88%]">
                      <div className="px-4 py-3.5 sm:px-5">
                        <AssistantContent
                          content={msg.content}
                          isStreaming={isStreaming}
                          onJumpToTime={jumpToTime}
                        />
                      </div>
                      
                      {/* Action buttons */}
                      {!isStreaming && msg.content && (
                        <div className="flex items-center justify-end gap-1 border-t border-slate-700/30 px-4 py-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <CopyButton text={msg.content} />
                          {isLast && onRegenerate && (
                            <button
                              type="button"
                              onClick={onRegenerate}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-400 transition-all duration-200 hover:bg-slate-700/50 hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                            >
                              <RotateCcw className="size-3.5" />
                              <span className="hidden sm:inline">Regenerate</span>
                            </button>
                          )}
                          <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-purple-400">
                            <ThumbsUp className="size-3.5" />
                          </button>
                          <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-purple-400">
                            <ThumbsDown className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Typing Indicator / Skeleton */}
              {isTyping && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <LoadingSkeleton />
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-10 flex-shrink-0 bg-gradient-to-t from-[#050816] via-[#050816]/95 to-transparent px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <form onSubmit={handleSend} className="mx-auto max-w-3xl">
          <div className="relative rounded-xl border border-slate-700/50 bg-[#0C1426] shadow-lg transition-all duration-200 focus-within:border-purple-500/50">
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this video..."
              rows={1}
              disabled={isTyping}
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60 sm:pr-20"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 p-2 text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:from-violet-500 hover:to-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 ml-1">
              AI can make mistakes. Verify important information.
            </p>
            {messages.length > 0 && onClearChat && (
              <button
                type="button"
                onClick={onClearChat}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              >
                <Trash2 className="size-3.5" />
                Clear Chat
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}