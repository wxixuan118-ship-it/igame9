// Renders 1200×630 share images (src/assets/img/og/<slug>.png + hub.png) from the SVG thumbnails
// using headless Chrome. Run after adding/changing thumbnails: npm run og
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THUMBS = path.join(ROOT, 'src/assets/img/thumbs');
const OUT = path.join(ROOT, 'src/assets/img/og');
const CHROME =
  process.env.CHROME ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    fs.existsSync(p)
  );
if (!CHROME) {
  console.error('Chrome not found; set CHROME=/path/to/chrome');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'igog-'));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const dataUri = (file) => 'data:image/svg+xml;base64,' + fs.readFileSync(file).toString('base64');
const LOGO = `<svg viewBox="0 0 32 32" width="56" height="56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b6cff"/><stop offset="1" stop-color="#2dd4f0"/></linearGradient></defs><rect x="1" y="6" width="30" height="20" rx="10" fill="url(#g)"/><rect x="7" y="14.5" width="8" height="3" rx="1.5" fill="#0b0d17"/><rect x="9.5" y="12" width="3" height="8" rx="1.5" fill="#0b0d17"/><circle cx="21.5" cy="13.5" r="2" fill="#0b0d17"/><circle cx="25" cy="18" r="2" fill="#0b0d17"/></svg>`;
const BASE = `*{margin:0;box-sizing:border-box}html,body{width:1200px;height:630px;overflow:hidden;background:#0b0d17;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#fff}`;

function shoot(name, html) {
  const file = path.join(tmp, name + '.html');
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${BASE}</style>${html}`);
  const out = path.join(OUT, name + '.png');
  // Own throwaway profile + timeout so a running desktop Chrome or a stuck render can't stall the batch.
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    `--user-data-dir=${path.join(tmp, 'profile')}`,
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    `--screenshot=${out}`,
    pathToFileURL(file).href,
  ];
  try {
    execFileSync(CHROME, args, { stdio: 'ignore', timeout: 60000 });
  } catch (e) {
    console.warn('✗', name, e.code || e.message);
    return;
  }
  console.log('✓', path.relative(ROOT, out));
}

const pages = [];
for (const f of fs.readdirSync(path.join(ROOT, 'data/pages')).filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))) {
  try {
    const p = (await import(pathToFileURL(path.join(ROOT, 'data/pages', f)).href)).default;
    if (p && p.slug && !p.draft) pages.push(p);
  } catch (e) {
    console.warn('skip', f, e.message);
  }
}

for (const p of pages) {
  const thumb = path.join(THUMBS, `${p.slug}.svg`);
  if (!fs.existsSync(thumb)) {
    console.warn('no thumbnail for', p.slug);
    continue;
  }
  shoot(
    p.slug,
    `<img src="${dataUri(thumb)}" style="position:absolute;inset:-22px 0 auto 0;width:1200px;height:675px;object-fit:cover">
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,13,23,0) 50%,rgba(11,13,23,.9) 86%)"></div>
<div style="position:absolute;left:56px;right:56px;bottom:46px;display:flex;align-items:flex-end;justify-content:space-between;gap:30px">
  <div><div style="font-size:${p.seo.h1.length > 18 ? 66 : 82}px;font-weight:900;letter-spacing:-2px;line-height:1;text-shadow:0 4px 24px rgba(0,0,0,.5)">${esc(p.seo.h1)}</div>
  <div style="font-size:28px;font-weight:600;color:#c4c8ea;margin-top:14px">${esc(p.seo.card)} · Free, no download</div></div>
  <div style="display:flex;align-items:center;gap:10px;font-size:34px;font-weight:800;flex-shrink:0">${LOGO}<span>igame9</span></div>
</div>`
  );
}

// Hub collage
const top = [...pages].sort((a, b) => (b.volume || 0) - (a.volume || 0)).filter((p) => fs.existsSync(path.join(THUMBS, `${p.slug}.svg`))).slice(0, 8);
shoot(
  'hub',
  `<div style="position:absolute;inset:-40px -60px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;transform:rotate(-6deg);opacity:.9">
${top.concat(top).slice(0, 12).map((p) => `<img src="${dataUri(path.join(THUMBS, `${p.slug}.svg`))}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:16px">`).join('')}
</div>
<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 55%,rgba(11,13,23,.92) 0,rgba(11,13,23,.75) 45%,rgba(11,13,23,.35) 100%)"></div>
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px">
  <div style="display:flex;align-items:center;gap:14px;font-size:64px;font-weight:900;letter-spacing:-2px">${LOGO.replace(/56/g, '84')}<span>igame9</span></div>
  <div style="font-size:44px;font-weight:800">Free online games — play instantly</div>
  <div style="font-size:26px;color:#c4c8ea">Idle · Drift · Runner · Mahjong · Merge · Puzzle — no download</div>
</div>`
);
fs.rmSync(tmp, { recursive: true, force: true });
