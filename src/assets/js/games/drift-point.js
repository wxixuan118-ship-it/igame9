/*!
 * Drift Point — igame9 original top-down drifting game (engine id: drift-point)
 * Slip-angle car physics (bicycle model with tyre curves, load transfer,
 * throttle-induced wheelspin and handbrake), drift scoring with a combo
 * multiplier, three tracks, a garage with five cars and tuning upgrades.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var G = 9.81;
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function wrapA(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
  function money(n) { return '$' + fmtInt(n); }
  function mulberry(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* Game data                                                           */
  /* ------------------------------------------------------------------ */
  var SESSION = 120; // seconds per drift session
  var GRACE = 1.6; // seconds a chain survives between drifts
  var MAX_MULT = 8;
  var MONEY_RATE = 20; // points per $1

  var CARS = [
    { id: 'sparrow', name: 'Sparrow S', price: 0, power: 112, mass: 1050, grip: 0.96, len: 4.0, wid: 1.76, paint: 0, style: 'hatch', blurb: 'Light and forgiving. The best car for learning throttle control.' },
    { id: 'ronin', name: 'Ronin RS', price: 6000, power: 150, mass: 1200, grip: 1.0, len: 4.35, wid: 1.8, paint: 1, style: 'coupe', blurb: 'Balanced rear-drive coupe that holds long, smooth angles.' },
    { id: 'vesper', name: 'Vesper GT', price: 15000, power: 195, mass: 1260, grip: 1.08, len: 4.45, wid: 1.84, paint: 6, style: 'gt', blurb: 'Grippy and precise. Rewards clean, fast entries.' },
    { id: 'mako', name: 'Mako V8', price: 28000, power: 245, mass: 1520, grip: 1.0, len: 4.75, wid: 1.95, paint: 3, style: 'muscle', blurb: 'Heavy muscle car with a huge, lazy power slide.' },
    { id: 'kaiju', name: 'Kaiju TT', price: 50000, power: 310, mass: 1360, grip: 1.1, len: 4.55, wid: 2.0, paint: 2, style: 'wide', blurb: 'Twin-turbo widebody. Brutally fast and twitchy.' },
  ];
  var PAINTS = ['#ff7a1a', '#22b8ff', '#ef3b5a', '#ffd23f', '#86e04a', '#eef1f6', '#9b6bff', '#262b3a'];
  var UPGRADES = [
    { id: 'eng', name: 'Engine', desc: '+12% power', cost: 900 },
    { id: 'tyre', name: 'Tyres', desc: '+5% grip', cost: 700 },
    { id: 'wt', name: 'Weight', desc: '−5% weight', cost: 800 },
    { id: 'steer', name: 'Steering', desc: 'More lock & angle', cost: 600 },
  ];
  var UP_MULT = [1, 2.2, 4];
  function upCost(ci, ui, lvl) { return Math.round((UPGRADES[ui].cost * (1 + ci * 0.6) * UP_MULT[lvl]) / 50) * 50; }

  var TRACKS = [
    {
      id: 'lot', name: 'Foundry Lot', sub: 'Wide practice loop', w: 26, theme: 'lot', start: [-20, -40],
      medals: [25000, 100000, 250000],
      verts: [[70, -40, 34], [70, 40, 34], [20, 40, 14], [0, 20, 14], [-20, 40, 14], [-70, 40, 34], [-70, -40, 34]],
    },
    {
      id: 'city', name: 'Harbor Loop', sub: 'Tight city streets', w: 15, theme: 'city', start: [120, 40],
      medals: [20000, 80000, 200000],
      verts: [[40, 40, 24], [390, 40, 30], [390, 140, 16], [290, 140, 16], [290, 250, 26], [150, 250, 14], [150, 172, 14],
        [230, 172, 14], [230, 100, 16], [110, 100, 16], [110, 178, 14], [40, 178, 22]],
    },
    {
      id: 'touge', name: 'Cedar Pass', sub: 'Mountain touge', w: 12, theme: 'touge', start: [40, 235],
      medals: [20000, 80000, 200000],
      verts: [[40, 300, 30], [40, 150, 45], [110, 60, 40], [230, 90, 60], [320, 30, 30], [470, 40, 26], [490, 120, 12],
        [420, 140, 12], [430, 200, 28], [520, 250, 30], [500, 340, 22], [380, 330, 40], [300, 260, 18], [240, 300, 18],
        [200, 230, 14], [140, 250, 14], [150, 330, 26]],
    },
  ];
  var MEDAL_NAMES = ['', 'Bronze', 'Silver', 'Gold'];
  var MEDAL_COLORS = ['#59607a', '#d08a4e', '#cfd6e4', '#ffcf3f'];
  var MEDAL_REWARD = [0, 500, 1500, 4000];

  var THEMES = {
    lot: { ground: '#80848b', speck: 18, asphalt: '#3c4047', wall: '#eceff2', wallDark: '#8f97a3', runoff: '#62676f', line: 'rgba(245,245,245,0.9)', center: null, curbA: '#f1f1f1', curbB: '#e0443c', smoke: 'rgba(235,235,235,' },
    city: { ground: '#585d66', speck: 14, asphalt: '#30343b', wall: '#d7dbe0', wallDark: '#7d848f', runoff: '#9aa0a8', line: 'rgba(240,240,240,0.85)', center: 'rgba(240,240,240,0.7)', curbA: '#f3f3f3', curbB: '#d8343a', smoke: 'rgba(230,232,236,' },
    touge: { ground: '#2f6a37', speck: 22, asphalt: '#3b3e42', wall: '#c3c9d1', wallDark: '#6e7782', runoff: '#6a6447', line: 'rgba(240,240,240,0.85)', center: '#f0c02e', curbA: null, curbB: null, smoke: 'rgba(236,236,230,' },
  };

  /* ------------------------------------------------------------------ */
  /* Track building: polygon with filleted corners → dense centerline     */
  /* ------------------------------------------------------------------ */
  function filletPath(verts, step) {
    var n = verts.length, corners = [], pts = [], i, j;
    for (i = 0; i < n; i++) {
      var A = verts[(i - 1 + n) % n], B = verts[i], C = verts[(i + 1) % n];
      var l1 = Math.hypot(A[0] - B[0], A[1] - B[1]), l2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
      var u1x = (A[0] - B[0]) / l1, u1y = (A[1] - B[1]) / l1, u2x = (C[0] - B[0]) / l2, u2y = (C[1] - B[1]) / l2;
      var half = Math.acos(clamp(u1x * u2x + u1y * u2y, -1, 1)) / 2;
      if (half > 1.55) { corners.push({ t1: [B[0], B[1]], t2: [B[0], B[1]], o: [B[0], B[1]], r: 0 }); continue; }
      var r = B[2] || 10, d = r / Math.tan(half), maxD = Math.min(l1, l2) * 0.5;
      if (d > maxD) { d = maxD; r = d * Math.tan(half); }
      var bx = u1x + u2x, by = u1y + u2y, bl = Math.hypot(bx, by) || 1, h = r / Math.sin(half);
      corners.push({ t1: [B[0] + u1x * d, B[1] + u1y * d], t2: [B[0] + u2x * d, B[1] + u2y * d], o: [B[0] + (bx / bl) * h, B[1] + (by / bl) * h], r: r });
    }
    for (i = 0; i < n; i++) {
      var c = corners[i];
      if (c.r) {
        var a1 = Math.atan2(c.t1[1] - c.o[1], c.t1[0] - c.o[0]);
        var da = wrapA(Math.atan2(c.t2[1] - c.o[1], c.t2[0] - c.o[0]) - a1);
        var k = Math.max(2, Math.round((Math.abs(da) * c.r) / step));
        for (j = 0; j < k; j++) pts.push([c.o[0] + Math.cos(a1 + (da * j) / k) * c.r, c.o[1] + Math.sin(a1 + (da * j) / k) * c.r]);
      }
      var P = c.t2, Q = corners[(i + 1) % n].t1;
      var L = Math.hypot(Q[0] - P[0], Q[1] - P[1]), m = Math.max(1, Math.round(L / step));
      for (j = 0; j < m; j++) pts.push([P[0] + ((Q[0] - P[0]) * j) / m, P[1] + ((Q[1] - P[1]) * j) / m]);
    }
    return pts;
  }

  function buildTrack(def) {
    var pts = filletPath(def.verts, 2), N = pts.length, i;
    var X = new Float32Array(N), Y = new Float32Array(N), TX = new Float32Array(N), TY = new Float32Array(N), S = new Float32Array(N + 1), K = new Float32Array(N);
    for (i = 0; i < N; i++) { X[i] = pts[i][0]; Y[i] = pts[i][1]; }
    for (i = 0; i < N; i++) {
      var dx = X[(i + 1) % N] - X[(i - 1 + N) % N], dy = Y[(i + 1) % N] - Y[(i - 1 + N) % N], l = Math.hypot(dx, dy) || 1;
      TX[i] = dx / l; TY[i] = dy / l;
    }
    S[0] = 0;
    for (i = 0; i < N; i++) S[i + 1] = S[i] + Math.hypot(X[(i + 1) % N] - X[i], Y[(i + 1) % N] - Y[i]);
    for (i = 0; i < N; i++) {
      var p = (i - 1 + N) % N, q = (i + 1) % N;
      K[i] = wrapA(Math.atan2(TY[q], TX[q]) - Math.atan2(TY[p], TX[p])) / 4;
    }
    var hw = def.w / 2;
    var tr = { def: def, N: N, X: X, Y: Y, TX: TX, TY: TY, S: S, K: K, len: S[N], hw: hw, wallHW: hw + 1.3, theme: THEMES[def.theme] };
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (i = 0; i < N; i++) { x0 = Math.min(x0, X[i]); y0 = Math.min(y0, Y[i]); x1 = Math.max(x1, X[i]); y1 = Math.max(y1, Y[i]); }
    tr.bbox = [x0 - hw - 2, y0 - hw - 2, x1 + hw + 2, y1 + hw + 2];
    // render chunks: Path2D per ~48 m of centerline with bbox for culling
    var CH = 24;
    tr.chunks = [];
    for (var c0 = 0; c0 < N; c0 += CH) {
      var c1 = Math.min(c0 + CH, N);
      var path = new Path2D(), edges = new Path2D(), curb = null;
      var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, curvy = false;
      for (var k = c0; k <= c1; k++) {
        var ii = k % N;
        if (k === c0) path.moveTo(X[ii], Y[ii]); else path.lineTo(X[ii], Y[ii]);
        bx0 = Math.min(bx0, X[ii]); by0 = Math.min(by0, Y[ii]); bx1 = Math.max(bx1, X[ii]); by1 = Math.max(by1, Y[ii]);
        if (Math.abs(K[ii]) > 1 / 50) curvy = true;
      }
      for (var sd = -1; sd <= 1; sd += 2) {
        var off = (hw - 0.55) * sd;
        for (k = c0; k <= c1; k++) {
          ii = k % N;
          var ex = X[ii] - TY[ii] * off, ey = Y[ii] + TX[ii] * off;
          if (k === c0) edges.moveTo(ex, ey); else edges.lineTo(ex, ey);
        }
      }
      if (curvy) curb = path;
      var m = hw + 4;
      tr.chunks.push({ path: path, edges: edges, curb: curb, s0: S[c0], b: [bx0 - m, by0 - m, bx1 + m, by1 + m] });
    }
    // start pose
    var best = 1e18;
    tr.startI = 0;
    for (i = 0; i < N; i++) {
      var d2 = (X[i] - def.start[0]) * (X[i] - def.start[0]) + (Y[i] - def.start[1]) * (Y[i] - def.start[1]);
      if (d2 < best) { best = d2; tr.startI = i; }
    }
    buildDecos(tr);
    return tr;
  }

  // nearest centerline segment around a hint index. Writes into out.
  function nearest(tr, x, y, hint, win, out) {
    var N = tr.N, X = tr.X, Y = tr.Y, best = 1e18, bi = hint, bt = 0;
    for (var k = -win; k <= win; k++) {
      var i = (((hint + k) % N) + N) % N, j = (i + 1) % N;
      var ax = X[i], ay = Y[i], sx = X[j] - ax, sy = Y[j] - ay;
      var t = ((x - ax) * sx + (y - ay) * sy) / (sx * sx + sy * sy);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      var px = ax + sx * t - x, py = ay + sy * t - y, d2 = px * px + py * py;
      if (d2 < best) { best = d2; bi = i; bt = t; }
    }
    var j2 = (bi + 1) % N, ux = X[j2] - X[bi], uy = Y[j2] - Y[bi], ul = Math.sqrt(ux * ux + uy * uy) || 1;
    out.i = bi;
    out.nx = -uy / ul; out.ny = ux / ul;
    out.d = (x - (X[bi] + ux * bt)) * out.nx + (y - (Y[bi] + uy * bt)) * out.ny;
    out.s = tr.S[bi] + ul * bt;
    return out;
  }

  function distToTrack(tr, x, y) {
    var best = 1e18;
    for (var i = 0; i < tr.N; i += 2) {
      var dx = tr.X[i] - x, dy = tr.Y[i] - y, d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  /* Decorations (trees, buildings, containers…) in a 40 m spatial grid. */
  var CELL = 40;
  function buildDecos(tr) {
    var rnd = mulberry(tr.def.id.length * 9973 + tr.N);
    var b = tr.bbox, pad = 90, hw = tr.hw, list = [], i;
    var X0 = b[0] - pad, Y0 = b[1] - pad, X1 = b[2] + pad, Y1 = b[3] + pad;
    var th = tr.def.theme;
    function add(o) { list.push(o); }
    if (th === 'touge') {
      for (i = 0; i < 1500; i++) {
        var x = lerp(X0, X1, rnd()), y = lerp(Y0, Y1, rnd()), r = 2.2 + rnd() * 2.6;
        var d = distToTrack(tr, x, y);
        if (d < hw + 2.2 + r * 0.95) continue;
        add({ t: rnd() < 0.18 ? 'pine' : 'tree', x: x, y: y, r: r, c: (rnd() * 3) | 0 });
      }
      for (i = 0; i < 70; i++) {
        x = lerp(X0, X1, rnd()); y = lerp(Y0, Y1, rnd()); r = 1 + rnd() * 1.8;
        if (distToTrack(tr, x, y) < hw + 3 + r) continue;
        add({ t: 'rock', x: x, y: y, r: r, a: rnd() * TAU });
      }
    } else if (th === 'city') {
      var pitch = 24, cols = ['#8d6e63', '#6d7f99', '#a1887f', '#7b8794', '#b0846a', '#5f7a74', '#9a8fb0', '#c2a97a'];
      for (var gx = X0; gx < X1; gx += pitch) {
        for (var gy = Y0; gy < Y1; gy += pitch) {
          var w = 12 + rnd() * 9, h = 12 + rnd() * 9, cx = gx + pitch / 2 + (rnd() - 0.5) * 3, cy = gy + pitch / 2 + (rnd() - 0.5) * 3;
          if (distToTrack(tr, cx, cy) < hw + 4.5 + Math.hypot(w, h) / 2) {
            // close to the road: maybe a street tree on the sidewalk instead
            var dd = distToTrack(tr, cx, cy);
            if (dd > hw + 6 && rnd() < 0.7) add({ t: 'tree', x: cx, y: cy, r: 2.4 + rnd() * 1.4, c: (rnd() * 3) | 0 });
            continue;
          }
          if (rnd() < 0.1) { add({ t: 'park', x: cx, y: cy, w: w + 6, h: h + 6 }); add({ t: 'tree', x: cx + 2, y: cy - 1, r: 3.5, c: 1 }); continue; }
          add({ t: 'bld', x: cx, y: cy, w: w, h: h, col: cols[(rnd() * cols.length) | 0], ht: 1.5 + rnd() * 3.5, ac: rnd() < 0.6 });
        }
      }
      for (i = 0; i < 260; i++) {
        var k = (rnd() * tr.N) | 0, sd = rnd() < 0.5 ? -1 : 1, off = (hw + 2.7) * sd;
        var lx = tr.X[k] - tr.TY[k] * off, ly = tr.Y[k] + tr.TX[k] * off;
        if (distToTrack(tr, lx, ly) < hw + 2.4) continue;
        add({ t: 'lamp', x: lx, y: ly, a: Math.atan2(-tr.TX[k] * sd, tr.TY[k] * sd) });
      }
    } else {
      // industrial lot: warehouse in the infield, containers and parking bays outside
      var wh = { t: 'bld', x: 0, y: -8, w: 70, h: 26, col: '#8f9aa6', ht: 4, ac: true, big: true };
      if (distToTrack(tr, -35, -21) > hw + 3 && distToTrack(tr, 35, 5) > hw + 3) add(wh);
      var ccol = ['#c0392b', '#2f7fbf', '#d68a1f', '#3e8e5a', '#6c5ba7'];
      for (i = 0; i < 260; i++) {
        x = lerp(X0, X1, rnd()); y = lerp(Y0, Y1, rnd());
        var horiz = rnd() < 0.5, cw = horiz ? 12.2 : 2.5, chh = horiz ? 2.5 : 12.2;
        if (distToTrack(tr, x, y) < hw + 5 + 6.5) continue;
        if (rnd() < 0.55) add({ t: 'cont', x: x, y: y, w: cw, h: chh, col: ccol[(rnd() * ccol.length) | 0] });
        else if (rnd() < 0.5) add({ t: 'bay', x: x, y: y, n: 4 + ((rnd() * 4) | 0), horiz: horiz });
      }
      for (i = 0; i < 90; i++) {
        k = (rnd() * tr.N) | 0; sd = rnd() < 0.5 ? -1 : 1; off = (hw + 3 + rnd() * 2) * sd;
        lx = tr.X[k] - tr.TY[k] * off; ly = tr.Y[k] + tr.TX[k] * off;
        if (distToTrack(tr, lx, ly) < hw + 2.6) continue;
        add({ t: rnd() < 0.5 ? 'cone' : 'tyres', x: lx, y: ly });
      }
    }
    // ground-level items first so draw order inside a cell is natural
    list.sort(function (a, c) { return (a.t === 'bay' || a.t === 'park' ? 0 : 1) - (c.t === 'bay' || c.t === 'park' ? 0 : 1); });
    var grid = {};
    for (i = 0; i < list.length; i++) {
      var o = list[i], key = Math.floor(o.x / CELL) * 4096 + Math.floor(o.y / CELL);
      (grid[key] || (grid[key] = [])).push(o);
    }
    tr.decoGrid = grid;
  }

  /* ------------------------------------------------------------------ */
  /* Car physics                                                         */
  /* ------------------------------------------------------------------ */
  // tyre lateral force curve (normalized): peak at ~8° slip, then a gentle fall-off
  function tyreCurve(a) {
    var x = a < 0 ? -a : a, f;
    if (x < 0.14) { var u = x / 0.14; f = u * (2 - u); } else { f = 1 - (x - 0.14) * 0.35; if (f < 0.82) f = 0.82; }
    return a < 0 ? -f : f;
  }

  function carParams(ci, lv) {
    var c = CARS[ci];
    var mass = c.mass * (1 - 0.05 * lv.wt);
    var wb = c.len * 0.6;
    return {
      mass: mass,
      power: c.power * 1000 * (1 + 0.12 * lv.eng),
      mu: c.grip * (1 + 0.05 * lv.tyre),
      a: wb * 0.48,
      b: wb * 0.52,
      h: 0.5,
      I: mass * 1.58,
      lock: 0.82 + 0.05 * lv.steer,
      maxB: 0.8 + 0.05 * lv.steer,
      assist: 0.8,
      cd: 2.4,
      rr: 30,
    };
  }

  function newCar() {
    return { x: 0, y: 0, hd: 0, vx: 0, vy: 0, w: 0, steer: 0, ax: 0, beta: 0, vF: 0, speed: 0, slipR: 0, slipF: 0, spin: 0, hint: 0, p: null, brake: 0 };
  }

  // One physics step. inp = {thr, brk, hb, st}. Positive angles are clockwise on screen.
  function stepCar(car, inp, dt) {
    var p = car.p;
    var c = Math.cos(car.hd), s = Math.sin(car.hd);
    var vF = car.vx * c + car.vy * s, vR = -car.vx * s + car.vy * c;
    var speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
    var L = p.a + p.b, m = p.mass, mu = p.mu;
    var beta = speed > 1 ? Math.atan2(vR, Math.abs(vF)) : 0, ab = Math.abs(beta);
    // steering: input range shrinks with speed; countersteer assist points the
    // front wheels along the front axle's direction of travel (like caster self-aligning)
    var range = Math.max(p.lock / (1 + speed / 14), 0.3);
    var target = inp.st * range;
    if (vF > 2) {
      var fa = Math.atan2(vR + car.w * p.a, Math.max(vF, 0.5));
      var asst = p.assist + (1 - p.assist) * clamp((ab - 0.5) / 0.6, 0, 1);
      target += clamp(fa, -p.lock, p.lock) * asst;
    }
    target = clamp(target, -p.lock, p.lock);
    car.steer += clamp(target - car.steer, -4.5 * dt, 4.5 * dt);
    // axle loads with longitudinal weight transfer
    var Nf = Math.max((m * G * p.b) / L - (m * car.ax * p.h) / L, m * G * 0.15);
    var Nr = Math.max((m * G * p.a) / L + (m * car.ax * p.h) / L, m * G * 0.15);
    // drive / brake
    var reversing = inp.brk > 0 && vF < 0.8;
    var drive = reversing ? -inp.brk * m * 4 : inp.thr * Math.min(p.power / Math.max(Math.abs(vF), 3), p.power / 3);
    if (vF < -8 && drive < 0) drive = 0;
    var tracR = mu * Nr, Fxr = drive, Fxf = 0, capR = 1, capF = 1;
    var ratio = Math.abs(drive) / tracR;
    // wheelspin: too much drive torque eats the rear tyres' lateral grip (power oversteer)
    if (ratio > 0.55) capR = 1 - 0.65 * clamp((ratio - 0.55) / 0.6, 0, 1);
    if (ratio > 1) Fxr = (drive > 0 ? 1 : -1) * tracR * 0.92;
    car.spin = ratio > 1 && !reversing ? clamp(ratio - 1, 0, 1) : 0;
    var sv = vF >= 0 ? 1 : -1;
    if (inp.brk > 0 && !reversing) {
      var bf = inp.brk * mu * m * G * 0.95;
      Fxf -= sv * bf * 0.6; Fxr -= sv * bf * 0.4;
      capF *= 1 - 0.25 * inp.brk; capR *= 1 - 0.25 * inp.brk;
    }
    if (inp.hb) {
      Fxr = -sv * tracR * 0.6 + (inp.thr ? Fxr * 0.3 : 0);
      capR *= 0.32;
    }
    car.brake = inp.brk > 0 && !reversing ? 1 : inp.hb ? 0.6 : 0;
    // slip angles (denominator floored so low speeds stay stable)
    var den = Math.max(Math.abs(vF), 4);
    var af = Math.atan2(vR + car.w * p.a, den) - car.steer * sv;
    var ar = Math.atan2(vR - car.w * p.b, den);
    var Ff = -tyreCurve(af) * mu * Nf * capF, Fr = -tyreCurve(ar) * mu * Nr * capR;
    car.slipF = Math.abs(af); car.slipR = Math.abs(ar);
    var cs = Math.cos(car.steer), sn = Math.sin(car.steer);
    var drag = -p.cd * vF * Math.abs(vF) - p.rr * vF;
    var Fx = Fxr + Fxf * cs - Ff * sn + drag;
    var Fy = Ff * cs + Fxf * sn + Fr - vR * p.rr;
    var tq = p.a * (Ff * cs + Fxf * sn) - p.b * Fr;
    var ax = Fx / m, ay = Fy / m;
    car.ax += (ax - car.ax) * Math.min(1, dt * 10);
    car.vx += (ax * c - ay * s) * dt;
    car.vy += (ax * s + ay * c) * dt;
    car.w += (tq / p.I) * dt;
    // drift-angle limiter: beyond maxB (more when steering into the slide) yaw that would
    // increase the angle is damped, so throttle drifts don't spin out unless you use the handbrake
    var into = clamp(-inp.st * (beta > 0 ? 1 : -1), 0, 1);
    var maxB = p.maxB + 0.25 * into;
    if (!inp.hb && ab > maxB && car.w * beta < 0) car.w *= 1 - Math.min(1, (dt * 12 * (ab - maxB)) / 0.2);
    if (speed < 3) car.w *= 1 - Math.min(1, dt * 4);
    car.w *= 1 - Math.min(1, dt * 0.6);
    car.hd += car.w * dt;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    if (inp.thr === 0 && inp.brk === 0 && speed < 0.3) { car.vx *= 0.9; car.vy *= 0.9; }
    car.beta = beta; car.vF = vF; car.speed = speed;
  }

  /* ------------------------------------------------------------------ */
  /* Car drawing (top-down, +x = forward, units = metres)                */
  /* ------------------------------------------------------------------ */
  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawCar(g, def, color, steer, brake) {
    var L = def.len, W = def.wid, hl = L / 2, hw = W / 2, st = def.style;
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.34)';
    rrect(g, -hl + 0.22, -hw + 0.3, L, W, 0.5);
    g.fill();
    // tyres
    g.fillStyle = '#121418';
    var wx = L * 0.31, ww = 0.74, wt = st === 'wide' ? 0.38 : 0.32, wy = hw - 0.1;
    g.fillRect(-wx - ww / 2, -wy - wt / 2, ww, wt);
    g.fillRect(-wx - ww / 2, wy - wt / 2, ww, wt);
    for (var sd = -1; sd <= 1; sd += 2) {
      g.save();
      g.translate(wx, sd * wy);
      g.rotate(steer);
      g.fillRect(-ww / 2, -wt / 2, ww, wt);
      g.restore();
    }
    // body
    g.fillStyle = color;
    rrect(g, -hl, -hw + 0.08, L, W - 0.16, st === 'hatch' ? 0.55 : 0.42);
    g.fill();
    if (st === 'wide') {
      // fender flares
      g.fillStyle = color;
      for (sd = -1; sd <= 1; sd += 2) {
        rrect(g, wx - 0.55, sd > 0 ? hw - 0.32 : -hw - 0.02, 1.1, 0.34, 0.15); g.fill();
        rrect(g, -wx - 0.55, sd > 0 ? hw - 0.32 : -hw - 0.02, 1.1, 0.34, 0.15); g.fill();
      }
    }
    // side shading
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(-hl + 0.35, hw - 0.36, L - 0.7, 0.22);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fillRect(-hl + 0.35, -hw + 0.16, L - 0.7, 0.16);
    // stripes
    if (st === 'gt' || st === 'muscle') {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(-hl + 0.1, -0.28, L - 0.2, 0.17);
      g.fillRect(-hl + 0.1, 0.11, L - 0.2, 0.17);
    }
    // cabin
    var wsF = st === 'muscle' ? L * 0.06 : L * 0.12, roofF = wsF - L * 0.13, roofB = st === 'hatch' ? -L * 0.33 : -L * 0.2, rearB = st === 'hatch' ? -L * 0.4 : -L * 0.3;
    var cw = hw - 0.22;
    g.fillStyle = '#18222e';
    g.beginPath();
    g.moveTo(wsF, -cw + 0.12); g.lineTo(wsF, cw - 0.12); g.lineTo(rearB, cw - 0.05); g.lineTo(rearB, -cw + 0.05); g.closePath();
    g.fill();
    // roof
    g.fillStyle = color;
    rrect(g, roofB, -cw + 0.08, roofF - roofB, 2 * cw - 0.16, 0.25);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fillRect(roofB + 0.15, -cw + 0.18, roofF - roofB - 0.3, 0.18);
    // windshield glint
    g.fillStyle = 'rgba(160,200,255,0.28)';
    g.fillRect(roofF + 0.08, -cw + 0.3, 0.16, cw * 0.7);
    // lights
    g.fillStyle = '#fff6cf';
    g.fillRect(hl - 0.2, -hw + 0.22, 0.16, 0.42);
    g.fillRect(hl - 0.2, hw - 0.64, 0.16, 0.42);
    g.fillStyle = brake ? '#ff3a3a' : '#a3161f';
    g.fillRect(-hl + 0.02, -hw + 0.22, 0.14, 0.42);
    g.fillRect(-hl + 0.02, hw - 0.64, 0.14, 0.42);
    if (brake) {
      g.fillStyle = 'rgba(255,40,40,0.28)';
      g.beginPath(); g.arc(-hl - 0.1, -hw + 0.43, 0.6, 0, TAU); g.arc(-hl - 0.1, hw - 0.43, 0.6, 0, TAU); g.fill();
    }
    // wing
    if (st === 'wide' || st === 'coupe') {
      g.fillStyle = 'rgba(15,17,22,0.9)';
      g.fillRect(-hl + 0.12, -hw + 0.12, st === 'wide' ? 0.36 : 0.22, W - 0.24);
    }
    if (st === 'muscle') {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      rrect(g, L * 0.2, -0.32, 0.5, 0.64, 0.1);
      g.fill();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scoped styles for DOM UI (removed on destroy)                       */
  /* ------------------------------------------------------------------ */
  var CSS = [
    '.dp-btn{position:absolute;z-index:6;top:10px;right:10px;width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(5,6,14,.55);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0;touch-action:manipulation}',
    '.dp-btn svg{width:18px;height:18px}',
    '.dp-touch{position:absolute;left:0;right:0;bottom:0;z-index:5;pointer-events:none}',
    '.dp-tb{position:absolute;pointer-events:auto;display:grid;place-items:center;border-radius:50%;background:rgba(10,12,24,.42);border:2px solid rgba(255,255,255,.32);color:#fff;font:900 13px ' + FONT + ';letter-spacing:.02em;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
    '.dp-tb.on{background:rgba(255,255,255,.34);transform:scale(.95)}',
    '.dp-tb svg{width:42%;height:42%}',
    '.dp-tb.gas{background:rgba(34,197,94,.35);border-color:rgba(134,239,172,.7)}',
    '.dp-tb.hb{background:rgba(249,115,22,.35);border-color:rgba(253,186,116,.75)}',
    '.dp-tb.brk{background:rgba(239,68,68,.3);border-color:rgba(252,165,165,.7)}',
    '.dp-panel{width:min(560px,100%)!important;text-align:left!important;padding:18px!important}',
    '.dp-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}',
    '.dp-money{font:800 15px ' + FONT + ';color:#ffd23f;white-space:nowrap}',
    '.dp-lede{color:var(--text-2,#c4c8ea);font-size:14px;margin:0 0 12px}',
    '.dp-tracks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px}',
    '.dp-track{font:inherit;text-align:left;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:9px 10px;cursor:pointer;min-width:0}',
    '.dp-track.sel{border-color:var(--accent-2,#2dd4f0);background:rgba(45,212,240,.14);box-shadow:inset 0 0 0 1px var(--accent-2,#2dd4f0)}',
    '.dp-track b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dp-track small{display:block;font-size:12px;color:var(--text-2,#c4c8ea);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dp-medals{display:flex;gap:3px;margin-top:5px}',
    '.dp-medals i{width:10px;height:10px;border-radius:50%;background:#3a4060;display:block}',
    '.dp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,.05);border-radius:12px;padding:8px 10px;margin-bottom:12px;font-size:14px}',
    '.dp-keys{color:var(--muted,#8f95c0);font-size:12px;margin-top:10px;text-align:center}',
    '.dp-keys kbd{font:700 11px ui-monospace,monospace;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}',
    '.dp-carnav{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:6px}',
    '.dp-nav{font:900 18px ' + FONT + ';color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:10px;height:40px;cursor:pointer}',
    '.dp-prev{width:100%;height:78px;display:block}',
    '.dp-cname{font:900 19px ' + FONT + ';color:#fff;text-align:center}',
    '.dp-cblurb{font-size:12.5px;color:var(--text-2,#c4c8ea);text-align:center;margin:0 0 8px}',
    '.dp-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:12px;margin-bottom:10px}',
    '.dp-stat>span{display:flex;justify-content:space-between;margin-bottom:3px}',
    '.dp-bar{height:7px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden}',
    '.dp-bar span{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,var(--accent,#8b6cff),var(--accent-2,#2dd4f0))}',
    '.dp-paints{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px}',
    '.dp-paint{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer;padding:0}',
    '.dp-paint.sel{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.35)}',
    '.dp-ups{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}',
    '@media (max-width:520px){.dp-ups{grid-template-columns:1fr}}',
    '.dp-up{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;background:rgba(255,255,255,.05);border-radius:10px;padding:6px 8px;font-size:13px}',
    '.dp-up small{color:var(--text-2,#c4c8ea);display:block;font-size:11px}',
    '.dp-pips{display:flex;gap:3px}.dp-pips i{width:9px;height:9px;border-radius:50%;background:#3a4060;display:block}.dp-pips i.on{background:var(--accent-2,#2dd4f0)}',
    '.dp-buy{font:800 12px ' + FONT + ';color:#fff;border:0;border-radius:9px;padding:7px 10px;cursor:pointer;background:linear-gradient(135deg,var(--accent,#8b6cff),var(--accent-2,#2dd4f0));white-space:nowrap}',
    '.dp-buy[disabled]{opacity:.45;cursor:not-allowed;filter:grayscale(.5)}',
    '.dp-big{font:900 clamp(30px,7vw,46px) ' + FONT + ';color:#fff;text-align:center;line-height:1.05;margin:4px 0}',
    '.dp-tag{display:inline-block;font:800 12px ' + FONT + ';padding:3px 10px;border-radius:999px;background:#ffd23f;color:#1a1300;margin:0 auto 8px}',
    '.dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0 14px}',
    '.dp-grid div{background:rgba(255,255,255,.06);border-radius:10px;padding:7px 10px;font-size:12px;color:var(--text-2,#c4c8ea)}',
    '.dp-grid b{display:block;color:#fff;font-size:16px}',
    '.dp-center{text-align:center}',
    '@media (max-height:480px){.dp-lede,.dp-keys,.dp-cblurb{display:none}.dp-track small.dp-sub{display:none}.dp-panel{padding:12px 14px!important}.dp-row{margin-bottom:8px}.dp-tracks{margin-bottom:8px}.dp-prev{height:56px}.dp-stats{margin-bottom:6px}}',
    '@media (max-width:420px){.dp-panel{padding:14px!important}.dp-track{padding:7px}.dp-track b{font-size:12.5px;white-space:normal;line-height:1.2}.dp-track small{font-size:11px}.dp-track small.dp-sub{display:none}.dp-lede{font-size:13px}.dp-keys{display:none}}',
  ].join('\n');

  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var ICON_L = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 4 6.5 12l9 8z"/></svg>';
  var ICON_R = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 4l9 8-9 8z"/></svg>';

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('drift-point', function (ctx) {
    var root = ctx.root;
    var ui = IGAME.ui;
    var TITLE = ctx.title || 'Drift Point';
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    /* ---------- save data ---------- */
    var save = ctx.store.get('save', null) || {};
    save.money = save.money || 0;
    save.owned = save.owned || ['sparrow'];
    save.car = save.car || 'sparrow';
    save.up = save.up || {};
    save.paint = save.paint || {};
    save.best = save.best || {};
    save.medal = save.medal || {};
    save.track = save.track || 'lot';
    function persist() { ctx.store.set('save', save); }
    function carIndex(id) { for (var i = 0; i < CARS.length; i++) if (CARS[i].id === id) return i; return 0; }
    function trackIndex(id) { for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === id) return i; return 0; }
    function levels(id) { var l = save.up[id] || {}; return { eng: l.eng || 0, tyre: l.tyre || 0, wt: l.wt || 0, steer: l.steer || 0 }; }
    function paintOf(id) { var i = save.paint[id]; return PAINTS[i == null ? CARS[carIndex(id)].paint : i]; }

    /* ---------- canvas & state ---------- */
    var W = 0, H = 0, U = 1;
    var view = IGAME.createCanvas(root, { onResize: function (w, h) { W = w; H = h; U = clamp(Math.min(w, h * 1.25) / 620, 0.7, 1.5); layoutTouch(); minimap = null; } });
    var g = view.ctx;
    var canvas = view.canvas;

    var state = 'menu'; // menu | garage | count | play | paused | results
    var track = null, tq = { i: 0, nx: 0, ny: 0, d: 0, s: 0 };
    var car = newCar();
    var carDef = CARS[0], carColor = PAINTS[0];
    var cam = { x: 0, y: 0, z: 1, shake: 0, sx: 0, sy: 0, att: 0 };
    var session = null;
    var overlay = null, menuKey = null;
    var popups = [];
    var minimap = null, mmTrack = null;
    var touchOn = !!ctx.isTouch;
    var input = { thr: 0, brk: 0, hb: 0, st: 0 };
    var tbtn = { left: false, right: false, gas: false, brk: false, hb: false };
    var mouse = { gas: false, hb: false, x: 0, y: 0 };
    var sndT = 0, skidT = 0, endT = 0;
    var debugWin = ctx.debug ? window : null;
    // ?debug=1&session=15 shortens sessions for testing
    var sessionLen = ctx.debug && Number(ctx.params.get('session')) > 0 ? Number(ctx.params.get('session')) : SESSION;

    // skid marks: ring buffer of segments [x1,y1,x2,y2] + alpha
    var MAXM = 2600, marks = new Float32Array(MAXM * 4), markA = new Float32Array(MAXM), markN = 0, markHead = 0;
    var wheelPrev = new Float32Array(8), wheelHas = [false, false, false, false];
    // particles: smoke + sparks
    var MAXP = 140, P = [];
    for (var pi = 0; pi < MAXP; pi++) P.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 1, spark: false });
    var smokeSprite = makeSmokeSprite();
    var groundPat = null, asphaltPat = null, patTheme = '';
    var patMatrix = null;
    try { patMatrix = new DOMMatrix([1 / 16, 0, 0, 1 / 16, 0, 0]); } catch (e) { patMatrix = null; }

    function makeSmokeSprite() {
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var x = c.getContext('2d');
      var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      return c;
    }

    function noisePattern(base, amount, seed) {
      var c = document.createElement('canvas');
      c.width = c.height = 96;
      var x = c.getContext('2d');
      x.fillStyle = base;
      x.fillRect(0, 0, 96, 96);
      var r = mulberry(seed);
      for (var i = 0; i < 1400; i++) {
        var a = r() * amount / 255;
        x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,' + a.toFixed(3) + ')' : 'rgba(255,255,255,' + (a * 0.8).toFixed(3) + ')';
        var s = r() < 0.85 ? 1 : 2;
        x.fillRect((r() * 96) | 0, (r() * 96) | 0, s, s);
      }
      var p = g.createPattern(c, 'repeat');
      if (p && patMatrix && p.setTransform) { try { p.setTransform(patMatrix); } catch (e) {} }
      return p || base;
    }

    /* ---------- DOM: pause button + touch controls ---------- */
    var pauseBtn = ui.el('button', 'dp-btn', ICON_PAUSE);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.display = 'none';
    pauseBtn.addEventListener('click', function (e) { e.stopPropagation(); if (state === 'play' || state === 'count') pauseGame(); });
    root.appendChild(pauseBtn);

    var touchWrap = ui.el('div', 'dp-touch');
    touchWrap.style.display = 'none';
    root.appendChild(touchWrap);
    var TB = {};
    function makeTB(key, cls, html, label) {
      var b = ui.el('div', 'dp-tb ' + cls, html);
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', label);
      function on(e) { e.preventDefault(); tbtn[key] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) {} }
      function off() { tbtn[key] = false; b.classList.remove('on'); }
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('lostpointercapture', off);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      touchWrap.appendChild(b);
      TB[key] = b;
    }
    makeTB('left', '', ICON_L, 'Steer left');
    makeTB('right', '', ICON_R, 'Steer right');
    makeTB('brk', 'brk', 'BRAKE', 'Brake / reverse');
    makeTB('hb', 'hb', 'DRIFT', 'Handbrake');
    makeTB('gas', 'gas', 'GAS', 'Throttle');
    layoutTouch();

    function layoutTouch() {
      if (!W || !TB || !TB.gas) return;
      var s = Math.round(clamp(Math.min(W, H) * 0.17, 54, 92));
      var pad = Math.round(clamp(Math.min(W, H) * 0.035, 10, 22));
      touchWrap.style.height = s * 2 + pad * 2 + 'px';
      function pos(b, left, bottom, size) {
        b.style.width = b.style.height = size + 'px';
        b.style.left = left + 'px';
        b.style.bottom = bottom + 'px';
      }
      pos(TB.left, pad, pad, s);
      pos(TB.right, pad + s + Math.round(s * 0.22), pad, s);
      var big = Math.round(s * 1.12), small = Math.round(s * 0.82);
      pos(TB.gas, W - pad - big, pad, big);
      pos(TB.hb, W - pad - big - Math.round(s * 0.18) - small, pad, small);
      pos(TB.brk, W - pad - Math.round((big + small) / 2), pad + big + Math.round(s * 0.14), small);
      TB.brk.style.left = W - pad - big + Math.round((big - small) / 2) + 'px';
      TB.brk.style.bottom = pad + big + Math.round(s * 0.16) + 'px';
      var fs = Math.round(clamp(s * 0.2, 11, 15)) + 'px';
      TB.gas.style.fontSize = TB.hb.style.fontSize = TB.brk.style.fontSize = fs;
    }

    function showTouch(v) { touchWrap.style.display = v && touchOn ? '' : 'none'; if (!v) for (var k in tbtn) { tbtn[k] = false; if (TB[k]) TB[k].classList.remove('on'); } }

    /* ---------- pointer (mouse driving + touch detection) ---------- */
    function onPointerDown(e) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (!touchOn) { touchOn = true; if (state === 'play' || state === 'count') showTouch(true); }
        return;
      }
      if (state !== 'play' && state !== 'count') return;
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (e.button === 0) mouse.gas = true;
      if (e.button === 2) mouse.hb = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    }
    function onPointerMove(e) {
      if (e.pointerType !== 'mouse') return;
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }
    function onPointerUp(e) {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) mouse.gas = false;
      if (e.button === 2) mouse.hb = false;
    }
    function onCtxMenu(e) { e.preventDefault(); }
    function onLost() { mouse.gas = false; mouse.hb = false; }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onLost);
    canvas.addEventListener('lostpointercapture', onLost);
    canvas.addEventListener('contextmenu', onCtxMenu);

    /* ---------- keyboard ---------- */
    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP', 'KeyR', 'Enter', 'Escape']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (state === 'play' || state === 'count') {
        if (code === 'KeyP' || code === 'Escape') pauseGame();
        else if (code === 'KeyR' && state === 'play') resetCar(true);
        return;
      }
      // Enter/Space on a focused overlay action button activates that button (the shell
      // blocks the browser default); anywhere else they trigger the screen's main action
      if ((code === 'Enter' || code === 'Space') && overlay) {
        var a = document.activeElement;
        if (a && a.classList && a.classList.contains('ig-btn') && overlay.el.contains(a)) { a.click(); return; }
      }
      if (menuKey) menuKey(code);
    });

    /* ---------- track / car setup ---------- */
    var trackCache = {};
    function useTrack(id) {
      if (!trackCache[id]) trackCache[id] = buildTrack(TRACKS[trackIndex(id)]);
      track = trackCache[id];
      if (patTheme !== track.def.theme) {
        var th = track.theme;
        groundPat = noisePattern(th.ground, th.speck * 3, 7);
        asphaltPat = noisePattern(th.asphalt, 40, 11);
        patTheme = track.def.theme;
      }
      minimap = null;
      markN = 0; markHead = 0;
    }

    function useCar(id) {
      var ci = carIndex(id);
      carDef = CARS[ci];
      carColor = paintOf(id);
      car.p = carParams(ci, levels(id));
    }

    function placeCar(i) {
      var tr = track;
      car.x = tr.X[i]; car.y = tr.Y[i];
      car.hd = Math.atan2(tr.TY[i], tr.TX[i]);
      car.vx = car.vy = car.w = car.steer = car.ax = 0;
      car.beta = 0; car.speed = 0; car.vF = 0; car.hint = i;
      for (var k = 0; k < 4; k++) wheelHas[k] = false;
    }

    function resetCar(manual) {
      nearest(track, car.x, car.y, car.hint, 16, tq);
      placeCar(tq.i);
      if (manual && session && session.chain.active) loseChain('RESET');
      cam.shake = 0;
    }

    /* ---------- particles ---------- */
    function spawn(x, y, vx, vy, life, r, spark) {
      for (var i = 0; i < MAXP; i++) {
        var p = P[i];
        if (!p.on) {
          p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = life; p.r = r; p.spark = spark;
          return;
        }
      }
    }
    function updateParticles(dt) {
      for (var i = 0; i < MAXP; i++) {
        var p = P[i];
        if (!p.on) continue;
        p.life += dt;
        if (p.life >= p.max) { p.on = false; continue; }
        var dmp = p.spark ? 3 : 1.6;
        p.vx *= 1 - Math.min(1, dt * dmp); p.vy *= 1 - Math.min(1, dt * dmp);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (!p.spark) p.r += dt * 1.6;
      }
    }

    function addMark(x1, y1, x2, y2, a) {
      var k = markHead * 4;
      marks[k] = x1; marks[k + 1] = y1; marks[k + 2] = x2; marks[k + 3] = y2;
      markA[markHead] = a;
      markHead = (markHead + 1) % MAXM;
      if (markN < MAXM) markN++;
    }

    /* ---------- sessions & scoring ---------- */
    function newSession() {
      return {
        t: sessionLen, score: 0, bestDrift: 0, longest: 0, topMult: 1, drifts: 0, crashes: 0, count: 3.2,
        chain: { active: false, base: 0, mult: 1, time: 0, grace: 0, close: 0 },
        angle: 0, closeNow: false, pulse: 0,
      };
    }
    function multThreshold(m) { return (1000 * m * (m + 1)) / 2; }

    function bankChain() {
      var ch = session.chain;
      if (!ch.active) return;
      var v = Math.round(ch.base * ch.mult);
      ch.active = false;
      if (v < 50) return;
      session.score += v;
      session.drifts++;
      if (v > session.bestDrift) session.bestDrift = v;
      popup('+' + fmtInt(v), '#7CFFB2', 1);
      ctx.sfx('coin');
    }
    function loseChain(why) {
      var ch = session.chain;
      if (!ch.active) return;
      var v = Math.round(ch.base * ch.mult);
      ch.active = false;
      session.crashes++;
      if (v >= 50) popup(why + '  −' + fmtInt(v), '#ff6b6b', 1);
      else popup(why, '#ff6b6b', 0.8);
      ctx.sfx('error');
    }

    function popup(text, color, size) {
      if (popups.length > 5) popups.shift();
      popups.push({ text: text, color: color, t: 0, size: size || 1 });
    }

    function startSession() {
      closeOverlay();
      useTrack(save.track);
      useCar(save.car);
      placeCar(track.startI);
      session = newSession();
      popups.length = 0;
      for (var i = 0; i < MAXP; i++) P[i].on = false;
      markN = 0; markHead = 0;
      cam.x = car.x; cam.y = car.y;
      state = 'count';
      pauseBtn.style.display = '';
      showTouch(true);
      ctx.focus();
      ctx.sfx({ f: 520, d: 0.12, type: 'square', v: 0.07 });
    }

    function endSession() {
      bankChain();
      state = 'results';
      endT = 0.9;
      pauseBtn.style.display = 'none';
      showTouch(false);
      popup('TIME!', '#ffd23f', 1.4);
      ctx.sfx('levelup');
    }

    function showResults() {
      var tid = track.def.id;
      var s = Math.round(session.score);
      var prev = save.best[tid] || 0;
      var isBest = s > prev;
      if (isBest) save.best[tid] = s;
      var earned = Math.floor(s / MONEY_RATE);
      var medal = 0;
      for (var m = 0; m < 3; m++) if (s >= track.def.medals[m]) medal = m + 1;
      var oldMedal = save.medal[tid] || 0, bonus = 0;
      for (m = oldMedal + 1; m <= medal; m++) bonus += MEDAL_REWARD[m];
      if (medal > oldMedal) save.medal[tid] = medal;
      save.money += earned + bonus;
      persist();
      if (isBest || medal > oldMedal) ctx.sfx('win');
      var next = medal < 3 ? 'Next: ' + MEDAL_NAMES[medal + 1] + ' at ' + fmtInt(track.def.medals[medal]) : 'Gold medal — maxed out!';
      var html =
        '<div class="dp-center">' +
        (isBest && s > 0 ? '<span class="dp-tag">NEW BEST</span>' : '') +
        '<div class="dp-big">' + fmtInt(s) + '</div>' +
        '<div style="font-size:13px;color:var(--text-2)">' + track.def.name + ' · Best ' + fmtInt(Math.max(prev, s)) + '</div>' +
        '<div class="dp-medals" style="justify-content:center;margin:8px 0 2px">' + medalDots(medal, 14) + '</div>' +
        '<div style="font-size:12px;color:var(--muted)">' + (medal ? MEDAL_NAMES[medal] + ' medal · ' : '') + next + '</div>' +
        '</div>' +
        '<div class="dp-grid">' +
        '<div>Best drift<b>' + fmtInt(session.bestDrift) + '</b></div>' +
        '<div>Top multiplier<b>×' + session.topMult + '</b></div>' +
        '<div>Longest chain<b>' + session.longest.toFixed(1) + ' s</b></div>' +
        '<div>Cash earned<b style="color:#ffd23f">+' + money(earned + bonus) + '</b></div>' +
        '</div>' +
        (bonus ? '<div class="dp-center" style="font-size:12px;color:#ffd23f;margin:-6px 0 10px">Includes ' + money(bonus) + ' medal bonus</div>' : '');
      openPanel('Session complete', html, [
        { label: 'Drive again', primary: true, onClick: startSession },
        { label: 'Garage', onClick: openGarage },
        { label: 'Menu', onClick: openMenu },
      ]);
      menuKey = function (code) {
        if (code === 'Enter' || code === 'Space') { ctx.sfx('click'); startSession(); }
        else if (code === 'Escape') openMenu();
      };
    }

    function medalDots(n, size) {
      var s = '';
      for (var i = 1; i <= 3; i++) s += '<i style="' + (size ? 'width:' + size + 'px;height:' + size + 'px;' : '') + 'background:' + (i <= n ? MEDAL_COLORS[i] : '#3a4060') + '"></i>';
      return s;
    }

    /* ---------- overlays ---------- */
    function closeOverlay() { if (overlay) { overlay.close(); overlay = null; } menuKey = null; }
    function openPanel(title, html, buttons) {
      closeOverlay();
      overlay = ui.overlay(root, { title: title, html: html, buttons: buttons });
      overlay.panel.classList.add('dp-panel');
      return overlay;
    }

    function openMenu() {
      state = 'menu';
      pauseBtn.style.display = 'none';
      showTouch(false);
      useTrack(save.track);
      useCar(save.car);
      placeCar(track.startI);
      session = null;
      var cards = '';
      for (var i = 0; i < TRACKS.length; i++) {
        var t = TRACKS[i];
        cards += '<button type="button" class="dp-track' + (t.id === save.track ? ' sel' : '') + '" data-t="' + t.id + '"><b>' + t.name + '</b><small>' + t.sub + '</small><small>Best ' + fmtInt(save.best[t.id] || 0) + '</small><span class="dp-medals">' + medalDots(save.medal[t.id] || 0) + '</span></button>';
      }
      var html =
        '<p class="dp-lede">Kick the tail out with throttle or the handbrake, catch it with counter-steer and chain corners for a bigger multiplier. Walls kill the chain.</p>' +
        '<div class="dp-tracks">' + cards + '</div>' +
        '<div class="dp-row"><span>Car: <b>' + carDef.name + '</b></span><span class="dp-money">' + money(save.money) + '</span></div>';
      openPanel(TITLE, html, [
        { label: 'Start ' + Math.round(SESSION / 60) + '-min session', primary: true, onClick: startSession },
        { label: 'Garage', onClick: openGarage },
      ]);
      var keys = ui.el('div', 'dp-keys', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows drive · <kbd>Space</kbd> handbrake · <kbd>P</kbd> pause · mouse: hold to drive toward the pointer');
      overlay.panel.appendChild(keys);
      var btns = overlay.panel.querySelectorAll('.dp-track');
      Array.prototype.forEach.call(btns, function (b) {
        b.addEventListener('click', function () {
          ctx.sfx('tick');
          selectTrack(b.getAttribute('data-t'));
        });
      });
      function selectTrack(id) {
        save.track = id;
        persist();
        useTrack(id);
        placeCar(track.startI);
        Array.prototype.forEach.call(btns, function (x) { x.classList.toggle('sel', x.getAttribute('data-t') === id); });
      }
      menuKey = function (code) {
        if (code === 'Enter' || code === 'Space') { ctx.sfx('click'); startSession(); }
        else if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') {
          var d = code === 'ArrowLeft' || code === 'KeyA' ? -1 : 1;
          var ti = (trackIndex(save.track) + d + TRACKS.length) % TRACKS.length;
          ctx.sfx('tick');
          selectTrack(TRACKS[ti].id);
        } else if (code === 'KeyG') openGarage();
      };
    }

    function pauseGame() {
      if (state !== 'play' && state !== 'count') return;
      session.prev = state;
      state = 'paused';
      pauseBtn.style.display = 'none';
      showTouch(false);
      mouse.gas = mouse.hb = false;
      openPanel('Paused', '<p class="dp-lede dp-center">' + track.def.name + ' · ' + IGAME.fmtTime(session.t) + ' left · Score ' + fmtInt(session.score) + '</p>', [
        { label: 'Resume', primary: true, onClick: resumeGame },
        { label: 'Reset car', onClick: function () { resumeGame(); if (state === 'play') resetCar(true); } },
        { label: 'Restart', onClick: startSession },
        { label: 'Quit', onClick: openMenu },
      ]);
      var tip = ui.el('div', 'dp-keys', 'Stuck against a wall? <kbd>R</kbd> puts the car back on the road (and ends the current chain).');
      overlay.panel.appendChild(tip);
      menuKey = function (code) {
        if (code === 'KeyP' || code === 'Escape' || code === 'Enter' || code === 'Space') resumeGame();
      };
    }
    function resumeGame() {
      if (state !== 'paused') return;
      closeOverlay();
      state = session.prev || 'play';
      pauseBtn.style.display = '';
      showTouch(true);
      ctx.focus();
    }

    /* ---------- garage ---------- */
    var gIdx = 0;
    function openGarage() {
      state = 'garage';
      pauseBtn.style.display = 'none';
      showTouch(false);
      if (!track) useTrack(save.track);
      gIdx = carIndex(save.car);
      renderGarage();
    }
    function renderGarage() {
      var c = CARS[gIdx], id = c.id, owned = save.owned.indexOf(id) >= 0, lv = levels(id);
      var p = carParams(gIdx, lv);
      var stats = [
        ['Power', Math.round(p.power / 1000) + ' kW', p.power / 1000 / 470],
        ['Grip', p.mu.toFixed(2), (p.mu - 0.7) / 0.6],
        ['Weight', Math.round(p.mass) + ' kg', 1 - (p.mass - 850) / 800],
        ['Angle', Math.round((p.maxB + 0.25) * 57.3) + '°', (p.maxB - 0.6) / 0.5],
      ];
      var sh = '';
      for (var i = 0; i < stats.length; i++) sh += '<div class="dp-stat"><span>' + stats[i][0] + ' <b style="color:#fff">' + stats[i][1] + '</b></span><div class="dp-bar"><span style="width:' + Math.round(clamp(stats[i][2], 0.05, 1) * 100) + '%"></span></div></div>';
      var paints = '', ci = save.paint[id] == null ? c.paint : save.paint[id];
      for (i = 0; i < PAINTS.length; i++) paints += '<button type="button" class="dp-paint' + (i === ci ? ' sel' : '') + '" data-p="' + i + '" style="background:' + PAINTS[i] + '" aria-label="Paint ' + (i + 1) + '"></button>';
      var ups = '';
      if (owned) {
        for (i = 0; i < UPGRADES.length; i++) {
          var u = UPGRADES[i], l = lv[u.id], pips = '';
          for (var k = 0; k < 3; k++) pips += '<i class="' + (k < l ? 'on' : '') + '"></i>';
          var btn = l >= 3 ? '<span style="font-size:12px;color:var(--muted)">MAX</span>' : '<button type="button" class="dp-buy" data-u="' + i + '"' + (save.money < upCost(gIdx, i, l) ? ' disabled' : '') + '>' + money(upCost(gIdx, i, l)) + '</button>';
          ups += '<div class="dp-up"><span><b>' + u.name + '</b><small>' + u.desc + '</small></span><span class="dp-pips">' + pips + '</span>' + btn + '</div>';
        }
      }
      var html =
        '<div class="dp-head"><span style="font-size:13px;color:var(--text-2)">Car ' + (gIdx + 1) + ' of ' + CARS.length + '</span><span class="dp-money">' + money(save.money) + '</span></div>' +
        '<div class="dp-carnav"><button type="button" class="dp-nav" data-nav="-1" aria-label="Previous car">‹</button><canvas class="dp-prev"></canvas><button type="button" class="dp-nav" data-nav="1" aria-label="Next car">›</button></div>' +
        '<div class="dp-cname">' + c.name + '</div><div class="dp-cblurb">' + c.blurb + '</div>' +
        '<div class="dp-stats">' + sh + '</div>' +
        (owned ? '<div class="dp-paints">' + paints + '</div><div class="dp-ups">' + ups + '</div>' : '');
      var buttons = [];
      if (!owned) buttons.push({ label: 'Buy ' + money(c.price), primary: true, onClick: buyCar });
      else if (save.car !== id) buttons.push({ label: 'Drive this car', primary: true, onClick: selectCar });
      else buttons.push({ label: 'Selected ✓', primary: true, onClick: openMenu });
      buttons.push({ label: 'Back', onClick: openMenu });
      var scrollTop = overlay && overlay.panel ? overlay.panel.scrollTop : 0;
      openPanel('Garage', html, buttons);
      overlay.panel.scrollTop = scrollTop;
      var buyBtn = overlay.panel.querySelector('.ig-actions .ig-btn');
      if (!owned && save.money < c.price && buyBtn) buyBtn.disabled = true;
      drawPreview(overlay.panel.querySelector('.dp-prev'), c, owned ? paintOf(id) : PAINTS[c.paint]);
      Array.prototype.forEach.call(overlay.panel.querySelectorAll('.dp-nav'), function (b) {
        b.addEventListener('click', function () { ctx.sfx('tick'); gIdx = (gIdx + Number(b.getAttribute('data-nav')) + CARS.length) % CARS.length; renderGarage(); });
      });
      Array.prototype.forEach.call(overlay.panel.querySelectorAll('.dp-paint'), function (b) {
        b.addEventListener('click', function () { ctx.sfx('pop'); save.paint[id] = Number(b.getAttribute('data-p')); persist(); if (save.car === id) useCar(id); renderGarage(); });
      });
      Array.prototype.forEach.call(overlay.panel.querySelectorAll('.dp-buy'), function (b) {
        b.addEventListener('click', function () {
          var ui2 = Number(b.getAttribute('data-u')), u = UPGRADES[ui2], l = levels(id)[u.id], cost = upCost(gIdx, ui2, l);
          if (l >= 3 || save.money < cost) { ctx.sfx('error'); return; }
          save.money -= cost;
          var rec = save.up[id] || (save.up[id] = {});
          rec[u.id] = l + 1;
          persist();
          ctx.sfx('buy');
          if (save.car === id) useCar(id);
          renderGarage();
        });
      });
      function buyCar() {
        if (save.money < c.price) { ctx.sfx('error'); return; }
        save.money -= c.price;
        save.owned.push(id);
        save.car = id;
        persist();
        ctx.sfx('buy');
        useCar(id);
        renderGarage();
      }
      function selectCar() { save.car = id; persist(); useCar(id); renderGarage(); }
      menuKey = function (code) {
        if (code === 'ArrowLeft' || code === 'KeyA') { ctx.sfx('tick'); gIdx = (gIdx - 1 + CARS.length) % CARS.length; renderGarage(); }
        else if (code === 'ArrowRight' || code === 'KeyD') { ctx.sfx('tick'); gIdx = (gIdx + 1) % CARS.length; renderGarage(); }
        else if (code === 'Escape') openMenu();
        else if (code === 'Enter') { if (!owned) buyCar(); else if (save.car !== id) selectCar(); else openMenu(); }
      };
    }

    function drawPreview(cv, def, color) {
      if (!cv) return;
      var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      cv.width = w * dpr; cv.height = h * dpr;
      var x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.12)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, w, h);
      var sc = Math.min((w * 0.8) / def.len, (h * 0.8) / def.wid);
      x.translate(w / 2, h / 2);
      x.scale(sc, sc);
      x.rotate(-0.12);
      drawCar(x, def, color, 0.25, 0);
    }

    /* ---------- update ---------- */
    var Z = { thr: 0, brk: 0, hb: 0, st: 0 };
    function readInput() {
      var k = ctx.keys;
      var left = k.KeyA || k.ArrowLeft || tbtn.left, right = k.KeyD || k.ArrowRight || tbtn.right;
      input.thr = k.KeyW || k.ArrowUp || tbtn.gas || mouse.gas ? 1 : 0;
      input.brk = k.KeyS || k.ArrowDown || tbtn.brk ? 1 : 0;
      input.hb = k.Space || tbtn.hb || mouse.hb ? 1 : 0;
      input.st = (right ? 1 : 0) - (left ? 1 : 0);
      if (mouse.gas && !left && !right) {
        // mouse: steer the nose toward the pointer
        var sc = cam.z, wx = cam.x + (mouse.x - cam.sx) / sc, wy = cam.y + (mouse.y - cam.sy) / sc;
        var da = wrapA(Math.atan2(wy - car.y, wx - car.x) - car.hd);
        input.st = clamp(da / 0.6, -1, 1);
        if (Math.abs(da) > 2.4 && car.speed < 4) { input.thr = 0; input.brk = 1; }
      }
      return input;
    }

    function physics(dt, inp) {
      var n = Math.ceil(dt / (1 / 120)), h = dt / n, tr = track;
      for (var s = 0; s < n; s++) {
        stepCar(car, inp, h);
        collide(tr, h);
      }
    }

    // wall collision: test the four body corners against the track ribbon
    var CX = [1, 1, -1, -1], CY = [1, -1, 1, -1];
    function collide(tr, dt) {
      nearest(tr, car.x, car.y, car.hint, 6, tq);
      car.hint = tq.i;
      var c = Math.cos(car.hd), s = Math.sin(car.hd), hl = carDef.len / 2 - 0.15, hw = carDef.wid / 2 - 0.05;
      var wall = tr.wallHW, hit = 0;
      for (var k = 0; k < 4; k++) {
        var lx = CX[k] * hl, ly = CY[k] * hw;
        var rx = lx * c - ly * s, ry = lx * s + ly * c;
        nearest(tr, car.x + rx, car.y + ry, car.hint, 3, tq);
        var ad = Math.abs(tq.d);
        if (ad <= wall) continue;
        var sg = tq.d > 0 ? -1 : 1, nx = tq.nx * sg, ny = tq.ny * sg, pen = ad - wall;
        car.x += nx * pen; car.y += ny * pen;
        var vpx = car.vx - car.w * ry, vpy = car.vy + car.w * rx;
        var vn = vpx * nx + vpy * ny;
        if (vn >= 0) continue;
        var m = car.p.mass, I = car.p.I, rn = rx * ny - ry * nx;
        var j = (-(1 + 0.25) * vn) / (1 / m + (rn * rn) / I);
        car.vx += (j * nx) / m; car.vy += (j * ny) / m; car.w += (rn * j) / I;
        // wall friction
        var tx = -ny, ty = nx, vt = vpx * tx + vpy * ty, rt = rx * ty - ry * tx;
        var jt = clamp(-vt / (1 / m + (rt * rt) / I), -0.35 * j, 0.35 * j);
        car.vx += (jt * tx) / m; car.vy += (jt * ty) / m; car.w += (rt * jt) / I;
        if (-vn > hit) { hit = -vn; hitX = car.x + rx; hitY = car.y + ry; hitNx = nx; hitNy = ny; }
      }
      if (hit > 0) onWallHit(hit);
    }
    var hitX = 0, hitY = 0, hitNx = 0, hitNy = 0, hitCool = 0;
    function onWallHit(v) {
      if (v < 1.2) return;
      var sparks = Math.min(14, Math.round(v * 1.5));
      for (var i = 0; i < sparks; i++) {
        var a = Math.atan2(hitNy, hitNx) + (Math.random() - 0.5) * 2.4, sp = 4 + Math.random() * 9;
        spawn(hitX, hitY, Math.cos(a) * sp + car.vx * 0.3, Math.sin(a) * sp + car.vy * 0.3, 0.25 + Math.random() * 0.25, 0.08, true);
      }
      if (hitCool > 0) return;
      hitCool = 0.25;
      cam.shake = Math.min(1, cam.shake + v / 10);
      if (v > 3) {
        ctx.sfx('hit');
        if (session && state === 'play' && session.chain.active) loseChain('WALL HIT');
      } else ctx.sfx({ f: 160, f2: 90, d: 0.08, type: 'square', v: 0.05 });
    }

    function scoring(dt) {
      var ch = session.chain;
      session.pulse = Math.max(0, session.pulse - dt * 3);
      var ang = Math.abs(car.beta) * 57.2958, sp = car.speed;
      session.angle = ang;
      nearest(track, car.x, car.y, car.hint, 2, tq);
      var margin = track.wallHW - Math.abs(tq.d) - carDef.wid / 2;
      var drifting = sp > 6 && car.vF > 1 && ang > 12 && ang < 110;
      session.closeNow = drifting && margin < 1.4;
      if (ch.active && (ang > 125 || car.vF < -1)) { loseChain('SPIN OUT'); return; }
      if (drifting) {
        if (!ch.active) { ch.active = true; ch.base = 0; ch.mult = 1; ch.time = 0; }
        ch.grace = GRACE;
        var rate = (ang - 8) * sp * (session.closeNow ? 1.5 : 1);
        ch.base += rate * dt;
        ch.time += dt;
        if (ch.time > session.longest) session.longest = ch.time;
        while (ch.mult < MAX_MULT && ch.base >= multThreshold(ch.mult)) {
          ch.mult++;
          session.pulse = 1;
          if (ch.mult > session.topMult) session.topMult = ch.mult;
          ctx.sfx({ f: 500 + ch.mult * 90, f2: 800 + ch.mult * 110, d: 0.14, type: 'triangle', v: 0.12 });
        }
      } else if (ch.active) {
        ch.grace -= dt;
        if (ch.grace <= 0) bankChain();
      }
    }

    function effects(dt) {
      // tyre marks + smoke from wheels that are sliding
      var c = Math.cos(car.hd), s = Math.sin(car.hd), hl = carDef.len * 0.31, hw = carDef.wid / 2 - 0.12;
      var rearSlide = car.speed > 2.5 && (car.slipR > 0.16 || car.spin > 0.05 || (car.brake > 0.5 && car.speed > 4));
      var frontSlide = car.speed > 4 && car.slipF > 0.3;
      var intensity = clamp(Math.max(car.slipR - 0.12, car.spin) * 2.2, 0, 1);
      for (var k = 0; k < 4; k++) {
        var lx = k < 2 ? -hl : hl, ly = k % 2 ? hw : -hw;
        var wx = car.x + lx * c - ly * s, wy = car.y + lx * s + ly * c;
        var sliding = k < 2 ? rearSlide : frontSlide;
        if (sliding && wheelHas[k]) {
          var px = wheelPrev[k * 2], py = wheelPrev[k * 2 + 1];
          var dd = (wx - px) * (wx - px) + (wy - py) * (wy - py);
          if (dd > 0.09) {
            if (dd < 9) addMark(px, py, wx, wy, k < 2 ? 0.22 + intensity * 0.3 : 0.18);
            wheelPrev[k * 2] = wx; wheelPrev[k * 2 + 1] = wy;
          }
        } else { wheelPrev[k * 2] = wx; wheelPrev[k * 2 + 1] = wy; wheelHas[k] = true; }
        if (!sliding) continue;
        if (k < 2 && Math.random() < dt * (12 + intensity * 40)) {
          spawn(wx, wy, car.vx * 0.25 + (Math.random() - 0.5) * 2, car.vy * 0.25 + (Math.random() - 0.5) * 2, 0.9 + Math.random() * 0.8, 0.5 + intensity * 0.5, false);
        }
      }
      // skid audio
      skidT -= dt;
      if (rearSlide && skidT <= 0) {
        skidT = 0.11;
        IGAME.sfx.noise({ d: 0.14, f: 1800 + intensity * 1600, v: 0.03 + intensity * 0.05 });
      }
      // engine: short overlapping saw pulses whose pitch follows a fake gearbox
      sndT -= dt;
      if (sndT <= 0 && (state === 'play' || state === 'count')) {
        sndT = 0.075;
        var sp = Math.abs(car.vF), gearTop = [9, 17, 26, 36, 48, 99], gi = 0;
        while (sp > gearTop[gi]) gi++;
        var lo = gi ? gearTop[gi - 1] : 0, rpm = clamp((sp - lo) / (gearTop[gi] - lo), 0, 1);
        if (input.thr && car.spin > 0.1) rpm = Math.min(1, rpm + car.spin * 0.6);
        var f = 62 + rpm * 70 + gi * 6;
        ctx.sfx({ f: f, f2: f * 1.04, d: 0.1, type: 'sawtooth', v: input.thr ? 0.035 : 0.016 });
      }
    }

    function updateCamera(dt, follow) {
      var base = Math.sqrt(W * H) / 52;
      var targetZ = follow ? base / (1 + car.speed / 70) : base * 0.7;
      cam.z += (targetZ - cam.z) * Math.min(1, dt * 2);
      var tx, ty;
      if (follow) { tx = car.x + car.vx * 0.42; ty = car.y + car.vy * 0.42; }
      else {
        // attract mode: drift the camera slowly along the centreline
        cam.att = (cam.att + dt * 10) % track.len;
        var i = Math.floor((cam.att / track.len) * track.N) % track.N;
        tx = track.X[i]; ty = track.Y[i];
      }
      var k = 1 - Math.exp(-dt * (follow ? 4.5 : 1.2));
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
      cam.shake = Math.max(0, cam.shake - dt * 2.2);
      var sh = cam.shake * cam.shake * 0.7;
      cam.sx = W / 2 + (Math.random() - 0.5) * sh * cam.z;
      cam.sy = (touchOn && (state === 'play' || state === 'count') ? H * 0.42 : H * 0.5) + (Math.random() - 0.5) * sh * cam.z;
    }

    function update(dt) {
      if (!track) return;
      hitCool = Math.max(0, hitCool - dt);
      if (state === 'count') {
        session.count -= dt;
        var before = Math.ceil(session.count + dt), after = Math.ceil(session.count);
        if (after !== before && after > 0) ctx.sfx({ f: 520, d: 0.12, type: 'square', v: 0.07 });
        if (session.count <= 0) { state = 'play'; ctx.sfx({ f: 880, d: 0.25, type: 'square', v: 0.08 }); popup('GO!', '#7CFFB2', 1.3); }
        physics(dt, Z);
        updateCamera(dt, true);
      } else if (state === 'play') {
        var inp = readInput();
        physics(dt, inp);
        session.t -= dt;
        scoring(dt);
        effects(dt);
        updateCamera(dt, true);
        if (session.t <= 0) { session.t = 0; endSession(); }
      } else if (state === 'results') {
        physics(dt, Z);
        effects(dt);
        updateCamera(dt, true);
        if (endT > 0) { endT -= dt; if (endT <= 0) showResults(); }
      } else if (state === 'menu' || state === 'garage') {
        updateCamera(dt, false);
      }
      if (state !== 'paused') {
        updateParticles(dt);
        for (var i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.6) popups.splice(i, 1); }
      }
      if (debugWin) debugWin.__dp = { state: state, car: car, session: session, cam: cam, track: track && track.def.id, tr: track, save: save };
    }

    /* ---------- rendering ---------- */
    function render() {
      var dpr = view.dpr, sc = cam.z;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!track) { g.fillStyle = '#0b0d17'; g.fillRect(0, 0, W, H); return; }
      var th = track.theme;
      var vx0 = cam.x - cam.sx / sc, vy0 = cam.y - cam.sy / sc, vx1 = cam.x + (W - cam.sx) / sc, vy1 = cam.y + (H - cam.sy) / sc;
      g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * (cam.sx - cam.x * sc), dpr * (cam.sy - cam.y * sc));
      g.fillStyle = groundPat || th.ground;
      g.fillRect(vx0 - 1, vy0 - 1, vx1 - vx0 + 2, vy1 - vy0 + 2);
      drawDecos(vx0, vy0, vx1, vy1, true);
      drawTrack(vx0, vy0, vx1, vy1);
      drawMarks(vx0, vy0, vx1, vy1);
      drawDecos(vx0, vy0, vx1, vy1, false);
      // car
      g.save();
      g.translate(car.x, car.y);
      g.rotate(car.hd);
      drawCar(g, carDef, carColor, car.steer, car.brake);
      g.restore();
      drawParticles(th);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawHud();
    }

    function inView(b, x0, y0, x1, y1) { return b[2] >= x0 && b[0] <= x1 && b[3] >= y0 && b[1] <= y1; }

    function drawTrack(x0, y0, x1, y1) {
      var tr = track, th = tr.theme, ch = tr.chunks, n = ch.length, i, hw = tr.hw;
      var vis = visChunks;
      vis.length = 0;
      for (i = 0; i < n; i++) if (inView(ch[i].b, x0, y0, x1, y1)) vis.push(ch[i]);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      // barrier, run-off, curbs, asphalt, lines
      g.strokeStyle = th.wallDark;
      g.lineWidth = 2 * (tr.wallHW + 0.75);
      for (i = 0; i < vis.length; i++) g.stroke(vis[i].path);
      g.strokeStyle = th.wall;
      g.lineWidth = 2 * (tr.wallHW + 0.5);
      for (i = 0; i < vis.length; i++) g.stroke(vis[i].path);
      g.strokeStyle = th.runoff;
      g.lineWidth = 2 * tr.wallHW;
      for (i = 0; i < vis.length; i++) g.stroke(vis[i].path);
      g.lineCap = 'butt';
      for (i = 0; i < vis.length && th.curbA; i++) {
        var c = vis[i];
        if (!c.curb) continue;
        g.strokeStyle = th.curbA;
        g.lineWidth = 2 * hw + 2;
        g.stroke(c.curb);
        g.setLineDash(curbDash);
        g.lineDashOffset = -c.s0;
        g.strokeStyle = th.curbB;
        g.stroke(c.curb);
        g.setLineDash(noDash);
      }
      g.lineCap = 'round';
      g.strokeStyle = asphaltPat || th.asphalt;
      g.lineWidth = 2 * hw;
      for (i = 0; i < vis.length; i++) g.stroke(vis[i].path);
      g.strokeStyle = th.line;
      g.lineWidth = 0.22;
      for (i = 0; i < vis.length; i++) g.stroke(vis[i].edges);
      if (th.center) {
        g.strokeStyle = th.center;
        g.lineWidth = 0.2;
        g.lineCap = 'butt';
        g.setLineDash(centerDash);
        for (i = 0; i < vis.length; i++) { g.lineDashOffset = -vis[i].s0; g.stroke(vis[i].path); }
        g.setLineDash(noDash);
      }
      // start / finish checker
      var si = tr.startI, sx = tr.X[si], sy = tr.Y[si], a = Math.atan2(tr.TY[si], tr.TX[si]);
      if (sx > x0 - 20 && sx < x1 + 20 && sy > y0 - 20 && sy < y1 + 20) {
        g.save();
        g.translate(sx, sy);
        g.rotate(a);
        var cells = Math.round(hw * 2 / 1.2), cs = (hw * 2) / cells;
        for (var r = 0; r < 2; r++) for (var q = 0; q < cells; q++) {
          g.fillStyle = (r + q) % 2 ? '#111' : '#f4f4f4';
          g.fillRect(-4 + r * cs, -hw + q * cs, cs, cs);
        }
        g.restore();
      }
    }
    var visChunks = [], curbDash = [1.6, 1.6], centerDash = [3, 4], noDash = [];

    function drawMarks(x0, y0, x1, y1) {
      if (!markN) return;
      g.lineCap = 'round';
      g.lineWidth = 0.28;
      // three alpha buckets keep it to three strokes per frame
      for (var b = 0; b < 3; b++) {
        var lo = b === 0 ? 0 : b === 1 ? 0.3 : 0.42, hi = b === 0 ? 0.3 : b === 1 ? 0.42 : 9;
        g.beginPath();
        var any = false;
        for (var i = 0; i < markN; i++) {
          var a = markA[i];
          if (a < lo || a >= hi) continue;
          var k = i * 4, mx = marks[k], my = marks[k + 1];
          if (mx < x0 - 2 || mx > x1 + 2 || my < y0 - 2 || my > y1 + 2) continue;
          g.moveTo(mx, my);
          g.lineTo(marks[k + 2], marks[k + 3]);
          any = true;
        }
        if (any) { g.strokeStyle = 'rgba(16,16,18,' + (b === 0 ? 0.26 : b === 1 ? 0.38 : 0.5) + ')'; g.stroke(); }
      }
    }

    function drawDecos(x0, y0, x1, y1, ground) {
      var grid = track.decoGrid;
      var cx0 = Math.floor((x0 - 30) / CELL), cx1 = Math.floor((x1 + 30) / CELL), cy0 = Math.floor((y0 - 30) / CELL), cy1 = Math.floor((y1 + 30) / CELL);
      for (var cx = cx0; cx <= cx1; cx++) for (var cy = cy0; cy <= cy1; cy++) {
        var list = grid[cx * 4096 + cy];
        if (!list) continue;
        for (var i = 0; i < list.length; i++) {
          var o = list[i], isG = o.t === 'bay' || o.t === 'park';
          if (isG !== ground) continue;
          drawDeco(o);
        }
      }
    }

    var TREE_COLS = [['#1f4d27', '#2f7a3a', '#4c9a4f'], ['#21502b', '#2c6e33', '#5aa556'], ['#2a4f22', '#3d7a2c', '#6aa846']];
    function drawDeco(o) {
      var i;
      switch (o.t) {
        case 'tree':
        case 'pine': {
          var c = TREE_COLS[o.c];
          g.fillStyle = 'rgba(0,0,0,0.28)';
          g.beginPath(); g.arc(o.x + o.r * 0.35, o.y + o.r * 0.45, o.r, 0, TAU); g.fill();
          g.fillStyle = c[0];
          g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill();
          g.fillStyle = c[1];
          g.beginPath(); g.arc(o.x - o.r * 0.18, o.y - o.r * 0.18, o.r * 0.72, 0, TAU); g.fill();
          g.fillStyle = c[2];
          g.beginPath(); g.arc(o.x - o.r * 0.32, o.y - o.r * 0.34, o.r * (o.t === 'pine' ? 0.22 : 0.34), 0, TAU); g.fill();
          break;
        }
        case 'rock':
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.beginPath(); g.arc(o.x + 0.4, o.y + 0.5, o.r, 0, TAU); g.fill();
          g.fillStyle = '#8b8f8a';
          g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill();
          g.fillStyle = '#a9ada6';
          g.beginPath(); g.arc(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.55, 0, TAU); g.fill();
          break;
        case 'bld': {
          var hx = o.w / 2, hy = o.h / 2, sh = o.ht * 0.6;
          g.fillStyle = 'rgba(0,0,0,0.32)';
          g.fillRect(o.x - hx + sh, o.y - hy + sh, o.w, o.h);
          g.fillStyle = o.col;
          g.fillRect(o.x - hx, o.y - hy, o.w, o.h);
          g.fillStyle = 'rgba(255,255,255,0.13)';
          g.fillRect(o.x - hx, o.y - hy, o.w, 0.8);
          g.fillRect(o.x - hx, o.y - hy, 0.8, o.h);
          g.fillStyle = 'rgba(0,0,0,0.16)';
          g.fillRect(o.x - hx + 1.2, o.y - hy + 1.2, o.w - 2.4, o.h - 2.4);
          g.fillStyle = o.col;
          g.fillRect(o.x - hx + 1.6, o.y - hy + 1.6, o.w - 3.2, o.h - 3.2);
          if (o.big) {
            g.fillStyle = 'rgba(0,0,0,0.12)';
            for (i = 0; i < 12; i++) g.fillRect(o.x - hx + 3 + i * 5.5, o.y - hy + 2, 0.5, o.h - 4);
            g.fillStyle = '#e8ebef';
            g.font = '900 6px ' + FONT;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText('FOUNDRY', o.x, o.y + 0.5);
          }
          if (o.ac) {
            g.fillStyle = '#c9ced6';
            g.fillRect(o.x - hx + 3, o.y - hy + 3, 2.6, 2);
            g.fillStyle = '#9aa1ab';
            g.fillRect(o.x + hx - 6, o.y + hy - 5, 2.2, 2.2);
          }
          break;
        }
        case 'park':
          g.fillStyle = '#3f7a3d';
          g.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
          g.fillStyle = '#c9b48a';
          g.fillRect(o.x - o.w / 2, o.y - 0.6, o.w, 1.2);
          break;
        case 'lamp':
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.beginPath(); g.arc(o.x + 0.3, o.y + 0.3, 0.35, 0, TAU); g.fill();
          g.fillStyle = '#3a3f47';
          g.beginPath(); g.arc(o.x, o.y, 0.3, 0, TAU); g.fill();
          g.strokeStyle = '#3a3f47';
          g.lineWidth = 0.18;
          g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + Math.cos(o.a) * 1.6, o.y + Math.sin(o.a) * 1.6); g.stroke();
          g.fillStyle = 'rgba(255,236,170,0.9)';
          g.beginPath(); g.arc(o.x + Math.cos(o.a) * 1.7, o.y + Math.sin(o.a) * 1.7, 0.28, 0, TAU); g.fill();
          break;
        case 'cont':
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(o.x - o.w / 2 + 0.7, o.y - o.h / 2 + 0.7, o.w, o.h);
          g.fillStyle = o.col;
          g.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
          g.fillStyle = 'rgba(0,0,0,0.18)';
          if (o.w > o.h) for (i = 1; i < 12; i++) g.fillRect(o.x - o.w / 2 + i, o.y - o.h / 2, 0.12, o.h);
          else for (i = 1; i < 12; i++) g.fillRect(o.x - o.w / 2, o.y - o.h / 2 + i, o.w, 0.12);
          break;
        case 'bay':
          g.fillStyle = 'rgba(240,240,240,0.55)';
          for (i = 0; i <= o.n; i++) {
            if (o.horiz) g.fillRect(o.x + i * 2.7, o.y, 0.14, 5);
            else g.fillRect(o.x, o.y + i * 2.7, 5, 0.14);
          }
          break;
        case 'cone':
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.beginPath(); g.arc(o.x + 0.15, o.y + 0.2, 0.42, 0, TAU); g.fill();
          g.fillStyle = '#ff7a1a';
          g.beginPath(); g.arc(o.x, o.y, 0.4, 0, TAU); g.fill();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(o.x, o.y, 0.18, 0, TAU); g.fill();
          break;
        case 'tyres':
          g.fillStyle = '#1b1d21';
          g.beginPath(); g.arc(o.x, o.y, 0.55, 0, TAU); g.arc(o.x + 1.1, o.y, 0.55, 0, TAU); g.fill();
          g.fillStyle = '#3b3f46';
          g.beginPath(); g.arc(o.x, o.y, 0.22, 0, TAU); g.arc(o.x + 1.1, o.y, 0.22, 0, TAU); g.fill();
          break;
      }
    }

    function drawParticles(th) {
      var i, p;
      for (i = 0; i < MAXP; i++) {
        p = P[i];
        if (!p.on || p.spark) continue;
        var k = p.life / p.max;
        g.globalAlpha = (1 - k) * 0.55;
        g.drawImage(smokeSprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      g.globalAlpha = 1;
      g.strokeStyle = '#ffd36b';
      g.lineWidth = 0.12;
      g.beginPath();
      for (i = 0; i < MAXP; i++) {
        p = P[i];
        if (!p.on || !p.spark) continue;
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      }
      g.stroke();
    }

    /* ---------- HUD ---------- */
    var curFont = '';
    function font(px, w) {
      var f = (w || 800) + ' ' + Math.round(px) + 'px ' + FONT;
      if (f !== curFont) { g.font = f; curFont = f; }
    }
    function text(s, x, y, px, color, align, w) {
      font(px, w);
      g.textAlign = align || 'left';
      g.lineWidth = Math.max(2, px * 0.16);
      g.strokeStyle = 'rgba(5,6,14,0.75)';
      g.strokeText(s, x, y);
      g.fillStyle = color || '#fff';
      g.fillText(s, x, y);
    }
    function panel(x, y, w, h, r) {
      g.fillStyle = 'rgba(5,6,14,0.55)';
      rrect(g, x, y, w, h, r);
      g.fill();
    }

    function drawHud() {
      curFont = '';
      g.textBaseline = 'alphabetic';
      g.lineJoin = 'round';
      var u = U;
      if (state === 'menu' || state === 'garage') {
        // gentle vignette behind menus
        var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(5,6,14,0)');
        vg.addColorStop(1, 'rgba(5,6,14,0.55)');
        g.fillStyle = vg;
        g.fillRect(0, 0, W, H);
        return;
      }
      if (!session) return;
      var pad = Math.round(10 * Math.max(1, u));
      // score (top-left)
      panel(pad, pad, 150 * u + 20, 54 * u + 6, 12);
      text('SCORE', pad + 12, pad + 18 * u, 11 * u, '#aab0d6', 'left', 800);
      text(fmtInt(session.score), pad + 12, pad + 44 * u, 25 * u, '#fff', 'left', 900);
      // timer (top-centre)
      var tl = Math.max(0, session.t), mm = Math.floor(tl / 60), ss = Math.floor(tl % 60);
      var tstr = mm + ':' + (ss < 10 ? '0' : '') + ss;
      text(tstr, W / 2, pad + 30 * u, 30 * u, tl < 10 && state === 'play' ? '#ff7070' : '#fff', 'center', 900);
      text(track.def.name.toUpperCase(), W / 2, pad + 46 * u, 10 * u, '#aab0d6', 'center', 800);
      // minimap (top-right, under the pause button)
      drawMinimap(pad);
      // speed (bottom-left; moved above the touch buttons on touch)
      var kmh = Math.round(car.speed * 3.6);
      if (touchOn) {
        text(kmh + ' km/h', pad + 4, pad + 54 * u + 28 * u, 15 * u, '#fff', 'left', 900);
      } else {
        panel(pad, H - pad - 58 * u, 120 * u, 58 * u, 12);
        text(String(kmh), pad + 12, H - pad - 18 * u, 30 * u, '#fff', 'left', 900);
        text('KM/H', pad + 14 + g.measureText(String(kmh)).width, H - pad - 18 * u, 11 * u, '#aab0d6', 'left', 800);
        drawAngleGauge(pad + 120 * u + 46 * u, H - pad - 30 * u, 26 * u);
      }
      // chain
      var ch = session.chain, cy = pad + 86 * u;
      if (ch.active) {
        var val = Math.round(ch.base * ch.mult), pulse = 1 + 0.35 * session.pulse * session.pulse;
        var vs = '+' + fmtInt(val);
        text(vs, W / 2, cy + 8 * u, 30 * u, '#7CFFB2', 'center', 900);
        // multiplier badge (pops when it goes up)
        font(30 * u, 900);
        var bw = g.measureText(vs).width;
        text('×' + ch.mult, W / 2 + bw / 2 + 10 * u, cy + 8 * u, 22 * u * pulse, multColor(ch.mult), 'left', 900);
        // bar: progress to next multiplier while drifting; grace countdown when not
        var bwid = 170 * u, bx = W / 2 - bwid / 2, by = cy + 18 * u;
        g.fillStyle = 'rgba(5,6,14,0.6)';
        rrect(g, bx, by, bwid, 7 * u, 4 * u);
        g.fill();
        var drifting = ch.grace >= GRACE - 0.001;
        var frac = drifting ? (ch.mult >= MAX_MULT ? 1 : (ch.base - (ch.mult > 1 ? multThreshold(ch.mult - 1) : 0)) / (multThreshold(ch.mult) - (ch.mult > 1 ? multThreshold(ch.mult - 1) : 0))) : ch.grace / GRACE;
        g.fillStyle = drifting ? multColor(ch.mult) : '#ffb347';
        rrect(g, bx, by, Math.max(4, bwid * clamp(frac, 0, 1)), 7 * u, 4 * u);
        g.fill();
        var lbl = drifting ? 'DRIFT ' + Math.round(session.angle) + '°' : 'LINK IT!';
        text(lbl, W / 2, by + 24 * u, 12 * u, drifting ? '#fff' : '#ffb347', 'center', 900);
        if (session.closeNow) text('WALL KISS ×1.5', W / 2, by + 40 * u, 12 * u, '#ffd23f', 'center', 900);
      }
      // popups
      for (var i = 0; i < popups.length; i++) {
        var p = popups[i], k = p.t / 1.6, a = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
        g.globalAlpha = clamp(a, 0, 1);
        var sz = 24 * u * p.size * (k < 0.12 ? 0.7 + (k / 0.12) * 0.3 : 1);
        text(p.text, W / 2, H * 0.36 - k * 40 * u - (popups.length - 1 - i) * 30 * u, sz, p.color, 'center', 900);
      }
      g.globalAlpha = 1;
      // countdown
      if (state === 'count') {
        var n = Math.ceil(session.count), fr = session.count - Math.floor(session.count);
        var sz2 = 90 * u * (0.8 + fr * 0.4);
        g.globalAlpha = clamp(fr * 1.5, 0, 1);
        text(String(n), W / 2, H * 0.3 + 30 * u, sz2, '#ffd23f', 'center', 900);
        g.globalAlpha = 1;
        var hint = touchOn ? 'Hold GAS · tap DRIFT in a corner · steer to hold the slide' : 'W / ↑ throttle · A D / ← → steer · Space handbrake';
        font(13 * u, 800);
        var hwid = g.measureText(hint).width + 24;
        panel(W / 2 - hwid / 2, H * 0.62, hwid, 26 * u, 10);
        text(hint, W / 2, H * 0.62 + 18 * u, 13 * u, '#fff', 'center', 800);
      }
    }

    function multColor(m) { return m >= 7 ? '#ff5bd1' : m >= 5 ? '#ff8a3d' : m >= 3 ? '#ffd23f' : '#7CFFB2'; }

    function drawAngleGauge(cx, cy, r) {
      g.fillStyle = 'rgba(5,6,14,0.55)';
      g.beginPath(); g.arc(cx, cy, r + 8, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.lineWidth = 4;
      g.beginPath(); g.arc(cx, cy, r, Math.PI, TAU); g.stroke();
      var ang = clamp(session.angle / 90, 0, 1);
      g.strokeStyle = ang > 0.13 ? '#7CFFB2' : 'rgba(255,255,255,0.4)';
      g.beginPath(); g.arc(cx, cy, r, Math.PI, Math.PI + ang * Math.PI); g.stroke();
      text(Math.round(session.angle) + '°', cx, cy + 4, 12 * U, '#fff', 'center', 900);
    }

    function drawMinimap(pad) {
      var size = Math.round(clamp(Math.min(W, H) * 0.22, 70, 160));
      if (!minimap || mmTrack !== track || minimap.width !== Math.round(size * view.dpr)) buildMinimap(size);
      var x = W - pad - size, y = pad + 52;
      g.drawImage(minimap, x, y, size, size);
      var m = minimap.meta;
      var px = x + (car.x - m.x0) * m.s + m.ox, py = y + (car.y - m.y0) * m.s + m.oy;
      g.save();
      g.translate(px, py);
      g.rotate(car.hd);
      g.fillStyle = carColor;
      g.strokeStyle = '#fff';
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4); g.lineTo(-4, 4); g.closePath();
      g.fill(); g.stroke();
      g.restore();
    }
    function buildMinimap(size) {
      var dpr = view.dpr, c = document.createElement('canvas');
      c.width = Math.round(size * dpr); c.height = Math.round(size * dpr);
      var x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = 'rgba(5,6,14,0.55)';
      rrect(x, 0, 0, size, size, 12);
      x.fill();
      var b = track.bbox, bw = b[2] - b[0], bh = b[3] - b[1], inner = size - 16, s = Math.min(inner / bw, inner / bh);
      var ox = 8 + (inner - bw * s) / 2, oy = 8 + (inner - bh * s) / 2;
      x.save();
      x.translate(ox, oy);
      x.scale(s, s);
      x.translate(-b[0], -b[1]);
      x.lineJoin = 'round';
      x.strokeStyle = 'rgba(255,255,255,0.85)';
      x.lineWidth = Math.max(track.def.w, 3 / s);
      x.beginPath();
      for (var i = 0; i <= track.N; i++) { var k = i % track.N; if (!i) x.moveTo(track.X[k], track.Y[k]); else x.lineTo(track.X[k], track.Y[k]); }
      x.stroke();
      x.strokeStyle = '#ffd23f';
      x.lineWidth = Math.max(1.5 / s, 1);
      var si = track.startI, tx = track.TX[si], ty = track.TY[si];
      x.beginPath();
      x.moveTo(track.X[si] + ty * track.hw, track.Y[si] - tx * track.hw);
      x.lineTo(track.X[si] - ty * track.hw, track.Y[si] + tx * track.hw);
      x.stroke();
      x.restore();
      c.meta = { x0: b[0], y0: b[1], s: s, ox: ox, oy: oy };
      minimap = c;
      mmTrack = track;
    }

    /* ---------- main loop ---------- */
    var time = 0;
    var loop = IGAME.loop(function (dt) {
      time += dt;
      update(dt);
      render();
    });

    openMenu();
    loop.start();

    return {
      pause: function () {
        if (state === 'play' || state === 'count') pauseGame();
        loop.stop();
      },
      resume: function () { loop.start(); },
      destroy: function () {
        loop.stop();
        closeOverlay();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onLost);
        canvas.removeEventListener('lostpointercapture', onLost);
        canvas.removeEventListener('contextmenu', onCtxMenu);
        view.destroy();
        if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        if (touchWrap.parentNode) touchWrap.parentNode.removeChild(touchWrap);
        if (pauseBtn.parentNode) pauseBtn.parentNode.removeChild(pauseBtn);
        if (debugWin) { try { delete debugWin.__dp; } catch (e) {} }
      },
    };
  });
})();
