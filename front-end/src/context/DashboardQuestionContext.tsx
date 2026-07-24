// context/DashboardContext.tsx
"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";

// ۱. تعریف تایپ‌ها
interface ChartData {
  label: string;
  value: number;
}

interface DashboardState {
  questionsData: ChartData[];
  timeRange: "week" | "month" | "quarter";
  isLoading: boolean;
  error: string | null;
}

type DashboardAction =
  | { type: "SET_TIME_RANGE"; payload: "week" | "month" | "quarter" }
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: ChartData[] }
  | { type: "FETCH_ERROR"; payload: string };

// ۲. مقدار اولیه
const initialState: DashboardState = {
  questionsData: [],
  timeRange: "week",
  isLoading: false,
  error: null,
};

// ۳. ایجاد Reducer
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "SET_TIME_RANGE":
      return { ...state, timeRange: action.payload };
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, isLoading: false, questionsData: action.payload };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

// ۴. ایجاد Context
const DashboardContext = createContext<{
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
} | null>(null);

export function DashboardProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // فراخوانی API هر بار که timeRange تغییر کند
  useEffect(() => {
    const fetchChartData = async () => {
      dispatch({ type: "FETCH_START" });
      try {
        const response = await fetch(
          `http://localhost:8000/api/dashboard/questions-overview?user_id=${userId}&time_range=${state.timeRange}`
        );
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (error: any) {
        dispatch({ type: "FETCH_ERROR", payload: error.message });
      }
    };

    fetchChartData();
  }, [state.timeRange, userId]);

  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
}

// هوک کاستوم برای استفاده راحت‌تر
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}