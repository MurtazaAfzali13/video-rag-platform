"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";

import {
  Sparkles,
  ArrowRight,
  Play,
  BrainCircuit,
  Clock3,
  Shield,
  Zap,
  TrendingUp,
  Star,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    setMounted(true);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen overflow-hidden bg-[#020617]"
    >
      {/* Enhanced Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#312e81_0%,transparent_35%),radial-gradient(circle_at_top_right,#1d4ed8_0%,transparent_32%),radial-gradient(circle_at_bottom_center,#7c3aed_0%,transparent_35%),radial-gradient(circle_at_center,#4f46e5_0%,transparent_50%)] opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#020617] to-black" />

      {/* Advanced Grid Pattern with Animation */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        <motion.div
          animate={{
            backgroundPosition: ["0px 0px", "60px 60px"],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(99,102,241,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "120px 120px",
          }}
        />
      </div>

      {/* Animated Glow Orbs - Enhanced */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -60, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-150px] right-[-100px] w-[700px] h-[700px] bg-blue-600/20 blur-[160px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 70, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-200px] left-[-100px] w-[650px] h-[650px] bg-purple-700/20 blur-[170px] rounded-full"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
          x: [0, 40, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[25%] left-[25%] w-[400px] h-[400px] bg-fuchsia-600/15 blur-[140px] rounded-full"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2],
          x: [0, -50, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[30%] right-[20%] w-[350px] h-[350px] bg-indigo-500/15 blur-[130px] rounded-full"
      />

      {/* Floating Particles - Enhanced */}
      {mounted && <ParticleField />}
      {mounted && <FloatingParticles />}

      <motion.div
        style={{ y }}
        className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20 pb-16 lg:pb-20"
      >
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-12 items-center">
          
          {/* Left Side - Text Content */}
          <div className="max-w-2xl lg:max-w-full text-center lg:text-left">
            {/* Enhanced Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-fuchsia-600/10 border border-white/10 backdrop-blur-xl mb-6 lg:mb-8 mx-auto lg:mx-0 relative group cursor-pointer hover:border-violet-400/30 transition-all duration-300"
            >
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-xs font-medium bg-gradient-to-r from-blue-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                ✨ AI-Powered Intelligence — Now with RAG 2.0
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-fuchsia-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>

            {/* Enhanced Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.15] sm:leading-[1.1] tracking-tight"
            >
              Unlock the Power
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent animate-gradient">
                  of Every Video
                </span>
                <motion.span
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.8, 1, 0.8],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-2 -right-8"
                >
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400/50" />
                </motion.span>
              </span>
              <br />
              <span className="text-gray-200">
                with AI Precision
              </span>
            </motion.h1>

            {/* Enhanced Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Ask questions, get timestamp-accurate answers, and extract 
              <span className="text-violet-400 font-medium"> actionable insights</span> from any video content using 
              cutting-edge RAG architecture.
            </motion.p>

            {/* Enhanced Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-5 mt-8 sm:mt-10 justify-center lg:justify-start"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group relative overflow-hidden rounded-xl px-6 sm:px-8 py-3 sm:py-3.5 font-semibold text-white bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2.5 text-sm sm:text-base">
                  Try It Now — It's Free
                  <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-blue-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] backdrop-blur-xl px-6 sm:px-8 py-3 sm:py-3.5 text-white hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300 group"
              >
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                </div>
                <span className="text-sm sm:text-base font-medium">Watch Demo</span>
              </motion.button>
            </motion.div>

            {/* Enhanced Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 mt-8 sm:mt-10"
            >
              <Feature 
                icon={<Clock3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />} 
                text="Timestamp Accuracy" 
              />
              <Feature 
                icon={<BrainCircuit className="w-4 h-4 sm:w-4.5 sm:h-4.5" />} 
                text="AI-Powered RAG" 
              />
              <Feature 
                icon={<Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />} 
                text="Privacy First" 
              />
              <Feature 
                icon={<Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />} 
                text="Real-Time Response" 
              />
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center lg:justify-start gap-6 mt-6 sm:mt-8"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 border-2 border-[#020617] flex items-center justify-center text-xs font-bold text-white"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★★★★★</span>
                  <span className="text-gray-400 text-sm">(5.0)</span>
                </div>
                <p className="text-xs text-gray-500">
                  Trusted by <span className="text-violet-400 font-semibold">10,000+</span> creators
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Enhanced Dashboard Image */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative w-full mt-6 lg:mt-0"
          >
            <div className={`relative ${isMobile ? 'max-w-[340px] mx-auto' : 'max-w-[1000px] lg:-mr-8 xl:-mr-12'}`}>
              {/* Enhanced Outer Glow Effect */}
              <motion.div
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute -inset-6 sm:-inset-8 lg:-inset-10 bg-gradient-to-r from-blue-600/30 via-violet-600/25 to-fuchsia-600/30 blur-[50px] lg:blur-[100px] rounded-[40px] lg:rounded-[60px]`}
              />
              
              {/* Inner Glow - Enhanced */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-violet-500/5 to-fuchsia-500/10 blur-[30px] lg:blur-[50px] rounded-[28px] lg:rounded-[48px]" />

              {/* Main Card - Enhanced */}
              <div className="relative rounded-[24px] lg:rounded-[36px] border border-white/15 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-3xl p-2 lg:p-3 shadow-[0_0_60px_rgba(99,102,241,0.2)] lg:shadow-[0_0_100px_rgba(99,102,241,0.25)] hover:shadow-[0_0_80px_rgba(99,102,241,0.3)] transition-shadow duration-500">
                {/* Top Border Glow - Animated */}
                <motion.div
                  animate={{
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
                />
                
                {/* Side Border Glows */}
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-violet-400/20 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-fuchsia-400/20 to-transparent" />

                {/* Image Container */}
                <div className="relative overflow-hidden rounded-[20px] lg:rounded-[28px] border border-white/5">
                  {/* Enhanced Overlay Gradient */}
                  <div className="absolute inset-0 z-10 bg-gradient-to-tr from-[#020617]/30 via-transparent to-blue-500/10 pointer-events-none" />
                  
                  {/* Floating UI Elements - Decorative */}
                  {!isMobile && (
                    <>
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-6 right-6 z-20 bg-[#020617]/80 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-xs text-white">Live Analysis</span>
                        </div>
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-6 left-6 z-20 bg-[#020617]/80 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs text-gray-300">Processing</span>
                          <span className="text-xs text-violet-400 font-mono">2.4s</span>
                        </div>
                      </motion.div>
                    </>
                  )}

                  {/* Bottom Glow - Enhanced */}
                  <div className="absolute -bottom-8 lg:-bottom-12 left-1/2 -translate-x-1/2 w-[80%] h-[80px] lg:h-[120px] bg-violet-600/30 blur-[50px] lg:blur-[90px] rounded-full z-0" />

                  {/* Dashboard Image */}
                  <Image
                    src="/images/HeroSection.png"
                    alt="AI Dashboard Preview"
                    width={2000}
                    height={1800}
                    className="relative z-20 w-full h-auto object-cover rounded-[20px] lg:rounded-[28px]"
                    priority
                  />
                </div>
              </div>

              {/* Decorative corner accents - Enhanced */}
              {!isMobile && (
                <>
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-4 -right-4 w-16 h-16 lg:w-20 lg:h-20 border-t-2 border-r-2 border-violet-500/40 rounded-tr-2xl lg:rounded-tr-3xl"
                  />
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -bottom-4 -left-4 w-16 h-16 lg:w-20 lg:h-20 border-b-2 border-l-2 border-fuchsia-500/40 rounded-bl-2xl lg:rounded-bl-3xl"
                  />
                  <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="absolute -top-4 -left-4 w-16 h-16 lg:w-20 lg:h-20 border-t-2 border-l-2 border-blue-500/30 rounded-tl-2xl lg:rounded-tl-3xl"
                  />
                  <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                    className="absolute -bottom-4 -right-4 w-16 h-16 lg:w-20 lg:h-20 border-b-2 border-r-2 border-indigo-500/30 rounded-br-2xl lg:rounded-br-3xl"
                  />
                </>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-8 sm:w-6 sm:h-9 rounded-full border-2 border-white/20 flex justify-center backdrop-blur-sm bg-white/5">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-0.5 h-2 bg-gradient-to-b from-violet-400 to-fuchsia-400 rounded-full mt-1.5"
            />
          </div>
          <span className="text-[10px] text-gray-500 tracking-widest uppercase">Scroll</span>
        </div>
      </motion.div>
    </section>
  );
}

// Enhanced Feature Component
function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex items-center gap-2.5 sm:gap-3"
    >
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent backdrop-blur-xl flex items-center justify-center text-violet-400 hover:text-violet-300 transition-colors shadow-lg">
        {icon}
      </div>
      <span className="text-gray-300 text-[11px] sm:text-xs font-medium">{text}</span>
    </motion.div>
  );
}

// Enhanced Particle Field
function ParticleField() {
  const [particles, setParticles] = useState<Array<{ left: number; top: number; delay: number; duration: number; size: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 8 + 4,
      size: Math.random() * 3 + 1,
    }));
    setParticles(newParticles);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.8, 0], 
            y: -200,
            scale: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear",
          }}
          className="absolute rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, rgba(99,102,241,0.6), rgba(168,85,247,0.3))`,
            boxShadow: `0 0 ${particle.size * 2}px rgba(99,102,241,0.3)`,
          }}
        />
      ))}
    </div>
  );
}

// Floating Particles - New
function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{ left: number; top: number; delay: number; duration: number; size: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 15 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 4,
      duration: Math.random() * 10 + 6,
      size: Math.random() * 2 + 0.5,
    }));
    setParticles(newParticles);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, index) => (
        <motion.div
          key={index}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -40, 20, -10, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
          className="absolute rounded-full bg-gradient-to-r from-blue-400/20 to-violet-500/20"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size * 4,
            height: particle.size * 4,
            backdropFilter: 'blur(2px)',
          }}
        />
      ))}
    </div>
  );
}