"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#020617] border-t border-white/10 py-12 overflow-hidden">
      
      {/* Background Glow - Same as other sections */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/5 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center lg:text-left">
          
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white font-bold text-xl">
                VidIQ<span className="bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">AI</span>
              </h3>
            </div>
            <p className="text-gray-400 text-sm max-w-xs mx-auto lg:mx-0">
              Transform any YouTube video into an interactive chat experience with advanced AI and RAG architecture.
            </p>
          </motion.div>

          {/* Product Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-white font-semibold text-sm mb-4 flex items-center justify-center lg:justify-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
              Product
            </h4>
            <ul className="space-y-2">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#how-it-works">How It Works</FooterLink>
              <FooterLink href="#pricing">Pricing</FooterLink>
              <FooterLink href="#about">About</FooterLink>
            </ul>
          </motion.div>

          {/* Resources Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-white font-semibold text-sm mb-4 flex items-center justify-center lg:justify-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
              Resources
            </h4>
            <ul className="space-y-2">
              <FooterLink href="#">Documentation</FooterLink>
              <FooterLink href="#">API Reference</FooterLink>
              <FooterLink href="#">Support Center</FooterLink>
              <FooterLink href="#">Status</FooterLink>
            </ul>
          </motion.div>

          {/* Legal Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4 className="text-white font-semibold text-sm mb-4 flex items-center justify-center lg:justify-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500" />
              Legal
            </h4>
            <ul className="space-y-2">
              <FooterLink href="#">Privacy Policy</FooterLink>
              <FooterLink href="#">Terms of Service</FooterLink>
              <FooterLink href="#">Cookie Policy</FooterLink>
              <FooterLink href="#">GDPR</FooterLink>
            </ul>
          </motion.div>
        </div>

        {/* Divider with Gradient */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center">
          <p className="text-gray-500 text-xs">
            © {currentYear} VidIQAI. All rights reserved.
          </p>
          
          {/* Tech Stack Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <TechBadge text="Next.js 14" />
            <TechBadge text="LangGraph" />
            <TechBadge text="Pinecone" />
            <TechBadge text="Supabase" />
          </div>
          
          {/* Made with Love */}
          <p className="text-gray-600 text-xs flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500/50" /> by Murtaza Afzali
          </p>
        </div>
      </div>
    </footer>
  );
}

// Footer Link Component
function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-gray-500 hover:text-violet-400 text-sm transition-all duration-200 hover:translate-x-0.5 inline-block"
      >
        {children}
      </Link>
    </li>
  );
}

// Tech Badge Component
function TechBadge({ text }: { text: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-medium">
      {text}
    </span>
  );
}