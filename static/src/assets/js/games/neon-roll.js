/*!
 * igame9 — "neon-roll" engine (Neon Orb Rush)
 * Pseudo-3D synthwave ball runner. A glowing orb rolls down an endless skyway
 * of floating neon tiles that curves left/right, rises and falls, narrows and
 * splits. Steer with momentum, jump gaps, dodge spikes, pillars and sliding
 * blocks, hit jump pads and boost strips, collect gems. Speed ramps up and the
 * colour theme changes at every stage gate.
 *
 * World: +z forward (1 row = 1 unit), u = sideways offset from the track
 * centreline, y = height. Each row stores its centreline x / heading (x0, dx0),
 * a constant curvature and a start/end height. Rendering is an OutRun-style
 * projection in a camera frame that turns with the track:
 *   X = cx(z) - camCX - camDX·(z - camZ) + u - camU,   sx = CX + X·F/dz
 *   sy = HY + (camY - y)·F/dz
 * Sideways "centrifugal" drift on curves = -curvature · speed².
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var SEG = 1, TW = 1, MAXW = 7, THICK = 0.42;
  var VIEW = 70, NEAR = 0.7;
  var CAM_BACK = 4.6, CAM_H = 2.05;
  var BR = 0.34; // ball radius
  var G = 32, JUMP_V = 9.6, PAD_V = 15.5;
  var V0 = 11, VMAX = 26, VRAMP = 2600;
  var STEER = 27, VMOVE = 5.6, CF = 2.0, BOOST_T = 1.6;
  var STAGE_LEN = 500;
  var PILLAR_H = 2.3, WALL_H = 0.55, MOVER_H = 0.62;
  var T_EMPTY = 0, T_FLOOR = 1, T_SPIKE = 2, T_BOOST = 3, T_PAD = 4, T_WALL = 5, T_PILLAR = 6;

  // Stage colour themes (RGB arrays so they can be blended)
  var PALS = [
    { name: 'Midnight Grid', skyTop: [8, 5, 30], skyMid: [48, 12, 88], horizon: [255, 70, 170], sunA: [255, 236, 110], sunB: [255, 60, 150], ground: [10, 4, 28], grid: [255, 60, 210], tile: [22, 18, 66], face: [9, 7, 32], edge: [70, 240, 255], edge2: [255, 90, 230], hazard: [255, 60, 100], mount: [34, 10, 66] },
    { name: 'Sunset Drive', skyTop: [22, 6, 40], skyMid: [118, 26, 92], horizon: [255, 150, 70], sunA: [255, 244, 140], sunB: [255, 90, 70], ground: [28, 6, 30], grid: [255, 150, 70], tile: [54, 16, 56], face: [26, 6, 30], edge: [255, 200, 90], edge2: [255, 90, 150], hazard: [90, 225, 255], mount: [70, 16, 66] },
    { name: 'Toxic Circuit', skyTop: [3, 14, 14], skyMid: [16, 52, 44], horizon: [130, 255, 140], sunA: [235, 255, 140], sunB: [60, 210, 130], ground: [3, 16, 14], grid: [90, 255, 150], tile: [10, 44, 40], face: [5, 20, 18], edge: [160, 255, 100], edge2: [205, 110, 255], hazard: [255, 70, 130], mount: [10, 44, 34] },
    { name: 'Ice Highway', skyTop: [5, 10, 34], skyMid: [28, 58, 124], horizon: [150, 225, 255], sunA: [245, 252, 255], sunB: [120, 185, 255], ground: [5, 9, 30], grid: [120, 205, 255], tile: [24, 42, 86], face: [11, 20, 46], edge: [205, 244, 255], edge2: [125, 165, 255], hazard: [255, 95, 95], mount: [20, 38, 86] },
    { name: 'Crimson Core', skyTop: [20, 2, 6], skyMid: [84, 10, 22], horizon: [255, 90, 40], sunA: [255, 226, 120], sunB: [255, 40, 50], ground: [20, 2, 8], grid: [255, 70, 60], tile: [54, 10, 22], face: [26, 4, 10], edge: [255, 205, 90], edge2: [255, 80, 80], hazard: [120, 255, 255], mount: [54, 6, 16] },
    { name: 'Ultraviolet', skyTop: [6, 2, 22], skyMid: [60, 20, 120], horizon: [120, 255, 230], sunA: [210, 255, 250], sunB: [150, 90, 255], ground: [8, 3, 24], grid: [140, 110, 255], tile: [30, 20, 80], face: [13, 8, 36], edge: [120, 255, 230], edge2: [190, 120, 255], hazard: [255, 210, 60], mount: [36, 14, 80] },
  ];
  var PKEYS = ['skyTop', 'skyMid', 'horizon', 'sunA', 'sunB', 'ground', 'grid', 'tile', 'face', 'edge', 'edge2', 'hazard', 'mount'];

  // Cosmetic orbs, unlocked by lifetime gems collected (never spent)
  var ORBS = [
    { id: 'cyan', name: 'Cyan Core', need: 0, a: '#c8fbff', b: '#14a8de', glow: [80, 230, 255] },
    { id: 'magenta', name: 'Magenta Pulse', need: 100, a: '#ffd0f6', b: '#d61fa8', glow: [255, 80, 220] },
    { id: 'solar', name: 'Solar Flare', need: 300, a: '#fff4b0', b: '#ff7a14', glow: [255, 170, 60] },
    { id: 'lime', name: 'Lime Volt', need: 700, a: '#efffc0', b: '#3fbf22', glow: [150, 255, 90] },
    { id: 'prism', name: 'Prism', need: 1500, a: '#ffffff', b: '#8a6cff', glow: [200, 160, 255], rainbow: true },
    { id: 'void', name: 'Void Pearl', need: 3000, a: '#4a4466', b: '#05040c', glow: [255, 255, 255], rim: true },
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function speedAt(dist) { return V0 + (VMAX - V0) * (1 - Math.exp(-dist / VRAMP)); }
  function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
  function fmtInt(n) { return Math.floor(n).toLocaleString('en-US'); }
  function orbById(id) { for (var i = 0; i < ORBS.length; i++) if (ORBS[i].id === id) return ORBS[i]; return null; }

  var CSS = [
    '.nr-hud{position:absolute;inset:0;pointer-events:none;z-index:4;font-family:var(--font);display:none}',
    '.nr-hud.on{display:block}',
    '.nr-tl{position:absolute;left:10px;top:10px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}',
    '.nr-tr{position:absolute;right:10px;top:10px;display:flex;gap:8px;align-items:center}',
    '.nr-hud .ig-pill{font-size:1em}',
    '.nr-dist{font-size:1.25em!important;font-variant-numeric:tabular-nums}',
    '.nr-gem{display:inline-block;width:.62em;height:.62em;margin-right:6px;transform:rotate(45deg);vertical-align:.05em;background:linear-gradient(135deg,#fff,#7ff6ff 45%,#ff5ad9);box-shadow:0 0 8px rgba(127,246,255,.8)}',
    '.nr-pause{pointer-events:auto;cursor:pointer;width:2.6em;height:2.6em;display:grid;place-items:center;padding:0!important;color:#fff}',
    '.nr-pause svg{width:1em;height:1em}',
    '.nr-jump{position:absolute;right:14px;bottom:14px;z-index:5;display:none;width:74px;height:74px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(20,10,50,.45);color:#fff;place-items:center;touch-action:none;-webkit-user-select:none;user-select:none;box-shadow:0 0 18px rgba(255,90,230,.35)}',
    '.nr-jump.on{display:grid}',
    '.nr-jump.down{background:rgba(255,90,230,.45)}',
    '.nr-jump svg{width:30px;height:30px}',
    '.nr-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 12px}',
    '.nr-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:6px 8px}',
    '.nr-stat b{display:block;font-size:20px;color:#fff;line-height:1.2;font-variant-numeric:tabular-nums}',
    '.nr-stat span{font-size:12px;color:var(--muted)}',
    '.nr-how{font-size:13px;color:var(--text-2);margin:0 0 12px}',
    '.nr-orbs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:0 0 12px}',
    '.nr-orb{width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,.18);cursor:pointer;padding:0;position:relative;touch-action:manipulation}',
    '.nr-orb.sel{border-color:#fff;box-shadow:0 0 0 3px rgba(255,90,230,.55)}',
    '.nr-orb[disabled]{cursor:not-allowed;opacity:.35;filter:grayscale(.6)}',
    '.nr-orb small{position:absolute;left:50%;bottom:-15px;transform:translateX(-50%);font:700 10px var(--font);color:var(--muted);white-space:nowrap}',
    '.nr-orbname{font-size:12px;color:var(--muted);margin:6px 0 12px;min-height:1em}',
    '.nr-sm .ig-panel{padding:14px 12px}',
    '.nr-sm .ig-title{font-size:22px;margin-bottom:4px}',
    '.nr-sm .ig-sub{font-size:13px;margin-bottom:8px}',
    '.nr-sm .nr-stats{gap:6px;margin-bottom:8px}',
    '.nr-sm .nr-stat{padding:4px 6px}',
    '.nr-sm .nr-stat b{font-size:16px}',
    '.nr-sm .nr-orbs{gap:6px;flex-wrap:nowrap;margin-bottom:14px}',
    '.nr-sm .nr-orb{width:30px;height:30px}',
    '.nr-sm .nr-orbname{margin:2px 0 8px}',
    '.nr-sm .nr-orb small{font-size:9px;bottom:-13px}',
    '.nr-sm .nr-how{font-size:12px;margin-bottom:8px}',
    '.nr-sm .nr-new{margin-bottom:6px}',
    '.nr-sm .ig-btn{padding:10px 18px;font-size:15px}',
    '.nr-new{display:inline-block;margin:0 0 10px;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,#fbbf24,#f97316);color:#1a1205;font-weight:900;font-size:13px}',
  ].join('\n');

  var SVG = {
    pause: '<svg viewBox="0 0 10 12"><rect x="1" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="6" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M4 16 12 8l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  IGAME.register('neon-roll', function (ctx) {
    var root = ctx.root, store = ctx.store, R = Math.random;
    var destroyed = false;
    var AUTO = ctx.debug && ctx.params.get('auto') === '1', autoDir = 0;

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var VW = 1, VH = 1, F = 1, CX = 0, HY = 0, UI = 1;
    var hud = null, jumpBtn = null;
    var view = IGAME.createCanvas(root, { onResize: layout });
    var g = view.ctx, canvas = view.canvas;

    /* ---------- persistence ---------- */
    var best = store.get('best', 0) | 0;
    var bestDist = store.get('bestDist', 0) | 0;
    var gemsTotal = store.get('gems', 0) | 0;
    var runsPlayed = store.get('runs', 0) | 0;
    var orbSel = store.get('orb', 'cyan');
    if (!orbById(orbSel) || orbById(orbSel).need > gemsTotal) orbSel = 'cyan';
    var orb = orbById(orbSel);

    /* ---------- HUD + touch jump ---------- */
    hud = IGAME.ui.el('div', 'nr-hud');
    hud.innerHTML =
      '<div class="nr-tl"><div class="ig-pill nr-dist">0 m</div><div class="ig-pill nr-gems"><i class="nr-gem"></i><span>0</span></div></div>' +
      '<div class="nr-tr"><div class="ig-pill nr-stage">Stage 1</div><button type="button" class="ig-pill nr-pause" aria-label="Pause">' + SVG.pause + '</button></div>';
    root.appendChild(hud);
    var hudDist = hud.querySelector('.nr-dist'), hudGems = hud.querySelector('.nr-gems span');
    var hudStage = hud.querySelector('.nr-stage'), hudPause = hud.querySelector('.nr-pause');
    function onPauseBtn(e) { e.stopPropagation(); if (state === 'play') pauseGame(); }
    hudPause.addEventListener('click', onPauseBtn);

    jumpBtn = IGAME.ui.el('button', 'nr-jump', SVG.up);
    jumpBtn.type = 'button';
    jumpBtn.setAttribute('aria-label', 'Jump');
    root.appendChild(jumpBtn);
    function onJumpDown(e) {
      e.preventDefault(); e.stopPropagation();
      jumpBtn.classList.add('down');
      pressJump();
    }
    function onJumpUp() { jumpBtn.classList.remove('down'); }
    jumpBtn.addEventListener('pointerdown', onJumpDown);
    jumpBtn.addEventListener('pointerup', onJumpUp);
    jumpBtn.addEventListener('pointercancel', onJumpUp);
    jumpBtn.addEventListener('pointerleave', onJumpUp);

    layout(VW, VH);
    function layout(w, h) {
      VW = w; VH = h;
      UI = Math.min(w, h);
      F = Math.min(w * 0.95, h * 1.25) * 0.85;
      CX = w / 2;
      HY = h * 0.4;
      if (hud) hud.style.fontSize = clamp(Math.round(UI / 30), 12, 19) + 'px';
      if (jumpBtn) { var bs = clamp(Math.round(UI / 6), 60, 86); jumpBtn.style.width = jumpBtn.style.height = bs + 'px'; }
      if (overlay) fitOverlay();
    }

    /* ---------- state ---------- */
    var state = 'menu'; // menu | play | paused | dying | over
    var overlay = null, overlayKind = '';
    var time = 0, runT = 0, deadT = 0, overAt = -9, objT = 0;
    var ball = { z: 2, u: 0, y: 0, vu: 0, vy: 0, ground: true, falling: false, roll: 0, squash: 0, boostT: 0, coyote: 0, jbuf: 0 };
    var speed = V0, dist = 0, gems = 0, bonus = 0, stage = 0, deathKind = '', camYFrozen = 0;
    var newOrbMsg = '';
    var camZ = 0, camCX = 0, camDX = 0, camU = 0, camY = CAM_H, tilt = 0, shake = 0, flash = 0;
    var SX = 0, SY = 0, SS = 1;

    // palette (current, blended) + cached colour strings
    var P = {}, pFrom = PALS[0], pTo = PALS[0], pT = 1, C = {};
    PKEYS.forEach(function (k) { P[k] = PALS[0][k].slice(); });
    function setPal(idx, instant) {
      pFrom = {}; PKEYS.forEach(function (k) { pFrom[k] = P[k].slice(); });
      pTo = PALS[idx % PALS.length];
      pT = instant ? 1 : 0;
      if (instant) PKEYS.forEach(function (k) { P[k] = pTo[k].slice(); });
      buildColors();
    }
    function stepPal(dt) {
      if (pT >= 1) return;
      pT = Math.min(1, pT + dt / 1.6);
      var e = pT * pT * (3 - 2 * pT);
      for (var i = 0; i < PKEYS.length; i++) {
        var k = PKEYS[i], a = pFrom[k], b = pTo[k], o = P[k];
        o[0] = a[0] + (b[0] - a[0]) * e; o[1] = a[1] + (b[1] - a[1]) * e; o[2] = a[2] + (b[2] - a[2]) * e;
      }
      buildColors();
    }
    function buildColors() {
      C.tile = rgb(P.tile); C.face = rgb(P.face); C.edge = rgb(P.edge); C.edge2 = rgb(P.edge2);
      C.edgeA = rgba(P.edge, 0.5); C.glow = rgba(P.edge, 0.18); C.glow2 = rgba(P.edge2, 0.22);
      C.hazard = rgb(P.hazard); C.hazardDim = rgba(P.hazard, 0.35); C.hazardFace = rgba([P.hazard[0] * 0.35, P.hazard[1] * 0.35, P.hazard[2] * 0.35], 1);
      C.grid = rgb(P.grid); C.mount = rgb(P.mount); C.horizon = rgb(P.horizon); C.skyMid = rgb(P.skyMid);
      C.tileHi = rgb([P.tile[0] * 1.5 + 12, P.tile[1] * 1.5 + 12, P.tile[2] * 1.5 + 12]);
    }
    buildColors();

    /* ------------------------------------------------------------------ */
    /* Track generation                                                   */
    /* ------------------------------------------------------------------ */
    var rows = [], rowBase = 0, rowPool = [];
    var gen = { x: 0, dx: 0, y: 0, safe: 0, safeT: 0, idx: 0, nextStage: STAGE_LEN, stageNo: 0, attract: true };

    function takeRow() {
      var r = rowPool.pop();
      if (!r) r = { t: new Uint8Array(MAXW) };
      r.t.fill(0);
      r.n = 5; r.x0 = 0; r.dx0 = 0; r.curv = 0; r.y0 = 0; r.y1 = 0;
      r.gem = false; r.got = false; r.gemU = 0; r.gemH = 0;
      r.mv = 0; r.mvPh = 0; r.mvSp = 0; r.gate = 0; r.passed = false; r.safe = 0;
      return r;
    }
    function addRow(n, curv, slope, step) {
      var r = takeRow();
      // gentle pulls keep heading and height bounded over long runs
      curv -= gen.dx * 0.015;
      slope -= gen.y * 0.004;
      r.n = n; r.curv = curv; r.x0 = gen.x; r.dx0 = gen.dx;
      r.y0 = gen.y + (step || 0); r.y1 = r.y0 + slope * SEG;
      gen.x += gen.dx * SEG + 0.5 * curv * SEG * SEG;
      gen.dx += curv * SEG;
      gen.y = r.y1;
      // the guaranteed-safe line drifts toward its target ≤ 0.2 tiles per row
      var lim = (n * TW) / 2 - 0.5;
      gen.safe += clamp(gen.safeT - gen.safe, -0.2, 0.2);
      gen.safe = clamp(gen.safe, -lim, lim);
      gen.safeT = clamp(gen.safeT, -lim, lim);
      r.safe = gen.safe;
      rows.push(r);
      gen.idx++;
      return r;
    }
    function colU(n, k) { return (k - (n - 1) / 2) * TW; }
    function nearCol(n, u) { return clamp(Math.round(u / TW + (n - 1) / 2), 0, n - 1); }
    function isSafe(n, k) { return Math.abs(colU(n, k) - gen.safe) < 0.95; }
    function fill(r, type) { for (var k = 0; k < r.n; k++) r.t[k] = type; }
    function putGem(r, h) { r.gem = true; r.gemU = colU(r.n, nearCol(r.n, gen.safe)); r.gemH = h; }
    function pickCol(n) { return colU(n, (R() * n) | 0); }
    function vEst() { return speedAt(gen.idx * SEG); }
    function diff() { return clamp(gen.idx / 3200, 0, 1); }
    function curveAmp(d, k) { return R() < 0.3 ? 0 : (R() < 0.5 ? -1 : 1) * (0.003 + R() * (0.004 + d * 0.006)) * (k || 1); }
    function hillAmp(d) { return R() < 0.45 ? 0 : (R() < 0.5 ? -1 : 1) * (0.07 + R() * (0.08 + 0.08 * d)); }
    function pickWidth(d) {
      if (d < 0.12) return R() < 0.6 ? 5 : 6;
      var opts = d < 0.4 ? [4, 5, 5, 6, 6, 7] : [3, 4, 4, 5, 5, 6, 7];
      return opts[(R() * opts.length) | 0];
    }
    // curvature / slope at row j of a chunk: S-curve (full sine) or single bend (half sine)
    var shp = { ca: 0, ha: 0, len: 1, half: false };
    function shape(len, ca, ha) { shp.len = len; shp.ca = ca; shp.ha = ha; shp.half = R() < 0.4; }
    function cv(j) { return shp.ca * Math.sin(((j + 0.5) / shp.len) * (shp.half ? Math.PI : TAU)); }
    function sl(j) { return shp.ha * Math.sin(((j + 0.5) / shp.len) * TAU); }

    function chRun(len, n, gems, ca, ha) {
      shape(len, ca || 0, ha || 0);
      for (var j = 0; j < len; j++) {
        var r = addRow(n, cv(j), sl(j));
        fill(r, T_FLOOR);
        if (gems && j % 3 === 1 && j < len - 1) putGem(r, 0.45);
      }
    }
    function chHoles(len, n, p, d) {
      gen.safeT = pickCol(n);
      shape(len, curveAmp(d), hillAmp(d));
      for (var j = 0; j < len; j++) {
        var r = addRow(n, cv(j), sl(j));
        fill(r, T_FLOOR);
        if (j > 1 && j < len - 1) for (var k = 0; k < n; k++) if (!isSafe(n, k) && R() < p) r.t[k] = T_EMPTY;
        if (j % 3 === 2) putGem(r, 0.45);
      }
    }
    function chGap(n, gl, step) {
      chRun(3, n, false);
      for (var j = 0; j < gl; j++) {
        var r = addRow(n, 0, 0, j === 0 ? step || 0 : 0);
        putGem(r, 0.7 + 0.8 * Math.sin((Math.PI * (j + 0.5)) / gl));
      }
      chRun(4, n, false);
    }
    function chPadGap(n) {
      chRun(3, n, false);
      for (var p = 0; p < 2; p++) fill(addRow(n, 0, 0), T_PAD);
      var v = vEst(), air = (2 * PAD_V) / G;
      var gl = clamp(Math.round(v * air * 0.62), 6, 16);
      var step = R() < 0.5 ? -(1 + R() * 2) : 0;
      for (var j = 0; j < gl; j++) {
        var r = addRow(n, 0, 0, j === 0 ? step : 0);
        putGem(r, 0.8 + 2.4 * Math.sin((Math.PI * (j + 0.5)) / gl));
      }
      // long enough landing for any speed (boost included)
      chRun(Math.max(5, Math.ceil(v * 1.4 * air - gl) + 2), n, false);
    }
    function chSpikes(len, n, d) {
      gen.safeT = pickCol(n);
      shape(len, curveAmp(d, 0.6), 0);
      var bars = R() < 0.4 + d * 0.3;
      // full-width strips are spaced wider than one jump at the current speed
      var gapR = Math.ceil(vEst() * ((2 * JUMP_V) / G)) + 5;
      if (bars) len = Math.max(len, gapR * 2 + 4);
      for (var j = 0; j < len; j++) {
        var r = addRow(n, cv(j), sl(j));
        fill(r, T_FLOOR);
        if (j < 2 || j >= len - 2) continue;
        if (bars) {
          if (j % gapR === 3) fill(r, T_SPIKE); // full-width spike strip: jump it
          else if (j % gapR === 4) putGem(r, 1.2);
        } else {
          for (var k = 0; k < n; k++) if (!isSafe(n, k) && R() < 0.3 + d * 0.25) r.t[k] = T_SPIKE;
          if (j % 3 === 0) putGem(r, 0.45);
        }
      }
    }
    function chPillars(len, n, d) {
      n = Math.max(4, n);
      shape(len, curveAmp(d, 0.5), 0);
      for (var j = 0; j < len; j++) {
        if (j % 9 === 0) gen.safeT = pickCol(n);
        var r = addRow(n, cv(j), sl(j));
        fill(r, T_FLOOR);
        if (j > 1 && j < len - 1 && j % 3 === 0) {
          for (var k = 0; k < n; k++) if (!isSafe(n, k) && R() < 0.55 + d * 0.25) r.t[k] = T_PILLAR;
        } else if (j % 3 === 1) putGem(r, 0.45);
      }
    }
    function chNarrow(len, d) {
      var n = d > 0.35 && R() < 0.5 ? 1 : 2;
      gen.safeT = 0;
      shape(len, curveAmp(d, 1.5) || 0.006, hillAmp(d));
      for (var j = 0; j < len; j++) {
        var r = addRow(n, cv(j), sl(j));
        fill(r, T_FLOOR);
        if (j % 2 === 1) putGem(r, 0.45);
      }
    }
    function chZig(len, d) {
      var n = 5;
      shape(len, curveAmp(d, 0.4), 0);
      for (var j = 0; j < len; j++) {
        if (j % 8 === 0) {
          var cur = nearCol(n, gen.safe), nk;
          do { nk = (R() * n) | 0; } while (Math.abs(nk - cur) < 2);
          gen.safeT = colU(n, nk);
        }
        var r = addRow(n, cv(j), sl(j));
        for (var k = 0; k < n; k++) r.t[k] = isSafe(n, k) ? T_FLOOR : T_EMPTY;
        if (j % 2 === 0) putGem(r, 0.45);
      }
    }
    function chMovers(cnt, d) {
      var n = 5;
      gen.safeT = 0;
      chRun(3, n, false);
      for (var i = 0; i < cnt; i++) {
        var r = addRow(n, 0, 0);
        fill(r, T_FLOOR);
        r.mv = (n * TW) / 2 - 0.5;
        r.mvPh = R() * TAU;
        r.mvSp = 1.6 + d * 1.6 + R() * 0.6;
        chRun(Math.max(4, 7 - Math.round(d * 2)), n, i % 2 === 0);
      }
    }
    function chWalls(cnt, n) {
      var space = Math.ceil(vEst() * ((2 * JUMP_V) / G)) + 4;
      chRun(3, n, false);
      for (var i = 0; i < cnt; i++) {
        fill(addRow(n, 0, 0), T_WALL);
        var r = addRow(n, 0, 0);
        fill(r, T_FLOOR);
        putGem(r, 1.25);
        chRun(space, n, false);
      }
    }
    function chBoost(n) {
      gen.safeT = 0;
      chRun(3, n, false);
      for (var j = 0; j < 4; j++) {
        var r = addRow(n, 0, 0);
        fill(r, T_FLOOR);
        for (var k = 0; k < n; k++) if (isSafe(n, k)) r.t[k] = T_BOOST;
      }
      chRun(8, n, true);
    }
    function chSplit(len, d) {
      var n = R() < 0.5 ? 6 : 7;
      var lane = R() < 0.5 ? -1 : 1;
      gen.safeT = lane * (n / 2 - 1);
      chRun(4, n, false);
      shape(len, curveAmp(d, 0.4), 0);
      for (var j = 0; j < len; j++) {
        var r = addRow(n, cv(j), sl(j));
        fill(r, T_FLOOR);
        for (var k = 2; k < n - 2; k++) r.t[k] = T_EMPTY;
        // the other lane gets spikes or pillars
        if (j > 2 && j < len - 1 && j % 4 === 2) {
          for (var q = 0; q < n; q++) if (r.t[q] && !isSafe(n, q) && R() < 0.7) r.t[q] = d > 0.4 && R() < 0.5 ? T_PILLAR : T_SPIKE;
        }
        if (j % 3 === 1) putGem(r, 0.45);
      }
    }
    function chGate() {
      gen.stageNo++;
      chRun(5, 5, false);
      var r = addRow(5, 0, 0);
      fill(r, T_FLOOR);
      r.gate = gen.stageNo + 1;
      chRun(8, 5, true);
    }

    var CHUNKS = [
      // [weight, min difficulty, fn]
      [3, 0, function (n, d) { chHoles(10 + ((R() * 10) | 0), n, 0.18 + d * 0.3, d); }],
      [3, 0, function (n, d) { var v = vEst(); chGap(n, clamp(2 + ((R() * (1 + d * 4)) | 0), 2, Math.max(2, Math.floor(v * ((2 * JUMP_V) / G) * 0.5)))); }],
      [2, 0.02, function (n, d) { chSpikes(12 + ((R() * 8) | 0), n, d); }],
      [1.6, 0, function (n) { chWalls(1 + ((R() * 2) | 0), n); }],
      [1, 0, function (n) { chBoost(n); }],
      [2, 0.05, function (n, d) { chPillars(14 + ((R() * 10) | 0), n, d); }],
      [1.3, 0.05, function (n) { chPadGap(n); }],
      [1.5, 0.08, function (n, d) { chNarrow(14 + ((R() * 14) | 0), d); }],
      [1.5, 0.1, function (n, d) { chMovers(2 + ((R() * 2) | 0), d); }],
      [1, 0.12, function (n) { chGap(n, 2, -(1.4 + R() * 1.6)); }],
      [1.2, 0.15, function (n, d) { chZig(16 + ((R() * 10) | 0), d); }],
      [1, 0.2, function (n, d) { chSplit(14 + ((R() * 8) | 0), d); }],
    ];
    var lastChunk = -1, forceChunk = -1;
    function genChunk() {
      var d = diff();
      if (gen.attract) {
        chRun(24, 5, false, curveAmp(0.3), hillAmp(0.3));
        return;
      }
      if (gen.idx >= gen.nextStage) {
        chGate();
        gen.nextStage += STAGE_LEN;
        return;
      }
      var tot = 0, i;
      for (i = 0; i < CHUNKS.length; i++) if (d >= CHUNKS[i][1] && i !== lastChunk) tot += CHUNKS[i][0];
      var pick = R() * tot;
      for (i = 0; i < CHUNKS.length; i++) {
        if (d < CHUNKS[i][1] || i === lastChunk) continue;
        pick -= CHUNKS[i][0];
        if (pick <= 0) break;
      }
      i = Math.min(i, CHUNKS.length - 1);
      if (forceChunk >= 0) i = forceChunk;
      lastChunk = i;
      var n = pickWidth(d);
      CHUNKS[i][2](n, d);
      // breather
      var n2 = pickWidth(d);
      gen.safeT = pickCol(n2) * 0.5;
      // breather sized in time, not rows, so it stays readable at top speed
      chRun(Math.max(4, Math.ceil(vEst() * (0.62 - 0.12 * d))) + ((R() * 3) | 0), n2, R() < 0.5, curveAmp(d), hillAmp(d));
    }
    function resetTrack(attract) {
      for (var i = 0; i < rows.length; i++) rowPool.push(rows[i]);
      rows.length = 0;
      rowBase = 0;
      gen.x = 0; gen.dx = 0; gen.y = 0; gen.safe = 0; gen.safeT = 0; gen.idx = 0;
      gen.nextStage = STAGE_LEN; gen.stageNo = 0; gen.attract = attract;
      lastChunk = -1;
      camZ = ball.z - CAM_BACK;
      chRun(attract ? 30 : 34, 5, !attract, 0, 0);
      ensureTrack();
    }
    function ensureTrack() {
      while ((rowBase + rows.length) * SEG < ball.z + VIEW + 14) genChunk();
      var behind = Math.floor((camZ - 2) / SEG) - rowBase;
      if (behind > 12) {
        for (var i = 0; i < behind; i++) rowPool.push(rows[i]);
        rows.splice(0, behind);
        rowBase += behind;
      }
    }
    function rowAt(z) {
      var i = Math.floor(z / SEG) - rowBase;
      return i >= 0 && i < rows.length ? rows[i] : null;
    }
    function surfAt(z) {
      var i = Math.floor(z / SEG), r = rowAt(z);
      if (!r) return 0;
      return r.y0 + ((r.y1 - r.y0) * (z - i * SEG)) / SEG;
    }
    function tileAt(z, u) {
      var r = rowAt(z);
      if (!r) return 0;
      var k = Math.floor(u / TW + r.n / 2);
      if (k < 0 || k >= r.n) return 0;
      return r.t[k];
    }
    // a little edge grace: the orb balances on a tile while its centre is ≤ 0.12 past the edge
    function supportAt(z, u) {
      var t = tileAt(z, u);
      if (t) return t;
      t = tileAt(z, u - 0.12);
      if (t) return t;
      return tileAt(z, u + 0.12);
    }
    function moverU(r) { return r.mv * Math.sin(objT * r.mvSp + r.mvPh); }

    /* ------------------------------------------------------------------ */
    /* Input                                                              */
    /* ------------------------------------------------------------------ */
    var ptr = null; // {id, x0, y0, x, y, t, moved, jumped, mouse}
    function stageXY(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function onDown(e) {
      if (e.cancelable) e.preventDefault();
      if (state !== 'play') return;
      var p = stageXY(e);
      ptr = { id: e.pointerId, x0: p[0], y0: p[1], x: p[0], y: p[1], t: time, moved: false, jumped: false, mouse: e.pointerType === 'mouse' };
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    }
    function onMove(e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var p = stageXY(e);
      ptr.x = p[0]; ptr.y = p[1];
      var dx = p[0] - ptr.x0, dy = p[1] - ptr.y0;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) ptr.moved = true;
      // quick upward flick = jump
      if (!ptr.jumped && -dy > Math.max(26, UI * 0.07) && -dy > Math.abs(dx) * 1.3 && time - ptr.t < 0.4) {
        ptr.jumped = true;
        ptr.y0 = p[1];
        pressJump();
      }
      // floating stick: drag the anchor along when the finger goes past full lock
      var rng = steerRange();
      if (dx > rng) ptr.x0 = p[0] - rng;
      else if (dx < -rng) ptr.x0 = p[0] + rng;
    }
    function onUp(e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      // a short tap without dragging also jumps
      if (!ptr.moved && !ptr.jumped && time - ptr.t < 0.25) pressJump();
      ptr = null;
    }
    function steerRange() { return Math.max(36, UI * 0.11); }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    ctx.captureKeys(['KeyA', 'KeyD', 'KeyW', 'KeyP', 'Enter']);
    ctx.onKey(function (code, down) {
      if (destroyed || !down) return;
      if (state === 'play') {
        if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') pressJump();
        else if (code === 'KeyP' || code === 'Escape') pauseGame();
      } else if (state === 'paused') {
        if (code === 'KeyP' || code === 'Escape') resumeGame();
        else if (code === 'Space' || code === 'Enter') activateOverlay();
      } else if (code === 'Space' || code === 'Enter') {
        if (time - overAt < 0.6) return;
        activateOverlay();
      }
    });
    // Space/Enter on a menu: press the focused overlay button, else the primary one
    function activateOverlay() {
      if (!overlay) return;
      var fe = document.activeElement;
      if (fe && fe.tagName === 'BUTTON' && overlay.el.contains(fe) && fe.classList.contains('ig-btn')) { fe.click(); return; }
      var b = overlay.el.querySelector('.ig-btn:not(.secondary)') || overlay.el.querySelector('.ig-btn');
      if (b) b.click();
    }
    function inputDir() {
      if (AUTO) return autoDir;
      var k = ctx.keys, d = 0;
      if (k.ArrowLeft || k.KeyA) d -= 1;
      if (k.ArrowRight || k.KeyD) d += 1;
      if (ptr) d += clamp((ptr.x - ptr.x0) / steerRange(), -1, 1);
      return clamp(d, -1, 1);
    }
    function pressJump() {
      if (state !== 'play') return;
      ball.jbuf = 0.13; // buffered: fires on landing if pressed slightly early
    }

    /* ------------------------------------------------------------------ */
    /* Run control                                                        */
    /* ------------------------------------------------------------------ */
    function resetBall() {
      ball.z = 2; ball.u = 0; ball.y = 0; ball.vu = 0; ball.vy = 0; ball.ground = true; ball.falling = false;
      ball.roll = 0; ball.squash = 0; ball.boostT = 0; ball.coyote = 0; ball.jbuf = 0;
      trailN = 0;
    }
    function startRun() {
      closeOverlay();
      resetBall();
      resetTrack(false);
      speed = V0; dist = 0; gems = 0; bonus = 0; stage = 0; runT = 0; deadT = 0; objT = 0;
      deathKind = ''; newOrbMsg = '';
      if (pTo !== PALS[0]) setPal(0, false);
      snapCamera();
      for (var i = 0; i < PMAX; i++) parts[i].on = false;
      state = 'play';
      ctx.sfx('boost');
      ctx.focus();
      hudLast = '';
      runsPlayed++;
      store.set('runs', runsPlayed);
    }

    // Debug autopilot (?debug=1&auto=1): follow the guaranteed-safe line, jump hazards.
    function autopilot() {
      var look = rowAt(ball.z + 2.5 + speed * 0.08);
      var target = look ? look.safe : 0;
      autoDir = clamp((target - ball.u) * 2.2 - ball.vu * 0.3, -1, 1);
      if (!ball.ground) return;
      var reach = speed * 0.16 + 0.7;
      for (var dz = 0.4; dz <= reach; dz += 0.5) {
        var r = rowAt(ball.z + dz);
        if (!r) continue;
        var t = tileAt(ball.z + dz, ball.u);
        if (t === T_PAD) return;
        if (t === T_EMPTY || t === T_SPIKE || t === T_WALL) { if (dz > reach - 1.2 || t !== T_EMPTY || dz < 1.2) { pressJump(); return; } }
        if (r.mv && dz > reach - 1.5) { pressJump(); return; }
      }
    }

    /* ------------------------------------------------------------------ */
    /* Update                                                             */
    /* ------------------------------------------------------------------ */
    function update(dt) {
      time += dt;
      stepPal(dt);
      if (state === 'play') stepPlay(dt);
      else if (state === 'dying') stepDying(dt);
      else if (state === 'menu' || state === 'over') stepAttract(dt);
      if (state !== 'paused') {
        stepParticles(dt);
        if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
        if (flash > 0) flash = Math.max(0, flash - dt * 2.5);
        if (ball.squash > 0) ball.squash = Math.max(0, ball.squash - dt * 5);
      }
    }

    function stepAttract(dt) {
      if (state === 'over') return; // frozen scene behind the result card
      objT += dt;
      var v = 9;
      ball.z += v * dt;
      ball.roll += (v * dt) / BR;
      var look = rowAt(ball.z + 3);
      var tu = (look ? look.safe : 0) + Math.sin(time * 0.7) * 1.2;
      ball.u += (tu - ball.u) * Math.min(1, dt * 1.5);
      ball.y = surfAt(ball.z);
      ensureTrack();
      updateCamera(dt, v);
    }

    function stepPlay(dt) {
      runT += dt;
      objT += dt;
      if (AUTO) autopilot();
      dist = Math.max(0, ball.z - 2);
      if (ball.boostT > 0) ball.boostT = Math.max(0, ball.boostT - dt);
      speed = speedAt(dist) * (1 + 0.38 * (ball.boostT / BOOST_T));
      var r = rowAt(ball.z);
      var curv = r ? r.curv : 0;
      ball.z += speed * dt;
      ball.roll += (speed * dt) / BR;
      // steering with momentum + sideways drift on curves
      var dir = inputDir();
      var acc = dir * STEER * (ball.ground ? 1 : 0.75) - curv * speed * speed * CF;
      ball.vu += acc * dt;
      ball.vu -= ball.vu * (dir ? 2.2 : 6.5) * dt;
      ball.vu = clamp(ball.vu, -VMOVE, VMOVE);
      ball.u += ball.vu * dt;

      // vertical
      r = rowAt(ball.z);
      var surf = surfAt(ball.z), slope = r ? (r.y1 - r.y0) / SEG : 0;
      var tile = ball.falling ? 0 : supportAt(ball.z, ball.u);
      if (ball.jbuf > 0) ball.jbuf -= dt;
      if (ball.coyote > 0) ball.coyote -= dt;
      if (ball.ground) {
        if (!tile) {
          ball.ground = false;
          ball.coyote = 0.35 / speed + 0.02; // a sliver of time to still jump off the lip
          ball.vy = Math.min(0, slope * speed);
        } else {
          ball.y = surf;
          ball.vy = slope * speed;
        }
      }
      // pads win over a buffered jump, so pressing jump on a pad never wastes it
      if (ball.ground && tile === T_PAD) jump(PAD_V, true);
      else if (ball.jbuf > 0 && !ball.falling && (ball.ground || ball.coyote > 0)) jump(JUMP_V, false);
      if (!ball.ground) {
        ball.vy -= G * dt;
        ball.y += ball.vy * dt;
        if (!ball.falling) {
          var above = ball.y - surf;
          if (above <= 0 && tile && above > -0.5) land(surf);
          else if (!tile && above < 0.12 && ball.coyote <= 0) fallStart();
          else if (above < -0.35) fallStart();
        }
      }
      if (ball.ground && !ball.falling) {
        if (tile === T_BOOST) {
          if (ball.boostT < BOOST_T - 0.5) {
            ball.boostT = BOOST_T;
            bonus += 25;
            ctx.sfx('boost');
            emitBall(10, C.edge2, 0.5);
          }
        } else if (tile === T_SPIKE) {
          crash('spike');
          return;
        }
      }
      if (ball.falling) {
        if (ball.y < camYFrozen - CAM_H - 3.2) { die(); return; }
      }
      if (!ball.falling && hitObstacles()) { crash('crash'); return; }
      collect();
      pushTrail();
      ensureTrack();
      updateCamera(dt, speed);
    }

    function jump(v, pad) {
      ball.ground = false;
      ball.coyote = 0;
      ball.jbuf = 0;
      ball.vy = v;
      if (pad) {
        ctx.sfx({ f: 260, f2: 1100, d: 0.28, type: 'square', v: 0.07 });
        emitBall(12, rgb(P.sunA), 0.6);
        shake = Math.max(shake, 0.08);
      } else {
        ctx.sfx('jump');
        emitBall(5, C.edge, 0.35);
      }
    }
    function land(surf) {
      var impact = -ball.vy;
      ball.y = surf;
      ball.vy = 0;
      ball.ground = true;
      ball.squash = clamp(impact / 16, 0.15, 1);
      ctx.sfx({ f: 150, f2: 70, d: 0.08, type: 'triangle', v: 0.06 + clamp(impact / 200, 0, 0.08) });
      emitBall(6, C.edge, 0.35);
      if (impact > 13) shake = Math.max(shake, 0.12);
    }
    function fallStart() {
      if (ball.falling) return;
      ball.falling = true;
      ball.ground = false;
      camYFrozen = camY;
      ctx.sfx({ f: 520, f2: 90, d: 0.7, type: 'sawtooth', v: 0.07 });
    }
    function hitObstacles() {
      var i0 = Math.floor(ball.z / SEG) - rowBase;
      var bz = ball.z, bu = ball.u, rr = BR * 0.82;
      for (var i = i0 - 1; i <= i0 + 1; i++) {
        var r = rows[i];
        if (!r) continue;
        var z0 = (i + rowBase) * SEG;
        var by = ball.y + BR - (r.y0 + r.y1) / 2; // ball centre above this row
        for (var k = 0; k < r.n; k++) {
          var t = r.t[k];
          if (t !== T_PILLAR && t !== T_WALL) continue;
          var u0 = colU(r.n, k) - 0.5;
          if (t === T_PILLAR) {
            if (sphereBox(bz, bu, by, rr, z0 + 0.1, z0 + 0.9, u0 + 0.08, u0 + 0.92, 0, PILLAR_H)) return true;
          } else if (sphereBox(bz, bu, by, rr, z0 + 0.38, z0 + 0.62, u0, u0 + 1, 0, WALL_H)) return true;
        }
        if (r.mv) {
          var mu = moverU(r);
          if (sphereBox(bz, bu, by, rr, z0 + 0.2, z0 + 0.8, mu - 0.45, mu + 0.45, 0, MOVER_H)) return true;
        }
      }
      return false;
    }
    function sphereBox(z, u, y, rad, za, zb, ua, ub, ya, yb) {
      var dz = z < za ? za - z : z > zb ? z - zb : 0;
      var du = u < ua ? ua - u : u > ub ? u - ub : 0;
      var dy = y < ya ? ya - y : y > yb ? y - yb : 0;
      return dz * dz + du * du + dy * dy < rad * rad;
    }
    function collect() {
      var i0 = Math.floor(ball.z / SEG) - rowBase;
      for (var i = i0 - 1; i <= i0 + 1; i++) {
        var r = rows[i];
        if (!r) continue;
        var z0 = (i + rowBase) * SEG;
        if (r.gate && !r.passed && ball.z > z0 + 0.5) {
          r.passed = true;
          stage++;
          bonus += 100;
          setPal(stage, false);
          ctx.sfx('levelup');
          flash = 0.5;
          toast('Stage ' + (stage + 1) + ' · ' + PALS[stage % PALS.length].name);
        }
        if (!r.gem || r.got) continue;
        var gy = (r.y0 + r.y1) / 2 + r.gemH;
        if (Math.abs(z0 + 0.5 - ball.z) < 0.6 && Math.abs(r.gemU - ball.u) < 0.62 && Math.abs(gy - (ball.y + BR)) < 0.8) {
          r.got = true;
          gems++;
          ctx.sfx('coin');
          if (proj(z0 + 0.5, r.gemU, gy)) emitAt(SX, SY, 8, '#ffffff', 0.45);
        }
      }
    }
    function crash(kind) {
      if (state !== 'play') return;
      state = 'dying';
      deathKind = kind;
      deadT = 0;
      ctx.sfx('explode');
      shake = 0.55;
      flash = 0.35;
      if (proj(ball.z, ball.u, ball.y + BR)) {
        emitAt(SX, SY, 26, orb.b, 0.9);
        emitAt(SX, SY, 18, orb.a, 0.7);
        emitAt(SX, SY, 10, C.hazard, 0.6);
      }
    }
    function die() {
      if (state !== 'play') return;
      state = 'dying';
      deathKind = 'fall';
      deadT = 0;
      ctx.sfx('lose');
    }
    function stepDying(dt) {
      deadT += dt;
      objT += dt;
      if (deathKind === 'fall') {
        ball.vy -= G * dt;
        ball.y += ball.vy * dt;
        ball.z += speed * dt * 0.5;
        ball.u += ball.vu * dt;
      }
      updateCamera(dt, deathKind === 'fall' ? speed * 0.3 : 0);
      if (deadT > 1.15) gameOver();
    }
    function gameOver() {
      state = 'over';
      overAt = time;
      var score = Math.floor(dist) + gems * 10 + bonus;
      var isBest = score > best;
      if (isBest) { best = score; store.set('best', best); }
      if (Math.floor(dist) > bestDist) { bestDist = Math.floor(dist); store.set('bestDist', bestDist); }
      var before = gemsTotal;
      gemsTotal += gems;
      store.set('gems', gemsTotal);
      newOrbMsg = '';
      for (var i = 0; i < ORBS.length; i++) if (ORBS[i].need > before && ORBS[i].need <= gemsTotal) newOrbMsg = ORBS[i].name;
      if (isBest && runsPlayed > 1) ctx.sfx('win');
      showOver(score, isBest);
    }

    function snapCamera() {
      camZ = ball.z - CAM_BACK;
      camU = ball.u * 0.62;
      camY = surfAt(ball.z) + CAM_H;
      camHeading();
      tilt = 0;
    }
    function camHeading() {
      var r = rowAt(camZ);
      if (!r) r = rows[0];
      if (!r) return;
      var f = camZ - Math.floor(camZ / SEG) * SEG;
      if (camZ < rowBase * SEG) f = 0;
      camCX = r.x0 + r.dx0 * f + 0.5 * r.curv * f * f;
      camDX = r.dx0 + r.curv * f;
    }
    function updateCamera(dt, v) {
      camZ = ball.z - CAM_BACK;
      camHeading();
      var k = 1 - Math.exp(-dt * 8);
      camU += (ball.u * 0.62 - camU) * k;
      var sb = surfAt(ball.z);
      var ty = ball.falling || deathKind === 'fall' ? camYFrozen : sb + Math.max(0, ball.y - sb) * 0.45 + CAM_H;
      camY += (ty - camY) * (1 - Math.exp(-dt * 7));
      var r = rowAt(ball.z);
      var tt = r ? clamp(-r.curv * v * 1.5, -0.07, 0.07) : 0;
      tilt += (tt - tilt) * (1 - Math.exp(-dt * 3));
    }

    /* ---------- trail (world positions, ring buffer) ---------- */
    var TRN = 14, trZ = new Float32Array(TRN), trU = new Float32Array(TRN), trY = new Float32Array(TRN), trHead = 0, trailN = 0;
    function pushTrail() {
      trHead = (trHead + 1) % TRN;
      trZ[trHead] = ball.z; trU[trHead] = ball.u; trY[trHead] = ball.y + BR;
      if (trailN < TRN) trailN++;
    }

    /* ------------------------------------------------------------------ */
    /* Projection                                                         */
    /* ------------------------------------------------------------------ */
    function proj(z, u, y) {
      var dz = z - camZ;
      if (dz < NEAR * 0.5) return false;
      var r = rowAt(z), cx;
      if (r) {
        var f = z - Math.floor(z / SEG) * SEG;
        cx = r.x0 + r.dx0 * f + 0.5 * r.curv * f * f;
      } else cx = camCX + camDX * dz;
      var s = F / dz;
      SX = CX + (cx - camCX - camDX * dz + u - camU) * s;
      SY = HY + (camY - y) * s;
      SS = s;
      return true;
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                          */
    /* ------------------------------------------------------------------ */
    var stars = [];
    for (var si = 0; si < 70; si++) stars.push({ x: R(), y: R() * R(), s: 0.6 + R() * 1.4, tw: R() * 6 });
    var mtn = [];
    for (var mi = 0; mi < 40; mi++) mtn.push(0.25 + R() * 0.75 * (mi % 3 === 0 ? 1 : 0.55));

    function render() {
      g.save();
      if (shake > 0) g.translate((R() - 0.5) * shake * UI * 0.05, (R() - 0.5) * shake * UI * 0.05);
      if (tilt) { g.translate(CX, HY); g.rotate(tilt); g.translate(-CX, -HY); }
      drawBackdrop();
      drawTrack();
      drawParticles();
      g.restore();
      if (state === 'play' && (speed > 19 || ball.boostT > 0)) drawSpeedLines();
      if (flash > 0) { g.fillStyle = 'rgba(255,255,255,' + (flash * 0.45).toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }
      if (state === 'dying') { g.fillStyle = 'rgba(5,0,15,' + clamp(deadT - 0.5, 0, 0.55).toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }
      if (state === 'play' && runT < 4.5 && runsPlayed <= 3) drawHelp();
      if (state === 'play' && ptr && !ptr.mouse) drawStick();
      updateHud();
    }

    function drawBackdrop() {
      var ext = VW * 0.25;
      var sky = g.createLinearGradient(0, 0, 0, HY);
      sky.addColorStop(0, rgb(P.skyTop));
      sky.addColorStop(0.6, C.skyMid);
      sky.addColorStop(1, C.horizon);
      g.fillStyle = sky;
      g.fillRect(-ext, -ext, VW + ext * 2, HY + ext);
      // stars
      var sOff = -camDX * F * 0.3;
      g.fillStyle = '#ffffff';
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var x = (((st.x * (VW + ext * 2) + sOff) % (VW + ext * 2)) + (VW + ext * 2)) % (VW + ext * 2) - ext;
        var y = st.y * HY * 0.8;
        g.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.7 + st.tw);
        g.fillRect(x, y, st.s, st.s);
      }
      g.globalAlpha = 1;
      // striped synthwave sun sitting on the horizon, in the world-forward direction
      var vpx = CX - camDX * F;
      var sr = UI * 0.19, sy = HY - sr * 0.28;
      g.save();
      g.beginPath();
      g.arc(vpx, sy, sr, 0, TAU);
      g.clip();
      var sg = g.createLinearGradient(0, sy - sr, 0, sy + sr * 0.5);
      sg.addColorStop(0, rgb(P.sunA));
      sg.addColorStop(1, rgb(P.sunB));
      g.fillStyle = sg;
      g.fillRect(vpx - sr, sy - sr, sr * 2, sr * 2);
      g.fillStyle = C.horizon;
      for (var b = 0; b < 6; b++) {
        var by = sy - sr * 0.1 + b * sr * 0.16, bh = sr * (0.025 + b * 0.016);
        g.fillRect(vpx - sr, by, sr * 2, bh);
      }
      g.restore();
      // sun haze
      g.globalAlpha = 0.25;
      g.fillStyle = rgb(P.sunB);
      g.beginPath(); g.arc(vpx, sy, sr * 1.25, 0, TAU); g.fill();
      g.globalAlpha = 1;
      // wireframe mountains with parallax
      var mw = Math.max(VW, VH) / 13, mOff = -camDX * F * 0.6 - ((camZ * 0.15) % (mw * mtn.length));
      g.beginPath();
      g.moveTo(-ext, HY);
      var start = Math.floor((-ext - mOff) / mw) - 1, end = Math.ceil((VW + ext - mOff) / mw) + 1;
      for (var j = start; j <= end; j++) {
        var hgt = mtn[((j % mtn.length) + mtn.length) % mtn.length];
        g.lineTo(mOff + j * mw, HY - hgt * UI * 0.14);
      }
      g.lineTo(VW + ext, HY);
      g.closePath();
      g.fillStyle = C.mount;
      g.fill();
      g.strokeStyle = C.glow2;
      g.lineWidth = 3;
      g.stroke();
      g.strokeStyle = C.edge2;
      g.lineWidth = 1;
      g.globalAlpha = 0.7;
      g.stroke();
      g.globalAlpha = 1;
      // ground plane + perspective grid far below the skyway
      var gg = g.createLinearGradient(0, HY, 0, VH);
      gg.addColorStop(0, rgba(P.horizon, 0.55));
      gg.addColorStop(0.08, rgb(P.ground));
      gg.addColorStop(1, rgb(P.ground));
      g.fillStyle = gg;
      g.fillRect(-ext, HY, VW + ext * 2, VH - HY + ext);
      var gy = camY - 9, dh = camY - gy, GZ = 3, GX = 3;
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      // horizontal lines (constant z) scroll toward the camera
      var z = Math.ceil((camZ + 1.5) / GZ) * GZ;
      for (; z < camZ + 110; z += GZ) {
        var dz = z - camZ, yy = HY + (dh * F) / dz;
        if (yy > VH + ext) continue;
        g.globalAlpha = clamp(1.1 - dz / 110, 0, 1) * 0.55;
        g.beginPath(); g.moveTo(-ext, yy); g.lineTo(VW + ext, yy); g.stroke();
      }
      // lines along world z converge on the sun
      var wx = camCX + camU, k0 = Math.floor((wx - 60) / GX), k1 = Math.ceil((wx + 60) / GX);
      g.globalAlpha = 0.4;
      g.beginPath();
      for (var kk = k0; kk <= k1; kk++) {
        var ox = kk * GX - wx;
        var dn = 1.5, df = 110;
        g.moveTo(CX + ((ox - camDX * dn) * F) / dn, HY + (dh * F) / dn);
        g.lineTo(CX + ((ox - camDX * df) * F) / df, HY + (dh * F) / df);
      }
      g.stroke();
      g.globalAlpha = 1;
    }

    var NX = new Float32Array(MAXW + 1), FX = new Float32Array(MAXW + 1);
    function drawTrack() {
      if (!rows.length) return;
      var iFar = Math.min(rows.length - 1, Math.floor((camZ + VIEW) / SEG) - rowBase);
      var iNear = Math.max(0, Math.floor((camZ + NEAR) / SEG) - rowBase);
      var iBall = Math.floor(ball.z / SEG) - rowBase;
      var drawn = false;
      for (var i = iFar; i >= iNear; i--) {
        drawRow(i);
        if (i === iBall) { drawBall(); drawn = true; }
      }
      if (!drawn) drawBall();
      g.globalAlpha = 1;
    }

    function drawRow(i) {
      var r = rows[i];
      var z0 = (i + rowBase) * SEG, z1 = z0 + SEG;
      var zn = Math.max(z0, camZ + NEAR);
      if (z1 <= zn) return;
      var d0 = zn - camZ, d1 = z1 - camZ;
      var al = clamp((VIEW - d0) / 16, 0, 1);
      if (al <= 0.02) return;
      var f0 = zn - z0, s0 = F / d0, s1 = F / d1;
      var xc0 = r.x0 + r.dx0 * f0 + 0.5 * r.curv * f0 * f0 - camCX - camDX * d0 - camU;
      var xc1 = r.x0 + r.dx0 * SEG + 0.5 * r.curv * SEG * SEG - camCX - camDX * d1 - camU;
      var y0 = r.y0 + ((r.y1 - r.y0) * f0) / SEG, y1 = r.y1;
      var sy0 = HY + (camY - y0) * s0, sy1 = HY + (camY - y1) * s1;
      var by0 = sy0 + THICK * s0, by1 = sy1 + THICK * s1;
      var n = r.n, half = (n * TW) / 2, k, any = false;
      for (k = 0; k <= n; k++) {
        var u = -half + k * TW;
        NX[k] = CX + (xc0 + u) * s0;
        FX[k] = CX + (xc1 + u) * s1;
      }
      for (k = 0; k < n; k++) if (r.t[k]) { any = true; break; }
      g.globalAlpha = al;
      if (any) {
        var nr = i > 0 ? rows[i - 1] : null;
        // slab faces (front where exposed, outer sides)
        g.beginPath();
        for (k = 0; k < n; k++) {
          if (!r.t[k]) continue;
          if (!nr || nr.n !== n || !nr.t[k] || Math.abs(nr.y1 - r.y0) > 0.05 || z0 < camZ + NEAR) {
            g.moveTo(NX[k], sy0); g.lineTo(NX[k + 1], sy0); g.lineTo(NX[k + 1], by0); g.lineTo(NX[k], by0); g.closePath();
          }
          if ((k === 0 || !r.t[k - 1]) && NX[k] > CX) {
            g.moveTo(NX[k], sy0); g.lineTo(FX[k], sy1); g.lineTo(FX[k], by1); g.lineTo(NX[k], by0); g.closePath();
          }
          if ((k === n - 1 || !r.t[k + 1]) && NX[k + 1] < CX) {
            g.moveTo(NX[k + 1], sy0); g.lineTo(FX[k + 1], sy1); g.lineTo(FX[k + 1], by1); g.lineTo(NX[k + 1], by0); g.closePath();
          }
        }
        g.fillStyle = C.face;
        g.fill();
        g.strokeStyle = C.edgeA;
        g.lineWidth = 1;
        g.stroke();
        // tile tops, batched by colour
        topPass(r, T_FLOOR, (i + rowBase) % 2 ? C.tile : C.tileHi, sy0, sy1);
        topPass(r, T_SPIKE, C.hazardFace, sy0, sy1);
        topPass(r, T_BOOST, C.edge2, sy0, sy1);
        topPass(r, T_PAD, rgb(P.sunA), sy0, sy1);
        // neon tile outlines + bright outer rails
        var lw = clamp(s0 * 0.022, 0.6, 3.2);
        g.beginPath();
        for (k = 0; k < n; k++) {
          if (!r.t[k]) continue;
          g.moveTo(NX[k], sy0); g.lineTo(NX[k + 1], sy0); g.lineTo(FX[k + 1], sy1); g.lineTo(FX[k], sy1); g.closePath();
        }
        if (d0 < 22) { g.strokeStyle = C.glow; g.lineWidth = lw * 3.2; g.stroke(); }
        g.strokeStyle = C.edge;
        g.lineWidth = lw;
        g.stroke();
        g.beginPath();
        for (k = 0; k < n; k++) {
          if (!r.t[k]) continue;
          if (k === 0 || !r.t[k - 1]) { g.moveTo(NX[k], sy0); g.lineTo(FX[k], sy1); }
          if (k === n - 1 || !r.t[k + 1]) { g.moveTo(NX[k + 1], sy0); g.lineTo(FX[k + 1], sy1); }
        }
        g.strokeStyle = C.edge2;
        g.lineWidth = lw * 1.6;
        g.stroke();
        // tile decorations / obstacles
        for (k = 0; k < n; k++) {
          var t = r.t[k];
          if (t === T_BOOST) drawChevrons(k, sy0, sy1, i);
          else if (t === T_PAD) drawPadMark(k, sy0, sy1);
          else if (t === T_SPIKE) drawSpikes(r, z0, k);
        }
        for (k = 0; k < n; k++) {
          var t2 = r.t[k];
          if (t2 === T_PILLAR || t2 === T_WALL) {
            var ua = colU(n, k) - 0.5;
            if (t2 === T_PILLAR) drawBox(z0 + 0.1, z0 + 0.9, ua + 0.08, ua + 0.92, r.y0, r.y0 + PILLAR_H, al);
            else drawBox(z0 + 0.38, z0 + 0.62, ua + 0.02, ua + 0.98, r.y0, r.y0 + WALL_H, al);
          }
        }
      }
      if (r.mv) {
        var mu = moverU(r);
        drawBox(z0 + 0.2, z0 + 0.8, mu - 0.45, mu + 0.45, r.y0, r.y0 + MOVER_H, al);
      }
      if (r.gate) drawGate(r, z0 + 0.5, al);
      if (r.gem && !r.got) drawGem(r, z0 + 0.5, al);
      g.globalAlpha = 1;
    }

    function topPass(r, type, col, sy0, sy1) {
      var anyT = false;
      g.beginPath();
      for (var k = 0; k < r.n; k++) {
        var t = r.t[k];
        if (t === type || (type === T_FLOOR && (t === T_WALL || t === T_PILLAR))) {
          g.moveTo(NX[k], sy0); g.lineTo(NX[k + 1], sy0); g.lineTo(FX[k + 1], sy1); g.lineTo(FX[k], sy1); g.closePath();
          anyT = true;
        }
      }
      if (anyT) { g.fillStyle = col; g.fill(); }
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function drawChevrons(k, sy0, sy1, i) {
      var ph = (time * 2.5 + i * 0.5) % 1;
      g.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.4 * Math.sin(ph * TAU)).toFixed(3) + ')';
      g.lineWidth = Math.max(1, (sy0 - sy1) * 0.12);
      g.beginPath();
      for (var c = 0; c < 2; c++) {
        var ta = 0.25 + c * 0.35, tb = ta + 0.25;
        var ax = lerp(NX[k], FX[k], ta), bx = lerp(NX[k + 1], FX[k + 1], ta);
        var cx = lerp(lerp(NX[k], NX[k + 1], 0.5), lerp(FX[k], FX[k + 1], 0.5), tb);
        var ay = lerp(sy0, sy1, ta), cy = lerp(sy0, sy1, tb);
        g.moveTo(lerp(ax, bx, 0.18), ay); g.lineTo(cx, cy); g.lineTo(lerp(ax, bx, 0.82), ay);
      }
      g.stroke();
    }
    function drawPadMark(k, sy0, sy1) {
      var p = 0.5 + 0.5 * Math.sin(time * 9);
      var mx0 = (NX[k] + NX[k + 1]) / 2, mx1 = (FX[k] + FX[k + 1]) / 2;
      var cx = (mx0 + mx1) / 2, cy = (sy0 + sy1) / 2;
      var w = Math.abs(NX[k + 1] - NX[k]) * 0.32, h = Math.abs(sy0 - sy1) * 0.35;
      g.fillStyle = 'rgba(40,20,0,' + (0.55 + p * 0.3).toFixed(3) + ')';
      g.beginPath(); g.moveTo(cx - w, cy + h); g.lineTo(cx, cy - h); g.lineTo(cx + w, cy + h); g.closePath(); g.fill();
    }
    function drawSpikes(r, z0, k) {
      var ua = colU(r.n, k) - 0.5;
      g.fillStyle = C.hazard;
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 1;
      for (var row = 0; row < 2; row++) {
        var zz = z0 + 0.3 + row * 0.42, yb = r.y0 + ((r.y1 - r.y0) * (zz - z0)) / SEG;
        for (var s = 0; s < 3; s++) {
          var a = ua + 0.1 + s * 0.28 + (row ? 0.12 : 0);
          if (a + 0.26 > ua + 1) continue;
          if (!proj(zz, a, yb)) continue;
          var x1 = SX, y1 = SY;
          proj(zz, a + 0.26, yb);
          var x2 = SX, y2 = SY;
          proj(zz, a + 0.13, yb + 0.42);
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(SX, SY); g.lineTo(x2, y2); g.closePath();
          g.fill(); g.stroke();
        }
      }
    }
    var BXs = new Float32Array(8), BYs = new Float32Array(8);
    // axis-aligned box in track space: corners 0-3 near (z=za), 4-7 far; order bl, br, tr, tl
    function drawBox(za, zb, ua, ub, ya, yb, al) {
      for (var i = 0; i < 8; i++) {
        var m = i & 3;
        if (!proj(i < 4 ? za : zb, m === 1 || m === 2 ? ub : ua, m >= 2 ? yb : ya)) return;
        BXs[i] = SX; BYs[i] = SY;
      }
      var hz = C.hazard;
      g.globalAlpha = al;
      // side face facing the camera
      if (BXs[0] > CX) quad(0, 4, 7, 3, C.hazardFace);
      else if (BXs[1] < CX) quad(1, 5, 6, 2, C.hazardFace);
      // top (if camera is above it)
      if (camY > yb) quad(3, 2, 6, 7, C.hazardDim);
      quad(0, 1, 2, 3, C.hazardFace);
      // neon outline of the front face + top
      var lw = clamp(SS * 0.03, 0.8, 3);
      g.beginPath();
      g.moveTo(BXs[0], BYs[0]); g.lineTo(BXs[1], BYs[1]); g.lineTo(BXs[2], BYs[2]); g.lineTo(BXs[3], BYs[3]); g.closePath();
      g.moveTo(BXs[3], BYs[3]); g.lineTo(BXs[7], BYs[7]); g.lineTo(BXs[6], BYs[6]); g.lineTo(BXs[2], BYs[2]);
      g.strokeStyle = C.hazardDim;
      g.lineWidth = lw * 3;
      g.stroke();
      g.strokeStyle = hz;
      g.lineWidth = lw;
      g.stroke();
      // warning stripe
      g.beginPath();
      var mx = (BYs[0] + BYs[3]) / 2;
      g.moveTo(BXs[0], mx); g.lineTo(BXs[1], (BYs[1] + BYs[2]) / 2);
      g.stroke();
    }
    function quad(a, b, c2, d, col) {
      g.beginPath();
      g.moveTo(BXs[a], BYs[a]); g.lineTo(BXs[b], BYs[b]); g.lineTo(BXs[c2], BYs[c2]); g.lineTo(BXs[d], BYs[d]); g.closePath();
      g.fillStyle = col;
      g.fill();
    }
    function drawGem(r, zc, al) {
      var gy = (r.y0 + r.y1) / 2 + r.gemH + Math.sin(time * 4 + zc) * 0.06;
      if (!proj(zc, r.gemU, gy)) return;
      al *= clamp((zc - camZ - 3.2) / 1.2, 0, 1); // fade gems the orb has flown past
      if (al <= 0.02) return;
      var s = SS * 0.2;
      if (s < 0.8) return;
      var sp = 0.35 + Math.abs(Math.cos(time * 3 + zc * 0.7)) * 0.65;
      g.globalAlpha = al * 0.35;
      g.fillStyle = C.edge;
      g.beginPath(); g.arc(SX, SY, s * 1.9, 0, TAU); g.fill();
      g.globalAlpha = al;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(SX, SY - s * 1.3); g.lineTo(SX + s * sp, SY); g.lineTo(SX, SY + s * 1.3); g.lineTo(SX - s * sp, SY); g.closePath();
      g.fill();
      g.fillStyle = C.edge2;
      g.beginPath();
      g.moveTo(SX, SY); g.lineTo(SX + s * sp, SY); g.lineTo(SX, SY + s * 1.3); g.closePath();
      g.fill();
    }
    function drawGate(r, zc, al) {
      var half = (r.n * TW) / 2 + 0.25, yb = r.y0, yt = r.y0 + 2.9;
      if (!proj(zc, -half, yb)) return;
      var ax = SX, ay = SY;
      proj(zc, -half, yt); var bx = SX, bY = SY;
      proj(zc, half, yt); var cx = SX, cy = SY;
      proj(zc, half, yb); var dx = SX, dy = SY;
      var s = SS;
      var nextPal = PALS[(r.gate - 1) % PALS.length];
      g.globalAlpha = al;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, bY); g.lineTo(cx, cy); g.lineTo(dx, dy);
      g.strokeStyle = rgba(nextPal.edge, 0.3);
      g.lineWidth = Math.max(3, s * 0.3);
      g.stroke();
      g.strokeStyle = rgb(nextPal.edge);
      g.lineWidth = Math.max(1.5, s * 0.1);
      g.stroke();
      g.lineCap = 'butt';
      var fs = s * 0.42;
      if (fs > 7) {
        g.font = '900 ' + Math.round(fs) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        g.fillStyle = rgb(nextPal.edge2);
        g.fillText('STAGE ' + r.gate, (bx + cx) / 2, (bY + cy) / 2 - s * 0.12);
      }
    }

    function drawBall() {
      if (state === 'dying' && deathKind !== 'fall') return;
      if (!rows.length) return;
      // shadow on the track while airborne
      if (!ball.ground && !ball.falling) {
        var sf = surfAt(ball.z);
        if (supportAt(ball.z, ball.u) && proj(ball.z, ball.u, sf)) {
          var h = ball.y - sf;
          g.globalAlpha = clamp(0.5 - h * 0.1, 0.1, 0.5);
          g.fillStyle = '#000';
          g.beginPath(); g.ellipse(SX, SY, BR * SS * clamp(1 - h * 0.12, 0.4, 1), BR * SS * 0.3, 0, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
      }
      // light trail: one polyline stroked twice (a single path never double-blends its joints)
      if (state === 'play' && trailN > 2 && proj(ball.z, ball.u, ball.y + BR)) {
        var bw = BR * SS, started = false;
        g.beginPath();
        for (var j = trailN - 1; j >= 0; j--) {
          var idx = (trHead - j + TRN) % TRN;
          if (!proj(trZ[idx], trU[idx], trY[idx])) continue;
          if (!started) { g.moveTo(SX, SY); started = true; } else g.lineTo(SX, SY);
        }
        g.globalCompositeOperation = 'lighter';
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = rgba(orb.rainbow ? hueGlow() : orb.glow, 0.16);
        g.lineWidth = bw * 1.5;
        g.stroke();
        g.strokeStyle = rgba(orb.rainbow ? hueGlow() : orb.glow, 0.45);
        g.lineWidth = Math.max(1, bw * 0.45);
        g.stroke();
        g.lineCap = 'butt'; g.lineJoin = 'miter';
        g.globalCompositeOperation = 'source-over';
      }
      if (!proj(ball.z, ball.u, ball.y + BR)) return;
      var x = SX, y = SY, rr = BR * SS;
      if (deathKind === 'fall') rr *= clamp(1 - deadT * 0.5, 0.3, 1);
      var sq = ball.squash * 0.22;
      var rx = rr * (1 + sq), ry = rr * (1 - sq);
      y += rr - ry;
      // glow
      g.globalCompositeOperation = 'lighter';
      var gl = g.createRadialGradient(x, y, rr * 0.4, x, y, rr * 2.3);
      var gc = orb.rainbow ? hueGlow() : orb.glow;
      gl.addColorStop(0, rgba(gc, 0.55));
      gl.addColorStop(1, rgba(gc, 0));
      g.fillStyle = gl;
      g.beginPath(); g.arc(x, y, rr * 2.3, 0, TAU); g.fill();
      g.globalCompositeOperation = 'source-over';
      // body
      var bg = g.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rr * 0.1, x, y, rr);
      bg.addColorStop(0, orb.a);
      bg.addColorStop(1, orb.rainbow ? rgb(hueGlow()) : orb.b);
      g.fillStyle = bg;
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
      if (orb.rim) { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, rr * 0.08); g.stroke(); }
      // rolling bands: two latitude lines sweeping down the visible face
      g.save();
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.clip();
      g.strokeStyle = orb.rim ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.55)';
      g.lineWidth = Math.max(1, rr * 0.1);
      for (var b = 0; b < 2; b++) {
        var ph = (ball.roll + b * Math.PI) % TAU;
        var cy2 = Math.cos(ph);
        if (Math.sin(ph) < 0) continue;
        var w = Math.sqrt(Math.max(0, 1 - cy2 * cy2));
        // only the near half of each latitude ring faces the camera
        g.beginPath(); g.ellipse(x, y - cy2 * ry, rx * w, rr * 0.3 * w + 0.5, 0, 0, Math.PI); g.stroke();
      }
      g.restore();
    }
    var HG = [0, 0, 0];
    function hueGlow() {
      var h = (time * 0.25) % 1, i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f;
      var rgb3 = [[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][i % 6];
      HG[0] = 120 + rgb3[0] * 135; HG[1] = 120 + rgb3[1] * 135; HG[2] = 120 + rgb3[2] * 135;
      return HG;
    }

    var SL = [];
    for (var li = 0; li < 18; li++) SL.push({ a: R() * TAU, o: R() });
    function drawSpeedLines() {
      var k = clamp((speed - 17) / 9, 0, 1) + (ball.boostT > 0 ? 0.6 : 0);
      if (k <= 0) return;
      var vx = CX, vy = HY, maxR = Math.sqrt(VW * VW + VH * VH) * 0.6;
      g.strokeStyle = 'rgba(255,255,255,' + clamp(0.12 * k, 0, 0.2).toFixed(3) + ')';
      g.lineWidth = 1.5;
      g.beginPath();
      for (var i = 0; i < SL.length; i++) {
        var s = SL[i], t = (s.o + time * 1.6) % 1, r0 = maxR * (0.45 + t * 0.6), r1 = r0 + maxR * 0.12;
        g.moveTo(vx + Math.cos(s.a) * r0, vy + Math.sin(s.a) * r0 * 0.8);
        g.lineTo(vx + Math.cos(s.a) * r1, vy + Math.sin(s.a) * r1 * 0.8);
      }
      g.stroke();
    }

    /* ---------- particles (screen space) ---------- */
    var PMAX = 140, parts = [];
    for (var pi = 0; pi < PMAX; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, sz: 2, col: '#fff' });
    function emitAt(x, y, n, col, life) {
      var u = UI / 500, j = 0;
      for (var i = 0; i < n; i++) {
        for (; j < PMAX; j++) {
          var q = parts[j];
          if (q.on) continue;
          var a = R() * TAU, v = (60 + R() * 220) * u;
          q.on = true; q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v - 40 * u;
          q.life = q.max = life * (0.5 + R() * 0.5); q.sz = (2 + R() * 3) * u + 0.6; q.col = col;
          break;
        }
      }
    }
    function emitBall(n, col, life) {
      if (proj(ball.z, ball.u, ball.y + BR * 0.3)) emitAt(SX, SY, n, col, life);
    }
    function stepParticles(dt) {
      var gr = UI * 0.9;
      for (var i = 0; i < PMAX; i++) {
        var q = parts[i];
        if (!q.on) continue;
        q.life -= dt;
        if (q.life <= 0) { q.on = false; continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        q.vy += gr * dt;
        q.vx *= 0.97;
      }
    }
    function drawParticles() {
      g.globalCompositeOperation = 'lighter';
      for (var i = 0; i < PMAX; i++) {
        var q = parts[i];
        if (!q.on) continue;
        g.globalAlpha = clamp(q.life / q.max, 0, 1);
        g.fillStyle = q.col;
        g.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    function drawHelp() {
      var fs = clamp(UI * 0.04, 12, 21);
      var a = runT < 3.5 ? 1 : clamp(4.5 - runT, 0, 1);
      var lines = ctx.isTouch
        ? ['Drag left / right to steer', 'Tap ▲ (or flick up) to jump']
        : ['← → or A D to steer', 'Space / ↑ to jump'];
      g.globalAlpha = a;
      g.font = '800 ' + Math.round(fs) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      var w = 0, i;
      for (i = 0; i < lines.length; i++) w = Math.max(w, g.measureText(lines[i]).width);
      w = Math.min(VW - 16, w + fs * 1.4);
      var lh = fs * 1.35, y0 = Math.max(HY * 0.55, fs * 5.5);
      g.fillStyle = 'rgba(8,4,24,0.62)';
      g.fillRect(CX - w / 2, y0 - lh * 0.5 - fs * 0.35, w, lh * lines.length + fs * 0.7);
      g.fillStyle = '#fff';
      for (i = 0; i < lines.length; i++) g.fillText(lines[i], CX, y0 + i * lh, VW - 24);
      g.globalAlpha = 1;
    }
    function drawStick() {
      var rng = steerRange(), dx = clamp(ptr.x - ptr.x0, -rng, rng);
      g.globalAlpha = 0.35;
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(ptr.x0 - rng, ptr.y0); g.lineTo(ptr.x0 + rng, ptr.y0); g.stroke();
      g.globalAlpha = 0.6;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(ptr.x0 + dx, ptr.y0, Math.max(10, UI * 0.03), 0, TAU); g.fill();
      g.globalAlpha = 1;
    }

    /* ---------- HUD ---------- */
    var hudLast = '', hudOn = false, jumpOn = null;
    function updateHud() {
      var on = state === 'play' || state === 'paused' || state === 'dying';
      if (on !== hudOn) { hudOn = on; hud.classList.toggle('on', on); }
      var jOn = ctx.isTouch && state === 'play';
      if (jOn !== jumpOn) { jumpOn = jOn; jumpBtn.classList.toggle('on', jOn); }
      if (!on) return;
      var key = Math.floor(dist) + '|' + gems + '|' + stage;
      if (key !== hudLast) {
        hudLast = key;
        hudDist.textContent = fmtInt(dist) + ' m';
        hudGems.textContent = String(gems);
        hudStage.textContent = 'Stage ' + (stage + 1);
      }
    }
    function toast(txt) {
      if (destroyed) return;
      var t = IGAME.ui.toast(root, txt, 1700);
      if (t && t.style) { t.style.top = Math.round(UI / 30 * 4.2) + 'px'; t.style.fontSize = clamp(Math.round(UI / 32), 12, 17) + 'px'; }
    }

    /* ------------------------------------------------------------------ */
    /* Menus                                                              */
    /* ------------------------------------------------------------------ */
    function closeOverlay() { if (overlay) overlay.close(); overlay = null; overlayKind = ''; }
    // compact menu styling for small frames (phones in portrait)
    function fitOverlay() { if (overlay) overlay.el.classList.toggle('nr-sm', VH < 560 || VW < 440); }
    function howHtml() {
      return ctx.isTouch
        ? '<p class="nr-how">Drag left / right to steer · tap ▲ or flick up to jump · grab gems, hit the yellow pads and pink boost strips.</p>'
        : '<p class="nr-how"><span class="ig-kbd">←</span> <span class="ig-kbd">→</span> / <span class="ig-kbd">A</span> <span class="ig-kbd">D</span> steer · <span class="ig-kbd">Space</span> / <span class="ig-kbd">↑</span> jump · <span class="ig-kbd">P</span> pause. The orb keeps its momentum, so steer early.</p>';
    }
    function orbsHtml() {
      var h = '<div class="nr-orbs">';
      for (var i = 0; i < ORBS.length; i++) {
        var o = ORBS[i], locked = o.need > gemsTotal;
        var bgc = o.rainbow ? 'conic-gradient(#ff5ad9,#ffd84d,#5dff9d,#4de8ff,#a78bfa,#ff5ad9)' : 'radial-gradient(circle at 35% 30%,' + o.a + ',' + o.b + ')';
        h += '<button type="button" class="nr-orb' + (o.id === orbSel ? ' sel' : '') + '" data-orb="' + o.id + '" style="background:' + bgc + '"' + (locked ? ' disabled' : '') + ' aria-label="' + o.name + (locked ? ' (locked)' : '') + '" title="' + o.name + '">' + (locked ? '<small>◆' + o.need + '</small>' : '') + '</button>';
      }
      h += '</div><div class="nr-orbname">' + orb.name + ' · ' + fmtInt(gemsTotal) + ' gems collected</div>';
      return h;
    }
    function bindOrbs() {
      Array.prototype.forEach.call(overlay.panel.querySelectorAll('[data-orb]'), function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (btn.disabled) return;
          ctx.sfx('click');
          orbSel = btn.getAttribute('data-orb');
          orb = orbById(orbSel);
          store.set('orb', orbSel);
          Array.prototype.forEach.call(overlay.panel.querySelectorAll('[data-orb]'), function (b2) { b2.classList.toggle('sel', b2 === btn); });
          var nm = overlay.panel.querySelector('.nr-orbname');
          if (nm) nm.textContent = orb.name + ' · ' + fmtInt(gemsTotal) + ' gems collected';
        });
      });
    }
    function toAttract() {
      if (!gen.attract) { resetBall(); resetTrack(true); snapCamera(); }
    }
    function showTitle() {
      closeOverlay();
      state = 'menu';
      toAttract();
      overlayKind = 'title';
      overlay = IGAME.ui.overlay(root, {
        title: 'Neon Orb Rush',
        text: 'Roll the neon skyway. Jump the gaps, dodge the spikes — don’t fall.',
        html: '<div class="nr-stats"><div class="nr-stat"><span>Best score</span><b>' + fmtInt(best) + '</b></div><div class="nr-stat"><span>Best distance</span><b>' + fmtInt(bestDist) + ' m</b></div></div>' + orbsHtml() + howHtml(),
        buttons: [{ label: '▶ Roll', primary: true, onClick: startRun }],
        focus: false,
      });
      fitOverlay();
      bindOrbs();
    }
    function showOver(score, isBest) {
      closeOverlay();
      overlayKind = 'over';
      var title = deathKind === 'fall' ? 'Off the edge!' : deathKind === 'spike' ? 'Spiked!' : deathKind === 'quit' ? 'Run ended' : 'Crashed!';
      overlay = IGAME.ui.overlay(root, {
        title: title,
        text: 'Stage ' + (stage + 1) + ' · ' + PALS[stage % PALS.length].name,
        html: (isBest ? '<div class="nr-new">New best score!</div>' : '') +
          (newOrbMsg ? '<div class="nr-new">Unlocked: ' + newOrbMsg + '</div>' : '') +
          '<div class="nr-stats"><div class="nr-stat"><span>Score</span><b>' + fmtInt(score) + '</b></div><div class="nr-stat"><span>Best</span><b>' + fmtInt(best) + '</b></div>' +
          '<div class="nr-stat"><span>Distance</span><b>' + fmtInt(dist) + ' m</b></div><div class="nr-stat"><span>Gems</span><b>' + gems + '</b></div></div>' +
          '<p class="nr-how">Score = metres + 10 per gem + boost &amp; stage bonuses. ' + (ctx.isTouch ? 'Tap Retry to roll again.' : 'Press <span class="ig-kbd">Space</span> to retry.') + '</p>',
        buttons: [{ label: '↻ Retry', primary: true, onClick: startRun }, { label: 'Menu', onClick: showTitle }],
        focus: false,
      });
      fitOverlay();
    }
    function showPause() {
      closeOverlay();
      overlayKind = 'pause';
      overlay = IGAME.ui.overlay(root, {
        title: 'Paused',
        text: fmtInt(dist) + ' m · ' + gems + ' gems · Stage ' + (stage + 1),
        buttons: [{ label: '▶ Resume', primary: true, onClick: resumeGame }, { label: 'End run', onClick: function () { closeOverlay(); state = 'dying'; deathKind = 'quit'; deadT = 2; } }],
        focus: false,
      });
    }
    function pauseGame() { if (state !== 'play') return; state = 'paused'; ptr = null; showPause(); }
    function resumeGame() { if (state !== 'paused') return; closeOverlay(); state = 'play'; ctx.focus(); }

    /* ------------------------------------------------------------------ */
    /* Boot                                                               */
    /* ------------------------------------------------------------------ */
    resetTrack(true);
    snapCamera();
    var loop = IGAME.loop(function (dt) { update(dt); render(); });
    loop.start();
    showTitle();

    if (ctx.debug) {
      window.__nr = {
        state: function () { return { state: state, z: +ball.z.toFixed(1), u: +ball.u.toFixed(2), y: +ball.y.toFixed(2), ground: ball.ground, falling: ball.falling, speed: +speed.toFixed(1), dist: Math.floor(dist), gems: gems, stage: stage, rows: rows.length, death: deathKind }; },
        start: startRun,
        warp: function (z) { ball.z = z; ensureTrack(); var r = rowAt(z); ball.y = surfAt(z); ball.u = r ? r.safe : 0; snapCamera(); },
        gems: function (n) { gemsTotal = n; store.set('gems', n); },
        dump: function (a, b) {
          var out = [];
          for (var z = a; z <= b; z++) {
            var r = rowAt(z + 0.5);
            if (!r) continue;
            var line = '';
            for (var k = 0; k < MAXW; k++) line += k < r.n ? '.#^>PWI'[r.t[k]] : ' ';
            out.push(z + ' ' + line + ' safe=' + r.safe.toFixed(1) + ' y=' + r.y0.toFixed(1) + (r.mv ? ' MV' : '') + (r.gate ? ' GATE' : ''));
          }
          return out.join('\n');
        },
        auto: function (on) { AUTO = on; },
        force: function (i) { forceChunk = i; },
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
        jumpBtn.removeEventListener('pointerdown', onJumpDown);
        jumpBtn.removeEventListener('pointerup', onJumpUp);
        jumpBtn.removeEventListener('pointercancel', onJumpUp);
        jumpBtn.removeEventListener('pointerleave', onJumpUp);
        view.destroy();
        [hud, jumpBtn, styleEl].forEach(function (nd) { if (nd && nd.parentNode) nd.parentNode.removeChild(nd); });
        if (ctx.debug && window.__nr) { try { delete window.__nr; } catch (e) { window.__nr = undefined; } }
      },
    };
  });
})();
