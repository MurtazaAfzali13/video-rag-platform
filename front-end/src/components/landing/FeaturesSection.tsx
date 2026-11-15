"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Clock, MessageSquare, Zap, Search, Globe, Shield, Lock, Check, X, Sparkles, Play } from "lucide-react";

/* ---------- helpers ---------- */

function useTypewriter(text: string, speed = 30) {
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

/* ---------- 1. Conversational AI ---------- */

const QA = [
  {
    q: "What does the speaker say about chunking?",
    a: "They embed small chunks for precise search, then return the larger parent text so the answer keeps its context.",
  },
  {
    q: "How are wrong answers prevented?",
    a: "Every draft is checked by a hallucination grader and a usefulness grader before it reaches you.",
  },
];

function AiAnswer({ text }: { text: string }) {
  const typed = useTypewriter(text, 22);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-600/30">
        <Sparkles className="size-3 text-purple-300" />
      </span>
      <p className="rounded-xl rounded-tl-sm border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-[11px] leading-relaxed text-slate-200">
        {typed}
      </p>
    </motion.div>
  );
}

function ChatVisual() {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === 0) t = setTimeout(() => setPhase(1), 900);
    else if (phase === 1) t = setTimeout(() => setPhase(2), 1200);
    else
      t = setTimeout(() => {
        setPhase(0);
        setI((x) => (x + 1) % QA.length);
      }, QA[i].a.length * 22 + 2600);
    return () => clearTimeout(t);
  }, [phase, i]);

  return (
    <div className="flex h-full flex-col justify-end gap-2.5">
      <motion.div
        key={`q-${i}`}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        className="self-end rounded-xl rounded-tr-sm bg-slate-700/40 px-3 py-2 text-[11px] text-slate-200"
      >
        {QA[i].q}
      </motion.div>
      {phase === 1 && (
        <div className="flex items-center gap-1 pl-7">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="size-1.5 rounded-full bg-purple-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.7, delay: d * 0.12 }}
            />
          ))}
        </div>
      )}
      {phase === 2 && <AiAnswer key={`a-${i}`} text={QA[i].a} />}
    </div>
  );
}

/* ---------- 2. Timestamped Answers ---------- */

const marks = [
  { t: "0:42", label: "Chunking", p: 7 },
  { t: "3:15", label: "Reranking", p: 32 },
  { t: "7:08", label: "Graders", p: 71 },
];

function TimestampVisual() {
  const [a, setA] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setA((x) => (x + 1) % marks.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-wrap gap-1.5">
        {marks.map((m, i) => (
          <motion.span
            key={m.t}
            animate={{ scale: a === i ? 1.06 : 1 }}
            className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
              a === i
                ? "border-blue-400/60 bg-blue-500/20 text-blue-200"
                : "border-white/10 bg-white/5 text-slate-500"
            }`}
          >
            {m.t} · {m.label}
          </motion.span>
        ))}
      </div>

      <div className="relative mt-8 mb-3">
        <motion.div
          className="absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-[9px] text-blue-200"
          animate={{ left: `${marks[a].p}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <Play className="mr-1 inline size-2" />
          {marks[a].t}
        </motion.div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
            animate={{ width: `${marks[a].p}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>
        {marks.map((m) => (
          <span
            key={m.t}
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/50 bg-[#08101F]"
            style={{ left: `${m.p}%` }}
          />
        ))}
        <motion.span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_3px_rgba(103,232,249,0.7)]"
          animate={{ left: `${marks[a].p}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}

/* ---------- 3. Instant Processing ---------- */

const procSteps = ["Transcribe", "Chunk", "Vectorize"];

function ProcessingVisual() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s >= 3 ? 0 : s + 1)), step === 3 ? 1800 : 1000);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {procSteps.map((s, i) => {
        const done = step > i;
        const running = step === i;
        return (
          <div key={s}>
            <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
              <span className={done || running ? "text-amber-200" : "text-slate-600"}>{s}</span>
              {done ? (
                <Check className="size-3 text-green-400" />
              ) : running ? (
                <motion.span
                  className="text-amber-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  running
                </motion.span>
              ) : null}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                animate={{ width: done || running ? "100%" : "0%" }}
                transition={{ duration: running ? 0.9 : 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 4. Multi-Video Search ---------- */

const videos = [
  { title: "RAG Explained", score: 0.94 },
  { title: "LangGraph Crash Course", score: 0.88 },
  { title: "Vector Databases 101", score: 0.71 },
  { title: "Perfect Pasta at Home", score: 0.09 },
];

function MultiSearchVisual() {
  const [scan, setScan] = useState(0);
  useEffect(() => {
    const t = setTimeout(
      () => setScan((s) => (s > videos.length ? 0 : s + 1)),
      scan > videos.length ? 400 : scan === videos.length ? 2400 : 480,
    );
    return () => clearTimeout(t);
  }, [scan]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] text-emerald-200">
        <Search className="size-3" /> how does RAG work?
      </div>
      <div className="space-y-1.5">
        {videos.map((v, i) => {
          const scanned = scan > i;
          const relevant = v.score > 0.6;
          return (
            <motion.div
              key={v.title}
              animate={{ opacity: scanned && !relevant ? 0.35 : 1 }}
              className={`relative overflow-hidden rounded-md border px-2.5 py-1.5 text-[10px] transition-colors ${
                scanned && relevant
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                  : scan === i
                    ? "border-emerald-400/30 bg-white/5 text-slate-300"
                    : "border-white/10 bg-white/5 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{v.title}</span>
                {scanned && <span className="font-mono text-emerald-300">{v.score.toFixed(2)}</span>}
              </div>
              {scanned && relevant && (
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] bg-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${v.score * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 5. Any Language ---------- */

const langs = [
  { name: "English", q: "What is this video about?", dir: "ltr" },
  { name: "فارسی", q: "این ویدیو درباره چیست؟", dir: "rtl" }
] as const;

function LanguageVisual() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % langs.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-full items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            dir={langs[i].dir}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.35 }}
            className="text-center text-sm font-medium text-pink-100"
          >
            {langs[i].q}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {langs.map((l, idx) => (
          <span
            key={l.name}
            className={`rounded-full border px-2 py-0.5 text-[9px] transition-colors ${
              idx === i
                ? "border-pink-400/60 bg-pink-500/20 text-pink-200"
                : "border-white/10 text-slate-600"
            }`}
          >
            {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- 6. Private & Secure ---------- */

const namespaces = ["user_a", "user_b", "user_c"];
const packetPos = ["16.6%", "50%", "83.3%"];

function PrivacyVisual() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setP((x) => (x + 1) % 3), 2000);
    return () => clearInterval(id);
  }, []);
  const allowed = p === 0;

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="relative h-5">
        <motion.span
          className={`absolute top-1 size-3 -translate-x-1/2 rounded-full ${
            allowed
              ? "bg-green-400 shadow-[0_0_14px_3px_rgba(74,222,128,0.7)]"
              : "bg-red-400 shadow-[0_0_14px_3px_rgba(248,113,113,0.7)]"
          }`}
          animate={{ left: packetPos[p] }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {namespaces.map((n, i) => {
          const hit = p === i;
          return (
            <motion.div
              key={n}
              animate={{ x: hit && !allowed ? [0, -4, 4, -3, 3, 0] : 0 }}
              transition={{ duration: 0.4 }}
              className={`rounded-lg border p-2.5 transition-colors ${
                hit && allowed
                  ? "border-green-400/50 bg-green-500/10"
                  : hit
                    ? "border-red-400/50 bg-red-500/10"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-300">{n}</span>
                <Lock className={`size-3 ${hit ? (allowed ? "text-green-300" : "text-red-300") : "text-slate-600"}`} />
              </div>
              <div className="space-y-1">
                <div className="h-1 w-full rounded bg-indigo-400/30" />
                <div className="h-1 w-2/3 rounded bg-indigo-400/20" />
              </div>
              {i === 0 && <div className="mt-2 text-[9px] text-indigo-300">you</div>}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={p}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mt-2 flex items-center justify-center gap-1.5 font-mono text-[10px] ${
            allowed ? "text-green-300" : "text-red-300"
          }`}
        >
          {allowed ? <Check className="size-3" /> : <X className="size-3" />}
          {allowed ? "namespace match → results returned" : `namespace isolated → access denied`}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- data ---------- */

type Feature = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
  glow: string;
  span: string;
  Visual: ComponentType;
};

const features: Feature[] = [
  {
    icon: MessageSquare,
    title: "Conversational AI",
    desc: "Ask natural language questions and receive detailed answers drawn directly from the video content.",
    color: "from-purple-600 to-purple-800",
    glow: "rgba(147,51,234,0.18)",
    span: "md:col-span-2",
    Visual: ChatVisual,
  },
  {
    icon: Clock,
    title: "Timestamped Answers",
    desc: "Every response includes clickable timestamps so you can jump directly to the relevant part of the video.",
    color: "from-blue-600 to-blue-800",
    glow: "rgba(37,99,235,0.18)",
    span: "md:col-span-1",
    Visual: TimestampVisual,
  },
  {
    icon: Zap,
    title: "Instant Processing",
    desc: "Videos are transcribed, chunked, and vectorized in seconds for lightning-fast retrieval.",
    color: "from-amber-600 to-orange-800",
    glow: "rgba(245,158,11,0.16)",
    span: "md:col-span-1",
    Visual: ProcessingVisual,
  },
  {
    icon: Search,
    title: "Multi-Video Search",
    desc: "Search across all your processed videos at once to find insights from your entire library.",
    color: "from-emerald-600 to-emerald-800",
    glow: "rgba(16,185,129,0.16)",
    span: "md:col-span-1",
    Visual: MultiSearchVisual,
  },
  {
    icon: Globe,
    title: "Any Language",
    desc: "Supports YouTube auto-generated captions in dozens of languages. Ask in any language you prefer.",
    color: "from-pink-600 to-rose-800",
    glow: "rgba(236,72,153,0.16)",
    span: "md:col-span-1",
    Visual: LanguageVisual,
  },
  {
    icon: Shield,
    title: "Private & Secure",
    desc: "Your video data is isolated per user with Pinecone namespacing. Your library is yours alone.",
    color: "from-indigo-600 to-indigo-800",
    glow: "rgba(99,102,241,0.18)",
    span: "md:col-span-3",
    Visual: PrivacyVisual,
  },
];

/* ---------- card with spotlight ---------- */

function FeatureCard({ f, i }: { f: Feature; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
      className={`group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-[#08101F] p-5 transition-colors duration-300 hover:border-white/20 ${f.span}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(340px circle at var(--x, 50%) var(--y, 50%), ${f.glow}, transparent 65%)`,
        }}
      />

      <div className="relative">
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg`}
          >
            <f.icon className="size-5 text-white" />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-white">{f.title}</h3>
            <p className="text-xs leading-relaxed text-slate-400">{f.desc}</p>
          </div>
        </div>

        <div className="h-44 overflow-hidden rounded-xl border border-white/5 bg-[#050B17]/70 p-3">
          {inView && <f.Visual />}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- section ---------- */

export default function FeaturesSection() {
  return (
    <section className="relative overflow-hidden bg-[#050816] px-4 py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-purple-400">Features</p>
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Everything you need to understand any video
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Powered by vector embeddings, RAG architecture, and the latest language models.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}