import { Link, createFileRoute } from "@tanstack/react-router";
import { categoryInfo, type GameCategory } from "@starter/db/schema/game";
import { useEffect, useState } from "react";
import { GameCard } from "@/components/game-card";
import { listHomeGames } from "@/functions/games";
import { abs, gameHref, site } from "@/site";
const title = "Free Online Games — Play Instantly, No Download | igame9";
const faq: [string, string][] = [
  [
    "Are the games on igame9 free?",
    "Yes. Every game is free to play in your browser. Our own games need no account, no download and have no in-game purchases; listings from other developers link to or embed their own free browser games.",
  ],
  [
    "Do these games work on Chromebooks, phones and tablets?",
    "They are lightweight HTML5 games that run in any modern browser. Our own games support mouse and keyboard, and touch controls on phones and tablets.",
  ],
  [
    "Is my progress saved?",
    "Best scores and idle-game progress are stored locally in your browser. Clearing site data or using a private window resets them.",
  ],
  [
    "Do I need to create an account?",
    "Not to play. An account is only needed if you are a developer submitting your own game to the directory.",
  ],
  [
    "How do I play in fullscreen?",
    "Click the fullscreen button in the bar under any game. The game and its toolbar fill the screen; press the same button (or Esc) to return to the page.",
  ],
  [
    "Are these the official versions of the games?",
    "Our own games are original browser games built in the style of the titles people search for, and each page explains how the original works and who made it. Games submitted by developers are their own work, listed with a link back to their site.",
  ],
  [
    "Can I add my game to igame9?",
    "Yes. Sign in and submit it: a free listing goes live after review once our badge is on your game page, or a featured listing goes live right after payment with a homepage spot.",
  ],
];
export const Route = createFileRoute("/")({
  loader: () => listHomeGames(),
  head: ({ loaderData: games = [] }) => ({
    meta: [
      { title },
      { name: "description", content: site.description },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: site.description },
      { property: "og:url", content: abs("/") },
      { property: "og:image", content: abs("/assets/img/og/hub.png") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: abs("/") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.name,
            url: abs("/"),
            description: site.description,
            inLanguage: "en",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Free browser games on igame9",
            numberOfItems: games.length,
            itemListElement: games.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: abs(gameHref(g)),
              name: g.title,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map(([q, a]) => ({
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
  const games = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const categories = (Object.keys(categoryInfo) as GameCategory[]).filter((key) =>
    games.some((g) => g.category === key),
  );
  // Deep links like /#racing (used by every static game page header) preselect that category.
  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.slice(1);
      if (!categories.includes(h as GameCategory)) return;
      setFilter(h);
      // The browser already jumped to the anchor in the full page; re-align once the filter collapses it.
      requestAnimationFrame(() => document.getElementById(h)?.scrollIntoView());
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, [categories.join()]);
  const popular = games
    .filter((g) => g.plan === "own")
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8);
  const featured = games.filter((g) => g.plan !== "own" && g.featured);
  const fresh = games
    .filter((g) => g.plan !== "own" && !g.featured)
    .sort((a, b) => +new Date(b.publishedAt ?? 0) - +new Date(a.publishedAt ?? 0))
    .slice(0, 8);
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = terms.length
    ? games.filter(
        (g) =>
          (filter === "all" || g.category === filter) &&
          terms.every((t) =>
            [g.title, ...g.tags, categoryInfo[g.category as GameCategory]?.name ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(t),
          ),
      )
    : [];
  const all = filter === "all" && !terms.length;
  return (
    <main id="main" className="wrap">
      <section className="hub-hero">
        <h1>
          Free online games you can <span>play instantly</span>
        </h1>
        <p>
          {games.length} free online games — tower defense, stickman fights, idle tycoons,
          cliff-edge drifting, temple runners, two-layer mahjong, merge and physics puzzles — no
          download, no login, on desktop, Chromebook and mobile.
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
            Search games
          </label>
          <input
            id="q"
            type="search"
            placeholder={`Search ${games.length} games, e.g. drift, idle, temple run…`}
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
        <div className="stats">
          <span>
            <b>{games.length}</b>games
          </span>
          <span>
            <b>{categories.length}</b>categories
          </span>
          <span>
            <b>0</b>downloads needed
          </span>
        </div>
      </section>

      {terms.length ? (
        <div id="results">
          <div className="section-head">
            <p className="section-title">Search results</p>
          </div>
          <div className="grid">
            {hits.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
          {!hits.length ? (
            <p className="no-results">
              No games match that search. Try “idle”, “drift” or “puzzle”.
            </p>
          ) : null}
        </div>
      ) : null}

      {all && featured.length ? (
        <section aria-labelledby="h-featured">
          <div className="section-head">
            <h2 id="h-featured">⭐ Featured games from developers</h2>
          </div>
          <div className="grid">
            {featured.map((g) => (
              <GameCard key={g.id} game={g} badge="Featured" />
            ))}
          </div>
        </section>
      ) : null}

      {all ? (
        <section id="trending" aria-labelledby="h-trending">
          <div className="section-head">
            <h2 id="h-trending">🔥 Popular free online games</h2>
          </div>
          <p className="section-intro">
            The games people search for most — start here if you just want something good to play.
          </p>
          <div className="grid">
            {popular.map((g, i) => (
              <GameCard key={g.id} game={g} badge={i < 3 ? "Popular" : ""} />
            ))}
          </div>
        </section>
      ) : null}

      {!terms.length
        ? categories
            .filter((key) => filter === "all" || filter === key)
            .map((key) => {
              const c = categoryInfo[key];
              const list = games.filter((g) => g.category === key);
              return (
                <section
                  key={key}
                  className="cat-section"
                  id={key}
                  data-cat={key}
                  aria-labelledby={`h-${key}`}
                >
                  <div className="section-head">
                    <h2 id={`h-${key}`}>
                      {c.icon} {c.h2}
                    </h2>
                    <span className="chip">{list.length} games</span>
                  </div>
                  <p className="section-intro">{c.blurb}</p>
                  <div className="grid">
                    {list.map((g) => (
                      <GameCard key={g.id} game={g} />
                    ))}
                  </div>
                </section>
              );
            })
        : null}

      {all && fresh.length ? (
        <section aria-labelledby="h-new">
          <div className="section-head">
            <h2 id="h-new">🆕 New from independent developers</h2>
          </div>
          <div className="grid">
            {fresh.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="card-box hub-cta" style={{ marginTop: 48 }} aria-labelledby="h-submit">
        <h2 id="h-submit">Made a browser game?</h2>
        <p>
          List it on igame9 for free with our badge, or get a featured spot on this page that goes
          live as soon as you pay.
        </p>
        <Link to="/submit" className="button">
          Submit your game
        </Link>
      </section>

      <section aria-labelledby="h-about">
        <div className="section-head">
          <h2 id="h-about">Why play free online games on igame9</h2>
        </div>
        <div className="hub-why">
          <img
            src="/assets/img/hub-devices.svg"
            alt="Free online games on igame9 running on a laptop, a tablet and a phone"
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
          />
          <div className="prose">
            <p>
              Most games here are small HTML5 games we build ourselves, so they start in a second or
              two, keep working on a slow school or library connection and never ask you to install
              anything. Each one is only a few dozen kilobytes.
            </p>
            <p>
              Each of our games is inspired by a title people already love — Drift Boss, Temple Run,
              Merge Dragons, IdleOn and more — and its page explains how the original works, who
              made it and how our version differs, so you always know what you are playing.
              Independent developers can list their own browser games here too.
            </p>
          </div>
        </div>
        <div className="hub-about">
          <div className="card-box">
            <h3>⚡ Free games that start instantly</h3>
            <p>
              Every game loads straight from the page. Nothing to install, no plugins and no sign-up
              wall.
            </p>
          </div>
          <div className="card-box">
            <h3>📱 Games for any device</h3>
            <p>
              Keyboard and mouse on desktop and Chromebook, tap and swipe on phones and tablets. Hit
              fullscreen for the best view.
            </p>
          </div>
          <div className="card-box">
            <h3>📖 A guide for every game</h3>
            <p>
              Each of our pages has controls, strategy tips and background on the original game, so
              you know exactly how to get a higher score.
            </p>
          </div>
        </div>
      </section>

      <section
        className="prose faq"
        aria-labelledby="h-faq"
        style={{ marginTop: 48, maxWidth: 860 }}
      >
        <h2 id="h-faq">Free online games FAQ</h2>
        {faq.map(([question, answer], i) => (
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
