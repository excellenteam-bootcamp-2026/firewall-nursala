import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const firewallModeEnum = pgEnum("firewall_mode", [
  "blacklist",
  "whitelist",
]);

export const ruleTypes = pgTable("rule_types", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const firewallRules = pgTable("firewall_rules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  typeId: integer("type_id")
    .notNull()
    .references(() => ruleTypes.id),
  mode: firewallModeEnum("mode").notNull(),
  value: text("value").notNull(),
  active: boolean("active").notNull().default(true),
});