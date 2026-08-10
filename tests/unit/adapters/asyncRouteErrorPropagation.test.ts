import express from 'express';
import request from 'supertest';
import { createFirewallController } from '../../../src/adapters/inbound/http/controllers/firewallController';
import { errorHandler } from '../../../src/adapters/inbound/http/middleware/errorHandler';
import { createIpRoutes } from '../../../src/adapters/inbound/http/routes/ipRoutes';
import { RuleValidationError } from '../../../src/application/errors/RuleValidationError';
import { FirewallService } from '../../../src/application/services/FirewallService';

describe('async route error propagation', () => {
  it('forwards a rejected service Promise to the existing error middleware', async () => {
    const serviceError = new RuleValidationError('ASYNC_FAILURE', 'async service failed');
    const service = {
      addRule: () => Promise.reject(serviceError),
    } as unknown as FirewallService;
    const app = express();
    app.use(express.json());
    app.use(createIpRoutes(createFirewallController(service)));
    app.use(errorHandler);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(app)
      .post('/ips')
      .send({ values: ['1.1.1.1'], mode: 'blacklist' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      code: 'ASYNC_FAILURE',
      message: 'async service failed',
    });
    consoleErrorSpy.mockRestore();
  });
});
