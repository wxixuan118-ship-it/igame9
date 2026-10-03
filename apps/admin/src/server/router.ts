import { db } from "@starter/db";
import { user, session } from "@starter/db/schema/auth";
import { adminAuditEvent } from "@starter/db/schema/admin";
import { payment, subscription } from "@starter/db/schema/payment";
import { blogPost } from "@starter/db/schema/blog";
import { game } from "@starter/db/schema/game";
import { createBlogImageUpload } from "@starter/storage";
import { fields, gameInput, uniqueSlug } from "@starter/api/games";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure } from "./orpc";
const postInput = z.object({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.enum(["en", "zh-CN"]),
  title: z.string().min(1),
  excerpt: z.string(),
  markdown: z.string(),
  coverUrl: z.url().optional().or(z.literal("")),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["draft", "published"]),
});
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function audit(
  tx: Tx,
  actorUserId: string,
  action: string,
  targetId: string,
  reason?: string,
) {
  await tx.insert(adminAuditEvent).values({
    id: crypto.randomUUID(),
    actorUserId,
    action,
    targetType: "game",
    targetId,
    reason: reason ?? null,
  });
}
export const adminRouter = {
  me: adminProcedure.handler(({ context }) => ({ email: context.admin.email })),
  users: {
    list: adminProcedure.handler(() =>
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          disabledAt: user.disabledAt,
          createdAt: user.createdAt,
        })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(100),
    ),
    setDisabled: adminProcedure
      .input(z.object({ id: z.string(), disabled: z.boolean(), reason: z.string().trim().min(1) }))
      .handler(async ({ input, context }) =>
        db.transaction(async (tx) => {
          const [before] = await tx
            .select({ disabledAt: user.disabledAt })
            .from(user)
            .where(eq(user.id, input.id))
            .limit(1);
          if (!before) throw new Error("User not found");
          const disabledAt = input.disabled ? new Date() : null;
          await tx.update(user).set({ disabledAt }).where(eq(user.id, input.id));
          if (input.disabled) await tx.delete(session).where(eq(session.userId, input.id));
          await tx.insert(adminAuditEvent).values({
            id: crypto.randomUUID(),
            actorUserId: context.admin.id,
            action: input.disabled ? "user_disable" : "user_restore",
            targetType: "user",
            targetId: input.id,
            reason: input.reason,
            before,
            after: { disabledAt },
          });
          return { ok: true };
        }),
      ),
  },
  payments: {
    list: adminProcedure.handler(() =>
      db.select().from(payment).orderBy(desc(payment.updatedAt)).limit(100),
    ),
    subscriptions: adminProcedure.handler(() =>
      db.select().from(subscription).orderBy(desc(subscription.updatedAt)).limit(100),
    ),
  },
  audit: {
    list: adminProcedure.handler(() =>
      db.select().from(adminAuditEvent).orderBy(desc(adminAuditEvent.createdAt)).limit(100),
    ),
  },
  games: {
    list: adminProcedure.handler(() =>
      db
        .select()
        .from(game)
        // review queue first, then everything else newest first
        .orderBy(
          asc(sql`case ${game.status} when 'pending' then 0 else 1 end`),
          desc(game.updatedAt),
        )
        .limit(200),
    ),
    review: adminProcedure
      .input(
        z.object({
          id: z.string(),
          action: z.enum(["approve", "reject"]),
          reason: z.string().trim().max(500).optional(),
        }),
      )
      .handler(({ input, context }) =>
        db.transaction(async (tx) => {
          if (input.action === "reject" && !input.reason) throw new Error("Reason required");
          const [row] = await tx.select().from(game).where(eq(game.id, input.id)).limit(1);
          if (!row) throw new Error("Game not found");
          await tx
            .update(game)
            .set(
              input.action === "approve"
                ? {
                    status: "published",
                    rejectReason: null,
                    publishedAt: row.publishedAt ?? new Date(),
                  }
                : { status: "rejected", rejectReason: input.reason },
            )
            .where(eq(game.id, input.id));
          await audit(tx, context.admin.id, `game_${input.action}`, input.id, input.reason);
          return { ok: true };
        }),
      ),
    setFeatured: adminProcedure
      .input(z.object({ id: z.string(), featured: z.boolean() }))
      .handler(({ input, context }) =>
        db.transaction(async (tx) => {
          await tx.update(game).set({ featured: input.featured }).where(eq(game.id, input.id));
          await audit(
            tx,
            context.admin.id,
            input.featured ? "game_feature" : "game_unfeature",
            input.id,
          );
          return { ok: true };
        }),
      ),
    /** Our own studio games: published immediately with a followed link. */
    saveOwn: adminProcedure
      .input(
        gameInput.extend({
          id: z.string().optional(),
          embedRightsConfirmed: z.boolean().default(true),
        }),
      )
      .handler(({ input, context }) =>
        db.transaction(async (tx) => {
          const values = { ...fields(input), dofollow: true };
          const id = input.id ?? crypto.randomUUID();
          if (input.id) await tx.update(game).set(values).where(eq(game.id, id));
          else
            await tx.insert(game).values({
              id,
              slug: await uniqueSlug(input.title),
              ...values,
              plan: "own",
              status: "published",
              publishedAt: new Date(),
            });
          await audit(tx, context.admin.id, "game_save_own", id);
          return { id };
        }),
      ),
  },
  blog: {
    list: adminProcedure.handler(() =>
      db.select().from(blogPost).orderBy(desc(blogPost.updatedAt)).limit(100),
    ),
    save: adminProcedure.input(postInput).handler(async ({ input, context }) =>
      db.transaction(async (tx) => {
        const id = input.id ?? crypto.randomUUID();
        const values = {
          slug: input.slug,
          locale: input.locale,
          title: input.title,
          excerpt: input.excerpt,
          markdown: input.markdown,
          coverUrl: input.coverUrl || null,
          seoTitle: input.seoTitle || null,
          seoDescription: input.seoDescription || null,
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
          updatedAt: new Date(),
        };
        if (input.id) {
          await tx.update(blogPost).set(values).where(eq(blogPost.id, id));
        } else {
          await tx.insert(blogPost).values({ id, ...values, authorId: context.admin.id });
        }
        await tx.insert(adminAuditEvent).values({
          id: crypto.randomUUID(),
          actorUserId: context.admin.id,
          action: input.status === "published" ? "blog_publish" : "blog_save",
          targetType: "blog_post",
          targetId: id,
        });
        return { id };
      }),
    ),
    uploadUrl: adminProcedure
      .input(
        z.object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif"]) }),
      )
      .handler(({ input }) => createBlogImageUpload(input.contentType)),
  },
};
export type AdminRouter = typeof adminRouter;
