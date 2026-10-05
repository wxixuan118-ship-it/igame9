import { site, categories } from '../../data/site.mjs';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const abs = (path) => site.url.replace(/\/$/, '') + path;

export const pagePath = (slug) => `/${slug}/`;

export const icons = {
  logo: `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b6cff"/><stop offset="1" stop-color="#2dd4f0"/></linearGradient></defs><rect x="1" y="6" width="30" height="20" rx="10" fill="url(#lg)"/><rect x="7" y="14.5" width="8" height="3" rx="1.5" fill="#0b0d17"/><rect x="9.5" y="12" width="3" height="8" rx="1.5" fill="#0b0d17"/><circle cx="21.5" cy="13.5" r="2" fill="#0b0d17"/><circle cx="25" cy="18" r="2" fill="#0b0d17"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  restart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path class="on" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/><path class="off" d="m22 9-6 6M16 9l6 6"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
};

export function head({ title, description, path, image, imageAlt, jsonld = [], extraHead = '', assetVersion = '' }) {
  const url = abs(path);
  const v = assetVersion ? `?v=${assetVersion}` : '';
  const ld = jsonld.length
    ? `<script type="application/ld+json">${JSON.stringify(jsonld.length === 1 ? jsonld[0] : jsonld).replace(/</g, '\\u003c')}</script>`
    : '';
  const og = image
    ? `<meta property="og:image" content="${esc(abs(image))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt || title)}">
<meta name="twitter:image" content="${esc(abs(image))}">`
    : '';
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="${site.themeColor}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="${site.locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${og}
<link rel="stylesheet" href="/assets/css/site.css${v}">
${extraHead}
${ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

export function header(activeCat = '') {
  const links = Object.entries(categories)
    .map(
      ([key, c]) =>
        `<a href="/#${key}"${key === activeCat ? ' aria-current="page"' : ''}>${esc(c.short)}</a>`
    )
    .join('');
  return `<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/" aria-label="${esc(site.name)} home">${icons.logo}<span>i<b>game9</b></span></a>
    <nav class="nav" aria-label="Game categories"><a href="/">All games</a>${links}<a href="/directory/">Submit a game</a></nav>
  </div>
</header>`;
}

export function footer(pages) {
  const cols = Object.entries(categories)
    .map(([key, c]) => {
      const items = pages
        .filter((p) => p.category === key)
        .map((p) => `<li><a href="${pagePath(p.slug)}">${esc(p.seo.h1)}</a></li>`)
        .join('');
      return items ? `<div class="foot-row"><h2>${esc(c.name)}</h2><ul>${items}</ul></div>` : '';
    })
    .join('');
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="foot-brand">
      <a class="logo" href="/">${icons.logo}<span>i<b>game9</b></span></a>
      <p>${esc(site.description)}</p>
      <p><a href="/directory/">Made a browser game? List it in the igame9 game directory →</a></p>
    </div>
    <div class="foot-rows">${cols}</div>
    <p class="foot-note">© ${year} ${esc(site.name)}. Game names mentioned on this site are trademarks of their respective owners and are used only to describe the games and genres covered. igame9 is an independent site; the playable games here are original browser games unless a page states that a game is embedded from its publisher.</p>
  </div>
</footer>`;
}

export function card(p, { badge = '' } = {}) {
  const cat = categories[p.category];
  return `<a class="card" href="${pagePath(p.slug)}" data-cat="${esc(p.category)}" data-name="${esc(
    (p.seo.h1 + ' ' + p.keyword + ' ' + (p.game.title || '') + ' ' + (cat ? cat.name : '')).toLowerCase()
  )}">
  <img class="thumb" src="/assets/img/thumbs/${p.slug}.svg" alt="${esc(p.seo.h1)} game preview" width="640" height="360" loading="lazy" decoding="async">
  ${badge ? `<span class="badge">${esc(badge)}</span>` : ''}
  <span class="card-body"><span class="card-title">${esc(p.seo.h1)}</span><span class="card-sub">${esc(p.seo.card)}</span></span>
</a>`;
}
