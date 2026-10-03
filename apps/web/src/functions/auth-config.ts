import { createServerFn } from "@tanstack/react-start";
import { env } from "@starter/env/server";
/** Public auth settings read at runtime, so a Docker build needs no VITE_* variables. */
export const getAuthConfig = createServerFn({ method: "GET" }).handler(() => ({
  turnstileSiteKey: env.TURNSTILE_SITE_KEY,
  google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
}));
