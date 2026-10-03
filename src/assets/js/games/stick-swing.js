/*!
 * Skyline Swing — igame9 original one-button rope-swinging stickman game
 * (same genre as rope-swing stickman games such as Stickman Hook).
 *
 * Hold (mouse / touch / Space / ↑ / W) to grab the nearest hook and swing,
 * release to let go and fly. Bounce pads launch you upward, saws and spike
 * blocks end the attempt, the checkered line finishes the level.
 *
 * World units: the stickman is ~1.2 units tall and y grows downward (screen).
 * Physics runs at a fixed 120 Hz step, so a level always plays the same way.
 * That lets the engine check every generated level with a built-in solver bot
 * before it is used (unsolvable seeds are re-rolled), and the bot's best time
 * sets the star times.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var STEP = 1 / 120;
  var G = 22; // gravity
  var PR = 0.3; // player collision radius
  var RANGE = 7.2; // max hook distance
  var ASSIST = 3.2; // forward push while the rope is taut (keeps swings lively)
  var MAX_V = 25;
  var FLOOR = 8.8; // tips of the spike floor
  var PAD_MIN = 15.5; // minimum launch speed off a bounce pad
  var LAUNCH_VX = 8;
  var LAUNCH_VY = -11;
  var LEVELS = 36;
  var PER_WORLD = 6;

  var THEMES = [
    { name: 'Sunrise Rooftops', sky: ['#2b1b5a', '#a24d8f', '#ffb27a'], far: 'rgba(122,62,132,0.55)', near: '#4a2763', kind: 'city', lights: 'rgba(255,214,140,0.8)', block: '#5c3d8f', blockHi: '#a78bfa', hook: '#ffe08a', abyss: '#1a0f2e', spike: '#f4d7ff' },
    { name: 'Mint Hills', sky: ['#4fb6e0', '#a8e9f0', '#e6fbe7'], far: 'rgba(72,160,122,0.45)', near: '#2f8a63', kind: 'hills', block: '#2e6b55', blockHi: '#6ee7b7', hook: '#fef08a', abyss: '#0f2a22', spike: '#d1fae5' },
    { name: 'Neon Night', sky: ['#060a24', '#16124a', '#3a1d6e'], far: 'rgba(44,54,128,0.6)', near: '#0d1238', kind: 'city', lights: 'rgba(34,211,238,0.85)', block: '#1e1b4b', blockHi: '#f472b6', hook: '#67e8f9', abyss: '#03040f', spike: '#f0abfc' },
    { name: 'Candy Clouds', sky: ['#7d6cf0', '#d8a6f5', '#ffd6ea'], far: 'rgba(255,255,255,0.32)', near: 'rgba(255,238,250,0.75)', kind: 'clouds', block: '#b14a8a', blockHi: '#ffb3dc', hook: '#fff1a8', abyss: '#4b1d5c', spike: '#ffe4f3' },
    { name: 'Desert Dusk', sky: ['#3b1c4a', '#c2445a', '#ffb05c'], far: 'rgba(152,62,72,0.55)', near: '#6b2a3a', kind: 'mesa', block: '#8a3b2e', blockHi: '#ffb27a', hook: '#ffe7a0', abyss: '#2a0e18', spike: '#ffd7b0' },
    { name: 'Frost Peaks', sky: ['#1e3a6e', '#5b8fd6', '#d6ecff'], far: 'rgba(205,228,255,0.5)', near: '#7aa6d8', kind: 'peaks', block: '#36557f', blockHi: '#bfe3ff', hook: '#ffffff', abyss: '#0c1a33', spike: '#e0f2fe' },
  ];

  var SKINS = [
    { id: 'ink', name: 'Ink', need: 0, body: '#111827', line: '#f8fafc', trail: ['#ffffff'] },
    { id: 'chalk', name: 'Chalk', need: 6, body: '#f8fafc', line: '#0f172a', trail: ['#e2e8f0'] },
    { id: 'ember', name: 'Ember', need: 15, body: '#f97316', line: '#3b0d02', trail: ['#facc15', '#f97316', '#ef4444'], acc: 'band', accColor: '#facc15' },
    { id: 'mint', name: 'Mint Ninja', need: 25, body: '#10b981', line: '#022c22', trail: ['#6ee7b7'], acc: 'band', accColor: '#ef4444' },
    { id: 'volt', name: 'Volt', need: 40, body: '#facc15', line: '#1e1b4b', trail: ['#67e8f9', '#3b82f6'], acc: 'cap', accColor: '#3b82f6' },
    { id: 'royal', name: 'Royal', need: 55, body: '#7c3aed', line: '#f5f3ff', trail: ['#c4b5fd', '#fde047'], acc: 'crown', accColor: '#fde047' },
    { id: 'frost', name: 'Frost', need: 70, body: '#38bdf8', line: '#0c4a6e', trail: ['#e0f2fe', '#7dd3fc'], acc: 'scarf', accColor: '#f43f5e' },
    { id: 'prism', name: 'Prism', need: 85, body: '#f8fafc', line: '#312e81', trail: ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'], acc: 'visor', accColor: '#22d3ee' },
    { id: 'gold', name: 'Golden Ace', need: 100, body: '#fbbf24', line: '#422006', trail: ['#fde68a', '#f59e0b'], acc: 'crown', accColor: '#fff7ae' },
  ];

  // Short tips shown when a level that introduces something new starts.
  var INTRO = {
    0: 'Tap to jump off, then HOLD to grab a hook',
    2: 'Fall onto bounce pads to spring upward',
    3: 'Moving hooks — time your grab',
    4: 'Avoid the spinning saws!',
    5: 'Walls and spike blocks — fly through the gaps',
  };
  // Beat strings for the hand-picked tutorial levels (see BEATS below).
  var TUTORIAL = ['hhhh', 'hhhhhh', 'hhphhph', 'hmhmhmh', 'hshvhSh', 'hghkhWhh'];

  /* ---------------- small helpers ---------------- */
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rr(r, a, b) {
    return a + r() * (b - a);
  }
  function angDiff(a, b) {
    var d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }
  function fixArr(a, n, def) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(a && typeof a[i] === 'number' ? a[i] : def);
    return out;
  }

  /* ---------------- level generation ---------------- */
  // Moving objects: x/y + amplitude (mx, my) * sin(2π t / per + ph), t = level clock.
  function objPos(o, t, out) {
    var s = o.per ? Math.sin((TAU * t) / o.per + o.ph) : 0;
    out.x = o.x + o.mx * s;
    out.y = o.y + o.my * s;
    return out;
  }
  function hookY(y) {
    return clamp(y, -0.8, 3);
  }
  function addHook(lv, x, y, mx, my, per, ph) {
    lv.hooks.push({ x: x, y: y, mx: mx || 0, my: my || 0, per: per || 0, ph: ph || 0 });
    return { x: x, y: y };
  }
  function nextPlain(lv, c, r, d, gapAdd) {
    var gx = c.x + rr(r, 5, 6.3) + d * 1.3 + (gapAdd || 0);
    var gy = hookY(c.y + rr(r, -1.3, 1.3));
    return addHook(lv, gx, gy);
  }

  // Each beat extends the course from the last hook c and returns the new last hook.
  var BEATS = {
    h: function (lv, c, r, d) {
      return nextPlain(lv, c, r, d);
    },
    // moving hook (vertical or horizontal)
    m: function (lv, c, r, d) {
      var gx = c.x + rr(r, 5.4, 6.4) + d * 1.2;
      var gy = hookY(c.y + rr(r, -1, 1));
      var vert = r() < 0.5;
      var amp = rr(r, 1, 1.7) + d * 0.6;
      addHook(lv, gx, gy, vert ? 0 : amp, vert ? amp : 0, rr(r, 2.6, 3.6) - d * 0.5, rr(r, 0, TAU));
      return { x: gx, y: gy };
    },
    // two hooks close together at different heights
    c: function (lv, c, r, d) {
      var a = addHook(lv, c.x + rr(r, 3.4, 4), hookY(c.y + rr(r, 0.6, 1.4)));
      return addHook(lv, a.x + rr(r, 3.6, 4.4) + d, hookY(a.y - rr(r, 1, 2)));
    },
    // bounce pad in a gap without hooks
    p: function (lv, c, r, d) {
      var px = c.x + rr(r, 5.4, 6.4) + d * 0.6;
      lv.pads.push({ x: px, y: 7.4, w: 3.6 - d * 0.5, ang: 0.16 });
      return addHook(lv, px + rr(r, 4.6, 5.6) + d * 0.6, rr(r, 0.4, 1.8));
    },
    // saw above the gap (punishes flying too high)
    s: function (lv, c, r, d) {
      var n = nextPlain(lv, c, r, d);
      lv.saws.push({ x: (c.x + n.x) / 2, y: Math.min(c.y, n.y) - rr(r, 2.3, 3) + d * 0.3, r: 0.55 + d * 0.25, mx: 0, my: 0, per: 0, ph: 0 });
      return n;
    },
    // saw low in the gap (punishes long low swings)
    S: function (lv, c, r, d) {
      var n = nextPlain(lv, c, r, d);
      lv.saws.push({ x: (c.x + n.x) / 2 + rr(r, -0.6, 0.6), y: Math.max(c.y, n.y) + rr(r, 4.4, 5.2) - d * 0.4, r: 0.65 + d * 0.2, mx: 0, my: 0, per: 0, ph: 0 });
      return n;
    },
    // saw moving up and down in the gap
    v: function (lv, c, r, d) {
      var n = nextPlain(lv, c, r, d, 0.4);
      lv.saws.push({ x: (c.x + n.x) / 2, y: (c.y + n.y) / 2 + 1, r: 0.5 + d * 0.2, mx: 0, my: 1.6 + d * 0.6, per: rr(r, 2.2, 3) - d * 0.4, ph: rr(r, 0, TAU) });
      return n;
    },
    // gate: wall from above + pillar from below with a window between
    g: function (lv, c, r, d) {
      var n = nextPlain(lv, c, r, d, 0.6);
      var mx = (c.x + n.x) / 2 - 0.35;
      var my = (c.y + n.y) / 2;
      var top = my - rr(r, 1.9, 2.4) + d * 0.4;
      var bot = my + rr(r, 3.6, 4.2) - d * 0.4;
      lv.blocks.push({ x: mx, y: top - 16, w: 0.7, h: 16, kind: 'wall' });
      lv.blocks.push({ x: mx, y: bot, w: 0.7, h: FLOOR + 2 - bot, kind: 'wall' });
      return n;
    },
    // floating spike block low in the gap
    k: function (lv, c, r, d) {
      var n = nextPlain(lv, c, r, d);
      var s = 0.9 + d * 0.4;
      lv.blocks.push({ x: (c.x + n.x) / 2 - s / 2, y: Math.max(c.y, n.y) + rr(r, 3.2, 4) - d * 0.3, w: s, h: s, kind: 'spike' });
      return n;
    },
    // pillar rising from the floor
    W: function (lv, c, r, d) {
      var n = nextPlain(lv, c, r, d);
      var top = Math.max(c.y, n.y) + rr(r, 3.6, 4.4) - d * 0.5;
      lv.blocks.push({ x: (c.x + n.x) / 2 - 0.5, y: top, w: 1, h: FLOOR + 2 - top, kind: 'wall' });
      return n;
    },
  };

  function randomBeats(n, r, d) {
    var count = 7 + Math.floor((n - 6) / 2.5);
    var pool = [['h', 4], ['m', 1 + 2 * d], ['c', 1], ['p', 1 + d], ['s', 1 + 2 * d], ['v', 2.2 * d], ['S', 1], ['g', 0.4 + 2 * d], ['k', 0.3 + 1.6 * d], ['W', 0.6 + d]];
    var total = 0;
    pool.forEach(function (p) { total += p[1]; });
    var out = '';
    var lastHaz = false;
    for (var i = 0; i < count; i++) {
      var pick = r() * total, ch = 'h';
      for (var k = 0; k < pool.length; k++) {
        pick -= pool[k][1];
        if (pick <= 0) {
          ch = pool[k][0];
          break;
        }
      }
      var haz = 'svSgkW'.indexOf(ch) > -1;
      if (haz && lastHaz && d < 0.55) ch = 'h';
      lastHaz = 'svSgkW'.indexOf(ch) > -1;
      out += ch;
    }
    return out + 'h';
  }

  function makeLevel(n, r, easy) {
    var d = n < TUTORIAL.length ? 0.05 * n : Math.min(1, (n - TUTORIAL.length) / 26);
    var lv = { n: n, theme: Math.floor(n / PER_WORLD) % THEMES.length, hooks: [], pads: [], saws: [], blocks: [], d: d };
    lv.blocks.push({ x: -3.2, y: 5, w: 4.4, h: FLOOR + 2 - 5, kind: 'start' });
    var beats = n < TUTORIAL.length ? TUTORIAL[n] : randomBeats(n, r, d);
    if (easy) beats = beats.replace(/[svSgkW]/g, 'h');
    var c = addHook(lv, 5.2, rr(r, 0.8, 1.6));
    for (var i = 0; i < beats.length; i++) c = BEATS[beats[i]](lv, c, r, d);
    lv.finishX = c.x + 3.6;
    lv.beats = beats;
    return lv;
  }

  /* ---------------- physics (shared by the game and the solver bot) ---------------- */
  var tA = { x: 0, y: 0 }, tB = { x: 0, y: 0 };
  var nearX = 0, nearY = 0;

  function newPlayer() {
    return { x: 0, y: 5 - PR, vx: 0, vy: 0, hook: -1, rope: 0, evHook: false, evRelease: false, evBounce: -1, evBump: 0 };
  }
  function launch(P) {
    P.vx = LAUNCH_VX;
    P.vy = LAUNCH_VY;
  }
  // Index of the nearest hook within RANGE (or -1); its position goes to nearX/nearY.
  function nearestHook(P, lv, t) {
    var bi = -1, bd = RANGE;
    for (var i = 0; i < lv.hooks.length; i++) {
      var h = lv.hooks[i];
      if (Math.abs(h.x - P.x) > RANGE + 3) continue;
      objPos(h, t, tB);
      var dx = tB.x - P.x, dy = tB.y - P.y;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < bd) {
        bd = dd;
        bi = i;
        nearX = tB.x;
        nearY = tB.y;
      }
    }
    return bi;
  }

  // One fixed physics step. Returns 'dead', 'win', 'land' (back on the start roof) or null.
  function step(P, lv, t, hold) {
    var i, dx, dy, d;
    if (!hold && P.hook >= 0) {
      P.hook = -1;
      P.evRelease = true;
    }
    if (hold && P.hook < 0) {
      i = nearestHook(P, lv, t);
      if (i >= 0) {
        P.hook = i;
        dx = P.x - nearX;
        dy = P.y - nearY;
        d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        P.rope = Math.max(1, d);
        // The rope is rigid: keep (most of) the speed but redirect it along the swing,
        // so grabbing a hook never kills your momentum.
        var gtx = -dy / d, gty = dx / d;
        var sp0 = Math.sqrt(P.vx * P.vx + P.vy * P.vy);
        var vt = P.vx * gtx + P.vy * gty;
        var sg = Math.abs(vt) > sp0 * 0.25 ? (vt > 0 ? 1 : -1) : gtx >= 0 ? 1 : -1;
        P.vx = gtx * sg * sp0 * 0.94;
        P.vy = gty * sg * sp0 * 0.94;
        P.evHook = true;
      }
    }
    P.vy += G * STEP;
    var hx = 0, hy = 0, hvx = 0, hvy = 0;
    if (P.hook >= 0) {
      var ho = lv.hooks[P.hook];
      objPos(ho, t + STEP, tA);
      hx = tA.x;
      hy = tA.y;
      if (ho.per) {
        objPos(ho, t, tB);
        hvx = (hx - tB.x) / STEP;
        hvy = (hy - tB.y) / STEP;
      }
      dx = P.x - hx;
      dy = P.y - hy;
      d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
      // gentle push along the forward-pointing tangent of the swing circle
      var tx = -dy / d, ty = dx / d;
      if (tx < 0) {
        tx = -tx;
        ty = -ty;
      }
      P.vx += tx * ASSIST * STEP;
      P.vy += ty * ASSIST * STEP;
    }
    P.vx *= 1 - 0.04 * STEP;
    P.vy *= 1 - 0.04 * STEP;
    var sp = Math.sqrt(P.vx * P.vx + P.vy * P.vy);
    if (sp > MAX_V) {
      P.vx *= MAX_V / sp;
      P.vy *= MAX_V / sp;
    }
    P.x += P.vx * STEP;
    P.y += P.vy * STEP;
    // rigid rope: keep the player on the circle and drop the radial velocity
    if (P.hook >= 0) {
      dx = P.x - hx;
      dy = P.y - hy;
      d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
      var nx = dx / d, ny = dy / d;
      P.x = hx + nx * P.rope;
      P.y = hy + ny * P.rope;
      var rv = (P.vx - hvx) * nx + (P.vy - hvy) * ny;
      P.vx -= rv * nx;
      P.vy -= rv * ny;
    }
    // solid blocks
    for (i = 0; i < lv.blocks.length; i++) {
      var b = lv.blocks[i];
      if (P.x < b.x - 1 || P.x > b.x + b.w + 1 || P.y < b.y - 1 || P.y > b.y + b.h + 1) continue;
      var cx = clamp(P.x, b.x, b.x + b.w), cy = clamp(P.y, b.y, b.y + b.h);
      dx = P.x - cx;
      dy = P.y - cy;
      var d2 = dx * dx + dy * dy;
      if (d2 >= PR * PR) continue;
      if (b.kind === 'spike') {
        if (d2 < PR * PR * 0.6) return 'dead';
        continue;
      }
      var mx, my, push;
      if (d2 > 1e-9) {
        d = Math.sqrt(d2);
        mx = dx / d;
        my = dy / d;
        push = PR - d;
      } else {
        // centre inside the block: leave through the nearest face
        var l = P.x - b.x, rgt = b.x + b.w - P.x, tp = P.y - b.y, bt = b.y + b.h - P.y;
        var m = Math.min(l, rgt, tp, bt);
        mx = m === l ? -1 : m === rgt ? 1 : 0;
        my = m === tp ? -1 : m === bt && !mx ? 1 : 0;
        push = m + PR;
      }
      P.x += mx * push;
      P.y += my * push;
      var vn = P.vx * mx + P.vy * my;
      if (vn < 0) {
        P.vx -= 1.4 * vn * mx;
        P.vy -= 1.4 * vn * my;
        P.vx *= 0.9;
        P.evBump = Math.max(P.evBump, -vn);
        if (b.kind === 'start' && my < -0.7 && P.hook < 0 && Math.abs(P.vy) < 3) return 'land';
      }
    }
    // bounce pads (one-sided segments)
    for (i = 0; i < lv.pads.length; i++) {
      var pd = lv.pads[i];
      if (Math.abs(P.x - pd.x) > pd.w / 2 + 1) continue;
      var ca = Math.cos(pd.ang), sa = Math.sin(pd.ang);
      var pnx = sa, pny = -ca; // normal (points up, tilted forward)
      var rx = P.x - pd.x, ry = P.y - pd.y;
      var along = rx * ca + ry * sa;
      var dist = rx * pnx + ry * pny;
      if (Math.abs(along) <= pd.w / 2 + PR * 0.5 && dist < PR && dist > -0.6) {
        var pv = P.vx * pnx + P.vy * pny;
        if (pv < 0) {
          P.vx -= 2 * pv * pnx;
          P.vy -= 2 * pv * pny;
          pv = P.vx * pnx + P.vy * pny;
          if (pv < PAD_MIN) {
            P.vx += (PAD_MIN - pv) * pnx;
            P.vy += (PAD_MIN - pv) * pny;
          }
          P.x += (PR - dist) * pnx;
          P.y += (PR - dist) * pny;
          P.evBounce = i;
        }
      }
    }
    // saws
    for (i = 0; i < lv.saws.length; i++) {
      var s = lv.saws[i];
      if (Math.abs(s.x - P.x) > 4) continue;
      objPos(s, t, tA);
      dx = P.x - tA.x;
      dy = P.y - tA.y;
      var rr2 = s.r + PR * 0.7;
      if (dx * dx + dy * dy < rr2 * rr2) return 'dead';
    }
    if (P.y + PR * 0.5 > FLOOR) return 'dead';
    if (P.x > lv.finishX) return 'win';
    return null;
  }

  // Solver bot: grab the nearest hook once it is ahead of you, let go when the
  // swing points up-forward at the release angle. prm tunes the style.
  function botHold(P, lv, t, prm) {
    if (P.hook >= 0) {
      objPos(lv.hooks[P.hook], t, tB);
      if (P.x > tB.x + 0.2 && P.vx > 0.5 && P.vy < 0) {
        if (Math.atan2(-P.vy, P.vx) >= prm.rel) return false;
      }
      return true;
    }
    var i = nearestHook(P, lv, t);
    if (i < 0 || nearX < P.x + prm.ahead) return false;
    return P.vy >= prm.vy;
  }
  var BOT_STYLES = [
    { rel: 0.7, ahead: 0.8, vy: -2 },
    { rel: 0.55, ahead: 0.8, vy: -2 },
    { rel: 0.85, ahead: 0.8, vy: -2 },
    { rel: 0.7, ahead: 2, vy: 1.5 },
    { rel: 0.45, ahead: 1.5, vy: 0 },
    { rel: 1, ahead: 1.5, vy: 0 },
  ];
  function simulate(lv, prm, maxT) {
    var P = newPlayer();
    launch(P);
    var t = 0;
    var n = Math.floor((maxT || 45) / STEP);
    for (var k = 0; k < n; k++) {
      var ev = step(P, lv, t, botHold(P, lv, t, prm));
      t += STEP;
      if (ev === 'win') return t;
      if (ev === 'dead' || ev === 'land') return 0;
    }
    return 0;
  }
  // Best solver time over all bot styles (0 = no style finished).
  function solve(lv) {
    var best = 0;
    for (var i = 0; i < BOT_STYLES.length; i++) {
      var tm = simulate(lv, BOT_STYLES[i]);
      if (tm && (!best || tm < best)) best = tm;
    }
    return best;
  }
  function buildLevel(n) {
    var fallback = null;
    for (var attempt = 0; attempt < 16; attempt++) {
      var r = mulberry32((n + 1) * 7919 + attempt * 104729);
      var lv = makeLevel(n, r, attempt >= 12);
      var par = solve(lv);
      if (par) {
        lv.par = par;
        lv.seedTry = attempt;
        return lv;
      }
      if (!fallback) fallback = lv;
    }
    fallback.par = (fallback.finishX / 9) | 0;
    fallback.unverified = true;
    return fallback;
  }
  function starTimes(lv) {
    return [lv.par * 1.15 + 0.6, lv.par * 1.6 + 1.5];
  }

  /* ---------------- stickman pose ---------------- */
  // Joints (x,y pairs): 0 head, 1 neck, 2 hip, 3 l-elbow, 4 l-hand, 5 r-elbow, 6 r-hand,
  // 7 l-knee, 8 l-foot, 9 r-knee, 10 r-foot.
  // Pose = limb angles [la1, la2, ra1, ra2, ll1, ll2, rl1, rl2]; 0 = straight down, π = up.
  var POSES = {
    stand: [0.3, -0.25, -0.25, 0.2, 0.16, 0, -0.16, 0],
    hang: [Math.PI - 0.8, 1.4, Math.PI + 0.8, -1.4, 0.3, -0.35, -0.05, -0.2],
    tuck: [1.25, 1.1, 1.0, 1.25, 2.0, -2.35, 1.75, -2.2],
    spread: [2.25, 0.25, -2.25, -0.25, 0.5, -0.15, -0.45, 0.1],
    cheer: [2.2, 0.35, -2.2, -0.35, 0.22, 0, -0.22, 0],
    crouch: [0.9, -0.6, 0.6, -0.4, 1.2, -1.6, 0.9, -1.4],
  };
  var BONES = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10], [0, 2]];

  function computeJoints(J, cx, cy, rot, A) {
    var c = Math.cos(rot), s = Math.sin(rot);
    function put(i, lx, ly) {
      J[i * 2] = cx + lx * c - ly * s;
      J[i * 2 + 1] = cy + lx * s + ly * c;
    }
    put(0, 0, -0.43);
    put(1, 0, -0.22);
    put(2, 0, 0.17);
    var ex, ey;
    // arms from the neck
    ex = Math.sin(A[0]) * 0.26;
    ey = -0.22 + Math.cos(A[0]) * 0.26;
    put(3, ex, ey);
    put(4, ex + Math.sin(A[0] + A[1]) * 0.26, ey + Math.cos(A[0] + A[1]) * 0.26);
    ex = Math.sin(A[2]) * 0.26;
    ey = -0.22 + Math.cos(A[2]) * 0.26;
    put(5, ex, ey);
    put(6, ex + Math.sin(A[2] + A[3]) * 0.26, ey + Math.cos(A[2] + A[3]) * 0.26);
    // legs from the hip
    ex = Math.sin(A[4]) * 0.3;
    ey = 0.17 + Math.cos(A[4]) * 0.3;
    put(7, ex, ey);
    put(8, ex + Math.sin(A[4] + A[5]) * 0.3, ey + Math.cos(A[4] + A[5]) * 0.3);
    ex = Math.sin(A[6]) * 0.3;
    ey = 0.17 + Math.cos(A[6]) * 0.3;
    put(9, ex, ey);
    put(10, ex + Math.sin(A[6] + A[7]) * 0.3, ey + Math.cos(A[6] + A[7]) * 0.3);
  }

  // Draws a stick figure from joints J. tx/ty map world → px, u = px per world unit.
  function drawFigure(c, J, skin, tx, ty, u, time, dir) {
    var w = Math.max(2.2, 0.11 * u);
    var ow = w + Math.max(2, 0.06 * u);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? skin.body : skin.line;
      c.lineWidth = pass ? w : ow;
      c.beginPath();
      seg(1, 2);
      seg(1, 3);
      seg(3, 4);
      seg(1, 5);
      seg(5, 6);
      seg(2, 7);
      seg(7, 8);
      seg(2, 9);
      seg(9, 10);
      c.stroke();
      c.fillStyle = pass ? skin.body : skin.line;
      c.beginPath();
      c.arc(tx(J[0]), ty(J[1]), 0.17 * u + (pass ? 0 : (ow - w) / 2), 0, TAU);
      c.fill();
    }
    function seg(a, b) {
      c.moveTo(tx(J[a * 2]), ty(J[a * 2 + 1]));
      c.lineTo(tx(J[b * 2]), ty(J[b * 2 + 1]));
    }
    // head orientation
    var hx = tx(J[0]), hy = ty(J[1]);
    var ux = J[0] - J[2], uy = J[1] - J[3];
    var ul = Math.sqrt(ux * ux + uy * uy) || 1;
    ux /= ul;
    uy /= ul;
    var fx = -uy * (dir || 1), fy = ux * (dir || 1); // facing direction
    var r = 0.17 * u;
    // eye
    c.fillStyle = skin.line;
    c.beginPath();
    c.arc(hx + (fx * 0.42 + ux * 0.18) * r, hy + (fy * 0.42 + uy * 0.18) * r, Math.max(1.2, r * 0.17), 0, TAU);
    c.fill();
    var acc = skin.acc;
    if (!acc) return;
    c.strokeStyle = skin.accColor;
    c.fillStyle = skin.accColor;
    c.lineWidth = Math.max(1.5, r * 0.32);
    var wave = Math.sin(time * 14) * 0.25;
    if (acc === 'band') {
      c.beginPath();
      c.moveTo(hx - fx * r * 0.95 + ux * r * 0.4, hy - fy * r * 0.95 + uy * r * 0.4);
      c.lineTo(hx + fx * r * 0.95 + ux * r * 0.4, hy + fy * r * 0.95 + uy * r * 0.4);
      var bx = hx - fx * r * 0.95 + ux * r * 0.4, by = hy - fy * r * 0.95 + uy * r * 0.4;
      c.moveTo(bx, by);
      c.lineTo(bx - fx * r * 1.3 - ux * r * (0.2 + wave), by - fy * r * 1.3 - uy * r * (0.2 + wave));
      c.moveTo(bx, by);
      c.lineTo(bx - fx * r * 1.1 - ux * r * (0.6 - wave), by - fy * r * 1.1 - uy * r * (0.6 - wave));
      c.stroke();
    } else if (acc === 'cap') {
      c.beginPath();
      c.arc(hx + ux * r * 0.15, hy + uy * r * 0.15, r * 1.02, Math.atan2(uy, ux) - Math.PI / 2, Math.atan2(uy, ux) + Math.PI / 2);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(hx + ux * r * 0.2, hy + uy * r * 0.2);
      c.lineTo(hx + ux * r * 0.2 + fx * r * 1.6, hy + uy * r * 0.2 + fy * r * 1.6);
      c.stroke();
    } else if (acc === 'crown') {
      var bx2 = hx + ux * r * 0.8, by2 = hy + uy * r * 0.8;
      c.beginPath();
      c.moveTo(bx2 - fx * r * 0.7, by2 - fy * r * 0.7);
      c.lineTo(bx2 - fx * r * 0.75 + ux * r * 0.8, by2 - fy * r * 0.75 + uy * r * 0.8);
      c.lineTo(bx2 - fx * r * 0.25 + ux * r * 0.35, by2 - fy * r * 0.25 + uy * r * 0.35);
      c.lineTo(bx2 + ux * r * 0.95, by2 + uy * r * 0.95);
      c.lineTo(bx2 + fx * r * 0.25 + ux * r * 0.35, by2 + fy * r * 0.25 + uy * r * 0.35);
      c.lineTo(bx2 + fx * r * 0.75 + ux * r * 0.8, by2 + fy * r * 0.75 + uy * r * 0.8);
      c.lineTo(bx2 + fx * r * 0.7, by2 + fy * r * 0.7);
      c.closePath();
      c.fill();
    } else if (acc === 'scarf') {
      var nx = tx(J[2]), ny = ty(J[3]);
      c.beginPath();
      c.moveTo(nx - fx * r * 0.5, ny - fy * r * 0.5);
      c.lineTo(nx + fx * r * 0.5, ny + fy * r * 0.5);
      c.moveTo(nx - fx * r * 0.4, ny - fy * r * 0.4);
      c.quadraticCurveTo(nx - fx * r * 1.6, ny - fy * r * 1.6 + r * wave, nx - fx * r * 2.6 - ux * r * 0.6, ny - fy * r * 2.6 - uy * r * 0.6 + r * wave * 2);
      c.stroke();
    } else if (acc === 'visor') {
      c.lineWidth = Math.max(2, r * 0.45);
      c.beginPath();
      c.moveTo(hx + fx * r * 0.05 + ux * r * 0.2, hy + fy * r * 0.05 + uy * r * 0.2);
      c.lineTo(hx + fx * r * 1.05 + ux * r * 0.2, hy + fy * r * 1.05 + uy * r * 0.2);
      c.stroke();
    }
  }

  /* ================================================================== */
  IGAME.register('stick-swing', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;
    var autopilot = ctx.params.has('autopilot');

    var saved = {
      stars: fixArr(store.get('stars', []), LEVELS, 0),
      best: fixArr(store.get('best', []), LEVELS, 0),
      skin: store.get('skin', 'ink'),
      last: clamp(store.get('last', 0) | 0, 0, LEVELS - 1),
    };
    function save() {
      store.set('stars', saved.stars);
      store.set('best', saved.best);
      store.set('skin', saved.skin);
      store.set('last', saved.last);
    }
    function totalStars() {
      var s = 0;
      for (var i = 0; i < LEVELS; i++) s += saved.stars[i];
      return s;
    }
    function unlockedUpTo() {
      // a level is open when every earlier level has been finished once
      for (var i = 0; i < LEVELS; i++) if (!saved.stars[i]) return i;
      return LEVELS - 1;
    }
    function skinById(id) {
      for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
      return SKINS[0];
    }

    /* ---------------- canvas ---------------- */
    var W = 0, H = 0, S0 = 40, S = 40;
    var booted = false;
    var view = IGAME.createCanvas(root, {
      onResize: function (w, h) {
        W = w;
        H = h;
        S0 = Math.max(16, Math.min(w / 11.5, h / 12));
        if (booted && !loop.isRunning()) render();
      },
    });
    var g = view.ctx;

    /* ---------------- HUD ---------------- */
    var hud = ui.el('div', 'ig-hud');
    var pauseBtn = ui.el('button', 'ig-pill', '❚❚');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'cursor:pointer;min-width:40px';
    var mid = ui.el('div', '');
    mid.style.cssText = 'text-align:center;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;flex:1;min-width:0';
    var timeEl = ui.el('div', '', '0.00');
    timeEl.style.cssText = 'font:900 26px system-ui,sans-serif;line-height:1;font-variant-numeric:tabular-nums';
    var subEl = ui.el('div', '', '');
    subEl.style.cssText = 'font:700 11px system-ui,sans-serif;opacity:.85;margin-top:3px;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    var barWrap = ui.el('div', '');
    barWrap.style.cssText = 'width:min(160px,40vw);height:5px;margin:5px auto 0;border-radius:3px;background:rgba(0,0,0,.35);overflow:hidden';
    var barFill = ui.el('div', '');
    barFill.style.cssText = 'height:100%;width:0;background:linear-gradient(90deg,#8b6cff,#2dd4f0);border-radius:3px';
    barWrap.appendChild(barFill);
    mid.appendChild(timeEl);
    mid.appendChild(barWrap);
    mid.appendChild(subEl);
    var rightPill = ui.el('div', 'ig-pill', '');
    hud.appendChild(pauseBtn);
    hud.appendChild(mid);
    hud.appendChild(rightPill);
    root.appendChild(hud);

    /* ---------------- state ---------------- */
    var state = 'title'; // title | ready | play | dead | win | paused | menu
    var prevState = 'ready';
    var lv = null;
    var levelIdx = 0;
    var levels = [];
    var P = newPlayer();
    var clock = 0; // level clock (starts at launch)
    var acc = 0;
    var time = 0; // real time for animation
    var timeScale = 1;
    var attempts = 1;
    var overlay = null;
    var deadT = 0, winT = 0;
    var cam = { x: 0, y: 0, z: 1 };
    var shake = 0;
    var particles = [];
    var rings = [];
    var popups = [];
    var trail = [];
    var J = new Float32Array(22);
    var pose = POSES.stand.slice();
    var rot = 0, spin = 0, flipAcc = 0, flips = 0, totalFlips = 0;
    var rag = null; // ragdoll after a crash
    var padHit = {}; // pad index → time of last bounce (visual squash)
    var scenery = null;
    var holdPointers = {};
    var pointerHold = false;
    var needRelease = false;
    var lastHint = -1;
    var introTimer = 0;

    function getLevel(n) {
      if (!levels[n]) levels[n] = buildLevel(n);
      return levels[n];
    }

    function loadLevel(n, fresh) {
      levelIdx = clamp(n, 0, LEVELS - 1);
      lv = getLevel(levelIdx);
      if (fresh) attempts = 1;
      saved.last = levelIdx;
      save();
      buildScenery(lv.theme);
      resetAttempt();
      if (fresh && INTRO[levelIdx] && lastHint !== levelIdx) {
        lastHint = levelIdx;
        clearTimeout(introTimer);
        introTimer = setTimeout(function () {
          if (lv && levelIdx === n && state === 'ready') ui.toast(root, INTRO[n], 2600);
        }, 350);
      }
    }

    function resetAttempt() {
      P = newPlayer();
      clock = 0;
      acc = 0;
      rot = 0;
      spin = 0;
      flipAcc = 0;
      flips = 0;
      totalFlips = 0;
      rag = null;
      trail.length = 0;
      padHit = {};
      pose = POSES.stand.slice();
      timeScale = 1;
      state = 'ready';
      needRelease = true;
      cam.x = P.x + viewW() * 0.28;
      cam.y = camTargetY();
      cam.z = 1;
      updateHud(true);
    }

    function viewW() {
      return W / (S0 * cam.z || 1);
    }
    function viewH() {
      return H / (S0 * cam.z || 1);
    }
    function camTargetY() {
      return Math.min(FLOOR + 0.9 - viewH() / 2, P.y + viewH() * 0.22);
    }

    /* ---------------- input ---------------- */
    function rawHold() {
      var k = ctx.keys;
      return pointerHold || !!(k.Space || k.ArrowUp || k.KeyW);
    }
    function holding() {
      var raw = rawHold();
      if (needRelease) {
        if (!raw) needRelease = false;
        return false;
      }
      return raw;
    }
    function press() {
      if (overlay) return;
      if (state === 'ready') {
        launch(P);
        state = 'play';
        needRelease = true;
        spin = 6;
        sfx('jump');
        burst(P.x, P.y + 0.3, 10, '#ffffff', 3);
      } else if (state === 'dead' && deadT > 0.25) {
        retry();
      }
    }
    function retry() {
      attempts++;
      resetAttempt();
    }

    function onPointerDown(e) {
      if (e.button != null && e.button > 0) return;
      holdPointers[e.pointerId] = true;
      pointerHold = true;
      press();
      try {
        view.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.cancelable) e.preventDefault();
    }
    function onPointerUp(e) {
      delete holdPointers[e.pointerId];
      pointerHold = Object.keys(holdPointers).length > 0;
    }
    view.canvas.style.touchAction = 'none';
    view.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    pauseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (state === 'paused') resumeFromPause();
      else pauseGame();
    });

    ctx.captureKeys(['Enter', 'KeyP', 'KeyR', 'KeyW']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          var a = document.activeElement;
          var btn = a && overlay.el.contains(a) && a.tagName === 'BUTTON' && !a.disabled ? a : overlay.panel.querySelector('.ig-actions .ig-btn');
          if (btn) btn.click();
        } else if ((code === 'Escape' || code === 'KeyP') && state === 'paused') resumeFromPause();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') {
        pauseGame();
        return;
      }
      if (code === 'KeyR') {
        if (state === 'play' || state === 'dead') retry();
        return;
      }
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || code === 'Enter') press();
    });

    /* ---------------- effects ---------------- */
    function burst(x, y, n, color, speed) {
      for (var i = 0; i < n && particles.length < 160; i++) {
        var a = Math.random() * TAU, v = rand(0.3, 1) * speed;
        particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.6), max: 0.6, size: rand(0.05, 0.1), color: color, kind: 'spark' });
      }
    }
    function confetti(x, y, n) {
      var cols = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#fde047'];
      for (var i = 0; i < n && particles.length < 160; i++) {
        particles.push({ x: x + rand(-1, 1), y: y + rand(-1, 1), vx: rand(-5, 5), vy: rand(-10, -3), life: rand(1, 1.8), max: 1.8, size: rand(0.1, 0.18), color: cols[i % cols.length], kind: 'conf', rot: rand(0, TAU), vr: rand(-10, 10) });
      }
    }
    function popup(x, y, text, color) {
      popups.push({ x: x, y: y, text: text, color: color, life: 1 });
    }
    function updateEffects(dt) {
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'conf') {
          p.vy += 9 * dt;
          p.vx *= 1 - 1.5 * dt;
          p.rot += p.vr * dt;
        } else {
          p.vy += 12 * dt;
        }
      }
      for (i = rings.length - 1; i >= 0; i--) {
        rings[i].life -= dt;
        if (rings[i].life <= 0) rings.splice(i, 1);
      }
      for (i = popups.length - 1; i >= 0; i--) {
        popups[i].life -= dt;
        popups[i].y -= dt * 0.9;
        if (popups[i].life <= 0) popups.splice(i, 1);
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
    }

    /* ---------------- update ---------------- */
    function update(dt) {
      time += dt;
      updateEffects(dt);
      if (state === 'ready') {
        // idle bob on the start roof
        var A = POSES.stand;
        for (var i = 0; i < 8; i++) pose[i] = lerp(pose[i], A[i], Math.min(1, dt * 10));
        pose[0] = 0.3 + Math.sin(time * 2.4) * 0.08;
        pose[2] = -0.25 - Math.sin(time * 2.4) * 0.08;
        rot = 0;
        followCam(dt, true);
        return;
      }
      if (state === 'play' || state === 'win') {
        var sdt = dt * timeScale;
        acc += sdt;
        var steps = 0;
        while (acc >= STEP && steps < 10) {
          acc -= STEP;
          steps++;
          var hold = state === 'play' ? (autopilot ? botHold(P, lv, clock, BOT_STYLES[0]) : holding()) : false;
          var ev = step(P, lv, clock, hold);
          if (state === 'play') clock += STEP; // frozen at the finish time once you win
          if (state !== 'play') {
            if (ev === 'dead') ev = null;
            continue;
          }
          handleEvents();
          if (ev === 'dead') {
            crash();
            break;
          } else if (ev === 'win') {
            win();
          } else if (ev === 'land') {
            state = 'ready';
            P.vx = P.vy = 0;
            P.hook = -1;
            needRelease = true;
            return;
          }
        }
        if (state === 'win') {
          winT += dt;
          timeScale = lerp(timeScale, 0.25, Math.min(1, dt * 6));
          if (winT > 0.05 && winT < 0.8 && Math.random() < 0.5) confetti(lv.finishX + 1, P.y - 2, 3);
          if (winT > 1.1 && !overlay) showWin();
        }
        animatePlayer(sdt);
        followCam(dt);
        updateHud();
        return;
      }
      if (state === 'dead') {
        deadT += dt;
        updateRagdoll(dt);
        if (deadT > 1.05) retry();
        updateHud();
      }
    }

    function handleEvents() {
      if (P.evHook) {
        P.evHook = false;
        objPos(lv.hooks[P.hook], clock, tA);
        rings.push({ x: tA.x, y: tA.y, life: 0.35, max: 0.35 });
        sfx({ f: 520, f2: 880, d: 0.08, type: 'triangle', v: 0.1 });
        if (flips >= 1) flipBonus();
      }
      if (P.evRelease) {
        P.evRelease = false;
        var sp = Math.sqrt(P.vx * P.vx + P.vy * P.vy);
        spin = clamp(sp * 1.2, 8, 18) * (P.vx >= 0 ? 1 : -1);
        flipAcc = 0;
        flips = 0;
        sfx({ f: 300, f2: 620, d: 0.1, type: 'sine', v: 0.08 });
      }
      if (P.evBounce >= 0) {
        padHit[P.evBounce] = time;
        P.evBounce = -1;
        sfx('jump');
        sfx({ f: 180, f2: 420, d: 0.18, type: 'square', v: 0.06 });
        burst(P.x, P.y + 0.3, 12, '#ffffff', 4);
        shake = Math.max(shake, 0.25);
        spin = clamp(Math.abs(P.vx) * 0.8 + 5, 5, 12) * (P.vx >= 0 ? 1 : -1);
        if (flips >= 1) flipBonus();
        flipAcc = 0;
        flips = 0;
      }
      if (P.evBump > 0) {
        if (P.evBump > 2) {
          sfx({ f: 140, f2: 80, d: 0.08, type: 'square', v: 0.08 });
          shake = Math.max(shake, Math.min(0.4, P.evBump * 0.04));
        }
        P.evBump = 0;
      }
    }
    function flipBonus() {
      totalFlips += flips;
      popup(P.x, P.y - 0.9, flips > 1 ? 'FLIP ×' + flips : 'FLIP!', '#fde047');
      sfx({ f: 880, f2: 1320, d: 0.09, type: 'square', v: 0.05 });
      flips = 0;
      flipAcc = 0;
    }

    function animatePlayer(dt) {
      var target;
      if (state === 'win') {
        target = POSES.cheer;
        spin *= Math.pow(0.3, dt);
        rot += spin * dt;
        rot = lerp(rot, Math.round(rot / TAU) * TAU, Math.min(1, dt * 3));
      } else if (P.hook >= 0) {
        objPos(lv.hooks[P.hook], clock, tA);
        var want = Math.atan2(tA.x - P.x, -(tA.y - P.y)); // body "up" toward the hook
        rot += angDiff(rot, want) * Math.min(1, dt * 16);
        spin = 0;
        target = POSES.hang;
        // legs trail behind the swing
        var lag = clamp(-P.vx * 0.05, -0.6, 0.6);
        pose[4] = lerp(pose[4], target[4] + lag, Math.min(1, dt * 8));
        pose[6] = lerp(pose[6], target[6] + lag, Math.min(1, dt * 8));
      } else {
        // flying: flip, tuck while spinning fast
        var before = rot;
        rot += spin * dt;
        flipAcc += Math.abs(rot - before);
        if (flipAcc >= TAU * 0.85) {
          flipAcc -= TAU;
          flips++;
        }
        spin *= Math.pow(0.6, dt);
        if (Math.abs(spin) < 2.2) {
          spin = 0;
          rot += angDiff(rot, Math.round(rot / TAU) * TAU) * Math.min(1, dt * 4);
        }
        var tuck = clamp((Math.abs(spin) - 2) / 5, 0, 1);
        target = tuck > 0.5 ? POSES.tuck : POSES.spread;
      }
      for (var i = 0; i < 8; i++) {
        if (P.hook >= 0 && (i === 4 || i === 6)) continue;
        pose[i] = lerp(pose[i], target[i], Math.min(1, dt * 12));
      }
      // trail
      trail.push(P.x, P.y);
      if (trail.length > 44) trail.splice(0, 2);
    }

    function followCam(dt, ready) {
      var sp = Math.sqrt(P.vx * P.vx + P.vy * P.vy);
      var zt = 1 - 0.12 * clamp((sp - 11) / 12, 0, 1);
      if (ready) zt = 1;
      cam.z += (zt - cam.z) * (1 - Math.exp(-2 * dt));
      var vw = viewW();
      var tx = ready ? P.x + vw * 0.28 : P.x + vw * 0.12 + clamp(P.vx * 0.22, -1.5, 3);
      var k = 1 - Math.exp(-(ready ? 3 : 4.5) * dt);
      cam.x += (tx - cam.x) * k;
      cam.y += (camTargetY() - cam.y) * (1 - Math.exp(-3.5 * dt));
    }

    function crash() {
      state = 'dead';
      deadT = 0;
      P.hook = -1;
      shake = 0.7;
      sfx('hit');
      burst(P.x, P.y, 16, '#ffffff', 6);
      // build a ragdoll from the current pose
      computeJoints(J, P.x, P.y, rot, pose);
      var pts = [];
      // pop up off the spikes / bounce away from what hit you (velocities in units per 1/60 s)
      var floorHit = P.y + PR > FLOOR - 0.2;
      for (var i = 0; i < 11; i++) {
        var x = J[i * 2], y = J[i * 2 + 1];
        var vx = P.vx * (floorHit ? 0.35 : -0.3) + rand(-2.5, 2.5), vy = floorHit ? -rand(7, 10) : -rand(3, 6); // units/s
        pts.push({ x: x, y: y, px: x - vx / 60, py: y - vy / 60 });
      }
      var sticks = BONES.map(function (b) {
        var dx = pts[b[0]].x - pts[b[1]].x, dy = pts[b[0]].y - pts[b[1]].y;
        return [b[0], b[1], Math.sqrt(dx * dx + dy * dy)];
      });
      rag = { pts: pts, sticks: sticks, lastDt: 1 / 60 };
      ui.toast(root, attempts > 2 ? 'Try ' + (attempts + 1) + ' — you got this!' : 'Ouch! Again…', 900);
    }
    function updateRagdoll(dt) {
      if (!rag) return;
      // Verlet: velocity is implied by (pos - prev); scaled to the frame time
      var h = Math.min(dt, 1 / 30);
      var k = h / rag.lastDt; // time-corrected Verlet (frame times vary)
      rag.lastDt = h;
      var pts = rag.pts;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var vx = (p.x - p.px) * 0.995 * k, vy = (p.y - p.py) * 0.995 * k;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + 20 * h * h;
      }
      for (var it = 0; it < 4; it++) {
        for (var s = 0; s < rag.sticks.length; s++) {
          var st = rag.sticks[s], a = pts[st[0]], b = pts[st[1]];
          var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
          var diff = ((d - st[2]) / d) * 0.5;
          a.x += dx * diff;
          a.y += dy * diff;
          b.x -= dx * diff;
          b.y -= dy * diff;
        }
      }
      for (i = 0; i < 11; i++) {
        J[i * 2] = pts[i].x;
        J[i * 2 + 1] = pts[i].y;
      }
    }

    function win() {
      state = 'win';
      winT = 0;
      P.hook = -1;
      spin = 9;
      sfx('win');
      confetti(lv.finishX + 0.5, P.y - 1, 40);
      shake = 0.3;
    }

    function showWin() {
      var t = clock;
      var st = starTimes(lv);
      var stars = t <= st[0] ? 3 : t <= st[1] ? 2 : 1;
      var prevStars = saved.stars[levelIdx];
      var prevBest = saved.best[levelIdx];
      var newBest = !prevBest || t < prevBest;
      var beforeTotal = totalStars();
      if (stars > prevStars) saved.stars[levelIdx] = stars;
      if (newBest) saved.best[levelIdx] = Math.round(t * 100) / 100;
      saved.last = Math.min(levelIdx + 1, LEVELS - 1); // "Play" continues with the next level
      var afterTotal = totalStars();
      var unlockedSkin = null;
      SKINS.forEach(function (s) {
        if (s.need > beforeTotal && s.need <= afterTotal) unlockedSkin = s;
      });
      save();
      var starHtml = '';
      for (var i = 0; i < 3; i++) {
        starHtml += '<span style="display:inline-block;font-size:40px;line-height:1;margin:0 3px;color:' + (i < stars ? '#fde047' : 'rgba(255,255,255,.18)') +
          ';text-shadow:' + (i < stars ? '0 0 16px rgba(253,224,71,.6)' : 'none') + ';animation:igFade .3s ease ' + (0.15 + i * 0.18) + 's both">★</span>';
      }
      for (i = 0; i < stars; i++) sfx({ f: 660 + i * 220, d: 0.12, type: 'triangle', v: 0.12, delay: 0.15 + i * 0.18 });
      var last = levelIdx >= LEVELS - 1;
      var html =
        '<div style="margin:2px 0 10px">' + starHtml + '</div>' +
        '<div style="display:flex;justify-content:center;gap:20px;margin-bottom:8px">' +
        stat('Time', t.toFixed(2) + 's', newBest ? '#fde047' : '#fff') +
        stat('Best', (newBest ? t : prevBest).toFixed(2) + 's', '#fff') +
        stat('Flips', totalFlips, '#67e8f9') +
        '</div>' +
        (stars < 3 ? '<div style="font-size:13px;opacity:.8">★★★ under ' + st[0].toFixed(1) + 's · ★★ under ' + st[1].toFixed(1) + 's</div>' : '<div style="font-size:13px;color:#fde047;font-weight:800">Perfect run!</div>') +
        (unlockedSkin ? '<div style="margin-top:8px;font-weight:900;color:#a7f3d0">New skin unlocked: ' + unlockedSkin.name + '!</div>' : '') +
        (last ? '<div style="margin-top:8px;font-weight:900;color:#fde047">You cleared all ' + LEVELS + ' levels! Chase 3 stars everywhere.</div>' : '');
      var buttons = [];
      if (!last) buttons.push({ label: 'Next ▶', primary: true, onClick: function () { closeOverlay(); loadLevel(levelIdx + 1, true); ctx.focus(); } });
      buttons.push({ label: '↻ Retry', primary: last, onClick: function () { closeOverlay(); attempts = 0; retry(); ctx.focus(); } });
      buttons.push({ label: '☰ Levels', onClick: showLevels });
      openOverlay({ title: 'Level ' + (levelIdx + 1) + ' clear!', html: html, buttons: buttons });
      updateHud(true);
    }
    function stat(label, val, color) {
      return '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7">' + label +
        '</div><div style="font:900 22px system-ui,sans-serif;color:' + color + '">' + val + '</div></div>';
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
      updateHud(true);
      var ts = totalStars();
      var next = unlockedUpTo();
      var html =
        '<div style="font-size:14px;margin-bottom:6px">Stars <b style="color:#fde047">★ ' + ts + '</b> / ' + LEVELS * 3 +
        ' · Level <b style="color:#fff">' + (Math.min(saved.last, next) + 1) + '</b></div>' +
        '<div style="font-size:13px;opacity:.85">' + (ctx.isTouch ? 'Hold anywhere' : 'Hold the mouse or <span class="ig-kbd">Space</span>') +
        ' to grab the nearest hook · release to fly</div>';
      openOverlay({
        title: ctx.title || 'Skyline Swing',
        text: 'Swing from hook to hook and fling yourself across the finish line.',
        html: html,
        buttons: [
          { label: '▶ Play', primary: true, onClick: function () { closeOverlay(); loadLevel(Math.min(saved.last, next), true); ctx.focus(); } },
          { label: '☰ Levels', onClick: showLevels },
          { label: '🎽 Skins', onClick: showSkins },
        ],
      });
    }

    function showLevels() {
      if (state === 'play') state = 'paused';
      var open = unlockedUpTo();
      var grid = ui.el('div', '');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:4px 0 12px';
      for (var i = 0; i < LEVELS; i++) {
        (function (n) {
          var locked = n > open;
          var b = ui.el('button', '');
          b.type = 'button';
          b.disabled = locked;
          var th = THEMES[Math.floor(n / PER_WORLD) % THEMES.length];
          var st = saved.stars[n];
          b.innerHTML = '<div style="font:900 16px system-ui,sans-serif">' + (locked ? '🔒' : n + 1) + '</div><div style="font-size:10px;letter-spacing:1px;color:#fde047">' +
            (locked ? '&nbsp;' : '★★★'.slice(0, st) + '<span style="color:rgba(255,255,255,.25)">' + '★★★'.slice(st) + '</span>') + '</div>';
          b.setAttribute('aria-label', locked ? 'Level ' + (n + 1) + ' locked' : 'Level ' + (n + 1) + ', ' + st + ' stars');
          b.style.cssText = 'cursor:' + (locked ? 'not-allowed' : 'pointer') + ';border-radius:10px;padding:6px 0;color:#fff;font-family:inherit;border:1px solid ' +
            (n === levelIdx ? '#fff' : 'rgba(255,255,255,.14)') + ';background:' + (locked ? 'rgba(255,255,255,.04)' : 'linear-gradient(160deg,' + th.sky[1] + ',' + th.sky[0] + ')') + (locked ? ';opacity:.55' : '');
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (locked) return;
            sfx('click');
            closeOverlay();
            loadLevel(n, true);
            ctx.focus();
          });
          grid.appendChild(b);
        })(i);
      }
      var o = openOverlay({
        title: 'Levels',
        text: 'Finish a level to open the next one. Every 6 levels is a new world.',
        buttons: [
          { label: '▶ Play ' + (Math.min(saved.last, open) + 1), primary: true, onClick: function () { closeOverlay(); loadLevel(Math.min(saved.last, open), true); ctx.focus(); } },
          { label: '🎽 Skins', onClick: showSkins },
        ],
      });
      o.panel.style.width = 'min(460px, 100%)';
      o.panel.insertBefore(grid, o.panel.querySelector('.ig-actions'));
    }

    function showSkins() {
      if (state === 'play') state = 'paused';
      var ts = totalStars();
      var grid = ui.el('div', '');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;margin:4px 0 12px';
      SKINS.forEach(function (sk) {
        var owned = ts >= sk.need;
        var sel = saved.skin === sk.id;
        var b = ui.el('button', '');
        b.type = 'button';
        b.style.cssText = 'cursor:pointer;border-radius:12px;padding:6px 4px;color:#fff;font-family:inherit;background:' +
          (sel ? 'rgba(139,108,255,.3)' : 'rgba(255,255,255,.05)') + ';border:1px solid ' + (sel ? '#8b6cff' : 'rgba(255,255,255,.12)') + (owned ? '' : ';opacity:.6');
        var cv = document.createElement('canvas');
        cv.width = 120;
        cv.height = 110;
        cv.style.cssText = 'width:100%;height:auto;display:block';
        b.appendChild(cv);
        b.appendChild(ui.el('div', '', '<b style="font-size:12px">' + sk.name + '</b><div style="font-size:11px;opacity:.8">' + (sel ? '✓ Wearing' : owned ? 'Unlocked' : '🔒 ★ ' + sk.need) + '</div>'));
        drawSkinPreview(cv, sk);
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!owned) {
            sfx('error');
            ui.toast(root, 'Collect ' + (sk.need - ts) + ' more ★ to unlock', 1400);
            return;
          }
          saved.skin = sk.id;
          save();
          sfx('buy');
          showSkins();
        });
        grid.appendChild(b);
      });
      var o = openOverlay({
        title: 'Skins',
        text: 'Earn stars to unlock new looks. You have ★ ' + ts + '.',
        buttons: [
          { label: '▶ Play', primary: true, onClick: function () { closeOverlay(); loadLevel(Math.min(saved.last, unlockedUpTo()), true); ctx.focus(); } },
          { label: '☰ Levels', onClick: showLevels },
        ],
      });
      o.panel.style.width = 'min(480px, 100%)';
      o.panel.insertBefore(grid, o.panel.querySelector('.ig-actions'));
    }
    function drawSkinPreview(cv, sk) {
      var c = cv.getContext('2d');
      var JJ = new Float32Array(22);
      computeJoints(JJ, 0, 0, 0, sk.need ? POSES.cheer : POSES.stand);
      var u = 52;
      // little trail swoosh behind
      c.lineCap = 'round';
      for (var i = 0; i < 8; i++) {
        c.strokeStyle = sk.trail[i % sk.trail.length];
        c.globalAlpha = 0.15 + i * 0.06;
        c.lineWidth = 2 + i;
        c.beginPath();
        c.arc(60, 70, 34 + i * 0.5, Math.PI * 0.55 + i * 0.12, Math.PI * 0.55 + i * 0.12 + 0.2);
        c.stroke();
      }
      c.globalAlpha = 1;
      drawFigure(c, JJ, sk, function (x) { return 60 + x * u; }, function (y) { return 54 + y * u; }, u, 0, 1);
    }

    function pauseGame() {
      if (state !== 'play' && state !== 'ready' && state !== 'dead') return;
      prevState = state === 'dead' ? 'ready' : state;
      if (state === 'dead') retry();
      state = 'paused';
      openOverlay({
        title: 'Paused',
        text: 'Level ' + (levelIdx + 1) + ' · ' + THEMES[lv.theme].name,
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeFromPause },
          { label: '↻ Restart level', onClick: function () { closeOverlay(); retry(); ctx.focus(); } },
          { label: '☰ Levels', onClick: showLevels },
        ],
      });
      updateHud(true);
    }
    function resumeFromPause() {
      closeOverlay();
      state = prevState === 'play' ? 'play' : 'ready';
      needRelease = true;
      ctx.focus();
      updateHud(true);
    }

    var hudKey = '';
    function updateHud(force) {
      var playing = state === 'play' || state === 'ready' || state === 'dead' || state === 'paused';
      var t = state === 'ready' ? 0 : clock;
      var tt = lv ? t.toFixed(2) : '0.00';
      var prog = lv ? clamp(P.x / lv.finishX, 0, 1) : 0;
      var key = tt + '|' + Math.round(prog * 100) + '|' + state + '|' + attempts + '|' + levelIdx;
      if (key === hudKey && !force) return;
      hudKey = key;
      hud.style.visibility = lv && (playing || state === 'win') ? 'visible' : 'hidden';
      pauseBtn.innerHTML = state === 'paused' ? '▶' : '❚❚';
      timeEl.textContent = tt;
      barFill.style.width = Math.round(prog * 100) + '%';
      if (lv) {
        var st = starTimes(lv);
        subEl.textContent = 'LEVEL ' + (levelIdx + 1) + ' · ★★★ ' + st[0].toFixed(1) + 's';
        rightPill.textContent = 'Try ' + attempts;
      }
    }

    /* ---------------- scenery ---------------- */
    function buildScenery(theme) {
      var r = mulberry32(theme * 977 + 13);
      var th = THEMES[theme];
      var layers = [];
      for (var L = 0; L < 2; L++) {
        var shapes = [];
        var x = 0;
        var period = 60;
        while (x < period) {
          var w = th.kind === 'city' ? rr(r, 1.6, 3.6) : th.kind === 'peaks' ? rr(r, 4, 8) : rr(r, 3, 7);
          var h = th.kind === 'city' ? rr(r, 3, 8) * (L ? 0.8 : 1.15) : rr(r, 2, 5.5) * (L ? 0.8 : 1.2);
          var win = [];
          if (th.kind === 'city' && L === 1) {
            for (var k = 0; k < 7; k++) win.push(rr(r, 0.15, 0.85), rr(r, 0.1, 0.9));
          }
          shapes.push({ x: x, w: w, h: h, win: win });
          x += w * (th.kind === 'city' ? rr(r, 1.02, 1.3) : rr(r, 0.6, 0.9));
        }
        layers.push({ shapes: shapes, period: x, f: L ? 0.42 : 0.2 });
      }
      var clouds = [];
      for (var c = 0; c < 6; c++) clouds.push({ x: rr(r, 0, 60), y: rr(r, -2, 4), s: rr(r, 0.7, 1.5) });
      var stars = [];
      if (theme === 2) for (var s = 0; s < 40; s++) stars.push(r(), r() * 0.6, rr(r, 0.6, 1.6));
      scenery = { layers: layers, clouds: clouds, stars: stars, theme: theme };
    }

    /* ---------------- rendering ---------------- */
    var scale = 40, offX = 0, offY = 0;
    function X(x) {
      return (x - cam.x) * scale + offX;
    }
    function Y(y) {
      return (y - cam.y) * scale + offY;
    }

    function drawBackground(th) {
      var grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, th.sky[0]);
      grd.addColorStop(0.55, th.sky[1]);
      grd.addColorStop(1, th.sky[2]);
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      if (!scenery) return;
      var i;
      for (i = 0; i < scenery.stars.length; i += 3) {
        g.globalAlpha = 0.4 + 0.4 * Math.sin(time * 1.3 + i);
        g.fillStyle = '#fff';
        g.fillRect(scenery.stars[i] * W, scenery.stars[i + 1] * H, scenery.stars[i + 2], scenery.stars[i + 2]);
      }
      g.globalAlpha = 1;
      // clouds (slow parallax + drift)
      for (i = 0; i < scenery.clouds.length; i++) {
        var cl = scenery.clouds[i];
        var px = (((cl.x - cam.x * 0.08 + time * 0.25) % 60) + 60) % 60;
        var sx = (px / 60) * (W + 320) - 160;
        var sy = H * 0.12 + (cl.y - cam.y * 0.05) * S0 * 0.6;
        g.fillStyle = th.kind === 'clouds' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.13)';
        g.beginPath();
        g.ellipse(sx, sy, 80 * cl.s, 20 * cl.s, 0, 0, TAU);
        g.ellipse(sx + 44 * cl.s, sy - 12 * cl.s, 46 * cl.s, 18 * cl.s, 0, 0, TAU);
        g.ellipse(sx - 40 * cl.s, sy - 4 * cl.s, 36 * cl.s, 14 * cl.s, 0, 0, TAU);
        g.fill();
      }
      // silhouettes
      for (var L = 0; L < scenery.layers.length; L++) {
        var layer = scenery.layers[L];
        var f = layer.f;
        var u = S0 * (L ? 0.7 : 0.5);
        var base = H * (L ? 0.98 : 0.9) - (cam.y - 2) * S0 * f * 0.4;
        g.fillStyle = L ? th.near : th.far;
        var origin = cam.x * f; // layer-space x at screen centre
        var span = W / 2 / u + 8;
        var k0 = Math.floor((origin - span) / layer.period), k1 = Math.floor((origin + span) / layer.period);
        g.beginPath();
        for (var k = k0; k <= k1; k++) {
          for (var j = 0; j < layer.shapes.length; j++) {
            var sh = layer.shapes[j];
            var lx = k * layer.period + sh.x;
            var x0 = W / 2 + (lx - origin) * u;
            var ww = sh.w * u, hh = sh.h * u;
            if (x0 > W || x0 + ww < 0) continue;
            shapePath(th.kind, x0, base, ww, hh);
          }
        }
        g.fill();
        if (L === 1 && th.lights) {
          g.fillStyle = th.lights;
          for (k = k0; k <= k1; k++) {
            for (j = 0; j < layer.shapes.length; j++) {
              sh = layer.shapes[j];
              x0 = W / 2 + (k * layer.period + sh.x - origin) * u;
              ww = sh.w * u;
              hh = sh.h * u;
              if (x0 > W || x0 + ww < 0) continue;
              for (var q = 0; q < sh.win.length; q += 2) g.fillRect(x0 + sh.win[q] * ww * 0.85, base - hh + sh.win[q + 1] * hh * 0.9, Math.max(2, u * 0.12), Math.max(2, u * 0.16));
            }
          }
        }
      }
    }
    function shapePath(kind, x, base, w, h) {
      if (kind === 'city') {
        g.rect(x, base - h, w * 0.92, h + H);
      } else if (kind === 'hills' || kind === 'clouds') {
        g.moveTo(x - w * 0.3, base + H);
        g.ellipse(x + w / 2, base, w * 0.8, h, 0, Math.PI, 0);
        g.lineTo(x + w * 1.3, base + H);
      } else if (kind === 'mesa') {
        g.moveTo(x, base + H);
        g.lineTo(x + w * 0.18, base - h);
        g.lineTo(x + w * 0.82, base - h);
        g.lineTo(x + w, base + H);
      } else {
        g.moveTo(x - w * 0.2, base + H);
        g.lineTo(x + w / 2, base - h * 1.2);
        g.lineTo(x + w * 1.2, base + H);
      }
    }

    function drawFloor(th) {
      var y = Y(FLOOR);
      if (y > H + 10) return;
      var grd = g.createLinearGradient(0, y, 0, Math.max(y + 1, H));
      grd.addColorStop(0, th.abyss);
      grd.addColorStop(1, '#000');
      g.fillStyle = grd;
      g.fillRect(0, y + 0.3 * scale, W, H - y);
      // spike row
      var sw = 0.45 * scale;
      var x0 = X(Math.floor((cam.x - W / scale) / 0.45) * 0.45);
      g.fillStyle = th.spike;
      g.beginPath();
      for (var x = x0; x < W + sw; x += sw) {
        g.moveTo(x, y + 0.36 * scale);
        g.lineTo(x + sw / 2, y);
        g.lineTo(x + sw, y + 0.36 * scale);
      }
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath();
      for (x = x0; x < W + sw; x += sw) {
        g.moveTo(x + sw / 2, y);
        g.lineTo(x + sw, y + 0.36 * scale);
        g.lineTo(x + sw / 2, y + 0.36 * scale);
      }
      g.fill();
    }

    function inView(x, pad) {
      return x > cam.x - viewW() / 2 - pad && x < cam.x + viewW() / 2 + pad;
    }

    function drawBlocks(th) {
      for (var i = 0; i < lv.blocks.length; i++) {
        var b = lv.blocks[i];
        if (b.x + b.w < cam.x - viewW() / 2 - 1 || b.x > cam.x + viewW() / 2 + 1) continue;
        var x = X(b.x), y = Y(b.y), w = b.w * scale, h = b.h * scale;
        if (b.kind === 'spike') {
          g.fillStyle = '#334155';
          roundRect(x, y, w, h, scale * 0.12);
          g.fill();
          // spikes on all sides
          g.fillStyle = '#e2e8f0';
          var n = Math.max(2, Math.round(b.w / 0.3)), sw = w / n, sl = scale * 0.22;
          g.beginPath();
          for (var k = 0; k < n; k++) {
            g.moveTo(x + k * sw, y);
            g.lineTo(x + k * sw + sw / 2, y - sl);
            g.lineTo(x + (k + 1) * sw, y);
            g.moveTo(x + k * sw, y + h);
            g.lineTo(x + k * sw + sw / 2, y + h + sl);
            g.lineTo(x + (k + 1) * sw, y + h);
            g.moveTo(x, y + k * sw);
            g.lineTo(x - sl, y + k * sw + sw / 2);
            g.lineTo(x, y + (k + 1) * sw);
            g.moveTo(x + w, y + k * sw);
            g.lineTo(x + w + sl, y + k * sw + sw / 2);
            g.lineTo(x + w, y + (k + 1) * sw);
          }
          g.fill();
          g.fillStyle = '#ef4444';
          g.beginPath();
          g.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.18, 0, TAU);
          g.fill();
          continue;
        }
        var top = Math.max(y, -20), bottom = Math.min(y + h, H + 20);
        if (bottom <= top) continue;
        g.fillStyle = th.block;
        roundRect(x, top, w, bottom - top, b.kind === 'start' ? scale * 0.15 : scale * 0.1);
        g.fill();
        g.fillStyle = th.blockHi;
        if (y > -20) g.fillRect(x, y, w, Math.max(3, scale * 0.12));
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x + w * 0.7, top, w * 0.3, bottom - top);
        if (b.kind === 'start') {
          // little roof-top antenna + launch arrow
          g.strokeStyle = th.blockHi;
          g.lineWidth = Math.max(2, scale * 0.06);
          g.beginPath();
          g.moveTo(X(-2.3), Y(5));
          g.lineTo(X(-2.3), Y(3.8));
          g.stroke();
          g.fillStyle = '#ef4444';
          g.beginPath();
          g.arc(X(-2.3), Y(3.75), scale * 0.08, 0, TAU);
          g.fill();
        }
      }
    }

    function drawPads(th) {
      for (var i = 0; i < lv.pads.length; i++) {
        var p = lv.pads[i];
        if (!inView(p.x, 3)) continue;
        var hit = padHit[i] != null ? time - padHit[i] : 9;
        var sq = hit < 0.35 ? Math.sin((hit / 0.35) * Math.PI) * (1 - hit / 0.35) : 0;
        g.save();
        g.translate(X(p.x), Y(p.y));
        g.rotate(p.ang);
        var w = p.w * scale;
        // base + two coil springs under the pad
        g.fillStyle = '#334155';
        roundRect(-w * 0.42, scale * 0.62, w * 0.84, scale * 0.22, scale * 0.08);
        g.fill();
        g.strokeStyle = 'rgba(226,232,240,0.9)';
        g.lineWidth = Math.max(1.5, scale * 0.05);
        g.beginPath();
        var top = scale * (0.14 - sq * 0.25), bot = scale * 0.62;
        for (var k = 0; k < 2; k++) {
          var sx = k ? w * 0.25 : -w * 0.25;
          g.moveTo(sx, top);
          for (var z = 1; z <= 6; z++) g.lineTo(sx + (z === 6 ? 0 : z % 2 ? 1 : -1) * scale * 0.14, top + ((bot - top) * z) / 6);
        }
        g.stroke();
        // pad top
        var y0 = -sq * scale * 0.25 + Math.sin(time * 6 + i) * scale * 0.02;
        var grd = g.createLinearGradient(0, y0 - 0.2 * scale, 0, y0 + 0.2 * scale);
        grd.addColorStop(0, '#fde047');
        grd.addColorStop(1, '#f97316');
        g.fillStyle = grd;
        roundRect(-w / 2, y0 - 0.12 * scale, w, 0.28 * scale, 0.14 * scale);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)';
        for (k = 0; k < 3; k++) {
          var ax = -w / 4 + k * (w / 4);
          g.beginPath();
          g.moveTo(ax - scale * 0.12, y0 - 0.25 * scale);
          g.lineTo(ax, y0 - 0.45 * scale - Math.abs(Math.sin(time * 4 + k)) * scale * 0.08);
          g.lineTo(ax + scale * 0.12, y0 - 0.25 * scale);
          g.fill();
        }
        g.restore();
      }
    }

    function drawSaws() {
      for (var i = 0; i < lv.saws.length; i++) {
        var s = lv.saws[i];
        if (!inView(s.x, 3)) continue;
        objPos(s, clock, tA);
        var x = X(tA.x), y = Y(tA.y), r = s.r * scale;
        if (s.my || s.mx) {
          g.strokeStyle = 'rgba(255,255,255,0.25)';
          g.lineWidth = Math.max(2, scale * 0.05);
          g.setLineDash([scale * 0.12, scale * 0.12]);
          g.beginPath();
          g.moveTo(X(s.x - s.mx), Y(s.y - s.my));
          g.lineTo(X(s.x + s.mx), Y(s.y + s.my));
          g.stroke();
          g.setLineDash([]);
        }
        var a = time * 9 + i;
        var n = 12;
        g.fillStyle = '#cbd5e1';
        g.beginPath();
        for (var k = 0; k < n; k++) {
          var a0 = a + (k / n) * TAU, a1 = a + ((k + 0.5) / n) * TAU;
          g.lineTo(x + Math.cos(a0) * r * 0.8, y + Math.sin(a0) * r * 0.8);
          g.lineTo(x + Math.cos(a1) * r * 1.12, y + Math.sin(a1) * r * 1.12);
        }
        g.closePath();
        g.fill();
        g.fillStyle = '#ef4444';
        g.beginPath();
        g.arc(x, y, r * 0.72, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        g.lineWidth = Math.max(1.5, r * 0.08);
        g.beginPath();
        g.arc(x, y, r * 0.5, a, a + 2);
        g.stroke();
        g.fillStyle = '#1f2937';
        g.beginPath();
        g.arc(x, y, r * 0.2, 0, TAU);
        g.fill();
      }
    }

    function drawFinish() {
      var fx = lv.finishX;
      if (!inView(fx, 6)) return;
      var x = X(fx);
      var cw = 0.3 * scale;
      var yTop = Math.max(-20, Y(-14)), yBot = Y(FLOOR);
      var rows = Math.ceil((yBot - yTop) / cw);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < 2; c++) {
          g.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(17,24,39,0.6)';
          g.fillRect(x - cw + c * cw, yTop + r * cw, cw, cw);
        }
      }
      // flags mounted on the finish pillar
      var wv = Math.sin(time * 5) * 0.12 * scale;
      for (var f = 0; f < 2; f++) {
        var py = Y(f ? 4.5 : -1.5);
        g.fillStyle = f ? '#f43f5e' : '#22c55e';
        g.beginPath();
        g.moveTo(x + cw, py);
        g.quadraticCurveTo(x + cw + 0.7 * scale, py + wv, x + cw + 1.4 * scale, py + 0.3 * scale);
        g.quadraticCurveTo(x + cw + 0.7 * scale, py + 0.6 * scale - wv, x + cw, py + 0.8 * scale);
        g.fill();
      }
    }

    function drawHooks(th, target) {
      for (var i = 0; i < lv.hooks.length; i++) {
        var h = lv.hooks[i];
        if (!inView(h.x, 3)) continue;
        objPos(h, clock, tA);
        var x = X(tA.x), y = Y(tA.y), r = 0.22 * scale;
        if (h.per) {
          g.strokeStyle = 'rgba(255,255,255,0.28)';
          g.lineWidth = Math.max(2, scale * 0.05);
          g.setLineDash([scale * 0.1, scale * 0.12]);
          g.beginPath();
          g.moveTo(X(h.x - h.mx), Y(h.y - h.my));
          g.lineTo(X(h.x + h.mx), Y(h.y + h.my));
          g.stroke();
          g.setLineDash([]);
        }
        var active = i === P.hook;
        if (i === target || active) {
          var pulse = 0.5 + 0.5 * Math.sin(time * 8);
          g.strokeStyle = active ? 'rgba(255,255,255,0.9)' : th.hook;
          g.globalAlpha = active ? 0.6 : 0.5 + pulse * 0.4;
          g.lineWidth = Math.max(2, scale * 0.05);
          g.beginPath();
          g.arc(x, y, r * (1.7 + (active ? 0 : pulse * 0.5)), 0, TAU);
          g.stroke();
          g.globalAlpha = 1;
        }
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.arc(x, y + r * 0.25, r * 1.15, 0, TAU);
        g.fill();
        g.fillStyle = active ? '#ffffff' : th.hook;
        g.beginPath();
        g.arc(x, y, r * 1.1, 0, TAU);
        g.fill();
        g.fillStyle = '#1f2937';
        g.beginPath();
        g.arc(x, y, r * 0.55, 0, TAU);
        g.fill();
        g.fillStyle = h.per ? '#22d3ee' : '#f8fafc';
        g.beginPath();
        g.arc(x, y, r * 0.3, 0, TAU);
        g.fill();
      }
      for (i = 0; i < rings.length; i++) {
        var rg = rings[i], k = 1 - rg.life / rg.max;
        g.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')';
        g.lineWidth = Math.max(2, scale * 0.08 * (1 - k));
        g.beginPath();
        g.arc(X(rg.x), Y(rg.y), (0.3 + k * 0.9) * scale, 0, TAU);
        g.stroke();
      }
    }

    function drawTrail(skin) {
      var n = trail.length / 2;
      if (n < 3 || state === 'dead') return;
      g.lineCap = 'round';
      var cols = skin.trail;
      for (var i = 1; i < n; i++) {
        var k = i / n;
        g.strokeStyle = cols[(i + Math.floor(time * 10)) % cols.length];
        g.globalAlpha = k * 0.55;
        g.lineWidth = Math.max(1, k * 0.28 * scale);
        g.beginPath();
        g.moveTo(X(trail[(i - 1) * 2]), Y(trail[(i - 1) * 2 + 1]));
        g.lineTo(X(trail[i * 2]), Y(trail[i * 2 + 1]));
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    function drawPlayer(skin) {
      if (state !== 'dead') computeJoints(J, P.x, P.y, rot, pose);
      // rope from the hands
      if (P.hook >= 0 && state === 'play') {
        objPos(lv.hooks[P.hook], clock, tA);
        var hx = (J[8] + J[12]) / 2, hy = (J[9] + J[13]) / 2;
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(15,23,42,0.45)';
        g.lineWidth = Math.max(3, scale * 0.09);
        g.beginPath();
        g.moveTo(X(hx), Y(hy));
        g.lineTo(X(tA.x), Y(tA.y));
        g.stroke();
        g.strokeStyle = '#f8fafc';
        g.lineWidth = Math.max(1.5, scale * 0.045);
        g.stroke();
      }
      drawFigure(g, J, skin, X, Y, scale, time, P.vx < -0.5 && P.hook < 0 ? -1 : 1);
    }

    function drawGuide(target) {
      // dashed hint to the hook you'd grab right now
      if (state !== 'play' || P.hook >= 0 || target < 0) return;
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = Math.max(1, scale * 0.03);
      g.setLineDash([scale * 0.12, scale * 0.16]);
      g.beginPath();
      g.moveTo(X(P.x), Y(P.y));
      g.lineTo(X(nearX), Y(nearY));
      g.stroke();
      g.setLineDash([]);
    }

    function drawParticles() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var a = clamp(p.life / p.max, 0, 1);
        g.globalAlpha = a;
        g.fillStyle = p.color;
        var s = p.size * scale;
        if (p.kind === 'conf') {
          g.save();
          g.translate(X(p.x), Y(p.y));
          g.rotate(p.rot);
          g.fillRect(-s, -s * 0.5, s * 2, s);
          g.restore();
        } else {
          g.fillRect(X(p.x) - s / 2, Y(p.y) - s / 2, s, s);
        }
      }
      g.globalAlpha = 1;
      g.textAlign = 'center';
      g.font = '900 ' + Math.round(clamp(scale * 0.4, 14, 26)) + 'px system-ui,sans-serif';
      for (i = 0; i < popups.length; i++) {
        var pp = popups[i];
        g.globalAlpha = clamp(pp.life * 2, 0, 1);
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.strokeText(pp.text, X(pp.x), Y(pp.y));
        g.fillStyle = pp.color;
        g.fillText(pp.text, X(pp.x), Y(pp.y));
      }
      g.globalAlpha = 1;
    }

    function drawSpeedLines() {
      var sp = Math.sqrt(P.vx * P.vx + P.vy * P.vy);
      if (state !== 'play' || sp < 16) return;
      var a = clamp((sp - 16) / 9, 0, 1) * 0.22;
      var dx = -P.vx / sp, dy = -P.vy / sp;
      g.strokeStyle = 'rgba(255,255,255,' + a + ')';
      g.lineWidth = 2;
      g.beginPath();
      for (var i = 0; i < 7; i++) {
        var seed = Math.floor(time * 15) * 13 + i * 71;
        var u = ((seed * 9301 + 49297) % 233280) / 233280;
        var v = ((seed * 4271 + 1237) % 98731) / 98731;
        // streaks hug the top and bottom edges so they never cover the stickman
        var x = u * W, y = i % 2 ? v * H * 0.18 : H - v * H * 0.18, l = 50 + 90 * a * 4;
        g.moveTo(x, y);
        g.lineTo(x + dx * l, y + dy * l * 0.3);
      }
      g.stroke();
    }

    function drawReadyHint() {
      if (state !== 'ready' || overlay) return;
      var fs = Math.round(clamp(Math.min(W, H) * 0.045, 14, 24));
      var text = ctx.isTouch ? 'Tap to jump · then hold to swing' : 'Click or Space to jump · then hold to swing';
      g.font = '800 ' + fs + 'px system-ui,sans-serif';
      g.textAlign = 'center';
      var tw = g.measureText(text).width;
      var y = H - Math.max(28, H * 0.1);
      g.fillStyle = 'rgba(5,6,14,0.55)';
      roundRect(W / 2 - tw / 2 - 14, y - fs - 6, tw + 28, fs + 18, 12);
      g.fill();
      g.globalAlpha = 0.7 + 0.3 * Math.sin(time * 4);
      g.fillStyle = '#fff';
      g.fillText(text, W / 2, y + 2);
      g.globalAlpha = 1;
    }

    function roundRect(x, y, w, h, r) {
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
      if (!W || !lv) return;
      var th = THEMES[lv.theme];
      scale = S0 * cam.z;
      offX = W / 2;
      offY = H / 2;
      g.save();
      if (shake > 0) g.translate(rand(-1, 1) * shake * 9, rand(-1, 1) * shake * 9);
      drawBackground(th);
      drawFloor(th);
      drawFinish();
      drawBlocks(th);
      drawPads(th);
      drawSaws();
      var target = state === 'play' && P.hook < 0 ? nearestHook(P, lv, clock) : -1;
      drawHooks(th, target);
      drawGuide(target);
      drawTrail(skinById(saved.skin));
      drawPlayer(skinById(saved.skin));
      drawParticles();
      drawSpeedLines();
      drawReadyHint();
      g.restore();
    }

    /* ---------------- boot ---------------- */
    var loop = IGAME.loop(function (dt) {
      if (state !== 'paused' && state !== 'title') update(dt);
      else time += dt;
      render();
    });
    booted = true;
    loadLevel(Math.min(saved.last, unlockedUpTo()), true);
    showTitle();
    loop.start();

    if (ctx.debug) {
      window.__stickSwing = {
        state: function () {
          return { raw: rawHold(), nr: needRelease, state: state, level: levelIdx + 1, x: +P.x.toFixed(2), y: +P.y.toFixed(2), hook: P.hook, clock: +clock.toFixed(2), finishX: lv && +lv.finishX.toFixed(1), par: lv && +lv.par.toFixed(2), attempts: attempts, overlay: !!overlay };
        },
        // verifies every level with the solver; returns [n, par, seedTry, unverified, beats]
        verifyAll: function () {
          var out = [];
          for (var i = 0; i < LEVELS; i++) {
            var l = getLevel(i);
            out.push([i + 1, +l.par.toFixed(2), l.seedTry, !!l.unverified, l.beats]);
          }
          return out;
        },
        go: function (n) {
          closeOverlay();
          loadLevel(n - 1, true);
        },
        unlockAll: function () {
          for (var i = 0; i < LEVELS; i++) saved.stars[i] = Math.max(saved.stars[i], 1);
          save();
        },
      };
    }

    return {
      pause: function () {
        if (state === 'play' || state === 'ready') pauseGame();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        clearTimeout(introTimer);
        closeOverlay();
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        view.canvas.removeEventListener('pointerdown', onPointerDown);
        view.destroy();
        if (ctx.debug) delete window.__stickSwing;
      },
    };
  });
})();
