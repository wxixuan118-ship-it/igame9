/*!
 * igame9 — Hexfire Arena (engine id: arena-shooters)
 * An original single-player first-person arena shooter against bots.
 * Rendering is a classic grid raycaster on Canvas 2D: textured wall columns
 * (procedurally drawn textures), gradient floor/ceiling, z-buffered billboard
 * sprites for bots/pickups/rockets, world-space particles and a drawn weapon.
 *
 * Variant 'crypt' — Gravewick: an original retro gothic-horror campaign
 * (4 levels, keys, doors, secrets, monsters) with a per-pixel software
 * renderer and light maps. See createCrypt(); the default variant above
 * does not share any per-frame code with it.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var TEX = 64; // wall texture size
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function angDiff(a, b) {
    var d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }
  function noop() {}
  // Small seeded RNG so procedural textures look identical every load.
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hexRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // shade('#rrggbb', -0.3) darkens by 30 %, +0.3 lightens toward white.
  function shade(hex, amt) {
    var c = hexRgb(hex);
    for (var i = 0; i < 3; i++) c[i] = Math.round(amt < 0 ? c[i] * (1 + amt) : c[i] + (255 - c[i]) * amt);
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }
  function mkCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Game data                                                           */
  /* ------------------------------------------------------------------ */
  // reserve -1 = unlimited. rate = seconds between shots. spread = radians.
  var WEAPONS = [
    { id: 'pistol', name: 'Pistol', tag: 'PISTOL', dmg: 25, rate: 0.24, mag: 12, reserve: -1, reload: 1.0, spread: 0.012, pellets: 1, range: 30, kick: 0.55, shake: 2, zoom: 0.8 },
    { id: 'smg', name: 'SMG', tag: 'SMG', dmg: 13, rate: 0.085, mag: 30, reserve: 120, reload: 1.5, spread: 0.034, pellets: 1, range: 22, kick: 0.3, shake: 1.6, zoom: 0.8 },
    { id: 'shotgun', name: 'Shotgun', tag: 'SHOTGUN', dmg: 12, rate: 0.78, mag: 6, reserve: 24, reload: 1.9, spread: 0.08, pellets: 9, range: 12, kick: 1, shake: 7, zoom: 0.85 },
    { id: 'rifle', name: 'Rifle', tag: 'RIFLE', dmg: 62, rate: 0.55, mag: 6, reserve: 24, reload: 1.9, spread: 0.003, pellets: 1, range: 60, kick: 0.9, shake: 4, zoom: 0.48 },
    { id: 'launcher', name: 'Launcher', tag: 'LAUNCHER', dmg: 125, rate: 0.95, mag: 1, reserve: 4, reload: 1.3, spread: 0, pellets: 1, range: 40, kick: 1.2, shake: 9, zoom: 0.85, projectile: true, splash: 2.4 },
  ];
  var BOT_WEAPONS = [0, 1, 1, 2, 3, 1];

  var BOT_NAMES = ['Rook', 'Vex', 'Nova', 'Bolt', 'Kestrel', 'Jinx', 'Talon', 'Echo'];
  var BOT_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#a855f7', '#ec4899', '#84cc16', '#3b82f6'];

  var SKILLS = [
    { name: 'Easy', acc: 0.3, dmg: 0.5, react: [0.6, 1.0], rate: 1.7, turn: 3.2, see: 14 },
    { name: 'Normal', acc: 0.42, dmg: 0.68, react: [0.38, 0.7], rate: 1.4, turn: 4.6, see: 17 },
    { name: 'Hard', acc: 0.55, dmg: 0.85, react: [0.22, 0.45], rate: 1.15, turn: 6.5, see: 21 },
  ];
  var MATCH_TIME = 300;

  // Maps are written as the left half (12 columns) and mirrored to 24.
  // Walls: # = % +  · P spawn · h health · a armor · m ammo
  var MAPS = [
    {
      name: 'Rustworks',
      blurb: 'Crates and furnace walls in an old foundry',
      tex: { '#': 'metal', '=': 'brick', '%': 'hazard', '+': 'crate' },
      pal: { metal: '#6b7380', brick: '#8a4b34', crate: '#a8743f' },
      ceil: ['#120d0b', '#47362c'],
      floor: ['#4a3d34', '#1f1813'],
      fog: '#3d3029',
      fogDist: 17,
      fogMax: 0.72,
      half: [
        '############',
        '#P.....m....',
        '#.++........',
        '#.++...==...',
        '#.......=..%',
        '#..h....=...',
        '#=====......',
        '#.......++..',
        '#.P.....++..',
        '#...........',
        '#....%...a..',
        '#....%......',
        '#.......===.',
        '#.m.........',
        '#.......+.P.',
        '#===....+...',
        '#.......h...',
        '#P.....%....',
        '#.....m.....',
        '############',
      ],
    },
    {
      name: 'Sunken Plaza',
      blurb: 'Open courtyard with pillars under a blue sky',
      tex: { '#': 'stone', '=': 'moss', '%': 'pillar', '+': 'hedge' },
      pal: { stone: '#9c8f7a', moss: '#857a63', pillar: '#d9d2c3', hedge: '#3f7a35' },
      ceil: ['#2f7fd0', '#b9def0'],
      floor: ['#b7a27b', '#6f5c40'],
      fog: '#c3d6d8',
      fogDist: 26,
      fogMax: 0.55,
      sky: true,
      half: [
        '############',
        '#P....=.....',
        '#.....=..m..',
        '#.%...=.....',
        '#...........',
        '#...%....%..',
        '#.h.........',
        '#=====...a..',
        '#.......%...',
        '#..+........',
        '#..+....P...',
        '#.....%.....',
        '#...........',
        '#.%..==.....',
        '#....=...m..',
        '#P...=......',
        '#......%..h.',
        '#...........',
        '#.....P.....',
        '############',
      ],
    },
    {
      name: 'Neon Vault',
      blurb: 'Tight server-room corridors lit by neon strips',
      tex: { '#': 'panel', '=': 'glow', '%': 'rack', '+': 'grate' },
      pal: { panel: '#39405a', glow: '#2dd4f0', rack: '#1e2233', grate: '#4b5068' },
      ceil: ['#04040b', '#1d1745'],
      floor: ['#221c42', '#08070f'],
      fog: '#17123a',
      fogDist: 15,
      fogMax: 0.7,
      half: [
        '############',
        '#P...#......',
        '#....#..m...',
        '#.==.#...%..',
        '#.==........',
        '#.....##=...',
        '#..a..#.....',
        '####..#..P..',
        '#.....#.....',
        '#.m.........',
        '#.....=====.',
        '#..P........',
        '#.....#.....',
        '####..#..h..',
        '#.....#.....',
        '#.%%..#++...',
        '#.%%.......#',
        '#.h........#',
        '#P....m....#',
        '############',
      ],
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Procedural art                                                      */
  /* ------------------------------------------------------------------ */
  function speckle(x, r, n, w, h, dark, light) {
    for (var i = 0; i < n; i++) {
      x.fillStyle = r() < 0.5 ? dark : light;
      x.globalAlpha = 0.08 + r() * 0.16;
      x.fillRect((r() * w) | 0, (r() * h) | 0, 1 + ((r() * 2) | 0), 1);
    }
    x.globalAlpha = 1;
  }

  function makeTexture(kind, base, seed) {
    var c = mkCanvas(TEX, TEX);
    var x = c.getContext('2d');
    var r = seeded(seed);
    var i, j;
    if (kind === 'metal') {
      x.fillStyle = base;
      x.fillRect(0, 0, 64, 64);
      for (i = 0; i < 2; i++)
        for (j = 0; j < 2; j++) {
          var px = i * 32, py = j * 32;
          x.fillStyle = shade(base, (r() - 0.5) * 0.18);
          x.fillRect(px + 1, py + 1, 30, 30);
          x.fillStyle = 'rgba(255,255,255,0.18)';
          x.fillRect(px + 1, py + 1, 30, 1);
          x.fillRect(px + 1, py + 1, 1, 30);
          x.fillStyle = 'rgba(0,0,0,0.35)';
          x.fillRect(px + 1, py + 30, 30, 1);
          x.fillRect(px + 30, py + 1, 1, 30);
          x.fillStyle = 'rgba(0,0,0,0.5)';
          x.fillRect(px + 4, py + 4, 2, 2);
          x.fillRect(px + 26, py + 4, 2, 2);
          x.fillRect(px + 4, py + 26, 2, 2);
          x.fillRect(px + 26, py + 26, 2, 2);
        }
      x.fillStyle = '#1a1c22';
      x.fillRect(0, 31, 64, 2);
      x.fillRect(31, 0, 2, 64);
      // rust streaks
      for (i = 0; i < 6; i++) {
        x.fillStyle = 'rgba(140,70,30,' + (0.12 + r() * 0.2) + ')';
        x.fillRect((r() * 62) | 0, (r() * 40) | 0, 2, 6 + ((r() * 18) | 0));
      }
      speckle(x, r, 220, 64, 64, '#000', '#fff');
    } else if (kind === 'brick') {
      x.fillStyle = '#3b302b';
      x.fillRect(0, 0, 64, 64);
      for (j = 0; j < 8; j++)
        for (i = -1; i < 4; i++) {
          var bx = i * 16 + (j % 2 ? 8 : 0);
          x.fillStyle = shade(base, (r() - 0.5) * 0.35);
          x.fillRect(bx + 1, j * 8 + 1, 14, 6);
          x.fillStyle = 'rgba(255,255,255,0.12)';
          x.fillRect(bx + 1, j * 8 + 1, 14, 1);
          x.fillStyle = 'rgba(0,0,0,0.25)';
          x.fillRect(bx + 1, j * 8 + 6, 14, 1);
        }
      speckle(x, r, 260, 64, 64, '#000', '#fff');
      // soot near the top
      var gr = x.createLinearGradient(0, 0, 0, 30);
      gr.addColorStop(0, 'rgba(0,0,0,0.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 30);
    } else if (kind === 'hazard') {
      x.fillStyle = '#4b5059';
      x.fillRect(0, 0, 64, 64);
      x.save();
      x.beginPath();
      x.rect(4, 18, 56, 28);
      x.clip();
      x.fillStyle = '#f5b301';
      x.fillRect(4, 18, 56, 28);
      x.fillStyle = '#1b1b1b';
      for (i = -4; i < 10; i++) {
        x.beginPath();
        x.moveTo(i * 12, 46);
        x.lineTo(i * 12 + 6, 46);
        x.lineTo(i * 12 + 34, 18);
        x.lineTo(i * 12 + 28, 18);
        x.closePath();
        x.fill();
      }
      x.restore();
      x.fillStyle = 'rgba(255,255,255,0.2)';
      x.fillRect(0, 0, 64, 2);
      x.fillStyle = 'rgba(0,0,0,0.4)';
      x.fillRect(0, 62, 64, 2);
      x.fillRect(4, 46, 56, 2);
      speckle(x, r, 200, 64, 64, '#000', '#fff');
    } else if (kind === 'crate') {
      x.fillStyle = shade(base, -0.35);
      x.fillRect(0, 0, 64, 64);
      for (j = 0; j < 4; j++) {
        x.fillStyle = shade(base, (r() - 0.5) * 0.25);
        x.fillRect(5, 5 + j * 14, 54, 12);
        for (i = 0; i < 5; i++) {
          x.fillStyle = 'rgba(70,40,15,0.35)';
          x.fillRect(6 + ((r() * 50) | 0), 7 + j * 14 + ((r() * 8) | 0), 8 + ((r() * 10) | 0), 1);
        }
      }
      x.strokeStyle = shade(base, -0.15);
      x.lineWidth = 6;
      x.beginPath();
      x.moveTo(6, 6);
      x.lineTo(58, 58);
      x.moveTo(58, 6);
      x.lineTo(6, 58);
      x.stroke();
      x.strokeStyle = shade(base, -0.5);
      x.lineWidth = 5;
      x.strokeRect(2.5, 2.5, 59, 59);
      speckle(x, r, 120, 64, 64, '#000', '#fff');
    } else if (kind === 'stone' || kind === 'moss') {
      x.fillStyle = '#5b5346';
      x.fillRect(0, 0, 64, 64);
      var rowsY = [0, 22, 43, 64];
      for (j = 0; j < 3; j++) {
        var off = j % 2 ? -12 : 0;
        for (i = 0; i < 3; i++) {
          var sx = off + i * 32;
          x.fillStyle = shade(base, (r() - 0.5) * 0.25);
          x.fillRect(sx + 1, rowsY[j] + 1, 30, rowsY[j + 1] - rowsY[j] - 2);
          x.fillStyle = 'rgba(255,255,255,0.15)';
          x.fillRect(sx + 1, rowsY[j] + 1, 30, 2);
        }
      }
      speckle(x, r, 380, 64, 64, '#000', '#fff');
      if (kind === 'moss') {
        for (i = 0; i < 26; i++) {
          var mx = r() * 64, len = 4 + r() * 26;
          x.fillStyle = r() < 0.5 ? '#4d7a2c' : '#3a6424';
          x.globalAlpha = 0.7;
          x.fillRect(mx | 0, 0, 2 + ((r() * 4) | 0), len | 0);
        }
        x.globalAlpha = 1;
      }
    } else if (kind === 'pillar') {
      x.fillStyle = base;
      x.fillRect(0, 0, 64, 64);
      for (i = 0; i < 8; i++) {
        var gx = i * 8;
        var g2 = x.createLinearGradient(gx, 0, gx + 8, 0);
        g2.addColorStop(0, 'rgba(0,0,0,0.22)');
        g2.addColorStop(0.5, 'rgba(255,255,255,0.18)');
        g2.addColorStop(1, 'rgba(0,0,0,0.22)');
        x.fillStyle = g2;
        x.fillRect(gx, 0, 8, 64);
      }
      x.fillStyle = shade(base, -0.25);
      x.fillRect(0, 0, 64, 6);
      x.fillRect(0, 58, 64, 6);
      x.fillStyle = 'rgba(255,255,255,0.35)';
      x.fillRect(0, 6, 64, 1);
      speckle(x, r, 160, 64, 64, '#6d6658', '#fff');
    } else if (kind === 'hedge') {
      x.fillStyle = shade(base, -0.4);
      x.fillRect(0, 0, 64, 64);
      for (i = 0; i < 420; i++) {
        x.fillStyle = r() < 0.5 ? shade(base, r() * 0.3) : shade(base, -r() * 0.3);
        x.beginPath();
        x.arc(r() * 64, r() * 52, 1.5 + r() * 2.5, 0, TAU);
        x.fill();
      }
      x.fillStyle = '#7a6047';
      x.fillRect(0, 52, 64, 12);
      x.fillStyle = 'rgba(0,0,0,0.3)';
      x.fillRect(0, 52, 64, 2);
    } else if (kind === 'panel') {
      x.fillStyle = base;
      x.fillRect(0, 0, 64, 64);
      x.fillStyle = shade(base, -0.35);
      x.fillRect(0, 20, 64, 2);
      x.fillRect(0, 44, 64, 2);
      x.fillRect(30, 0, 2, 20);
      x.fillRect(16, 22, 2, 22);
      x.fillRect(46, 22, 2, 22);
      x.fillStyle = 'rgba(255,255,255,0.1)';
      x.fillRect(0, 22, 64, 1);
      x.fillRect(0, 46, 64, 1);
      for (i = 0; i < 4; i++) {
        x.fillStyle = r() < 0.5 ? '#2dd4f0' : '#8b6cff';
        x.fillRect(4 + ((r() * 54) | 0), 50 + ((r() * 10) | 0), 3, 2);
      }
      speckle(x, r, 180, 64, 64, '#000', '#9fb0ff');
    } else if (kind === 'glow') {
      x.fillStyle = '#20243a';
      x.fillRect(0, 0, 64, 64);
      var g3 = x.createLinearGradient(0, 18, 0, 46);
      g3.addColorStop(0, 'rgba(45,212,240,0)');
      g3.addColorStop(0.5, 'rgba(45,212,240,0.55)');
      g3.addColorStop(1, 'rgba(45,212,240,0)');
      x.fillStyle = g3;
      x.fillRect(0, 18, 64, 28);
      x.fillStyle = '#c9f7ff';
      x.fillRect(0, 31, 64, 3);
      x.fillStyle = '#8b6cff';
      x.fillRect(0, 6, 64, 2);
      x.fillRect(0, 56, 64, 2);
      speckle(x, r, 140, 64, 64, '#000', '#fff');
    } else if (kind === 'rack') {
      x.fillStyle = '#12141f';
      x.fillRect(0, 0, 64, 64);
      for (j = 0; j < 8; j++) {
        x.fillStyle = base;
        x.fillRect(3, 2 + j * 8, 58, 6);
        x.fillStyle = 'rgba(255,255,255,0.08)';
        x.fillRect(3, 2 + j * 8, 58, 1);
        for (i = 0; i < 6; i++) {
          var cc = r();
          x.fillStyle = cc < 0.4 ? '#34d399' : cc < 0.7 ? '#2dd4f0' : cc < 0.85 ? '#f87171' : '#3a3f55';
          x.fillRect(6 + i * 4, 4 + j * 8, 2, 2);
        }
        x.fillStyle = '#0b0c14';
        x.fillRect(36, 3 + j * 8, 22, 4);
      }
    } else if (kind === 'grate') {
      x.fillStyle = '#191c29';
      x.fillRect(0, 0, 64, 64);
      x.strokeStyle = base;
      x.lineWidth = 2;
      for (i = -64; i < 64; i += 8) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i + 64, 64);
        x.moveTo(i + 64, 0);
        x.lineTo(i, 64);
        x.stroke();
      }
      x.strokeStyle = shade(base, 0.2);
      x.lineWidth = 4;
      x.strokeRect(2, 2, 60, 60);
    }
    return c;
  }

  function darkened(src, a) {
    var c = mkCanvas(src.width, src.height);
    var x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.fillStyle = 'rgba(0,0,0,' + a + ')';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // Robot fighter, drawn on a 96×96 canvas (feet at the bottom centre).
  function drawRobot(x, color, pose, walk, back, shooting) {
    var dark = shade(color, -0.45), light = shade(color, 0.35);
    var metal = '#3b414e', metalD = '#262a33', metalL = '#5d6577';
    var lf = walk === 0 ? -3 : walk === 1 ? 3 : 0; // stride offset
    // legs
    x.fillStyle = metalD;
    x.fillRect(35, 58, 10, 30 + lf);
    x.fillRect(51, 58, 10, 30 - lf);
    x.fillStyle = metal;
    x.fillRect(36, 58, 8, 28 + lf);
    x.fillRect(52, 58, 8, 28 - lf);
    x.fillStyle = color;
    x.fillRect(34, 70 + (lf > 0 ? 2 : 0), 12, 6);
    x.fillRect(50, 70 + (lf < 0 ? 2 : 0), 12, 6);
    x.fillStyle = '#16181e';
    x.fillRect(32, 86 + lf, 14, 6);
    x.fillRect(50, 86 - lf, 14, 6);
    // hips
    x.fillStyle = metalD;
    x.fillRect(34, 54, 28, 8);
    // torso
    x.fillStyle = dark;
    x.beginPath();
    x.moveTo(26, 28);
    x.lineTo(70, 28);
    x.lineTo(63, 57);
    x.lineTo(33, 57);
    x.closePath();
    x.fill();
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(30, 29);
    x.lineTo(66, 29);
    x.lineTo(60, 54);
    x.lineTo(36, 54);
    x.closePath();
    x.fill();
    if (!back) {
      x.fillStyle = light;
      x.fillRect(34, 31, 28, 3);
      x.fillStyle = '#e8fbff';
      x.beginPath();
      x.arc(48, 42, 4.5, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.35)';
      x.beginPath();
      x.arc(48, 42, 7.5, 0, TAU);
      x.fill();
    } else {
      // backpack
      x.fillStyle = metal;
      x.fillRect(36, 31, 24, 20);
      x.fillStyle = metalL;
      x.fillRect(36, 31, 24, 3);
      x.fillStyle = color;
      x.fillRect(40, 38, 16, 3);
      x.fillRect(40, 44, 16, 3);
    }
    // shoulder pads
    x.fillStyle = dark;
    x.fillRect(17, 26, 15, 13);
    x.fillRect(64, 26, 15, 13);
    x.fillStyle = light;
    x.fillRect(18, 26, 13, 4);
    x.fillRect(65, 26, 13, 4);
    // arms
    x.fillStyle = metal;
    if (!back) {
      x.fillRect(20, 38, 9, 14);
      x.fillRect(67, 38, 9, 14);
      x.fillStyle = metalD;
      x.fillRect(26, 48, 18, 7);
      x.fillRect(52, 48, 18, 7);
      // gun held toward the viewer
      x.fillStyle = '#15171d';
      x.fillRect(40, 44, 16, 14);
      x.fillStyle = '#2c3039';
      x.fillRect(42, 46, 12, 10);
      x.fillStyle = '#000';
      x.beginPath();
      x.arc(48, 51, 3.5, 0, TAU);
      x.fill();
      if (shooting) {
        x.fillStyle = 'rgba(255,214,90,0.95)';
        x.beginPath();
        for (var k = 0; k < 16; k++) {
          var ang = (k / 16) * TAU, rr = k % 2 ? 6 : 15;
          x.lineTo(48 + Math.cos(ang) * rr, 51 + Math.sin(ang) * rr);
        }
        x.closePath();
        x.fill();
        x.fillStyle = '#fffbe6';
        x.beginPath();
        x.arc(48, 51, 5, 0, TAU);
        x.fill();
      }
    } else {
      x.fillRect(20, 38, 9, 20);
      x.fillRect(67, 38, 9, 20);
      x.fillStyle = metalD;
      x.fillRect(20, 56, 9, 5);
      x.fillRect(67, 56, 9, 5);
    }
    // head
    x.fillStyle = metalD;
    x.fillRect(38, 22, 20, 8);
    x.fillStyle = metal;
    x.beginPath();
    x.moveTo(36, 24);
    x.lineTo(36, 10);
    x.quadraticCurveTo(48, 0, 60, 10);
    x.lineTo(60, 24);
    x.closePath();
    x.fill();
    x.fillStyle = metalL;
    x.fillRect(40, 6, 16, 3);
    if (!back) {
      x.fillStyle = '#0c0e14';
      x.fillRect(38, 12, 20, 8);
      x.fillStyle = light;
      x.fillRect(39, 14, 18, 4);
      x.fillStyle = '#fff';
      x.fillRect(41, 15, 5, 1);
    } else {
      x.fillStyle = color;
      x.fillRect(44, 9, 8, 12);
    }
    // antenna
    x.fillStyle = metalD;
    x.fillRect(56, 0, 2, 9);
    x.fillStyle = color;
    x.fillRect(55, 0, 4, 3);
  }

  function makeBotFrames(color) {
    var f = {};
    function frame(fn) {
      var c = mkCanvas(96, 96);
      fn(c.getContext('2d'));
      return c;
    }
    f.walkA = frame(function (x) { drawRobot(x, color, 0, 0, false, false); });
    f.walkB = frame(function (x) { drawRobot(x, color, 0, 1, false, false); });
    f.idle = frame(function (x) { drawRobot(x, color, 0, 2, false, false); });
    f.shoot = frame(function (x) { drawRobot(x, color, 0, 2, false, true); });
    f.backA = frame(function (x) { drawRobot(x, color, 0, 0, true, false); });
    f.backB = frame(function (x) { drawRobot(x, color, 0, 1, true, false); });
    f.pain = frame(function (x) {
      drawRobot(x, color, 0, 2, false, false);
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = 'rgba(255,255,255,0.75)';
      x.fillRect(0, 0, 96, 96);
    });
    function fallen(angle, drop) {
      return frame(function (x) {
        x.translate(48, 94);
        x.rotate(angle);
        x.translate(-48, -94 + drop);
        drawRobot(x, color, 0, 2, false, false);
      });
    }
    f.fall1 = fallen(-0.55, 4);
    f.fall2 = fallen(-1.25, 10);
    f.scrap = frame(function (x) {
      var r = seeded(color.length * 97 + parseInt(color.slice(1), 16));
      x.fillStyle = 'rgba(0,0,0,0.35)';
      x.beginPath();
      x.ellipse(48, 91, 34, 5, 0, 0, TAU);
      x.fill();
      for (var i = 0; i < 14; i++) {
        x.fillStyle = i % 3 === 0 ? color : i % 3 === 1 ? '#3b414e' : '#262a33';
        var w = 8 + r() * 16, h = 5 + r() * 10;
        x.save();
        x.translate(20 + r() * 56, 90 - r() * 12);
        x.rotate((r() - 0.5) * 1.2);
        x.fillRect(-w / 2, -h, w, h);
        x.restore();
      }
      x.fillStyle = '#3b414e';
      x.beginPath();
      x.arc(38, 84, 11, Math.PI, 0);
      x.fill();
      x.fillStyle = '#0c0e14';
      x.fillRect(29, 77, 18, 5);
      x.fillStyle = shade(color, 0.3);
      x.fillRect(30, 78, 16, 3);
    });
    return f;
  }

  function makePickupSprite(type) {
    var c = mkCanvas(48, 48);
    var x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.beginPath();
    x.ellipse(24, 45, 16, 3, 0, 0, TAU);
    x.fill();
    if (type === 'h') {
      x.fillStyle = '#e8edf5';
      x.fillRect(8, 14, 32, 26);
      x.fillStyle = '#b8c0cc';
      x.fillRect(8, 36, 32, 4);
      x.fillStyle = '#22c55e';
      x.fillRect(20, 18, 8, 18);
      x.fillRect(15, 23, 18, 8);
      x.fillStyle = '#8a929f';
      x.fillRect(18, 10, 12, 4);
    } else if (type === 'a') {
      x.fillStyle = '#1d4ed8';
      x.beginPath();
      x.moveTo(24, 6);
      x.lineTo(40, 12);
      x.lineTo(38, 28);
      x.quadraticCurveTo(34, 38, 24, 43);
      x.quadraticCurveTo(14, 38, 10, 28);
      x.lineTo(8, 12);
      x.closePath();
      x.fill();
      x.fillStyle = '#60a5fa';
      x.beginPath();
      x.moveTo(24, 10);
      x.lineTo(36, 14);
      x.lineTo(34.5, 27);
      x.quadraticCurveTo(31, 35, 24, 39);
      x.closePath();
      x.fill();
      x.fillStyle = '#dbeafe';
      x.fillRect(22, 16, 4, 16);
    } else {
      x.fillStyle = '#4d5a2f';
      x.fillRect(6, 20, 36, 22);
      x.fillStyle = '#6b7d40';
      x.fillRect(6, 20, 36, 5);
      x.fillStyle = '#f5b301';
      for (var i = 0; i < 4; i++) {
        x.fillRect(10 + i * 8, 8, 5, 14);
        x.fillStyle = '#b8860b';
        x.fillRect(10 + i * 8, 8, 5, 4);
        x.fillStyle = '#f5b301';
      }
      x.fillStyle = '#1b1b1b';
      x.fillRect(16, 30, 16, 6);
    }
    return c;
  }

  function makeGlow(inner, outer, size) {
    var c = mkCanvas(size, size);
    var x = c.getContext('2d');
    var g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }

  // First-person weapon, drawn centred in a 200×200 design box (bottom = 200).
  // Returns {canvas, mx, my} where (mx,my) is the muzzle in canvas pixels.
  function makeViewModel(wi, px) {
    var s = px / 200;
    var c = mkCanvas(Math.ceil(px), Math.ceil(px));
    var x = c.getContext('2d');
    x.scale(s, s);
    function poly(pts, fill) {
      x.fillStyle = fill;
      x.beginPath();
      x.moveTo(pts[0], pts[1]);
      for (var i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
      x.closePath();
      x.fill();
    }
    function grad(y0, y1, a, b) {
      var g = x.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      return g;
    }
    function hside(x0, x1, a, b) {
      var g = x.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, a);
      g.addColorStop(0.5, b);
      g.addColorStop(1, a);
      return g;
    }
    var my = 100;
    var glove = '#2a2d35', gloveL = '#4a4f5c', sleeve = '#3c4a3a';
    function hands(yTop) {
      // two gloved hands wrapping the grip from both sides, sleeves at the bottom corners
      x.fillStyle = sleeve;
      x.beginPath();
      x.ellipse(52, 214, 34, 30, -0.4, 0, TAU);
      x.ellipse(148, 214, 34, 30, 0.4, 0, TAU);
      x.fill();
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        var hx = 100 + sgn * 27;
        x.fillStyle = glove;
        x.beginPath();
        x.ellipse(hx, yTop + 32, 20, 32, sgn * 0.35, 0, TAU);
        x.fill();
        x.strokeStyle = gloveL;
        x.lineWidth = 3;
        for (var f = 0; f < 3; f++) {
          x.beginPath();
          x.moveTo(hx - sgn * 14, yTop + 14 + f * 11);
          x.quadraticCurveTo(hx - sgn * 4, yTop + 10 + f * 11, hx + sgn * 2, yTop + 16 + f * 11);
          x.stroke();
        }
        x.fillStyle = 'rgba(255,255,255,0.12)';
        x.beginPath();
        x.ellipse(hx - sgn * 6, yTop + 22, 6, 14, sgn * 0.35, 0, TAU);
        x.fill();
      }
    }
    if (wi === 0) {
      poly([64, 200, 80, 92, 120, 92, 136, 200], hside(64, 136, '#24272e', '#5d6576'));
      poly([80, 92, 120, 92, 116, 84, 84, 84], '#7a8394');
      poly([92, 92, 108, 92, 110, 200, 90, 200], 'rgba(255,255,255,0.07)');
      for (var sl = 0; sl < 5; sl++) {
        x.fillStyle = 'rgba(0,0,0,0.35)';
        x.fillRect(70 + sl * 1.5, 150 + sl * 8, 10, 3);
        x.fillRect(120 - sl * 1.5, 150 + sl * 8, 10, 3);
      }
      x.fillStyle = '#0b0c10';
      x.beginPath();
      x.ellipse(100, 89, 9, 5, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#f5b301';
      x.fillRect(97, 78, 6, 6);
      hands(140);
      my = 84;
    } else if (wi === 1) {
      poly([38, 200, 50, 140, 74, 144, 66, 200], '#1d2026');
      poly([42, 196, 52, 146, 58, 147, 50, 198], '#2f343e');
      poly([56, 200, 74, 96, 126, 96, 144, 200], hside(56, 144, '#1c1f25', '#4a515f'));
      poly([74, 96, 126, 96, 122, 88, 78, 88], '#5d6576');
      poly([84, 92, 116, 92, 112, 46, 88, 46], hside(84, 116, '#2a2e36', '#636b7c'));
      for (var v = 0; v < 4; v++) {
        x.fillStyle = '#101216';
        x.fillRect(92, 54 + v * 9, 16, 4);
      }
      poly([88, 46, 112, 46, 110, 39, 90, 39], '#7a8394');
      x.fillStyle = '#07080b';
      x.beginPath();
      x.ellipse(100, 43, 7, 4, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#2dd4f0';
      x.fillRect(95, 104, 10, 4);
      x.fillStyle = '#15171c';
      x.fillRect(96, 62, 8, 30);
      hands(146);
      my = 37;
    } else if (wi === 2) {
      poly([58, 200, 74, 128, 126, 128, 142, 200], grad(128, 200, '#8a5a2b', '#5b3a1a'));
      for (var p = 0; p < 5; p++) {
        x.fillStyle = 'rgba(0,0,0,0.25)';
        x.fillRect(66 + p * 2, 140 + p * 12, 68 - p * 4, 3);
      }
      poly([76, 130, 86, 50, 114, 50, 124, 130], hside(76, 124, '#2b2e36', '#6a7282'));
      x.fillStyle = '#111';
      x.fillRect(99, 50, 2, 80);
      x.fillStyle = '#07080b';
      x.beginPath();
      x.arc(93, 53, 5.5, 0, TAU);
      x.arc(107, 53, 5.5, 0, TAU);
      x.fill();
      x.fillStyle = '#8a929f';
      x.fillRect(86, 47, 28, 3);
      hands(160);
      my = 46;
    } else if (wi === 3) {
      poly([82, 200, 94, 28, 106, 28, 118, 200], hside(82, 118, '#24272e', '#596070'));
      poly([74, 196, 84, 96, 116, 96, 126, 196], hside(74, 126, '#15171c', '#3a3f4a'));
      poly([84, 96, 116, 96, 112, 88, 88, 88], '#2b2f38');
      x.fillStyle = '#0b2a4a';
      x.beginPath();
      x.ellipse(100, 94, 13, 7, 0, 0, TAU);
      x.fill();
      x.fillStyle = 'rgba(120,200,255,0.7)';
      x.beginPath();
      x.ellipse(96, 92, 5, 2.5, -0.3, 0, TAU);
      x.fill();
      x.fillStyle = '#07080b';
      x.beginPath();
      x.ellipse(100, 30, 4, 2.5, 0, 0, TAU);
      x.fill();
      hands(158);
      my = 26;
    } else {
      poly([50, 200, 68, 72, 132, 72, 150, 200], hside(50, 150, '#3a4426', '#6f7d4a'));
      x.fillStyle = '#f59e0b';
      x.fillRect(64, 112, 72, 6);
      x.fillRect(60, 150, 80, 6);
      x.fillStyle = '#2a301c';
      x.beginPath();
      x.ellipse(100, 73, 32, 13, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#0a0b07';
      x.beginPath();
      x.ellipse(100, 74, 26, 10, 0, 0, TAU);
      x.fill();
      hands(166);
      my = 68;
    }
    return { canvas: c, mx: 100 * s, my: my * s, loadedTip: wi === 4 };
  }

  function makeFlash(size) {
    var c = mkCanvas(size, size);
    var x = c.getContext('2d');
    var h = size / 2;
    var g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.3, 'rgba(255,214,90,0.95)');
    g.addColorStop(0.7, 'rgba(255,120,20,0.5)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    x.fillStyle = g;
    x.beginPath();
    for (var k = 0; k < 18; k++) {
      var a = (k / 18) * TAU, rr = k % 2 ? h * 0.35 : h;
      x.lineTo(h + Math.cos(a) * rr, h + Math.sin(a) * rr);
    }
    x.closePath();
    x.fill();
    return c;
  }

  /* ================================================================== */
  /* Variant 'crypt' — "Gravewick": a retro gothic-horror campaign FPS   */
  /* ================================================================== */
  // Shares the helpers above but has its own loop and a software renderer:
  // walls, floors and ceilings are textured per pixel into a low-res
  // ImageData buffer (optionally upscaled with a chunky pixel filter),
  // lit by RGB light maps (flickering candles, braziers, stained glass,
  // moonlight) with distance shading. Sliding doors, keys, breakable
  // secret walls, exits, monsters, projectiles and a 4-level episode.
  var CR_T = 64;
  var CR_LMS = 4; // light-map sub-cells per map unit
  var CR_WALLS = ['', 'stone', 'brick', 'wood', 'niche', 'glass', 'organ', 'hedge', 'moss', 'crack'];
  var CR_WALL_CH = { '#': 1, B: 2, W: 3, N: 4, G: 5, O: 6, H: 7, M: 8, '*': 9 };
  var CR_CRACK = 9;
  var CR_DOOR = 20; // grid value for door cells
  var CR_DOOR_CH = { D: 0, S: 1, Y: 2 };
  var CR_DOOR_TEX = ['door', 'doorS', 'doorG'];
  var CR_KEY_NAMES = ['', 'Silver Key', 'Gold Key'];
  var CR_FLOOR_KINDS = ['flag', 'grass', 'planks', 'checker', 'slate', 'vault', 'beams', 'sky'];
  var CR_SKY = 7;

  // ammo '' = unlimited. use = ammo per shot.
  var CR_WEAPONS = [
    { id: 'spade', name: 'Grave Spade', ammo: '', use: 0, rate: 0.5, dmg: 34, range: 1.35, melee: true, kick: 1, shake: 2 },
    { id: 'ember', name: 'Ember Pistol', ammo: 'embers', use: 1, rate: 0.34, proj: 'ember', speed: 15, dmg: 22, burn: 2.2, kick: 0.7, shake: 2 },
    { id: 'coach', name: 'Coach Gun', ammo: 'shells', use: 2, rate: 0.95, pellets: 14, dmg: 9, spread: 0.1, range: 18, kick: 1.5, shake: 9 },
    { id: 'garlic', name: 'Garlic Bombs', ammo: 'garlic', use: 1, rate: 0.8, proj: 'garlic', speed: 8.5, dmg: 125, splash: 2.6, kick: 0.6, shake: 2 },
    { id: 'volt', name: 'Volt Crossbow', ammo: 'bolts', use: 1, rate: 0.68, proj: 'volt', speed: 30, dmg: 62, chain: 2, kick: 1, shake: 4 },
  ];
  var CR_AMMO_MAX = { embers: 90, shells: 60, garlic: 12, bolts: 40 };
  var CR_SKILLS = [
    { name: 'Mild', dmg: 0.55, hp: 0.85 },
    { name: 'Medium', dmg: 1, hp: 1 },
    { name: 'Spicy', dmg: 1.45, hp: 1.2 },
  ];
  // Monster archetypes (original designs). r = collision radius, w/h = sprite size in map units.
  var CR_FOES = {
    z: { kind: 'zealot', name: 'Hooded Zealot', hp: 45, speed: 1.9, r: 0.28, w: 0.95, h: 0.95, sight: 13, melee: 0, shot: 'hex', cd: [1.3, 2.3], pain: 0.6, range: [3.5, 7] },
    g: { kind: 'ghoul', name: 'Grumbler', hp: 80, speed: 1.3, r: 0.3, w: 0.95, h: 0.92, sight: 8, melee: 11, cd: [0.9, 1.2], pain: 0.35, range: [0, 0.7] },
    b: { kind: 'bat', name: 'Belfry Bat', hp: 14, speed: 4, r: 0.22, w: 0.6, h: 0.6, sight: 10, melee: 5, cd: [0.7, 1.1], pain: 1, fly: true, range: [0, 0.5] },
    R: { kind: 'garg', name: 'Gutter Gargoyle', hp: 150, speed: 2.5, r: 0.3, w: 0.95, h: 0.95, sight: 12, melee: 12, shot: 'rock', cd: [1.6, 2.6], pain: 0.25, fly: true, statue: true, range: [2.5, 6] },
    '!': { kind: 'boss', name: 'Grand Spout', hp: 1100, speed: 2.1, r: 0.6, w: 2, h: 2, sight: 40, melee: 22, shot: 'rock', cd: [1.2, 1.8], pain: 0.04, fly: true, boss: true, range: [4, 8] },
  };
  var CR_PICKUPS = {
    h: { name: 'a Tonic', hp: 15, cap: 100, sz: 0.34 },
    '+': { name: 'Hot Cocoa', hp: 40, cap: 150, sz: 0.36 },
    a: { name: 'the Gravekeeper’s Greatcoat', armor: 50, sz: 0.5 },
    e: { name: 'a box of embers', ammo: 'embers', n: 10, sz: 0.32 },
    s: { name: 'a box of shells', ammo: 'shells', n: 8, sz: 0.32 },
    o: { name: 'a string of garlic', ammo: 'garlic', n: 3, sz: 0.34 },
    v: { name: 'a quiver of volt bolts', ammo: 'bolts', n: 6, sz: 0.36 },
    k: { name: 'the Silver Key', key: 1, sz: 0.34 },
    K: { name: 'the Gold Key', key: 2, sz: 0.34 },
    2: { name: 'the Ember Pistol', weapon: 1, ammo: 'embers', n: 12, sz: 0.42 },
    3: { name: 'the Coach Gun', weapon: 2, ammo: 'shells', n: 12, sz: 0.55 },
    4: { name: 'Garlic Bombs', weapon: 3, ammo: 'garlic', n: 4, sz: 0.42 },
    5: { name: 'the Volt Crossbow', weapon: 4, ammo: 'bolts', n: 10, sz: 0.55 },
  };
  // Decorations: blocking props and light sources (light: [r,g,b], radius, flicker).
  var CR_DECOR = {
    c: { spr: 'candle', w: 0.62, h: 0.9, block: 0.22, light: [1.0, 0.62, 0.3], lr: 4.6, flick: true },
    f: { spr: 'brazier', w: 0.75, h: 0.8, block: 0.3, light: [1.25, 0.6, 0.22], lr: 6.2, flick: true },
    t: { spr: 'tomb', w: 0.62, h: 0.62, block: 0.24 },
  };
  var CR_MOON = [0.3, 0.34, 0.52];
  var CR_INDOOR = [0.09, 0.085, 0.105];

  // Four levels of the episode "Night Shift". Legend:
  //  walls  # stone  B brick  W wood  N catacomb niches  G stained glass  O organ  H hedge  M mossy stone
  //         * cracked wall (breakable secret)
  //  doors  D wooden door  S silver-key door  Y gold-key door
  //  things @ start  X exit  z zealot  g ghoul  b bat  R gargoyle  ! boss
  //         h tonic  + cocoa  a greatcoat  e embers  s shells  o garlic  v bolts  k/K silver/gold key
  //         2-5 weapons  c candelabra  f brazier  t tombstone
  var CR_LEVELS = [
    {
      name: 'Grave Expectations',
      sub: 'Somebody left the cemetery gates open. Again.',
      floor: 'flag', ceil: 'vault', amb: CR_INDOOR, face: 0.55,
      areas: [
        { r: [0, 0, 18, 14], floor: 'grass', ceil: 'sky', amb: CR_MOON },
        { r: [6, 8, 10, 11], floor: 'flag', ceil: 'vault', amb: CR_INDOOR },
        { r: [18, 0, 29, 12], floor: 'planks', ceil: 'beams', amb: [0.09, 0.075, 0.08] },
      ],
      map: [
        'HHHHHHHHHHHHHHHHHHWWWWWWWWWWWW',
        'H@................Wc........cW',
        'H..t..t..t..t..t..W..........G',
        'H............g....W..z.......W',
        'H..t..t..t..t..t..W..........G',
        'H........g........D..........W',
        'H..t..t..t..t..t..Wc.......3cW',
        'H...........e.....W..........G',
        'H..t..MM*MM..t..h.WWWWWDWWWWWW',
        'H.....M+.aM.......Wc...z....kW',
        'H..g..M.e.M..g....W..........W',
        'H.....MMMMM.......Wh........cW',
        'H.................WWWWWWWWWWWW',
        'H......b..........MMMMMMMMMMMM',
        'HHHHHHHHMSMHHHHHHHMMMMMMMMMMMM',
        '#########.####################',
        '##c......h......c#############',
        '##...#...g...#...###c......c##',
        '##...............###........##',
        '##.z...............D..g...X.##',
        '##...#.......#...###c..g...c##',
        '##e.....b.....s..###........##',
        '##############################',
      ],
    },
    {
      name: 'Tomb Sweet Tomb',
      sub: 'Mind the bats. And the stairs. And the other bats.',
      floor: 'flag', ceil: 'vault', amb: [0.075, 0.07, 0.09], face: 0,
      areas: [],
      map: [
        '################################',
        '#c..c#NN+.aNN###################',
        '#....#NNN*NNNNNN################',
        '#.@.........z...################',
        '#....#NNNNNNNNN.################',
        '#c..c##########.################',
        '###############.################',
        '##########NNNNNDNNNNNNN#########',
        '#k.z#...#Nc...s......cN#.......#',
        '#...#.b.#N............N#..b....#',
        '#...#..c#N..#......#..N#.....zc#',
        '##.##...#N............N#.......#',
        '#.....g..D..c...R..c..S..g.....#',
        '#.#####.#N............N#.......#',
        '#.#4..#.#N..#......#..N#####.###',
        '#.#...#.#N............N#.......#',
        '#.##.##.#Nc..z....z..cN#.e.b..K#',
        '#...g...#Ne..........eN#c...h..#',
        '#.#####.#NNNNNNYNNNNNNN#########',
        '#.#.h.#.#######.################',
        '#.#..c#.###c........c###########',
        '#b#.e.#.###..g....g..###########',
        '#.##.##.###....o.....*s.+#######',
        '#.......###....X.....###########',
        '###########c..z.....c###########',
        '################################',
        '################################',
      ],
    },
    {
      name: 'Organ Grinder',
      sub: 'The choir is practising. Badly.',
      floor: 'checker', ceil: 'vault', amb: [0.1, 0.09, 0.12], face: -Math.PI / 2,
      areas: [
        { r: [1, 8, 6, 18], floor: 'planks', ceil: 'beams' },
        { r: [25, 11, 30, 19], floor: 'planks', ceil: 'beams' },
        { r: [8, 25, 23, 29], floor: 'flag' },
      ],
      map: [
        '################################',
        '##########BBGGBBBBGGBB##########',
        '##########Bc........cB##########',
        '##########B....X.....B##########',
        '##########B.R......R.B##########',
        '##########B..........B##########',
        '##########Bc..v..h..cB##########',
        '#######BBBBWWWWYWWWWWBBBB#######',
        '#######Bc..s........o..cB#######',
        '##v.a##G....z......z....G#######',
        '##.+.##B...#........#...B#######',
        '###*###G................G#######',
        '##k..z.B....c......c....Bb....##',
        '##.....B......z.........B.....O#',
        '##..5..B...#........#...B.z...O#',
        '##.....D................S.....O#',
        '##h....B....c..R...c....B..K..O#',
        '##.g...B................Bg...hO#',
        '##..e..B...#........#...B.....##',
        '#######G................G#######',
        '#######B.....z....z.....B#######',
        '#######Gc..............cG#######',
        '#######B....b......b....B#######',
        '#######Bh..............eB#######',
        '#######BBBBBBBBDBBBBBBBBB#######',
        '###########Bc......cB###########',
        '#########+a*........B###########',
        '#########.eB...@....B###########',
        '###########Bc..h...cB###########',
        '################################',
      ],
    },
    {
      name: 'Toll Booth',
      sub: 'The big fella in the bell tower wants a word.',
      floor: 'flag', ceil: 'vault', amb: [0.07, 0.06, 0.08], face: -Math.PI / 2,
      areas: [{ r: [0, 0, 25, 16], floor: 'slate', ceil: 'sky', amb: [0.26, 0.28, 0.44] }],
      map: [
        'MMMMMMMMMMMMMMMMMMMMMMMMMM',
        'Mf......................fM',
        'M...........X............M',
        'M........................M',
        'M...##..............##...M',
        'M...##..............##...M',
        'M........................M',
        'M...........!............M',
        'Mf......................fM',
        'M........b.......b.......M',
        'M...##..............##...M',
        'M...##..............##...M',
        'M........................M',
        'M.e..........h.........v.M',
        'Ms......................oM',
        'Mf......................fM',
        'MMMMMMMMMMMMDMMMMMMMMMMMMM',
        '#########c.....c##########',
        '#########.......##########',
        '######v.*...@...##########',
        '######+a#e.....s##########',
        '#########c..h..c##########',
        '##########################',
      ],
    },
  ];
  // Loadout used when a level is started from the menu without a saved carry-over.
  var CR_DEFAULT_LOADOUT = [
    { w: [1, 1, 0, 0, 0], ammo: { embers: 30, shells: 0, garlic: 0, bolts: 0 } },
    { w: [1, 1, 1, 0, 0], ammo: { embers: 30, shells: 16, garlic: 0, bolts: 0 } },
    { w: [1, 1, 1, 1, 0], ammo: { embers: 35, shells: 20, garlic: 4, bolts: 0 } },
    { w: [1, 1, 1, 1, 1], ammo: { embers: 40, shells: 24, garlic: 5, bolts: 15 } },
  ];

  /* ---------------- crypt: procedural textures ---------------- */
  function crTexture(kind) {
    var c = mkCanvas(CR_T, CR_T), x = c.getContext('2d');
    var seedKind = kind === 'crack' ? 'stone' : kind; // the cracked wall shares the stone pattern
    var seedBase = 0;
    for (var q = 0; q < seedKind.length; q++) seedBase = (seedBase * 31 + seedKind.charCodeAt(q)) | 0;
    var r = seeded(seedBase);
    var i, j, k;
    function rect(x0, y0, w, h, col) { x.fillStyle = col; x.fillRect(x0, y0, w, h); }
    function grain(n, cols, a0, a1, w, h) {
      for (var g = 0; g < n; g++) {
        x.globalAlpha = a0 + r() * (a1 - a0);
        x.fillStyle = cols[(r() * cols.length) | 0];
        x.fillRect((r() * 64) | 0, (r() * 64) | 0, w || 1 + ((r() * 2) | 0), h || 1);
      }
      x.globalAlpha = 1;
    }
    function blocks(base, mortar, rowH, bw, off, vari) {
      rect(0, 0, 64, 64, mortar);
      for (var yy = 0; yy < 64; yy += rowH) {
        var o = (yy / rowH) % 2 ? off : 0;
        for (var xx = -bw; xx < 64 + bw; xx += bw) {
          var bx = xx + o;
          rect(bx + 1, yy + 1, bw - 2, rowH - 2, shade(base, (r() - 0.5) * vari));
          rect(bx + 1, yy + 1, bw - 2, 1, 'rgba(255,255,255,0.14)');
          rect(bx + 1, yy + 1, 1, rowH - 2, 'rgba(255,255,255,0.08)');
          rect(bx + 1, yy + rowH - 2, bw - 2, 1, 'rgba(0,0,0,0.3)');
          rect(bx + bw - 2, yy + 1, 1, rowH - 2, 'rgba(0,0,0,0.22)');
        }
      }
    }
    function stoneBase() {
      blocks('#5d6372', '#22242b', 16, 32, 16, 0.24);
      grain(420, ['#000', '#fff', '#3a3f4c'], 0.05, 0.2);
    }
    function planks(base, w, vertical) {
      for (var p = 0; p < 64 / w; p++) {
        var col = shade(base, (r() - 0.5) * 0.3);
        if (vertical) rect(p * w, 0, w - 1, 64, col); else rect(0, p * w, 64, w - 1, col);
        for (var s = 0; s < 6; s++) {
          var gc = 'rgba(0,0,0,' + (0.1 + r() * 0.15) + ')';
          if (vertical) rect(p * w + 1 + ((r() * (w - 3)) | 0), (r() * 50) | 0, 1, 6 + ((r() * 20) | 0), gc);
          else rect((r() * 50) | 0, p * w + 1 + ((r() * (w - 3)) | 0), 6 + ((r() * 20) | 0), 1, gc);
        }
        if (vertical) rect(p * w + w - 1, 0, 1, 64, 'rgba(0,0,0,0.6)'); else rect(0, p * w + w - 1, 64, 1, 'rgba(0,0,0,0.6)');
      }
    }
    if (kind === 'stone' || kind === 'crack') {
      stoneBase();
      if (kind === 'crack') {
        // a jagged, visible crack: the hint that this wall can be smashed
        x.strokeStyle = '#08080b';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(30, 0);
        var cx = 30;
        for (k = 1; k <= 8; k++) { cx += (r() - 0.5) * 14; x.lineTo(cx, k * 8); }
        x.moveTo(31, 22);
        x.lineTo(46, 30);
        x.lineTo(52, 44);
        x.moveTo(28, 40);
        x.lineTo(14, 48);
        x.lineTo(8, 60);
        x.stroke();
        x.strokeStyle = 'rgba(190,200,220,0.35)';
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(32, 1);
        x.lineTo(33, 20);
        x.stroke();
        for (k = 0; k < 10; k++) rect(20 + r() * 24, 50 + r() * 12, 2, 2, '#14151a');
      }
    } else if (kind === 'brick') {
      blocks('#7a3326', '#24171a', 8, 16, 8, 0.32);
      grain(300, ['#000', '#fff'], 0.05, 0.16);
      var gb = x.createLinearGradient(0, 40, 0, 64);
      gb.addColorStop(0, 'rgba(0,0,0,0)');
      gb.addColorStop(1, 'rgba(0,0,0,0.35)');
      x.fillStyle = gb;
      x.fillRect(0, 40, 64, 24);
    } else if (kind === 'wood') {
      planks('#5d3c23', 16, true);
      rect(0, 27, 64, 8, '#3b2414');
      rect(0, 27, 64, 1, 'rgba(255,255,255,0.12)');
      for (i = 0; i < 4; i++) {
        rect(i * 16 + 7, 4, 2, 2, '#1a120c');
        rect(i * 16 + 7, 58, 2, 2, '#1a120c');
        rect(i * 16 + 7, 30, 2, 2, '#b08a4a');
      }
    } else if (kind === 'niche') {
      blocks('#5a5662', '#1f1d22', 16, 32, 16, 0.2);
      grain(300, ['#000', '#fff'], 0.05, 0.16);
      for (i = 0; i < 2; i++) {
        var nx = 16 + i * 32;
        x.fillStyle = '#9a96a0';
        x.beginPath();
        x.moveTo(nx - 12, 52);
        x.lineTo(nx - 12, 26);
        x.arc(nx, 26, 12, Math.PI, 0);
        x.lineTo(nx + 12, 52);
        x.fill();
        x.fillStyle = '#120e12';
        x.beginPath();
        x.moveTo(nx - 10, 51);
        x.lineTo(nx - 10, 26);
        x.arc(nx, 26, 10, Math.PI, 0);
        x.lineTo(nx + 10, 51);
        x.fill();
        rect(nx - 13, 51, 26, 3, '#7c7882');
        if (i === 0) {
          // an urn
          x.fillStyle = '#8a5a34';
          x.beginPath();
          x.ellipse(nx, 44, 6, 7, 0, 0, TAU);
          x.fill();
          rect(nx - 3, 34, 6, 4, '#8a5a34');
          rect(nx - 4, 33, 8, 2, '#a8744a');
          rect(nx - 4, 42, 8, 2, '#c9a24a');
        } else {
          // a candle stub
          rect(nx - 2, 38, 5, 13, '#e8e0c8');
          x.fillStyle = '#ffcf5a';
          x.beginPath();
          x.ellipse(nx + 0.5, 34, 2.2, 4, 0, 0, TAU);
          x.fill();
          rect(nx, 35, 1, 2, '#fff6d0');
        }
      }
    } else if (kind === 'glass') {
      blocks('#5b6170', '#22242b', 16, 32, 16, 0.2);
      x.save();
      x.beginPath();
      x.moveTo(12, 62);
      x.lineTo(12, 26);
      x.arc(32, 26, 20, Math.PI, 0);
      x.lineTo(52, 62);
      x.closePath();
      x.fillStyle = '#121218';
      x.fill();
      x.clip();
      var pal = ['#c62f3a', '#2f5fd0', '#e0b030', '#2f9a5a', '#8a3fc0', '#3fb0d0'];
      for (j = 0; j < 9; j++)
        for (i = 0; i < 6; i++) {
          x.fillStyle = pal[(i * 3 + j * 2 + ((i + j) % 2)) % pal.length];
          x.fillRect(12 + i * 7 + 1, 6 + j * 7 + 1, 6, 6);
        }
      x.fillStyle = '#e0b030';
      x.beginPath();
      x.arc(32, 22, 9, 0, TAU);
      x.fill();
      x.fillStyle = '#c62f3a';
      x.beginPath();
      x.arc(32, 22, 5, 0, TAU);
      x.fill();
      x.strokeStyle = '#121218';
      x.lineWidth = 1;
      for (k = 0; k < 8; k++) {
        x.beginPath();
        x.moveTo(32, 22);
        x.lineTo(32 + Math.cos((k / 8) * TAU) * 9, 22 + Math.sin((k / 8) * TAU) * 9);
        x.stroke();
      }
      x.restore();
      x.strokeStyle = '#3a3e4a';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(12, 62);
      x.lineTo(12, 26);
      x.arc(32, 26, 20, Math.PI, 0);
      x.lineTo(52, 62);
      x.stroke();
    } else if (kind === 'organ') {
      rect(0, 0, 64, 64, '#24160e');
      planks('#2e1c10', 16, true);
      var hs = [30, 38, 46, 54, 54, 46, 38, 30];
      for (i = 0; i < 8; i++) {
        var top = 52 - hs[i], pxx = i * 8 + 1;
        var gp = x.createLinearGradient(pxx, 0, pxx + 6, 0);
        gp.addColorStop(0, '#6b5414');
        gp.addColorStop(0.45, '#f0cf6a');
        gp.addColorStop(1, '#7a5f18');
        x.fillStyle = gp;
        x.fillRect(pxx, top, 6, hs[i]);
        rect(pxx, top, 6, 2, '#fff0b0');
        x.fillStyle = '#1a1006';
        x.beginPath();
        x.moveTo(pxx + 1, top + hs[i] - 10);
        x.lineTo(pxx + 5, top + hs[i] - 10);
        x.lineTo(pxx + 3, top + hs[i] - 6);
        x.fill();
      }
      rect(0, 52, 64, 12, '#3b2414');
      rect(0, 52, 64, 2, '#c9a24a');
      for (i = 0; i < 8; i++) rect(i * 8 + 3, 57, 2, 4, '#1a0f08');
    } else if (kind === 'hedge') {
      rect(0, 0, 64, 64, '#10261a');
      for (i = 0; i < 520; i++) {
        x.fillStyle = ['#1d4a2a', '#24572f', '#163b22', '#2f6a37', '#0d2216'][(r() * 5) | 0];
        x.beginPath();
        x.ellipse(r() * 64, r() * 64, 1.5 + r() * 2.6, 1 + r() * 1.6, r() * 3, 0, TAU);
        x.fill();
      }
      for (i = 0; i < 26; i++) rect((r() * 64) | 0, (r() * 64) | 0, 1, 1, '#6aa86a');
    } else if (kind === 'moss') {
      blocks('#5a6153', '#1f231e', 16, 32, 16, 0.22);
      grain(300, ['#000', '#fff'], 0.05, 0.16);
      for (i = 0; i < 30; i++) {
        x.fillStyle = r() < 0.5 ? '#3f6b2c' : '#2c5222';
        x.globalAlpha = 0.75;
        var mx = (r() * 64) | 0;
        x.fillRect(mx, 0, 2 + ((r() * 4) | 0), (4 + r() * 24) | 0);
        x.fillRect((r() * 64) | 0, 60 - ((r() * 10) | 0), 3 + ((r() * 5) | 0), 10);
      }
      x.globalAlpha = 1;
    } else if (kind === 'door' || kind === 'doorS' || kind === 'doorG') {
      planks('#5a371f', 16, true);
      var band = kind === 'door' ? '#2c2c33' : kind === 'doorS' ? '#c9cdd8' : '#d8a92c';
      var bandD = kind === 'door' ? '#16161a' : kind === 'doorS' ? '#7d828f' : '#8a6512';
      rect(0, 0, 64, 3, '#20140b');
      rect(0, 61, 64, 3, '#20140b');
      for (k = 0; k < 2; k++) {
        var by = k ? 46 : 12;
        rect(0, by, 64, 6, band);
        rect(0, by + 5, 64, 1, bandD);
        for (i = 0; i < 6; i++) rect(4 + i * 11, by + 2, 2, 2, bandD);
      }
      if (kind === 'door') {
        x.strokeStyle = '#2c2c33';
        x.lineWidth = 2;
        x.beginPath();
        x.arc(46, 33, 5, 0, TAU);
        x.stroke();
        rect(44, 26, 4, 3, '#16161a');
      } else {
        x.fillStyle = band;
        x.beginPath();
        x.arc(32, 32, 10, 0, TAU);
        x.fill();
        x.fillStyle = bandD;
        x.beginPath();
        x.arc(32, 32, 10, 0, TAU);
        x.lineWidth = 2;
        x.strokeStyle = bandD;
        x.stroke();
        // keyhole
        x.fillStyle = '#0c0806';
        x.beginPath();
        x.arc(32, 29, 3.2, 0, TAU);
        x.fill();
        x.beginPath();
        x.moveTo(30, 30);
        x.lineTo(34, 30);
        x.lineTo(35, 38);
        x.lineTo(29, 38);
        x.fill();
      }
    } else if (kind === 'flag') {
      rect(0, 0, 64, 64, '#1d1b19');
      var cells = [[0, 0, 22, 18], [22, 0, 20, 14], [42, 0, 22, 20], [0, 18, 16, 24], [16, 14, 28, 20], [44, 20, 20, 22], [0, 42, 26, 22], [26, 34, 18, 30], [44, 42, 20, 22]];
      for (i = 0; i < cells.length; i++) {
        var cc = cells[i];
        rect(cc[0] + 1, cc[1] + 1, cc[2] - 2, cc[3] - 2, shade('#5b554c', (r() - 0.5) * 0.3));
        rect(cc[0] + 1, cc[1] + 1, cc[2] - 2, 1, 'rgba(255,255,255,0.1)');
      }
      grain(500, ['#000', '#fff', '#3d3a34'], 0.05, 0.18);
    } else if (kind === 'grass') {
      rect(0, 0, 64, 64, '#1b3319');
      grain(900, ['#284a24', '#14290f', '#37612f', '#22401e'], 0.5, 1, 1, 2);
      for (i = 0; i < 10; i++) rect((r() * 64) | 0, (r() * 64) | 0, 2, 2, '#3a3226');
    } else if (kind === 'planks') {
      planks('#4e321d', 8, false);
      for (i = 0; i < 8; i++) rect(((r() * 60) | 0) + (i % 2) * 32, i * 8 + 3, 2, 2, '#1a120c');
    } else if (kind === 'checker') {
      for (j = 0; j < 2; j++)
        for (i = 0; i < 2; i++) {
          var light = (i + j) % 2 === 0;
          rect(i * 32, j * 32, 32, 32, light ? '#c9c3b6' : '#27232c');
          for (k = 0; k < 3; k++) {
            x.strokeStyle = light ? 'rgba(120,110,100,0.35)' : 'rgba(140,130,160,0.25)';
            x.lineWidth = 1;
            x.beginPath();
            x.moveTo(i * 32 + r() * 32, j * 32);
            x.quadraticCurveTo(i * 32 + r() * 32, j * 32 + 16, i * 32 + r() * 32, j * 32 + 32);
            x.stroke();
          }
        }
      rect(0, 31, 64, 1, 'rgba(0,0,0,0.35)');
      rect(31, 0, 1, 64, 'rgba(0,0,0,0.35)');
    } else if (kind === 'slate') {
      rect(0, 0, 64, 64, '#1a1d24');
      for (j = 0; j < 8; j++)
        for (i = -1; i < 5; i++) {
          var sx = i * 16 + (j % 2 ? 8 : 0);
          x.fillStyle = shade('#46505f', (r() - 0.5) * 0.3);
          x.beginPath();
          x.moveTo(sx + 1, j * 8);
          x.lineTo(sx + 15, j * 8);
          x.lineTo(sx + 15, j * 8 + 5);
          x.quadraticCurveTo(sx + 8, j * 8 + 9, sx + 1, j * 8 + 5);
          x.fill();
        }
      grain(250, ['#000', '#fff'], 0.05, 0.14);
    } else if (kind === 'vault') {
      blocks('#3c3a42', '#18171c', 16, 32, 16, 0.2);
      rect(0, 30, 64, 4, '#55525c');
      rect(30, 0, 4, 64, '#55525c');
      grain(260, ['#000', '#fff'], 0.04, 0.12);
    } else if (kind === 'beams') {
      planks('#2f1f14', 8, false);
      rect(0, 0, 64, 12, '#1d130c');
      rect(0, 11, 64, 1, 'rgba(255,255,255,0.08)');
      rect(0, 32, 64, 12, '#1d130c');
      rect(0, 43, 64, 1, 'rgba(255,255,255,0.08)');
    }
    return c;
  }

  // Canvas → Uint32 pixels (0xAABBGGRR on little-endian, which every browser uses).
  function crPixels(c) {
    var d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    return new Uint32Array(d.data.buffer);
  }

  // Night-sky panorama for outdoor areas (wraps horizontally).
  function crSky() {
    var w = 512, h = 96;
    var c = mkCanvas(w, h), x = c.getContext('2d'), r = seeded(4242);
    var gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#05061a');
    gr.addColorStop(0.55, '#171640');
    gr.addColorStop(1, '#3b2c5e');
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
    for (var i = 0; i < 160; i++) {
      x.fillStyle = r() < 0.2 ? '#fff6c8' : '#c8d0ff';
      x.globalAlpha = 0.35 + r() * 0.65;
      x.fillRect((r() * w) | 0, (r() * h * 0.7) | 0, 1, 1);
    }
    x.globalAlpha = 1;
    // the moon
    var mg = x.createRadialGradient(140, 26, 2, 140, 26, 34);
    mg.addColorStop(0, 'rgba(255,250,220,0.55)');
    mg.addColorStop(1, 'rgba(255,250,220,0)');
    x.fillStyle = mg;
    x.fillRect(100, 0, 80, 64);
    x.fillStyle = '#f4efd2';
    x.beginPath();
    x.arc(140, 26, 12, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(190,180,150,0.45)';
    x.beginPath();
    x.arc(136, 22, 2.4, 0, TAU);
    x.fill();
    x.beginPath();
    x.arc(145, 29, 1.8, 0, TAU);
    x.fill();
    // wispy clouds
    for (i = 0; i < 14; i++) {
      x.fillStyle = 'rgba(70,55,110,' + (0.25 + r() * 0.3) + ')';
      var cx = r() * w, cy = 20 + r() * 50, cw = 30 + r() * 70;
      x.beginPath();
      x.ellipse(cx, cy, cw, 3 + r() * 4, 0, 0, TAU);
      x.ellipse(cx > w / 2 ? cx - w : cx + w, cy, cw, 4, 0, 0, TAU);
      x.fill();
    }
    // distant silhouette: hills, bare trees and spires
    x.fillStyle = '#0a0812';
    x.beginPath();
    x.moveTo(0, h);
    for (var sx = 0; sx <= w; sx += 8) x.lineTo(sx, h - 10 - Math.sin(sx * 0.031) * 4 - Math.sin(sx * 0.09) * 2);
    x.lineTo(w, h);
    x.fill();
    for (i = 0; i < 9; i++) {
      var tx = (i * 57 + 20) % w, th = 10 + (i % 3) * 6;
      if (i % 3 === 0) {
        // spire
        x.fillRect(tx - 3, h - 10 - th, 6, th);
        x.beginPath();
        x.moveTo(tx - 4, h - 10 - th);
        x.lineTo(tx, h - 24 - th);
        x.lineTo(tx + 4, h - 10 - th);
        x.fill();
      } else {
        x.fillRect(tx, h - 10 - th, 2, th);
        x.strokeStyle = '#0a0812';
        x.lineWidth = 1;
        for (var b = 0; b < 4; b++) {
          x.beginPath();
          x.moveTo(tx + 1, h - 12 - th + b * 3);
          x.lineTo(tx + 1 + (b % 2 ? 6 : -6), h - 18 - th + b * 3);
          x.stroke();
        }
      }
    }
    return { w: w, h: h, d: crPixels(c) };
  }

  /* ---------------- crypt: procedural sprites ---------------- */
  // Each sprite is drawn twice: the full picture, then (glow=true) only its
  // self-lit parts (eyes, flames). Glowing pixels are tagged with alpha 0xFE
  // so the renderer draws them at full brightness in the dark.
  function crSprite(w, h, draw) {
    var c = mkCanvas(w, h), x = c.getContext('2d');
    draw(x, false);
    var base = crPixels(c);
    var e = mkCanvas(w, h), ex = e.getContext('2d');
    draw(ex, true);
    var glow = crPixels(e);
    var out = new Uint32Array(w * h);
    for (var i = 0; i < out.length; i++) {
      if (glow[i] >>> 24 >= 110) out[i] = (glow[i] & 0xffffff) | 0xfe000000;
      else if (base[i] >>> 24 >= 128) out[i] = (base[i] & 0xffffff) | 0xff000000;
    }
    return { w: w, h: h, d: out };
  }
  function crEll(x, cx, cy, rx, ry, col, rot) {
    x.fillStyle = col;
    x.beginPath();
    x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
    x.fill();
  }
  function crPoly(x, pts, col) {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
    x.closePath();
    x.fill();
  }
  function crFlame(x, cx, cy, s, inner, outer) {
    crEll(x, cx, cy, 2.6 * s, 4.6 * s, outer || '#ff8a1e');
    crPoly(x, [cx - 2 * s, cy - 2 * s, cx, cy - 8 * s, cx + 2 * s, cy - 2 * s], outer || '#ff8a1e');
    crEll(x, cx, cy + 0.5 * s, 1.3 * s, 2.6 * s, inner || '#fff2b0');
  }

  // Hooded Zealot. f: 0/1 walk, 2 throw, 3 slump, 4 empty robe on the floor
  function crZealot(x, f, glow) {
    var robe = '#4c2a6c', robeD = '#2c1842', robeL = '#6d42a0', trim = '#d4a62a';
    if (f === 4) {
      if (glow) return;
      crEll(x, 32, 59, 22, 5, robeD);
      crEll(x, 29, 56, 16, 5, robe);
      crPoly(x, [38, 56, 54, 50, 50, 58], robeD);
      x.fillStyle = '#e8e0c8';
      x.fillRect(12, 56, 9, 3);
      return;
    }
    var sw = f === 0 ? -2 : f === 1 ? 2 : 0;
    var dy = f === 3 ? 14 : 0;
    if (!glow) {
      // feet
      x.fillStyle = '#1a1020';
      x.fillRect(24 + sw, 58, 7, 5);
      x.fillRect(34 - sw, 58, 7, 5);
      // robe
      crPoly(x, [21, 24 + dy, 43, 24 + dy, 50 + sw, 60, 14 + sw, 60], robe);
      crPoly(x, [32, 26 + dy, 38, 26 + dy, 44 + sw, 60, 34 + sw, 60], robeD);
      x.fillStyle = trim;
      x.fillRect(15 + sw, 57, 35, 2);
      x.fillRect(31, 28 + dy, 2, 28 - dy);
      // hood
      crPoly(x, [20, 30 + dy, 32, 2 + dy * 1.3, 44, 30 + dy], robeL);
      crPoly(x, [23, 29 + dy, 32, 8 + dy * 1.3, 41, 29 + dy], robe);
      crEll(x, 32, 21 + dy, 7, 7, '#0e0812');
      // sleeves / arms
      if (f === 2) {
        crPoly(x, [40, 28, 46, 26, 54, 8, 49, 6], robe);
        crEll(x, 51, 7, 3.4, 3, '#c8a888');
        crPoly(x, [24, 30, 18, 42, 22, 46, 28, 34], robe);
      } else {
        crPoly(x, [21, 28 + dy, 15, 42 + dy, 21, 44 + dy, 26, 32 + dy], robe);
        crPoly(x, [43, 28 + dy, 49, 40 + dy, 44, 43 + dy, 38, 32 + dy], robe);
        crEll(x, 46, 41 + dy, 3.2, 3, '#c8a888');
        x.fillStyle = '#e8e0c8';
        x.fillRect(45, 30 + dy, 3, 10);
      }
    }
    // glowing eyes and candle flame
    x.fillStyle = '#ffd84a';
    x.fillRect(28, 20 + dy, 3, 2);
    x.fillRect(34, 20 + dy, 3, 2);
    if (f === 2) crFlame(x, 51, 2, 1.3, '#f4d0ff', '#b04cff');
    else if (f !== 3) crFlame(x, 46.5, 26 + dy, 0.8);
  }

  // Grumbler (ghoul). f: 0/1 walk, 2 swipe, 3 kneel, 4 dust pile
  function crGhoul(x, f, glow) {
    if (glow) return;
    var skin = '#86a372', skinD = '#5f7c52', rag = '#5e4a3a', ragD = '#3c2f25';
    if (f === 4) {
      crEll(x, 32, 59, 20, 5, '#4a4238');
      crEll(x, 32, 56, 13, 6, '#6a5f50');
      crPoly(x, [20, 58, 30, 50, 36, 58], rag);
      crEll(x, 38, 52, 4, 3, skinD);
      return;
    }
    var sw = f === 0 ? 3 : f === 1 ? -3 : 0;
    var dy = f === 3 ? 12 : 0;
    // legs
    x.fillStyle = ragD;
    x.fillRect(22 + sw, 46 + dy, 7, 16 - dy);
    x.fillRect(36 - sw, 46 + dy, 7, 16 - dy);
    x.fillStyle = skinD;
    x.fillRect(20 + sw, 59, 10, 4);
    x.fillRect(35 - sw, 59, 10, 4);
    // hunched body
    crEll(x, 32, 38 + dy, 16, 13, rag);
    crEll(x, 30, 34 + dy, 12, 9, '#6e5847');
    crPoly(x, [18, 46 + dy, 24, 52 + dy, 28, 46 + dy, 34, 53 + dy, 38, 46 + dy, 44, 52 + dy, 46, 44 + dy], rag);
    // arms
    if (f === 2) {
      crPoly(x, [18, 32, 22, 30, 12, 8, 8, 10], skin);
      crPoly(x, [46, 32, 42, 30, 52, 8, 56, 10], skin);
      for (var k = 0; k < 3; k++) {
        x.fillStyle = '#e8e4d0';
        x.fillRect(6 + k * 3, 4, 2, 5);
        x.fillRect(51 + k * 3, 4, 2, 5);
      }
    } else {
      crPoly(x, [20, 30 + dy, 25, 32 + dy, 18 + sw, 54 + dy, 13 + sw, 52 + dy], skin);
      crPoly(x, [44, 30 + dy, 39, 32 + dy, 46 - sw, 54 + dy, 51 - sw, 52 + dy], skin);
      crEll(x, 15 + sw, 54 + dy, 4, 3, skinD);
      crEll(x, 49 - sw, 54 + dy, 4, 3, skinD);
    }
    // head (forward and low), big cartoon eyes and a goofy grin
    var hy = f === 3 ? 30 : 22;
    crEll(x, 32, hy + dy * 0.3, 11, 10, skin);
    crEll(x, 32, hy + 4 + dy * 0.3, 9, 5, skinD);
    crEll(x, 27, hy - 2, 4, 4.2, '#f4f1e0');
    crEll(x, 37, hy - 2, 4, 4.2, '#f4f1e0');
    x.fillStyle = '#1a1410';
    x.fillRect(f === 2 ? 26 : 27, hy - 2, 2, 2);
    x.fillRect(f === 2 ? 38 : 36, hy - 2, 2, 2);
    x.fillStyle = '#2a1a14';
    if (f === 2) crEll(x, 32, hy + 6, 5, 3.5, '#2a1a14');
    else x.fillRect(26, hy + 5, 12, 2);
    x.fillStyle = '#f4f1e0';
    x.fillRect(28, hy + 5, 2, 2);
    x.fillRect(34, hy + 5, 2, 2);
  }

  // Belfry Bat. f: 0 wings up, 1 wings down, 2 puff
  function crBat(x, f, glow) {
    if (f === 2) {
      if (glow) return;
      crEll(x, 30, 34, 9, 8, 'rgba(150,140,170,0.9)');
      crEll(x, 38, 30, 7, 6, 'rgba(180,170,200,0.9)');
      crEll(x, 26, 28, 5, 5, 'rgba(130,120,150,0.9)');
      return;
    }
    if (!glow) {
      var wy = f === 0 ? 14 : 46;
      var body = '#3a2848', wing = '#4f3566';
      crPoly(x, [30, 30, 4, wy, 10, 34, 16, 30, 20, 38, 26, 34], wing);
      crPoly(x, [34, 30, 60, wy, 54, 34, 48, 30, 44, 38, 38, 34], wing);
      crEll(x, 32, 33, 6, 8, body);
      crPoly(x, [27, 27, 28, 19, 31, 26], body);
      crPoly(x, [37, 27, 36, 19, 33, 26], body);
      x.fillStyle = '#f4f1e0';
      x.fillRect(30, 37, 1, 2);
      x.fillRect(33, 37, 1, 2);
    }
    x.fillStyle = '#ff4a3a';
    x.fillRect(29, 30, 2, 2);
    x.fillRect(33, 30, 2, 2);
  }

  // Gargoyle (also the boss with a bronze palette). f: 0 statue, 1/2 fly, 3 spit, 4 rubble
  function crGargoyle(x, f, glow, boss) {
    var st = boss ? '#5f8064' : '#8a8f99', stD = boss ? '#3b5a42' : '#5a5f6a', stL = boss ? '#8fb08f' : '#b4b9c4';
    var horn = boss ? '#e0b030' : stL;
    if (f === 4) {
      if (glow) return;
      for (var k = 0; k < 9; k++) crEll(x, 14 + ((k * 37) % 36), 58 - (k % 3) * 4, 6 + (k % 3), 4 + (k % 2), k % 2 ? st : stD, k);
      crEll(x, 32, 50, 7, 6, stL);
      return;
    }
    var awake = f > 0;
    if (!glow) {
      if (f === 0) {
        // folded wings behind a crouching body
        crPoly(x, [14, 20, 8, 46, 22, 40], stD);
        crPoly(x, [50, 20, 56, 46, 42, 40], stD);
        crEll(x, 32, 44, 15, 12, st);
        x.fillStyle = stD;
        x.fillRect(18, 52, 9, 11);
        x.fillRect(37, 52, 9, 11);
        crEll(x, 22, 46, 5, 4, stL);
        crEll(x, 42, 46, 5, 4, stL);
      } else {
        var up = f === 1;
        crPoly(x, [24, 30, 2, up ? 6 : 40, 6, up ? 22 : 46, 12, up ? 20 : 44, 16, up ? 30 : 48, 22, 40], stD);
        crPoly(x, [40, 30, 62, up ? 6 : 40, 58, up ? 22 : 46, 52, up ? 20 : 44, 48, up ? 30 : 48, 42, 40], stD);
        crEll(x, 32, 38, 11, 13, st);
        crPoly(x, [32, 48, 46, 60, 50, 56, 36, 46], stD);
        x.fillStyle = stD;
        x.fillRect(25, 48, 5, 12);
        x.fillRect(34, 48, 5, 12);
      }
      // head with horns and pointy ears
      var hy = f === 0 ? 30 : 22;
      crPoly(x, [24, hy - 4, 18, hy - 16, 27, hy - 7], horn);
      crPoly(x, [40, hy - 4, 46, hy - 16, 37, hy - 7], horn);
      crEll(x, 32, hy, 9, 8, st);
      crPoly(x, [23, hy - 1, 15, hy - 4, 24, hy + 3], stD);
      crPoly(x, [41, hy - 1, 49, hy - 4, 40, hy + 3], stD);
      crEll(x, 32, hy + 4, 6, 3.5, stL);
      x.fillStyle = '#1a1a20';
      if (f === 3) crEll(x, 32, hy + 5, 4, 3, '#2a0c06');
      else x.fillRect(28, hy + 5, 8, 1);
      if (!awake) {
        x.fillRect(27, hy - 2, 3, 1);
        x.fillRect(34, hy - 2, 3, 1);
      }
      x.fillStyle = '#f4f1e0';
      x.fillRect(28, hy + 3, 1, 2);
      x.fillRect(35, hy + 3, 1, 2);
    }
    if (awake) {
      var hy2 = 22;
      x.fillStyle = boss ? '#ffe04a' : '#ff9a2a';
      x.fillRect(27, hy2 - 3, 3, 2);
      x.fillRect(34, hy2 - 3, 3, 2);
      if (f === 3) crEll(x, 32, hy2 + 5, 3, 2.2, '#ffb030');
    }
  }

  function crMakeSprites() {
    var S = {};
    function frames(n, fn, w, h) {
      var a = [];
      for (var i = 0; i < n; i++) (function (f) { a.push(crSprite(w || 64, h || 64, function (x, g) { fn(x, f, g); })); })(i);
      return a;
    }
    S.zealot = frames(5, crZealot);
    S.ghoul = frames(5, crGhoul);
    S.bat = frames(3, crBat);
    S.garg = frames(5, function (x, f, g) { crGargoyle(x, f, g, false); });
    S.boss = frames(5, function (x, f, g) { x.scale(2, 2); crGargoyle(x, f, g, true); }, 128, 128);
    function one(w, h, fn) { return crSprite(w, h, fn); }
    // projectiles (all self-lit)
    S.hex = one(16, 16, function (x) { crFlame(x, 8, 10, 1, '#f4d0ff', '#a040ff'); });
    S.ember = one(16, 16, function (x) { crEll(x, 8, 8, 5, 5, '#ff7a1a'); crEll(x, 8, 8, 3, 3, '#fff2b0'); });
    S.rock = one(16, 16, function (x) { crEll(x, 8, 8, 5.5, 5, '#ff8a2a'); crEll(x, 7, 7, 3.5, 3, '#ffd27a'); });
    S.volt = one(16, 16, function (x) { crPoly(x, [8, 1, 12, 8, 8, 15, 4, 8], '#7ad7ff'); crPoly(x, [8, 4, 10, 8, 8, 12, 6, 8], '#ffffff'); });
    S.garlic = one(16, 16, function (x, g) {
      if (!g) { crEll(x, 8, 10, 5.5, 5, '#efe8d6'); x.fillStyle = '#c9bfa6'; x.fillRect(7, 6, 1, 9); x.fillRect(5, 8, 1, 6); x.fillRect(10, 8, 1, 6); }
      x.fillStyle = '#ffd84a';
      x.fillRect(8, 1, 2, 3);
    });
    // pickups
    S.pick = {};
    S.pick.h = one(32, 32, function (x, g) {
      if (g) return;
      x.fillStyle = '#2a8a4a'; x.beginPath(); x.ellipse(16, 22, 8, 9, 0, 0, TAU); x.fill();
      x.fillRect(13, 6, 6, 9);
      x.fillStyle = '#9a6a3a'; x.fillRect(13, 3, 6, 4);
      x.fillStyle = '#f4e8c0'; x.fillRect(10, 20, 12, 6);
      x.fillStyle = '#c62f3a'; x.fillRect(15, 21, 2, 4); x.fillRect(14, 22, 4, 2);
      x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(11, 15, 2, 6);
    });
    S.pick['+'] = one(32, 32, function (x, g) {
      if (g) return;
      x.fillStyle = '#b8402e'; x.fillRect(7, 12, 16, 18);
      x.fillStyle = '#8a2c20'; x.fillRect(7, 27, 16, 3);
      x.strokeStyle = '#b8402e'; x.lineWidth = 3; x.beginPath(); x.arc(24, 20, 4, -1.4, 1.4); x.stroke();
      x.fillStyle = '#f4ead8'; x.fillRect(7, 11, 16, 3);
      x.fillStyle = '#6a3a1e'; x.fillRect(8, 12, 14, 1);
      x.fillStyle = 'rgba(240,240,255,0.8)'; x.fillRect(11, 3, 2, 6); x.fillRect(16, 1, 2, 8);
      x.fillStyle = '#f4ead8'; x.fillRect(10, 16, 10, 2);
    });
    S.pick.a = one(32, 40, function (x, g) {
      if (g) return;
      crPoly(x, [10, 6, 22, 6, 28, 38, 4, 38], '#3a2a20');
      crPoly(x, [16, 6, 22, 6, 18, 38, 16, 38], '#2a1e16');
      crPoly(x, [10, 6, 16, 14, 12, 22], '#5a4434');
      crPoly(x, [22, 6, 16, 14, 20, 22], '#5a4434');
      x.fillStyle = '#d4a62a'; x.fillRect(15, 18, 2, 2); x.fillRect(15, 25, 2, 2); x.fillRect(15, 32, 2, 2);
      x.fillStyle = '#6a6a72'; x.fillRect(15, 1, 2, 5);
    });
    S.pick.e = one(32, 32, function (x, g) {
      if (!g) { x.fillStyle = '#8a1e1e'; x.fillRect(5, 12, 22, 16); x.fillStyle = '#b02a2a'; x.fillRect(5, 12, 22, 4); }
      crFlame(x, 16, 22, 0.8);
    });
    S.pick.s = one(32, 32, function (x, g) {
      if (g) return;
      x.fillStyle = '#6a4a22'; x.fillRect(4, 16, 24, 13);
      for (var i = 0; i < 4; i++) {
        x.fillStyle = '#c62f3a'; x.fillRect(6 + i * 5, 6, 4, 11);
        x.fillStyle = '#d4a62a'; x.fillRect(6 + i * 5, 14, 4, 4);
      }
      x.fillStyle = '#8a6a32'; x.fillRect(4, 16, 24, 3);
    });
    S.pick.o = one(32, 32, function (x, g) {
      if (g) return;
      for (var i = 0; i < 3; i++) {
        crEll(x, 9 + i * 7, 20 + (i % 2) * 3, 5, 5.5, '#efe8d6');
        x.fillStyle = '#c9bfa6'; x.fillRect(9 + i * 7, 16 + (i % 2) * 3, 1, 8);
        crPoly(x, [8 + i * 7, 15 + (i % 2) * 3, 9 + i * 7, 9, 10 + i * 7, 15 + (i % 2) * 3], '#a8b878');
      }
    });
    S.pick.v = one(32, 32, function (x, g) {
      if (!g) { crPoly(x, [9, 12, 23, 12, 21, 30, 11, 30], '#5a3a22'); x.fillStyle = '#3a2416'; x.fillRect(9, 12, 14, 3); x.fillStyle = '#8a7a6a'; x.fillRect(12, 4, 1, 9); x.fillRect(16, 2, 1, 11); x.fillRect(20, 4, 1, 9); }
      x.fillStyle = '#7ad7ff'; x.fillRect(11, 2, 3, 3); x.fillRect(15, 0, 3, 3); x.fillRect(19, 2, 3, 3);
    });
    function key(col, colD) {
      return one(32, 32, function (x, g) {
        if (g) return;
        x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(16, 9, 6, 0, TAU); x.stroke();
        x.fillStyle = col; x.fillRect(14, 14, 4, 15); x.fillRect(18, 22, 5, 3); x.fillRect(18, 26, 4, 3);
        x.fillStyle = colD; x.fillRect(14, 14, 1, 15);
        x.fillStyle = '#fff'; x.fillRect(12, 5, 2, 2);
      });
    }
    S.pick.k = key('#d8dce6', '#8a8f9c');
    S.pick.K = key('#ffcf3a', '#a87a12');
    S.pick[2] = one(48, 32, function (x, g) {
      if (g) return;
      x.fillStyle = '#e0682b'; x.fillRect(6, 10, 30, 9);
      x.fillStyle = '#b84a1a'; x.fillRect(6, 16, 30, 3);
      crEll(x, 36, 14, 4, 6, '#2a1a10');
      crPoly(x, [10, 18, 20, 18, 16, 30, 8, 30], '#4a2a16');
      x.fillStyle = '#d4a62a'; x.fillRect(20, 19, 4, 4);
    });
    S.pick[3] = one(64, 24, function (x, g) {
      if (g) return;
      x.fillStyle = '#2a2c34'; x.fillRect(16, 7, 44, 4); x.fillRect(16, 11, 44, 3);
      x.fillStyle = '#6a6e7a'; x.fillRect(16, 7, 44, 1);
      crPoly(x, [2, 14, 18, 8, 22, 15, 6, 22], '#6a3e1e');
      x.fillStyle = '#7a4a26'; x.fillRect(24, 14, 16, 4);
    });
    S.pick[4] = one(40, 32, function (x, g) {
      for (var i = 0; i < 3; i++) {
        if (!g) { crEll(x, 10 + i * 10, 20, 7, 8, '#efe8d6'); x.fillStyle = '#c9bfa6'; x.fillRect(10 + i * 10, 14, 1, 12); x.fillStyle = '#4a3a22'; x.fillRect(10 + i * 10, 6, 1, 7); }
        x.fillStyle = '#ffd84a'; x.fillRect(9 + i * 10, 3, 3, 3);
      }
    });
    S.pick[5] = one(64, 32, function (x, g) {
      if (!g) {
        x.fillStyle = '#5a3a22'; x.fillRect(8, 14, 46, 5);
        x.strokeStyle = '#3a3e4a'; x.lineWidth = 3; x.beginPath(); x.moveTo(44, 2); x.quadraticCurveTo(52, 16, 44, 30); x.stroke();
        x.strokeStyle = '#c9cdd8'; x.lineWidth = 1; x.beginPath(); x.moveTo(44, 2); x.lineTo(30, 16); x.lineTo(44, 30); x.stroke();
        x.fillStyle = '#b87333'; x.fillRect(20, 12, 3, 9); x.fillRect(26, 12, 3, 9);
      }
      x.fillStyle = '#7ad7ff'; x.fillRect(54, 15, 6, 3);
    });
    // decorations
    S.candle = one(64, 64, function (x, g) {
      if (!g) {
        x.fillStyle = '#2a2a30';
        x.fillRect(30, 26, 4, 34);
        crPoly(x, [22, 62, 42, 62, 36, 56, 28, 56], '#2a2a30');
        x.fillRect(14, 30, 36, 3);
        x.fillRect(14, 22, 3, 10);
        x.fillRect(47, 22, 3, 10);
        x.fillStyle = '#e8e0c8';
        x.fillRect(13, 12, 5, 11);
        x.fillRect(46, 12, 5, 11);
        x.fillRect(29, 8, 6, 19);
      }
      crFlame(x, 15.5, 8, 0.9);
      crFlame(x, 48.5, 8, 0.9);
      crFlame(x, 32, 4, 1);
    });
    S.brazier = one(64, 64, function (x, g) {
      if (!g) {
        x.strokeStyle = '#26262c'; x.lineWidth = 3;
        x.beginPath(); x.moveTo(20, 62); x.lineTo(30, 38); x.moveTo(44, 62); x.lineTo(34, 38); x.moveTo(32, 62); x.lineTo(32, 38); x.stroke();
        crPoly(x, [12, 28, 52, 28, 44, 40, 20, 40], '#3a3a42');
        x.fillStyle = '#55555e'; x.fillRect(12, 28, 40, 2);
      }
      crEll(x, 32, 22, 16, 10, '#ff6a1a');
      crPoly(x, [18, 24, 24, 4, 30, 18, 34, 0, 38, 18, 42, 6, 46, 24], '#ff8a2a');
      crEll(x, 32, 24, 9, 6, '#ffe08a');
    });
    S.tomb = one(64, 64, function (x, g) {
      if (g) return;
      x.fillStyle = '#6e7280';
      x.beginPath(); x.moveTo(14, 62); x.lineTo(14, 24); x.arc(32, 24, 18, Math.PI, 0); x.lineTo(50, 62); x.fill();
      x.fillStyle = '#8a8e9c';
      x.beginPath(); x.moveTo(16, 60); x.lineTo(16, 24); x.arc(32, 24, 16, Math.PI, 0); x.lineTo(48, 60); x.fill();
      x.fillStyle = '#4a4e5a';
      x.font = 'bold 11px monospace'; x.textAlign = 'center'; x.fillText('R.I.P', 32, 34);
      x.fillRect(22, 40, 20, 2); x.fillRect(24, 45, 16, 2);
      x.fillStyle = '#2f5a2a'; for (var i = 0; i < 12; i++) x.fillRect(12 + i * 3.5, 58 - (i % 3) * 2, 2, 6);
      x.fillStyle = 'rgba(70,110,60,0.6)'; x.fillRect(16, 26, 4, 10); x.fillRect(44, 36, 4, 12);
    });
    S.exitOn = one(64, 64, function (x) {
      x.strokeStyle = '#6aff9a'; x.lineWidth = 4;
      x.beginPath(); x.ellipse(32, 56, 22, 6, 0, 0, TAU); x.stroke();
      x.lineWidth = 2; x.strokeStyle = '#b8ffd0';
      x.beginPath(); x.ellipse(32, 56, 14, 3.5, 0, 0, TAU); x.stroke();
      x.fillStyle = 'rgba(106,255,154,0.55)'; x.fillRect(14, 10, 2, 44); x.fillRect(48, 10, 2, 44); x.fillRect(31, 4, 2, 48);
      crPoly(x, [32, 12, 42, 26, 36, 26, 36, 40, 28, 40, 28, 26, 22, 26], '#b8ffd0');
    });
    S.exitOff = one(64, 64, function (x, g) {
      if (g) return;
      x.strokeStyle = '#3a4a40'; x.lineWidth = 4;
      x.beginPath(); x.ellipse(32, 56, 22, 6, 0, 0, TAU); x.stroke();
    });
    return S;
  }

  // First-person weapons for the crypt, drawn in a 200×200 design box.
  function crViewModel(wi, px) {
    var s = px / 200;
    var c = mkCanvas(Math.max(8, Math.ceil(px)), Math.max(8, Math.ceil(px)));
    var x = c.getContext('2d');
    x.scale(s, s);
    var glove = '#3a2a1e', gloveL = '#5a4232', cuff = '#2a2030';
    function hand(hx, hy, rot) {
      crEll(x, hx + 6, hy + 30, 22, 26, cuff, rot);
      crEll(x, hx, hy, 18, 22, glove, rot);
      x.strokeStyle = gloveL;
      x.lineWidth = 3;
      for (var f = 0; f < 3; f++) {
        x.beginPath();
        x.moveTo(hx - 12, hy - 8 + f * 9);
        x.quadraticCurveTo(hx, hy - 12 + f * 9, hx + 10, hy - 6 + f * 9);
        x.stroke();
      }
    }
    var mx = 100, my = 100;
    if (wi === 0) {
      // Grave Spade: handle from bottom right, blade at the top
      x.strokeStyle = '#6a4424'; x.lineWidth = 12;
      x.beginPath(); x.moveTo(168, 210); x.lineTo(118, 80); x.stroke();
      x.strokeStyle = '#8a5c34'; x.lineWidth = 4;
      x.beginPath(); x.moveTo(166, 206); x.lineTo(117, 82); x.stroke();
      crPoly(x, [92, 24, 132, 18, 142, 70, 120, 92, 100, 80], '#8c929e');
      crPoly(x, [96, 28, 128, 22, 136, 66, 120, 84, 104, 76], '#b8bec8');
      crPoly(x, [112, 76, 124, 72, 128, 92, 116, 96], '#5a5e68');
      hand(150, 160, 0.4);
      mx = 110; my = 30;
    } else if (wi === 1) {
      // Ember Pistol: chunky orange flare gun
      crPoly(x, [112, 200, 104, 150, 138, 150, 150, 200], '#4a2a16');
      crPoly(x, [84, 150, 92, 100, 136, 100, 146, 150], '#e0682b');
      crPoly(x, [92, 104, 98, 70, 132, 70, 136, 104], '#c8551f');
      crEll(x, 115, 70, 18, 10, '#2a1a10');
      crEll(x, 115, 70, 12, 6.5, '#0a0604');
      x.fillStyle = '#f08a4a'; x.fillRect(96, 106, 6, 40);
      x.fillStyle = '#d4a62a'; x.fillRect(110, 130, 14, 8);
      hand(128, 172, 0.2);
      mx = 115; my = 66;
    } else if (wi === 2) {
      // Coach Gun: twin barrels from the bottom centre
      crPoly(x, [56, 200, 70, 130, 130, 130, 144, 200], '#6a3e1e');
      crPoly(x, [62, 200, 74, 134, 92, 134, 86, 200], '#7a4a26');
      crPoly(x, [74, 134, 86, 40, 99, 40, 98, 134], '#2a2c34');
      crPoly(x, [102, 134, 101, 40, 114, 40, 126, 134], '#2a2c34');
      crPoly(x, [80, 134, 88, 40, 93, 40, 90, 134], '#6a6e7a');
      crPoly(x, [106, 134, 104, 40, 109, 40, 114, 134], '#6a6e7a');
      crEll(x, 92.5, 40, 7, 4, '#08080a');
      crEll(x, 107.5, 40, 7, 4, '#08080a');
      x.fillStyle = '#d4a62a'; x.fillRect(84, 112, 32, 5);
      hand(66, 178, -0.3);
      hand(136, 178, 0.3);
      mx = 100; my = 40;
    } else if (wi === 3) {
      // Garlic Bombs: a bulb with a lit fuse in the hand
      crEll(x, 118, 108, 30, 32, '#efe8d6');
      x.fillStyle = '#c9bfa6';
      x.fillRect(116, 80, 3, 58); x.fillRect(100, 92, 3, 40); x.fillRect(132, 92, 3, 40);
      crPoly(x, [112, 78, 118, 52, 124, 78], '#a8b878');
      x.strokeStyle = '#4a3a22'; x.lineWidth = 3; x.beginPath(); x.moveTo(118, 56); x.quadraticCurveTo(128, 40, 122, 30); x.stroke();
      crFlame(x, 122, 28, 2.2);
      hand(130, 160, 0.3);
      mx = 122; my = 28;
    } else {
      // Volt Crossbow: limbs across the view, glowing bolt in the middle
      x.strokeStyle = '#3a3e4a'; x.lineWidth = 9;
      x.beginPath(); x.moveTo(20, 104); x.quadraticCurveTo(100, 64, 180, 104); x.stroke();
      x.strokeStyle = '#c9cdd8'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(22, 106); x.lineTo(100, 122); x.lineTo(178, 106); x.stroke();
      crPoly(x, [88, 200, 92, 90, 108, 90, 112, 200], '#5a3a22');
      crPoly(x, [92, 200, 95, 92, 99, 92, 98, 200], '#7a5232');
      x.fillStyle = '#b87333';
      for (var k = 0; k < 4; k++) { x.fillRect(80, 130 + k * 10, 8, 5); x.fillRect(112, 130 + k * 10, 8, 5); }
      x.fillStyle = '#9aa0ac'; x.fillRect(98, 40, 4, 84);
      crPoly(x, [100, 26, 108, 44, 92, 44], '#7ad7ff');
      crEll(x, 100, 40, 10, 10, 'rgba(122,215,255,0.35)');
      hand(140, 180, 0.3);
      mx = 100; my = 32;
    }
    return { canvas: c, mx: mx * s, my: my * s };
  }

  function createCrypt(ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var noiseFx = (IGAME.sfx && IGAME.sfx.noise) || noop;
    var MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
    var SERIF = 'Georgia, "Times New Roman", serif';
    var NL = CR_LEVELS.length;

    /* ---------------- saved data ---------------- */
    var settings = store.get('cr-settings', null) || {};
    var prog = store.get('cr-progress', null) || {};
    prog = { unlocked: clamp(prog.unlocked | 0 || 1, 1, NL), carry: prog.carry || {}, best: prog.best || {}, wins: prog.wins | 0 };
    settings = {
      level: clamp(settings.level | 0, 0, prog.unlocked - 1),
      skill: clamp(settings.skill == null ? 1 : settings.skill | 0, 0, 2),
      pix: settings.pix === 1 ? 1 : 0,
      sens: [0.6, 1, 1.6].indexOf(settings.sens) > -1 ? settings.sens : 1,
    };
    function saveSettings() { store.set('cr-settings', settings); }
    function saveProg() { store.set('cr-progress', prog); }

    /* ---------------- DOM ---------------- */
    var style = document.createElement('style');
    style.textContent =
      '.cr-panel.ig-panel{background:rgba(20,13,24,.95);border-color:rgba(212,166,42,.35)}' +
      '.cr-panel .ig-title{font-family:' + SERIF + ';color:#f4e3b0;letter-spacing:.01em}' +
      '.cr-panel .ig-btn{background:linear-gradient(135deg,#e9a93c,#b4512a);box-shadow:0 6px 18px rgba(217,139,43,.3)}' +
      '.cr-panel .ig-btn.secondary{background:var(--surface-3);box-shadow:none}' +
      '.cr-opts{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin:2px 0 10px;text-align:left}' +
      '.cr-opt{display:flex;align-items:center;gap:8px;min-width:0}' +
      '.cr-opt>b{flex:0 0 52px;font:800 11px var(--font);color:var(--muted);text-transform:uppercase;letter-spacing:.06em}' +
      '.cr-seg{display:flex;gap:4px;flex:1;min-width:0}' +
      '.cr-seg button{flex:1 1 0;min-width:0;font:700 13px/1.15 var(--font);color:var(--text-2);background:var(--surface-3);border:0;border-radius:9px;padding:8px 4px;cursor:pointer;overflow-wrap:anywhere;touch-action:manipulation}' +
      '.cr-seg button.on{color:#1d1406;background:linear-gradient(135deg,#f6d77a,#d98b2b)}' +
      '.cr-seg button[disabled]{opacity:.38;cursor:not-allowed}' +
      '.cr-lvl{font:italic 600 13.5px ' + SERIF + ';color:#e9d9a8;margin:-2px 0 10px;text-align:center}' +
      '.cr-small{font-size:12.5px;color:var(--muted);margin:0 0 12px}' +
      '.cr-tbl{width:100%;border-collapse:collapse;font-size:14px;margin:0 0 12px}' +
      '.cr-tbl td{padding:5px 6px;border-top:1px solid rgba(255,255,255,.08);color:var(--text-2);text-align:left}' +
      '.cr-tbl td.n{text-align:right;color:#fff;font-weight:800}' +
      '.cr-compact.ig-panel{padding:14px 12px}.cr-compact .ig-title{font-size:22px;margin-bottom:4px}.cr-compact .ig-sub{font-size:13.5px;margin-bottom:8px}' +
      '.cr-compact .cr-small{font-size:11.5px;margin-bottom:8px}.cr-compact .ig-btn{padding:10px 16px;font-size:15px}.cr-compact .cr-opts{gap:6px}' +
      '.cr-compact .cr-seg button{padding:7px 3px;font-size:12.5px}.cr-compact .cr-tbl{font-size:12.5px;margin-bottom:8px}.cr-compact .cr-tbl td{padding:3px 5px}' +
      '.cr-hbtn{position:absolute;top:8px;z-index:6;width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.18);background:rgba(10,6,14,.55);color:#fff;display:none;place-items:center;cursor:pointer;padding:0;touch-action:manipulation}' +
      '.cr-hbtn svg{width:17px;height:17px}.cr-hbtn.show{display:grid}';
    root.appendChild(style);

    var W = 1, H = 1, u = 1, portrait = false, ready = false;
    var view = IGAME.createCanvas(root, { onResize: function (w, h) { W = w; H = h; if (ready) layout(); } });
    var canvas = view.canvas;
    var g = view.ctx;
    var low = mkCanvas(2, 2), lg = low.getContext('2d');
    var vmTmp = mkCanvas(2, 2), vg = vmTmp.getContext('2d');
    var img = null, buf = null, LW = 2, LH = 2, pxScale = 1;
    var zbuf = new Float32Array(2), rowD = new Float32Array(2), rowF = new Float32Array(2), rowLan = new Float32Array(2), skyRow = new Int32Array(2), skyCol = new Int32Array(2);
    var plane = 0.66, vms = [], vmPx = 100;
    var fontS = '', fontM = '', fontL = '', fontXL = '', fontT = '';
    var gradVig = null, gradHurt = null;

    function hudButton(label, svg, right) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cr-hbtn';
      b.style.right = right + 'px';
      b.setAttribute('aria-label', label);
      b.innerHTML = svg;
      root.appendChild(b);
      return b;
    }
    var pauseBtn = hudButton('Pause', '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>', 8);
    var mapBtn = hudButton('Map', '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1.5 3.5l4-1.5 5 2 4-1.5v10l-4 1.5-5-2-4 1.5z"/><path d="M5.5 2v10M10.5 4v10"/></svg>', 52);

    /* ---------------- art ---------------- */
    var wallTex = CR_WALLS.map(function (k) { return k ? crPixels(crTexture(k)) : null; });
    var doorTex = CR_DOOR_TEX.map(function (k) { return crPixels(crTexture(k)); });
    var floorTex = CR_FLOOR_KINDS.map(function (k) { return k === 'sky' ? null : crPixels(crTexture(k)); });
    var SKY = crSky();
    var SPR = crMakeSprites();
    var flashCanvas = makeFlash(64);

    /* ---------------- world state ---------------- */
    var L = null, li = 0, MW = 1, MH = 1;
    var grid = null, floorT = null, ceilT = null, doorIx = null, crackHp = null, seen = null, amb = null;
    var doors = [], foes = [], items = [], decor = [], projs = [], arcs = [], booms = [];
    var startPos = { x: 1.5, y: 1.5 }, exitPos = null, boss = null;
    var lmW = 1, lmH = 1, lmBase = null, lmFl = null, lmCur = null, lights = [];
    var stats = { kills: 0, total: 0, secrets: 0, secretsTotal: 0, time: 0 };
    var state = 'menu'; // menu | play | paused | dead | done
    var overlay = null, mapOpen = false;
    var time = 0, levelT = 0, endT = 0, shake = 0, hurtT = 0, pickT = 0, hitMarkT = 0;
    var msgs = [], dmgDirs = [];
    var skill = CR_SKILLS[settings.skill];
    var attract = { x: 1.5, y: 1.5, a: 0 };
    var P = null;
    var input = { fire: false, lookDX: 0 };
    var locked = false, ignoreUnlock = false, touchUI = !!ctx.isTouch;
    var pointers = {}, joy = { id: -1, bx: 0, by: 0, x: 0, y: 0 };
    var btn = { fire: { x: 0, y: 0, r: 0 }, swap: { x: 0, y: 0, r: 0 }, joyR: 50 };
    var listeners = [];
    function on(t, type, fn, opts) { t.addEventListener(type, fn, opts); listeners.push([t, type, fn, opts]); }

    /* ---------------- particles (fixed pool) ---------------- */
    var P_MAX = 220, parts = [], pCur = 0;
    for (var pi = 0; pi < P_MAX; pi++) parts.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, r: 255, g: 255, b: 255, size: 0.03, grav: 0, fb: false });
    function emit(x, y, z, n, col, speed, size, life, grav, fb) {
      var c = hexRgb(col);
      for (var i = 0; i < n; i++) {
        var p = parts[pCur];
        pCur = (pCur + 1) % P_MAX;
        var a = Math.random() * TAU, sp = speed * (0.3 + Math.random() * 0.7);
        p.on = true; p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.vz = (Math.random() - 0.25) * speed;
        p.life = p.max = life * (0.6 + Math.random() * 0.6);
        p.r = c[0]; p.g = c[1]; p.b = c[2];
        p.size = size * (0.6 + Math.random() * 0.8);
        p.grav = grav; p.fb = !!fb;
      }
    }

    /* ---------------- layout ---------------- */
    function layout() {
      portrait = H > W * 1.05;
      u = clamp(Math.min(W, H * 1.5) / 820, 0.62, 1.6);
      // pixel filter: Chunky renders ~320 px wide (DOS look), Crisp ~640 px
      var s = Math.max(settings.pix ? 1 : 2, W / (settings.pix ? 640 : 320));
      while ((W / s) * (H / s) > 260000) s += 0.25;
      pxScale = s;
      LW = Math.max(32, Math.ceil(W / s));
      LH = Math.max(24, Math.ceil(H / s));
      low.width = LW;
      low.height = LH;
      img = lg.createImageData(LW, LH);
      buf = new Uint32Array(img.data.buffer);
      zbuf = new Float32Array(LW);
      skyCol = new Int32Array(LW);
      rowD = new Float32Array(LH);
      rowF = new Float32Array(LH);
      rowLan = new Float32Array(LH);
      skyRow = new Int32Array(LH);
      plane = clamp((W / H) * 0.47, 0.5, 0.86);
      vmPx = Math.round(clamp(portrait ? LH * 0.4 : LH * 0.58, 24, 700));
      vms = [];
      for (var i = 0; i < CR_WEAPONS.length; i++) vms.push(crViewModel(i, vmPx));
      vmTmp.width = vmPx;
      vmTmp.height = vmPx;
      fontS = '700 ' + Math.round(Math.max(11, 12.5 * u)) + 'px ' + MONO;
      fontM = '800 ' + Math.round(Math.max(13, 17 * u)) + 'px ' + MONO;
      fontL = '900 ' + Math.round(Math.max(20, 30 * u)) + 'px ' + MONO;
      fontXL = '700 ' + Math.round(Math.max(26, 46 * u)) + 'px ' + SERIF;
      fontT = 'italic 600 ' + Math.round(Math.max(13, 18 * u)) + 'px ' + SERIF;
      var S = Math.min(W, H);
      btn.joyR = clamp(S * 0.13, 40, 80);
      btn.fire.r = clamp(S * 0.105, 34, 62);
      btn.fire.x = W - btn.fire.r * 1.55;
      btn.fire.y = H - btn.fire.r * 1.75;
      btn.swap.r = btn.fire.r * 0.62;
      btn.swap.x = btn.fire.x - btn.fire.r * 1.9;
      btn.swap.y = H - btn.swap.r * 1.6;
      var R = Math.sqrt(W * W + H * H) / 2;
      gradVig = g.createRadialGradient(W / 2, H / 2, R * 0.4, W / 2, H / 2, R);
      gradVig.addColorStop(0, 'rgba(0,0,0,0)');
      gradVig.addColorStop(1, 'rgba(0,0,0,0.55)');
      gradHurt = g.createRadialGradient(W / 2, H / 2, R * 0.3, W / 2, H / 2, R);
      gradHurt.addColorStop(0, 'rgba(160,0,20,0)');
      gradHurt.addColorStop(1, 'rgba(160,0,20,0.8)');
      if (L) render();
    }

    /* ---------------- level loading ---------------- */
    function floorIdx(k) { return CR_FLOOR_KINDS.indexOf(k); }
    function isWallCh(c) { return CR_WALL_CH[c] != null; }

    function loadLevel(i) {
      li = i;
      L = CR_LEVELS[i];
      var rows = L.map;
      MH = rows.length;
      MW = rows[0].length;
      var n = MW * MH;
      grid = new Uint8Array(n);
      floorT = new Uint8Array(n);
      ceilT = new Uint8Array(n);
      doorIx = new Int16Array(n).fill(-1);
      crackHp = new Float32Array(n);
      seen = new Uint8Array(n);
      amb = new Float32Array(n * 3);
      doors = []; foes = []; items = []; decor = []; projs = []; arcs = []; booms = [];
      boss = null;
      exitPos = null;
      msgs = []; dmgDirs = [];
      for (var k = 0; k < P_MAX; k++) parts[k].on = false;
      var fi = floorIdx(L.floor), ci = floorIdx(L.ceil);
      for (var c = 0; c < n; c++) {
        floorT[c] = fi;
        ceilT[c] = ci;
        amb[c * 3] = L.amb[0]; amb[c * 3 + 1] = L.amb[1]; amb[c * 3 + 2] = L.amb[2];
      }
      L.areas.forEach(function (ar) {
        for (var y = ar.r[1]; y <= ar.r[3]; y++)
          for (var x = ar.r[0]; x <= ar.r[2]; x++) {
            var cc = y * MW + x;
            if (ar.floor) floorT[cc] = floorIdx(ar.floor);
            if (ar.ceil) ceilT[cc] = floorIdx(ar.ceil);
            if (ar.amb) { amb[cc * 3] = ar.amb[0]; amb[cc * 3 + 1] = ar.amb[1]; amb[cc * 3 + 2] = ar.amb[2]; }
          }
      });
      var secrets = 0;
      for (var y = 0; y < MH; y++)
        for (var x = 0; x < MW; x++) {
          var ch = rows[y].charAt(x), cell = y * MW + x, cx = x + 0.5, cy = y + 0.5;
          if (isWallCh(ch)) {
            grid[cell] = CR_WALL_CH[ch];
            if (ch === '*') { crackHp[cell] = 30; secrets++; }
          } else if (CR_DOOR_CH[ch] != null) {
            grid[cell] = CR_DOOR;
            doorIx[cell] = doors.length;
            var kind = CR_DOOR_CH[ch];
            doors.push({ x: x, y: y, kind: kind, locked: kind > 0, open: 0, want: 0, msgT: -9, vert: isWallCh(rows[y - 1].charAt(x)) && isWallCh(rows[y + 1].charAt(x)) });
          } else if (ch === '@') startPos = { x: cx, y: cy };
          else if (ch === 'X') exitPos = { x: cx, y: cy };
          else if (CR_FOES[ch]) foes.push(makeFoe(ch, cx, cy));
          else if (CR_PICKUPS[ch]) items.push({ ch: ch, def: CR_PICKUPS[ch], x: cx, y: cy, on: true, ph: Math.random() * TAU });
          else if (CR_DECOR[ch]) decor.push({ def: CR_DECOR[ch], x: cx, y: cy, ph: Math.random() * TAU });
        }
      stats = { kills: 0, total: foes.length, secrets: 0, secretsTotal: secrets, time: 0 };
      attract = { x: startPos.x, y: startPos.y, a: L.face };
      buildLights();
    }

    /* ---------------- lighting ---------------- */
    // Static light map at CR_LMS sub-cells per unit, three channels. Flickering
    // lights go into three phase groups that are re-mixed every frame, then
    // short-lived dynamic lights (muzzle flash, embers, blasts) are stamped on top.
    function buildLights() {
      lmW = MW * CR_LMS;
      lmH = MH * CR_LMS;
      var n = lmW * lmH;
      lmBase = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
      lmFl = [];
      for (var gI = 0; gI < 3; gI++) lmFl.push([new Float32Array(n), new Float32Array(n), new Float32Array(n)]);
      lmCur = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
      for (var sy = 0; sy < lmH; sy++)
        for (var sx = 0; sx < lmW; sx++) {
          var cell = ((sy / CR_LMS) | 0) * MW + ((sx / CR_LMS) | 0), i = sy * lmW + sx;
          lmBase[0][i] = amb[cell * 3];
          lmBase[1][i] = amb[cell * 3 + 1];
          lmBase[2][i] = amb[cell * 3 + 2];
        }
      lights = [];
      decor.forEach(function (d, k) {
        if (d.def.light) lights.push({ x: d.x, y: d.y, col: d.def.light, r: d.def.lr, grp: k % 3, flick: true });
      });
      // stained glass spills coloured light into the floor cells in front of it
      for (var y = 1; y < MH - 1; y++)
        for (var x = 1; x < MW - 1; x++) {
          if (grid[y * MW + x] !== 5) continue;
          var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var q = 0; q < 4; q++) {
            var nx = x + nb[q][0], ny = y + nb[q][1];
            if (grid[ny * MW + nx] === 0) lights.push({ x: x + 0.5 + nb[q][0] * 0.55, y: y + 0.5 + nb[q][1] * 0.55, col: [0.42, 0.3, 0.62], r: 3.6, flick: false });
          }
        }
      lights.forEach(function (l) {
        var target = l.flick ? lmFl[l.grp] : lmBase;
        var r = l.r, x0 = Math.max(0, ((l.x - r) * CR_LMS) | 0), x1 = Math.min(lmW - 1, ((l.x + r) * CR_LMS) | 0);
        var y0 = Math.max(0, ((l.y - r) * CR_LMS) | 0), y1 = Math.min(lmH - 1, ((l.y + r) * CR_LMS) | 0);
        for (var sy = y0; sy <= y1; sy++)
          for (var sx = x0; sx <= x1; sx++) {
            var wx = (sx + 0.5) / CR_LMS, wy = (sy + 0.5) / CR_LMS;
            if (grid[(wy | 0) * MW + (wx | 0)] && grid[(wy | 0) * MW + (wx | 0)] !== CR_DOOR) continue;
            var dx = wx - l.x, dy = wy - l.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d >= r) continue;
            if (d > 0.3 && !losLight(l.x, l.y, wx, wy, d)) continue;
            var f = 1 - d / r;
            f *= f;
            var i = sy * lmW + sx;
            target[0][i] += l.col[0] * f;
            target[1][i] += l.col[1] * f;
            target[2][i] += l.col[2] * f;
          }
      });
    }
    function losLight(x0, y0, x1, y1, d) {
      return rayDist(x0, y0, (x1 - x0) / d, (y1 - y0) / d, d, true) >= d - 0.05;
    }

    var dyn = [];
    for (var di = 0; di < 12; di++) dyn.push({ x: 0, y: 0, r: 0, cr: 0, cg: 0, cb: 0 });
    var dynN = 0;
    function addDyn(x, y, r, cr, cg, cb) {
      if (dynN >= dyn.length) return;
      var d = dyn[dynN++];
      d.x = x; d.y = y; d.r = r; d.cr = cr; d.cg = cg; d.cb = cb;
    }
    function flick(t, k) {
      return 0.82 + 0.1 * Math.sin(t * 8.3 + k * 2.1) + 0.07 * Math.sin(t * 21.7 + k * 4.3) + 0.04 * Math.sin(t * 47.1 + k);
    }
    function mixLights() {
      var n = lmW * lmH;
      var f0 = flick(time, 0), f1 = flick(time, 1), f2 = flick(time, 2);
      for (var ch = 0; ch < 3; ch++) {
        var b = lmBase[ch], a0 = lmFl[0][ch], a1 = lmFl[1][ch], a2 = lmFl[2][ch], o = lmCur[ch];
        for (var i = 0; i < n; i++) o[i] = b[i] + a0[i] * f0 + a1[i] * f1 + a2[i] * f2;
      }
      for (var k = 0; k < dynN; k++) {
        var dl = dyn[k], r = dl.r;
        var x0 = Math.max(0, ((dl.x - r) * CR_LMS) | 0), x1 = Math.min(lmW - 1, ((dl.x + r) * CR_LMS) | 0);
        var y0 = Math.max(0, ((dl.y - r) * CR_LMS) | 0), y1 = Math.min(lmH - 1, ((dl.y + r) * CR_LMS) | 0);
        for (var sy = y0; sy <= y1; sy++)
          for (var sx = x0; sx <= x1; sx++) {
            var dx = (sx + 0.5) / CR_LMS - dl.x, dy = (sy + 0.5) / CR_LMS - dl.y;
            var d2 = dx * dx + dy * dy;
            if (d2 >= r * r) continue;
            var f = 1 - Math.sqrt(d2) / r;
            f *= f;
            var j = sy * lmW + sx;
            lmCur[0][j] += dl.cr * f;
            lmCur[1][j] += dl.cg * f;
            lmCur[2][j] += dl.cb * f;
          }
      }
    }
    function lightIdx(x, y) {
      var sx = (x * CR_LMS) | 0, sy = (y * CR_LMS) | 0;
      if (sx < 0) sx = 0; else if (sx >= lmW) sx = lmW - 1;
      if (sy < 0) sy = 0; else if (sy >= lmH) sy = lmH - 1;
      return sy * lmW + sx;
    }

    /* ---------------- collision & rays ---------------- */
    function cellSolid(ix, iy) {
      if (ix < 0 || iy < 0 || ix >= MW || iy >= MH) return true;
      var v = grid[iy * MW + ix];
      if (!v) return false;
      if (v === CR_DOOR) return doors[doorIx[iy * MW + ix]].open < 0.85;
      return true;
    }
    function solidAt(x, y) { return cellSolid(x | 0, y | 0); }
    function blocked(x, y, r) {
      return solidAt(x - r, y - r) || solidAt(x + r, y - r) || solidAt(x - r, y + r) || solidAt(x + r, y + r);
    }
    function moveEnt(e, dx, dy, r, props) {
      if (!blocked(e.x + dx, e.y, r)) e.x += dx;
      if (!blocked(e.x, e.y + dy, r)) e.y += dy;
      if (props) {
        // push out of blocking props (candelabras, tombstones, braziers)
        for (var i = 0; i < decor.length; i++) {
          var d = decor[i];
          var bx = e.x - d.x, by = e.y - d.y;
          if (bx > 1 || bx < -1 || by > 1 || by < -1) continue;
          var min = d.def.block + r, dd = bx * bx + by * by;
          if (dd < min * min && dd > 1e-6) {
            var l = Math.sqrt(dd), push = min - l;
            var nx = e.x + (bx / l) * push, ny = e.y + (by / l) * push;
            if (!blocked(nx, e.y, r)) e.x = nx;
            if (!blocked(e.x, ny, r)) e.y = ny;
          }
        }
      }
    }
    // DDA ray; returns distance to the first solid cell (closed doors count) and sets rayCell.
    var rayCell = -1;
    function rayDist(x, y, dx, dy, maxD, doorsSolid) {
      var mx = x | 0, my = y | 0;
      var ddx = dx === 0 ? 1e9 : Math.abs(1 / dx), ddy = dy === 0 ? 1e9 : Math.abs(1 / dy);
      var sx, sy, tx, ty;
      if (dx < 0) { sx = -1; tx = (x - mx) * ddx; } else { sx = 1; tx = (mx + 1 - x) * ddx; }
      if (dy < 0) { sy = -1; ty = (y - my) * ddy; } else { sy = 1; ty = (my + 1 - y) * ddy; }
      rayCell = -1;
      for (var n = 0; n < 96; n++) {
        var d;
        if (tx < ty) { d = tx; tx += ddx; mx += sx; } else { d = ty; ty += ddy; my += sy; }
        if (d > maxD) return maxD;
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) { rayCell = -1; return d; }
        var v = grid[my * MW + mx];
        if (v && (v !== CR_DOOR || doorsSolid || doors[doorIx[my * MW + mx]].open < 0.85)) {
          rayCell = my * MW + mx;
          return d;
        }
      }
      return maxD;
    }
    function los(x0, y0, x1, y1) {
      var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.01) return true;
      return rayDist(x0, y0, dx / d, dy / d, d, false) >= d - 0.01;
    }

    // BFS path (cell indices) through floor and unlocked doors.
    var bfsPrev = null, bfsQ = null;
    function findPath(sx, sy, gx, gy) {
      var n = MW * MH;
      if (!bfsPrev || bfsPrev.length !== n) { bfsPrev = new Int32Array(n); bfsQ = new Int32Array(n); }
      bfsPrev.fill(-2);
      var s = (sy | 0) * MW + (sx | 0), goal = (gy | 0) * MW + (gx | 0);
      var qh = 0, qt = 0;
      bfsQ[qt++] = s;
      bfsPrev[s] = -1;
      var steps = 0;
      while (qh < qt && steps++ < 1400) {
        var c = bfsQ[qh++];
        if (c === goal) break;
        var cx = c % MW, cy = (c / MW) | 0;
        for (var k = 0; k < 4; k++) {
          var nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
          var ni = ny * MW + nx, v = grid[ni];
          if (bfsPrev[ni] !== -2) continue;
          if (v && (v !== CR_DOOR || doors[doorIx[ni]].locked)) continue;
          bfsPrev[ni] = c;
          bfsQ[qt++] = ni;
        }
      }
      if (bfsPrev[goal] === -2) return null;
      var path = [];
      for (var p = goal; p !== -1 && p !== s; p = bfsPrev[p]) path.push(p);
      path.reverse();
      return path;
    }

    /* ---------------- doors ---------------- */
    function tryOpen(dr, byPlayer) {
      if (dr.locked) {
        if (!byPlayer) return false;
        if (P.keys[dr.kind]) {
          dr.locked = false;
          msg('You unlock the door with the ' + CR_KEY_NAMES[dr.kind] + '.');
          sfx({ f: 520, f2: 780, d: 0.12, type: 'square', v: 0.07 });
          sfx({ f: 1040, d: 0.08, type: 'triangle', v: 0.08, delay: 0.1 });
        } else {
          if (time - dr.msgT > 2.2) {
            dr.msgT = time;
            msg('Locked. You need the ' + CR_KEY_NAMES[dr.kind] + '.', '#ff9a7a');
            sfx('error');
          }
          return false;
        }
      }
      if (dr.want <= 0 && dr.open < 0.05) doorSound(dr, true);
      dr.want = 3;
      return true;
    }
    function doorSound(dr, opening) {
      var dp = Math.hypot(dr.x + 0.5 - P.x, dr.y + 0.5 - P.y);
      var v = clamp(1 - dp / 12, 0, 1);
      if (v <= 0) return;
      sfx({ f: opening ? 140 : 180, f2: opening ? 260 : 90, d: 0.45, type: 'sawtooth', v: 0.035 * v });
      noiseFx({ d: 0.35, f: 400, v: 0.08 * v });
    }
    function doorOccupied(dr) {
      var x0 = dr.x - 0.35, x1 = dr.x + 1.35, y0 = dr.y - 0.35, y1 = dr.y + 1.35;
      if (P.alive && P.x > x0 && P.x < x1 && P.y > y0 && P.y < y1) return true;
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i];
        if (!f.dead && f.x > x0 && f.x < x1 && f.y > y0 && f.y < y1) return true;
      }
      return false;
    }
    function updateDoors(dt) {
      for (var i = 0; i < doors.length; i++) {
        var dr = doors[i];
        var dx = dr.x + 0.5 - P.x, dy = dr.y + 0.5 - P.y, d = Math.sqrt(dx * dx + dy * dy);
        if (P.alive && d < 1.45) {
          // locked doors only complain when you walk up to them, not when you pass by
          var facing = Math.abs(angDiff(P.a, Math.atan2(dy, dx))) < 0.9;
          if (!dr.locked || d < 1.15 || facing) tryOpen(dr, true);
        }
        if (dr.want > 0) {
          dr.want -= dt;
          dr.open = Math.min(1, dr.open + dt * 1.8);
        } else if (dr.open > 0) {
          if (doorOccupied(dr)) dr.want = 0.6;
          else {
            if (dr.open >= 1) doorSound(dr, false);
            dr.open = Math.max(0, dr.open - dt * 1.8);
          }
        }
      }
    }

    /* ---------------- foes ---------------- */
    function makeFoe(ch, x, y) {
      var def = CR_FOES[ch];
      var f = {
        ch: ch, def: def, x: x, y: y, z: 0, hp: Math.round(def.hp * skill.hp), maxHp: Math.round(def.hp * skill.hp),
        alert: false, dead: false, dieT: 0, painT: 0, flash: 0, atkT: 0, cd: rnd(def.cd[0], def.cd[1]), burnT: 0,
        animT: Math.random() * 4, seeT: Math.random() * 0.3, canSee: false, statue: !!def.statue, wakeT: 0,
        path: null, pathI: 0, repath: 0, strafe: 1, strafeT: 0, ph: Math.random() * TAU, summonT: 6, stuckT: 0, rage: false,
      };
      if (def.boss) boss = f;
      return f;
    }
    function alertFoe(f, quiet) {
      if (f.alert || f.dead) return;
      f.alert = true;
      if (f.statue) f.wakeT = 0.7;
      if (quiet) return;
      var dp = Math.hypot(f.x - P.x, f.y - P.y), v = clamp(1 - dp / 14, 0.15, 1);
      var k = f.def.kind;
      if (k === 'zealot') {
        sfx({ f: 196, d: 0.35, type: 'triangle', v: 0.08 * v });
        sfx({ f: 233, d: 0.4, type: 'triangle', v: 0.07 * v, delay: 0.2 });
      } else if (k === 'ghoul') sfx({ f: 110, f2: 70, d: 0.6, type: 'sawtooth', v: 0.06 * v });
      else if (k === 'bat') sfx({ f: 2400, f2: 3200, d: 0.08, type: 'sine', v: 0.05 * v });
      else if (k === 'garg' || k === 'boss') {
        sfx({ f: 90, f2: 50, d: 0.7, type: 'sawtooth', v: 0.1 * v });
        noiseFx({ d: 0.6, f: 300, v: 0.15 * v });
        if (k === 'boss') msg('Grand Spout: "Who rings MY bell?"', '#ffd27a');
      }
    }
    function alertNoise(x, y, r) {
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i];
        if (!f.alert && !f.dead && !f.statue && Math.hypot(f.x - x, f.y - y) < r) alertFoe(f);
      }
    }
    function hurtFoe(f, dmg, fromPlayer) {
      if (f.dead) return;
      if (!f.alert) alertFoe(f);
      f.hp -= dmg;
      f.flash = 0.09;
      if (fromPlayer) hitMarkT = 0.18;
      if (f.hp > 0 && Math.random() < f.def.pain) f.painT = 0.2;
      if (f.hp <= 0) killFoe(f);
    }
    function killFoe(f) {
      f.dead = true;
      f.dieT = 0;
      f.burnT = 0;
      stats.kills++;
      var k = f.def.kind, zz = f.z + f.def.h * 0.5;
      if (k === 'bat') emit(f.x, f.y, zz, 10, '#9a90b0', 1.4, 0.05, 0.6, -0.3);
      else if (k === 'garg' || k === 'boss') {
        emit(f.x, f.y, zz, k === 'boss' ? 60 : 24, '#8a8f99', 3, 0.07, 1, 6);
        emit(f.x, f.y, zz, 16, '#ffb347', 2.4, 0.04, 0.5, 2, true);
      } else emit(f.x, f.y, zz, 18, k === 'ghoul' ? '#8a8270' : '#6d42a0', 1.8, 0.05, 0.8, 1);
      var dp = Math.hypot(f.x - P.x, f.y - P.y), v = clamp(1 - dp / 14, 0.2, 1);
      if (k === 'zealot') sfx({ f: 330, f2: 110, d: 0.4, type: 'triangle', v: 0.09 * v });
      else if (k === 'ghoul') sfx({ f: 160, f2: 60, d: 0.5, type: 'sawtooth', v: 0.08 * v });
      else if (k === 'bat') sfx('pop');
      else { sfx('explode'); shake = Math.max(shake, k === 'boss' ? 16 : 7); }
      // occasional ammo drop from zealots
      if (k === 'zealot' && Math.random() < 0.4) items.push({ ch: 'e', def: CR_PICKUPS.e, x: f.x, y: f.y, on: true, ph: 0, drop: true });
      if (f === boss) {
        msg('Grand Spout crumbles into very expensive gravel.', '#ffd27a');
        msg('The exit sigil is glowing!', '#6aff9a');
        sfx('win');
      }
    }
    function updateFoe(f, dt) {
      if (f.dead) { f.dieT += dt; return; }
      var def = f.def, k = def.kind;
      f.animT += dt;
      if (f.flash > 0) f.flash -= dt;
      if (f.atkT > 0) f.atkT -= dt;
      if (f.burnT > 0) {
        f.burnT -= dt;
        f.hp -= 9 * dt;
        if (Math.random() < dt * 18) emit(f.x + rnd(-0.15, 0.15), f.y + rnd(-0.15, 0.15), f.z + rnd(0.2, 0.7), 1, '#ff8a2a', 0.4, 0.035, 0.4, -1.2, true);
        addDyn(f.x, f.y, 1.8, 0.5, 0.25, 0.05);
        if (f.hp <= 0) { killFoe(f); return; }
      }
      var dx = P.x - f.x, dy = P.y - f.y, d = Math.sqrt(dx * dx + dy * dy);
      f.seeT -= dt;
      if (f.seeT <= 0) {
        f.seeT = 0.2;
        f.canSee = P.alive && d < def.sight && los(f.x, f.y, P.x, P.y);
        if (!f.alert && f.canSee) {
          if (f.statue) { if (d < 4.2) alertFoe(f); }
          else if (def.boss) { if (d < 9) alertFoe(f); }
          else alertFoe(f);
        }
      }
      // hovering height for flyers
      if (k === 'bat') f.z = 0.32 + Math.sin(f.animT * 3 + f.ph) * 0.12;
      else if (def.fly && !f.statue) f.z = (k === 'boss' ? 0.25 : 0.18) + Math.sin(f.animT * 2 + f.ph) * 0.08;
      if (!f.alert) return;
      if (f.statue) {
        f.wakeT -= dt;
        if (f.wakeT > 0) return;
        f.statue = false;
      }
      if (f.painT > 0) { f.painT -= dt; return; }
      if (!P.alive) return;
      var mvx = 0, mvy = 0, spd = def.speed * (f.rage ? 1.35 : 1);
      if (f.canSee) {
        var ang = Math.atan2(dy, dx);
        var fwd = d > def.range[1] ? 1 : d < def.range[0] ? -0.7 : 0;
        f.strafeT -= dt;
        if (f.strafeT <= 0) { f.strafe = Math.random() < 0.5 ? -1 : 1; f.strafeT = rnd(0.6, 1.5); }
        var st = k === 'ghoul' ? 0 : k === 'bat' ? Math.sin(f.animT * 6 + f.ph) * 1.1 : f.strafe * 0.75;
        if (k === 'ghoul' || k === 'bat') fwd = d > def.range[1] ? 1 : 0;
        mvx = Math.cos(ang) * fwd - Math.sin(ang) * st;
        mvy = Math.sin(ang) * fwd + Math.cos(ang) * st;
        f.path = null;
      } else {
        f.repath -= dt;
        if (!f.path || f.repath <= 0) { f.path = findPath(f.x, f.y, P.x, P.y); f.pathI = 0; f.repath = 0.8 + Math.random() * 0.4; }
        if (f.path && f.pathI < f.path.length) {
          var cell = f.path[f.pathI];
          var tx = (cell % MW) + 0.5, ty = ((cell / MW) | 0) + 0.5;
          if (grid[cell] === CR_DOOR) tryOpen(doors[doorIx[cell]], false);
          var ddx = tx - f.x, ddy = ty - f.y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd < 0.2) f.pathI++;
          else { mvx = ddx / dd; mvy = ddy / dd; }
        }
      }
      var ml = Math.sqrt(mvx * mvx + mvy * mvy);
      if (ml > 0.01) {
        var ox = f.x, oy = f.y;
        moveEnt(f, (mvx / ml) * spd * dt, (mvy / ml) * spd * dt, def.r * 0.8, !def.fly);
        if (Math.hypot(f.x - ox, f.y - oy) < spd * dt * 0.2) {
          f.stuckT += dt;
          if (f.stuckT > 0.7) { f.stuckT = 0; f.strafe = -f.strafe; f.path = null; f.repath = 0; }
        } else f.stuckT = 0;
      }
      // attacks
      f.cd -= dt;
      if (f.cd <= 0 && f.canSee) {
        if (def.melee && d < def.r + 0.6) {
          f.cd = rnd(def.cd[0], def.cd[1]);
          f.atkT = 0.3;
          hurtPlayer(def.melee * skill.dmg, f);
          if (k === 'bat') sfx({ f: 2600, f2: 1800, d: 0.06, type: 'square', v: 0.04 });
          else sfx({ f: 200, f2: 120, d: 0.12, type: 'square', v: 0.06 });
        } else if (def.shot && d > 1.2 && d < 15) {
          f.cd = rnd(def.cd[0], def.cd[1]) * (f.rage ? 0.7 : 1);
          f.atkT = 0.35;
          var a0 = Math.atan2(dy, dx);
          var zz = f.z + def.h * 0.55;
          if (def.shot === 'hex') {
            spawnProj('hex', f.x, f.y, zz, a0 + rnd(-0.06, 0.06), 7.5, false, 9);
            sfx({ f: 600, f2: 300, d: 0.2, type: 'triangle', v: 0.05 });
          } else {
            var nShots = def.boss ? (f.rage ? 5 : 3) : 1, spread = def.boss ? 0.22 : 0;
            for (var s = 0; s < nShots; s++) spawnProj('rock', f.x, f.y, zz, a0 + (s - (nShots - 1) / 2) * spread + rnd(-0.04, 0.04), def.boss ? 8.5 : 9, false, def.boss ? 13 : 11);
            sfx({ f: 160, f2: 80, d: 0.25, type: 'sawtooth', v: 0.07 });
            noiseFx({ d: 0.2, f: 900, v: 0.08 });
          }
        }
      }
      if (def.boss) {
        if (!f.rage && f.hp < f.maxHp * 0.5) {
          f.rage = true;
          msg('Grand Spout is getting rather cross.', '#ff9a7a');
          sfx({ f: 70, f2: 40, d: 0.9, type: 'sawtooth', v: 0.12 });
        }
        f.summonT -= dt;
        if (f.summonT <= 0) {
          f.summonT = f.rage ? 7 : 10;
          var bats = 0;
          for (var i = 0; i < foes.length; i++) if (!foes[i].dead && foes[i].def.kind === 'bat') bats++;
          for (var j = 0; j < 2 && bats < 4; j++, bats++) {
            var nb = makeFoe('b', f.x + rnd(-0.6, 0.6), f.y + rnd(-0.6, 0.6));
            if (blocked(nb.x, nb.y, 0.2)) { nb.x = f.x; nb.y = f.y; }
            nb.alert = true;
            foes.push(nb);
            stats.total++;
          }
          sfx({ f: 2200, f2: 3400, d: 0.15, type: 'sine', v: 0.05 });
        }
      }
    }
    function separateFoes() {
      for (var i = 0; i < foes.length; i++) {
        var a = foes[i];
        if (a.dead) continue;
        // monsters and the player push each other apart
        if (P.alive) {
          var qx = P.x - a.x, qy = P.y - a.y, qm = a.def.r + 0.2, q2 = qx * qx + qy * qy;
          if (q2 < qm * qm && q2 > 1e-5) {
            var ql = Math.sqrt(q2), qp = qm - ql;
            moveEnt(P, (qx / ql) * qp * 0.7, (qy / ql) * qp * 0.7, 0.22, true);
            if (!a.def.boss) moveEnt(a, (-qx / ql) * qp * 0.3, (-qy / ql) * qp * 0.3, a.def.r * 0.8, !a.def.fly);
          }
        }
        for (var j = i + 1; j < foes.length; j++) {
          var b = foes[j];
          if (b.dead) continue;
          var dx = b.x - a.x, dy = b.y - a.y, min = (a.def.r + b.def.r) * 0.85, d2 = dx * dx + dy * dy;
          if (d2 < min * min && d2 > 1e-5) {
            var d = Math.sqrt(d2), push = (min - d) / 2;
            moveEnt(a, (-dx / d) * push, (-dy / d) * push, a.def.r * 0.8, false);
            moveEnt(b, (dx / d) * push, (dy / d) * push, b.def.r * 0.8, false);
          }
        }
      }
    }

    /* ---------------- player ---------------- */
    function makePlayer(lo) {
      return {
        x: startPos.x, y: startPos.y, a: L.face, vx: 0, vy: 0, hp: lo.hp || 100, armor: lo.armor || 0, alive: true, deadT: 0,
        keys: [true, false, false], w: lo.w.slice(), ammo: { embers: lo.ammo.embers, shells: lo.ammo.shells, garlic: lo.ammo.garlic, bolts: lo.ammo.bolts },
        cur: lo.w[2] ? 2 : 1, prev: 0, cool: 0, switchT: 0.3, kick: 0, flashT: 0, swingT: 0, bob: 0, bobAmt: 0, step: 0, killer: null,
      };
    }
    function hurtPlayer(dmg, src) {
      if (!P.alive || state !== 'play') return;
      var absorb = Math.min(P.armor, dmg * 0.5);
      P.armor -= absorb;
      dmg -= absorb;
      P.hp -= dmg;
      hurtT = Math.min(1, hurtT + dmg / 28);
      shake = Math.max(shake, 3 + dmg * 0.3);
      if (src) {
        dmgDirs.push({ a: Math.atan2(src.y - P.y, src.x - P.x), t: 1 });
        if (dmgDirs.length > 5) dmgDirs.shift();
      }
      sfx({ f: 150, f2: 80, d: 0.14, type: 'square', v: 0.08 });
      if (P.hp <= 0) {
        P.hp = 0;
        P.alive = false;
        P.deadT = 0;
        P.killer = src;
        input.fire = false;
        state = 'dead';
        endT = 0;
        sfx('lose');
        exitLock();
      }
    }
    function ammoFor(i) {
      var w = CR_WEAPONS[i];
      return w.ammo ? P.ammo[w.ammo] : Infinity;
    }
    function selectWeapon(i) {
      if (i < 0 || i >= CR_WEAPONS.length || i === P.cur || !P.w[i] || !P.alive) return;
      if (ammoFor(i) < 1) { msg('No ammo for the ' + CR_WEAPONS[i].name + '.'); sfx('tick'); return; }
      P.prev = P.cur;
      P.cur = i;
      P.switchT = 0.28;
      sfx({ f: 440, d: 0.04, type: 'square', v: 0.05 });
    }
    function cycleWeapon(dir) {
      var i = P.cur;
      for (var n = 0; n < CR_WEAPONS.length; n++) {
        i = (i + dir + CR_WEAPONS.length) % CR_WEAPONS.length;
        if (P.w[i] && ammoFor(i) >= 1) break;
      }
      selectWeapon(i);
    }
    function bestWeapon() {
      var order = [4, 2, 1, 3, 0];
      for (var k = 0; k < order.length; k++) if (P.w[order[k]] && ammoFor(order[k]) >= 1) return order[k];
      return 0;
    }
    function fire() {
      var w = CR_WEAPONS[P.cur];
      if (w.ammo && P.ammo[w.ammo] < 1) {
        sfx('tick');
        P.cool = 0.3;
        selectWeapon(bestWeapon());
        return;
      }
      P.cool = w.rate;
      P.kick = Math.min(1.6, P.kick + w.kick);
      shake = Math.max(shake, w.shake * 0.5);
      if (w.melee) {
        P.swingT = 0.34;
        noiseFx({ d: 0.12, f: 1800, v: 0.1 });
        meleeHit(w);
        return;
      }
      var use = w.ammo ? Math.min(w.use, P.ammo[w.ammo]) : 0;
      if (w.ammo) P.ammo[w.ammo] -= use;
      P.flashT = 0.07;
      alertNoise(P.x, P.y, 9);
      var ca = Math.cos(P.a), sa = Math.sin(P.a);
      if (w.id === 'coach') {
        noiseFx({ d: 0.3, f: 900, v: 0.42 });
        sfx({ f: 110, f2: 40, d: 0.25, type: 'sawtooth', v: 0.12 });
        var pellets = use < w.use ? (w.pellets / 2) | 0 : w.pellets;
        for (var p = 0; p < pellets; p++) hitscan(P.a + (Math.random() - 0.5) * 2 * w.spread, w);
      } else if (w.id === 'ember') {
        sfx({ f: 320, f2: 900, d: 0.12, type: 'sawtooth', v: 0.06 });
        noiseFx({ d: 0.1, f: 2400, v: 0.12 });
        spawnProj('ember', P.x + ca * 0.25, P.y + sa * 0.25, 0.45, P.a, w.speed, true, w.dmg);
      } else if (w.id === 'garlic') {
        sfx({ f: 260, f2: 520, d: 0.1, type: 'triangle', v: 0.07 });
        var gp = spawnProj('garlic', P.x + ca * 0.3, P.y + sa * 0.3, 0.5, P.a, w.speed, true, w.dmg);
        gp.vz = 2.6;
      } else if (w.id === 'volt') {
        sfx({ f: 1800, f2: 200, d: 0.22, type: 'sawtooth', v: 0.07 });
        noiseFx({ d: 0.15, f: 5000, v: 0.08 });
        spawnProj('volt', P.x + ca * 0.25, P.y + sa * 0.25, 0.47, P.a, w.speed, true, w.dmg);
      }
    }
    function meleeHit(w) {
      var best = null, bd = 99;
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i];
        if (f.dead) continue;
        var dx = f.x - P.x, dy = f.y - P.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > w.range + f.def.r || d >= bd) continue;
        if (Math.abs(angDiff(P.a, Math.atan2(dy, dx))) > (d < 0.7 ? 1.2 : 0.55)) continue;
        if (!los(P.x, P.y, f.x, f.y)) continue;
        best = f;
        bd = d;
      }
      if (best) {
        hurtFoe(best, w.dmg * rnd(0.85, 1.2), true);
        emit(best.x, best.y, best.z + best.def.h * 0.55, 6, '#e8e0c8', 1.2, 0.035, 0.35, 3);
        sfx({ f: 140, f2: 70, d: 0.12, type: 'square', v: 0.1 });
        if (!best.dead && !best.def.boss) moveEnt(best, Math.cos(P.a) * 0.18, Math.sin(P.a) * 0.18, best.def.r * 0.8, !best.def.fly);
        return;
      }
      var wd = rayDist(P.x, P.y, Math.cos(P.a), Math.sin(P.a), w.range, true);
      if (wd < w.range && rayCell >= 0) {
        var hx = P.x + Math.cos(P.a) * (wd - 0.05), hy = P.y + Math.sin(P.a) * (wd - 0.05);
        if (!hitCrack(rayCell, w.dmg, hx, hy)) {
          emit(hx, hy, 0.5, 5, '#ffd27a', 1.4, 0.025, 0.25, 3, true);
          sfx({ f: 900, f2: 500, d: 0.08, type: 'square', v: 0.06 });
        }
      }
    }
    function hitscan(a, w) {
      var dx = Math.cos(a), dy = Math.sin(a);
      var wallD = rayDist(P.x, P.y, dx, dy, w.range, true), wallCell = rayCell;
      var best = null, bestT = wallD;
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i];
        if (f.dead) continue;
        var ox = f.x - P.x, oy = f.y - P.y, t = ox * dx + oy * dy;
        if (t <= 0 || t >= bestT) continue;
        var px = ox - dx * t, py = oy - dy * t, rr = f.def.r + 0.06;
        if (px * px + py * py < rr * rr) { best = f; bestT = t; }
      }
      var hx = P.x + dx * (bestT - 0.05), hy = P.y + dy * (bestT - 0.05);
      if (best) {
        var fall = 1 - clamp((bestT - 4) / 14, 0, 0.6);
        emit(hx, hy, best.z + best.def.h * 0.5 + rnd(-0.1, 0.1), 2, '#ffd27a', 1.2, 0.025, 0.3, 3, true);
        hurtFoe(best, w.dmg * fall, true);
      } else if (wallD < w.range) {
        if (!(wallCell >= 0 && hitCrack(wallCell, w.dmg * 0.45, hx, hy))) emit(hx, hy, 0.5 + rnd(-0.15, 0.15), 2, '#b8b0a0', 1, 0.03, 0.4, 3);
      }
    }
    function hitCrack(cell, dmg, hx, hy) {
      if (cell < 0 || grid[cell] !== CR_CRACK) return false;
      crackHp[cell] -= dmg;
      emit(hx, hy, 0.5, 5, '#8a8f99', 1.5, 0.045, 0.6, 5);
      sfx({ f: 120, f2: 60, d: 0.15, type: 'square', v: 0.08 });
      if (crackHp[cell] <= 0) {
        grid[cell] = 0;
        var cx = cell % MW, cy = (cell / MW) | 0;
        // the opened cell takes the floor/ceiling of its open neighbour
        var nbs = [cell - 1, cell + 1, cell - MW, cell + MW];
        for (var q = 0; q < 4; q++) if (nbs[q] >= 0 && nbs[q] < grid.length && grid[nbs[q]] === 0) { floorT[cell] = floorT[nbs[q]]; ceilT[cell] = ceilT[nbs[q]]; }
        stats.secrets++;
        emit(cx + 0.5, cy + 0.5, 0.5, 30, '#8a8f99', 2.4, 0.06, 1, 6);
        shake = Math.max(shake, 6);
        sfx('explode');
        [523, 622, 784, 1046].forEach(function (f, i) { sfx({ f: f, d: 0.18, type: 'triangle', v: 0.08, delay: 0.25 + i * 0.09 }); });
        msg('Secret found! (' + stats.secrets + ' of ' + stats.secretsTotal + ')', '#6aff9a');
        buildLights();
      }
      return true;
    }

    /* ---------------- projectiles ---------------- */
    function spawnProj(kind, x, y, z, a, speed, friendly, dmg) {
      var p = { kind: kind, x: x, y: y, z: z, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, vz: 0, friendly: friendly, dmg: dmg, t: 0, dead: false };
      projs.push(p);
      return p;
    }
    function explode(x, y) {
      var w = CR_WEAPONS[3];
      booms.push({ x: x, y: y, t: 0 });
      emit(x, y, 0.3, 28, '#f4f0d8', 3.4, 0.06, 0.8, 1);
      emit(x, y, 0.3, 18, '#b8e070', 2.6, 0.05, 0.9, -0.3);
      emit(x, y, 0.3, 14, '#ffb347', 3.6, 0.035, 0.45, 2, true);
      var dp = Math.hypot(x - P.x, y - P.y);
      shake = Math.max(shake, clamp(14 - dp * 2, 0, 14));
      sfx('explode');
      alertNoise(x, y, 10);
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i];
        if (f.dead) continue;
        var d = Math.hypot(f.x - x, f.y - y);
        if (d > w.splash + f.def.r || !los(x, y, f.x, f.y)) continue;
        hurtFoe(f, w.dmg * (1 - clamp(d / w.splash, 0, 1) * 0.65), true);
      }
      if (P.alive && dp < w.splash * 0.8 && los(x, y, P.x, P.y)) hurtPlayer(w.dmg * 0.35 * (1 - dp / (w.splash * 0.8)), null);
      // blasts open cracked walls nearby
      for (var yy = Math.floor(y - 2); yy <= Math.floor(y + 2); yy++)
        for (var xx = Math.floor(x - 2); xx <= Math.floor(x + 2); xx++) {
          if (xx < 0 || yy < 0 || xx >= MW || yy >= MH) continue;
          var cell = yy * MW + xx;
          if (grid[cell] === CR_CRACK && Math.hypot(xx + 0.5 - x, yy + 0.5 - y) < 1.9) hitCrack(cell, 999, x, y);
        }
    }
    function chainVolt(from, dmg) {
      var hitList = [from];
      var cur = from;
      for (var c = 0; c < CR_WEAPONS[4].chain; c++) {
        var best = null, bd = 3.6;
        for (var i = 0; i < foes.length; i++) {
          var f = foes[i];
          if (f.dead || hitList.indexOf(f) > -1) continue;
          var d = Math.hypot(f.x - cur.x, f.y - cur.y);
          if (d < bd && los(cur.x, cur.y, f.x, f.y)) { bd = d; best = f; }
        }
        if (!best) break;
        arcs.push({ x0: cur.x, y0: cur.y, z0: cur.z + cur.def.h * 0.5, x1: best.x, y1: best.y, z1: best.z + best.def.h * 0.5, t: 0.22 });
        hitList.push(best);
        hurtFoe(best, dmg * 0.55, true);
        cur = best;
      }
    }
    function updateProjs(dt) {
      for (var i = projs.length - 1; i >= 0; i--) {
        var p = projs[i];
        p.t += dt;
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        var n = Math.max(1, Math.ceil((sp * dt) / 0.15));
        for (var s = 0; s < n && !p.dead; s++) {
          var nx = p.x + (p.vx * dt) / n, ny = p.y + (p.vy * dt) / n;
          if (p.kind === 'garlic') {
            p.z += (p.vz * dt) / n;
            p.vz -= (9 * dt) / n;
            if (p.z < 0.08) { p.z = 0.08; p.vz = Math.abs(p.vz) * 0.42; p.vx *= 0.72; p.vy *= 0.72; }
          }
          if (solidAt(nx, ny)) {
            if (p.kind === 'garlic') {
              // bounce off walls
              if (solidAt(nx, p.y)) p.vx = -p.vx * 0.5;
              if (solidAt(p.x, ny)) p.vy = -p.vy * 0.5;
              continue;
            }
            impact(p, nx, ny);
            break;
          }
          p.x = nx;
          p.y = ny;
          if (p.friendly) {
            for (var k = 0; k < foes.length; k++) {
              var f = foes[k];
              if (f.dead) continue;
              var rr = f.def.r + 0.12;
              if (Math.abs(f.x - p.x) < rr && Math.abs(f.y - p.y) < rr && p.z > f.z - 0.15 && p.z < f.z + f.def.h + 0.15) {
                hitFoeWith(p, f);
                break;
              }
            }
          } else if (P.alive && Math.abs(P.x - p.x) < 0.3 && Math.abs(P.y - p.y) < 0.3) {
            hurtPlayer(p.dmg * skill.dmg, { x: p.x - p.vx, y: p.y - p.vy });
            emit(p.x, p.y, p.z, 6, p.kind === 'hex' ? '#c070ff' : '#ff9a3a', 1.2, 0.03, 0.3, 1, true);
            p.dead = true;
          }
        }
        if (p.kind === 'garlic' && p.t > 1.25 && !p.dead) { explode(p.x, p.y); p.dead = true; }
        if (p.t > 5) p.dead = true;
        if (!p.dead) {
          if (p.kind === 'ember') { addDyn(p.x, p.y, 2.6, 0.9, 0.45, 0.12); if (Math.random() < 0.5) emit(p.x, p.y, p.z, 1, '#ffb347', 0.3, 0.025, 0.25, 0.5, true); }
          else if (p.kind === 'hex') addDyn(p.x, p.y, 2.2, 0.45, 0.15, 0.7);
          else if (p.kind === 'volt') addDyn(p.x, p.y, 2.6, 0.3, 0.6, 1);
          else if (p.kind === 'rock') addDyn(p.x, p.y, 1.8, 0.6, 0.3, 0.08);
        }
        if (p.dead) projs.splice(i, 1);
      }
    }
    function hitFoeWith(p, f) {
      p.dead = true;
      if (p.kind === 'garlic') { explode(p.x, p.y); return; }
      if (p.kind === 'ember') {
        hurtFoe(f, p.dmg, true);
        if (!f.dead) f.burnT = CR_WEAPONS[1].burn;
        emit(p.x, p.y, p.z, 6, '#ffb347', 1.4, 0.03, 0.35, 1, true);
        sfx({ f: 500, f2: 200, d: 0.1, type: 'triangle', v: 0.05 });
      } else if (p.kind === 'volt') {
        hurtFoe(f, p.dmg, true);
        chainVolt(f, p.dmg);
        emit(p.x, p.y, p.z, 8, '#9fe6ff', 1.8, 0.03, 0.3, 1, true);
        sfx({ f: 2400, f2: 600, d: 0.15, type: 'sawtooth', v: 0.05 });
      }
    }
    function impact(p, nx, ny) {
      p.dead = true;
      var col = p.kind === 'ember' ? '#ffb347' : p.kind === 'hex' ? '#c070ff' : p.kind === 'volt' ? '#9fe6ff' : '#ff9a3a';
      emit(p.x, p.y, p.z, 6, col, 1.3, 0.03, 0.35, 2, true);
      if (p.friendly) {
        var cell = (ny | 0) * MW + (nx | 0);
        if (grid[cell] === CR_CRACK) hitCrack(cell, p.dmg * 0.6, p.x, p.y);
      }
    }

    /* ---------------- pickups ---------------- */
    function tryPickup(it) {
      var d = it.def;
      if (d.hp) {
        if (P.hp >= d.cap) return;
        P.hp = Math.min(d.cap, P.hp + d.hp);
      } else if (d.armor) {
        if (P.armor >= 100) return;
        P.armor = Math.min(100, P.armor + d.armor);
      } else if (d.key) {
        P.keys[d.key] = true;
      } else if (d.weapon != null) {
        var had = P.w[d.weapon];
        if (had && P.ammo[d.ammo] >= CR_AMMO_MAX[d.ammo]) return;
        P.w[d.weapon] = 1;
        P.ammo[d.ammo] = Math.min(CR_AMMO_MAX[d.ammo], P.ammo[d.ammo] + d.n);
        if (!had) { P.prev = P.cur; P.cur = d.weapon; P.switchT = 0.3; }
      } else if (d.ammo) {
        if (P.ammo[d.ammo] >= CR_AMMO_MAX[d.ammo]) return;
        P.ammo[d.ammo] = Math.min(CR_AMMO_MAX[d.ammo], P.ammo[d.ammo] + d.n);
      }
      it.on = false;
      pickT = 0.18;
      var line = d.key ? 'You found ' + d.name + '!' : d.weapon != null && !had ? 'You got ' + d.name + '! Press ' + (d.weapon + 1) + '.' : 'Picked up ' + d.name + '.';
      if (it.ch === '+') line = 'Hot Cocoa. Still warm, somehow.';
      msg(line, d.key ? '#ffe08a' : d.weapon != null ? '#ffd27a' : null);
      if (d.key || d.weapon != null) sfx('levelup');
      else if (d.hp || d.armor) sfx('buy');
      else sfx('coin');
    }

    /* ---------------- messages ---------------- */
    function msg(text, col) {
      msgs.push({ text: text, col: col || '#f0e2b6', t: 3.6 });
      if (msgs.length > 4) msgs.shift();
    }

    /* ---------------- update ---------------- */
    function update(dt) {
      time += dt;
      dynN = 0;
      if (state === 'menu') {
        attract.a += dt * 0.16;
        updateParticles(dt);
        return;
      }
      if (state === 'paused') return;
      if (state === 'dead' || state === 'done') {
        endT += dt;
        if (P && !P.alive) P.deadT += dt;
        if (endT > (state === 'dead' ? 1.4 : 0.9) && !overlay) (state === 'dead' ? showDeath : showDone)();
        updateParticles(dt);
        updateFx(dt);
        for (var j = 0; j < foes.length; j++) if (foes[j].dead) foes[j].dieT += dt;
        return;
      }
      levelT += dt;
      stats.time += dt;
      updatePlayer(dt);
      updateDoors(dt);
      for (var i = 0; i < foes.length; i++) updateFoe(foes[i], dt);
      separateFoes();
      updateProjs(dt);
      updateParticles(dt);
      updateFx(dt);
      if (exitPos && (!boss || boss.dead)) addDyn(exitPos.x, exitPos.y, 3.2, 0.25, 0.85, 0.45);
      if (P.flashT > 0) addDyn(P.x + Math.cos(P.a) * 0.4, P.y + Math.sin(P.a) * 0.4, 4.5, 1.1, 0.7, 0.35);
      for (var b = 0; b < booms.length; b++) addDyn(booms[b].x, booms[b].y, 5, 1.4 * (1 - booms[b].t / 0.5), 1.2 * (1 - booms[b].t / 0.5), 0.6 * (1 - booms[b].t / 0.5));
      for (var a = 0; a < arcs.length; a++) addDyn(arcs[a].x1, arcs[a].y1, 2.5, 0.3, 0.6, 1);
      if (exitPos && (!boss || boss.dead) && P.alive && Math.hypot(P.x - exitPos.x, P.y - exitPos.y) < 0.6) completeLevel();
    }

    function updatePlayer(dt) {
      var k = ctx.keys;
      if (!P.alive) return;
      var turn = 0;
      if (k.ArrowLeft) turn -= 1;
      if (k.ArrowRight) turn += 1;
      P.a += turn * 2.6 * dt + input.lookDX;
      input.lookDX = 0;
      var f = 0, s = 0;
      if (k.KeyW || k.ArrowUp) f += 1;
      if (k.KeyS || k.ArrowDown) f -= 1;
      if (k.KeyD) s += 1;
      if (k.KeyA) s -= 1;
      if (joy.id !== -1) { f -= joy.y; s += joy.x; }
      var len = Math.sqrt(f * f + s * s);
      if (len > 1) { f /= len; s /= len; }
      var run = k.ShiftLeft || k.ShiftRight || (joy.id !== -1 && Math.hypot(joy.x, joy.y) > 0.92);
      var spd = run ? 4.7 : 3.3;
      var ca = Math.cos(P.a), sa = Math.sin(P.a);
      var tvx = (ca * f - sa * s) * spd, tvy = (sa * f + ca * s) * spd;
      var acc = 1 - Math.exp(-dt * 12);
      P.vx += (tvx - P.vx) * acc;
      P.vy += (tvy - P.vy) * acc;
      moveEnt(P, P.vx * dt, P.vy * dt, 0.22, true);
      var mv = Math.sqrt(P.vx * P.vx + P.vy * P.vy);
      P.bobAmt = lerp(P.bobAmt, clamp(mv / 3.3, 0, 1.4), 1 - Math.exp(-dt * 10));
      P.bob += dt * (run ? 12 : 9) * clamp(mv / 3.3, 0.2, 1.4);
      var ph = Math.floor(P.bob / Math.PI);
      if (ph !== P.step) {
        P.step = ph;
        if (mv > 1) noiseFx({ d: 0.05, f: 380, v: run ? 0.07 : 0.045 });
      }
      if (P.cool > 0) P.cool -= dt;
      if (P.switchT > 0) P.switchT -= dt;
      if (P.flashT > 0) P.flashT -= dt;
      if (P.swingT > 0) P.swingT -= dt;
      P.kick = Math.max(0, P.kick - dt * 5);
      if ((input.fire || k.Space) && P.cool <= 0 && P.switchT <= 0 && levelT > 0.25) fire();
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.on && Math.abs(it.x - P.x) < 0.5 && Math.abs(it.y - P.y) < 0.5) tryPickup(it);
      }
    }

    function updateFx(dt) {
      if (hurtT > 0) hurtT = Math.max(0, hurtT - dt * 0.9);
      if (pickT > 0) pickT -= dt;
      if (hitMarkT > 0) hitMarkT -= dt;
      shake = Math.max(0, shake - dt * 28);
      for (var i = dmgDirs.length - 1; i >= 0; i--) { dmgDirs[i].t -= dt; if (dmgDirs[i].t <= 0) dmgDirs.splice(i, 1); }
      for (var m = msgs.length - 1; m >= 0; m--) { msgs[m].t -= dt; if (msgs[m].t <= 0) msgs.splice(m, 1); }
      for (var b = booms.length - 1; b >= 0; b--) { booms[b].t += dt; if (booms[b].t > 0.5) booms.splice(b, 1); }
      for (var a = arcs.length - 1; a >= 0; a--) { arcs[a].t -= dt; if (arcs[a].t <= 0) arcs.splice(a, 1); }
    }
    function updateParticles(dt) {
      for (var i = 0; i < P_MAX; i++) {
        var p = parts[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.vz -= p.grav * dt;
        var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (solidAt(nx, ny)) { p.vx *= -0.3; p.vy *= -0.3; } else { p.x = nx; p.y = ny; }
        p.z += p.vz * dt;
        if (p.z < 0.01) { p.z = 0.01; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
        if (p.z > 0.98) { p.z = 0.98; p.vz = -Math.abs(p.vz) * 0.3; }
      }
    }

    /* ---------------- rendering ---------------- */
    var FALLK = 0.012, LAN = 0.52, LANR = 6;
    var sprPool = [];
    for (var sp = 0; sp < 160; sp++) sprPool.push({ img: null, x: 0, y: 0, z: 0, w: 0, h: 0, depth: 0, sx: 0, fb: false, flash: false });
    var sprN = 0, sprOrder = [];
    function addSpr(img, x, y, z, w, h, fb, flash) {
      if (sprN >= sprPool.length) return;
      var s = sprPool[sprN++];
      s.img = img; s.x = x; s.y = y; s.z = z; s.w = w; s.h = h; s.fb = !!fb; s.flash = !!flash;
    }
    function foeFrame(f) {
      var k = f.def.kind, S = k === 'zealot' ? SPR.zealot : k === 'ghoul' ? SPR.ghoul : k === 'bat' ? SPR.bat : k === 'garg' ? SPR.garg : SPR.boss;
      if (f.dead) {
        if (k === 'bat') return f.dieT < 0.35 ? S[2] : null;
        if (k === 'garg' || k === 'boss') return S[4];
        return f.dieT < 0.25 ? S[3] : S[4];
      }
      if (k === 'bat') return S[(f.animT * 10) % 2 < 1 ? 0 : 1];
      if (k === 'garg' || k === 'boss') {
        if (f.statue && (!f.alert || f.wakeT > 0.35)) return S[0];
        if (f.atkT > 0) return S[3];
        return S[(f.animT * 6) % 2 < 1 ? 1 : 2];
      }
      if (f.atkT > 0) return S[2];
      if (f.painT > 0) return S[2];
      if (!f.alert) return S[0];
      return S[(f.animT * 4) % 2 < 1 ? 0 : 1];
    }

    function render() {
      if (!L || !buf) return;
      var cam = state === 'menu' || !P ? attract : P;
      var px = cam.x, py = cam.y, pa = cam.a;
      var w = LW, h = LH, b = buf;
      var dirX = Math.cos(pa), dirY = Math.sin(pa);
      var plX = -dirY * plane, plY = dirX * plane;
      var proj = w / 2 / plane;
      var eye = 0.5, bobPx = 0;
      if (cam === P) {
        if (P.alive) bobPx = Math.abs(Math.sin(P.bob)) * 0.022 * h * P.bobAmt;
        else eye = lerp(0.5, 0.14, clamp(P.deadT * 1.6, 0, 1));
      }
      var hor = Math.round(h / 2 + bobPx);
      var y, x, d;
      for (y = 0; y < h; y++) {
        if (y > hor) d = (eye * proj) / (y - hor);
        else if (y < hor) d = ((1 - eye) * proj) / (hor - y);
        else d = 1000;
        rowD[y] = d;
        rowF[y] = 1 / (1 + d * d * FALLK);
        var lt = 1 - d / LANR;
        rowLan[y] = lt > 0 ? LAN * lt * lt : 0;
        var sr = ((y - (hor - h * 0.5)) / (h * 0.5)) * SKY.h;
        skyRow[y] = sr < 0 ? 0 : sr >= SKY.h ? SKY.h - 1 : sr | 0;
      }
      mixLights();
      var cR = lmCur[0], cG = lmCur[1], cB = lmCur[2], lmw = lmW, LMS = CR_LMS;
      var skyD = SKY.d, skyW = SKY.w;
      for (x = 0; x < w; x++) {
        var camX = (2 * (x + 0.5)) / w - 1;
        var rdx = dirX + plX * camX, rdy = dirY + plY * camX;
        var sa = (pa + Math.atan(camX * plane)) / Math.PI; // sky wraps twice around the horizon
        skyCol[x] = ((((sa * skyW) | 0) % skyW) + skyW) % skyW;
        var mx = px | 0, my = py | 0;
        var ddx = rdx === 0 ? 1e9 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e9 : Math.abs(1 / rdy);
        var stx, sty, sdx, sdy;
        if (rdx < 0) { stx = -1; sdx = (px - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - px) * ddx; }
        if (rdy < 0) { sty = -1; sdy = (py - my) * ddy; } else { sty = 1; sdy = (my + 1 - py) * ddy; }
        var side = 0, perp = 40, tex = wallTex[1], texU = 0, fullb = false;
        for (var n = 0; n < 128; n++) {
          if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
          if (mx < 0 || my < 0 || mx >= MW || my >= MH) { perp = side === 0 ? sdx - ddx : sdy - ddy; break; }
          var cell = my * MW + mx, v = grid[cell];
          seen[cell] = 1;
          if (!v) continue;
          if (v === CR_DOOR) {
            var dr = doors[doorIx[cell]], t, fr;
            if (dr.vert) {
              if (rdx === 0) continue;
              t = (mx + 0.5 - px) / rdx;
              fr = py + rdy * t - my;
            } else {
              if (rdy === 0) continue;
              t = (my + 0.5 - py) / rdy;
              fr = px + rdx * t - mx;
            }
            if (fr < 0 || fr >= 1 || fr < dr.open) continue;
            perp = t;
            tex = doorTex[dr.kind];
            texU = fr - dr.open;
            side = dr.vert ? 0 : 1;
            break;
          }
          perp = side === 0 ? sdx - ddx : sdy - ddy;
          var wxp = side === 0 ? py + perp * rdy : px + perp * rdx;
          wxp -= Math.floor(wxp);
          texU = (side === 0 && rdx > 0) || (side === 1 && rdy < 0) ? 1 - wxp : wxp;
          tex = wallTex[v] || wallTex[1];
          fullb = v === 5;
          break;
        }
        if (perp < 0.02) perp = 0.02;
        zbuf[x] = perp;
        var lineH = proj / perp;
        var top = hor - lineH * (1 - eye), bot = top + lineH;
        var y0 = top < 0 ? 0 : Math.ceil(top), y1 = bot > h ? h : Math.ceil(bot);
        // wall light: sampled just in front of the hit point
        var rl = 1 / Math.sqrt(rdx * rdx + rdy * rdy);
        var li = lightIdx(px + rdx * perp - rdx * rl * 0.12, py + rdy * perp - rdy * rl * 0.12);
        var ff = 1 / (1 + perp * perp * FALLK), lt2 = 1 - perp / LANR, la = lt2 > 0 ? LAN * lt2 * lt2 : 0;
        var sk = side ? 0.8 : 1;
        var Lr = ((cR[li] * ff + la) * sk * 256) | 0, Lg = ((cG[li] * ff + la) * sk * 256) | 0, Lb = ((cB[li] * ff + la) * sk * 256) | 0;
        if (fullb) { if (Lr < 240) Lr = 240; if (Lg < 240) Lg = 240; if (Lb < 240) Lb = 240; }
        var tx = (texU * CR_T) | 0;
        if (tx > 63) tx = 63; else if (tx < 0) tx = 0;
        var step = CR_T / lineH, tp = (y0 - top) * step;
        var o = y0 * w + x, c, r, gg, bb;
        for (y = y0; y < y1; y++, o += w) {
          c = tex[((tp | 0) & 63) * 64 + tx];
          tp += step;
          r = ((c & 255) * Lr) >> 8; gg = (((c >> 8) & 255) * Lg) >> 8; bb = (((c >> 16) & 255) * Lb) >> 8;
          b[o] = 0xff000000 | ((bb > 255 ? 255 : bb) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
        }
        // floor
        var ys = y1 > hor + 1 ? y1 : hor + 1;
        o = ys * w + x;
        for (y = ys; y < h; y++, o += w) {
          d = rowD[y];
          var fx = px + rdx * d, fy = py + rdy * d;
          var ix = fx | 0, iy = fy | 0;
          if (ix < 0 || iy < 0 || ix >= MW || iy >= MH) { b[o] = 0xff000000; continue; }
          c = floorTex[floorT[iy * MW + ix]][((((fy * 64) | 0) & 63) << 6) + (((fx * 64) | 0) & 63)];
          var lj = ((fy * LMS) | 0) * lmw + ((fx * LMS) | 0);
          var f2 = rowF[y], l2 = rowLan[y];
          var fr2 = ((cR[lj] * f2 + l2) * 256) | 0, fg2 = ((cG[lj] * f2 + l2) * 256) | 0, fb2 = ((cB[lj] * f2 + l2) * 256) | 0;
          r = ((c & 255) * fr2) >> 8; gg = (((c >> 8) & 255) * fg2) >> 8; bb = (((c >> 16) & 255) * fb2) >> 8;
          b[o] = 0xff000000 | ((bb > 255 ? 255 : bb) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
        }
        // ceiling / sky
        var ye = y0 < hor ? y0 : hor;
        o = x;
        var scol = skyCol[x];
        for (y = 0; y < ye; y++, o += w) {
          d = rowD[y];
          var cx2 = px + rdx * d, cy2 = py + rdy * d;
          var ix2 = cx2 | 0, iy2 = cy2 | 0;
          if (ix2 < 0 || iy2 < 0 || ix2 >= MW || iy2 >= MH) { b[o] = 0xff000000; continue; }
          var ct = ceilT[iy2 * MW + ix2];
          if (ct === CR_SKY) { b[o] = skyD[skyRow[y] * skyW + scol] | 0xff000000; continue; }
          c = floorTex[ct][((((cy2 * 64) | 0) & 63) << 6) + (((cx2 * 64) | 0) & 63)];
          var lk = ((cy2 * LMS) | 0) * lmw + ((cx2 * LMS) | 0);
          var f3 = rowF[y] * 0.85, l3 = rowLan[y] * 0.7;
          var cr3 = ((cR[lk] * f3 + l3) * 256) | 0, cg3 = ((cG[lk] * f3 + l3) * 256) | 0, cb3 = ((cB[lk] * f3 + l3) * 256) | 0;
          r = ((c & 255) * cr3) >> 8; gg = (((c >> 8) & 255) * cg3) >> 8; bb = (((c >> 16) & 255) * cb3) >> 8;
          b[o] = 0xff000000 | ((bb > 255 ? 255 : bb) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
        }
      }
      drawSprites(px, py, dirX, dirY, plX, plY, proj, hor, eye);
      drawParticles(px, py, dirX, dirY, plX, plY, proj, hor, eye);
      lg.putImageData(img, 0, 0);
      drawArcs(px, py, dirX, dirY, plX, plY, proj, hor, eye);
      if (P && cam === P && P.alive) drawWeapon();
      // upscale the low-res frame (nearest neighbour = chunky pixels)
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.imageSmoothingEnabled = false;
      var ox = 0, oy = 0;
      if (shake > 0.2) { ox = (Math.random() - 0.5) * shake * u; oy = (Math.random() - 0.5) * shake * u; }
      if (ox || oy) {
        g.fillStyle = '#000';
        g.fillRect(0, 0, W, H);
      }
      g.drawImage(low, 0, 0, LW, LH, ox, oy, LW * pxScale, LH * pxScale);
      if (state === 'menu' || !P) {
        g.fillStyle = gradVig;
        g.fillRect(0, 0, W, H);
        return;
      }
      drawHud();
    }

    function drawSprites(px, py, dirX, dirY, plX, plY, proj, hor, eye) {
      sprN = 0;
      var i;
      for (i = 0; i < decor.length; i++) {
        var dc = decor[i];
        addSpr(SPR[dc.def.spr], dc.x, dc.y, 0, dc.def.w, dc.def.h, false, false);
      }
      if (exitPos) {
        var act = !boss || boss.dead;
        addSpr(act ? SPR.exitOn : SPR.exitOff, exitPos.x, exitPos.y, act ? Math.sin(time * 2) * 0.03 : 0, 0.9, 0.9, act, false);
      }
      for (i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it.on) continue;
        var sz = it.def.sz, im = SPR.pick[it.ch];
        addSpr(im, it.x, it.y, 0.03 + Math.abs(Math.sin(time * 2.4 + it.ph)) * 0.05, sz * (im.w / Math.max(im.w, im.h)), sz * (im.h / Math.max(im.w, im.h)), false, false);
      }
      for (i = 0; i < foes.length; i++) {
        var f = foes[i];
        var fr = foeFrame(f);
        if (!fr) continue;
        if (f.dead && f.def.kind === 'bat') { addSpr(fr, f.x, f.y, f.z, f.def.w, f.def.h, false, false); continue; }
        var hh = f.def.h, zz = f.dead ? 0 : f.z;
        if (f.statue && !f.alert) zz = 0;
        addSpr(fr, f.x, f.y, zz, f.def.w, hh, false, f.flash > 0);
      }
      for (i = 0; i < projs.length; i++) {
        var p = projs[i];
        var ps = p.kind === 'garlic' ? 0.22 : p.kind === 'rock' ? 0.26 : 0.22;
        addSpr(SPR[p.kind], p.x, p.y, p.z - ps / 2, ps, ps, p.kind !== 'garlic', false);
      }
      for (i = 0; i < booms.length; i++) {
        var bm = booms[i], k = bm.t / 0.5, bs = 0.6 + k * 1.8;
        addSpr(SPR.boomImg || (SPR.boomImg = boomSprite()), bm.x, bm.y, 0.4 - bs / 2, bs, bs, true, false);
      }
      var invDet = 1 / (plX * dirY - dirX * plY);
      sprOrder.length = 0;
      for (i = 0; i < sprN; i++) {
        var s = sprPool[i];
        var rx = s.x - px, ry = s.y - py;
        s.depth = invDet * (-plY * rx + plX * ry);
        var tX = invDet * (dirY * rx - dirX * ry);
        s.sx = (LW / 2) * (1 + tX / s.depth);
        if (s.depth > 0.12) sprOrder.push(s);
      }
      sprOrder.sort(function (a, b2) { return b2.depth - a.depth; });
      for (i = 0; i < sprOrder.length; i++) drawSprite(sprOrder[i], proj, hor, eye);
    }
    function boomSprite() {
      return crSprite(32, 32, function (x) {
        crEll(x, 16, 16, 15, 15, 'rgba(240,250,210,0.9)');
        crEll(x, 16, 16, 10, 10, '#fffbe6');
      });
    }

    function drawSprite(s, proj, hor, eye) {
      var w = LW, h = LH, b = buf;
      var scale = proj / s.depth;
      var hp = s.h * scale, wp = s.w * scale;
      var bottom = hor + (eye - s.z) * scale, top = bottom - hp;
      var left = s.sx - wp / 2;
      var x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(w, Math.ceil(left + wp));
      var y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(h, Math.ceil(bottom));
      if (x0 >= x1 || y0 >= y1) return;
      var im = s.img, iw = im.w, ih = im.h, data = im.d;
      var Lr, Lg, Lb;
      if (s.fb) Lr = Lg = Lb = 256;
      else {
        var li = lightIdx(s.x, s.y);
        var ff = 1 / (1 + s.depth * s.depth * FALLK), lt = 1 - s.depth / LANR, la = lt > 0 ? LAN * lt * lt : 0;
        Lr = ((lmCur[0][li] * ff + la) * 256) | 0;
        Lg = ((lmCur[1][li] * ff + la) * 256) | 0;
        Lb = ((lmCur[2][li] * ff + la) * 256) | 0;
      }
      var flash = s.flash;
      var ustep = iw / wp, vstep = ih / hp;
      var v0 = (y0 - top) * vstep;
      for (var x = x0; x < x1; x++) {
        if (zbuf[x] <= s.depth) continue;
        var uu = ((x - left) * ustep) | 0;
        if (uu >= iw) uu = iw - 1;
        var v = v0, o = y0 * w + x;
        for (var y = y0; y < y1; y++, o += w, v += vstep) {
          var c = data[((v | 0) >= ih ? ih - 1 : v | 0) * iw + uu];
          var a = c >>> 24;
          if (!a) continue;
          if (flash) { b[o] = 0xffe8f0ff; continue; }
          if (a === 0xfe) { b[o] = c | 0xff000000; continue; }
          var r = ((c & 255) * Lr) >> 8, gg = (((c >> 8) & 255) * Lg) >> 8, bb = (((c >> 16) & 255) * Lb) >> 8;
          b[o] = 0xff000000 | ((bb > 255 ? 255 : bb) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
        }
      }
    }

    function drawParticles(px, py, dirX, dirY, plX, plY, proj, hor, eye) {
      var invDet = 1 / (plX * dirY - dirX * plY);
      var w = LW, h = LH, b = buf;
      for (var i = 0; i < P_MAX; i++) {
        var p = parts[i];
        if (!p.on) continue;
        var rx = p.x - px, ry = p.y - py;
        var depth = invDet * (-plY * rx + plX * ry);
        if (depth < 0.2) continue;
        var sx = ((w / 2) * (1 + (invDet * (dirY * rx - dirX * ry)) / depth)) | 0;
        if (sx < 0 || sx >= w || zbuf[sx] < depth) continue;
        var scale = proj / depth;
        var sy = (hor + (eye - p.z) * scale) | 0;
        var sz = Math.max(1, Math.min(4, (p.size * scale) | 0));
        var m = p.fb ? 1 : clamp(1 / (1 + depth * depth * FALLK), 0.3, 1);
        var col = 0xff000000 | (((p.b * m) | 0) << 16) | (((p.g * m) | 0) << 8) | ((p.r * m) | 0);
        for (var yy = sy; yy < sy + sz; yy++) {
          if (yy < 0 || yy >= h) continue;
          for (var xx = sx; xx < sx + sz && xx < w; xx++) b[yy * w + xx] = col;
        }
      }
    }

    function project(x, y, z, px, py, dirX, dirY, plX, plY, proj, hor, eye, out) {
      var invDet = 1 / (plX * dirY - dirX * plY);
      var rx = x - px, ry = y - py;
      var depth = invDet * (-plY * rx + plX * ry);
      if (depth < 0.15) return false;
      out[0] = (LW / 2) * (1 + (invDet * (dirY * rx - dirX * ry)) / depth);
      out[1] = hor + (eye - z) * (proj / depth);
      return true;
    }
    var pA = [0, 0], pB = [0, 0];
    function drawArcs(px, py, dirX, dirY, plX, plY, proj, hor, eye) {
      if (!arcs.length) return;
      lg.save();
      lg.strokeStyle = '#d8f6ff';
      lg.lineWidth = Math.max(1, LW / 320);
      lg.shadowColor = '#7ad7ff';
      lg.shadowBlur = 4;
      for (var i = 0; i < arcs.length; i++) {
        var a = arcs[i];
        if (!project(a.x0, a.y0, a.z0, px, py, dirX, dirY, plX, plY, proj, hor, eye, pA)) continue;
        if (!project(a.x1, a.y1, a.z1, px, py, dirX, dirY, plX, plY, proj, hor, eye, pB)) continue;
        lg.beginPath();
        lg.moveTo(pA[0], pA[1]);
        for (var k = 1; k < 6; k++) lg.lineTo(lerp(pA[0], pB[0], k / 6) + rnd(-3, 3), lerp(pA[1], pB[1], k / 6) + rnd(-3, 3));
        lg.lineTo(pB[0], pB[1]);
        lg.stroke();
      }
      lg.restore();
    }

    function drawWeapon() {
      var vm = vms[P.cur];
      if (!vm) return;
      var s = vmPx;
      var bobX = Math.sin(P.bob * 0.5) * 0.04 * s * P.bobAmt;
      var bobY = Math.abs(Math.cos(P.bob * 0.5)) * 0.04 * s * P.bobAmt;
      var x = LW / 2 - s / 2 + (portrait ? s * 0.08 : s * 0.22) + bobX;
      var y = LH - s + bobY + P.kick * 0.06 * s + s * 0.04;
      if (P.switchT > 0) y += (P.switchT / 0.3) * s * 0.7;
      var rot = 0;
      if (P.cur === 0 && P.swingT > 0) {
        // spade swing: wind up, then chop down and to the left
        var k = 1 - P.swingT / 0.34;
        var sw = Math.sin(k * Math.PI);
        x -= sw * s * 0.35;
        y += sw * s * 0.12 - Math.sin(k * Math.PI * 2) * s * 0.06;
        rot = -sw * 0.7;
      }
      // light the weapon with the light at the player's feet
      var li = lightIdx(P.x, P.y);
      var lr = clamp(lmCur[0][li] + 0.32, 0, 1.3), lgc = clamp(lmCur[1][li] + 0.3, 0, 1.3), lb = clamp(lmCur[2][li] + 0.3, 0, 1.3);
      var lum = clamp((lr + lgc + lb) / 3, 0.25, 1);
      vg.setTransform(1, 0, 0, 1, 0, 0);
      vg.clearRect(0, 0, s, s);
      vg.globalCompositeOperation = 'source-over';
      vg.drawImage(vm.canvas, 0, 0);
      vg.globalCompositeOperation = 'source-atop';
      vg.fillStyle = 'rgba(0,0,0,' + (1 - lum).toFixed(3) + ')';
      vg.fillRect(0, 0, s, s);
      vg.fillStyle = 'rgba(' + ((lr / (lr + lgc + lb + 0.001)) * 255 * 0.9 | 0) + ',' + ((lgc / (lr + lgc + lb + 0.001)) * 255 * 0.9 | 0) + ',' + ((lb / (lr + lgc + lb + 0.001)) * 255 * 0.9 | 0) + ',0.12)';
      vg.fillRect(0, 0, s, s);
      vg.globalCompositeOperation = 'source-over';
      lg.save();
      lg.imageSmoothingEnabled = false;
      if (rot) {
        lg.translate(x + s * 0.7, y + s);
        lg.rotate(rot);
        lg.drawImage(vmTmp, -s * 0.7, -s);
      } else lg.drawImage(vmTmp, Math.round(x), Math.round(y));
      lg.restore();
      if (P.flashT > 0) {
        var fs = s * (P.cur === 2 ? 0.7 : 0.45) * (0.85 + Math.random() * 0.3);
        lg.globalCompositeOperation = 'lighter';
        lg.drawImage(flashCanvas, x + vm.mx - fs / 2, y + vm.my - fs / 2, fs, fs);
        lg.globalCompositeOperation = 'source-over';
      }
    }

    /* ---------------- HUD ---------------- */
    function rr(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }
    function shadowText(t, x, y, col) {
      g.fillStyle = 'rgba(0,0,0,0.75)';
      g.fillText(t, x + Math.max(1, u * 1.5), y + Math.max(1, u * 1.5));
      g.fillStyle = col;
      g.fillText(t, x, y);
    }
    function drawHeart(x, y, s, col) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x, y + s * 0.35);
      g.bezierCurveTo(x, y - s * 0.1, x - s * 0.55, y - s * 0.1, x - s * 0.55, y + s * 0.25);
      g.bezierCurveTo(x - s * 0.55, y + s * 0.55, x, y + s * 0.75, x, y + s * 0.9);
      g.bezierCurveTo(x, y + s * 0.75, x + s * 0.55, y + s * 0.55, x + s * 0.55, y + s * 0.25);
      g.bezierCurveTo(x + s * 0.55, y - s * 0.1, x, y - s * 0.1, x, y + s * 0.35);
      g.fill();
    }
    function drawKeyIcon(x, y, s, col) {
      g.strokeStyle = col;
      g.lineWidth = Math.max(2, s * 0.16);
      g.beginPath();
      g.arc(x, y - s * 0.22, s * 0.22, 0, TAU);
      g.stroke();
      g.fillStyle = col;
      g.fillRect(x - s * 0.07, y, s * 0.14, s * 0.55);
      g.fillRect(x, y + s * 0.3, s * 0.2, s * 0.1);
      g.fillRect(x, y + s * 0.45, s * 0.16, s * 0.1);
    }

    function drawHud() {
      var pad = 10 * u + 4;
      g.textBaseline = 'middle';
      g.fillStyle = gradVig;
      g.fillRect(0, 0, W, H);
      var lowHp = P.alive ? clamp((30 - P.hp) / 30, 0, 1) * (0.5 + 0.25 * Math.sin(time * 6)) : 0;
      var hurtA = Math.max(hurtT * 0.8, lowHp);
      if (hurtA > 0.02) {
        g.globalAlpha = clamp(hurtA, 0, 1);
        g.fillStyle = gradHurt;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
      if (pickT > 0) {
        g.fillStyle = 'rgba(255,220,120,' + (pickT * 0.9).toFixed(3) + ')';
        g.fillRect(0, 0, W, H);
      }
      var cx = W / 2, cy = H / 2;
      // crosshair
      if (P.alive) {
        var cs = Math.max(2, 2.2 * u);
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.fillRect(cx - cs * 2.5, cy - cs * 0.5 - 1, cs * 5, cs + 2);
        g.fillRect(cx - cs * 0.5 - 1, cy - cs * 2.5, cs + 2, cs * 5);
        g.fillStyle = hitMarkT > 0 ? '#ff7a5a' : '#f4e3b0';
        g.fillRect(cx - cs * 2.5 + 1, cy - cs * 0.5, cs * 5 - 2, cs);
        g.fillRect(cx - cs * 0.5, cy - cs * 2.5 + 1, cs, cs * 5 - 2);
      }
      // damage direction arcs
      for (var d = 0; d < dmgDirs.length; d++) {
        var dd = dmgDirs[d];
        var rel = angDiff(P.a, dd.a) - Math.PI / 2;
        g.strokeStyle = 'rgba(255,70,50,' + (clamp(dd.t, 0, 1) * 0.85).toFixed(3) + ')';
        g.lineWidth = 6 * u;
        g.beginPath();
        g.arc(cx, cy, Math.min(W, H) * 0.2, rel - 0.3, rel + 0.3);
        g.stroke();
      }
      // --- health / armor / keys
      var bh = 40 * u + 6, hx = pad, hy;
      if (touchUI) hy = pad;
      else hy = H - pad - bh;
      g.font = fontL;
      var hpStr = '' + Math.ceil(P.hp), arStr = '' + Math.ceil(P.armor);
      var hw = g.measureText('150').width;
      var boxW = 36 * u + hw + (P.armor > 0 ? 36 * u + hw + 8 * u : 0) + 16 * u + (P.keys[1] || P.keys[2] ? 30 * u : 0);
      g.fillStyle = 'rgba(14,8,16,0.62)';
      rr(hx, hy, boxW, bh, 10 * u);
      g.fill();
      g.strokeStyle = 'rgba(212,166,42,0.35)';
      g.lineWidth = 1;
      g.stroke();
      drawHeart(hx + 18 * u, hy + bh * 0.24, 22 * u, '#e0413a');
      g.textAlign = 'left';
      shadowText(hpStr, hx + 34 * u, hy + bh / 2 + 1, P.hp > 50 ? '#f4e3b0' : P.hp > 25 ? '#ffc04a' : '#ff6a5a');
      var kx = hx + 34 * u + hw + 10 * u;
      if (P.armor > 0) {
        crCoatIcon(kx + 10 * u, hy + bh / 2, 22 * u);
        shadowText(arStr, kx + 26 * u, hy + bh / 2 + 1, '#a8c8ff');
        kx += 36 * u + hw;
      }
      if (P.keys[1]) { drawKeyIcon(kx + 8 * u, hy + bh * 0.42, 26 * u, '#d8dce6'); kx += 14 * u; }
      if (P.keys[2]) drawKeyIcon(kx + 8 * u, hy + bh * 0.42, 26 * u, '#ffcf3a');
      // --- ammo & weapon
      var w = CR_WEAPONS[P.cur];
      var amStr = w.ammo ? '' + P.ammo[w.ammo] : '∞';
      g.font = fontL;
      var aw = g.measureText(amStr).width;
      g.font = fontS;
      var nw = g.measureText(w.name.toUpperCase()).width;
      var abW = Math.max(aw, nw) + 28 * u;
      var ax = W - pad - abW, ay = touchUI ? pad + 46 : H - pad - bh - 14 * u;
      g.fillStyle = 'rgba(14,8,16,0.62)';
      rr(ax, ay, abW, bh + 14 * u, 10 * u);
      g.fill();
      g.strokeStyle = 'rgba(212,166,42,0.35)';
      g.stroke();
      g.textAlign = 'right';
      g.font = fontS;
      shadowText(w.name.toUpperCase(), W - pad - 14 * u, ay + 12 * u, '#d9c08a');
      g.font = fontL;
      var lowAmmo = w.ammo && P.ammo[w.ammo] <= Math.max(2, w.use * 2);
      shadowText(amStr, W - pad - 14 * u, ay + 14 * u + bh * 0.52, lowAmmo ? '#ff8a6a' : '#fff4d0');
      if (!touchUI) {
        g.font = fontS;
        var sw = 22 * u + 2, sg = 4 * u;
        var sx0 = W - pad - CR_WEAPONS.length * (sw + sg) + sg, sy0 = ay - sw - 6 * u;
        for (var wi = 0; wi < CR_WEAPONS.length; wi++) {
          if (!P.w[wi]) continue;
          var onW = wi === P.cur, empty = ammoFor(wi) < 1;
          g.fillStyle = onW ? 'rgba(217,139,43,0.9)' : 'rgba(14,8,16,0.62)';
          rr(sx0 + wi * (sw + sg), sy0, sw, sw, 5 * u);
          g.fill();
          g.textAlign = 'center';
          g.fillStyle = empty ? '#6b6170' : onW ? '#1d1406' : '#f4e3b0';
          g.fillText('' + (wi + 1), sx0 + wi * (sw + sg) + sw / 2, sy0 + sw / 2 + 1);
        }
      }
      // --- messages (top-left, DOS style)
      g.font = fontS;
      g.textAlign = 'left';
      var bossOn = boss && boss.alert && !boss.dead;
      var my = touchUI ? hy + bh + 14 * u + (bossOn ? 34 * u : 0) : pad + 8 * u;
      for (var m = 0; m < msgs.length; m++) {
        g.globalAlpha = clamp(msgs[m].t, 0, 1);
        shadowText(msgs[m].text, pad, my + m * 18 * u, msgs[m].col);
      }
      g.globalAlpha = 1;
      // --- boss bar
      if (bossOn) {
        var bw = Math.min(touchUI ? W - pad * 2 - 12 : W * 0.5, 420 * u), bx = touchUI ? pad + 6 : W / 2 - bw / 2, by = touchUI ? hy + bh + 10 * u : pad + 6 * u;
        g.fillStyle = 'rgba(14,8,16,0.7)';
        rr(bx - 6, by - 4, bw + 12, 24 * u + 8, 8 * u);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(bx, by + 14 * u, bw, 8 * u);
        g.fillStyle = boss.rage ? '#ff6a3a' : '#d9a62a';
        g.fillRect(bx, by + 14 * u, bw * clamp(boss.hp / boss.maxHp, 0, 1), 8 * u);
        g.font = fontS;
        g.textAlign = 'center';
        shadowText('GRAND SPOUT', bx + bw / 2, by + 6 * u, '#f4e3b0');
      }
      if (touchUI) drawTouch();
      // --- level title card
      if (levelT < 3.4 && state === 'play') {
        var al = clamp(Math.min(levelT * 2, (3.4 - levelT) * 1.5), 0, 1);
        g.globalAlpha = al;
        g.textAlign = 'center';
        g.font = fontS;
        shadowText('LEVEL ' + (li + 1) + ' OF ' + NL, cx, cy - 92 * u, '#d9c08a');
        g.font = fontXL;
        shadowText(L.name, cx, cy - 60 * u, '#f4e3b0');
        g.font = fontT;
        shadowText(L.sub, cx, cy - 26 * u, '#e0d0b0');
        g.globalAlpha = 1;
      }
      if (state === 'dead') {
        g.fillStyle = 'rgba(60,0,10,' + clamp(endT * 0.5, 0, 0.5).toFixed(3) + ')';
        g.fillRect(0, 0, W, H);
      }
      if (mapOpen) drawAutomap();
    }
    function crCoatIcon(x, y, s) {
      g.fillStyle = '#7a95c8';
      g.beginPath();
      g.moveTo(x - s * 0.3, y - s * 0.45);
      g.lineTo(x + s * 0.3, y - s * 0.45);
      g.lineTo(x + s * 0.45, y + s * 0.45);
      g.lineTo(x - s * 0.45, y + s * 0.45);
      g.closePath();
      g.fill();
      g.fillStyle = '#2a3550';
      g.fillRect(x - s * 0.04, y - s * 0.4, s * 0.08, s * 0.85);
    }
    function drawTouch() {
      var jx = joy.id !== -1 ? joy.bx : btn.joyR * 1.5, jy = joy.id !== -1 ? joy.by : H - btn.joyR * 1.6;
      g.globalAlpha = joy.id !== -1 ? 0.9 : 0.5;
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(jx, jy, btn.joyR, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.arc(jx + joy.x * btn.joyR * 0.6, jy + joy.y * btn.joyR * 0.6, btn.joyR * 0.42, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
      tbtn(btn.fire, input.fire ? 'rgba(224,104,43,0.8)' : 'rgba(224,104,43,0.5)', 'FIRE');
      tbtn(btn.swap, 'rgba(255,255,255,0.18)', '' + (P.cur + 1));
    }
    function tbtn(b, fill, label) {
      g.fillStyle = fill;
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '900 ' + Math.round(b.r * (label.length > 2 ? 0.42 : 0.7)) + 'px ' + FONT;
      g.fillText(label, b.x, b.y + 1);
    }
    function drawAutomap() {
      var cs = Math.max(2, Math.floor(Math.min((W * 0.9) / MW, (H * 0.78) / MH)));
      var mw = MW * cs, mh = MH * cs, ox = Math.round(W / 2 - mw / 2), oy = Math.round(H / 2 - mh / 2 + 10 * u);
      g.fillStyle = 'rgba(8,5,12,0.84)';
      g.fillRect(ox - 10, oy - 30 * u - 10, mw + 20, mh + 30 * u + 20);
      for (var y = 0; y < MH; y++)
        for (var x = 0; x < MW; x++) {
          var c = y * MW + x;
          if (!seen[c]) continue;
          var v = grid[c];
          if (!v) g.fillStyle = 'rgba(120,100,140,0.22)';
          else if (v === CR_DOOR) { var dr = doors[doorIx[c]]; g.fillStyle = dr.kind === 1 && dr.locked ? '#d8dce6' : dr.kind === 2 && dr.locked ? '#ffcf3a' : '#a0622a'; }
          else if (v === 5) g.fillStyle = '#9a6ad0';
          else g.fillStyle = '#b8a888';
          g.fillRect(ox + x * cs, oy + y * cs, cs, cs);
        }
      if (exitPos && seen[(exitPos.y | 0) * MW + (exitPos.x | 0)]) {
        g.fillStyle = !boss || boss.dead ? '#6aff9a' : '#3a5a44';
        g.fillRect(ox + (exitPos.x - 0.5) * cs, oy + (exitPos.y - 0.5) * cs, cs, cs);
      }
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it.on || !it.def.key || !seen[(it.y | 0) * MW + (it.x | 0)]) continue;
        g.fillStyle = it.def.key === 1 ? '#d8dce6' : '#ffcf3a';
        g.beginPath();
        g.arc(ox + it.x * cs, oy + it.y * cs, cs * 0.4, 0, TAU);
        g.fill();
      }
      var ppx = ox + P.x * cs, ppy = oy + P.y * cs, r = cs * 0.9;
      g.fillStyle = '#ff6a3a';
      g.beginPath();
      g.moveTo(ppx + Math.cos(P.a) * r, ppy + Math.sin(P.a) * r);
      g.lineTo(ppx + Math.cos(P.a + 2.5) * r * 0.75, ppy + Math.sin(P.a + 2.5) * r * 0.75);
      g.lineTo(ppx + Math.cos(P.a - 2.5) * r * 0.75, ppy + Math.sin(P.a - 2.5) * r * 0.75);
      g.closePath();
      g.fill();
      g.font = fontS;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      shadowText(L.name + ' · Kills ' + stats.kills + '/' + stats.total + ' · Secrets ' + stats.secrets + '/' + stats.secretsTotal, W / 2, oy - 16 * u, '#f4e3b0');
    }

    /* ---------------- overlays & flow ---------------- */
    function makeOverlay(o) {
      var ov = IGAME.ui.overlay(root, o);
      ov.panel.classList.add('cr-panel');
      if (H < 600 || W < 480) ov.panel.classList.add('cr-compact');
      return ov;
    }
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }
    function seg(key, name, opts, cur) {
      return '<div class="cr-opt"><b>' + name + '</b><div class="cr-seg" data-k="' + key + '">' +
        opts.map(function (o) {
          return '<button type="button" data-v="' + o[0] + '" class="' + (String(o[0]) === String(cur) ? 'on' : '') + '"' + (o[2] ? ' disabled' : '') + '>' + o[1] + '</button>';
        }).join('') + '</div></div>';
    }
    var ROMAN = ['I', 'II', 'III', 'IV'];
    function fmtT(s) { s = Math.round(s); return ((s / 60) | 0) + ':' + ('0' + (s % 60)).slice(-2); }

    function showMenu() {
      closeOverlay();
      state = 'menu';
      mapOpen = false;
      showHudButtons(false);
      exitLock();
      P = null;
      skill = CR_SKILLS[settings.skill];
      loadLevel(settings.level);
      var best = prog.best[settings.level];
      var html =
        '<div class="cr-opts">' +
        seg('level', 'Level', CR_LEVELS.map(function (l, i) { return [i, i < prog.unlocked ? ROMAN[i] : '🔒', i >= prog.unlocked]; }), settings.level) +
        '</div><p class="cr-lvl">“' + CR_LEVELS[settings.level].name + '” — ' + CR_LEVELS[settings.level].sub + '</p><div class="cr-opts">' +
        seg('skill', 'Skill', CR_SKILLS.map(function (s, i) { return [i, s.name]; }), settings.skill) +
        seg('pix', 'Pixels', [[0, 'Chunky'], [1, 'Crisp']], settings.pix) +
        (touchUI ? '' : seg('sens', 'Mouse', [[0.6, 'Slow'], [1, 'Normal'], [1.6, 'Fast']], settings.sens)) +
        '</div><p class="cr-small">' +
        (touchUI ? 'Left stick moves · drag right side to look · hold FIRE · doors open as you approach' : 'WASD move · mouse aims (click to lock) · click/Space fire · 1–5 weapons · M map') +
        (best ? '<br>Best on this level: ' + fmtT(best.time) + ' · kills ' + best.kills + '% · secrets ' + best.secrets + '/' + best.secretsTotal : '') +
        (prog.wins ? '<br>Episode cleared ' + prog.wins + '×' : '') + '</p>';
      overlay = makeOverlay({
        title: ctx.title || 'Gravewick',
        text: 'Night shift at the cemetery: find the keys, open the doors, reach the glowing exit.',
        html: html,
        buttons: [{ label: '▶ Play', primary: true, onClick: function () { startLevel(settings.level); } }],
      });
      Array.prototype.forEach.call(overlay.el.querySelectorAll('.cr-seg button'), function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (b.disabled) return;
          var k = b.parentNode.getAttribute('data-k'), v = parseFloat(b.getAttribute('data-v'));
          settings[k] = v;
          saveSettings();
          sfx('click');
          if (k === 'pix') layout();
          showMenu();
        });
      });
    }

    function startLevel(i) {
      closeOverlay();
      skill = CR_SKILLS[settings.skill];
      loadLevel(i);
      var lo = prog.carry[i] || CR_DEFAULT_LOADOUT[i];
      P = makePlayer(lo);
      state = 'play';
      levelT = 0;
      endT = 0;
      hurtT = 0;
      shake = 0;
      mapOpen = false;
      input.fire = false;
      showHudButtons(true);
      requestLock();
      sfx({ f: 98, f2: 65, d: 1.2, type: 'triangle', v: 0.1 });
      sfx({ f: 147, f2: 98, d: 1.2, type: 'triangle', v: 0.06, delay: 0.15 });
      if (ctx.debug) exposeDebug();
    }

    function completeLevel() {
      if (state !== 'play') return;
      state = 'done';
      endT = 0;
      input.fire = false;
      exitLock();
      showHudButtons(false);
      sfx('win');
      var killPct = stats.total ? Math.round((stats.kills / stats.total) * 100) : 100;
      var b0 = prog.best[li];
      prog.best[li] = {
        time: b0 ? Math.min(b0.time, stats.time) : stats.time,
        kills: b0 ? Math.max(b0.kills, killPct) : killPct,
        secrets: b0 ? Math.max(b0.secrets, stats.secrets) : stats.secrets,
        secretsTotal: stats.secretsTotal,
      };
      if (li + 1 < NL) {
        prog.unlocked = Math.max(prog.unlocked, li + 2);
        prog.carry[li + 1] = { w: P.w.slice(), ammo: { embers: P.ammo.embers, shells: P.ammo.shells, garlic: P.ammo.garlic, bolts: P.ammo.bolts }, hp: Math.max(75, Math.min(150, Math.ceil(P.hp))), armor: Math.ceil(P.armor) };
        settings.level = li + 1;
        saveSettings();
      } else prog.wins++;
      saveProg();
    }

    function statTable(extra) {
      var killPct = stats.total ? Math.round((stats.kills / stats.total) * 100) : 100;
      return '<table class="cr-tbl"><tbody>' +
        '<tr><td>Kills</td><td class="n">' + stats.kills + ' / ' + stats.total + ' (' + killPct + '%)</td></tr>' +
        '<tr><td>Secrets</td><td class="n">' + stats.secrets + ' / ' + stats.secretsTotal + '</td></tr>' +
        '<tr><td>Time</td><td class="n">' + fmtT(stats.time) + '</td></tr>' + (extra || '') + '</tbody></table>';
    }

    function showDone() {
      var last = li + 1 >= NL;
      var best = prog.best[li];
      overlay = makeOverlay({
        title: last ? '🕯️ Episode complete!' : 'Level complete!',
        text: last ? 'The bell tower is quiet. Mortimer clocks off and puts the kettle on.' : '“' + L.name + '” is cleared. Next: “' + CR_LEVELS[li + 1].name + '”.',
        html: statTable(best ? '<tr><td>Best time</td><td class="n">' + fmtT(best.time) + '</td></tr>' : ''),
        buttons: last
          ? [{ label: 'Play again', primary: true, onClick: function () { settings.level = 0; saveSettings(); startLevel(0); } }, { label: 'Menu', onClick: showMenu }]
          : [{ label: 'Next level ▶', primary: true, onClick: function () { startLevel(li + 1); } }, { label: 'Menu', onClick: showMenu }],
      });
    }

    var DEATH_LINES = ['Well, that was grave.', 'Back to the dirt nap.', 'You have been laid to rest. Briefly.', 'Your shift ended early.'];
    function showDeath() {
      var who = P.killer && P.killer.def ? 'Done in by a ' + P.killer.def.name + '.' : 'Done in by something nasty.';
      overlay = makeOverlay({
        title: 'You expired',
        text: DEATH_LINES[(Math.random() * DEATH_LINES.length) | 0] + ' ' + who,
        html: statTable(),
        buttons: [{ label: 'Retry level', primary: true, onClick: function () { startLevel(li); } }, { label: 'Menu', onClick: showMenu }],
      });
    }

    function openPause() {
      if (state !== 'play') return;
      state = 'paused';
      input.fire = false;
      releaseTouches();
      exitLock();
      overlay = makeOverlay({
        title: 'Paused',
        text: 'Level ' + (li + 1) + ': ' + L.name,
        html: statTable(),
        buttons: [
          { label: 'Resume', primary: true, onClick: resumeGame },
          { label: 'Restart level', onClick: function () { startLevel(li); } },
          { label: 'Menu', onClick: showMenu },
        ],
      });
    }
    function resumeGame() {
      closeOverlay();
      if (state !== 'paused') return;
      state = 'play';
      requestLock();
    }
    function showHudButtons(on) {
      pauseBtn.classList.toggle('show', on);
      mapBtn.classList.toggle('show', on);
    }

    /* ---------------- input ---------------- */
    function requestLock() {
      if (touchUI || !canvas.requestPointerLock) return;
      try {
        var p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(noop);
      } catch (e) {}
    }
    function exitLock() {
      if (document.pointerLockElement === canvas) {
        ignoreUnlock = true;
        try { document.exitPointerLock(); } catch (e) {}
      }
    }
    function onLockChange() {
      var was = locked;
      locked = document.pointerLockElement === canvas;
      if (was && !locked && state === 'play' && !ignoreUnlock) openPause();
      if (!locked) ignoreUnlock = false;
    }
    function localXY(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function inCircle(p, b) {
      var dx = p[0] - b.x, dy = p[1] - b.y, r = b.r * 1.15;
      return dx * dx + dy * dy < r * r;
    }
    function onPointerDown(e) {
      var isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (isTouch) touchUI = true;
      else if (e.pointerType === 'mouse') touchUI = false;
      ctx.focus();
      if (state !== 'play') return;
      e.preventDefault();
      if (!isTouch) {
        if (!locked) requestLock();
        if (e.button === 0) input.fire = true;
        return;
      }
      var p = localXY(e), role = 'look';
      if (inCircle(p, btn.fire)) { role = 'fire'; input.fire = true; }
      else if (inCircle(p, btn.swap)) { role = 'btn'; cycleWeapon(1); }
      else if (p[0] < W * 0.45 && p[1] > H * 0.3 && joy.id === -1) {
        role = 'move';
        joy.id = e.pointerId;
        joy.bx = clamp(p[0], btn.joyR, W * 0.45);
        joy.by = clamp(p[1], btn.joyR, H - btn.joyR * 0.6);
        joy.x = joy.y = 0;
      }
      pointers[e.pointerId] = { role: role, x: p[0], y: p[1] };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onPointerMove(e) {
      if (state !== 'play') return;
      if (e.pointerType === 'mouse') {
        if (locked && P && P.alive) {
          var mx = e.movementX || 0;
          if (mx > 300 || mx < -300) return;
          input.lookDX += mx * 0.0022 * settings.sens;
        }
        return;
      }
      var pt = pointers[e.pointerId];
      if (!pt) return;
      var p = localXY(e);
      if (pt.role === 'look' || pt.role === 'fire') input.lookDX += (p[0] - pt.x) * 0.0065 * clamp(420 / Math.min(W, H), 0.7, 1.4);
      else if (pt.role === 'move') {
        var dx = (p[0] - joy.bx) / btn.joyR, dy = (p[1] - joy.by) / btn.joyR, l = Math.sqrt(dx * dx + dy * dy);
        if (l > 1) { dx /= l; dy /= l; }
        joy.x = dx;
        joy.y = dy;
      }
      pt.x = p[0];
      pt.y = p[1];
    }
    function onPointerUp(e) {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) input.fire = false;
        return;
      }
      var pt = pointers[e.pointerId];
      if (!pt) return;
      delete pointers[e.pointerId];
      if (pt.role === 'fire') {
        var still = false;
        for (var k in pointers) if (pointers[k].role === 'fire') still = true;
        input.fire = still;
      } else if (pt.role === 'move') {
        joy.id = -1;
        joy.x = joy.y = 0;
      }
    }
    function releaseTouches() {
      pointers = {};
      joy.id = -1;
      joy.x = joy.y = 0;
      input.fire = false;
    }
    function onWheel(e) {
      if (state !== 'play' || !locked) return;
      e.preventDefault();
      cycleWeapon(e.deltaY > 0 ? 1 : -1);
    }

    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP', 'KeyQ', 'KeyM', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Enter', 'ShiftLeft', 'ShiftRight']);
    ctx.onKey(function (code, down, e) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          var b = overlay.el.querySelector('.ig-actions button:focus') || overlay.panel.querySelector('.ig-actions .ig-btn');
          if (b) { if (e) e.preventDefault(); b.click(); }
        } else if ((code === 'KeyP' || code === 'Escape') && state === 'paused') resumeGame();
        return;
      }
      if (state !== 'play') return;
      if (code === 'KeyP' || code === 'Escape') { openPause(); return; }
      if (code === 'KeyM') { mapOpen = !mapOpen; sfx('tick'); return; }
      if (code === 'KeyQ') selectWeapon(P.prev);
      else if (code.indexOf('Digit') === 0) selectWeapon(parseInt(code.slice(5), 10) - 1);
    });

    on(canvas, 'pointerdown', onPointerDown);
    on(canvas, 'pointermove', onPointerMove);
    on(canvas, 'pointerup', onPointerUp);
    on(canvas, 'pointercancel', onPointerUp);
    on(canvas, 'contextmenu', function (e) { e.preventDefault(); });
    on(canvas, 'wheel', onWheel, { passive: false });
    on(document, 'pointerlockchange', onLockChange);
    on(window, 'blur', function () { input.fire = false; });
    on(window, 'pointerup', function (e) { if (e.pointerType === 'mouse' && !locked) input.fire = false; });
    on(pauseBtn, 'click', function (e) { e.stopPropagation(); sfx('click'); openPause(); });
    on(pauseBtn, 'pointerdown', function (e) { e.stopPropagation(); });
    on(mapBtn, 'click', function (e) { e.stopPropagation(); mapOpen = !mapOpen; sfx('tick'); });
    on(mapBtn, 'pointerdown', function (e) { e.stopPropagation(); });

    function exposeDebug() {
      window.__crypt = {
        get state() { return state; },
        get P() { return P; },
        get foes() { return foes; },
        get stats() { return stats; },
        info: function () {
          return JSON.stringify({ s: state, lvl: li, hp: Math.round(P.hp), ar: Math.round(P.armor), cur: P.cur, ammo: P.ammo, keys: P.keys, kills: stats.kills + '/' + stats.total, sec: stats.secrets + '/' + stats.secretsTotal, fps: Math.round(fpsAvg), LW: LW, LH: LH, x: P.x.toFixed(2), y: P.y.toFixed(2), a: P.a.toFixed(2), projs: projs.length, alerted: foes.filter(function (f) { return f.alert && !f.dead; }).length });
        },
        tp: function (x, y, a) { P.x = x; P.y = y; if (a != null) P.a = a; },
        face: function (x, y) { P.a = Math.atan2(y - P.y, x - P.x); },
        give: function () { P.w = [1, 1, 1, 1, 1]; P.ammo = { embers: 90, shells: 60, garlic: 12, bolts: 40 }; P.keys = [true, true, true]; },
        god: function () { P.hp = 9999; },
        killAll: function () { foes.forEach(function (f) { if (!f.dead) killFoe(f); }); },
        exit: function () { if (exitPos) { P.x = exitPos.x; P.y = exitPos.y; } },
        finish: function () { completeLevel(); },
        hurt: function (n) { hurtPlayer(n, null); },
        level: function (i) { startLevel(i); },
      };
    }

    /* ---------------- loop ---------------- */
    var fpsAvg = 60;
    var loop = IGAME.loop(function (dt) {
      if (dt > 0) fpsAvg = fpsAvg * 0.95 + (1 / dt) * 0.05;
      update(dt);
      render();
    });

    ready = true;
    layout();
    showMenu();
    loop.start();

    return {
      pause: function () {
        if (state === 'play') openPause();
        loop.stop();
      },
      resume: function () { loop.start(); },
      destroy: function () {
        loop.stop();
        exitLock();
        closeOverlay();
        for (var i = 0; i < listeners.length; i++) {
          var l = listeners[i];
          l[0].removeEventListener(l[1], l[2], l[3]);
        }
        listeners.length = 0;
        view.destroy();
        [pauseBtn, mapBtn, style].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        if (ctx.debug) try { delete window.__crypt; } catch (e) {}
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('crypt-shooter', function (ctx) {
    // Variant 'crypt' (Gravewick) is a separate single-player campaign mode with its own
    // loop and renderer; the default deathmatch below is untouched by it.
    if (ctx.variant === 'crypt') return createCrypt(ctx);
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var noiseFx = (IGAME.sfx && IGAME.sfx.noise) || noop;

    var settings = store.get('settings', null) || {};
    settings = {
      map: clamp(settings.map | 0, 0, MAPS.length - 1),
      bots: [3, 5, 7].indexOf(settings.bots) > -1 ? settings.bots : 5,
      skill: clamp(settings.skill == null ? 1 : settings.skill | 0, 0, 2),
      goal: [10, 15, 25].indexOf(settings.goal) > -1 ? settings.goal : 15,
      sens: [0.6, 1, 1.6].indexOf(settings.sens) > -1 ? settings.sens : 1,
    };
    var stats = store.get('stats', null) || { matches: 0, wins: 0, kills: 0, bestStreak: 0, best: {} };
    if (!stats.best) stats.best = {};

    // ---------- DOM: style, canvas, pause button
    var style = document.createElement('style');
    style.textContent =
      '.as-opts{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin:2px 0 12px;text-align:left}' +
      '.as-opt{display:flex;align-items:center;gap:8px;min-width:0}' +
      '.as-opt>b{flex:0 0 50px;font:800 11px var(--font);color:var(--muted);text-transform:uppercase;letter-spacing:.06em}' +
      '.as-seg{display:flex;gap:4px;flex:1;min-width:0}' +
      '.as-seg button{flex:1;min-width:0;font:700 13px/1.15 var(--font);color:var(--text-2);background:var(--surface-3);border:0;border-radius:9px;padding:8px 4px;cursor:pointer;overflow-wrap:anywhere;touch-action:manipulation}' +
      '.as-seg button.on{color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2))}' +
      '.as-small{font-size:12.5px;color:var(--muted);margin:0 0 12px}' +
      '.as-tbl{width:100%;border-collapse:collapse;font-size:14px;margin:0 0 10px}' +
      '.as-tbl th{font:800 11px var(--font);color:var(--muted);text-transform:uppercase;letter-spacing:.05em;text-align:left;padding:4px 6px}' +
      '.as-tbl td{padding:5px 6px;text-align:left;border-top:1px solid rgba(255,255,255,.07);color:var(--text-2)}' +
      '.as-tbl td.n,.as-tbl th.n{text-align:right}' +
      '.as-tbl tr.me td{color:#fff;font-weight:800;background:rgba(139,108,255,.22)}' +
      '.as-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:0}' +
      '.as-compact.ig-panel{padding:14px 12px}.as-compact .ig-title{font-size:21px;margin-bottom:4px}.as-compact .ig-sub{font-size:13.5px;margin-bottom:8px}' +
      '.as-compact .as-tbl{font-size:12.5px;margin-bottom:6px}.as-compact .as-tbl td{padding:3px 5px}.as-compact .as-small{font-size:11.5px;margin-bottom:8px}.as-compact .ig-btn{padding:10px 16px;font-size:15px}.as-compact .as-opts{gap:6px}.as-compact .as-seg button{padding:7px 3px;font-size:12.5px}' +
      '.as-pause{position:absolute;top:8px;right:8px;z-index:6;width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.18);background:rgba(5,6,14,.55);color:#fff;display:none;place-items:center;cursor:pointer;padding:0;touch-action:manipulation}' +
      '.as-pause svg{width:16px;height:16px}' +
      '.as-pause.show{display:grid}';
    root.appendChild(style);

    var W = 1, H = 1, u = 1, colW = 2, cols = 1;
    var zbuf = new Float32Array(1);
    var planeBase = 0.8, projDist = 600, zoom = 1;
    var g = null;
    var portrait = false;
    var view = IGAME.createCanvas(root, { onResize: onResize });
    var canvas = view.canvas;
    g = view.ctx;

    var pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'as-pause';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>';
    root.appendChild(pauseBtn);

    // ---------- art caches
    var botFrames = BOT_COLORS.map(makeBotFrames);
    var pickupSprites = { h: makePickupSprite('h'), a: makePickupSprite('a'), m: makePickupSprite('m') };
    var rocketSprite = makeGlow('rgba(255,250,220,1)', 'rgba(255,140,30,0.9)', 32);
    var flashSprite = makeFlash(128);
    var viewModels = [];
    var gradCeil = null, gradFloor = null, gradVignette = null, gradHurt = null;
    var fontS = '', fontM = '', fontL = '', fontXL = '';

    // ---------- world state
    var map = null, MW = 0, MH = 0, grid = null, textures = [], spawns = [], pickups = [];
    var combatants = [], player = null, rockets = [], booms = [];
    var state = 'menu'; // menu | play | paused | over
    var countdown = 0, timeLeft = MATCH_TIME, overT = 0, matchStats = null;
    var feed = [], centerMsg = null, hitMarkT = 0, hitMarkKill = false, dmgDirs = [], hurtT = 0;
    var shake = 0, slowmo = 1, time = 0;
    var skill = SKILLS[settings.skill];
    var attractCam = { x: 3, y: 3, a: 0 };
    var overlay = null;

    // ---------- player weapon state
    var pw = { cur: 1, prev: 0, mag: [], res: [], cool: 0, reloadT: 0, switchT: 0, kick: 0, flashT: 0, bob: 0, bobAmt: 0, shots: 0, hits: 0, streak: 0, bestStreak: 0, aimTarget: null };

    // ---------- input state
    var input = { fire: false, aim: false, joyX: 0, joyY: 0, lookDX: 0 };
    var locked = false, ignoreUnlock = false;
    var pointers = {}; // touch pointers by id
    var joy = { id: -1, bx: 0, by: 0, x: 0, y: 0 };
    var touchUI = !!ctx.isTouch;
    var btn = { fire: { x: 0, y: 0, r: 0 }, reload: { x: 0, y: 0, r: 0 }, swap: { x: 0, y: 0, r: 0 }, joyR: 50 };
    var listeners = [];
    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    }

    /* ---------------- particles (fixed pool) ---------------- */
    var P_MAX = 260;
    var parts = [];
    for (var pi = 0; pi < P_MAX; pi++) parts.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, col: '#fff', size: 0.02, grav: 0 });
    var pCursor = 0;
    function emit(x, y, z, n, col, speed, size, life, grav) {
      for (var i = 0; i < n; i++) {
        var p = parts[pCursor];
        pCursor = (pCursor + 1) % P_MAX;
        var a = Math.random() * TAU, sp = speed * (0.3 + Math.random() * 0.7);
        p.on = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
        p.vz = (Math.random() - 0.3) * speed;
        p.life = p.max = life * (0.6 + Math.random() * 0.6);
        p.col = col;
        p.size = size * (0.6 + Math.random() * 0.8);
        p.grav = grav;
      }
    }

    /* ---------------- layout ---------------- */
    function onResize(w, h) {
      W = w;
      H = h;
      if (g) layout();
    }

    function layout() {
      var w = W, h = H;
      portrait = h > w * 1.05;
      u = clamp(Math.min(w, h * 1.5) / 820, 0.62, 1.6);
      colW = w > 1500 ? 3 : w > 640 ? 2 : 1;
      cols = Math.ceil(w / colW);
      zbuf = new Float32Array(cols);
      planeBase = clamp((w / h) * 0.47, 0.5, 0.86);
      g.imageSmoothingEnabled = false;
      fontS = '700 ' + Math.round(Math.max(11, 12 * u)) + 'px ' + FONT;
      fontM = '800 ' + Math.round(Math.max(13, 16 * u)) + 'px ' + FONT;
      fontL = '900 ' + Math.round(Math.max(20, 30 * u)) + 'px ' + FONT;
      fontXL = '900 ' + Math.round(Math.max(30, 54 * u)) + 'px ' + FONT;
      var vmPx = Math.round(clamp(portrait ? h * 0.34 : h * 0.44, 120, 480));
      viewModels = [];
      for (var i = 0; i < WEAPONS.length; i++) viewModels.push(makeViewModel(i, vmPx));
      var S = Math.min(w, h);
      btn.joyR = clamp(S * 0.13, 40, 80);
      btn.fire.r = clamp(S * 0.105, 34, 62);
      btn.fire.x = w - btn.fire.r * 1.55;
      btn.fire.y = h - btn.fire.r * 1.75;
      btn.reload.r = btn.swap.r = btn.fire.r * 0.6;
      btn.reload.x = btn.fire.x - btn.fire.r * 1.95;
      btn.reload.y = h - btn.reload.r * 1.5;
      btn.swap.x = btn.fire.x;
      btn.swap.y = btn.fire.y - btn.fire.r * 1.9;
      buildGradients();
      if (state !== 'play') render(0);
    }

    function buildGradients() {
      if (!map) return;
      gradCeil = g.createLinearGradient(0, 0, 0, H / 2);
      gradCeil.addColorStop(0, map.ceil[0]);
      gradCeil.addColorStop(1, map.ceil[1]);
      gradFloor = g.createLinearGradient(0, H / 2, 0, H);
      gradFloor.addColorStop(0, map.fog);
      gradFloor.addColorStop(0.18, map.floor[0]);
      gradFloor.addColorStop(1, map.floor[1]);
      var R = Math.sqrt(W * W + H * H) / 2;
      gradVignette = g.createRadialGradient(W / 2, H / 2, R * 0.45, W / 2, H / 2, R);
      gradVignette.addColorStop(0, 'rgba(0,0,0,0)');
      gradVignette.addColorStop(1, 'rgba(0,0,0,0.45)');
      gradHurt = g.createRadialGradient(W / 2, H / 2, R * 0.35, W / 2, H / 2, R);
      gradHurt.addColorStop(0, 'rgba(200,0,0,0)');
      gradHurt.addColorStop(1, 'rgba(200,0,0,0.75)');
    }

    /* ---------------- map ---------------- */
    function loadMap(i) {
      map = MAPS[i];
      var rows = map.half.map(function (r) { return r + r.split('').reverse().join(''); });
      MH = rows.length;
      MW = rows[0].length;
      grid = new Uint8Array(MW * MH);
      spawns = [];
      pickups = [];
      var codes = { '#': 1, '=': 2, '%': 3, '+': 4 };
      var keys = ['#', '=', '%', '+'];
      textures = [null];
      for (var k = 0; k < 4; k++) {
        var kind = map.tex[keys[k]];
        var t = makeTexture(kind, map.pal[kind] || '#777', 11 + k * 31 + i * 7);
        textures.push([t, darkened(t, 0.28)]);
      }
      for (var y = 0; y < MH; y++)
        for (var x = 0; x < MW; x++) {
          var ch = rows[y].charAt(x);
          if (codes[ch]) grid[y * MW + x] = codes[ch];
          else if (ch === 'P') spawns.push({ x: x + 0.5, y: y + 0.5 });
          else if (ch === 'h' || ch === 'a' || ch === 'm') pickups.push({ type: ch, x: x + 0.5, y: y + 0.5, on: true, t: 0, ph: Math.random() * TAU });
        }
      // camera for the menu attract mode: open cell near the middle
      attractCam.x = MW / 2;
      attractCam.y = MH / 2 + 0.5;
      if (solid(attractCam.x, attractCam.y)) attractCam = { x: spawns[0].x, y: spawns[0].y, a: 0 };
      buildGradients();
    }

    function solid(x, y) {
      var ix = x | 0, iy = y | 0;
      if (ix < 0 || iy < 0 || ix >= MW || iy >= MH) return true;
      return grid[iy * MW + ix] !== 0;
    }
    function blocked(x, y, r) {
      return solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r);
    }
    function moveEnt(e, dx, dy, r) {
      if (!blocked(e.x + dx, e.y, r)) e.x += dx;
      if (!blocked(e.x, e.y + dy, r)) e.y += dy;
    }
    // DDA grid ray: distance to first wall along a unit direction (capped).
    function castRay(x, y, dx, dy, maxD) {
      var mx = x | 0, my = y | 0;
      var ddx = dx === 0 ? 1e9 : Math.abs(1 / dx), ddy = dy === 0 ? 1e9 : Math.abs(1 / dy);
      var sx, sy, tx, ty;
      if (dx < 0) { sx = -1; tx = (x - mx) * ddx; } else { sx = 1; tx = (mx + 1 - x) * ddx; }
      if (dy < 0) { sy = -1; ty = (y - my) * ddy; } else { sy = 1; ty = (my + 1 - y) * ddy; }
      for (var n = 0; n < 80; n++) {
        var d;
        if (tx < ty) { d = tx; tx += ddx; mx += sx; } else { d = ty; ty += ddy; my += sy; }
        if (d > maxD) return maxD;
        if (mx < 0 || my < 0 || mx >= MW || my >= MH || grid[my * MW + mx]) return d;
      }
      return maxD;
    }
    function los(x0, y0, x1, y1) {
      var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.01) return true;
      return castRay(x0, y0, dx / d, dy / d, d) >= d - 0.01;
    }

    // BFS on the grid → array of cell-centre waypoints from (sx,sy) to (gx,gy).
    var bfsPrev = null, bfsQueue = null;
    function findPath(sx, sy, gx, gy) {
      var n = MW * MH;
      if (!bfsPrev || bfsPrev.length !== n) {
        bfsPrev = new Int32Array(n);
        bfsQueue = new Int32Array(n);
      }
      bfsPrev.fill(-2);
      var s = (sy | 0) * MW + (sx | 0), goal = (gy | 0) * MW + (gx | 0);
      if (grid[goal]) return null;
      var qh = 0, qt = 0;
      bfsQueue[qt++] = s;
      bfsPrev[s] = -1;
      while (qh < qt) {
        var c = bfsQueue[qh++];
        if (c === goal) break;
        var cx = c % MW, cy = (c / MW) | 0;
        for (var k = 0; k < 4; k++) {
          var nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
          var ni = ny * MW + nx;
          if (grid[ni] || bfsPrev[ni] !== -2) continue;
          bfsPrev[ni] = c;
          bfsQueue[qt++] = ni;
        }
      }
      if (bfsPrev[goal] === -2) return null;
      var path = [];
      for (var p = goal; p !== -1 && p !== s; p = bfsPrev[p]) path.push(p);
      path.reverse();
      return path;
    }

    /* ---------------- combatants ---------------- */
    function makeCombatant(name, idx, isPlayer) {
      return {
        name: name, idx: idx, isPlayer: isPlayer, color: isPlayer ? '#ffffff' : BOT_COLORS[idx],
        frames: isPlayer ? null : botFrames[idx],
        x: 0, y: 0, a: 0, hp: 100, armor: 0, alive: false, respawnT: 0, protect: 0, kills: 0, deaths: 0,
        wi: 1, mag: 0, cool: 0, reloadT: 0, burst: 0, target: null, see: false, seeT: 0, reactT: 0,
        lastX: 0, lastY: 0, huntT: 0, path: null, pathI: 0, repathT: 0, strafe: 1, strafeT: 0,
        painT: 0, shootT: 0, walkT: 0, moving: false, stuckT: 0, sx: 0, sy: 0, perceiveT: Math.random() * 0.2,
        deadT: 0, killer: null, lastHitBy: null, lastHitT: 0, vx: 0, vy: 0,
      };
    }

    function pickSpawn(c) {
      var best = null, bestScore = -1;
      for (var i = 0; i < spawns.length; i++) {
        var s = spawns[i], minD = 99;
        for (var j = 0; j < combatants.length; j++) {
          var o = combatants[j];
          if (o === c || !o.alive) continue;
          var d = Math.hypot(o.x - s.x, o.y - s.y);
          if (d < minD) minD = d;
        }
        var score = minD + Math.random() * 4;
        if (score > bestScore) { bestScore = score; best = s; }
      }
      return best;
    }

    function spawn(c) {
      var s = pickSpawn(c);
      c.x = s.x;
      c.y = s.y;
      // face the middle of the map
      c.a = Math.atan2(MH / 2 - s.y, MW / 2 - s.x);
      c.hp = 100;
      c.armor = 0;
      c.alive = true;
      c.protect = 1.5;
      c.target = null;
      c.path = null;
      c.painT = 0;
      c.deadT = 0;
      c.vx = c.vy = 0;
      if (c.isPlayer) {
        for (var i = 0; i < WEAPONS.length; i++) {
          pw.mag[i] = WEAPONS[i].mag;
          pw.res[i] = WEAPONS[i].reserve;
        }
        pw.cur = 1;
        pw.prev = 0;
        pw.reloadT = 0;
        pw.switchT = 0.3;
        pw.cool = 0;
        pw.streak = 0;
      } else {
        c.wi = BOT_WEAPONS[(Math.random() * BOT_WEAPONS.length) | 0];
        c.mag = WEAPONS[c.wi].mag;
        c.reloadT = 0;
        c.reactT = rnd(skill.react[0], skill.react[1]);
      }
    }

    /* ---------------- match flow ---------------- */
    function startMatch() {
      closeOverlay();
      skill = SKILLS[settings.skill];
      loadMap(settings.map);
      combatants = [];
      player = makeCombatant('You', -1, true);
      combatants.push(player);
      var order = BOT_NAMES.map(function (n, i) { return i; }).sort(function () { return Math.random() - 0.5; });
      for (var i = 0; i < settings.bots; i++) combatants.push(makeCombatant(BOT_NAMES[order[i]], order[i], false));
      for (var j = 0; j < combatants.length; j++) spawn(combatants[j]);
      rockets = [];
      booms = [];
      feed = [];
      dmgDirs = [];
      for (var k = 0; k < P_MAX; k++) parts[k].on = false;
      pw.shots = pw.hits = pw.bestStreak = 0;
      timeLeft = MATCH_TIME;
      countdown = 2.6;
      hurtT = 0;
      shake = 0;
      slowmo = 1;
      centerMsg = null;
      state = 'play';
      pauseBtn.classList.add('show');
      requestLock();
      sfx('levelup');
      if (ctx.debug) window.__arena = { get state() { return state; }, get player() { return player; }, get bots() { return combatants.slice(1); }, end: function () { endMatch(); },
        face: function () {
          var best = null, bd = 1e9;
          for (var i = 1; i < combatants.length; i++) {
            var b = combatants[i], d = Math.hypot(b.x - player.x, b.y - player.y);
            if (b.alive && d < bd && los(player.x, player.y, b.x, b.y)) { bd = d; best = b; }
          }
          if (best) player.a = Math.atan2(best.y - player.y, best.x - player.x);
          return best ? best.name + ' ' + bd.toFixed(1) : 'none visible';
        },
        meet: function (dist) {
          for (var i = 1; i < combatants.length; i++) {
            var b = combatants[i];
            if (!b.alive) continue;
            for (var k = 0; k < 16; k++) {
              var a = (k / 16) * TAU, x = b.x + Math.cos(a) * (dist || 2.5), y = b.y + Math.sin(a) * (dist || 2.5);
              if (!blocked(x, y, 0.3) && los(x, y, b.x, b.y)) {
                player.x = x; player.y = y; player.a = Math.atan2(b.y - y, b.x - x);
                return b.name;
              }
            }
          }
          return 'none';
        },
        info: function () { return JSON.stringify({ shots: pw.shots, hits: pw.hits, mag: pw.mag[pw.cur], rl: +pw.reloadT.toFixed(2), s: state, fps: Math.round(fpsAvg), t: Math.round(timeLeft), hp: player.hp | 0, k: player.kills, d: player.deaths, bots: combatants.slice(1).map(function (b) { return b.name + ':' + b.kills + '/' + b.deaths + (b.see ? '!' : b.target ? '?' : '') + '@' + b.x.toFixed(0) + ',' + b.y.toFixed(0); }).join(' ') }); } };
    }

    function endMatch() {
      if (state !== 'play') return;
      state = 'over';
      overT = 0;
      slowmo = 0.25;
      input.fire = false;
      var ranked = combatants.slice().sort(function (a, b) { return b.kills - a.kills || a.deaths - b.deaths || (a.isPlayer ? -1 : 1); });
      var rank = ranked.indexOf(player) + 1;
      var other = ranked[rank === 1 ? 1 : 0];
      var tied = rank === 1 && (player.kills === 0 || (other && other.kills === player.kills && other.deaths === player.deaths));
      var key = 'm' + settings.map;
      stats.matches++;
      stats.kills += player.kills;
      if (rank === 1 && !tied) stats.wins++;
      var prevBest = stats.best[key] || 0;
      var newBest = player.kills > prevBest;
      if (newBest) stats.best[key] = player.kills;
      if (pw.bestStreak > stats.bestStreak) stats.bestStreak = pw.bestStreak;
      store.set('stats', stats);
      matchStats = { ranked: ranked, rank: rank, tied: tied, newBest: newBest };
      sfx(rank === 1 && !tied ? 'win' : 'lose');
      exitLock();
      pauseBtn.classList.remove('show');
    }

    function addFeed(killer, victim, wi) {
      feed.unshift({ k: killer, v: victim, w: wi, t: 5 });
      if (feed.length > 5) feed.length = 5;
    }

    function say(text, sub, col) {
      centerMsg = { text: text, sub: sub || '', t: 1.6, col: col || '#fff' };
    }

    /* ---------------- damage ---------------- */
    function damage(t, amount, src, wi) {
      if (!t.alive || state !== 'play') return;
      if (t.protect > 0 && src !== t) amount *= 0.25;
      var absorb = Math.min(t.armor, amount * 0.6);
      t.armor -= absorb;
      amount -= absorb;
      t.hp -= amount;
      t.painT = 0.12;
      t.lastHitBy = src;
      t.lastHitT = time;
      if (t.isPlayer) {
        hurtT = Math.min(1, hurtT + amount / 40);
        shake = Math.max(shake, 4 + amount * 0.15);
        if (src && src !== t) dmgDirs.push({ a: Math.atan2(src.y - t.y, src.x - t.x), t: 1.1 });
        if (dmgDirs.length > 6) dmgDirs.shift();
        sfx({ f: 140, f2: 70, d: 0.12, type: 'square', v: 0.09 });
      } else if (src && src !== t && (!t.target || !t.see)) {
        // a bot that gets shot turns to fight back
        t.target = src;
        t.lastX = src.x;
        t.lastY = src.y;
        t.huntT = 4;
      }
      if (src === player && t !== player) {
        hitMarkT = 0.22;
        hitMarkKill = false;
        if (time - hitSndT > 0.05) {
          hitSndT = time;
          sfx({ f: 1250, d: 0.035, type: 'square', v: 0.045 });
        }
      }
      if (t.hp <= 0) kill(t, src, wi);
    }

    function kill(t, src, wi) {
      t.alive = false;
      t.hp = 0;
      t.deaths++;
      t.respawnT = 3;
      t.deadT = 0;
      t.killer = src;
      emit(t.x, t.y, 0.45, 26, t.isPlayer ? '#cfd6e6' : t.color, 2.6, 0.05, 0.9, 6);
      emit(t.x, t.y, 0.4, 14, '#ffd27a', 3.2, 0.03, 0.5, 2);
      var self = !src || src === t;
      if (!self) src.kills++;
      addFeed(self ? null : src, t, wi);
      if (t === player) {
        pw.streak = 0;
        input.fire = false;
        pw.reloadT = 0;
        sfx('explode');
        shake = 10;
      } else {
        var dp = Math.hypot(t.x - player.x, t.y - player.y);
        if (dp < 14) sfx({ f: 300, f2: 60, d: 0.3, type: 'sawtooth', v: 0.12 * (1 - dp / 14) });
      }
      if (src === player && t !== player) {
        hitMarkT = 0.4;
        hitMarkKill = true;
        pw.streak++;
        if (pw.streak > pw.bestStreak) pw.bestStreak = pw.streak;
        sfx('coin');
        var msgs = { 2: 'Double kill', 3: 'Triple kill', 5: 'Rampage!', 7: 'Unstoppable!', 10: 'Legendary!' };
        say(msgs[pw.streak] || 'Eliminated ' + t.name, '+1 kill', msgs[pw.streak] ? '#fbbf24' : '#fff');
      }
      if (!self && src.kills >= settings.goal) endMatch();
    }

    /* ---------------- player weapons ---------------- */
    function selectWeapon(i) {
      if (i === pw.cur || i < 0 || i >= WEAPONS.length || !player.alive) return;
      pw.prev = pw.cur;
      pw.cur = i;
      pw.reloadT = 0;
      pw.switchT = 0.32;
      sfx({ f: 520, d: 0.04, type: 'square', v: 0.05 });
    }
    function cycleWeapon(dir) {
      var i = pw.cur;
      for (var n = 0; n < WEAPONS.length; n++) {
        i = (i + dir + WEAPONS.length) % WEAPONS.length;
        if (pw.mag[i] > 0 || pw.res[i] !== 0) break;
      }
      selectWeapon(i);
    }
    function startReload() {
      var w = WEAPONS[pw.cur];
      if (pw.reloadT > 0 || pw.switchT > 0 || pw.mag[pw.cur] >= w.mag || pw.res[pw.cur] === 0 || !player.alive) return;
      pw.reloadT = w.reload;
      sfx({ f: 300, f2: 500, d: 0.08, type: 'square', v: 0.05 });
    }
    function finishReload() {
      var i = pw.cur, w = WEAPONS[i];
      var need = w.mag - pw.mag[i];
      if (pw.res[i] < 0) pw.mag[i] = w.mag;
      else {
        var take = Math.min(need, pw.res[i]);
        pw.mag[i] += take;
        pw.res[i] -= take;
      }
      sfx({ f: 700, d: 0.05, type: 'square', v: 0.06 });
    }

    function playerFire() {
      var w = WEAPONS[pw.cur];
      if (pw.mag[pw.cur] <= 0) {
        if (pw.res[pw.cur] !== 0) startReload();
        else {
          sfx('tick');
          pw.cool = 0.3;
          cycleWeapon(-1);
        }
        return;
      }
      pw.mag[pw.cur]--;
      pw.cool = w.rate;
      pw.kick = Math.min(1.5, pw.kick + w.kick);
      pw.flashT = 0.06;
      shake = Math.max(shake, w.shake * 0.6);
      pw.shots++;
      gunSound(pw.cur, 1);
      if (w.projectile) {
        var ra = player.a;
        rockets.push({ x: player.x + Math.cos(ra) * 0.3, y: player.y + Math.sin(ra) * 0.3, dx: Math.cos(ra), dy: Math.sin(ra), owner: player, t: 0 });
        return;
      }
      var moving = Math.abs(player.vx) + Math.abs(player.vy) > 0.5;
      var spread = w.spread * (moving ? 1.6 : 1) * (input.aim ? 0.35 : 1);
      var hitAny = false;
      var hitR = touchUI ? 0.42 : 0.34; // slightly kinder hitbox on touch screens
      for (var p = 0; p < w.pellets; p++) {
        var a = player.a + (Math.random() - 0.5) * 2 * spread;
        if (hitscan(player, a, w, pw.cur, hitR, 1)) hitAny = true;
      }
      if (hitAny) pw.hits++;
    }

    // Instant-hit shot: returns true if it hit a combatant.
    function hitscan(src, a, w, wi, hitR, dmgMul) {
      var dx = Math.cos(a), dy = Math.sin(a);
      var wallD = castRay(src.x, src.y, dx, dy, w.range);
      var best = null, bestT = wallD;
      for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        if (c === src || !c.alive) continue;
        var ox = c.x - src.x, oy = c.y - src.y;
        var t = ox * dx + oy * dy;
        if (t <= 0 || t >= bestT) continue;
        var px = ox - dx * t, py = oy - dy * t;
        if (px * px + py * py < hitR * hitR) { best = c; bestT = t; }
      }
      var hx = src.x + dx * (bestT - 0.05), hy = src.y + dy * (bestT - 0.05);
      if (best) {
        var fall = 1 - clamp((bestT - w.range * 0.4) / (w.range * 0.6), 0, 0.5);
        emit(hx, hy, 0.5 + rnd(-0.08, 0.08), 4, '#ffd27a', 1.6, 0.025, 0.35, 3);
        emit(hx, hy, 0.5, 2, best.color, 1.2, 0.035, 0.5, 5);
        damage(best, w.dmg * fall * dmgMul, src, wi);
        return true;
      }
      if (wallD < w.range && src === player) {
        emit(hx, hy, 0.5 + rnd(-0.05, 0.05), 3, map.sky ? '#e7dcc4' : '#c9c2b8', 1.1, 0.03, 0.45, 3);
      }
      return false;
    }

    function explode(x, y, owner) {
      var w = WEAPONS[4];
      booms.push({ x: x, y: y, t: 0 });
      emit(x, y, 0.35, 34, '#ffb347', 4.2, 0.05, 0.7, 2);
      emit(x, y, 0.3, 18, '#5c5c5c', 2, 0.07, 1.1, -0.5);
      var dp = Math.hypot(x - player.x, y - player.y);
      shake = Math.max(shake, clamp(14 - dp * 2, 0, 14));
      sfx('explode');
      for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        if (!c.alive) continue;
        var d = Math.hypot(c.x - x, c.y - y);
        if (d > w.splash || !los(x, y, c.x, c.y)) continue;
        var dmg = w.dmg * (1 - (d / w.splash) * 0.75) * (c === owner ? 0.45 : 1);
        if (c !== owner && owner === player) pw.hits++;
        damage(c, dmg, owner, 4);
      }
    }

    function gunSound(wi, vol) {
      if (vol <= 0.02) return;
      if (wi === 0) {
        noiseFx({ d: 0.08, f: 2400, v: 0.22 * vol });
        sfx({ f: 260, f2: 90, d: 0.08, type: 'square', v: 0.07 * vol });
      } else if (wi === 1) {
        noiseFx({ d: 0.05, f: 3200, v: 0.16 * vol });
        sfx({ f: 330, f2: 140, d: 0.04, type: 'square', v: 0.04 * vol });
      } else if (wi === 2) {
        noiseFx({ d: 0.22, f: 1100, v: 0.38 * vol });
        sfx({ f: 120, f2: 45, d: 0.18, type: 'sawtooth', v: 0.1 * vol });
      } else if (wi === 3) {
        noiseFx({ d: 0.16, f: 4200, v: 0.3 * vol });
        sfx({ f: 520, f2: 80, d: 0.14, type: 'square', v: 0.07 * vol });
      } else {
        noiseFx({ d: 0.3, f: 700, v: 0.22 * vol });
        sfx({ f: 160, f2: 420, d: 0.25, type: 'sawtooth', v: 0.06 * vol });
      }
    }

    /* ---------------- bots ---------------- */
    function perceive(b) {
      var best = null, bestScore = 1e9;
      for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        if (c === b || !c.alive || c.protect > 0.6) continue;
        var dx = c.x - b.x, dy = c.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > skill.see) continue;
        var inFov = Math.abs(angDiff(b.a, Math.atan2(dy, dx))) < 1.15 || d < 2.5 || (b.lastHitBy === c && time - b.lastHitT < 2);
        if (!inFov || !los(b.x, b.y, c.x, c.y)) continue;
        // the player is a slightly preferred target so fights find you
        var score = d * (c.isPlayer ? 0.8 : 1) * (c === b.target ? 0.75 : 1);
        if (score < bestScore) { bestScore = score; best = c; }
      }
      if (best) {
        if (best !== b.target || !b.see) {
          b.reactT = rnd(skill.react[0], skill.react[1]);
          b.seeT = 0;
        }
        b.target = best;
        b.see = true;
        b.lastX = best.x;
        b.lastY = best.y;
        b.huntT = 4;
      } else {
        b.see = false;
      }
    }

    function pickGoal(b) {
      var gx, gy;
      if (b.hp < 55 || b.armor < 20) {
        var bestD = 1e9, bp = null;
        for (var i = 0; i < pickups.length; i++) {
          var p = pickups[i];
          if (!p.on || p.type === 'm') continue;
          if (b.hp >= 55 && p.type === 'h') continue;
          var d = Math.hypot(p.x - b.x, p.y - b.y);
          if (d < bestD) { bestD = d; bp = p; }
        }
        if (bp) { gx = bp.x; gy = bp.y; }
      }
      if (gx == null) {
        // drift toward the player's area now and then so the action finds you
        if (player && player.alive && Math.random() < 0.5) {
          gx = player.x + rnd(-4, 4);
          gy = player.y + rnd(-4, 4);
        }
        for (var tries = 0; tries < 20 && (gx == null || solid(gx, gy)); tries++) {
          gx = 1 + Math.random() * (MW - 2);
          gy = 1 + Math.random() * (MH - 2);
        }
      }
      setPath(b, gx, gy);
    }

    function setPath(b, gx, gy) {
      b.path = findPath(b.x, b.y, gx, gy);
      b.pathI = 0;
      b.repathT = 6;
    }

    function updateBot(b, dt) {
      if (b.protect > 0) b.protect -= dt;
      if (b.painT > 0) b.painT -= dt;
      if (b.shootT > 0) b.shootT -= dt;
      if (b.cool > 0) b.cool -= dt;
      var attract = state !== 'play';
      var w = WEAPONS[b.wi];
      if (b.reloadT > 0) {
        b.reloadT -= dt;
        if (b.reloadT <= 0) b.mag = w.mag;
      }
      b.perceiveT -= dt;
      if (!attract && b.perceiveT <= 0) {
        b.perceiveT = 0.15;
        perceive(b);
      }
      if (b.target && !b.target.alive) {
        b.target = null;
        b.see = false;
      }
      var mvx = 0, mvy = 0, speed = 2.5, faceA = null;
      if (!attract && b.target && b.see) {
        // --- combat: face target, strafe, keep a preferred range, shoot
        var t = b.target;
        var dx = t.x - b.x, dy = t.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx);
        faceA = ang;
        b.seeT += dt;
        b.strafeT -= dt;
        if (b.strafeT <= 0) {
          b.strafe = Math.random() < 0.5 ? -1 : 1;
          b.strafeT = rnd(0.5, 1.4);
        }
        var pref = b.wi === 2 ? 2.5 : b.wi === 3 ? 9 : 5.5;
        var fwd = d > pref + 1 ? 1 : d < pref - 1.5 ? -0.8 : 0;
        mvx = Math.cos(ang) * fwd + Math.cos(ang + Math.PI / 2) * b.strafe * 0.9;
        mvy = Math.sin(ang) * fwd + Math.sin(ang + Math.PI / 2) * b.strafe * 0.9;
        speed = 2.1;
        if (b.reactT > 0) b.reactT -= dt;
        else if (b.cool <= 0 && b.reloadT <= 0 && Math.abs(angDiff(b.a, ang)) < 0.22) {
          if (b.mag <= 0) b.reloadT = w.reload * 1.25;
          else botFire(b, t, d);
        }
      } else if (!attract && b.target && b.huntT > 0) {
        // --- hunt: go to where the target was last seen
        b.huntT -= dt;
        if (!b.path || b.repathT <= 0 || b.pathGoal !== 'hunt') {
          setPath(b, b.lastX, b.lastY);
          b.pathGoal = 'hunt';
          b.repathT = 1;
        }
        speed = 2.9;
      } else {
        if (b.pathGoal === 'hunt') b.path = null;
        b.pathGoal = 'roam';
        b.target = null;
        if (!b.path || b.pathI >= b.path.length || b.repathT <= 0) pickGoal(b);
      }
      b.repathT -= dt;
      if (faceA == null && b.path && b.pathI < b.path.length) {
        var cell = b.path[b.pathI];
        var cx = (cell % MW) + 0.5, cy = ((cell / MW) | 0) + 0.5;
        // skip ahead when the next-next waypoint is directly reachable (smoother corners)
        if (b.pathI + 1 < b.path.length) {
          var c2 = b.path[b.pathI + 1];
          var c2x = (c2 % MW) + 0.5, c2y = ((c2 / MW) | 0) + 0.5;
          if (Math.hypot(cx - b.x, cy - b.y) < 0.6 && los(b.x, b.y, c2x, c2y)) {
            b.pathI++;
            cx = c2x;
            cy = c2y;
          }
        }
        var ddx = cx - b.x, ddy = cy - b.y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd < 0.18) b.pathI++;
        else {
          mvx = ddx / dd;
          mvy = ddy / dd;
          faceA = Math.atan2(ddy, ddx);
        }
        if (attract) speed = 1.6;
      }
      if (faceA != null) {
        var da = angDiff(b.a, faceA), mt = skill.turn * dt;
        b.a += clamp(da, -mt, mt);
      }
      var ml = Math.sqrt(mvx * mvx + mvy * mvy);
      if (ml > 0.01) {
        mvx = (mvx / ml) * speed * dt;
        mvy = (mvy / ml) * speed * dt;
        var ox = b.x, oy = b.y;
        moveEnt(b, mvx, mvy, 0.25);
        var moved = Math.hypot(b.x - ox, b.y - oy);
        b.moving = moved > speed * dt * 0.3;
        if (b.moving) b.walkT += dt * 6;
        if (moved < speed * dt * 0.25) {
          b.stuckT += dt;
          if (b.stuckT > 0.6) {
            b.stuckT = 0;
            b.strafe = -b.strafe;
            b.path = null;
            b.repathT = 0;
          }
        } else b.stuckT = 0;
      } else b.moving = false;
      // pickups
      for (var i = 0; i < pickups.length; i++) {
        var p = pickups[i];
        if (p.on && p.type !== 'm' && Math.abs(p.x - b.x) < 0.5 && Math.abs(p.y - b.y) < 0.5) {
          if (p.type === 'h' && b.hp < 100) { b.hp = Math.min(100, b.hp + 40); takePickup(p); }
          else if (p.type === 'a' && b.armor < 100) { b.armor = Math.min(100, b.armor + 50); takePickup(p); }
        }
      }
    }

    function botFire(b, t, d) {
      var w = WEAPONS[b.wi];
      b.mag--;
      b.burst++;
      var maxBurst = b.wi === 1 ? 5 : b.wi === 0 ? 3 : 1;
      if (b.burst >= maxBurst) {
        b.burst = 0;
        b.cool = w.rate * skill.rate + rnd(0.25, 0.7);
      } else b.cool = w.rate * skill.rate;
      b.shootT = 0.09;
      var dp = Math.hypot(b.x - player.x, b.y - player.y);
      gunSound(b.wi, 0.55 * clamp(1 - dp / 16, 0, 1));
      // Probabilistic hit model: skill × range × target movement × settle time.
      var acc = skill.acc * clamp(1.15 - d / w.range, 0.12, 1) * Math.min(1, 0.55 + b.seeT * 0.45);
      if (t.isPlayer) {
        var sp = Math.abs(player.vx) + Math.abs(player.vy);
        if (sp > 0.5) acc *= sp > 4.2 ? 0.7 : 0.82;
      }
      if (b.wi === 3) acc *= 1.15;
      var wMul = b.wi === 3 ? 0.75 : 1; // bot marksmen hit a little softer than your rifle
      var dmg = 0;
      for (var p = 0; p < w.pellets; p++) if (Math.random() < acc) dmg += w.dmg;
      if (dmg > 0) {
        var fall = 1 - clamp((d - w.range * 0.4) / (w.range * 0.6), 0, 0.5);
        if (!t.isPlayer) emit(t.x, t.y, 0.5, 3, '#ffd27a', 1.4, 0.025, 0.3, 3);
        // bot-vs-bot fights resolve faster than fights against you, which keeps the kill feed busy
        damage(t, dmg * fall * wMul * (t.isPlayer ? skill.dmg : 1.25), b, b.wi);
      } else if (t.isPlayer && d < 9) {
        // near miss "whizz"
        sfx({ f: 1800, f2: 900, d: 0.06, type: 'sine', v: 0.03 });
      }
    }

    function takePickup(p) {
      p.on = false;
      p.t = p.type === 'a' ? 25 : 15;
    }

    /* ---------------- player update ---------------- */
    function updatePlayer(dt) {
      var k = ctx.keys;
      if (player.protect > 0 && countdown <= 0) player.protect -= dt; // protection starts counting at FIGHT!
      if (!player.alive) {
        player.vx = player.vy = 0;
        return;
      }
      var canAct = countdown <= 0;
      // turning: mouse/touch deltas + arrow keys
      var turn = 0;
      if (k.ArrowLeft) turn -= 1;
      if (k.ArrowRight) turn += 1;
      player.a += turn * 2.7 * dt * (input.aim ? 0.55 : 1);
      player.a += input.lookDX;
      input.lookDX = 0;
      // movement in local space
      var f = 0, s = 0;
      if (k.KeyW || k.ArrowUp) f += 1;
      if (k.KeyS || k.ArrowDown) f -= 1;
      if (k.KeyD) s += 1;
      if (k.KeyA) s -= 1;
      if (joy.id !== -1) {
        f -= joy.y;
        s += joy.x;
      }
      var len = Math.sqrt(f * f + s * s);
      if (len > 1) { f /= len; s /= len; len = 1; }
      var sprint = (k.ShiftLeft || k.ShiftRight || (joy.id !== -1 && Math.hypot(joy.x, joy.y) > 0.92)) && f > 0.3 && !input.aim;
      var spd = (sprint ? 5.1 : 3.4) * (input.aim ? 0.6 : 1);
      if (!canAct) spd = 0;
      var ca = Math.cos(player.a), sa = Math.sin(player.a);
      var tvx = (ca * f - sa * s) * spd, tvy = (sa * f + ca * s) * spd;
      var acc = 1 - Math.exp(-dt * 14);
      player.vx += (tvx - player.vx) * acc;
      player.vy += (tvy - player.vy) * acc;
      moveEnt(player, player.vx * dt, player.vy * dt, 0.22);
      var moveAmt = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      pw.bobAmt = lerp(pw.bobAmt, clamp(moveAmt / 3.4, 0, 1.4), 1 - Math.exp(-dt * 10));
      pw.bob += dt * (sprint ? 13 : 9.5) * clamp(moveAmt / 3.4, 0.2, 1.5);
      player.sprint = sprint;
      // soft footsteps on every half bob cycle
      var ph = Math.floor(pw.bob / Math.PI);
      if (ph !== stepPhase) {
        stepPhase = ph;
        if (moveAmt > 1) noiseFx({ d: 0.05, f: 500, v: sprint ? 0.07 : 0.045 });
      }
      // weapons
      if (pw.cool > 0) pw.cool -= dt;
      if (pw.switchT > 0) pw.switchT -= dt;
      if (pw.reloadT > 0) {
        pw.reloadT -= dt;
        if (pw.reloadT <= 0) finishReload();
      }
      pw.kick = Math.max(0, pw.kick - dt * 6);
      if (pw.flashT > 0) pw.flashT -= dt;
      // auto-reload an empty magazine
      if (pw.mag[pw.cur] === 0 && pw.res[pw.cur] !== 0 && pw.cool <= 0 && pw.reloadT <= 0 && pw.switchT <= 0) startReload();
      var firing = input.fire || k.Space;
      if (firing && canAct && pw.cool <= 0 && pw.reloadT <= 0 && pw.switchT <= 0) playerFire();
      // pickups
      for (var i = 0; i < pickups.length; i++) {
        var p = pickups[i];
        if (!p.on || Math.abs(p.x - player.x) > 0.55 || Math.abs(p.y - player.y) > 0.55) continue;
        if (p.type === 'h' && player.hp < 100) {
          player.hp = Math.min(100, player.hp + 40);
          takePickup(p);
          sfx('buy');
          toast('+40 Health');
        } else if (p.type === 'a' && player.armor < 100) {
          player.armor = Math.min(100, player.armor + 50);
          takePickup(p);
          sfx('buy');
          toast('+50 Armor');
        } else if (p.type === 'm') {
          var got = false;
          for (var j = 1; j < WEAPONS.length; j++) {
            var cap = WEAPONS[j].reserve;
            if (pw.res[j] < cap) {
              pw.res[j] = Math.min(cap, pw.res[j] + Math.ceil(cap / 2));
              got = true;
            }
          }
          if (got) {
            takePickup(p);
            sfx('coin');
            toast('Ammo refilled');
          }
        }
      }
      // aim target for the name tag
      pw.aimTarget = null;
      var bestT = castRay(player.x, player.y, ca, sa, 30);
      for (var c = 1; c < combatants.length; c++) {
        var b = combatants[c];
        if (!b.alive) continue;
        var ox = b.x - player.x, oy = b.y - player.y, t = ox * ca + oy * sa;
        if (t <= 0 || t >= bestT) continue;
        var px = ox - ca * t, py = oy - sa * t;
        if (px * px + py * py < 0.12) { bestT = t; pw.aimTarget = b; }
      }
    }

    var toastT = 0, hitSndT = 0, stepPhase = 0;
    function toast(text) {
      if (time - toastT < 0.3) return;
      toastT = time;
      IGAME.ui.toast(root, text, 900);
    }

    /* ---------------- main update ---------------- */
    function update(dt) {
      time += dt;
      if (state === 'menu') {
        attractCam.a += dt * 0.12;
        for (var i = 0; i < combatants.length; i++) if (!combatants[i].isPlayer && combatants[i].alive) updateBot(combatants[i], dt);
        updateParticles(dt);
        return;
      }
      if (state === 'paused') return;
      if (state === 'over') {
        overT += dt;
        slowmo = Math.min(1, slowmo + dt * 0.6);
        if (overT > 1.3 && !overlay) showResults();
        dt *= slowmo;
        updateParticles(dt);
        updateFx(dt);
        return;
      }
      // play
      if (countdown > 0) {
        var before = Math.ceil(countdown);
        countdown -= dt;
        if (Math.ceil(countdown) !== before && countdown > 0) sfx('tick');
        if (countdown <= 0) {
          say('FIGHT!', 'First to ' + settings.goal + ' kills', '#2dd4f0');
          sfx('boost');
        }
      } else {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          endMatch();
          return;
        }
      }
      updatePlayer(dt);
      for (var b = 0; b < combatants.length; b++) {
        var c = combatants[b];
        if (c.alive) {
          if (!c.isPlayer && countdown <= 0) updateBot(c, dt);
        } else {
          c.deadT += dt;
          c.respawnT -= dt;
          if (c.respawnT <= 0) spawn(c);
        }
      }
      separate();
      updateRockets(dt);
      for (var p = 0; p < pickups.length; p++) {
        var pk = pickups[p];
        if (!pk.on) {
          pk.t -= dt;
          if (pk.t <= 0) pk.on = true;
        }
      }
      updateParticles(dt);
      updateFx(dt);
    }

    function updateFx(dt) {
      if (hitMarkT > 0) hitMarkT -= dt;
      if (hurtT > 0) hurtT = Math.max(0, hurtT - dt * 0.8);
      shake = Math.max(0, shake - dt * 30);
      for (var i = dmgDirs.length - 1; i >= 0; i--) {
        dmgDirs[i].t -= dt;
        if (dmgDirs[i].t <= 0) dmgDirs.splice(i, 1);
      }
      for (var f = feed.length - 1; f >= 0; f--) {
        feed[f].t -= dt;
        if (feed[f].t <= 0) feed.splice(f, 1);
      }
      if (centerMsg) {
        centerMsg.t -= dt;
        if (centerMsg.t <= 0) centerMsg = null;
      }
      for (var b = booms.length - 1; b >= 0; b--) {
        booms[b].t += dt;
        if (booms[b].t > 0.5) booms.splice(b, 1);
      }
      var tz = input.aim && player && player.alive ? WEAPONS[pw.cur].zoom : 1;
      zoom = lerp(zoom, tz, 1 - Math.exp(-dt * 14));
    }

    function separate() {
      for (var i = 0; i < combatants.length; i++) {
        var a = combatants[i];
        if (!a.alive) continue;
        for (var j = i + 1; j < combatants.length; j++) {
          var b = combatants[j];
          if (!b.alive) continue;
          var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < 0.36 && d2 > 0.0001) {
            var d = Math.sqrt(d2), push = (0.6 - d) / 2;
            dx /= d;
            dy /= d;
            moveEnt(a, -dx * push, -dy * push, a.isPlayer ? 0.22 : 0.25);
            moveEnt(b, dx * push, dy * push, b.isPlayer ? 0.22 : 0.25);
          }
        }
      }
    }

    function updateRockets(dt) {
      for (var i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i];
        r.t += dt;
        var step = 13 * dt, n = 3, hit = false;
        for (var s = 0; s < n && !hit; s++) {
          r.x += (r.dx * step) / n;
          r.y += (r.dy * step) / n;
          if (solid(r.x, r.y)) hit = true;
          for (var c = 0; c < combatants.length && !hit; c++) {
            var o = combatants[c];
            if (!o.alive || (o === r.owner && r.t < 0.3)) continue;
            if (Math.abs(o.x - r.x) < 0.32 && Math.abs(o.y - r.y) < 0.32) hit = true;
          }
        }
        if (Math.random() < 0.7) emit(r.x - r.dx * 0.2, r.y - r.dy * 0.2, 0.45, 1, '#8a8a8a', 0.3, 0.05, 0.6, -0.4);
        if (hit || r.t > 4) {
          explode(r.x - r.dx * 0.15, r.y - r.dy * 0.15, r.owner);
          rockets.splice(i, 1);
        }
      }
    }

    function updateParticles(dt) {
      for (var i = 0; i < P_MAX; i++) {
        var p = parts[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.vz -= p.grav * dt;
        var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (solid(nx, ny)) { p.vx *= -0.3; p.vy *= -0.3; }
        else { p.x = nx; p.y = ny; }
        p.z += p.vz * dt;
        if (p.z < 0.01) { p.z = 0.01; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; }
        if (p.z > 0.98) { p.z = 0.98; p.vz = -Math.abs(p.vz) * 0.3; }
      }
    }

    /* ---------------- rendering ---------------- */
    var sprites = [];
    for (var si = 0; si < 64; si++) sprites.push({ img: null, x: 0, y: 0, z: 0, hgt: 0, wid: 0, depth: 0, sx: 0, alpha: 1, glow: false, bot: null });
    var spriteCount = 0, order = [];

    function render(dt) {
      var cam = state === 'menu' || !player ? attractCam : player;
      var cx = cam.x, cy = cam.y, ca = cam.a;
      var eye = 0.5;
      var bobY = 0;
      if (cam === player) {
        if (player.alive) bobY = Math.abs(Math.sin(pw.bob)) * 3 * u * pw.bobAmt;
        else eye = lerp(0.5, 0.12, clamp(player.deadT * 2, 0, 1));
      }
      var curPlane = planeBase * zoom;
      projDist = W / 2 / curPlane;
      var horizon = H / 2 + bobY;
      var sx = 0, sy = 0;
      if (shake > 0.1) {
        sx = (Math.random() - 0.5) * shake * u;
        sy = (Math.random() - 0.5) * shake * u;
      }
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.imageSmoothingEnabled = false;
      g.save();
      g.translate(sx, sy);
      // sky / ceiling and floor
      g.fillStyle = gradCeil || '#111';
      g.fillRect(-20, -20, W + 40, horizon + 20);
      if (map && map.sky) drawSky(ca, horizon);
      g.fillStyle = gradFloor || '#222';
      g.fillRect(-20, horizon, W + 40, H - horizon + 40);
      if (map) {
        drawWalls(cx, cy, ca, curPlane, horizon, eye);
        drawSprites(cx, cy, ca, curPlane, horizon, eye);
        drawParticles(cx, cy, ca, curPlane, horizon, eye);
      }
      g.restore();
      if (state === 'menu' || !player) {
        g.fillStyle = gradVignette;
        g.fillRect(0, 0, W, H);
        return;
      }
      if (player.alive) drawWeapon(dt);
      drawHud();
    }

    // Parallax cloud strip for the open-sky map.
    function drawSky(a, horizon) {
      var span = W * 2.2;
      var off = (((a / TAU) * span) % span + span) % span;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (var i = 0; i < 9; i++) {
        var bx = ((i * span) / 9 - off + span) % span - W * 0.3;
        var by = horizon * (0.25 + ((i * 37) % 5) * 0.09);
        var bw = W * (0.12 + ((i * 13) % 4) * 0.03);
        g.beginPath();
        g.ellipse(bx, by, bw, bw * 0.16, 0, 0, TAU);
        g.ellipse(bx + bw * 0.4, by - bw * 0.08, bw * 0.5, bw * 0.15, 0, 0, TAU);
        g.fill();
      }
    }

    function drawWalls(px, py, a, plane, horizon, eye) {
      var dirX = Math.cos(a), dirY = Math.sin(a);
      var plX = -dirY * plane, plY = dirX * plane;
      var fogD = map.fogDist, fogMax = map.fogMax;
      g.fillStyle = map.fog;
      for (var i = 0; i < cols; i++) {
        var camX = (2 * (i * colW + colW * 0.5)) / W - 1;
        var rdx = dirX + plX * camX, rdy = dirY + plY * camX;
        var mx = px | 0, my = py | 0;
        var ddx = rdx === 0 ? 1e9 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e9 : Math.abs(1 / rdy);
        var stx, sty, tx, ty;
        if (rdx < 0) { stx = -1; tx = (px - mx) * ddx; } else { stx = 1; tx = (mx + 1 - px) * ddx; }
        if (rdy < 0) { sty = -1; ty = (py - my) * ddy; } else { sty = 1; ty = (my + 1 - py) * ddy; }
        var side = 0, hit = 0;
        for (var n = 0; n < 96; n++) {
          if (tx < ty) { tx += ddx; mx += stx; side = 0; } else { ty += ddy; my += sty; side = 1; }
          if (mx < 0 || my < 0 || mx >= MW || my >= MH) { hit = 1; break; }
          hit = grid[my * MW + mx];
          if (hit) break;
        }
        var pd = side === 0 ? tx - ddx : ty - ddy;
        if (pd < 0.02) pd = 0.02;
        zbuf[i] = pd;
        var wallX = side === 0 ? py + pd * rdy : px + pd * rdx;
        wallX -= Math.floor(wallX);
        var texX = (wallX * TEX) | 0;
        if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = TEX - texX - 1;
        var lh = projDist / pd;
        var top = horizon - lh * (1 - eye);
        var img = textures[hit] ? textures[hit][side] : textures[1][side];
        var x0 = i * colW;
        if (top < -lh * 0.02 && lh > H * 2) {
          // very close wall: only sample the visible part of the texture
          var vy0 = (-top / lh) * TEX, vy1 = ((H - top) / lh) * TEX;
          vy0 = clamp(vy0, 0, TEX - 1);
          vy1 = clamp(vy1, vy0 + 1, TEX);
          g.drawImage(img, texX, vy0, 1, vy1 - vy0, x0, top + (vy0 / TEX) * lh, colW, ((vy1 - vy0) / TEX) * lh);
        } else g.drawImage(img, texX, 0, 1, TEX, x0, top, colW, lh);
        var f = pd / fogD;
        if (f > 0.04) {
          g.globalAlpha = f > fogMax ? fogMax : f;
          g.fillRect(x0, top, colW, lh);
          g.globalAlpha = 1;
        }
      }
    }

    function addSprite(img, x, y, z, hgt, wid, alpha, glow, bot) {
      if (spriteCount >= sprites.length) return;
      var s = sprites[spriteCount++];
      s.img = img;
      s.x = x;
      s.y = y;
      s.z = z;
      s.hgt = hgt;
      s.wid = wid;
      s.alpha = alpha;
      s.glow = glow;
      s.bot = bot;
    }

    function botImage(b, camX, camY) {
      var f = b.frames;
      if (!b.alive) return b.deadT < 0.18 ? f.fall1 : b.deadT < 0.4 ? f.fall2 : f.scrap;
      if (b.painT > 0) return f.pain;
      var toCam = Math.atan2(camY - b.y, camX - b.x);
      var back = Math.abs(angDiff(b.a, toCam)) > 1.9;
      var step = (b.walkT | 0) % 2;
      if (back) return step ? f.backB : f.backA;
      if (b.shootT > 0) return f.shoot;
      if (!b.moving) return f.idle;
      return step ? f.walkB : f.walkA;
    }

    function drawSprites(px, py, a, plane, horizon, eye) {
      spriteCount = 0;
      var i;
      for (i = 0; i < combatants.length; i++) {
        var b = combatants[i];
        if (b.isPlayer) continue;
        if (!b.alive && b.deadT > 2.6) continue;
        var alpha = !b.alive && b.deadT > 2 ? 1 - (b.deadT - 2) / 0.6 : b.protect > 0 && state === 'play' ? 0.55 + 0.45 * Math.abs(Math.sin(time * 14)) : 1;
        addSprite(botImage(b, px, py), b.x, b.y, 0, 0.86, 0.86, alpha, false, b.alive ? b : null);
      }
      for (i = 0; i < pickups.length; i++) {
        var p = pickups[i];
        if (!p.on) continue;
        addSprite(pickupSprites[p.type], p.x, p.y, 0.04 + Math.sin(time * 3 + p.ph) * 0.04, 0.34, 0.34, 1, false, null);
      }
      for (i = 0; i < rockets.length; i++) addSprite(rocketSprite, rockets[i].x, rockets[i].y, 0.36, 0.2, 0.2, 1, true, null);
      for (i = 0; i < booms.length; i++) {
        var bm = booms[i], k = bm.t / 0.5, sz = 0.6 + k * 2.2;
        addSprite(flashSprite, bm.x, bm.y, 0.45 - sz / 2, sz, sz, 1 - k, true, null);
      }
      // camera transform
      var dirX = Math.cos(a), dirY = Math.sin(a);
      var plX = -dirY * plane, plY = dirX * plane;
      var invDet = 1 / (plX * dirY - dirX * plY);
      order.length = 0;
      for (i = 0; i < spriteCount; i++) {
        var s = sprites[i];
        var rx = s.x - px, ry = s.y - py;
        s.depth = invDet * (-plY * rx + plX * ry);
        var tX = invDet * (dirY * rx - dirX * ry);
        s.sx = (W / 2) * (1 + tX / s.depth);
        if (s.depth > 0.15) order.push(s);
      }
      order.sort(function (p1, p2) { return p2.depth - p1.depth; });
      for (i = 0; i < order.length; i++) drawSprite(order[i], horizon, eye);
    }

    function drawSprite(s, horizon, eye) {
      var scale = projDist / s.depth;
      var hpx = s.hgt * scale, wpx = s.wid * scale;
      var bottom = horizon + (eye - s.z) * scale;
      var top = bottom - hpx;
      var left = s.sx - wpx / 2, right = s.sx + wpx / 2;
      if (right < 0 || left > W) return;
      var c0 = Math.max(0, Math.floor(left / colW)), c1 = Math.min(cols - 1, Math.floor((right - 0.01) / colW));
      var img = s.img, iw = img.width, ih = img.height;
      g.globalAlpha = s.alpha;
      if (s.glow) g.globalCompositeOperation = 'lighter';
      var c = c0;
      while (c <= c1) {
        while (c <= c1 && zbuf[c] <= s.depth) c++;
        if (c > c1) break;
        var start = c;
        while (c <= c1 && zbuf[c] > s.depth) c++;
        var xs = Math.max(left, start * colW), xe = Math.min(right, c * colW);
        if (xe <= xs) continue;
        var u0 = ((xs - left) / wpx) * iw, u1 = ((xe - left) / wpx) * iw;
        g.drawImage(img, u0, 0, Math.max(0.01, u1 - u0), ih, xs, top, xe - xs, hpx);
      }
      if (s.glow) g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      // name tag + health bar for the bot under the crosshair
      if (s.bot && s.bot === pw.aimTarget && state === 'play') {
        var bw = clamp(wpx * 0.7, 40 * u, 110 * u), by = top - 10 * u;
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(s.sx - bw / 2, by, bw, 5 * u);
        g.fillStyle = s.bot.hp > 50 ? '#34d399' : s.bot.hp > 25 ? '#fbbf24' : '#f87171';
        g.fillRect(s.sx - bw / 2, by, (bw * s.bot.hp) / 100, 5 * u);
        g.font = fontS;
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        g.fillStyle = s.bot.color;
        g.fillText(s.bot.name, s.sx, by - 3 * u);
      }
    }

    function drawParticles(px, py, a, plane, horizon, eye) {
      var dirX = Math.cos(a), dirY = Math.sin(a);
      var plX = -dirY * plane, plY = dirX * plane;
      var invDet = 1 / (plX * dirY - dirX * plY);
      for (var i = 0; i < P_MAX; i++) {
        var p = parts[i];
        if (!p.on) continue;
        var rx = p.x - px, ry = p.y - py;
        var depth = invDet * (-plY * rx + plX * ry);
        if (depth < 0.3) continue;
        var tX = invDet * (dirY * rx - dirX * ry);
        var sxp = (W / 2) * (1 + tX / depth);
        var col = (sxp / colW) | 0;
        if (col < 0 || col >= cols || zbuf[col] < depth) continue;
        var scale = projDist / depth;
        var syp = horizon + (eye - p.z) * scale;
        var sz = clamp(p.size * scale, 1.5, 9 * u);
        g.globalAlpha = clamp(p.life / p.max * 1.6, 0, 1);
        g.fillStyle = p.col;
        g.fillRect(sxp - sz / 2, syp - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
    }

    function drawWeapon(dt) {
      var vm = viewModels[pw.cur];
      if (!vm) return;
      var c = vm.canvas, s = c.width;
      var bobX = Math.sin(pw.bob * 0.5) * 10 * u * pw.bobAmt;
      var bobY2 = Math.abs(Math.cos(pw.bob * 0.5)) * 8 * u * pw.bobAmt;
      var y = H - s + bobY2 + pw.kick * 22 * u;
      if (pw.reloadT > 0) {
        var w = WEAPONS[pw.cur], k = 1 - pw.reloadT / w.reload;
        y += Math.sin(k * Math.PI) * s * 0.55;
      }
      if (pw.switchT > 0) y += (pw.switchT / 0.32) * s * 0.7;
      var x = W / 2 - s / 2 + (portrait ? 0 : W * 0.06) + bobX;
      if (input.aim) x = lerp(x, W / 2 - s / 2, 0.8);
      g.imageSmoothingEnabled = true;
      g.drawImage(c, x, y);
      if (pw.cur === 4 && pw.mag[4] > 0 && pw.reloadT <= 0) {
        // visible rocket tip in the tube
        g.fillStyle = '#f97316';
        g.beginPath();
        g.ellipse(x + vm.mx, y + vm.my + s * 0.03, s * 0.07, s * 0.03, 0, 0, TAU);
        g.fill();
      }
      if (pw.flashT > 0) {
        var fs = s * (pw.cur === 2 ? 0.75 : pw.cur === 4 ? 0.6 : 0.5) * (0.85 + Math.random() * 0.3);
        g.globalCompositeOperation = 'lighter';
        g.drawImage(flashSprite, x + vm.mx - fs / 2, y + vm.my - fs / 2, fs, fs);
        g.globalCompositeOperation = 'source-over';
      }
      g.imageSmoothingEnabled = false;
    }

    function pill(x, y, w, h) {
      var r = h / 2;
      g.beginPath();
      g.moveTo(x + r, y);
      g.lineTo(x + w - r, y);
      g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
      g.lineTo(x + r, y + h);
      g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
      g.closePath();
    }

    function ordinal(n) {
      return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
    }

    function drawHud() {
      var pad = 10 * u + 4;
      g.textBaseline = 'middle';
      // hurt / low-health vignette
      g.fillStyle = gradVignette;
      g.fillRect(0, 0, W, H);
      var low = player.alive ? clamp((40 - player.hp) / 40, 0, 1) * (0.55 + 0.25 * Math.sin(time * 6)) : 0;
      var hurtA = Math.max(hurtT * 0.8, low);
      if (hurtA > 0.02) {
        g.globalAlpha = clamp(hurtA, 0, 1);
        g.fillStyle = gradHurt;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
      var cxm = W / 2, cym = H / 2;
      if (player.alive) {
        // crosshair (gap grows with spread / movement / recoil)
        var w = WEAPONS[pw.cur];
        var moving = Math.abs(player.vx) + Math.abs(player.vy) > 0.5;
        var gap = (5 + w.spread * 160 * (moving ? 1.6 : 1) * (input.aim ? 0.35 : 1) + pw.kick * 8) * u;
        var len = 7 * u;
        g.strokeStyle = 'rgba(0,0,0,0.6)';
        g.lineWidth = 4 * Math.max(0.8, u * 0.8);
        crossLines(cxm, cym, gap, len);
        g.strokeStyle = pw.aimTarget ? '#ff6b6b' : '#ffffff';
        g.lineWidth = 2 * Math.max(0.8, u * 0.8);
        crossLines(cxm, cym, gap, len);
        g.fillStyle = g.strokeStyle;
        g.fillRect(cxm - 1, cym - 1, 2, 2);
        if (hitMarkT > 0) {
          var hm = 6 * u + (0.22 - Math.min(hitMarkT, 0.22)) * 30 * u;
          g.strokeStyle = hitMarkKill ? '#ff4d4d' : '#ffffff';
          g.lineWidth = 2.5 * u;
          g.globalAlpha = clamp(hitMarkT * 5, 0, 1);
          g.beginPath();
          for (var q = 0; q < 4; q++) {
            var qa = Math.PI / 4 + (q * Math.PI) / 2;
            g.moveTo(cxm + Math.cos(qa) * hm, cym + Math.sin(qa) * hm);
            g.lineTo(cxm + Math.cos(qa) * (hm + 8 * u), cym + Math.sin(qa) * (hm + 8 * u));
          }
          g.stroke();
          g.globalAlpha = 1;
        }
      }
      // damage direction arcs
      for (var d = 0; d < dmgDirs.length; d++) {
        var dd = dmgDirs[d];
        var rel = angDiff(player.a, dd.a) - Math.PI / 2; // screen up = forward
        var R = Math.min(W, H) * 0.2;
        g.strokeStyle = 'rgba(255,60,60,' + clamp(dd.t, 0, 1) * 0.9 + ')';
        g.lineWidth = 6 * u;
        g.beginPath();
        g.arc(cxm, cym, R, rel - 0.32, rel + 0.32);
        g.stroke();
      }

      // --- top-left: kills + rank
      var ranked = combatants.slice().sort(function (a, b) { return b.kills - a.kills || a.deaths - b.deaths; });
      var rank = ranked.indexOf(player) + 1;
      var leader = ranked[0] === player ? ranked[1] : ranked[0];
      g.font = fontM;
      var line1 = 'KILLS ' + player.kills + '/' + settings.goal;
      var line2;
      if (rank === 1) {
        var ahead = player.kills - (leader ? leader.kills : 0);
        line2 = '1st · ' + (ahead > 0 ? '+' + ahead + ' ahead' : 'tied');
      } else line2 = ordinal(rank) + ' · leader ' + (leader ? leader.kills : 0);
      var bw = Math.max(g.measureText(line1).width, g.measureText(line2).width) + 24 * u;
      var bh = 46 * u + 8;
      g.fillStyle = 'rgba(5,6,14,0.6)';
      pill(pad, pad, bw, bh);
      g.fill();
      g.textAlign = 'left';
      g.fillStyle = '#fff';
      g.fillText(line1, pad + 12 * u, pad + bh * 0.32);
      g.font = fontS;
      g.fillStyle = rank === 1 ? '#fbbf24' : '#c4c8ea';
      g.fillText(line2, pad + 12 * u, pad + bh * 0.72);
      // minimap below
      drawMinimap(pad, pad + bh + 8 * u);

      // --- top-centre: timer
      g.font = fontM;
      g.textAlign = 'center';
      var tl = Math.ceil(timeLeft), tstr = ((tl / 60) | 0) + ':' + ('0' + (tl % 60)).slice(-2);
      var tw = g.measureText(tstr).width + 26 * u;
      g.fillStyle = timeLeft < 30 ? 'rgba(160,20,20,0.75)' : 'rgba(5,6,14,0.6)';
      pill(W / 2 - tw / 2, pad, tw, 30 * u + 4);
      g.fill();
      g.fillStyle = '#fff';
      g.fillText(tstr, W / 2, pad + (30 * u + 4) / 2 + 1);

      // --- top-right: kill feed (below the pause button)
      g.font = fontS;
      g.textAlign = 'right';
      var fy = pad + 44 + 6 * u;
      for (var f = 0; f < feed.length; f++) {
        var e = feed[f];
        var kn = e.k ? e.k.name : '', vn = e.v.name, wt = ' [' + WEAPONS[e.w || 0].tag + '] ';
        if (!e.k) wt = ' ✕ ';
        var full = kn + wt + vn;
        var fw = g.measureText(full).width + 18 * u;
        var lh = 22 * u + 2;
        g.globalAlpha = clamp(e.t, 0, 1);
        g.fillStyle = e.k === player || e.v === player ? 'rgba(139,108,255,0.55)' : 'rgba(5,6,14,0.6)';
        pill(W - pad - fw, fy, fw, lh);
        g.fill();
        var xx = W - pad - 9 * u;
        g.fillStyle = e.v.isPlayer ? '#fff' : e.v.color;
        g.fillText(vn, xx, fy + lh / 2 + 1);
        xx -= g.measureText(vn).width;
        g.fillStyle = '#c4c8ea';
        g.fillText(wt, xx, fy + lh / 2 + 1);
        xx -= g.measureText(wt).width;
        if (e.k) {
          g.fillStyle = e.k.isPlayer ? '#fff' : e.k.color;
          g.fillText(kn, xx, fy + lh / 2 + 1);
        }
        g.globalAlpha = 1;
        fy += lh + 4 * u;
      }

      // --- health & armor
      var hbW = clamp(150 * u, 110, 230), hbH = 12 * u + 2;
      var hx, hy;
      if (touchUI) {
        hx = pad;
        hy = H - pad - hbH * 2 - 40 * u - btn.joyR * 2.2;
        if (hy < pad + 130 * u) hy = pad + 46 * u + 8 + mmH + 18 * u;
      } else {
        hx = pad;
        hy = H - pad - hbH * 2 - 26 * u;
      }
      drawBar(hx, hy, hbW, hbH, player.hp / 100, player.hp > 50 ? '#34d399' : player.hp > 25 ? '#fbbf24' : '#f87171', '+', Math.ceil(player.hp));
      drawBar(hx, hy + hbH + 14 * u, hbW, hbH, player.armor / 100, '#60a5fa', '◆', Math.ceil(player.armor));

      // --- ammo & weapon
      var wcur = WEAPONS[pw.cur];
      var magStr = '' + pw.mag[pw.cur], resStr = pw.res[pw.cur] < 0 ? '∞' : '' + pw.res[pw.cur];
      g.textAlign = 'right';
      var ax = touchUI ? btn.fire.x + btn.fire.r : W - pad, ay = touchUI ? btn.swap.y - btn.swap.r - 30 * u : H - pad - 18 * u;
      g.font = fontL;
      var mw = g.measureText(magStr).width;
      g.font = fontM;
      var rw = g.measureText(' / ' + resStr).width;
      g.fillStyle = 'rgba(5,6,14,0.55)';
      pill(ax - mw - rw - 22 * u, ay - 20 * u, mw + rw + 32 * u, 40 * u);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillText(' / ' + resStr, ax - 6 * u, ay + 3 * u);
      g.font = fontL;
      g.fillStyle = pw.mag[pw.cur] === 0 ? '#f87171' : pw.mag[pw.cur] <= wcur.mag * 0.25 ? '#fbbf24' : '#fff';
      g.fillText(magStr, ax - 6 * u - rw, ay + 2 * u);
      g.font = fontS;
      g.fillStyle = '#c4c8ea';
      g.fillText(pw.reloadT > 0 ? 'RELOADING…' : wcur.name.toUpperCase(), ax - 6 * u, ay - 30 * u);
      if (!touchUI) {
        // weapon slots
        var sw = 26 * u + 4, sgap = 4 * u;
        var sx0 = W - pad - WEAPONS.length * (sw + sgap) + sgap, sy0 = ay - 66 * u - sw * 0.6;
        for (var wi = 0; wi < WEAPONS.length; wi++) {
          var on = wi === pw.cur;
          var empty = pw.mag[wi] === 0 && pw.res[wi] === 0;
          g.fillStyle = on ? 'rgba(139,108,255,0.85)' : 'rgba(5,6,14,0.55)';
          g.fillRect(sx0 + wi * (sw + sgap), sy0, sw, sw * 0.8);
          g.fillStyle = empty ? '#6b6f88' : '#fff';
          g.textAlign = 'center';
          g.fillText('' + (wi + 1), sx0 + wi * (sw + sgap) + sw / 2, sy0 + sw * 0.42);
        }
      }
      if (player.alive && pw.mag[pw.cur] === 0 && pw.res[pw.cur] === 0) {
        g.font = fontM;
        g.textAlign = 'center';
        g.fillStyle = '#fbbf24';
        g.fillText('Out of ammo — switch weapon', cxm, cym + 46 * u);
      }

      if (touchUI) drawTouchControls();

      // --- centre messages
      g.textAlign = 'center';
      if (countdown > 0) {
        g.font = fontXL;
        g.fillStyle = '#fff';
        var cd = Math.ceil(countdown);
        var k = countdown % 1;
        g.globalAlpha = clamp(k * 2, 0, 1);
        g.fillText('' + cd, cxm, cym - 70 * u);
        g.globalAlpha = 1;
        g.font = fontM;
        g.fillText('Get ready — ' + map.name, cxm, cym - 30 * u);
      } else if (!player.alive) {
        g.fillStyle = 'rgba(40,0,0,0.35)';
        g.fillRect(0, 0, W, H);
        g.font = fontL;
        g.fillStyle = '#fff';
        var killer = player.killer && player.killer !== player ? player.killer.name : null;
        g.fillText(killer ? 'Eliminated by ' + killer : 'You eliminated yourself', cxm, cym - 24 * u);
        g.font = fontM;
        g.fillStyle = '#c4c8ea';
        g.fillText('Respawning in ' + Math.max(1, Math.ceil(player.respawnT)) + '…', cxm, cym + 14 * u);
      } else if (centerMsg) {
        var ap = clamp(centerMsg.t * 2, 0, 1), sc = 1 + Math.max(0, centerMsg.t - 1.3) * 1.5;
        g.globalAlpha = ap;
        g.font = fontL;
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.save();
        g.translate(cxm, cym - 90 * u);
        g.scale(sc, sc);
        g.fillText(centerMsg.text, 2, 2);
        g.fillStyle = centerMsg.col;
        g.fillText(centerMsg.text, 0, 0);
        g.restore();
        if (centerMsg.sub) {
          g.font = fontM;
          g.fillStyle = '#c4c8ea';
          g.fillText(centerMsg.sub, cxm, cym - 56 * u);
        }
        g.globalAlpha = 1;
      }
      if (state === 'over') {
        g.globalAlpha = clamp(overT * 1.5, 0, 0.6);
        g.fillStyle = '#05060e';
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
        g.font = fontXL;
        g.fillStyle = '#fff';
        g.fillText(matchStats && matchStats.rank === 1 && !matchStats.tied ? 'VICTORY' : timeLeft <= 0 ? 'TIME UP' : 'MATCH OVER', cxm, cym);
      }
    }

    function crossLines(x, y, gap, len) {
      g.beginPath();
      g.moveTo(x - gap - len, y);
      g.lineTo(x - gap, y);
      g.moveTo(x + gap, y);
      g.lineTo(x + gap + len, y);
      g.moveTo(x, y - gap - len);
      g.lineTo(x, y - gap);
      g.moveTo(x, y + gap);
      g.lineTo(x, y + gap + len);
      g.stroke();
    }

    function drawBar(x, y, w, h, frac, col, icon, val) {
      g.font = fontM;
      var lead = 22 * u + g.measureText('100').width + 8 * u; // icon + widest value
      g.fillStyle = 'rgba(5,6,14,0.6)';
      pill(x, y - 4 * u, w + lead, h + 8 * u);
      g.fill();
      g.textAlign = 'left';
      g.fillStyle = col;
      g.fillText(icon, x + 8 * u, y + h / 2 + 1);
      g.fillStyle = '#fff';
      g.fillText('' + val, x + 22 * u, y + h / 2 + 1);
      var bx = x + lead;
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(bx, y + h * 0.15, w - 8 * u, h * 0.7);
      g.fillStyle = col;
      g.fillRect(bx, y + h * 0.15, (w - 8 * u) * clamp(frac, 0, 1), h * 0.7);
    }

    var mmH = 0;
    function drawMinimap(x, y) {
      var cs = clamp(Math.round(3.4 * u), 2, 6);
      var w = MW * cs, h = MH * cs;
      mmH = h;
      g.globalAlpha = 0.85;
      g.fillStyle = 'rgba(5,6,14,0.65)';
      g.fillRect(x - 3, y - 3, w + 6, h + 6);
      g.fillStyle = 'rgba(200,210,255,0.55)';
      for (var yy = 0; yy < MH; yy++)
        for (var xx = 0; xx < MW; xx++) if (grid[yy * MW + xx]) g.fillRect(x + xx * cs, y + yy * cs, cs, cs);
      for (var i = 0; i < pickups.length; i++) {
        var p = pickups[i];
        if (!p.on) continue;
        g.fillStyle = p.type === 'h' ? '#34d399' : p.type === 'a' ? '#60a5fa' : '#fbbf24';
        g.fillRect(x + p.x * cs - 1, y + p.y * cs - 1, 2, 2);
      }
      // enemies show up while they are firing or visible to you
      for (var c = 1; c < combatants.length; c++) {
        var b = combatants[c];
        if (!b.alive) continue;
        if (b.shootT > 0 || (Math.hypot(b.x - player.x, b.y - player.y) < 7 && los(player.x, player.y, b.x, b.y))) {
          g.fillStyle = b.color;
          g.fillRect(x + b.x * cs - 2, y + b.y * cs - 2, 4, 4);
        }
      }
      if (player.alive) {
        var px = x + player.x * cs, py = y + player.y * cs, a = player.a, r = cs * 2.2;
        g.fillStyle = '#fff';
        g.beginPath();
        g.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
        g.lineTo(px + Math.cos(a + 2.5) * r * 0.75, py + Math.sin(a + 2.5) * r * 0.75);
        g.lineTo(px + Math.cos(a - 2.5) * r * 0.75, py + Math.sin(a - 2.5) * r * 0.75);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
    }

    function drawTouchControls() {
      // joystick
      var jx = joy.id !== -1 ? joy.bx : btn.joyR * 1.5, jy = joy.id !== -1 ? joy.by : H - btn.joyR * 1.6;
      g.globalAlpha = joy.id !== -1 ? 0.9 : 0.5;
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(jx, jy, btn.joyR, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.arc(jx + joy.x * btn.joyR * 0.6, jy + joy.y * btn.joyR * 0.6, btn.joyR * 0.42, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
      // buttons
      touchButton(btn.fire, input.fire ? 'rgba(248,113,113,0.75)' : 'rgba(248,113,113,0.45)', 'FIRE');
      touchButton(btn.reload, 'rgba(255,255,255,0.18)', '⟳');
      touchButton(btn.swap, 'rgba(255,255,255,0.18)', '' + (pw.cur + 1));
    }

    function touchButton(b, fill, label) {
      g.fillStyle = fill;
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '900 ' + Math.round(b.r * (label.length > 2 ? 0.42 : 0.7)) + 'px ' + FONT;
      g.fillText(label, b.x, b.y + 1);
    }

    /* ---------------- overlays ---------------- */
    function makeOverlay(o) {
      var ov = IGAME.ui.overlay(root, o);
      if (H < 600 || W < 480) ov.panel.classList.add('as-compact');
      return ov;
    }

    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }

    function seg(name, opts, cur) {
      return '<div class="as-opt"><b>' + name + '</b><div class="as-seg" data-k="' + name + '">' +
        opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (String(o[0]) === String(cur) ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') +
        '</div></div>';
    }

    function showMenu() {
      closeOverlay();
      state = 'menu';
      pauseBtn.classList.remove('show');
      exitLock();
      setupAttract();
      var best = stats.best['m' + settings.map] || 0;
      var html =
        '<div class="as-opts">' +
        seg('Arena', MAPS.map(function (m, i) { return [i, m.name]; }), settings.map) +
        seg('Bots', [[3, '3'], [5, '5'], [7, '7']], settings.bots) +
        seg('Skill', SKILLS.map(function (s, i) { return [i, s.name]; }), settings.skill) +
        seg('Goal', [[10, '10 kills'], [15, '15 kills'], [25, '25 kills']], settings.goal) +
        (touchUI ? '' : seg('Mouse', [[0.6, 'Slow'], [1, 'Normal'], [1.6, 'Fast']], settings.sens)) +
        '</div>' +
        '<p class="as-small">' + (touchUI ? 'Left stick to move · drag right side to look · hold FIRE' : 'WASD move · mouse aim (click to lock) · click/Space fire · R reload · 1–5 weapons · Shift sprint') +
        '<br>Wins ' + stats.wins + ' · Best on this arena: ' + best + ' kills</p>';
      overlay = makeOverlay({
        title: ctx.title || 'Hexfire Arena',
        text: 'Free-for-all deathmatch against robot fighters. First to the kill goal wins.',
        html: html,
        buttons: [{ label: '▶ Play', primary: true, onClick: startMatch }],
      });
      var segs = overlay.el.querySelectorAll('.as-seg button');
      Array.prototype.forEach.call(segs, function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var k = b.parentNode.getAttribute('data-k'), v = parseFloat(b.getAttribute('data-v'));
          if (k === 'Arena') settings.map = v;
          else if (k === 'Bots') settings.bots = v;
          else if (k === 'Skill') settings.skill = v;
          else if (k === 'Goal') settings.goal = v;
          else if (k === 'Mouse') settings.sens = v;
          store.set('settings', settings);
          sfx('click');
          showMenu();
        });
      });
    }

    function setupAttract() {
      loadMap(settings.map);
      skill = SKILLS[settings.skill];
      combatants = [];
      player = null;
      rockets = [];
      booms = [];
      for (var i = 0; i < 4; i++) {
        var b = makeCombatant(BOT_NAMES[i], i, false);
        combatants.push(b);
        spawn(b);
      }
      render(0);
    }

    function openPause() {
      if (state !== 'play') return;
      state = 'paused';
      input.fire = false;
      input.aim = false;
      releaseTouches();
      exitLock();
      var ranked = combatants.slice().sort(function (a, b) { return b.kills - a.kills || a.deaths - b.deaths; });
      overlay = makeOverlay({
        title: 'Paused',
        html: scoreTable(ranked),
        buttons: [
          { label: 'Resume', primary: true, onClick: resumeGame },
          { label: 'Restart', onClick: startMatch },
          { label: 'Menu', onClick: showMenu },
        ],
      });
    }

    function resumeGame() {
      closeOverlay();
      if (state !== 'paused') return;
      state = 'play';
      requestLock();
    }

    function scoreTable(ranked) {
      var rows = ranked.map(function (c, i) {
        return '<tr class="' + (c.isPlayer ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><span class="as-dot" style="background:' + (c.isPlayer ? '#fff' : c.color) + '"></span>' + c.name + '</td><td class="n">' + c.kills + '</td><td class="n">' + c.deaths + '</td></tr>';
      }).join('');
      return '<table class="as-tbl"><thead><tr><th>#</th><th>Fighter</th><th class="n">K</th><th class="n">D</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function showResults() {
      var ms = matchStats;
      var acc = pw.shots ? Math.round((pw.hits / pw.shots) * 100) : 0;
      var title = ms.rank === 1 ? (ms.tied ? (player.kills ? 'Tied for 1st' : 'No winner') : '🏆 Victory!') : ordinal(ms.rank) + ' place';
      var html = scoreTable(ms.ranked) +
        '<p class="as-small">Accuracy ' + acc + '% · Best streak ' + pw.bestStreak + (ms.newBest ? ' · <b style="color:#fbbf24">New personal best!</b>' : '') + '</p>';
      overlay = makeOverlay({
        title: title,
        text: map.name + ' · ' + SKILLS[settings.skill].name + ' bots',
        html: html,
        buttons: [
          { label: 'Play again', primary: true, onClick: startMatch },
          { label: 'Change settings', onClick: showMenu },
        ],
      });
    }

    /* ---------------- input ---------------- */
    function requestLock() {
      if (touchUI || !canvas.requestPointerLock) return;
      try {
        var p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(noop);
      } catch (e) {}
    }
    function exitLock() {
      if (document.pointerLockElement === canvas) {
        ignoreUnlock = true;
        try { document.exitPointerLock(); } catch (e) {}
      }
    }
    function onLockChange() {
      var was = locked;
      locked = document.pointerLockElement === canvas;
      if (was && !locked && state === 'play' && !ignoreUnlock) openPause();
      if (!locked) ignoreUnlock = false;
    }

    function localXY(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function inCircle(p, b, extra) {
      var dx = p[0] - b.x, dy = p[1] - b.y, r = b.r * (extra || 1.15);
      return dx * dx + dy * dy < r * r;
    }

    function onPointerDown(e) {
      var isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (isTouch) touchUI = true;
      else if (e.pointerType === 'mouse') touchUI = false;
      ctx.focus();
      if (state !== 'play') return;
      e.preventDefault();
      if (!isTouch) {
        if (!locked) requestLock();
        if (e.button === 0) input.fire = true;
        else if (e.button === 2) input.aim = true;
        return;
      }
      var p = localXY(e);
      var role = 'look';
      if (inCircle(p, btn.fire)) {
        role = 'fire';
        input.fire = true;
      } else if (inCircle(p, btn.reload)) {
        role = 'btn';
        startReload();
      } else if (inCircle(p, btn.swap)) {
        role = 'btn';
        cycleWeapon(1);
      } else if (p[0] < W * 0.45 && p[1] > H * 0.25 && joy.id === -1) {
        role = 'move';
        joy.id = e.pointerId;
        joy.bx = clamp(p[0], btn.joyR, W * 0.45);
        joy.by = clamp(p[1], btn.joyR, H - btn.joyR * 0.6);
        joy.x = joy.y = 0;
      }
      pointers[e.pointerId] = { role: role, x: p[0], y: p[1] };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }

    function onPointerMove(e) {
      if (state !== 'play') return;
      if (e.pointerType === 'mouse') {
        if (locked && player && player.alive) {
          var mx = e.movementX || 0;
          if (mx > 300 || mx < -300) return; // ignore spurious jumps some browsers emit on lock
          input.lookDX += mx * 0.0022 * settings.sens * (input.aim ? 0.55 : 1);
        }
        return;
      }
      var pt = pointers[e.pointerId];
      if (!pt) return;
      var p = localXY(e);
      if (pt.role === 'look' || pt.role === 'fire') {
        input.lookDX += (p[0] - pt.x) * 0.0065 * clamp(420 / Math.min(W, H), 0.7, 1.4);
      } else if (pt.role === 'move') {
        var dx = (p[0] - joy.bx) / btn.joyR, dy = (p[1] - joy.by) / btn.joyR;
        var l = Math.sqrt(dx * dx + dy * dy);
        if (l > 1) { dx /= l; dy /= l; }
        joy.x = dx;
        joy.y = dy;
      }
      pt.x = p[0];
      pt.y = p[1];
    }

    function onPointerUp(e) {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) input.fire = false;
        else if (e.button === 2) input.aim = false;
        return;
      }
      var pt = pointers[e.pointerId];
      if (!pt) return;
      delete pointers[e.pointerId];
      if (pt.role === 'fire') {
        var still = false;
        for (var k in pointers) if (pointers[k].role === 'fire') still = true;
        input.fire = still;
      } else if (pt.role === 'move') {
        joy.id = -1;
        joy.x = joy.y = 0;
      }
    }

    function releaseTouches() {
      pointers = {};
      joy.id = -1;
      joy.x = joy.y = 0;
      input.fire = false;
    }

    function onWheel(e) {
      if (state !== 'play' || !locked) return;
      e.preventDefault();
      cycleWeapon(e.deltaY > 0 ? 1 : -1);
    }

    ctx.captureKeys(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyP', 'KeyQ', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Enter', 'ShiftLeft', 'ShiftRight']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (state === 'menu' || state === 'over') {
        if ((code === 'Enter' || code === 'Space') && (state === 'menu' || overlay)) startMatch();
        return;
      }
      if (state === 'paused') {
        if (code === 'KeyP' || code === 'Escape' || code === 'Enter' || code === 'Space') resumeGame();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') { openPause(); return; }
      if (code === 'KeyR') startReload();
      else if (code === 'KeyQ') selectWeapon(pw.prev);
      else if (code.indexOf('Digit') === 0) {
        var n = parseInt(code.slice(5), 10) - 1;
        if (n >= 0 && n < WEAPONS.length) selectWeapon(n);
      }
    });

    on(canvas, 'pointerdown', onPointerDown);
    on(canvas, 'pointermove', onPointerMove);
    on(canvas, 'pointerup', onPointerUp);
    on(canvas, 'pointercancel', onPointerUp);
    on(canvas, 'contextmenu', function (e) { e.preventDefault(); });
    on(canvas, 'wheel', onWheel, { passive: false });
    on(document, 'pointerlockchange', onLockChange);
    on(window, 'blur', function () { input.fire = false; input.aim = false; });
    on(window, 'pointerup', function (e) {
      if (e.pointerType === 'mouse' && !locked) { input.fire = false; input.aim = false; }
    });
    on(pauseBtn, 'click', function (e) {
      e.stopPropagation();
      sfx('click');
      openPause();
    });
    on(pauseBtn, 'pointerdown', function (e) { e.stopPropagation(); });

    /* ---------------- loop ---------------- */
    var fpsAvg = 60;
    var loop = IGAME.loop(function (dt) {
      if (dt > 0) fpsAvg = fpsAvg * 0.95 + (1 / dt) * 0.05;
      update(dt);
      render(dt);
    });

    layout();
    showMenu();
    loop.start();

    return {
      pause: function () {
        if (state === 'play') openPause();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        exitLock();
        closeOverlay();
        for (var i = 0; i < listeners.length; i++) {
          var l = listeners[i];
          l[0].removeEventListener(l[1], l[2], l[3]);
        }
        listeners.length = 0;
        view.destroy();
        if (pauseBtn.parentNode) pauseBtn.parentNode.removeChild(pauseBtn);
        if (style.parentNode) style.parentNode.removeChild(style);
        if (ctx.debug) try { delete window.__arena; } catch (e) {}
      },
    };
  });
})();
