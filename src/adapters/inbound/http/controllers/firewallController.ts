import { Request, Response } from 'express';
import { firewallService } from '../../../../main/composition';
import { RuleType } from '../../../../domain/models/RuleType';
import { validateValues, validateMode } from '../validators/requestValidators';

export function addRule(req: Request, res: Response, type: RuleType): void {
  const { values, mode } = req.body ?? {};

  validateValues(values);
  validateMode(mode);

  const addedRules = firewallService.addRule(values, type, true, mode);
  res.status(201).json({
    type: type,
    mode: mode,
    values: addedRules,
    status: 'success',
  });
}
