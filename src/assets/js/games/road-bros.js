/*!
 * Turbo Buddies — igame9 original top-down party racer (engine id: road-bros)
 * 1 player vs CPU or 2 players on one keyboard (WASD + arrows). Four tracks,
 * laps, countdown, boost pads, oil slicks, ice, knock-over cones, car-to-car
 * bumping, live positions and a results table. Camera frames both players.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function wrapA(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function mulberry(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fmtTime(t) {
    if (t == null || !isFinite(t)) return '--:--.-';
    var m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }
  function ord(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */
  // Tracks: polygon corners [x, y, fillet radius] in metres, driven clockwise.
  // Hazards: [type, fraction of lap, lateral offset in m]
  var TRACKS = [
    {
      id: 'park', name: 'Picnic Park', sub: 'Grass & a chicane', theme: 'park', start: 0.13,
      verts: [[20, 20, 25], [240, 20, 25], [240, 130, 28], [155, 130, 16], [125, 92, 12], [95, 130, 16], [20, 130, 25]],
      haz: [['boost', 0.2, -3], ['boost', 0.6, 3], ['oil', 0.33, 2.5], ['oil', 0.8, -2], ['cones', 0.48, 0], ['cones', 0.93, 3]],
    },
    {
      id: 'dunes', name: 'Dune Dash', sub: 'Sand traps & a V-turn', theme: 'dunes', start: 0.105,
      verts: [[20, 20, 20], [140, 20, 18], [170, 62, 12], [205, 20, 16], [250, 30, 18], [250, 130, 24], [130, 130, 18], [100, 85, 14], [65, 130, 16], [18, 120, 18]],
      haz: [['boost', 0.13, 0], ['boost', 0.5, -3], ['oil', 0.29, -2], ['oil', 0.66, 2], ['cones', 0.38, 2], ['cones', 0.86, -2]],
    },
    {
      id: 'snow', name: 'Frosty Peak', sub: 'Slippery ice patches', theme: 'snow', start: 0.125,
      verts: [[30, 35, 26], [190, 12, 30], [252, 70, 26], [205, 132, 26], [140, 98, 22], [70, 138, 24], [12, 92, 20]],
      haz: [['boost', 0.16, 2], ['ice', 0.3, 0], ['ice', 0.56, -2], ['ice', 0.86, 1], ['boost', 0.72, -2], ['oil', 0.43, 3], ['cones', 0.64, 0]],
    },
    {
      id: 'docks', name: 'Neon Docks', sub: 'Night city, tight hairpin', theme: 'docks', start: 0.095,
      verts: [[20, 20, 16], [250, 20, 16], [250, 135, 16], [190, 135, 14], [190, 75, 12], [130, 75, 12], [130, 135, 14], [20, 135, 16]],
      haz: [['boost', 0.15, 0], ['boost', 0.4, 2], ['boost', 0.78, -2], ['oil', 0.28, -3], ['oil', 0.62, 0], ['cones', 0.52, 0], ['cones', 0.9, 2]],
    },
  ];
  var TRACK_W = 15; // asphalt width
  var VERGE = 3.6; // run-off between asphalt edge and wall

  var THEMES = {
    park: { ground: '#4f9e48', speck: 26, verge: '#67b45a', asphalt: '#43474f', wall: '#24272d', wallHi: '#4b505a', line: 'rgba(255,255,255,0.9)', center: 'rgba(255,255,255,0.55)', curbA: '#ffffff', curbB: '#e8413c', dust: '230,220,200' },
    dunes: { ground: '#e2bf78', speck: 30, verge: '#efd08f', asphalt: '#6a5f55', wall: '#9a6630', wallHi: '#e9c46a', line: 'rgba(255,248,230,0.9)', center: 'rgba(255,214,90,0.8)', curbA: '#ffffff', curbB: '#ff8a1f', dust: '238,210,150' },
    snow: { ground: '#e9f0f7', speck: 18, verge: '#f7fbff', asphalt: '#59626f', wall: '#a9bdd3', wallHi: '#ffffff', line: 'rgba(255,255,255,0.95)', center: 'rgba(255,255,255,0.5)', curbA: '#ffffff', curbB: '#2f7de1', dust: '245,250,255' },
    docks: { ground: '#1b2030', speck: 20, verge: '#262c3f', asphalt: '#2c313d', wall: '#3a4258', wallHi: '#ff3fb4', line: 'rgba(80,240,255,0.95)', center: 'rgba(255,63,180,0.75)', curbA: '#f5f5f5', curbB: '#7a3cff', dust: '160,170,200', night: true },
  };

  var DRIVERS = [
    { name: 'Player 1', color: '#ff4d4d', trim: '#ffd0d0' },
    { name: 'Player 2', color: '#3d8bff', trim: '#d0e2ff' },
    { name: 'Dash', color: '#ffc928', trim: '#fff1b8' },
    { name: 'Nova', color: '#2fd27a', trim: '#c9f7dc' },
    { name: 'Blitz', color: '#b46bff', trim: '#ead7ff' },
  ];
  var CPU_LEVEL = [
    { id: 'easy', name: 'Easy', skill: 0.84 },
    { id: 'normal', name: 'Normal', skill: 0.93 },
    { id: 'hard', name: 'Hard', skill: 1.0 },
  ];

  /* ------------------------------------------------------------------ */
  /* Track geometry (same approach as other igame9 top-down engines)      */
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
    for (i = 0; i < N; i++) S[i + 1] = S[i] + Math.hypot(X[(i + 1) % N] - X[i], Y[(i + 1) % N] - Y[i]);
    for (i = 0; i < N; i++) K[i] = wrapA(Math.atan2(TY[(i + 1) % N], TX[(i + 1) % N]) - Math.atan2(TY[(i - 1 + N) % N], TX[(i - 1 + N) % N])) / 4;
    var hw = TRACK_W / 2;
    var tr = { def: def, N: N, X: X, Y: Y, TX: TX, TY: TY, S: S, K: K, len: S[N], hw: hw, wallHW: hw + VERGE, theme: THEMES[def.theme] };
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (i = 0; i < N; i++) { x0 = Math.min(x0, X[i]); y0 = Math.min(y0, Y[i]); x1 = Math.max(x1, X[i]); y1 = Math.max(y1, Y[i]); }
    var m = hw + VERGE + 2;
    tr.bbox = [x0 - m, y0 - m, x1 + m, y1 + m];
    // chunked Path2D for culled drawing
    var CH = 20;
    tr.chunks = [];
    for (var c0 = 0; c0 < N; c0 += CH) {
      var c1 = Math.min(c0 + CH, N), path = new Path2D(), edges = new Path2D(), curvy = false;
      var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, k, ii;
      for (k = c0; k <= c1; k++) {
        ii = k % N;
        if (k === c0) path.moveTo(X[ii], Y[ii]); else path.lineTo(X[ii], Y[ii]);
        bx0 = Math.min(bx0, X[ii]); by0 = Math.min(by0, Y[ii]); bx1 = Math.max(bx1, X[ii]); by1 = Math.max(by1, Y[ii]);
        if (Math.abs(K[ii]) > 1 / 40) curvy = true;
      }
      for (var sd = -1; sd <= 1; sd += 2) {
        var off = (hw - 0.45) * sd;
        for (k = c0; k <= c1; k++) {
          ii = k % N;
          if (k === c0) edges.moveTo(X[ii] - TY[ii] * off, Y[ii] + TX[ii] * off); else edges.lineTo(X[ii] - TY[ii] * off, Y[ii] + TX[ii] * off);
        }
      }
      var walls = new Path2D();
      for (sd = -1; sd <= 1; sd += 2) {
        off = (hw + VERGE + 0.55) * sd;
        for (k = c0; k <= c1; k++) {
          ii = k % N;
          if (k === c0) walls.moveTo(X[ii] - TY[ii] * off, Y[ii] + TX[ii] * off); else walls.lineTo(X[ii] - TY[ii] * off, Y[ii] + TX[ii] * off);
        }
      }
      var mm = hw + VERGE + 3;
      tr.chunks.push({ path: path, edges: edges, walls: walls, curvy: curvy, s0: S[c0], b: [bx0 - mm, by0 - mm, bx1 + mm, by1 + mm] });
    }
    tr.startI = Math.round(def.start * N) % N;
    // hazards
    tr.haz = [];
    for (i = 0; i < def.haz.length; i++) {
      var hz = def.haz[i], hi = Math.round(hz[1] * N) % N;
      var o = { t: hz[0], i: hi, s: S[hi], off: hz[2], x: X[hi] - TY[hi] * hz[2], y: Y[hi] + TX[hi] * hz[2], a: Math.atan2(TY[hi], TX[hi]) };
      if (o.t === 'ice') { o.rx = 13; o.ry = 7.5; }
      tr.haz.push(o);
    }
    buildDecos(tr);
    return tr;
  }

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
    out.i = bi; out.nx = -uy / ul; out.ny = ux / ul;
    out.d = (x - (X[bi] + ux * bt)) * out.nx + (y - (Y[bi] + uy * bt)) * out.ny;
    out.s = tr.S[bi] + ul * bt;
    return out;
  }
  function distToTrack(tr, x, y) {
    var best = 1e18;
    for (var i = 0; i < tr.N; i += 2) { var dx = tr.X[i] - x, dy = tr.Y[i] - y, d = dx * dx + dy * dy; if (d < best) best = d; }
    return Math.sqrt(best);
  }

  function buildDecos(tr) {
    var rnd = mulberry(tr.N * 31 + tr.def.id.length), b = tr.bbox, pad = 70, list = [], i, x, y, r, d;
    var X0 = b[0] - pad, Y0 = b[1] - pad, X1 = b[2] + pad, Y1 = b[3] + pad, minD = tr.wallHW + 1.5;
    var th = tr.def.theme;
    function free(x, y, r) { return distToTrack(tr, x, y) > minD + r; }
    var n = th === 'docks' ? 70 : 230;
    for (i = 0; i < n; i++) {
      x = lerp(X0, X1, rnd()); y = lerp(Y0, Y1, rnd());
      if (th === 'park') {
        r = 2 + rnd() * 2.5;
        if (!free(x, y, r)) continue;
        var q = rnd();
        list.push(q < 0.75 ? { t: 'tree', x: x, y: y, r: r, c: (rnd() * 3) | 0 } : q < 0.9 ? { t: 'flower', x: x, y: y, r: r * 0.8, c: (rnd() * 3) | 0 } : { t: 'bush', x: x, y: y, r: r * 0.6 });
      } else if (th === 'dunes') {
        r = 1 + rnd() * 2;
        if (!free(x, y, r)) continue;
        q = rnd();
        list.push(q < 0.45 ? { t: 'cactus', x: x, y: y, r: r * 0.7 } : q < 0.7 ? { t: 'rock', x: x, y: y, r: r } : { t: 'ripple', x: x, y: y, r: 4 + r * 2 });
      } else if (th === 'snow') {
        r = 2 + rnd() * 2.2;
        if (!free(x, y, r)) continue;
        list.push(rnd() < 0.8 ? { t: 'pine', x: x, y: y, r: r } : { t: 'drift', x: x, y: y, r: r * 1.6 });
      } else {
        var w = rnd() < 0.5 ? 12 : 2.6, h = w > 3 ? 2.6 : 12;
        if (!free(x, y, 7)) continue;
        list.push(rnd() < 0.75 ? { t: 'cont', x: x, y: y, w: w, h: h, c: (rnd() * 4) | 0 } : { t: 'bollard', x: x, y: y });
      }
    }
    // a grandstand next to the start line
    var si = tr.startI, nx = -tr.TY[si], ny = tr.TX[si], sd = -1;
    var gx = tr.X[si] + nx * sd * (tr.wallHW + 6), gy = tr.Y[si] + ny * sd * (tr.wallHW + 6);
    list.push({ t: 'stand', x: gx, y: gy, a: Math.atan2(tr.TY[si], tr.TX[si]) });
    tr.decos = list.filter(function (o) { return o.t !== 'stand' ? Math.hypot(o.x - gx, o.y - gy) > 18 : true; });
    // ground-level first
    tr.decos.sort(function (a, c) { return (a.t === 'ripple' || a.t === 'drift' || a.t === 'flower' ? 0 : 1) - (c.t === 'ripple' || c.t === 'drift' || c.t === 'flower' ? 0 : 1); });
  }

  /* ------------------------------------------------------------------ */
  /* Drawing helpers                                                     */
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

  var CAR_FONT = '900 0.55px ' + FONT;
  // chunky cartoon rally car, +x forward, 4.0 × 2.0 m
  function drawCar(g, car, night) {
    var d = car.drv;
    g.fillStyle = 'rgba(0,0,0,0.32)';
    rrect(g, -1.85, -0.85, 4.0, 2.0, 0.6);
    g.fill();
    // wheels
    g.fillStyle = '#16181d';
    var st = car.steerVis;
    g.fillRect(-1.55, -1.12, 0.95, 0.42);
    g.fillRect(-1.55, 0.7, 0.95, 0.42);
    g.save(); g.translate(1.05, -0.91); g.rotate(st); g.fillRect(-0.45, -0.21, 0.9, 0.42); g.restore();
    g.save(); g.translate(1.05, 0.91); g.rotate(st); g.fillRect(-0.45, -0.21, 0.9, 0.42); g.restore();
    // body
    g.fillStyle = d.color;
    rrect(g, -2.0, -0.92, 4.0, 1.84, 0.62);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(-1.6, 0.5, 3.2, 0.3);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(-1.6, -0.78, 3.2, 0.22);
    // windscreen + cockpit
    g.fillStyle = '#1a2330';
    rrect(g, -0.75, -0.66, 1.55, 1.32, 0.35);
    g.fill();
    g.fillStyle = d.trim;
    rrect(g, -0.55, -0.55, 0.95, 1.1, 0.3);
    g.fill();
    // number disc
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(-0.07, 0, 0.36, 0, TAU); g.fill();
    g.fillStyle = '#111';
    g.font = CAR_FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(car.num), -0.07, 0.03);
    // spoiler + lights
    g.fillStyle = 'rgba(10,12,16,0.85)';
    g.fillRect(-2.05, -0.95, 0.28, 1.9);
    g.fillStyle = '#fff8d0';
    g.fillRect(1.8, -0.72, 0.18, 0.4);
    g.fillRect(1.8, 0.32, 0.18, 0.4);
    if (night) {
      g.fillStyle = 'rgba(255,236,170,0.07)';
      g.beginPath(); g.moveTo(1.9, -0.7); g.lineTo(8, -2.6); g.lineTo(8.6, 0); g.lineTo(8, 2.6); g.lineTo(1.9, 0.7); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(1.9, -0.6); g.lineTo(5.5, -1.4); g.lineTo(5.8, 0); g.lineTo(5.5, 1.4); g.lineTo(1.9, 0.6); g.closePath(); g.fill();
    }
    if (car.braking) {
      g.fillStyle = '#ff2b2b';
      g.fillRect(-1.98, -0.8, 0.14, 0.4);
      g.fillRect(-1.98, 0.4, 0.14, 0.4);
    }
    if (car.boostT > 0) {
      var fl = 0.8 + Math.random() * 0.9;
      g.fillStyle = 'rgba(255,170,40,0.9)';
      g.beginPath(); g.moveTo(-2.05, -0.35); g.lineTo(-2.05 - fl, 0); g.lineTo(-2.05, 0.35); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,200,0.95)';
      g.beginPath(); g.moveTo(-2.05, -0.17); g.lineTo(-2.05 - fl * 0.5, 0); g.lineTo(-2.05, 0.17); g.closePath(); g.fill();
    }
  }

  var CSS = [
    '.rb-btn{position:absolute;z-index:6;top:10px;right:10px;width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(5,6,14,.55);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0;touch-action:manipulation}',
    '.rb-btn svg{width:18px;height:18px}',
    '.rb-touch{position:absolute;left:0;right:0;bottom:0;z-index:5;pointer-events:none}',
    '.rb-tb{position:absolute;pointer-events:auto;display:grid;place-items:center;border-radius:50%;background:rgba(10,12,24,.42);border:2px solid rgba(255,255,255,.32);color:#fff;font:900 13px ' + FONT + ';touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
    '.rb-tb.on{background:rgba(255,255,255,.34);transform:scale(.95)}',
    '.rb-tb svg{width:42%;height:42%}',
    '.rb-tb.gas{background:rgba(34,197,94,.35);border-color:rgba(134,239,172,.7)}',
    '.rb-tb.brk{background:rgba(239,68,68,.3);border-color:rgba(252,165,165,.7)}',
    '.rb-panel{width:min(580px,100%)!important;text-align:left!important;padding:18px!important}',
    '.rb-lede{color:var(--text-2,#c4c8ea);font-size:14px;margin:0 0 12px}',
    '.rb-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}',
    '.rb-opt{font:800 14px ' + FONT + ';color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px;cursor:pointer;text-align:center}',
    '.rb-opt small{display:block;font-weight:600;font-size:11.5px;color:var(--text-2,#c4c8ea);margin-top:2px}',
    '.rb-opt.sel{border-color:var(--accent-2,#2dd4f0);background:rgba(45,212,240,.14);box-shadow:inset 0 0 0 1px var(--accent-2,#2dd4f0)}',
    '.rb-tracks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}',
    '.rb-track{font:inherit;text-align:left;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:8px 9px;cursor:pointer;min-width:0}',
    '.rb-track.sel{border-color:var(--accent-2,#2dd4f0);background:rgba(45,212,240,.14);box-shadow:inset 0 0 0 1px var(--accent-2,#2dd4f0)}',
    '.rb-track b{display:block;font-size:13px;line-height:1.2}',
    '.rb-track small{display:block;font-size:11px;color:var(--text-2,#c4c8ea);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rb-sw{display:block;height:6px;border-radius:4px;margin-bottom:6px}',
    '.rb-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;font-size:13px;color:var(--text-2,#c4c8ea)}',
    '.rb-chip{font:800 12.5px ' + FONT + ';color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 11px;cursor:pointer}',
    '.rb-chip.sel{background:rgba(139,108,255,.3);border-color:var(--accent,#8b6cff)}',
    '.rb-keys{color:var(--muted,#8f95c0);font-size:12px;margin-top:10px;text-align:center}',
    '.rb-keys kbd{font:700 11px ui-monospace,monospace;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}',
    '.rb-note{font-size:12px;color:#ffd166;margin:-4px 0 10px}',
    '.rb-table{width:100%;border-collapse:collapse;font-size:13.5px;margin:6px 0 14px}',
    '.rb-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#8f95c0);text-align:left;padding:4px 6px;font-weight:800}',
    '.rb-table td{padding:6px;border-top:1px solid rgba(255,255,255,.08);color:#fff;white-space:nowrap}',
    '.rb-table tr.me td{background:rgba(255,255,255,.06)}',
    '.rb-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}',
    '.rb-big{font:900 clamp(26px,6vw,40px) ' + FONT + ';color:#fff;text-align:center;line-height:1.1;margin:2px 0 4px}',
    '.rb-sub{text-align:center;color:var(--text-2,#c4c8ea);font-size:13px;margin-bottom:6px}',
    '.rb-tag{display:inline-block;font:800 12px ' + FONT + ';padding:3px 10px;border-radius:999px;background:#ffd23f;color:#1a1300}',
    '@media (max-width:520px){.rb-tracks{grid-template-columns:1fr 1fr}.rb-panel{padding:14px!important}.rb-keys{display:none}.rb-opt{padding:8px}.rb-table{font-size:12.5px}.rb-table td,.rb-table th{padding:4px}}',
    '@media (max-width:520px),(max-height:480px){.rb-lede{display:none}.rb-opt small{display:none}.rb-track small.rb-tsub{display:none}.rb-track{padding:6px 8px}.rb-sw{height:4px;margin-bottom:4px}.rb-row{margin-bottom:8px}.rb-keys{display:none}.rb-seg{margin-bottom:8px}}',
    '@media (max-height:480px){.rb-tracks{grid-template-columns:repeat(4,minmax(0,1fr))}}',
  ].join('\n');
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var ICON_L = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 4 6.5 12l9 8z"/></svg>';
  var ICON_R = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 4l9 8-9 8z"/></svg>';

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('road-bros', function (ctx) {
    var root = ctx.root, ui = IGAME.ui;
    var TITLE = ctx.title || 'Turbo Buddies';
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var save = ctx.store.get('save', null) || {};
    save.mode = save.mode === 2 ? 2 : 1;
    save.track = save.track || 'park';
    save.laps = save.laps === 5 ? 5 : 3;
    save.cpu = save.cpu || 'normal';
    save.best = save.best || {}; // best lap per track
    save.wins = save.wins || {}; // trophies per track (1P wins)
    save.races = save.races || 0;
    function persist() { ctx.store.set('save', save); }
    function trackIndex(id) { for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === id) return i; return 0; }
    function cpuLevel() { for (var i = 0; i < CPU_LEVEL.length; i++) if (CPU_LEVEL[i].id === save.cpu) return CPU_LEVEL[i]; return CPU_LEVEL[1]; }

    var W = 0, H = 0, U = 1;
    var view = IGAME.createCanvas(root, { onResize: function (w, h) { W = w; H = h; U = clamp(Math.min(w, h * 1.25) / 620, 0.72, 1.5); layoutTouch(); minimap = null; } });
    var g = view.ctx, canvas = view.canvas;

    var state = 'menu'; // menu | count | race | paused | results
    var track = null, trackCache = {};
    var cars = [], humans = [], cones = [];
    var race = null;
    var cam = { x: 0, y: 0, z: 4, shake: 0, sx: 0, sy: 0 };
    var overlay = null, menuKey = null;
    var banners = [];
    var touchOn = !!ctx.isTouch;
    var tbtn = { left: false, right: false, gas: false, brk: false };
    var mouse = { gas: false, brk: false, x: 0, y: 0 };
    var minimap = null, mmTrack = null;
    var groundPat = null, asphaltPat = null, patTheme = '';
    var patMatrix = null;
    try { patMatrix = new DOMMatrix([1 / 14, 0, 0, 1 / 14, 0, 0]); } catch (e) { patMatrix = null; }
    var sndT = 0, endT = 0, time = 0;
    var Q = { i: 0, nx: 0, ny: 0, d: 0, s: 0 };
    // ?debug=1&autopilot=1 lets the CPU drive the human cars (for automated testing)
    var autoPilot = ctx.debug && ctx.params.get('autopilot') === '1';

    // particles (dust, sparks, confetti) and skid marks
    var MAXP = 160, P = [];
    for (var pi = 0; pi < MAXP; pi++) P.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 1, k: 0, c: '' });
    var MAXM = 1600, marks = new Float32Array(MAXM * 4), markN = 0, markHead = 0;
    var dustSprite = (function () {
      var c = document.createElement('canvas');
      c.width = c.height = 48;
      var x = c.getContext('2d'), gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 48, 48);
      return c;
    })();

    function noisePattern(base, amount, seed) {
      var c = document.createElement('canvas');
      c.width = c.height = 96;
      var x = c.getContext('2d'), r = mulberry(seed);
      x.fillStyle = base;
      x.fillRect(0, 0, 96, 96);
      for (var i = 0; i < 1200; i++) {
        var a = (r() * amount) / 255;
        x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,' + a.toFixed(3) + ')' : 'rgba(255,255,255,' + (a * 0.8).toFixed(3) + ')';
        x.fillRect((r() * 96) | 0, (r() * 96) | 0, r() < 0.8 ? 1 : 2, r() < 0.8 ? 1 : 2);
      }
      var p = g.createPattern(c, 'repeat');
      if (p && patMatrix && p.setTransform) { try { p.setTransform(patMatrix); } catch (e) {} }
      return p || base;
    }

    /* ---------- DOM: pause + touch ---------- */
    var pauseBtn = ui.el('button', 'rb-btn', ICON_PAUSE);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.display = 'none';
    pauseBtn.addEventListener('click', function (e) { e.stopPropagation(); pauseGame(); });
    root.appendChild(pauseBtn);

    var touchWrap = ui.el('div', 'rb-touch');
    touchWrap.style.display = 'none';
    root.appendChild(touchWrap);
    var TB = {};
    function makeTB(key, cls, html, label) {
      var b = ui.el('div', 'rb-tb ' + cls, html);
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
    makeTB('gas', 'gas', 'GAS', 'Accelerate');
    layoutTouch();
    function layoutTouch() {
      if (!W || !TB || !TB.gas) return;
      var s = Math.round(clamp(Math.min(W, H) * 0.17, 54, 92)), pad = Math.round(clamp(Math.min(W, H) * 0.035, 10, 22));
      touchWrap.style.height = s + pad * 2 + 'px';
      function pos(b, left, size) { b.style.width = b.style.height = size + 'px'; b.style.left = left + 'px'; b.style.bottom = pad + 'px'; }
      pos(TB.left, pad, s);
      pos(TB.right, pad + s + Math.round(s * 0.22), s);
      var big = Math.round(s * 1.12), small = Math.round(s * 0.9);
      pos(TB.gas, W - pad - big, big);
      pos(TB.brk, W - pad - big - Math.round(s * 0.2) - small, small);
      TB.gas.style.fontSize = TB.brk.style.fontSize = Math.round(clamp(s * 0.2, 11, 15)) + 'px';
    }
    function showTouch(v) {
      var on = v && touchOn && save.mode === 1;
      touchWrap.style.display = on ? '' : 'none';
      if (!v) for (var k in tbtn) { tbtn[k] = false; if (TB[k]) TB[k].classList.remove('on'); }
    }

    /* ---------- pointer: mouse driving for player 1 ---------- */
    function racing() { return state === 'race' || state === 'count'; }
    function onPointerDown(e) {
      if (e.pointerType !== 'mouse') {
        if (!touchOn) { touchOn = true; if (racing()) showTouch(true); }
        return;
      }
      if (!racing()) return;
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (e.button === 0) mouse.gas = true;
      if (e.button === 2) mouse.brk = true;
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
      if (e.button === 2) mouse.brk = false;
    }
    function onLost() { mouse.gas = mouse.brk = false; }
    function onCtxMenu(e) { e.preventDefault(); }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onLost);
    canvas.addEventListener('lostpointercapture', onLost);
    canvas.addEventListener('contextmenu', onCtxMenu);

    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP', 'Enter', 'Escape']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (racing()) {
        if (code === 'KeyP' || code === 'Escape') pauseGame();
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

    /* ---------- setup ---------- */
    function useTrack(id) {
      if (!trackCache[id]) trackCache[id] = buildTrack(TRACKS[trackIndex(id)]);
      track = trackCache[id];
      if (patTheme !== track.def.theme) {
        groundPat = noisePattern(track.theme.ground, track.theme.speck * 2.5, 5);
        asphaltPat = noisePattern(track.theme.asphalt, 36, 9);
        patTheme = track.def.theme;
      }
      minimap = null;
      markN = markHead = 0;
    }

    function makeCar(di, human, pid) {
      return {
        drv: DRIVERS[di], num: di + 1, human: human, pid: pid,
        x: 0, y: 0, a: 0, vx: 0, vy: 0, spin: 0, steerVis: 0,
        hint: 0, s: 0, dist: 0, lap: 0, finished: false, finishT: 0, lapStart: 0, bestLap: null, lastLap: null,
        boostT: 0, boostCool: 0, oilT: 0, oilCool: 0, surf: 0, braking: false,
        skill: 1, lane: 0, laneT: 0, stuckT: 0, revT: 0, wrongT: 0, pos: 1,
        inp: { thr: 0, brk: 0, st: 0 }, wheelPrev: [0, 0, 0, 0], wheelOk: false, bumpCool: 0,
      };
    }

    function gridPlace(car, slot) {
      var tr = track, row = Math.floor(slot / 2), col = slot % 2;
      var back = 7 + row * 7.5 + col * 2.5, lat = col ? 3.4 : -3.4;
      var i = (tr.startI - Math.round(back / 2) + tr.N) % tr.N;
      car.x = tr.X[i] - tr.TY[i] * lat; car.y = tr.Y[i] + tr.TX[i] * lat;
      car.a = Math.atan2(tr.TY[i], tr.TX[i]);
      car.vx = car.vy = car.spin = 0;
      car.hint = i;
      nearest(tr, car.x, car.y, i, 4, Q);
      car.s = Q.s;
      car.dist = -wrapDist(tr.S[tr.startI] - Q.s, tr.len);
      car.lap = 0; car.finished = false; car.lane = lat; car.laneT = 3 + slot * 0.4;
    }
    function wrapDist(d, len) { while (d > len / 2) d -= len; while (d < -len / 2) d += len; return d; }

    function setupRace() {
      useTrack(save.track);
      cars = []; humans = [];
      var lvl = cpuLevel(), order = [];
      if (save.mode === 2) order = [[2, false], [3, false], [0, true], [1, true]];
      else order = [[2, false], [3, false], [4, false], [0, true]];
      for (var k = 0; k < order.length; k++) {
        var c = makeCar(order[k][0], order[k][1], order[k][0] === 0 ? 1 : order[k][0] === 1 ? 2 : 0);
        if (c.human && save.mode === 1) c.drv = { name: 'You', color: DRIVERS[0].color, trim: DRIVERS[0].trim };
        c.skill = c.human ? 1 : lvl.skill * (0.97 + k * 0.02);
        gridPlace(c, k);
        cars.push(c);
        if (c.human) humans.push(c);
      }
      humans.sort(function (a, b) { return a.pid - b.pid; });
      // cones from hazard clusters
      cones = [];
      for (var h = 0; h < track.haz.length; h++) {
        var hz = track.haz[h];
        if (hz.t !== 'cones') continue;
        for (var j = 0; j < 5; j++) {
          var ox = (j - 2) * 2.2, i2 = (hz.i + (j % 2) * 2) % track.N;
          cones.push({ x: track.X[i2] - track.TY[i2] * (hz.off + ox), y: track.Y[i2] + track.TX[i2] * (hz.off + ox), vx: 0, vy: 0, a: 0, va: 0, hint: i2 });
        }
      }
      race = { t: 0, count: 3.6, laps: save.laps, done: false, finishOrder: [], human1Final: false };
      banners.length = 0;
      for (var p = 0; p < MAXP; p++) P[p].on = false;
      markN = markHead = 0;
      var c0 = humans[0];
      cam.x = c0.x; cam.y = c0.y; cam.z = baseZoom();
      if (save.mode === 2) frameHumans(1, true);
    }

    function startRace() {
      closeOverlay();
      setupRace();
      state = 'count';
      pauseBtn.style.display = '';
      showTouch(true);
      ctx.focus();
    }

    /* ---------- physics ---------- */
    var VMAX = 31, ACC = 19, TURN = 2.35;
    function surfaceAt(car) {
      nearest(track, car.x, car.y, car.hint, 5, Q);
      car.hint = Q.i;
      var ds = wrapDist(Q.s - car.s, track.len);
      car.s = Q.s;
      car.dist += ds;
      car.lat = Q.d;
      var surf = Math.abs(Q.d) > track.hw + 0.4 ? 1 : 0;
      for (var h = 0; h < track.haz.length; h++) {
        var hz = track.haz[h], dx = car.x - hz.x, dy = car.y - hz.y;
        if (dx * dx + dy * dy > 200) continue;
        var ca = Math.cos(hz.a), sa = Math.sin(hz.a), lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
        if (hz.t === 'ice') {
          if ((lx * lx) / (hz.rx * hz.rx) + (ly * ly) / (hz.ry * hz.ry) < 1) surf = 2;
        } else if (hz.t === 'boost') {
          if (Math.abs(lx) < 3 && Math.abs(ly) < 2 && car.boostCool <= 0) {
            car.boostT = 1.15; car.boostCool = 0.5;
            if (car.human) { ctx.sfx('boost'); banner(car, 'BOOST!', '#ffd23f'); }
          }
        } else if (hz.t === 'oil') {
          if (lx * lx + ly * ly < 6.5 && car.oilCool <= 0) {
            car.oilT = 0.9; car.oilCool = 1.6;
            car.spin += (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 2);
            if (car.human) { ctx.sfx('slide'); banner(car, 'OIL!', '#c4c8ea'); }
          }
        }
      }
      return surf;
    }

    function stepCar(car, dt) {
      var inp = car.inp, surf = car.surf;
      var grip = car.oilT > 0 ? 0.7 : surf === 2 ? 1.1 : surf === 1 ? 4.2 : 8;
      var vmax = VMAX * car.skill * (car.boostT > 0 ? 1.42 : 1) * (surf === 1 ? 0.62 : 1);
      var sp = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
      // steering authority grows with speed and fades a bit at the top end
      var auth = clamp(sp / 7, 0, 1) * (1 - 0.28 * clamp(sp / 42, 0, 1));
      var fx0 = Math.cos(car.a), fy0 = Math.sin(car.a), vF0 = car.vx * fx0 + car.vy * fy0;
      car.a += (inp.st * TURN * auth * (vF0 >= -0.5 ? 1 : -1) + car.spin) * dt;
      car.spin *= Math.exp(-2.6 * dt);
      car.steerVis += (inp.st * 0.45 - car.steerVis) * Math.min(1, dt * 12);
      var fx = Math.cos(car.a), fy = Math.sin(car.a), rx = -fy, ry = fx;
      var vF = car.vx * fx + car.vy * fy, vR = car.vx * rx + car.vy * ry;
      car.braking = false;
      if (inp.thr && vF < vmax) vF += ACC * (surf === 2 ? 0.55 : 1) * (1 - Math.max(0, vF) / (vmax * 1.15)) * dt;
      if (inp.brk) {
        if (vF > 0.5) { vF -= 30 * dt; car.braking = true; } else if (vF > -9) vF -= 13 * dt;
      }
      if (!inp.thr && !inp.brk) vF -= vF * (surf === 2 ? 0.25 : 0.9) * dt;
      if (vF > vmax) vF -= (vF - vmax) * 2.4 * dt;
      if (car.boostT > 0) vF += 9 * dt;
      vR *= Math.exp(-grip * dt);
      car.vx = fx * vF + rx * vR;
      car.vy = fy * vF + ry * vR;
      car.x += car.vx * dt;
      car.y += car.vy * dt;
      car.vF = vF; car.vR = vR; car.speed = sp;
    }

    // contact circles at the front and rear of each car
    var CIRC_OFF = [1.05, -1.05], CR = 1.0;
    function wallCollide(car) {
      var c = Math.cos(car.a), s = Math.sin(car.a), lim = track.wallHW - CR, hit = 0;
      for (var k = 0; k < 2; k++) {
        var rx = c * CIRC_OFF[k], ry = s * CIRC_OFF[k];
        nearest(track, car.x + rx, car.y + ry, car.hint, 3, Q);
        var ad = Math.abs(Q.d);
        if (ad <= lim) continue;
        var sg = Q.d > 0 ? -1 : 1, nx = Q.nx * sg, ny = Q.ny * sg, pen = ad - lim;
        car.x += nx * pen; car.y += ny * pen;
        var vn = car.vx * nx + car.vy * ny;
        if (vn < 0) {
          car.vx -= 1.35 * vn * nx; car.vy -= 1.35 * vn * ny;
          car.vx *= 0.97; car.vy *= 0.97;
          car.spin += (rx * ny - ry * nx) * -vn * 0.12;
          if (-vn > hit) hit = -vn;
        }
      }
      if (hit > 4) {
        spark(car.x, car.y, 6);
        if (car.human) { ctx.sfx({ f: 140, f2: 60, d: 0.12, type: 'square', v: 0.07 }); cam.shake = Math.min(1, cam.shake + hit / 25); }
      }
    }

    function carCollide(a, b) {
      var ca = Math.cos(a.a), sa = Math.sin(a.a), cb = Math.cos(b.a), sb = Math.sin(b.a);
      var dx0 = b.x - a.x, dy0 = b.y - a.y;
      if (dx0 * dx0 + dy0 * dy0 > 25) return;
      var best = 0;
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
        var ax = a.x + ca * CIRC_OFF[i], ay = a.y + sa * CIRC_OFF[i], bx = b.x + cb * CIRC_OFF[j], by = b.y + sb * CIRC_OFF[j];
        var dx = bx - ax, dy = by - ay, d2 = dx * dx + dy * dy;
        if (d2 >= 4 * CR * CR || d2 < 1e-6) continue;
        var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = 2 * CR - d;
        a.x -= nx * pen * 0.5; a.y -= ny * pen * 0.5; b.x += nx * pen * 0.5; b.y += ny * pen * 0.5;
        var vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vrel >= 0) continue;
        var jimp = -(1 + 0.55) * vrel * 0.5;
        a.vx -= jimp * nx; a.vy -= jimp * ny; b.vx += jimp * nx; b.vy += jimp * ny;
        // off-centre hits twist the cars
        a.spin -= (ca * CIRC_OFF[i] * ny - sa * CIRC_OFF[i] * nx) * jimp * 0.22;
        b.spin += (cb * CIRC_OFF[j] * ny - sb * CIRC_OFF[j] * nx) * jimp * 0.22;
        if (-vrel > best) best = -vrel;
      }
      if (best > 3 && a.bumpCool <= 0 && b.bumpCool <= 0) {
        a.bumpCool = b.bumpCool = 0.35;
        spark((a.x + b.x) / 2, (a.y + b.y) / 2, Math.min(12, Math.round(best)));
        if (a.human || b.human) {
          ctx.sfx({ f: 220, f2: 90, d: 0.14, type: 'square', v: 0.09 });
          IGAME.sfx.noise({ d: 0.12, f: 900, v: 0.12 });
          cam.shake = Math.min(1, cam.shake + best / 20);
          if (best > 7) banner(a.human ? a : b, 'BUMP!', '#ff9f43');
        }
      }
    }

    function conePhysics(dt) {
      for (var i = 0; i < cones.length; i++) {
        var o = cones[i];
        for (var k = 0; k < cars.length; k++) {
          var c = cars[k], dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy;
          if (d2 > 6.5) continue;
          var d = Math.sqrt(d2) || 0.01, sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
          o.vx = c.vx * 1.25 + (dx / d) * (3 + sp * 0.3);
          o.vy = c.vy * 1.25 + (dy / d) * (3 + sp * 0.3);
          o.va = (Math.random() - 0.5) * 20;
          o.x += (dx / d) * (2.55 - d);
          o.y += (dy / d) * (2.55 - d);
          c.vx *= 0.95; c.vy *= 0.95;
          if (c.human) ctx.sfx({ f: 600, f2: 300, d: 0.06, type: 'triangle', v: 0.07 });
        }
        if (o.vx || o.vy) {
          o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt;
          var f = Math.exp(-2.2 * dt);
          o.vx *= f; o.vy *= f; o.va *= f;
          if (Math.abs(o.vx) + Math.abs(o.vy) < 0.05) o.vx = o.vy = 0;
          nearest(track, o.x, o.y, o.hint, 4, Q);
          o.hint = Q.i;
          var lim = track.wallHW - 0.4;
          if (Math.abs(Q.d) > lim) {
            var sg = Q.d > 0 ? -1 : 1, nx = Q.nx * sg, ny = Q.ny * sg, vn = o.vx * nx + o.vy * ny;
            o.x += nx * (Math.abs(Q.d) - lim); o.y += ny * (Math.abs(Q.d) - lim);
            if (vn < 0) { o.vx -= 1.5 * vn * nx; o.vy -= 1.5 * vn * ny; }
          }
        }
      }
    }

    /* ---------- AI ---------- */
    function aiDrive(car, dt) {
      var tr = track, N = tr.N, inp = car.inp, sp = car.speed || 0;
      car.laneT -= dt;
      if (car.laneT <= 0) { car.laneT = 2 + Math.random() * 3; car.lane = (Math.random() * 2 - 1) * (tr.hw - 2.6); }
      var lane = car.lane;
      // dodge hazards coming up (oil, cones); hard CPUs aim for boost pads
      for (var h = 0; h < tr.haz.length; h++) {
        var hz = tr.haz[h], ahead = wrapDist(hz.s - car.s, tr.len);
        if (ahead < 0 || ahead > 40) continue;
        if (hz.t === 'boost' && car.skill > 0.95) lane = hz.off;
        else if ((hz.t === 'oil' || hz.t === 'cones') && Math.abs(lane - hz.off) < 4.5) lane = hz.off + (lane >= hz.off ? 4.8 : -4.8);
      }
      lane = clamp(lane, -tr.hw + 2.2, tr.hw - 2.2);
      var la = Math.round((7 + sp * 0.55) / 2), j = (car.hint + la) % N;
      var tx = tr.X[j] - tr.TY[j] * lane, ty = tr.Y[j] + tr.TX[j] * lane;
      var err = wrapA(Math.atan2(ty - car.y, tx - car.x) - car.a);
      inp.st = clamp(err * 2.4, -1, 1);
      // corner speed: look ~30 m ahead for the tightest curvature
      var kmax = 0;
      for (var q = 2; q < 17; q++) { var kk = Math.abs(tr.K[(car.hint + q) % N]); if (kk > kmax) kmax = kk; }
      var vdes = clamp(1.75 / Math.max(kmax, 0.001), 11, 60);
      // rubber band: catch up when behind the humans, ease off when far ahead
      var lead = -1e9;
      for (var hI = 0; hI < humans.length; hI++) lead = Math.max(lead, humans[hI].dist);
      var gap = clamp((lead - car.dist) / 80, -1, 1);
      car.rubber = 1 + gap * (gap > 0 ? 0.07 : 0.1);
      inp.thr = sp < vdes ? 1 : 0;
      inp.brk = sp > vdes + 3 ? 1 : 0;
      if (Math.abs(err) > 1.4 && sp > 8) { inp.thr = 0; inp.brk = 1; }
      // unstick: reverse out if barely moving
      if (car.revT > 0) {
        car.revT -= dt;
        inp.thr = 0; inp.brk = 1; inp.st = -inp.st;
      } else if (state !== 'count' && sp < 1.5) {
        car.stuckT += dt;
        if (car.stuckT > 1.2) { car.revT = 0.9; car.stuckT = 0; }
      } else car.stuckT = 0;
    }

    function humanInput(car) {
      var k = ctx.keys, inp = car.inp, two = save.mode === 2;
      var L, R, U2, D;
      if (car.pid === 1) {
        L = k.KeyA || (!two && k.ArrowLeft) || tbtn.left;
        R = k.KeyD || (!two && k.ArrowRight) || tbtn.right;
        U2 = k.KeyW || (!two && k.ArrowUp) || tbtn.gas || mouse.gas;
        D = k.KeyS || (!two && k.ArrowDown) || tbtn.brk || mouse.brk;
      } else {
        L = k.ArrowLeft; R = k.ArrowRight; U2 = k.ArrowUp; D = k.ArrowDown;
      }
      inp.thr = U2 ? 1 : 0;
      inp.brk = D ? 1 : 0;
      inp.st = (R ? 1 : 0) - (L ? 1 : 0);
      if (car.pid === 1 && mouse.gas && !L && !R) {
        var wx = cam.x + (mouse.x - cam.sx) / cam.z, wy = cam.y + (mouse.y - cam.sy) / cam.z;
        var da = wrapA(Math.atan2(wy - car.y, wx - car.x) - car.a);
        inp.st = clamp(da * 2, -1, 1);
      }
    }

    /* ---------- race flow ---------- */
    function banner(car, text, color) {
      for (var i = 0; i < banners.length; i++) if (banners[i].car === car && banners[i].text === text && banners[i].t < 0.6) return;
      if (banners.length > 6) banners.shift();
      banners.push({ car: car, text: text, color: color, t: 0 });
    }

    function lapCheck(car) {
      var L = track.len, laps = Math.floor(car.dist / L);
      if (laps > car.lap && car.dist > 0) {
        car.lap = laps;
        var lt = race.t - car.lapStart;
        car.lapStart = race.t;
        car.lastLap = lt;
        if (car.bestLap == null || lt < car.bestLap) car.bestLap = lt;
        if (car.lap >= race.laps) {
          car.finished = true;
          car.finishT = race.t;
          race.finishOrder.push(car);
          if (car.human) {
            var place = race.finishOrder.length;
            banner(car, place === 1 ? 'WINNER!' : 'FINISHED ' + ord(place), place === 1 ? '#ffd23f' : '#ffffff');
            ctx.sfx(place === 1 ? 'win' : 'levelup');
            if (place === 1) confetti(car.x, car.y);
          }
        } else if (car.human) {
          if (car.lap === race.laps - 1) { banner(car, 'FINAL LAP!', '#ff6b6b'); ctx.sfx('levelup'); }
          else { banner(car, 'LAP ' + (car.lap + 1) + '/' + race.laps, '#7CFFB2'); ctx.sfx('coin'); }
        }
      }
    }

    function rank() {
      var order = cars.slice().sort(function (a, b) {
        if (a.finished && b.finished) return a.finishT - b.finishT;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.dist - a.dist;
      });
      for (var i = 0; i < order.length; i++) order[i].pos = i + 1;
      return order;
    }

    function finishRace() {
      race.done = true;
      state = 'results';
      pauseBtn.style.display = 'none';
      showTouch(false);
      // estimate times for anyone still driving
      for (var i = 0; i < cars.length; i++) {
        var c = cars[i];
        if (!c.finished) {
          var left = race.laps * track.len - c.dist, v = Math.max(12, VMAX * c.skill * 0.75);
          c.finishT = race.t + left / v;
          c.estimated = true;
          c.finished = true;
        }
      }
      var order = rank();
      // bookkeeping
      var tid = track.def.id, newBest = false;
      for (i = 0; i < humans.length; i++) {
        var h = humans[i];
        if (h.bestLap != null && (save.best[tid] == null || h.bestLap < save.best[tid])) { save.best[tid] = h.bestLap; newBest = true; }
      }
      var winner = order[0];
      if (save.mode === 1 && winner.human) save.wins[tid] = (save.wins[tid] || 0) + 1;
      save.races++;
      persist();
      var title, sub;
      if (save.mode === 1) {
        var me = humans[0];
        title = me.pos === 1 ? 'You win!' : 'You finished ' + ord(me.pos);
        sub = me.pos === 1 ? 'Trophy earned on ' + track.def.name : 'Bump harder, boost smarter — try again!';
        ctx.sfx(me.pos === 1 ? 'win' : me.pos <= 2 ? 'levelup' : 'lose');
      } else {
        var p1 = humans[0], p2 = humans[1], w = p1.pos < p2.pos ? p1 : p2;
        title = w.drv.name + ' wins the duel!';
        sub = 'Player 1 finished ' + ord(p1.pos) + ' · Player 2 finished ' + ord(p2.pos);
        ctx.sfx('win');
      }
      var rows = '';
      for (i = 0; i < order.length; i++) {
        var o = order[i];
        rows += '<tr' + (o.human ? ' class="me"' : '') + '><td>' + ord(o.pos) + '</td><td><span class="rb-dot" style="background:' + o.drv.color + '"></span>' + o.drv.name + '</td><td>' + (o.estimated ? '~' : '') + fmtTime(o.finishT) + '</td><td>' + fmtTime(o.bestLap) + '</td></tr>';
      }
      var html =
        '<div class="rb-sub">' + sub + '</div>' +
        (newBest ? '<div style="text-align:center;margin:4px 0"><span class="rb-tag">NEW LAP RECORD ' + fmtTime(save.best[tid]) + '</span></div>' : '') +
        '<table class="rb-table"><thead><tr><th>Pos</th><th>Driver</th><th>Time</th><th>Best lap</th></tr></thead><tbody>' + rows + '</tbody></table>';
      endT = 1.6;
      race.resultHtml = { title: title, html: html };
    }

    function showResults() {
      var r = race.resultHtml;
      openPanel(r.title, r.html, [
        { label: 'Race again', primary: true, onClick: startRace },
        { label: 'Next track', onClick: function () { save.track = TRACKS[(trackIndex(save.track) + 1) % TRACKS.length].id; persist(); startRace(); } },
        { label: 'Menu', onClick: openMenu },
      ]);
      menuKey = function (code) {
        if (code === 'Enter' || code === 'Space') { ctx.sfx('click'); startRace(); }
        else if (code === 'Escape') openMenu();
      };
    }

    /* ---------- particles ---------- */
    function spawn(x, y, vx, vy, life, r, kind, color) {
      for (var i = 0; i < MAXP; i++) {
        var p = P[i];
        if (!p.on) { p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = life; p.r = r; p.k = kind; p.c = color || ''; return; }
      }
    }
    function spark(x, y, n) {
      for (var i = 0; i < n; i++) { var a = Math.random() * TAU, s = 5 + Math.random() * 10; spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.3 + Math.random() * 0.2, 0.1, 1); }
    }
    var CONF = ['#ff4d4d', '#ffd23f', '#2fd27a', '#3d8bff', '#ff5bd1', '#ffffff'];
    function confetti(x, y) {
      for (var i = 0; i < 40; i++) { var a = Math.random() * TAU, s = 4 + Math.random() * 12; spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 1.2 + Math.random(), 0.35, 2, CONF[i % CONF.length]); }
    }
    function updateParticles(dt) {
      for (var i = 0; i < MAXP; i++) {
        var p = P[i];
        if (!p.on) continue;
        p.life += dt;
        if (p.life >= p.max) { p.on = false; continue; }
        var f = Math.exp(-(p.k === 1 ? 3 : p.k === 2 ? 1.5 : 1.8) * dt);
        p.vx *= f; p.vy *= f;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 0) p.r += dt * 1.5;
      }
    }
    function carEffects(car, dt) {
      // dust when sliding or off-road, skid marks when sliding hard
      var sliding = Math.abs(car.vR || 0) > 3.2 || car.oilT > 0 || (car.braking && car.speed > 10);
      var dusty = car.surf === 1 && car.speed > 6;
      var c = Math.cos(car.a), s = Math.sin(car.a);
      if ((sliding || dusty || car.boostT > 0) && Math.random() < dt * (dusty ? 22 : 14)) {
        spawn(car.x - c * 1.8 + (Math.random() - 0.5), car.y - s * 1.8 + (Math.random() - 0.5), car.vx * 0.2, car.vy * 0.2, 0.7 + Math.random() * 0.5, 0.6, 0);
      }
      for (var w = 0; w < 2; w++) {
        var side = w ? 0.9 : -0.9, wx = car.x - c * 1.1 - s * side, wy = car.y - s * 1.1 + c * side;
        var px = car.wheelPrev[w * 2], py = car.wheelPrev[w * 2 + 1];
        if (sliding && car.wheelOk && car.surf !== 1) {
          var dd = (wx - px) * (wx - px) + (wy - py) * (wy - py);
          if (dd > 0.16) {
            if (dd < 9) {
              var k = markHead * 4;
              marks[k] = px; marks[k + 1] = py; marks[k + 2] = wx; marks[k + 3] = wy;
              markHead = (markHead + 1) % MAXM;
              if (markN < MAXM) markN++;
            }
            car.wheelPrev[w * 2] = wx; car.wheelPrev[w * 2 + 1] = wy;
          }
        } else { car.wheelPrev[w * 2] = wx; car.wheelPrev[w * 2 + 1] = wy; }
      }
      car.wheelOk = true;
    }

    /* ---------- overlays ---------- */
    function closeOverlay() { if (overlay) { overlay.close(); overlay = null; } menuKey = null; }
    function openPanel(title, html, buttons) {
      closeOverlay();
      overlay = ui.overlay(root, { title: title, html: html, buttons: buttons });
      overlay.panel.classList.add('rb-panel');
      return overlay;
    }

    function openMenu() {
      state = 'menu';
      race = null;
      pauseBtn.style.display = 'none';
      showTouch(false);
      setupMenuScene();
      var tcards = '';
      for (var i = 0; i < TRACKS.length; i++) {
        var t = TRACKS[i], th = THEMES[t.theme];
        tcards += '<button type="button" class="rb-track' + (t.id === save.track ? ' sel' : '') + '" data-t="' + t.id + '"><span class="rb-sw" style="background:linear-gradient(90deg,' + th.ground + ',' + th.asphalt + ',' + th.curbB + ')"></span><b>' + t.name + '</b><small class="rb-tsub">' + t.sub + '</small><small>' + (save.best[t.id] != null ? 'Best lap ' + fmtTime(save.best[t.id]) : 'No lap record') + (save.wins[t.id] ? ' · 🏆' + save.wins[t.id] : '') + '</small></button>';
      }
      var lv = '';
      for (i = 0; i < CPU_LEVEL.length; i++) lv += '<button type="button" class="rb-chip' + (CPU_LEVEL[i].id === save.cpu ? ' sel' : '') + '" data-cpu="' + CPU_LEVEL[i].id + '">' + CPU_LEVEL[i].name + '</button>';
      var html =
        '<p class="rb-lede">Top-down party racing for one player or two friends on one keyboard. Bump rivals, hit the boost pads, dodge the oil — first across the line after the last lap wins.</p>' +
        '<div class="rb-seg"><button type="button" class="rb-opt' + (save.mode === 1 ? ' sel' : '') + '" data-m="1">1 Player<small>You vs 3 CPU racers</small></button><button type="button" class="rb-opt' + (save.mode === 2 ? ' sel' : '') + '" data-m="2">2 Players<small>WASD vs arrows + 2 CPU</small></button></div>' +
        (touchOn ? '<div class="rb-note" data-note' + (save.mode === 2 ? '' : ' hidden') + '>2 Players needs a keyboard: P1 uses W A S D, P2 uses the arrow keys.</div>' : '') +
        '<div class="rb-tracks">' + tcards + '</div>' +
        '<div class="rb-row"><span>Laps</span><button type="button" class="rb-chip' + (save.laps === 3 ? ' sel' : '') + '" data-laps="3">3</button><button type="button" class="rb-chip' + (save.laps === 5 ? ' sel' : '') + '" data-laps="5">5</button><span style="margin-left:8px">CPU</span>' + lv + '</div>';
      openPanel(TITLE, html, [{ label: 'Start race', primary: true, onClick: startRace }]);
      overlay.panel.appendChild(ui.el('div', 'rb-keys', 'P1: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · P2: <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> · <kbd>P</kbd> pause · 1 player can also use arrows, or hold the mouse to drive toward the pointer'));
      var pnl = overlay.panel;
      function bind(sel, fn) { Array.prototype.forEach.call(pnl.querySelectorAll(sel), function (b) { b.addEventListener('click', function () { ctx.sfx('tick'); fn(b); }); }); }
      function refreshSel(sel, attr, val) { Array.prototype.forEach.call(pnl.querySelectorAll(sel), function (x) { x.classList.toggle('sel', x.getAttribute(attr) === String(val)); }); }
      bind('.rb-opt', function (b) {
        save.mode = Number(b.getAttribute('data-m')); persist(); refreshSel('.rb-opt', 'data-m', save.mode);
        var note = pnl.querySelector('[data-note]');
        if (note) note.hidden = save.mode !== 2;
      });
      bind('.rb-track', function (b) { save.track = b.getAttribute('data-t'); persist(); refreshSel('.rb-track', 'data-t', save.track); setupMenuScene(); });
      bind('[data-laps]', function (b) { save.laps = Number(b.getAttribute('data-laps')); persist(); refreshSel('[data-laps]', 'data-laps', save.laps); });
      bind('[data-cpu]', function (b) { save.cpu = b.getAttribute('data-cpu'); persist(); refreshSel('[data-cpu]', 'data-cpu', save.cpu); });
      menuKey = function (code) {
        if (code === 'Enter' || code === 'Space') { ctx.sfx('click'); startRace(); }
        else if (code === 'Digit1' || code === 'Digit2') { save.mode = code === 'Digit1' ? 1 : 2; persist(); refreshSel('.rb-opt', 'data-m', save.mode); }
        else if (code === 'ArrowLeft' || code === 'ArrowRight') {
          var ti = (trackIndex(save.track) + (code === 'ArrowLeft' ? -1 : 1) + TRACKS.length) % TRACKS.length;
          save.track = TRACKS[ti].id; persist(); refreshSel('.rb-track', 'data-t', save.track); setupMenuScene(); ctx.sfx('tick');
        }
      };
    }

    // behind the menu: CPU cars lap the selected track
    function setupMenuScene() {
      useTrack(save.track);
      cars = []; humans = []; cones = [];
      for (var k = 0; k < 4; k++) {
        var c = makeCar(k === 0 ? 0 : k === 1 ? 1 : k, false, 0);
        c.skill = 0.8 + k * 0.03;
        gridPlace(c, k);
        cars.push(c);
      }
      cam.x = (track.bbox[0] + track.bbox[2]) / 2; cam.y = (track.bbox[1] + track.bbox[3]) / 2;
      cam.z = fitZoom();
    }

    function pauseGame() {
      if (!racing()) return;
      race.prev = state;
      state = 'paused';
      pauseBtn.style.display = 'none';
      showTouch(false);
      mouse.gas = mouse.brk = false;
      openPanel('Paused', '<p class="rb-lede" style="text-align:center">' + track.def.name + ' · ' + race.laps + ' laps · ' + (save.mode === 2 ? '2 players' : '1 player vs CPU') + '</p>', [
        { label: 'Resume', primary: true, onClick: resumeGame },
        { label: 'Restart race', onClick: startRace },
        { label: 'Quit', onClick: openMenu },
      ]);
      menuKey = function (code) { if (code === 'KeyP' || code === 'Escape' || code === 'Enter' || code === 'Space') resumeGame(); };
    }
    function resumeGame() {
      if (state !== 'paused') return;
      closeOverlay();
      state = race.prev || 'race';
      pauseBtn.style.display = '';
      showTouch(true);
      ctx.focus();
    }

    /* ---------- camera ---------- */
    function baseZoom() { return Math.sqrt(W * H) / 64; }
    function fitZoom() {
      var b = track.bbox;
      return Math.min(W / (b[2] - b[0] + 8), H / (b[3] - b[1] + 8));
    }
    function frameHumans(dt, snap) {
      var tz, tx, ty, fz = fitZoom(), bz = Math.max(baseZoom(), fz);
      if (humans.length === 1) {
        var c = humans[0];
        tz = bz / (1 + (c.speed || 0) / 90);
        tx = c.x + c.vx * 0.35; ty = c.y + c.vy * 0.35;
      } else {
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (var i = 0; i < humans.length; i++) {
          var h = humans[i];
          x0 = Math.min(x0, h.x + Math.min(0, h.vx * 0.5)); x1 = Math.max(x1, h.x + Math.max(0, h.vx * 0.5));
          y0 = Math.min(y0, h.y + Math.min(0, h.vy * 0.5)); y1 = Math.max(y1, h.y + Math.max(0, h.vy * 0.5));
        }
        var m = 26;
        tz = clamp(Math.min(W / (x1 - x0 + 2 * m), H / (y1 - y0 + 2 * m)), fz, bz * 0.9);
        tx = (x0 + x1) / 2; ty = (y0 + y1) / 2;
        // when nearly zoomed out, ease toward the track centre so the whole loop stays in frame
        var k = clamp((tz - fz) / (fz * 0.35), 0, 1), b = track.bbox;
        tx = lerp((b[0] + b[2]) / 2, tx, k); ty = lerp((b[1] + b[3]) / 2, ty, k);
      }
      if (snap) { cam.z = tz; cam.x = tx; cam.y = ty; return; }
      var f = 1 - Math.exp(-dt * 3.2);
      cam.z += (tz - cam.z) * f; cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f;
    }

    /* ---------- update ---------- */
    function update(dt) {
      if (!track) return;
      time += dt;
      var i, c;
      if (state === 'menu') {
        for (i = 0; i < cars.length; i++) {
          c = cars[i];
          c.surf = surfaceAt(c);
          aiDrive(c, dt);
          c.inp.thr = c.inp.thr && c.speed < 20 ? 1 : 0;
          stepCar(c, dt);
          wallCollide(c);
          tickCar(c, dt);
        }
        for (i = 0; i < cars.length; i++) for (var j = i + 1; j < cars.length; j++) carCollide(cars[i], cars[j]);
        var fz = fitZoom(), b = track.bbox;
        cam.z += (fz - cam.z) * Math.min(1, dt * 3);
        cam.x = (b[0] + b[2]) / 2; cam.y = (b[1] + b[3]) / 2;
      } else if (state === 'count' || state === 'race' || state === 'results') {
        if (state === 'count') {
          var before = Math.ceil(race.count);
          race.count -= dt;
          var after = Math.ceil(race.count);
          if (after !== before && after >= 1 && after <= 3) ctx.sfx({ f: 440, d: 0.16, type: 'square', v: 0.08 });
          if (race.count <= 0) { state = 'race'; ctx.sfx({ f: 880, d: 0.35, type: 'square', v: 0.09 }); for (i = 0; i < humans.length; i++) banner(humans[i], 'GO!', '#7CFFB2'); }
        }
        if (state === 'race') race.t += dt;
        // fixed substeps keep collisions stable
        var n = Math.ceil(dt / (1 / 120)), h = dt / n;
        for (i = 0; i < cars.length; i++) {
          c = cars[i];
          if (state === 'count') { c.inp.thr = c.inp.brk = c.inp.st = 0; }
          else if (c.finished || state === 'results') {
            // cool-down lap: CPUs cruise on, humans roll to a stop
            if (c.human) { c.inp.thr = 0; c.inp.st = 0; c.inp.brk = c.speed > 3 ? 1 : 0; }
            else { aiDrive(c, dt); c.inp.thr = c.speed < 12 ? 1 : 0; c.inp.brk = 0; }
          }
          else if (c.human) { if (autoPilot) aiDrive(c, dt); else humanInput(c); }
          else aiDrive(c, dt);
        }
        for (var s = 0; s < n; s++) {
          for (i = 0; i < cars.length; i++) {
            c = cars[i];
            c.surf = surfaceAt(c);
            if (!c.human && !c.finished) { var sk = c.skill; c.skill = sk * (c.rubber || 1); stepCar(c, h); c.skill = sk; }
            else stepCar(c, h);
            wallCollide(c);
          }
          for (i = 0; i < cars.length; i++) for (j = i + 1; j < cars.length; j++) carCollide(cars[i], cars[j]);
        }
        conePhysics(dt);
        for (i = 0; i < cars.length; i++) {
          c = cars[i];
          tickCar(c, dt);
          if (state === 'race' && !c.finished) lapCheck(c);
          carEffects(c, dt);
          if (c.human && state === 'race' && !c.finished) {
            // wrong-way warning
            var tdot = c.vx * track.TX[c.hint] + c.vy * track.TY[c.hint];
            c.wrongT = tdot < -3 ? c.wrongT + dt : 0;
            if (c.wrongT > 1) banner(c, 'WRONG WAY!', '#ff6b6b');
          }
        }
        rank();
        if (state === 'race') {
          var allHumans = true, anyHuman = false;
          for (i = 0; i < humans.length; i++) { if (!humans[i].finished) allHumans = false; else anyHuman = true; }
          // 2P: once one player is home, the other gets 20 s to finish
          if (anyHuman && !allHumans && race.graceT == null) race.graceT = 20;
          if (race.graceT != null && !allHumans) {
            race.graceT -= dt;
            if (race.graceT <= 0) allHumans = true;
          }
          if (allHumans && !race.doneT) race.doneT = race.t;
          if (race.doneT && (race.t - race.doneT > 2.2 || race.finishOrder.length === cars.length)) finishRace();
        }
        if (state === 'results' && endT > 0) { endT -= dt; if (endT <= 0) showResults(); }
        frameHumans(dt, false);
        engineSound(dt);
      }
      if (state !== 'paused') {
        updateParticles(dt);
        for (i = banners.length - 1; i >= 0; i--) { banners[i].t += dt; if (banners[i].t > 1.4) banners.splice(i, 1); }
      }
      cam.shake = Math.max(0, cam.shake - dt * 2.5);
      var sh = cam.shake * cam.shake * 0.8 * cam.z;
      cam.sx = W / 2 + (Math.random() - 0.5) * sh;
      cam.sy = (touchOn && save.mode === 1 && racing() ? H * 0.44 : H / 2) + (Math.random() - 0.5) * sh;
      if (ctx.debug) window.__rb = { state: state, cars: cars, race: race, track: track, cam: cam };
    }

    function tickCar(c, dt) {
      c.boostT = Math.max(0, c.boostT - dt);
      c.boostCool = Math.max(0, c.boostCool - dt);
      c.oilT = Math.max(0, c.oilT - dt);
      c.oilCool = Math.max(0, c.oilCool - dt);
      c.bumpCool = Math.max(0, c.bumpCool - dt);
    }

    function engineSound(dt) {
      sndT -= dt;
      if (sndT > 0 || state !== 'race') return;
      sndT = 0.08;
      var sp = 0, thr = 0;
      for (var i = 0; i < humans.length; i++) { sp = Math.max(sp, humans[i].speed || 0); thr = thr || humans[i].inp.thr; }
      var f = 70 + (sp % 11) * 6 + sp * 1.6;
      ctx.sfx({ f: f, f2: f * 1.05, d: 0.1, type: 'sawtooth', v: thr ? 0.03 : 0.014 });
    }

    /* ---------- render ---------- */
    var visChunks = [], curbDash = [1.4, 1.4], centerDash = [2.5, 3.5], tyreDash = [0.01, 1.25], noDash = [];
    function render() {
      var dpr = view.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!track) { g.fillStyle = '#0b0d17'; g.fillRect(0, 0, W, H); return; }
      var sc = cam.z, th = track.theme;
      var x0 = cam.x - cam.sx / sc, y0 = cam.y - cam.sy / sc, x1 = cam.x + (W - cam.sx) / sc, y1 = cam.y + (H - cam.sy) / sc;
      g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * (cam.sx - cam.x * sc), dpr * (cam.sy - cam.y * sc));
      g.fillStyle = groundPat || th.ground;
      g.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
      drawDecos(x0, y0, x1, y1, true);
      drawTrack(x0, y0, x1, y1);
      drawHazards(x0, y0, x1, y1);
      drawMarks(x0, y0, x1, y1);
      drawDecos(x0, y0, x1, y1, false);
      drawCones();
      for (var i = 0; i < cars.length; i++) {
        var c = cars[i];
        if (c.x < x0 - 6 || c.x > x1 + 6 || c.y < y0 - 6 || c.y > y1 + 6) continue;
        g.save();
        g.translate(c.x, c.y);
        g.rotate(c.a);
        drawCar(g, c, th.night);
        g.restore();
      }
      drawParticles(th);
      if (th.night) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
        vg.addColorStop(0, 'rgba(10,0,30,0)');
        vg.addColorStop(1, 'rgba(10,0,30,0.45)');
        g.fillStyle = vg;
        g.fillRect(0, 0, W, H);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawHud();
    }

    function drawTrack(x0, y0, x1, y1) {
      var tr = track, th = tr.theme, ch = tr.chunks, i, hw = tr.hw;
      visChunks.length = 0;
      for (i = 0; i < ch.length; i++) { var b = ch[i].b; if (b[2] >= x0 && b[0] <= x1 && b[3] >= y0 && b[1] <= y1) visChunks.push(ch[i]); }
      var v = visChunks;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      // outer wall band then the verge (run-off)
      g.strokeStyle = th.wall;
      g.lineWidth = 2 * (tr.wallHW + 1.1);
      for (i = 0; i < v.length; i++) g.stroke(v[i].path);
      g.strokeStyle = th.verge;
      g.lineWidth = 2 * tr.wallHW;
      for (i = 0; i < v.length; i++) g.stroke(v[i].path);
      // wall detail along the barrier line: tyre stacks / hay bales / snow / a neon tube
      if (th.night) { g.shadowColor = th.wallHi; g.shadowBlur = 10; }
      g.strokeStyle = th.wallHi;
      g.lineWidth = th.night ? 0.3 : 0.75;
      g.setLineDash(th.night ? noDash : tyreDash);
      for (i = 0; i < v.length; i++) g.stroke(v[i].walls);
      g.setLineDash(noDash);
      g.shadowBlur = 0;
      // curbs in corners
      g.lineCap = 'butt';
      for (i = 0; i < v.length; i++) {
        if (!v[i].curvy) continue;
        g.strokeStyle = th.curbA;
        g.lineWidth = 2 * hw + 1.8;
        g.stroke(v[i].path);
        g.setLineDash(curbDash);
        g.lineDashOffset = -v[i].s0;
        g.strokeStyle = th.curbB;
        g.stroke(v[i].path);
        g.setLineDash(noDash);
      }
      g.lineCap = 'round';
      g.strokeStyle = asphaltPat || th.asphalt;
      g.lineWidth = 2 * hw;
      for (i = 0; i < v.length; i++) g.stroke(v[i].path);
      g.strokeStyle = th.line;
      g.lineWidth = th.night ? 0.3 : 0.25;
      if (th.night) { g.shadowColor = 'rgba(80,240,255,0.9)'; g.shadowBlur = 8; }
      for (i = 0; i < v.length; i++) g.stroke(v[i].edges);
      g.shadowBlur = 0;
      g.strokeStyle = th.center;
      g.lineWidth = 0.25;
      g.lineCap = 'butt';
      g.setLineDash(centerDash);
      for (i = 0; i < v.length; i++) { g.lineDashOffset = -v[i].s0; g.stroke(v[i].path); }
      g.setLineDash(noDash);
      // start line + grid boxes
      var si = tr.startI, a = Math.atan2(tr.TY[si], tr.TX[si]);
      g.save();
      g.translate(tr.X[si], tr.Y[si]);
      g.rotate(a);
      var cells = 10, cs = (hw * 2) / cells;
      for (var r = 0; r < 2; r++) for (var q = 0; q < cells; q++) { g.fillStyle = (r + q) % 2 ? '#111' : '#f4f4f4'; g.fillRect(r * cs - cs, -hw + q * cs, cs, cs); }
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 0.18;
      for (var k = 0; k < 4; k++) {
        var row = Math.floor(k / 2), col = k % 2, back = 7 + row * 7.5 + col * 2.5, lat = col ? 3.4 : -3.4;
        g.beginPath(); g.moveTo(-back + 2.2, lat - 1.3); g.lineTo(-back + 2.2, lat + 1.3); g.moveTo(-back + 2.2, lat - 1.3); g.lineTo(-back - 0.5, lat - 1.3); g.moveTo(-back + 2.2, lat + 1.3); g.lineTo(-back - 0.5, lat + 1.3); g.stroke();
      }
      g.restore();
    }

    function drawHazards(x0, y0, x1, y1) {
      var hz = track.haz, i;
      for (i = 0; i < hz.length; i++) {
        var o = hz[i];
        if (o.x < x0 - 15 || o.x > x1 + 15 || o.y < y0 - 15 || o.y > y1 + 15) continue;
        g.save();
        g.translate(o.x, o.y);
        g.rotate(o.a);
        if (o.t === 'boost') {
          g.fillStyle = '#20232b';
          rrect(g, -3, -2, 6, 4, 0.5); g.fill();
          var ph = (time * 3) % 1;
          for (var k = 0; k < 3; k++) {
            var on = ((k / 3 + ph) % 1);
            g.fillStyle = 'rgba(255,' + Math.round(150 + on * 90) + ',40,' + (0.55 + on * 0.45).toFixed(2) + ')';
            var cx = -1.9 + k * 1.5;
            g.beginPath(); g.moveTo(cx, -1.5); g.lineTo(cx + 1.1, 0); g.lineTo(cx, 1.5); g.lineTo(cx - 0.5, 1.5); g.lineTo(cx + 0.6, 0); g.lineTo(cx - 0.5, -1.5); g.closePath(); g.fill();
          }
        } else if (o.t === 'oil') {
          g.fillStyle = 'rgba(12,10,20,0.88)';
          g.beginPath(); g.ellipse(0, 0, 2.7, 2.1, 0.4, 0, TAU); g.ellipse(1.6, 1, 1.3, 1, 0, 0, TAU); g.ellipse(-1.8, -0.9, 1.1, 0.8, 0, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(140,90,255,0.45)';
          g.lineWidth = 0.18;
          g.beginPath(); g.ellipse(-0.3, -0.2, 1.4, 0.9, 0.4, 0, TAU); g.stroke();
          g.strokeStyle = 'rgba(80,220,255,0.35)';
          g.beginPath(); g.ellipse(0.4, 0.3, 0.8, 0.5, 0.4, 0, TAU); g.stroke();
        } else if (o.t === 'ice') {
          g.fillStyle = 'rgba(170,220,255,0.55)';
          g.beginPath(); g.ellipse(0, 0, o.rx, o.ry, 0, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.7)';
          g.lineWidth = 0.2;
          g.beginPath(); g.moveTo(-6, -2); g.lineTo(-2, 1); g.lineTo(3, -1); g.moveTo(1, 3); g.lineTo(5, 1); g.stroke();
        }
        g.restore();
      }
    }

    function drawCones() {
      for (var i = 0; i < cones.length; i++) {
        var o = cones[i];
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath(); g.arc(o.x + 0.15, o.y + 0.2, 0.5, 0, TAU); g.fill();
        g.fillStyle = '#ff7a1a';
        g.beginPath(); g.arc(o.x, o.y, 0.48, 0, TAU); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(o.x, o.y, 0.24, 0, TAU); g.fill();
        g.fillStyle = '#ff7a1a';
        g.beginPath(); g.arc(o.x, o.y, 0.11, 0, TAU); g.fill();
      }
    }

    function drawMarks(x0, y0, x1, y1) {
      if (!markN) return;
      g.strokeStyle = track.theme.night ? 'rgba(0,0,0,0.45)' : 'rgba(20,20,22,0.32)';
      g.lineWidth = 0.32;
      g.lineCap = 'round';
      g.beginPath();
      for (var i = 0; i < markN; i++) {
        var k = i * 4, mx = marks[k], my = marks[k + 1];
        if (mx < x0 - 2 || mx > x1 + 2 || my < y0 - 2 || my > y1 + 2) continue;
        g.moveTo(mx, my);
        g.lineTo(marks[k + 2], marks[k + 3]);
      }
      g.stroke();
    }

    var TREE = [['#1f5a28', '#2f8a3a', '#58b257'], ['#2a6a2a', '#3c973c', '#73c45d'], ['#215d3a', '#2f8456', '#5bb07c']];
    var CONT = ['#d2462f', '#2f7fbf', '#e2a21f', '#3e9e6a'];
    function drawDecos(x0, y0, x1, y1, ground) {
      var list = track.decos;
      for (var i = 0; i < list.length; i++) {
        var o = list[i], gr = o.t === 'ripple' || o.t === 'drift' || o.t === 'flower';
        if (gr !== ground) continue;
        var r = o.r || 8;
        if (o.x + r < x0 || o.x - r > x1 || o.y + r < y0 || o.y - r > y1) continue;
        drawDeco(o);
      }
    }
    function drawDeco(o) {
      var c, k;
      switch (o.t) {
        case 'tree':
          c = TREE[o.c];
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(o.x + o.r * 0.3, o.y + o.r * 0.4, o.r, 0, TAU); g.fill();
          g.fillStyle = c[0]; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill();
          g.fillStyle = c[1]; g.beginPath(); g.arc(o.x - o.r * 0.18, o.y - o.r * 0.2, o.r * 0.7, 0, TAU); g.fill();
          g.fillStyle = c[2]; g.beginPath(); g.arc(o.x - o.r * 0.35, o.y - o.r * 0.38, o.r * 0.3, 0, TAU); g.fill();
          break;
        case 'bush':
          g.fillStyle = '#2f7d34'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.arc(o.x + o.r, o.y + 0.3, o.r * 0.8, 0, TAU); g.fill();
          break;
        case 'flower':
          g.fillStyle = '#5a3d2b'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill();
          g.fillStyle = ['#ff5d8f', '#ffd23f', '#ffffff'][o.c];
          for (k = 0; k < 6; k++) { g.beginPath(); g.arc(o.x + Math.cos(k * 1.05) * o.r * 0.55, o.y + Math.sin(k * 1.05) * o.r * 0.55, o.r * 0.22, 0, TAU); g.fill(); }
          break;
        case 'cactus':
          g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(o.x + 0.5, o.y + 0.6, o.r, 0, TAU); g.fill();
          g.fillStyle = '#3f8f4a'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill();
          g.fillStyle = '#5fb267'; g.beginPath(); g.arc(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.45, 0, TAU); g.fill();
          g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(o.x + o.r * 0.3, o.y - o.r * 0.4, 0.18, 0, TAU); g.fill();
          break;
        case 'rock':
          g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.arc(o.x + 0.4, o.y + 0.5, o.r, 0, TAU); g.fill();
          g.fillStyle = '#b9895a'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill();
          g.fillStyle = '#d6a978'; g.beginPath(); g.arc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.5, 0, TAU); g.fill();
          break;
        case 'ripple':
          g.strokeStyle = 'rgba(160,110,50,0.25)'; g.lineWidth = 0.35;
          g.beginPath(); g.arc(o.x, o.y + o.r, o.r, -2.3, -0.8); g.stroke();
          g.beginPath(); g.arc(o.x + 1.5, o.y + o.r + 1.4, o.r, -2.3, -0.8); g.stroke();
          break;
        case 'pine':
          g.fillStyle = 'rgba(40,60,90,0.18)'; g.beginPath(); g.arc(o.x + o.r * 0.4, o.y + o.r * 0.5, o.r, 0, TAU); g.fill();
          g.fillStyle = '#1f5b45';
          g.beginPath();
          for (k = 0; k < 16; k++) { var rr = k % 2 ? o.r * 0.55 : o.r, an = (k / 16) * TAU; if (!k) g.moveTo(o.x + Math.cos(an) * rr, o.y + Math.sin(an) * rr); else g.lineTo(o.x + Math.cos(an) * rr, o.y + Math.sin(an) * rr); }
          g.closePath(); g.fill();
          g.fillStyle = '#f4f8ff'; g.beginPath(); g.arc(o.x - o.r * 0.15, o.y - o.r * 0.15, o.r * 0.38, 0, TAU); g.fill();
          g.fillStyle = '#2d7a5c'; g.beginPath(); g.arc(o.x, o.y, o.r * 0.15, 0, TAU); g.fill();
          break;
        case 'drift':
          g.fillStyle = 'rgba(150,170,200,0.25)'; g.beginPath(); g.ellipse(o.x + 0.6, o.y + 0.7, o.r * 1.4, o.r * 0.7, 0.3, 0, TAU); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(o.x, o.y, o.r * 1.4, o.r * 0.7, 0.3, 0, TAU); g.fill();
          break;
        case 'cont':
          g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(o.x - o.w / 2 + 0.7, o.y - o.h / 2 + 0.7, o.w, o.h);
          g.fillStyle = CONT[o.c]; g.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          if (o.w > o.h) for (k = 1; k < 12; k++) g.fillRect(o.x - o.w / 2 + k, o.y - o.h / 2, 0.12, o.h);
          else for (k = 1; k < 12; k++) g.fillRect(o.x - o.w / 2, o.y - o.h / 2 + k, o.w, 0.12);
          break;
        case 'bollard':
          g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(o.x, o.y, 0.45, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,210,63,0.25)'; g.beginPath(); g.arc(o.x, o.y, 1.4, 0, TAU); g.fill();
          break;
        case 'stand':
          g.save(); g.translate(o.x, o.y); g.rotate(o.a);
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-13, -3.5, 27, 8);
          g.fillStyle = '#8b93a6'; g.fillRect(-14, -4.5, 28, 8);
          for (k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#a7afc2' : '#7b8396'; g.fillRect(-13.5, -4 + k * 2.5, 27, 2.2); }
          for (k = 0; k < 26; k++) { g.fillStyle = CONF[k % CONF.length]; g.beginPath(); g.arc(-12.5 + k, -3 + (k % 3) * 2.5, 0.42, 0, TAU); g.fill(); }
          g.fillStyle = '#e8413c'; g.fillRect(-14, 3.2, 28, 0.6);
          g.restore();
          break;
      }
    }

    function drawParticles(th) {
      var i, p;
      for (i = 0; i < MAXP; i++) {
        p = P[i];
        if (!p.on || p.k !== 0) continue;
        g.globalAlpha = (1 - p.life / p.max) * 0.5;
        g.drawImage(dustSprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      g.globalAlpha = 1;
      g.strokeStyle = '#ffd36b';
      g.lineWidth = 0.14;
      g.beginPath();
      for (i = 0; i < MAXP; i++) { p = P[i]; if (p.on && p.k === 1) { g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); } }
      g.stroke();
      for (i = 0; i < MAXP; i++) {
        p = P[i];
        if (!p.on || p.k !== 2) continue;
        g.fillStyle = p.c;
        g.fillRect(p.x - p.r / 2, p.y - p.r / 4, p.r, p.r / 2);
      }
    }

    /* ---------- HUD ---------- */
    var curFont = '';
    function font(px, w) { var f = (w || 800) + ' ' + Math.round(px) + 'px ' + FONT; if (f !== curFont) { g.font = f; curFont = f; } }
    function text(s, x, y, px, color, align, w) {
      font(px, w);
      g.textAlign = align || 'left';
      g.lineWidth = Math.max(2, px * 0.16);
      g.strokeStyle = 'rgba(5,6,14,0.78)';
      g.strokeText(s, x, y);
      g.fillStyle = color || '#fff';
      g.fillText(s, x, y);
    }
    function box(x, y, w, h, r, col) { g.fillStyle = col || 'rgba(5,6,14,0.58)'; rrect(g, x, y, w, h, r); g.fill(); }
    function toScreen(x, y, out) { out[0] = cam.sx + (x - cam.x) * cam.z; out[1] = cam.sy + (y - cam.y) * cam.z; return out; }
    var SP = [0, 0];

    function drawHud() {
      curFont = '';
      g.textBaseline = 'alphabetic';
      g.lineJoin = 'round';
      var u = U, pad = Math.round(10 * Math.max(1, u)), i;
      if (state === 'menu') {
        var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(5,6,14,0)');
        vg.addColorStop(1, 'rgba(5,6,14,0.5)');
        g.fillStyle = vg;
        g.fillRect(0, 0, W, H);
        return;
      }
      if (!race) return;
      // player markers above human cars (always visible in 2P, briefly in 1P)
      for (i = 0; i < humans.length; i++) {
        var hc = humans[i];
        if (save.mode === 1 && race.t > 4 && state !== 'count') continue;
        toScreen(hc.x, hc.y, SP);
        var lbl = save.mode === 1 ? 'YOU' : 'P' + hc.pid, ly = SP[1] - Math.max(22, cam.z * 3.2);
        font(12 * u, 900);
        var lw = g.measureText(lbl).width + 12;
        box(SP[0] - lw / 2, ly - 14 * u, lw, 18 * u, 6, hc.drv.color);
        g.fillStyle = hc.drv.color;
        g.beginPath(); g.moveTo(SP[0] - 5, ly + 4 * u - 1); g.lineTo(SP[0] + 5, ly + 4 * u - 1); g.lineTo(SP[0], ly + 9 * u); g.closePath(); g.fill();
        g.textAlign = 'center';
        g.fillStyle = '#fff';
        g.fillText(lbl, SP[0], ly);
      }
      // per-player panels
      for (i = 0; i < humans.length; i++) drawPlayerPanel(humans[i], i, pad, u);
      // race clock (plus the 2P "finish within" countdown)
      text(fmtTime(race.t), W / 2, pad + 26 * u, 24 * u, '#fff', 'center', 900);
      if (race.graceT != null && race.graceT > 0 && state === 'race' && !race.doneT) text('FINISH IN ' + Math.ceil(race.graceT) + 's', W / 2, pad + 64 * u, 15 * u, '#ff6b6b', 'center', 900);
      text(track.def.name.toUpperCase(), W / 2, pad + 42 * u, 10 * u, '#aab0d6', 'center', 800);
      // standings + minimap in 1P
      if (save.mode === 1) {
        drawMinimap(pad);
        if (W > 420) drawStandings(pad, pad + 70 * u + 8, u);
      }
      // countdown lights
      if (state === 'count') {
        var n = Math.ceil(race.count), lit = 4 - n, cx = W / 2, cy = H * 0.3, rr = 16 * u;
        box(cx - rr * 4.6, cy - rr * 1.5, rr * 9.2, rr * 3, rr);
        for (var k = 0; k < 3; k++) {
          g.fillStyle = k < lit ? '#ff3b3b' : 'rgba(255,255,255,0.12)';
          g.beginPath(); g.arc(cx + (k - 1) * rr * 2.8, cy, rr, 0, TAU); g.fill();
        }
        if (race.count < 3.2) {
          var hint = save.mode === 2 ? 'P1: W A S D   ·   P2: arrow keys' : touchOn ? 'Hold GAS · steer with ◀ ▶' : 'W / ↑ accelerate · A D / ← → steer · S / ↓ brake';
          font(13 * u, 800);
          var hwid = g.measureText(hint).width + 24, hy = touchOn && save.mode === 1 ? H * 0.6 : H - pad - 34 * u;
          box(W / 2 - hwid / 2, hy, hwid, 26 * u, 10);
          text(hint, W / 2, hy + 18 * u, 13 * u, '#fff', 'center', 800);
        }
      }
      // banners near each human's panel (P1 left, P2 right in 2P; centred in 1P)
      for (i = 0; i < banners.length; i++) {
        var bn = banners[i], k2 = bn.t / 1.4, a = k2 < 0.12 ? k2 / 0.12 : 1 - Math.max(0, (k2 - 0.6) / 0.4);
        var bx = save.mode === 2 ? (bn.car.pid === 1 ? W * 0.27 : W * 0.73) : W / 2;
        var stack = 0;
        for (var j = i + 1; j < banners.length; j++) if (banners[j].car === bn.car) stack++;
        g.globalAlpha = clamp(a, 0, 1);
        text(bn.text, bx, H * 0.38 - k2 * 30 * u - stack * 32 * u, 26 * u * (k2 < 0.12 ? 0.75 + k2 * 2 : 1), bn.color, 'center', 900);
      }
      g.globalAlpha = 1;
    }

    function drawPlayerPanel(c, idx, pad, u) {
      var w = 150 * u, h = 62 * u, right = save.mode === 2 && idx === 1;
      var x = right ? W - pad - w - 52 : pad, y = pad;
      box(x, y, w, h, 12);
      g.fillStyle = c.drv.color;
      rrect(g, x, y, 6 * u, h, 3); g.fill();
      var lapShown = Math.min(race.laps, c.lap + 1);
      text(save.mode === 2 ? 'PLAYER ' + c.pid : 'YOU', x + 14 * u, y + 17 * u, 11 * u, '#aab0d6', 'left', 900);
      text(ord(c.pos) + '/' + cars.length, x + w - 10 * u, y + 18 * u, 14 * u, c.pos === 1 ? '#ffd23f' : '#fff', 'right', 900);
      text(c.finished ? 'FINISHED' : 'LAP ' + lapShown + '/' + race.laps, x + 14 * u, y + 39 * u, 19 * u, '#fff', 'left', 900);
      var lt = c.finished ? c.finishT : race.t - c.lapStart;
      text((c.bestLap != null && W > 420 ? 'Best ' + fmtTime(c.bestLap) + ' · ' : '') + fmtTime(Math.max(0, lt)), x + 14 * u, y + 55 * u, 10.5 * u, '#c4c8ea', 'left', 800);
    }

    function drawStandings(pad, y, u) {
      var order = cars.slice().sort(function (a, b) { return a.pos - b.pos; });
      var rowH = 17 * u, w = 118 * u;
      box(pad, y, w, rowH * order.length + 8, 10);
      for (var i = 0; i < order.length; i++) {
        var c = order[i], yy = y + 4 + rowH * (i + 0.75);
        g.fillStyle = c.drv.color;
        g.beginPath(); g.arc(pad + 12 * u, yy - 4 * u, 4.5 * u, 0, TAU); g.fill();
        text(c.pos + '. ' + c.drv.name, pad + 21 * u, yy, 11.5 * u, c.human ? '#fff' : '#c4c8ea', 'left', c.human ? 900 : 700);
      }
    }

    function drawMinimap(pad) {
      var size = Math.round(clamp(Math.min(W, H) * 0.24, 72, 170)), mh = Math.round(size * 0.62);
      if (!minimap || mmTrack !== track || minimap.width !== Math.round(size * view.dpr)) buildMinimap(size, mh);
      var x = W - pad - size, y = pad + 52;
      g.drawImage(minimap, x, y, size, mh);
      var m = minimap.meta;
      for (var i = cars.length - 1; i >= 0; i--) {
        var c = cars[i];
        g.fillStyle = c.drv.color;
        g.strokeStyle = c.human ? '#fff' : 'rgba(0,0,0,0.6)';
        g.lineWidth = c.human ? 2 : 1;
        g.beginPath(); g.arc(x + m.ox + (c.x - m.x0) * m.s, y + m.oy + (c.y - m.y0) * m.s, c.human ? 4.5 : 3.2, 0, TAU); g.fill(); g.stroke();
      }
    }
    function buildMinimap(size, mh) {
      var dpr = view.dpr, c = document.createElement('canvas');
      c.width = Math.round(size * dpr); c.height = Math.round(mh * dpr);
      var x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = 'rgba(5,6,14,0.55)';
      rrect(x, 0, 0, size, mh, 10); x.fill();
      var b = track.bbox, bw = b[2] - b[0], bh = b[3] - b[1], s = Math.min((size - 14) / bw, (mh - 14) / bh);
      var ox = (size - bw * s) / 2, oy = (mh - bh * s) / 2;
      x.save(); x.translate(ox, oy); x.scale(s, s); x.translate(-b[0], -b[1]);
      x.lineJoin = 'round';
      x.strokeStyle = 'rgba(255,255,255,0.85)';
      x.lineWidth = Math.max(TRACK_W * 0.8, 3 / s);
      x.beginPath();
      for (var i = 0; i <= track.N; i++) { var k = i % track.N; if (!i) x.moveTo(track.X[k], track.Y[k]); else x.lineTo(track.X[k], track.Y[k]); }
      x.stroke();
      x.restore();
      c.meta = { x0: b[0], y0: b[1], s: s, ox: ox, oy: oy };
      minimap = c; mmTrack = track;
    }

    /* ---------- loop ---------- */
    var loop = IGAME.loop(function (dt) { update(dt); render(); });
    openMenu();
    loop.start();

    return {
      pause: function () { if (racing()) pauseGame(); loop.stop(); },
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
        if (ctx.debug) { try { delete window.__rb; } catch (e) {} }
      },
    };
  });
})();
