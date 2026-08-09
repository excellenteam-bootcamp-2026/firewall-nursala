import {
  IFirewallRepository,
  AnyFirewallRule,
} from "../../domain/ports/IFirewallRepository";
import { RuleType } from "../../domain/models/RuleType";
import { Mode } from "../../domain/models/FirewallRule";
import { RuleValidationError } from "../errors/RuleValidationError";
import { RuleNotFoundError } from "../errors/RuleNotFoundError";
import { FirewallRuleFactory } from "../factories/FirewallRuleFactory";

const VALIDATION_ERRORS: Record<RuleType, { code: string; message: string }> = {
  [RuleType.IP]: {
    code: "INVALID_IP",
    message: "IPs must be valid IPv4 addresses.",
  },
  [RuleType.DOMAIN]: {
    code: "INVALID_DOMAIN",
    message: "Domains must be valid domain names.",
  },
  [RuleType.PORT]: {
    code: "INVALID_PORT",
    message: "Ports must be integers between 1 and 65535.",
  },
};

export class FirewallService {
  constructor(
    private repository: IFirewallRepository,
    private factory: FirewallRuleFactory,
  ) {}

  addRule(
    values: (string | number)[],
    type: RuleType,
    active: boolean,
    mode: Mode,
  ): AnyFirewallRule[] {
    const rules = values.map((value) => {
      const id = this.repository.getNextId();
      return this.factory.create(type, id, value, active, mode);
    });

    const invalidRule = rules.find((rule) => !rule.isValid());
    if (invalidRule) {
      const { code, message } = VALIDATION_ERRORS[type];
      throw new RuleValidationError(code, message);
    }

    return rules.map((rule) => this.repository.add(rule));
  }

  removeRules(ids: number[]): AnyFirewallRule[] {
    const rules = this.findAllOrThrow(ids);
    const removedRules: AnyFirewallRule[] = [];

    for (const rule of rules) {
      if (this.repository.remove(rule.id)) {
        removedRules.push(rule);
      }
    }

    return removedRules;
  }

  getAllRules(type?: RuleType): AnyFirewallRule[] {
    const rules = this.repository.getAll();

    if (!type) {
      return rules;
    }

    return rules.filter((rule) => this.matchesType(rule, type));
  }

  updateRulesStatus(ids: number[], active: boolean): AnyFirewallRule[] {
    const updatedRules = this.findAllOrThrow(ids);

    for (const rule of updatedRules) {
      // No repository.update() needed: getById returns the stored reference,
      // so mutating it in place is already visible inside the repository.
      rule.setActive(active);
    }

    return updatedRules;
  }

  private findAllOrThrow(ids: number[]): AnyFirewallRule[] {
    const rules: AnyFirewallRule[] = [];
    const missingIds: number[] = [];

    for (const id of ids) {
      const rule = this.repository.getById(id);
      if (rule) {
        rules.push(rule);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      throw new RuleNotFoundError(missingIds);
    }

    return rules;
  }

  private matchesType(rule: AnyFirewallRule, type: RuleType): boolean {
    return rule.type === type;
  }
}
