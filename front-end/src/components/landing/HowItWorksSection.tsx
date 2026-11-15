"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, DatabaseZap, Radar, MessageSquareText, Check, X, Zap } from "lucide-react";

const STEP_DURATION = 7000;

const stages = [
  {
    icon: Link2,
    label: "Paste",
    title: "Paste a YouTube URL",
    desc: "We extract the video ID and check the database first. If the video is already indexed, you're linked to it instantly. No re-processing, no extra cost.",
    nodes: ["extract_video_id", "dedup_check", "cache_router"],
  },
  {
    icon: DatabaseZap,
    label: "Index",
    title: "Transcript → small-to-big index",
    desc: "The transcript is chunked semantically. Small chunks are embedded in Pinecone for precise search, while larger parent text is stored in Supabase for rich context.",
    nodes: ["fetch_transcript", "semantic_chunker", "embed_and_upsert"],
  },
  {
    icon: Radar,
    label: "Retrieve",
    title: "Retrieve, rerank, validate",
    desc: "A supervisor routes your question, Pinecone returns candidates, a cross-encoder reranks them, and strict relevance validation drops anything off-topic.",
    nodes: ["supervisor", "retriever", "cross_encoder", "relevance_grader"],
  },
  {
    icon: MessageSquareText,
    label: "Answer",
    title: "Verified answers, streamed live",
    desc: "The generator drafts an answer, then a hallucination grader and a usefulness grader check it before it streams to you token by token.",
    nodes: ["generator", "hallucination_grader", "usefulness_grader", "sse_stream"],
  },
];

/* ---------- helpers ---------- */

function useTypewriter(text: string, speed = 35) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return out;
}

function Terminal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-purple-500/20 bg-[#050B17]/80 backdrop-blur overflow-hidden shadow-[0_0_40px_-10px_rgba(147,51,234,0.4)]">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
        <span className="size-2 rounded-full bg-red-400/70" />
        <span className="size-2 rounded-full bg-yellow-400/70" />
        <span className="size-2 rounded-full bg-green-400/70" />
        <span className="ml-2 text-[10px] text-slate-500 font-mono">{title}</span>
      </div>
      <div className="p-4 min-h-[220px] font-mono text-[11px] text-slate-300">{children}</div>
    </div>
  );
}

function Line({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center gap-2 py-0.5"
    >
      {children}
    </motion.div>
  );
}

/* ---------- stage visuals ---------- */

function UrlVisual() {
  const url = "youtube.com/watch?v=dQw4w9WgXcQ";
  const typed = useTypewriter(url, 40);
  const done = typed.length === url.length;
  return (
    <Terminal title="vidbrain · ingest">
      <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-purple-200">
        {typed}
        <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }}>
          ▍
        </motion.span>
      </div>
      {done && (
        <div className="mt-3">
          <Line delay={0.1}>
            <Check className="size-3 text-green-400" /> video_id → dQw4w9WgXcQ
          </Line>
          <Line delay={0.6}>
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}>
              ◌
            </motion.span>
            checking database…
          </Line>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              className="rounded-md border border-green-500/30 bg-green-500/10 p-2 text-green-300"
            >
              <Zap className="size-3 inline mr-1" />
              HIT → reuse namespace
              <div className="text-[9px] text-green-400/70 mt-1">instant · $0</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              className="rounded-md border border-purple-500/30 bg-purple-500/10 p-2 text-purple-300"
            >
              MISS → start indexing
              <div className="text-[9px] text-purple-400/70 mt-1">new job</div>
            </motion.div>
          </div>
        </div>
      )}
    </Terminal>
  );
}

function IndexVisual() {
  return (
    <Terminal title="vidbrain · indexing">
      <div className="text-slate-500 mb-2">transcript → chunks</div>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -14, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12 * i, type: "spring", stiffness: 260, damping: 18 }}
            className="h-7 rounded border border-purple-400/40 bg-purple-500/25"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300"
        >
          Pinecone
          <div className="text-[9px] text-cyan-400/70 mt-1">small chunks · embeddings</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1 }}
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300"
        >
          Supabase
          <div className="text-[9px] text-emerald-400/70 mt-1">parent text · full context</div>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6 }}
        className="mt-3 text-[10px] text-slate-500"
      >
        ✓ checkpoint saved · resumable on failure
      </motion.div>
    </Terminal>
  );
}

const docs = [
  { id: "a", t: "chunk #14 · 0:42", s: 0.54 },
  { id: "b", t: "chunk #3 · 0:09", s: 0.91 },
  { id: "c", t: "chunk #27 · 3:15", s: 0.33 },
  { id: "d", t: "chunk #8 · 1:02", s: 0.87 },
  { id: "e", t: "chunk #11 · 1:48", s: 0.71 },
];

function RetrieveVisual() {
  const [ranked, setRanked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRanked(true), 1800);
    return () => clearTimeout(t);
  }, []);
  const list = ranked ? [...docs].sort((x, y) => y.s - x.s) : docs;
  return (
    <Terminal title={ranked ? "cross-encoder · reranked" : "pinecone · top-k"}>
      <div className="space-y-1.5">
        {list.map((d) => {
          const rejected = ranked && d.s < 0.5;
          return (
            <motion.div
              key={d.id}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              animate={{ opacity: rejected ? 0.35 : 1 }}
              className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 ${
                rejected
                  ? "border-red-500/30 bg-red-500/5"
                  : ranked
                    ? "border-purple-500/40 bg-purple-500/10"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <span>{d.t}</span>
              <span className="flex items-center gap-1.5">
                {ranked && <span className="text-purple-300">{d.s.toFixed(2)}</span>}
                {rejected && <X className="size-3 text-red-400" />}
              </span>
            </motion.div>
          );
        })}
      </div>
    </Terminal>
  );
}

function AnswerVisual() {
  const text = "At 1:02 the speaker explains that small-to-big indexing keeps retrieval precise while preserving context…";
  const typed = useTypewriter(text, 28);
  return (
    <Terminal title="vidbrain · answer">
      <div className="text-slate-200 leading-relaxed min-h-[84px]">
        {typed}
        <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }}>
          ▍
        </motion.span>
      </div>
      <div className="mt-4 space-y-1.5">
        {[
          { t: "Hallucination grader: grounded", d: 1.2 },
          { t: "Usefulness grader: answers the question", d: 2.0 },
          { t: "SSE stream: live", d: 2.8 },
        ].map((b) => (
          <motion.div
            key={b.t}
            initial={{ opacity: 0, scale: 0.9, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: b.d, type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-green-300"
          >
            <Check className="size-3" /> {b.t}
          </motion.div>
        ))}
      </div>
    </Terminal>
  );
}

const visuals = [UrlVisual, IndexVisual, RetrieveVisual, AnswerVisual];

/* ---------- main section ---------- */

export default function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % stages.length), STEP_DURATION);
    return () => clearTimeout(t);
  }, [active, paused]);

  const Visual = visuals[active];
  const progress = active / (stages.length - 1);

  return (
    <section id="how-it-works" className="py-24 px-4 bg-[#08101F] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-600/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-600/20 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-purple-400 uppercase tracking-widest mb-3 font-medium">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">From URL to verified insights</h2>
          <p className="text-sm text-slate-400 mt-3">Follow a video through the VidBrain pipeline</p>
        </div>

        {/* Track */}
        <div className="relative mb-10 px-7">
          <div className="absolute top-7 left-14 right-14 h-px bg-white/10">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-purple-500 to-cyan-400"
              animate={{ scaleX: progress }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
            {/* travelling packet */}
            <motion.div
              className="absolute -top-[5px] size-[11px] -ml-[5px] rounded-full bg-cyan-300 shadow-[0_0_16px_4px_rgba(103,232,249,0.7)]"
              animate={{ left: `${progress * 100}%` }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
          </div>

          <div className="relative flex justify-between">
            {stages.map((s, i) => {
              const isActive = i === active;
              const isDone = i < active;
              return (
                <button
                  key={s.label}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                  className="flex flex-col items-center gap-2 focus:outline-none"
                  aria-label={s.title}
                >
                  <motion.div
                    animate={{ scale: isActive ? 1.12 : 1 }}
                    className={`relative flex size-14 items-center justify-center rounded-2xl border transition-colors ${
                      isActive
                        ? "border-purple-400 bg-purple-600/20 shadow-[0_0_30px_-4px_rgba(168,85,247,0.8)]"
                        : isDone
                          ? "border-cyan-400/40 bg-cyan-500/10"
                          : "border-white/10 bg-[#0C1426]"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        className="absolute inset-0 rounded-2xl border border-purple-400"
                        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.6 }}
                      />
                    )}
                    {isDone ? (
                      <Check className="size-6 text-cyan-300" />
                    ) : (
                      <s.icon className={`size-6 ${isActive ? "text-purple-300" : "text-slate-500"}`} />
                    )}
                  </motion.div>
                  <span className={`text-xs font-medium ${isActive ? "text-white" : "text-slate-500"}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1426] to-[#08101F] p-6 md:p-8 overflow-hidden"
        >
          {!paused && (
            <motion.div
              key={`bar-${active}`}
              className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-400"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: STEP_DURATION / 1000, ease: "linear" }}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="grid md:grid-cols-2 gap-8 items-center"
            >
              <div>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-600/20 border border-purple-500/30 rounded-full px-2 py-0.5">
                  STEP 0{active + 1}
                </span>
                <h3 className="text-xl font-semibold text-white mt-3 mb-2">{stages[active].title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{stages[active].desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {stages[active].nodes.map((n, i) => (
                    <motion.span
                      key={n}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.15 }}
                      className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-1"
                    >
                      {n}
                    </motion.span>
                  ))}
                </div>
              </div>
              <Visual />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}