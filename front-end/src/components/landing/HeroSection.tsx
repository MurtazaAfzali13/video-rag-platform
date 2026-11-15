"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Youtube,
  LayoutDashboard,
  ArrowRight,
  Volume2,           
  VolumeX, 
  Loader2,
  ShieldCheck,
  Zap,
  Lock,
  Play,
  Check,
  Sparkles,
  Clock,
} from "lucide-react";



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

function Typed({ text, speed }: { text: string; speed: number }) {
  const out = useTypewriter(text, speed);
  return (
    <>
      {out}
      {out.length < text.length && (
        <motion.span
          className="ml-px inline-block h-3 w-[2px] translate-y-0.5 bg-purple-300"
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
      )}
    </>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;



function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const mouse = { x: -9999, y: -9999 };

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let pts: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.floor((w * h) / 12000));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.6 + 0.2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        // gentle repel from the cursor
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 140 && md > 0) {
          p.x += (mdx / md) * 0.6;
          p.y += (mdy / md) * 0.6;
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(216,180,254,${p.a})`;
        ctx.fill();

        // constellation lines
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(168,85,247,${(1 - d / 120) * 0.22})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // cursor links
        // cursor links (thicker, brighter, with glow)
        if (md < 200) {
          const k = 1 - md / 200;

          ctx.save();
          ctx.shadowColor = "rgba(103,232,249,0.9)";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(103,232,249,${0.25 + k * 0.65})`;
          ctx.lineWidth = 0.8 + k * 1.6; // from 0.8px far away to 2.4px near the cursor
          ctx.stroke();
          ctx.restore();

          // brighten the star that is linked to the cursor
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 1 + k * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(103,232,249,${0.5 + k * 0.5})`;
          ctx.fill();
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [reduce]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function Aurora() {
  const reduce = useReducedMotion();
  const loop = (x: number[], y: number[], d: number) =>
    reduce
      ? {}
      : {
        animate: { x, y, scale: [1, 1.15, 1] },
        transition: { duration: d, repeat: Infinity, ease: "easeInOut" as const },
      };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-[10%] top-[8%] h-[420px] w-[420px] rounded-full bg-purple-600/15 blur-[120px]"
        {...loop([0, 60, 0], [0, 40, 0], 14)}
      />
      <motion.div
        className="absolute right-[8%] top-[18%] h-[380px] w-[380px] rounded-full bg-cyan-500/10 blur-[120px]"
        {...loop([0, -50, 0], [0, 50, 0], 17)}
      />
      <motion.div
        className="absolute bottom-[8%] left-[35%] h-[360px] w-[360px] rounded-full bg-fuchsia-600/10 blur-[120px]"
        {...loop([0, 40, 0], [0, -40, 0], 19)}
      />
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 75%)",
        }}
      />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#050816_100%)]" />
    </div>
  );
}

/* ============================================================
   product preview
============================================================ */

const NODES = ["supervisor", "retriever", "reranker", "grader"];

const scenarios = [
  {
    q: "What's the main idea behind small-to-big retrieval?",
    a: "Small chunks are embedded for precise matching, then the larger parent text is returned so the answer keeps its full context.",
    cites: [
      { t: "2:14", p: 18 },
      { t: "5:42", p: 46 },
    ],
  },
  {
    q: "When does the speaker explain reranking?",
    a: "A cross-encoder reranks the candidates and drops anything below the relevance threshold before the answer is generated.",
    cites: [{ t: "7:31", p: 61 }],
  },
];



type Phase = "ask" | "think" | "answer" | "hold";

const VIDEO_ID = "gl1r1XV0SLw";

function VideoPane({
  cites,
  showCites,
}: {
  cites: { t: string; p: number }[];
  showCites: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inView = useInView(wrapRef, { amount: 0.3 });

  const [origin, setOrigin] = useState("");
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState({ cur: 0, dur: 0 });

  const pv = useMotionValue(0);
  const pct = useTransform(pv, (v) => `${v}%`);
  const durRef = useRef(0);

  useEffect(() => setOrigin(window.location.origin), []);

  const send = (func: string, args: unknown[] = []) =>
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  // real playback time from the YouTube player
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      let data: any;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (data?.event !== "infoDelivery" || !data.info) return;
      const { currentTime, duration } = data.info;
      if (typeof duration === "number" && duration > 0) durRef.current = duration;
      if (typeof currentTime === "number" && durRef.current > 0) {
        pv.set((currentTime / durRef.current) * 100);
        setTime({ cur: currentTime, dur: durRef.current });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pv]);

  // pause when the hero is off-screen (saves CPU and bandwidth)
  useEffect(() => {
    if (!ready) return;
    send(inView ? "playVideo" : "pauseVideo");
  }, [inView, ready]);

  const toggleSound = () => {
    send(muted ? "unMute" : "mute");
    if (muted) send("setVolume", [70]);
    setMuted((m) => !m);
  };

  const src =
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}` +
    `?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}` +
    `&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0` +
    `&enablejsapi=1&origin=${encodeURIComponent(origin)}`;

  return (
    <div ref={wrapRef} className="flex flex-col gap-2.5">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-purple-900/40 via-[#0b1226] to-cyan-900/30">
        {/* skeleton shimmer until the video is ready */}
        {!ready && (
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ["-120%", "400%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {origin && (
          <iframe
            ref={iframeRef}
            src={src}
            title="VidBrain demo video"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            onLoad={() => {
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
                "*",
              );
              setTimeout(() => setReady(true), 600);
            }}
            className={`pointer-events-none absolute inset-0 h-full w-full scale-[1.04] transition-opacity duration-700 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* soft gradients for readability and polish */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#08101F]/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#08101F]/70 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] text-green-300 backdrop-blur">
          <Check className="size-2.5" /> Indexed
        </div>

        {/* sound toggle */}
        <button
          onClick={toggleSound}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] text-slate-200 backdrop-blur-md transition hover:border-purple-400/50 hover:bg-black/70"
        >
          {muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3 text-cyan-300" />}
          {muted ? "Tap for sound" : "Sound on"}
        </button>
      </div>

      {/* real timeline, driven by the player's current time */}
      <div>
        <div className="relative h-1.5 rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
            style={{ width: pct }}
          />
          {showCites &&
            cites.map((c) => (
              <motion.span
                key={c.t}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300 bg-[#08101F]"
                style={{ left: `${c.p}%` }}
              />
            ))}
          <motion.span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_3px_rgba(103,232,249,0.7)]"
            style={{ left: pct }}
          />
        </div>
        <div className="mt-1.5 font-mono text-[9px] text-slate-500">
          {fmt(time.cur)} / {time.dur ? fmt(time.dur) : "--:--"}
        </div>
      </div>
    </div>
  );
}

function Pipeline({ node, done }: { node: number; done: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {NODES.map((n, i) => {
        const d = done || node > i;
        const r = !done && node === i;
        return (
          <span
            key={n}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] transition-colors ${d
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : r
                ? "border-purple-400/50 bg-purple-500/15 text-purple-200"
                : "border-white/10 text-slate-600"
              }`}
          >
            {d ? (
              <Check className="size-2.5" />
            ) : r ? (
              <motion.span
                className="size-1.5 rounded-full bg-purple-300"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
              />
            ) : null}
            {n}
          </span>
        );
      })}
    </div>
  );
}

function ChatPane({
  s,
  phase,
  node,
}: {
  s: number;
  phase: Phase;
  node: number;
}) {
  const sc = scenarios[s];
  const showAnswer = phase === "answer" || phase === "hold";

  return (
    <div className="flex h-full min-h-[300px] flex-col">
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-200">
          <Sparkles className="size-3 text-purple-300" /> VidBrain AI
        </span>
        <span className="flex items-center gap-1 text-[9px] text-green-300">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-green-400" />
          </span>
          live
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-2.5">
        <motion.div
          key={`q-${s}`}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="self-end rounded-xl rounded-tr-sm bg-slate-700/40 px-3 py-2 text-[11px] text-slate-200"
        >
          <Typed text={sc.q} speed={28} />
        </motion.div>

        {(phase === "think" || showAnswer) && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="pl-7">
            <Pipeline node={node} done={showAnswer} />
          </motion.div>
        )}

        {showAnswer && (
          <motion.div
            key={`a-${s}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-600/30">
              <Sparkles className="size-3 text-purple-300" />
            </span>
            <div>
              <p className="rounded-xl rounded-tl-sm border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-[11px] leading-relaxed text-slate-200">
                <Typed text={sc.a} speed={18} />
              </p>
              <motion.div
                className="mt-1.5 flex gap-1.5"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sc.a.length * 0.018 }}
              >
                {sc.cites.map((c) => (
                  <span
                    key={c.t}
                    className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200"
                  >
                    <Play className="size-2 fill-cyan-200" /> {c.t}
                  </span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FloatBadge({
  className,
  delay,
  children,
}: {
  className: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{ z: 60 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
      transition={{
        opacity: { delay: 1.8 + delay, duration: 0.5 },
        scale: { delay: 1.8 + delay, duration: 0.5 },
        y: { delay: delay, duration: 5 + delay, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`absolute hidden items-center gap-2 rounded-xl border border-white/10 bg-[#0C1426]/90 px-3 py-2 text-[11px] text-slate-200 shadow-2xl backdrop-blur-md lg:flex ${className}`}
    >
      {children}
    </motion.div>
  );
}

function ProductPreview() {
  const [s, setS] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [node, setNode] = useState(0);
  const sc = scenarios[s];

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "ask") {
      t = setTimeout(() => {
        setNode(0);
        setPhase("think");
      }, sc.q.length * 28 + 700);
    } else if (phase === "think") {
      t =
        node < NODES.length
          ? setTimeout(() => setNode((n) => n + 1), 650)
          : setTimeout(() => setPhase("answer"), 300);
    } else if (phase === "answer") {
      t = setTimeout(() => setPhase("hold"), sc.a.length * 18 + 1000);
    } else {
      t = setTimeout(() => {
        setS((x) => (x + 1) % scenarios.length);
        setPhase("ask");
      }, 3200);
    }
    return () => clearTimeout(t);
  }, [phase, node, s, sc.q.length, sc.a.length]);

  const showCites = phase === "answer" || phase === "hold";
  const playhead = showCites ? sc.cites[0].p : 3;

  // 3D tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 70 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-16 w-full max-w-4xl"
      style={{ perspective: 1400 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {/* glow under the window */}
      <div className="pointer-events-none absolute -inset-x-10 -bottom-10 top-1/3 rounded-[40px] bg-gradient-to-r from-purple-600/25 via-fuchsia-500/15 to-cyan-500/20 blur-[70px]" />

      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative rounded-2xl border border-white/10 bg-[#08101F]/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      >
        {/* top highlight */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

        {/* chrome */}
        <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-yellow-400/70" />
          <span className="size-2.5 rounded-full bg-green-400/70" />
          <span className="mx-auto flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1 text-[10px] text-slate-500">
            <Lock className="size-2.5" /> VidBrain · Chat
          </span>
          <span className="w-12" />
        </div>

        <div className="grid gap-5 p-4 md:grid-cols-5 md:p-5">
          <div className="md:col-span-3">
            <VideoPane p={playhead} cites={sc.cites} showCites={showCites} />
          </div>
          <div className="rounded-xl border border-white/5 bg-[#050B17]/70 p-3 md:col-span-2">
            <ChatPane s={s} phase={phase} node={node} />
          </div>
        </div>

        {/* floating badges */}
        <FloatBadge className="-left-10 top-16" delay={0}>
          <span className="flex size-6 items-center justify-center rounded-lg bg-blue-500/20">
            <Clock className="size-3.5 text-blue-300" />
          </span>
          <span>
            <span className="block font-medium text-white">Timestamped</span>
            <span className="text-[9px] text-slate-400">jump to the exact moment</span>
          </span>
        </FloatBadge>

        <FloatBadge className="-right-10 top-28" delay={0.6}>
          <span className="flex size-6 items-center justify-center rounded-lg bg-green-500/20">
            <ShieldCheck className="size-3.5 text-green-300" />
          </span>
          <span>
            <span className="block font-medium text-white">Grounded</span>
            <span className="text-[9px] text-slate-400">hallucination-checked</span>
          </span>
        </FloatBadge>

        <FloatBadge className="-bottom-5 left-16" delay={1.1}>
          <span className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/20">
            <Lock className="size-3.5 text-indigo-300" />
          </span>
          <span>
            <span className="block font-medium text-white">Private namespace</span>
            <span className="text-[9px] text-slate-400">your library only</span>
          </span>
        </FloatBadge>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   hero
============================================================ */

const headlineWords = ["Chat", "with", "any"];

export default function HeroSection() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // safety: never leave a button stuck in loading state
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 6000);
    return () => clearTimeout(t);
  }, [pending]);

  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoaded || pending) return;
    setPending(path);
    router.push(isSignedIn ? path : "/sign-in");
  };

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = sectionRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMove}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050816] px-4 pb-24 pt-28"
    >
      <Aurora />
      <StarField />
      {/* cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(520px circle at var(--mx, 50%) var(--my, 35%), rgba(168,85,247,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        {/* badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-7 flex justify-center"
        >
          <div className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-[11px] font-medium text-purple-200">
            <motion.span
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              animate={{ x: ["-120%", "420%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
            />
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-purple-400" />
            </span>
            <span className="relative uppercase tracking-widest">VidBrain AI</span>
            <span className="relative h-3 w-px bg-purple-400/30" />
            <span className="relative text-slate-300">Self-verified RAG · Timestamped answers</span>
          </div>
        </motion.div>

        {/* headline */}
        <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
          {headlineWords.map((w, i) => (
            <motion.span
              key={w}
              initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="mr-[0.25em] inline-block"
            >
              {w}
            </motion.span>
          ))}
          <br className="hidden sm:block" />
          <motion.span
            initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="relative inline-block"
          >
            <motion.span
              className="bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
              transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            >
              YouTube video
            </motion.span>
            <svg
              className="absolute -bottom-2 left-0 h-3 w-full"
              viewBox="0 0 300 12"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="hero-underline" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#67e8f9" />
                </linearGradient>
              </defs>
              <motion.path
                d="M3 8 C 60 2, 120 11, 180 6 S 270 3, 297 7"
                stroke="url(#hero-underline)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 1.2, ease: "easeOut" }}
              />
            </svg>
          </motion.span>
        </h1>

        {/* sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mx-auto mb-10 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base"
        >
          Transform YouTube content into an interactive AI experience. Ask questions, get timestamped answers, and
          discover insights in seconds.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <div className="relative w-full sm:w-auto">
            <div className="absolute -inset-1 -z-10 animate-pulse rounded-2xl bg-purple-600/40 blur-lg" />
            <button
              onClick={handleNavigation("/chatbot")}
              disabled={!isLoaded}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-purple-500/40 active:scale-95 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {pending === "/chatbot" ? (
                <Loader2 className="relative size-4 animate-spin" />
              ) : (
                <Youtube className="relative size-4" />
              )}
              <span className="relative">Start Chatting</span>
              <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <button
            onClick={handleNavigation("/dashboard")}
            disabled={!isLoaded}
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800/50 bg-[#08101F]/80 px-6 py-3 text-sm font-medium text-slate-300 backdrop-blur transition-all duration-200 hover:border-purple-500/30 hover:bg-[#0A1220] hover:text-white active:scale-95 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {pending === "/dashboard" ? (
              <Loader2 className="size-4 animate-spin text-purple-400" />
            ) : (
              <LayoutDashboard className="size-4 text-slate-400 transition-colors group-hover:text-purple-400" />
            )}
            <span>Dashboard</span>
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15 }}
          className="mt-4 text-[11px] text-slate-500"
        >
          Works with any public YouTube video that has captions
        </motion.p>

        {/* trust row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.6 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] text-slate-400"
        >
          {[
            { icon: ShieldCheck, t: "Self-RAG verified answers" },
            { icon: Zap, t: "Live streaming responses" },
            { icon: Lock, t: "Per-user isolated library" },
          ].map(({ icon: Icon, t }, i) => (
            <span key={t} className="flex items-center gap-2">
              {i > 0 && <span className="hidden h-3 w-px bg-white/10 sm:block" />}
              <Icon className="size-3.5 text-purple-400" />
              {t}
            </span>
          ))}
        </motion.div>
      </div>

      <ProductPreview />
    </section>
  );
}