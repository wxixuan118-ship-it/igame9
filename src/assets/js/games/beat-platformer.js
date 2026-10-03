/*!
 * igame9 — "beat-platformer" engine (Offbeat)
 * Minimalist rhythm platformer. An original electronic loop is synthesized
 * with WebAudio at 140 BPM; every obstacle runs on the same clock (songT), so
 * platforms blink in and out, step along paths, lasers fire and spikes pop on
 * the beat. Each checkpoint adds a music layer and shifts the colours. Every
 * level ends with a boss that attacks on the beat; touch its orbs to break it.
 *
 * World units are tiles, y grows downward. Level grid: 1 = solid, 2 = spike.
 * Timed objects: pulse (solid on some beats), mover (steps along a path each
 * beat), laser (vertical beam), piston (spikes that pop up), pad (launches on
 * the beat). Patterns: `on` lists active slots of a cycle of `per` slots,
 * slot = floor(songT / BEAT * sub) (sub 1 = quarter notes, 2 = eighths).
 */
(function () {
  'use strict';

  var BPM = 140, BEAT = 60 / BPM, STEP = BEAT / 4;
  var H = 14;
  var PW = 0.78, PH = 0.78;
  var RUN = 7.5, ACC_G = 70, ACC_A = 45, GRAV = 80, JUMPV = 17, PADV = 30, MAXFALL = 30;
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mod(a, n) { return ((a % n) + n) % n; }
  function hsl(h, s, l) { return 'hsl(' + mod(Math.round(h), 360) + ',' + s + '%,' + l + '%)'; }

  /* ------------------------------------------------------------------ */
  /* Level builder                                                      */
  /* ------------------------------------------------------------------ */
  var B = null;
  function L(name, w, hue, setFn) {
    B = { name: name, w: w, hue: hue, grid: new Uint8Array(w * H), pulses: [], movers: [], lasers: [], pistons: [], pads: [], checks: [], arena: 0, attacks: [] };
    setFn();
    var lv = B;
    B = null;
    return lv;
  }
  function fill(x0, y0, x1, y1, v) {
    for (var y = Math.max(0, y0); y < Math.min(H, y1); y++) for (var x = Math.max(0, x0); x < Math.min(B.w, x1); x++) B.grid[y * B.w + x] = v;
  }
  function ground(x0, x1, top) { fill(x0, top == null ? 11 : top, x1, H, 1); }
  function block(x0, y0, x1, y1) { fill(x0, y0, x1, y1, 1); }
  function spikes(x0, x1, y) { fill(x0, y, x1, y + 1, 2); }
  function pulse(x, y, w, h, on, per, sub) { B.pulses.push({ x: x, y: y, w: w, h: h, on: on, per: per, sub: sub || 1, act: false, ign: false }); }
  function mover(x, y, w, h, path, sub) { B.movers.push({ bx: x, by: y, x: x, y: y, px: x, py: y, w: w, h: h, path: path, sub: sub || 1 }); }
  function laser(x, y0, y1, on, per, sub) { B.lasers.push({ x: x, y0: y0, y1: y1, on: on, per: per, sub: sub || 1 }); }
  function piston(x0, x1, y, on, per, sub) { B.pistons.push({ x0: x0, x1: x1, y: y, on: on, per: per, sub: sub || 1 }); }
  function pad(x, y) { B.pads.push({ x: x, y: y, fire: 0 }); }
  function check(x, y) { B.checks.push({ x: x, y: y }); }
  function hpath(n) { var p = []; for (var i = 0; i <= n; i++) p.push([i, 0]); return p; }
  function vpath(n) { var p = []; for (var i = 0; i <= n; i++) p.push([0, -i]); return p; }
  function arena(x0, attacks) {
    B.arena = x0;
    B.attacks = attacks;
    ground(x0, x0 + 22, 11);
    block(x0 + 22, 0, x0 + 24, H);
    block(x0 + 4, 7, x0 + 7, 8);
    block(x0 + 15, 7, x0 + 18, 8);
  }

  var LEVELS = [
    L('Downbeat', 200, 192, function () {
      ground(0, 14); ground(17, 26); ground(30, 34);
      pulse(26, 11, 4, 1, [0, 1], 4);
      pulse(35, 10, 2, 1, [0, 1], 4); pulse(38, 10, 2, 1, [2, 3], 4);
      ground(41, 48); check(46, 10);
      ground(48, 60); spikes(52, 54, 10);
      mover(60, 10, 3, 1, vpath(4));
      block(64, 6, 72, 7);
      ground(72, 90); piston(76, 79, 10, [0, 2], 4); piston(82, 85, 10, [1, 3], 4);
      check(88, 10);
      ground(90, 94);
      pulse(95, 10, 2, 1, [0, 1], 4); pulse(98, 9, 2, 1, [1, 2], 4); pulse(101, 8, 2, 1, [2, 3], 4); pulse(104, 9, 2, 1, [3, 0], 4); pulse(107, 10, 2, 1, [0, 1], 4);
      ground(110, 135); piston(115, 119, 10, [0, 1], 4); piston(124, 128, 10, [2, 3], 4);
      check(132, 10);
      ground(135, 140); mover(140, 10, 3, 1, hpath(15));
      ground(158, 176); pulse(165, 7, 1, 4, [0, 1], 4);
      check(172, 10);
      arena(176, ['drop', 'wave']);
    }),
    L('Backbeat', 196, 320, function () {
      ground(0, 30); laser(16, 0, 11, [1, 3], 4); laser(22, 0, 11, [1, 3], 4);
      ground(34, 44); check(42, 10);
      ground(44, 51); pad(50, 10);
      block(52, 6, 60, 7); laser(57, 0, 6, [1, 3], 4);
      ground(62, 84); piston(66, 69, 10, [1, 3], 4); laser(74, 0, 11, [0, 2], 4); spikes(78, 80, 10);
      check(82, 10);
      ground(84, 88);
      pulse(89, 10, 3, 1, [0, 1], 4); pulse(94, 10, 3, 1, [2, 3], 4); pulse(99, 10, 3, 1, [0, 1], 4);
      ground(104, 124); laser(108, 0, 11, [1, 3], 4); laser(112, 0, 11, [0, 2], 4); laser(116, 0, 11, [1, 3], 4);
      check(122, 10);
      ground(124, 129); pad(128, 10);
      block(131, 7, 135, 8); pad(134, 6);
      block(138, 5, 142, 6);
      ground(144, 172); laser(152, 0, 11, [1, 3], 4); piston(158, 162, 10, [0, 2], 4);
      check(168, 10);
      arena(172, ['drop', 'beam']);
    }),
    L('Offbeat', 196, 42, function () {
      ground(0, 26); piston(13, 15, 10, [3, 4, 5, 6, 7], 8, 2); piston(20, 22, 10, [0, 1, 2, 7], 8, 2);
      pulse(26, 11, 4, 1, [2, 3, 4, 5], 8, 2);
      ground(30, 48); laser(36, 0, 11, [1, 2, 5, 6], 8, 2);
      check(44, 10);
      mover(48, 10, 2, 1, hpath(16), 2);
      ground(66, 80); spikes(70, 72, 10); pulse(75, 7, 1, 4, [0, 1, 2, 3], 8, 2);
      check(78, 10);
      ground(80, 84);
      pulse(85, 10, 2, 1, [0, 1, 2], 8, 2); pulse(88, 9, 2, 1, [3, 4, 5], 8, 2); pulse(91, 10, 2, 1, [6, 7, 0], 8, 2); pulse(94, 9, 2, 1, [1, 2, 3], 8, 2); pulse(97, 10, 2, 1, [4, 5, 6], 8, 2);
      ground(100, 130); laser(104, 0, 11, [0, 1, 2], 8, 2); laser(110, 0, 11, [4, 5, 6], 8, 2); piston(116, 118, 10, [3, 7], 8, 2);
      check(122, 10);
      mover(130, 10, 3, 1, hpath(9));
      pulse(143, 10, 3, 1, [0, 1, 2, 3], 8, 2);
      ground(147, 172); laser(152, 0, 11, [2, 3, 6, 7], 8, 2); spikes(158, 160, 10); piston(163, 165, 10, [0, 4], 8, 2);
      check(168, 10);
      arena(172, ['wave', 'beam', 'drop']);
    }),
    L('Overdrive', 196, 268, function () {
      ground(0, 20); laser(13, 0, 11, [1], 2); laser(17, 0, 11, [0], 2);
      ground(24, 33); pad(32, 10);
      block(34, 6, 39, 7);
      ground(41, 50); piston(44, 47, 10, [1], 2);
      check(48, 10);
      pulse(53, 10, 2, 1, [0, 1], 4); pulse(56, 9, 2, 1, [1, 2], 4); pulse(59, 8, 2, 1, [2, 3], 4); pulse(62, 9, 2, 1, [3, 0], 4); pulse(65, 10, 2, 1, [0, 1], 4);
      ground(68, 90); laser(72, 0, 11, [0, 1], 4); piston(76, 79, 10, [2, 3], 4); laser(83, 0, 11, [2, 3], 4);
      check(88, 10);
      ground(90, 94); mover(94, 10, 2, 1, vpath(5));
      block(97, 5, 110, 6); laser(101, 0, 5, [1, 3], 4); laser(105, 0, 5, [0, 2], 4);
      ground(110, 130); pad(113, 10); spikes(115, 118, 10); piston(120, 123, 10, [0, 1], 4); laser(126, 0, 11, [1, 3], 4);
      check(128, 10);
      ground(130, 134); mover(134, 10, 3, 1, hpath(15));
      ground(152, 172); piston(156, 160, 10, [1, 3], 4); laser(164, 0, 11, [0, 2], 4);
      check(168, 10);
      arena(172, ['drop', 'wave', 'beam']);
    }),
  ];
  var LAYER_NAMES = ['Drums', 'Bass', 'Arpeggio', 'Claps & hats', 'Lead'];
  var BOSS_NAMES = ['Tick Core', 'Snare Prism', 'Swing Engine', 'Overclock'];

  /* ------------------------------------------------------------------ */
  /* Music (original loops; chords are semitone offsets from the root)  */
  /* ------------------------------------------------------------------ */
  var SONGS = [
    { root: 57, chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 4, 3, 2, 1], bass: [0, 0, 12, 0, 0, 0, 12, 0], kick: [0, 4, 8, 12], lead: [7, -1, 5, 3, -1, 0, -1, 3, 5, -1, 7, 10, -1, 7, 5, 3] },
    { root: 50, chords: [[0, 3, 7], [-2, 2, 5], [3, 7, 10], [-5, -1, 2]], arp: [0, 2, 1, 3, 2, 4, 3, 5, 0, 2, 1, 3, 2, 4, 3, 5], bass: [0, 12, 0, 12, 0, 12, 7, 12], kick: [0, 4, 8, 12], lead: [12, -1, 10, -1, 7, -1, 10, 12, 15, -1, 12, -1, 10, 7, -1, 5] },
    { root: 52, chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], arp: [0, -1, 1, 2, -1, 3, 2, -1, 4, -1, 3, 2, -1, 1, 2, -1], bass: [0, -1, 0, 12, -1, 0, 12, -1], kick: [0, 6, 8, 11], lead: [3, -1, -1, 7, -1, -1, 5, -1, 3, -1, 2, -1, 0, -1, -1, 2] },
    { root: 54, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], arp: [0, 3, 1, 4, 2, 5, 3, 4, 0, 3, 1, 4, 2, 5, 4, 3], bass: [0, 12, 0, 12, 0, 12, 0, 12], kick: [0, 4, 8, 12], lead: [15, 14, 12, -1, 10, -1, 12, 14, 15, -1, 19, -1, 17, 15, 14, 12] },
  ];
  var SCALE = [0, 2, 3, 5, 7, 8, 10];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var CSS = [
    '.bp-hud{position:absolute;inset:0;pointer-events:none;z-index:4;font-family:var(--font);display:none}',
    '.bp-hud.on{display:block}',
    '.bp-tl{position:absolute;left:10px;top:10px;display:flex;gap:6px;flex-wrap:wrap;max-width:52%}',
    '.bp-tr{position:absolute;right:10px;top:10px;display:flex;gap:8px;align-items:center}',
    '.bp-hud .ig-pill{font-size:1em}',
    '.bp-beats{position:absolute;left:50%;top:16px;transform:translateX(-50%);display:flex;gap:7px}',
    '.bp-beats i{display:block;width:.7em;height:.7em;border-radius:3px;background:rgba(255,255,255,.25);transition:transform .08s}',
    '.bp-beats i.on{background:#fff;transform:scale(1.35)}',
    '.bp-btn{pointer-events:auto;cursor:pointer;width:2.6em;height:2.6em;display:grid;place-items:center;padding:0!important;color:#fff}',
    '.bp-btn svg{width:1.05em;height:1.05em}',
    '.bp-btn.off{opacity:.5}',
    '.bp-touch{position:absolute;left:0;right:0;bottom:0;display:none;justify-content:space-between;align-items:flex-end;padding:12px;pointer-events:none;z-index:5}',
    '.bp-touch.on{display:flex}',
    '.bp-tg{display:flex;gap:10px}',
    '.bp-tb{pointer-events:auto;width:64px;height:64px;border-radius:16px;border:2px solid rgba(255,255,255,.35);background:rgba(0,0,0,.28);color:#fff;display:grid;place-items:center;touch-action:none;-webkit-user-select:none;user-select:none}',
    '.bp-tb.on{background:rgba(255,255,255,.35)}',
    '.bp-tb svg{width:28px;height:28px}',
    '.bp-how{font-size:13px;color:var(--text-2);margin:0 0 12px}',
    '.bp-lv{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}',
    '.bp-lvb{font:800 15px var(--font);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.07);padding:9px 2px 7px;cursor:pointer;line-height:1.15;touch-action:manipulation}',
    '.bp-lvb small{display:block;font-size:10px;font-weight:700;color:var(--muted);margin-top:3px}',
    '.bp-lvb.done{border-color:rgba(93,255,157,.55)}',
    '.bp-lvb.done small{color:#5dff9d}',
    '.bp-lvb[disabled]{opacity:.35;cursor:not-allowed}',
    '.bp-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 12px}',
    '.bp-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:6px 8px}',
    '.bp-stat b{display:block;font-size:20px;color:#fff;line-height:1.2}',
    '.bp-stat span{font-size:12px;color:var(--muted)}',
    '.bp-sm .ig-panel{padding:14px 12px}',
    '.bp-sm .ig-title{font-size:22px;margin-bottom:4px}',
    '.bp-sm .ig-sub{font-size:13px;margin-bottom:8px}',
    '.bp-sm .bp-how{font-size:12px;margin-bottom:8px}',
    '.bp-sm .bp-lv{gap:5px}',
    '.bp-sm .bp-lvb{font-size:14px;padding:7px 1px 5px}',
    '.bp-sm .ig-btn{padding:10px 16px;font-size:15px}',
  ].join('\n');
  var SVG = {
    pause: '<svg viewBox="0 0 10 12"><rect x="1" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="6" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="currentColor"/><circle cx="17.5" cy="16" r="2.8" fill="currentColor"/></svg>',
    L: '<svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    R: '<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    J: '<svg viewBox="0 0 24 24"><path d="M4 16 12 8l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  IGAME.register('beat-platformer', function (ctx) {
    var root = ctx.root, store = ctx.store, R = Math.random;
    var destroyed = false;
    var GOD = ctx.debug && ctx.params.get('god') === '1';

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var VW = 1, VH = 1, UI = 1, S = 40, hud = null, touchBar = null, tbs = [];
    var view = IGAME.createCanvas(root, { onResize: layout });
    var g = view.ctx, canvas = view.canvas;

    /* ---------- persistence ---------- */
    var unlocked = clamp(store.get('unlocked', 0) | 0, 0, LEVELS.length - 1);
    var bestDeaths = store.get('bestDeaths', null);
    if (!bestDeaths || typeof bestDeaths !== 'object') bestDeaths = {};
    var musicOn = store.get('music', true) !== false;

    /* ---------- HUD ---------- */
    hud = IGAME.ui.el('div', 'bp-hud');
    hud.innerHTML =
      '<div class="bp-tl"><div class="ig-pill bp-lvname">Level 1</div><div class="ig-pill bp-deaths">✖ 0</div></div>' +
      '<div class="bp-beats"><i></i><i></i><i></i><i></i></div>' +
      '<div class="bp-tr"><button type="button" class="ig-pill bp-btn bp-music" aria-label="Music on/off" title="Music (M)">' + SVG.note + '</button><button type="button" class="ig-pill bp-btn bp-pause" aria-label="Pause" title="Pause (P)">' + SVG.pause + '</button></div>';
    root.appendChild(hud);
    var hudName = hud.querySelector('.bp-lvname'), hudDeaths = hud.querySelector('.bp-deaths');
    var hudBeats = hud.querySelectorAll('.bp-beats i');
    var btnMusic = hud.querySelector('.bp-music'), btnPause = hud.querySelector('.bp-pause');
    function onMusicBtn(e) { e.stopPropagation(); toggleMusic(); }
    function onPauseBtn(e) { e.stopPropagation(); if (state === 'play') pauseGame(); }
    btnMusic.addEventListener('click', onMusicBtn);
    btnPause.addEventListener('click', onPauseBtn);
    btnMusic.classList.toggle('off', !musicOn);

    touchBar = IGAME.ui.el('div', 'bp-touch');
    touchBar.innerHTML = '<div class="bp-tg"><button type="button" class="bp-tb" data-b="L" aria-label="Move left">' + SVG.L + '</button><button type="button" class="bp-tb" data-b="R" aria-label="Move right">' + SVG.R + '</button></div><button type="button" class="bp-tb" data-b="J" aria-label="Jump">' + SVG.J + '</button>';
    root.appendChild(touchBar);
    tbs = touchBar.querySelectorAll('.bp-tb');
    var btnHold = { L: 0, R: 0, J: 0 };
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

    layout(VW, VH);
    function layout(w, h) {
      VW = w; VH = h; UI = Math.min(w, h);
      if (hud) {
        hud.style.fontSize = clamp(Math.round(UI / 30), 12, 18) + 'px';
        var bt = hud.querySelector('.bp-beats');
        // on narrow frames the beat dots move under the level pills
        if (w < 600) { bt.style.left = '12px'; bt.style.top = '4.2em'; bt.style.transform = 'none'; }
        else { bt.style.left = ''; bt.style.top = ''; bt.style.transform = ''; }
      }
      var bs = clamp(Math.round(UI / 7), 54, 76);
      Array.prototype.forEach.call(tbs, function (b) { b.style.width = b.style.height = bs + 'px'; });
      if (overlay) fitOverlay();
    }

    /* ---------- state ---------- */
    var state = 'menu'; // menu | play | paused | dying | won
    var overlay = null, overlayKind = '';
    var time = 0, songT = 0, lvlT = 0, deadT = 0, overAt = -9;
    var lvIdx = 0, lv = LEVELS[0], grid = lv.grid, LW = lv.w;
    var p = { x: 2, y: 10.2, vx: 0, vy: 0, ground: false, gobj: null, coyote: 0, jbuf: 0, cut: false, face: 1, sq: 0 };
    var deaths = 0, lastCheck = -1, layer = 0, section = 0;
    var camX = 10, camY = 7, camS = 40, shake = 0, flash = 0, beatIdx = -1, beatPulse = 0;
    var boss = null; // {phase, hits, t0, orb, attacks[], dead, wall, grace}
    var dyn = []; // solid rects this frame
    var dbgView = null;

    /* ---------- palettes per level + section ---------- */
    var PAL = {};
    function setPalette(sec) {
      var h0 = lv.hue + sec * 26, bossy = sec >= 4;
      PAL.bg = hsl(h0, bossy ? 40 : 52, bossy ? 10 : 15);
      PAL.bg2 = hsl(h0 + 18, 50, bossy ? 16 : 21);
      PAL.solid = hsl(h0 + 165, 78, 60);
      PAL.top = hsl(h0 + 165, 90, 78);
      PAL.side = hsl(h0 + 165, 60, 44);
      PAL.accent = hsl(h0 + 95, 92, 64);
      PAL.accentDim = hsl(h0 + 95, 60, 40);
      PAL.mover = hsl(h0 + 230, 85, 70);
      PAL.laser = hsl(h0 + 300, 100, 65);
    }

    /* ------------------------------------------------------------------ */
    /* Audio: own context for the music, synced to songT                  */
    /* ------------------------------------------------------------------ */
    var ac = null, master = null, musicGain = null, delayIn = null, noiseBuf = null, nextStep = 0, curGain = -1;
    function audioInit() {
      if (ac || destroyed) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ac = new AC();
        master = ac.createDynamicsCompressor();
        master.connect(ac.destination);
        musicGain = ac.createGain();
        musicGain.gain.value = 0;
        musicGain.connect(master);
        var dl = ac.createDelay(1);
        dl.delayTime.value = STEP * 3;
        var fb = ac.createGain();
        fb.gain.value = 0.32;
        var wet = ac.createGain();
        wet.gain.value = 0.3;
        delayIn = ac.createGain();
        delayIn.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(musicGain);
        var len = Math.floor(ac.sampleRate * 0.5);
        noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = R() * 2 - 1;
      } catch (e) { ac = null; }
    }
    function musicLevel() { return musicOn && !IGAME.isMuted() && (state === 'play' || state === 'dying') ? 0.55 : 0; }
    function syncGain() {
      if (!ac) return;
      var v = musicLevel();
      if (v !== curGain) { curGain = v; try { musicGain.gain.setTargetAtTime(v, ac.currentTime, 0.04); } catch (e) {} }
    }
    function env(gn, t, a, peak, dec) {
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(peak, t + a);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    }
    function vKick(t) {
      var o = ac.createOscillator(), gn = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(gn, t, 0.004, 0.9, 0.28);
      o.connect(gn); gn.connect(musicGain);
      o.start(t); o.stop(t + 0.32);
    }
    function vNoise(t, type, f, q, peak, dec) {
      var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
      s.buffer = noiseBuf;
      fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      env(gn, t, 0.002, peak, dec);
      s.connect(fl); fl.connect(gn); gn.connect(musicGain);
      s.start(t, R() * 0.3); s.stop(t + dec + 0.02);
    }
    function vTone(t, midi, type, dur, peak, cut, send) {
      var o = ac.createOscillator(), fl = ac.createBiquadFilter(), gn = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(mtof(midi), t);
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut * 2.2, t); fl.frequency.exponentialRampToValueAtTime(cut, t + dur);
      env(gn, t, 0.006, peak, dur);
      o.connect(fl); fl.connect(gn); gn.connect(musicGain);
      if (send) gn.connect(delayIn);
      o.start(t); o.stop(t + dur + 0.05);
    }
    // one 16th-note step of the loop; layers stack as checkpoints are reached
    function playStep(s, t) {
      var song = SONGS[lvIdx], st = s % 16, bar = Math.floor(s / 16);
      var ch = song.chords[bar % 4], rt = song.root;
      if (song.kick.indexOf(st) >= 0) vKick(t);
      if (st % 4 === 2) vNoise(t, 'highpass', 7000, 0.7, 0.16, 0.05);
      if (layer >= 3 && st % 2 === 1) vNoise(t, 'highpass', 9000, 0.7, 0.06, 0.03);
      if (layer >= 1 && st % 2 === 0) {
        var bn = song.bass[(st / 2) | 0];
        if (bn >= 0) vTone(t, rt - 24 + ch[0] + bn, 'sawtooth', STEP * 1.7, 0.2, 420, false);
      }
      if (layer >= 2) {
        var ai = song.arp[st];
        if (ai >= 0) vTone(t, rt + ch[ai % 3] + 12 * Math.floor(ai / 3), 'square', STEP * 0.9, 0.05, 2600, true);
      }
      if (layer >= 3 && (st === 4 || st === 12)) vNoise(t, 'bandpass', 1500, 0.9, 0.45, 0.15);
      if (layer >= 4) {
        var li = song.lead[st];
        if (li >= 0) {
          var deg = SCALE[mod(li, 7)] + 12 * Math.floor(li / 7);
          vTone(t, rt + 12 + deg, 'triangle', STEP * 1.8, 0.11, 3200, true);
          vTone(t, rt + 12 + deg + 0.08, 'sawtooth', STEP * 1.6, 0.03, 1800, false);
        }
        if (st === 0) for (var c = 0; c < 3; c++) vTone(t, rt + ch[c], 'sawtooth', BEAT * 3.6, 0.025, 900, false);
      }
    }
    function scheduleMusic() {
      if (!ac || ac.state !== 'running') return;
      var lat = Math.min(0.03, ac.outputLatency || ac.baseLatency || 0);
      while (nextStep * STEP < songT + 0.12) {
        var at = ac.currentTime + (nextStep * STEP - songT) - lat;
        if (at >= ac.currentTime - 0.02 && curGain > 0) {
          try { playStep(nextStep, Math.max(ac.currentTime, at)); } catch (e) {}
        }
        nextStep++;
      }
    }
    function audioResume() { if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} } }
    function audioSuspend() { if (ac && ac.state === 'running') { try { ac.suspend(); } catch (e) {} } }
    function toggleMusic() {
      musicOn = !musicOn;
      store.set('music', musicOn);
      btnMusic.classList.toggle('off', !musicOn);
      toast(musicOn ? '♪ Music on' : 'Music off — the beat still runs');
    }

    /* ------------------------------------------------------------------ */
    /* Timing helpers                                                     */
    /* ------------------------------------------------------------------ */
    function slot(o, t) { return mod(Math.floor(((t == null ? songT : t) / BEAT) * o.sub), o.per); }
    function isOn(o, t) { return o.on.indexOf(slot(o, t)) >= 0; }
    // seconds (in slots) until the state flips — used for warning flicker
    function soonFlip(o) {
      var u = (songT / BEAT) * o.sub, f = u - Math.floor(u);
      if (f < 0.72) return false;
      return isOn(o) !== isOn(o, songT + (BEAT / o.sub) * 0.5);
    }
    function moverPos(m, t) {
      var u = (t / BEAT) * m.sub, i = Math.floor(u), f = u - i;
      var n = m.path.length, per = n > 1 ? 2 * n - 2 : 1;
      function at(k) { var q = mod(k, per); return m.path[q < n ? q : per - q]; }
      var a = at(i - 1), b = at(i), e = clamp(f / 0.35, 0, 1);
      e = e * e * (3 - 2 * e);
      m.x = m.bx + a[0] + (b[0] - a[0]) * e;
      m.y = m.by + a[1] + (b[1] - a[1]) * e;
    }

    /* ------------------------------------------------------------------ */
    /* Level flow                                                         */
    /* ------------------------------------------------------------------ */
    function loadLevel(i) {
      lvIdx = i; lv = LEVELS[i]; grid = lv.grid; LW = lv.w;
      songT = 0; nextStep = 0; lvlT = 0; deaths = 0; lastCheck = -1; layer = 0; section = 0;
      boss = null;
      setPalette(0);
      for (var k = 0; k < lv.movers.length; k++) { moverPos(lv.movers[k], 0); lv.movers[k].px = lv.movers[k].x; lv.movers[k].py = lv.movers[k].y; }
      for (k = 0; k < lv.pulses.length; k++) lv.pulses[k].ign = false;
      spawnAt(2, 10);
      camX = p.x; camY = 7; camS = targetScale();
      for (k = 0; k < PMAX; k++) parts[k].on = false;
    }
    function spawnAt(x, row) {
      p.x = x + 0.11; p.y = row + 1 - PH; p.vx = 0; p.vy = 0; p.ground = true; p.gobj = null; p.coyote = 0; p.jbuf = 0; p.sq = 0;
      p.face = 1;
    }
    function startLevel(i) {
      closeOverlay();
      audioInit();
      audioResume();
      loadLevel(i);
      state = 'play';
      hudLast = '';
      ctx.focus();
      ctx.sfx('levelup');
      toast('Level ' + (i + 1) + ' · ' + lv.name);
    }
    function respawn() {
      if (boss && boss.started) {
        spawnAt(lv.arena + 2, 10);
        boss.attacks.length = 0;
        boss.grace = 2;
        if (boss.orb) boss.orb.t = 0;
      } else if (lastCheck >= 0) {
        var c = lv.checks[lastCheck];
        spawnAt(c.x, c.y);
      } else spawnAt(2, 10);
      state = 'play';
    }
    function die() {
      if (state !== 'play' || GOD) return;
      state = 'dying';
      deadT = 0;
      deaths++;
      shake = 0.35;
      ctx.sfx('hit');
      burst(p.x + PW / 2, p.y + PH / 2, 22, '#ffffff');
      burst(p.x + PW / 2, p.y + PH / 2, 10, PAL.accent);
    }
    function reachCheck(i) {
      lastCheck = i;
      layer = Math.min(4, i + 1);
      section = i + 1;
      setPalette(section);
      flash = 0.35;
      ctx.sfx('win');
      var c = lv.checks[i];
      burst(c.x + 0.5, c.y - 1, 16, PAL.accent);
      toast(i === lv.checks.length - 1 ? 'Boss ahead · ' + BOSS_NAMES[lvIdx] : 'Checkpoint · + ' + LAYER_NAMES[layer]);
    }
    function levelWon() {
      state = 'won';
      overAt = time;
      ctx.sfx('win');
      var key = String(lvIdx), first = bestDeaths[key] == null;
      if (first || deaths < bestDeaths[key]) bestDeaths[key] = deaths;
      store.set('bestDeaths', bestDeaths);
      if (lvIdx + 1 > unlocked && lvIdx + 1 < LEVELS.length) { unlocked = lvIdx + 1; store.set('unlocked', unlocked); }
      showWon(first);
    }

    /* ------------------------------------------------------------------ */
    /* Input                                                              */
    /* ------------------------------------------------------------------ */
    ctx.captureKeys(['KeyA', 'KeyD', 'KeyW', 'KeyP', 'KeyM', 'Enter']);
    ctx.onKey(function (code, down) {
      if (destroyed) return;
      if (!down) {
        if ((code === 'Space' || code === 'ArrowUp' || code === 'KeyW') && !jumpHeld()) releaseJump();
        return;
      }
      if (code === 'KeyM') { toggleMusic(); return; }
      if (state === 'play' || state === 'dying') {
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
    function activateOverlay() {
      if (!overlay) return;
      var fe = document.activeElement;
      if (fe && fe.tagName === 'BUTTON' && overlay.el.contains(fe) && !fe.disabled) { fe.click(); return; }
      var b = overlay.el.querySelector('.ig-btn:not(.secondary)') || overlay.el.querySelector('.ig-btn');
      if (b) b.click();
    }
    function inputDir() {
      var k = ctx.keys, d = 0;
      if (k.ArrowLeft || k.KeyA || btnHold.L) d -= 1;
      if (k.ArrowRight || k.KeyD || btnHold.R) d += 1;
      return d;
    }
    function jumpHeld() { var k = ctx.keys; return !!(k.Space || k.ArrowUp || k.KeyW || btnHold.J); }
    function pressJump() { if (state === 'play') p.jbuf = 0.12; }
    function releaseJump() { if (p.vy < 0 && !p.cut) { p.vy *= 0.5; p.cut = true; } }
    // touch jump release
    function onTouchUpJ() { if (!jumpHeld()) releaseJump(); }
    Array.prototype.forEach.call(tbs, function (b) { if (b.getAttribute('data-b') === 'J') b.addEventListener('pointerup', onTouchUpJ); });

    /* ------------------------------------------------------------------ */
    /* Physics                                                            */
    /* ------------------------------------------------------------------ */
    function cell(x, y) {
      if (x < 0 || x >= LW) return 1;
      if (y < 0 || y >= H) return 0;
      return grid[y * LW + x];
    }
    function solidCell(x, y) { return cell(x, y) === 1; }
    function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }

    function buildDyn() {
      dyn.length = 0;
      var i, o;
      for (i = 0; i < lv.pulses.length; i++) {
        o = lv.pulses[i];
        o.act = isOn(o);
        if (!o.act) { o.ign = false; continue; }
        if (o.ign) {
          if (!overlap(p.x, p.y, PW, PH, o.x, o.y, o.w, o.h)) o.ign = false;
          else continue;
        }
        dyn.push(o);
      }
      for (i = 0; i < lv.movers.length; i++) {
        o = lv.movers[i];
        o.px = o.x; o.py = o.y;
        moverPos(o, songT);
        dyn.push(o);
      }
      if (boss && boss.wall) dyn.push(boss.wall);
    }
    // a pulse that blinks on around the player lifts it if it is near the top, otherwise lets it pass
    function settleDyn() {
      for (var i = 0; i < dyn.length; i++) {
        var o = dyn[i];
        if (!overlap(p.x, p.y, PW, PH, o.x, o.y, o.w, o.h)) continue;
        if (o.path) continue; // movers are handled by carry / push
        if (p.y + PH - o.y < 0.45 && p.vy >= -1) { p.y = o.y - PH; p.vy = 0; p.ground = true; }
        else if (o.on) { o.ign = true; dyn.splice(i, 1); i--; }
      }
    }
    function moveX(dx) {
      var nx = p.x + dx;
      var y0 = Math.floor(p.y + 0.01), y1 = Math.floor(p.y + PH - 0.01), ty;
      if (dx > 0) {
        var cx = Math.floor(nx + PW);
        for (ty = y0; ty <= y1; ty++) if (solidCell(cx, ty)) { nx = cx - PW - 0.001; p.vx = 0; break; }
      } else if (dx < 0) {
        var cx2 = Math.floor(nx);
        for (ty = y0; ty <= y1; ty++) if (solidCell(cx2, ty)) { nx = cx2 + 1.001; p.vx = 0; break; }
      }
      for (var i = 0; i < dyn.length; i++) {
        var o = dyn[i];
        if (!overlap(nx, p.y + 0.03, PW, PH - 0.06, o.x, o.y, o.w, o.h)) continue;
        if (nx + PW / 2 < o.x + o.w / 2) nx = o.x - PW - 0.001; else nx = o.x + o.w + 0.001;
        p.vx = 0;
      }
      p.x = nx;
    }
    function moveY(dy) {
      var ny = p.y + dy;
      var x0 = Math.floor(p.x + 0.01), x1 = Math.floor(p.x + PW - 0.01), tx;
      var landed = false, gobj = null;
      if (dy > 0) {
        var cy = Math.floor(ny + PH);
        for (tx = x0; tx <= x1; tx++) if (solidCell(tx, cy)) { ny = cy - PH; landed = true; break; }
      } else if (dy < 0) {
        var cy2 = Math.floor(ny);
        for (tx = x0; tx <= x1; tx++) if (solidCell(tx, cy2)) { ny = cy2 + 1; p.vy = 0; break; }
      }
      for (var i = 0; i < dyn.length; i++) {
        var o = dyn[i];
        if (!overlap(p.x, ny, PW, PH, o.x, o.y, o.w, o.h)) continue;
        if (dy >= 0 && p.y + PH <= o.y + 0.35 + (o.path ? Math.max(0, o.y - o.py) : 0)) { ny = o.y - PH; landed = true; gobj = o; }
        else if (dy < 0) { ny = o.y + o.h; p.vy = 0; }
      }
      p.y = ny;
      if (landed) {
        if (!p.ground && p.vy > 8) { p.sq = clamp(p.vy / 30, 0.2, 0.8); ctx.sfx({ f: 140, f2: 70, d: 0.06, type: 'triangle', v: 0.06 }); }
        p.vy = 0; p.ground = true; p.gobj = gobj;
      } else { p.ground = false; p.gobj = null; }
    }

    function stepPlay(dt) {
      lvlT += dt;
      buildDyn();
      // ride movers
      if (p.gobj && p.gobj.path) { p.x += p.gobj.x - p.gobj.px; p.y += p.gobj.y - p.gobj.py; }
      settleDyn();
      var dir = inputDir();
      if (dir) p.face = dir;
      var acc = p.ground ? ACC_G : ACC_A;
      var target = dir * RUN;
      if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
      if (p.jbuf > 0) p.jbuf -= dt;
      if (p.ground) p.coyote = 0.1; else if (p.coyote > 0) p.coyote -= dt;
      if (p.jbuf > 0 && p.coyote > 0) {
        p.vy = -JUMPV; p.ground = false; p.gobj = null; p.coyote = 0; p.jbuf = 0; p.cut = false;
        p.sq = -0.35;
        ctx.sfx('jump');
        burst(p.x + PW / 2, p.y + PH, 5, '#ffffff');
      }
      var gmul = p.vy < 0 && jumpHeld() && !p.cut ? 0.6 : 1;
      p.vy = Math.min(MAXFALL, p.vy + GRAV * gmul * dt);
      moveX(p.vx * dt);
      moveY(p.vy * dt);
      // pads launch on the beat
      if (beatTick && p.ground) {
        for (var i = 0; i < lv.pads.length; i++) {
          var pd = lv.pads[i];
          if (p.x + PW > pd.x + 0.05 && p.x < pd.x + 0.95 && Math.abs(p.y + PH - (pd.y + 1)) < 0.06) {
            p.vy = -PADV; p.ground = false; p.gobj = null; p.cut = true; p.coyote = 0;
            pd.fire = 1;
            ctx.sfx({ f: 300, f2: 1200, d: 0.22, type: 'square', v: 0.07 });
            burst(pd.x + 0.5, pd.y + 1, 10, PAL.accent);
          }
        }
      }
      // checkpoints
      for (var c = lastCheck + 1; c < lv.checks.length; c++) if (p.x + PW / 2 > lv.checks[c].x + 0.5) reachCheck(c);
      // boss arena
      if (!boss && lv.arena && p.x > lv.arena + 2) startBoss();
      if (boss) stepBoss(dt);
      if (hazardHit() || p.y > H + 1) die();
    }
    function hazardHit() {
      var hx = p.x + 0.1, hy = p.y + 0.1, hw = PW - 0.2, hh = PH - 0.15, i;
      var x0 = Math.floor(hx), x1 = Math.floor(hx + hw), y0 = Math.floor(hy), y1 = Math.floor(hy + hh);
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
        if (cell(tx, ty) === 2 && overlap(hx, hy, hw, hh, tx + 0.12, ty + 0.45, 0.76, 0.55)) return true;
      }
      for (i = 0; i < lv.pistons.length; i++) {
        var ps = lv.pistons[i];
        if (isOn(ps) && overlap(hx, hy, hw, hh, ps.x0 + 0.08, ps.y + 0.35, ps.x1 - ps.x0 - 0.16, 0.65)) return true;
      }
      for (i = 0; i < lv.lasers.length; i++) {
        var lz = lv.lasers[i];
        if (isOn(lz) && overlap(hx, hy, hw, hh, lz.x + 0.3, lz.y0, 0.4, lz.y1 - lz.y0)) return true;
      }
      if (boss) for (i = 0; i < boss.attacks.length; i++) {
        var a = boss.attacks[i];
        if (a.live && overlap(hx, hy, hw, hh, a.x, a.y, a.w, a.h)) return true;
      }
      return false;
    }

    /* ------------------------------------------------------------------ */
    /* Boss                                                               */
    /* ------------------------------------------------------------------ */
    function startBoss() {
      var x0 = lv.arena;
      boss = { started: true, phase: 0, hits: 0, beat0: Math.ceil(songT / BEAT / 4) * 4 + 4, attacks: [], orb: null, dead: false, deadT: 0, grace: 0, flash: 0, wall: { x: x0 - 1, y: 0, w: 1, h: 11, on: true }, n: 0 };
      layer = 4;
      setPalette(4);
      shake = 0.25;
      ctx.sfx('explode');
      toast(BOSS_NAMES[lvIdx] + ' — dodge on the beat, grab the orbs');
    }
    function arenaCol() { return lv.arena; }
    function addAttack(kind, side) {
      var x0 = arenaCol(), a = { kind: kind, warn: 1, live: false, life: 0, x: 0, y: 0, w: 0, h: 0, dir: 0, tx: 0, ty: 0 };
      if (kind === 'drop') {
        a.tx = clamp(Math.round(p.x - 0.5) + (side ? (side > 0 ? 2 : -2) : 0), x0, x0 + 20);
        a.x = a.tx; a.w = 2; a.h = 1.6; a.y = -2; a.ty = 11 - 1.6;
      } else if (kind === 'wave') {
        a.dir = side || (p.x < x0 + 11 ? 1 : -1);
        a.w = 0.9; a.h = 1.15; a.y = 11 - 1.15; a.x = a.dir > 0 ? x0 : x0 + 22 - a.w;
      } else {
        a.low = side ? side > 0 : R() < 0.5;
        a.x = x0; a.w = 22; a.h = 0.45; a.y = a.low ? 10.35 : 8.9;
      }
      boss.attacks.push(a);
    }
    // called once per beat while fighting
    function bossBeat(b) {
      var kinds = lv.attacks, ph = boss.phase, bb = mod(b, 4);
      if (boss.grace > 0) { boss.grace--; return; }
      boss.n++;
      var dense = ph >= 1, k;
      if (bb === 0 || bb === 2 || (dense && bb === 1 && ph >= 2) || (dense && bb === 3 && boss.n % 2 === 0)) {
        k = kinds[(boss.n + ph) % kinds.length];
        addAttack(k, k === 'drop' ? (boss.n % 3) - 1 : k === 'wave' ? (boss.n % 2 ? 1 : -1) : boss.n % 2 ? 1 : -1);
      }
      // spawn the orb after three bars of the phase
      if (!boss.orb && boss.phaseBeats >= 12) {
        var spots = [[lv.arena + 5.5, 6.2], [lv.arena + 16.5, 6.2], [lv.arena + 11, 10.3]];
        var sp = spots[(ph + boss.hits) % 3];
        boss.orb = { x: sp[0], y: sp[1], t: 0 };
        ctx.sfx('pop');
      }
      boss.phaseBeats++;
    }
    function stepBoss(dt) {
      if (boss.flash > 0) boss.flash = Math.max(0, boss.flash - dt * 3);
      if (boss.dead) {
        boss.deadT += dt;
        if (boss.deadT > 1.6 && state === 'play') levelWon();
        return;
      }
      var bpos = songT / BEAT;
      if (beatTick && beatIdx >= boss.beat0) {
        if (boss.phaseBeats == null) boss.phaseBeats = 0;
        bossBeat(beatIdx);
      }
      for (var i = boss.attacks.length - 1; i >= 0; i--) {
        var a = boss.attacks[i];
        if (a.warn > 0) {
          a.warn -= dt / BEAT;
          if (a.warn <= 0) { a.live = true; a.life = 0; if (a.kind !== 'wave') ctx.sfx(a.kind === 'drop' ? { f: 120, f2: 40, d: 0.15, type: 'square', v: 0.08 } : { f: 900, f2: 300, d: 0.2, type: 'sawtooth', v: 0.04 }); }
          continue;
        }
        a.life += dt;
        if (a.kind === 'drop') {
          a.y = Math.min(a.ty, -2 + (a.ty + 2) * clamp(a.life / (BEAT * 0.2), 0, 1));
          if (a.life > BEAT * 1.4) boss.attacks.splice(i, 1);
          else if (a.y >= a.ty && a.life - dt < BEAT * 0.2) { shake = Math.max(shake, 0.12); burst(a.x + 1, 11, 6, '#ffffff'); }
        } else if (a.kind === 'wave') {
          a.x += a.dir * 13 * dt;
          if (a.x < arenaCol() - 1 || a.x > arenaCol() + 23) boss.attacks.splice(i, 1);
        } else if (a.life > BEAT) boss.attacks.splice(i, 1);
      }
      if (boss.orb) {
        boss.orb.t += dt;
        var o = boss.orb;
        if (overlap(p.x, p.y, PW, PH, o.x - 0.45, o.y - 0.45, 0.9, 0.9)) {
          boss.orb = null;
          boss.hits++;
          boss.flash = 1;
          boss.attacks.length = 0;
          shake = 0.4;
          flash = 0.4;
          ctx.sfx('explode');
          burst(lv.arena + 11, 2.6, 26, PAL.accent);
          if (boss.hits >= 3) { boss.dead = true; boss.deadT = 0; boss.wall = null; toast(BOSS_NAMES[lvIdx] + ' broken!'); return; }
          boss.phase++;
          boss.phaseBeats = 0;
          boss.grace = 2;
          toast('Hit! ' + (3 - boss.hits) + ' to go');
        }
      }
      void bpos;
    }

    /* ------------------------------------------------------------------ */
    /* Update                                                             */
    /* ------------------------------------------------------------------ */
    var beatTick = false;
    function update(dt) {
      time += dt;
      beatTick = false;
      if (state === 'play' || state === 'dying') {
        songT += dt;
        var bi = Math.floor(songT / BEAT);
        if (bi !== beatIdx) { beatIdx = bi; beatTick = true; beatPulse = 1; }
        syncGain();
        scheduleMusic();
      } else syncGain();
      if (state === 'play') stepPlay(dt);
      else if (state === 'dying') {
        deadT += dt;
        buildDyn();
        if (boss) stepBoss(dt);
        if (deadT > 0.65) respawn();
      }
      if (state !== 'paused') {
        stepParticles(dt);
        if (shake > 0) shake = Math.max(0, shake - dt * 2);
        if (flash > 0) flash = Math.max(0, flash - dt * 2.5);
        beatPulse = Math.max(0, beatPulse - dt * 4);
        if (p.sq > 0) p.sq = Math.max(0, p.sq - dt * 4); else if (p.sq < 0) p.sq = Math.min(0, p.sq + dt * 3);
        for (var i = 0; i < lv.pads.length; i++) if (lv.pads[i].fire > 0) lv.pads[i].fire = Math.max(0, lv.pads[i].fire - dt * 4);
        updateCamera(dt);
      }
      if (state === 'menu') {
        // demo clock on the title screen so the level behind the menu keeps moving
        songT += dt;
        buildDyn();
      }
    }
    function targetScale() {
      if (boss && boss.started && !boss.dead) return Math.min(VH / 13.5, VW / 25.5);
      return Math.max(14, Math.min(VH / 11.5, VW / 15));
    }
    function updateCamera(dt) {
      var ts = targetScale();
      camS += (ts - camS) * (1 - Math.exp(-dt * 4));
      var vw = VW / camS, vh = VH / camS, tx, ty;
      if (boss && boss.started && !boss.dead) { tx = lv.arena + 11; ty = 6.8; }
      else {
        tx = p.x + PW / 2 + p.face * 1.5 + p.vx * 0.15;
        tx = clamp(tx, vw / 2, Math.max(vw / 2, LW - vw / 2));
        ty = vh >= H ? H - vh / 2 : clamp(p.y, vh / 2, H - vh / 2 + 0.5);
        // keep the floor line well above the bottom edge (and above touch buttons)
        ty = Math.min(Math.max(ty, 11 - ((ctx.isTouch ? 0.7 : 0.8) - 0.5) * vh), p.y + vh * 0.32);
      }
      var k = 1 - Math.exp(-dt * 6);
      camX += (tx - camX) * k;
      camY += (ty - camY) * k;
      if (state === 'menu') { camX = tx; camY = ty; camS = ts; }
      if (dbgView) { camX = dbgView[0]; camY = 7; camS = dbgView[1]; }
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                          */
    /* ------------------------------------------------------------------ */
    function SXf(x) { return (x - camX) * camS + VW / 2; }
    function SYf(y) { return (y - camY) * camS + VH / 2; }

    function render() {
      g.save();
      if (shake > 0) g.translate((R() - 0.5) * shake * UI * 0.05, (R() - 0.5) * shake * UI * 0.05);
      drawBg();
      drawTiles();
      drawObjects();
      if (boss) drawBoss();
      if (state === 'play' || state === 'paused' || (state === 'won')) drawPlayer();
      drawParticles();
      g.restore();
      if (flash > 0) { g.fillStyle = 'rgba(255,255,255,' + (flash * 0.5).toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }
      if (state === 'play' && lvlT < 5 && lvIdx === 0 && lastCheck < 0) drawHelp();
      updateHud();
    }

    function drawBg() {
      g.fillStyle = PAL.bg;
      g.fillRect(-20, -20, VW + 40, VH + 40);
      // big abstract shapes that thump with the kick
      var k = beatPulse * beatPulse, s = camS;
      g.fillStyle = PAL.bg2;
      for (var i = 0; i < 6; i++) {
        var wx = i * 34 + 8, par = 0.35 + (i % 3) * 0.1;
        var cx = (wx - camX * par) * s * 0.9 + VW / 2, cy = VH * (0.28 + (i % 3) * 0.2);
        var sz = s * (3 + (i % 3) * 1.6) * (1 + k * 0.08);
        cx = mod(cx + VW * 0.5, VW * 2.2) - VW * 0.5;
        if (i % 2) { g.beginPath(); g.arc(cx, cy, sz, 0, TAU); g.fill(); }
        else g.fillRect(cx - sz, cy - sz * 0.6, sz * 2, sz * 1.2);
      }
      // equalizer stripes along the bottom react to the active layers
      g.globalAlpha = 0.18;
      g.fillStyle = PAL.accent;
      var n = 24, bw = VW / n;
      for (var j = 0; j < n; j++) {
        var hh = (0.04 + 0.05 * Math.abs(Math.sin(j * 1.7 + Math.floor(songT / STEP) * 0.9)) * (1 + layer) * (0.4 + k)) * VH;
        g.fillRect(j * bw + 1, VH - hh, bw - 2, hh);
      }
      g.globalAlpha = 1;
    }

    function drawTiles() {
      var s = camS, x0 = Math.max(0, Math.floor(camX - VW / 2 / s) - 1), x1 = Math.min(LW - 1, Math.ceil(camX + VW / 2 / s) + 1);
      var y0 = Math.max(0, Math.floor(camY - VH / 2 / s) - 1), y1 = H - 1, x, y, run;
      g.fillStyle = PAL.solid;
      for (y = y0; y <= y1; y++) {
        run = -1;
        for (x = x0; x <= x1 + 1; x++) {
          var sol = x <= x1 && grid[y * LW + x] === 1;
          if (sol && run < 0) run = x;
          else if (!sol && run >= 0) { g.fillRect(Math.floor(SXf(run)), Math.floor(SYf(y)), Math.ceil((x - run) * s) + 1, Math.ceil(s) + 1); run = -1; }
        }
      }
      // bright top edges + darker underside rows
      g.fillStyle = PAL.top;
      var th = Math.max(2, s * 0.12);
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        if (grid[y * LW + x] !== 1) continue;
        if (y === 0 || grid[(y - 1) * LW + x] !== 1) g.fillRect(Math.floor(SXf(x)), Math.floor(SYf(y)), Math.ceil(s) + 1, th);
      }
      // spikes: black/white teeth
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) if (grid[y * LW + x] === 2) drawTeeth(x, y + 1, 1, 0.55, 1);
    }
    function drawTeeth(x, baseY, w, h, a) {
      var s = camS, n = Math.max(2, Math.round(w * 2)), bx = SXf(x), by = SYf(baseY), tw = (w * s) / n;
      g.globalAlpha = a;
      g.fillStyle = '#0d0d16';
      g.beginPath();
      for (var i = 0; i < n; i++) { g.moveTo(bx + i * tw, by); g.lineTo(bx + i * tw + tw / 2, by - h * s); g.lineTo(bx + (i + 1) * tw, by); }
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = Math.max(1, s * 0.05);
      g.stroke();
      g.globalAlpha = 1;
    }
    function rect(x, y, w, h) { g.fillRect(SXf(x), SYf(y), w * camS, h * camS); }

    function drawObjects() {
      var s = camS, i, o;
      // pulses
      for (i = 0; i < lv.pulses.length; i++) {
        o = lv.pulses[i];
        var on = isOn(o), warn = soonFlip(o);
        var bx = SXf(o.x), by = SYf(o.y), bw = o.w * s, bh = o.h * s;
        if (bx > VW || bx + bw < 0) continue;
        if (on) {
          g.fillStyle = warn && Math.floor(time * 20) % 2 ? PAL.top : PAL.accent;
          g.fillRect(bx, by, bw, bh);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.fillRect(bx, by, bw, Math.max(2, s * 0.12));
        } else {
          g.strokeStyle = warn ? '#ffffff' : PAL.accent;
          g.globalAlpha = warn ? 0.9 : 0.45;
          g.lineWidth = Math.max(1, s * 0.06);
          g.setLineDash([s * 0.18, s * 0.14]);
          g.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
          g.setLineDash([]);
          g.globalAlpha = 1;
        }
      }
      // movers
      for (i = 0; i < lv.movers.length; i++) {
        o = lv.movers[i];
        if (state === 'menu') moverPos(o, songT);
        g.fillStyle = PAL.mover;
        rect(o.x, o.y, o.w, o.h);
        g.fillStyle = 'rgba(0,0,0,0.22)';
        for (var q = 0; q < o.w; q++) rect(o.x + q + 0.4, o.y + 0.3, 0.2, 0.4);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        rect(o.x, o.y, o.w, 0.12);
      }
      // pads
      for (i = 0; i < lv.pads.length; i++) {
        o = lv.pads[i];
        var ph = (songT / BEAT) % 1, pump = 1 - ph;
        g.fillStyle = PAL.accent;
        rect(o.x + 0.1, o.y + 0.7 - pump * 0.15 - o.fire * 0.3, 0.8, 0.3 + pump * 0.15 + o.fire * 0.3);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(SXf(o.x + 0.3), SYf(o.y + 0.65)); g.lineTo(SXf(o.x + 0.5), SYf(o.y + 0.35 - pump * 0.15)); g.lineTo(SXf(o.x + 0.7), SYf(o.y + 0.65));
        g.closePath(); g.fill();
      }
      // pistons
      for (i = 0; i < lv.pistons.length; i++) {
        o = lv.pistons[i];
        var up = isOn(o), w2 = soonFlip(o) && !up;
        g.fillStyle = 'rgba(0,0,0,0.35)';
        rect(o.x0, o.y + 0.85, o.x1 - o.x0, 0.15);
        if (up) drawTeeth(o.x0, o.y + 1, o.x1 - o.x0, 0.65, 1);
        else drawTeeth(o.x0, o.y + 1, o.x1 - o.x0, w2 ? 0.25 : 0.12, w2 ? 0.95 : 0.55);
      }
      // lasers
      for (i = 0; i < lv.lasers.length; i++) {
        o = lv.lasers[i];
        var lx = SXf(o.x + 0.5);
        if (lx < -s || lx > VW + s) continue;
        var fire = isOn(o), pre = !fire && soonFlip(o);
        g.fillStyle = '#16161f';
        rect(o.x + 0.15, o.y0 - (o.y0 > 0 ? 0 : 0.6), 0.7, 0.6);
        if (fire) {
          g.fillStyle = PAL.laser;
          g.globalAlpha = 0.45;
          g.fillRect(lx - s * 0.3, SYf(o.y0), s * 0.6, (o.y1 - o.y0) * s);
          g.globalAlpha = 1;
          g.fillStyle = '#ffffff';
          g.fillRect(lx - s * 0.1, SYf(o.y0), s * 0.2, (o.y1 - o.y0) * s);
        } else {
          g.strokeStyle = pre ? '#ffffff' : PAL.laser;
          g.globalAlpha = pre ? 0.9 : 0.3;
          g.lineWidth = pre ? Math.max(1.5, s * 0.06) : 1;
          g.setLineDash(pre ? [] : [s * 0.2, s * 0.25]);
          g.beginPath(); g.moveTo(lx, SYf(o.y0)); g.lineTo(lx, SYf(o.y1)); g.stroke();
          g.setLineDash([]);
          g.globalAlpha = 1;
        }
      }
      // checkpoints
      for (i = 0; i < lv.checks.length; i++) {
        o = lv.checks[i];
        var lit = i <= lastCheck;
        g.fillStyle = lit ? '#ffffff' : 'rgba(255,255,255,0.35)';
        rect(o.x + 0.42, o.y - 1.6, 0.16, 2.6);
        g.fillStyle = lit ? PAL.accent : 'rgba(255,255,255,0.25)';
        var cx = SXf(o.x + 0.5), cy = SYf(o.y - 1.8), r = s * (0.32 + (lit ? beatPulse * 0.08 : 0));
        g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.fill();
      }
      // arena wall
      if (boss && boss.wall) { g.fillStyle = PAL.solid; rect(boss.wall.x, boss.wall.y, boss.wall.w, boss.wall.h); }
    }

    function drawBoss() {
      var s = camS, x0 = lv.arena;
      var cx = SXf(x0 + 11), cy = SYf(2.6), k = beatPulse;
      if (!boss.dead || boss.deadT < 1.2) {
        var sc = boss.dead ? 1 + boss.deadT * 1.5 : 1;
        g.save();
        g.translate(cx, cy);
        g.globalAlpha = boss.dead ? clamp(1 - boss.deadT / 1.2, 0, 1) : 1;
        var base = s * 1.5 * sc * (1 + k * 0.12);
        // rotating frames, one per remaining hit
        for (var i = 0; i < 3; i++) {
          g.save();
          g.rotate(songT * (0.6 + i * 0.4) * (i % 2 ? -1 : 1) + i);
          var sz = base * (1 - i * 0.22);
          var alive = i < 3 - boss.hits;
          g.strokeStyle = alive ? (boss.flash > 0 ? '#ffffff' : PAL.accent) : 'rgba(255,255,255,0.18)';
          g.lineWidth = Math.max(2, s * 0.18);
          g.strokeRect(-sz, -sz, sz * 2, sz * 2);
          g.restore();
        }
        g.fillStyle = boss.flash > 0 ? '#ffffff' : PAL.laser;
        g.beginPath(); g.arc(0, 0, base * 0.36, 0, TAU); g.fill();
        // the eye tracks the player
        var ex = clamp((p.x - (x0 + 11)) * 0.05, -0.25, 0.25) * base, ey = clamp((p.y - 2.6) * 0.03, -0.2, 0.25) * base;
        g.fillStyle = '#0d0d16';
        g.beginPath(); g.arc(ex * 0.6, ey * 0.6, base * 0.15, 0, TAU); g.fill();
        g.restore();
        g.globalAlpha = 1;
      }
      // attacks
      for (var j = 0; j < boss.attacks.length; j++) {
        var a = boss.attacks[j], blink = Math.floor(time * 16) % 2;
        if (!a.live) {
          g.globalAlpha = 0.25 + (blink ? 0.3 : 0);
          g.fillStyle = '#ffffff';
          if (a.kind === 'drop') rect(a.tx, 0, 2, 11);
          else if (a.kind === 'wave') rect(a.dir > 0 ? x0 : x0 + 21, 9.6, 1, 1.4);
          else rect(x0, a.y - 0.05, 22, a.h + 0.1);
          g.globalAlpha = 1;
          continue;
        }
        if (a.kind === 'drop') {
          g.fillStyle = '#0d0d16'; rect(a.x, a.y, a.w, a.h);
          g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, s * 0.07);
          g.strokeRect(SXf(a.x), SYf(a.y), a.w * s, a.h * s);
        } else if (a.kind === 'wave') {
          drawTeeth(a.x - 0.2, 11, a.w + 0.4, a.h, 1);
        } else {
          g.fillStyle = PAL.laser; g.globalAlpha = 0.5; rect(x0, a.y - 0.12, 22, a.h + 0.24);
          g.globalAlpha = 1; g.fillStyle = '#ffffff'; rect(x0, a.y + 0.1, 22, a.h - 0.2);
        }
      }
      // orb
      if (boss.orb) {
        var o = boss.orb, ox = SXf(o.x), oy = SYf(o.y + Math.sin(time * 5) * 0.12), rr = s * (0.32 + beatPulse * 0.06);
        g.fillStyle = PAL.accent;
        g.globalAlpha = 0.35;
        g.beginPath(); g.arc(ox, oy, rr * 2, 0, TAU); g.fill();
        g.globalAlpha = 1;
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(ox, oy, rr, 0, TAU); g.fill();
      }
    }

    var ghosts = [];
    for (var gi = 0; gi < 4; gi++) ghosts.push({ x: 0, y: 0 });
    var ghostT = 0;
    function drawPlayer() {
      var s = camS;
      // afterimages while moving fast
      ghostT += 1;
      if (ghostT % 3 === 0) { ghosts.unshift(ghosts.pop()); ghosts[0].x = p.x; ghosts[0].y = p.y; }
      var spd = Math.abs(p.vx) + Math.abs(p.vy);
      if (spd > 6 && state === 'play') {
        for (var i = 1; i < ghosts.length; i++) {
          g.globalAlpha = 0.18 * (1 - i / ghosts.length);
          g.fillStyle = '#ffffff';
          rect(ghosts[i].x + 0.1, ghosts[i].y + 0.1, PW - 0.2, PH - 0.2);
        }
        g.globalAlpha = 1;
      }
      var sq = p.sq, pulse = 1 + beatPulse * 0.06;
      var w = PW * (1 + sq * 0.35) * pulse, h = PH * (1 - sq * 0.35) * pulse;
      var cx = SXf(p.x + PW / 2), by = SYf(p.y + PH);
      var bx = cx - (w * s) / 2, top = by - h * s, r = Math.min(w, h) * s * 0.22;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(bx + r, top); g.lineTo(bx + w * s - r, top); g.quadraticCurveTo(bx + w * s, top, bx + w * s, top + r);
      g.lineTo(bx + w * s, by - r); g.quadraticCurveTo(bx + w * s, by, bx + w * s - r, by);
      g.lineTo(bx + r, by); g.quadraticCurveTo(bx, by, bx, by - r);
      g.lineTo(bx, top + r); g.quadraticCurveTo(bx, top, bx + r, top);
      g.fill();
      // visor strip that looks where you run
      g.fillStyle = PAL.bg;
      g.fillRect(cx - w * s * 0.1 + p.face * w * s * 0.12, top + h * s * 0.28, w * s * 0.42, h * s * 0.16);
    }

    /* ---------- particles (world space) ---------- */
    var PMAX = 90, parts = [];
    for (var pi = 0; pi < PMAX; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, sz: 0.2, col: '#fff' });
    function burst(x, y, n, col) {
      var j = 0;
      for (var i = 0; i < n; i++) {
        for (; j < PMAX; j++) {
          var q = parts[j];
          if (q.on) continue;
          var a = R() * TAU, v = 3 + R() * 9;
          q.on = true; q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v - 4;
          q.life = q.max = 0.35 + R() * 0.45; q.sz = 0.1 + R() * 0.18; q.col = col;
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
        q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 30 * dt;
      }
    }
    function drawParticles() {
      for (var i = 0; i < PMAX; i++) {
        var q = parts[i];
        if (!q.on) continue;
        g.globalAlpha = clamp(q.life / q.max, 0, 1);
        g.fillStyle = q.col;
        rect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
      }
      g.globalAlpha = 1;
    }
    function drawHelp() {
      var fs = clamp(UI * 0.038, 12, 20), a = lvlT < 4 ? 1 : clamp(5 - lvlT, 0, 1);
      var lines = ctx.isTouch ? ['◀ ▶ run · ▲ jump (hold = higher)', 'Platforms and traps move on the beat'] : ['← → / A D run · Space / ↑ jump (hold = higher)', 'Platforms and traps move on the beat — listen'];
      g.globalAlpha = a;
      g.font = '800 ' + Math.round(fs) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      var w = 0, i;
      for (i = 0; i < lines.length; i++) w = Math.max(w, g.measureText(lines[i]).width);
      w = Math.min(VW - 16, w + fs * 1.4);
      var lh = fs * 1.35, y0 = Math.max(VH * 0.22, fs * 4.5);
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(VW / 2 - w / 2, y0 - lh * 0.5 - fs * 0.35, w, lh * lines.length + fs * 0.7);
      g.fillStyle = '#fff';
      for (i = 0; i < lines.length; i++) g.fillText(lines[i], VW / 2, y0 + i * lh, VW - 24);
      g.globalAlpha = 1;
    }

    /* ---------- HUD ---------- */
    var hudLast = '', hudOn = false, touchOn = null, lastBeatShown = -1;
    function updateHud() {
      var on = state === 'play' || state === 'paused' || state === 'dying';
      if (on !== hudOn) { hudOn = on; hud.classList.toggle('on', on); }
      var tOn = ctx.isTouch && (state === 'play' || state === 'dying');
      if (tOn !== touchOn) { touchOn = tOn; touchBar.classList.toggle('on', tOn); if (!tOn) btnHold.L = btnHold.R = btnHold.J = 0; }
      if (!on) return;
      var key = lvIdx + '|' + deaths;
      if (key !== hudLast) {
        hudLast = key;
        hudName.textContent = (lvIdx + 1) + ' · ' + lv.name;
        hudDeaths.textContent = '✖ ' + deaths;
      }
      var b = mod(beatIdx, 4);
      if (b !== lastBeatShown) {
        lastBeatShown = b;
        for (var i = 0; i < 4; i++) hudBeats[i].classList.toggle('on', i === b);
      }
    }
    function toast(txt) {
      if (destroyed) return;
      var t = IGAME.ui.toast(root, txt, 1700);
      if (t && t.style) { t.style.top = Math.round(clamp(UI / 30, 12, 18) * 4.4) + 'px'; t.style.fontSize = clamp(Math.round(UI / 32), 12, 17) + 'px'; }
    }

    /* ------------------------------------------------------------------ */
    /* Menus                                                              */
    /* ------------------------------------------------------------------ */
    function closeOverlay() { if (overlay) overlay.close(); overlay = null; overlayKind = ''; }
    function fitOverlay() { if (overlay) overlay.el.classList.toggle('bp-sm', VH < 560 || VW < 440); }
    function howHtml() {
      return ctx.isTouch
        ? '<p class="bp-how">◀ ▶ run · ▲ jump (hold for higher). Blocks blink, lasers fire and spikes pop on the beat — time your moves to the music.</p>'
        : '<p class="bp-how"><span class="ig-kbd">←</span> <span class="ig-kbd">→</span> run · <span class="ig-kbd">Space</span> / <span class="ig-kbd">↑</span> jump (hold for higher) · <span class="ig-kbd">M</span> music · <span class="ig-kbd">P</span> pause. Everything moves on the beat.</p>';
    }
    function levelsHtml() {
      var h = '<div class="bp-lv">';
      for (var i = 0; i < LEVELS.length; i++) {
        var b = bestDeaths[String(i)], locked = i > unlocked;
        h += '<button type="button" class="bp-lvb' + (b != null ? ' done' : '') + '" data-lv="' + i + '"' + (locked ? ' disabled' : '') + '>' + (i + 1) + '<small>' + (locked ? 'locked' : b != null ? '✓ ' + b + ' ✖' : LEVELS[i].name) + '</small></button>';
      }
      return h + '</div>';
    }
    function bindLevels() {
      Array.prototype.forEach.call(overlay.panel.querySelectorAll('[data-lv]'), function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (btn.disabled) return;
          ctx.sfx('click');
          startLevel(+btn.getAttribute('data-lv'));
        });
      });
    }
    function showTitle() {
      closeOverlay();
      state = 'menu';
      audioSuspend();
      overlayKind = 'title';
      var all = Object.keys(bestDeaths).length >= LEVELS.length;
      var next = Math.min(unlocked, LEVELS.length - 1);
      overlay = IGAME.ui.overlay(root, {
        title: 'Offbeat',
        text: all ? 'All four levels cleared — try them with fewer deaths.' : 'A rhythm platformer: the whole world moves to a 140 BPM beat.',
        html: levelsHtml() + howHtml(),
        buttons: [{ label: '▶ Play level ' + (next + 1), primary: true, onClick: function () { startLevel(next); } }],
        focus: false,
      });
      fitOverlay();
      bindLevels();
    }
    function showWon(first) {
      closeOverlay();
      audioSuspend();
      overlayKind = 'won';
      var last = lvIdx + 1 >= LEVELS.length;
      overlay = IGAME.ui.overlay(root, {
        title: last ? 'All levels cleared!' : 'Level ' + (lvIdx + 1) + ' complete',
        text: lv.name + ' · ' + BOSS_NAMES[lvIdx] + ' broken' + (first && !last ? ' — next level unlocked' : ''),
        html: '<div class="bp-stats"><div class="bp-stat"><span>Deaths</span><b>' + deaths + '</b></div><div class="bp-stat"><span>Time</span><b>' + IGAME.fmtTime(lvlT) + '</b></div></div>' +
          '<p class="bp-how">Best on this level: ' + bestDeaths[String(lvIdx)] + ' deaths. ' + (ctx.isTouch ? '' : 'Press <span class="ig-kbd">Space</span> to continue.') + '</p>',
        buttons: last
          ? [{ label: 'Menu', primary: true, onClick: showTitle }, { label: 'Replay', onClick: function () { startLevel(lvIdx); } }]
          : [{ label: 'Next level ▶', primary: true, onClick: function () { startLevel(lvIdx + 1); } }, { label: 'Replay', onClick: function () { startLevel(lvIdx); } }, { label: 'Menu', onClick: showTitle }],
        focus: false,
      });
      fitOverlay();
    }
    function showPause() {
      closeOverlay();
      overlayKind = 'pause';
      overlay = IGAME.ui.overlay(root, {
        title: 'Paused',
        text: 'Level ' + (lvIdx + 1) + ' · ' + lv.name + ' · ' + deaths + ' deaths',
        buttons: [{ label: '▶ Resume', primary: true, onClick: resumeGame }, { label: 'Restart level', onClick: function () { startLevel(lvIdx); } }, { label: 'Menu', onClick: showTitle }],
        focus: false,
      });
      fitOverlay();
    }
    function pauseGame() {
      if (state !== 'play' && state !== 'dying') return;
      if (state === 'dying') respawn();
      state = 'paused';
      btnHold.L = btnHold.R = btnHold.J = 0;
      audioSuspend();
      showPause();
    }
    function resumeGame() {
      if (state !== 'paused') return;
      closeOverlay();
      state = 'play';
      audioResume();
      ctx.focus();
    }

    /* ------------------------------------------------------------------ */
    /* Boot                                                               */
    /* ------------------------------------------------------------------ */
    loadLevel(Math.min(unlocked, LEVELS.length - 1));
    var loop = IGAME.loop(function (dt) { update(dt); render(); });
    loop.start();
    showTitle();

    if (ctx.debug) {
      window.__bp = {
        state: function () { return { state: state, level: lvIdx, x: +p.x.toFixed(2), y: +p.y.toFixed(2), ground: p.ground, deaths: deaths, check: lastCheck, layer: layer, beat: beatIdx, boss: boss ? { phase: boss.phase, hits: boss.hits, attacks: boss.attacks.length, orb: !!boss.orb, dead: boss.dead } : null, audio: ac ? ac.state : 'none', gain: curGain }; },
        level: startLevel,
        warp: function (i) { var c = lv.checks[i]; for (var k = lastCheck + 1; k <= i; k++) reachCheck(k); spawnAt(c.x, c.y); },
        to: function (x, row) { spawnAt(x, row); },
        orb: function () { if (boss && boss.orb) { p.x = boss.orb.x - PW / 2; p.y = boss.orb.y - PH / 2; } },
        unlockAll: function () { unlocked = LEVELS.length - 1; },
        view: function (x, sc) { dbgView = x == null ? null : [x, sc]; },
      };
    }

    return {
      pause: function () { if (state === 'play' || state === 'dying') pauseGame(); audioSuspend(); loop.stop(); },
      resume: function () { if (!destroyed) loop.start(); },
      destroy: function () {
        destroyed = true;
        loop.stop();
        closeOverlay();
        btnMusic.removeEventListener('click', onMusicBtn);
        btnPause.removeEventListener('click', onPauseBtn);
        Array.prototype.forEach.call(tbs, function (b) {
          b.removeEventListener('pointerdown', tbDown);
          b.removeEventListener('pointerup', tbUp);
          b.removeEventListener('pointercancel', tbUp);
          b.removeEventListener('lostpointercapture', tbUp);
          b.removeEventListener('pointerup', onTouchUpJ);
        });
        if (ac) { try { ac.close(); } catch (e) {} ac = null; }
        view.destroy();
        [hud, touchBar, styleEl].forEach(function (nd) { if (nd && nd.parentNode) nd.parentNode.removeChild(nd); });
        if (ctx.debug && window.__bp) { try { delete window.__bp; } catch (e) { window.__bp = undefined; } }
      },
    };
  });
})();
