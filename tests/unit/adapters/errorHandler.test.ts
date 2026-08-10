import { NextFunction, Request, Response } from 'express';
import { errorHandler } from '../../../src/adapters/inbound/http/middleware/errorHandler';
import { RuleNotFoundError } from '../../../src/application/errors/RuleNotFoundError';
import { RuleValidationError } from '../../../src/application/errors/RuleValidationError';

interface MockResponse {
  statusCode?: number;
  body?: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function createMockResponse(): MockResponse {
  return {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

/** Drives the middleware with throwaway req/next objects and returns the mock response. */
function handle(error: Error): MockResponse {
  const res = createMockResponse();
  const req = {} as Request;
  const next = (() => undefined) as NextFunction;

  errorHandler(error, req, res as unknown as Response, next);

  return res;
}

describe('errorHandler', () => {
  // The middleware writes the error message to console.error on every call;
  // silencing it keeps the test output readable.
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('a rule that could not be found', () => {
    it('responds with 404', () => {
      // Arrange
      const error = new RuleNotFoundError([9999]);

      // Act
      const res = handle(error);

      // Assert
      expect(res.statusCode).toBe(404);
    });

    it('responds with the rule not found code and the error message', () => {
      // Arrange
      const error = new RuleNotFoundError([9998, 9999]);

      // Act
      const res = handle(error);

      // Assert
      expect(res.body).toEqual({
        status: 'error',
        code: 'RULE_NOT_FOUND',
        message: 'Rule ID(s) not found: 9998, 9999',
      });
    });
  });

  describe('a failed request validation', () => {
    it('responds with 400', () => {
      // Arrange
      const error = new RuleValidationError('INVALID_IP', 'IPs must be valid IPv4 addresses.');

      // Act
      const res = handle(error);

      // Assert
      expect(res.statusCode).toBe(400);
    });

    it('passes the validation error own code through to the client', () => {
      // Arrange
      const error = new RuleValidationError('INVALID_IP', 'IPs must be valid IPv4 addresses.');

      // Act
      const res = handle(error);

      // Assert
      expect(res.body).toEqual({
        status: 'error',
        code: 'INVALID_IP',
        message: 'IPs must be valid IPv4 addresses.',
      });
    });

    it('preserves a different validation code rather than flattening it', () => {
      // Arrange
      const error = new RuleValidationError('INVALID_MODE', 'Mode must be either ...');

      // Act
      const res = handle(error);

      // Assert
      expect((res.body as { code: string }).code).toBe('INVALID_MODE');
    });
  });

  describe('an unexpected error', () => {
    // Verified against the source: the fallback branch answers 400 with the
    // generic VALIDATION_ERROR code. It does not produce a 500.
    it('responds with 400 rather than 500', () => {
      // Arrange
      const error = new Error('something unforeseen');

      // Act
      const res = handle(error);

      // Assert
      expect(res.statusCode).toBe(400);
    });

    it('falls back to the generic validation code', () => {
      // Arrange
      const error = new Error('something unforeseen');

      // Act
      const res = handle(error);

      // Assert
      expect(res.body).toEqual({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'something unforeseen',
      });
    });

    it('echoes the raw error message back to the client', () => {
      // Arrange
      const error = new SyntaxError('Unexpected token in JSON');

      // Act
      const res = handle(error);

      // Assert
      expect((res.body as { message: string }).message).toBe('Unexpected token in JSON');
    });
  });

  describe('logging', () => {
    it('writes the error message to console.error', () => {
      // Arrange
      const error = new Error('boom');

      // Act
      handle(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('boom');
    });
  });
});
