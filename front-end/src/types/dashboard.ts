import type { LucideIcon } from "lucide-react";

/** Trend direction used for percentage-change indicators. */
export type Trend = "up" | "down" | "flat";

/** A single point used inside small sparkline / area / line charts. */
export interface ChartPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

/** Top-row KPI card (Users Online, Questions Today, ...). */
export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  change: number;
  trend: Trend;
  icon: LucideIcon;
  color: "blue" | "purple" | "cyan" | "pink" | "green" | "red" | "amber";
  spark: ChartPoint[];
}

/** Live activity feed entry. */
export interface Activity {
  id: string;
  type:
    | "upload"
    | "question"
    | "retriever"
    | "validator"
    | "web_search"
    | "upgrade"
    | "user_registered"
    | "error_resolved";
  title: string;
  description: string;
  timestamp: string;
  icon: LucideIcon;
  color: "blue" | "purple" | "cyan" | "pink" | "green" | "amber" | "red";
}

/** Health / status of an infrastructure component. */
export type HealthState = "healthy" | "warning" | "offline";

export interface SystemHealth {
  id: string;
  name: string;
  status: HealthState;
  icon: LucideIcon;
  latency?: string;
}

/** Cost breakdown slice (OpenAI, Pinecone, Tavily, ...). */
export interface CostData {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

/** Workflow distribution node (Supervisor, Retriever, ...). */
export interface WorkflowNode {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

/** Alert / notification center entry. */
export interface Notification {
  id: string;
  level: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  timestamp: string;
}

/** Recent transaction / recent user row. */
export interface UserRow {
  id: string;
  name: string;
  avatar: string;
  plan: "Free Plan" | "Pro Plan" | "Enterprise";
  amount: number;
  questions: number;
  videos: number;
  lastActive: string;
  status: "Completed" | "Pending" | "Failed";
}

/** Top user by activity (ranked, progress bar). */
export interface TopUser {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  questions: number;
  percentage: number;
}

/** AI Health Score sub-metric. */
export interface HealthSubMetric {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: Trend;
  tone: "positive" | "negative";
}

/** Placeholder widget for future integrations (LangSmith, etc). */
export interface FutureWidget {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}
