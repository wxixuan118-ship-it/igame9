/*!
 * igame9 — Line Logic (engine id: "line-logic")
 * An original draw-to-solve physics puzzle in the style of Brain Lines.
 *
 * Draw lines with limited ink; lines become solid. Press Play and the balls fall,
 * roll and bounce along your lines and the level geometry. Goals: drop a ball in the
 * basket, make two balls meet, or reach the flag zone — while dodging spikes.
 * Stars: ★ goal reached, ★ all gems collected on the way, ★ ink used ≤ par.
 *
 * Physics: balls are dynamic circles; everything else (your lines included) is a
 * static capsule, box or peg. Fixed 1/240 s steps (deterministic, so the built-in
 * hint solutions replay identically), velocity clamp keeps every step's travel below
 * the thinnest collider radius → no tunnelling.
 *
 * Variants: "default" → level pack A (paper theme); "unblocked" → pack B
 * (chalkboard theme, harder) + a Daily Remix (a mirrored level picked by date).
 */
(function () {
  'use strict';
  var IG = window.IGAME;

  /* ------------------------------------------------------------------ */
  /* World constants                                                     */
  /* ------------------------------------------------------------------ */
  var WW = 800, WH = 720; // world size in units (y grows downward)
  var LINE_R = 6; // half thickness of drawn lines
  var WALL_R = 9; // default half thickness of level walls
  var BALL_R = 20;
  var GRAV = 1500;
  var STEP = 1 / 240;
  var VMAX = 1300; // → max 5.4 units per step, below LINE_R
  var SAMPLE = 8; // stroke resampling distance
  var DOT_INK = 8;

  /* ------------------------------------------------------------------ */
  /* Levels (filled in below the engine)                                 */
  /* ------------------------------------------------------------------ */
  var PACKS = { A: [], B: [] };

  /* ------------------------------------------------------------------ */
  /* Geometry helpers                                                    */
  /* ------------------------------------------------------------------ */
  function cap(ax, ay, bx, by, r, kind) {
    var c = { ax: ax, ay: ay, bx: bx, by: by, r: r, kind: kind || 0 };
    c.dx = bx - ax;
    c.dy = by - ay;
    c.len2 = c.dx * c.dx + c.dy * c.dy;
    c.minx = Math.min(ax, bx) - r;
    c.maxx = Math.max(ax, bx) + r;
    c.miny = Math.min(ay, by) - r;
    c.maxy = Math.max(ay, by) + r;
    return c;
  }
  function distPointSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var qx = ax + dx * t - px, qy = ay + dy * t - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  function inRect(x, y, r, pad) {
    pad = pad || 0;
    return x >= r[0] - pad && x <= r[0] + r[2] + pad && y >= r[1] - pad && y <= r[1] + r[3] + pad;
  }

  /* ------------------------------------------------------------------ */
  /* Physics world                                                       */
  /* ------------------------------------------------------------------ */
  // kinds: 0 wall, 1 drawn line, 2 spikes (deadly), 3 bouncer
  var REST = [0.3, 0.32, 0.2, 1];
  var FRICTION = 0.05;

  function World(L) {
    this.L = L;
    this.caps = []; // static capsules from level data
    this.boxes = [];
    this.strokes = []; // {pts, caps, ink, gesture, minx..}
    this.inkUsed = 0;
    var self = this;
    (L.walls || []).forEach(function (w) { self.caps.push(cap(w[0], w[1], w[2], w[3], w[4] || WALL_R, 0)); });
    (L.pegs || []).forEach(function (p) { self.caps.push(cap(p[0], p[1], p[0], p[1], p[2] || 12, 0)); });
    (L.spikes || []).forEach(function (s) { self.caps.push(cap(s[0], s[1], s[2], s[3], 10, 2)); });
    (L.bouncers || []).forEach(function (s) {
      var c = cap(s[0], s[1], s[2], s[3], 8, 3);
      c.power = s[4] || 780; // minimum launch speed along the pad's normal
      self.caps.push(c);
    });
    (L.boxes || []).forEach(function (b) { self.boxes.push({ x: b[0], y: b[1], w: b[2], h: b[3] }); });
    if (L.cup) {
      var c = L.cup; // [centreX, bottomY, innerWidth, height]
      var hw = c[2] / 2 + 7;
      this.caps.push(cap(c[0] - hw, c[1] - c[3], c[0] - hw, c[1], 7, 0));
      this.caps.push(cap(c[0] + hw, c[1] - c[3], c[0] + hw, c[1], 7, 0));
      this.caps.push(cap(c[0] - hw, c[1], c[0] + hw, c[1], 7, 0));
    }
    this.balls = (L.balls || []).map(function (b, i) {
      return { sx: b[0], sy: b[1], r: b[2] || BALL_R, pinned: !!b[3], x: 0, y: 0, vx: 0, vy: 0, rot: 0, inCup: 0, portalCd: 0, dead: false, id: i, contact: 0 };
    });
    this.gems = (L.gems || []).map(function (g) { return { x: g[0], y: g[1], got: false, t: 0 }; });
    this.reset();
  }
  World.prototype.reset = function () {
    this.balls.forEach(function (b) {
      b.x = b.sx;
      b.y = b.sy;
      b.vx = b.vy = 0;
      b.rot = 0;
      b.inCup = 0;
      b.portalCd = 0;
      b.dead = false;
    });
    this.gems.forEach(function (g) { g.got = false; g.t = 0; });
    this.time = 0;
    this.won = false;
    this.failed = null;
    this.events = [];
  };

  // Is a stroke point allowed here? (inside the world, outside no-draw zones and balls)
  World.prototype.canDraw = function (x, y, live) {
    if (x < 4 || y < 4 || x > WW - 4 || y > WH - 4) return false;
    var nd = this.L.nodraw || [];
    for (var i = 0; i < nd.length; i++) if (inRect(x, y, nd[i], LINE_R)) return false;
    for (var k = 0; k < this.balls.length; k++) {
      var b = this.balls[k];
      var bx = live ? b.x : b.sx, by = live ? b.y : b.sy;
      var dx = x - bx, dy = y - by;
      var rr = b.r + LINE_R + 3;
      if (dx * dx + dy * dy < rr * rr) return false;
    }
    return true;
  };

  World.prototype.inkLeft = function () {
    return Math.max(0, this.L.ink - this.inkUsed);
  };

  // Stroke builder: feed raw pointer points; it resamples, enforces ink and no-draw
  // areas, and splits the gesture into separate strokes where it crosses a forbidden area.
  World.prototype.beginGesture = function (gesture, live) {
    this.cur = { gesture: gesture, live: live, stroke: null, lastX: 0, lastY: 0, outside: true };
  };
  World.prototype.gesturePoint = function (x, y) {
    var cur = this.cur;
    if (!cur) return;
    if (cur.stroke === null && cur.outside) {
      if (!this.canDraw(x, y, cur.live) || this.inkLeft() <= 0) return;
      cur.stroke = { pts: [x, y], caps: [], ink: 0, gesture: cur.gesture, live: cur.live };
      cur.outside = false;
      cur.lastX = x;
      cur.lastY = y;
      this.strokes.push(cur.stroke);
      this.inkUsed += DOT_INK;
      cur.stroke.ink += DOT_INK;
      this.rebuildStroke(cur.stroke);
      return;
    }
    // walk from the last accepted point toward (x, y) in SAMPLE steps
    var dx = x - cur.lastX, dy = y - cur.lastY;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < SAMPLE) return;
    var n = Math.floor(d / SAMPLE);
    for (var i = 1; i <= n; i++) {
      var px = cur.lastX + (dx * SAMPLE) / d, py = cur.lastY + (dy * SAMPLE) / d;
      if (this.inkLeft() < SAMPLE * 0.5) {
        this.endStroke();
        cur.outside = true;
        return;
      }
      if (!this.canDraw(px, py, cur.live)) {
        // pen lifts until the pointer is back in a drawable area
        this.endStroke();
        cur.outside = true;
        cur.lastX = px;
        cur.lastY = py;
        return;
      }
      var st = cur.stroke;
      var seg = Math.min(SAMPLE, this.inkLeft());
      st.pts.push(px, py);
      st.ink += seg;
      this.inkUsed += seg;
      cur.lastX = px;
      cur.lastY = py;
      this.addCap(st, st.pts.length - 4);
    }
  };
  World.prototype.endStroke = function () {
    if (this.cur) this.cur.stroke = null;
  };
  World.prototype.endGesture = function () {
    this.cur = null;
  };
  World.prototype.addCap = function (st, i) {
    var p = st.pts;
    var c = cap(p[i], p[i + 1], p[i + 2], p[i + 3], LINE_R, 1);
    st.caps.push(c);
    st.minx = Math.min(st.minx, c.minx);
    st.maxx = Math.max(st.maxx, c.maxx);
    st.miny = Math.min(st.miny, c.miny);
    st.maxy = Math.max(st.maxy, c.maxy);
  };
  World.prototype.rebuildStroke = function (st) {
    st.caps = [];
    st.minx = st.miny = 1e9;
    st.maxx = st.maxy = -1e9;
    var p = st.pts;
    if (p.length === 2) {
      var c = cap(p[0], p[1], p[0], p[1], LINE_R, 1);
      st.caps.push(c);
      st.minx = c.minx;
      st.maxx = c.maxx;
      st.miny = c.miny;
      st.maxy = c.maxy;
      return;
    }
    for (var i = 0; i + 3 < p.length; i += 2) this.addCap(st, i);
  };
  // Remove every stroke of the most recent gesture. Returns true if something was removed.
  World.prototype.undo = function () {
    if (!this.strokes.length) return false;
    var g = this.strokes[this.strokes.length - 1].gesture;
    while (this.strokes.length && this.strokes[this.strokes.length - 1].gesture === g) {
      this.inkUsed -= this.strokes.pop().ink;
    }
    if (this.inkUsed < 0.01) this.inkUsed = 0;
    return true;
  };
  World.prototype.clearStrokes = function () {
    this.strokes.length = 0;
    this.inkUsed = 0;
  };
  // Adds a polyline (used for hint replays and level verification).
  World.prototype.addPolyline = function (pts, gesture) {
    this.beginGesture(gesture, false);
    this.gesturePoint(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) {
      // feed intermediate points so resampling follows straight segments exactly
      var ax = pts[i - 2], ay = pts[i - 1], bx = pts[i], by = pts[i + 1];
      var d = Math.hypot(bx - ax, by - ay);
      var n = Math.max(1, Math.ceil(d / 2));
      for (var k = 1; k <= n; k++) this.gesturePoint(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
    }
    this.endGesture();
  };

  // Collision response along normal (nx, ny) for a ball against a static surface.
  function bounce(b, nx, ny, kind, power) {
    var vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    if (kind === 3) {
      // springy pad: always kicks out at a healthy speed
      var out = Math.max(-vn * 0.95, power || 780);
      b.vx += (out - vn) * nx;
      b.vy += (out - vn) * ny;
      b.kick = 1;
      return;
    }
    var e = -vn > 60 ? REST[kind] : 0;
    var jn = -(1 + e) * vn;
    b.vx += jn * nx;
    b.vy += jn * ny;
    var tx = -ny, ty = nx;
    var vt = b.vx * tx + b.vy * ty;
    var maxF = FRICTION * jn;
    var dv = Math.abs(vt) < maxF ? -vt : vt > 0 ? -maxF : maxF;
    b.vx += dv * tx;
    b.vy += dv * ty;
    if (-vn > 160) b.impact = Math.max(b.impact || 0, -vn);
  }

  function collideCap(b, c) {
    if (b.x + b.r < c.minx || b.x - b.r > c.maxx || b.y + b.r < c.miny || b.y - b.r > c.maxy) return false;
    var t = c.len2 ? ((b.x - c.ax) * c.dx + (b.y - c.ay) * c.dy) / c.len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var px = c.ax + c.dx * t, py = c.ay + c.dy * t;
    var dx = b.x - px, dy = b.y - py;
    var rr = b.r + c.r;
    var d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return false;
    var d = Math.sqrt(d2), nx, ny;
    if (d > 1e-6) {
      nx = dx / d;
      ny = dy / d;
    } else {
      var l = Math.sqrt(c.len2) || 1;
      nx = c.len2 ? -c.dy / l : 0;
      ny = c.len2 ? c.dx / l : -1;
    }
    b.x += nx * (rr - d);
    b.y += ny * (rr - d);
    bounce(b, nx, ny, c.kind, c.power);
    if (ny < -0.3) b.contact = 1;
    return true;
  }

  function collideBox(b, bx) {
    if (b.x + b.r < bx.x || b.x - b.r > bx.x + bx.w || b.y + b.r < bx.y || b.y - b.r > bx.y + bx.h) return false;
    var cx = Math.max(bx.x, Math.min(b.x, bx.x + bx.w));
    var cy = Math.max(bx.y, Math.min(b.y, bx.y + bx.h));
    var dx = b.x - cx, dy = b.y - cy;
    var d2 = dx * dx + dy * dy;
    var nx, ny, pen;
    if (d2 === 0) {
      // centre inside the box: push out along the shallowest side
      var l = b.x - bx.x, r = bx.x + bx.w - b.x, t = b.y - bx.y, btm = bx.y + bx.h - b.y;
      var m = Math.min(l, r, t, btm);
      nx = m === l ? -1 : m === r ? 1 : 0;
      ny = m === t ? -1 : m === btm ? 1 : 0;
      if (nx && ny) ny = 0;
      pen = m + b.r;
    } else {
      if (d2 >= b.r * b.r) return false;
      var d = Math.sqrt(d2);
      nx = dx / d;
      ny = dy / d;
      pen = b.r - d;
    }
    b.x += nx * pen;
    b.y += ny * pen;
    bounce(b, nx, ny, 0);
    if (ny < -0.3) b.contact = 1;
    return true;
  }

  World.prototype.step = function () {
    var L = this.L, balls = this.balls;
    this.time += STEP;
    var fans = L.fans || [];
    var i, k, b;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pinned || b.dead) continue;
      b.vy += GRAV * STEP;
      for (k = 0; k < fans.length; k++) {
        var f = fans[k];
        if (inRect(b.x, b.y, f)) {
          b.vx += f[4] * STEP;
          b.vy += f[5] * STEP;
        }
      }
      if (b.contact) {
        // rolling resistance
        b.vx *= 1 - 0.35 * STEP;
        b.vy *= 1 - 0.35 * STEP;
      }
      var sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > VMAX * VMAX) {
        var s = VMAX / Math.sqrt(sp2);
        b.vx *= s;
        b.vy *= s;
      }
      b.x += b.vx * STEP;
      b.y += b.vy * STEP;
      b.contact = 0;
    }
    // collisions (two passes for stability in creases)
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < balls.length; i++) {
        b = balls[i];
        if (b.pinned || b.dead) continue;
        var caps = this.caps;
        for (k = 0; k < caps.length; k++) {
          if (collideCap(b, caps[k]) && caps[k].kind === 2 && !this.failed) {
            this.failed = 'spikes';
            b.dead = true;
            this.events.push(['pop', b.x, b.y, b.id]);
          }
        }
        for (k = 0; k < this.boxes.length; k++) collideBox(b, this.boxes[k]);
        for (k = 0; k < this.strokes.length; k++) {
          var st = this.strokes[k];
          if (b.x + b.r < st.minx || b.x - b.r > st.maxx || b.y + b.r < st.miny || b.y - b.r > st.maxy) continue;
          for (var q = 0; q < st.caps.length; q++) collideCap(b, st.caps[q]);
        }
      }
      // ball vs ball
      for (i = 0; i < balls.length; i++) {
        for (k = i + 1; k < balls.length; k++) {
          var a = balls[i], c = balls[k];
          if (a.dead || c.dead) continue;
          var dx = c.x - a.x, dy = c.y - a.y;
          var rr = a.r + c.r;
          var d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          var d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          var ia = a.pinned ? 0 : 1 / (a.r * a.r), ic = c.pinned ? 0 : 1 / (c.r * c.r);
          if (!ia && !ic) continue;
          var pen = rr - d;
          a.x -= nx * pen * (ia / (ia + ic));
          a.y -= ny * pen * (ia / (ia + ic));
          c.x += nx * pen * (ic / (ia + ic));
          c.y += ny * pen * (ic / (ia + ic));
          var vrel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (vrel < 0) {
            var j = (-(1 + 0.5) * vrel) / (ia + ic);
            a.vx -= j * ia * nx;
            a.vy -= j * ia * ny;
            c.vx += j * ic * nx;
            c.vy += j * ic * ny;
          }
          if (ny > 0.3) a.contact = 1;
          if (ny < -0.3) c.contact = 1;
          if (pass === 0 && L.goal === 'touch' && !this.won && i === 0 && k === 1) {
            this.won = true;
            this.events.push(['touch', (a.x + c.x) / 2, (a.y + c.y) / 2]);
          }
        }
      }
    }
    // portals, gems, goal, bounds
    var portals = L.portals || [];
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.dead) continue;
      if (!b.pinned) b.rot += (b.vx * STEP) / b.r;
      if (b.portalCd > 0) b.portalCd -= STEP;
      // portals are one-way: enter the purple ring, come out of the orange one
      for (k = 0; k < portals.length && b.portalCd <= 0; k++) {
        var p = portals[k];
        if ((b.x - p[0]) * (b.x - p[0]) + (b.y - p[1]) * (b.y - p[1]) < 30 * 30) {
          b.x = p[2];
          b.y = p[3];
          b.portalCd = 0.35;
          this.events.push(['portal', p[0], p[1]]);
        }
      }
      for (k = 0; k < this.gems.length; k++) {
        var gm = this.gems[k];
        if (!gm.got && (b.x - gm.x) * (b.x - gm.x) + (b.y - gm.y) * (b.y - gm.y) < (b.r + 16) * (b.r + 16)) {
          gm.got = true;
          this.events.push(['gem', gm.x, gm.y]);
        }
      }
      if (L.cup && !this.won) {
        var cp = L.cup;
        var inside = Math.abs(b.x - cp[0]) < cp[2] / 2 && b.y > cp[1] - cp[3] && b.y < cp[1];
        b.inCup = inside ? b.inCup + STEP : 0;
      }
      if (L.zone && !this.won && i === 0) {
        var z = L.zone;
        var cx = Math.max(z[0], Math.min(b.x, z[0] + z[2])), cy = Math.max(z[1], Math.min(b.y, z[1] + z[3]));
        if ((b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy) < b.r * b.r) {
          this.won = true;
          this.events.push(['zone', b.x, b.y]);
        }
      }
      if (!this.failed && (b.y > WH + 120 || b.x < -150 || b.x > WW + 150)) {
        this.failed = 'out';
        b.dead = true;
      }
    }
    if (L.cup && !this.won) {
      var need = L.need || 1, inCup = 0;
      for (i = 0; i < balls.length; i++) if (!balls[i].dead && balls[i].inCup > 0.3) inCup++;
      if (inCup >= need) {
        this.won = true;
        this.events.push(['cup', L.cup[0], L.cup[1] - L.cup[3] / 2]);
      }
    }
  };
  World.prototype.gemsGot = function () {
    return this.gems.filter(function (g) { return g.got; }).length;
  };

  // Mirror a level horizontally (Daily Remix). Physics is symmetric, so solutions mirror too.
  function mirrorLevel(L) {
    var fx = function (x) { return WW - x; };
    var segs = function (arr) { return (arr || []).map(function (s) { return [fx(s[0]), s[1], fx(s[2]), s[3]].concat(s.slice(4)); }); };
    var M = {};
    Object.keys(L).forEach(function (k) { M[k] = L[k]; });
    M.walls = segs(L.walls);
    M.spikes = segs(L.spikes);
    M.bouncers = segs(L.bouncers);
    M.portals = (L.portals || []).map(function (p) { return [fx(p[0]), p[1], fx(p[2]), p[3]]; });
    M.pegs = (L.pegs || []).map(function (p) { return [fx(p[0]), p[1]].concat(p.slice(2)); });
    M.balls = (L.balls || []).map(function (b) { return [fx(b[0]), b[1]].concat(b.slice(2)); });
    M.gems = (L.gems || []).map(function (g) { return [fx(g[0]), g[1]]; });
    M.boxes = (L.boxes || []).map(function (b) { return [WW - b[0] - b[2], b[1], b[2], b[3]]; });
    M.nodraw = (L.nodraw || []).map(function (b) { return [WW - b[0] - b[2], b[1], b[2], b[3]]; });
    M.fans = (L.fans || []).map(function (f) { return [WW - f[0] - f[2], f[1], f[2], f[3], -f[4], f[5]]; });
    if (L.cup) M.cup = [fx(L.cup[0])].concat(L.cup.slice(1));
    if (L.zone) M.zone = [WW - L.zone[0] - L.zone[2], L.zone[1], L.zone[2], L.zone[3]];
    M.sol = (L.sol || []).map(function (s) {
      var o = [];
      for (var i = 0; i < s.length; i += 2) o.push(fx(s[i]), s[i + 1]);
      return o;
    });
    return M;
  }

  // Runs a level with its solution strokes; used by tests and the in-game self-check.
  function verifyLevel(L, maxTime) {
    var w = new World(L);
    (L.sol || []).forEach(function (s, i) { w.addPolyline(s, i + 1); });
    var steps = Math.round((maxTime || 25) / STEP);
    for (var i = 0; i < steps && !w.won && !w.failed; i++) w.step();
    return { won: w.won, failed: w.failed, time: w.time, gems: w.gemsGot(), gemsTotal: w.gems.length, ink: Math.round(w.inkUsed), strokes: w.strokes.length };
  }

  /* ------------------------------------------------------------------ */
  /* Themes                                                              */
  /* ------------------------------------------------------------------ */
  var THEMES = {
    paper: {
      bg: '#f6f1e4', grid: 'rgba(40,110,140,0.12)', grid2: 'rgba(40,110,140,0.22)', margin: 'rgba(220,80,80,0.35)',
      ink: '#1f2a44', inkShadow: 'rgba(31,42,68,0.18)', wall: '#3b4252', wallHi: '#596277', box: '#4b5468',
      text: '#1f2a44', hint: 'rgba(37,99,235,0.55)', ghost: 'rgba(31,42,68,0.35)',
    },
    chalk: {
      bg: '#1f3a33', grid: 'rgba(255,255,255,0.05)', grid2: 'rgba(255,255,255,0.09)', margin: 'rgba(255,255,255,0)',
      ink: '#f4f1e8', inkShadow: 'rgba(0,0,0,0.3)', wall: '#c9b48a', wallHi: '#e6d3a8', box: '#a58f63',
      text: '#f4f1e8', hint: 'rgba(253,224,71,0.7)', ghost: 'rgba(244,241,232,0.4)',
    },
  };
  var BALL_COLORS = ['#f97316', '#3b82f6', '#ec4899', '#22c55e'];
  var TOUCH_COLORS = ['#3b82f6', '#ec4899'];

  var SVG = {
    undo: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7H4V2"/><path d="M4.5 7A8 8 0 1 1 6 18"/></svg>',
    clear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="#fff"/></svg>',
    reset: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    hint: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="#fde68a" stroke="#fff" stroke-width="1.4"/><path d="M9.5 18.5h5M10.5 21h3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="#fff"/><rect x="14" y="5" width="4" height="14" rx="1" fill="#fff"/></svg>',
  };

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  // The factory is registered at the very end of this file, after the level packs
  // are defined (registering can mount the game synchronously).
  function createGame(ctx) {
    var root = ctx.root;
    var ui = IG.ui;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var packId = ctx.variant === 'unblocked' ? 'B' : 'A';
    var PACK = PACKS[packId];
    var theme = THEMES[packId === 'B' ? 'chalk' : 'paper'];

    /* ---------- saved progress ---------- */
    var saved = {
      stars: store.get('stars', []),
      ink: store.get('ink', []),
      daily: store.get('daily', {}), // {date: stars}
    };
    function save() {
      store.set('stars', saved.stars);
      store.set('ink', saved.ink);
      store.set('daily', saved.daily);
    }
    function unlockedCount() {
      var n = 1;
      for (var i = 0; i < PACK.length; i++) if (saved.stars[i] > 0) n = i + 2;
      return Math.min(PACK.length, n);
    }
    function totalStars() {
      return saved.stars.reduce(function (a, b) { return a + (b || 0); }, 0);
    }
    function todayKey() {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    // Daily Remix: a mirrored level from both packs, picked by date.
    function dailyLevel() {
      var key = todayKey();
      var h = 0;
      for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
      var pool = PACKS.A.slice(8).concat(PACKS.B.slice(4));
      var base = pool[h % pool.length];
      var L = mirrorLevel(base);
      L.name = 'Daily Remix';
      L.daily = key;
      L.ink = Math.round(base.ink * 0.9);
      return L;
    }

    /* ---------- state ---------- */
    var state = 'menu'; // menu | draw | run | fail | won | paused
    var pausedFrom = null;
    var levelIdx = 0;
    var L = null, world = null, isDaily = false;
    var gesture = 0;
    var drawing = null; // {id}
    var acc = 0;
    var failTimer = 0, wonTimer = 0, stallT = 0, stallWarned = false;
    var hintT = 0;
    var overlay = null;
    var introT = 0;

    /* ---------- canvas & layout ---------- */
    var W = 0, H = 0, sc = 1, ox = 0, oy = 0, sideBar = false, hudH = 50;
    var staticLayer = document.createElement('canvas');
    var staticKey = '';
    var booted = false;
    var view = IG.createCanvas(root, {
      onResize: function (w, h) {
        W = w;
        H = h;
        if (booted) layout();
      },
    });
    var g = view.ctx;

    function layout() {
      sideBar = W > H * 1.2 && W > 560;
      hudH = W < 480 ? 44 : 50;
      var x0 = 8, y0 = hudH + 14, x1 = W - 8, y1 = H - 8;
      if (sideBar) {
        x1 -= 70;
        toolbar.style.cssText = TB_BASE + 'right:10px;top:50%;transform:translateY(-50%);flex-direction:column';
      } else {
        y1 -= 58;
        toolbar.style.cssText = TB_BASE + 'left:50%;bottom:8px;transform:translateX(-50%);flex-direction:row';
      }
      sc = Math.min((x1 - x0) / WW, (y1 - y0) / WH);
      ox = Math.round(x0 + (x1 - x0 - WW * sc) / 2);
      oy = Math.round(y0 + (y1 - y0 - WH * sc) / 2);
      staticKey = '';
    }

    /* ---------- HUD ---------- */
    var hudEl = ui.el('div', 'ig-hud');
    var leftBox = ui.el('div', '');
    leftBox.style.cssText = 'display:flex;gap:6px;align-items:center;min-width:0';
    var lvPill = ui.el('div', 'ig-pill', '');
    var goalPill = ui.el('div', 'ig-pill', '');
    goalPill.style.cssText = 'overflow:hidden;text-overflow:ellipsis;max-width:46vw;font-weight:700';
    leftBox.appendChild(lvPill);
    leftBox.appendChild(goalPill);
    var rightBox = ui.el('div', '');
    rightBox.style.cssText = 'display:flex;gap:6px;align-items:center';
    var gemPill = ui.el('div', 'ig-pill', '');
    var pauseBtn = ui.el('button', 'ig-pill', SVG.pause);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'cursor:pointer;display:grid;place-items:center;padding:6px 10px;line-height:0';
    rightBox.appendChild(gemPill);
    rightBox.appendChild(pauseBtn);
    hudEl.appendChild(leftBox);
    hudEl.appendChild(rightBox);
    root.appendChild(hudEl);

    var TB_BASE = 'position:absolute;z-index:4;display:flex;gap:7px;align-items:center;';
    var toolbar = ui.el('div', '');
    function toolBtn(svg, label, aria) {
      var b = ui.el('button', 'ig-pill', svg + (label ? '<span>' + label + '</span>' : ''));
      b.type = 'button';
      b.setAttribute('aria-label', aria);
      b.title = aria;
      b.style.cssText =
        'cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;min-width:50px;min-height:44px;padding:6px 10px;border-radius:14px;font-size:14px;touch-action:manipulation';
      toolbar.appendChild(b);
      return b;
    }
    var undoBtn = toolBtn(SVG.undo, '', 'Undo last line (Z)');
    var clearBtn = toolBtn(SVG.clear, '', 'Erase all lines');
    var playBtn = toolBtn(SVG.play, '', 'Play (Space)');
    var hintBtn = toolBtn(SVG.hint, '', 'Show a hint (H)');
    var menuBtn = toolBtn(SVG.menu, '', 'Levels');
    playBtn.style.background = 'linear-gradient(135deg,#8b6cff,#2dd4f0)';
    playBtn.style.minWidth = '62px';
    root.appendChild(toolbar);

    var hudCache = '';
    function updateHud() {
      var inGame = state !== 'menu' && !!L;
      var key = [state, levelIdx, isDaily, world ? world.gemsGot() : 0, W, inGame].join('|');
      if (key === hudCache) return;
      hudCache = key;
      hudEl.style.visibility = inGame ? 'visible' : 'hidden';
      toolbar.style.visibility = inGame ? 'visible' : 'hidden';
      if (!L) return;
      lvPill.textContent = isDaily ? '📅 Daily' : 'Level ' + (levelIdx + 1);
      goalPill.textContent = L.text;
      goalPill.style.display = W < 420 ? 'none' : '';
      gemPill.innerHTML = '<span style="color:#67e8f9">◆</span> ' + world.gemsGot() + '/' + world.gems.length;
      var running = state === 'run' || state === 'fail' || state === 'won';
      playBtn.innerHTML = running ? SVG.reset : SVG.play;
      playBtn.setAttribute('aria-label', running ? 'Reset balls (Space)' : 'Play (Space)');
      playBtn.title = playBtn.getAttribute('aria-label');
    }

    /* ---------- effects ---------- */
    var MAXP = 160;
    var parts = [];
    for (var pi = 0; pi < MAXP; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: '#fff', size: 3 });
    function spawn(x, y, color, n, speed) {
      for (var i = 0, made = 0; i < MAXP && made < n; i++) {
        var p = parts[i];
        if (p.on) continue;
        var a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.8);
        p.on = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v - speed * 0.3;
        p.max = p.life = 0.5 + Math.random() * 0.5;
        p.color = color;
        p.size = 3 + Math.random() * 5;
        made++;
      }
    }
    var shakeT = 0;
    var banner = { text: '', t: 0, color: '#fff' };
    function showBanner(text, color, t) {
      banner.text = text;
      banner.color = color || '#fff';
      banner.t = t || 1.2;
    }
    var lastToast = null;
    function toast(text, ms) {
      if (lastToast && lastToast.parentNode) lastToast.parentNode.removeChild(lastToast);
      lastToast = ui.toast(root, text, ms);
    }

    /* ---------- flow ---------- */
    function loadLevel(i, daily) {
      closeOverlay();
      isDaily = !!daily;
      levelIdx = i;
      L = isDaily ? dailyLevel() : PACK[i];
      world = new World(L);
      gesture = 0;
      drawing = null;
      state = 'draw';
      acc = 0;
      hintT = 0;
      introT = 2.6;
      stallT = 0;
      stallWarned = false;
      staticKey = '';
      hudCache = '';
      parts.forEach(function (p) { p.on = false; });
      updateHud();
      sfx('click');
      ctx.focus();
    }
    function startRun() {
      if (state !== 'draw') return;
      world.reset();
      state = 'run';
      acc = 0;
      stallT = 0;
      stallWarned = false;
      sfx('jump');
    }
    function resetRun() {
      if (state !== 'run' && state !== 'fail') return;
      world.reset();
      state = 'draw';
      sfx('slide');
    }
    function togglePlay() {
      if (state === 'draw') startRun();
      else if (state === 'run' || state === 'fail') resetRun();
    }
    function undo() {
      if (state !== 'draw' && state !== 'run' && state !== 'fail') return;
      if (drawing) return;
      if (world.undo()) sfx('pop');
      else sfx('error');
    }
    function clearLines() {
      if (state !== 'draw' && state !== 'run' && state !== 'fail') return;
      if (!world.strokes.length) return;
      world.clearStrokes();
      sfx('slide');
    }
    function restartLevel() {
      if (!L) return;
      if (isDaily) loadLevel(0, true);
      else loadLevel(levelIdx);
    }
    function showHint() {
      if (state !== 'draw' && state !== 'run') return;
      hintT = 4;
      sfx('pop');
      toast('One possible solution — trace it or find your own', 1800);
    }

    function starsFor() {
      var s = 1;
      if (world.gemsGot() === world.gems.length) s++;
      if (world.inkUsed <= L.par + 0.5) s++;
      return s;
    }

    function onWin() {
      state = 'won';
      var stars = starsFor();
      var ink = Math.round(world.inkUsed);
      if (isDaily) {
        saved.daily = {};
        saved.daily[L.daily] = Math.max(stars, (store.get('daily', {})[L.daily]) || 0);
      } else {
        saved.stars[levelIdx] = Math.max(saved.stars[levelIdx] || 0, stars);
        saved.ink[levelIdx] = saved.ink[levelIdx] ? Math.min(saved.ink[levelIdx], ink) : ink;
      }
      save();
      sfx('win');
      showBanner(L.goal === 'touch' ? 'They met!' : 'Solved!', '#22c55e', 1.4);
      wonTimer = 1.25;
      wonInfo = { stars: stars, ink: ink };
    }
    var wonInfo = null;

    /* ---------- overlays ---------- */
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }
    function openOverlay(o, wide) {
      closeOverlay();
      overlay = ui.overlay(root, o);
      if (wide) overlay.panel.style.width = 'min(' + wide + 'px, 100%)';
      return overlay;
    }
    function starRow(n, size) {
      var s = '';
      for (var i = 0; i < 3; i++) {
        s += '<span style="color:' + (i < n ? '#fde047' : 'rgba(255,255,255,.18)') + ';font-size:' + size + 'px;line-height:1;' +
          (i < n ? 'text-shadow:0 0 12px rgba(253,224,71,.55)' : '') + '">★</span>';
      }
      return s;
    }

    function showMenu() {
      state = 'menu';
      L = null;
      world = null;
      updateHud();
      var dailyDone = saved.daily[todayKey()];
      var html =
        '<div style="font-size:14px;margin:-2px 0 4px">★ <b style="color:#fde047">' + totalStars() + '</b> / ' + PACK.length * 3 +
        ' · ' + PACK.length + ' levels' + (packId === 'B' ? ' · Daily Remix ' + (dailyDone ? '<b style="color:#86efac">✓ done</b>' : 'ready') : '') + '</div>';
      var buttons = [{ label: '▶ Play', primary: true, onClick: showLevels }];
      if (packId === 'B') buttons.push({ label: '📅 Daily Remix', onClick: function () { loadLevel(0, true); } });
      openOverlay({
        title: ctx.title || 'Line Logic',
        text: 'Draw lines to guide the ball, then press Play. Lines are solid — use as little ink as you can.',
        html: html,
        buttons: buttons,
      }, 440);
    }

    function showLevels() {
      L = null;
      world = null;
      state = 'menu';
      updateHud();
      var un = unlockedCount();
      var next = un - 1;
      for (var i = 0; i < un; i++) if (!saved.stars[i]) { next = i; break; }
      var small = W < 480;
      var cells = '';
      for (var k = 0; k < PACK.length; k++) {
        var locked = k >= un;
        var st = saved.stars[k] || 0;
        cells +=
          '<button type="button" data-lv="' + k + '"' + (locked ? ' disabled' : '') +
          ' style="cursor:' + (locked ? 'not-allowed' : 'pointer') + ';font:800 ' + (small ? 14 : 16) + 'px system-ui,sans-serif;color:#fff;border-radius:10px;padding:' + (small ? '3px 0 2px;min-height:40px;' : '6px 0 4px;min-height:50px;') +
          'background:' + (k === next ? 'linear-gradient(135deg,#8b6cff,#2dd4f0)' : locked ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.09)') +
          ';border:1px solid ' + (k === next ? 'transparent' : 'rgba(255,255,255,.14)') + ';opacity:' + (locked ? 0.45 : 1) + '">' +
          (locked ? '🔒' : k + 1) + '<div style="font-size:10px;letter-spacing:1px;margin-top:1px">' +
          (locked ? '&nbsp;' : '<span style="color:#fde047">' + '★'.repeat(st) + '</span><span style="opacity:.3">' + '★'.repeat(3 - st) + '</span>') +
          '</div></button>';
      }
      var html = '<div style="display:grid;grid-template-columns:repeat(' + (small ? 6 : 'auto-fill,minmax(52px,1fr)') + ');gap:' + (small ? 5 : 7) + 'px;margin:2px 0">' + cells + '</div>' +
        '<div style="font-size:12px;opacity:.75;margin-top:8px">★ solve · ★ grab every ◆ gem · ★ use no more ink than par</div>';
      var o = openOverlay({
        title: 'Choose a level',
        html: html,
        buttons: [
          { label: '▶ Level ' + (next + 1), primary: true, onClick: function () { loadLevel(next); } },
          { label: '← Menu', onClick: showMenu },
        ],
      }, 540);
      Array.prototype.forEach.call(o.panel.querySelectorAll('[data-lv]'), function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (b.disabled) return;
          loadLevel(+b.getAttribute('data-lv'));
        });
      });
    }

    function showWin() {
      var info = wonInfo;
      var last = !isDaily && levelIdx >= PACK.length - 1;
      var gemsAll = world.gemsGot() === world.gems.length;
      var underPar = info.ink <= L.par + 0.5;
      var row = function (ok, text) {
        return '<div style="display:flex;gap:8px;align-items:center;justify-content:center;font-size:14px;margin:2px 0;color:' + (ok ? '#fff' : 'rgba(255,255,255,.55)') + '">' +
          '<span style="color:' + (ok ? '#fde047' : 'rgba(255,255,255,.3)') + '">★</span>' + text + '</div>';
      };
      var html =
        '<div style="margin:-4px 0 10px">' + starRow(info.stars, 44) + '</div>' +
        row(true, L.goal === 'touch' ? 'The two balls met' : L.goal === 'zone' ? 'Reached the flag' : 'Ball in the basket') +
        row(gemsAll, 'Gems ' + world.gemsGot() + ' / ' + world.gems.length) +
        row(underPar, 'Ink ' + info.ink + ' (par ' + L.par + ')');
      var buttons = [];
      if (isDaily) buttons.push({ label: '▶ Levels', primary: true, onClick: showLevels });
      else if (!last) buttons.push({ label: 'Next level ▶', primary: true, onClick: function () { loadLevel(levelIdx + 1); } });
      else buttons.push({ label: '★ All levels', primary: true, onClick: showLevels });
      buttons.push({ label: '↻ Retry', onClick: restartLevel });
      if (!isDaily && !last) buttons.push({ label: 'Levels', onClick: showLevels });
      openOverlay({
        title: isDaily ? 'Daily Remix solved!' : last ? 'Every level solved!' : 'Level ' + (levelIdx + 1) + ' solved!',
        html: html,
        buttons: buttons,
      }, 420);
    }

    function pauseGame() {
      if (state !== 'draw' && state !== 'run') return;
      pausedFrom = state;
      state = 'paused';
      drawing = null;
      if (world) world.endGesture();
      openOverlay({
        title: 'Paused',
        text: L.text + (L.par ? ' · par ' + L.par + ' ink' : ''),
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: '↻ Restart level', onClick: restartLevel },
          { label: 'Levels', onClick: showLevels },
        ],
      });
    }
    function resumeGame() {
      if (state !== 'paused') return;
      closeOverlay();
      state = pausedFrom || 'draw';
      ctx.focus();
    }

    /* ---------- update ---------- */
    function update(dt) {
      if (introT > 0) introT -= dt;
      if (hintT > 0) hintT -= dt;
      if (banner.t > 0) banner.t -= dt;
      if (shakeT > 0) shakeT -= dt;
      for (var p = 0; p < MAXP; p++) {
        var q = parts[p];
        if (!q.on) continue;
        q.life -= dt;
        if (q.life <= 0) {
          q.on = false;
          continue;
        }
        q.vy += 900 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
      if (!world) return;
      world.gems.forEach(function (gm) { gm.t += dt; });
      if (state === 'run') {
        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 16) {
          world.step();
          acc -= STEP;
          n++;
          if (world.won || world.failed) break;
        }
        handleEvents();
        if (world.won) onWin();
        else if (world.failed) {
          state = 'fail';
          failTimer = 1.1;
          if (world.failed === 'spikes') {
            sfx('hit');
            shakeT = 0.3;
            toast('Popped on the spikes!', 1200);
          } else {
            sfx('lose');
            toast('Out of bounds!', 1200);
          }
        } else {
          // stall detection: nothing is moving and the goal isn't reached
          var moving = false;
          for (var i = 0; i < world.balls.length; i++) {
            var b = world.balls[i];
            if (!b.pinned && b.vx * b.vx + b.vy * b.vy > 30 * 30) moving = true;
          }
          stallT = moving ? 0 : stallT + dt;
          if (stallT > 1.6 && !stallWarned) {
            stallWarned = true;
            toast('Stuck? Reset (Space) and adjust your lines', 2200);
          }
        }
      } else if (state === 'fail') {
        handleEvents();
        failTimer -= dt;
        if (failTimer <= 0) {
          world.reset();
          state = 'draw';
        }
      } else if (state === 'won') {
        handleEvents();
        wonTimer -= dt;
        if (wonTimer <= 0 && !overlay) showWin();
      }
      updateHud();
    }

    function handleEvents() {
      var ev = world.events;
      for (var i = 0; i < ev.length; i++) {
        var e = ev[i];
        if (e[0] === 'gem') {
          spawn(e[1], e[2], '#67e8f9', 14, 380);
          sfx('coin');
        } else if (e[0] === 'pop') {
          spawn(e[1], e[2], BALL_COLORS[0], 22, 520);
        } else if (e[0] === 'portal') {
          sfx({ f: 300, f2: 900, d: 0.18, type: 'sine', v: 0.12 });
        } else {
          spawn(e[1], e[2], '#fde047', 26, 520);
          spawn(e[1], e[2], '#22c55e', 16, 420);
        }
      }
      ev.length = 0;
      for (var k = 0; k < world.balls.length; k++) {
        var b = world.balls[k];
        if (b.impact) {
          sfx({ f: 160 + Math.min(b.impact, 900) * 0.2, d: 0.05, type: 'triangle', v: Math.min(0.12, b.impact / 6000) });
          b.impact = 0;
        }
        if (b.kick) {
          sfx('boost');
          b.kick = 0;
        }
      }
    }

    /* ---------- render ---------- */
    function X(x) { return ox + x * sc; }
    function Y(y) { return oy + y * sc; }

    function buildStatic() {
      var key = W + 'x' + H + '@' + view.dpr + ':' + (L ? (isDaily ? 'd' : levelIdx) : 'none');
      if (key === staticKey) return;
      staticKey = key;
      var dpr = view.dpr;
      staticLayer.width = Math.max(1, Math.round(W * dpr));
      staticLayer.height = Math.max(1, Math.round(H * dpr));
      var s = staticLayer.getContext('2d');
      s.setTransform(dpr, 0, 0, dpr, 0, 0);
      // frame background
      s.fillStyle = packId === 'B' ? '#13241f' : '#2a2f3d';
      s.fillRect(0, 0, W, H);
      // board (paper / chalkboard)
      s.save();
      s.shadowColor = 'rgba(0,0,0,0.35)';
      s.shadowBlur = 18;
      s.shadowOffsetY = 6;
      s.fillStyle = theme.bg;
      roundRect(s, X(0), Y(0), WW * sc, WH * sc, 14 * sc);
      s.fill();
      s.restore();
      s.save();
      roundRect(s, X(0), Y(0), WW * sc, WH * sc, 14 * sc);
      s.clip();
      s.lineWidth = 1;
      for (var gx = 40; gx < WW; gx += 40) {
        s.strokeStyle = gx % 200 ? theme.grid : theme.grid2;
        s.beginPath();
        s.moveTo(Math.round(X(gx)) + 0.5, Y(0));
        s.lineTo(Math.round(X(gx)) + 0.5, Y(WH));
        s.stroke();
      }
      for (var gy = 40; gy < WH; gy += 40) {
        s.strokeStyle = gy % 200 ? theme.grid : theme.grid2;
        s.beginPath();
        s.moveTo(X(0), Math.round(Y(gy)) + 0.5);
        s.lineTo(X(WW), Math.round(Y(gy)) + 0.5);
        s.stroke();
      }
      if (packId === 'B') {
        // chalk dust smudges
        for (var k = 0; k < 14; k++) {
          var rx = ((k * 977) % 800), ry = ((k * 613) % 720);
          var gr = s.createRadialGradient(X(rx), Y(ry), 0, X(rx), Y(ry), 120 * sc);
          gr.addColorStop(0, 'rgba(255,255,255,0.035)');
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          s.fillStyle = gr;
          s.fillRect(X(rx - 120), Y(ry - 120), 240 * sc, 240 * sc);
        }
      } else {
        s.strokeStyle = theme.margin;
        s.lineWidth = 2;
        s.beginPath();
        s.moveTo(X(60), Y(0));
        s.lineTo(X(60), Y(WH));
        s.stroke();
      }
      if (L) drawLevelStatic(s, L);
      s.restore();
    }

    function roundRect(c, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    function drawLevelStatic(s, L) {
      // no-draw zones (hatched)
      (L.nodraw || []).forEach(function (r) {
        s.save();
        s.beginPath();
        s.rect(X(r[0]), Y(r[1]), r[2] * sc, r[3] * sc);
        s.fillStyle = packId === 'B' ? 'rgba(248,113,113,0.12)' : 'rgba(239,68,68,0.08)';
        s.fill();
        s.clip();
        s.strokeStyle = 'rgba(239,68,68,0.35)';
        s.lineWidth = Math.max(1, 3 * sc);
        s.beginPath();
        for (var d = -r[3]; d < r[2]; d += 22) {
          s.moveTo(X(r[0] + d), Y(r[1] + r[3]));
          s.lineTo(X(r[0] + d + r[3]), Y(r[1]));
        }
        s.stroke();
        s.restore();
        s.setLineDash([8 * sc, 6 * sc]);
        s.strokeStyle = 'rgba(239,68,68,0.6)';
        s.lineWidth = Math.max(1, 2 * sc);
        s.strokeRect(X(r[0]), Y(r[1]), r[2] * sc, r[3] * sc);
        s.setLineDash([]);
        // no-pen icon
        var cx = X(r[0] + r[2] / 2), cy = Y(r[1] + r[3] / 2), rr = Math.min(r[2], r[3], 60) * 0.3 * sc;
        s.strokeStyle = 'rgba(239,68,68,0.55)';
        s.lineWidth = Math.max(1.5, 4 * sc);
        s.beginPath();
        s.arc(cx, cy, rr, 0, Math.PI * 2);
        s.moveTo(cx - rr * 0.7, cy - rr * 0.7);
        s.lineTo(cx + rr * 0.7, cy + rr * 0.7);
        s.stroke();
      });
      // goal zone flag
      if (L.zone) {
        var z = L.zone;
        s.fillStyle = 'rgba(34,197,94,0.18)';
        s.strokeStyle = 'rgba(34,197,94,0.75)';
        s.lineWidth = Math.max(1, 2.5 * sc);
        s.setLineDash([10 * sc, 7 * sc]);
        roundRect(s, X(z[0]), Y(z[1]), z[2] * sc, z[3] * sc, 8 * sc);
        s.fill();
        s.stroke();
        s.setLineDash([]);
        var fx = X(z[0] + z[2] / 2), fy = Y(z[1] + z[3] / 2);
        s.strokeStyle = theme.text;
        s.lineWidth = Math.max(1.5, 3 * sc);
        s.beginPath();
        s.moveTo(fx - 10 * sc, fy + 20 * sc);
        s.lineTo(fx - 10 * sc, fy - 22 * sc);
        s.stroke();
        s.fillStyle = '#22c55e';
        s.beginPath();
        s.moveTo(fx - 9 * sc, fy - 22 * sc);
        s.lineTo(fx + 18 * sc, fy - 13 * sc);
        s.lineTo(fx - 9 * sc, fy - 4 * sc);
        s.closePath();
        s.fill();
      }
      // fans (base plate; animated streaks drawn per frame)
      (L.fans || []).forEach(function (f) {
        s.fillStyle = 'rgba(56,189,248,0.10)';
        s.fillRect(X(f[0]), Y(f[1]), f[2] * sc, f[3] * sc);
      });
      // boxes
      (L.boxes || []).forEach(function (b) {
        s.fillStyle = theme.box;
        roundRect(s, X(b[0]), Y(b[1]), b[2] * sc, b[3] * sc, 6 * sc);
        s.fill();
        s.fillStyle = 'rgba(255,255,255,0.12)';
        roundRect(s, X(b[0]), Y(b[1]), b[2] * sc, Math.min(b[3], 8) * sc, 6 * sc);
        s.fill();
      });
      // walls & pegs
      s.lineCap = 'round';
      (L.walls || []).forEach(function (w) {
        s.strokeStyle = theme.wall;
        s.lineWidth = (w[4] || WALL_R) * 2 * sc;
        s.beginPath();
        s.moveTo(X(w[0]), Y(w[1]));
        s.lineTo(X(w[2]), Y(w[3]));
        s.stroke();
        s.strokeStyle = theme.wallHi;
        s.lineWidth = Math.max(1, (w[4] || WALL_R) * 0.5 * sc);
        s.beginPath();
        s.moveTo(X(w[0]), Y(w[1]) - (w[4] || WALL_R) * 0.35 * sc);
        s.lineTo(X(w[2]), Y(w[3]) - (w[4] || WALL_R) * 0.35 * sc);
        s.stroke();
      });
      (L.pegs || []).forEach(function (p) {
        s.fillStyle = theme.wall;
        s.beginPath();
        s.arc(X(p[0]), Y(p[1]), (p[2] || 12) * sc, 0, Math.PI * 2);
        s.fill();
        s.fillStyle = theme.wallHi;
        s.beginPath();
        s.arc(X(p[0] - 3), Y(p[1] - 3), (p[2] || 12) * 0.35 * sc, 0, Math.PI * 2);
        s.fill();
      });
      // spikes: a base bar with triangles on both faces
      (L.spikes || []).forEach(function (sp) {
        var dx = sp[2] - sp[0], dy = sp[3] - sp[1];
        var len = Math.hypot(dx, dy) || 1;
        var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        var n = Math.max(1, Math.round(len / 16));
        s.fillStyle = '#9ca3af';
        s.strokeStyle = '#4b5563';
        s.lineWidth = Math.max(1, 1.5 * sc);
        for (var side = -1; side <= 1; side += 2) {
          s.beginPath();
          for (var i = 0; i < n; i++) {
            var t0 = (i / n) * len, t1 = ((i + 1) / n) * len, tm = (t0 + t1) / 2;
            s.moveTo(X(sp[0] + ux * t0), Y(sp[1] + uy * t0));
            s.lineTo(X(sp[0] + ux * tm + nx * 16 * side), Y(sp[1] + uy * tm + ny * 16 * side));
            s.lineTo(X(sp[0] + ux * t1), Y(sp[1] + uy * t1));
          }
          s.fill();
          s.stroke();
        }
        s.strokeStyle = '#dc2626';
        s.lineWidth = 7 * sc;
        s.beginPath();
        s.moveTo(X(sp[0]), Y(sp[1]));
        s.lineTo(X(sp[2]), Y(sp[3]));
        s.stroke();
      });
      // bouncers: striped spring pads
      (L.bouncers || []).forEach(function (b) {
        s.strokeStyle = '#111827';
        s.lineWidth = 18 * sc;
        s.beginPath();
        s.moveTo(X(b[0]), Y(b[1]));
        s.lineTo(X(b[2]), Y(b[3]));
        s.stroke();
        s.strokeStyle = '#facc15';
        s.lineWidth = 12 * sc;
        s.setLineDash([10 * sc, 8 * sc]);
        s.beginPath();
        s.moveTo(X(b[0]), Y(b[1]));
        s.lineTo(X(b[2]), Y(b[3]));
        s.stroke();
        s.setLineDash([]);
      });
      // basket
      if (L.cup) drawCup(s, L.cup, false);
    }

    function drawCup(s, c, glow) {
      var hw = c[2] / 2 + 7;
      var x0 = X(c[0] - hw), x1 = X(c[0] + hw), yb = Y(c[1]), yt = Y(c[1] - c[3]);
      s.fillStyle = glow ? 'rgba(34,197,94,0.25)' : 'rgba(249,115,22,0.12)';
      s.fillRect(x0, yt, x1 - x0, yb - yt);
      // mesh
      s.strokeStyle = 'rgba(234,88,12,0.35)';
      s.lineWidth = Math.max(1, 1.5 * sc);
      s.beginPath();
      for (var x = c[0] - hw + 14; x < c[0] + hw; x += 14) {
        s.moveTo(X(x), yt);
        s.lineTo(X(x), yb);
      }
      for (var y = c[1] - c[3] + 14; y < c[1]; y += 14) {
        s.moveTo(x0, Y(y));
        s.lineTo(x1, Y(y));
      }
      s.stroke();
      s.strokeStyle = '#ea580c';
      s.lineCap = 'round';
      s.lineJoin = 'round';
      s.lineWidth = 14 * sc;
      s.beginPath();
      s.moveTo(x0, yt);
      s.lineTo(x0, yb);
      s.lineTo(x1, yb);
      s.lineTo(x1, yt);
      s.stroke();
      s.strokeStyle = '#fdba74';
      s.lineWidth = 4 * sc;
      s.beginPath();
      s.moveTo(x0 - 1 * sc, yt);
      s.lineTo(x0 - 1 * sc, yb - 4 * sc);
      s.stroke();
    }

    function strokePath(c, pts) {
      c.beginPath();
      c.moveTo(X(pts[0]), Y(pts[1]));
      if (pts.length === 2) c.lineTo(X(pts[0]) + 0.01, Y(pts[1]));
      for (var i = 2; i < pts.length; i += 2) c.lineTo(X(pts[i]), Y(pts[i + 1]));
    }

    function drawBall(b, idx, t) {
      var x = X(b.x), y = Y(b.y), r = b.r * sc;
      var col = L.goal === 'touch' ? TOUCH_COLORS[idx] || BALL_COLORS[idx] : BALL_COLORS[idx % BALL_COLORS.length];
      g.save();
      g.translate(x, y);
      // shadow
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath();
      g.ellipse(r * 0.15, r * 0.9, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
      g.fill();
      var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.3, col);
      gr.addColorStop(1, shadeHex(col, -0.22));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      // rolling stripe
      g.save();
      g.rotate(b.rot);
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = Math.max(1, r * 0.16);
      g.beginPath();
      g.arc(0, 0, r * 0.68, -0.5, 0.5);
      g.stroke();
      g.restore();
      // eyes look toward the motion (or toward the partner ball)
      var lx = b.vx, ly = b.vy;
      if (L.goal === 'touch') {
        var o = world.balls[1 - idx];
        if (o) {
          lx = o.x - b.x;
          ly = o.y - b.y;
        }
      }
      var ll = Math.hypot(lx, ly) || 1;
      lx /= ll;
      ly /= ll;
      var blink = (Math.floor(t * 0.7 + idx * 0.37) % 5 === 0 && (t * 0.7 + idx * 0.37) % 1 < 0.08) ? 0.15 : 1;
      for (var e = -1; e <= 1; e += 2) {
        var ex = e * r * 0.32, ey = -r * 0.12;
        g.fillStyle = '#fff';
        g.beginPath();
        g.ellipse(ex, ey, r * 0.22, r * 0.26 * blink, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#111827';
        g.beginPath();
        g.arc(ex + lx * r * 0.09, ey + ly * r * 0.1, r * 0.11 * Math.max(blink, 0.5), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }

    function shadeHex(hex, f) {
      var n = parseInt(hex.slice(1), 16);
      var r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
      r = Math.round(r * (1 + f));
      gg = Math.round(gg * (1 + f));
      b = Math.round(b * (1 + f));
      return 'rgb(' + r + ',' + gg + ',' + b + ')';
    }

    // Debug contact sheet (?debug=1&sheet=0): level previews with solution + simulated path.
    var sheetFrom = ctx.debug && ctx.params.get('sheet') != null ? +ctx.params.get('sheet') : -1;
    var sheetCache = null;
    function renderSheet() {
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.fillStyle = '#111';
      g.fillRect(0, 0, W, H);
      var cols = 3, rows = 2;
      var cw = W / cols, ch = H / rows;
      if (!sheetCache) {
        sheetCache = [];
        for (var i = 0; i < cols * rows; i++) {
          var lv = ctx.params.get('mirror') ? PACK[sheetFrom + i] && mirrorLevel(PACK[sheetFrom + i]) : PACK[sheetFrom + i];
          if (!lv) break;
          var w = new World(lv);
          (lv.sol || []).forEach(function (s2, k) { w.addPolyline(s2, k + 1); });
          var paths = w.balls.map(function () { return []; });
          for (var st = 0; st < 25 * 240 && !w.won && !w.failed; st++) {
            w.step();
            if (st % 6 === 0) w.balls.forEach(function (b, bi) { paths[bi].push(b.x, b.y); });
          }
          sheetCache.push({ L: lv, w: w, paths: paths, res: w.won ? 'WIN ' + w.time.toFixed(1) + 's' : w.failed ? 'FAIL ' + w.failed : 'TIMEOUT', gems: w.gemsGot() + '/' + w.gems.length, ink: Math.round(w.inkUsed) });
        }
      }
      sheetCache.forEach(function (c, i) {
        var cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
        L = c.L;
        sc = Math.min((cw - 10) / WW, (ch - 24) / WH);
        ox = cx + 5;
        oy = cy + 20;
        g.fillStyle = theme.bg;
        g.fillRect(X(0), Y(0), WW * sc, WH * sc);
        drawLevelStatic(g, c.L);
        g.lineCap = 'round';
        c.w.strokes.forEach(function (st) {
          g.strokeStyle = theme.ink;
          g.lineWidth = LINE_R * 2 * sc;
          strokePath(g, st.pts);
          g.stroke();
        });
        (c.L.gems || []).forEach(function (gm) {
          g.fillStyle = '#06b6d4';
          g.beginPath();
          g.arc(X(gm[0]), Y(gm[1]), 10 * sc, 0, 7);
          g.fill();
        });
        c.paths.forEach(function (pth, bi) {
          g.strokeStyle = bi ? 'rgba(236,72,153,0.8)' : 'rgba(249,115,22,0.9)';
          g.lineWidth = 1.5;
          g.setLineDash([3, 3]);
          if (pth.length) {
            strokePath(g, pth);
            g.stroke();
          }
          g.setLineDash([]);
        });
        (c.L.balls || []).forEach(function (b, bi) {
          g.fillStyle = bi ? '#ec4899' : '#f97316';
          g.beginPath();
          g.arc(X(b[0]), Y(b[1]), (b[2] || BALL_R) * sc, 0, 7);
          g.fill();
        });
        g.fillStyle = c.res.indexOf('WIN') === 0 && c.gems.split('/')[0] === c.gems.split('/')[1] && c.ink <= c.L.par ? '#86efac' : '#fca5a5';
        g.font = '700 12px system-ui';
        g.textAlign = 'left';
        g.fillText((sheetFrom + i + 1) + '. ' + c.L.name + ' — ' + c.res + ' gems ' + c.gems + ' ink ' + c.ink + '/' + c.L.ink + ' par ' + c.L.par, cx + 6, cy + 14);
      });
      L = null;
    }

    function render(t) {
      if (sheetFrom >= 0) return renderSheet();
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      buildStatic();
      g.drawImage(staticLayer, 0, 0, W, H);
      if (!L || !world) return;
      g.save();
      if (shakeT > 0) g.translate((Math.random() - 0.5) * 8 * shakeT, (Math.random() - 0.5) * 8 * shakeT);
      g.save();
      roundRect(g, X(0), Y(0), WW * sc, WH * sc, 14 * sc);
      g.clip();

      // fans: animated wind streaks
      (L.fans || []).forEach(function (f, fi) {
        var dirx = f[4], diry = f[5], m = Math.hypot(dirx, diry) || 1;
        dirx /= m;
        diry /= m;
        g.strokeStyle = 'rgba(56,189,248,0.55)';
        g.lineWidth = Math.max(1, 2.5 * sc);
        g.beginPath();
        for (var k = 0; k < 7; k++) {
          var ph = ((t * 0.9 + k * 0.37 + fi * 0.2) % 1);
          var px = f[0] + ((k * 0.618 * f[2] + 13) % f[2]);
          var py = f[1] + ((k * 0.382 * f[3] + 17) % f[3]);
          if (diry) py = diry < 0 ? f[1] + f[3] * (1 - ph) : f[1] + f[3] * ph;
          if (dirx) px = dirx < 0 ? f[0] + f[2] * (1 - ph) : f[0] + f[2] * ph;
          g.moveTo(X(px), Y(py));
          g.lineTo(X(px - dirx * 26), Y(py - diry * 26));
        }
        g.stroke();
      });

      // portals
      (L.portals || []).forEach(function (p) {
        for (var e = 0; e < 2; e++) {
          var px = X(p[e * 2]), py = Y(p[e * 2 + 1]);
          var colr = e ? '#f97316' : '#8b5cf6';
          for (var ring = 0; ring < 3; ring++) {
            g.strokeStyle = colr;
            g.globalAlpha = 0.85 - ring * 0.25;
            g.lineWidth = Math.max(1.5, 4 * sc);
            g.beginPath();
            g.arc(px, py, (26 - ring * 7) * sc, t * (3 + ring) + ring, t * (3 + ring) + ring + Math.PI * 1.4);
            g.stroke();
          }
          g.globalAlpha = 1;
        }
      });

      // gems
      world.gems.forEach(function (gm) {
        if (gm.got) return;
        var gx = X(gm.x), gy = Y(gm.y + Math.sin(gm.t * 3) * 3), s = 13 * sc;
        var sx = Math.abs(Math.cos(gm.t * 1.6)) * 0.6 + 0.4;
        g.save();
        g.translate(gx, gy);
        g.scale(sx, 1);
        g.fillStyle = '#22d3ee';
        g.beginPath();
        g.moveTo(0, -s);
        g.lineTo(s * 0.8, -s * 0.2);
        g.lineTo(0, s);
        g.lineTo(-s * 0.8, -s * 0.2);
        g.closePath();
        g.fill();
        g.fillStyle = '#a5f3fc';
        g.beginPath();
        g.moveTo(0, -s);
        g.lineTo(s * 0.8, -s * 0.2);
        g.lineTo(0, -s * 0.05);
        g.lineTo(-s * 0.8, -s * 0.2);
        g.closePath();
        g.fill();
        g.strokeStyle = '#0e7490';
        g.lineWidth = Math.max(1, 1.5 * sc);
        g.beginPath();
        g.moveTo(0, -s);
        g.lineTo(s * 0.8, -s * 0.2);
        g.lineTo(0, s);
        g.lineTo(-s * 0.8, -s * 0.2);
        g.closePath();
        g.stroke();
        g.restore();
      });

      // cup glow when a ball is inside
      if (L.cup && world.balls.some(function (b) { return b.inCup > 0; })) drawCup(g, L.cup, true);

      // hint (solution as a dotted guide)
      if (hintT > 0 && L.sol) {
        g.save();
        g.globalAlpha = Math.min(1, hintT);
        g.strokeStyle = theme.hint;
        g.lineWidth = LINE_R * 2 * sc;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.setLineDash([2, 16 * sc]);
        g.lineDashOffset = -t * 30;
        L.sol.forEach(function (s) {
          strokePath(g, s);
          g.stroke();
        });
        g.setLineDash([]);
        g.restore();
      }

      // drawn lines
      g.lineCap = 'round';
      g.lineJoin = 'round';
      world.strokes.forEach(function (st) {
        g.strokeStyle = theme.inkShadow;
        g.lineWidth = LINE_R * 2 * sc + 3;
        g.save();
        g.translate(1.5, 2);
        strokePath(g, st.pts);
        g.stroke();
        g.restore();
        g.strokeStyle = theme.ink;
        g.lineWidth = LINE_R * 2 * sc;
        strokePath(g, st.pts);
        g.stroke();
      });

      // ghost balls at the start positions while running
      if (state === 'run' || state === 'fail' || state === 'won') {
        world.balls.forEach(function (b) {
          if (b.pinned) return;
          g.strokeStyle = theme.ghost;
          g.lineWidth = Math.max(1, 2 * sc);
          g.setLineDash([5 * sc, 5 * sc]);
          g.beginPath();
          g.arc(X(b.sx), Y(b.sy), b.r * sc, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
        });
      }
      // balls
      world.balls.forEach(function (b, i) {
        if (b.dead) return;
        if (b.pinned) {
          // pin
          g.strokeStyle = theme.wall;
          g.lineWidth = Math.max(1, 3 * sc);
          g.beginPath();
          g.moveTo(X(b.x), Y(b.y - b.r - 22));
          g.lineTo(X(b.x), Y(b.y - b.r + 4));
          g.stroke();
          g.fillStyle = '#ef4444';
          g.beginPath();
          g.arc(X(b.x), Y(b.y - b.r - 24), 5 * sc, 0, Math.PI * 2);
          g.fill();
        }
        drawBall(b, i, t);
      });

      // particles
      for (var p = 0; p < MAXP; p++) {
        var q = parts[p];
        if (!q.on) continue;
        g.globalAlpha = Math.min(1, (q.life / q.max) * 1.6);
        g.fillStyle = q.color;
        g.beginPath();
        g.arc(X(q.x), Y(q.y), q.size * sc, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      // level intro / objective card inside the board
      if (introT > 0 && state === 'draw') {
        var a = Math.min(1, introT * 2, (2.6 - introT) * 4);
        g.globalAlpha = Math.max(0, a);
        var fs = Math.max(15, Math.min(30, 34 * sc));
        g.font = '900 ' + fs + 'px system-ui,sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        var tw = g.measureText(L.text).width + 36;
        var cyy = Y(WH * 0.5);
        g.fillStyle = 'rgba(15,23,42,0.82)';
        roundRect(g, X(WW / 2) - tw / 2, cyy - fs * 1.15, tw, fs * 2.3, 14);
        g.fill();
        g.fillStyle = '#fff';
        g.fillText(L.text, X(WW / 2), cyy - fs * 0.15);
        g.font = '700 ' + Math.round(fs * 0.5) + 'px system-ui,sans-serif';
        g.fillStyle = '#c4c8ea';
        g.fillText((isDaily ? 'Daily Remix' : 'Level ' + (levelIdx + 1) + ' · ' + L.name) + ' · draw, then press Play', X(WW / 2), cyy + fs * 0.62);
        g.globalAlpha = 1;
      }
      g.restore(); // clip

      // ink bar along the top edge of the board
      var bw = WW * sc, bxx = X(0), byy = Y(0) - 11;
      var frac = world.inkLeft() / L.ink;
      roundRect(g, bxx, byy, bw, 7, 3.5);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fill();
      if (frac > 0) {
        roundRect(g, bxx, byy, Math.max(7, bw * frac), 7, 3.5);
        g.fillStyle = frac < 0.15 ? '#f87171' : world.inkUsed <= L.par ? '#a78bfa' : '#60a5fa';
        g.fill();
      }
      // par marker: ink remaining when exactly `par` has been used
      var mx = bxx + bw * (1 - L.par / L.ink);
      g.fillStyle = world.inkUsed <= L.par ? '#fde047' : 'rgba(255,255,255,0.45)';
      g.beginPath();
      g.moveTo(mx, byy - 1);
      g.lineTo(mx - 5, byy - 8);
      g.lineTo(mx + 5, byy - 8);
      g.closePath();
      g.fill();
      g.restore();

      // banner
      if (banner.t > 0) {
        var k2 = banner.t;
        var size = Math.max(28, Math.min(64, Math.min(W, H) * 0.11));
        g.save();
        g.globalAlpha = Math.min(1, k2 * 3);
        g.translate(W / 2, Y(WH * 0.38));
        var scl = 1 + Math.max(0, k2 - 1.2) * 2;
        g.scale(scl, scl);
        g.font = '900 ' + size + 'px system-ui,sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = size * 0.16;
        g.strokeStyle = 'rgba(15,23,42,0.85)';
        g.strokeText(banner.text, 0, 0);
        g.fillStyle = banner.color;
        g.fillText(banner.text, 0, 0);
        g.restore();
      }
    }

    /* ---------- input ---------- */
    function toWorld(e) {
      var r = view.canvas.getBoundingClientRect();
      return [(e.clientX - r.left - ox) / sc, (e.clientY - r.top - oy) / sc];
    }
    function onPointerDown(e) {
      if (e.button != null && e.button > 0) return;
      if (!world || (state !== 'draw' && state !== 'run')) return;
      if (drawing) return; // one finger draws at a time
      var p = toWorld(e);
      if (p[0] < 0 || p[1] < 0 || p[0] > WW || p[1] > WH) return;
      drawing = { id: e.pointerId };
      gesture++;
      world.beginGesture(gesture, state === 'run');
      var inkBefore = world.inkUsed;
      world.gesturePoint(p[0], p[1]);
      if (world.inkUsed === inkBefore) {
        if (world.inkLeft() <= 0) toast('Out of ink — undo a line (Z)', 1400);
        else if (!world.canDraw(p[0], p[1], state === 'run')) toast("Can't draw here", 900);
      }
      introT = Math.min(introT, 0.25);
      try { view.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onPointerMove(e) {
      if (!drawing || drawing.id !== e.pointerId) return;
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (list && list.length) {
        for (var i = 0; i < list.length; i++) {
          var p = toWorld(list[i]);
          world.gesturePoint(p[0], p[1]);
        }
      } else {
        var q = toWorld(e);
        world.gesturePoint(q[0], q[1]);
      }
      if (world.inkLeft() <= 0 && !drawing.warned) {
        drawing.warned = true;
        sfx('error');
        toast('Out of ink', 900);
      }
    }
    function onPointerUp(e) {
      if (!drawing || drawing.id !== e.pointerId) return;
      drawing = null;
      if (world) {
        world.endGesture();
        if (world.strokes.length && world.strokes[world.strokes.length - 1].gesture === gesture) sfx('tick');
      }
    }
    view.canvas.addEventListener('pointerdown', onPointerDown);
    view.canvas.addEventListener('pointermove', onPointerMove);
    view.canvas.addEventListener('pointerup', onPointerUp);
    view.canvas.addEventListener('pointercancel', onPointerUp);

    function btn(fn) {
      return function (e) {
        e.stopPropagation();
        fn();
      };
    }
    var hUndo = btn(undo), hClear = btn(clearLines), hPlay = btn(togglePlay), hHint = btn(showHint), hMenu = btn(function () {
      if (state === 'draw' || state === 'run') pauseGame();
      else showLevels();
    }), hPause = btn(pauseGame);
    undoBtn.addEventListener('click', hUndo);
    clearBtn.addEventListener('click', hClear);
    playBtn.addEventListener('click', hPlay);
    hintBtn.addEventListener('click', hHint);
    menuBtn.addEventListener('click', hMenu);
    pauseBtn.addEventListener('click', hPause);

    ctx.captureKeys(['KeyZ', 'KeyR', 'KeyH', 'KeyP', 'KeyC', 'Enter']);
    ctx.onKey(function (code, down, e) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          // The shell blocks the browser default for Space/Enter, so click the focused button ourselves.
          var ae = document.activeElement;
          var target = ae && ae.tagName === 'BUTTON' && overlay.el.contains(ae) ? ae : overlay.panel.querySelector('.ig-actions .ig-btn');
          if (target) target.click();
        } else if ((code === 'Escape' || code === 'KeyP') && state === 'paused') resumeGame();
        return;
      }
      if (!world) return;
      if (code === 'Space' || code === 'Enter') togglePlay();
      else if (code === 'KeyZ') undo();
      else if (code === 'KeyR') restartLevel();
      else if (code === 'KeyH') showHint();
      else if (code === 'KeyC') clearLines();
      else if (code === 'KeyP' || code === 'Escape') pauseGame();
    });

    /* ---------- boot ---------- */
    var loop = IG.loop(function (dt, t) {
      if (state !== 'paused') update(dt);
      render(t);
    });
    booted = true;
    layout();
    if (sheetFrom >= 0) {
      hudEl.style.display = 'none';
      root.removeChild(toolbar);
    } else showMenu();
    loop.start();

    if (ctx.debug) {
      window.__lineLogic = {
        info: function () {
          return { state: state, level: levelIdx, daily: isDaily, ink: world && Math.round(world.inkUsed), inkMax: L && L.ink, par: L && L.par, strokes: world && world.strokes.length, gems: world && world.gemsGot(), won: world && world.won };
        },
        load: function (i, daily) { loadLevel(i, daily); },
        // draw the built-in solution as if the player had drawn it
        solve: function () {
          if (!world || !L.sol) return false;
          world.clearStrokes();
          L.sol.forEach(function (s) { world.addPolyline(s, ++gesture); });
          return true;
        },
        unlockAll: function () { for (var i = 0; i < PACK.length; i++) saved.stars[i] = saved.stars[i] || 1; save(); },
        verifyAll: function () {
          return PACK.map(function (lv, i) { var r = verifyLevel(lv); r.i = i + 1; return r; });
        },
      };
    }

    return {
      pause: function () {
        if (state === 'draw' || state === 'run') pauseGame();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        closeOverlay();
        view.canvas.removeEventListener('pointerdown', onPointerDown);
        view.canvas.removeEventListener('pointermove', onPointerMove);
        view.canvas.removeEventListener('pointerup', onPointerUp);
        view.canvas.removeEventListener('pointercancel', onPointerUp);
        undoBtn.removeEventListener('click', hUndo);
        clearBtn.removeEventListener('click', hClear);
        playBtn.removeEventListener('click', hPlay);
        hintBtn.removeEventListener('click', hHint);
        menuBtn.removeEventListener('click', hMenu);
        pauseBtn.removeEventListener('click', hPause);
        view.destroy();
        if (ctx.debug) delete window.__lineLogic;
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Level packs                                                         */
  /* World is 800 × 720, y down. Each level:                             */
  /*   name, text, goal ('cup' | 'touch' | 'zone'), ink, par,           */
  /*   balls [[x, y, r?, pinned?]], walls [[x1,y1,x2,y2,r?]],            */
  /*   boxes [[x,y,w,h]], pegs [[x,y,r]], spikes [[x1,y1,x2,y2]],        */
  /*   bouncers [[x1,y1,x2,y2]], fans [[x,y,w,h,ax,ay]],                */
  /*   portals [[x1,y1,x2,y2]], nodraw [[x,y,w,h]], gems [[x,y]],        */
  /*   cup [centreX, bottomY, innerWidth, height], zone [x,y,w,h],       */
  /*   sol [[x1,y1,x2,y2,...], …] — a verified solution (also the hint). */
  /* ------------------------------------------------------------------ */
  PACKS.A = [
    { name: 'First Line', text: 'Get the ball into the basket', goal: 'cup', ink: 900, par: 560,
      balls: [[170, 110]], cup: [700, 690, 130, 100], gems: [[300, 280]],
      sol: [[100, 200, 480, 420]] },
    { name: 'Catch', text: 'Catch the ball and send it left', goal: 'cup', ink: 900, par: 620,
      balls: [[560, 90]], cup: [140, 680, 110, 90], gems: [[400, 400]],
      sol: [[640, 250, 230, 520]] },
    { name: 'Mind the Gap', text: 'Bridge the gap', goal: 'cup', ink: 500, par: 290,
      balls: [[80, 140]], walls: [[30, 190, 280, 300], [470, 430, 640, 515], [775, 360, 775, 640]], cup: [700, 640, 100, 120], gems: [[380, 335]],
      sol: [[285, 312, 470, 428]] },
    { name: 'Over the Wall', text: 'Get over the wall', goal: 'cup', ink: 800, par: 560,
      balls: [[90, 90]], walls: [[400, 360, 400, 720, 12]], cup: [730, 700, 110, 110], gems: [[400, 250]],
      sol: [[50, 180, 470, 300]] },
    { name: 'No Pen Zone', text: 'You can\'t draw in the red zone', goal: 'cup', ink: 600, par: 280,
      balls: [[120, 90]], nodraw: [[250, 300, 300, 160]], cup: [520, 700, 110, 110], gems: [[330, 320]],
      sol: [[60, 180, 240, 290]] },
    { name: 'Narrow Cup', text: 'Drop it into the narrow cup', goal: 'cup', ink: 800, par: 530,
      balls: [[400, 90]], cup: [520, 680, 70, 120], gems: [[545, 430]],
      sol: [[330, 300, 510, 450], [580, 360, 562, 530]] },
    { name: 'Hello Friend', text: 'Make the two balls meet', goal: 'touch', ink: 1200, par: 850,
      balls: [[200, 150], [600, 150]], gems: [[300, 395]],
      sol: [[140, 300, 400, 520, 660, 300]] },
    { name: 'Backstop', text: 'Too fast! Stop it over the basket', goal: 'cup', ink: 400, par: 240,
      balls: [[90, 80]], walls: [[40, 150, 420, 420]], cup: [500, 700, 110, 100], gems: [[515, 500]],
      sol: [[600, 420, 565, 600]] },
    { name: 'Spike Floor', text: 'Keep the ball off the spikes', goal: 'cup', ink: 900, par: 600,
      balls: [[150, 90]], spikes: [[0, 705, 580, 705]], walls: [[735, 280, 735, 520, 10]], boxes: [[585, 527, 130, 193]], cup: [650, 520, 120, 90], gems: [[440, 320]],
      sol: [[90, 200, 520, 400]] },
    { name: 'Switchback', text: 'Turn the ball around', goal: 'cup', ink: 400, par: 220,
      balls: [[120, 80]], walls: [[60, 180, 520, 280], [560, 400, 300, 470]], spikes: [[560, 705, 800, 705]], cup: [150, 700, 120, 100], gems: [[575, 300]],
      sol: [[640, 240, 545, 378]] },
    { name: 'Spring', text: 'Ride the spring pad', goal: 'cup', ink: 600, par: 340,
      balls: [[140, 100]], bouncers: [[80, 600, 240, 640]], cup: [590, 700, 110, 100], gems: [[472, 250]],
      sol: [[700, 300, 640, 560]] },
    { name: 'Flag Run', text: 'Reach the green flag', goal: 'zone', ink: 800, par: 570,
      balls: [[100, 80]], zone: [680, 420, 110, 110], spikes: [[300, 705, 800, 705], [792, 560, 792, 700]], gems: [[396, 262]],
      sol: [[60, 170, 480, 330]] },
    { name: 'Gem Detour', text: 'Collect both gems on the way', goal: 'cup', ink: 1100, par: 800,
      balls: [[100, 90]], cup: [700, 700, 110, 110], gems: [[250, 400], [470, 495]],
      sol: [[60, 180, 300, 460, 560, 520]] },
    { name: 'Pinned Pal', text: 'Roll into the pinned ball', goal: 'touch', ink: 900, par: 650,
      balls: [[120, 90], [640, 300, 20, 1]], walls: [[400, 260, 400, 520]], gems: [[407, 215]],
      sol: [[60, 180, 560, 300]] },
    { name: 'Short Fuse', text: 'Tiny ink — think small', goal: 'cup', ink: 150, par: 80,
      balls: [[400, 80]], bouncers: [[330, 640, 470, 640]], cup: [680, 700, 110, 100], gems: [[600, 505]],
      sol: [[385, 400, 425, 430]] },
    { name: 'Peg Garden', text: 'Collect the ball below the pegs', goal: 'cup', ink: 900, par: 610,
      balls: [[412, 80]], pegs: [[250, 260, 14], [350, 260, 14], [450, 260, 14], [550, 260, 14], [300, 340, 14], [400, 340, 14], [500, 340, 14], [250, 420, 14], [350, 420, 14], [450, 420, 14], [550, 420, 14]], cup: [130, 700, 110, 100], gems: [[300, 530]],
      sol: [[700, 470, 230, 590]] },
    { name: 'Crosswind', text: 'Shield the ball from the wind', goal: 'cup', ink: 400, par: 230,
      balls: [[300, 80]], fans: [[0, 300, 800, 150, 2500, 0]], cup: [300, 700, 110, 100], gems: [[330, 400]],
      sol: [[335, 290, 335, 470]] },
    { name: 'Double Drop', text: 'Get both balls in the basket', goal: 'cup', need: 2, ink: 1000, par: 730,
      balls: [[100, 80], [190, 30]], walls: [[790, 380, 790, 720, 10]], cup: [700, 700, 150, 120], gems: [[400, 330]],
      sol: [[60, 170, 560, 470]] },
    { name: 'Spike Tunnel', text: 'Thread the spiked tunnel', goal: 'cup', ink: 700, par: 530,
      balls: [[100, 80]], walls: [[40, 200, 200, 380], [790, 250, 790, 720, 10]], spikes: [[220, 300, 600, 300], [220, 470, 600, 470]], cup: [700, 700, 120, 100], gems: [[400, 370]],
      sol: [[205, 390, 620, 430]] },
    { name: 'Portal', text: 'Use the portal', goal: 'cup', ink: 800, par: 540,
      balls: [[120, 80]], walls: [[450, 120, 450, 720, 12], [790, 300, 790, 720, 10]], portals: [[250, 420, 560, 150]], cup: [700, 700, 120, 100], gems: [[610, 200]],
      sol: [[60, 200, 330, 530]] },
    { name: 'Updraft', text: 'Ride the air up to the basket', goal: 'cup', ink: 500, par: 250,
      balls: [[90, 420]], walls: [[40, 470, 330, 640], [505, 330, 505, 720, 8]], fans: [[340, 200, 160, 520, 0, -3000]], boxes: [[620, 420, 180, 300]], cup: [690, 420, 110, 90], gems: [[470, 300]],
      sol: [[350, 330, 525, 250]] },
    { name: 'Meet in the Middle', text: 'Make them meet over the red zone', goal: 'touch', ink: 1000, par: 720,
      balls: [[100, 80], [700, 80]], nodraw: [[300, 200, 200, 520]], gems: [[325, 330]],
      sol: [[60, 170, 290, 330], [740, 170, 510, 330]] },
    { name: 'Window', text: 'Draw only where it\'s allowed', goal: 'cup', ink: 800, par: 610,
      balls: [[120, 80]], walls: [[790, 440, 790, 720, 10]], nodraw: [[0, 140, 800, 220], [0, 440, 800, 280]], cup: [720, 700, 110, 100], gems: [[520, 370]],
      sol: [[90, 108, 300, 132], [330, 385, 600, 410]] },
    { name: 'Ski Jump', text: 'Jump the spike pit', goal: 'cup', ink: 600, par: 440,
      balls: [[100, 80]], boxes: [[0, 420, 300, 300], [500, 540, 300, 180]], spikes: [[302, 705, 498, 705]], cup: [650, 540, 120, 80], gems: [[426, 340]],
      sol: [[60, 170, 170, 330, 230, 385, 270, 395, 300, 385]] },
    { name: 'Bank Shot', text: 'Bounce it off the spring wall', goal: 'cup', ink: 800, par: 610,
      balls: [[150, 80]], bouncers: [[780, 200, 780, 520, 700]], nodraw: [[220, 380, 560, 340]], cup: [630, 700, 130, 100], gems: [[700, 430]],
      sol: [[100, 170, 560, 330]] },
    { name: 'Detour', text: 'Go over the spike line', goal: 'cup', ink: 900, par: 710,
      balls: [[100, 80]], walls: [[790, 300, 790, 720, 10]], spikes: [[250, 250, 550, 550]], cup: [720, 700, 120, 100], gems: [[400, 175]],
      sol: [[60, 160, 620, 250]] },
    { name: 'Gem Trail', text: 'Grab all three gems, then the flag', goal: 'zone', ink: 1000, par: 820,
      balls: [[700, 80]], zone: [20, 600, 110, 110], gems: [[560, 260], [330, 450], [200, 515]],
      sol: [[750, 160, 470, 360, 470, 380], [440, 500, 160, 560]] },
    { name: 'Needle', text: 'Thread the needle', goal: 'cup', ink: 500, par: 360,
      balls: [[150, 80]], spikes: [[0, 705, 495, 705], [565, 705, 800, 705]], nodraw: [[460, 380, 140, 180]], cup: [530, 700, 56, 140], gems: [[452, 400]],
      sol: [[100, 170, 330, 330]] },
    { name: 'Reunion', text: 'Reach your friend in the red zone', goal: 'touch', ink: 700, par: 490,
      balls: [[100, 80], [400, 640, 20, 1]], spikes: [[0, 705, 800, 705]], nodraw: [[290, 520, 220, 200]], gems: [[280, 410]],
      sol: [[60, 170, 290, 480]] },
    { name: 'Grand Tour', text: 'Portal, wall, ramp — bring it home', goal: 'cup', ink: 1500, par: 1240,
      balls: [[100, 80]], walls: [[792, 0, 792, 420, 8]], portals: [[420, 255, 700, 110]], spikes: [[0, 705, 800, 705]], nodraw: [[0, 300, 200, 300]], cup: [250, 700, 110, 100], gems: [[300, 200], [600, 330]],
      sol: [[60, 170, 450, 300], [770, 200, 330, 560]] },
  ];
  PACKS.B = [
    { name: "Chalk Warmup", text: "Send the ball to the far basket", goal: "cup", ink: 780, par: 640, balls: [[650, 80]], walls: [[8, 380, 8, 720, 8]], spikes: [[200, 705, 800, 705]], nodraw: [[0, 200, 200, 330]], cup: [75, 700, 110, 100], gems: [[300, 320]], sol: [[720, 170, 220, 400]] },
    { name: "Two Bridges", text: "Fill both gaps", goal: "cup", ink: 440, par: 360, balls: [[80, 100]], walls: [[30, 160, 200, 250], [330, 330, 470, 400]], boxes: [[620, 600, 180, 120]], spikes: [[0, 705, 800, 705]], cup: [700, 600, 110, 90], gems: [[540, 395]], sol: [[205, 255, 330, 330], [475, 405, 620, 470]] },
    { name: "Pinhole", text: "A very narrow basket", goal: "cup", ink: 390, par: 320, balls: [[150, 80]], walls: [[100, 160, 400, 330]], cup: [560, 700, 48, 120], gems: [[505, 370]], sol: [[470, 460, 530, 555], [650, 420, 590, 555]] },
    { name: "Double Trouble", text: "Both balls in the basket", goal: "cup", need: 2, ink: 1120, par: 920, balls: [[100, 80], [700, 80]], spikes: [[0, 705, 330, 705], [470, 705, 800, 705]], cup: [400, 700, 130, 130], gems: [[280, 375]], sol: [[60, 170, 320, 470], [740, 170, 480, 470]] },
    { name: "Spike Kiss", text: "Make them meet above the spike", goal: "touch", ink: 700, par: 580, balls: [[100, 300, 24], [700, 300, 24]], spikes: [[0, 705, 800, 705], [400, 610, 400, 705]], gems: [[250, 395]], sol: [[60, 390, 300, 440], [740, 390, 500, 440]] },
    { name: "Half-Pipe", text: "Curve it up onto the shelf", goal: "cup", ink: 370, par: 310, balls: [[90, 80]], walls: [[40, 150, 360, 420], [792, 380, 792, 560, 8]], boxes: [[600, 560, 200, 160]], cup: [700, 560, 110, 90], gems: [[600, 435]], sol: [[335, 494, 347, 502, 360, 509, 373, 515, 387, 520, 401, 524, 415, 527, 430, 529, 444, 530, 459, 530, 473, 529, 488, 526, 502, 523, 516, 519, 529, 514, 542, 507, 555, 500, 567, 492, 579, 483]] },
    { name: "Portal Catch", text: "Catch it after the portal", goal: "cup", ink: 460, par: 380, balls: [[650, 80]], spikes: [[0, 705, 395, 705], [505, 705, 800, 705]], portals: [[650, 330, 120, 470]], cup: [450, 700, 110, 100], gems: [[300, 550]], sol: [[70, 540, 390, 610]] },
    { name: "Updraft II", text: "Float up to the flag", goal: "zone", ink: 520, par: 430, balls: [[100, 400]], walls: [[40, 450, 300, 600]], fans: [[320, 100, 160, 600, 0, -3200]], zone: [330, 15, 140, 90], gems: [[420, 300]], sol: [[495, 300, 495, 660]] },
    { name: "Pinball", text: "Funnel it past the pegs", goal: "cup", ink: 650, par: 540, balls: [[412, 60]], pegs: [[300, 200, 12], [400, 200, 12], [500, 200, 12], [350, 270, 12], [450, 270, 12], [300, 340, 12], [400, 340, 12], [500, 340, 12]], spikes: [[0, 705, 355, 705], [445, 705, 800, 705]], cup: [400, 700, 80, 100], gems: [[525, 480]], sol: [[180, 450, 345, 610], [620, 450, 455, 610]] },
    { name: "Ink Miser", text: "Almost no ink — use the portal", goal: "cup", ink: 140, par: 80, balls: [[560, 80]], spikes: [[0, 705, 260, 705], [380, 705, 800, 705]], bouncers: [[490, 640, 630, 640]], portals: [[765, 517, 100, 300]], cup: [320, 700, 100, 100], gems: [[710, 465]], sol: [[545, 400, 585, 430]] },
    { name: "Teleport Room", text: "The basket is locked in", goal: "cup", ink: 770, par: 630, balls: [[100, 80]], walls: [[560, 300, 560, 720, 10], [560, 300, 800, 300, 10], [790, 300, 790, 720, 10]], spikes: [[0, 705, 560, 705]], portals: [[300, 560, 680, 380]], cup: [680, 700, 110, 100], gems: [[175, 300]], sol: [[60, 170, 330, 640]] },
    { name: "Slot", text: "Draw only inside the slot", goal: "cup", ink: 270, par: 210, balls: [[100, 80]], walls: [[40, 150, 300, 300]], spikes: [[0, 705, 345, 705], [455, 705, 800, 705]], nodraw: [[0, 320, 340, 400], [460, 0, 340, 720], [300, 0, 40, 320], [0, 0, 300, 140]], cup: [400, 700, 90, 100], gems: [[398, 560]], sol: [[440, 300, 430, 470]] },
    { name: "No Man's Land", text: "Two tiny windows to draw in", goal: "cup", ink: 690, par: 570, balls: [[120, 80]], walls: [[792, 440, 792, 720, 8]], nodraw: [[260, 0, 540, 400], [0, 170, 330, 310], [0, 480, 800, 240]], cup: [690, 700, 110, 100], gems: [[325, 240]], sol: [[70, 125, 250, 160], [340, 425, 640, 470]] },
    { name: "Catapult", text: "Launch to the high flag", goal: "zone", ink: 430, par: 350, balls: [[650, 300]], spikes: [[0, 705, 800, 705]], bouncers: [[300, 640, 440, 600, 1400]], zone: [10, 10, 200, 200], gems: [[215, 240]], sol: [[700, 390, 470, 580]] },
    { name: "Spiral", text: "Zig,  zag,  zig — three gems", goal: "cup", ink: 2590, par: 2130, balls: [[100, 80]], walls: [[792, 200, 792, 430, 8], [792, 520, 792, 720, 8], [8, 380, 8, 620, 8]], cup: [710, 710, 130, 90], gems: [[600, 255], [270, 415], [560, 555]], sol: [[60, 170, 660, 310], [785, 370, 230, 450], [18, 500, 660, 600]] },
    { name: "Crossfire", text: "Cradle one ball,  fling the other", goal: "touch", ink: 930, par: 770, balls: [[100, 60], [620, 200]], walls: [[400, 300, 400, 720, 10]], spikes: [[0, 705, 800, 705]], gems: [[440, 170]], sol: [[560, 280, 620, 340, 680, 280], [60, 140, 540, 230]] },
    { name: "Gauntlet", text: "Over,  under,  over", goal: "cup", ink: 880, par: 720, balls: [[100, 80]], walls: [[792, 400, 792, 720, 8]], spikes: [[200, 260, 200, 720], [400, 0, 400, 340], [600, 560, 600, 720]], cup: [720, 700, 110, 100], gems: [[485, 410]], sol: [[60, 170, 230, 235, 390, 450, 560, 470]] },
    { name: "Rescue", text: "Drop in on your friend", goal: "touch", ink: 560, par: 460, balls: [[120, 80], [600, 610, 20, 1]], walls: [[520, 420, 520, 640], [680, 420, 680, 640], [520, 640, 680, 640]], spikes: [[0, 705, 800, 705]], nodraw: [[500, 200, 200, 210]], gems: [[435, 295]], sol: [[60, 170, 420, 330]] },
    { name: "Storm", text: "Two winds,  one basket", goal: "cup", ink: 230, par: 170, balls: [[100, 80]], walls: [[8, 300, 8, 720, 8]], fans: [[0, 200, 800, 120, 2000, 0], [0, 420, 800, 120, -2000, 0]], cup: [70, 700, 110, 100], gems: [[100, 470]], sol: [[135, 190, 135, 330]] },
    { name: "Upstream", text: "Get past the headwind", goal: "cup", ink: 1090, par: 900, balls: [[100, 80]], fans: [[0, 300, 800, 160, -1800, 0]], cup: [700, 700, 110, 100], gems: [[380, 515]], sol: [[70, 290, 70, 470], [60, 500, 640, 600]] },
    { name: "Chain Reaction", text: "Knock the blue ball in too", goal: "cup", need: 2, ink: 780, par: 640, balls: [[100, 80], [650, 420]], walls: [[610, 450, 700, 450], [792, 300, 792, 720, 8]], spikes: [[0, 705, 620, 705]], cup: [710, 700, 140, 120], gems: [[340, 275]], sol: [[60, 170, 550, 420]] },
    { name: "Last Inch", text: "Land on the tiny pedestal", goal: "cup", ink: 290, par: 230, balls: [[100, 80]], boxes: [[350, 600, 100, 120]], spikes: [[0, 705, 345, 705], [455, 705, 800, 705]], nodraw: [[330, 280, 140, 210]], cup: [400, 600, 70, 100], gems: [[300, 245]], sol: [[60, 170, 240, 240]] },
    { name: "Tri-Gem", text: "Three gems,  then the flag", goal: "zone", ink: 1390, par: 1150, balls: [[100, 80]], zone: [300, 620, 140, 90], gems: [[250, 200], [550, 284], [450, 474]], sol: [[60, 170, 620, 330], [760, 300, 420, 520]] },
    { name: "Grand Finale", text: "Portal,  updraft,  basket", goal: "cup", ink: 910, par: 750, balls: [[100, 80]], walls: [[765, 150, 765, 690, 8]], boxes: [[400, 330, 140, 24]], spikes: [[0, 705, 800, 705]], fans: [[600, 150, 160, 560, 0, -3000]], portals: [[240, 440, 620, 330]], cup: [470, 330, 130, 100], gems: [[200, 400], [636, 300], [546, 200]], sol: [[60, 170, 300, 560], [750, 210, 580, 160]] },

  ];

  if (window.IGAME_TEST) window.IGAME_TEST.lineLogic = { World: World, PACKS: PACKS, verifyLevel: verifyLevel, mirrorLevel: mirrorLevel, WW: WW, WH: WH };

  IG.register('line-logic', createGame);
})();
