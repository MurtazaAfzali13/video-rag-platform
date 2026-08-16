"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

// ---------------- Types ----------------

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export type WorkflowTimeframe = "today" | "week" | "month" | "all";
export type QuestionsTimeframe = "today" | "week" | "month" | "all";

export interface DashboardMetrics {
  web_searches: number;
}

export interface QuestionsChartPoint {
  label: string;
  value: number;
}

export interface QuestionsMetricsData {
  total_today: number;
  percentage_change: number;
  trend: "up" | "down";
  chart_data: QuestionsChartPoint[];
}

// 🆕 داده‌ی کارت "Videos Uploaded" — همان شکل QuestionsMetricsData را دنبال می‌کند
// چون MetricsGrid همان الگوی { value, change, trend, chart_data } را انتظار دارد.
export interface VideoChartPoint {
  label: string;
  value: number;
}

export interface VideoMetricsData {
  total: number;
  percentage_change: number;
  trend: "up" | "down";
  chart_data: VideoChartPoint[];
}

interface DashboardState {
  workflowDistribution: DonutDatum[];
  workflowTimeframe: WorkflowTimeframe;
  questionsTimeframe: QuestionsTimeframe;
  metricsData: DashboardMetrics | null;
  questionsMetrics: QuestionsMetricsData | null;
  videoMetrics: VideoMetricsData | null;
  isLoading: boolean;
  error: string | null;
  isMetricsLoading: boolean;
  metricsError: string | null;
  isQuestionsLoading: boolean;
  questionsError: string | null;
  isVideoMetricsLoading: boolean;
  videoMetricsError: string | null;
}

type DashboardAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: DonutDatum[] }
  | { type: "FETCH_FAILURE"; payload: string }
  | { type: "SET_WORKFLOW_TIMEFRAME"; payload: WorkflowTimeframe }
  | { type: "SET_QUESTIONS_TIMEFRAME"; payload: QuestionsTimeframe }
  | { type: "FETCH_METRICS_START" }
  | { type: "FETCH_METRICS_SUCCESS"; payload: DashboardMetrics }
  | { type: "FETCH_METRICS_FAILURE"; payload: string }
  | { type: "FETCH_QUESTIONS_START" }
  | { type: "FETCH_QUESTIONS_SUCCESS"; payload: QuestionsMetricsData }
  | { type: "FETCH_QUESTIONS_FAILURE"; payload: string }
  | { type: "FETCH_VIDEO_METRICS_START" }
  | { type: "FETCH_VIDEO_METRICS_SUCCESS"; payload: VideoMetricsData }
  | { type: "FETCH_VIDEO_METRICS_FAILURE"; payload: string };

// ---------------- Reducer ----------------

const initialState: DashboardState = {
  workflowDistribution: [],
  workflowTimeframe: "all",
  questionsTimeframe: "week",
  metricsData: null,
  questionsMetrics: null,
  videoMetrics: null,
  isLoading: false,
  error: null,
  isMetricsLoading: false,
  metricsError: null,
  isQuestionsLoading: false,
  questionsError: null,
  isVideoMetricsLoading: false,
  videoMetricsError: null,
};

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, isLoading: false, workflowDistribution: action.payload };
    case "FETCH_FAILURE":
      return { ...state, isLoading: false, error: action.payload };
    case "SET_WORKFLOW_TIMEFRAME":
      return { ...state, workflowTimeframe: action.payload };
    case "SET_QUESTIONS_TIMEFRAME":
      return { ...state, questionsTimeframe: action.payload };

    case "FETCH_METRICS_START":
      return { ...state, isMetricsLoading: true, metricsError: null };
    case "FETCH_METRICS_SUCCESS":
      return { ...state, isMetricsLoading: false, metricsData: action.payload };
    case "FETCH_METRICS_FAILURE":
      return { ...state, isMetricsLoading: false, metricsError: action.payload };

    case "FETCH_QUESTIONS_START":
      return { ...state, isQuestionsLoading: true, questionsError: null };
    case "FETCH_QUESTIONS_SUCCESS":
      return { ...state, isQuestionsLoading: false, questionsMetrics: action.payload };
    case "FETCH_QUESTIONS_FAILURE":
      return { ...state, isQuestionsLoading: false, questionsError: action.payload };

    case "FETCH_VIDEO_METRICS_START":
      return { ...state, isVideoMetricsLoading: true, videoMetricsError: null };
    case "FETCH_VIDEO_METRICS_SUCCESS":
      return { ...state, isVideoMetricsLoading: false, videoMetrics: action.payload };
    case "FETCH_VIDEO_METRICS_FAILURE":
      return { ...state, isVideoMetricsLoading: false, videoMetricsError: action.payload };

    default:
      return state;
  }
};

// ---------------- Context ----------------

const DashboardContext = createContext<{
  state: DashboardState;
  fetchWorkflowDistribution: (timeframe?: WorkflowTimeframe) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchQuestionsMetrics: (timeframe?: QuestionsTimeframe) => Promise<void>;
  fetchVideoMetrics: () => Promise<void>;
} | undefined>(undefined);

// ---------------- Provider ----------------

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { getToken } = useAuth();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  
  const workflowTimeframeRef = useRef(state.workflowTimeframe);
  const questionsTimeframeRef = useRef(state.questionsTimeframe);

  useEffect(() => {
    workflowTimeframeRef.current = state.workflowTimeframe;
  }, [state.workflowTimeframe]);

  useEffect(() => {
    questionsTimeframeRef.current = state.questionsTimeframe;
  }, [state.questionsTimeframe]);

  const fetchWorkflowDistribution = useCallback(
    async (timeframe?: WorkflowTimeframe) => {
      const tf = timeframe ?? workflowTimeframeRef.current;
      dispatch({ type: "FETCH_START" });
      dispatch({ type: "SET_WORKFLOW_TIMEFRAME", payload: tf });
      try {
        const token = await getToken();
        const res = await fetch(
          `${baseUrl}/api/dashboard/workflow-distribution?timeframe=${tf}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("مشکلی در دریافت اطلاعات چارت رخ داد.");

        const data = await res.json();
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "خطای ناشناخته";
        dispatch({ type: "FETCH_FAILURE", payload: message });
      }
    },
    [baseUrl, getToken] 
  );

  const fetchMetrics = useCallback(async () => {
    dispatch({ type: "FETCH_METRICS_START" });
    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}/api/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("مشکلی در دریافت متریک‌های داشبورد رخ داد.");

      const data = await res.json();
      dispatch({ type: "FETCH_METRICS_SUCCESS", payload: data });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "خطای ناشناخته در دریافت متریک‌ها";
      dispatch({ type: "FETCH_METRICS_FAILURE", payload: message });
    }
  }, [baseUrl, getToken]);

  const fetchQuestionsMetrics = useCallback(
    async (timeframe?: QuestionsTimeframe) => {
      const tf = timeframe ?? questionsTimeframeRef.current;
      dispatch({ type: "FETCH_QUESTIONS_START" });
      dispatch({ type: "SET_QUESTIONS_TIMEFRAME", payload: tf });
      try {
        const token = await getToken();
        const res = await fetch(
          `${baseUrl}/api/dashboard/questions-metrics?timeframe=${tf}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("مشکلی در دریافت متریک سوالات رخ داد.");

        const data = await res.json();
        dispatch({ type: "FETCH_QUESTIONS_SUCCESS", payload: data });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "خطای ناشناخته در دریافت متریک سوالات";
        dispatch({ type: "FETCH_QUESTIONS_FAILURE", payload: message });
      }
    },
    [baseUrl, getToken] 
  );

 
  const fetchVideoMetrics = useCallback(async () => {
    dispatch({ type: "FETCH_VIDEO_METRICS_START" });
    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}/api/videos/stats/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("مشکلی در دریافت متریک ویدیوها رخ داد.");

      const data = await res.json();
      dispatch({ type: "FETCH_VIDEO_METRICS_SUCCESS", payload: data });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "خطای ناشناخته در دریافت متریک ویدیوها";
      dispatch({ type: "FETCH_VIDEO_METRICS_FAILURE", payload: message });
    }
  }, [baseUrl, getToken]);

  return (
    <DashboardContext.Provider
      value={{
        state,
        fetchWorkflowDistribution,
        fetchMetrics,
        fetchQuestionsMetrics,
        fetchVideoMetrics,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// ---------------- Hook ----------------

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
