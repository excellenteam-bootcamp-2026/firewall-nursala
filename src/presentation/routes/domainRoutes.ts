import { Router } from 'express';
import { addDomain } from '../controllers/domainController';

const router = Router();

router.post('/domains', addDomain);

export default router;
