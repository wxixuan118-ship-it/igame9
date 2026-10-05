import { site, categories } from '../../data/site.mjs';
import { esc, abs, pagePath, icons, head, header, footer, card } from './layout.mjs';

export function renderHub({ pages, assetVersion, hasOg }) {
  const byVolume = [...pages].sort((a, b) => b.volume - a.volume);
  const trending = byVolume.slice(0, 8);
  const title = 'Free Online Games — Play Instantly, No Download | igame9';
  const description = site.description;

  const catSections = Object.entries(categories)
    .map(([key, c]) => {
      const list = byVolume.filter((p) => p.category === key);
      if (!list.length) return '';
      return `<section class="cat-section" id="${key}" data-cat="${key}" aria-labelledby="h-${key}">
  <div class="section-head"><h2 id="h-${key}">${c.icon} ${esc(c.h2 || c.name + ' games')}</h2><span class="chip">${list.length} games</span></div>
  <p class="section-intro">${esc(c.blurb)}</p>
  <div class="grid">${list.map((p) => card(p)).join('\n')}</div>
</section>`;
    })
    .join('\n');

  const filters = [`<button type="button" data-filter="all" aria-pressed="true">All</button>`]
    .concat(
      Object.entries(categories)
        .filter(([key]) => pages.some((p) => p.category === key))
        .map(([key, c]) => `<button type="button" data-filter="${key}" aria-pressed="false">${c.icon} ${esc(c.short)}</button>`)
    )
    .join('');

  const faq = [
    [
      'Are the games on igame9 free?',
      'Yes. Every game is free to play in your browser with no account, no download and no in-game purchases.',
    ],
    [
      'Do these games work on Chromebooks, phones and tablets?',
      'They are lightweight HTML5 games that run in any modern browser. Each game supports mouse and keyboard, and touch controls on phones and tablets.',
    ],
    [
      'Is my progress saved?',
      'Best scores and idle-game progress are stored locally in your browser. Clearing site data or using a private window resets them.',
    ],
    [
      'Do I need to create an account?',
      'No. There is no sign-up, email or password anywhere on igame9. Open a page and the game is ready; your scores stay on your own device.',
    ],
    [
      'How do I play in fullscreen?',
      'Click the fullscreen button in the bar under any game. The game and its toolbar fill the screen; press the same button (or Esc) to return to the page.',
    ],
    [
      'Are these the official versions of the games?',
      'No. The games on igame9 are original browser games built in the style of the titles people search for. Each game page explains how the original works and who made it.',
    ],
  ];

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      url: abs('/'),
      description,
      inLanguage: site.lang,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Free browser games on igame9',
      numberOfItems: pages.length,
      itemListElement: byVolume.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: abs(pagePath(p.slug)),
        name: p.seo.h1,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ];

  const v = assetVersion ? `?v=${assetVersion}` : '';

  return `${head({
    title,
    description,
    path: '/',
    image: hasOg ? '/assets/img/og/hub.png' : '',
    imageAlt: 'igame9 free browser games',
    jsonld,
    assetVersion,
  })}
${header()}
<main id="main" class="wrap">
  <section class="hub-hero">
    <h1>Free online games you can <span>play instantly</span></h1>
    <p>${pages.length} hand-built free online games — tower defense, stickman fights, idle tycoons, cliff-edge drifting, temple runners, two-layer mahjong, merge and physics puzzles — no download, no login, on desktop, Chromebook and mobile.</p>
    <div class="search" role="search">
      ${icons.search}
      <label class="sr-only" for="q">Search games</label>
      <input id="q" type="search" placeholder="Search ${pages.length} games, e.g. drift, idle, temple run…" autocomplete="off">
    </div>
    <div class="filters" role="toolbar" aria-label="Filter by category">${filters}</div>
    <div class="stats"><span><b>${pages.length}</b>games</span><span><b>${
      Object.keys(categories).filter((k) => pages.some((p) => p.category === k)).length
    }</b>categories</span><span><b>0</b>downloads needed</span></div>
  </section>

  <section id="trending" aria-labelledby="h-trending">
    <div class="section-head"><h2 id="h-trending">🔥 Popular free online games</h2></div>
    <p class="section-intro">The games people search for most — start here if you just want something good to play.</p>
    <div class="grid">${trending.map((p, i) => card(p, { badge: i < 3 ? 'Popular' : '' })).join('\n')}</div>
  </section>

  <div id="results" hidden>
    <div class="section-head"><p class="section-title" id="h-results">Search results</p></div>
    <div class="grid" id="results-grid"></div>
    <p class="no-results" id="no-results" hidden>No games match that search. Try “idle”, “drift” or “puzzle”.</p>
  </div>

  ${catSections}

  <section aria-labelledby="h-about">
    <div class="section-head"><h2 id="h-about">Why play free online games on igame9</h2></div>
    <div class="hub-why">
      <img src="/assets/img/hub-devices.svg" alt="Free online games on igame9 running on a laptop, a tablet and a phone" width="640" height="360" loading="lazy" decoding="async">
      <div class="prose">
        <p>Every game here is a small HTML5 game we build ourselves, so it starts in a second or two, keeps working on a slow school or library connection and never asks you to install anything. Each game is only a few dozen kilobytes.</p>
        <p>Each game is inspired by a title people already love — Drift Boss, Temple Run, Merge Dragons, IdleOn and more — and its page explains how the original works, who made it and how our version differs, so you always know what you are playing.</p>
      </div>
    </div>
    <div class="hub-about">
      <div class="card-box"><h3>⚡ Free games that start instantly</h3><p>Every game loads straight from the page. Nothing to install, no plugins and no sign-up wall.</p></div>
      <div class="card-box"><h3>📱 Games for any device</h3><p>Keyboard and mouse on desktop and Chromebook, tap and swipe on phones and tablets. Hit fullscreen for the best view.</p></div>
      <div class="card-box"><h3>📖 A guide for every game</h3><p>Each page has controls, strategy tips and background on the original game, so you know exactly how to get a higher score.</p></div>
    </div>
  </section>

  <section class="prose faq" aria-labelledby="h-faq" style="margin-top:48px;max-width:860px">
    <h2 id="h-faq">Free online games FAQ</h2>
    ${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><div class="faq-a"><p>${esc(a)}</p></div></details>`).join('\n')}
  </section>
</main>
${footer(pages)}
<script src="/assets/js/hub.js${v}" defer></script>
</body>
</html>
`;
}
