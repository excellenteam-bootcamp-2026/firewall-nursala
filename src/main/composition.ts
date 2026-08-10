import { InMemoryFirewallRepository } from '../adapters/outbound/persistence/InMemoryFirewallRepository';
import { createFirewallRouter } from '../adapters/inbound/http/routes/firewallRouter';
import { FirewallService } from '../application/services/FirewallService';
import { FirewallRuleFactory } from '../application/factories/FirewallRuleFactory';

const repository = new InMemoryFirewallRepository();
const factory = new FirewallRuleFactory();
const firewallService = new FirewallService(repository, factory);

export const firewallRouter = createFirewallRouter(firewallService);
