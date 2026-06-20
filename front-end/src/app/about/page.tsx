"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import {
  User,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  CheckCircle,
  Sparkles,
  Code2,
  Brain,
  Database,
  Globe
} from "lucide-react";
import Image from "next/image";

export default function AboutSection() {
  const ref = useRef(null);

  return (
    <section id="about" className="relative py-20 overflow-hidden bg-[#020617]">
      {/* Background Effects - Same as Hero */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#312e81_0%,transparent_28%),radial-gradient(circle_at_top_right,#1d4ed8_0%,transparent_25%),radial-gradient(circle_at_bottom,#7c3aed_0%,transparent_25%)] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#020617] to-black" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.05]">
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
      </div>

      {/* Glow Effects */}
      <div className="absolute top-[-100px] left-[-50px] w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[500px] bg-purple-700/20 blur-[120px] rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-gray-300">About The Creator</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Meet{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent">
              Murtaza Afzali
            </span>
          </h2>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            AI Engineer & Full-Stack Developer passionate about building intelligent systems
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10">

          {/* Left Side - Personal Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Profile Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-500">
                  <Image
                    src="/images/murtaza.jpg"
                    alt="Murtaza Afzali"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Murtaza Afzali</h3>
                  <p className="text-violet-400 text-sm">
                    AI Engineer & Full-Stack Developer
                  </p>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed mb-6">
                Passionate Full-Stack Developer and AI-focused Engineer with over 2 years of experience
                building modern, scalable, and intelligent web applications. Specialized in RAG architecture
                and LLM applications that transform static content into dynamic, conversational experiences.
              </p>

              {/* Contact Info */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-gray-300">
                  <MapPin className="w-4 h-4 text-violet-400" />
                  <span className="text-sm">Herat, Afghanistan</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Mail className="w-4 h-4 text-violet-400" />
                  <span className="text-sm">murtazaafzali13@gmail.com</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone className="w-4 h-4 text-violet-400" />
                  <span className="text-sm">+93 783 000 247</span>
                </div>
              </div>
            </div>

            {/* Experience Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text">2+</div>
                <div className="text-xs text-gray-400">Years Experience</div>
              </div>
              <div className="text-center p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text">15+</div>
                <div className="text-xs text-gray-400">Projects Done</div>
              </div>
              <div className="text-center p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text">100%</div>
                <div className="text-xs text-gray-400">Satisfaction</div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Skills & Project */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Tech Stack */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-violet-400" />
                Tech Stack & Expertise
              </h3>

              <div className="flex flex-wrap gap-2 mb-6">
                <SkillBadge text="Next.js" color="violet" />
                <SkillBadge text="TypeScript" color="blue" />
                <SkillBadge text="FastAPI" color="fuchsia" />
                <SkillBadge text="LangChain" color="violet" />
                <SkillBadge text="LangGraph" color="blue" />
                <SkillBadge text="Pinecone" color="fuchsia" />
                <SkillBadge text="OpenAI" color="violet" />
                <SkillBadge text="Tailwind" color="blue" />
                <SkillBadge text="Supabase" color="fuchsia" />
              </div>

              <div className="space-y-2">
                <SkillRow icon={<Brain className="w-4 h-4" />} text="RAG Architecture Design" />
                <SkillRow icon={<Database className="w-4 h-4" />} text="Vector Databases (Pinecone)" />
                <SkillRow icon={<Globe className="w-4 h-4" />} text="Full-Stack Development" />
              </div>
            </div>

            {/* Project Highlight */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 backdrop-blur-sm p-6">
              <h3 className="text-lg font-bold text-white mb-3">🎓 Flagship Project</h3>
              <p className="text-violet-300 text-sm font-medium mb-2">
                Intelligent Video Content Analysis & Q&A System
              </p>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                A RAG-based system that transforms YouTube videos into interactive Q&A experiences.
                Users can ask natural language questions and get accurate answers with exact timestamps.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">RAG</span>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">LLM</span>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">Semantic Search</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Philosophy & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-12 text-center p-8 rounded-2xl border border-white/10 bg-white/[0.03]"
        >
          <p className="text-gray-300 italic mb-4">
            "Building technology that fundamentally transforms how people interact with information.
            Creating systems that are intelligent, useful, and strictly human-centered."
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 text-white font-semibold">
            <Sparkles className="w-4 h-4" />
            Let's Build Something Impactful Together
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Helper Components
function SkillBadge({ text, color }: { text: string; color: string }) {
  const colors = {
    violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    fuchsia: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[color as keyof typeof colors]}`}>
      {text}
    </span>
  );
}

function SkillRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-gray-300 text-sm">
      <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-violet-400">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}