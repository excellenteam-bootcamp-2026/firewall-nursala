import { Router } from 'express';
import { FirewallService } from '../../../../application/services/FirewallService';
import { createFirewallController } from '../controllers/firewallController';
import { createRuleController } from '../controllers/ruleController';
import { createIpRoutes } from './ipRoutes';
import { createDomainRoutes } from './domainRoutes';
import { createPortRoutes } from './portRoutes';
import { createRuleRoutes } from './ruleRoutes';

export function createFirewallRouter(service: FirewallService): Router {
  const addRule = createFirewallController(service);
  const ruleController = createRuleController(service);

  const firewallRouter = Router();

  firewallRouter.use(createIpRoutes(addRule));
  firewallRouter.use(createDomainRoutes(addRule));
  firewallRouter.use(createPortRoutes(addRule));
  firewallRouter.use(createRuleRoutes(ruleController));

  return firewallRouter;
}
