import {
  IFirewallRepository,
  AnyFirewallRule,
} from "../../domain/ports/IFirewallRepository";
import { RuleType } from "../../domain/models/RuleType";
import { IpRule } from "../../domain/models/IpRule";
import { DomainRule } from "../../domain/models/DomainRule";
import { PortRule } from "../../domain/models/PortRule";
import { RuleValidationError } from "../errors/RuleValidationError";
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
  ): AnyFirewallRule[] {
    const rules = values.map((value) => {
      const id = this.repository.getNextId();
      return this.factory.create(type, id, value, active);
    });

    const invalidRule = rules.find((rule) => !rule.isValid());
    if (invalidRule) {
      const { code, message } = VALIDATION_ERRORS[type];
      throw new RuleValidationError(code, message);
    }

    return rules.map((rule) => this.repository.add(rule));
  }

  removeRules(ids: number[]): AnyFirewallRule[] {
    const removedRules: AnyFirewallRule[] = [];

    for (const id of ids) {
      const rule = this.repository.getById(id);
      if (!rule) {
        continue;
      }
      if (this.repository.remove(id)) {
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
    const updatedRules: AnyFirewallRule[] = [];

    for (const id of ids) {
      const existingRule = this.repository.getById(id);
      if (!existingRule) {
        continue;
      }

      // No repository.update() needed: getById returns the stored reference,
      // so mutating it in place is already visible inside the repository.
      existingRule.setActive(active);
      updatedRules.push(existingRule);
    }

    return updatedRules;
  }

  private matchesType(rule: AnyFirewallRule, type: RuleType): boolean {
    switch (type) {
      case RuleType.IP:
        return rule instanceof IpRule;
      case RuleType.DOMAIN:
        return rule instanceof DomainRule;
      case RuleType.PORT:
        return rule instanceof PortRule;
      default:
        return false;
    }
  }
}
