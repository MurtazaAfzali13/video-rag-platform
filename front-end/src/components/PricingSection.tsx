"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Sparkles, CheckCircle2, Zap, Crown, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out",
    features: [
      "3 video analyses per month",
      "Basic Q&A with timestamps",
      "5 messages per video",
      "Community support"
    ],
    button: "Get Started",
    popular: false,
    gradient: "from-gray-500 to-gray-600",
    bgGradient: "from-gray-600/10 to-gray-700/10",
    icon: <Zap className="w-5 h-5" />
  },
  {
    name: "Pro",
    price: "$19",
    period: "month",
    description: "For creators & researchers",
    features: [
      "Unlimited video analyses",
      "Advanced RAG + web search",
      "Unlimited messages",
      "Priority support",
      "Export chat history"
    ],
    button: "Start Free Trial",
    popular: true,
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    bgGradient: "from-indigo-600/20 via-purple-600/20 to-pink-600/20",
    icon: <Crown className="w-5 h-5" />
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For organizations",
    features: [
      "Everything in Pro",
      "Custom AI models",
      "SLA guarantee",
      "24/7 dedicated support",
      "API access"
    ],
    button: "Contact Sales",
    popular: false,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-600/20 to-cyan-600/20",
    icon: <Sparkles className="w-5 h-5" />
  }
];

export default function PricingSection() {
  const ref = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="pricing" className="relative py-24 overflow-hidden bg-[#020617]">
      
      {/* Background Effects - Same as other sections */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,#312e81_0%,transparent_40%),radial-gradient(circle_at_top_right,#1d4ed8_0%,transparent_35%),radial-gradient(circle_at_center,#7c3aed_0%,transparent_50%)] opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Animated Glow Orbs */}
      <motion.div
        animate={{
          x: [0, 60, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-40 right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[120px]"
      />
      
      <motion.div
        animate={{
          x: [0, -50, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-40 left-20 w-72 h-72 bg-blue-600/20 rounded-full blur-[100px]"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300 font-medium">Pricing Plans</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
          >
            Choose the
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              Perfect Plan
            </span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-gray-400 text-lg max-w-2xl mx-auto"
          >
            Start free and scale as you grow. No hidden fees.
          </motion.p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              whileHover={{ y: -10 }}
              className="relative group"
            >
              {/* Glow Effect on Hover */}
              {plan.popular && (
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${plan.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
              )}
              
              {/* Card */}
              <div className={`relative h-full rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm overflow-hidden ${
                plan.popular
                  ? "border-2 border-transparent bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-pink-600/10"
                  : "border border-white/10 bg-white/[0.03]"
              }`}
              style={{
                backgroundImage: plan.popular ? `linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15), rgba(236,72,153,0.15))` : 'none'
              }}>
                
                {/* Hover Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xs px-4 py-1.5 rounded-full font-semibold shadow-lg flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                {/* Card Header */}
                <div className="text-center mb-6 relative z-10">
                  {/* Icon */}
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-r ${plan.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">
                      {plan.icon}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 text-sm">/{plan.period}</span>
                  </div>
                  
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>
                
                {/* Features List */}
                <div className="space-y-3 mb-8 relative z-10">
                  {plan.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 text-gray-300 text-sm group-hover:text-gray-200 transition-colors"
                    >
                      <CheckCircle2 className={`w-4 h-4 text-transparent bg-gradient-to-r ${plan.gradient} bg-clip-text`} />
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>
                
                {/* Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden group/btn ${
                    plan.popular
                      ? "text-white"
                      : "text-white border border-white/20 hover:bg-white/10"
                  }`}
                >
                  {plan.popular && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${plan.gradient} opacity-100 group-hover/btn:opacity-90 transition-opacity`} />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {plan.button}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 text-sm">
            All plans include a 14-day free trial. No credit card required for the Pro plan.
          </p>
        </motion.div>
      </div>
    </section>
  );
}