import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { loadEnvFile } from "./load-env";
if (!process.env.VERCEL) loadEnvFile();
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    // Optional: Google sign-in is offered only when both are set.
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    TURNSTILE_SECRET: z.string().min(1),
    TURNSTILE_SITE_KEY: z.string().min(1),
    TURNSTILE_HOSTNAMES: z.string().min(1),
    // Optional: password-reset emails fail with a clear error until set.
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM: z.string().min(1).optional(),
    ADMIN_EMAILS: z.string().min(1),
    ADMIN_BETTER_AUTH_URL: z.url().optional(),
    ADMIN_BETTER_AUTH_SECRET: z.string().min(32).optional(),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    FEATURED_LISTING_PRICE_USD: z.string().default("29"),
    // Optional: only the admin blog image upload uses object storage.
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_PUBLIC_BASE_URL: z.url().optional(),
    SENTRY_DSN: z.url().optional(),
  },
  runtimeEnv: {
    ...process.env,
    BETTER_AUTH_URL:
      process.env.BETTER_AUTH_URL ?? (vercelUrl ? `https://${vercelUrl}` : undefined),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
