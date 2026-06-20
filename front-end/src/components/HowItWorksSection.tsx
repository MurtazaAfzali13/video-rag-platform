"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { 
  Play, 
  Database, 
  Brain, 
  MessageCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Link2,
  Cpu,
  Bot,
  Zap,
  Clock,
  Shield,
  Star,
  
  ExternalLink,
  Code2,
  Layers,
  Rocket
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Paste YouTube URL",
    description: "Simply paste any YouTube video link. Our system automatically extracts the transcript with precise timestamps and prepares it for analysis.",
    icon: <Play className="w-7 h-7" />,
    gradient: "from-red-500 to-orange-500",
    bgGradient: "from-red-600/20 to-orange-600/20",
    glowColor: "rgba(239,68,68,0.3)",
    delay: 0,
    tag: "Step 1"
  },
  {
    number: "02",
    title: "AI Processing",
    description: "Content is intelligently chunked, embedded with OpenAI's latest models, and stored in Pinecone vector database with user isolation.",
    icon: <Database className="w-7 h-7" />,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-600/20 to-cyan-600/20",
    glowColor: "rgba(59,130,246,0.3)",
    delay: 0.1,
    tag: "Step 2"
  },
  {
    number: "03",
    title: "RAG Retrieval",
    description: "LangGraph routes your question, retrieves relevant chunks with semantic search, and generates accurate answers with full context.",
    icon: <Brain className="w-7 h-7" />,
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-600/20 to-pink-600/20",
    glowColor: "rgba(168,85,247,0.3)",
    delay: 0.2,
    tag: "Step 3"
  },
  {
    number: "04",
    title: "Chat & Explore",
    description: "Get instant answers with timestamps, jump to exact moments, and continue the conversation naturally like an expert.",
    icon: <MessageCircle className="w-7 h-7" />,
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-600/20 to-emerald-600/20",
    glowColor: "rgba(34,197,94,0.3)",
    delay: 0.3,
    tag: "Step 4"
  }
];

export default function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
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
      id="how-it-works" 
      className="relative py-24 lg:py-32 overflow-hidden bg-[#020617]"
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#312e81_0%,transparent_60%)] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
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

      {/* Enhanced Animated Glow Orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-40 left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[120px]"
      />
      
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, -40, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-40 right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px]"
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2],
          x: [0, 50, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/10 rounded-full blur-[150px]"
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
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-fuchsia-600/10 border border-white/10 backdrop-blur-xl mb-6 group cursor-pointer hover:border-violet-400/30 transition-all duration-300"
          >
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              ✨ Simple Process, Powerful Results
            </span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-fuchsia-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
            How It{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                Works
              </span>
              <motion.span
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-2 -right-8"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
              </motion.span>
            </span>
          </h2>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto">
            Four simple steps to unlock the power of any YouTube video with cutting-edge AI technology
          </p>

          {/* Step Counter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: true }}
            className="flex justify-center gap-2 mt-6"
          >
            {steps.map((_, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.2 }}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  activeStep === index ? 'bg-violet-400' : 'bg-white/20'
                }`}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Enhanced Steps with Connecting Line */}
        <div className="relative">
          {/* Desktop Connecting Line - Animated */}
          <motion.div 
            className="absolute top-1/2 left-0 right-0 h-[2px] transform -translate-y-1/2 hidden lg:block rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 relative">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: step.delay, ease: "easeOut" }}
                viewport={{ once: true, margin: "-50px" }}
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
                whileHover={{ y: -12 }}
                className="relative"
              >
                {/* Step Card - Enhanced */}
                <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-sm p-8 transition-all duration-500 hover:border-transparent overflow-hidden group">
                  
                  {/* Hover Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Glow Effect on Hover */}
                  <div 
                    className="absolute -inset-0.5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"
                    style={{ 
                      background: `radial-gradient(circle at 50% 0%, ${step.glowColor}, transparent 70%)` 
                    }}
                  />

                  {/* Step Number Badge - Enhanced */}
                  <div className="absolute top-4 right-4">
                    <motion.div 
                      className={`text-5xl font-black bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent opacity-20`}
                      animate={{
                        scale: activeStep === index ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {step.number}
                    </motion.div>
                  </div>

                  {/* Tag */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: step.delay + 0.3 }}
                    viewport={{ once: true }}
                    className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-medium text-gray-400 tracking-wider"
                  >
                    {step.tag}
                  </motion.div>
                  
                  {/* Icon Container with Enhanced Animation */}
                  <motion.div
                    animate={{
                      scale: activeStep === index ? [1, 1.15, 1] : 1,
                      rotate: activeStep === index ? [0, 8, -8, 0] : 0,
                    }}
                    transition={{ duration: 0.5 }}
                    className={`relative w-16 h-16 rounded-2xl bg-gradient-to-r ${step.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300`}
                  >
                    <div className="text-white relative z-10">
                      {step.icon}
                    </div>
                    
                    {/* Icon Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${step.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                    
                    {/* Pulsing Ring */}
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.1, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-2xl border-2 border-white/20"
                    />
                  </motion.div>
                  
                  {/* Title - Enhanced */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all duration-300"
                      style={{
                        backgroundImage: activeStep === index ? `linear-gradient(to right, ${step.gradient.split(' ')[1]}, ${step.gradient.split(' ')[3]})` : 'none',
                        WebkitBackgroundClip: activeStep === index ? 'text' : 'unset',
                      }}>
                    {step.title}
                  </h3>
                  
                  {/* Description - Enhanced */}
                  <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                    {step.description}
                  </p>
                  
                  {/* Arrow Indicator on Hover */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ 
                      opacity: activeStep === index ? 1 : 0,
                      x: activeStep === index ? 0 : -10,
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-4 right-4"
                  >
                    <ArrowRight className={`w-4 h-4 text-transparent bg-gradient-to-r ${step.gradient} bg-clip-text`} />
                  </motion.div>

                  {/* Progress Bar on Hover */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ 
                      width: activeStep === index ? '100%' : 0,
                    }}
                    transition={{ duration: 0.5 }}
                    className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${step.gradient}`}
                  />
                </div>
                
                {/* Connecting Arrow for Desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-20">
                    <motion.div 
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-center border border-white/10 shadow-lg"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Enhanced Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard number="10K+" label="Videos Processed" gradient="from-red-500 to-orange-500" icon={<Play className="w-4 h-4" />} />
          <StatCard number="99.9%" label="Accuracy Rate" gradient="from-blue-500 to-cyan-500" icon={<CheckCircle2 className="w-4 h-4" />} />
          <StatCard number="1.2s" label="Avg Response" gradient="from-purple-500 to-pink-500" icon={<Zap className="w-4 h-4" />} />
          <StatCard number="24/7" label="AI Support" gradient="from-green-500 to-emerald-500" icon={<Clock className="w-4 h-4" />} />
        </motion.div>

        {/* Enhanced Tech Stack Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <span className="text-xs text-gray-500 mr-2 font-medium">🚀 Powered by:</span>
            <TechBadge icon={<Bot className="w-3.5 h-3.5" />} text="LangGraph" color="violet" />
            <TechBadge icon={<Cpu className="w-3.5 h-3.5" />} text="Pinecone" color="blue" />
            <TechBadge icon={<Database className="w-3.5 h-3.5" />} text="Supabase" color="fuchsia" />
            <TechBadge icon={<Brain className="w-3.5 h-3.5" />} text="OpenAI" color="emerald" />
            <TechBadge icon={<Layers className="w-3.5 h-3.5" />} text="RAG" color="purple" />
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm hover:border-violet-500/30 transition-all duration-300 group cursor-pointer">
            <span className="text-sm text-gray-300">Ready to transform your video experience?</span>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-sm font-medium bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent group-hover:from-violet-300 group-hover:to-fuchsia-300 transition-all flex items-center gap-1">
              Get Started Free 
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// Enhanced Stat Card Component
function StatCard({ number, label, gradient, icon }: { number: string; label: string; gradient: string; icon: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.3 }}
      className="relative text-center p-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-sm group cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300"
           style={{ background: `linear-gradient(to bottom right, ${gradient.split(' ')[1]}10, ${gradient.split(' ')[3]}10)` }} />
      
      <div className="relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className={`text-transparent bg-gradient-to-r ${gradient} bg-clip-text`}>
            {icon}
          </div>
          <div className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {number}
          </div>
        </div>
        <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{label}</div>
      </div>
    </motion.div>
  );
}

// Enhanced Tech Badge Component
function TechBadge({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  const colors = {
    violet: "bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30",
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30",
    fuchsia: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 hover:bg-fuchsia-500/30",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${colors[color as keyof typeof colors]} text-xs font-medium transition-all duration-300 cursor-default`}
    >
      {icon}
      <span>{text}</span>
    </motion.div>
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
          className="absolute rounded-full bg-gradient-to-r from-purple-400/20 to-pink-500/20"
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