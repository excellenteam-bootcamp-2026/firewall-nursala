import { Router } from 'express';
import ipRoutes from './ipRoutes';
import domainRoutes from './domainRoutes';
import portRoutes from './portRoutes';
import ruleRoutes from './ruleRoutes';

const firewallRouter = Router();

firewallRouter.use(ipRoutes);
firewallRouter.use(domainRoutes);
firewallRouter.use(portRoutes);
firewallRouter.use(ruleRoutes);

export default firewallRouter;