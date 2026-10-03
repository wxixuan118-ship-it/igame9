import { processStripeEvent, verifyStripeEvent } from "@starter/auth/payments";
import { createFileRoute } from "@tanstack/react-router";
async function handle(request: Request) {
  const body = await request.text();
  let event;
  try {
    event = verifyStripeEvent(body, request.headers.get("stripe-signature"));
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  await processStripeEvent(event);
  return new Response("OK");
}
export const Route = createFileRoute("/api/webhooks/stripe")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
