import { logger, LogSeverity } from "./logging.ts";
import { DEFAULT_PORT, startServer } from "./server.ts";

const environment = Deno.env.get("ENVIRONMENT") || "development";

logger.setUpLogger(
  environment,
  environment === "development" ? LogSeverity.DEFAULT : LogSeverity.INFO,
);

const requiredEnv = <T>(
  name: string,
  typeFn: (s: string) => T,
  fallback?: T,
): T => {
  const env = Deno.env.get(name);
  if (env === undefined && fallback === undefined) {
    throw Error(`Environment variable "${name}" is required`);
  } else {
    return env !== undefined ? typeFn(env) : fallback!;
  }
};

const asBoolean = (str: string) => /^true$/i.test(str);

const serverConfigFromEnv = () => {
  const fake = requiredEnv("FAKE", asBoolean, false); // For local development. If set, the API returns dummy data
  return {
    port: requiredEnv("PORT", Number, DEFAULT_PORT),
    fake,
    novuConfig: {
      apiKey: requiredEnv(
        "NOVU_API_KEY",
        String,
        fake ? "dummy value" : undefined,
      ),
      apiUrl: requiredEnv(
        "NOVU_API_URL",
        String,
        fake ? "dummy value" : undefined,
      ),
    },
  };
};

await startServer(serverConfigFromEnv());
