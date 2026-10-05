import { Link, createFileRoute } from "@tanstack/react-router";
import { categoryInfo, type GameCategory } from "@starter/db/schema/game";
import { useState } from "react";
import { GameCard } from "@/components/game-card";
import { getDirectoryHome } from "@/functions/games";
import { abs, asset, dir, site } from "@/site";
const title = "Submit Your Browser Game — igame9 Game Directory";
const description =
  "List your HTML5 or browser game on igame9: free with our badge after review, or a featured listing with a homepage spot and a followed link that goes live as soon as you pay.";
const faq = (price: string): [string, string][] => [
  [
    "How do I list my game for free?",
    "Sign in, add the igame9 badge to the exact page where your game is played, then submit that URL. We check the page for a followed link back to igame9 and review your listing by hand, usually within a few days.",
  ],
  [
    "What does a featured listing include?",
    `A one-time payment of $${price}. Your game goes live right after payment, appears in the featured section of the directory, and links to your site with a followed (dofollow) link.`,
  ],
  [
    "Is the link on a free listing followed?",
    "No. Free listings use a nofollow ugc link. Featured listings and our own games use a followed link.",
  ],
  [
    "Can players play my game on igame9?",
    "Yes, if you add an embed URL and confirm you own the game or have permission to embed it. Otherwise the listing links straight to your site.",
  ],
  [
    "What if my game is rejected?",
    "You will see the reason under My games. Edit the listing and resubmit it; a featured listing keeps its perks. If we cannot list a paid game at all, contact us for a refund.",
  ],
  [
    "What kind of games do you accept?",
    "Free-to-play browser games that load without a download. We do not list games that copy someone else's work, contain malware or adult content, or mislead players.",
  ],
];
export const Route = createFileRoute("/")({
  loader: () => getDirectoryHome(),
  head: ({ loaderData }) => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: abs(dir("/")) },
      { property: "og:image", content: abs(asset("/assets/img/og/hub.png")) },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: abs(dir("/")) }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "igame9 game directory",
            url: abs(dir("/")),
            description,
            isPartOf: { "@type": "WebSite", name: site.name, url: abs("/") },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq(loaderData?.featuredPriceUsd ?? "").map(([q, a]) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          },
        ]).replaceAll("<", "\\u003c"),
      },
    ],
  }),
  component: Home,
});
function Home() {
  const { games, featuredPriceUsd } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const categories = (Object.keys(categoryInfo) as GameCategory[]).filter((key) =>
    games.some((g) => g.category === key),
  );
  const featured = games.filter((g) => g.plan !== "own" && g.featured);
  const fresh = games
    .filter((g) => g.plan !== "own" && !g.featured)
    .sort((a, b) => +new Date(b.publishedAt ?? 0) - +new Date(a.publishedAt ?? 0))
    .slice(0, 12);
  const originals = games
    .filter((g) => g.plan === "own")
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8);
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = games.filter(
    (g) =>
      (filter === "all" || g.category === filter) &&
      terms.every((t) =>
        [g.title, ...g.tags, categoryInfo[g.category as GameCategory]?.name ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(t),
      ),
  );
  const browsing = filter !== "all" || terms.length > 0;
  return (
    <main id="main" className="wrap">
      <section className="hub-hero">
        <h1>
          The igame9 <span>game directory</span>
        </h1>
        <p>
          A directory of free browser games from independent developers. Made a game? List it here
          and get it in front of players — free with our badge, or featured with a followed link.
        </p>
        <p className="row" style={{ justifyContent: "center" }}>
          <Link to="/submit" className="button">
            Submit your game
          </Link>
          <a href="#plans">Compare listings</a>
        </p>
        <div className="search" role="search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <label className="sr-only" htmlFor="q">
            Search the directory
          </label>
          <input
            id="q"
            type="search"
            placeholder={`Search ${games.length} games…`}
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filters" role="toolbar" aria-label="Filter by category">
          {(["all", ...categories] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "All" : `${categoryInfo[key].icon} ${categoryInfo[key].short}`}
            </button>
          ))}
        </div>
      </section>

      {browsing ? (
        <section aria-labelledby="h-results">
          <div className="section-head">
            <h2 id="h-results">
              {terms.length
                ? "Search results"
                : `${categoryInfo[filter as GameCategory].icon} ${categoryInfo[filter as GameCategory].h2}`}
            </h2>
            <span className="chip">{hits.length} games</span>
          </div>
          <div className="grid">
            {hits.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
          {!hits.length ? <p className="no-results">No games match that search.</p> : null}
        </section>
      ) : (
        <>
          {featured.length ? (
            <section aria-labelledby="h-featured">
              <div className="section-head">
                <h2 id="h-featured">⭐ Featured games</h2>
              </div>
              <div className="grid">
                {featured.map((g) => (
                  <GameCard key={g.id} game={g} badge="Featured" />
                ))}
              </div>
            </section>
          ) : null}
          <section aria-labelledby="h-new">
            <div className="section-head">
              <h2 id="h-new">🆕 New from independent developers</h2>
            </div>
            {fresh.length ? (
              <div className="grid">
                {fresh.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            ) : (
              <p className="section-intro">
                Be the first: <Link to="/submit">submit your game</Link> and it will show up here.
              </p>
            )}
          </section>
          <section aria-labelledby="h-originals">
            <div className="section-head">
              <h2 id="h-originals">🎮 igame9 originals</h2>
              <a className="chip" href="/">
                All our games →
              </a>
            </div>
            <p className="section-intro">Free browser games built by the igame9 team.</p>
            <div className="grid">
              {originals.map((g) => (
                <GameCard key={g.id} game={g} badge="igame9 original" />
              ))}
            </div>
          </section>
        </>
      )}

      <section id="plans" aria-labelledby="h-plans" style={{ marginTop: 48 }}>
        <div className="section-head">
          <h2 id="h-plans">List your game</h2>
        </div>
        <div className="hub-about">
          <div className="card-box">
            <h3>Free listing</h3>
            <p>
              Add the igame9 badge to your game page. We verify the link and review your game by
              hand, then list it with a nofollow link.
            </p>
          </div>
          <div className="card-box">
            <h3>⭐ Featured listing — ${featuredPriceUsd}</h3>
            <p>
              One-time payment. Goes live right after payment, gets a spot in the featured section
              and a followed (dofollow) link to your site.
            </p>
          </div>
          <div className="card-box">
            <h3>▶ Playable on igame9</h3>
            <p>
              Add an embed URL and players can start your game right on its igame9 page, with a link
              to your site for the full version.
            </p>
          </div>
        </div>
        <p className="row" style={{ marginTop: 16 }}>
          <Link to="/submit" className="button">
            Submit your game
          </Link>
        </p>
      </section>

      <section
        className="prose faq"
        aria-labelledby="h-faq"
        style={{ marginTop: 48, maxWidth: 860 }}
      >
        <h2 id="h-faq">Directory FAQ</h2>
        {faq(featuredPriceUsd).map(([question, answer], i) => (
          <details key={question} open={i === 0}>
            <summary>{question}</summary>
            <div className="faq-a">
              <p>{answer}</p>
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}
