// src/adapters/inbound/http/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { RuleValidationError } from '../../../../application/errors/RuleValidationError';
import { RuleNotFoundError } from '../../../../application/errors/RuleNotFoundError';
import { constants } from '../constants';

/**
 * Framework middleware such as express.json() reports genuine client faults
 * (unparseable body, payload too large) by tagging the error with a 4xx status.
 * Those stay client errors; only untagged errors are treated as server faults.
 */
function clientErrorStatus(err: Error): number | undefined {
  const candidate = err as { status?: unknown; statusCode?: unknown };
  const status =
    typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;

  if (typeof status === 'number' && status >= 400 && status < 500) {
    return status;
  }

  return undefined;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof RuleNotFoundError) {
    console.error(err.message);
    res.status(404).json({
      status: constants.statusError,
      code: 'RULE_NOT_FOUND',
      message: err.message,
    });
    return;
  }

  if (err instanceof RuleValidationError) {
    console.error(err.message);
    res.status(400).json({
      status: constants.statusError,
      code: err.code,
      message: err.message,
    });
    return;
  }

  const status = clientErrorStatus(err);

  if (status !== undefined) {
    console.error(err.message);
    res.status(status).json({
      status: constants.statusError,
      code: 'VALIDATION_ERROR',
      message: err.message,
    });
    return;
  }

  // Unexpected: a programming bug or an infrastructure failure. The full error
  // (including its stack) is logged internally, but nothing about it reaches the
  // client, since its message can carry internal paths or database details.
  console.error(err);
  res.status(500).json({
    status: constants.statusError,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
}
