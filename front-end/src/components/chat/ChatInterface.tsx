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
      <div className="flex w-full flex-col gap-4 text-sm">
        <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2 text-xs text-purple-400">
          <Sparkles className="size-4" />
          <span className="font-medium">AI Video Summary</span>
        </div>
        
        {parsedContent.overall_summary && (
          <p className="leading-relaxed text-slate-300">{parsedContent.overall_summary}</p>
        )}

        {Object.keys(groupedTakeaways).length > 0 && (
          <div className="mt-2 space-y-4">
            {Object.entries(groupedTakeaways).map(([time, points]: [string, any], i: number) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg bg-white/5 p-3 border border-white/5 relative">
              
                {time !== "general" && (
                  <div className="absolute -top-3 right-3">
                    <TimestampPill time={time} onClick={onJumpToTime} />
                  </div>
                )}
                
                <ul className={`space-y-1.5 text-slate-300 text-sm leading-relaxed ${time !== "general" ? "mt-3" : ""}`}>
                  {points.map((point: string, idx: number) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-purple-500 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        {parsedContent.academic_conclusion && (
          <div className="text-xs italic border-t border-white/10 pt-2 mt-2 text-slate-400">
            {parsedContent.academic_conclusion}
          </div>
        )}
      </div>
    );
  }

  if (parsedContent && parsedContent.type === 'qa_response') {
    return (
      <div className="flex w-full flex-col gap-3 text-sm">
        <div className="prose prose-invert max-w-none leading-relaxed text-slate-300 [&_code]:rounded [&_code]:bg-slate-800/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:bg-slate-900/80">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {parsedContent.answer}
          </ReactMarkdown>
        </div>

        {parsedContent.sources && parsedContent.sources.length > 0 && (
          <div className="mt-2 pt-3 border-t border-slate-700/50">
           
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ArrowUpRight className="size-3" />
              Related timestamps
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {parsedContent.sources.map((source: any, idx: number) => {
                const key = `${source.source_type}-${source.start_time ?? source.url ?? idx}-${idx}`;

                if (source.source_type === "video") {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onJumpToTime(source.start_time || 0)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-gradient-to-r from-violet-600/20 to-purple-700/20 px-3 py-1.5 text-xs font-medium text-purple-300 shadow-sm shadow-purple-500/10 transition-all duration-200 hover:scale-105 hover:border-purple-400/70 hover:from-violet-600/40 hover:to-purple-700/40 hover:text-purple-100 active:scale-95 group"
                      title={source.title || undefined}
                    >
                      <span className="shrink-0 font-mono">{formatTimestamp(source.start_time || 0)}</span>
                      <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  );
                }

                return (
                  <a
                    key={key}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/40 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-sm transition-all duration-200 hover:scale-105 hover:border-blue-400/50 hover:bg-slate-800/70 hover:text-blue-300 active:scale-95 group"
                    title={source.title || safeHostname(source.url)}
                  >
                    <Globe className="size-3 shrink-0" />
                    <span className="max-w-[110px] truncate">{safeHostname(source.url)}</span>
                    <ExternalLink className="size-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
    <div className="flex w-full flex-col gap-3 text-sm">
      {cleanContent && (
        <div className="prose prose-invert max-w-none leading-relaxed text-slate-300 [&_code]:rounded [&_code]:bg-slate-800/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:bg-slate-900/80">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 transition-colors hover:text-purple-300 hover:underline hover:underline-offset-2 break-words"
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
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-purple-400 align-middle"
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {timestamps.length > 0 && !isStreaming && (
        <div className="mt-2 pt-3 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <ArrowUpRight className="size-3" />
            Extracted Timestamps
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
      className="relative flex min-w-0 flex-1 flex-col h-full"
      style={{
        background: "radial-gradient(circle at top, rgba(124,58,237,0.12), transparent 40%), linear-gradient(180deg, #08101F 0%, #050816 100%)",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex-shrink-0 border-b border-white/[0.06] bg-[#08101F]/80 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/25">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-white truncate">
              AI Assistant
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white md:hidden"
              aria-label="About this assistant"
            >
              <Info className="size-4" />
            </button>

            {/* Type toggle */}
            <div className="hidden gap-1 rounded-lg border border-slate-700/30 bg-[#0C1426] p-0.5 md:flex">
              <button
                type="button"
                onClick={() => setQuestionType("general")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all duration-200 sm:px-3 ${
                  questionType === "general"
                    ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20"
                    : "text-slate-400 hover:text-slate-300"
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
                    ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                About Video
              </button>
            </div>
          </div>
        </div>
      </div>

  
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
                const timeLabel = formatMessageTime(msg.created_at);

                if (isUser) {
                  return (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-purple-800 px-4 py-3 shadow-lg shadow-purple-500/25 sm:max-w-[85%]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                          {msg.content}
                        </p>
                        {timeLabel && (
                          <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-purple-200/70">
                            <span>{timeLabel}</span>
                            <CheckCheck className="size-3 text-purple-300/80" />
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
                    className="flex justify-start w-full"
                  >
                    <div className="mr-3 mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
                      <Sparkles className="size-3.5 text-white" />
                    </div>
                    <div className="group relative max-w-[88%] min-w-0 rounded-2xl rounded-tl-md border border-white/[0.08] bg-[#101A2E]/90 shadow-xl backdrop-blur-md sm:max-w-[85%]">
                      <div className="px-4 py-3.5 sm:px-5">
                        <AssistantContent
                          content={msg.content}
                          isStreaming={isStreaming}
                          onJumpToTime={jumpToTime}
                        />
                        {timeLabel && !isStreaming && (
                          <p className="mt-2 text-[10px] text-slate-500">{timeLabel}</p>
                        )}
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

            
              {isTyping && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                 
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
      <div className="sticky bottom-0 z-10 flex-shrink-0 bg-gradient-to-t from-[#050816] via-[#050816]/98 to-transparent px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <form onSubmit={handleSend} className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-slate-700/50 bg-[#0C1426]/95 shadow-lg backdrop-blur-sm transition-all duration-200 focus-within:border-purple-500/50 focus-within:shadow-purple-500/10">
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this video..."
              rows={1}
              disabled={isTyping}
              className="w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:from-violet-500 hover:to-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </div>

        
          <div className="mt-2 grid grid-cols-2 gap-2 md:hidden">
            <button
              type="button"
              onClick={() => {
                const iframe = document.querySelector("iframe[title]");
                iframe?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0C1426]/80 px-3 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-purple-500/30 hover:text-white"
            >
              <ImageIcon className="size-4 text-purple-400" />
              Screenshot
            </button>
            <button
              type="button"
              onClick={onClearChat}
              disabled={messages.length === 0 || !onClearChat}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0C1426]/80 px-3 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-red-500/30 hover:text-red-300 disabled:opacity-40"
            >
              <Trash2 className="size-4 text-slate-400" />
              Clear Chat
            </button>
          </div>

          <div className="mt-2 hidden items-center justify-between md:flex">
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
