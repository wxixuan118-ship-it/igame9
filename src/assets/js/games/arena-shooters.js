/*!
 * igame9 — Hexfire Arena (engine id: arena-shooters)
 * An original single-player first-person arena shooter against bots.
 * Rendering is a classic grid raycaster on Canvas 2D: textured wall columns
 * (procedurally drawn textures), gradient floor/ceiling, z-buffered billboard
 * sprites for bots/pickups/rockets, world-space particles and a drawn weapon.
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

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('arena-shooters', function (ctx) {
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
