import { Request, Response } from 'express';
import { FirewallService } from '../../../../application/services/FirewallService';
import { RuleType } from '../../../../domain/models/RuleType';
import { validateIds, validateActive } from '../validators/requestValidators';
import { RuleValidationError } from '../../../../application/errors/RuleValidationError';
import { constants } from '../constants';

export function createRuleController(service: FirewallService) {
  async function removeRules(req: Request, res: Response): Promise<void> {
    const { ids } = req.body ?? {};

    validateIds(ids);

    const removedRules = await service.removeRules(ids);
    res.status(200).json({
      removed: removedRules.map((rule) => rule.toDetailedJSON()),
      status: constants.statusSuccess,
    });
  }

  async function getRules(req: Request, res: Response): Promise<void> {
    const type = req.query.type as string | undefined;
    const ruleType = parseRuleType(type);

    const rules = await service.getAllRules(ruleType);

    res.status(200).json({
      ips: { values: rules.filter((rule) => rule.type === RuleType.IP) },
      domains: { values: rules.filter((rule) => rule.type === RuleType.DOMAIN) },
      ports: { values: rules.filter((rule) => rule.type === RuleType.PORT) },
      status: constants.statusSuccess,
    });
  }

  async function updateRuleStatus(req: Request, res: Response): Promise<void> {
    const { ids, active } = req.body ?? {};

    validateIds(ids);
    validateActive(active);

    const updatedRules = await service.updateRulesStatus(ids, active);
    res.status(200).json({
      updated: updatedRules.map((rule) => rule.toDetailedJSON()),
      status: constants.statusSuccess,
    });
  }

  return { removeRules, getRules, updateRuleStatus };
}

function parseRuleType(type: string | undefined): RuleType | undefined {
  if (type === undefined) {
    return undefined;
  }

  switch (type.toLowerCase()) {
    case RuleType.IP:
      return RuleType.IP;
    case RuleType.DOMAIN:
      return RuleType.DOMAIN;
    case RuleType.PORT:
      return RuleType.PORT;
    default:
      throw new RuleValidationError(
        'INVALID_TYPE',
        "Type must be one of 'ip', 'domain' or 'port'."
      );
  }
}
