import { Router } from 'express';
import { removeRules, getRules, updateRuleStatus } from '../controllers/ruleController';

const router = Router();

router.delete('/rules', removeRules);
router.get('/rules', getRules);
router.patch('/rules/status', updateRuleStatus);

export default router;
