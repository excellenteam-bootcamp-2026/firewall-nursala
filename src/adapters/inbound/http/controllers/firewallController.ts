import { Request, Response } from 'express';
import { FirewallService } from '../../../../application/services/FirewallService';
import { RuleType } from '../../../../domain/models/RuleType';
import { validateValues, validateMode } from '../validators/requestValidators';
import { constants } from '../constants';

export function createFirewallController(service: FirewallService) {
  return function addRule(req: Request, res: Response, type: RuleType): void {
    const { values, mode } = req.body ?? {};

    validateValues(values);
    validateMode(mode);

    const addedRules = service.addRule(values, type, true, mode);
    res.status(201).json({
      type: type,
      mode: mode,
      values: addedRules,
      status: constants.statusSuccess,
    });
  };
}
