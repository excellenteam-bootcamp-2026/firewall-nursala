import { FirewallRule } from './FirewallRule';
import { RuleType } from './RuleType';

export class PortRule extends FirewallRule<number> {
  get type(): RuleType {
    return RuleType.PORT;
  }

  isValid(): boolean {
    return Number.isInteger(this.value) && this.value >= 1 && this.value <= 65535;
  }
}