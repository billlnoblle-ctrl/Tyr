import type { PostEngagement } from "./engagement.js";
import type { TopContent } from "./topContent.js";

export interface AdCandidate {
  id: string;
  permalink?: string;
  caption?: string;
  mediaType: string;
  interactions: number;
  engagementRate: number;
  /** Interactions relative to your average (2.0 = twice your average). */
  vsAverage: number;
  /** Composite ranking score (higher = stronger ad candidate). */
  score: number;
  /** Plain-language explanation of why this post is worth boosting. */
  reason: string;
}

export interface AdCandidates {
  /** Posts most worth promoting, best first. */
  candidates: AdCandidate[];
}

/**
 * Flag the posts most worth advertising. A good ad candidate is one that
 * already over-performs organically — so it's likely to perform when boosted.
 *
 * Scoring is deliberately simple and interpretable: a post's interactions,
 * lifted slightly when it's in your best-performing format. Only posts at or
 * above your average interactions are recommended. Pure function — no network
 * or external calls — so it's unit-tested against mock data.
 */
export function computeAdCandidates(
  posts: PostEngagement[],
  byMediaType: TopContent["byMediaType"],
  topN = 3,
): AdCandidates {
  if (posts.length === 0) return { candidates: [] };

  const avgInteractions =
    posts.reduce((s, p) => s + p.interactions, 0) / posts.length;

  // byMediaType is sorted best-first by the caller (computeTopContent).
  const bestFormat = byMediaType[0]?.mediaType;
  const FORMAT_BOOST = 1.1;

  const candidates = posts
    .map((p): AdCandidate => {
      const vsAverage =
        avgInteractions > 0 ? p.interactions / avgInteractions : 0;
      const inBestFormat = bestFormat !== undefined && p.mediaType === bestFormat;
      const score = p.interactions * (inBestFormat ? FORMAT_BOOST : 1);

      const parts = [`${vsAverage.toFixed(1)}× your average interactions`];
      if (inBestFormat) parts.push(`${p.mediaType} is your top-performing format`);
      if (p.engagementRate > 0)
        parts.push(`${p.engagementRate.toFixed(2)}% engagement rate`);

      return {
        id: p.id,
        permalink: p.permalink,
        caption: p.caption,
        mediaType: p.mediaType,
        interactions: p.interactions,
        engagementRate: p.engagementRate,
        vsAverage,
        score,
        reason: parts.join("; "),
      };
    })
    // Only recommend posts that at least match your average performance.
    .filter((c) => c.vsAverage >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return { candidates };
}
