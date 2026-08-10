import { FirewallRuleFactory } from '../../../src/application/factories/FirewallRuleFactory';
import { DomainRule } from '../../../src/domain/models/DomainRule';
import { IpRule } from '../../../src/domain/models/IpRule';
import { PortRule } from '../../../src/domain/models/PortRule';
import { RuleType } from '../../../src/domain/models/RuleType';

describe('FirewallRuleFactory', () => {
  describe('create() — ip rules', () => {
    it('builds an IpRule for the ip type', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.IP, 1, '192.168.1.1', true, 'blacklist');

      // Assert
      expect(rule).toBeInstanceOf(IpRule);
    });

    it('carries every constructor argument onto the ip rule', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.IP, 7, '192.168.1.1', false, 'whitelist');

      // Assert
      expect(rule.toDetailedJSON()).toEqual({
        id: 7,
        type: RuleType.IP,
        mode: 'whitelist',
        value: '192.168.1.1',
        active: false,
      });
    });

    it('produces an ip rule that can validate its own value', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.IP, 1, '999.1.1.1', true, 'blacklist');

      // Assert
      expect(rule.isValid()).toBe(false);
    });
  });

  describe('create() — domain rules', () => {
    it('builds a DomainRule for the domain type', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.DOMAIN, 1, 'example.com', true, 'blacklist');

      // Assert
      expect(rule).toBeInstanceOf(DomainRule);
    });

    it('carries every constructor argument onto the domain rule', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.DOMAIN, 3, 'example.com', true, 'blacklist');

      // Assert
      expect(rule.toDetailedJSON()).toEqual({
        id: 3,
        type: RuleType.DOMAIN,
        mode: 'blacklist',
        value: 'example.com',
        active: true,
      });
    });
  });

  describe('create() — port rules', () => {
    it('builds a PortRule for the port type', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.PORT, 1, 8080, true, 'blacklist');

      // Assert
      expect(rule).toBeInstanceOf(PortRule);
    });

    it('carries every constructor argument onto the port rule', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.PORT, 5, 8080, false, 'whitelist');

      // Assert
      expect(rule.toDetailedJSON()).toEqual({
        id: 5,
        type: RuleType.PORT,
        mode: 'whitelist',
        value: 8080,
        active: false,
      });
    });

    it('keeps the port value numeric rather than stringifying it', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const rule = factory.create(RuleType.PORT, 1, 8080, true, 'blacklist');

      // Assert
      expect(typeof rule.value).toBe('number');
    });
  });

  describe('create() — unsupported type', () => {
    // RuleType is a string enum, so the default branch is unreachable through the
    // normal typed call sites and can only be hit by casting past the type system.
    // The source throws a plain Error here, not a RuleValidationError.
    it('throws for a rule type outside the enum', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      const act = () => factory.create('bogus' as RuleType, 1, 'x', true, 'blacklist');

      // Assert
      expect(act).toThrow('Unsupported rule type: bogus');
    });

    it('throws a plain Error rather than a RuleValidationError', () => {
      // Arrange
      const factory = new FirewallRuleFactory();

      // Act
      let captured: unknown;
      try {
        factory.create('bogus' as RuleType, 1, 'x', true, 'blacklist');
      } catch (error) {
        captured = error;
      }

      // Assert
      expect(captured).toBeInstanceOf(Error);
      expect((captured as Error).constructor.name).toBe('Error');
    });
  });
});
