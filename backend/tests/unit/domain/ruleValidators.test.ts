import {
  isValidDomain,
  isValidIp,
  isValidPort,
} from '../../../src/domain/validation/ruleValidators';

/**
 * The validators receive whatever JSON the client sent, so their declared
 * `string | number` parameter is a compile-time promise the network cannot keep.
 * These tests pin the runtime type guards that keep a malformed element from
 * reaching `.split()`, a regex, or an arithmetic comparison: every validator
 * must answer false rather than throwing an incidental TypeError.
 */
const NON_STRING_VALUES: unknown[] = [
  123,
  0,
  null,
  undefined,
  true,
  {},
  [],
  ['1.1.1.1'],
  NaN,
  Infinity,
  () => undefined,
  new Date(),
  Object.create(null),
];

describe('ruleValidators runtime type safety', () => {
  describe('isValidIp()', () => {
    it.each(NON_STRING_VALUES)('returns false instead of throwing for %p', (value) => {
      // Act
      const act = () => isValidIp(value);

      // Assert
      expect(act).not.toThrow();
      expect(act()).toBe(false);
    });

    it('still accepts a well-formed address', () => {
      expect(isValidIp('192.168.0.1')).toBe(true);
    });
  });

  describe('isValidDomain()', () => {
    it.each(NON_STRING_VALUES)('returns false instead of throwing for %p', (value) => {
      // Act
      const act = () => isValidDomain(value);

      // Assert
      expect(act).not.toThrow();
      expect(act()).toBe(false);
    });

    it('rejects a full URL rather than the bare domain', () => {
      expect(isValidDomain('https://example.com/path')).toBe(false);
    });

    it('rejects a domain carrying a port', () => {
      expect(isValidDomain('example.com:8080')).toBe(false);
    });

    it('still accepts a bare domain', () => {
      expect(isValidDomain('example.com')).toBe(true);
    });
  });

  describe('isValidPort()', () => {
    const NON_INTEGER_VALUES: unknown[] = [
      '443',
      '',
      443.5,
      0,
      -1,
      65536,
      null,
      undefined,
      true,
      {},
      [],
      NaN,
      Infinity,
    ];

    it.each(NON_INTEGER_VALUES)('returns false instead of throwing for %p', (value) => {
      // Act
      const act = () => isValidPort(value);

      // Assert
      expect(act).not.toThrow();
      expect(act()).toBe(false);
    });

    it('accepts the inclusive bounds of the allowed range', () => {
      expect(isValidPort(1)).toBe(true);
      expect(isValidPort(65535)).toBe(true);
    });
  });
});
