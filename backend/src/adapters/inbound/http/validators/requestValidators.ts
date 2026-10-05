import { z } from 'zod';
import { RuleValidationError } from '../../../../application/errors/RuleValidationError';
import { RULE_VALIDATION_ERRORS } from '../../../../application/errors/ruleValidationErrors';
import { RuleType } from '../../../../domain/models/RuleType';

/**
 * Request-shape and primitive runtime-type validation for the HTTP boundary.
 *
 * Zod owns this tier only: is the field there, is it an array, is each element
 * the right JavaScript type. Whether a well-typed value is *semantically* valid
 * (real IPv4, bare domain, port in range) stays in the domain validators, which
 * FirewallService reaches through the factory.
 *
 * Zod issues are never surfaced raw. Each schema is paired with the error the
 * API already documents, so the response format is unchanged.
 */
const valuesShapeSchema = z.array(z.unknown()).min(1);
const idsSchema = z.array(z.number().int()).min(1);
const activeSchema = z.boolean();
const modeSchema = z.enum(['blacklist', 'whitelist']);

/**
 * The JavaScript type each rule type requires of a raw request element. A wrong
 * type here must never reach the domain validators, which would otherwise be
 * asked to call string methods on a number or an object.
 */
const ELEMENT_SCHEMAS: Record<RuleType, z.ZodType> = {
  [RuleType.IP]: z.string(),
  [RuleType.DOMAIN]: z.string(),
  [RuleType.PORT]: z.number().int(),
};

/**
 * Checks the values envelope, and — when the rule type is known — that every
 * element carries the right runtime type. The type-specific failure reuses the
 * rule type's documented code, so a wrongly typed element and a semantically
 * invalid one look identical to the client.
 */
export function validateValues(values: unknown, type?: RuleType): void {
  if (!valuesShapeSchema.safeParse(values).success) {
    throw new RuleValidationError(
      'INVALID_VALUES',
      'Values must be a non-empty array.'
    );
  }

  if (type === undefined) {
    return;
  }

  if (!z.array(ELEMENT_SCHEMAS[type]).safeParse(values).success) {
    const { code, message } = RULE_VALIDATION_ERRORS[type];
    throw new RuleValidationError(code, message);
  }
}

export function validateIds(ids: unknown): void {
  if (!idsSchema.safeParse(ids).success) {
    throw new RuleValidationError(
      'INVALID_IDS',
      'Ids must be a non-empty array of integers.'
    );
  }
}

export function validateActive(active: unknown): void {
  if (!activeSchema.safeParse(active).success) {
    throw new RuleValidationError(
      'INVALID_ACTIVE',
      'Active must be a boolean.'
    );
  }
}

export function validateMode(mode: unknown): void {
  if (!modeSchema.safeParse(mode).success) {
    throw new RuleValidationError(
      'INVALID_MODE',
      "Mode must be either 'blacklist' or 'whitelist'."
    );
  }
}
