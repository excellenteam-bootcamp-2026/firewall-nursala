import { RuleType } from '../../domain/models/RuleType';
import { AnyFirewallRule, Mode } from '../../domain/models/FirewallRule';
import { IpRule } from '../../domain/models/IpRule';
import { DomainRule } from '../../domain/models/DomainRule';
import { PortRule } from '../../domain/models/PortRule';
import {
  isValidDomain,
  isValidIp,
  isValidPort,
} from '../../domain/validation/ruleValidators';

export class FirewallRuleFactory {
  create(
    type: RuleType,
    id: number,
    value: string | number,
    active: boolean,
    mode: Mode,
  ): AnyFirewallRule {
    switch (type) {
      case RuleType.IP:
        return new IpRule(id, value as string, active, mode);
      case RuleType.DOMAIN:
        return new DomainRule(id, value as string, active, mode);
      case RuleType.PORT:
        return new PortRule(id, value as number, active, mode);
      default:
        throw new Error(`Unsupported rule type: ${type}`);
    }
  }

  isValid(type: RuleType, value: string | number): boolean {
    switch (type) {
      case RuleType.IP:
        return isValidIp(value);
      case RuleType.DOMAIN:
        return isValidDomain(value);
      case RuleType.PORT:
        return isValidPort(value);
      default:
        throw new Error(`Unsupported rule type: ${type}`);
    }
  }
}
