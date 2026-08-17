/**
 * dotenv is stubbed so these tests see only the environment they set, rather
 * than whatever the developer's real .env happens to contain. Without this, a
 * "missing variable" case could not be expressed: dotenv would put it back.
 */
jest.mock('dotenv', () => ({
  __esModule: true,
  default: { config: () => ({ parsed: {} }) },
}));

const VALID_ENV: Record<string, string> = {
  ENV: 'dev',
  PORT: '3000',
  DEV_DATABASE_URI: 'postgresql://postgres:postgres@localhost:5432/firewall_dev',
  PROD_DATABASE_URI: 'postgresql://postgres:postgres@localhost:5432/firewall_prod',
  DB_CONNECTION_INTERVAL: '3000',
  LOG_LEVEL: 'debug',
  LOG_FILE_PATH: 'logs/app.log',
};

interface LoadedConfig {
  port: number;
  env: string;
  databaseUri: string;
  dbConnectionInterval: number;
  logLevel: string;
  logFilePath: string;
}

/** Loads config under a specific environment; `undefined` removes a variable. */
function loadConfig(overrides: Record<string, string | undefined> = {}): LoadedConfig {
  const saved = process.env;
  const next: Record<string, string> = { ...VALID_ENV };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }

  process.env = next as unknown as typeof process.env;

  try {
    let loaded: LoadedConfig | undefined;

    jest.isolateModules(() => {
      loaded = (jest.requireActual('../../../src/main/config/env') as { config: LoadedConfig })
        .config;
    });

    return loaded!;
  } finally {
    process.env = saved;
  }
}

describe('environment configuration', () => {
  describe('a valid environment', () => {
    it('loads a development configuration', () => {
      // Act
      const config = loadConfig({ ENV: 'dev' });

      // Assert
      expect(config.env).toBe('dev');
      expect(config.port).toBe(3000);
      expect(config.dbConnectionInterval).toBe(3000);
    });

    it('loads a production configuration', () => {
      // Act
      const config = loadConfig({ ENV: 'production' });

      // Assert
      expect(config.env).toBe('production');
    });

    it('exposes the retry interval as a number for Stage 3 Stop-and-Wait', () => {
      // Act
      const config = loadConfig({ DB_CONNECTION_INTERVAL: '750' });

      // Assert
      expect(config.dbConnectionInterval).toBe(750);
      expect(typeof config.dbConnectionInterval).toBe('number');
    });
  });

  describe('database uri selection', () => {
    it('selects the development uri when ENV is dev', () => {
      // Act
      const config = loadConfig({ ENV: 'dev' });

      // Assert
      expect(config.databaseUri).toBe(VALID_ENV.DEV_DATABASE_URI);
    });

    it('selects the production uri when ENV is production', () => {
      // Act
      const config = loadConfig({ ENV: 'production' });

      // Assert
      expect(config.databaseUri).toBe(VALID_ENV.PROD_DATABASE_URI);
    });

    it('rejects a missing development uri', () => {
      // Act
      const act = () => loadConfig({ DEV_DATABASE_URI: undefined });

      // Assert
      expect(act).toThrow();
    });

    it('rejects a missing production uri', () => {
      // Act
      const act = () => loadConfig({ PROD_DATABASE_URI: undefined });

      // Assert
      expect(act).toThrow();
    });

    it('rejects a uri that is not a url', () => {
      // Act
      const act = () => loadConfig({ DEV_DATABASE_URI: 'not-a-uri' });

      // Assert
      expect(act).toThrow();
    });
  });

  describe('fail-fast validation', () => {
    it.each([
      ['an unsupported ENV', { ENV: 'staging' }],
      ['a missing ENV', { ENV: undefined }],
      ['a non-numeric PORT', { PORT: 'abc' }],
      ['a decimal PORT', { PORT: '3000.5' }],
      ['a PORT of zero', { PORT: '0' }],
      ['a PORT above the tcp range', { PORT: '65536' }],
      ['a missing PORT', { PORT: undefined }],
      ['a decimal DB_CONNECTION_INTERVAL', { DB_CONNECTION_INTERVAL: '1.5' }],
      ['a negative DB_CONNECTION_INTERVAL', { DB_CONNECTION_INTERVAL: '-1' }],
      ['a zero DB_CONNECTION_INTERVAL', { DB_CONNECTION_INTERVAL: '0' }],
      ['a missing DB_CONNECTION_INTERVAL', { DB_CONNECTION_INTERVAL: undefined }],
      ['an unsupported LOG_LEVEL', { LOG_LEVEL: 'verbose' }],
    ])('rejects %s during startup', (_label, overrides) => {
      // Act
      const act = () => loadConfig(overrides);

      // Assert
      expect(act).toThrow();
    });

    it('accepts the inclusive bounds of the tcp port range', () => {
      // Assert
      expect(loadConfig({ PORT: '1' }).port).toBe(1);
      expect(loadConfig({ PORT: '65535' }).port).toBe(65535);
    });
  });

  describe('log level selection', () => {
    // The requirement is that production runs at info; a stray LOG_LEVEL in the
    // environment must not be able to turn debug logging on there.
    it('forces info in production even when LOG_LEVEL asks for debug', () => {
      // Act
      const config = loadConfig({ ENV: 'production', LOG_LEVEL: 'debug' });

      // Assert
      expect(config.logLevel).toBe('info');
    });

    it('defaults development to debug so every message is visible', () => {
      // Act
      const config = loadConfig({ ENV: 'dev', LOG_LEVEL: undefined });

      // Assert
      expect(config.logLevel).toBe('debug');
    });

    it('honours an explicit development level', () => {
      // Act
      const config = loadConfig({ ENV: 'dev', LOG_LEVEL: 'warn' });

      // Assert
      expect(config.logLevel).toBe('warn');
    });

    it('defaults the log file path when none is configured', () => {
      // Act
      const config = loadConfig({ LOG_FILE_PATH: undefined });

      // Assert
      expect(config.logFilePath).toBe('logs/app.log');
    });
  });
});
