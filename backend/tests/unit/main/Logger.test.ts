import os from 'os';
import path from 'path';

/**
 * The logger is driven entirely by the validated config, so these tests mock
 * that config rather than the environment. They assert the project's observable
 * behaviour — where logs go, at which level, and that the console override is
 * safe — not winston's internals.
 */
const configMock = {
  port: 3000,
  env: 'dev',
  databaseUri: 'postgresql://localhost:5432/db',
  dbConnectionInterval: 1000,
  logLevel: 'debug',
  logFilePath: path.join(os.tmpdir(), 'firewall-logger-test.log'),
};

jest.mock('../../../src/main/config/env', () => ({
  get config() {
    return configMock;
  },
}));

const LOGGER_MODULE = '../../../src/main/config/Logger';

interface TransportLike {
  constructor: { name: string };
  filename?: string;
}

interface LoggerLike {
  level?: string;
  transports?: TransportLike[];
  info?: (message: string) => unknown;
}

interface LoadResult {
  logger: LoggerLike;
  createLogger: jest.Mock;
  /** The console object as seen inside the isolated registry. */
  isConsole: boolean;
}

/**
 * Loads a fresh Logger under the given config.
 *
 * winston is injected through the isolated module registry rather than spied on
 * from out here: jest.isolateModules gives the module its own copy, so an outer
 * spy would never be seen by it.
 */
function loadLogger(
  overrides: Partial<typeof configMock> = {},
  options: { breakWinston?: boolean } = {},
): LoadResult {
  Object.assign(configMock, overrides);

  let result: LoadResult | undefined;

  jest.isolateModules(() => {
    const actualWinston = jest.requireActual('winston') as {
      createLogger: (options: unknown) => unknown;
    };

    const createLogger = jest.fn((loggerOptions: unknown) => {
      if (options.breakWinston) {
        throw new Error('winston unavailable');
      }

      return actualWinston.createLogger(loggerOptions);
    });

    jest.doMock('winston', () => ({ ...actualWinston, createLogger }));

    const logger = (jest.requireActual(LOGGER_MODULE) as { logger: LoggerLike }).logger;

    result = { logger, createLogger, isConsole: logger === console };
  });

  return result!;
}

/** Loads the module twice inside one registry to observe the singleton. */
function loadLoggerTwice(): { first: unknown; second: unknown; createLogger: jest.Mock } {
  let outcome: { first: unknown; second: unknown; createLogger: jest.Mock } | undefined;

  jest.isolateModules(() => {
    const actualWinston = jest.requireActual('winston') as {
      createLogger: (options: unknown) => unknown;
    };
    const createLogger = jest.fn((loggerOptions: unknown) =>
      actualWinston.createLogger(loggerOptions),
    );

    jest.doMock('winston', () => ({ ...actualWinston, createLogger }));

    const first = (jest.requireActual(LOGGER_MODULE) as { logger: unknown }).logger;
    const second = (jest.requireActual(LOGGER_MODULE) as { logger: unknown }).logger;

    outcome = { first, second, createLogger };
  });

  return outcome!;
}

describe('Logger', () => {
  // Loading the module replaces console.log by design, so the real one is put
  // back after every test to keep the rest of the suite unaffected.
  const originalConsoleLog = console.log;
  const defaults = { ...configMock };

  afterEach(() => {
    console.log = originalConsoleLog;
    Object.assign(configMock, defaults);
    jest.restoreAllMocks();
    jest.dontMock('winston');
  });

  describe('singleton behaviour', () => {
    it('hands out the same instance for every import in a module registry', () => {
      // Act
      const { first, second } = loadLoggerTwice();

      // Assert
      expect(first).toBe(second);
    });

    it('creates the underlying logger only once', () => {
      // Act
      const { createLogger } = loadLoggerTwice();

      // Assert
      expect(createLogger).toHaveBeenCalledTimes(1);
    });
  });

  describe('development configuration', () => {
    it('writes to the console', () => {
      // Act
      const { logger } = loadLogger({ env: 'dev' });

      // Assert
      expect(logger.transports![0]!.constructor.name).toBe('Console');
    });

    it('runs at the configured development level', () => {
      // Act
      const { logger } = loadLogger({ env: 'dev', logLevel: 'debug' });

      // Assert
      expect(logger.level).toBe('debug');
    });
  });

  describe('production configuration', () => {
    it('writes to a file rather than the console', () => {
      // Act
      const { logger } = loadLogger({ env: 'production', logLevel: 'info' });

      // Assert
      expect(logger.transports![0]!.constructor.name).toBe('File');
    });

    it('writes to the configured log file path', () => {
      // Arrange
      const logFilePath = path.join(os.tmpdir(), 'firewall-logger-production.log');

      // Act
      const { logger } = loadLogger({ env: 'production', logLevel: 'info', logFilePath });

      // Assert
      expect(logger.transports![0]!.filename).toBe(path.basename(logFilePath));
    });

    it('runs at info level', () => {
      // Act
      const { logger } = loadLogger({ env: 'production', logLevel: 'info' });

      // Assert
      expect(logger.level).toBe('info');
    });
  });

  describe('console override', () => {
    it('routes console.log through the logger', () => {
      // Arrange
      const { logger } = loadLogger({ env: 'dev' });
      const infoSpy = jest.spyOn(logger as Required<LoggerLike>, 'info').mockReturnValue(logger);

      // Act
      console.log('routed', 'message');

      // Assert
      expect(infoSpy).toHaveBeenCalledWith('routed message');
    });

    it('falls back to the console when winston cannot be created', () => {
      // Arrange
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      // Act
      const { logger, isConsole } = loadLogger({ env: 'dev' }, { breakWinston: true });

      // Assert
      expect(isConsole).toBe(true);
      expect(logger).toBeDefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('does not recurse when the logger fell back to the console', () => {
      // Arrange
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const { isConsole } = loadLogger({ env: 'dev' }, { breakWinston: true });
      expect(isConsole).toBe(true);

      // Act & Assert: a self-referential override would exhaust the stack here.
      expect(() => console.log('no recursion')).not.toThrow();
    });
  });
});
