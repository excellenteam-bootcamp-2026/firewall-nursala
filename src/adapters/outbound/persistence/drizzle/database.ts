import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "../../../../main/config/env";
import * as schema from "./schema";

const client = postgres(config.databaseUri);

export const db = drizzle({
  client,
  schema,
});

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function connectDatabase(): Promise<void> {
  while (true) {
    try {
      await client`SELECT 1`;
      console.log("Database connected successfully.");
      return;
    } catch (error) {
      console.error(
        `Database connection failed. Retrying in ${config.dbConnectionInterval}ms.`,
        error,
      );

      await wait(config.dbConnectionInterval);
    }
  }
}

export async function closeDatabase(): Promise<void> {
  await client.end();
}
