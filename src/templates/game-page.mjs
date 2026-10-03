import { site, categories } from '../../data/site.mjs';
import { esc, abs, pagePath, icons, head, header, footer, card } from './layout.mjs';

const stripTags = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const keysHtml = (keys) =>
  Array.isArray(keys) && keys.length ? keys.map((k) => `<kbd>${esc(k)}</kbd>`).join(' or ') : esc(keys || '—');

function controlsTable(controls = []) {
  if (!controls.length) return '';
  const rows = controls
    .map(
      (c) =>
        `<tr><td><strong>${esc(c.action)}</strong></td><td>${keysHtml(c.keyboard)}</td><td>${esc(c.mouse || '—')}</td><td>${esc(
          c.touch || '—'
        )}</td></tr>`
    )
    .join('');
  return `<div class="table-wrap"><table><thead><tr><th scope="col">Action</th><th scope="col">Keyboard</th><th scope="col">Mouse</th><th scope="col">Touch</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function disclaimer(p) {
  if (p.disclaimer) return p.disclaimer;
  const o = p.original || {};
  if (p.embedUrl) {
    return `The game on this page is embedded from ${esc(p.embedCredit || o.developer || 'its publisher')}. ${esc(
      o.name || p.keyword
    )} and all related rights belong to their respective owners.`;
  }
  const owner = o.developer ? esc(o.developer) : 'its respective owner';
  return `${esc(o.name || p.keyword)} is a trademark of ${owner}. igame9 is an independent site and is not affiliated with or endorsed by ${owner}. The playable game on this page, <em>${esc(
    p.game.title
  )}</em>, is an original browser game made for igame9 in a similar style; this guide describes the original for reference.`;
}

export function renderGamePage(p, ctx) {
  const { pages, assetVersion, hasOg } = ctx;
  const cat = categories[p.category] || { name: p.category, short: p.category };
  const path = pagePath(p.slug);
  const v = assetVersion ? `?v=${assetVersion}` : '';
  const ogImage = hasOg ? `/assets/img/og/${p.slug}.png` : '';
  const related = (p.related || []).map((s) => pages.find((x) => x.slug === s)).filter(Boolean);
  // Fill up to 6 related cards with same-category pages, then most-searched others.
  for (const x of [...pages.filter((x) => x.category === p.category), ...[...pages].sort((a, b) => b.volume - a.volume)]) {
    if (related.length >= 6) break;
    if (x.slug !== p.slug && !related.includes(x)) related.push(x);
  }
  const sideList = [...pages]
    .filter((x) => x.slug !== p.slug && !related.slice(0, 6).includes(x))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 6);

  // Table of contents
  const toc = [
    ['how-to-play', 'How to play'],
    ['controls', 'Controls'],
    ['tips', 'Tips & strategy'],
    ...(p.sections || []).map((s) => [s.id, s.h2]),
    ['faq', 'FAQ'],
  ];

  const sectionsHtml = (p.sections || [])
    .map((s) => `<section id="${esc(s.id)}"><h2>${esc(s.h2)}</h2>${s.html}</section>`)
    .join('\n');

  const faqHtml = (p.faq || [])
    .map(
      (f, i) =>
        `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><div class="faq-a">${
          /^\s*</.test(f.a) ? f.a : `<p>${f.a}</p>`
        }</div></details>`
    )
    .join('\n');

  const o = p.original || {};
  const facts = [
    ['Game', o.name || p.keyword],
    ['Developer', o.developer],
    ['Released', o.released],
    ['Genre', o.genre],
    ['Platforms', o.platforms],
    ['Play here', p.embedUrl ? 'Embedded official version' : `${p.game.title} (free, browser)`],
    ['Saves', p.game.saves || 'Best score saved in your browser'],
  ].filter(([, val]) => val);

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Games', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: p.seo.h1, item: abs(path) },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: p.embedUrl ? o.name || p.keyword : p.game.title,
      url: abs(path),
      description: p.seo.description,
      genre: o.genre || cat.name,
      gamePlatform: ['Web browser', 'Desktop', 'Mobile'],
      applicationCategory: 'Game',
      operatingSystem: 'Any (web browser)',
      isAccessibleForFree: true,
      inLanguage: site.lang,
      ...(ogImage ? { image: abs(ogImage) } : {}),
      ...(p.embedUrl
        ? o.developer
          ? { author: { '@type': 'Organization', name: o.developer } }
          : {}
        : { publisher: { '@type': 'Organization', name: site.name, url: site.url } }),
      ...(p.game.playMode ? { playMode: p.game.playMode } : {}),
    },
    ...(p.faq && p.faq.length
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: p.faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) },
            })),
          },
        ]
      : []),
  ];

  const player = `<div class="player" id="play">
  <div class="player-frame" data-engine="${esc(p.engine)}" data-variant="${esc(p.variant || 'default')}" data-slug="${esc(
    p.slug
  )}" data-title="${esc(p.embedUrl ? o.name || p.keyword : p.game.title)}" data-embed="${esc(p.embedUrl || '')}">
    <div class="player-stage" aria-label="${esc(p.game.title)} game area"></div>
    <div class="player-loading">Loading game…</div>
    <div class="player-cover" hidden style="background-image:url('/assets/img/thumbs/${p.slug}.svg')"><button type="button" aria-label="Play ${esc(
      p.seo.h1
    )}">▶ Play</button></div>
  </div>
  <div class="player-bar">
    <span class="pb-title">${esc(p.embedUrl ? o.name || p.keyword : p.game.title)}</span>
    <span class="pb-hint">${esc(p.game.hint || '')}</span>
    <span class="pb-actions">
      <button type="button" class="icon-btn" data-act="restart" aria-label="Restart game" title="Restart">${icons.restart}</button>
      <button type="button" class="icon-btn" data-act="mute" aria-label="Mute sound" title="Sound on">${icons.sound}</button>
      <button type="button" class="icon-btn" data-act="fullscreen" aria-label="Fullscreen" title="Fullscreen">${icons.fullscreen}</button>
    </span>
  </div>
</div>`;

  const scripts = `<script src="/assets/js/shell.js${v}" defer></script>${
    p.embedUrl ? '' : `\n<script src="/assets/js/games/${esc(p.engine)}.js${v}" defer></script>`
  }`;

  return `${head({
    title: p.seo.title,
    description: p.seo.description,
    path,
    image: ogImage,
    imageAlt: `${p.seo.h1} gameplay preview`,
    jsonld,
    assetVersion,
  })}
${header(p.category)}
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Games</a></li><li><a href="/#${esc(p.category)}">${esc(
    cat.name
  )}</a></li><li aria-current="page">${esc(p.seo.h1)}</li></ol></nav>
  <div class="game-head">
    <div>
      <h1>${esc(p.seo.h1)}</h1>
      <p class="lede">${esc(p.seo.lede)}</p>
    </div>
    <div class="chips">
      <a class="chip" href="/#${esc(p.category)}">${cat.icon || ''} ${esc(cat.name)}</a>
      <span class="chip">🖥️ 📱 Desktop &amp; mobile</span>
      <span class="chip">⚡ No download</span>
    </div>
  </div>
  ${player}
  ${p.embedUrl && p.embedCredit ? `<p class="crumbs">Game by ${esc(p.embedCredit)}</p>` : ''}
  <div class="page-grid">
    <article class="prose">
      <section id="overview">${p.intro.map((x) => (/^\s*</.test(x) ? x : `<p>${x}</p>`)).join('\n')}</section>
      <section id="how-to-play">
        <h2>How to play ${esc(p.seo.h1)}</h2>
        <ol class="steps">${p.howToPlay.map((s) => `<li>${s}</li>`).join('')}</ol>
      </section>
      <section id="controls">
        <h2>${esc(p.seo.h1)} controls</h2>
        ${controlsTable(p.game.controls)}
      </section>
      <section id="tips">
        <h2>${esc(p.seo.h1)} tips &amp; strategy</h2>
        <ul class="tips">${p.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
      </section>
      ${sectionsHtml}
      <section id="faq" class="faq">
        <h2>${esc(p.seo.h1)} FAQ</h2>
        ${faqHtml}
      </section>
      <p class="disclaimer">${disclaimer(p)}</p>
    </article>
    <aside class="side">
      <div class="card-box">
        <img class="facts-art" src="/assets/img/thumbs/${p.slug}.svg" alt="${esc(
          p.embedUrl ? `${p.keyword} game artwork` : `${p.keyword} — ${p.game.title} game artwork`
        )}" width="640" height="360" loading="lazy" decoding="async">
        <p class="box-title">Quick facts</p>
        <dl class="facts">${facts.map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('')}</dl>${
          o.source && o.source.url
            ? `
        <p class="facts-src">Learn more: <a href="${esc(o.source.url)}" target="_blank" rel="noopener">${esc(o.source.label || o.source.url)} ↗</a></p>`
            : ''
        }
      </div>
      <div class="sticky side">
        <nav class="card-box toc" aria-label="On this page"><p class="box-title">On this page</p><ol>${toc
          .map(([id, label]) => `<li><a href="${path}#${esc(id)}">${esc(label)}</a></li>`)
          .join('')}</ol></nav>
        <div class="card-box">
          <p class="box-title">Popular on igame9</p>
          <ul class="mini-list">${sideList
            .map(
              (x) =>
                `<li><a href="${pagePath(x.slug)}"><img src="/assets/img/thumbs/${x.slug}.svg" alt="${esc(x.seo.h1)} thumbnail" width="72" height="40" loading="lazy" decoding="async"><span>${esc(
                  x.seo.h1
                )}<small>${esc(x.seo.card)}</small></span></a></li>`
            )
            .join('')}</ul>
        </div>
      </div>
    </aside>
  </div>
  <section aria-labelledby="more">
    <div class="section-head"><h2 id="more">More games like ${esc(p.seo.h1)}</h2><a href="/">All games →</a></div>
    <div class="grid">${related.slice(0, 6).map((x) => card(x)).join('\n')}</div>
  </section>
</main>
${footer(pages)}
${scripts}
</body>
</html>
`;
}
