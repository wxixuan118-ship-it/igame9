/*!
 * igame9 — "void-runner" engine
 * Pseudo-3D space-tunnel runner. The runner jogs forward through a floating
 * polygonal tunnel (4–8 sides) made of tiles; tiles can be missing. Moving
 * off the edge of the current floor onto a side wall rotates gravity so that
 * wall becomes the new floor (the camera rolls with it). Falling through a
 * hole into space ends the run.
 *
 * Modes: Levels (10 seeded, hand-scripted tunnels with a finish gate) and
 * Endless (procedural, speeds up, tunnel shape changes every section).
 *
 * Geometry: the tunnel axis is +z. A cross-section is a regular N-gon with
 * apothem APO. Wall i has outward direction d(phi_i) = (sin phi, -cos phi),
 * phi_i = i·2π/N (wall 0 is the starting floor). Runner position on wall w:
 * P = c_w + t_w·u + n_w·h  (u = along the wall, h = height above it).
 */
(function () {
  'use strict';

  var PI = Math.PI, TAU = PI * 2;
  var APO = 2.5, L = 1.4, NEAR = 0.25, VIEW = 62;
  var CAM_BACK = 5.5, CAM_H = 2.0, PITCH = 0.1, RSCALE = 0.8;
  var G = 19, JUMP_V = 6.6, MOVE = 4.8;
  var BODY = 0.95;

  var PALS = [
    { tile: '#16233f', crumble: '#5a2338', edge: '#4de8ff', glow: 'rgba(77,232,255,0.22)', cell: '#dfff4f', neb: 'rgba(80,120,255,0.20)' },
    { tile: '#251640', crumble: '#5a2030', edge: '#ff5ad9', glow: 'rgba(255,90,217,0.22)', cell: '#7dffcf', neb: 'rgba(200,80,255,0.20)' },
    { tile: '#0f2e2a', crumble: '#5a2420', edge: '#5dff9d', glow: 'rgba(93,255,157,0.2)', cell: '#ffd84d', neb: 'rgba(60,220,160,0.16)' },
    { tile: '#2e2210', crumble: '#5a2028', edge: '#ffb84d', glow: 'rgba(255,184,77,0.22)', cell: '#7de0ff', neb: 'rgba(255,150,60,0.16)' },
    { tile: '#1b1b38', crumble: '#5a2338', edge: '#a78bfa', glow: 'rgba(167,139,250,0.24)', cell: '#ffe46b', neb: 'rgba(140,110,255,0.2)' },
  ];

  // Level scripts: [code, rows, param]
  // f full · s scatter(p) · g ring gap · a alternate walls out · t stripes(mode)
  // p spiral(step) · c checker · k crumble(scatter p)
  var LEVELS = [
    { name: 'Launch Pad', n: 4, v: 7, pal: 0, seed: 11, s: [['f', 22], ['s', 18, 0.07], ['f', 6], ['g', 1], ['f', 8], ['s', 18, 0.12], ['f', 6], ['g', 2], ['f', 8], ['s', 16, 0.15], ['f', 12]] },
    { name: 'Side Step', n: 4, v: 7.5, pal: 1, seed: 23, s: [['f', 16], ['a', 12], ['f', 6], ['s', 16, 0.15], ['f', 5], ['a', 16], ['f', 6], ['g', 2], ['f', 6], ['s', 16, 0.18], ['f', 12]] },
    { name: 'Gap Hopper', n: 4, v: 8, pal: 2, seed: 37, s: [['f', 14], ['g', 2], ['f', 5], ['g', 2], ['f', 5], ['g', 3], ['f', 6], ['s', 18, 0.2], ['f', 5], ['g', 2], ['f', 3], ['g', 2], ['f', 8], ['s', 16, 0.22], ['f', 12]] },
    { name: 'Hex Station', n: 6, v: 8, pal: 3, seed: 41, s: [['f', 16], ['s', 16, 0.15], ['f', 5], ['a', 14], ['f', 5], ['g', 2], ['f', 6], ['t', 14, 0], ['f', 6], ['s', 18, 0.22], ['f', 12]] },
    { name: 'Crumble Way', n: 4, v: 8.5, pal: 4, seed: 53, s: [['f', 14], ['k', 16, 0], ['f', 5], ['k', 16, 0.12], ['f', 4], ['g', 2], ['f', 5], ['k', 20, 0.15], ['f', 12]] },
    { name: 'Spiral Arm', n: 6, v: 8.5, pal: 0, seed: 67, s: [['f', 14], ['p', 30, 4], ['f', 6], ['s', 14, 0.2], ['f', 4], ['p', 30, 3], ['f', 12]] },
    { name: 'Checker Run', n: 4, v: 9, pal: 1, seed: 71, s: [['f', 14], ['c', 12], ['f', 6], ['s', 16, 0.25], ['f', 4], ['c', 14], ['f', 4], ['g', 3], ['f', 6], ['t', 14, 2], ['f', 12]] },
    { name: 'Pentagon Drift', n: 5, v: 9, pal: 2, seed: 83, s: [['f', 14], ['a', 14], ['f', 4], ['p', 26, 3], ['f', 4], ['k', 16, 0.2], ['f', 4], ['g', 2], ['f', 4], ['s', 18, 0.28], ['f', 12]] },
    { name: 'Octa Gauntlet', n: 8, v: 9.5, pal: 3, seed: 97, s: [['f', 14], ['s', 16, 0.25], ['f', 4], ['p', 30, 2], ['f', 4], ['a', 16], ['f', 4], ['c', 12], ['f', 4], ['g', 3], ['f', 12]] },
    { name: 'Void Core', n: 6, v: 10, pal: 4, seed: 101, s: [['f', 12], ['k', 14, 0.2], ['f', 3], ['p', 24, 2], ['f', 3], ['c', 12], ['f', 3], ['g', 3], ['f', 4], ['a', 14], ['f', 3], ['s', 20, 0.32], ['f', 12]] },
  ];
  var ENDLESS_SHAPES = [4, 6, 5, 4, 8, 6];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seeded(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function mod(a, n) { return ((a % n) + n) % n; }
  function mixHex(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var r = Math.round(((x >> 16) & 255) * (1 - t) + ((y >> 16) & 255) * t);
    var g2 = Math.round(((x >> 8) & 255) * (1 - t) + ((y >> 8) & 255) * t);
    var b2 = Math.round((x & 255) * (1 - t) + (y & 255) * t);
    return 'rgb(' + r + ',' + g2 + ',' + b2 + ')';
  }
  // three lighting levels per palette: floor (lit), sides, ceiling
  PALS.forEach(function (pl) {
    pl.shade = [mixHex(pl.tile, '#ffffff', 0.2), mixHex(pl.tile, '#ffffff', 0.1), mixHex(pl.tile, '#000000', 0.05)];
    pl.shadeC = [mixHex(pl.crumble, '#ffffff', 0.18), mixHex(pl.crumble, '#ffffff', 0.08), pl.crumble];
  });
  function fmtInt(n) { return Math.floor(n).toLocaleString('en-US'); }

  var GEO = {};
  function geom(n) {
    if (GEO[n]) return GEO[n];
    var W = 2 * APO * Math.tan(PI / n);
    var K = n === 4 ? 5 : n === 5 ? 4 : n === 6 ? 3 : 2;
    var tw = W / K, walls = [];
    var bx = new Float32Array(n * (K + 1)), by = new Float32Array(n * (K + 1));
    for (var i = 0; i < n; i++) {
      var phi = (i * TAU) / n, dx = Math.sin(phi), dy = -Math.cos(phi);
      var w = { phi: phi, cx: APO * dx, cy: APO * dy, tx: Math.cos(phi), ty: Math.sin(phi), nx: -dx, ny: -dy };
      walls.push(w);
      for (var k = 0; k <= K; k++) {
        var u = -W / 2 + k * tw;
        bx[i * (K + 1) + k] = w.cx + w.tx * u;
        by[i * (K + 1) + k] = w.cy + w.ty * u;
      }
    }
    return (GEO[n] = { n: n, W: W, K: K, tw: tw, walls: walls, bx: bx, by: by, full: (1 << K) - 1 });
  }

  var CSS = [
    '.vr-hud{position:absolute;inset:0;pointer-events:none;z-index:4;font-family:var(--font);display:none}',
    '.vr-hud.on{display:block}',
    '.vr-tl{position:absolute;left:10px;top:10px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}',
    '.vr-tr{position:absolute;right:10px;top:10px;display:flex;gap:8px;align-items:center}',
    '.vr-hud .ig-pill{font-size:1em}',
    '.vr-main{font-size:1.2em!important}',
    '.vr-cell{display:inline-block;width:.7em;height:.95em;margin-right:6px;vertical-align:-.12em;border-radius:3px;background:linear-gradient(#f4ff9a,#c8f02a);box-shadow:0 0 8px rgba(220,255,80,.7)}',
    '.vr-prog{position:absolute;left:50%;top:14px;transform:translateX(-50%);width:min(34%,260px);height:8px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden}',
    '.vr-prog i{display:block;height:100%;width:100%;transform-origin:left center;background:linear-gradient(90deg,#4de8ff,#a78bfa)}',
    '.vr-pause{pointer-events:auto;cursor:pointer;width:2.6em;height:2.6em;display:grid;place-items:center;padding:0!important;color:#fff}',
    '.vr-pause svg{width:1em;height:1em}',
    '.vr-touch{position:absolute;left:0;right:0;bottom:0;display:none;justify-content:space-between;align-items:flex-end;padding:12px;pointer-events:none;z-index:5}',
    '.vr-touch.on{display:flex}',
    '.vr-tg{display:flex;gap:10px}',
    '.vr-tb{pointer-events:auto;width:64px;height:64px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(10,14,40,.45);color:#fff;display:grid;place-items:center;touch-action:none;-webkit-user-select:none;user-select:none}',
    '.vr-tb.on{background:rgba(77,232,255,.35)}',
    '.vr-tb svg{width:28px;height:28px}',
    '.vr-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 12px}',
    '.vr-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:6px 8px}',
    '.vr-stat b{display:block;font-size:20px;color:#fff;line-height:1.2}',
    '.vr-stat span{font-size:12px;color:var(--muted)}',
    '.vr-how{font-size:13px;color:var(--text-2);margin:0 0 12px}',
    '.vr-lv{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:0 0 14px}',
    '.vr-lvb{font:800 15px var(--font);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.07);padding:9px 0 7px;cursor:pointer;line-height:1.1;touch-action:manipulation}',
    '.vr-lvb small{display:block;font-size:10px;font-weight:700;color:var(--muted);margin-top:3px}',
    '.vr-lvb.done{border-color:rgba(93,255,157,.55)}',
    '.vr-lvb.done small{color:#5dff9d}',
    '.vr-lvb[disabled]{opacity:.35;cursor:not-allowed}',
    '.vr-new{display:inline-block;margin:0 0 10px;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,#fbbf24,#f97316);color:#1a1205;font-weight:900;font-size:13px}',
  ].join('\n');

  var SVG = {
    pause: '<svg viewBox="0 0 10 12"><rect x="1" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="6" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg>',
    L: '<svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    R: '<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    J: '<svg viewBox="0 0 24 24"><path d="M4 16 12 8l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  IGAME.register('void-runner', function (ctx) {
    var root = ctx.root, store = ctx.store;
    var destroyed = false;
    var R = Math.random;
    var AUTO = ctx.debug && ctx.params.get('auto') === '1', autoDir = 0;

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var VW = 1, VH = 1, F = 1, CX = 0, CY = 0, UI = 10, hud = null;
    var view = IGAME.createCanvas(root, { onResize: layout });
    var g = view.ctx, canvas = view.canvas;

    /* ---------- HUD + touch buttons ---------- */
    hud = IGAME.ui.el('div', 'vr-hud');
    hud.innerHTML =
      '<div class="vr-tl"><div class="ig-pill vr-main">Level 1</div><div class="ig-pill vr-cells"><i class="vr-cell"></i><span>0</span></div></div>' +
      '<div class="vr-prog"><i></i></div>' +
      '<div class="vr-tr"><button type="button" class="ig-pill vr-pause" aria-label="Pause">' + SVG.pause + '</button></div>';
    root.appendChild(hud);
    var hudMain = hud.querySelector('.vr-main'), hudCells = hud.querySelector('.vr-cells span');
    var hudProg = hud.querySelector('.vr-prog'), hudProgBar = hud.querySelector('.vr-prog i');
    var hudPause = hud.querySelector('.vr-pause');
    hudPause.addEventListener('click', onPauseBtn);
    function onPauseBtn(e) { e.stopPropagation(); if (state === 'play') pauseGame(); }

    var touchBar = IGAME.ui.el('div', 'vr-touch');
    touchBar.innerHTML = '<div class="vr-tg"><button type="button" class="vr-tb" data-b="L" aria-label="Move left">' + SVG.L + '</button><button type="button" class="vr-tb" data-b="R" aria-label="Move right">' + SVG.R + '</button></div><button type="button" class="vr-tb" data-b="J" aria-label="Jump">' + SVG.J + '</button>';
    root.appendChild(touchBar);
    var btnHold = { L: 0, R: 0, J: 0 };
    var tbs = touchBar.querySelectorAll('.vr-tb');
    function tbDown(e) {
      e.preventDefault(); e.stopPropagation();
      var b = e.currentTarget.getAttribute('data-b');
      btnHold[b] = 1;
      e.currentTarget.classList.add('on');
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {}
      if (b === 'J') pressJump();
    }
    function tbUp(e) {
      var b = e.currentTarget.getAttribute('data-b');
      btnHold[b] = 0;
      e.currentTarget.classList.remove('on');
    }
    Array.prototype.forEach.call(tbs, function (b) {
      b.addEventListener('pointerdown', tbDown);
      b.addEventListener('pointerup', tbUp);
      b.addEventListener('pointercancel', tbUp);
      b.addEventListener('lostpointercapture', tbUp);
    });

    function layout(w, h) {
      VW = w; VH = h;
      F = Math.min(w, h * 1.25) * 0.78;
      CX = w / 2;
      CY = h * 0.45;
      UI = Math.min(w, h);
      if (hud) hud.style.fontSize = clamp(Math.round(UI / 30), 12, 19) + 'px';
      var bs = clamp(Math.round(UI / 7), 52, 76);
      if (touchBar) Array.prototype.forEach.call(tbs, function (b) { b.style.width = b.style.height = bs + 'px'; });
    }

    /* ---------- persistence ---------- */
    var unlocked = clamp(store.get('unlocked', 0) | 0, 0, LEVELS.length - 1);
    var lvBest = store.get('lvBest', null);
    if (!lvBest || typeof lvBest !== 'object') lvBest = {};
    var bestDist = store.get('bestDist', 0) | 0;
    var totalCells = store.get('cells', 0) | 0;

    /* ---------- state ---------- */
    var state = 'menu'; // menu | play | paused | dying | won | over
    var mode = 'level', levelIdx = 0, lvl = LEVELS[0], pal = PALS[0];
    var time = 0, runT = 0, deathT = 0, overAt = 0;
    var rows = [], rowBase = 0, genRows = 0, finishZ = 1e9, cellsTotal = 0;
    var GEOc = geom(4);
    var crumbles = [];
    var p = { w: 0, u: 0, h: 0, vu: 0, vh: 0, z: 0, air: false, falling: false, coyote: 0, jumpHold: 0, phase: 0 };
    var speed = 7, cells = 0, endlessShape = 0, nextShapeAt = 0;
    var roll = 0, targetRoll = 0, camWX = 0, camWY = -APO + CAM_H, camZ = 0, shake = 0, flash = 0;
    var cR = 1, sR = 0, cP = Math.cos(PITCH), sP = Math.sin(PITCH), camX = 0, camY = 0;
    var overlay = null, overlayKind = '';
    var rng = seeded(1), aPar = 0;

    /* ------------------------------------------------------------------ */
    /* Tunnel generation                                                  */
    /* ------------------------------------------------------------------ */
    function newRow(n) {
      var ge = geom(n), m = new Uint8Array(n);
      for (var i = 0; i < n; i++) m[i] = ge.full;
      return { n: n, m: m, c: null, cells: null, fin: false };
    }
    function pushRow(r) { rows.push(r); genRows++; return r; }
    function placeCell(r, j) {
      // occasionally put a power cell on an existing, non-crumbling tile
      if (j % 4 !== 2 || rng() > 0.6) return;
      var ge = geom(r.n);
      for (var tries = 0; tries < 6; tries++) {
        var w = (rng() * r.n) | 0, k = (rng() * ge.K) | 0;
        if (r.m[w] & (1 << k) && !(r.c && r.c[w] & (1 << k))) {
          (r.cells || (r.cells = [])).push({ w: w, k: k, got: false });
          cellsTotal++;
          return;
        }
      }
    }
    // Append `count` rows of pattern `code` with tunnel shape n
    function pattern(code, count, prm, n) {
      var ge = geom(n), K = ge.K, full = ge.full, off = (rng() * n) | 0, j, i, k, r;
      if (code === 'a') { off = aPar; aPar ^= 1; } // first time the floor drops away, next time the side walls
      for (j = 0; j < count; j++) {
        r = newRow(n);
        switch (code) {
          case 's':
            for (i = 0; i < n; i++) for (k = 0; k < K; k++) if (rng() < prm) r.m[i] &= ~(1 << k);
            break;
          case 'g':
            for (i = 0; i < n; i++) r.m[i] = 0;
            break;
          case 'a':
            for (i = 0; i < n; i++) if ((i + off) % 2 === 0 && !(n % 2 === 1 && i === mod(off - 1, n))) r.m[i] = 0;
            break;
          case 't':
            for (i = 0; i < n; i++) {
              var keep = 0;
              for (k = 0; k < K; k++) {
                if (prm === 0 && (k === (K >> 1) || (K % 2 === 0 && k === K / 2 - 1))) keep |= 1 << k;
                if (prm === 2 && (k + i) % 2 === 0) keep |= 1 << k;
              }
              r.m[i] = keep || 1;
            }
            break;
          case 'p': {
            var band = mod(off + Math.floor(j / prm), n);
            r.m[band] = 0;
            break;
          }
          case 'c':
            for (i = 0; i < n; i++) for (k = 0; k < K; k++) if ((k + i + Math.floor(j / (K <= 3 ? 3 : 2))) % 2 === 0) r.m[i] &= ~(1 << k);
            break;
          case 'k':
            r.c = new Uint8Array(n);
            for (i = 0; i < n; i++) {
              r.c[i] = full;
              for (k = 0; k < K; k++) if (rng() < prm) r.m[i] &= ~(1 << k);
            }
            break;
        }
        if (code !== 'f' && code !== 'g') placeCell(r, j);
        else if (code === 'f' && genRows > 10) placeCell(r, j + 2);
        pushRow(r);
      }
    }

    function buildLevel(idx) {
      rows.length = 0; rowBase = 0; genRows = 0; cellsTotal = 0; crumbles.length = 0; aPar = 0;
      lvl = LEVELS[idx];
      pal = PALS[lvl.pal];
      rng = seeded(lvl.seed);
      var sc = lvl.s;
      for (var i = 0; i < sc.length; i++) pattern(sc[i][0], sc[i][1], sc[i][2], lvl.n);
      finishZ = (genRows - 10) * L;
      rows[genRows - 10].fin = true;
      // a short run-out after the gate
      for (var j = 0; j < 30; j++) pushRow(newRow(lvl.n));
    }

    function startEndless() {
      rows.length = 0; rowBase = 0; genRows = 0; cellsTotal = 0; crumbles.length = 0;
      rng = seeded((Math.random() * 1e9) | 0);
      pal = PALS[0];
      endlessShape = 0;
      nextShapeAt = 170;
      finishZ = 1e9;
      pattern('f', 24, 0, ENDLESS_SHAPES[0]);
    }
    function endlessGen() {
      // keep ~VIEW+20 units generated ahead of the camera
      while ((rowBase + rows.length) * L < camZ + VIEW + 25) {
        var n = ENDLESS_SHAPES[endlessShape % ENDLESS_SHAPES.length];
        if (genRows >= nextShapeAt) {
          // new section: jump the gap into a differently shaped tunnel
          pattern('f', 4, 0, n);
          pattern('g', 3, 0, n);
          endlessShape++;
          n = ENDLESS_SHAPES[endlessShape % ENDLESS_SHAPES.length];
          pal = PALS[endlessShape % PALS.length];
          pattern('f', 6, 0, n);
          nextShapeAt = genRows + 150;
          continue;
        }
        var d = clamp(genRows / 1400, 0, 1);
        var pick = rng(), cnt = 10 + ((rng() * 10) | 0);
        if (pick < 0.3) pattern('s', cnt, 0.08 + d * 0.24, n);
        else if (pick < 0.42) { pattern('g', 1 + ((rng() * (1 + d * 2.2)) | 0), 0, n); }
        else if (pick < 0.54) pattern('a', cnt, 0, n);
        else if (pick < 0.64) pattern('p', 20 + ((rng() * 10) | 0), Math.max(2, 4 - Math.round(d * 2)), n);
        else if (pick < 0.73) pattern('k', cnt, 0.05 + d * 0.15, n);
        else if (pick < 0.82 && d > 0.15) pattern('c', 10 + ((rng() * 6) | 0), 0, n);
        else if (pick < 0.9) pattern('t', cnt, rng() < 0.5 ? 0 : 2, n);
        else pattern('s', cnt, 0.12 + d * 0.2, n);
        pattern('f', Math.max(2, 6 - Math.round(d * 4)), 0, n);
      }
      // drop rows far behind
      var behind = Math.floor((camZ - 4) / L) - rowBase;
      if (behind > 40) { rows.splice(0, behind); rowBase += behind; }
    }

    function rowAt(z) {
      var i = Math.floor(z / L) - rowBase;
      return i >= 0 && i < rows.length ? rows[i] : null;
    }
    function tileAt(z, w, u) {
      var r = rowAt(z);
      if (!r || r.n !== GEOc.n) return 0;
      var k = Math.floor((u + GEOc.W / 2) / GEOc.tw);
      if (k < 0 || k >= GEOc.K) return 0;
      return r.m[w] & (1 << k) ? (r.c && r.c[w] & (1 << k) ? 2 : 1) : 0;
    }

    /* ------------------------------------------------------------------ */
    /* Run control                                                        */
    /* ------------------------------------------------------------------ */
    function resetRunner(n) {
      GEOc = geom(n);
      p.w = 0; p.u = 0; p.h = 0; p.vu = 0; p.vh = 0; p.z = 1.5; p.air = false; p.falling = false; p.coyote = 0; p.jumpHold = 0;
      roll = targetRoll = 0; camWX = 0; camWY = -APO + CAM_H; camZ = p.z - CAM_BACK;
      cells = 0; runT = 0; deathT = 0; shake = 0; flash = 0;
      for (var i = 0; i < parts.length; i++) parts[i].on = false;
    }
    function startLevel(idx) {
      closeOverlay();
      mode = 'level'; levelIdx = idx;
      buildLevel(idx);
      resetRunner(lvl.n);
      speed = lvl.v;
      state = 'play';
      ctx.sfx('boost');
      ctx.focus();
      hudLast = '';
      toast('Level ' + (idx + 1) + ': ' + lvl.name);
    }
    function startEndlessRun() {
      closeOverlay();
      mode = 'endless';
      startEndless();
      resetRunner(ENDLESS_SHAPES[0]);
      speed = 7;
      endlessGen();
      state = 'play';
      ctx.sfx('boost');
      ctx.focus();
      hudLast = '';
      toast('Endless — how far can you go?');
    }
    function retry() { if (mode === 'level') startLevel(levelIdx); else startEndlessRun(); }

    /* ------------------------------------------------------------------ */
    /* Input                                                              */
    /* ------------------------------------------------------------------ */
    var ptrs = {}; // pointerId → {side, x, y, jumped}
    function pressJump() {
      if (state !== 'play') return;
      if (p.falling) return;
      if (!p.air || p.coyote > 0) {
        p.air = true; p.vh = JUMP_V; p.coyote = 0; p.jumpHold = 0.26;
        ctx.sfx('jump');
        emitAtRunner(6, pal.edge, 0.6);
      }
    }
    function onDown(e) {
      if (e.cancelable) e.preventDefault();
      var r = canvas.getBoundingClientRect();
      ptrs[e.pointerId] = { side: e.clientX - r.left < r.width / 2 ? -1 : 1, x: e.clientX, y: e.clientY, jumped: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    }
    function onMove(e) {
      var q = ptrs[e.pointerId];
      if (!q) return;
      var dy = e.clientY - q.y;
      if (!q.jumped && dy < -Math.max(18, UI * 0.05) && Math.abs(dy) > Math.abs(e.clientX - q.x)) {
        q.jumped = true;
        q.side = 0; // a swipe-up is a jump, not a move
        pressJump();
      }
    }
    function onUp(e) { delete ptrs[e.pointerId]; }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP']);
    ctx.onKey(function (code, down, e) {
      if (destroyed || !down) return;
      if (state === 'play') {
        if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') pressJump();
        else if (code === 'KeyP' || code === 'Escape') pauseGame();
      } else if (state === 'paused') {
        if (code === 'KeyP' || code === 'Escape' || code === 'Space' || code === 'Enter') resumeGame();
      } else if (code === 'Space' || code === 'Enter') {
        if (code === 'Enter' && e && e.target && e.target.tagName === 'BUTTON') return;
        if (time - overAt < 0.5) return;
        if (overlayKind === 'title') startLevel(Math.min(unlocked, LEVELS.length - 1));
        else if (overlayKind === 'over') retry();
        else if (overlayKind === 'won') { if (levelIdx + 1 < LEVELS.length) startLevel(levelIdx + 1); else showLevels(); }
      }
    });
    function inputDir() {
      var k = ctx.keys, d = 0;
      if (k.ArrowLeft || k.KeyA || btnHold.L) d -= 1;
      if (k.ArrowRight || k.KeyD || btnHold.R) d += 1;
      for (var id in ptrs) d += ptrs[id].side;
      if (AUTO) d = autoDir;
      return clamp(d, -1, 1);
    }
    function jumpHeld() {
      var k = ctx.keys;
      return !!(k.ArrowUp || k.KeyW || k.Space || btnHold.J);
    }

    /* ------------------------------------------------------------------ */
    /* Update                                                             */
    /* ------------------------------------------------------------------ */
    function update(dt) {
      time += dt;
      if (state === 'play') stepPlay(dt);
      else if (state === 'dying') stepDying(dt);
      else if (state === 'menu') { p.z += dt * 3; roll += dt * 0.12; targetRoll = roll; updateCamera(dt); if (mode === 'endless') endlessGen(); }
      if (state !== 'paused') {
        stepParticles(dt);
        stepStars(dt);
        if (shake > 0) shake = Math.max(0, shake - dt * 2);
        if (flash > 0) flash = Math.max(0, flash - dt * 2.5);
      }
    }

    function wallPos(w, u, h) {
      var wl = GEOc.walls[w];
      PX2 = wl.cx + wl.tx * u + wl.nx * h;
      PY2 = wl.cy + wl.ty * u + wl.ny * h;
    }
    var PX2 = 0, PY2 = 0;

    // Debug autopilot (?debug=1&auto=1) used to check that tunnels are beatable:
    // steer toward the nearest ring position whose next rows are solid, jump holes.
    function autopilot() {
      var ge = GEOc, K = ge.K;
      var i0 = Math.floor(p.z / L) - rowBase, frac = p.z / L - Math.floor(p.z / L);
      var k0 = clamp(Math.floor((p.u + ge.W / 2) / ge.tw), 0, K - 1), q0 = p.w * K + k0;
      function solid(q, a, b) {
        var w = mod(Math.floor(q / K), ge.n), k = mod(q, K);
        for (var i = i0 + a; i <= i0 + b; i++) { var r = rows[i]; if (!r || r.n !== ge.n || !(r.m[w] & (1 << k))) return false; }
        return true;
      }
      var tu = -ge.W / 2 + (k0 + 0.5) * ge.tw, d;
      var centre = Math.abs(p.u - tu) > 0.12 ? (tu > p.u ? 1 : -1) : 0;
      if (p.air) {
        // steer toward a column that is solid where we will land
        for (d = 0; d <= 3; d++) {
          if (solid(q0 + d, 1, 3)) { autoDir = d ? 1 : centre; return; }
          if (solid(q0 - d, 1, 3)) { autoDir = -1; return; }
        }
        autoDir = centre;
        return;
      }
      if (solid(q0, 0, 3)) { autoDir = centre; return; }
      for (d = 1; d <= 5; d++) {
        var need = d <= 2 ? 3 : 7;
        if (solid(q0 + d, 0, need)) { autoDir = 1; break; }
        if (solid(q0 - d, 0, need)) { autoDir = -1; break; }
      }
      if (d > 5) autoDir = centre;
      if ((!solid(q0, 1, 1) && frac > 0.35 && d > 2) || !solid(q0, 0, 0)) pressJump();
    }

    function stepPlay(dt) {
      runT += dt;
      if (AUTO) autopilot();
      if (mode === 'endless') speed = 7 + 7 * (1 - Math.exp(-p.z / 1600));
      p.z += speed * dt;
      p.phase += speed * dt * 2.2;
      // section with a different tunnel shape (endless): re-map onto the new polygon
      var rr = rowAt(p.z);
      if (rr && rr.n !== GEOc.n) switchShape(rr.n);
      // lateral
      var dir = inputDir();
      p.vu += (dir * MOVE - p.vu) * Math.min(1, dt * 14);
      p.u += p.vu * dt;
      if (!p.falling) wallCheck();
      // vertical
      if (p.jumpHold > 0) p.jumpHold -= dt;
      var holdLow = p.jumpHold > 0 && p.vh > 0 && jumpHeld();
      var under = tileAt(p.z, p.w, p.u);
      if (p.air || p.falling) {
        p.vh -= G * dt * (holdLow ? 0.5 : 1);
        p.h += p.vh * dt;
        if (p.coyote > 0) p.coyote -= dt;
        if (!p.falling && p.h <= 0) {
          if (under) {
            p.h = 0; p.vh = 0; p.air = false;
            emitAtRunner(5, pal.edge, 0.4);
            ctx.sfx({ f: 180, f2: 90, d: 0.06, type: 'triangle', v: 0.06 });
          } else if (p.h < -0.18) p.falling = true;
        }
      } else if (!under) {
        p.air = true; p.vh = 0; p.coyote = 0.09;
      }
      if (!p.air && under === 2) triggerCrumble();
      if (p.falling && p.h < -0.5) { die(); return; }
      // crumbling tiles
      for (var i = crumbles.length - 1; i >= 0; i--) {
        var c = crumbles[i];
        c.t -= dt;
        if (c.t <= 0) { c.row.m[c.w] &= ~c.bit; crumbles.splice(i, 1); }
      }
      collectCells();
      // camera
      updateCamera(dt);
      if (mode === 'endless') endlessGen();
      else if (p.z >= finishZ) win();
    }

    // Moving past a wall edge onto a neighbouring wall rotates gravity.
    function wallCheck() {
      var ge = GEOc, half = ge.W / 2;
      if (p.u > -half && p.u < half && p.h >= 0) return;
      wallPos(p.w, p.u, p.h);
      var bestJ = -1, bestH = 0.04;
      for (var j = 0; j < ge.n; j++) {
        if (j === p.w) continue;
        var wl = ge.walls[j];
        var hh = (PX2 - wl.cx) * wl.nx + (PY2 - wl.cy) * wl.ny;
        if (hh < bestH) { bestH = hh; bestJ = j; }
      }
      if (bestJ < 0) { p.u = clamp(p.u, -half - 0.6, half + 0.6); return; }
      var nw = ge.walls[bestJ];
      var nu = (PX2 - nw.cx) * nw.tx + (PY2 - nw.cy) * nw.ty;
      // shortest signed wall step for the camera roll
      var step = mod(bestJ - p.w + ge.n / 2, ge.n) - ge.n / 2;
      targetRoll += step * (TAU / ge.n);
      p.w = bestJ;
      p.u = clamp(nu, -half, half);
      if (p.h > 0.05 || p.air) { p.air = false; p.vh = 0; }
      p.h = 0;
      ctx.sfx({ f: 420, f2: 840, d: 0.12, type: 'sine', v: 0.06 });
      emitAtRunner(8, pal.edge, 0.5);
    }

    function switchShape(n) {
      var oldStep = TAU / GEOc.n;
      var ang = targetRoll;
      GEOc = geom(n);
      var stepN = TAU / n;
      var idx = Math.round(ang / stepN);
      targetRoll = idx * stepN;
      roll += 0; // roll eases toward the new target
      p.w = mod(idx, n);
      p.u = clamp(p.u, -GEOc.W / 2 + 0.2, GEOc.W / 2 - 0.2);
      void oldStep;
    }

    function triggerCrumble() {
      var i = Math.floor(p.z / L) - rowBase, r = rows[i];
      if (!r || !r.c) return;
      var k = Math.floor((p.u + GEOc.W / 2) / GEOc.tw), bit = 1 << k;
      if (!(r.c[p.w] & bit) || r.crTrig && r.crTrig[p.w] & bit) return;
      (r.crTrig || (r.crTrig = new Uint8Array(r.n)))[p.w] |= bit;
      crumbles.push({ row: r, w: p.w, bit: bit, t: 0.32 });
      if (R() < 0.5) ctx.sfx({ f: 140, d: 0.05, type: 'square', v: 0.03 });
    }

    function collectCells() {
      var i0 = Math.floor(p.z / L) - rowBase;
      wallPos(p.w, p.u, p.h + BODY * 0.5);
      var rx = PX2, ry = PY2;
      for (var i = i0 - 1; i <= i0 + 1; i++) {
        var r = rows[i];
        if (!r || !r.cells || r.n !== GEOc.n) continue;
        for (var j = 0; j < r.cells.length; j++) {
          var c = r.cells[j];
          if (c.got) continue;
          var zc = (i + rowBase + 0.5) * L;
          if (Math.abs(zc - p.z) > 0.8) continue;
          var wl = GEOc.walls[c.w], u = -GEOc.W / 2 + (c.k + 0.5) * GEOc.tw;
          var cx = wl.cx + wl.tx * u + wl.nx * 0.55, cy = wl.cy + wl.ty * u + wl.ny * 0.55;
          if ((cx - rx) * (cx - rx) + (cy - ry) * (cy - ry) < 0.75) {
            c.got = true;
            cells++;
            ctx.sfx('coin');
            emitAtRunner(7, pal.cell, 0.5);
          }
        }
      }
    }

    // The camera sits above the current floor (following the runner sideways a
    // little). It is smoothed in world space so wall switches never jump.
    function updateCamera(dt) {
      if (state !== 'menu') roll += (targetRoll - roll) * (1 - Math.exp(-dt * 9));
      var ct = Math.cos(targetRoll), st = Math.sin(targetRoll);
      var lx = (state === 'menu' ? 0 : p.u) * 0.55, ly = -APO + CAM_H;
      var tx = lx * ct - ly * st, ty = lx * st + ly * ct;
      var k = state === 'menu' ? 1 : 1 - Math.exp(-dt * 8);
      camWX += (tx - camWX) * k;
      camWY += (ty - camWY) * k;
      camZ = p.z - CAM_BACK;
    }

    function die() {
      if (state !== 'play') return;
      state = 'dying';
      deathT = 0;
      ctx.sfx('lose');
      shake = 0.3;
    }
    function stepDying(dt) {
      deathT += dt;
      p.vh -= G * dt;
      p.h += p.vh * dt;
      p.z += speed * dt * 0.6;
      p.phase += dt * 6;
      roll += (targetRoll - roll) * (1 - Math.exp(-dt * 9));
      camZ += speed * dt * 0.25;
      if (deathT > 1.3) gameOver();
    }
    function win() {
      state = 'won';
      overAt = time;
      flash = 0.8;
      ctx.sfx('win');
      var key = String(levelIdx), prev = lvBest[key];
      var first = prev == null;
      if (prev == null || cells > prev) lvBest[key] = cells;
      store.set('lvBest', lvBest);
      if (levelIdx + 1 > unlocked && levelIdx + 1 < LEVELS.length) { unlocked = levelIdx + 1; store.set('unlocked', unlocked); }
      totalCells += cells;
      store.set('cells', totalCells);
      showWon(first);
    }
    function gameOver() {
      state = 'over';
      overAt = time;
      totalCells += cells;
      store.set('cells', totalCells);
      var dist = Math.floor(p.z), isBest = false;
      if (mode === 'endless' && dist > bestDist) { bestDist = dist; isBest = true; store.set('bestDist', bestDist); }
      showOver(dist, isBest);
    }

    /* ------------------------------------------------------------------ */
    /* Projection                                                         */
    /* ------------------------------------------------------------------ */
    var SX = 0, SY = 0, SZ = 0;
    // world cross-section (x, y) at depth z → screen. false if behind the near plane
    function proj(x, y, z) {
      var xr = x * cR + y * sR, yr = -x * sR + y * cR;
      var X = xr - camX, Y = yr - camY, Z = z - camZ;
      var Y2 = Y * cP + Z * sP, Z2 = -Y * sP + Z * cP;
      SZ = Z2;
      if (Z2 < NEAR) return false;
      SX = CX + (X * F) / Z2;
      SY = CY - (Y2 * F) / Z2;
      return true;
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                          */
    /* ------------------------------------------------------------------ */
    var stars = [];
    for (var si = 0; si < 170; si++) stars.push({ a: R() * TAU, r: R(), s: 0.6 + R() * 1.6, tw: R() * 6 });
    function stepStars(dt) {
      var v = state === 'play' ? speed : 3;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        st.r += dt * v * 0.004 * (0.3 + st.r);
        if (st.r > 1) { st.r = 0.02 + R() * 0.1; st.a = R() * TAU; }
      }
    }
    var SXa = new Float32Array(9 * 9), SYa = new Float32Array(9 * 9), SXb = new Float32Array(9 * 9), SYb = new Float32Array(9 * 9);
    var OKa = new Uint8Array(9 * 9), OKb = new Uint8Array(9 * 9);

    function render() {
      cR = Math.cos(roll); sR = Math.sin(roll);
      // camera position in the un-rolled (view) frame
      camX = camWX * cR + camWY * sR;
      camY = -camWX * sR + camWY * cR;
      g.save();
      if (shake > 0) g.translate((R() - 0.5) * shake * UI * 0.04, (R() - 0.5) * shake * UI * 0.04);
      drawSpace();
      drawTunnel();
      drawParticles();
      g.restore();
      if (flash > 0) { g.fillStyle = 'rgba(255,255,255,' + flash * 0.5 + ')'; g.fillRect(0, 0, VW, VH); }
      if (state === 'dying') { g.fillStyle = 'rgba(0,0,10,' + clamp(deathT - 0.4, 0, 0.6) + ')'; g.fillRect(0, 0, VW, VH); }
      if (state === 'play' && runT < 4.5 && (mode === 'endless' || levelIdx < 2)) drawHelp();
      updateHud();
    }

    function drawSpace() {
      var bg = g.createRadialGradient(CX, CY, 0, CX, CY, Math.max(VW, VH) * 0.8);
      bg.addColorStop(0, '#0d1030');
      bg.addColorStop(1, '#03040c');
      g.fillStyle = bg;
      g.fillRect(-20, -20, VW + 40, VH + 40);
      // nebula + planet rotate with the camera roll, which sells the gravity flip
      var D = Math.max(VW, VH) * 0.62;
      var na = 2.2 - roll, nx = CX + Math.cos(na) * D * 0.55, ny = CY + Math.sin(na) * D * 0.4;
      var neb = g.createRadialGradient(nx, ny, 0, nx, ny, D * 0.7);
      neb.addColorStop(0, pal.neb);
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb;
      g.fillRect(-20, -20, VW + 40, VH + 40);
      var pa = -0.7 - roll, px = CX + Math.cos(pa) * D * 0.75, py = CY + Math.sin(pa) * D * 0.6, pr = UI * 0.09;
      var pg = g.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
      pg.addColorStop(0, '#f6c08a');
      pg.addColorStop(0.7, '#b0603a');
      pg.addColorStop(1, '#3a1a20');
      g.fillStyle = pg;
      g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,220,180,0.45)';
      g.lineWidth = Math.max(1, pr * 0.06);
      g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * 0.42, -0.35 - roll, 0, TAU); g.stroke();
      // stars streaming outward
      var maxR = Math.sqrt(VW * VW + VH * VH) * 0.6;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i], rr = st.r * st.r * maxR, a = st.a - roll;
        var x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
        if (x < -4 || x > VW + 4 || y < -4 || y > VH + 4) continue;
        g.globalAlpha = clamp(st.r * 2.2, 0, 1) * (0.6 + 0.4 * Math.sin(time * 2 + st.tw));
        g.fillStyle = '#ffffff';
        var sz = st.s * (0.5 + st.r);
        g.fillRect(x, y, sz, sz);
      }
      g.globalAlpha = 1;
    }

    // project the ring of column-boundary points of shape ge at depth z
    function projRing(ge, z, SXr, SYr, OKr) {
      var n = ge.n * (ge.K + 1);
      for (var i = 0; i < n; i++) {
        OKr[i] = proj(ge.bx[i], ge.by[i], z) ? 1 : 0;
        SXr[i] = SX; SYr[i] = SY;
      }
    }

    function drawTunnel() {
      // with the slight pitch, ceiling corners need a bit more room in front of the camera
      var zNear = camZ + 0.75;
      var iNear = Math.max(0, Math.floor(zNear / L) - rowBase);
      var iFar = Math.min(rows.length - 1, Math.floor((camZ + VIEW) / L) - rowBase);
      var runnerRow = Math.floor(p.z / L) - rowBase;
      var runnerDrawn = false;
      for (var i = iFar; i >= iNear; i--) {
        var r = rows[i];
        var z0 = (i + rowBase) * L, z1 = z0 + L;
        if (z1 <= zNear) continue;
        if (z0 < zNear) z0 = zNear;
        var ge = geom(r.n), K1 = ge.K + 1;
        projRing(ge, z0, SXa, SYa, OKa);
        projRing(ge, z1, SXb, SYb, OKb);
        var depth = (z0 + z1) / 2 - camZ;
        var al = clamp(1.15 - depth / VIEW, 0, 1);
        if (al <= 0.01) continue;
        var w, k, b, a, c;
        // tile fill, three lighting buckets: floor-facing walls brightest
        g.globalAlpha = al * 0.95;
        for (var bk = 0; bk < 3; bk++) {
          for (var cr = 0; cr < 2; cr++) {
            if (cr && !r.c) continue;
            var any = false;
            g.beginPath();
            for (w = 0; w < r.n; w++) {
              var rel = Math.abs(((ge.walls[w].phi - roll) % TAU + TAU + PI) % TAU - PI);
              if ((rel < 0.85 ? 0 : rel < 2.3 ? 1 : 2) !== bk) continue;
              var m = r.m[w];
              if (!m) continue;
              var cm = r.c ? r.c[w] : 0;
              var trig = cr && r.crTrig ? r.crTrig[w] : 0;
              for (k = 0; k < ge.K; k++) {
                b = 1 << k;
                if (!(m & b) || (cm & b ? !cr : cr)) continue;
                a = w * K1 + k; c = a + 1;
                var jx = trig & b ? (R() - 0.5) * 3 : 0;
                g.moveTo(SXa[a] + jx, SYa[a]); g.lineTo(SXa[c] + jx, SYa[c]); g.lineTo(SXb[c] + jx, SYb[c]); g.lineTo(SXb[a] + jx, SYb[a]); g.closePath();
                any = true;
              }
            }
            if (any) { g.fillStyle = cr ? pal.shadeC[bk] : pal.shade[bk]; g.fill(); }
          }
        }
        // glowing tile edges
        var lw = clamp((F * 0.028) / Math.max(depth, 0.5), 0.5, 3.2);
        g.lineJoin = 'round';
        g.beginPath();
        var anyE = false;
        for (w = 0; w < r.n; w++) {
          var m2 = r.m[w];
          if (!m2) continue;
          for (k = 0; k < ge.K; k++) {
            if (!(m2 & (1 << k))) continue;
            a = w * K1 + k; c = a + 1;
            g.moveTo(SXa[a], SYa[a]); g.lineTo(SXa[c], SYa[c]); g.lineTo(SXb[c], SYb[c]); g.lineTo(SXb[a], SYb[a]); g.closePath();
            anyE = true;
          }
        }
        if (anyE) {
          if (depth < 16) {
            g.strokeStyle = pal.glow;
            g.lineWidth = lw * 3;
            g.stroke();
          }
          g.strokeStyle = pal.edge;
          g.lineWidth = lw;
          g.globalAlpha = al;
          g.stroke();
        }
        // finish gate
        if (r.fin) drawGate(ge, (i + rowBase) * L, al);
        // power cells in this row
        if (r.cells && r.n === ge.n) drawCells(r, ge, (i + rowBase + 0.5) * L, al);
        g.globalAlpha = 1;
        if (i === runnerRow) { drawRunner(); runnerDrawn = true; }
      }
      if (!runnerDrawn) drawRunner();
    }

    function drawGate(ge, z, al) {
      var n = ge.n * (ge.K + 1);
      var pulse = 0.6 + Math.sin(time * 6) * 0.25;
      g.globalAlpha = al;
      g.strokeStyle = 'rgba(255,230,120,' + pulse + ')';
      g.lineWidth = clamp((F * 0.12) / Math.max(z - camZ, 0.5), 1.5, 14);
      g.beginPath();
      var first = true;
      for (var i = 0; i <= n; i++) {
        var idx = i % n;
        if (!proj(ge.bx[idx] * 0.92, ge.by[idx] * 0.92, z)) { first = true; continue; }
        if (first) { g.moveTo(SX, SY); first = false; } else g.lineTo(SX, SY);
      }
      g.stroke();
      g.globalAlpha = 1;
    }

    function drawCells(r, ge, z, al) {
      for (var j = 0; j < r.cells.length; j++) {
        var c = r.cells[j];
        if (c.got) continue;
        var wl = ge.walls[c.w], u = -ge.W / 2 + (c.k + 0.5) * ge.tw;
        var bob = 0.5 + Math.sin(time * 4 + c.k + c.w) * 0.08;
        if (!proj(wl.cx + wl.tx * u + wl.nx * bob, wl.cy + wl.ty * u + wl.ny * bob, z)) continue;
        var s = F / SZ, rr = s * 0.17;
        if (rr < 0.8) continue;
        g.globalAlpha = al;
        g.fillStyle = 'rgba(220,255,90,0.22)';
        g.beginPath(); g.arc(SX, SY, rr * 2.1, 0, TAU); g.fill();
        // little hexagonal energy cell, spinning
        var sp = Math.abs(Math.cos(time * 3 + j)) * 0.6 + 0.4;
        g.fillStyle = pal.cell;
        g.beginPath();
        for (var q = 0; q < 6; q++) {
          var ang = q * (PI / 3) + PI / 6;
          var x = SX + Math.cos(ang) * rr * sp, y = SY + Math.sin(ang) * rr * 1.25;
          if (q) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.closePath(); g.fill();
        g.fillStyle = '#ffffff';
        g.fillRect(SX - rr * 0.18 * sp, SY - rr * 0.6, rr * 0.36 * sp, rr * 1.2);
      }
      g.globalAlpha = 1;
    }

    /* ---------- the runner: a small alien explorer seen from behind ---------- */
    function drawRunner() {
      if (!rows.length) return;
      var wl = GEOc.walls[p.w];
      var h = p.h;
      var fx = wl.cx + wl.tx * p.u + wl.nx * h, fy = wl.cy + wl.ty * p.u + wl.ny * h;
      if (!proj(fx, fy, p.z)) return;
      var bx = SX, by = SY, sc = F / SZ;
      // screen-space "up" for this wall, so the runner stands on it during the roll
      var ang = wl.phi - roll;
      g.save();
      g.translate(bx, by);
      g.rotate(ang);
      g.scale(sc * RSCALE, sc * RSCALE);
      g.lineCap = 'round'; g.lineJoin = 'round';
      // shadow on the floor
      if (!p.falling && state !== 'dying') {
        g.save();
        g.translate(0, h / RSCALE);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath(); g.ellipse(0, 0, 0.3 * clamp(1 - h * 0.4, 0.3, 1), 0.08, 0, 0, TAU); g.fill();
        g.restore();
      }
      var air = p.air || state === 'dying';
      var ph = p.phase, menuIdle = state === 'menu';
      var l0 = air ? 0.12 : menuIdle ? 0 : Math.max(0, Math.sin(ph)) * 0.2;
      var l1 = air ? 0.18 : menuIdle ? 0 : Math.max(0, Math.sin(ph + PI)) * 0.2;
      var bob = air || menuIdle ? 0 : Math.abs(Math.sin(ph)) * 0.03;
      // legs
      g.strokeStyle = '#5b6478'; g.lineWidth = 0.11;
      g.beginPath();
      g.moveTo(-0.09, -0.36 - bob); g.lineTo(-0.11, -l0 - 0.03);
      g.moveTo(0.09, -0.36 - bob); g.lineTo(0.11, -l1 - 0.03);
      g.stroke();
      g.fillStyle = '#2b3040';
      g.beginPath(); g.ellipse(-0.11, -l0 - 0.02, 0.07, 0.04, 0, 0, TAU); g.ellipse(0.11, -l1 - 0.02, 0.07, 0.04, 0, 0, TAU); g.fill();
      // arms
      var sw = air ? -0.18 : menuIdle ? 0 : Math.sin(ph) * 0.1;
      g.strokeStyle = '#aeb6c8'; g.lineWidth = 0.08;
      g.beginPath();
      g.moveTo(-0.17, -0.62 - bob); g.lineTo(-0.27, -0.42 - bob + sw);
      g.moveTo(0.17, -0.62 - bob); g.lineTo(0.27, -0.42 - bob - sw);
      g.stroke();
      // body
      g.fillStyle = '#d6dcea';
      g.beginPath(); g.ellipse(0, -0.55 - bob, 0.2, 0.22, 0, 0, TAU); g.fill();
      g.fillStyle = '#b4bccf';
      g.beginPath(); g.ellipse(0.07, -0.55 - bob, 0.12, 0.2, 0, 0, TAU); g.fill();
      // backpack thruster
      g.fillStyle = '#39415a';
      g.fillRect(-0.11, -0.7 - bob, 0.22, 0.24);
      g.fillStyle = pal.edge;
      g.fillRect(-0.06, -0.66 - bob, 0.12, 0.05);
      if (air && state === 'play') {
        g.fillStyle = 'rgba(255,170,70,' + (0.5 + Math.sin(time * 40) * 0.3) + ')';
        g.beginPath(); g.moveTo(-0.07, -0.46 - bob); g.lineTo(0, -0.28 - bob + Math.sin(time * 37) * 0.05); g.lineTo(0.07, -0.46 - bob); g.fill();
      }
      // big head (back view) + antenna
      g.fillStyle = '#c9d0e2';
      g.beginPath(); g.ellipse(0, -0.9 - bob, 0.25, 0.22, 0, 0, TAU); g.fill();
      g.fillStyle = '#e7ebf5';
      g.beginPath(); g.ellipse(-0.08, -0.96 - bob, 0.1, 0.08, 0, 0, TAU); g.fill();
      g.strokeStyle = '#8c95ab'; g.lineWidth = 0.035;
      g.beginPath(); g.moveTo(0.05, -1.1 - bob); g.quadraticCurveTo(0.12, -1.25 - bob, 0.08 + Math.sin(time * 5) * 0.03, -1.32 - bob); g.stroke();
      g.fillStyle = pal.edge;
      g.beginPath(); g.arc(0.08 + Math.sin(time * 5) * 0.03, -1.33 - bob, 0.05, 0, TAU); g.fill();
      g.restore();
    }

    /* ---------- particles ---------- */
    var PMAX = 100, parts = [];
    for (var pi = 0; pi < PMAX; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, sz: 2, col: '#fff' });
    function emitAtRunner(n, col, life) {
      var wl = GEOc.walls[p.w];
      if (!proj(wl.cx + wl.tx * p.u + wl.nx * (p.h + 0.2), wl.cy + wl.ty * p.u + wl.ny * (p.h + 0.2), p.z)) return;
      var u = UI / 500;
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < PMAX; j++) {
          var q = parts[j];
          if (q.on) continue;
          var a = R() * TAU, v = (40 + R() * 120) * u;
          q.on = true; q.x = SX; q.y = SY; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.life = q.max = life * (0.6 + R() * 0.4); q.sz = (2 + R() * 2.5) * u + 0.5; q.col = col;
          break;
        }
      }
    }
    function stepParticles(dt) {
      for (var i = 0; i < PMAX; i++) {
        var q = parts[i];
        if (!q.on) continue;
        q.life -= dt;
        if (q.life <= 0) { q.on = false; continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        q.vx *= 0.96; q.vy *= 0.96;
      }
    }
    function drawParticles() {
      for (var i = 0; i < PMAX; i++) {
        var q = parts[i];
        if (!q.on) continue;
        g.globalAlpha = clamp(q.life / q.max, 0, 1);
        g.fillStyle = q.col;
        g.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
      }
      g.globalAlpha = 1;
    }

    function drawHelp() {
      var fs = clamp(UI * 0.04, 12, 21);
      var a = runT < 3.5 ? 1 : clamp(4.5 - runT, 0, 1);
      var lines = ctx.isTouch
        ? ['Hold ◀ ▶ (or a screen half) to move', '▲ or swipe up to jump', 'Run onto a wall to flip gravity']
        : ['← → / A D move · ↑ / W / Space jump', 'Run onto a wall to flip gravity'];
      g.globalAlpha = a;
      g.font = '800 ' + Math.round(fs) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      var w = 0, i;
      for (i = 0; i < lines.length; i++) w = Math.max(w, g.measureText(lines[i]).width);
      w = Math.min(VW - 16, w + fs * 1.4);
      var lh = fs * 1.35, y0 = Math.max(VH * 0.2, fs * 6.5);
      g.fillStyle = 'rgba(5,8,25,0.62)';
      g.fillRect(CX - w / 2, y0 - lh * 0.5 - fs * 0.35, w, lh * lines.length + fs * 0.7);
      g.fillStyle = '#fff';
      for (i = 0; i < lines.length; i++) g.fillText(lines[i], CX, y0 + i * lh, VW - 24);
      g.globalAlpha = 1;
    }

    /* ---------- HUD ---------- */
    var hudLast = '', hudOn = false, lastTouchOn = null;
    function updateHud() {
      var on = state === 'play' || state === 'paused' || state === 'dying';
      if (on !== hudOn) { hudOn = on; hud.classList.toggle('on', on); }
      var tOn = ctx.isTouch && state === 'play';
      if (tOn !== lastTouchOn) { lastTouchOn = tOn; touchBar.classList.toggle('on', tOn); if (!tOn) btnHold.L = btnHold.R = btnHold.J = 0; }
      if (!on) return;
      var main = mode === 'level' ? 'Level ' + (levelIdx + 1) : fmtInt(p.z) + ' m';
      var key = main + '|' + cells;
      if (key !== hudLast) {
        hudLast = key;
        hudMain.textContent = main;
        hudCells.textContent = mode === 'level' ? cells + ' / ' + cellsTotal : String(cells);
        hudProg.style.display = mode === 'level' ? '' : 'none';
      }
      if (mode === 'level') hudProgBar.style.transform = 'scaleX(' + clamp(p.z / finishZ, 0, 1).toFixed(3) + ')';
    }
    function toast(txt) {
      if (destroyed) return;
      var t = IGAME.ui.toast(root, txt, 1500);
      if (t && t.style) { t.style.top = '44px'; t.style.fontSize = clamp(Math.round(UI / 32), 12, 17) + 'px'; }
    }

    /* ------------------------------------------------------------------ */
    /* Menus                                                              */
    /* ------------------------------------------------------------------ */
    function closeOverlay() { if (overlay) overlay.close(); overlay = null; overlayKind = ''; }
    function howHtml() {
      return ctx.isTouch
        ? '<p class="vr-how">Hold ◀ ▶ to run sideways · ▲ or swipe up to jump · run onto a side wall and gravity flips with you.</p>'
        : '<p class="vr-how"><span class="ig-kbd">←</span> <span class="ig-kbd">→</span> move · <span class="ig-kbd">↑</span>/<span class="ig-kbd">Space</span> jump (hold = higher) · walk onto a wall to flip gravity · <span class="ig-kbd">P</span> pause</p>';
    }
    // behind menus, show an endless tunnel drifting by (levels end after their gate)
    function toAttract() {
      if (mode !== 'level') return;
      mode = 'endless';
      startEndless();
      resetRunner(ENDLESS_SHAPES[0]);
      endlessGen();
    }
    function showTitle() {
      closeOverlay();
      state = 'menu';
      toAttract();
      overlayKind = 'title';
      var done = Object.keys(lvBest).length;
      overlay = IGAME.ui.overlay(root, {
        title: 'Star Tunnel Runner',
        text: 'Run the floating tunnels. Mind the gaps — space is a long way down.',
        html: '<div class="vr-stats"><div class="vr-stat"><span>Levels cleared</span><b>' + done + ' / ' + LEVELS.length + '</b></div><div class="vr-stat"><span>Endless best</span><b>' + fmtInt(bestDist) + ' m</b></div></div>' + howHtml(),
        buttons: [
          { label: '▶ Play level ' + (Math.min(unlocked, LEVELS.length - 1) + 1), primary: true, onClick: function () { startLevel(Math.min(unlocked, LEVELS.length - 1)); } },
          { label: 'Levels', onClick: showLevels },
          { label: '∞ Endless', onClick: startEndlessRun },
        ],
        focus: false,
      });
    }
    function showLevels() {
      closeOverlay();
      state = 'menu';
      toAttract();
      overlayKind = 'levels';
      var html = '<div class="vr-lv">';
      for (var i = 0; i < LEVELS.length; i++) {
        var b = lvBest[String(i)];
        var locked = i > unlocked;
        html += '<button type="button" class="vr-lvb' + (b != null ? ' done' : '') + '" data-lv="' + i + '"' + (locked ? ' disabled' : '') + ' title="' + LEVELS[i].name + '">' + (i + 1) + '<small>' + (locked ? 'locked' : b != null ? '✓ ' + b + ' cells' : LEVELS[i].n + ' sides') + '</small></button>';
      }
      html += '</div>';
      overlay = IGAME.ui.overlay(root, {
        title: 'Choose a tunnel',
        html: html,
        buttons: [{ label: 'Back', onClick: showTitle }, { label: '∞ Endless', onClick: startEndlessRun }],
        focus: false,
      });
      Array.prototype.forEach.call(overlay.panel.querySelectorAll('[data-lv]'), function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (btn.disabled) return;
          ctx.sfx('click');
          startLevel(+btn.getAttribute('data-lv'));
        });
      });
    }
    function showWon(first) {
      closeOverlay();
      overlayKind = 'won';
      var last = levelIdx + 1 >= LEVELS.length;
      overlay = IGAME.ui.overlay(root, {
        title: last ? 'All tunnels cleared!' : 'Level ' + (levelIdx + 1) + ' cleared!',
        text: lvl.name + (first ? ' — new level unlocked.' : ''),
        html: '<div class="vr-stats"><div class="vr-stat"><span>Power cells</span><b>' + cells + ' / ' + cellsTotal + '</b></div><div class="vr-stat"><span>Best on this level</span><b>' + (lvBest[String(levelIdx)] || 0) + '</b></div></div>' +
          (last ? '<p class="vr-how">Now see how far you get in Endless mode.</p>' : '<p class="vr-how">' + (ctx.isTouch ? 'Tap Next level to continue.' : 'Press <span class="ig-kbd">Space</span> for the next level.') + '</p>'),
        buttons: last
          ? [{ label: '∞ Endless', primary: true, onClick: startEndlessRun }, { label: 'Levels', onClick: showLevels }]
          : [{ label: 'Next level ▶', primary: true, onClick: function () { startLevel(levelIdx + 1); } }, { label: 'Replay', onClick: retry }, { label: 'Levels', onClick: showLevels }],
        focus: false,
      });
    }
    function showOver(dist, isBest) {
      closeOverlay();
      overlayKind = 'over';
      var stats = mode === 'level'
        ? '<div class="vr-stats"><div class="vr-stat"><span>Progress</span><b>' + Math.round(clamp(p.z / finishZ, 0, 1) * 100) + '%</b></div><div class="vr-stat"><span>Power cells</span><b>' + cells + ' / ' + cellsTotal + '</b></div></div>'
        : (isBest ? '<div class="vr-new">New best distance!</div>' : '') + '<div class="vr-stats"><div class="vr-stat"><span>Distance</span><b>' + fmtInt(dist) + ' m</b></div><div class="vr-stat"><span>Best</span><b>' + fmtInt(bestDist) + ' m</b></div></div>';
      overlay = IGAME.ui.overlay(root, {
        title: 'Lost in space!',
        text: mode === 'level' ? 'Level ' + (levelIdx + 1) + ' · ' + lvl.name : cells + ' power cells collected',
        html: stats + '<p class="vr-how">' + (ctx.isTouch ? 'Tap Retry to go again.' : 'Press <span class="ig-kbd">Space</span> to retry.') + '</p>',
        buttons: [{ label: '↻ Retry', primary: true, onClick: retry }, { label: mode === 'level' ? 'Levels' : 'Menu', onClick: mode === 'level' ? showLevels : showTitle }],
        focus: false,
      });
    }
    function showPause() {
      closeOverlay();
      overlayKind = 'pause';
      overlay = IGAME.ui.overlay(root, {
        title: 'Paused',
        text: mode === 'level' ? 'Level ' + (levelIdx + 1) + ' · ' + lvl.name : fmtInt(p.z) + ' m',
        buttons: [{ label: '▶ Resume', primary: true, onClick: resumeGame }, { label: 'Quit', onClick: function () { closeOverlay(); showTitle(); } }],
        focus: false,
      });
    }
    function pauseGame() { if (state !== 'play') return; state = 'paused'; ptrs = {}; showPause(); }
    function resumeGame() { if (state !== 'paused') return; closeOverlay(); state = 'play'; ctx.focus(); }

    /* ------------------------------------------------------------------ */
    /* Boot                                                               */
    /* ------------------------------------------------------------------ */
    // attract mode behind the title: an endless tunnel drifting by
    mode = 'endless';
    startEndless();
    resetRunner(ENDLESS_SHAPES[0]);
    endlessGen();
    var loop = IGAME.loop(function (dt) { update(dt); render(); });
    loop.start();
    showTitle();

    if (ctx.debug) {
      window.__vr = {
        state: function () { return { state: state, mode: mode, level: levelIdx, z: +p.z.toFixed(1), w: p.w, u: +p.u.toFixed(2), h: +p.h.toFixed(2), air: p.air, cells: cells, total: cellsTotal, n: GEOc.n, roll: +roll.toFixed(2), finish: +finishZ.toFixed(1) }; },
        level: startLevel,
        unlockAll: function () { unlocked = LEVELS.length - 1; },
        rows: function (a, b) { var out = []; for (var i = a; i <= b; i++) { var r = rows[i - rowBase]; if (!r) continue; var ge = geom(r.n), line = ''; for (var w = 0; w < r.n; w++) { for (var k = 0; k < ge.K; k++) line += r.m[w] & (1 << k) ? (r.c && r.c[w] & (1 << k) ? 'c' : '#') : '.'; line += '|'; } out.push(i + ' ' + line); } return out.join('\n'); },
        endless: startEndlessRun,
        warp: function (z) { p.z = z; camZ = z - CAM_BACK; if (mode === 'endless') endlessGen(); },
      };
    }

    return {
      pause: function () { if (state === 'play') pauseGame(); loop.stop(); },
      resume: function () { if (!destroyed) loop.start(); },
      destroy: function () {
        destroyed = true;
        loop.stop();
        closeOverlay();
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        hudPause.removeEventListener('click', onPauseBtn);
        Array.prototype.forEach.call(tbs, function (b) {
          b.removeEventListener('pointerdown', tbDown);
          b.removeEventListener('pointerup', tbUp);
          b.removeEventListener('pointercancel', tbUp);
          b.removeEventListener('lostpointercapture', tbUp);
        });
        view.destroy();
        [hud, touchBar, styleEl].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
        if (ctx.debug && window.__vr) { try { delete window.__vr; } catch (e) { window.__vr = undefined; } }
      },
    };
  });
})();
