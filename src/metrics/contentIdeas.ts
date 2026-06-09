import type { CommentsSummary } from "./comments.js";
import type { EngagementSummary } from "./engagement.js";
import type { PostingPatterns } from "./postingPatterns.js";
import type { TopContent } from "./topContent.js";

export interface ContentIdeas {
  /** Plain-language, actionable suggestions derived from your own metrics. */
  ideas: string[];
}

const fmt = (n: number, digits = 0): string =>
  Number.isFinite(n) ? n.toFixed(digits) : "n/a";

function truncate(text: string | undefined, len = 60): string {
  if (!text) return "a recent post";
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > len ? `${oneLine.slice(0, len - 1)}…` : oneLine;
}

/**
 * Turn the computed metrics into concrete, plain-language content suggestions.
 * This is deliberately rule-based and offline — it only reasons over your own
 * account data, makes no external/AI calls, and never touches the account.
 */
export function computeContentIdeas(input: {
  engagement: EngagementSummary;
  patterns: PostingPatterns;
  topContent: TopContent;
  comments?: CommentsSummary;
}): ContentIdeas {
  const { engagement, patterns, topContent, comments } = input;
  const ideas: string[] = [];

  // 1. Lean into your best-performing format.
  const formats = topContent.byMediaType;
  if (formats.length >= 2) {
    const best = formats[0];
    const worst = formats[formats.length - 1];
    if (best.avgInteractions > worst.avgInteractions) {
      ideas.push(
        `${best.mediaType} is your strongest format ` +
          `(${fmt(best.avgInteractions)} avg interactions vs ` +
          `${fmt(worst.avgInteractions)} for ${worst.mediaType}). ` +
          `Prioritize more ${best.mediaType} content.`,
      );
    }
  } else if (formats.length === 1) {
    ideas.push(
      `Almost all your posts are ${formats[0].mediaType}. Try mixing in ` +
        `another format (e.g. Reels vs carousel) to see what your audience prefers.`,
    );
  }

  // 2. Post at your best day/time.
  if (patterns.bestDay && patterns.bestHour) {
    ideas.push(
      `Your best slot is ${patterns.bestDay.label} around ` +
        `${patterns.bestHour.label} — schedule your most important posts then.`,
    );
  }

  // 3. Posting cadence.
  if (patterns.postsPerWeek > 0 && patterns.postsPerWeek < 3) {
    ideas.push(
      `You're posting ~${fmt(patterns.postsPerWeek, 1)} times/week. Accounts ` +
        `usually grow faster at 3–5 posts/week — consider increasing cadence.`,
    );
  }

  // 4. Make follow-ups to your top post.
  const topPost = topContent.top[0];
  if (topPost) {
    ideas.push(
      `Your top post ("${truncate(topPost.caption)}") earned ` +
        `${fmt(topPost.interactions)} interactions. Create a follow-up or ` +
        `series in that theme.`,
    );
  }

  // 5. Engagement-rate nudge.
  if (engagement.posts.length > 0) {
    if (engagement.avgEngagementRate > 0 && engagement.avgEngagementRate < 1) {
      ideas.push(
        `Avg engagement rate is ${fmt(engagement.avgEngagementRate, 2)}% — add a ` +
          `clear call-to-action (ask a question, "save this", "tag a friend") ` +
          `to lift comments and saves.`,
      );
    }
    if (engagement.avgCommentsPerPost < engagement.avgLikesPerPost * 0.02) {
      ideas.push(
        `Comments are low relative to likes. End captions with a question to ` +
          `invite replies and boost the comment ratio.`,
      );
    }
  }

  // 6. Reward your most engaged commenters.
  if (comments && comments.topCommenters.length > 0) {
    const names = comments.topCommenters
      .slice(0, 3)
      .map((c) => `@${c.username}`)
      .join(", ");
    ideas.push(
      `Your most active commenters are ${names}. Reply to or feature them to ` +
        `deepen loyalty and signal engagement to the algorithm.`,
    );
  }

  if (ideas.length === 0) {
    ideas.push(
      "Not enough data yet for tailored ideas — analyze more posts " +
        "(increase --limit) once you've published more content.",
    );
  }

  return { ideas };
}
