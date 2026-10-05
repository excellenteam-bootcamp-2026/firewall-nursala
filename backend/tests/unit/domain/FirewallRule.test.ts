import { DomainRule } from '../../../src/domain/models/DomainRule';
import { IpRule } from '../../../src/domain/models/IpRule';
import { PortRule } from '../../../src/domain/models/PortRule';
import { RuleType } from '../../../src/domain/models/RuleType';

// FirewallRule is abstract, so its shared behaviour is exercised through IpRule,
// with the per-subclass `type` getter checked against all three concrete classes.
describe('FirewallRule (shared behaviour via concrete subclasses)', () => {
  describe('getters', () => {
    it('returns the id it was constructed with', () => {
      // Arrange
      const rule = new IpRule(42, '1.1.1.1', true, 'blacklist');

      // Act
      const id = rule.id;

      // Assert
      expect(id).toBe(42);
    });

    it('returns the value it was constructed with', () => {
      // Arrange
      const rule = new IpRule(1, '192.168.1.1', true, 'blacklist');

      // Act
      const value = rule.value;

      // Assert
      expect(value).toBe('192.168.1.1');
    });

    it('returns the active flag it was constructed with', () => {
      // Arrange
      const rule = new IpRule(1, '1.1.1.1', false, 'blacklist');

      // Act
      const active = rule.active;

      // Assert
      expect(active).toBe(false);
    });

    it('returns the mode it was constructed with', () => {
      // Arrange
      const rule = new IpRule(1, '1.1.1.1', true, 'whitelist');

      // Act
      const mode = rule.mode;

      // Assert
      expect(mode).toBe('whitelist');
    });
  });

  describe('setActive()', () => {
    it('deactivates a rule that was active', () => {
      // Arrange
      const rule = new IpRule(1, '1.1.1.1', true, 'blacklist');

      // Act
      rule.setActive(false);

      // Assert
      expect(rule.active).toBe(false);
    });

    it('reactivates a rule that was inactive', () => {
      // Arrange
      const rule = new IpRule(1, '1.1.1.1', false, 'blacklist');

      // Act
      rule.setActive(true);

      // Assert
      expect(rule.active).toBe(true);
    });
  });

  describe('toJSON()', () => {
    it('returns the id, value and active flag', () => {
      // Arrange
      const rule = new IpRule(7, '10.0.0.5', true, 'blacklist');

      // Act
      const json = rule.toJSON();

      // Assert
      expect(json).toEqual({ id: 7, value: '10.0.0.5', active: true });
    });

    it('exposes no keys beyond id, value and active', () => {
      // Arrange
      const rule = new IpRule(7, '10.0.0.5', true, 'blacklist');

      // Act
      const keys = Object.keys(rule.toJSON()).sort();

      // Assert
      expect(keys).toEqual(['active', 'id', 'value']);
    });

    it('leaks no underscore-prefixed internal fields', () => {
      // Arrange
      const rule = new IpRule(7, '10.0.0.5', true, 'blacklist');

      // Act
      const keys = Object.keys(rule.toJSON());

      // Assert
      expect(keys.some((key) => key.startsWith('_'))).toBe(false);
    });
  });

  describe('toDetailedJSON()', () => {
    it('returns the id, type, mode, value and active flag', () => {
      // Arrange
      const rule = new IpRule(7, '10.0.0.5', false, 'whitelist');

      // Act
      const json = rule.toDetailedJSON();

      // Assert
      expect(json).toEqual({
        id: 7,
        type: RuleType.IP,
        mode: 'whitelist',
        value: '10.0.0.5',
        active: false,
      });
    });

    it('exposes no keys beyond id, type, mode, value and active', () => {
      // Arrange
      const rule = new IpRule(7, '10.0.0.5', true, 'blacklist');

      // Act
      const keys = Object.keys(rule.toDetailedJSON()).sort();

      // Assert
      expect(keys).toEqual(['active', 'id', 'mode', 'type', 'value']);
    });
  });

  describe('type getter', () => {
    it('reports an IpRule as an ip rule', () => {
      // Arrange
      const rule = new IpRule(1, '1.1.1.1', true, 'blacklist');

      // Act
      const type = rule.type;

      // Assert
      expect(type).toBe(RuleType.IP);
    });

    it('reports a DomainRule as a domain rule', () => {
      // Arrange
      const rule = new DomainRule(1, 'example.com', true, 'blacklist');

      // Act
      const type = rule.type;

      // Assert
      expect(type).toBe(RuleType.DOMAIN);
    });

    it('reports a PortRule as a port rule', () => {
      // Arrange
      const rule = new PortRule(1, 8080, true, 'blacklist');

      // Act
      const type = rule.type;

      // Assert
      expect(type).toBe(RuleType.PORT);
    });
  });
});
