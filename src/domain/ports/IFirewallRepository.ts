import { FirewallRule } from '../models/FirewallRule';

export type AnyFirewallRule = FirewallRule<string | number>;

export interface IFirewallRepository {
  getNextId(): number;
  getAll(): AnyFirewallRule[];
  getById(id: number): AnyFirewallRule | undefined;
  add(rule: AnyFirewallRule): AnyFirewallRule;
  remove(id: number): boolean;
  update(id: number, updatedRule: AnyFirewallRule): AnyFirewallRule | undefined;
}