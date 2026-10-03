// Headless-Chrome driver for testing game pages (no dependencies; Node ≥ 22 for global WebSocket).
//
//   node scripts/drive.mjs --url http://localhost:4173/drift-boss/?debug=1 \
//        --size 1280x900 [--touch] [--out ./shots] [--steps steps.json | --steps '[...]']
//
// Steps (array, run in order):
//   {"wait": 500}                         ms
//   {"shot": "name.png"}                  full viewport screenshot → --out dir
//   {"shotFrame": "name.png"}             screenshot clipped to the game frame
//   {"eval": "js expression"}             prints the JSON result
//   {"scroll": "#play"}                   scrollIntoView(selector) (block:center)
//   {"click": [x, y]} / {"down": [x,y]} / {"up": [x,y]} / {"move": [x,y]}        viewport px (mouse)
//   {"clickF": [fx, fy]} / {"downF"} / {"upF"} / {"moveF"}                         fractions 0..1 of .player-stage
//   {"dragF": [[fx1,fy1],[fx2,fy2]], "steps": 12, "ms": 300}                       mouse drag inside the stage
//   {"tapF": [fx, fy]} / {"swipeF": [[fx1,fy1],[fx2,fy2]], "ms": 200}              touch (needs --touch)
//   {"key": "Space"} press   {"keyDown": "ArrowRight"}  {"keyUp": "ArrowRight"}    KeyboardEvent.code
//   {"hold": "Space", "ms": 800}          keyDown, wait, keyUp
//   {"repeat": N, "steps": [...]}         run nested steps N times
// Console errors and uncaught exceptions are printed; exit code 1 if any occurred.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf('--' + name);
  return i > -1 ? args[i + 1] : def;
};
const has = (name) => args.includes('--' + name);

const CHROME =
  process.env.CHROME ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    fs.existsSync(p)
  );
if (!CHROME) {
  console.error('Chrome not found; set CHROME=/path/to/chrome');
  process.exit(2);
}

const url = arg('url');
if (!url) {
  console.error('--url is required');
  process.exit(2);
}
const [W, H] = arg('size', '1280x900').split('x').map(Number);
const outDir = path.resolve(arg('out', '.'));
fs.mkdirSync(outDir, { recursive: true });
let steps = [];
const stepsArg = arg('steps');
if (stepsArg) steps = JSON.parse(stepsArg.trim().startsWith('[') ? stepsArg : fs.readFileSync(stepsArg, 'utf8'));
const touch = has('touch');

const port = 9300 + Math.floor(Math.random() * 600);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'igdrive-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    `--window-size=${W},${H}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
let msgId = 0;
const pending = new Map();
const listeners = [];
let errors = 0;

function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}
function once(method, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting for ' + method)), timeout);
    listeners.push({ method, fn: (p) => (clearTimeout(t), resolve(p)), once: true });
  });
}

async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error('Chrome did not start');
}

const KEYS = {
  Space: [' ', 32],
  Enter: ['Enter', 13],
  Escape: ['Escape', 27],
  Tab: ['Tab', 9],
  Backspace: ['Backspace', 8],
  ArrowLeft: ['ArrowLeft', 37],
  ArrowUp: ['ArrowUp', 38],
  ArrowRight: ['ArrowRight', 39],
  ArrowDown: ['ArrowDown', 40],
  ShiftLeft: ['Shift', 16],
  ControlLeft: ['Control', 17],
};
function keyInfo(code) {
  if (KEYS[code]) return KEYS[code];
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return [m[1].toLowerCase(), m[1].charCodeAt(0)];
  m = /^Digit(\d)$/.exec(code);
  if (m) return [m[1], 48 + Number(m[1])];
  return [code, 0];
}
async function key(code, type) {
  const [k, vk] = keyInfo(code);
  const params = { type, code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
  if (type === 'keyDown' && k.length === 1) params.text = k;
  await send('Input.dispatchKeyEvent', params);
}
async function mouse(type, x, y) {
  await send('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: type === 'mouseMoved' ? 'none' : 'left',
    buttons: type === 'mousePressed' ? 1 : 0,
    clickCount: 1,
  });
}
async function touchEv(type, pts) {
  await send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y })) });
}
async function stageRect() {
  const r = await send('Runtime.evaluate', {
    expression:
      'JSON.stringify((function(){var e=document.querySelector(".player-stage");if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};})())',
    returnByValue: true,
  });
  const v = JSON.parse(r.result.value);
  if (!v) throw new Error('.player-stage not found');
  return v;
}
async function toPx([fx, fy]) {
  const r = await stageRect();
  return [r.x + fx * r.w, r.y + fy * r.h];
}

async function run(list) {
  for (const s of list) {
    if (s.wait != null) await sleep(s.wait);
    else if (s.shot || s.shotFrame) {
      const params = { format: 'png' };
      if (s.shotFrame) {
        const r = await stageRect();
        const sc = await send('Runtime.evaluate', { expression: 'JSON.stringify([scrollX, scrollY])', returnByValue: true });
        const [scx, scy] = JSON.parse(sc.result.value);
        params.clip = { x: r.x + scx, y: r.y + scy, width: r.w, height: r.h, scale: 1 };
      }
      const { data } = await send('Page.captureScreenshot', params);
      const f = path.join(outDir, s.shot || s.shotFrame);
      fs.writeFileSync(f, Buffer.from(data, 'base64'));
      console.log('📸', f);
    } else if (s.eval) {
      const r = await send('Runtime.evaluate', { expression: s.eval, returnByValue: true, awaitPromise: true });
      console.log('eval →', JSON.stringify(r.result.value ?? r.result.description ?? r.exceptionDetails?.text));
    } else if (s.scroll) {
      await send('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(s.scroll)}).scrollIntoView({block:'center'})`,
      });
      await sleep(100);
    } else if (s.click) {
      await mouse('mouseMoved', ...s.click);
      await mouse('mousePressed', ...s.click);
      await mouse('mouseReleased', ...s.click);
    } else if (s.down) await mouse('mousePressed', ...s.down);
    else if (s.up) await mouse('mouseReleased', ...s.up);
    else if (s.move) await mouse('mouseMoved', ...s.move);
    else if (s.clickF) {
      const p = await toPx(s.clickF);
      await mouse('mouseMoved', ...p);
      await mouse('mousePressed', ...p);
      await mouse('mouseReleased', ...p);
    } else if (s.downF) {
      const p = await toPx(s.downF);
      await mouse('mouseMoved', ...p);
      await mouse('mousePressed', ...p);
    } else if (s.upF) await mouse('mouseReleased', ...(await toPx(s.upF)));
    else if (s.moveF) await mouse('mouseMoved', ...(await toPx(s.moveF)));
    else if (s.dragF) {
      const a = await toPx(s.dragF[0]);
      const b = await toPx(s.dragF[1]);
      const n = s.steps || 12;
      await mouse('mouseMoved', ...a);
      await mouse('mousePressed', ...a);
      for (let i = 1; i <= n; i++) {
        await sleep((s.ms || 240) / n);
        await send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: a[0] + ((b[0] - a[0]) * i) / n,
          y: a[1] + ((b[1] - a[1]) * i) / n,
          button: 'left',
          buttons: 1,
        });
      }
      await mouse('mouseReleased', ...b);
    } else if (s.tapF) {
      const p = await toPx(s.tapF);
      await touchEv('touchStart', [p]);
      await sleep(s.ms || 60);
      await touchEv('touchEnd', []);
    } else if (s.swipeF) {
      const a = await toPx(s.swipeF[0]);
      const b = await toPx(s.swipeF[1]);
      const n = 8;
      await touchEv('touchStart', [a]);
      for (let i = 1; i <= n; i++) {
        await sleep((s.ms || 160) / n);
        await touchEv('touchMove', [[a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]]);
      }
      await touchEv('touchEnd', []);
    } else if (s.key) {
      await key(s.key, 'keyDown');
      await sleep(40);
      await key(s.key, 'keyUp');
    } else if (s.keyDown) await key(s.keyDown, 'keyDown');
    else if (s.keyUp) await key(s.keyUp, 'keyUp');
    else if (s.hold) {
      await key(s.hold, 'keyDown');
      await sleep(s.ms || 500);
      await key(s.hold, 'keyUp');
    } else if (s.repeat) {
      for (let i = 0; i < s.repeat; i++) await run(s.steps);
    } else console.warn('unknown step', s);
  }
}

try {
  ws = new WebSocket(await connect());
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const t = msg.params.type;
      const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      if (t === 'error' || t === 'warning' || t === 'assert') {
        if (t === 'error') errors++;
        console.log(`console.${t}:`, text);
      } else if (has('verbose')) console.log(`console.${t}:`, text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors++;
      const d = msg.params.exceptionDetails;
      console.log('EXCEPTION:', d.exception?.description || d.text, `@${d.url || ''}:${d.lineNumber}`);
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      const e = msg.params.entry;
      if (!/favicon/.test(e.url || '')) {
        errors++;
        console.log('LOG ERROR:', e.text, e.url || '');
      }
    }
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i].method === msg.method) {
        const l = listeners[i];
        if (l.once) listeners.splice(i, 1);
        l.fn(msg.params);
      }
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: touch });
  if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;
  await sleep(400);
  await run(steps);
  console.log(errors ? `✗ ${errors} error(s)` : '✓ no console errors');
} catch (e) {
  console.error('driver error:', e.message);
  errors++;
} finally {
  try {
    ws && ws.close();
  } catch {}
  chrome.kill('SIGKILL');
  setTimeout(() => {
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
    process.exit(errors ? 1 : 0);
  }, 200);
}
