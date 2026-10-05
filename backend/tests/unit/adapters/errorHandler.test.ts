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
    // An error the application never raised deliberately is a server fault, not
    // a client one: answering 400 would hide the bug and blame the caller.
    it('responds with 500 rather than 400', () => {
      // Arrange
      const error = new Error('something unforeseen');

      // Act
      const res = handle(error);

      // Assert
      expect(res.statusCode).toBe(500);
    });

    it('responds with the internal error code and a generic message', () => {
      // Arrange
      const error = new Error('something unforeseen');

      // Act
      const res = handle(error);

      // Assert
      expect(res.body).toEqual({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });
    });

    it('does not leak the original error message to the client', () => {
      // Arrange
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5432 at /srv/app/db.ts');

      // Act
      const res = handle(error);

      // Assert
      expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
      expect(JSON.stringify(res.body)).not.toContain('/srv/app/db.ts');
    });

    it('does not leak internals of an error subclass either', () => {
      // Arrange
      const error = new TypeError('rule.setActive is not a function');

      // Act
      const res = handle(error);

      // Assert
      expect(res.statusCode).toBe(500);
      expect((res.body as { message: string }).message).toBe('Internal server error');
    });
  });

  describe('a client error raised by framework middleware', () => {
    /** Mirrors how express.json() reports an unparseable body: a tagged 4xx status. */
    function bodyParserError(): Error {
      const error = new SyntaxError('Unexpected end of JSON input');
      Object.assign(error, { status: 400, type: 'entity.parse.failed' });

      return error;
    }

    it('stays a 400 instead of being reclassified as a server fault', () => {
      // Arrange
      const error = bodyParserError();

      // Act
      const res = handle(error);

      // Assert
      expect(res.statusCode).toBe(400);
    });

    it('keeps the generic validation code and the parser message', () => {
      // Arrange
      const error = bodyParserError();

      // Act
      const res = handle(error);

      // Assert
      expect(res.body).toEqual({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Unexpected end of JSON input',
      });
    });

    it('does not treat a tagged 5xx status as a client error', () => {
      // Arrange
      const error = new Error('upstream exploded');
      Object.assign(error, { status: 503 });

      // Act
      const res = handle(error);

      // Assert
      expect(res.statusCode).toBe(500);
      expect((res.body as { code: string }).code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('logging', () => {
    it('writes the message of an expected error to console.error', () => {
      // Arrange
      const error = new RuleValidationError('INVALID_IP', 'IPs must be valid IPv4 addresses.');

      // Act
      handle(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('IPs must be valid IPv4 addresses.');
    });

    it('logs an unexpected error in full, so the hidden detail is not lost', () => {
      // Arrange
      const error = new Error('boom');

      // Act
      handle(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
  });
});
