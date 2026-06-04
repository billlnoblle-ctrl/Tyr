import { InstagramClient } from "./api/client.js";
import type { Config } from "./config.js";
import { computeEngagement } from "./metrics/engagement.js";
import { computeGrowth } from "./metrics/growth.js";
import { computePostingPatterns } from "./metrics/postingPatterns.js";
import { computeTopContent } from "./metrics/topContent.js";
import type { Analysis } from "./report.js";

export interface AnalyzeOptions {
  limit: number;
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

  return {
    account,
    engagement,
    growth,
    patterns,
    topContent,
    analyzedPosts: media.length,
  };
}
