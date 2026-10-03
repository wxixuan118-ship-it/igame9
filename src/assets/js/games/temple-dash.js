/*!
 * igame9 — "temple-dash" engine
 * Pseudo-3D endless runner seen from behind the runner: three lanes, jumps,
 * slides, 90° corner turns (incl. T-junctions), coins/gems, power-ups and a
 * pursuer that catches you after two stumbles in a short window.
 *
 * Variants (ctx.variant): temple | oz | classic — palette, scenery,
 * obstacles, collectible and pursuer change per variant.
 *
 * World model: the track is a chain of straight segments ("segs") that meet
 * at square corner tiles. Everything is stored in segment-local coordinates
 * (s = distance along the segment, l = lateral offset, y = height) and
 * converted to world space for a real 3D projection (camera yaw + pitch).
 * Draw items are depth-sorted every frame (painter's algorithm).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Constants                                                           */
  /* ------------------------------------------------------------------ */
  var PI = Math.PI, HPI = PI / 2, TAU = PI * 2;
  var LANE = 1.25, PW = LANE * 3, HALF = PW / 2, TILE = 2, DEPTH = 1.3;
  var CAM_BACK = 4.7, CAM_H = 2.75, PITCH = 0.25, NEAR = 0.3;
  var DRAW = 84, FOG0 = 18, FOG1 = 80, LOD = 30, FOGN = 16;
  var G = 30, JUMP_V = 9.4, SLIDE_T = 0.72;
  var CHASE_NEAR = 2.6, CHASE_FAR = 9, STUMBLE_WIN = 7;
  var DX = [0, 1, 0, -1], DZ = [1, 0, -1, 0];
  var UP_COST = [120, 300, 650, 1300, 2500];
  var UP_MAX = 5;

  // Item kinds for the draw list
  var K_POLY = 0, K_SPRITE = 1, K_DECAL = 2;
  // Sprite types
  var S_COIN = 1, S_POW = 2, S_TREE = 3, S_PALM = 4, S_STATUE = 5, S_RUNNER = 6, S_CHASER = 7, S_SHADOW = 8,
    S_FLAME = 9, S_BALLOON = 10, S_PUMPKIN = 11, S_LANTERN = 12, S_BUSH = 13;

  /* ------------------------------------------------------------------ */
  /* Themes                                                              */
  /* ------------------------------------------------------------------ */
  var THEMES = {
    temple: {
      title: 'Jungle Relic Dash',
      chaserName: 'the Stone Warden',
      gem: false,
      v0: 11, vmax: 27,
      sky: ['#2b6c78', '#86c3ae', '#f1e2ab'],
      fog: '#dcd6a6',
      ground: ['#a9bf8c', '#3d6440', '#13261a'],
      ridgeFar: '#a8c1a0', ridgeNear: '#78997d',
      tiles: ['#bcab8a', '#ad9c7c', '#c6b795', '#b2a283'],
      accent: '#8b9f62',
      mortar: '#5f533f', side: '#8a785d', side2: '#5f513d', far: ['#b6a687', '#a99979'],
      log: ['#6e4a2b', '#8c6239', '#523720', '#3a2414'],
      stone: ['#9b8e75', '#b9ac90', '#786c57', '#4f4534'],
      post: ['#a1937a', '#c1b396', '#7c705b', '#e1b54a'],
      gold: '#e8b84a',
      trunk: '#5b4632', leaves: ['#1f4f34', '#2c6a3e', '#469047', '#6dae58'],
      runner: { shirt: '#2a9d8f', shirt2: '#1d7268', pants: '#6b4f3a', skin: '#d99a6c', hair: '#3b2a1e', scarf: '#e4572e', pack: '#b07a3e', pack2: '#86592b', shoe: '#2b211a' },
      deco: [S_TREE, S_TREE, S_PALM, S_TREE, S_BUSH],
      postKind: 'stone',
    },
    oz: {
      title: 'Emerald Road Dash',
      chaserName: 'the Twister',
      gem: true,
      v0: 11, vmax: 27,
      sky: ['#2f86da', '#8fcaf4', '#eef6dc'],
      fog: '#e4efd6',
      ground: ['#c5e0a0', '#5c9a48', '#24502a'],
      ridgeFar: '#bcd9a8', ridgeNear: '#8fc27c',
      tiles: ['#f2c641', '#e8b62f', '#f7d35a', '#ecbf3a'],
      accent: '#d9a62a',
      mortar: '#a3721c', side: '#c08f2a', side2: '#8f6418', far: ['#ecc042', '#e2b334'],
      log: ['#3f8f3f', '#58a94b', '#2e6f30', '#215224'],
      stone: ['#8a5a35', '#a8744a', '#6b4427', '#4a2e19'],
      post: ['#2f8f5a', '#46b878', '#1f6b42', '#9dffcf'],
      gold: '#2ee59d',
      trunk: '#7a5a3a', leaves: ['#2f7d3c', '#3f9a4a', '#5cb85a', '#86d06a'],
      runner: { shirt: '#3a6fd0', shirt2: '#2a54a3', pants: '#2d3a66', skin: '#e8b48c', hair: '#6b3d1f', scarf: '#e23d5c', pack: '#9a6a3a', pack2: '#744d28', shoe: '#3a2a20' },
      deco: [S_TREE, S_TREE, S_BUSH, S_TREE],
      postKind: 'lantern',
    },
    classic: {
      title: 'Moonlit Ruins Dash',
      chaserName: 'the Night Swarm',
      gem: false,
      v0: 13, vmax: 29,
      sky: ['#080b26', '#2a2860', '#9a587a'],
      fog: '#3b3157',
      ground: ['#4a3a62', '#1b1530', '#06050c'],
      ridgeFar: '#3a3058', ridgeNear: '#251f3d',
      tiles: ['#6a6f8c', '#5c6180', '#757a96', '#636884'],
      accent: '#4f7a6a',
      mortar: '#2a2c40', side: '#44475e', side2: '#2a2c3e', far: ['#5e6380', '#565b77'],
      log: ['#4d3727', '#654936', '#38281c', '#241912'],
      stone: ['#6e7290', '#878ca8', '#50546c', '#33364a'],
      post: ['#5d6078', '#787c96', '#44475c', '#ffb347'],
      gold: '#ffd24a',
      trunk: '#1a1430', leaves: ['#140f28', '#1c1636', '#251d44', '#2f2652'],
      runner: { shirt: '#c0392b', shirt2: '#922b21', pants: '#2c2c3e', skin: '#c98a62', hair: '#1d1410', scarf: '#f1c40f', pack: '#6b5a48', pack2: '#4d4033', shoe: '#18141a' },
      deco: [S_PALM, S_TREE, S_PALM, S_BUSH],
      postKind: 'torch',
    },
  };

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function wrapA(a) { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hash3(a, b, c) {
    var h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function seeded(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function fmtInt(n) { return Math.floor(n).toLocaleString('en-US'); }

  var CSS = [
    '.td-hud{position:absolute;inset:0;pointer-events:none;z-index:4;font-family:var(--font);display:none}',
    '.td-hud.on{display:block}',
    '.td-tl{position:absolute;left:10px;top:10px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}',
    '.td-tr{position:absolute;right:10px;top:10px;display:flex;gap:8px;align-items:flex-start}',
    '.td-hud .ig-pill{font-size:1em}',
    '.td-score{font-size:1.25em!important;letter-spacing:-.01em}',
    '.td-pause{pointer-events:auto;cursor:pointer;width:2.6em;height:2.6em;display:grid;place-items:center;padding:0!important;color:#fff}',
    '.td-pause svg{width:1em;height:1em}',
    '.td-pws{display:flex;flex-direction:column;gap:5px;align-items:flex-end}',
    '.td-pw{position:relative;overflow:hidden;display:none;align-items:center;gap:6px;padding-bottom:7px!important}',
    '.td-pw.on{display:flex}',
    '.td-pw svg{width:1.05em;height:1.05em}',
    '.td-bar{position:absolute;left:10px;right:10px;bottom:3px;height:3px;border-radius:2px;background:rgba(255,255,255,.18)}',
    '.td-bar i{display:block;height:100%;border-radius:2px;background:#fff;transform-origin:left center}',
    '.td-coin{display:inline-block;width:.95em;height:.95em;border-radius:50%;background:radial-gradient(circle at 35% 32%,#fff7c2,#f5c542 45%,#b8860b);vertical-align:-.14em;margin-right:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}',
    '.td-gem{display:inline-block;width:.95em;height:.95em;vertical-align:-.14em;margin-right:6px;clip-path:polygon(50% 0,100% 38%,50% 100%,0 38%);background:linear-gradient(160deg,#c8ffe6,#2ee59d 50%,#0f8a5a)}',
    '.td-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 12px}',
    '.td-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:6px 8px}',
    '.td-stat b{display:block;font-size:20px;color:#fff;line-height:1.2}',
    '.td-stat span{font-size:12px;color:var(--muted)}',
    '.td-new{display:inline-block;margin:0 0 10px;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,#fbbf24,#f97316);color:#1a1205;font-weight:900;font-size:13px}',
    '.td-how{font-size:13px;color:var(--text-2);margin:0 0 12px}',
    '.td-how .ig-kbd{margin:0 1px}',
    '.td-up{display:grid;gap:8px;text-align:left;margin-bottom:12px}',
    '.td-uprow{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px 10px}',
    '.td-uprow svg{width:26px;height:26px;flex:none}',
    '.td-upname{font-weight:800;color:#fff;font-size:14px;line-height:1.2}',
    '.td-upname small{display:block;font-weight:600;color:var(--muted);font-size:12px}',
    '.td-pips{display:flex;gap:3px;margin-top:4px}',
    '.td-pip{width:12px;height:5px;border-radius:2px;background:rgba(255,255,255,.18)}',
    '.td-pip.on{background:var(--accent-2)}',
    '.td-upbtn{margin-left:auto;padding:8px 12px!important;font-size:13px!important;white-space:nowrap}',
    '.td-bank{font-weight:800;color:#fff;margin:0 0 10px;font-size:15px}',
  ].join('\n');

  var ICON = {
    mag: '<svg viewBox="0 0 24 24"><path d="M5 3h4v9a3 3 0 0 0 6 0V3h4v9a7 7 0 0 1-14 0z" fill="#ef4444"/><path d="M5 3h4v4H5zM15 3h4v4h-4z" fill="#e5e7eb"/></svg>',
    shd: '<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" fill="#38bdf8"/><path d="M12 5 7 7v4c0 3.3 2.1 6.3 5 7.6z" fill="#bae6fd"/></svg>',
    dbl: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f59e0b"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="900" font-family="system-ui,sans-serif" fill="#fff">x2</text></svg>',
    pause: '<svg viewBox="0 0 10 12"><rect x="1" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="6" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg>',
  };

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('temple-dash', function (ctx) {
    var VAR = THEMES[ctx.variant] ? ctx.variant : 'temple';
    var TH = THEMES[VAR];
    var root = ctx.root, store = ctx.store;
    var R = Math.random;
    var destroyed = false;
    var timers = [];
    var dbg = ctx.debug;
    var AUTO = dbg && ctx.params.get('auto') === '1';
    var FORCE = dbg && ctx.params.get('pat') ? +ctx.params.get('pat') : -1; // debug: force one pattern

    /* ---------- fog-tinted colour tables ---------- */
    var FOGRGB = hexRgb(TH.fog);
    var colCache = {};
    function C(hex) {
      var a = colCache[hex];
      if (a) return a;
      var c = hexRgb(hex);
      a = [];
      for (var i = 0; i <= FOGN; i++) {
        var t = i / FOGN;
        t = t * t * (3 - 2 * t);
        a.push('rgb(' + Math.round(lerp(c[0], FOGRGB[0], t)) + ',' + Math.round(lerp(c[1], FOGRGB[1], t)) + ',' + Math.round(lerp(c[2], FOGRGB[2], t)) + ')');
      }
      colCache[hex] = a;
      return a;
    }
    var cTiles = TH.tiles.map(C), cFar = TH.far.map(C), cMortar = C(TH.mortar), cSide = C(TH.side), cSide2 = C(TH.side2), cAccent = C(TH.accent);
    var cLog = TH.log.map(C), cStone = TH.stone.map(C), cPost = TH.post.map(C);
    var cCap = C(TH.post[3]), cPostCap = [cCap, cCap, cCap, cCap];
    function fogLevel(z) { var t = (z - FOG0) / (FOG1 - FOG0); return t <= 0 ? 0 : t >= 1 ? FOGN : Math.round(t * FOGN); }
    function fogAlpha(z) { var t = (z - FOG0 - 6) / (FOG1 - FOG0 - 6); return t <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t; }

    /* ---------- DOM: style, canvas, HUD ---------- */
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var VW = 1, VH = 1, F = 1, CX = 0, CY = 0, HZ = 0, UI = 10, gradDirty = true;
    var skyGrad = null, groundGrad = null, dangerGrad = null, vignGrad = null;
    var view = IGAME.createCanvas(root, { onResize: layout });
    var g = view.ctx;
    var canvas = view.canvas;

    var hud = IGAME.ui.el('div', 'td-hud');
    hud.innerHTML =
      '<div class="td-tl"><div class="ig-pill td-score">0 m</div><div class="ig-pill td-coins"><i class="' + (TH.gem ? 'td-gem' : 'td-coin') + '"></i><span>0</span></div></div>' +
      '<div class="td-tr"><div class="td-pws">' +
      ['mag', 'shd', 'dbl'].map(function (k) { return '<div class="ig-pill td-pw" data-k="' + k + '">' + ICON[k] + '<span></span><div class="td-bar"><i></i></div></div>'; }).join('') +
      '</div><button type="button" class="ig-pill td-pause" aria-label="Pause">' + ICON.pause + '</button></div>';
    root.appendChild(hud);
    var hudScore = hud.querySelector('.td-score');
    var hudCoins = hud.querySelector('.td-coins span');
    var hudPause = hud.querySelector('.td-pause');
    var hudPw = {};
    ['mag', 'shd', 'dbl'].forEach(function (k) {
      var n = hud.querySelector('[data-k="' + k + '"]');
      hudPw[k] = { el: n, bar: n.querySelector('.td-bar i'), txt: n.querySelector('span'), on: false, last: -1 };
    });
    hudPause.addEventListener('click', onPauseBtn);
    function onPauseBtn(e) { e.stopPropagation(); if (state === 'play') pauseGame(); }

    function layout(w, h) {
      VW = w; VH = h;
      F = Math.min(h * 0.98, w * 1.08);
      CX = w / 2;
      CY = h * 0.5;
      HZ = CY - Math.tan(PITCH) * F;
      UI = Math.min(w, h);
      gradDirty = true;
      if (hud) hud.style.fontSize = clamp(Math.round(UI / 30), 12, 19) + 'px';
    }
    layout(view.width, view.height);

    function buildGradients() {
      gradDirty = false;
      skyGrad = g.createLinearGradient(0, 0, 0, HZ + 2);
      skyGrad.addColorStop(0, TH.sky[0]);
      skyGrad.addColorStop(0.62, TH.sky[1]);
      skyGrad.addColorStop(1, TH.sky[2]);
      groundGrad = g.createLinearGradient(0, HZ, 0, VH);
      groundGrad.addColorStop(0, TH.fog);
      groundGrad.addColorStop(0.08, TH.ground[0]);
      groundGrad.addColorStop(0.45, TH.ground[1]);
      groundGrad.addColorStop(1, TH.ground[2]);
      var r = Math.max(VW, VH) * 0.75;
      dangerGrad = g.createRadialGradient(CX, VH * 0.55, r * 0.35, CX, VH * 0.55, r);
      dangerGrad.addColorStop(0, 'rgba(220,30,30,0)');
      dangerGrad.addColorStop(1, 'rgba(220,30,30,0.55)');
      vignGrad = g.createRadialGradient(CX, VH * 0.5, r * 0.45, CX, VH * 0.5, r * 1.05);
      vignGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignGrad.addColorStop(1, VAR === 'classic' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.3)');
    }

    /* ---------- persistent data ---------- */
    var best = store.get('best', 0) | 0;
    var bestDist = store.get('bestDist', 0) | 0;
    var bank = store.get('bank', 0) | 0;
    var runs = store.get('runs', 0) | 0;
    var ups = store.get('ups', null);
    if (!ups || typeof ups !== 'object') ups = { mag: 0, shd: 0, dbl: 0 };
    ['mag', 'shd', 'dbl'].forEach(function (k) { ups[k] = clamp(ups[k] | 0, 0, UP_MAX); });
    function pwDuration(k) { return (k === 'shd' ? 9 : k === 'mag' ? 7 : 8) + ups[k] * 2; }

    /* ---------- run state ---------- */
    var state = 'menu'; // menu | play | paused | dying | over
    var time = 0, runT = 0, overAt = 0;
    var p = {
      s: 4, lat: 0, latPrev: 0, lane: 0, prevLane: 0, laneT: 9, y: 0, vy: 0, air: false, falling: false,
      coyote: 0, jumpBuf: 0, slide: 0, phase: 0, lean: 0, inv: 0, turnBuf: 0, crashed: false,
    };
    var speed = TH.v0, slowMul = 1, dist = 0, coins = 0, stumbleT = 0, chase = CHASE_FAR, chaseLat = 0, introT = 0;
    var pw = { mag: 0, shd: 0, dbl: 0 };
    var deathCause = '', deathT = 0, milestone = 500, tutorial = false, lastInput = ctx.isTouch ? 'touch' : 'key';
    var flash = 0, flashCol = '255,255,255', shake = 0, coinSfxT = 0;
    var segs = [], prevSeg = null, segId = 0, genDist = 0, lastPowAt = 0;
    var camX = 0, camY = CAM_H, camZ = 0, camYaw = 0, targetYaw = 0, shiftX = 0, shiftZ = 0;
    var cY = 1, sY = 0, cP = Math.cos(PITCH), sP = Math.sin(PITCH);
    var overlay = null, overlayKind = '';

    /* ------------------------------------------------------------------ */
    /* Track generation                                                   */
    /* ------------------------------------------------------------------ */
    function speedAt(d) { return TH.v0 + (TH.vmax - TH.v0) * (1 - Math.exp(-d / 2600)); }
    function reachFor(v) { return 3.5 + v * 0.36; }

    function newSeg(h, sx, sz, len) {
      var hd = ((h % 4) + 4) % 4;
      var dx = DX[hd], dz = DZ[hd];
      return {
        id: ++segId, h: h, sx: sx, sz: sz, dx: dx, dz: dz, rx: dz, rz: -dx, len: len,
        turn: 1, main: 1, alt: null, obs: [], gaps: [], coins: [], pows: [], deco: [],
      };
    }
    function segLen(d) { return 2 * Math.round((30 + R() * 30 - d * 8) / 2); }
    function chooseTurn(seg) {
      if (seg.h >= 2) seg.turn = -1;
      else if (seg.h <= -2) seg.turn = 1;
      else if (R() < 0.24 && genDist > 300) { seg.turn = 2; seg.main = R() < 0.5 ? -1 : 1; }
      else seg.turn = R() < 0.5 ? -1 : 1;
    }
    function nextSeg(seg, t) {
      var ccx = seg.sx + seg.dx * (seg.len + HALF), ccz = seg.sz + seg.dz * (seg.len + HALF);
      var h = seg.h + t, hd = ((h % 4) + 4) % 4;
      var d = Math.min(1, genDist / 3000);
      var n = newSeg(h, ccx + DX[hd] * HALF, ccz + DZ[hd] * HALF, segLen(d));
      chooseTurn(n);
      fill(n, false);
      return n;
    }
    function aheadLen() {
      var L = -p.s;
      for (var i = 0; i < segs.length; i++) L += segs[i].len + PW;
      return L;
    }
    function extend() {
      var guard = 0;
      while (aheadLen() < DRAW + 50 && guard++ < 12) {
        var last = segs[segs.length - 1];
        var t = last.turn === 2 ? last.main : last.turn;
        if (last.turn === 2 && !last.alt) {
          var gd = genDist;
          last.alt = nextSeg(last, -t);
          genDist = gd;
        }
        segs.push(nextSeg(last, t));
      }
    }
    function resetWorld() {
      segs.length = 0;
      prevSeg = null;
      genDist = 0;
      lastPowAt = 80;
      var s0 = newSeg(0, 0, 0, 66);
      s0.turn = R() < 0.5 ? -1 : 1;
      fill(s0, true);
      segs.push(s0);
      p.s = 4; p.lat = 0; p.latPrev = 0; p.lane = 0; p.prevLane = 0; p.laneT = 9; p.y = 0; p.vy = 0;
      p.air = false; p.falling = false; p.slide = 0; p.turnBuf = 0; p.inv = 0; p.lean = 0; p.crashed = false;
      p.jumpBuf = 0; p.coyote = 0;
      extend();
      camYaw = targetYaw = 0;
      shiftX = shiftZ = 0;
      updateCamera(1);
    }

    function addOb(seg, k, s0, s1, lanes, y1) {
      var o = { k: k, s0: s0, s1: s1, lanes: lanes, y1: y1, hit: false, broken: false, seed: (R() * 1e6) | 0, tut: false };
      seg.obs.push(o);
      if (k === 'gap') seg.gaps.push(o);
      return o;
    }
    function addCoin(seg, s, l, y) { seg.coins.push({ s: s, l: l, y: y, taken: false, mag: false, ph: R() * 6 }); }
    function coinLine(seg, s, lane, n, y) {
      for (var i = 0; i < n; i++) addCoin(seg, s + i * 1.7, lane * LANE, y == null ? 0.8 : y);
      return (n - 1) * 1.7;
    }
    // Coins along the arc of a jump centred on sc (matches JUMP_V / G at speed v)
    function coinArc(seg, sc, lane, v) {
      var half = v * (JUMP_V / G) * 0.85;
      for (var i = -2; i <= 2; i++) {
        var t = i / 2.4;
        addCoin(seg, sc + t * half, lane * LANE, 0.75 + 1.35 * (1 - t * t));
      }
    }
    function addPow(seg, s, lane) {
      var r = R();
      var k = r < 0.36 ? 'mag' : r < 0.7 ? 'dbl' : 'shd';
      seg.pows.push({ s: s, l: lane * LANE, y: 1.05, k: k, taken: false });
    }
    function laneMask(l) { return 1 << (l + 1); }
    function otherLane(l) { return l === 0 ? (R() < 0.5 ? -1 : 1) : R() < 0.5 ? 0 : -l; }

    // Place one obstacle/coin pattern at s; returns the length it occupies.
    function pattern(seg, s, end, d, v) {
      var room = end - s;
      var lane = ((R() * 3) | 0) - 1;
      var w = [1.0, 0.9, 0.75, 0.55 + d * 0.5, 1.0, 0.3 + d * 0.9, 0.55, d > 0.22 ? d * 1.1 : 0];
      var tot = 0, i;
      for (i = 0; i < w.length; i++) tot += w[i];
      var r = R() * tot, pick = 0;
      for (i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) { pick = i; break; } }
      if (FORCE >= 0) pick = FORCE;
      if (room < 7) pick = 0;
      var gl = 2.6 + v * 0.09;
      switch (pick) {
        case 1: // low barrier: jump
          addOb(seg, 'log', s, s + 0.7, 7, 0.6);
          coinArc(seg, s + 0.35, lane, v);
          return 0.7;
        case 2: // high barrier: slide
          addOb(seg, 'arch', s, s + 0.9, 7, 1.15);
          coinLine(seg, s - 3.6, lane, 5, 0.55);
          return 0.9;
        case 3: // gap: jump
          if (room < gl + 2) return coinLine(seg, s, lane, 4);
          addOb(seg, 'gap', s, s + gl, 7, 0);
          coinArc(seg, s + gl / 2, lane, v);
          return gl;
        case 4: // one lane blocked
          addOb(seg, 'block', s, s + 1.3, laneMask(lane), 2.1);
          coinLine(seg, s - 4.2, otherLane(lane), 5);
          return 1.3;
        case 5: // two lanes blocked
          addOb(seg, 'block', s, s + 1.3, 7 & ~laneMask(lane), 2.1);
          coinLine(seg, s - 5, lane, 6);
          return 1.3;
        case 6: { // low rubble in one or two lanes: dodge or jump
          var m = laneMask(lane);
          if (R() < 0.5) m |= laneMask(otherLane(lane));
          if (m === 7) m = laneMask(lane);
          addOb(seg, 'rubble', s, s + 1.0, m, 0.55);
          var free = !(m & laneMask(-1)) ? -1 : !(m & laneMask(0)) ? 0 : 1;
          coinLine(seg, s - 3.4, free, 4);
          return 1.0;
        }
        case 7: { // combo: dodge into the free lane, then jump/slide
          var gapAfter = 6 + v * 0.22;
          if (room < gapAfter + gl + 2) return coinLine(seg, s, lane, 5);
          addOb(seg, 'block', s, s + 1.3, 7 & ~laneMask(lane), 2.1);
          coinLine(seg, s - 4, lane, 4);
          var s2 = s + gapAfter;
          var k = R();
          if (k < 0.4) { addOb(seg, 'log', s2, s2 + 0.7, 7, 0.6); coinArc(seg, s2 + 0.35, lane, v); return gapAfter + 0.7; }
          if (k < 0.7) { addOb(seg, 'arch', s2, s2 + 0.9, 7, 1.15); return gapAfter + 0.9; }
          addOb(seg, 'gap', s2, s2 + gl, 7, 0);
          coinArc(seg, s2 + gl / 2, lane, v);
          return gapAfter + gl;
        }
        default: { // coins (maybe a power-up)
          var n = 4 + ((R() * 5) | 0);
          n = Math.min(n, Math.max(2, Math.floor(room / 1.7)));
          var at = genDist + s;
          if (at - lastPowAt > 240 && R() < 0.5) {
            lastPowAt = at;
            coinLine(seg, s, lane, 2);
            addPow(seg, s + 4.2, lane);
            coinLine(seg, s + 6.8, lane, 2);
            return 8.5;
          }
          return coinLine(seg, s, lane, n);
        }
      }
    }

    function fill(seg, first) {
      var d = Math.min(1, genDist / 3000);
      var v = speedAt(genDist + seg.len * 0.5);
      var s = first ? 34 : 8 + v * 0.25;
      var end = seg.len - Math.max(8, reachFor(v) + 2.5);
      while (s < end) {
        var used = pattern(seg, s, end, d, v);
        s += used + Math.max(7.5, v * 0.66) + R() * (12 - 6 * d);
      }
      decorate(seg);
      genDist += seg.len + PW;
    }

    function decorate(seg) {
      var end = seg.len + PW;
      for (var side = -1; side <= 1; side += 2) {
        var open = seg.turn === side || seg.turn === 2;
        var lim = open ? seg.len - 3.5 : end + 5;
        var s = 4 + R() * 3;
        while (s < lim) {
          var k = TH.deco[(R() * TH.deco.length) | 0];
          var off = k === S_BUSH ? 0.35 + R() * 0.9 : 3.2 + R() * 6;
          seg.deco.push({ k: k, s: s, l: side * (HALF + off), y: k === S_BUSH ? -0.9 : -4.2, seed: (R() * 1e6) | 0, sz: 0.8 + R() * 0.5 });
          s += 2.4 + R() * 3.6;
        }
        // edge posts (columns / lanterns / torches) on both sides
        for (var ps = 7; ps < (open ? seg.len - 2 : end); ps += 9) {
          seg.deco.push({ k: 'post', s: ps, l: side * (HALF + 0.3), y: -DEPTH, seed: (R() * 1e6) | 0, sz: 1 });
        }
        if (VAR === 'oz' && R() < 0.6) {
          seg.deco.push({ k: S_BALLOON, s: 10 + R() * seg.len, l: side * (HALF + 7 + R() * 12), y: 5 + R() * 6, seed: (R() * 1e6) | 0, sz: 1 + R() * 0.6 });
        }
      }
      // big landmark straight ahead of the corner: "turn here"
      seg.deco.push({ k: S_STATUE, s: seg.len + PW + 3.4, l: 0, y: -4.5, seed: (R() * 1e6) | 0, sz: 1 });
    }

    /* ------------------------------------------------------------------ */
    /* Player actions                                                     */
    /* ------------------------------------------------------------------ */
    function turnPoint(seg, t) { return seg.len + HALF - t * p.lat; }

    function steer(t) {
      if (state !== 'play' || p.crashed) return;
      var seg = segs[0];
      var can = seg.turn === t || seg.turn === 2;
      var toCorner = seg.len - p.s;
      if (can && toCorner < reachFor(speed) && p.s <= seg.len + PW - 0.35) {
        p.turnBuf = t;
        if (p.s >= turnPoint(seg, t)) doTurn(t);
        return;
      }
      var nl = clamp(p.lane + t, -1, 1);
      if (nl !== p.lane) {
        p.prevLane = p.lane;
        p.lane = nl;
        p.laneT = 0;
        ctx.sfx({ f: 520, f2: 760, d: 0.06, type: 'triangle', v: 0.05 });
      } else {
        shake = Math.max(shake, 0.12);
        ctx.sfx({ f: 160, d: 0.06, type: 'square', v: 0.04 });
      }
    }

    function doTurn(t) {
      var seg = segs[0];
      var next = seg.turn === 2 && t !== seg.main ? seg.alt : segs[1];
      if (!next) return;
      if (next === seg.alt) {
        segs.length = 1;
        segs.push(next);
      }
      var bx = camTargetX(), bz = camTargetZ();
      // keep the runner's world position: re-express it in the new segment
      var wx = seg.sx + seg.dx * p.s + seg.rx * p.lat, wz = seg.sz + seg.dz * p.s + seg.rz * p.lat;
      p.s = (wx - next.sx) * next.dx + (wz - next.sz) * next.dz;
      p.lat = clamp((wx - next.sx) * next.rx + (wz - next.sz) * next.rz, -LANE - 0.4, LANE + 0.4);
      p.latPrev = p.lat;
      p.lane = clamp(Math.round(p.lat / LANE), -1, 1);
      p.turnBuf = 0;
      seg.alt = null;
      prevSeg = seg;
      segs.shift();
      targetYaw += t * HPI;
      // camera continuity: absorb the jump in the target into a decaying shift
      var ax = camTargetX(), az = camTargetZ();
      shiftX += bx - ax;
      shiftZ += bz - az;
      ctx.sfx({ f: 300, f2: 140, d: 0.14, type: 'triangle', v: 0.07 });
      emitDust(4);
      extend();
    }

    function jump() {
      if (state !== 'play' || p.crashed) return;
      if (!p.air || (p.falling && p.coyote > 0)) {
        p.air = true;
        p.falling = false;
        p.vy = JUMP_V;
        p.slide = 0;
        p.jumpBuf = 0;
        ctx.sfx('jump');
      } else p.jumpBuf = 0.16;
    }
    function slide() {
      if (state !== 'play' || p.crashed || p.falling) return;
      if (p.air) p.vy = Math.min(p.vy, -15); // fast-fall into a slide
      p.slide = SLIDE_T;
      ctx.sfx('slide');
    }

    function overGap(seg, s) {
      var gs = seg.gaps;
      for (var i = 0; i < gs.length; i++) if (s > gs[i].s0 + 0.28 && s < gs[i].s1 - 0.28) return true;
      return false;
    }

    function stumble() {
      if (pw.shd > 0) { breakShield(); return; }
      if (p.inv > 0) return;
      p.inv = 0.6;
      shake = Math.max(shake, 0.5);
      slowMul = 0.72;
      ctx.sfx('hit');
      emitBurst(CX, runnerScreenY(), 10, TH.leaves[2], 260, 0.6);
      if (stumbleT > 0) { die('caught'); return; }
      stumbleT = STUMBLE_WIN;
      toast(TH.chaserName.charAt(0).toUpperCase() + TH.chaserName.slice(1) + ' is close!');
    }
    function crash() {
      if (pw.shd > 0) { breakShield(); return true; }
      if (p.inv > 0) return true;
      die('crash');
      return false;
    }
    function breakShield() {
      pw.shd = 0;
      p.inv = 0.8;
      shake = Math.max(shake, 0.35);
      flash = 0.5; flashCol = '120,210,255';
      ctx.sfx('explode');
      emitBurst(CX, runnerScreenY(), 18, '#bae6fd', 380, 0.7);
    }

    function die(cause) {
      if (state !== 'play') return;
      deathCause = cause;
      deathT = 0;
      state = 'dying';
      p.crashed = cause !== 'fall';
      shake = cause === 'fall' ? 0.2 : 0.9;
      flash = cause === 'fall' ? 0 : 0.7;
      flashCol = cause === 'caught' ? '255,60,60' : '255,255,255';
      ctx.sfx(cause === 'fall' ? 'lose' : 'explode');
      if (cause !== 'fall') emitBurst(CX, runnerScreenY(), 22, TH.stone[1], 420, 0.9);
    }

    /* ------------------------------------------------------------------ */
    /* Update                                                             */
    /* ------------------------------------------------------------------ */
    function update(dt) {
      time += dt;
      if (state === 'play') stepPlay(dt);
      else if (state === 'dying') stepDying(dt);
      else if (state === 'menu' || state === 'over') p.phase += dt * 1.2;
      if (state !== 'paused') {
        updateCamera(dt);
        stepParticles(dt);
        if (shake > 0) shake = Math.max(0, shake - dt * 1.8);
        if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
      }
    }

    function stepPlay(dt) {
      runT += dt;
      if (AUTO) autopilot();
      var seg = segs[0];
      slowMul = Math.min(1, slowMul + dt * 0.35);
      speed = speedAt(dist) * slowMul;
      var ds = speed * dt;
      p.s += ds;
      dist += ds;
      p.phase += ds * 1.45;
      // lateral
      p.latPrev = p.lat;
      p.lat += (p.lane * LANE - p.lat) * (1 - Math.exp(-dt * 15));
      p.laneT += dt;
      var lv = (p.lat - p.latPrev) / Math.max(dt, 1e-3);
      p.lean += (clamp(lv * 0.035, -0.3, 0.3) - p.lean) * (1 - Math.exp(-dt * 12));
      // vertical
      if (p.slide > 0) p.slide -= dt;
      if (p.inv > 0) p.inv -= dt;
      if (p.jumpBuf > 0) p.jumpBuf -= dt;
      var gapHere = overGap(seg, p.s);
      if (p.air) {
        p.vy -= G * dt;
        p.y += p.vy * dt;
        if (p.falling) {
          p.coyote -= dt;
          if (p.y < -0.4) { die('fall'); return; }
        } else if (p.y <= 0) {
          if (gapHere || p.s > seg.len + PW - 0.25) {
            p.falling = true; p.coyote = 0;
          } else {
            p.y = 0; p.vy = 0; p.air = false;
            emitDust(5);
            if (p.jumpBuf > 0) jump();
          }
        }
      } else if (gapHere) {
        p.air = true; p.falling = true; p.vy = 0; p.coyote = 0.11;
      }
      // corners
      if (p.turnBuf && p.s >= turnPoint(seg, p.turnBuf)) { doTurn(p.turnBuf); seg = segs[0]; }
      else if (p.s > seg.len + PW - 0.25 && !p.air) {
        p.air = true; p.falling = true; p.vy = 0; p.coyote = 0;
      }
      // collisions
      collide(seg);
      if (state !== 'play') return;
      collect(seg, dt);
      // power-up timers
      pw.mag = Math.max(0, pw.mag - dt);
      pw.dbl = Math.max(0, pw.dbl - dt);
      pw.shd = Math.max(0, pw.shd - dt);
      // pursuer
      if (stumbleT > 0) stumbleT -= dt;
      if (introT > 0) introT -= dt;
      var target = stumbleT > 0 || introT > 0 ? CHASE_NEAR : CHASE_FAR;
      chase += (target - chase) * (1 - Math.exp(-dt * (target < chase ? 3.5 : 0.45)));
      chaseLat += (p.lat - chaseLat) * (1 - Math.exp(-dt * 4));
      // milestones
      if (dist >= milestone) {
        toast(fmtInt(milestone) + ' m!');
        ctx.sfx('levelup');
        milestone += milestone < 1000 ? 500 : 1000;
      }
      if (coinSfxT > 0) coinSfxT -= dt;
      extend();
    }

    function collide(seg) {
      var obs = seg.obs;
      var top = p.y + (p.slide > 0 ? 0.72 : 1.75);
      for (var i = 0; i < obs.length; i++) {
        var o = obs[i];
        if (o.hit || o.broken || o.k === 'gap') continue;
        if (p.s + 0.3 < o.s0 || p.s - 0.3 > o.s1) continue;
        if (o.k === 'log') {
          if (p.y < 0.5) { o.hit = true; stumble(); }
        } else if (o.k === 'arch') {
          if (top > o.y1) { o.hit = true; if (crash() && state === 'play') o.broken = true; }
        } else {
          // lane obstacles: lateral overlap with any blocked lane
          var hitLane = -9;
          for (var L = -1; L <= 1; L++) {
            if (!(o.lanes & laneMask(L))) continue;
            if (Math.abs(p.lat - L * LANE) < LANE * 0.5 + 0.18) { hitLane = L; break; }
          }
          if (hitLane === -9) continue;
          if (o.k === 'rubble' && p.y >= 0.45) continue;
          // side-swipe: we were moving into a blocked lane from a free one → bounce back
          var fromFree = !(o.lanes & laneMask(p.prevLane));
          if (p.laneT < 0.3 && fromFree && hitLane === p.lane && p.prevLane !== p.lane && Math.abs(p.lat - p.lane * LANE) > 0.3) {
            p.lane = p.prevLane;
            p.laneT = 9;
            stumble();
            continue;
          }
          o.hit = true;
          if (o.k === 'rubble') { o.broken = true; stumble(); emitBurst(CX, runnerScreenY() + 20, 10, TH.stone[1], 300, 0.5); }
          else if (crash() && state === 'play') { o.broken = true; emitBurst(CX, runnerScreenY(), 16, TH.stone[1], 380, 0.7); }
        }
        if (state !== 'play') return;
      }
    }

    function collect(seg, dt) {
      var cyy = p.y + (p.slide > 0 ? 0.45 : 0.9);
      var cs = seg.coins, magOn = pw.mag > 0, k = 1 - Math.exp(-dt * 10);
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (c.taken) continue;
        var ds = c.s - p.s;
        if (ds < -2 || ds > 16) continue;
        if (magOn && ds < 13 && ds > -1) c.mag = true;
        if (c.mag) {
          c.s += (p.s + 0.4 - c.s) * k + speed * dt * 0.25;
          c.l += (p.lat - c.l) * k;
          c.y += (cyy - c.y) * k;
          ds = c.s - p.s;
        }
        if (Math.abs(ds) < 0.75 && Math.abs(c.l - p.lat) < 0.8 && Math.abs(c.y - cyy) < 1.05) {
          c.taken = true;
          coins += pw.dbl > 0 ? 2 : 1;
          if (coinSfxT <= 0) { ctx.sfx('coin'); coinSfxT = 0.05; }
          sparkle(c);
        }
      }
      var ps = seg.pows;
      for (var j = 0; j < ps.length; j++) {
        var q = ps[j];
        if (q.taken) continue;
        if (Math.abs(q.s - p.s) < 0.9 && Math.abs(q.l - p.lat) < 0.95 && Math.abs(q.y - cyy) < 1.2) {
          q.taken = true;
          pw[q.k] = pwDuration(q.k);
          ctx.sfx('levelup');
          flash = 0.35; flashCol = q.k === 'shd' ? '120,210,255' : q.k === 'mag' ? '255,120,120' : '255,210,90';
          toast(q.k === 'mag' ? (TH.gem ? 'Gem magnet!' : 'Coin magnet!') : q.k === 'shd' ? 'Shield up!' : (TH.gem ? 'Double gems!' : 'Double coins!'));
        }
      }
    }

    function stepDying(dt) {
      deathT += dt;
      if (deathCause === 'fall') {
        p.vy -= G * dt;
        p.y += p.vy * dt;
        p.s += speed * 0.45 * dt;
      } else {
        // pursuer closes in
        chase += (0.9 - chase) * (1 - Math.exp(-dt * 3));
        chaseLat += (p.lat - chaseLat) * (1 - Math.exp(-dt * 4));
        if (deathCause === 'crash') p.s -= Math.max(0, 1.2 - deathT * 3) * dt * 2;
      }
      if (deathT > (deathCause === 'fall' ? 1.1 : 1.25)) gameOver();
    }

    // Debug autopilot (?debug=1&auto=1): plays reasonably well, for testing.
    function autopilot() {
      var seg = segs[0];
      if (seg.len - p.s < 2.2 && !p.turnBuf) steer(seg.turn === 2 ? seg.main : seg.turn);
      for (var i = 0; i < seg.obs.length; i++) {
        var o = seg.obs[i];
        if (o.hit || o.broken) continue;
        var d = o.s0 - p.s;
        if (d < -0.5 || d > 10) continue;
        if ((o.k === 'gap' && d < 0.6 + speed * 0.07 && d > 0) || (o.k === 'log' && d < speed * 0.16 + 0.3 && d > 0)) {
          if (!p.air) jump();
        } else if (o.k === 'arch' && d < speed * 0.12 + 0.6 && p.slide <= 0.1) slide();
        else if ((o.k === 'block' || o.k === 'rubble') && o.lanes & laneMask(p.lane)) {
          for (var L = -1; L <= 1; L++) {
            if (!(o.lanes & laneMask(L))) { steer(L < p.lane ? -1 : 1); break; }
          }
        }
      }
    }

    /* ------------------------------------------------------------------ */
    /* Camera                                                             */
    /* ------------------------------------------------------------------ */
    var PWX = 0, PWZ = 0;
    function playerWorld() {
      var seg = segs[0];
      PWX = seg.sx + seg.dx * p.s + seg.rx * p.lat;
      PWZ = seg.sz + seg.dz * p.s + seg.rz * p.lat;
    }
    function camTargetX() { playerWorld(); var fx = Math.sin(camYaw), fz = Math.cos(camYaw); return PWX - fx * CAM_BACK - fz * p.lat * 0.45; }
    function camTargetZ() { playerWorld(); var fx = Math.sin(camYaw), fz = Math.cos(camYaw); return PWZ - fz * CAM_BACK + fx * p.lat * 0.45; }

    function updateCamera(dt) {
      if (!segs.length) return;
      camYaw += (targetYaw - camYaw) * (1 - Math.exp(-dt * 9));
      if (state === 'dying' && deathCause === 'fall') return; // camera stays, runner drops away
      var k = Math.exp(-dt * 6);
      shiftX *= k; shiftZ *= k;
      camX = camTargetX() + shiftX;
      camZ = camTargetZ() + shiftZ;
      var bob = state === 'play' ? Math.abs(Math.sin(p.phase)) * 0.05 : 0;
      camY = CAM_H + Math.max(0, p.y) * 0.4 + bob;
    }

    /* ------------------------------------------------------------------ */
    /* Projection + draw list                                             */
    /* ------------------------------------------------------------------ */
    var POOL = [], order = [], nItems = 0;
    var PB = new Float32Array(24000), pbN = 0;
    var CS = new Float64Array(48), CL = new Float64Array(48), csN = 0;
    var PX = 0, PY = 0, PZ = 0;
    var SG = null, camS = 0, camL = 0;

    function newItem(key, kind) {
      var it = POOL[nItems];
      if (!it) it = POOL[nItems] = { key: 0, kind: 0, off: 0, cnt: 0, col: '', x: 0, y: 0, s: 0, al: 1, t: 0, ref: null, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
      nItems++;
      it.key = key; it.kind = kind; it.ref = null;
      return it;
    }
    function byKey(a, b) { return b.key - a.key; }

    // segment-local point → camera space, appended to CS
    function pv(s, l, y) {
      var wx = SG.sx + SG.dx * s + SG.rx * l, wz = SG.sz + SG.dz * s + SG.rz * l;
      var dx = wx - camX, dy = y - camY, dz = wz - camZ;
      var x = dx * cY - dz * sY, z = dx * sY + dz * cY;
      var o = csN * 3;
      CS[o] = x;
      CS[o + 1] = dy * cP + z * sP;
      CS[o + 2] = -dy * sP + z * cP;
      csN++;
    }
    // project a segment-local point; returns false if behind the near plane
    function proj(s, l, y) {
      var wx = SG.sx + SG.dx * s + SG.rx * l, wz = SG.sz + SG.dz * s + SG.rz * l;
      var dx = wx - camX, dy = y - camY, dz = wz - camZ;
      var x = dx * cY - dz * sY, z = dx * sY + dz * cY;
      var y2 = dy * cP + z * sP, z2 = -dy * sP + z * cP;
      PZ = z2;
      if (z2 < NEAR) return false;
      PX = CX + (x * F) / z2;
      PY = CY - (y2 * F) / z2;
      return true;
    }
    function clipNear() {
      var n = csN, out = 0;
      for (var i = 0; i < n; i++) {
        var j = (i + 1) % n, a = i * 3, b = j * 3;
        var az = CS[a + 2], bz = CS[b + 2];
        var ain = az >= NEAR, bin = bz >= NEAR;
        if (ain) { CL[out * 3] = CS[a]; CL[out * 3 + 1] = CS[a + 1]; CL[out * 3 + 2] = az; out++; }
        if (ain !== bin) {
          var t = (NEAR - az) / (bz - az);
          CL[out * 3] = CS[a] + (CS[b] - CS[a]) * t;
          CL[out * 3 + 1] = CS[a + 1] + (CS[b + 1] - CS[a + 1]) * t;
          CL[out * 3 + 2] = NEAR;
          out++;
        }
      }
      return out;
    }
    // finish the polygon in CS; key < 0 → use the farthest vertex depth
    function polyEnd(colArr, key) {
      var n = csN, maxZ = -1e9, sumZ = 0, anyIn = false, allIn = true, i;
      if (!n) return;
      for (i = 0; i < n; i++) {
        var z = CS[i * 3 + 2];
        if (z > maxZ) maxZ = z;
        sumZ += z;
        if (z >= NEAR) anyIn = true; else allIn = false;
      }
      var avgZ = sumZ / n;
      csN = 0;
      if (!anyIn || pbN > PB.length - 40) return;
      var src = CS;
      if (!allIn) { csN = n; n = clipNear(); csN = 0; src = CL; }
      var off = pbN, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (i = 0; i < n; i++) {
        var zz = src[i * 3 + 2];
        var sx = CX + (src[i * 3] * F) / zz, sy = CY - (src[i * 3 + 1] * F) / zz;
        PB[pbN++] = sx; PB[pbN++] = sy;
        if (sx < minx) minx = sx; if (sx > maxx) maxx = sx;
        if (sy < miny) miny = sy; if (sy > maxy) maxy = sy;
      }
      if (maxx < -40 || minx > VW + 40 || maxy < -40 || miny > VH + 40) { pbN = off; return; }
      var it = newItem(key < 0 ? maxZ : key, K_POLY);
      it.off = off; it.cnt = n;
      it.col = colArr[fogLevel(avgZ)];
    }
    function quadFloor(a, b, l0, l1, y, col, key) {
      pv(a, l0, y); pv(a, l1, y); pv(b, l1, y); pv(b, l0, y);
      polyEnd(col, key);
    }

    /* ---------- path rendering ---------- */
    function renderSeg(seg, sA, sB) {
      var end = seg.len + PW;
      if (sA < 0) sA = 0;
      if (sB > end) sB = end;
      if (sB <= sA) return;
      SG = seg;
      var ex = camX - seg.sx, ez = camZ - seg.sz;
      camS = ex * seg.dx + ez * seg.dz;
      camL = ex * seg.rx + ez * seg.rz;
      var i0 = Math.floor(sA / TILE), i1 = Math.ceil(sB / TILE), gs = seg.gaps, k;
      for (var i = i0; i < i1; i++) {
        var r0 = i * TILE, r1 = Math.min(end, r0 + TILE);
        var a = r0;
        for (k = 0; k < gs.length; k++) {
          var gp = gs[k];
          if (gp.s1 <= a || gp.s0 >= r1) continue;
          if (gp.s0 > a) rowPiece(seg, i, a, gp.s0);
          a = Math.max(a, gp.s1);
        }
        if (a < r1) rowPiece(seg, i, a, r1);
      }
      // far wall of each gap (faces the runner)
      for (k = 0; k < gs.length; k++) {
        var gq = gs[k];
        if (gq.s1 < sA || gq.s0 > sB || camS > gq.s1) continue;
        pv(gq.s1, -HALF, 0); pv(gq.s1, HALF, 0); pv(gq.s1, HALF, -DEPTH); pv(gq.s1, -HALF, -DEPTH);
        polyEnd(cSide2, -1);
      }
      // corner end face
      if (camS > end && sB >= end - 0.1) {
        pv(end, HALF, 0); pv(end, -HALF, 0); pv(end, -HALF, -DEPTH); pv(end, HALF, -DEPTH);
        polyEnd(cSide2, -1);
      }
      var j;
      for (j = 0; j < seg.obs.length; j++) {
        var o = seg.obs[j];
        if (o.s1 < sA - 1 || o.s0 > sB) continue;
        drawOb(o);
      }
      for (j = 0; j < seg.deco.length; j++) {
        var dc = seg.deco[j];
        if (dc.s < sA - 3 || dc.s > sB + 8) continue;
        addDeco(dc);
      }
      for (j = 0; j < seg.coins.length; j++) {
        var c = seg.coins[j];
        if (c.taken || c.s < sA || c.s > sB) continue;
        if (proj(c.s, c.l, c.y)) {
          var it = newItem(PZ, K_SPRITE);
          it.t = S_COIN; it.x = PX; it.y = PY; it.s = F / PZ; it.al = fogAlpha(PZ); it.a = c.ph;
        }
      }
      for (j = 0; j < seg.pows.length; j++) {
        var q = seg.pows[j];
        if (q.taken || q.s < sA || q.s > sB) continue;
        if (proj(q.s, q.l, q.y + Math.sin(time * 3 + q.s) * 0.12)) {
          var it2 = newItem(PZ, K_SPRITE);
          it2.t = S_POW; it2.x = PX; it2.y = PY; it2.s = F / PZ; it2.al = fogAlpha(PZ); it2.ref = q;
        }
      }
    }

    function rowPiece(seg, i, a, b) {
      a -= 0.025; b += 0.025;
      var corner = a >= seg.len - 0.1;
      proj((a + b) / 2, 0, 0);
      var zc = PZ;
      if (zc < -3) return;
      if (zc < LOD) {
        quadFloor(a, b, -HALF, HALF, 0, cMortar, -1);
        // lane tiles have a slightly smaller far depth → drawn right after their mortar
        if (VAR === 'oz') {
          // two brick courses per row, alternating offset
          var mid = (a + b) / 2;
          for (var c2 = 0; c2 < 2; c2++) {
            var ca = c2 ? mid + 0.04 : a + 0.06, cb = c2 ? b - 0.06 : mid - 0.04;
            var offs = (i * 2 + c2) & 1 ? 0.5 : 0;
            for (var bi = -1; bi < 4; bi++) {
              var l0 = -HALF + (bi + offs) * LANE * 0.999, l1 = l0 + LANE;
              if (l1 <= -HALF || l0 >= HALF) continue;
              l0 = Math.max(l0, -HALF) + 0.05; l1 = Math.min(l1, HALF) - 0.05;
              quadFloor(ca, cb, l0, l1, 0, cTiles[(hash3(seg.id, i * 2 + c2, bi) * 4) | 0], -1);
            }
          }
        } else {
          for (var ln = 0; ln < 3; ln++) {
            var m0 = -HALF + ln * LANE + 0.06, m1 = m0 + LANE - 0.12;
            var hv = hash3(seg.id, i, ln);
            var col = hv < 0.12 ? cAccent : cTiles[(hv * 4) | 0];
            quadFloor(a + 0.06, b - 0.06, m0, m1, 0, col, -1);
          }
        }
      } else {
        quadFloor(a, b, -HALF, HALF, 0, cFar[i & 1], -1);
      }
      var leftOpen = corner && (seg.turn === -1 || seg.turn === 2);
      var rightOpen = corner && (seg.turn === 1 || seg.turn === 2);
      if (!leftOpen && camL < -HALF) {
        pv(a, -HALF, 0); pv(b, -HALF, 0); pv(b, -HALF, -DEPTH); pv(a, -HALF, -DEPTH);
        polyEnd(cSide, -1);
      }
      if (!rightOpen && camL > HALF) {
        pv(a, HALF, 0); pv(b, HALF, 0); pv(b, HALF, -DEPTH); pv(a, HALF, -DEPTH);
        polyEnd(cSide, -1);
      }
    }

    // Axis-aligned box in segment-local space; cols = [front, top, side, back]
    function box(s0, s1, l0, l1, y0, y1, cols, key) {
      if (camS < s0) { pv(s0, l0, y1); pv(s0, l1, y1); pv(s0, l1, y0); pv(s0, l0, y0); polyEnd(cols[0], key); }
      else if (camS > s1) { pv(s1, l0, y1); pv(s1, l1, y1); pv(s1, l1, y0); pv(s1, l0, y0); polyEnd(cols[3], key); }
      if (camL < l0) { pv(s0, l0, y1); pv(s1, l0, y1); pv(s1, l0, y0); pv(s0, l0, y0); polyEnd(cols[2], key); }
      else if (camL > l1) { pv(s0, l1, y1); pv(s1, l1, y1); pv(s1, l1, y0); pv(s0, l1, y0); polyEnd(cols[2], key); }
      if (camY > y1) { pv(s0, l0, y1); pv(s0, l1, y1); pv(s1, l1, y1); pv(s1, l0, y1); polyEnd(cols[1], key); }
    }
    // Front-face decoration: maps the unit square onto the projected face.
    function decal(s, l0, l1, y0, y1, type, key, seed) {
      if (camS >= s) return;
      if (!proj(s, l0, y1)) return;
      var x0 = PX, yy0 = PY;
      if (!proj(s, l1, y1)) return;
      var x1 = PX, yy1 = PY;
      if (!proj(s, l0, y0)) return;
      var it = newItem(key, K_DECAL);
      it.a = x0; it.b = yy0; it.c = x1 - x0; it.d = yy1 - yy0; it.e = PX - x0; it.f = PY - yy0;
      it.t = type; it.al = fogAlpha(PZ); it.s = seed; it.x = (l1 - l0) / (y1 - y0);
    }

    function drawOb(o) {
      if (o.broken) return;
      var lc, key;
      if (o.k === 'gap') return;
      if (o.k === 'log') {
        proj(o.s0, 0, 0); key = PZ;
        box(o.s0, o.s1, -HALF, HALF, 0, o.y1, cLog, key);
        decal(o.s0, -HALF, HALF, 0, o.y1, 'log', key, o.seed);
      } else if (o.k === 'arch') {
        proj(o.s0, 0, 0); key = PZ;
        var top = 2.35;
        box(o.s0, o.s1, -HALF - 0.42, -HALF + 0.02, -DEPTH, top, cStone, key);
        box(o.s0, o.s1, HALF - 0.02, HALF + 0.42, -DEPTH, top, cStone, key);
        box(o.s0, o.s1, -HALF - 0.42, HALF + 0.42, o.y1, top, cStone, key - 0.001);
        decal(o.s0, -HALF - 0.42, HALF + 0.42, o.y1, top, 'lintel', key - 0.002, o.seed);
      } else {
        // contiguous runs of blocked lanes
        for (var L = -1; L <= 1; L++) {
          if (!(o.lanes & laneMask(L))) continue;
          var Lend = L;
          while (Lend < 1 && o.lanes & laneMask(Lend + 1) && VAR !== 'oz') Lend++;
          var l0 = (L - 0.5) * LANE + 0.06, l1 = (Lend + 0.5) * LANE - 0.06;
          proj(o.s0, (l0 + l1) / 2, 0); key = PZ;
          if (VAR === 'oz' && o.k === 'block') {
            // pumpkins: round sprite per lane
            if (proj((o.s0 + o.s1) / 2, L * LANE, 0)) {
              var it = newItem(key, K_SPRITE);
              it.t = S_PUMPKIN; it.x = PX; it.y = PY; it.s = F / PZ; it.al = fogAlpha(PZ); it.a = o.seed + L;
            }
          } else {
            lc = o.k === 'rubble' ? (VAR === 'oz' ? cLog : cStone) : cStone;
            box(o.s0, o.s1, l0, l1, 0, o.y1, lc, key);
            decal(o.s0, l0, l1, 0, o.y1, o.k, key, o.seed + L);
          }
          L = Lend;
        }
      }
    }

    function addDeco(dc) {
      if (dc.k === 'post') {
        var l0 = dc.l - 0.22, l1 = dc.l + 0.22;
        proj(dc.s, dc.l, 0);
        var key = PZ;
        if (TH.postKind === 'lantern') {
          box(dc.s - 0.14, dc.s + 0.14, dc.l - 0.14, dc.l + 0.14, -DEPTH, 1.3, cPost, key);
          if (proj(dc.s, dc.l, 1.3) && PZ > 4) { var it = newItem(key - 0.01, K_SPRITE); it.t = S_LANTERN; it.x = PX; it.y = PY; it.s = F / PZ; it.al = fogAlpha(PZ) * clamp((PZ - 4) / 2.5, 0, 1); it.a = dc.seed; }
        } else {
          box(dc.s - 0.22, dc.s + 0.22, l0, l1, -DEPTH, 1.25, cPost, key);
          box(dc.s - 0.3, dc.s + 0.3, l0 - 0.08, l1 + 0.08, 1.25, 1.45, TH.postKind === 'torch' ? cPost : cPostCap, key - 0.001);
          if (TH.postKind === 'torch' && proj(dc.s, dc.l, 1.45) && PZ > 4) {
            var it3 = newItem(key - 0.002, K_SPRITE); it3.t = S_FLAME; it3.x = PX; it3.y = PY; it3.s = F / PZ; it3.al = fogAlpha(PZ) * clamp((PZ - 4) / 2.5, 0, 1); it3.a = dc.seed;
          }
        }
        return;
      }
      if (!proj(dc.s, dc.l, dc.y)) return;
      if (PZ < 2.2 || PX < -VW * 0.6 || PX > VW * 1.6) return;
      var it2 = newItem(PZ, K_SPRITE);
      it2.t = dc.k; it2.x = PX; it2.y = PY; it2.s = F / PZ; it2.al = fogAlpha(PZ); it2.a = dc.seed; it2.b = dc.sz;
    }

    function buildScene() {
      nItems = 0;
      pbN = 0;
      if (!segs.length) return;
      var cur = segs[0];
      if (prevSeg) renderSeg(prevSeg, prevSeg.len - 16, prevSeg.len + PW);
      renderSeg(cur, p.s - CAM_BACK - 4, p.s + DRAW);
      var used = cur.len + PW - p.s;
      if (cur.turn === 2 && cur.alt) renderSeg(cur.alt, 0, DRAW - used);
      for (var i = 1; i < segs.length && used < DRAW; i++) {
        var sg = segs[i];
        renderSeg(sg, 0, DRAW - used);
        if (sg.turn === 2 && sg.alt && used + sg.len + PW < DRAW) renderSeg(sg.alt, 0, DRAW - used - sg.len - PW);
        used += sg.len + PW;
      }
      // runner, shadow and pursuer
      SG = segs[0];
      var ex = camX - SG.sx, ez = camZ - SG.sz;
      camS = ex * SG.dx + ez * SG.dz;
      camL = ex * SG.rx + ez * SG.rz;
      var onPath = !overGap(SG, p.s) && p.s < SG.len + PW - 0.2 && !(state === 'dying' && deathCause === 'fall');
      if (proj(p.s, p.lat, Math.max(p.y, -30))) {
        var rz = PZ;
        var it = newItem(rz, K_SPRITE);
        it.t = S_RUNNER; it.x = PX; it.y = PY; it.s = F / PZ; it.al = 1;
        if (onPath && proj(p.s, p.lat, 0)) {
          var sh = newItem(rz + 0.05, K_SPRITE);
          sh.t = S_SHADOW; sh.x = PX; sh.y = PY; sh.s = F / PZ; sh.al = clamp(1 - p.y / 2.2, 0.15, 1);
        }
      }
      if ((state === 'play' || state === 'dying' || state === 'paused') && chase < CAM_BACK - 0.3) {
        if (proj(p.s - chase, chaseLat * 0.8, 0)) {
          var ch = newItem(PZ, K_SPRITE);
          ch.t = S_CHASER; ch.x = PX; ch.y = PY; ch.s = F / PZ; ch.al = 1;
        }
      }
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                          */
    /* ------------------------------------------------------------------ */
    function render() {
      if (gradDirty) buildGradients();
      cY = Math.cos(camYaw); sY = Math.sin(camYaw);
      g.save();
      if (shake > 0) {
        var m = shake * shake * UI * 0.03;
        g.translate((R() - 0.5) * m, (R() - 0.5) * m);
      }
      drawSky();
      buildScene();
      order.length = nItems;
      for (var i = 0; i < nItems; i++) order[i] = POOL[i];
      order.sort(byKey);
      for (i = 0; i < nItems; i++) {
        var it = order[i];
        if (it.kind === K_POLY) {
          var o = it.off;
          g.fillStyle = it.col;
          g.beginPath();
          g.moveTo(PB[o], PB[o + 1]);
          for (var k = 1; k < it.cnt; k++) g.lineTo(PB[o + k * 2], PB[o + k * 2 + 1]);
          g.closePath();
          g.fill();
        } else if (it.kind === K_DECAL) drawDecal(it);
        else drawSprite(it);
      }
      drawParticles();
      g.restore();
      drawOverlayFx();
      if (state === 'play' && tutorial) drawPrompt();
      updateHud();
    }

    /* ---------- sky & panorama ---------- */
    var PRNG = seeded(VAR === 'oz' ? 77 : VAR === 'classic' ? 991 : 4242);
    var stars = [], clouds = [], landmarks = [], ridgeA = [], ridgeB = [];
    (function initPanorama() {
      var i;
      for (i = 0; i < 5; i++) { ridgeA.push([1 + i * 2 + ((PRNG() * 3) | 0), PRNG() * TAU, 0.006 + PRNG() * 0.016]); ridgeB.push([2 + i * 3 + ((PRNG() * 3) | 0), PRNG() * TAU, 0.004 + PRNG() * 0.011]); }
      if (VAR === 'classic') for (i = 0; i < 110; i++) stars.push([PRNG() * TAU, 0.05 + PRNG() * 0.75, PRNG(), PRNG() * 6]);
      var nc = VAR === 'classic' ? 3 : 9;
      for (i = 0; i < nc; i++) clouds.push([PRNG() * TAU, 0.1 + PRNG() * 0.3, 0.6 + PRNG() * 0.9, PRNG()]);
      if (VAR === 'temple') { landmarks.push(['zig', 0.35, 1]); landmarks.push(['zig', 2.6, 0.7]); landmarks.push(['zig', -1.9, 0.85]); landmarks.push(['falls', 1.3, 1]); }
      if (VAR === 'oz') { landmarks.push(['city', 0.05, 0.6]); landmarks.push(['rainbow', 2.3, 0.8]); landmarks.push(['city', PI, 0.35]); for (i = 0; i < 6; i++) landmarks.push(['balloon', PRNG() * TAU, 0.5 + PRNG() * 0.6, 0.12 + PRNG() * 0.22, PRNG()]); }
      if (VAR === 'classic') { landmarks.push(['moon', 0.55, 1]); landmarks.push(['ruin', -0.5, 1]); landmarks.push(['ruin', 1.9, 0.8]); landmarks.push(['ruin', -2.6, 0.9]); }
    })();
    function ridgeH(a, arr) {
      var h = 0;
      for (var i = 0; i < arr.length; i++) h += arr[i][2] * (0.5 + 0.5 * Math.sin(arr[i][0] * a + arr[i][1]));
      return h;
    }
    function angX(a) { return CX + wrapA(a - camYaw) * F; }

    function drawSky() {
      g.fillStyle = skyGrad;
      g.fillRect(-30, -30, VW + 60, HZ + 32);
      var i, x, a;
      if (VAR === 'classic') {
        for (i = 0; i < stars.length; i++) {
          var st = stars[i];
          x = angX(st[0]);
          if (x < -5 || x > VW + 5) continue;
          var y = HZ - st[1] * F * 0.9;
          if (y < -5) continue;
          g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(time * 1.3 + st[3]));
          g.fillStyle = st[2] > 0.85 ? '#ffe8b0' : '#ffffff';
          var sz = st[2] > 0.7 ? 2 : 1.2;
          g.fillRect(x, y, sz, sz);
        }
        g.globalAlpha = 1;
      }
      // sun / moon glow
      var sunA = VAR === 'classic' ? 0.55 : VAR === 'oz' ? -0.6 : 0.5;
      x = angX(sunA);
      if (x > -VW && x < VW * 2) {
        var sy = HZ - (VAR === 'classic' ? 0.21 : 0.2) * F;
        var rr = F * 0.055;
        var glow = g.createRadialGradient(x, sy, rr * 0.5, x, sy, rr * 5);
        glow.addColorStop(0, VAR === 'classic' ? 'rgba(220,225,255,0.45)' : 'rgba(255,248,215,0.7)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = glow;
        g.fillRect(x - rr * 5, sy - rr * 5, rr * 10, rr * 10);
        g.fillStyle = VAR === 'classic' ? '#eef0ff' : '#fffbe8';
        g.beginPath(); g.arc(x, sy, rr, 0, TAU); g.fill();
        if (VAR === 'classic') {
          g.fillStyle = 'rgba(160,165,200,0.45)';
          g.beginPath(); g.arc(x - rr * 0.3, sy - rr * 0.2, rr * 0.22, 0, TAU); g.arc(x + rr * 0.35, sy + rr * 0.3, rr * 0.16, 0, TAU); g.arc(x + rr * 0.1, sy - rr * 0.45, rr * 0.1, 0, TAU); g.fill();
        }
      }
      // clouds
      for (i = 0; i < clouds.length; i++) {
        var cl = clouds[i];
        a = cl[0] + time * 0.004;
        x = angX(a);
        var w = cl[2] * F * 0.16;
        if (x < -w * 2 || x > VW + w * 2) continue;
        var cy = HZ - cl[1] * F * 0.7;
        g.fillStyle = VAR === 'classic' ? 'rgba(90,80,140,0.35)' : 'rgba(255,255,255,0.75)';
        g.beginPath();
        g.ellipse(x, cy, w, w * 0.28, 0, 0, TAU);
        g.ellipse(x - w * 0.45, cy + w * 0.06, w * 0.5, w * 0.22, 0, 0, TAU);
        g.ellipse(x + w * 0.35, cy - w * 0.1, w * 0.45, w * 0.3, 0, 0, TAU);
        g.fill();
      }
      for (i = 0; i < landmarks.length; i++) if (landmarks[i][0] === 'rainbow' || landmarks[i][0] === 'balloon' || landmarks[i][0] === 'moon') drawLandmark(landmarks[i]);
      // ridges
      drawRidge(TH.ridgeFar, ridgeA, 0.03);
      for (i = 0; i < landmarks.length; i++) { var lk = landmarks[i][0]; if (lk === 'zig' || lk === 'city' || lk === 'ruin' || lk === 'falls') drawLandmark(landmarks[i]); }
      drawRidge(TH.ridgeNear, ridgeB, 0.006);
      // ground below the horizon (the drop below the causeway)
      g.fillStyle = groundGrad;
      g.fillRect(-30, HZ, VW + 60, VH - HZ + 30);
    }
    function drawRidge(col, arr, base) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(-30, HZ + 1);
      var step = Math.max(8, VW / 70);
      for (var x = -30; x <= VW + 30; x += step) {
        var a = camYaw + (x - CX) / F;
        g.lineTo(x, HZ - (base + ridgeH(a, arr)) * F);
      }
      g.lineTo(VW + 30, HZ + 1);
      g.closePath();
      g.fill();
    }
    function drawLandmark(L) {
      var x = angX(L[1]);
      var sc = F * L[2];
      if (x < -sc * 0.6 || x > VW + sc * 0.6) return;
      var k = L[0], y = HZ, i;
      if (k === 'zig') {
        g.fillStyle = '#8fa98a';
        for (i = 0; i < 5; i++) {
          var w = sc * (0.2 - i * 0.034), h = sc * 0.024;
          g.fillRect(x - w / 2, y - sc * 0.035 - (i + 1) * h, w, h + 1);
        }
        g.fillRect(x - sc * 0.018, y - sc * 0.035 - 6.6 * sc * 0.024, sc * 0.036, sc * 0.03);
        g.fillStyle = 'rgba(232,184,74,0.55)';
        g.fillRect(x - sc * 0.008, y - sc * 0.035 - 6.4 * sc * 0.024, sc * 0.016, sc * 0.016);
      } else if (k === 'falls') {
        g.fillStyle = 'rgba(235,245,255,0.55)';
        g.fillRect(x - sc * 0.012, y - sc * 0.11, sc * 0.024, sc * 0.1);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath(); g.ellipse(x, y - sc * 0.012, sc * 0.04, sc * 0.01, 0, 0, TAU); g.fill();
      } else if (k === 'city') {
        var base = y - sc * 0.035;
        var spires = [[-0.11, 0.06, 0.03], [-0.07, 0.1, 0.035], [-0.03, 0.16, 0.04], [0, 0.22, 0.05], [0.04, 0.15, 0.04], [0.08, 0.11, 0.035], [0.115, 0.07, 0.03]];
        var glow = g.createRadialGradient(x, base - sc * 0.08, 0, x, base - sc * 0.08, sc * 0.25);
        glow.addColorStop(0, 'rgba(120,255,180,0.35)'); glow.addColorStop(1, 'rgba(120,255,180,0)');
        g.fillStyle = glow; g.fillRect(x - sc * 0.25, base - sc * 0.33, sc * 0.5, sc * 0.33);
        for (i = 0; i < spires.length; i++) {
          var sp = spires[i], sx = x + sp[0] * sc, sw = sp[2] * sc, sh = sp[1] * sc;
          g.fillStyle = i % 2 ? '#3fbf7f' : '#2fa36a';
          g.fillRect(sx - sw / 2, base - sh, sw, sh);
          g.beginPath(); g.moveTo(sx - sw / 2, base - sh); g.lineTo(sx, base - sh - sw * 1.4); g.lineTo(sx + sw / 2, base - sh); g.fill();
          g.fillStyle = 'rgba(210,255,230,0.7)';
          g.fillRect(sx - sw * 0.12, base - sh * 0.85, sw * 0.24, sh * 0.6);
        }
        g.fillStyle = '#2a8f5c';
        g.fillRect(x - sc * 0.14, base - sc * 0.03, sc * 0.28, sc * 0.035);
      } else if (k === 'rainbow') {
        var cols = ['#ff5a5a', '#ffa64d', '#ffe14d', '#6ddc6d', '#5aa8ff', '#9a6bff'];
        g.lineWidth = sc * 0.012;
        g.globalAlpha = 0.45;
        for (i = 0; i < cols.length; i++) {
          g.strokeStyle = cols[i];
          g.beginPath(); g.arc(x, y + sc * 0.02, sc * (0.34 - i * 0.012), PI, TAU); g.stroke();
        }
        g.globalAlpha = 1;
      } else if (k === 'balloon') {
        var by = y - L[3] * F + Math.sin(time * 0.6 + L[4] * 9) * F * 0.008;
        drawBalloonShape(x, by, F * 0.028 * L[2], L[4]);
      } else if (k === 'moon') {
        // drawn by the sun/moon pass
      } else if (k === 'ruin') {
        // broken colonnade with a half arch on the cliff line
        g.fillStyle = '#1b1631';
        var base2 = y - sc * 0.03, cw2 = sc * 0.014, i2;
        g.fillRect(x - sc * 0.13, base2 - sc * 0.012, sc * 0.26, sc * 0.014);
        var hs = [0.09, 0.11, 0.06, 0.11, 0.035, 0.08];
        for (i2 = 0; i2 < hs.length; i2++) {
          var px2 = x - sc * 0.11 + i2 * sc * 0.044;
          g.fillRect(px2 - cw2 / 2, base2 - sc * hs[i2], cw2, sc * hs[i2]);
          if (hs[i2] > 0.07) g.fillRect(px2 - cw2, base2 - sc * hs[i2] - sc * 0.008, cw2 * 2, sc * 0.008);
        }
        g.fillRect(x - sc * 0.11 - cw2, base2 - sc * 0.118, sc * 0.1, sc * 0.01);
        g.lineWidth = cw2 * 0.9;
        g.strokeStyle = '#1b1631';
        g.beginPath(); g.arc(x + sc * 0.066, base2 - sc * 0.11, sc * 0.022, PI, PI * 1.6); g.stroke();
      }
    }
    function drawBalloonShape(x, y, r, seed) {
      var pal = [['#ff6b6b', '#ffd93d'], ['#6bcBff', '#ffffff'], ['#b98cff', '#ffd1f0'], ['#ff9f43', '#fff3b0']][(seed * 4) | 0];
      g.fillStyle = pal[0];
      g.beginPath(); g.ellipse(x, y, r, r * 1.15, 0, 0, TAU); g.fill();
      g.fillStyle = pal[1];
      g.beginPath(); g.ellipse(x, y, r * 0.38, r * 1.12, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(60,40,20,0.8)';
      g.lineWidth = Math.max(1, r * 0.06);
      g.beginPath(); g.moveTo(x - r * 0.55, y + r * 0.95); g.lineTo(x - r * 0.25, y + r * 1.6); g.moveTo(x + r * 0.55, y + r * 0.95); g.lineTo(x + r * 0.25, y + r * 1.6); g.stroke();
      g.fillStyle = '#8a5a35';
      g.fillRect(x - r * 0.3, y + r * 1.55, r * 0.6, r * 0.45);
    }

    /* ---------- decals (front faces of obstacles) ---------- */
    function drawDecal(it) {
      g.save();
      g.globalAlpha = it.al;
      g.transform(it.c, it.d, it.e, it.f, it.a, it.b);
      var t = it.t, sd = it.s, asp = it.x, i;
      var st = TH.stone, lg = TH.log;
      if (t === 'log') {
        if (VAR === 'oz') {
          // hedge row with red flowers
          g.fillStyle = lg[0]; g.fillRect(0, 0.2, 1, 0.8);
          g.fillStyle = lg[1];
          for (i = 0; i < 9; i++) { g.beginPath(); g.ellipse((i + 0.5) / 9, 0.28, 0.07, 0.3, 0, 0, TAU); g.fill(); }
          g.fillStyle = '#e6455a';
          for (i = 0; i < 12; i++) { var fx = hash3(sd, i, 1), fy = 0.25 + hash3(sd, i, 2) * 0.55; g.beginPath(); g.ellipse(fx, fy, 0.012, 0.07, 0, 0, TAU); g.fill(); }
        } else {
          g.fillStyle = lg[0]; g.fillRect(0, 0.08, 1, 0.84);
          g.fillStyle = lg[1]; g.fillRect(0, 0.08, 1, 0.18);
          g.fillStyle = lg[3];
          for (i = 0; i < 5; i++) g.fillRect(0, 0.35 + i * 0.12, 1, 0.035);
          for (i = 0; i < 3; i++) { g.beginPath(); g.ellipse(0.15 + hash3(sd, i, 3) * 0.7, 0.55, 0.03, 0.18, 0, 0, TAU); g.fill(); }
          g.fillStyle = TH.accent;
          for (i = 0; i < 4; i++) g.fillRect(hash3(sd, i, 5) * 0.9, 0.05, 0.08, 0.12);
        }
      } else if (t === 'lintel') {
        if (VAR === 'oz') {
          g.fillStyle = st[0]; g.fillRect(0, 0, 1, 1);
          g.fillStyle = st[3]; g.fillRect(0, 0.8, 1, 0.2);
          g.fillStyle = '#3f9a4a';
          for (i = 0; i < 14; i++) { g.beginPath(); g.ellipse((i + 0.5) / 14, 0.45 + Math.sin(i * 1.7) * 0.2, 0.045, 0.3, 0, 0, TAU); g.fill(); }
          g.fillStyle = '#ff6b8a';
          for (i = 0; i < 10; i++) { g.beginPath(); g.ellipse(hash3(sd, i, 7), 0.25 + hash3(sd, i, 8) * 0.5, 0.012, 0.1, 0, 0, TAU); g.fill(); }
        } else {
          g.fillStyle = st[0]; g.fillRect(0, 0, 1, 1);
          g.fillStyle = st[1]; g.fillRect(0, 0, 1, 0.1);
          g.fillStyle = st[3]; g.fillRect(0, 0.9, 1, 0.1);
          g.fillStyle = st[2];
          for (i = 0; i < 9; i++) { g.fillRect(0.06 + i * 0.1, 0.3, 0.06, 0.4); }
          g.fillStyle = VAR === 'classic' ? 'rgba(90,220,255,0.75)' : TH.gold;
          g.beginPath(); g.ellipse(0.5, 0.5, 0.045, 0.3, 0, 0, TAU); g.fill();
          g.fillStyle = st[3];
          g.beginPath(); g.ellipse(0.5, 0.5, 0.02, 0.13, 0, 0, TAU); g.fill();
        }
      } else if (t === 'block') {
        g.fillStyle = st[0]; g.fillRect(0, 0, 1, 1);
        if (VAR === 'classic') {
          // fluted broken column
          g.fillStyle = st[2];
          for (i = 0; i < 4; i++) g.fillRect(0.12 + i * 0.22, 0.08, 0.07, 0.9);
          g.fillStyle = st[1]; g.fillRect(0, 0, 1, 0.07);
          g.fillStyle = 'rgba(200,215,255,0.25)'; g.fillRect(0, 0, 0.12, 1);
        } else {
          // carved guardian face
          var cw = Math.min(1, 1.1 / Math.max(asp, 0.4));
          g.fillStyle = st[1]; g.fillRect(0, 0, 1, 0.06);
          g.fillStyle = st[2]; g.fillRect(0, 0.94, 1, 0.06);
          var nf = Math.max(1, Math.round(asp / 0.6));
          for (var f = 0; f < nf; f++) {
            var cx = (f + 0.5) / nf, hw = 0.32 / nf * cw;
            g.fillStyle = st[3];
            g.fillRect(cx - hw, 0.26, hw * 0.8, 0.07);
            g.fillRect(cx + hw * 0.2, 0.26, hw * 0.8, 0.07);
            g.fillStyle = TH.gold;
            g.fillRect(cx - hw * 0.8, 0.34, hw * 0.45, 0.05);
            g.fillRect(cx + hw * 0.35, 0.34, hw * 0.45, 0.05);
            g.fillStyle = st[2];
            g.fillRect(cx - hw * 0.12, 0.4, hw * 0.24, 0.18);
            g.fillStyle = st[3];
            g.fillRect(cx - hw * 0.6, 0.66, hw * 1.2, 0.08);
            for (i = 0; i < 4; i++) g.fillRect(cx - hw * 0.5 + i * hw * 0.3, 0.74, hw * 0.12, 0.05);
          }
          g.fillStyle = TH.accent; g.globalAlpha = it.al * 0.8;
          g.fillRect(0, 0.88, 0.3, 0.06); g.fillRect(0.6, 0.9, 0.4, 0.05);
        }
      } else if (t === 'rubble') {
        if (VAR === 'oz') {
          // hay bales
          g.fillStyle = '#e8c45a'; g.fillRect(0, 0.05, 1, 0.95);
          g.fillStyle = '#c99d33';
          for (i = 0; i < 6; i++) g.fillRect(0, 0.15 + i * 0.14, 1, 0.04);
          g.fillStyle = '#8a5a35'; g.fillRect(0.3, 0.05, 0.03, 0.95); g.fillRect(0.67, 0.05, 0.03, 0.95);
        } else {
          g.fillStyle = st[3]; g.fillRect(0, 0, 1, 1);
          for (i = 0; i < 7; i++) {
            g.fillStyle = i % 2 ? st[0] : st[1];
            var rx = hash3(sd, i, 11) * 0.8, ry = 0.15 + hash3(sd, i, 12) * 0.5;
            g.fillRect(rx, ry, 0.18 + hash3(sd, i, 13) * 0.15, 0.25 + hash3(sd, i, 14) * 0.3);
          }
        }
      }
      g.restore();
    }

    /* ---------- sprites ---------- */
    function drawSprite(it) {
      var x = it.x, y = it.y, s = it.s;
      if (it.al <= 0.02) return;
      g.globalAlpha = it.al;
      switch (it.t) {
        case S_COIN: drawCoin(x, y, s, it.a); break;
        case S_POW: drawPow(x, y, s, it.ref.k); break;
        case S_TREE: drawTree(x, y, s * it.b, it.a); break;
        case S_PALM: drawPalm(x, y, s * it.b, it.a); break;
        case S_BUSH: drawBush(x, y, s * it.b, it.a); break;
        case S_STATUE: drawStatue(x, y, s, it.a); break;
        case S_BALLOON: drawBalloonShape(x, y + Math.sin(time + it.a) * s * 0.3, s * it.b * 1.1, (it.a % 97) / 97); break;
        case S_PUMPKIN: drawPumpkin(x, y, s, it.a); break;
        case S_LANTERN: drawLantern(x, y, s, it.a); break;
        case S_FLAME: drawFlame(x, y, s, it.a); break;
        case S_SHADOW:
          g.fillStyle = 'rgba(0,0,0,0.28)';
          g.beginPath(); g.ellipse(x, y, s * 0.42 * it.al, s * 0.14 * it.al, 0, 0, TAU); g.fill();
          break;
        case S_RUNNER: drawRunner(x, y, s); break;
        case S_CHASER: drawChaser(x, y, s); break;
      }
      g.globalAlpha = 1;
    }

    function drawCoin(x, y, s, ph) {
      var r = s * 0.22;
      if (r < 0.6) return;
      var w = Math.max(0.18, Math.abs(Math.cos(time * 4 + ph))) * r;
      if (TH.gem) {
        g.fillStyle = '#0f8a5a';
        g.beginPath(); g.moveTo(x, y - r * 1.15); g.lineTo(x + w, y - r * 0.2); g.lineTo(x, y + r * 1.05); g.lineTo(x - w, y - r * 0.2); g.closePath(); g.fill();
        g.fillStyle = '#2ee59d';
        g.beginPath(); g.moveTo(x, y - r * 0.95); g.lineTo(x + w * 0.7, y - r * 0.2); g.lineTo(x, y + r * 0.75); g.lineTo(x - w * 0.7, y - r * 0.2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(220,255,240,0.85)';
        g.beginPath(); g.moveTo(x - w * 0.15, y - r * 0.75); g.lineTo(x + w * 0.35, y - r * 0.25); g.lineTo(x - w * 0.15, y - r * 0.15); g.closePath(); g.fill();
        return;
      }
      g.fillStyle = '#b07d10';
      g.beginPath(); g.ellipse(x, y, w, r, 0, 0, TAU); g.fill();
      g.fillStyle = '#f7c948';
      g.beginPath(); g.ellipse(x, y, w * 0.8, r * 0.82, 0, 0, TAU); g.fill();
      if (w > r * 0.45) {
        g.fillStyle = '#ffe58a';
        g.beginPath(); g.ellipse(x - w * 0.15, y - r * 0.2, w * 0.3, r * 0.35, 0, 0, TAU); g.fill();
      }
    }

    function drawPow(x, y, s, k) {
      var r = s * 0.42;
      if (r < 1) return;
      var col = k === 'mag' ? '#ef4444' : k === 'shd' ? '#38bdf8' : '#f59e0b';
      var pulse = 1 + Math.sin(time * 6) * 0.08;
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath(); g.arc(x, y, r * 1.35 * pulse, 0, TAU); g.fill();
      g.fillStyle = col;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = r * 0.22;
      g.lineCap = 'butt';
      if (k === 'mag') {
        g.beginPath(); g.arc(x, y - r * 0.05, r * 0.42, 0, PI); g.stroke();
        g.fillRect(x - r * 0.53, y - r * 0.5, r * 0.22, r * 0.45);
        g.fillRect(x + r * 0.31, y - r * 0.5, r * 0.22, r * 0.45);
      } else if (k === 'shd') {
        g.beginPath(); g.moveTo(x, y - r * 0.6); g.lineTo(x + r * 0.5, y - r * 0.38); g.lineTo(x + r * 0.42, y + r * 0.2); g.lineTo(x, y + r * 0.62); g.lineTo(x - r * 0.42, y + r * 0.2); g.lineTo(x - r * 0.5, y - r * 0.38); g.closePath(); g.fill();
      } else {
        g.font = '900 ' + Math.round(r * 0.95) + 'px system-ui, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('x2', x, y + r * 0.05);
      }
    }

    function drawTree(x, y, s, seed) {
      var h = s * (VAR === 'oz' ? 6.2 : 7.5), tw = s * 0.32;
      var L = TH.leaves;
      g.fillStyle = TH.trunk;
      g.beginPath(); g.moveTo(x - tw, y); g.lineTo(x - tw * 0.55, y - h * 0.8); g.lineTo(x + tw * 0.55, y - h * 0.8); g.lineTo(x + tw, y); g.fill();
      var cy = y - h * 0.82, cr = s * (VAR === 'oz' ? 1.6 : 1.5);
      if (VAR === 'oz') {
        g.fillStyle = L[0]; g.beginPath(); g.arc(x, cy, cr, 0, TAU); g.fill();
        g.fillStyle = L[2]; g.beginPath(); g.arc(x - cr * 0.2, cy - cr * 0.2, cr * 0.75, 0, TAU); g.fill();
        g.fillStyle = L[3]; g.beginPath(); g.arc(x - cr * 0.35, cy - cr * 0.4, cr * 0.35, 0, TAU); g.fill();
        g.fillStyle = '#e8434f';
        for (var i = 0; i < 4; i++) { var a = hash3(seed, i, 1) * TAU; g.beginPath(); g.arc(x + Math.cos(a) * cr * 0.6, cy + Math.sin(a) * cr * 0.6, cr * 0.09, 0, TAU); g.fill(); }
        return;
      }
      var n = 5;
      for (var j = 0; j < n; j++) {
        var ang = (j / n) * TAU + seed;
        g.fillStyle = L[j % 2];
        g.beginPath(); g.arc(x + Math.cos(ang) * cr * 0.75, cy + Math.sin(ang) * cr * 0.45, cr * 0.7, 0, TAU); g.fill();
      }
      g.fillStyle = L[2]; g.beginPath(); g.arc(x - cr * 0.15, cy - cr * 0.25, cr * 0.65, 0, TAU); g.fill();
      if (VAR !== 'classic') { g.fillStyle = L[3]; g.beginPath(); g.arc(x - cr * 0.35, cy - cr * 0.45, cr * 0.3, 0, TAU); g.fill(); }
    }
    function drawPalm(x, y, s, seed) {
      var h = s * 7, lean = (hash3(seed, 1, 1) - 0.5) * s * 2.2;
      g.strokeStyle = TH.trunk;
      g.lineWidth = s * 0.3;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.2, y - h * 0.6, x + lean, y - h); g.stroke();
      var tx = x + lean, ty = y - h;
      g.fillStyle = TH.leaves[1];
      for (var i = 0; i < 6; i++) {
        var a = -PI / 2 + (i - 2.5) * 0.55 + Math.sin(time * 1.5 + seed + i) * 0.04;
        var lx = tx + Math.cos(a) * s * 2.4, ly = ty + Math.sin(a) * s * 1.2 + s * 0.9;
        g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + lx) / 2, ty - s * 0.9 + Math.sin(a) * s, lx, ly); g.quadraticCurveTo((tx + lx) / 2, ty - s * 0.3, tx, ty); g.fill();
      }
      g.fillStyle = TH.leaves[2]; g.beginPath(); g.arc(tx, ty, s * 0.3, 0, TAU); g.fill();
    }
    function drawBush(x, y, s, seed) {
      var L = TH.leaves;
      var r = s * 0.9;
      g.fillStyle = L[0]; g.beginPath(); g.arc(x - r * 0.6, y - r * 0.5, r * 0.75, 0, TAU); g.arc(x + r * 0.6, y - r * 0.45, r * 0.7, 0, TAU); g.fill();
      g.fillStyle = L[1]; g.beginPath(); g.arc(x, y - r * 0.8, r * 0.85, 0, TAU); g.fill();
      if (VAR === 'oz') {
        g.fillStyle = '#e8434f';
        for (var i = 0; i < 5; i++) { g.beginPath(); g.arc(x + (hash3(seed, i, 4) - 0.5) * r * 2, y - r * (0.4 + hash3(seed, i, 5) * 1.0), r * 0.13, 0, TAU); g.fill(); }
      } else if (VAR === 'classic') {
        // fireflies
        g.fillStyle = 'rgba(255,240,140,0.9)';
        for (var j = 0; j < 2; j++) { var fa = time * 1.4 + seed + j * 3; g.fillRect(x + Math.cos(fa) * r * 1.2, y - r * 1.4 + Math.sin(fa * 1.3) * r * 0.5, Math.max(1.5, r * 0.08), Math.max(1.5, r * 0.08)); }
      }
    }
    function drawStatue(x, y, s, seed) {
      var st = TH.stone;
      if (VAR === 'oz') {
        // emerald crystal spire cluster
        var cols = ['#1f9a62', '#2ee59d', '#17734a'];
        var defs = [[-1.4, 5, 0.9], [1.3, 4.2, 0.8], [0, 8, 1.3]];
        for (var i = 0; i < 3; i++) {
          var d = defs[i], cx = x + d[0] * s, hh = d[1] * s, ww = d[2] * s;
          g.fillStyle = cols[i];
          g.beginPath(); g.moveTo(cx - ww, y); g.lineTo(cx - ww, y - hh * 0.75); g.lineTo(cx, y - hh); g.lineTo(cx + ww, y - hh * 0.75); g.lineTo(cx + ww, y); g.fill();
          g.fillStyle = 'rgba(220,255,240,0.45)';
          g.beginPath(); g.moveTo(cx - ww * 0.3, y - hh * 0.1); g.lineTo(cx - ww * 0.3, y - hh * 0.7); g.lineTo(cx, y - hh * 0.92); g.lineTo(cx, y - hh * 0.1); g.fill();
        }
        return;
      }
      if (VAR === 'classic') {
        // broken colossal column with a brazier
        var w = s * 1.6, h = s * 8;
        g.fillStyle = st[2]; g.fillRect(x - w / 2, y - h, w, h);
        g.fillStyle = st[0]; g.fillRect(x - w / 2, y - h, w * 0.7, h);
        g.fillStyle = st[3];
        for (var k = 0; k < 4; k++) g.fillRect(x - w / 2 + w * (0.12 + k * 0.22), y - h, w * 0.06, h);
        g.fillStyle = st[1];
        g.beginPath(); g.moveTo(x - w * 0.65, y - h); g.lineTo(x - w * 0.2, y - h - s * 0.5); g.lineTo(x + w * 0.2, y - h - s * 0.1); g.lineTo(x + w * 0.65, y - h - s * 0.4); g.lineTo(x + w * 0.65, y - h + s * 0.3); g.lineTo(x - w * 0.65, y - h + s * 0.3); g.fill();
        drawFlame(x, y - h - s * 0.3, s * 1.6, seed);
        return;
      }
      // temple: giant idol head with a stepped crown
      var W2 = s * 3.6, H2 = s * 7.2, top = y - H2;
      g.fillStyle = st[2]; g.fillRect(x - W2 / 2, top, W2, H2);
      g.fillStyle = st[0]; g.fillRect(x - W2 / 2, top, W2 * 0.8, H2);
      // crown
      g.fillStyle = st[1];
      g.fillRect(x - W2 * 0.62, top - s * 0.5, W2 * 1.24, s * 0.6);
      g.fillRect(x - W2 * 0.45, top - s * 1.1, W2 * 0.9, s * 0.65);
      g.fillRect(x - W2 * 0.18, top - s * 1.7, W2 * 0.36, s * 0.65);
      g.fillStyle = TH.gold;
      g.fillRect(x - W2 * 0.62, top - s * 0.05, W2 * 1.24, s * 0.16);
      g.fillRect(x - W2 * 0.08, top - s * 1.55, W2 * 0.16, s * 0.35);
      // brow, eyes, nose, mouth
      g.fillStyle = st[3];
      g.fillRect(x - W2 * 0.4, top + s * 0.9, W2 * 0.8, s * 0.22);
      g.fillRect(x - W2 * 0.33, top + s * 1.35, W2 * 0.24, s * 0.55);
      g.fillRect(x + W2 * 0.09, top + s * 1.35, W2 * 0.24, s * 0.55);
      g.fillStyle = TH.gold;
      g.fillRect(x - W2 * 0.27, top + s * 1.5, W2 * 0.12, s * 0.28);
      g.fillRect(x + W2 * 0.15, top + s * 1.5, W2 * 0.12, s * 0.28);
      g.fillStyle = st[2];
      g.fillRect(x - W2 * 0.07, top + s * 2.0, W2 * 0.14, s * 1.2);
      g.fillStyle = st[3];
      g.fillRect(x - W2 * 0.3, top + s * 3.6, W2 * 0.6, s * 0.4);
      for (var tI = 0; tI < 5; tI++) g.fillRect(x - W2 * 0.27 + tI * W2 * 0.12, top + s * 4.0, W2 * 0.06, s * 0.25);
      g.fillStyle = TH.accent;
      g.fillRect(x - W2 / 2, top + s * 5.3, W2 * 0.45, s * 0.35);
      g.fillRect(x + W2 * 0.1, top + s * 6.2, W2 * 0.4, s * 0.3);
    }
    function drawPumpkin(x, y, s, seed) {
      var r = s * 0.62;
      g.fillStyle = '#c75f12';
      g.beginPath(); g.ellipse(x, y - r * 0.95, r * 1.05, r * 0.95, 0, 0, TAU); g.fill();
      g.fillStyle = '#f08a24';
      g.beginPath(); g.ellipse(x - r * 0.45, y - r * 0.95, r * 0.5, r * 0.9, 0, 0, TAU); g.ellipse(x + r * 0.45, y - r * 0.95, r * 0.5, r * 0.9, 0, 0, TAU); g.fill();
      g.fillStyle = '#ff9f3d';
      g.beginPath(); g.ellipse(x, y - r * 0.95, r * 0.42, r * 0.93, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,230,180,0.5)';
      g.beginPath(); g.ellipse(x - r * 0.15, y - r * 1.45, r * 0.15, r * 0.25, 0, 0, TAU); g.fill();
      g.fillStyle = '#4e7a2a';
      g.fillRect(x - r * 0.1, y - r * 2.05, r * 0.2, r * 0.3);
      g.fillStyle = '#5aa94b';
      g.beginPath(); g.ellipse(x + r * 0.28, y - r * 1.9, r * 0.28, r * 0.12, -0.4, 0, TAU); g.fill();
    }
    function drawLantern(x, y, s, seed) {
      var r = s * 0.24, fl = 0.85 + Math.sin(time * 7 + seed) * 0.1;
      g.fillStyle = 'rgba(120,255,190,' + (0.13 * fl) + ')';
      g.beginPath(); g.arc(x, y - r * 1.3, r * 2.4, 0, TAU); g.fill();
      g.fillStyle = '#1f6b42'; g.fillRect(x - r * 0.9, y - r * 0.2, r * 1.8, r * 0.35);
      g.fillStyle = '#9dffcf';
      g.beginPath(); g.moveTo(x, y - r * 2.6); g.lineTo(x + r * 0.75, y - r * 1.3); g.lineTo(x, y - r * 0.2); g.lineTo(x - r * 0.75, y - r * 1.3); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(x, y - r * 2.1); g.lineTo(x + r * 0.3, y - r * 1.3); g.lineTo(x, y - r * 0.7); g.lineTo(x - r * 0.3, y - r * 1.3); g.fill();
    }
    function drawFlame(x, y, s, seed) {
      var r = s * 0.28, fl = Math.sin(time * 13 + seed) * 0.12 + Math.sin(time * 7.3 + seed * 2) * 0.08;
      g.fillStyle = 'rgba(255,170,60,0.13)';
      g.beginPath(); g.arc(x, y - r * 1.2, r * 2.8, 0, TAU); g.fill();
      g.fillStyle = '#ff7a1a';
      g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x - r * 0.9, y - r * 1.6, x + fl * r * 2, y - r * (3 + fl * 2)); g.quadraticCurveTo(x + r * 0.9, y - r * 1.4, x + r, y); g.fill();
      g.fillStyle = '#ffd34d';
      g.beginPath(); g.moveTo(x - r * 0.5, y); g.quadraticCurveTo(x - r * 0.4, y - r, x + fl * r, y - r * 1.9); g.quadraticCurveTo(x + r * 0.4, y - r * 0.8, x + r * 0.5, y); g.fill();
    }

    /* ---------- the runner (seen from behind) ---------- */
    function runnerScreenY() { return CY + 0.2 * F; }
    function drawRunner(x, y, s) {
      var Rr = TH.runner;
      var ph = p.phase;
      var air = p.air && !p.falling && state !== 'menu';
      var sliding = p.slide > 0 && !p.air;
      var downed = (state === 'dying' || state === 'over') && deathCause !== 'fall';
      g.save();
      g.translate(x, y);
      g.rotate(p.lean + (downed ? 0.9 * Math.min(1, deathT * 3) : 0));
      g.scale(s, s);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      if (pw.shd > 0 && state === 'play') {
        var pa = 0.25 + Math.sin(time * 8) * 0.08;
        g.fillStyle = 'rgba(120,210,255,' + pa * 0.5 + ')';
        g.strokeStyle = 'rgba(180,235,255,' + (pa + 0.3) + ')';
        g.lineWidth = 0.06;
        g.beginPath(); g.ellipse(0, -0.88, 0.85, 1.08, 0, 0, TAU); g.fill(); g.stroke();
      }
      if (sliding) {
        // low crouch: legs splayed forward, torso leaning back
        g.strokeStyle = Rr.pants; g.lineWidth = 0.17;
        g.beginPath(); g.moveTo(-0.12, -0.32); g.lineTo(-0.36, -0.08); g.moveTo(0.12, -0.32); g.lineTo(0.36, -0.08); g.stroke();
        g.fillStyle = Rr.shoe;
        g.beginPath(); g.ellipse(-0.38, -0.05, 0.1, 0.06, 0, 0, TAU); g.ellipse(0.38, -0.05, 0.1, 0.06, 0, 0, TAU); g.fill();
        g.strokeStyle = Rr.skin; g.lineWidth = 0.11;
        g.beginPath(); g.moveTo(-0.22, -0.62); g.lineTo(-0.45, -0.25); g.moveTo(0.22, -0.62); g.lineTo(0.45, -0.25); g.stroke();
        g.fillStyle = Rr.shirt; roundRect(-0.25, -0.78, 0.5, 0.48, 0.1); g.fill();
        g.fillStyle = Rr.pack; roundRect(-0.18, -0.74, 0.36, 0.3, 0.06); g.fill();
        g.fillStyle = Rr.hair; g.beginPath(); g.arc(0, -0.9, 0.15, 0, TAU); g.fill();
        g.fillStyle = Rr.scarf; g.fillRect(-0.15, -0.94, 0.3, 0.06);
        g.restore();
        return;
      }
      var lift0, lift1, bob;
      if (state === 'menu' || state === 'over') { lift0 = lift1 = 0; bob = Math.sin(ph * 2) * 0.012; }
      else if (air) { lift0 = 0.75; lift1 = 0.55; bob = 0; }
      else if (downed) { lift0 = 0.2; lift1 = 0.6; bob = 0; }
      else { lift0 = Math.max(0, Math.sin(ph)); lift1 = Math.max(0, Math.sin(ph + PI)); bob = Math.abs(Math.sin(ph)) * 0.05; }
      var hipY = -0.95 + bob;
      // legs
      legDraw(-1, lift0, hipY, Rr);
      legDraw(1, lift1, hipY, Rr);
      // arms (behind torso edges)
      var sw = state === 'play' && !air ? Math.sin(ph) : 0;
      var armUp = air ? 1 : 0;
      g.strokeStyle = Rr.shirt2; g.lineWidth = 0.12;
      g.beginPath();
      g.moveTo(-0.24, -1.43 + bob); g.lineTo(-0.36, -1.12 + bob - armUp * 0.45 + sw * 0.16);
      g.moveTo(0.24, -1.43 + bob); g.lineTo(0.36, -1.12 + bob - armUp * 0.45 - sw * 0.16);
      g.stroke();
      g.fillStyle = Rr.skin;
      g.beginPath();
      g.arc(-0.37, -1.08 + bob - armUp * 0.47 + sw * 0.18, 0.06, 0, TAU);
      g.arc(0.37, -1.08 + bob - armUp * 0.47 - sw * 0.18, 0.06, 0, TAU);
      g.fill();
      // torso
      g.fillStyle = Rr.shirt; roundRect(-0.24, -1.52 + bob, 0.48, 0.62, 0.12); g.fill();
      g.fillStyle = Rr.shirt2; roundRect(0.08, -1.5 + bob, 0.15, 0.58, 0.08); g.fill();
      g.fillStyle = Rr.pants; g.fillRect(-0.23, -1.0 + bob, 0.46, 0.09);
      // backpack
      g.fillStyle = Rr.pack2; roundRect(-0.19, -1.44 + bob, 0.38, 0.42, 0.08); g.fill();
      g.fillStyle = Rr.pack; roundRect(-0.17, -1.46 + bob, 0.34, 0.38, 0.08); g.fill();
      g.fillStyle = Rr.pack2; g.fillRect(-0.17, -1.33 + bob, 0.34, 0.04);
      g.fillStyle = TH.gold; g.fillRect(-0.03, -1.31 + bob, 0.06, 0.05);
      // head (back view) + scarf/headband
      g.fillStyle = Rr.skin; g.fillRect(-0.06, -1.6 + bob, 0.12, 0.1);
      g.beginPath(); g.arc(-0.155, -1.69 + bob, 0.04, 0, TAU); g.arc(0.155, -1.69 + bob, 0.04, 0, TAU); g.fill();
      g.fillStyle = Rr.hair; g.beginPath(); g.arc(0, -1.72 + bob, 0.155, 0, TAU); g.fill();
      g.fillStyle = Rr.scarf; g.fillRect(-0.16, -1.79 + bob, 0.32, 0.06);
      // fluttering ribbon tails
      var wv = Math.sin(time * 14) * 0.05, wv2 = Math.sin(time * 14 + 1.4) * 0.06;
      g.strokeStyle = Rr.scarf; g.lineWidth = 0.05;
      g.beginPath();
      g.moveTo(0.1, -1.76 + bob);
      g.quadraticCurveTo(0.25, -1.7 + bob + wv, 0.36, -1.62 + bob + wv2);
      g.moveTo(0.1, -1.76 + bob);
      g.quadraticCurveTo(0.22, -1.62 + bob - wv, 0.3, -1.52 + bob + wv);
      g.stroke();
      g.restore();
    }
    function legDraw(side, lift, hipY, Rr) {
      var hx = side * 0.11;
      var fy = -lift * 0.42, kneeY = hipY + 0.47 - lift * 0.3;
      g.strokeStyle = Rr.pants; g.lineWidth = 0.16;
      g.beginPath(); g.moveTo(hx, hipY); g.lineTo(hx + side * 0.03, kneeY); g.lineTo(hx + side * 0.01, fy - 0.05); g.stroke();
      g.fillStyle = Rr.shoe;
      g.beginPath(); g.ellipse(hx + side * 0.01, fy - 0.02, 0.085, 0.06 + lift * 0.03, 0, 0, TAU); g.fill();
      if (lift > 0.3) { g.fillStyle = '#d8d0c0'; g.beginPath(); g.ellipse(hx + side * 0.01, fy, 0.06, 0.03, 0, 0, TAU); g.fill(); }
    }
    function roundRect(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    /* ---------- the pursuer ---------- */
    function drawChaser(x, y, s) {
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      var ph = time * 9;
      var i;
      if (VAR === 'oz') {
        // the twister seen from just behind: a dark rotating storm mass with
        // spiral bands, flying debris and the odd lightning flicker
        g.fillStyle = 'rgba(70,72,92,0.92)';
        g.beginPath(); g.ellipse(0, -0.55, 1.05, 0.62, 0, 0, TAU); g.fill();
        g.lineCap = 'round';
        for (i = 0; i < 6; i++) {
          var a0 = time * 5 + i * (TAU / 6);
          g.strokeStyle = i % 2 ? 'rgba(150,154,176,0.9)' : 'rgba(112,116,140,0.95)';
          g.lineWidth = 0.16;
          g.beginPath(); g.ellipse(0, -0.6 + Math.sin(a0) * 0.05, 0.95 - (i % 3) * 0.18, 0.55 - (i % 3) * 0.1, 0, a0, a0 + 2.2); g.stroke();
        }
        g.fillStyle = 'rgba(40,42,58,0.95)';
        g.beginPath(); g.ellipse(Math.sin(time * 3) * 0.08, -0.62, 0.32, 0.2, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(235,238,250,0.6)'; g.lineWidth = 0.035;
        for (i = 0; i < 4; i++) {
          var a1 = -time * 7 + i * 1.6;
          g.beginPath(); g.ellipse(0, -0.6, 1.2, 0.7, 0, a1, a1 + 1.0); g.stroke();
        }
        for (i = 0; i < 8; i++) {
          var da = time * 6 + i * 0.8, dr = 0.6 + (i % 3) * 0.3;
          g.save(); g.translate(Math.cos(da) * dr, -0.6 + Math.sin(da) * dr * 0.55); g.rotate(da * 2);
          g.fillStyle = i % 3 ? '#7a5a3a' : '#4f8f3f';
          g.fillRect(-0.09, -0.03, 0.18, 0.06);
          g.restore();
        }
        if (Math.sin(time * 3.1) > 0.93) {
          g.strokeStyle = 'rgba(255,255,220,0.9)'; g.lineWidth = 0.04;
          g.beginPath(); g.moveTo(-0.3, -1.1); g.lineTo(-0.1, -0.8); g.lineTo(-0.25, -0.7); g.lineTo(0.05, -0.35); g.stroke();
        }
      } else if (VAR === 'classic') {
        // the night swarm: bats
        for (i = 0; i < 11; i++) {
          var ba = time * 2.2 + i * 2.1, br = 0.25 + (i % 4) * 0.22;
          var bx = Math.cos(ba) * br * 1.7, by = -0.7 + Math.sin(ba * 1.3) * br * 0.5 - (i % 3) * 0.17;
          var fl = Math.sin(time * 22 + i * 1.7);
          var bs = 0.32 + (i % 3) * 0.06;
          g.fillStyle = '#2a2145';
          g.beginPath();
          g.moveTo(bx, by);
          g.quadraticCurveTo(bx - bs * 0.6, by - bs * (0.5 + fl * 0.5), bx - bs * 1.2, by - bs * 0.1 * fl);
          g.quadraticCurveTo(bx - bs * 0.6, by + bs * 0.1, bx, by + bs * 0.18);
          g.quadraticCurveTo(bx + bs * 0.6, by + bs * 0.1, bx + bs * 1.2, by - bs * 0.1 * fl);
          g.quadraticCurveTo(bx + bs * 0.6, by - bs * (0.5 + fl * 0.5), bx, by);
          g.fill();
          g.beginPath(); g.arc(bx, by + 0.02, bs * 0.2, 0, TAU); g.fill();
          g.fillStyle = 'rgba(150,130,220,0.55)';
          g.beginPath(); g.arc(bx - bs * 0.05, by - bs * 0.04, bs * 0.09, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,60,90,0.35)';
          g.beginPath(); g.arc(bx, by + 0.01, bs * 0.22, 0, TAU); g.fill();
          g.fillStyle = '#ff3355';
          g.fillRect(bx - bs * 0.13, by - bs * 0.03, bs * 0.09, bs * 0.09);
          g.fillRect(bx + bs * 0.04, by - bs * 0.03, bs * 0.09, bs * 0.09);
        }
      } else {
        // the stone warden: hulking golem seen from behind. Kept under ~1.6 units
        // so it rises from the bottom edge without covering the runner; the
        // swinging fists sit to the sides.
        var st = TH.stone, sw = Math.sin(ph * 0.55);
        var glow = 'rgba(255,170,60,' + (0.75 + Math.sin(time * 6) * 0.2) + ')';
        for (var side = -1; side <= 1; side += 2) {
          var lift = side * sw; // -1..1
          var sx = side * 0.95, sy = -1.15;
          var fx = side * (1.25 + 0.1 * lift), fy = -0.75 - lift * 0.6;
          g.strokeStyle = st[2]; g.lineWidth = 0.38; g.lineCap = 'round';
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(fx, fy); g.stroke();
          g.fillStyle = st[3];
          g.beginPath(); g.arc(fx, fy, 0.3, 0, TAU); g.fill();
          g.fillStyle = st[0];
          g.beginPath(); g.arc(fx - side * 0.05, fy - 0.06, 0.2, 0, TAU); g.fill();
        }
        // torso
        g.fillStyle = st[0];
        g.beginPath(); g.moveTo(-0.78, -0.3); g.lineTo(-0.95, -1.12); g.lineTo(-0.55, -1.38); g.lineTo(0.55, -1.38); g.lineTo(0.95, -1.12); g.lineTo(0.78, -0.3); g.closePath(); g.fill();
        g.fillStyle = st[2];
        g.beginPath(); g.moveTo(0.3, -1.38); g.lineTo(0.55, -1.38); g.lineTo(0.95, -1.12); g.lineTo(0.78, -0.3); g.lineTo(0.4, -0.3); g.closePath(); g.fill();
        // mossy shoulder boulders
        g.fillStyle = st[1];
        g.beginPath(); g.arc(-0.78, -1.18, 0.26, 0, TAU); g.arc(0.78, -1.18, 0.26, 0, TAU); g.fill();
        g.fillStyle = TH.accent;
        g.beginPath(); g.ellipse(-0.8, -1.38, 0.2, 0.08, 0, 0, TAU); g.ellipse(0.74, -1.37, 0.18, 0.07, 0, 0, TAU); g.fill();
        // head dome
        g.fillStyle = st[2];
        g.beginPath(); g.ellipse(0, -1.38, 0.28, 0.13, 0, PI, TAU); g.fill();
        // glowing rune circle on the back
        g.strokeStyle = glow; g.lineWidth = 0.06;
        g.beginPath(); g.arc(0, -0.85, 0.27, 0, TAU); g.stroke();
        g.beginPath(); g.moveTo(0, -1.12); g.lineTo(0, -0.58); g.moveTo(-0.27, -0.85); g.lineTo(0.27, -0.85); g.stroke();
        g.beginPath(); g.moveTo(-0.55, -1.0); g.lineTo(-0.42, -0.7); g.lineTo(-0.6, -0.45); g.stroke();
      }
      g.restore();
    }

    /* ---------- particles (screen space) ---------- */
    var PMAX = 150, parts = [];
    for (var pi = 0; pi < PMAX; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, sz: 3, col: '#fff', gr: 0 });
    function emit(x, y, vx, vy, life, sz, col, gr) {
      for (var i = 0; i < PMAX; i++) {
        var q = parts[i];
        if (q.on) continue;
        q.on = true; q.x = x; q.y = y; q.vx = vx; q.vy = vy; q.life = q.max = life; q.sz = sz; q.col = col; q.gr = gr;
        return;
      }
    }
    function emitBurst(x, y, n, col, spd, life) {
      var u = UI / 600;
      for (var i = 0; i < n; i++) {
        var a = R() * TAU, v = (0.3 + R() * 0.7) * spd * u;
        emit(x, y, Math.cos(a) * v, Math.sin(a) * v - spd * 0.3 * u, life * (0.6 + R() * 0.4), (3 + R() * 4) * u * 1.4, col, 900 * u);
      }
    }
    function emitDust(n) {
      var y = runnerScreenY() + UI * 0.02, u = UI / 600;
      for (var i = 0; i < n; i++) emit(CX + (R() - 0.5) * UI * 0.1, y, (R() - 0.5) * 120 * u, -R() * 60 * u, 0.4 + R() * 0.3, (4 + R() * 5) * u, VAR === 'classic' ? 'rgba(150,150,190,0.6)' : 'rgba(230,215,180,0.7)', 50 * u);
    }
    function sparkle(c) {
      SG = segs[0];
      if (!proj(c.s, c.l, c.y)) return;
      var u = UI / 600, col = TH.gem ? '#9dffcf' : '#ffe58a';
      for (var i = 0; i < 5; i++) {
        var a = R() * TAU;
        emit(PX, PY, Math.cos(a) * 140 * u, Math.sin(a) * 140 * u - 60 * u, 0.35, 3 * u + 1, col, 200 * u);
      }
    }
    function stepParticles(dt) {
      for (var i = 0; i < PMAX; i++) {
        var q = parts[i];
        if (!q.on) continue;
        q.life -= dt;
        if (q.life <= 0) { q.on = false; continue; }
        q.vy += q.gr * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
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

    /* ---------- overlays drawn on canvas ---------- */
    function drawOverlayFx() {
      g.fillStyle = vignGrad;
      g.fillRect(0, 0, VW, VH);
      if ((state === 'play' || state === 'paused') && stumbleT > 0) {
        g.globalAlpha = clamp(stumbleT / 2, 0, 1) * (0.55 + Math.sin(time * 8) * 0.25);
        g.fillStyle = dangerGrad;
        g.fillRect(0, 0, VW, VH);
        g.globalAlpha = 1;
      }
      if (state === 'dying' && deathCause === 'fall') {
        g.fillStyle = 'rgba(0,0,0,' + clamp(deathT - 0.3, 0, 0.6) + ')';
        g.fillRect(0, 0, VW, VH);
      }
      if (flash > 0) {
        g.fillStyle = 'rgba(' + flashCol + ',' + flash * 0.6 + ')';
        g.fillRect(0, 0, VW, VH);
      }
    }

    // Tutorial prompts during the first few runs
    function drawPrompt() {
      var seg = segs[0], label = '', dir = '', i;
      var look = speed * 1.0;
      if (seg.len - p.s < look * 1.1 && seg.len - p.s > -1 && !p.turnBuf) {
        dir = seg.turn === 2 ? 'lr' : seg.turn > 0 ? 'right' : 'left';
        label = seg.turn === 2 ? 'TURN LEFT OR RIGHT' : seg.turn > 0 ? 'TURN RIGHT' : 'TURN LEFT';
      } else {
        for (i = 0; i < seg.obs.length; i++) {
          var o = seg.obs[i];
          var d = o.s0 - p.s;
          if (o.hit || d < 0 || d > look) continue;
          if (o.k === 'gap' || o.k === 'log') { if (p.air) break; dir = 'up'; label = 'JUMP'; }
          else if (o.k === 'arch') { if (p.slide > 0) break; dir = 'down'; label = 'SLIDE'; }
          else if (o.lanes & laneMask(p.lane)) { dir = 'lr'; label = o.k === 'rubble' ? 'DODGE OR JUMP' : 'CHANGE LANE'; }
          break;
        }
      }
      if (!dir) return;
      var touch = lastInput === 'touch';
      var keyTxt = { up: touch ? 'Swipe up' : '↑ / W / Space', down: touch ? 'Swipe down' : '↓ / S', left: touch ? 'Swipe left' : '← / A', right: touch ? 'Swipe right' : '→ / D', lr: touch ? 'Swipe left / right' : '← → / A D' }[dir];
      var fs = clamp(UI * 0.055, 15, 34);
      var cx = CX, cy = Math.max(fs * 1.7, HZ - fs * 0.2);
      var pulse = 1 + Math.sin(time * 9) * 0.06;
      g.save();
      g.translate(cx, cy);
      g.scale(pulse, pulse);
      g.font = '900 ' + Math.round(fs) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      var w = Math.max(g.measureText(label).width, fs * 3) + fs * 1.6;
      g.fillStyle = 'rgba(8,10,24,0.55)';
      roundRect(-w / 2, -fs * 1.55, w, fs * 2.9, fs * 0.5); g.fill();
      arrow(dir, 0, -fs * 0.6, fs * 0.55);
      g.fillStyle = '#fff';
      g.fillText(label, 0, fs * 0.35);
      g.font = '700 ' + Math.round(fs * 0.48) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillText(keyTxt, 0, fs * 1.0);
      g.restore();
    }
    function arrow(dir, x, y, r) {
      g.fillStyle = '#ffd34d';
      var dirs = dir === 'lr' ? [PI, 0] : [{ up: -HPI, down: HPI, left: PI, right: 0 }[dir]];
      for (var i = 0; i < dirs.length; i++) {
        var a = dirs[i], ox = dirs.length > 1 ? (i ? r * 0.9 : -r * 0.9) : 0;
        g.save();
        g.translate(x + ox, y);
        g.rotate(a);
        g.beginPath(); g.moveTo(r * 0.7, 0); g.lineTo(-r * 0.1, -r * 0.6); g.lineTo(-r * 0.1, -r * 0.22); g.lineTo(-r * 0.7, -r * 0.22); g.lineTo(-r * 0.7, r * 0.22); g.lineTo(-r * 0.1, r * 0.22); g.lineTo(-r * 0.1, r * 0.6); g.closePath(); g.fill();
        g.restore();
      }
    }

    /* ---------- HUD ---------- */
    var hudLastD = -1, hudLastC = -1, hudOn = false;
    function updateHud() {
      var on = state === 'play' || state === 'paused' || state === 'dying';
      if (on !== hudOn) { hudOn = on; hud.classList.toggle('on', on); }
      if (!on) return;
      var d = Math.floor(dist);
      if (d !== hudLastD) { hudLastD = d; hudScore.textContent = fmtInt(d) + ' m'; }
      if (coins !== hudLastC) { hudLastC = coins; hudCoins.textContent = fmtInt(coins); }
      for (var k in hudPw) {
        var h = hudPw[k], v = pw[k], isOn = v > 0;
        if (isOn !== h.on) { h.on = isOn; h.el.classList.toggle('on', isOn); }
        if (isOn) {
          var secs = Math.ceil(v);
          if (secs !== h.last) { h.last = secs; h.txt.textContent = secs + 's'; }
          h.bar.style.transform = 'scaleX(' + (v / pwDuration(k)).toFixed(3) + ')';
        }
      }
    }
    function toast(txt) {
      if (destroyed) return;
      var t = IGAME.ui.toast(root, txt, 1300);
      // sit at the very top so it never covers the turn/jump prompts
      if (t && t.style) { t.style.top = '10px'; t.style.fontSize = clamp(Math.round(UI / 34), 12, 17) + 'px'; }
    }

    /* ------------------------------------------------------------------ */
    /* Menus                                                              */
    /* ------------------------------------------------------------------ */
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
      overlayKind = '';
    }
    function unitName() { return TH.gem ? 'Gems' : 'Coins'; }
    function howHtml() {
      return ctx.isTouch
        ? '<p class="td-how">Swipe ← → to change lane or turn at corners · swipe ↑ to jump · swipe ↓ to slide</p>'
        : '<p class="td-how"><span class="ig-kbd">←</span> <span class="ig-kbd">→</span> lane / turn at corners · <span class="ig-kbd">↑</span> jump · <span class="ig-kbd">↓</span> slide · <span class="ig-kbd">P</span> pause</p>';
    }
    function showTitle() {
      closeOverlay();
      state = 'menu';
      overlayKind = 'title';
      overlay = IGAME.ui.overlay(root, {
        title: TH.title,
        text: 'Run, turn at the corners, and stay ahead of ' + TH.chaserName + '.',
        html:
          '<div class="td-stats"><div class="td-stat"><span>Best score</span><b>' + fmtInt(best) + '</b></div><div class="td-stat"><span>' + unitName() + '</span><b>' + fmtInt(bank) + '</b></div></div>' + howHtml(),
        buttons: [
          { label: '▶ Run', primary: true, onClick: startRun },
          { label: 'Upgrades', onClick: showShop },
        ],
        focus: false,
      });
    }
    function upRow(k, name, desc) {
      var lv = ups[k], pips = '';
      for (var i = 0; i < UP_MAX; i++) pips += '<i class="td-pip' + (i < lv ? ' on' : '') + '"></i>';
      var cost = lv < UP_MAX ? UP_COST[lv] : 0;
      var btn = lv >= UP_MAX ? '<button type="button" class="ig-btn secondary td-upbtn" disabled>Max</button>'
        : '<button type="button" class="ig-btn td-upbtn" data-up="' + k + '"' + (bank < cost ? ' disabled' : '') + '>' + fmtInt(cost) + '</button>';
      return '<div class="td-uprow">' + ICON[k] + '<div><div class="td-upname">' + name + '<small>' + desc + ' · ' + pwDuration(k) + 's</small></div><div class="td-pips">' + pips + '</div></div>' + btn + '</div>';
    }
    function showShop(from) {
      var back = from === 'over' ? 'over' : 'title';
      closeOverlay();
      overlayKind = 'shop';
      overlay = IGAME.ui.overlay(root, {
        title: 'Upgrades',
        html:
          '<p class="td-bank">' + unitName() + ': ' + fmtInt(bank) + '</p><div class="td-up">' +
          upRow('mag', 'Magnet', 'Pulls in nearby ' + unitName().toLowerCase()) +
          upRow('shd', 'Shield', 'Absorbs one crash or stumble') +
          upRow('dbl', 'Double ' + unitName(), 'Every pickup counts twice') +
          '</div>',
        buttons: [
          { label: '▶ Run', primary: true, onClick: startRun },
          { label: 'Back', onClick: function () { if (back === 'over' && lastResult) showOver(lastResult); else showTitle(); } },
        ],
        focus: false,
      });
      var btns = overlay.panel.querySelectorAll('[data-up]');
      Array.prototype.forEach.call(btns, function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var k = b.getAttribute('data-up'), lv = ups[k];
          if (lv >= UP_MAX || bank < UP_COST[lv]) { ctx.sfx('error'); return; }
          bank -= UP_COST[lv];
          ups[k] = lv + 1;
          store.set('bank', bank);
          store.set('ups', ups);
          ctx.sfx('buy');
          showShop(back);
        });
      });
    }
    var lastResult = null;
    function showOver(r) {
      closeOverlay();
      overlayKind = 'over';
      var titles = { fall: 'You fell!', crash: 'Crashed!', caught: 'Caught by ' + TH.chaserName + '!' };
      overlay = IGAME.ui.overlay(root, {
        title: titles[r.cause] || 'Run over',
        html:
          (r.isBest ? '<div class="td-new">New best score!</div>' : '') +
          '<div class="td-stats">' +
          '<div class="td-stat"><span>Distance</span><b>' + fmtInt(r.dist) + ' m</b></div>' +
          '<div class="td-stat"><span>' + unitName() + '</span><b>' + fmtInt(r.coins) + '</b></div>' +
          '<div class="td-stat"><span>Score</span><b>' + fmtInt(r.score) + '</b></div>' +
          '<div class="td-stat"><span>Best</span><b>' + fmtInt(best) + '</b></div>' +
          '</div><p class="td-how">Score = metres + 5 × ' + unitName().toLowerCase() + ' · ' + (ctx.isTouch ? 'tap Run again' : 'press <span class="ig-kbd">Space</span> to run again') + '</p>',
        buttons: [
          { label: '↻ Run again', primary: true, onClick: startRun },
          { label: 'Upgrades', onClick: function () { showShop('over'); } },
        ],
        focus: false,
      });
    }
    function showPause() {
      closeOverlay();
      overlayKind = 'pause';
      overlay = IGAME.ui.overlay(root, {
        title: 'Paused',
        text: fmtInt(dist) + ' m · ' + fmtInt(coins) + ' ' + unitName().toLowerCase(),
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: 'Quit run', onClick: function () { closeOverlay(); showTitle(); } },
        ],
        focus: false,
      });
    }

    function startRun() {
      if (state === 'play') return;
      closeOverlay();
      resetWorld();
      state = 'play';
      runT = 0; dist = 0; coins = 0; slowMul = 1; speed = TH.v0;
      stumbleT = 0; chase = CHASE_NEAR + 0.1; chaseLat = 0; introT = 2.4;
      pw.mag = pw.shd = pw.dbl = 0;
      milestone = 500;
      runs++;
      store.set('runs', runs);
      tutorial = runs <= 3 || best < 400;
      hudLastD = hudLastC = -1;
      ctx.sfx('boost');
      ctx.focus();
    }
    function pauseGame() {
      if (state !== 'play') return;
      state = 'paused';
      showPause();
    }
    function resumeGame() {
      if (state !== 'paused') return;
      closeOverlay();
      state = 'play';
      ctx.focus();
    }
    function gameOver() {
      state = 'over';
      overAt = time;
      var score = Math.floor(dist) + coins * 5;
      var isBest = score > best;
      if (isBest) { best = score; store.set('best', best); }
      if (dist > bestDist) { bestDist = Math.floor(dist); store.set('bestDist', bestDist); }
      bank += coins;
      store.set('bank', bank);
      lastResult = { cause: deathCause, dist: dist, coins: coins, score: score, isBest: isBest };
      if (isBest && score > 0) ctx.sfx('win');
      showOver(lastResult);
    }

    /* ------------------------------------------------------------------ */
    /* Input                                                              */
    /* ------------------------------------------------------------------ */
    var ptr = { id: -1, x: 0, y: 0, last: '' };
    function onDown(e) {
      if (ptr.id !== -1 && e.pointerType === 'touch') return;
      ptr.id = e.pointerId; ptr.x = e.clientX; ptr.y = e.clientY; ptr.last = '';
      lastInput = e.pointerType === 'mouse' ? 'key' : 'touch';
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
      if (e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      if (e.pointerId !== ptr.id) return;
      var dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      var thr = Math.max(14, UI * 0.045);
      if (dx * dx + dy * dy < thr * thr) return;
      var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
      ptr.x = e.clientX; ptr.y = e.clientY;
      if (dir === ptr.last) return; // one action per direction per gesture
      ptr.last = dir;
      act(dir);
    }
    function onUp(e) {
      if (e.pointerId !== ptr.id) return;
      ptr.id = -1;
      try { canvas.releasePointerCapture(e.pointerId); } catch (er) {}
    }
    function act(dir) {
      if (state !== 'play') return;
      if (dir === 'L') steer(-1);
      else if (dir === 'R') steer(1);
      else if (dir === 'U') jump();
      else slide();
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP']);
    ctx.onKey(function (code, down, e) {
      if (!down || destroyed) return;
      if (code !== 'Escape' && code !== 'KeyP') lastInput = 'key';
      if (state === 'play') {
        if (code === 'ArrowLeft' || code === 'KeyA') steer(-1);
        else if (code === 'ArrowRight' || code === 'KeyD') steer(1);
        else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') jump();
        else if (code === 'ArrowDown' || code === 'KeyS') slide();
        else if (code === 'KeyP' || code === 'Escape') pauseGame();
      } else if (state === 'paused') {
        if (code === 'KeyP' || code === 'Escape' || code === 'Space' || code === 'Enter') resumeGame();
      } else if ((state === 'menu' || state === 'over') && (code === 'Space' || code === 'Enter')) {
        if (code === 'Enter' && e && e.target && e.target.tagName === 'BUTTON') return; // native click handles it
        if (overlayKind !== 'title' && overlayKind !== 'over') return;
        if (state === 'over' && time - overAt < 0.6) return;
        startRun();
      }
    });

    /* ------------------------------------------------------------------ */
    /* Boot                                                               */
    /* ------------------------------------------------------------------ */
    resetWorld();
    var loop = IGAME.loop(function (dt) {
      update(dt);
      render();
    });
    loop.start();
    showTitle();

    if (dbg) {
      window.__td = {
        next: function () { var sg = segs[0], best2 = null; for (var i = 0; i < sg.obs.length; i++) { var o = sg.obs[i], d = o.s0 - p.s; if (d > -1 && (!best2 || d < best2.d)) best2 = { k: o.k, d: +d.toFixed(1) }; } return best2; },
        state: function () { return { state: state, dist: Math.round(dist), coins: coins, speed: +speed.toFixed(1), seg: segs[0] && segs[0].id, turn: segs[0] && segs[0].turn, toCorner: segs[0] && +(segs[0].len - p.s).toFixed(1), lane: p.lane, best: best, chase: +chase.toFixed(2), items: nItems }; },
        start: startRun,
      };
    }

    return {
      pause: function () {
        if (state === 'play') pauseGame();
        loop.stop();
      },
      resume: function () {
        if (!destroyed) loop.start();
      },
      destroy: function () {
        destroyed = true;
        loop.stop();
        closeOverlay();
        timers.forEach(clearTimeout);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        hudPause.removeEventListener('click', onPauseBtn);
        view.destroy();
        if (hud.parentNode) hud.parentNode.removeChild(hud);
        if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        if (dbg && window.__td) { try { delete window.__td; } catch (e) { window.__td = undefined; } }
      },
    };
  });
})();
