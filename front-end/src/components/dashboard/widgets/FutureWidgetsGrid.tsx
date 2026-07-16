"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card, SectionTitle, Badge } from "../shared";
import { futureWidgets } from "@/mock/dashboard";

export function FutureWidgetsGrid() {
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
      <SectionTitle
        title="Coming Soon"
        subtitle="Future integrations — LangSmith, evaluation & more"
        action={
          <Badge tone="purple">
            <Sparkles className="h-3 w-3" /> Roadmap
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {futureWidgets.map((w, i) => {
          const Icon = w.icon;
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={{ y: -2 }}
              className="group relative overflow-hidden rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] p-4 transition-colors hover:border-purple-500/30 hover:bg-white/[0.03]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-white/40 ring-1 ring-white/[0.06] transition-colors group-hover:text-purple-300">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-sm font-medium text-white/70">{w.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/35">{w.description}</p>
              <span className="absolute right-3 top-3 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/30">
                Soon
              </span>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
