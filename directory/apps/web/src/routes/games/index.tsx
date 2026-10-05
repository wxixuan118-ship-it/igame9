import { createFileRoute } from "@tanstack/react-router";
import { categoryInfo, gameCategories } from "@starter/db/schema/game";
import { z } from "zod";
import { GameGrid } from "@/components/game-card";
import { listGames } from "@/functions/games";
import { abs, dir } from "@/site";
const search = z.object({
  category: z.enum(gameCategories).optional().catch(undefined),
  tag: z.string().max(60).optional().catch(undefined),
});
export const Route = createFileRoute("/games/")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listGames({ data: deps }),
  head: ({ match }) => {
    const { category, tag } = match.search;
    const name = category ? categoryInfo[category].h2 : tag ? `${tag} games` : "All games";
    const canonical = abs(dir(category ? `/games?category=${category}` : "/games"));
    return {
      meta: [
        { title: `${name} – Play free online | igame9` },
        {
          name: "description",
          content: category
            ? categoryInfo[category].blurb
            : `Browse ${tag ? `${tag} ` : ""}free online games on igame9: browser games you can play instantly, from our studio and independent developers.`,
        },
        // Tag pages are thin filters of the same catalog; keep them out of the index.
        ...(tag ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: Games,
});
function Games() {
  const games = Route.useLoaderData();
  const { category, tag } = Route.useSearch();
  return (
    <main id="main" className="wrap page">
      <h1>{category ? categoryInfo[category].h2 : tag ? `“${tag}” games` : "All games"}</h1>
      {category ? <p className="section-intro">{categoryInfo[category].blurb}</p> : null}
      <div
        className="filters"
        role="navigation"
        aria-label="Categories"
        style={{ margin: "16px 0 24px" }}
      >
        <a href={dir("/games")} aria-current={!category && !tag ? "page" : undefined}>
          All
        </a>
        {gameCategories.map((c) => (
          <a
            key={c}
            href={dir(`/games?category=${c}`)}
            aria-current={category === c ? "page" : undefined}
          >
            {categoryInfo[c].icon} {categoryInfo[c].short}
          </a>
        ))}
      </div>
      <GameGrid games={games} />
    </main>
  );
}
