import { FirewallRule } from './FirewallRule';
import { RuleType } from './RuleType';

export class IpRule extends FirewallRule<string> {
  get type(): RuleType {
    return RuleType.IP;
  }

  isValid(): boolean {
    const parts = this.value.split('.');

    if (parts.length !== 4) {
      return false;
    }

    return parts.every((part: string) => {
      if (part === '' || !/^\d+$/.test(part)) {
        return false;
      }
      // Reject leading zeros ("01") while still allowing a bare "0".
      if (part.length > 1 && part.startsWith('0')) {
        return false;
      }
      const number = Number(part);
      return number >= 0 && number <= 255;
    });
  }
}