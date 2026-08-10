import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  ENV: z.enum(["dev", "production"]),
  PORT: z.coerce.number().min(1).max(65535),
  DEV_DATABASE_URI: z.string().url(),
  PROD_DATABASE_URI: z.string().url(),
  DB_CONNECTION_INTERVAL: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_FILE_PATH: z.string().default("logs/app.log"),
});

const env = EnvSchema.parse(process.env);

export const config = {
  port: env.PORT,
  env: env.ENV,
  databaseUri: env.ENV === "dev" ? env.DEV_DATABASE_URI : env.PROD_DATABASE_URI,
  dbConnectionInterval: env.DB_CONNECTION_INTERVAL,
  logLevel: env.LOG_LEVEL,
  logFilePath: env.LOG_FILE_PATH,
};