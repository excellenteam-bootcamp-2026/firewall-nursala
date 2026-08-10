import { AnyFirewallRule, Mode } from '../../domain/models/FirewallRule';
import { RuleType } from '../../domain/models/RuleType';

export type { AnyFirewallRule } from '../../domain/models/FirewallRule';

export interface IFirewallRepository {
  getAll(): AnyFirewallRule[];
  getById(id: number): AnyFirewallRule | undefined;
  create(
    type: RuleType,
    value: string | number,
    active: boolean,
    mode: Mode,
  ): AnyFirewallRule;
  remove(id: number): boolean;
  update(id: number, updatedRule: AnyFirewallRule): AnyFirewallRule | undefined;
}
