"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface DonutDatum {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  centerLabel: string;
  centerValue: string;
  valuePrefix?: string;
}

function CustomTooltip({ active, payload, valuePrefix }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DonutDatum;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <p className="text-sm font-semibold text-white">{d.label}</p>
      <p className="text-xs text-white/50">
        {valuePrefix}
        {d.value.toLocaleString("en-US")} · {d.percentage}%
      </p>
    </div>
  );
}

export function DonutChart({ data, centerLabel, centerValue, valuePrefix = "" }: DonutChartProps) {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="70%"
              outerRadius="100%"
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
              animationDuration={1100}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip valuePrefix={valuePrefix} />} />
          </PieChart>
        </ResponsiveContainer>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="text-xl font-bold text-white">{centerValue}</span>
          <span className="text-[11px] text-white/40">{centerLabel}</span>
        </motion.div>
      </div>

      <div className="w-full space-y-2.5 sm:w-auto">
        {data.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            className="flex items-center justify-between gap-6 text-xs"
          >
            <span className="flex items-center gap-2 text-white/60">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span className="font-semibold text-white/90">{d.percentage}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
