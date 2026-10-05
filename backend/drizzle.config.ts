import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { config } from "./src/main/config/env";
const databaseUrl = config.databaseUri;

if (!databaseUrl) {
  throw new Error("Database URI is not configured");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/adapters/outbound/persistence/drizzle/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
