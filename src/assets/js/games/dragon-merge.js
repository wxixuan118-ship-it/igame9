/*!
 * Dragonbloom Isle — igame9 original merge-3 island game (Merge Dragons style).
 * Drag items around a grid island; 3+ touching identical items merge into the next
 * tier (5 merge into 2). Life plants heal withered land and free the items trapped on it,
 * dragon eggs hatch into baby dragons that fly out to harvest nearby plants and stones.
 * Modes: six short goal levels + a persistent Home Island sandbox (saved in the browser).
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ */
  /* Items                                                               */
  /* ------------------------------------------------------------------ */
  var CH = {
    life: { names: ['Seedling', 'Sprig', 'Blossom', 'Lifebloom', 'Sun Tree', 'Elder Tree'], label: 'Life' },
    stone: { names: ['Pebble', 'Rock', 'Boulder', 'Ore Vein', 'Crystal', 'Gem Spire'], label: 'Stone' },
    coin: { names: ['Copper Coin', 'Silver Coin', 'Gold Coin', 'Coin Stack', 'Treasure Pile'], label: 'Coins', val: [1, 3, 10, 30, 100] },
    orb: { names: ['Spark', 'Glow Orb', 'Power Orb', 'Star Orb'], label: 'Dragon Power', val: [1, 4, 12, 40] },
    chest: { names: ['Wood Chest', 'Iron Chest', 'Gold Chest'], label: 'Chest' },
    egg: { names: ['Dragon Egg'], label: 'Egg' },
    dragon: { names: ['Hatchling', 'Whelp', 'Drake', 'Elder Dragon'], label: 'Dragon' },
  };
  var DRAGON_COL = [
    { body: '#5fd3a0', belly: '#d9fbe9', wing: '#2fa77a', horn: '#fff3c4' },
    { body: '#62b8f5', belly: '#dff1ff', wing: '#2f86cf', horn: '#ffe8a3' },
    { body: '#b28cf5', belly: '#efe5ff', wing: '#7f57d6', horn: '#ffd66b' },
    { body: '#f6c54a', belly: '#fff4cf', wing: '#e0902a', horn: '#ffffff' },
  ];
  var CHEST_LOOT = [
    [['life', 0, 5], ['stone', 0, 2], ['coin', 0, 2], ['orb', 0, 1]],
    [['life', 0, 3], ['life', 1, 3], ['stone', 1, 2], ['coin', 1, 2], ['egg', 0, 1], ['orb', 0, 1]],
    [['life', 1, 3], ['life', 2, 2], ['stone', 2, 1], ['coin', 2, 1], ['orb', 1, 1], ['egg', 0, 2]],
  ];
  var CHEST_COUNT = [3, 5, 7];
  var SHOP = [
    { chain: 'life', tier: 0, price: 5 },
    { chain: 'stone', tier: 0, price: 4 },
    { chain: 'chest', tier: 0, price: 18 },
    { chain: 'egg', tier: 0, price: 40 },
  ];
  // item letters used in the level maps below
  var LET = {
    s: ['life', 0], S: ['life', 1], b: ['life', 2], L: ['life', 3],
    p: ['stone', 0], r: ['stone', 1], B: ['stone', 2],
    c: ['coin', 0], C: ['coin', 1], o: ['orb', 0],
    w: ['chest', 0], i: ['chest', 1], g: ['chest', 2],
    e: ['egg', 0], h: ['dragon', 0], H: ['dragon', 1],
  };

  /* ------------------------------------------------------------------ */
  /* Levels: terrain '~' water, '.' healthy, 'x' withered (items on it   */
  /* start locked). Goals: heal | make{chain,tier} | hatch | collect |   */
  /* dragon{tier}.                                                       */
  /* ------------------------------------------------------------------ */
  var LEVELS = [
    {
      name: 'First Bloom',
      intro: 'Drag three Seedlings together to grow a Sprig. Merge Sprigs into a Blossom!',
      terr: ['~.....~', '.......', '.......', '.......', '.......', '~.....~'],
      items: ['---w---', '-s--s--', '--s--s-', '-s-S--s', '--s--s-', '-------'],
      goals: [{ type: 'make', chain: 'life', tier: 2, n: 1 }],
    },
    {
      name: 'Withered Meadow',
      intro: 'Merge Life plants on or beside withered tiles to heal them. Heal the whole island!',
      terr: ['~xxxxx~', 'xxxxxxx', 'xx...xx', 'xx...xx', 'xx...xx', 'xxxxxxx', '~xxxxx~'],
      items: ['--c-s--', '-s---w-', '--sss--', 'p-s-s-s', '--sss--', '-w---s-', '--s-c--'],
      goals: [{ type: 'heal' }],
    },
    {
      name: 'The First Egg',
      intro: 'Free the trapped egg, then merge three eggs to hatch a dragon. It will harvest flowers for Dragon Power.',
      terr: ['~~...~~', '~.....~', '.......', '...x...', '..xxx..', '~.xxx.~', '~~...~~'],
      items: ['--e-e--', '-s---s-', 's--S--b', '---e---', '--b-b--', '-o---o-', '--s-s--'],
      goals: [{ type: 'hatch', n: 1 }, { type: 'collect', res: 'power', n: 8 }],
    },
    {
      name: 'Stone Garden',
      intro: 'Stack stones into an Ore Vein and tap coins to collect them. Your hatchling harvests boulders for coins.',
      terr: ['~......~', '........', '........', '........', '........', '........', '~......~'],
      items: ['-p--c---', '--r--p-B', 'p--h--r-', '-c--p--c', 'B--r--C-', '-c-p--r-', '--C-i-C-'],
      goals: [{ type: 'make', chain: 'stone', tier: 3, n: 1 }, { type: 'collect', res: 'coins', n: 20 }],
    },
    {
      name: 'Cursed Grove',
      intro: 'A big curse! Heal every tile and grow a Sun Tree from three Lifeblooms.',
      terr: ['~xxxxxx~', 'xxxxxxxx', 'xxx..xxx', 'xx....xx', 'xx....xx', 'xxx..xxx', 'xxxxxxxx', '~xxxxxx~'],
      items: ['--s--w--', '-b----s-', '-s-SS-b-', '--sL-s-p', 'e-s-Ls--', '-c-sS---', '-s--b--i', '--c--s--'],
      goals: [{ type: 'heal' }, { type: 'make', chain: 'life', tier: 4, n: 1 }],
    },
    {
      name: "Dragon's Roost",
      intro: 'Raise a Drake: hatch eggs, merge three Hatchlings into a Whelp and three Whelps into a Drake.',
      terr: ['~~....~~', '~......~', '...xx...', '..xxxx..', '..xxxx..', '...xx...', '~......~', '~~....~~'],
      items: ['--H--H--', '-s----s-', 'e--e-b-e', '-h-Sb---', '---s--h-', 's--bS--s', '-s-o--s-', '--c--e--'],
      goals: [{ type: 'dragon', tier: 2 }, { type: 'heal' }],
    },
  ];
  var HOME = {
    name: 'Home Island',
    terr: ['~~xxxxx~~', '~xxxxxxx~', 'xxxx.xxxx', 'xxx...xxx', 'xxx...xxx', 'xxxx.xxxx', '~xxxxxxx~', '~~xxxxx~~'],
    items: ['--p-c-e--', '-s--w--r-', 'c-B-s-i--', '-p-s-s-s-', '-e-sSs-c-', '--w-e-p--', '-s--g--s-', '--c-r-b--'],
  };
  var GIFT_MS = 120000;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function nextOf(it) {
    if (it.chain === 'egg') return { chain: 'dragon', tier: 0 };
    if (it.tier + 1 < CH[it.chain].names.length) return { chain: it.chain, tier: it.tier + 1 };
    return null;
  }
  function itemName(it) { return CH[it.chain].names[it.tier]; }
  function same(a, b) { return a && b && a.chain === b.chain && a.tier === b.tier; }

  /* ------------------------------------------------------------------ */
  /* Procedural item art (0..100 box)                                    */
  /* ------------------------------------------------------------------ */
  var OL = 'rgba(30,24,40,0.85)';
  function B(g) { g.beginPath(); }
  function F(g, c) { g.fillStyle = c; g.fill(); g.stroke(); }
  function FO(g, c) { g.fillStyle = c; g.fill(); }
  function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
  function ell(g, x, y, rx, ry, rot) { rot = rot || 0; g.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
  function poly(g, p) { g.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  function star4(g, x, y, r) {
    var t = r * 0.3;
    g.moveTo(x, y - r); g.quadraticCurveTo(x + t, y - t, x + r, y); g.quadraticCurveTo(x + t, y + t, x, y + r);
    g.quadraticCurveTo(x - t, y + t, x - r, y); g.quadraticCurveTo(x - t, y - t, x, y - r); g.closePath();
  }
  function star5(g, x, y, r, r2) {
    for (var i = 0; i < 10; i++) {
      var an = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r2 : r;
      if (i) g.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); else g.moveTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad);
    }
    g.closePath();
  }
  function glowDisc(g, x, y, r, col) {
    var grd = g.createRadialGradient(x, y, 1, x, y, r);
    grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; B(g); circ(g, x, y, r); g.fill();
  }
  function leaf(g, x, y, len, rot, col) { B(g); ell(g, x, y, len, len * 0.42, rot); F(g, col); }
  function mound(g, w) { B(g); ell(g, 50, 78, w, w * 0.36); F(g, '#8b5e3c'); B(g); ell(g, 46, 75, w * 0.5, w * 0.12); FO(g, 'rgba(255,255,255,0.18)'); }
  function stem(g, x1, y1, x2, y2, w, col) {
    g.save(); g.lineCap = 'round';
    B(g); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = w + 3; g.strokeStyle = OL; g.stroke();
    g.lineWidth = w; g.strokeStyle = col; g.stroke(); g.restore();
  }
  function flower(g, x, y, r, petal, center) {
    for (var k = 0; k < 5; k++) { var an = -Math.PI / 2 + (k * TAU) / 5; B(g); circ(g, x + Math.cos(an) * r * 0.9, y + Math.sin(an) * r * 0.9, r * 0.72); F(g, petal); }
    B(g); circ(g, x, y, r * 0.55); F(g, center);
  }
  function rock(g, pts, col, hi) {
    B(g); poly(g, pts); F(g, col);
    if (hi) { B(g); poly(g, hi); FO(g, 'rgba(255,255,255,0.28)'); }
  }
  function coin(g, x, y, r, col, rim) {
    B(g); ell(g, x, y + r * 0.16, r, r * 0.9); F(g, rim);
    B(g); ell(g, x, y, r, r * 0.9); F(g, col);
    B(g); ell(g, x, y, r * 0.68, r * 0.6); g.lineWidth = 2; g.strokeStyle = rim; g.stroke(); g.lineWidth = 3;
    g.strokeStyle = OL;
    B(g); star5(g, x, y, r * 0.38, r * 0.17); FO(g, rim);
  }
  function chestArt(g, body, band, lid) {
    B(g); g.rect(16, 46, 68, 34); F(g, body);
    B(g); g.moveTo(16, 48); g.lineTo(16, 38); g.bezierCurveTo(16, 22, 84, 22, 84, 38); g.lineTo(84, 48); g.closePath(); F(g, lid);
    B(g); g.rect(27, 26, 7, 54); g.rect(66, 26, 7, 54); F(g, band);
    B(g); g.rect(43, 42, 14, 15); F(g, band);
    B(g); circ(g, 50, 49, 2.6); FO(g, OL);
  }

  var ART = {
    life: [
      function (g) { mound(g, 28); stem(g, 50, 76, 50, 52, 4, '#4caf50'); leaf(g, 40, 52, 11, -0.5, '#7bd36b'); leaf(g, 60, 49, 11, 0.5, '#9be36d'); },
      function (g) { mound(g, 26); stem(g, 50, 76, 50, 36, 4, '#43a047'); leaf(g, 40, 62, 11, -0.5, '#6ccf5a'); leaf(g, 60, 56, 11, 0.5, '#8be06a'); leaf(g, 41, 44, 10, -0.6, '#8be06a'); leaf(g, 59, 38, 10, 0.6, '#6ccf5a'); },
      function (g) { mound(g, 26); stem(g, 50, 76, 50, 42, 4, '#43a047'); leaf(g, 39, 64, 11, -0.5, '#6ccf5a'); leaf(g, 61, 58, 11, 0.5, '#8be06a'); flower(g, 50, 36, 12, '#ff8ac4', '#ffe066'); },
      function (g) {
        glowDisc(g, 50, 42, 40, 'rgba(255,170,230,0.75)');
        mound(g, 28); stem(g, 50, 78, 50, 46, 5, '#2e9e57'); leaf(g, 36, 64, 13, -0.5, '#4fd18b'); leaf(g, 64, 60, 13, 0.5, '#4fd18b');
        flower(g, 50, 36, 17, '#e255c8', '#fff3a0'); B(g); circ(g, 50, 36, 5); FO(g, '#ffffff');
        g.fillStyle = '#fff'; B(g); star4(g, 76, 20, 6); g.fill(); B(g); star4(g, 22, 30, 4); g.fill();
      },
      function (g) {
        mound(g, 30);
        B(g); g.moveTo(44, 78); g.lineTo(46, 48); g.lineTo(54, 48); g.lineTo(56, 78); g.closePath(); F(g, '#8d5a3b');
        B(g); circ(g, 50, 34, 22); circ(g, 32, 46, 15); circ(g, 68, 46, 15); g.save(); g.lineWidth = 6; g.stroke(); g.restore(); FO(g, '#4cbf56');
        B(g); circ(g, 42, 30, 6); FO(g, 'rgba(255,255,255,0.25)');
        [[36, 40], [58, 28], [64, 48], [46, 50], [30, 50]].forEach(function (p) { B(g); circ(g, p[0], p[1], 4.2); F(g, '#ffcc33'); });
      },
      function (g) {
        glowDisc(g, 50, 40, 46, 'rgba(120,255,220,0.6)');
        mound(g, 34);
        B(g); g.moveTo(42, 80); g.bezierCurveTo(44, 66, 40, 56, 44, 46); g.lineTo(56, 46); g.bezierCurveTo(60, 56, 56, 66, 58, 80); g.closePath(); F(g, '#7a4a2e');
        B(g); circ(g, 50, 28, 22); circ(g, 28, 40, 17); circ(g, 72, 40, 17); circ(g, 40, 50, 14); circ(g, 62, 50, 14);
        g.save(); g.lineWidth = 6; g.stroke(); g.restore(); FO(g, '#2fbf8a');
        [[50, 20], [32, 38], [70, 36], [46, 46], [60, 30], [38, 26]].forEach(function (p) { B(g); star4(g, p[0], p[1], 5); FO(g, '#fff6b0'); });
      },
    ],
    stone: [
      function (g) { rock(g, [20, 72, 26, 56, 42, 52, 48, 70], '#a3a8b4'); rock(g, [44, 76, 50, 52, 68, 50, 78, 74], '#b7bcc7', [50, 54, 66, 52, 62, 62]); rock(g, [30, 84, 34, 72, 52, 74, 52, 86], '#8f94a1'); },
      function (g) { rock(g, [22, 78, 30, 54, 48, 42, 66, 46, 78, 62, 76, 80], '#9aa0ad', [48, 42, 66, 46, 58, 58, 40, 54]); },
      function (g) {
        rock(g, [14, 80, 20, 52, 40, 30, 64, 30, 82, 48, 86, 80], '#8a909e', [40, 30, 64, 30, 56, 46, 34, 46]);
        B(g); ell(g, 34, 34, 10, 5, -0.4); ell(g, 70, 42, 8, 4, 0.5); F(g, '#6abf5a');
      },
      function (g) {
        rock(g, [14, 80, 20, 50, 40, 30, 64, 30, 84, 50, 86, 80], '#5e5a6a', [40, 30, 64, 30, 56, 44, 36, 44]);
        g.save(); g.strokeStyle = '#ffb547'; g.lineWidth = 4; g.lineCap = 'round';
        B(g); g.moveTo(28, 60); g.lineTo(40, 52); g.lineTo(52, 62); g.lineTo(66, 50); g.moveTo(40, 72); g.lineTo(56, 70); g.stroke(); g.restore();
        [[44, 50], [62, 66], [30, 70]].forEach(function (p) { B(g); circ(g, p[0], p[1], 3); FO(g, '#ffd36b'); });
      },
      function (g) {
        rock(g, [16, 84, 22, 70, 78, 70, 84, 84], '#7d8392');
        rock(g, [30, 72, 26, 44, 36, 34, 44, 44, 42, 72], '#7fdcff', [36, 34, 44, 44, 38, 60]);
        rock(g, [44, 72, 42, 30, 52, 14, 62, 30, 60, 72], '#4fc3f7', [52, 14, 62, 30, 54, 50]);
        rock(g, [60, 72, 62, 46, 72, 38, 76, 50, 72, 72], '#9ae7ff');
      },
      function (g) {
        glowDisc(g, 50, 44, 44, 'rgba(200,140,255,0.6)');
        rock(g, [18, 86, 24, 72, 76, 72, 82, 86], '#6d6880');
        rock(g, [26, 74, 22, 50, 32, 40, 40, 52, 38, 74], '#c58bff');
        rock(g, [40, 74, 38, 24, 50, 6, 62, 24, 60, 74], '#a55cf2', [50, 6, 62, 24, 52, 52]);
        rock(g, [60, 74, 62, 46, 72, 36, 78, 50, 74, 74], '#d8a8ff');
        g.fillStyle = '#fff'; B(g); star4(g, 72, 18, 6); g.fill(); B(g); star4(g, 26, 30, 4); g.fill();
      },
    ],
    coin: [
      function (g) { coin(g, 50, 56, 22, '#e08a4a', '#a55a26'); },
      function (g) { coin(g, 50, 56, 23, '#e6ebf2', '#9aa4b4'); },
      function (g) { glowDisc(g, 50, 54, 34, 'rgba(255,220,90,0.5)'); coin(g, 50, 56, 25, '#ffd23f', '#d4961c'); },
      function (g) { coin(g, 40, 70, 20, '#ffd23f', '#d4961c'); coin(g, 60, 62, 20, '#ffd23f', '#d4961c'); coin(g, 48, 46, 21, '#ffe066', '#d4961c'); },
      function (g) {
        glowDisc(g, 50, 56, 44, 'rgba(255,220,90,0.55)');
        B(g); g.moveTo(14, 82); g.bezierCurveTo(22, 46, 78, 46, 86, 82); g.closePath(); F(g, '#f5c02e');
        [[30, 70], [50, 62], [70, 70], [40, 54], [60, 52], [50, 76]].forEach(function (p) { coin(g, p[0], p[1], 9, '#ffe066', '#d4961c'); });
        B(g); poly(g, [50, 28, 60, 40, 50, 50, 40, 40]); F(g, '#ff5fa2');
      },
    ],
    orb: [
      function (g) { glowDisc(g, 50, 52, 30, 'rgba(255,230,90,0.8)'); B(g); star4(g, 50, 52, 20); F(g, '#ffe14d'); B(g); star4(g, 50, 52, 7); FO(g, '#fff'); },
      function (g) { glowDisc(g, 50, 52, 36, 'rgba(90,230,255,0.7)'); B(g); circ(g, 50, 52, 20); F(g, '#46d6f5'); B(g); ell(g, 43, 45, 7, 4, -0.6); FO(g, 'rgba(255,255,255,0.8)'); },
      function (g) {
        glowDisc(g, 50, 52, 40, 'rgba(190,120,255,0.75)');
        B(g); circ(g, 50, 52, 23); F(g, '#9b5cf6');
        B(g); star5(g, 50, 53, 12, 5); FO(g, '#f3e8ff');
        g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.5; B(g); g.ellipse(50, 52, 32, 9, -0.35, 0, TAU); g.stroke(); g.restore();
      },
      function (g) {
        glowDisc(g, 50, 50, 46, 'rgba(255,210,80,0.85)');
        for (var k = 0; k < 8; k++) { var an = (k * TAU) / 8; B(g); poly(g, [50 + Math.cos(an - 0.12) * 26, 50 + Math.sin(an - 0.12) * 26, 50 + Math.cos(an) * 44, 50 + Math.sin(an) * 44, 50 + Math.cos(an + 0.12) * 26, 50 + Math.sin(an + 0.12) * 26]); FO(g, '#ffd23f'); }
        B(g); circ(g, 50, 50, 25); F(g, '#ffb52e');
        B(g); star5(g, 50, 52, 15, 6.5); FO(g, '#fff7d0');
      },
    ],
    chest: [
      function (g) { chestArt(g, '#a0643a', '#6e3f1f', '#bd7a48'); },
      function (g) { chestArt(g, '#6f7f96', '#3c475a', '#8797ad'); },
      function (g) { glowDisc(g, 50, 52, 46, 'rgba(255,215,90,0.55)'); chestArt(g, '#e3a92a', '#a8681a', '#f5c44a'); B(g); circ(g, 30, 64, 3.5); circ(g, 70, 64, 3.5); FO(g, '#ff5fa2'); },
    ],
    egg: [
      function (g) {
        B(g); ell(g, 50, 80, 22, 6); FO(g, 'rgba(0,0,0,0.18)');
        B(g); g.moveTo(50, 18); g.bezierCurveTo(70, 18, 78, 50, 76, 62); g.bezierCurveTo(74, 80, 62, 84, 50, 84); g.bezierCurveTo(38, 84, 26, 80, 24, 62); g.bezierCurveTo(22, 50, 30, 18, 50, 18); F(g, '#8fe3c4');
        [[40, 40, 6], [60, 52, 7], [44, 66, 5], [62, 32, 4], [34, 56, 3.5]].forEach(function (p) { B(g); circ(g, p[0], p[1], p[2]); FO(g, '#3fae86'); });
        B(g); ell(g, 38, 34, 4, 9, 0.4); FO(g, 'rgba(255,255,255,0.6)');
      },
    ],
  };

  // Cute procedural dragon, drawn every frame (wings flap, eyes blink).
  function drawDragon(g, x, y, s, tier, t, face, harvesting) {
    var col = DRAGON_COL[tier];
    var sc = s * (0.62 + tier * 0.08) / 100;
    g.save();
    g.translate(x, y);
    g.scale(sc * face, sc);
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = OL;
    if (tier === 3) glowDisc(g, 0, 0, 62, 'rgba(255,220,120,0.45)');
    var flap = Math.sin(t * (harvesting ? 18 : 11)) * 0.45;
    // wings
    for (var side = -1; side <= 1; side += 2) {
      g.save();
      g.translate(side * 14, -6);
      g.rotate(side * (0.35 + flap));
      g.scale(side, 1);
      B(g); g.moveTo(0, 0); g.bezierCurveTo(8, -30, 30, -40, 44, -34); g.lineTo(36, -22); g.lineTo(42, -12); g.lineTo(30, -6); g.lineTo(32, 4); g.bezierCurveTo(20, 2, 10, 6, 0, 0); F(g, col.wing);
      g.restore();
    }
    // tail
    g.save(); g.lineCap = 'round';
    B(g); g.moveTo(-14, 22); g.quadraticCurveTo(-40, 30, -38, 8); g.lineWidth = 12; g.strokeStyle = OL; g.stroke(); g.lineWidth = 7; g.strokeStyle = col.body; g.stroke();
    g.restore();
    B(g); poly(g, [-38, 2, -46, 4, -38, 12]); F(g, col.horn);
    // body
    B(g); ell(g, 0, 18, 24, 20); F(g, col.body);
    B(g); ell(g, 2, 22, 13, 13); FO(g, col.belly);
    // feet
    B(g); ell(g, -11, 37, 7, 4); ell(g, 11, 37, 7, 4); F(g, col.body);
    // spikes for older dragons
    if (tier >= 1) { B(g); poly(g, [-6, -2, -2, -10, 2, -2]); poly(g, [-16, 4, -14, -4, -9, 2]); F(g, col.horn); }
    // head
    B(g); circ(g, 4, -14, 21); F(g, col.body);
    // horns
    B(g); poly(g, [-10, -28, -16, -46, -2, -32]); poly(g, [14, -32, 22, -48, 22, -28]); F(g, col.horn);
    if (tier === 3) { B(g); star5(g, 4, -40, 7, 3); F(g, '#ffffff'); }
    // snout
    B(g); ell(g, 14, -6, 11, 8); FO(g, col.belly);
    B(g); circ(g, 18, -8, 1.6); circ(g, 12, -8, 1.6); FO(g, OL);
    // eyes (blink every few seconds)
    var blink = (t % 3.7) < 0.12 ? 0.15 : 1;
    B(g); ell(g, -3, -18, 6, 7 * blink); ell(g, 13, -19, 5.5, 6.5 * blink); F(g, '#ffffff');
    if (blink > 0.5) {
      B(g); circ(g, -1, -17, 3.4); circ(g, 14, -18, 3.2); FO(g, '#24203a');
      B(g); circ(g, 0, -19, 1.3); circ(g, 15, -20, 1.2); FO(g, '#ffffff');
    }
    B(g); ell(g, -10, -8, 4, 2.4); ell(g, 22, -12, 3.5, 2.2); FO(g, 'rgba(255,120,150,0.5)');
    g.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  var CSS =
    '.dm-box{position:absolute;z-index:5;display:flex;gap:6px;align-items:center;pointer-events:none}' +
    '.dm-box>*{pointer-events:auto}' +
    '.dm-pill{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px 0 8px;border-radius:999px;background:rgba(6,10,24,.72);border:1px solid rgba(255,255,255,.14);color:#fff;font:800 14px var(--font,system-ui);white-space:nowrap}' +
    '.dm-pill svg{width:20px;height:20px;flex:none}' +
    '.dm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;min-width:38px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(6,10,24,.74);color:#fff;font:800 13px var(--font,system-ui);cursor:pointer;touch-action:manipulation;white-space:nowrap}' +
    '.dm-btn:hover{background:rgba(36,48,96,.92)}.dm-btn:focus-visible{outline:2px solid #2dd4f0}' +
    '.dm-btn svg{width:18px;height:18px;flex:none}' +
    '.dm-btn.gold{border-color:rgba(251,191,36,.55);color:#fde68a}' +
    '.dm-goals{display:flex;flex-wrap:wrap;gap:5px;pointer-events:none}' +
    '.dm-goal{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:10px;background:rgba(6,10,24,.72);border:1px solid rgba(255,255,255,.12);color:#e9ecff;font:700 12px var(--font,system-ui);white-space:nowrap}' +
    '.dm-goal.done{border-color:rgba(52,211,153,.6);color:#a7f3d0}' +
    '.dm-goal b{color:#fff}' +
    '.dm-side{position:absolute;z-index:5;display:flex;flex-direction:column;gap:10px;padding:12px;background:linear-gradient(180deg,rgba(10,16,38,.92),rgba(8,12,28,.95));border-left:1px solid rgba(255,255,255,.1);color:#e9ecff;font:600 13px var(--font,system-ui);overflow:auto}' +
    '.dm-side h3{margin:0;font:900 18px/1.15 var(--font,system-ui);color:#fff}' +
    '.dm-side .dm-goals{flex-direction:column}' +
    '.dm-side .dm-goal{white-space:normal}' +
    '.dm-info{color:#c4c8ea;font:600 12.5px/1.35 var(--font,system-ui)}' +
    '.dm-info b{color:#fff}' +
    '.dm-bar{position:absolute;z-index:5;display:flex;gap:6px;align-items:center}' +
    '.dm-bar .dm-info{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.dm-row{display:flex;gap:6px;flex-wrap:wrap}' +
    '.dm-shop{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:6px}' +
    '.dm-shop button{display:flex;align-items:center;gap:8px;padding:8px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:700 13px var(--font,system-ui);cursor:pointer;text-align:left}' +
    '.dm-shop button:disabled{opacity:.45;cursor:not-allowed}' +
    '.dm-shop canvas{width:40px;height:40px;flex:none}' +
    '.dm-shop small{display:block;color:#fde68a;font-weight:800}' +
    '.dm-levels{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:6px}' +
    '.dm-levels button{padding:10px 8px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:800 13px var(--font,system-ui);cursor:pointer}' +
    '.dm-levels button small{display:block;font-weight:600;color:#a7f3d0;margin-top:2px}' +
    '.dm-levels button:disabled{opacity:.4;cursor:not-allowed}' +
    '.dm-levels .home{grid-column:1/-1;background:linear-gradient(135deg,rgba(52,211,153,.25),rgba(45,212,240,.18));border-color:rgba(52,211,153,.5)}' +
    '.dm-tip{margin-top:auto;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#aab0d8;font:600 12px/1.45 var(--font,system-ui)}.dm-tip b{color:#fde68a}' +
    '.dm-help{text-align:left;margin:0;padding-left:18px}.dm-help li{margin:5px 0}';

  var ICON = {
    coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="9" fill="#d4961c"/><circle cx="12" cy="12" r="9" fill="#ffd23f"/><path d="M12 7l1.4 3 3.1.3-2.4 2 .8 3.1L12 13.8 9.1 15.4l.8-3.1-2.4-2 3.1-.3z" fill="#d4961c"/></svg>',
    power: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#9b5cf6"/><path d="M13 3L6 13h5l-1 8 7-10h-5z" fill="#fff7d0"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    hint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-1.5 11h-13zM8 9V7a4 4 0 0 1 8 0v2"/></svg>',
  };

  IGAME.register('dragon-merge', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;
    var TITLE = ctx.title || 'Dragonbloom Isle';

    /* ---------- persistent data ---------- */
    var wallet = store.get('wallet', { coins: 20, power: 0 });
    var lvSave = store.get('levels', { done: {}, best: {} });
    function saveMeta() {
      store.set('wallet', wallet);
      store.set('levels', lvSave);
    }

    /* ---------- board state ---------- */
    var mode = 'none'; // 'level' | 'home'
    var levelIdx = 0;
    var COLS = 7, ROWS = 7;
    var terr = []; // 0 water, 1 healthy, 2 withered
    var items = []; // item objects or null
    var deadStart = 0;
    var goals = [];
    var made = {};
    var collected = { coins: 0, power: 0 };
    var moves = 0;
    var levelTime = 0;
    var won = false;
    var homeHealedCelebrated = false;
    var giftAt = 0;
    var giftsWaiting = 0;
    var uid = 1;

    /* ---------- view state ---------- */
    var W = 0, H = 0, portrait = false;
    var C = 40, BX = 0, BY = 0; // cell size and board origin
    var nowT = 0;
    var paused = false;
    var overlay = null;
    var started = false;
    var drag = null;
    var selected = -1;
    var hintCells = null, hintUntil = 0;
    var lastAction = 0;
    var particles = [];
    var floats = [];
    var ghosts = []; // merge fly animations
    var shake = 0;
    var spriteCache = {};
    var terrCanvas = document.createElement('canvas');
    var terrDirty = true;
    var kb = { on: false, c: 0, r: 0, hold: -1 };
    var timers = [];
    var saveTimer = 0;

    function later(fn, ms) {
      var id = setTimeout(function () { timers.splice(timers.indexOf(id), 1); fn(); }, ms);
      timers.push(id);
    }

    /* ---------- DOM ---------- */
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var view = IGAME.createCanvas(root, { onResize: layout });
    var g = view.ctx;

    var resBox = ui.el('div', 'dm-box');
    var coinPill = ui.el('div', 'dm-pill', ICON.coin + '<span>0</span>');
    var powerPill = ui.el('div', 'dm-pill', ICON.power + '<span>0</span>');
    coinPill.title = 'Coins';
    powerPill.title = 'Dragon Power';
    var pauseBtn = ui.el('button', 'dm-btn', ICON.pause);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.title = 'Pause (P)';
    resBox.appendChild(coinPill);
    resBox.appendChild(powerPill);
    resBox.appendChild(pauseBtn);
    var goalsEl = ui.el('div', 'dm-goals');
    var side = ui.el('div', 'dm-side');
    var sideTitle = ui.el('h3', '', '');
    var infoEl = ui.el('div', 'dm-info', '');
    var hintBtn = ui.el('button', 'dm-btn gold', ICON.hint + '<span>Hint</span>');
    var shopBtn = ui.el('button', 'dm-btn', ICON.shop + '<span>Shop</span>');
    hintBtn.type = shopBtn.type = 'button';
    hintBtn.title = 'Hint (H)';
    shopBtn.title = 'Shop (S)';
    var toolRow = ui.el('div', 'dm-row');
    toolRow.appendChild(hintBtn);
    toolRow.appendChild(shopBtn);
    var bar = ui.el('div', 'dm-bar');
    var tipEl = ui.el('div', 'dm-tip', '');
    var TIPS = [
      '<b>5 make 2:</b> wait for a fifth identical item before merging to get a bonus copy.',
      '<b>Heal smart:</b> Life plants can be planted on withered tiles that touch healthy land.',
      '<b>Bigger heals:</b> higher-level Life merges heal more tiles at once.',
      '<b>Dragons</b> harvest plants (Sprig and up) and big stones within a few tiles.',
      '<b>Tap Sun Trees</b> for free Seedlings, and Gem Spires for gold coins.',
      '<b>Stuck?</b> Press Hint — if nothing can merge, you get free Seedlings.',
    ];
    var tipIdx = 0;
    root.appendChild(resBox);
    root.appendChild(side);
    root.appendChild(bar);
    root.appendChild(goalsEl);

    /* ---------- layout ---------- */
    function layout(w, h) {
      if (!side || !view) return; // first call happens inside createCanvas()
      W = w;
      H = h;
      portrait = w < h * 1.15;
      var pad = clamp(Math.round(Math.min(w, h) * 0.02), 8, 14);
      if (!portrait) {
        var sw = clamp(Math.round(w * 0.25), 200, 300);
        side.style.display = 'flex';
        side.style.left = w - sw + 'px';
        side.style.top = '0px';
        side.style.width = sw + 'px';
        side.style.height = h + 'px';
        bar.style.display = 'none';
        // move shared widgets into the side panel
        side.appendChild(resBox);
        resBox.style.position = 'static';
        resBox.style.flexWrap = 'wrap';
        side.insertBefore(sideTitle, resBox);
        side.appendChild(goalsEl);
        goalsEl.style.position = 'static';
        side.appendChild(infoEl);
        side.appendChild(toolRow);
        side.appendChild(tipEl);
        var aw = w - sw - pad * 2, ah = h - pad * 2;
        C = Math.floor(Math.min(aw / COLS, ah / ROWS));
        BX = Math.round(pad + (aw - C * COLS) / 2);
        BY = Math.round(pad + (ah - C * ROWS) / 2);
      } else {
        side.style.display = 'none';
        bar.style.display = 'flex';
        root.appendChild(resBox);
        resBox.style.position = 'absolute';
        resBox.style.flexWrap = 'nowrap';
        resBox.style.left = pad + 'px';
        resBox.style.top = pad + 'px';
        root.appendChild(goalsEl);
        goalsEl.style.position = 'absolute';
        goalsEl.style.left = pad + 'px';
        goalsEl.style.right = pad + 'px';
        goalsEl.style.top = pad + 40 + 'px';
        goalsEl.style.zIndex = '5';
        bar.appendChild(infoEl);
        bar.appendChild(toolRow);
        bar.style.left = pad + 'px';
        bar.style.right = pad + 'px';
        bar.style.bottom = pad + 'px';
        var top = pad + 40 + (goals.length ? 30 : 0) + 4;
        var bottom = pad + 46;
        var aw2 = w - pad * 2, ah2 = h - top - bottom;
        C = Math.floor(Math.min(aw2 / COLS, ah2 / ROWS));
        BX = Math.round(pad + (aw2 - C * COLS) / 2);
        BY = Math.round(top + (ah2 - C * ROWS) / 2);
      }
      C = clamp(C, 16, portrait ? 96 : clamp(Math.round(Math.min(w, h) / 7.2), 88, 120));
      if (!portrait) { BX = Math.round(pad + (w - clamp(Math.round(w * 0.25), 200, 300) - pad * 2 - C * COLS) / 2); BY = Math.round((h - C * ROWS) / 2); }
      else BY = Math.round(BY + 0);
      spriteCache = {};
      terrDirty = true;
      drawOcean();
    }

    var oceanCanvas = document.createElement('canvas');
    function drawOcean() {
      var dpr = view.dpr;
      oceanCanvas.width = Math.max(1, Math.round(W * dpr));
      oceanCanvas.height = Math.max(1, Math.round(H * dpr));
      var o = oceanCanvas.getContext('2d');
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      var grd = o.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#3fa3e0');
      grd.addColorStop(1, '#1d5fae');
      o.fillStyle = grd;
      o.fillRect(0, 0, W, H);
      var rg = o.createRadialGradient(BX + (C * COLS) / 2, BY + (C * ROWS) / 2, C, BX + (C * COLS) / 2, BY + (C * ROWS) / 2, C * Math.max(COLS, ROWS) * 0.9);
      rg.addColorStop(0, 'rgba(140,230,255,0.45)');
      rg.addColorStop(1, 'rgba(140,230,255,0)');
      o.fillStyle = rg;
      o.fillRect(0, 0, W, H);
    }

    /* ---------- terrain rendering (cached until it changes) ---------- */
    function idx(c, r) { return r * COLS + c; }
    function inB(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; }
    function land(c, r) { return inB(c, r) && terr[idx(c, r)] > 0; }
    function cx(i) { return BX + (i % COLS) * C + C / 2; }
    function cy(i) { return BY + Math.floor(i / COLS) * C + C / 2; }

    function drawTerrain() {
      terrDirty = false;
      var dpr = view.dpr;
      var bw = COLS * C, bh = ROWS * C;
      var m = Math.ceil(C * 0.4);
      terrCanvas.width = Math.round((bw + m * 2) * dpr);
      terrCanvas.height = Math.round((bh + m * 2) * dpr);
      var t = terrCanvas.getContext('2d');
      t.setTransform(dpr, 0, 0, dpr, 0, 0);
      t.translate(m, m);
      var r, c, i, x, y;
      // foam + cliff shadow under the island
      var hal = C * 0.22;
      t.fillStyle = 'rgba(190,240,255,0.32)';
      t.beginPath();
      for (i = 0; i < terr.length; i++) if (terr[i]) { x = (i % COLS) * C; y = Math.floor(i / COLS) * C; if (t.roundRect) t.roundRect(x - hal, y - hal * 0.6, C + hal * 2, C + hal * 2.2, C * 0.35); else t.rect(x - hal, y - hal * 0.6, C + hal * 2, C + hal * 2.2); }
      t.fill();
      for (i = 0; i < terr.length; i++) {
        if (!terr[i]) continue;
        c = i % COLS; r = Math.floor(i / COLS); x = c * C; y = r * C;
        if (!land(c, r + 1)) { t.fillStyle = '#9a6b3e'; t.fillRect(x, y + C * 0.5, C, C * 0.72); t.fillStyle = '#7d5430'; t.fillRect(x, y + C * 1.02, C, C * 0.2); }
      }
      for (i = 0; i < terr.length; i++) {
        if (!terr[i]) continue;
        c = i % COLS; r = Math.floor(i / COLS); x = c * C; y = r * C;
        var dead = terr[i] === 2, alt = (c + r) % 2;
        t.fillStyle = dead ? (alt ? '#5e4c69' : '#574663') : alt ? '#6fc56b' : '#67bc63';
        t.fillRect(x, y, C + 0.5, C + 0.5);
        if (dead) {
          t.strokeStyle = 'rgba(30,18,40,0.55)';
          t.lineWidth = Math.max(1, C * 0.03);
          t.beginPath();
          var sd = (c * 7 + r * 13) % 5;
          t.moveTo(x + C * (0.2 + sd * 0.08), y + C * 0.3); t.lineTo(x + C * 0.45, y + C * 0.5); t.lineTo(x + C * 0.4, y + C * 0.75);
          t.moveTo(x + C * 0.45, y + C * 0.5); t.lineTo(x + C * 0.75, y + C * (0.45 + sd * 0.05));
          t.stroke();
          t.fillStyle = 'rgba(160,120,190,0.35)';
          t.fillRect(x + C * 0.68, y + C * 0.2, C * 0.06, C * 0.06);
        } else {
          t.fillStyle = 'rgba(255,255,255,0.12)';
          var s2 = (c * 5 + r * 3) % 4;
          t.fillRect(x + C * (0.2 + s2 * 0.12), y + C * 0.24, C * 0.05, C * 0.12);
          t.fillRect(x + C * (0.62 - s2 * 0.06), y + C * 0.66, C * 0.05, C * 0.12);
        }
      }
      // sandy rim along every edge facing water
      t.fillStyle = '#f2d59a';
      var e = Math.max(2, C * 0.07);
      for (i = 0; i < terr.length; i++) {
        if (!terr[i]) continue;
        c = i % COLS; r = Math.floor(i / COLS); x = c * C; y = r * C;
        if (!land(c, r - 1)) t.fillRect(x, y, C, e);
        if (!land(c - 1, r)) t.fillRect(x, y, e, C);
        if (!land(c + 1, r)) t.fillRect(x + C - e, y, e, C);
        if (!land(c, r + 1)) t.fillRect(x, y + C - e, C, e);
      }
      // soft border between healthy and withered land
      t.strokeStyle = 'rgba(200,170,255,0.35)';
      t.lineWidth = Math.max(1, C * 0.04);
      t.beginPath();
      for (i = 0; i < terr.length; i++) {
        if (terr[i] !== 2) continue;
        c = i % COLS; r = Math.floor(i / COLS); x = c * C; y = r * C;
        if (land(c, r - 1) && terr[idx(c, r - 1)] === 1) { t.moveTo(x, y); t.lineTo(x + C, y); }
        if (land(c, r + 1) && terr[idx(c, r + 1)] === 1) { t.moveTo(x, y + C); t.lineTo(x + C, y + C); }
        if (land(c - 1, r) && terr[idx(c - 1, r)] === 1) { t.moveTo(x, y); t.lineTo(x, y + C); }
        if (land(c + 1, r) && terr[idx(c + 1, r)] === 1) { t.moveTo(x + C, y); t.lineTo(x + C, y + C); }
      }
      t.stroke();
      terrCanvas._m = m;
    }

    /* ---------- item sprites ---------- */
    function sprite(it) {
      var key = it.chain + it.tier + (it.locked ? 'L' : '');
      var sp = spriteCache[key];
      if (sp) return sp;
      var px = Math.max(8, Math.round(C * view.dpr));
      sp = document.createElement('canvas');
      sp.width = sp.height = px;
      var s = sp.getContext('2d');
      s.scale(px / 100, px / 100);
      s.lineJoin = 'round';
      s.lineCap = 'round';
      s.lineWidth = 3;
      s.strokeStyle = OL;
      if (it.chain === 'dragon') {
        drawDragon(s, 50, 56, 100, it.tier, 0.3, 1, false);
      } else {
        s.translate(50, 50); s.scale(0.92, 0.92); s.translate(-50, -50);
        ART[it.chain][it.tier](s);
      }
      if (it.locked) {
        // desaturate + thorny vines
        s.setTransform(1, 0, 0, 1, 0, 0);
        s.globalCompositeOperation = 'source-atop';
        s.fillStyle = 'rgba(70,50,90,0.62)';
        s.fillRect(0, 0, px, px);
        s.globalCompositeOperation = 'source-over';
        s.scale(px / 100, px / 100);
        s.strokeStyle = '#2b1d36';
        s.lineWidth = 4;
        s.beginPath(); s.moveTo(14, 30); s.bezierCurveTo(40, 50, 60, 20, 86, 44); s.moveTo(18, 74); s.bezierCurveTo(42, 56, 62, 84, 84, 66); s.stroke();
        s.fillStyle = '#2b1d36';
        [[30, 40], [58, 34], [74, 40], [34, 68], [58, 72]].forEach(function (p) { s.beginPath(); s.moveTo(p[0] - 3, p[1]); s.lineTo(p[0], p[1] - 7); s.lineTo(p[0] + 3, p[1]); s.fill(); });
      }
      spriteCache[key] = sp;
      return sp;
    }

    /* ---------- board setup ---------- */
    function mkItem(chain, tier, locked) {
      return { chain: chain, tier: tier, locked: !!locked, uid: uid++, cd: 0, pop: nowT, wob: Math.random() * 6 };
    }
    function loadMap(def) {
      ROWS = def.terr.length;
      COLS = def.terr[0].length;
      terr = [];
      items = [];
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var ch = def.terr[r][c];
          var t = ch === '~' ? 0 : ch === 'x' ? 2 : 1;
          terr.push(t);
          var ic = def.items && def.items[r] ? def.items[r][c] : '-';
          var L = LET[ic];
          items.push(t && L ? mkItem(L[0], L[1], t === 2) : null);
        }
      }
      deadStart = terr.filter(function (t) { return t === 2; }).length;
    }
    function startLevel(i) {
      closeOverlay();
      mode = 'level';
      levelIdx = i;
      var def = LEVELS[i];
      loadMap(def);
      goals = def.goals.map(function (gl) { return Object.assign({}, gl); });
      made = {};
      collected = { coins: 0, power: 0 };
      moves = 0;
      levelTime = 0;
      won = false;
      selected = -1;
      particles.length = 0;
      floats.length = 0;
      ghosts.length = 0;
      started = true;
      paused = false;
      lastAction = nowT;
      layout(view.width, view.height);
      updateHud();
      sfx('levelup');
      toast(def.intro, 3600);
    }
    function startHome() {
      closeOverlay();
      mode = 'home';
      var sv = store.get('home', null);
      if (sv && sv.terr && sv.items && sv.cols) {
        COLS = sv.cols;
        ROWS = sv.rows;
        terr = sv.terr.slice();
        items = sv.items.map(function (s) {
          if (!s) return null;
          var it = mkItem(s[0], s[1], s[2]);
          it.pop = -9;
          return it;
        });
        deadStart = sv.deadStart || terr.filter(function (t) { return t === 2; }).length;
        homeHealedCelebrated = !!sv.healed;
        giftAt = sv.giftAt || Date.now() + GIFT_MS;
        giftsWaiting = sv.gifts || 0;
        // presents that piled up while away (max 3)
        while (Date.now() >= giftAt && giftsWaiting < 3) { giftsWaiting++; giftAt += GIFT_MS; }
        if (Date.now() >= giftAt) giftAt = Date.now() + GIFT_MS;
      } else {
        loadMap(HOME);
        homeHealedCelebrated = false;
        giftAt = Date.now() + GIFT_MS;
        giftsWaiting = 0;
      }
      goals = [];
      made = {};
      collected = { coins: 0, power: 0 };
      moves = 0;
      won = false;
      selected = -1;
      started = true;
      paused = false;
      lastAction = nowT;
      layout(view.width, view.height);
      updateHud();
      if (giftsWaiting) toast('Welcome back! ' + giftsWaiting + ' free chest' + (giftsWaiting > 1 ? 's' : '') + ' arrived', 2600);
      saveHome();
    }
    function saveHome() {
      if (mode !== 'home') return;
      clearTimeout(saveTimer);
      store.set('home', {
        cols: COLS,
        rows: ROWS,
        terr: terr,
        deadStart: deadStart,
        healed: homeHealedCelebrated,
        giftAt: giftAt,
        gifts: giftsWaiting,
        items: items.map(function (it) { return it ? [it.chain, it.tier, it.locked ? 1 : 0] : 0; }),
      });
    }
    function saveSoon() {
      saveMeta();
      if (mode !== 'home') return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveHome, 400);
    }

    /* ---------- rules ---------- */
    function frontier(i) {
      var c = i % COLS, r = Math.floor(i / COLS);
      return (land(c - 1, r) && terr[idx(c - 1, r)] === 1) || (land(c + 1, r) && terr[idx(c + 1, r)] === 1) || (land(c, r - 1) && terr[idx(c, r - 1)] === 1) || (land(c, r + 1) && terr[idx(c, r + 1)] === 1);
    }
    // Healthy land takes anything; withered land only accepts Life plants next to healthy land.
    function canPlace(it, i) {
      if (i < 0 || !terr[i]) return false;
      if (terr[i] === 1) return true;
      return it.chain === 'life' && frontier(i);
    }
    function neighbors(i) {
      var c = i % COLS, r = Math.floor(i / COLS), out = [];
      if (c > 0) out.push(i - 1);
      if (c < COLS - 1) out.push(i + 1);
      if (r > 0) out.push(i - COLS);
      if (r < ROWS - 1) out.push(i + COLS);
      return out;
    }
    // Connected identical, unlocked items starting at cell `start` (which holds `proto`).
    function groupAt(start, proto, extraCell, ignoreCell) {
      var seen = {}, out = [start], q = [start];
      seen[start] = 1;
      while (q.length) {
        var cur = q.shift();
        var nb = neighbors(cur);
        for (var k = 0; k < nb.length; k++) {
          var n = nb[k];
          if (seen[n] || n === ignoreCell) continue;
          var it = items[n];
          if (n === extraCell || (it && !it.locked && same(it, proto))) {
            seen[n] = 1;
            out.push(n);
            q.push(n);
          }
        }
      }
      return out;
    }
    function nearestEmpty(from, forItem) {
      var seen = {}, q = [from];
      seen[from] = 1;
      while (q.length) {
        var cur = q.shift();
        if (!items[cur] && canPlace(forItem || { chain: 'coin' }, cur) && terr[cur] === 1) return cur;
        var nb = neighbors(cur);
        for (var k = 0; k < nb.length; k++) if (!seen[nb[k]]) { seen[nb[k]] = 1; q.push(nb[k]); }
      }
      return -1;
    }
    function centerCell() {
      var best = -1, bd = 1e9, mc = (COLS - 1) / 2, mr = (ROWS - 1) / 2;
      for (var i = 0; i < terr.length; i++) {
        if (terr[i] !== 1) continue;
        var d = Math.hypot((i % COLS) - mc, Math.floor(i / COLS) - mr);
        if (d < bd) { bd = d; best = i; }
      }
      return best < 0 ? 0 : best;
    }

    /* ---------- actions ---------- */
    function place(i, it) {
      items[i] = it;
    }
    function spawnAt(i, chain, tier, fromI) {
      var it = mkItem(chain, tier, false);
      items[i] = it;
      it.pop = nowT + (fromI != null ? 0.18 : 0);
      if (fromI != null && fromI !== i) ghosts.push({ chain: chain, tier: tier, x0: cx(fromI), y0: cy(fromI), x1: cx(i), y1: cy(i), t: 0, d: 0.2, arc: 1 });
      return it;
    }

    // Resolve a drop of `it` (picked up from `src`) onto cell `dst`.
    function dropItem(src, dst, it) {
      if (dst < 0 || !terr[dst]) { returnItem(src, it); return; }
      var occ = dst === src ? null : items[dst];
      if (occ && occ.locked) { sfx('error'); toast('That item is stuck in withered land'); returnItem(src, it); return; }
      if (!canPlace(it, dst)) {
        sfx('error');
        toast(it.chain === 'life' && terr[dst] === 2 ? 'Plant next to healthy land' : 'Only Life plants can go on withered land');
        returnItem(src, it);
        return;
      }
      lastAction = nowT;
      moves++;
      if (occ && same(occ, it)) {
        // dropped onto an identical item: merge if the joint group reaches 3
        var grp = groupAt(dst, it, -1, src);
        if (grp.length + 1 >= 3) { doMerge(grp, dst, it, src); return; }
        // only two → swap places
        items[src] = occ;
        items[dst] = it;
        sfx('tick');
        afterMove();
        return;
      }
      if (occ) {
        if (!canPlace(occ, src)) { moves--; sfx('error'); returnItem(src, it); return; }
        items[src] = occ;
        items[dst] = it;
        sfx('tick');
        if (!tryMergeAt(dst)) tryMergeAt(src);
        afterMove();
        return;
      }
      items[src] = null;
      items[dst] = it;
      if (!tryMergeAt(dst)) sfx('tick');
      afterMove();
    }
    function returnItem(src, it) {
      items[src] = it;
      ghosts.push({ chain: it.chain, tier: it.tier, x0: drag ? drag.x : cx(src), y0: drag ? drag.y : cy(src), x1: cx(src), y1: cy(src), t: 0, d: 0.16, hide: src, uid: it.uid });
    }
    function tryMergeAt(i) {
      var it = items[i];
      if (!it || it.locked || !nextOf(it)) return false;
      var grp = groupAt(i, it, -1, -1);
      if (grp.length < 3) return false;
      grp.splice(grp.indexOf(i), 1);
      items[i] = null;
      doMerge(grp, i, it, -1);
      return true;
    }
    // grp: cells holding identical items (not counting the moved item); anchor gets the result.
    function doMerge(grp, anchor, moving, src) {
      var proto = moving;
      var nx = nextOf(proto);
      if (!nx) {
        sfx('error');
        toast(itemName(proto) + ' is already max level');
        if (src >= 0) returnItem(src, moving); else items[anchor] = moving;
        return;
      }
      if (src >= 0) items[src] = null;
      // order group cells by distance to the anchor so the closest ones get consumed
      var ac = anchor % COLS, ar = Math.floor(anchor / COLS);
      var cells = grp.slice().sort(function (a, b) {
        return Math.abs((a % COLS) - ac) + Math.abs(Math.floor(a / COLS) - ar) - (Math.abs((b % COLS) - ac) + Math.abs(Math.floor(b / COLS) - ar));
      });
      var n = cells.length + 1;
      var results = Math.floor(n / 5) * 2 + (n % 5 >= 3 ? 1 : 0);
      var used = Math.floor(n / 5) * 5 + (n % 5 >= 3 ? 3 : 0);
      var consumed = cells.slice(0, used - 1);
      consumed.forEach(function (ci) {
        ghosts.push({ chain: proto.chain, tier: proto.tier, x0: cx(ci), y0: cy(ci), x1: cx(anchor), y1: cy(anchor), t: 0, d: 0.18 });
        items[ci] = null;
      });
      items[anchor] = null;
      var outCells = [anchor].concat(consumed).slice(0, results);
      outCells.forEach(function (ci, k) {
        var r = mkItem(nx.chain, nx.tier, false);
        r.pop = nowT + 0.16 + k * 0.06;
        items[ci] = r;
      });
      var key = nx.chain + nx.tier;
      made[key] = (made[key] || 0) + results;
      if (proto.chain === 'egg') made.hatch = (made.hatch || 0) + results;
      if (nx.chain === 'dragon') made.dragonMax = Math.max(made.dragonMax || 0, nx.tier);
      // juice
      var x = cx(anchor), y = cy(anchor);
      burst(x, y, nx.chain === 'life' ? ['#a7f3d0', '#fef08a', '#ffffff'] : nx.chain === 'dragon' ? ['#fde68a', '#c4b5fd', '#ffffff'] : ['#fde68a', '#ffffff', '#93c5fd'], 18 + results * 6, 1);
      shake = Math.max(shake, 0.12 + results * 0.06);
      if (nx.chain === 'dragon') { sfx('levelup'); floatText(x, y - C * 0.6, proto.chain === 'egg' ? 'Hatched!' : 'Grown!', '#fde68a'); }
      else sfx('merge');
      if (results >= 2) later(function () { floatText(x, y - C * 0.9, '+1 bonus!', '#a7f3d0'); sfx('coin'); }, 180);
      // Life merges heal withered land around the merge.
      if (nx.chain === 'life') heal(anchor, consumed, (2 + nx.tier * 2) * results);
      selected = anchor;
      afterMove();
    }
    function heal(anchor, cells, extra) {
      var list = [anchor].concat(cells).filter(function (i) { return terr[i] === 2; });
      // spread outwards through the island, nearest withered tiles first
      var seen = {}, q = [anchor], k = 0;
      seen[anchor] = 1;
      while (q.length && k < extra) {
        var cur = q.shift();
        if (terr[cur] === 2 && list.indexOf(cur) < 0) { list.push(cur); k++; }
        var nb = neighbors(cur);
        for (var j = 0; j < nb.length; j++) if (!seen[nb[j]] && terr[nb[j]]) { seen[nb[j]] = 1; q.push(nb[j]); }
      }
      if (!list.length) return;
      list.forEach(function (i, n) {
        later(function () {
          if (terr[i] !== 2) return;
          terr[i] = 1;
          terrDirty = true;
          burst(cx(i), cy(i), ['#86efac', '#bbf7d0', '#fef9c3'], 8, 0.6);
          var it = items[i];
          if (it && it.locked) {
            it.locked = false;
            it.pop = nowT;
            floatText(cx(i), cy(i) - C * 0.4, 'Freed!', '#bbf7d0');
          }
          if (n === 0) sfx({ f: 520, f2: 1040, d: 0.25, type: 'sine', v: 0.12 });
          updateHud();
          checkWin();
          saveSoon();
        }, 120 + n * 70);
      });
    }
    function afterMove() {
      updateHud();
      checkWin();
      saveSoon();
    }

    function tapCell(i) {
      var it = items[i];
      lastAction = nowT;
      if (!it) { selected = -1; return; }
      if (it.locked) {
        sfx('error');
        it.shake = 0.4;
        toast('Heal this land to free the ' + itemName(it));
        return;
      }
      var now = Date.now();
      if (it.chain === 'coin' || it.chain === 'orb') {
        var v = CH[it.chain].val[it.tier];
        var res = it.chain === 'coin' ? 'coins' : 'power';
        wallet[res] += v;
        collected[res] += v;
        items[i] = null;
        if (selected === i) selected = -1;
        floatText(cx(i), cy(i) - C * 0.3, '+' + v, it.chain === 'coin' ? '#fde68a' : '#d8b4fe');
        burst(cx(i), cy(i), it.chain === 'coin' ? ['#fde68a', '#f59e0b'] : ['#d8b4fe', '#a78bfa', '#fff'], 10, 0.7);
        sfx('coin');
        pulse(it.chain === 'coin' ? coinPill : powerPill);
        afterMove();
        return;
      }
      if (it.chain === 'chest') { openChest(i, it); return; }
      if ((it.chain === 'life' && it.tier >= 4) || (it.chain === 'stone' && it.tier === 5)) {
        if (now < it.cd) { selected = i; sfx('tick'); toast(itemName(it) + ' is resting · ' + Math.ceil((it.cd - now) / 1000) + 's'); updateInfo(); return; }
        var spot = nearestEmpty(i);
        if (spot < 0) { sfx('error'); toast('No free space nearby'); return; }
        var out = it.chain === 'stone' ? ['coin', 2] : ['life', it.tier === 5 ? 1 : 0];
        spawnAt(spot, out[0], out[1], i);
        it.cd = now + (it.chain === 'stone' ? 30000 : 15000);
        it.shake = 0.3;
        sfx('pop');
        afterMove();
        return;
      }
      selected = selected === i ? -1 : i;
      sfx('tick');
      updateInfo();
    }
    function openChest(i, it) {
      var n = CHEST_COUNT[it.tier];
      var table = CHEST_LOOT[it.tier];
      items[i] = null;
      var spots = [];
      for (var k = 0; k < n; k++) {
        var sp = nearestEmpty(i);
        if (sp < 0) break;
        // pick weighted loot
        var tot = 0, j;
        for (j = 0; j < table.length; j++) tot += table[j][2];
        var roll = Math.random() * tot, pick = table[0];
        for (j = 0; j < table.length; j++) { roll -= table[j][2]; if (roll <= 0) { pick = table[j]; break; } }
        spawnAt(sp, pick[0], pick[1], i);
        spots.push(sp);
      }
      if (!spots.length) {
        items[i] = it;
        sfx('error');
        toast('Make some space before opening chests');
        return;
      }
      burst(cx(i), cy(i), ['#fde68a', '#f59e0b', '#ffffff'], 22, 1);
      shake = 0.2;
      sfx('buy');
      floatText(cx(i), cy(i) - C * 0.4, CH.chest.names[it.tier] + '!', '#fde68a');
      afterMove();
    }

    /* ---------- dragons ---------- */
    function updateDragons(dt) {
      var now = Date.now();
      for (var i = 0; i < items.length; i++) {
        var d = items[i];
        if (!d || d.chain !== 'dragon' || d.locked) continue;
        if (drag && drag.it === d) continue;
        var hx = cx(i), hy = cy(i);
        if (d.fx == null) { d.fx = hx; d.fy = hy; d.ph = 'rest'; d.t = 1 + Math.random() * 2; d.face = 1; }
        var speed = C * (3 + d.tier * 0.6);
        if (d.ph === 'rest') {
          d.fx += (hx - d.fx) * Math.min(1, dt * 8);
          d.fy += (hy - d.fy) * Math.min(1, dt * 8);
          d.t -= dt;
          if (d.t <= 0) {
            var tg = findHarvest(i, d);
            if (tg >= 0) { d.ph = 'fly'; d.tg = tg; d.tgUid = items[tg].uid; items[tg].res = nowT + 8; }
            else d.t = 2;
          }
        } else if (d.ph === 'fly' || d.ph === 'back') {
          var tx = d.ph === 'fly' ? cx(d.tg) : hx, ty = d.ph === 'fly' ? cy(d.tg) - C * 0.35 : hy;
          if (d.ph === 'fly' && (!items[d.tg] || items[d.tg].uid !== d.tgUid)) { d.ph = 'back'; continue; }
          var dx = tx - d.fx, dy = ty - d.fy, dist = Math.hypot(dx, dy);
          if (Math.abs(dx) > 2) d.face = dx > 0 ? 1 : -1;
          if (dist < speed * dt + 1) {
            d.fx = tx; d.fy = ty;
            if (d.ph === 'fly') { d.ph = 'harvest'; d.t = 1.3; }
            else { d.ph = 'rest'; d.t = (2.6 + Math.random() * 1.6) / (1 + d.tier * 0.35); }
          } else { d.fx += (dx / dist) * speed * dt; d.fy += (dy / dist) * speed * dt; }
        } else if (d.ph === 'harvest') {
          d.t -= dt;
          if (Math.random() < dt * 14) particles.push({ x: d.fx + (Math.random() - 0.5) * C * 0.6, y: d.fy + C * 0.3, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, life: 0, max: 0.6, s: 2 + Math.random() * 2, c: Math.random() < 0.5 ? '#fef08a' : '#a7f3d0' });
          if (d.t <= 0) {
            var tgt = items[d.tg];
            if (tgt && tgt.uid === d.tgUid) {
              var out = harvestOut(tgt);
              var spot = nearestEmpty(d.tg);
              if (out && spot >= 0) {
                spawnAt(spot, out[0], out[1], d.tg);
                tgt.cd = now + 25000;
                sfx({ f: 880, f2: 1320, d: 0.12, type: 'triangle', v: 0.08 });
                if (d.tier >= 2 && Math.random() < 0.25) { var sp2 = nearestEmpty(d.tg); if (sp2 >= 0) spawnAt(sp2, out[0], out[1], d.tg); }
                saveSoon();
              }
              tgt.res = 0;
            }
            d.ph = 'back';
          }
        }
      }
    }
    function harvestable(it, now) {
      if (!it || it.locked || it.res > nowT || now < it.cd) return false;
      return (it.chain === 'life' && it.tier >= 1) || (it.chain === 'stone' && it.tier >= 2 && it.tier <= 4);
    }
    function harvestOut(it) {
      if (it.chain === 'life') return ['orb', it.tier >= 4 ? 2 : it.tier >= 3 ? 1 : 0];
      if (it.chain === 'stone') return ['coin', it.tier >= 4 ? 2 : it.tier - 2];
      return null;
    }
    function findHarvest(i, d) {
      var now = Date.now(), range = 2 + d.tier, best = -1, bd = 1e9;
      var c0 = i % COLS, r0 = Math.floor(i / COLS);
      for (var j = 0; j < items.length; j++) {
        if (!harvestable(items[j], now)) continue;
        var dd = Math.max(Math.abs((j % COLS) - c0), Math.abs(Math.floor(j / COLS) - r0));
        if (dd > range) continue;
        var score = dd + Math.random() * 1.5;
        if (score < bd) { bd = score; best = j; }
      }
      return best;
    }

    /* ---------- goals & hud ---------- */
    function deadCount() { var n = 0; for (var i = 0; i < terr.length; i++) if (terr[i] === 2) n++; return n; }
    function goalProgress(gl) {
      if (gl.type === 'heal') return { v: deadStart - deadCount(), n: deadStart };
      if (gl.type === 'make') return { v: Math.min(gl.n, made[gl.chain + gl.tier] || 0), n: gl.n };
      if (gl.type === 'hatch') return { v: Math.min(gl.n, made.hatch || 0), n: gl.n };
      if (gl.type === 'collect') return { v: Math.min(gl.n, collected[gl.res]), n: gl.n };
      if (gl.type === 'dragon') { var have = 0; items.forEach(function (it) { if (it && it.chain === 'dragon' && !it.locked) have = Math.max(have, it.tier); }); return { v: Math.max(have, made.dragonMax || 0) >= gl.tier ? 1 : 0, n: 1 }; }
      return { v: 0, n: 1 };
    }
    function goalLabel(gl, short) {
      if (gl.type === 'heal') return short ? 'Heal land' : 'Heal all withered land';
      if (gl.type === 'make') return (short ? '' : 'Make a ') + CH[gl.chain].names[gl.tier] + (short ? '' : ' (level ' + (gl.tier + 1) + ')');
      if (gl.type === 'hatch') return short ? 'Hatch' : 'Hatch a dragon from eggs';
      if (gl.type === 'collect') return short ? (gl.res === 'coins' ? 'Coins' : 'Power') : 'Collect ' + gl.n + ' ' + (gl.res === 'coins' ? 'coins' : 'Dragon Power');
      if (gl.type === 'dragon') return short ? CH.dragon.names[gl.tier] : 'Raise a ' + CH.dragon.names[gl.tier];
      return '';
    }
    function updateHud() {
      coinPill.querySelector('span').textContent = IGAME.fmt(wallet.coins);
      powerPill.querySelector('span').textContent = IGAME.fmt(wallet.power);
      var html = '';
      if (mode === 'level') {
        goals.forEach(function (gl) {
          var p = goalProgress(gl);
          var done = p.v >= p.n;
          html += '<span class="dm-goal' + (done ? ' done' : '') + '">' + (done ? '✓ ' : '') + goalLabel(gl, portrait) + ' <b>' + p.v + '/' + p.n + '</b></span>';
        });
        sideTitle.textContent = 'Level ' + (levelIdx + 1) + ': ' + LEVELS[levelIdx].name;
      } else if (mode === 'home') {
        var healed = deadStart ? Math.round(((deadStart - deadCount()) / deadStart) * 100) : 100;
        html = '<span class="dm-goal' + (healed >= 100 ? ' done' : '') + '">Island healed <b>' + healed + '%</b></span>';
        sideTitle.textContent = 'Home Island';
      }
      goalsEl.innerHTML = html;
      updateInfo();
    }
    function updateInfo() {
      var txt = '';
      var it = selected >= 0 ? items[selected] : null;
      if (it) {
        var nx = nextOf(it);
        txt = '<b>' + itemName(it) + '</b> · ' + CH[it.chain].label + ' lv ' + (it.tier + 1);
        if (it.locked) txt += ' · trapped — heal the land around it';
        else if (it.chain === 'coin' || it.chain === 'orb') txt += ' · tap to collect +' + CH[it.chain].val[it.tier];
        else if (it.chain === 'chest') txt += ' · tap to open';
        else if (it.chain === 'dragon') txt += ' · harvests plants & stones nearby' + (nx ? ' · merge 3 → ' + itemName(nx) : '');
        else if (nx) txt += ' · merge 3 → ' + itemName(nx);
        else txt += ' · max level';
        if ((it.chain === 'life' && it.tier >= 4) || (it.chain === 'stone' && it.tier === 5)) txt += ' · tap to harvest';
      } else if (mode === 'home') {
        var sec = Math.max(0, Math.ceil((giftAt - Date.now()) / 1000));
        txt = giftsWaiting ? '<b>' + giftsWaiting + ' free chest' + (giftsWaiting > 1 ? 's' : '') + '</b> waiting — make room on healthy land' : 'Free chest in <b>' + Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2) + '</b>';
      } else if (mode === 'level') {
        txt = 'Moves <b>' + moves + '</b>' + (lvSave.best[levelIdx] ? ' · best <b>' + lvSave.best[levelIdx] + '</b>' : '') + ' · drag 3 alike together';
      }
      if (infoEl._t !== txt) { infoEl.innerHTML = txt; infoEl._t = txt; }
    }
    function pulse(el) {
      el.animate && el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260 });
    }
    function checkWin() {
      if (mode === 'home') {
        if (!homeHealedCelebrated && deadStart && deadCount() === 0) {
          homeHealedCelebrated = true;
          sfx('win');
          confetti();
          toast('Your Home Island is fully healed!', 3000);
          saveHome();
        }
        return;
      }
      if (mode !== 'level' || won) return;
      for (var k = 0; k < goals.length; k++) { var p = goalProgress(goals[k]); if (p.v < p.n) return; }
      won = true;
      lvSave.done[levelIdx] = 1;
      var prevBest = lvSave.best[levelIdx];
      if (!prevBest || moves < prevBest) lvSave.best[levelIdx] = moves;
      saveMeta();
      later(function () {
        sfx('win');
        confetti();
        showLevelDone(prevBest);
      }, 700);
    }

    /* ---------- hint ---------- */
    function findMergeSet() {
      var groups = {};
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it || it.locked || !nextOf(it)) continue;
        if (it.chain === 'coin' || it.chain === 'orb' || it.chain === 'chest') continue;
        var k = it.chain + it.tier;
        (groups[k] = groups[k] || []).push(i);
      }
      var best = null;
      for (var key in groups) if (groups[key].length >= 3 && (!best || groups[key][0] < best[0])) best = groups[key];
      return best ? best.slice(0, Math.min(best.length, 5)) : null;
    }
    function lifeCount() {
      var n = 0;
      for (var i = 0; i < items.length; i++) if (items[i] && !items[i].locked && items[i].chain === 'life' && items[i].tier < 4) n++;
      return n;
    }
    function giveSeedlings() {
      var placed = [];
      for (var n = 0; n < 3; n++) { var sp = nearestEmpty(centerCell()); if (sp < 0) break; spawnAt(sp, 'life', 0, null); placed.push(sp); }
      if (!placed.length) { toast('The island is full — merge or collect something'); return; }
      hintCells = placed;
      hintUntil = nowT + 4;
      sfx('buy');
      toast('Out of Life plants? Here are 3 free Seedlings');
      afterMove();
    }
    function giveHint(auto) {
      if (!started || won) return;
      // withered land left but nothing to heal it with, and no coins for the shop → free Seedlings
      if (!auto && deadCount() > 0 && lifeCount() < 3 && wallet.coins < SHOP[0].price) { giveSeedlings(); return; }
      var set = findMergeSet();
      if (set) {
        hintCells = set;
        hintUntil = nowT + (auto ? 2.2 : 4);
        if (!auto) { sfx('match'); toast('Drag these ' + set.length + ' ' + itemName(items[set[0]]) + 's side by side'); }
        return;
      }
      if (auto) return;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it && !it.locked && (it.chain === 'chest' || it.chain === 'coin' || it.chain === 'orb')) {
          hintCells = [i];
          hintUntil = nowT + 4;
          sfx('match');
          toast(it.chain === 'chest' ? 'Tap the chest to open it' : 'Tap to collect it');
          return;
        }
      }
      // fail-safe so a level can never get stuck: a free handful of seedlings
      giveSeedlings();
    }

    /* ---------- shop ---------- */
    function itemIcon(chain, tier, px) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = px;
      var s = cv.getContext('2d');
      s.scale(px / 100, px / 100);
      s.lineJoin = 'round';
      s.lineWidth = 3;
      s.strokeStyle = OL;
      if (chain === 'dragon') drawDragon(s, 50, 56, 100, tier, 0.3, 1, false);
      else ART[chain][tier](s);
      return cv;
    }
    function showShop() {
      if (!started || won || overlay) return;
      cancelHolds();
      killToast();
      paused = true;
      overlay = ui.overlay(root, {
        title: 'Shop',
        text: 'You have ' + wallet.coins + ' coins. Items appear on free healthy land.',
        buttons: [{ label: 'Close', primary: true, onClick: function () { closeOverlay(); } }],
      });
      var gridEl = ui.el('div', 'dm-shop');
      SHOP.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.disabled = wallet.coins < s.price;
        b.appendChild(itemIcon(s.chain, s.tier, 80));
        var t = ui.el('span', '', CH[s.chain].names[s.tier] + '<small>' + s.price + ' coins</small>');
        b.appendChild(t);
        b.addEventListener('click', function () { buy(s); });
        gridEl.appendChild(b);
      });
      overlay.panel.insertBefore(gridEl, overlay.panel.querySelector('.ig-actions'));
    }
    function buy(s) {
      if (wallet.coins < s.price) { sfx('error'); return; }
      var spot = nearestEmpty(centerCell());
      if (spot < 0) { sfx('error'); toast('No free healthy land — merge something first'); return; }
      wallet.coins -= s.price;
      closeOverlay();
      var it = spawnAt(spot, s.chain, s.tier, null);
      it.pop = nowT;
      burst(cx(spot), cy(spot), ['#fde68a', '#ffffff'], 12, 0.7);
      sfx('buy');
      selected = spot;
      afterMove();
    }

    /* ---------- effects ---------- */
    function burst(x, y, cols, n, power) {
      for (var i = 0; i < n; i++) {
        if (particles.length > 240) break;
        var an = Math.random() * TAU, sp = (50 + Math.random() * 180) * power * (C / 60);
        particles.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 50 * power, life: 0, max: 0.45 + Math.random() * 0.5, s: (2 + Math.random() * 3) * Math.max(0.7, C / 60), c: cols[i % cols.length] });
      }
    }
    function confetti() {
      for (var k = 0; k < 5; k++) later(function () { burst(BX + Math.random() * COLS * C, BY + Math.random() * ROWS * C * 0.6, ['#fde68a', '#86efac', '#93c5fd', '#f9a8d4', '#c4b5fd'], 28, 1.4); }, k * 160);
    }
    function floatText(x, y, text, col) {
      floats.push({ x: x, y: y, text: text, col: col, t: 0 });
      if (floats.length > 12) floats.shift();
    }
    var toastEl = null;
    function toast(text, ms) {
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      toastEl = ui.toast(root, text, ms || 1700);
      var bw = COLS * C;
      toastEl.style.left = BX + bw / 2 + 'px';
      toastEl.style.top = 'auto';
      toastEl.style.bottom = Math.max(8, H - (BY + ROWS * C) + C * 0.35) + 'px';
      toastEl.style.maxWidth = Math.max(220, bw - 16) + 'px';
      toastEl.style.whiteSpace = 'normal';
      toastEl.style.width = 'max-content';
      toastEl.style.textAlign = 'center';
      toastEl.style.fontSize = portrait ? '14px' : '15px';
    }

    /* ---------- overlays ---------- */
    function killToast() {
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      toastEl = null;
    }
    function closeOverlay() {
      killToast();
      if (overlay) overlay.close();
      overlay = null;
      paused = false;
    }
    function helpHtml() {
      return (
        '<ul class="dm-help">' +
        '<li><b>Drag</b> items around the island. Put <b>3 identical items</b> side by side to merge them into the next level — <b>5 make 2</b>.</li>' +
        '<li><b>Withered land</b> (purple) traps items. Merge Life plants (Seedling → Sprig → Blossom…) on or next to it to heal it. Life plants can be planted on withered tiles that touch healthy land.</li>' +
        '<li><b>Tap</b> coins and orbs to collect them, chests to open them, and Sun Trees to drop seedlings.</li>' +
        '<li>Merge 3 <b>Dragon Eggs</b> to hatch a dragon. Dragons fly to nearby plants and stones and harvest Dragon Power orbs and coins.</li>' +
        '<li>Keys: arrows move the cursor · <span class="ig-kbd">Space</span> pick up / drop · <span class="ig-kbd">Enter</span> tap · <span class="ig-kbd">H</span> hint · <span class="ig-kbd">S</span> shop · <span class="ig-kbd">P</span> pause</li>' +
        '</ul>'
      );
    }
    function showTitle() {
      closeOverlay();
      var anyDone = Object.keys(lvSave.done).length;
      overlay = ui.overlay(root, {
        title: TITLE,
        text: 'Drag 3 matching items together to merge them, heal the cursed land and hatch baby dragons.',
        buttons: [
          { label: anyDone ? 'Levels' : 'Play', primary: true, onClick: showLevels },
          { label: 'Home Island', onClick: startHome },
          { label: 'How to play', onClick: function () { showHelp(showTitle); } },
        ],
      });
    }
    function showHelp(back) {
      closeOverlay();
      overlay = ui.overlay(root, { title: 'How to play', html: helpHtml(), buttons: [{ label: 'Got it', primary: true, onClick: back }] });
      overlay.panel.style.width = 'min(540px, 100%)';
    }
    function showLevels() {
      closeOverlay();
      overlay = ui.overlay(root, {
        title: 'Choose a level',
        buttons: [{ label: 'Back', onClick: showTitle }],
      });
      overlay.panel.style.width = 'min(520px, 100%)';
      var gridEl = ui.el('div', 'dm-levels');
      LEVELS.forEach(function (lv, i) {
        var b = document.createElement('button');
        b.type = 'button';
        var unlocked = i === 0 || lvSave.done[i - 1] || lvSave.done[i];
        b.disabled = !unlocked;
        b.innerHTML = i + 1 + '. ' + lv.name + '<small>' + (lvSave.done[i] ? '✓ best ' + lvSave.best[i] + ' moves' : unlocked ? 'Ready' : 'Locked') + '</small>';
        b.addEventListener('click', function () { sfx('click'); startLevel(i); });
        gridEl.appendChild(b);
      });
      var hb = document.createElement('button');
      hb.type = 'button';
      hb.className = 'home';
      hb.innerHTML = 'Home Island<small>Endless sandbox · saved automatically</small>';
      hb.addEventListener('click', function () { sfx('click'); startHome(); });
      gridEl.appendChild(hb);
      overlay.panel.insertBefore(gridEl, overlay.panel.querySelector('.ig-actions'));
      var first = gridEl.querySelector('button:not([disabled])');
      if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, 40);
    }
    function cancelHolds() {
      if (kb.hold >= 0 && kb.it) { items[kb.hold] = kb.it; }
      kb.hold = -1;
      kb.it = null;
      if (drag && drag.moved) items[drag.i] = drag.it;
      drag = null;
    }
    function showPause() {
      if (!started || overlay) return;
      cancelHolds();
      killToast();
      paused = true;
      var btns = [{ label: 'Resume', primary: true, onClick: closeOverlay }];
      if (mode === 'level') btns.push({ label: 'Restart level', onClick: function () { startLevel(levelIdx); } });
      btns.push({ label: 'Levels', onClick: showLevels });
      btns.push({ label: 'How to play', onClick: function () { showHelp(function () { closeOverlay(); showPause(); }); } });
      overlay = ui.overlay(root, {
        title: 'Paused',
        text: mode === 'level' ? 'Level ' + (levelIdx + 1) + ' · ' + LEVELS[levelIdx].name + ' · ' + moves + ' moves' : 'Home Island · ' + wallet.power + ' Dragon Power collected',
        buttons: btns,
      });
    }
    function showLevelDone(prevBest) {
      closeOverlay();
      paused = true;
      var last = levelIdx >= LEVELS.length - 1;
      var best = lvSave.best[levelIdx];
      var btns = [];
      if (!last) btns.push({ label: 'Next level', primary: true, onClick: function () { startLevel(levelIdx + 1); } });
      else btns.push({ label: 'Visit Home Island', primary: true, onClick: startHome });
      btns.push({ label: 'Retry', onClick: function () { startLevel(levelIdx); } });
      btns.push({ label: 'Levels', onClick: showLevels });
      overlay = ui.overlay(root, {
        title: last ? 'All levels complete!' : 'Level complete!',
        text: LEVELS[levelIdx].name + ' — solved in ' + moves + ' moves (' + IGAME.fmtTime(levelTime) + ').',
        html: '<p style="margin:0">Best: <b>' + best + ' moves</b>' + (prevBest && moves < prevBest ? ' · new record!' : !prevBest ? ' · first clear!' : '') + '</p>',
        buttons: btns,
      });
    }

    /* ---------- input ---------- */
    function local(e) {
      var r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function cellAt(x, y) {
      var c = Math.floor((x - BX) / C), r = Math.floor((y - BY) / C);
      if (!inB(c, r)) return -1;
      return idx(c, r);
    }
    function onDown(e) {
      if (!started || overlay || paused || drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var p = local(e);
      var i = cellAt(p.x, p.y);
      if (kb.hold >= 0) cancelHolds();
      kb.on = false;
      if (i < 0) { selected = -1; updateInfo(); return; }
      e.preventDefault();
      drag = { i: i, it: items[i], sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false, pid: e.pointerId };
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var p = local(e);
      drag.x = p.x;
      drag.y = p.y;
      if (!drag.moved) {
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) < Math.max(6, C * 0.15)) return;
        if (!drag.it || drag.it.locked) { if (drag.it && drag.it.locked && !drag.warned) { drag.warned = true; tapCell(drag.i); } return; }
        drag.moved = true;
        items[drag.i] = null; // lift the item off the board
        drag.it.res = 0;
        selected = -1;
        sfx('tick');
      }
      var over = cellAt(p.x, p.y);
      if (over !== drag.over) {
        drag.over = over;
        drag.preview = previewAt(over, drag.it, drag.i);
      }
    }
    function previewAt(i, it, src) {
      if (i < 0 || !terr[i] || !canPlace(it, i)) return null;
      var occ = i === src ? null : items[i];
      if (occ && (occ.locked || !same(occ, it))) return null;
      var grp = groupAt(i, it, -1, src);
      if (!occ) grp.shift();
      return grp.length + 1 >= 3 && nextOf(it) ? grp : null;
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag;
      if (!d.moved) {
        drag = null;
        if (e.type === 'pointerup' && !d.warned) tapCell(d.i);
        return;
      }
      var p = local(e);
      var dst = e.type === 'pointercancel' ? -1 : cellAt(p.x, p.y);
      dropItem(d.i, dst, d.it);
      drag = null;
    }
    view.canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    pauseBtn.addEventListener('click', showPause);
    hintBtn.addEventListener('click', function () { giveHint(false); });
    shopBtn.addEventListener('click', showShop);

    ctx.captureKeys(['KeyH', 'KeyS', 'KeyP', 'Enter', 'KeyW', 'KeyA', 'KeyD']);
    ctx.onKey(function (code, down, e) {
      if (!down) return;
      if (overlay) {
        if (code === 'Escape' || code === 'KeyP') {
          if (paused && started && overlay.panel.querySelector('.ig-title').textContent !== 'Choose a level') closeOverlay();
          return;
        }
        if (code === 'Space' || code === 'Enter') {
          var b = overlay.el.querySelector('button:focus') || overlay.panel.querySelector('.ig-actions .ig-btn');
          if (b) { if (e) e.preventDefault(); b.click(); }
        }
        return;
      }
      if (!started) return;
      if (code === 'KeyP' || code === 'Escape') { showPause(); return; }
      if (code === 'KeyH') { giveHint(false); return; }
      if (code === 'KeyS') { showShop(); return; }
      var dc = 0, dr = 0;
      if (code === 'ArrowLeft' || code === 'KeyA') dc = -1;
      else if (code === 'ArrowRight' || code === 'KeyD') dc = 1;
      else if (code === 'ArrowUp' || code === 'KeyW') dr = -1;
      else if (code === 'ArrowDown') dr = 1;
      if (dc || dr) {
        if (!kb.on) { kb.on = true; var cc = selected >= 0 ? selected : centerCell(); kb.c = cc % COLS; kb.r = Math.floor(cc / COLS); }
        else { kb.c = clamp(kb.c + dc, 0, COLS - 1); kb.r = clamp(kb.r + dr, 0, ROWS - 1); }
        sfx('tick');
        return;
      }
      var ci = idx(kb.c, kb.r);
      if (code === 'Space') {
        kb.on = true;
        if (kb.hold < 0) {
          var it = items[ci];
          if (it && !it.locked) { kb.hold = ci; kb.it = it; items[ci] = null; sfx('tick'); }
          else if (it) tapCell(ci);
        } else {
          var hold = kb.hold, hit = kb.it;
          kb.hold = -1;
          kb.it = null;
          dropItem(hold, ci, hit);
        }
      } else if (code === 'Enter') {
        kb.on = true;
        if (kb.hold < 0) tapCell(ci);
      }
    });

    /* ---------- loop ---------- */
    var lastInfo = 0;
    var loop = IGAME.loop(function (dt) {
      nowT += dt;
      if (started && !paused) {
        if (mode === 'level' && !won) levelTime += dt;
        updateDragons(dt);
        if (mode === 'home') {
          if (Date.now() >= giftAt) { giftsWaiting = Math.min(3, giftsWaiting + 1); giftAt = Date.now() + GIFT_MS; saveSoon(); }
          if (giftsWaiting > 0 && Math.random() < dt * 2) {
            var spot = nearestEmpty(centerCell());
            if (spot >= 0) { giftsWaiting--; spawnAt(spot, 'chest', Math.random() < 0.25 ? 1 : 0, null); burst(cx(spot), cy(spot), ['#fde68a', '#fff'], 14, 0.8); sfx('pop'); floatText(cx(spot), cy(spot) - C * 0.4, 'Gift!', '#fde68a'); saveSoon(); }
          }
        }
        if (nowT - lastAction > 12 && !drag) { lastAction = nowT; giveHint(true); }
      }
      if (nowT - lastInfo > 0.5) {
        lastInfo = nowT;
        updateInfo();
        var ti = Math.floor(nowT / 9) % TIPS.length;
        if (ti !== tipIdx || !tipEl.innerHTML) { tipIdx = ti; tipEl.innerHTML = TIPS[ti]; }
      }
      if (shake > 0) shake = Math.max(0, shake - dt);
      for (var p = particles.length - 1; p >= 0; p--) {
        var q = particles[p];
        q.life += dt;
        if (q.life >= q.max) { particles[p] = particles[particles.length - 1]; particles.pop(); continue; }
        q.vy += 420 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
      for (var k = floats.length - 1; k >= 0; k--) { floats[k].t += dt; if (floats[k].t > 1.1) floats.splice(k, 1); }
      for (var j = ghosts.length - 1; j >= 0; j--) { ghosts[j].t += dt / ghosts[j].d; if (ghosts[j].t >= 1) ghosts.splice(j, 1); }
      render(dt);
    });

    function render() {
      g.save();
      if (shake > 0) g.translate((Math.random() - 0.5) * shake * 12, (Math.random() - 0.5) * shake * 12);
      g.drawImage(oceanCanvas, 0, 0, W, H);
      // drifting wave glints
      g.strokeStyle = 'rgba(255,255,255,0.16)';
      g.lineWidth = 2;
      g.beginPath();
      for (var w = 0; w < 9; w++) {
        var wx = ((w * 173 + nowT * 14) % (W + 80)) - 40, wy = (w * 97) % H + Math.sin(nowT + w) * 4;
        g.moveTo(wx, wy); g.quadraticCurveTo(wx + 10, wy - 5, wx + 20, wy);
      }
      g.stroke();
      if (!terr.length) { g.restore(); return; }
      if (terrDirty) drawTerrain();
      var m = terrCanvas._m || 0;
      g.drawImage(terrCanvas, BX - m, BY - m, COLS * C + m * 2, ROWS * C + m * 2);
      var now = Date.now();
      // valid planting spots while dragging a Life plant
      if (drag && drag.moved && drag.it.chain === 'life') {
        g.strokeStyle = 'rgba(134,239,172,0.8)';
        g.lineWidth = 2;
        g.setLineDash([4, 4]);
        for (var f = 0; f < terr.length; f++) if (terr[f] === 2 && !items[f] && frontier(f)) g.strokeRect(BX + (f % COLS) * C + 3, BY + Math.floor(f / COLS) * C + 3, C - 6, C - 6);
        g.setLineDash([]);
      }
      // drop target + merge preview
      if (drag && drag.moved && drag.over >= 0) {
        var ok = canPlace(drag.it, drag.over) && !(items[drag.over] && items[drag.over].locked);
        g.fillStyle = ok ? 'rgba(255,255,255,0.22)' : 'rgba(248,113,113,0.3)';
        g.fillRect(BX + (drag.over % COLS) * C, BY + Math.floor(drag.over / COLS) * C, C, C);
        if (drag.preview) {
          g.strokeStyle = 'rgba(253,230,138,' + (0.6 + 0.4 * Math.sin(nowT * 10)) + ')';
          g.lineWidth = 3;
          drag.preview.concat([drag.over]).forEach(function (pi) { g.strokeRect(BX + (pi % COLS) * C + 2, BY + Math.floor(pi / COLS) * C + 2, C - 4, C - 4); });
        }
      }
      // hint
      if (hintCells && nowT < hintUntil) {
        g.strokeStyle = 'rgba(253,230,138,' + (0.5 + 0.5 * Math.sin(nowT * 8)) + ')';
        g.lineWidth = 3;
        hintCells.forEach(function (hi) { g.strokeRect(BX + (hi % COLS) * C + 2, BY + Math.floor(hi / COLS) * C + 2, C - 4, C - 4); });
      }
      if (selected >= 0 && items[selected]) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2.5;
        g.setLineDash([5, 4]);
        g.lineDashOffset = -nowT * 20;
        g.strokeRect(BX + (selected % COLS) * C + 2, BY + Math.floor(selected / COLS) * C + 2, C - 4, C - 4);
        g.setLineDash([]);
      }
      // items (dragons are drawn later so they fly above everything)
      var hiddenUid = {};
      ghosts.forEach(function (gh) { if (gh.uid) hiddenUid[gh.uid] = 1; });
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it || it.chain === 'dragon' || hiddenUid[it.uid]) continue;
        drawItemAt(it, cx(i), cy(i), now, i);
      }
      // merge ghosts
      ghosts.forEach(function (gh) {
        var k = Math.min(1, gh.t), e = k * k;
        var x = gh.x0 + (gh.x1 - gh.x0) * (gh.arc ? k : e), y = gh.y0 + (gh.y1 - gh.y0) * (gh.arc ? k : e) - (gh.arc ? Math.sin(k * Math.PI) * C * 0.5 : 0);
        var s = C * (gh.arc ? 0.8 : 1 - e * 0.4);
        if (gh.chain === 'dragon') drawDragon(g, x, y, C, gh.tier, nowT, 1, false);
        else g.drawImage(sprite({ chain: gh.chain, tier: gh.tier }), x - s / 2, y - s / 2, s, s);
      });
      // dragons
      for (var d = 0; d < items.length; d++) {
        var dr = items[d];
        if (!dr || dr.chain !== 'dragon' || hiddenUid[dr.uid]) continue;
        if (dr.locked) { drawItemAt(dr, cx(d), cy(d), now, d); continue; }
        var fx = dr.fx == null ? cx(d) : dr.fx, fy = dr.fy == null ? cy(d) : dr.fy;
        var flying = dr.ph && dr.ph !== 'rest';
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath();
        g.ellipse(fx, (flying ? fy + C * 0.55 : cy(d) + C * 0.36), C * 0.24, C * 0.07, 0, 0, TAU);
        g.fill();
        var pop = popScale(dr);
        drawDragon(g, fx, fy + Math.sin(nowT * 3 + dr.wob) * C * 0.04 - C * 0.04, C * pop, dr.tier, nowT + dr.wob, dr.face || 1, dr.ph === 'harvest');
      }
      // dragged item
      if (drag && drag.moved) {
        var ds = C * 1.15;
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(drag.x, drag.y + ds * 0.5, ds * 0.3, ds * 0.09, 0, 0, TAU);
        g.fill();
        if (drag.it.chain === 'dragon') drawDragon(g, drag.x, drag.y - C * 0.1, ds, drag.it.tier, nowT, 1, true);
        else g.drawImage(sprite(drag.it), drag.x - ds / 2, drag.y - ds / 2 - C * 0.1, ds, ds);
      }
      // keyboard cursor
      if (kb.on) {
        var kx = BX + kb.c * C, ky = BY + kb.r * C;
        g.strokeStyle = '#38bdf8';
        g.lineWidth = 3;
        g.strokeRect(kx + 1.5, ky + 1.5, C - 3, C - 3);
        if (kb.hold >= 0 && kb.it) {
          if (kb.it.chain === 'dragon') drawDragon(g, kx + C / 2, ky + C * 0.3, C, kb.it.tier, nowT, 1, true);
          else g.drawImage(sprite(kb.it), kx + C * 0.1, ky - C * 0.15, C * 0.8, C * 0.8);
        }
      }
      // particles + floating text
      for (var p = 0; p < particles.length; p++) {
        var q = particles[p];
        g.globalAlpha = 1 - q.life / q.max;
        g.fillStyle = q.c;
        g.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
      }
      g.globalAlpha = 1;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '900 ' + Math.round(clamp(C * 0.36, 13, 22)) + 'px system-ui, sans-serif';
      floats.forEach(function (ft) {
        g.globalAlpha = Math.min(1, 2.2 - ft.t * 2);
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(20,16,40,0.8)';
        g.strokeText(ft.text, ft.x, ft.y - ft.t * C * 0.7);
        g.fillStyle = ft.col;
        g.fillText(ft.text, ft.x, ft.y - ft.t * C * 0.7);
      });
      g.globalAlpha = 1;
      g.restore();
    }
    function popScale(it) {
      if (it.pop > nowT) return 0.01;
      var t = (nowT - it.pop) / 0.32;
      return t < 1 ? Math.max(0.05, easeOutBack(t)) : 1;
    }
    function drawItemAt(it, x, y, now, i) {
      var sc = popScale(it);
      if (sc < 0.02) return;
      if (it.shake > 0) { it.shake = Math.max(0, it.shake - 0.016); x += Math.sin(nowT * 50) * it.shake * C * 0.12; }
      var bob = 0;
      if (it.chain === 'egg') { var w = (nowT + it.wob) % 4; if (w < 0.5) bob = Math.sin(w * 25) * 0.08; }
      if (it.chain === 'orb') y += Math.sin(nowT * 2.5 + it.wob) * C * 0.04;
      var s = C * sc;
      if (bob) { g.save(); g.translate(x, y + s * 0.3); g.rotate(bob); g.drawImage(sprite(it), -s / 2, -s * 0.8, s, s); g.restore(); }
      else g.drawImage(sprite(it), x - s / 2, y - s / 2, s, s);
      if (it.cd > now) {
        // resting producer: small cooldown ring
        var frac = (it.cd - now) / (it.chain === 'stone' && it.tier === 5 ? 30000 : it.chain === 'life' && it.tier >= 4 ? 15000 : 25000);
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = Math.max(2, C * 0.05);
        g.beginPath();
        g.arc(x + C * 0.32, y - C * 0.32, C * 0.1, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1));
        g.stroke();
      }
      if (it.res > nowT) {
        g.fillStyle = 'rgba(254,240,138,' + (0.25 + 0.2 * Math.sin(nowT * 12)) + ')';
        g.beginPath();
        g.arc(x, y, C * 0.45, 0, TAU);
        g.fill();
      }
    }

    /* ---------- boot ---------- */
    loadMap(LEVELS[0]); // decorative backdrop behind the title screen
    items.forEach(function (it) { if (it) it.pop = -9; });
    layout(view.width, view.height);
    updateHud();
    showTitle();
    loop.start();
    if (ctx.debug) window.__dm = { state: function () { return { mode: mode, level: levelIdx, moves: moves, dead: deadCount(), won: won, goals: goals.map(goalProgress), wallet: wallet, C: C, BX: BX, BY: BY, COLS: COLS, ROWS: ROWS }; }, items: function () { return items.map(function (it) { return it ? it.chain[0] + it.tier + (it.locked ? 'L' : '') : '.'; }); }, startLevel: startLevel, startHome: startHome, made: made, itemIcon: itemIcon, CH: CH, tap: tapCell, drop: dropItem, raw: function () { return items; }, healAll: function () { heal(centerCell(), [], 999); } };

    return {
      pause: function () { loop.stop(); },
      resume: function () { loop.start(); },
      destroy: function () {
        loop.stop();
        try { cancelHolds(); saveMeta(); if (mode === 'home') saveHome(); } catch (e) {}
        clearTimeout(saveTimer);
        timers.forEach(clearTimeout);
        timers = [];
        view.canvas.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        view.destroy();
        if (ctx.debug) delete window.__dm;
        root.innerHTML = '';
      },
    };
  });
})();
