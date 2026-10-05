import { FirewallRule } from './FirewallRule';
import { RuleType } from './RuleType';
import { isValidPort } from '../validation/ruleValidators';

export class PortRule extends FirewallRule<number> {
  get type(): RuleType {
    return RuleType.PORT;
  }

  isValid(): boolean {
    return isValidPort(this.value);
  }
}
