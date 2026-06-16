import type { Account } from "./types.js";
import type { AdCandidates } from "./metrics/adCandidates.js";
import type { CommentsSummary } from "./metrics/comments.js";
import type { ContentIdeas } from "./metrics/contentIdeas.js";
import type { EngagementSummary } from "./metrics/engagement.js";
import type { GrowthSummary } from "./metrics/growth.js";
import type { PostingPatterns } from "./metrics/postingPatterns.js";
import type { TopContent } from "./metrics/topContent.js";

export interface Analysis {
  account: Account;
  engagement: EngagementSummary;
  growth: GrowthSummary;
  patterns: PostingPatterns;
  topContent: TopContent;
  /** Present only when comment analysis was enabled and permitted. */
  comments?: CommentsSummary;
  adCandidates: AdCandidates;
  contentIdeas: ContentIdeas;
  analyzedPosts: number;
}

const fmt = (n: number, digits = 1): string =>
  Number.isFinite(n) ? n.toFixed(digits) : "n/a";
const int = (n: number | undefined): string =>
  n === undefined ? "n/a" : Math.round(n).toLocaleString();

function truncate(text: string | undefined, len = 50): string {
  if (!text) return "(no caption)";
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > len ? `${oneLine.slice(0, len - 1)}…` : oneLine;
}

/** Render the full analysis as a human-readable text report. */
export function renderReport(a: Analysis): string {
  const L: string[] = [];
  const { account: acc } = a;

  L.push("=".repeat(60));
  L.push(`  Instagram Analytics — @${acc.username}${acc.name ? ` (${acc.name})` : ""}`);
  L.push("=".repeat(60));
  L.push("");
  L.push(`Followers:   ${int(acc.followers_count)}`);
  L.push(`Following:   ${int(acc.follows_count)}`);
  L.push(`Total posts: ${int(acc.media_count)}`);
  L.push(`Analyzed:    ${a.analyzedPosts} most recent posts`);
  L.push("");

  // Engagement
  const e = a.engagement;
  L.push("── Engagement ────────────────────────────────────────────");
  L.push(`Avg engagement rate: ${fmt(e.avgEngagementRate, 2)}% of followers`);
  L.push(`Avg interactions:    ${fmt(e.avgInteractionsPerPost)} per post`);
  L.push(`Avg likes:           ${fmt(e.avgLikesPerPost)} per post`);
  L.push(`Avg comments:        ${fmt(e.avgCommentsPerPost)} per post`);
  L.push("");

  // Growth & reach
  L.push("── Growth & Reach (account insights) ─────────────────────");
  if (a.growth.trends.length === 0) {
    L.push("No insight data available (check token scopes / account type).");
  } else {
    for (const t of a.growth.trends) {
      const arrow = t.change > 0 ? "▲" : t.change < 0 ? "▼" : "─";
      L.push(
        `${t.name.padEnd(16)} total=${int(t.total)}  ` +
          `latest=${int(t.last)}  ${arrow} ${int(Math.abs(t.change))} ` +
          `(${fmt(t.changePercent)}%) over period`,
      );
    }
  }
  L.push("");

  // Posting patterns
  const p = a.patterns;
  L.push("── Posting Patterns ──────────────────────────────────────");
  L.push(`Posting frequency: ${fmt(p.postsPerWeek)} posts/week`);
  if (p.bestDay)
    L.push(
      `Best day:  ${p.bestDay.label} (${fmt(p.bestDay.avgInteractions)} avg interactions)`,
    );
  if (p.bestHour)
    L.push(
      `Best hour: ${p.bestHour.label} (${fmt(p.bestHour.avgInteractions)} avg interactions)`,
    );
  L.push("");
  L.push("By day of week (avg interactions):");
  for (const d of p.byDayOfWeek) {
    L.push(`  ${d.label.padEnd(10)} ${bar(d.avgInteractions, p.byDayOfWeek)} ${fmt(d.avgInteractions)} (${d.posts} posts)`);
  }
  L.push("");

  // Top content
  const tc = a.topContent;
  L.push("── Top Content ───────────────────────────────────────────");
  L.push("Best performing posts:");
  tc.top.forEach((post, i) => {
    L.push(
      `  ${i + 1}. ${int(post.interactions)} interactions ` +
        `(${int(post.likes)}❤ ${int(post.comments)}💬) — ${truncate(post.caption ?? "")}`,
    );
    if (post.permalink) L.push(`     ${post.permalink}`);
  });
  L.push("");
  L.push("Performance by media type:");
  for (const m of tc.byMediaType) {
    L.push(
      `  ${m.mediaType.padEnd(16)} ${m.count} posts, ` +
        `${fmt(m.avgInteractions)} avg interactions, ${fmt(m.avgEngagementRate, 2)}% eng. rate`,
    );
  }
  L.push("");

  // Comments (optional)
  if (a.comments) {
    const c = a.comments;
    L.push("── Comments ──────────────────────────────────────────────");
    L.push(
      `Analyzed ${int(c.analyzedComments)} comments from your top posts ` +
        `(${int(c.uniqueCommenters)} unique commenters).`,
    );
    if (c.topCommenters.length > 0) {
      L.push("Most active commenters:");
      c.topCommenters.forEach((u, i) => {
        L.push(`  ${i + 1}. @${u.username} (${int(u.count)} comments)`);
      });
    }
    if (c.mostLiked.length > 0 && c.mostLiked[0].like_count) {
      L.push("Most-liked comments:");
      c.mostLiked.forEach((cm) => {
        if (!cm.like_count) return;
        L.push(
          `  ${int(cm.like_count)}❤ @${cm.username ?? "?"}: ${truncate(cm.text, 60)}`,
        );
      });
    }
    L.push("");
  }

  // Ad candidates — best posts to promote
  L.push(...adCandidatesLines(a));
  L.push("");

  // Content ideas
  L.push("── Content Ideas ─────────────────────────────────────────");
  a.contentIdeas.ideas.forEach((idea, i) => {
    L.push(`  ${i + 1}. ${idea}`);
  });
  L.push("");
  L.push("=".repeat(60));

  return L.join("\n");
}

/** Render the "Best Posts to Advertise" section as lines (shared). */
function adCandidatesLines(a: Analysis): string[] {
  const L: string[] = [];
  const ac = a.adCandidates.candidates;
  L.push("── Best Posts to Advertise ───────────────────────────────");
  if (ac.length === 0) {
    L.push("No standout posts yet — analyze more content to find ad candidates.");
  } else {
    L.push('Promote these proven performers (Ads Manager → "Use existing post"):');
    ac.forEach((c, i) => {
      L.push(
        `  ${i + 1}. ${int(c.interactions)} interactions — ${truncate(c.caption ?? "")}`,
      );
      L.push(`     why: ${c.reason}`);
      if (c.permalink) L.push(`     ${c.permalink}`);
    });
  }
  return L;
}

/** Render only the ad-candidate recommendations (for `--ads-only`). */
export function renderAdCandidates(a: Analysis): string {
  const { account: acc } = a;
  const L: string[] = [];
  L.push("=".repeat(60));
  L.push(`  Ad candidates — @${acc.username}${acc.name ? ` (${acc.name})` : ""}`);
  L.push("=".repeat(60));
  L.push("");
  L.push(...adCandidatesLines(a));
  L.push("");
  L.push("=".repeat(60));
  return L.join("\n");
}

function bar(
  value: number,
  all: Array<{ avgInteractions: number }>,
  width = 20,
): string {
  const max = Math.max(...all.map((x) => x.avgInteractions), 1);
  const filled = Math.round((value / max) * width);
  return "█".repeat(filled).padEnd(width, "·");
}
