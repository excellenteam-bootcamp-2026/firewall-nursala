import { AnyFirewallRule } from '../../domain/ports/IFirewallRepository';
import { RuleType } from '../../domain/models/RuleType';
import { IpRule } from '../../domain/models/IpRule';
import { DomainRule } from '../../domain/models/DomainRule';
import { PortRule } from '../../domain/models/PortRule';

export class FirewallRuleFactory {
  create(
    type: RuleType,
    id: number,
    value: string | number,
    active: boolean,
  ): AnyFirewallRule {
    switch (type) {
      case RuleType.IP:
        return new IpRule(id, value as string, active);
      case RuleType.DOMAIN:
        return new DomainRule(id, value as string, active);
      case RuleType.PORT:
        return new PortRule(id, value as number, active);
      default:
        throw new Error(`Unsupported rule type: ${type}`);
    }
  }
}
