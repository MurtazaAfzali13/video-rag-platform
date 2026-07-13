import { Card, SectionTitle } from "../shared";
import { DonutChart } from "./DonutChart";
import { costBreakdown } from "@/mock/dashboard";

export function CostBreakdownCard() {
  const total = costBreakdown.reduce((sum, d) => sum + d.value, 0);
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
      <SectionTitle
        title="AI Cost Breakdown"
        subtitle="Spend by provider this week"
        action={
          <select
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60 outline-none"
            defaultValue="week"
            aria-label="Select time range"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        }
      />
      <div className="p-5">
        <DonutChart data={costBreakdown} centerLabel="Total Cost" centerValue={`$${total.toFixed(2)}`} valuePrefix="$" />
      </div>
    </Card>
  );
}
