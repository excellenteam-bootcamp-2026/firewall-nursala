import { PortRule } from '../../../src/domain/models/PortRule';

const makePortRule = (value: number): PortRule => new PortRule(1, value, true, 'blacklist');

describe('PortRule', () => {
  describe('isValid() — ports it accepts', () => {
    it('accepts the lowest valid port', () => {
      // Arrange
      const rule = makePortRule(1);

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts the highest valid port', () => {
      // Arrange
      const rule = makePortRule(65535);

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts a mid-range port', () => {
      // Arrange
      const rule = makePortRule(8080);

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('isValid() — ports it rejects', () => {
    it('rejects zero, which is one below the minimum', () => {
      // Arrange
      const rule = makePortRule(0);

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a port one above the maximum', () => {
      // Arrange
      const rule = makePortRule(65536);

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a negative port', () => {
      // Arrange
      const rule = makePortRule(-1);

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a non-integer port', () => {
      // Arrange
      const rule = makePortRule(80.5);

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });
  });
});
