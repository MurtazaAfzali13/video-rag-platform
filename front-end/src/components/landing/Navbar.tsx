"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "framer-motion";
import { ArrowRight, BrainCircuit, Home, LayoutDashboard, MessageSquare, PanelLeft } from "lucide-react";

/* ============================================================
   config
============================================================ */

const landingLinks = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
];
const landingIds = landingLinks.map((l) => l.id);

const appLinks = [
  { href: "/chatbot", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const spring = { type: "spring", stiffness: 400, damping: 32 } as const;

/* ============================================================
   small pieces
============================================================ */

function Logo() {
  return (
    <Link
      href="/"
      aria-label="VidBrain home"
      className="group flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
    >
      <span className="relative flex size-9 items-center justify-center">
        <span className="absolute inset-0 rounded-xl bg-purple-600/40 opacity-70 blur-md transition-opacity group-hover:opacity-100" />
        <span className="relative flex size-9 items-center justify-center rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-600 to-purple-900">
          <BrainCircuit className="size-[18px] text-white transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
        </span>
        {/* orbiting dot */}
        <motion.span
          className="absolute inset-[-3px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.8)]" />
        </motion.span>
      </span>
      <span className="text-[15px] font-bold tracking-tight text-white">
        Vid
        <span className="bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-transparent">Brain</span>
      </span>
    </Link>
  );
}

function Burger({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5">
      <motion.span
        className="absolute left-0 h-[2px] w-5 rounded bg-white"
        animate={open ? { top: 7, rotate: 45 } : { top: 1, rotate: 0 }}
      />
      <motion.span
        className="absolute left-0 top-[7px] h-[2px] w-5 rounded bg-white"
        animate={{ opacity: open ? 0 : 1 }}
      />
      <motion.span
        className="absolute left-0 h-[2px] w-5 rounded bg-white"
        animate={open ? { top: 7, rotate: -45 } : { top: 13, rotate: 0 }}
      />
    </span>
  );
}

function Cta({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative hidden items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 sm:inline-flex"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative">{label}</span>
      <ArrowRight className="relative size-3.5 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/** highlights the landing section that is currently in the middle of the screen */
function useScrollSpy(ids: string[], enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
        setActive(ids.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids, enabled]);

  return active;
}

/* ============================================================
   navbar
============================================================ */

type NavbarProps = {
  /** force a mode; by default "/" is landing and everything else is app */
  variant?: "landing" | "app";
  /** show a sidebar toggle on small screens (chat page) */
  onMenuClick?: () => void;
};

export default function Navbar({ variant, onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const isLanding = (variant ?? (pathname === "/" ? "landing" : "app")) === "landing";

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const spy = useScrollSpy(landingIds, isLanding);

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  useMotionValueEvent(scrollY, "change", (y) => {
    if (!isLanding) return;
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > prev && y > 160 && !open);
  });

  // close the mobile menu on navigation / Esc, lock page scroll while it is open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    setHidden(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    if (isLanding) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isLanding]);

  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goApp = (path: string) => () => {
    if (!isLoaded) return;
    setOpen(false);
    router.push(isSignedIn ? path : "/sign-in");
  };

  /* ---------- the bar itself ---------- */
  const barContent = (
    <>
      {/* left */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Toggle sidebar"
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-purple-500/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 lg:hidden"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
        <Logo />
      </div>

      {/* center */}
      {isLanding ? (
        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {landingLinks.map((l) => {
            const active = spy === l.id;
            return (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={goTo(l.id)}
                onMouseEnter={() => setHovered(l.id)}
                className={`relative rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  active || hovered === l.id ? "text-white" : "text-slate-400"
                }`}
              >
                {hovered === l.id && (
                  <motion.span
                    layoutId="nav-hover"
                    className="absolute inset-0 rounded-lg bg-white/[0.06]"
                    transition={spring}
                  />
                )}
                <span className="relative">{l.label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-purple-400 to-cyan-300 shadow-[0_0_10px_rgba(168,85,247,0.9)]"
                    transition={spring}
                  />
                )}
              </a>
            );
          })}
        </nav>
      ) : (
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-1 md:flex">
          {appLinks.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  active ? "text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="app-tab"
                    className="absolute inset-0 rounded-lg border border-purple-400/30 bg-gradient-to-br from-purple-600/30 to-purple-800/20 shadow-[0_0_20px_-4px_rgba(168,85,247,0.7)]"
                    transition={spring}
                  />
                )}
                <l.icon className={`relative size-3.5 ${active ? "text-purple-300" : ""}`} />
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* right */}
      <div className="flex items-center gap-2">
        {!isLoaded ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5" />
        ) : isSignedIn ? (
          <>
            {isLanding && <Cta label="Open app" onClick={goApp("/chatbot")} />}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8 ring-2 ring-purple-500/40 transition hover:ring-purple-400",
                },
              }}
            />
          </>
        ) : (
          isLanding && (
            <>
              <Link
                href="/sign-in"
                className="hidden rounded-lg px-3 py-2 text-[13px] font-medium text-slate-300 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 sm:block"
              >
                Sign in
              </Link>
              <Cta label="Get started" onClick={goApp("/chatbot")} />
            </>
          )
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:border-purple-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 md:hidden"
        >
          <Burger open={open} />
        </button>
      </div>
    </>
  );

  return (
    <>
      <motion.header
        animate={{ y: hidden ? -110 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={
          isLanding
            ? "fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4"
            : "relative z-50 shrink-0 border-b border-white/5 bg-[#050816]/80 backdrop-blur-xl"
        }
      >
        {isLanding ? (
          <motion.div
            className="mx-auto w-full"
            animate={{ maxWidth: scrolled ? 900 : 1120 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className={`rounded-2xl p-px transition-all duration-500 ${
                scrolled
                  ? "bg-gradient-to-r from-white/10 via-purple-500/40 to-white/10 shadow-[0_10px_40px_-10px_rgba(147,51,234,0.35)]"
                  : "bg-transparent"
              }`}
            >
              <div
                className={`relative flex items-center justify-between rounded-[15px] px-3 transition-all duration-500 sm:px-4 ${
                  scrolled ? "h-14 bg-[#08101F]/80 backdrop-blur-xl" : "h-16 bg-transparent"
                }`}
              >
                {barContent}
                {scrolled && (
                  <motion.div
                    className="absolute inset-x-4 -bottom-px h-[2px] origin-left rounded bg-gradient-to-r from-purple-500 to-cyan-400"
                    style={{ scaleX: progress }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="relative mx-auto flex h-14 w-full max-w-[1800px] items-center justify-between px-3 sm:px-4">
            {barContent}
          </div>
        )}
      </motion.header>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className={`fixed inset-x-3 z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#08101F]/95 p-3 shadow-2xl backdrop-blur-xl md:hidden ${
                isLanding ? "top-[4.75rem]" : "top-16"
              }`}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-purple-600/20 blur-3xl" />

              {isLanding ? (
                <>
                  {landingLinks.map((l, i) => (
                    <motion.a
                      key={l.id}
                      href={`#${l.id}`}
                      onClick={goTo(l.id)}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.06 }}
                      className="relative flex items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-200 hover:bg-white/5"
                    >
                      {l.label}
                      <ArrowRight className="size-4 text-slate-500" />
                    </motion.a>
                  ))}
                  <div className="my-2 h-px bg-white/5" />
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={goApp("/chatbot")}
                    className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 active:scale-[0.98]"
                  >
                    {isSignedIn ? "Open app" : "Get started"}
                    <ArrowRight className="size-4" />
                  </motion.button>
                  {isLoaded && !isSignedIn && (
                    <Link
                      href="/sign-in"
                      className="relative mt-2 block rounded-xl px-3 py-2.5 text-center text-sm text-slate-300 hover:bg-white/5"
                    >
                      Sign in
                    </Link>
                  )}
                </>
              ) : (
                <>
                  {[{ href: "/", label: "Home", icon: Home }, ...appLinks].map((l, i) => {
                    const active = l.href !== "/" && pathname.startsWith(l.href);
                    return (
                      <motion.div
                        key={l.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.06 }}
                      >
                        <Link
                          href={l.href}
                          className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                            active
                              ? "border border-purple-400/30 bg-purple-500/15 text-white"
                              : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <l.icon className={`size-4 ${active ? "text-purple-300" : "text-slate-500"}`} />
                          {l.label}
                        </Link>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}