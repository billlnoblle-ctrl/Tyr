import { InstagramClient } from "./api/client.js";
import type { Config } from "./config.js";
import { computeComments } from "./metrics/comments.js";
import { computeContentIdeas } from "./metrics/contentIdeas.js";
import { computeEngagement } from "./metrics/engagement.js";
import { computeGrowth } from "./metrics/growth.js";
import { computePostingPatterns } from "./metrics/postingPatterns.js";
import { computeTopContent } from "./metrics/topContent.js";
import type { Analysis } from "./report.js";
import type { Comment } from "./types.js";

export interface AnalyzeOptions {
  limit: number;
  /** Number of top posts to pull comments from (0 disables comment analysis). */
  commentPosts: number;
}

/**
 * Fetch an account's data and compute the full set of metrics.
 * Returns a structured Analysis that can be rendered as text or JSON.
 */
export async function analyzeAccount(
  config: Config,
  options: AnalyzeOptions,
): Promise<Analysis> {
  const client = new InstagramClient(config);

  const [account, media, insights] = await Promise.all([
    client.getAccount(),
    client.getMedia(options.limit),
    client.getAccountInsights(),
  ]);

  const engagement = computeEngagement(media, account.followers_count);
  const growth = computeGrowth(insights, account.followers_count);
  const patterns = computePostingPatterns(engagement.posts);
  const topContent = computeTopContent(engagement.posts);

  // Comments: read-only, fetched only for the highest-performing posts to
  // keep request volume (and rate-limit impact) modest.
  let comments;
  if (options.commentPosts > 0) {
    const targets = topContent.top.slice(0, options.commentPosts);
    const fetched = await Promise.all(
      targets.map((p) => client.getComments(p.id)),
    );
    const all: Comment[] = fetched.flat();
    comments = computeComments(all);
  }

  const contentIdeas = computeContentIdeas({
    engagement,
    patterns,
    topContent,
    comments,
  });

  return {
    account,
    engagement,
    growth,
    patterns,
    topContent,
    comments,
    contentIdeas,
    analyzedPosts: media.length,
  };
}
