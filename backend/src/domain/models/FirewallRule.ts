import { IFirewallRule } from './IFirewallRule';
import { RuleType } from './RuleType';

export type Mode = 'blacklist' | 'whitelist';

export abstract class FirewallRule<T extends string | number> implements IFirewallRule<T> {
  constructor(
    protected readonly _id: number,
    protected readonly _value: T,
    protected _active: boolean,
    protected readonly _mode: Mode
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

  get mode(): Mode {
    return this._mode;
  }

  abstract get type(): RuleType;

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

  toDetailedJSON(): { id: number; type: RuleType; mode: Mode; value: T; active: boolean } {
    return {
      id: this.id,
      type: this.type,
      mode: this.mode,
      value: this.value,
      active: this.active,
    };
  }
}

export type AnyFirewallRule = FirewallRule<string | number>;
