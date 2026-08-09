import { Router } from 'express';
import { addRule } from '../controllers/firewallController';
import { RuleType } from '../../../../domain/models/RuleType';

const router = Router();

router.post('/domains', (req, res) => addRule(req, res, RuleType.DOMAIN));

export default router;
