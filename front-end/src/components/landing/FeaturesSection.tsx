import { Clock, MessageSquare, Zap, Search, Globe, Shield } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Conversational AI",
    desc: "Ask natural language questions and receive detailed answers drawn directly from the video content.",
    color: "from-purple-600 to-purple-800",
  },
  {
    icon: Clock,
    title: "Timestamped Answers",
    desc: "Every response includes clickable timestamps so you can jump directly to the relevant part of the video.",
    color: "from-blue-600 to-blue-800",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    desc: "Videos are transcribed, chunked, and vectorized in seconds for lightning-fast retrieval.",
    color: "from-amber-600 to-orange-800",
  },
  {
    icon: Search,
    title: "Multi-Video Search",
    desc: "Search across all your processed videos at once to find insights from your entire library.",
    color: "from-emerald-600 to-emerald-800",
  },
  {
    icon: Globe,
    title: "Any Language",
    desc: "Supports YouTube auto-generated captions in dozens of languages. Ask in any language you prefer.",
    color: "from-pink-600 to-rose-800",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    desc: "Your video data is isolated per user with Pinecone namespacing. Your library is yours alone.",
    color: "from-indigo-600 to-indigo-800",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-[#050816] relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/4 blur-[120px] pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-purple-400 uppercase tracking-widest mb-3 font-medium">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Everything you need to understand any video
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">
            Powered by vector embeddings, RAG architecture, and the latest language models.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-5 rounded-2xl border border-slate-800/50 bg-[#08101F] hover:border-purple-500/30 hover:bg-[#0A1220] transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} shadow-lg mb-4`}
              >
                <f.icon className="size-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
