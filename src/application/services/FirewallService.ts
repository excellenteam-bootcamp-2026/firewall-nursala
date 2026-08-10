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

  async addRule(
    values: (string | number)[],
    type: RuleType,
    active: boolean,
    mode: Mode,
  ): Promise<AnyFirewallRule[]> {
    const validationResults = values.map((value) => this.factory.isValid(type, value));

    if (validationResults.includes(false)) {
      const { code, message } = VALIDATION_ERRORS[type];
      throw new RuleValidationError(code, message);
    }

    const createdRules: AnyFirewallRule[] = [];

    for (const value of values) {
      createdRules.push(await this.repository.create(type, value, active, mode));
    }

    return createdRules;
  }

  async removeRules(ids: number[]): Promise<AnyFirewallRule[]> {
    const rules = await this.findAllOrThrow(ids);
    const removedRules: AnyFirewallRule[] = [];

    for (const rule of rules) {
      if (await this.repository.remove(rule.id)) {
        removedRules.push(rule);
      }
    }

    return removedRules;
  }

  async getAllRules(type?: RuleType): Promise<AnyFirewallRule[]> {
    const rules = await this.repository.getAll();

    if (!type) {
      return rules;
    }

    return rules.filter((rule) => this.matchesType(rule, type));
  }

  async updateRulesStatus(ids: number[], active: boolean): Promise<AnyFirewallRule[]> {
    const updatedRules = await this.findAllOrThrow(ids);

    for (const rule of updatedRules) {
      // Persist through the port rather than relying on getById returning a live
      // reference, so repositories that hand back copies stay correct.
      rule.setActive(active);
      await this.repository.update(rule.id, rule);
    }

    return updatedRules;
  }

  private async findAllOrThrow(ids: number[]): Promise<AnyFirewallRule[]> {
    const rules: AnyFirewallRule[] = [];
    const missingIds: number[] = [];

    for (const id of ids) {
      const rule = await this.repository.getById(id);
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
