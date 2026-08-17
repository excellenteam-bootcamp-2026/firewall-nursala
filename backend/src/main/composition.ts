import { Router } from 'express';
import { InMemoryFirewallRepository } from '../adapters/outbound/persistence/InMemoryFirewallRepository';
import { createFirewallRouter } from '../adapters/inbound/http/routes/firewallRouter';
import { FirewallService } from '../application/services/FirewallService';
import { FirewallRuleFactory } from '../application/factories/FirewallRuleFactory';
import { IFirewallRepository } from '../application/ports/IFirewallRepository';

/**
 * Composition root. Selecting the concrete repository happens here and nowhere
 * else: the router, the controllers and FirewallService only ever see the
 * IFirewallRepository port.
 */
export function createFirewallRouterFor(
  repository: IFirewallRepository,
  factory: FirewallRuleFactory = new FirewallRuleFactory(),
): Router {
  const firewallService = new FirewallService(repository, factory);

  return createFirewallRouter(firewallService);
}

/** Wiring for tests and for running without a database. */
export function createInMemoryFirewallRouter(): Router {
  const factory = new FirewallRuleFactory();

  return createFirewallRouterFor(new InMemoryFirewallRepository(factory), factory);
}
