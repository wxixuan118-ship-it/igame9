/*!
 * Assurdo Clicker — igame9 original "brainrot-style" idle clicker.
 *
 * Tap the star creature for coins, adopt silly hybrid creatures that earn coins every
 * second, buy upgrades, complete a sticker album (unlocked only by milestones — no
 * gacha), catch the Golden Farfallina for bonuses and Rebirth for permanent Sparks.
 * Every creature here is an original design (animal + everyday object) with an
 * invented Italian-sounding name; nothing is taken from any meme video, image or audio.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var OL = '#2b1e3f'; // sticker outline colour
  var SAVE_VER = 1;
  var OFFLINE_CAP = 8 * 3600;
  var GROWTH = 1.15;
  var REBIRTH_BASE = 1e6; // total coins needed for the first Spark
  var SPARK_BONUS = 0.1; // +10% coins per Spark
  var LUCKY_TAP = 0.04; // chance of a ×5 "Super bonk"

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function fmt(n) { return IGAME.fmt(n); }
  function fmtC(n) { return n < 1000 ? String(Math.floor(n)) : IGAME.fmt(n); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ================================================================== */
  /* Sticker drawing kit — every creature is drawn in a 100×100 box      */
  /* ================================================================== */
  function fs(g, fill, lw) {
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (lw !== 0) { g.lineWidth = lw || 2.6; g.strokeStyle = OL; g.stroke(); }
  }
  function circ(g, x, y, r, fill, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); fs(g, fill, lw); }
  function ell(g, x, y, rx, ry, fill, rot, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); fs(g, fill, lw); }
  function rrPath(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function rr(g, x, y, w, h, r, fill, lw) { g.beginPath(); rrPath(g, x, y, w, h, r); fs(g, fill, lw); }
  function poly(g, p, fill, lw) {
    g.beginPath();
    g.moveTo(p[0], p[1]);
    for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
    fs(g, fill, lw);
  }
  function line(g, p, color, w) {
    g.beginPath();
    g.moveTo(p[0], p[1]);
    for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.lineWidth = w;
    g.strokeStyle = color;
    g.stroke();
  }
  // a thick outlined "noodle" stroke (necks, tentacles, arms)
  function noodle(g, pathFn, color, w) {
    g.beginPath();
    pathFn();
    g.lineWidth = w + 3.2;
    g.strokeStyle = OL;
    g.stroke();
    g.beginPath();
    pathFn();
    g.lineWidth = w;
    g.strokeStyle = color;
    g.stroke();
  }
  function eye(g, x, y, r) {
    circ(g, x, y, r, '#fff', Math.max(1.2, r * 0.32));
    circ(g, x + r * 0.12, y + r * 0.12, r * 0.56, '#1b1530', 0);
    circ(g, x - r * 0.06, y - r * 0.18, r * 0.22, '#fff', 0);
  }
  function smile(g, x, y, w, open) {
    g.beginPath();
    g.moveTo(x - w, y);
    if (open) {
      g.quadraticCurveTo(x, y + w * 1.5, x + w, y);
      g.closePath();
      fs(g, '#8a2443', 2);
    } else {
      g.quadraticCurveTo(x, y + w * 0.9, x + w, y);
      g.lineWidth = 2.3;
      g.strokeStyle = OL;
      g.stroke();
    }
  }
  function blush(g, x, y) { g.globalAlpha = 0.45; ell(g, x, y, 4.4, 2.5, '#ff6f9c', 0, 0); g.globalAlpha = 1; }
  function shine(g, x, y, rx, ry, rot) { g.globalAlpha = 0.5; ell(g, x, y, rx, ry, '#fff', rot == null ? -0.5 : rot, 0); g.globalAlpha = 1; }
  function clipEll(g, x, y, rx, ry, fn) { g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.clip(); fn(); g.restore(); }
  function note(g, x, y, s) {
    ell(g, x, y, 3.4 * s, 2.6 * s, OL, -0.4, 0);
    line(g, [x + 3 * s, y - 0.5, x + 3 * s, y - 13 * s, x + 7.5 * s, y - 9 * s], OL, 1.8);
  }

  /* ---------------- the cast (all original) ---------------- */
  function drawRino(g) {
    rr(g, 32, 74, 11, 15, 4, '#d63a46');
    rr(g, 57, 74, 11, 15, 4, '#d63a46');
    ell(g, 37, 91, 10, 5, '#ffd23f');
    ell(g, 63, 91, 10, 5, '#ffd23f');
    circ(g, 50, 57, 31, '#ff4d4d');
    shine(g, 37, 41, 9, 4.5, -0.6);
    for (var k = 0; k < 5; k++) {
      var a = -Math.PI / 2 + (k - 2) * 0.62;
      ell(g, 57 + Math.cos(a) * 7, 27 + Math.sin(a) * 6, 7.5, 3.2, '#43c45f', a);
    }
    rr(g, 55, 15, 4.5, 10, 2, '#2f9e4a');
    poly(g, [27, 53, 12, 25, 41, 43], '#fff1d6');
    poly(g, [39, 37, 36, 23, 47, 33], '#fff1d6');
    eye(g, 48, 53, 6.5);
    eye(g, 65, 53, 6.5);
    circ(g, 33, 63, 1.7, OL, 0);
    circ(g, 38, 66, 1.7, OL, 0);
    smile(g, 57, 67, 7, true);
    blush(g, 43, 66);
    blush(g, 74, 63);
  }
  function drawPing(g) {
    ell(g, 37, 93, 9, 4.5, '#ff9f1c');
    ell(g, 63, 93, 9, 4.5, '#ff9f1c');
    rr(g, 30, 10, 17, 26, 7, '#f4c47c');
    rr(g, 53, 6, 17, 30, 7, '#f4c47c');
    rr(g, 34, 14, 9, 16, 4, '#ffe2ad', 0);
    rr(g, 57, 10, 9, 20, 4, '#ffe2ad', 0);
    ell(g, 17, 62, 6, 13, '#26283a', 0.35);
    ell(g, 83, 62, 6, 13, '#26283a', -0.35);
    rr(g, 18, 26, 64, 64, 14, '#d4dce8');
    shine(g, 28, 34, 7, 3, -0.2);
    rr(g, 82, 44, 7, 16, 3, '#8b97a8');
    line(g, [32, 29.5, 46, 29.5], OL, 3);
    line(g, [55, 29.5, 69, 29.5], OL, 3);
    rr(g, 27, 36, 46, 47, 20, '#26283a');
    ell(g, 50, 63, 16.5, 15, '#fff', 0, 0);
    eye(g, 43, 57, 5);
    eye(g, 57, 57, 5);
    poly(g, [45, 64, 55, 64, 50, 71], '#ff9f1c', 2);
    blush(g, 37, 68);
    blush(g, 63, 68);
  }
  function drawGatto(g) {
    var gl = g.createRadialGradient(50, 44, 4, 50, 44, 46);
    gl.addColorStop(0, 'rgba(255,236,120,.6)');
    gl.addColorStop(1, 'rgba(255,236,120,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, 100, 100);
    g.beginPath();
    g.moveTo(58, 86);
    g.bezierCurveTo(78, 97, 94, 84, 84, 72);
    g.lineWidth = 3.2;
    g.strokeStyle = OL;
    g.stroke();
    line(g, [81, 64, 81, 58], OL, 2);
    line(g, [87, 64, 87, 58], OL, 2);
    rr(g, 78, 63, 12, 10, 2.5, '#8b97a8');
    poly(g, [27, 31, 28, 7, 46, 20], '#fff3a6');
    poly(g, [73, 31, 72, 7, 54, 20], '#fff3a6');
    poly(g, [31, 25, 31, 13, 40, 20], '#ffb3c6', 0);
    poly(g, [69, 25, 69, 13, 60, 20], '#ffb3c6', 0);
    g.beginPath();
    g.arc(50, 44, 29, Math.PI * 0.7, Math.PI * 0.3);
    g.lineTo(61, 72);
    g.lineTo(39, 72);
    g.closePath();
    fs(g, '#fff3a6');
    shine(g, 37, 29, 7, 4, -0.7);
    rr(g, 37, 71, 26, 15, 4, '#a3acb9');
    line(g, [39, 76, 61, 76], OL, 1.5);
    line(g, [39, 81, 61, 81], OL, 1.5);
    rr(g, 44, 85, 12, 6, 3, '#4b5563');
    eye(g, 41, 42, 5.2);
    eye(g, 59, 42, 5.2);
    poly(g, [47.5, 49, 52.5, 49, 50, 52], '#ff6f9c', 1.3);
    g.beginPath();
    g.moveTo(50, 52);
    g.quadraticCurveTo(47.5, 56.5, 44.5, 53.5);
    g.moveTo(50, 52);
    g.quadraticCurveTo(52.5, 56.5, 55.5, 53.5);
    g.lineWidth = 1.8;
    g.strokeStyle = OL;
    g.stroke();
    line(g, [29, 49, 38, 50.5], OL, 1.3);
    line(g, [29, 54, 38, 53], OL, 1.3);
    line(g, [71, 49, 62, 50.5], OL, 1.3);
    line(g, [71, 54, 62, 53], OL, 1.3);
    blush(g, 35, 51);
    blush(g, 65, 51);
  }
  function drawRana(g) {
    g.beginPath();
    g.moveTo(39, 80);
    g.quadraticCurveTo(50, 106, 61, 80);
    g.fillStyle = '#ff9f1c';
    g.fill();
    g.beginPath();
    g.moveTo(44, 80);
    g.quadraticCurveTo(50, 97, 56, 80);
    g.fillStyle = '#fff1a8';
    g.fill();
    poly(g, [33, 60, 15, 86, 37, 80], '#ef476f');
    poly(g, [67, 60, 85, 86, 63, 80], '#ef476f');
    ell(g, 50, 50, 21, 34, '#eef2f8');
    clipEll(g, 50, 50, 21, 34, function () {
      g.fillStyle = '#ef476f';
      g.fillRect(20, 10, 60, 16);
      g.fillRect(20, 74, 60, 14);
      line(g, [20, 26, 80, 26], OL, 2);
      line(g, [20, 74, 80, 74], OL, 2);
    });
    ell(g, 50, 50, 21, 34, null);
    shine(g, 40, 30, 3, 6, 0.1);
    circ(g, 50, 51, 13.5, '#9be7ff');
    g.save();
    g.beginPath();
    g.arc(50, 51, 13.5, 0, TAU);
    g.clip();
    ell(g, 50, 60, 14, 10, '#6ccf5a', 0, 0);
    g.restore();
    circ(g, 50, 51, 13.5, null, 3);
    circ(g, 42.5, 42, 5.8, '#6ccf5a');
    circ(g, 57.5, 42, 5.8, '#6ccf5a');
    eye(g, 42.5, 42, 3.8);
    eye(g, 57.5, 42, 3.8);
    smile(g, 50, 55, 6, false);
    blush(g, 42, 57);
    blush(g, 58, 57);
  }
  function drawTarta(g) {
    ell(g, 30, 86, 6, 7, '#7bc96f');
    ell(g, 44, 88, 6, 7, '#7bc96f');
    ell(g, 57, 88, 6, 7, '#7bc96f');
    ell(g, 70, 86, 6, 7, '#7bc96f');
    g.beginPath();
    g.moveTo(24, 58);
    g.quadraticCurveTo(12, 58, 7, 42);
    g.lineTo(13, 40);
    g.quadraticCurveTo(17, 54, 27, 70);
    g.closePath();
    fs(g, '#7ec8e3');
    ell(g, 85, 61, 11, 10, '#7bc96f');
    eye(g, 88, 57, 3.8);
    smile(g, 88, 65, 3.5, false);
    blush(g, 82, 66);
    g.beginPath();
    g.arc(48, 46, 18, Math.PI * 1.08, Math.PI * 1.92);
    g.lineWidth = 7;
    g.strokeStyle = OL;
    g.stroke();
    g.lineWidth = 3.8;
    g.strokeStyle = '#ffd23f';
    g.stroke();
    ell(g, 48, 66, 31, 21, '#7ec8e3');
    clipEll(g, 48, 66, 31, 21, function () {
      g.fillStyle = '#5aa9c9';
      g.fillRect(10, 62, 80, 7);
      for (var i = 0; i < 5; i++) {
        circ(g, 26 + i * 11, 55, 2.4, '#fff', 0);
        circ(g, 31 + i * 11, 76, 2.4, '#fff', 0);
      }
    });
    ell(g, 48, 66, 31, 21, null);
    ell(g, 48, 46, 15, 5, '#a9dcef');
    circ(g, 48, 40, 4, '#ffd23f');
    shine(g, 33, 57, 7, 3, -0.3);
    g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(9, 36);
    g.quadraticCurveTo(4, 30, 9, 25);
    g.quadraticCurveTo(14, 20, 9, 14);
    g.lineWidth = 2;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.globalAlpha = 1;
  }
  function drawConi(g) {
    ell(g, 40, 26, 6.5, 17, '#fff', -0.25);
    ell(g, 60, 26, 6.5, 17, '#fff', 0.25);
    ell(g, 40, 27, 3, 11, '#ffb3c6', -0.25, 0);
    ell(g, 60, 27, 3, 11, '#ffb3c6', 0.25, 0);
    ell(g, 42, 77, 6, 3.5, '#fff');
    ell(g, 58, 77, 6, 3.5, '#fff');
    // croissant: segments placed along an arc, ends first so the middle sits on top
    var segs = [[205, 9, 7], [335, 9, 7], [235, 13, 11], [305, 13, 11], [270, 19, 16]];
    for (var i = 0; i < segs.length; i++) {
      var a = (segs[i][0] * Math.PI) / 180;
      var x = 50 + Math.cos(a) * 38, y = 96 + Math.sin(a) * 38;
      ell(g, x, y, segs[i][1], segs[i][2], i < 4 ? '#e09a42' : '#eaa64d', a + Math.PI / 2);
      if (i < 4) line(g, [x - Math.cos(a) * segs[i][2] * 0.6, y - Math.sin(a) * segs[i][2] * 0.6, x + Math.cos(a) * segs[i][2] * 0.4, y + Math.sin(a) * segs[i][2] * 0.4], '#b8742a', 1.6);
    }
    shine(g, 42, 48, 6, 3, -0.3);
    eye(g, 43.5, 56, 4.6);
    eye(g, 56.5, 56, 4.6);
    poly(g, [48, 62, 52, 62, 50, 64.5], '#ff6f9c', 1.2);
    g.beginPath();
    g.moveTo(50, 64.5);
    g.quadraticCurveTo(48, 68, 45.5, 66);
    g.moveTo(50, 64.5);
    g.quadraticCurveTo(52, 68, 54.5, 66);
    g.lineWidth = 1.8;
    g.strokeStyle = OL;
    g.stroke();
    blush(g, 39, 63);
    blush(g, 61, 63);
  }
  function drawPolpo(g) {
    for (var i = 0; i < 5; i++) {
      (function (x0, d) {
        noodle(g, function () {
          g.moveTo(x0, 74);
          g.bezierCurveTo(x0 - 6, 84, x0 + 6, 88, x0 + d, 95);
        }, '#b06cff', 5.5);
      })(30 + i * 10, (i - 2) * 3);
    }
    ell(g, 50, 35, 23, 20, '#b06cff');
    circ(g, 36, 30, 2.6, '#d4a5ff', 0);
    circ(g, 64, 26, 2.2, '#d4a5ff', 0);
    circ(g, 58, 18, 1.8, '#d4a5ff', 0);
    shine(g, 41, 21, 6, 3, -0.4);
    eye(g, 42, 31, 5.4);
    eye(g, 58, 31, 5.4);
    smile(g, 50, 39, 4, false);
    blush(g, 36, 39);
    blush(g, 64, 39);
    rr(g, 21, 44, 58, 36, 5, '#2b2340');
    rr(g, 25, 62, 50, 12, 2, '#fff');
    for (var k = 1; k < 8; k++) line(g, [25 + k * 6.25, 62, 25 + k * 6.25, 74], OL, 1);
    var blk = [1, 2, 4, 5, 6];
    for (var b = 0; b < blk.length; b++) rr(g, 25 + blk[b] * 6.25 - 1.8, 62, 3.6, 6.5, 0.8, '#1b1530', 0);
    shine(g, 30, 49, 6, 1.8, 0);
    noodle(g, function () { g.moveTo(22, 50); g.quadraticCurveTo(16, 62, 30, 66); }, '#b06cff', 5);
    noodle(g, function () { g.moveTo(78, 50); g.quadraticCurveTo(86, 62, 68, 66); }, '#b06cff', 5);
    note(g, 86, 30, 0.9);
  }
  function drawFeni(g) {
    noodle(g, function () { g.moveTo(44, 86); g.lineTo(44, 97); }, '#ff7eb3', 2.6);
    noodle(g, function () { g.moveTo(56, 86); g.lineTo(60, 91); g.lineTo(55, 96); }, '#ff7eb3', 2.6);
    rr(g, 31, 72, 38, 16, 5, '#5b6475');
    circ(g, 50, 80, 3.5, '#ffd23f');
    ell(g, 27, 50, 6, 12, '#ff7eb3', 0.35);
    ell(g, 73, 50, 6, 12, '#ff7eb3', -0.35);
    g.beginPath();
    g.moveTo(28, 26); g.lineTo(72, 26); g.lineTo(65, 73); g.lineTo(35, 73); g.closePath();
    fs(g, 'rgba(225,246,255,0.95)', 0);
    g.save();
    g.beginPath();
    g.moveTo(28, 26); g.lineTo(72, 26); g.lineTo(65, 73); g.lineTo(35, 73); g.closePath();
    g.clip();
    g.beginPath();
    g.moveTo(20, 46);
    g.quadraticCurveTo(30, 40, 40, 46);
    g.quadraticCurveTo(50, 52, 60, 46);
    g.quadraticCurveTo(70, 40, 80, 46);
    g.lineTo(80, 80); g.lineTo(20, 80); g.closePath();
    g.fillStyle = '#ff8fb8';
    g.fill();
    circ(g, 42, 60, 2, '#ffd0e2', 0);
    circ(g, 56, 55, 1.6, '#ffd0e2', 0);
    g.restore();
    g.beginPath();
    g.moveTo(28, 26); g.lineTo(72, 26); g.lineTo(65, 73); g.lineTo(35, 73); g.closePath();
    fs(g, null);
    line(g, [64, 36, 60, 36], OL, 1.4);
    line(g, [63, 44, 59, 44], OL, 1.4);
    shine(g, 34, 40, 2, 9, 0.12);
    noodle(g, function () { g.moveTo(47, 34); g.bezierCurveTo(38, 18, 66, 22, 60, 12); }, '#ff7eb3', 6);
    circ(g, 59, 11, 7.5, '#ff7eb3');
    poly(g, [64, 8, 75, 11, 71, 19, 64, 14], '#fff', 2);
    poly(g, [71, 14, 75, 11, 71, 19], OL, 0);
    eye(g, 57.5, 9, 2.8);
    blush(g, 55, 15);
  }
  function drawLuma(g) {
    rr(g, 5, 78, 82, 14, 7, '#ffcf6b');
    noodle(g, function () { g.moveTo(77, 60); g.lineTo(72, 41); }, '#ffcf6b', 3);
    noodle(g, function () { g.moveTo(84, 60); g.lineTo(90, 43); }, '#ffcf6b', 3);
    ell(g, 80, 70, 10, 15, '#ffcf6b', 0.18);
    eye(g, 72, 40, 4.2);
    eye(g, 90, 42, 4.2);
    smile(g, 81, 73, 4, false);
    blush(g, 75, 72);
    rr(g, 13, 29, 54, 54, 8, '#f4f6fb');
    rr(g, 13, 29, 54, 12, 6, '#cfd6e6');
    circ(g, 22, 35, 3, '#ff5b5b', 1.6);
    circ(g, 31, 35, 3, '#3ee6a8', 1.6);
    rr(g, 44, 32, 17, 6, 2, '#1b1530', 1.4);
    circ(g, 40, 62, 16, '#a9b4c8');
    circ(g, 40, 62, 12, '#6fc3ff');
    g.save();
    g.beginPath();
    g.arc(40, 62, 12, 0, TAU);
    g.clip();
    g.beginPath();
    g.moveTo(26, 64);
    g.quadraticCurveTo(33, 58, 40, 64);
    g.quadraticCurveTo(47, 70, 54, 64);
    g.lineTo(54, 76); g.lineTo(26, 76); g.closePath();
    g.fillStyle = '#3d9be0';
    g.fill();
    g.restore();
    circ(g, 36, 57, 2.2, 'rgba(255,255,255,.9)', 0);
    circ(g, 44, 60, 1.6, 'rgba(255,255,255,.9)', 0);
    circ(g, 40, 54, 1.2, 'rgba(255,255,255,.9)', 0);
    shine(g, 34, 56, 4, 2, -0.6);
    shine(g, 22, 48, 3, 1.4, 0);
  }
  function drawGira(g) {
    ell(g, 50, 90, 37, 6, '#dfe6f2');
    rr(g, 47, 16, 12, 48, 6, '#ffb84d');
    circ(g, 51, 28, 2.6, '#c8742a', 0);
    circ(g, 55.5, 39, 2.2, '#c8742a', 0);
    circ(g, 50.5, 47, 2.6, '#c8742a', 0);
    line(g, [55, 10, 53, 2], OL, 2.2);
    line(g, [61, 10, 61, 2], OL, 2.2);
    circ(g, 53, 2.5, 2.2, '#c8742a', 1.4);
    circ(g, 61, 2.5, 2.2, '#c8742a', 1.4);
    ell(g, 48, 10, 5, 2.4, '#ffb84d', -0.5);
    ell(g, 61, 14, 13, 8, '#ffb84d', 0.1);
    eye(g, 59, 12, 3.2);
    circ(g, 70, 15, 1.1, OL, 0);
    smile(g, 66, 18, 3, false);
    g.beginPath();
    g.moveTo(17, 88);
    g.lineTo(21, 55);
    g.quadraticCurveTo(25, 46, 33, 50);
    g.quadraticCurveTo(41, 43, 50, 50);
    g.quadraticCurveTo(59, 43, 67, 50);
    g.quadraticCurveTo(75, 46, 79, 55);
    g.lineTo(83, 88);
    g.closePath();
    fs(g, 'rgba(255,92,138,0.93)');
    line(g, [33, 56, 31, 84], 'rgba(255,190,210,.8)', 2.4);
    line(g, [50, 56, 50, 85], 'rgba(255,190,210,.8)', 2.4);
    line(g, [67, 56, 69, 84], 'rgba(255,190,210,.8)', 2.4);
    shine(g, 26, 66, 2.5, 9, 0.1);
    eye(g, 42, 68, 4.4);
    eye(g, 58, 68, 4.4);
    smile(g, 50, 76, 4, false);
    blush(g, 36, 76);
    blush(g, 64, 76);
  }
  function drawBale(g) {
    function wheel(x, y) {
      circ(g, x, y, 12, '#e6ecf5', 3);
      circ(g, x, y, 8, '#fff', 0);
      for (var i = 0; i < 4; i++) {
        var a = (i * Math.PI) / 4;
        line(g, [x - Math.cos(a) * 11, y - Math.sin(a) * 11, x + Math.cos(a) * 11, y + Math.sin(a) * 11], OL, 1);
      }
      circ(g, x, y, 2.2, OL, 0);
    }
    wheel(24, 84);
    wheel(76, 84);
    line(g, [24, 84, 44, 72, 66, 72, 76, 84], OL, 4.6);
    line(g, [24, 84, 44, 72, 66, 72, 76, 84], '#ff5b5b', 2.6);
    line(g, [44, 72, 50, 84, 24, 84], OL, 4.6);
    line(g, [44, 72, 50, 84, 24, 84], '#ff5b5b', 2.6);
    line(g, [66, 72, 68, 60], OL, 3);
    poly(g, [22, 57, 5, 41, 12, 57, 5, 72], '#3f74d6');
    ell(g, 52, 54, 32, 19, '#4f8df5');
    clipEll(g, 52, 54, 32, 19, function () {
      ell(g, 56, 68, 30, 10, '#bcd6ff', 0, 0);
      line(g, [36, 62, 72, 62], 'rgba(79,141,245,.45)', 1.2);
      line(g, [38, 66, 74, 66], 'rgba(79,141,245,.45)', 1.2);
    });
    ell(g, 52, 54, 32, 19, null);
    shine(g, 40, 42, 9, 3, -0.15);
    ell(g, 66, 63, 7, 3.4, '#3f74d6', 0.6);
    eye(g, 70, 49, 4.3);
    smile(g, 76, 57, 5, false);
    blush(g, 73, 58);
    g.lineWidth = 2.6;
    g.strokeStyle = '#7fd3ff';
    g.beginPath();
    g.moveTo(56, 35);
    g.lineTo(56, 24);
    g.moveTo(56, 24);
    g.quadraticCurveTo(50, 16, 44, 22);
    g.moveTo(56, 24);
    g.quadraticCurveTo(62, 16, 68, 22);
    g.stroke();
    circ(g, 44, 26, 2, '#7fd3ff', 0);
    circ(g, 68, 26, 2, '#7fd3ff', 0);
  }
  function drawOrso(g) {
    line(g, [50, 18, 50, 93], OL, 4.6);
    line(g, [50, 18, 50, 93], '#f4f6fb', 2.2);
    function canopy() {
      g.beginPath();
      g.moveTo(9, 34);
      g.quadraticCurveTo(50, -6, 91, 34);
      for (var i = 0; i < 4; i++) {
        var x0 = 91 - i * 20.5;
        g.quadraticCurveTo(x0 - 10.25, 40, x0 - 20.5, 34);
      }
      g.closePath();
    }
    canopy();
    fs(g, '#fff', 0);
    g.save();
    canopy();
    g.clip();
    g.fillStyle = '#ff5b5b';
    for (var s = 0; s < 4; s += 2) {
      g.beginPath();
      g.moveTo(50, 12);
      g.lineTo(9 + s * 20.5, 40);
      g.lineTo(9 + (s + 1) * 20.5, 40);
      g.closePath();
      g.fill();
    }
    g.beginPath();
    g.moveTo(50, 12); g.lineTo(9 + 4 * 20.5, 40); g.lineTo(91, 40); g.closePath();
    g.fill();
    g.restore();
    canopy();
    fs(g, null);
    circ(g, 50, 13, 2.6, '#ffd23f', 1.4);
    ell(g, 42, 94, 7, 4, '#b0703f');
    ell(g, 58, 94, 7, 4, '#b0703f');
    circ(g, 50, 78, 17, '#b0703f');
    ell(g, 50, 82, 9, 10, '#e9c39b', 0, 0);
    circ(g, 37, 43, 5.5, '#b0703f');
    circ(g, 63, 43, 5.5, '#b0703f');
    circ(g, 37, 43, 2.5, '#e9c39b', 0);
    circ(g, 63, 43, 2.5, '#e9c39b', 0);
    circ(g, 50, 55, 15, '#b0703f');
    ell(g, 50, 61, 7.5, 5.5, '#e9c39b');
    ell(g, 50, 58.5, 3, 2, OL, 0, 0);
    smile(g, 50, 63, 3, false);
    rr(g, 37.5, 48, 11, 7.5, 3.5, '#1b1530', 1.6);
    rr(g, 51.5, 48, 11, 7.5, 3.5, '#1b1530', 1.6);
    line(g, [48.5, 50.5, 51.5, 50.5], OL, 1.6);
    shine(g, 41, 50, 2.6, 1.2, -0.3);
    shine(g, 55, 50, 2.6, 1.2, -0.3);
    circ(g, 46, 72, 4.6, '#b0703f');
    circ(g, 54.5, 69, 4.6, '#b0703f');
  }
  function drawCact(g) {
    noodle(g, function () { g.moveTo(36, 60); g.lineTo(23, 60); g.lineTo(23, 43); }, '#4fb860', 8);
    noodle(g, function () { g.moveTo(64, 54); g.lineTo(77, 54); g.lineTo(77, 38); }, '#4fb860', 8);
    rr(g, 32, 22, 36, 54, 18, '#58c26b');
    line(g, [42, 30, 42, 70], '#79d88a', 2);
    line(g, [58, 30, 58, 70], '#79d88a', 2);
    var sp = [[36, 32], [64, 34], [35, 62], [65, 64], [46, 72], [55, 28]];
    for (var i = 0; i < sp.length; i++) line(g, [sp[i][0], sp[i][1], sp[i][0] + (sp[i][0] < 50 ? -3 : 3), sp[i][1] - 2], OL, 1.3);
    poly(g, [29, 74, 71, 74, 65, 96, 35, 96], '#e07a4f');
    rr(g, 26, 70, 48, 9, 3, '#f0915f');
    for (var k = 0; k < 5; k++) {
      var a = (k / 5) * TAU - Math.PI / 2;
      ell(g, 50 + Math.cos(a) * 5, 19 + Math.sin(a) * 5, 4.4, 3, '#ff6fb5', a);
    }
    circ(g, 50, 19, 3, '#ffd23f', 1.4);
    eye(g, 43, 40, 4.6);
    eye(g, 57, 40, 4.6);
    ell(g, 50, 52, 4, 5, '#8a2443', 0, 2);
    blush(g, 38, 48);
    blush(g, 62, 48);
    note(g, 84, 26, 1);
    note(g, 90, 12, 0.7);
  }
  function drawPapp(g) {
    ell(g, 21, 52, 8, 16, '#2fa8ff', 0.4);
    ell(g, 79, 52, 8, 16, '#2fa8ff', -0.4);
    ell(g, 44, 94, 5, 3, '#ff9f1c');
    ell(g, 56, 94, 5, 3, '#ff9f1c');
    poly(g, [22, 32, 78, 32, 50, 92], '#ffd166');
    circ(g, 40, 46, 5, '#e63946', 1.6);
    circ(g, 59, 50, 5, '#e63946', 1.6);
    circ(g, 49, 67, 4.4, '#e63946', 1.6);
    circ(g, 52, 40, 1.4, '#3a9b4a', 0);
    circ(g, 44, 58, 1.4, '#3a9b4a', 0);
    rr(g, 18, 26, 64, 12, 6, '#d98c3a');
    ell(g, 46, 10, 3, 7, '#ff5b5b', -0.4);
    ell(g, 52, 8, 3, 7, '#ff5b5b', 0.15);
    circ(g, 50, 19, 12, '#3cc46b');
    eye(g, 46, 17, 3.8);
    g.beginPath();
    g.moveTo(55, 15);
    g.quadraticCurveTo(67, 14, 63, 27);
    g.lineTo(56, 22);
    g.closePath();
    fs(g, '#ffcf3a', 2);
    blush(g, 43, 23);
  }
  function drawMucca(g) {
    line(g, [33, 62, 42, 80], OL, 1.5);
    line(g, [67, 62, 58, 80], OL, 1.5);
    line(g, [46, 69, 46, 80], OL, 1.5);
    line(g, [54, 69, 54, 80], OL, 1.5);
    rr(g, 38, 78, 24, 15, 3, '#c08a4b');
    line(g, [38, 83, 62, 83], '#8a5a2b', 1.2);
    line(g, [38, 88, 62, 88], '#8a5a2b', 1.2);
    ell(g, 30, 13, 3.6, 8, '#fff1d6', -0.6);
    ell(g, 70, 13, 3.6, 8, '#fff1d6', 0.6);
    ell(g, 18, 33, 9, 4.6, '#fff', 0.4);
    ell(g, 82, 33, 9, 4.6, '#fff', -0.4);
    function balloon() {
      g.beginPath();
      g.arc(50, 38, 30, Math.PI * 0.8, Math.PI * 0.2);
      g.lineTo(56, 70);
      g.lineTo(44, 70);
      g.closePath();
    }
    balloon();
    fs(g, '#fff', 0);
    g.save();
    balloon();
    g.clip();
    ell(g, 30, 24, 9, 6, '#1b1530', 0.3, 0);
    ell(g, 70, 20, 6, 5, '#1b1530', 0, 0);
    ell(g, 72, 50, 7, 5, '#1b1530', 0.4, 0);
    ell(g, 50, 70, 8, 4, '#1b1530', 0, 0);
    g.restore();
    balloon();
    fs(g, null);
    ell(g, 50, 51, 16, 10, '#ffb3c6');
    ell(g, 44, 51, 2, 3, '#c2557a', 0, 0);
    ell(g, 56, 51, 2, 3, '#c2557a', 0, 0);
    eye(g, 40, 34, 5);
    eye(g, 60, 34, 5);
    shine(g, 33, 20, 6, 3, -0.6);
  }
  function drawIppo(g) {
    circ(g, 9, 53, 2.2, '#7fd3ff', 0);
    circ(g, 5, 59, 2.6, '#7fd3ff', 0);
    circ(g, 10, 64, 2, '#7fd3ff', 0);
    rr(g, 22, 84, 56, 10, 4, '#d64545');
    rr(g, 14, 52, 14, 12, 3, '#ff5b5b');
    rr(g, 72, 52, 14, 12, 3, '#ff5b5b');
    circ(g, 32, 31, 5, '#ff5b5b');
    circ(g, 68, 31, 5, '#ff5b5b');
    rr(g, 28, 34, 44, 54, 8, '#ff5b5b');
    g.beginPath();
    g.ellipse(50, 37, 24, 13, 0, Math.PI, 0);
    g.closePath();
    fs(g, '#e04848');
    rr(g, 45, 19, 10, 7, 2, '#c43c3c');
    shine(g, 35, 46, 2.5, 9, 0);
    eye(g, 42, 45, 5);
    eye(g, 58, 45, 5);
    ell(g, 50, 65, 17, 12, '#ffb0b0');
    ell(g, 44, 61, 2.2, 3, '#c2557a', 0, 0);
    ell(g, 56, 61, 2.2, 3, '#c2557a', 0, 0);
    smile(g, 50, 70, 6, false);
    circ(g, 33, 80, 1.5, OL, 0);
    circ(g, 67, 80, 1.5, OL, 0);
  }
  function drawVolpe(g) {
    g.beginPath();
    g.moveTo(64, 88);
    g.bezierCurveTo(94, 92, 98, 58, 82, 50);
    g.bezierCurveTo(88, 66, 82, 78, 62, 78);
    g.closePath();
    fs(g, '#ff8a3d');
    circ(g, 83, 52, 4.4, '#fff', 2);
    g.beginPath();
    g.moveTo(50, 45);
    g.bezierCurveTo(30, 44, 30, 62, 40, 66);
    g.bezierCurveTo(26, 70, 26, 95, 50, 95);
    g.bezierCurveTo(74, 95, 74, 70, 60, 66);
    g.bezierCurveTo(70, 62, 70, 44, 50, 45);
    g.closePath();
    fs(g, '#c8752f');
    shine(g, 40, 56, 3, 6, 0.2);
    g.beginPath();
    g.moveTo(42, 70); g.quadraticCurveTo(38, 74, 42, 78);
    g.moveTo(58, 70); g.quadraticCurveTo(62, 74, 58, 78);
    g.lineWidth = 1.6;
    g.strokeStyle = OL;
    g.stroke();
    for (var i = 0; i < 4; i++) line(g, [47 + i * 2, 42, 47 + i * 2, 86], '#f4e3c3', 0.8);
    rr(g, 42, 76, 16, 3.2, 1, '#f1d6a8', 1.2);
    poly(g, [46, 85, 54, 85, 52, 93, 48, 93], '#3a2a20', 1.2);
    rr(g, 46, 32, 8, 16, 2, '#3a2a20', 1.6);
    poly(g, [33, 22, 31, 4, 46, 14], '#ff8a3d');
    poly(g, [67, 22, 69, 4, 54, 14], '#ff8a3d');
    poly(g, [35, 17, 34, 9, 41, 14], '#3a2a20', 0);
    poly(g, [65, 17, 66, 9, 59, 14], '#3a2a20', 0);
    g.beginPath();
    g.moveTo(29, 18);
    g.quadraticCurveTo(50, 7, 71, 18);
    g.quadraticCurveTo(66, 31, 50, 41);
    g.quadraticCurveTo(34, 31, 29, 18);
    g.closePath();
    fs(g, '#ff8a3d');
    g.beginPath();
    g.moveTo(36, 27);
    g.quadraticCurveTo(50, 31, 64, 27);
    g.quadraticCurveTo(58, 35, 50, 41);
    g.quadraticCurveTo(42, 35, 36, 27);
    g.closePath();
    fs(g, '#fff', 0);
    circ(g, 50, 39, 2.4, OL, 0);
    eye(g, 43, 22, 3.8);
    eye(g, 57, 22, 3.8);
    blush(g, 37, 29);
    blush(g, 63, 29);
  }
  function drawDelf(g) {
    rr(g, 18, 84, 6, 9, 2, '#7a4a2a');
    rr(g, 76, 84, 6, 9, 2, '#7a4a2a');
    rr(g, 16, 38, 68, 32, 12, '#ff7aa8');
    circ(g, 34, 50, 1.8, '#d94a7f', 0);
    circ(g, 50, 50, 1.8, '#d94a7f', 0);
    circ(g, 66, 50, 1.8, '#d94a7f', 0);
    rr(g, 12, 62, 76, 24, 9, '#ff5f95');
    rr(g, 5, 52, 16, 34, 8, '#ff7aa8');
    rr(g, 79, 52, 16, 34, 8, '#ff7aa8');
    poly(g, [24, 60, 13, 45, 18, 60, 12, 72], '#6a96c8');
    poly(g, [44, 50, 53, 36, 58, 50], '#6a96c8');
    ell(g, 51, 59, 29, 11, '#7aa7d8', -0.12);
    ell(g, 53, 63, 20, 4.5, '#d7e8fb', -0.12, 0);
    ell(g, 82, 53, 8, 4, '#7aa7d8', -0.3);
    shine(g, 40, 53, 7, 2, -0.12);
    ell(g, 57, 67, 6, 3, '#6a96c8', 0.5);
    eye(g, 71, 53, 3.6);
    smile(g, 79, 57, 3.6, false);
    blush(g, 73, 59);
  }
  function drawGufo(g) {
    ell(g, 42, 93, 5, 3, '#ff9f1c');
    ell(g, 58, 93, 5, 3, '#ff9f1c');
    poly(g, [24, 28, 25, 6, 40, 20], '#8a5a36');
    poly(g, [76, 28, 75, 6, 60, 20], '#8a5a36');
    ell(g, 20, 60, 8, 18, '#7a4e2e', 0.2);
    ell(g, 80, 60, 8, 18, '#7a4e2e', -0.2);
    ell(g, 50, 56, 31, 36, '#a06c43');
    circ(g, 50, 71, 16, '#fff8e7');
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * TAU;
      line(g, [50 + Math.cos(a) * 12.5, 71 + Math.sin(a) * 12.5, 50 + Math.cos(a) * 14.5, 71 + Math.sin(a) * 14.5], OL, i % 3 ? 0.9 : 1.6);
    }
    line(g, [50, 71, 50, 61], OL, 2.2);
    line(g, [50, 71, 57, 74], OL, 2.2);
    circ(g, 50, 71, 1.6, '#ff5b5b', 0);
    circ(g, 38, 37, 11, '#f6d7a7');
    circ(g, 62, 37, 11, '#f6d7a7');
    eye(g, 38, 37, 6.5);
    eye(g, 62, 37, 6.5);
    poly(g, [46, 45, 54, 45, 50, 53], '#ffb703', 1.8);
  }
  // Golden Farfallina — the bonus pasta butterfly (not an album card)
  function drawFarf(g) {
    var gr = g.createLinearGradient(0, 20, 0, 80);
    gr.addColorStop(0, '#fff3a0');
    gr.addColorStop(0.5, '#ffd23f');
    gr.addColorStop(1, '#f5a623');
    function wing(dir) {
      g.beginPath();
      g.moveTo(50, 50);
      g.lineTo(50 - dir * 34, 20);
      for (var i = 1; i <= 6; i++) g.lineTo(50 - dir * (i % 2 ? 40 : 34), 20 + i * 10);
      g.closePath();
      fs(g, gr, 2.4);
      for (var k = 0; k < 4; k++) line(g, [50 - dir * 10, 50, 50 - dir * 34, 26 + k * 16], 'rgba(150,90,0,.45)', 1.2);
    }
    wing(1);
    wing(-1);
    ell(g, 50, 50, 8, 13, '#f5b82e');
    g.beginPath();
    g.moveTo(47, 38); g.quadraticCurveTo(44, 28, 38, 26);
    g.moveTo(53, 38); g.quadraticCurveTo(56, 28, 62, 26);
    g.lineWidth = 1.8;
    g.strokeStyle = OL;
    g.stroke();
    circ(g, 38, 26, 2, OL, 0);
    circ(g, 62, 26, 2, OL, 0);
    circ(g, 47.5, 47, 1.8, OL, 0);
    circ(g, 52.5, 47, 1.8, OL, 0);
    smile(g, 50, 52, 2.4, false);
  }

  var CAST = {
    rino: { name: 'Rinoceronte Pomodorino', bio: 'Half rhino, half tomato, all enthusiasm. Charges at salad bars.', draw: drawRino },
    ping: { name: 'Pinguino Tostino', bio: 'A penguin who is also a toaster. Pops out warm toast whenever someone says “buongiorno”.', draw: drawPing },
    gatto: { name: 'Gattino Lampadino', bio: 'A lightbulb cat with a plug for a tail. Has a bright idea roughly every nine seconds.', draw: drawGatto },
    rana: { name: 'Ranocchio Razzetto', bio: 'Frog pilot of a very small rocket. Countdown always starts at “ribbit”.', draw: drawRana },
    tarta: { name: 'Tartaruga Teierina', bio: 'Carries a teapot instead of a shell. Slow, but the tea is always ready.', draw: drawTarta },
    coni: { name: 'Coniglio Cornettone', bio: 'A bunny shaped like a croissant. Flaky, buttery and surprisingly fast.', draw: drawConi },
    polpo: { name: 'Polpo Pianolino', bio: 'Eight arms, one piano. Plays all the keys at once and calls it jazz.', draw: drawPolpo },
    feni: { name: 'Fenicottero Frullino', bio: 'A flamingo standing in a blender. Only makes pink smoothies, on one leg.', draw: drawFeni },
    luma: { name: 'Lumaca Lavatrice', bio: 'A snail with a washing machine for a shell. Every spin cycle takes a week.', draw: drawLuma },
    gira: { name: 'Giraffa Gelatina', bio: 'A giraffe neck on a strawberry jelly. Wobbles politely when it says hello.', draw: drawGira },
    bale: { name: 'Balena Bicicletta', bio: 'A whale on a bicycle. Nobody knows how it reaches the pedals.', draw: drawBale },
    orso: { name: 'Orsetto Ombrellone', bio: 'A beach bear who is his own umbrella. Never forgets sunglasses.', draw: drawOrso },
    cact: { name: 'Riccio Cactuccio', bio: 'A singing cactus in a flowerpot. Hugs are not recommended; songs are.', draw: drawCact },
    papp: { name: 'Pappagallo Pizzetta', bio: 'A parrot made of pizza. Repeats every topping you say.', draw: drawPapp },
    ippo: { name: 'Ippo Idrantino', bio: 'A hippo-shaped fire hydrant. Splashes everyone, especially on purpose.', draw: drawIppo },
    mucca: { name: 'Mucca Mongolfiera', bio: 'A cow-print hot-air balloon. Says “moo” from three kilometres up.', draw: drawMucca },
    gufo: { name: 'Gufo Orologino', bio: 'An owl with a clock in its tummy. Always on time, never awake in the morning.', draw: drawGufo },
    volpe: { name: 'Volpe Violino', bio: 'A fox with a violin body. Plays lullabies with its own fluffy tail.', draw: drawVolpe },
    delf: { name: 'Delfino Divano', bio: 'A dolphin who found the comfiest sofa in the sea and never left.', draw: drawDelf },
  };

  // Creatures you can adopt (generators): base cost, coins per second each.
  var GENS = [
    { id: 'ping', short: 'Tostino', cost: 15, cps: 0.1 },
    { id: 'gatto', short: 'Lampadino', cost: 100, cps: 1 },
    { id: 'rana', short: 'Razzetto', cost: 1100, cps: 8 },
    { id: 'tarta', short: 'Teierina', cost: 1.2e4, cps: 47 },
    { id: 'coni', short: 'Cornettone', cost: 1.3e5, cps: 260 },
    { id: 'polpo', short: 'Pianolino', cost: 1.4e6, cps: 1400 },
    { id: 'feni', short: 'Frullino', cost: 2e7, cps: 7800 },
    { id: 'luma', short: 'Lavatrice', cost: 3.3e8, cps: 4.4e4 },
    { id: 'gira', short: 'Gelatina', cost: 5.1e9, cps: 2.6e5 },
    { id: 'bale', short: 'Bicicletta', cost: 7.5e10, cps: 1.6e6 },
    { id: 'orso', short: 'Ombrellone', cost: 1e12, cps: 1e7 },
    { id: 'cact', short: 'Cactuccio', cost: 1.4e13, cps: 6.5e7 },
  ];

  /* ---------------- upgrades ---------------- */
  var UPG = [];
  [
    ['tap1', 'Squishy Nose', 100], ['tap2', 'Rubber Gloves', 900], ['tap3', 'Bonk Boots', 1.2e4],
    ['tap4', 'Golden Thumb', 2e5], ['tap5', 'Thunder Tap', 5e6], ['tap6', 'Mega Bonk', 1.5e8], ['tap7', 'Cosmic Bonk', 6e9],
  ].forEach(function (u) { UPG.push({ id: u[0], name: u[1], cost: u[2], kind: 'tap', desc: 'Coins per tap ×2' }); });
  [['tc1', 'Echo Fingers', 5e4, 0.02], ['tc2', 'Echo Palms', 5e6, 0.03], ['tc3', 'Echo Elbows', 5e8, 0.05]].forEach(function (u) {
    UPG.push({ id: u[0], name: u[1], cost: u[2], kind: 'tapcps', pct: u[3], desc: 'Taps also earn +' + Math.round(u[3] * 100) + '% of your coins/sec' });
  });
  var TIER_OWN = [1, 10, 25, 50, 100];
  var TIER_MUL = [10, 50, 500, 5e4, 5e6];
  var TIER_NAME = ['Pep Talk', 'Snack Break', 'Disco Hour', 'Tiny Crown', 'Golden Hat'];
  GENS.forEach(function (gd, gi) {
    for (var t = 0; t < 5; t++) {
      UPG.push({ id: gd.id + t, name: gd.short + ' ' + TIER_NAME[t], cost: gd.cost * TIER_MUL[t], kind: 'gen', gen: gi, own: TIER_OWN[t], desc: CAST[gd.id].name + ' earn ×2' });
    }
  });
  UPG.push({ id: 'luck', name: 'Lucky Horn', cost: 2.5e4, kind: 'misc', desc: 'Super bonks (×5 taps) happen twice as often' });
  UPG.push({ id: 'net', name: 'Butterfly Net', cost: 4e4, kind: 'misc', needGold: 1, desc: 'Golden Farfalline show up 40% more often' });
  UPG.push({ id: 'nap', name: 'Cozy Naps', cost: 2.5e5, kind: 'misc', desc: 'Offline earnings 50% → 100%' });
  UPG.push({ id: 'jar', name: 'Frenzy Jar', cost: 8e5, kind: 'misc', needGold: 3, desc: 'Golden bonuses last 50% longer' });
  UPG.push({ id: 'glue', name: 'Sticker Glue', cost: 2e6, kind: 'misc', needAlbum: 8, desc: 'Album bonus +3% → +6% per sticker' });
  var UPG_BY_ID = {};
  UPG.forEach(function (u) { UPG_BY_ID[u.id] = u; });

  /* ---------------- album (unlocked by milestones only) ---------------- */
  var SPECIAL = [
    { id: 'papp', text: 'Tap 500 times', check: function (S) { return S.tapsAll >= 500; }, prog: function (S) { return S.tapsAll / 500; } },
    { id: 'ippo', text: 'Earn 1M coins in total', check: function (S) { return S.allEarned >= 1e6; }, prog: function (S) { return S.allEarned / 1e6; } },
    { id: 'mucca', text: 'Catch 5 Golden Farfalline', check: function (S) { return S.golden >= 5; }, prog: function (S) { return S.golden / 5; } },
    { id: 'gufo', text: 'Reach 1K coins per second', check: function (S, c) { return S.bestCps >= 1000; }, prog: function (S) { return S.bestCps / 1000; } },
    { id: 'volpe', text: 'Own 100 creatures at once', check: function (S, c) { return c.owned >= 100; }, prog: function (S, c) { return c.owned / 100; } },
    { id: 'delf', text: 'Rebirth once', check: function (S) { return S.rebirths >= 1; }, prog: function (S) { return S.rebirths ? 1 : 0; } },
  ];
  var ALBUM = [{ id: 'rino', cast: 'rino', text: 'Your first friend' }];
  GENS.forEach(function (gd, gi) { ALBUM.push({ id: gd.id, cast: gd.id, gen: gi, need: 1, text: 'Adopt one ' + CAST[gd.id].name }); });
  SPECIAL.forEach(function (s) { ALBUM.push({ id: s.id, cast: s.id, special: s, text: s.text }); });
  GENS.forEach(function (gd, gi) { ALBUM.push({ id: 'gold-' + gd.id, cast: gd.id, gen: gi, need: 50, shiny: true, text: 'Own 50 ' + CAST[gd.id].name }); });
  var ALBUM_BY_ID = {};
  ALBUM.forEach(function (a) { ALBUM_BY_ID[a.id] = a; });

  /* ================================================================== */
  /* CSS                                                                 */
  /* ================================================================== */
  var CSS = [
    '.bc-app{position:absolute;inset:0;display:grid;font-size:var(--bc-fs,14px);color:#fff7ea;background:#1b1430;overflow:hidden;line-height:1.3;-webkit-user-select:none;user-select:none}',
    '.bc-app *{box-sizing:border-box}',
    '.bc-app.bc-wide{grid-template-columns:minmax(0,1fr) var(--bc-pw,40%)}',
    '.bc-app.bc-tall{grid-template-rows:var(--bc-sh,48%) minmax(0,1fr)}',
    '.bc-scene{position:relative;overflow:hidden;min-width:0;min-height:0;touch-action:manipulation}',
    '.bc-scene canvas{cursor:pointer}',
    '.bc-panel{display:flex;flex-direction:column;min-height:0;min-width:0;background:#221a3b;border-left:3px solid #120c22}',
    '.bc-tall .bc-panel{border-left:0;border-top:3px solid #120c22}',
    '.bc-tabs{display:flex;gap:.25em;padding:.45em .45em 0;flex:none;background:#1b1430}',
    '.bc-tab{position:relative;flex:1 1 0;min-width:0;border:0;background:transparent;color:#b9acd9;font:inherit;font-weight:900;font-size:.84em;padding:.62em .15em .55em;border-radius:.75em .75em 0 0;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation}',
    '.bc-tab:hover{color:#fff}',
    '.bc-tab.is-on{background:#2d2350;color:#ffd23f}',
    '.bc-dot{position:absolute;top:.3em;right:.3em;width:.55em;height:.55em;border-radius:50%;background:#ff5fa2;box-shadow:0 0 6px #ff5fa2;display:none}',
    '.bc-tab.has-dot .bc-dot{display:block}',
    '.bc-body{flex:1;display:flex;flex-direction:column;min-height:0;background:#2d2350}',
    '.bc-sub{flex:none;display:flex;align-items:center;gap:.4em;padding:.5em .6em .25em;color:#c9bfe6;font-size:.84em;flex-wrap:wrap}',
    '.bc-sub b{color:#fff}',
    '.bc-sub:empty{display:none}',
    '.bc-seg{display:inline-flex;margin-left:auto;background:#1b1430;border-radius:.6em;padding:.15em}',
    '.bc-seg button{border:0;background:transparent;color:#b9acd9;font:inherit;font-weight:900;padding:.22em .6em;border-radius:.45em;cursor:pointer;touch-action:manipulation}',
    '.bc-seg button.is-on{background:#ffd23f;color:#2b1e3f}',
    '.bc-list{flex:1;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:.35em .5em .8em;-webkit-overflow-scrolling:touch;scrollbar-width:thin}',
    '.bc-row{display:grid;grid-template-columns:2.9em minmax(0,1fr) auto;gap:.55em;align-items:center;background:#3a2e63;border-radius:.85em;padding:.35em .45em;margin-bottom:.4em;border:2px solid transparent}',
    '.bc-row.is-new{border-color:#ffd23f}',
    '.bc-row.is-lock{opacity:.55}',
    '.bc-ico{width:2.9em;height:2.9em;border-radius:.7em;background:#4a3d7a;display:block}',
    '.bc-ico.bc-q{display:grid;place-items:center;font-weight:900;font-size:1.3em;width:2.23em;height:2.23em;color:#8f82b8}',
    '.bc-nm{min-width:0}',
    '.bc-nm b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.95em}',
    '.bc-nm span{display:block;color:#c9bfe6;font-size:.78em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.bc-cnt{color:#ffd23f;font-weight:900;margin-left:.25em}',
    '.bc-buy{border:0;border-radius:.7em;padding:.45em .55em;min-width:5.6em;font:inherit;font-weight:900;cursor:pointer;color:#2b1e3f;line-height:1.1;text-align:center;touch-action:manipulation;background:linear-gradient(180deg,#ffe066,#ffb703);box-shadow:0 .2em 0 #b97a00}',
    '.bc-buy small{display:block;font-size:.74em;font-weight:800;opacity:.85}',
    '.bc-buy:active{transform:translateY(.12em);box-shadow:0 .08em 0 #b97a00}',
    '.bc-buy.is-off{background:#4a3d7a;color:#9a8fc2;box-shadow:0 .2em 0 #2b2250;cursor:default}',
    '.bc-buy.is-done{background:#2f5d4f;color:#8ff0c8;box-shadow:none;cursor:default}',
    '.bc-coin{display:inline-block;width:.85em;height:.85em;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff3a0,#ffc93c 55%,#e09a00);box-shadow:inset 0 0 0 .1em #b97a00;vertical-align:-.08em;margin-right:.18em}',
    '.bc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(5.6em,1fr));gap:.45em}',
    '.bc-card{position:relative;border:2px solid transparent;background:#3a2e63;border-radius:.8em;padding:.35em .25em .3em;text-align:center;cursor:pointer;color:inherit;font:inherit;touch-action:manipulation;min-width:0}',
    '.bc-card img{width:100%;max-width:4.6em;aspect-ratio:1;display:block;margin:0 auto}',
    '.bc-card b{display:block;font-size:.68em;line-height:1.15;margin-top:.15em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.bc-card.is-lock{cursor:default;background:#2a2147}',
    '.bc-card.is-lock b{color:#8f82b8;font-weight:700;white-space:normal}',
    '.bc-card.is-star{border-color:#ffd23f}',
    '.bc-card.is-shiny{background:linear-gradient(160deg,#5b4a1a,#3a2e63)}',
    '.bc-card i{position:absolute;top:.2em;right:.25em;font-style:normal;font-size:.7em;color:#ffd23f;font-weight:900}',
    '.bc-box{background:#3a2e63;border-radius:.9em;padding:.7em .8em;margin-bottom:.5em}',
    '.bc-box h4{margin:0 0 .3em;font-size:1.02em}',
    '.bc-box p{margin:.2em 0;color:#d6cdee;font-size:.88em}',
    '.bc-big{font-size:1.7em;font-weight:900;color:#ffd23f}',
    '.bc-bar{height:.4em;border-radius:1em;background:#1b1430;margin:.45em 0;overflow:hidden}',
    '.bc-bar i{display:block;height:100%;width:0;border-radius:1em;background:linear-gradient(90deg,#ff5fa2,#ffd23f)}',
    '.bc-wbtn{width:100%;border:0;border-radius:.8em;padding:.7em;font:inherit;font-weight:900;font-size:1.02em;cursor:pointer;touch-action:manipulation;color:#2b1e3f;background:linear-gradient(180deg,#8ff0c8,#3ee6a8);box-shadow:0 .22em 0 #1f9e70;margin-top:.3em}',
    '.bc-wbtn.is-off{background:#4a3d7a;color:#9a8fc2;box-shadow:none;cursor:default}',
    '.bc-kv{display:grid;grid-template-columns:1fr auto;gap:.25em .8em;font-size:.88em}',
    '.bc-kv span{color:#c9bfe6}',
    '.bc-kv b{text-align:right}',
    '.bc-tg{display:flex;align-items:center;justify-content:space-between;gap:.6em;padding:.45em 0;border-top:1px solid rgba(255,255,255,.08);font-size:.9em}',
    '.bc-tg:first-of-type{border-top:0}',
    '.bc-sw{flex:none;width:3em;height:1.6em;border-radius:1em;border:0;background:#1b1430;position:relative;cursor:pointer;touch-action:manipulation}',
    '.bc-sw::after{content:"";position:absolute;top:.2em;left:.2em;width:1.2em;height:1.2em;border-radius:50%;background:#8f82b8;transition:left .15s,background .15s}',
    '.bc-sw.is-on{background:#3ee6a8}',
    '.bc-sw.is-on::after{left:1.6em;background:#fff}',
    '.bc-sbtn{border:2px solid rgba(255,255,255,.15);background:#1b1430;color:#fff7ea;font:inherit;font-weight:900;padding:.5em .9em;border-radius:.7em;cursor:pointer;touch-action:manipulation;margin:.4em .4em 0 0}',
    '.bc-sbtn.is-danger{color:#ffb3c6;border-color:rgba(255,95,162,.5)}',
    '.bc-note{font-size:.8em;color:#a99dcc;margin-top:.35em}',
    '.bc-hud{position:absolute;left:0;right:0;top:0;padding:.55em .7em 0;display:flex;align-items:flex-start;gap:.5em;pointer-events:none;z-index:3}',
    '.bc-money{min-width:0;flex:1}',
    '.bc-pts{display:inline-block;font-weight:900;font-size:1.85em;line-height:1;color:#fff;letter-spacing:-.02em;white-space:nowrap;background:rgba(43,30,63,.78);border-radius:.5em;padding:.18em .45em .2em .35em}',
    '.bc-rate{display:inline-block;font-weight:800;font-size:.86em;color:#2b1e3f;margin-top:.3em;white-space:nowrap;background:rgba(255,247,234,.88);border-radius:1em;padding:.15em .6em}',
    '.bc-hud-r{display:flex;flex-direction:column;gap:.3em;align-items:flex-end}',
    '.bc-pill{font-weight:900;font-size:.82em;color:#fff;background:rgba(43,30,63,.78);border-radius:999px;padding:.25em .65em;white-space:nowrap}',
    '.bc-pill:empty{display:none}',
    '.bc-boost{color:#2b1e3f;background:linear-gradient(135deg,#fff3a0,#ffb703)}',
    '.bc-goal{position:absolute;left:.7em;bottom:.6em;z-index:3;max-width:min(22em,calc(100% - 1.4em));text-align:left;border:0;background:rgba(43,30,63,.82);color:#fff;font:inherit;font-size:.82em;font-weight:800;padding:.4em .7em .45em;border-radius:.7em;cursor:pointer;touch-action:manipulation}',
    '.bc-goal span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.bc-goal em{font-style:normal;color:#ffd23f;font-weight:900;margin-right:.3em}',
    '.bc-goal .bc-bar{margin:.3em 0 0;background:rgba(255,255,255,.15)}',
    '.bc-hint{position:absolute;left:50%;top:calc(var(--bc-fs) * 4.6);transform:translateX(-50%);z-index:3;max-width:calc(100% - 1.2em);font-weight:900;font-size:.9em;color:#2b1e3f;background:#fff7ea;border-radius:999px;padding:.35em .9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;box-shadow:0 .2em 0 rgba(0,0,0,.25);animation:bcBob 1.1s ease-in-out infinite}',
    '.bc-hint:empty{display:none}',
    '@keyframes bcBob{50%{transform:translate(-50%,-.25em)}}',
    '.bc-flash{animation:bcFlash .45s ease}',
    '@keyframes bcFlash{0%{background:#fff3a0}100%{background:#3a2e63}}',
    '.bc-detail{display:flex;gap:.7em;align-items:center}',
    '.bc-detail img{width:4.4em;height:4.4em;flex:none}',
  ].join('\n');

  IGAME.register('brainrot-clicker', function (ctx) {
    var ui = IGAME.ui;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var root = ctx.root;
    var destroyed = false;

    /* ---------------- state ---------------- */
    function freshState() {
      return {
        v: SAVE_VER,
        coins: 0, runEarned: 0, allEarned: 0,
        taps: 0, tapsAll: 0,
        gens: GENS.map(function () { return 0; }),
        upg: {}, album: { rino: 1 }, star: 'rino',
        sparks: 0, rebirths: 0, golden: 0, bestCps: 0, playTime: 0, supers: 0,
        introDone: false, lastSeen: Date.now(), buyAmt: 1,
        opt: { pops: true, fx: true, walk: true },
      };
    }
    function sanitize(o) {
      var s = freshState();
      if (!o || typeof o !== 'object' || o.v !== SAVE_VER) return s;
      ['coins', 'runEarned', 'allEarned', 'taps', 'tapsAll', 'sparks', 'rebirths', 'golden', 'bestCps', 'playTime', 'supers', 'lastSeen', 'buyAmt'].forEach(function (k) {
        var n = Number(o[k]);
        if (isFinite(n) && n >= 0) s[k] = n;
      });
      if (Array.isArray(o.gens)) for (var i = 0; i < GENS.length; i++) s.gens[i] = Math.max(0, Math.floor(Number(o.gens[i]) || 0));
      if (o.upg && typeof o.upg === 'object') for (var u in o.upg) if (UPG_BY_ID[u]) s.upg[u] = 1;
      if (o.album && typeof o.album === 'object') for (var a in o.album) if (ALBUM_BY_ID[a]) s.album[a] = 1;
      if (o.star && ALBUM_BY_ID[o.star] && s.album[o.star]) s.star = o.star;
      s.introDone = !!o.introDone;
      if (o.opt && typeof o.opt === 'object') ['pops', 'fx', 'walk'].forEach(function (k) { if (typeof o.opt[k] === 'boolean') s.opt[k] = o.opt[k]; });
      if ([1, 10, 0].indexOf(s.buyAmt) < 0) s.buyAmt = 1;
      return s;
    }
    var saved = store.get('save', null);
    var hadSave = !!(saved && saved.v === SAVE_VER);
    var S = sanitize(saved);
    function save() {
      if (destroyed) return;
      S.lastSeen = Date.now();
      store.set('save', S);
    }

    /* ---------------- derived economy ---------------- */
    var C = { genMul: [], cpsBase: 0, tapBase: 1, global: 1, owned: 0, albumCount: 1, tapCpsPct: 0 };
    function has(id) { return !!S.upg[id]; }
    function recalc() {
      var album = 0;
      for (var a in S.album) if (S.album[a]) album++;
      C.albumCount = album;
      var albumPct = has('glue') ? 0.06 : 0.03;
      C.global = (1 + S.sparks * SPARK_BONUS) * (1 + album * albumPct);
      var cps = 0, owned = 0;
      for (var i = 0; i < GENS.length; i++) {
        var m = 1;
        for (var t = 0; t < 5; t++) if (has(GENS[i].id + t)) m *= 2;
        C.genMul[i] = m;
        cps += S.gens[i] * GENS[i].cps * m;
        owned += S.gens[i];
      }
      C.owned = owned;
      C.cpsBase = cps * C.global;
      var tap = 1;
      ['tap1', 'tap2', 'tap3', 'tap4', 'tap5', 'tap6', 'tap7'].forEach(function (id) { if (has(id)) tap *= 2; });
      C.tapCpsPct = (has('tc1') ? 0.02 : 0) + (has('tc2') ? 0.03 : 0) + (has('tc3') ? 0.05 : 0);
      C.tapBase = tap * C.global;
      if (C.cpsBase > S.bestCps) S.bestCps = C.cpsBase;
    }
    function cpsNow() { return C.cpsBase * (boost.t > 0 && boost.kind === 'frenzy' ? 7 : 1); }
    function tapValue() { return (C.tapBase + C.cpsBase * C.tapCpsPct) * (boost.t > 0 && boost.kind === 'tap' ? 10 : 1); }
    function genCost(i, n) {
      var gd = GENS[i];
      var c0 = gd.cost * Math.pow(GROWTH, S.gens[i]);
      return (c0 * (Math.pow(GROWTH, n) - 1)) / (GROWTH - 1);
    }
    function maxAffordable(i) {
      var c0 = GENS[i].cost * Math.pow(GROWTH, S.gens[i]);
      if (S.coins < c0) return 0;
      return Math.floor(Math.log(1 + (S.coins * (GROWTH - 1)) / c0) / Math.log(GROWTH));
    }
    function earn(n) {
      if (!(n > 0)) return;
      S.coins += n;
      S.runEarned += n;
      S.allEarned += n;
    }
    function sparksAvailable() {
      return Math.max(0, Math.floor(Math.sqrt(S.allEarned / REBIRTH_BASE)) - S.sparks);
    }

    /* ---------------- DOM ---------------- */
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var app = ui.el('div', 'bc-app bc-wide');
    root.appendChild(app);
    var scene = ui.el('div', 'bc-scene');
    app.appendChild(scene);
    var panel = ui.el('div', 'bc-panel');
    app.appendChild(panel);

    var hud = ui.el('div', 'bc-hud');
    hud.innerHTML =
      '<div class="bc-money"><div class="bc-pts"><span class="bc-coin"></span><span></span></div><br><div class="bc-rate"></div></div>' +
      '<div class="bc-hud-r"><span class="bc-pill bc-sp"></span><span class="bc-pill bc-boost"></span></div>';
    scene.appendChild(hud);
    var elPts = hud.querySelector('.bc-pts span:last-child');
    var elRate = hud.querySelector('.bc-rate');
    var elSp = hud.querySelector('.bc-sp');
    var elBoost = hud.querySelector('.bc-boost');
    var goalBtn = ui.el('button', 'bc-goal', '<span></span><div class="bc-bar"><i></i></div>');
    goalBtn.type = 'button';
    goalBtn.setAttribute('data-act', 'goal');
    scene.appendChild(goalBtn);
    var elGoalT = goalBtn.querySelector('span');
    var elGoalBar = goalBtn.querySelector('i');
    var elHint = ui.el('div', 'bc-hint', '');
    scene.appendChild(elHint);

    var TABS = ['Creatures', 'Upgrades', 'Album', 'Rebirth', '⚙'];
    var tabsEl = ui.el('div', 'bc-tabs');
    TABS.forEach(function (label, i) {
      var b = ui.el('button', 'bc-tab', esc(label) + '<span class="bc-dot"></span>');
      b.type = 'button';
      b.setAttribute('data-act', 'tab');
      b.setAttribute('data-i', i);
      if (i === 4) b.setAttribute('aria-label', 'Settings and stats');
      tabsEl.appendChild(b);
    });
    panel.appendChild(tabsEl);
    var tabBtns = tabsEl.querySelectorAll('.bc-tab');
    var body = ui.el('div', 'bc-body');
    panel.appendChild(body);
    var subEl = ui.el('div', 'bc-sub');
    body.appendChild(subEl);
    var listEl = ui.el('div', 'bc-list');
    body.appendChild(listEl);

    /* ---------------- layout ---------------- */
    var tall = false;
    var FS = 14;
    function layout() {
      var r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tall = r.width / r.height < 1.15;
      app.classList.toggle('bc-tall', tall);
      app.classList.toggle('bc-wide', !tall);
      FS = tall ? clamp(Math.min(r.width / 29, r.height / 36), 11.5, 16) : clamp(Math.min(r.width / 74, r.height / 40), 11.5, 17);
      app.style.setProperty('--bc-fs', FS.toFixed(2) + 'px');
      app.style.setProperty('--bc-pw', clamp(Math.round(FS * 27), 280, Math.round(r.width * 0.5)) + 'px');
      app.style.setProperty('--bc-sh', '52%');
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
    if (ro) ro.observe(root);
    else window.addEventListener('resize', layout);
    layout();

    /* ---------------- sprites ---------------- */
    var spriteCache = {};
    var iconCache = {};
    function makeSprite(id, px, mode) {
      var key = id + '|' + px + '|' + (mode || '');
      if (spriteCache[key]) return spriteCache[key];
      var c = document.createElement('canvas');
      c.width = c.height = Math.max(8, Math.round(px));
      var g2 = c.getContext('2d');
      g2.lineJoin = 'round';
      g2.lineCap = 'round';
      g2.scale(c.width / 100, c.height / 100);
      if (id === 'farf') drawFarf(g2);
      else CAST[id].draw(g2);
      g2.setTransform(1, 0, 0, 1, 0, 0);
      if (mode === 'gold') {
        // shiny variant: tint everything gold, then add sparkles
        g2.globalCompositeOperation = 'source-atop';
        var gr = g2.createLinearGradient(0, 0, c.width, c.height);
        gr.addColorStop(0, 'rgba(255,240,150,.62)');
        gr.addColorStop(0.5, 'rgba(255,196,40,.5)');
        gr.addColorStop(1, 'rgba(255,240,150,.62)');
        g2.fillStyle = gr;
        g2.fillRect(0, 0, c.width, c.height);
        g2.globalCompositeOperation = 'source-over';
        var u = c.width / 100;
        [[14, 18, 5], [86, 30, 4], [80, 84, 3.5]].forEach(function (s) { star4(g2, s[0] * u, s[1] * u, s[2] * u); });
      } else if (mode === 'lock') {
        g2.globalCompositeOperation = 'source-atop';
        g2.fillStyle = '#4a3d7a';
        g2.fillRect(0, 0, c.width, c.height);
        g2.globalCompositeOperation = 'source-over';
      }
      spriteCache[key] = c;
      return c;
    }
    function star4(g2, x, y, r) {
      g2.fillStyle = '#fffbe0';
      g2.beginPath();
      g2.moveTo(x, y - r);
      g2.quadraticCurveTo(x, y, x + r, y);
      g2.quadraticCurveTo(x, y, x, y + r);
      g2.quadraticCurveTo(x, y, x - r, y);
      g2.quadraticCurveTo(x, y, x, y - r);
      g2.fill();
    }
    function icon(id, mode) {
      var key = id + '|' + (mode || '');
      if (!iconCache[key]) iconCache[key] = makeSprite(id, 112, mode).toDataURL();
      return iconCache[key];
    }
    function albumIcon(a, unlocked) { return icon(a.cast, unlocked ? (a.shiny ? 'gold' : '') : 'lock'); }

    /* ---------------- canvas scene ---------------- */
    var W = 0, H = 0, SS = 100, CX = 0, FEET = 0, GROUND = 0, WALK = 40;
    var walkers = [];
    var walkerKey = '';
    var bg = document.createElement('canvas');
    var bgDirty = true;
    var starSprite = null;
    var view = IGAME.createCanvas(scene, {
      onResize: function (w, h) {
        W = w;
        H = h;
        var top = FS * 4.4;
        GROUND = H * 0.72;
        // leave a strip under the podium for the goal button
        FEET = Math.min(H * 0.86, H - FS * 3.4 - H * 0.06);
        SS = Math.max(60, Math.min(W * (tall ? 0.6 : 0.52), (FEET - top) * (tall ? 1 : 0.9)));
        spriteCache = {};
        CX = W / 2;
        WALK = clamp(SS * 0.3, 24, 70);
        bgDirty = true;
        starSprite = null;
        layoutWalkers();
      },
    });
    var g = view.ctx;

    function renderBg() {
      bgDirty = false;
      var dpr = view.dpr || 1;
      bg.width = Math.max(1, Math.round(W * dpr));
      bg.height = Math.max(1, Math.round(H * dpr));
      var b = bg.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      var sky = b.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, '#6fd3ff');
      sky.addColorStop(0.65, '#bdeeff');
      sky.addColorStop(1, '#ffe7c2');
      b.fillStyle = sky;
      b.fillRect(0, 0, W, H);
      // sun
      var sx = W * 0.82, sy = H * 0.2, sr = Math.min(W, H) * 0.09;
      var sg = b.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 2.6);
      sg.addColorStop(0, 'rgba(255,240,170,.9)');
      sg.addColorStop(1, 'rgba(255,240,170,0)');
      b.fillStyle = sg;
      b.fillRect(0, 0, W, H);
      b.fillStyle = '#fff2a8';
      b.beginPath();
      b.arc(sx, sy, sr, 0, TAU);
      b.fill();
      // distant hills
      b.fillStyle = '#9fe0a0';
      b.beginPath();
      b.moveTo(0, GROUND);
      for (var x = 0; x <= W + 20; x += 20) b.lineTo(x, GROUND - H * 0.07 - Math.sin(x / (W * 0.18)) * H * 0.04);
      b.lineTo(W, GROUND);
      b.closePath();
      b.fill();
      // little houses on the hills (cheap shapes)
      var hc = ['#ffb3a7', '#ffe08a', '#c7b3ff', '#ffd0e2'];
      for (var k = 0; k < 6; k++) {
        var hx = W * (0.06 + k * 0.17), hw = Math.max(10, H * 0.05), hy = GROUND - H * 0.07 - Math.sin(hx / (W * 0.18)) * H * 0.04;
        b.fillStyle = hc[k % 4];
        b.fillRect(hx, hy - hw * 0.9, hw, hw * 0.9);
        b.fillStyle = '#e8735a';
        b.beginPath();
        b.moveTo(hx - hw * 0.15, hy - hw * 0.85);
        b.lineTo(hx + hw / 2, hy - hw * 1.4);
        b.lineTo(hx + hw * 1.15, hy - hw * 0.85);
        b.fill();
      }
      // ground
      var gg = b.createLinearGradient(0, GROUND, 0, H);
      gg.addColorStop(0, '#7bd88f');
      gg.addColorStop(1, '#4fbf6c');
      b.fillStyle = gg;
      b.fillRect(0, GROUND, W, H - GROUND);
      b.fillStyle = 'rgba(255,255,255,.12)';
      for (var s = 0; s < 5; s++) b.fillRect(0, GROUND + (H - GROUND) * (s / 5) + 4, W, Math.max(2, (H - GROUND) * 0.05));
      // bunting across the top
      var by = Math.max(FS * 3.6, H * 0.12);
      b.strokeStyle = 'rgba(43,30,63,.5)';
      b.lineWidth = 1.5;
      b.beginPath();
      b.moveTo(0, by * 0.7);
      b.quadraticCurveTo(W / 2, by * 1.25, W, by * 0.7);
      b.stroke();
      var flags = ['#ff5fa2', '#ffd23f', '#3ee6a8', '#6fb7ff', '#b06cff'];
      var n = Math.max(6, Math.round(W / 46));
      for (var f = 1; f < n; f++) {
        var t = f / n;
        var fx = W * t;
        var fy = (1 - t) * (1 - t) * by * 0.7 + 2 * (1 - t) * t * by * 1.25 + t * t * by * 0.7;
        var fw = Math.min(14, W / n * 0.42);
        b.fillStyle = flags[f % flags.length];
        b.beginPath();
        b.moveTo(fx - fw, fy);
        b.lineTo(fx + fw, fy);
        b.lineTo(fx, fy + fw * 1.5);
        b.closePath();
        b.fill();
      }
    }

    var clouds = [0, 1, 2].map(function (i) { return { x: Math.random(), y: 0.2 + i * 0.12, s: 0.7 + Math.random() * 0.5, v: 0.006 + Math.random() * 0.008 }; });
    function drawClouds(dt) {
      g.fillStyle = 'rgba(255,255,255,.88)';
      for (var i = 0; i < clouds.length; i++) {
        var c = clouds[i];
        c.x += c.v * dt;
        if (c.x > 1.2) c.x = -0.2;
        var x = c.x * W, y = c.y * GROUND, r = Math.min(W, H) * 0.045 * c.s;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.arc(x + r * 1.1, y - r * 0.4, r * 1.2, 0, TAU);
        g.arc(x + r * 2.2, y, r * 0.95, 0, TAU);
        g.fill();
      }
    }

    /* ---------------- walkers: owned creatures strolling on the grass ---------------- */
    function layoutWalkers() {
      var want = [];
      for (var i = GENS.length - 1; i >= 0; i--) {
        if (!S.gens[i]) continue;
        var n = Math.min(3, 1 + Math.floor(Math.log10(S.gens[i])));
        for (var k = 0; k < n; k++) want.push(GENS[i].id + (S.gens[i] >= 50 && S.album['gold-' + GENS[i].id] && k === 0 ? '*' : ''));
      }
      want = want.slice(0, tall ? 10 : 16);
      var key = want.join(',') + '|' + Math.round(W) + 'x' + Math.round(H);
      if (key === walkerKey) return;
      walkerKey = key;
      var old = walkers;
      walkers = want.map(function (id, idx) {
        var prev = null;
        for (var j = 0; j < old.length; j++) if (old[j].id === id && !old[j].used) { prev = old[j]; prev.used = true; break; }
        var depth = ((idx * 0.37) % 1);
        return {
          id: id, gold: id.slice(-1) === '*', cast: id.replace('*', ''),
          x: prev ? prev.x : rand(0.05, 0.95) * W,
          depth: prev ? prev.depth : depth,
          dir: prev ? prev.dir : Math.random() < 0.5 ? -1 : 1,
          sp: prev ? prev.sp : rand(0.5, 1),
          ph: prev ? prev.ph : rand(0, TAU),
          rest: 0,
        };
      });
      walkers.sort(function (a, b) { return a.depth - b.depth; });
    }
    function drawWalkers(dt, front) {
      if (!S.opt.walk) return;
      var y0 = GROUND + (H - GROUND) * 0.18, y1 = H - WALK * 0.08;
      for (var i = 0; i < walkers.length; i++) {
        var w = walkers[i];
        var y = y0 + (y1 - y0) * w.depth;
        var isFront = y > FEET;
        if (isFront !== front) continue;
        var size = Math.round(WALK * (0.8 + w.depth * 0.35) / 4) * 4;
        if (w.rest > 0) w.rest -= dt;
        else {
          w.x += w.dir * w.sp * size * 0.9 * dt;
          w.ph += dt * 9 * w.sp;
          if (w.x < size * 0.5) { w.x = size * 0.5; w.dir = 1; }
          if (w.x > W - size * 0.5) { w.x = W - size * 0.5; w.dir = -1; }
          if (Math.random() < dt * 0.15) w.rest = rand(0.6, 2);
        }
        var hop = w.rest > 0 ? 0 : Math.abs(Math.sin(w.ph)) * size * 0.12;
        var spr = makeSprite(w.cast, Math.round(size * (view.dpr || 1)), w.gold ? 'gold' : '');
        g.fillStyle = 'rgba(30,60,30,.22)';
        g.beginPath();
        g.ellipse(w.x, y, size * 0.32, size * 0.07, 0, 0, TAU);
        g.fill();
        g.save();
        g.translate(w.x, y - hop);
        if (w.dir < 0) g.scale(-1, 1);
        g.drawImage(spr, -size / 2, -size * 0.95, size, size);
        g.restore();
      }
    }

    /* ---------------- effects pools ---------------- */
    var pops = [];
    for (var pi = 0; pi < 36; pi++) pops.push({ on: false });
    var coinsP = [];
    for (var ci = 0; ci < 70; ci++) coinsP.push({ on: false });
    var rings = [];
    function addPop(x, y, text, color, size) {
      if (!S.opt.pops) return;
      var p = null;
      for (var i = 0; i < pops.length; i++) if (!pops[i].on) { p = pops[i]; break; }
      if (!p) { p = pops[0]; }
      p.on = true; p.x = x; p.y = y; p.vx = rand(-18, 18); p.vy = -FS * 6; p.life = 0; p.max = 0.95; p.text = text; p.color = color || '#fff'; p.size = size || FS * 1.5; p.w = 0;
    }
    function addCoins(x, y, n, power) {
      for (var k = 0; k < n; k++) {
        var p = null;
        for (var i = 0; i < coinsP.length; i++) if (!coinsP[i].on) { p = coinsP[i]; break; }
        if (!p) return;
        var a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        var sp = rand(120, 260) * (power || 1) * (SS / 220);
        p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = 0; p.max = rand(0.6, 1); p.r = rand(0.7, 1.15);
      }
    }
    var coinSpr = null;
    function coinSprite() {
      if (coinSpr) return coinSpr;
      var c = document.createElement('canvas');
      c.width = c.height = 32;
      var x = c.getContext('2d');
      var gr = x.createRadialGradient(12, 11, 2, 16, 16, 15);
      gr.addColorStop(0, '#fff6b0');
      gr.addColorStop(0.55, '#ffc93c');
      gr.addColorStop(1, '#e09a00');
      x.fillStyle = gr;
      x.beginPath();
      x.arc(16, 16, 14, 0, TAU);
      x.fill();
      x.lineWidth = 2.5;
      x.strokeStyle = '#b97a00';
      x.stroke();
      x.strokeStyle = 'rgba(185,122,0,.7)';
      x.lineWidth = 2;
      x.beginPath();
      x.arc(16, 16, 8, 0, TAU);
      x.stroke();
      coinSpr = c;
      return c;
    }

    /* ---------------- star creature ---------------- */
    var squash = { x: 0, v: 0 }; // spring: + is wider/flatter
    var tilt = { x: 0, v: 0 };
    var shake = 0;
    var flashT = 0;
    function starBox() { return { x: CX - SS / 2, y: FEET - SS * 0.95, s: SS }; }
    function hitStar(x, y) {
      var cx = CX, cy = FEET - SS * 0.47;
      var dx = (x - cx) / (SS * 0.5), dy = (y - cy) / (SS * 0.52);
      return dx * dx + dy * dy <= 1.15;
    }
    function starCast() { return ALBUM_BY_ID[S.star] ? ALBUM_BY_ID[S.star].cast : 'rino'; }
    function starMode() { return ALBUM_BY_ID[S.star] && ALBUM_BY_ID[S.star].shiny ? 'gold' : ''; }

    var lastTapSfx = 0;
    function doTap(x, y) {
      var v = tapValue();
      var superChance = LUCKY_TAP * (has('luck') ? 2 : 1);
      var isSuper = Math.random() < superChance;
      if (isSuper) { v *= 5; S.supers++; }
      earn(v);
      S.taps++;
      S.tapsAll++;
      squash.v += isSuper ? 5 : 3;
      tilt.v += (x < CX ? -1 : 1) * (isSuper ? 3 : 1.6);
      if (isSuper) {
        addPop(x, y - FS, 'SUPER BONK! +' + fmtC(v), '#ffd23f', FS * 1.8);
        addCoins(x, y, 10, 1.3);
        if (S.opt.fx) shake = Math.max(shake, 0.35);
        sfx('coin');
      } else {
        addPop(x, y, '+' + fmtC(v), '#fff', FS * 1.45);
        addCoins(x, y, 3, 1);
      }
      rings.push({ x: x, y: y, r: SS * 0.05, a: 0.7 });
      if (rings.length > 6) rings.shift();
      var now = performance.now();
      if (now - lastTapSfx > 45) {
        lastTapSfx = now;
        var f = 260 + Math.random() * 90;
        sfx({ f: f, f2: f * 2.1, d: 0.09, type: 'sine', v: 0.11 });
      }
      checkAlbum();
    }

    /* ---------------- golden farfallina ---------------- */
    var golden = null;
    var goldenTimer = 45;
    var boost = { kind: '', t: 0, dur: 0 };
    function spawnGolden() {
      var fromLeft = Math.random() < 0.5;
      golden = {
        x: fromLeft ? -30 : W + 30,
        y0: rand(H * 0.22, Math.max(H * 0.25, FEET - SS * 0.6)),
        dir: fromLeft ? 1 : -1,
        t: 0, life: 11,
        size: clamp(SS * 0.26, 34, 70),
      };
      golden.y = golden.y0;
      sfx({ f: 1320, f2: 1760, d: 0.18, type: 'sine', v: 0.06 });
    }
    function catchGolden() {
      if (!golden) return false;
      var gx = golden.x, gy = golden.y;
      golden = null;
      S.golden++;
      goldenTimer = rand(70, 150) / (has('net') ? 1.4 : 1);
      var lenMul = has('jar') ? 1.5 : 1;
      var r = Math.random();
      var msg;
      if (r < 0.45 && C.cpsBase > 0) {
        boost = { kind: 'frenzy', t: 30 * lenMul, dur: 30 * lenMul };
        msg = 'Frenzy! Coins/sec ×7';
      } else if (r < 0.62) {
        boost = { kind: 'tap', t: 15 * lenMul, dur: 15 * lenMul };
        msg = 'Tap Mania! Taps ×10';
      } else {
        var gain = Math.max(Math.min(S.coins * 0.15, C.cpsBase * 900), C.cpsBase * 60, tapValue() * 40) + 13;
        earn(gain);
        msg = 'Lucky! +' + fmt(gain) + ' coins';
      }
      addPop(gx, gy, msg, '#ffd23f', FS * 1.4);
      addCoins(gx, gy, 14, 1.2);
      flashT = 0.35;
      sfx('win');
      ui.toast(root, msg, 1600);
      checkAlbum();
      return true;
    }

    /* ---------------- album checks ---------------- */
    var newCards = 0;
    var stickerQueue = [];
    var stickerTimer = 0;
    function checkAlbum() {
      var got = [];
      for (var i = 0; i < ALBUM.length; i++) {
        var a = ALBUM[i];
        if (S.album[a.id]) continue;
        var ok = false;
        if (a.gen != null) ok = S.gens[a.gen] >= a.need;
        else if (a.special) ok = a.special.check(S, C);
        if (ok) { S.album[a.id] = 1; got.push(a); }
      }
      if (!got.length) return;
      recalc();
      newCards += got.length;
      // batch sticker toasts so quick bulk-buys don't stack a tower of messages
      got.forEach(function (a) { stickerQueue.push((a.shiny ? 'Golden ' : '') + CAST[a.cast].name); });
      if (!stickerTimer) {
        stickerTimer = setTimeout(function () {
          stickerTimer = 0;
          if (destroyed || !stickerQueue.length) return;
          ui.toast(root, stickerQueue.length === 1 ? 'New sticker: ' + stickerQueue[0] + '!' : stickerQueue.length + ' new stickers! See the Album', 1800);
          stickerQueue = [];
        }, 300);
      }
      sfx('levelup');
      if (tab === 2) renderPanel();
      save();
    }

    /* ---------------- buying ---------------- */
    function buyGen(i) {
      var n = S.buyAmt === 0 ? maxAffordable(i) : S.buyAmt;
      if (n < 1) n = 1;
      var cost = genCost(i, n);
      if (S.coins < cost) { sfx('error'); return; }
      S.coins -= cost;
      var first = S.gens[i] === 0;
      S.gens[i] += n;
      recalc();
      sfx('buy');
      layoutWalkers();
      if (first) {
        var w = walkers.filter(function (x) { return x.cast === GENS[i].id; })[0];
        if (w) { w.x = CX + (Math.random() < 0.5 ? -1 : 1) * SS * 0.6; }
      }
      checkAlbum();
      structural();
      save();
    }
    function buyUpg(id) {
      var u = UPG_BY_ID[id];
      if (!u || S.upg[id]) return;
      if (S.coins < u.cost) { sfx('error'); return; }
      S.coins -= u.cost;
      S.upg[id] = 1;
      recalc();
      sfx('match');
      ui.toast(root, u.name + ': ' + u.desc, 1500);
      structural();
      save();
    }
    function upgVisible(u) {
      if (S.upg[u.id]) return false;
      if (u.kind === 'gen') return S.gens[u.gen] >= u.own;
      if (u.needGold && S.golden < u.needGold) return false;
      if (u.needAlbum && C.albumCount < u.needAlbum) return false;
      return S.runEarned >= u.cost * 0.25 || S.coins >= u.cost * 0.5;
    }
    function availableUpgs() {
      return UPG.filter(upgVisible).sort(function (a, b) { return a.cost - b.cost; });
    }

    /* ---------------- rebirth / reset ---------------- */
    function doRebirth() {
      var gain = sparksAvailable();
      if (gain < 1) return;
      S.sparks += gain;
      S.rebirths++;
      S.coins = 0;
      S.runEarned = 0;
      S.taps = 0;
      S.gens = GENS.map(function () { return 0; });
      S.upg = {};
      boost = { kind: '', t: 0, dur: 0 };
      recalc();
      checkAlbum();
      layoutWalkers();
      squash.v += 6;
      flashT = 0.6;
      addCoins(CX, FEET - SS * 0.5, 30, 1.6);
      sfx('boost');
      sfx('win');
      ui.toast(root, 'Reborn! +' + gain + ' Sparks · coins ×' + (1 + S.sparks * SPARK_BONUS).toFixed(1) + ' forever', 2200);
      setTab(0);
      save();
    }
    function confirmRebirth() {
      var gain = sparksAvailable();
      if (gain < 1) { sfx('error'); return; }
      var ov = ui.overlay(root, {
        title: 'Rebirth?',
        html:
          '<p style="margin:0 0 8px">You will gain <b style="color:#ffd23f">+' + gain + ' Sparks</b> — every Spark gives <b>+10% coins</b> forever (total ×' + (1 + (S.sparks + gain) * SPARK_BONUS).toFixed(1) + ').</p>' +
          '<p style="margin:0;font-size:13px;opacity:.85">Coins, creatures and upgrades reset. Album stickers, Sparks and stats stay.</p>',
        buttons: [
          { label: 'Rebirth!', primary: true, onClick: function () { ov.close(); doRebirth(); } },
          { label: 'Not yet', onClick: function () { ov.close(); } },
        ],
      });
    }
    function confirmReset() {
      var ov = ui.overlay(root, {
        title: 'Reset everything?',
        html: '<p style="margin:0">This deletes your coins, creatures, upgrades, Sparks, album and stats on this device. It cannot be undone.</p>',
        buttons: [
          { label: 'Keep playing', primary: true, onClick: function () { ov.close(); } },
          {
            label: 'Yes, reset',
            onClick: function () {
              ov.close();
              var opt = S.opt;
              S = freshState();
              S.opt = opt;
              S.introDone = true;
              boost = { kind: '', t: 0, dur: 0 };
              golden = null;
              goldenTimer = 45;
              recalc();
              layoutWalkers();
              starSprite = null;
              setTab(0);
              save();
              ui.toast(root, 'Fresh start!', 1200);
            },
          },
        ],
      });
    }

    /* ---------------- panel ---------------- */
    var tab = 0;
    var refs = {};
    var structKey = '';
    function coinHtml(n) { return '<span class="bc-coin"></span>' + fmtC(n); }
    function setTab(i) {
      tab = i;
      for (var k = 0; k < tabBtns.length; k++) tabBtns[k].classList.toggle('is-on', k === i);
      if (i === 2) newCards = 0;
      renderPanel();
      listEl.scrollTop = 0;
    }
    function visibleGens() {
      // owned creatures, plus the next two you could save up for
      var n = 0;
      for (var i = 0; i < GENS.length; i++) if (S.gens[i] > 0 || S.allEarned >= GENS[i].cost * 0.35 || i === 0) n = i + 1;
      return Math.min(GENS.length, Math.max(1, n + 1));
    }
    function structural() {
      // re-render when what is listed changes (not just numbers)
      var k = tab + '|' + visibleGens() + '|' + availableUpgs().map(function (u) { return u.id; }).join(',') + '|' + S.buyAmt + '|' + C.albumCount + '|' + S.star;
      if (k !== structKey) renderPanel();
    }
    function renderPanel() {
      structKey = tab + '|' + visibleGens() + '|' + availableUpgs().map(function (u) { return u.id; }).join(',') + '|' + S.buyAmt + '|' + C.albumCount + '|' + S.star;
      refs = {};
      var h = '';
      var sub = '';
      if (tab === 0) {
        sub = '<span>Adopt creatures</span><span class="bc-seg">' +
          [[1, '×1'], [10, '×10'], [0, 'Max']].map(function (b) {
            return '<button type="button" data-act="amt" data-n="' + b[0] + '" class="' + (S.buyAmt === b[0] ? 'is-on' : '') + '">' + b[1] + '</button>';
          }).join('') + '</span>';
        var vis = visibleGens();
        for (var i = 0; i < vis; i++) {
          var gd = GENS[i];
          var known = S.gens[i] > 0 || S.allEarned >= gd.cost * 0.35 || i === 0;
          if (!known) {
            h += '<div class="bc-row is-lock"><span class="bc-ico bc-q">?</span><div class="bc-nm"><b>???</b><span>Earn more coins to discover</span></div>' +
              '<button type="button" class="bc-buy is-off" disabled>' + coinHtml(gd.cost) + '</button></div>';
            continue;
          }
          h += '<div class="bc-row" data-g="' + i + '"><img class="bc-ico" alt="" src="' + icon(gd.id) + '">' +
            '<div class="bc-nm"><b>' + esc(CAST[gd.id].name) + '<span class="bc-cnt" data-r="cnt' + i + '"></span></b><span data-r="rate' + i + '"></span></div>' +
            '<button type="button" class="bc-buy" data-act="buy" data-i="' + i + '" data-r="btn' + i + '"></button></div>';
        }
      } else if (tab === 1) {
        var list = availableUpgs();
        var ownedN = Object.keys(S.upg).length;
        sub = '<span>Upgrades owned: <b>' + ownedN + '</b> / ' + UPG.length + '</span>';
        if (!list.length) h += '<div class="bc-box"><p>No upgrades available right now. Earn more coins or adopt more creatures — new upgrades appear at 1, 10, 25, 50 and 100 of each creature.</p></div>';
        list.forEach(function (u) {
          var ic = u.kind === 'gen' ? icon(GENS[u.gen].id) : u.kind === 'misc' && (u.id === 'net' || u.id === 'jar') ? icon('farf') : icon(starCast(), starMode());
          h += '<div class="bc-row"><img class="bc-ico" alt="" src="' + ic + '"><div class="bc-nm"><b>' + esc(u.name) + '</b><span>' + esc(u.desc) + '</span></div>' +
            '<button type="button" class="bc-buy" data-act="upg" data-id="' + u.id + '" data-r="u' + u.id + '">' + coinHtml(u.cost) + '</button></div>';
        });
      } else if (tab === 2) {
        var pct = has('glue') ? 6 : 3;
        sub = '<span>Stickers <b>' + C.albumCount + '</b> / ' + ALBUM.length + ' · each gives <b>+' + pct + '%</b> coins · tap one to make it your star</span>';
        var cur = ALBUM_BY_ID[S.star];
        h += '<div class="bc-box bc-detail"><img alt="" src="' + albumIcon(cur, true) + '"><div><h4>' + (cur.shiny ? 'Golden ' : '') + esc(CAST[cur.cast].name) + '</h4><p>' + esc(CAST[cur.cast].bio) + '</p></div></div>';
        h += '<div class="bc-grid">';
        ALBUM.forEach(function (a) {
          var un = !!S.album[a.id];
          var cls = 'bc-card' + (un ? '' : ' is-lock') + (a.shiny ? ' is-shiny' : '') + (S.star === a.id ? ' is-star' : '');
          var label = un ? (a.shiny ? 'Golden ' : '') + CAST[a.cast].name.split(' ')[0] : esc(a.text);
          var prog = '';
          if (!un && a.special) prog = ' (' + Math.min(99, Math.floor(a.special.prog(S, C) * 100)) + '%)';
          else if (!un && a.gen != null && a.need > 1) prog = ' (' + S.gens[a.gen] + '/' + a.need + ')';
          h += '<button type="button" class="' + cls + '" data-act="card" data-id="' + a.id + '"' + (un ? '' : ' aria-disabled="true"') + ' title="' + esc(un ? CAST[a.cast].name : a.text) + '">' +
            (S.star === a.id ? '<i>★</i>' : '') + '<img alt="" src="' + albumIcon(a, un) + '"><b>' + label + prog + '</b></button>';
        });
        h += '</div>';
      } else if (tab === 3) {
        sub = '<span>Sparks <b>' + S.sparks + '</b> · rebirths <b>' + S.rebirths + '</b></span>';
        h += '<div class="bc-box"><h4>Rebirth for Sparks ✨</h4><p>Start over with a permanent bonus. Every Spark adds <b>+10%</b> to all coins (taps and creatures) forever. Sparks come from your all-time coins: 1M gives the first, and it takes 4× the coins to double them.</p>' +
          '<p>Current bonus: <b data-r="spmul"></b></p><div class="bc-big" data-r="spgain"></div><div class="bc-bar"><i data-r="spbar"></i></div><p data-r="spnext"></p>' +
          '<button type="button" class="bc-wbtn" data-act="rebirth" data-r="spbtn">Rebirth</button></div>' +
          '<div class="bc-box"><p>You keep: album stickers, Sparks and stats. You lose: coins, creatures and upgrades. Rebirthing once unlocks a special sticker.</p></div>';
      } else {
        sub = '<span>Settings &amp; stats</span>';
        h += '<div class="bc-box"><h4>Stats</h4><div class="bc-kv" data-r="stats"></div></div>';
        h += '<div class="bc-box"><h4>Settings</h4>' +
          [['pops', 'Floating numbers'], ['fx', 'Screen shake & flashes'], ['walk', 'Creatures walking on the grass']].map(function (o) {
            return '<div class="bc-tg"><span>' + o[1] + '</span><button type="button" class="bc-sw' + (S.opt[o[0]] ? ' is-on' : '') + '" data-act="opt" data-k="' + o[0] + '" aria-pressed="' + S.opt[o[0]] + '" aria-label="' + o[1] + '"></button></div>';
          }).join('') +
          '<p class="bc-note">Sound: use the speaker button under the game. Progress autosaves every few seconds and creatures keep earning while you are away (up to 8 hours).</p>' +
          '<button type="button" class="bc-sbtn" data-act="save">Save now</button><button type="button" class="bc-sbtn is-danger" data-act="reset">Reset progress…</button></div>' +
          '<div class="bc-box"><p class="bc-note">Keys: <span class="ig-kbd">Space</span> tap · <span class="ig-kbd">G</span> catch the Golden Farfallina · <span class="ig-kbd">B</span> buy amount · <span class="ig-kbd">1</span>–<span class="ig-kbd">5</span> tabs</p></div>';
      }
      subEl.innerHTML = sub;
      listEl.innerHTML = h;
      var rs = listEl.querySelectorAll('[data-r]');
      for (var r = 0; r < rs.length; r++) refs[rs[r].getAttribute('data-r')] = rs[r];
      refreshPanel();
    }
    function refreshPanel() {
      if (tab === 0) {
        for (var i = 0; i < GENS.length; i++) {
          var btn = refs['btn' + i];
          if (!btn) continue;
          var n = S.buyAmt === 0 ? Math.max(1, maxAffordable(i)) : S.buyAmt;
          var cost = genCost(i, n);
          var can = S.coins >= cost;
          btn.className = 'bc-buy' + (can ? '' : ' is-off');
          var html = coinHtml(cost) + '<small>Buy ×' + n + '</small>';
          if (btn._h !== html) { btn.innerHTML = html; btn._h = html; }
          refs['cnt' + i].textContent = S.gens[i] ? '×' + S.gens[i] : '';
          var each = GENS[i].cps * C.genMul[i] * C.global;
          refs['rate' + i].textContent = '+' + fmt(each) + '/s each' + (S.gens[i] ? ' · ' + fmt(each * S.gens[i]) + '/s total' : '');
        }
      } else if (tab === 1) {
        for (var k in refs) {
          if (k.charAt(0) !== 'u') continue;
          var u = UPG_BY_ID[k.slice(1)];
          if (u) refs[k].className = 'bc-buy' + (S.coins >= u.cost ? '' : ' is-off');
        }
      } else if (tab === 3) {
        var gain = sparksAvailable();
        var total = Math.floor(Math.sqrt(S.allEarned / REBIRTH_BASE));
        var nextAt = Math.pow(total + 1, 2) * REBIRTH_BASE;
        var prevAt = Math.pow(total, 2) * REBIRTH_BASE;
        refs.spmul.textContent = '×' + (1 + S.sparks * SPARK_BONUS).toFixed(1) + ' (' + S.sparks + ' Sparks)';
        refs.spgain.textContent = gain > 0 ? '+' + gain + ' Spark' + (gain > 1 ? 's' : '') + ' ready' : 'No Sparks yet';
        refs.spbar.style.width = (clamp((S.allEarned - prevAt) / Math.max(1, nextAt - prevAt), 0, 1) * 100).toFixed(1) + '%';
        refs.spnext.textContent = 'Next Spark at ' + fmt(nextAt) + ' all-time coins (now ' + fmt(S.allEarned) + ')';
        refs.spbtn.className = 'bc-wbtn' + (gain > 0 ? '' : ' is-off');
        refs.spbtn.textContent = gain > 0 ? 'Rebirth for +' + gain + ' ✨' : 'Rebirth (needs 1 Spark)';
      } else if (tab === 4) {
        var st = [
          ['Coins this run', fmt(S.runEarned)], ['All-time coins', fmt(S.allEarned)], ['Coins per second', fmt(cpsNow())],
          ['Best coins/sec', fmt(S.bestCps)], ['Coins per tap', fmt(tapValue())], ['Taps (all-time)', fmt(S.tapsAll)],
          ['Super bonks', fmt(S.supers)], ['Creatures owned', fmt(C.owned)], ['Golden Farfalline caught', fmt(S.golden)],
          ['Album', C.albumCount + ' / ' + ALBUM.length], ['Rebirths', S.rebirths], ['Play time', IGAME.fmtTime(S.playTime)],
        ];
        var sh = st.map(function (r) { return '<span>' + r[0] + '</span><b>' + r[1] + '</b>'; }).join('');
        if (refs.stats._h !== sh) { refs.stats.innerHTML = sh; refs.stats._h = sh; }
      }
      // red dots: affordable upgrade / new sticker / spark ready
      var aff = availableUpgs().some(function (u) { return S.coins >= u.cost; });
      tabBtns[1].classList.toggle('has-dot', aff && tab !== 1);
      tabBtns[2].classList.toggle('has-dot', newCards > 0 && tab !== 2);
      tabBtns[3].classList.toggle('has-dot', sparksAvailable() > 0 && tab !== 3);
    }

    function onClick(e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t || !app.contains(t)) return;
      var act = t.getAttribute('data-act');
      if (act === 'tab') { sfx('click'); setTab(+t.getAttribute('data-i')); }
      else if (act === 'buy') buyGen(+t.getAttribute('data-i'));
      else if (act === 'upg') buyUpg(t.getAttribute('data-id'));
      else if (act === 'amt') { S.buyAmt = +t.getAttribute('data-n'); sfx('click'); renderPanel(); }
      else if (act === 'card') {
        var id = t.getAttribute('data-id');
        if (!S.album[id]) { sfx('error'); ui.toast(root, ALBUM_BY_ID[id].text + ' to unlock', 1200); return; }
        S.star = id;
        starSprite = null;
        squash.v += 4;
        sfx('pop');
        renderPanel();
        save();
      } else if (act === 'rebirth') confirmRebirth();
      else if (act === 'opt') {
        var k = t.getAttribute('data-k');
        S.opt[k] = !S.opt[k];
        sfx('click');
        renderPanel();
        save();
      } else if (act === 'save') { save(); sfx('coin'); ui.toast(root, 'Saved!', 900); }
      else if (act === 'reset') confirmReset();
      else if (act === 'goal') { sfx('click'); setTab(goal.tab); }
    }
    app.addEventListener('click', onClick);

    function onPointer(e) {
      if (e.button != null && e.button > 0) return;
      var r = view.canvas.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (golden && Math.hypot(x - golden.x, y - golden.y) < golden.size * 0.75) {
        catchGolden();
        return;
      }
      if (hitStar(x, y)) doTap(x, y);
    }
    view.canvas.addEventListener('pointerdown', onPointer);

    ctx.captureKeys(['Enter', 'KeyG', 'KeyB', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      var ov = root.querySelector('.ig-overlay');
      if (ov) {
        if (code === 'Space' || code === 'Enter') {
          var f = document.activeElement;
          var btn = f && ov.contains(f) && f.tagName === 'BUTTON' ? f : ov.querySelector('.ig-btn:not(.secondary)') || ov.querySelector('.ig-btn');
          if (btn) btn.click();
        }
        return;
      }
      if (code === 'Space') doTap(CX + rand(-SS * 0.15, SS * 0.15), FEET - SS * rand(0.4, 0.7));
      else if (code === 'Enter') {
        var fe = document.activeElement;
        if (fe && fe.tagName === 'BUTTON' && app.contains(fe)) fe.click();
        else doTap(CX, FEET - SS * 0.55);
      } else if (code === 'KeyG') {
        if (!catchGolden()) ui.toast(root, 'No Golden Farfallina right now', 900);
      } else if (code === 'KeyB') {
        S.buyAmt = S.buyAmt === 1 ? 10 : S.buyAmt === 10 ? 0 : 1;
        ui.toast(root, 'Buy amount: ' + (S.buyAmt === 0 ? 'Max' : '×' + S.buyAmt), 900);
        if (tab === 0) renderPanel();
      } else if (/^Digit[1-5]$/.test(code)) { sfx('click'); setTab(+code.slice(5) - 1); }
    });

    /* ---------------- goal + hints ---------------- */
    var goal = { text: '', p: 0, tab: 0 };
    function computeGoal() {
      if (S.tapsAll < 10) return { text: 'Tap ' + CAST[starCast()].name.split(' ')[0] + ' 10 times', p: S.tapsAll / 10, tab: 0 };
      for (var i = 0; i < GENS.length; i++) {
        if (S.gens[i] === 0) return { text: 'Adopt a ' + CAST[GENS[i].id].name, p: S.coins / GENS[i].cost, tab: 0 };
        if (i < 2 && S.gens[i] < 10) return { text: 'Own 10 ' + CAST[GENS[i].id].name, p: S.gens[i] / 10, tab: 0 };
      }
      if (sparksAvailable() < 1 && S.rebirths === 0) return { text: 'Earn 1M coins to unlock Rebirth', p: S.allEarned / REBIRTH_BASE, tab: 3 };
      for (var k = 0; k < SPECIAL.length; k++) if (!S.album[SPECIAL[k].id]) return { text: 'Sticker: ' + SPECIAL[k].text, p: SPECIAL[k].prog(S, C), tab: 2 };
      for (var j = 0; j < GENS.length; j++) if (!S.album['gold-' + GENS[j].id]) return { text: 'Golden sticker: own 50 ' + CAST[GENS[j].id].name, p: S.gens[j] / 50, tab: 0 };
      return { text: 'Album complete! Chase more Sparks', p: 1, tab: 3 };
    }
    function hintText() {
      if (root.querySelector('.ig-overlay')) return '';
      if (S.tapsAll < 5) return ctx.isTouch ? 'Tap the creature!' : 'Click the creature (or press Space)!';
      if (S.gens[0] === 0 && S.coins >= GENS[0].cost) return 'Adopt a ' + CAST.ping.name + (tall ? ' ↓' : ' →');
      if (golden && S.golden === 0) return 'Catch the Golden Farfallina!';
      return '';
    }

    /* ---------------- refresh HUD ---------------- */
    function refreshUI() {
      var t = fmtC(S.coins);
      if (elPts.textContent !== t) elPts.textContent = t;
      var rate = fmt(cpsNow()) + '/sec · ' + fmt(tapValue()) + ' per tap';
      if (elRate.textContent !== rate) elRate.textContent = rate;
      elSp.textContent = S.sparks ? '✨ ' + S.sparks + ' Sparks ×' + (1 + S.sparks * SPARK_BONUS).toFixed(1) : '';
      elBoost.textContent = boost.t > 0 ? (boost.kind === 'frenzy' ? 'Frenzy ×7 · ' : 'Tap Mania ×10 · ') + Math.ceil(boost.t) + 's' : '';
      goal = computeGoal();
      var gt = '<em>Goal</em>' + esc(goal.text);
      if (elGoalT._h !== gt) { elGoalT.innerHTML = gt; elGoalT._h = gt; }
      elGoalBar.style.width = (clamp(goal.p, 0, 1) * 100).toFixed(1) + '%';
      var ht = hintText();
      if (elHint.textContent !== ht) elHint.textContent = ht;
      if (cpsNow() > S.bestCps && boost.t <= 0) S.bestCps = cpsNow();
      structural();
      refreshPanel();
    }

    /* ---------------- render ---------------- */
    function render(dt, t) {
      if (bgDirty) renderBg();
      g.save();
      if (shake > 0 && S.opt.fx) g.translate(rand(-1, 1) * shake * 8, rand(-1, 1) * shake * 8);
      g.drawImage(bg, 0, 0, W, H);
      drawClouds(dt);
      drawWalkers(dt, false);
      // podium
      var pw = SS * 0.44, ph = SS * 0.085;
      g.fillStyle = '#e8a33a';
      g.beginPath();
      g.ellipse(CX, FEET + ph * 0.7, pw, ph, 0, 0, TAU);
      g.fill();
      g.fillRect(CX - pw, FEET, pw * 2, ph * 0.7);
      g.fillStyle = '#ffcf5a';
      g.beginPath();
      g.ellipse(CX, FEET, pw, ph, 0, 0, TAU);
      g.fill();
      g.strokeStyle = OL;
      g.lineWidth = 2;
      g.stroke();
      // star creature with squash & stretch around its feet
      var sx = 1 + squash.x, sy = 1 - squash.x * 0.85;
      var breathe = 1 + Math.sin(t * 2.6) * 0.022;
      g.fillStyle = 'rgba(80,40,0,.25)';
      g.beginPath();
      g.ellipse(CX, FEET, SS * 0.3 * sx, SS * 0.05, 0, 0, TAU);
      g.fill();
      var px = Math.round(SS * (view.dpr || 1));
      if (!starSprite || starSprite.width !== Math.max(8, px)) starSprite = makeSprite(starCast(), px, starMode());
      g.save();
      g.translate(CX, FEET);
      g.rotate(tilt.x * 0.6);
      g.scale(sx / breathe, sy * breathe);
      if (boost.t > 0) {
        g.shadowColor = boost.kind === 'frenzy' ? 'rgba(255,210,63,.9)' : 'rgba(255,95,162,.9)';
        g.shadowBlur = 18;
      }
      g.drawImage(starSprite, -SS / 2, -SS * 0.95, SS, SS);
      g.restore();
      drawWalkers(dt, true);
      // tap rings
      for (var i = rings.length - 1; i >= 0; i--) {
        var rg = rings[i];
        rg.r += dt * SS * 0.9;
        rg.a -= dt * 2.2;
        if (rg.a <= 0) { rings.splice(i, 1); continue; }
        g.strokeStyle = 'rgba(255,255,255,' + rg.a.toFixed(3) + ')';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(rg.x, rg.y, rg.r, 0, TAU);
        g.stroke();
      }
      // golden farfallina
      if (golden) {
        var gs = golden.size;
        var flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 11));
        var glow = g.createRadialGradient(golden.x, golden.y, gs * 0.1, golden.x, golden.y, gs * 0.95);
        glow.addColorStop(0, 'rgba(255,240,150,.65)');
        glow.addColorStop(1, 'rgba(255,240,150,0)');
        g.fillStyle = glow;
        g.beginPath();
        g.arc(golden.x, golden.y, gs * 0.95, 0, TAU);
        g.fill();
        g.save();
        g.translate(golden.x, golden.y);
        g.rotate(Math.sin(t * 3) * 0.2);
        g.scale(flap, 1);
        g.drawImage(makeSprite('farf', Math.round(gs * (view.dpr || 1))), -gs / 2, -gs / 2, gs, gs);
        g.restore();
      }
      // coins
      var cs = coinSprite();
      var csz = clamp(SS * 0.075, 9, 20);
      for (var c = 0; c < coinsP.length; c++) {
        var p = coinsP[c];
        if (!p.on) continue;
        p.life += dt;
        if (p.life >= p.max) { p.on = false; continue; }
        p.vy += 700 * (SS / 220) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        var al = 1 - p.life / p.max;
        g.globalAlpha = al;
        var s2 = csz * p.r;
        g.drawImage(cs, p.x - s2 / 2, p.y - s2 / 2, s2, s2 * (0.4 + 0.6 * Math.abs(Math.cos(p.life * 14))));
      }
      g.globalAlpha = 1;
      // number pops
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      for (var q = 0; q < pops.length; q++) {
        var pp = pops[q];
        if (!pp.on) continue;
        pp.life += dt;
        if (pp.life >= pp.max) { pp.on = false; continue; }
        pp.x += pp.vx * dt;
        pp.y += pp.vy * dt;
        pp.vy *= 1 - dt * 2.5;
        var k = pp.life / pp.max;
        var sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
        g.globalAlpha = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
        g.font = '900 ' + Math.round(pp.size * sc) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
        if (!pp.w) pp.w = g.measureText(pp.text).width / sc;
        // keep long labels inside the scene
        pp.x = clamp(pp.x, pp.w * 0.6 + 6, Math.max(pp.w * 0.6 + 6, W - pp.w * 0.6 - 6));
        g.lineWidth = Math.max(3, pp.size * 0.22);
        g.strokeStyle = OL;
        g.strokeText(pp.text, pp.x, pp.y);
        g.fillStyle = pp.color;
        g.fillText(pp.text, pp.x, pp.y);
      }
      g.globalAlpha = 1;
      // frenzy frame / catch flash
      if (boost.t > 0 && S.opt.fx) {
        g.strokeStyle = boost.kind === 'frenzy' ? 'rgba(255,210,63,' : 'rgba(255,95,162,';
        g.strokeStyle += (0.35 + 0.2 * Math.sin(t * 8)).toFixed(3) + ')';
        g.lineWidth = 8;
        g.strokeRect(4, 4, W - 8, H - 8);
      }
      if (flashT > 0 && S.opt.fx) {
        g.fillStyle = 'rgba(255,250,210,' + (flashT * 0.8).toFixed(3) + ')';
        g.fillRect(0, 0, W, H);
      }
      g.restore();
    }

    /* ---------------- loop ---------------- */
    var lastEcon = performance.now();
    var uiT = 0;
    var albumT = 0;
    var sessionStart = Date.now();
    var loop = IGAME.loop(function (dt, t) {
      var now = performance.now();
      var edt = Math.min(5, Math.max(0, (now - lastEcon) / 1000));
      lastEcon = now;
      earn(cpsNow() * edt);
      if (boost.t > 0) boost.t = Math.max(0, boost.t - edt);
      // golden farfallina spawns only once the player knows the basics
      if (!golden && S.introDone && S.tapsAll >= 10 && !root.querySelector('.ig-overlay')) {
        goldenTimer -= edt;
        if (goldenTimer <= 0) spawnGolden();
      }
      if (golden) {
        golden.t += dt;
        golden.x += golden.dir * (W + 60) / golden.life * dt;
        golden.y = golden.y0 + Math.sin(golden.t * 1.7) * H * 0.07;
        if (golden.t > golden.life) {
          golden = null;
          goldenTimer = rand(60, 140) / (has('net') ? 1.4 : 1);
        }
      }
      // springs
      // damped springs (semi-implicit Euler) for squash & stretch and wobble
      squash.v += (-420 * squash.x - 13 * squash.v) * dt;
      squash.x = clamp(squash.x + squash.v * dt, -0.3, 0.35);
      tilt.v += (-300 * tilt.x - 12 * tilt.v) * dt;
      tilt.x = clamp(tilt.x + tilt.v * dt, -0.4, 0.4);
      if (shake > 0) shake = Math.max(0, shake - dt * 1.6);
      if (flashT > 0) flashT = Math.max(0, flashT - dt * 1.8);
      render(dt, t);
      uiT -= dt;
      if (uiT <= 0) {
        uiT = 0.12;
        refreshUI();
      }
      albumT -= dt;
      if (albumT <= 0) {
        albumT = 1;
        checkAlbum();
      }
    });

    /* ---------------- offline ---------------- */
    function applyOffline(sec, silentShort) {
      if (sec < 2 || C.cpsBase <= 0) return;
      var factor = has('nap') ? 1 : 0.5;
      if (silentShort && sec < 60) {
        earn(C.cpsBase * sec * factor);
        return;
      }
      var capped = Math.min(sec, OFFLINE_CAP);
      var got = C.cpsBase * capped * factor;
      earn(got);
      save();
      var ov = ui.overlay(root, {
        title: 'Bentornato! Welcome back!',
        html:
          '<p style="margin:0 0 6px">Your creatures kept working for <b>' + IGAME.fmtTime(sec) + '</b>' + (sec > OFFLINE_CAP ? ' (8h max)' : '') + '.</p>' +
          '<p style="margin:0;font-size:1.5em;font-weight:900;color:#ffd23f">+' + fmt(got) + ' coins</p>' +
          '<p style="margin:6px 0 0">Offline rate: ' + Math.round(factor * 100) + '%' + (factor < 1 ? ' (Cozy Naps upgrade makes it 100%)' : '') + '</p>',
        buttons: [{ label: 'Collect', primary: true, onClick: function () { ov.close(); sfx('coin'); addCoins(CX, FEET - SS * 0.5, 16, 1.3); } }],
      });
    }

    /* ---------------- boot ---------------- */
    recalc();
    layoutWalkers();
    setTab(0);
    if (!S.introDone) {
      var intro = ui.overlay(root, {
        title: esc(ctx.title || 'Assurdo Clicker'),
        html:
          '<p style="margin:0 0 8px">' + (ctx.isTouch ? 'Tap' : 'Click') + ' the silly creature for coins, adopt more absurd creatures that earn coins every second, fill your sticker album and catch the <b>Golden Farfallina</b> for bonuses.</p>' +
          '<p style="margin:0;font-size:13px;opacity:.8">' + (ctx.isTouch ? '' : 'Keys: <span class="ig-kbd">Space</span> tap · <span class="ig-kbd">G</span> golden bonus. ') + 'Progress autosaves and keeps earning while you are away.</p>',
        buttons: [
          {
            label: 'Let’s bonk!',
            primary: true,
            onClick: function () {
              intro.close();
              S.introDone = true;
              save();
              sfx('levelup');
              squash.v += 4;
              ctx.focus();
            },
          },
        ],
      });
    } else if (hadSave) {
      applyOffline((Date.now() - (S.lastSeen || Date.now())) / 1000, false);
    }
    loop.start();
    var saveTimer = setInterval(function () {
      S.playTime += (Date.now() - sessionStart) / 1000;
      sessionStart = Date.now();
      save();
    }, 5000);
    function onPageHide() { save(); }
    window.addEventListener('pagehide', onPageHide);
    var pausedAt = 0;

    if (ctx.debug) {
      root._bc = {
        S: function () { return S; },
        C: function () { return C; },
        give: function (n) { earn(n); },
        golden: function () { goldenTimer = 0; S.tapsAll = Math.max(S.tapsAll, 10); },
        offline: function (sec) { applyOffline(sec, false); },
      };
    }

    return {
      pause: function () {
        if (destroyed) return;
        loop.stop();
        pausedAt = Date.now();
        save();
      },
      resume: function () {
        if (destroyed) return;
        if (pausedAt) {
          var away = (Date.now() - pausedAt) / 1000;
          pausedAt = 0;
          applyOffline(away, true);
        }
        sessionStart = Date.now();
        lastEcon = performance.now();
        loop.start();
      },
      destroy: function () {
        S.playTime += (Date.now() - sessionStart) / 1000;
        sessionStart = Date.now();
        save();
        destroyed = true;
        loop.stop();
        clearInterval(saveTimer);
        clearTimeout(stickerTimer);
        window.removeEventListener('pagehide', onPageHide);
        app.removeEventListener('click', onClick);
        view.canvas.removeEventListener('pointerdown', onPointer);
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', layout);
        view.destroy();
        if (app.parentNode) app.parentNode.removeChild(app);
        if (style.parentNode) style.parentNode.removeChild(style);
      },
    };
  });
})();
