"use client";

import type { UIMessage } from "ai";
import { ArrowUpRight, Sparkles, Copy, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { getMessageText, RELATED_TIMESTAMPS } from "@/lib/mock-data";
import { useState } from "react";

function TimestampPill({ time }: { time: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-[#101A2E] px-3 py-1.5 text-xs font-medium text-purple-300 transition-all duration-200 hover:border-purple-500/60 hover:bg-purple-600/20 hover:text-purple-200 hover:scale-105 active:scale-95 group"
    >
      <span>{time}</span>
      <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-slate-700/50 transition-all duration-200 text-slate-400 hover:text-purple-400"
      title="Copy response"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function ChatMessage({
  message,
  showTimestamps,
}: {
  message: UIMessage;
  showTimestamps?: boolean;
}) {
  const isUser = message.role === "user";
  const text = getMessageText(message);

  if (isUser) {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-purple-600 to-purple-700 px-5 py-3 shadow-lg shadow-purple-500/20">
          <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 group">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
        <Sparkles className="size-4 text-white" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="relative rounded-2xl rounded-tl-md border border-slate-700/30 bg-[#101A2E] shadow-xl backdrop-blur-sm transition-all duration-200">
          <div className="px-5 py-3.5">
            <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {text}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-1 px-4 py-2 border-t border-slate-700/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyButton text={text} />
            <button className="p-1.5 rounded-md hover:bg-slate-700/50 transition-all duration-200 text-slate-400 hover:text-purple-400">
              <ThumbsUp className="size-3.5" />
            </button>
            <button className="p-1.5 rounded-md hover:bg-slate-700/50 transition-all duration-200 text-slate-400 hover:text-purple-400">
              <ThumbsDown className="size-3.5" />
            </button>
          </div>
        </div>
        
        {showTimestamps && (
          <div className="space-y-2 animate-in fade-in duration-500">
            <p className="text-xs font-medium text-purple-400/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Related Timestamps
            </p>
            <div className="flex flex-wrap gap-2">
              {RELATED_TIMESTAMPS.map((time) => (
                <TimestampPill key={time} time={time} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}