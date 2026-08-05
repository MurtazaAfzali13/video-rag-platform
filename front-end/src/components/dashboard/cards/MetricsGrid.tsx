"use client";

import { useEffect, useMemo } from "react";
import { metrics as defaultMetrics } from "@/mock/dashboard";
import { MetricCard } from "./MetricCard";
import { useDashboard } from "@/context/DashboardContext";

interface MetricsGridProps {
  userId: string;
}

export function MetricsGrid({ userId }: MetricsGridProps) {
  const { state, fetchMetrics } = useDashboard();

  // فراخوانی API در زمان بارگذاری کامپوننت
  useEffect(() => {
    if (userId) {
      fetchMetrics(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ترکیب داده‌های ثابت (mock) با داده‌های واقعی دیتابیس
  const displayMetrics = useMemo(() => {
    return defaultMetrics.map((metric) => {
      // پیدا کردن کارت Web Searches و جایگزینی مقدار آن با دیتای بک‌اند
      if (metric.id === "web-searches" && state.metricsData?.web_searches !== undefined) {
        return {
          ...metric,
          value: state.metricsData.web_searches.toString(),
          rawValue: state.metricsData.web_searches,
        };
      }
      
      // بقیه کارت‌ها فعلاً همان مقادیر mock را نشان می‌دهند
      return metric;
    });
  }, [state.metricsData]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
      {displayMetrics.map((metric, i) => (
        <MetricCard key={metric.id} metric={metric} index={i} />
      ))}
    </div>
  );
}