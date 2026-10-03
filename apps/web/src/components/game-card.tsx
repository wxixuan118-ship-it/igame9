import { categoryInfo } from "@starter/db/schema/game";
import { gameHref } from "@/site";
export type GameCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  url: string;
  thumbnailUrl: string | null;
  plan: string;
  featured: boolean;
};
const categoryName = (key: string) => categoryInfo[key as keyof typeof categoryInfo]?.name ?? key;
/** Same markup and classes as the static site's card() so both render identically. */
export function GameCard({ game: g, badge }: { game: GameCardData; badge?: string }) {
  const label = badge ?? (g.plan === "paid" || g.featured ? "Featured" : "");
  return (
    <a
      className="card"
      href={gameHref(g)}
      data-cat={g.category}
      data-name={[g.title, ...g.tags, categoryName(g.category)].join(" ").toLowerCase()}
    >
      <img
        className="thumb"
        src={g.thumbnailUrl ?? "/thumb-fallback.svg"}
        alt={`${g.title} game preview`}
        width={640}
        height={360}
        loading="lazy"
        decoding="async"
      />
      {label ? <span className="badge">{label}</span> : null}
      <span className="card-body">
        <span className="card-title">{g.title}</span>
        <span className="card-sub">{g.summary}</span>
      </span>
    </a>
  );
}
export function GameGrid({ games }: { games: GameCardData[] }) {
  if (!games.length) return <p className="muted">No games yet.</p>;
  return (
    <div className="grid">
      {games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </div>
  );
}
