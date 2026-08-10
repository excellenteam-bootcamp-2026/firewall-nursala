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

  async getAll(): Promise<AnyFirewallRule[]> {
    return [...this.rules];
  }

  async getById(id: number): Promise<AnyFirewallRule | undefined> {
    return this.rules.find((rule) => rule.id === id);
  }

  async create(
    type: RuleType,
    value: string | number,
    active: boolean,
    mode: Mode,
  ): Promise<AnyFirewallRule> {
    const rule = this.factory.create(type, this.currentId, value, active, mode);
    this.rules.push(rule);
    this.currentId += 1;
    return rule;
  }

  async remove(id: number): Promise<boolean> {
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) return false;
    this.rules.splice(index, 1);
    return true;
  }

  async update(
    id: number,
    updatedRule: AnyFirewallRule,
  ): Promise<AnyFirewallRule | undefined> {
    const index = this.rules.findIndex((rule) => rule.id === id);
    if (index === -1) return undefined;
    this.rules[index] = updatedRule;
    return updatedRule;
  }
}
