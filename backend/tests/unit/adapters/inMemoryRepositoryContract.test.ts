import { InMemoryFirewallRepository } from '../../../src/adapters/outbound/persistence/InMemoryFirewallRepository';
import { FirewallRuleFactory } from '../../../src/application/factories/FirewallRuleFactory';
import { describeFirewallRepositoryContract } from '../../fixtures/firewallRepositoryContract';

/**
 * Runs the shared port contract against the in-memory adapter. The PostgreSQL
 * adapter runs the identical suite, which is what makes the two interchangeable
 * at the composition root.
 */
describeFirewallRepositoryContract('InMemoryFirewallRepository', {
  createRepository: () => new InMemoryFirewallRepository(new FirewallRuleFactory()),
});
