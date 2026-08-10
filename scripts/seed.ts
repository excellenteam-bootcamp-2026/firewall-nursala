import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { ruleTypes } from "../src/adapters/outbound/persistence/drizzle/schema";

const databaseUrl =
  process.env.ENV === "production"
    ? process.env.PROD_DATABASE_URI
    : process.env.DEV_DATABASE_URI;

if (!databaseUrl) {
  throw new Error("Database URI is not configured");
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

async function seedRuleTypes(): Promise<void> {
  await db
    .insert(ruleTypes)
    .values([
      { id: 1, name: "ip" },
      { id: 2, name: "domain" },
      { id: 3, name: "port" },
    ])
    .onConflictDoNothing();

  console.log("Rule types seeded successfully.");
}

seedRuleTypes()
  .catch((error) => {
    console.error("Failed to seed rule types:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });