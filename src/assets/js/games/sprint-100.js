/*!
 * igame9 — Photo Finish (engine id: sprint-100)
 * An original side-view 100 m sprint game. Alternate Left/Right in an even
 * rhythm to build speed, react to the starting gun, and race CPU sprinters
 * through Heats → Quarter-final → Semi-final → Final → Record attempts.
 * Optional same-keyboard 2-player mode. Everything is drawn on Canvas 2D.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  var DIST = 100;
  var LANES = 8;
  var SFAR = 0.7; // perspective scale of the far edge of the track
  var VMAX = 12.6, KCAD = 4.2; // player physics (see speed model in updateHuman)

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function now() { return (window.performance && performance.now ? performance.now() : Date.now()) / 1000; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    for (var i = 0; i < 3; i++) c[i] = Math.round(amt < 0 ? c[i] * (1 + amt) : c[i] + (255 - c[i]) * amt);
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }
  function fmt2(t) { return t == null ? '—' : t.toFixed(2); }

  // CPU finishing-time fields per round (seconds). Small random noise is added per race.
  var ROUNDS = [
    { id: 'heat', name: 'Heat', rule: 'Top 3 qualify', q: 3, field: [11.45, 11.7, 11.95, 12.15, 12.4, 12.65, 12.9] },
    { id: 'qf', name: 'Quarter-final', rule: 'Top 3 qualify', q: 3, field: [10.95, 11.15, 11.35, 11.55, 11.75, 11.95, 12.2] },
    { id: 'sf', name: 'Semi-final', rule: 'Top 2 reach the final', q: 2, field: [10.55, 10.7, 10.85, 11.0, 11.15, 11.35, 11.55] },
    { id: 'final', name: 'Final', rule: 'Win gold to unlock record attempts', q: 1, field: [10.2, 10.32, 10.44, 10.56, 10.68, 10.82, 10.97] },
    { id: 'record', name: 'Record attempt', rule: 'Win and beat the track record', q: 1, field: [9.92, 10.0, 10.08, 10.15, 10.25, 10.35, 10.5] },
  ];
  var DUEL_FIELD = [10.75, 10.95, 11.15, 11.35, 11.6, 11.85];
  var START_RECORD = 9.79;

  var NAMES = ['R. Volta', 'K. Swift', 'L. Brandt', 'M. Sato', 'D. Vence', 'S. Okoro', 'J. Lind', 'T. Marsh', 'I. Petrov', 'L. Rossi', 'A. Silva', 'N. Cole', 'Y. Mori', 'O. Haddad', 'F. Wren', 'E. Nkemdi', 'P. Laurent', 'B. Kowal'];
  var KITS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#eab308', '#f97316', '#84cc16', '#e11d48'];
  var SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e', '#ffdbac', '#a0673a'];
  var HAIR = ['#1b1b1b', '#3b2416', '#6b4423', '#111', '#c9a26b'];

  IGAME.register('sprint-100', function (ctx) {
    var root = ctx.root, store = ctx.store, sfx = ctx.sfx;
    var noiseFx = (IGAME.sfx && IGAME.sfx.noise) || function () {};

    var save = store.get('save', null) || {};
    save = {
      pb: save.pb || {},
      reached: save.reached | 0,
      record: save.record || START_RECORD,
      recordBy: save.recordBy || 'Track record',
      attempts: save.attempts | 0,
      medals: save.medals || { g: 0, s: 0, b: 0 },
      tutorial: !!save.tutorial,
    };
    function persist() { store.set('save', save); }

    var style = document.createElement('style');
    style.textContent =
      '.sp-tbl{width:100%;border-collapse:collapse;font-size:13.5px;margin:0 0 10px}' +
      '.sp-tbl th{font:800 10.5px var(--font);color:var(--muted);text-transform:uppercase;letter-spacing:.05em;text-align:left;padding:3px 5px}' +
      '.sp-tbl td{padding:4px 5px;text-align:left;border-top:1px solid rgba(255,255,255,.07);color:var(--text-2);white-space:nowrap}' +
      '.sp-tbl .n{text-align:right;font-variant-numeric:tabular-nums}' +
      '.sp-tbl tr.me td{color:#fff;font-weight:800;background:rgba(45,212,240,.18)}' +
      '.sp-tbl tr.me2 td{color:#fff;font-weight:800;background:rgba(139,108,255,.25)}' +
      '.sp-q{color:#34d399;font-weight:800}' +
      '.sp-dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px}' +
      '.sp-small{font-size:12.5px;color:var(--muted);margin:0 0 12px}' +
      '.sp-pbs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:0 0 12px}' +
      '.sp-pbs div{background:var(--surface-3);border-radius:8px;padding:5px 2px;font:700 11px/1.25 var(--font);color:var(--muted)}' +
      '.sp-pbs b{display:block;color:#fff;font-size:13px}' +
      '.sp-compact.ig-panel{padding:14px 12px}.sp-compact .ig-title{font-size:21px;margin-bottom:4px}.sp-compact .ig-sub{font-size:13.5px;margin-bottom:8px}' +
      '.sp-compact .sp-tbl{font-size:12px;margin-bottom:6px}.sp-compact .sp-tbl td{padding:2px 4px}.sp-compact .sp-small{font-size:11.5px;margin-bottom:8px}.sp-compact .ig-btn{padding:10px 16px;font-size:15px}' +
      '.sp-pause{position:absolute;top:8px;right:8px;z-index:6;width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.18);background:rgba(5,6,14,.55);color:#fff;display:none;place-items:center;cursor:pointer;padding:0;touch-action:manipulation}' +
      '.sp-pause svg{width:16px;height:16px}.sp-pause.show{display:grid}';
    root.appendChild(style);

    var W = 1, H = 1, u = 1, portrait = false;
    var g = null;
    var view = IGAME.createCanvas(root, { onResize: function (w, h) { W = w; H = h; if (g) layout(); } });
    var canvas = view.canvas;
    g = view.ctx;

    var pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'sp-pause';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>';
    root.appendChild(pauseBtn);

    // ---------- layout values
    var viewM = 24, ppm = 40, trackTop = 0, trackBot = 0, barTop = 0, standsTop = 0, boardH = 0;
    var bY = new Float32Array(LANES + 1);
    var buttons = []; // {x,y,w,h,player,side,label,down}
    var crowdA = null, crowdB = null, tileW = 0, tileH = 0, skyGrad = null;
    var fontS = '', fontM = '', fontL = '', fontXL = '', fontClock = '';

    // ---------- game state
    var mode = 'career'; // career | duel
    var roundIdx = 0;
    var state = 'menu'; // menu | intro | marks | set | race | done | results | paused | fstart
    var stateT = 0, setDur = 1.5, raceT = 0, gunPerf = 0;
    var runners = [], humans = [];
    var camX = -6, camTarget = -6;
    var overlay = null, banner = null;
    var slowmo = 1, slowT = 0, flashA = 0, shake = 0, crowdHype = 0, crowdT = 0, crowdFrame = 0;
    var falseBy = null, results = null, duelScore = [0, 0];
    var time = 0, lastCrowdNoise = 0;
    var listeners = [];
    function on(t, type, fn, o) { t.addEventListener(type, fn, o); listeners.push([t, type, fn, o]); }

    // particles (fixed pool): dust puffs + confetti
    var parts = [];
    // x = world metres, lane = lane index, (ox, oy) = screen offset in units of u px
    for (var i = 0; i < 160; i++) parts.push({ on: false, x: 0, lane: 0, ox: 0, oy: 0, vx: 0, vy: 0, life: 0, max: 1, col: '#fff', s: 2, conf: false, rot: 0 });
    var pCur = 0;
    function emit(x, lane, n, col, sp, size, life, conf) {
      for (var i = 0; i < n; i++) {
        var p = parts[pCur];
        pCur = (pCur + 1) % parts.length;
        var a = conf ? rnd(-Math.PI * 0.85, -Math.PI * 0.15) : rnd(Math.PI * 0.95, Math.PI * 1.15);
        var v = sp * rnd(0.4, 1);
        p.on = true;
        p.x = x;
        p.lane = lane;
        p.ox = p.oy = 0;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v;
        p.life = p.max = life * rnd(0.6, 1.2);
        p.col = conf ? KITS[(Math.random() * KITS.length) | 0] : col;
        p.s = size * rnd(0.6, 1.3);
        p.conf = !!conf;
        p.rot = Math.random() * TAU;
      }
    }

    /* ------------------------------------------------------------ */
    /* Layout                                                        */
    /* ------------------------------------------------------------ */
    function layout() {
      portrait = H > W * 1.05;
      u = clamp(Math.min(W * 0.75, H) / 560, 0.62, 1.8);
      viewM = clamp((W / H) * 11.5, 9.5, 30);
      ppm = W / viewM;
      var pad = 8 * u + 4;
      barTop = portrait ? H * 0.76 : H * 0.8;
      trackBot = barTop - (portrait ? H * 0.03 : H * 0.035);
      trackTop = portrait ? H * 0.43 : H * 0.48;
      boardH = Math.max(12, H * 0.035);
      standsTop = H * 0.11;
      // lane boundaries: lanes nearer the camera are taller (simple perspective)
      var total = 0, hs = [];
      for (var l = 0; l < LANES; l++) {
        hs.push(laneScaleAt(l + 0.5));
        total += hs[l];
      }
      bY[0] = trackTop;
      for (l = 0; l < LANES; l++) bY[l + 1] = bY[l] + ((trackBot - trackTop) * hs[l]) / total;
      fontS = '700 ' + Math.round(Math.max(11, 12 * u)) + 'px ' + FONT;
      fontM = '800 ' + Math.round(Math.max(13, 16 * u)) + 'px ' + FONT;
      fontL = '900 ' + Math.round(Math.max(19, 28 * u)) + 'px ' + FONT;
      fontXL = '900 ' + Math.round(Math.max(28, 52 * u)) + 'px ' + FONT;
      fontClock = '900 ' + Math.round(Math.max(20, 30 * u)) + 'px ' + 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      skyGrad = null;
      buildButtons(pad);
      buildCrowd();
      draw();
    }

    function laneScaleAt(j) { return lerp(SFAR, 1, j / LANES); }
    function laneY(l) { return (bY[l] + bY[l + 1]) / 2; }
    // world x (metres) → screen x for a given perspective scale
    function sx(x, s) { return W * 0.5 + (x - (camX + viewM * 0.5)) * ppm * s; }

    function buildButtons(pad) {
      buttons = [];
      var bh = H - barTop - pad, y = barTop;
      if (mode === 'duel') {
        var bw = portrait ? W * 0.19 : Math.min(W * 0.1, 120 * u), gap = 6 * u;
        buttons.push({ x: pad, y: y, w: bw, h: bh, p: 0, side: 0, label: 'A', down: 0 });
        buttons.push({ x: pad + bw + gap, y: y, w: bw, h: bh, p: 0, side: 1, label: 'D', down: 0 });
        buttons.push({ x: W - pad - bw * 2 - gap, y: y, w: bw, h: bh, p: 1, side: 0, label: '←', down: 0 });
        buttons.push({ x: W - pad - bw, y: y, w: bw, h: bh, p: 1, side: 1, label: '→', down: 0 });
      } else {
        var bw1 = portrait ? W * 0.3 : Math.min(W * 0.17, 200 * u);
        buttons.push({ x: pad, y: y, w: bw1, h: bh, p: 0, side: 0, label: '←', down: 0 });
        buttons.push({ x: W - pad - bw1, y: y, w: bw1, h: bh, p: 0, side: 1, label: '→', down: 0 });
      }
    }

    // Pre-rendered crowd tiles (two frames: B has people jumping / arms up).
    function buildCrowd() {
      var dpr = view.dpr || 1;
      tileW = Math.round(Math.max(420, W * 0.6));
      tileH = Math.max(20, Math.round(trackTop - boardH - standsTop));
      crowdA = document.createElement('canvas');
      crowdB = document.createElement('canvas');
      crowdA.width = crowdB.width = Math.round(tileW * dpr);
      crowdA.height = crowdB.height = Math.round(tileH * dpr);
      var a = crowdA.getContext('2d'), b = crowdB.getContext('2d');
      a.scale(dpr, dpr);
      b.scale(dpr, dpr);
      var rows = Math.max(4, Math.round(tileH / (13 * u)));
      var rh = tileH / rows;
      var seed = 7;
      function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      var palette = ['#ef4444', '#3b82f6', '#f8fafc', '#fbbf24', '#22c55e', '#a855f7', '#f97316', '#0ea5e9', '#e11d48', '#1f2937', '#facc15'];
      [a, b].forEach(function (x, fi) {
        seed = 7;
        for (var row = 0; row < rows; row++) {
          var y0 = row * rh;
          x.fillStyle = row % 2 ? '#2a2f45' : '#323856';
          x.fillRect(0, y0, tileW, rh);
          x.fillStyle = 'rgba(0,0,0,0.25)';
          x.fillRect(0, y0 + rh - 2, tileW, 2);
          var sc = 0.75 + (row / rows) * 0.35;
          var step = 9 * u * sc;
          for (var px = r() * step; px < tileW; px += step * rnd2(r)) {
            if (r() < 0.08) continue; // empty seat
            var col = palette[(r() * palette.length) | 0];
            var skin = SKINS[(r() * SKINS.length) | 0];
            var jump = fi === 1 && r() < 0.45 ? -rh * 0.18 : 0;
            if (fi === 0) r();
            var hy = y0 + rh * 0.42 + jump;
            x.fillStyle = col;
            x.fillRect(px - 3.2 * u * sc, hy + 2.5 * u * sc, 6.4 * u * sc, rh * 0.6);
            x.fillStyle = skin;
            x.beginPath();
            x.arc(px, hy, 2.7 * u * sc, 0, TAU);
            x.fill();
            if (jump) {
              x.fillStyle = skin;
              x.fillRect(px - 4.5 * u * sc, hy - 5 * u * sc, 1.6 * u * sc, 6 * u * sc);
              x.fillRect(px + 3 * u * sc, hy - 5 * u * sc, 1.6 * u * sc, 6 * u * sc);
            }
          }
        }
      });
      function rnd2(rf) { return 0.8 + rf() * 0.5; }
    }

    /* ------------------------------------------------------------ */
    /* Race setup                                                    */
    /* ------------------------------------------------------------ */
    function makeRunner(name, lane, kit, human) {
      return {
        name: name, lane: lane, kit: kit, human: human, // human: -1 CPU, 0 = P1, 1 = P2
        skin: SKINS[(Math.random() * SKINS.length) | 0], hair: HAIR[(Math.random() * HAIR.length) | 0],
        x: -0.35, v: 0, phase: Math.random() * TAU, started: false, react: null, finish: null, prevX: -0.35,
        cpuT: 0, tau: 1.25, V: 0, fade: 0, stumbleT: 0, dipT: 0, cad: 0, rhythm: 0, avgInt: 0.12,
        lastSide: -1, lastStep: 0, falseStarts: 0, dq: false, dnf: false, steps: 0, pressT: [0, 0], place: 0,
      };
    }

    function setupRace() {
      closeOverlay();
      var r = mode === 'duel' ? null : ROUNDS[roundIdx];
      var field = (mode === 'duel' ? DUEL_FIELD : r.field).slice();
      // record attempts get slightly faster every time
      if (r && r.id === 'record') field = field.map(function (t) { return t - Math.min(0.25, save.attempts * 0.03); });
      var handicap = touchMode() ? 0.3 : 0;
      var names = NAMES.slice().sort(function () { return Math.random() - 0.5; });
      var kits = KITS.slice().sort(function () { return Math.random() - 0.5; });
      runners = [];
      humans = [];
      var humanLanes = mode === 'duel' ? [2, 5] : [4];
      var cpuTimes = field.map(function (t) { return t + rnd(-0.07, 0.07) + handicap; }).sort(function () { return Math.random() - 0.5; });
      var ci = 0;
      for (var l = 0; l < LANES; l++) {
        var hIdx = humanLanes.indexOf(l);
        var rn;
        if (hIdx > -1) {
          rn = makeRunner(mode === 'duel' ? (hIdx === 0 ? 'Player 1' : 'Player 2') : 'You', l, hIdx === 0 ? '#2dd4f0' : '#a78bfa', hIdx);
          humans[hIdx] = rn;
        } else {
          rn = makeRunner(names[ci], l, kits[ci % kits.length], -1);
          rn.cpuT = cpuTimes[ci];
          rn.react = rnd(0.125, 0.2);
          // fast starters (small tau) vs strong finishers (large tau), same finishing time
          rn.tau = rnd(1.05, 1.5);
          var T = rn.cpuT - rn.react;
          rn.V = DIST / (T - rn.tau * (1 - Math.exp(-T / rn.tau)));
          ci++;
        }
        runners.push(rn);
      }
      for (var p = 0; p < parts.length; p++) parts[p].on = false;
      camX = camTarget = -viewM * 0.45;
      raceT = 0;
      results = null;
      falseBy = null;
      slowmo = 1;
      flashA = 0;
      crowdHype = 0.2;
      buildButtons(8 * u + 4);
      setState('intro');
      pauseBtn.classList.add('show');
    }

    function resetForRestart() {
      for (var i = 0; i < runners.length; i++) {
        var rn = runners[i];
        rn.x = rn.prevX = -0.35;
        rn.v = 0;
        rn.started = false;
        rn.cad = 0;
        rn.rhythm = 0;
        rn.lastSide = -1;
        rn.stumbleT = 0;
        if (rn.human >= 0) rn.react = null;
      }
      raceT = 0;
      setState('marks');
    }

    function setState(s) {
      state = s;
      stateT = 0;
      if (s === 'marks') {
        banner = { text: 'On your marks', t: 0, col: '#fff' };
        sfx({ f: 440, d: 0.12, type: 'triangle', v: 0.1 });
      } else if (s === 'set') {
        setDur = rnd(1.1, 2.3);
        banner = { text: 'Set…', t: 0, col: '#fbbf24' };
        sfx({ f: 523, d: 0.12, type: 'triangle', v: 0.1 });
      } else if (s === 'race') {
        gunPerf = now();
        banner = { text: 'GO!', t: 0, col: '#34d399' };
        noiseFx({ d: 0.3, f: 2600, v: 0.45 });
        sfx({ f: 160, f2: 40, d: 0.25, type: 'square', v: 0.12 });
        shake = 6;
        crowdHype = 0.6;
      } else if (s === 'intro') {
        var r = mode === 'duel' ? { name: '2-player race', rule: 'First to the line wins' } : ROUNDS[roundIdx];
        banner = { text: r.name, sub: r.rule, t: 0, col: '#2dd4f0' };
      }
    }

    /* ------------------------------------------------------------ */
    /* Input → steps                                                 */
    /* ------------------------------------------------------------ */
    // Touch players get a slightly easier CPU field (tapping glass is slower than keys).
    var touchSeen = false, keyboardUsed = false;
    function touchMode() { return !keyboardUsed && (touchSeen || !!ctx.isTouch); }

    function press(p, side) {
      var rn = humans[p];
      if (!rn || rn.dq) return;
      rn.pressT[side] = time;
      if (state === 'intro' || state === 'menu' || state === 'results' || state === 'paused' || state === 'done') return;
      if (state === 'marks') return; // pressing early during "on your marks" is ignored
      if (state === 'set') { falseStart(rn, null); return; }
      if (state === 'fstart') return;
      if (rn.finish != null || rn.dq) return;
      var t = now();
      if (!rn.started) {
        var react = t - gunPerf;
        if (react < 0.1) { falseStart(rn, react); return; } // anticipation: under 0.100 s counts as a false start
        rn.started = true;
        rn.react = react;
        rn.cad = 3.5;
        rn.lastStep = t;
        rn.lastSide = side;
        rn.steps = 1;
        dust(rn, 6);
        stepSound(rn);
        return;
      }
      if (rn.stumbleT > 0) return;
      var interval = t - rn.lastStep;
      if (side === rn.lastSide || interval < 0.035) {
        // same foot twice (or both keys at once) = misstep
        rn.v *= 0.86;
        rn.cad *= 0.8;
        rn.stumbleT = 0.22;
        rn.rhythm = Math.min(1.2, rn.rhythm + 0.25);
        rn.lastStep = t;
        sfx({ f: 140, f2: 90, d: 0.1, type: 'square', v: 0.06 });
        if (rn.human === 0 || mode === 'duel') floatText(rn, 'Misstep!', '#f87171');
        return;
      }
      var inst = Math.min(16, 1 / interval);
      rn.cad += (inst - rn.cad) * 0.3;
      var dev = Math.abs(Math.log(interval / rn.avgInt));
      rn.rhythm = rn.rhythm * 0.75 + dev * 0.25;
      rn.avgInt = rn.avgInt * 0.7 + interval * 0.3;
      rn.lastStep = t;
      rn.lastSide = side;
      rn.steps++;
      stepSound(rn);
    }

    function stepSound(rn) {
      sfx({ f: rn.human === 1 ? 210 : 180, f2: 120, d: 0.035, type: 'triangle', v: 0.06 });
    }

    function falseStart(rn, react) {
      if (state === 'fstart') return;
      rn.falseStarts++;
      falseBy = rn;
      setState('fstart');
      shake = 8;
      sfx('error');
      noiseFx({ d: 0.25, f: 2600, v: 0.35, delay: 0.15 });
      noiseFx({ d: 0.25, f: 2600, v: 0.35, delay: 0.45 });
      var dq = rn.falseStarts >= 2;
      if (dq) rn.dq = true;
      banner = {
        text: 'FALSE START',
        sub: (react != null ? 'Reaction ' + Math.max(0, react).toFixed(3) + ' s — under 0.100 s counts as false. ' : '') +
          (dq ? rn.name + ' is disqualified' : 'Warning — one more and ' + (rn.human === 0 && mode !== 'duel' ? 'you are' : rn.name + ' is') + ' out'),
        t: 0,
        col: '#f87171',
      };
    }

    var floats = [];
    function floatText(rn, text, col) {
      floats.push({ rn: rn, text: text, col: col, t: 0 });
      if (floats.length > 6) floats.shift();
    }

    function dust(rn, n) {
      emit(rn.x - 0.2, rn.lane, n, '#d8b48a', 40, 0.06, 0.6, false);
    }

    /* ------------------------------------------------------------ */
    /* Update                                                        */
    /* ------------------------------------------------------------ */
    function update(dt) {
      time += dt;
      stateT += dt;
      if (banner) banner.t += dt;
      shake = Math.max(0, shake - dt * 25);
      flashA = Math.max(0, flashA - dt * 2.5);
      crowdT += dt;
      if (crowdT > (crowdHype > 0.7 ? 0.16 : 0.5)) {
        crowdT = 0;
        crowdFrame = 1 - crowdFrame;
      }
      for (var b = 0; b < buttons.length; b++) if (buttons[b].down > 0) buttons[b].down = Math.max(0, buttons[b].down - dt * 6);
      for (var f = floats.length - 1; f >= 0; f--) {
        floats[f].t += dt;
        if (floats[f].t > 0.9) floats.splice(f, 1);
      }
      if (state === 'menu' || state === 'paused') {
        updateParticles(dt);
        return;
      }
      if (state === 'intro' && stateT > 1.6) setState('marks');
      else if (state === 'marks' && stateT > 1.7) setState('set');
      else if (state === 'set' && stateT > setDur) setState('race');
      else if (state === 'fstart' && stateT > 2.4) {
        if (falseBy && falseBy.dq && (mode !== 'duel' || humans.every(function (h) { return h.dq; }))) finishRace();
        else resetForRestart();
      }
      // crowd noise bed
      if (state === 'race' && time - lastCrowdNoise > 0.45) {
        lastCrowdNoise = time;
        noiseFx({ d: 0.5, f: 700 + crowdHype * 500, v: 0.02 + crowdHype * 0.05 });
      }
      if (slowT > 0) {
        slowT -= dt;
        slowmo = slowT > 0 ? 0.3 : 1;
      }
      var sdt = dt * slowmo;
      if (state === 'race' || state === 'done') {
        raceT += sdt;
        var leadX = 0;
        for (var i = 0; i < runners.length; i++) {
          var rn = runners[i];
          rn.prevX = rn.x;
          if (rn.human >= 0) updateHuman(rn, sdt);
          else updateCpu(rn, sdt);
          rn.x += rn.v * sdt;
          rn.phase += sdt * stepRate(rn) * Math.PI;
          if (rn.stumbleT > 0) rn.stumbleT -= sdt;
          if (rn.dipT > 0) rn.dipT -= sdt;
          if (rn.finish == null && rn.x >= DIST && rn.prevX < DIST) crossLine(rn, sdt);
          if (rn.finish == null && rn.x > leadX) leadX = rn.x;
        }
        crowdHype = lerp(crowdHype, leadX > 70 ? 1 : 0.6, dt * 2);
        if (state === 'race') {
          var humansDone = humans.every(function (h) { return h.finish != null || h.dq; });
          if (humansDone) setState('done');
          // DNF if a human never gets going
          var cpuDone = runners.every(function (r) { return r.human >= 0 || r.finish != null; });
          if (cpuDone && raceT > 25) {
            humans.forEach(function (h) { if (h.finish == null) h.dnf = true; });
            setState('done');
          }
        } else if (state === 'done') {
          var allDone = runners.every(function (r) { return r.finish != null || r.dq || r.dnf; });
          if ((allDone && stateT > 1.4) || stateT > 4.5) finishRace();
        }
      }
      // camera
      var focus = humans.length ? humans[0] : runners[0];
      if (mode === 'duel' && humans[1] && humans[1].x > humans[0].x) focus = humans[1];
      if (focus) {
        camTarget = focus.x - viewM * (portrait ? 0.4 : 0.36);
        if (focus.finish != null) camTarget = Math.min(camTarget, Math.max(DIST - viewM * 0.55, focus.x - viewM * 0.85));
        if (mode === 'duel') {
          var other = focus === humans[0] ? humans[1] : humans[0];
          if (other && !other.dq) camTarget = Math.min(camTarget, Math.max(focus.x - viewM * 0.85, other.x - viewM * 0.12));
        }
        if (state === 'intro' || state === 'marks' || state === 'set' || state === 'fstart') camTarget = -viewM * 0.2;
      }
      camX += (camTarget - camX) * (1 - Math.exp(-dt * 4));
      updateParticles(dt);
    }

    function stepRate(rn) {
      // visual stride cadence from speed (steps per second)
      return rn.v < 0.3 ? 0 : 1.6 + rn.v * 0.33;
    }

    // Player speed model: cadence (EMA of alternating taps) sets a target speed, rhythm evenness
    // scales it, and the runner eases toward it (slower to accelerate than to slow down).
    function updateHuman(rn, dt) {
      if (rn.dq) { rn.v = Math.max(0, rn.v - dt * 6); return; }
      if (!rn.started) { rn.v = 0; return; }
      var since = now() - rn.lastStep;
      if (rn.finish != null) {
        rn.v = Math.max(0, rn.v - dt * 4.5);
        return;
      }
      if (since > Math.max(0.25, 2.2 / Math.max(rn.cad, 1))) rn.cad *= Math.exp(-dt * 3);
      var rf = 1 - Math.min(0.3, rn.rhythm * 0.55);
      var vT = VMAX * (1 - Math.exp(-rn.cad / KCAD)) * rf;
      if (rn.stumbleT > 0) vT *= 0.6;
      var tau = vT > rn.v ? 1.05 : 0.55;
      rn.v += (vT - rn.v) * (1 - Math.exp(-dt / tau));
      if (rn.x < 1.5 && Math.random() < 0.3) dust(rn, 1);
    }

    function updateCpu(rn, dt) {
      var t = raceT - rn.react;
      if (t <= 0) { rn.v = 0; return; }
      if (rn.finish != null) { rn.v = Math.max(0, rn.v - dt * 3); return; }
      if (!rn.started) { rn.started = true; dust(rn, 6); }
      rn.v = rn.V * (1 - Math.exp(-t / rn.tau));
    }

    function crossLine(rn, dt) {
      // interpolate the exact crossing moment inside this frame (times to 0.01 s)
      var f = (DIST - rn.prevX) / Math.max(1e-6, rn.x - rn.prevX);
      rn.finish = raceT - dt + f * dt;
      if (rn.human < 0) rn.finish = Math.round(rn.finish * 1000) / 1000;
      rn.dipT = 0.35;
      var placed = runners.filter(function (r) { return r.finish != null; }).length;
      rn.place = placed;
      if (rn.human >= 0) {
        flashA = 0.5;
        sfx(placed === 1 ? 'win' : 'pop');
        // photo finish: another runner within 0.1 s either side → slow motion
        var close = runners.some(function (o) { return o !== rn && Math.abs((o.finish != null ? o.finish : raceT + (DIST - o.x) / Math.max(o.v, 1)) - rn.finish) < 0.1; });
        if (close) {
          slowT = 0.9;
          banner = { text: 'PHOTO FINISH', t: 0, col: '#fbbf24' };
        }
        if (placed === 1) emit(rn.x, rn.lane, 60, '', 260, 1, 1.8, true);
      }
    }

    function updateParticles(dt) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.ox += p.vx * dt;
        p.oy += p.vy * dt;
        if (p.conf) { p.vy += 260 * dt; p.vx *= 0.99; p.rot += dt * 8; }
        else { p.vx *= 0.95; p.vy *= 0.95; }
      }
    }

    /* ------------------------------------------------------------ */
    /* Results / progression                                        */
    /* ------------------------------------------------------------ */
    function finishRace() {
      if (state === 'results') return;
      state = 'results';
      pauseBtn.classList.remove('show');
      var order = runners.slice().sort(function (a, b) {
        var ta = a.dq || a.dnf || a.finish == null ? 999 : a.finish, tb = b.dq || b.dnf || b.finish == null ? 999 : b.finish;
        return ta - tb;
      });
      order.forEach(function (r, i) { r.place = i + 1; });
      results = order;
      if (mode === 'duel') return showDuelResults(order);
      var r = ROUNDS[roundIdx], me = humans[0];
      var ok = !me.dq && !me.dnf && me.place <= r.q;
      var time100 = me.finish != null && !me.dq ? me.finish : null;
      var pbOld = save.pb[r.id], newPb = false;
      if (time100 != null && (!pbOld || time100 < pbOld)) {
        save.pb[r.id] = Math.round(time100 * 100) / 100;
        newPb = true;
      }
      var recordMsg = '';
      if (r.id === 'record') {
        save.attempts++;
        if (time100 != null && me.place === 1 && time100 < save.record) {
          save.record = Math.round(time100 * 100) / 100;
          save.recordBy = 'You';
          recordMsg = 'NEW TRACK RECORD!';
        } else ok = false;
      }
      if (r.id === 'final' && time100 != null) {
        if (me.place === 1) save.medals.g++;
        else if (me.place === 2) save.medals.s++;
        else if (me.place === 3) save.medals.b++;
      }
      if (ok && roundIdx + 1 > save.reached && roundIdx < ROUNDS.length - 1) save.reached = roundIdx + 1;
      save.tutorial = true;
      persist();
      showResults(order, ok, newPb, recordMsg);
    }

    function resultsTable(order, q) {
      var rows = order.map(function (rn) {
        var cls = rn.human === 0 ? 'me' : rn.human === 1 ? 'me2' : '';
        var t = rn.dq ? 'DQ' : rn.dnf || rn.finish == null ? 'DNF' : fmt2(rn.finish);
        var qual = q && !rn.dq && !rn.dnf && rn.place <= q ? ' <span class="sp-q">Q</span>' : '';
        return '<tr class="' + cls + '"><td>' + rn.place + '</td><td><span class="sp-dot" style="background:' + rn.kit + '"></span>' + rn.name + qual + '</td><td class="n">' + (rn.lane + 1) + '</td><td class="n">' + t + '</td><td class="n">' + (rn.react != null && !rn.dq ? rn.react.toFixed(3) : '—') + '</td></tr>';
      }).join('');
      return '<table class="sp-tbl"><thead><tr><th>#</th><th>Athlete</th><th class="n">Ln</th><th class="n">Time</th><th class="n">React</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function showResults(order, ok, newPb, recordMsg) {
      var r = ROUNDS[roundIdx], me = humans[0];
      var title, sub, buttonsList = [];
      if (me.dq) { title = 'Disqualified'; sub = 'Two false starts. Wait for the gun!'; }
      else if (me.dnf) { title = 'Did not finish'; sub = 'Alternate ← and → after the gun to run.'; }
      else if (r.id === 'final') {
        title = me.place === 1 ? '🥇 Champion!' : me.place === 2 ? '🥈 Silver medal' : me.place === 3 ? '🥉 Bronze medal' : ordinal(me.place) + ' in the final';
        sub = me.place === 1 ? 'Record attempts unlocked — beat ' + fmt2(save.record) + '.' : 'Only gold unlocks the record attempts.';
      } else if (r.id === 'record') {
        title = recordMsg ? '🏆 ' + recordMsg : me.place === 1 ? 'Won — but no record' : ordinal(me.place) + ' place';
        sub = 'Track record: ' + fmt2(save.record) + ' (' + save.recordBy + ')';
      } else if (ok) { title = 'Qualified!'; sub = ordinal(me.place) + ' place — on to the ' + ROUNDS[roundIdx + 1].name.toLowerCase() + '.'; }
      else { title = 'Eliminated'; sub = ordinal(me.place) + ' place — ' + r.rule.toLowerCase() + '.'; }
      if (ok || (r.id === 'final' && me.place === 1)) sfx('levelup');
      else if (!recordMsg) sfx('lose');
      var extra = '<p class="sp-small">' + (me.finish != null && !me.dq ? 'Your time ' + fmt2(me.finish) + ' s · reaction ' + (me.react != null ? me.react.toFixed(3) : '—') + ' s' : '') +
        (newPb ? ' · <b style="color:#fbbf24">Personal best!</b>' : save.pb[r.id] ? ' · PB ' + fmt2(save.pb[r.id]) : '') + '</p>';
      if (r.id === 'record') buttonsList.push({ label: 'Go again', primary: true, onClick: function () { setupRace(); } });
      else if (ok) buttonsList.push({ label: 'Next: ' + ROUNDS[roundIdx + 1].name, primary: true, onClick: function () { roundIdx++; setupRace(); } });
      else buttonsList.push({ label: 'Retry ' + r.name.toLowerCase(), primary: true, onClick: function () { setupRace(); } });
      buttonsList.push({ label: 'Menu', onClick: showMenu });
      overlay = makeOverlay({ title: title, text: sub, html: resultsTable(order, r.id === 'final' || r.id === 'record' ? 0 : r.q) + extra, buttons: buttonsList });
    }

    function showDuelResults(order) {
      var p1 = humans[0], p2 = humans[1], w = null;
      var t1 = p1.dq || p1.finish == null ? 999 : p1.finish, t2 = p2.dq || p2.finish == null ? 999 : p2.finish;
      if (t1 < t2) w = 0;
      else if (t2 < t1) w = 1;
      if (w != null) duelScore[w]++;
      sfx(w != null ? 'win' : 'lose');
      overlay = makeOverlay({
        title: w == null ? 'Dead heat!' : 'Player ' + (w + 1) + ' wins!',
        text: 'Series: Player 1  ' + duelScore[0] + ' – ' + duelScore[1] + '  Player 2',
        html: resultsTable(order, 0),
        buttons: [
          { label: 'Rematch', primary: true, onClick: function () { setupRace(); } },
          { label: 'Menu', onClick: showMenu },
        ],
      });
    }

    function ordinal(n) { return n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'); }

    function makeOverlay(o) {
      var ov = IGAME.ui.overlay(root, o);
      if (H < 600 || W < 480) ov.panel.classList.add('sp-compact');
      return ov;
    }

    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }

    function showMenu() {
      closeOverlay();
      state = 'menu';
      pauseBtn.classList.remove('show');
      mode = 'career';
      // a calm background field
      roundIdx = 0;
      runners = [];
      humans = [];
      for (var l = 0; l < LANES; l++) {
        var rn = makeRunner('', l, KITS[l % KITS.length], -1);
        rn.x = -0.35;
        runners.push(rn);
      }
      camX = -viewM * 0.3;
      buildButtons(8 * u + 4);
      var pbs = ROUNDS.map(function (r) {
        return '<div>' + (r.id === 'qf' ? 'Q-final' : r.id === 'sf' ? 'Semi' : r.id === 'record' ? 'Record' : r.name) + '<b>' + fmt2(save.pb[r.id]) + '</b></div>';
      }).join('');
      var medals = save.medals.g + save.medals.s + save.medals.b ? ' · Medals 🥇' + save.medals.g + ' 🥈' + save.medals.s + ' 🥉' + save.medals.b : '';
      var html = '<p class="sp-small" style="margin-bottom:6px">Personal bests (s)</p><div class="sp-pbs">' + pbs + '</div>' +
        '<p class="sp-small">' + (touchMode() ? 'Tap the two big buttons alternately' : 'Alternate <span class="ig-kbd">←</span> <span class="ig-kbd">→</span> (or A/D)') + ' in an even rhythm. ' + (touchMode() ? 'Same button' : 'Same key') + ' twice = misstep. Track record ' + fmt2(save.record) + medals + '</p>';
      var bl = [{ label: '▶ Start career', primary: true, onClick: function () { mode = 'career'; roundIdx = 0; setupRace(); } }];
      if (save.reached > 0) bl.push({ label: 'Continue: ' + ROUNDS[save.reached].name, primary: false, onClick: function () { mode = 'career'; roundIdx = save.reached; setupRace(); } });
      bl.push({ label: '2 players', onClick: function () { mode = 'duel'; duelScore = [0, 0]; setupRace(); } });
      overlay = makeOverlay({
        title: ctx.title || 'Photo Finish',
        text: 'Win the 100 m from the heats to the final — then chase the track record.',
        html: html,
        buttons: bl,
      });
    }

    function openPause() {
      if (state === 'menu' || state === 'results' || state === 'paused') return;
      pausedFrom = state;
      state = 'paused';
      overlay = makeOverlay({
        title: 'Paused',
        text: mode === 'duel' ? '2-player race' : ROUNDS[roundIdx].name + ' — ' + ROUNDS[roundIdx].rule,
        buttons: [
          { label: 'Resume', primary: true, onClick: resumeGame },
          { label: 'Restart race', onClick: function () { setupRace(); } },
          { label: 'Menu', onClick: showMenu },
        ],
      });
    }
    var pausedFrom = 'race';
    function resumeGame() {
      closeOverlay();
      if (state !== 'paused') return;
      // a paused start sequence restarts from "on your marks" so nobody can cheat the gun
      if (pausedFrom === 'set' || pausedFrom === 'marks' || pausedFrom === 'intro') { state = 'race'; resetForRestart(); }
      else {
        state = pausedFrom;
        // keep the tap-interval clock honest after a pause
        var t = now();
        humans.forEach(function (h) { h.lastStep = t; });
      }
    }

    /* ------------------------------------------------------------ */
    /* Drawing                                                       */
    /* ------------------------------------------------------------ */
    function draw() {
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.save();
      if (shake > 0.2) g.translate((Math.random() - 0.5) * shake * u, (Math.random() - 0.5) * shake * u);
      drawBackground();
      drawTrack();
      drawRunners();
      drawParticles();
      g.restore();
      if (flashA > 0) {
        g.fillStyle = 'rgba(255,255,255,' + flashA + ')';
        g.fillRect(0, 0, W, H);
      }
      drawHud();
    }

    function drawBackground() {
      // evening sky + stadium roof
      if (!skyGrad) {
        skyGrad = g.createLinearGradient(0, 0, 0, standsTop + 10);
        skyGrad.addColorStop(0, '#0d1030');
        skyGrad.addColorStop(1, '#2a2f6b');
      }
      g.fillStyle = skyGrad;
      g.fillRect(-20, -20, W + 40, standsTop + 30);
      // floodlight towers (slow parallax)
      var spacing = Math.max(260, W * 0.42);
      var par = (((camX * ppm * 0.12) % spacing) + spacing) % spacing;
      for (var lx = -par - spacing * 0.5; lx < W + spacing; lx += spacing) {
        var ly = standsTop * 0.32;
        g.fillStyle = 'rgba(255,255,230,0.12)';
        g.beginPath();
        g.moveTo(lx - 20 * u, ly);
        g.lineTo(lx + 20 * u, ly);
        g.lineTo(lx + 90 * u, standsTop + 40 * u);
        g.lineTo(lx - 90 * u, standsTop + 40 * u);
        g.closePath();
        g.fill();
        g.fillStyle = '#3a3f66';
        g.fillRect(lx - 18 * u, ly - 9 * u, 36 * u, 12 * u);
        g.fillStyle = '#fffbe6';
        for (var b = 0; b < 4; b++) g.fillRect(lx - 15 * u + b * 8 * u, ly - 7 * u, 6 * u, 8 * u);
      }
      // roof edge
      g.fillStyle = '#1a1d38';
      g.fillRect(-20, standsTop - 8 * u, W + 40, 8 * u);
      // crowd (parallax 0.55)
      var tile = crowdFrame && crowdHype > 0.45 ? crowdB : crowdA;
      if (tile) {
        var off = ((camX * ppm * 0.55) % tileW + tileW) % tileW;
        for (var x = -off; x < W; x += tileW) g.drawImage(tile, x, standsTop, tileW, tileH);
      }
      // camera flashes in the crowd
      var flashes = Math.round(crowdHype * crowdHype * 6);
      g.fillStyle = '#fff';
      for (var f = 0; f < flashes; f++) {
        if (Math.random() < 0.5) continue;
        var fx = Math.random() * W, fy = standsTop + Math.random() * tileH;
        g.globalAlpha = 0.85;
        g.beginPath();
        g.arc(fx, fy, (1.5 + Math.random() * 2) * u, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
      // advertising boards (parallax ~ far track edge)
      var by = trackTop - boardH, s0 = SFAR * 0.98;
      g.fillStyle = '#0b0d1a';
      g.fillRect(-20, by - 2, W + 40, boardH + 2);
      var boardW = 6; // metres
      var camC = camX + viewM * 0.5;
      var first = Math.floor((camC - viewM / (2 * s0)) / boardW) - 1;
      var words = ['IGAME9', '100 M', 'SPRINT', 'GO GO GO', 'PHOTO FINISH', 'RUN!'];
      var cols = ['#1d4ed8', '#be123c', '#047857', '#7c3aed', '#b45309', '#0e7490'];
      g.font = '900 ' + Math.round(boardH * 0.62) + 'px ' + FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (var i = first; i < first + viewM / (boardW * s0) + 3; i++) {
        var x0 = sx(i * boardW, s0), x1 = sx((i + 1) * boardW, s0);
        if (x1 < -10 || x0 > W + 10) continue;
        var idx = ((i % 6) + 6) % 6;
        g.fillStyle = cols[idx];
        g.fillRect(x0 + 1, by, x1 - x0 - 2, boardH);
        g.fillStyle = 'rgba(255,255,255,0.92)';
        g.fillText(words[idx], (x0 + x1) / 2, by + boardH / 2 + 1);
      }
    }

    function drawTrack() {
      // track surface
      g.fillStyle = '#b9472f';
      g.fillRect(-20, trackTop, W + 40, trackBot - trackTop);
      // subtle grain stripes per lane
      for (var l = 0; l < LANES; l++) {
        g.fillStyle = l % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)';
        g.fillRect(-20, bY[l], W + 40, bY[l + 1] - bY[l]);
      }
      // infield grass near the camera
      g.fillStyle = '#2f7d32';
      g.fillRect(-20, trackBot, W + 40, H - trackBot + 20);
      var stripeW = 5, gs = 1.06;
      var gf = Math.floor((camX + viewM * 0.5 - viewM / (2 * gs)) / stripeW) - 2;
      gf -= ((gf % 2) + 2) % 2;
      g.fillStyle = '#358a37';
      for (var s = gf; s < gf + viewM / (stripeW * gs) + 6; s += 2) {
        var gx0 = sx(s * stripeW, gs), gx1 = sx((s + 1) * stripeW, gs);
        g.fillRect(gx0, trackBot, gx1 - gx0, H - trackBot);
      }
      // kerb
      g.fillStyle = '#e5e7eb';
      g.fillRect(-20, trackBot, W + 40, Math.max(2, 3 * u));
      // lane lines
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (var j = 0; j <= LANES; j++) g.fillRect(-20, bY[j] - 1, W + 40, Math.max(1.5, 2 * u * laneScaleAt(j)));
      // 10 m marks (slanted by perspective)
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = Math.max(1, 1.5 * u);
      g.font = '800 ' + Math.round(11 * u + 2) + 'px ' + FONT;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      for (var m = 10; m < DIST; m += 10) {
        var mx0 = sx(m, SFAR), mx1 = sx(m, 1);
        if (mx1 < -50 || mx0 > W + 50) continue;
        g.beginPath();
        g.moveTo(mx0, trackTop);
        g.lineTo(mx1, trackBot);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.fillText(m + ' m', mx1, trackBot + 5 * u);
      }
      // start line + lane numbers + blocks
      slantLine(0, '#ffffff', 3);
      for (var ln = 0; ln < LANES; ln++) {
        var sc = laneScaleAt(ln + 0.5), cy = laneY(ln);
        var nx = sx(-1.6, sc);
        if (nx > -40 && nx < W + 40) {
          g.fillStyle = 'rgba(255,255,255,0.85)';
          g.font = '900 ' + Math.round((bY[ln + 1] - bY[ln]) * 0.7) + 'px ' + FONT;
          g.textBaseline = 'middle';
          g.fillText('' + (ln + 1), nx, cy + 1);
        }
        var bx = sx(-0.55, sc);
        if (bx > -40 && bx < W + 40) {
          g.fillStyle = '#4b5563';
          g.fillRect(bx, cy - 2 * u * sc, 14 * u * sc, 5 * u * sc);
          g.fillStyle = '#9ca3af';
          g.fillRect(bx + 2 * u, cy - 6 * u * sc, 4 * u * sc, 5 * u * sc);
        }
      }
      // finish line (white with a checkered strip at the near edge) + photo-finish tower
      slantLine(DIST, '#ffffff', 5);
      var fx0 = sx(DIST, 1);
      if (fx0 > -60 && fx0 < W + 160) {
        var cs = 6 * u;
        for (var c = 0; c < 6; c++) {
          for (var rr = 0; rr < 2; rr++) {
            g.fillStyle = (c + rr) % 2 ? '#111' : '#fff';
            g.fillRect(fx0 + rr * cs - cs, trackBot + 4 * u + c * cs, cs, cs);
          }
        }
        var tx = sx(DIST + 0.6, SFAR), ty = trackTop - boardH;
        g.fillStyle = '#111827';
        g.fillRect(tx - 2 * u, ty - 70 * u, 4 * u, 70 * u);
        g.fillStyle = '#0b0b0f';
        g.fillRect(tx - 34 * u, ty - 92 * u, 68 * u, 26 * u);
        g.strokeStyle = '#fbbf24';
        g.lineWidth = 1.5;
        g.strokeRect(tx - 34 * u, ty - 92 * u, 68 * u, 26 * u);
        g.fillStyle = '#fbbf24';
        g.font = '900 ' + Math.round(17 * u) + 'px ui-monospace, Menlo, Consolas, monospace';
        g.textBaseline = 'middle';
        var winT = null;
        for (var wi = 0; wi < runners.length; wi++) if (runners[wi].finish != null && (winT == null || runners[wi].finish < winT)) winT = runners[wi].finish;
        g.fillText((winT != null ? winT : raceT).toFixed(2), tx, ty - 79 * u);
      }
    }

    function slantLine(x, col, wpx) {
      var a = sx(x, SFAR), b = sx(x, 1);
      if (Math.max(a, b) < -20 || Math.min(a, b) > W + 20) return;
      g.strokeStyle = col;
      g.lineWidth = wpx * u;
      g.beginPath();
      g.moveTo(a, trackTop);
      g.lineTo(b, trackBot);
      g.stroke();
    }

    function drawRunners() {
      for (var l = 0; l < LANES; l++) {
        var rn = runners[l];
        if (!rn) continue;
        var sc = laneScaleAt(l + 0.5);
        var X = sx(rn.x, sc), Y = laneY(l) + (bY[l + 1] - bY[l]) * 0.22;
        var Hp = ppm * 1.72 * sc;
        if (X < -Hp || X > W + Hp) continue;
        // shadow
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath();
        g.ellipse(X, Y, Hp * 0.2, Hp * 0.035, 0, 0, TAU);
        g.fill();
        var headTop = drawRunner(rn, X, Y, Hp);
        if (rn.human >= 0 && state !== 'menu') {
          // marker above the head
          var my = headTop - 16 * u;
          var label = mode === 'duel' ? 'P' + (rn.human + 1) : 'YOU';
          g.font = '900 ' + Math.round(Math.max(10, 11 * u)) + 'px ' + FONT;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          var tw = g.measureText(label).width + 10 * u;
          g.fillStyle = rn.kit;
          roundRect(X - tw / 2, my - 9 * u, tw, 16 * u, 5 * u);
          g.fill();
          g.beginPath();
          g.moveTo(X - 5 * u, my + 7 * u);
          g.lineTo(X + 5 * u, my + 7 * u);
          g.lineTo(X, my + 12 * u);
          g.closePath();
          g.fill();
          g.fillStyle = '#05060e';
          g.fillText(label, X, my);
        }
      }
      // floating texts (misstep etc.)
      for (var f = 0; f < floats.length; f++) {
        var ft = floats[f], r2 = ft.rn, s2 = laneScaleAt(r2.lane + 0.5);
        var fx = sx(r2.x, s2), fy = laneY(r2.lane) - ppm * 1.72 * s2 * 1.35 - ft.t * 30 * u;
        g.globalAlpha = 1 - ft.t / 0.9;
        g.font = fontM;
        g.fillStyle = ft.col;
        g.textAlign = 'center';
        g.fillText(ft.text, fx, fy);
        g.globalAlpha = 1;
      }
    }

    // Articulated runner (forward kinematics). Angles are measured from "straight down",
    // positive = toward the running direction (+x).
    function drawRunner(rn, X, Y, L) {
      var phase = rn.phase, lean, hipH, legs, arms, armsUp = false;
      var st = state === 'paused' ? pausedFrom : state;
      var crouched = (st === 'marks' || st === 'set' || st === 'intro' || st === 'fstart') && !rn.started && rn.x < 0;
      var celebrating = rn.finish != null && rn.v < 2.5 && rn.place === 1;
      if (st === 'menu') {
        // relaxed standing / bouncing on the spot
        var bounce = Math.sin(time * 4 + rn.lane) * 0.04;
        lean = 0.05;
        hipH = 0.5 + bounce * 0.2;
        legs = [[0.08 + bounce, 0.1], [-0.08 - bounce, 0.12]];
        arms = [[0.15, 0.3], [-0.12, 0.3]];
      } else if (crouched && (st === 'set' || (st === 'fstart' && rn === falseBy))) {
        lean = 1.75;
        hipH = 0.4;
        legs = [[1.1, 1.75], [0.45, 1.1]];
        arms = [[-0.15 + 1.75 - 1.6, 0], [-0.25 + 1.75 - 1.6, 0]];
      } else if (crouched) {
        lean = 1.3;
        hipH = 0.27;
        legs = [[1.45, 2.5], [0.55, 2.55]];
        arms = [[0.05, 0], [-0.05, 0]];
      } else if (celebrating) {
        lean = -0.05;
        hipH = 0.5;
        legs = [[0.1, 0.12], [-0.1, 0.12]];
        arms = [[Math.PI - 0.35 + Math.sin(time * 9) * 0.1, 0.2], [-(Math.PI - 0.35) + Math.sin(time * 9 + 1) * 0.1, 0.2]];
        armsUp = true;
      } else if (rn.v < 0.2) {
        lean = 0.05;
        hipH = 0.5;
        legs = [[0.06, 0.1], [-0.06, 0.1]];
        arms = [[0.1, 0.4], [-0.1, 0.4]];
      } else {
        // running cycle; drive phase leans forward for the first ~30 m
        var drive = clamp(1 - rn.x / 30, 0, 1);
        lean = lerp(0.16, 0.62, drive * drive) + (rn.stumbleT > 0 ? 0.45 : 0) + (rn.dipT > 0 ? 0.35 * Math.sin((rn.dipT / 0.35) * Math.PI) : 0);
        var amp = clamp(rn.v / 10, 0.35, 1.05);
        hipH = 0.48 - 0.02 * Math.cos(2 * phase) - drive * 0.04;
        legs = [legPose(phase, amp), legPose(phase + Math.PI, amp)];
        var flail = rn.stumbleT > 0 ? Math.sin(time * 40) * 0.8 : 0;
        arms = [[-0.95 * amp * Math.sin(phase) + lean * 0.4 + flail, 1.45], [0.95 * amp * Math.sin(phase) + lean * 0.4 - flail, 1.45]];
      }
      var thighL = 0.245 * L, shinL = 0.255 * L, torsoL = 0.3 * L, uaL = 0.17 * L, faL = 0.16 * L;
      var hx = X, hy = Y - hipH * L - 0.03 * L;
      var shx = hx + Math.sin(lean) * torsoL, shy = hy - Math.cos(lean) * torsoL;
      if (!rn.skinD) {
        rn.skinD = shade(rn.skin, -0.28);
        rn.kitD = shade(rn.kit, -0.3);
      }
      var skinD = rn.skinD, kitD = rn.kitD;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // far-side limbs first (darker)
      limbArm(shx, shy, arms[1], uaL, faL, skinD, L, kitD);
      limbLeg(hx, hy, legs[1], thighL, shinL, skinD, '#111827', L, true);
      // torso (singlet) + shorts
      g.strokeStyle = '#1f2937';
      g.lineWidth = 0.13 * L;
      g.beginPath();
      g.moveTo(hx - Math.sin(lean) * 0.02 * L, hy + 0.02 * L);
      g.lineTo(hx + Math.sin(lean) * 0.07 * L, hy - Math.cos(lean) * 0.07 * L);
      g.stroke();
      g.strokeStyle = rn.kit;
      g.lineWidth = 0.125 * L;
      g.beginPath();
      g.moveTo(hx + Math.sin(lean) * 0.08 * L, hy - Math.cos(lean) * 0.08 * L);
      g.lineTo(shx, shy);
      g.stroke();
      // neck + head
      var nx = shx + Math.sin(lean) * 0.05 * L, ny = shy - Math.cos(lean) * 0.05 * L;
      g.strokeStyle = rn.skin;
      g.lineWidth = 0.05 * L;
      g.beginPath();
      g.moveTo(shx, shy);
      g.lineTo(nx, ny);
      g.stroke();
      var headR = 0.062 * L;
      var hcx = nx + Math.sin(lean * 0.6) * headR * 0.9, hcy = ny - Math.cos(lean * 0.6) * headR * 0.9;
      g.fillStyle = rn.skin;
      g.beginPath();
      g.arc(hcx, hcy, headR, 0, TAU);
      g.fill();
      g.fillStyle = rn.hair;
      g.beginPath();
      g.arc(hcx - headR * 0.15, hcy - headR * 0.15, headR * 0.95, Math.PI * 0.85, Math.PI * 1.95);
      g.fill();
      // near-side limbs
      limbLeg(hx, hy, legs[0], thighL, shinL, rn.skin, '#f8fafc', L, false);
      limbArm(shx, shy, arms[0], uaL, faL, rn.skin, L, rn.kit);
      var top = Math.min(hcy - headR, armsUp ? hy - L * 0.75 : 1e9);
      if (armsUp) {
        // little sparkle around the winner
        g.fillStyle = '#fde68a';
        for (var k = 0; k < 3; k++) {
          var a = time * 3 + (k * TAU) / 3;
          g.fillRect(hcx + Math.cos(a) * L * 0.2 - 2, hcy + Math.sin(a) * L * 0.12 - 2, 4, 4);
        }
      }
      return top;
    }

    function legPose(ph, amp) {
      var thigh = 0.3 + 0.8 * amp * Math.sin(ph);
      var knee = 0.95 + 0.85 * amp * Math.cos(ph) + 0.15 * Math.sin(ph);
      return [thigh, Math.max(0.05, knee)];
    }

    function limbLeg(hx, hy, pose, tl, sl, skin, shoe, L, far) {
      var th = pose[0], kn = pose[1];
      var kx = hx + Math.sin(th) * tl, ky = hy + Math.cos(th) * tl;
      var sa = th - kn;
      var fx = kx + Math.sin(sa) * sl, fy = ky + Math.cos(sa) * sl;
      // shorts on the upper thigh
      g.strokeStyle = far ? '#111827' : '#1f2937';
      g.lineWidth = 0.09 * L;
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + Math.sin(th) * tl * 0.45, hy + Math.cos(th) * tl * 0.45);
      g.stroke();
      g.strokeStyle = skin;
      g.lineWidth = 0.068 * L;
      g.beginPath();
      g.moveTo(hx + Math.sin(th) * tl * 0.4, hy + Math.cos(th) * tl * 0.4);
      g.lineTo(kx, ky);
      g.stroke();
      g.lineWidth = 0.055 * L;
      g.beginPath();
      g.moveTo(kx, ky);
      g.lineTo(fx, fy);
      g.stroke();
      // spike shoe: points along the foot (roughly perpendicular to the shin)
      var fa = sa + Math.PI / 2;
      g.strokeStyle = shoe;
      g.lineWidth = 0.05 * L;
      g.beginPath();
      g.moveTo(fx - Math.sin(fa) * 0.02 * L, fy - Math.cos(fa) * 0.02 * L);
      g.lineTo(fx + Math.sin(fa) * 0.075 * L, fy + Math.cos(fa) * 0.075 * L);
      g.stroke();
    }

    function limbArm(sx0, sy0, pose, ua, fa, skin, L, sleeve) {
      var a = pose[0], flex = pose[1];
      var ex = sx0 + Math.sin(a) * ua, ey = sy0 + Math.cos(a) * ua;
      var fa2 = a + flex;
      var hx = ex + Math.sin(fa2) * fa, hy = ey + Math.cos(fa2) * fa;
      g.strokeStyle = sleeve;
      g.lineWidth = 0.06 * L;
      g.beginPath();
      g.moveTo(sx0, sy0);
      g.lineTo(sx0 + Math.sin(a) * ua * 0.3, sy0 + Math.cos(a) * ua * 0.3);
      g.stroke();
      g.strokeStyle = skin;
      g.lineWidth = 0.045 * L;
      g.beginPath();
      g.moveTo(sx0 + Math.sin(a) * ua * 0.25, sy0 + Math.cos(a) * ua * 0.25);
      g.lineTo(ex, ey);
      g.lineTo(hx, hy);
      g.stroke();
    }

    function drawParticles() {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p.on) continue;
        var l = p.lane;
        var sc = laneScaleAt(l + 0.5);
        var X = sx(p.x, sc) + p.ox * u, Y;
        if (p.conf) {
          Y = laneY(l) - ppm * 1.5 * sc + p.oy * u;
          g.globalAlpha = clamp((p.life / p.max) * 2, 0, 1);
          g.fillStyle = p.col;
          g.save();
          g.translate(X, Y);
          g.rotate(p.rot);
          g.fillRect(-4 * u, -1.6 * u, 8 * u, 3.2 * u);
          g.restore();
        } else {
          Y = laneY(l) + (bY[l + 1] - bY[l]) * 0.22 + p.oy * u - (p.max - p.life) * 10 * u;
          g.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.55;
          g.fillStyle = p.col;
          g.beginPath();
          g.arc(X, Y, p.s * ppm * sc * (1 + (p.max - p.life) * 1.5), 0, TAU);
          g.fill();
        }
      }
      g.globalAlpha = 1;
    }

    function roundRect(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.lineTo(x + w - r, y);
      g.quadraticCurveTo(x + w, y, x + w, y + r);
      g.lineTo(x + w, y + h - r);
      g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      g.lineTo(x + r, y + h);
      g.quadraticCurveTo(x, y + h, x, y + h - r);
      g.lineTo(x, y + r);
      g.quadraticCurveTo(x, y, x + r, y);
      g.closePath();
    }

    function drawHud() {
      var pad = 8 * u + 4;
      g.textBaseline = 'middle';
      // dark band behind the bottom controls
      g.fillStyle = 'rgba(5,6,14,0.55)';
      g.fillRect(0, barTop - 6 * u, W, H - barTop + 6 * u);
      if (state === 'menu') return;
      // round pill (top-left)
      var rname = mode === 'duel' ? '2-player race' : ROUNDS[roundIdx].name;
      var rrule = mode === 'duel' ? (touchMode() ? 'P1 left pair · P2 right pair' : 'P1 A/D · P2 ←/→') : ROUNDS[roundIdx].id === 'record' ? 'Record ' + fmt2(save.record) : ROUNDS[roundIdx].rule;
      var pb = mode === 'duel' ? null : save.pb[ROUNDS[roundIdx].id];
      g.font = fontM;
      var w1 = g.measureText(rname).width;
      g.font = fontS;
      var line2 = rrule + (pb ? ' · PB ' + fmt2(pb) : '');
      var w2 = g.measureText(line2).width;
      var pw = Math.min(W * 0.62, Math.max(w1, w2) + 22 * u), ph = 40 * u + 8;
      g.fillStyle = 'rgba(5,6,14,0.62)';
      roundRect(pad, pad, pw, ph, 12 * u);
      g.fill();
      g.textAlign = 'left';
      g.font = fontM;
      g.fillStyle = '#fff';
      g.fillText(rname, pad + 11 * u, pad + ph * 0.32);
      g.font = fontS;
      g.fillStyle = '#c4c8ea';
      g.fillText(line2, pad + 11 * u, pad + ph * 0.72, pw - 18 * u);
      // race clock (top-centre on landscape, under the pill on portrait)
      g.font = fontClock;
      var me = humans[0];
      var clock = (mode !== 'duel' && me && me.finish != null ? me.finish : raceT).toFixed(2);
      var cw = g.measureText('00.00').width + 24 * u;
      var cx = W / 2, cy = portrait ? pad + ph + 26 * u : pad + 20 * u;
      g.fillStyle = 'rgba(5,6,14,0.7)';
      roundRect(cx - cw / 2, cy - 19 * u, cw, 38 * u, 10 * u);
      g.fill();
      g.textAlign = 'center';
      g.fillStyle = state === 'race' || state === 'done' ? '#fbbf24' : '#9aa0c8';
      g.fillText(clock, cx, cy + 1);
      // progress bar of the 100 m with a dot per runner
      var pbY = portrait ? pad + ph + 64 * u : pad + 52 * u;
      var pbX0 = portrait ? pad : W * 0.3, pbX1 = portrait ? W - pad : W * 0.7;
      g.fillStyle = 'rgba(5,6,14,0.55)';
      roundRect(pbX0 - 6 * u, pbY - 7 * u, pbX1 - pbX0 + 12 * u, 14 * u, 7 * u);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(pbX0, pbY - 1, pbX1 - pbX0, 2);
      g.fillStyle = '#fff';
      g.fillRect(pbX1 - 1, pbY - 6 * u, 2, 12 * u);
      for (var i = 0; i < runners.length; i++) {
        var rn = runners[i];
        if (rn.human >= 0) continue;
        g.fillStyle = rn.kit;
        g.beginPath();
        g.arc(lerp(pbX0, pbX1, clamp(rn.x / DIST, 0, 1)), pbY, 3.5 * u, 0, TAU);
        g.fill();
      }
      for (var h = 0; h < humans.length; h++) {
        var hr = humans[h];
        g.fillStyle = hr.kit;
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(lerp(pbX0, pbX1, clamp(hr.x / DIST, 0, 1)), pbY, 5.5 * u, 0, TAU);
        g.fill();
        g.stroke();
      }
      drawControls();
      // banner (start commands, false start, photo finish)
      if (banner && (banner.t < 1.6 || state === 'marks' || state === 'set' || state === 'fstart' || state === 'intro')) {
        var a = state === 'race' || state === 'done' ? clamp(1.6 - banner.t, 0, 1) : 1;
        var sc = 1 + Math.max(0, 0.25 - banner.t) * 1.2;
        var by = portrait ? H * 0.3 : H * 0.3;
        g.globalAlpha = a;
        g.save();
        g.translate(W / 2, by);
        g.scale(sc, sc);
        g.font = fontXL;
        g.textAlign = 'center';
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillText(banner.text, 3, 3);
        g.fillStyle = banner.col;
        g.fillText(banner.text, 0, 0);
        g.restore();
        if (banner.sub) {
          g.font = fontM;
          g.textAlign = 'center';
          wrapText(banner.sub, W / 2, by + 34 * u, W * 0.9, 20 * u);
        }
        g.globalAlpha = 1;
      }
      if (!save.tutorial && (state === 'marks' || state === 'set') && mode !== 'duel') {
        g.font = fontS;
        g.textAlign = 'center';
        g.fillStyle = '#e5e7eb';
        g.fillText(touchMode() ? 'After the gun, tap the two buttons alternately' : 'After the gun, alternate ← → in an even rhythm', W / 2, portrait ? H * 0.38 : H * 0.4);
      }
    }

    function wrapText(text, x, y, maxW, lh) {
      var words = text.split(' '), line = '', yy = y;
      g.fillStyle = '#fff';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (g.measureText(test).width > maxW && line) {
          g.fillText(line, x, yy);
          line = words[i];
          yy += lh;
        } else line = test;
      }
      if (line) g.fillText(line, x, yy);
    }

    function drawControls() {
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i], rn = humans[b.p];
        var expect = rn && rn.started && rn.finish == null && rn.lastSide !== b.side && rn.stumbleT <= 0;
        var lit = b.down;
        g.fillStyle = lit > 0 ? 'rgba(45,212,240,' + (0.35 + lit * 0.45) + ')' : expect ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)';
        roundRect(b.x, b.y, b.w, b.h, 14 * u);
        g.fill();
        g.strokeStyle = expect ? 'rgba(45,212,240,0.9)' : 'rgba(255,255,255,0.25)';
        g.lineWidth = expect ? 3 : 1.5;
        g.stroke();
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.font = '900 ' + Math.round(Math.min(b.h * 0.5, b.w * 0.45)) + 'px ' + FONT;
        g.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 2);
      }
      // speed + rhythm meters between the buttons
      for (var h = 0; h < humans.length; h++) {
        var rn2 = humans[h];
        var x0, x1;
        if (mode === 'duel') {
          var inner0 = buttons[1].x + buttons[1].w + 10 * u, inner1 = buttons[2].x - 10 * u, mid = (inner0 + inner1) / 2;
          x0 = h === 0 ? inner0 : mid + 6 * u;
          x1 = h === 0 ? mid - 6 * u : inner1;
        } else {
          x0 = buttons[0].x + buttons[0].w + 14 * u;
          x1 = buttons[1].x - 14 * u;
        }
        var w = x1 - x0;
        if (w < 40) continue;
        var top = barTop + 2 * u, bh = H - barTop - 8 * u - 4;
        var kmh = Math.round(rn2.v * 3.6);
        g.textAlign = 'left';
        g.font = fontL;
        g.fillStyle = '#fff';
        var kmStr = '' + kmh;
        g.fillText(kmStr, x0, top + bh * 0.3);
        var kw = g.measureText(kmStr).width;
        g.font = fontS;
        g.fillStyle = '#9aa0c8';
        g.fillText(' km/h', x0 + kw, top + bh * 0.33);
        g.textAlign = 'right';
        g.fillStyle = '#c4c8ea';
        var cad = rn2.started && rn2.finish == null ? rn2.cad : 0;
        if (w > 150) g.fillText(cad.toFixed(1) + ' steps/s', x1, top + bh * 0.33);
        // rhythm bar
        var rq = rn2.started && rn2.finish == null ? clamp(1 - rn2.rhythm * 1.6, 0, 1) : 0;
        var barY = top + bh * 0.62, barH = Math.max(8, bh * 0.2);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        roundRect(x0, barY, w, barH, barH / 2);
        g.fill();
        g.fillStyle = rq > 0.7 ? '#34d399' : rq > 0.4 ? '#fbbf24' : '#f87171';
        if (rq > 0.02) {
          roundRect(x0, barY, Math.max(barH, w * rq), barH, barH / 2);
          g.fill();
        }
        g.font = '800 ' + Math.round(Math.max(9, barH * 0.75)) + 'px ' + FONT;
        g.textAlign = 'center';
        g.fillStyle = '#05060e';
        if (rq > 0.3) g.fillText('RHYTHM', x0 + (w * rq) / 2, barY + barH / 2 + 1);
        else {
          g.fillStyle = '#c4c8ea';
          g.fillText('RHYTHM', x0 + w / 2, barY + barH / 2 + 1);
        }
        if (mode === 'duel') {
          g.fillStyle = rn2.kit;
          g.font = fontS;
          g.textAlign = h === 0 ? 'left' : 'right';
          g.fillText('P' + (h + 1), h === 0 ? x0 : x1, top + bh * 0.95);
        }
      }
    }

    /* ------------------------------------------------------------ */
    /* Input                                                         */
    /* ------------------------------------------------------------ */
    function buttonPress(b) {
      b.down = 1;
      press(b.p, b.side);
    }

    function onPointerDown(e) {
      ctx.focus();
      if (state === 'menu' || state === 'results' || state === 'paused') return;
      e.preventDefault();
      var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      var hit = null;
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        if (x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 10 && y <= b.y + b.h + 6) hit = b;
      }
      if (!hit && mode !== 'duel') {
        // anywhere on the left / right half also works in 1-player mode
        hit = x < W / 2 ? buttons[0] : buttons[1];
      }
      if (hit) buttonPress(hit);
    }

    var KEYMAP_1P = { ArrowLeft: [0, 0], KeyA: [0, 0], ArrowRight: [0, 1], KeyD: [0, 1] };
    var KEYMAP_2P = { KeyA: [0, 0], KeyD: [0, 1], ArrowLeft: [1, 0], ArrowRight: [1, 1] };
    ctx.captureKeys(['KeyA', 'KeyD', 'KeyP', 'Enter']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (state === 'menu') {
        if (code === 'Enter' || code === 'Space') { mode = 'career'; roundIdx = 0; setupRace(); }
        return;
      }
      if (state === 'results') {
        if ((code === 'Enter' || code === 'Space') && overlay) {
          var btn = overlay.el.querySelector('.ig-btn');
          if (btn) btn.click();
        }
        return;
      }
      if (state === 'paused') {
        if (code === 'KeyP' || code === 'Escape' || code === 'Enter' || code === 'Space') resumeGame();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') { openPause(); return; }
      var m = (mode === 'duel' ? KEYMAP_2P : KEYMAP_1P)[code];
      if (m) {
        keyboardUsed = true;
        for (var i = 0; i < buttons.length; i++) if (buttons[i].p === m[0] && buttons[i].side === m[1]) buttons[i].down = 1;
        press(m[0], m[1]);
      }
    });

    on(canvas, 'pointerdown', onPointerDown);
    on(root, 'pointerdown', function (e) { if (e.pointerType === 'touch' || e.pointerType === 'pen') touchSeen = true; }, true);
    on(canvas, 'contextmenu', function (e) { e.preventDefault(); });
    on(pauseBtn, 'click', function (e) { e.stopPropagation(); sfx('click'); openPause(); });
    on(pauseBtn, 'pointerdown', function (e) { e.stopPropagation(); });

    var loop = IGAME.loop(function (dt) {
      update(dt);
      draw();
    });

    layout();
    showMenu();
    loop.start();
    if (ctx.debug) {
      window.__sprint = {
        get state() { return state; },
        get runners() { return runners; },
        info: function () {
          return JSON.stringify({ state: state, mode: mode, round: roundIdx, t: +raceT.toFixed(2), humans: humans.map(function (h) { return { x: +h.x.toFixed(1), v: +h.v.toFixed(2), cad: +h.cad.toFixed(1), rh: +h.rhythm.toFixed(2), fin: h.finish, react: h.react, place: h.place, dq: h.dq }; }) });
        },
        skipToGun: function () { if (state === 'intro' || state === 'marks' || state === 'set') setState('race'); },
      };
    }

    return {
      pause: function () {
        if (state !== 'menu' && state !== 'results' && state !== 'paused') openPause();
        loop.stop();
      },
      resume: function () { loop.start(); },
      destroy: function () {
        loop.stop();
        closeOverlay();
        for (var i = 0; i < listeners.length; i++) listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]);
        listeners.length = 0;
        view.destroy();
        if (pauseBtn.parentNode) pauseBtn.parentNode.removeChild(pauseBtn);
        if (style.parentNode) style.parentNode.removeChild(style);
        if (ctx.debug) try { delete window.__sprint; } catch (e) {}
      },
    };
  });
})();
