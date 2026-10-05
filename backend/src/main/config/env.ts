import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  ENV: z.enum(["dev", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  DEV_DATABASE_URI: z.string().url(),
  PROD_DATABASE_URI: z.string().url(),
  DB_CONNECTION_INTERVAL: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  LOG_FILE_PATH: z.string().default("logs/app.log"),
});

// Parsing at import time is deliberate: an invalid environment must stop the
// process during startup rather than surface as a failure on the first request.
const env = EnvSchema.parse(process.env);

/**
 * The runtime environment decides the logging level, so a stray LOG_LEVEL
 * cannot put production into debug. Development defaults to debug so that all
 * messages are visible, while still allowing an explicit override.
 */
const logLevel = env.ENV === "production" ? "info" : (env.LOG_LEVEL ?? "debug");

export const config = {
  port: env.PORT,
  env: env.ENV,
  databaseUri: env.ENV === "dev" ? env.DEV_DATABASE_URI : env.PROD_DATABASE_URI,
  dbConnectionInterval: env.DB_CONNECTION_INTERVAL,
  logLevel,
  logFilePath: env.LOG_FILE_PATH,
};
