"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { 
  Sparkles, 
  Zap, 
  Shield, 
  MessageSquare, 
  Clock, 
  Search,
  ArrowRight,
  Bot,
  Database,
  Cpu,
  Layers,
  Lock,
  Gauge,
  CheckCircle2
} from "lucide-react";

const features = [
  {
    title: "AI-Powered Q&A",
    description: "Ask anything about any YouTube video and get instant, accurate answers powered by advanced RAG architecture.",
    icon: Bot,
    gradient: "from-violet-500 to-fuchsia-500",
    glowColor: "rgba(139,92,246,0.3)",
    stats: "99.9% Accuracy",
    tag: "RAG 2.0"
  },
  {
    title: "Smart Timestamps",
    description: "Every answer includes exact timestamps with context. Click to jump instantly to that precise moment in the video.",
    icon: Clock,
    gradient: "from-blue-500 to-violet-500",
    glowColor: "rgba(59,130,246,0.3)",
    stats: "100% Precise",
    tag: "Real-time"
  },
  {
    title: "Natural Chat",
    description: "Chat naturally like talking to an expert who has deeply analyzed the entire video content.",
    icon: MessageSquare,
    gradient: "from-fuchsia-500 to-purple-500",
    glowColor: "rgba(217,70,239,0.3)",
    stats: "Human-like",
    tag: "AI Native"
  },
  {
    title: "Smart Routing",
    description: "Intelligent switching between video Q&A and web search when the answer requires external knowledge.",
    icon: Search,
    gradient: "from-violet-500 to-blue-500",
    glowColor: "rgba(99,102,241,0.3)",
    stats: "Hybrid AI",
    tag: "Multi-source"
  },
  {
    title: "Your Data is Safe",
    description: "Complete privacy with user-isolated vector databases. Your data never leaves your secure environment.",
    icon: Lock,
    gradient: "from-blue-500 to-fuchsia-500",
    glowColor: "rgba(59,130,246,0.3)",
    stats: "Encrypted",
    tag: "Privacy First"
  },
  {
    title: "Blazing Fast",
    description: "Real-time streaming responses with zero lag. Get answers as they're being generated.",
    icon: Gauge,
    gradient: "from-fuchsia-500 to-violet-500",
    glowColor: "rgba(217,70,239,0.3)",
    stats: "< 100ms",
    tag: "Edge Ready"
  }
];

const featureHighlights = [
  { icon: Database, text: "Vector Database", color: "text-violet-400" },
  { icon: Cpu, text: "AI Processing", color: "text-blue-400" },
  { icon: Layers, text: "RAG Architecture", color: "text-fuchsia-400" },
];

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.6, 1, 1, 0.6]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [0.95, 1]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section 
      ref={ref} 
      id="features" 
      className="relative py-24 lg:py-32 overflow-hidden bg-[#020617]"
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#312e81_0%,transparent_35%),radial-gradient(circle_at_top_right,#1d4ed8_0%,transparent_30%),radial-gradient(circle_at_bottom_center,#7c3aed_0%,transparent_35%)] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#020617] to-black" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.06]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "70px 70px",
          }}
        />
        <motion.div
          animate={{
            backgroundPosition: ["0px 0px", "70px 70px"],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(99,102,241,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "140px 140px",
          }}
        />
      </div>

      {/* Enhanced Glow Orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-150px] right-[-80px] w-[500px] h-[500px] bg-blue-600/20 blur-[140px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-150px] left-[-80px] w-[450px] h-[450px] bg-purple-700/20 blur-[140px] rounded-full"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2],
          x: [0, 50, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-fuchsia-600/15 blur-[120px] rounded-full"
      />

      {/* Floating Particles */}
      {mounted && <FloatingParticles />}

      <motion.div 
        style={{ opacity, scale }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-fuchsia-600/10 border border-white/10 backdrop-blur-xl mb-6 group cursor-pointer hover:border-violet-400/30 transition-all duration-300">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              ✨ Next-Gen Features
            </span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-fuchsia-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
            Everything You Need to{" "}
            <br className="hidden sm:block" />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent animate-gradient">
                Master Video Content
              </span>
              <motion.span
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-2 -right-6"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </motion.span>
            </span>
          </h2>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto">
            Built with cutting-edge AI technology powered by advanced RAG architecture
          </p>

          {/* Tech Stack Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            {featureHighlights.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm"
              >
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs text-gray-400">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Enhanced Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{ 
                y: -12, 
                scale: 1.03,
                transition: { duration: 0.3 }
              }}
              className="group relative rounded-2xl p-8 border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-sm transition-all duration-500 hover:border-violet-500/40 cursor-pointer overflow-hidden"
            >
              {/* Animated Background Gradient */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} 
              />
              
              {/* Glow Effect on Hover */}
              <div 
                className="absolute -inset-0.5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"
                style={{ 
                  background: `radial-gradient(circle at 50% 0%, ${feature.glowColor}, transparent 70%)` 
                }}
              />

              {/* Tag */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                viewport={{ once: true }}
                className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-medium text-gray-400 tracking-wider"
              >
                {feature.tag}
              </motion.div>

              {/* Icon Container */}
              <motion.div 
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300 relative`}
                whileHover={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <feature.icon className="w-7 h-7 text-white" />
                <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-fuchsia-400 transition-all duration-300">
                {feature.title}
              </h3>
              
              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                {feature.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-500">{feature.stats}</span>
                <div className="flex-1" />
                <motion.span
                  whileHover={{ x: 5 }}
                  className="text-xs text-violet-400 font-medium flex items-center gap-1 group-hover:text-violet-300 transition-colors"
                >
                  Learn More <ArrowRight className="w-3 h-3" />
                </motion.span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm hover:border-violet-500/30 transition-all duration-300 group cursor-pointer">
            <span className="text-sm text-gray-300">Ready to transform your video experience?</span>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-sm font-medium bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent group-hover:from-violet-300 group-hover:to-fuchsia-300 transition-all">
              Get Started Free →
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// Floating Particles Component
function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{ left: number; top: number; delay: number; duration: number; size: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 5,
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
            x: [0, 40, -30, 20, 0],
            y: [0, -50, 30, -20, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
          className="absolute rounded-full bg-gradient-to-r from-violet-400/20 to-fuchsia-500/20"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size * 5,
            height: particle.size * 5,
            backdropFilter: 'blur(3px)',
          }}
        />
      ))}
    </div>
  );
}