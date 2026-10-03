// Smoke test: builds nothing — serves dist/ on a free port, loads the hub and every game page in
// headless Chrome (desktop + phone), clicks into the game, and reports console errors.
//   npm run build && npm run check
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ not built — run npm run build first');
  process.exit(1);
}
const port = 4700 + Math.floor(Math.random() * 200);
const server = spawn(process.execPath, [path.join(ROOT, 'serve.mjs'), String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const slugs = fs
  .readdirSync(DIST, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'assets' && fs.existsSync(path.join(DIST, d.name, 'index.html')))
  .map((d) => d.name);

const steps = JSON.stringify([
  { scroll: '#play' },
  { wait: 800 },
  { clickF: [0.5, 0.55] },
  { wait: 400 },
  { key: 'Space' },
  { wait: 1200 },
  { eval: "document.querySelector('.player-frame').className" },
]);
let failed = 0;
function run(url, extra = [], stepList = steps) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/drive.mjs'), '--url', url, '--steps', stepList, ...extra], {
    encoding: 'utf8',
    timeout: 60000,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0 && /is-mounted|hub/.test(out);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${url.replace(`http://localhost:${port}`, '')} ${extra.join(' ')}`);
  if (!ok) console.log(out.split('\n').filter((l) => /EXCEPTION|console\.error|LOG ERROR|driver error|eval/.test(l)).map((l) => '    ' + l).join('\n'));
}

run(`http://localhost:${port}/`, [], JSON.stringify([{ wait: 600 }, { eval: "'hub'" }]));
for (const s of slugs) {
  run(`http://localhost:${port}/${s}/?debug=1`);
  run(`http://localhost:${port}/${s}/?debug=1`, ['--size', '390x844', '--touch']);
}
server.kill();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll pages passed');
process.exit(failed ? 1 : 0);
