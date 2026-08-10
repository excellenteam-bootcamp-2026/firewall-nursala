import { FirewallRuleFactory } from '../../../src/application/factories/FirewallRuleFactory';
import { DomainRule } from '../../../src/domain/models/DomainRule';
import { IpRule } from '../../../src/domain/models/IpRule';
import { PortRule } from '../../../src/domain/models/PortRule';
import { RuleType } from '../../../src/domain/models/RuleType';

describe('FirewallRuleFactory', () => {
  describe('create()', () => {
    it('creates an identified IpRule', () => {
      const factory = new FirewallRuleFactory();

      const rule = factory.create(
        RuleType.IP,
        7,
        '192.168.1.1',
        false,
        'whitelist',
      );

      expect(rule).toBeInstanceOf(IpRule);
      expect(rule.toDetailedJSON()).toEqual({
        id: 7,
        type: RuleType.IP,
        mode: 'whitelist',
        value: '192.168.1.1',
        active: false,
      });
    });

    it('creates an identified DomainRule', () => {
      const factory = new FirewallRuleFactory();

      const rule = factory.create(
        RuleType.DOMAIN,
        3,
        'example.com',
        true,
        'blacklist',
      );

      expect(rule).toBeInstanceOf(DomainRule);
      expect(rule.id).toBe(3);
    });

    it('creates an identified PortRule with a numeric value', () => {
      const factory = new FirewallRuleFactory();

      const rule = factory.create(RuleType.PORT, 5, 8080, true, 'blacklist');

      expect(rule).toBeInstanceOf(PortRule);
      expect(rule.id).toBe(5);
      expect(rule.value).toBe(8080);
      expect(typeof rule.value).toBe('number');
    });

    it('throws for a rule type outside the enum', () => {
      const factory = new FirewallRuleFactory();

      const act = () => factory.create('bogus' as RuleType, 1, 'x', true, 'blacklist');

      expect(act).toThrow('Unsupported rule type: bogus');
    });
  });

  describe('isValid()', () => {
    it('validates ip values without constructing a persisted rule', () => {
      const factory = new FirewallRuleFactory();

      expect(factory.isValid(RuleType.IP, '1.1.1.1')).toBe(true);
      expect(factory.isValid(RuleType.IP, '999.1.1.1')).toBe(false);
    });

    it('validates domain values without constructing a persisted rule', () => {
      const factory = new FirewallRuleFactory();

      expect(factory.isValid(RuleType.DOMAIN, 'example.com')).toBe(true);
      expect(factory.isValid(RuleType.DOMAIN, '-bad.com')).toBe(false);
    });

    it('validates port values without constructing a persisted rule', () => {
      const factory = new FirewallRuleFactory();

      expect(factory.isValid(RuleType.PORT, 8080)).toBe(true);
      expect(factory.isValid(RuleType.PORT, 70000)).toBe(false);
    });

    it('rejects a value whose runtime type does not match the rule type', () => {
      const factory = new FirewallRuleFactory();

      expect(factory.isValid(RuleType.IP, 123)).toBe(false);
      expect(factory.isValid(RuleType.PORT, '8080')).toBe(false);
    });
  });
});
