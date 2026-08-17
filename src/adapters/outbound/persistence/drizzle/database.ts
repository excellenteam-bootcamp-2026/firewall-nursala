import postgres, { Sql } from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type FirewallDatabase = PostgresJsDatabase<typeof schema>;

export interface DatabaseHandle {
  readonly db: FirewallDatabase;
  readonly client: Sql;
  /** Blocks until the database answers, retrying on the Stop-and-Wait interval. */
  connect(retryIntervalMs: number): Promise<void>;
  close(): Promise<void>;
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Builds the database client and Drizzle instance from an already validated
 * URI. The connection string is passed in rather than read from config here, so
 * this adapter stays independent of main/ and can be pointed at a test database.
 */
export function createDatabase(databaseUri: string): DatabaseHandle {
  const client = postgres(databaseUri);
  const db = drizzle({ client, schema });

  return {
    db,
    client,

    async connect(retryIntervalMs: number): Promise<void> {
      // Stop-and-Wait: one attempt at a time, waiting the configured interval
      // between attempts, until the database is ready. No backoff, no attempt
      // limit — startup simply does not proceed without a database.
      while (true) {
        try {
          await client`SELECT 1`;
          console.log("Database connected successfully.");
          return;
        } catch (error) {
          console.error(
            `Database connection failed. Retrying in ${retryIntervalMs}ms.`,
            error,
          );

          await wait(retryIntervalMs);
        }
      }
    },

    async close(): Promise<void> {
      await client.end();
    },
  };
}
