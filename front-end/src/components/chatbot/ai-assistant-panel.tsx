"use client";

import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { jsonrepair } from "jsonrepair";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Clock,
  Sparkles,
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  Check,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { getMessageText } from "@/lib/mock-data";
import { useVideo } from "@/context/VideoContext";

interface VideoSummaryData {
  title?: string;
  overall_summary?: string;
  key_takeaways?: Array<{ timestamp: string; point: string }>;
  academic_conclusion?: string;
}

const models = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-3.5-mini", name: "GPT-3.5 Mini" },
];

type QuestionType = "general" | "about_video";

const parseTimestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

const extractTimestamps = (text: string): string[] => {
  const bracketRegex = /\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]/g;
  const bracketMatches = [...text.matchAll(bracketRegex)].map((match) => match[1]);
  const timestampRegex = /(?:\d{1,2}:)?\d{1,2}:\d{2}/g;
  const matches = text.match(timestampRegex) ?? [];
  return [...new Set([...bracketMatches, ...matches])];
};

const isVideoSummary = (content: string) => {
  const trimmed = content.trim();
  return trimmed.startsWith("{") && trimmed.includes("key_takeaways");
};

const splitContentAndSources = (text: string) => {
  const regex =
    /(?:\n\s*(?:\*\*منابع\*\*|\*\*Sources\*\*|منابع|Sources)\s*:?\s*\n?)/i;
  const parts = text.split(regex);

  if (parts.length > 1) {
    const sources = parts.pop() || "";
    const main = parts.join("\n").trim();
    return { main, sources: sources.trim() };
  }
  return { main: text, sources: null };
};

const TimestampPill = memo(function TimestampPill({
  time,
  text,
  onClick,
}: {
  time: string;
  text?: string;
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
      {text && (
        <span className="truncate max-w-[200px] text-purple-200/90 font-sans">
          {text}
        </span>
      )}
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
      aria-label="Copy response"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
});

function LoadingSkeleton() {
  return (
    <div className="flex justify-start" role="status" aria-label="Assistant is thinking">
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
  if (isVideoSummary(content) && !isStreaming) {
    try {
      const repairedJson = jsonrepair(content.trim());
      const parsed = JSON.parse(repairedJson) as VideoSummaryData;
      return (
        <div className="flex w-full flex-col gap-4 text-sm">
          <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2 text-xs text-purple-400">
            <Sparkles className="size-4" />
            <span className="font-medium">AI Video Summary</span>
          </div>
          {parsed.overall_summary && (
            <p className="leading-relaxed text-slate-300">{parsed.overall_summary}</p>
          )}
          {parsed.key_takeaways && parsed.key_takeaways.length > 0 && (
            <div className="mt-2 flex flex-col gap-2 items-start"> {/* تغییر به flex-col تا مثل لیستِ کارت‌ها زیر هم مرتب شوند */}
              {parsed.key_takeaways.map((item, idx) => (
                <TimestampPill
                  key={`${item.timestamp}-${idx}`}
                  time={item.timestamp}
                  text={item.point} // پاس دادن سرفصل (مانند introduction of langchain) به دکمه
                  onClick={onJumpToTime}
                />
              ))}
            </div>
          )}
        </div>
      );
    } catch {
      // fall through to standard chat rendering
    }
  }

  const { main, sources } = splitContentAndSources(content);
  const sourceTimestamps = sources ? extractTimestamps(sources) : [];
  const inlineTimestamps = extractTimestamps(main);
  const timestamps = [...new Set([...sourceTimestamps, ...inlineTimestamps])];

  return (
    <div className="flex w-full flex-col gap-3 text-sm">
      <div className="prose prose-invert max-w-none leading-relaxed text-slate-300 [&_code]:rounded [&_code]:bg-slate-800/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:bg-slate-900/80">
        <MessageResponse isAnimating={isStreaming}>{main}</MessageResponse>
        {isStreaming && (
          <span
            className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-purple-400 align-middle"
            aria-hidden="true"
          />
        )}
      </div>
      {timestamps.length > 0 && !isStreaming && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {timestamps.map((timestamp) => (
            <TimestampPill
              key={timestamp}
              time={timestamp}
              onClick={onJumpToTime}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const AssistantMessage = memo(function AssistantMessage({
  message,
  isStreaming,
  isLast,
  onJumpToTime,
  onRegenerate,
}: {
  message: UIMessage;
  isStreaming: boolean;
  isLast: boolean;
  onJumpToTime: (seconds: number) => void;
  onRegenerate: () => void;
}) {
  const content = getMessageText(message);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex justify-start"
    >
      <div className="mr-3 mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
        <Sparkles className="size-3.5 text-white" />
      </div>
      <div className="group relative max-w-[85%] min-w-0 rounded-2xl rounded-tl-md border border-white/[0.08] bg-[#101A2E]/80 shadow-xl backdrop-blur-[10px] sm:max-w-[88%]">
        <div className="px-4 py-3.5 sm:px-5">
          <AssistantContent
            content={content}
            isStreaming={isStreaming}
            onJumpToTime={onJumpToTime}
          />
        </div>
        {!isStreaming && content && (
          <div className="flex items-center justify-end gap-1 border-t border-slate-700/30 px-4 py-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <CopyButton text={content} />
            {isLast && (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-400 transition-all duration-200 hover:bg-slate-700/50 hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                aria-label="Regenerate response"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            )}
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-700/50 hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              aria-label="Thumbs up"
            >
              <ThumbsUp className="size-3.5" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-700/50 hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              aria-label="Thumbs down"
            >
              <ThumbsDown className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const UserMessage = memo(function UserMessage({ message }: { message: UIMessage }) {
  const content = getMessageText(message);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-purple-700 px-4 py-3 shadow-lg shadow-purple-500/20 sm:max-w-[88%] sm:px-5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{content}</p>
      </div>
    </motion.div>
  );
});

export default function ChatPage() {
  const { jumpToTime, addTimelineItem, addTranscriptLine, activeVideoId } = useVideo();
  const [input, setInput] = useState("");
  const [model] = useState(models[0].id);
  const [questionType, setQuestionType] = useState<QuestionType>("general");
  const [userId] = useState("murtaza");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processedTimelineRef = useRef<Set<string>>(new Set());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            user_id: userId,
            video_id: questionType === "general" ? null : activeVideoId,
            model,
          },
        }),
      }),
    [userId, activeVideoId, model, questionType]
  );

  const { messages, sendMessage, regenerate, status, setMessages, error } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const showSkeleton =
    status === "submitted" && (!lastMessage || lastMessage.role === "user");
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;
    if (processedTimelineRef.current.has(lastMessage.id)) return;

    const content = getMessageText(lastMessage);
    if (!content) return;

    processedTimelineRef.current.add(lastMessage.id);

    // جدا کردن پاسخ به خطوط مختلف برای استخراج موضوع
    const lines = content.split('\n');
    const timestamps = extractTimestamps(content);

    timestamps.forEach((timestamp) => {
      // پیدا کردن خطی که شامل این تایم‌استمپ است
      const relevantLine = lines.find(line => line.includes(timestamp)) || "";
      
      // پاک‌سازی خط از علامت‌های اضافی (مثل بولد شدن، خود زمان، و آیدی ویدیو)
      let cleanText = relevantLine
        .replace(/\*\*/g, '') // حذف علامت‌های بولد
        .replace(/\[.*?\]/g, '') // حذف خود زمان در کروشه
        .replace(/\(Video ID:.*?\)/gi, '') // حذف Video ID
        .replace(/Timestamp:/gi, '') // حذف کلمه Timestamp
        .replace(/^- /, '') // حذف خط تیره در ابتدای لیست‌ها
        .trim();

      // اگر متنی پیدا نشد، از پیش‌فرض استفاده کن
      if (!cleanText) cleanText = "AI Reference";

      // ایجاد یک سرفصل کوتاه (مثلاً ۴۵ کاراکتر اول) برای نمایش زیبا در تایم‌لاین
      const shortTitle = cleanText.length > 45 ? `${cleanText.substring(0, 45)}...` : cleanText;

      // اضافه کردن به تایم‌لاین با عنوان استخراج شده
      addTimelineItem(timestamp, shortTitle, cleanText);
      addTranscriptLine(timestamp, cleanText);
    });

    if (isVideoSummary(content)) {
      try {
        const repairedJson = jsonrepair(content.trim());
        const parsed = JSON.parse(repairedJson) as VideoSummaryData;
        parsed.key_takeaways?.forEach((item) => {
          addTimelineItem(
            item.timestamp,
            item.point.length > 50 ? `${item.point.substring(0, 50)}...` : item.point,
            item.point
          );
        });
      } catch {
        // ignore parse errors
      }
    }
  }, [messages, status, addTimelineItem, addTranscriptLine]);

  const handleSubmit = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      sendMessage({ text: trimmed });
      setInput("");
    },
    [input, isLoading, sendMessage]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    processedTimelineRef.current.clear();
  };

  return (
    <section
      className="relative flex min-w-0 flex-1 flex-col"
      style={{
        background:
          "radial-gradient(circle at top, rgba(124,58,237,0.12), transparent 40%), linear-gradient(180deg, #08101F 0%, #050816 100%)",
      }}
    >
      <div className="sticky top-0 z-10 flex-shrink-0 border-b border-slate-700/30 bg-[#08101F]/40 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <h2 className="text-xs font-semibold text-white sm:text-sm">AI Assistant</h2>
          </div>

          <div className="flex gap-1 rounded-lg border border-slate-700/30 bg-[#0C1426] p-0.5">
            <button
              type="button"
              onClick={() => setQuestionType("general")}
              className={`rounded-md px-2.5 py-1 text-xs transition-all duration-200 sm:px-3 ${questionType === "general"
                ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20"
                : "text-slate-400 hover:text-slate-300"
                }`}
              aria-pressed={questionType === "general"}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("about_video")}
              className={`rounded-md px-2.5 py-1 text-xs transition-all duration-200 sm:px-3 ${questionType === "about_video"
                ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20"
                : "text-slate-400 hover:text-slate-300"
                }`}
              aria-pressed={questionType === "about_video"}
            >
              About Video
            </button>
          </div>
        </div>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="h-[280px] sm:h-[320px]"
              title="Ask anything about this video"
              description="I can help you understand the content better"
              icon={
                <div className="mb-2 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-700/20">
                  <MessageSquare className="size-8 text-purple-400" />
                </div>
              }
            />
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                if (message.role === "user") {
                  return <UserMessage key={message.id} message={message} />;
                }

                const content = getMessageText(message);
                if (!content && status === "submitted") return null;

                const isStreaming =
                  status === "streaming" && message.id === lastAssistantId;

                return (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming}
                    isLast={message.id === lastAssistantId}
                    onJumpToTime={jumpToTime}
                    onRegenerate={() => regenerate()}
                  />
                );
              })}
            </AnimatePresence>
          )}

          {showSkeleton && <LoadingSkeleton />}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Something went wrong. Please try again.
              <button
                type="button"
                onClick={() => regenerate()}
                className="ml-2 underline hover:text-red-200"
              >
                Retry
              </button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="sticky bottom-0 z-10 flex-shrink-0 bg-gradient-to-t from-[#050816] via-[#050816]/95 to-transparent px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="relative rounded-xl border border-slate-700/50 bg-[#0C1426] shadow-lg transition-all duration-200 focus-within:border-purple-500/50">
            <label htmlFor="chat-input" className="sr-only">
              Ask anything about this video
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this video..."
              rows={1}
              disabled={isLoading}
              aria-label="Chat message input"
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60 sm:pr-20"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 p-2 text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:from-violet-500 hover:to-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Clear chat"
            >
              <Trash2 className="size-3.5" />
              Clear Chat
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}