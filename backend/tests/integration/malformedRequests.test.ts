import request from 'supertest';
import app from '../../src/main/app';

/**
 * End-to-end proof that malformed client input produces a normal validation
 * response instead of an incidental runtime crash, and that the status code
 * distinguishes a client fault from a server fault.
 *
 * Like the other integration suite, these tests share one module-scope
 * repository per test file, so they never assume an empty store.
 */
const BASE = '/api/firewall';

/** Posts a values payload to a resource and returns the response. */
const post = (resource: string, body: unknown) =>
  request(app).post(`${BASE}/${resource}`).send(body);

describe('malformed requests', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('wrongly typed ip values', () => {
    it.each([[123], [null], [{}], [[]], [true]])(
      'answers 400 INVALID_IP for %p without crashing',
      async (value) => {
        // Act
        const response = await post('ips', { values: [value], mode: 'blacklist' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          status: 'error',
          code: 'INVALID_IP',
          message: 'IPs must be valid IPv4 addresses.',
        });
      },
    );

    it('answers 400 for a malformed IPv4 string', async () => {
      const response = await post('ips', { values: ['999.1.1.1'], mode: 'blacklist' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_IP');
    });

    it('rejects the whole batch when only one element is wrongly typed', async () => {
      const response = await post('ips', { values: ['8.8.8.8', 123], mode: 'blacklist' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_IP');
    });
  });

  describe('wrongly typed domain values', () => {
    it.each([[123], [null], [{}], [true]])(
      'answers 400 INVALID_DOMAIN for %p without crashing',
      async (value) => {
        // Act
        const response = await post('domains', { values: [value], mode: 'blacklist' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          status: 'error',
          code: 'INVALID_DOMAIN',
          message: 'Domains must be valid domain names.',
        });
      },
    );

    it.each(['https://example.com/path', 'example.com:8080', 'example.com/path'])(
      'answers 400 for %p, which is not a bare domain',
      async (value) => {
        // Act
        const response = await post('domains', { values: [value], mode: 'blacklist' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.code).toBe('INVALID_DOMAIN');
      },
    );
  });

  describe('wrongly typed port values', () => {
    it.each([['443'], [443.5], [0], [65536], [null], [{}], [true]])(
      'answers 400 INVALID_PORT for %p without crashing',
      async (value) => {
        // Act
        const response = await post('ports', { values: [value], mode: 'blacklist' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          status: 'error',
          code: 'INVALID_PORT',
          message: 'Ports must be integers between 1 and 65535.',
        });
      },
    );
  });

  describe('malformed request envelopes', () => {
    it.each([
      ['a non-array values', { values: 'x', mode: 'blacklist' }, 'INVALID_VALUES'],
      ['an empty values array', { values: [], mode: 'blacklist' }, 'INVALID_VALUES'],
      ['a missing values key', { mode: 'blacklist' }, 'INVALID_VALUES'],
      ['an unrecognised mode', { values: ['1.1.1.1'], mode: 'nonsense' }, 'INVALID_MODE'],
      ['a missing mode', { values: ['1.1.1.1'] }, 'INVALID_MODE'],
    ])('answers 400 %s', async (_label, body, code) => {
      // Act
      const response = await post('ips', body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(code);
    });

    it('answers 400 for an unparseable JSON body rather than 500', async () => {
      // Arrange & Act
      const response = await request(app)
        .post(`${BASE}/ips`)
        .set('Content-Type', 'application/json')
        .send('{"values": [');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('malformed rule-management requests', () => {
    it.each([
      ['a non-array ids', { ids: 'x' }],
      ['an empty ids array', { ids: [] }],
      ['a non-integer id', { ids: [1.2] }],
      ['a string id', { ids: ['1'] }],
      ['a null id', { ids: [null] }],
      ['an object id', { ids: [{}] }],
      ['a boolean id', { ids: [true] }],
      ['a mixed batch with one bad id', { ids: [1, '2'] }],
      ['a missing ids key', {}],
    ])('answers 400 INVALID_IDS on delete for %s', async (_label, body) => {
      // Act
      const response = await request(app).delete(`${BASE}/rules`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_IDS');
    });

    it.each([
      ['a string active', { ids: [1], active: 'yes' }],
      ['the string "false"', { ids: [1], active: 'false' }],
      ['a numeric active', { ids: [1], active: 1 }],
      ['a zero active', { ids: [1], active: 0 }],
      ['a null active', { ids: [1], active: null }],
      ['an array active', { ids: [1], active: [true] }],
      ['a missing active', { ids: [1] }],
    ])('answers 400 INVALID_ACTIVE on status update for %s', async (_label, body) => {
      // Act
      const response = await request(app).patch(`${BASE}/rules/status`).send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_ACTIVE');
    });

    it('answers 404 when a referenced rule id does not exist', async () => {
      // Act
      const response = await request(app).delete(`${BASE}/rules`).send({ ids: [987654] });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        code: 'RULE_NOT_FOUND',
        message: 'Rule ID(s) not found: 987654',
      });
    });
  });

  describe('the type query parameter', () => {
    it('answers 400 INVALID_TYPE for an unrecognised type', async () => {
      // Act
      const response = await request(app).get(`${BASE}/rules?type=bogus`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TYPE');
    });

    // A repeated query parameter arrives as an array, which used to reach
    // type.toLowerCase() and fail with a TypeError.
    it('answers 400 INVALID_TYPE for a repeated type parameter', async () => {
      // Act
      const response = await request(app).get(`${BASE}/rules?type=ip&type=domain`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        code: 'INVALID_TYPE',
        message: "Type must be one of 'ip', 'domain' or 'port'.",
      });
    });

    it('does not report a TypeError message to the client', async () => {
      // Act
      const response = await request(app).get(`${BASE}/rules?type=ip&type=domain`);

      // Assert
      expect(JSON.stringify(response.body)).not.toContain('toLowerCase');
    });

    it('still filters normally when the type is a single valid string', async () => {
      // Act
      const response = await request(app).get(`${BASE}/rules?type=ip`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
});
