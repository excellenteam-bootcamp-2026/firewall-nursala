import { eq } from "drizzle-orm";
import {
  AnyFirewallRule,
  IFirewallRepository,
} from "../../../../application/ports/IFirewallRepository";
import { FirewallRuleFactory } from "../../../../application/factories/FirewallRuleFactory";
import { Mode } from "../../../../domain/models/FirewallRule";
import { RuleType } from "../../../../domain/models/RuleType";
import { FirewallDatabase } from "./database";
import { firewallRules } from "./schema";
import { encodeValue, toDomainRule, toRuleTypeId } from "./firewallRuleMapper";

/**
 * PostgreSQL-backed implementation of the same application port that
 * InMemoryFirewallRepository implements, so FirewallService is unaffected by
 * which one the composition root selects.
 *
 * Ids are owned by the database: inserts omit the column and read back the
 * generated identity via RETURNING.
 */
export class PostgresFirewallRepository implements IFirewallRepository {
  constructor(
    private readonly db: FirewallDatabase,
    private readonly factory: FirewallRuleFactory,
  ) {}

  async getAll(): Promise<AnyFirewallRule[]> {
    const rows = await this.db.select().from(firewallRules);

    return rows.map((row) => toDomainRule(row, this.factory));
  }

  async getById(id: number): Promise<AnyFirewallRule | undefined> {
    const rows = await this.db
      .select()
      .from(firewallRules)
      .where(eq(firewallRules.id, id))
      .limit(1);

    const row = rows[0];

    return row ? toDomainRule(row, this.factory) : undefined;
  }

  async create(
    type: RuleType,
    value: string | number,
    active: boolean,
    mode: Mode,
  ): Promise<AnyFirewallRule> {
    const rows = await this.db
      .insert(firewallRules)
      .values({
        typeId: toRuleTypeId(type),
        mode,
        value: encodeValue(value),
        active,
      })
      .returning();

    const row = rows[0];

    if (!row) {
      throw new Error("Inserting the firewall rule returned no row.");
    }

    return toDomainRule(row, this.factory);
  }

  async remove(id: number): Promise<boolean> {
    const removed = await this.db
      .delete(firewallRules)
      .where(eq(firewallRules.id, id))
      .returning({ id: firewallRules.id });

    return removed.length > 0;
  }

  async update(
    id: number,
    updatedRule: AnyFirewallRule,
  ): Promise<AnyFirewallRule | undefined> {
    const rows = await this.db
      .update(firewallRules)
      .set({
        typeId: toRuleTypeId(updatedRule.type),
        mode: updatedRule.mode,
        value: encodeValue(updatedRule.value),
        active: updatedRule.active,
      })
      .where(eq(firewallRules.id, id))
      .returning();

    const row = rows[0];

    return row ? toDomainRule(row, this.factory) : undefined;
  }
}
