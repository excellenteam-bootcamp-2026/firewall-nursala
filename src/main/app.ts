import express, { Application, Request, Response, NextFunction } from 'express';
import { firewallRouter } from './composition';
import { errorHandler } from '../adapters/inbound/http/middleware/errorHandler';
import { constants } from '../adapters/inbound/http/constants';

const app: Application = express();

app.use(express.json());

// Request logging middleware (required by spec: "log each HTTP request")
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


export default app;