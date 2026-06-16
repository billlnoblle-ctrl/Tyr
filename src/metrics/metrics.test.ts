import assert from "node:assert/strict";
import test from "node:test";
import type { Comment, Media } from "../types.js";
import { computeAdCandidates } from "./adCandidates.js";
import { computeComments } from "./comments.js";
import { computeContentIdeas } from "./contentIdeas.js";
import { computeEngagement } from "./engagement.js";
import { computeGrowth } from "./growth.js";
import { computePostingPatterns } from "./postingPatterns.js";
import { computeTopContent } from "./topContent.js";

const media: Media[] = [
  {
    id: "1",
    media_type: "IMAGE",
    media_product_type: "FEED",
    timestamp: "2026-05-01T18:00:00+0000", // Friday
    like_count: 100,
    comments_count: 10,
    permalink: "https://instagram.com/p/1",
    caption: "first",
  },
  {
    id: "2",
    media_type: "VIDEO",
    media_product_type: "REELS",
    timestamp: "2026-05-04T09:00:00+0000", // Monday
    like_count: 300,
    comments_count: 50,
    permalink: "https://instagram.com/p/2",
    caption: "reel",
  },
  {
    id: "3",
    media_type: "IMAGE",
    media_product_type: "FEED",
    timestamp: "2026-05-08T18:00:00+0000",
    like_count: 50,
    comments_count: 5,
    permalink: "https://instagram.com/p/3",
  },
];

test("computeEngagement aggregates likes, comments, and rate", () => {
  const e = computeEngagement(media, 1000);
  assert.equal(e.totalInteractions, 515); // 110 + 350 + 55
  assert.equal(e.avgLikesPerPost, 150); // 450 / 3
  assert.equal(e.avgCommentsPerPost, 65 / 3);
  // post 2: 350 / 1000 * 100 = 35%
  const reel = e.posts.find((p) => p.id === "2");
  assert.equal(reel?.engagementRate, 35);
});

test("computeEngagement handles unknown followers without dividing by zero", () => {
  const e = computeEngagement(media, undefined);
  assert.equal(e.avgEngagementRate, 0);
  assert.ok(e.posts.every((p) => p.engagementRate === 0));
});

test("computeTopContent ranks posts and groups by media type", () => {
  const e = computeEngagement(media, 1000);
  const tc = computeTopContent(e.posts, 2);
  assert.equal(tc.top[0].id, "2"); // highest interactions
  assert.equal(tc.top.length, 2);
  const reels = tc.byMediaType.find((m) => m.mediaType === "REELS");
  assert.equal(reels?.avgInteractions, 350);
  // REELS should outrank FEED on avg interactions.
  assert.equal(tc.byMediaType[0].mediaType, "REELS");
});

test("computePostingPatterns finds best day and frequency", () => {
  const e = computeEngagement(media, 1000);
  const p = computePostingPatterns(e.posts);
  assert.equal(p.bestDay?.label, "Monday"); // reel has most interactions
  assert.equal(p.byDayOfWeek.length, 7);
  assert.equal(p.byHourOfDay.length, 24);
  assert.ok(p.postsPerWeek > 0);
});

test("computeGrowth summarizes an insight time series", () => {
  const g = computeGrowth(
    [
      {
        name: "reach",
        period: "day",
        values: [
          { value: 100, end_time: "2026-05-01" },
          { value: 150, end_time: "2026-05-02" },
          { value: 200, end_time: "2026-05-03" },
        ],
      },
    ],
    1000,
  );
  const reach = g.trends[0];
  assert.equal(reach.total, 450);
  assert.equal(reach.first, 100);
  assert.equal(reach.last, 200);
  assert.equal(reach.change, 100);
  assert.equal(reach.changePercent, 100);
  assert.equal(g.currentFollowers, 1000);
});

test("computeGrowth returns no trends for empty insights", () => {
  const g = computeGrowth([], undefined);
  assert.equal(g.trends.length, 0);
});

const comments: Comment[] = [
  { id: "c1", text: "love this", username: "alice", timestamp: "2026-05-01", like_count: 5 },
  { id: "c2", text: "nice", username: "bob", timestamp: "2026-05-01", like_count: 20 },
  { id: "c3", text: "again", username: "alice", timestamp: "2026-05-02", like_count: 1 },
  { id: "c4", text: "no name", timestamp: "2026-05-02", like_count: 0 },
];

test("computeComments ranks top commenters and most-liked comments", () => {
  const c = computeComments(comments, 5);
  assert.equal(c.analyzedComments, 4);
  assert.equal(c.uniqueCommenters, 2); // alice + bob; blank username ignored
  assert.equal(c.topCommenters[0].username, "alice");
  assert.equal(c.topCommenters[0].count, 2);
  assert.equal(c.mostLiked[0].id, "c2"); // 20 likes is highest
});

test("computeComments handles an empty list", () => {
  const c = computeComments([]);
  assert.equal(c.analyzedComments, 0);
  assert.equal(c.uniqueCommenters, 0);
  assert.equal(c.topCommenters.length, 0);
  assert.equal(c.mostLiked.length, 0);
});

test("computeContentIdeas derives suggestions from metrics", () => {
  const e = computeEngagement(media, 1000);
  const ideas = computeContentIdeas({
    engagement: e,
    patterns: computePostingPatterns(e.posts),
    topContent: computeTopContent(e.posts),
  });
  assert.ok(ideas.ideas.length > 0);
  // REELS is the best format here, so it should be recommended.
  assert.ok(ideas.ideas.some((s) => s.includes("REELS")));
  // Best slot (Monday) should be surfaced.
  assert.ok(ideas.ideas.some((s) => s.includes("Monday")));
});

test("computeContentIdeas falls back when there is no data", () => {
  const e = computeEngagement([], undefined);
  const ideas = computeContentIdeas({
    engagement: e,
    patterns: computePostingPatterns(e.posts),
    topContent: computeTopContent(e.posts),
  });
  assert.equal(ideas.ideas.length, 1);
  assert.ok(ideas.ideas[0].includes("Not enough data"));
});

test("computeAdCandidates flags above-average posts, best first", () => {
  const e = computeEngagement(media, 1000);
  const tc = computeTopContent(e.posts);
  const ac = computeAdCandidates(e.posts, tc.byMediaType);
  // post 2 (the REELS) is the strongest performer and should rank first.
  assert.equal(ac.candidates[0].id, "2");
  // Every recommended post must be at or above average interactions.
  assert.ok(ac.candidates.every((c) => c.vsAverage >= 1));
  // The reason should mention it beats the average.
  assert.ok(ac.candidates[0].reason.includes("average"));
});

test("computeAdCandidates returns nothing for an empty account", () => {
  const ac = computeAdCandidates([], []);
  assert.equal(ac.candidates.length, 0);
});
