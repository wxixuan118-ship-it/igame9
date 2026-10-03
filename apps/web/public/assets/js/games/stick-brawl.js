/*!
 * Wobble Brawl — igame9 original physics stick-figure party brawler.
 * Up to four wobbly stick fighters punch, kick and shoot each other off floating
 * arenas. Weapons drop from the sky in crates; last stick standing wins the round,
 * first to N round wins takes the match. 1P vs 1–3 CPU bots, or 2 players on one keyboard.
 *
 * World units: arenas are ~26 × 15 units, a fighter is ~1.7 units tall, y grows downward.
 * Simulation runs at a fixed 60 Hz step. Each fighter is a simple box controller plus an
 * "active ragdoll": arms and legs are verlet points pulled toward animated targets, so they
 * lag, wobble and flail when hit; on a knockout the whole skeleton goes limp.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var STEP = 1 / 60;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function approach(v, t, d) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* Tuning                                                              */
  /* ------------------------------------------------------------------ */
  var GRAV = 34, RUN = 7.4, ACC_G = 62, ACC_A = 30, JUMP_V = 13.4, DJUMP_V = 11.6, MAX_FALL = 24;
  var BW = 0.56, BH = 1.7, HIP = 0.72;
  var L_TORSO = 0.56, L_NECK = 0.26, R_HEAD = 0.24, L_UA = 0.34, L_FA = 0.33, L_TH = 0.38, L_SH = 0.37;
  var LIMB = 0.15; // stroke width in world units

  var COLORS = [
    { name: 'Red', c: '#ff5a5f', d: '#b9333b' },
    { name: 'Blue', c: '#46a6ff', d: '#2264b0' },
    { name: 'Yellow', c: '#ffc53a', d: '#b8861a' },
    { name: 'Green', c: '#3bd88a', d: '#1f9157' },
  ];

  // Melee moves: timings in seconds, hit circle at (x + face*reach, y - hy) with radius r.
  var MOVES = {
    punch: { dur: 0.26, a0: 0.05, a1: 0.14, cd: 0.3, dmg: 9, kb: 7.2, lift: 3.4, reach: 0.78, hy: 1.22, r: 0.44, lunge: 1.6 },
    kick: { dur: 0.42, a0: 0.12, a1: 0.26, cd: 0.5, dmg: 13, kb: 10.5, lift: 5.2, reach: 0.84, hy: 0.86, r: 0.5, lunge: 2.6 },
    akick: { dur: 0.42, a0: 0.05, a1: 0.34, cd: 0.45, dmg: 12, kb: 10, lift: 3, reach: 0.62, hy: 0.55, r: 0.52, lunge: 0 },
    swing: { dur: 0.44, a0: 0.1, a1: 0.25, cd: 0.46, dmg: 19, kb: 15.5, lift: 6.8, reach: 1.05, hy: 1.12, r: 0.72, lunge: 1.2 },
  };

  var WEAPONS = {
    bat: { name: 'Slugger Bat', ammo: 8, cd: 0.46, melee: true },
    pistol: { name: 'Pip Pistol', ammo: 9, cd: 0.24, speed: 34, dmg: 11, kb: 6, pellets: 1, spread: 0.035, life: 0.75, recoil: 1.2, range: 13 },
    shotgun: { name: 'Scattergun', ammo: 4, cd: 0.8, speed: 27, dmg: 8, kb: 5.2, pellets: 5, spread: 0.2, life: 0.3, recoil: 7, range: 6.5, two: true },
    rocket: { name: 'Boom Tube', ammo: 3, cd: 1.0, speed: 13.5, dmg: 42, kb: 20, radius: 2.6, rocket: true, recoil: 3.5, range: 14, two: true },
    bombs: { name: 'Bouncy Bombs', ammo: 3, cd: 0.55, dmg: 36, kb: 17, radius: 2.3, bomb: true, fuse: 1.6, range: 8 },
  };
  var WEAPON_IDS = ['bat', 'pistol', 'shotgun', 'rocket', 'bombs'];
  var WEAPON_W = [3, 3, 2.2, 1.3, 1.7];

  /* ------------------------------------------------------------------ */
  /* Arenas (original). t: s = solid, o = one-way (jump through, ↓ drops), */
  /* b = breakable stone block, c = cracked block (crumbles when stood on) */
  /* mv: {ax, ay, p, ph} sine motion; conv: conveyor speed                 */
  /* ------------------------------------------------------------------ */
  function blockRow(x0, y, n, cracked) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ x: x0 + i, y: y, w: 1, h: 1, t: cracked.indexOf(i) > -1 ? 'c' : 'b' });
    return out;
  }
  var ARENAS = [
    {
      id: 'roof', name: 'Rooftop Rumble', w: 26, h: 15, theme: 'city',
      plats: [
        { x: 0.5, y: 11, w: 9.8, h: 8, t: 's' },
        { x: 15.7, y: 11, w: 9.8, h: 8, t: 's' },
        { x: 2.2, y: 8.5, w: 3.8, t: 'o' },
        { x: 20, y: 8.5, w: 3.8, t: 'o' },
        { x: 10.3, y: 6.1, w: 5.4, t: 'o' },
        { x: 11.3, y: 10.2, w: 3.4, t: 'o', mv: { ay: 1.8, p: 5 } },
      ],
      spawns: [[2.8, 11], [23.2, 11], [4.1, 8.5], [21.9, 8.5]],
    },
    {
      id: 'keep', name: 'Crumble Keep', w: 26, h: 15, theme: 'keep',
      plats: [
        { x: 0, y: 8.6, w: 3.5, h: 10, t: 's' },
        { x: 22.5, y: 8.6, w: 3.5, h: 10, t: 's' },
        { x: 6.4, y: 8.4, w: 3.4, t: 'o' },
        { x: 16.2, y: 8.4, w: 3.4, t: 'o' },
        { x: 11, y: 5.9, w: 4, t: 'o' },
      ].concat(blockRow(3.5, 11, 19, [3, 8, 10, 15])),
      spawns: [[1.7, 8.6], [24.3, 8.6], [8.1, 8.4], [17.9, 8.4]],
    },
    {
      id: 'mill', name: 'Saw Mill', w: 26, h: 15, theme: 'mill',
      plats: [
        { x: 2, y: 12, w: 7, h: 6, t: 's', conv: -2 },
        { x: 9, y: 12, w: 8, h: 6, t: 's' },
        { x: 17, y: 12, w: 7, h: 6, t: 's', conv: 2 },
        { x: 10, y: 9.4, w: 6, t: 'o' },
        { x: 3.4, y: 8.9, w: 4, t: 'o' },
        { x: 18.6, y: 8.9, w: 4, t: 'o' },
        { x: 11, y: 6.9, w: 4, t: 'o' },
      ],
      saws: [
        { x: 13, y: 4.7, r: 0.8, mv: { ax: 9, p: 8 } },
        { x: 13, y: 13.1, r: 0.85, pop: { y1: 11.5, period: 6.5, up: 1.6 } },
      ],
      spawns: [[4, 12], [22, 12], [11, 12], [15, 12]],
    },
    {
      id: 'magma', name: 'Magma Pit', w: 26, h: 15, theme: 'magma', lava: 13.2,
      plats: [
        { x: 10, y: 10.6, w: 6, h: 6, t: 's' },
        { x: 3, y: 9.6, w: 4, t: 'o', mv: { ay: 0.9, p: 4 } },
        { x: 19, y: 9.6, w: 4, t: 'o', mv: { ay: 0.9, p: 4, ph: Math.PI } },
        { x: 6.3, y: 7, w: 3.4, t: 'o' },
        { x: 16.3, y: 7, w: 3.4, t: 'o' },
        { x: 11.2, y: 8.2, w: 3.6, t: 'o' },
        { x: 11.5, y: 5.4, w: 3, t: 'o' },
      ],
      spawns: [[11.4, 10.6], [14.6, 10.6], [5, 9.4], [21, 9.4]],
    },
    {
      id: 'sky', name: 'Sky Swing', w: 26, h: 15, theme: 'sky',
      plats: [
        { x: 9.5, y: 10.4, w: 7, h: 1.4, t: 's' },
        { x: 2, y: 8.6, w: 3.6, t: 'o', mv: { ax: 1.4, p: 6 } },
        { x: 20.4, y: 8.6, w: 3.6, t: 'o', mv: { ax: 1.4, p: 6, ph: Math.PI } },
        { x: 11, y: 6.6, w: 4, t: 'o', mv: { ax: 3.4, p: 7 } },
        { x: 3.6, y: 12.6, w: 3.2, t: 'o' },
        { x: 19.2, y: 12.6, w: 3.2, t: 'o' },
      ],
      spawns: [[11, 10.4], [15, 10.4], [3.8, 8.6], [22.2, 8.6]],
    },
  ];

  var THEMES = {
    city: { sky: ['#1a1d4a', '#5b3a8c', '#f08a6b'], solid: '#2a2d4a', top: '#8f8fd0', side: '#1d1f38', one: '#c96f5a', oneTop: '#ffb08a', far: '#2b2756', near: '#1c1a3d', win: 'rgba(255,214,140,0.55)' },
    keep: { sky: ['#0f1a33', '#2f4a72', '#7aa0b8'], solid: '#5b5f78', top: '#a3a8c4', side: '#3c3f55', one: '#7a5a3a', oneTop: '#c49a62', far: '#22324f', near: '#18243b', win: 'rgba(255,200,120,0.5)' },
    mill: { sky: ['#2a1a12', '#6b3b1f', '#c9772f'], solid: '#4a4f5c', top: '#f2b531', side: '#30333d', one: '#6c7380', oneTop: '#c5ccd6', far: '#3a2416', near: '#24170f', win: 'rgba(255,170,80,0.4)' },
    magma: { sky: ['#12070c', '#3d0f17', '#8f2a19'], solid: '#3a2a2e', top: '#7a5650', side: '#251a1d', one: '#5a3f3a', oneTop: '#b07a62', far: '#2a0f12', near: '#1a090b', win: 'rgba(255,120,60,0.5)' },
    sky: { sky: ['#3f8fe0', '#7cc2f2', '#d9f1ff'], solid: '#f4f7ff', top: '#ffffff', side: '#c3d3ec', one: '#9a6b45', oneTop: '#d9a56a', far: '#ffffff', near: '#eaf4ff', win: '' },
  };

  var CSS = [
    '.sb-pause{position:absolute;z-index:6;top:10px;left:10px;width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(5,6,14,.55);color:#fff;display:none;place-items:center;cursor:pointer;padding:0;touch-action:manipulation}',
    '.sb-pause svg{width:18px;height:18px}',
    '.sb-touch{position:absolute;left:0;right:0;bottom:0;height:0;z-index:5;pointer-events:none}',
    '.sb-tb{position:absolute;pointer-events:auto;display:grid;place-items:center;border-radius:50%;background:rgba(10,12,24,.42);border:2px solid rgba(255,255,255,.34);color:#fff;font:900 13px system-ui,sans-serif;letter-spacing:.02em;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
    '.sb-tb.on{background:rgba(255,255,255,.34);transform:scale(.94)}',
    '.sb-tb svg{width:44%;height:44%}',
    '.sb-tb.hit{background:rgba(255,90,95,.32);border-color:rgba(255,170,170,.75)}',
    '.sb-tb.kick{background:rgba(255,197,58,.28);border-color:rgba(255,226,150,.75)}',
    '.sb-tb.jump{background:rgba(70,166,255,.3);border-color:rgba(160,210,255,.75)}',
    '.sb-panel{width:min(520px,100%)!important;padding:18px!important}',
    '.sb-sec{margin:0 0 10px;text-align:left}',
    '.sb-lab{font:800 11px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#8f95c0);margin:0 0 5px}',
    '.sb-row{display:flex;gap:6px;flex-wrap:wrap}',
    '.sb-chip{flex:1 1 0;min-width:0;font:800 13px system-ui,sans-serif;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:8px 6px;cursor:pointer;white-space:nowrap}',
    '.sb-chip small{display:block;font-weight:600;font-size:11px;opacity:.7;margin-top:1px}',
    '.sb-chip.sel{border-color:var(--accent-2,#2dd4f0);background:rgba(45,212,240,.16);box-shadow:inset 0 0 0 1px var(--accent-2,#2dd4f0)}',
    '.sb-keys{font-size:12px;color:var(--muted,#8f95c0);margin:2px 0 12px;line-height:1.6}',
    '.sb-keys kbd{font:700 11px ui-monospace,monospace;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff}',
    '.sb-stat{font-size:13px;color:var(--text-2,#c4c8ea);margin:-4px 0 12px}',
    '.sb-table{width:100%;border-collapse:collapse;font-size:14px;margin:4px 0 14px}',
    '.sb-table th{font:800 11px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#8f95c0);text-align:center;padding:4px 6px}',
    '.sb-table th:first-child,.sb-table td:first-child{text-align:left}',
    '.sb-table td{padding:6px;border-top:1px solid rgba(255,255,255,.08);color:#fff;text-align:center;white-space:nowrap}',
    '.sb-table tr.win td{background:rgba(255,215,90,.1)}',
    '.sb-dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:7px;vertical-align:-1px;box-shadow:0 0 0 2px rgba(0,0,0,.35)}',
    '@media (max-width:520px),(max-height:500px){.sb-chip small{display:none}.sb-keys{display:none}.sb-sec{margin-bottom:7px}.sb-chip{padding:7px 4px;font-size:12.5px}.sb-panel{padding:14px!important}}',
  ].join('\n');
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var ICON_L = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 4 6.5 12l9 8z"/></svg>';
  var ICON_R = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 4l9 8-9 8z"/></svg>';
  var ICON_D = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 8.5l8 9 8-9z"/></svg>';

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('stick-brawl', function (ctx) {
    var root = ctx.root, ui = IGAME.ui;
    var TITLE = ctx.title || 'Wobble Brawl';
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var saved = ctx.store.get('save', null) || {};
    saved.mode = saved.mode === 2 ? 2 : 1;
    saved.bots1 = clamp(saved.bots1 || 3, 1, 3);
    saved.bots2 = clamp(saved.bots2 == null ? 0 : saved.bots2, 0, 2);
    saved.diff = clamp(saved.diff == null ? 1 : saved.diff, 0, 2);
    saved.first = saved.first === 5 ? 5 : 3;
    saved.wins = saved.wins || 0; // 1P match wins vs CPU
    saved.losses = saved.losses || 0;
    saved.kos = saved.kos || 0; // knockouts scored by human players
    saved.streak = saved.streak || 0;
    saved.bestStreak = saved.bestStreak || 0;
    function persist() { ctx.store.set('save', saved); }

    var W = 0, H = 0;
    var view = IGAME.createCanvas(root, {
      onResize: function (w, h) { W = w; H = h; layoutTouch(); },
    });
    var g = view.ctx, canvas = view.canvas;

    /* ---------------- state ---------------- */
    var state = 'fight'; // intro | fight | roundEnd | over | paused  (attract = bots-only match behind the menu)
    var pausedFrom = '';
    var attract = true;
    var A = null; // arena definition
    var TH = THEMES.city;
    var plats = [], saws = [];
    var fighters = [];
    var items = [], shots = [];
    var arenaOrder = [], arenaIdx = 0;
    var round = 0, roundT = 0, introT = 0, endT = 0, crateT = 0;
    var floodY = 99, lavaY = 99;
    var hitstop = 0, timeScale = 1, slowT = 0, shake = 0, time = 0, acc = 0;
    var banner = null; // {text, sub, color, t, max}
    var cam = { x: 13, y: 8, z: 30 };
    var overlay = null, menuKeys = null;
    var roundWinner = null;
    var match = null;

    /* ---------------- particles & popups (pooled) ---------------- */
    var MAXP = 240, P = [];
    for (var pi = 0; pi < MAXP; pi++) P.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 0, c: '', k: 0, a: 0, va: 0 });
    var pHead = 0;
    function part(k, x, y, vx, vy, life, s, c) {
      var p = P[pHead];
      pHead = (pHead + 1) % MAXP;
      p.on = true; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.s = s; p.c = c;
      p.a = Math.random() * TAU; p.va = rand(-10, 10);
      return p;
    }
    var POPS = [];
    for (var qi = 0; qi < 14; qi++) POPS.push({ on: false, x: 0, y: 0, t: 0, text: '', c: '' });
    var popHead = 0;
    function popup(x, y, text, c) {
      var p = POPS[popHead];
      popHead = (popHead + 1) % POPS.length;
      p.on = true; p.x = x; p.y = y; p.t = 0; p.text = text; p.c = c;
    }
    function sparks(x, y, n, c, spd) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * TAU, s = rand(0.4, 1) * (spd || 9);
        part(0, x, y, Math.cos(a) * s, Math.sin(a) * s - 2, rand(0.18, 0.4), rand(0.05, 0.09), c);
      }
    }
    function puff(x, y, n, c, spd) {
      for (var i = 0; i < n; i++) part(1, x + rand(-0.2, 0.2), y + rand(-0.1, 0.1), rand(-1, 1) * (spd || 1.5), rand(-1.2, -0.2) * (spd || 1.5), rand(0.35, 0.7), rand(0.14, 0.3), c);
    }

    /* ---------------- sound ---------------- */
    function sfx(n) { if (!attract) ctx.sfx(n); }
    function tone(o) { if (!attract) IGAME.sfx.tone(o); }
    function noise(o) { if (!attract) IGAME.sfx.noise(o); }
    function sndPunch(big) {
      noise({ d: big ? 0.14 : 0.08, f: big ? 900 : 1400, v: big ? 0.28 : 0.2 });
      tone({ f: big ? 150 : 210, f2: 60, d: big ? 0.16 : 0.09, type: 'square', v: big ? 0.12 : 0.08 });
    }
    function sndWhoosh() { noise({ d: 0.07, f: 2600, v: 0.06 }); }
    function sndJump(d) { tone({ f: d ? 420 : 300, f2: d ? 820 : 560, d: 0.1, type: 'triangle', v: 0.06 }); }

    /* ---------------- DOM: pause button + touch controls ---------------- */
    var pauseBtn = ui.el('button', 'sb-pause', ICON_PAUSE);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    root.appendChild(pauseBtn);
    function onPauseClick(e) { e.stopPropagation(); pauseGame(); }
    function stopProp(e) { e.stopPropagation(); }
    pauseBtn.addEventListener('click', onPauseClick);
    pauseBtn.addEventListener('pointerdown', stopProp);

    var touchOn = !!ctx.isTouch;
    var touch = { left: false, right: false, down: false, jump: false };
    var touchWrap = ui.el('div', 'sb-touch');
    touchWrap.style.display = 'none';
    root.appendChild(touchWrap);
    var TB = {};
    function makeTB(key, cls, html, label) {
      var b = ui.el('div', 'sb-tb ' + cls, html);
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', label);
      function on(e) {
        e.preventDefault();
        e.stopPropagation();
        b.classList.add('on');
        try { b.setPointerCapture(e.pointerId); } catch (er) {}
        if (key === 'jump') { touch.jump = true; humanBuf(1, 'jump'); }
        else if (key === 'hit') humanBuf(1, 'atk');
        else if (key === 'kick') humanBuf(1, 'kick');
        else touch[key] = true;
      }
      function off() {
        b.classList.remove('on');
        if (key === 'left' || key === 'right' || key === 'down' || key === 'jump') touch[key] = false;
      }
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('lostpointercapture', off);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      touchWrap.appendChild(b);
      TB[key] = b;
    }
    makeTB('left', '', ICON_L, 'Move left');
    makeTB('right', '', ICON_R, 'Move right');
    makeTB('down', '', ICON_D, 'Drop down');
    makeTB('jump', 'jump', 'JUMP', 'Jump');
    makeTB('hit', 'hit', 'HIT', 'Punch or use weapon');
    makeTB('kick', 'kick', 'KICK', 'Kick');
    var touchH = 0;
    function layoutTouch() {
      if (!TB || !TB.jump || !W) return;
      var m = Math.min(W, H);
      var s = Math.round(clamp(m * 0.16, 50, 82)), pad = Math.round(clamp(m * 0.03, 10, 20)), gap = Math.round(s * 0.18);
      function pos(b, cx, bottom, size) {
        b.style.width = b.style.height = size + 'px';
        b.style.left = Math.round(cx - size / 2) + 'px';
        b.style.bottom = Math.round(bottom) + 'px';
      }
      var sm = Math.round(s * 0.74), big = Math.round(s * 1.1);
      var lc = pad + s / 2, rc = pad + s * 1.5 + gap;
      pos(TB.left, lc, pad, s);
      pos(TB.right, rc, pad, s);
      pos(TB.down, (lc + rc) / 2, pad + s + gap * 0.6, sm);
      var jc = W - pad - big / 2, hc = jc - big / 2 - gap - s / 2;
      pos(TB.jump, jc, pad, big);
      pos(TB.hit, hc, pad, s);
      pos(TB.kick, (jc + hc) / 2 - gap * 0.4, pad + big + gap * 0.5, s);
      touchH = touchVisible() ? pad + Math.max(s + gap * 0.6 + sm, big + gap * 0.5 + s) : 0;
    }
    function touchVisible() { return touchOn && !attract && match && match.mode === 1 && (state === 'fight' || state === 'intro' || state === 'roundEnd'); }
    function syncTouch() {
      var v = touchVisible();
      touchWrap.style.display = v ? '' : 'none';
      if (!v) { touch.left = touch.right = touch.down = touch.jump = false; }
      pauseBtn.style.display = !attract && (state === 'fight' || state === 'intro' || state === 'roundEnd') ? 'grid' : 'none';
      layoutTouch();
    }

    /* ------------------------------------------------------------------ */
    /* Fighters                                                            */
    /* ------------------------------------------------------------------ */
    function makeFighter(idx, human, name) {
      var f = {
        idx: idx, human: human, name: name, col: COLORS[idx].c, dark: COLORS[idx].d, cname: COLORS[idx].name,
        x: 0, y: 0, vx: 0, vy: 0, face: 1, onGround: false, plat: null, airJumps: 1, coyote: 0,
        hp: 100, alive: true, out: false, deadT: 0, cause: '', stun: 0, inv: 0, flash: 0,
        atk: null, cd: 0, weapon: null, emptyT: 0, recoilT: 0, punchHand: 0, dropT: 0, dropPlat: null, sawCd: 0,
        lean: 0, leanV: 0, squash: 0, run: 0, wins: 0, kos: 0, falls: 0, lastHit: null, lastHitT: 0,
        input: { left: false, right: false, up: false, down: false },
        buf: { jump: 0, atk: 0, kick: 0 },
        pts: [], ai: human ? null : { think: 0, target: null, item: null, kick: false, jitter: 0, up: false, stuck: 0, lastX: 0 },
      };
      for (var i = 0; i < 11; i++) f.pts.push({ x: 0, y: 0, px: 0, py: 0 });
      return f;
    }
    // Skeleton: 0 pelvis, 1 neck, 2 head, 3 back elbow, 4 back hand, 5 front elbow, 6 front hand,
    //           7 back knee, 8 back foot, 9 front knee, 10 front foot
    var BONES = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [0, 7], [7, 8], [0, 9], [9, 10]];
    var BONE_LEN = [L_TORSO, L_NECK, L_UA, L_FA, L_UA, L_FA, L_TH, L_SH, L_TH, L_SH];

    function placeFighter(f, x, y) {
      f.x = x; f.y = y; f.vx = 0; f.vy = 0; f.onGround = false; f.plat = null;
      f.hp = 100; f.alive = true; f.out = false; f.deadT = 0; f.cause = ''; f.stun = 0; f.inv = 1.2; f.flash = 0;
      f.atk = null; f.cd = 0; f.weapon = null; f.emptyT = 0; f.lean = 0; f.leanV = 0; f.airJumps = 1; f.lastHit = null;
      f.face = x < A.w / 2 ? 1 : -1;
      f.buf.jump = f.buf.atk = f.buf.kick = 0;
      for (var i = 0; i < 11; i++) {
        var p = f.pts[i];
        p.x = p.px = x;
        p.y = p.py = y - 0.9;
      }
      poseRigid(f);
      var tg = limbTargets(f);
      for (var j = 3; j < 11; j++) { f.pts[j].x = f.pts[j].px = tg[j * 2]; f.pts[j].y = f.pts[j].py = tg[j * 2 + 1]; }
      if (f.ai) { f.ai.think = rand(0.2, 0.6); f.ai.target = null; f.ai.item = null; }
    }

    /* ---------------- input ---------------- */
    var K = ctx.keys;
    function humanBuf(h, what) {
      for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        if (f.human === h) f.buf[what] = 0.14;
      }
    }
    function readHuman(f) {
      var inp = f.input;
      if (match.mode === 1) {
        inp.left = !!(K.KeyA || K.ArrowLeft) || touch.left;
        inp.right = !!(K.KeyD || K.ArrowRight) || touch.right;
        inp.up = !!(K.KeyW || K.ArrowUp || K.Space) || touch.jump;
        inp.down = !!(K.KeyS || K.ArrowDown) || touch.down;
      } else if (f.human === 1) {
        inp.left = !!K.KeyA; inp.right = !!K.KeyD; inp.up = !!K.KeyW; inp.down = !!K.KeyS;
      } else {
        inp.left = !!K.ArrowLeft; inp.right = !!K.ArrowRight; inp.up = !!K.ArrowUp; inp.down = !!K.ArrowDown;
      }
    }

    /* ---------------- arena setup ---------------- */
    function loadArena(def) {
      A = def;
      TH = THEMES[def.theme];
      plats = def.plats.map(function (p) {
        return {
          x: p.x, y: p.y, w: p.w, h: p.h || 0.45, t: p.t, x0: p.x, y0: p.y, px: p.x, py: p.y, dx: 0, dy: 0,
          mv: p.mv || null, conv: p.conv || 0, hp: p.t === 'b' || p.t === 'c' ? 60 : 0, alive: true, crumble: 0, shakeT: 0,
        };
      });
      saws = (def.saws || []).map(function (s) {
        return { x: s.x, y: s.y, x0: s.x, y0: s.y, r: s.r, mv: s.mv || null, pop: s.pop || null, rot: 0, warn: 0 };
      });
      lavaY = def.lava || 99;
      floodY = A.h + 6;
      items.length = 0;
      shots.length = 0;
      buildBackground();
    }
    function platAt(t) {
      for (var i = 0; i < plats.length; i++) {
        var p = plats[i];
        p.px = p.x; p.py = p.y;
        if (p.mv) {
          var ph = (t / p.mv.p) * TAU + (p.mv.ph || 0);
          p.x = p.x0 + Math.sin(ph) * (p.mv.ax || 0);
          p.y = p.y0 + Math.sin(ph) * (p.mv.ay || 0);
        }
        p.dx = p.x - p.px; p.dy = p.y - p.py;
        if (p.shakeT > 0) p.shakeT -= STEP;
      }
      for (var j = 0; j < saws.length; j++) {
        var s = saws[j];
        s.rot += STEP * 14;
        if (s.mv) s.x = s.x0 + Math.sin((t / s.mv.p) * TAU) * s.mv.ax;
        if (s.pop) {
          // hides in a floor slot, then pops up for a moment; warns (sparks) first
          var c = t % s.pop.period, up = s.pop.up, w0 = s.pop.period - up - 0.9;
          var k = 0;
          if (c > w0 + 0.9) k = Math.sin(((c - w0 - 0.9) / up) * Math.PI);
          s.warn = c > w0 && c < w0 + 0.9 ? 1 : 0;
          s.y = s.y0 + (s.pop.y1 - s.y0) * clamp(k * 1.4, 0, 1);
        }
      }
    }

    function startRound() {
      round++;
      var def = ARENAS[arenaOrder[arenaIdx % arenaOrder.length]];
      arenaIdx++;
      loadArena(def);
      roundT = 0;
      crateT = rand(1.2, 2.2);
      platAt(0);
      var sp = A.spawns.slice();
      // shuffle spawn points so nobody always starts in the same corner
      for (var i = sp.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = sp[i]; sp[i] = sp[j]; sp[j] = tmp; }
      fighters.forEach(function (f, n) { placeFighter(f, sp[n][0], sp[n][1] - 0.4); });
      roundWinner = null;
      timeScale = 1; slowT = 0;
      if (attract) { state = 'fight'; introT = 0; }
      else {
        state = 'intro';
        introT = 0;
        setBanner(def.name, 'Round ' + round + ' — get ready', '#fff', 1.1);
      }
      cam.x = A.w / 2; cam.y = A.h / 2;
      syncTouch();
    }

    function newMatch(isAttract) {
      attract = !!isAttract;
      fighters = [];
      var mode = isAttract ? 0 : saved.mode;
      if (mode === 0) {
        for (var a = 0; a < 4; a++) fighters.push(makeFighter(a, 0, COLORS[a].name));
      } else if (mode === 1) {
        fighters.push(makeFighter(0, 1, 'You'));
        for (var b = 0; b < saved.bots1; b++) fighters.push(makeFighter(b + 1, 0, 'CPU ' + (b + 1)));
      } else {
        fighters.push(makeFighter(0, 1, 'P1'));
        fighters.push(makeFighter(1, 2, 'P2'));
        for (var c = 0; c < saved.bots2; c++) fighters.push(makeFighter(c + 2, 0, 'CPU ' + (c + 1)));
      }
      var diff = isAttract ? 1 : saved.diff;
      fighters.forEach(function (f) { if (f.ai) f.ai.diff = diff; });
      match = { mode: mode, first: saved.first, over: false };
      arenaOrder = [0, 1, 2, 3, 4];
      for (var i = arenaOrder.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = arenaOrder[i]; arenaOrder[i] = arenaOrder[j]; arenaOrder[j] = tmp; }
      if (ctx.debug && ctx.params.get('arena')) {
        // ?debug=1&arena=mill pins one arena for testing
        for (var q = 0; q < ARENAS.length; q++) if (ARENAS[q].id === ctx.params.get('arena')) arenaOrder = [q];
      }
      arenaIdx = 0;
      round = 0;
      startRound();
    }

    /* ------------------------------------------------------------------ */
    /* Simulation                                                          */
    /* ------------------------------------------------------------------ */
    function step() {
      roundT += STEP;
      platAt(roundT);
      if (state === 'intro') {
        introT += STEP;
        if (introT >= 1.2) {
          state = 'fight';
          setBanner('FIGHT!', '', '#ffd23f', 0.7);
          sfx('boost');
        }
      }
      var fighting = state === 'fight' || state === 'roundEnd';
      // sudden death: a flood of goo rises after 45 s so rounds can't stall
      if (state === 'fight' && roundT > 45) {
        if (floodY > A.h + 5) { setBanner('SUDDEN DEATH', 'The goo is rising!', '#c084fc', 1.6); sfx('levelup'); floodY = A.h + 4.5; }
        floodY -= STEP * 0.32;
      }
      for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        if (f.alive && fighting) {
          if (f.human) readHuman(f);
          else aiThink(f);
        } else {
          f.input.left = f.input.right = f.input.up = f.input.down = false;
        }
        updateFighter(f, fighting);
      }
      updateItems();
      updateShots();
      if (state === 'fight') {
        crateT -= STEP;
        if (crateT <= 0) { spawnCrate(); crateT = rand(3.5, 6.5) * (fighters.length > 2 ? 0.85 : 1); }
        checkRoundEnd();
      }
      if (state === 'roundEnd') {
        endT += STEP;
        if (endT > (attract ? 1.6 : 2.4)) finishRound();
      }
    }

    function deadly() { return Math.min(lavaY, floodY); }

    function updateFighter(f, fighting) {
      var i;
      if (!f.alive) { if (!f.out) updateRagdoll(f); return; }
      var inp = f.input, b = f.buf;
      b.jump -= STEP; b.atk -= STEP; b.kick -= STEP;
      if (f.stun > 0) f.stun -= STEP;
      if (f.inv > 0) f.inv -= STEP;
      if (f.flash > 0) f.flash -= STEP;
      if (f.cd > 0) f.cd -= STEP;
      if (f.dropT > 0) f.dropT -= STEP;
      if (f.sawCd > 0) f.sawCd -= STEP;
      if (f.recoilT > 0) f.recoilT -= STEP;
      if (f.coyote > 0) f.coyote -= STEP;
      var can = fighting && f.stun <= 0;

      // horizontal movement
      var dir = can ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
      var conv = f.onGround && f.plat ? f.plat.conv : 0;
      var slow = f.atk && f.onGround ? 0.4 : 1;
      if (f.stun > 0) {
        f.vx = approach(f.vx, conv, (f.onGround ? 16 : 1.5) * STEP);
      } else if (dir !== 0) {
        f.vx = approach(f.vx, dir * RUN * slow + conv, (f.onGround ? ACC_G : ACC_A) * STEP);
        if (!f.atk) f.face = dir;
      } else if (f.onGround) {
        f.vx = approach(f.vx, conv, ACC_G * STEP);
      } else {
        f.vx = approach(f.vx, 0, 4 * STEP);
      }

      // jumping (buffered), double jump, variable height, drop-through, fast fall
      if (can && b.jump > 0) {
        if (f.onGround || f.coyote > 0) {
          f.vy = -JUMP_V; f.onGround = false; f.plat = null; f.coyote = 0; b.jump = 0;
          f.squash = -0.12;
          puff(f.x, f.y, 3, 'rgba(255,255,255,0.5)', 1);
          sndJump(false);
        } else if (f.airJumps > 0) {
          f.airJumps--; f.vy = -DJUMP_V; b.jump = 0;
          f.leanV += f.face * 5;
          for (var r = 0; r < 6; r++) part(3, f.x, f.y - 0.1, 0, 0, 0.3, 0.6, 'rgba(255,255,255,0.6)');
          sndJump(true);
        }
      }
      if (!inp.up && f.vy < -4 && f.stun <= 0) f.vy += GRAV * 0.9 * STEP; // short hop when released early
      if (can && inp.down) {
        if (f.onGround && f.plat && f.plat.t === 'o') {
          f.dropT = 0.22; f.dropPlat = f.plat; f.onGround = false; f.plat = null; f.y += 0.06; f.vy = 1;
        } else if (!f.onGround && f.vy > -2) f.vy += GRAV * 0.7 * STEP;
      }

      // attacks
      if (f.atk) runAttack(f);
      if (f.emptyT > 0) { f.emptyT -= STEP; if (f.emptyT <= 0) tossWeapon(f, true); }
      if (can && !f.atk && f.cd <= 0) {
        if (b.atk > 0) { b.atk = 0; if (f.weapon && f.emptyT <= 0) useWeapon(f); else startAttack(f, f.onGround ? 'punch' : 'akick'); }
        else if (b.kick > 0) { b.kick = 0; startAttack(f, f.onGround ? 'kick' : 'akick'); }
      }

      // gravity + integrate + collide
      f.vy = Math.min(MAX_FALL, f.vy + GRAV * STEP);
      if (f.onGround && f.plat && f.plat.alive) { f.x += f.plat.dx; f.y += f.plat.dy; }
      var wasGround = f.onGround, vyBefore = f.vy;
      moveBody(f, BW, BH, true);
      if (wasGround && !f.onGround && f.vy >= 0) f.coyote = 0.08;
      if (f.onGround) {
        f.airJumps = 1;
        if (!wasGround) {
          f.squash = clamp(vyBefore * 0.012, 0, 0.22);
          if (vyBefore > 9) puff(f.x, f.y, 4, 'rgba(255,255,255,0.45)', 1.6);
          if (f.stun > 0 && vyBefore > 10) { f.vy = -vyBefore * 0.3; f.onGround = false; f.leanV += sgn(f.vx) * 8; }
        }
        // cracked blocks crumble under feet
        if (f.plat && f.plat.t === 'c') { f.plat.crumble += STEP; f.plat.shakeT = 0.1; if (f.plat.crumble > 0.55) breakBlock(f.plat); }
      }
      f.squash *= 0.86;

      // body lean spring (wobble): leans into runs, hits add angular velocity
      var targetLean = clamp(f.vx * 0.035, -0.3, 0.3) + (f.atk ? f.face * 0.18 : 0);
      if (!f.onGround) targetLean = clamp(f.vx * 0.025, -0.25, 0.25);
      var kLean = f.stun > 0 ? 30 : 140, dLean = f.stun > 0 ? 3 : 14;
      f.leanV += ((targetLean - f.lean) * kLean - f.leanV * dLean) * STEP;
      f.lean = clamp(f.lean + f.leanV * STEP, -1.3, 1.3);
      if (f.onGround) f.run += Math.abs(f.vx) * STEP * 1.45;

      // hazards
      var dy = deadly();
      if (f.y > dy + 0.15) { kill(f, dy === floodY ? 'goo' : 'lava'); return; }
      if (f.y > A.h + 4.5) { kill(f, 'fall'); return; }
      if (f.x < -7 || f.x > A.w + 7 || f.y < -12) { kill(f, 'out'); return; }
      for (i = 0; i < saws.length; i++) {
        var s = saws[i];
        if (f.sawCd > 0) break;
        var cx = clamp(s.x, f.x - BW / 2, f.x + BW / 2), cy = clamp(s.y, f.y - BH, f.y);
        var ddx = s.x - cx, ddy = s.y - cy;
        if (ddx * ddx + ddy * ddy < s.r * s.r * 0.85) {
          var away = f.x < s.x ? -1 : 1;
          f.sawCd = 0.6;
          sparks(cx, cy, 12, '#ffe08a', 10);
          hurt(f, null, 22, away * 12, -9, 'saw');
          if (!attract) sfx('hit');
        }
      }
      poseRigid(f);
      updateLimbs(f);
    }

    /* Box vs platform collision. Bodies are anchored at bottom-centre (x, y). */
    function moveBody(b, w, h, isFighter) {
      var hw = w / 2, i, p;
      b.x += b.vx * STEP;
      for (i = 0; i < plats.length; i++) {
        p = plats[i];
        if (!p.alive || p.t === 'o') continue;
        if (b.x + hw > p.x && b.x - hw < p.x + p.w && b.y > p.y + 0.14 && b.y - h < p.y + p.h - 0.02) {
          if (b.x < p.x + p.w / 2) b.x = p.x - hw; else b.x = p.x + p.w + hw;
          if (isFighter && b.stun > 0 && Math.abs(b.vx) > 6) { b.vx = -b.vx * 0.45; b.leanV -= sgn(b.vx) * 6; }
          else b.vx = 0;
        }
      }
      var prevY = b.y;
      b.y += b.vy * STEP;
      b.onGround = false;
      b.plat = null;
      for (i = 0; i < plats.length; i++) {
        p = plats[i];
        if (!p.alive) continue;
        if (b.x + hw <= p.x || b.x - hw >= p.x + p.w) continue;
        var top = Math.min(p.y, p.py);
        if (p.t === 'o') {
          if (b.vy >= 0 && prevY <= Math.max(p.y, p.py) + 0.06 && b.y >= p.y && !(b.dropT > 0 && b.dropPlat === p)) {
            b.y = p.y; b.vy = 0; b.onGround = true; b.plat = p;
          }
        } else if (b.y > p.y && b.y - h < p.y + p.h) {
          if (prevY <= Math.max(p.y, p.py) + 0.08) {
            b.y = p.y; b.vy = 0; b.onGround = true; b.plat = p;
          } else if (b.vy < 0 && prevY - h >= p.y + p.h - 0.2) {
            b.y = p.y + p.h + h; b.vy = 0;
          } else if (top < b.y) {
            // embedded sideways (e.g. pushed by a platform): pop out the shorter way
            if (b.x < p.x + p.w / 2) b.x = p.x - hw; else b.x = p.x + p.w + hw;
          }
        }
      }
    }

    function startAttack(f, kind) {
      var m = MOVES[kind];
      f.atk = { kind: kind, m: m, t: 0, hit: [] };
      f.cd = m.cd;
      if (kind === 'punch') f.punchHand ^= 1;
      if (f.onGround) f.vx += f.face * m.lunge;
      if (kind === 'akick') { f.vx = f.face * 9; f.vy = Math.max(f.vy, 3.5); }
      sndWhoosh();
    }

    function runAttack(f) {
      var a = f.atk, m = a.m;
      a.t += STEP;
      if (a.t >= a.m.a0 && a.t <= a.m.a1) {
        var hx = f.x + f.face * m.reach, hy = f.y - m.hy;
        for (var i = 0; i < fighters.length; i++) {
          var o = fighters[i];
          if (o === f || !o.alive || a.hit.indexOf(o) > -1) continue;
          if (circleBox(hx, hy, m.r, o.x - BW / 2 - 0.05, o.y - BH, BW + 0.1, BH)) {
            a.hit.push(o);
            var big = a.kind !== 'punch';
            hurt(o, f, m.dmg, f.face * m.kb, -m.lift, a.kind);
            sparks(hx, hy, big ? 10 : 6, big ? '#ffe27a' : '#ffffff', big ? 11 : 8);
            part(3, hx, hy, 0, 0, 0.18, big ? 1 : 0.7, 'rgba(255,255,255,0.9)');
            if (a.kind === 'swing') popup(hx, hy - 0.6, 'BONK!', '#ffd23f');
            else if (big && Math.random() < 0.5) popup(hx, hy - 0.5, Math.random() < 0.5 ? 'POW!' : 'WHAM!', '#fff');
            sndPunch(big);
          }
        }
        // bats and kicks chip breakable blocks
        if (a.kind === 'swing' || a.kind === 'kick') {
          for (var j = 0; j < plats.length; j++) {
            var p = plats[j];
            if (!p.alive || p.hp <= 0 || a.hit.indexOf(p) > -1) continue;
            if (circleBox(hx, hy, m.r * 0.8, p.x, p.y, p.w, p.h)) { a.hit.push(p); damageBlock(p, a.kind === 'swing' ? 35 : 20); }
          }
        }
      }
      if (a.t >= m.dur) {
        f.atk = null;
        if (a.kind === 'swing' && f.weapon) {
          f.weapon.ammo--;
          if (f.weapon.ammo <= 0) tossWeapon(f, true);
        }
      }
    }

    function circleBox(cx, cy, r, x, y, w, h) {
      var nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h);
      var dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy < r * r;
    }

    // Damage + knockback. Knockback grows as health drops, so beaten-up sticks fly further.
    function hurt(o, by, dmg, kx, ky, kind) {
      if (!o.alive || o.inv > 0) return;
      var mult = 1 + (1 - Math.max(0, o.hp) / 100) * 0.9;
      o.hp -= dmg;
      o.vx = kx * mult + o.vx * 0.15;
      o.vy = Math.min(o.vy, 0) * 0.3 + ky * mult;
      if (ky < 0) { o.onGround = false; o.plat = null; }
      o.stun = 0.16 + Math.sqrt(kx * kx + ky * ky) * 0.017 * mult;
      o.leanV += sgn(kx || 1) * (8 + Math.abs(kx) * 0.9);
      o.flash = 0.12;
      o.atk = null;
      // fling the limbs so the ragdoll flails
      for (var i = 3; i < 11; i++) {
        var p = o.pts[i];
        p.px -= kx * STEP * rand(0.6, 1.6);
        p.py -= (ky - rand(2, 6)) * STEP * rand(0.6, 1.4);
      }
      if (by) { o.lastHit = by; o.lastHitT = roundT; }
      if (o.weapon && Math.abs(kx) * mult > 12) tossWeapon(o, false);
      var heavy = dmg >= 15;
      hitstop = Math.max(hitstop, clamp(dmg * 0.0045, 0.03, heavy ? 0.11 : 0.06));
      shake = Math.max(shake, clamp(dmg * 0.025, 0.12, 0.6));
      if (o.hp <= 0) kill(o, 'ko');
      else if (o.human && heavy) tone({ f: 120, f2: 70, d: 0.12, type: 'sine', v: 0.15 });
    }

    function kill(f, cause) {
      if (!f.alive) return;
      f.alive = false;
      f.cause = cause;
      f.deadT = 0;
      f.atk = null;
      f.falls++;
      var by = f.lastHit && roundT - f.lastHitT < 6 ? f.lastHit : null;
      dbg.deaths++;
      if (!by) dbg.self++;
      dbg.causes[cause] = (dbg.causes[cause] || 0) + 1;
      if (by && by !== f) {
        by.kos++;
        if (by.human && !attract) saved.kos++;
      }
      if (f.weapon) tossWeapon(f, false);
      var label = cause === 'ko' ? 'K.O.!' : cause === 'lava' ? 'MELTED!' : cause === 'goo' ? 'GOOED!' : 'OUT!';
      if (cause === 'fall' || cause === 'out') {
        f.out = true;
        // flare at the edge where they left the arena
        var ex = clamp(f.x, 0.5, A.w - 0.5);
        for (var i = 0; i < 18; i++) part(0, ex, A.h + 1, rand(-3, 3), rand(-16, -8), rand(0.4, 0.8), rand(0.07, 0.12), f.col);
        popup(ex, Math.min(A.h - 1, cam.y + 4), label, f.col);
      } else {
        // go limp: every point becomes a free verlet particle carrying the body velocity
        for (var j = 0; j < 11; j++) {
          var p = f.pts[j];
          p.px = p.x - f.vx * STEP * rand(0.8, 1.2);
          p.py = p.y - (f.vy - (j === 2 ? 3 : 0)) * STEP * rand(0.8, 1.2);
        }
        popup(f.x, f.y - 2.2, label, f.col);
        if (cause === 'lava' || cause === 'goo') puff(f.x, f.y, 8, cause === 'lava' ? 'rgba(255,140,60,0.6)' : 'rgba(192,132,252,0.6)', 2);
      }
      shake = Math.max(shake, 0.5);
      hitstop = Math.max(hitstop, 0.09);
      if (!attract) {
        if (f.human) sfx('lose'); else sfx('explode');
      }
      // slow motion on the deciding knockout
      var alive = 0;
      for (var k = 0; k < fighters.length; k++) if (fighters[k].alive) alive++;
      if (alive <= 1 && state === 'fight') { slowT = 1.1; }
    }

    function checkRoundEnd() {
      var alive = [];
      for (var i = 0; i < fighters.length; i++) if (fighters[i].alive) alive.push(fighters[i]);
      if (alive.length > 1) return;
      state = 'roundEnd';
      endT = 0;
      roundWinner = alive[0] || null;
      if (roundWinner) {
        roundWinner.wins++;
        if (!attract) {
          var nm = roundWinner.human ? (match.mode === 1 ? 'You win' : roundWinner.name + ' wins') : roundWinner.cname + ' wins';
          setBanner(nm + ' the round!', winsLine(), roundWinner.col, 2.2);
          sfx(roundWinner.human ? 'levelup' : 'error');
        }
      } else if (!attract) {
        setBanner('Draw!', 'Nobody scores', '#fff', 2.2);
        sfx('error');
      }
    }
    function winsLine() {
      return fighters.map(function (f) { return f.wins; }).join(' – ');
    }

    function finishRound() {
      var champ = null;
      for (var i = 0; i < fighters.length; i++) if (fighters[i].wins >= match.first) champ = fighters[i];
      if (attract) {
        if (champ) fighters.forEach(function (f) { f.wins = 0; });
        startRound();
        return;
      }
      if (champ) endMatch(champ);
      else startRound();
    }

    /* ---------------- limbs: active ragdoll ---------------- */
    // Pelvis, neck and head are placed rigidly from the controller + lean angle.
    function poseRigid(f) {
      var p0 = f.pts[0], p1 = f.pts[1], p2 = f.pts[2];
      var hip = HIP * (1 - f.squash) - (f.atk && f.atk.kind === 'akick' ? 0.08 : 0);
      var sl = Math.sin(f.lean), cl = Math.cos(f.lean);
      var bob = f.onGround && Math.abs(f.vx) > 0.6 ? Math.abs(Math.sin(f.run * Math.PI)) * 0.05 : Math.sin(time * 3 + f.idx) * 0.012;
      p0.px = p0.x; p0.py = p0.y; p1.px = p1.x; p1.py = p1.y; p2.px = p2.x; p2.py = p2.y;
      p0.x = f.x; p0.y = f.y - hip - bob;
      p1.x = p0.x + sl * L_TORSO; p1.y = p0.y - cl * L_TORSO;
      p2.x = p1.x + sl * (L_NECK + 0.04); p2.y = p1.y - cl * L_NECK;
    }

    var TG = new Float32Array(22);
    // Animated target positions for elbows/hands/knees/feet (indices 3..10), in world space.
    function limbTargets(f) {
      var F = f.face, nx = f.pts[1].x, ny = f.pts[1].y + 0.05, px = f.pts[0].x, py = f.pts[0].y;
      var hbx, hby, hfx, hfy, fbx, fby, ffx, ffy; // local offsets (forward = +x, down = +y)
      var air = !f.onGround, spd = Math.abs(f.vx), ph = f.run * Math.PI;
      if (f.stun > 0) {
        var fl = time * 22 + f.idx;
        hbx = -0.35 + Math.sin(fl) * 0.25; hby = -0.35 + Math.cos(fl * 1.3) * 0.25;
        hfx = 0.35 + Math.cos(fl) * 0.25; hfy = -0.4 + Math.sin(fl * 1.1) * 0.25;
        fbx = -0.35; fby = 0.55; ffx = 0.3; ffy = 0.6;
      } else if (air) {
        var fa = time * 9;
        hbx = -0.45; hby = -0.25 + Math.sin(fa) * 0.12;
        hfx = 0.45; hfy = -0.3 + Math.cos(fa) * 0.12;
        fbx = -0.22; fby = 0.5; ffx = 0.24; ffy = 0.58;
        if (f.vy < -3) { fby = 0.45; ffy = 0.5; }
      } else if (spd > 0.6) {
        // per-leg phase: x = sin(φ) moves back while the foot is planted (cos φ < 0), forward while lifted
        var sw = Math.sin(ph), dirS = f.vx * F < 0 ? -1 : 1;
        hbx = -sw * 0.32 * dirS; hby = 0.5 - Math.abs(sw) * 0.08;
        hfx = sw * 0.34 * dirS; hfy = 0.48 - Math.abs(sw) * 0.08;
        fbx = sw * 0.34 * dirS; fby = 0.72 - Math.max(0, Math.cos(ph)) * 0.24;
        ffx = -sw * 0.34 * dirS; ffy = 0.72 - Math.max(0, -Math.cos(ph)) * 0.24;
      } else {
        var br = Math.sin(time * 2.4 + f.idx) * 0.03;
        hbx = -0.12; hby = 0.58 + br;
        hfx = 0.16; hfy = 0.56 + br;
        fbx = -0.17; fby = 0.72; ffx = 0.19; ffy = 0.72;
      }
      // weapon hold: front hand aims forward, two-handed weapons bring the back hand in
      if (f.weapon && f.stun <= 0) {
        var wd = WEAPONS[f.weapon.id];
        var rk = f.recoilT > 0 ? f.recoilT * 1.6 : 0;
        if (wd.melee) {
          hfx = 0.22; hfy = 0.1; hbx = 0.12; hby = 0.18;
        } else if (wd.bomb) {
          hfx = 0.3; hfy = 0.12;
        } else {
          hfx = 0.62 - rk; hfy = 0.04 - rk * 0.6;
          if (wd.two) { hbx = 0.36 - rk; hby = 0.1 - rk * 0.4; }
        }
      }
      // melee attack poses
      if (f.atk) {
        var a = f.atk, m = a.m, u = clamp(a.t / m.a1, 0, 1);
        var ext = a.t < m.a0 ? (a.t / m.a0) * -0.3 : a.t <= m.a1 ? 1 : 1 - (a.t - m.a1) / (m.dur - m.a1);
        if (a.kind === 'punch') {
          var ex = 0.18 + Math.max(0, ext) * 0.5, ey = 0.08;
          if (f.punchHand) { hfx = ex; hfy = ey; hbx = 0.08; hby = 0.15; }
          else { hbx = ex; hby = ey; hfx = 0.1; hfy = 0.12; }
        } else if (a.kind === 'kick') {
          ffx = 0.2 + Math.max(0, ext) * 0.5; ffy = 0.72 - Math.max(0, ext) * 0.62;
          hbx = -0.35; hby = 0.1; hfx = 0.2; hfy = 0.15;
        } else if (a.kind === 'akick') {
          ffx = 0.62; ffy = 0.42; fbx = -0.12; fby = 0.35;
          hbx = -0.4; hby = -0.2; hfx = -0.1; hfy = -0.35;
        } else if (a.kind === 'swing') {
          // bat arc: from behind the head down through the front
          var ang = -2.4 + u * 3.3;
          hfx = Math.cos(ang) * 0.55; hfy = Math.sin(ang) * 0.55 + 0.1;
          hbx = hfx * 0.7; hby = hfy * 0.7 + 0.05;
        }
      }
      // write world positions: elbows/knees are mid-points pushed outwards so joints bend naturally
      setT(5, nx + F * hfx, ny + hfy, nx, ny, -F * 0.1, 0.06, 6);
      setT(3, nx + F * hbx, ny + hby, nx, ny, -F * 0.1, 0.06, 4);
      setT(9, px + F * ffx, py + ffy, px, py, F * 0.16, 0, 10);
      setT(7, px + F * fbx, py + fby, px, py, F * 0.16, 0, 8);
      return TG;
    }
    function setT(ji, ex, ey, rx, ry, bx, by, ei) {
      TG[ei * 2] = ex; TG[ei * 2 + 1] = ey;
      TG[ji * 2] = (rx + ex) / 2 + bx; TG[ji * 2 + 1] = (ry + ey) / 2 + by;
    }

    function updateLimbs(f) {
      var tg = limbTargets(f), pts = f.pts;
      var stunned = f.stun > 0;
      for (var i = 3; i < 11; i++) {
        var p = pts[i];
        var leg = i >= 7;
        var k = stunned ? 0.07 : leg ? (f.onGround ? 0.5 : 0.3) : 0.32;
        var vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86 + (stunned ? 0.006 : 0);
        p.px = p.x; p.py = p.y;
        p.x += vx + (tg[i * 2] - p.x) * k;
        p.y += vy + (tg[i * 2 + 1] - p.y) * k;
      }
      for (var it = 0; it < 3; it++) {
        pin(pts[1], pts[3], L_UA); link(pts[3], pts[4], L_FA);
        pin(pts[1], pts[5], L_UA); link(pts[5], pts[6], L_FA);
        pin(pts[0], pts[7], L_TH); link(pts[7], pts[8], L_SH);
        pin(pts[0], pts[9], L_TH); link(pts[9], pts[10], L_SH);
      }
    }
    // keep b at distance len from fixed a
    function pin(a, b, len) {
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      var k = len / d;
      b.x = a.x + dx * k; b.y = a.y + dy * k;
    }
    function link(a, b, len) {
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      var diff = (d - len) / d * 0.5;
      a.x += dx * diff; a.y += dy * diff;
      b.x -= dx * diff; b.y -= dy * diff;
    }

    // Full ragdoll after a knockout: verlet points + bones + platform tops.
    function updateRagdoll(f) {
      f.deadT += STEP;
      if (f.deadT > 6) return;
      var pts = f.pts, i, sink = f.cause === 'lava' || f.cause === 'goo';
      for (i = 0; i < 11; i++) {
        var p = pts[i];
        var damp = sink ? 0.7 : 0.995;
        var vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx;
        p.y += vy + (sink ? 0.0015 : GRAV * STEP * STEP);
      }
      for (var it = 0; it < 4; it++) {
        for (var b = 0; b < BONES.length; b++) link(pts[BONES[b][0]], pts[BONES[b][1]], BONE_LEN[b]);
        // stiffen spine-head so the body doesn't fold through itself
        link(pts[0], pts[2], L_TORSO + L_NECK - 0.02);
        if (!sink) for (i = 0; i < 11; i++) collidePoint(pts[i]);
      }
    }
    function collidePoint(p) {
      for (var i = 0; i < plats.length; i++) {
        var q = plats[i];
        if (!q.alive || p.x < q.x || p.x > q.x + q.w) continue;
        if (q.t === 'o') {
          if (p.y >= q.y && p.py <= q.py + 0.02) { p.y = q.y; p.x -= (p.x - p.px) * 0.3; }
        } else if (p.y > q.y && p.y < q.y + q.h) {
          if (p.py <= q.py + 0.05) { p.y = q.y; p.x -= (p.x - p.px) * 0.35; }
          else if (p.px < q.x) p.x = q.x;
          else if (p.px > q.x + q.w) p.x = q.x + q.w;
        }
      }
    }

    /* ------------------------------------------------------------------ */
    /* Weapons, crates, projectiles                                        */
    /* ------------------------------------------------------------------ */
    function pickWeapon() {
      var tot = 0, i;
      for (i = 0; i < WEAPON_W.length; i++) tot += WEAPON_W[i];
      var r = Math.random() * tot;
      for (i = 0; i < WEAPON_W.length; i++) { r -= WEAPON_W[i]; if (r <= 0) return WEAPON_IDS[i]; }
      return 'pistol';
    }
    function spawnCrate() {
      var lying = 0;
      for (var i = 0; i < items.length; i++) if (items[i].k !== 'thrown') lying++;
      if (lying >= 3) return;
      var cand = plats.filter(function (p) { return p.alive && p.w >= 2.5; });
      if (!cand.length) return;
      var p = cand[Math.floor(Math.random() * cand.length)];
      items.push({ k: 'crate', wid: pickWeapon(), ammo: 0, x: p.x0 + rand(0.6, p.w - 0.6), y: -1.5, vx: 0, vy: 2, w: 0.72, h: 0.66, onGround: false, plat: null, rot: 0, life: 25, owner: null, chute: true });
    }
    function useWeapon(f) {
      var wd = WEAPONS[f.weapon.id];
      if (wd.melee) { startAttack(f, 'swing'); f.cd = wd.cd; return; }
      f.cd = wd.cd;
      var mx = f.x + f.face * 0.85, my = f.y - 1.22;
      if (wd.bomb) {
        items.push({ k: 'bomb', wid: 'bombs', x: f.x + f.face * 0.4, y: f.y - 1.3, vx: f.face * 8.5 + f.vx * 0.4, vy: -6.5, w: 0.36, h: 0.36, onGround: false, plat: null, rot: 0, life: wd.fuse, owner: f, bounce: 0.55 });
        sfx('jump');
      } else if (wd.rocket) {
        shots.push({ k: 'rocket', x: mx, y: my, vx: f.face * wd.speed, vy: 0, life: 3, owner: f, dmg: wd.dmg, kb: wd.kb, r: wd.radius });
        sfx('boost');
        puff(f.x - f.face * 0.5, my, 4, 'rgba(220,220,220,0.6)', 1.5);
      } else {
        for (var i = 0; i < wd.pellets; i++) {
          var ang = rand(-wd.spread, wd.spread);
          shots.push({ k: 'bullet', x: mx, y: my, vx: Math.cos(ang) * wd.speed * f.face, vy: Math.sin(ang) * wd.speed, life: wd.life, owner: f, dmg: wd.dmg, kb: wd.kb });
        }
        part(4, mx + f.face * 0.15, my, 0, 0, 0.06, wd.pellets > 1 ? 0.55 : 0.38, '#fff3b0');
        part(2, f.x, my, -f.face * rand(1, 3), -rand(3, 5), 0.6, 0.07, '#e8c25a');
        if (wd.pellets > 1) { noise({ d: 0.16, f: 1800, v: 0.32 }); tone({ f: 140, f2: 50, d: 0.12, type: 'square', v: 0.1 }); }
        else sfx('shoot');
      }
      f.vx -= f.face * wd.recoil;
      f.recoilT = 0.1;
      shake = Math.max(shake, wd.pellets > 1 || wd.rocket ? 0.22 : 0.08);
      f.weapon.ammo--;
      if (f.weapon.ammo <= 0) f.emptyT = 0.3;
    }
    // Empty (or dropped) weapons get thrown and can bonk whoever they hit.
    function tossWeapon(f, thrown) {
      if (!f.weapon) return;
      var w = f.weapon;
      f.weapon = null;
      f.emptyT = 0;
      if (thrown && w.id === 'bombs') return;
      if (thrown) {
        items.push({ k: 'thrown', wid: w.id, x: f.x + f.face * 0.5, y: f.y - 1.2, vx: f.face * 12 + f.vx * 0.3, vy: -3, w: 0.5, h: 0.3, onGround: false, plat: null, rot: 0, spin: f.face * 16, life: 2.2, owner: f });
        sndWhoosh();
      } else if (w.ammo > 0) {
        items.push({ k: 'pickup', wid: w.id, ammo: w.ammo, x: f.x, y: f.y - 1.2, vx: rand(-3, 3), vy: -6, w: 0.6, h: 0.3, onGround: false, plat: null, rot: 0, spin: rand(-12, 12), life: 14, owner: null });
      }
    }

    function updateItems() {
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.life -= STEP;
        if (it.k === 'crate' && it.chute && it.vy > 2.4) it.vy = 2.4; // parachute
        it.vy = Math.min(MAX_FALL, it.vy + GRAV * STEP * (it.k === 'crate' && it.chute ? 0.3 : 1));
        if (it.onGround && it.plat && it.plat.alive) { it.x += it.plat.dx + it.plat.conv * STEP; it.y += it.plat.dy; }
        var vyB = it.vy, vxB = it.vx;
        moveBody(it, it.w, it.h, false);
        if (it.k === 'crate' && it.onGround) it.chute = false;
        if (it.onGround) {
          if (it.bounce && vyB > 3) { it.vy = -vyB * it.bounce; it.onGround = false; sfx('tick'); }
          it.vx *= it.k === 'bomb' ? 0.96 : 0.8;
          it.spin = (it.spin || 0) * 0.8;
        } else if (it.bounce && vxB !== 0 && it.vx === 0) it.vx = -vxB * 0.5;
        it.rot += (it.spin || 0) * STEP;
        var gone = it.y > A.h + 6 || it.y > deadly() + 0.3 || it.x < -8 || it.x > A.w + 8;
        if (it.k === 'bomb') {
          if (it.life <= 0) { explode(it.x, it.y - 0.2, WEAPONS.bombs.radius, WEAPONS.bombs.dmg, WEAPONS.bombs.kb, it.owner); items.splice(i, 1); continue; }
        } else if (it.life <= 0) gone = true;
        if (gone) {
          if (it.y > deadly() - 0.5 && it.y < A.h + 6) puff(it.x, deadly(), 3, 'rgba(255,160,80,0.5)', 1);
          items.splice(i, 1);
          continue;
        }
        // thrown weapons bonk; crates / pickups are grabbed by unarmed fighters
        for (var j = 0; j < fighters.length; j++) {
          var f = fighters[j];
          if (!f.alive) continue;
          if (Math.abs(f.x - it.x) > BW / 2 + it.w / 2 || it.y - it.h > f.y || it.y < f.y - BH) continue;
          if (it.k === 'thrown') {
            if (f !== it.owner && Math.abs(it.vx) > 4) {
              hurt(f, it.owner, 7, sgn(it.vx) * 7, -4, 'throw');
              sparks(it.x, it.y, 6, '#fff', 7);
              popup(it.x, it.y - 0.5, 'CLONK!', '#fff');
              sndPunch(false);
              it.vx = -it.vx * 0.3; it.vy = -4; it.k = 'junk';
            }
          } else if ((it.k === 'crate' || it.k === 'pickup') && !f.weapon && f.stun <= 0) {
            var wd = WEAPONS[it.wid];
            f.weapon = { id: it.wid, ammo: it.k === 'pickup' ? it.ammo : wd.ammo };
            if (it.k === 'crate') {
              for (var c = 0; c < 8; c++) part(2, it.x, it.y - 0.3, rand(-4, 4), rand(-6, -2), rand(0.4, 0.8), rand(0.08, 0.14), '#b8793d');
            }
            sfx('coin');
            if (f.human && !attract) ui.toast(root, (match.mode === 2 ? f.name + ': ' : '') + wd.name + '!', 1000);
            items.splice(i, 1);
            break;
          }
        }
      }
    }

    function updateShots() {
      for (var i = shots.length - 1; i >= 0; i--) {
        var s = shots[i];
        s.life -= STEP;
        var ox = s.x, oy = s.y;
        s.x += s.vx * STEP;
        s.y += s.vy * STEP;
        if (s.k === 'rocket') {
          s.vx *= 1.012;
          if (Math.random() < 0.7) part(1, ox, oy, rand(-0.4, 0.4), rand(-0.4, 0.4), 0.45, rand(0.1, 0.18), 'rgba(200,200,210,0.55)');
        }
        var hit = false;
        for (var j = 0; j < fighters.length && !hit; j++) {
          var f = fighters[j];
          if (!f.alive || f === s.owner) continue;
          if (segBox(ox, oy, s.x, s.y, f.x - BW / 2 - 0.06, f.y - BH, BW + 0.12, BH)) {
            hit = true;
            if (s.k === 'rocket') explode(s.x, s.y, s.r, s.dmg, s.kb, s.owner);
            else {
              hurt(f, s.owner, s.dmg, sgn(s.vx) * s.kb, -2.6, 'shot');
              sparks(s.x, s.y, 5, '#fff3b0', 7);
              sndPunch(false);
            }
          }
        }
        if (!hit) {
          for (var k = 0; k < plats.length; k++) {
            var p = plats[k];
            if (!p.alive || p.t === 'o') continue;
            if (s.x > p.x && s.x < p.x + p.w && s.y > p.y && s.y < p.y + p.h) {
              hit = true;
              if (s.k === 'rocket') explode(s.x - sgn(s.vx) * 0.1, s.y, s.r, s.dmg, s.kb, s.owner);
              else { sparks(s.x, s.y, 4, '#ffe9a8', 5); if (p.hp > 0) damageBlock(p, 8); }
              break;
            }
          }
        }
        if (hit || s.life <= 0 || s.x < -10 || s.x > A.w + 10) {
          if (!hit && s.k === 'rocket' && s.life <= 0) explode(s.x, s.y, s.r, s.dmg, s.kb, s.owner);
          shots.splice(i, 1);
        }
      }
    }
    function segBox(x0, y0, x1, y1, bx, by, bw, bh) {
      // sample along the segment (bullets move < 0.6 units per step)
      for (var t = 0; t <= 1.0001; t += 0.25) {
        var x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        if (x > bx && x < bx + bw && y > by && y < by + bh) return true;
      }
      return false;
    }

    function explode(x, y, r, dmg, kb, owner) {
      for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        if (!f.alive) continue;
        var cx = f.x, cy = f.y - BH / 2;
        var dx = cx - x, dy = cy - y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > r + 0.4) continue;
        var k = 1 - clamp(d / (r + 0.4), 0, 1) * 0.6;
        var nx = d > 0.01 ? dx / d : 0, ny = d > 0.01 ? dy / d : -1;
        var self = f === owner ? 0.5 : 1;
        hurt(f, f === owner ? f.lastHit : owner, dmg * k * self, nx * kb * k, Math.min(-4, ny * kb * k) - 3, 'boom');
      }
      for (var j = 0; j < plats.length; j++) {
        var p = plats[j];
        if (!p.alive || p.hp <= 0) continue;
        var px = clamp(x, p.x, p.x + p.w), py = clamp(y, p.y, p.y + p.h);
        if ((px - x) * (px - x) + (py - y) * (py - y) < r * r * 0.7) damageBlock(p, 100);
      }
      for (var m = 0; m < items.length; m++) {
        var it = items[m];
        var ix = it.x - x, iy = it.y - y, id = Math.sqrt(ix * ix + iy * iy) || 1;
        if (id < r) { it.vx += (ix / id) * 9; it.vy -= 6; it.onGround = false; }
      }
      part(3, x, y, 0, 0, 0.35, r * 1.1, 'rgba(255,220,140,0.9)');
      part(4, x, y, 0, 0, 0.12, r * 0.9, '#fff6d0');
      for (var n = 0; n < 16; n++) {
        var a = Math.random() * TAU, s = rand(2, 9);
        part(n < 8 ? 0 : 1, x, y, Math.cos(a) * s, Math.sin(a) * s - 2, rand(0.3, 0.7), n < 8 ? 0.1 : rand(0.25, 0.5), n < 8 ? '#ffb347' : 'rgba(90,80,80,0.6)');
      }
      shake = Math.max(shake, 0.75);
      hitstop = Math.max(hitstop, 0.07);
      sfx('explode');
    }

    function damageBlock(p, dmg) {
      if (p.hp <= 0 || !p.alive) return;
      p.hp -= dmg;
      p.shakeT = 0.15;
      if (p.hp <= 0) breakBlock(p);
    }
    function breakBlock(p) {
      if (!p.alive) return;
      p.alive = false;
      for (var i = 0; i < 7; i++) part(2, p.x + rand(0.1, 0.9), p.y + rand(0.1, 0.9), rand(-3, 3), rand(-5, 1), rand(0.5, 1), rand(0.12, 0.22), i % 2 ? TH.solid : TH.top);
      puff(p.x + 0.5, p.y + 0.5, 3, 'rgba(200,200,210,0.45)', 1);
      noise({ d: 0.2, f: 500, v: 0.18 });
    }

    /* ------------------------------------------------------------------ */
    /* CPU fighters                                                        */
    /* ------------------------------------------------------------------ */
    // Highest platform surface at or below y under x (within maxD), or null. Lava/goo counts as no ground.
    function groundUnder(x, y, maxD) {
      var best = null, by = 1e9;
      for (var i = 0; i < plats.length; i++) {
        var p = plats[i];
        if (!p.alive || x < p.x + 0.05 || x > p.x + p.w - 0.05) continue;
        if (p.y >= y - 0.05 && p.y < by && p.y - y <= maxD) { best = p; by = p.y; }
      }
      if (best && best.y > deadly() - 0.3) return null;
      return best;
    }
    function sawNear(x, y, r) {
      for (var i = 0; i < saws.length; i++) {
        var s = saws[i];
        if ((s.warn || s.y < s.y0 - 0.2 || !s.pop) && Math.abs(s.x - x) < r && s.y > y - BH - 1.4 && s.y < y + 0.8) return s;
      }
      return null;
    }

    function aiThink(f) {
      var ai = f.ai, inp = f.input, D = ai.diff;
      inp.left = inp.right = inp.down = false;
      inp.up = f.vy < 0; // keep holding jump while rising (full jump height)
      ai.think -= STEP;
      if (f.stun > 0) { ai.think = Math.min(ai.think, 0.1); return; }

      // 1) recovery: no ground below → steer to the nearest safe platform, double-jump when falling
      var below = groundUnder(f.x, f.y - 0.1, 30);
      if (!f.onGround && !below) {
        var best = null, bd = 1e9;
        for (var i = 0; i < plats.length; i++) {
          var p = plats[i];
          if (!p.alive || p.y > deadly() - 0.3) continue;
          var tx = clamp(f.x, p.x + 0.5, p.x + p.w - 0.5);
          var d = Math.abs(tx - f.x) + Math.max(0, f.y - p.y) * 0.3 + Math.max(0, p.y - f.y) * 0.15;
          if (d < bd) { bd = d; best = p; }
        }
        if (best) {
          var gx = clamp(f.x, best.x + 0.6, best.x + best.w - 0.6);
          if (gx > f.x + 0.1) inp.right = true; else if (gx < f.x - 0.1) inp.left = true;
          if (f.airJumps > 0 && f.vy > 0.5 && f.y > best.y - 0.8 && Math.random() < [0.08, 0.3, 0.6][D]) f.buf.jump = 0.1;
          inp.up = true;
        }
        return;
      }

      // 2) pick goal (with reaction time)
      if (ai.think <= 0) {
        ai.think = [0.5, 0.3, 0.16][D] + rand(0, 0.15);
        var tgt = null, td = 1e9;
        for (var j = 0; j < fighters.length; j++) {
          var o = fighters[j];
          if (o === f || !o.alive) continue;
          var od = Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 1.5 - (o === ai.target ? 2 : 0) - (o.human && D > 0 ? 1 : 0);
          if (od < td) { td = od; tgt = o; }
        }
        ai.target = tgt;
        ai.item = null;
        if (!f.weapon) {
          var id = 1e9;
          for (var k = 0; k < items.length; k++) {
            var it = items[k];
            if ((it.k !== 'crate' && it.k !== 'pickup') || !it.onGround) continue;
            var dd = Math.abs(it.x - f.x) + Math.abs(it.y - f.y) * 1.5;
            if (dd < id && dd < 11) { id = dd; ai.item = it; }
          }
          if (ai.item && tgt && td < 2.5 && id > 3) ai.item = null; // fight back instead of running off
        }
        ai.kick = Math.random() < 0.35;
        ai.jitter = rand(-0.4, 0.4);
      }
      if (ai.item && items.indexOf(ai.item) < 0) ai.item = null;
      var t = ai.target;
      if (t && !t.alive) t = ai.target = null;
      var goal = ai.item || t;
      if (!goal) return;

      var dx = goal.x - f.x, dy = goal.y - f.y;
      var stand = 0;
      if (!ai.item && f.weapon) {
        var wd = WEAPONS[f.weapon.id];
        stand = wd.melee ? 0.9 : wd.bomb ? 4 : wd.pellets > 1 ? 2.6 : wd.rocket ? 6 : 5;
      } else if (!ai.item) stand = 0.75;
      var want = 0;
      var adx = Math.abs(dx);
      if (adx > stand + 0.35 + ai.jitter * 0.3) want = sgn(dx);
      else if (stand > 2 && adx < stand - 1.4 && Math.abs(dy) < 1.5) want = -sgn(dx);

      // vertical navigation
      var jump = false;
      if (dy < -1.3 && f.onGround) {
        // find a platform above that gets us closer to the goal
        var up = null, ub = 1e9;
        for (var q = 0; q < plats.length; q++) {
          var pl = plats[q];
          if (!pl.alive || pl === f.plat) continue;
          var rise = f.y - pl.y;
          if (rise < 0.6 || rise > 4.3) continue;
          var nx = clamp(f.x, pl.x + 0.4, pl.x + pl.w - 0.4);
          var cost = Math.abs(nx - f.x) + Math.abs(clamp(goal.x, pl.x, pl.x + pl.w) - goal.x) * 0.6 + Math.abs(pl.y - goal.y) * 0.5;
          if (cost < ub) { ub = cost; up = pl; }
        }
        if (up) {
          var under = f.x > up.x + 0.25 && f.x < up.x + up.w - 0.25;
          if (up.t === 'o' && under) jump = true;
          else {
            var edge = f.x < up.x ? up.x - 0.5 : f.x > up.x + up.w ? up.x + up.w + 0.5 : (f.x - up.x < up.x + up.w - f.x ? up.x - 0.5 : up.x + up.w + 0.5);
            if (up.t === 'o') edge = clamp(f.x, up.x + 0.4, up.x + up.w - 0.4);
            if (Math.abs(edge - f.x) < 1.3) { jump = true; want = sgn(clamp(goal.x, up.x, up.x + up.w) - f.x); }
            else want = sgn(edge - f.x);
          }
          ai.up = true;
        }
      } else if (dy > 1.4 && f.onGround && f.plat && f.plat.t === 'o' && adx < 5) {
        var land = groundUnder(f.x, f.y + 0.2, 8);
        if (land) inp.down = true;
      }
      if (!f.onGround && ai.up && f.vy > -1.5 && f.airJumps > 0 && dy < -0.8 && Math.random() < [0.05, 0.2, 0.4][D]) { f.buf.jump = 0.1; ai.up = false; }
      if (f.onGround && dy > -1) ai.up = false;

      // edge safety: don't run off into the void unless a jump can clear the gap
      if (want !== 0 && f.onGround) {
        var ahead = groundUnder(f.x + want * 0.9, f.y - 0.3, 6);
        if (!ahead) {
          var far = null;
          for (var s = 1.6; s <= 5.2; s += 0.6) { far = groundUnder(f.x + want * s, f.y - 2.4, 5); if (far) break; }
          if (far && sgn(dx) === want && (adx > 2 || dy < -0.5)) jump = true;
          else want = 0;
        }
      }
      // conveyors: lean against them when idle
      if (want === 0 && f.onGround && f.plat && f.plat.conv) want = -sgn(f.plat.conv) * (Math.random() < 0.6 ? 1 : 0);
      // hazards: back away from saws, jump out of rising goo
      var sw = sawNear(f.x + want * 1.2, f.y, 2.2);
      if (sw && D > 0) { want = f.x < sw.x ? -1 : 1; if (sw.pop && f.onGround) jump = true; }
      if (deadly() - f.y < 2.2 && f.onGround) jump = true;
      // unstick: if we try to move but don't, hop
      if (want !== 0 && Math.abs(f.x - ai.lastX) < 0.005 && f.onGround) { ai.stuck += STEP; if (ai.stuck > 0.35) { jump = true; ai.stuck = 0; } } else ai.stuck = 0;
      ai.lastX = f.x;

      if (want > 0) inp.right = true; else if (want < 0) inp.left = true;
      if (jump && f.onGround) { f.buf.jump = 0.1; inp.up = true; }

      // combat
      if (!t || f.cd > 0) return;
      var tdx = t.x - f.x, tdy = t.y - f.y, atdx = Math.abs(tdx);
      var facing = sgn(tdx) === f.face;
      var rate = [0.022, 0.06, 0.14][D];
      if (f.weapon) {
        var w = WEAPONS[f.weapon.id];
        if (w.melee) {
          if (atdx < 1.7 && Math.abs(tdy) < 1.3) { if (!facing) turn(f, tdx); else if (Math.random() < rate * 1.5) f.buf.atk = 0.1; }
        } else if (w.bomb) {
          if (atdx > 1.5 && atdx < 7 && tdy > -2 && facing && Math.random() < rate * 0.4) f.buf.atk = 0.1;
          else if (atdx < 7 && !facing && want === 0) turn(f, tdx);
        } else if (Math.abs(tdy + (D === 2 ? (t.vy * 0.05) : 0)) < 0.85 && atdx < w.range) {
          if (!facing) turn(f, tdx);
          else if (Math.random() < rate * (w.rocket ? 0.5 : 1)) f.buf.atk = 0.1;
        }
      } else if (atdx < 1.35 && Math.abs(tdy) < 1.2) {
        if (!facing) turn(f, tdx);
        else if (Math.random() < rate) { if (ai.kick) f.buf.kick = 0.1; else f.buf.atk = 0.1; }
      } else if (!f.onGround && atdx < 2.4 && tdy > 0.2 && tdy < 2.2 && facing && Math.random() < rate * 0.5) {
        f.buf.kick = 0.1;
      }
    }
    function turn(f, dx) {
      if (dx > 0) f.input.right = true; else f.input.left = true;
    }

    /* ------------------------------------------------------------------ */
    /* Banners, camera                                                     */
    /* ------------------------------------------------------------------ */
    function setBanner(text, sub, color, dur) {
      if (attract) return;
      banner = { text: text, sub: sub, c: color, t: 0, max: dur };
    }

    function updateCam(dt) {
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, n = 0;
      for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        if (f.out) continue;
        if (!f.alive && f.deadT > 1.2) continue;
        var x = f.alive ? f.x : f.pts[0].x, y = f.alive ? f.y : f.pts[0].y;
        if (x < -3 || x > A.w + 3 || y > A.h + 2) continue;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y - BH); maxY = Math.max(maxY, y);
        n++;
      }
      if (!n) { minX = 0; maxX = A.w; minY = 2; maxY = A.h - 2; }
      var usableH = Math.max(120, H - touchH * 0.75);
      var bw = maxX - minX + 7, bh = maxY - minY + 5.5;
      var zFit = Math.min(W / bw, usableH / bh);
      var zAll = Math.min(W / (A.w + 1), usableH / (A.h + 0.5));
      var zMin = Math.max(zAll, Math.min(W, usableH) / 16);
      var zMax = Math.min(W, usableH) / 10;
      var z = clamp(zFit, zMin, Math.max(zMin, zMax));
      var vw = W / z, vh = usableH / z;
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2 + 0.4;
      // keep the view inside the arena where possible
      if (vw >= A.w + 1) cx = A.w / 2; else cx = clamp(cx, vw / 2 - 0.5, A.w + 0.5 - vw / 2);
      if (vh >= A.h + 0.5) cy = A.h / 2 + 0.2; else cy = clamp(cy, vh / 2 - 1, A.h + 0.6 - vh / 2);
      var k = 1 - Math.exp(-dt * 3.2);
      cam.z += (z - cam.z) * k;
      cam.x += (cx - cam.x) * k;
      cam.y += (cy - cam.y) * k;
      if (!isFinite(cam.z) || cam.z <= 0) cam.z = z;
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                           */
    /* ------------------------------------------------------------------ */
    var bg = null;
    function buildBackground() {
      var r = mulberry(A.id.length * 977 + A.id.charCodeAt(0));
      bg = { far: [], near: [], stars: [], clouds: [], gears: [] };
      for (var i = 0; i < 26; i++) bg.far.push({ x: -14 + i * 2.6 + r() * 1.2, w: 1.6 + r() * 1.8, h: 3 + r() * 6, win: r() });
      for (var j = 0; j < 18; j++) bg.near.push({ x: -12 + j * 3.4 + r() * 1.4, w: 2 + r() * 2.2, h: 2 + r() * 4.5, win: r() });
      for (var k = 0; k < 50; k++) bg.stars.push({ x: r(), y: r() * 0.55, s: 0.6 + r() * 1.2, t: r() * TAU });
      for (var c = 0; c < 9; c++) bg.clouds.push({ x: -10 + r() * 46, y: 1 + r() * 11, s: 0.6 + r() * 1.3, sp: 0.15 + r() * 0.4 });
      for (var q = 0; q < 6; q++) bg.gears.push({ x: -4 + q * 7 + r() * 3, y: 3 + r() * 8, r: 1.2 + r() * 2.2, sp: (r() < 0.5 ? -1 : 1) * (0.2 + r() * 0.4) });
    }

    function render() {
      var dpr = view.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!A) { g.fillStyle = '#111'; g.fillRect(0, 0, W, H); return; }
      var Z = cam.z;
      var usableH = Math.max(120, H - touchH * 0.75);
      var sx = 0, sy = 0;
      if (shake > 0) { sx = (Math.random() - 0.5) * shake * 0.6 * Z * 0.5; sy = (Math.random() - 0.5) * shake * 0.6 * Z * 0.5; }
      var ox = W / 2 - cam.x * Z + sx, oy = usableH / 2 - cam.y * Z + sy;
      drawBackground(Z, ox, oy);
      g.setTransform(dpr * Z, 0, 0, dpr * Z, dpr * ox, dpr * oy);
      drawSaws(true);
      drawPlatforms();
      drawLava();
      drawItems();
      // dead fighters behind the living
      for (var i = 0; i < fighters.length; i++) if (!fighters[i].alive && !fighters[i].out && fighters[i].deadT < 6) drawFighter(fighters[i]);
      for (var j = 0; j < fighters.length; j++) if (fighters[j].alive) drawFighter(fighters[j]);
      drawSaws(false);
      drawShots();
      drawParticles();
      drawFlood();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTags(Z, ox, oy);
      drawPopups(Z, ox, oy);
      drawOffscreen(Z, ox, oy, usableH);
      if (!attract) drawHud();
      drawBanner();
    }

    function drawBackground(Z, ox, oy) {
      var sk = TH.sky;
      var grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, sk[0]); grd.addColorStop(0.55, sk[1]); grd.addColorStop(1, sk[2]);
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      var th = A.theme, i, b, x, y;
      var par = function (wx, f) { return W / 2 + (wx - cam.x) * Z * f; };
      var parY = function (wy, f) { return oy + cam.y * Z + (wy - cam.y) * Z * f; };
      if (th === 'city' || th === 'keep' || th === 'magma') {
        for (i = 0; i < bg.stars.length; i++) {
          var st = bg.stars[i];
          g.globalAlpha = (th === 'magma' ? 0.25 : 0.5) + 0.3 * Math.sin(time * 1.3 + st.t);
          g.fillStyle = th === 'magma' ? '#ffb38a' : '#fff';
          g.fillRect(st.x * W, st.y * H, st.s, st.s);
        }
        g.globalAlpha = 1;
      }
      if (th === 'city') {
        g.fillStyle = 'rgba(255,190,140,0.85)';
        g.beginPath(); g.arc(par(19, 0.15), parY(6.5, 0.2), 2.2 * Z, 0, TAU); g.fill();
        drawSkyline(bg.far, 0.35, TH.far, 15.5, Z, par, parY, true);
        drawSkyline(bg.near, 0.6, TH.near, 15.2, Z, par, parY, true);
      } else if (th === 'keep') {
        g.fillStyle = 'rgba(235,240,255,0.9)';
        g.beginPath(); g.arc(par(6, 0.12), parY(3, 0.15), 1.3 * Z, 0, TAU); g.fill();
        // mountains
        g.fillStyle = TH.far;
        g.beginPath(); g.moveTo(0, H);
        for (i = -2; i <= 14; i++) { x = par(i * 3.2 - 6, 0.3); y = parY(i % 2 ? 7 : 9.5, 0.4); g.lineTo(x, y); }
        g.lineTo(W, H); g.closePath(); g.fill();
        // castle silhouettes
        g.fillStyle = TH.near;
        for (i = 0; i < bg.near.length; i += 2) {
          b = bg.near[i];
          x = par(b.x, 0.55); y = parY(15 - b.h * 0.8, 0.6);
          var bw2 = b.w * Z * 0.55;
          g.fillRect(x, y, bw2, H);
          for (var m = 0; m < 3; m++) g.fillRect(x + (m * bw2) / 2.5, y - 0.35 * Z, bw2 / 5, 0.36 * Z);
        }
      } else if (th === 'mill') {
        g.fillStyle = 'rgba(255,200,120,0.25)';
        g.beginPath(); g.arc(par(13, 0.1), parY(4, 0.1), 3.5 * Z, 0, TAU); g.fill();
        for (i = 0; i < bg.gears.length; i++) {
          var ge = bg.gears[i];
          drawGear(par(ge.x, 0.4), parY(ge.y, 0.45), ge.r * Z * 0.6, time * ge.sp, TH.far);
        }
        drawSkyline(bg.near, 0.6, TH.near, 15.4, Z, par, parY, false);
        // smoke stacks
        g.fillStyle = TH.near;
        g.fillStyle = TH.far;
        for (i = 0; i < 3; i++) { x = par(2 + i * 11, 0.45); g.fillRect(x, parY(3.5, 0.5), 0.45 * Z, H); }
      } else if (th === 'magma') {
        g.fillStyle = TH.far;
        g.beginPath(); g.moveTo(0, H);
        var vx = par(13, 0.3);
        g.lineTo(vx - 9 * Z, H); g.lineTo(vx - 1.6 * Z, parY(4, 0.35)); g.lineTo(vx + 1.6 * Z, parY(4, 0.35)); g.lineTo(vx + 9 * Z, H);
        g.closePath(); g.fill();
        var glow = g.createRadialGradient(vx, parY(4, 0.35), 0, vx, parY(4, 0.35), 4 * Z);
        glow.addColorStop(0, 'rgba(255,120,40,0.55)'); glow.addColorStop(1, 'rgba(255,80,20,0)');
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        for (i = 0; i < 12; i++) {
          var ex = ((i * 0.618 + time * 0.03 * (1 + (i % 3))) % 1) * W;
          var ey = H - ((time * (14 + i * 3) + i * 70) % (H + 40));
          g.fillStyle = 'rgba(255,' + (120 + (i * 12) % 100) + ',60,0.7)';
          g.fillRect(ex, ey, 2, 2);
        }
      } else if (th === 'sky') {
        g.fillStyle = 'rgba(255,250,220,0.9)';
        g.beginPath(); g.arc(par(20, 0.1), parY(2.5, 0.1), 1.6 * Z, 0, TAU); g.fill();
        for (i = 0; i < bg.clouds.length; i++) {
          var cl = bg.clouds[i];
          var cxp = par(((cl.x + time * cl.sp) % 46) - 10, 0.3 + cl.s * 0.15), cyp = parY(cl.y, 0.3);
          g.fillStyle = 'rgba(255,255,255,' + (0.35 + cl.s * 0.2) + ')';
          cloud(cxp, cyp, cl.s * Z * 1.2);
        }
      }
    }
    function star(x, y, r1, r2) {
      g.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? r2 : r1;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    }
    function cloud(x, y, s) {
      g.beginPath();
      g.ellipse(x, y, 2.2 * s, 0.7 * s, 0, 0, TAU);
      g.ellipse(x - 0.9 * s, y - 0.3 * s, 1 * s, 0.7 * s, 0, 0, TAU);
      g.ellipse(x + 0.7 * s, y - 0.45 * s, 1.1 * s, 0.85 * s, 0, 0, TAU);
      g.fill();
    }
    function drawSkyline(arr, f, col, base, Z, par, parY, windows) {
      for (var i = 0; i < arr.length; i++) {
        var b = arr[i];
        var x = par(b.x, f), y = parY(base - b.h, f + 0.1), w = b.w * Z * f * 1.4;
        g.fillStyle = col;
        g.fillRect(x, y, w, H - y + 2);
        if (windows && TH.win && b.win > 0.3) {
          g.fillStyle = TH.win;
          var ws = Math.max(2, Z * 0.12 * f * 2);
          for (var r = 0; r < 6; r++) for (var c = 0; c < 3; c++) {
            if (((r * 7 + c * 3 + i) % 5) > 1) continue;
            g.fillRect(x + w * (0.18 + c * 0.28), y + ws * 2 + r * ws * 3, ws, ws * 1.4);
          }
        }
      }
    }
    function drawGear(x, y, r, a, col) {
      g.fillStyle = col;
      g.beginPath();
      for (var i = 0; i < 20; i++) {
        var ang = a + (i / 20) * TAU, rr = i % 2 ? r : r * 1.18;
        var ang2 = a + ((i + 1) / 20) * TAU;
        g.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        g.lineTo(x + Math.cos(ang2) * rr, y + Math.sin(ang2) * rr);
      }
      g.closePath();
      g.fill();
      g.fillStyle = TH.sky[1];
      g.beginPath(); g.arc(x, y, r * 0.35, 0, TAU); g.fill();
    }

    function drawPlatforms() {
      for (var i = 0; i < plats.length; i++) {
        var p = plats[i];
        if (!p.alive) continue;
        var x = p.x, y = p.y;
        if (p.shakeT > 0) { x += (Math.random() - 0.5) * 0.06; y += (Math.random() - 0.5) * 0.06; }
        if (p.t === 'o') {
          g.fillStyle = TH.one;
          roundRect(x, y, p.w, p.h, 0.12); g.fill();
          g.fillStyle = TH.oneTop;
          g.fillRect(x + 0.05, y, p.w - 0.1, 0.1);
          if (p.mv && p.mv.ay) {
            // lift cables
            g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.05;
            g.beginPath(); g.moveTo(x + 0.3, y); g.lineTo(x + 0.3, -3); g.moveTo(x + p.w - 0.3, y); g.lineTo(x + p.w - 0.3, -3); g.stroke();
          } else if (p.mv && p.mv.ax) {
            g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.05;
            g.beginPath(); g.moveTo(x + p.w / 2, y); g.lineTo(p.x0 + p.w / 2, -3); g.stroke();
          }
        } else if (p.t === 'b' || p.t === 'c') {
          g.fillStyle = TH.solid;
          g.fillRect(x + 0.02, y, 0.96, 0.98);
          g.fillStyle = TH.top;
          g.fillRect(x + 0.02, y, 0.96, 0.12);
          g.strokeStyle = TH.side; g.lineWidth = 0.05;
          g.strokeRect(x + 0.04, y + 0.02, 0.92, 0.94);
          if (p.t === 'c' || p.hp < 60) {
            g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 0.05;
            g.beginPath(); g.moveTo(x + 0.2, y + 0.15); g.lineTo(x + 0.45, y + 0.45); g.lineTo(x + 0.35, y + 0.7); g.moveTo(x + 0.45, y + 0.45); g.lineTo(x + 0.8, y + 0.55); g.stroke();
          }
        } else {
          if (A.theme === 'sky') {
            cloudTop(x, y, p.w, p.h);
          } else {
            g.fillStyle = TH.solid;
            g.fillRect(x, y, p.w, p.h);
            g.fillStyle = TH.side;
            g.fillRect(x, y + 0.35, p.w, 0.12);
            if (A.theme === 'city') {
              g.fillStyle = TH.win;
              for (var wy = y + 1.2; wy < y + p.h; wy += 1.4) for (var wx = x + 0.6; wx < x + p.w - 0.6; wx += 1.3) if (((wx * 3 + wy) | 0) % 3) g.fillRect(wx, wy, 0.5, 0.7);
            }
            g.fillStyle = TH.top;
            g.fillRect(x, y, p.w, 0.14);
            if (p.conv) {
              // conveyor chevrons scroll in the push direction
              g.fillStyle = 'rgba(0,0,0,0.35)';
              g.fillRect(x, y + 0.14, p.w, 0.3);
              g.strokeStyle = '#f2b531'; g.lineWidth = 0.07;
              var off = ((roundT * p.conv) % 0.8 + 0.8) % 0.8;
              g.beginPath();
              for (var cx = x + off - 0.8; cx < x + p.w; cx += 0.8) {
                if (cx < x + 0.05 || cx > x + p.w - 0.3) continue;
                var d = sgn(p.conv) * 0.12;
                g.moveTo(cx - d, y + 0.18); g.lineTo(cx + d, y + 0.29); g.lineTo(cx - d, y + 0.4);
              }
              g.stroke();
            }
          }
        }
      }
    }
    function cloudTop(x, y, w, h) {
      g.fillStyle = TH.side;
      roundRect(x - 0.25, y + 0.45, w + 0.5, h, 0.55); g.fill();
      g.fillStyle = TH.solid;
      roundRect(x - 0.1, y + 0.12, w + 0.2, h - 0.2, 0.5); g.fill();
      g.beginPath();
      for (var i = x + 0.4; i <= x + w - 0.3; i += 0.75) { g.moveTo(i + 0.45, y + 0.45); g.arc(i, y + 0.45, 0.45, 0, TAU); }
      g.fill();
      g.fillStyle = 'rgba(160,190,230,0.35)';
      g.fillRect(x + 0.2, y + h - 0.35, w - 0.4, 0.12);
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

    function drawSaws(back) {
      for (var i = 0; i < saws.length; i++) {
        var s = saws[i];
        if (back) {
          if (s.mv) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(s.x0 - s.mv.ax - 1, s.y - 0.08, s.mv.ax * 2 + 2, 0.16); }
          continue;
        }
        if (s.pop) {
          // floor slot (drawn over the floor), glowing while the saw is about to pop
          g.fillStyle = s.warn ? 'rgba(255,170,60,' + (0.5 + 0.4 * Math.sin(time * 30)) + ')' : 'rgba(0,0,0,0.7)';
          g.fillRect(s.x0 - s.r - 0.1, 11.96, (s.r + 0.1) * 2, 0.14);
          if (s.warn && Math.random() < 0.5) part(0, s.x0 + rand(-0.6, 0.6), 12, rand(-2, 2), rand(-5, -2), 0.25, 0.06, '#ffd36a');
          if (s.y > 12.6) continue;
        }
        g.save();
        g.translate(s.x, s.y);
        if (s.pop) { g.beginPath(); g.rect(-s.r - 0.2, -s.r - 0.2, (s.r + 0.2) * 2, 12 - s.y + s.r + 0.2); g.clip(); }
        g.rotate(s.rot);
        g.fillStyle = '#c9d1dc';
        g.beginPath();
        for (var t = 0; t < 16; t++) {
          var a = (t / 16) * TAU;
          g.lineTo(Math.cos(a) * s.r, Math.sin(a) * s.r);
          g.lineTo(Math.cos(a + 0.2) * s.r * 0.78, Math.sin(a + 0.2) * s.r * 0.78);
        }
        g.closePath(); g.fill();
        g.fillStyle = '#8b95a5';
        g.beginPath(); g.arc(0, 0, s.r * 0.55, 0, TAU); g.fill();
        g.fillStyle = '#e94f4f';
        g.beginPath(); g.arc(0, 0, s.r * 0.18, 0, TAU); g.fill();
        g.restore();
      }
    }

    function drawLava() {
      if (lavaY > 50) return;
      drawGoo(lavaY, '#ff6a1f', '#ffb347', 'rgba(255,90,30,0.35)');
    }
    function drawFlood() {
      if (floodY > A.h + 4) return;
      drawGoo(floodY, 'rgba(150,70,220,0.88)', '#e2b8ff', 'rgba(170,90,255,0.3)');
    }
    function drawGoo(y, fill, top, glow) {
      var x0 = cam.x - W / cam.z, x1 = cam.x + W / cam.z;
      g.fillStyle = glow;
      g.fillRect(x0, y - 0.8, x1 - x0, 0.8);
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(x0, y + 30);
      for (var x = Math.floor(x0); x <= x1 + 1; x += 0.5) g.lineTo(x, y + Math.sin(x * 1.3 + time * 2.4) * 0.1);
      g.lineTo(x1 + 1, y + 30);
      g.closePath();
      g.fill();
      g.strokeStyle = top; g.lineWidth = 0.08;
      g.beginPath();
      for (var x2 = Math.floor(x0); x2 <= x1 + 1; x2 += 0.5) { var yy = y + Math.sin(x2 * 1.3 + time * 2.4) * 0.1; if (x2 === Math.floor(x0)) g.moveTo(x2, yy); else g.lineTo(x2, yy); }
      g.stroke();
      if (Math.random() < 0.15) part(1, rand(x0, x1), y, 0, -rand(0.5, 1.5), 0.6, rand(0.08, 0.16), top);
    }

    function drawItems() {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.k === 'crate') {
          var cx = it.x, cy = it.y - it.h;
          if (it.chute) {
            g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.03;
            g.beginPath(); g.moveTo(cx - 0.36, cy); g.lineTo(cx - 0.8, cy - 1.1); g.moveTo(cx + 0.36, cy); g.lineTo(cx + 0.8, cy - 1.1); g.stroke();
            g.fillStyle = '#ff5a5f';
            g.beginPath(); g.ellipse(cx, cy - 1.15, 0.95, 0.5, 0, Math.PI, TAU); g.fill();
            g.fillStyle = '#fff';
            g.beginPath(); g.ellipse(cx, cy - 1.15, 0.32, 0.5, 0, Math.PI, TAU); g.fill();
          }
          g.fillStyle = '#b8793d';
          g.fillRect(cx - it.w / 2, cy, it.w, it.h);
          g.strokeStyle = '#7a4c22'; g.lineWidth = 0.06;
          g.strokeRect(cx - it.w / 2 + 0.03, cy + 0.03, it.w - 0.06, it.h - 0.06);
          g.beginPath(); g.moveTo(cx - it.w / 2 + 0.05, cy + 0.05); g.lineTo(cx + it.w / 2 - 0.05, cy + it.h - 0.05); g.stroke();
          g.fillStyle = '#ffd23f';
          star(cx, cy + it.h / 2, 0.2, 0.09);
          // glow so crates read as "grab me"
          if (!it.chute) { g.strokeStyle = 'rgba(255,230,120,' + (0.3 + 0.3 * Math.sin(time * 6)) + ')'; g.lineWidth = 0.05; g.strokeRect(cx - it.w / 2 - 0.08, cy - 0.08, it.w + 0.16, it.h + 0.16); }
        } else if (it.k === 'bomb') {
          var blink = it.life < 0.6 ? Math.sin(time * 40) > 0 : Math.sin(time * 14) > 0.6;
          g.fillStyle = blink ? '#ff5a5f' : '#2b2f3a';
          g.beginPath(); g.arc(it.x, it.y - it.h / 2, it.h / 2, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.4)';
          g.beginPath(); g.arc(it.x - 0.06, it.y - it.h / 2 - 0.07, 0.06, 0, TAU); g.fill();
          g.fillStyle = '#ffd23f';
          g.fillRect(it.x - 0.03, it.y - it.h - 0.12, 0.06, 0.12);
        } else {
          g.save();
          g.translate(it.x, it.y - it.h / 2);
          g.rotate(it.rot);
          drawWeaponShape(it.wid, 1);
          g.restore();
          if (it.k === 'pickup' && it.onGround) {
            g.fillStyle = 'rgba(255,230,120,' + (0.25 + 0.2 * Math.sin(time * 6)) + ')';
            g.beginPath(); g.ellipse(it.x, it.y - 0.02, 0.45, 0.08, 0, 0, TAU); g.fill();
          }
        }
      }
    }

    // Weapon drawn pointing +x from the grip at (0,0)
    function drawWeaponShape(id, F) {
      g.lineCap = 'round';
      g.scale(1.3, 1.3);
      if (id === 'bat') {
        g.strokeStyle = '#3a2412'; g.lineWidth = 0.2;
        g.beginPath(); g.moveTo(-0.1, 0); g.lineTo(0.85, 0); g.stroke();
        g.strokeStyle = '#d9a05b'; g.lineWidth = 0.13;
        g.beginPath(); g.moveTo(-0.1, 0); g.lineTo(0.85, 0); g.stroke();
        g.fillStyle = '#d9a05b';
        g.beginPath(); g.arc(0.85, 0, 0.11, 0, TAU); g.fill();
      } else if (id === 'pistol') {
        g.fillStyle = '#22252e';
        g.fillRect(-0.05, -0.12, 0.42, 0.13);
        g.fillRect(-0.05, -0.02, 0.12, 0.2);
        g.fillStyle = '#6ee7ff';
        g.fillRect(0.06, -0.1, 0.18, 0.04);
      } else if (id === 'shotgun') {
        g.fillStyle = '#5a3a20';
        g.fillRect(-0.35, -0.08, 0.35, 0.16);
        g.fillStyle = '#2b2f3a';
        g.fillRect(-0.02, -0.1, 0.8, 0.09);
        g.fillRect(0.1, -0.01, 0.45, 0.07);
        g.fillStyle = '#ff9f43';
        g.fillRect(0.25, -0.02, 0.18, 0.08);
      } else if (id === 'rocket') {
        g.fillStyle = '#4a7c3f';
        g.fillRect(-0.4, -0.16, 1.15, 0.24);
        g.fillStyle = '#2d4f27';
        g.fillRect(-0.4, -0.18, 0.12, 0.28);
        g.fillRect(0.66, -0.19, 0.12, 0.3);
        g.fillStyle = '#ffd23f';
        g.fillRect(0.05, -0.04, 0.25, 0.06);
      } else if (id === 'bombs') {
        g.fillStyle = '#2b2f3a';
        g.beginPath(); g.arc(0.1, 0, 0.16, 0, TAU); g.fill();
        g.fillStyle = '#ffd23f';
        g.fillRect(0.08, -0.24, 0.05, 0.09);
      }
    }

    function drawShots() {
      g.lineCap = 'round';
      for (var i = 0; i < shots.length; i++) {
        var s = shots[i];
        if (s.k === 'rocket') {
          g.save();
          g.translate(s.x, s.y);
          g.scale(sgn(s.vx), 1);
          g.fillStyle = '#e2e8f0';
          g.fillRect(-0.35, -0.08, 0.5, 0.16);
          g.fillStyle = '#ff5a5f';
          g.beginPath(); g.moveTo(0.15, -0.08); g.lineTo(0.32, 0); g.lineTo(0.15, 0.08); g.fill();
          g.fillStyle = Math.random() < 0.5 ? '#ffd23f' : '#ff8a3d';
          g.beginPath(); g.moveTo(-0.35, -0.07); g.lineTo(-0.35 - rand(0.25, 0.5), 0); g.lineTo(-0.35, 0.07); g.fill();
          g.restore();
        } else {
          g.strokeStyle = 'rgba(255,240,170,0.95)';
          g.lineWidth = 0.07;
          g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 0.018, s.y - s.vy * 0.018); g.stroke();
        }
      }
    }

    function drawFighter(f) {
      var p = f.pts;
      var alive = f.alive;
      var flash = f.flash > 0 && Math.floor(f.flash * 40) % 2 === 0;
      var blink = f.inv > 0 && alive && Math.floor(f.inv * 10) % 2 === 0 && state === 'fight';
      g.globalAlpha = blink ? 0.55 : !alive ? clamp(1.6 - f.deadT * 0.3, 0, 1) : 1;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      var col = flash ? '#ffffff' : f.col, dark = flash ? '#dddddd' : f.dark;
      var outline = 'rgba(12,12,24,0.85)';
      // back limbs (darker), then torso + head, then front limbs
      limb(p[1], p[3], p[4], outline, LIMB + 0.07);
      limb(p[0], p[7], p[8], outline, LIMB + 0.07);
      limb(p[1], p[3], p[4], dark, LIMB);
      limb(p[0], p[7], p[8], dark, LIMB);
      g.strokeStyle = outline; g.lineWidth = LIMB + 0.09;
      g.beginPath(); g.moveTo(p[0].x, p[0].y); g.lineTo(p[1].x, p[1].y); g.stroke();
      g.strokeStyle = col; g.lineWidth = LIMB + 0.02;
      g.beginPath(); g.moveTo(p[0].x, p[0].y); g.lineTo(p[1].x, p[1].y); g.stroke();
      limb(p[0], p[9], p[10], outline, LIMB + 0.07);
      limb(p[0], p[9], p[10], col, LIMB);
      // head
      var hx = p[2].x, hy = p[2].y;
      g.fillStyle = outline;
      g.beginPath(); g.arc(hx, hy, R_HEAD + 0.04, 0, TAU); g.fill();
      g.fillStyle = col;
      g.beginPath(); g.arc(hx, hy, R_HEAD, 0, TAU); g.fill();
      // face
      var F = f.face;
      g.fillStyle = '#16161f';
      if (!alive) {
        g.strokeStyle = '#16161f'; g.lineWidth = 0.035;
        g.beginPath();
        for (var e = 0; e < 2; e++) {
          var ex = hx + F * (0.02 + e * 0.11) - 0.03, ey = hy - 0.03;
          g.moveTo(ex - 0.035, ey - 0.035); g.lineTo(ex + 0.035, ey + 0.035);
          g.moveTo(ex + 0.035, ey - 0.035); g.lineTo(ex - 0.035, ey + 0.035);
        }
        g.stroke();
      } else if (f.stun > 0) {
        g.beginPath(); g.arc(hx + F * 0.06, hy - 0.03, 0.035, 0, TAU); g.arc(hx + F * 0.15, hy - 0.03, 0.035, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(hx + F * 0.11, hy + 0.1, 0.05, 0.035, 0, 0, TAU); g.fill();
      } else {
        g.fillRect(hx + F * 0.05 - 0.025, hy - 0.08, 0.05, 0.09);
        g.fillRect(hx + F * 0.15 - 0.025, hy - 0.08, 0.05, 0.09);
        if (f.atk) { g.fillRect(hx + F * 0.1 - 0.05, hy + 0.08, 0.1, 0.03); }
      }
      // arm in front of body, holding weapon
      if (f.weapon && alive) {
        var hand = p[6], sh = p[1];
        var wd = WEAPONS[f.weapon.id];
        var ang;
        if (wd.melee) {
          ang = f.atk ? Math.atan2(hand.y - sh.y, hand.x - sh.x) : (F > 0 ? -1.9 : -1.25);
          if (f.atk && F < 0) ang += 0; // already in world space
        } else ang = F > 0 ? 0 : Math.PI;
        g.save();
        g.translate(hand.x, hand.y);
        g.rotate(ang);
        if (!wd.melee && F < 0) g.scale(1, -1);
        drawWeaponShape(f.weapon.id, F);
        g.restore();
      }
      limb(p[1], p[5], p[6], outline, LIMB + 0.07);
      limb(p[1], p[5], p[6], col, LIMB);
      g.globalAlpha = 1;
    }
    function limb(a, b, c, color, w) {
      g.strokeStyle = color; g.lineWidth = w;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.stroke();
    }

    function drawParticles() {
      for (var i = 0; i < MAXP; i++) {
        var p = P[i];
        if (!p.on) continue;
        var u = p.life / p.max;
        if (p.k === 0) {
          g.strokeStyle = p.c; g.lineWidth = p.s; g.globalAlpha = u;
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); g.stroke();
        } else if (p.k === 1) {
          g.fillStyle = p.c; g.globalAlpha = u * 0.9;
          g.beginPath(); g.arc(p.x, p.y, p.s * (1.6 - u * 0.6), 0, TAU); g.fill();
        } else if (p.k === 2) {
          g.fillStyle = p.c; g.globalAlpha = Math.min(1, u * 2);
          g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); g.restore();
        } else if (p.k === 3) {
          g.strokeStyle = p.c; g.lineWidth = 0.08 + 0.1 * u; g.globalAlpha = u;
          g.beginPath(); g.arc(p.x, p.y, p.s * (1 - u * 0.8) + 0.05, 0, TAU); g.stroke();
        } else if (p.k === 4) {
          g.fillStyle = p.c; g.globalAlpha = u;
          g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill();
        } else if (p.k === 5) {
          g.fillStyle = p.c; g.globalAlpha = Math.min(1, u * 3);
          g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s); g.restore();
        }
      }
      g.globalAlpha = 1;
    }
    function updateParticles(dt) {
      for (var i = 0; i < MAXP; i++) {
        var p = P[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 0 || p.k === 2) p.vy += 22 * dt;
        else if (p.k === 1) { p.vx *= 0.96; p.vy *= 0.96; }
        else if (p.k === 5) { p.vy += 6 * dt; p.vx *= 0.98; p.a += p.va * dt; }
        if (p.k === 2) p.a += p.va * dt;
      }
      for (var j = 0; j < POPS.length; j++) if (POPS[j].on) { POPS[j].t += dt; if (POPS[j].t > 0.9) POPS[j].on = false; }
    }

    function drawTags(Z, ox, oy) {
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        if (!f.alive) continue;
        var x = ox + f.x * Z, y = oy + (f.y - BH - 0.35) * Z;
        var bw = clamp(Z * 0.9, 26, 52), bh = Math.max(4, Z * 0.09);
        if (f.hp < 100 || f.human) {
          g.fillStyle = 'rgba(0,0,0,0.55)';
          g.fillRect(x - bw / 2 - 1, y - bh - 1, bw + 2, bh + 2);
          g.fillStyle = f.hp > 50 ? '#7ef0a0' : f.hp > 25 ? '#ffd23f' : '#ff5a5f';
          g.fillRect(x - bw / 2, y - bh, bw * clamp(f.hp / 100, 0, 1), bh);
        }
        if (f.human && !attract) {
          var fs = Math.round(clamp(Z * 0.32, 10, 14));
          g.font = '900 ' + fs + 'px system-ui,sans-serif';
          g.fillStyle = f.col;
          g.fillText(match.mode === 1 ? 'YOU' : f.name, x, y - bh - 5);
          g.beginPath(); g.moveTo(x - 4, y - bh - 3); g.lineTo(x + 4, y - bh - 3); g.lineTo(x, y - bh + 1); g.fill();
        }
        if (f.weapon) {
          // ammo pips
          var n = f.weapon.ammo;
          g.fillStyle = 'rgba(255,240,170,0.9)';
          for (var k = 0; k < Math.min(n, 9); k++) g.fillRect(x - bw / 2 + k * 4, y + 2, 2.5, 3);
        }
      }
    }

    function drawPopups(Z, ox, oy) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (var i = 0; i < POPS.length; i++) {
        var p = POPS[i];
        if (!p.on) continue;
        var u = p.t / 0.9;
        var sc = u < 0.15 ? 0.6 + (u / 0.15) * 0.6 : 1.2 - Math.min(0.2, (u - 0.15) * 0.6);
        var fs = Math.round(clamp(Z * 0.55, 14, 30) * sc);
        g.font = '900 ' + fs + 'px system-ui,sans-serif';
        g.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
        var x = ox + p.x * Z, y = oy + (p.y - u * 0.8) * Z;
        x = clamp(x, 40, W - 40); y = clamp(y, 30, H - 30);
        g.lineWidth = 4; g.strokeStyle = 'rgba(10,10,20,0.85)';
        g.strokeText(p.text, x, y);
        g.fillStyle = p.c;
        g.fillText(p.text, x, y);
      }
      g.globalAlpha = 1;
    }

    function drawOffscreen(Z, ox, oy, usableH) {
      for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        if (!f.alive) continue;
        var x = ox + f.x * Z, y = oy + (f.y - BH / 2) * Z;
        if (x > 0 && x < W && y > 0 && y < usableH) continue;
        var cx = clamp(x, 22, W - 22), cy = clamp(y, 56, usableH - 22);
        var a = Math.atan2(y - cy, x - cx);
        g.save();
        g.translate(cx, cy);
        g.fillStyle = 'rgba(10,10,20,0.6)';
        g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
        g.fillStyle = f.col;
        g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
        g.rotate(a);
        g.beginPath(); g.moveTo(22, 0); g.lineTo(13, -7); g.lineTo(13, 7); g.closePath(); g.fill();
        g.restore();
      }
    }

    function drawHud() {
      if (!match) return;
      // top roster: one chip per fighter with win pips
      var n = fighters.length;
      var narrow = W < 520;
      var cw = narrow ? Math.min(78, (W - 64 - (n - 1) * 6) / n) : 120, ch = 30, gap = 6;
      var total = n * cw + (n - 1) * gap;
      var x0 = Math.max(58, (W - total) / 2), y0 = 10;
      if (x0 + total > W - 6) x0 = W - 6 - total;
      g.textBaseline = 'middle';
      for (var i = 0; i < n; i++) {
        var f = fighters[i];
        var x = x0 + i * (cw + gap);
        g.globalAlpha = f.alive || state !== 'fight' ? 1 : 0.45;
        g.fillStyle = 'rgba(5,6,14,0.62)';
        roundRectS(x, y0, cw, ch, 15); g.fill();
        g.fillStyle = f.col;
        g.beginPath(); g.arc(x + 15, y0 + ch / 2, 8, 0, TAU); g.fill();
        if (!narrow) {
          g.font = '800 12px system-ui,sans-serif';
          g.textAlign = 'left';
          g.fillStyle = '#fff';
          g.fillText(f.name, x + 28, y0 + ch / 2 - 5);
        }
        // pips
        var pr = narrow ? 3 : 3.5, pg = narrow ? 8 : 9;
        var px = narrow ? x + 29 : x + 31, py = narrow ? y0 + ch / 2 : y0 + ch / 2 + 7;
        var maxP = match.first;
        var perRow = narrow ? Math.max(1, Math.floor((cw - 32) / pg)) : 9;
        for (var k = 0; k < maxP; k++) {
          var row = Math.floor(k / perRow), colI = k % perRow;
          g.fillStyle = k < f.wins ? '#ffd23f' : 'rgba(255,255,255,0.22)';
          g.beginPath(); g.arc(px + colI * pg, py + row * 7 - (narrow && maxP > perRow ? 3.5 : 0), pr, 0, TAU); g.fill();
        }
      }
      g.globalAlpha = 1;
      // round info
      g.font = '700 11px system-ui,sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(255,255,255,0.75)';
      var info = 'Round ' + round + ' · first to ' + match.first;
      if (state === 'fight' && roundT > 35 && roundT < 45) info = 'Sudden death in ' + Math.ceil(45 - roundT);
      g.fillText(info, W / 2, y0 + ch + 12);
    }
    function roundRectS(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    function drawBanner() {
      if (!banner) return;
      var u = banner.t / banner.max;
      if (u >= 1) { banner = null; return; }
      var sc = u < 0.12 ? 0.5 + (u / 0.12) * 0.5 : 1;
      var a = u > 0.8 ? (1 - u) / 0.2 : 1;
      var fs = Math.round(clamp(Math.min(W * 0.085, H * 0.11), 26, 64) * sc);
      g.save();
      g.globalAlpha = a;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '900 ' + fs + 'px system-ui,sans-serif';
      var y = H * 0.36;
      var tw = Math.min(W - 20, g.measureText(banner.text).width);
      g.fillStyle = 'rgba(5,6,14,0.5)';
      g.fillRect(0, y - fs * 0.85, W, fs * (banner.sub ? 2.35 : 1.7));
      g.lineWidth = Math.max(3, fs * 0.1);
      g.strokeStyle = 'rgba(10,10,20,0.9)';
      g.strokeText(banner.text, W / 2, y, W - 20);
      g.fillStyle = banner.c;
      g.fillText(banner.text, W / 2, y, W - 20);
      if (banner.sub) {
        g.font = '800 ' + Math.round(fs * 0.38) + 'px system-ui,sans-serif';
        g.fillStyle = '#fff';
        g.fillText(banner.sub, W / 2, y + fs * 0.85, W - 20);
      }
      g.restore();
      void tw;
    }

    /* ------------------------------------------------------------------ */
    /* Menus                                                               */
    /* ------------------------------------------------------------------ */
    function closeOverlay() { if (overlay) overlay.close(); overlay = null; menuKeys = null; }

    function chipRow(label, opts, cur, onPick) {
      var sec = ui.el('div', 'sb-sec');
      sec.appendChild(ui.el('div', 'sb-lab', label));
      var row = ui.el('div', 'sb-row');
      opts.forEach(function (o) {
        var b = ui.el('button', 'sb-chip' + (o.v === cur ? ' sel' : ''), o.l + (o.s ? '<small>' + o.s + '</small>' : ''));
        b.type = 'button';
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          ctx.sfx('click');
          onPick(o.v);
        });
        row.appendChild(b);
      });
      sec.appendChild(row);
      return sec;
    }

    function showMenu() {
      closeOverlay();
      if (!attract || state === 'over') newMatch(true);
      syncTouch();
      var body = ui.el('div', '');
      body.appendChild(chipRow('Mode', [{ v: 1, l: '1 Player', s: 'vs CPU' }, { v: 2, l: '2 Players', s: 'one keyboard' }], saved.mode, function (v) { saved.mode = v; persist(); showMenu(); }));
      if (saved.mode === 1) body.appendChild(chipRow('CPU fighters', [{ v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3' }], saved.bots1, function (v) { saved.bots1 = v; persist(); showMenu(); }));
      else body.appendChild(chipRow('Extra CPU fighters', [{ v: 0, l: 'None' }, { v: 1, l: '1' }, { v: 2, l: '2' }], saved.bots2, function (v) { saved.bots2 = v; persist(); showMenu(); }));
      if (saved.mode === 1 || saved.bots2 > 0) body.appendChild(chipRow('CPU skill', [{ v: 0, l: 'Easy' }, { v: 1, l: 'Normal' }, { v: 2, l: 'Hard' }], saved.diff, function (v) { saved.diff = v; persist(); showMenu(); }));
      body.appendChild(chipRow('Match', [{ v: 3, l: 'First to 3' }, { v: 5, l: 'First to 5' }], saved.first, function (v) { saved.first = v; persist(); showMenu(); }));
      var keys = ui.el('div', 'sb-keys');
      keys.innerHTML = saved.mode === 1
        ? '<kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd> move · <kbd>W</kbd> / <kbd>↑</kbd> / <kbd>Space</kbd> jump (twice to double-jump) · <kbd>S</kbd> drop · <kbd>J</kbd> or <kbd>F</kbd> punch / use weapon · <kbd>K</kbd> or <kbd>G</kbd> kick'
        : '<b style="color:' + COLORS[0].c + '">P1</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> + <kbd>F</kbd> punch, <kbd>G</kbd> kick · <b style="color:' + COLORS[1].c + '">P2</b> arrows + <kbd>K</kbd> punch, <kbd>L</kbd> kick';
      body.appendChild(keys);
      if (saved.wins || saved.losses) body.appendChild(ui.el('div', 'sb-stat', 'Your record vs CPU: <b style="color:#fff">' + saved.wins + '–' + saved.losses + '</b> · KOs <b style="color:#fff">' + saved.kos + '</b> · best streak <b style="color:#ffd23f">' + saved.bestStreak + '</b>'));
      overlay = ui.overlay(root, {
        title: TITLE,
        text: 'Punch, kick and blast the other sticks off the arena. Grab the crates that fall from the sky. Last stick standing wins.',
        buttons: [{ label: '▶ Fight!', primary: true, onClick: startMatch }],
      });
      overlay.panel.classList.add('sb-panel');
      overlay.panel.insertBefore(body, overlay.panel.querySelector('.ig-actions'));
    }

    function startMatch() {
      closeOverlay();
      newMatch(false);
      ctx.focus();
    }

    function endMatch(champ) {
      state = 'over';
      match.over = true;
      syncTouch();
      var humanWon = champ.human > 0;
      if (match.mode === 1) {
        if (humanWon) { saved.wins++; saved.streak++; saved.bestStreak = Math.max(saved.bestStreak, saved.streak); }
        else { saved.losses++; saved.streak = 0; }
      }
      persist();
      sfx(humanWon || match.mode === 2 ? 'win' : 'lose');
      // confetti
      for (var i = 0; i < 60; i++) part(5, cam.x + rand(-8, 8), cam.y - rand(4, 9), rand(-2, 2), rand(0, 3), rand(1.5, 3), rand(0.08, 0.14), COLORS[i % 4].c);
      var rows = fighters.slice().sort(function (a, b) { return b.wins - a.wins || b.kos - a.kos; }).map(function (f) {
        return '<tr class="' + (f === champ ? 'win' : '') + '"><td><span class="sb-dot" style="background:' + f.col + '"></span>' + f.name + (f === champ ? ' 🏆' : '') + '</td><td>' + f.wins + '</td><td>' + f.kos + '</td><td>' + f.falls + '</td></tr>';
      }).join('');
      var title = match.mode === 1 ? (humanWon ? 'You win the match!' : champ.name + ' wins the match') : champ.name + ' wins the match!';
      var html = '<table class="sb-table"><thead><tr><th>Fighter</th><th>Rounds</th><th>KOs</th><th>Lost</th></tr></thead><tbody>' + rows + '</tbody></table>';
      if (match.mode === 1) html += '<div class="sb-stat">Record vs CPU <b style="color:#fff">' + saved.wins + '–' + saved.losses + '</b> · win streak <b style="color:#ffd23f">' + saved.streak + '</b> (best ' + saved.bestStreak + ')</div>';
      overlay = ui.overlay(root, {
        title: title,
        html: html,
        buttons: [
          { label: '↻ Rematch', primary: true, onClick: startMatch },
          { label: 'Change setup', onClick: function () { showMenu(); } },
        ],
      });
      overlay.panel.classList.add('sb-panel');
    }

    function pauseGame() {
      if (attract || state === 'paused' || state === 'over') return;
      pausedFrom = state;
      state = 'paused';
      syncTouch();
      closeOverlay();
      overlay = ui.overlay(root, {
        title: 'Paused',
        text: 'Round ' + round + ' · ' + A.name,
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: 'Quit to menu', onClick: function () { closeOverlay(); state = 'over'; showMenu(); } },
        ],
      });
    }
    function resumeGame() {
      closeOverlay();
      state = pausedFrom || 'fight';
      syncTouch();
      ctx.focus();
    }

    /* ------------------------------------------------------------------ */
    /* Input wiring                                                        */
    /* ------------------------------------------------------------------ */
    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyJ', 'KeyK', 'KeyL', 'KeyP', 'Enter', 'Escape', 'Numpad1', 'Numpad2']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (overlay) {
        if (code === 'Enter' || code === 'Space') {
          var a = document.activeElement;
          if (a && overlay.el.contains(a) && (a.classList.contains('ig-btn') || a.classList.contains('sb-chip'))) a.click();
          else { var pb = overlay.panel.querySelector('.ig-actions .ig-btn'); if (pb) pb.click(); }
        } else if ((code === 'Escape' || code === 'KeyP') && state === 'paused') resumeGame();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') { pauseGame(); return; }
      if (attract || !match) return;
      if (match.mode === 1) {
        if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') humanBuf(1, 'jump');
        else if (code === 'KeyF' || code === 'KeyJ') humanBuf(1, 'atk');
        else if (code === 'KeyG' || code === 'KeyK') humanBuf(1, 'kick');
      } else {
        if (code === 'KeyW') humanBuf(1, 'jump');
        else if (code === 'KeyF') humanBuf(1, 'atk');
        else if (code === 'KeyG') humanBuf(1, 'kick');
        else if (code === 'ArrowUp') humanBuf(2, 'jump');
        else if (code === 'KeyK' || code === 'Numpad1') humanBuf(2, 'atk');
        else if (code === 'KeyL' || code === 'Numpad2') humanBuf(2, 'kick');
      }
    });

    function onPointerDown(e) {
      if (e.pointerType !== 'mouse') {
        if (!touchOn) { touchOn = true; syncTouch(); }
        return;
      }
      if (attract || overlay || !match || match.mode !== 1) return;
      if (e.button === 0) humanBuf(1, 'atk');
      else if (e.button === 2) humanBuf(1, 'kick');
    }
    function onCtxMenu(e) { e.preventDefault(); }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('contextmenu', onCtxMenu);

    /* ------------------------------------------------------------------ */
    /* Main loop                                                           */
    /* ------------------------------------------------------------------ */
    var frames = 0;
    var dbg = { deaths: 0, self: 0, causes: {} };
    var loop = IGAME.loop(function (dt) {
      frames++;
      time += dt;
      if (state !== 'paused') {
        if (banner) banner.t += dt;
        if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
        if (slowT > 0) { slowT -= dt; timeScale = slowT > 0 ? 0.35 : 1; }
        if (hitstop > 0) hitstop -= dt;
        else {
          acc += dt * timeScale;
          var n = 0;
          while (acc >= STEP && n < 4) { step(); acc -= STEP; n++; }
          if (n >= 4) acc = 0;
        }
        updateParticles(dt * (hitstop > 0 ? 0.2 : timeScale));
        if (A) updateCam(dt);
      }
      render();
    });

    newMatch(true);
    showMenu();
    loop.start();

    if (ctx.debug) {
      window.__stickBrawl = {
        info: function () {
          return {
            state: state, round: round, arena: A && A.id, t: roundT, frames: frames, hitstop: hitstop, acc: acc, ts: timeScale, running: loop.isRunning(),
            fighters: fighters.map(function (f) { return { name: f.name, x: +f.x.toFixed(2), y: +f.y.toFixed(2), hp: Math.round(f.hp), alive: f.alive, wins: f.wins, weapon: f.weapon && f.weapon.id }; }),
            items: items.length, shots: shots.length, dbg: dbg,
          };
        },
        arena: function (id) { for (var i = 0; i < ARENAS.length; i++) if (ARENAS[i].id === id) { arenaOrder = [i]; arenaIdx = 0; } },
        give: function (wid) { if (fighters[0]) fighters[0].weapon = { id: wid, ammo: WEAPONS[wid].ammo }; },
        hurt: function (i, d) { var f = fighters[i]; if (f) hurt(f, fighters[0], d, 10, -6, 'debug'); },
        crate: spawnCrate,
        koBots: function () { fighters.forEach(function (f) { if (!f.human) kill(f, 'ko'); }); },
        koHumans: function () { fighters.forEach(function (f) { if (f.human) kill(f, 'fall'); }); },
      };
    }

    return {
      pause: function () {
        if (state === 'fight' || state === 'intro' || state === 'roundEnd') pauseGame();
        loop.stop();
      },
      resume: function () { loop.start(); },
      destroy: function () {
        loop.stop();
        closeOverlay();
        persist();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('contextmenu', onCtxMenu);
        pauseBtn.removeEventListener('click', onPauseClick);
        pauseBtn.removeEventListener('pointerdown', stopProp);
        view.destroy();
        if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        if (touchWrap.parentNode) touchWrap.parentNode.removeChild(touchWrap);
        if (pauseBtn.parentNode) pauseBtn.parentNode.removeChild(pauseBtn);
        if (ctx.debug) delete window.__stickBrawl;
      },
    };
  });
})();
