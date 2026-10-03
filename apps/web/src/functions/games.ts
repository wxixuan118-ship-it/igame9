import { createServerFn } from "@tanstack/react-start";
import { db } from "@starter/db";
import { game, gameCategories } from "@starter/db/schema/game";
import { and, arrayContains, desc, eq } from "drizzle-orm";
import { z } from "zod";
const card = {
  id: game.id,
  slug: game.slug,
  title: game.title,
  summary: game.summary,
  category: game.category,
  tags: game.tags,
  url: game.url,
  thumbnailUrl: game.thumbnailUrl,
  plan: game.plan,
  featured: game.featured,
};
const published = eq(game.status, "published");
const order = [desc(game.featured), desc(game.rank), desc(game.publishedAt)];
// ponytail: the hub renders every published game in one page (like the static hub did); cap at 500
// and move to per-category paging once the catalog is bigger than that.
export const listHomeGames = createServerFn({ method: "GET" }).handler(() =>
  db
    .select({ ...card, rank: game.rank, publishedAt: game.publishedAt })
    .from(game)
    .where(published)
    .orderBy(...order)
    .limit(500),
);
export const listGames = createServerFn({ method: "GET" })
  .validator(
    z.object({ category: z.enum(gameCategories).optional(), tag: z.string().max(60).optional() }),
  )
  .handler(({ data }) =>
    db
      .select(card)
      .from(game)
      .where(
        and(
          published,
          data.category ? eq(game.category, data.category) : undefined,
          data.tag ? arrayContains(game.tags, [data.tag]) : undefined,
        ),
      )
      .orderBy(...order)
      .limit(500),
  );
export const getGame = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().max(80) }))
  .handler(async ({ data }) => {
    const [row] = await db
      .select({
        ...card,
        body: game.body,
        embedUrl: game.embedUrl,
        dofollow: game.dofollow,
        publishedAt: game.publishedAt,
      })
      .from(game)
      .where(and(eq(game.slug, data.slug), published))
      .limit(1);
    return row ?? null;
  });
