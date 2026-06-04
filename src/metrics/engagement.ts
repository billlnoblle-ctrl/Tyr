import type { Media } from "../types.js";

export interface PostEngagement {
  id: string;
  permalink?: string;
  caption?: string;
  timestamp: string;
  mediaType: string;
  likes: number;
  comments: number;
  interactions: number;
  /** Interactions as a percentage of followers (0 if followers unknown). */
  engagementRate: number;
}

export interface EngagementSummary {
  posts: PostEngagement[];
  totalInteractions: number;
  avgInteractionsPerPost: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  /** Average engagement rate across posts, as a percentage. */
  avgEngagementRate: number;
}

const num = (v: number | undefined): number => v ?? 0;

/**
 * Compute per-post and aggregate engagement metrics.
 * Engagement rate is interactions / followers, expressed as a percentage —
 * the most widely comparable definition across accounts.
 */
export function computeEngagement(
  media: Media[],
  followers: number | undefined,
): EngagementSummary {
  const posts: PostEngagement[] = media.map((m) => {
    const likes = num(m.like_count);
    const comments = num(m.comments_count);
    const interactions = likes + comments;
    const engagementRate =
      followers && followers > 0 ? (interactions / followers) * 100 : 0;
    return {
      id: m.id,
      permalink: m.permalink,
      caption: m.caption,
      timestamp: m.timestamp,
      mediaType: m.media_product_type || m.media_type,
      likes,
      comments,
      interactions,
      engagementRate,
    };
  });

  const count = posts.length || 1;
  const totalInteractions = posts.reduce((s, p) => s + p.interactions, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments, 0);
  const totalRate = posts.reduce((s, p) => s + p.engagementRate, 0);

  return {
    posts,
    totalInteractions,
    avgInteractionsPerPost: totalInteractions / count,
    avgLikesPerPost: totalLikes / count,
    avgCommentsPerPost: totalComments / count,
    avgEngagementRate: totalRate / count,
  };
}
