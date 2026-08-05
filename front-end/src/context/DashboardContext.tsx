"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  ReactNode,
} from "react";

// ---------------- Types ----------------

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

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

interface DashboardState {
  workflowDistribution: DonutDatum[];
  metricsData: DashboardMetrics | null;
  questionsMetrics: QuestionsMetricsData | null;
  isLoading: boolean;
  error: string | null;
  isMetricsLoading: boolean;
  metricsError: string | null;
  isQuestionsLoading: boolean;
  questionsError: string | null;
}

type DashboardAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: DonutDatum[] }
  | { type: "FETCH_FAILURE"; payload: string }
  | { type: "FETCH_METRICS_START" }
  | { type: "FETCH_METRICS_SUCCESS"; payload: DashboardMetrics }
  | { type: "FETCH_METRICS_FAILURE"; payload: string }
  | { type: "FETCH_QUESTIONS_START" }
  | { type: "FETCH_QUESTIONS_SUCCESS"; payload: QuestionsMetricsData }
  | { type: "FETCH_QUESTIONS_FAILURE"; payload: string };

// ---------------- Reducer ----------------

const initialState: DashboardState = {
  workflowDistribution: [],
  metricsData: null,
  questionsMetrics: null,
  isLoading: false,
  error: null,
  isMetricsLoading: false,
  metricsError: null,
  isQuestionsLoading: false,
  questionsError: null,
};

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, isLoading: false, workflowDistribution: action.payload };
    case "FETCH_FAILURE":
      return { ...state, isLoading: false, error: action.payload };

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

    default:
      return state;
  }
};

// ---------------- Context ----------------

const DashboardContext = createContext<{
  state: DashboardState;
  fetchWorkflowDistribution: (userId: string) => Promise<void>;
  fetchMetrics: (userId: string) => Promise<void>;
  fetchQuestionsMetrics: (userId: string) => Promise<void>;
} | undefined>(undefined);

// ---------------- Provider ----------------

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const fetchWorkflowDistribution = useCallback(async (userId: string) => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await fetch(
        `${baseUrl}/api/dashboard/workflow-distribution?user_id=${userId}`
      );
      if (!res.ok) throw new Error("مشکلی در دریافت اطلاعات چارت رخ داد.");

      const data = await res.json();
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خطای ناشناخته";
      dispatch({ type: "FETCH_FAILURE", payload: message });
    }
  }, [baseUrl]);

  const fetchMetrics = useCallback(async (userId: string) => {
    dispatch({ type: "FETCH_METRICS_START" });
    try {
      const res = await fetch(`${baseUrl}/api/dashboard/metrics?user_id=${userId}`);
      if (!res.ok) throw new Error("مشکلی در دریافت متریک‌های داشبورد رخ داد.");

      const data = await res.json();
      dispatch({ type: "FETCH_METRICS_SUCCESS", payload: data });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "خطای ناشناخته در دریافت متریک‌ها";
      dispatch({ type: "FETCH_METRICS_FAILURE", payload: message });
    }
  }, [baseUrl]);

  const fetchQuestionsMetrics = useCallback(async (userId: string) => {
    dispatch({ type: "FETCH_QUESTIONS_START" });
    try {
      const res = await fetch(
        `${baseUrl}/api/dashboard/questions-metrics?user_id=${userId}`
      );
      if (!res.ok) throw new Error("مشکلی در دریافت متریک سوالات رخ داد.");

      const data = await res.json();
      dispatch({ type: "FETCH_QUESTIONS_SUCCESS", payload: data });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "خطای ناشناخته در دریافت متریک سوالات";
      dispatch({ type: "FETCH_QUESTIONS_FAILURE", payload: message });
    }
  }, [baseUrl]);

  return (
    <DashboardContext.Provider
      value={{ state, fetchWorkflowDistribution, fetchMetrics, fetchQuestionsMetrics }}
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
