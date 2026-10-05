import { FirewallRule } from './FirewallRule';
import { RuleType } from './RuleType';
import { isValidDomain } from '../validation/ruleValidators';

export class DomainRule extends FirewallRule<string> {
  get type(): RuleType {
    return RuleType.DOMAIN;
  }

  isValid(): boolean {
    return isValidDomain(this.value);
  }
}
