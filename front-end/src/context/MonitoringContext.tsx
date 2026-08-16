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

interface MonitoringState {
  healthScore: AIHealthScoreData | null;
  healthTimeframe: MonitoringTimeframe;
  isHealthLoading: boolean;
  healthError: string | null;
}

type MonitoringAction =
  | { type: "FETCH_HEALTH_START"; payload: MonitoringTimeframe }
  | { type: "FETCH_HEALTH_SUCCESS"; payload: AIHealthScoreData }
  | { type: "FETCH_HEALTH_FAILURE"; payload: string };

// ---------------- Reducer ----------------

const initialState: MonitoringState = {
  healthScore: null,
  healthTimeframe: "week",
  isHealthLoading: false,
  healthError: null,
};

function monitoringReducer(state: MonitoringState, action: MonitoringAction): MonitoringState {
  switch (action.type) {
    case "FETCH_HEALTH_START":
      return { ...state, isHealthLoading: true, healthError: null, healthTimeframe: action.payload };
    case "FETCH_HEALTH_SUCCESS":
      return { ...state, isHealthLoading: false, healthScore: action.payload };
    case "FETCH_HEALTH_FAILURE":
      return { ...state, isHealthLoading: false, healthError: action.payload };
    default:
      return state;
  }
}

// ---------------- Context ----------------

const MonitoringContext = createContext<
  | {
      state: MonitoringState;
      fetchHealthScore: (timeframe?: MonitoringTimeframe) => Promise<void>;
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

  return (
    <MonitoringContext.Provider value={{ state, fetchHealthScore }}>
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
