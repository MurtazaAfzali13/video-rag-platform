"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, ArrowUpRight, BrainCircuit, Github, Linkedin, Mail, Sparkles } from "lucide-react";

/* ============================================================
   config: edit these
============================================================ */

const CREATOR = "Murtaza";
const SOCIALS = {
  github: "https://github.com/your-username", // TODO
  linkedin: "https://www.linkedin.com/in/your-profile", // TODO
  email: "mailto:you@example.com", // TODO
};

const techs = [
  "LangGraph",
  "Pinecone",
  "Supabase",
  "FastAPI",
  "Next.js",
  "Clerk",
  "Tailwind CSS",
  "Framer Motion",
];

const underTheHood = [
  "Self-RAG answer grading",
  "Small-to-big retrieval",
  "Cross-encoder reranking",
  "Per-user Pinecone namespaces",
  "Live SSE streaming",
];

/* ============================================================
   helpers
============================================================ */

function useTypeLoop(words: string[], speed = 45, pause = 1600) {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const w = words[i];
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!del && text === w) {
      t = setTimeout(() => setDel(true), pause);
    } else if (del && text === "") {
      setDel(false);
      setI((x) => (x + 1) % words.length);
    } else {
      t = setTimeout(
        () => setText(del ? w.slice(0, text.length - 1) : w.slice(0, text.length + 1)),
        del ? speed / 2 : speed,
      );
    }
    return () => clearTimeout(t);
  }, [text, del, i, words, speed, pause]);

  return text;
}

const demoUrls = ["youtube.com/watch?v=gl1r1XV0SLw", "youtu.be/your-video-id"];

const scrollToId = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ============================================================
   final CTA
============================================================ */

function FinalCta() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const typed = useTypeLoop(demoUrls);

  const go = () => {
    if (!isLoaded) return;
    router.push(isSignedIn ? "/chatbot" : "/sign-in");
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-4xl"
    >
      {/* glow behind the card */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-r from-purple-600/20 via-fuchsia-500/10 to-cyan-500/20 blur-3xl" />

      {/* rotating gradient border */}
      <div className="relative overflow-hidden rounded-3xl p-px">
        <motion.div
          className="absolute -inset-[100%]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0 65%, rgba(168,85,247,0.95) 82%, rgba(103,232,249,0.95) 100%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />

        <div
          ref={cardRef}
          onMouseMove={onMove}
          className="group relative overflow-hidden rounded-[23px] bg-[#08101F] px-6 py-14 text-center sm:px-12"
        >
          {/* mouse spotlight */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgba(168,85,247,0.16), transparent 65%)",
            }}
          />
          {/* grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            }}
          />

          <div className="relative">
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-purple-200">
              <Sparkles className="size-3" /> Ready when you are
            </span>

            <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              Stop scrubbing.{" "}
              <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                Start asking.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-400 md:text-base">
              Paste any YouTube link and get verified, timestamped answers in seconds.
            </p>

            {/* fake input + button */}
            <div className="mx-auto mt-8 flex max-w-xl flex-col items-stretch gap-3 sm:flex-row">
              <div
                className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#050B17]/80 px-4 py-3 text-left font-mono text-xs text-slate-300"
                aria-hidden
              >
                <span className="text-purple-400">https://</span>
                <span className="truncate">{typed}</span>
                <motion.span
                  className="inline-block h-3.5 w-[2px] shrink-0 bg-purple-300"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                />
              </div>

              <button
                onClick={go}
                disabled={!isLoaded}
                className="group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-purple-500/50 active:scale-95 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                <span className="relative">Start Chatting</span>
                <ArrowRight className="relative size-4 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>

            <p className="mt-4 text-[11px] text-slate-500">Works with any public video that has captions</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   tech marquee
============================================================ */

function TechMarquee() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mt-20">
      <p className="mb-5 text-center text-[11px] font-medium uppercase tracking-widest text-slate-600">
        Built with
      </p>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
        <motion.div
          className="flex w-max"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        >
          {[...techs, ...techs].map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-4 py-2 text-xs text-slate-400 transition-colors hover:border-purple-500/30 hover:text-white"
            >
              <span className="size-1.5 rounded-full bg-purple-400/70" />
              {t}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================================
   footer pieces
============================================================ */

function FooterLink({
  children,
  href,
  onClick,
  external,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  external?: boolean;
}) {
  const cls =
    "group inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:text-white focus-visible:underline";
  const inner = (
    <>
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-purple-400 to-cyan-300 transition-all duration-300 group-hover:w-full" />
      </span>
      {external && (
        <ArrowUpRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      )}
    </>
  );

  if (onClick && !href) {
    return (
      <button onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return href?.startsWith("#") ? (
    <a href={href} onClick={onClick} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href ?? "/"} className={cls}>
      {inner}
    </Link>
  );
}

function ColTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-200">{children}</h3>;
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      aria-label={label}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.92 }}
      className="group relative flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition-colors hover:border-purple-400/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
    >
      <span className="absolute inset-0 rounded-xl bg-purple-500/0 blur-md transition-colors group-hover:bg-purple-500/30" />
      <span className="relative">{children}</span>
    </motion.a>
  );
}

/* ============================================================
   footer
============================================================ */

export default function Footer() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const goApp = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    router.push(isSignedIn ? path : "/sign-in");
  };

  return (
    <footer className="relative overflow-hidden bg-[#050816] px-4 pt-24">
      {/* top divider + ambient light */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-600/30 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-purple-600/[0.07] blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <FinalCta />
        <TechMarquee />

        {/* link columns */}
        <div className="mt-20 grid gap-10 border-t border-white/5 pt-14 md:grid-cols-12">
          {/* brand */}
          <div className="md:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-2.5 focus:outline-none">
              <span className="relative flex size-9 items-center justify-center">
                <span className="absolute inset-0 rounded-xl bg-purple-600/40 blur-md" />
                <span className="relative flex size-9 items-center justify-center rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-600 to-purple-900">
                  <BrainCircuit className="size-[18px] text-white transition-transform duration-500 group-hover:rotate-12" />
                </span>
              </span>
              <span className="text-[15px] font-bold tracking-tight text-white">
                Vid
                <span className="bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-transparent">
                  Brain
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Chat with any YouTube video. Verified, timestamped answers powered by a self-checking RAG pipeline.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Social href={SOCIALS.github} label="GitHub">
                <Github className="size-4" />
              </Social>
              <Social href={SOCIALS.linkedin} label="LinkedIn">
                <Linkedin className="size-4" />
              </Social>
              <Social href={SOCIALS.email} label="Email">
                <Mail className="size-4" />
              </Social>
            </div>
          </div>

          {/* product */}
          <div className="md:col-span-2">
            <ColTitle>Product</ColTitle>
            <ul className="space-y-3">
              <li>
                <FooterLink href="#features" onClick={scrollToId("features")}>
                  Features
                </FooterLink>
              </li>
              <li>
                <FooterLink href="#how-it-works" onClick={scrollToId("how-it-works")}>
                  How it works
                </FooterLink>
              </li>
              <li>
                <FooterLink onClick={goApp("/chatbot")}>Chat</FooterLink>
              </li>
              <li>
                <FooterLink onClick={goApp("/dashboard")}>Dashboard</FooterLink>
              </li>
            </ul>
          </div>

          {/* under the hood */}
          <div className="md:col-span-3">
            <ColTitle>Under the hood</ColTitle>
            <ul className="space-y-3">
              {underTheHood.map((t, i) => (
                <motion.li
                  key={t}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-2 text-sm text-slate-400"
                >
                  <span className="size-1.5 rounded-full bg-gradient-to-br from-purple-400 to-cyan-300" />
                  {t}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* connect */}
          <div className="md:col-span-3">
            <ColTitle>Connect</ColTitle>
            <ul className="space-y-3">
              <li>
                <FooterLink href={SOCIALS.github} external>
                  GitHub
                </FooterLink>
              </li>
              <li>
                <FooterLink href={SOCIALS.linkedin} external>
                  LinkedIn
                </FooterLink>
              </li>
              <li>
                <FooterLink href={SOCIALS.email} external>
                  Contact
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/privacy">Privacy</FooterLink>
              </li>
              <li>
                <FooterLink href="/terms">Terms</FooterLink>
              </li>
            </ul>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/5 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} VidBrain. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Designed &amp; built by <span className="font-medium text-slate-300">{CREATOR}</span>
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-slate-400 transition-colors hover:border-purple-400/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
          >
            Back to top
            <ArrowUp className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      {/* giant wordmark */}
      <div className="pointer-events-none relative z-0 -mt-2 select-none overflow-hidden" aria-hidden>
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="bg-gradient-to-b from-white/[0.13] via-purple-400/[0.07] to-transparent bg-clip-text text-center font-black leading-[0.85] tracking-tighter text-transparent"
          style={{ fontSize: "clamp(4rem, 21vw, 17rem)" }}
        >
          VIDBRAIN
        </motion.div>
      </div>
    </footer>
  );
}