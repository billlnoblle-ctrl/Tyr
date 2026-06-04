import type { PostEngagement } from "./engagement.js";

export interface TopContent {
  top: PostEngagement[];
  bottom: PostEngagement[];
  byMediaType: Array<{
    mediaType: string;
    count: number;
    avgInteractions: number;
    avgEngagementRate: number;
  }>;
}

/**
 * Rank posts by raw interactions and break performance down by media type
 * (e.g. REELS vs FEED vs CAROUSEL) so you can see which format performs best.
 */
export function computeTopContent(
  posts: PostEngagement[],
  topN = 5,
): TopContent {
  const sorted = [...posts].sort((a, b) => b.interactions - a.interactions);
  const top = sorted.slice(0, topN);
  const bottom = sorted.slice(-topN).reverse();

  const groups = new Map<string, PostEngagement[]>();
  for (const p of posts) {
    const list = groups.get(p.mediaType) ?? [];
    list.push(p);
    groups.set(p.mediaType, list);
  }

  const byMediaType = [...groups.entries()]
    .map(([mediaType, list]) => {
      const count = list.length;
      const avgInteractions =
        list.reduce((s, p) => s + p.interactions, 0) / count;
      const avgEngagementRate =
        list.reduce((s, p) => s + p.engagementRate, 0) / count;
      return { mediaType, count, avgInteractions, avgEngagementRate };
    })
    .sort((a, b) => b.avgInteractions - a.avgInteractions);

  return { top, bottom, byMediaType };
}
