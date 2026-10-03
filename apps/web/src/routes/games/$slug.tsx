import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { categoryInfo, type GameCategory } from "@starter/db/schema/game";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getGame } from "@/functions/games";
import { abs } from "@/site";
export const Route = createFileRoute("/games/$slug")({
  loader: async ({ params }) => {
    const row = await getGame({ data: { slug: params.slug } });
    if (!row) throw notFound();
    // Our static games have their own full page at "/<slug>/".
    if (row.url.startsWith("/")) throw redirect({ href: row.url, statusCode: 301 });
    return row;
  },
  head: ({ loaderData: g }) =>
    g
      ? {
          meta: [
            { title: `${g.title} – Play online free | igame9` },
            { name: "description", content: g.summary },
            { property: "og:type", content: "website" },
            { property: "og:title", content: g.title },
            { property: "og:description", content: g.summary },
            { property: "og:url", content: abs(`/games/${g.slug}`) },
            ...(g.thumbnailUrl ? [{ property: "og:image", content: g.thumbnailUrl }] : []),
          ],
          links: [{ rel: "canonical", href: abs(`/games/${g.slug}`) }],
          scripts: [
            {
              type: "application/ld+json",
              children: JSON.stringify([
                {
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Games", item: abs("/") },
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: g.title,
                      item: abs(`/games/${g.slug}`),
                    },
                  ],
                },
                {
                  "@context": "https://schema.org",
                  "@type": "VideoGame",
                  name: g.title,
                  description: g.summary,
                  url: g.url,
                  genre: categoryInfo[g.category as GameCategory]?.name ?? g.category,
                  keywords: g.tags.join(", "),
                  image: g.thumbnailUrl ?? undefined,
                  gamePlatform: "Web browser",
                  operatingSystem: "Any (web browser)",
                  isAccessibleForFree: true,
                },
              ]).replaceAll("<", "\\u003c"),
            },
          ],
        }
      : {},
  component: GamePage,
});
function GamePage() {
  const g = Route.useLoaderData();
  const cat = categoryInfo[g.category as GameCategory];
  // Paid listings get a followed link; free community submissions are nofollow ugc.
  const rel = g.dofollow ? "noopener" : "nofollow ugc noopener";
  return (
    <main id="main" className="wrap page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="/">Games</a> ›{" "}
        <a href={`/games?category=${g.category}`}>{cat?.name ?? g.category}</a>
      </nav>
      <h1>{g.title}</h1>
      <p className="section-intro">
        {g.summary}
        {g.featured ? " · Featured" : ""}
      </p>
      {g.embedUrl ? (
        <div className="embed">
          <iframe
            src={g.embedUrl}
            title={g.title}
            loading="lazy"
            allow="fullscreen; gamepad; autoplay"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <img
          src={g.thumbnailUrl ?? "/thumb-fallback.svg"}
          alt={`${g.title} game preview`}
          width={640}
          height={360}
          style={{ borderRadius: 16, margin: "16px 0" }}
        />
      )}
      <p>
        <a className="button" href={g.url} target="_blank" rel={rel}>
          {g.embedUrl ? "Open on developer site" : "Play now"}
        </a>
      </p>
      {g.body ? (
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{g.body}</ReactMarkdown>
        </div>
      ) : null}
      {g.tags.length ? (
        <div className="chips">
          {g.tags.map((t) => (
            <a key={t} className="chip" href={`/games?tag=${encodeURIComponent(t)}`}>
              #{t}
            </a>
          ))}
        </div>
      ) : null}
      <p className="disclaimer muted">
        This game was submitted by its developer, who is responsible for its content. igame9 is not
        affiliated with the developer.
      </p>
    </main>
  );
}
