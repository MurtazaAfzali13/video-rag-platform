"use client";

import { metrics } from "@/mock/dashboard";
import { MetricCard } from "./MetricCard";

export function MetricsGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
      {metrics.map((metric, i) => (
        <MetricCard key={metric.id} metric={metric} index={i} />
      ))}
    </div>
  );
}
