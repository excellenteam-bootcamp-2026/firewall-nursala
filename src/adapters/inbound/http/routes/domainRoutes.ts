import { Router } from 'express';
import { createFirewallController } from '../controllers/firewallController';
import { RuleType } from '../../../../domain/models/RuleType';

export function createDomainRoutes(
  addRule: ReturnType<typeof createFirewallController>,
): Router {
  const router = Router();

  router.post('/domains', (req, res) => addRule(req, res, RuleType.DOMAIN));

  return router;
}
