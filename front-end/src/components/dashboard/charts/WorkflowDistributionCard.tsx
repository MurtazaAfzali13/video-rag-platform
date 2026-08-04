"use client";

import { useEffect } from "react";
import { Card, SectionTitle } from "../shared";
import { DonutChart } from "./DonutChart";
import { useDashboard } from "@/context/DashboardContext";

export function WorkflowDistributionCard({ userId }: { userId: string }) {
  const { state, fetchWorkflowDistribution } = useDashboard();
  const { workflowDistribution, isLoading, error } = state;

  useEffect(() => {
    if (userId) {
      fetchWorkflowDistribution(userId);
    }
  }, [userId]);

  // محاسبه مجموع واقعی مقادیر
  const total = workflowDistribution.reduce((sum, d) => sum + d.value, 0);

  // محاسبه مجدد درصدها به صورت دقیق در فرانت‌اند
  const correctedDistribution = workflowDistribution.map(d => ({
    ...d,
    // جلوگیری از تقسیم بر صفر و گرد کردن تا یک رقم اعشار
    percentage: total > 0 ? Number(((d.value / total) * 100).toFixed(1)) : 0 
  }));

  if (isLoading) {
    return (
      <Card className="flex h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex h-[320px] items-center justify-center p-5 text-center text-sm text-red-400">
        خطا در بارگذاری توزیع پردازش: {error}
      </Card>
    );
  }

  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
      <SectionTitle title="AI Workflow Distribution" subtitle="Node execution share (LangGraph)" />
      <div className="p-5">
        {correctedDistribution.length > 0 ? (
          <DonutChart data={correctedDistribution} centerLabel="Total Runs" centerValue={total.toLocaleString("en-US")} />
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-white/40">
            هیچ تِرِیس یا جریانی برای این کاربر ثبت نشده است.
          </div>
        )}
      </div>
    </Card>
  );
}