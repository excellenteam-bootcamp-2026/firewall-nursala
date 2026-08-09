import { Router } from 'express';
import { addRule } from '../controllers/firewallController';
import { RuleType } from '../../../../domain/models/RuleType';

const router = Router();

router.post('/ips', (req, res) => addRule(req, res, RuleType.IP));

export default router;
