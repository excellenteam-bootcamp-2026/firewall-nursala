import request from 'supertest';
import app from '../../src/main/app';

/**
 * composition.ts builds the repository at module scope, so the whole file shares
 * one InMemoryFirewallRepository instance (Jest gives each test FILE its own
 * module registry, so no state leaks between files). Tests therefore never
 * hardcode ids or assume the store is empty: they mint unique values, read ids
 * back out of the responses they create, and assert containment rather than
 * exact array equality.
 */

const BASE = '/api/firewall';

let sequence = 0;
const nextSeq = (): number => (sequence += 1);

const uniqueIp = (): string => {
  const n = nextSeq();
  return `10.${Math.floor(n / 250) % 250}.${Math.floor(n / 250) % 250}.${(n % 250) + 1}`;
};
const uniqueDomain = (): string => `host-${nextSeq()}.example.com`;
const uniquePort = (): number => 10000 + nextSeq();

interface AddedRule {
  id: number;
  value: string | number;
  active: boolean;
}

/** Adds rules of a resource and returns the created rules, failing loudly if the call did not 201. */
async function addRules(
  resource: 'ips' | 'domains' | 'ports',
  values: (string | number)[],
  mode: 'blacklist' | 'whitelist' = 'blacklist',
): Promise<AddedRule[]> {
  const response = await request(app).post(`${BASE}/${resource}`).send({ values, mode });

  expect(response.status).toBe(201);

  return response.body.values as AddedRule[];
}

describe('Firewall API', () => {
  describe('POST /api/firewall/ips', () => {
    it('creates a rule from a single valid ip and returns the documented shape', async () => {
      // Arrange
      const ip = uniqueIp();

      // Act
      const response = await request(app)
        .post(`${BASE}/ips`)
        .send({ values: [ip], mode: 'blacklist' });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        type: 'ip',
        mode: 'blacklist',
        values: [{ id: expect.any(Number), value: ip, active: true }],
        status: 'success',
      });
    });

    it('creates every rule in a multi-value batch with sequential ids', async () => {
      // Arrange
      const ips = [uniqueIp(), uniqueIp(), uniqueIp()];

      // Act
      const created = await addRules('ips', ips);

      // Assert
      expect(created.map((rule) => rule.value)).toEqual(ips);
      expect(created[1]!.id).toBe(created[0]!.id + 1);
      expect(created[2]!.id).toBe(created[1]!.id + 1);
    });

    it('honours the whitelist mode', async () => {
      // Arrange
      const ip = uniqueIp();

      // Act
      const response = await request(app)
        .post(`${BASE}/ips`)
        .send({ values: [ip], mode: 'whitelist' });

      // Assert
      expect(response.body.mode).toBe('whitelist');
    });

    it('rejects an ip with an out-of-range octet', async () => {
      // Arrange
      const body = { values: ['256.1.1.1'], mode: 'blacklist' };

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        code: 'INVALID_IP',
        message: 'IPs must be valid IPv4 addresses.',
      });
    });

    it('rejects an ip with a leading zero in an octet', async () => {
      // Arrange
      const body = { values: ['01.2.3.4'], mode: 'blacklist' };

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_IP');
    });

    it('persists nothing when one value in the batch is invalid', async () => {
      // Arrange
      const good = uniqueIp();

      // Act
      const response = await request(app)
        .post(`${BASE}/ips`)
        .send({ values: [good, '999.1.1.1'], mode: 'blacklist' });
      const afterwards = await request(app).get(`${BASE}/rules`).query({ type: 'ip' });

      // Assert
      expect(response.status).toBe(400);
      expect(
        (afterwards.body.ips.values as AddedRule[]).some((rule) => rule.value === good),
      ).toBe(false);
    });
  });

  describe('POST /api/firewall/domains', () => {
    it('creates a rule from a valid domain', async () => {
      // Arrange
      const domain = uniqueDomain();

      // Act
      const response = await request(app)
        .post(`${BASE}/domains`)
        .send({ values: [domain], mode: 'blacklist' });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.type).toBe('domain');
      expect(response.body.values[0].value).toBe(domain);
    });

    it('rejects a domain whose later label starts with a hyphen', async () => {
      // Arrange
      const body = { values: ['good.-bad.com'], mode: 'blacklist' };

      // Act
      const response = await request(app).post(`${BASE}/domains`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        code: 'INVALID_DOMAIN',
        message: 'Domains must be valid domain names.',
      });
    });
  });

  describe('POST /api/firewall/ports', () => {
    it('creates a rule from a valid port', async () => {
      // Arrange
      const port = uniquePort();

      // Act
      const response = await request(app)
        .post(`${BASE}/ports`)
        .send({ values: [port], mode: 'blacklist' });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.type).toBe('port');
      expect(response.body.values[0].value).toBe(port);
    });

    it('rejects a port above the maximum', async () => {
      // Arrange
      const body = { values: [70000], mode: 'blacklist' };

      // Act
      const response = await request(app).post(`${BASE}/ports`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        code: 'INVALID_PORT',
        message: 'Ports must be integers between 1 and 65535.',
      });
    });
  });

  describe('POST request-body validation', () => {
    it('rejects a request with no values field', async () => {
      // Arrange
      const body = { mode: 'blacklist' };

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_VALUES');
    });

    it('rejects an empty values array', async () => {
      // Arrange
      const body = { values: [], mode: 'blacklist' };

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.body.code).toBe('INVALID_VALUES');
    });

    it('rejects a non-array values field', async () => {
      // Arrange
      const body = { values: '1.1.1.1', mode: 'blacklist' };

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.body.code).toBe('INVALID_VALUES');
    });

    it('rejects a request with no mode field', async () => {
      // Arrange
      const body = { values: [uniqueIp()] };

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        code: 'INVALID_MODE',
        message: "Mode must be either 'blacklist' or 'whitelist'.",
      });
    });

    it('rejects an unrecognised mode', async () => {
      // Arrange
      const body = { values: [uniqueIp()], mode: 'nonsense' };

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.body.code).toBe('INVALID_MODE');
    });

    // The controller validates values before mode, so a request missing both
    // surfaces the values failure first.
    it('reports the values problem first when both values and mode are missing', async () => {
      // Arrange
      const body = {};

      // Act
      const response = await request(app).post(`${BASE}/ips`).send(body);

      // Assert
      expect(response.body.code).toBe('INVALID_VALUES');
    });
  });

  describe('GET /api/firewall/rules', () => {
    it('returns the grouped shape containing previously added rules', async () => {
      // Arrange
      const ip = uniqueIp();
      const domain = uniqueDomain();
      const port = uniquePort();
      await addRules('ips', [ip]);
      await addRules('domains', [domain]);
      await addRules('ports', [port]);

      // Act
      const response = await request(app).get(`${BASE}/rules`);

      // Assert
      expect(response.status).toBe(200);
      expect(Object.keys(response.body).sort()).toEqual([
        'domains',
        'ips',
        'ports',
        'status',
      ]);
      expect((response.body.ips.values as AddedRule[]).map((r) => r.value)).toContain(ip);
      expect((response.body.domains.values as AddedRule[]).map((r) => r.value)).toContain(
        domain,
      );
      expect((response.body.ports.values as AddedRule[]).map((r) => r.value)).toContain(port);
    });

    it('exposes only id, value and active on each listed rule', async () => {
      // Arrange
      const ip = uniqueIp();
      await addRules('ips', [ip]);

      // Act
      const response = await request(app).get(`${BASE}/rules`).query({ type: 'ip' });

      // Assert
      const listed = (response.body.ips.values as AddedRule[]).find((r) => r.value === ip)!;
      expect(Object.keys(listed).sort()).toEqual(['active', 'id', 'value']);
    });

    it('populates only the ips group when filtering by ip', async () => {
      // Arrange
      const ip = uniqueIp();
      await addRules('ips', [ip]);
      await addRules('domains', [uniqueDomain()]);

      // Act
      const response = await request(app).get(`${BASE}/rules`).query({ type: 'ip' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.domains.values).toEqual([]);
      expect(response.body.ports.values).toEqual([]);
      expect((response.body.ips.values as AddedRule[]).map((r) => r.value)).toContain(ip);
    });

    it('populates only the domains group when filtering by domain', async () => {
      // Arrange
      const domain = uniqueDomain();
      await addRules('domains', [domain]);

      // Act
      const response = await request(app).get(`${BASE}/rules`).query({ type: 'domain' });

      // Assert
      expect(response.body.ips.values).toEqual([]);
      expect(response.body.ports.values).toEqual([]);
      expect((response.body.domains.values as AddedRule[]).map((r) => r.value)).toContain(
        domain,
      );
    });

    it('populates only the ports group when filtering by port', async () => {
      // Arrange
      const port = uniquePort();
      await addRules('ports', [port]);

      // Act
      const response = await request(app).get(`${BASE}/rules`).query({ type: 'port' });

      // Assert
      expect(response.body.ips.values).toEqual([]);
      expect(response.body.domains.values).toEqual([]);
      expect((response.body.ports.values as AddedRule[]).map((r) => r.value)).toContain(port);
    });

    it('treats the type filter case-insensitively', async () => {
      // Arrange
      const ip = uniqueIp();
      await addRules('ips', [ip]);

      // Act
      const response = await request(app).get(`${BASE}/rules`).query({ type: 'IP' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.domains.values).toEqual([]);
      expect((response.body.ips.values as AddedRule[]).map((r) => r.value)).toContain(ip);
    });

    it('rejects an unrecognised type filter', async () => {
      // Arrange
      const query = { type: 'bogus' };

      // Act
      const response = await request(app).get(`${BASE}/rules`).query(query);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        code: 'INVALID_TYPE',
        message: "Type must be one of 'ip', 'domain' or 'port'.",
      });
    });
  });

  describe('DELETE /api/firewall/rules', () => {
    it('removes a rule and returns it in the detailed shape', async () => {
      // Arrange
      const ip = uniqueIp();
      const [created] = await addRules('ips', [ip], 'whitelist');

      // Act
      const response = await request(app).delete(`${BASE}/rules`).send({ ids: [created!.id] });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        removed: [
          {
            id: created!.id,
            type: 'ip',
            mode: 'whitelist',
            value: ip,
            active: true,
          },
        ],
        status: 'success',
      });
    });

    it('makes the removed rule disappear from a follow-up read', async () => {
      // Arrange
      const ip = uniqueIp();
      const [created] = await addRules('ips', [ip]);

      // Act
      await request(app).delete(`${BASE}/rules`).send({ ids: [created!.id] });
      const afterwards = await request(app).get(`${BASE}/rules`).query({ type: 'ip' });

      // Assert
      expect((afterwards.body.ips.values as AddedRule[]).map((r) => r.id)).not.toContain(
        created!.id,
      );
    });

    it('removes several rules in one call', async () => {
      // Arrange
      const created = await addRules('ips', [uniqueIp(), uniqueIp()]);

      // Act
      const response = await request(app)
        .delete(`${BASE}/rules`)
        .send({ ids: created.map((rule) => rule.id) });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.removed).toHaveLength(2);
    });

    it('rejects a batch containing an unknown id', async () => {
      // Arrange
      const [created] = await addRules('ips', [uniqueIp()]);

      // Act
      const response = await request(app)
        .delete(`${BASE}/rules`)
        .send({ ids: [created!.id, 999999] });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        code: 'RULE_NOT_FOUND',
        message: 'Rule ID(s) not found: 999999',
      });
    });

    it('removes nothing when the batch contains an unknown id', async () => {
      // Arrange
      const ip = uniqueIp();
      const [created] = await addRules('ips', [ip]);

      // Act
      await request(app).delete(`${BASE}/rules`).send({ ids: [created!.id, 999999] });
      const afterwards = await request(app).get(`${BASE}/rules`).query({ type: 'ip' });

      // Assert
      expect((afterwards.body.ips.values as AddedRule[]).map((r) => r.id)).toContain(
        created!.id,
      );
    });

    it('rejects a request with no ids field', async () => {
      // Arrange
      const body = {};

      // Act
      const response = await request(app).delete(`${BASE}/rules`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_IDS');
    });

    it('rejects non-integer ids', async () => {
      // Arrange
      const body = { ids: ['abc'] };

      // Act
      const response = await request(app).delete(`${BASE}/rules`).send(body);

      // Assert
      expect(response.body.code).toBe('INVALID_IDS');
    });
  });

  describe('PATCH /api/firewall/rules/status', () => {
    it('deactivates a rule and returns the detailed shape', async () => {
      // Arrange
      const ip = uniqueIp();
      const [created] = await addRules('ips', [ip]);

      // Act
      const response = await request(app)
        .patch(`${BASE}/rules/status`)
        .send({ ids: [created!.id], active: false });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        updated: [
          {
            id: created!.id,
            type: 'ip',
            mode: 'blacklist',
            value: ip,
            active: false,
          },
        ],
        status: 'success',
      });
    });

    it('persists the status change for a follow-up read', async () => {
      // Arrange
      const ip = uniqueIp();
      const [created] = await addRules('ips', [ip]);

      // Act
      await request(app)
        .patch(`${BASE}/rules/status`)
        .send({ ids: [created!.id], active: false });
      const afterwards = await request(app).get(`${BASE}/rules`).query({ type: 'ip' });

      // Assert
      const listed = (afterwards.body.ips.values as AddedRule[]).find(
        (rule) => rule.id === created!.id,
      )!;
      expect(listed.active).toBe(false);
    });

    it('updates rules of different types in one batch', async () => {
      // Arrange
      const [ipRule] = await addRules('ips', [uniqueIp()]);
      const [portRule] = await addRules('ports', [uniquePort()]);

      // Act
      const response = await request(app)
        .patch(`${BASE}/rules/status`)
        .send({ ids: [ipRule!.id, portRule!.id], active: false });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.updated.map((rule: { type: string }) => rule.type)).toEqual([
        'ip',
        'port',
      ]);
    });

    it('rejects a batch containing an unknown id', async () => {
      // Arrange
      const [created] = await addRules('ips', [uniqueIp()]);

      // Act
      const response = await request(app)
        .patch(`${BASE}/rules/status`)
        .send({ ids: [created!.id, 999999], active: false });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('RULE_NOT_FOUND');
    });

    it('changes nothing when the batch contains an unknown id', async () => {
      // Arrange
      const ip = uniqueIp();
      const [created] = await addRules('ips', [ip]);

      // Act
      await request(app)
        .patch(`${BASE}/rules/status`)
        .send({ ids: [created!.id, 999999], active: false });
      const afterwards = await request(app).get(`${BASE}/rules`).query({ type: 'ip' });

      // Assert
      const listed = (afterwards.body.ips.values as AddedRule[]).find(
        (rule) => rule.id === created!.id,
      )!;
      expect(listed.active).toBe(true);
    });

    it('rejects a missing active field', async () => {
      // Arrange
      const [created] = await addRules('ips', [uniqueIp()]);

      // Act
      const response = await request(app)
        .patch(`${BASE}/rules/status`)
        .send({ ids: [created!.id] });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        code: 'INVALID_ACTIVE',
        message: 'Active must be a boolean.',
      });
    });

    it('rejects a non-boolean active field', async () => {
      // Arrange
      const [created] = await addRules('ips', [uniqueIp()]);

      // Act
      const response = await request(app)
        .patch(`${BASE}/rules/status`)
        .send({ ids: [created!.id], active: 'yes' });

      // Assert
      expect(response.body.code).toBe('INVALID_ACTIVE');
    });
  });

  describe('cross-cutting behaviour', () => {
    it('answers 404 for an unknown route under the api prefix', async () => {
      // Act
      const response = await request(app).get(`${BASE}/nope`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Route GET /api/firewall/nope not found.',
      });
    });

    it('answers 404 for an unknown route outside the api prefix', async () => {
      // Act
      const response = await request(app).get('/totally/unknown');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('answers 404 for a verb that no route handles', async () => {
      // Act
      const response = await request(app).put(`${BASE}/rules`).send({});

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('answers 400 rather than crashing on a malformed json body', async () => {
      // Act
      const response = await request(app)
        .post(`${BASE}/ips`)
        .set('Content-Type', 'application/json')
        .send('{"values":[ bad json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.status).not.toBe(500);
    });

    it('logs one line per request through the app logging middleware', async () => {
      // Arrange
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      // Act
      await request(app).get(`${BASE}/rules`);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('GET /api/firewall/rules');
      logSpy.mockRestore();
    });
  });
});
