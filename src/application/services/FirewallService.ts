import {
  IFirewallRepository,
  AnyFirewallRule,
} from "../../domain/ports/IFirewallRepository";
import { RuleType } from "../../domain/models/RuleType";
import { IpRule } from "../../domain/models/IpRule";
import { DomainRule } from "../../domain/models/DomainRule";
import { PortRule } from "../../domain/models/PortRule";
import { IFirewallRule } from "../../domain/models/IFirewallRule";
import { RuleValidationError } from "../errors/RuleValidationError";

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
  constructor(private repository: IFirewallRepository) {}

  buildRule(
    type: RuleType,
    value: string | number,
    active: boolean,
  ): AnyFirewallRule {
    const id = this.repository.getNextId();
    switch (type) {
      case RuleType.IP:
        return new IpRule(id, value as string, active);
      case RuleType.DOMAIN:
        return new DomainRule(id, value as string, active);
      case RuleType.PORT:
        return new PortRule(id, value as number, active);
      default:
        throw new Error(`Unsupported rule type: ${type}`);
    }
  }

  addRule(
    values: (string | number)[],
    type: RuleType,
    active: boolean,
  ): AnyFirewallRule[] {
    const rules = values.map((value) => this.buildRule(type, value, active));

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

      let newRule: AnyFirewallRule;
      if (existingRule instanceof IpRule) {
        newRule = new IpRule(existingRule.id, existingRule.value, active);
      } else if (existingRule instanceof DomainRule) {
        newRule = new DomainRule(existingRule.id, existingRule.value, active);
      } else if (existingRule instanceof PortRule) {
        newRule = new PortRule(existingRule.id, existingRule.value, active);
      } else {
        continue;
      }

      const updatedRule = this.repository.update(id, newRule);
      if (updatedRule) {
        updatedRules.push(updatedRule);
      }
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
