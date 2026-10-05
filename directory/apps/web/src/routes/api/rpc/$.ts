import { createContext } from "@starter/api/context";
import { appRouter } from "@starter/api/routers/index";
import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import * as Sentry from "@sentry/tanstackstart-react";
import { createFileRoute } from "@tanstack/react-router";
import { DIRECTORY_BASE } from "@starter/env/base";
const rpc = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      Sentry.captureException(error);
      console.error(error);
    }),
  ],
});
async function handle({ request }: { request: Request }) {
  const result = await rpc.handle(request, {
    prefix: `${DIRECTORY_BASE}/api/rpc`,
    context: await createContext({ req: request }),
  });
  return result.response ?? new Response("Not found", { status: 404 });
}
export const Route = createFileRoute("/api/rpc/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
