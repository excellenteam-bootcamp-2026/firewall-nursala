import { InMemoryFirewallRepository } from '../adapters/outbound/persistence/InMemoryFirewallRepository';
import { createFirewallRouter } from '../adapters/inbound/http/routes/firewallRouter';
import { FirewallService } from '../application/services/FirewallService';
import { FirewallRuleFactory } from '../application/factories/FirewallRuleFactory';

const factory = new FirewallRuleFactory();
const repository = new InMemoryFirewallRepository(factory);
const firewallService = new FirewallService(repository, factory);

export const firewallRouter = createFirewallRouter(firewallService);
