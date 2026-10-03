/**
 * Pulls the static igame9 game pages into the directory site.
 *   pnpm sync:static              files + database (local dev)
 *   pnpm sync:static --files      files only (Docker build: no env/database needed)
 *   pnpm sync:static --db         database only (container start)
 * STATIC_SITE_DIR defaults to static/ in this repo.
 * 1. Builds the static site with its own build.mjs into a temp dir.
 * 2. Copies every game page (/<slug>/), /assets, favicon and manifest into apps/web/public.
 *    The static hub, sitemap and robots are skipped: the directory app serves those dynamically.
 * 3. Upserts each page as an `own` game whose url is "/<slug>/", so it shows up in listings and the sitemap.
 * Safe to re-run; pages deleted from the static site are copied out and marked `removed`.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { categoryInfo, game } from "../src/schema/game";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const staticDir = path.resolve(process.env.STATIC_SITE_DIR ?? path.join(repoRoot, "static"));
const onlyFiles = process.argv.includes("--files");
const onlyDb = process.argv.includes("--db");
const publicDir = path.join(repoRoot, "apps/web/public");
const manifestPath = path.join(publicDir, ".static-sync.json");
const SUBMIT_LINK = '<a href="/submit">Submit</a>';

type StaticPage = {
  slug: string;
  keyword: string;
  volume?: number;
  category: string;
  game: { title: string };
  seo: { h1: string; card: string; description?: string; updated?: string };
};

const out = fs.mkdtempSync(path.join(os.tmpdir(), "igame9-static-"));
try {
  execFileSync(process.execPath, ["build.mjs", "--out", out], { cwd: staticDir, stdio: "inherit" });

  const { categories } = (await import(
    pathToFileURL(path.join(staticDir, "data/site.mjs")).href
  )) as {
    categories: Record<string, { name: string }>;
  };
  const drift = Object.entries(categories).filter(
    ([key, c]) => categoryInfo[key as keyof typeof categoryInfo]?.name !== c.name,
  );
  if (drift.length)
    throw new Error(
      `Static categories not mirrored in packages/db/src/schema/game.ts categoryInfo: ${drift.map(([k]) => k).join(", ")}`,
    );

  // Only pages the static build actually emitted (it skips drafts and invalid pages).
  const built = new Set(
    fs.readdirSync(out).filter((d) => fs.existsSync(path.join(out, d, "index.html"))),
  );
  const pages: StaticPage[] = [];
  for (const f of fs.readdirSync(path.join(staticDir, "data/pages"))) {
    if (!f.endsWith(".mjs") || f.startsWith("_")) continue;
    const p = (await import(pathToFileURL(path.join(staticDir, "data/pages", f)).href))
      .default as StaticPage;
    if (!p?.slug || !built.has(p.slug)) continue;
    // The static build only warns about unfinished pages; don't publish placeholders.
    if ((p.seo?.description ?? "").length < 50) {
      console.warn(`[sync] ${p.slug}: seo.description looks unfinished, skipped`);
      continue;
    }
    pages.push(p);
  }
  if (!pages.length) throw new Error("Static build produced no game pages");

  // Copy files. Remove what the previous sync wrote first so deleted pages disappear.
  if (!onlyDb) {
    const previous: string[] = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      : [];
    for (const entry of previous)
      fs.rmSync(path.join(publicDir, entry), { recursive: true, force: true });
    const copied = ["assets", "favicon.svg", "site.webmanifest", ...pages.map((p) => p.slug)];
    for (const entry of copied)
      fs.cpSync(path.join(out, entry), path.join(publicDir, entry), { recursive: true });
    // ponytail: string-injects the Submit link into the static header nav instead of editing the static repo;
    // if the static header markup changes this warns and the link is simply missing.
    for (const p of pages) {
      const file = path.join(publicDir, p.slug, "index.html");
      const html = fs.readFileSync(file, "utf8");
      const next = html.replace(
        /(<nav class="nav" aria-label="Game categories">[\s\S]*?)<\/nav>/,
        `$1${SUBMIT_LINK}</nav>`,
      );
      if (next === html)
        console.warn(`[sync] ${p.slug}: header nav not found, Submit link not added`);
      fs.writeFileSync(file, next);
    }
    fs.writeFileSync(manifestPath, JSON.stringify(copied, null, 2) + "\n");
    // Production serves /assets with a one-year immutable cache, so the app must reference the same
    // versioned stylesheet URL the static pages use.
    const firstPage = fs.readFileSync(path.join(publicDir, pages[0].slug, "index.html"), "utf8");
    const assetVersion = /\/assets\/css\/site\.css\?v=([\w-]+)/.exec(firstPage)?.[1] ?? "";
    fs.writeFileSync(
      path.join(repoRoot, "apps/web/src/static-assets.gen.json"),
      JSON.stringify({ version: assetVersion }) + "\n",
    );
    console.log(
      `[sync] ${pages.length} static pages, ${copied.length} paths copied to apps/web/public`,
    );
  }
  if (!onlyFiles) {
    // Imported lazily: the database module validates server env, which a Docker build doesn't have.
    const { db } = await import("../src/index");

    // Database rows.
    let skipped = 0;
    for (const p of pages) {
      const values = {
        title: p.seo.h1,
        summary: p.seo.card,
        category: p.category,
        tags: [...new Set([p.keyword, p.game.title].map((t) => t.toLowerCase()))],
        url: `/${p.slug}/`,
        thumbnailUrl: fs.existsSync(path.join(out, "assets/img/thumbs", `${p.slug}.svg`))
          ? `/assets/img/thumbs/${p.slug}.svg`
          : null,
        plan: "own",
        status: "published",
        dofollow: true,
        rank: p.volume ?? 0,
      };
      const [row] = await db
        .insert(game)
        .values({
          id: `static-${p.slug}`,
          slug: p.slug,
          ...values,
          publishedAt: p.seo.updated ? new Date(p.seo.updated) : new Date(),
        })
        // Never overwrite a submitted game that happens to own the slug; keep admin's featured flag.
        .onConflictDoUpdate({ target: game.slug, set: values, setWhere: eq(game.plan, "own") })
        .returning({ id: game.id });
      if (!row) {
        skipped++;
        console.warn(`[sync] ${p.slug}: slug already used by a submitted game, not listed`);
      }
    }
    const removed = await db
      .update(game)
      .set({ status: "removed" })
      .where(
        and(
          eq(game.plan, "own"),
          sql`${game.url} ~ '^/[a-z0-9-]+/$'`,
          notInArray(
            game.slug,
            pages.map((p) => p.slug),
          ),
        ),
      )
      .returning({ slug: game.slug });
    console.log(
      `[sync] ${pages.length - skipped} static games in database, ${removed.length} removed`,
    );
  }
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
process.exit(0);
