import type { InsightMetric } from "../types.js";

export interface MetricTrend {
  name: string;
  period: string;
  first?: number;
  last?: number;
  total: number;
  change: number;
  changePercent: number;
  points: Array<{ date?: string; value: number }>;
}

export interface GrowthSummary {
  currentFollowers?: number;
  trends: MetricTrend[];
}

/**
 * Summarize account-level insight time series (reach, follower_count,
 * profile_views, ...) into start/end values, totals, and net change.
 */
export function computeGrowth(
  insights: InsightMetric[],
  currentFollowers?: number,
): GrowthSummary {
  const trends: MetricTrend[] = insights.map((metric) => {
    const points = metric.values.map((v) => ({
      date: v.end_time,
      value: v.value ?? 0,
    }));
    const values = points.map((p) => p.value);
    const first = values[0];
    const last = values[values.length - 1];
    const total = values.reduce((s, v) => s + v, 0);
    const change = first !== undefined && last !== undefined ? last - first : 0;
    const changePercent =
      first && first !== 0 ? (change / first) * 100 : 0;

    return {
      name: metric.name,
      period: metric.period,
      first,
      last,
      total,
      change,
      changePercent,
      points,
    };
  });

  return { currentFollowers, trends };
}
