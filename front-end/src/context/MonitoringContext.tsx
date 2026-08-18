"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

// ---------------- Types ----------------

export type MonitoringTimeframe = "today" | "week" | "month" | "all";

export interface HealthMetric {
  id: string;
  label: string;
  value: number | null;
  change: number | null;
  trend: "up" | "down" | null;
  tone: "positive" | "negative" | "neutral";
  available: boolean;
}

export interface AIHealthScoreData {
  score: number;
  label: string;
  metrics: HealthMetric[];
}

export interface ResponseTimeChartPoint {
  label: string;
  value: number;
}

export interface ResponseTimeMetricsData {
  avg_response_time_s: number;
  percentage_change: number;
  trend: "up" | "down";
  chart_data: ResponseTimeChartPoint[];
}

// 🆕 داده‌ی کارت "System Status" — شکلش دقیقاً همان چیزی‌ست که
// GET /api/monitoring/system-status (SystemStatusResponse) برمی‌گرداند.
// عمداً هیچ آیکونی اینجا نیست — آیکون سمت فرانت، بر اساس `id`، از یک
// map محلی در SystemStatus.tsx می‌آید (کامپوننت React را نمی‌شود از
// بک‌اند serialize کرد).
export type ServiceStatus = "healthy" | "warning" | "offline";

export interface ServiceStatusItem {
  id: string;
  name: string;
  status: ServiceStatus;
  latency_ms: number | null;
  detail: string | null;
}

export interface SystemStatusData {
  services: ServiceStatusItem[];
  checked_at: string;
}

interface MonitoringState {
  healthScore: AIHealthScoreData | null;
  healthTimeframe: MonitoringTimeframe;
  isHealthLoading: boolean;
  healthError: string | null;

  responseTimeMetrics: ResponseTimeMetricsData | null;
  responseTimeTimeframe: MonitoringTimeframe;
  isResponseTimeLoading: boolean;
  responseTimeError: string | null;

  systemStatus: SystemStatusData | null;
  isSystemStatusLoading: boolean;
  systemStatusError: string | null;
}

type MonitoringAction =
  | { type: "FETCH_HEALTH_START"; payload: MonitoringTimeframe }
  | { type: "FETCH_HEALTH_SUCCESS"; payload: AIHealthScoreData }
  | { type: "FETCH_HEALTH_FAILURE"; payload: string }
  | { type: "FETCH_RESPONSE_TIME_START"; payload: MonitoringTimeframe }
  | { type: "FETCH_RESPONSE_TIME_SUCCESS"; payload: ResponseTimeMetricsData }
  | { type: "FETCH_RESPONSE_TIME_FAILURE"; payload: string }
  | { type: "FETCH_SYSTEM_STATUS_START" }
  | { type: "FETCH_SYSTEM_STATUS_SUCCESS"; payload: SystemStatusData }
  | { type: "FETCH_SYSTEM_STATUS_FAILURE"; payload: string };

// ---------------- Reducer ----------------

const initialState: MonitoringState = {
  healthScore: null,
  healthTimeframe: "week",
  isHealthLoading: false,
  healthError: null,

  responseTimeMetrics: null,
  responseTimeTimeframe: "week",
  isResponseTimeLoading: false,
  responseTimeError: null,

  systemStatus: null,
  isSystemStatusLoading: false,
  systemStatusError: null,
};

function monitoringReducer(state: MonitoringState, action: MonitoringAction): MonitoringState {
  switch (action.type) {
    case "FETCH_HEALTH_START":
      return { ...state, isHealthLoading: true, healthError: null, healthTimeframe: action.payload };
    case "FETCH_HEALTH_SUCCESS":
      return { ...state, isHealthLoading: false, healthScore: action.payload };
    case "FETCH_HEALTH_FAILURE":
      return { ...state, isHealthLoading: false, healthError: action.payload };

    case "FETCH_RESPONSE_TIME_START":
      return {
        ...state,
        isResponseTimeLoading: true,
        responseTimeError: null,
        responseTimeTimeframe: action.payload,
      };
    case "FETCH_RESPONSE_TIME_SUCCESS":
      return { ...state, isResponseTimeLoading: false, responseTimeMetrics: action.payload };
    case "FETCH_RESPONSE_TIME_FAILURE":
      return { ...state, isResponseTimeLoading: false, responseTimeError: action.payload };

    case "FETCH_SYSTEM_STATUS_START":
      return { ...state, isSystemStatusLoading: true, systemStatusError: null };
    case "FETCH_SYSTEM_STATUS_SUCCESS":
      return { ...state, isSystemStatusLoading: false, systemStatus: action.payload };
    case "FETCH_SYSTEM_STATUS_FAILURE":
      return { ...state, isSystemStatusLoading: false, systemStatusError: action.payload };

    default:
      return state;
  }
}

// ---------------- Context ----------------

const MonitoringContext = createContext<
  | {
      state: MonitoringState;
      fetchHealthScore: (timeframe?: MonitoringTimeframe) => Promise<void>;
      fetchResponseTime: (timeframe?: MonitoringTimeframe) => Promise<void>;
      fetchSystemStatus: () => Promise<void>;
    }
  | undefined
>(undefined);

// ---------------- Provider ----------------

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(monitoringReducer, initialState);
  const { getToken } = useAuth();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const healthTimeframeRef = useRef(state.healthTimeframe);
  useEffect(() => {
    healthTimeframeRef.current = state.healthTimeframe;
  }, [state.healthTimeframe]);

  const responseTimeTimeframeRef = useRef(state.responseTimeTimeframe);
  useEffect(() => {
    responseTimeTimeframeRef.current = state.responseTimeTimeframe;
  }, [state.responseTimeTimeframe]);

  const fetchHealthScore = useCallback(
    async (timeframe?: MonitoringTimeframe) => {
      const tf = timeframe ?? healthTimeframeRef.current;
      dispatch({ type: "FETCH_HEALTH_START", payload: tf });
      try {
        const token = await getToken();
        const res = await fetch(`${baseUrl}/api/monitoring/health-score?timeframe=${tf}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("مشکلی در دریافت امتیاز سلامت AI رخ داد.");

        const data: AIHealthScoreData = await res.json();
        dispatch({ type: "FETCH_HEALTH_SUCCESS", payload: data });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "خطای ناشناخته";
        dispatch({ type: "FETCH_HEALTH_FAILURE", payload: message });
      }
    },
    [baseUrl, getToken]
  );

  const fetchResponseTime = useCallback(
    async (timeframe?: MonitoringTimeframe) => {
      const tf = timeframe ?? responseTimeTimeframeRef.current;
      dispatch({ type: "FETCH_RESPONSE_TIME_START", payload: tf });
      try {
        const token = await getToken();
        const res = await fetch(`${baseUrl}/api/monitoring/response-time?timeframe=${tf}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("مشکلی در دریافت متریک زمان پاسخ رخ داد.");

        const data: ResponseTimeMetricsData = await res.json();
        dispatch({ type: "FETCH_RESPONSE_TIME_SUCCESS", payload: data });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "خطای ناشناخته";
        dispatch({ type: "FETCH_RESPONSE_TIME_FAILURE", payload: message });
      }
    },
    [baseUrl, getToken]
  );

  // 🆕 بدون timeframe — این داده global است (وضعیت زیرساخت)، نه per-user،
  // پس نیازی به ref/timeframe pattern بالا ندارد.
  const fetchSystemStatus = useCallback(async () => {
    dispatch({ type: "FETCH_SYSTEM_STATUS_START" });
    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}/api/monitoring/system-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("مشکلی در دریافت وضعیت سیستم رخ داد.");

      const data: SystemStatusData = await res.json();
      dispatch({ type: "FETCH_SYSTEM_STATUS_SUCCESS", payload: data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خطای ناشناخته";
      dispatch({ type: "FETCH_SYSTEM_STATUS_FAILURE", payload: message });
    }
  }, [baseUrl, getToken]);

  return (
    <MonitoringContext.Provider
      value={{ state, fetchHealthScore, fetchResponseTime, fetchSystemStatus }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

// ---------------- Hook ----------------

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error("useMonitoring must be used within a MonitoringProvider");
  }
  return context;
}
