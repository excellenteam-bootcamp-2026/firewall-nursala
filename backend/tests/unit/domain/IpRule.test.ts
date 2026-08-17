import { IpRule } from '../../../src/domain/models/IpRule';

const makeIpRule = (value: string): IpRule => new IpRule(1, value, true, 'blacklist');

describe('IpRule', () => {
  describe('isValid() — addresses it accepts', () => {
    it('accepts a standard public IPv4 address', () => {
      // Arrange
      const rule = makeIpRule('1.1.1.1');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts a private network address', () => {
      // Arrange
      const rule = makeIpRule('192.168.1.1');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts the all-zeros address at the bottom of the range', () => {
      // Arrange
      const rule = makeIpRule('0.0.0.0');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts the broadcast address at the top of the range', () => {
      // Arrange
      const rule = makeIpRule('255.255.255.255');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('accepts a single zero as an octet', () => {
      // Arrange
      const rule = makeIpRule('0.2.3.4');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('isValid() — addresses it rejects', () => {
    it('rejects an address with too few octets', () => {
      // Arrange
      const rule = makeIpRule('1.2.3');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects an address with too many octets', () => {
      // Arrange
      const rule = makeIpRule('1.2.3.4.5');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects an octet above the maximum of 255', () => {
      // Arrange
      const rule = makeIpRule('256.1.1.1');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a wildly out-of-range octet in the last position', () => {
      // Arrange
      const rule = makeIpRule('1.1.1.999');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a non-numeric octet', () => {
      // Arrange
      const rule = makeIpRule('abc.1.1.1');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a negative octet', () => {
      // Arrange
      const rule = makeIpRule('-1.2.3.4');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects an empty octet between two dots', () => {
      // Arrange
      const rule = makeIpRule('1..3.4');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects a trailing dot with no final octet', () => {
      // Arrange
      const rule = makeIpRule('1.2.3.');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects an empty string', () => {
      // Arrange
      const rule = makeIpRule('');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isValid() — leading zeros', () => {
    it('rejects an IP with a leading zero in the first octet', () => {
      // Arrange
      const rule = makeIpRule('01.2.3.4');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('rejects an IP with a leading zero in a later octet', () => {
      // Arrange
      const rule = makeIpRule('1.2.3.04');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('still accepts a bare zero octet, which is not a leading zero', () => {
      // Arrange
      const rule = makeIpRule('0.2.3.4');

      // Act
      const result = rule.isValid();

      // Assert
      expect(result).toBe(true);
    });
  });
});
