/** Shared domain types for the Instagram analytics tool. */

export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS" | string;

/** A single piece of media (post/reel) as returned by the Graph API. */
export interface Media {
  id: string;
  caption?: string;
  media_type: MediaType;
  media_product_type?: string;
  permalink?: string;
  timestamp: string; // ISO 8601
  like_count?: number;
  comments_count?: number;
}

/** Account-level profile fields. */
export interface Account {
  id: string;
  username: string;
  name?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

/** A single value in a Graph API insights time series. */
export interface InsightValue {
  value: number;
  end_time?: string;
}

/** One insights metric with its time series of values. */
export interface InsightMetric {
  name: string;
  period: string;
  values: InsightValue[];
  title?: string;
  description?: string;
}

/** Everything fetched for one analysis run. */
export interface AccountSnapshot {
  account: Account;
  media: Media[];
  accountInsights: InsightMetric[];
}
