"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Youtube,
  Sparkles,
  MessageSquare,
  Clock,
  Zap,
  Shield,
  Play,
  Star,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Smart Q&A",
    description: "Ask anything about the video",
  },
  {
    icon: Clock,
    title: "Timestamps",
    description: "Jump to exact moments instantly",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "AI answers in real time",
  },
  {
    icon: Shield,
    title: "Accurate",
    description: "Grounded in transcript data",
  },
];

/* Deterministic pseudo-random particle field — generated once, not on every render */
function makeParticles(count: number, seed: number) {
  const particles: {
    left: number;
    top: number;
    size: number;
    blur: number;
    opacity: number;
    color: string;
    delay: number;
    duration: number;
  }[] = [];

  const colors = [
    "rgba(168,85,247,VAR)", // purple
    "rgba(196,160,255,VAR)", // light violet
    "rgba(236,72,196,VAR)", // pink
    "rgba(99,140,255,VAR)", // blue
    "rgba(255,255,255,VAR)", // white
  ];

  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = 0; i < count; i++) {
    const tier = rand();
    const size = tier < 0.55 ? 2 + rand() * 3 : tier < 0.85 ? 5 + rand() * 6 : 11 + rand() * 14;
    const opacity = tier < 0.55 ? 0.35 + rand() * 0.45 : tier < 0.85 ? 0.18 + rand() * 0.25 : 0.08 + rand() * 0.14;
    const blur = size < 5 ? rand() * 1.5 : size < 11 ? 1.5 + rand() * 2.5 : 4 + rand() * 6;
    const color = colors[Math.floor(rand() * colors.length)].replace("VAR", opacity.toFixed(2));

    particles.push({
      left: rand() * 100,
      top: rand() * 100,
      size,
      blur,
      opacity,
      color,
      delay: rand() * 4,
      duration: 4 + rand() * 5,
    });
  }
  return particles;
}

const PARTICLES = makeParticles(58, 7);

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#09090F]">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_50%,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_0%_80%,rgba(168,85,247,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#09090F_78%)]" />

        <div className="hero-orb hero-orb-a absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="hero-orb hero-orb-b absolute bottom-[12%] right-[10%] h-96 w-96 rounded-full bg-violet-500/15 blur-[120px]" />
        <div className="hero-orb hero-orb-c absolute right-[35%] top-[8%] h-48 w-48 rounded-full bg-blue-500/10 blur-[80px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,1) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center px-4 pb-20 pt-28 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:pb-24 lg:pt-32 xl:gap-16">
        {/* Left column — UNCHANGED */}
        <div className="hero-fade-in flex w-full max-w-xl flex-col items-center text-center lg:max-w-none lg:flex-1 lg:items-start lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-200 shadow-[0_0_24px_rgba(168,85,247,0.15)] backdrop-blur-md">
            <Sparkles className="size-3.5 text-purple-300" />
            <span>AI-Powered YouTube Analysis</span>
            <span className="h-1 w-1 rounded-full bg-purple-400" />
            <span className="rounded-full bg-purple-600/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
              New
            </span>
          </div>

          <h1 className="mt-8 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl xl:text-[4.25rem]">
            Chat with any
            <br />
            <span className="bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#818CF8] bg-clip-text text-transparent">
              YouTube video
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
            VideoGPT transforms YouTube content into an interactive AI experience.
            Ask questions, get timestamped answers, and discover insights you would
            have missed.
          </p>

          <div className="mt-10 grid w-full max-w-lg grid-cols-2 gap-3 sm:gap-4 lg:max-w-none lg:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-left backdrop-blur-sm transition-all duration-300 hover:border-purple-500/25 hover:bg-purple-500/[0.06] sm:p-4"
              >
                <div className="mb-2.5 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/30 to-violet-700/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] ring-1 ring-purple-500/20 transition-shadow duration-300 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.35)]">
                  <Icon className="size-4 text-purple-300" />
                </div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-white/50">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex w-full flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <Link
              href="/chatbot"
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(168,85,247,0.35)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(168,85,247,0.45)] active:scale-[0.98] sm:w-auto"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Youtube className="relative size-4" />
              <span className="relative">Start for free</span>
              <ArrowRight className="relative size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white/80 backdrop-blur-md transition-all duration-300 hover:border-purple-500/30 hover:bg-white/[0.07] hover:text-white sm:w-auto"
            >
              <Play className="size-4 fill-current text-purple-300" />
              See how it works
            </Link>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-center">
            <div className="flex -space-x-2.5">
              {["from-violet-500", "from-purple-500", "from-fuchsia-500", "from-indigo-500"].map(
                (gradient, i) => (
                  <div
                    key={gradient}
                    className={`flex size-9 items-center justify-center rounded-full border-2 border-[#09090F] bg-gradient-to-br ${gradient} to-purple-800 text-[10px] font-bold text-white shadow-lg`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                )
              )}
            </div>
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
                <span className="ml-2 text-sm font-semibold text-white">5.0</span>
              </div>
              <p className="text-xs text-white/50">
                Loved by 10,000+ learners and creators
              </p>
            </div>
          </div>
        </div>

        {/* Right column — REDESIGNED: organic glowing ring energy field behind the original image */}
        <div className="hero-fade-in-delay relative mt-16 flex w-full flex-1 items-center justify-center lg:mt-0 lg:justify-end">
          <div className="relative w-full max-w-[580px] xl:max-w-[660px]">

            {/* ============ LAYER 0 — Purple/pink/blue atmospheric fog ============ */}
            <div className="absolute inset-[-20%]">
              <div className="absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/14 blur-[160px]" />
              <div className="absolute left-[12%] top-[10%] h-[360px] w-[420px] rounded-full bg-fuchsia-500/12 blur-[130px]" />
              <div className="absolute right-[8%] bottom-[14%] h-[420px] w-[380px] rounded-full bg-blue-500/12 blur-[140px]" />
              <div className="absolute left-[30%] bottom-[5%] h-[260px] w-[320px] rounded-full bg-pink-400/10 blur-[120px]" />
              <div className="absolute right-[25%] top-[5%] h-[220px] w-[260px] rounded-full bg-violet-400/14 blur-[110px]" />
              <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/18 blur-[100px]" />
            </div>

            {/* ============ LAYER 1 — Organic irregular glow rings (4–6 layers) ============ */}
            <div className="pointer-events-none absolute inset-0">
              {/* Ring A — largest, loosest, most rotated */}
              <div
                className="ring-spin-slow absolute left-1/2 top-1/2 h-[640px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-[58%_42%_45%_55%/55%_48%_52%_45%] opacity-70 blur-[18px]"
                style={{
                  border: "14px solid transparent",
                  borderImage:
                    "linear-gradient(120deg, rgba(124,58,237,0.55), rgba(192,132,252,0.5), rgba(236,72,196,0.4), rgba(99,102,241,0.5)) 1",
                  transform: "translate(-50%,-50%) rotate(8deg)",
                }}
              />
              {/* Ring B */}
              <div
                className="ring-drift-a absolute left-1/2 top-1/2 h-[540px] w-[610px] -translate-x-1/2 -translate-y-1/2 rounded-[45%_55%_60%_40%/48%_55%_45%_52%] opacity-60 blur-[12px]"
                style={{
                  border: "8px solid transparent",
                  borderImage:
                    "linear-gradient(200deg, rgba(168,85,247,0.5), rgba(244,114,182,0.4), rgba(96,165,250,0.45)) 1",
                  transform: "translate(-50%,-50%) rotate(-14deg)",
                }}
              />
              {/* Ring C — thinner, brighter accent */}
              <div
                className="ring-drift-b absolute left-1/2 top-1/2 h-[460px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-[50%_50%_42%_58%/45%_58%_42%_55%] opacity-80 blur-[6px]"
                style={{
                  border: "3px solid transparent",
                  borderImage:
                    "linear-gradient(60deg, rgba(192,132,252,0.85), rgba(217,70,239,0.6), rgba(129,140,248,0.7)) 1",
                  transform: "translate(-50%,-50%) rotate(21deg)",
                  boxShadow: "0 0 70px 6px rgba(168,85,247,0.35)",
                }}
              />
              {/* Ring D — partially hidden behind image, sits closer to center */}
              <div
                className="ring-spin-rev absolute left-1/2 top-1/2 h-[380px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[55%_45%_50%_50%/42%_50%_50%_58%] opacity-50 blur-[20px]"
                style={{
                  border: "20px solid transparent",
                  borderImage:
                    "linear-gradient(310deg, rgba(124,58,237,0.4), rgba(236,72,196,0.3), rgba(59,130,246,0.35)) 1",
                  transform: "translate(-50%,-50%) rotate(-5deg)",
                }}
              />
              {/* Ring E — extends beyond container, very soft */}
              <div
                className="ring-drift-a absolute left-1/2 top-1/2 h-[760px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-[48%_52%_55%_45%/52%_45%_55%_48%] opacity-35 blur-[30px]"
                style={{
                  border: "2px solid transparent",
                  borderImage: "linear-gradient(150deg, rgba(168,85,247,0.4), rgba(99,102,241,0.3)) 1",
                  transform: "translate(-50%,-50%) rotate(33deg)",
                }}
              />
              {/* Ring F — small tight bright core ring, slightly offset */}
              <div
                className="ring-spin-slow absolute left-[46%] top-[48%] h-[260px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[50%_50%_45%_55%/55%_45%_50%_50%] opacity-90 blur-[3px]"
                style={{
                  border: "2px solid transparent",
                  borderImage: "linear-gradient(90deg, rgba(216,180,254,0.9), rgba(244,114,182,0.6)) 1",
                  transform: "translate(-50%,-50%) rotate(-18deg)",
                  boxShadow: "0 0 50px 4px rgba(216,180,254,0.4)",
                }}
              />
            </div>

            {/* ============ LAYER 2 — Floating glow particles (≈58, scattered, varied) ============ */}
            <div className="pointer-events-none absolute inset-[-10%]">
              {PARTICLES.map((p, i) => (
                <div
                  key={i}
                  className="particle-float absolute rounded-full"
                  style={{
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                    filter: `blur(${p.blur}px)`,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                  }}
                />
              ))}
            </div>

            {/* ============ LAYER 3 — Soft bloom highlights / reflections near the ring edges ============ */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[18%] top-[12%] h-24 w-24 rounded-full bg-white/10 blur-[40px]" />
              <div className="absolute right-[14%] top-[20%] h-20 w-20 rounded-full bg-pink-200/10 blur-[36px]" />
              <div className="absolute right-[10%] bottom-[18%] h-28 w-28 rounded-full bg-blue-200/10 blur-[44px]" />
              <div className="absolute left-[8%] bottom-[30%] h-16 w-16 rounded-full bg-violet-200/12 blur-[30px]" />
            </div>

            {/* ============ Energy platform rings beneath the image ============ */}
            <div className="absolute bottom-[-12%] left-1/2 -translate-x-1/2">
              <div className="relative flex flex-col items-center">
                <div className="absolute bottom-0 h-56 w-80 rounded-[60%] border border-purple-500/15 blur-md animate-pulse-slow" />
                <div className="absolute bottom-4 h-48 w-72 rounded-[55%] border border-pink-500/12 blur-lg animate-pulse-slow" style={{ animationDelay: "0.5s" }} />
                <div className="absolute bottom-8 h-40 w-64 rounded-[50%] border border-blue-500/10 blur-xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
                <div className="absolute bottom-12 h-32 w-56 rounded-[45%] bg-purple-500/5 blur-2xl" />
                <div className="absolute bottom-0 h-24 w-72 bg-gradient-to-t from-purple-500/10 via-purple-500/5 to-transparent blur-2xl" />
              </div>
            </div>

            {/* ============ Main image — the untouched centerpiece, gently rotated ============ */}
            <div className="hero-float relative [perspective:1200px]">
              <div className="relative rotate-[-9deg] transition-all duration-700 hover:rotate-[-7deg] hover:scale-[1.02] [transform-style:preserve-3d]">
                {/* Ambient shadow */}
                <div className="absolute -inset-6 rounded-[3rem] bg-purple-500/20 blur-[80px] opacity-40" />

                {/* Premium glass panel */}
                <div className="relative overflow-hidden rounded-[2.25rem] border border-white/15 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-3 shadow-[0_40px_100px_rgba(0,0,0,0.6),0_0_80px_rgba(139,92,246,0.12)] backdrop-blur-xl">
                  {/* Glass reflections */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-tl from-purple-500/5 via-transparent to-transparent pointer-events-none" />

                  {/* Inner border glow */}
                  <div className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />

                  {/* Image */}
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#0a0a12]">
                    <Image
                      src="/images/image-hero.png"
                      alt="VideoGPT AI workspace — chat with any YouTube video"
                      width={1200}
                      height={750}
                      priority
                      className="h-auto w-full object-cover object-top"
                    />

                    {/* Subtle overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating 3D Play Button */}
            <div className="hero-float-slow absolute -bottom-2 -right-4 z-20">
              <div className="relative flex items-center justify-center">
                {/* Glow layers */}
                <div className="absolute inset-0 rounded-2xl bg-purple-500/30 blur-2xl animate-pulse-slow" />
                <div className="absolute inset-0 rounded-2xl bg-pink-500/20 blur-xl animate-pulse-slow" style={{ animationDelay: "0.7s" }} />
                <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl animate-pulse-slow" style={{ animationDelay: "1.4s" }} />

                {/* Button */}
                <div className="relative rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl shadow-[0_20px_60px_rgba(139,92,246,0.3)]">
                  <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-3">
                    <Play className="size-8 fill-white text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -left-12 top-20 opacity-20">
              <div className="h-2.5 w-2.5 rotate-45 transform bg-purple-400/30 blur-sm" />
            </div>
            <div className="absolute -right-10 bottom-40 opacity-20">
              <div className="h-3.5 w-3.5 rotate-45 transform bg-pink-400/20 blur-sm" />
            </div>
            <div className="absolute left-8 top-1/2 opacity-15">
              <div className="h-2 w-2 rotate-45 transform bg-blue-400/30 blur-sm" />
            </div>
            <div className="absolute right-12 bottom-20 opacity-15">
              <div className="h-2.5 w-2.5 rotate-45 transform bg-purple-400/20 blur-sm" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }
        @keyframes heroFloatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(4deg); }
        }
        @keyframes heroOrbPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(6px, -10px) scale(1.15); }
          66% { transform: translate(-5px, 6px) scale(0.92); }
        }
        @keyframes ringSpinSlow {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes ringSpinRev {
          from { transform: translate(-50%,-50%) rotate(360deg); }
          to { transform: translate(-50%,-50%) rotate(0deg); }
        }
        @keyframes ringDriftA {
          0%, 100% { transform: translate(-50%,-50%) rotate(-14deg) scale(1); }
          50% { transform: translate(-50%,-50%) rotate(-8deg) scale(1.03); }
        }
        @keyframes ringDriftB {
          0%, 100% { transform: translate(-50%,-50%) rotate(21deg) scale(1); }
          50% { transform: translate(-50%,-50%) rotate(27deg) scale(1.04); }
        }

        .hero-float { animation: heroFloat 6s ease-in-out infinite; }
        .hero-float-slow { animation: heroFloatSlow 5s ease-in-out infinite; }
        .hero-orb { animation: heroOrbPulse 8s ease-in-out infinite; }
        .hero-orb-b { animation-delay: 2s; }
        .hero-orb-c { animation-delay: 4s; }
        .hero-fade-in { animation: heroFadeIn 0.8s ease-out both; }
        .hero-fade-in-delay { animation: heroFadeIn 0.8s ease-out 0.15s both; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }

        .particle-float { animation-name: particleFloat; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .ring-spin-slow { animation: ringSpinSlow 38s linear infinite; }
        .ring-spin-rev { animation: ringSpinRev 46s linear infinite; }
        .ring-drift-a { animation: ringDriftA 14s ease-in-out infinite; }
        .ring-drift-b { animation: ringDriftB 11s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .hero-float, .hero-float-slow, .hero-orb, .animate-pulse-slow,
          .particle-float, .ring-spin-slow, .ring-spin-rev, .ring-drift-a, .ring-drift-b {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
