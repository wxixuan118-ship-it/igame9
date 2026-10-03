// Runs the onpage-audit skill on every built page (dist/) with its target keyword.
//   node build.mjs && node scripts/audit-all.mjs [outDir] [slug ...]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { site } from '../data/site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = process.env.ONPAGE_AUDIT || path.join(os.homedir(), '.claude/skills/onpage-audit/scripts/onpage_audit.py');
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'igame9-audit'));
const only = new Set(process.argv.slice(3));
const HUB_KEYWORD = 'free online games';
fs.mkdirSync(OUT, { recursive: true });

const targets = [{ slug: '', keyword: HUB_KEYWORD, file: path.join(ROOT, 'dist/index.html') }];
for (const f of fs.readdirSync(path.join(ROOT, 'data/pages')).filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))) {
  const p = (await import(pathToFileURL(path.join(ROOT, 'data/pages', f)).href)).default;
  if (p && p.slug && !p.draft) targets.push({ slug: p.slug, keyword: p.keyword, file: path.join(ROOT, 'dist', p.slug, 'index.html') });
}

const rows = [];
for (const t of targets) {
  const name = t.slug || 'hub';
  if (only.size && !only.has(name)) continue;
  const url = `${site.url}/${t.slug ? t.slug + '/' : ''}`;
  const json = path.join(OUT, `${name}.json`);
  const r = spawnSync('python3', [AUDIT, t.file, '-k', t.keyword, '--url', url, '--json', json, '--quiet-ngrams'], { encoding: 'utf8' });
  fs.writeFileSync(path.join(OUT, `${name}.txt`), r.stdout + r.stderr);
  let score = NaN;
  try {
    const j = JSON.parse(fs.readFileSync(json, 'utf8'));
    score = j.score ?? j.summary?.score;
  } catch {}
  rows.push({ name, keyword: t.keyword, score });
}
rows.sort((a, b) => a.score - b.score);
for (const r of rows) console.log(`${String(r.score?.toFixed ? r.score.toFixed(1) : r.score).padStart(6)}  ${r.name.padEnd(28)} "${r.keyword}"`);
const below = rows.filter((r) => !(r.score >= 95));
console.log(below.length ? `\n${below.length} page(s) below 95 — reports in ${OUT}` : `\nAll ${rows.length} pages ≥ 95`);
