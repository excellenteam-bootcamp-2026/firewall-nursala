import { Router } from 'express';
import { createRuleController } from '../controllers/ruleController';

export function createRuleRoutes(
  controller: ReturnType<typeof createRuleController>,
): Router {
  const router = Router();

  router.delete('/rules', controller.removeRules);
  router.get('/rules', controller.getRules);
  router.patch('/rules/status', controller.updateRuleStatus);

  return router;
}
