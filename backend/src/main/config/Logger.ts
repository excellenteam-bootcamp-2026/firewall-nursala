import winston from "winston";
import { config } from "./env";

/**
 * Captured before console.log is replaced below. The replacement must never
 * call the patched console.log again, or a fallback to the plain console would
 * recurse until the stack overflows.
 */
const nativeConsoleLog = console.log.bind(console);

class LoggerSingleton {
  private static instance: winston.Logger | Console;

  private constructor() {}

  static getInstance(): winston.Logger | Console {
    if (!LoggerSingleton.instance) {
      try {
        LoggerSingleton.instance = winston.createLogger({
          // The level comes from config, which forces info in production.
          level: config.logLevel,
          format: winston.format.simple(),
          transports: [
            config.env === "dev"
              ? new winston.transports.Console()
              : new winston.transports.File({
                  filename: config.logFilePath,
                }),
          ],
        });
      } catch (error) {
        // Fallback: use plain console if winston initialization fails
        console.error("Failed to initialize winston Logger, falling back to console:", error);
        LoggerSingleton.instance = console;
      }
    }
    return LoggerSingleton.instance;
  }
}

export const logger = LoggerSingleton.getInstance();

console.log = function (...args: unknown[]) {
  const message = args.join(" ");

  // When winston failed to initialise the logger IS the console, so routing the
  // message back through logger.info would re-enter this very function.
  if (logger === console) {
    nativeConsoleLog(message);
    return;
  }

  logger.info(message);
};
