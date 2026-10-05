/*!
 * Inkfist Duel — igame9 original 1v1 stick-figure arcade fighting game.
 * Side view, best of 3 rounds, 60-second timer. Walk / dash / jump / crouch, light and heavy
 * attacks, block, throws, three special moves (↓→ / ↓← + attack) and a super (Light + Heavy
 * with a full meter). Arcade ladder of 7 CPU opponents with their own colours, stats and AI
 * styles, plus 2-player versus on one keyboard.
 *
 * Coordinates: world units, y UP from the floor (y = 0). A fighter is ~2.1 units tall.
 * Simulation runs at a fixed 60 frames per second so frame data (startup / active / recovery)
 * is exact. Limbs are keyframed as hand / foot targets in "facing space" (x = forward) and
 * solved with 2-bone IK every frame.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var STEP = 1 / 60;
  var STAGE_W = 16, VIEW_W = 9.6;
  var GRAV = 36, JUMP_V = 11, WALK = 2.7, BACK = 2.2, DASH_V = 8.5;
  var L_T = 0.62, L_NECK = 0.1, R_HEAD = 0.21, L_UA = 0.36, L_FA = 0.37, L_TH = 0.48, L_SH = 0.48;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return t * t * (3 - 2 * t); }

  /* ------------------------------------------------------------------ */
  /* Poses: [hx, hy, torso, head, fhx, fhy, bhx, bhy, ffx, ffy, bfx, bfy] */
  /* hands relative to the shoulder, feet relative to the ground point;   */
  /* x = forward, y = up.                                                 */
  /* ------------------------------------------------------------------ */
  var BASE = { hx: 0, hy: 0.88, t: 0.12, hd: 0.05, fh: [0.36, 0.08], bh: [0.18, 0.2], ff: [0.32, 0], bf: [-0.3, 0] };
  function pose(o) {
    o = o || {};
    var a = new Float32Array(12);
    a[0] = o.hx != null ? o.hx : BASE.hx;
    a[1] = o.hy != null ? o.hy : BASE.hy;
    a[2] = o.t != null ? o.t : BASE.t;
    a[3] = o.hd != null ? o.hd : BASE.hd;
    var fh = o.fh || BASE.fh, bh = o.bh || BASE.bh, ff = o.ff || BASE.ff, bf = o.bf || BASE.bf;
    a[4] = fh[0]; a[5] = fh[1]; a[6] = bh[0]; a[7] = bh[1]; a[8] = ff[0]; a[9] = ff[1]; a[10] = bf[0]; a[11] = bf[1];
    return a;
  }
  var PZ = {
    stance: pose(),
    walk1: pose({ hy: 0.86, ff: [0.44, 0], bf: [-0.16, 0.1] }),
    walk2: pose({ hy: 0.86, ff: [0.2, 0.1], bf: [-0.4, 0] }),
    crouch: pose({ hy: 0.5, t: 0.32, fh: [0.34, 0.02], bh: [0.2, 0.12], ff: [0.4, 0], bf: [-0.34, 0] }),
    jumpUp: pose({ hy: 0.95, t: 0.05, fh: [0.3, 0.25], bh: [0.1, 0.3], ff: [0.26, 0.42], bf: [-0.14, 0.3] }),
    jumpDown: pose({ hy: 0.95, t: 0.1, fh: [0.34, 0.1], bh: [0.12, 0.18], ff: [0.22, 0.06], bf: [-0.22, 0.12] }),
    block: pose({ t: -0.05, hd: -0.05, fh: [0.2, 0.42], bh: [0.16, 0.28], ff: [0.36, 0], bf: [-0.36, 0] }),
    cblock: pose({ hy: 0.5, t: 0.2, fh: [0.24, 0.32], bh: [0.18, 0.2], ff: [0.4, 0], bf: [-0.34, 0] }),
    hit: pose({ t: -0.38, hd: -0.35, fh: [-0.05, -0.25], bh: [-0.2, -0.15], ff: [0.26, 0], bf: [-0.38, 0] }),
    hitLow: pose({ hy: 0.55, t: -0.1, hd: -0.3, fh: [0.05, -0.2], bh: [-0.15, -0.1], ff: [0.36, 0], bf: [-0.36, 0] }),
    air: pose({ hy: 0.9, t: -0.6, hd: -0.4, fh: [-0.2, 0.25], bh: [-0.3, 0.1], ff: [0.45, 0.3], bf: [0.15, 0.15] }),
    down: pose({ hx: 0.05, hy: 0.16, t: -1.5, hd: -0.1, fh: [-0.3, -0.08], bh: [-0.2, -0.12], ff: [0.85, 0.02], bf: [0.75, 0.1] }),
    getup: pose({ hy: 0.55, t: 0.35, fh: [0.2, -0.1], bh: [0.1, -0.2], ff: [0.36, 0], bf: [-0.3, 0] }),
    dash: pose({ hy: 0.78, t: 0.45, fh: [0.4, -0.05], bh: [-0.3, -0.1], ff: [0.45, 0.08], bf: [-0.45, 0.05] }),
    backdash: pose({ hy: 0.86, t: -0.2, fh: [0.3, 0.2], bh: [0.15, 0.3], ff: [0.15, 0.12], bf: [-0.45, 0] }),
    win: pose({ t: 0, hd: 0.1, fh: [0.1, 0.72], bh: [0.12, -0.15], ff: [0.25, 0], bf: [-0.25, 0] }),
    win2: pose({ t: 0.05, hd: 0.15, fh: [0.18, 0.66], bh: [0.2, -0.1], ff: [0.25, 0], bf: [-0.25, 0] }),
    // attacks
    jab: pose({ t: 0.22, fh: [0.7, 0.1], bh: [0.15, 0.22], ff: [0.42, 0], bf: [-0.3, 0] }),
    kickCh: pose({ t: 0.0, fh: [0.3, 0.25], bh: [-0.05, 0.15], ff: [0.32, 0.55], bf: [-0.1, 0] }),
    kick: pose({ hy: 0.92, t: -0.3, hd: 0.1, fh: [0.25, 0.18], bh: [-0.3, 0.05], ff: [1.02, 1.0], bf: [-0.12, 0] }),
    cjab: pose({ hy: 0.48, t: 0.42, fh: [0.7, -0.08], bh: [0.18, 0.12], ff: [0.46, 0], bf: [-0.34, 0] }),
    sweepCh: pose({ hy: 0.42, t: 0.5, fh: [0.2, -0.3], bh: [-0.1, -0.35], ff: [0.25, 0.1], bf: [-0.3, 0] }),
    sweep: pose({ hy: 0.4, t: 0.35, fh: [0.05, -0.4], bh: [-0.2, -0.38], ff: [1.08, 0.06], bf: [-0.28, 0] }),
    ajab: pose({ hy: 0.92, t: 0.25, fh: [0.55, -0.32], bh: [0.12, 0.2], ff: [0.24, 0.35], bf: [-0.16, 0.25] }),
    akick: pose({ hy: 0.92, t: -0.15, fh: [0.2, 0.3], bh: [-0.2, 0.25], ff: [0.82, 0.12], bf: [-0.05, 0.5] }),
    orbCh: pose({ t: -0.05, fh: [-0.12, 0.0], bh: [-0.2, 0.05], ff: [0.36, 0], bf: [-0.36, 0] }),
    orb: pose({ t: 0.3, fh: [0.66, 0.1], bh: [0.6, 0.18], ff: [0.46, 0], bf: [-0.32, 0] }),
    spinA: pose({ hy: 0.95, t: -0.15, fh: [0.2, 0.3], bh: [-0.3, 0.2], ff: [0.95, 0.75], bf: [-0.15, 0.25] }),
    spinB: pose({ hy: 0.95, t: 0.15, fh: [0.25, 0.25], bh: [-0.25, 0.3], ff: [0.25, 0.3], bf: [0.9, 0.85] }),
    riseCh: pose({ hy: 0.55, t: 0.3, fh: [0.32, -0.05], bh: [0.12, 0.05], ff: [0.38, 0], bf: [-0.3, 0] }),
    rise: pose({ hy: 0.95, t: 0.05, hd: 0.15, fh: [0.24, 0.72], bh: [0.0, 0.0], ff: [0.2, 0.25], bf: [-0.1, 0.5] }),
    reach: pose({ t: 0.3, fh: [0.6, 0.18], bh: [0.55, 0.05], ff: [0.42, 0], bf: [-0.3, 0] }),
    toss: pose({ t: -0.35, hd: -0.2, fh: [-0.3, 0.6], bh: [-0.35, 0.5], ff: [0.36, 0], bf: [-0.42, 0] }),
    power: pose({ hy: 0.78, t: 0.0, hd: 0.2, fh: [0.35, -0.25], bh: [-0.35, -0.25], ff: [0.42, 0], bf: [-0.42, 0] }),
  };

  // Move data in frames (60 fps). lim = limb whose end is the hitbox: fh / bh / ff / bf.
  // lvl: high (blocked standing or crouching), low (crouch-block only), over (stand-block only)
  var MOVES = {
    lp: { st: 4, ac: 3, rc: 8, dmg: 5, hs: 14, bs: 10, push: 2.8, lim: 'fh', r: 0.24, lvl: 'high', stop: 5, keys: [[4, 'jab'], [3, 'jab'], [8, 'stance']], cancel: ['lp', 'hp', 'sp'] },
    hp: { st: 9, ac: 4, rc: 16, dmg: 11, hs: 20, bs: 14, push: 4.5, lim: 'ff', r: 0.3, lvl: 'high', stop: 9, heavy: true, keys: [[5, 'kickCh'], [4, 'kick'], [4, 'kick'], [16, 'stance']], cancel: ['sp'] },
    clp: { st: 5, ac: 3, rc: 9, dmg: 4, hs: 13, bs: 9, push: 2.6, lim: 'fh', r: 0.24, lvl: 'low', stop: 5, crouch: true, keys: [[5, 'cjab'], [3, 'cjab'], [9, 'crouch']], cancel: ['clp', 'chp', 'sp'] },
    chp: { st: 8, ac: 4, rc: 20, dmg: 10, hs: 20, bs: 14, push: 2.5, lim: 'ff', r: 0.3, lvl: 'low', stop: 9, heavy: true, kd: true, crouch: true, keys: [[4, 'sweepCh'], [4, 'sweep'], [4, 'sweep'], [20, 'crouch']], cancel: ['sp'] },
    jlp: { st: 4, ac: 9, rc: 6, dmg: 6, hs: 15, bs: 10, push: 2.4, lim: 'fh', r: 0.26, lvl: 'over', stop: 6, air: true, keys: [[4, 'ajab'], [9, 'ajab'], [6, 'jumpDown']] },
    jhp: { st: 6, ac: 10, rc: 6, dmg: 10, hs: 19, bs: 13, push: 3.4, lim: 'ff', r: 0.3, lvl: 'over', stop: 9, heavy: true, air: true, keys: [[6, 'akick'], [10, 'akick'], [6, 'jumpDown']] },
    orb: { st: 12, ac: 1, rc: 22, special: true, keys: [[8, 'orbCh'], [4, 'orb'], [23, 'stance']] },
    rush: { st: 8, ac: 18, rc: 18, dmg: 4, hs: 16, bs: 10, push: 1.2, lim: 'ff', r: 0.36, lvl: 'high', stop: 5, special: true, multi: 6, chip: 1, kdLast: true, keys: [[8, 'crouch'], [3, 'spinA'], [3, 'spinB'], [3, 'spinA'], [3, 'spinB'], [3, 'spinA'], [3, 'spinB'], [18, 'stance']] },
    rise: { st: 3, ac: 10, rc: 20, dmg: 12, hs: 24, bs: 16, push: 1.5, lim: 'fh', r: 0.34, lvl: 'high', stop: 10, special: true, kd: true, inv: 8, chip: 2, launch: 7, keys: [[3, 'riseCh'], [10, 'rise'], [20, 'jumpDown']] },
    throw: { st: 4, ac: 2, rc: 20, throwMove: true, keys: [[4, 'reach'], [2, 'reach'], [20, 'stance']] },
    super: { st: 6, ac: 34, rc: 26, dmg: 6, hs: 18, bs: 10, push: 0.4, lim: 'fh', r: 0.42, lvl: 'high', stop: 6, special: true, multi: 6, chip: 2, kdLast: true, inv: 10, isSuper: true, keys: [[6, 'power'], [3, 'jab'], [3, 'spinA'], [3, 'jab'], [3, 'spinB'], [3, 'jab'], [3, 'spinA'], [3, 'jab'], [3, 'spinB'], [3, 'jab'], [3, 'rise'], [4, 'rise'], [26, 'jumpDown']] },
  };
  for (var mk in MOVES) {
    var mv = MOVES[mk];
    mv.id = mk;
    mv.total = mv.st + mv.ac + mv.rc;
    mv.anim = { keys: mv.keys.map(function (k) { return [k[0], PZ[k[1]]]; }), loop: false };
  }
  var ANIM = {
    idle: { keys: [[30, PZ.stance]], loop: true },
    walkF: { keys: [[10, PZ.walk1], [10, PZ.walk2]], loop: true },
    walkB: { keys: [[11, PZ.walk2], [11, PZ.walk1]], loop: true },
    crouch: { keys: [[5, PZ.crouch]], loop: false },
    jump: { keys: [[8, PZ.jumpUp], [14, PZ.jumpUp], [10, PZ.jumpDown]], loop: false },
    block: { keys: [[3, PZ.block]], loop: false },
    cblock: { keys: [[3, PZ.cblock]], loop: false },
    hit: { keys: [[3, PZ.hit], [12, PZ.stance]], loop: false },
    hitLow: { keys: [[3, PZ.hitLow], [12, PZ.crouch]], loop: false },
    air: { keys: [[6, PZ.air]], loop: false },
    down: { keys: [[8, PZ.down]], loop: false },
    getup: { keys: [[10, PZ.getup], [10, PZ.stance]], loop: false },
    dash: { keys: [[4, PZ.dash], [10, PZ.dash]], loop: false },
    backdash: { keys: [[4, PZ.backdash], [10, PZ.backdash]], loop: false },
    win: { keys: [[12, PZ.win], [20, PZ.win2], [20, PZ.win]], loop: false },
    toss: { keys: [[8, PZ.reach], [12, PZ.toss], [14, PZ.stance]], loop: false },
  };

  /* ------------------------------------------------------------------ */
  /* Roster & stages (all original)                                      */
  /* ------------------------------------------------------------------ */
  var ROSTER = [
    { id: 'quill', name: 'Quill', col: '#ff4d5e', dark: '#a3243a', deco: 'band', hp: 100, spd: 1, pow: 1, jump: 1, thick: 1, orb: 1, stage: 'hall', style: 'balanced', bio: 'Balanced brawler with a red headband' },
    { id: 'dabble', name: 'Dabble', col: '#b6bccb', dark: '#666c7c', deco: 'none', hp: 90, spd: 0.9, pow: 0.85, jump: 0.95, thick: 0.95, orb: 0.8, stage: 'dojo', style: 'rookie', bio: 'Nervous rookie, guard too low' },
    { id: 'brisk', name: 'Brisk', col: '#ffd23f', dark: '#b38b12', deco: 'spikes', hp: 88, spd: 1.3, pow: 0.86, jump: 1.08, thick: 0.85, orb: 0.9, stage: 'roof', style: 'speed', bio: 'Fastest feet in the city' },
    { id: 'bulwark', name: 'Bulwark', col: '#5b8bd6', dark: '#2d4f8a', deco: 'helmet', hp: 130, spd: 0.75, pow: 1.25, jump: 0.88, thick: 1.4, orb: 0.8, stage: 'harbor', style: 'tank', bio: 'Slow, huge health, hits like a crane' },
    { id: 'volta', name: 'Volta', col: '#2ee6d6', dark: '#118f86', deco: 'bolt', hp: 95, spd: 0.95, pow: 0.95, jump: 1, thick: 0.95, orb: 1.5, stage: 'plant', style: 'zoner', bio: 'Keeps you away with fast orbs' },
    { id: 'ember', name: 'Ember', col: '#ff7a29', dark: '#b4440c', deco: 'flame', hp: 100, spd: 1.12, pow: 1.1, jump: 1, thick: 1, orb: 1, stage: 'volcano', style: 'rush', bio: 'Relentless spinning-kick rushdown' },
    { id: 'mirage', name: 'Mirage', col: '#a46bff', dark: '#6334b8', deco: 'scarf', hp: 95, spd: 1.05, pow: 1, jump: 1.1, thick: 0.9, orb: 1.1, stage: 'moon', style: 'trick', blink: true, bio: 'Dashes blink straight through you' },
    { id: 'onyx', name: 'Onyx', col: '#30303c', dark: '#111118', line: '#ffcf4a', deco: 'crown', hp: 120, spd: 1.08, pow: 1.2, jump: 1.05, thick: 1.1, orb: 1.25, stage: 'summit', style: 'boss', bio: 'The undefeated champion' },
  ];
  var LADDER = ['dabble', 'brisk', 'bulwark', 'volta', 'ember', 'mirage', 'onyx'];
  function rosterById(id) { for (var i = 0; i < ROSTER.length; i++) if (ROSTER[i].id === id) return ROSTER[i]; return ROSTER[0]; }

  var STAGES = {
    hall: { name: 'Brush Hall', sky: ['#2b1d14', '#5a3a22', '#8a5a32'], floor: '#5d3b22', line: '#7d5233', deco: 'dojo', fx: 'dust' },
    dojo: { name: 'Paper Dojo', sky: ['#3a2a1c', '#6e5232', '#c9a36a'], floor: '#7a5532', line: '#9a6f44', deco: 'dojo', fx: 'dust' },
    roof: { name: 'Neon Rooftop', sky: ['#0c0a24', '#2a1450', '#b8407a'], floor: '#2b2b3d', line: '#4a4a66', deco: 'neon', fx: 'rain' },
    harbor: { name: 'Old Harbor', sky: ['#0e2436', '#2e5d7a', '#f2b880'], floor: '#4a3a2e', line: '#6a5442', deco: 'harbor', fx: 'none' },
    plant: { name: 'Power Station', sky: ['#081417', '#123c42', '#2a8f88'], floor: '#2a3336', line: '#3f4d52', deco: 'pylons', fx: 'sparks' },
    volcano: { name: 'Ember Temple', sky: ['#1a0705', '#5a1a0c', '#d4581f'], floor: '#3b2420', line: '#5a3830', deco: 'temple', fx: 'embers' },
    moon: { name: 'Moon Garden', sky: ['#0a0b22', '#29245a', '#6e5bb3'], floor: '#2c2846', line: '#413a66', deco: 'bamboo', fx: 'petals' },
    summit: { name: 'Storm Summit', sky: ['#07080d', '#1f2230', '#4a4f66'], floor: '#3a3d4a', line: '#555a6c', deco: 'peaks', fx: 'snow' },
  };

  var CSS = [
    '.sd-pause{position:absolute;z-index:6;top:8px;left:50%;transform:translateX(-50%);margin-top:80px;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(5,6,14,.55);color:#fff;display:none;place-items:center;cursor:pointer;padding:0;touch-action:manipulation}',
    '.sd-pause svg{width:16px;height:16px}',
    '.sd-touch{position:absolute;left:0;right:0;bottom:0;height:0;z-index:5;pointer-events:none}',
    '.sd-pad{position:absolute;pointer-events:auto;border-radius:50%;background:rgba(10,12,24,.42);border:2px solid rgba(255,255,255,.3);touch-action:none;user-select:none;-webkit-user-select:none}',
    '.sd-pad i{position:absolute;width:0;height:0;border:9px solid transparent;opacity:.75}',
    '.sd-pad .u{left:50%;top:8%;transform:translateX(-50%);border-bottom-color:#fff;border-top:0}',
    '.sd-pad .d{left:50%;bottom:8%;transform:translateX(-50%);border-top-color:#fff;border-bottom:0}',
    '.sd-pad .l{top:50%;left:8%;transform:translateY(-50%);border-right-color:#fff;border-left:0}',
    '.sd-pad .r{top:50%;right:8%;transform:translateY(-50%);border-left-color:#fff;border-right:0}',
    '.sd-knob{position:absolute;width:38%;height:38%;left:31%;top:31%;border-radius:50%;background:rgba(255,255,255,.28);pointer-events:none}',
    '.sd-tb{position:absolute;pointer-events:auto;display:grid;place-items:center;border-radius:50%;background:rgba(10,12,24,.42);border:2px solid rgba(255,255,255,.34);color:#fff;font:900 13px system-ui,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer}',
    '.sd-tb.on{background:rgba(255,255,255,.34);transform:scale(.94)}',
    '.sd-tb.l{background:rgba(70,166,255,.3);border-color:rgba(160,210,255,.75)}',
    '.sd-tb.h{background:rgba(255,90,95,.32);border-color:rgba(255,170,170,.75)}',
    '.sd-tb.b{background:rgba(120,130,150,.32)}',
    '.sd-tb.s{background:rgba(164,107,255,.32);border-color:rgba(210,180,255,.75)}',
    '.sd-tb.x{background:rgba(255,207,74,.45);border-color:#ffe08a;color:#1a1300;display:none}',
    '.sd-panel{width:min(560px,100%)!important;padding:18px!important}',
    '.sd-lab{font:800 11px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#8f95c0);margin:0 0 6px;text-align:left}',
    '.sd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:12px}',
    '.sd-card{font:inherit;color:#fff;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:4px 4px 6px;cursor:pointer;min-width:0}',
    '.sd-card canvas{width:100%;height:auto;display:block}',
    '.sd-card b{display:block;font-size:12.5px;line-height:1.2}',
    '.sd-card small{display:block;font-size:10.5px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sd-card.sel{border-color:var(--accent-2,#2dd4f0);background:rgba(45,212,240,.14);box-shadow:inset 0 0 0 1px var(--accent-2,#2dd4f0)}',
    '.sd-card.p2{border-color:#ff9f43;background:rgba(255,159,67,.14);box-shadow:inset 0 0 0 1px #ff9f43}',
    '.sd-card[disabled]{opacity:.35;cursor:not-allowed}',
    '.sd-row{display:flex;gap:6px;margin-bottom:12px}',
    '.sd-chip{flex:1 1 0;font:800 13px system-ui,sans-serif;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:8px 4px;cursor:pointer;white-space:nowrap}',
    '.sd-chip.sel{border-color:var(--accent-2,#2dd4f0);background:rgba(45,212,240,.16);box-shadow:inset 0 0 0 1px var(--accent-2,#2dd4f0)}',
    '.sd-keys{font-size:12px;color:var(--muted,#8f95c0);margin:0 0 12px;line-height:1.7}',
    '.sd-keys kbd{font:700 11px ui-monospace,monospace;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff}',
    '.sd-stat{font-size:13px;color:var(--text-2,#c4c8ea);margin:-2px 0 12px}',
    '.sd-moves{width:100%;border-collapse:collapse;font-size:13px;margin:0 0 12px;text-align:left}',
    '.sd-moves td{padding:5px 6px;border-top:1px solid rgba(255,255,255,.08);color:#fff}',
    '.sd-moves td:last-child{color:var(--text-2,#c4c8ea);white-space:nowrap}',
    '.sd-big{font:900 clamp(28px,7vw,42px) system-ui,sans-serif;color:#ffd23f;margin:0 0 4px}',
    '@media (max-width:520px),(max-height:500px){.sd-keys{display:none}.sd-card small{display:none}.sd-panel{padding:12px!important}.sd-grid{gap:4px;margin-bottom:8px}.sd-row{margin-bottom:8px}}',
  ].join('\n');
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('stick-duel', function (ctx) {
    var root = ctx.root, ui = IGAME.ui;
    var TITLE = ctx.title || 'Inkfist Duel';
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var saved = ctx.store.get('save', null) || {};
    saved.unlocked = Array.isArray(saved.unlocked) ? saved.unlocked : ['quill'];
    if (saved.unlocked.indexOf('quill') < 0) saved.unlocked.unshift('quill');
    saved.best = saved.best || 0;
    saved.bestStage = saved.bestStage || 0;
    saved.clears = saved.clears || 0;
    saved.diff = clamp(saved.diff == null ? 1 : saved.diff, 0, 2);
    saved.p1 = saved.p1 || 'quill';
    saved.p2 = saved.p2 || 'ember';
    saved.p2cpu = saved.p2cpu == null ? false : !!saved.p2cpu;
    function persist() { ctx.store.set('save', saved); }

    var W = 0, H = 0, Z = 100, floorSY = 0, availH = 0;
    var view = IGAME.createCanvas(root, { onResize: function (w, h) { W = w; H = h; layout(); } });
    var g = view.ctx, canvas = view.canvas;

    /* ---------------- state ---------------- */
    var phase = 'menu'; // menu | intro | fight | ko | over | paused
    var pausedFrom = '';
    var P = []; // two fighters
    var shots = [];
    var cam = { x: STAGE_W / 2, shake: 0 };
    var stage = STAGES.hall;
    var mode = 'arcade'; // arcade | versus | demo
    var arcade = null; // {idx, score, ladder:[ids], level}
    var roundNo = 1, timer = 60, phaseT = 0, hitstop = 0, superFreeze = 0, superBy = null, slow = 0;
    var frameAcc = 0, time = 0, frames = 0;
    var overlay = null;
    var banner = null;
    var roundLog = null;
    var lightning = 0;

    /* particles & popups */
    var MAXP = 200, PT = [];
    for (var i0 = 0; i0 < MAXP; i0++) PT.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 0, c: '', k: 0, a: 0 });
    var pHead = 0;
    function part(k, x, y, vx, vy, life, s, c) {
      var p = PT[pHead];
      pHead = (pHead + 1) % MAXP;
      p.on = true; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.s = s; p.c = c; p.a = Math.random() * TAU;
    }
    function spark(x, y, n, c, spd) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * TAU, s = rand(0.4, 1) * (spd || 8);
        part(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.15, 0.32), rand(0.04, 0.07), c);
      }
    }
    var ambient = [];
    function buildAmbient() {
      ambient = [];
      for (var i = 0; i < 40; i++) ambient.push({ x: Math.random() * (STAGE_W + 6) - 3, y: Math.random() * 6, s: rand(0.5, 1.3), v: rand(0.3, 1), ph: Math.random() * TAU });
    }

    /* ---------------- sound ---------------- */
    var demo = function () { return mode === 'demo'; };
    function sfx(n) { if (!demo()) ctx.sfx(n); }
    function tone(o) { if (!demo()) IGAME.sfx.tone(o); }
    function noise(o) { if (!demo()) IGAME.sfx.noise(o); }
    function sndHit(heavy) {
      noise({ d: heavy ? 0.16 : 0.08, f: heavy ? 800 : 1500, v: heavy ? 0.3 : 0.2 });
      tone({ f: heavy ? 140 : 220, f2: 55, d: heavy ? 0.18 : 0.09, type: 'square', v: heavy ? 0.13 : 0.08 });
    }
    function sndBlock() { tone({ f: 900, f2: 600, d: 0.06, type: 'triangle', v: 0.09 }); noise({ d: 0.05, f: 3000, v: 0.08 }); }
    function sndWhoosh(h) { noise({ d: h ? 0.12 : 0.06, f: h ? 1800 : 2800, v: h ? 0.08 : 0.05 }); }

    /* ---------------- DOM: pause + touch ---------------- */
    var pauseBtn = ui.el('button', 'sd-pause', ICON_PAUSE);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    root.appendChild(pauseBtn);
    function onPauseClick(e) { e.stopPropagation(); pauseGame(); }
    function stopProp(e) { e.stopPropagation(); }
    pauseBtn.addEventListener('click', onPauseClick);
    pauseBtn.addEventListener('pointerdown', stopProp);

    var touchOn = !!ctx.isTouch;
    var tdir = { x: 0, y: 0 }; // d-pad state
    var touchWrap = ui.el('div', 'sd-touch');
    touchWrap.style.display = 'none';
    root.appendChild(touchWrap);
    var pad = ui.el('div', 'sd-pad', '<i class="u"></i><i class="d"></i><i class="l"></i><i class="r"></i><div class="sd-knob"></div>');
    touchWrap.appendChild(pad);
    var knob = pad.querySelector('.sd-knob');
    var padId = null;
    function padMove(e) {
      var r = pad.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var dz = r.width * 0.16;
      tdir.x = dx > dz ? 1 : dx < -dz ? -1 : 0;
      tdir.y = dy > dz ? 1 : dy < -dz ? -1 : 0;
      var m = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (r.width * 0.35));
      var a = Math.atan2(dy, dx);
      knob.style.transform = 'translate(' + Math.cos(a) * m * r.width * 0.25 + 'px,' + Math.sin(a) * m * r.width * 0.25 + 'px)';
    }
    function padDown(e) { e.preventDefault(); e.stopPropagation(); padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (er) {} padMove(e); }
    function padMv(e) { if (e.pointerId === padId) padMove(e); }
    function padUp(e) { if (e.pointerId !== padId) return; padId = null; tdir.x = tdir.y = 0; knob.style.transform = ''; }
    pad.addEventListener('pointerdown', padDown);
    pad.addEventListener('pointermove', padMv);
    pad.addEventListener('pointerup', padUp);
    pad.addEventListener('pointercancel', padUp);
    pad.addEventListener('lostpointercapture', padUp);
    var TB = {};
    var touchBlock = false;
    function makeTB(key, cls, label, aria) {
      var b = ui.el('div', 'sd-tb ' + cls, label);
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', aria);
      function on(e) {
        e.preventDefault(); e.stopPropagation();
        b.classList.add('on');
        try { b.setPointerCapture(e.pointerId); } catch (er) {}
        var f = P[0];
        if (!f || !f.human) return;
        if (key === 'b') { touchBlock = true; press(f, 'blk'); }
        else if (key === 'l') press(f, 'lp');
        else if (key === 'h') press(f, 'hp');
        else if (key === 'x') f.req = 'super';
        else if (key === 's') {
          // one-button specials for touch: SP = orb, ↓+SP = rising uppercut, →+SP = spin rush
          var fwd = tdir.x * f.face;
          f.req = tdir.y > 0 ? 'rise' : fwd > 0 ? 'rush' : 'orb';
        }
      }
      function off() { b.classList.remove('on'); if (key === 'b') touchBlock = false; }
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('lostpointercapture', off);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      touchWrap.appendChild(b);
      TB[key] = b;
    }
    makeTB('l', 'l', 'L', 'Light attack');
    makeTB('h', 'h', 'H', 'Heavy attack');
    makeTB('b', 'b', 'BLK', 'Block');
    makeTB('s', 's', 'SP', 'Special move');
    makeTB('x', 'x', 'SUPER', 'Super move');
    var touchH = 0;
    function touchVisible() { return touchOn && mode !== 'demo' && P[0] && P[0].human === 1 && !(P[1] && P[1].human) && (phase === 'fight' || phase === 'intro' || phase === 'ko'); }
    function layout() {
      if (!TB || !TB.l || !W) { compute(); return; }
      var m = Math.min(W, H);
      var s = Math.round(clamp(m * 0.15, 48, 74)), padS = Math.round(clamp(m * 0.03, 10, 18));
      var ds = Math.round(s * 2.05);
      pad.style.width = pad.style.height = ds + 'px';
      pad.style.left = padS + 'px';
      pad.style.bottom = padS + 'px';
      function pos(b, cx, bottom, size) {
        b.style.width = b.style.height = size + 'px';
        b.style.left = Math.round(cx - size / 2) + 'px';
        b.style.bottom = Math.round(bottom) + 'px';
      }
      var gap = Math.round(s * 0.14);
      var c2 = W - padS - s / 2, c1 = c2 - s - gap;
      pos(TB.h, c2, padS + s + gap, s);
      pos(TB.l, c1, padS + s + gap, s);
      pos(TB.s, c2, padS, s);
      pos(TB.b, c1, padS, s);
      pos(TB.x, c1 - s - gap * 0.5, padS + s * 0.5, Math.round(s * 0.95));
      TB.x.style.fontSize = '11px';
      touchH = touchVisible() ? padS + Math.max(ds, s * 2 + gap) + 6 : 0;
      compute();
    }
    function compute() {
      availH = Math.max(160, H - touchH);
      Z = Math.max(20, Math.min(W / VIEW_W, availH / 4.5));
      floorSY = availH - Math.min(0.6 * Z, availH * 0.14);
    }
    function syncTouch() {
      var v = touchVisible();
      touchWrap.style.display = v ? '' : 'none';
      if (!v) { tdir.x = tdir.y = 0; touchBlock = false; }
      pauseBtn.style.display = mode !== 'demo' && (phase === 'fight' || phase === 'intro' || phase === 'ko') ? 'grid' : 'none';
      layout();
    }

    /* ------------------------------------------------------------------ */
    /* Fighters                                                            */
    /* ------------------------------------------------------------------ */
    function makeFighter(side, ch, human, level) {
      return {
        side: side, ch: ch, human: human, level: level || 0.5,
        x: side ? STAGE_W / 2 + 1.6 : STAGE_W / 2 - 1.6, y: 0, vx: 0, vy: 0, face: side ? -1 : 1, ground: true,
        maxHp: ch.hp, hp: ch.hp, trail: ch.hp, meter: 0, rounds: 0,
        state: 'idle', sf: 0, move: null, mf: 0, hitN: 0, hitCd: 0, didHit: false, airUsed: false,
        stun: 0, kdT: 0, inv: 0, combo: 0, comboDmg: 0, comboShow: 0, comboShowDmg: 0, comboT: 0, counterT: 0,
        pose: new Float32Array(PZ.stance), from: new Float32Array(PZ.stance), anim: ANIM.idle, af: 0,
        J: new Float32Array(24), flash: 0, after: [], afterT: 0,
        held: { l: false, r: false, u: false, d: false, blk: false }, buf: { lp: 0, hp: 0, blk: 0 }, lastPress: { lp: -99, hp: -99 },
        hist: new Int8Array(24), histN: 0, tap: { dir: 0, t: -99 }, req: null, dashDir: 0, thrownBy: null,
        ai: human ? null : { t: 0, plan: [], hold: 0, holdDir: 0, crouch: false, block: 0, react: [], wait: 0 },
        stats: { dmg: 0, maxCombo: 0, supers: 0 },
      };
    }

    function setAnim(f, a) {
      if (f.anim === a) return;
      f.from.set(f.pose);
      f.anim = a;
      f.af = 0;
    }
    function evalAnim(f) {
      var a = f.anim, keys = a.keys, t = f.af, prev = f.from, total = 0, i;
      if (a.loop) {
        for (i = 0; i < keys.length; i++) total += keys[i][0];
        if (t >= total) { prev = keys[keys.length - 1][1]; t = t % total; }
      }
      for (i = 0; i < keys.length; i++) {
        var d = keys[i][0];
        if (t < d) { lerpPose(f.pose, prev, keys[i][1], ease((t + 1) / d)); return; }
        t -= d;
        prev = keys[i][1];
      }
      f.pose.set(prev);
    }
    function lerpPose(out, a, b, u) { for (var i = 0; i < 12; i++) out[i] = a[i] + (b[i] - a[i]) * u; }

    // Joints in facing space (y up): 0 hip, 1 neck, 2 head, 3 shoulder, 4 front elbow, 5 front hand,
    // 6 back elbow, 7 back hand, 8 front knee, 9 front foot, 10 back knee, 11 back foot
    var IKO = new Float32Array(4);
    function solve(f) {
      var p = f.pose, J = f.J, th = f.ch.thick;
      var hx = p[0], hy = p[1], t = p[2];
      if (f.state === 'idle') hy += Math.sin(time * 4 + f.side) * 0.015;
      var st = Math.sin(t), ct = Math.cos(t);
      J[0] = hx; J[1] = hy;
      J[2] = hx + st * L_T; J[3] = hy + ct * L_T;
      var ht = t + p[3];
      J[4] = J[2] + Math.sin(ht) * (L_NECK + R_HEAD); J[5] = J[3] + Math.cos(ht) * (L_NECK + R_HEAD);
      J[6] = hx + st * (L_T - 0.06); J[7] = hy + ct * (L_T - 0.06);
      var ua = L_UA * (0.9 + th * 0.1), fa = L_FA * (0.9 + th * 0.1);
      ik(J[6], J[7], J[6] + p[4], J[7] + p[5], ua, fa, -1);
      J[8] = IKO[0]; J[9] = IKO[1]; J[10] = IKO[2]; J[11] = IKO[3];
      ik(J[6], J[7], J[6] + p[6], J[7] + p[7], ua, fa, -1);
      J[12] = IKO[0]; J[13] = IKO[1]; J[14] = IKO[2]; J[15] = IKO[3];
      ik(hx, hy, p[8], p[9], L_TH, L_SH, 1);
      J[16] = IKO[0]; J[17] = IKO[1]; J[18] = IKO[2]; J[19] = IKO[3];
      ik(hx, hy, p[10], p[11], L_TH, L_SH, 1);
      J[20] = IKO[0]; J[21] = IKO[1]; J[22] = IKO[2]; J[23] = IKO[3];
    }
    // 2-bone IK: joint bends counter-clockwise for bend = +1 (knees forward), clockwise for -1 (elbows down).
    function ik(rx, ry, tx, ty, l1, l2, bend) {
      var dx = tx - rx, dy = ty - ry, d = Math.sqrt(dx * dx + dy * dy);
      var maxd = l1 + l2 - 0.002;
      if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
      if (d < 0.02) { d = 0.02; dy = -0.02; dx = 0; }
      var a = Math.atan2(dy, dx);
      var c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
      var ja = a + bend * Math.acos(clamp(c, -1, 1));
      IKO[0] = rx + Math.cos(ja) * l1; IKO[1] = ry + Math.sin(ja) * l1;
      IKO[2] = rx + dx; IKO[3] = ry + dy;
    }
    var LIMB_J = { fh: 10, bh: 14, ff: 18, bf: 22 };
    function limbWorld(f, lim) {
      var j = LIMB_J[lim];
      return [f.x + f.face * f.J[j], f.y + f.J[j + 1]];
    }
    function hurtBox(f) {
      var J = f.J;
      var top = J[5] + R_HEAD;
      var cx = f.x + f.face * (J[0] + J[2]) * 0.5;
      return [cx - 0.33, f.y + Math.max(0, Math.min(J[19], J[23])), cx + 0.33, f.y + top];
    }

    /* ---------------- input ---------------- */
    var K = ctx.keys;
    function press(f, b) {
      f.buf[b] = 6;
      if (b === 'lp' || b === 'hp') {
        f.lastPress[b] = frames;
        if (Math.abs(f.lastPress.lp - f.lastPress.hp) <= 4 && f.meter >= 100) f.req = 'super';
      }
    }
    function readHeld(f) {
      var h = f.held;
      if (f.human === 1 && (mode === 'arcade' || (mode === 'versus' && saved.p2cpu))) {
        h.l = !!(K.KeyA || K.ArrowLeft) || tdir.x < 0;
        h.r = !!(K.KeyD || K.ArrowRight) || tdir.x > 0;
        h.u = !!(K.KeyW || K.ArrowUp || K.Space) || tdir.y < 0;
        h.d = !!(K.KeyS || K.ArrowDown) || tdir.y > 0;
        h.blk = !!(K.KeyL || K.KeyC) || touchBlock;
      } else if (f.human === 1) {
        h.l = !!K.KeyA; h.r = !!K.KeyD; h.u = !!K.KeyW; h.d = !!K.KeyS; h.blk = !!K.KeyH;
      } else if (f.human === 2) {
        h.l = !!K.ArrowLeft; h.r = !!K.ArrowRight; h.u = !!K.ArrowUp; h.d = !!K.ArrowDown; h.blk = !!(K.KeyL || K.Numpad3);
      }
    }
    // numpad notation relative to facing: 1..9 (5 = neutral)
    function dirOf(f) {
      var h = f.held;
      var x = (h.r ? 1 : 0) - (h.l ? 1 : 0);
      x *= f.face;
      var y = h.u ? 1 : h.d ? -1 : 0;
      return 5 + x + y * 3;
    }
    function recordDir(f) {
      var d = dirOf(f);
      f.hist[f.histN % 24] = d;
      f.histN++;
      // double-tap forward/back → dash
      var x = d === 6 || d === 4 ? d : 0;
      var prevD = f.histN > 1 ? f.hist[(f.histN - 2) % 24] : 5;
      if (x && prevD !== x && prevD !== x + 3 && prevD !== x - 3) {
        if (f.tap.dir === x && frames - f.tap.t < 14) { f.dashDir = x === 6 ? 1 : -1; f.tap.t = -99; }
        else { f.tap.dir = x; f.tap.t = frames; }
      }
    }
    function motion(f) {
      // look back ~16 frames for a down input followed by forward (QCF) or back (QCB).
      // A diagonal right after a pure down also counts, and so does diagonal → straight.
      var n = Math.min(16, f.histN), down = 0, res = null;
      for (var k = n; k >= 1; k--) {
        var d = f.hist[(f.histN - k + 24) % 24];
        if (d === 2) { down = 2; continue; }
        if (down === 2 && d === 3) { res = 'qcf'; down = 3; continue; }
        if (down === 2 && d === 1) { res = 'qcb'; down = 1; continue; }
        if (d === 3 || d === 1) { if (!down) down = d; continue; }
        if (down && (d === 6 || d === 9) && down !== 1) res = 'qcf';
        else if (down && (d === 4 || d === 7) && down !== 3) res = 'qcb';
      }
      return res;
    }

    /* ------------------------------------------------------------------ */
    /* Match flow                                                          */
    /* ------------------------------------------------------------------ */
    function startDemo() {
      mode = 'demo';
      var a = ROSTER[Math.floor(Math.random() * ROSTER.length)], b = ROSTER[Math.floor(Math.random() * ROSTER.length)];
      P = [makeFighter(0, a, 0, 0.55), makeFighter(1, b, 0, 0.55)];
      stage = STAGES[b.stage];
      buildAmbient();
      startRound(true);
    }
    function startArcade(ch) {
      mode = 'arcade';
      var ladder = LADDER.map(function (id) { return id === ch ? 'quill' : id; });
      arcade = { idx: 0, score: 0, ladder: ladder, ch: ch };
      nextArcadeMatch();
    }
    function arcadeLevel(i) {
      return clamp(0.12 + i * 0.13 + [-0.12, 0, 0.15][saved.diff], 0.02, 1);
    }
    function nextArcadeMatch() {
      var opp = rosterById(arcade.ladder[arcade.idx]);
      P = [makeFighter(0, rosterById(arcade.ch), 1), makeFighter(1, opp, 0, arcadeLevel(arcade.idx))];
      stage = STAGES[opp.stage];
      buildAmbient();
      roundNo = 1;
      startRound(false);
    }
    function startVersus() {
      mode = 'versus';
      P = [makeFighter(0, rosterById(saved.p1), 1), makeFighter(1, rosterById(saved.p2), saved.p2cpu ? 0 : 2, [0.3, 0.55, 0.85][saved.diff])];
      stage = STAGES[rosterById(saved.p2).stage];
      buildAmbient();
      roundNo = 1;
      startRound(false);
    }
    function startRound(isDemo) {
      shots.length = 0;
      P.forEach(function (f, i) {
        f.x = STAGE_W / 2 + (i ? 1.7 : -1.7); f.y = 0; f.vx = f.vy = 0; f.ground = true; f.face = i ? -1 : 1;
        f.hp = f.trail = f.maxHp; f.state = 'idle'; f.move = null; f.stun = 0; f.inv = 0; f.combo = 0; f.comboShow = 0; f.req = null; f.dashDir = 0;
        f.pose.set(PZ.stance); f.from.set(PZ.stance); f.anim = ANIM.idle; f.af = 0; f.after.length = 0;
        f.buf.lp = f.buf.hp = f.buf.blk = 0;
        if (f.ai) { f.ai.plan.length = 0; f.ai.t = 30; f.ai.block = 0; }
        solve(f);
      });
      cam.x = STAGE_W / 2;
      timer = 60;
      phaseT = 0;
      hitstop = superFreeze = slow = 0;
      roundLog = { perfect: false, time: false };
      if (isDemo) { phase = 'fight'; }
      else {
        phase = 'intro';
        var fin = P[0].rounds === 1 && P[1].rounds === 1;
        setBanner(fin ? 'FINAL ROUND' : 'ROUND ' + roundNo, mode === 'arcade' ? 'vs ' + P[1].ch.name + ' · ' + stage.name : stage.name, '#fff', 80);
        tone({ f: 330, d: 0.12, type: 'triangle', v: 0.1 }); tone({ f: 440, d: 0.18, type: 'triangle', v: 0.1, delay: 0.12 });
      }
      syncTouch();
    }

    function setBanner(text, sub, c, dur) { banner = { text: text, sub: sub || '', c: c, t: 0, max: dur }; }

    function endRound(winner, why) {
      phase = 'ko';
      phaseT = 0;
      if (winner) {
        winner.rounds++;
        var loser = P[winner.side ^ 1];
        if (winner.hp >= winner.maxHp) roundLog.perfect = true;
        if (mode === 'arcade' && winner.human) {
          var add = 1000 + Math.ceil(timer) * 50 + (roundLog.perfect ? 3000 : 0) + (why === 'super' ? 2000 : 0);
          arcade.score += add;
        }
        if (why === 'time') setBanner('TIME', winner.ch.name + ' wins the round', '#fff', 150);
        else setBanner('K.O.!', roundLog.perfect ? 'PERFECT' : '', '#ffd23f', 150);
        void loser;
      } else setBanner(why === 'time' ? 'TIME — DRAW' : 'DOUBLE K.O.', '', '#fff', 150);
      if (!demo()) { sfx('explode'); tone({ f: 200, f2: 60, d: 0.6, type: 'sawtooth', v: 0.08 }); }
      roundLog.winner = winner;
    }

    function afterRound() {
      var w = roundLog.winner;
      if (demo()) {
        if (P[0].rounds >= 2 || P[1].rounds >= 2) { startDemo(); return; }
        roundNo++; startRound(true); return;
      }
      var champ = P[0].rounds >= 2 ? P[0] : P[1].rounds >= 2 ? P[1] : null;
      if (P[0].rounds >= 2 && P[1].rounds >= 2) champ = P[0].hp >= P[1].hp ? P[0] : P[1];
      if (!champ && roundNo >= 5) champ = P[0].rounds >= P[1].rounds ? P[0] : P[1];
      if (!champ) { roundNo++; startRound(false); return; }
      void w;
      matchOver(champ);
    }

    function matchOver(champ) {
      phase = 'over';
      syncTouch();
      P.forEach(function (f) { if (f === champ) { f.state = 'win'; setAnim(f, ANIM.win); } });
      if (mode === 'arcade') {
        if (champ.human) {
          var opp = P[1].ch.id;
          if (saved.unlocked.indexOf(opp) < 0) saved.unlocked.push(opp);
          arcade.score += Math.round(P[0].stats.dmg * 10) + P[0].stats.maxCombo * P[0].stats.maxCombo * 20;
          saved.bestStage = Math.max(saved.bestStage, arcade.idx + 1);
          sfx('win');
          if (arcade.idx >= arcade.ladder.length - 1) {
            saved.clears++;
            saved.best = Math.max(saved.best, arcade.score);
            persist();
            showChampion();
          } else {
            saved.best = Math.max(saved.best, arcade.score);
            persist();
            showLadder(true);
          }
        } else {
          sfx('lose');
          saved.best = Math.max(saved.best, arcade.score);
          persist();
          showLose();
        }
      } else {
        sfx('win');
        showVersusEnd(champ);
      }
    }

    /* ------------------------------------------------------------------ */
    /* Simulation                                                          */
    /* ------------------------------------------------------------------ */
    function canAct(f) {
      return f.state === 'idle' || f.state === 'walk' || f.state === 'crouch' || f.state === 'block' || f.state === 'cblock';
    }
    function isCrouching(f) { return f.state === 'crouch' || f.state === 'cblock' || (f.move && f.move.crouch); }

    function startMove(f, id) {
      var m = MOVES[id];
      if (id === 'orb' && countOrbs(f) > 0) return false;
      if (id === 'super') {
        if (f.meter < 100) return false;
        f.meter = 0;
        superFreeze = 40;
        superBy = f;
        f.stats.supers++;
        sfx('levelup');
        tone({ f: 220, f2: 880, d: 0.5, type: 'sawtooth', v: 0.07 });
        cam.shake = 0.3;
        for (var i = 0; i < 24; i++) { var a = (i / 24) * TAU; part(0, f.x, f.y + 1.1, Math.cos(a) * 7, Math.sin(a) * 7, 0.5, 0.07, f.ch.col); }
      }
      f.state = m.air ? 'airatk' : 'attack';
      f.move = m;
      f.mf = 0;
      f.hitN = 0;
      f.hitCd = 0;
      f.didHit = false;
      f.inv = m.inv || 0;
      if (m.air) f.airUsed = true;
      setAnim(f, m.anim);
      f.af = 0;
      if (m.special && id !== 'orb') sndWhoosh(true);
      else sndWhoosh(m.heavy);
      if (id === 'rise') { f.ground = false; f.vy = 9.5 * (0.9 + f.ch.jump * 0.1); f.vx = f.face * 1.2; }
      return true;
    }
    function countOrbs(f) { var n = 0; for (var i = 0; i < shots.length; i++) if (shots[i].owner === f) n++; return n; }

    // Decide which move (if any) the current inputs ask for.
    function wantedMove(f) {
      if (f.req) { var r = f.req; f.req = null; return r; }
      var air = !f.ground;
      var mo = (f.buf.lp > 0 || f.buf.hp > 0) ? motion(f) : null;
      if (f.buf.lp > 0 || f.buf.hp > 0) {
        var heavy = f.buf.hp > 0;
        f.buf.lp = f.buf.hp = 0;
        if (!air && mo === 'qcf') return heavy ? 'rush' : 'orb';
        if (!air && mo === 'qcb') return 'rise';
        if (air) return f.airUsed ? null : heavy ? 'jhp' : 'jlp';
        if (f.held.d) return heavy ? 'chp' : 'clp';
        return heavy ? 'hp' : 'lp';
      }
      if (f.buf.blk > 0 && !air) {
        var d = dirOf(f);
        if (d === 6 || d === 9) {
          var o = P[f.side ^ 1];
          if (Math.abs(o.x - f.x) < 1.15) { f.buf.blk = 0; return 'throw'; }
        }
      }
      return null;
    }

    function stepFighter(f) {
      var o = P[f.side ^ 1];
      for (var b in f.buf) if (f.buf[b] > 0) f.buf[b]--;
      if (f.inv > 0) f.inv--;
      if (f.flash > 0) f.flash--;
      if (f.comboT > 0) { f.comboT--; if (!f.comboT) f.comboShow = 0; }
      if (f.counterT > 0) f.counterT--;
      f.sf++;
      f.af++;
      var fighting = phase === 'fight';
      var spd = f.ch.spd;

      // trail of the health bar drains toward real health
      if (f.trail > f.hp) f.trail = Math.max(f.hp, f.trail - f.maxHp * 0.006);

      switch (f.state) {
        case 'idle': case 'walk': case 'crouch': case 'block': case 'cblock': {
          if (f.ground && !f.move) f.face = o.x >= f.x ? 1 : -1;
          if (!fighting) { f.state = 'idle'; setAnim(f, ANIM.idle); f.vx = 0; break; }
          var want = wantedMove(f);
          if (want && startMove(f, want)) break;
          if (f.dashDir) {
            var dd = f.dashDir; f.dashDir = 0;
            f.state = 'dash'; f.sf = 0; f.vx = dd * f.face * DASH_V * (dd > 0 ? spd : 0.85);
            if (f.ch.blink && dd > 0) f.vx *= 1.25;
            setAnim(f, dd > 0 ? ANIM.dash : ANIM.backdash);
            sfx('slide');
            break;
          }
          var d = dirOf(f);
          if (d >= 7) {
            f.state = 'jsq'; f.sf = 0; f.jdir = d === 9 ? 1 : d === 7 ? -1 : 0; f.vx = 0;
            break;
          }
          if (f.held.blk) {
            f.state = d <= 3 ? 'cblock' : 'block';
            setAnim(f, d <= 3 ? ANIM.cblock : ANIM.block);
            f.vx = 0;
          } else if (d <= 3) {
            f.state = 'crouch'; setAnim(f, ANIM.crouch); f.vx = 0;
          } else if (d === 6) {
            f.state = 'walk'; setAnim(f, ANIM.walkF); f.vx = f.face * WALK * spd;
          } else if (d === 4) {
            f.state = 'walk'; setAnim(f, ANIM.walkB); f.vx = -f.face * BACK * spd;
          } else {
            f.state = 'idle'; setAnim(f, ANIM.idle); f.vx = 0;
          }
          break;
        }
        case 'jsq':
          f.vx = 0;
          if (f.sf >= 3) {
            f.state = 'air'; f.ground = false; f.airUsed = false;
            f.vy = JUMP_V * (0.92 + f.ch.jump * 0.08);
            f.vx = f.jdir * f.face * 3.3 * (0.85 + spd * 0.15);
            setAnim(f, ANIM.jump);
            tone({ f: 260, f2: 520, d: 0.08, type: 'triangle', v: 0.05 });
          }
          break;
        case 'air':
          if (fighting && !f.airUsed) { var aw = wantedMove(f); if (aw === 'jlp' || aw === 'jhp' || aw === 'super') startMove(f, aw); }
          break;
        case 'dash':
          f.vx *= 0.9;
          if (f.ch.blink && f.sf < 10 && Math.abs(f.vx) > 3 && f.sf % 2 === 0) f.after.push({ x: f.x, y: f.y, face: f.face, pose: new Float32Array(f.pose), a: 0.5 });
          if (f.sf >= 16) { f.state = 'idle'; f.vx = 0; }
          break;
        case 'attack': case 'airatk':
          runMove(f, o);
          break;
        case 'hit':
          f.stun--;
          if (f.ground) f.vx *= 0.86;
          if (f.stun <= 0 && f.ground) { f.state = 'idle'; f.combo = 0; }
          break;
        case 'bstun':
          f.stun--;
          f.vx *= 0.85;
          if (f.stun <= 0) { f.state = f.held.d ? 'cblock' : 'block'; }
          break;
        case 'launch':
          break; // handled on landing
        case 'down':
          f.vx *= 0.8;
          if (f.sf >= 38 && f.hp > 0) { f.state = 'getup'; f.sf = 0; setAnim(f, ANIM.getup); f.inv = 22; }
          break;
        case 'getup':
          if (f.sf >= 20) { f.state = 'idle'; f.combo = 0; }
          break;
        case 'thrown':
          throwStep(f);
          break;
        case 'toss':
          f.vx = 0;
          if (f.sf >= 30) f.state = 'idle';
          break;
        case 'ko':
        case 'win':
          f.vx *= 0.85;
          break;
      }

      // physics
      if (f.state !== 'thrown') {
        if (!f.ground) f.vy -= GRAV * STEP;
        f.x += f.vx * STEP;
        f.y += f.vy * STEP;
        if (f.y <= 0) {
          f.y = 0;
          if (!f.ground) land(f);
        }
      }
      if (f.after.length) {
        for (var a2 = f.after.length - 1; a2 >= 0; a2--) { f.after[a2].a -= 0.05; if (f.after[a2].a <= 0) f.after.splice(a2, 1); }
      }
    }

    function land(f) {
      f.ground = true;
      f.vy = 0;
      if (f.state === 'launch' || (f.state === 'hit' && f.wasAir) || f.state === 'ko') {
        f.state = f.hp <= 0 ? 'ko' : 'down';
        f.sf = 0;
        f.vx *= 0.4;
        setAnim(f, ANIM.down);
        cam.shake = Math.max(cam.shake, 0.18);
        for (var i = 0; i < 6; i++) part(1, f.x + rand(-0.5, 0.5), 0.05, rand(-1, 1), rand(0.2, 1), 0.5, rand(0.12, 0.22), 'rgba(220,210,200,0.45)');
        noise({ d: 0.15, f: 400, v: 0.15 });
        f.wasAir = false;
        return;
      }
      if (f.state === 'airatk') { f.state = 'idle'; f.move = null; }
      else if (f.state === 'attack' && f.move && f.move.id === 'rise') { /* recovery continues on ground */ }
      else if (f.state === 'air') { f.state = 'idle'; }
      if (f.state === 'idle') { f.vx = 0; f.sf = 0; setAnim(f, ANIM.idle); }
      for (var j = 0; j < 3; j++) part(1, f.x + rand(-0.3, 0.3), 0.05, rand(-0.8, 0.8), rand(0.2, 0.6), 0.35, rand(0.08, 0.14), 'rgba(220,210,200,0.35)');
    }

    function runMove(f, o) {
      var m = f.move;
      f.mf++;
      if (f.hitCd > 0) f.hitCd--;
      var activeStart = m.st, activeEnd = m.st + m.ac;
      // movement during specials
      if (m.id === 'rush') { if (f.mf > m.st && f.mf <= activeEnd) f.vx = f.face * 5.2 * (f.ch.style === 'rush' ? 1.3 : 1); else f.vx *= 0.8; }
      else if (m.id === 'super') { if (f.mf > m.st && f.mf <= activeEnd) f.vx = f.face * (Math.abs(o.x - f.x) > 0.9 ? 8 : 1); else f.vx *= 0.8; }
      else if (m.id === 'lp' || m.id === 'hp' || m.id === 'clp' || m.id === 'chp' || m.id === 'throw' || m.id === 'orb') { if (f.ground) f.vx = m.id === 'hp' && f.mf < m.st ? f.face * 0.8 : 0; }
      if (m.id === 'super' && f.mf > m.st && f.mf % 3 === 0) f.after.push({ x: f.x, y: f.y, face: f.face, pose: new Float32Array(f.pose), a: 0.45 });
      // projectile
      if (m.id === 'orb' && f.mf === m.st) spawnOrb(f);
      // throw
      if (m.throwMove && f.mf === m.st + 1) {
        if (Math.abs(o.x - f.x) < 1.2 && o.ground && o.inv <= 0 && (canAct(o) || o.state === 'bstun' || o.state === 'dash') && o.state !== 'thrown') {
          doThrow(f, o);
          return;
        }
      }
      // hits
      if (m.dmg && f.mf > activeStart && f.mf <= activeEnd && o.inv <= 0 && o.state !== 'down' && o.state !== 'getup' && o.state !== 'thrown' && o.state !== 'ko') {
        var maxHits = m.multi || 1;
        if (f.hitN < maxHits && f.hitCd <= 0) {
          solve(f); solve(o);
          var hp = limbWorld(f, m.lim);
          var hb = hurtBox(o);
          var nx = clamp(hp[0], hb[0], hb[2]), ny = clamp(hp[1], hb[1], hb[3]);
          var ddx = hp[0] - nx, ddy = hp[1] - ny;
          var reach = m.r + (m.id === 'super' ? 0.3 : 0);
          if (ddx * ddx + ddy * ddy < reach * reach) {
            f.hitN++;
            f.hitCd = m.multi ? 3 : 99;
            applyHit(f, o, m, nx, ny, f.hitN === maxHits);
          }
        }
      }
      // cancels: after a connected normal, a special (or chain) may interrupt recovery
      if (f.didHit && m.cancel && f.mf <= activeEnd + 10) {
        var w = peekCancel(f, m);
        if (w) { startMove(f, w); return; }
      }
      if (f.mf >= m.total) {
        f.move = null;
        if (!f.ground) { f.state = 'air'; setAnim(f, ANIM.jump); f.af = 22; }
        else if (m.crouch && f.held.d) { f.state = 'crouch'; setAnim(f, ANIM.crouch); }
        else { f.state = 'idle'; setAnim(f, ANIM.idle); }
      }
    }
    function peekCancel(f, m) {
      if (!(f.buf.lp > 0 || f.buf.hp > 0 || f.req)) return null;
      var save = { lp: f.buf.lp, hp: f.buf.hp, req: f.req };
      var w = wantedMove(f);
      if (!w) return null;
      if (w === 'super') return w;
      var isSp = MOVES[w].special;
      if ((isSp && m.cancel.indexOf('sp') > -1) || m.cancel.indexOf(w) > -1) return w;
      f.buf.lp = save.lp; f.buf.hp = save.hp; f.req = save.req;
      return null;
    }

    function blocking(o, m) {
      if (!o.ground) return false;
      if (o.state !== 'block' && o.state !== 'cblock' && o.state !== 'bstun') {
        // holding block while walking/idling counts too (instant guard)
        if (!(canAct(o) && o.held.blk)) return false;
      }
      var crouch = o.state === 'cblock' || (o.state === 'bstun' ? o.held.d : o.held.d);
      if (m.lvl === 'low' && !crouch) return false;
      if (m.lvl === 'over' && crouch) return false;
      return true;
    }

    function applyHit(f, o, m, hx, hy, last) {
      var dir = f.face;
      var pow = f.ch.pow;
      if (blocking(o, m)) {
        o.state = 'bstun'; o.sf = 0; o.stun = m.bs; o.combo = 0;
        setAnim(o, o.held.d ? ANIM.cblock : ANIM.block);
        o.vx = dir * m.push * 0.9;
        var chip = (m.chip || 0) * pow;
        if (chip) { o.hp = Math.max(1, o.hp - chip); }
        f.meter = Math.min(100, f.meter + 3);
        o.meter = Math.min(100, o.meter + 2);
        hitstop = Math.max(hitstop, 5);
        spark(hx, hy, 6, '#9fd8ff', 6);
        part(2, hx, hy, 0, 0, 0.18, 0.35, 'rgba(160,216,255,0.9)');
        sndBlock();
        pushFromWall(f, o, m.push);
        return;
      }
      f.didHit = true;
      if (o.state !== 'hit' && o.state !== 'launch') o.combo = 0;
      var counter = (o.state === 'attack' || o.state === 'airatk') && o.mf <= o.move.st;
      var scale = Math.max(0.35, 1 - 0.12 * o.combo);
      var dmg = m.dmg * pow * scale * (counter ? 1.2 : 1);
      if (m.isSuper) dmg = m.dmg * pow * Math.max(0.6, scale);
      o.hp = Math.max(0, o.hp - dmg);
      o.combo++;
      f.comboShow = o.combo; f.comboShowDmg = (o.combo === 1 ? 0 : f.comboShowDmg) + dmg; f.comboT = 70;
      f.stats.dmg += dmg;
      f.stats.maxCombo = Math.max(f.stats.maxCombo, o.combo);
      f.meter = Math.min(100, f.meter + dmg * 1.1);
      o.meter = Math.min(100, o.meter + dmg * 0.6);
      if (counter) { f.counterT = 50; }
      o.flash = 4;
      o.move = null;
      var launch = !o.ground || m.kd && (!m.multi || last) || (m.kdLast && last) || o.hp <= 0;
      if (launch) {
        o.state = o.hp <= 0 ? 'ko' : 'launch';
        o.ground = false;
        o.vy = m.launch || (o.hp <= 0 ? 7 : 5.5);
        if (m.id === 'chp') o.vy = 3.5;
        o.vx = dir * (o.hp <= 0 ? 4 : 2.6);
        o.y = Math.max(o.y, 0.02);
        setAnim(o, ANIM.air);
      } else {
        o.state = 'hit'; o.sf = 0; o.stun = m.hs + (counter ? 6 : 0);
        o.vx = dir * m.push;
        setAnim(o, isCrouching(o) || m.lvl === 'low' ? ANIM.hitLow : ANIM.hit);
      }
      pushFromWall(f, o, m.push);
      hitstop = Math.max(hitstop, m.stop + (counter ? 4 : 0));
      if (m.heavy || m.special || counter) cam.shake = Math.max(cam.shake, m.isSuper ? 0.3 : 0.18);
      var big = m.heavy || m.special;
      spark(hx, hy, big ? 12 : 7, big ? '#ffe27a' : '#ffffff', big ? 10 : 7);
      part(2, hx, hy, 0, 0, 0.16, big ? 0.5 : 0.32, 'rgba(255,255,255,0.95)');
      sndHit(big);
      if (o.hp <= 0 && phase === 'fight') {
        slow = 70;
        endRound(f, m.isSuper ? 'super' : 'ko');
      }
    }
    // if the defender is pinned on a wall, the attacker is pushed back instead
    function pushFromWall(f, o, push) {
      if (o.x <= 0.45 || o.x >= STAGE_W - 0.45 || Math.abs(o.x - cam.x) > VIEW_W / 2 - 0.5) f.vx = -f.face * push * 0.8;
    }

    function doThrow(f, o) {
      f.state = 'toss'; f.sf = 0; f.move = null; setAnim(f, ANIM.toss);
      o.state = 'thrown'; o.sf = 0; o.thrownBy = f; o.move = null; o.combo = 0;
      o.tx0 = o.x;
      setAnim(o, ANIM.air);
      sfx('slide');
    }
    function throwStep(o) {
      var f = o.thrownBy;
      var u = o.sf / 20;
      if (u < 1) {
        // arc from in front of the thrower to behind them
        var fx = f.x + f.face * (0.7 - 1.6 * u);
        o.x = fx; o.y = Math.sin(u * Math.PI) * 1.4;
        o.face = f.face;
      } else {
        o.y = 0.3; o.ground = false; o.vx = -f.face * 2.5; o.vy = 2;
        var dmg = 12 * f.ch.pow;
        o.hp = Math.max(0, o.hp - dmg);
        f.stats.dmg += dmg;
        f.meter = Math.min(100, f.meter + 10);
        o.meter = Math.min(100, o.meter + 6);
        o.state = o.hp <= 0 ? 'ko' : 'launch';
        hitstop = 8; cam.shake = 0.25;
        spark(o.x, 0.4, 10, '#ffe27a', 8);
        sndHit(true);
        if (o.hp <= 0 && phase === 'fight') { slow = 70; endRound(f, 'ko'); }
      }
    }

    function spawnOrb(f) {
      var hp = limbWorld(f, 'fh');
      var sp = 6.5 * f.ch.orb;
      shots.push({ x: hp[0] + f.face * 0.15, y: Math.max(0.9, hp[1]), vx: f.face * sp, owner: f, r: 0.26 + (f.ch.orb > 1.2 ? 0.04 : 0), life: 3, col: f.ch.col, t: 0 });
      tone({ f: 300, f2: 700, d: 0.18, type: 'sine', v: 0.12 });
    }
    var ORB = { dmg: 8, hs: 18, bs: 12, push: 2.6, lvl: 'high', stop: 7, chip: 2, special: true, id: 'orbhit' };
    function stepShots() {
      for (var i = shots.length - 1; i >= 0; i--) {
        var s = shots[i];
        s.x += s.vx * STEP; s.t += STEP; s.life -= STEP;
        if (Math.random() < 0.6) part(1, s.x - Math.sign(s.vx) * 0.1, s.y + rand(-0.1, 0.1), -s.vx * 0.1, rand(-0.3, 0.3), 0.3, rand(0.06, 0.12), s.col);
        var dead = s.life <= 0 || s.x < cam.x - VIEW_W || s.x > cam.x + VIEW_W;
        // orbs cancel each other
        for (var j = 0; j < shots.length && !dead; j++) {
          var t = shots[j];
          if (t !== s && t.owner !== s.owner && Math.abs(t.x - s.x) < s.r + t.r) {
            spark(s.x, s.y, 12, '#fff', 6); sfx('pop');
            shots.splice(Math.max(i, j), 1); shots.splice(Math.min(i, j), 1); i--;
            dead = 'gone';
          }
        }
        if (dead === 'gone') continue;
        var o = P[s.owner.side ^ 1];
        if (!dead && o.inv <= 0 && o.state !== 'down' && o.state !== 'getup' && o.state !== 'ko' && o.state !== 'thrown') {
          solve(o);
          var hb = hurtBox(o);
          if (s.x + s.r > hb[0] && s.x - s.r < hb[2] && s.y + s.r > hb[1] && s.y - s.r < hb[3]) {
            var f = s.owner;
            var savedFace = f.face;
            f.face = s.vx > 0 ? 1 : -1;
            applyHit(f, o, ORB, s.x, s.y, true);
            f.face = savedFace;
            dead = true;
          }
        }
        if (dead) shots.splice(i, 1);
      }
    }

    // keep fighters apart, inside the stage and inside the camera view
    function separate() {
      var a = P[0], b = P[1];
      var minD = 0.62;
      var dx = b.x - a.x;
      var bothLow = a.y < 1.2 && b.y < 1.2 && a.state !== 'thrown' && b.state !== 'thrown';
      if (bothLow && Math.abs(dx) < minD) {
        var push = (minD - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
        if (Math.abs(dx) < 0.001) push = (a.face > 0 ? 1 : -1) * minD / 2;
        a.x -= push; b.x += push;
      }
      var lo = cam.x - VIEW_W / 2 + 0.4, hi = cam.x + VIEW_W / 2 - 0.4;
      P.forEach(function (f) {
        f.x = clamp(f.x, Math.max(0.4, lo - 0.6), Math.min(STAGE_W - 0.4, hi + 0.6));
        f.x = clamp(f.x, 0.4, STAGE_W - 0.4);
      });
      // max separation = view width
      var span = Math.abs(b.x - a.x), maxS = VIEW_W - 1.0;
      if (span > maxS) {
        var mid = (a.x + b.x) / 2, sgn = b.x > a.x ? 1 : -1;
        a.x = mid - sgn * maxS / 2; b.x = mid + sgn * maxS / 2;
      }
    }

    function step() {
      frames++;
      if (superFreeze > 0) {
        superFreeze--;
        superBy.af = Math.min(superBy.af + 1, 5);
        evalAnim(superBy); solve(superBy);
        return;
      }
      if (hitstop > 0) { hitstop--; return; }
      phaseT++;
      if (phase === 'intro' && phaseT >= 90) {
        phase = 'fight';
        setBanner('FIGHT!', '', '#ffd23f', 45);
        sfx('boost');
        syncTouch();
      }
      if (phase === 'fight') {
        timer -= STEP;
        if (timer <= 0) {
          timer = 0;
          var a = P[0].hp / P[0].maxHp, b = P[1].hp / P[1].maxHp;
          roundLog.time = true;
          endRound(Math.abs(a - b) < 0.001 ? null : a > b ? P[0] : P[1], 'time');
        }
      }
      for (var i = 0; i < 2; i++) {
        var f = P[i];
        if (f.human) readHeld(f);
        else if (phase === 'fight') aiThink(f);
        else f.held.l = f.held.r = f.held.u = f.held.d = f.held.blk = false;
        recordDir(f);
        if (f.buf.blk > 0 || f.held.blk) { /* used by wantedMove / state machine */ }
      }
      // both fighters update, then hits are resolved inside runMove
      stepFighter(P[0]);
      stepFighter(P[1]);
      stepShots();
      separate();
      for (var k = 0; k < 2; k++) { evalAnim(P[k]); solve(P[k]); }
      if (phase === 'ko') {
        if (phaseT === 100) {
          var w = roundLog.winner;
          if (w && w.hp > 0) { w.state = 'win'; setAnim(w, ANIM.win); }
        }
        if (phaseT >= 200) afterRound();
      }
    }

    /* ------------------------------------------------------------------ */
    /* CPU                                                                 */
    /* ------------------------------------------------------------------ */
    // Each CPU sees the opponent with a reaction delay; level 0..1 scales skill.
    function aiThink(f) {
      var ai = f.ai, o = P[f.side ^ 1], L = f.level, st = f.ch.style;
      var h = f.held;
      h.l = h.r = h.u = h.d = h.blk = false;
      var dist = Math.abs(o.x - f.x);
      var fwd = o.x > f.x ? 1 : -1; // world direction toward opponent
      ai.react.push({ st: o.state, mv: o.move, mf: o.mf, air: !o.ground, x: o.x, vy: o.vy });
      var delay = Math.round(20 - L * 13);
      while (ai.react.length > delay + 1) ai.react.shift();
      var seen = ai.react[0];
      function hold(dir) { if (dir * f.face > 0 || (dir > 0 ? fwd > 0 : fwd < 0)) { if (dir > 0) h.r = true; else h.l = true; } else { if (dir > 0) h.r = true; else h.l = true; } }
      function goFwd() { hold(fwd); }
      function goBack() { hold(-fwd); }

      // execute queued plan
      if (ai.plan.length) {
        var pstep = ai.plan[0];
        if (pstep.w > 0) { pstep.w--; if (pstep.hold === 'd') h.d = true; if (pstep.hold === 'f') goFwd(); return; }
        ai.plan.shift();
        if (pstep.abortIfMiss && !(o.state === 'hit' || o.state === 'bstun' || o.state === 'launch')) { ai.plan.length = 0; return; }
        if (pstep.b) { press(f, pstep.b); if (pstep.down) h.d = true; }
        if (pstep.m) f.req = pstep.m;
        return;
      }
      if (!canAct(f) && f.state !== 'air') return;

      // defence: block attacks seen (with delay) when close
      var threat = seen.mv && (seen.st === 'attack' || seen.st === 'airatk') && seen.mf < seen.mv.st + seen.mv.ac + 2 && dist < 2.6;
      var orbNear = false;
      for (var i = 0; i < shots.length; i++) { var s = shots[i]; if (s.owner === o && Math.abs(s.x - f.x) < 3 && (s.x - f.x) * s.vx < 0) orbNear = true; }
      if (ai.block > 0) {
        ai.block--;
        h.blk = true;
        if (ai.crouch) h.d = true;
        return;
      }
      var blockP = 0.12 + L * 0.75 + (st === 'tank' ? 0.1 : 0) - (st === 'rookie' ? 0.1 : 0);
      if (f.ground && (threat || (orbNear && Math.random() < 0.5))) {
        if (Math.random() < blockP * 0.25) {
          ai.block = 10 + Math.round(rand(0, 8));
          ai.crouch = seen.mv ? seen.mv.lvl === 'low' || (seen.mv.lvl !== 'over' && Math.random() < 0.3) : false;
          if (seen.mv && seen.mv.lvl === 'over') ai.crouch = false;
          h.blk = true;
          return;
        }
      }
      if (orbNear && f.ground && Math.random() < 0.02 + L * 0.03) { h.u = true; goFwd(); return; }
      // anti-air
      if (seen.air && dist < 2.4 && o.vy < 2 && f.ground && Math.random() < (0.02 + L * 0.12) * (st === 'boss' || st === 'balanced' ? 1.3 : 1)) {
        f.req = Math.random() < 0.7 ? 'rise' : null;
        if (!f.req) press(f, 'hp');
        return;
      }
      // super
      if (f.meter >= 100 && dist < 2.2 && Math.random() < 0.02 + L * 0.03 && f.ground) { f.req = 'super'; return; }

      ai.t--;
      if (ai.t > 0) {
        // continue current intent
        if (ai.intent === 'fwd') goFwd();
        else if (ai.intent === 'back') goBack();
        else if (ai.intent === 'crouch') h.d = true;
        return;
      }
      ai.t = Math.round(rand(8, 22) - L * 6);
      var r = Math.random();
      var aggr = { balanced: 0.5, rookie: 0.35, speed: 0.6, tank: 0.45, zoner: 0.3, rush: 0.75, trick: 0.55, boss: 0.6 }[st] || 0.5;
      ai.intent = 'stay';
      if (!f.ground) return;
      if (dist > 3.2) {
        if ((st === 'zoner' || r < 0.12 + L * 0.1) && countOrbs(f) === 0 && Math.random() < (st === 'zoner' ? 0.5 : 0.25)) { f.req = 'orb'; return; }
        if (r < aggr * 0.25 && st !== 'zoner') { f.dashDir = 1; return; }
        if (r < aggr * 0.35 && dist < 4.5 && st !== 'zoner') { h.u = true; goFwd(); ai.plan.push({ w: 16 + Math.round(rand(0, 6)) }, { b: 'hp' }); return; }
        ai.intent = st === 'zoner' && r > 0.6 ? 'stay' : 'fwd';
        return;
      }
      if (dist > 1.6) {
        if (st === 'zoner' && r < 0.4) { if (countOrbs(f) === 0) f.req = 'orb'; else ai.intent = 'back'; return; }
        if ((st === 'rush' || st === 'boss') && r < 0.18 + L * 0.1) { f.req = 'rush'; return; }
        if (st === 'trick' && r < 0.2) { f.dashDir = 1; return; }
        if (r < aggr * 0.3 && dist < 2.6) { h.u = true; goFwd(); ai.plan.push({ w: 14 + Math.round(rand(0, 8)) }, { b: Math.random() < 0.6 ? 'hp' : 'lp' }); return; }
        if (r < aggr * 0.45 && dist < 1.95) { press(f, 'hp'); return; }
        ai.intent = r < aggr + 0.25 ? 'fwd' : r < 0.85 ? 'stay' : 'back';
        return;
      }
      // close range
      var comboSkill = 0.15 + L * 0.8;
      if (r < 0.12 + (o.state === 'block' || o.state === 'cblock' ? 0.25 : 0) * L) { h.r = h.l = false; goFwd(); press(f, 'blk'); return; }
      if (r < 0.55 + aggr * 0.3) {
        var low = Math.random() < 0.35;
        if (low) {
          ai.plan.push({ b: 'lp', down: true }, { w: 7, hold: 'd' }, { b: 'lp', down: true, abortIfMiss: Math.random() > comboSkill }, { w: 6, hold: 'd' });
          if (Math.random() < comboSkill) ai.plan.push({ b: 'hp', down: true, abortIfMiss: true });
          h.d = true;
          press(f, 'lp');
          ai.plan.shift();
        } else {
          press(f, 'lp');
          ai.plan.push({ w: 7 }, { b: 'lp', abortIfMiss: Math.random() > comboSkill }, { w: 7 });
          if (Math.random() < comboSkill) ai.plan.push({ b: 'hp', abortIfMiss: true }, { w: 6 }, { m: Math.random() < 0.5 ? 'rush' : 'orb', abortIfMiss: Math.random() > comboSkill });
        }
        return;
      }
      ai.intent = r < 0.8 ? 'back' : 'stay';
      if (Math.random() < blockP * 0.3) { ai.block = 14; ai.crouch = Math.random() < 0.4; }
    }

    /* ------------------------------------------------------------------ */
    /* Rendering                                                           */
    /* ------------------------------------------------------------------ */
    function SX(x) { return W / 2 + (x - cam.x) * Z; }
    function SY(y) { return floorSY - y * Z; }

    function render() {
      var dpr = view.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var sx = 0, sy = 0;
      if (cam.shake > 0) { sx = (Math.random() - 0.5) * cam.shake * Z * 0.25; sy = (Math.random() - 0.5) * cam.shake * Z * 0.25; }
      g.save();
      g.translate(sx, sy);
      drawStage();
      // shadows
      for (var i = 0; i < 2; i++) {
        var f = P[i];
        if (!f) continue;
        var sc = clamp(1 - f.y * 0.25, 0.35, 1);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath(); g.ellipse(SX(f.x), SY(0) + 2, 0.55 * Z * sc, 0.09 * Z * sc, 0, 0, TAU); g.fill();
      }
      for (var a = 0; a < P.length; a++) {
        var ff = P[a];
        for (var k = 0; k < ff.after.length; k++) {
          var ag = ff.after[k];
          drawFighter(ff, ag.x, ag.y, ag.face, ag.pose, ag.a, true);
        }
      }
      // draw the attacker last so its strike overlaps the defender
      var order = P[1] && (P[1].state === 'attack' || P[1].state === 'airatk') ? [0, 1] : [1, 0];
      for (var o = 0; o < order.length; o++) {
        var F = P[order[o]];
        if (F) drawFighterLive(F);
      }
      drawShots();
      drawParticles();
      g.restore();
      if (superFreeze > 0) {
        g.fillStyle = 'rgba(0,0,0,' + (0.35 * Math.min(1, superFreeze / 10)) + ')';
        g.fillRect(0, 0, W, H);
        drawFighterLive(superBy);
        var r = (40 - superFreeze) / 40;
        g.strokeStyle = superBy.ch.line || superBy.ch.col; g.lineWidth = 6 * (1 - r) + 1;
        g.beginPath(); g.arc(SX(superBy.x), SY(superBy.y + 1.1), r * Z * 3, 0, TAU); g.stroke();
      }
      if (lightning > 0) { g.fillStyle = 'rgba(220,230,255,' + lightning * 0.4 + ')'; g.fillRect(0, 0, W, H); }
      if (mode !== 'demo' && P.length) drawHud();
      drawBanner();
    }

    function drawFighterLive(f) {
      var flash = f.flash > 0;
      drawFighter(f, f.x, f.y, f.face, f.pose, 1, false, flash);
      if (f.state === 'bstun' && f.sf < 4) { /* guard glint drawn by particle */ }
    }

    function drawFighter(f, x, y, face, poseArr, alpha, ghost, flash) {
      var J = f.J;
      if (ghost) {
        // recompute joints for an afterimage pose
        var keep = f.pose; f.pose = poseArr; var keepJ = new Float32Array(J); solve(f); J = new Float32Array(f.J); f.J.set(keepJ); f.pose = keep;
      }
      var ch = f.ch;
      var ox = SX(x), oy = SY(y);
      var z = Z;
      function X(i) { return ox + face * J[i] * z; }
      function Y(i) { return oy - J[i + 1] * z; }
      var lw = Math.max(3, z * 0.085 * ch.thick);
      var col = flash ? '#ffffff' : ch.col, dark = flash ? '#dddddd' : ch.dark;
      var line = ch.line || 'rgba(10,10,20,0.9)';
      g.save();
      g.globalAlpha = alpha;
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (ghost) { col = dark = ch.col; line = 'rgba(255,255,255,0.15)'; }
      function seg3(a, b, c, color, w) {
        g.strokeStyle = color; g.lineWidth = w;
        g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); g.lineTo(X(c), Y(c)); g.stroke();
      }
      // back limbs
      seg3(6, 12, 14, line, lw + 3); seg3(0, 20, 22, line, lw + 3);
      seg3(6, 12, 14, dark, lw); seg3(0, 20, 22, dark, lw);
      // scarf behind
      if (ch.deco === 'scarf' || ch.deco === 'band') drawTails(f, X(4), Y(4), face, ch.deco === 'scarf' ? '#e9d8ff' : '#ff4d5e', ch.deco === 'scarf' ? 1.6 : 0.9, z);
      // torso
      g.strokeStyle = line; g.lineWidth = lw * 1.25 + 3;
      g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(2), Y(2)); g.stroke();
      g.strokeStyle = col; g.lineWidth = lw * 1.25;
      g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(2), Y(2)); g.stroke();
      // belt / sash
      g.fillStyle = dark;
      g.beginPath(); g.arc(X(0), Y(0), lw * 0.75, 0, TAU); g.fill();
      // front leg
      seg3(0, 16, 18, line, lw + 3); seg3(0, 16, 18, col, lw);
      // head
      var hx = X(4), hy = Y(4), hr = R_HEAD * z * (ch.deco === 'helmet' ? 1.06 : 1);
      g.fillStyle = line; g.beginPath(); g.arc(hx, hy, hr + 1.8, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill();
      drawDeco(f, hx, hy, hr, face, z, flash);
      // eyes
      if (!ghost) {
        g.fillStyle = ch.id === 'onyx' ? '#ffcf4a' : '#16161f';
        var ko = f.state === 'ko' || (f.state === 'down' && f.hp <= 0);
        if (ko) {
          g.strokeStyle = '#16161f'; g.lineWidth = Math.max(1.5, hr * 0.12);
          g.beginPath(); var ex = hx + face * hr * 0.35, ey = hy - hr * 0.1, e = hr * 0.16;
          g.moveTo(ex - e, ey - e); g.lineTo(ex + e, ey + e); g.moveTo(ex + e, ey - e); g.lineTo(ex - e, ey + e); g.stroke();
        } else {
          var hurt = f.state === 'hit' || f.state === 'launch';
          g.fillRect(hx + face * hr * 0.3 - hr * 0.07, hy - hr * (hurt ? 0.05 : 0.25), hr * 0.14, hr * (hurt ? 0.12 : 0.36));
          g.fillRect(hx + face * hr * 0.66 - hr * 0.07, hy - hr * (hurt ? 0.05 : 0.25), hr * 0.14, hr * (hurt ? 0.12 : 0.36));
        }
      }
      // front arm (in front of the body)
      seg3(6, 8, 10, line, lw + 3); seg3(6, 8, 10, col, lw);
      g.fillStyle = col;
      g.beginPath(); g.arc(X(10), Y(10), lw * 0.75, 0, TAU); g.fill();
      if (ch.deco === 'bolt' && !ghost && Math.random() < 0.25) part(0, x + face * J[10], y + J[11], rand(-2, 2), rand(-2, 2), 0.12, 0.03, '#bffcf6');
      if (ch.deco === 'crown' && !ghost) {
        g.strokeStyle = 'rgba(255,207,74,0.35)'; g.lineWidth = 2;
        g.beginPath(); g.arc(hx, hy, hr + 5 + Math.sin(time * 5) * 2, 0, TAU); g.stroke();
      }
      g.restore();
    }
    function drawTails(f, hx, hy, face, color, len, z) {
      var sway = Math.sin(time * 7 + f.side) * 0.12 + (f.vx * -face) * 0.05;
      g.strokeStyle = color; g.lineWidth = Math.max(2, z * 0.04); g.lineCap = 'round';
      for (var i = 0; i < 2; i++) {
        var bx = hx - face * R_HEAD * z * 0.9, by = hy - R_HEAD * z * 0.15 + i * 4;
        g.beginPath(); g.moveTo(bx, by);
        g.quadraticCurveTo(bx - face * len * 0.35 * z, by + (sway + 0.1 + i * 0.12) * z, bx - face * len * 0.6 * z, by + (sway * 2 + 0.25 + i * 0.15) * z);
        g.stroke();
      }
    }
    function drawDeco(f, hx, hy, r, face, z, flash) {
      var d = f.ch.deco;
      g.lineCap = 'round';
      if (d === 'band') {
        g.strokeStyle = '#ffe3e6'; g.lineWidth = Math.max(2, r * 0.28);
        g.beginPath(); g.arc(hx, hy, r * 0.93, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      } else if (d === 'spikes') {
        g.fillStyle = flash ? '#fff' : '#fff27a';
        g.beginPath();
        for (var i = 0; i < 4; i++) {
          var a = -Math.PI / 2 - face * (0.2 + i * 0.45);
          g.moveTo(hx + Math.cos(a - 0.25) * r, hy + Math.sin(a - 0.25) * r);
          g.lineTo(hx + Math.cos(a) * r * 1.75, hy + Math.sin(a) * r * 1.75);
          g.lineTo(hx + Math.cos(a + 0.25) * r, hy + Math.sin(a + 0.25) * r);
        }
        g.fill();
      } else if (d === 'helmet') {
        g.fillStyle = '#c9d4e8';
        g.beginPath(); g.arc(hx, hy - r * 0.05, r * 1.08, Math.PI, TAU); g.fill();
        g.fillStyle = '#2d4f8a';
        g.fillRect(hx - r * 1.08, hy - r * 0.12, r * 2.16, r * 0.22);
      } else if (d === 'bolt') {
        g.fillStyle = '#eafffd';
        g.beginPath();
        g.moveTo(hx - face * r * 0.1, hy - r * 1.6); g.lineTo(hx - face * r * 0.5, hy - r * 0.75); g.lineTo(hx - face * r * 0.1, hy - r * 0.85); g.lineTo(hx - face * r * 0.35, hy - r * 0.2);
        g.lineTo(hx + face * r * 0.3, hy - r * 1.05); g.lineTo(hx - face * r * 0.05, hy - r * 0.95); g.closePath(); g.fill();
      } else if (d === 'flame') {
        for (var k = 0; k < 3; k++) {
          g.fillStyle = k === 0 ? '#ffd23f' : k === 1 ? '#ff9f43' : '#ff5a2a';
          var fl = 1.6 + Math.sin(time * 14 + k * 2) * 0.25 - k * 0.25;
          g.beginPath();
          g.moveTo(hx - r * 0.85, hy - r * 0.3);
          g.quadraticCurveTo(hx - face * r * 0.7, hy - r * (fl + 0.3), hx - face * r * (1.1 + k * 0.1), hy - r * fl);
          g.quadraticCurveTo(hx, hy - r * 0.9, hx + r * 0.85, hy - r * 0.3);
          g.closePath(); g.fill();
        }
      } else if (d === 'scarf') {
        g.strokeStyle = '#e9d8ff'; g.lineWidth = Math.max(2, r * 0.35);
        g.beginPath(); g.moveTo(hx - r * 0.8, hy + r * 1.05); g.lineTo(hx + r * 0.8, hy + r * 1.05); g.stroke();
      } else if (d === 'crown') {
        g.fillStyle = '#ffcf4a';
        g.beginPath();
        g.moveTo(hx - r * 0.85, hy - r * 0.55);
        g.lineTo(hx - r * 0.75, hy - r * 1.5); g.lineTo(hx - r * 0.35, hy - r * 0.95); g.lineTo(hx, hy - r * 1.65); g.lineTo(hx + r * 0.35, hy - r * 0.95); g.lineTo(hx + r * 0.75, hy - r * 1.5);
        g.lineTo(hx + r * 0.85, hy - r * 0.55); g.closePath(); g.fill();
      }
    }

    function drawShots() {
      for (var i = 0; i < shots.length; i++) {
        var s = shots[i];
        var x = SX(s.x), y = SY(s.y), r = s.r * Z;
        var grd = g.createRadialGradient(x, y, 0, x, y, r * 1.8);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.35, s.col);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, y, r * 1.8, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, r * 0.8, s.t * 12, s.t * 12 + 2.2); g.stroke();
      }
    }

    function drawParticles() {
      for (var i = 0; i < MAXP; i++) {
        var p = PT[i];
        if (!p.on) continue;
        var u = p.life / p.max;
        var x = SX(p.x), y = SY(p.y);
        g.globalAlpha = u;
        if (p.k === 0) {
          g.strokeStyle = p.c; g.lineWidth = Math.max(1.5, p.s * Z);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.vx * 0.035 * Z, y + p.vy * 0.035 * Z); g.stroke();
        } else if (p.k === 1) {
          g.fillStyle = p.c;
          g.beginPath(); g.arc(x, y, p.s * Z * (1.5 - u * 0.5), 0, TAU); g.fill();
        } else if (p.k === 2) {
          g.strokeStyle = p.c; g.lineWidth = 2 + 3 * u;
          g.beginPath(); g.arc(x, y, p.s * Z * (1.2 - u * 0.8), 0, TAU); g.stroke();
        } else if (p.k === 3) {
          g.fillStyle = p.c;
          g.save(); g.translate(x, y); g.rotate(p.a + p.life * 6); g.fillRect(-p.s * Z, -p.s * Z * 0.5, p.s * Z * 2, p.s * Z); g.restore();
        }
      }
      g.globalAlpha = 1;
    }
    function updateParticles(dt) {
      for (var i = 0; i < MAXP; i++) {
        var p = PT[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 0) p.vy -= 14 * dt;
        else if (p.k === 3) { p.vy -= 4 * dt; p.vx *= 0.98; }
      }
    }

    function drawStage() {
      var s = stage, i;
      var grd = g.createLinearGradient(0, 0, 0, floorSY);
      grd.addColorStop(0, s.sky[0]); grd.addColorStop(0.6, s.sky[1]); grd.addColorStop(1, s.sky[2]);
      g.fillStyle = grd;
      g.fillRect(-20, -20, W + 40, floorSY + 20);
      var par = function (wx, k) { return W / 2 + (wx - cam.x) * Z * k; };
      var base = floorSY;
      var d = s.deco;
      if (d === 'dojo') {
        // paper wall panels with wooden frames
        for (i = -6; i < 14; i++) {
          var x = par(i * 2.2, 0.6), w = 2.2 * Z * 0.6;
          g.fillStyle = 'rgba(255,236,200,0.18)'; g.fillRect(x + 4, base - 3.2 * Z, w - 8, 2.6 * Z);
          g.fillStyle = 'rgba(40,24,12,0.6)'; g.fillRect(x, base - 3.4 * Z, 6, 3.4 * Z);
          g.fillRect(x, base - 2.0 * Z, w, 4);
        }
        g.fillStyle = 'rgba(40,24,12,0.7)'; g.fillRect(0, base - 3.6 * Z, W, 0.2 * Z);
        // hanging scroll
        g.fillStyle = 'rgba(245,230,200,0.85)'; g.fillRect(par(8, 0.6) - 0.3 * Z, base - 3.3 * Z, 0.6 * Z, 1.4 * Z);
        g.fillStyle = '#7a1f1f'; g.beginPath(); g.arc(par(8, 0.6), base - 2.75 * Z, 0.16 * Z, 0, TAU); g.fill();
      } else if (d === 'neon') {
        for (i = -4; i < 12; i++) {
          var bx = par(i * 2.6, 0.35), bh = (2 + ((i * 7) % 5) * 0.6) * Z, bw = 1.8 * Z * 0.4;
          g.fillStyle = '#140c2c'; g.fillRect(bx, base - bh - 0.6 * Z, bw, bh);
          g.fillStyle = i % 3 ? 'rgba(255,90,170,0.7)' : 'rgba(80,220,255,0.7)';
          g.fillRect(bx + bw * 0.2, base - bh - 0.3 * Z, bw * 0.6, 0.12 * Z);
        }
        g.fillStyle = 'rgba(255,90,170,0.9)'; g.font = '900 ' + Math.round(0.45 * Z) + 'px system-ui,sans-serif'; g.textAlign = 'center';
        g.fillText('NOODLES', par(5, 0.5), base - 2.6 * Z);
        g.fillStyle = '#1b1430'; g.fillRect(0, base - 0.7 * Z, W, 0.7 * Z);
      } else if (d === 'harbor') {
        g.fillStyle = 'rgba(255,220,170,0.8)'; g.beginPath(); g.arc(par(10, 0.1), base - 1.4 * Z, 0.8 * Z, 0, TAU); g.fill();
        g.fillStyle = '#1d4560'; g.fillRect(0, base - 1.0 * Z, W, 1.0 * Z);
        g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = 2;
        for (i = 0; i < 6; i++) { var wy = base - (0.2 + i * 0.13) * Z; g.beginPath(); g.moveTo(par(i * 2.3, 0.2), wy); g.lineTo(par(i * 2.3 + 0.8, 0.2), wy); g.stroke(); }
        // cranes
        g.strokeStyle = '#132a3a'; g.lineWidth = Math.max(3, 0.08 * Z);
        for (i = 0; i < 3; i++) {
          var cx = par(i * 7 + 1, 0.4);
          g.beginPath(); g.moveTo(cx, base - 0.9 * Z); g.lineTo(cx, base - 3.6 * Z); g.lineTo(cx + 2.2 * Z * 0.4, base - 3.6 * Z); g.moveTo(cx - 0.6 * Z * 0.4, base - 3.6 * Z); g.lineTo(cx, base - 3.6 * Z); g.stroke();
          g.beginPath(); g.moveTo(cx + 1.8 * Z * 0.4, base - 3.6 * Z); g.lineTo(cx + 1.8 * Z * 0.4, base - 2.6 * Z); g.stroke();
        }
      } else if (d === 'pylons') {
        g.strokeStyle = '#06191c'; g.lineWidth = Math.max(2, 0.05 * Z);
        for (i = -2; i < 6; i++) {
          var px = par(i * 4.5, 0.45);
          g.beginPath(); g.moveTo(px - 0.5 * Z, base); g.lineTo(px, base - 3.8 * Z); g.lineTo(px + 0.5 * Z, base);
          g.moveTo(px - 0.6 * Z, base - 3.0 * Z); g.lineTo(px + 0.6 * Z, base - 3.0 * Z); g.moveTo(px - 0.45 * Z, base - 2.2 * Z); g.lineTo(px + 0.45 * Z, base - 2.2 * Z); g.stroke();
          g.beginPath(); g.moveTo(px + 0.6 * Z, base - 3.0 * Z); g.quadraticCurveTo(px + 2.25 * Z * 0.45 * 2, base - 2.4 * Z, px + 4.5 * Z * 0.45 - 0.6 * Z, base - 3.0 * Z); g.stroke();
        }
        if (Math.random() < 0.04) spark(cam.x + rand(-4, 4), rand(2.2, 3.4), 3, '#8ffff4', 3);
      } else if (d === 'temple') {
        var vg = g.createRadialGradient(par(8, 0.15), base - 2.5 * Z, 0, par(8, 0.15), base - 2.5 * Z, 4 * Z);
        vg.addColorStop(0, 'rgba(255,140,50,0.5)'); vg.addColorStop(1, 'rgba(255,80,20,0)');
        g.fillStyle = vg; g.fillRect(0, 0, W, base);
        g.fillStyle = '#2a0b07';
        g.beginPath(); g.moveTo(par(2, 0.15), base); g.lineTo(par(7, 0.15), base - 3.4 * Z); g.lineTo(par(9, 0.15), base - 3.4 * Z); g.lineTo(par(14, 0.15), base); g.fill();
        g.fillStyle = '#3d140c';
        for (i = -3; i < 10; i++) { var tx = par(i * 2.8, 0.5); g.fillRect(tx, base - 2.8 * Z, 0.35 * Z, 2.8 * Z); }
        g.fillRect(0, base - 3.0 * Z, W, 0.3 * Z);
      } else if (d === 'bamboo') {
        g.fillStyle = 'rgba(240,235,255,0.9)'; g.beginPath(); g.arc(par(9, 0.08), base - 3.0 * Z, 1.0 * Z, 0, TAU); g.fill();
        for (i = -6; i < 20; i++) {
          var bxx = par(i * 1.1, 0.55 + (i % 3) * 0.08);
          g.strokeStyle = i % 2 ? '#1c3a2c' : '#24503a'; g.lineWidth = Math.max(3, 0.12 * Z);
          g.beginPath(); g.moveTo(bxx, base); g.lineTo(bxx + Math.sin(time * 0.8 + i) * 4, -10); g.stroke();
          g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
          for (var n = 1; n < 6; n++) { g.beginPath(); g.moveTo(bxx - 0.07 * Z, base - n * 0.8 * Z); g.lineTo(bxx + 0.07 * Z, base - n * 0.8 * Z); g.stroke(); }
        }
      } else if (d === 'peaks') {
        g.fillStyle = '#151824';
        g.beginPath(); g.moveTo(0, base);
        for (i = -3; i < 12; i++) g.lineTo(par(i * 2.4, 0.2), base - (i % 2 ? 3.4 : 1.8) * Z);
        g.lineTo(W, base); g.fill();
        g.fillStyle = 'rgba(230,236,255,0.6)';
        for (i = -3; i < 12; i += 2) { var pk = par((i + 1) * 2.4, 0.2); g.beginPath(); g.moveTo(pk, base - 3.4 * Z); g.lineTo(pk - 0.35 * Z, base - 2.9 * Z); g.lineTo(pk + 0.35 * Z, base - 2.9 * Z); g.fill(); }
        if (Math.random() < 0.004 && phase === 'fight') { lightning = 1; if (!demo()) noise({ d: 0.6, f: 300, v: 0.12 }); }
      }
      // floor
      var fg = g.createLinearGradient(0, base, 0, H);
      fg.addColorStop(0, s.floor); fg.addColorStop(1, '#0b0b12');
      g.fillStyle = fg; g.fillRect(-20, base, W + 40, H - base + 20);
      g.strokeStyle = s.line; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, base); g.lineTo(W, base); g.stroke();
      g.globalAlpha = 0.5;
      for (i = -2; i <= STAGE_W + 2; i++) {
        var fx = SX(i);
        g.beginPath(); g.moveTo(fx, base); g.lineTo(W / 2 + (fx - W / 2) * 1.6, H); g.stroke();
      }
      g.globalAlpha = 1;
      // ambient particles
      var fx2 = s.fx;
      if (fx2 !== 'none') {
        for (i = 0; i < ambient.length; i++) {
          var p = ambient[i];
          var ax, ay;
          if (fx2 === 'rain') { ay = 6 - ((time * 9 * p.v + p.ph * 3) % 6.5); ax = p.x - ay * 0.15; g.strokeStyle = 'rgba(170,190,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(SX(ax), SY(ay)); g.lineTo(SX(ax - 0.05), SY(ay - 0.3)); g.stroke(); continue; }
          if (fx2 === 'embers') { ay = ((time * 0.6 * p.v + p.ph) % 6); ax = p.x + Math.sin(time + p.ph) * 0.3; g.fillStyle = 'rgba(255,' + (120 + (i * 9) % 100) + ',50,0.8)'; }
          else if (fx2 === 'snow') { ay = 6 - ((time * 0.7 * p.v + p.ph) % 6); ax = p.x + Math.sin(time * 0.8 + p.ph) * 0.4; g.fillStyle = 'rgba(240,244,255,0.75)'; }
          else if (fx2 === 'petals') { ay = 6 - ((time * 0.45 * p.v + p.ph) % 6); ax = p.x + Math.sin(time + p.ph) * 0.6; g.fillStyle = 'rgba(255,190,230,0.75)'; }
          else if (fx2 === 'sparks') { ay = ((time * 0.3 * p.v + p.ph) % 6); ax = p.x; g.fillStyle = 'rgba(140,255,240,' + (0.3 + 0.3 * Math.sin(time * 6 + p.ph)) + ')'; }
          else { ay = 0.5 + ((time * 0.15 * p.v + p.ph) % 3); ax = p.x + Math.sin(time * 0.5 + p.ph) * 0.5; g.fillStyle = 'rgba(255,230,190,0.25)'; }
          g.fillRect(SX(ax), SY(ay), 2.2 * p.s, 2.2 * p.s);
        }
      }
    }

    function drawHud() {
      var pad = Math.round(clamp(W * 0.02, 8, 18));
      var tw = clamp(W * 0.09, 44, 70);
      var bw = (W - pad * 2 - tw - 12) / 2, bh = clamp(H * 0.03, 12, 20), y = pad;
      for (var i = 0; i < 2; i++) {
        var f = P[i];
        var x = i === 0 ? pad : W - pad - bw;
        g.fillStyle = 'rgba(5,6,14,0.7)';
        g.fillRect(x - 2, y - 2, bw + 4, bh + 4);
        var pct = clamp(f.hp / f.maxHp, 0, 1), tr = clamp(f.trail / f.maxHp, 0, 1);
        g.fillStyle = '#ff5a5f';
        if (i === 0) g.fillRect(x + bw * (1 - tr), y, bw * tr, bh); else g.fillRect(x, y, bw * tr, bh);
        var hg = g.createLinearGradient(0, y, 0, y + bh);
        hg.addColorStop(0, pct > 0.3 ? '#b6ff7a' : '#ffd23f'); hg.addColorStop(1, pct > 0.3 ? '#3fbf5a' : '#e08a12');
        g.fillStyle = hg;
        if (i === 0) g.fillRect(x + bw * (1 - pct), y, bw * pct, bh); else g.fillRect(x, y, bw * pct, bh);
        // name + round wins
        var fs = Math.round(clamp(W * 0.018, 11, 15));
        g.font = '900 ' + fs + 'px system-ui,sans-serif';
        g.textBaseline = 'top';
        g.textAlign = i === 0 ? 'left' : 'right';
        g.fillStyle = f.ch.id === 'onyx' ? '#ffcf4a' : f.ch.col;
        var label = f.ch.name.toUpperCase() + (mode === 'versus' ? (f.human ? ' · P' + f.human : ' · CPU') : '');
        g.fillText(label, i === 0 ? x : x + bw, y + bh + 5);
        for (var r = 0; r < 2; r++) {
          var rx = i === 0 ? x + bw - 8 - r * 16 : x + 8 + r * 16;
          g.fillStyle = r < f.rounds ? '#ffd23f' : 'rgba(255,255,255,0.2)';
          g.beginPath(); g.arc(rx, y + bh + 11, 5, 0, TAU); g.fill();
        }
        // super meter
        var my = y + bh + fs + 12, mw = bw * 0.6, mh = 6;
        var mx = i === 0 ? x : x + bw - mw;
        g.fillStyle = 'rgba(5,6,14,0.7)'; g.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
        var full = f.meter >= 100;
        g.fillStyle = full ? (Math.sin(time * 10) > 0 ? '#ffe27a' : '#ffb347') : '#8b6cff';
        var mp = f.meter / 100;
        if (i === 0) g.fillRect(mx, my, mw * mp, mh); else g.fillRect(mx + mw * (1 - mp), my, mw * mp, mh);
        if (full) {
          g.font = '900 10px system-ui,sans-serif';
          g.fillStyle = '#ffe27a';
          g.textAlign = i === 0 ? 'left' : 'right';
          g.fillText('SUPER READY', i === 0 ? mx + mw + 6 : mx - 6, my - 2);
        }
        // combo counter for this attacker
        if (f.comboShow >= 2) {
          var cfs = Math.round(clamp(W * 0.04, 20, 38));
          var cx = i === 0 ? pad + 4 : W - pad - 4;
          var cy = H * 0.3;
          g.textAlign = i === 0 ? 'left' : 'right';
          g.font = '900 ' + cfs + 'px system-ui,sans-serif';
          g.lineWidth = 4; g.strokeStyle = 'rgba(10,10,20,0.9)';
          var txt = f.comboShow + ' HITS';
          g.strokeText(txt, cx, cy); g.fillStyle = '#ffd23f'; g.fillText(txt, cx, cy);
          g.font = '800 ' + Math.round(cfs * 0.45) + 'px system-ui,sans-serif';
          g.fillStyle = '#fff';
          g.fillText(Math.round(f.comboShowDmg) + ' damage', cx, cy + cfs + 2);
        }
        if (f.counterT > 0) {
          g.textAlign = i === 0 ? 'left' : 'right';
          g.font = '900 ' + Math.round(clamp(W * 0.022, 12, 18)) + 'px system-ui,sans-serif';
          g.fillStyle = '#ff9f43';
          g.fillText('COUNTER!', i === 0 ? pad + 4 : W - pad - 4, H * 0.3 - 26);
        }
        // touch: show super button
        if (i === 0 && TB.x) TB.x.style.display = f.meter >= 100 && touchVisible() ? 'grid' : 'none';
      }
      // timer
      g.fillStyle = 'rgba(5,6,14,0.75)';
      g.fillRect(W / 2 - tw / 2, y - 4, tw, bh + 22);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 ' + Math.round(clamp(W * 0.035, 20, 32)) + 'px system-ui,sans-serif';
      g.fillStyle = timer < 10 && phase === 'fight' ? '#ff5a5f' : '#fff';
      g.fillText(String(Math.ceil(timer)), W / 2, y + (bh + 18) / 2 - 2);
      if (mode === 'arcade' && arcade) {
        g.font = '800 11px system-ui,sans-serif';
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.textBaseline = 'top';
        g.fillText('STAGE ' + (arcade.idx + 1) + '/' + arcade.ladder.length + ' · ' + arcade.score, W / 2, y + bh + 24);
      }
    }

    function drawBanner() {
      if (!banner) return;
      var u = banner.t / banner.max;
      if (u >= 1) { banner = null; return; }
      var sc = u < 0.12 ? 0.5 + (u / 0.12) * 0.5 : 1;
      var a = u > 0.8 ? (1 - u) / 0.2 : 1;
      var fs = Math.round(clamp(Math.min(W * 0.1, availH * 0.14), 28, 76) * sc);
      g.save();
      g.globalAlpha = a;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      var y = availH * 0.4;
      g.font = 'italic 900 ' + fs + 'px system-ui,sans-serif';
      g.lineWidth = Math.max(4, fs * 0.1); g.strokeStyle = 'rgba(10,10,20,0.9)';
      g.strokeText(banner.text, W / 2, y, W - 20);
      g.fillStyle = banner.c; g.fillText(banner.text, W / 2, y, W - 20);
      if (banner.sub) {
        g.font = '800 ' + Math.round(fs * 0.32) + 'px system-ui,sans-serif';
        g.lineWidth = 3; g.strokeText(banner.sub, W / 2, y + fs * 0.8, W - 20);
        g.fillStyle = '#fff'; g.fillText(banner.sub, W / 2, y + fs * 0.8, W - 20);
      }
      g.restore();
    }

    function updateCam(dt) {
      if (!P.length) return;
      var mid = (P[0].x + P[1].x) / 2;
      var target = clamp(mid, VIEW_W / 2, STAGE_W - VIEW_W / 2);
      cam.x += (target - cam.x) * (1 - Math.exp(-dt * 6));
      if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 1.2);
      if (lightning > 0) lightning = Math.max(0, lightning - dt * 3);
    }

    /* ------------------------------------------------------------------ */
    /* Menus                                                               */
    /* ------------------------------------------------------------------ */
    function closeOverlay() { if (overlay) overlay.close(); overlay = null; }
    function previewCanvas(ch, locked) {
      var cv = document.createElement('canvas');
      cv.width = 120; cv.height = 110;
      var f = makeFighter(0, ch, 0);
      f.pose.set(PZ.stance); solve(f);
      var keep = { g: g, Z: Z, W: W, floorSY: floorSY, cam: cam.x };
      g = cv.getContext('2d'); Z = 44; W = 120; floorSY = 104; cam.x = 0.1; f.x = 0; f.y = 0;
      if (locked) { g.globalAlpha = 1; }
      drawFighter(f, 0, 0, 1, f.pose, 1, false, false);
      if (locked) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = '#20223a'; g.fillRect(0, 0, 120, 110);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#fff'; g.font = '900 30px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('?', 60, 55);
      }
      g = keep.g; Z = keep.Z; W = keep.W; floorSY = keep.floorSY; cam.x = keep.cam;
      return cv;
    }
    function rosterGrid(sel, sel2, onPick, lockedOk) {
      var grid = ui.el('div', 'sd-grid');
      ROSTER.forEach(function (ch) {
        var locked = !lockedOk && saved.unlocked.indexOf(ch.id) < 0;
        var b = ui.el('button', 'sd-card' + (ch.id === sel ? ' sel' : '') + (ch.id === sel2 ? ' p2' : ''));
        b.type = 'button';
        if (locked) b.disabled = true;
        b.appendChild(previewCanvas(ch, locked));
        b.appendChild(ui.el('b', '', locked ? '???' : ch.name));
        b.appendChild(ui.el('small', '', locked ? 'Beat in Arcade' : ch.bio));
        b.addEventListener('click', function (e) { e.stopPropagation(); if (locked) return; ctx.sfx('click'); onPick(ch.id); });
        grid.appendChild(b);
      });
      return grid;
    }
    function chips(opts, cur, onPick) {
      var row = ui.el('div', 'sd-row');
      opts.forEach(function (o) {
        var b = ui.el('button', 'sd-chip' + (o.v === cur ? ' sel' : ''), o.l);
        b.type = 'button';
        b.addEventListener('click', function (e) { e.stopPropagation(); ctx.sfx('click'); onPick(o.v); });
        row.appendChild(b);
      });
      return row;
    }
    function panel(o, extra) {
      closeOverlay();
      overlay = ui.overlay(root, o);
      overlay.panel.classList.add('sd-panel');
      if (extra) overlay.panel.insertBefore(extra, overlay.panel.querySelector('.ig-actions'));
      return overlay;
    }

    function showTitle() {
      if (mode !== 'demo') startDemo();
      phase = 'fight';
      syncTouch();
      var body = ui.el('div', '');
      body.appendChild(ui.el('div', 'sd-stat', 'Arcade best <b style="color:#ffd23f">' + saved.best + '</b> · furthest stage <b style="color:#fff">' + saved.bestStage + '/7</b> · clears <b style="color:#fff">' + saved.clears + '</b> · fighters <b style="color:#fff">' + saved.unlocked.length + '/8</b>'));
      panel({
        title: TITLE,
        text: 'A 1-on-1 stick fighter: block, combo, throw and land specials. Beat 7 rivals in Arcade or fight a friend.',
        buttons: [
          { label: '▶ Arcade', primary: true, onClick: showArcadeSelect },
          { label: '2P Versus', onClick: showVersusSelect },
          { label: 'Moves', onClick: showMoves },
        ],
      }, body);
    }
    function showMoves() {
      var t = ui.el('div', '');
      t.innerHTML = '<table class="sd-moves"><tbody>' +
        '<tr><td>Walk · jump · crouch</td><td>←→ · ↑ · ↓</td></tr>' +
        '<tr><td>Dash / back-dash</td><td>→→ / ←←</td></tr>' +
        '<tr><td>Light · Heavy · Block</td><td>J · K · L &nbsp;(or Z X C)</td></tr>' +
        '<tr><td>Low attacks (block crouching)</td><td>↓ + Light / Heavy</td></tr>' +
        '<tr><td>Throw (beats block)</td><td>→ + Block, up close</td></tr>' +
        '<tr><td>Ink Orb (projectile)</td><td>↓ → + Light</td></tr>' +
        '<tr><td>Spin Rush (multi-hit)</td><td>↓ → + Heavy</td></tr>' +
        '<tr><td>Rising Fist (anti-air)</td><td>↓ ← + Light/Heavy</td></tr>' +
        '<tr><td>Ink Storm super (full meter)</td><td>Light + Heavy together</td></tr>' +
        '</tbody></table><div class="sd-keys">Jump-in attacks must be blocked standing, sweeps and ↓ attacks crouching. Specials can cancel a light or heavy attack that hits. On touch: SP = Orb, ↓+SP = Rising Fist, →+SP = Spin Rush.</div>';
      panel({ title: 'Moves', buttons: [{ label: '← Back', primary: true, onClick: showTitle }] }, t);
    }
    function showArcadeSelect() {
      var body = ui.el('div', '');
      body.appendChild(ui.el('div', 'sd-lab', 'Choose your fighter'));
      if (saved.unlocked.indexOf(saved.p1) < 0) saved.p1 = 'quill';
      body.appendChild(rosterGrid(saved.p1, null, function (id) { saved.p1 = id; persist(); showArcadeSelect(); }, false));
      body.appendChild(ui.el('div', 'sd-lab', 'Difficulty'));
      body.appendChild(chips([{ v: 0, l: 'Easy' }, { v: 1, l: 'Normal' }, { v: 2, l: 'Hard' }], saved.diff, function (v) { saved.diff = v; persist(); showArcadeSelect(); }));
      var keys = ui.el('div', 'sd-keys', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows move/jump/crouch · <kbd>J</kbd> light · <kbd>K</kbd> heavy · <kbd>L</kbd> block · <kbd>↓</kbd><kbd>→</kbd>+<kbd>J</kbd> orb');
      body.appendChild(keys);
      panel({
        title: 'Arcade',
        text: 'Beat 7 rivals in a row. Each win unlocks that fighter.',
        buttons: [{ label: '▶ Start', primary: true, onClick: function () { closeOverlay(); startArcade(saved.p1); ctx.focus(); } }, { label: '← Back', onClick: showTitle }],
      }, body);
    }
    function showVersusSelect() {
      var body = ui.el('div', '');
      var pick = showVersusSelect.pick || 1;
      body.appendChild(ui.el('div', 'sd-lab', 'Picking for: '));
      body.appendChild(chips([{ v: 1, l: 'Player 1 (blue)' }, { v: 2, l: 'Player 2 (orange)' }], pick, function (v) { showVersusSelect.pick = v; showVersusSelect(); }));
      body.appendChild(rosterGrid(saved.p1, saved.p2, function (id) { if (pick === 1) saved.p1 = id; else saved.p2 = id; persist(); showVersusSelect(); }, true));
      body.appendChild(ui.el('div', 'sd-lab', 'Player 2 is'));
      body.appendChild(chips([{ v: false, l: 'Human' }, { v: true, l: 'CPU' }], saved.p2cpu, function (v) { saved.p2cpu = v; persist(); showVersusSelect(); }));
      if (saved.p2cpu) body.appendChild(chips([{ v: 0, l: 'Easy' }, { v: 1, l: 'Normal' }, { v: 2, l: 'Hard' }], saved.diff, function (v) { saved.diff = v; persist(); showVersusSelect(); }));
      body.appendChild(ui.el('div', 'sd-keys', saved.p2cpu
        ? 'You: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows + <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd>'
        : '<b>P1</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> + <kbd>F</kbd> light <kbd>G</kbd> heavy <kbd>H</kbd> block · <b>P2</b> arrows + <kbd>J</kbd> light <kbd>K</kbd> heavy <kbd>L</kbd> block'));
      panel({
        title: 'Versus',
        buttons: [{ label: '▶ Fight', primary: true, onClick: function () { closeOverlay(); startVersus(); ctx.focus(); } }, { label: '← Back', onClick: showTitle }],
      }, body);
    }
    function showLadder(afterWin) {
      var nextIdx = afterWin ? arcade.idx + 1 : arcade.idx;
      var opp = rosterById(arcade.ladder[nextIdx]);
      var body = ui.el('div', '');
      if (afterWin) body.appendChild(ui.el('div', 'sd-stat', 'You beat <b style="color:#fff">' + P[1].ch.name + '</b> — ' + P[1].ch.name + ' is now unlocked. Score <b style="color:#ffd23f">' + arcade.score + '</b>'));
      var wrap = ui.el('div', '');
      wrap.style.cssText = 'display:flex;align-items:center;gap:12px;justify-content:center;margin:0 0 12px';
      var cv = previewCanvas(opp, false);
      cv.style.cssText = 'width:110px;height:auto';
      wrap.appendChild(cv);
      wrap.appendChild(ui.el('div', '', '<div class="sd-lab">Stage ' + (nextIdx + 1) + ' of ' + arcade.ladder.length + '</div><div style="font:900 26px system-ui,sans-serif;color:' + (opp.id === 'onyx' ? '#ffcf4a' : opp.col) + '">' + opp.name + '</div><div style="font-size:13px;color:var(--text-2,#c4c8ea)">' + opp.bio + '<br>' + STAGES[opp.stage].name + '</div>'));
      body.appendChild(wrap);
      panel({
        title: afterWin ? 'Victory!' : 'Next challenger',
        buttons: [{ label: '▶ Fight', primary: true, onClick: function () { closeOverlay(); arcade.idx = nextIdx; nextArcadeMatch(); ctx.focus(); } }, { label: 'Quit', onClick: showTitle }],
      }, body);
    }
    function showLose() {
      var body = ui.el('div', '', '<div class="sd-stat">' + P[1].ch.name + ' wins. Score <b style="color:#ffd23f">' + arcade.score + '</b> · best ' + saved.best + '. Continuing resets your score to 0 but keeps your place on the ladder.</div>');
      panel({
        title: 'Defeated',
        buttons: [
          { label: '↻ Continue', primary: true, onClick: function () { closeOverlay(); arcade.score = 0; nextArcadeMatch(); ctx.focus(); } },
          { label: 'Quit', onClick: showTitle },
        ],
      }, body);
    }
    function showChampion() {
      for (var i = 0; i < 70; i++) part(3, cam.x + rand(-5, 5), rand(3, 6), rand(-1.5, 1.5), rand(-1, 1), rand(1.5, 3), rand(0.05, 0.09), ROSTER[i % 8].col);
      var body = ui.el('div', '', '<div class="sd-big">' + arcade.score + '</div><div class="sd-stat">Arcade cleared with ' + rosterById(arcade.ch).name + '! Best score ' + saved.best + ' · clears ' + saved.clears + '. All beaten rivals are unlocked for Arcade and Versus.</div>');
      panel({ title: '🏆 Champion!', buttons: [{ label: 'Play again', primary: true, onClick: showArcadeSelect }, { label: 'Menu', onClick: showTitle }] }, body);
    }
    function showVersusEnd(champ) {
      var name = champ.ch.name + (champ.human ? ' (P' + champ.human + ')' : ' (CPU)');
      panel({
        title: name + ' wins!',
        text: 'Rounds ' + P[0].rounds + '–' + P[1].rounds + ' · best combo ' + Math.max(P[0].stats.maxCombo, P[1].stats.maxCombo) + ' hits',
        buttons: [{ label: '↻ Rematch', primary: true, onClick: function () { closeOverlay(); startVersus(); ctx.focus(); } }, { label: 'Change fighters', onClick: showVersusSelect }],
      });
    }
    function pauseGame() {
      if (mode === 'demo' || phase === 'paused' || phase === 'over') return;
      pausedFrom = phase;
      phase = 'paused';
      syncTouch();
      panel({
        title: 'Paused',
        text: mode === 'arcade' ? 'Stage ' + (arcade.idx + 1) + ' vs ' + P[1].ch.name : 'Versus',
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: 'Moves list', onClick: function () { showMovesPaused(); } },
          { label: 'Quit', onClick: function () { closeOverlay(); showTitle(); } },
        ],
      });
    }
    function showMovesPaused() {
      showMoves();
      var btn = overlay.panel.querySelector('.ig-actions .ig-btn');
      btn.textContent = '▶ Resume';
      btn.onclick = function (e) { e.stopPropagation(); resumeGame(); };
    }
    function resumeGame() {
      closeOverlay();
      phase = pausedFrom || 'fight';
      syncTouch();
      ctx.focus();
    }

    /* ------------------------------------------------------------------ */
    /* Keyboard                                                            */
    /* ------------------------------------------------------------------ */
    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyZ', 'KeyX', 'KeyC', 'KeyP', 'Enter', 'Escape', 'Numpad1', 'Numpad2', 'Numpad3']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (overlay) {
        if (code === 'Enter' || code === 'Space') {
          var a = document.activeElement;
          if (a && overlay.el.contains(a) && a.tagName === 'BUTTON') a.click();
          else { var pb = overlay.panel.querySelector('.ig-actions .ig-btn'); if (pb) pb.click(); }
        } else if ((code === 'Escape' || code === 'KeyP') && phase === 'paused') resumeGame();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') { pauseGame(); return; }
      if (mode === 'demo' || !P.length) return;
      var solo = mode === 'arcade' || saved.p2cpu;
      var p1 = P[0], p2 = P[1];
      if (solo) {
        if (code === 'KeyJ' || code === 'KeyZ' || code === 'KeyF') press(p1, 'lp');
        else if (code === 'KeyK' || code === 'KeyX' || code === 'KeyG') press(p1, 'hp');
        else if (code === 'KeyL' || code === 'KeyC' || code === 'KeyH') press(p1, 'blk');
      } else {
        if (code === 'KeyF') press(p1, 'lp');
        else if (code === 'KeyG') press(p1, 'hp');
        else if (code === 'KeyH') press(p1, 'blk');
        else if (code === 'KeyJ' || code === 'Numpad1') press(p2, 'lp');
        else if (code === 'KeyK' || code === 'Numpad2') press(p2, 'hp');
        else if (code === 'KeyL' || code === 'Numpad3') press(p2, 'blk');
      }
    });
    function onPointerDown(e) {
      if (e.pointerType !== 'mouse' && !touchOn) { touchOn = true; syncTouch(); }
    }
    canvas.addEventListener('pointerdown', onPointerDown);

    /* ------------------------------------------------------------------ */
    /* Loop                                                                */
    /* ------------------------------------------------------------------ */
    var loop = IGAME.loop(function (dt) {
      time += dt;
      if (phase !== 'paused') {
        if (banner) banner.t++;
        var scale = slow > 0 ? 0.35 : 1;
        if (slow > 0) slow--;
        frameAcc += dt * scale;
        var n = 0;
        while (frameAcc >= STEP && n < 4) { step(); frameAcc -= STEP; n++; }
        if (n >= 4) frameAcc = 0;
        updateParticles(dt * scale);
        updateCam(dt);
      }
      render();
    });

    layout();
    startDemo();
    showTitle();
    loop.start();

    if (ctx.debug) {
      window.__stickDuel = {
        info: function () {
          return {
            phase: phase, mode: mode, timer: Math.ceil(timer), round: roundNo, stage: arcade && arcade.idx, score: arcade && arcade.score,
            p: P.map(function (f) { return { ch: f.ch.id, x: +f.x.toFixed(2), y: +f.y.toFixed(2), hp: Math.round(f.hp), st: f.state, mv: f.move && f.move.id, meter: Math.round(f.meter), rounds: f.rounds, combo: f.comboShow }; }),
          };
        },
        ko: function (i) { var f = P[i]; if (f) { f.hp = 1; } },
        meter: function (i) { if (P[i]) P[i].meter = 100; },
        win: function () { var o = P[1]; o.hp = 0; slow = 30; endRound(P[0], 'ko'); },
      };
    }

    return {
      pause: function () { if (phase === 'fight' || phase === 'intro' || phase === 'ko') pauseGame(); loop.stop(); },
      resume: function () { loop.start(); },
      destroy: function () {
        loop.stop();
        closeOverlay();
        persist();
        canvas.removeEventListener('pointerdown', onPointerDown);
        pauseBtn.removeEventListener('click', onPauseClick);
        pauseBtn.removeEventListener('pointerdown', stopProp);
        view.destroy();
        [styleEl, touchWrap, pauseBtn].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        if (ctx.debug) delete window.__stickDuel;
      },
    };
  });
})();
