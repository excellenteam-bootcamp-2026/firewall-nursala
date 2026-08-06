import { Router } from 'express';
import { addIp } from '../controllers/ipController';

const router = Router();

router.post('/ips', addIp);


export default router;