import {
  AnyFirewallRule,
  IFirewallRepository,
} from '../../src/application/ports/IFirewallRepository';
import { FirewallService } from '../../src/application/services/FirewallService';
import { FirewallRule, Mode } from '../../src/domain/models/FirewallRule';
import { RuleType } from '../../src/domain/models/RuleType';

/**
 * A rule test double with fully controllable validity and type.
 *
 * It extends the abstract FirewallRule because that base declares protected
 * members, which makes TypeScript's structural typing reject any stand-in that
 * does not inherit from it. The base is a dependency-free data holder (already
 * covered by the domain-layer tests), so this stays a unit-level double: it
 * replaces the concrete IpRule/DomainRule/PortRule validation logic, which is
 * what these service tests must not depend on.
 */
export class StubRule extends FirewallRule<string | number> {
  constructor(
    id: number,
    value: string | number,
    active: boolean,
    mode: Mode,
    private readonly ruleType: RuleType,
    private readonly valid: boolean,
  ) {
    super(id, value, active, mode);
  }

  get type(): RuleType {
    return this.ruleType;
  }

  isValid(): boolean {
    return this.valid;
  }
}

/**
 * In-memory IFirewallRepository double with per-instance state and call
 * tracking, so tests can assert that a method was never reached at all.
 */
export class MockFirewallRepository implements IFirewallRepository {
  private rules: AnyFirewallRule[] = [];
  private nextId = 1;

  readonly createCalls: Array<{
    type: RuleType;
    value: string | number;
    active: boolean;
    mode: Mode;
  }> = [];
  readonly removeCalls: number[] = [];
  readonly updateCalls: Array<{ id: number; rule: AnyFirewallRule }> = [];

  getAll(): AnyFirewallRule[] {
    return [...this.rules];
  }

  getById(id: number): AnyFirewallRule | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  create(
    type: RuleType,
    value: string | number,
    active: boolean,
    mode: Mode,
  ): AnyFirewallRule {
    this.createCalls.push({ type, value, active, mode });
    const rule = new StubRule(
      this.nextId,
      value,
      active,
      mode,
      type,
      true,
    );
    this.rules.push(rule);
    this.nextId += 1;
    return rule;
  }

  remove(id: number): boolean {
    this.removeCalls.push(id);
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) {
      return false;
    }
    this.rules.splice(index, 1);
    return true;
  }

  update(id: number, updatedRule: AnyFirewallRule): AnyFirewallRule | undefined {
    this.updateCalls.push({ id, rule: updatedRule });
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) {
      return undefined;
    }
    this.rules[index] = updatedRule;
    return updatedRule;
  }

  /** Places rules directly into storage, bypassing create() so call tracking stays clean. */
  seed(...rules: AnyFirewallRule[]): void {
    this.rules.push(...rules);
  }
}

/**
 * Stands in for FirewallRuleFactory. It is structurally compatible because the
 * real factory has no private state, so no inheritance is needed.
 * Values registered via markInvalid() are reported as invalid creation data.
 */
export class MockFirewallRuleFactory {
  private readonly invalidValues = new Set<string | number>();

  readonly validationCalls: Array<{
    type: RuleType;
    value: string | number;
  }> = [];

  markInvalid(...values: (string | number)[]): void {
    values.forEach((value) => this.invalidValues.add(value));
  }

  create(
    type: RuleType,
    id: number,
    value: string | number,
    active: boolean,
    mode: Mode,
  ): AnyFirewallRule {
    return new StubRule(id, value, active, mode, type, !this.invalidValues.has(value));
  }

  isValid(type: RuleType, value: string | number): boolean {
    this.validationCalls.push({ type, value });
    return !this.invalidValues.has(value);
  }
}

/** Builds a FirewallService wired to fresh doubles. Call once per test. */
export function createTestService(): {
  service: FirewallService;
  repository: MockFirewallRepository;
  factory: MockFirewallRuleFactory;
} {
  const repository = new MockFirewallRepository();
  const factory = new MockFirewallRuleFactory();
  const service = new FirewallService(repository, factory);

  return { service, repository, factory };
}

/** Builds a valid StubRule for seeding a repository directly. */
export function stubRule(
  id: number,
  value: string | number,
  type: RuleType,
  active = true,
  mode: Mode = 'blacklist',
): StubRule {
  return new StubRule(id, value, active, mode, type, true);
}
