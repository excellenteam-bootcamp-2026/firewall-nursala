import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { ruleTypes } from "../src/adapters/outbound/persistence/drizzle/schema";
import { config } from "../src/main/config/env";
import { RULE_TYPE_IDS } from "../src/adapters/outbound/persistence/drizzle/firewallRuleMapper";
import { RuleType } from "../src/domain/models/RuleType";

// The seed targets whichever database the validated config selects, so it can
// never disagree with the URI the application itself uses.
const client = postgres(config.databaseUri, { max: 1 });
const db = drizzle(client);

async function seedRuleTypes(): Promise<void> {
  // Ids come from the mapper, so the seeded rows and the persistence mapping
  // cannot drift apart. onConflictDoNothing keeps repeated runs idempotent.
  const values = Object.values(RuleType).map((type: RuleType) => ({
    id: RULE_TYPE_IDS[type],
    name: type,
  }));

  await db.insert(ruleTypes).values(values).onConflictDoNothing();

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
