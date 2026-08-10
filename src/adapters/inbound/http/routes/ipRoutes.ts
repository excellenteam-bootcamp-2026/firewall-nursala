import { Router } from 'express';
import { createFirewallController } from '../controllers/firewallController';
import { RuleType } from '../../../../domain/models/RuleType';

export function createIpRoutes(
  addRule: ReturnType<typeof createFirewallController>,
): Router {
  const router = Router();

  router.post('/ips', (req, res) => addRule(req, res, RuleType.IP));

  return router;
}
