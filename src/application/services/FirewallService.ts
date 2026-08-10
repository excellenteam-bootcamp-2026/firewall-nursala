import {
  IFirewallRepository,
  AnyFirewallRule,
} from "../ports/IFirewallRepository";
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
    const validationResults = values.map((value) => this.factory.isValid(type, value));

    if (validationResults.includes(false)) {
      const { code, message } = VALIDATION_ERRORS[type];
      throw new RuleValidationError(code, message);
    }

    return values.map((value) => this.repository.create(type, value, active, mode));
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
      // Persist through the port rather than relying on getById returning a live
      // reference, so repositories that hand back copies stay correct.
      rule.setActive(active);
      this.repository.update(rule.id, rule);
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
