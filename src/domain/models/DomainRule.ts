import { FirewallRule } from './FirewallRule';
import { RuleType } from './RuleType';

export class DomainRule extends FirewallRule<string> {
  get type(): RuleType {
    return RuleType.DOMAIN;
  }

  isValid(): boolean {
    // Every label must start and end with an alphanumeric character,
    // so a leading or trailing hyphen is rejected in any label, not just the first.
    const domainPattern =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
    return domainPattern.test(this.value);
  }
}