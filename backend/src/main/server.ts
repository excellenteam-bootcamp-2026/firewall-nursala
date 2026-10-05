import { createApp } from './app';
import { createFirewallRouterFor } from './composition';
import { config } from './config/env';
import { logger } from './config/Logger';
import { FirewallRuleFactory } from '../application/factories/FirewallRuleFactory';
import { createDatabase } from '../adapters/outbound/persistence/drizzle/database';
import { PostgresFirewallRepository } from '../adapters/outbound/persistence/drizzle/PostgresFirewallRepository';

/**
 * Startup lifecycle:
 *   validated environment -> logger -> database client -> Stop-and-Wait connect
 *   -> PostgresFirewallRepository -> FirewallService -> Express app -> listen
 *
 * The listen call is reached only after the database has answered, so the
 * process never serves database-backed requests before it is ready.
 */
async function start(): Promise<void> {
  const database = createDatabase(config.databaseUri);

  await database.connect(config.dbConnectionInterval);

  const factory = new FirewallRuleFactory();
  const repository = new PostgresFirewallRepository(database.db, factory);
  const app = createApp(createFirewallRouterFor(repository, factory));

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down.`);
    server.close(() => {
      void database.close();
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exitCode = 1;
});
