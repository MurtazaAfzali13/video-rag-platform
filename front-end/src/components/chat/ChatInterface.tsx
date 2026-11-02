"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  Menu,
  Send,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  ArrowUpRight,
  MessageSquare,
  Info,
  ImageIcon,
  CheckCheck,
  Globe,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVideo } from "@/context/VideoContext";
import { useSidebar } from "@/context/SidebarContext";
import type { Message, Chat } from "@/types";
import type { PipelineNode } from "@/lib/chat-api";
import NodeProgressIndicator from "./NodeProgressIndicator";
import PreflightIndicator from "./PreflightIndicator";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  chatId: string;
  chat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  currentNode?: PipelineNode | null;
  onSendMessage: (content: string, type: QuestionType) => void; 
  onRegenerate?: () => void;
  onClearChat?: () => void;
}
type QuestionType = "general" | "about_video";

/* ------------------------------------------------------------------ */
/*  Design tokens (colors taken from the reference screenshot)         */
/* ------------------------------------------------------------------ */
// Page background  : #050A1E -> #040616
// Assistant bubble : #0B1433 (border #1B2757)
// User bubble      : #3A2D9F -> #4C3BC2 (border violet)
// Accent / avatar  : #6366F1 -> #7C5CF6
// Timestamp chip   : #12204A (border #26397A)
// Primary text     : #EEF1FA   Muted text: #7F89AD

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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
  return text.replace(/\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?/g, '').replace(/\s{2,}/g, ' ').trim();
}

function safeHostname(url: string | undefined): string {
  if (!url) return "Web source";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web source";
  }
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Turns "[MM:SS]" / "[H:MM:SS]" citations written by the model into markdown links
 * ("[MM:SS](#t=<seconds>)") so they become clickable. Code spans/fences are left untouched,
 * existing links "[..](..)" and ranges like "[00:25-01:22]" are not matched.
 */
function linkifyTimestamps(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(
            /\[(\d{1,3}):(\d{2})(?::(\d{2}))?\](?!\()/g,
            (_m, a: string, b: string, c?: string) => {
              const secs = c !== undefined ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
              const label = c !== undefined ? `${a}:${b}:${c}` : `${a}:${b}`;
              return `[${label}](#t=${secs})`;
            }
          )
    )
    .join("");
}

/* Shared class strings ------------------------------------------------ */

// Timestamp / source chip: filled #5B4FE9, rounded-lg, white text + external-link icon
const CHIP_CLASS =
  "group inline-flex items-center gap-2 rounded-lg border border-[#8B85FF]/40 bg-gradient-to-br from-[#5B4FE9] to-[#4B3FD8] px-3 py-1.5 text-[13px] font-medium text-white shadow-[0_0_16px_rgba(91,79,233,0.45)] transition-all duration-200 hover:border-[#B9B4FF]/70 hover:brightness-110 hover:shadow-[0_0_24px_rgba(91,79,233,0.70)] active:scale-95";

// Inline text links inside markdown: #5B4FE9 underline + soft tinted hover
const LINK_INLINE_CLASS =
  "break-words rounded-sm font-medium text-[#B9B4FF] underline decoration-[#5B4FE9] decoration-2 underline-offset-4 transition-all duration-200 hover:bg-[#5B4FE9]/25 hover:text-white hover:decoration-[#8B85FF]";

// Markdown body inside the assistant bubble
const PROSE_CLASS =
  "prose prose-invert max-w-none text-[14px] leading-[1.65] text-[#EEF1FA] " +
  "[&_p]:my-0 [&_p]:mb-3 [&_p:last-child]:mb-0 " +
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:pl-5 " +
  "[&_li]:my-1 [&_li]:pl-0.5 [&_li::marker]:text-[#EEF1FA] " +
  "[&_strong]:font-semibold [&_strong]:text-white " +
  "[&_code]:rounded [&_code]:bg-[#16224B] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-indigo-200 [&_code]:before:content-none [&_code]:after:content-none " +
  "[&_pre]:rounded-xl [&_pre]:border [&_pre]:border-[#1B2757] [&_pre]:bg-[#070D26]";

function SparkStar({ className }: { className?: string }) {
  // Four-point star used in the avatar (matches the reference)
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 1.5c.6 4.9 2.6 8.3 5.4 9.6 1.5.7 3.3 1.1 5.1 1.4-1.8.3-3.6.7-5.1 1.4-2.8 1.3-4.8 4.7-5.4 9.6-.6-4.9-2.6-8.3-5.4-9.6-1.5-.7-3.3-1.1-5.1-1.4 1.8-.3 3.6-.7 5.1-1.4C9.4 9.8 11.4 6.4 12 1.5Z" />
    </svg>
  );
}

function AssistantAvatar() {
  return (
    <div className="mr-3 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#7C5CF6] shadow-[0_0_18px_rgba(99,102,241,0.55)] ring-1 ring-white/10">
      <SparkStar className="size-4 text-white" />
    </div>
  );
}

function buildAnswerComponents(onJumpToTime: (seconds: number) => void) {
  return {
    a: ({ node, href, children, ...props }: any) => {
      if (typeof href === "string" && href.startsWith("#t=")) {
        const seconds = Number(href.slice(3));
        return (
          <button
            type="button"
            onClick={() => onJumpToTime(Number.isFinite(seconds) ? seconds : 0)}
            className="mx-0.5 inline-flex items-center rounded-md border border-[#8B85FF]/40 bg-[#5B4FE9] px-1.5 py-0.5 align-baseline text-[12px] font-medium text-white shadow-[0_0_10px_rgba(91,79,233,0.45)] transition-all duration-200 hover:border-[#B9B4FF]/70 hover:brightness-110"
            aria-label={`Jump to ${String(children)}`}
          >
            {children}
          </button>
        );
      }
      return (
        <a
          href={href}
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_INLINE_CLASS}
        >
          {children}
        </a>
      );
    },
  };
}

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
      className={CHIP_CLASS}
      aria-label={`Jump to ${time}`}
    >
      <span className="shrink-0">{time}</span>
      <ExternalLink className="size-3.5 text-white/90 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
      className="rounded-md p-1.5 text-[#7F89AD] transition-all duration-200 hover:bg-white/[0.06] hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
      title="Copy response"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
});

const AssistantContent = memo(function AssistantContent({
  content,
  isStreaming,
  onJumpToTime,
}: {
  content: string;
  isStreaming: boolean;
  onJumpToTime: (seconds: number) => void;
}) {
  
  let parsedContent: any = null;
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && !isStreaming) {
    try {
      parsedContent = JSON.parse(trimmed);
    } catch (e) {
  
    }
  }
  if (parsedContent && (parsedContent.type === 'video_summary' || parsedContent.key_takeaways)) {
    const takeaways = parsedContent.key_takeaways || [];
    
    const groupedTakeaways = takeaways.reduce((acc: any, item: any) => {
      const time = item.timestamp || "general";
      if (!acc[time]) acc[time] = [];
      acc[time].push(item.point);
      return acc;
    }, {});

    return (
      <div className="flex w-full flex-col gap-4 text-[14px]">
        <div className="flex items-center gap-2 border-b border-[#1B2757] pb-2 text-xs text-indigo-300">
          <Sparkles className="size-4" />
          <span className="font-medium">AI Video Summary</span>
        </div>
        
        {parsedContent.overall_summary && (
          <p className="leading-[1.65] text-[#EEF1FA]">{parsedContent.overall_summary}</p>
        )}

        {Object.keys(groupedTakeaways).length > 0 && (
          <div className="mt-1 space-y-3">
            {Object.entries(groupedTakeaways).map(([time, points]: [string, any], i: number) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-[#1B2757] bg-[#0E1A42]/70 p-3">
                <ul className="space-y-1.5 text-[14px] leading-[1.65] text-[#EEF1FA]">
                  {points.map((point: string, idx: number) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-0.5 text-[#EEF1FA]">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                {time !== "general" && (
                  <div className="mt-2 flex justify-end">
                    <TimestampPill time={time} onClick={onJumpToTime} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {parsedContent.academic_conclusion && (
          <div className="mt-2 border-t border-[#1B2757] pt-2 text-xs italic text-[#7F89AD]">
            {parsedContent.academic_conclusion}
          </div>
        )}
      </div>
    );
  }

  if (parsedContent && parsedContent.type === 'qa_response') {
    return (
      <div className="flex w-full flex-col gap-3 text-[14px]">
        <div className={PROSE_CLASS}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={buildAnswerComponents(onJumpToTime)}
          >
            {linkifyTimestamps(parsedContent.answer ?? "")}
          </ReactMarkdown>
        </div>

        {parsedContent.sources && parsedContent.sources.length > 0 && (
          <div className="mt-1">
            <p className="mb-2.5 text-[13px] text-[#EEF1FA]">
              Related timestamps:
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {parsedContent.sources.map((source: any, idx: number) => {
                const key = `${source.source_type}-${source.start_time ?? source.url ?? idx}-${idx}`;

                if (source.source_type === "video") {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onJumpToTime(source.start_time || 0)}
                      className={CHIP_CLASS}
                      title={source.title || undefined}
                    >
                      <span className="shrink-0">{formatTimestamp(source.start_time || 0)}</span>
                      {source.title && (
                        <span className="max-w-[160px] truncate text-white/80">{source.title}</span>
                      )}
                      <ExternalLink className="size-3.5 text-white/90 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  );
                }

                return (
                  <a
                    key={key}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className={CHIP_CLASS}
                    title={source.title || safeHostname(source.url)}
                  >
                    <Globe className="size-3.5 shrink-0 text-white/80" />
                    <span className="max-w-[110px] truncate">{safeHostname(source.url)}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-white/90 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const timestamps = extractTimestamps(content);
  const cleanContent = removeTimestampsFromText(content);

  return (
    <div className="flex w-full flex-col gap-3 text-[14px]">
      {cleanContent && (
        <div className={PROSE_CLASS}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_INLINE_CLASS}
                />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-2 last:mb-0 whitespace-pre-wrap inline" {...props} />
              )
            }}
          >
            {cleanContent}
          </ReactMarkdown>

          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-300 align-middle"
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {timestamps.length > 0 && !isStreaming && (
        <div className="mt-1">
          <p className="mb-2.5 text-[13px] text-[#EEF1FA]">
            Related timestamps:
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
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
  currentNode,
  onSendMessage,
  onRegenerate,
  onClearChat,
}: Props) {
  const [input, setInput] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("about_video");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { jumpToTime, hydrateFromChat } = useVideo();
  const { toggle: toggleSidebar } = useSidebar();

  const hydratedChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chat?.id) return;
    if (hydratedChatIdRef.current === chat.id) return;
    hydratedChatIdRef.current = chat.id;
    hydrateFromChat(chat as any);
  }, [chat, hydrateFromChat]);

  
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

    onSendMessage(input.trim(), questionType); 
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
      className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#1B2757]/80 shadow-[0_0_40px_rgba(79,70,229,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, rgba(79,70,229,0.10), transparent 45%), linear-gradient(180deg, #060C20 0%, #040616 100%)",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex-shrink-0 border-b border-white/[0.06] bg-[#060C20]/70 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            <Sparkles className="size-[18px] shrink-0 text-[#A78BFA]" />
            <h2 className="truncate text-[15px] font-medium text-white">
              AI Assistant
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-full border border-slate-200/70 text-slate-100 transition-colors hover:border-white hover:text-white md:hidden"
              aria-label="About this assistant"
            >
              <Info className="size-3.5" />
            </button>

            {/* Type toggle */}
            <div className="hidden gap-1 rounded-lg border border-[#1B2757] bg-[#0A1230] p-0.5 md:flex">
              <button
                type="button"
                onClick={() => setQuestionType("general")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all duration-200 sm:px-3 ${
                  questionType === "general"
                    ? "bg-gradient-to-r from-[#5B4FE9] to-[#7C5CF6] text-white shadow-[0_0_14px_rgba(99,102,241,0.45)]"
                    : "text-[#7F89AD] hover:text-slate-200"
                }`}
              >
                <Globe className="size-3.5" />
                General
              </button>
              <button
                type="button"
                onClick={() => setQuestionType("about_video")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all duration-200 sm:px-3 ${
                  questionType === "about_video"
                    ? "bg-gradient-to-r from-[#5B4FE9] to-[#7C5CF6] text-white shadow-[0_0_14px_rgba(99,102,241,0.45)]"
                    : "text-[#7F89AD] hover:text-slate-200"
                }`}
              >
                About Video
              </button>
            </div>
          </div>
        </div>
      </div>

  
      <div className="flex-1 overflow-y-auto px-4 py-6 [scrollbar-color:#1B2757_transparent] [scrollbar-width:thin]">
        <div className="mx-auto max-w-3xl space-y-5">
          {isLoading && messages.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="size-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                <p className="text-sm text-[#7F89AD]">Loading conversation…</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center text-center sm:h-[320px]">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-[#6366F1]/20 to-[#7C5CF6]/20 shadow-[0_0_24px_rgba(99,102,241,0.18)]">
                <MessageSquare className="size-8 text-indigo-300" />
              </div>
              <h2 className="text-lg font-semibold text-white">Ask anything about this video</h2>
              <p className="mt-2 max-w-md text-sm text-[#7F89AD]">
                I can help you understand the content better.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const isLast = index === messages.length - 1;
                const isStreaming = !isUser && isLast && isTyping;
                const timeLabel = formatMessageTime(msg.created_at);

                if (isUser) {
                  return (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[88%] rounded-2xl border border-violet-300/15 bg-gradient-to-br from-[#3A2D9F] to-[#4C3BC2] px-4 py-3 shadow-[0_6px_24px_rgba(76,59,194,0.28)] sm:max-w-[85%]">
                        <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-[#F4F5FF]">
                          {msg.content}
                        </p>
                        {timeLabel && (
                          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px] text-indigo-200/70">
                            <span>{timeLabel}</span>
                            <CheckCheck className="size-3.5 text-indigo-200/80" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex w-full justify-start"
                  >
                    <AssistantAvatar />
                    <div className="group relative max-w-[88%] min-w-0 rounded-2xl border border-[#1B2757]/90 bg-[#0B1433]/90 shadow-[0_0_28px_rgba(79,70,229,0.07),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md sm:max-w-[85%]">
                      <div className="px-4 py-3.5">
                        <AssistantContent
                          content={msg.content}
                          isStreaming={isStreaming}
                          onJumpToTime={jumpToTime}
                        />
                        {timeLabel && !isStreaming && (
                          <p className="mt-2 text-right text-[11px] text-[#7F89AD]">{timeLabel}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isStreaming && msg.content && (
                        <div className="flex items-center justify-end gap-1 border-t border-[#1B2757]/70 px-4 py-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <CopyButton text={msg.content} />
                          {isLast && onRegenerate && (
                            <button
                              type="button"
                              onClick={onRegenerate}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#7F89AD] transition-all duration-200 hover:bg-white/[0.06] hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                            >
                              <RotateCcw className="size-3.5" />
                              <span className="hidden sm:inline">Regenerate</span>
                            </button>
                          )}
                          <button type="button" className="rounded-md p-1.5 text-[#7F89AD] hover:bg-white/[0.06] hover:text-indigo-200">
                            <ThumbsUp className="size-3.5" />
                          </button>
                          <button type="button" className="rounded-md p-1.5 text-[#7F89AD] hover:bg-white/[0.06] hover:text-indigo-200">
                            <ThumbsDown className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

            
              {isTyping && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                <motion.div key="typing-indicator" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                 
                  {currentNode ? (
                    <NodeProgressIndicator currentNode={currentNode} />
                  ) : (
                    <PreflightIndicator />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-10 flex-shrink-0 bg-gradient-to-t from-[#040616] via-[#040616]/95 to-transparent px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <form onSubmit={handleSend} className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-[#1B2757] bg-[#080F2B]/95 shadow-[0_0_24px_rgba(79,70,229,0.07)] backdrop-blur-sm transition-all duration-200 focus-within:border-indigo-400/50 focus-within:shadow-[0_0_24px_rgba(99,102,241,0.18)]">
            <div className="relative">
              <textarea
                id="chat-input"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this video..."
                rows={1}
                disabled={isTyping}
                className="w-full resize-none bg-transparent px-4 py-3.5 pr-16 text-[14px] text-white placeholder:text-[#7F89AD] focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute bottom-2 right-2.5 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C5CF6] text-white shadow-[0_0_16px_rgba(99,102,241,0.55)] transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <Send className="size-4" />
              </button>
            </div>

            {/* Mobile actions (inside the input card, separated by a divider) */}
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-3 py-2 md:hidden">
              <button
                type="button"
                onClick={() => {
                  const iframe = document.querySelector("iframe[title]");
                  iframe?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0D1736] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-400/40 hover:text-white"
              >
                <ImageIcon className="size-4 text-slate-300" />
                Screenshot
              </button>
              <button
                type="button"
                onClick={onClearChat}
                disabled={messages.length === 0 || !onClearChat}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0D1736] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
              >
                <Trash2 className="size-4 text-slate-300" />
                Clear Chat
              </button>
            </div>
          </div>

          <div className="mt-2 hidden items-center justify-between md:flex">
            <p className="ml-1 text-[10px] text-[#7F89AD]">
              AI can make mistakes. Verify important information.
            </p>
            {messages.length > 0 && onClearChat && (
              <button
                type="button"
                onClick={onClearChat}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#7F89AD] transition-colors hover:bg-white/[0.05] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
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
