/*!
 * igame9 — Wild Splice (engine id: beast-fusion)
 * An original top-down creature-fusion survival RPG. Roam a procedurally
 * generated island (meadow, forest, desert, snow), defeat wild animals for
 * XP and DNA, then splice two species in the Fusion Lab: the hybrid gets the
 * head (and attack style) of one and the body, legs, tail and special
 * ability of the other, with blended colours and stats. Four biome bosses.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  var WORLD = 120;
  var C0 = WORLD / 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbHex(c) { return '#' + c.map(function (v) { return ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex([lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]); }
  function shade(h, amt) { return amt < 0 ? mix(h, '#000000', -amt) : mix(h, '#ffffff', amt); }
  // deterministic hash noise for the world
  function hash(x, y, s) {
    var h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  }

  /* ------------------------------------------------------------------ */
  /* Species: parts, colours, stats                                      */
  /* ------------------------------------------------------------------ */
  // attack: 'melee' bite/claw or 'ranged' spit; ability comes from the BODY species.
  var SPECIES = [
    { id: 'bunny', name: 'Bunny', biome: 0, pre: 'Bun', suf: 'bun', head: 'bunny', body: 'round', legs: 'hop', tail: 'puff', col: '#efe2d4', acc: '#f6a6b9', hp: 0.9, atk: 0.9, spd: 1.18, attack: 'melee', ability: 'dash', passive: true },
    { id: 'frog', name: 'Frog', biome: 0, pre: 'Frog', suf: 'rog', head: 'frog', body: 'round', legs: 'hop', tail: 'none', col: '#62c04e', acc: '#eef27a', hp: 0.95, atk: 0.9, spd: 1.0, attack: 'ranged', shot: '#bff3ff', ability: 'heal', passive: true },
    { id: 'hedgehog', name: 'Hedgehog', biome: 0, pre: 'Hedge', suf: 'hog', head: 'snout', body: 'spiky', legs: 'short', tail: 'none', col: '#9b6b45', acc: '#f2d3aa', hp: 1.05, atk: 1.0, spd: 0.92, attack: 'melee', ability: 'nova', passive: true },
    { id: 'fox', name: 'Fox', biome: 1, pre: 'Fox', suf: 'ox', head: 'fox', body: 'long', legs: 'long', tail: 'bushy', col: '#ea7a3a', acc: '#fff3e6', hp: 0.95, atk: 1.12, spd: 1.15, attack: 'melee', ability: 'dash' },
    { id: 'owl', name: 'Owl', biome: 1, pre: 'Owl', suf: 'owl', head: 'owl', body: 'bird', legs: 'short', tail: 'feather', col: '#8d6b4b', acc: '#f4dfb0', hp: 0.9, atk: 1.05, spd: 1.05, attack: 'ranged', shot: '#f4dfb0', ability: 'roar' },
    { id: 'boar', name: 'Boar', biome: 1, pre: 'Boar', suf: 'oar', head: 'boar', body: 'bulky', legs: 'short', tail: 'curly', col: '#6d4c3a', acc: '#f0b8a8', hp: 1.3, atk: 1.1, spd: 0.9, attack: 'melee', ability: 'dash' },
    { id: 'lizard', name: 'Lizard', biome: 2, pre: 'Liz', suf: 'zard', head: 'lizard', body: 'long', legs: 'splay', tail: 'thin', col: '#c9a23f', acc: '#7aa23a', hp: 0.95, atk: 1.05, spd: 1.2, attack: 'melee', ability: 'dash' },
    { id: 'armadillo', name: 'Armadillo', biome: 2, pre: 'Arma', suf: 'dillo', head: 'snout', body: 'shell', legs: 'short', tail: 'thin', col: '#b08f78', acc: '#e9c9b1', hp: 1.35, atk: 0.95, spd: 0.92, attack: 'melee', ability: 'nova' },
    { id: 'scorpion', name: 'Scorpion', biome: 2, pre: 'Scorp', suf: 'pion', head: 'pincer', body: 'segment', legs: 'many', tail: 'stinger', col: '#c4553b', acc: '#ffd25a', hp: 1.05, atk: 1.2, spd: 1.0, attack: 'ranged', shot: '#b6f04a', ability: 'nova' },
    { id: 'penguin', name: 'Penguin', biome: 3, pre: 'Peng', suf: 'guin', head: 'beak', body: 'tux', legs: 'flipper', tail: 'none', col: '#2c3140', acc: '#f6f6f2', hp: 1.05, atk: 1.0, spd: 1.0, attack: 'ranged', shot: '#ffffff', ability: 'heal', passive: true },
    { id: 'wolf', name: 'Wolf', biome: 3, pre: 'Wol', suf: 'olf', head: 'fox', body: 'long', legs: 'long', tail: 'bushy', col: '#8e9aac', acc: '#eef2f6', hp: 1.1, atk: 1.2, spd: 1.12, attack: 'melee', ability: 'roar' },
    { id: 'bear', name: 'Polar Bear', biome: 3, pre: 'Bear', suf: 'ear', head: 'bear', body: 'bulky', legs: 'short', tail: 'stub', col: '#f1f1ec', acc: '#3a3a3e', hp: 1.45, atk: 1.25, spd: 0.88, attack: 'melee', ability: 'roar' },
  ];
  var SP = {};
  SPECIES.forEach(function (s, i) { s.i = i; SP[s.id] = s; });
  var BIOMES = [
    { name: 'Meadow', ground: ['#7cc455', '#74bb4e', '#82ca5c'], species: ['bunny', 'frog', 'hedgehog'], off: 0 },
    { name: 'Forest', ground: ['#4f9a48', '#4a9143', '#56a24e'], species: ['fox', 'owl', 'boar'], off: 0 },
    { name: 'Desert', ground: ['#e8cf8a', '#e2c77f', '#eed696'], species: ['lizard', 'armadillo', 'scorpion'], off: 1 },
    { name: 'Snowfield', ground: ['#eef3f8', '#e6edf5', '#f5f8fb'], species: ['penguin', 'wolf', 'bear'], off: 3 },
  ];
  var ABILITIES = {
    dash: { name: 'Pounce Dash', desc: 'Dash forward, hurting anything in the way', cd: 4 },
    nova: { name: 'Spike Burst', desc: 'Damage every creature around you', cd: 6 },
    heal: { name: 'Snack Break', desc: 'Restore 35% of your health', cd: 10 },
    roar: { name: 'Big Roar', desc: 'Knock back and stun nearby creatures', cd: 7 },
  };
  var BOSSES = [
    { id: 'mossjaw', name: 'Mossjaw', sp: 'frog', biome: 0, ang: Math.PI * 0.5, d: 15, lvl: 5 },
    { id: 'bristle', name: 'Old Bristle', sp: 'boar', biome: 1, ang: 0, d: 31, lvl: 12 },
    { id: 'pincer', name: 'Dune Pincer', sp: 'scorpion', biome: 2, ang: 0, d: 39, lvl: 18 },
    { id: 'frostfang', name: 'Frostfang', sp: 'wolf', biome: 3, ang: 0, d: 46, lvl: 25 },
  ];
  var DNA_COST = 3;

  /* ------------------------------------------------------------------ */
  /* Procedural creature art (side view, facing right, 80×64 design box)  */
  /* ------------------------------------------------------------------ */
  function ell(x, cx, cy, rx, ry, col, rot) {
    x.fillStyle = col;
    x.beginPath();
    x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
    x.fill();
  }
  function poly(x, pts, col) {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
    x.closePath();
    x.fill();
  }
  var BODY = {
    round: { cx: 36, cy: 40, rx: 17, ry: 14, hx: 52, hy: 28, tx: 19, ty: 38, legY: 50, legs: [28, 44] },
    spiky: { cx: 36, cy: 41, rx: 18, ry: 13, hx: 53, hy: 34, tx: 18, ty: 40, legY: 51, legs: [28, 45] },
    long: { cx: 36, cy: 40, rx: 21, ry: 10, hx: 57, hy: 30, tx: 15, ty: 37, legY: 47, legs: [24, 48] },
    bulky: { cx: 35, cy: 39, rx: 23, ry: 15, hx: 57, hy: 33, tx: 12, ty: 35, legY: 50, legs: [24, 46] },
    bird: { cx: 38, cy: 38, rx: 14, ry: 17, hx: 41, hy: 18, tx: 24, ty: 48, legY: 53, legs: [34, 42] },
    shell: { cx: 36, cy: 42, rx: 20, ry: 13, hx: 56, hy: 40, tx: 15, ty: 46, legY: 52, legs: [27, 45] },
    segment: { cx: 34, cy: 44, rx: 20, ry: 9, hx: 55, hy: 42, tx: 16, ty: 40, legY: 52, legs: [22, 46] },
    tux: { cx: 38, cy: 38, rx: 13, ry: 18, hx: 41, hy: 17, tx: 26, ty: 52, legY: 55, legs: [34, 43] },
  };
  // d: {head, body, legs, tail, col (body), hcol (head), acc}
  function drawCreature(x, d, frame) {
    var B = BODY[d.body];
    var col = d.col, dk = shade(col, -0.28), lt = shade(col, 0.25), hc = d.hcol, hdk = shade(hc, -0.28), acc = d.acc;
    var step = frame ? 1 : -1;
    // shadow
    ell(x, B.cx, 58, B.rx * 0.95, 4, 'rgba(0,0,0,0.18)');
    // tail (behind body)
    var tx = B.tx, ty = B.ty;
    if (d.tail === 'puff') ell(x, tx, ty, 6, 6, acc === '#f6a6b9' ? '#ffffff' : lt);
    else if (d.tail === 'bushy') {
      ell(x, tx - 8, ty - 6 + step, 13, 6, dk, -0.5);
      ell(x, tx - 15, ty - 11 + step, 5, 4, acc, -0.5);
    } else if (d.tail === 'thin') {
      x.strokeStyle = dk;
      x.lineWidth = 4;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(tx + 4, ty);
      x.quadraticCurveTo(tx - 10, ty + 4 + step * 2, tx - 16, ty - 2);
      x.stroke();
    } else if (d.tail === 'curly') {
      x.strokeStyle = acc;
      x.lineWidth = 2.5;
      x.beginPath();
      x.arc(tx - 3, ty - 4, 4, 0, Math.PI * 1.6);
      x.stroke();
    } else if (d.tail === 'feather') {
      poly(x, [tx + 4, ty - 4, tx - 10, ty + 6, tx - 8, ty + 10, tx + 4, ty + 4], dk);
    } else if (d.tail === 'stinger') {
      x.fillStyle = dk;
      for (var s = 0; s < 4; s++) ell(x, tx - 4 + s * 2, ty - 6 - s * 7, 5 - s * 0.4, 4.5, s % 2 ? col : dk);
      poly(x, [tx + 6, ty - 31, tx + 14, ty - 26, tx + 6, ty - 24], acc);
    } else if (d.tail === 'stub') ell(x, tx + 2, ty, 4, 4, col);
    // far legs (darker)
    legs(x, d.legs, B, dk, -step, true, acc);
    // body
    if (d.body === 'spiky') {
      for (var k = 0; k < 7; k++) {
        var a = Math.PI + 0.25 + k * 0.42;
        poly(x, [B.cx + Math.cos(a) * 12, B.cy + Math.sin(a) * 9, B.cx + Math.cos(a + 0.2) * 24, B.cy + Math.sin(a + 0.2) * 19, B.cx + Math.cos(a + 0.4) * 12, B.cy + Math.sin(a + 0.4) * 9], dk);
      }
      ell(x, B.cx, B.cy, B.rx, B.ry, col);
      ell(x, B.cx + 6, B.cy + 5, 9, 6, acc);
    } else if (d.body === 'shell') {
      ell(x, B.cx, B.cy + 3, B.rx, B.ry - 2, acc);
      x.fillStyle = col;
      x.beginPath();
      x.ellipse(B.cx, B.cy + 4, B.rx + 1, B.ry + 2, 0, Math.PI, 0);
      x.fill();
      x.strokeStyle = dk;
      x.lineWidth = 2;
      for (var b2 = -2; b2 <= 2; b2++) {
        x.beginPath();
        x.moveTo(B.cx + b2 * 7, B.cy + 4);
        x.lineTo(B.cx + b2 * 6, B.cy - B.ry + 2 + Math.abs(b2) * 2);
        x.stroke();
      }
    } else if (d.body === 'segment') {
      for (var g = 0; g < 4; g++) ell(x, B.cx - 12 + g * 9, B.cy, 8, 7, g % 2 ? col : shade(col, -0.1));
      x.fillStyle = lt;
      x.fillRect(B.cx - 18, B.cy - 6, 34, 2);
    } else if (d.body === 'tux') {
      ell(x, B.cx, B.cy, B.rx, B.ry, col);
      ell(x, B.cx + 4, B.cy + 3, B.rx - 5, B.ry - 4, acc);
      ell(x, B.cx - 7, B.cy + 2, 4, 10, dk, 0.2);
    } else if (d.body === 'bird') {
      ell(x, B.cx, B.cy, B.rx, B.ry, col);
      ell(x, B.cx + 3, B.cy + 4, B.rx - 6, B.ry - 6, acc);
      ell(x, B.cx - 5, B.cy + 1, 7, 12, dk, 0.25);
    } else {
      ell(x, B.cx, B.cy, B.rx, B.ry, col);
      ell(x, B.cx + 3, B.cy + B.ry * 0.35, B.rx * 0.65, B.ry * 0.5, shade(col, 0.18));
      ell(x, B.cx - 4, B.cy - B.ry * 0.4, B.rx * 0.6, B.ry * 0.3, lt);
    }
    // near legs
    legs(x, d.legs, B, col, step, false, acc);
    // head
    drawHead(x, d.head, B.hx, B.hy, hc, hdk, acc);
  }
  function legs(x, type, B, col, step, far, acc) {
    var y = B.legY, a = B.legs[0] + (far ? 4 : 0), b = B.legs[1] + (far ? 4 : 0);
    x.fillStyle = col;
    if (type === 'hop') {
      ell(x, a + step, y + 4, 9, 4, col);
      ell(x, b - step, y + 5, 4, 3, col);
    } else if (type === 'short') {
      x.fillRect(a - 3 + step, y - 4, 6, 10);
      x.fillRect(b - 3 - step, y - 4, 6, 10);
    } else if (type === 'long') {
      x.fillRect(a - 2 + step * 2, y - 6, 4, 15);
      x.fillRect(b - 2 - step * 2, y - 6, 4, 15);
      x.fillStyle = shade(col, -0.2);
      x.fillRect(a - 3 + step * 2, y + 7, 6, 3);
      x.fillRect(b - 3 - step * 2, y + 7, 6, 3);
    } else if (type === 'splay') {
      poly(x, [a, y - 3, a - 8 + step * 2, y + 7, a - 3 + step * 2, y + 8, a + 4, y], col);
      poly(x, [b, y - 3, b + 6 - step * 2, y + 7, b + 10 - step * 2, y + 7, b + 4, y], col);
    } else if (type === 'many') {
      x.strokeStyle = col;
      x.lineWidth = 2;
      for (var i = 0; i < 4; i++) {
        var lx = a - 4 + i * 9;
        x.beginPath();
        x.moveTo(lx, y - 6);
        x.lineTo(lx + (i % 2 ? step : -step) * 3 - 3, y + 2);
        x.lineTo(lx + (i % 2 ? step : -step) * 3 - 1, y + 7);
        x.stroke();
      }
    } else if (type === 'flipper') {
      ell(x, a + 2 + step, y + 4, 6, 2.6, '#f39a2a');
      ell(x, b + 2 - step, y + 4, 6, 2.6, '#f39a2a');
    }
  }
  function eye(x, cx, cy, r) {
    ell(x, cx, cy, r, r * 1.1, '#ffffff');
    ell(x, cx + r * 0.3, cy + r * 0.1, r * 0.6, r * 0.7, '#1d1a22');
    ell(x, cx + r * 0.1, cy - r * 0.35, r * 0.25, r * 0.25, '#ffffff');
  }
  function drawHead(x, type, hx, hy, c, dk, acc) {
    if (type === 'bunny') {
      ell(x, hx - 6, hy - 18, 4, 12, c, -0.25);
      ell(x, hx + 2, hy - 19, 4, 12, c, 0.15);
      ell(x, hx + 2, hy - 18, 2, 8, acc, 0.15);
      ell(x, hx, hy, 12, 11, c);
      eye(x, hx + 4, hy - 2, 3.4);
      ell(x, hx + 11, hy + 3, 2.2, 1.8, acc);
      ell(x, hx + 6, hy + 6, 3.5, 2.2, shade(acc, 0.4));
    } else if (type === 'frog') {
      ell(x, hx, hy + 2, 14, 10, c);
      ell(x, hx - 4, hy - 7, 6, 6, c);
      ell(x, hx + 6, hy - 7, 6, 6, c);
      eye(x, hx - 3, hy - 8, 3.6);
      eye(x, hx + 7, hy - 8, 3.6);
      x.strokeStyle = dk;
      x.lineWidth = 1.6;
      x.beginPath();
      x.arc(hx + 2, hy + 1, 9, 0.3, Math.PI - 0.5);
      x.stroke();
      ell(x, hx - 7, hy + 4, 2.6, 1.8, acc);
    } else if (type === 'snout') {
      ell(x, hx - 2, hy, 10, 9, c);
      poly(x, [hx + 2, hy - 6, hx + 17, hy + 2, hx + 2, hy + 7], c);
      ell(x, hx + 16, hy + 2, 2.6, 2.4, '#2a2024');
      ell(x, hx - 6, hy - 7, 3.5, 3.5, dk);
      eye(x, hx + 3, hy - 2, 2.6);
      ell(x, hx - 2, hy + 5, 3, 2, shade(acc, 0.2));
    } else if (type === 'fox') {
      poly(x, [hx - 9, hy - 4, hx - 7, hy - 20, hx + 1, hy - 8], c);
      poly(x, [hx - 1, hy - 6, hx + 4, hy - 21, hx + 9, hy - 6], c);
      poly(x, [hx + 1, hy - 8, hx + 4, hy - 16, hx + 7, hy - 8], dk);
      ell(x, hx, hy, 11, 9, c);
      poly(x, [hx + 4, hy - 4, hx + 20, hy + 3, hx + 4, hy + 8], c);
      poly(x, [hx - 2, hy + 2, hx + 18, hy + 4, hx + 2, hy + 9], acc);
      ell(x, hx + 19, hy + 2, 2.4, 2.2, '#2a2024');
      eye(x, hx + 4, hy - 3, 2.8);
    } else if (type === 'owl') {
      poly(x, [hx - 12, hy - 8, hx - 9, hy - 18, hx - 4, hy - 10], dk);
      poly(x, [hx + 12, hy - 8, hx + 9, hy - 18, hx + 4, hy - 10], dk);
      ell(x, hx, hy, 14, 12, c);
      ell(x, hx - 5, hy - 1, 6.5, 6.5, acc);
      ell(x, hx + 5, hy - 1, 6.5, 6.5, acc);
      eye(x, hx - 5, hy - 1, 4);
      eye(x, hx + 5, hy - 1, 4);
      poly(x, [hx - 2, hy + 4, hx + 2, hy + 4, hx, hy + 9], '#f2a83a');
    } else if (type === 'boar') {
      ell(x, hx - 7, hy - 9, 4, 5, dk, -0.4);
      ell(x, hx - 2, hy, 12, 10, c);
      ell(x, hx + 11, hy + 3, 6, 6.5, acc);
      ell(x, hx + 12, hy + 1, 1.2, 1.6, '#3a2420');
      ell(x, hx + 12, hy + 5, 1.2, 1.6, '#3a2420');
      poly(x, [hx + 6, hy + 7, hx + 12, hy + 10, hx + 7, hy + 2], '#fffbea');
      eye(x, hx + 1, hy - 4, 2.6);
    } else if (type === 'lizard') {
      ell(x, hx, hy, 10, 7, c);
      poly(x, [hx + 2, hy - 5, hx + 19, hy + 1, hx + 2, hy + 6], c);
      ell(x, hx - 1, hy - 5, 4.5, 4.5, c);
      eye(x, hx, hy - 5, 2.8);
      x.strokeStyle = '#e8506a';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(hx + 18, hy + 2);
      x.lineTo(hx + 24, hy + 3);
      x.lineTo(hx + 26, hy + 1);
      x.stroke();
      for (var k = 0; k < 3; k++) ell(x, hx - 6 + k * 4, hy + 2, 1.4, 1.4, acc);
    } else if (type === 'pincer') {
      ell(x, hx - 2, hy, 9, 8, c);
      ell(x, hx + 12, hy - 7, 6, 4, dk, -0.3);
      poly(x, [hx + 14, hy - 10, hx + 22, hy - 13, hx + 17, hy - 6], dk);
      ell(x, hx + 12, hy + 6, 6, 4, dk, 0.3);
      poly(x, [hx + 14, hy + 4, hx + 22, hy + 9, hx + 17, hy + 10], dk);
      eye(x, hx, hy - 4, 2.4);
      eye(x, hx + 5, hy - 4, 2.4);
    } else if (type === 'beak') {
      ell(x, hx, hy, 11, 10, c);
      ell(x, hx + 3, hy + 3, 7, 5, acc);
      poly(x, [hx + 8, hy - 1, hx + 19, hy + 2, hx + 8, hy + 4], '#f39a2a');
      eye(x, hx + 3, hy - 3, 2.8);
    } else if (type === 'bear') {
      ell(x, hx - 7, hy - 9, 5, 5, c);
      ell(x, hx - 7, hy - 9, 2.6, 2.6, dk);
      ell(x, hx, hy, 12, 11, c);
      ell(x, hx + 10, hy + 3, 7, 5.5, shade(c, -0.08));
      ell(x, hx + 15, hy + 1, 2.6, 2.2, acc);
      eye(x, hx + 3, hy - 3, 2.6);
    }
  }
  function designOf(headSp, bodySp) {
    var h = SPECIES[headSp], b = SPECIES[bodySp];
    var same = headSp === bodySp;
    return {
      key: headSp + '_' + bodySp,
      head: h.head, body: b.body, legs: b.legs, tail: b.tail,
      col: same ? b.col : mix(b.col, h.col, 0.28),
      hcol: same ? h.col : mix(h.col, b.col, 0.18),
      acc: h.acc,
    };
  }
  function hybridName(headSp, bodySp) {
    if (headSp === bodySp) return SPECIES[headSp].name;
    return SPECIES[headSp].pre + SPECIES[bodySp].suf;
  }
  function hybridStats(headSp, bodySp) {
    var h = SPECIES[headSp], b = SPECIES[bodySp], bonus = headSp === bodySp ? 1 : 1.12;
    return {
      hp: Math.round(80 * ((h.hp + b.hp) / 2) * bonus),
      atk: Math.round(13 * ((h.atk * 1.4 + b.atk * 0.6) / 2) * bonus * 10) / 10,
      spd: Math.round((((h.spd * 0.6 + b.spd * 1.4) / 2) * bonus) * 100) / 100,
      attack: h.attack, shot: h.shot || '#ffffff', ability: b.ability,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('beast-fusion', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;

    /* ---------------- save data ---------------- */
    var save = store.get('save', null);
    function freshSave() {
      return { v: 1, started: false, lvl: 1, xp: 0, pts: 0, stat: { hp: 0, atk: 0, spd: 0 }, dna: {}, coll: [], active: 0, bosses: {}, x: C0 + 0.5, y: C0 + 2.5, kills: 0, fusions: 0, won: false, seed: (Math.random() * 1e9) | 0, t: Date.now() };
    }
    if (!save || save.v !== 1) save = freshSave();
    function persist() { save.t = Date.now(); store.set('save', save); }

    /* ---------------- DOM ---------------- */
    var style = document.createElement('style');
    style.textContent =
      '.bf-top{position:absolute;top:8px;right:8px;display:flex;gap:6px;z-index:6}' +
      '.bf-b{position:relative;min-width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(10,14,30,.6);color:#fff;font:800 14px var(--font);display:grid;place-items:center;padding:0 10px;cursor:pointer;touch-action:manipulation}' +
      '.bf-b:hover{background:rgba(30,40,80,.75)}' +
      '.bf-b .bf-dot{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#f43f5e;font:800 11px/18px var(--font);color:#fff;padding:0 4px}' +
      '.bf-panel.ig-panel{width:min(560px,100%)}' +
      '.bf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px;margin:6px 0 10px}' +
      '.bf-sp{border:2px solid transparent;border-radius:12px;background:var(--surface-3);padding:4px 2px 5px;cursor:pointer;color:var(--text-2);font:700 11.5px/1.15 var(--font);text-align:center;touch-action:manipulation}' +
      '.bf-sp canvas{width:64px;height:51px;display:block;margin:0 auto}' +
      '.bf-sp.on{border-color:#fbbf24;color:#fff;background:rgba(251,191,36,.14)}' +
      '.bf-sp.lock{opacity:.42;cursor:not-allowed}' +
      '.bf-sp small{display:block;color:var(--muted);font-weight:600}' +
      '.bf-h{font:800 12px var(--font);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;margin:8px 0 2px}' +
      '.bf-prev{display:flex;gap:12px;align-items:center;justify-content:center;background:rgba(0,0,0,.25);border-radius:14px;padding:8px;margin:6px 0 10px;text-align:left}' +
      '.bf-prev canvas{width:120px;height:96px;flex:0 0 auto}' +
      '.bf-prev b{color:#fff;font-size:17px}.bf-prev div{font-size:13px;color:var(--text-2);line-height:1.45}' +
      '.bf-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 4px;border-top:1px solid rgba(255,255,255,.08);font-size:14px;color:var(--text-2)}' +
      '.bf-row b{color:#fff}.bf-plus{min-width:44px;padding:8px 12px}' +
      '.bf-tabs{display:flex;gap:6px;justify-content:center;margin:0 0 6px}' +
      '.bf-tabs button{font:800 13px var(--font);border:0;border-radius:10px;padding:8px 12px;background:var(--surface-3);color:var(--text-2);cursor:pointer}' +
      '.bf-tabs button.on{background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff}' +
      '.bf-compact.ig-panel{padding:12px 10px}.bf-compact .ig-title{font-size:20px;margin-bottom:4px}.bf-compact .ig-sub{font-size:13px;margin-bottom:6px}.bf-compact .bf-grid{grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:4px}.bf-compact .bf-sp canvas{width:54px;height:43px}.bf-compact .ig-btn{padding:10px 14px;font-size:15px}';
    root.appendChild(style);

    var W = 1, H = 1, T = 40, ready = false;
    var view = IGAME.createCanvas(root, { onResize: function (w, h) { W = w; H = h; if (ready) layout(); } });
    var canvas = view.canvas, g = view.ctx;
    var top = ui.el('div', 'bf-top');
    var btnLab = ui.el('button', 'bf-b', '🧬 Lab');
    var btnStats = ui.el('button', 'bf-b', '⭐');
    var btnPause = ui.el('button', 'bf-b', '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>');
    [btnLab, btnStats, btnPause].forEach(function (b) { b.type = 'button'; top.appendChild(b); });
    btnLab.setAttribute('aria-label', 'Fusion Lab');
    btnStats.setAttribute('aria-label', 'Stats and level-up points');
    btnPause.setAttribute('aria-label', 'Pause and settings');
    root.appendChild(top);

    /* ---------------- world generation ---------------- */
    var biome = new Uint8Array(WORLD * WORLD); // 0-3 biomes, 4 = sea
    var obst = new Uint8Array(WORLD * WORLD); // 0 none, 1 tree, 2 pine, 3 cactus, 4 rock, 5 pond, 6 bush
    var shadeV = new Uint8Array(WORLD * WORLD);
    function sectorOf(ang) {
      // forest to the east/north-east, desert south-west, snow north-west (with wobbly borders)
      var a = (ang + TAU) % TAU;
      if (a < TAU / 3) return 1;
      if (a < (2 * TAU) / 3) return 2;
      return 3;
    }
    function genWorld(seed) {
      for (var y = 0; y < WORLD; y++)
        for (var x = 0; x < WORLD; x++) {
          var i = y * WORLD + x, dx = x + 0.5 - C0, dy = y + 0.5 - C0, d = Math.sqrt(dx * dx + dy * dy);
          var n1 = vnoise(x / 9, y / 9, seed), n2 = vnoise(x / 4, y / 4, seed + 7);
          var ang = Math.atan2(dy, dx) + (vnoise(x / 12, y / 12, seed + 3) - 0.5) * 0.9 + 0.5;
          var edge = 54 + (n1 - 0.5) * 8;
          var b;
          if (d > edge) b = 4;
          else if (d < 19 + (n1 - 0.5) * 5) b = 0;
          else b = sectorOf(ang);
          biome[i] = b;
          shadeV[i] = (hash(x, y, seed + 11) * 3) | 0;
          var o = 0, h = hash(x, y, seed + 21);
          if (b !== 4 && d > 4.5) {
            if (b === 0) { if (n2 > 0.8 && d > 6) o = 5; else if (h < 0.03) o = 6; else if (h < 0.045) o = 4; else if (h < 0.075 && n1 > 0.55) o = 1; }
            else if (b === 1) { if (n2 > 0.84) o = 5; else if (h < 0.16 + (n1 - 0.5) * 0.12) o = 1; else if (h < 0.2) o = 6; else if (h < 0.215) o = 4; }
            else if (b === 2) { if (h < 0.045) o = 3; else if (h < 0.08) o = 4; }
            else if (b === 3) { if (h < 0.11 + (n1 - 0.5) * 0.08) o = 2; else if (h < 0.14) o = 4; }
          }
          obst[i] = o;
        }
      // keep boss arenas and the lab clear
      bossSpots().forEach(function (s) {
        for (var yy = -3; yy <= 3; yy++) for (var xx = -3; xx <= 3; xx++) { var j = ((s.y | 0) + yy) * WORLD + (s.x | 0) + xx; if (j >= 0 && j < obst.length && biome[j] !== 4) obst[j] = 0; }
      });
    }
    function bossSpots() {
      return BOSSES.map(function (b) {
        var ang = b.biome === 0 ? b.ang : b.biome === 1 ? TAU / 6 - 0.5 : b.biome === 2 ? TAU / 2 - 0.5 : (5 * TAU) / 6 - 0.5;
        return { b: b, x: C0 + Math.cos(ang) * b.d, y: C0 + Math.sin(ang) * b.d };
      });
    }
    function tileAt(x, y) { return (y | 0) * WORLD + (x | 0); }
    function solid(x, y) {
      if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return true;
      var i = tileAt(x, y);
      if (biome[i] === 4) return true;
      var o = obst[i];
      return o === 1 || o === 2 || o === 3 || o === 4 || o === 5;
    }
    function blocked(x, y, r) { return solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r); }
    function moveEnt(e, dx, dy, r) {
      if (!blocked(e.x + dx, e.y, r)) e.x += dx;
      if (!blocked(e.x, e.y + dy, r)) e.y += dy;
    }
    function areaLevel(x, y) {
      var dx = x - C0, dy = y - C0, d = Math.sqrt(dx * dx + dy * dy);
      var b = biome[tileAt(clamp(x, 0, WORLD - 1), clamp(y, 0, WORLD - 1))];
      return clamp(Math.round(1 + Math.max(0, d - 6) * 0.38 + (b > 0 && b < 4 ? BIOMES[b].off : 0)), 1, 30);
    }

    /* ---------------- art caches ---------------- */
    var designCache = {};
    function creatureArt(design, frame, flash) {
      var k = design.key + (design.boss ? 'B' : '') + frame + (flash ? 'f' : '');
      var c = designCache[k];
      if (c) return c;
      c = mkCanvas(160, 128);
      var x = c.getContext('2d');
      x.scale(2, 2);
      drawCreature(x, design, frame);
      if (design.boss) {
        // a little golden crown
        var B = BODY[design.body];
        poly(x, [B.hx - 8, B.hy - 12, B.hx - 8, B.hy - 21, B.hx - 4, B.hy - 16, B.hx, B.hy - 23, B.hx + 4, B.hy - 16, B.hx + 8, B.hy - 21, B.hx + 8, B.hy - 12], '#fbbf24');
        ell(x, B.hx, B.hy - 17, 1.6, 1.6, '#ef4444');
      }
      if (flash) {
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.globalCompositeOperation = 'source-atop';
        x.fillStyle = 'rgba(255,255,255,0.8)';
        x.fillRect(0, 0, 160, 128);
      }
      designCache[k] = c;
      return c;
    }
    function prop(kind) {
      var c = mkCanvas(64, 96), x = c.getContext('2d');
      ell(x, 32, 88, 18, 5, 'rgba(0,0,0,0.2)');
      if (kind === 1) {
        x.fillStyle = '#6b4a2e';
        x.fillRect(27, 58, 10, 30);
        ell(x, 32, 44, 24, 22, '#2f7d3a');
        ell(x, 24, 36, 14, 13, '#3f9a48');
        ell(x, 40, 52, 14, 10, '#276b31');
        ell(x, 22, 30, 5, 4, '#5cb85f');
      } else if (kind === 2) {
        x.fillStyle = '#5a3e2a';
        x.fillRect(29, 70, 6, 18);
        poly(x, [32, 6, 52, 40, 12, 40], '#2f6b55');
        poly(x, [32, 24, 56, 60, 8, 60], '#2a5f4c');
        poly(x, [32, 42, 58, 76, 6, 76], '#255544');
        poly(x, [32, 6, 42, 24, 24, 24], '#ffffff');
        poly(x, [20, 40, 30, 40, 18, 46], '#f4f8fb');
        poly(x, [40, 60, 52, 60, 46, 64], '#f4f8fb');
      } else if (kind === 3) {
        x.fillStyle = '#4f9a4a';
        x.beginPath();
        x.moveTo(26, 88); x.lineTo(26, 30); x.arc(32, 30, 6, Math.PI, 0); x.lineTo(38, 88); x.fill();
        x.beginPath();
        x.moveTo(14, 60); x.lineTo(14, 44); x.arc(19, 44, 5, Math.PI, 0); x.lineTo(24, 56); x.lineTo(26, 62); x.fill();
        x.beginPath();
        x.moveTo(50, 52); x.lineTo(50, 38); x.arc(45, 38, 5, 0, Math.PI, true); x.lineTo(40, 50); x.lineTo(38, 56); x.fill();
        x.fillStyle = '#3d7d3a';
        x.fillRect(30, 32, 2, 54);
        ell(x, 32, 25, 3, 3, '#f472b6');
      } else if (kind === 4) {
        ell(x, 32, 76, 20, 13, '#8b8f99');
        ell(x, 27, 71, 12, 8, '#a6aab3');
        ell(x, 40, 80, 9, 6, '#6f737c');
      } else if (kind === 6) {
        ell(x, 32, 74, 20, 14, '#3b8f3e');
        ell(x, 25, 70, 10, 9, '#4aa64c');
        [[22, 72], [34, 66], [40, 76], [28, 80], [44, 70]].forEach(function (p) { ell(x, p[0], p[1], 3, 3, '#e23b4a'); });
      }
      return c;
    }
    var props = { 1: prop(1), 2: prop(2), 3: prop(3), 4: prop(4), 6: prop(6) };
    var labArt = (function () {
      var c = mkCanvas(160, 140), x = c.getContext('2d');
      ell(x, 80, 128, 64, 10, 'rgba(0,0,0,0.2)');
      x.fillStyle = '#f4ead8';
      x.fillRect(28, 62, 104, 64);
      poly(x, [16, 66, 80, 18, 144, 66], '#d9485f');
      poly(x, [24, 66, 80, 26, 136, 66], '#ef5f75');
      x.fillStyle = '#6b4a2e';
      x.fillRect(68, 90, 24, 36);
      x.fillStyle = '#8fd3ff';
      x.fillRect(38, 76, 20, 16);
      x.fillRect(102, 76, 20, 16);
      // DNA helix sign
      x.strokeStyle = '#22d3ee';
      x.lineWidth = 3;
      x.beginPath();
      for (var t = 0; t <= 1; t += 0.05) x.lineTo(70 + Math.sin(t * TAU * 1.5) * 9, 34 + t * 26);
      x.stroke();
      x.strokeStyle = '#a78bfa';
      x.beginPath();
      for (t = 0; t <= 1; t += 0.05) x.lineTo(90 - Math.sin(t * TAU * 1.5) * 9, 34 + t * 26);
      x.stroke();
      return c;
    })();

    /* ---------------- state ---------------- */
    var player = { x: save.x, y: save.y, hp: 1, dir: 1, walkT: 0, cd: 0, abCd: 0, invT: 0, dashT: 0, dashX: 0, dashY: 0, vx: 0, vy: 0, aimX: 1, aimY: 0, hitT: 0, faint: 0 };
    var enemies = [], shots = [], foods = [], fx = [], texts = [];
    var state = 'title'; // title | play | menu
    var overlay = null, time = 0, saveT = 0, shake = 0, spawnT = 0;
    var cam = { x: player.x, y: player.y };
    var input = { mx: 0, my: 0, mouse: false, aimMouse: false, atk: false };
    var touchUI = !!ctx.isTouch;
    var joy = { id: -1, bx: 0, by: 0, x: 0, y: 0 };
    var tbtn = { atk: { x: 0, y: 0, r: 0 }, ab: { x: 0, y: 0, r: 0 } };
    var pointers = {};
    var listeners = [];
    function on(t, type, fn, o) { t.addEventListener(type, fn, o); listeners.push([t, type, fn, o]); }
    var miniCanvas = null;

    function active() { return save.coll[save.active] || { h: 0, b: 0 }; }
    function curStats() {
      var a = active(), s = hybridStats(a.h, a.b);
      return {
        maxHp: s.hp + save.stat.hp * 14 + (save.lvl - 1) * 4,
        atk: s.atk + save.stat.atk * 2.4 + (save.lvl - 1) * 0.6,
        spd: 3.6 * s.spd * (1 + save.stat.spd * 0.035),
        attack: s.attack, shot: s.shot, ability: s.ability,
      };
    }
    function xpNeed(l) { return Math.round(22 * Math.pow(l, 1.55)); }

    /* ---------------- layout ---------------- */
    function layout() {
      T = clamp(Math.round(Math.min(W, H) / 11), 30, 64);
      var S = Math.min(W, H);
      joy.r = clamp(S * 0.13, 40, 78);
      tbtn.atk.r = clamp(S * 0.11, 34, 60);
      tbtn.atk.x = W - tbtn.atk.r * 1.5;
      tbtn.atk.y = H - tbtn.atk.r * 1.6;
      tbtn.ab.r = tbtn.atk.r * 0.72;
      tbtn.ab.x = tbtn.atk.x - tbtn.atk.r * 2;
      tbtn.ab.y = H - tbtn.ab.r * 1.5;
      if (overlay) overlay.panel.classList.toggle('bf-compact', H < 620 || W < 480);
    }

    /* ---------------- entities ---------------- */
    function spawnEnemy(spIdx, x, y, lvl, bossDef) {
      var s = SPECIES[spIdx];
      var hpMul = s.hp * (bossDef ? 7 : 1), atkMul = s.atk * (bossDef ? 1.5 : 1);
      var e = {
        sp: spIdx, x: x, y: y, lvl: lvl, hp: 0, maxHp: Math.round((18 + lvl * 12) * hpMul), atk: (3 + lvl * 2.1) * atkMul,
        spd: 2.2 * s.spd * (bossDef ? 0.9 : 1), r: bossDef ? 0.75 : 0.36, scale: bossDef ? 2.1 : 0.85 + Math.min(lvl, 25) * 0.008,
        dir: 1, walkT: Math.random(), state: 'wander', t: rnd(0.5, 2), cd: rnd(0.5, 1.5), hx: x, hy: y, wx: 0, wy: 0,
        boss: bossDef || null, aggro: !s.passive || !!bossDef, hitT: 0, stunT: 0, provoked: false,
        design: designOf(spIdx, spIdx),
      };
      if (bossDef) e.design = { key: e.design.key, head: e.design.head, body: e.design.body, legs: e.design.legs, tail: e.design.tail, col: e.design.col, hcol: e.design.hcol, acc: e.design.acc, boss: true };
      e.hp = e.maxHp;
      enemies.push(e);
      return e;
    }
    function populate(dt) {
      spawnT -= dt;
      if (spawnT > 0) return;
      spawnT = 0.4;
      // despawn far critters (never bosses)
      for (var i = enemies.length - 1; i >= 0; i--) {
        var e = enemies[i];
        if (!e.boss && Math.hypot(e.x - player.x, e.y - player.y) > 32) enemies.splice(i, 1);
      }
      var wild = 0;
      for (i = 0; i < enemies.length; i++) if (!enemies[i].boss) wild++;
      if (wild < 26) {
        for (var tries = 0; tries < 6; tries++) {
          var a = Math.random() * TAU, d = rnd(10, 22);
          var x = player.x + Math.cos(a) * d, y = player.y + Math.sin(a) * d;
          if (x < 2 || y < 2 || x > WORLD - 2 || y > WORLD - 2 || blocked(x, y, 0.4)) continue;
          if (Math.hypot(x - C0, y - C0) < 5) continue;
          var b = biome[tileAt(x, y)];
          if (b === 4) continue;
          var pool = BIOMES[b].species;
          var lvl = clamp(areaLevel(x, y) + ((Math.random() * 3) | 0) - 1, 1, 30);
          spawnEnemy(SP[pool[(Math.random() * pool.length) | 0]].i, x, y, lvl, null);
          break;
        }
      }
      // bosses that are still undefeated sit in their arenas
      bossSpots().forEach(function (s) {
        if (save.bosses[s.b.id]) return;
        var exists = false;
        for (var k = 0; k < enemies.length; k++) if (enemies[k].boss === s.b) exists = true;
        if (!exists && Math.hypot(s.x - player.x, s.y - player.y) < 30) spawnEnemy(SP[s.b.sp].i, s.x, s.y, s.b.lvl, s.b);
      });
      // snacks
      for (i = foods.length - 1; i >= 0; i--) if (Math.hypot(foods[i].x - player.x, foods[i].y - player.y) > 30) foods.splice(i, 1);
      if (foods.length < 10) {
        var fa = Math.random() * TAU, fd = rnd(6, 18), fx2 = player.x + Math.cos(fa) * fd, fy2 = player.y + Math.sin(fa) * fd;
        if (fx2 > 2 && fy2 > 2 && fx2 < WORLD - 2 && fy2 < WORLD - 2 && !blocked(fx2, fy2, 0.3)) {
          var fb = biome[tileAt(fx2, fy2)];
          if (fb !== 4) foods.push({ x: fx2, y: fy2, kind: fb, ph: Math.random() * TAU });
        }
      }
    }

    /* ---------------- combat ---------------- */
    function aimVector() {
      if (input.aimMouse) {
        var wx = (input.mx - W / 2) / T + cam.x, wy = (input.my - H / 2) / T + cam.y;
        var dx = wx - player.x, dy = wy - player.y, l = Math.hypot(dx, dy) || 1;
        return [dx / l, dy / l];
      }
      // keyboard / touch: auto-target the nearest creature in range
      var best = null, bd = 6;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i], d = Math.hypot(e.x - player.x, e.y - player.y) - e.r;
        if (d < bd) { bd = d; best = e; }
      }
      if (best) { var l2 = Math.hypot(best.x - player.x, best.y - player.y) || 1; return [(best.x - player.x) / l2, (best.y - player.y) / l2]; }
      return [player.aimX, player.aimY];
    }
    function attack() {
      if (player.cd > 0 || player.faint > 0) return;
      var st = curStats();
      var av = aimVector();
      player.aimX = av[0];
      player.aimY = av[1];
      if (Math.abs(av[0]) > 0.15) player.dir = av[0] > 0 ? 1 : -1;
      if (st.attack === 'ranged') {
        player.cd = 0.55;
        shots.push({ x: player.x + av[0] * 0.5, y: player.y - 0.35 + av[1] * 0.5, vx: av[0] * 9, vy: av[1] * 9, dmg: st.atk * 1.1, from: 'p', life: 0.75, col: st.shot, r: 0.18 });
        sfx({ f: 520, f2: 880, d: 0.09, type: 'sine', v: 0.08 });
      } else {
        player.cd = 0.36;
        var hit = false;
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          var dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
          if (d > 1.25 + e.r) continue;
          if (d > 0.5 && (dx * av[0] + dy * av[1]) / d < 0.25) continue;
          hurtEnemy(e, st.atk * rnd(0.9, 1.15), av[0], av[1]);
          hit = true;
        }
        fx.push({ kind: 'swipe', x: player.x + av[0] * 0.7, y: player.y - 0.3 + av[1] * 0.7, a: Math.atan2(av[1], av[0]), t: 0, life: 0.18 });
        sfx(hit ? { f: 180, f2: 90, d: 0.1, type: 'square', v: 0.09 } : { f: 700, f2: 300, d: 0.07, type: 'triangle', v: 0.05 });
      }
    }
    function useAbility() {
      if (player.abCd > 0 || player.faint > 0) return;
      var st = curStats(), ab = st.ability, def = ABILITIES[ab];
      player.abCd = def.cd;
      var i, e, d;
      if (ab === 'dash') {
        var av = aimVector();
        player.dashT = 0.22;
        player.dashX = av[0];
        player.dashY = av[1];
        player.dashHit = [];
        player.invT = 0.3;
        sfx('boost');
      } else if (ab === 'nova') {
        fx.push({ kind: 'ring', x: player.x, y: player.y - 0.2, t: 0, life: 0.4, r: 2.6, col: '#fbbf24' });
        for (i = 0; i < enemies.length; i++) {
          e = enemies[i];
          d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < 2.6 + e.r) hurtEnemy(e, st.atk * 1.8, (e.x - player.x) / (d || 1), (e.y - player.y) / (d || 1));
        }
        for (i = 0; i < 18; i++) part(player.x, player.y - 0.2, Math.cos((i / 18) * TAU) * 5, Math.sin((i / 18) * TAU) * 5, '#fbbf24', 0.4);
        shake = 6;
        sfx('explode');
      } else if (ab === 'heal') {
        player.hp = Math.min(st.maxHp, player.hp + st.maxHp * 0.35);
        float(player.x, player.y - 1, '+' + Math.round(st.maxHp * 0.35), '#4ade80');
        for (i = 0; i < 12; i++) part(player.x + rnd(-0.4, 0.4), player.y, rnd(-0.5, 0.5), rnd(-3, -1), '#86efac', 0.7);
        sfx('levelup');
      } else if (ab === 'roar') {
        fx.push({ kind: 'ring', x: player.x, y: player.y - 0.2, t: 0, life: 0.5, r: 3.2, col: '#e0f2fe' });
        for (i = 0; i < enemies.length; i++) {
          e = enemies[i];
          d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < 3.2 + e.r) {
            hurtEnemy(e, st.atk, (e.x - player.x) / (d || 1), (e.y - player.y) / (d || 1));
            if (!e.boss) e.stunT = 1.5;
            var kx = (e.x - player.x) / (d || 1), ky = (e.y - player.y) / (d || 1);
            moveEnt(e, kx * 1.2, ky * 1.2, e.r);
          }
        }
        shake = 8;
        sfx({ f: 160, f2: 60, d: 0.5, type: 'sawtooth', v: 0.12 });
      }
    }
    function hurtEnemy(e, dmg, kx, ky) {
      dmg = Math.max(1, Math.round(dmg));
      e.hp -= dmg;
      e.hitT = 0.12;
      e.provoked = true;
      e.state = 'chase';
      float(e.x, e.y - e.r * 2 - 0.4, '' + dmg, '#fff');
      if (!e.boss) moveEnt(e, kx * 0.25, ky * 0.25, e.r);
      for (var i = 0; i < 4; i++) part(e.x, e.y - e.r, rnd(-2, 2), rnd(-3, -0.5), '#ffffff', 0.3);
      if (e.hp <= 0) killEnemy(e);
    }
    function killEnemy(e) {
      var idx = enemies.indexOf(e);
      if (idx > -1) enemies.splice(idx, 1);
      var s = SPECIES[e.sp];
      var dnaN = e.boss ? 5 : 1;
      save.dna[s.id] = (save.dna[s.id] || 0) + dnaN;
      save.kills++;
      var xp = Math.round((6 + e.lvl * 4) * (e.boss ? 8 : 1));
      gainXp(xp);
      float(e.x, e.y - 0.8, '+' + dnaN + ' ' + s.name + ' DNA', '#a78bfa');
      for (var i = 0; i < 14; i++) part(e.x, e.y - e.r, rnd(-3, 3), rnd(-4, 0), i % 2 ? s.col : '#a78bfa', 0.6);
      sfx(e.boss ? 'win' : 'coin');
      if ((save.dna[s.id] || 0) >= DNA_COST && (save.dna[s.id] - dnaN) < DNA_COST) toast('🧬 ' + s.name + ' DNA ready for fusion!');
      if (e.boss) {
        save.bosses[e.boss.id] = true;
        shake = 12;
        toast('👑 ' + e.boss.name + ' defeated!');
        if (!save.won && BOSSES.every(function (b) { return save.bosses[b.id]; })) {
          save.won = true;
          setTimeout(function () { if (state === 'play') showVictory(); }, 900);
        }
      }
      persist();
    }
    function gainXp(n) {
      save.xp += n;
      while (save.xp >= xpNeed(save.lvl)) {
        save.xp -= xpNeed(save.lvl);
        save.lvl++;
        save.pts += 3;
        player.hp = curStats().maxHp;
        toast('⬆ Level ' + save.lvl + '! +3 stat points (⭐)');
        sfx('levelup');
        for (var i = 0; i < 16; i++) part(player.x, player.y - 0.3, rnd(-3, 3), rnd(-5, -1), '#fde047', 0.8);
      }
      updateButtons();
    }
    function hurtPlayer(dmg, from) {
      if (player.invT > 0 || player.faint > 0 || state !== 'play') return;
      dmg = Math.max(1, Math.round(dmg));
      player.hp -= dmg;
      player.invT = 0.45;
      player.hitT = 0.15;
      shake = Math.max(shake, 4);
      float(player.x, player.y - 1.1, '-' + dmg, '#f87171');
      sfx({ f: 220, f2: 110, d: 0.12, type: 'square', v: 0.08 });
      if (from) moveEnt(player, (player.x - from.x) * 0.15, (player.y - from.y) * 0.15, 0.32);
      if (player.hp <= 0) {
        player.hp = 0;
        player.faint = 1.6;
        sfx('lose');
        toast('Your critter fainted! Back to the Lab…');
      }
    }

    /* ---------------- particles / texts ---------------- */
    function part(x, y, vx, vy, col, life) {
      if (fx.length > 160) return;
      fx.push({ kind: 'p', x: x, y: y, vx: vx, vy: vy, col: col, t: 0, life: life });
    }
    function float(x, y, text, col) {
      if (texts.length > 24) texts.shift();
      texts.push({ x: x, y: y, text: text, col: col, t: 0 });
    }
    function toast(text) { ui.toast(root, text, 1800); }

    /* ---------------- update ---------------- */
    function update(dt) {
      time += dt;
      if (state !== 'play') {
        cam.x += Math.sin(time * 0.2) * dt * 0.3;
        return;
      }
      var st = curStats();
      var k = ctx.keys;
      if (player.faint > 0) {
        player.faint -= dt;
        if (player.faint <= 0) {
          player.x = C0 + 0.5;
          player.y = C0 + 2.5;
          player.hp = st.maxHp;
          player.invT = 1.5;
          shots.length = 0;
        }
      } else {
        // movement
        var mx = 0, my = 0;
        if (k.KeyA || k.ArrowLeft) mx -= 1;
        if (k.KeyD || k.ArrowRight) mx += 1;
        if (k.KeyW || k.ArrowUp) my -= 1;
        if (k.KeyS || k.ArrowDown) my += 1;
        if (joy.id !== -1) { mx += joy.x; my += joy.y; }
        var l = Math.hypot(mx, my);
        if (l > 1) { mx /= l; my /= l; l = 1; }
        if (player.dashT > 0) {
          player.dashT -= dt;
          moveEnt(player, player.dashX * 16 * dt, player.dashY * 16 * dt, 0.32);
          for (var di = 0; di < enemies.length; di++) {
            var de = enemies[di];
            if (player.dashHit.indexOf(de) < 0 && Math.hypot(de.x - player.x, de.y - player.y) < de.r + 0.6) {
              player.dashHit.push(de);
              hurtEnemy(de, st.atk * 1.6, player.dashX, player.dashY);
            }
          }
          part(player.x, player.y, rnd(-1, 1), rnd(-1, 0), '#ffffff', 0.25);
        } else if (l > 0.05) {
          moveEnt(player, mx * st.spd * dt, my * st.spd * dt, 0.32);
          player.walkT += dt * 8 * l;
          if (Math.abs(mx) > 0.1) player.dir = mx > 0 ? 1 : -1;
          player.aimX = mx / (l || 1);
          player.aimY = my / (l || 1);
        }
        if (input.atk || k.Space || k.KeyJ) attack();
        // the Lab heals you while you stand next to it
        if (Math.hypot(player.x - C0 - 0.5, player.y - C0) < 3 && player.hp < st.maxHp) player.hp = Math.min(st.maxHp, player.hp + st.maxHp * 0.25 * dt);
        if (player.hp > st.maxHp) player.hp = st.maxHp;
      }
      if (player.cd > 0) player.cd -= dt;
      if (player.abCd > 0) player.abCd -= dt;
      if (player.invT > 0) player.invT -= dt;
      if (player.hitT > 0) player.hitT -= dt;
      // food
      for (var f = foods.length - 1; f >= 0; f--) {
        var fd = foods[f];
        if (player.faint <= 0 && Math.hypot(fd.x - player.x, fd.y - player.y) < 0.6) {
          foods.splice(f, 1);
          var heal = Math.round(st.maxHp * 0.22);
          player.hp = Math.min(st.maxHp, player.hp + heal);
          float(player.x, player.y - 1, '+' + heal + ' ❤', '#4ade80');
          gainXp(2);
          sfx('pop');
        }
      }
      populate(dt);
      updateEnemies(dt);
      updateShots(dt);
      for (var i = fx.length - 1; i >= 0; i--) {
        var p = fx[i];
        p.t += dt;
        if (p.kind === 'p') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt; }
        if (p.t >= p.life) fx.splice(i, 1);
      }
      for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; texts[i].y -= dt * 0.9; if (texts[i].t > 0.9) texts.splice(i, 1); }
      shake = Math.max(0, shake - dt * 30);
      cam.x = lerp(cam.x, player.x, 1 - Math.exp(-dt * 8));
      cam.y = lerp(cam.y, player.y, 1 - Math.exp(-dt * 8));
      saveT -= dt;
      if (saveT <= 0) {
        saveT = 4;
        save.x = player.faint > 0 ? C0 + 0.5 : player.x;
        save.y = player.faint > 0 ? C0 + 2.5 : player.y;
        persist();
      }
    }
    function updateEnemies(dt) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.hitT > 0) e.hitT -= dt;
        if (e.cd > 0) e.cd -= dt;
        if (e.stunT > 0) { e.stunT -= dt; continue; }
        var dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy);
        var alive = player.faint <= 0;
        var s = SPECIES[e.sp];
        if (alive && (e.aggro || e.provoked) && d < (e.boss ? (e.provoked ? 10 : 6) : 5.5)) e.state = 'chase';
        else if (alive && !e.aggro && !e.provoked && d < 1.9) e.state = 'flee';
        else if (e.state !== 'wander' && (d > 11 || !alive)) e.state = 'wander';
        var mvx = 0, mvy = 0, spd = e.spd;
        if (e.state === 'chase') {
          var ranged = s.attack === 'ranged';
          var want = ranged ? (e.boss ? 4 : 3.4) : 0.4;
          if (d > want + e.r) { mvx = dx / d; mvy = dy / d; }
          else if (ranged && d < want - 1) { mvx = -dx / d; mvy = -dy / d; }
          if (e.cd <= 0 && alive) {
            if (ranged && d < 7) {
              e.cd = e.boss ? 1.1 : rnd(1.4, 2);
              var n = e.boss ? 3 : 1;
              for (var q = 0; q < n; q++) {
                var a = Math.atan2(dy, dx) + (q - (n - 1) / 2) * 0.3;
                shots.push({ x: e.x, y: e.y - e.r, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, dmg: e.atk, from: 'e', life: 1.4, col: s.shot || '#fff', r: e.boss ? 0.28 : 0.18 });
              }
            } else if (!ranged && d < e.r + 0.75) {
              e.cd = e.boss ? 0.9 : rnd(0.9, 1.3);
              hurtPlayer(e.atk, e);
              e.lunge = 0.15;
            }
          }
        } else if (e.state === 'flee') {
          mvx = -dx / (d || 1);
          mvy = -dy / (d || 1);
          spd *= 0.8;
        } else {
          e.t -= dt;
          if (e.t <= 0) {
            e.t = rnd(1, 3);
            if (Math.random() < 0.4) { e.wx = 0; e.wy = 0; }
            else {
              var wa = Math.random() * TAU;
              e.wx = Math.cos(wa); e.wy = Math.sin(wa);
              if (Math.hypot(e.x - e.hx, e.y - e.hy) > 4) { var hd = Math.hypot(e.hx - e.x, e.hy - e.y); e.wx = (e.hx - e.x) / hd; e.wy = (e.hy - e.y) / hd; }
            }
          }
          mvx = e.wx; mvy = e.wy; spd *= 0.45;
        }
        if (mvx || mvy) {
          moveEnt(e, mvx * spd * dt, mvy * spd * dt, e.r * 0.85);
          e.walkT += dt * 7;
          if (Math.abs(mvx) > 0.1) e.dir = mvx > 0 ? 1 : -1;
        }
        if (e.lunge > 0) e.lunge -= dt;
      }
      // keep critters from stacking on the player or each other
      for (i = 0; i < enemies.length; i++) {
        var a2 = enemies[i];
        var px = a2.x - player.x, py = a2.y - player.y, pd = Math.hypot(px, py), pm = a2.r + 0.3;
        if (pd < pm && pd > 0.001 && player.faint <= 0) moveEnt(a2, (px / pd) * (pm - pd), (py / pd) * (pm - pd), a2.r * 0.85);
        for (var j = i + 1; j < enemies.length; j++) {
          var b2 = enemies[j], ex = b2.x - a2.x, ey = b2.y - a2.y, ed = Math.hypot(ex, ey), em = (a2.r + b2.r) * 0.8;
          if (ed < em && ed > 0.001) {
            var push = (em - ed) / 2;
            moveEnt(a2, (-ex / ed) * push, (-ey / ed) * push, a2.r * 0.85);
            moveEnt(b2, (ex / ed) * push, (ey / ed) * push, b2.r * 0.85);
          }
        }
      }
    }
    function updateShots(dt) {
      for (var i = shots.length - 1; i >= 0; i--) {
        var s = shots[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        var dead = s.life <= 0 || solid(s.x, s.y + 0.3);
        if (!dead && s.from === 'p') {
          for (var k = 0; k < enemies.length; k++) {
            var e = enemies[k];
            if (Math.hypot(e.x - s.x, e.y - e.r - s.y) < e.r + s.r + 0.1) {
              hurtEnemy(e, s.dmg, s.vx / 9, s.vy / 9);
              dead = true;
              break;
            }
          }
        } else if (!dead && player.faint <= 0 && Math.hypot(player.x - s.x, player.y - 0.35 - s.y) < 0.42 + s.r) {
          hurtPlayer(s.dmg, { x: s.x - s.vx, y: s.y - s.vy });
          dead = true;
        }
        if (dead) {
          for (var p = 0; p < 4; p++) part(s.x, s.y, rnd(-2, 2), rnd(-2, 1), s.col, 0.25);
          shots.splice(i, 1);
        }
      }
    }

    /* ---------------- render ---------------- */
    var drawList = [];
    function sx(x) { return (x - cam.x) * T + W / 2; }
    function sy(y) { return (y - cam.y) * T + H / 2; }
    function render() {
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      var ox = shake > 0.2 ? (Math.random() - 0.5) * shake : 0, oy = shake > 0.2 ? (Math.random() - 0.5) * shake : 0;
      g.save();
      g.translate(ox, oy);
      g.fillStyle = '#3b82c4';
      g.fillRect(-10, -10, W + 20, H + 20);
      var x0 = Math.floor(cam.x - W / 2 / T) - 1, x1 = Math.ceil(cam.x + W / 2 / T) + 1;
      var y0 = Math.floor(cam.y - H / 2 / T) - 1, y1 = Math.ceil(cam.y + H / 2 / T) + 2;
      var x, y, i;
      // sea shimmer
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) if (hash(x, y, 5) < 0.06) g.fillRect(sx(x) + T * 0.2 + Math.sin(time + x) * 3, sy(y) + T * 0.5, T * 0.4, 2);
      for (y = y0; y <= y1; y++) {
        for (x = x0; x <= x1; x++) {
          if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) continue;
          var t = y * WORLD + x, b = biome[t];
          if (b === 4) continue;
          var X = sx(x), Y = sy(y);
          g.fillStyle = BIOMES[b].ground[shadeV[t]];
          g.fillRect(X - 0.5, Y - 0.5, T + 1, T + 1);
          var h = hash(x, y, 77);
          if (b === 0 && h < 0.18) { g.fillStyle = h < 0.05 ? '#fde047' : h < 0.09 ? '#f9a8d4' : '#5aa63e'; g.fillRect(X + T * 0.3, Y + T * 0.4, T * 0.12, T * 0.12); }
          else if (b === 1 && h < 0.2) { g.fillStyle = '#3c7f38'; g.fillRect(X + T * h * 3, Y + T * 0.6, T * 0.08, T * 0.18); }
          else if (b === 2 && h < 0.2) { g.fillStyle = 'rgba(180,140,70,0.35)'; g.fillRect(X + T * 0.2, Y + T * 0.5, T * 0.5, T * 0.06); }
          else if (b === 3 && h < 0.12) { g.fillStyle = '#ffffff'; g.fillRect(X + T * 0.6, Y + T * 0.3, T * 0.08, T * 0.08); }
          if (obst[t] === 5) {
            g.fillStyle = b === 3 ? '#a5d8ff' : '#4aa3df';
            g.fillRect(X - 0.5, Y - 0.5, T + 1, T + 1);
            // light shore lines where the pond meets land
            g.fillStyle = b === 3 ? '#e0f2fe' : '#bfe6c8';
            var e2 = Math.max(2, T * 0.08);
            if (y > 0 && obst[t - WORLD] !== 5) g.fillRect(X, Y, T, e2);
            if (y < WORLD - 1 && obst[t + WORLD] !== 5) g.fillRect(X, Y + T - e2, T, e2);
            if (x > 0 && obst[t - 1] !== 5) g.fillRect(X, Y, e2, T);
            if (x < WORLD - 1 && obst[t + 1] !== 5) g.fillRect(X + T - e2, Y, e2, T);
            if (hash(x, y, 9) < 0.15) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(X + T * 0.25 + Math.sin(time * 1.5 + x) * T * 0.08, Y + T * 0.45, T * 0.35, Math.max(1.5, T * 0.04)); }
          }
          // beach / shore edge
          if (y + 1 < WORLD && biome[t + WORLD] === 4) { g.fillStyle = '#f1dfa8'; g.fillRect(X, Y + T * 0.75, T, T * 0.3); }
        }
      }
      // collect y-sorted drawables
      drawList.length = 0;
      for (y = y0; y <= y1; y++)
        for (x = x0; x <= x1; x++) {
          if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) continue;
          var o = obst[y * WORLD + x];
          if (o && o !== 5) drawList.push({ y: y + 0.9, k: 'prop', o: o, x: x });
        }
      if (Math.abs(C0 - cam.x) < W / T && Math.abs(C0 - cam.y) < H / T) drawList.push({ y: C0 + 0.4, k: 'lab' });
      for (i = 0; i < foods.length; i++) drawList.push({ y: foods[i].y, k: 'food', f: foods[i] });
      for (i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (Math.abs(e.x - cam.x) * T < W / 2 + 160 && Math.abs(e.y - cam.y) * T < H / 2 + 160) drawList.push({ y: e.y, k: 'enemy', e: e });
      }
      if (state === 'play') drawList.push({ y: player.y, k: 'player' });
      drawList.sort(function (a, b) { return a.y - b.y; });
      for (i = 0; i < drawList.length; i++) drawItem(drawList[i]);
      // shots
      for (i = 0; i < shots.length; i++) {
        var s = shots[i];
        g.fillStyle = s.col;
        g.beginPath();
        g.arc(sx(s.x), sy(s.y), s.r * T, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 1.5;
        g.stroke();
      }
      // effects
      for (i = 0; i < fx.length; i++) {
        var p = fx[i], k = p.t / p.life;
        if (p.kind === 'p') {
          g.globalAlpha = 1 - k;
          g.fillStyle = p.col;
          g.fillRect(sx(p.x) - 3, sy(p.y) - 3, 6, 6);
        } else if (p.kind === 'ring') {
          g.globalAlpha = 1 - k;
          g.strokeStyle = p.col;
          g.lineWidth = 5;
          g.beginPath();
          g.ellipse(sx(p.x), sy(p.y), p.r * T * (0.3 + k * 0.7), p.r * T * 0.6 * (0.3 + k * 0.7), 0, 0, TAU);
          g.stroke();
        } else if (p.kind === 'swipe') {
          g.globalAlpha = 1 - k;
          g.strokeStyle = '#ffffff';
          g.lineWidth = T * 0.14;
          g.lineCap = 'round';
          g.beginPath();
          g.arc(sx(p.x), sy(p.y), T * 0.6, p.a - 0.9 + k * 0.4, p.a + 0.9 + k * 0.4);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      // floating numbers
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (i = 0; i < texts.length; i++) {
        var tx = texts[i];
        g.globalAlpha = clamp(1.4 - tx.t * 1.5, 0, 1);
        g.font = '900 ' + Math.round(T * 0.36) + 'px ' + FONT;
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0,0,0,0.6)';
        g.strokeText(tx.text, sx(tx.x), sy(tx.y));
        g.fillStyle = tx.col;
        g.fillText(tx.text, sx(tx.x), sy(tx.y));
      }
      g.globalAlpha = 1;
      g.restore();
      if (state === 'play') drawHud();
    }
    function drawCritter(design, x, y, scale, dir, walkT, flash, alpha) {
      var frame = Math.floor(walkT) % 2;
      var art = creatureArt(design, frame, flash);
      var w = T * 2 * scale, h = T * 1.6 * scale;
      g.save();
      g.globalAlpha = alpha == null ? 1 : alpha;
      g.translate(sx(x), sy(y) + T * 0.15 * scale);
      if (dir < 0) g.scale(-1, 1);
      var bob = Math.abs(Math.sin(walkT * Math.PI)) * T * 0.04 * scale;
      g.drawImage(art, -w * 0.45, -h * 0.9 - bob, w, h);
      g.restore();
    }
    function drawItem(it) {
      if (it.k === 'prop') {
        var c = props[it.o];
        g.drawImage(c, sx(it.x + 0.5) - T * 0.75, sy(it.y + 0.1) - T * 2.1, T * 1.5, T * 2.25);
      } else if (it.k === 'lab') {
        g.drawImage(labArt, sx(C0 + 0.5) - T * 2, sy(C0 + 0.6) - T * 3.4, T * 4, T * 3.5);
        g.font = '800 ' + Math.round(T * 0.3) + 'px ' + FONT;
        g.textAlign = 'center';
        g.fillStyle = '#fff';
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 3;
        g.strokeText('FUSION LAB', sx(C0 + 0.5), sy(C0 + 0.6) - T * 3.5);
        g.fillText('FUSION LAB', sx(C0 + 0.5), sy(C0 + 0.6) - T * 3.5);
      } else if (it.k === 'food') {
        var f = it.f, X = sx(f.x), Y = sy(f.y) - Math.abs(Math.sin(time * 3 + f.ph)) * T * 0.1;
        g.fillStyle = 'rgba(0,0,0,0.15)';
        g.beginPath();
        g.ellipse(sx(f.x), sy(f.y) + T * 0.12, T * 0.2, T * 0.07, 0, 0, TAU);
        g.fill();
        if (f.kind === 3) { g.fillStyle = '#7dd3fc'; g.beginPath(); g.ellipse(X, Y, T * 0.24, T * 0.12, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(X - T * 0.2, Y); g.lineTo(X - T * 0.36, Y - T * 0.1); g.lineTo(X - T * 0.36, Y + T * 0.1); g.fill(); }
        else if (f.kind === 2) { g.fillStyle = '#f472b6'; g.beginPath(); g.arc(X, Y, T * 0.17, 0, TAU); g.fill(); g.fillStyle = '#4f9a4a'; g.fillRect(X - 2, Y - T * 0.24, 4, T * 0.1); }
        else { g.fillStyle = f.kind === 1 ? '#7c3aed' : '#ef4444'; g.beginPath(); g.arc(X - T * 0.08, Y, T * 0.12, 0, TAU); g.arc(X + T * 0.1, Y + T * 0.03, T * 0.12, 0, TAU); g.fill(); g.fillStyle = '#22c55e'; g.fillRect(X - 2, Y - T * 0.22, 5, T * 0.1); }
      } else if (it.k === 'enemy') {
        var e = it.e;
        var lx = e.lunge > 0 ? e.dir * T * 0.006 : 0;
        drawCritter(e.design, e.x + lx, e.y, e.scale, e.dir, e.walkT, e.hitT > 0, 1);
        // level tag + hp bar
        var bw = T * (e.boss ? 1.8 : 0.9), bx = sx(e.x) - bw / 2, by = sy(e.y) - T * 1.5 * e.scale - T * 0.15;
        var s = SPECIES[e.sp];
        g.font = '800 ' + Math.round(T * (e.boss ? 0.32 : 0.26)) + 'px ' + FONT;
        g.textAlign = 'center';
        var label = e.boss ? '👑 ' + e.boss.name + ' · Lv ' + e.lvl : 'Lv ' + e.lvl + (e.hp < e.maxHp ? '' : ' ' + s.name);
        var lc = e.lvl > save.lvl + 3 ? '#fca5a5' : e.lvl < save.lvl - 3 ? '#cbd5e1' : '#ffffff';
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.strokeText(label, sx(e.x), by - T * 0.14);
        g.fillStyle = lc;
        g.fillText(label, sx(e.x), by - T * 0.14);
        if (e.hp < e.maxHp || e.boss) {
          g.fillStyle = 'rgba(0,0,0,0.5)';
          g.fillRect(bx, by, bw, T * 0.1);
          g.fillStyle = e.boss ? '#f59e0b' : '#ef4444';
          g.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), T * 0.1);
        }
        if (e.stunT > 0) { g.fillStyle = '#fde047'; g.fillText('★', sx(e.x) + Math.cos(time * 8) * T * 0.3, by + T * 0.3); }
      } else if (it.k === 'player') {
        var a = active();
        var alpha = player.faint > 0 ? clamp(player.faint - 0.6, 0, 1) : player.invT > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(time * 20)) : 1;
        // highlight ring under the player
        g.strokeStyle = 'rgba(255,255,255,0.7)';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(sx(player.x), sy(player.y) + T * 0.15, T * 0.48, T * 0.16, 0, 0, TAU);
        g.stroke();
        drawCritter(designOf(a.h, a.b), player.x, player.y, 1, player.dir, player.walkT, player.hitT > 0, alpha);
      }
    }
    function rr(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }
    function drawHud() {
      var u = clamp(Math.min(W, H * 1.4) / 700, 0.75, 1.4);
      var st = curStats(), a = active();
      var pad = 10;
      // creature card: name, level, hp, xp
      var cw = Math.min(250 * u, W - 170), ch = 62 * u;
      g.fillStyle = 'rgba(10,14,30,0.62)';
      rr(pad, pad, cw, ch, 12);
      g.fill();
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.font = '800 ' + Math.round(14 * u) + 'px ' + FONT;
      g.fillStyle = '#fff';
      g.fillText(hybridName(a.h, a.b) + '  ·  Lv ' + save.lvl, pad + 10 * u, pad + 13 * u);
      var bw = cw - 20 * u;
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(pad + 10 * u, pad + 25 * u, bw, 12 * u);
      g.fillStyle = player.hp / st.maxHp > 0.35 ? '#4ade80' : '#f87171';
      g.fillRect(pad + 10 * u, pad + 25 * u, bw * clamp(player.hp / st.maxHp, 0, 1), 12 * u);
      g.font = '800 ' + Math.round(10 * u) + 'px ' + FONT;
      g.fillStyle = '#0b1020';
      g.fillText(Math.ceil(player.hp) + ' / ' + Math.round(st.maxHp), pad + 14 * u, pad + 31.5 * u);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(pad + 10 * u, pad + 43 * u, bw, 7 * u);
      g.fillStyle = '#a78bfa';
      g.fillRect(pad + 10 * u, pad + 43 * u, bw * clamp(save.xp / xpNeed(save.lvl), 0, 1), 7 * u);
      // goal line
      g.font = '700 ' + Math.round(12.5 * u) + 'px ' + FONT;
      var goal = goalText();
      var gw = Math.min(g.measureText(goal).width + 20, W - 20);
      var gy = pad + ch + 8;
      g.fillStyle = 'rgba(10,14,30,0.55)';
      rr(pad, gy, gw, 24 * u, 10);
      g.fill();
      g.fillStyle = '#fde68a';
      g.fillText(fitText(goal, W - 40), pad + 10, gy + 12 * u);
      // biome label
      var b = biome[tileAt(clamp(player.x, 0, WORLD - 1), clamp(player.y, 0, WORLD - 1))];
      g.font = '700 ' + Math.round(11.5 * u) + 'px ' + FONT;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillText((b < 4 ? BIOMES[b].name : 'Shore') + ' · wild Lv ~' + areaLevel(player.x, player.y), pad + 4, gy + 38 * u);
      // minimap
      drawMinimap(u);
      // ability + attack buttons (touch) or cooldown chip (desktop)
      var abDef = ABILITIES[st.ability];
      if (touchUI) {
        drawJoy();
        touchButton(tbtn.atk, st.attack === 'ranged' ? '💧' : '🐾', 0);
        touchButton(tbtn.ab, abIcon(st.ability), player.abCd / abDef.cd);
      } else {
        var txt = abIcon(st.ability) + ' ' + abDef.name + (player.abCd > 0 ? ' ' + Math.ceil(player.abCd) + 's' : ' [E]');
        g.font = '800 ' + Math.round(13 * u) + 'px ' + FONT;
        var tw = g.measureText(txt).width + 22;
        g.fillStyle = player.abCd > 0 ? 'rgba(10,14,30,0.55)' : 'rgba(124,58,237,0.75)';
        rr(W / 2 - tw / 2, H - 40 * u - pad, tw, 30 * u, 12);
        g.fill();
        g.textAlign = 'center';
        g.fillStyle = '#fff';
        g.fillText(txt, W / 2, H - 25 * u - pad);
      }
      if (player.faint > 0) {
        g.fillStyle = 'rgba(10,10,30,' + clamp(1.6 - player.faint, 0, 0.6) + ')';
        g.fillRect(0, 0, W, H);
      }
    }
    function fitText(s, maxW) {
      if (g.measureText(s).width <= maxW) return s;
      while (s.length > 4 && g.measureText(s + '…').width > maxW) s = s.slice(0, -1);
      return s + '…';
    }
    function abIcon(ab) { return ab === 'dash' ? '💨' : ab === 'nova' ? '✨' : ab === 'heal' ? '🍓' : '📣'; }
    function goalText() {
      var fusedAny = save.coll.some(function (c) { return c.h !== c.b; });
      if (!fusedAny) {
        var ready = SPECIES.filter(function (s) { return (save.dna[s.id] || 0) >= DNA_COST; });
        if (ready.length >= 2) return 'Goal: open the 🧬 Lab and fuse your first hybrid!';
        var best = SPECIES.slice().sort(function (p, q) { return (save.dna[q.id] || 0) - (save.dna[p.id] || 0); });
        var p1 = best[0], p2 = best[1];
        return 'Goal: collect ' + DNA_COST + ' DNA of two species — ' + p1.name + ' ' + Math.min(DNA_COST, save.dna[p1.id] || 0) + '/' + DNA_COST + ', ' + p2.name + ' ' + Math.min(DNA_COST, save.dna[p2.id] || 0) + '/' + DNA_COST;
      }
      for (var i = 0; i < BOSSES.length; i++) {
        if (!save.bosses[BOSSES[i].id]) return 'Goal: defeat ' + BOSSES[i].name + ' (Lv ' + BOSSES[i].lvl + ') — the ★ on the map' + (save.lvl < BOSSES[i].lvl - 2 ? ' · train first!' : '');
      }
      return 'All bosses beaten! Keep exploring and try every fusion (' + save.coll.length + ' made).';
    }
    function drawMinimap(u) {
      if (!miniCanvas) {
        miniCanvas = mkCanvas(WORLD, WORLD);
        var mx = miniCanvas.getContext('2d'), id = mx.createImageData(WORLD, WORLD);
        var cols = [hexRgb('#7cc455'), hexRgb('#3f8a3c'), hexRgb('#e8cf8a'), hexRgb('#eef3f8'), hexRgb('#3b82c4')];
        for (var i = 0; i < WORLD * WORLD; i++) {
          var c = obst[i] === 5 ? hexRgb('#4aa3df') : cols[biome[i]];
          id.data[i * 4] = c[0]; id.data[i * 4 + 1] = c[1]; id.data[i * 4 + 2] = c[2]; id.data[i * 4 + 3] = 255;
        }
        mx.putImageData(id, 0, 0);
      }
      var size = Math.round(clamp(Math.min(W, H) * 0.2, 80, 140));
      var mx0 = W - size - 10, my0 = touchUI ? 58 : H - size - 10;
      g.save();
      g.globalAlpha = 0.9;
      g.fillStyle = 'rgba(10,14,30,0.6)';
      g.fillRect(mx0 - 3, my0 - 3, size + 6, size + 6);
      g.imageSmoothingEnabled = false;
      g.drawImage(miniCanvas, mx0, my0, size, size);
      var k = size / WORLD;
      bossSpots().forEach(function (s) {
        g.fillStyle = save.bosses[s.b.id] ? '#94a3b8' : '#f59e0b';
        g.font = '900 ' + Math.round(12 * u) + 'px ' + FONT;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('★', mx0 + s.x * k, my0 + s.y * k);
      });
      g.fillStyle = '#ef5f75';
      g.fillRect(mx0 + C0 * k - 2, my0 + C0 * k - 2, 4, 4);
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(mx0 + player.x * k, my0 + player.y * k, 3, 0, TAU);
      g.fill();
      g.strokeStyle = '#111';
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }
    function drawJoy() {
      var jx = joy.id !== -1 ? joy.bx : joy.r * 1.4, jy = joy.id !== -1 ? joy.by : H - joy.r * 1.5;
      g.globalAlpha = joy.id !== -1 ? 0.85 : 0.45;
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(jx, jy, joy.r, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.arc(jx + joy.x * joy.r * 0.6, jy + joy.y * joy.r * 0.6, joy.r * 0.42, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }
    function touchButton(b, label, cdFrac) {
      g.fillStyle = 'rgba(10,14,30,0.5)';
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.fill();
      g.stroke();
      if (cdFrac > 0) {
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.beginPath();
        g.moveTo(b.x, b.y);
        g.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * cdFrac);
        g.fill();
      }
      g.font = Math.round(b.r * 0.8) + 'px ' + FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.fillText(label, b.x, b.y + 2);
    }

    /* ---------------- menus ---------------- */
    function closeOverlay() { if (overlay) overlay.close(); overlay = null; }
    function openOverlay(o) {
      closeOverlay();
      overlay = ui.overlay(root, o);
      overlay.panel.classList.add('bf-panel');
      if (H < 620 || W < 480) overlay.panel.classList.add('bf-compact');
      return overlay;
    }
    function previewCanvas(h, b, w, hh) {
      var c = mkCanvas(w * 2, hh * 2), x = c.getContext('2d');
      var art = creatureArt(designOf(h, b), 0, false);
      x.drawImage(art, 0, 0, w * 2, hh * 2);
      return c;
    }
    function updateButtons() {
      btnStats.innerHTML = '⭐' + (save.pts ? '<span class="bf-dot">' + save.pts + '</span>' : '');
      var canFuse = SPECIES.filter(function (s) { return (save.dna[s.id] || 0) >= DNA_COST; }).length >= 2;
      btnLab.innerHTML = '🧬 Lab' + (canFuse ? '<span class="bf-dot">!</span>' : '');
    }
    function pauseGame() { if (state === 'play') state = 'menu'; input.atk = false; releaseTouch(); }
    function resumeGame() { closeOverlay(); state = 'play'; ctx.focus(); }

    function showTitle() {
      state = 'title';
      if (save.started && save.coll.length) {
        var a = active();
        openOverlay({
          title: ctx.title || 'Wild Splice',
          text: 'Welcome back! Your ' + hybridName(a.h, a.b) + ' is Lv ' + save.lvl + ' with ' + save.coll.length + ' creature' + (save.coll.length > 1 ? 's' : '') + ' in the collection.',
          html: '<div class="bf-prev" id="bf-tp"></div>',
          buttons: [{ label: '▶ Continue', primary: true, onClick: resumeGame }, { label: 'How to play', onClick: function () { showHelp(showTitle); } }],
        });
        overlay.el.querySelector('#bf-tp').appendChild(previewCanvas(a.h, a.b, 120, 96));
        return;
      }
      // first run: pick a starter
      var starters = [SP.bunny.i, SP.frog.i, SP.hedgehog.i];
      var pick = starters[0];
      var html = '<p class="ig-sub" style="margin-bottom:6px">Pick a starter critter. Defeat wild animals for XP and DNA, then splice two species in the Fusion Lab.</p><div class="bf-grid" style="grid-template-columns:repeat(3,1fr)">' +
        starters.map(function (i, k) { var s = SPECIES[i], st = hybridStats(i, i); return '<button type="button" class="bf-sp' + (k === 0 ? ' on' : '') + '" data-s="' + i + '"><span></span>' + s.name + '<small>' + (st.attack === 'ranged' ? 'Ranged' : 'Melee') + ' · ' + ABILITIES[st.ability].name + '</small></button>'; }).join('') + '</div>';
      openOverlay({
        title: ctx.title || 'Wild Splice',
        html: html,
        buttons: [{ label: '▶ Start adventure', primary: true, onClick: function () { startNew(pick); } }],
      });
      Array.prototype.forEach.call(overlay.el.querySelectorAll('.bf-sp'), function (b) {
        var i = +b.getAttribute('data-s');
        b.querySelector('span').appendChild(previewCanvas(i, i, 64, 51));
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          pick = i;
          sfx('click');
          Array.prototype.forEach.call(overlay.el.querySelectorAll('.bf-sp'), function (o) { o.classList.toggle('on', o === b); });
        });
      });
    }
    function startNew(sp) {
      var seed = save.seed;
      save = freshSave();
      save.seed = seed;
      save.started = true;
      save.coll = [{ h: sp, b: sp }];
      save.active = 0;
      player.x = save.x;
      player.y = save.y;
      player.hp = curStats().maxHp;
      persist();
      updateButtons();
      closeOverlay();
      state = 'play';
      ctx.focus();
      toast('Explore! Bash wild animals for XP and DNA.');
    }
    function showHelp(back) {
      pauseGame();
      openOverlay({
        title: 'How to play',
        html: '<div style="text-align:left;font-size:14px;line-height:1.55">' +
          '<p><b>Move</b> with WASD / arrows or the left stick. <b>Attack</b> with a click toward the mouse, <span class="ig-kbd">Space</span>, or the paw button — keyboard and touch attacks auto-aim at the nearest creature.</p>' +
          '<p><b>Special ability</b> (from your creature’s body): <span class="ig-kbd">E</span> or the second button. Dash, Spike Burst, Snack Break or Big Roar.</p>' +
          '<p>Every defeated animal drops <b>1 DNA</b> of its species (bosses drop 5). With ' + DNA_COST + ' DNA of two species you can fuse them in the <b>🧬 Lab</b>: the hybrid takes the head and attack from one and the body, legs, tail and ability from the other.</p>' +
          '<p>Level-ups give <b>3 stat points</b> (⭐). Eat fruit and fish to heal; standing at the Lab heals you too. Wilder biomes have higher-level animals, and each biome hides a crowned <b>boss</b> (★ on the map).</p></div>',
        buttons: [{ label: 'Got it', primary: true, onClick: function () { if (back) back(); else resumeGame(); } }],
      });
    }
    function showPause() {
      pauseGame();
      openOverlay({
        title: 'Paused',
        text: 'Level ' + save.lvl + ' · ' + save.kills + ' animals bested · ' + Object.keys(save.bosses).length + '/4 bosses · progress autosaves.',
        buttons: [
          { label: 'Resume', primary: true, onClick: resumeGame },
          { label: 'How to play', onClick: function () { showHelp(showPause); } },
          { label: 'Reset progress', onClick: confirmReset },
        ],
      });
    }
    function confirmReset() {
      openOverlay({
        title: 'Reset everything?',
        text: 'This deletes your level, DNA, hybrids and boss trophies. It cannot be undone.',
        buttons: [
          { label: 'Keep playing', primary: true, onClick: showPause },
          { label: 'Yes, reset', onClick: function () { store.remove('save'); save = freshSave(); enemies.length = 0; foods.length = 0; shots.length = 0; player.x = save.x; player.y = save.y; genWorld(save.seed); miniCanvas = null; designCache = {}; updateButtons(); showTitle(); } },
        ],
      });
    }
    function showStats() {
      pauseGame();
      var st = curStats();
      var a = active(), hs = hybridStats(a.h, a.b);
      var html = '<div style="text-align:left">' +
        row('hp', '❤ Health', Math.round(st.maxHp), '+14 max HP') +
        row('atk', '⚔ Attack', st.atk.toFixed(1), '+2.4 damage') +
        row('spd', '👟 Speed', st.spd.toFixed(2), '+3.5% speed') +
        '<div class="bf-row"><span>Attack style</span><b>' + (hs.attack === 'ranged' ? 'Ranged spit' : 'Melee bite') + '</b></div>' +
        '<div class="bf-row"><span>Ability</span><b>' + abIcon(hs.ability) + ' ' + ABILITIES[hs.ability].name + '</b></div>' +
        '<div class="bf-row"><span>XP</span><b>' + save.xp + ' / ' + xpNeed(save.lvl) + '</b></div></div>';
      function row(k, label, val, hint) {
        return '<div class="bf-row"><span>' + label + ' <b>' + val + '</b><br><small style="color:var(--muted)">' + hint + ' (' + save.stat[k] + ' spent)</small></span><button type="button" class="ig-btn bf-plus" data-k="' + k + '"' + (save.pts ? '' : ' disabled') + '>+</button></div>';
      }
      openOverlay({ title: 'Stats · Lv ' + save.lvl, text: save.pts ? save.pts + ' point' + (save.pts > 1 ? 's' : '') + ' to spend' : 'Level up to earn stat points.', html: html, buttons: [{ label: 'Done', primary: true, onClick: resumeGame }] });
      Array.prototype.forEach.call(overlay.el.querySelectorAll('.bf-plus'), function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!save.pts) return;
          var k = b.getAttribute('data-k');
          var before = curStats().maxHp;
          save.pts--;
          save.stat[k]++;
          if (k === 'hp') player.hp += curStats().maxHp - before;
          sfx('buy');
          persist();
          updateButtons();
          showStats();
        });
      });
    }
    var labPick = { h: -1, b: -1, tab: 'fuse' };
    function showLab() {
      pauseGame();
      var html = '<div class="bf-tabs"><button type="button" data-t="fuse" class="' + (labPick.tab === 'fuse' ? 'on' : '') + '">Fuse</button><button type="button" data-t="coll" class="' + (labPick.tab === 'coll' ? 'on' : '') + '">Collection (' + save.coll.length + ')</button></div>';
      var buttons = [];
      if (labPick.tab === 'fuse') {
        html += '<div class="bf-h">1 · Head from (attack style)</div>' + spGrid('h') + '<div class="bf-h">2 · Body from (legs, tail, ability)</div>' + spGrid('b') + '<div class="bf-prev" id="bf-pv"></div>';
        var ok = labPick.h >= 0 && labPick.b >= 0 && labPick.h !== labPick.b;
        buttons.push({ label: '🧬 Fuse (' + DNA_COST + ' + ' + DNA_COST + ' DNA)', primary: true, onClick: doFuse });
        buttons.push({ label: 'Close', onClick: resumeGame });
        openOverlay({ title: 'Fusion Lab', html: html, buttons: buttons });
        var fb = overlay.el.querySelector('.ig-actions .ig-btn');
        if (!ok) fb.disabled = true;
        var pv = overlay.el.querySelector('#bf-pv');
        if (ok) {
          var hs = hybridStats(labPick.h, labPick.b);
          pv.appendChild(previewCanvas(labPick.h, labPick.b, 120, 96));
          var info = document.createElement('div');
          info.innerHTML = '<b>' + hybridName(labPick.h, labPick.b) + '</b><br>❤ ' + hs.hp + ' · ⚔ ' + hs.atk + ' · 👟 ' + hs.spd + '<br>' + (hs.attack === 'ranged' ? 'Ranged spit' : 'Melee bite') + ' · ' + abIcon(hs.ability) + ' ' + ABILITIES[hs.ability].name;
          pv.appendChild(info);
        } else {
          pv.innerHTML = '<div>Pick two <b>different</b> species with ' + DNA_COST + '+ DNA each. Defeat wild animals to collect DNA.</div>';
        }
        Array.prototype.forEach.call(overlay.el.querySelectorAll('.bf-sp'), function (b) {
          var i = +b.getAttribute('data-s'), slot = b.getAttribute('data-slot');
          b.querySelector('span').appendChild(previewCanvas(i, i, 64, 51));
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (b.classList.contains('lock')) { sfx('error'); return; }
            labPick[slot] = labPick[slot] === i ? -1 : i;
            sfx('click');
            showLab();
          });
        });
      } else {
        html += '<div class="bf-grid">' + save.coll.map(function (c, i) {
          var hs = hybridStats(c.h, c.b);
          return '<button type="button" class="bf-sp' + (i === save.active ? ' on' : '') + '" data-c="' + i + '"><span></span>' + hybridName(c.h, c.b) + '<small>' + (hs.attack === 'ranged' ? 'Ranged' : 'Melee') + ' · ' + abIcon(hs.ability) + '</small></button>';
        }).join('') + '</div><p class="cr-small" style="font-size:12.5px;color:var(--muted)">Tap a creature to make it your active critter. Your level and stat points carry over.</p>';
        openOverlay({ title: 'Fusion Lab', html: html, buttons: [{ label: 'Close', primary: true, onClick: resumeGame }] });
        Array.prototype.forEach.call(overlay.el.querySelectorAll('.bf-sp'), function (b) {
          var i = +b.getAttribute('data-c'), c = save.coll[i];
          b.querySelector('span').appendChild(previewCanvas(c.h, c.b, 64, 51));
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            var frac = player.hp / curStats().maxHp;
            save.active = i;
            player.hp = curStats().maxHp * frac;
            sfx('merge');
            persist();
            showLab();
          });
        });
      }
      Array.prototype.forEach.call(overlay.el.querySelectorAll('.bf-tabs button'), function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); labPick.tab = b.getAttribute('data-t'); sfx('click'); showLab(); });
      });
    }
    function spGrid(slot) {
      return '<div class="bf-grid">' + SPECIES.filter(function (s) { return (save.dna[s.id] || 0) > 0 || save.coll.some(function (c) { return c.h === s.i || c.b === s.i; }); }).map(function (s) {
        var n = save.dna[s.id] || 0, lock = n < DNA_COST, on = labPick[slot] === s.i;
        return '<button type="button" class="bf-sp' + (on ? ' on' : '') + (lock ? ' lock' : '') + '" data-s="' + s.i + '" data-slot="' + slot + '"><span></span>' + s.name + '<small>DNA ' + n + '/' + DNA_COST + '</small></button>';
      }).join('') + '</div>';
    }
    function doFuse() {
      var h = labPick.h, b = labPick.b;
      if (h < 0 || b < 0 || h === b) return;
      var hs = SPECIES[h], bs = SPECIES[b];
      if ((save.dna[hs.id] || 0) < DNA_COST || (save.dna[bs.id] || 0) < DNA_COST) return;
      save.dna[hs.id] -= DNA_COST;
      save.dna[bs.id] -= DNA_COST;
      var existing = -1;
      save.coll.forEach(function (c, i) { if (c.h === h && c.b === b) existing = i; });
      if (existing < 0) {
        save.coll.push({ h: h, b: b });
        existing = save.coll.length - 1;
      }
      save.fusions++;
      var frac = player.hp / curStats().maxHp;
      save.active = existing;
      player.hp = curStats().maxHp * Math.max(frac, 0.6);
      labPick.h = labPick.b = -1;
      persist();
      updateButtons();
      sfx('merge');
      sfx('levelup');
      for (var i = 0; i < 24; i++) part(player.x, player.y - 0.4, rnd(-4, 4), rnd(-5, 0), i % 2 ? '#22d3ee' : '#a78bfa', 0.9);
      openOverlay({
        title: '✨ ' + hybridName(h, b) + ' is born!',
        html: '<div class="bf-prev" id="bf-nb"></div>',
        text: 'Head of a ' + hs.name + ', body of a ' + bs.name + '. It is now your active critter.',
        buttons: [{ label: 'Let’s go!', primary: true, onClick: resumeGame }, { label: 'Back to Lab', onClick: showLab }],
      });
      overlay.el.querySelector('#bf-nb').appendChild(previewCanvas(h, b, 120, 96));
    }
    function showVictory() {
      pauseGame();
      openOverlay({
        title: '🏆 Champion of the Wilds!',
        text: 'All four bosses are beaten at Lv ' + save.lvl + ' with ' + save.coll.length + ' creatures fused. The island is yours to roam — keep splicing!',
        buttons: [{ label: 'Keep playing', primary: true, onClick: resumeGame }],
      });
      sfx('win');
    }

    /* ---------------- input ---------------- */
    function local(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function inB(p, b) { return Math.hypot(p[0] - b.x, p[1] - b.y) < b.r * 1.2; }
    function onDown(e) {
      ctx.focus();
      var isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (isTouch) touchUI = true;
      else if (e.pointerType === 'mouse') touchUI = false;
      if (state !== 'play') return;
      e.preventDefault();
      var p = local(e);
      if (!isTouch) {
        input.mx = p[0];
        input.my = p[1];
        input.aimMouse = true;
        if (e.button === 2) useAbility();
        else input.atk = true;
        return;
      }
      input.aimMouse = false;
      var role = 'none';
      if (inB(p, tbtn.atk)) { role = 'atk'; input.atk = true; }
      else if (inB(p, tbtn.ab)) { role = 'ab'; useAbility(); }
      else if (joy.id === -1) {
        role = 'joy';
        joy.id = e.pointerId;
        joy.bx = clamp(p[0], joy.r, W - joy.r);
        joy.by = clamp(p[1], joy.r, H - joy.r);
        joy.x = joy.y = 0;
      }
      pointers[e.pointerId] = role;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onMove(e) {
      var p = local(e);
      if (e.pointerType === 'mouse') { input.mx = p[0]; input.my = p[1]; return; }
      if (pointers[e.pointerId] === 'joy') {
        var dx = (p[0] - joy.bx) / joy.r, dy = (p[1] - joy.by) / joy.r, l = Math.hypot(dx, dy);
        if (l > 1) { dx /= l; dy /= l; }
        joy.x = dx;
        joy.y = dy;
      }
    }
    function onUp(e) {
      if (e.pointerType === 'mouse') { if (e.button !== 2) input.atk = false; return; }
      var role = pointers[e.pointerId];
      delete pointers[e.pointerId];
      if (role === 'joy') { joy.id = -1; joy.x = joy.y = 0; }
      else if (role === 'atk') {
        var still = false;
        for (var k in pointers) if (pointers[k] === 'atk') still = true;
        input.atk = still;
      }
    }
    function releaseTouch() { pointers = {}; joy.id = -1; joy.x = joy.y = 0; input.atk = false; }
    on(canvas, 'pointerdown', onDown);
    on(canvas, 'pointermove', onMove);
    on(canvas, 'pointerup', onUp);
    on(canvas, 'pointercancel', onUp);
    on(canvas, 'contextmenu', function (e) { e.preventDefault(); });
    on(window, 'pointerup', function (e) { if (e.pointerType === 'mouse') input.atk = false; });
    on(window, 'blur', function () { input.atk = false; });
    on(btnLab, 'click', function (e) { e.stopPropagation(); if (state === 'title') return; sfx('click'); showLab(); });
    on(btnStats, 'click', function (e) { e.stopPropagation(); if (state === 'title') return; sfx('click'); showStats(); });
    on(btnPause, 'click', function (e) { e.stopPropagation(); if (state === 'title') return; sfx('click'); showPause(); });
    [btnLab, btnStats, btnPause].forEach(function (b) { on(b, 'pointerdown', function (e) { e.stopPropagation(); }); });

    var escT = 0;
    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyJ', 'KeyK', 'KeyL', 'KeyF', 'KeyP', 'KeyT', 'Enter']);
    ctx.onKey(function (code, down, e) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          var b = overlay.el.querySelector('button:focus') || overlay.panel.querySelector('.ig-actions .ig-btn:not([disabled])');
          if (b && !b.disabled) { if (e) e.preventDefault(); b.click(); }
        } else if ((code === 'Escape' || code === 'KeyP') && state === 'menu') { resumeGame(); escT = performance.now(); }
        return;
      }
      if (state !== 'play') return;
      if ((code === 'Escape' || code === 'KeyP') && performance.now() - escT < 400) return;
      if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' || code.indexOf('Arrow') === 0) { input.aimMouse = false; touchUI = false; }
      if (code === 'KeyE' || code === 'KeyQ' || code === 'KeyK') useAbility();
      else if (code === 'KeyL' || code === 'KeyF') showLab();
      else if (code === 'KeyT') showStats();
      else if (code === 'KeyP' || code === 'Escape') showPause();
      else if (code === 'Space') input.aimMouse = false;
    });

    /* ---------------- boot ---------------- */
    genWorld(save.seed);
    if (save.coll.length) player.hp = curStats().maxHp;
    cam.x = player.x;
    cam.y = player.y;
    if (ctx.debug) {
      window.__beast = {
        get save() { return save; }, get player() { return player; }, get enemies() { return enemies; }, get state() { return state; },
        info: function () { return JSON.stringify({ s: state, lvl: save.lvl, xp: save.xp, hp: Math.round(player.hp), x: player.x.toFixed(1), y: player.y.toFixed(1), en: enemies.length, dna: save.dna, coll: save.coll.length, bosses: save.bosses, pts: save.pts }); },
        dna: function (id, n) { save.dna[id] = (save.dna[id] || 0) + n; updateButtons(); },
        xp: function (n) { gainXp(n); },
        tp: function (x, y) { player.x = x; player.y = y; cam.x = x; cam.y = y; },
        boss: function (i) { var s = bossSpots()[i]; player.x = s.x - 4; player.y = s.y; cam.x = player.x; cam.y = player.y; },
        hunt: function () { var b = null, bd = 99; enemies.forEach(function (e) { if (e.boss) return; var d = Math.hypot(e.x - player.x, e.y - player.y); if (d < bd) { bd = d; b = e; } }); if (b) { player.x = b.x - 0.9; player.y = b.y; player.dir = 1; } return b ? SPECIES[b.sp].name : 'none'; },
        nearest: function () { var b = null, bd = 99; enemies.forEach(function (e) { var d = Math.hypot(e.x - player.x, e.y - player.y); if (d < bd) { bd = d; b = e; } }); if (b) { player.x = b.x - 1; player.y = b.y; } return b ? SPECIES[b.sp].name + ' ' + bd.toFixed(1) : 'none'; },
        god: function () { player.invT = 9999; },
      };
    }
    var loop = IGAME.loop(function (dt) {
      update(dt);
      render();
    });
    ready = true;
    layout();
    updateButtons();
    showTitle();
    loop.start();

    return {
      pause: function () { if (state === 'play') showPause(); loop.stop(); persist(); },
      resume: function () { loop.start(); },
      destroy: function () {
        loop.stop();
        if (save.started) {
          if (player.faint <= 0) { save.x = player.x; save.y = player.y; }
          persist();
        }
        closeOverlay();
        for (var i = 0; i < listeners.length; i++) listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]);
        listeners.length = 0;
        view.destroy();
        [top, style].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        if (ctx.debug) try { delete window.__beast; } catch (e) {}
      },
    };
  });
})();
