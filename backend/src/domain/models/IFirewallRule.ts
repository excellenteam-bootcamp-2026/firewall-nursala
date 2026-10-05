export interface IFirewallRule<T extends string | number> {
  id: number;
  value: T;
  active: boolean;
}