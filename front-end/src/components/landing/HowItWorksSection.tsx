import { Link2, Cpu, MessageSquare } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Link2,
    title: "Paste a YouTube URL",
    desc: "Copy any YouTube video link and paste it into VideoGPT. We support any public video with captions.",
  },
  {
    num: "02",
    icon: Cpu,
    title: "AI processes the video",
    desc: "Our engine extracts the transcript, chunks it semantically, and stores vector embeddings for precise retrieval.",
  },
  {
    num: "03",
    icon: MessageSquare,
    title: "Start chatting",
    desc: "Ask anything — summaries, specific topics, timestamps, comparisons. Get accurate answers in seconds.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-[#08101F] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-600/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-600/20 to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-purple-400 uppercase tracking-widest mb-3 font-medium">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            From URL to insights in seconds
          </h2>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-purple-600/20 via-purple-600/40 to-purple-600/20" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-purple-600/20 blur-lg" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#0C1426] to-[#08101F]">
                    <step.icon className="size-7 text-purple-400" />
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold text-purple-300 bg-purple-600/20 border border-purple-500/30 rounded-full w-5 h-5 flex items-center justify-center">
                      {step.num.slice(-1)}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
