import { Router } from 'express';
import { addPort } from '../controllers/portController';

const router = Router();

router.post('/ports', addPort);

export default router;