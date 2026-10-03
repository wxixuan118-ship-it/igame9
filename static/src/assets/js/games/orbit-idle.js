/*!
 * Ringspin — igame9 original "orbits" incremental (Revolution Idle style).
 *
 * Glowing bodies circle a core. Every time one crosses the 12 o'clock line it completes a
 * revolution and pays Stardust (✦). Buy Value and Speed levels per ring, unlock outer
 * rings, then:
 *   Eclipse   (layer 1) → reset rings for Umbra (◐), spent in a permanent shop
 *                         (multipliers, autobuyers, auto-unlock, offline boost…)
 *   Supernova (layer 2) → reset Eclipse progress for Nova cores (◉): ×2 Stardust each,
 *                         milestones unlock rings VII–VIII and Auto-Eclipse.
 * Active play: tap the orbit field for a spin pulse, catch comets for bonuses.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var TOP = -Math.PI / 2; // revolutions complete at 12 o'clock
  var SAVE_VER = 1;
  var OFFLINE_CAP = 8 * 3600;
  var ECLIPSE_GATE = 1e6; // run Stardust needed for the first Eclipse
  var NOVA_GATE = 200; // Umbra earned since last Supernova needed for one core
  var VAL_GROWTH = 1.16;
  var SPD_GROWTH = 1.55;
  var SPD_MAX = 40;
  var PULSE_SEC = 0.15; // a tap advances every orb by this many seconds of motion

  var RINGS = [
    { name: 'Pebble', color: '#fb923c', unlock: 0, speed: 0.5, value: 1, vc: 4, sc: 15 },
    { name: 'Moonlet', color: '#facc15', unlock: 40, speed: 0.36, value: 10, vc: 50, sc: 250 },
    { name: 'Comet', color: '#a3e635', unlock: 800, speed: 0.27, value: 110, vc: 700, sc: 4e3 },
    { name: 'Planet', color: '#34d399', unlock: 1.6e4, speed: 0.2, value: 1300, vc: 1e4, sc: 6e4 },
    { name: 'Gas Giant', color: '#22d3ee', unlock: 4e5, speed: 0.15, value: 1.6e4, vc: 1.6e5, sc: 1e6 },
    { name: 'Star', color: '#60a5fa', unlock: 1.2e7, speed: 0.115, value: 2e5, vc: 2.5e6, sc: 2e7 },
    { name: 'Pulsar', color: '#a78bfa', unlock: 5e8, speed: 0.09, value: 2.6e6, vc: 5e7, sc: 5e8, nova: 1 },
    { name: 'Quasar', color: '#f472b6', unlock: 3e10, speed: 0.07, value: 3.4e7, vc: 1e9, sc: 1.5e10, nova: 4 },
  ];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  var HAS_CONIC = typeof CanvasRenderingContext2D !== 'undefined' && typeof CanvasRenderingContext2D.prototype.createConicGradient === 'function';

  // Eclipse shop (bought with Umbra ◐). max: level cap (1 = one-time).
  var SHOP = [
    { id: 'dark', name: 'Dark Matter', desc: 'All ring values ×2 per level', base: 1, mul: 3, max: 99 },
    { id: 'mom', name: 'Momentum', desc: 'All orbit speeds ×1.25 per level', base: 2, mul: 4, max: 5 },
    { id: 'head', name: 'Head Start', desc: 'Begin each Eclipse with rings II and III unlocked', base: 2, mul: 1, max: 1 },
    { id: 'autoV', name: 'Autobuyer: Value', desc: 'Automatically buys Value levels (toggle in ⚙)', base: 3, mul: 1, max: 1 },
    { id: 'lure', name: 'Comet Lure', desc: 'Comets appear twice as often', base: 4, mul: 1, max: 1 },
    { id: 'autoS', name: 'Autobuyer: Speed', desc: 'Automatically buys Speed levels (toggle in ⚙)', base: 5, mul: 1, max: 1 },
    { id: 'sleep', name: 'Deep Sleep', desc: 'Offline progress at 100% instead of 50%', base: 6, mul: 1, max: 1 },
    { id: 'autoU', name: 'Auto-Unlock', desc: 'Unlocks new rings as soon as you can afford them', base: 8, mul: 1, max: 1 },
    { id: 'echo', name: 'Umbral Echo', desc: 'Umbra gained from Eclipses ×2', base: 25, mul: 1, max: 1 },
  ];
  var SHOP_BY_ID = {};
  SHOP.forEach(function (x) { SHOP_BY_ID[x.id] = x; });
  var AUTO_IDS = ['autoV', 'autoS', 'autoU'];

  // Supernova milestones (by Nova cores held).
  var NOVA_MS = [
    { need: 1, text: 'Ring VII (Pulsar) can be unlocked · autobuyers survive Supernova' },
    { need: 2, text: 'Auto-Eclipse: eclipses for you when the gain would double your ◐' },
    { need: 4, text: 'Ring VIII (Quasar) can be unlocked' },
    { need: 7, text: 'Every Eclipse starts with all available rings unlocked' },
    { need: 12, text: 'Umbra gain ×3' },
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function fmt(n) { return IGAME.fmt(n); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  var CSS = [
    '.oi-app{position:absolute;inset:0;display:grid;font-size:var(--oi-fs,14px);color:#eef0ff;background:#04050d;overflow:hidden;line-height:1.3}',
    '.oi-app *{box-sizing:border-box}',
    '.oi-app.oi-wide{grid-template-columns:minmax(0,1fr) var(--oi-pw,40%)}',
    '.oi-app.oi-tall{grid-template-rows:var(--oi-sh,46%) minmax(0,1fr)}',
    '.oi-scene{position:relative;overflow:hidden;min-width:0;min-height:0;cursor:pointer}',
    '.oi-panel{display:flex;flex-direction:column;min-height:0;min-width:0;background:#0b0d1d;border-left:1px solid rgba(255,255,255,.08)}',
    '.oi-tall .oi-panel{border-left:0;border-top:1px solid rgba(255,255,255,.08)}',
    '.oi-tabs{display:flex;gap:.25em;padding:.45em .45em 0;flex:none}',
    '.oi-pfs .oi-tabs{padding-right:56px}',
    '.oi-pfs.oi-tall .oi-tabs{padding-right:.45em}',
    '.oi-pfs.oi-tall .oi-hud-r{margin-right:48px}',
    '.oi-tab{position:relative;flex:1 1 0;min-width:0;border:1px solid transparent;border-bottom:0;background:transparent;color:#9aa0cc;font:inherit;font-weight:800;font-size:.86em;padding:.6em .2em .55em;border-radius:.7em .7em 0 0;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation}',
    '.oi-tab:hover{color:#fff}',
    '.oi-tab.is-on{background:#12152c;color:#fff;border-color:rgba(255,255,255,.09)}',
    '.oi-tab.is-lock{opacity:.45}',
    '.oi-dot{position:absolute;top:.35em;right:.35em;width:.5em;height:.5em;border-radius:50%;background:#c4b5fd;box-shadow:0 0 6px #a78bfa;display:none}',
    '.oi-tab.has-dot .oi-dot{display:block}',
    '.oi-body{flex:1;display:flex;flex-direction:column;min-height:0;background:#12152c;border-top:1px solid rgba(255,255,255,.09);margin-top:-1px}',
    '.oi-sub{flex:none;display:flex;align-items:center;gap:.4em;padding:.5em .6em .2em;color:#9aa0cc;font-size:.85em;flex-wrap:wrap}',
    '.oi-sub b{color:#fff}',
    '.oi-sub:empty{display:none}',
    '.oi-seg{display:inline-flex;margin-left:auto;background:#04050d;border:1px solid rgba(255,255,255,.1);border-radius:.6em;padding:.15em}',
    '.oi-seg button{border:0;background:transparent;color:#9aa0cc;font:inherit;font-weight:800;padding:.25em .6em;border-radius:.45em;cursor:pointer;touch-action:manipulation}',
    '.oi-seg button.is-on{background:#7c5cff;color:#fff}',
    '.oi-list{flex:1;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:.4em .5em .8em;-webkit-overflow-scrolling:touch;scrollbar-width:thin}',
    '.oi-ring{border-radius:.8em;background:#181c3a;border:1px solid rgba(255,255,255,.08);padding:.5em .55em;margin-bottom:.45em}',
    '.oi-ring.is-lock{opacity:.6}',
    '.oi-rh{display:flex;align-items:center;gap:.5em;margin-bottom:.4em;min-width:0}',
    '.oi-orb{flex:none;width:1.25em;height:1.25em;border-radius:50%;box-shadow:0 0 .7em currentColor;background:currentColor}',
    '.oi-rn{font-weight:800;white-space:nowrap}',
    '.oi-rn small{color:#9aa0cc;font-weight:700;margin-left:.3em}',
    '.oi-rs{margin-left:auto;font-size:.82em;color:#9aa0cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;text-align:right}',
    '.oi-rs b{color:#fde68a}',
    '.oi-btns{display:grid;grid-template-columns:1fr 1fr;gap:.4em}',
    '.oi-buy{border:0;border-radius:.65em;padding:.42em .5em;font:inherit;font-weight:800;cursor:pointer;color:#fff;line-height:1.15;text-align:center;touch-action:manipulation;background:linear-gradient(135deg,#7c5cff,#22b8e6);box-shadow:0 3px 10px rgba(0,0,0,.3)}',
    '.oi-buy small{display:block;font-size:.78em;font-weight:700;opacity:.9}',
    '.oi-buy.is-spd{background:linear-gradient(135deg,#0ea5e9,#14b8a6)}',
    '.oi-buy.is-off{background:#262b52;color:#8a90bd;box-shadow:none;cursor:default}',
    '.oi-buy.is-max{background:#1d2a2a;color:#5eead4;box-shadow:none;cursor:default}',
    '.oi-buy:not(.is-off):not(.is-max):hover{filter:brightness(1.1)}',
    '.oi-buy:not(.is-off):not(.is-max):active{transform:translateY(1px)}',
    '.oi-buy.oi-full{width:100%;padding:.65em;font-size:1.02em}',
    '.oi-card{border-radius:.9em;background:#181c3a;border:1px solid rgba(255,255,255,.08);padding:.75em .85em;margin-bottom:.5em}',
    '.oi-card h4{margin:0 0 .25em;font-size:1.05em}',
    '.oi-card p{margin:.2em 0;color:#a2a8d6;font-size:.9em}',
    '.oi-big{font-size:1.6em;font-weight:900}',
    '.oi-bar{height:.32em;border-radius:1em;background:#04050d;margin:.45em 0;overflow:hidden}',
    '.oi-bar i{display:block;height:100%;width:0;border-radius:1em;background:linear-gradient(90deg,#7c5cff,#22d3ee)}',
    '.oi-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6em;align-items:center;padding:.5em 0;border-top:1px solid rgba(255,255,255,.07)}',
    '.oi-item:first-of-type{border-top:0}',
    '.oi-item b{display:block}',
    '.oi-item span{color:#9aa0cc;font-size:.85em}',
    '.oi-item .oi-buy{min-width:5.6em}',
    '.oi-ms{display:flex;gap:.55em;align-items:flex-start;padding:.4em 0;border-top:1px solid rgba(255,255,255,.07);font-size:.88em;color:#a2a8d6}',
    '.oi-ms:first-of-type{border-top:0}',
    '.oi-ms i{flex:none;font-style:normal;min-width:2.4em;text-align:center;border-radius:1em;padding:.1em .3em;background:#04050d;color:#9aa0cc;font-weight:900;font-size:.85em}',
    '.oi-ms.is-on{color:#eef0ff}',
    '.oi-ms.is-on i{background:#a78bfa;color:#120a2a}',
    '.oi-kv{display:grid;grid-template-columns:1fr auto;gap:.25em .8em;font-size:.9em}',
    '.oi-kv span{color:#9aa0cc}',
    '.oi-kv b{text-align:right}',
    '.oi-tg{display:flex;align-items:center;justify-content:space-between;gap:.6em;padding:.4em 0;border-top:1px solid rgba(255,255,255,.07);font-size:.9em}',
    '.oi-tg:first-of-type{border-top:0}',
    '.oi-sw{flex:none;width:3em;height:1.6em;border-radius:1em;border:0;background:#2a2f58;position:relative;cursor:pointer;touch-action:manipulation}',
    '.oi-sw::after{content:"";position:absolute;top:.2em;left:.2em;width:1.2em;height:1.2em;border-radius:50%;background:#9aa0cc;transition:left .15s,background .15s}',
    '.oi-sw.is-on{background:#6d4dff}',
    '.oi-sw.is-on::after{left:1.6em;background:#fff}',
    '.oi-sbtn{border:1px solid rgba(255,255,255,.14);background:#04050d;color:#eef0ff;font:inherit;font-weight:800;padding:.5em .9em;border-radius:.6em;cursor:pointer;touch-action:manipulation;margin-top:.4em}',
    '.oi-sbtn.is-danger{color:#fca5a5;border-color:rgba(248,113,113,.45)}',
    '.oi-sbtn.is-armed{background:#b91c1c;color:#fff;border-color:#ef4444}',
    '.oi-note{font-size:.8em;color:#8f95c2;margin-top:.35em}',
    '.oi-hud{position:absolute;left:0;right:0;top:0;padding:.6em .7em 0;display:flex;align-items:flex-start;gap:.5em;pointer-events:none;z-index:3}',
    '.oi-money{min-width:0;flex:1;text-shadow:0 2px 8px rgba(0,0,0,.7)}',
    '.oi-pts{font-weight:900;font-size:1.9em;line-height:1;color:#fff;letter-spacing:-.02em;white-space:nowrap}',
    '.oi-pts em{font-style:normal;color:#c4b5fd;margin-right:.12em}',
    '.oi-rate{font-weight:800;font-size:.92em;color:#fde68a;margin-top:.15em;white-space:nowrap}',
    '.oi-hud-r{display:flex;flex-direction:column;gap:.3em;align-items:flex-end;pointer-events:auto}',
    '.oi-pill{font-weight:800;font-size:.82em;color:#fff;background:rgba(4,5,13,.65);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:.25em .65em;white-space:nowrap}',
    '.oi-pill:empty{display:none}',
    '.oi-boost{color:#1a1300;background:linear-gradient(135deg,#fde047,#fb923c);border:0}',
    '.oi-goal{position:absolute;left:.7em;top:calc(var(--oi-fs) * 4.2);z-index:3;max-width:min(24em,calc(100% - 1.4em));text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(4,5,13,.66);color:#fff;font:inherit;font-size:.84em;font-weight:700;padding:.4em .7em .45em;border-radius:.7em;cursor:pointer;touch-action:manipulation}',
    '.oi-tall .oi-goal{top:auto;bottom:.5em}',
    '.oi-goal span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.oi-goal em{font-style:normal;color:#9aa0cc;font-weight:800;margin-right:.3em}',
    '.oi-goal .oi-bar{margin:.3em 0 0;background:rgba(255,255,255,.12)}',
    '.oi-hint{position:absolute;left:50%;bottom:12%;transform:translateX(-50%);z-index:3;max-width:calc(100% - 1.2em);font-weight:800;font-size:.85em;color:#fff;background:rgba(4,5,13,.75);border:1px solid #7c5cff;border-radius:999px;padding:.35em .9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
    '.oi-tall .oi-hint{bottom:auto;top:calc(var(--oi-fs) * 4.4)}',
    '.oi-hint:empty{display:none}',
  ].join('\n');

  IGAME.register('orbit-idle', function (ctx) {
    var ui = IGAME.ui;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var root = ctx.root;
    var destroyed = false;

    /* ---------------- state ---------------- */
    function freshRings() {
      return RINGS.map(function (r, i) { return { u: i === 0, v: 0, s: 0 }; });
    }
    function freshState() {
      return {
        v: SAVE_VER,
        dust: 0, runDust: 0, totalDust: 0,
        rings: freshRings(),
        umbra: 0, umbraRun: 0, umbraTotal: 0,
        shop: {},
        novas: 0, supernovas: 0, eclipses: 0,
        auto: { autoV: true, autoS: true, autoU: true, ecl: true },
        buyMax: false,
        revs: 0, pulses: 0, comets: 0, best: 0, playTime: 0,
        introDone: false, tut: 0,
        lastSeen: Date.now(),
      };
    }
    function sanitize(o) {
      var s = freshState();
      if (!o || typeof o !== 'object') return s;
      ['dust', 'runDust', 'totalDust', 'umbra', 'umbraRun', 'umbraTotal', 'novas', 'supernovas', 'eclipses', 'revs', 'pulses', 'comets', 'best', 'playTime', 'tut', 'lastSeen'].forEach(function (k) {
        var n = Number(o[k]);
        if (isFinite(n) && n >= 0) s[k] = n;
      });
      if (Array.isArray(o.rings)) {
        for (var i = 0; i < RINGS.length; i++) {
          var r = o.rings[i] || {};
          s.rings[i] = { u: i === 0 || !!r.u, v: Math.max(0, Math.floor(+r.v || 0)), s: clamp(Math.floor(+r.s || 0), 0, SPD_MAX) };
        }
      }
      if (o.shop && typeof o.shop === 'object') for (var k in o.shop) if (SHOP_BY_ID[k]) s.shop[k] = clamp(Math.floor(+o.shop[k] || 0), 0, SHOP_BY_ID[k].max);
      if (o.auto && typeof o.auto === 'object') for (var a in s.auto) if (a in o.auto) s.auto[a] = !!o.auto[a];
      s.buyMax = !!o.buyMax;
      s.introDone = !!o.introDone;
      return s;
    }
    var hadSave = store.get('save', null) != null;
    var S = sanitize(store.get('save', null));
    function save() {
      S.lastSeen = Date.now();
      store.set('save', S);
    }

    /* ---------------- formulas ---------------- */
    function lvl(id) { return S.shop[id] || 0; }
    function has(id) { return lvl(id) > 0; }
    var boost = { t: 0, max: 0 };
    function valueMult() { return Math.pow(2, lvl('dark')) * Math.pow(2, S.novas); }
    function ringValue(i) {
      var r = S.rings[i];
      return RINGS[i].value * (1 + r.v) * Math.pow(2, Math.floor(r.v / 25)) * valueMult();
    }
    function ringSpeed(i) {
      // revolutions per second
      return RINGS[i].speed * Math.pow(1.1, S.rings[i].s) * Math.pow(1.25, lvl('mom')) * (boost.t > 0 ? 3 : 1);
    }
    function ringRate(i) { return S.rings[i].u ? ringValue(i) * ringSpeed(i) : 0; }
    function totalRate() {
      var r = 0;
      for (var i = 0; i < RINGS.length; i++) r += ringRate(i);
      return r;
    }
    function ringAvailable(i) { return !RINGS[i].nova || S.novas >= RINGS[i].nova; }
    function valCost(i, k) {
      var c0 = RINGS[i].vc * Math.pow(VAL_GROWTH, S.rings[i].v);
      return k === 1 ? c0 : (c0 * (Math.pow(VAL_GROWTH, k) - 1)) / (VAL_GROWTH - 1);
    }
    function spdCost(i, k) {
      var c0 = RINGS[i].sc * Math.pow(SPD_GROWTH, S.rings[i].s);
      return k === 1 ? c0 : (c0 * (Math.pow(SPD_GROWTH, k) - 1)) / (SPD_GROWTH - 1);
    }
    function maxCount(c0, g, cap) {
      if (S.dust < c0) return 0;
      var k = Math.floor(Math.log((S.dust * (g - 1)) / c0 + 1) / Math.log(g));
      return Math.max(1, Math.min(k, cap));
    }
    function valCount(i, forceMax) {
      if (!(forceMax || S.buyMax)) return 1;
      return Math.max(1, maxCount(RINGS[i].vc * Math.pow(VAL_GROWTH, S.rings[i].v), VAL_GROWTH, 1e4));
    }
    function spdCount(i, forceMax) {
      var left = SPD_MAX - S.rings[i].s;
      if (!(forceMax || S.buyMax)) return Math.min(1, left);
      return Math.max(Math.min(1, left), maxCount(RINGS[i].sc * Math.pow(SPD_GROWTH, S.rings[i].s), SPD_GROWTH, left));
    }
    function umbraGain() {
      if (S.runDust < ECLIPSE_GATE) return 0;
      var m = (has('echo') ? 2 : 1) * (1 + 0.25 * S.novas) * (S.novas >= 12 ? 3 : 1);
      return Math.floor(2 * Math.pow(S.runDust / 1e6, 0.4) * m);
    }
    function novaGain() {
      return Math.floor(Math.sqrt(S.umbraRun / NOVA_GATE));
    }
    function shopCost(it) {
      return it.base * Math.pow(it.mul, lvl(it.id));
    }
    function earn(n) {
      S.dust += n;
      S.runDust += n;
      S.totalDust += n;
    }

    /* ---------------- DOM ---------------- */
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var app = ui.el('div', 'oi-app oi-wide');
    root.appendChild(app);
    var scene = ui.el('div', 'oi-scene');
    app.appendChild(scene);
    var panel = ui.el('div', 'oi-panel');
    app.appendChild(panel);

    var hud = ui.el('div', 'oi-hud');
    hud.innerHTML =
      '<div class="oi-money"><div class="oi-pts"><em>✦</em><span></span></div><div class="oi-rate"></div></div>' +
      '<div class="oi-hud-r"><span class="oi-pill oi-um"></span><span class="oi-pill oi-nv"></span><span class="oi-pill oi-boost"></span></div>';
    scene.appendChild(hud);
    var elPts = hud.querySelector('.oi-pts span');
    var elRate = hud.querySelector('.oi-rate');
    var elUm = hud.querySelector('.oi-um');
    var elNv = hud.querySelector('.oi-nv');
    var elBoost = hud.querySelector('.oi-boost');
    var goalBtn = ui.el('button', 'oi-goal', '<span></span><div class="oi-bar"><i></i></div>');
    goalBtn.type = 'button';
    goalBtn.setAttribute('data-act', 'goal');
    scene.appendChild(goalBtn);
    var elGoalT = goalBtn.querySelector('span');
    var elGoalBar = goalBtn.querySelector('i');
    var elHint = ui.el('div', 'oi-hint', '');
    scene.appendChild(elHint);

    var TABS = ['Rings', 'Eclipse', 'Supernova', '⚙'];
    var tabsEl = ui.el('div', 'oi-tabs');
    TABS.forEach(function (label, i) {
      var b = ui.el('button', 'oi-tab', esc(label) + '<span class="oi-dot"></span>');
      b.type = 'button';
      b.setAttribute('data-act', 'tab');
      b.setAttribute('data-i', i);
      if (i === 3) b.setAttribute('aria-label', 'Settings and stats');
      tabsEl.appendChild(b);
    });
    panel.appendChild(tabsEl);
    var tabBtns = tabsEl.querySelectorAll('.oi-tab');
    var body = ui.el('div', 'oi-body');
    panel.appendChild(body);
    var subEl = ui.el('div', 'oi-sub');
    body.appendChild(subEl);
    var listEl = ui.el('div', 'oi-list');
    body.appendChild(listEl);

    /* ---------------- layout ---------------- */
    var tall = false;
    function layout() {
      var r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tall = r.width / r.height < 1.12;
      app.classList.toggle('oi-tall', tall);
      app.classList.toggle('oi-wide', !tall);
      // the shell shows an exit button in the top-right corner in pseudo-fullscreen
      app.classList.toggle('oi-pfs', !!(ctx.frame && ctx.frame.classList.contains('is-pseudo-fs')));
      var fs = tall ? clamp(Math.min(r.width / 29, r.height / 36), 11.5, 16) : clamp(Math.min(r.width / 76, r.height / 40), 11.5, 17);
      app.style.setProperty('--oi-fs', fs.toFixed(2) + 'px');
      app.style.setProperty('--oi-pw', clamp(Math.round(fs * 29), 290, Math.round(r.width * 0.48)) + 'px');
      app.style.setProperty('--oi-sh', '50%');
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
    if (ro) ro.observe(root);
    else window.addEventListener('resize', layout);
    layout();

    /* ---------------- canvas ---------------- */
    var W = 0, H = 0, CX = 0, CY = 0, RMAX = 100, TXT = 12;
    var bg = document.createElement('canvas');
    var bgDirty = true;
    var sprites = {}; // glow sprites per colour
    var view = IGAME.createCanvas(scene, {
      onResize: function (w, h) {
        W = w;
        H = h;
        if (tall) {
          RMAX = Math.min(w * 0.42, h * 0.45);
          CX = Math.max(w / 2, w - RMAX - w * 0.05);
          CY = h * 0.5;
        } else {
          RMAX = Math.min(w * 0.44, h * 0.42);
          CX = w / 2;
          CY = h * 0.54;
        }
        TXT = clamp(RMAX * 0.06, 10, 16);
        bgDirty = true;
      },
    });
    var g = view.ctx;

    function ringRadius(i) { return RMAX * (0.26 + (0.74 * (i + 1)) / RINGS.length); }

    function glowSprite(color) {
      if (sprites[color]) return sprites[color];
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var x = c.getContext('2d');
      var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.18, hexA(color, 0.95));
      gr.addColorStop(0.45, hexA(color, 0.35));
      gr.addColorStop(1, hexA(color, 0));
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      sprites[color] = c;
      return c;
    }

    function renderBg() {
      bgDirty = false;
      var dpr = view.dpr || 1;
      bg.width = Math.max(1, Math.round(W * dpr));
      bg.height = Math.max(1, Math.round(H * dpr));
      var b = bg.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gr = b.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.8);
      gr.addColorStop(0, '#120f2e');
      gr.addColorStop(0.5, '#080a1c');
      gr.addColorStop(1, '#03040a');
      b.fillStyle = gr;
      b.fillRect(0, 0, W, H);
      // nebula blobs
      var neb = [['#7c3aed', 0.2, 0.25], ['#0ea5e9', 0.85, 0.75], ['#db2777', 0.75, 0.15]];
      neb.forEach(function (n) {
        var ng = b.createRadialGradient(W * n[1], H * n[2], 0, W * n[1], H * n[2], Math.max(W, H) * 0.45);
        ng.addColorStop(0, hexA(n[0], 0.16));
        ng.addColorStop(1, hexA(n[0], 0));
        b.fillStyle = ng;
        b.fillRect(0, 0, W, H);
      });
      // stars
      var count = Math.round((W * H) / 2200);
      for (var i = 0; i < count; i++) {
        var a = Math.random();
        b.fillStyle = 'rgba(255,255,255,' + (0.15 + a * 0.6).toFixed(2) + ')';
        var s = a > 0.94 ? 1.6 : 1;
        b.fillRect(Math.random() * W, Math.random() * H, s, s);
      }
      // orbit paths
      for (var r = 0; r < RINGS.length; r++) {
        var rr = ringRadius(r);
        b.beginPath();
        b.arc(CX, CY, rr, 0, TAU);
        if (!S.rings[r].u) {
          b.setLineDash([3, 6]);
          b.strokeStyle = 'rgba(255,255,255,' + (ringAvailable(r) ? 0.12 : 0.05) + ')';
        } else {
          b.setLineDash([]);
          b.strokeStyle = hexA(RINGS[r].color, 0.18);
        }
        b.lineWidth = 1;
        b.stroke();
      }
      b.setLineDash([]);
      // finish line at 12 o'clock
      var lg = b.createLinearGradient(CX, CY, CX, CY - RMAX);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(1, 'rgba(255,255,255,.28)');
      b.strokeStyle = lg;
      b.lineWidth = 1.5;
      b.beginPath();
      b.moveTo(CX, CY - ringRadius(0) * 0.6);
      b.lineTo(CX, CY - RMAX - 6);
      b.stroke();
    }

    /* ---------------- particles ---------------- */
    var parts = [];
    var MAX_PARTS = 220;
    function spawn(kind, x, y, vx, vy, life, color, size, text) {
      if (parts.length >= MAX_PARTS) {
        if (kind !== 'text') return null;
        parts.shift();
      }
      var p = { kind: kind, x: x, y: y, vx: vx, vy: vy, life: life, age: 0, color: color, size: size, text: text || '' };
      parts.push(p);
      return p;
    }
    var ripples = [];

    /* ---------------- runtime ---------------- */
    // current angle per ring, spread by the golden angle so orbs start apart
    var ang = RINGS.map(function (r, i) { return TOP + 0.4 + ((i * 2.39996) % TAU); });
    var lastBurst = RINGS.map(function () { return 0; });
    var pendingText = RINGS.map(function () { return 0; });
    var lastText = RINGS.map(function () { return 0; });
    var flash = RINGS.map(function () { return 0; });
    var comet = null;
    var cometTimer = rand(40, 60);
    var autoT = 0;
    var tNow = 0;
    var uiT = 0;
    var tab = 0;
    var dirty = true;
    var sessionStart = Date.now();
    var lastEcon = performance.now();
    var shake = 0;
    var corePulse = 0;

    // Advance all rings by `sec` seconds of motion; returns Stardust earned.
    function advance(sec, visual) {
      var got = 0;
      for (var i = 0; i < RINGS.length; i++) {
        if (!S.rings[i].u) continue;
        var sp = ringSpeed(i);
        var a0 = ang[i] - TOP;
        var a1 = a0 + sp * sec * TAU;
        var laps = Math.floor(a1 / TAU) - Math.floor(a0 / TAU);
        ang[i] = TOP + (a1 % TAU);
        if (laps > 0) {
          var gain = laps * ringValue(i);
          got += gain;
          S.revs += laps;
          if (visual) onRevolution(i, gain);
        }
      }
      if (got > 0) earn(got);
      return got;
    }
    function onRevolution(i, gain) {
      var r = ringRadius(i);
      var x = CX, y = CY - r;
      flash[i] = 1;
      pendingText[i] += gain;
      if (tNow - lastBurst[i] > 0.12) {
        lastBurst[i] = tNow;
        var n = parts.length > 150 ? 4 : 9;
        for (var k = 0; k < n; k++) {
          var a = rand(0, TAU), sp = rand(30, 120) * (0.6 + RMAX / 400);
          spawn('spark', x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.35, 0.8), RINGS[i].color, rand(1.2, 2.6));
        }
        if (ringSpeed(i) < 2.5) sfx({ f: 520 + i * 90, f2: 780 + i * 110, d: 0.07, type: 'sine', v: 0.03 });
      }
      // gains are shown at most every 0.6 s per ring so fast rings stay readable
      if (tNow - lastText[i] > 0.6) {
        lastText[i] = tNow;
        var side = i % 2 ? -1 : 1; // alternate sides of the finish line so labels don't stack
        spawn('text', x + side * (TXT * 2.2 + rand(0, 6)), y - 4, side * 8, -34, 1.1, RINGS[i].color, TXT, '+' + fmt(pendingText[i]));
        pendingText[i] = 0;
      }
    }

    /* ---------------- actions ---------------- */
    function buyValue(i, forceMax) {
      if (!S.rings[i].u) return;
      var k = valCount(i, forceMax), c = valCost(i, k);
      if (S.dust < c) return sfx('error');
      S.dust -= c;
      var before = S.rings[i].v;
      S.rings[i].v += k;
      if (Math.floor(S.rings[i].v / 25) > Math.floor(before / 25)) {
        sfx('levelup');
        ui.toast(root, RINGS[i].name + ' resonance · value ×2');
      } else sfx('buy');
      if (S.tut < 2) S.tut = 2;
      afterBuy();
    }
    function buySpeed(i, forceMax) {
      if (!S.rings[i].u || S.rings[i].s >= SPD_MAX) return;
      var k = spdCount(i, forceMax), c = spdCost(i, k);
      if (k < 1 || S.dust < c) return sfx('error');
      S.dust -= c;
      S.rings[i].s += k;
      sfx('buy');
      if (S.tut < 2) S.tut = 2;
      afterBuy();
    }
    function unlockRing(i, silent) {
      if (S.rings[i].u || !ringAvailable(i) || (i > 0 && !S.rings[i - 1].u) || S.dust < RINGS[i].unlock) {
        if (!silent) sfx('error');
        return false;
      }
      S.dust -= RINGS[i].unlock;
      S.rings[i].u = true;
      ang[i] = TOP + 0.05;
      bgDirty = true;
      shake = 0.3;
      var r = ringRadius(i);
      for (var k = 0; k < 40; k++) {
        var a = (k / 40) * TAU;
        spawn('spark', CX + Math.cos(a) * r, CY + Math.sin(a) * r, Math.cos(a) * 40, Math.sin(a) * 40, 0.8, RINGS[i].color, 2);
      }
      sfx('win');
      ui.toast(root, 'Ring ' + ROMAN[i] + ' · ' + RINGS[i].name + ' unlocked');
      dirty = true;
      save();
      return true;
    }
    function afterBuy() {
      refreshPanel();
    }
    function pulse(x, y) {
      var got = advance(PULSE_SEC, true);
      S.pulses++;
      corePulse = 1;
      ripples.push({ r: ringRadius(0) * 0.3, a: 0.7 });
      if (ripples.length > 6) ripples.shift();
      sfx({ f: 300 + Math.random() * 60, f2: 520, d: 0.08, type: 'triangle', v: 0.05 });
      if (S.tut === 0 && S.pulses >= 6) S.tut = 1;
      return got;
    }
    function doEclipse(auto) {
      var gain = umbraGain();
      if (gain < 1) return sfx('error');
      var go = function () {
        S.umbra += gain;
        S.umbraRun += gain;
        S.umbraTotal += gain;
        S.eclipses++;
        resetRun();
        flashAll(auto ? 0.5 : 1);
        sfx('win');
        ui.toast(root, 'Eclipse! +' + fmt(gain) + ' ◐', 1800);
        dirty = true;
        save();
      };
      if (auto) return go();
      var ov = ui.overlay(root, {
        title: 'Eclipse?',
        html:
          '<p style="margin:0 0 8px">Gain <b style="color:#c4b5fd">+' + fmt(gain) + ' Umbra ◐</b> to spend in the Eclipse shop.</p>' +
          '<p style="margin:0">Stardust, ring unlocks and ring levels reset. Umbra, shop upgrades and Nova cores stay.</p>',
        buttons: [
          { label: 'Eclipse', primary: true, onClick: function () { ov.close(); go(); } },
          { label: 'Not yet', onClick: function () { ov.close(); } },
        ],
      });
    }
    function resetRun() {
      S.dust = 0;
      S.runDust = 0;
      S.rings = freshRings();
      if (has('head')) {
        S.rings[1].u = true;
        S.rings[2].u = true;
      }
      if (S.novas >= 7) for (var i = 1; i < RINGS.length; i++) if (ringAvailable(i)) S.rings[i].u = true;
      for (var k = 0; k < RINGS.length; k++) ang[k] = TOP + 0.4 + ((k * 2.39996) % TAU);
      bgDirty = true;
    }
    function doSupernova() {
      var gain = novaGain();
      if (gain < 1) return sfx('error');
      var ov = ui.overlay(root, {
        title: 'Supernova?',
        html:
          '<p style="margin:0 0 8px">Collapse everything into <b style="color:#f9a8d4">+' + fmt(gain) + ' Nova core' + (gain > 1 ? 's' : '') + ' ◉</b>. Each core doubles all Stardust forever.</p>' +
          '<p style="margin:0">Resets Stardust, rings, Umbra and the Eclipse shop' + (S.novas + gain >= 1 ? ' (autobuyers and Auto-Unlock are kept)' : '') + '.</p>',
        buttons: [
          {
            label: 'Go supernova',
            primary: true,
            onClick: function () {
              ov.close();
              var keep = {};
              AUTO_IDS.forEach(function (id) { if (S.shop[id]) keep[id] = S.shop[id]; });
              S.novas += gain;
              S.supernovas++;
              S.umbra = 0;
              S.umbraRun = 0;
              S.shop = keep; // milestone 1: automation survives
              resetRun();
              flashAll(1.5);
              shake = 0.9;
              sfx('explode');
              sfx('levelup');
              ui.toast(root, 'Supernova! +' + fmt(gain) + ' ◉', 2200);
              setTab(0);
              save();
            },
          },
          { label: 'Not yet', onClick: function () { ov.close(); } },
        ],
      });
    }
    function flashAll(power) {
      for (var i = 0; i < 90 * power && parts.length < MAX_PARTS; i++) {
        var a = rand(0, TAU), sp = rand(60, 320);
        spawn('spark', CX, CY, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.6, 1.3), ['#c4b5fd', '#f9a8d4', '#fde68a', '#67e8f9'][i % 4], rand(1.5, 3.2));
      }
      corePulse = 1.5;
      shake = Math.max(shake, 0.5);
    }
    function buyShop(id) {
      var it = SHOP_BY_ID[id];
      if (!it || lvl(id) >= it.max) return;
      var c = shopCost(it);
      if (S.umbra < c) return sfx('error');
      S.umbra -= c;
      S.shop[id] = lvl(id) + 1;
      sfx('buy');
      ui.toast(root, it.name + (it.max > 1 ? ' Lv ' + S.shop[id] : ' unlocked'));
      dirty = true;
      save();
    }
    function catchComet() {
      if (!comet) return;
      var c = comet;
      comet = null;
      S.comets++;
      shake = 0.3;
      for (var k = 0; k < 24; k++) {
        var a = rand(0, TAU), sp = rand(40, 200);
        spawn('spark', c.x, c.y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.4, 0.9), '#fde68a', rand(1.5, 3));
      }
      if (Math.random() < 0.5) {
        boost.t = boost.max = 15;
        spawn('text', clamp(c.x, W * 0.2, W * 0.8), c.y - 14, 0, -30, 1.6, '#fde047', TXT * 1.3, 'Overdrive! ×3 speed');
        sfx('boost');
      } else {
        var bonus = Math.max(60 * totalRate(), 25);
        earn(bonus);
        spawn('text', clamp(c.x, W * 0.2, W * 0.8), c.y - 14, 0, -30, 1.6, '#fde047', TXT * 1.3, 'Comet +' + fmt(bonus) + ' ✦');
        sfx('coin');
      }
    }

    /* ---------------- automation ---------------- */
    function runAutomation() {
      if (has('autoU') && S.auto.autoU) {
        for (var i = 1; i < RINGS.length; i++) if (!S.rings[i].u && S.rings[i - 1].u && ringAvailable(i) && S.dust >= RINGS[i].unlock) unlockRing(i, true);
      }
      // buy the single cheapest affordable level among enabled types, a few times per tick
      for (var n = 0; n < 8; n++) {
        var best = -1, bestC = Infinity, bestT = '';
        for (var r = 0; r < RINGS.length; r++) {
          if (!S.rings[r].u) continue;
          if (has('autoV') && S.auto.autoV) {
            var cv = valCost(r, 1);
            if (cv < bestC) { bestC = cv; best = r; bestT = 'v'; }
          }
          if (has('autoS') && S.auto.autoS && S.rings[r].s < SPD_MAX) {
            var cs = spdCost(r, 1);
            if (cs < bestC) { bestC = cs; best = r; bestT = 's'; }
          }
        }
        if (best < 0 || bestC > S.dust) break;
        S.dust -= bestC;
        if (bestT === 'v') S.rings[best].v++;
        else S.rings[best].s++;
      }
      // Auto-Eclipse (Nova milestone 2): when the gain would at least double current Umbra
      if (S.novas >= 2 && S.auto.ecl) {
        var gain = umbraGain();
        if (gain >= 1 && gain >= Math.max(1, S.umbra)) doEclipse(true);
      }
    }

    /* ---------------- panel ---------------- */
    var refs = [];
    function setTab(i) {
      if (i === 2 && S.eclipses === 0 && S.novas === 0) {
        ui.toast(root, 'Eclipse once to reveal Supernova');
        sfx('error');
        return;
      }
      tab = i;
      for (var k = 0; k < tabBtns.length; k++) tabBtns[k].classList.toggle('is-on', k === i);
      listEl.scrollTop = 0;
      dirty = true;
      renderPanel();
    }
    function renderPanel() {
      dirty = false;
      refs = [];
      var h = '', sub = '';
      if (tab === 0) {
        sub = '<span>Rings <b>' + S.rings.filter(function (r) { return r.u; }).length + '</b> / ' + RINGS.length + '</span>' +
          '<span class="oi-seg"><button type="button" data-act="mode" data-m="1" class="' + (S.buyMax ? '' : 'is-on') + '">×1</button><button type="button" data-act="mode" data-m="max" class="' + (S.buyMax ? 'is-on' : '') + '">Max</button></span>';
        var shownLock = false;
        for (var i = 0; i < RINGS.length; i++) {
          var R = RINGS[i], st = S.rings[i];
          if (st.u) {
            h += '<div class="oi-ring" data-ring="' + i + '"><div class="oi-rh"><span class="oi-orb" style="color:' + R.color + '"></span><span class="oi-rn">' + ROMAN[i] + ' · ' + esc(R.name) +
              '</span><span class="oi-rs"></span></div><div class="oi-btns"><button type="button" class="oi-buy" data-act="val" data-i="' + i + '"></button><button type="button" class="oi-buy is-spd" data-act="spd" data-i="' + i + '"></button></div></div>';
          } else if (!shownLock) {
            shownLock = true;
            if (!ringAvailable(i)) {
              h += '<div class="oi-ring is-lock"><div class="oi-rh"><span class="oi-orb" style="color:' + R.color + '"></span><span class="oi-rn">' + ROMAN[i] + ' · ' + esc(R.name) +
                '</span><span class="oi-rs">Needs ' + R.nova + ' Nova core' + (R.nova > 1 ? 's' : '') + ' ◉</span></div></div>';
            } else {
              h += '<div class="oi-ring" data-ring="' + i + '"><div class="oi-rh"><span class="oi-orb" style="color:' + R.color + '"></span><span class="oi-rn">' + ROMAN[i] + ' · ' + esc(R.name) +
                '</span><span class="oi-rs">' + fmt(R.value * valueMult()) + ' per lap</span></div><button type="button" class="oi-buy oi-full" data-act="unlock" data-i="' + i + '"></button></div>';
            }
          }
        }
      } else if (tab === 1) {
        sub = '<span>Umbra <b>' + fmt(S.umbra) + ' ◐</b> · ' + S.eclipses + ' eclipse' + (S.eclipses === 1 ? '' : 's') + '</span>';
        h += '<div class="oi-card"><h4>Eclipse</h4><p>Reset Stardust and rings for Umbra. Gain = 2 × (run Stardust ÷ 1M)<sup>0.4</sup>.</p><p class="oi-einfo"></p>' +
          '<div class="oi-bar"><i class="oi-ebar"></i></div><button type="button" class="oi-buy oi-full" data-act="eclipse"></button></div>';
        h += '<div class="oi-card"><h4>Eclipse shop</h4>' + SHOP.map(function (it) {
          var L = lvl(it.id), maxed = L >= it.max;
          return '<div class="oi-item"><div><b>' + esc(it.name) + (it.max > 1 ? ' <small style="color:#9aa0cc">Lv ' + L + '</small>' : '') + '</b><span>' + esc(it.desc) + '</span></div>' +
            '<button type="button" class="oi-buy' + (maxed ? ' is-max' : '') + '" data-act="shop" data-id="' + it.id + '">' + (maxed ? (it.max > 1 ? 'Max' : 'Owned') : fmt(shopCost(it)) + ' ◐') + '</button></div>';
        }).join('') + '</div>';
      } else if (tab === 2) {
        sub = '<span>Nova cores <b>' + fmt(S.novas) + ' ◉</b> · Stardust ×' + fmt(Math.pow(2, S.novas)) + '</span>';
        h += '<div class="oi-card"><h4>Supernova</h4><p>Collapse your Eclipse progress into Nova cores. Each core doubles all Stardust permanently. Needs ' + NOVA_GATE + ' ◐ earned since the last Supernova for the first core.</p>' +
          '<p class="oi-ninfo"></p><div class="oi-bar"><i class="oi-nbar"></i></div><button type="button" class="oi-buy oi-full" data-act="nova"></button></div>';
        h += '<div class="oi-card"><h4>Milestones</h4>' + NOVA_MS.map(function (m) {
          return '<div class="oi-ms' + (S.novas >= m.need ? ' is-on' : '') + '"><i>' + m.need + ' ◉</i><div>' + esc(m.text) + '</div></div>';
        }).join('') + '</div>';
      } else {
        sub = '<span>Settings &amp; stats</span>';
        var tg = '';
        if (has('autoV')) tg += toggle('autoV', 'Autobuyer: Value');
        if (has('autoS')) tg += toggle('autoS', 'Autobuyer: Speed');
        if (has('autoU')) tg += toggle('autoU', 'Auto-Unlock rings');
        if (S.novas >= 2) tg += toggle('ecl', 'Auto-Eclipse');
        h += '<div class="oi-card"><h4>Automation</h4>' + (tg || '<p>Buy autobuyers in the Eclipse shop to automate leveling.</p>') + '</div>';
        h += '<div class="oi-card"><h4>Stats</h4><div class="oi-kv">' + statsHtml() + '</div></div>';
        h += '<div class="oi-card"><h4>Offline progress</h4><p>While closed, rings keep spinning at <b>' + (has('sleep') ? '100%' : '50%') + '</b> for up to 8 hours. Autosaves every 5 seconds in this browser.</p></div>';
        h += '<div class="oi-card"><h4>Reset progress</h4><p>Erase everything, including Umbra and Nova cores. Cannot be undone.</p><button type="button" class="oi-sbtn is-danger" data-act="reset">Reset progress</button></div>';
      }
      subEl.innerHTML = sub;
      listEl.innerHTML = h;
      var rows = listEl.querySelectorAll('[data-ring]');
      for (var q = 0; q < rows.length; q++) {
        refs.push({
          i: +rows[q].getAttribute('data-ring'),
          rs: rows[q].querySelector('.oi-rs'),
          val: rows[q].querySelector('[data-act="val"]'),
          spd: rows[q].querySelector('[data-act="spd"]'),
          unl: rows[q].querySelector('[data-act="unlock"]'),
        });
      }
      refreshPanel();
    }
    function toggle(key, label) {
      return '<div class="oi-tg"><span>' + esc(label) + '</span><button type="button" class="oi-sw' + (S.auto[key] ? ' is-on' : '') + '" data-act="toggle" data-k="' + key + '" aria-pressed="' + !!S.auto[key] + '" aria-label="' + esc(label) + '"></button></div>';
    }
    function statsHtml() {
      var play = S.playTime + (Date.now() - sessionStart) / 1000;
      function kv(k, v) { return '<span>' + esc(k) + '</span><b>' + esc(String(v)) + '</b>'; }
      return kv('Stardust', fmt(S.dust) + ' ✦') + kv('Per second', fmt(totalRate()) + ' ✦') + kv('Best per second', fmt(S.best) + ' ✦') +
        kv('This Eclipse', fmt(S.runDust) + ' ✦') + kv('All time', fmt(S.totalDust) + ' ✦') + kv('Revolutions', fmt(S.revs)) +
        kv('Spin pulses', fmt(S.pulses)) + kv('Comets caught', fmt(S.comets)) + kv('Eclipses', fmt(S.eclipses)) +
        kv('Umbra earned', fmt(S.umbraTotal) + ' ◐') + kv('Supernovas', fmt(S.supernovas)) + kv('Play time', IGAME.fmtTime(play));
    }
    function setBtn(btn, html, cls) {
      if (!btn) return;
      if (btn._h !== html) {
        btn.innerHTML = html;
        btn._h = html;
      }
      if (btn._c !== cls) {
        btn.classList.toggle('is-off', cls === 'off');
        btn.classList.toggle('is-max', cls === 'max');
        btn._c = cls;
      }
    }
    function refreshPanel() {
      if (tab === 0) {
        for (var q = 0; q < refs.length; q++) {
          var f = refs[q], i = f.i;
          if (f.unl) {
            var uc = RINGS[i].unlock;
            setBtn(f.unl, 'Unlock ring · ' + fmt(uc) + ' ✦', S.dust >= uc ? '' : 'off');
            continue;
          }
          var st = S.rings[i];
          var kv = valCount(i), cv = valCost(i, kv);
          setBtn(f.val, 'Value +' + fmt(kv) + '<small>' + fmt(cv) + ' ✦</small>', S.dust >= cv ? '' : 'off');
          if (st.s >= SPD_MAX) setBtn(f.spd, 'Speed MAX<small>' + ringSpeed(i).toFixed(2) + ' rev/s</small>', 'max');
          else {
            var ks = spdCount(i), cs = spdCost(i, ks);
            setBtn(f.spd, 'Speed +' + ks + '<small>' + fmt(cs) + ' ✦</small>', S.dust >= cs ? '' : 'off');
          }
          var txt = 'Lv ' + st.v + ' · <b>' + fmt(ringValue(i)) + '</b>/lap · ' + ringSpeed(i).toFixed(ringSpeed(i) < 10 ? 2 : 1) + '/s';
          if (f.rs._h !== txt) {
            f.rs.innerHTML = txt;
            f.rs._h = txt;
          }
        }
      } else if (tab === 1) {
        var eb = listEl.querySelector('[data-act="eclipse"]');
        var gain = umbraGain();
        setBtn(eb, gain >= 1 ? 'Eclipse for +' + fmt(gain) + ' ◐' : 'Reach ' + fmt(ECLIPSE_GATE) + ' ✦ this run', gain >= 1 ? '' : 'off');
        var info = listEl.querySelector('.oi-einfo');
        var t = 'This run: ' + fmt(S.runDust) + ' ✦' + (gain >= 1 ? ' — waiting longer raises the gain.' : '');
        if (info.textContent !== t) info.textContent = t;
        listEl.querySelector('.oi-ebar').style.width = clamp((S.runDust / ECLIPSE_GATE) * 100, 0, 100).toFixed(1) + '%';
        var items = listEl.querySelectorAll('[data-act="shop"]');
        for (var k = 0; k < items.length; k++) {
          var it = SHOP_BY_ID[items[k].getAttribute('data-id')];
          if (lvl(it.id) < it.max) items[k].classList.toggle('is-off', S.umbra < shopCost(it));
        }
      } else if (tab === 2) {
        var nb = listEl.querySelector('[data-act="nova"]');
        var ng = novaGain();
        setBtn(nb, ng >= 1 ? 'Supernova for +' + fmt(ng) + ' ◉' : 'Earn ' + NOVA_GATE + ' ◐ first', ng >= 1 ? '' : 'off');
        var ni = listEl.querySelector('.oi-ninfo');
        var tt = 'Umbra earned since last Supernova: ' + fmt(S.umbraRun) + ' ◐';
        if (ni.textContent !== tt) ni.textContent = tt;
        listEl.querySelector('.oi-nbar').style.width = clamp((S.umbraRun / NOVA_GATE) * 100, 0, 100).toFixed(1) + '%';
      }
    }
    var statT = 0;
    function refreshUI() {
      var rate = totalRate();
      if (rate > S.best) S.best = rate;
      elPts.textContent = fmt(S.dust);
      elRate.textContent = '+' + fmt(rate) + ' /s';
      elUm.textContent = S.umbra || S.eclipses ? fmt(S.umbra) + ' ◐' : '';
      elNv.textContent = S.novas ? fmt(S.novas) + ' ◉' : '';
      elBoost.textContent = boost.t > 0 ? 'OVERDRIVE ×3 · ' + Math.ceil(boost.t) + 's' : '';
      elBoost.style.display = boost.t > 0 ? '' : 'none';
      var gl = goal();
      var gt = '<em>NEXT</em>' + esc(gl.t);
      if (elGoalT._h !== gt) {
        elGoalT.innerHTML = gt;
        elGoalT._h = gt;
      }
      elGoalBar.style.width = clamp(gl.p * 100, 0, 100).toFixed(1) + '%';
      goalTab = gl.tab;
      var hint = S.tut === 0 ? (ctx.isTouch ? 'Tap' : 'Click') + ' the orbits to send a spin pulse' : S.tut === 1 ? 'Buy Value or Speed for ring I in the Rings tab' : '';
      if (elHint.textContent !== hint) elHint.textContent = hint;
      // tab dots + Supernova tab lock look
      var canRing = false;
      for (var i = 0; i < RINGS.length; i++) {
        var st = S.rings[i];
        if (st.u ? S.dust >= Math.min(valCost(i, 1), st.s < SPD_MAX ? spdCost(i, 1) : Infinity) : ringAvailable(i) && (i === 0 || S.rings[i - 1].u) && S.dust >= RINGS[i].unlock) { canRing = true; break; }
      }
      var canShop = umbraGain() >= 1;
      for (var k = 0; k < SHOP.length && !canShop; k++) if (lvl(SHOP[k].id) < SHOP[k].max && S.umbra >= shopCost(SHOP[k])) canShop = true;
      var dots = [canRing, canShop, novaGain() >= 1, false];
      for (var t = 0; t < tabBtns.length; t++) tabBtns[t].classList.toggle('has-dot', dots[t] && t !== tab);
      tabBtns[2].classList.toggle('is-lock', S.eclipses === 0 && S.novas === 0);
      // ring count changed (auto-unlock) → rebuild
      if (tab === 0 && refs.length && refs.some(function (f) { return f.unl && S.rings[f.i].u; })) dirty = true;
      if (tab === 3 && ++statT % 8 === 0) {
        var kvEl = listEl.querySelector('.oi-kv');
        if (kvEl) kvEl.innerHTML = statsHtml();
      }
      if (dirty) renderPanel();
      else refreshPanel();
    }
    var goalTab = -1;
    function goal() {
      if (S.tut === 0) return { t: (ctx.isTouch ? 'Tap' : 'Click') + ' the orbit field to pulse', p: S.pulses / 6, tab: -1 };
      for (var i = 1; i < RINGS.length; i++) {
        if (!S.rings[i].u) {
          if (!ringAvailable(i)) break;
          return { t: 'Unlock ring ' + ROMAN[i] + ' (' + RINGS[i].name + ') · ' + fmt(RINGS[i].unlock) + ' ✦', p: S.dust / RINGS[i].unlock, tab: 0 };
        }
      }
      var gain = umbraGain();
      if (gain < 1) return { t: 'Reach ' + fmt(ECLIPSE_GATE) + ' ✦ this run to Eclipse', p: S.runDust / ECLIPSE_GATE, tab: 1 };
      if (novaGain() >= 1) return { t: 'Supernova ready: +' + fmt(novaGain()) + ' ◉', p: 1, tab: 2 };
      return { t: 'Eclipse for +' + fmt(gain) + ' ◐', p: 1, tab: 1 };
    }

    /* ---------------- reset ---------------- */
    var resetArmed = 0;
    function resetProgress(btn) {
      if (!resetArmed || Date.now() - resetArmed > 4000) {
        resetArmed = Date.now();
        btn.classList.add('is-armed');
        btn.textContent = 'Tap again to confirm';
        sfx('error');
        return;
      }
      resetArmed = 0;
      var ov = ui.overlay(root, {
        title: 'Reset everything?',
        text: 'Stardust, rings, Umbra, the Eclipse shop, Nova cores and stats will be deleted.',
        buttons: [
          {
            label: 'Yes, reset',
            primary: true,
            onClick: function () {
              ov.close();
              store.remove('save');
              S = freshState();
              S.introDone = true;
              resetRun();
              parts.length = 0;
              comet = null;
              boost.t = 0;
              save();
              setTab(0);
              ui.toast(root, 'Progress reset');
            },
          },
          { label: 'Cancel', onClick: function () { ov.close(); renderPanel(); } },
        ],
      });
    }

    /* ---------------- input ---------------- */
    function onClick(e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t || !app.contains(t)) return;
      var act = t.getAttribute('data-act');
      var fm = e.ctrlKey || e.shiftKey || e.metaKey;
      var i = +t.getAttribute('data-i');
      if (act === 'tab') {
        sfx('tick');
        setTab(+t.getAttribute('data-i'));
      } else if (act === 'val') buyValue(i, fm);
      else if (act === 'spd') buySpeed(i, fm);
      else if (act === 'unlock') unlockRing(i);
      else if (act === 'mode') {
        S.buyMax = t.getAttribute('data-m') === 'max';
        sfx('tick');
        renderPanel();
      } else if (act === 'eclipse') doEclipse(false);
      else if (act === 'nova') doSupernova();
      else if (act === 'shop') buyShop(t.getAttribute('data-id'));
      else if (act === 'toggle') {
        var k = t.getAttribute('data-k');
        S.auto[k] = !S.auto[k];
        t.classList.toggle('is-on', S.auto[k]);
        t.setAttribute('aria-pressed', S.auto[k] ? 'true' : 'false');
        sfx('tick');
      } else if (act === 'goal') {
        if (goalTab >= 0) setTab(goalTab);
      } else if (act === 'reset') resetProgress(t);
    }
    app.addEventListener('click', onClick);

    function onPointer(e) {
      if (e.button != null && e.button > 0) return;
      var r = view.canvas.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (comet && Math.hypot(x - comet.x, y - comet.y) < comet.r * 2.6) {
        catchComet();
        return;
      }
      pulse(x, y);
    }
    view.canvas.addEventListener('pointerdown', onPointer);

    ctx.captureKeys(['KeyM', 'KeyC', 'Digit1', 'Digit2', 'Digit3', 'Digit4']);
    ctx.onKey(function (code, down) {
      if (!down || root.querySelector('.ig-overlay')) return;
      if (code === 'Space') pulse(CX, CY);
      else if (code === 'KeyC') catchComet();
      else if (code === 'KeyM') {
        S.buyMax = !S.buyMax;
        ui.toast(root, 'Buy mode: ' + (S.buyMax ? 'Max' : '×1'), 900);
        if (tab === 0) renderPanel();
      } else if (/^Digit[1-4]$/.test(code)) setTab(+code.slice(5) - 1);
    });

    /* ---------------- drawing ---------------- */
    function drawCore(t) {
      var pr = ringRadius(0) * 0.36 * (1 + corePulse * 0.25 + Math.sin(t * 2) * 0.04);
      var spr = glowSprite('#c4b5fd');
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.9;
      g.drawImage(spr, CX - pr * 2, CY - pr * 2, pr * 4, pr * 4);
      if (S.novas > 0) {
        var ns = glowSprite('#f472b6');
        g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
        g.drawImage(ns, CX - pr * 3, CY - pr * 3, pr * 6, pr * 6);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(CX, CY, pr * 0.35, 0, TAU);
      g.fill();
      // slowly rotating halo ticks around the core
      g.strokeStyle = 'rgba(196,181,253,.35)';
      g.lineWidth = 1.5;
      for (var h = 0; h < 12; h++) {
        var ha = t * 0.25 + (h / 12) * TAU;
        g.beginPath();
        g.arc(CX, CY, pr * 0.95, ha, ha + 0.22);
        g.stroke();
      }
      for (var i = ripples.length - 1; i >= 0; i--) {
        var rp = ripples[i];
        g.strokeStyle = 'rgba(196,181,253,' + rp.a.toFixed(3) + ')';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(CX, CY, rp.r, 0, TAU);
        g.stroke();
      }
    }
    function drawRings(t) {
      g.lineCap = 'butt';
      for (var i = 0; i < RINGS.length; i++) {
        if (!S.rings[i].u) continue;
        var R = RINGS[i], r = ringRadius(i), a = ang[i];
        var sp = ringSpeed(i) * TAU; // rad/s
        var col = R.color;
        var orbR = Math.max(3, RMAX * 0.028) * (1 + flash[i] * 0.5);
        // soft glow band along the whole orbit
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = hexA(col, 0.07);
        g.lineWidth = orbR * 2.4;
        g.beginPath();
        g.arc(CX, CY, r, 0, TAU);
        g.stroke();
        // trail: arc behind the orb, length grows with speed
        var trail = Math.min(TAU * 0.92, 0.6 + sp * 0.22);
        if (HAS_CONIC) {
          // one smooth stroke with a conic gradient fading towards the tail
          var cg = g.createConicGradient(a - trail, CX, CY);
          var f = trail / TAU;
          cg.addColorStop(0, hexA(col, 0));
          cg.addColorStop(f * 0.7, hexA(col, 0.32));
          cg.addColorStop(f, hexA(col, 0.85));
          cg.addColorStop(Math.min(1, f + 0.002), hexA(col, 0));
          cg.addColorStop(1, hexA(col, 0));
          g.strokeStyle = cg;
          g.lineWidth = orbR * 1.25;
          g.beginPath();
          g.arc(CX, CY, r, a - trail, a);
          g.stroke();
        } else {
          var segs = 10;
          for (var k = 0; k < segs; k++) {
            var a0 = a - trail * ((k + 1) / segs), a1 = a - trail * (k / segs);
            g.strokeStyle = hexA(col, (0.55 * (1 - k / segs)).toFixed(3));
            g.lineWidth = orbR * (1.1 - (k / segs) * 0.8);
            g.beginPath();
            g.arc(CX, CY, r, a0, a1 + 0.01);
            g.stroke();
          }
        }
        // very fast rings become a solid shimmering band
        if (sp > TAU * 4) {
          g.strokeStyle = hexA(col, (0.18 + 0.06 * Math.sin(t * 20 + i)).toFixed(3));
          g.lineWidth = orbR * 1.2;
          g.beginPath();
          g.arc(CX, CY, r, 0, TAU);
          g.stroke();
        }
        var ox = CX + Math.cos(a) * r, oy = CY + Math.sin(a) * r;
        var spr = glowSprite(col);
        var gs = orbR * 5;
        g.drawImage(spr, ox - gs / 2, oy - gs / 2, gs, gs);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(ox, oy, orbR * 0.55, 0, TAU);
        g.fill();
        // finish-line flash
        if (flash[i] > 0) {
          g.globalAlpha = flash[i];
          g.drawImage(spr, CX - gs, CY - r - gs, gs * 2, gs * 2);
          g.globalAlpha = 1;
        }
      }
      g.globalCompositeOperation = 'source-over';
    }
    function drawLockedHint() {
      // label the next ring to unlock on its dashed orbit
      for (var i = 1; i < RINGS.length; i++) {
        if (S.rings[i].u) continue;
        if (!ringAvailable(i) || !S.rings[i - 1].u) return;
        var r = ringRadius(i);
        g.font = '700 ' + Math.round(TXT * 0.85) + 'px system-ui,-apple-system,sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = S.dust >= RINGS[i].unlock ? 'rgba(253,230,138,.95)' : 'rgba(255,255,255,.4)';
        g.fillText('Ring ' + ROMAN[i] + ' · ' + fmt(RINGS[i].unlock) + ' ✦', CX, CY + r);
        return;
      }
    }
    function drawComet(dt) {
      if (!comet) return;
      var c = comet;
      c.t += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.t > c.life) {
        comet = null;
        return;
      }
      var len = Math.hypot(c.vx, c.vy) * 0.35;
      var nx = -c.vx / Math.hypot(c.vx, c.vy), ny = -c.vy / Math.hypot(c.vx, c.vy);
      var tg = g.createLinearGradient(c.x, c.y, c.x + nx * len, c.y + ny * len);
      tg.addColorStop(0, 'rgba(253,230,138,.9)');
      tg.addColorStop(1, 'rgba(253,230,138,0)');
      g.strokeStyle = tg;
      g.lineWidth = c.r * 1.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(c.x, c.y);
      g.lineTo(c.x + nx * len, c.y + ny * len);
      g.stroke();
      g.globalCompositeOperation = 'lighter';
      var spr = glowSprite('#fde68a');
      g.drawImage(spr, c.x - c.r * 3, c.y - c.r * 3, c.r * 6, c.r * 6);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(c.x, c.y, c.r * 0.6, 0, TAU);
      g.fill();
      // pulsing target ring so it reads as clickable
      g.strokeStyle = 'rgba(253,230,138,' + (0.4 + 0.3 * Math.sin(c.t * 8)).toFixed(3) + ')';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(c.x, c.y, c.r * 2.2, 0, TAU);
      g.stroke();
    }
    function drawParts(dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'spark') {
          p.vx *= 1 - 1.8 * dt;
          p.vy *= 1 - 1.8 * dt;
        }
      }
      g.globalCompositeOperation = 'lighter';
      for (var j = 0; j < parts.length; j++) {
        var q = parts[j];
        if (q.kind !== 'spark') continue;
        var k = q.age / q.life;
        g.globalAlpha = 1 - k;
        g.fillStyle = q.color;
        g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
      g.globalCompositeOperation = 'source-over';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (var m = 0; m < parts.length; m++) {
        var tq = parts[m];
        if (tq.kind !== 'text') continue;
        var kk = tq.age / tq.life;
        g.globalAlpha = kk < 0.7 ? 1 : 1 - (kk - 0.7) / 0.3;
        g.font = '800 ' + Math.round(tq.size) + 'px system-ui,-apple-system,sans-serif';
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0,0,0,.6)';
        g.strokeText(tq.text, tq.x, tq.y);
        g.fillStyle = tq.color;
        g.fillText(tq.text, tq.x, tq.y);
      }
      g.globalAlpha = 1;
    }
    function render(t, dt) {
      if (!W || !H) return;
      if (bgDirty) renderBg();
      g.save();
      if (shake > 0) g.translate(rand(-1, 1) * shake * 6, rand(-1, 1) * shake * 6);
      g.drawImage(bg, 0, 0, W, H);
      drawCore(t);
      drawRings(t);
      drawLockedHint();
      drawComet(dt);
      drawParts(dt);
      if (boost.t > 0) {
        g.strokeStyle = 'rgba(253,224,71,' + (0.15 + 0.1 * Math.sin(t * 8)).toFixed(3) + ')';
        g.lineWidth = 6;
        g.strokeRect(3, 3, W - 6, H - 6);
      }
      g.restore();
    }

    /* ---------------- loop ---------------- */
    var loop = IGAME.loop(function (dt, t) {
      tNow = t;
      // the economy uses real elapsed time; long gaps are handled as offline progress
      var now = performance.now();
      var edt = Math.min(5, Math.max(0, (now - lastEcon) / 1000));
      lastEcon = now;
      advance(edt, true);
      if (boost.t > 0) boost.t = Math.max(0, boost.t - edt);
      autoT += edt;
      if (autoT >= 0.25) {
        autoT = 0;
        runAutomation();
      }
      if (!comet && S.tut >= 2) {
        cometTimer -= edt * (has('lure') ? 2 : 1);
        if (cometTimer <= 0) {
          cometTimer = rand(55, 95);
          var fromLeft = Math.random() < 0.5;
          var sy = rand(H * 0.12, H * 0.5);
          comet = { x: fromLeft ? -20 : W + 20, y: sy, vx: (fromLeft ? 1 : -1) * W / 6.5, vy: rand(H * 0.02, H * 0.08), r: clamp(RMAX * 0.035, 5, 10), t: 0, life: 7.5 };
        }
      }
      for (var i = 0; i < RINGS.length; i++) if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 4);
      for (var k = ripples.length - 1; k >= 0; k--) {
        ripples[k].r += dt * RMAX * 1.6;
        ripples[k].a -= dt * 1.1;
        if (ripples[k].a <= 0 || ripples[k].r > RMAX * 1.1) ripples.splice(k, 1);
      }
      corePulse = Math.max(0, corePulse - dt * 2.5);
      if (shake > 0) shake = Math.max(0, shake - dt * 1.8);
      render(t, dt);
      uiT -= dt;
      if (uiT <= 0) {
        uiT = 0.12;
        refreshUI();
      }
    });

    /* ---------------- offline ---------------- */
    function applyOffline(sec, silentShort) {
      if (sec < 2) return;
      if (silentShort && sec < 60) {
        advance(sec, false);
        return;
      }
      var capped = Math.min(sec, OFFLINE_CAP);
      var factor = has('sleep') ? 1 : 0.5;
      var before = S.dust;
      var rate = 0;
      for (var i = 0; i < RINGS.length; i++) rate += ringRate(i);
      if (rate <= 0) return;
      earn(rate * capped * factor);
      var got = S.dust - before;
      save();
      var ov = ui.overlay(root, {
        title: 'Welcome back!',
        html:
          '<p style="margin:0 0 6px">Your rings kept spinning for <b>' + IGAME.fmtTime(sec) + '</b>' + (sec > OFFLINE_CAP ? ' (8h max)' : '') + '.</p>' +
          '<p style="margin:0;font-size:1.5em;font-weight:900;color:#fde68a">+' + fmt(got) + ' ✦</p>' +
          '<p style="margin:6px 0 0">Offline speed: ' + Math.round(factor * 100) + '%</p>',
        buttons: [{ label: 'Collect', primary: true, onClick: function () { ov.close(); sfx('coin'); } }],
      });
    }

    /* ---------------- boot ---------------- */
    setTab(0);
    if (!S.introDone) {
      var intro = ui.overlay(root, {
        title: esc(ctx.title || 'Ringspin'),
        html:
          '<p style="margin:0 0 8px">Every time an orb crosses the top line it completes a revolution and pays ✦ Stardust. Buy <b>Value</b> and <b>Speed</b> for each ring, unlock outer rings, then Eclipse and go Supernova for permanent multipliers.</p>' +
          '<p style="margin:0;font-size:13px;opacity:.8">' + (ctx.isTouch ? 'Tap the orbits' : 'Click the orbits (or press <span class="ig-kbd">Space</span>)') + ' for a spin pulse. Progress autosaves and continues offline.</p>',
        buttons: [
          {
            label: 'Start spinning',
            primary: true,
            onClick: function () {
              intro.close();
              S.introDone = true;
              save();
              sfx('levelup');
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
      root._oi = {
        S: function () { return S; },
        give: function (n) { earn(n); },
        offline: function (sec) { applyOffline(sec, false); },
        comet: function () { cometTimer = 0; S.tut = Math.max(S.tut, 2); },
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
        lastEcon = performance.now();
        loop.start();
      },
      destroy: function () {
        save();
        destroyed = true;
        loop.stop();
        clearInterval(saveTimer);
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
