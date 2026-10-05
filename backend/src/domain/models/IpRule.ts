import { FirewallRule } from './FirewallRule';
import { RuleType } from './RuleType';
import { isValidIp } from '../validation/ruleValidators';

export class IpRule extends FirewallRule<string> {
  get type(): RuleType {
    return RuleType.IP;
  }

  isValid(): boolean {
    return isValidIp(this.value);
  }
}
