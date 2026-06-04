import "dotenv/config";

export interface Config {
  accessToken: string;
  userId: string;
  graphVersion: string;
}

/**
 * Load and validate configuration from environment variables (.env file).
 * Throws a friendly error if required values are missing.
 */
export function loadConfig(): Config {
  const accessToken = process.env.IG_ACCESS_TOKEN?.trim();
  const userId = process.env.IG_USER_ID?.trim();
  const graphVersion = process.env.IG_GRAPH_VERSION?.trim() || "v21.0";

  const missing: string[] = [];
  if (!accessToken) missing.push("IG_ACCESS_TOKEN");
  if (!userId) missing.push("IG_USER_ID");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}.\n` +
        `Copy .env.example to .env and fill in your credentials. ` +
        `See README.md for how to obtain them.`,
    );
  }

  return { accessToken: accessToken!, userId: userId!, graphVersion };
}
