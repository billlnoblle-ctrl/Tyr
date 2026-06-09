#!/usr/bin/env node
import { analyzeAccount } from "./analyze.js";
import { loadConfig } from "./config.js";
import { renderAdCandidates, renderReport } from "./report.js";

interface CliArgs {
  limit: number;
  commentPosts: number;
  json: boolean;
  adsOnly: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    limit: 50,
    commentPosts: 5,
    json: false,
    adsOnly: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "-l":
      case "--limit": {
        const value = Number(argv[++i]);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`--limit expects a positive number, got "${argv[i]}"`);
        }
        args.limit = Math.floor(value);
        break;
      }
      case "--comments": {
        const value = Number(argv[++i]);
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(
            `--comments expects a non-negative number, got "${argv[i]}"`,
          );
        }
        args.commentPosts = Math.floor(value);
        break;
      }
      case "--no-comments":
        args.commentPosts = 0;
        break;
      case "--ads-only":
        args.adsOnly = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

const HELP = `tyr — Instagram account analytics (official Graph API)

Usage:
  tyr [options]

Options:
  -l, --limit <n>     Number of recent posts to analyze (default: 50)
      --comments <n>  Pull comments from your top N posts (default: 5, 0 to skip)
      --no-comments   Skip comment analysis entirely
      --ads-only      Show only the "best posts to advertise" recommendations
      --json          Output raw analysis as JSON instead of a text report
  -h, --help          Show this help

Configuration:
  Requires IG_ACCESS_TOKEN and IG_USER_ID (see .env.example / README.md).
  Comment analysis additionally needs the instagram_manage_comments scope.
`;

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.error("\n" + HELP);
    process.exit(2);
  }

  if (args.help) {
    console.log(HELP);
    return;
  }

  const config = loadConfig();
  const analysis = await analyzeAccount(config, {
    limit: args.limit,
    // --ads-only doesn't use comments, so skip those requests entirely.
    commentPosts: args.adsOnly ? 0 : args.commentPosts,
  });

  if (args.json) {
    const out = args.adsOnly ? analysis.adCandidates : analysis;
    console.log(JSON.stringify(out, null, 2));
  } else if (args.adsOnly) {
    console.log(renderAdCandidates(analysis));
  } else {
    console.log(renderReport(analysis));
  }
}

main().catch((err) => {
  console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
