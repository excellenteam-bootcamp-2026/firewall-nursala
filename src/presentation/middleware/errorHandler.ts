// src/presentation/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { RuleValidationError } from '../../application/errors/RuleValidationError';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(err.message);

  const code = err instanceof RuleValidationError ? err.code : 'VALIDATION_ERROR';

  res.status(400).json({
    status: 'error',
    code: code,
    message: err.message,
  });
}
