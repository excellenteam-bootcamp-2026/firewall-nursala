import { InMemoryFirewallRepository } from '../adapters/outbound/persistence/InMemoryFirewallRepository';
import { FirewallService } from '../application/services/FirewallService';
import { FirewallRuleFactory } from '../application/factories/FirewallRuleFactory';

const repository = new InMemoryFirewallRepository();
const factory = new FirewallRuleFactory();
export const firewallService = new FirewallService(repository, factory);
