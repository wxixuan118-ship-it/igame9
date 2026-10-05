import { db } from "@starter/db";
import { blogPost } from "@starter/db/schema/blog";
import { game } from "@starter/db/schema/game";
import { env } from "@starter/env/server";
import { DIRECTORY_BASE } from "@starter/env/base";
import { and, eq, ne } from "drizzle-orm";
import { createFileRoute } from "@tanstack/react-router";
function escape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = await db
          .select({ slug: blogPost.slug, locale: blogPost.locale, updatedAt: blogPost.updatedAt })
          .from(blogPost)
          .where(eq(blogPost.status, "published"));
        const games = await db
          .select({ slug: game.slug })
          .from(game)
          // Our own games are listed in the games site's sitemap (igame9.ai/sitemap.xml).
          .where(and(eq(game.status, "published"), ne(game.plan, "own")));
        const origin = env.BETTER_AUTH_URL.replace(/\/$/, "") + DIRECTORY_BASE;
        const entries = [
          "/",
          "/games",
          ...games.map((g) => `/games/${encodeURIComponent(g.slug)}`),
          ...posts.map((p) => `/${p.locale}/blog/${encodeURIComponent(p.slug)}`),
        ];
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((path) => `<url><loc>${escape(origin + path)}</loc></url>`).join("")}</urlset>`,
          { headers: { "content-type": "application/xml; charset=utf-8" } },
        );
      },
    },
  },
});
