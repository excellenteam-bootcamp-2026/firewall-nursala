import { Router } from 'express';
import { addRule } from '../controllers/firewallController';
import { RuleType } from '../../domain/models/RuleType';

const router = Router();

router.post('/ports', (req, res) => addRule(req, res, RuleType.PORT));

export default router;
