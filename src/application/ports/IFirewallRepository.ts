import { AnyFirewallRule, Mode } from '../../domain/models/FirewallRule';
import { RuleType } from '../../domain/models/RuleType';

export type { AnyFirewallRule } from '../../domain/models/FirewallRule';

export interface IFirewallRepository {
  getAll(): Promise<AnyFirewallRule[]>;
  getById(id: number): Promise<AnyFirewallRule | undefined>;
  create(
    type: RuleType,
    value: string | number,
    active: boolean,
    mode: Mode,
  ): Promise<AnyFirewallRule>;
  remove(id: number): Promise<boolean>;
  update(
    id: number,
    updatedRule: AnyFirewallRule,
  ): Promise<AnyFirewallRule | undefined>;
}
