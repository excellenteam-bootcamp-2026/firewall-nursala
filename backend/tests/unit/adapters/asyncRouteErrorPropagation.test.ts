import express from 'express';
import request from 'supertest';
import { createFirewallController } from '../../../src/adapters/inbound/http/controllers/firewallController';
import { errorHandler } from '../../../src/adapters/inbound/http/middleware/errorHandler';
import { createIpRoutes } from '../../../src/adapters/inbound/http/routes/ipRoutes';
import { RuleValidationError } from '../../../src/application/errors/RuleValidationError';
import { FirewallService } from '../../../src/application/services/FirewallService';

/** Builds an app whose service layer rejects with the given error. */
function appRejectingWith(error: Error) {
  const service = {
    addRule: () => Promise.reject(error),
  } as unknown as FirewallService;
  const app = express();
  app.use(express.json());
  app.use(createIpRoutes(createFirewallController(service)));
  app.use(errorHandler);

  return app;
}

describe('async route error propagation', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('forwards a rejected service Promise to the existing error middleware', async () => {
    const serviceError = new RuleValidationError('ASYNC_FAILURE', 'async service failed');
    const app = appRejectingWith(serviceError);

    const response = await request(app)
      .post('/ips')
      .send({ values: ['1.1.1.1'], mode: 'blacklist' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      code: 'ASYNC_FAILURE',
      message: 'async service failed',
    });
  });

  // Guards the whole chain: a repository-level failure surfacing as a rejected
  // Promise must reach the middleware and be classified as a server fault.
  it('turns a rejected Promise carrying an unexpected error into a 500', async () => {
    const app = appRejectingWith(new Error('connection terminated unexpectedly'));

    const response = await request(app)
      .post('/ips')
      .send({ values: ['1.1.1.1'], mode: 'blacklist' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  });

  it('does not leak the internal failure detail of a rejected Promise', async () => {
    const app = appRejectingWith(new Error('password authentication failed for user "postgres"'));

    const response = await request(app)
      .post('/ips')
      .send({ values: ['1.1.1.1'], mode: 'blacklist' });

    expect(JSON.stringify(response.body)).not.toContain('postgres');
  });

  it('still reaches the middleware when the controller throws synchronously', async () => {
    const app = appRejectingWith(new Error('never reached'));

    // An invalid mode makes validateMode() throw inside the async handler before
    // the service is ever called, which Express must still route to the middleware.
    const response = await request(app)
      .post('/ips')
      .send({ values: ['1.1.1.1'], mode: 'nonsense' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_MODE');
  });
});
