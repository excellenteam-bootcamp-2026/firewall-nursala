import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  ENV: z.enum(["dev", "production"]),
  PORT: z.coerce.number().max(65535).min(1),
  DEV_DATABASE_URI: z.string().url(),
  PROD_DATABASE_URI: z.string().url(),
});
const env = EnvSchema.parse(process.env);
export const config = {
  port: env.PORT,
  env: env.ENV,
  databaseUri: env.ENV === "dev" ? env.DEV_DATABASE_URI : env.PROD_DATABASE_URI,
};
