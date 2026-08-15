"use client";

/**
 * NodeProgressIndicator
 * ----------------------
 * جایگزین LoadingSkeleton برای زمانی که پاسخ دستیار در حال ساخته‌شدن است.
 * به‌جای یک اسکلتون ژنریک، دقیقاً همان گرهی (node) از پایپ‌لاین LangGraph
 * که در همین لحظه روی بک‌اند در حال اجراست را با آیکون، رنگ و متن اختصاصی
 * خودش نمایش می‌دهد و یک "ردِ" کوچک از گره‌های طی‌شده می‌سازد.
 *
 * این کامپوننت کاملاً مستقل است و به هیچ فایل دیگری وابسته نیست؛
 * فقط یک prop به اسم `currentNode` می‌گیرد.
 *
 * نام‌های PipelineNode دقیقاً باید با کلیدهای NODE_LABELS_FA در chats.py
 * (بک‌اند) یکی باشند: contextualize, supervisor, retriever, reranker,
 * validator, web_search, generator, video_summary
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MessagesSquare,
  Waypoints,
  SearchCode,
  ListFilter,
  ShieldCheck,
  Globe2,
  Sparkles,
  Film,
  Check,
} from "lucide-react";

export type PipelineNode =
  | "contextualize"
  | "supervisor"
  | "retriever"
  | "reranker"
  | "validator"
  | "web_search"
  | "generator"
  | "video_summary";

interface NodeMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // Tailwind gradient stop classes
  glow: string; // Tailwind shadow color class
}

const NODE_META: Record<PipelineNode, NodeMeta> = {
  contextualize: {
    label: "در حال درک زمینه‌ی گفت‌وگو…",
    icon: MessagesSquare,
    accent: "from-sky-400 to-blue-600",
    glow: "shadow-blue-500/40",
  },
  supervisor: {
    label: "در حال تحلیل و مسیر‌یابی درخواست…",
    icon: Waypoints,
    accent: "from-fuchsia-400 to-purple-600",
    glow: "shadow-fuchsia-500/40",
  },
  retriever: {
    label: "در حال کاوش در حافظه‌ی ویدیو…",
    icon: SearchCode,
    accent: "from-violet-400 to-indigo-600",
    glow: "shadow-indigo-500/40",
  },
  reranker: {
    label: "در حال چیدن دقیق‌ترین یافته‌ها…",
    icon: ListFilter,
    accent: "from-purple-400 to-fuchsia-600",
    glow: "shadow-purple-500/40",
  },
  validator: {
    label: "در حال راستی‌آزمایی اطلاعات…",
    icon: ShieldCheck,
    accent: "from-emerald-400 to-teal-600",
    glow: "shadow-emerald-500/40",
  },
  web_search: {
    label: "در حال جست‌وجو در وب…",
    icon: Globe2,
    accent: "from-amber-400 to-orange-600",
    glow: "shadow-amber-500/40",
  },
  generator: {
    label: "در حال نگارش پاسخ نهایی…",
    icon: Sparkles,
    accent: "from-purple-400 to-violet-600",
    glow: "shadow-purple-500/40",
  },
  video_summary: {
    label: "در حال تهیه‌ی خلاصه‌ی ویدیو…",
    icon: Film,
    accent: "from-pink-400 to-rose-600",
    glow: "shadow-pink-500/40",
  },
};

export function NodeProgressIndicator({
  currentNode,
}: {
  currentNode: PipelineNode | null;
}) {
  const [visited, setVisited] = useState<PipelineNode[]>([]);
  const lastNode = useRef<PipelineNode | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // هر بار که یک event جدید از SSE می‌رسد، اگر گره تغییر کرده باشد
  // آن را به ردِّ طی‌شده اضافه می‌کنیم (بدون تکرار).
  useEffect(() => {
    if (!currentNode) {
      setVisited([]);
      lastNode.current = null;
      return;
    }
    if (lastNode.current !== currentNode) {
      setVisited((prev) => (prev.includes(currentNode) ? prev : [...prev, currentNode]));
      lastNode.current = currentNode;
    }
  }, [currentNode]);

  if (!currentNode) return null;

  const meta = NODE_META[currentNode];
  const Icon = meta.icon;

  return (
    <div className="flex justify-start w-full">
      <div className="mr-3 mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
        <Sparkles className="size-3.5 animate-pulse text-white motion-reduce:animate-none" />
      </div>

      <div className="w-full max-w-md overflow-hidden rounded-2xl rounded-tl-md border border-white/[0.08] bg-[#101A2E]/80 backdrop-blur-[10px] shadow-lg shadow-purple-950/20">
        {/* ردّ گره‌های طی‌شده */}
        {visited.length > 1 && (
          <div className="flex items-center gap-1 px-5 pt-3.5" dir="ltr">
            {visited.map((node, i) => {
              const isCurrent = node === currentNode;
              const NodeIcon = NODE_META[node].icon;
              return (
                <div key={node} className="flex items-center gap-1">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className={`flex size-5 items-center justify-center rounded-full transition-colors duration-300 ${
                      isCurrent
                        ? `bg-gradient-to-br ${NODE_META[node].accent} shadow-sm ${NODE_META[node].glow}`
                        : "bg-slate-700/50"
                    }`}
                  >
                    {isCurrent ? (
                      <NodeIcon className="size-2.5 text-white" />
                    ) : (
                      <Check className="size-2.5 text-slate-300" />
                    )}
                  </motion.div>
                  {i < visited.length - 1 && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="h-px w-3 origin-left bg-slate-600/60"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* کارت گره‌ی فعال */}
        <div className="px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentNode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center gap-3"
            >
              <div className="relative flex size-8 shrink-0 items-center justify-center">
                {!prefersReducedMotion && (
                  <motion.div
                    className={`absolute inset-0 rounded-full bg-gradient-to-br ${meta.accent} opacity-30 blur-md`}
                    animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.55, 0.3] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <div
                  className={`relative flex size-7 items-center justify-center rounded-full bg-gradient-to-br ${meta.accent} shadow-md ${meta.glow}`}
                >
                  <Icon className="size-3.5 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-medium text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-white to-slate-300 bg-[length:200%_100%] motion-safe:animate-[shimmer_2.4s_linear_infinite]"
                >
                  {meta.label}
                </p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="size-1 animate-bounce rounded-full bg-purple-400 motion-reduce:animate-none" />
                  <span className="size-1 animate-bounce rounded-full bg-purple-400 [animation-delay:150ms] motion-reduce:animate-none" />
                  <span className="size-1 animate-bounce rounded-full bg-purple-400 [animation-delay:300ms] motion-reduce:animate-none" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export default NodeProgressIndicator;
