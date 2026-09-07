"use client";

import { motion } from "framer-motion";
import { Card, SectionTitle } from "../shared";
import { useMonitoring } from "@/context/MonitoringContext";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AIHealthGauge() {
  const { state } = useMonitoring();
  const { healthScore, isHealthLoading, healthError } = state;

  const score = healthScore?.score ?? 0;
  const label = healthScore?.label ?? "—";
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <Card
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="flex h-full flex-col"
    >
      <div className="p-5 pb-0">
        <SectionTitle title="AI Health Score" subtitle="Overall CRAG pipeline reliability" />
      </div>

      {isHealthLoading && !healthScore ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-emerald-500" />
        </div>
      ) : healthError && !healthScore ? (
        <div className="flex flex-1 items-center justify-center p-5 text-center text-sm text-red-400">
          خطا در بارگذاری امتیاز سلامت: {healthError}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-4">
          <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <motion.circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="url(#dashboardHealthGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="dashboardHealthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            >
              <span className="text-3xl font-bold tracking-tight text-white">{score}%</span>
              <span className="mt-1 text-[12px] font-medium text-emerald-400">{label}</span>
            </motion.div>
          </div>
        </div>
      )}
    </Card>
  );
}
