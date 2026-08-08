import { IFirewallRule } from './IFirewallRule';

export abstract class FirewallRule<T extends string | number> implements IFirewallRule<T> {
  constructor(
    protected readonly _id: number,
    protected readonly _value: T,
    protected _active: boolean = true
  ) {}

  get id(): number {
    return this._id;
  }

  get value(): T {
    return this._value;
  }

  get active(): boolean {
    return this._active;
  }

  setActive(value: boolean): void {
    this._active = value;
  }

  abstract isValid(): boolean;
  toJSON(): IFirewallRule<T> {
  return {
    id: this.id,
    value: this.value,
    active: this.active,
  };
}
}