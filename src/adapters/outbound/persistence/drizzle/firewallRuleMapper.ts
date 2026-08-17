import { FirewallRuleFactory } from "../../../../application/factories/FirewallRuleFactory";
import { AnyFirewallRule, Mode } from "../../../../domain/models/FirewallRule";
import { RuleType } from "../../../../domain/models/RuleType";

/**
 * Translation between the persisted row shape and the existing domain rules.
 *
 * This is the only place that knows about type_id or that `value` is stored as
 * text: neither FirewallService, IFirewallRepository, nor the domain classes
 * ever see a Drizzle row.
 */

/** Mirrors the rows created by scripts/seed.ts. */
export const RULE_TYPE_IDS: Record<RuleType, number> = {
  [RuleType.IP]: 1,
  [RuleType.DOMAIN]: 2,
  [RuleType.PORT]: 3,
};

const RULE_TYPES_BY_ID = new Map<number, RuleType>(
  Object.values(RuleType).map((type) => [RULE_TYPE_IDS[type], type]),
);

export interface FirewallRuleRow {
  id: number;
  typeId: number;
  mode: Mode;
  value: string;
  active: boolean;
}

export function toRuleTypeId(type: RuleType): number {
  return RULE_TYPE_IDS[type];
}

/**
 * The column is text so that one table can hold every rule type; ports are
 * decoded back to numbers on the way out, which is what PortRule expects.
 */
export function encodeValue(value: string | number): string {
  return String(value);
}

function decodeValue(type: RuleType, value: string): string | number {
  return type === RuleType.PORT ? Number(value) : value;
}

/** Rebuilds the correct domain subtype, keeping the id PostgreSQL generated. */
export function toDomainRule(
  row: FirewallRuleRow,
  factory: FirewallRuleFactory,
): AnyFirewallRule {
  const type = RULE_TYPES_BY_ID.get(row.typeId);

  if (type === undefined) {
    throw new Error(`Unknown rule type id: ${row.typeId}`);
  }

  return factory.create(
    type,
    row.id,
    decodeValue(type, row.value),
    row.active,
    row.mode,
  );
}
