import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    PORT: z
      .string()
      .default("3000")
      .transform((v) => Number.parseInt(v, 10))
      .pipe(z.number().int().positive()),
    /** On Vercel, `NODE_ENV` is often omitted during module load — treat as production. */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .optional()
      .transform((v) =>
        v != null ? v : process.env.VERCEL === "1" ? "production" : "development"
      ),
    CORS_ORIGIN: z.string().default("*"),
    GMAIL_USER: z.string().email(),
    GMAIL_APP_PASSWORD: z.string().min(1),
    /** Optional ops inbox CC; omit or empty to skip */
    ALERT_EMAIL: z
      .union([z.string().email(), z.literal("")])
      .optional()
      .transform((v) => v ?? ""),
  })
  .passthrough();

const rawEnv = {
  ...process.env,
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL,
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const msg = `[env] Invalid configuration: ${JSON.stringify(
    parsed.error.flatten().fieldErrors
  )}`;
  console.error("❌", msg);
  // Throw so Vercel logs show the validation error instead of opaque exit codes.
  throw new Error(msg);
}

export const env = parsed.data;
export type Env = typeof env;
