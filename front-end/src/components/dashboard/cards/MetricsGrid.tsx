// src/components/dashboard/MetricsGrid.tsx
"use client";

import { useEffect, useMemo } from "react";
import { metrics as defaultMetrics } from "@/mock/dashboard";
import { MetricCard } from "./MetricCard";
import { useDashboard } from "@/context/DashboardContext";
import { useMonitoring } from "@/context/MonitoringContext";
import { useVideos } from "@/context/Video_context";

export function MetricsGrid() {
  const { state } = useDashboard();
  const { state: monitoringState, fetchResponseTime, fetchHealthScore } = useMonitoring();
  const { totalCount: totalVideosCount } = useVideos();


  useEffect(() => {
    fetchResponseTime();
    fetchHealthScore();
  }, []);
  const retrievalMetric = monitoringState.healthScore?.metrics?.find((m) => m.id === "retrieval");

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
      if (metric.id === "videos-uploaded" && typeof totalVideosCount === "number") {
        return {
          ...metric,
          value: totalVideosCount.toLocaleString("en-US"),
          rawValue: totalVideosCount,
        };
      }

      if (metric.id === "avg-response-time" && monitoringState.responseTimeMetrics) {
        const { avg_response_time_s, percentage_change, trend, chart_data } =
          monitoringState.responseTimeMetrics;
        return {
          ...metric,
          value: `${avg_response_time_s}s`,
          rawValue: avg_response_time_s,
          change: percentage_change,
          trend,
          spark:
            chart_data.length > 0
              ? chart_data.map((point) => ({ label: point.label, value: point.value }))
              : metric.spark,
        };
      }

      if (
        metric.id === "success-rate" &&
        retrievalMetric?.available &&
        retrievalMetric.value !== null
      ) {
        const retrievalValue: number = retrievalMetric.value;
        return {
          ...metric,
          label: "Retrieval Success",
          value: `${retrievalValue}%`,
          rawValue: retrievalValue,
          change: retrievalMetric.change ?? 0,
          trend: retrievalMetric.trend ?? "up",
        };
      }

      return metric;
    });
  }, [
    state.metricsData,
    state.questionsMetrics,
    totalVideosCount,
    monitoringState.responseTimeMetrics,
    retrievalMetric,
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-6">
      {displayMetrics.map((metric, i) => (
        <MetricCard key={metric.id} metric={metric} index={i} />
      ))}
    </div>
  );
}
