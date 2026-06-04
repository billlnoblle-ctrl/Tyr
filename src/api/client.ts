import type { Config } from "../config.js";
import type { Account, InsightMetric, Media } from "../types.js";

interface GraphError {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface Paged<T> {
  data: T[];
  paging?: { next?: string; cursors?: { after?: string } };
}

/**
 * Thin client over the Instagram Graph API.
 * Docs: https://developers.facebook.com/docs/instagram-api
 */
export class InstagramClient {
  private readonly base: string;

  constructor(private readonly config: Config) {
    this.base = `https://graph.facebook.com/${config.graphVersion}`;
  }

  /** Perform a GET request against the Graph API and parse JSON. */
  private async get<T>(
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    const url = new URL(`${this.base}/${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    url.searchParams.set("access_token", this.config.accessToken);

    const res = await fetch(url);
    const body = (await res.json()) as T & GraphError;

    if (!res.ok || body.error) {
      const e = body.error;
      const detail = e
        ? `${e.message} (type=${e.type}, code=${e.code}${
            e.error_subcode ? `, subcode=${e.error_subcode}` : ""
          })`
        : `HTTP ${res.status}`;
      throw new Error(`Instagram Graph API error: ${detail}`);
    }
    return body;
  }

  /** Fetch profile-level fields for the configured account. */
  async getAccount(): Promise<Account> {
    return this.get<Account>(this.config.userId, {
      fields: "id,username,name,followers_count,follows_count,media_count",
    });
  }

  /**
   * Fetch up to `limit` recent media items, following pagination as needed.
   */
  async getMedia(limit = 50): Promise<Media[]> {
    const fields =
      "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count";
    const collected: Media[] = [];
    const pageSize = Math.min(limit, 100);

    let page = await this.get<Paged<Media>>(`${this.config.userId}/media`, {
      fields,
      limit: pageSize,
    });

    while (true) {
      collected.push(...page.data);
      if (collected.length >= limit || !page.paging?.next) break;
      const next = await fetch(page.paging.next);
      page = (await next.json()) as Paged<Media>;
    }

    return collected.slice(0, limit);
  }

  /**
   * Fetch account-level insights. Defaults to follower count, reach, and
   * profile views over the trailing period. Metric availability varies by
   * Graph API version and account type; failures are returned as an empty
   * list rather than thrown so a partial report can still render.
   */
  async getAccountInsights(
    metrics: string[] = ["reach", "follower_count", "profile_views"],
    period = "day",
    days = 30,
  ): Promise<InsightMetric[]> {
    const since = Math.floor(Date.now() / 1000) - days * 86400;
    try {
      const res = await this.get<{ data: InsightMetric[] }>(
        `${this.config.userId}/insights`,
        {
          metric: metrics.join(","),
          period,
          since,
          until: Math.floor(Date.now() / 1000),
        },
      );
      return res.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Warning: could not fetch account insights — ${message}`);
      return [];
    }
  }
}
