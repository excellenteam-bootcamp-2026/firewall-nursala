import winston from "winston";
import { config } from "./env";

class LoggerSingleton {
  private static instance: winston.Logger | Console;

  private constructor() {}

  static getInstance(): winston.Logger | Console {
    if (!LoggerSingleton.instance) {
      try {
        LoggerSingleton.instance = winston.createLogger({
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
  logger.info(args.join(" "));
};