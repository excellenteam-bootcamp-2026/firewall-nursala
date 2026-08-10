import { InMemoryFirewallRepository } from '../../../src/adapters/outbound/persistence/InMemoryFirewallRepository';
import { FirewallRuleFactory } from '../../../src/application/factories/FirewallRuleFactory';
import { FirewallService } from '../../../src/application/services/FirewallService';
import { RuleValidationError } from '../../../src/application/errors/RuleValidationError';
import { RuleType } from '../../../src/domain/models/RuleType';

describe('InMemoryFirewallRepository creation', () => {
  it('generates required unique numeric ids when rules are persisted', () => {
    const factory = new FirewallRuleFactory();
    const repository = new InMemoryFirewallRepository(factory);

    const first = repository.create(RuleType.IP, '1.1.1.1', true, 'blacklist');
    const second = repository.create(RuleType.PORT, 8080, true, 'blacklist');

    expect(typeof first.id).toBe('number');
    expect(typeof second.id).toBe('number');
    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(second.id).not.toBe(first.id);
  });

  it('does not consume an id when the service rejects invalid input between creations', () => {
    const factory = new FirewallRuleFactory();
    const repository = new InMemoryFirewallRepository(factory);
    const service = new FirewallService(repository, factory);
    const [first] = service.addRule(['1.1.1.1'], RuleType.IP, true, 'blacklist');

    expect(() =>
      service.addRule(['999.1.1.1'], RuleType.IP, true, 'blacklist'),
    ).toThrow(RuleValidationError);

    const [second] = service.addRule(['2.2.2.2'], RuleType.IP, true, 'blacklist');

    expect(first!.id).toBe(1);
    expect(second!.id).toBe(2);
  });

  it('does not consume an id when persisted rule construction fails', () => {
    const factory = new FirewallRuleFactory();
    const repository = new InMemoryFirewallRepository(factory);
    jest.spyOn(factory, 'create').mockImplementationOnce(() => {
      throw new Error('construction failed');
    });

    expect(() =>
      repository.create(RuleType.IP, '1.1.1.1', true, 'blacklist'),
    ).toThrow('construction failed');

    const created = repository.create(RuleType.IP, '2.2.2.2', true, 'blacklist');

    expect(created.id).toBe(1);
  });
});
