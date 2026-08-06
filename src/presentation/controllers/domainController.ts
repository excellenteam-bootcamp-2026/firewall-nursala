import { Request, Response } from 'express';
import { firewallService } from '../../composition';
import { RuleType } from '../../domain/models/RuleType';
import { validateValues, validateMode } from '../validators/requestValidators';

export function addDomain(req: Request, res: Response): void {
  const { values, mode } = req.body;

  validateValues(values);
  validateMode(mode);

  const addedRules = firewallService.addRule(values, RuleType.DOMAIN, true);
  res.status(201).json({
    type: 'domain',
    mode: mode,
    values: addedRules,
    status: 'success',
  });
}
