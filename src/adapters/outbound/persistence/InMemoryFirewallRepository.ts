import {
  IFirewallRepository,
  AnyFirewallRule,
} from "../../../application/ports/IFirewallRepository";
import { FirewallRuleFactory } from "../../../application/factories/FirewallRuleFactory";
import { Mode } from "../../../domain/models/FirewallRule";
import { RuleType } from "../../../domain/models/RuleType";

export class InMemoryFirewallRepository implements IFirewallRepository {
  private rules: AnyFirewallRule[] = [];
  private currentId: number = 1;

  constructor(private readonly factory: FirewallRuleFactory) {}

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
    const rule = this.factory.create(type, this.currentId, value, active, mode);
    this.rules.push(rule);
    this.currentId += 1;
    return rule;
  }

  remove(id: number): boolean {
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) return false;
    this.rules.splice(index, 1);
    return true;
  }

  update(
    id: number,
    updatedRule: AnyFirewallRule,
  ): AnyFirewallRule | undefined {
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) return undefined;
    this.rules[index] = updatedRule;
    return updatedRule;
  }
}
