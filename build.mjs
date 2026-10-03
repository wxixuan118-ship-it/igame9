// Static site generator for igame9: node build.mjs → dist/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { site, categories } from './data/site.mjs';
import { esc, abs, pagePath, head, header, footer, card } from './src/templates/layout.mjs';
import { renderGamePage } from './src/templates/game-page.mjs';
import { renderHub } from './src/templates/hub.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC_ASSETS = path.join(ROOT, 'src/assets');
const PAGES_DIR = path.join(ROOT, 'data/pages');
const outArg = process.argv.indexOf('--out');
const DIST = outArg > -1 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'dist');

const warnings = [];
const warn = (m) => warnings.push(m);

const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(',')) : null;
const STRICT = process.argv.includes('--strict');

async function loadPages() {
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.mjs') && !f.startsWith('_'));
  const pages = [];
  for (const f of files) {
    let p;
    try {
      p = (await import(pathToFileURL(path.join(PAGES_DIR, f)).href + `?t=${Date.now()}`)).default;
    } catch (e) {
      if (STRICT) throw e;
      warn(`${f}: failed to load, skipped (${e.message})`);
      continue;
    }
    if (!p || !p.slug) {
      warn(`${f}: no default export with slug`);
      continue;
    }
    if (p.draft || (ONLY && !ONLY.has(p.slug))) continue;
    pages.push(p);
  }
  return pages;
}

// Returns the valid pages; invalid ones are skipped with a warning (or throw with --strict).
function validate(pages) {
  const slugs = new Set();
  const ok = [];
  for (const p of pages) {
    const where = `[${p.slug}]`;
    const problems = [];
    if (slugs.has(p.slug)) problems.push('duplicate slug');
    for (const k of ['keyword', 'category', 'engine', 'game', 'seo', 'intro', 'howToPlay', 'tips', 'faq']) {
      if (p[k] == null) problems.push(`missing field "${k}"`);
    }
    for (const k of ['title', 'description', 'h1', 'lede', 'card']) {
      if (!p.seo || !p.seo[k]) problems.push(`missing seo.${k}`);
    }
    if (!categories[p.category]) problems.push(`unknown category "${p.category}"`);
    if (problems.length) {
      if (STRICT) throw new Error(`${where} ${problems.join('; ')}`);
      warn(`${where} skipped: ${problems.join('; ')}`);
      continue;
    }
    slugs.add(p.slug);
    ok.push(p);
    if (p.volume == null) p.volume = 0;
    if (p.seo.title.length > 65) warn(`${where} seo.title is ${p.seo.title.length} chars (aim ≤ 60)`);
    const dl = p.seo.description.length;
    if (dl < 110 || dl > 165) warn(`${where} seo.description is ${dl} chars (aim 120–160)`);
    if (!p.embedUrl && !fs.existsSync(path.join(SRC_ASSETS, 'js/games', `${p.engine}.js`)))
      warn(`${where} engine file js/games/${p.engine}.js not found`);
    if (!fs.existsSync(path.join(SRC_ASSETS, 'img/thumbs', `${p.slug}.svg`)))
      warn(`${where} no thumbnail; using generated fallback`);
  }
  if (!ONLY)
    for (const p of ok)
      for (const r of p.related || []) if (!slugs.has(r)) warn(`[${p.slug}] related slug "${r}" does not exist`);
  return ok;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

function hashDir(dir) {
  const h = crypto.createHash('sha1');
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(css|js)$/.test(entry.name)) h.update(entry.name).update(fs.readFileSync(p));
    }
  };
  walk(dir);
  return h.digest('hex').slice(0, 10);
}

const PALETTE = {
  idle: ['#f59e0b', '#7c3aed'],
  racing: ['#ef4444', '#1e3a8a'],
  runner: ['#10b981', '#0f766e'],
  puzzle: ['#8b5cf6', '#0ea5e9'],
  action: ['#f97316', '#be123c'],
};

function fallbackThumb(p) {
  const [a, b] = PALETTE[p.category] || ['#8b6cff', '#2dd4f0'];
  const icon = (categories[p.category] || {}).icon || '🎮';
  const title = esc(p.seo.h1);
  const size = title.length > 18 ? 40 : 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="640" height="360" fill="url(#g)"/>
<circle cx="540" cy="70" r="150" fill="#fff" opacity=".08"/><circle cx="90" cy="330" r="120" fill="#000" opacity=".12"/>
<text x="320" y="165" font-size="96" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${icon}</text>
<text x="320" y="255" font-size="${size}" font-weight="800" fill="#fff" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif">${title}</text>
</svg>`;
}

function render404(pages, assetVersion) {
  const top = [...pages].sort((a, b) => b.volume - a.volume).slice(0, 8);
  return `${head({
    title: 'Page not found | igame9',
    description: 'This page does not exist. Pick one of our free browser games instead.',
    path: '/404.html',
    assetVersion,
    extraHead: '<meta name="robots" content="noindex">',
  }).replace('<meta name="robots" content="index, follow, max-image-preview:large">\n', '')}
${header()}
<main id="main" class="wrap">
  <section class="hub-hero"><h1>Game over — <span>404</span></h1><p>That page doesn’t exist. Try one of these instead.</p></section>
  <div class="grid">${top.map((p) => card(p)).join('\n')}</div>
</main>
${footer(pages)}
</body>
</html>
`;
}

function sitemap(pages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [{ loc: abs('/'), lastmod: today, priority: '1.0' }].concat(
    [...pages]
      .sort((a, b) => b.volume - a.volume)
      .map((p) => ({ loc: abs(pagePath(p.slug)), lastmod: p.seo.updated || today, priority: '0.8' }))
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b6cff"/><stop offset="1" stop-color="#2dd4f0"/></linearGradient></defs><rect x="1" y="6" width="30" height="20" rx="10" fill="url(#g)"/><rect x="7" y="14.5" width="8" height="3" rx="1.5" fill="#0b0d17"/><rect x="9.5" y="12" width="3" height="8" rx="1.5" fill="#0b0d17"/><circle cx="21.5" cy="13.5" r="2" fill="#0b0d17"/><circle cx="25" cy="18" r="2" fill="#0b0d17"/></svg>`;

async function main() {
  const t0 = Date.now();
  const pages = validate(await loadPages());

  fs.rmSync(DIST, { recursive: true, force: true });
  copyDir(SRC_ASSETS, path.join(DIST, 'assets'));

  const thumbDir = path.join(DIST, 'assets/img/thumbs');
  fs.mkdirSync(thumbDir, { recursive: true });
  for (const p of pages) {
    const f = path.join(thumbDir, `${p.slug}.svg`);
    if (!fs.existsSync(f)) fs.writeFileSync(f, fallbackThumb(p));
  }

  const assetVersion = hashDir(SRC_ASSETS);
  const ogDir = path.join(SRC_ASSETS, 'img/og');
  const hasOgFor = (name) => fs.existsSync(path.join(ogDir, `${name}.png`));

  fs.writeFileSync(path.join(DIST, 'index.html'), renderHub({ pages, assetVersion, hasOg: hasOgFor('hub') }));
  for (const p of pages) {
    const dir = path.join(DIST, p.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderGamePage(p, { pages, assetVersion, hasOg: hasOgFor(p.slug) }));
  }
  fs.writeFileSync(path.join(DIST, '404.html'), render404(pages, assetVersion));
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap(pages));
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
  fs.writeFileSync(path.join(DIST, 'favicon.svg'), favicon);
  // Cache rules for Cloudflare Pages / Netlify (_headers). CSS/JS URLs carry ?v=<hash>.
  fs.writeFileSync(
    path.join(DIST, '_headers'),
    `/assets/css/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/js/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/img/*\n  Cache-Control: public, max-age=604800\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`
  );
  fs.writeFileSync(
    path.join(DIST, 'site.webmanifest'),
    JSON.stringify(
      {
        name: site.name,
        short_name: site.name,
        start_url: '/',
        display: 'standalone',
        background_color: site.themeColor,
        theme_color: site.themeColor,
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      null,
      2
    )
  );

  for (const w of warnings) console.warn('⚠ ' + w);
  console.log(`✓ Built hub + ${pages.length} game pages → ${path.relative(ROOT, DIST) || DIST} in ${Date.now() - t0} ms (assets v=${assetVersion})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
