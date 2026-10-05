/*!
 * Epoch Siege — igame9 original side-scrolling lane battle (engine "age-siege").
 *
 * Your base is on the left, the rival tribe's base on the right. Spend gold to train
 * units that march and fight on their own, earn XP from kills to evolve through five
 * ages (Stone → Medieval → Gunpowder → Modern → Future), mount turrets and call one
 * special attack per age. The rival AI trains, evolves and fights back. Destroy its base.
 *
 * World: x runs 0..WORLD along the lane, y is height above the ground (up = positive).
 * Screen: X = (x - camX) * S, Y = groundY - y * S.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var WORLD = 2000;
  var BASE_W = 150;
  var P_FRONT = BASE_W; // player base front
  var E_FRONT = WORLD - BASE_W; // enemy base front
  var FLY_H = 105;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ---------------- data ---------------- */
  var ROLES = [
    { id: 'melee', cost: 15, hp: 60, dmg: 10, rate: 1.0, range: 16, speed: 36, train: 1.0, xp: 12, w: 16 },
    { id: 'ranged', cost: 25, hp: 38, dmg: 8, rate: 1.2, range: 140, speed: 32, train: 1.4, xp: 18, w: 16 },
    { id: 'heavy', cost: 70, hp: 200, dmg: 22, rate: 1.5, range: 26, speed: 24, train: 2.6, xp: 40, w: 46, armor: 0.3 },
    { id: 'flyer', cost: 50, hp: 55, dmg: 13, rate: 1.5, range: 34, speed: 44, train: 2.0, xp: 30, w: 26, fly: true },
  ];
  var HPM = [1, 2.2, 4.6, 9.6, 20];
  var CM = [1, 2.1, 4.2, 8.4, 17];
  var XP_NEED = [0, 800, 3000, 9000, 24000];
  var TRAIN_M = [1, 0.9, 0.8, 0.7, 0.6]; // later ages train faster, so gold matters more
  var BASE_HP = [500, 1000, 1900, 3600, 6500];

  var AGES = [
    {
      name: 'Stone Age', short: 'Stone',
      units: ['Club Brute', 'Sling Thrower', 'Mammoth Rider', 'Leaf Glider'],
      turret: { name: 'Rock Dropper', cost: 120, dmg: 9, rate: 1.4 },
      special: { name: 'Meteor Shower', dmg: 45, look: 'rock' },
      sky: ['#f2a25c', '#fbd9a2'], far: '#c98b5a', mid: '#9a7444', ground: '#7a5a32', grass: '#7b9a3e',
      shirt: '#9a6a3a', pants: '#6b4a26', skin: '#e0ac7a',
    },
    {
      name: 'Medieval Age', short: 'Medieval',
      units: ['Swordsman', 'Crossbowman', 'Lance Knight', 'War Kite'],
      turret: { name: 'Ballista', cost: 260, dmg: 20, rate: 1.3 },
      special: { name: 'Arrow Volley', dmg: 100, look: 'arrow' },
      sky: ['#6fa8dc', '#cfe6f7'], far: '#7d9bb8', mid: '#5d8a4a', ground: '#6a5232', grass: '#5f9a3a',
      shirt: '#8a8f99', pants: '#4b4f5a', skin: '#e8b98f',
    },
    {
      name: 'Gunpowder Age', short: 'Gunpowder',
      units: ['Saber Fencer', 'Musketeer', 'Cannon Cart', 'Bomb Balloon'],
      turret: { name: 'Fort Cannon', cost: 540, dmg: 42, rate: 1.2 },
      special: { name: 'Cannon Barrage', dmg: 210, look: 'ball' },
      sky: ['#9fb3c8', '#e3e8ee'], far: '#8796a8', mid: '#6b8456', ground: '#5e4a33', grass: '#6e8f45',
      shirt: '#3d5a99', pants: '#e8e2d0', skin: '#e8b98f',
    },
    {
      name: 'Modern Age', short: 'Modern',
      units: ['Shield Trooper', 'Rifleman', 'Battle Tank', 'Gyrocopter'],
      turret: { name: 'Flak Gun', cost: 1100, dmg: 88, rate: 1.0 },
      special: { name: 'Air Strike', dmg: 440, look: 'bomb' },
      sky: ['#5b8bc4', '#bcd6ee'], far: '#6f86a0', mid: '#59704a', ground: '#4f4636', grass: '#5d7a3f',
      shirt: '#5a6b3c', pants: '#45522e', skin: '#d9a77a',
    },
    {
      name: 'Future Age', short: 'Future',
      units: ['Plasma Blade', 'Laser Ranger', 'Mech Walker', 'Hover Drone'],
      turret: { name: 'Ion Cannon', cost: 2300, dmg: 185, rate: 0.9 },
      special: { name: 'Orbital Laser', dmg: 920, look: 'laser' },
      sky: ['#1b1440', '#5b3a8c'], far: '#3a2d6b', mid: '#2b3d5c', ground: '#2a2f45', grass: '#3fd0c9',
      shirt: '#d9dde8', pants: '#8a93a8', skin: '#e8c3a0',
    },
  ];
  var DIFFS = [
    { id: 'easy', name: 'Easy', gold: 0.75, xp: 0.75, think: 1.4, evoWait: 30, note: 'Slower rival' },
    { id: 'normal', name: 'Normal', gold: 1.0, xp: 1.05, think: 1.0, evoWait: 10, note: 'Fair fight' },
    { id: 'hard', name: 'Hard', gold: 1.3, xp: 1.45, think: 0.75, evoWait: 2, note: 'Rich, fast rival' },
  ];
  var TEAM = [
    { main: '#3b82f6', dark: '#1d4ed8', light: '#93c5fd' },
    { main: '#ef4444', dark: '#b91c1c', light: '#fca5a5' },
  ];
  var SPECIAL_CD = 50;
  var TURRET_RANGE = 280;
  var MAX_UNITS = 30;
  // turret mount heights on each age's base roof: [front slot, back slot]
  var MOUNT = [[72, 100], [92, 142], [114, 114], [92, 124], [112, 140]];

  var CSS = [
    '.as-top{position:absolute;left:0;right:0;top:0;z-index:4;display:flex;gap:6px;align-items:center;padding:7px 8px;pointer-events:none;flex-wrap:wrap}',
    '.as-pill{pointer-events:auto;font:800 14px var(--font,system-ui,sans-serif);color:#fff;background:rgba(5,6,14,.62);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 11px;white-space:nowrap}',
    '.as-btnp{cursor:pointer;touch-action:manipulation}',
    '.as-btnp.as-on{background:rgba(250,204,21,.85);color:#231600}',
    '.as-xp{pointer-events:auto;flex:1 1 140px;min-width:110px;max-width:340px;position:relative;height:26px;border-radius:999px;background:rgba(5,6,14,.62);border:1px solid rgba(255,255,255,.14);overflow:hidden}',
    '.as-xp i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#a78bfa,#f472b6);width:0}',
    '.as-xp span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:800 12px var(--font,system-ui,sans-serif);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);white-space:nowrap}',
    '.as-sp{flex:1 1 auto}',
    '.as-bar{position:absolute;left:0;right:0;bottom:0;z-index:4;display:flex;flex-wrap:wrap;gap:6px;padding:7px 8px;background:linear-gradient(180deg,#1b1f33,#11131f);border-top:2px solid #2d3352;user-select:none;-webkit-user-select:none}',
    '.as-units{display:flex;gap:6px;flex:4 1 300px;min-width:0}',
    '.as-acts{display:flex;gap:6px;flex:3 1 220px;min-width:0}',
    '.as-b{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 3px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#fff;cursor:pointer;font:700 11px/1.15 var(--font,system-ui,sans-serif);touch-action:manipulation;min-height:58px;overflow:hidden}',
    '.as-b:hover{background:rgba(255,255,255,.13)}',
    '.as-b:focus-visible{outline:2px solid #fde047;outline-offset:1px}',
    '.as-b canvas{width:34px;height:34px;display:block}',
    '.as-b .as-nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.as-b .as-c{color:#fde047;font-weight:900}',
    '.as-b.as-poor{opacity:.5}',
    '.as-b[disabled]{opacity:.45;cursor:default}',
    '.as-b .as-k{position:absolute;top:2px;left:5px;font-size:10px;opacity:.5}',
    '.as-b .as-cd{position:absolute;left:0;bottom:0;height:3px;background:#fde047;width:0}',
    '.as-b.as-ready{border-color:#fde047;box-shadow:0 0 0 2px rgba(253,224,71,.35) inset}',
    '.as-evo.as-ready{background:linear-gradient(135deg,#a855f7,#ec4899);border-color:transparent;animation:asPulse 1s ease-in-out infinite}',
    '.as-b .as-ico{font-size:22px;line-height:30px;height:34px}',
    '.as-q{position:absolute;left:8px;bottom:100%;margin-bottom:6px;display:flex;gap:4px;align-items:center;pointer-events:none}',
    '.as-q b{display:block;width:16px;height:16px;border-radius:5px;background:rgba(5,6,14,.6);border:1px solid rgba(255,255,255,.25)}',
    '.as-q b.as-q0{background:linear-gradient(90deg,#fde047 var(--p,0%),rgba(5,6,14,.6) var(--p,0%))}',
    '.as-mini{position:absolute;left:50%;transform:translateX(-50%);z-index:4;height:12px;border-radius:6px;background:rgba(5,6,14,.55);border:1px solid rgba(255,255,255,.18);cursor:pointer;touch-action:none}',
    '.as-diffs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:4px 0 12px}',
    '.as-diffs .ig-btn{padding:9px 4px;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:2px}',
    '.as-diffs small{font-size:10px;font-weight:600;opacity:.85}',
    '.as-statrow{display:flex;justify-content:center;gap:18px;margin:2px 0 12px;flex-wrap:wrap}',
    '.as-statrow div{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.8}',
    '.as-statrow b{display:block;font:900 22px var(--font,system-ui,sans-serif);color:#fff;letter-spacing:0}',
    '.as-help{text-align:left;font-size:13px;line-height:1.45;margin:0 0 12px;padding-left:18px}',
    '@keyframes asPulse{50%{filter:brightness(1.25)}}',
    '@media (max-width:520px){.as-b{min-height:50px;font-size:10px}.as-b canvas{width:28px;height:28px}.as-b .as-ico{font-size:18px;height:28px;line-height:26px}.as-pill{font-size:12px;padding:4px 8px}}',
  ].join('\n');

  /* ================================================================== */
  /* Drawing: units, bases, turrets (local coords, y negative is up)    */
  /* ================================================================== */
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function circ(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  }
  function ell(c, x, y, rx, ry, rot) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }
  function line(c, x0, y0, x1, y1) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  }

  // Foot soldier. walk: phase (radians), atk: 0..1 swing progress
  function drawSoldier(c, age, role, team, walk, atk) {
    var A = AGES[age];
    var T = TEAM[team];
    var sw = Math.sin(walk) * 0.55;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    // legs
    c.strokeStyle = A.pants;
    c.lineWidth = 4;
    line(c, -1, -14, -1 + Math.sin(sw) * 9, -1);
    line(c, 1, -14, 1 - Math.sin(sw) * 9, -1);
    c.fillStyle = '#2b2118';
    ell(c, -1 + Math.sin(sw) * 9 + 1.5, -1, 3, 1.6);
    c.fill();
    ell(c, 1 - Math.sin(sw) * 9 + 1.5, -1, 3, 1.6);
    c.fill();
    // torso
    c.fillStyle = A.shirt;
    rr(c, -5, -27, 10, 14, 3);
    c.fill();
    // team sash
    c.strokeStyle = T.main;
    c.lineWidth = 2.5;
    line(c, -4.5, -26, 4.5, -15);
    // back arm
    var armA = role === 'melee' ? -0.4 + atk * 2.2 : -0.2;
    // head
    c.fillStyle = A.skin;
    circ(c, 0.5, -32, 5.5);
    c.fill();
    c.fillStyle = '#1b1b1b';
    circ(c, 3, -33, 0.9);
    c.fill();
    // headgear
    switch (age) {
      case 0:
        c.fillStyle = '#4a2e14';
        c.beginPath();
        c.arc(0.5, -33, 5.8, Math.PI * 1.05, Math.PI * 1.95);
        c.fill();
        c.fillStyle = T.main;
        c.fillRect(-5, -35.5, 11, 1.8);
        break;
      case 1:
        c.fillStyle = '#9ca3af';
        c.beginPath();
        c.arc(0.5, -33, 6.2, Math.PI, 0);
        c.fill();
        c.fillRect(-0.3, -34, 1.6, 6);
        c.fillStyle = T.main;
        c.beginPath();
        c.moveTo(0.5, -39);
        c.quadraticCurveTo(-5, -43, -7, -38);
        c.lineTo(0.5, -38);
        c.fill();
        break;
      case 2:
        c.fillStyle = '#1f2937';
        c.beginPath();
        c.moveTo(-7, -35);
        c.lineTo(8, -35);
        c.lineTo(0.5, -42);
        c.closePath();
        c.fill();
        c.fillStyle = T.main;
        circ(c, 5, -37, 1.5);
        c.fill();
        break;
      case 3:
        c.fillStyle = '#4d5e33';
        c.beginPath();
        c.arc(0.5, -33.5, 6.4, Math.PI, 0);
        c.fill();
        c.fillRect(-6, -34, 13, 1.6);
        c.fillStyle = T.main;
        c.fillRect(-2, -38.5, 4, 2);
        break;
      default:
        c.fillStyle = '#e5e7eb';
        c.beginPath();
        c.arc(0.5, -32.5, 6.5, Math.PI * 0.95, Math.PI * 2.05);
        c.fill();
        c.fillStyle = T.light;
        c.shadowColor = T.light;
        c.shadowBlur = 4;
        c.fillRect(-1, -34.5, 8, 2.6);
        c.shadowBlur = 0;
    }
    // weapon arm
    c.save();
    c.translate(1, -24);
    if (role === 'melee') {
      c.rotate(armA);
      c.strokeStyle = A.skin;
      c.lineWidth = 3;
      line(c, 0, 0, 6, 4);
      c.translate(6, 4);
      switch (age) {
        case 0:
          c.strokeStyle = '#7a4a1e';
          c.lineWidth = 3;
          line(c, 0, 0, 3, -11);
          c.fillStyle = '#7a4a1e';
          ell(c, 3.5, -12, 3, 4, 0.2);
          c.fill();
          break;
        case 1:
          c.strokeStyle = '#d1d5db';
          c.lineWidth = 2.4;
          line(c, 0, 0, 3, -15);
          c.strokeStyle = '#78350f';
          c.lineWidth = 2;
          line(c, -2.5, -1, 3, 1);
          break;
        case 2:
          c.strokeStyle = '#e5e7eb';
          c.lineWidth = 1.8;
          c.beginPath();
          c.moveTo(0, 0);
          c.quadraticCurveTo(5, -8, 2, -16);
          c.stroke();
          break;
        case 3:
          c.strokeStyle = '#111827';
          c.lineWidth = 2.4;
          line(c, 0, 0, 3, -10);
          break;
        default:
          c.strokeStyle = T.light;
          c.shadowColor = T.main;
          c.shadowBlur = 6;
          c.lineWidth = 2.6;
          line(c, 0, 0, 3, -17);
          c.shadowBlur = 0;
      }
      c.restore();
      if (age === 3) {
        // riot shield
        c.fillStyle = 'rgba(148,163,184,.85)';
        rr(c, 5, -29, 5, 18, 2);
        c.fill();
        c.strokeStyle = T.main;
        c.lineWidth = 1;
        c.stroke();
      }
    } else {
      // ranged weapons held forward; recoil on attack
      var rec = atk > 0 ? Math.sin(atk * Math.PI) * 2.5 : 0;
      c.translate(-rec, 0);
      c.strokeStyle = A.skin;
      c.lineWidth = 3;
      line(c, 0, 0, 7, 0);
      switch (age) {
        case 0:
          c.strokeStyle = '#7a4a1e';
          c.lineWidth = 1.4;
          c.beginPath();
          c.arc(7, -3 - atk * 4, 5, 0, TAU);
          c.stroke();
          break;
        case 1:
          c.strokeStyle = '#78350f';
          c.lineWidth = 2.5;
          line(c, 2, 0, 15, 0);
          c.strokeStyle = '#a16207';
          c.lineWidth = 1.6;
          c.beginPath();
          c.moveTo(12, -6);
          c.quadraticCurveTo(15, 0, 12, 6);
          c.stroke();
          break;
        case 2:
          c.strokeStyle = '#5b3313';
          c.lineWidth = 3;
          line(c, -2, 1, 8, 0);
          c.strokeStyle = '#4b5563';
          c.lineWidth = 1.8;
          line(c, 8, 0, 20, -1);
          break;
        case 3:
          c.strokeStyle = '#1f2937';
          c.lineWidth = 3;
          line(c, -2, 1, 17, -1);
          c.fillStyle = '#1f2937';
          c.fillRect(6, 0, 2.5, 4);
          break;
        default:
          c.fillStyle = '#e5e7eb';
          rr(c, 1, -3, 15, 5, 2);
          c.fill();
          c.fillStyle = T.light;
          c.fillRect(13, -2, 4, 3);
      }
      c.restore();
    }
  }

  function drawHeavy(c, age, team, walk, atk) {
    var T = TEAM[team];
    var bob = Math.sin(walk * 2) * 0.8;
    c.lineCap = 'round';
    switch (age) {
      case 0: {
        // mammoth with a rider
        c.fillStyle = '#6b4a2b';
        for (var l = 0; l < 4; l++) {
          var lx = -16 + l * 10;
          var la = Math.sin(walk + l * 1.6) * 3;
          rr(c, lx + la - 3, -14, 7, 14, 3);
          c.fill();
        }
        ell(c, 0, -24 + bob, 24, 15);
        c.fill();
        c.fillStyle = '#835b35';
        ell(c, -4, -30 + bob, 16, 7);
        c.fill();
        // head + trunk
        c.fillStyle = '#6b4a2b';
        circ(c, 20, -26 + bob, 10);
        c.fill();
        c.strokeStyle = '#6b4a2b';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(26, -24 + bob);
        c.quadraticCurveTo(32 + atk * 6, -14, 28 + atk * 8, -6 + atk * -6);
        c.stroke();
        c.strokeStyle = '#f5f0e6';
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(24, -20 + bob);
        c.quadraticCurveTo(32, -18, 34, -24);
        c.stroke();
        c.fillStyle = '#111';
        circ(c, 23, -29 + bob, 1.3);
        c.fill();
        c.fillStyle = T.main;
        rr(c, -10, -40 + bob, 18, 5, 2);
        c.fill();
        c.save();
        c.translate(-2, -38 + bob);
        c.scale(0.7, 0.7);
        drawSoldier(c, 0, 'melee', team, 0, atk);
        c.restore();
        break;
      }
      case 1: {
        // horse + lance knight
        c.fillStyle = '#8b5a2b';
        for (var h = 0; h < 4; h++) {
          var hx = -14 + h * 9;
          var ha = Math.sin(walk * 1.4 + h * 1.6) * 4;
          c.strokeStyle = '#6b4220';
          c.lineWidth = 3.5;
          line(c, hx, -16, hx + ha, -1);
        }
        ell(c, 0, -21 + bob, 19, 9);
        c.fill();
        c.save();
        c.translate(17, -27 + bob);
        c.rotate(-0.6);
        rr(c, -3, -12, 8, 15, 3);
        c.fill();
        c.restore();
        c.fillStyle = '#8b5a2b';
        ell(c, 25, -36 + bob, 7, 4.5, 0.3);
        c.fill();
        c.fillStyle = T.main;
        rr(c, -12, -26 + bob, 22, 9, 2);
        c.fill();
        c.fillStyle = '#3b2412';
        c.beginPath();
        c.moveTo(-18, -22 + bob);
        c.quadraticCurveTo(-26, -16, -22, -8);
        c.lineTo(-18, -18);
        c.fill();
        c.save();
        c.translate(-2, -28 + bob);
        c.scale(0.8, 0.8);
        drawSoldier(c, 1, 'ranged', team, 0, 0);
        c.restore();
        c.strokeStyle = '#d6b37a';
        c.lineWidth = 2.4;
        line(c, -4, -46 + bob, 40 + atk * 10, -44 + bob);
        c.fillStyle = '#9ca3af';
        c.beginPath();
        c.moveTo(40 + atk * 10, -46 + bob);
        c.lineTo(47 + atk * 10, -44 + bob);
        c.lineTo(40 + atk * 10, -42 + bob);
        c.fill();
        break;
      }
      case 2: {
        // cannon cart
        c.fillStyle = '#7c4a1e';
        rr(c, -22, -16, 34, 8, 2);
        c.fill();
        c.save();
        c.translate(-2, -20);
        c.rotate(-0.12 - atk * 0.1);
        c.fillStyle = '#374151';
        rr(c, -6, -5, 34 - atk * 4, 10, 4);
        c.fill();
        c.fillStyle = '#1f2937';
        circ(c, 28 - atk * 4, 0, 4);
        c.fill();
        c.restore();
        [-14, 6].forEach(function (wx) {
          c.fillStyle = '#5b3313';
          circ(c, wx, -7, 7);
          c.fill();
          c.strokeStyle = '#c08a4a';
          c.lineWidth = 1.2;
          for (var s = 0; s < 4; s++) {
            var a = walk + (s * Math.PI) / 4;
            line(c, wx - Math.cos(a) * 6, -7 - Math.sin(a) * 6, wx + Math.cos(a) * 6, -7 + Math.sin(a) * 6);
          }
        });
        c.save();
        c.translate(-26, 0);
        c.scale(0.85, 0.85);
        drawSoldier(c, 2, 'melee', team, walk, 0);
        c.restore();
        c.fillStyle = T.main;
        c.fillRect(-21, -15, 6, 4);
        break;
      }
      case 3: {
        // tank
        c.fillStyle = '#2f3a22';
        rr(c, -25, -12, 50, 12, 6);
        c.fill();
        c.fillStyle = '#1c2414';
        for (var w = 0; w < 5; w++) {
          circ(c, -19 + w * 9.5, -6, 3.6);
          c.fill();
        }
        c.strokeStyle = '#59693b';
        c.lineWidth = 1;
        for (var tr = 0; tr < 10; tr++) {
          var tx = -24 + ((tr * 5 + walk * 6) % 50);
          line(c, tx, -12, tx, -10);
        }
        c.fillStyle = '#56683a';
        rr(c, -22, -22, 42, 11, 4);
        c.fill();
        c.fillStyle = '#4d5e33';
        rr(c, -10, -31, 22, 11, 5);
        c.fill();
        c.fillStyle = '#3d4a28';
        rr(c, 10, -28 + 0, 26 - atk * 5, 4.5, 2);
        c.fill();
        c.fillStyle = T.main;
        c.fillRect(-18, -20, 8, 4);
        break;
      }
      default: {
        // mech walker
        var st = Math.sin(walk);
        c.strokeStyle = '#64748b';
        c.lineWidth = 5;
        line(c, -6, -28, -10 + st * 8, -14);
        line(c, -10 + st * 8, -14, -6 + st * 8, 0);
        line(c, 6, -28, 10 - st * 8, -14);
        line(c, 10 - st * 8, -14, 6 - st * 8, 0);
        c.fillStyle = '#cbd5e1';
        rr(c, -16, -50 + bob, 32, 24, 7);
        c.fill();
        c.fillStyle = T.light;
        c.shadowColor = T.main;
        c.shadowBlur = 8;
        rr(c, 2, -45 + bob, 11, 6, 3);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#94a3b8';
        rr(c, 10, -38 + bob, 26 - atk * 5, 6, 3);
        c.fill();
        c.fillStyle = T.main;
        c.fillRect(-14, -34 + bob, 8, 4);
      }
    }
  }

  function drawFlyer(c, age, team, t, atk) {
    var T = TEAM[team];
    var bob = Math.sin(t * 3) * 2;
    c.lineCap = 'round';
    switch (age) {
      case 0: {
        c.fillStyle = '#4d7c0f';
        c.beginPath();
        c.moveTo(-22, -14 + bob);
        c.quadraticCurveTo(0, -30 + bob, 22, -14 + bob);
        c.quadraticCurveTo(0, -20 + bob, -22, -14 + bob);
        c.fill();
        c.strokeStyle = '#365314';
        c.lineWidth = 1;
        line(c, -20, -15 + bob, 20, -15 + bob);
        c.save();
        c.translate(0, 18 + bob);
        c.scale(0.75, 0.75);
        drawSoldier(c, 0, 'ranged', team, 0, atk);
        c.restore();
        c.strokeStyle = '#78350f';
        c.lineWidth = 1;
        line(c, -6, -17 + bob, 0, -6 + bob);
        line(c, 6, -17 + bob, 0, -6 + bob);
        break;
      }
      case 1: {
        c.fillStyle = T.main;
        c.beginPath();
        c.moveTo(0, -34 + bob);
        c.lineTo(16, -18 + bob);
        c.lineTo(0, -2 + bob);
        c.lineTo(-16, -18 + bob);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)';
        c.beginPath();
        c.moveTo(0, -34 + bob);
        c.lineTo(16, -18 + bob);
        c.lineTo(0, -18 + bob);
        c.fill();
        c.strokeStyle = '#fde68a';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(0, -2 + bob);
        c.quadraticCurveTo(-10, 6 + bob, -20, 2 + Math.sin(t * 6) * 3);
        c.stroke();
        c.save();
        c.translate(0, 26 + bob);
        c.scale(0.7, 0.7);
        drawSoldier(c, 1, 'ranged', team, 0, atk);
        c.restore();
        break;
      }
      case 2: {
        c.fillStyle = T.main;
        ell(c, 0, -26 + bob, 15, 17);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,.45)';
        c.lineWidth = 2;
        ell(c, 0, -26 + bob, 6, 17);
        c.stroke();
        c.strokeStyle = '#78350f';
        c.lineWidth = 1;
        line(c, -10, -14 + bob, -6, -2 + bob);
        line(c, 10, -14 + bob, 6, -2 + bob);
        c.fillStyle = '#92400e';
        rr(c, -8, -3 + bob, 16, 8, 2);
        c.fill();
        c.fillStyle = '#1f2937';
        circ(c, 3, 8 + bob + atk * 6, 3);
        c.fill();
        break;
      }
      case 3: {
        c.fillStyle = '#4d5e33';
        ell(c, 0, -10 + bob, 15, 7);
        c.fill();
        c.fillStyle = '#a5d8ff';
        ell(c, 7, -12 + bob, 5, 4);
        c.fill();
        c.strokeStyle = '#4d5e33';
        c.lineWidth = 3;
        line(c, -12, -10 + bob, -26, -13 + bob);
        c.strokeStyle = '#1f2937';
        c.lineWidth = 2;
        line(c, 0, -17 + bob, 0, -21 + bob);
        var ra = Math.sin(t * 40) * 20;
        line(c, -ra, -21 + bob, ra, -21 + bob);
        c.fillStyle = T.main;
        c.fillRect(-8, -12 + bob, 5, 3);
        c.strokeStyle = '#1f2937';
        c.lineWidth = 1.2;
        line(c, -8, -3 + bob, 8, -3 + bob);
        break;
      }
      default: {
        c.fillStyle = '#cbd5e1';
        ell(c, 0, -12 + bob, 17, 6);
        c.fill();
        c.fillStyle = '#e2e8f0';
        ell(c, 0, -16 + bob, 8, 5);
        c.fill();
        c.fillStyle = T.light;
        c.shadowColor = T.main;
        c.shadowBlur = 10;
        ell(c, 0, -8 + bob, 12, 2.4);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = 'rgba(147,197,253,' + (0.25 + Math.sin(t * 8) * 0.1).toFixed(3) + ')';
        c.beginPath();
        c.moveTo(-8, -7 + bob);
        c.lineTo(8, -7 + bob);
        c.lineTo(12, 6 + bob);
        c.lineTo(-12, 6 + bob);
        c.fill();
      }
    }
  }

  function drawBase(c, age, team, hpFrac, t) {
    var T = TEAM[team];
    var A = AGES[age];
    var dmg = 1 - hpFrac;
    switch (age) {
      case 0: {
        c.fillStyle = '#8a7a66';
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(10, -110, 90, -100);
        c.quadraticCurveTo(140, -90, 140, 0);
        c.fill();
        c.fillStyle = '#a3927c';
        ell(c, 60, -80, 40, 16, -0.2);
        c.fill();
        c.fillStyle = '#2a1f14';
        c.beginPath();
        c.moveTo(85, 0);
        c.quadraticCurveTo(100, -55, 125, 0);
        c.fill();
        // fire
        var f = Math.sin(t * 12) * 2;
        c.fillStyle = '#f97316';
        c.beginPath();
        c.moveTo(97, 0);
        c.quadraticCurveTo(105, -18 - f, 113, 0);
        c.fill();
        c.fillStyle = '#fde047';
        c.beginPath();
        c.moveTo(101, 0);
        c.quadraticCurveTo(105, -9 + f, 109, 0);
        c.fill();
        // fence
        c.strokeStyle = '#7a4a1e';
        c.lineWidth = 4;
        for (var p = 0; p < 4; p++) line(c, 128 + p * 6, 0, 130 + p * 6, -22);
        c.fillStyle = T.main;
        c.fillRect(40, -122, 3, 26);
        c.beginPath();
        c.moveTo(43, -122);
        c.lineTo(62, -116);
        c.lineTo(43, -110);
        c.fill();
        break;
      }
      case 1: {
        c.fillStyle = '#9ca3af';
        c.fillRect(10, -130, 70, 130);
        c.fillRect(70, -80, 70, 80);
        c.fillStyle = '#6b7280';
        for (var k = 0; k < 5; k++) c.fillRect(10 + k * 14, -140, 9, 10);
        for (var k2 = 0; k2 < 5; k2++) c.fillRect(70 + k2 * 14, -90, 9, 10);
        c.fillStyle = '#4b5563';
        c.beginPath();
        c.moveTo(100, 0);
        c.lineTo(100, -40);
        c.arc(115, -40, 15, Math.PI, 0);
        c.lineTo(130, 0);
        c.fill();
        c.fillStyle = '#1f2937';
        rr(c, 38, -100, 12, 20, 6);
        c.fill();
        c.strokeStyle = 'rgba(0,0,0,.15)';
        c.lineWidth = 1;
        for (var y = -120; y < 0; y += 14) line(c, 10, y, 80, y);
        c.fillStyle = '#4b5563';
        c.fillRect(42, -170, 3, 32);
        c.fillStyle = T.main;
        c.beginPath();
        c.moveTo(45, -170);
        c.lineTo(45 + 22 + Math.sin(t * 5) * 2, -164);
        c.lineTo(45, -156);
        c.fill();
        break;
      }
      case 2: {
        c.fillStyle = '#a8a29e';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(10, -100);
        c.lineTo(130, -100);
        c.lineTo(145, 0);
        c.fill();
        c.fillStyle = '#78716c';
        c.fillRect(0, -112, 140, 14);
        c.fillStyle = '#292524';
        [30, 70, 110].forEach(function (x) {
          circ(c, x, -70, 7);
          c.fill();
        });
        c.fillStyle = '#57534e';
        c.beginPath();
        c.moveTo(95, 0);
        c.lineTo(95, -36);
        c.arc(112, -36, 17, Math.PI, 0);
        c.lineTo(129, 0);
        c.fill();
        c.fillStyle = '#44403c';
        c.fillRect(60, -160, 3, 48);
        c.fillStyle = T.main;
        c.fillRect(63, -160, 28, 9);
        c.fillStyle = '#fff';
        c.fillRect(63, -151, 28, 4);
        c.fillStyle = T.main;
        c.fillRect(63, -147, 28, 6);
        break;
      }
      case 3: {
        c.fillStyle = '#9ca3af';
        rr(c, 0, -90, 145, 90, 8);
        c.fill();
        c.fillStyle = '#6b7280';
        rr(c, 15, -122, 70, 34, 6);
        c.fill();
        c.fillStyle = '#111827';
        c.fillRect(25, -110, 50, 6);
        c.fillRect(30, -55, 90, 7);
        c.fillStyle = '#4b5563';
        rr(c, 100, -50, 30, 50, 3);
        c.fill();
        c.strokeStyle = '#374151';
        c.lineWidth = 3;
        line(c, 60, -122, 60, -160);
        c.save();
        c.translate(60, -162);
        c.rotate(Math.sin(t) * 0.5);
        c.fillStyle = '#d1d5db';
        c.beginPath();
        c.arc(0, 0, 13, Math.PI * 0.1, Math.PI * 0.9);
        c.fill();
        c.restore();
        c.fillStyle = T.main;
        c.fillRect(0, -90, 145, 6);
        break;
      }
      default: {
        var g = c.createLinearGradient(0, -130, 0, 0);
        g.addColorStop(0, '#e2e8f0');
        g.addColorStop(1, '#94a3b8');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(0, -140, 72, -140);
        c.quadraticCurveTo(145, -140, 145, 0);
        c.fill();
        c.strokeStyle = T.light;
        c.shadowColor = T.main;
        c.shadowBlur = 14;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(72, -10, 90 + Math.sin(t * 3) * 2, Math.PI * 1.15, Math.PI * 1.85);
        c.stroke();
        c.fillStyle = T.light;
        circ(c, 72, -80, 14 + Math.sin(t * 4) * 2);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#334155';
        rr(c, 100, -40, 30, 40, 10);
        c.fill();
        c.strokeStyle = '#64748b';
        c.lineWidth = 2;
        line(c, 72, -140, 72, -175);
        c.fillStyle = T.light;
        circ(c, 72, -177, 3);
        c.fill();
      }
    }
    // damage cracks
    if (dmg > 0.25) {
      c.strokeStyle = 'rgba(30,20,10,.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(60, -40);
      c.lineTo(52, -55);
      c.lineTo(62, -66);
      if (dmg > 0.55) {
        c.moveTo(105, -70);
        c.lineTo(96, -82);
        c.lineTo(104, -95);
        c.moveTo(30, -20);
        c.lineTo(22, -34);
      }
      c.stroke();
    }
    if (dmg > 0.6) {
      c.fillStyle = 'rgba(80,80,80,' + (0.25 + Math.sin(t * 2) * 0.08).toFixed(3) + ')';
      circ(c, 50, -120 - ((t * 20) % 30), 10);
      c.fill();
    }
    void A;
  }

  function drawTurret(c, age, team, ang, kick) {
    var T = TEAM[team];
    c.save();
    c.fillStyle = '#374151';
    rr(c, -12, -8, 24, 8, 2);
    c.fill();
    c.translate(0, -10);
    c.rotate(ang);
    c.translate(-kick * 4, 0);
    switch (age) {
      case 0:
        c.strokeStyle = '#7a4a1e';
        c.lineWidth = 4;
        line(c, 0, 0, 22, 0);
        c.fillStyle = '#78716c';
        circ(c, 22, -3, 6);
        c.fill();
        break;
      case 1:
        c.strokeStyle = '#7c4a1e';
        c.lineWidth = 3;
        line(c, -6, 0, 22, 0);
        c.strokeStyle = '#a16207';
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(14, -12);
        c.quadraticCurveTo(22, 0, 14, 12);
        c.stroke();
        break;
      case 2:
        c.fillStyle = '#1f2937';
        rr(c, -6, -5, 30, 10, 4);
        c.fill();
        break;
      case 3:
        c.fillStyle = '#4d5e33';
        rr(c, -8, -7, 18, 14, 3);
        c.fill();
        c.fillStyle = '#1f2937';
        c.fillRect(8, -5, 20, 3);
        c.fillRect(8, 2, 20, 3);
        break;
      default:
        c.fillStyle = '#cbd5e1';
        rr(c, -8, -7, 30, 14, 6);
        c.fill();
        c.fillStyle = T.light;
        c.shadowColor = T.main;
        c.shadowBlur = 8;
        circ(c, 22, 0, 4);
        c.fill();
        c.shadowBlur = 0;
    }
    c.restore();
    c.fillStyle = T.main;
    c.fillRect(-12, -3, 24, 3);
  }

  /* ================================================================== */
  /* Engine                                                              */
  /* ================================================================== */
  IGAME.register('age-siege', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;

    var stats = store.get('stats', { wins: [0, 0, 0], best: [0, 0, 0], kills: 0, games: 0 });
    var diffIdx = clamp(store.get('diff', 1) | 0, 0, 2);

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    /* ---------------- canvas & layout ---------------- */
    var W = 0;
    var H = 0;
    var S = 1;
    var groundY = 0;
    var viewW = 0;
    var barH = 80;
    var booted = false;
    var view = IGAME.createCanvas(root, {
      onResize: function (w, h) {
        W = w;
        H = h;
        if (booted) layout();
      },
    });
    var g = view.ctx;

    /* ---------------- DOM HUD ---------------- */
    var top = ui.el('div', 'as-top');
    var bPause = ui.el('button', 'as-pill as-btnp', '❚❚');
    bPause.type = 'button';
    bPause.setAttribute('aria-label', 'Pause (P)');
    bPause.setAttribute('data-act', 'pause');
    var goldPill = ui.el('div', 'as-pill', '');
    var xpBox = ui.el('div', 'as-xp', '<i></i><span></span>');
    var spacer = ui.el('div', 'as-sp');
    var bFollow = ui.el('button', 'as-pill as-btnp as-on', '⌖ Follow');
    bFollow.type = 'button';
    bFollow.title = 'Camera follows the front line (F)';
    bFollow.setAttribute('data-act', 'follow');
    top.appendChild(bPause);
    top.appendChild(goldPill);
    top.appendChild(xpBox);
    top.appendChild(spacer);
    top.appendChild(bFollow);
    root.appendChild(top);

    var mini = ui.el('div', 'as-mini');
    mini.setAttribute('aria-label', 'Battlefield map — tap to move the camera');
    var miniCv = document.createElement('canvas');
    miniCv.style.cssText = 'width:100%;height:100%;display:block;border-radius:6px';
    mini.appendChild(miniCv);
    root.appendChild(mini);

    var bar = ui.el('div', 'as-bar');
    var unitRow = ui.el('div', 'as-units');
    var actRow = ui.el('div', 'as-acts');
    var queueEl = ui.el('div', 'as-q');
    bar.appendChild(queueEl);
    bar.appendChild(unitRow);
    bar.appendChild(actRow);
    root.appendChild(bar);
    var unitBtns = [];
    for (var ri = 0; ri < 4; ri++) {
      var ub = ui.el('button', 'as-b');
      ub.type = 'button';
      ub.setAttribute('data-act', 'unit' + ri);
      unitRow.appendChild(ub);
      unitBtns.push(ub);
    }
    var bTurret = ui.el('button', 'as-b');
    bTurret.type = 'button';
    bTurret.setAttribute('data-act', 'turret');
    var bSpecial = ui.el('button', 'as-b');
    bSpecial.type = 'button';
    bSpecial.setAttribute('data-act', 'special');
    var bEvolve = ui.el('button', 'as-b as-evo');
    bEvolve.type = 'button';
    bEvolve.setAttribute('data-act', 'evolve');
    actRow.appendChild(bTurret);
    actRow.appendChild(bSpecial);
    actRow.appendChild(bEvolve);

    var layoutKey = '';
    function layout() {
      bFollow.textContent = W < 520 ? '⌖' : '⌖ Follow';
      barH = bar.offsetHeight || 80;
      layoutKey = W + 'x' + H + ':' + barH + ':' + top.offsetHeight;
      var avail = H - barH;
      S = clamp(Math.min(avail / 300, W / 380), 0.45, 4);
      groundY = avail - Math.max(16, 22 * S);
      viewW = W / S;
      var topH = top.offsetHeight || 40;
      mini.style.top = topH + 2 + 'px';
      mini.style.width = Math.min(W - 24, 420) + 'px';
      miniCv.width = Math.round(Math.min(W - 24, 420) * view.dpr);
      miniCv.height = Math.round(12 * view.dpr);
      clampCam();
    }

    /* ---------------- state ---------------- */
    var state = 'title'; // title | play | paused | over
    var D = DIFFS[diffIdx];
    var sides;
    var units = [];
    var projs = [];
    var parts = [];
    var texts = [];
    var falls = [];
    var time = 0;
    var matchT = 0;
    var camX = 0;
    var camTarget = 0;
    var follow = true;
    var shake = 0;
    var overlay = null;
    var banner = null;
    var uid = 0;
    var aiThink = 0;
    var kills = 0;
    var result = null;
    var overT = 0;
    var sndHit = 0;
    var hudKey = '';
    var iconAge = -1;

    function newSide(team) {
      return {
        team: team, dir: team ? -1 : 1, age: 0, gold: 175, xp: 0, hp: BASE_HP[0], maxHp: BASE_HP[0],
        queue: [], trainT: 0, turrets: [null, null], specialCd: 12, vet: 0, front: team ? E_FRONT : P_FRONT, hitT: 0,
      };
    }

    // vet: Veteran Training level (final age gold sink), +25% hp and damage per level
    function unitStats(age, role, vet) {
      var R = ROLES[role];
      var vm = 1 + 0.25 * (vet || 0);
      return {
        hp: Math.round(R.hp * HPM[age] * vm), dmg: R.dmg * HPM[age] * vm, cost: Math.round(R.cost * CM[age]), xp: Math.round(R.xp * CM[age]),
        rate: R.rate, range: R.range, speed: R.speed, train: R.train * TRAIN_M[age], w: R.w, armor: R.armor || 0, fly: !!R.fly,
      };
    }
    function turretCost(age) {
      return AGES[age].turret.cost;
    }

    /* ---------------- actions (both sides use these) ---------------- */
    function train(side, role) {
      var st = unitStats(side.age, role);
      var onField = 0;
      for (var i = 0; i < units.length; i++) if (units[i].team === side.team) onField++;
      if (side.queue.length >= 5 || onField + side.queue.length >= MAX_UNITS) {
        if (!side.team) {
          sfx('error');
          toast(side.queue.length >= 5 ? 'Training queue is full' : 'Army is at full strength');
        }
        return false;
      }
      if (side.gold < st.cost) {
        if (!side.team) {
          sfx('error');
          toast('Need ' + (st.cost - Math.floor(side.gold)) + ' more gold');
        }
        return false;
      }
      side.gold -= st.cost;
      side.queue.push({ role: role, age: side.age, vet: side.vet, t: st.train });
      if (!side.team) sfx('buy');
      return true;
    }
    function buyTurret(side) {
      var slot = side.turrets.indexOf(null);
      var cost = turretCost(side.age);
      if (slot < 0) {
        // replace the oldest turret with a current-age one
        var oldest = -1;
        for (var i = 0; i < 2; i++) if (side.turrets[i].age < side.age && (oldest < 0 || side.turrets[i].age < side.turrets[oldest].age)) oldest = i;
        if (oldest < 0) {
          if (!side.team) {
            sfx('error');
            toast('Both turret slots hold ' + AGES[side.age].turret.name + 's');
          }
          return false;
        }
        var refund = Math.floor(turretCost(side.turrets[oldest].age) * 0.5);
        if (side.gold + refund < cost) {
          if (!side.team) {
            sfx('error');
            toast('Need ' + (cost - refund - Math.floor(side.gold)) + ' more gold');
          }
          return false;
        }
        side.gold += refund;
        slot = oldest;
      } else if (side.gold < cost) {
        if (!side.team) {
          sfx('error');
          toast('Need ' + (cost - Math.floor(side.gold)) + ' more gold');
        }
        return false;
      }
      side.gold -= cost;
      side.turrets[slot] = { age: side.age, cd: 0.5, ang: side.dir > 0 ? 0 : Math.PI, kick: 0 };
      if (!side.team) {
        sfx('buy');
        toast(AGES[side.age].turret.name + ' mounted');
      }
      return true;
    }
    var VET_MAX = 10;
    function vetCost(side) {
      return 2000 * (side.vet + 1);
    }
    // In the Future Age the Evolve button trains veterans instead (new units get +25% per level).
    function buyVeteran(side) {
      if (side.age < 4 || side.vet >= VET_MAX) return false;
      var c = vetCost(side);
      if (side.gold < c) {
        if (!side.team) {
          sfx('error');
          toast('Need ' + (c - Math.floor(side.gold)) + ' more gold');
        }
        return false;
      }
      side.gold -= c;
      side.vet++;
      if (!side.team) {
        sfx('levelup');
        toast('Veterans level ' + side.vet + ': new units +' + side.vet * 25 + '%');
      }
      return true;
    }
    function canEvolve(side) {
      return side.age < 4 && side.xp >= XP_NEED[side.age + 1];
    }
    function evolve(side) {
      if (!canEvolve(side)) {
        if (!side.team) {
          sfx('error');
          toast(side.age >= 4 ? 'Already in the final age' : 'Need ' + Math.ceil(XP_NEED[side.age + 1] - side.xp) + ' more XP');
        }
        return false;
      }
      var frac = side.hp / side.maxHp;
      side.age++;
      side.maxHp = BASE_HP[side.age];
      side.hp = Math.max(1, Math.round(side.maxHp * Math.min(1, frac + 0.15)));
      var bx = side.team ? E_FRONT + BASE_W / 2 : BASE_W / 2;
      for (var k = 0; k < 30; k++) puff(bx + (Math.random() - 0.5) * 120, Math.random() * 120, side.team ? '#fca5a5' : '#c4b5fd', 1.4);
      if (!side.team) {
        sfx('levelup');
        showBanner(AGES[side.age].name + '!');
      } else {
        toast('The rival reached the ' + AGES[side.age].name);
      }
      return true;
    }
    function useSpecial(side) {
      if (side.specialCd > 0) {
        if (!side.team) {
          sfx('error');
          toast('Ready in ' + Math.ceil(side.specialCd) + ' s');
        }
        return false;
      }
      side.specialCd = SPECIAL_CD;
      var sp = AGES[side.age].special;
      // strike zone: from the side's own front line forward
      var front = side.team ? E_FRONT : P_FRONT;
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (u.team !== side.team) continue;
        if (side.dir > 0 ? u.x > front : u.x < front) front = u.x;
      }
      var x0 = front + side.dir * 40;
      for (var k = 0; k < 14; k++) {
        var tx = x0 + side.dir * (k / 13) * 520 + (Math.random() - 0.5) * 40;
        falls.push({
          team: side.team, look: sp.look, x: tx - side.dir * (sp.look === 'laser' ? 0 : 160), y: 420 + Math.random() * 80, tx: tx,
          t: -k * 0.13, d: sp.look === 'laser' ? 0.35 : 0.8, dmg: sp.dmg, hit: false,
        });
      }
      if (sp.look === 'bomb') falls.plane = { team: side.team, x: x0 - side.dir * 300, t: 0 };
      sfx('boost');
      if (!side.team) toast(sp.name + '!');
      else toast('Incoming: rival ' + sp.name + '!');
      return true;
    }

    /* ---------------- spawning & combat ---------------- */
    function spawnUnit(side, q) {
      var st = unitStats(q.age, q.role, q.vet);
      var u = {
        id: ++uid, team: side.team, dir: side.dir, role: q.role, age: q.age, x: side.team ? E_FRONT - 10 : P_FRONT + 10,
        y: st.fly ? FLY_H : 0, hp: st.hp, maxHp: st.hp, st: st, cd: 0.3 + Math.random() * 0.3, walk: Math.random() * TAU,
        atk: 0, moving: true, flash: 0, dead: false,
      };
      units.push(u);
      for (var k = 0; k < 6; k++) puff(u.x, 8, 'rgba(230,220,200,.9)', 0.7);
    }

    function damageUnit(u, dmg, src) {
      if (u.dead) return;
      var d = dmg;
      if (u.st.armor && src && (src.role === 0 || src.role === 1)) d *= 1 - u.st.armor;
      if (u.st.fly && src && src.role === 1) d *= 1.3;
      u.hp -= d;
      u.flash = 0.12;
      if (u.hp <= 0) killUnit(u);
    }
    function killUnit(u) {
      u.dead = true;
      var foe = sides[1 - u.team];
      var gold = Math.round(u.st.cost * 0.75);
      foe.gold += gold * (foe.team ? D.gold : 1);
      foe.xp += u.st.xp * (foe.team ? D.xp : 1);
      if (!foe.team) {
        kills++;
        texts.push({ x: u.x, y: u.y + 40, txt: '+' + gold, col: '#fde047', t: 0 });
      }
      for (var k = 0; k < 10; k++) puff(u.x, u.y + 14, k % 3 ? 'rgba(235,228,214,.95)' : '#fde68a', 1.1);
      for (var s = 0; s < 3; s++) parts.push({ x: u.x, y: u.y + 30, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 40, t: 0, d: 0.7, col: '#fde047', star: true, s: 4 });
      if (time - sndHit > 0.06) {
        sndHit = time;
        sfx('pop');
      }
    }
    function damageBase(side, dmg) {
      side.hp -= dmg;
      side.hitT = 0.15;
      if (!side.team) shake = Math.max(shake, 0.12);
      var bx = side.team ? E_FRONT + 10 : P_FRONT - 10;
      if (Math.random() < 0.5) puff(bx, 20 + Math.random() * 60, 'rgba(160,150,140,.9)', 1);
      if (side.hp <= 0 && state === 'play') {
        side.hp = 0;
        endMatch(side.team === 1);
      }
    }

    function puff(x, y, col, sp) {
      if (parts.length > 260) return;
      var a = Math.random() * TAU;
      var v = (20 + Math.random() * 50) * (sp || 1);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 + 20, t: 0, d: 0.45 + Math.random() * 0.35, col: col, s: 3 + Math.random() * 4 });
    }

    // Front-most enemy ground unit ahead of x for team, plus optional flyer search
    function findTarget(u) {
      var best = null;
      var bd = Infinity;
      var st = u.st;
      for (var i = 0; i < units.length; i++) {
        var e = units[i];
        if (e.team === u.team || e.dead) continue;
        if (e.st.fly && !(u.role === 1 || u.st.fly)) continue; // only ranged and flyers can hit flyers
        if (u.st.fly && e.st.fly) continue; // flyers bomb ground targets
        var dx = (e.x - u.x) * u.dir;
        if (dx < -12) continue;
        var reach = st.range + (e.st.w + st.w) * 0.5;
        if (u.st.fly) reach = st.range + e.st.w * 0.5;
        if (dx > reach) continue;
        var dd = dx + (e.st.fly ? 25 : 0);
        if (dd < bd) {
          bd = dd;
          best = e;
        }
      }
      return best;
    }

    function fireAt(u, tgt, toBase) {
      var st = u.st;
      u.atk = 0.001;
      if (u.role === 1) {
        // ranged projectile
        var tx = toBase ? toBase.front + u.dir * 30 : tgt.x;
        var ty = toBase ? 50 : tgt.y + (tgt.st.fly ? 0 : 18);
        projs.push({ team: u.team, x: u.x + u.dir * 10, y: u.y + 24, tx: tx, ty: ty, tgt: tgt, base: toBase, dmg: st.dmg, t: 0, d: Math.max(0.12, Math.abs(tx - u.x) / (u.age >= 3 ? 900 : 380)), look: ['rock', 'bolt', 'shot', 'shot', 'laser'][u.age], src: u, arc: u.age < 2 });
        if (Math.random() < 0.6) sfx(u.age >= 2 ? 'shoot' : { f: 500, f2: 300, d: 0.05, type: 'triangle', v: 0.04 });
      } else if (u.st.fly) {
        projs.push({ team: u.team, x: u.x, y: u.y - 4, tx: u.x + u.dir * 6, ty: toBase ? 40 : 10, tgt: tgt, base: toBase, dmg: st.dmg, t: 0, d: 0.45, look: 'drop', src: u, arc: false, splash: 30 });
      } else {
        // melee / heavy hit lands mid-swing
        u.pending = { tgt: tgt, base: toBase, t: 0.18 };
      }
    }

    /* ---------------- AI ---------------- */
    function aiStep(dt) {
      var ai = sides[1];
      var me = sides[0];
      // passive XP keeps the rival evolving; difficulty scales it
      aiThink -= dt;
      if (canEvolve(ai)) {
        // evolving is free; easier rivals hesitate longer before doing it
        ai.evoWait = (ai.evoWait || 0) + dt;
        if (ai.evoWait > D.evoWait || ai.hp < ai.maxHp * 0.5) {
          ai.evoWait = 0;
          evolve(ai);
        }
      }
      if (aiThink > 0) return;
      aiThink = (0.7 + Math.random() * 0.6) * D.think;
      var mine = { fly: 0, heavy: 0, n: 0, near: 0 };
      var theirs = 0;
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (u.team === 0) {
          mine.n++;
          if (u.st.fly) mine.fly++;
          if (u.role === 2) mine.heavy++;
          if (u.x > E_FRONT - 650) mine.near++;
        } else theirs++;
      }
      // special when the player pushes close
      if (ai.specialCd <= 0 && (mine.near >= 4 || (mine.near >= 2 && ai.hp < ai.maxHp * 0.5))) useSpecial(ai);
      // turrets once it can afford them comfortably
      var tc = turretCost(ai.age);
      if (ai.age >= 1 && ai.gold > tc * 1.6 && (ai.turrets.indexOf(null) > -1 || ai.turrets.some(function (t) { return t && t.age < ai.age; }))) {
        buyTurret(ai);
        return;
      }
      if (ai.age >= 4 && ai.gold > vetCost(ai) * 1.3 && buyVeteran(ai)) return;
      if (ai.queue.length >= 2) return;
      var w = [0.42, 0.3, 0.14, 0.14];
      if (mine.fly >= 2) w[1] += 0.35;
      if (mine.heavy >= 2) w[2] += 0.2;
      if (theirs < mine.n - 3) w[0] += 0.2;
      var sum = w[0] + w[1] + w[2] + w[3];
      var r = Math.random() * sum;
      var role = 0;
      for (var k = 0; k < 4; k++) {
        r -= w[k];
        if (r <= 0) {
          role = k;
          break;
        }
      }
      var st = unitStats(ai.age, role);
      // save up for pricier units sometimes instead of always spamming the cheapest
      if (ai.gold >= st.cost) train(ai, role);
      else if (ai.gold >= unitStats(ai.age, 0).cost && (mine.near >= 2 || Math.random() < 0.35)) train(ai, 0);
      void me;
    }

    /* ---------------- simulation ---------------- */
    function step(dt) {
      time += dt;
      matchT += dt;
      for (var si = 0; si < 2; si++) {
        var sd = sides[si];
        var inc = 2.5 * CM[sd.age] * dt * (si ? D.gold : 1);
        sd.gold += inc;
        sd.xp += 2 * CM[sd.age] * dt * (si ? D.xp : 1);
        if (sd.specialCd > 0) sd.specialCd = Math.max(0, sd.specialCd - dt);
        if (sd.hitT > 0) sd.hitT -= dt;
        // training
        if (sd.queue.length) {
          sd.queue[0].t -= dt;
          if (sd.queue[0].t <= 0) spawnUnit(sd, sd.queue.shift());
        }
        // turrets
        for (var ti = 0; ti < 2; ti++) {
          var tu = sd.turrets[ti];
          if (!tu) continue;
          tu.cd -= dt;
          if (tu.kick > 0) tu.kick -= dt * 4;
          var tx0 = sd.team ? E_FRONT + 40 + ti * 50 : P_FRONT - 40 - ti * 50;
          var ty0 = MOUNT[sd.age][ti] + 10;
          var best = null;
          var bd = Infinity;
          for (var ui2 = 0; ui2 < units.length; ui2++) {
            var e = units[ui2];
            if (e.team === sd.team || e.dead) continue;
            var dx = (e.x - tx0) * sd.dir;
            if (dx < 0 || dx > TURRET_RANGE) continue;
            if (dx < bd) {
              bd = dx;
              best = e;
            }
          }
          if (best) {
            tu.ang = Math.atan2(-(best.y + 15 - ty0), (best.x - tx0));
            if (tu.cd <= 0) {
              var T = AGES[tu.age].turret;
              tu.cd = T.rate;
              tu.kick = 1;
              projs.push({ team: sd.team, x: tx0, y: ty0, tx: best.x, ty: best.y + 15, tgt: best, dmg: T.dmg, t: 0, d: Math.max(0.12, bd / 700), look: ['rock', 'bolt', 'ball', 'shot', 'laser'][tu.age], src: null, arc: tu.age === 0 || tu.age === 2 });
              if (Math.random() < 0.5) sfx('shoot');
            }
          }
        }
      }

      // units: sort per team by progress so blocking is stable
      units.sort(function (a, b) {
        return a.team - b.team || (b.x - a.x) * a.dir;
      });
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (u.dead) continue;
        if (u.flash > 0) u.flash -= dt;
        if (u.atk > 0) {
          u.atk += dt * 3;
          if (u.atk >= 1) u.atk = 0;
        }
        if (u.pending) {
          u.pending.t -= dt;
          if (u.pending.t <= 0) {
            var pd = u.pending;
            u.pending = null;
            if (pd.base) damageBase(pd.base, u.st.dmg);
            else if (pd.tgt && !pd.tgt.dead) {
              damageUnit(pd.tgt, u.st.dmg, u);
              for (var hk = 0; hk < 3; hk++) puff(pd.tgt.x - u.dir * 6, 20, '#fff7d6', 0.6);
              if (time - sndHit > 0.05) {
                sndHit = time;
                sfx({ f: 160 + Math.random() * 60, f2: 90, d: 0.06, type: 'square', v: 0.04 });
              }
            }
          }
        }
        u.cd -= dt;
        var tgt = findTarget(u);
        var foe = sides[1 - u.team];
        var baseDx = (foe.front - u.x) * u.dir;
        var atBase = !tgt && baseDx <= u.st.range + u.st.w * 0.5 + (u.st.fly ? 10 : 0);
        var want = u.st.speed;
        if (tgt || atBase) {
          // melee/heavy need contact; ranged stops as soon as it is in range
          want = 0;
          if (u.cd <= 0) {
            u.cd = u.st.rate;
            fireAt(u, tgt, atBase ? foe : null);
          }
        }
        if (want > 0 && !u.st.fly) {
          // blocked by a friendly ahead or by an enemy body
          for (var j = i - 1; j >= 0; j--) {
            var a = units[j];
            if (a.team !== u.team || a.dead || a.st.fly) continue;
            var gap = (a.x - u.x) * u.dir;
            if (gap >= 0 && gap < (a.st.w + u.st.w) * 0.5 + 4) want = 0;
            break;
          }
          for (var k = 0; k < units.length && want > 0; k++) {
            var e2 = units[k];
            if (e2.team === u.team || e2.dead || e2.st.fly) continue;
            var gap2 = (e2.x - u.x) * u.dir;
            if (gap2 >= -4 && gap2 < (e2.st.w + u.st.w) * 0.5) want = 0;
          }
          if (baseDx <= u.st.w * 0.5) want = 0;
        }
        u.moving = want > 0;
        if (u.moving) {
          u.x += u.dir * want * dt;
          u.walk += dt * (u.role === 2 ? 5 : 9);
        }
        if (u.st.fly) u.walk += dt;
      }
      var w = 0;
      for (var c = 0; c < units.length; c++) if (!units[c].dead) units[w++] = units[c];
      units.length = w;

      // projectiles
      w = 0;
      for (var p = 0; p < projs.length; p++) {
        var pr = projs[p];
        pr.t += dt;
        if (pr.tgt && !pr.tgt.dead) {
          pr.tx = pr.tgt.x;
          pr.ty = pr.tgt.y + (pr.tgt.st.fly ? 0 : 18);
        }
        if (pr.t >= pr.d) {
          if (pr.base) damageBase(pr.base, pr.dmg);
          else if (pr.splash) {
            for (var s2 = 0; s2 < units.length; s2++) {
              var e3 = units[s2];
              if (e3.team === pr.team || e3.dead || e3.st.fly) continue;
              if (Math.abs(e3.x - pr.tx) < pr.splash) damageUnit(e3, pr.dmg, pr.src);
            }
            for (var ex = 0; ex < 6; ex++) puff(pr.tx, 6, ex % 2 ? '#fb923c' : 'rgba(200,190,170,.9)', 1);
          } else if (pr.tgt && !pr.tgt.dead) damageUnit(pr.tgt, pr.dmg, pr.src);
          continue;
        }
        projs[w++] = pr;
      }
      projs.length = w;

      // specials (falling objects)
      w = 0;
      for (var f = 0; f < falls.length; f++) {
        var fo = falls[f];
        fo.t += dt;
        if (fo.t >= fo.d && !fo.hit) {
          fo.hit = true;
          for (var s3 = 0; s3 < units.length; s3++) {
            var e4 = units[s3];
            if (e4.team === fo.team || e4.dead) continue;
            if (Math.abs(e4.x - fo.tx) < 48) damageUnit(e4, fo.dmg, null);
          }
          for (var bx = 0; bx < 8; bx++) puff(fo.tx, 6, bx % 2 ? '#f97316' : 'rgba(120,110,100,.9)', 1.6);
          shake = Math.max(shake, 0.18);
          if (time - sndHit > 0.08) {
            sndHit = time;
            sfx({ f: 120, f2: 40, d: 0.25, type: 'sine', v: 0.12 });
          }
        }
        if (fo.t < fo.d + 0.4) falls[w++] = fo;
      }
      falls.length = w;
      if (falls.plane) {
        falls.plane.t += dt;
        if (falls.plane.t > 3) falls.plane = null;
      }

      aiStep(dt);
    }

    function updateFx(dt) {
      var w = 0;
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i];
        q.t += dt;
        if (q.t >= q.d) continue;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy -= (q.star ? 160 : 30) * dt;
        q.vx *= 0.96;
        parts[w++] = q;
      }
      parts.length = w;
      w = 0;
      for (var j = 0; j < texts.length; j++) {
        texts[j].t += dt;
        if (texts[j].t < 1) texts[w++] = texts[j];
      }
      texts.length = w;
      if (shake > 0) shake = Math.max(0, shake - dt);
      if (banner) {
        banner.t += dt;
        if (banner.t > 2.2) banner = null;
      }
    }

    /* ---------------- camera ---------------- */
    function clampCam() {
      if (viewW >= WORLD) camX = (WORLD - viewW) / 2;
      else camX = clamp(camX, 0, WORLD - viewW);
    }
    function frontLine() {
      var pf = P_FRONT;
      var ef = E_FRONT;
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (u.team === 0) pf = Math.max(pf, u.x);
        else ef = Math.min(ef, u.x);
      }
      // centre on the clash, but never lose sight of your own leading unit
      return Math.min((pf + ef) / 2, pf + viewW * 0.3);
    }
    function setFollow(on) {
      follow = on;
      bFollow.classList.toggle('as-on', on);
    }

    /* ================================================================ */
    /* Rendering                                                         */
    /* ================================================================ */
    var hills = [];
    (function () {
      var r = 7;
      function rnd() {
        r = (r * 16807) % 2147483647;
        return r / 2147483647;
      }
      for (var i = 0; i <= 40; i++) hills.push([rnd(), rnd()]);
    })();

    function sx(x) {
      return (x - camX) * S;
    }

    function render() {
      var dpr = view.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var age = sides ? sides[0].age : 0;
      var A = AGES[age];
      var avail = H - barH;
      var gr = g.createLinearGradient(0, 0, 0, avail);
      gr.addColorStop(0, A.sky[0]);
      gr.addColorStop(1, A.sky[1]);
      g.fillStyle = gr;
      g.fillRect(0, 0, W, avail);
      var shx = shake > 0 ? (Math.random() - 0.5) * shake * 30 : 0;
      var shy = shake > 0 ? (Math.random() - 0.5) * shake * 20 : 0;
      // sun / moon
      g.fillStyle = age === 4 ? 'rgba(236,233,255,.85)' : 'rgba(255,248,220,.85)';
      g.beginPath();
      g.arc(W * 0.78 - camX * S * 0.05, groundY * 0.28, Math.max(14, 26 * S), 0, TAU);
      g.fill();
      if (age === 4) {
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (var st = 0; st < 30; st++) g.fillRect((hills[st][0] * W * 1.3 - camX * S * 0.03) % W, hills[st][1] * groundY * 0.6, 1.5, 1.5);
      }
      // parallax hills
      drawHills(0.25, A.far, groundY - 150 * S, 110 * S);
      drawHills(0.55, A.mid, groundY - 60 * S, 70 * S);
      // ground
      g.fillStyle = A.grass;
      g.fillRect(0, groundY + shy - 2, W, 6 * S + 2);
      g.fillStyle = A.ground;
      g.fillRect(0, groundY + shy + 6 * S, W, avail - groundY);
      // pebbles on the road
      g.fillStyle = 'rgba(0,0,0,.12)';
      for (var pb = 0; pb < 40; pb++) {
        var px = ((hills[pb % 41][0] * WORLD * 1.7 + pb * 97) % WORLD - camX) * S;
        if (px < -10 || px > W + 10) continue;
        g.fillRect(px, groundY + shy + 10 * S + hills[pb % 41][1] * 10 * S, 3 * S, 2 * S);
      }
      if (!sides) return;

      // world transform: x right, y up
      g.setTransform(dpr * S, 0, 0, dpr * S, dpr * (-camX * S + shx), dpr * (groundY + shy));
      // bases
      drawSideBase(sides[0]);
      drawSideBase(sides[1]);
      // units (ground first, flyers on top)
      for (var pass = 0; pass < 2; pass++) {
        for (var i = 0; i < units.length; i++) {
          var u = units[i];
          if (u.st.fly !== (pass === 1)) continue;
          if (u.x < camX - 80 || u.x > camX + viewW + 80) continue;
          g.save();
          g.translate(u.x, -u.y);
          g.scale(u.dir, 1);
          var atk = u.atk > 0 ? u.atk : 0;
          if (u.role === 2) drawHeavy(g, u.age, u.team, u.walk, Math.sin(atk * Math.PI));
          else if (u.st.fly) drawFlyer(g, u.age, u.team, time + u.id, Math.sin(atk * Math.PI));
          else drawSoldier(g, u.age, u.role === 1 ? 'ranged' : 'melee', u.team, u.moving ? u.walk : 0, u.role === 0 ? Math.sin(atk * Math.PI) : atk);
          if (u.flash > 0) {
            g.globalAlpha = 0.5;
            g.fillStyle = '#fff';
            g.fillRect(-u.st.w / 2, u.role === 2 ? -50 : -38, u.st.w, u.role === 2 ? 50 : 38);
            g.globalAlpha = 1;
          }
          g.restore();
          if (u.hp < u.maxHp) {
            var hy = -u.y - (u.role === 2 ? 58 : u.st.fly ? 40 : 46);
            g.fillStyle = 'rgba(0,0,0,.5)';
            g.fillRect(u.x - 11, hy, 22, 3.5);
            g.fillStyle = u.team ? '#f87171' : '#60a5fa';
            g.fillRect(u.x - 10.5, hy + 0.5, 21 * Math.max(0, u.hp / u.maxHp), 2.5);
          }
        }
      }
      // projectiles
      for (var p = 0; p < projs.length; p++) drawProj(projs[p]);
      // specials
      for (var f = 0; f < falls.length; f++) drawFall(falls[f]);
      if (falls.plane) {
        var pl = falls.plane;
        var pdir = pl.team ? -1 : 1;
        var plx = pl.x + pdir * pl.t * 400;
        g.save();
        g.translate(plx, -330);
        g.scale(pdir, 1);
        g.fillStyle = '#4b5563';
        g.beginPath();
        g.ellipse(0, 0, 34, 7, 0, 0, TAU);
        g.fill();
        g.fillRect(-6, -2, 14, 26);
        g.fillRect(-6, -24, 14, 22);
        g.fillRect(-34, -12, 8, 12);
        g.fillStyle = TEAM[pl.team].main;
        g.fillRect(-30, -10, 5, 6);
        g.restore();
      }
      // particles
      for (var q = 0; q < parts.length; q++) {
        var pp = parts[q];
        g.globalAlpha = 1 - pp.t / pp.d;
        g.fillStyle = pp.col;
        if (pp.star) {
          g.save();
          g.translate(pp.x, -pp.y);
          g.rotate(pp.t * 8);
          g.fillRect(-pp.s / 2, -pp.s / 2, pp.s, pp.s);
          g.restore();
        } else {
          g.beginPath();
          g.arc(pp.x, -pp.y, pp.s * (1 + pp.t), 0, TAU);
          g.fill();
        }
      }
      g.globalAlpha = 1;

      // screen-space text
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.textAlign = 'center';
      g.font = '900 ' + Math.round(clamp(11 * S, 11, 20)) + 'px system-ui, sans-serif';
      for (var t = 0; t < texts.length; t++) {
        var tx = texts[t];
        g.globalAlpha = 1 - tx.t;
        g.fillStyle = 'rgba(0,0,0,.5)';
        g.fillText(tx.txt, sx(tx.x) + 1, groundY - (tx.y + tx.t * 30) * S + 1);
        g.fillStyle = tx.col;
        g.fillText(tx.txt, sx(tx.x), groundY - (tx.y + tx.t * 30) * S);
      }
      g.globalAlpha = 1;
      // base HP bars on screen edges when bases are off-screen
      drawBaseBars();
      if (banner) {
        var bt = banner.t;
        var a = bt < 0.3 ? bt / 0.3 : bt > 1.8 ? (2.2 - bt) / 0.4 : 1;
        g.globalAlpha = clamp(a, 0, 1);
        var fs = Math.round(clamp(W / 14, 22, 54));
        g.font = '900 ' + fs + 'px system-ui, sans-serif';
        g.fillStyle = 'rgba(0,0,0,.45)';
        g.fillText(banner.txt, W / 2 + 2, avail * 0.42 + 2);
        g.fillStyle = '#fde047';
        g.fillText(banner.txt, W / 2, avail * 0.42);
        g.globalAlpha = 1;
      }
      drawMini();
    }

    function drawHills(par, col, baseY, amp) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, groundY + 2);
      var span = W / 8;
      var off = (camX * S * par) % span;
      var idx = Math.floor((camX * S * par) / span);
      for (var i = -1; i <= 9; i++) {
        var h = hills[((idx + i) % 40 + 40) % 40];
        g.lineTo(i * span - off, baseY + (1 - h[0]) * amp * 0.6);
      }
      g.lineTo(W, groundY + 2);
      g.closePath();
      g.fill();
    }

    function drawSideBase(sd) {
      g.save();
      if (sd.team) {
        g.translate(WORLD, 0);
        g.scale(-1, 1);
      }
      if (sd.hitT > 0) g.translate((Math.random() - 0.5) * 3, 0);
      drawBase(g, sd.age, sd.team, sd.hp / sd.maxHp, time);
      // turret mounts
      for (var i = 0; i < 2; i++) {
        var tu = sd.turrets[i];
        var mx = BASE_W - 40 - i * 50;
        if (!tu) continue;
        g.save();
        g.translate(mx, -MOUNT[sd.age][i]);
        drawTurret(g, tu.age, sd.team, sd.team ? Math.PI - tu.ang : tu.ang, tu.kick > 0 ? tu.kick : 0);
        g.restore();
      }
      g.restore();
    }

    function drawBaseBars() {
      var bw = Math.min(150, W * 0.26);
      var y = (top.offsetHeight || 40) + 20;
      for (var s = 0; s < 2; s++) {
        var sd = sides[s];
        var x = s ? W - bw - 10 : 10;
        g.fillStyle = 'rgba(5,6,14,.6)';
        g.fillRect(x, y, bw, 16);
        g.fillStyle = s ? '#ef4444' : '#3b82f6';
        g.fillRect(x + 2, y + 2, (bw - 4) * Math.max(0, sd.hp / sd.maxHp), 12);
        g.fillStyle = '#fff';
        g.font = '800 10px system-ui, sans-serif';
        g.textAlign = s ? 'right' : 'left';
        g.fillText((s ? 'Rival ' : 'You ') + AGES[sd.age].short + ' · ' + Math.ceil(sd.hp), s ? x + bw - 5 : x + 5, y + 12);
      }
      g.textAlign = 'center';
    }

    function drawProj(pr) {
      var u = pr.t / pr.d;
      var x = lerp(pr.x, pr.tx, u);
      var y = lerp(pr.y, pr.ty, u) + (pr.arc ? Math.sin(u * Math.PI) * Math.min(80, Math.abs(pr.tx - pr.x) * 0.25) : 0);
      var dir = pr.tx >= pr.x ? 1 : -1;
      switch (pr.look) {
        case 'rock':
          g.fillStyle = '#78716c';
          g.beginPath();
          g.arc(x, -y, 3.5, 0, TAU);
          g.fill();
          break;
        case 'bolt':
          g.strokeStyle = '#5b3313';
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(x - dir * 9, -y);
          g.lineTo(x, -y);
          g.stroke();
          break;
        case 'ball':
          g.fillStyle = '#1f2937';
          g.beginPath();
          g.arc(x, -y, 4.5, 0, TAU);
          g.fill();
          break;
        case 'shot':
          g.strokeStyle = '#fde68a';
          g.lineWidth = 1.8;
          g.beginPath();
          g.moveTo(x - dir * 10, -y);
          g.lineTo(x, -y);
          g.stroke();
          break;
        case 'laser':
          g.strokeStyle = TEAM[pr.team].light;
          g.lineWidth = 2.4;
          g.beginPath();
          g.moveTo(x - dir * 16, -y);
          g.lineTo(x, -y);
          g.stroke();
          break;
        case 'drop':
          g.fillStyle = '#292524';
          g.beginPath();
          g.ellipse(x, -y, 2.5, 4, 0, 0, TAU);
          g.fill();
          break;
      }
    }

    function drawFall(fo) {
      if (fo.t < 0) return;
      var u = clamp(fo.t / fo.d, 0, 1);
      if (fo.look === 'laser') {
        if (fo.t > fo.d + 0.25) return;
        g.globalAlpha = fo.t < fo.d ? u : 1 - (fo.t - fo.d) / 0.25;
        g.fillStyle = TEAM[fo.team].light;
        g.fillRect(fo.tx - (fo.t < fo.d ? 2 : 10), -600, fo.t < fo.d ? 4 : 20, 600);
        g.globalAlpha = 1;
        return;
      }
      if (fo.hit) {
        var k = (fo.t - fo.d) / 0.4;
        g.globalAlpha = 1 - k;
        g.fillStyle = '#fb923c';
        g.beginPath();
        g.arc(fo.tx, -6, 20 + k * 30, 0, TAU);
        g.fill();
        g.globalAlpha = 1;
        return;
      }
      var x = lerp(fo.x, fo.tx, u);
      var y = lerp(fo.y, 0, u * u);
      switch (fo.look) {
        case 'rock':
          g.fillStyle = 'rgba(253,186,116,.5)';
          g.beginPath();
          g.moveTo(x, -y);
          g.lineTo(x - (fo.tx - fo.x) * 0.15, -y - 40);
          g.lineTo(x + 6, -y);
          g.fill();
          g.fillStyle = '#57534e';
          g.beginPath();
          g.arc(x, -y, 8, 0, TAU);
          g.fill();
          g.fillStyle = '#f97316';
          g.beginPath();
          g.arc(x - 2, -y + 2, 4, 0, TAU);
          g.fill();
          break;
        case 'arrow':
          g.strokeStyle = '#3f2a14';
          g.lineWidth = 2;
          for (var a = -1; a <= 1; a++) {
            g.beginPath();
            g.moveTo(x + a * 10, -y);
            g.lineTo(x + a * 10 - (fo.tx - fo.x) * 0.06, -y - 18);
            g.stroke();
          }
          break;
        case 'ball':
          g.fillStyle = '#111827';
          g.beginPath();
          g.arc(x, -y, 7, 0, TAU);
          g.fill();
          break;
        case 'bomb':
          g.fillStyle = '#374151';
          g.beginPath();
          g.ellipse(x, -y, 4.5, 8, 0, 0, TAU);
          g.fill();
          break;
      }
    }

    function drawMini() {
      var c = miniCv.getContext('2d');
      var w = miniCv.width;
      var h = miniCv.height;
      c.clearRect(0, 0, w, h);
      var k = w / WORLD;
      c.fillStyle = 'rgba(59,130,246,.9)';
      c.fillRect(0, 0, BASE_W * k, h);
      c.fillStyle = 'rgba(239,68,68,.9)';
      c.fillRect(E_FRONT * k, 0, BASE_W * k, h);
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        c.fillStyle = u.team ? '#fca5a5' : '#bfdbfe';
        c.fillRect(u.x * k - 1, u.st.fly ? h * 0.15 : h * 0.55, 2.5 * (view.dpr || 1), h * 0.3);
      }
      c.strokeStyle = 'rgba(255,255,255,.9)';
      c.lineWidth = 1.5 * (view.dpr || 1);
      c.strokeRect(Math.max(0, camX * k), 1, Math.min(w, viewW * k), h - 2);
    }

    /* ================================================================ */
    /* HUD                                                               */
    /* ================================================================ */
    function refreshIcons() {
      var age = sides[0].age;
      if (iconAge === age) return;
      iconAge = age;
      for (var r = 0; r < 4; r++) {
        var b = unitBtns[r];
        b.innerHTML = '';
        var cv = document.createElement('canvas');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = 34 * dpr;
        cv.height = 34 * dpr;
        var c = cv.getContext('2d');
        var sc = r === 2 ? 0.52 : r === 3 ? 0.7 : 0.8;
        c.setTransform(dpr * sc, 0, 0, dpr * sc, 17 * dpr, (r === 3 ? 24 : 31) * dpr);
        if (r === 2) drawHeavy(c, age, 0, 0.6, 0);
        else if (r === 3) drawFlyer(c, age, 0, 0, 0);
        else drawSoldier(c, age, r === 1 ? 'ranged' : 'melee', 0, 0.5, 0);
        b.appendChild(cv);
        b.appendChild(ui.el('span', 'as-nm', AGES[age].units[r]));
        b.appendChild(ui.el('span', 'as-c', ''));
        if (!ctx.isTouch) b.appendChild(ui.el('span', 'as-k', String(r + 1)));
        b.title = AGES[age].units[r] + ' — ' + ['fast melee fighter', 'shoots from range, hits flyers', 'armored heavy hitter', 'flies over the line, bombs ground units'][r];
      }
      hudKey = '';
    }

    function updateHud() {
      if (!sides) return;
      var me = sides[0];
      refreshIcons();
      var gold = Math.floor(me.gold);
      var need = me.age < 4 ? XP_NEED[me.age + 1] : 0;
      var key = gold + '|' + Math.floor(me.xp) + '|' + me.age + '|' + me.vet + '|' + Math.ceil(me.specialCd) + '|' + me.queue.length + '|' + me.turrets.map(function (t) { return t ? t.age : -1; }).join(',') + '|' + state;
      if (key !== hudKey) {
        hudKey = key;
        goldPill.innerHTML = '<span style="color:#fde047">●</span> ' + IGAME.fmt(gold);
        var frac = need ? clamp((me.xp - XP_NEED[me.age]) / (need - XP_NEED[me.age]), 0, 1) : 1;
        xpBox.firstChild.style.width = frac * 100 + '%';
        xpBox.lastChild.textContent = AGES[me.age].short + ' · ' + (need ? 'XP ' + IGAME.fmt(Math.floor(me.xp)) + '/' + IGAME.fmt(need) : 'Final age');
        for (var r = 0; r < 4; r++) {
          var st = unitStats(me.age, r);
          var b = unitBtns[r];
          b.querySelector('.as-c').textContent = '● ' + st.cost;
          b.classList.toggle('as-poor', me.gold < st.cost);
          b.setAttribute('aria-label', 'Train ' + AGES[me.age].units[r] + ' for ' + st.cost + ' gold');
        }
        var tc = turretCost(me.age);
        var full = me.turrets.indexOf(null) < 0;
        var upToDate = full && me.turrets.every(function (t) { return t.age === me.age; });
        bTurret.innerHTML = '<span class="as-ico">🏹</span><span class="as-nm">' + (upToDate ? 'Turrets full' : (full ? 'Upgrade ' : '') + AGES[me.age].turret.name) + '</span><span class="as-c">' + (upToDate ? '✓' : '● ' + tc) + '</span>' + (ctx.isTouch ? '' : '<span class="as-k">T</span>');
        bTurret.classList.toggle('as-poor', !upToDate && me.gold < tc);
        bTurret.title = AGES[me.age].turret.name + ': a base turret that fires at anything in range (2 slots)';
        var sp = AGES[me.age].special;
        bSpecial.innerHTML = '<span class="as-ico">☄️</span><span class="as-nm">' + sp.name + '</span><span class="as-c">' + (me.specialCd > 0 ? Math.ceil(me.specialCd) + 's' : 'Ready') + '</span><span class="as-cd"></span>' + (ctx.isTouch ? '' : '<span class="as-k">Q</span>');
        bSpecial.classList.toggle('as-ready', me.specialCd <= 0);
        bSpecial.querySelector('.as-cd').style.width = (me.specialCd > 0 ? (1 - me.specialCd / SPECIAL_CD) * 100 : 0) + '%';
        bSpecial.title = sp.name + ': rains damage ahead of your front line (Q)';
        var ready = canEvolve(me);
        if (me.age >= 4) {
          var vmax = me.vet >= VET_MAX;
          bEvolve.innerHTML = '<span class="as-ico">🎖️</span><span class="as-nm">Veterans ' + me.vet + '/' + VET_MAX + '</span><span class="as-c">' + (vmax ? '★' : '● ' + IGAME.fmt(vetCost(me))) + '</span>' + (ctx.isTouch ? '' : '<span class="as-k">E</span>');
          bEvolve.classList.toggle('as-ready', false);
          bEvolve.classList.toggle('as-poor', !vmax && me.gold < vetCost(me));
          bEvolve.disabled = vmax;
          bEvolve.title = 'Veteran Training (E): new units get +25% health and damage per level';
        } else {
          bEvolve.innerHTML = '<span class="as-ico">⏫</span><span class="as-nm">Evolve</span><span class="as-c">' + (ready ? AGES[me.age + 1].short : Math.floor(frac * 100) + '%') + '</span>' + (ctx.isTouch ? '' : '<span class="as-k">E</span>');
          bEvolve.classList.toggle('as-ready', ready);
          bEvolve.classList.remove('as-poor');
          bEvolve.disabled = false;
          bEvolve.title = 'Evolve to the ' + AGES[me.age + 1].name + ' (E) — needs ' + XP_NEED[me.age + 1] + ' XP';
        }
        // queue
        var qh = '';
        for (var q = 0; q < me.queue.length; q++) qh += '<b class="' + (q ? '' : 'as-q0') + '"></b>';
        queueEl.innerHTML = qh;
      }
      if (me.queue.length) {
        var q0 = queueEl.firstChild;
        if (q0) {
          var tot = ROLES[me.queue[0].role].train * TRAIN_M[me.queue[0].age];
          q0.style.setProperty('--p', Math.round((1 - me.queue[0].t / tot) * 100) + '%');
        }
      }
    }

    var toastEnds = [];
    function toast(msg, ms) {
      var now = Date.now();
      toastEnds = toastEnds.filter(function (e) {
        return e > now;
      });
      if (toastEnds.length > 2) return;
      toastEnds.push(now + (ms || 1300) + 400);
      ui.toast(root, msg, ms || 1300);
    }
    function showBanner(txt) {
      banner = { txt: txt, t: 0 };
    }

    /* ================================================================ */
    /* Flow                                                              */
    /* ================================================================ */
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }
    function startMatch(di) {
      closeOverlay();
      diffIdx = di;
      D = DIFFS[di];
      store.set('diff', di);
      sides = [newSide(0), newSide(1)];
      units.length = 0;
      projs.length = 0;
      parts.length = 0;
      texts.length = 0;
      falls.length = 0;
      falls.plane = null;
      matchT = 0;
      kills = 0;
      camX = 0;
      setFollow(true);
      iconAge = -1;
      hudKey = '';
      state = 'play';
      aiThink = 4;
      showBanner(AGES[0].name);
      toast('Train units, earn XP, evolve!', 1800);
      ctx.focus();
    }
    function endMatch(won) {
      state = 'over';
      result = { won: won, t: matchT, age: sides[0].age, kills: kills };
      stats.games++;
      stats.kills += kills;
      var best = false;
      if (won) {
        stats.wins[diffIdx]++;
        if (!stats.best[diffIdx] || matchT < stats.best[diffIdx]) {
          stats.best[diffIdx] = Math.round(matchT);
          best = true;
        }
      }
      result.best = best;
      store.set('stats', stats);
      sfx(won ? 'win' : 'lose');
      sfx('explode');
      shake = 0.6;
      var bx = won ? E_FRONT + BASE_W / 2 : BASE_W / 2;
      for (var k = 0; k < 40; k++) puff(bx + (Math.random() - 0.5) * 140, Math.random() * 140, k % 2 ? '#f97316' : 'rgba(120,110,100,.9)', 2);
      camTarget = bx - viewW / 2;
      setFollow(false);
      overT = 1.4;
    }
    function showResult() {
      closeOverlay();
      var r = result;
      overlay = ui.overlay(root, {
        title: r.won ? 'Victory!' : 'Your base has fallen',
        html:
          '<div class="as-statrow"><div>Time<b>' + IGAME.fmtTime(r.t) + '</b></div><div>Kills<b>' + r.kills + '</b></div><div>Age<b>' + AGES[r.age].short + '</b></div></div>' +
          (r.won ? '<p class="ig-sub">' + (r.best ? '🏆 New best time on ' + D.name + '!' : 'Best on ' + D.name + ': ' + IGAME.fmtTime(stats.best[diffIdx])) + '</p>' : '<p class="ig-sub">Tip: ' + loseTip(r) + '</p>'),
        buttons: [
          { label: '↻ Play again', primary: true, onClick: function () { startMatch(diffIdx); } },
          { label: '⌂ Menu', onClick: showTitle },
        ],
      });
    }
    function loseTip(r) {
      if (r.age === 0) return 'evolve as soon as the ⏫ button lights up — newer units beat older ones easily.';
      if (sides && sides[1].age > r.age) return 'the rival out-evolved you. Spend less, evolve sooner.';
      return 'turrets and the special attack are great at breaking a big push on your base.';
    }

    function showTitle() {
      closeOverlay();
      state = 'title';
      sides = [newSide(0), newSide(1)];
      units.length = 0;
      projs.length = 0;
      falls.length = 0;
      falls.plane = null;
      camX = 0;
      iconAge = -1;
      hudKey = '';
      var wrap = ui.el('div', '');
      var dr = ui.el('div', 'as-diffs');
      DIFFS.forEach(function (d, i) {
        var b = ui.el('button', 'ig-btn' + (i === diffIdx ? '' : ' secondary'), d.name + '<small>' + (stats.best[i] ? 'Best ' + IGAME.fmtTime(stats.best[i]) : d.note) + '</small>');
        b.type = 'button';
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          sfx('click');
          startMatch(i);
        });
        dr.appendChild(b);
      });
      wrap.appendChild(dr);
      wrap.appendChild(ui.el('div', 'as-statrow', '<div>Wins<b>' + (stats.wins[0] + stats.wins[1] + stats.wins[2]) + '</b></div><div>Battles<b>' + stats.games + '</b></div><div>Kills<b>' + IGAME.fmt(stats.kills) + '</b></div>'));
      overlay = ui.overlay(root, {
        title: ctx.title || 'Epoch Siege',
        text: 'Train an army, evolve through five ages and smash the rival base before it smashes yours.',
        buttons: [{ label: '? How to play', onClick: showHelp }],
      });
      overlay.panel.insertBefore(wrap, overlay.panel.querySelector('.ig-actions'));
      overlay.panel.style.width = 'min(460px, 100%)';
      // Space / Enter start on the remembered difficulty
      overlay.primary = function () {
        startMatch(diffIdx);
      };
      setTimeout(function () {
        try {
          var f = dr.children[diffIdx];
          if (f && overlay && overlay.el.contains(f)) f.focus({ preventScroll: true });
        } catch (e) {}
      }, 40);
    }
    function showHelp() {
      closeOverlay();
      overlay = ui.overlay(root, {
        title: 'How to play',
        html:
          '<ul class="as-help">' +
          '<li><b>Train units</b> with the four buttons (keys 1–4). They march right and fight on their own.</li>' +
          '<li>Melee units are cheap, ranged units shoot from behind and hit flyers, heavy units are armored, flyers float over the line and bomb.</li>' +
          '<li>Kills give <b>gold</b> and <b>XP</b>. Fill the XP bar and press <b>Evolve</b> (E) for a new age with stronger units.</li>' +
          '<li><b>Turrets</b> (T) guard your base — two slots. The <b>special</b> (Q) rains damage ahead of your front line.</li>' +
          '<li>Drag the battlefield, use ← → or tap the map strip to look around. ⌖ Follow (F) re-centres on the fight.</li>' +
          '<li>Destroy the rival base to win. The rival trains, evolves and fights back too.</li>' +
          '</ul>',
        buttons: [{ label: '← Back', primary: true, onClick: showTitle }],
      });
      overlay.panel.style.width = 'min(500px, 100%)';
    }
    function pauseGame() {
      if (state !== 'play') return;
      state = 'paused';
      closeOverlay();
      overlay = ui.overlay(root, {
        title: 'Paused',
        text: D.name + ' · ' + IGAME.fmtTime(matchT) + ' · ' + AGES[sides[0].age].name,
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: '↻ Restart', onClick: function () { startMatch(diffIdx); } },
          { label: '⌂ Menu', onClick: showTitle },
        ],
      });
    }
    function resumeGame() {
      closeOverlay();
      state = 'play';
      ctx.focus();
    }

    /* ================================================================ */
    /* Input                                                             */
    /* ================================================================ */
    function onBarClick(e) {
      var el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el) return;
      var act = el.getAttribute('data-act');
      if (act === 'pause') return pauseGame();
      if (act === 'follow') {
        sfx('click');
        return setFollow(!follow);
      }
      if (state !== 'play') return;
      if (act.indexOf('unit') === 0) train(sides[0], +act.slice(4));
      else if (act === 'turret') buyTurret(sides[0]);
      else if (act === 'special') useSpecial(sides[0]);
      else if (act === 'evolve') {
        if (sides[0].age >= 4) buyVeteran(sides[0]);
        else evolve(sides[0]);
      }
      hudKey = '';
    }
    var drag = null;
    function onDown(e) {
      if (e.button != null && e.button > 0) return;
      drag = { id: e.pointerId, x: e.clientX, cam: camX, moved: false };
      try {
        view.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
    function onMove(e) {
      if (!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      if (drag.moved) {
        camX = drag.cam - dx / S;
        clampCam();
        if (follow) setFollow(false);
      }
    }
    function onUp(e) {
      if (drag && drag.id === e.pointerId) drag = null;
    }
    function onWheel(e) {
      if (state !== 'play' && state !== 'over') return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      camX += d / S;
      clampCam();
      if (follow) setFollow(false);
    }
    var miniDrag = false;
    function miniJump(e) {
      var r = mini.getBoundingClientRect();
      var f = clamp((e.clientX - r.left) / r.width, 0, 1);
      camX = f * WORLD - viewW / 2;
      clampCam();
      if (follow) setFollow(false);
    }
    function onMiniDown(e) {
      e.stopPropagation();
      miniDrag = true;
      try {
        mini.setPointerCapture(e.pointerId);
      } catch (err) {}
      miniJump(e);
    }
    function onMiniMove(e) {
      if (miniDrag) miniJump(e);
    }
    function onMiniUp() {
      miniDrag = false;
    }

    ctx.captureKeys(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyT', 'KeyQ', 'KeyE', 'KeyF', 'KeyP', 'KeyA', 'KeyD', 'Enter', 'Escape']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          var act = document.activeElement;
          if (act && overlay.el.contains(act) && act.tagName === 'BUTTON') act.click();
          else if (overlay.primary) overlay.primary();
          else {
            var pb = overlay.panel.querySelector('.ig-actions .ig-btn');
            if (pb) pb.click();
          }
        } else if ((code === 'Escape' || code === 'KeyP') && state === 'paused') resumeGame();
        return;
      }
      if (state !== 'play') return;
      var me = sides[0];
      switch (code) {
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          train(me, +code.slice(5) - 1);
          break;
        case 'KeyT':
          buyTurret(me);
          break;
        case 'KeyQ':
        case 'Space':
          useSpecial(me);
          break;
        case 'KeyE':
          if (me.age >= 4) buyVeteran(me);
          else evolve(me);
          break;
        case 'KeyF':
          setFollow(!follow);
          break;
        case 'KeyP':
        case 'Escape':
          pauseGame();
          break;
      }
      hudKey = '';
    });

    /* ================================================================ */
    /* Loop                                                              */
    /* ================================================================ */
    var dbgSpeed = 1;
    var loop = IGAME.loop(function (dt) {
      if (state === 'play') {
        var total = dt * dbgSpeed;
        var n = Math.max(1, Math.ceil(total / (1 / 30)));
        for (var i = 0; i < n && state === 'play'; i++) step(total / n);
        // keyboard camera
        var pan = (ctx.keys.ArrowRight || ctx.keys.KeyD ? 1 : 0) - (ctx.keys.ArrowLeft || ctx.keys.KeyA ? 1 : 0);
        if (pan) {
          camX += pan * 700 * dt;
          if (follow) setFollow(false);
        }
        if (follow) camX = lerp(camX, frontLine() - viewW * 0.5, Math.min(1, dt * 2.5));
        clampCam();
        updateFx(total);
      } else if (state === 'over') {
        time += dt;
        camX = lerp(camX, camTarget, Math.min(1, dt * 3));
        clampCam();
        updateFx(dt);
        if (overT > 0) {
          overT -= dt;
          if (overT <= 0) showResult();
        }
      } else if (state === 'title') {
        time += dt;
        camX = (Math.sin(time * 0.08) * 0.5 + 0.5) * Math.max(0, WORLD - viewW);
        updateFx(dt);
      }
      // re-measure the DOM bars now and then (wrapping can change their height)
      relayoutTick -= dt;
      if (relayoutTick <= 0) {
        relayoutTick = 1;
        if (W + 'x' + H + ':' + bar.offsetHeight + ':' + top.offsetHeight !== layoutKey) layout();
      }
      render();
      updateHud();
    });
    var relayoutTick = 0.5;

    view.canvas.addEventListener('pointerdown', onDown);
    view.canvas.addEventListener('pointermove', onMove);
    view.canvas.addEventListener('pointerup', onUp);
    view.canvas.addEventListener('pointercancel', onUp);
    view.canvas.addEventListener('wheel', onWheel, { passive: false });
    mini.addEventListener('pointerdown', onMiniDown);
    mini.addEventListener('pointermove', onMiniMove);
    mini.addEventListener('pointerup', onMiniUp);
    mini.addEventListener('pointercancel', onMiniUp);
    bar.addEventListener('click', onBarClick);
    top.addEventListener('click', onBarClick);

    booted = true;
    sides = [newSide(0), newSide(1)];
    refreshIcons();
    updateHud();
    layout();
    showTitle();
    loop.start();
    // the bar height can change once fonts settle
    var relayoutT = setTimeout(function () {
      if (booted) layout();
    }, 300);

    if (ctx.debug) {
      window.__ageSiege = {
        state: function () {
          var s = sides || [];
          return {
            state: state, t: Math.round(matchT), units: units.length, kills: kills,
            me: s[0] && { vet: s[0].vet, age: s[0].age, gold: Math.floor(s[0].gold), xp: Math.floor(s[0].xp), hp: Math.ceil(s[0].hp), q: s[0].queue.length },
            ai: s[1] && { vet: s[1].vet, age: s[1].age, gold: Math.floor(s[1].gold), xp: Math.floor(s[1].xp), hp: Math.ceil(s[1].hp) },
            S: S, viewW: Math.round(viewW), camX: Math.round(camX),
          };
        },
        start: function (d) { startMatch(d == null ? 1 : d); },
        speed: function (n) { dbgSpeed = n; },
        gold: function (n) { sides[0].gold = n; },
        xp: function (n) { sides[0].xp = n; },
        train: function (r) { return train(sides[0], r); },
        turret: function () { return buyTurret(sides[0]); },
        special: function () { return useSpecial(sides[0]); },
        evolve: function () { return sides[0].age >= 4 ? buyVeteran(sides[0]) : evolve(sides[0]); },
        hurt: function (s, n) { damageBase(sides[s], n); },
      };
    }

    return {
      pause: function () {
        if (state === 'play') pauseGame();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        booted = false;
        clearTimeout(relayoutT);
        closeOverlay();
        view.canvas.removeEventListener('pointerdown', onDown);
        view.canvas.removeEventListener('pointermove', onMove);
        view.canvas.removeEventListener('pointerup', onUp);
        view.canvas.removeEventListener('pointercancel', onUp);
        view.canvas.removeEventListener('wheel', onWheel);
        mini.removeEventListener('pointerdown', onMiniDown);
        mini.removeEventListener('pointermove', onMiniMove);
        mini.removeEventListener('pointerup', onMiniUp);
        mini.removeEventListener('pointercancel', onMiniUp);
        bar.removeEventListener('click', onBarClick);
        top.removeEventListener('click', onBarClick);
        view.destroy();
        [top, mini, bar, styleEl].forEach(function (n) {
          if (n.parentNode) n.parentNode.removeChild(n);
        });
        if (ctx.debug) delete window.__ageSiege;
      },
    };
  });
})();
