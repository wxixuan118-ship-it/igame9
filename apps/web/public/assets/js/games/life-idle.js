/*!
 * Life Ladder — igame9 original rags-to-riches idle life simulator.
 * Start broke on the street at 18. Time ages your character (1 year every 15 s of play);
 * work jobs, study for promotions, buy businesses for passive income and assets that
 * raise your status and happiness. Keep an eye on health, energy and happiness, answer
 * random life events, and when your life ends your legacy points power the next generation.
 * Away from the page, businesses keep earning (measured with Date.now()); age is paused.
 */
(function () {
  'use strict';

  /* ================================================================== */
  /* Data                                                                */
  /* ================================================================== */
  var YEAR_SEC = 15; // real seconds per in-game year
  var START_AGE = 18;

  var JOBS = [
    { name: 'Can Collector', pay: 0.5, edu: 0, exp: 0 },
    { name: 'Dishwasher', pay: 1.5, edu: 0, exp: 1 },
    { name: 'Delivery Rider', pay: 5, edu: 1, exp: 2 },
    { name: 'Office Assistant', pay: 14, edu: 1, exp: 4 },
    { name: 'Electrician', pay: 40, edu: 2, exp: 6 },
    { name: 'Data Analyst', pay: 120, edu: 3, exp: 9 },
    { name: 'Product Manager', pay: 350, edu: 3, exp: 13 },
    { name: 'Vice President', pay: 1100, edu: 4, exp: 18 },
    { name: 'Chief Executive', pay: 4000, edu: 5, exp: 24 },
  ];
  var JOB_LOOK = [0, 0, 1, 1, 2, 2, 3, 4, 5];

  var EDU = [
    { name: 'High School Diploma', short: 'High school', cost: 150, years: 1.5 },
    { name: 'Trade Certificate', short: 'Trade cert.', cost: 2500, years: 2 },
    { name: 'College Degree', short: 'College', cost: 40000, years: 3 },
    { name: 'Master’s Degree', short: 'Master’s', cost: 400000, years: 2 },
    { name: 'Executive MBA', short: 'MBA', cost: 5e6, years: 2 },
  ];

  var BIZ = [
    { name: 'Lemonade Stand', cost: 25, inc: 1, color: '#facc15' },
    { name: 'Food Truck', cost: 500, inc: 12, color: '#fb923c' },
    { name: 'Car Wash', cost: 8000, inc: 120, color: '#38bdf8' },
    { name: 'Coffee Roastery', cost: 130000, inc: 1300, color: '#a16207' },
    { name: 'App Studio', cost: 2e6, inc: 13000, color: '#a78bfa' },
    { name: 'Movie Studio', cost: 35e6, inc: 150000, color: '#f43f5e' },
    { name: 'Rocket Company', cost: 700e6, inc: 2e6, color: '#e2e8f0' },
    { name: 'Orbital Bank', cost: 15e9, inc: 28e6, color: '#fbbf24' },
  ];
  var BIZ_GROWTH = 1.12;
  var BIZ_MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500];

  var HOMES = [
    { name: 'Cardboard Box', price: 0, status: 0, energy: 0.6 },
    { name: 'Shared Room', price: 400, status: 2, energy: 1.0 },
    { name: 'Studio Flat', price: 9000, status: 6, energy: 1.25 },
    { name: 'Suburban House', price: 300000, status: 20, energy: 1.5 },
    { name: 'Sky Penthouse', price: 12e6, status: 60, energy: 1.8 },
    { name: 'Island Villa', price: 1.5e9, status: 200, energy: 2.2 },
  ];
  var CARS = [
    { name: 'Old Bicycle', price: 120, status: 1, mult: 1.05 },
    { name: 'Used Hatchback', price: 6000, status: 4, mult: 1.12 },
    { name: 'Electric Sedan', price: 70000, status: 10, mult: 1.25 },
    { name: 'Sports Coupe', price: 1.5e6, status: 30, mult: 1.4 },
    { name: 'Private Jet', price: 90e6, status: 90, mult: 1.6 },
  ];
  var LUX = [
    { id: 'phone', name: 'Smartphone', price: 300, status: 1 },
    { id: 'rig', name: 'Gaming Rig', price: 3000, status: 2 },
    { id: 'watch', name: 'Designer Watch', price: 40000, status: 6 },
    { id: 'art', name: 'Art Collection', price: 5e6, status: 25 },
    { id: 'horse', name: 'Racehorse', price: 60e6, status: 40 },
    { id: 'moon', name: 'Moon Ticket', price: 800e6, status: 120 },
  ];

  // Net-worth ladder (persistent "dynasty" achievements). One entry is a business goal.
  var LADDER = [
    { nw: 1e3, name: 'Off the Streets' },
    { nw: 1e4, name: 'Steady Paycheck' },
    { nw: 1e5, name: 'Comfortable' },
    { nw: 1e6, name: 'Millionaire' },
    { nw: 1e7, name: 'Multi-Millionaire' },
    { nw: 1e8, name: 'Mogul' },
    { nw: 1e9, name: 'Billionaire' },
    { nw: 1e10, name: 'Titan of Industry' },
    { biz: 7, name: 'Found the Orbital Bank' },
    { nw: 1e11, name: 'Kingmaker' },
    { nw: 1e12, name: 'Trillionaire Dynasty' },
  ];

  var PERKS = [
    { id: 'fortune', name: 'Family Fortune', text: '×1.25 all income', max: 0, cost: function (l) { return Math.ceil(1.5 * Math.pow(1.4, l)); } },
    { id: 'trust', name: 'Trust Fund', text: 'start each life with more cash', max: 6, cost: function (l) { return 2 + 2 * l; } },
    { id: 'genes', name: 'Good Genes', text: '−12% health loss per year', max: 5, cost: function (l) { return 3 + 2 * l; } },
    { id: 'study', name: 'Quick Study', text: '−15% study time', max: 4, cost: function (l) { return 2 + 2 * l; } },
    { id: 'hustle', name: 'Street Smarts', text: '×1.5 Hustle rewards', max: 10, cost: function (l) { return 1 + l; } },
    { id: 'spoon', name: 'Silver Spoon', text: 'start in a better home', max: 3, cost: function (l) { return [4, 10, 25][l] || 999; } },
    { id: 'dreams', name: 'Sweet Dreams', text: '+10% away earnings', max: 5, cost: function (l) { return 3 + 3 * l; } },
    { id: 'weekend', name: 'Long Weekends', text: '+2h away-earnings cap', max: 4, cost: function (l) { return 3 + 3 * l; } },
  ];

  var FIRST = ['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Avery', 'Jamie', 'Rowan', 'Skyler', 'Robin', 'Charlie', 'Emery', 'Reese', 'Dana', 'Kai', 'Ari', 'Noor', 'Mika', 'Theo', 'Lena', 'Omar', 'Ines', 'Hugo', 'Zara'];
  var LAST = ['Ashford', 'Calloway', 'Pemberton', 'Quill', 'Marlowe', 'Thorne', 'Whitlock', 'Fairbanks', 'Holloway', 'Kestrel', 'Bramble', 'Sterling'];
  var SKIN = ['#f4c7a1', '#e7b48a', '#c68642', '#8d5524', '#5c3a21'];
  var HAIR = ['#2b1d14', '#5a3825', '#a0522d', '#d9a441', '#151515', '#9b2c2c'];
  var HOODIE = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'];

  var BASE_AWAY_EFF = 0.5;
  var BASE_AWAY_CAP = 8 * 3600;
  var HUSTLE_COST = 4;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  var ICON = {
    cash: '<svg viewBox="0 0 16 16"><rect x="1" y="3.5" width="14" height="9" rx="1.5" fill="#16a34a"/><rect x="2.5" y="5" width="11" height="6" rx="1" fill="#4ade80"/><circle cx="8" cy="8" r="2" fill="#16a34a"/></svg>',
    heart: '<svg viewBox="0 0 16 16"><path d="M8 14S1.5 9.8 1.5 5.6A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6.5 1.6C14.5 9.8 8 14 8 14Z" fill="#f43f5e"/></svg>',
    bolt: '<svg viewBox="0 0 16 16"><path d="M9.5 1 3 9h4l-1 6 6.5-8h-4Z" fill="#facc15"/></svg>',
    boltDark: '<svg viewBox="0 0 16 16"><path d="M9.5 1 3 9h4l-1 6 6.5-8h-4Z" fill="#14532d"/></svg>',
    smile: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="#38bdf8"/><circle cx="5.8" cy="6.5" r="1" fill="#0c4a6e"/><circle cx="10.2" cy="6.5" r="1" fill="#0c4a6e"/><path d="M5 9.5Q8 12.5 11 9.5" stroke="#0c4a6e" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 16 16"><path d="M8 .8 10 6 15.2 6.3 11.1 9.6 12.5 15 8 12 3.5 15 4.9 9.6.8 6.3 6 6Z" fill="#fbbf24"/></svg>',
    crown: '<svg viewBox="0 0 16 16"><path d="M2 12 3 4 6 7 8 2.5 10 7 13 4 14 12Z" fill="#fbbf24"/><rect x="2" y="12.5" width="12" height="2" rx="1" fill="#f59e0b"/></svg>',
    cake: '<svg viewBox="0 0 16 16"><rect x="2" y="8" width="12" height="6" rx="1" fill="#f9a8d4"/><rect x="2" y="8" width="12" height="2" fill="#fff"/><rect x="7.2" y="3.5" width="1.6" height="4.5" fill="#fde68a"/><circle cx="8" cy="3" r="1" fill="#f97316"/></svg>',
    lock: '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="#94a3b8"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="#94a3b8" stroke-width="1.8" fill="none"/></svg>',
    check: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#22c55e"/><path d="M4.5 8.2 7 10.5 11.5 5.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    pause: '<svg viewBox="0 0 16 16"><rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor"/><rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor"/></svg>',
    legacy: '<svg viewBox="0 0 16 16"><path d="M8 1 14 4v4.5c0 3.2-2.6 5.6-6 6.5-3.4-.9-6-3.3-6-6.5V4Z" fill="#c084fc"/><path d="M8 4.2 9 6.8 11.8 7 9.6 8.7 10.4 11.4 8 9.9 5.6 11.4 6.4 8.7 4.2 7 7 6.8Z" fill="#fde68a"/></svg>',
  };

  var CSS = [
    '.li-app{position:absolute;inset:0;display:grid;background:#0c0f1f;color:#eef0ff;font-size:var(--lifs,14px);line-height:1.3;overflow:hidden}',
    '.li-app.wide{grid-template-columns:minmax(0,1fr) minmax(0,var(--liside,40%));grid-template-rows:minmax(0,1fr)}',
    '.li-app.narrow{grid-template-columns:minmax(0,1fr);grid-template-rows:var(--liscene,46%) auto minmax(0,1fr)}',
    '.li-app svg,.li-ov svg{width:1.15em;height:1.15em;flex:none;display:inline-block;vertical-align:-0.2em}',
    '.li-ov .ig-panel{font-size:var(--lifs,14px)}',
    '.li-ov .ig-body p{margin:0 0 .6em}',
    '.li-scene{position:relative;overflow:hidden;min-height:0;cursor:pointer}',
    '.li-top{position:absolute;left:.5em;right:.5em;top:.5em;display:flex;gap:.4em;align-items:flex-start;z-index:3;pointer-events:none}',
    '.li-money{background:rgba(8,10,24,.72);border:1px solid rgba(255,255,255,.14);border-radius:.8em;padding:.25em .7em .3em;font-variant-numeric:tabular-nums}',
    '.li-money b{display:block;font-size:1.35em;font-weight:900;color:#86efac;line-height:1.1}',
    '.li-money span{font-size:.75em;color:#c4c8ea;font-weight:700}',
    '.li-money.bump b{animation:liBump .3s ease}',
    '@keyframes liBump{40%{transform:scale(1.08)}}',
    '.li-sp{flex:1}',
    '.li-pill{display:inline-flex;align-items:center;gap:.3em;font-weight:800;font-size:.85em;color:#fff;background:rgba(8,10,24,.72);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:.3em .7em;white-space:nowrap;pointer-events:auto}',
    'button.li-pill{cursor:pointer;font-family:inherit}',
    '.li-bars{position:absolute;left:.5em;right:.5em;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4em;z-index:3;pointer-events:none}',
    '.li-bar{display:flex;align-items:center;gap:.3em;background:rgba(8,10,24,.66);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:.15em .45em .15em .3em;font-size:.78em;font-weight:800}',
    '.li-bar .t{flex:1;height:.5em;border-radius:9px;background:rgba(255,255,255,.14);overflow:hidden}',
    '.li-bar .t i{display:block;height:100%;border-radius:9px;transition:width .3s}',
    '.li-bar .n{min-width:1.8em;text-align:right;font-variant-numeric:tabular-nums}',
    '.li-bar.low{border-color:#f43f5e;animation:liPulse 1s ease-in-out infinite}',
    '@keyframes liPulse{50%{box-shadow:0 0 0 3px rgba(244,63,94,.35)}}',
    '.li-goal{position:absolute;left:.5em;right:.5em;display:flex;align-items:center;gap:.5em;z-index:3;background:rgba(8,10,24,.72);border:1px solid rgba(255,255,255,.14);border-radius:.8em;padding:.32em .45em .32em .7em;font-size:.86em;cursor:default}',
    '.li-goal .t{flex:1;min-width:0}',
    '.li-goal .t b{color:#fde68a}',
    '.li-goal .gb{height:.32em;border-radius:9px;background:rgba(255,255,255,.12);margin-top:.25em;overflow:hidden}',
    '.li-goal .gb i{display:block;height:100%;background:linear-gradient(90deg,#4ade80,#fbbf24);border-radius:9px;transition:width .25s}',
    '.li-hustle{position:absolute;right:.6em;bottom:.6em;z-index:3;font:inherit;font-weight:900;color:#052e16;border:0;border-radius:1em;padding:.55em 1em;cursor:pointer;background:linear-gradient(135deg,#86efac,#facc15);box-shadow:0 6px 18px rgba(0,0,0,.35);touch-action:manipulation;text-align:center;line-height:1.15}',
    '.li-hustle small{display:block;font-size:.72em;font-weight:800;opacity:.8}',
    '.li-hustle:active{transform:translateY(2px) scale(.98)}',
    '.li-hustle.tired{filter:grayscale(.7);opacity:.7}',
    '.li-event{position:absolute;left:.5em;right:.5em;bottom:.5em;z-index:6;background:rgba(17,20,44,.96);border:1px solid #fbbf24;border-radius:1em;padding:.6em .7em;box-shadow:0 10px 30px rgba(0,0,0,.5);cursor:default;animation:liIn .25s ease}',
    '@keyframes liIn{from{transform:translateY(20px);opacity:0}}',
    '.li-event h4{margin:0 0 .2em;font-size:1em;display:flex;align-items:center;gap:.4em;color:#fde68a}',
    '.li-event p{margin:0 0 .5em;font-size:.85em;color:#d6d9ff}',
    '.li-event .row{display:flex;gap:.4em}',
    '.li-event .row button{flex:1}',
    '.li-event .tm{height:.25em;border-radius:9px;background:rgba(255,255,255,.1);margin-top:.45em;overflow:hidden}',
    '.li-event .tm i{display:block;height:100%;background:#fbbf24}',
    '.li-side{display:flex;flex-direction:column;min-height:0;background:#12152b;border-left:1px solid rgba(255,255,255,.08)}',
    '.li-app.narrow .li-side{display:contents}',
    '.li-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));background:#0e1124;border-bottom:1px solid rgba(255,255,255,.08)}',
    '.li-tab{position:relative;font:inherit;font-size:.8em;font-weight:800;color:#a5abd6;background:none;border:0;border-bottom:2px solid transparent;padding:.65em .1em;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation}',
    '.li-tab:hover{color:#fff}',
    '.li-tab.on{color:#fff;border-bottom-color:#4ade80;background:rgba(74,222,128,.07)}',
    '.li-tab .dot{position:absolute;top:.3em;right:.3em;width:.55em;height:.55em;border-radius:50%;background:#f43f5e;display:none}',
    '.li-tab.has-dot .dot{display:block}',
    '.li-panel{overflow-y:auto;overflow-x:hidden;min-height:0;padding:.6em;touch-action:pan-y;overscroll-behavior:contain;background:#12152b;scrollbar-width:thin;scrollbar-color:#3b4270 transparent}',
    '.li-h{font-weight:900;font-size:1.05em;margin:.1em 0 .45em;display:flex;align-items:center;gap:.4em;flex-wrap:wrap}',
    '.li-h small{font-weight:700;color:#a5abd6;font-size:.78em}',
    '.li-sub{color:#a5abd6;font-size:.84em;margin:-.2em 0 .6em}',
    '.li-card{background:#1a1e3d;border:1px solid rgba(255,255,255,.08);border-radius:.8em;padding:.55em .65em;margin-bottom:.5em}',
    '.li-card.cur{border-color:#4ade80;box-shadow:0 0 0 1px #4ade80 inset}',
    '.li-card.dim{opacity:.55}',
    '.li-row{display:flex;align-items:center;gap:.5em}',
    '.li-row .grow{flex:1;min-width:0}',
    '.li-name{font-weight:800}',
    '.li-desc{color:#a5abd6;font-size:.8em}',
    '.li-desc b{color:#e0e3ff}',
    '.li-desc .bad{color:#fb7185}',
    '.li-desc .ok{color:#86efac}',
    '.li-btn{font:inherit;font-size:.85em;font-weight:800;color:#fff;border:0;border-radius:.6em;padding:.5em .85em;cursor:pointer;background:linear-gradient(135deg,#22c55e,#0ea5e9);white-space:nowrap;touch-action:manipulation;min-height:2.3em}',
    '.li-btn.gold{background:linear-gradient(135deg,#f59e0b,#f43f5e)}',
    '.li-btn.sec{background:#2b3160}',
    '.li-btn.sm{padding:.3em .6em;min-height:2em;font-size:.8em}',
    '.li-btn:hover:not([disabled]){filter:brightness(1.1)}',
    '.li-btn:active:not([disabled]){transform:translateY(1px)}',
    '.li-btn[disabled]{opacity:.42;cursor:not-allowed;filter:grayscale(.5)}',
    '.li-pbar{height:.45em;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:.3em}',
    '.li-pbar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#22c55e,#0ea5e9)}',
    '.li-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(7.5em,1fr));gap:.35em;margin-bottom:.5em}',
    '.li-stat{background:#1a1e3d;border-radius:.6em;padding:.35em .55em;font-size:.82em;color:#a5abd6}',
    '.li-stat b{display:block;color:#fff;font-size:1.12em;font-variant-numeric:tabular-nums}',
    '.li-lvl{font-size:.75em;font-weight:800;color:#86efac;background:rgba(34,197,94,.16);border-radius:999px;padding:.05em .5em}',
    '.li-badge{display:inline-flex;align-items:center;gap:.25em;font-size:.78em;font-weight:800;border-radius:999px;padding:.1em .55em;background:rgba(251,191,36,.16);color:#fde68a}',
    '.li-seg{display:inline-flex;border-radius:.6em;overflow:hidden;border:1px solid rgba(255,255,255,.14)}',
    '.li-seg button{font:inherit;font-size:.78em;font-weight:800;color:#c4c8ea;background:#1a1e3d;border:0;padding:.35em .7em;cursor:pointer;touch-action:manipulation}',
    '.li-seg button.on{background:#22c55e;color:#052e16}',
    '.li-toggle{display:flex;align-items:center;justify-content:space-between;gap:.6em;padding:.45em 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.9em}',
    '.li-log{font-size:.8em;color:#a5abd6;display:grid;gap:.25em}',
    '.li-log div b{color:#e0e3ff}',
    '.li-ladder{display:grid;gap:.3em}',
    '.li-ladder div{display:flex;align-items:center;gap:.45em;font-size:.84em;color:#a5abd6}',
    '.li-ladder div.done{color:#e0e3ff}',
    '.li-ladder div.next{color:#fde68a;font-weight:800}',
    '.li-kbd{display:inline-block;font:700 .8em ui-monospace,monospace;padding:0 .4em;border-radius:.3em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}',
  ].join('\n');

  /* ================================================================== */
  /* Engine                                                              */
  /* ================================================================== */
  IGAME.register('life-idle', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;
    var fmt = IGAME.fmt;
    var destroyed = false;
    function money(n) { return (n < 0 ? '-$' : '$') + fmt(Math.abs(n)); }

    /* ---------------- state ---------------- */
    function newLife(prev) {
      var L = {
        first: pick(FIRST), age: START_AGE, cash: 0, job: 0, edu: 0, study: -1, studyT: 0, exp: 0,
        biz: BIZ.map(function () { return 0; }), invested: 0,
        home: 0, homes: [true, false, false, false, false, false], cars: [false, false, false, false, false], lux: {},
        health: 85, energy: 100, happy: 40, pets: 0, gym: false, charity: 0,
        cd: { doctor: 0, vacation: 0, night: 0, meditate: 0 },
        peak: 0, log: [], boost: 0, boostT: 0,
        skin: Math.floor(Math.random() * SKIN.length), hair: Math.floor(Math.random() * HAIR.length),
        style: Math.floor(Math.random() * 5), hoodie: Math.floor(Math.random() * HOODIE.length),
      };
      if (prev) {
        var t = prev.perks.trust;
        if (t > 0) L.cash = 500 * Math.pow(10, t - 1);
        var sp = prev.perks.spoon;
        for (var i = 1; i <= sp; i++) L.homes[i] = true;
        L.home = sp;
        if (sp) L.happy = 50;
      }
      return L;
    }
    function freshState() {
      var s = {
        v: 1, last: Date.now(), intro: false, gen: 1, family: pick(LAST),
        lp: 0, lpAll: 0, perks: { fortune: 0, trust: 0, genes: 0, study: 0, hustle: 0, spoon: 0, dreams: 0, weekend: 0 },
        ladder: 0, // highest ladder index reached (ever)
        st: { play: 0, earned: 0, lives: 0, bestNW: 0, oldest: 0, hustles: 0, events: 0, away: 0 },
        opt: { fx: true }, buyN: 1, history: [], over: null,
      };
      s.life = newLife(null);
      return s;
    }
    function loadState() {
      var s = store.get('save', null);
      if (!s || typeof s !== 'object' || !s.life) return freshState();
      var d = freshState();
      for (var k in d) if (s[k] === undefined) s[k] = d[k];
      ['perks', 'st', 'opt'].forEach(function (k) { for (var j in d[k]) if (s[k][j] === undefined) s[k][j] = d[k][j]; });
      var dl = newLife(null);
      for (var m in dl) if (s.life[m] === undefined) s.life[m] = dl[m];
      return s;
    }
    var S = loadState();
    function save() { S.last = Date.now(); store.set('save', S); }

    /* ---------------- model ---------------- */
    function L() { return S.life; }
    function milestoneMult(l) { var m = 1; for (var i = 0; i < BIZ_MILESTONES.length; i++) if (l >= BIZ_MILESTONES[i]) m *= 2; return m; }
    function nextMilestone(l) { for (var i = 0; i < BIZ_MILESTONES.length; i++) if (l < BIZ_MILESTONES[i]) return BIZ_MILESTONES[i]; return 0; }
    function fortune() { return Math.pow(1.25, S.perks.fortune); }
    function carMult() { var m = 1; L().cars.forEach(function (o, i) { if (o) m = Math.max(m, CARS[i].mult); }); return m; }
    function happyMult() { return 0.8 + 0.004 * L().happy; }
    function healthMult() { return L().health < 25 ? 0.7 : 1; }
    function salary() { var l = L(); return JOBS[l.job].pay * carMult() * (l.study >= 0 ? 0.6 : 1); }
    function bizIncome(i) { var lv = L().biz[i]; return BIZ[i].inc * lv * milestoneMult(lv); }
    function bizTotal() { var t = 0; for (var i = 0; i < BIZ.length; i++) t += bizIncome(i); return t; }
    function globalMult() { return happyMult() * fortune() * healthMult() * (L().boostT > 0 ? 2 : 1); }
    function income() { return (salary() + bizTotal()) * globalMult(); }
    function hustleValue() { return Math.max(2, salary() * 2 + bizTotal() * 0.15) * globalMult() * Math.pow(1.5, S.perks.hustle); }
    function bizCost(i, n) {
      var c0 = BIZ[i].cost * Math.pow(BIZ_GROWTH, L().biz[i]);
      return c0 * (Math.pow(BIZ_GROWTH, n) - 1) / (BIZ_GROWTH - 1);
    }
    function bizMaxN(i) {
      var c0 = BIZ[i].cost * Math.pow(BIZ_GROWTH, L().biz[i]);
      return Math.max(0, Math.floor(Math.log(L().cash * (BIZ_GROWTH - 1) / c0 + 1) / Math.log(BIZ_GROWTH)));
    }
    function status() {
      var l = L(), s = HOMES[l.home].status + l.charity;
      l.cars.forEach(function (o, i) { if (o) s += CARS[i].status; });
      LUX.forEach(function (x) { if (l.lux[x.id]) s += x.status; });
      return s;
    }
    function assetValue() {
      var l = L(), v = 0;
      l.homes.forEach(function (o, i) { if (o) v += HOMES[i].price; });
      l.cars.forEach(function (o, i) { if (o) v += CARS[i].price; });
      LUX.forEach(function (x) { if (l.lux[x.id]) v += x.price; });
      return v;
    }
    function netWorth() { var l = L(); return l.cash + l.invested + assetValue(); }
    function happyTarget() {
      var l = L();
      return clamp(30 + 14 * Math.log10(1 + status()) + (l.health > 60 ? 6 : l.health < 30 ? -12 : 0) + l.pets * 4, 5, 100);
    }
    function healthLossPerYear() {
      var a = L().age;
      var base = a < 35 ? 0.4 : a < 50 ? 1 : a < 65 ? 2 : a < 75 ? 3.5 : a < 85 ? 6 : 10;
      return base * (L().gym ? 0.65 : 1) * (L().happy < 25 ? 1.4 : 1) * Math.pow(0.88, S.perks.genes);
    }
    function energyRegen() { return 1.6 * HOMES[L().home].energy; }
    function studyYears(i) { return EDU[i].years * (1 - 0.15 * S.perks.study); }
    function lpFor(peak) { return Math.max(1, Math.floor(Math.pow(Math.max(0, Math.log10(Math.max(1, peak)) - 2), 1.6))); }
    function awayEff() { return Math.min(1, BASE_AWAY_EFF + 0.1 * S.perks.dreams); }
    function awayCap() { return BASE_AWAY_CAP + 2 * 3600 * S.perks.weekend; }
    function look() { var l = L(); return Math.min(5, Math.max(JOB_LOOK[l.job], Math.min(5, l.home))); }
    function actionCost(id) {
      var inc = income();
      if (id === 'doctor') return Math.max(60, inc * 20);
      if (id === 'vacation') return Math.max(300, inc * 45);
      if (id === 'night') return Math.max(20, inc * 8);
      return 0;
    }
    var ACTIONS = [
      { id: 'doctor', name: 'Doctor check-up', text: '+25 health', cd: 2 },
      { id: 'vacation', name: 'Vacation', text: '+30 happiness, +8 health', cd: 3 },
      { id: 'night', name: 'Night out', text: '+12 happiness', cd: 1 },
      { id: 'meditate', name: 'Meditate', text: '+6 happiness, +2 health (free)', cd: 1 },
    ];

    function addLog(text) {
      var l = L();
      l.log.unshift('<b>Age ' + Math.floor(l.age) + ':</b> ' + text);
      if (l.log.length > 14) l.log.length = 14;
    }
    function earn(n) { L().cash += n; S.st.earned += n; }

    /* ---------------- simulation ---------------- */
    var paused = false;
    var dead = false;
    var lastBirthday = Math.floor(L().age);
    function tick(dt) {
      if (!S.intro || paused || dead) return;
      var l = L();
      S.st.play += dt;
      earn(income() * dt);
      // aging & body
      l.age += dt / YEAR_SEC;
      l.exp += dt / YEAR_SEC;
      l.health -= healthLossPerYear() * dt / YEAR_SEC;
      l.energy = Math.min(100, l.energy + energyRegen() * dt);
      l.happy += (happyTarget() - l.happy) * Math.min(1, 0.015 * dt);
      for (var k in l.cd) if (l.cd[k] > 0) l.cd[k] = Math.max(0, l.cd[k] - dt / YEAR_SEC);
      if (l.boostT > 0) l.boostT -= dt;
      // studying
      if (l.study >= 0) {
        l.studyT += dt / YEAR_SEC;
        if (l.studyT >= studyYears(l.study)) {
          l.edu = l.study + 1;
          addLog('Graduated: <b>' + EDU[l.study].name + '</b>');
          toast('🎓 Graduated: ' + EDU[l.study].name + '!', 2000);
          sfx('levelup');
          celebrate(16);
          l.study = -1;
          l.studyT = 0;
          dirty = true;
        }
      }
      // birthdays every 10 years
      var yr = Math.floor(l.age);
      if (yr !== lastBirthday) {
        lastBirthday = yr;
        if (yr % 10 === 0) { toast('🎂 Happy ' + yr + 'th birthday, ' + esc(l.first) + '!'); addLog('Turned <b>' + yr + '</b>'); }
        if (yr === 65) addLog('Old age is setting in — health falls faster now');
        dirty = true;
      }
      var nw = netWorth();
      if (nw > l.peak) l.peak = nw;
      if (nw > S.st.bestNW) S.st.bestNW = nw;
      checkLadder(nw);
      if (l.health < 20 && !lowWarned) { lowWarned = true; toast('⚠ Health is low — see a doctor (Life tab)', 2400); sfx('error'); }
      if (l.health > 30) lowWarned = false;
      if (l.health <= 0) { l.health = 0; endLife(false); return; }
      // random life events
      evTimer -= dt;
      if (evTimer <= 0 && !curEvent) { evTimer = rand(38, 70); spawnEvent(); }
      if (curEvent) {
        curEvent.t -= dt;
        if (curEvent.t <= 0) chooseEvent(curEvent.def.opts.length - 1, true);
      }
      pendingFx(dt);
    }
    var lowWarned = false;
    function checkLadder(nw) {
      while (S.ladder < LADDER.length) {
        var g = LADDER[S.ladder];
        var ok = g.biz != null ? L().biz[g.biz] > 0 : nw >= g.nw;
        if (!ok) break;
        S.ladder++;
        S.lp += 1;
        S.lpAll += 1;
        addLog('Goal reached: <b>' + g.name + '</b> (+1 legacy point)');
        toast('🏆 ' + g.name + '! +1 legacy point', 2400);
        sfx('win');
        celebrate(30);
        dirty = true;
      }
    }

    /* ---------------- actions ---------------- */
    var lastHustle = 0;
    function hustle(px, py) {
      if (!S.intro || paused || dead) return;
      var now = performance.now();
      if (now - lastHustle < 80) return;
      lastHustle = now;
      var l = L();
      if (l.energy < HUSTLE_COST) {
        sfx('error');
        addFloat(avX(), groundY - avH() * 1.15, 'Too tired!', '#fda4af', 1);
        return;
      }
      l.energy -= HUSTLE_COST;
      var v = hustleValue();
      earn(v);
      S.st.hustles++;
      jump = 0;
      addFloat(px != null ? px : avX(), (py != null ? py : groundY - avH()) - 10, '+' + money(v), '#86efac', 1.05);
      coinBurst(avX(), groundY - avH() * 0.8, 4);
      sfx('coin');
      bumpMoney();
    }
    function applyJob(i) {
      var l = L(), j = JOBS[i];
      if (i <= l.job || l.edu < j.edu || l.exp < j.exp) { sfx('error'); return; }
      l.job = i;
      addLog('New job: <b>' + j.name + '</b>');
      toast('💼 You’re now a ' + j.name + '!', 1800);
      sfx('levelup');
      celebrate(18);
      afterChange();
    }
    function enroll(i) {
      var l = L();
      if (l.study >= 0 || i !== l.edu || l.cash < EDU[i].cost) { sfx('error'); return; }
      l.cash -= EDU[i].cost;
      l.study = i;
      l.studyT = 0;
      addLog('Enrolled: <b>' + EDU[i].name + '</b>');
      sfx('buy');
      afterChange();
    }
    function buyBiz(i) {
      var n = S.buyN === 'max' ? bizMaxN(i) : S.buyN;
      if (n < 1) n = 1;
      var c = bizCost(i, n);
      if (L().cash < c) { sfx('error'); return; }
      var before = L().biz[i];
      L().cash -= c;
      L().invested += c;
      L().biz[i] += n;
      if (before === 0) { addLog('Opened a <b>' + BIZ[i].name + '</b>'); toast('🏪 ' + BIZ[i].name + ' opened!'); }
      var nm = nextMilestone(before);
      if (nm && L().biz[i] >= nm) { toast(BIZ[i].name + ' Lv ' + nm + ': income ×2!', 1600); sfx('levelup'); }
      else sfx('buy');
      coinBurst(W * 0.75, groundY - P * 10, 6);
      afterChange();
    }
    function buyHome(i) {
      var l = L();
      if (l.homes[i] || i < l.home || l.cash < HOMES[i].price) { sfx('error'); return; }
      l.cash -= HOMES[i].price;
      l.homes[i] = true;
      l.home = i;
      l.happy = Math.min(100, l.happy + 10);
      addLog('Moved into a <b>' + HOMES[i].name + '</b>');
      toast('🏠 Moved into a ' + HOMES[i].name + '!', 1800);
      sfx('win');
      celebrate(24);
      bgKey = '';
      afterChange();
    }
    function buyCar(i) {
      var l = L();
      if (l.cars[i] || l.cash < CARS[i].price) { sfx('error'); return; }
      l.cash -= CARS[i].price;
      l.cars[i] = true;
      l.happy = Math.min(100, l.happy + 6);
      addLog('Bought a <b>' + CARS[i].name + '</b>');
      toast('🚗 ' + CARS[i].name + ' bought!');
      sfx('buy');
      afterChange();
    }
    function buyLux(x) {
      var l = L();
      if (l.lux[x.id] || l.cash < x.price) { sfx('error'); return; }
      l.cash -= x.price;
      l.lux[x.id] = true;
      l.happy = Math.min(100, l.happy + 5);
      addLog('Bought a <b>' + x.name + '</b>');
      sfx('buy');
      avKey = '';
      afterChange();
    }
    function doAction(a) {
      var l = L();
      if (l.cd[a.id] > 0) return;
      var c = actionCost(a.id);
      if (l.cash < c) { sfx('error'); return; }
      l.cash -= c;
      l.cd[a.id] = a.cd;
      if (a.id === 'doctor') { l.health = Math.min(100, l.health + 25); hearts(8, '#f43f5e'); }
      else if (a.id === 'vacation') { l.happy = Math.min(100, l.happy + 30); l.health = Math.min(100, l.health + 8); hearts(12, '#38bdf8'); }
      else if (a.id === 'night') { l.happy = Math.min(100, l.happy + 12); hearts(8, '#a78bfa'); }
      else { l.happy = Math.min(100, l.happy + 6); l.health = Math.min(100, l.health + 2); hearts(6, '#86efac'); }
      sfx('match');
      afterChange();
    }
    function buyGym() {
      var l = L();
      if (l.gym || l.cash < 250) { sfx('error'); return; }
      l.cash -= 250;
      l.gym = true;
      addLog('Joined a <b>gym</b>');
      sfx('buy');
      afterChange();
    }
    function afterChange() { save(); dirty = true; renderPanel(); updateHud(); }

    /* ---------------- life events ---------------- */
    // Each event: title, text(inc), options [label, fn(inc) -> result text]
    var EVENTS = [
      {
        id: 'loan', title: 'A friend needs money', when: function () { return L().cash > 60; },
        text: function (e) { return 'An old friend asks to borrow ' + money(e.amt) + '.'; },
        prep: function (e, inc) { e.amt = Math.min(L().cash * 0.5, Math.max(50, inc * 30)); },
        opts: [
          ['Lend it', function (e) { L().cash -= e.amt; L().happy += 8; if (Math.random() < 0.6) later(25, function () { earn(e.amt * 2); toast('🤝 Your friend paid you back double: +' + money(e.amt * 2)); addLog('A friend repaid a loan twice over'); }); return 'You helped a friend (+8 happiness).'; }],
          ['Say no', function () { L().happy -= 4; return 'Awkward… (−4 happiness)'; }],
        ],
      },
      {
        id: 'lotto', title: 'Lottery stand', when: function () { return true; },
        text: function (e) { return 'A ticket costs ' + money(e.amt) + '. The jackpot is huge… and unlikely.'; },
        prep: function (e, inc) { e.amt = Math.max(5, inc * 2); },
        opts: [
          ['Buy a ticket', function (e, inc) { L().cash -= e.amt; if (Math.random() < 0.05) { var w = Math.max(1000, inc * 600); earn(w); celebrate(40); sfx('win'); addLog('Won the lottery: <b>' + money(w) + '</b>'); return '🎉 JACKPOT! +' + money(w); } return 'No luck this time.'; }],
          ['Walk past', function () { return 'Your money stays in your pocket.'; }],
        ],
      },
      {
        id: 'sick', title: 'Food poisoning!', when: function () { return true; },
        text: function (e) { return 'That street taco was a mistake. A doctor visit costs ' + money(e.amt) + '.'; },
        prep: function (e, inc) { e.amt = Math.max(40, inc * 15); },
        opts: [
          ['See a doctor', function (e) { L().cash -= e.amt; return 'Back on your feet in no time.'; }],
          ['Tough it out', function () { L().health -= 15; return 'Ouch. (−15 health)'; }],
        ],
      },
      {
        id: 'wallet', title: 'Found a wallet', when: function () { return true; },
        text: function (e) { return 'There’s ' + money(e.amt) + ' inside and an ID card.'; },
        prep: function (e, inc) { e.amt = Math.max(30, inc * 8); },
        opts: [
          ['Return it', function (e) { L().happy += 10; if (Math.random() < 0.4) { earn(e.amt * 1.5); return 'The owner rewards you with ' + money(e.amt * 1.5) + '! (+10 happiness)'; } return 'You feel great about it. (+10 happiness)'; }],
          ['Keep the cash', function (e) { earn(e.amt); L().happy -= 8; return '+' + money(e.amt) + ', but it nags at you. (−8 happiness)'; }],
        ],
      },
      {
        id: 'tip', title: 'Hot investment tip', when: function () { return L().cash > 200; },
        text: function (e) { return 'A coworker swears this stock will double. Invest ' + money(e.amt) + ' (20% of your cash)?'; },
        prep: function (e) { e.amt = L().cash * 0.2; },
        opts: [
          ['Invest', function (e) { if (Math.random() < 0.55) { earn(e.amt * 0.6); return '📈 It worked! +' + money(e.amt * 0.6); } L().cash -= e.amt * 0.5; return '📉 It crashed. −' + money(e.amt * 0.5); }],
          ['Pass', function () { return 'Better safe than sorry.'; }],
        ],
      },
      {
        id: 'burnout', title: 'Burnout warning', when: function () { return L().job >= 2; },
        text: function () { return 'You’ve been running on fumes. Take a week off?'; },
        prep: function (e, inc) { e.amt = inc * 20; },
        opts: [
          ['Take time off', function () { L().health += 12; L().happy += 10; return 'Recharged! (+12 health, +10 happiness)'; }],
          ['Push through', function (e) { earn(e.amt); L().health -= 10; L().happy -= 8; return '+' + money(e.amt) + ' (−10 health, −8 happiness)'; }],
        ],
      },
      {
        id: 'puppy', title: 'A stray puppy', when: function () { return L().pets < 3; },
        text: function (e) { return 'A scruffy puppy follows you home. Food and a vet check would cost ' + money(e.amt) + '.'; },
        prep: function (e, inc) { e.amt = Math.max(30, inc * 5); },
        opts: [
          ['Adopt it', function (e) { L().cash -= e.amt; L().pets++; L().happy += 12; hearts(10, '#f472b6'); avKey = ''; return '🐶 New best friend! Happier for life.'; }],
          ['Find it a shelter', function () { L().happy += 2; return 'It found a good home.'; }],
        ],
      },
      {
        id: 'gala', title: 'Charity gala', when: function () { return netWorth() > 20000; },
        text: function (e) { return 'You’re invited to donate ' + money(e.amt) + ' (5% of your cash) to a children’s hospital.'; },
        prep: function (e) { e.amt = L().cash * 0.05; },
        opts: [
          ['Donate', function (e) { L().cash -= e.amt; L().charity += 3; L().happy += 15; return 'Your name is on the donor wall. (+status, +15 happiness)'; }],
          ['Skip it', function () { return 'Maybe next year.'; }],
        ],
      },
      {
        id: 'viral', title: 'You went viral!', when: function () { return L().job >= 1 || bizTotal() > 0; },
        text: function () { return 'A video of you at work is everywhere. Ride the hype?'; },
        prep: function () {},
        opts: [
          ['Ride the hype', function () { L().boostT = 30; sfx('boost'); return '🔥 ×2 income for 30 seconds!'; }],
          ['Stay humble', function () { L().happy += 6; return 'You keep your head down. (+6 happiness)'; }],
        ],
      },
      {
        id: 'startup', title: 'Classmate’s startup', when: function () { return netWorth() > 10000 && L().cash > 1000; },
        text: function (e) { return 'An old classmate pitches a startup and asks for ' + money(e.amt) + ' (10% of your cash).'; },
        prep: function (e) { e.amt = L().cash * 0.1; },
        opts: [
          ['Back them', function (e) { L().cash -= e.amt; if (Math.random() < 0.3) { later(20, function () { earn(e.amt * 5); toast('🚀 The startup was acquired! +' + money(e.amt * 5)); addLog('A startup bet paid off ×5'); celebrate(30); }); return 'Fingers crossed…'; } return 'The startup quietly folded.'; }],
          ['No thanks', function () { return 'You wish them luck.'; }],
        ],
      },
      {
        id: 'rain', title: 'Rainy day', when: function () { return true; },
        text: function () { return 'It’s pouring outside.'; },
        prep: function (e, inc) { e.amt = inc * 10; },
        opts: [
          ['Stay in and read', function () { L().happy += 5; if (L().study >= 0) { L().studyT += 0.25; return 'You studied ahead (+3 months of progress).'; } return 'Cozy. (+5 happiness)'; }],
          ['Work anyway', function (e) { earn(e.amt); return '+' + money(e.amt) + ', and soggy socks.'; }],
        ],
      },
      {
        id: 'family', title: 'Family reunion', when: function () { return true; },
        text: function (e) { return 'Your relatives are getting together. Travel costs ' + money(e.amt) + '.'; },
        prep: function (e, inc) { e.amt = Math.max(20, inc * 5); },
        opts: [
          ['Go', function (e) { L().cash -= e.amt; L().happy += 15; return 'Lots of hugs and too much food. (+15 happiness)'; }],
          ['Send a gift', function (e) { L().cash -= e.amt * 0.4; L().happy += 5; return 'They loved the gift. (+5 happiness)'; }],
        ],
      },
    ];
    var evTimer = 25;
    var curEvent = null;
    var laters = [];
    function later(sec, fn) { laters.push({ t: sec, fn: fn }); }
    function pendingFx(dt) {
      for (var i = laters.length - 1; i >= 0; i--) {
        laters[i].t -= dt;
        if (laters[i].t <= 0) { var f = laters[i].fn; laters.splice(i, 1); f(); dirty = true; }
      }
    }
    var lastEvId = '';
    function spawnEvent() {
      var pool = EVENTS.filter(function (e) { return e.id !== lastEvId && e.when(); });
      if (!pool.length) return;
      var def = pick(pool);
      lastEvId = def.id;
      var e = { def: def, t: 25, max: 25 };
      def.prep(e, income());
      curEvent = e;
      showEvent();
      sfx('pop');
    }
    function showEvent() {
      var e = curEvent;
      evEl.innerHTML = '';
      evEl.style.display = '';
      var h = ui.el('h4', '', ICON.star + '<span>' + esc(e.def.title) + '</span>');
      evEl.appendChild(h);
      evEl.appendChild(ui.el('p', '', e.def.text(e)));
      var row = ui.el('div', 'row', '');
      e.def.opts.forEach(function (o, i) {
        var b = ui.el('button', 'li-btn sm' + (i ? ' sec' : ''), '<span class="li-kbd">' + (i + 1) + '</span> ' + esc(o[0]));
        b.type = 'button';
        b.addEventListener('click', function (ev) { ev.stopPropagation(); chooseEvent(i, false); });
        row.appendChild(b);
      });
      evEl.appendChild(row);
      var tm = ui.el('div', 'tm', '<i></i>');
      evEl.appendChild(tm);
      evTm = tm.firstChild;
    }
    var evTm = null;
    function chooseEvent(i, auto) {
      var e = curEvent;
      if (!e) return;
      curEvent = null;
      evEl.style.display = 'none';
      var res = e.def.opts[i][1](e, income());
      var l = L();
      l.happy = clamp(l.happy, 0, 100);
      l.health = clamp(l.health, 0, 100);
      if (l.cash < 0) l.cash = 0;
      S.st.events++;
      addLog(esc(e.def.title) + ': ' + (auto ? '(no answer) ' : '') + res);
      toast((auto ? '⏱ ' : '') + res, 2200);
      if (!auto) sfx('click');
      dirty = true;
      save();
    }

    /* ---------------- end of life & legacy ---------------- */
    // The summary is stored in the save so a reload can't award legacy points twice.
    function endLife(retired) {
      if (dead) return;
      dead = true;
      var l = L();
      var gain = lpFor(l.peak);
      S.lp += gain;
      S.lpAll += gain;
      S.st.lives++;
      S.st.oldest = Math.max(S.st.oldest, Math.floor(l.age));
      S.history.unshift({ name: l.first + ' ' + S.family, gen: S.gen, age: Math.floor(l.age), peak: l.peak, job: JOBS[l.job].name });
      if (S.history.length > 8) S.history.length = 8;
      S.over = { retired: !!retired, gain: gain };
      if (curEvent) { curEvent = null; evEl.style.display = 'none'; }
      laters.length = 0;
      save();
      sfx(retired ? 'win' : 'lose');
      showSummary();
    }
    function showSummary() {
      var l = L(), o = S.over;
      overlayMsg(o.retired ? esc(l.first) + ' retired' : esc(l.first) + ' ' + esc(S.family) + ' passed away',
        '<p>' + (o.retired ? 'After a full career, ' : '') + esc(l.first) + ' lived to <b>' + Math.floor(l.age) + '</b> as a <b>' + JOBS[l.job].name + '</b>' +
          (l.edu ? ' with a ' + EDU[l.edu - 1].name : '') + '. Peak net worth: <b>' + money(l.peak) + '</b>.</p>' +
          '<p>The family legacy grows: <b>+' + o.gain + ' legacy points</b>. Spend them on perks for generation ' + (S.gen + 1) + ' in the Legacy tab.</p>',
        [{ label: 'Begin generation ' + (S.gen + 1), primary: true, onClick: startNextLife }], true);
    }
    function startNextLife() {
      S.over = null;
      S.gen++;
      S.life = newLife(S);
      dead = false;
      lastBirthday = START_AGE;
      evTimer = 25;
      parts.length = 0;
      floats.length = 0;
      bgKey = '';
      avKey = '';
      addLog('Generation ' + S.gen + ' begins: <b>' + esc(L().first + ' ' + S.family) + '</b>');
      save();
      setTab('legacy');
      sfx('levelup');
      toast('A new life begins: ' + esc(L().first) + ' ' + esc(S.family), 2200);
    }

    /* ---------------- away earnings ---------------- */
    function applyAway(sec, quiet) {
      if (!S.intro || dead) return null;
      var cap = awayCap();
      var capped = sec > cap;
      sec = Math.min(sec, cap);
      var rate = bizTotal() * fortune() * happyMult();
      var gain = rate * sec * awayEff();
      S.st.away += sec;
      if (gain > 0) earn(gain);
      L().energy = Math.min(100, L().energy + energyRegen() * sec);
      dirty = true;
      if (!quiet && sec > 30) {
        overlayMsg('While you were away…',
          '<p>' + IGAME.fmtTime(sec) + ' passed' + (capped ? ' (capped at ' + Math.round(cap / 3600) + 'h)' : '') + '. ' +
            (gain > 0 ? 'Your businesses earned <b>' + money(gain) + '</b> at ' + Math.round(awayEff() * 100) + '% efficiency.' : 'Buy a business (even a Lemonade Stand) to earn while you’re away.') +
            '</p><p>' + esc(L().first) + ' got some rest. Age only advances while you play.</p>',
          [{ label: 'Collect', primary: true, onClick: function () { sfx('coin'); coinBurst(W * 0.5, H * 0.5, 14); bumpMoney(); } }]);
      }
      return gain;
    }

    /* ---------------- DOM ---------------- */
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);
    var app = ui.el('div', 'li-app wide');
    var scene = ui.el('div', 'li-scene');
    var side = ui.el('div', 'li-side');
    var tabsEl = ui.el('div', 'li-tabs');
    var panel = ui.el('div', 'li-panel');
    side.appendChild(tabsEl);
    side.appendChild(panel);
    app.appendChild(scene);
    app.appendChild(side);
    root.appendChild(app);

    var topEl = ui.el('div', 'li-top', '');
    var moneyEl = ui.el('div', 'li-money', '<b>$0</b><span>+$0/s</span>');
    var moneyB = moneyEl.firstChild, rateEl = moneyEl.lastChild;
    topEl.appendChild(moneyEl);
    topEl.appendChild(ui.el('div', 'li-sp', ''));
    var agePill = ui.el('span', 'li-pill', '');
    topEl.appendChild(agePill);
    var pauseBtn = ui.el('button', 'li-pill', ICON.pause);
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    topEl.appendChild(pauseBtn);
    scene.appendChild(topEl);
    var barsEl = ui.el('div', 'li-bars', '');
    var bars = {};
    [['health', ICON.heart, '#f43f5e'], ['energy', ICON.bolt, '#facc15'], ['happy', ICON.smile, '#38bdf8']].forEach(function (b) {
      var e = ui.el('div', 'li-bar', b[1] + '<span class="t"><i style="background:' + b[2] + '"></i></span><span class="n">0</span>');
      e.title = b[0] === 'happy' ? 'Happiness' : b[0] === 'health' ? 'Health' : 'Energy';
      barsEl.appendChild(e);
      bars[b[0]] = { el: e, fill: e.querySelector('i'), n: e.querySelector('.n'), last: -1 };
    });
    scene.appendChild(barsEl);
    var goalEl = ui.el('div', 'li-goal', '<div class="t"><div class="gt"></div><div class="gb"><i></i></div></div>');
    var goalText = goalEl.querySelector('.gt'), goalBar = goalEl.querySelector('.gb'), goalFill = goalEl.querySelector('.gb i');
    var goalBtn = ui.el('button', 'li-btn sm gold', '');
    goalBtn.type = 'button';
    goalEl.appendChild(goalBtn);
    scene.appendChild(goalEl);
    var goalAction = null;
    goalBtn.addEventListener('click', function (e) { e.stopPropagation(); if (goalAction) { sfx('click'); goalAction(); } });
    goalEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    var hustleBtn = ui.el('button', 'li-hustle', '');
    hustleBtn.type = 'button';
    scene.appendChild(hustleBtn);
    hustleBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    hustleBtn.addEventListener('click', function (e) { e.stopPropagation(); hustle(avX(), groundY - avH() * 1.05); });
    var evEl = ui.el('div', 'li-event', '');
    evEl.style.display = 'none';
    evEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    scene.appendChild(evEl);
    pauseBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    pauseBtn.addEventListener('click', function (e) { e.stopPropagation(); sfx('click'); setPaused(true); });

    function setPaused(p) {
      if (!S.intro || dead) return;
      paused = p;
      if (p) {
        save();
        overlayMsg('Paused', '<p>Time is frozen for ' + esc(L().first) + '. Your businesses don’t earn while paused.</p>', [{ label: 'Resume', primary: true, onClick: function () { paused = false; } }], true);
      }
    }

    /* ---- tabs ---- */
    var TABS = [
      { id: 'career', label: 'Career' },
      { id: 'biz', label: 'Business' },
      { id: 'assets', label: 'Assets' },
      { id: 'life', label: 'Life' },
      { id: 'legacy', label: 'Legacy' },
      { id: 'more', label: '⚙ More' },
    ];
    var tab = store.get('tab', 'career');
    if (!TABS.some(function (t) { return t.id === tab; })) tab = 'career';
    var tabBtns = {};
    TABS.forEach(function (t) {
      var b = ui.el('button', 'li-tab', esc(t.label) + '<span class="dot"></span>');
      b.type = 'button';
      b.addEventListener('click', function () { setTab(t.id); sfx('click'); });
      tabBtns[t.id] = b;
      tabsEl.appendChild(b);
    });
    function setTab(id) {
      tab = id;
      store.set('tab', id);
      for (var k in tabBtns) tabBtns[k].classList.toggle('on', k === id);
      panel.scrollTop = 0;
      renderPanel();
    }

    /* ---- panel helpers ---- */
    var updaters = [];
    var dirty = false;
    function renderPanel() {
      var st = panel.scrollTop;
      panel.innerHTML = '';
      updaters = [];
      if (PANELS[tab]) PANELS[tab](panel);
      panel.scrollTop = st;
      updatePanel();
      dirty = false;
    }
    function updatePanel() { for (var i = 0; i < updaters.length; i++) updaters[i](); }
    function el(tag, cls, html, parent) { var n = ui.el(tag, cls, html); if (parent) parent.appendChild(n); return n; }
    function button(label, cls, onClick, parent, enabled) {
      var b = el('button', 'li-btn' + (cls ? ' ' + cls : ''), label, parent);
      b.type = 'button';
      b.addEventListener('click', function (e) { e.stopPropagation(); if (!b.disabled) onClick(); });
      if (enabled) {
        var upd = function () { var en = !!enabled(); if (b.disabled === en) b.disabled = !en; };
        upd();
        updaters.push(upd);
      }
      return b;
    }
    function live(parent, tag, cls, fn) {
      var n = el(tag, cls, '', parent);
      var last = null;
      var upd = function () { var v = fn(); if (v !== last) { last = v; n.innerHTML = v; } };
      upd();
      updaters.push(upd);
      return n;
    }
    function pbar(parent, fn) {
      var b = el('div', 'li-pbar', '<i></i>', parent);
      var i = b.firstChild;
      var upd = function () { i.style.width = clamp(fn() * 100, 0, 100).toFixed(1) + '%'; };
      upd();
      updaters.push(upd);
      return b;
    }
    function priceTag(p) { return '<span class="' + (L().cash >= p ? 'ok' : 'bad') + '">' + money(p) + '</span>'; }

    var PANELS = {
      career: function (p) {
        var l = L();
        var j = JOBS[l.job];
        el('div', 'li-h', '💼 Career <small>' + esc(l.first) + ' · ' + Math.floor(l.exp) + ' years of experience</small>', p);
        var cur = el('div', 'li-card cur', '', p);
        live(cur, 'div', '', function () {
          return '<div class="li-name">' + esc(j.name) + '</div><div class="li-desc">Salary <b>' + money(salary() * globalMult()) + '/s</b>' +
            (l.study >= 0 ? ' · <span class="bad">part-time while studying (60%)</span>' : '') + (carMult() > 1 ? ' · commute bonus ×' + carMult().toFixed(2) : '') + '</div>';
        });
        // job ladder
        el('div', 'li-h', 'Job ladder', p).style.marginTop = '.5em';
        JOBS.forEach(function (jb, i) {
          if (i <= l.job - 2) return; // keep the list short: recent + upcoming
          var card = el('div', 'li-card' + (i === l.job ? ' cur' : i > l.job + 3 ? ' dim' : ''), '', p);
          var row = el('div', 'li-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'li-name', esc(jb.name) + ' <span class="li-lvl">' + money(jb.pay) + '/s</span>', info);
          if (i > l.job) {
            live(info, 'div', 'li-desc', function () {
              var e1 = l.edu >= jb.edu, e2 = l.exp >= jb.exp;
              return 'Needs ' + (jb.edu ? '<span class="' + (e1 ? 'ok' : 'bad') + '">' + EDU[jb.edu - 1].short + '</span> · ' : '') +
                '<span class="' + (e2 ? 'ok' : 'bad') + '">' + jb.exp + (jb.exp === 1 ? ' yr' : ' yrs') + ' experience</span>';
            });
            if (i === l.job + 1) button('Apply', 'gold sm', function () { applyJob(i); }, row, function () { return l.edu >= jb.edu && l.exp >= jb.exp; });
          } else if (i === l.job) el('span', 'li-badge', 'Current', row);
          else el('span', 'li-desc', 'Past job', row);
        });
        // education
        el('div', 'li-h', '🎓 Education <small>Unlocks better jobs</small>', p).style.marginTop = '.5em';
        if (l.study >= 0) {
          var sc = el('div', 'li-card cur', '', p);
          live(sc, 'div', '', function () {
            return '<div class="li-name">Studying: ' + EDU[l.study].name + '</div><div class="li-desc">' +
              Math.max(0, studyYears(l.study) - l.studyT).toFixed(1) + ' years left · salary at 60% meanwhile</div>';
          });
          pbar(sc, function () { return l.studyT / studyYears(l.study); });
        }
        EDU.forEach(function (ed, i) {
          var done = l.edu > i;
          var card = el('div', 'li-card' + (done ? '' : i > l.edu ? ' dim' : ''), '', p);
          var row = el('div', 'li-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'li-name', (done ? ICON.check + ' ' : '') + esc(ed.name), info);
          if (!done) {
            live(info, 'div', 'li-desc', function () { return priceTag(ed.cost) + ' · ' + studyYears(i).toFixed(1) + ' years'; });
            if (i === l.edu && l.study < 0) button('Enroll', 'sm', function () { enroll(i); }, row, function () { return L().cash >= ed.cost; });
            else if (l.study === i) el('span', 'li-badge', 'Studying', row);
          } else el('div', 'li-desc', 'Completed', info);
        });
      },

      biz: function (p) {
        var hd = el('div', 'li-h', '🏪 Businesses ', p);
        var seg = el('span', 'li-seg', '', hd);
        seg.style.marginLeft = 'auto';
        [[1, '×1'], [10, '×10'], ['max', 'Max']].forEach(function (o) {
          var b = el('button', S.buyN === o[0] ? 'on' : '', o[1], seg);
          b.type = 'button';
          b.addEventListener('click', function () { S.buyN = o[0]; sfx('click'); renderPanel(); });
        });
        live(p, 'div', 'li-sub', function () { return 'Passive income <b style="color:#86efac">' + money(bizTotal() * globalMult()) + '/s</b> — keeps earning while you’re away. Every business doubles its income at Lv 10, 25, 50, 100…'; });
        var shown = 0;
        BIZ.forEach(function (b, i) {
          var l = L();
          var unlocked = i === 0 || l.biz[i - 1] > 0;
          if (!unlocked) { if (shown++ > 0) return; }
          var card = el('div', 'li-card' + (unlocked ? '' : ' dim'), '', p);
          var row = el('div', 'li-row', '', card);
          var sw = el('span', '', '', row);
          sw.style.cssText = 'width:1.6em;height:1.6em;border-radius:.4em;flex:none;background:' + b.color;
          var info = el('div', 'grow', '', row);
          if (!unlocked) {
            el('div', 'li-name', esc(b.name), info);
            el('div', 'li-desc', ICON.lock + ' Open a ' + esc(BIZ[i - 1].name) + ' first', info);
            return;
          }
          live(info, 'div', 'li-name', function () { return esc(b.name) + ' <span class="li-lvl">Lv ' + L().biz[i] + '</span>'; });
          live(info, 'div', 'li-desc', function () {
            var lv = L().biz[i], nm = nextMilestone(lv);
            return (lv ? money(bizIncome(i) * globalMult()) + '/s' : 'Earns ' + money(b.inc * globalMult()) + '/s per level') + (nm ? ' · ×2 at Lv ' + nm : '');
          });
          live(info, 'div', 'li-desc', function () {
            var n = S.buyN === 'max' ? Math.max(1, bizMaxN(i)) : S.buyN;
            return 'Buy ' + n + ': ' + priceTag(bizCost(i, n));
          });
          button('Buy', 'sm', function () { buyBiz(i); }, row, function () {
            var n = S.buyN === 'max' ? Math.max(1, bizMaxN(i)) : S.buyN;
            return L().cash >= bizCost(i, n);
          });
        });
      },

      assets: function (p) {
        var l = L();
        live(p, 'div', 'li-h', function () { return '🏠 Assets <small>Status ' + status() + ' · raises happiness</small>'; });
        el('div', 'li-desc', 'Homes (better rest → faster energy)', p).style.margin = '.2em 0 .35em';
        HOMES.forEach(function (h, i) {
          if (i === 0) return;
          var owned = l.homes[i];
          var card = el('div', 'li-card' + (l.home === i ? ' cur' : i > l.home + 2 ? ' dim' : ''), '', p);
          var row = el('div', 'li-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'li-name', esc(h.name) + ' <span class="li-lvl">+' + h.status + ' status</span>', info);
          live(info, 'div', 'li-desc', function () { return (owned ? 'Owned' : priceTag(h.price)) + ' · energy regen ×' + h.energy; });
          if (l.home === i) el('span', 'li-badge', 'Home', row);
          else if (!owned && i > l.home) button('Buy', 'sm', function () { buyHome(i); }, row, function () { return L().cash >= h.price; });
          else el('span', 'li-desc', owned ? 'Owned' : 'Outgrown', row);
        });
        el('div', 'li-desc', 'Vehicles (faster commute → salary and Hustle bonus)', p).style.margin = '.6em 0 .35em';
        CARS.forEach(function (c, i) {
          var owned = l.cars[i];
          var card = el('div', 'li-card' + (owned ? ' cur' : ''), '', p);
          var row = el('div', 'li-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'li-name', esc(c.name) + ' <span class="li-lvl">+' + c.status + ' status</span>', info);
          live(info, 'div', 'li-desc', function () { return (owned ? 'Owned' : priceTag(c.price)) + ' · pay ×' + c.mult; });
          if (owned) el('span', 'li-badge', 'Owned', row);
          else button('Buy', 'sm', function () { buyCar(i); }, row, function () { return L().cash >= c.price; });
        });
        el('div', 'li-desc', 'Luxuries (pure status)', p).style.margin = '.6em 0 .35em';
        LUX.forEach(function (x) {
          var owned = !!l.lux[x.id];
          var card = el('div', 'li-card' + (owned ? ' cur' : ''), '', p);
          var row = el('div', 'li-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'li-name', esc(x.name) + ' <span class="li-lvl">+' + x.status + ' status</span>', info);
          live(info, 'div', 'li-desc', function () { return owned ? 'Owned' : priceTag(x.price); });
          if (owned) el('span', 'li-badge', 'Owned', row);
          else button('Buy', 'sm', function () { buyLux(x); }, row, function () { return L().cash >= x.price; });
        });
      },

      life: function (p) {
        var l = L();
        el('div', 'li-h', '❤ Life <small>' + esc(l.first + ' ' + S.family) + ' · generation ' + S.gen + '</small>', p);
        var st = el('div', 'li-stats', '', p);
        live(st, 'div', 'li-stat', function () { return 'Age<b>' + Math.floor(l.age) + '</b>'; });
        live(st, 'div', 'li-stat', function () { return 'Health<b>' + Math.round(l.health) + ' <small style="font-size:.7em;color:#fb7185">−' + healthLossPerYear().toFixed(1) + '/yr</small></b>'; });
        live(st, 'div', 'li-stat', function () { return 'Happiness<b>' + Math.round(l.happy) + ' <small style="font-size:.7em;color:#a5abd6">→' + Math.round(happyTarget()) + '</small></b>'; });
        live(st, 'div', 'li-stat', function () { return 'Income bonus<b>×' + happyMult().toFixed(2) + '</b>'; });
        live(st, 'div', 'li-stat', function () { return 'Net worth<b>' + money(netWorth()) + '</b>'; });
        live(st, 'div', 'li-stat', function () { return 'Status<b>' + status() + '</b>'; });
        el('div', 'li-sub', 'Health drops faster with age (and when you’re unhappy). Happiness drifts toward a target set by your status, health and pets, and multiplies all income.', p);
        ACTIONS.forEach(function (a) {
          var card = el('div', 'li-card', '', p);
          var row = el('div', 'li-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'li-name', esc(a.name), info);
          live(info, 'div', 'li-desc', function () {
            var c = actionCost(a.id);
            return esc(a.text) + ' · ' + (c ? priceTag(c) + ' · ' : '') + (L().cd[a.id] > 0 ? '<span class="bad">again in ' + L().cd[a.id].toFixed(1) + ' yrs</span>' : 'every ' + a.cd + ' yr' + (a.cd > 1 ? 's' : ''));
          });
          button('Go', 'sm', function () { doAction(a); }, row, function () { return L().cd[a.id] <= 0 && L().cash >= actionCost(a.id); });
        });
        var gc = el('div', 'li-card' + (l.gym ? ' cur' : ''), '', p);
        var gr = el('div', 'li-row', '', gc);
        var gi = el('div', 'grow', '', gr);
        el('div', 'li-name', 'Gym membership', gi);
        live(gi, 'div', 'li-desc', function () { return '−35% health loss for the rest of this life · ' + (L().gym ? 'Member' : priceTag(250)); });
        if (!l.gym) button('Join', 'sm', buyGym, gr, function () { return L().cash >= 250; });
        else el('span', 'li-badge', 'Member', gr);
        if (l.pets) el('div', 'li-sub', '🐶 Pets: ' + l.pets + ' (+' + l.pets * 4 + ' happiness target)', p).style.marginTop = '.4em';
        el('div', 'li-h', 'Life story', p).style.marginTop = '.5em';
        live(p, 'div', 'li-log', function () { return L().log.map(function (x) { return '<div>' + x + '</div>'; }).join('') || '<div>Your story is just beginning.</div>'; });
      },

      legacy: function (p) {
        var l = L();
        el('div', 'li-h', ICON.legacy + ' Family legacy <small>The ' + esc(S.family) + ' family · generation ' + S.gen + '</small>', p);
        var st = el('div', 'li-stats', '', p);
        live(st, 'div', 'li-stat', function () { return 'Legacy points<b>' + S.lp + '</b>'; });
        live(st, 'div', 'li-stat', function () { return 'At life’s end<b>+' + lpFor(L().peak) + '</b>'; });
        live(st, 'div', 'li-stat', function () { return 'Peak this life<b>' + money(L().peak) + '</b>'; });
        el('div', 'li-sub', 'When this life ends, legacy points are earned from its peak net worth (every ×10 is worth more), plus 1 for each family goal reached for the first time.', p);
        var rc = el('div', 'li-card', '', p);
        var rr = el('div', 'li-row', '', rc);
        var ri = el('div', 'grow', '', rr);
        el('div', 'li-name', 'Retire early', ri);
        live(ri, 'div', 'li-desc', function () { return L().age >= 55 ? 'End this life now and pass the legacy on.' : 'Available from age 55 (now ' + Math.floor(L().age) + ').'; });
        button('Retire', 'sec sm', function () {
          overlayMsg('Retire and pass the torch?', '<p>' + esc(l.first) + '’s life ends now for <b>+' + lpFor(L().peak) + ' legacy points</b>. Generation ' + (S.gen + 1) + ' starts from scratch with your perks.</p>',
            [{ label: 'Retire', primary: true, onClick: function () { endLife(true); } }, { label: 'Keep living', primary: false }]);
        }, rr, function () { return L().age >= 55; });
        el('div', 'li-h', 'Perks for every generation', p).style.marginTop = '.5em';
        PERKS.forEach(function (pk) {
          var lv = S.perks[pk.id];
          var maxed = pk.max && lv >= pk.max;
          var card = el('div', 'li-card', '', p);
          var row = el('div', 'li-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'li-name', esc(pk.name) + ' <span class="li-lvl">Lv ' + lv + (pk.max ? ' / ' + pk.max : '') + '</span>', info);
          el('div', 'li-desc', esc(pk.text) + ' per level' + (maxed ? '' : ' · cost <b>' + pk.cost(lv) + ' LP</b>'), info);
          button(maxed ? 'Max' : 'Buy', 'sm', function () {
            var c = pk.cost(S.perks[pk.id]);
            if (S.lp < c || (pk.max && S.perks[pk.id] >= pk.max)) return;
            S.lp -= c;
            S.perks[pk.id]++;
            sfx('buy');
            afterChange();
          }, row, function () { return !maxed && S.lp >= pk.cost(S.perks[pk.id]); });
        });
        el('div', 'li-h', 'Family goals', p).style.marginTop = '.5em';
        var lad = el('div', 'li-ladder', '', p);
        LADDER.forEach(function (g, i) {
          el('div', i < S.ladder ? 'done' : i === S.ladder ? 'next' : '', (i < S.ladder ? ICON.check : i === S.ladder ? ICON.star : ICON.lock) + '<span>' + esc(g.name) +
            ' — ' + (g.biz != null ? 'open an ' + esc(BIZ[g.biz].name) : 'net worth ' + money(g.nw)) + '</span>', lad);
        });
        if (S.history.length) {
          el('div', 'li-h', 'Family tree', p).style.marginTop = '.5em';
          var lg = el('div', 'li-log', '', p);
          S.history.forEach(function (h) { el('div', '', '<b>Gen ' + h.gen + ' · ' + esc(h.name) + '</b> — ' + esc(h.job) + ', lived to ' + h.age + ', peak ' + money(h.peak), lg); });
        }
      },

      more: function (p) {
        el('div', 'li-h', 'Stats', p);
        var st = el('div', 'li-stats', '', p);
        [
          ['Play time', function () { return IGAME.fmtTime(S.st.play); }],
          ['Away time', function () { return IGAME.fmtTime(S.st.away); }],
          ['Total earned', function () { return money(S.st.earned); }],
          ['Best net worth', function () { return money(S.st.bestNW); }],
          ['Lives lived', function () { return String(S.st.lives); }],
          ['Oldest age', function () { return String(S.st.oldest || Math.floor(L().age)); }],
          ['Hustles', function () { return fmt(S.st.hustles); }],
          ['Life events', function () { return fmt(S.st.events); }],
          ['Away earnings', function () { return Math.round(awayEff() * 100) + '% · ' + Math.round(awayCap() / 3600) + 'h'; }],
        ].forEach(function (s) { live(st, 'div', 'li-stat', function () { return s[0] + '<b>' + s[1]() + '</b>'; }); });
        el('div', 'li-h', 'Settings', p).style.marginTop = '.5em';
        var r1 = el('div', 'li-toggle', '<span>Particles & effects</span>', p);
        button(S.opt.fx ? 'On' : 'Off', 'sm' + (S.opt.fx ? '' : ' sec'), function () { S.opt.fx = !S.opt.fx; sfx('click'); save(); renderPanel(); }, r1);
        var r2 = el('div', 'li-toggle', '<span>How to play</span>', p);
        button('Show', 'sm sec', showHelp, r2);
        var r3 = el('div', 'li-toggle', '<span>Reset all progress</span>', p);
        button('Reset…', 'sm sec', confirmReset, r3).style.color = '#fb7185';
        el('div', 'li-sub', 'Keys: <span class="li-kbd">Space</span> hustle · <span class="li-kbd">1</span> <span class="li-kbd">2</span> answer a life event · <span class="li-kbd">↑</span><span class="li-kbd">↓</span> switch tab · <span class="li-kbd">P</span> pause. Progress autosaves in this browser.', p).style.marginTop = '.6em';
      },
    };

    /* ---- overlays ---- */
    var modal = null;
    function closeModal() { if (modal) { modal.close(); modal = null; } }
    function overlayMsg(title, html, buttons, sticky) {
      closeModal();
      var m = ui.overlay(root, {
        title: title,
        html: html,
        buttons: (buttons || []).map(function (b) {
          return { label: b.label, primary: b.primary, onClick: function () { closeModal(); if (b.onClick) b.onClick(); } };
        }),
      });
      m.el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      m.el.classList.add('li-ov');
      m.el.style.setProperty('--lifs', app.style.getPropertyValue('--lifs'));
      m.sticky = !!sticky;
      modal = m;
      return m;
    }
    function showIntro() {
      overlayMsg('Life Ladder',
        '<p>You’re 18, broke, and sleeping in a cardboard box. Work odd jobs, study for promotions, open businesses and climb from rags to riches — before old age catches up with you.</p>' +
          '<p style="font-size:.9em">' + (ctx.isTouch ? 'Tap' : 'Click') + ' the scene or <b>Hustle</b> for quick cash. One year passes every 15 seconds.</p>',
        [{ label: 'Start my life', primary: true, onClick: function () {
          S.intro = true;
          S.last = Date.now();
          addLog('Generation 1 begins: <b>' + esc(L().first + ' ' + S.family) + '</b>, age 18, no money');
          save();
          renderPanel();
          sfx('win');
          toast((ctx.isTouch ? 'Tap' : 'Click') + ' anywhere in the scene to hustle!', 2200);
        } }], true);
    }
    function showHelp() {
      overlayMsg('How to play',
        '<div style="text-align:left;display:grid;gap:.45em">' +
          '<div>💵 Your job pays every second. <b>Hustle</b> (' + (ctx.isTouch ? 'tap' : 'click') + ' the scene or press Space) for instant cash — it costs energy, which refills over time (faster in a better home).</div>' +
          '<div>🎓 Study in the Career tab to qualify for better jobs. Experience comes with age; promotions need both.</div>' +
          '<div>🏪 Businesses earn passive income, even while you’re away. Each one doubles at Lv 10, 25, 50, 100…</div>' +
          '<div>🏠 Homes, vehicles and luxuries raise your status → happiness → all income.</div>' +
          '<div>❤ Health falls with age. See a doctor, join a gym and stay happy to live longer.</div>' +
          '<div>⭐ When life ends (or you retire after 55), legacy points buy perks for the next generation.</div></div>',
        [{ label: 'Got it', primary: true }]);
    }
    function confirmReset() {
      overlayMsg('Reset all progress?', '<p>This deletes your family, legacy points, perks and stats. It cannot be undone.</p>', [
        { label: 'Cancel', primary: true },
        { label: 'Delete everything', primary: false, onClick: function () {
          store.remove('save');
          S = freshState();
          dead = false;
          paused = false;
          curEvent = null;
          evEl.style.display = 'none';
          laters.length = 0;
          parts.length = 0;
          floats.length = 0;
          bgKey = '';
          avKey = '';
          lastBirthday = START_AGE;
          setTab('career');
          showIntro();
        } },
      ]);
    }
    // Toasts are queued so they never stack on top of each other.
    var toastQ = [], toastBusy = 0;
    function toast(text, ms) {
      if (toastQ.length > 3) toastQ.shift();
      if (toastQ.length && toastQ[toastQ.length - 1][0] === text) return;
      toastQ.push([text, ms || 1600]);
      pumpToast();
    }
    function pumpToast() {
      var now = performance.now();
      if (!toastQ.length || now < toastBusy) return;
      var t = toastQ.shift();
      toastBusy = now + t[1] + 250;
      ui.toast(root, t[0], t[1]);
    }

    /* ---- goal bar ---- */
    function computeGoal() {
      var l = L();
      if (dead) return { text: 'Life over — start the next generation', prog: null };
      var nj = l.job + 1 < JOBS.length ? JOBS[l.job + 1] : null;
      if (nj && l.edu >= nj.edu && l.exp >= nj.exp) return { text: 'Promotion available: <b>' + nj.name + '</b> (' + money(nj.pay) + '/s)', prog: 1, btn: 'Apply', act: function () { applyJob(l.job + 1); } };
      if (l.health < 30) return { text: '<b>Health is low</b> — see a doctor', prog: l.health / 100, btn: 'Life', act: function () { setTab('life'); } };
      if (nj && l.study < 0 && l.edu < nj.edu && l.edu < EDU.length) {
        var ed = EDU[l.edu];
        if (l.cash >= ed.cost) return { text: 'Enroll in <b>' + ed.name + '</b> to become a ' + nj.name, prog: 1, btn: 'Enroll', act: function () { enroll(l.edu); } };
        if (l.cash >= ed.cost * 0.4) return { text: 'Save <b>' + money(ed.cost) + '</b> for ' + ed.short + ' (needed for ' + nj.name + ')', prog: l.cash / ed.cost };
      }
      if (l.biz[0] === 0) {
        if (l.cash >= BIZ[0].cost) return { text: 'Open your first <b>Lemonade Stand</b> — it earns even while you’re away', prog: 1, btn: 'Buy', act: function () { buyBiz(0); } };
        return { text: 'Save <b>' + money(BIZ[0].cost) + '</b> for a Lemonade Stand', prog: l.cash / BIZ[0].cost };
      }
      if (l.home === 0 && l.cash >= HOMES[1].price) return { text: 'Get off the street: rent a <b>Shared Room</b>', prog: 1, btn: 'Buy', act: function () { buyHome(1); } };
      if (S.ladder < LADDER.length) {
        var g = LADDER[S.ladder];
        if (g.biz != null) return { text: 'Family goal: <b>' + g.name + '</b>', prog: l.cash / BIZ[g.biz].cost };
        return { text: 'Family goal: <b>' + g.name + '</b> — net worth ' + money(g.nw), prog: netWorth() / g.nw };
      }
      return { text: 'Every family goal complete — keep the dynasty growing!', prog: 1 };
    }
    var goalKey = '';
    function updateGoal() {
      var g = computeGoal();
      goalAction = g.act || null;
      var key = g.text + '|' + (g.btn || '');
      if (key !== goalKey) {
        goalKey = key;
        goalText.innerHTML = g.text;
        goalBtn.style.display = g.btn ? '' : 'none';
        goalBtn.textContent = g.btn || '';
      }
      goalBar.style.display = g.prog == null ? 'none' : '';
      if (g.prog != null) goalFill.style.width = clamp(g.prog * 100, 0, 100).toFixed(1) + '%';
    }
    function bumpMoney() {
      if (!S.opt.fx) return;
      moneyEl.classList.remove('bump');
      void moneyEl.offsetWidth;
      moneyEl.classList.add('bump');
    }
    var lastMoney = '';
    function updateHud() {
      var l = L();
      var m = money(l.cash);
      if (m !== lastMoney) { lastMoney = m; moneyB.textContent = m; }
      rateEl.textContent = '+' + money(income()) + '/s' + (l.boostT > 0 ? ' 🔥×2' : '');
      agePill.innerHTML = ICON.cake + ' Age ' + Math.floor(l.age) + (S.gen > 1 ? ' · Gen ' + S.gen : '');
      [['health', l.health], ['energy', l.energy], ['happy', l.happy]].forEach(function (b) {
        var o = bars[b[0]], v = Math.round(b[1]);
        if (v !== o.last) { o.last = v; o.fill.style.width = clamp(v, 0, 100) + '%'; o.n.textContent = v; }
        o.el.classList.toggle('low', b[0] !== 'energy' && v < 25);
      });
      var hv = hustleValue();
      var htxt = 'HUSTLE<small>+' + money(hv) + ' · ' + ICON.boltDark + HUSTLE_COST + '</small>';
      if (hustleBtn._t !== htxt) { hustleBtn._t = htxt; hustleBtn.innerHTML = htxt; }
      hustleBtn.classList.toggle('tired', l.energy < HUSTLE_COST);
      hustleBtn.style.display = curEvent ? 'none' : '';
      if (curEvent && evTm) evTm.style.width = (curEvent.t / curEvent.max * 100).toFixed(1) + '%';
      updateGoal();
      var nj = l.job + 1 < JOBS.length ? JOBS[l.job + 1] : null;
      tabBtns.career.classList.toggle('has-dot', !!(nj && l.edu >= nj.edu && l.exp >= nj.exp) || (l.study < 0 && l.edu < EDU.length && l.cash >= EDU[l.edu].cost && !!nj && nj.edu > l.edu));
      tabBtns.biz.classList.toggle('has-dot', BIZ.some(function (b, i) { return (i === 0 || l.biz[i - 1] > 0) && l.biz[i] === 0 && l.cash >= b.cost; }));
      tabBtns.life.classList.toggle('has-dot', l.health < 35 && l.cd.doctor <= 0);
      tabBtns.legacy.classList.toggle('has-dot', PERKS.some(function (pk) { return !(pk.max && S.perks[pk.id] >= pk.max) && S.lp >= pk.cost(S.perks[pk.id]); }));
      tabBtns.assets.classList.toggle('has-dot', l.home + 1 < HOMES.length && l.cash >= HOMES[l.home + 1].price);
    }

    /* ---------------- layout ---------------- */
    var W = 0, H = 0, P = 4, groundY = 0, narrow = false;
    function layout() {
      var r = root.getBoundingClientRect();
      var w = r.width, h = r.height;
      if (!w || !h) return;
      narrow = w / h < 1.1 || w < 560;
      app.className = 'li-app ' + (narrow ? 'narrow' : 'wide');
      var fs = narrow ? clamp(w / 360 * 12.5, 12, 17) : clamp(Math.min(w / 1140, h / 640) * 14, 12, 19);
      app.style.setProperty('--lifs', fs.toFixed(1) + 'px');
      app.style.setProperty('--liside', w > 900 ? '40%' : '44%');
      app.style.setProperty('--liscene', h < 520 ? '47%' : '48%');
      placeOverlays();
    }
    function placeOverlays() {
      var topH = topEl.offsetHeight || 40;
      barsEl.style.top = 'calc(' + topH + 'px + .85em)';
      goalEl.style.top = 'calc(' + (topH + (barsEl.offsetHeight || 20)) + 'px + 1.2em)';
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { layout(); if (view) recalcGeom(); }) : null;
    if (ro) ro.observe(root);
    else window.addEventListener('resize', layout);
    layout();

    var view = IGAME.createCanvas(scene, { onResize: function (w, h) { W = w; H = h; recalcGeom(); } });
    var g = view.ctx;
    scene.insertBefore(view.canvas, scene.firstChild);
    function recalcGeom() {
      if (!W || !H) return;
      P = narrow ? Math.round(Math.min(H * 0.36 / 26, W * 0.11 / 14)) : Math.floor(Math.min(H * 0.34 / 26, W * 0.13 / 14));
      P = Math.max(2, P);
      groundY = Math.round(H - Math.max(P * 3, H * 0.06));
      bgKey = '';
      placeOverlays();
    }

    /* ---------------- particles ---------------- */
    var parts = [], floats = [];
    function addPart(x, y, vx, vy, life, c, s, gr, k) {
      if (!S.opt.fx && k !== 'coin') return;
      if (parts.length > 140) parts.shift();
      parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, c: c, s: s, gr: gr, k: k || 0 });
    }
    function coinBurst(x, y, n) { for (var i = 0; i < n; i++) addPart(x, y, rand(-110, 110), rand(-300, -170), rand(0.7, 1.1), '#facc15', P * 1.3, 620, 'coin'); }
    function hearts(n, c) { for (var i = 0; i < n; i++) addPart(avX() + rand(-P * 6, P * 6), groundY - avH() * rand(0.4, 1), rand(-30, 30), rand(-90, -40), rand(0.9, 1.5), c, P * 1.2, -20, 'heart'); }
    function celebrate(n) {
      var cols = ['#facc15', '#4ade80', '#38bdf8', '#f472b6', '#ffffff'];
      for (var i = 0; i < n; i++) addPart(rand(0, W), -10, rand(-60, 60), rand(80, 260), rand(1.2, 2), cols[i % cols.length], P * rand(0.8, 1.3), 120, 'conf');
    }
    function addFloat(x, y, text, color, scale) {
      if (floats.length > 22) floats.shift();
      floats.push({ x: x, y: y, t: 0, text: text, c: color, s: scale || 1 });
    }

    /* ---------------- avatar ---------------- */
    function avX() { return Math.round(W * (narrow ? 0.34 : 0.36)); }
    function avH() { return 26 * P; }
    var avCanvas = document.createElement('canvas');
    avCanvas.width = 20;
    avCanvas.height = 30;
    var avKey = '';
    var CLOTHES = [
      { shirt: '#8b7d6b', shirt2: '#6b5d4b', pants: '#5a5048', shoes: '#3a3028' },
      { shirt: null, shirt2: '#1f2937', pants: '#3b5b8a', shoes: '#f3f4f6' },
      { shirt: '#10b981', shirt2: '#047857', pants: '#c2a878', shoes: '#6b4630' },
      { shirt: '#334155', shirt2: '#e2e8f0', pants: '#334155', shoes: '#1f2937' },
      { shirt: '#1e293b', shirt2: '#f8fafc', pants: '#1e293b', shoes: '#0f172a', tie: '#dc2626' },
      { shirt: '#0b0b12', shirt2: '#ffffff', pants: '#0b0b12', shoes: '#000000', tie: '#fbbf24', gold: true },
    ];
    // Draw the avatar at 1 art-pixel = 1 canvas pixel (20×30), feet at y=29, centre x=10.
    function buildAvatar() {
      var l = L();
      var lk = look();
      var age = l.age;
      var hair = age >= 72 ? '#e8e8e8' : age >= 55 ? '#9ca3af' : HAIR[l.hair];
      var mood = l.happy > 60 ? 2 : l.happy < 30 ? 0 : 1;
      var key = [lk, hair, l.style, l.skin, l.hoodie, mood, !!l.lux.phone, !!l.lux.watch, age >= 60 ? 1 : 0].join('|');
      if (key === avKey) return;
      avKey = key;
      var a = avCanvas.getContext('2d');
      a.clearRect(0, 0, 20, 30);
      var C = CLOTHES[lk];
      var shirt = C.shirt || HOODIE[l.hoodie];
      var skin = SKIN[l.skin];
      var o = '#1b1530';
      function r(x, y, w, h, c) { a.fillStyle = c; a.fillRect(x, y, w, h); }
      // outline silhouette
      r(5, 3, 10, 11, o); r(4, 13, 12, 10, o); r(5, 22, 4, 8, o); r(11, 22, 4, 8, o); r(3, 14, 3, 9, o); r(14, 14, 3, 9, o);
      // legs + shoes
      r(6, 22, 3, 6, C.pants); r(11, 22, 3, 6, C.pants);
      if (lk === 0) { r(6, 26, 3, 1, '#4a4038'); r(12, 25, 2, 1, '#4a4038'); }
      r(5, 28, 4, 1, C.shoes); r(11, 28, 4, 1, C.shoes);
      // torso
      r(5, 14, 10, 9, shirt);
      if (lk === 0) { r(7, 17, 2, 2, C.shirt2); r(12, 20, 2, 1, C.shirt2); }
      if (lk === 1) { r(9, 14, 2, 4, '#e5e7eb'); r(6, 19, 8, 2, C.shirt2); } // hoodie strings + pocket
      if (lk === 2) { r(8, 14, 4, 2, C.shirt2); }
      if (lk >= 3) { r(8, 14, 4, 6, C.shirt2); r(7, 14, 1, 5, shirt); r(12, 14, 1, 5, shirt); }
      if (C.tie) { r(9, 15, 2, 1, C.tie); if (lk === 4) r(9, 16, 2, 4, C.tie); }
      if (C.gold) { r(7, 20, 6, 1, '#fbbf24'); }
      // arms + hands
      r(4, 15, 2, 6, shirt); r(14, 15, 2, 6, shirt);
      r(4, 21, 2, 2, skin); r(14, 21, 2, 2, skin);
      if (l.lux.watch) r(14, 20, 2, 1, '#fbbf24');
      if (l.lux.phone) { r(15, 19, 2, 3, '#111827'); r(15, 19, 1, 1, '#60a5fa'); }
      // neck + head
      r(8, 12, 4, 2, skin);
      r(6, 4, 8, 9, skin);
      r(5, 7, 1, 3, skin); r(14, 7, 1, 3, skin); // ears
      // hair styles
      var st = l.style;
      if (st === 0) { r(6, 3, 8, 2, hair); r(6, 5, 1, 2, hair); r(13, 5, 1, 1, hair); }
      else if (st === 1) { r(5, 3, 10, 3, hair); r(5, 6, 2, 7, hair); r(13, 6, 2, 7, hair); }
      else if (st === 2) { r(6, 3, 8, 2, hair); r(8, 1, 4, 2, hair); r(6, 5, 1, 2, hair); r(13, 5, 1, 2, hair); }
      else if (st === 3) { r(6, 3, 8, 2, hair); r(6, 2, 1, 1, hair); r(9, 1, 1, 2, hair); r(12, 2, 1, 1, hair); r(13, 5, 1, 1, hair); }
      else { r(5, 2, 10, 4, hair); r(5, 6, 1, 3, hair); r(14, 6, 1, 3, hair); r(7, 1, 2, 1, hair); r(11, 1, 2, 1, hair); }
      // cheeks + mouth (eyes are drawn live so they can blink)
      r(6, 10, 1, 1, '#f9a8a8'); r(13, 10, 1, 1, '#f9a8a8');
      if (mood === 2) { r(8, 10, 4, 1, o); r(7, 9, 1, 1, o); r(12, 9, 1, 1, o); }
      else if (mood === 1) r(8, 10, 4, 1, o);
      else { r(8, 10, 4, 1, o); r(7, 11, 1, 1, o); r(12, 11, 1, 1, o); }
      if (age >= 60) { r(7, 6, 2, 1, '#00000022'); }
      if (lk === 5) { r(6, 7, 3, 2, '#111'); r(11, 7, 3, 2, '#111'); r(9, 7, 2, 1, '#111'); } // shades
    }

    /* ---------------- scene backgrounds ---------------- */
    var bgCanvas = document.createElement('canvas');
    var bgKey = '';
    function grad(b, y0, y1, c0, c1) { var gr = b.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
    function drawBg() {
      var tier = L().home;
      var key = tier + '|' + W + 'x' + H + '|' + view.dpr + '|' + P;
      if (key === bgKey) return;
      bgKey = key;
      bgCanvas.width = Math.round(W * view.dpr);
      bgCanvas.height = Math.round(H * view.dpr);
      var b = bgCanvas.getContext('2d');
      b.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      [paintStreet, paintRoom, paintStudio, paintHouse, paintPenthouse, paintVilla][tier](b);
    }
    function q(v) { return Math.round(v / P) * P; }
    function rect(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(q(x), q(y), Math.max(P, q(w)), Math.max(P, q(h))); }
    function floor(b, c1, c2, plank) {
      rect(b, 0, groundY, W, H - groundY + P, c1);
      b.fillStyle = c2;
      b.fillRect(0, groundY, W, P);
      if (plank) for (var x = 0; x < W; x += P * 12) b.fillRect(q(x), groundY + P, P * 0.5, H - groundY);
    }
    // inner(b) draws the view through the window (clipped); then the frame bars go on top
    function windowFrame(b, x, y, w, h, sky1, sky2, stars, inner, frame) {
      x = q(x); y = q(y); w = q(w); h = q(h);
      var fc = frame || '#3b2f2a';
      rect(b, x - P, y - P, w + P * 2, h + P * 2, fc);
      b.save();
      b.beginPath();
      b.rect(x, y, w, h);
      b.clip();
      b.fillStyle = grad(b, y, y + h, sky1, sky2);
      b.fillRect(x, y, w, h);
      if (stars) { b.fillStyle = '#fff'; for (var i = 0; i < 14; i++) b.fillRect(q(x + ((i * 37) % w)), q(y + ((i * 23) % (h * 0.6))), P * 0.6, P * 0.6); }
      if (inner) inner(b, x, y, w, h);
      b.restore();
      rect(b, x + w / 2 - P / 2, y, P, h, fc);
      rect(b, x, y + h / 2 - P / 2, w, P, fc);
    }
    function skyline(b, base, color, lit) {
      var x = 0, i = 0;
      while (x < W) {
        var w = P * (6 + ((i * 7) % 6)), h = P * (10 + ((i * 13) % 18));
        rect(b, x, base - h, w, h, color);
        if (lit) { b.fillStyle = lit; for (var yy = base - h + P * 2; yy < base - P * 2; yy += P * 3) for (var xx = x + P; xx < x + w - P; xx += P * 2) if ((xx + yy + i) % 3 < 1.5) b.fillRect(q(xx), q(yy), P, P); }
        x += w + P;
        i++;
      }
    }
    function paintStreet(b) {
      b.fillStyle = grad(b, 0, groundY, '#2b2350', '#f08a5d');
      b.fillRect(0, 0, W, H);
      skyline(b, groundY - P * 10, '#3a2f5a', 'rgba(255,214,120,.55)');
      // brick wall
      rect(b, 0, groundY - P * 18, W, P * 18, '#7c3f32');
      b.fillStyle = '#6a3329';
      for (var y = groundY - P * 18; y < groundY; y += P * 3) for (var x = ((y / P / 3) % 2) * P * 3; x < W; x += P * 6) b.fillRect(q(x), q(y), P * 5, P * 0.5);
      // street lamp
      var lx = W * 0.12;
      rect(b, lx, groundY - P * 30, P, P * 30, '#1f2937');
      rect(b, lx - P, groundY - P * 32, P * 4, P * 2, '#374151');
      b.fillStyle = 'rgba(255,220,130,.25)';
      b.beginPath(); b.moveTo(lx - P * 6, groundY); b.lineTo(lx + P * 2, groundY - P * 30); b.lineTo(lx + P * 10, groundY); b.fill();
      rect(b, lx, groundY - P * 30, P * 2, P, '#fde68a');
      // cardboard box home
      var bx = W * 0.6;
      rect(b, bx, groundY - P * 7, P * 12, P * 7, '#b9895a');
      rect(b, bx, groundY - P * 8, P * 12, P, '#a07548');
      rect(b, bx + P * 3, groundY - P * 5, P * 5, P * 2, '#8a6440');
      // trash can
      var tx = W * 0.86;
      rect(b, tx, groundY - P * 8, P * 6, P * 8, '#6b7280');
      rect(b, tx - P, groundY - P * 9, P * 8, P, '#4b5563');
      floor(b, '#3f3f46', '#52525b');
      rect(b, W * 0.4, groundY + P * 2, P * 10, P, '#5a6b8a');
    }
    function paintRoom(b) {
      rect(b, 0, 0, W, H, '#d8c3a5');
      b.fillStyle = '#cbb391';
      for (var x = 0; x < W; x += P * 8) b.fillRect(q(x), 0, P, groundY);
      windowFrame(b, W * 0.58, H * 0.22, P * 14, P * 11, '#1e1b4b', '#4338ca', true);
      // poster
      rect(b, W * 0.08, H * 0.25, P * 9, P * 12, '#f472b6');
      rect(b, W * 0.08 + P * 2, H * 0.25 + P * 2, P * 5, P * 5, '#fde68a');
      // bunk bed
      var bx = W * 0.72;
      rect(b, bx, groundY - P * 22, P, P * 22, '#78350f');
      rect(b, bx + P * 18, groundY - P * 22, P, P * 22, '#78350f');
      rect(b, bx, groundY - P * 18, P * 19, P * 3, '#94a3b8');
      rect(b, bx, groundY - P * 6, P * 19, P * 3, '#94a3b8');
      rect(b, bx + P, groundY - P * 20, P * 5, P * 2, '#f8fafc');
      rect(b, bx + P, groundY - P * 8, P * 5, P * 2, '#f8fafc');
      floor(b, '#8b5e3c', '#6b4429', true);
    }
    function paintStudio(b) {
      rect(b, 0, 0, W, H, '#2f6f73');
      windowFrame(b, W * 0.55, H * 0.18, P * 22, P * 14, '#7dd3fc', '#e0f2fe', false, function (bb, x, y, w, h) { skyline(bb, y + h, 'rgba(30,58,95,.45)'); });
      // sofa
      var sx = W * 0.62;
      rect(b, sx, groundY - P * 9, P * 20, P * 6, '#f59e0b');
      rect(b, sx, groundY - P * 13, P * 20, P * 4, '#d97706');
      rect(b, sx - P * 2, groundY - P * 11, P * 3, P * 8, '#d97706');
      rect(b, sx + P * 19, groundY - P * 11, P * 3, P * 8, '#d97706');
      // plant
      var px = W * 0.1;
      rect(b, px, groundY - P * 6, P * 5, P * 6, '#b45309');
      rect(b, px - P * 2, groundY - P * 14, P * 9, P * 8, '#16a34a');
      rect(b, px, groundY - P * 17, P * 4, P * 3, '#22c55e');
      // lamp
      rect(b, W * 0.9, groundY - P * 20, P, P * 20, '#1f2937');
      rect(b, W * 0.9 - P * 3, groundY - P * 24, P * 7, P * 4, '#fde68a');
      floor(b, '#a8744f', '#8a5a3b', true);
    }
    function paintHouse(b) {
      b.fillStyle = grad(b, 0, groundY, '#60a5fa', '#dbeafe');
      b.fillRect(0, 0, W, H);
      rect(b, W * 0.84, H * 0.34, P * 8, P * 8, '#fef08a');
      // house
      var hx = W * 0.55, hw = P * 36, hh = P * 22;
      rect(b, hx, groundY - hh, hw, hh, '#fef3c7');
      b.fillStyle = '#b91c1c';
      b.beginPath(); b.moveTo(q(hx - P * 3), q(groundY - hh)); b.lineTo(q(hx + hw / 2), q(groundY - hh - P * 12)); b.lineTo(q(hx + hw + P * 3), q(groundY - hh)); b.fill();
      rect(b, hx + P * 15, groundY - P * 12, P * 7, P * 12, '#7c2d12');
      windowFrame(b, hx + P * 4, groundY - P * 17, P * 7, P * 6, '#bae6fd', '#e0f2fe');
      windowFrame(b, hx + P * 25, groundY - P * 17, P * 7, P * 6, '#bae6fd', '#e0f2fe');
      // tree
      var tx = W * 0.1;
      rect(b, tx, groundY - P * 12, P * 3, P * 12, '#78350f');
      rect(b, tx - P * 6, groundY - P * 24, P * 15, P * 13, '#15803d');
      rect(b, tx - P * 3, groundY - P * 27, P * 9, P * 3, '#16a34a');
      // fence
      b.fillStyle = '#ffffff';
      for (var x = 0; x < W; x += P * 4) b.fillRect(q(x), groundY - P * 6, P * 2, P * 6);
      b.fillRect(0, groundY - P * 4, W, P);
      floor(b, '#4ade80', '#22c55e');
    }
    function paintPenthouse(b) {
      rect(b, 0, 0, W, H, '#111827');
      windowFrame(b, P * 2, H * 0.08, W - P * 4, groundY - H * 0.08 - P * 8, '#0b1029', '#3b2a6b', true, function (bb, x, y, w, h) {
        skyline(bb, y + h, '#1e1b4b', 'rgba(250,204,21,.7)');
      }, '#0f172a');
      rect(b, 0, groundY - P * 8, W, P * 8, '#1f2937');
      // sleek sofa + art
      var sx = W * 0.64;
      rect(b, sx, groundY - P * 7, P * 22, P * 5, '#e5e7eb');
      rect(b, sx, groundY - P * 10, P * 22, P * 3, '#d1d5db');
      rect(b, W * 0.08, groundY - P * 16, P * 2, P * 16, '#fbbf24');
      rect(b, W * 0.08 - P * 3, groundY - P * 18, P * 8, P * 2, '#fbbf24');
      floor(b, '#374151', '#4b5563');
    }
    function paintVilla(b) {
      b.fillStyle = grad(b, 0, groundY, '#38bdf8', '#fef3c7');
      b.fillRect(0, 0, W, H);
      rect(b, W * 0.8, H * 0.34, P * 9, P * 9, '#fde047');
      rect(b, 0, groundY - P * 14, W, P * 14, '#0ea5e9');
      b.fillStyle = 'rgba(255,255,255,.5)';
      for (var i = 0; i < 12; i++) b.fillRect(q((i * 97) % W), q(groundY - P * (2 + (i * 5) % 12)), P * 4, P * 0.6);
      // villa
      var vx = W * 0.58;
      rect(b, vx, groundY - P * 18, P * 30, P * 18, '#ffffff');
      rect(b, vx - P * 2, groundY - P * 20, P * 34, P * 2, '#f97316');
      rect(b, vx + P * 4, groundY - P * 13, P * 8, P * 8, '#7dd3fc');
      rect(b, vx + P * 18, groundY - P * 13, P * 8, P * 8, '#7dd3fc');
      // palms
      [0.08, 0.92].forEach(function (f, k) {
        var px = W * f;
        rect(b, px, groundY - P * 22, P * 2, P * 22, '#a16207');
        b.fillStyle = '#16a34a';
        b.fillRect(q(px - P * 7), q(groundY - P * 24), P * 16, P * 2);
        b.fillRect(q(px - P * 5), q(groundY - P * 26), P * 12, P * 2);
        b.fillRect(q(px + (k ? -P * 9 : P * 7)), q(groundY - P * 22), P * 4, P * 3);
      });
      floor(b, '#fde68a', '#facc15');
    }

    /* ---------------- vehicles (exterior scenes) ---------------- */
    function bestCar() { var c = -1; L().cars.forEach(function (o, i) { if (o && i < 4) c = i; }); return c; }
    function drawVehicle(x, y) {
      var tier = L().home;
      var exterior = tier === 0 || tier === 3 || tier === 5;
      if (L().cars[4] && (exterior || tier === 4)) { // the jet flies across any scene with a sky view
        var jx = ((time * 40) % (W + 200)) - 100, jy = H * 0.26;
        rect(g, jx, jy, P * 12, P * 2, '#f8fafc');
        rect(g, jx + P * 4, jy - P * 2, P * 3, P * 6, '#cbd5e1');
        rect(g, jx, jy - P * 2, P * 2, P * 2, '#ef4444');
      }
      var c = bestCar();
      if (c < 0 || !exterior) return;
      var col = ['#ef4444', '#60a5fa', '#e5e7eb', '#dc2626'][c];
      if (c === 0) { // bicycle
        g.strokeStyle = '#111827';
        g.lineWidth = P * 0.8;
        g.beginPath(); g.arc(x, y - P * 3, P * 3, 0, Math.PI * 2); g.arc(x + P * 10, y - P * 3, P * 3, 0, Math.PI * 2); g.stroke();
        rect(g, x, y - P * 7, P * 10, P, col);
        rect(g, x + P * 4, y - P * 9, P, P * 4, col);
        rect(g, x + P * 9, y - P * 9, P * 2, P, '#111827');
        return;
      }
      var len = c === 3 ? 26 : 22, h = c === 3 ? 5 : 7;
      rect(g, x, y - P * (h + 2), P * len, P * h, col);
      rect(g, x + P * 5, y - P * (h + 6), P * (len - 12), P * 4, c === 3 ? '#111827' : '#bae6fd');
      rect(g, x + P * len - P * 2, y - P * (h + 1), P * 2, P * 2, '#fde68a');
      rect(g, x + P * 3, y - P * 4, P * 5, P * 4, '#111827');
      rect(g, x + P * (len - 8), y - P * 4, P * 5, P * 4, '#111827');
      rect(g, x + P * 4, y - P * 3, P * 3, P * 2, '#9ca3af');
      rect(g, x + P * (len - 7), y - P * 3, P * 3, P * 2, '#9ca3af');
    }

    /* ---------------- render ---------------- */
    var time = 0, jump = 9, blink = 0;
    function render(dt) {
      drawBg();
      buildAvatar();
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(bgCanvas, 0, 0, W, H);
      var l = L();
      // pets
      for (var pi = 0; pi < Math.min(3, l.pets); pi++) drawDog(avX() - P * (12 + pi * 9), groundY, pi);
      drawVehicle(W * 0.6, groundY);
      // avatar with idle bob + hustle hop
      jump += dt;
      var hop = jump < 0.3 ? Math.sin(jump / 0.3 * Math.PI) * P * 5 : 0;
      var squash = jump < 0.08 ? 1 - jump / 0.08 * 0.1 : 1;
      var bob = Math.sin(time * 2.6) * P * 0.35;
      var x = avX(), w = 20 * P, h = 30 * P * squash;
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(x - P * 5, groundY - P * 0.5, P * 10, P);
      var ax = Math.round(x - w / 2), ay = Math.round(groundY - h - hop + bob + P);
      g.drawImage(avCanvas, ax, ay, w, h);
      // eyes (blink every few seconds)
      blink -= dt;
      if (blink < -0.12) blink = rand(2, 5);
      var eyeH = blink < 0 ? P * 0.3 : P * 1.5;
      if (look() !== 5) {
        g.fillStyle = '#1b1530';
        g.fillRect(ax + P * 8, ay + P * 7 + (P * 1.5 - eyeH), P, eyeH);
        g.fillRect(ax + P * 11, ay + P * 7 + (P * 1.5 - eyeH), P, eyeH);
      }
      // speech bubble while studying
      if (l.study >= 0) {
        var bx = x + P * 7, by = groundY - h - P * 4;
        rect(g, bx, by - P * 6, P * 10, P * 6, '#ffffff');
        rect(g, bx + P, by, P * 2, P, '#ffffff');
        rect(g, bx + P * 2, by - P * 5, P * 6, P * 4, '#1d4ed8');
        rect(g, bx + P * 4, by - P * 5, P * 2, P * 4, '#eff6ff');
      }
      drawParts(dt);
      drawFloats(dt);
      if (S.intro && S.st.hustles < 3 && !modal && !curEvent) {
        g.globalAlpha = 0.6 + Math.sin(time * 5) * 0.4;
        g.font = '800 ' + Math.max(12, Math.round(P * 3)) + 'px system-ui, sans-serif';
        g.textAlign = 'center';
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(10,8,25,.6)';
        var t = (ctx.isTouch ? 'TAP' : 'CLICK') + ' TO HUSTLE';
        g.strokeText(t, x, groundY - h - P * 4);
        g.fillStyle = '#ffffff';
        g.fillText(t, x, groundY - h - P * 4);
        g.globalAlpha = 1;
      }
      if (paused || dead) {
        g.fillStyle = 'rgba(5,6,16,.35)';
        g.fillRect(0, 0, W, H);
      }
    }
    function drawDog(x, y, i) {
      var c = ['#d6a46b', '#f8fafc', '#3f3f46'][i];
      var wag = Math.sin(time * 12 + i) > 0 ? P : 0;
      rect(g, x, y - P * 5, P * 7, P * 3, c);
      rect(g, x + P * 5, y - P * 8, P * 4, P * 4, c);
      rect(g, x + P * 8, y - P * 6, P, P, '#1b1530');
      rect(g, x + P * 6, y - P * 7, P, P, '#1b1530');
      rect(g, x + P * 5, y - P * 9, P, P * 2, c);
      rect(g, x - P, y - P * 6 - wag, P, P * 2, c);
      rect(g, x, y - P * 2, P, P * 2, c);
      rect(g, x + P * 5, y - P * 2, P, P * 2, c);
    }
    function drawParts(dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.gr * dt;
        if (p.k === 'conf') p.vx += Math.sin(time * 5 + i) * 40 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        g.globalAlpha = Math.min(1, (p.life / p.max) * 2);
        if (p.k === 'coin') {
          g.fillStyle = '#a16207'; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
          g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s * 0.75, p.s * 0.75);
        } else if (p.k === 'heart') {
          var s = p.s / 2;
          g.fillStyle = p.c;
          g.fillRect(p.x - s * 2, p.y - s, s * 1.6, s * 1.4);
          g.fillRect(p.x + s * 0.4, p.y - s, s * 1.6, s * 1.4);
          g.fillRect(p.x - s * 1.4, p.y, s * 2.8, s * 1.2);
          g.fillRect(p.x - s * 0.6, p.y + s, s * 1.2, s);
        } else {
          g.fillStyle = p.c;
          g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s * (p.k === 'conf' ? 0.6 : 1));
        }
      }
      g.globalAlpha = 1;
    }
    function drawFloats(dt) {
      g.textAlign = 'center';
      g.lineJoin = 'round';
      for (var i = floats.length - 1; i >= 0; i--) {
        var f = floats[i];
        f.t += dt;
        if (f.t > 1.1) { floats.splice(i, 1); continue; }
        var pop = f.t < 0.12 ? 0.6 + (f.t / 0.12) * 0.4 : 1;
        var size = Math.round(Math.max(13, P * 3.4) * f.s * pop);
        g.font = '900 ' + size + 'px system-ui, -apple-system, Segoe UI, sans-serif';
        g.globalAlpha = f.t > 0.75 ? 1 - (f.t - 0.75) / 0.35 : 1;
        var y = f.y - easeOut(Math.min(1, f.t / 0.9)) * P * 9;
        g.lineWidth = Math.max(2, size * 0.18);
        g.strokeStyle = 'rgba(10,8,25,.85)';
        g.strokeText(f.text, f.x, y);
        g.fillStyle = f.c;
        g.fillText(f.text, f.x, y);
      }
      g.globalAlpha = 1;
    }

    /* ---------------- input ---------------- */
    function onScenePointer(e) {
      if (e.button != null && e.button > 0) return;
      if (e.target !== view.canvas) return;
      var r = view.canvas.getBoundingClientRect();
      hustle(e.clientX - r.left, e.clientY - r.top);
    }
    view.canvas.addEventListener('pointerdown', onScenePointer);
    ctx.captureKeys(['Digit1', 'Digit2', 'KeyP']);
    ctx.onKey(function (code, down) {
      if (!down || destroyed) return;
      if (code === 'Escape' && modal && !modal.sticky) { closeModal(); return; }
      if (modal) {
        // the shell blocks Space's default, so let Space press the pop-up's main button
        if (code === 'Space') { var pb = modal.el.querySelector('.ig-btn:not(.secondary)'); if (pb) pb.click(); }
        return;
      }
      if (code === 'Space') hustle();
      else if ((code === 'Digit1' || code === 'Digit2') && curEvent) chooseEvent(code === 'Digit1' ? 0 : 1, false);
      else if (code === 'KeyP') setPaused(true);
      else if (code === 'ArrowUp' || code === 'ArrowDown') {
        var i = TABS.findIndex(function (t) { return t.id === tab; });
        i = (i + (code === 'ArrowUp' ? -1 : 1) + TABS.length) % TABS.length;
        setTab(TABS[i].id);
        sfx('click');
      }
    });
    var pointerInPanel = false;
    function onPanelEnter() { pointerInPanel = true; }
    function onPanelLeave() { pointerInPanel = false; if (dirty) renderPanel(); }
    panel.addEventListener('pointerenter', onPanelEnter);
    panel.addEventListener('pointerleave', onPanelLeave);

    /* ---------------- loop ---------------- */
    var hudT = 0, saveT = 0, lastWall = Date.now();
    var loop = IGAME.loop(function (dt) {
      var now = Date.now();
      var gap = (now - lastWall) / 1000;
      lastWall = now;
      if (gap > 3 && S.intro && !paused && !dead) {
        var got = applyAway(gap, true);
        if (got > 0) toast('Welcome back! Businesses earned +' + money(got));
      }
      time += dt;
      tick(dt);
      render(dt);
      pumpToast();
      hudT += dt;
      if (hudT > 0.2) {
        hudT = 0;
        updateHud();
        if (dirty && !(pointerInPanel && !ctx.isTouch)) renderPanel();
        else updatePanel();
      }
      saveT += dt;
      if (saveT > 5) { saveT = 0; if (S.intro) save(); }
    });

    // startup
    for (var k in tabBtns) tabBtns[k].classList.toggle('on', k === tab);
    renderPanel();
    updateHud();
    layout();
    recalcGeom();
    if (!S.intro) showIntro();
    else if (S.over) { dead = true; showSummary(); }
    else if (L().health <= 0) endLife(false);
    else {
      var away = (Date.now() - (S.last || Date.now())) / 1000;
      if (away > 1) applyAway(away, away < 30);
    }
    loop.start();

    var pausedAt = 0;
    if (ctx.debug) {
      window.__li = {
        get S() { return S; },
        away: function (sec) { return applyAway(sec, false); },
        give: function (n) { L().cash += n; },
        age: function (y) { L().age += y; L().exp += y; },
        event: function () { evTimer = 0; },
        kill: function () { L().health = 0.01; },
        geom: function () { return { W: W, H: H, P: P, groundY: groundY, narrow: narrow }; },
      };
    }

    return {
      pause: function () {
        if (destroyed) return;
        loop.stop();
        pausedAt = Date.now();
        if (S.intro) save();
      },
      resume: function () {
        if (destroyed || loop.isRunning()) return;
        var away = pausedAt ? (Date.now() - pausedAt) / 1000 : 0;
        pausedAt = 0;
        lastWall = Date.now();
        if (S.intro && !paused && !dead && away > 1) applyAway(away, away < 30);
        loop.start();
      },
      destroy: function () {
        if (destroyed) return;
        if (S.intro) save();
        destroyed = true;
        loop.stop();
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', layout);
        view.canvas.removeEventListener('pointerdown', onScenePointer);
        panel.removeEventListener('pointerenter', onPanelEnter);
        panel.removeEventListener('pointerleave', onPanelLeave);
        closeModal();
        view.destroy();
        if (ctx.debug && window.__li) delete window.__li;
        root.innerHTML = '';
      },
    };
  });
})();
