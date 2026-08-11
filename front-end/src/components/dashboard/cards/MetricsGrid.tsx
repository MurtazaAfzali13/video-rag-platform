"use client";

import { useMemo } from "react";
import { metrics as defaultMetrics } from "@/mock/dashboard";
import { MetricCard } from "./MetricCard";
import { useDashboard } from "@/context/DashboardContext";

export function MetricsGrid() {
  const { state } = useDashboard();

  const displayMetrics = useMemo(() => {
    return defaultMetrics.map((metric) => {
      if (metric.id === "web-searches" && state.metricsData?.web_searches !== undefined) {
        return {
          ...metric,
          value: state.metricsData.web_searches.toString(),
          rawValue: state.metricsData.web_searches,
        };
      }

      if (metric.id === "questions-today" && state.questionsMetrics) {
        const { total_today, percentage_change, trend, chart_data } = state.questionsMetrics;
        return {
          ...metric,
          value: total_today.toLocaleString("en-US"),
          rawValue: total_today,
          change: percentage_change,
          trend,
          spark:
            chart_data.length > 0
              ? chart_data.map((point) => ({ label: point.label, value: point.value }))
              : metric.spark,
        };
      }

      if (metric.id === "videos-uploaded" && state.videoMetrics) {
        const { total, percentage_change, trend, chart_data } = state.videoMetrics;
        return {
          ...metric,
          value: total.toLocaleString("en-US"),
          rawValue: total,
          change: percentage_change,
          trend,
          spark:
            chart_data.length > 0
              ? chart_data.map((point) => ({ label: point.label, value: point.value }))
              : metric.spark,
        };
      }

      return metric;
    });
  }, [state.metricsData, state.questionsMetrics, state.videoMetrics]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
      {displayMetrics.map((metric, i) => (
        <MetricCard key={metric.id} metric={metric} index={i} />
      ))}
    </div>
  );
}
