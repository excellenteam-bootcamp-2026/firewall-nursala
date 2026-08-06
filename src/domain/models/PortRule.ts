import { FirewallRule } from './FirewallRule';

export class PortRule extends FirewallRule<number> {
  isValid(): boolean {
    return Number.isInteger(this.value) && this.value >= 1 && this.value <= 65535;
  }
}