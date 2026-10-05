/*!
 * Edge Drift — igame9 original one-button drift game (Drift Boss style).
 * Hold (mouse / touch / Space / →) to swing the car right, release to swing it left.
 * The track is an endless isometric zig-zag of floating platforms.
 *
 * World: x/y plane, track segments alternate along +Y and +X. Isometric projection:
 *   sx = ox + (dx - dy) * K1,   sy = oy - (dx + dy) * K2 - z * KZ
 * so +X runs up-right and +Y runs up-left on screen.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var HEAD_X = 0; // heading while holding (up-right)
  var HEAD_Y = Math.PI / 2; // heading while released (up-left)

  var CARS = [
    { id: 'mini', name: 'Mini', price: 0, len: 0.5, wid: 0.3, h: 0.16, cabLen: 0.5, cabOff: -0.04, cabH: 0.13, body: '#ef4444', side: '#b91c1c', roof: '#fff1f2' },
    { id: 'cab', name: 'Cab', price: 150, len: 0.54, wid: 0.3, h: 0.16, cabLen: 0.48, cabOff: -0.03, cabH: 0.13, body: '#facc15', side: '#ca8a04', roof: '#fef9c3', sign: true },
    { id: 'patrol', name: 'Patrol', price: 300, len: 0.56, wid: 0.31, h: 0.16, cabLen: 0.46, cabOff: -0.04, cabH: 0.13, body: '#f8fafc', side: '#94a3b8', roof: '#1e3a8a', lightbar: true },
    { id: 'gt', name: 'Sprint GT', price: 600, len: 0.6, wid: 0.32, h: 0.12, cabLen: 0.38, cabOff: -0.06, cabH: 0.1, body: '#f97316', side: '#c2410c', roof: '#1f2937', spoiler: true },
    { id: 'hauler', name: 'Hauler', price: 1000, len: 0.66, wid: 0.33, h: 0.22, cabLen: 0.3, cabOff: 0.17, cabH: 0.14, body: '#22c55e', side: '#15803d', roof: '#dcfce7', bed: true },
    { id: 'neon', name: 'Neon', price: 1600, len: 0.58, wid: 0.31, h: 0.13, cabLen: 0.42, cabOff: -0.05, cabH: 0.11, body: '#111827', side: '#030712', roof: '#22d3ee', glow: '#22d3ee', spoiler: true },
  ];

  var BOOSTERS = [
    { id: 'tire', name: 'Spare Tire', price: 120, desc: 'Survive one fall', icon: '🛞' },
    { id: 'magnet', name: 'Coin Magnet', price: 80, desc: 'Pulls in nearby coins', icon: '🧲' },
    { id: 'turbo', name: 'Turbo Score', price: 100, desc: '×1.5 score this run', icon: '⚡' },
  ];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function angDiff(a, b) {
    var d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  IGAME.register('edge-drift', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;
    var autopilot = ctx.params.has('autopilot');

    var saved = {
      best: store.get('best', 0),
      coins: store.get('coins', 0),
      owned: store.get('owned', ['mini']),
      car: store.get('car', 'mini'),
      armed: store.get('armed', {}),
    };
    function save() {
      store.set('best', saved.best);
      store.set('coins', saved.coins);
      store.set('owned', saved.owned);
      store.set('car', saved.car);
      store.set('armed', saved.armed);
    }

    /* ---------------- canvas & layout ---------------- */
    var booted = false;
    var W = 0, H = 0, S = 60, K1 = 0, K2 = 0, KZ = 0, ox = 0, oy = 0;
    var view = IGAME.createCanvas(root, {
      onResize: function (w, h) {
        W = w;
        H = h;
        S = Math.max(26, Math.min(h * 0.15, w * 0.16));
        K1 = 0.866 * S;
        K2 = 0.5 * S;
        KZ = 0.9 * S;
        ox = w / 2;
        oy = h * 0.6;
        if (!booted) return;
        buildScenery();
        if (state !== 'playing') render();
      },
    });
    var g = view.ctx;

    /* ---------------- HUD (DOM) ---------------- */
    var hud = ui.el('div', 'ig-hud');
    var pauseBtn = ui.el('button', 'ig-pill', '❚❚');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'cursor:pointer;border:1px solid rgba(255,255,255,.12)';
    var scoreBox = ui.el('div', '', '');
    scoreBox.style.cssText = 'text-align:center;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.45);pointer-events:none';
    var coinPill = ui.el('div', 'ig-pill', '');
    hud.appendChild(pauseBtn);
    hud.appendChild(scoreBox);
    hud.appendChild(coinPill);
    root.appendChild(hud);
    var boostBar = ui.el('div', '');
    boostBar.style.cssText = 'position:absolute;left:10px;bottom:10px;display:flex;gap:6px;z-index:4;pointer-events:none';
    root.appendChild(boostBar);

    var hudCache = '';
    function updateHud() {
      var s = Math.floor(run ? run.score : 0);
      var key = s + '|' + saved.best + '|' + saved.coins + '|' + (run ? run.coins : 0) + '|' + state + '|' + S;
      if (key === hudCache) return;
      hudCache = key;
      scoreBox.innerHTML =
        '<div style="font:900 ' + Math.round(clamp(S * 0.42, 22, 44)) + 'px system-ui,sans-serif;line-height:1">' + s +
        '</div><div style="font:700 12px system-ui,sans-serif;opacity:.8;margin-top:2px">BEST ' + Math.max(saved.best, s) + '</div>';
      coinPill.innerHTML = '<span style="color:#fde047">●</span> ' + (saved.coins + (run ? run.coins : 0));
      pauseBtn.style.visibility = state === 'playing' || state === 'ready' ? 'visible' : 'hidden';
    }
    function updateBoostBar() {
      boostBar.innerHTML = '';
      if (!run) return;
      BOOSTERS.forEach(function (b) {
        if (!run.boost[b.id]) return;
        var p = ui.el('span', 'ig-pill', b.icon + ' ' + b.name);
        p.style.fontSize = '12px';
        boostBar.appendChild(p);
      });
    }

    /* ---------------- scenery ---------------- */
    var mountains = [];
    var clouds = [];
    var stars = [];
    function buildScenery() {
      mountains = [];
      for (var layer = 0; layer < 2; layer++) {
        var pts = [];
        var n = 14;
        for (var i = 0; i <= n; i++) pts.push(rand(0.1, 1) * (layer ? 0.16 : 0.24));
        mountains.push(pts);
      }
      clouds = [];
      for (var c = 0; c < 7; c++) clouds.push({ x: Math.random(), y: rand(0.05, 0.75), s: rand(0.6, 1.4), sp: rand(0.004, 0.012) });
      stars = [];
      for (var k = 0; k < 40; k++) stars.push({ x: Math.random(), y: Math.random() * 0.4, r: rand(0.5, 1.4), tw: rand(0, TAU) });
    }

    /* ---------------- track ---------------- */
    // seg: { ax: 'x'|'y', x0, y0, x1, y1 (centerline), w }
    var segs = [];
    var coins = [];
    function speedAt(progress) {
      return 2.8 + 4.2 * (1 - Math.exp(-progress / 260));
    }
    function addSegment() {
      var k = segs.length;
      var prev = segs[k - 1];
      var ax = prev ? (prev.ax === 'x' ? 'y' : 'x') : 'y';
      var sx = prev ? prev.x1 : 0;
      var sy = prev ? prev.y1 : 0;
      var len;
      var w = 0.86 + 0.66 * Math.exp(-k / 45);
      if (k === 0) len = 4.2;
      else {
        var v = speedAt(sx + sy);
        var tMin = Math.max(0.42, 0.8 - k * 0.004);
        var tMax = Math.max(0.95, 1.7 - k * 0.008);
        // occasional quick zig-zag bursts later on
        if (k > 18 && segs.burst > 0) {
          segs.burst--;
          len = v * rand(tMin, tMin + 0.12);
        } else {
          if (k > 18 && Math.random() < 0.1) segs.burst = 3;
          len = v * rand(tMin, tMax);
        }
        len = Math.max(len, w + 0.35);
        if (k > 30 && Math.random() < 0.12) w *= 0.78; // narrow section
      }
      var seg = { ax: ax, x0: sx, y0: sy, x1: ax === 'x' ? sx + len : sx, y1: ax === 'y' ? sy + len : sy, w: w, len: len };
      segs.push(seg);
      // coins along the centreline
      if (k > 0 && Math.random() < 0.6) {
        var nCoins = Math.min(4, Math.floor(rand(1, 4.5)));
        var spacing = 0.55;
        var startT = (len - spacing * (nCoins - 1)) / 2;
        if (startT > 0.3) {
          for (var i = 0; i < nCoins; i++) {
            var t = startT + i * spacing;
            coins.push({ x: ax === 'x' ? sx + t : sx, y: ax === 'y' ? sy + t : sy, seg: k, taken: false, spin: Math.random() * TAU });
          }
        }
      }
    }
    // Axis-aligned rectangle of a segment, extended by w/2 at both ends so corners are filled.
    function inSeg(s, x, y) {
      var h = s.w / 2;
      if (s.ax === 'x') return x >= s.x0 - h && x <= s.x1 + h && y >= s.y0 - h && y <= s.y0 + h;
      return y >= s.y0 - h && y <= s.y1 + h && x >= s.x0 - h && x <= s.x0 + h;
    }

    /* ---------------- run state ---------------- */
    var state = 'title'; // title | ready | playing | falling | paused | over
    var run = null;
    var car = null;
    var cam = { x: 0, y: 0 };
    var particles = [];
    var skids = [];
    var popups = [];
    var shake = 0;
    var holdPointers = {};
    var pointerHold = false;
    var time = 0;
    var overlay = null;

    function newRun(useBoosters) {
      segs = [];
      segs.burst = 0;
      coins = [];
      for (var i = 0; i < 12; i++) addSegment();
      car = { x: 0, y: 0.6, head: HEAD_Y, vel: HEAD_Y, v: 0, z: 0, vz: 0, spin: 0, seg: 0, fallBehind: false, blink: 0 };
      cam.x = car.x + 1;
      cam.y = car.y + 1;
      particles.length = 0;
      skids.length = 0;
      popups.length = 0;
      run = { score: 0, coins: 0, corners: 0, boost: {}, lastSeg: 0, time: 0, banked: false };
      if (useBoosters) {
        BOOSTERS.forEach(function (b) {
          if (saved.armed[b.id]) run.boost[b.id] = 1;
        });
        saved.armed = {};
        save();
      }
      needRelease = true;
      updateBoostBar();
      state = 'ready';
      updateHud();
    }

    // After a start/respawn the input must be released once before a hold counts,
    // so the tap that starts the run doesn't immediately steer the car.
    var needRelease = true;
    function holding() {
      if (autopilot && car) return autoHold();
      var k = ctx.keys;
      var raw = pointerHold || !!(k.Space || k.ArrowRight || k.KeyD || k.ArrowUp);
      if (needRelease) {
        if (!raw) needRelease = false;
        return false;
      }
      return raw;
    }

    // Debug autopilot (?autopilot=1): turns toward the next segment slightly before each corner.
    function autoHold() {
      var s = segs[car.seg];
      var remaining = s.ax === 'x' ? s.x1 - car.x : s.y1 - car.y;
      var want = s.ax;
      if (remaining < 0.42 * s.w + 0.3) want = s.ax === 'x' ? 'y' : 'x';
      return want === 'x';
    }

    /* ---------------- update ---------------- */
    function update(dt) {
      time += dt;
      if (shake > 0) shake = Math.max(0, shake - dt * 2.5);
      updateParticles(dt);
      if (state === 'ready') {
        // gently follow the parked car
        followCam(dt);
        return;
      }
      if (state !== 'playing' && state !== 'falling') return;
      run.time += dt;

      var progress = car.x + car.y;
      if (state === 'playing') {
        car.v = speedAt(progress);
        var target = holding() ? HEAD_X : HEAD_Y;
        var turnRate = car.v / 0.45; // rad/s, scales with speed so corners stay the same size
        var d = angDiff(car.head, target);
        var step = turnRate * dt;
        car.head += Math.abs(d) <= step ? d : Math.sign(d) * step;
        // velocity direction lags behind the body → drift slide
        var grip = car.v * 2.2;
        car.vel += angDiff(car.vel, car.head) * (1 - Math.exp(-grip * dt));
        var slip = Math.abs(angDiff(car.vel, car.head));
        car.x += Math.cos(car.vel) * car.v * dt;
        car.y += Math.sin(car.vel) * car.v * dt;

        // score
        var mult = run.boost.turbo ? 1.5 : 1;
        run.score += car.v * dt * 4 * mult;
        if (car.blink > 0) car.blink -= dt;

        // which segment are we on? look a few around the current one
        var on = -1;
        for (var i = Math.max(0, car.seg - 1); i <= Math.min(segs.length - 1, car.seg + 2); i++) {
          if (inSeg(segs[i], car.x, car.y)) on = i;
        }
        if (on === -1) {
          startFall();
        } else {
          if (on > car.seg) {
            car.seg = on;
            run.corners++;
            if (on > run.lastSeg) {
              run.lastSeg = on;
              run.score += 5 * mult;
            }
          }
        }
        while (segs.length < car.seg + 14) addSegment();

        // skid marks + smoke while sliding
        if (slip > 0.12) {
          emitSkid();
          if (Math.random() < slip * 1.6) smoke();
          if (Math.random() < 0.04) sfx('skid');
        } else skids.breakNext = true;

        collectCoins(dt);
      } else if (state === 'falling') {
        car.x += Math.cos(car.vel) * car.v * dt * 0.6;
        car.y += Math.sin(car.vel) * car.v * dt * 0.6;
        car.vz -= 9 * dt;
        car.z += car.vz * dt;
        car.spin += dt * 4;
        if (car.z < -6) endFall();
      }
      followCam(dt);
      updatePopups(dt);
      updateHud();
    }

    function followCam(dt) {
      var lx = car.x + Math.cos(car.vel) * 1.2 + 0.9;
      var ly = car.y + Math.sin(car.vel) * 1.2 + 0.9;
      var k = 1 - Math.exp(-4 * dt);
      cam.x += (lx - cam.x) * k;
      cam.y += (ly - cam.y) * k;
    }

    function collectCoins(dt) {
      var magnet = run.boost.magnet;
      for (var i = 0; i < coins.length; i++) {
        var c = coins[i];
        if (c.taken || c.seg > car.seg + 3) continue;
        if (c.seg < car.seg - 3) continue;
        var dx = car.x - c.x, dy = car.y - c.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (magnet && dist < 1.7) {
          var pull = Math.min(1, dt * 7);
          c.x += dx * pull;
          c.y += dy * pull;
        }
        if (dist < 0.36) {
          c.taken = true;
          run.coins++;
          sfx('coin');
          popup(c.x, c.y, '+1', '#fde047');
          for (var p = 0; p < 6; p++) spark(c.x, c.y, '#fde047');
        }
      }
      if (coins.length > 200) coins = coins.filter(function (c) { return !c.taken && c.seg >= car.seg - 3; });
    }

    function startFall() {
      state = 'falling';
      car.vz = 0.5;
      // did we fall off the far (+perpendicular) side? then draw the car behind the track
      var s = segs[car.seg];
      var off = s.ax === 'x' ? car.y - s.y0 : car.x - s.x0;
      car.fallBehind = off > 0;
      sfx('hit');
      shake = 0.6;
    }

    function endFall() {
      if (run.boost.tire) {
        run.boost.tire = 0;
        updateBoostBar();
        // respawn on the centreline of the last segment we were on
        var s = segs[car.seg];
        var t;
        if (s.ax === 'x') t = clamp(car.x - s.x0, 0.3, Math.max(0.3, s.len - 0.6));
        else t = clamp(car.y - s.y0, 0.3, Math.max(0.3, s.len - 0.6));
        car.x = s.ax === 'x' ? s.x0 + t : s.x0;
        car.y = s.ax === 'y' ? s.y0 + t : s.y0;
        car.head = car.vel = s.ax === 'x' ? HEAD_X : HEAD_Y;
        car.z = 0;
        car.vz = 0;
        car.spin = 0;
        car.blink = 1.2;
        skids.breakNext = true;
        needRelease = true;
        state = 'ready';
        ui.toast(root, '🛞 Spare Tire! Tap to continue', 1600);
        sfx('levelup');
        return;
      }
      gameOver();
    }

    function gameOver() {
      state = 'over';
      var score = Math.floor(run.score);
      var isBest = score > saved.best;
      if (isBest) saved.best = score;
      saved.coins += run.coins;
      run.banked = true;
      save();
      updateHud();
      sfx(isBest ? 'win' : 'lose');
      showMenu(true, score, isBest);
    }

    /* ---------------- particles ---------------- */
    function emitSkid() {
      var cx = Math.cos(car.head), sy = Math.sin(car.head);
      var back = -0.18, half = 0.12;
      // rear wheel positions (world)
      var lx = car.x + cx * back - sy * half, ly = car.y + sy * back + cx * half;
      var rx = car.x + cx * back + sy * half, ry = car.y + sy * back - cx * half;
      if (!skids.breakNext && skids.last) {
        skids.push([skids.last[0], skids.last[1], lx, ly, time], [skids.last[2], skids.last[3], rx, ry, time]);
        if (skids.length > 360) skids.splice(0, skids.length - 360);
      }
      skids.last = [lx, ly, rx, ry];
      skids.breakNext = false;
    }
    function smoke() {
      if (particles.length > 90) return;
      var c = Math.cos(car.head), s = Math.sin(car.head);
      particles.push({ x: car.x - c * 0.22 + rand(-0.08, 0.08), y: car.y - s * 0.22 + rand(-0.08, 0.08), z: 0.04, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(0.2, 0.5), life: 0.8, max: 0.8, r: rand(0.06, 0.12), kind: 'smoke' });
    }
    function spark(x, y, color) {
      if (particles.length > 110) return;
      particles.push({ x: x, y: y, z: 0.25, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), vz: rand(1, 2.5), life: 0.5, max: 0.5, r: 0.04, kind: 'spark', color: color });
    }
    function updateParticles(dt) {
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.kind === 'spark') p.vz -= 6 * dt;
        else p.r += dt * 0.12;
      }
    }
    function popup(x, y, text, color) {
      popups.push({ x: x, y: y, z: 0.4, text: text, color: color, life: 0.8 });
    }
    function updatePopups(dt) {
      for (var i = popups.length - 1; i >= 0; i--) {
        popups[i].life -= dt;
        popups[i].z += dt * 0.9;
        if (popups[i].life <= 0) popups.splice(i, 1);
      }
    }

    /* ---------------- rendering ---------------- */
    function sx(x, y) {
      return ox + ((x - cam.x) - (y - cam.y)) * K1;
    }
    function sy(x, y, z) {
      return oy - ((x - cam.x) + (y - cam.y)) * K2 - (z || 0) * KZ;
    }

    function drawBackground() {
      var grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#1b1446');
      grd.addColorStop(0.45, '#5b2a86');
      grd.addColorStop(0.75, '#e0607e');
      grd.addColorStop(1, '#ffb27a');
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      // stars
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        g.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.5 + st.tw);
        g.fillStyle = '#fff';
        g.fillRect(st.x * W, st.y * H, st.r, st.r);
      }
      g.globalAlpha = 1;
      // sun
      var sunX = W * 0.72, sunY = H * 0.62;
      var sg = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.3);
      sg.addColorStop(0, 'rgba(255,236,170,0.95)');
      sg.addColorStop(0.25, 'rgba(255,190,120,0.5)');
      sg.addColorStop(1, 'rgba(255,150,120,0)');
      g.fillStyle = sg;
      g.fillRect(0, 0, W, H);
      // mountains (parallax with camera)
      var par = (cam.x - cam.y) * K1;
      for (var m = 0; m < mountains.length; m++) {
        var pts = mountains[m];
        var base = H * (m ? 0.86 : 0.8);
        var off = (par * (m ? 0.05 : 0.03)) % W;
        g.fillStyle = m ? 'rgba(60,30,90,0.75)' : 'rgba(90,45,120,0.55)';
        g.beginPath();
        g.moveTo(0, H);
        for (var r = -1; r <= 1; r++) {
          for (var j = 0; j < pts.length; j++) {
            var x = (j / (pts.length - 1)) * W + r * W - off;
            g.lineTo(x, base - pts[j] * H);
          }
        }
        g.lineTo(W * 2, H);
        g.closePath();
        g.fill();
      }
      // clouds
      for (var c = 0; c < clouds.length; c++) {
        var cl = clouds[c];
        var cxp = (((cl.x * W - par * 0.12 * cl.s + time * cl.sp * W) % (W + 300)) + W + 300) % (W + 300) - 150;
        var cyp = cl.y * H + ((cam.x + cam.y) * K2 * 0.08 * cl.s) % (H * 0.2);
        g.fillStyle = 'rgba(255,220,235,' + (0.08 + 0.06 * cl.s) + ')';
        g.beginPath();
        g.ellipse(cxp, cyp, 70 * cl.s, 16 * cl.s, 0, 0, TAU);
        g.ellipse(cxp + 40 * cl.s, cyp - 8 * cl.s, 45 * cl.s, 14 * cl.s, 0, 0, TAU);
        g.fill();
      }
    }

    // Rectangle of a segment as [x0, x1, y0, y1]
    function segRect(s) {
      var h = s.w / 2;
      if (s.ax === 'x') return [s.x0 - h, s.x1 + h, s.y0 - h, s.y0 + h];
      return [s.x0 - h, s.x0 + h, s.y0 - h, s.y1 + h];
    }

    function drawSides(s) {
      var r = segRect(s);
      var depth = 1.3;
      var ax = sx(r[0], r[2]), ay = sy(r[0], r[2], 0); // nearest corner A
      var bx = sx(r[1], r[2]), by = sy(r[1], r[2], 0); // B (+x)
      var dx = sx(r[0], r[3]), dy = sy(r[0], r[3], 0); // D (+y)
      var dd = depth * KZ;
      // left-front face (x = x0): A → D
      var lg = g.createLinearGradient(0, ay - dd * 0.2, 0, ay + dd);
      lg.addColorStop(0, '#6d4bb0');
      lg.addColorStop(1, 'rgba(60,30,100,0)');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(dx, dy);
      g.lineTo(dx, dy + dd);
      g.lineTo(ax, ay + dd);
      g.closePath();
      g.fill();
      // right-front face (y = y0): A → B
      var rg = g.createLinearGradient(0, ay - dd * 0.2, 0, ay + dd);
      rg.addColorStop(0, '#45307e');
      rg.addColorStop(1, 'rgba(40,20,80,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.lineTo(bx, by + dd);
      g.lineTo(ax, ay + dd);
      g.closePath();
      g.fill();
    }

    function poly4(x0, y0, x1, y1) {
      // axis-aligned world rect → projected quad path
      g.moveTo(sx(x0, y0), sy(x0, y0, 0));
      g.lineTo(sx(x1, y0), sy(x1, y0, 0));
      g.lineTo(sx(x1, y1), sy(x1, y1, 0));
      g.lineTo(sx(x0, y1), sy(x0, y1, 0));
      g.closePath();
    }

    function drawTops(from, to) {
      // asphalt
      g.fillStyle = '#2c2f4a';
      g.beginPath();
      for (var i = from; i <= to; i++) {
        var r = segRect(segs[i]);
        poly4(r[0], r[2], r[1], r[3]);
      }
      g.fill();
      // subtle lighter lane
      g.fillStyle = 'rgba(255,255,255,0.035)';
      g.beginPath();
      for (i = from; i <= to; i++) {
        var s = segs[i], q = s.w * 0.28;
        if (s.ax === 'x') poly4(s.x0, s.y0 - q, s.x1, s.y0 + q);
        else poly4(s.x0 - q, s.y0, s.x0 + q, s.y1);
      }
      g.fill();
      // edge lines: plus-side edge stops before the next corner, minus-side starts after the previous one
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = Math.max(1.5, S * 0.035);
      g.beginPath();
      for (i = from; i <= to; i++) {
        s = segs[i];
        var h = s.w / 2 - 0.07;
        var hw = s.w / 2;
        var hasPrev = i > 0;
        if (s.ax === 'x') {
          // minus side (y0 - h): from (prev? x0 + hw : x0 - hw) to x1 + hw
          line(hasPrev ? s.x0 + hw - 0.07 : s.x0 - hw, s.y0 - h, s.x1 + hw - 0.07, s.y0 - h);
          // plus side (y0 + h): from x0 - hw to x1 - hw
          line(s.x0 - hw + 0.07, s.y0 + h, s.x1 - hw + 0.07, s.y0 + h);
        } else {
          line(s.x0 - h, hasPrev ? s.y0 + hw - 0.07 : s.y0 - hw, s.x0 - h, s.y1 + hw - 0.07);
          line(s.x0 + h, s.y0 - hw + 0.07, s.x0 + h, s.y1 - hw + 0.07);
        }
      }
      g.stroke();
      // centre dashes
      g.strokeStyle = 'rgba(253,224,71,0.7)';
      g.setLineDash([S * 0.18, S * 0.16]);
      g.lineWidth = Math.max(1, S * 0.025);
      g.beginPath();
      for (i = from; i <= to; i++) {
        s = segs[i];
        line(s.x0, s.y0, s.x1, s.y1);
      }
      g.stroke();
      g.setLineDash([]);
      // start line
      if (from === 0) {
        var s0 = segs[0];
        var hw0 = s0.w / 2;
        for (var c = 0; c < 6; c++) {
          for (var rr = 0; rr < 2; rr++) {
            g.fillStyle = (c + rr) % 2 ? '#f8fafc' : '#111827';
            var cx0 = s0.x0 - hw0 + (c * s0.w) / 6;
            g.beginPath();
            poly4(cx0, 0.15 + rr * 0.12, cx0 + s0.w / 6, 0.27 + rr * 0.12);
            g.fill();
          }
        }
      }
    }
    function line(x0, y0, x1, y1) {
      g.moveTo(sx(x0, y0), sy(x0, y0, 0));
      g.lineTo(sx(x1, y1), sy(x1, y1, 0));
    }

    function drawSkids() {
      if (!skids.length) return;
      g.lineWidth = Math.max(1.5, S * 0.05);
      g.lineCap = 'round';
      for (var i = 0; i < skids.length; i++) {
        var k = skids[i];
        var a = clamp(1 - (time - k[4]) / 6, 0, 1) * 0.35;
        if (a <= 0) continue;
        g.strokeStyle = 'rgba(10,10,20,' + a + ')';
        g.beginPath();
        g.moveTo(sx(k[0], k[1]), sy(k[0], k[1], 0));
        g.lineTo(sx(k[2], k[3]), sy(k[2], k[3], 0));
        g.stroke();
      }
      g.lineCap = 'butt';
    }

    function drawCoins(from, to) {
      for (var i = 0; i < coins.length; i++) {
        var c = coins[i];
        if (c.taken || c.seg < from || c.seg > to) continue;
        var x = sx(c.x, c.y), y0 = sy(c.x, c.y, 0);
        var bob = Math.sin(time * 3 + c.spin) * 0.05;
        var y = sy(c.x, c.y, 0.28 + bob);
        var r = S * 0.12;
        var squash = Math.abs(Math.cos(time * 3 + c.spin));
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(x, y0, r * 0.9, r * 0.45, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#f59e0b';
        g.beginPath();
        g.ellipse(x, y, Math.max(1.5, r * squash), r, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#fde047';
        g.beginPath();
        g.ellipse(x, y, Math.max(1, r * squash * 0.7), r * 0.72, 0, 0, TAU);
        g.fill();
      }
    }

    function drawParticles() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var a = p.life / p.max;
        var x = sx(p.x, p.y), y = sy(p.x, p.y, p.z);
        if (p.kind === 'smoke') {
          g.fillStyle = 'rgba(235,225,245,' + a * 0.45 + ')';
          g.beginPath();
          g.arc(x, y, p.r * S, 0, TAU);
          g.fill();
        } else {
          g.globalAlpha = a;
          g.fillStyle = p.color;
          g.fillRect(x - 2, y - 2, 4, 4);
          g.globalAlpha = 1;
        }
      }
    }

    function drawPopups() {
      g.textAlign = 'center';
      g.font = '900 ' + Math.round(clamp(S * 0.22, 12, 24)) + 'px system-ui,sans-serif';
      for (var i = 0; i < popups.length; i++) {
        var p = popups[i];
        g.globalAlpha = clamp(p.life / 0.5, 0, 1);
        g.fillStyle = p.color;
        g.fillText(p.text, sx(p.x, p.y), sy(p.x, p.y, p.z));
      }
      g.globalAlpha = 1;
    }

    // Draws a car as an extruded box (body) + smaller box (cabin) in world space.
    function drawCar(c, spec, opt) {
      opt = opt || {};
      var proj = opt.proj || { sx: sx, sy: sy };
      var hd = c.head + (c.spin || 0);
      var cs = Math.cos(hd), sn = Math.sin(hd);
      var z0 = c.z || 0;
      var scale = opt.scale || 1;
      function corners(len, wid, off) {
        var hl = (len / 2) * scale, hw = (wid / 2) * scale;
        var o = off * scale;
        var pts = [[hl + o, -hw], [hl + o, hw], [-hl + o, hw], [-hl + o, -hw]];
        for (var i = 0; i < 4; i++) {
          var lx = pts[i][0], ly = pts[i][1];
          pts[i] = [c.x + lx * cs - ly * sn, c.y + lx * sn + ly * cs];
        }
        return pts;
      }
      function box(pts, zA, zB, top, side, side2) {
        // visible side faces: outward normal with (nx + ny) < 0 faces the viewer
        for (var i = 0; i < 4; i++) {
          var a = pts[i], b = pts[(i + 1) % 4];
          var ex = b[0] - a[0], ey = b[1] - a[1];
          var nx = ey, ny = -ex; // outward for clockwise-in-world order
          if (nx + ny >= 0) continue;
          g.fillStyle = nx < ny ? side : side2;
          g.beginPath();
          g.moveTo(proj.sx(a[0], a[1]), proj.sy(a[0], a[1], zA));
          g.lineTo(proj.sx(b[0], b[1]), proj.sy(b[0], b[1], zA));
          g.lineTo(proj.sx(b[0], b[1]), proj.sy(b[0], b[1], zB));
          g.lineTo(proj.sx(a[0], a[1]), proj.sy(a[0], a[1], zB));
          g.closePath();
          g.fill();
        }
        g.fillStyle = top;
        g.beginPath();
        for (i = 0; i < 4; i++) {
          var p = pts[i];
          if (i) g.lineTo(proj.sx(p[0], p[1]), proj.sy(p[0], p[1], zB));
          else g.moveTo(proj.sx(p[0], p[1]), proj.sy(p[0], p[1], zB));
        }
        g.closePath();
        g.fill();
      }
      var bodyPts = corners(spec.len, spec.wid, 0);
      // shadow / underglow
      if (!opt.noShadow && z0 > -0.1) {
        g.fillStyle = spec.glow ? 'rgba(34,211,238,0.35)' : 'rgba(0,0,0,0.35)';
        var sh = corners(spec.len * 1.1, spec.wid * 1.25, 0);
        g.beginPath();
        for (var i = 0; i < 4; i++) {
          if (i) g.lineTo(proj.sx(sh[i][0], sh[i][1]), proj.sy(sh[i][0], sh[i][1], 0));
          else g.moveTo(proj.sx(sh[i][0], sh[i][1]), proj.sy(sh[i][0], sh[i][1], 0));
        }
        g.closePath();
        g.fill();
      }
      var wz = z0 + 0.03 * scale;
      // wheels (dark slabs under the body)
      box(corners(spec.len * 0.86, spec.wid * 1.08, 0), z0, wz + 0.05 * scale, '#111', '#0b0b0b', '#1a1a1a');
      box(bodyPts, wz, wz + spec.h * scale, spec.body, spec.side, shade(spec.side, -18));
      var cz = wz + spec.h * scale;
      if (spec.bed) {
        // truck: cab at the front, open bed behind
        box(corners(spec.len * spec.cabLen, spec.wid * 0.92, spec.len * spec.cabOff), cz, cz + spec.cabH * scale, spec.roof, '#0f172a', '#1e293b');
        box(corners(spec.len * 0.5, spec.wid * 0.8, -spec.len * 0.2), cz, cz + 0.02 * scale, shade(spec.side, -25), spec.side, spec.side);
      } else {
        box(corners(spec.len * spec.cabLen, spec.wid * 0.84, spec.len * spec.cabOff), cz, cz + spec.cabH * scale, spec.roof, '#0f172a', '#1e293b');
      }
      var rz = cz + spec.cabH * scale;
      if (spec.lightbar) {
        var on = Math.floor(time * 6) % 2;
        box(corners(0.06, spec.wid * 0.6, spec.len * spec.cabOff), rz, rz + 0.03 * scale, on ? '#ef4444' : '#3b82f6', '#1e3a8a', '#7f1d1d');
      }
      if (spec.sign) box(corners(0.08, spec.wid * 0.4, spec.len * spec.cabOff), rz, rz + 0.05 * scale, '#111827', '#facc15', '#ca8a04');
      if (spec.spoiler) box(corners(0.06, spec.wid * 0.95, -spec.len * 0.46), cz, cz + 0.07 * scale, spec.side, '#111', '#222');
      // headlights
      var hl = corners(0.03, spec.wid * 0.8, spec.len * 0.5);
      g.fillStyle = '#fef9c3';
      for (var k = 0; k < 2; k++) {
        var p = hl[k];
        g.beginPath();
        g.arc(proj.sx(p[0], p[1]), proj.sy(p[0], p[1], wz + spec.h * scale * 0.6), Math.max(1.2, S * 0.025 * scale), 0, TAU);
        g.fill();
      }
    }
    function shade(hex, amt) {
      var n = parseInt(hex.slice(1), 16);
      var r = clamp((n >> 16) + amt, 0, 255), gg = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
      return 'rgb(' + r + ',' + gg + ',' + b + ')';
    }
    function carSpec() {
      for (var i = 0; i < CARS.length; i++) if (CARS[i].id === saved.car) return CARS[i];
      return CARS[0];
    }

    function render() {
      if (!W) return;
      g.save();
      if (shake > 0) g.translate(rand(-1, 1) * shake * 8, rand(-1, 1) * shake * 8);
      drawBackground();
      if (!segs.length || !car) {
        g.restore();
        return;
      }
      var from = Math.max(0, car.seg - 3);
      var to = from;
      var horizon = car.x + car.y + 30;
      while (to < segs.length - 1 && segs[to + 1].x0 + segs[to + 1].y0 < horizon) to++;
      var spec = carSpec();
      var hidden = car.blink > 0 && Math.floor(car.blink * 10) % 2 === 0;
      if (state === 'falling' && car.fallBehind && !hidden) drawCar(car, spec);
      for (var i = to; i >= from; i--) drawSides(segs[i]);
      drawTops(from, to);
      drawSkids();
      drawCoins(from, to);
      drawParticles();
      if (!(state === 'falling' && car.fallBehind) && !hidden) drawCar(car, spec);
      drawPopups();
      if (state === 'ready') drawHint();
      g.restore();
    }

    function drawHint() {
      var t = 0.6 + 0.4 * Math.sin(time * 4);
      var fs = Math.round(clamp(S * 0.24, 14, 26));
      g.textAlign = 'center';
      g.font = '800 ' + fs + 'px system-ui,sans-serif';
      var y = Math.max(H * 0.2, 70) + fs;
      var text = ctx.isTouch ? 'Tap to start' : 'Click or press Space to start';
      var tw = g.measureText(text).width;
      g.fillStyle = 'rgba(5,6,14,0.55)';
      roundRect(W / 2 - tw / 2 - 16, y - fs - 4, tw + 32, fs + 16, 12);
      g.fill();
      g.globalAlpha = t;
      g.fillStyle = '#fff';
      g.fillText(text, W / 2, y + 2);
      g.globalAlpha = 1;
      g.font = '600 ' + Math.round(fs * 0.62) + 'px system-ui,sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillText('Hold = drift right · Release = swing left', W / 2, y + fs * 1.1);
    }
    function roundRect(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    /* ---------------- menus ---------------- */
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }

    function boosterChips() {
      var wrap = ui.el('div', '');
      wrap.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:4px 0 14px';
      BOOSTERS.forEach(function (b) {
        var armed = !!saved.armed[b.id];
        var btn = ui.el(
          'button',
          '',
          '<div style="font-size:20px;line-height:1">' + b.icon + '</div><div style="font-weight:800;font-size:12px;margin-top:3px">' + b.name +
            '</div><div style="font-size:11px;opacity:.75">' + (armed ? '✓ Ready' : '● ' + b.price) + '</div>'
        );
        btn.type = 'button';
        btn.title = b.desc;
        btn.style.cssText =
          'cursor:pointer;border-radius:12px;padding:8px 4px;color:#fff;font-family:inherit;background:' +
          (armed ? 'linear-gradient(135deg,#8b6cff,#2dd4f0)' : 'rgba(255,255,255,.06)') +
          ';border:1px solid ' + (armed ? 'transparent' : 'rgba(255,255,255,.14)') +
          (!armed && saved.coins < b.price ? ';opacity:.5' : '');
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (saved.armed[b.id]) {
            delete saved.armed[b.id];
            saved.coins += b.price;
            sfx('click');
          } else if (saved.coins >= b.price) {
            saved.armed[b.id] = 1;
            saved.coins -= b.price;
            sfx('buy');
          } else {
            sfx('error');
            ui.toast(root, 'Need ' + (b.price - saved.coins) + ' more coins', 1200);
            return;
          }
          save();
          updateHud();
          wrap.parentNode.replaceChild(boosterChips(), wrap);
        });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function showMenu(isOver, score, isBest) {
      closeOverlay();
      state = isOver ? 'over' : 'title';
      updateHud();
      var html = '';
      if (isOver) {
        html =
          '<div style="display:flex;justify-content:center;gap:22px;margin:2px 0 10px">' +
          stat('Score', score, isBest ? '#fde047' : '#fff') +
          stat('Best', saved.best, '#fff') +
          stat('Coins', '+' + run.coins, '#fde047') +
          '</div>' +
          (isBest ? '<div style="color:#fde047;font-weight:900;margin-bottom:8px">🏆 New best score!</div>' : '');
      } else {
        html =
          '<div style="margin:-2px 0 10px;font-size:14px">Best <b style="color:#fff">' + saved.best + '</b> · Coins <b style="color:#fde047">' + saved.coins + '</b></div>';
      }
      html += '<div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;opacity:.7;margin-bottom:4px">Boosters for next run</div>';
      overlay = ui.overlay(root, {
        title: isOver ? 'You fell off!' : ctx.title || 'Edge Drift',
        text: isOver ? null : 'Hold to drift right, release to swing left. Stay on the road.',
        html: html,
        buttons: [
          { label: isOver ? '↻ Drive again' : '▶ Play', primary: true, onClick: startFromMenu },
          { label: '🚗 Garage', onClick: showGarage },
        ],
      });
      overlay.panel.querySelector('.ig-body').appendChild(boosterChips());
    }
    function stat(label, val, color) {
      return '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7">' + label +
        '</div><div style="font:900 24px system-ui,sans-serif;color:' + color + '">' + val + '</div></div>';
    }

    function startFromMenu() {
      closeOverlay();
      newRun(true);
      ctx.focus();
    }

    function showGarage() {
      closeOverlay();
      var grid = ui.el('div', '');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:6px';
      CARS.forEach(function (spec) {
        var owned = saved.owned.indexOf(spec.id) > -1;
        var selected = saved.car === spec.id;
        var cell = ui.el('button', '');
        cell.type = 'button';
        cell.style.cssText =
          'cursor:pointer;border-radius:12px;padding:6px;color:#fff;font-family:inherit;background:' +
          (selected ? 'rgba(139,108,255,.28)' : 'rgba(255,255,255,.05)') + ';border:1px solid ' + (selected ? '#8b6cff' : 'rgba(255,255,255,.12)');
        var cv = document.createElement('canvas');
        cv.width = 180;
        cv.height = 110;
        cv.style.cssText = 'width:100%;height:auto;display:block';
        cell.appendChild(cv);
        cell.appendChild(ui.el('div', '', '<b style="font-size:13px">' + spec.name + '</b><div style="font-size:12px;opacity:.8">' + (selected ? '✓ Selected' : owned ? 'Owned' : '● ' + spec.price) + '</div>'));
        drawCarPreview(cv, spec);
        cell.addEventListener('click', function (e) {
          e.stopPropagation();
          if (owned) {
            saved.car = spec.id;
            sfx('click');
          } else if (saved.coins >= spec.price) {
            saved.coins -= spec.price;
            saved.owned.push(spec.id);
            saved.car = spec.id;
            sfx('buy');
          } else {
            sfx('error');
            ui.toast(root, 'Need ' + (spec.price - saved.coins) + ' more coins', 1200);
            return;
          }
          save();
          updateHud();
          showGarage();
          render();
        });
        grid.appendChild(cell);
      });
      overlay = ui.overlay(root, {
        title: 'Garage',
        text: 'Coins: ' + saved.coins + ' — cars are cosmetic, boosters help you score.',
        buttons: [
          { label: '▶ Play', primary: true, onClick: startFromMenu },
          { label: '← Back', onClick: function () { showMenu(false); } },
        ],
      });
      overlay.panel.style.width = 'min(520px, 100%)';
      overlay.panel.insertBefore(grid, overlay.panel.querySelector('.ig-actions'));
    }

    function drawCarPreview(cv, spec) {
      var c2 = cv.getContext('2d');
      var PS = 120;
      var save1 = g;
      g = c2;
      var proj = {
        sx: function (x, y) { return 90 + (x - y) * 0.866 * PS; },
        sy: function (x, y, z) { return 72 - (x + y) * 0.5 * PS - (z || 0) * 0.9 * PS; },
      };
      c2.clearRect(0, 0, cv.width, cv.height);
      drawCar({ x: 0, y: 0, head: -0.35, z: 0 }, spec, { proj: proj });
      g = save1;
    }

    function pauseGame() {
      if (state !== 'playing' && state !== 'ready') return;
      var prev = state;
      state = 'paused';
      closeOverlay();
      overlay = ui.overlay(root, {
        title: 'Paused',
        buttons: [
          {
            label: '▶ Resume',
            primary: true,
            onClick: function () {
              closeOverlay();
              state = prev === 'playing' ? 'ready' : prev;
              ctx.focus();
            },
          },
          { label: 'Quit run', onClick: function () { closeOverlay(); gameOver(); } },
        ],
      });
      updateHud();
    }

    /* ---------------- input ---------------- */
    function press() {
      if (state === 'ready') {
        state = 'playing';
        sfx('boost');
      }
    }
    function onPointerDown(e) {
      if (e.button != null && e.button > 0) return;
      holdPointers[e.pointerId] = true;
      pointerHold = true;
      press();
      try { view.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onPointerUp(e) {
      delete holdPointers[e.pointerId];
      pointerHold = Object.keys(holdPointers).length > 0;
    }
    view.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    pauseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      pauseGame();
    });
    ctx.captureKeys(['Enter', 'KeyP', 'KeyD']);
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (code === 'KeyP' || code === 'Escape') {
        if (state === 'playing' || state === 'ready') pauseGame();
        return;
      }
      if (code === 'Space' || code === 'Enter' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'KeyD') {
        if (overlay) {
          var primary = overlay.panel.querySelector('.ig-actions .ig-btn');
          if (primary && (code === 'Space' || code === 'Enter')) primary.click();
          return;
        }
        press();
      }
    });

    /* ---------------- boot ---------------- */
    var loop = IGAME.loop(function (dt) {
      if (state !== 'paused') update(dt);
      render();
    });
    booted = true;
    buildScenery();
    newRun(false);
    showMenu(false);
    loop.start();

    if (ctx.debug) {
      window.__edgeDrift = {
        state: function () { return { state: state, score: run && Math.floor(run.score), seg: car && car.seg, v: car && car.v }; },
      };
    }

    return {
      pause: function () {
        if (state === 'playing') pauseGame();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        if (run && !run.banked && run.coins) {
          // bank coins collected in an abandoned run
          saved.coins += run.coins;
          save();
        }
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        view.canvas.removeEventListener('pointerdown', onPointerDown);
        view.destroy();
        if (ctx.debug) delete window.__edgeDrift;
      },
    };
  });
})();
