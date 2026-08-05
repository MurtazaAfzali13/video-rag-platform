"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";

// ---------------- Types ----------------

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

// تایپ جدید برای متریک‌های عددی بالای داشبورد
export interface DashboardMetrics {
  web_searches: number;
  // در آینده می‌توانید بقیه کارت‌ها را هم اینجا اضافه کنید
}

interface DashboardState {
  workflowDistribution: DonutDatum[];
  metricsData: DashboardMetrics | null; // اضافه شدن بخش متریک‌ها
  isLoading: boolean;
  error: string | null;
  isMetricsLoading: boolean; // لودینگ مجزا برای متریک‌ها
  metricsError: string | null; // ارور مجزا برای متریک‌ها
}

type DashboardAction =
  // اکشن‌های مربوط به چارت دونات
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: DonutDatum[] }
  | { type: "FETCH_FAILURE"; payload: string }
  // اکشن‌های مربوط به کارت‌های آماری
  | { type: "FETCH_METRICS_START" }
  | { type: "FETCH_METRICS_SUCCESS"; payload: DashboardMetrics }
  | { type: "FETCH_METRICS_FAILURE"; payload: string };

// ---------------- Reducer ----------------

const initialState: DashboardState = {
  workflowDistribution: [],
  metricsData: null,
  isLoading: false,
  error: null,
  isMetricsLoading: false,
  metricsError: null,
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
      
    default:
      return state;
  }
};

// ---------------- Context ----------------

const DashboardContext = createContext<{
  state: DashboardState;
  fetchWorkflowDistribution: (userId: string) => Promise<void>;
  fetchMetrics: (userId: string) => Promise<void>; // تابع جدید به کانتکست اضافه شد
} | undefined>(undefined);

// ---------------- Provider ----------------

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  
  // آدرس پایه API (پیشنهاد می‌شود در حالت پروداکشن از متغیرهای محیطی استفاده کنید)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // تابع دریافت دیتای چارت دونات
  const fetchWorkflowDistribution = async (userId: string) => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await fetch(`${baseUrl}/api/dashboard/workflow-distribution?user_id=${userId}`);
      if (!res.ok) throw new Error("مشکلی در دریافت اطلاعات چارت رخ داد.");
      
      const data = await res.json();
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err: any) {
      dispatch({ type: "FETCH_FAILURE", payload: err.message || "خطای ناشناخته" });
    }
  };

  // تابع جدید برای دریافت دیتای کارت‌های آماری (مثل Web Searches)
  const fetchMetrics = async (userId: string) => {
    dispatch({ type: "FETCH_METRICS_START" });
    try {
      const res = await fetch(`${baseUrl}/api/dashboard/metrics?user_id=${userId}`);
      if (!res.ok) throw new Error("مشکلی در دریافت متریک‌های داشبورد رخ داد.");
      
      const data = await res.json();
      dispatch({ type: "FETCH_METRICS_SUCCESS", payload: data });
    } catch (err: any) {
      dispatch({ type: "FETCH_METRICS_FAILURE", payload: err.message || "خطای ناشناخته در دریافت متریک‌ها" });
    }
  };

  return (
    <DashboardContext.Provider value={{ state, fetchWorkflowDistribution, fetchMetrics }}>
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