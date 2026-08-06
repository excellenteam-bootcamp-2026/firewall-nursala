import { Request, Response } from 'express';
import { validateValues, validateMode } from '../validators/requestValidators';

export function addIp(req: Request, res: Response): void {
  const { values, mode } = req.body;

  validateValues(values);
  validateMode(mode);
}
