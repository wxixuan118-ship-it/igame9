/*!
 * Quiver Clash — igame9 original ragdoll stick-archer duel
 * (same genre as ragdoll archery games such as Ragdoll Archers).
 *
 * Two stick archers face each other across hilly terrain. Drag back anywhere to
 * aim and set power, release to loose. Arrows fly with gravity and wind, stick
 * into terrain, trees and ragdoll limbs; headshots hit hardest. 1P "Gauntlet"
 * against 12 named AI archers (+ endless) with coin upgrades and special arrows,
 * or 2P on one device (split keyboard, or one half of the screen each on touch).
 *
 * World units: an archer is ~2.1 units tall, y grows downward like the screen.
 * The archers are verlet ragdolls driven by "muscles" that pull each joint toward
 * a pose; hits knock the muscles out for a moment, a K.O. turns them off.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var GRAV = 14; // arrow gravity
  var BODY_G = 26; // ragdoll gravity
  var ARROW_LEN = 0.9;
  var MIN_SPEED = 10, MAX_SPEED = 28;
  var BASE_DMG = 18;
  var SHOT_COST = 22;
  var RELOAD = 0.45;
  var GROUND_BOTTOM = 3;

  var THEMES = [
    { name: 'Meadow', sky: ['#5ab2f0', '#bfe6ff'], far: '#8cc7a0', grass: '#4caf50', grassHi: '#7ddc6f', dirt: '#7a5233', dirtLo: '#4e3220', sun: '#fff6b0' },
    { name: 'Autumn Ridge', sky: ['#f59e5b', '#ffe0b0'], far: '#d98b55', grass: '#c9771f', grassHi: '#f2a93b', dirt: '#6b3f22', dirtLo: '#3f2414', sun: '#fff1c2' },
    { name: 'Dusk Hills', sky: ['#3b2a6e', '#e07a8f'], far: '#6c4b8e', grass: '#5b7f4a', grassHi: '#8fbf6a', dirt: '#4a3150', dirtLo: '#2a1b30', sun: '#ffd1a8' },
    { name: 'Snowfield', sky: ['#9cc7ec', '#eef7ff'], far: '#c9dcef', grass: '#f1f5f9', grassHi: '#ffffff', dirt: '#7b8aa0', dirtLo: '#4b5567', sun: '#ffffff' },
    { name: 'Red Canyon', sky: ['#f08a4b', '#ffd59e'], far: '#c8643c', grass: '#b5562d', grassHi: '#df7a45', dirt: '#8a3b22', dirtLo: '#4d1f12', sun: '#fff0c0' },
  ];

  // name, title, hp, angle error (deg), power error, think time, wind knowledge,
  // chance to aim at the head, special arrows it may use, colour + hat
  var FOES = [
    { name: 'Reed', title: 'the Rookie', hp: 70, err: 7, perr: 0.09, think: [2.2, 3], wind: 0, head: 0.05, sp: '', color: '#22c55e', hat: 'band' },
    { name: 'Tess', title: 'Twig Ranger', hp: 85, err: 6.5, perr: 0.08, think: [2, 2.8], wind: 0.2, head: 0.1, sp: '', color: '#f59e0b', hat: 'cap' },
    { name: 'Bramble', title: 'Hedge Hermit', hp: 100, err: 6, perr: 0.075, think: [1.9, 2.6], wind: 0.35, head: 0.15, sp: '', color: '#a16207', hat: 'hood' },
    { name: 'Quill', title: 'the Captain', hp: 110, err: 5.5, perr: 0.07, think: [1.8, 2.4], wind: 0.5, head: 0.2, sp: '', color: '#ef4444', hat: 'feather' },
    { name: 'Marsh', title: 'Bog Sniper', hp: 120, err: 5, perr: 0.065, think: [1.7, 2.3], wind: 0.6, head: 0.3, sp: '', color: '#14b8a6', hat: 'band' },
    { name: 'Ironleaf', title: 'Tin Warden', hp: 140, err: 4.5, perr: 0.06, think: [1.6, 2.2], wind: 0.7, head: 0.3, sp: 'thumper', color: '#94a3b8', hat: 'helm' },
    { name: 'Sable', title: 'Night Archer', hp: 150, err: 4, perr: 0.055, think: [1.5, 2.1], wind: 0.8, head: 0.4, sp: 'cinder', color: '#6366f1', hat: 'hood' },
    { name: 'Old Fletch', title: 'Arrow Smith', hp: 160, err: 3.6, perr: 0.05, think: [1.5, 2], wind: 0.85, head: 0.4, sp: 'splitter', color: '#78716c', hat: 'cap' },
    { name: 'Duskwing', title: 'Sky Hunter', hp: 175, err: 3.2, perr: 0.045, think: [1.4, 1.9], wind: 0.9, head: 0.45, sp: 'splitter', color: '#a855f7', hat: 'feather' },
    { name: 'Ember Jack', title: 'Firestarter', hp: 190, err: 2.9, perr: 0.04, think: [1.3, 1.8], wind: 0.95, head: 0.5, sp: 'cinder', color: '#f97316', hat: 'band' },
    { name: 'Gale', title: 'Wind Reader', hp: 205, err: 2.6, perr: 0.035, think: [1.2, 1.7], wind: 1, head: 0.5, sp: 'splitter', color: '#0ea5e9', hat: 'hood' },
    { name: 'The Warden', title: 'Keeper of the Quiver', hp: 260, err: 2.2, perr: 0.03, think: [1.1, 1.5], wind: 1, head: 0.6, sp: 'cinder,splitter,thumper', color: '#facc15', hat: 'crown' },
  ];
  function foeFor(round) {
    if (round < FOES.length) return FOES[round];
    var k = round - FOES.length + 1;
    return { name: 'Shade ' + (round + 1), title: 'Endless challenger', hp: 260 + 15 * k, err: Math.max(1.5, 2.2 - 0.06 * k), perr: 0.03, think: [Math.max(0.9, 1.1 - 0.02 * k), 1.5], wind: 1, head: 0.6, sp: 'cinder,splitter,thumper', color: '#e11d48', hat: 'crown' };
  }

  var ARROWS = [
    { id: 'normal', name: 'Arrow', icon: '➵', desc: 'Standard shot' },
    { id: 'cinder', name: 'Cinder', icon: '🔥', desc: 'Sets the target smouldering: extra damage over 3 s' },
    { id: 'splitter', name: 'Splitter', icon: '⋔', desc: 'Looses three arrows in a fan' },
    { id: 'thumper', name: 'Thumper', icon: '⬣', desc: 'Heavy head: 1.6× damage and a huge knock-back' },
  ];

  var UPGRADES = [
    { id: 'dmg', name: 'Sharp Tips', desc: '+12% arrow damage', cost: [40, 90, 160, 250, 360] },
    { id: 'hp', name: 'Tough Hide', desc: '+15 max health', cost: [40, 90, 160, 250, 360] },
    { id: 'regen', name: 'Second Wind', desc: '+0.8 health per second', cost: [70, 150, 260] },
    { id: 'breath', name: 'Deep Breath', desc: 'Faster stamina, cheaper shots', cost: [50, 110, 200] },
    { id: 'cinder', name: 'Cinder Arrows', desc: 'Unlock smouldering arrows', cost: [120], unlock: true },
    { id: 'splitter', name: 'Splitter Arrows', desc: 'Unlock three-way shots', cost: [160], unlock: true },
    { id: 'thumper', name: 'Thumper Arrows', desc: 'Unlock heavy knock-back arrows', cost: [200], unlock: true },
    { id: 'quiver', name: 'Big Quiver', desc: '+1 special arrow of each kind per round', cost: [150, 300] },
  ];

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function gauss() {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 1.41;
  }
  function smooth(e0, e1, x) {
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // ragdoll joints: 0 head, 1 neck, 2 pelvis, 3 bow elbow, 4 bow hand, 5 draw elbow,
  // 6 draw hand, 7 knee A, 8 foot A, 9 knee B, 10 foot B
  var BONES = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10], [0, 2]];
  // hit capsules: bone index pair, radius, body part
  var HITBOX = [[1, 2, 0.15, 'body'], [1, 3, 0.09, 'limb'], [3, 4, 0.09, 'limb'], [1, 5, 0.09, 'limb'], [5, 6, 0.09, 'limb'], [2, 7, 0.1, 'limb'], [7, 8, 0.1, 'limb'], [2, 9, 0.1, 'limb'], [9, 10, 0.1, 'limb']];
  var MUSCLE = [0.22, 0.3, 0.35, 0.35, 0.45, 0.35, 0.45, 0.3, 0.6, 0.3, 0.6];

  IGAME.register('ragdoll-bow', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;

    var saved = {
      coins: store.get('coins', 0),
      up: store.get('up', {}),
      round: store.get('round', 0),
      best: store.get('best', 0),
    };
    function save() {
      store.set('coins', saved.coins);
      store.set('up', saved.up);
      store.set('round', saved.round);
      store.set('best', saved.best);
    }
    function lvl(id) {
      return saved.up[id] | 0;
    }

    /* ---------------- canvas ---------------- */
    var W = 0, H = 0, S = 40, viewH = 12, viewTop = -9;
    var booted = false;
    var view = IGAME.createCanvas(root, {
      onResize: function (w, h) {
        W = w;
        H = h;
        if (!booted) return;
        fitCamera();
        updateChips();
        if (!loop.isRunning()) render();
      },
    });
    var g = view.ctx;

    /* ---------------- HUD (DOM) ---------------- */
    var pauseBtn = ui.el('button', 'ig-pill', '❚❚');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:4;cursor:pointer;min-width:42px';
    root.appendChild(pauseBtn);
    var chipBars = [ui.el('div', ''), ui.el('div', '')];
    chipBars[0].style.cssText = 'position:absolute;left:8px;bottom:8px;display:flex;gap:4px;z-index:4';
    chipBars[1].style.cssText = 'position:absolute;right:8px;bottom:8px;display:flex;gap:4px;z-index:4';
    root.appendChild(chipBars[0]);
    root.appendChild(chipBars[1]);

    /* ---------------- state ---------------- */
    var state = 'title'; // title | menu | intro | fight | ko | paused
    var mode = '1p';
    var match = { round: 0, wins: [0, 0] };
    var arena = null;
    var archers = [];
    var arrows = [];
    var groundArrows = [];
    var particles = [];
    var popups = [];
    var banner = null;
    var wind = 0;
    var time = 0;
    var timeScale = 1;
    var hitStop = 0;
    var shake = 0;
    var overlay = null;
    var introT = 0, koT = 0;
    var drags = {}; // pointerId → drag
    var aimKeysUsed = [0, 0];
    var roundStats = null;
    var prevState = 'fight';

    /* ---------------- arena ---------------- */
    function makeArena(round) {
      var aspect = W && H ? W / H : 16 / 9;
      var aw = clamp(aspect * 12, 14, 26);
      var step = 0.25;
      var n = Math.ceil(aw / step) + 1;
      var gy = new Float32Array(n);
      var x1 = 2.3, x2 = aw - 2.3;
      var h1 = rand(-2.4, -0.4), h2 = rand(-2.4, -0.4);
      var ph1 = rand(0, TAU), ph2 = rand(0, TAU);
      for (var i = 0; i < n; i++) {
        var x = i * step;
        var y = 0.5 + Math.sin(x * 0.45 + ph1) * 0.7 + Math.sin(x * 1.25 + ph2) * 0.25;
        y = lerp(y, h1, smooth(2.8, 1.1, Math.abs(x - x1)));
        y = lerp(y, h2, smooth(2.8, 1.1, Math.abs(x - x2)));
        gy[i] = y;
      }
      var obstacles = [];
      if (round >= 2 && Math.random() < 0.65) {
        var cx = aw / 2 + rand(-1, 1);
        var base = sample(gy, step, cx);
        var kind = ['rock', 'pillar', 'tree'][Math.floor(Math.random() * 3)];
        if (kind === 'rock') {
          var r = rand(0.9, 1.4);
          obstacles.push({ kind: 'rock', x: cx, y: base - r * 0.55, r: r });
        } else if (kind === 'pillar') {
          var ph = rand(2.4, 3.8);
          obstacles.push({ kind: 'pillar', x: cx - 0.45, y: base - ph, w: 0.9, h: ph + 1 });
        } else {
          var th = rand(2.2, 3.2);
          obstacles.push({ kind: 'trunk', x: cx - 0.2, y: base - th, w: 0.4, h: th + 0.5 });
          obstacles.push({ kind: 'canopy', x: cx, y: base - th - 0.5, r: rand(1.1, 1.5) });
        }
      }
      var clouds = [];
      for (var c = 0; c < 6; c++) clouds.push({ x: rand(0, aw), y: rand(-1, 1), s: rand(0.6, 1.4) });
      var hills = [];
      for (var k = 0; k < 9; k++) hills.push({ x: rand(-2, aw + 2), r: rand(2.5, 5), h: rand(1.5, 3.5) });
      var grass = [];
      for (var q = 0; q < aw * 3; q++) grass.push(rand(0, aw), rand(0.6, 1.2));
      arena = { w: aw, step: step, gy: gy, x1: x1, x2: x2, obstacles: obstacles, theme: THEMES[round % THEMES.length], clouds: clouds, hills: hills, grass: grass };
      fitCamera();
    }
    function sample(gy, step, x) {
      var f = clamp(x / step, 0, gy.length - 1.001);
      var i = Math.floor(f);
      return lerp(gy[i], gy[i + 1], f - i);
    }
    function groundY(x) {
      return sample(arena.gy, arena.step, x);
    }
    function fitCamera() {
      if (!arena || !W) return;
      S = Math.min(W / arena.w, H / 9.5);
      viewH = H / S;
      // keep the bottom of the dirt at the bottom edge, centre horizontally
      viewTop = GROUND_BOTTOM - viewH;
    }
    function X(x) {
      return (x - arena.w / 2) * S + W / 2;
    }
    function Y(y) {
      return (y - viewTop) * S;
    }
    function toWorld(px, py) {
      return { x: (px - W / 2) / S + arena.w / 2, y: py / S + viewTop };
    }

    /* ---------------- archers ---------------- */
    function makeArcher(side, opts) {
      var x = side ? arena.x2 : arena.x1;
      var a = {
        side: side,
        dir: side ? -1 : 1,
        x: x,
        name: opts.name,
        color: opts.color,
        hat: opts.hat,
        ai: opts.ai || null,
        maxHp: opts.hp,
        hp: opts.hp,
        stam: 100,
        regen: opts.regen || 0,
        breath: opts.breath || 0,
        dmgMul: opts.dmgMul || 1,
        aim: 0.35,
        power: 0.6,
        draw: 0.15,
        reload: 0,
        muscle: 1,
        stun: 0,
        burn: 0,
        dead: false,
        sel: 'normal',
        charges: opts.charges || { cinder: 0, splitter: 0, thumper: 0 },
        stuck: [],
        hits: 0,
        heads: 0,
        tired: 0,
        pts: [],
        lastH: 1 / 120,
      };
      var T = poseTargets(a, []);
      for (var i = 0; i < 11; i++) a.pts.push({ x: T[i * 2], y: T[i * 2 + 1], px: T[i * 2], py: T[i * 2 + 1] });
      a.len = BONES.map(function (b) {
        var p = a.pts[b[0]], q = a.pts[b[1]];
        return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
      });
      return a;
    }

    // Target joint positions for the archer's current aim/draw.
    function poseTargets(a, out) {
      var d = a.dir;
      var gyv = groundY(a.x);
      var px = a.x - d * 0.05, py = gyv - 0.88;
      var nx = px + d * 0.06, ny = py - 0.75;
      var ux = d * Math.cos(a.aim), uy = -Math.sin(a.aim); // aim direction
      var vx = uy * d, vy = -ux * d; // perpendicular, pointing "up" relative to the aim
      if (vy > 0) {
        vx = -vx;
        vy = -vy;
      }
      var sx = nx, sy = ny + 0.08; // shoulder
      var bx = sx + ux * 0.72, by = sy + uy * 0.72;
      var pull = 0.14 + 0.5 * a.draw;
      var hx = bx - ux * pull, hy = by - uy * pull;
      out[0] = nx + d * 0.04;
      out[1] = ny - 0.3;
      out[2] = nx;
      out[3] = ny;
      out[4] = px;
      out[5] = py;
      out[6] = sx + ux * 0.37 - vx * 0.04;
      out[7] = sy + uy * 0.37 - vy * 0.04;
      out[8] = bx;
      out[9] = by;
      out[10] = (sx + hx) / 2 + vx * 0.2 - ux * 0.12;
      out[11] = (sy + hy) / 2 + vy * 0.2 - uy * 0.12;
      out[12] = hx;
      out[13] = hy;
      var fa = a.x - 0.34, fb = a.x + 0.34;
      out[16] = fa;
      out[17] = groundY(fa);
      out[20] = fb;
      out[21] = groundY(fb);
      out[14] = (px + fa) / 2 + d * 0.1;
      out[15] = (py + out[17]) / 2;
      out[18] = (px + fb) / 2 + d * 0.1;
      out[19] = (py + out[21]) / 2;
      return out;
    }

    var tgt = [];
    function updateBody(a, h) {
      var pts = a.pts;
      var m = a.dead ? 0 : a.muscle;
      if (m > 0) poseTargets(a, tgt);
      var kr = h / a.lastH; // time-corrected Verlet (slow-mo / frame-time changes)
      a.lastH = h;
      for (var i = 0; i < 11; i++) {
        var p = pts[i];
        var vx = (p.x - p.px) * 0.985 * kr, vy = (p.y - p.py) * 0.985 * kr;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + BODY_G * h * h;
        if (m > 0) {
          var k = MUSCLE[i] * m;
          p.x += (tgt[i * 2] - p.x) * k;
          p.y += (tgt[i * 2 + 1] - p.y) * k;
        }
      }
      for (var it = 0; it < 5; it++) {
        for (var b = 0; b < BONES.length; b++) {
          var A = pts[BONES[b][0]], B = pts[BONES[b][1]];
          var dx = B.x - A.x, dy = B.y - A.y;
          var dd = Math.sqrt(dx * dx + dy * dy) || 1e-6;
          var diff = ((dd - a.len[b]) / dd) * 0.5;
          A.x += dx * diff;
          A.y += dy * diff;
          B.x -= dx * diff;
          B.y -= dy * diff;
        }
        for (i = 0; i < 11; i++) {
          p = pts[i];
          var r = i === 0 ? 0.22 : 0.05;
          if (p.x < 0.3) p.x = 0.3;
          if (p.x > arena.w - 0.3) p.x = arena.w - 0.3;
          var gyv = groundY(p.x) - r;
          if (p.y > gyv) {
            p.y = gyv;
            p.px = p.x - (p.x - p.px) * 0.5; // ground friction
          }
        }
      }
    }

    // velocity kick to a joint (verlet: move the previous position)
    function kick(a, i, vx, vy) {
      var p = a.pts[i];
      p.px -= vx * a.lastH;
      p.py -= vy * a.lastH;
    }

    /* ---------------- arrows ---------------- */
    function speedFor(power) {
      return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power;
    }
    function nockPoint(a) {
      var p = a.pts[4];
      return { x: p.x + a.dir * Math.cos(a.aim) * 0.25, y: p.y - Math.sin(a.aim) * 0.25 };
    }
    function canShoot(a) {
      return !a.dead && a.reload <= 0 && a.stam >= shotCost(a) && (state === 'fight');
    }
    function shotCost(a) {
      return SHOT_COST * (1 - 0.08 * a.breath);
    }
    function shoot(a) {
      if (state !== 'fight') return false;
      if (!canShoot(a)) {
        if (!a.dead && state === 'fight' && a.tired <= 0) {
          a.tired = 0.6;
          popup(a.pts[0].x, a.pts[0].y - 0.6, a.reload > 0 ? 'Nocking…' : 'Out of breath!', '#fde68a', 0.7);
          if (!a.ai) sfx({ f: 220, d: 0.08, type: 'square', v: 0.05 });
        }
        return false;
      }
      var type = a.sel;
      if (type !== 'normal' && !(a.charges[type] > 0)) type = a.sel = 'normal';
      if (type !== 'normal') a.charges[type]--;
      a.stam -= shotCost(a);
      a.reload = RELOAD;
      var n = nockPoint(a);
      var sp = speedFor(a.power) * (type === 'thumper' ? 0.92 : 1);
      var angs = type === 'splitter' ? [-0.09, 0, 0.09] : [0];
      for (var i = 0; i < angs.length; i++) {
        var ang = a.aim + angs[i];
        arrows.push({ x: n.x, y: n.y, vx: a.dir * Math.cos(ang) * sp, vy: -Math.sin(ang) * sp, owner: a.side, type: type, life: 0, trail: [] });
      }
      a.draw = 0;
      // bow recoil wobble
      kick(a, 4, -a.dir * 2, 0);
      sfx({ f: 520, f2: 180, d: 0.12, type: 'triangle', v: 0.12 });
      sfx('shoot');
      updateChips();
      return true;
    }

    function updateArrows(h) {
      var SUB = 3;
      var hs = h / SUB;
      for (var i = arrows.length - 1; i >= 0; i--) {
        var ar = arrows[i];
        ar.life += h;
        var g2 = GRAV * (ar.type === 'thumper' ? 1.25 : 1);
        var done = false;
        for (var s = 0; s < SUB && !done; s++) {
          ar.vy += g2 * hs;
          ar.vx += wind * hs;
          ar.x += ar.vx * hs;
          ar.y += ar.vy * hs;
          done = collideArrow(ar);
        }
        if (!done && ar.type === 'cinder' && Math.random() < 0.6) {
          spark(ar.x - ar.vx * 0.02, ar.y - ar.vy * 0.02, Math.random() < 0.5 ? '#fb923c' : '#fde047', 0.3, 1);
        }
        if (!done) {
          ar.trail.push(ar.x, ar.y);
          if (ar.trail.length > 12) ar.trail.splice(0, 2);
        }
        if (done || ar.x < -6 || ar.x > arena.w + 6 || ar.y > GROUND_BOTTOM + 2 || ar.life > 8) arrows.splice(i, 1);
      }
    }

    // returns true when the arrow stopped (hit something)
    function collideArrow(ar) {
      // archers
      var foe = archers[1 - ar.owner];
      if (foe) {
        var hit = hitTest(foe, ar.x, ar.y);
        if (hit) {
          onHit(foe, ar, hit);
          return true;
        }
      }
      // obstacles
      for (var o = 0; o < arena.obstacles.length; o++) {
        var ob = arena.obstacles[o];
        var inside = ob.r ? (ar.x - ob.x) * (ar.x - ob.x) + (ar.y - ob.y) * (ar.y - ob.y) < ob.r * ob.r : ar.x > ob.x && ar.x < ob.x + ob.w && ar.y > ob.y && ar.y < ob.y + ob.h;
        if (inside) {
          stickInWorld(ar);
          sfx({ f: 160, f2: 90, d: 0.08, type: 'square', v: 0.08 });
          return true;
        }
      }
      if (ar.y >= groundY(ar.x)) {
        stickInWorld(ar);
        sfx({ f: 130, f2: 70, d: 0.07, type: 'square', v: 0.07 });
        for (var k = 0; k < 4; k++) spark(ar.x, ar.y, arena.theme.dirt, 0.35, 2);
        return true;
      }
      return false;
    }
    function stickInWorld(ar) {
      var sp = Math.sqrt(ar.vx * ar.vx + ar.vy * ar.vy) || 1;
      groundArrows.push({ x: ar.x + (ar.vx / sp) * 0.18, y: ar.y + (ar.vy / sp) * 0.18, ang: Math.atan2(ar.vy, ar.vx), type: ar.type, owner: ar.owner, t: time });
      if (groundArrows.length > 40) groundArrows.shift();
    }

    function segDist(px, py, ax, ay, bx, by) {
      var dx = bx - ax, dy = by - ay;
      var l2 = dx * dx + dy * dy || 1e-6;
      var t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
      var cx = ax + dx * t - px, cy = ay + dy * t - py;
      return { d: Math.sqrt(cx * cx + cy * cy), t: t };
    }
    function hitTest(a, x, y) {
      var P = a.pts;
      if (Math.abs(x - P[2].x) > 2 || Math.abs(y - P[2].y) > 2.4) return null;
      var hd = Math.sqrt((x - P[0].x) * (x - P[0].x) + (y - P[0].y) * (y - P[0].y));
      if (hd < 0.25) return { part: 'head', a: 1, b: 0, t: 1 };
      for (var i = 0; i < HITBOX.length; i++) {
        var hb = HITBOX[i];
        var r = segDist(x, y, P[hb[0]].x, P[hb[0]].y, P[hb[1]].x, P[hb[1]].y);
        if (r.d < hb[2]) return { part: hb[3], a: hb[0], b: hb[1], t: r.t };
      }
      return null;
    }

    function onHit(foe, ar, hit) {
      var shooter = archers[ar.owner];
      var mult = hit.part === 'head' ? 2.2 : hit.part === 'body' ? 1 : 0.6;
      var dmg = BASE_DMG * mult * (shooter ? shooter.dmgMul : 1);
      if (ar.type === 'thumper') dmg *= 1.6;
      if (ar.type === 'splitter') dmg *= 0.8;
      dmg = Math.round(dmg);
      foe.hp -= dmg;
      if (shooter) {
        shooter.hits++;
        if (hit.part === 'head') shooter.heads++;
      }
      if (ar.type === 'cinder') foe.burn = 3;
      // stick the arrow into the bone it hit
      var A = foe.pts[hit.a], B = foe.pts[hit.b];
      var bang = Math.atan2(B.y - A.y, B.x - A.x);
      var aang = Math.atan2(ar.vy, ar.vx);
      var bl = Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y)) || 1;
      // offset of the tip from the bone line, in bone space
      var rx = ar.x - A.x, ry = ar.y - A.y;
      var along = (rx * Math.cos(bang) + ry * Math.sin(bang)) / bl;
      var perp = -rx * Math.sin(bang) + ry * Math.cos(bang);
      var lim = hit.part === 'head' ? 0.25 : 0.15;
      foe.stuck.push({ a: hit.a, b: hit.b, t: along, off: clamp(perp, -lim, lim) * 0.5, rel: aang - bang, type: ar.type, owner: ar.owner });
      if (foe.stuck.length > 14) foe.stuck.shift();
      // knock-back
      var sp = Math.sqrt(ar.vx * ar.vx + ar.vy * ar.vy) || 1;
      var kb = (ar.type === 'thumper' ? 3.2 : 1) * 0.55;
      kick(foe, hit.a, ar.vx * kb, ar.vy * kb);
      kick(foe, hit.b, ar.vx * kb * 0.6, ar.vy * kb * 0.6);
      foe.muscle = ar.type === 'thumper' ? 0 : 0.15;
      foe.stun = ar.type === 'thumper' ? 0.9 : 0.45;
      // feedback
      var hx = ar.x, hy = ar.y;
      for (var k = 0; k < 10; k++) spark(hx, hy, k % 2 ? '#ffffff' : '#fde047', 0.45, 5);
      popup(hx, hy - 0.4, '-' + dmg, hit.part === 'head' ? '#fde047' : '#ffffff', 0.9);
      if (hit.part === 'head') {
        showBanner('HEADSHOT!', '#fde047', 0.9);
        hitStop = 0.08;
        sfx({ f: 1200, f2: 600, d: 0.12, type: 'square', v: 0.07 });
      }
      sfx('hit');
      shake = Math.max(shake, hit.part === 'head' ? 0.5 : 0.28);
      if (foe.ai) foe.ai.zero = Math.min(1, foe.ai.zero * 1.2 + 0.05); // flinch: aim worsens a bit
      if (foe.hp <= 0) knockOut(foe, ar);
    }

    function knockOut(a, ar) {
      if (a.dead) return;
      a.dead = true;
      a.hp = 0;
      a.muscle = 0;
      for (var i = 0; i < 11; i++) kick(a, i, (ar ? Math.sign(ar.vx) : -a.dir) * rand(3, 6), -rand(2, 5));
      sfx('explode');
      shake = 0.8;
      timeScale = 0.3;
      if (state === 'fight') {
        state = 'ko';
        koT = 0;
        var other = archers[1 - a.side];
        showBanner(other && other.dead ? 'DOUBLE K.O.!' : 'K.O.!', '#f87171', 1.6);
      }
    }

    /* ---------------- AI ---------------- */
    function makeAI(foe) {
      return { foe: foe, t: rand(foe.think[0], foe.think[1]) + 0.6, phase: 'think', zero: 1, goalAim: 0.4, goalPow: 0.6, drawT: 0 };
    }
    // Simulates an arrow; returns the height where it crosses tx (or null if it
    // hits terrain/obstacles before that).
    function flightHeightAt(x0, y0, ang, pow, dir, tx, windK, grav) {
      var sp = speedFor(pow);
      var vx = dir * Math.cos(ang) * sp, vy = -Math.sin(ang) * sp;
      var x = x0, y = y0, hs = 1 / 90;
      for (var i = 0; i < 360; i++) {
        vy += grav * hs;
        vx += wind * windK * hs;
        var nx = x + vx * hs, ny = y + vy * hs;
        if ((nx - tx) * dir >= 0) {
          var f = (tx - x) / (nx - x || 1e-6);
          return y + (ny - y) * f;
        }
        x = nx;
        y = ny;
        if (x > 0 && x < arena.w && y > groundY(x)) return null;
        for (var o = 0; o < arena.obstacles.length; o++) {
          var ob = arena.obstacles[o];
          if (ob.r ? (x - ob.x) * (x - ob.x) + (y - ob.y) * (y - ob.y) < ob.r * ob.r : x > ob.x && x < ob.x + ob.w && y > ob.y && y < ob.y + ob.h) return null;
        }
        if ((vx * dir) <= 0) return null;
      }
      return null;
    }
    // power that lands at (tx, ty) for a given angle (binary search), or -1
    function solvePower(a, ang, tx, ty, windK, grav) {
      var n = nockPoint(a);
      var lo = 0.05, hi = 1, best = -1;
      for (var i = 0; i < 16; i++) {
        var mid = (lo + hi) / 2;
        var y = flightHeightAt(n.x, n.y, ang, mid, a.dir, tx, windK, grav);
        if (y === null) {
          // blocked or fell short: more power usually helps for upward angles
          lo = mid;
          continue;
        }
        best = mid;
        if (y > ty) lo = mid; // arrow arrives too low → more power
        else hi = mid;
      }
      if (best < 0) return -1;
      var yy = flightHeightAt(n.x, n.y, ang, best, a.dir, tx, windK, grav);
      return yy !== null && Math.abs(yy - ty) < 0.35 ? best : -1;
    }
    function aiPlan(a) {
      var ai = a.ai, foe = ai.foe, target = archers[1 - a.side];
      var head = Math.random() < foe.head;
      var tp = head ? target.pts[0] : { x: (target.pts[1].x + target.pts[2].x) / 2, y: (target.pts[1].y + target.pts[2].y) / 2 };
      // pick a special arrow sometimes
      a.sel = 'normal';
      if (foe.sp && Math.random() < 0.35) {
        var opts = foe.sp.split(',').filter(function (s) { return a.charges[s] > 0; });
        if (opts.length) a.sel = opts[Math.floor(Math.random() * opts.length)];
      }
      var grav = GRAV * (a.sel === 'thumper' ? 1.25 : 1);
      var cands = [0.25, 0.4, 0.55, 0.7, 0.15, 0.85];
      var start = Math.floor(Math.random() * 3);
      var sol = null;
      for (var i = 0; i < cands.length; i++) {
        var ang = cands[(i + start) % cands.length];
        var p = solvePower(a, ang, tp.x, tp.y, foe.wind, grav);
        if (p > 0) {
          sol = { ang: ang, pow: p };
          break;
        }
      }
      if (!sol) sol = { ang: 0.6, pow: 0.8 };
      var e = ai.zero;
      ai.goalAim = clamp(sol.ang + (gauss() * foe.err * e * Math.PI) / 180, -0.3, 1.35);
      ai.goalPow = clamp(sol.pow * (1 + gauss() * foe.perr * e), 0.1, 1);
      ai.zero = Math.max(0.3, ai.zero * 0.72);
      ai.drawT = rand(0.55, 0.9);
    }
    function updateAI(a, dt) {
      var ai = a.ai;
      if (a.dead || state !== 'fight') {
        a.draw = lerp(a.draw, 0.1, Math.min(1, dt * 4));
        return;
      }
      ai.t -= dt;
      if (ai.phase === 'think') {
        a.draw = lerp(a.draw, 0.12, Math.min(1, dt * 4));
        if (ai.t <= 0 && a.stam >= shotCost(a) + 4 && a.stun <= 0) {
          aiPlan(a);
          ai.phase = 'draw';
          ai.t = ai.drawT;
        }
      } else {
        var k = 1 - ai.t / ai.drawT;
        a.aim = lerp(a.aim, ai.goalAim, Math.min(1, dt * 7));
        a.power = ai.goalPow;
        a.draw = clamp(k, 0, 1) * ai.goalPow;
        if (ai.t <= 0) {
          a.aim = ai.goalAim;
          shoot(a);
          ai.phase = 'think';
          ai.t = rand(ai.foe.think[0], ai.foe.think[1]);
        }
      }
    }

    /* ---------------- round flow ---------------- */
    function playerStats() {
      return {
        name: 'You',
        color: '#38bdf8',
        hat: 'band',
        hp: 100 + 15 * lvl('hp'),
        regen: 0.8 * lvl('regen'),
        breath: lvl('breath'),
        dmgMul: 1 + 0.12 * lvl('dmg'),
        charges: {
          cinder: lvl('cinder') ? 2 + lvl('quiver') : 0,
          splitter: lvl('splitter') ? 2 + lvl('quiver') : 0,
          thumper: lvl('thumper') ? 2 + lvl('quiver') : 0,
        },
      };
    }
    function setupRound() {
      var round = mode === '2p' ? match.round : saved.round;
      makeArena(round);
      arrows.length = 0;
      groundArrows.length = 0;
      particles.length = 0;
      popups.length = 0;
      timeScale = 1;
      drags = {};
      var maxWind = mode === '2p' ? 2.5 : Math.min(3.5, 0.32 * round);
      wind = round === 0 && mode === '1p' ? 0 : rand(-maxWind, maxWind);
      if (mode === '1p') {
        var foe = foeFor(round);
        archers = [makeArcher(0, playerStats()), makeArcher(1, { name: foe.name, color: foe.color, hat: foe.hat, hp: foe.hp, charges: { cinder: 2, splitter: 2, thumper: 2 } })];
        archers[1].ai = makeAI(foe);
      } else {
        var ch = function () { return { cinder: 2, splitter: 2, thumper: 2 }; };
        archers = [makeArcher(0, { name: 'Player 1', color: '#38bdf8', hat: 'band', hp: 100, charges: ch() }), makeArcher(1, { name: 'Player 2', color: '#f472b6', hat: 'cap', hp: 100, charges: ch() })];
      }
      archers[1].aim = 0.35;
      roundStats = { start: time };
      updateChips();
    }

    function startFight() {
      closeOverlay();
      setupRound();
      state = 'intro';
      introT = 0;
      var round = mode === '2p' ? match.round : saved.round;
      showBanner('ROUND ' + (round + 1), '#ffffff', 1);
      sfx('levelup');
      ctx.focus();
    }

    function endRound() {
      var p = archers[0], f = archers[1];
      var winner = p.dead && f.dead ? -1 : p.dead ? 1 : 0;
      state = 'menu';
      timeScale = 1;
      drags = {};
      updateChips();
      if (mode === '2p') {
        if (winner >= 0) match.wins[winner]++;
        var over = match.wins[0] >= 3 || match.wins[1] >= 3;
        var score = '<div style="font:900 30px system-ui,sans-serif;margin:4px 0 10px"><span style="color:#38bdf8">' + match.wins[0] + '</span> – <span style="color:#f472b6">' + match.wins[1] + '</span></div>';
        if (over) {
          var champ = match.wins[0] >= 3 ? 0 : 1;
          sfx('win');
          openOverlay({
            title: (champ ? 'Player 2' : 'Player 1') + ' wins the match!',
            html: score + '<div>First to 3 rounds. Headshots this match decide the bragging rights.</div>',
            buttons: [
              { label: '↻ Rematch', primary: true, onClick: function () { match = { round: 0, wins: [0, 0] }; startFight(); } },
              { label: 'Menu', onClick: showTitle },
            ],
          });
        } else {
          match.round++;
          openOverlay({
            title: winner < 0 ? 'Double K.O.!' : (winner ? 'Player 2' : 'Player 1') + ' takes the round',
            html: score + '<div style="font-size:13px;opacity:.85">First to 3 wins the match.</div>',
            buttons: [
              { label: 'Next round ▶', primary: true, onClick: startFight },
              { label: 'Menu', onClick: showTitle },
            ],
          });
        }
        return;
      }
      var round = saved.round;
      var foe = foeFor(round);
      if (winner === 0) {
        var base = 15 + 5 * round;
        var headB = 8 * p.heads;
        var hpB = Math.floor(Math.max(0, p.hp) / 4);
        var total = base + headB + hpB;
        saved.coins += total;
        saved.round = round + 1;
        saved.best = Math.max(saved.best, round + 1);
        save();
        sfx('win');
        openOverlay({
          title: 'Victory!',
          text: 'You beat ' + foe.name + ', ' + foe.title + '.',
          html: '<div style="display:grid;grid-template-columns:1fr auto;gap:2px 16px;max-width:240px;margin:0 auto 10px;text-align:left;font-size:14px">' +
            '<span>Round reward</span><b style="color:#fde047">+' + base + '</b>' +
            '<span>Headshots ×' + p.heads + '</span><b style="color:#fde047">+' + headB + '</b>' +
            '<span>Health left</span><b style="color:#fde047">+' + hpB + '</b>' +
            '<span style="border-top:1px solid rgba(255,255,255,.15);padding-top:4px">Coins</span><b style="border-top:1px solid rgba(255,255,255,.15);padding-top:4px;color:#fde047">● ' + saved.coins + '</b></div>' +
            (round + 1 === FOES.length ? '<div style="color:#fde047;font-weight:900">You beat the Warden! Endless challengers await.</div>' : '<div style="font-size:13px;opacity:.85">Next: ' + foeFor(round + 1).name + ', ' + foeFor(round + 1).title + '</div>'),
          buttons: [
            { label: 'Next round ▶', primary: true, onClick: showIntro },
            { label: '🛒 Upgrades', onClick: function () { showShop(showIntro); } },
          ],
        });
      } else {
        var cons = 4 + 2 * p.hits;
        saved.coins += cons;
        save();
        sfx('lose');
        openOverlay({
          title: winner < 0 ? 'Double K.O.!' : 'Defeated',
          text: (winner < 0 ? 'You both went down — that counts as a loss.' : foe.name + ' got you this time.') + ' You still earned ● ' + cons + ' for your hits.',
          html: '<div style="font-size:13px;opacity:.85">Tip: upgrades are permanent. Spend coins, then try round ' + (round + 1) + ' again.</div>',
          buttons: [
            { label: '↻ Retry round', primary: true, onClick: startFight },
            { label: '🛒 Upgrades', onClick: function () { showShop(showIntro); } },
            { label: 'Menu', onClick: showTitle },
          ],
        });
      }
    }

    /* ---------------- menus ---------------- */
    function openOverlay(o) {
      closeOverlay();
      overlay = ui.overlay(root, o);
      return overlay;
    }
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }

    function showTitle() {
      state = 'title';
      mode = '1p';
      makeArena(saved.round);
      archers = [makeArcher(0, playerStats()), makeArcher(1, (function (f) { return { name: f.name, color: f.color, hat: f.hat, hp: f.hp }; })(foeFor(saved.round)))];
      wind = 0;
      arrows.length = 0;
      groundArrows.length = 0;
      updateChips();
      openOverlay({
        title: ctx.title || 'Quiver Clash',
        text: 'Drag back to aim and set power, release to loose. Headshots hit hardest!',
        html: '<div style="font-size:14px">Gauntlet round <b style="color:#fff">' + (saved.round + 1) + '</b> · Best <b style="color:#fff">' + saved.best + '</b> · <span style="color:#fde047">● ' + saved.coins + '</span></div>' +
          '<div style="font-size:12px;opacity:.75;margin-top:6px">Keys: <span class="ig-kbd">↑</span><span class="ig-kbd">↓</span> aim · <span class="ig-kbd">←</span><span class="ig-kbd">→</span> power · <span class="ig-kbd">Space</span> shoot</div>',
        buttons: [
          { label: '▶ Gauntlet', primary: true, onClick: function () { mode = '1p'; showIntro(); } },
          { label: '👥 2 Players', onClick: function () { mode = '2p'; match = { round: 0, wins: [0, 0] }; show2pHelp(); } },
          { label: '🛒 Upgrades', onClick: function () { showShop(showTitle); } },
        ],
      });
    }

    function show2pHelp() {
      openOverlay({
        title: '2 Players',
        text: 'Same device, first to 3 rounds. Both archers get 2 of each special arrow per round.',
        html: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left;font-size:13px">' +
          '<div><b style="color:#38bdf8">Player 1 (left)</b><br><span class="ig-kbd">W</span><span class="ig-kbd">S</span> aim<br><span class="ig-kbd">A</span><span class="ig-kbd">D</span> power<br><span class="ig-kbd">F</span> shoot · <span class="ig-kbd">Q</span> arrow</div>' +
          '<div><b style="color:#f472b6">Player 2 (right)</b><br><span class="ig-kbd">↑</span><span class="ig-kbd">↓</span> aim<br><span class="ig-kbd">←</span><span class="ig-kbd">→</span> power<br><span class="ig-kbd">Enter</span> shoot · <span class="ig-kbd">/</span> arrow</div>' +
          '</div><div style="font-size:12px;opacity:.8;margin-top:8px">Touch or mouse: drag on your own half of the screen.</div>',
        buttons: [
          { label: '▶ Fight', primary: true, onClick: startFight },
          { label: '← Back', onClick: showTitle },
        ],
      });
    }

    function showIntro() {
      mode = '1p';
      var round = saved.round;
      var foe = foeFor(round);
      state = 'menu';
      makeArena(round);
      archers = [makeArcher(0, playerStats()), makeArcher(1, { name: foe.name, color: foe.color, hat: foe.hat, hp: foe.hp })];
      wind = 0;
      arrows.length = 0;
      groundArrows.length = 0;
      updateChips();
      var acc = Math.round(clamp(10 - foe.err, 1, 9));
      var pips = '';
      for (var i = 0; i < 9; i++) pips += '<span style="display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 1px;background:' + (i < acc ? '#f87171' : 'rgba(255,255,255,.15)') + '"></span>';
      openOverlay({
        title: 'Round ' + (round + 1) + ': ' + foe.name,
        text: foe.title + (round >= FOES.length ? '' : ' · opponent ' + (round + 1) + ' of ' + FOES.length),
        html: '<div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;justify-content:center;text-align:left;font-size:14px;margin-bottom:6px">' +
          '<span>Health</span><b style="color:#fff">' + foe.hp + '</b><span>Accuracy</span><span>' + pips + '</span>' +
          (foe.sp ? '<span>Specials</span><b style="color:#fdba74">' + foe.sp.split(',').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(', ') + '</b>' : '') +
          '</div><div style="font-size:13px;opacity:.85">Your health ' + playerStats().hp + ' · damage ×' + playerStats().dmgMul.toFixed(2) + ' · <span style="color:#fde047">● ' + saved.coins + '</span></div>',
        buttons: [
          { label: '⚔ Fight!', primary: true, onClick: startFight },
          { label: '🛒 Upgrades', onClick: function () { showShop(showIntro); } },
          { label: 'Menu', onClick: showTitle },
        ],
      });
    }

    function showShop(back) {
      state = state === 'fight' ? 'paused' : 'menu';
      var list = ui.el('div', '');
      list.style.cssText = 'display:grid;gap:6px;margin:4px 0 12px;text-align:left';
      UPGRADES.forEach(function (u) {
        var level = lvl(u.id);
        var maxed = level >= u.cost.length;
        var cost = maxed ? 0 : u.cost[level];
        var row = ui.el('div', '');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)';
        var pips = '';
        if (!u.unlock) for (var i = 0; i < u.cost.length; i++) pips += '<span style="display:inline-block;width:14px;height:5px;border-radius:3px;margin-right:2px;background:' + (i < level ? '#8b6cff' : 'rgba(255,255,255,.15)') + '"></span>';
        row.innerHTML = '<div style="flex:1;min-width:0"><div style="font-weight:800;color:#fff;font-size:14px">' + u.name + '</div><div style="font-size:12px;opacity:.8">' + u.desc + '</div>' + (pips ? '<div style="margin-top:3px">' + pips + '</div>' : '') + '</div>';
        var b = ui.el('button', 'ig-btn' + (maxed ? ' secondary' : ''), maxed ? (u.unlock ? '✓ Owned' : 'Max') : '● ' + cost);
        b.type = 'button';
        b.style.cssText = 'padding:8px 12px;font-size:14px;min-width:84px';
        if (maxed) b.disabled = true;
        else if (saved.coins < cost) b.style.opacity = '0.55';
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (maxed) return;
          if (saved.coins < cost) {
            sfx('error');
            ui.toast(root, 'Need ' + (cost - saved.coins) + ' more coins', 1300);
            return;
          }
          saved.coins -= cost;
          saved.up[u.id] = level + 1;
          save();
          sfx('buy');
          showShop(back);
        });
        row.appendChild(b);
        list.appendChild(row);
      });
      var o = openOverlay({
        title: 'Upgrades',
        text: 'Coins: ● ' + saved.coins + ' — upgrades are permanent (Gauntlet only).',
        buttons: [{ label: 'Done', primary: true, onClick: back || showTitle }],
      });
      o.panel.style.width = 'min(480px, 100%)';
      o.panel.insertBefore(list, o.panel.querySelector('.ig-actions'));
    }

    function pauseGame() {
      if (state !== 'fight' && state !== 'intro' && state !== 'ko') return;
      prevState = state;
      state = 'paused';
      drags = {};
      openOverlay({
        title: 'Paused',
        text: mode === '2p' ? '2 Players · round ' + (match.round + 1) : 'Round ' + (saved.round + 1) + ' vs ' + foeFor(saved.round).name,
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: '↻ Restart round', onClick: startFight },
          { label: 'Quit to menu', onClick: showTitle },
        ],
      });
    }
    function resumeGame() {
      closeOverlay();
      state = prevState;
      ctx.focus();
    }

    /* ---------------- arrow chips ---------------- */
    var chipKey = '';
    function updateChips() {
      var key = state + '|' + mode + '|' + W + '|' + archers.map(function (a) { return a.sel + JSON.stringify(a.charges); }).join('|');
      if (key === chipKey) return;
      chipKey = key;
      // chip size: two bars of four must fit side by side on narrow phones in 2P
      var cs = mode === '2p' ? clamp(Math.floor((W - 16 - 8 - 6 * 3) / 8), 30, 40) : 40;
      for (var s = 0; s < 2; s++) {
        var bar = chipBars[s];
        bar.style.gap = mode === '2p' && cs < 40 ? '3px' : '4px';
        bar.innerHTML = '';
        var a = archers[s];
        var show = a && !a.ai && (state === 'fight' || state === 'intro' || state === 'ko');
        bar.style.display = show ? 'flex' : 'none';
        if (!show) continue;
        ARROWS.forEach(function (t, i) {
          var n = t.id === 'normal' ? -1 : a.charges[t.id] | 0;
          if (t.id !== 'normal' && mode === '1p' && !lvl(t.id)) return;
          var sel = a.sel === t.id;
          var b = ui.el('button', '', '<span style="font-size:17px;line-height:1">' + t.icon + '</span><span style="position:absolute;right:3px;bottom:1px;font:800 10px system-ui,sans-serif">' + (n < 0 ? '∞' : n) + '</span>');
          b.type = 'button';
          b.title = t.name + ' — ' + t.desc + (mode === '1p' ? ' (key ' + (i + 1) + ')' : '');
          b.setAttribute('aria-label', t.name + ' arrows' + (n < 0 ? '' : ', ' + n + ' left'));
          b.style.cssText = 'position:relative;width:' + cs + 'px;height:' + cs + 'px;border-radius:10px;cursor:pointer;color:#fff;display:grid;place-items:center;padding:0;font-family:inherit;touch-action:manipulation;background:' +
            (sel ? (s ? 'rgba(244,114,182,.55)' : 'rgba(56,189,248,.55)') : 'rgba(5,6,14,.55)') + ';border:2px solid ' + (sel ? '#fff' : 'rgba(255,255,255,.15)') + (n === 0 ? ';opacity:.4' : '');
          b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            selectArrow(a, t.id);
          });
          bar.appendChild(b);
        });
      }
    }
    function selectArrow(a, id) {
      if (id !== 'normal' && !(a.charges[id] > 0)) {
        sfx('error');
        return;
      }
      a.sel = id;
      sfx('click');
      updateChips();
    }
    function cycleArrow(a) {
      var ids = ['normal', 'cinder', 'splitter', 'thumper'].filter(function (id) { return id === 'normal' || a.charges[id] > 0; });
      var i = ids.indexOf(a.sel);
      selectArrow(a, ids[(i + 1) % ids.length]);
    }

    /* ---------------- effects ---------------- */
    function spark(x, y, color, life, speed) {
      if (particles.length > 180) return;
      var an = Math.random() * TAU, v = rand(0.3, 1) * speed;
      particles.push({ x: x, y: y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - speed * 0.3, life: life, max: life, color: color, size: rand(0.05, 0.1) });
    }
    function popup(x, y, text, color, life) {
      popups.push({ x: x, y: y, text: text, color: color, life: life || 0.9, max: life || 0.9 });
    }
    function showBanner(text, color, life) {
      banner = { text: text, color: color, life: life, max: life };
    }

    /* ---------------- input ---------------- */
    function humanFor(px) {
      if (mode === '1p') return archers[0];
      return px < W / 2 ? archers[0] : archers[1];
    }
    function onDown(e) {
      if (e.button != null && e.button > 0) return;
      if (overlay || (state !== 'fight' && state !== 'intro')) return;
      var r = view.canvas.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      var a = humanFor(px);
      if (!a || a.ai || a.dead) return;
      // one drag per archer
      for (var k in drags) if (drags[k].a === a) return;
      drags[e.pointerId] = { a: a, sx: px, sy: py, x: px, y: py };
      aimKeysUsed[a.side] = 0;
      try {
        view.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      var d = drags[e.pointerId];
      if (!d) return;
      var r = view.canvas.getBoundingClientRect();
      d.x = e.clientX - r.left;
      d.y = e.clientY - r.top;
      applyDrag(d);
    }
    function applyDrag(d) {
      var a = d.a;
      var dx = d.sx - d.x, dy = d.sy - d.y; // pull back → shoot the other way
      var len = Math.sqrt(dx * dx + dy * dy);
      var full = Math.max(90, Math.min(W, H) * 0.32);
      d.pow = clamp(len / full, 0, 1);
      if (len > 6) {
        var ang = Math.atan2(-dy, dx * a.dir);
        a.aim = clamp(ang, -0.5, 1.45);
      }
      a.power = Math.max(0.05, d.pow);
      a.draw = d.pow;
    }
    function onUp(e) {
      var d = drags[e.pointerId];
      if (!d) return;
      delete drags[e.pointerId];
      if (d.pow >= 0.12) shoot(d.a);
      else d.a.draw = 0.15;
    }
    view.canvas.style.touchAction = 'none';
    view.canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    pauseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (state === 'paused') resumeGame();
      else pauseGame();
    });

    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyF', 'KeyP', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Slash', 'Period', 'Numpad0', 'Numpad1']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          var act = document.activeElement;
          var btn = act && overlay.el.contains(act) && act.tagName === 'BUTTON' && !act.disabled ? act : overlay.panel.querySelector('.ig-actions .ig-btn');
          if (btn) btn.click();
        } else if ((code === 'KeyP' || code === 'Escape') && state === 'paused') resumeGame();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') {
        pauseGame();
        return;
      }
      if (state !== 'fight' && state !== 'intro') return;
      var p1 = archers[0], p2 = archers[1];
      if (mode === '1p') {
        if (code === 'Space' || code === 'Enter' || code === 'KeyF') shoot(p1);
        else if (code === 'KeyQ') cycleArrow(p1);
        else if (code === 'KeyE') cycleArrow(p1);
        else if (/^Digit[1-4]$/.test(code)) {
          var id = ARROWS[+code.slice(5) - 1].id;
          if (id === 'normal' || lvl(id)) selectArrow(p1, id);
        }
      } else {
        if (code === 'KeyF' || code === 'Space') shoot(p1);
        else if (code === 'KeyQ') cycleArrow(p1);
        else if (code === 'Enter' || code === 'Numpad0') shoot(p2);
        else if (code === 'Slash' || code === 'Period' || code === 'Numpad1') cycleArrow(p2);
      }
    });

    // continuous keyboard aiming
    function keyAim(dt) {
      var k = ctx.keys;
      var sets = mode === '1p'
        ? [[k.ArrowUp || k.KeyW, k.ArrowDown || k.KeyS, k.ArrowLeft || k.KeyA, k.ArrowRight || k.KeyD]]
        : [[k.KeyW, k.KeyS, k.KeyA, k.KeyD], [k.ArrowUp, k.ArrowDown, k.ArrowLeft, k.ArrowRight]];
      for (var s = 0; s < sets.length; s++) {
        var a = archers[s];
        if (!a || a.ai || a.dead) continue;
        var dragging = false;
        for (var id in drags) if (drags[id].a === a) dragging = true;
        if (dragging) continue;
        var ks = sets[s];
        if (ks[0] || ks[1] || ks[2] || ks[3]) aimKeysUsed[s] = 3;
        if (ks[0]) a.aim = Math.min(1.45, a.aim + dt * 1.2);
        if (ks[1]) a.aim = Math.max(-0.5, a.aim - dt * 1.2);
        if (ks[2]) a.power = Math.max(0.12, a.power - dt * 0.6);
        if (ks[3]) a.power = Math.min(1, a.power + dt * 0.6);
        // in keyboard mode the bow stays drawn at the chosen power
        if (aimKeysUsed[s] > 0) a.draw = lerp(a.draw, a.power, Math.min(1, dt * 10));
        else a.draw = lerp(a.draw, 0.15, Math.min(1, dt * 4));
      }
    }

    /* ---------------- update ---------------- */
    function update(dt) {
      time += dt;
      if (hitStop > 0) {
        hitStop -= dt;
        return;
      }
      var sdt = dt * timeScale;
      if (shake > 0) shake = Math.max(0, shake - dt * 2.4);
      if (banner) {
        banner.life -= dt;
        if (banner.life <= 0) banner = null;
      }
      if (state === 'intro') {
        introT += dt;
        if (introT > 1.1) {
          state = 'fight';
          showBanner('FIGHT!', '#fde047', 0.7);
          sfx('boost');
          updateChips();
        }
      }
      if (state === 'ko') {
        koT += dt;
        timeScale = lerp(timeScale, 1, Math.min(1, dt * 0.8));
        if (koT > 2) endRound();
      }
      var fighting = state === 'fight' || state === 'intro' || state === 'ko';
      for (var i = 0; i < archers.length; i++) {
        var a = archers[i];
        if (fighting && !a.dead) {
          a.reload = Math.max(0, a.reload - sdt);
          a.tired = Math.max(0, a.tired - sdt);
          a.stam = Math.min(100, a.stam + sdt * 16 * (1 + 0.25 * a.breath));
          if (a.regen && state === 'fight') a.hp = Math.min(a.maxHp, a.hp + a.regen * sdt);
          if (a.stun > 0) a.stun -= sdt;
          a.muscle = lerp(a.muscle, 1, Math.min(1, sdt * (a.stun > 0 ? 0.6 : 3)));
          if (a.burn > 0) {
            a.burn -= sdt;
            a.hp -= 6 * sdt;
            var bp = a.pts[Math.floor(Math.random() * 11)];
            if (Math.random() < 0.5) spark(bp.x, bp.y, Math.random() < 0.5 ? '#fb923c' : '#fde047', 0.4, 1.2);
            if (a.hp <= 0 && state === 'fight') knockOut(a, null);
          }
        }
        if (a.ai && fighting) updateAI(a, sdt);
      }
      if (state === 'fight') keyAim(sdt);
      for (i = 0; i < 2; i++) if (aimKeysUsed[i] > 0) aimKeysUsed[i] -= sdt;
      // physics: 2 substeps for the ragdolls
      var h = Math.min(sdt, 1 / 30) / 2;
      for (var s2 = 0; s2 < 2; s2++) for (i = 0; i < archers.length; i++) updateBody(archers[i], h);
      if (arena) updateArrows(Math.min(sdt, 1 / 30));
      for (i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life -= sdt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += 9 * sdt;
        p.x += p.vx * sdt;
        p.y += p.vy * sdt;
      }
      for (i = popups.length - 1; i >= 0; i--) {
        popups[i].life -= dt;
        popups[i].y -= dt * 0.8;
        if (popups[i].life <= 0) popups.splice(i, 1);
      }
      // stamina-gated arrows: refresh chips occasionally (counts change on shots only)
      if (state === 'fight' && archers[0] && archers[1] && archers[0].dead && archers[1].dead) state = 'ko';
    }

    /* ---------------- rendering ---------------- */
    function drawBackground() {
      var th = arena.theme;
      var grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, th.sky[0]);
      grd.addColorStop(1, th.sky[1]);
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      // sun
      var sx = W * 0.78, sy = Y(-6.5);
      var sg = g.createRadialGradient(sx, sy, 0, sx, sy, S * 3);
      sg.addColorStop(0, th.sun);
      sg.addColorStop(0.25, 'rgba(255,255,255,0.35)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg;
      g.fillRect(0, 0, W, H);
      // far hills
      g.fillStyle = th.far;
      g.globalAlpha = 0.6;
      g.beginPath();
      for (var i = 0; i < arena.hills.length; i++) {
        var hl = arena.hills[i];
        g.moveTo(X(hl.x - hl.r), Y(1.5));
        g.ellipse(X(hl.x), Y(1.5), hl.r * S, hl.h * S, 0, Math.PI, 0);
      }
      g.fill();
      g.globalAlpha = 1;
      // clouds drift with the wind
      for (i = 0; i < arena.clouds.length; i++) {
        var c = arena.clouds[i];
        var span = arena.w + 8;
        var cx = ((((c.x + time * (0.3 + wind * 0.35)) % span) + span) % span) - 4;
        var cy = Y(-7 + c.y * 1.5);
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.beginPath();
        g.ellipse(X(cx), cy, 1.4 * c.s * S, 0.35 * c.s * S, 0, 0, TAU);
        g.ellipse(X(cx + 0.7 * c.s), cy - 0.2 * c.s * S, 0.8 * c.s * S, 0.35 * c.s * S, 0, 0, TAU);
        g.fill();
      }
    }

    function drawTerrain() {
      var th = arena.theme;
      var gy = arena.gy, step = arena.step;
      var x0 = Math.min(X(0), 0) - 2, x1 = Math.max(X(arena.w), W) + 2;
      g.fillStyle = th.dirt;
      g.beginPath();
      g.moveTo(x0, H + 2);
      g.lineTo(x0, Y(gy[0]));
      for (var i = 0; i < gy.length; i++) g.lineTo(X(i * step), Y(gy[i]));
      g.lineTo(x1, Y(gy[gy.length - 1]));
      g.lineTo(x1, H + 2);
      g.closePath();
      g.fill();
      // darker band at depth
      var dg = g.createLinearGradient(0, Y(0), 0, H);
      dg.addColorStop(0, 'rgba(0,0,0,0)');
      dg.addColorStop(1, th.dirtLo);
      g.fillStyle = dg;
      g.fill();
      // grass top
      g.strokeStyle = th.grass;
      g.lineWidth = Math.max(4, S * 0.28);
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(x0, Y(gy[0]) + g.lineWidth / 2 - 1);
      for (i = 0; i < gy.length; i++) g.lineTo(X(i * step), Y(gy[i]) + g.lineWidth / 2 - 1);
      g.lineTo(x1, Y(gy[gy.length - 1]) + g.lineWidth / 2 - 1);
      g.stroke();
      // grass tufts sway with the wind
      g.strokeStyle = th.grassHi;
      g.lineWidth = Math.max(1, S * 0.04);
      g.beginPath();
      var sway = wind * 0.04 + Math.sin(time * 2) * 0.03;
      for (i = 0; i < arena.grass.length; i += 2) {
        var gx = arena.grass[i], gh = arena.grass[i + 1] * 0.22;
        var gyv = groundY(gx);
        g.moveTo(X(gx), Y(gyv));
        g.lineTo(X(gx + sway * 4 - 0.05), Y(gyv - gh));
        g.moveTo(X(gx + 0.06), Y(gyv));
        g.lineTo(X(gx + sway * 4 + 0.1), Y(gyv - gh * 0.8));
      }
      g.stroke();
      // obstacles
      for (i = 0; i < arena.obstacles.length; i++) {
        var o = arena.obstacles[i];
        if (o.kind === 'rock') {
          g.fillStyle = '#6b7280';
          g.beginPath();
          g.ellipse(X(o.x), Y(o.y), o.r * S, o.r * S * 0.95, 0, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.beginPath();
          g.ellipse(X(o.x - o.r * 0.3), Y(o.y - o.r * 0.35), o.r * S * 0.45, o.r * S * 0.3, -0.5, 0, TAU);
          g.fill();
        } else if (o.kind === 'pillar') {
          g.fillStyle = '#78716c';
          g.fillRect(X(o.x), Y(o.y), o.w * S, o.h * S);
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.fillRect(X(o.x + o.w * 0.65), Y(o.y), o.w * 0.35 * S, o.h * S);
          g.fillStyle = 'rgba(255,255,255,0.2)';
          for (var k = 1; k < 4; k++) g.fillRect(X(o.x), Y(o.y + (o.h * k) / 4.5), o.w * S, Math.max(1, S * 0.04));
        } else if (o.kind === 'trunk') {
          g.fillStyle = '#7c4a24';
          g.fillRect(X(o.x), Y(o.y), o.w * S, o.h * S);
        } else if (o.kind === 'canopy') {
          var wob = Math.sin(time * 1.5) * 0.05 + wind * 0.03;
          g.fillStyle = '#2f7d3a';
          g.beginPath();
          g.ellipse(X(o.x + wob), Y(o.y), o.r * S, o.r * S * 0.9, 0, 0, TAU);
          g.fill();
          g.fillStyle = '#3f9b4a';
          g.beginPath();
          g.ellipse(X(o.x - o.r * 0.25 + wob), Y(o.y - o.r * 0.25), o.r * S * 0.6, o.r * S * 0.5, 0, 0, TAU);
          g.fill();
        }
      }
      // wind flag in the middle of the field
      var fx = arena.w / 2, fy = groundY(fx);
      if (!arena.obstacles.length) {
        g.strokeStyle = '#e5e7eb';
        g.lineWidth = Math.max(2, S * 0.05);
        g.beginPath();
        g.moveTo(X(fx), Y(fy));
        g.lineTo(X(fx), Y(fy - 1.6));
        g.stroke();
        var len = clamp(Math.abs(wind) / 3.5, 0.15, 1) * 0.9 * Math.sign(wind || 1);
        var fl = Math.sin(time * 8) * 0.06;
        g.fillStyle = '#ef4444';
        g.beginPath();
        g.moveTo(X(fx), Y(fy - 1.6));
        g.lineTo(X(fx + len), Y(fy - 1.45 + fl));
        g.lineTo(X(fx), Y(fy - 1.25));
        g.closePath();
        g.fill();
      }
    }

    function drawArrowShape(x, y, ang, type, owner, alpha, scale) {
      // (x, y) is the tip
      var c = Math.cos(ang), s = Math.sin(ang);
      var L = ARROW_LEN * S * (scale || 1);
      var tx = X(x), ty = Y(y);
      var bx = tx - c * L, by = ty - s * L;
      g.globalAlpha = alpha == null ? 1 : alpha;
      g.strokeStyle = type === 'thumper' ? '#3f3f46' : '#a16207';
      g.lineWidth = Math.max(1.5, S * (type === 'thumper' ? 0.07 : 0.045));
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(tx - c * L * 0.12, ty - s * L * 0.12);
      g.stroke();
      // head
      var hs = S * (type === 'thumper' ? 0.17 : 0.11);
      g.fillStyle = type === 'cinder' ? '#fb923c' : type === 'thumper' ? '#27272a' : '#d4d4d8';
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(tx - c * hs * 1.5 - s * hs * 0.6, ty - s * hs * 1.5 + c * hs * 0.6);
      g.lineTo(tx - c * hs * 1.5 + s * hs * 0.6, ty - s * hs * 1.5 - c * hs * 0.6);
      g.closePath();
      g.fill();
      if (type === 'cinder') {
        g.fillStyle = 'rgba(253,224,71,' + (0.5 + 0.5 * Math.sin(time * 20)) * (alpha == null ? 1 : alpha) + ')';
        g.beginPath();
        g.arc(tx - c * hs, ty - s * hs, hs * 0.8, 0, TAU);
        g.fill();
      }
      // fletching
      var fcol = type === 'splitter' ? '#22c55e' : owner ? '#f472b6' : '#38bdf8';
      g.fillStyle = fcol;
      var fw = S * 0.1;
      g.beginPath();
      g.moveTo(bx + c * fw * 2, by + s * fw * 2);
      g.lineTo(bx - s * fw, by + c * fw);
      g.lineTo(bx, by);
      g.lineTo(bx + s * fw, by - c * fw);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }

    function drawArcher(a) {
      var P = a.pts;
      var lw = Math.max(2.5, S * 0.12);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // stuck arrows behind the body (shaft outside)
      drawStuck(a);
      for (var pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? '#1f2937' : 'rgba(255,255,255,0.55)';
        g.lineWidth = pass ? lw : lw + Math.max(2, S * 0.05);
        g.beginPath();
        line(P[1], P[2]);
        line(P[2], P[7]);
        line(P[7], P[8]);
        line(P[2], P[9]);
        line(P[9], P[10]);
        line(P[1], P[3]);
        line(P[3], P[4]);
        line(P[1], P[5]);
        line(P[5], P[6]);
        g.stroke();
        g.fillStyle = pass ? '#1f2937' : 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.arc(X(P[0].x), Y(P[0].y), 0.22 * S + (pass ? 0 : Math.max(1, S * 0.025)), 0, TAU);
        g.fill();
      }
      drawHat(a);
      // face: eye looking toward the foe (x's when knocked out)
      var hx = X(P[0].x), hy = Y(P[0].y), r = 0.22 * S;
      g.strokeStyle = '#fff';
      g.fillStyle = '#fff';
      if (a.dead) {
        g.lineWidth = Math.max(1, r * 0.14);
        g.beginPath();
        var ex = hx + a.dir * r * 0.35, ey = hy - r * 0.1, es = r * 0.18;
        g.moveTo(ex - es, ey - es);
        g.lineTo(ex + es, ey + es);
        g.moveTo(ex + es, ey - es);
        g.lineTo(ex - es, ey + es);
        g.stroke();
      } else {
        g.beginPath();
        g.arc(hx + a.dir * r * 0.4, hy - r * 0.1, Math.max(1.2, r * 0.16), 0, TAU);
        g.fill();
      }
      drawBow(a);
      if (a.burn > 0) {
        for (var i = 0; i < 3; i++) {
          var bp = P[[0, 2, 1][i]];
          var fl = 0.18 + 0.08 * Math.sin(time * 18 + i * 2);
          g.fillStyle = i % 2 ? 'rgba(251,146,60,0.75)' : 'rgba(253,224,71,0.75)';
          g.beginPath();
          g.moveTo(X(bp.x - 0.1), Y(bp.y));
          g.quadraticCurveTo(X(bp.x), Y(bp.y - fl * 2.5), X(bp.x + 0.1), Y(bp.y));
          g.fill();
        }
      }
    }
    function line(p, q) {
      g.moveTo(X(p.x), Y(p.y));
      g.lineTo(X(q.x), Y(q.y));
    }
    function drawHat(a) {
      var P = a.pts;
      var hx = X(P[0].x), hy = Y(P[0].y), r = 0.22 * S;
      var ux = P[0].x - P[1].x, uy = P[0].y - P[1].y;
      var ul = Math.sqrt(ux * ux + uy * uy) || 1;
      ux /= ul;
      uy /= ul;
      var fx = -uy * a.dir, fy = ux * a.dir; // forward
      g.fillStyle = a.color;
      g.strokeStyle = a.color;
      g.lineWidth = Math.max(2, r * 0.35);
      var ang = Math.atan2(uy, ux);
      if (a.hat === 'band') {
        g.beginPath();
        g.moveTo(hx - fx * r + ux * r * 0.35, hy - fy * r + uy * r * 0.35);
        g.lineTo(hx + fx * r + ux * r * 0.35, hy + fy * r + uy * r * 0.35);
        var bx = hx - fx * r + ux * r * 0.35, by = hy - fy * r + uy * r * 0.35;
        var w = Math.sin(time * 9) * 0.3;
        g.moveTo(bx, by);
        g.lineTo(bx - fx * r * 1.3 - ux * r * (0.3 + w), by - fy * r * 1.3 - uy * r * (0.3 + w));
        g.stroke();
      } else if (a.hat === 'cap') {
        g.beginPath();
        g.arc(hx + ux * r * 0.1, hy + uy * r * 0.1, r * 1.04, ang - Math.PI / 2, ang + Math.PI / 2);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(hx + ux * r * 0.12, hy + uy * r * 0.12);
        g.lineTo(hx + ux * r * 0.12 + fx * r * 1.5, hy + uy * r * 0.12 + fy * r * 1.5);
        g.stroke();
      } else if (a.hat === 'hood') {
        g.beginPath();
        g.arc(hx, hy, r * 1.18, ang - Math.PI * 0.75, ang + Math.PI * 0.75);
        g.lineTo(hx - fx * r * 1.4 - ux * r * 0.4, hy - fy * r * 1.4 - uy * r * 0.4);
        g.closePath();
        g.globalAlpha = 0.95;
        g.fill();
        g.globalAlpha = 1;
      } else if (a.hat === 'feather') {
        g.beginPath();
        g.ellipse(hx + ux * r * 0.55, hy + uy * r * 0.55, r * 1.25, r * 0.38, ang + Math.PI / 2, 0, TAU);
        g.fill();
        g.strokeStyle = '#fef3c7';
        g.lineWidth = Math.max(1.5, r * 0.2);
        g.beginPath();
        g.moveTo(hx - fx * r * 0.4 + ux * r * 0.7, hy - fy * r * 0.4 + uy * r * 0.7);
        g.quadraticCurveTo(hx - fx * r * 1.4 + ux * r * 1.6, hy - fy * r * 1.4 + uy * r * 1.6, hx - fx * r * 2 + ux * r * 1.2, hy - fy * r * 2 + uy * r * 1.2);
        g.stroke();
      } else if (a.hat === 'helm') {
        g.fillStyle = '#cbd5e1';
        g.beginPath();
        g.arc(hx, hy, r * 1.1, ang - Math.PI / 2, ang + Math.PI / 2);
        g.closePath();
        g.fill();
        g.fillStyle = a.color;
        g.fillRect(hx + ux * r * 0.9 - 2, hy + uy * r * 0.9 - 2, 4, 4);
      } else if (a.hat === 'crown') {
        var bx2 = hx + ux * r * 0.75, by2 = hy + uy * r * 0.75;
        g.beginPath();
        g.moveTo(bx2 - fx * r * 0.75, by2 - fy * r * 0.75);
        g.lineTo(bx2 - fx * r * 0.8 + ux * r * 0.85, by2 - fy * r * 0.8 + uy * r * 0.85);
        g.lineTo(bx2 - fx * r * 0.27 + ux * r * 0.4, by2 - fy * r * 0.27 + uy * r * 0.4);
        g.lineTo(bx2 + ux * r * 1, by2 + uy * r * 1);
        g.lineTo(bx2 + fx * r * 0.27 + ux * r * 0.4, by2 + fy * r * 0.27 + uy * r * 0.4);
        g.lineTo(bx2 + fx * r * 0.8 + ux * r * 0.85, by2 + fy * r * 0.8 + uy * r * 0.85);
        g.lineTo(bx2 + fx * r * 0.75, by2 + fy * r * 0.75);
        g.closePath();
        g.fill();
      }
    }
    function drawBow(a) {
      var P = a.pts;
      var bh = P[4], dh = P[6];
      // bow orientation: along the forearm when knocked out, else the aim
      var ux, uy;
      if (a.dead) {
        ux = bh.x - P[3].x;
        uy = bh.y - P[3].y;
        var l = Math.sqrt(ux * ux + uy * uy) || 1;
        ux /= l;
        uy /= l;
      } else {
        ux = a.dir * Math.cos(a.aim);
        uy = -Math.sin(a.aim);
      }
      var px = -uy, py = ux; // perpendicular
      var R = 0.62;
      var t1x = bh.x + px * R - ux * 0.12, t1y = bh.y + py * R - uy * 0.12;
      var t2x = bh.x - px * R - ux * 0.12, t2y = bh.y - py * R - uy * 0.12;
      g.strokeStyle = '#7c3f12';
      g.lineWidth = Math.max(2, S * 0.07);
      g.beginPath();
      g.moveTo(X(t1x), Y(t1y));
      g.quadraticCurveTo(X(bh.x + ux * 0.38), Y(bh.y + uy * 0.38), X(t2x), Y(t2y));
      g.stroke();
      // string (pulled to the draw hand while aiming)
      var pulled = !a.dead && a.draw > 0.05;
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = Math.max(1, S * 0.02);
      g.beginPath();
      g.moveTo(X(t1x), Y(t1y));
      if (pulled) g.lineTo(X(dh.x), Y(dh.y));
      g.lineTo(X(t2x), Y(t2y));
      g.stroke();
      // nocked arrow when ready
      if (!a.dead && a.reload <= 0 && (state === 'fight' || state === 'intro' || state === 'menu' || state === 'title')) {
        var tipx = (pulled ? dh.x : bh.x - ux * 0.1) + ux * ARROW_LEN;
        var tipy = (pulled ? dh.y : bh.y - uy * 0.1) + uy * ARROW_LEN;
        drawArrowShape(tipx, tipy, Math.atan2(uy, ux), a.sel, a.side, a.stam >= shotCost(a) ? 1 : 0.35);
      }
    }
    function drawStuck(a) {
      var P = a.pts;
      for (var i = 0; i < a.stuck.length; i++) {
        var st = a.stuck[i];
        var A = P[st.a], B = P[st.b];
        var bang = Math.atan2(B.y - A.y, B.x - A.x);
        var bl = Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y));
        var x = A.x + Math.cos(bang) * bl * st.t - Math.sin(bang) * st.off;
        var y = A.y + Math.sin(bang) * bl * st.t + Math.cos(bang) * st.off;
        var ang = bang + st.rel;
        // the tip sits slightly inside the body
        drawArrowShape(x + Math.cos(ang) * 0.12, y + Math.sin(ang) * 0.12, ang, st.type, st.owner, 1, 0.85);
      }
    }

    function drawAimHint(a) {
      if (a.dead || a.ai) return;
      var dragging = null;
      for (var id in drags) if (drags[id].a === a) dragging = drags[id];
      if (!dragging && !(aimKeysUsed[a.side] > 0)) return;
      if (dragging) {
        // pull line on screen
        g.strokeStyle = 'rgba(255,255,255,0.4)';
        g.lineWidth = 2;
        g.setLineDash([6, 6]);
        g.beginPath();
        g.moveTo(dragging.sx, dragging.sy);
        g.lineTo(dragging.x, dragging.y);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath();
        g.arc(dragging.sx, dragging.sy, 6, 0, TAU);
        g.fill();
        if (dragging.pow < 0.12) return;
      }
      // short trajectory preview (gravity only — wind is up to you)
      var n = nockPoint(a);
      var sp = speedFor(a.power) * (a.sel === 'thumper' ? 0.92 : 1);
      var vx = a.dir * Math.cos(a.aim) * sp, vy = -Math.sin(a.aim) * sp;
      var g2 = GRAV * (a.sel === 'thumper' ? 1.25 : 1);
      g.fillStyle = a.side ? '#f9a8d4' : '#bae6fd';
      for (var i = 1; i <= 9; i++) {
        var t = i * 0.045;
        var x = n.x + vx * t, y = n.y + vy * t + 0.5 * g2 * t * t;
        g.globalAlpha = 1 - i / 11;
        g.beginPath();
        g.arc(X(x), Y(y), Math.max(2, S * 0.06), 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
      // power readout
      g.font = '800 ' + Math.round(clamp(S * 0.3, 11, 16)) + 'px system-ui,sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#fff';
      g.fillText(Math.round(a.power * 100) + '%  ' + Math.round((a.aim * 180) / Math.PI) + '°', X(a.x), Y(groundY(a.x) - 3.05));
    }

    function drawBars(a, left) {
      var pad = 8;
      var w = Math.min(230, W * 0.34);
      var x = left ? pad : W - pad - w;
      var y = 8;
      var fs = Math.round(clamp(W * 0.028, 11, 15));
      g.font = '800 ' + fs + 'px system-ui,sans-serif';
      g.textAlign = left ? 'left' : 'right';
      g.fillStyle = 'rgba(5,6,14,0.55)';
      rr(x - 4, y - 4, w + 8, fs + 30, 10);
      g.fill();
      g.fillStyle = a.color;
      var label = a.name + (mode === '2p' ? '  ' + match.wins[a.side] + '★' : '');
      g.fillText(label, left ? x + 2 : x + w - 2, y + fs - 1);
      var hy = y + fs + 4;
      g.fillStyle = 'rgba(255,255,255,0.15)';
      rr(x, hy, w, 9, 4);
      g.fill();
      var f = clamp(a.hp / a.maxHp, 0, 1);
      g.fillStyle = f > 0.5 ? '#22c55e' : f > 0.25 ? '#f59e0b' : '#ef4444';
      rr(left ? x : x + w - w * f, hy, Math.max(0.01, w * f), 9, 4);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      rr(x, hy + 12, w, 5, 3);
      g.fill();
      var sf = clamp(a.stam / 100, 0, 1);
      g.fillStyle = a.stam >= shotCost(a) ? '#fde047' : '#a16207';
      rr(left ? x : x + w - w * sf, hy + 12, Math.max(0.01, w * sf), 5, 3);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '700 ' + Math.max(10, fs - 3) + 'px system-ui,sans-serif';
      g.textAlign = left ? 'right' : 'left';
      g.fillText(Math.ceil(Math.max(0, a.hp)) + '', left ? x + w - 2 : x + 2, y + fs - 1);
    }

    function drawWind() {
      var cx = W / 2, y = 64;
      var fs = 12;
      g.font = '800 ' + fs + 'px system-ui,sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(5,6,14,0.5)';
      rr(cx - 46, y - 13, 92, 34, 10);
      g.fill();
      g.fillStyle = '#fff';
      g.fillText(Math.abs(wind) < 0.05 ? 'NO WIND' : 'WIND ' + Math.abs(wind).toFixed(1), cx, y);
      if (Math.abs(wind) >= 0.05) {
        var len = clamp(Math.abs(wind) / 3.5, 0.15, 1) * 34 * Math.sign(wind);
        g.strokeStyle = '#7dd3fc';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(cx - len, y + 11);
        g.lineTo(cx + len, y + 11);
        g.stroke();
        g.fillStyle = '#7dd3fc';
        g.beginPath();
        g.moveTo(cx + len + Math.sign(wind) * 7, y + 11);
        g.lineTo(cx + len, y + 6);
        g.lineTo(cx + len, y + 16);
        g.closePath();
        g.fill();
      }
    }

    function rr(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    function render() {
      if (!W || !arena) return;
      g.save();
      if (shake > 0) g.translate(rand(-1, 1) * shake * 8, rand(-1, 1) * shake * 8);
      drawBackground();
      drawTerrain();
      var i;
      for (i = 0; i < groundArrows.length; i++) {
        var ga = groundArrows[i];
        var age = time - ga.t;
        drawArrowShape(ga.x, ga.y, ga.ang, ga.type, ga.owner, age > 9 ? Math.max(0, 1 - (age - 9)) : 1);
      }
      if (groundArrows.length && time - groundArrows[0].t > 10) groundArrows.shift();
      for (i = 0; i < archers.length; i++) drawArcher(archers[i]);
      for (i = 0; i < arrows.length; i++) {
        var ar = arrows[i];
        // faint trail
        if (ar.trail.length > 3) {
          g.strokeStyle = ar.type === 'cinder' ? 'rgba(251,146,60,0.35)' : 'rgba(255,255,255,0.3)';
          g.lineWidth = Math.max(1, S * 0.03);
          g.beginPath();
          g.moveTo(X(ar.trail[0]), Y(ar.trail[1]));
          for (var k = 2; k < ar.trail.length; k += 2) g.lineTo(X(ar.trail[k]), Y(ar.trail[k + 1]));
          g.stroke();
        }
        drawArrowShape(ar.x, ar.y, Math.atan2(ar.vy, ar.vx), ar.type, ar.owner, 1);
        // off-screen marker for arrows flying above the view
        if (Y(ar.y) < 0) {
          g.fillStyle = ar.owner ? '#f472b6' : '#38bdf8';
          g.beginPath();
          g.moveTo(X(ar.x), 4);
          g.lineTo(X(ar.x) - 6, 14);
          g.lineTo(X(ar.x) + 6, 14);
          g.closePath();
          g.fill();
        }
      }
      for (i = 0; i < particles.length; i++) {
        var p = particles[i];
        g.globalAlpha = clamp(p.life / p.max, 0, 1);
        g.fillStyle = p.color;
        var sz = Math.max(2, p.size * S);
        g.fillRect(X(p.x) - sz / 2, Y(p.y) - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
      for (i = 0; i < archers.length; i++) drawAimHint(archers[i]);
      // floating HP bars over the archers
      for (i = 0; i < archers.length; i++) {
        var a = archers[i];
        if (a.dead || state === 'title') continue;
        var bw = Math.max(36, S * 1.1);
        var bx = X(a.x) - bw / 2, by = Y(groundY(a.x) - 2.75);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        rr(bx, by, bw, 6, 3);
        g.fill();
        g.fillStyle = a.hp / a.maxHp > 0.5 ? '#22c55e' : a.hp / a.maxHp > 0.25 ? '#f59e0b' : '#ef4444';
        rr(bx, by, Math.max(0.01, (bw * Math.max(0, a.hp)) / a.maxHp), 6, 3);
        g.fill();
      }
      g.textAlign = 'center';
      g.font = '900 ' + Math.round(clamp(S * 0.42, 14, 26)) + 'px system-ui,sans-serif';
      for (i = 0; i < popups.length; i++) {
        var pp = popups[i];
        g.globalAlpha = clamp((pp.life / pp.max) * 2, 0, 1);
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.strokeText(pp.text, X(pp.x), Y(pp.y));
        g.fillStyle = pp.color;
        g.fillText(pp.text, X(pp.x), Y(pp.y));
      }
      g.globalAlpha = 1;
      g.restore();
      // screen-space HUD
      if (state !== 'title' && archers.length === 2) {
        drawBars(archers[0], true);
        drawBars(archers[1], false);
        drawWind();
      }
      if (banner) {
        var k2 = 1 - banner.life / banner.max;
        var sc = k2 < 0.15 ? 0.6 + (k2 / 0.15) * 0.4 : 1;
        var fsz = Math.round(clamp(Math.min(W, H) * 0.11, 26, 64) * sc);
        g.font = '900 ' + fsz + 'px system-ui,sans-serif';
        g.textAlign = 'center';
        g.globalAlpha = clamp(banner.life / 0.3, 0, 1);
        g.lineWidth = Math.max(4, fsz * 0.12);
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.strokeText(banner.text, W / 2, H * 0.38);
        g.fillStyle = banner.color;
        g.fillText(banner.text, W / 2, H * 0.38);
        g.globalAlpha = 1;
      }
      if (state === 'fight' && time - roundStats.start < 6 && !overlay) {
        var tip = mode === '2p' ? 'Drag on your half · or use your keys' : ctx.isTouch ? 'Drag back anywhere, release to shoot' : 'Drag back & release · or ↑↓ ←→ + Space';
        var fs2 = Math.round(clamp(Math.min(W, H) * 0.035, 12, 17));
        g.font = '700 ' + fs2 + 'px system-ui,sans-serif';
        var tw = g.measureText(tip).width;
        g.fillStyle = 'rgba(5,6,14,0.5)';
        rr(W / 2 - tw / 2 - 12, H - 62 - fs2, tw + 24, fs2 + 14, 10);
        g.fill();
        g.fillStyle = '#fff';
        g.fillText(tip, W / 2, H - 58);
      }
    }

    /* ---------------- boot ---------------- */
    var lastVis = '';
    var loop = IGAME.loop(function (dt) {
      if (state !== 'paused') update(dt);
      var vis = state === 'fight' || state === 'intro' || state === 'ko' || state === 'paused' ? 'visible' : 'hidden';
      if (vis !== lastVis) {
        lastVis = vis;
        pauseBtn.style.visibility = vis;
        updateChips();
      }
      render();
    });
    booted = true;
    showTitle();
    loop.start();

    if (ctx.debug) {
      window.__quiver = {
        state: function () {
          return {
            state: state,
            mode: mode,
            round: mode === '2p' ? match.round : saved.round,
            wind: +wind.toFixed(2),
            arrows: arrows.length,
            p: archers.map(function (a) { return { hp: Math.round(a.hp), stam: Math.round(a.stam), aim: +a.aim.toFixed(2), pow: +a.power.toFixed(2), dead: a.dead, sel: a.sel, hits: a.hits }; }),
            coins: saved.coins,
            overlay: !!overlay,
          };
        },
        coins: function (n) {
          saved.coins = n;
          save();
        },
        hurt: function (side, n) {
          archers[side].hp -= n;
          if (archers[side].hp <= 0) knockOut(archers[side], null);
        },
        // aim the player perfectly at the foe's chest (for automated tests)
        autoAim: function () {
          var a = archers[0];
          var t = archers[1];
          var tp = { x: (t.pts[1].x + t.pts[2].x) / 2, y: (t.pts[1].y + t.pts[2].y) / 2 };
          for (var ang = 0.2; ang < 1.2; ang += 0.1) {
            var p = solvePower(a, ang, tp.x, tp.y, 1, GRAV);
            if (p > 0) {
              a.aim = ang;
              a.power = p;
              return [ang, p];
            }
          }
          return null;
        },
      };
    }

    return {
      pause: function () {
        if (state === 'fight' || state === 'intro' || state === 'ko') pauseGame();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        closeOverlay();
        view.canvas.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        view.destroy();
        if (ctx.debug) delete window.__quiver;
      },
    };
  });
})();
