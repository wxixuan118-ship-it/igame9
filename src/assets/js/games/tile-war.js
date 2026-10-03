/*!
 * igame9 — Frontline Tiles (engine id: "tile-war")
 * An original two-layer tile-matching puzzle in the style of War Mahjong.
 *
 * Rules
 *  - The board is a grid of stacks; each stack holds up to two tiles and only the
 *    top tile is visible. Click a visible tile that touches an identical visible tile
 *    (left/right/up/down) and its whole connected group is cleared.
 *  - Clearing a top tile reveals the tile below. When a cell is completely empty the
 *    stacks above it fall down; in campaign mode an emptied column makes the
 *    columns close in toward the centre.
 *  - Tiles that land next to a NEW identical neighbour clear by themselves: a combo.
 *    Every combo wave earns a bomb (removes any single tile) and a little time.
 *  - Campaign: 24 sectors with growing boards and a timer, 1–3 stars by time left.
 *    Endless: the board refills from the top; clear tiles to earn time.
 */
(function () {
  'use strict';
  var IG = window.IGAME;

  /* ------------------------------------------------------------------ */
  /* Tile set: ten military symbols, each with its own colour             */
  /* ------------------------------------------------------------------ */
  var TYPES = [
    { name: 'Tank', color: '#4a7a22' },
    { name: 'Jet', color: '#1a72c7' },
    { name: 'Helmet', color: '#8c5523' },
    { name: 'Medal', color: '#cf960a' },
    { name: 'Star', color: '#d6322a' },
    { name: 'Anchor', color: '#253a92' },
    { name: 'Shield', color: '#7a39bd' },
    { name: 'Compass', color: '#0b8c84' },
    { name: 'Flag', color: '#e2600c' },
    { name: 'Parachute', color: '#c42a79' },
  ];

  /* Campaign sectors. c × r = board (landscape; transposed on portrait screens),
     t = tile kinds, time = seconds, s2 / s3 = seconds left needed for 2 / 3 stars.
     Timings were tuned with a simulated player (casual, average and fast pace). */
  var LEVELS = [
    { c: 5, r: 4, t: 4, shape: 'rect', time: 50, s2: 25, s3: 35 },
    { c: 6, r: 4, t: 4, shape: 'rect', time: 55, s2: 25, s3: 35 },
    { c: 6, r: 5, t: 5, shape: 'pyramid', time: 85, s2: 45, s3: 55 },
    { c: 7, r: 5, t: 5, shape: 'rect', time: 85, s2: 40, s3: 55 },
    { c: 7, r: 5, t: 5, shape: 'towers', time: 95, s2: 50, s3: 60 },
    { c: 7, r: 6, t: 5, shape: 'valley', time: 90, s2: 40, s3: 55 },
    { c: 8, r: 5, t: 6, shape: 'rect', time: 115, s2: 40, s3: 60 },
    { c: 8, r: 6, t: 6, shape: 'pyramid', time: 110, s2: 40, s3: 60 },
    { c: 8, r: 6, t: 6, shape: 'mixed', time: 95, s2: 40, s3: 55 },
    { c: 8, r: 7, t: 6, shape: 'rect', time: 125, s2: 50, s3: 65 },
    { c: 9, r: 6, t: 7, shape: 'towers', time: 145, s2: 35, s3: 55 },
    { c: 9, r: 7, t: 7, shape: 'valley', time: 150, s2: 40, s3: 60 },
    { c: 9, r: 7, t: 7, shape: 'rect', time: 155, s2: 40, s3: 60 },
    { c: 10, r: 6, t: 7, shape: 'mixed', time: 125, s2: 35, s3: 50 },
    { c: 10, r: 7, t: 7, shape: 'pyramid', time: 145, s2: 40, s3: 55 },
    { c: 10, r: 7, t: 8, shape: 'rect', time: 185, s2: 40, s3: 60 },
    { c: 10, r: 8, t: 8, shape: 'towers', time: 190, s2: 45, s3: 65 },
    { c: 10, r: 8, t: 8, shape: 'valley', time: 185, s2: 45, s3: 60 },
    { c: 11, r: 7, t: 8, shape: 'mixed', time: 165, s2: 45, s3: 60 },
    { c: 11, r: 8, t: 8, shape: 'rect', time: 200, s2: 45, s3: 65 },
    { c: 11, r: 8, t: 9, shape: 'pyramid', time: 200, s2: 45, s3: 65 },
    { c: 11, r: 8, t: 9, shape: 'towers', time: 215, s2: 45, s3: 65 },
    { c: 11, r: 8, t: 9, shape: 'mixed', time: 190, s2: 45, s3: 60 },
    { c: 11, r: 8, t: 10, shape: 'rect', time: 240, s2: 50, s3: 70 },
  ];

  var START_BOMBS = 2;
  var MAX_BOMBS = 9;
  var SHUFFLE_PENALTY = 6; // seconds
  var COMBO_TIME = 2; // seconds per combo wave (campaign)

  /* ------------------------------------------------------------------ */
  /* Board logic (no drawing; also used by the debug/test hooks)         */
  /* ------------------------------------------------------------------ */
  function pairKey(a, b) {
    return a < b ? a * 1048576 + b : b * 1048576 + a;
  }

  function Board(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.cells = [];
    for (var i = 0; i < cols * rows; i++) this.cells.push([]);
    this.nextId = 1;
  }
  Board.prototype.makeTile = function (t) {
    return { id: this.nextId++, t: t, ox: 0, oy: 0, vy: 0, land: 0, flip: 0 };
  };
  Board.prototype.top = function (i) {
    var s = this.cells[i];
    return s.length ? s[s.length - 1] : null;
  };
  Board.prototype.count = function () {
    var n = 0;
    for (var i = 0; i < this.cells.length; i++) n += this.cells[i].length;
    return n;
  };
  // Connected group of identical visible tiles containing cell i (array of cell indices).
  Board.prototype.group = function (i) {
    var t = this.top(i);
    if (!t) return [];
    var cols = this.cols, rows = this.rows;
    var seen = {};
    var todo = [i];
    var out = [];
    seen[i] = 1;
    while (todo.length) {
      var k = todo.pop();
      out.push(k);
      var c = k % cols, r = (k / cols) | 0;
      for (var d = 0; d < 4; d++) {
        var nc = c + (d === 0 ? 1 : d === 1 ? -1 : 0);
        var nr = r + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        var n = nr * cols + nc;
        if (seen[n]) continue;
        var nt = this.top(n);
        if (nt && nt.t === t.t) {
          seen[n] = 1;
          todo.push(n);
        }
      }
    }
    return out;
  };
  // Calls fn(a, b) for every pair of orthogonally adjacent cells whose visible tiles match.
  Board.prototype.eachPair = function (fn) {
    var cols = this.cols, rows = this.rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c;
        var a = this.top(i);
        if (!a) continue;
        if (c + 1 < cols) {
          var b = this.top(i + 1);
          if (b && b.t === a.t && fn(i, i + 1, a, b)) return true;
        }
        if (r + 1 < rows) {
          var d = this.top(i + cols);
          if (d && d.t === a.t && fn(i, i + cols, a, d)) return true;
        }
      }
    }
    return false;
  };
  Board.prototype.hasMove = function () {
    return this.eachPair(function () { return true; });
  };
  // Set of identical visible contacts, keyed by tile ids.
  Board.prototype.pairSet = function () {
    var set = new Set();
    this.eachPair(function (i, j, a, b) { set.add(pairKey(a.id, b.id)); });
    return set;
  };
  // Groups that contain at least one identical contact that did not exist in `before`.
  Board.prototype.autoGroups = function (before) {
    var self = this;
    var fresh = [];
    this.eachPair(function (i, j, a, b) {
      if (!before.has(pairKey(a.id, b.id))) fresh.push(i);
    });
    var groups = [];
    var used = {};
    fresh.forEach(function (i) {
      if (used[i]) return;
      var g = self.group(i);
      g.forEach(function (k) { used[k] = 1; });
      groups.push(g);
    });
    return groups;
  };
  // Biggest available group (used by hints and by the auto-player in tests).
  Board.prototype.bestGroup = function () {
    var best = null;
    var used = {};
    for (var i = 0; i < this.cells.length; i++) {
      if (used[i] || !this.top(i)) continue;
      var g = this.group(i);
      g.forEach(function (k) { used[k] = 1; });
      if (g.length >= 2 && (!best || g.length > best.length)) best = g;
    }
    return best;
  };
  Board.prototype.removeTops = function (idxs) {
    var out = [];
    for (var k = 0; k < idxs.length; k++) {
      var t = this.cells[idxs[k]].pop();
      if (t) out.push(t);
    }
    return out;
  };
  // Gravity (+ optional refill from the top, + optional column collapse toward the centre).
  // Updates tile.ox / tile.oy so the renderer can animate from the old positions.
  Board.prototype.settle = function (refill, collapse) {
    var cols = this.cols, rows = this.rows, cells = this.cells;
    var moved = false;
    for (var c = 0; c < cols; c++) {
      var write = rows - 1;
      for (var r = rows - 1; r >= 0; r--) {
        var i = r * cols + c;
        if (!cells[i].length) continue;
        if (r !== write) {
          var st = cells[i];
          cells[write * cols + c] = st;
          cells[i] = [];
          for (var k = 0; k < st.length; k++) st[k].oy += write - r;
          moved = true;
        }
        write--;
      }
      if (refill && write >= 0) {
        var gap = write + 1;
        for (var rr = write; rr >= 0; rr--) {
          var ns = refill(this, c, rr);
          for (var q = 0; q < ns.length; q++) ns[q].oy = gap + 0.6 + (write - rr) * 0.15;
          cells[rr * cols + c] = ns;
        }
        moved = true;
      }
    }
    if (collapse) {
      var mid = (cols - 1) >> 1;
      var empty = function (cc) { return !cells[(rows - 1) * cols + cc].length; };
      var left = [], right = [];
      for (var a = 0; a <= mid; a++) if (!empty(a)) left.push(a);
      for (var b = mid + 1; b < cols; b++) if (!empty(b)) right.push(b);
      var target = [];
      left.forEach(function (cc, n) { target.push([cc, mid - left.length + 1 + n]); });
      right.forEach(function (cc, n) { target.push([cc, mid + 1 + n]); });
      var changed = target.some(function (p) { return p[0] !== p[1]; });
      if (changed) {
        var copy = cells.slice();
        for (var z = 0; z < cells.length; z++) cells[z] = [];
        target.forEach(function (p) {
          for (var rr2 = 0; rr2 < rows; rr2++) {
            var st2 = copy[rr2 * cols + p[0]];
            cells[rr2 * cols + p[1]] = st2;
            for (var k2 = 0; k2 < st2.length; k2++) st2[k2].ox += p[1] - p[0];
          }
        });
        moved = true;
      }
    }
    return moved;
  };
  // Re-deal every remaining tile (stack heights stay the same) so at least one move exists.
  // Returns false if no kind has two tiles left (nothing a shuffle could fix).
  Board.prototype.shuffle = function (rand) {
    var tiles = [], counts = {};
    var cells = this.cells;
    for (var i = 0; i < cells.length; i++) {
      for (var k = 0; k < cells[i].length; k++) {
        tiles.push(cells[i][k]);
        counts[cells[i][k].t] = (counts[cells[i][k].t] || 0) + 1;
      }
    }
    var pairable = Object.keys(counts).some(function (t) { return counts[t] >= 2; });
    if (!pairable) return false;
    // Deal several times and keep the deal with the most matching contacts, so a
    // shuffle gives the player a few options instead of a single lonely pair.
    var bestDeal = null, bestPairs = 0;
    for (var attempt = 0; attempt < 14; attempt++) {
      shuffleArr(tiles, rand);
      var n = 0;
      for (var j = 0; j < cells.length; j++) for (var q = 0; q < cells[j].length; q++) cells[j][q] = tiles[n++];
      var np = this.pairSet().size;
      if (np > bestPairs) {
        bestPairs = np;
        bestDeal = tiles.slice();
      }
    }
    if (bestDeal) {
      var m = 0;
      for (var j2 = 0; j2 < cells.length; j2++) for (var q2 = 0; q2 < cells[j2].length; q2++) cells[j2][q2] = bestDeal[m++];
      return true;
    }
    // Force one pair: move two tiles of a pairable kind onto the tops of two neighbouring cells.
    var kind = +Object.keys(counts).filter(function (t) { return counts[t] >= 2; })[0];
    var cols = this.cols;
    for (var a = 0; a < cells.length; a++) {
      if (!cells[a].length) continue;
      var nb = a % cols + 1 < cols && cells[a + 1].length ? a + 1 : a + cols < cells.length && cells[a + cols].length ? a + cols : -1;
      if (nb < 0) continue;
      var targets = [a, nb];
      for (var f = 0; f < 2; f++) {
        var A = targets[f], ah = cells[A].length - 1;
        if (cells[A][ah].t === kind) continue;
        // find a tile of `kind` that is not already sitting on one of the two target tops
        for (var s = 0; s < cells.length; s++) {
          var done = false;
          for (var h = 0; h < cells[s].length; h++) {
            var isTargetTop = (s === a && h === cells[a].length - 1) || (s === nb && h === cells[nb].length - 1);
            if (cells[s][h].t === kind && !isTargetTop) {
              var tmp = cells[A][ah];
              cells[A][ah] = cells[s][h];
              cells[s][h] = tmp;
              done = true;
              break;
            }
          }
          if (done) break;
        }
      }
      return this.hasMove();
    }
    return false;
  };

  function shuffleArr(a, rand) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // Column heights for each board shape (stacks sit at the bottom of each column).
  function columnHeights(shape, cols, rows) {
    var out = [];
    var mid = (cols - 1) / 2;
    for (var c = 0; c < cols; c++) {
      var d = mid ? Math.abs(c - mid) / mid : 0; // 0 centre → 1 edge
      var h = rows;
      if (shape === 'pyramid') h = Math.round(rows - d * rows * 0.45);
      else if (shape === 'valley') h = Math.round(rows * 0.55 + d * rows * 0.45);
      else if (shape === 'towers') h = c % 2 ? rows - 2 : rows;
      out.push(Math.max(2, Math.min(rows, h)));
    }
    return out;
  }

  function buildLevel(spec, rand, transpose) {
    var cols = transpose ? spec.r : spec.c;
    var rows = transpose ? spec.c : spec.r;
    var board = new Board(cols, rows);
    var heights = columnHeights(spec.shape, cols, rows);
    var layers = [];
    var total = 0;
    for (var c = 0; c < cols; c++) {
      for (var r = rows - heights[c]; r < rows; r++) {
        var two = spec.shape !== 'mixed' || (r !== rows - heights[c] && rand() > 0.3);
        layers.push([r * cols + c, two ? 2 : 1]);
        total += two ? 2 : 1;
      }
    }
    if (total % 2) {
      // keep the tile count even so every kind comes in pairs
      for (var k = 0; k < layers.length; k++) {
        if (layers[k][1] === 1) {
          layers[k][1] = 2;
          total++;
          break;
        }
      }
      if (total % 2) {
        layers[0][1] = 1;
        total--;
      }
    }
    var kinds = [];
    for (var p = 0; p < total / 2; p++) kinds.push(p % spec.t, p % spec.t);
    for (var attempt = 0; attempt < 30; attempt++) {
      shuffleArr(kinds, rand);
      var n = 0;
      board.cells.forEach(function (s) { s.length = 0; });
      board.nextId = 1;
      for (var q = 0; q < layers.length; q++) {
        for (var l = 0; l < layers[q][1]; l++) board.cells[layers[q][0]].push(board.makeTile(kinds[n++]));
      }
      if (board.hasMove()) break;
    }
    return board;
  }

  /* ------------------------------------------------------------------ */
  /* Icon drawing (unit space −1..1, centred)                            */
  /* ------------------------------------------------------------------ */
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }
  function starPath(g, cx, cy, ro, ri, n) {
    g.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / n;
      var rad = i % 2 ? ri : ro;
      g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.closePath();
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    if (f < 0) {
      r = Math.round(r * (1 + f));
      gg = Math.round(gg * (1 + f));
      b = Math.round(b * (1 + f));
    } else {
      r = Math.round(r + (255 - r) * f);
      gg = Math.round(gg + (255 - gg) * f);
      b = Math.round(b + (255 - b) * f);
    }
    return 'rgb(' + r + ',' + gg + ',' + b + ')';
  }

  // Draws icon `t` in unit space; caller has translated/scaled the context.
  function drawIcon(g, t) {
    var col = TYPES[t].color;
    var dark = shade(col, -0.45);
    var light = shade(col, 0.35);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.lineWidth = 0.09;
    g.strokeStyle = dark;
    g.fillStyle = col;
    switch (t) {
      case 0: // tank
        rr(g, -0.9, 0.12, 1.8, 0.5, 0.25);
        g.fillStyle = dark;
        g.fill();
        g.fillStyle = light;
        for (var w = 0; w < 5; w++) {
          g.beginPath();
          g.arc(-0.66 + w * 0.33, 0.37, 0.11, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(-0.78, 0.14);
        g.lineTo(-0.6, -0.16);
        g.lineTo(0.62, -0.16);
        g.lineTo(0.8, 0.14);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = col;
        rr(g, 0.25, -0.43, 0.75, 0.13, 0.05);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(-0.42, -0.16);
        g.quadraticCurveTo(-0.38, -0.62, 0.02, -0.6);
        g.quadraticCurveTo(0.38, -0.58, 0.36, -0.16);
        g.closePath();
        g.fillStyle = light;
        g.fill();
        g.stroke();
        break;
      case 1: // jet (top view, nose up)
        g.beginPath();
        g.moveTo(0, -0.95);
        g.quadraticCurveTo(0.16, -0.6, 0.15, -0.25);
        g.lineTo(0.88, 0.22);
        g.lineTo(0.88, 0.38);
        g.lineTo(0.15, 0.2);
        g.lineTo(0.13, 0.55);
        g.lineTo(0.42, 0.8);
        g.lineTo(0.42, 0.92);
        g.lineTo(0, 0.82);
        g.lineTo(-0.42, 0.92);
        g.lineTo(-0.42, 0.8);
        g.lineTo(-0.13, 0.55);
        g.lineTo(-0.15, 0.2);
        g.lineTo(-0.88, 0.38);
        g.lineTo(-0.88, 0.22);
        g.lineTo(-0.15, -0.25);
        g.quadraticCurveTo(-0.16, -0.6, 0, -0.95);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = light;
        g.beginPath();
        g.ellipse(0, -0.45, 0.07, 0.2, 0, 0, Math.PI * 2);
        g.fill();
        break;
      case 2: // combat helmet (side view) with chin strap and star emblem
        g.beginPath();
        g.moveTo(-0.92, 0.3);
        g.quadraticCurveTo(-0.86, -0.78, 0.02, -0.78);
        g.quadraticCurveTo(0.84, -0.76, 0.86, 0.12);
        g.lineTo(0.96, 0.3);
        g.closePath();
        g.fill();
        g.stroke();
        g.strokeStyle = dark;
        g.lineWidth = 0.1;
        g.beginPath();
        g.moveTo(-0.9, 0.3);
        g.lineTo(0.96, 0.3);
        g.stroke();
        g.lineWidth = 0.08;
        g.beginPath();
        g.moveTo(-0.55, 0.3);
        g.quadraticCurveTo(-0.1, 0.92, 0.45, 0.3);
        g.stroke();
        starPath(g, -0.02, -0.28, 0.3, 0.12, 5);
        g.fillStyle = '#fff6dc';
        g.fill();
        break;
      case 3: // medal
        g.fillStyle = '#c62f2f';
        g.beginPath();
        g.moveTo(-0.55, -0.95);
        g.lineTo(-0.15, -0.95);
        g.lineTo(0.12, -0.15);
        g.lineTo(-0.2, -0.05);
        g.closePath();
        g.fill();
        g.fillStyle = '#2f55b8';
        g.beginPath();
        g.moveTo(0.55, -0.95);
        g.lineTo(0.15, -0.95);
        g.lineTo(-0.12, -0.15);
        g.lineTo(0.2, -0.05);
        g.closePath();
        g.fill();
        g.fillStyle = col;
        g.beginPath();
        g.arc(0, 0.32, 0.55, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        starPath(g, 0, 0.34, 0.36, 0.15, 5);
        g.fillStyle = light;
        g.fill();
        break;
      case 4: // star
        starPath(g, 0, 0.06, 0.95, 0.4, 5);
        g.fill();
        g.stroke();
        starPath(g, 0, 0.06, 0.45, 0.19, 5);
        g.fillStyle = light;
        g.fill();
        break;
      case 5: // anchor
        g.lineWidth = 0.17;
        g.strokeStyle = col;
        g.beginPath();
        g.arc(0, -0.7, 0.17, 0, Math.PI * 2);
        g.moveTo(0, -0.52);
        g.lineTo(0, 0.78);
        g.moveTo(-0.42, -0.32);
        g.lineTo(0.42, -0.32);
        g.stroke();
        g.beginPath();
        g.arc(0, 0.12, 0.68, 0.2, Math.PI - 0.2);
        g.stroke();
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0.78, 0.0);
        g.lineTo(0.9, 0.42);
        g.lineTo(0.5, 0.3);
        g.closePath();
        g.moveTo(-0.78, 0.0);
        g.lineTo(-0.9, 0.42);
        g.lineTo(-0.5, 0.3);
        g.closePath();
        g.fill();
        break;
      case 6: // shield with chevron
        g.beginPath();
        g.moveTo(0, -0.92);
        g.lineTo(0.78, -0.62);
        g.quadraticCurveTo(0.8, 0.45, 0, 0.95);
        g.quadraticCurveTo(-0.8, 0.45, -0.78, -0.62);
        g.closePath();
        g.fill();
        g.stroke();
        g.strokeStyle = '#fff6dc';
        g.lineWidth = 0.17;
        g.beginPath();
        g.moveTo(-0.45, -0.18);
        g.lineTo(0, 0.18);
        g.lineTo(0.45, -0.18);
        g.moveTo(-0.45, 0.2);
        g.lineTo(0, 0.56);
        g.lineTo(0.45, 0.2);
        g.stroke();
        break;
      case 7: // compass
        g.beginPath();
        g.arc(0, 0, 0.88, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#fff6dc';
        g.beginPath();
        g.arc(0, 0, 0.66, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#d6322a';
        g.beginPath();
        g.moveTo(0, -0.62);
        g.lineTo(0.17, 0);
        g.lineTo(-0.17, 0);
        g.closePath();
        g.fill();
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, 0.62);
        g.lineTo(0.17, 0);
        g.lineTo(-0.17, 0);
        g.closePath();
        g.fill();
        g.fillStyle = dark;
        g.beginPath();
        g.arc(0, 0, 0.09, 0, Math.PI * 2);
        g.fill();
        break;
      case 8: // flag
        g.strokeStyle = '#4a3a2a';
        g.lineWidth = 0.13;
        g.beginPath();
        g.moveTo(-0.62, -0.9);
        g.lineTo(-0.62, 0.92);
        g.stroke();
        g.beginPath();
        g.moveTo(-0.56, -0.82);
        g.bezierCurveTo(-0.1, -1.0, 0.25, -0.55, 0.88, -0.78);
        g.lineTo(0.88, 0.02);
        g.bezierCurveTo(0.25, 0.22, -0.1, -0.22, -0.56, -0.02);
        g.closePath();
        g.fill();
        g.strokeStyle = dark;
        g.lineWidth = 0.08;
        g.stroke();
        starPath(g, 0.12, -0.42, 0.22, 0.09, 5);
        g.fillStyle = '#fff6dc';
        g.fill();
        break;
      case 9: // parachute
        g.beginPath();
        g.moveTo(-0.92, -0.12);
        g.bezierCurveTo(-0.9, -1.0, 0.9, -1.0, 0.92, -0.12);
        g.quadraticCurveTo(0.69, -0.28, 0.46, -0.12);
        g.quadraticCurveTo(0.23, -0.28, 0, -0.12);
        g.quadraticCurveTo(-0.23, -0.28, -0.46, -0.12);
        g.quadraticCurveTo(-0.69, -0.28, -0.92, -0.12);
        g.closePath();
        g.fill();
        g.stroke();
        g.strokeStyle = dark;
        g.lineWidth = 0.06;
        g.beginPath();
        g.moveTo(-0.9, -0.12);
        g.lineTo(-0.12, 0.55);
        g.moveTo(0.9, -0.12);
        g.lineTo(0.12, 0.55);
        g.moveTo(0, -0.12);
        g.lineTo(0, 0.55);
        g.stroke();
        rr(g, -0.22, 0.52, 0.44, 0.38, 0.06);
        g.fillStyle = '#8c5523';
        g.fill();
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Inline SVG icons for the DOM toolbar                                 */
  /* ------------------------------------------------------------------ */
  var SVG = {
    bomb: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10" cy="14" r="7" fill="#1d2230" stroke="#fff" stroke-width="1.6"/><path d="M14 8.5l2-2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M16.5 6c1-2 3-2.4 4-1.4" stroke="#fbbf24" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="7.5" cy="11.5" r="1.6" fill="#fff" opacity=".7"/></svg>',
    hint: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="#fde68a" stroke="#fff" stroke-width="1.4"/><path d="M9.5 18.5h5M10.5 21h3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4c4 0 6 10 10 10h4M3 17h4c1.6 0 2.8-1.4 3.8-3.2M13.2 10.2C14.2 8.4 15.4 7 17 7h4"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="#fff"/><rect x="14" y="5" width="4" height="14" rx="1" fill="#fff"/></svg>',
  };

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IG.register('tile-war', function (ctx) {
    var root = ctx.root;
    var ui = IG.ui;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var rand = Math.random;
    if (ctx.debug && ctx.params.get('seed')) {
      // deterministic boards for automated tests (?debug=1&seed=N)
      var seedN = +ctx.params.get('seed') || 1;
      rand = function () {
        seedN = (seedN * 16807) % 2147483647;
        return seedN / 2147483647;
      };
    }

    /* ---------- saved progress ---------- */
    var saved = {
      stars: store.get('stars', []),
      best: store.get('best', []),
      endlessBest: store.get('endlessBest', 0),
    };
    function save() {
      store.set('stars', saved.stars);
      store.set('best', saved.best);
      store.set('endlessBest', saved.endlessBest);
    }
    function unlockedCount() {
      var n = 1;
      for (var i = 0; i < LEVELS.length; i++) if (saved.stars[i] > 0) n = i + 2;
      return Math.min(LEVELS.length, n);
    }
    function totalStars() {
      return saved.stars.reduce(function (a, b) { return a + (b || 0); }, 0);
    }

    /* ---------- state ---------- */
    var mode = 'campaign'; // 'campaign' | 'endless'
    var levelIdx = 0;
    var board = null;
    var state = 'menu'; // menu | play | resolve | won | lost | paused
    var pausedFrom = null;
    var score = 0, timeLeft = 0, timeMax = 1, bombs = START_BOMBS;
    var chain = 0, bestChain = 0, cleared = 0, shuffles = 0;
    var pairsBefore = null, resolveStep = '', resolveTimer = 0;
    var bombMode = false;
    var hover = -1, hoverGroup = null;
    var press = null; // {cell, group, pointerId}
    var cursor = { c: 0, r: 0, on: false };
    var hint = { group: null, t: 0 };
    var stuckTimer = -1;
    var lastTick = -1;
    var overlay = null;
    var endlessKinds = 5;
    var lastToast = null;
    function toast(text, ms) {
      if (lastToast && lastToast.parentNode) lastToast.parentNode.removeChild(lastToast);
      lastToast = ui.toast(root, text, ms);
    }

    /* ---------- canvas & layout ---------- */
    var W = 0, H = 0, S = 40, bx = 0, by = 0, sideBar = false, hudH = 50;
    var bgCanvas = document.createElement('canvas');
    var faceCache = [];
    var faceKey = '';
    var booted = false;
    var view = IG.createCanvas(root, {
      onResize: function (w, h) {
        W = w;
        H = h;
        if (booted) layout();
      },
    });
    var g = view.ctx;

    // Board area left after the HUD (top) and the toolbar (side or bottom).
    function availArea() {
      sideBar = W > H * 1.25 && W > 560;
      hudH = W < 480 ? 46 : 52;
      var x0 = 10, y0 = hudH + 12, x1 = W - 10, y1 = H - 10;
      if (sideBar) x1 -= 72;
      else y1 -= 62;
      return [x0, y0, x1, y1];
    }
    // Should a c×r board be turned sideways to get bigger tiles on this screen?
    function wantTranspose(c, r) {
      var a = availArea();
      var w = a[2] - a[0], h = a[3] - a[1];
      var sNormal = Math.min(w / (c + 0.4), h / (r + 0.4));
      var sTurned = Math.min(w / (r + 0.4), h / (c + 0.4));
      return sTurned > sNormal * 1.04;
    }
    function layout() {
      var a = availArea();
      var x0 = a[0], y0 = a[1], x1 = a[2], y1 = a[3];
      if (sideBar) {
        toolbar.style.cssText = TB_BASE + 'right:12px;top:50%;transform:translateY(-50%);flex-direction:column';
      } else {
        toolbar.style.cssText = TB_BASE + 'left:50%;bottom:10px;transform:translateX(-50%);flex-direction:row';
      }
      if (board) {
        // +0.4 cell of margin leaves room for the tray border around the board
        S = Math.floor(Math.min((x1 - x0) / (board.cols + 0.4), (y1 - y0) / (board.rows + 0.4), 104));
        S = Math.max(16, S);
        bx = Math.round(x0 + (x1 - x0 - board.cols * S) / 2);
        by = Math.round(y0 + (y1 - y0 - board.rows * S) / 2);
      }
      buildBackground();
      buildFaces();
    }

    function buildBackground() {
      var dpr = view.dpr;
      bgCanvas.width = Math.max(1, Math.round(W * dpr));
      bgCanvas.height = Math.max(1, Math.round(H * dpr));
      var b = bgCanvas.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      var grad = b.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#26301f');
      grad.addColorStop(1, '#151b12');
      b.fillStyle = grad;
      b.fillRect(0, 0, W, H);
      // tactical-map contour lines (deterministic so resizes look the same)
      b.strokeStyle = 'rgba(190,210,150,0.07)';
      b.lineWidth = 1.2;
      var seed = 7;
      var rnd = function () {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (var k = 0; k < 7; k++) {
        var cx = rnd() * W, cy = rnd() * H, base = 40 + rnd() * 90;
        for (var ring = 0; ring < 4; ring++) {
          b.beginPath();
          for (var a = 0; a <= 24; a++) {
            var ang = (a / 24) * Math.PI * 2;
            var rad = base + ring * 26 + Math.sin(ang * 3 + k) * 10 + Math.cos(ang * 2 + ring) * 8;
            var px = cx + Math.cos(ang) * rad * 1.3, py = cy + Math.sin(ang) * rad;
            if (a) b.lineTo(px, py);
            else b.moveTo(px, py);
          }
          b.stroke();
        }
      }
      // grid
      b.strokeStyle = 'rgba(190,210,150,0.06)';
      b.lineWidth = 1;
      var step = 48;
      b.beginPath();
      for (var x = 0; x < W; x += step) {
        b.moveTo(x + 0.5, 0);
        b.lineTo(x + 0.5, H);
      }
      for (var y = 0; y < H; y += step) {
        b.moveTo(0, y + 0.5);
        b.lineTo(W, y + 0.5);
      }
      b.stroke();
      // vignette
      var vg = b.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      b.fillStyle = vg;
      b.fillRect(0, 0, W, H);
    }

    // Tile metrics derived from the cell size S.
    var PAD = 0, DEP = 0, FW = 0, FH = 0;
    function buildFaces() {
      PAD = Math.max(1, Math.round(S * 0.05));
      DEP = Math.max(2, Math.round(S * 0.075));
      FW = S - PAD * 2;
      FH = S - PAD * 2 - DEP * 2;
      var key = FW + 'x' + FH + '@' + view.dpr;
      if (key === faceKey) return;
      faceKey = key;
      var dpr = view.dpr;
      for (var t = 0; t < TYPES.length; t++) {
        var cv = faceCache[t] || document.createElement('canvas');
        cv.width = Math.max(1, Math.round(FW * dpr));
        cv.height = Math.max(1, Math.round(FH * dpr));
        var c2 = cv.getContext('2d');
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        var rad = Math.max(3, S * 0.12);
        var gr = c2.createLinearGradient(0, 0, 0, FH);
        gr.addColorStop(0, '#fffaf0');
        gr.addColorStop(1, '#e9dfc4');
        rr(c2, 0, 0, FW, FH, rad);
        c2.fillStyle = gr;
        c2.fill();
        // coloured frame (colour coding is readable even when icons are small)
        c2.lineWidth = Math.max(1.5, S * 0.045);
        c2.strokeStyle = TYPES[t].color;
        rr(c2, c2.lineWidth * 1.2, c2.lineWidth * 1.2, FW - c2.lineWidth * 2.4, FH - c2.lineWidth * 2.4, rad * 0.7);
        c2.globalAlpha = 0.85;
        c2.stroke();
        c2.globalAlpha = 1;
        c2.save();
        var s = Math.min(FW, FH) * 0.39;
        c2.translate(FW / 2, FH / 2);
        c2.scale(s, s);
        drawIcon(c2, t);
        c2.restore();
        faceCache[t] = cv;
      }
    }

    /* ---------- DOM HUD ---------- */
    var hudEl = ui.el('div', 'ig-hud');
    var leftBox = ui.el('div', '');
    leftBox.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center';
    var rightBox = ui.el('div', '');
    rightBox.style.cssText = 'display:flex;gap:6px;align-items:center';
    var lvPill = ui.el('div', 'ig-pill', '');
    var scorePill = ui.el('div', 'ig-pill', '');
    var timePill = ui.el('div', 'ig-pill', '');
    timePill.style.fontVariantNumeric = 'tabular-nums';
    scorePill.style.fontVariantNumeric = 'tabular-nums';
    var pauseBtn = ui.el('button', 'ig-pill', SVG.pause);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'cursor:pointer;display:grid;place-items:center;padding:6px 10px;line-height:0';
    leftBox.appendChild(lvPill);
    leftBox.appendChild(scorePill);
    rightBox.appendChild(timePill);
    rightBox.appendChild(pauseBtn);
    hudEl.appendChild(leftBox);
    hudEl.appendChild(rightBox);
    root.appendChild(hudEl);

    var TB_BASE = 'position:absolute;z-index:4;display:flex;gap:8px;align-items:center;';
    var toolbar = ui.el('div', '');
    function toolBtn(svg, label, aria) {
      var b = ui.el('button', 'ig-pill', svg + (label ? '<span>' + label + '</span>' : ''));
      b.type = 'button';
      b.setAttribute('aria-label', aria);
      b.title = aria;
      b.style.cssText =
        'cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;min-width:52px;min-height:44px;padding:6px 12px;border-radius:14px;font-size:15px;touch-action:manipulation';
      toolbar.appendChild(b);
      return b;
    }
    var bombBtn = toolBtn(SVG.bomb, '2', 'Bomb (B)');
    var hintBtn = toolBtn(SVG.hint, '', 'Hint (H)');
    var shuffleBtn = toolBtn(SVG.shuffle, '', 'Shuffle, costs time (S)');
    root.appendChild(toolbar);

    var hudCache = '';
    function updateHud() {
      var inGame = state !== 'menu' && board;
      var tl = board ? board.count() : 0;
      var key = [state, mode, levelIdx, score, Math.ceil(timeLeft), bombs, bombMode, tl, W].join('|');
      if (key === hudCache) return;
      hudCache = key;
      hudEl.style.visibility = inGame ? 'visible' : 'hidden';
      toolbar.style.visibility = inGame ? 'visible' : 'hidden';
      lvPill.textContent = mode === 'endless' ? '∞ Endless' : 'Sector ' + (levelIdx + 1) + (W < 420 ? '' : ' · ' + tl + ' left');
      scorePill.textContent = score < 1e6 ? score.toLocaleString('en-US') : IG.fmt(score);
      var t = Math.max(0, Math.ceil(timeLeft));
      timePill.textContent = '⏱ ' + Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
      timePill.style.color = timeLeft < 15 ? '#fca5a5' : '#fff';
      bombBtn.lastChild.textContent = String(bombs);
      bombBtn.style.background = bombMode ? 'rgba(239,68,68,.75)' : '';
      bombBtn.style.borderColor = bombMode ? '#fca5a5' : '';
      bombBtn.style.opacity = bombs ? '1' : '0.5';
    }

    /* ---------- effects ---------- */
    var MAXP = 220;
    var parts = [];
    for (var pi = 0; pi < MAXP; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: '#fff', size: 3, kind: 0 });
    function spawn(x, y, color, n, speed, kind) {
      for (var i = 0, made = 0; i < MAXP && made < n; i++) {
        var p = parts[i];
        if (p.on) continue;
        var a = Math.random() * Math.PI * 2;
        var v = speed * (0.35 + Math.random() * 0.75);
        p.on = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v - speed * 0.35;
        p.max = p.life = 0.45 + Math.random() * 0.45;
        p.color = color;
        p.size = (kind === 1 ? 0.07 : 0.045) * S * (0.6 + Math.random() * 0.8);
        p.kind = kind || 0;
        made++;
      }
    }
    var popups = [];
    for (var qi = 0; qi < 24; qi++) popups.push({ on: false, x: 0, y: 0, text: '', life: 0, color: '#fff', size: 16 });
    function popup(x, y, text, color, size) {
      for (var i = 0; i < popups.length; i++) {
        var p = popups[i];
        if (p.on) continue;
        p.on = true;
        p.x = x;
        p.y = y;
        p.text = text;
        p.life = 1;
        p.color = color || '#fff';
        p.size = size || 18;
        return;
      }
    }
    var banner = { text: '', sub: '', t: 0, color: '#fde047' };
    function showBanner(text, sub, color) {
      banner.text = text;
      banner.sub = sub || '';
      banner.t = 1.3;
      banner.color = color || '#fde047';
    }
    var shakeT = 0, shakeMag = 0, flashT = 0;
    function shake(m, t) {
      shakeMag = Math.max(shakeMag, m);
      shakeT = Math.max(shakeT, t);
    }
    var dying = []; // tiles being cleared: {x, y, t, life, h}

    /* ---------- geometry helpers ---------- */
    function cellX(c) { return bx + c * S; }
    function cellY(r) { return by + r * S; }
    function cellAt(px, py) {
      if (!board) return -1;
      var c = Math.floor((px - bx) / S), r = Math.floor((py - by) / S);
      if (c < 0 || r < 0 || c >= board.cols || r >= board.rows) return -1;
      return r * board.cols + c;
    }
    function cellCenter(i) {
      var c = i % board.cols, r = (i / board.cols) | 0;
      return [cellX(c) + S / 2, cellY(r) + S / 2];
    }

    /* ---------- game flow ---------- */
    function startLevel(idx) {
      closeOverlay();
      mode = 'campaign';
      levelIdx = idx;
      var L = LEVELS[idx];
      board = buildLevel(L, rand, wantTranspose(L.c, L.r));
      score = 0;
      timeMax = timeLeft = L.time;
      resetRun();
      layout();
      state = 'play';
      sfx('levelup');
      showBanner('Sector ' + (idx + 1), '★★★ with ' + L.s3 + 's left', '#fff');
      dropIn();
      ctx.focus();
    }
    function startEndless() {
      closeOverlay();
      mode = 'endless';
      endlessKinds = 5;
      board = buildLevel({ c: 9, r: 7, t: endlessKinds, shape: 'rect' }, rand, wantTranspose(9, 7));
      score = 0;
      timeMax = 60;
      timeLeft = 60;
      resetRun();
      layout();
      state = 'play';
      sfx('levelup');
      showBanner('Endless', 'Clear tiles to earn time', '#fff');
      dropIn();
      ctx.focus();
    }
    function resetRun() {
      bombs = START_BOMBS;
      chain = bestChain = cleared = shuffles = 0;
      bombMode = false;
      hover = -1;
      hoverGroup = null;
      press = null;
      hint.group = null;
      stuckTimer = -1;
      lastTick = -1;
      dying.length = 0;
      cursor.c = Math.floor(board.cols / 2);
      cursor.r = board.rows - 1;
      parts.forEach(function (p) { p.on = false; });
    }
    // Opening animation: every stack drops in from above, staggered by column.
    function dropIn() {
      for (var i = 0; i < board.cells.length; i++) {
        var st = board.cells[i];
        var c = i % board.cols, r = (i / board.cols) | 0;
        for (var k = 0; k < st.length; k++) {
          st[k].oy = board.rows + 1 - r * 0.15 + c * 0.35;
          st[k].vy = 0;
          st[k].ox = 0;
        }
      }
    }

    function refill(b, c, r) {
      var n = rand() < 0.6 ? 2 : 1;
      var out = [];
      for (var k = 0; k < n; k++) {
        var t = b.makeTile(Math.floor(rand() * endlessKinds));
        t.born = true;
        out.push(t);
      }
      return out;
    }

    function canAct() {
      return state === 'play';
    }

    // Player clears the group containing cell i.
    function tryClear(i) {
      if (!canAct() || i < 0) return;
      if (bombMode) return dropBomb(i);
      var grp = board.group(i);
      if (grp.length < 2) {
        if (board.top(i)) {
          sfx('error');
          var t = board.top(i);
          t.flip = -0.25; // shake
        }
        return;
      }
      hint.group = null;
      chain = 0;
      clearGroup(grp, 0);
      if (grp.length >= 4 && bombs < MAX_BOMBS) {
        // big groups earn a bomb back
        bombs++;
        var bc = cellCenter(grp[0]);
        popup(bc[0], bc[1] - S * 0.6, '+1 bomb', '#fca5a5', Math.max(14, Math.round(S * 0.3)));
        sfx({ f: 1320, d: 0.12, type: 'square', v: 0.06, delay: 0.12 });
      }
      beginResolve();
    }

    function groupPoints(n, ch) {
      return n * n * 10 * (1 + Math.min(ch, 4));
    }

    function clearGroup(grp, ch) {
      var n = grp.length;
      var t = board.top(grp[0]).t;
      var sx = 0, sy = 0;
      for (var k = 0; k < n; k++) {
        var i = grp[k];
        var st = board.cells[i];
        var tile = st[st.length - 1];
        var c = i % board.cols, r = (i / board.cols) | 0;
        var x = cellX(c - tile.ox), y = cellY(r - tile.oy);
        dying.push({ x: x, y: y, t: tile.t, life: 0.32, h: st.length, delay: k * 0.025 });
        spawn(x + S / 2, y + S / 2, TYPES[t].color, 7, S * 5, 0);
        spawn(x + S / 2, y + S / 2, '#fff3c4', 3, S * 3.5, 1);
        sx += x + S / 2;
        sy += y + S / 2;
      }
      board.removeTops(grp);
      var pts = groupPoints(n, ch);
      score += pts;
      cleared += n;
      popup(sx / n, sy / n, '+' + pts, ch ? '#fde047' : '#fff', Math.min(34, 16 + n * 2 + ch * 3));
      if (mode === 'endless') {
        var gain = n * Math.max(0.2, 0.4 - (endlessKinds - 5) * 0.05);
        timeLeft = Math.min(99, timeLeft + gain);
      }
      sfx({ f: 440 + Math.min(n, 8) * 50 + ch * 110, d: 0.09, type: 'triangle', v: 0.15 });
      sfx({ f: 660 + Math.min(n, 8) * 70 + ch * 140, d: 0.13, type: 'triangle', v: 0.12, delay: 0.06 });
      if (n >= 5) shake(S * 0.06, 0.18);
    }

    function dropBomb(i) {
      var st = board.cells[i];
      if (!st.length || bombs <= 0) {
        sfx('error');
        return;
      }
      bombs--;
      bombMode = false;
      hint.group = null;
      var tile = st[st.length - 1];
      var c = i % board.cols, r = (i / board.cols) | 0;
      var x = cellX(c - tile.ox), y = cellY(r - tile.oy);
      dying.push({ x: x, y: y, t: tile.t, life: 0.3, h: st.length, delay: 0 });
      st.pop();
      cleared++;
      spawn(x + S / 2, y + S / 2, '#ffb347', 18, S * 7, 1);
      spawn(x + S / 2, y + S / 2, '#555', 10, S * 4, 0);
      shake(S * 0.12, 0.3);
      flashT = 0.12;
      sfx('explode');
      chain = 0;
      beginResolve();
    }

    function beginResolve() {
      state = 'resolve';
      pairsBefore = board.pairSet();
      resolveStep = 'settle';
      resolveTimer = 0.12;
      hoverGroup = null;
    }

    function allLanded() {
      for (var i = 0; i < board.cells.length; i++) {
        var st = board.cells[i];
        for (var k = 0; k < st.length; k++) if (st[k].oy > 0 || st[k].ox !== 0) return false;
      }
      return true;
    }

    function updateResolve(dt) {
      resolveTimer -= dt;
      if (resolveTimer > 0) return;
      if (resolveStep === 'settle') {
        board.settle(mode === 'endless' ? refill : null, mode === 'campaign');
        if (mode === 'endless') {
          // Freshly dropped reinforcements never trigger combos on arrival (that would
          // snowball forever); only tiles that were already on the board can.
          board.eachPair(function (i, j, a, b) {
            if (a.born || b.born) pairsBefore.add(pairKey(a.id, b.id));
          });
          for (var bi = 0; bi < board.cells.length; bi++) {
            var bs = board.cells[bi];
            for (var bk = 0; bk < bs.length; bk++) bs[bk].born = false;
          }
        }
        resolveStep = 'fall';
        resolveTimer = 0.05;
      } else if (resolveStep === 'fall') {
        if (!allLanded()) return;
        var groups = board.autoGroups(pairsBefore);
        if (groups.length) {
          chain++;
          bestChain = Math.max(bestChain, chain);
          groups.forEach(function (grp) { clearGroup(grp, chain); });
          var gotBomb = bombs < MAX_BOMBS;
          if (gotBomb) bombs++;
          if (mode === 'campaign') timeLeft += COMBO_TIME;
          else timeLeft = Math.min(99, timeLeft + 1);
          showBanner(chain > 1 ? 'COMBO ×' + chain : 'COMBO!', (gotBomb ? '+1 bomb  ' : '') + '+' + (mode === 'campaign' ? COMBO_TIME : 1) + 's', chain > 2 ? '#f472b6' : '#fde047');
          sfx('levelup');
          if (gotBomb) sfx({ f: 1320, d: 0.12, type: 'square', v: 0.06, delay: 0.25 });
          shake(S * (0.05 + chain * 0.025), 0.25);
          pairsBefore = board.pairSet();
          resolveStep = 'settle';
          resolveTimer = 0.2;
        } else {
          endResolve();
        }
      }
    }

    function endResolve() {
      state = 'play';
      chain = 0;
      if (mode === 'endless') {
        var want = Math.min(9, 5 + Math.floor(cleared / 80)); // a new tile kind every 80 tiles
        if (want > endlessKinds) {
          endlessKinds = want;
          showBanner('Threat level ' + (endlessKinds - 4), 'New tile type incoming', '#93c5fd');
          sfx('boost');
        }
      }
      if (!board.count()) return winLevel();
      checkStuck();
    }

    function checkStuck() {
      if (board.hasMove()) {
        stuckTimer = -1;
        return;
      }
      if (bombs > 0) {
        toast('No pairs left — use a bomb or shuffle', 1800);
        sfx('error');
        stuckTimer = -1;
      } else {
        stuckTimer = 0.9; // auto-shuffle shortly
        toast('No pairs left — shuffling', 1200);
      }
    }

    function doShuffle(auto) {
      if (!canAct()) return;
      var ok = board.shuffle(rand);
      if (!ok) {
        // Only lone tiles of different kinds remain: airdrop a bomb instead.
        bombs = Math.max(bombs, 1);
        toast('Airdrop: +1 bomb', 1400);
        sfx('coin');
      } else {
        for (var i = 0; i < board.cells.length; i++) {
          var st = board.cells[i];
          for (var k = 0; k < st.length; k++) st[k].flip = 0.4 + (i % board.cols) * 0.02;
        }
        sfx('slide');
      }
      shuffles++;
      var pen = mode === 'endless' ? 5 : SHUFFLE_PENALTY;
      timeLeft = Math.max(0, timeLeft - pen);
      popup(W / 2, by + board.rows * S * 0.5, '−' + pen + 's', '#fca5a5', 26);
      hint.group = null;
      stuckTimer = -1;
      if (!auto) sfx('click');
      if (ok) checkStuck();
    }

    function showHint() {
      if (!canAct()) return;
      var gbest = board.bestGroup();
      if (!gbest) {
        checkStuck();
        return;
      }
      hint.group = gbest;
      hint.t = 2.4;
      sfx('pop');
    }

    function toggleBomb() {
      if (!canAct()) return;
      if (!bombs) {
        sfx('error');
        toast('No bombs — make combos to earn them', 1400);
        return;
      }
      bombMode = !bombMode;
      sfx(bombMode ? 'tick' : 'click');
      if (bombMode) toast('Pick any tile to blast it', 1200);
    }

    function starsFor(L, left) {
      return left >= L.s3 ? 3 : left >= L.s2 ? 2 : 1;
    }

    function winLevel() {
      state = 'won';
      if (mode === 'endless') return; // endless boards never empty (refills)
      var L = LEVELS[levelIdx];
      var left = Math.max(0, Math.ceil(timeLeft));
      var tBonus = left * 10, bBonus = bombs * 100;
      score += 500 + tBonus + bBonus;
      var stars = starsFor(L, left);
      var prevStars = saved.stars[levelIdx] || 0;
      var prevBest = saved.best[levelIdx] || 0;
      saved.stars[levelIdx] = Math.max(prevStars, stars);
      saved.best[levelIdx] = Math.max(prevBest, score);
      save();
      sfx('win');
      showBanner('SECTOR CLEARED', '', '#86efac');
      for (var k = 0; k < 6; k++) spawn(W * (0.15 + k * 0.14), H * 0.4, TYPES[k].color, 10, S * 8, 1);
      endTimer = 1.1;
      endAction = function () {
        showResult(stars, left, tBonus, bBonus, score > prevBest && prevBest > 0);
      };
    }

    function loseLevel() {
      state = 'lost';
      sfx('lose');
      if (mode === 'endless') {
        var isBest = score > saved.endlessBest;
        if (isBest) saved.endlessBest = score;
        save();
        showBanner("TIME'S UP", '', '#fca5a5');
        endTimer = 1.0;
        endAction = function () { showEndlessOver(isBest); };
      } else {
        showBanner('OUT OF TIME', '', '#fca5a5');
        endTimer = 1.0;
        endAction = showFail;
      }
    }
    var endTimer = -1, endAction = null;

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
    function stat(label, val, color) {
      return '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7">' + label +
        '</div><div style="font:900 22px system-ui,sans-serif;color:' + (color || '#fff') + '">' + val + '</div></div>';
    }

    function showMenu() {
      state = 'menu';
      board = attractBoard();
      layout();
      updateHud();
      var html =
        '<div style="display:flex;justify-content:center;gap:22px;margin:0 0 4px">' +
        stat('Campaign', totalStars() + ' / ' + LEVELS.length * 3 + ' ★', '#fde047') +
        stat('Endless best', IG.fmt(saved.endlessBest)) +
        '</div>';
      openOverlay({
        title: ctx.title || 'Frontline Tiles',
        text: 'Tap a tile that touches its twin to clear the group. Clear both layers before the clock runs out — falling tiles make combos and combos earn bombs.',
        html: html,
        buttons: [
          { label: '▶ Campaign', primary: true, onClick: showLevels },
          { label: '∞ Endless', onClick: startEndless },
        ],
      }, 440);
    }

    function attractBoard() {
      var b = buildLevel({ c: 8, r: 6, t: 8, shape: 'pyramid' }, rand, wantTranspose(8, 6));
      return b;
    }

    function showLevels() {
      var un = unlockedCount();
      var next = Math.min(un, LEVELS.length) - 1;
      // first unlocked level without 3 stars is the "continue" target
      for (var i = 0; i < un; i++) if (!saved.stars[i]) { next = i; break; }
      var cells = '';
      for (var k = 0; k < LEVELS.length; k++) {
        var locked = k >= un;
        var st = saved.stars[k] || 0;
        cells +=
          '<button type="button" data-lv="' + k + '"' + (locked ? ' disabled' : '') +
          ' style="cursor:' + (locked ? 'not-allowed' : 'pointer') + ';font:800 ' + (W < 480 ? 14 : 16) + 'px system-ui,sans-serif;color:#fff;border-radius:10px;padding:' + (W < 480 ? '3px 0 2px;min-height:40px;' : '6px 0 4px;min-height:52px;') +
          'background:' + (k === next ? 'linear-gradient(135deg,#8b6cff,#2dd4f0)' : locked ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.09)') +
          ';border:1px solid ' + (k === next ? 'transparent' : 'rgba(255,255,255,.14)') + ';opacity:' + (locked ? 0.45 : 1) + '">' +
          (locked ? '🔒' : k + 1) + '<div style="font-size:11px;letter-spacing:1px;margin-top:2px">' +
          (locked ? '&nbsp;' : '<span style="color:#fde047">' + '★'.repeat(st) + '</span><span style="opacity:.3">' + '★'.repeat(3 - st) + '</span>') +
          '</div></button>';
      }
      var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(' + (W < 480 ? 40 : 54) + 'px,1fr));gap:' + (W < 480 ? 5 : 7) + 'px;margin:4px 0 2px">' + cells + '</div>' +
        '<div style="font-size:12px;opacity:.75;margin-top:8px">★ clear the sector · ★★ / ★★★ clear it with time to spare</div>';
      var o = openOverlay({
        title: 'Choose a sector',
        html: html,
        buttons: [
          { label: '▶ Sector ' + (next + 1), primary: true, onClick: function () { startLevel(next); } },
          { label: '← Menu', onClick: showMenu },
        ],
      }, 520);
      Array.prototype.forEach.call(o.panel.querySelectorAll('[data-lv]'), function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (b.disabled) return;
          sfx('click');
          startLevel(+b.getAttribute('data-lv'));
        });
      });
    }

    function showResult(stars, left, tBonus, bBonus, newBest) {
      var last = levelIdx >= LEVELS.length - 1;
      var html =
        '<div style="margin:-4px 0 8px">' + starRow(stars, 44) + '</div>' +
        '<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-bottom:6px">' +
        stat('Score', score.toLocaleString('en-US'), newBest ? '#fde047' : '#fff') +
        stat('Time left', left + 's') +
        stat('Best combo', bestChain ? '×' + bestChain : '—') +
        '</div>' +
        '<div style="font-size:12px;opacity:.75">Time bonus +' + tBonus + ' · Bomb bonus +' + bBonus + ' · Clear bonus +500' +
        (stars < 3 ? '<br>★★★ needs ' + LEVELS[levelIdx].s3 + 's left' : '') + '</div>' +
        (newBest ? '<div style="color:#fde047;font-weight:900;margin-top:6px">🏆 New best score!</div>' : '');
      openOverlay({
        title: last ? 'Campaign complete!' : 'Sector ' + (levelIdx + 1) + ' cleared!',
        html: html,
        buttons: [
          last
            ? { label: '∞ Try Endless', primary: true, onClick: startEndless }
            : { label: 'Next sector ▶', primary: true, onClick: function () { startLevel(levelIdx + 1); } },
          { label: '↻ Replay', onClick: function () { startLevel(levelIdx); } },
          { label: 'Sectors', onClick: showLevels },
        ],
      }, 440);
    }

    function showFail() {
      openOverlay({
        title: 'Out of time',
        text: board.count() + ' tiles were still standing. Big groups and early combos save the most time.',
        buttons: [
          { label: '↻ Retry sector ' + (levelIdx + 1), primary: true, onClick: function () { startLevel(levelIdx); } },
          { label: 'Sectors', onClick: showLevels },
        ],
      });
    }

    function showEndlessOver(isBest) {
      var html =
        '<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-bottom:6px">' +
        stat('Score', score.toLocaleString('en-US'), isBest ? '#fde047' : '#fff') +
        stat('Best', saved.endlessBest.toLocaleString('en-US')) +
        stat('Tiles', cleared) +
        stat('Best combo', bestChain ? '×' + bestChain : '—') +
        '</div>' +
        (isBest ? '<div style="color:#fde047;font-weight:900">🏆 New best score!</div>' : '');
      openOverlay({
        title: "Time's up!",
        html: html,
        buttons: [
          { label: '↻ Play again', primary: true, onClick: startEndless },
          { label: 'Menu', onClick: showMenu },
        ],
      }, 440);
    }

    function pauseGame() {
      if (state !== 'play' && state !== 'resolve') return;
      pausedFrom = state;
      state = 'paused';
      press = null;
      var L = mode === 'campaign' ? LEVELS[levelIdx] : null;
      openOverlay({
        title: 'Paused',
        text: L ? '★★ with ' + L.s2 + 's left · ★★★ with ' + L.s3 + 's left' : 'Endless — best ' + saved.endlessBest.toLocaleString('en-US'),
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: '↻ Restart', onClick: function () { mode === 'endless' ? startEndless() : startLevel(levelIdx); } },
          { label: 'Menu', onClick: showMenu },
        ],
      });
    }
    function resumeGame() {
      if (state !== 'paused') return;
      closeOverlay();
      state = pausedFrom || 'play';
      ctx.focus();
    }

    /* ---------- update ---------- */
    function update(dt) {
      // tile animation (falling, sliding, landing squash, shuffle flip)
      if (board) {
        var G = 46; // cells / s²
        for (var i = 0; i < board.cells.length; i++) {
          var st = board.cells[i];
          for (var k = 0; k < st.length; k++) {
            var t = st[k];
            if (t.oy > 0) {
              t.vy += G * dt;
              t.oy -= t.vy * dt;
              if (t.oy <= 0) {
                if (t.vy > 6 && k === st.length - 1) t.land = 0.16;
                t.oy = 0;
                t.vy = 0;
              }
            }
            if (t.ox !== 0) {
              var sp = 9 * dt;
              t.ox = Math.abs(t.ox) <= sp ? 0 : t.ox - Math.sign(t.ox) * sp;
            }
            if (t.land > 0) t.land = Math.max(0, t.land - dt);
            if (t.flip > 0) t.flip = Math.max(0, t.flip - dt);
            else if (t.flip < 0) t.flip = Math.min(0, t.flip + dt);
          }
        }
      }
      for (var d = dying.length - 1; d >= 0; d--) {
        var dd = dying[d];
        if (dd.delay > 0) dd.delay -= dt;
        else dd.life -= dt;
        if (dd.life <= 0) dying.splice(d, 1);
      }
      for (var p = 0; p < MAXP; p++) {
        var q = parts[p];
        if (!q.on) continue;
        q.life -= dt;
        if (q.life <= 0) {
          q.on = false;
          continue;
        }
        q.vy += S * 14 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
      for (var u = 0; u < popups.length; u++) {
        var pp = popups[u];
        if (!pp.on) continue;
        pp.life -= dt * 0.9;
        pp.y -= 38 * dt;
        if (pp.life <= 0) pp.on = false;
      }
      if (banner.t > 0) banner.t -= dt;
      if (shakeT > 0) {
        shakeT -= dt;
        if (shakeT <= 0) shakeMag = 0;
      }
      if (flashT > 0) flashT -= dt;
      if (hint.t > 0) {
        hint.t -= dt;
        if (hint.t <= 0) hint.group = null;
      }
      if (endTimer > 0) {
        endTimer -= dt;
        if (endTimer <= 0 && endAction) {
          var fn = endAction;
          endAction = null;
          fn();
        }
      }

      if (state === 'resolve') updateResolve(dt);
      if (state === 'play' || state === 'resolve') {
        timeLeft -= dt;
        var sec = Math.ceil(timeLeft);
        if (sec <= 10 && sec >= 1 && sec !== lastTick) {
          lastTick = sec;
          sfx('tick');
        }
        if (timeLeft <= 0) {
          timeLeft = 0;
          loseLevel();
        }
      }
      if (state === 'play' && stuckTimer > 0) {
        stuckTimer -= dt;
        if (stuckTimer <= 0) doShuffle(true);
      }
      updateHud();
    }

    /* ---------- render ---------- */
    function drawStack(st, x, y, alpha, scale, hideMode) {
      var h = st.length;
      var top = st[h - 1];
      var face = faceCache[top.t];
      if (!face) return;
      var fy = y + PAD + (2 - h) * DEP; // single tiles sit lower: they are the bottom layer
      var fx = x + PAD;
      var sq = top.land > 0 ? Math.sin((top.land / 0.16) * Math.PI) * 0.08 : 0;
      var fl = top.flip > 0 ? Math.abs(Math.cos((top.flip / 0.4) * Math.PI * 2)) : 1;
      var wob = top.flip < 0 ? Math.sin(top.flip * 60) * S * 0.06 : 0;
      g.save();
      if (alpha < 1) g.globalAlpha = alpha;
      var cx = x + S / 2 + wob, cy = y + S - PAD;
      g.translate(cx, cy);
      g.scale(scale * (1 + sq) * fl, scale * (1 - sq));
      g.translate(-cx, -cy);
      var rad = Math.max(3, S * 0.12);
      // slabs (side thickness): bottom tile (olive) then top tile (ivory edge)
      var slabTop = fy + FH - rad;
      rr(g, fx, slabTop, FW, (y + S - PAD) - slabTop + (wob ? 0 : 0), rad);
      g.fillStyle = h === 2 ? '#56693a' : '#b7a77f';
      g.fill();
      if (h === 2) {
        rr(g, fx, slabTop, FW, rad + DEP, rad);
        g.fillStyle = '#cdbf98';
        g.fill();
      }
      g.drawImage(face, fx + wob, fy, FW, FH);
      if (h === 1) {
        // bottom-layer tiles are slightly dimmer so stacked tiles stand out
        rr(g, fx, fy, FW, FH, rad);
        g.fillStyle = 'rgba(40,30,10,0.13)';
        g.fill();
      }
      g.restore();
      return fy;
    }

    function outlineCell(i, color, width, inset) {
      var st = board.cells[i];
      if (!st.length) return;
      var t = st[st.length - 1];
      var c = i % board.cols, r = (i / board.cols) | 0;
      var x = cellX(c - t.ox), y = cellY(r - t.oy);
      var fy = y + PAD + (2 - st.length) * DEP;
      rr(g, x + PAD - inset, fy - inset, FW + inset * 2, FH + inset * 2, Math.max(3, S * 0.12) + inset);
      g.strokeStyle = color;
      g.lineWidth = width;
      g.stroke();
    }

    function render(time) {
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.drawImage(bgCanvas, 0, 0, W, H);
      if (!board) return;
      g.save();
      if (shakeMag > 0) g.translate((Math.random() - 0.5) * shakeMag * 2, (Math.random() - 0.5) * shakeMag * 2);

      // board tray
      var tp = Math.round(S * 0.18);
      rr(g, bx - tp, by - tp, board.cols * S + tp * 2, board.rows * S + tp * 2, S * 0.25);
      g.fillStyle = 'rgba(8,12,6,0.55)';
      g.fill();
      g.strokeStyle = 'rgba(200,220,160,0.16)';
      g.lineWidth = 2;
      g.stroke();
      // faint cell slots
      g.fillStyle = 'rgba(255,255,255,0.025)';
      for (var c0 = 0; c0 < board.cols; c0++) g.fillRect(bx + c0 * S + PAD, by, S - PAD * 2, board.rows * S);

      // tiles: top row first so lower rows overlap correctly
      var cols = board.cols;
      for (var r = 0; r < board.rows; r++) {
        for (var c = 0; c < cols; c++) {
          var st = board.cells[r * cols + c];
          if (!st.length) continue;
          var t = st[st.length - 1];
          var y = cellY(r - t.oy);
          if (y < -S * 1.2) continue;
          drawStack(st, cellX(c - t.ox), y, 1, 1);
        }
      }
      // tiles being cleared
      for (var d = 0; d < dying.length; d++) {
        var dd = dying[d];
        var k = dd.delay > 0 ? 1 : Math.max(0, dd.life / 0.32);
        TMP_STACK.length = dd.h;
        TMP_TILE.t = dd.t;
        for (var z = 0; z < dd.h; z++) TMP_STACK[z] = TMP_TILE;
        drawStack(TMP_STACK, dd.x, dd.y, k, 0.4 + 0.75 * k + (1 - k) * 0.25);
      }

      var pulse = 0.5 + 0.5 * Math.sin(time * 8);
      if (state === 'play') {
        // hint
        if (hint.group) {
          for (var h1 = 0; h1 < hint.group.length; h1++) outlineCell(hint.group[h1], 'rgba(253,224,71,' + (0.5 + pulse * 0.5) + ')', Math.max(2, S * 0.07), S * 0.03);
        }
        // hover / press preview
        var showG = press ? press.group : hoverGroup;
        if (!bombMode && showG && showG.length >= 2) {
          for (var h2 = 0; h2 < showG.length; h2++) outlineCell(showG[h2], press ? '#ffffff' : 'rgba(255,255,255,0.85)', Math.max(2, S * 0.06), S * 0.02);
          var ctr = cellCenter(showG[0]);
          if (!press) {
            g.font = '800 ' + Math.max(12, Math.round(S * 0.24)) + 'px system-ui,sans-serif';
            g.textAlign = 'center';
            g.fillStyle = '#fff';
            g.strokeStyle = 'rgba(0,0,0,0.6)';
            g.lineWidth = 3;
            var lbl = '+' + groupPoints(showG.length, 0);
            g.strokeText(lbl, ctr[0], ctr[1] - S * 0.55);
            g.fillText(lbl, ctr[0], ctr[1] - S * 0.55);
          }
        }
        // keyboard cursor
        if (cursor.on) {
          var cx = cellX(cursor.c), cy = cellY(cursor.r);
          rr(g, cx + 1, cy + 1, S - 2, S - 2, S * 0.16);
          g.strokeStyle = bombMode ? '#f87171' : '#60a5fa';
          g.lineWidth = Math.max(2.5, S * 0.07);
          g.setLineDash([S * 0.18, S * 0.1]);
          g.lineDashOffset = -time * 20;
          g.stroke();
          g.setLineDash([]);
        }
        // bomb reticle
        if (bombMode) {
          var bi = cursor.on ? cursor.r * cols + cursor.c : hover;
          if (bi >= 0 && board.cells[bi].length) {
            var bc = cellCenter(bi);
            g.strokeStyle = '#f87171';
            g.lineWidth = Math.max(2, S * 0.05);
            var rr1 = S * (0.42 + pulse * 0.06);
            g.beginPath();
            g.arc(bc[0], bc[1], rr1, 0, Math.PI * 2);
            g.moveTo(bc[0] - rr1 * 1.25, bc[1]);
            g.lineTo(bc[0] - rr1 * 0.55, bc[1]);
            g.moveTo(bc[0] + rr1 * 1.25, bc[1]);
            g.lineTo(bc[0] + rr1 * 0.55, bc[1]);
            g.moveTo(bc[0], bc[1] - rr1 * 1.25);
            g.lineTo(bc[0], bc[1] - rr1 * 0.55);
            g.moveTo(bc[0], bc[1] + rr1 * 1.25);
            g.lineTo(bc[0], bc[1] + rr1 * 0.55);
            g.stroke();
          }
        }
      }

      // particles
      for (var p = 0; p < MAXP; p++) {
        var q = parts[p];
        if (!q.on) continue;
        g.globalAlpha = Math.min(1, q.life / q.max * 1.6);
        g.fillStyle = q.color;
        if (q.kind === 1) {
          g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
        } else {
          g.beginPath();
          g.arc(q.x, q.y, q.size, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.globalAlpha = 1;
      // score popups
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (var u = 0; u < popups.length; u++) {
        var pp = popups[u];
        if (!pp.on) continue;
        g.globalAlpha = Math.min(1, pp.life * 2);
        g.font = '900 ' + pp.size + 'px system-ui,sans-serif';
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(0,0,0,0.65)';
        g.strokeText(pp.text, pp.x, pp.y);
        g.fillStyle = pp.color;
        g.fillText(pp.text, pp.x, pp.y);
      }
      g.globalAlpha = 1;
      g.restore();

      // time bar under the HUD
      if (state !== 'menu') {
        var barW = Math.min(W - 20, board.cols * S + 40);
        var barX = (W - barW) / 2, barY = hudH + 2;
        var frac = Math.max(0, Math.min(1, timeLeft / (mode === 'endless' ? 99 : timeMax)));
        rr(g, barX, barY, barW, 6, 3);
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fill();
        if (frac > 0) {
          rr(g, barX, barY, Math.max(6, barW * frac), 6, 3);
          g.fillStyle = timeLeft < 15 ? '#f87171' : timeLeft < 30 ? '#fbbf24' : '#86efac';
          g.fill();
        }
        if (mode === 'campaign') {
          // star markers on the bar
          var L = LEVELS[levelIdx];
          [L.s2, L.s3].forEach(function (s) {
            var mx = barX + barW * Math.min(1, s / timeMax);
            g.fillStyle = timeLeft >= s ? '#fde047' : 'rgba(255,255,255,0.35)';
            g.font = '900 11px system-ui,sans-serif';
            g.textAlign = 'center';
            g.fillText('★', mx, barY + 15);
          });
        }
      }

      // flash
      if (flashT > 0) {
        g.fillStyle = 'rgba(255,220,160,' + flashT * 2.5 + ')';
        g.fillRect(0, 0, W, H);
      }

      // banner
      if (banner.t > 0) {
        var k2 = banner.t;
        var a = Math.min(1, k2 * 3);
        var sc = 1 + Math.max(0, k2 - 1.1) * 2.5;
        var size = Math.max(26, Math.min(64, Math.min(W, H) * 0.1));
        g.save();
        g.globalAlpha = a;
        g.translate(W / 2, by + board.rows * S * 0.42);
        g.scale(sc, sc);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '900 ' + size + 'px system-ui,sans-serif';
        g.lineWidth = size * 0.16;
        g.strokeStyle = 'rgba(10,14,8,0.85)';
        g.strokeText(banner.text, 0, 0);
        g.fillStyle = banner.color;
        g.fillText(banner.text, 0, 0);
        if (banner.sub) {
          g.font = '800 ' + Math.round(size * 0.42) + 'px system-ui,sans-serif';
          g.lineWidth = 5;
          g.strokeText(banner.sub, 0, size * 0.75);
          g.fillStyle = '#fff';
          g.fillText(banner.sub, 0, size * 0.75);
        }
        g.restore();
      }
    }
    var TMP_STACK = [];
    var TMP_TILE = { t: 0, ox: 0, oy: 0, land: 0, flip: 0 };

    /* ---------- input ---------- */
    function localXY(e) {
      var r = view.canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function onPointerMove(e) {
      if (!board || state !== 'play') return;
      var p = localXY(e);
      var i = cellAt(p[0], p[1]);
      if (e.pointerType === 'mouse' && !press) {
        cursor.on = false;
        if (i !== hover) {
          hover = i;
          hoverGroup = i >= 0 && board.top(i) ? board.group(i) : null;
          if (hoverGroup && hoverGroup.length < 2) hoverGroup = null;
        }
      }
    }
    function onPointerDown(e) {
      if (e.button != null && e.button > 0) return;
      if (!board || state !== 'play') return;
      var p = localXY(e);
      var i = cellAt(p[0], p[1]);
      cursor.on = false;
      if (i < 0 || !board.top(i)) {
        press = null;
        return;
      }
      if (bombMode) {
        press = { cell: i, group: null, id: e.pointerId };
      } else {
        var grp = board.group(i);
        press = { cell: i, group: grp.length >= 2 ? grp : null, id: e.pointerId };
      }
      try { view.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onPointerUp(e) {
      if (!press || press.id !== e.pointerId) return;
      var pr = press;
      press = null;
      if (state !== 'play') return;
      var p = localXY(e);
      var i = cellAt(p[0], p[1]);
      if (bombMode) {
        if (i === pr.cell) dropBomb(i);
        return;
      }
      // tap, or drag from a tile onto a matching neighbour: both clear the group
      if (i === pr.cell || (pr.group && pr.group.indexOf(i) > -1)) tryClear(pr.cell);
      hoverGroup = null;
      hover = -1;
    }
    function onPointerCancel() {
      press = null;
    }
    function onLeave() {
      hover = -1;
      hoverGroup = null;
    }
    view.canvas.addEventListener('pointermove', onPointerMove);
    view.canvas.addEventListener('pointerdown', onPointerDown);
    view.canvas.addEventListener('pointerup', onPointerUp);
    view.canvas.addEventListener('pointercancel', onPointerCancel);
    view.canvas.addEventListener('pointerleave', onLeave);

    function btnHandler(fn) {
      return function (e) {
        e.stopPropagation();
        fn();
      };
    }
    var onPauseClick = btnHandler(pauseGame);
    var onBombClick = btnHandler(toggleBomb);
    var onHintClick = btnHandler(showHint);
    var onShuffleClick = btnHandler(function () { doShuffle(false); });
    pauseBtn.addEventListener('click', onPauseClick);
    bombBtn.addEventListener('click', onBombClick);
    hintBtn.addEventListener('click', onHintClick);
    shuffleBtn.addEventListener('click', onShuffleClick);

    ctx.captureKeys(['KeyB', 'KeyH', 'KeyP', 'KeyS', 'Enter']);
    ctx.onKey(function (code, down) {
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
      if (code === 'KeyP' || code === 'Escape') {
        pauseGame();
        return;
      }
      if (state !== 'play' || !board) return;
      var moved = false;
      if (code === 'ArrowLeft') { cursor.c--; moved = true; }
      else if (code === 'ArrowRight') { cursor.c++; moved = true; }
      else if (code === 'ArrowUp') { cursor.r--; moved = true; }
      else if (code === 'ArrowDown') { cursor.r++; moved = true; }
      if (moved) {
        cursor.on = true;
        cursor.c = Math.max(0, Math.min(board.cols - 1, cursor.c));
        cursor.r = Math.max(0, Math.min(board.rows - 1, cursor.r));
        var ci = cursor.r * board.cols + cursor.c;
        hoverGroup = board.top(ci) ? board.group(ci) : null;
        if (hoverGroup && hoverGroup.length < 2) hoverGroup = null;
        sfx('tick');
        return;
      }
      if (code === 'Space' || code === 'Enter') {
        if (!cursor.on) {
          cursor.on = true;
          return;
        }
        tryClear(cursor.r * board.cols + cursor.c);
        if (state === 'play') hoverGroup = null;
      } else if (code === 'KeyB') toggleBomb();
      else if (code === 'KeyH') showHint();
      else if (code === 'KeyS') doShuffle(false);
    });

    /* ---------- boot ---------- */
    var loop = IG.loop(function (dt, t) {
      if (state !== 'paused') update(dt);
      render(t);
    });
    booted = true;
    showMenu();
    loop.start();

    if (ctx.debug) {
      window.__tileWar = {
        info: function () {
          return { state: state, mode: mode, level: levelIdx, score: score, time: timeLeft, bombs: bombs, tiles: board && board.count(), cols: board && board.cols, rows: board && board.rows, hasMove: board && board.hasMove() };
        },
        // returns the viewport-fraction position of the best group's first cell (for automated tests)
        bestCell: function () {
          var gb = board && board.bestGroup();
          if (!gb) return null;
          var cc = cellCenter(gb[0]);
          return [cc[0] / W, cc[1] / H];
        },
        setTime: function (s) { timeLeft = s; },
        // automated play step for tests: clear the best group, or bomb/shuffle when stuck
        playBest: function () {
          if (state !== 'play') return state;
          var gb = board.bestGroup();
          if (gb) tryClear(gb[0]);
          else if (bombs) {
            bombMode = true;
            for (var i = 0; i < board.cells.length; i++) if (board.cells[i].length) { tryClear(i); break; }
          } else doShuffle(false);
          return state;
        },
        unlockAll: function () { for (var i = 0; i < LEVELS.length; i++) saved.stars[i] = saved.stars[i] || 1; save(); },
        start: function (i) { startLevel(i); },
      };
    }

    return {
      pause: function () {
        if (state === 'play' || state === 'resolve') pauseGame();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        closeOverlay();
        view.canvas.removeEventListener('pointermove', onPointerMove);
        view.canvas.removeEventListener('pointerdown', onPointerDown);
        view.canvas.removeEventListener('pointerup', onPointerUp);
        view.canvas.removeEventListener('pointercancel', onPointerCancel);
        view.canvas.removeEventListener('pointerleave', onLeave);
        pauseBtn.removeEventListener('click', onPauseClick);
        bombBtn.removeEventListener('click', onBombClick);
        hintBtn.removeEventListener('click', onHintClick);
        shuffleBtn.removeEventListener('click', onShuffleClick);
        view.destroy();
        if (ctx.debug) delete window.__tileWar;
      },
    };
  });

  // Test hook (Node simulations): expose pure board logic.
  if (window.IGAME_TEST) window.IGAME_TEST.tileWar = { Board: Board, LEVELS: LEVELS, buildLevel: buildLevel };
})();
