"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface DashboardState {
  workflowDistribution: DonutDatum[];
  isLoading: boolean;
  error: string | null;
}

type DashboardAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: DonutDatum[] }
  | { type: "FETCH_FAILURE"; payload: string };

const initialState: DashboardState = {
  workflowDistribution: [],
  isLoading: false,
  error: null,
};

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, isLoading: false, workflowDistribution: action.payload };
    case "FETCH_FAILURE":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
};

const DashboardContext = createContext<{
  state: DashboardState;
  fetchWorkflowDistribution: (userId: string) => Promise<void>;
} | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);



const fetchWorkflowDistribution = async (userId: string) => {
  dispatch({ type: "FETCH_START" });
  try {
  
    const res = await fetch(`http://127.0.0.1:8000/api/dashboard/workflow-distribution?user_id=${userId}`);
    
    if (!res.ok) throw new Error("مشکلی در دریافت اطلاعات داشبورد رخ داد.");
    const data = await res.json();
    dispatch({ type: "FETCH_SUCCESS", payload: data });
  } catch (err: any) {
    dispatch({ type: "FETCH_FAILURE", payload: err.message || "خطای ناشناخته" });
  }
};

  return (
    <DashboardContext.Provider value={{ state, fetchWorkflowDistribution }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}