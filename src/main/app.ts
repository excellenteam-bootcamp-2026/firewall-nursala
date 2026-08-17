import express, { Application, Request, Response, NextFunction, Router } from 'express';
import { createInMemoryFirewallRouter } from './composition';
import { errorHandler } from '../adapters/inbound/http/middleware/errorHandler';
import { constants } from '../adapters/inbound/http/constants';

/**
 * Builds the Express application around an already wired firewall router, so
 * the repository behind it is chosen by the caller (server.ts picks PostgreSQL)
 * rather than fixed here.
 */
export function createApp(firewallRouter: Router): Application {
  const app: Application = express();

  app.use(express.json());

  // Request logging middleware (required by spec: "log each HTTP request").
  // console.log is routed through winston once Logger.ts is loaded.
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  app.use(constants.apiBasePath, firewallRouter);

  // Error handling middleware (required by spec: "handle errors gracefully")
  app.use(errorHandler);

  //
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: constants.statusError,
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found.`,
    });
  });

  return app;
}

/**
 * In-memory application instance used by the test suites. The served process
 * does not use this one: server.ts builds its own app over PostgreSQL.
 */
const app = createApp(createInMemoryFirewallRouter());

export default app;
