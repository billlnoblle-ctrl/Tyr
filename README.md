# Tyr

A command-line tool to analyze Instagram **Business/Creator** accounts and
compute the metrics that matter: engagement, growth & reach, posting patterns,
and top-performing content.

Tyr uses the **official [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)** —
it does **not** scrape Instagram. That means it's stable and compliant with
Instagram's Terms of Service, but it can only analyze accounts you own or
manage (a Business or Creator account connected to a Facebook Page).

## Features

- **Engagement** — per-post and average likes, comments, interactions, and
  engagement rate (interactions ÷ followers).
- **Growth & reach** — account-level insight trends (reach, follower count,
  profile views) with net change over the period.
- **Posting patterns** — best day and hour to post, posting frequency, and a
  per-day breakdown of average engagement.
- **Top content** — your best/worst performing posts and a comparison of
  performance by media type (Reels vs Feed vs Carousel).
- Text report (default) or `--json` for piping into other tools.

## Requirements

- Node.js 18+ (uses the built-in `fetch`)
- An Instagram **Business** or **Creator** account connected to a Facebook Page
- A Meta app with a long-lived access token

## Setup

```bash
git clone <this-repo>
cd Tyr
npm install
cp .env.example .env   # then fill in your credentials
```

### Getting your credentials

1. Create a Meta app at <https://developers.facebook.com/apps>.
2. Connect your Instagram Business/Creator account to a Facebook Page.
3. Using the [Graph API Explorer](https://developers.facebook.com/tools/explorer/),
   generate a **User access token** with these permissions:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
4. Exchange it for a **long-lived token** (valid ~60 days) — see
   [Meta's long-lived token guide](https://developers.facebook.com/docs/instagram-api/guides/access-tokens).
5. Find your **Instagram Business Account ID** (the numeric IG user id):
   `GET /me/accounts` → pick your Page → `GET /{page-id}?fields=instagram_business_account`.

Put the token and id in `.env`:

```
IG_ACCESS_TOKEN=EAAG...your-long-lived-token...
IG_USER_ID=17841400000000000
IG_GRAPH_VERSION=v21.0
```

> ⚠️ Never commit your `.env`. It's already in `.gitignore`.

## Usage

Run directly with `tsx` (no build step):

```bash
npm run dev -- --limit 30
```

Or build once and run the compiled CLI:

```bash
npm run build
node dist/index.js --limit 30
# or, after `npm link`:
tyr --limit 30
```

### Options

| Option            | Description                                         | Default |
| ----------------- | --------------------------------------------------- | ------- |
| `-l, --limit <n>` | Number of recent posts to analyze                   | `50`    |
| `--json`          | Output the raw analysis as JSON instead of a report | off     |
| `-h, --help`      | Show help                                           |         |

### Example output

```
============================================================
  Instagram Analytics — @demo (Demo Co)
============================================================

Followers:   5,000
Analyzed:    30 most recent posts

── Engagement ────────────────────────────────────────────
Avg engagement rate: 5.48% of followers
Avg interactions:    274.0 per post
...

── Posting Patterns ──────────────────────────────────────
Best day:  Monday (602.0 avg interactions)
Best hour: 09:00 (602.0 avg interactions)
...

── Top Content ───────────────────────────────────────────
Best performing posts:
  1. 602 interactions (540❤ 62💬) — New reel!
...
```

## Development

```bash
npm run typecheck   # type-check without emitting
npm test            # run unit tests (no credentials needed)
npm run build       # compile to dist/
```

The metric calculations live in `src/metrics/` and are pure functions, so they
are unit-tested against mock data without hitting the API
(`src/metrics/metrics.test.ts`).

## Project structure

```
src/
  index.ts              CLI entry point + argument parsing
  config.ts             Loads & validates env credentials
  analyze.ts            Orchestrates fetch + metric computation
  report.ts             Renders the text report
  types.ts              Shared domain types
  api/client.ts         Instagram Graph API client (fetch + pagination)
  metrics/
    engagement.ts       Likes/comments/interactions + engagement rate
    growth.ts           Account insight trends (reach, followers, ...)
    postingPatterns.ts  Best day/hour, frequency
    topContent.ts       Post ranking + per-media-type breakdown
    metrics.test.ts     Unit tests for the metric functions
```

## Notes & caveats

- **Metric availability varies** by Graph API version and account type. Some
  insight metrics (e.g. `impressions`) have been deprecated or renamed across
  versions; if account insights can't be fetched, Tyr prints a warning and
  still renders the rest of the report from media data.
- **Timezones**: posting-pattern times use the host machine's local timezone.
- **Rate limits**: the Graph API enforces per-app rate limits. Use `--limit`
  to keep requests modest.
