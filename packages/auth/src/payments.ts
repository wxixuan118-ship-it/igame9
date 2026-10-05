import { db } from "@starter/db";
import { payment, webhookEvent } from "@starter/db/schema/payment";
import { user } from "@starter/db/schema/auth";
import { game } from "@starter/db/schema/game";
import { env } from "@starter/env/server";
import { DIRECTORY_BASE } from "@starter/env/base";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const LISTING_NAME = "Featured game listing";
const listingCents = Math.round(Number(env.FEATURED_LISTING_PRICE_USD) * 100);
if (!Number.isInteger(listingCents) || listingCents < 50)
  throw new Error("FEATURED_LISTING_PRICE_USD must be a USD amount of at least 0.50");

/** One-time Stripe Checkout for a featured listing; the webhook publishes the game. */
export async function createListingCheckout(
  userId: string,
  email: string,
  gameId: string,
  gameTitle: string,
) {
  const origin = env.BETTER_AUTH_URL.replace(/\/$/, "") + DIRECTORY_BASE;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: listingCents,
          product_data: {
            name: LISTING_NAME,
            description: gameTitle.slice(0, 200),
            // Required by Stripe Managed Payments; "General - Electronically Supplied Services".
            tax_code: "txcd_10000000",
          },
        },
      },
    ],
    metadata: { userId, gameId },
    payment_intent_data: { metadata: { userId, gameId } },
    success_url: `${origin}/success`,
    cancel_url: `${origin}/app`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { checkoutUrl: session.url };
}

export function verifyStripeEvent(body: string, signature: string | null) {
  return stripe.webhooks.constructEvent(body, signature ?? "", env.STRIPE_WEBHOOK_SECRET);
}

export async function processStripeEvent(event: Stripe.Event) {
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(webhookEvent)
      .values({ id: event.id, eventType: event.type })
      .onConflictDoNothing()
      .returning({ id: webhookEvent.id });
    if (!inserted.length) return;

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const s = event.data.object;
      // Delayed payment methods complete with "unpaid" and follow up with async_payment_succeeded.
      if (s.payment_status !== "paid") return;
      const userId = s.metadata?.userId ?? s.client_reference_id;
      if (!userId) throw new Error(`Stripe event ${event.id} has no user identity`);
      const [buyer] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (!buyer) throw new Error(`Stripe event ${event.id} references unknown user`);
      const paymentIntent =
        typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      await tx
        .insert(payment)
        .values({
          id: crypto.randomUUID(),
          userId,
          orderId: s.id,
          paymentId: paymentIntent ?? s.id,
          productId: "featured-listing",
          productName: LISTING_NAME,
          amount: s.amount_total == null ? null : (s.amount_total / 100).toFixed(2),
          currency: s.currency?.toUpperCase() ?? null,
          status: "completed",
          paidAt: new Date(event.created * 1000),
        })
        .onConflictDoNothing({ target: payment.paymentId });
      const gameId = s.metadata?.gameId;
      if (gameId)
        await tx
          .update(game)
          .set({
            status: "published",
            plan: "paid",
            featured: true,
            dofollow: true,
            orderId: s.id,
            publishedAt: new Date(),
          })
          .where(
            and(
              eq(game.id, gameId),
              eq(game.submitterId, userId),
              eq(game.status, "awaiting_payment"),
            ),
          );
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      // ponytail: refunds only mark the payment; unlisting a refunded game stays a manual admin call.
      if (paymentIntent)
        await tx
          .update(payment)
          .set({
            status: charge.refunded ? "refunded" : "partially_refunded",
            updatedAt: new Date(),
          })
          .where(eq(payment.paymentId, paymentIntent));
    }
  });
}
