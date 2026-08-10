import { Router } from 'express';
import { createFirewallController } from '../controllers/firewallController';
import { RuleType } from '../../../../domain/models/RuleType';

export function createPortRoutes(
  addRule: ReturnType<typeof createFirewallController>,
): Router {
  const router = Router();

  router.post('/ports', (req, res) => addRule(req, res, RuleType.PORT));

  return router;
}
