import { RuleValidationError } from '../../../src/application/errors/RuleValidationError';
import {
  validateActive,
  validateIds,
  validateMode,
  validateValues,
} from '../../../src/adapters/inbound/http/validators/requestValidators';

/** Runs an action expected to throw and hands back the thrown value for inspection. */
function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the action to throw, but it returned normally.');
}

describe('requestValidators', () => {
  describe('validateValues()', () => {
    it('accepts a single-element array', () => {
      // Arrange
      const values = ['1.1.1.1'];

      // Act
      const act = () => validateValues(values);

      // Assert
      expect(act).not.toThrow();
    });

    it('accepts a multi-element array', () => {
      // Arrange
      const values = ['1.1.1.1', '2.2.2.2'];

      // Act
      const act = () => validateValues(values);

      // Assert
      expect(act).not.toThrow();
    });

    it('accepts an array of numbers for port rules', () => {
      // Arrange
      const values = [8080, 443];

      // Act
      const act = () => validateValues(values);

      // Assert
      expect(act).not.toThrow();
    });

    it('rejects an empty array', () => {
      // Arrange
      const values: unknown[] = [];

      // Act
      const error = captureError(() => validateValues(values));

      // Assert
      expect(error).toBeInstanceOf(RuleValidationError);
      expect((error as RuleValidationError).code).toBe('INVALID_VALUES');
    });

    it('rejects undefined', () => {
      // Arrange
      const values = undefined;

      // Act
      const error = captureError(() => validateValues(values));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_VALUES');
    });

    it('rejects a non-array value', () => {
      // Arrange
      const values = '1.1.1.1';

      // Act
      const error = captureError(() => validateValues(values));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_VALUES');
    });

    it('explains the requirement in its message', () => {
      // Arrange
      const values = undefined;

      // Act
      const error = captureError(() => validateValues(values));

      // Assert
      expect((error as RuleValidationError).message).toBe(
        'Values must be a non-empty array.',
      );
    });
  });

  describe('validateIds()', () => {
    it('accepts an array of integers', () => {
      // Arrange
      const ids = [1, 2, 3];

      // Act
      const act = () => validateIds(ids);

      // Assert
      expect(act).not.toThrow();
    });

    it('accepts negative integers, since only integer-ness is checked', () => {
      // Arrange
      const ids = [-1];

      // Act
      const act = () => validateIds(ids);

      // Assert
      expect(act).not.toThrow();
    });

    it('rejects an empty array', () => {
      // Arrange
      const ids: unknown[] = [];

      // Act
      const error = captureError(() => validateIds(ids));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_IDS');
    });

    it('rejects undefined', () => {
      // Arrange
      const ids = undefined;

      // Act
      const error = captureError(() => validateIds(ids));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_IDS');
    });

    it('rejects a non-array value', () => {
      // Arrange
      const ids = 5;

      // Act
      const error = captureError(() => validateIds(ids));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_IDS');
    });

    it('rejects an array containing a non-integer number', () => {
      // Arrange
      const ids = [1, 1.5];

      // Act
      const error = captureError(() => validateIds(ids));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_IDS');
    });

    it('rejects an array containing a string', () => {
      // Arrange
      const ids = ['1'];

      // Act
      const error = captureError(() => validateIds(ids));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_IDS');
    });

    it('explains the requirement in its message', () => {
      // Arrange
      const ids = undefined;

      // Act
      const error = captureError(() => validateIds(ids));

      // Assert
      expect((error as RuleValidationError).message).toBe(
        'Ids must be a non-empty array of integers.',
      );
    });
  });

  describe('validateActive()', () => {
    it('accepts true', () => {
      // Arrange
      const active = true;

      // Act
      const act = () => validateActive(active);

      // Assert
      expect(act).not.toThrow();
    });

    it('accepts false', () => {
      // Arrange
      const active = false;

      // Act
      const act = () => validateActive(active);

      // Assert
      expect(act).not.toThrow();
    });

    it('rejects undefined', () => {
      // Arrange
      const active = undefined;

      // Act
      const error = captureError(() => validateActive(active));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_ACTIVE');
    });

    it('rejects the string "true"', () => {
      // Arrange
      const active = 'true';

      // Act
      const error = captureError(() => validateActive(active));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_ACTIVE');
    });

    it('rejects a number', () => {
      // Arrange
      const active = 1;

      // Act
      const error = captureError(() => validateActive(active));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_ACTIVE');
    });

    it('explains the requirement in its message', () => {
      // Arrange
      const active = undefined;

      // Act
      const error = captureError(() => validateActive(active));

      // Assert
      expect((error as RuleValidationError).message).toBe('Active must be a boolean.');
    });
  });

  describe('validateMode()', () => {
    it('accepts blacklist', () => {
      // Arrange
      const mode = 'blacklist';

      // Act
      const act = () => validateMode(mode);

      // Assert
      expect(act).not.toThrow();
    });

    it('accepts whitelist', () => {
      // Arrange
      const mode = 'whitelist';

      // Act
      const act = () => validateMode(mode);

      // Assert
      expect(act).not.toThrow();
    });

    it('rejects undefined', () => {
      // Arrange
      const mode = undefined;

      // Act
      const error = captureError(() => validateMode(mode));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_MODE');
    });

    it('rejects an unrecognised mode', () => {
      // Arrange
      const mode = 'nonsense';

      // Act
      const error = captureError(() => validateMode(mode));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_MODE');
    });

    it('rejects a differently cased mode', () => {
      // Arrange
      const mode = 'Blacklist';

      // Act
      const error = captureError(() => validateMode(mode));

      // Assert
      expect((error as RuleValidationError).code).toBe('INVALID_MODE');
    });

    it('explains the requirement in its message', () => {
      // Arrange
      const mode = undefined;

      // Act
      const error = captureError(() => validateMode(mode));

      // Assert
      expect((error as RuleValidationError).message).toBe(
        "Mode must be either 'blacklist' or 'whitelist'.",
      );
    });
  });
});
