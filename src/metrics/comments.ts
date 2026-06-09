import type { Comment } from "../types.js";

export interface CommentsSummary {
  /** How many comments were actually fetched and analyzed. */
  analyzedComments: number;
  /** Distinct commenters seen in the analyzed set. */
  uniqueCommenters: number;
  /** Most frequent commenters (your most engaged audience). */
  topCommenters: Array<{ username: string; count: number }>;
  /** Comments with the most likes (what resonates with your audience). */
  mostLiked: Comment[];
}

const num = (v: number | undefined): number => v ?? 0;

/**
 * Summarize a flat list of comments (typically gathered across your top posts)
 * into your most engaged commenters and the comments that resonate most.
 * Pure function — no network calls — so it is unit-tested against mock data.
 */
export function computeComments(
  comments: Comment[],
  topN = 5,
): CommentsSummary {
  const counts = new Map<string, number>();
  for (const c of comments) {
    const user = c.username?.trim();
    if (!user) continue;
    counts.set(user, (counts.get(user) ?? 0) + 1);
  }

  const topCommenters = [...counts.entries()]
    .map(([username, count]) => ({ username, count }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username))
    .slice(0, topN);

  const mostLiked = [...comments]
    .sort((a, b) => num(b.like_count) - num(a.like_count))
    .slice(0, topN);

  return {
    analyzedComments: comments.length,
    uniqueCommenters: counts.size,
    topCommenters,
    mostLiked,
  };
}
