// src/adapters/inbound/http/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { RuleValidationError } from '../../../../application/errors/RuleValidationError';
import { RuleNotFoundError } from '../../../../application/errors/RuleNotFoundError';
import { constants } from '../../../../main/config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(err.message);

  if (err instanceof RuleNotFoundError) {
    res.status(404).json({
      status: constants.statusError,
      code: 'RULE_NOT_FOUND',
      message: err.message,
    });
    return;
  }

  const code = err instanceof RuleValidationError ? err.code : 'VALIDATION_ERROR';

  res.status(400).json({
    status: constants.statusError,
    code: code,
    message: err.message,
  });
}
