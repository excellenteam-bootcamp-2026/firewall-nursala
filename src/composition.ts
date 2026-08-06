import { InMemoryFirewallRepository } from './infrastructure/repositories/InMemoryFirewallRepository';
import { FirewallService } from './application/services/FirewallService';

const repository = new InMemoryFirewallRepository();
export const firewallService = new FirewallService(repository);