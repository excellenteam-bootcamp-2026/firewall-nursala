import { DomainRule } from '../../../src/domain/models/DomainRule';

const makeDomainRule = (value: string): DomainRule =>
  new DomainRule(1, value, true, 'blacklist');

describe('DomainRule', () => {
  describe('isValid() — domains it accepts', () => {
    it('accepts a simple two-label domain', () => {
      // Arrange
      const rule = makeDomainRule('example.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts a subdomain', () => {
      // Arrange
      const rule = makeDomainRule('sub.example.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts a label containing an internal hyphen', () => {
      // Arrange
      const rule = makeDomainRule('a-b.example.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts a deeply nested domain with a multi-part suffix', () => {
      // Arrange
      const rule = makeDomainRule('sub.example.co.uk');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts a label containing digits', () => {
      // Arrange
      const rule = makeDomainRule('cdn1.example.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('isValid() — domains it rejects', () => {
    it('rejects a value that includes a protocol prefix', () => {
      // Arrange
      const rule = makeDomainRule('http://example.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a value that includes a path', () => {
      // Arrange
      const rule = makeDomainRule('example.com/admin');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a value that includes a port', () => {
      // Arrange
      const rule = makeDomainRule('example.com:80');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a bare hostname with no suffix', () => {
      // Arrange
      const rule = makeDomainRule('localhost');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a single-character suffix', () => {
      // Arrange
      const rule = makeDomainRule('example.c');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a numeric suffix', () => {
      // Arrange
      const rule = makeDomainRule('example.123');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects an empty string', () => {
      // Arrange
      const rule = makeDomainRule('');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isValid() — hyphen placement is checked in every label', () => {
    it('rejects a leading hyphen in the first label', () => {
      // Arrange
      const rule = makeDomainRule('-bad.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a leading hyphen in a later label', () => {
      // Arrange
      const rule = makeDomainRule('good.-bad.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a trailing hyphen in a later label', () => {
      // Arrange
      const rule = makeDomainRule('good.bad-.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a trailing hyphen in the first label', () => {
      // Arrange
      const rule = makeDomainRule('bad-.example.com');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });
  });
});
