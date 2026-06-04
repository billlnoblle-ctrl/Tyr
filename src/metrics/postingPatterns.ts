import type { PostEngagement } from "./engagement.js";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface Bucket {
  label: string;
  posts: number;
  avgInteractions: number;
}

export interface PostingPatterns {
  byDayOfWeek: Bucket[];
  byHourOfDay: Bucket[];
  postsPerWeek: number;
  bestDay?: Bucket;
  bestHour?: Bucket;
}

/**
 * Analyze when posts are published and how each time slot performs, so you can
 * find the best day/hour to post. Timestamps are interpreted in the host
 * machine's local timezone.
 */
export function computePostingPatterns(
  posts: PostEngagement[],
): PostingPatterns {
  const dayAgg = DAYS.map((label) => ({ label, total: 0, count: 0 }));
  const hourAgg = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, "0")}:00`,
    total: 0,
    count: 0,
  }));

  let earliest = Infinity;
  let latest = -Infinity;

  for (const p of posts) {
    const d = new Date(p.timestamp);
    const ts = d.getTime();
    if (Number.isNaN(ts)) continue;
    earliest = Math.min(earliest, ts);
    latest = Math.max(latest, ts);

    const day = dayAgg[d.getDay()];
    day.total += p.interactions;
    day.count += 1;

    const hour = hourAgg[d.getHours()];
    hour.total += p.interactions;
    hour.count += 1;
  }

  const toBucket = (b: { label: string; total: number; count: number }): Bucket => ({
    label: b.label,
    posts: b.count,
    avgInteractions: b.count > 0 ? b.total / b.count : 0,
  });

  const byDayOfWeek = dayAgg.map(toBucket);
  const byHourOfDay = hourAgg.map(toBucket);

  const spanDays =
    latest > earliest ? (latest - earliest) / 86_400_000 : 0;
  const postsPerWeek =
    spanDays > 0 ? (posts.length / spanDays) * 7 : posts.length;

  const withPosts = (b: Bucket) => b.posts > 0;
  const bestDay = [...byDayOfWeek]
    .filter(withPosts)
    .sort((a, b) => b.avgInteractions - a.avgInteractions)[0];
  const bestHour = [...byHourOfDay]
    .filter(withPosts)
    .sort((a, b) => b.avgInteractions - a.avgInteractions)[0];

  return { byDayOfWeek, byHourOfDay, postsPerWeek, bestDay, bestHour };
}
