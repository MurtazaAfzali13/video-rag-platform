import Link from "next/link";
import { Check, Crown, Zap } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Zap,
    desc: "Perfect to get started",
    features: [
      "10 videos per month",
      "500 questions total",
      "Timestamped answers",
      "Multi-video search",
      "Standard support",
    ],
    cta: "Get started free",
    href: "/chatbot",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    icon: Crown,
    desc: "For power users & researchers",
    features: [
      "Unlimited videos",
      "Unlimited questions",
      "Priority processing",
      "Export transcripts",
      "Advanced summaries",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    href: "/chatbot",
    highlight: true,
  },
];

export default function PricingSection() {
  return (
    <section className="py-24 px-4 bg-[#050816] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-purple-400 uppercase tracking-widest mb-3 font-medium">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-slate-400">
            Start for free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-3xl border transition-all duration-300 ${
                plan.highlight
                  ? "border-purple-500/50 bg-gradient-to-b from-purple-600/10 to-[#08101F] shadow-2xl shadow-purple-500/15"
                  : "border-slate-800/50 bg-[#08101F]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-semibold shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                    plan.highlight
                      ? "bg-gradient-to-br from-purple-600 to-purple-800"
                      : "bg-slate-800"
                  }`}
                >
                  <plan.icon className={`size-5 ${plan.highlight ? "text-white" : "text-slate-400"}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.desc}</p>
                </div>
              </div>

              <div className="mb-5">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-500 text-sm ml-1">/{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="size-3.5 text-purple-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  plan.highlight
                    ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 shadow-lg shadow-purple-500/20"
                    : "border border-slate-700/50 text-slate-300 hover:border-purple-500/40 hover:text-white hover:bg-purple-600/5"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
