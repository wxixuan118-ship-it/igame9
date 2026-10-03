import type { RouterClient } from "@orpc/server";
import { db } from "@starter/db";
import { payment, subscription } from "@starter/db/schema/payment";
import { game } from "@starter/db/schema/game";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createCheckout, listingProduct, products } from "@starter/auth/payments";
import { ORPCError } from "@orpc/server";
import { gameInput, submitGame, updateGame } from "../games";
import { protectedProcedure, publicProcedure } from "../index";
export const appRouter = {
  health: publicProcedure.handler(() => "OK"),
  me: protectedProcedure.handler(({ context }) => context.session.user),
  products: publicProcedure.handler(() => products),
  payments: protectedProcedure.handler(({ context }) =>
    db
      .select()
      .from(payment)
      .where(eq(payment.userId, context.session.user.id))
      .orderBy(desc(payment.paidAt)),
  ),
  subscriptions: protectedProcedure.handler(({ context }) =>
    db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, context.session.user.id))
      .orderBy(desc(subscription.updatedAt)),
  ),
  checkout: protectedProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .handler(({ input, context }) =>
      createCheckout(context.session.user.id, context.session.user.email, input.productId),
    ),
  games: {
    mine: protectedProcedure.handler(({ context }) =>
      db
        .select()
        .from(game)
        .where(eq(game.submitterId, context.session.user.id))
        .orderBy(desc(game.createdAt)),
    ),
    submit: protectedProcedure
      .input(gameInput.extend({ plan: z.enum(["free", "paid"]) }))
      .handler(({ input, context }) => submitGame(context.session.user.id, input, input.plan)),
    update: protectedProcedure
      .input(gameInput.extend({ id: z.string().min(1) }))
      .handler(({ input, context }) => updateGame(context.session.user.id, input.id, input)),
    /** Starts (or retries) payment for a game still awaiting payment. */
    pay: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const [row] = await db
          .select({ id: game.id })
          .from(game)
          .where(
            and(
              eq(game.id, input.id),
              eq(game.submitterId, userId),
              eq(game.status, "awaiting_payment"),
            ),
          )
          .limit(1);
        if (!row) throw new ORPCError("NOT_FOUND");
        if (!listingProduct)
          throw new ORPCError("PRECONDITION_FAILED", {
            message: "Paid listing is not configured.",
          });
        return createCheckout(userId, context.session.user.email, listingProduct.id, {
          gameId: row.id,
        });
      }),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<AppRouter>;
