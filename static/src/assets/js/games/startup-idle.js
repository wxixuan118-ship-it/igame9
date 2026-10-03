/*!
 * Garage to Unicorn — igame9 original startup idle clicker (Idle Startup Tycoon style).
 *
 * Tap the founder's desk to write code, hire staff who code for you, ship roadmap
 * features (multipliers), move the company from a garage to an IPO, then sell the
 * startup to investors for permanent Equity ★ (prestige: +10% revenue per ★).
 *
 * Variants: 'default' (bright office) and 'github' (dark developer-mode skin with a
 * terminal log, build line and save export/import as a text string).
 *
 * Layout: DOM panel (tabs + scrolling lists) next to (16:9) or below (portrait) a
 * canvas office scene. Font size scales with the frame; everything is in em units.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var VERSION = '1.4.0';
  var BUILD_DATE = '2026.10.02';
  var COMMIT = '7c3e9a1';
  var SAVE_VER = 1;
  var OFFLINE_CAP = 8 * 3600; // seconds
  var EXIT_GATE = 1e7; // run earnings needed before investors will buy the company
  var SPRINT_TAPS = 25; // taps per shipped feature (bonus)
  var GROWTH = 1.15; // hire cost growth per unit
  var MILESTONES = [10, 25, 50, 100, 200, 300, 400, 500];
  var EXPORT_PREFIX = 'G2U1:';

  /* ------------------------------------------------------------------ */
  /* Game data                                                           */
  /* ------------------------------------------------------------------ */
  var HIRES = [
    { id: 'intern', name: 'Intern', cost: 15, rate: 0.4, color: '#f59e0b', desc: 'Fixes typos, fetches coffee' },
    { id: 'junior', name: 'Junior Dev', cost: 150, rate: 2.5, color: '#22c55e', desc: 'Ships small features' },
    { id: 'senior', name: 'Senior Dev', cost: 1800, rate: 15, color: '#3b82f6', desc: 'Deletes more code than they write' },
    { id: 'designer', name: 'Product Designer', cost: 24000, rate: 90, color: '#ec4899', desc: 'Makes users actually pay' },
    { id: 'growth', name: 'Growth Marketer', cost: 3.2e5, rate: 540, color: '#f97316', desc: 'Turns posts into sign-ups' },
    { id: 'data', name: 'Data Scientist', cost: 4.5e6, rate: 3200, color: '#8b5cf6', desc: 'Finds money in dashboards' },
    { id: 'ml', name: 'ML Research Lab', cost: 7e7, rate: 20000, color: '#06b6d4', desc: 'Trains models on everything' },
    { id: 'robot', name: 'Robot Ops Team', cost: 1.1e9, rate: 125000, color: '#94a3b8', desc: 'Never sleeps, never complains' },
    { id: 'orbital', name: 'Orbital Server Crew', cost: 1.8e10, rate: 8e5, color: '#eab308', desc: 'Runs the cloud from actual orbit' },
    { id: 'synth', name: 'Synthetic Co-Founder', cost: 3e11, rate: 5e6, color: '#f43f5e', desc: 'Has opinions about your roadmap' },
  ];

  // Company stages: office + product milestone. mult = permanent (this run) revenue multiplier.
  var STAGES = [
    { name: 'Garage', product: 'MVP in a garage', cost: 0, mult: 1, desks: 2 },
    { name: 'Shared Loft', product: 'Public beta', cost: 1000, mult: 1.5, desks: 4 },
    { name: 'First Office', product: 'Version 1.0 launch', cost: 25000, mult: 1.5, desks: 6 },
    { name: 'Open-Plan Floor', product: 'Mobile apps', cost: 5e5, mult: 2, desks: 9 },
    { name: 'Tech Campus', product: 'Global launch', cost: 1e7, mult: 2, desks: 12 },
    { name: 'Skyscraper HQ', product: 'Platform & API', cost: 2.5e8, mult: 2, desks: 15 },
    { name: 'IPO Day', product: 'Ring the opening bell', cost: 7.5e9, mult: 3, desks: 15 },
  ];

  // Roadmap features: three per hire (unlocked by head-count) + tap / global boosts.
  var HIRE_FEATS = [
    ['Free coffee', 'Mentorship program', 'Return offers'],
    ['Code reviews', 'Style guide', 'On-call rotation'],
    ['Ergonomic chairs', 'Tech-debt Fridays', 'Staff promotions'],
    ['Design system', 'User interviews', 'Dark mode'],
    ['Referral program', 'Viral loop', 'Prime-time TV ad'],
    ['Dashboards', 'A/B testing', 'Real-time pipeline'],
    ['GPU cluster', 'Bigger models', 'Self-tuning models'],
    ['Rust-proof servos', 'Swarm firmware', 'Robot union deal'],
    ['Solar wings', 'Laser uplink', 'Zero-g cooling'],
    ['Ethics module', 'Long-term memory', 'Board seat'],
  ];
  var FEAT_TIERS = [
    { own: 1, costMul: 10, mult: 2 },
    { own: 25, costMul: 150, mult: 2 },
    { own: 75, costMul: 5000, mult: 2 },
  ];
  var UPGRADES = [];
  HIRES.forEach(function (h, i) {
    FEAT_TIERS.forEach(function (t, k) {
      UPGRADES.push({ id: 'h' + i + 't' + k, kind: 'hire', hire: i, own: t.own, cost: h.cost * t.costMul, mult: t.mult, name: HIRE_FEATS[i][k] });
    });
  });
  [
    ['Mechanical keyboard', 60, 2],
    ['Second monitor', 1500, 2],
    ['Vim shortcuts', 2e5, 2],
    ['Rubber duck debugging', 5e7, 3],
    ['Deep flow state', 2e10, 3],
  ].forEach(function (u, k) {
    UPGRADES.push({ id: 'tap' + k, kind: 'tap', cost: u[1], mult: u[2], name: u[0] });
  });
  [
    ['Hot reload', 12000, 0.02],
    ['Pair programming', 2e7, 0.03],
  ].forEach(function (u, k) {
    UPGRADES.push({ id: 'pct' + k, kind: 'pct', cost: u[1], pct: u[2], name: u[0] });
  });
  [
    ['Team offsite', 50000, 1.25],
    ['Stock options', 1e7, 1.25],
    ['Four-day week', 5e9, 1.5],
  ].forEach(function (u, k) {
    UPGRADES.push({ id: 'all' + k, kind: 'all', cost: u[1], mult: u[2], name: u[0] });
  });
  UPGRADES.sort(function (a, b) { return a.cost - b.cost; });
  var UPG_BY_ID = {};
  UPGRADES.forEach(function (u) { UPG_BY_ID[u.id] = u; });

  // Investor perks: unlocked by Equity ★ held (never spent).
  var PERKS = [
    { id: 'angel', need: 5, name: 'Angel network', desc: 'Start every new company with $1,000' },
    { id: 'bot', need: 15, name: 'Commit bot', desc: 'Writes code for you: 2 automatic taps per second' },
    { id: 'night', need: 40, name: 'Night shift', desc: 'Offline earnings rise from 50% to 100%' },
    { id: 'recruit', need: 100, name: 'Recruiter network', desc: 'All hires cost 10% less' },
    { id: 'media', need: 300, name: 'Media darling', desc: 'Trending bubbles twice as often; boosts last 30 s' },
    { id: 'legend', need: 1000, name: 'Legend status', desc: '×3 revenue and tap value' },
  ];
  var ROUNDS = ['Bootstrapped', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Pre-IPO'];

  var NAME_A = ['Pixel', 'Byte', 'Snack', 'Cloud', 'Loop', 'Nova', 'Pocket', 'Hyper', 'Quill', 'Mango', 'Lumen', 'Bolt', 'Echo', 'Kiwi', 'Maple', 'Rocket', 'Zen', 'Tiny', 'Spark', 'Otter'];
  var NAME_B = ['ly', 'ify', 'Hub', 'Labs', 'Stack', 'Base', '.io', 'Works', 'Box', 'Pal', 'Dash', 'Mint', 'Grid', 'Nest', 'Flow'];
  var COMMITS = [
    'feat: add dark mode', 'fix: off-by-one in invoices', 'chore: bump dependencies', 'perf: cache avatars',
    'docs: update README', 'refactor: split billing service', 'test: cover signup flow', 'feat: export to CSV',
    'fix: flaky login test', 'ci: speed up builds', 'feat: team workspaces', 'fix: timezone bug (again)',
    'feat: onboarding checklist', 'perf: lazy-load charts', 'feat: emoji reactions', 'fix: null user crash',
  ];
  var GLYPHS = ['{ }', '</>', '=>', '++', ';', 'fn()', '[ ]', '&&', '#', '01'];

  var THEMES = {
    default: {
      night: false,
      mono: false,
      tabs: ['Team', 'Roadmap', 'Office', 'Investors', '⚙'],
      verb: 'write code',
      codeColor: ['#7dd3fc', '#f9a8d4', '#fde68a', '#a7f3d0', '#c4b5fd'],
    },
    github: {
      night: true,
      mono: true,
      tabs: ['team', 'roadmap', 'office', 'equity', 'config'],
      verb: 'commit code',
      codeColor: ['#3fb950', '#58a6ff', '#d2a8ff', '#ffa657', '#79c0ff'],
    },
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function money(n) { return '$' + IGAME.fmt(n); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
  function hex7() { return (Math.random() * 0xfffffff | 0).toString(16).padStart(7, '0'); }
  function randomName() {
    var b = pick(NAME_B);
    return pick(NAME_A) + b;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ------------------------------------------------------------------ */
  /* Scoped CSS (injected once per mount, inside the root)               */
  /* ------------------------------------------------------------------ */
  var CSS = [
    '.si-app{position:absolute;inset:0;display:grid;font-size:var(--si-fs,14px);color:var(--si-text);background:var(--si-bg);overflow:hidden;line-height:1.3}',
    '.si-app *{box-sizing:border-box}',
    '.si-app.si-wide{grid-template-columns:minmax(0,1fr) var(--si-pw,42%)}',
    '.si-app.si-tall{grid-template-rows:var(--si-sh,42%) minmax(0,1fr)}',
    '.si-scene{position:relative;overflow:hidden;min-width:0;min-height:0;cursor:pointer}',
    '.si-scene canvas{touch-action:none}',
    '.si-panel{display:flex;flex-direction:column;min-height:0;min-width:0;background:var(--si-panel);border-left:1px solid var(--si-line)}',
    '.si-tall .si-panel{border-left:0;border-top:1px solid var(--si-line)}',
    '.si-tabs{display:flex;gap:.25em;padding:.45em .45em 0;flex:none}',
    '.si-pfs .si-tabs{padding-right:56px}',
    '.si-pfs.si-tall .si-tabs{padding-right:.45em}',
    '.si-pfs.si-tall .si-hud-r{margin-right:48px}',
    '.si-tab{position:relative;flex:1 1 0;min-width:0;border:1px solid transparent;border-bottom:0;background:transparent;color:var(--si-muted);font:inherit;font-weight:800;font-size:.86em;padding:.6em .2em .55em;border-radius:.7em .7em 0 0;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation}',
    '.si-tab:hover{color:var(--si-text)}',
    '.si-tab.is-on{background:var(--si-card);color:var(--si-text);border-color:var(--si-line)}',
    '.si-tab.is-hint{animation:siPulse 1s ease-in-out infinite}',
    '.si-dot{position:absolute;top:.35em;right:.35em;width:.5em;height:.5em;border-radius:50%;background:var(--si-good);box-shadow:0 0 6px var(--si-good);display:none}',
    '.si-tab.has-dot .si-dot{display:block}',
    '.si-body{flex:1;display:flex;flex-direction:column;min-height:0;background:var(--si-card);border-top:1px solid var(--si-line);margin-top:-1px}',
    '.si-sub{flex:none;display:flex;align-items:center;gap:.4em;padding:.5em .6em .2em;color:var(--si-muted);font-size:.85em;flex-wrap:wrap}',
    '.si-sub b{color:var(--si-text)}',
    '.si-sub:empty{display:none}',
    '.si-seg{display:inline-flex;margin-left:auto;background:var(--si-bg);border:1px solid var(--si-line);border-radius:.6em;padding:.15em}',
    '.si-seg button{border:0;background:transparent;color:var(--si-muted);font:inherit;font-weight:800;padding:.25em .55em;border-radius:.45em;cursor:pointer;touch-action:manipulation}',
    '.si-seg button.is-on{background:var(--si-accent);color:#fff}',
    '.si-list{flex:1;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:.4em .5em .8em;-webkit-overflow-scrolling:touch;scrollbar-width:thin}',
    '.si-row{display:grid;grid-template-columns:2.5em minmax(0,1fr) auto;gap:.6em;align-items:center;padding:.5em .55em;border-radius:.8em;background:var(--si-row);margin-bottom:.4em;border:1px solid var(--si-line)}',
    '.si-row.is-locked{opacity:.55}',
    '.si-row.is-done{opacity:.7}',
    '.si-av{width:2.5em;height:2.5em;border-radius:.7em;display:grid;place-items:center;background:var(--si-bg);overflow:hidden}',
    '.si-av svg{width:100%;height:100%;display:block}',
    '.si-info{min-width:0}',
    '.si-name{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.si-name small{font-weight:700;color:var(--si-muted);margin-left:.3em}',
    '.si-best{display:none;font-style:normal;font-size:.68em;font-weight:900;letter-spacing:.03em;color:#04120a;background:var(--si-good);border-radius:.4em;padding:.1em .45em;margin-left:.5em;vertical-align:.12em}',
    '.si-row.is-best .si-best{display:inline-block}',
    '.si-meta{font-size:.82em;color:var(--si-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.si-meta b{color:var(--si-money);font-weight:800}',
    '.si-mbar{height:.3em;border-radius:1em;background:var(--si-bg);margin-top:.3em;overflow:hidden}',
    '.si-mbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--si-accent),var(--si-accent2));border-radius:1em}',
    '.si-buy{min-width:6.6em;border:0;border-radius:.7em;padding:.45em .65em;font:inherit;font-weight:800;cursor:pointer;background:linear-gradient(135deg,var(--si-accent),var(--si-accent2));color:#fff;line-height:1.15;text-align:center;touch-action:manipulation;box-shadow:0 3px 10px rgba(0,0,0,.25)}',
    '.si-buy small{display:block;font-size:.78em;font-weight:700;opacity:.9}',
    '.si-buy.is-off{background:var(--si-off);color:var(--si-muted);box-shadow:none;cursor:default}',
    '.si-buy:not(.is-off):hover{filter:brightness(1.1)}',
    '.si-buy:not(.is-off):active{transform:translateY(1px)}',
    '.si-buy.si-wide-btn{width:100%;padding:.7em;font-size:1.05em}',
    '.si-card{border-radius:.9em;background:var(--si-row);border:1px solid var(--si-line);padding:.8em .9em;margin-bottom:.55em}',
    '.si-card h4{margin:0 0 .25em;font-size:1.05em;color:var(--si-text)}',
    '.si-card p{margin:.2em 0;color:var(--si-muted);font-size:.9em}',
    '.si-card .si-big{font-size:1.6em;font-weight:900;color:var(--si-text);font-family:var(--si-numfont)}',
    '.si-card.is-cur{border-color:var(--si-accent);box-shadow:inset 0 0 0 1px var(--si-accent)}',
    '.si-kv{display:grid;grid-template-columns:1fr auto;gap:.25em .8em;font-size:.9em}',
    '.si-kv span{color:var(--si-muted)}',
    '.si-kv b{text-align:right;font-family:var(--si-numfont)}',
    '.si-perk{display:flex;gap:.6em;align-items:flex-start;padding:.45em 0;border-top:1px solid var(--si-line);font-size:.9em}',
    '.si-perk:first-of-type{border-top:0}',
    '.si-perk i{flex:none;font-style:normal;width:1.6em;height:1.6em;border-radius:50%;display:grid;place-items:center;background:var(--si-bg);color:var(--si-muted);font-weight:900;font-size:.85em}',
    '.si-perk.is-on i{background:var(--si-good);color:#04120a}',
    '.si-perk b{display:block}',
    '.si-perk span{color:var(--si-muted)}',
    '.si-btnrow{display:flex;gap:.5em;flex-wrap:wrap;margin-top:.5em}',
    '.si-sbtn{border:1px solid var(--si-line);background:var(--si-bg);color:var(--si-text);font:inherit;font-weight:800;padding:.5em .9em;border-radius:.6em;cursor:pointer;touch-action:manipulation}',
    '.si-sbtn:hover{border-color:var(--si-accent)}',
    '.si-sbtn.is-danger{color:#fca5a5;border-color:rgba(248,113,113,.45)}',
    '.si-sbtn.is-danger.is-armed{background:#b91c1c;color:#fff;border-color:#ef4444}',
    '.si-ta{width:100%;min-height:4.6em;resize:vertical;font:.82em/1.35 var(--si-monofont);color:var(--si-text);background:var(--si-bg);border:1px solid var(--si-line);border-radius:.6em;padding:.5em;user-select:text;-webkit-user-select:text;touch-action:auto;word-break:break-all}',
    '.si-note{font-size:.82em;color:var(--si-muted);margin-top:.35em}',
    '.si-hud{position:absolute;left:0;right:0;top:0;padding:.6em .7em 0;display:flex;align-items:flex-start;gap:.5em;pointer-events:none;z-index:3}',
    '.si-money{min-width:0;flex:1;text-shadow:0 2px 8px rgba(0,0,0,.55)}',
    '.si-cash{font:900 2em/1 var(--si-numfont);color:#fff;letter-spacing:-.02em;white-space:nowrap}',
    '.si-rate{font-weight:800;font-size:.95em;color:var(--si-money);margin-top:.15em;white-space:nowrap}',
    '.si-hud-r{display:flex;gap:.4em;align-items:center;pointer-events:auto}',
    '.si-pill{font-weight:800;font-size:.85em;color:#fff;background:rgba(5,6,14,.6);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:.3em .7em;white-space:nowrap}',
    '.si-gear{width:2.3em;height:2.3em;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(5,6,14,.6);color:#fff;font:inherit;font-size:1em;cursor:pointer;display:grid;place-items:center;padding:0;touch-action:manipulation}',
    '.si-gear svg{width:1.2em;height:1.2em}',
    '.si-goal{position:absolute;left:.7em;top:calc(var(--si-fs) * 4.45);z-index:3;max-width:min(26em,calc(100% - 1.4em));display:block;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(5,6,14,.62);color:#fff;font:inherit;font-size:.85em;font-weight:700;padding:.4em .7em .45em;border-radius:.7em;cursor:pointer;touch-action:manipulation;backdrop-filter:blur(2px)}',
    '.si-goal span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.si-goal em{font-style:normal;color:var(--si-muted);font-weight:800;margin-right:.3em}',
    '.si-goal .si-mbar{margin-top:.3em;background:rgba(255,255,255,.12)}',
    '.si-boost{position:absolute;right:.7em;top:calc(var(--si-fs) * 3.4);z-index:3;font-weight:900;font-size:.85em;color:#1a1300;background:linear-gradient(135deg,#fde047,#fb923c);border-radius:999px;padding:.3em .75em;display:none;box-shadow:0 0 14px rgba(253,224,71,.5)}',
    '.si-hint{position:absolute;left:50%;top:44%;transform:translateX(-50%);z-index:3;max-width:calc(100% - 1.2em);font-weight:800;font-size:.85em;color:#fff;background:rgba(5,6,14,.72);border:1px solid var(--si-accent);border-radius:999px;padding:.35em .9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;animation:siBob 1.6s ease-in-out infinite}',
    '.si-hint:empty{display:none}',
    '.si-build{position:absolute;right:.6em;bottom:.4em;z-index:2;font:600 .7em var(--si-monofont);color:rgba(201,209,217,.6);pointer-events:none;white-space:nowrap}',
    '.si-tall .si-build{display:none}',
    '@keyframes siPulse{50%{color:var(--si-good);box-shadow:inset 0 -2px 0 var(--si-good)}}',
    '@keyframes siBob{50%{transform:translate(-50%,-3px)}}',
    '.si-mono .si-tab,.si-mono .si-name,.si-mono .si-buy,.si-mono .si-goal,.si-mono .si-pill,.si-mono .si-card h4{font-family:var(--si-monofont)}',
    '.si-mono .si-tab{font-size:.8em}',
    '.si-mono .si-buy,.si-mono .si-row,.si-mono .si-card,.si-mono .si-goal,.si-mono .si-sbtn{border-radius:.45em}',
    '.si-mono .si-tab.is-on{box-shadow:inset 0 2px 0 #f78166}',
    '.si-root-dev .ig-panel{background:#0d1117;border:1px solid #30363d;border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
    '.si-root-dev .ig-title{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:-.03em}',
    '.si-root-dev .ig-btn{background:#238636;box-shadow:none;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
    '.si-root-dev .ig-btn.secondary{background:#21262d;border:1px solid #30363d}',
    '.si-root-dev .ig-toast{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border-radius:6px;border-color:#30363d;background:rgba(13,17,23,.92)}',
    '@media (prefers-reduced-motion:reduce){.si-hint,.si-tab.is-hint{animation:none}}',
  ].join('\n');

  var THEME_VARS = {
    default:
      '--si-bg:#0d1020;--si-panel:#121631;--si-card:#171c3d;--si-row:#1e2450;--si-off:#2a3060;--si-line:rgba(255,255,255,.09);--si-text:#eef0ff;--si-muted:#a2a8d6;--si-accent:#8b6cff;--si-accent2:#2dd4f0;--si-good:#34d399;--si-money:#fde047;' +
      '--si-numfont:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--si-monofont:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    github:
      '--si-bg:#010409;--si-panel:#0d1117;--si-card:#0d1117;--si-row:#161b22;--si-off:#21262d;--si-line:#30363d;--si-text:#e6edf3;--si-muted:#8b949e;--si-accent:#238636;--si-accent2:#2ea043;--si-good:#3fb950;--si-money:#3fb950;' +
      '--si-numfont:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--si-monofont:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
  };

  var GEAR_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

  // Small drawn avatar for a role (shirt colour + badge shape per tier).
  function avatarSvg(i, night) {
    var h = HIRES[i];
    var bg = night ? '#161b22' : '#2a3168';
    var skin = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'][i % 5];
    var hair = ['#3b2314', '#111827', '#7c2d12', '#fcd34d', '#1f2937'][i % 5];
    var acc = '';
    if (i >= 6) acc = '<rect x="6" y="14" width="12" height="3" rx="1.5" fill="#e2e8f0" opacity=".9"/>'; // lab coat stripe
    if (i === 7) acc = '<rect x="7.5" y="5" width="9" height="7" rx="2" fill="#cbd5e1"/><circle cx="10" cy="8.5" r="1.1" fill="#0ea5e9"/><circle cx="14" cy="8.5" r="1.1" fill="#0ea5e9"/>';
    if (i === 8) acc = '<circle cx="12" cy="8.5" r="5.2" fill="none" stroke="#e2e8f0" stroke-width="1.2" opacity=".8"/>';
    if (i === 9) acc = '<circle cx="12" cy="8.5" r="1.4" fill="#f43f5e"/>';
    var head = i === 7 ? '' : '<circle cx="12" cy="8.5" r="4" fill="' + skin + '"/><path d="M8 8a4 4 0 0 1 8 0c-1-1.6-2.6-2.2-4-2.2S9 6.4 8 8z" fill="' + hair + '"/>';
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="' + bg + '"/>' +
      '<path d="M3.5 24c0-5.5 3.8-8.5 8.5-8.5s8.5 3 8.5 8.5z" fill="' + h.color + '"/>' + head + acc + '</svg>'
    );
  }
  function iconSvg(kind, night) {
    var bg = night ? '#161b22' : '#2a3168';
    var c = { tap: '#fde047', pct: '#38bdf8', all: '#34d399', stage: '#c4b5fd', lock: '#64748b' }[kind] || '#fff';
    var p = {
      tap: '<rect x="5" y="9" width="14" height="8" rx="2" fill="none" stroke="' + c + '" stroke-width="1.6"/><path d="M8 12h1M11 12h1M14 12h1M8 14.5h8" stroke="' + c + '" stroke-width="1.4" stroke-linecap="round"/>',
      pct: '<path d="M6 16l4-4 3 3 5-6" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 9h3v3" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round"/>',
      all: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" fill="' + c + '"/>',
      stage: '<path d="M5 19V9l7-4 7 4v10z" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linejoin="round"/><rect x="10" y="13" width="4" height="6" fill="' + c + '"/>',
      lock: '<rect x="7" y="11" width="10" height="8" rx="1.5" fill="' + c + '"/><path d="M9 11V9a3 3 0 0 1 6 0v2" fill="none" stroke="' + c + '" stroke-width="1.6"/>',
    }[kind];
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="' + bg + '"/>' + p + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('startup-idle', function (ctx) {
    var variant = THEMES[ctx.variant] ? ctx.variant : 'default';
    var TH = THEMES[variant];
    var NIGHT = TH.night;
    var ui = IGAME.ui;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var root = ctx.root;
    var destroyed = false;
    var timers = [];

    /* ---------------- state & persistence ---------------- */
    function freshState() {
      return {
        v: SAVE_VER,
        cash: 0,
        runEarned: 0,
        totalEarned: 0,
        taps: 0,
        totalTaps: 0,
        hires: HIRES.map(function () { return 0; }),
        upg: {},
        stage: 0,
        equity: 0,
        exits: 0,
        sprint: 0,
        features: 0,
        bestRate: 0,
        playTime: 0,
        name: randomName(),
        tut: 0,
        introDone: false,
        buyMode: 1,
        lastSeen: Date.now(),
        started: Date.now(),
      };
    }
    // Merge a parsed save onto defaults; tolerant of missing / bad fields.
    function sanitize(o) {
      var s = freshState();
      if (!o || typeof o !== 'object') return s;
      ['cash', 'runEarned', 'totalEarned', 'taps', 'totalTaps', 'stage', 'equity', 'exits', 'sprint', 'features', 'bestRate', 'playTime', 'tut', 'lastSeen', 'started'].forEach(function (k) {
        var n = Number(o[k]);
        if (isFinite(n) && n >= 0) s[k] = n;
      });
      if (Array.isArray(o.hires)) for (var i = 0; i < HIRES.length; i++) s.hires[i] = Math.max(0, Math.floor(Number(o.hires[i]) || 0));
      if (o.upg && typeof o.upg === 'object') for (var k in o.upg) if (UPG_BY_ID[k]) s.upg[k] = 1;
      s.stage = clamp(Math.floor(s.stage), 0, STAGES.length - 1);
      s.equity = Math.floor(s.equity);
      if (typeof o.name === 'string' && o.name.length < 24) s.name = o.name;
      s.introDone = !!o.introDone;
      s.buyMode = [1, 10, 25, 'max'].indexOf(o.buyMode) > -1 ? o.buyMode : 1;
      return s;
    }
    var S = sanitize(store.get('save', null));
    var hadSave = !!store.get('save', null);

    function save() {
      if (destroyed && !S) return;
      S.lastSeen = Date.now();
      store.set('save', S);
    }

    /* ---------------- derived numbers ---------------- */
    var D = { rate: 0, tapBase: 1, tapPct: 0, globalMult: 1, each: [], hireMult: [], eqMult: 1, stageMult: 1 };
    function perk(id) {
      for (var i = 0; i < PERKS.length; i++) if (PERKS[i].id === id) return S.equity >= PERKS[i].need;
      return false;
    }
    function milestoneMult(n) {
      var m = 1;
      for (var i = 0; i < MILESTONES.length; i++) if (n >= MILESTONES[i]) m *= 2;
      return m;
    }
    function nextMilestone(n) {
      for (var i = 0; i < MILESTONES.length; i++) if (n < MILESTONES[i]) return MILESTONES[i];
      return 0;
    }
    function recalc() {
      var legend = perk('legend') ? 3 : 1;
      D.eqMult = (1 + 0.1 * S.equity) * legend;
      D.stageMult = 1;
      for (var k = 0; k <= S.stage; k++) D.stageMult *= STAGES[k].mult;
      var all = 1, tapMult = 1, pct = 0, hu = HIRES.map(function () { return 1; });
      for (var id in S.upg) {
        var u = UPG_BY_ID[id];
        if (!u) continue;
        if (u.kind === 'hire') hu[u.hire] *= u.mult;
        else if (u.kind === 'tap') tapMult *= u.mult;
        else if (u.kind === 'pct') pct += u.pct;
        else if (u.kind === 'all') all *= u.mult;
      }
      D.globalMult = D.eqMult * D.stageMult * all;
      D.rate = 0;
      for (var i = 0; i < HIRES.length; i++) {
        D.hireMult[i] = milestoneMult(S.hires[i]) * hu[i];
        D.each[i] = HIRES[i].rate * D.hireMult[i] * D.globalMult;
        D.rate += D.each[i] * S.hires[i];
      }
      D.tapBase = tapMult * D.stageMult * D.eqMult;
      D.tapPct = pct;
    }
    function boostMult() { return boost.t > 0 ? boost.mult : 1; }
    function curRate() { return D.rate * boostMult(); }
    function tapValue() { return (D.tapBase + D.tapPct * D.rate) * boostMult(); }
    function costMul() { return perk('recruit') ? 0.9 : 1; }
    function hireCost(i, k) {
      // cost of k more units of hire i (geometric series)
      var c0 = HIRES[i].cost * costMul() * Math.pow(GROWTH, S.hires[i]);
      return k === 1 ? c0 : (c0 * (Math.pow(GROWTH, k) - 1)) / (GROWTH - 1);
    }
    // extra revenue per second from hiring one more unit of role i
    function hireDelta(i) {
      var n = S.hires[i];
      var hu = D.hireMult[i] / milestoneMult(n);
      return HIRES[i].rate * hu * D.globalMult * (milestoneMult(n + 1) * (n + 1) - milestoneMult(n) * n);
    }
    function maxAffordable(i) {
      var c0 = HIRES[i].cost * costMul() * Math.pow(GROWTH, S.hires[i]);
      if (S.cash < c0) return 0;
      return Math.max(1, Math.floor(Math.log((S.cash * (GROWTH - 1)) / c0 + 1) / Math.log(GROWTH)));
    }
    function buyCount(i, forceMax) {
      var m = forceMax ? 'max' : S.buyMode;
      if (m === 'max') return Math.max(1, maxAffordable(i));
      return m;
    }
    function equityPreview() {
      return Math.floor(3 * Math.cbrt(S.runEarned / 1e6));
    }
    function hireVisible(i) {
      return i === 0 || S.hires[i - 1] > 0 || S.hires[i] > 0;
    }
    function upgUnlocked(u) {
      if (u.kind === 'hire') return S.hires[u.hire] >= u.own;
      return S.runEarned >= u.cost * 0.25 || S.cash >= u.cost * 0.5;
    }
    function earn(n) {
      S.cash += n;
      S.runEarned += n;
      S.totalEarned += n;
    }

    /* ---------------- DOM ---------------- */
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var app = ui.el('div', 'si-app si-wide' + (TH.mono ? ' si-mono' : ''));
    if (variant === 'github') root.classList.add('si-root-dev');
    app.setAttribute('style', THEME_VARS[variant]);
    root.appendChild(app);

    var scene = ui.el('div', 'si-scene');
    app.appendChild(scene);
    var panel = ui.el('div', 'si-panel');
    app.appendChild(panel);

    var hud = ui.el('div', 'si-hud');
    hud.innerHTML =
      '<div class="si-money"><div class="si-cash">$0</div><div class="si-rate">$0/s</div></div>' +
      '<div class="si-hud-r"><span class="si-pill si-eq" title="Equity"></span><button type="button" class="si-gear" data-act="gear" aria-label="Settings and stats">' + GEAR_SVG + '</button></div>';
    scene.appendChild(hud);
    var elCash = hud.querySelector('.si-cash');
    var elRate = hud.querySelector('.si-rate');
    var elEq = hud.querySelector('.si-eq');
    var goalBtn = ui.el('button', 'si-goal', '<span></span><div class="si-mbar"><i></i></div>');
    goalBtn.type = 'button';
    goalBtn.setAttribute('data-act', 'goal');
    scene.appendChild(goalBtn);
    var elGoalT = goalBtn.querySelector('span');
    var elGoalBar = goalBtn.querySelector('i');
    var elBoost = ui.el('div', 'si-boost', '');
    scene.appendChild(elBoost);
    var elHint = ui.el('div', 'si-hint', '');
    scene.appendChild(elHint);
    if (variant === 'github') {
      scene.appendChild(ui.el('div', 'si-build', 'garage-to-unicorn v' + VERSION + ' · build ' + BUILD_DATE + ' · main@' + COMMIT));
    }

    var tabsEl = ui.el('div', 'si-tabs');
    tabsEl.setAttribute('role', 'tablist');
    TH.tabs.forEach(function (label, i) {
      var b = ui.el('button', 'si-tab', esc(label) + '<span class="si-dot"></span>');
      b.type = 'button';
      b.setAttribute('data-act', 'tab');
      b.setAttribute('data-i', i);
      b.setAttribute('role', 'tab');
      if (i === 4) b.setAttribute('aria-label', 'Settings and stats');
      tabsEl.appendChild(b);
    });
    panel.appendChild(tabsEl);
    var body = ui.el('div', 'si-body');
    panel.appendChild(body);
    var subEl = ui.el('div', 'si-sub');
    body.appendChild(subEl);
    var listEl = ui.el('div', 'si-list');
    body.appendChild(listEl);
    var tabBtns = tabsEl.querySelectorAll('.si-tab');

    /* ---------------- layout (font scale + orientation) ---------------- */
    var FW = 0, FH = 0, tall = false;
    function layout() {
      var r = root.getBoundingClientRect();
      FW = r.width;
      FH = r.height;
      if (!FW || !FH) return;
      tall = FW / FH < 1.12;
      app.classList.toggle('si-tall', tall);
      app.classList.toggle('si-wide', !tall);
      // the shell shows an exit button in the top-right corner in pseudo-fullscreen
      app.classList.toggle('si-pfs', !!(ctx.frame && ctx.frame.classList.contains('is-pseudo-fs')));
      var fs = tall ? clamp(Math.min(FW / 29, FH / 36), 11.5, 16) : clamp(Math.min(FW / 76, FH / 40), 11.5, 17);
      app.style.setProperty('--si-fs', fs.toFixed(2) + 'px');
      app.style.setProperty('--si-pw', clamp(Math.round(fs * 30), 300, Math.round(FW * 0.5)) + 'px');
      app.style.setProperty('--si-sh', (FH < 520 ? 45 : 47) + '%');
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
    if (ro) ro.observe(root);
    else window.addEventListener('resize', layout);
    layout();

    /* ---------------- canvas scene ---------------- */
    var W = 0, H = 0, U = 20, TXT = 12;
    var bg = document.createElement('canvas');
    var bgDirty = true;
    // Desk slots (x, y as fractions of the scene, s = scale). Founder desk first.
    // f = position on the floor (0 = wall line, 1 = bottom edge), s = scale. Founder desk first.
    var SLOTS = [
      { x: 0.5, f: 0.72, s: 1.15 },
      { x: 0.25, f: 0.6, s: 0.98 }, { x: 0.75, f: 0.6, s: 0.98 },
      { x: 0.38, f: 0.36, s: 0.82 }, { x: 0.62, f: 0.36, s: 0.82 },
      { x: 0.07, f: 0.6, s: 0.98 }, { x: 0.93, f: 0.6, s: 0.98 },
      { x: 0.16, f: 0.36, s: 0.82 }, { x: 0.84, f: 0.36, s: 0.82 },
      { x: 0.29, f: 0.13, s: 0.68 }, { x: 0.71, f: 0.13, s: 0.68 },
      { x: 0.5, f: 0.13, s: 0.68 }, { x: 0.11, f: 0.13, s: 0.68 },
      { x: 0.89, f: 0.13, s: 0.68 }, { x: 0.5, f: 0.36, s: 0.82 },
      { x: 0.4, f: 0.13, s: 0.68 },
    ];
    var desks = []; // {x,y,s,role,phase}
    var view = IGAME.createCanvas(scene, {
      onResize: function (w, h) {
        W = w;
        H = h;
        U = Math.max(8, Math.min(w / 11, h / 5.8, 92));
        TXT = clamp(U * 0.32, 11, 17);
        bgDirty = true;
        buildDesks();
      },
    });
    var g = view.ctx;

    function horizonY() {
      return Math.round(H * (tall ? 0.4 : 0.53));
    }
    function buildDesks() {
      // Fill visible desks with the highest tiers first (one desk ≈ one team).
      var cap = STAGES[S.stage].desks;
      var roles = [];
      for (var i = HIRES.length - 1; i >= 0 && roles.length < cap; i--) {
        var n = Math.min(S.hires[i], Math.max(1, Math.ceil(cap / 4)));
        for (var k = 0; k < n && roles.length < cap; k++) roles.push(i);
      }
      var prev = desks;
      var hz = horizonY();
      var slotY = function (sl) { return hz + sl.f * (H - hz); };
      desks = [{ x: SLOTS[0].x * W, y: slotY(SLOTS[0]), s: SLOTS[0].s, role: -1, phase: 0 }];
      for (var d = 0; d < roles.length; d++) {
        var sl = SLOTS[d + 1];
        var old = prev[d + 1];
        desks.push({ x: sl.x * W, y: slotY(sl), s: sl.s, role: old && old.role === roles[d] ? old.role : roles[d], phase: old ? old.phase : Math.random() * TAU });
      }
      // draw back rows first
      desks.sort(function (a, b) { return a.y - b.y; });
    }

    // Stage palettes: wall, wall2, floor, floor2, sky top, sky bottom
    function palette(st) {
      var day = [
        ['#5b6475', '#4a5262', '#3a3f4b', '#2f333d', '#9ec5ff', '#ffe2b8'],
        ['#9a4b3b', '#7e3d30', '#4a3b33', '#3d312a', '#ff9a7a', '#ffd29a'],
        ['#e6e1d6', '#d6d0c2', '#8a7a68', '#776856', '#7cc4ff', '#d8f0ff'],
        ['#e8edf3', '#d9e0e8', '#9aa6b5', '#8793a3', '#6fb6ff', '#cfe9ff'],
        ['#f1efe6', '#e3e0d4', '#a28f73', '#8f7d63', '#73c7ff', '#e6f7d9'],
        ['#d7dde8', '#c5ccda', '#5d6678', '#4f576a', '#ff8f6b', '#ffd59b'],
        ['#d7dde8', '#c5ccda', '#5d6678', '#4f576a', '#ff8f6b', '#ffd59b'],
      ][st];
      if (!NIGHT) return day;
      return [
        ['#1b2230', '#151b27', '#10151e', '#0c1118', '#0b1020', '#1c2440'],
        ['#2a1a1a', '#221515', '#141012', '#100c0e', '#0b1020', '#2a2147'],
        ['#1c2230', '#171c28', '#11161f', '#0e121a', '#070b18', '#1b2340'],
        ['#1a2030', '#151a28', '#0f141d', '#0c1018', '#060a16', '#1a2140'],
        ['#1b2230', '#161c29', '#11161f', '#0e121a', '#060a16', '#13263a'],
        ['#161b26', '#121722', '#0d1118', '#0a0e14', '#05070f', '#2a1b3d'],
        ['#161b26', '#121722', '#0d1118', '#0a0e14', '#05070f', '#2a1b3d'],
      ][st];
    }

    // Static background (wall, windows, floor, sign) cached in an offscreen canvas.
    function renderBg() {
      bgDirty = false;
      var dpr = view.dpr || 1;
      bg.width = Math.max(1, Math.round(W * dpr));
      bg.height = Math.max(1, Math.round(H * dpr));
      var b = bg.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      var st = S.stage;
      var P = palette(st);
      var horizon = horizonY();
      // wall
      var gr = b.createLinearGradient(0, 0, 0, horizon);
      gr.addColorStop(0, P[1]);
      gr.addColorStop(1, P[0]);
      b.fillStyle = gr;
      b.fillRect(0, 0, W, horizon);
      if (st === 1) brick(b, horizon, NIGHT ? 'rgba(0,0,0,.25)' : 'rgba(60,20,10,.28)');
      // windows / views
      if (st === 0) garage(b, horizon, P);
      else if (st === 1) {
        archWindow(b, W * 0.62, horizon * 0.2, W * 0.13, horizon * 0.62, P);
        archWindow(b, W * 0.82, horizon * 0.2, W * 0.13, horizon * 0.62, P);
      } else if (st === 2) {
        for (var i = 0; i < 3; i++) cityWindow(b, W * (0.5 + i * 0.16), horizon * 0.22, W * 0.13, horizon * 0.55, P, 0.55, i);
        whiteboard(b, W * 0.06, horizon * 0.35, W * 0.2, horizon * 0.42);
      } else {
        // glass wall with mullions
        var top = st >= 5 ? horizon * 0.08 : horizon * 0.18;
        var vh = horizon - top - horizon * 0.06;
        cityWindow(b, W * 0.02, top, W * 0.96, vh, P, st === 3 ? 0.55 : st === 4 ? 0.35 : 0.85, 9, st);
        b.fillStyle = P[1];
        for (var m = 0; m <= 8; m++) b.fillRect(W * 0.02 + (W * 0.96 * m) / 8 - 2, top, 4, vh);
        b.fillRect(W * 0.02, top + vh * 0.62, W * 0.96, 3);
      }
      // baseboard + floor
      var fl = b.createLinearGradient(0, horizon, 0, H);
      fl.addColorStop(0, P[3]);
      fl.addColorStop(1, P[2]);
      b.fillStyle = fl;
      b.fillRect(0, horizon, W, H - horizon);
      b.fillStyle = 'rgba(0,0,0,.25)';
      b.fillRect(0, horizon, W, Math.max(2, H * 0.012));
      // floor perspective lines
      b.strokeStyle = NIGHT ? 'rgba(88,166,255,.06)' : 'rgba(255,255,255,.07)';
      b.lineWidth = 1;
      for (var x = -6; x <= 6; x++) {
        b.beginPath();
        b.moveTo(W / 2 + x * W * 0.06, horizon);
        b.lineTo(W / 2 + x * W * 0.28, H);
        b.stroke();
      }
      for (var y = 1; y < 6; y++) {
        var yy = horizon + (H - horizon) * Math.pow(y / 6, 1.6);
        b.beginPath();
        b.moveTo(0, yy);
        b.lineTo(W, yy);
        b.stroke();
      }
      // plants
      if (st >= 2) {
        plant(b, W * 0.03, horizon + 2, U * 0.9);
        plant(b, W * 0.97, horizon + 2, U * 0.9);
      }
      // company sign
      sign(b, st, horizon);
    }
    function brick(b, horizon, col) {
      var bh = Math.max(6, H * 0.035), bw = bh * 2.4;
      b.fillStyle = col;
      for (var r = 0; r * bh < horizon; r++) {
        b.fillRect(0, r * bh, W, 1);
        for (var c = -1; c * bw < W; c++) b.fillRect(c * bw + (r % 2 ? bw / 2 : 0), r * bh, 1, bh);
      }
    }
    function sky(b, x, y, w, h, P) {
      var s = b.createLinearGradient(0, y, 0, y + h);
      s.addColorStop(0, P[4]);
      s.addColorStop(1, P[5]);
      b.fillStyle = s;
      b.fillRect(x, y, w, h);
      if (NIGHT) {
        b.fillStyle = 'rgba(255,255,255,.7)';
        for (var i = 0; i < w * h / 900; i++) b.fillRect(x + Math.random() * w, y + Math.random() * h * 0.6, 1, 1);
      }
    }
    function garage(b, horizon, P) {
      var x = W * 0.5, w = W * 0.46, y = horizon * 0.14, h = horizon * 0.86;
      b.fillStyle = NIGHT ? '#0e131c' : '#3a4150';
      b.fillRect(x - 6, y - 6, w + 12, h + 6);
      for (var i = 0; i < 9; i++) {
        b.fillStyle = i % 2 ? (NIGHT ? '#1a2130' : '#8b95a8') : NIGHT ? '#161c29' : '#7d879b';
        b.fillRect(x, y + (h * i) / 9, w, h / 9);
        b.fillStyle = 'rgba(0,0,0,.18)';
        b.fillRect(x, y + (h * (i + 1)) / 9 - 2, w, 2);
      }
      // shelf with boxes
      b.fillStyle = NIGHT ? '#2b2f3a' : '#6b4f37';
      b.fillRect(W * 0.04, horizon * 0.55, W * 0.36, 4);
      var bx = ['#c08a5a', '#a87445', '#d19c69', '#b07d4f'];
      for (var k = 0; k < 4; k++) {
        b.fillStyle = NIGHT ? '#3a3f4c' : bx[k];
        var bw = W * 0.06, bh2 = horizon * (0.12 + (k % 2) * 0.06);
        b.fillRect(W * 0.06 + k * W * 0.08, horizon * 0.55 - bh2, bw, bh2);
      }
      // hanging bulb
      b.strokeStyle = '#222';
      b.beginPath();
      b.moveTo(W * 0.3, 0);
      b.lineTo(W * 0.3, horizon * 0.25);
      b.stroke();
      var lg = b.createRadialGradient(W * 0.3, horizon * 0.28, 1, W * 0.3, horizon * 0.28, U * 3);
      lg.addColorStop(0, 'rgba(255,230,150,.55)');
      lg.addColorStop(1, 'rgba(255,230,150,0)');
      b.fillStyle = lg;
      b.fillRect(W * 0.3 - U * 3, horizon * 0.28 - U * 3, U * 6, U * 6);
      b.fillStyle = '#ffe9a8';
      b.beginPath();
      b.arc(W * 0.3, horizon * 0.28, Math.max(3, U * 0.18), 0, TAU);
      b.fill();
    }
    function archWindow(b, x, y, w, h, P) {
      b.save();
      b.beginPath();
      b.moveTo(x, y + h);
      b.lineTo(x, y + w / 2);
      b.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
      b.lineTo(x + w, y + h);
      b.closePath();
      b.clip();
      sky(b, x, y, w, h, P);
      skyline(b, x, y, w, h, 0.45, 3);
      b.restore();
      b.strokeStyle = NIGHT ? '#0b0f16' : '#2b1712';
      b.lineWidth = 3;
      b.beginPath();
      b.moveTo(x, y + h);
      b.lineTo(x, y + w / 2);
      b.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
      b.lineTo(x + w, y + h);
      b.closePath();
      b.moveTo(x + w / 2, y);
      b.lineTo(x + w / 2, y + h);
      b.moveTo(x, y + h * 0.55);
      b.lineTo(x + w, y + h * 0.55);
      b.stroke();
    }
    // window with sky + skyline. depth: 0..1 how far below the city is (skyscraper view)
    function cityWindow(b, x, y, w, h, P, depth, seed, st) {
      b.save();
      b.beginPath();
      b.rect(x, y, w, h);
      b.clip();
      sky(b, x, y, w, h, P);
      if (st === 4) {
        // campus: hills and trees
        b.fillStyle = NIGHT ? '#0f2a22' : '#86c06c';
        b.beginPath();
        b.moveTo(x, y + h);
        for (var i = 0; i <= 20; i++) b.lineTo(x + (w * i) / 20, y + h * (0.55 + 0.08 * Math.sin(i * 0.9 + 1)));
        b.lineTo(x + w, y + h);
        b.fill();
        for (var t = 0; t < 14; t++) {
          var tx = x + ((t * 0.071 + 0.03) % 1) * w, ty = y + h * (0.72 + (t % 3) * 0.07), tr = h * (0.08 + (t % 2) * 0.03);
          b.fillStyle = NIGHT ? '#0b2019' : t % 2 ? '#4f9d4a' : '#3f8a3f';
          b.beginPath();
          b.arc(tx, ty, tr, 0, TAU);
          b.fill();
        }
      } else {
        if (st >= 5) {
          b.fillStyle = NIGHT ? 'rgba(120,130,170,.18)' : 'rgba(255,255,255,.75)';
          for (var c = 0; c < 6; c++) {
            var cx = x + ((c * 0.19 + 0.05) % 1) * w, cy = y + h * (0.25 + (c % 3) * 0.12);
            b.beginPath();
            b.ellipse(cx, cy, w * 0.06, h * 0.05, 0, 0, TAU);
            b.ellipse(cx + w * 0.04, cy - h * 0.03, w * 0.05, h * 0.05, 0, 0, TAU);
            b.fill();
          }
        }
        skyline(b, x, y, w, h, depth, seed + 2);
      }
      b.restore();
      b.strokeStyle = NIGHT ? '#0a0d13' : 'rgba(30,35,45,.55)';
      b.lineWidth = 3;
      b.strokeRect(x, y, w, h);
    }
    function skyline(b, x, y, w, h, depth, seed) {
      var n = Math.max(6, Math.round(w / 18));
      var base = y + h;
      for (var layer = 0; layer < 2; layer++) {
        for (var i = 0; i < n; i++) {
          var r = Math.abs(Math.sin((i + 1) * 12.9898 + seed * 78.233 + layer * 3.1)) % 1;
          var bw = w / n;
          var bh = h * (layer ? 0.25 + r * 0.45 : 0.18 + r * 0.3) * (1 - depth * 0.55);
          var bx = x + i * bw + (layer ? bw * 0.3 : 0);
          b.fillStyle = NIGHT ? (layer ? '#141b2d' : '#0d1322') : layer ? 'rgba(80,95,125,.85)' : 'rgba(120,140,170,.6)';
          b.fillRect(bx, base - bh, bw * 0.82, bh);
          if (layer) {
            b.fillStyle = NIGHT ? 'rgba(255,214,120,.75)' : 'rgba(255,255,255,.35)';
            for (var wy = base - bh + 4; wy < base - 3; wy += 6)
              for (var wx = bx + 3; wx < bx + bw * 0.82 - 3; wx += 5) if (Math.random() < (NIGHT ? 0.35 : 0.5)) b.fillRect(wx, wy, 2, 2);
          }
        }
      }
    }
    function whiteboard(b, x, y, w, h) {
      b.fillStyle = NIGHT ? '#1f2633' : '#fafafa';
      b.fillRect(x, y, w, h);
      b.strokeStyle = NIGHT ? '#2d3646' : '#9aa3b0';
      b.lineWidth = 2;
      b.strokeRect(x, y, w, h);
      var notes = ['#fde047', '#f9a8d4', '#86efac', '#93c5fd'];
      for (var i = 0; i < 6; i++) {
        b.fillStyle = notes[i % 4];
        b.globalAlpha = NIGHT ? 0.55 : 1;
        b.fillRect(x + w * (0.08 + (i % 3) * 0.3), y + h * (0.12 + Math.floor(i / 3) * 0.45), w * 0.2, h * 0.32);
      }
      b.globalAlpha = 1;
    }
    function plant(b, x, y, s) {
      b.fillStyle = NIGHT ? '#2b2f3a' : '#c2703d';
      b.fillRect(x - s * 0.3, y - s * 0.55, s * 0.6, s * 0.55);
      b.fillStyle = NIGHT ? '#164d32' : '#3fa34d';
      for (var i = 0; i < 5; i++) {
        b.beginPath();
        b.ellipse(x + (i - 2) * s * 0.18, y - s * (0.85 + (i % 2) * 0.2), s * 0.16, s * 0.42, (i - 2) * 0.35, 0, TAU);
        b.fill();
      }
    }
    function sign(b, st, horizon) {
      var x = st === 0 ? W * 0.22 : st === 1 ? W * 0.27 : st === 2 ? W * 0.16 : W * 0.5;
      var y = st === 0 ? horizon * 0.8 : st === 1 ? horizon * 0.62 : st === 2 ? horizon * 0.89 : st === 6 ? horizon * 0.62 : horizon * 0.86;
      var fs = Math.max(10, Math.min(U * 0.55, 22));
      b.font = '900 ' + fs + 'px ' + (TH.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'system-ui,-apple-system,Segoe UI,sans-serif');
      var label = S.name;
      var tw = b.measureText(label).width + fs * 1.2;
      b.fillStyle = NIGHT ? 'rgba(13,17,23,.85)' : st === 0 ? '#2b2f3a' : 'rgba(20,24,40,.82)';
      roundRect(b, x - tw / 2, y - fs * 0.85, tw, fs * 1.7, fs * 0.4);
      b.fill();
      b.textAlign = 'center';
      b.textBaseline = 'middle';
      b.shadowColor = NIGHT ? '#3fb950' : '#8b6cff';
      b.shadowBlur = 10;
      b.fillStyle = NIGHT ? '#56d364' : '#fff';
      b.fillText(label, x, y + 1);
      b.shadowBlur = 0;
    }
    function roundRect(c, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    /* ---------------- particles & floating text (pooled) ---------------- */
    var parts = [];
    var MAX_PARTS = 140;
    function spawn(kind, x, y, vx, vy, life, color, size, text) {
      var p;
      if (parts.length < MAX_PARTS) {
        p = {};
        parts.push(p);
      } else {
        // recycle the oldest
        p = parts[0];
        for (var i = 1; i < parts.length; i++) if (parts[i].age / parts[i].life > p.age / p.life) p = parts[i];
      }
      p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.age = 0;
      p.color = color; p.size = size; p.text = text || ''; p.rot = Math.random() * TAU; p.vr = rand(-6, 6); p.dead = false;
      return p;
    }
    function floatText(x, y, text, color, size) {
      spawn('text', x, y, rand(-12, 12), -55, 1.1, color, size, text);
    }
    function burstConfetti(n) {
      var cols = ['#f43f5e', '#fde047', '#34d399', '#60a5fa', '#c084fc', '#fb923c'];
      for (var i = 0; i < n; i++) spawn('conf', rand(0, W), rand(-20, H * 0.2), rand(-40, 40), rand(30, 140), rand(1.6, 2.8), pick(cols), rand(3, 7));
    }
    var shake = 0;

    /* ---------------- runtime state ---------------- */
    var tNow = 0;
    var founderPulse = 0;
    var boost = { t: 0, mult: 1, max: 1 };
    var bubble = null; // trending bubble
    var bubbleTimer = rand(35, 60);
    var autoTapAcc = 0;
    var termLines = [];
    var tickerX = 0;
    var deskPopT = 0;
    var uiTimer = 0;
    var lastEcon = performance.now();
    var tab = 0;
    var sessionStart = Date.now();
    var dirtyList = true;

    function founderPos() {
      var hz = horizonY();
      return { x: W * SLOTS[0].x, y: hz + SLOTS[0].f * (H - hz) };
    }
    function addTerm(text, color) {
      termLines.push({ t: text, c: color || '#8b949e' });
      if (termLines.length > 7) termLines.shift();
    }
    addTerm('$ git clone ' + S.name.toLowerCase().replace('.', '') + '.git', '#8b949e');

    /* ---------------- actions ---------------- */
    function doTap(px, py, auto) {
      var v = tapValue();
      earn(v);
      S.taps++;
      S.totalTaps++;
      founderPulse = 1;
      var f = founderPos();
      var x = px == null ? f.x + rand(-U, U) : px;
      var y = py == null ? f.y - U * 1.6 : py;
      if (!auto || Math.random() < 0.35) {
        floatText(x + rand(-8, 8), y - 6, '+' + money(v), NIGHT ? '#56d364' : '#fde047', TXT * 1.15);
        for (var i = 0; i < (auto ? 1 : 2); i++) {
          spawn('glyph', f.x + rand(-U, U), f.y - U * 1.3, rand(-90, 90), rand(-150, -80), 0.8, pick(TH.codeColor), TXT * 0.95, pick(GLYPHS));
        }
      }
      if (!auto) sfx({ f: 820 + Math.random() * 380, d: 0.035, type: 'square', v: 0.035 });
      if (NIGHT && (!auto || Math.random() < 0.2) && S.taps % 3 === 0) addTerm(hex7() + ' ' + pick(COMMITS), '#c9d1d9');
      // sprint: every SPRINT_TAPS taps ships a feature for a bonus
      S.sprint++;
      if (S.sprint >= SPRINT_TAPS) {
        S.sprint = 0;
        S.features++;
        var bonus = 12 * tapValue() + 3 * curRate();
        earn(bonus);
        shake = 0.35;
        for (var k = 0; k < 18; k++) spawn('spark', f.x, f.y - U * 1.2, rand(-160, 160), rand(-220, -40), rand(0.5, 0.9), pick(TH.codeColor), rand(2, 4));
        floatText(f.x, f.y - U * 2.4, 'Feature shipped! +' + money(bonus), '#ffffff', TXT * 1.35);
        if (NIGHT) addTerm('$ git tag v0.' + S.features + '.0 && deploy  ✔', '#3fb950');
        sfx('coin');
      }
      if (S.tut === 0 && S.taps >= 10) setTut(1);
    }

    function buyHire(i, forceMax) {
      var k = buyCount(i, forceMax);
      var c = hireCost(i, k);
      if (S.cash < c || !hireVisible(i)) {
        sfx('error');
        return;
      }
      var before = S.hires[i];
      S.cash -= c;
      S.hires[i] += k;
      recalc();
      var crossed = nextMilestone(before) && S.hires[i] >= nextMilestone(before);
      if (crossed) {
        sfx('levelup');
        ui.toast(root, HIRES[i].name + ' milestone · output ×2');
      } else sfx('buy');
      if (S.tut === 1) setTut(2);
      buildDesks();
      dirtyList = true;
      save();
    }
    function buyUpgrade(id) {
      var u = UPG_BY_ID[id];
      if (!u || S.upg[id] || !upgUnlocked(u) || S.cash < u.cost) {
        sfx('error');
        return;
      }
      S.cash -= u.cost;
      S.upg[id] = 1;
      recalc();
      sfx('buy');
      var f = founderPos();
      floatText(f.x, f.y - U * 2.2, 'Shipped: ' + u.name, '#ffffff', TXT * 1.25);
      if (NIGHT) addTerm('$ git merge feature/' + u.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), '#58a6ff');
      if (S.tut === 2) setTut(3);
      dirtyList = true;
      save();
    }
    function moveOffice() {
      var nx = S.stage + 1;
      if (nx >= STAGES.length || S.cash < STAGES[nx].cost) {
        sfx('error');
        return;
      }
      S.cash -= STAGES[nx].cost;
      S.stage = nx;
      recalc();
      bgDirty = true;
      buildDesks();
      shake = 0.5;
      burstConfetti(nx === STAGES.length - 1 ? 90 : 45);
      sfx('win');
      ui.toast(root, (nx === STAGES.length - 1 ? '🔔 ' : '') + STAGES[nx].name + ' · revenue ×' + STAGES[nx].mult, 2000);
      if (NIGHT) addTerm('$ deploy --env=' + STAGES[nx].name.toLowerCase().replace(/[^a-z]+/g, '-') + '  ✔', '#d2a8ff');
      if (S.tut === 3) setTut(4);
      dirtyList = true;
      save();
    }
    function exitCompany() {
      var gain = equityPreview();
      if (S.runEarned < EXIT_GATE || gain < 1) {
        sfx('error');
        return;
      }
      var oldName = S.name;
      var ov = ui.overlay(root, {
        title: 'Sell ' + esc(oldName) + '?',
        html:
          '<p style="margin:0 0 8px">Investors offer <b style="color:#fde047">+' + IGAME.fmt(gain) + ' Equity ★</b>.</p>' +
          '<p style="margin:0">You restart in a garage with a new startup. You keep Equity (+10% revenue each, now ' +
          IGAME.fmt(S.equity) + ' → ' + IGAME.fmt(S.equity + gain) + ' ★), investor perks and stats. Cash, hires, features and office reset.</p>',
        buttons: [
          {
            label: 'Sell & start over',
            primary: true,
            onClick: function () {
              ov.close();
              var keep = S;
              var n = freshState();
              n.equity = keep.equity + gain;
              n.exits = keep.exits + 1;
              n.totalEarned = keep.totalEarned;
              n.totalTaps = keep.totalTaps;
              n.features = keep.features;
              n.bestRate = keep.bestRate;
              n.playTime = keep.playTime;
              n.started = keep.started;
              n.tut = 4;
              n.introDone = true;
              n.buyMode = keep.buyMode;
              S = n;
              if (perk('angel')) S.cash = 1000;
              recalc();
              boost.t = 0;
              bubble = null;
              bgDirty = true;
              buildDesks();
              termLines.length = 0;
              addTerm('$ git init ' + S.name.toLowerCase().replace('.', ''), '#8b949e');
              burstConfetti(80);
              sfx('win');
              sfx('levelup');
              ui.toast(root, oldName + ' acquired! +' + IGAME.fmt(gain) + ' ★', 2400);
              renderHint();
              setTab(0);
              save();
            },
          },
          { label: 'Not yet', onClick: function () { ov.close(); } },
        ],
      });
    }
    function setTut(n) {
      S.tut = n;
      renderHint();
    }
    function renderHint() {
      // only the very first step needs a floating hint; later steps live in the NEXT goal box
      elHint.textContent = S.tut === 0 ? (ctx.isTouch ? 'Tap' : 'Click') + ' the glowing desk to ' + TH.verb : '';
      for (var i = 0; i < tabBtns.length; i++) tabBtns[i].classList.toggle('is-hint', (S.tut === 1 && i === 0) || (S.tut === 2 && i === 1) || (S.tut === 3 && i === 2));
    }
    function collectBubble() {
      if (!bubble) return;
      var b = bubble;
      bubble = null;
      shake = 0.25;
      for (var k = 0; k < 16; k++) spawn('spark', b.x, b.y, rand(-150, 150), rand(-150, 150), rand(0.4, 0.8), '#fde047', rand(2, 4));
      if (Math.random() < 0.6 || D.rate <= 0) {
        boost.mult = 3;
        boost.t = boost.max = perk('media') ? 30 : 20;
        floatText(clamp(b.x, W * 0.25, W * 0.75), b.y - 10, 'Trending! ×3 for ' + boost.max + 's', '#fde047', TXT * 1.3);
        sfx('boost');
      } else {
        var cheque = Math.max(60 * D.rate, 25 * D.tapBase);
        earn(cheque);
        floatText(clamp(b.x, W * 0.25, W * 0.75), b.y - 10, 'Angel cheque +' + money(cheque), '#fde047', TXT * 1.3);
        sfx('coin');
      }
      if (NIGHT) addTerm('$ curl -X POST /hype  → 200 OK', '#ffa657');
    }

    /* ---------------- goal ---------------- */
    var goalAct = 0;
    function goal() {
      if (S.tut === 0) return { t: (ctx.isTouch ? 'Tap' : 'Click') + ' the desk to ' + TH.verb, p: S.taps / 10, tab: -1 };
      var hiredAny = S.hires.some(function (n) { return n > 0; });
      if (!hiredAny || S.tut === 1) return { t: 'Hire an Intern in ' + TH.tabs[0] + ' · ' + money(hireCost(0, 1)), p: S.cash / hireCost(0, 1), tab: 0 };
      if (S.tut === 2) {
        var cheapest = null;
        for (var i = 0; i < UPGRADES.length; i++) if (!S.upg[UPGRADES[i].id] && upgUnlocked(UPGRADES[i])) { cheapest = UPGRADES[i]; break; }
        if (cheapest) return { t: 'Ship “' + cheapest.name + '” · ' + money(cheapest.cost), p: S.cash / cheapest.cost, tab: 1 };
      }
      if (S.stage < STAGES.length - 1) {
        var st = STAGES[S.stage + 1];
        return { t: 'Move to ' + st.name + ' · ' + money(st.cost), p: S.cash / st.cost, tab: 2 };
      }
      if (S.runEarned < EXIT_GATE) return { t: 'Earn ' + money(EXIT_GATE) + ' this run to attract buyers', p: S.runEarned / EXIT_GATE, tab: 3 };
      return { t: 'Sell ' + S.name + ' for +' + IGAME.fmt(equityPreview()) + ' ★', p: 1, tab: 3 };
    }

    /* ---------------- panel rendering ---------------- */
    var rowRefs = [];
    function setTab(i) {
      tab = i;
      for (var k = 0; k < tabBtns.length; k++) {
        tabBtns[k].classList.toggle('is-on', k === i);
        tabBtns[k].setAttribute('aria-selected', k === i ? 'true' : 'false');
      }
      listEl.scrollTop = 0;
      dirtyList = true;
      renderList();
    }
    function renderList() {
      dirtyList = false;
      rowRefs = [];
      var h = '';
      var sub = '';
      if (tab === 0) {
        sub = '<span>Staff <b>' + IGAME.fmt(S.hires.reduce(function (a, b) { return a + b; }, 0)) + '</b></span><span class="si-seg">' +
          [1, 10, 25, 'max'].map(function (m) {
            return '<button type="button" data-act="mode" data-m="' + m + '" class="' + (S.buyMode === m ? 'is-on' : '') + '">' + (m === 'max' ? 'Max' : '×' + m) + '</button>';
          }).join('') + '</span>';
        var shownLocked = false;
        HIRES.forEach(function (hr, i) {
          if (!hireVisible(i)) {
            if (shownLocked) return;
            shownLocked = true;
            h += '<div class="si-row is-locked"><div class="si-av">' + iconSvg('lock', NIGHT) + '</div><div class="si-info"><div class="si-name">' + esc(hr.name) +
              '</div><div class="si-meta">Unlocks after your first ' + esc(HIRES[i - 1].name) + '</div></div><span></span></div>';
            return;
          }
          h += '<div class="si-row" data-row="h' + i + '"><div class="si-av">' + avatarSvg(i, NIGHT) + '</div><div class="si-info"><div class="si-name">' + esc(hr.name) +
            '<small class="si-cnt"></small><em class="si-best">BEST</em></div><div class="si-meta"></div><div class="si-mbar"><i></i></div></div>' +
            '<button type="button" class="si-buy" data-act="hire" data-i="' + i + '"></button></div>';
        });
      } else if (tab === 1) {
        var owned = Object.keys(S.upg).length;
        sub = '<span>Shipped <b>' + owned + '</b> / ' + UPGRADES.length + ' features</span>';
        var avail = UPGRADES.filter(function (u) { return !S.upg[u.id] && upgUnlocked(u); });
        avail.slice(0, 14).forEach(function (u) {
          h += '<div class="si-row" data-row="u' + u.id + '"><div class="si-av">' + (u.kind === 'hire' ? avatarSvg(u.hire, NIGHT) : iconSvg(u.kind, NIGHT)) +
            '</div><div class="si-info"><div class="si-name">' + esc(u.name) + '</div><div class="si-meta">' + upgDesc(u) + '</div></div>' +
            '<button type="button" class="si-buy" data-act="upg" data-id="' + u.id + '">' + money(u.cost) + '</button></div>';
        });
        var soon = UPGRADES.filter(function (u) { return !S.upg[u.id] && !upgUnlocked(u) && u.kind === 'hire' && hireVisible(u.hire); }).slice(0, 3);
        soon.forEach(function (u) {
          h += '<div class="si-row is-locked"><div class="si-av">' + iconSvg('lock', NIGHT) + '</div><div class="si-info"><div class="si-name">' + esc(u.name) +
            '</div><div class="si-meta">Needs ' + u.own + ' × ' + esc(HIRES[u.hire].name) + ' (' + S.hires[u.hire] + ')</div></div><span></span></div>';
        });
        if (!avail.length && !soon.length) h += '<div class="si-card"><p>Nothing to ship right now. Keep earning — new features appear as revenue grows.</p></div>';
      } else if (tab === 2) {
        sub = '<span>Company stage <b>' + (S.stage + 1) + '</b> / ' + STAGES.length + '</span>';
        STAGES.forEach(function (st, i) {
          if (i < S.stage) {
            h += '<div class="si-row is-done"><div class="si-av">' + iconSvg('stage', NIGHT) + '</div><div class="si-info"><div class="si-name">' + esc(st.name) +
              ' ✓</div><div class="si-meta">' + esc(st.product) + ' · ×' + st.mult + '</div></div><span></span></div>';
          } else if (i === S.stage) {
            h += '<div class="si-card is-cur"><h4>' + esc(st.name) + '</h4><p>' + esc(st.product) + ' · ' + st.desks + ' desks</p><p>Stage bonus total: <b>×' + IGAME.fmt(D.stageMult) + '</b> revenue</p></div>';
          } else if (i === S.stage + 1) {
            h += '<div class="si-card"><h4>Next: ' + esc(st.name) + '</h4><p>' + esc(st.product) + ' · revenue <b>×' + st.mult + '</b> · ' + st.desks + ' desks</p>' +
              '<div class="si-mbar"><i class="si-stbar"></i></div><div class="si-btnrow"><button type="button" class="si-buy si-wide-btn" data-act="stage"></button></div></div>';
          } else {
            h += '<div class="si-row is-locked"><div class="si-av">' + iconSvg('lock', NIGHT) + '</div><div class="si-info"><div class="si-name">' + esc(st.name) +
              '</div><div class="si-meta">' + money(st.cost) + ' · ×' + st.mult + '</div></div><span></span></div>';
          }
        });
      } else if (tab === 3) {
        var round = S.exits < ROUNDS.length ? ROUNDS[S.exits] : 'Serial founder ×' + (S.exits - ROUNDS.length + 2);
        sub = '<span>Track record <b>' + esc(round) + '</b> · ' + S.exits + ' exit' + (S.exits === 1 ? '' : 's') + '</span>';
        h += '<div class="si-card"><h4>Equity</h4><div class="si-big">' + IGAME.fmt(S.equity) + ' ★</div><p>Each ★ adds +10% to all revenue and taps (now ×' + IGAME.fmt(1 + 0.1 * S.equity) + ').</p></div>';
        h += '<div class="si-card"><h4>Sell the company</h4><p>Earned this run: <b class="si-run"></b></p><p class="si-exitinfo"></p>' +
          '<div class="si-mbar"><i class="si-exbar"></i></div><div class="si-btnrow"><button type="button" class="si-buy si-wide-btn" data-act="exit"></button></div>' +
          '<p class="si-note">Equity gained = 3 × ∛(run earnings ÷ $1M). Exits reset cash, hires, features and office.</p></div>';
        h += '<div class="si-card"><h4>Investor perks</h4>' + PERKS.map(function (p) {
          var on = S.equity >= p.need;
          return '<div class="si-perk' + (on ? ' is-on' : '') + '"><i>' + (on ? '✓' : '★') + '</i><div><b>' + esc(p.name) + ' · ' + IGAME.fmt(p.need) + ' ★</b><span>' + esc(p.desc) + '</span></div></div>';
        }).join('') + '</div>';
      } else {
        sub = '<span>' + esc(S.name) + ' · settings &amp; stats</span>';
        h += '<div class="si-card"><h4>Stats</h4><div class="si-kv">' + statsHtml() + '</div></div>';
        h += '<div class="si-card"><h4>Offline earnings</h4><p>While the game is closed your team keeps working at <b>' + (perk('night') ? '100%' : '50%') +
          '</b> speed for up to 8 hours. Progress autosaves every 5 seconds in this browser.</p></div>';
        if (variant === 'github') {
          h += '<div class="si-card"><h4>Export save</h4><p>Copy this string to back up your company or move it to another browser.</p>' +
            '<textarea class="si-ta si-exp" readonly spellcheck="false" aria-label="Exported save string"></textarea>' +
            '<div class="si-btnrow"><button type="button" class="si-sbtn" data-act="export">Refresh</button><button type="button" class="si-sbtn" data-act="copy">Copy to clipboard</button></div></div>';
          h += '<div class="si-card"><h4>Import save</h4><p>Paste a save string that starts with <code>' + EXPORT_PREFIX + '</code>.</p>' +
            '<textarea class="si-ta si-imp" spellcheck="false" placeholder="' + EXPORT_PREFIX + '…" aria-label="Save string to import"></textarea>' +
            '<div class="si-btnrow"><button type="button" class="si-sbtn" data-act="import">Load save</button></div><p class="si-note si-impmsg"></p></div>';
        }
        h += '<div class="si-card"><h4>Reset progress</h4><p>Deletes everything, including Equity and perks. This cannot be undone.</p>' +
          '<div class="si-btnrow"><button type="button" class="si-sbtn is-danger" data-act="reset">Reset progress</button></div></div>';
        h += '<p class="si-note" style="text-align:center">' + (variant === 'github' ? 'garage-to-unicorn v' + VERSION + ' · build ' + BUILD_DATE + ' · main@' + COMMIT : 'Garage to Unicorn v' + VERSION) + '</p>';
      }
      subEl.innerHTML = sub;
      listEl.innerHTML = h;
      // cache references for fast refresh
      var rows = listEl.querySelectorAll('[data-row]');
      for (var r = 0; r < rows.length; r++) {
        var key = rows[r].getAttribute('data-row');
        rowRefs.push({
          key: key,
          row: rows[r],
          btn: rows[r].querySelector('.si-buy'),
          meta: rows[r].querySelector('.si-meta'),
          cnt: rows[r].querySelector('.si-cnt'),
          bar: rows[r].querySelector('.si-mbar i'),
          last: '',
        });
      }
      if (tab === 4 && variant === 'github') refreshExport();
      refreshList(true);
    }
    function statsHtml() {
      var play = S.playTime + (Date.now() - sessionStart) / 1000;
      return (
        kv('Cash', money(S.cash)) + kv('Revenue', money(D.rate) + '/s') + kv('Tap value', money(D.tapBase + D.tapPct * D.rate)) +
        kv('Earned this run', money(S.runEarned)) + kv('Earned all time', money(S.totalEarned)) + kv('Best revenue', money(S.bestRate) + '/s') +
        kv('Code taps', IGAME.fmt(S.totalTaps)) + kv('Sprint releases', IGAME.fmt(S.features)) + kv('Exits', S.exits) +
        kv('Equity', IGAME.fmt(S.equity) + ' ★') + kv('Play time', IGAME.fmtTime(play))
      );
    }
    function kv(k, v) { return '<span>' + esc(k) + '</span><b>' + esc(String(v)) + '</b>'; }
    function upgDesc(u) {
      if (u.kind === 'hire') return esc(HIRES[u.hire].name) + ' output ×' + u.mult;
      if (u.kind === 'tap') return 'Tap value ×' + u.mult;
      if (u.kind === 'pct') return 'Taps also earn ' + Math.round(u.pct * 100) + '% of revenue/s';
      return 'All revenue ×' + u.mult;
    }
    function setBtn(btn, html, off) {
      if (btn._h !== html) {
        btn.innerHTML = html;
        btn._h = html;
      }
      if (btn._off !== off) {
        btn.classList.toggle('is-off', off);
        btn.setAttribute('aria-disabled', off ? 'true' : 'false');
        btn._off = off;
      }
    }
    // Cheap periodic refresh of numbers/affordability (no re-layout of rows)
    function refreshList(force) {
      if (tab === 0) {
        // tag the hire with the best payback (cost per extra $/s, milestones included)
        var bestI = -1, bestEff = Infinity;
        for (var b = 0; b < rowRefs.length; b++) {
          var bi = +rowRefs[b].key.slice(1);
          var dlt = hireDelta(bi);
          var eff = dlt > 0 ? hireCost(bi, 1) / dlt : Infinity;
          if (eff < bestEff) { bestEff = eff; bestI = bi; }
        }
        for (var r = 0; r < rowRefs.length; r++) {
          var ref = rowRefs[r];
          var isBest = +ref.key.slice(1) === bestI && S.hires.some(function (n) { return n > 0; });
          if (ref._best !== isBest) {
            ref.row.classList.toggle('is-best', isBest);
            ref._best = isBest;
          }
          var i = +ref.key.slice(1);
          var k = buyCount(i);
          var c = hireCost(i, k);
          setBtn(ref.btn, 'Hire ×' + IGAME.fmt(k) + '<small>' + money(c) + '</small>', S.cash < c);
          var nm = nextMilestone(S.hires[i]);
          var meta = '<b>' + money(D.each[i] * S.hires[i]) + '/s</b> · ' + money(D.each[i]) + '/s each' + (nm ? ' · ×2 at ' + nm : '');
          if (ref.last !== meta || force) {
            ref.meta.innerHTML = meta;
            ref.cnt.textContent = '×' + IGAME.fmt(S.hires[i]);
            var prev = 0;
            for (var m = 0; m < MILESTONES.length; m++) if (MILESTONES[m] <= S.hires[i]) prev = MILESTONES[m];
            ref.bar.style.width = nm ? (((S.hires[i] - prev) / (nm - prev)) * 100).toFixed(1) + '%' : '100%';
            ref.last = meta;
          }
        }
      } else if (tab === 1) {
        for (var q = 0; q < rowRefs.length; q++) {
          var u = UPG_BY_ID[rowRefs[q].key.slice(1)];
          if (u) setBtn(rowRefs[q].btn, money(u.cost), S.cash < u.cost);
        }
      } else if (tab === 2) {
        var sb = listEl.querySelector('[data-act="stage"]');
        if (sb) {
          var st = STAGES[S.stage + 1];
          setBtn(sb, 'Move in · ' + money(st.cost), S.cash < st.cost);
          var bar = listEl.querySelector('.si-stbar');
          if (bar) bar.style.width = clamp((S.cash / st.cost) * 100, 0, 100).toFixed(1) + '%';
        }
      } else if (tab === 3) {
        var eb = listEl.querySelector('[data-act="exit"]');
        if (eb) {
          var gain = equityPreview();
          var ok = S.runEarned >= EXIT_GATE && gain >= 1;
          setBtn(eb, ok ? 'Sell for +' + IGAME.fmt(gain) + ' ★' : 'Not ready yet', !ok);
          listEl.querySelector('.si-run').textContent = money(S.runEarned);
          var info = ok
            ? 'Investors are ready. Selling now gives +' + IGAME.fmt(gain) + ' ★ (×' + IGAME.fmt(1 + 0.1 * (S.equity + gain)) + ' revenue next run). Earning more first raises the offer.'
            : 'Buyers get interested once you have earned ' + money(EXIT_GATE) + ' this run.';
          var ie = listEl.querySelector('.si-exitinfo');
          if (ie.textContent !== info) ie.textContent = info;
          listEl.querySelector('.si-exbar').style.width = clamp((S.runEarned / EXIT_GATE) * 100, 0, 100).toFixed(1) + '%';
        }
      }
    }
    function refreshDots() {
      var canHire = false, canUpg = false;
      for (var i = 0; i < HIRES.length; i++) if (hireVisible(i) && S.cash >= hireCost(i, 1)) { canHire = true; break; }
      for (var k = 0; k < UPGRADES.length; k++) {
        var u = UPGRADES[k];
        if (!S.upg[u.id] && upgUnlocked(u) && S.cash >= u.cost) { canUpg = true; break; }
      }
      var canStage = S.stage < STAGES.length - 1 && S.cash >= STAGES[S.stage + 1].cost;
      var canExit = S.runEarned >= EXIT_GATE && equityPreview() >= 1;
      var dots = [canHire, canUpg, canStage, canExit, false];
      for (var t = 0; t < tabBtns.length; t++) tabBtns[t].classList.toggle('has-dot', dots[t] && t !== tab);
    }
    var lastUpgCount = -1, lastVisHires = -1, uiStatsT = 0;
    function refreshUI() {
      elCash.textContent = money(S.cash);
      var rt = curRate();
      elRate.textContent = money(rt) + '/s';
      elEq.textContent = '★ ' + IGAME.fmt(S.equity) + (S.equity ? ' · +' + IGAME.fmt(S.equity * 10) + '%' : '');
      elEq.style.display = S.equity || S.exits ? '' : 'none';
      var gl = goal();
      var gt = '<em>NEXT</em>' + esc(gl.t);
      if (elGoalT._h !== gt) {
        elGoalT.innerHTML = gt;
        elGoalT._h = gt;
      }
      elGoalBar.style.width = clamp(gl.p * 100, 0, 100).toFixed(1) + '%';
      goalAct = gl.tab;
      if (boost.t > 0) {
        elBoost.style.display = 'block';
        elBoost.textContent = 'TRENDING ×' + boost.mult + ' · ' + Math.ceil(boost.t) + 's';
      } else elBoost.style.display = 'none';
      // structural changes → re-render the open list
      var vis = 0;
      for (var i = 0; i < HIRES.length; i++) if (hireVisible(i)) vis++;
      var avail = 0;
      for (var k = 0; k < UPGRADES.length; k++) if (!S.upg[UPGRADES[k].id] && upgUnlocked(UPGRADES[k])) avail++;
      if ((tab === 0 && vis !== lastVisHires) || (tab === 1 && avail !== lastUpgCount)) dirtyList = true;
      lastVisHires = vis;
      lastUpgCount = avail;
      if (tab === 4 && !dirtyList && ++uiStatsT % 8 === 0) {
        // settings: refresh only the stats block (never clobber the save text areas)
        var kvEl = listEl.querySelector('.si-kv');
        if (kvEl) kvEl.innerHTML = statsHtml();
      }
      if (dirtyList) renderList();
      else refreshList(false);
      refreshDots();
    }

    /* ---------------- save export / import (github variant) ---------------- */
    function exportString() {
      S.lastSeen = Date.now();
      try {
        return EXPORT_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      } catch (e) {
        return '';
      }
    }
    function refreshExport() {
      var ta = listEl.querySelector('.si-exp');
      if (ta) ta.value = exportString();
    }
    function copyExport() {
      var ta = listEl.querySelector('.si-exp');
      if (!ta) return;
      ta.value = exportString();
      var done = function () { ui.toast(root, 'Save copied to clipboard'); sfx('pop'); };
      var fallback = function () {
        try {
          ta.focus();
          ta.select();
          document.execCommand('copy');
          done();
        } catch (e) {
          ui.toast(root, 'Select the text and copy it manually');
        }
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback);
        else fallback();
      } catch (e) {
        fallback();
      }
    }
    function importSave() {
      var ta = listEl.querySelector('.si-imp');
      var msg = listEl.querySelector('.si-impmsg');
      var raw = (ta && ta.value ? ta.value : '').trim();
      var parsed = null;
      try {
        if (raw.indexOf(EXPORT_PREFIX) !== 0) throw new Error('prefix');
        parsed = JSON.parse(decodeURIComponent(escape(atob(raw.slice(EXPORT_PREFIX.length)))));
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.hires)) throw new Error('shape');
      } catch (e) {
        if (msg) msg.textContent = 'That doesn’t look like a valid save string.';
        sfx('error');
        return;
      }
      var ov = ui.overlay(root, {
        title: 'Load this save?',
        text: 'Your current company will be replaced by “' + String(parsed.name || 'imported startup').slice(0, 24) + '”.',
        buttons: [
          {
            label: 'Load save',
            primary: true,
            onClick: function () {
              ov.close();
              S = sanitize(parsed);
              S.lastSeen = Date.now();
              S.introDone = true;
              recalc();
              bgDirty = true;
              buildDesks();
              save();
              ui.toast(root, 'Save loaded');
              renderHint();
              sfx('levelup');
              setTab(0);
            },
          },
          { label: 'Cancel', onClick: function () { ov.close(); } },
        ],
      });
    }
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
        text: 'All cash, hires, features, Equity ★ and stats will be deleted.',
        buttons: [
          {
            label: 'Yes, reset',
            primary: true,
            onClick: function () {
              ov.close();
              store.remove('save');
              S = freshState();
              S.introDone = true;
              recalc();
              bgDirty = true;
              buildDesks();
              termLines.length = 0;
              addTerm('$ rm -rf node_modules && git init', '#8b949e');
              boost.t = 0;
              bubble = null;
              parts.length = 0;
              save();
              renderHint();
              setTab(0);
              ui.toast(root, 'Progress reset');
            },
          },
          { label: 'Cancel', onClick: function () { ov.close(); renderList(); } },
        ],
      });
    }

    /* ---------------- input ---------------- */
    function onAppClick(e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t || !app.contains(t)) return;
      var act = t.getAttribute('data-act');
      var forceMax = e.ctrlKey || e.shiftKey || e.metaKey;
      if (act === 'tab') {
        sfx('tick');
        setTab(+t.getAttribute('data-i'));
      } else if (act === 'hire') buyHire(+t.getAttribute('data-i'), forceMax);
      else if (act === 'mode') {
        var m = t.getAttribute('data-m');
        S.buyMode = m === 'max' ? 'max' : +m;
        sfx('tick');
        renderList();
      } else if (act === 'upg') buyUpgrade(t.getAttribute('data-id'));
      else if (act === 'stage') moveOffice();
      else if (act === 'exit') exitCompany();
      else if (act === 'gear') {
        sfx('tick');
        setTab(4);
      } else if (act === 'goal') {
        if (goalAct >= 0) setTab(goalAct);
        sfx('tick');
      } else if (act === 'reset') resetProgress(t);
      else if (act === 'export') {
        refreshExport();
        sfx('tick');
      } else if (act === 'copy') copyExport();
      else if (act === 'import') importSave();
    }
    app.addEventListener('click', onAppClick);

    function onScenePointer(e) {
      if (e.button != null && e.button > 0) return;
      var r = view.canvas.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (bubble && Math.hypot(x - bubble.x, y - bubble.y) < bubble.r * 1.4) {
        collectBubble();
        return;
      }
      doTap(x, y, false);
    }
    view.canvas.addEventListener('pointerdown', onScenePointer);

    ctx.captureKeys(['KeyC', 'KeyB', 'KeyV', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
    ctx.onKey(function (code, down, ev) {
      if (!down) return;
      if (document.querySelector && root.querySelector('.ig-overlay')) return;
      if (code === 'Space' || code === 'KeyC') doTap(null, null, false);
      else if (code === 'KeyB') {
        var modes = [1, 10, 25, 'max'];
        S.buyMode = modes[(modes.indexOf(S.buyMode) + 1) % modes.length];
        ui.toast(root, 'Buy amount: ' + (S.buyMode === 'max' ? 'Max' : '×' + S.buyMode), 900);
        if (tab === 0) renderList();
      } else if (code === 'KeyV') collectBubble();
      else if (/^Digit[1-5]$/.test(code)) setTab(+code.slice(5) - 1);
    });

    /* ---------------- drawing ---------------- */
    function drawDesk(d, t) {
      var u = U * d.s;
      var x = d.x, y = d.y;
      var founder = d.role === -1;
      var dw = u * 2.1, dd = u * 0.5;
      // shadow
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.beginPath();
      g.ellipse(x, y + u * 0.62, dw * 0.58, u * 0.16, 0, 0, TAU);
      g.fill();
      // desk top + front + legs
      g.fillStyle = NIGHT ? '#2a313d' : founder ? '#c98b4e' : '#d9b48a';
      g.beginPath();
      g.moveTo(x - dw / 2 + u * 0.15, y - dd);
      g.lineTo(x + dw / 2 - u * 0.15, y - dd);
      g.lineTo(x + dw / 2, y);
      g.lineTo(x - dw / 2, y);
      g.closePath();
      g.fill();
      g.fillStyle = NIGHT ? '#1c222c' : founder ? '#9b6534' : '#b48a5e';
      g.fillRect(x - dw / 2, y, dw, u * 0.16);
      g.fillRect(x - dw / 2 + u * 0.08, y, u * 0.1, u * 0.6);
      g.fillRect(x + dw / 2 - u * 0.18, y, u * 0.1, u * 0.6);
      // monitor
      var mw = u * 1.15, mh = u * 0.72, mx = x - mw / 2, my = y - dd * 0.55 - mh - u * 0.12;
      g.fillStyle = '#20242c';
      g.fillRect(x - u * 0.06, my + mh, u * 0.12, u * 0.18);
      g.fillRect(x - u * 0.25, y - dd * 0.55 - u * 0.03, u * 0.5, u * 0.06);
      g.fillStyle = '#111318';
      roundRect(g, mx - u * 0.05, my - u * 0.05, mw + u * 0.1, mh + u * 0.1, u * 0.08);
      g.fill();
      g.fillStyle = NIGHT ? '#0d1117' : '#1e2233';
      g.fillRect(mx, my, mw, mh);
      // code lines (scrolling as they "type")
      var lines = 5, lh = mh / (lines + 1);
      var speed = founder ? 1.5 + founderPulse * 6 : 1.2;
      var scroll = (t * speed + d.phase) % 1;
      for (var l = 0; l < lines; l++) {
        var seed = Math.floor(t * speed + d.phase) + l;
        var w = (0.25 + ((seed * 37) % 10) / 14) * (mw * 0.8);
        var indent = ((seed * 13) % 3) * mw * 0.08;
        g.fillStyle = TH.codeColor[(seed + l) % TH.codeColor.length];
        g.globalAlpha = 0.85;
        var ly = my + lh * (l + 0.7) - scroll * lh;
        if (ly > my && ly < my + mh - lh * 0.3) g.fillRect(mx + mw * 0.08 + indent, ly, Math.min(w, mw * 0.84 - indent), Math.max(1, lh * 0.38));
      }
      g.globalAlpha = 1;
      // screen glow
      if (founder) {
        var glow = 0.25 + founderPulse * 0.5;
        g.fillStyle = 'rgba(' + (NIGHT ? '63,185,80' : '125,211,252') + ',' + glow.toFixed(3) + ')';
        g.fillRect(mx, my, mw, mh);
      }
      // person (seen from behind) + chair
      var bob = Math.sin(t * (founder ? 10 + founderPulse * 20 : 6) + d.phase) * u * 0.025;
      var col = founder ? (NIGHT ? '#f78166' : '#8b6cff') : HIRES[d.role].color;
      var py = y + u * 0.05 + bob;
      g.fillStyle = col;
      roundRect(g, x - u * 0.42, py, u * 0.84, u * 0.7, u * 0.3);
      g.fill();
      if (d.role === 7) {
        g.fillStyle = '#cbd5e1';
        roundRect(g, x - u * 0.26, py - u * 0.42, u * 0.52, u * 0.44, u * 0.1);
        g.fill();
        g.fillStyle = '#38bdf8';
        g.fillRect(x - u * 0.03, py - u * 0.62, u * 0.06, u * 0.2);
      } else {
        var hair = founder ? '#2b1a10' : ['#3b2314', '#111827', '#7c2d12', '#fcd34d', '#1f2937'][(d.role + 5) % 5];
        g.fillStyle = hair;
        g.beginPath();
        g.arc(x, py - u * 0.18, u * 0.27, 0, TAU);
        g.fill();
        if (d.role === 8 || d.role === 6) {
          g.strokeStyle = '#e2e8f0';
          g.lineWidth = Math.max(1, u * 0.06);
          g.beginPath();
          g.arc(x, py - u * 0.2, u * 0.3, Math.PI * 1.1, Math.PI * 1.9);
          g.stroke();
        }
      }
      g.fillStyle = NIGHT ? '#0b0e13' : '#2d2f3a';
      roundRect(g, x - u * 0.38, py + u * 0.32, u * 0.76, u * 0.46, u * 0.12);
      g.fill();
      if (founder && S.tut === 0) {
        // pulsing tutorial ring
        var pr = u * (1.25 + 0.15 * Math.sin(t * 5));
        g.strokeStyle = NIGHT ? 'rgba(63,185,80,.85)' : 'rgba(253,224,71,.9)';
        g.lineWidth = Math.max(2, u * 0.08);
        g.beginPath();
        g.ellipse(x, y - u * 0.3, pr * 1.2, pr * 0.9, 0, 0, TAU);
        g.stroke();
      }
    }
    function drawSprint(t) {
      var f = founderPos();
      var u = U * SLOTS[0].s;
      var w = u * 2.2, h = Math.max(4, u * 0.14);
      var x = f.x - w / 2, y = f.y + u * 0.88;
      if (y + h > H - 2) y = H - h - 2;
      g.fillStyle = 'rgba(0,0,0,.45)';
      roundRect(g, x, y, w, h, h / 2);
      g.fill();
      g.fillStyle = NIGHT ? '#3fb950' : '#fde047';
      roundRect(g, x, y, Math.max(h, (w * S.sprint) / SPRINT_TAPS), h, h / 2);
      g.fill();
    }
    function drawBubble(t, dt) {
      if (!bubble) return;
      var b = bubble;
      b.t += dt;
      b.x += b.vx * dt;
      b.y = b.y0 + Math.sin(b.t * 2.2) * U * 0.3;
      if (b.t > b.life || b.x < -50 || b.x > W + 50) {
        bubble = null;
        return;
      }
      var a = Math.min(1, b.t * 3, (b.life - b.t) * 2);
      g.globalAlpha = a;
      var gl = g.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 2);
      gl.addColorStop(0, 'rgba(253,224,71,.55)');
      gl.addColorStop(1, 'rgba(253,224,71,0)');
      g.fillStyle = gl;
      g.fillRect(b.x - b.r * 2, b.y - b.r * 2, b.r * 4, b.r * 4);
      g.fillStyle = '#fde047';
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.fill();
      g.strokeStyle = '#7c2d12';
      g.lineWidth = Math.max(2, b.r * 0.14);
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(b.x - b.r * 0.5, b.y + b.r * 0.3);
      g.lineTo(b.x - b.r * 0.1, b.y - b.r * 0.05);
      g.lineTo(b.x + b.r * 0.12, b.y + b.r * 0.15);
      g.lineTo(b.x + b.r * 0.5, b.y - b.r * 0.35);
      g.stroke();
      g.beginPath();
      g.moveTo(b.x + b.r * 0.22, b.y - b.r * 0.38);
      g.lineTo(b.x + b.r * 0.52, b.y - b.r * 0.38);
      g.lineTo(b.x + b.r * 0.52, b.y - b.r * 0.08);
      g.stroke();
      g.font = '800 ' + Math.max(10, b.r * 0.55) + 'px system-ui,sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillStyle = '#fff';
      g.fillText('Trending!', b.x, b.y + b.r * 1.15);
      g.globalAlpha = 1;
    }
    function drawTerminal() {
      if (!NIGHT) return;
      var fs = Math.max(9, Math.min(U * 0.36, 13));
      var w = Math.min(W * (tall ? 0.6 : 0.46), fs * 34), lh = fs * 1.35;
      var n = tall ? 3 : 6;
      var h = lh * (n + 1) + fs * 0.6;
      var x = W - w - fs, y = tall ? fs * 3.6 : fs * 4.6;
      if (y + h > H * 0.55) return; // not enough room above the desks
      g.fillStyle = 'rgba(1,4,9,.82)';
      roundRect(g, x, y, w, h, fs * 0.5);
      g.fill();
      g.strokeStyle = '#30363d';
      g.lineWidth = 1;
      g.stroke();
      ['#f85149', '#d29922', '#3fb950'].forEach(function (c, i) {
        g.fillStyle = c;
        g.beginPath();
        g.arc(x + fs * (0.9 + i * 0.8), y + fs * 0.75, fs * 0.25, 0, TAU);
        g.fill();
      });
      g.font = '600 ' + fs + 'px ui-monospace,Menlo,Consolas,monospace';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      var start = Math.max(0, termLines.length - n);
      for (var i = start; i < termLines.length; i++) {
        g.fillStyle = termLines[i].c;
        var txt = termLines[i].t;
        var maxC = Math.floor((w - fs) / (fs * 0.62));
        if (txt.length > maxC) txt = txt.slice(0, maxC - 1) + '…';
        g.fillText(txt, x + fs * 0.6, y + fs * 1.4 + (i - start) * lh);
      }
      if (Math.floor(tNow * 2) % 2) {
        g.fillStyle = '#3fb950';
        g.fillRect(x + fs * 0.6, y + fs * 1.4 + Math.min(n, termLines.length - start) * lh, fs * 0.55, fs);
      }
    }
    function drawTicker() {
      if (S.stage < STAGES.length - 1) return;
      var fs = clamp(U * 0.3, 10, 16);
      var y = horizonY() - fs * 1.7;
      g.fillStyle = '#05070c';
      g.fillRect(0, y, W, fs * 1.5);
      g.font = '800 ' + fs + 'px ui-monospace,Menlo,Consolas,monospace';
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      var msg = '  ▲ ' + S.name.toUpperCase() + ' +' + Math.round(100 + (S.runEarned % 900)) + '%   ●   NOW LISTED   ●   ★ ' + IGAME.fmt(equityPreview()) + ' EQUITY OFFER   ●   ';
      var tw = g.measureText(msg).width;
      tickerX = (tickerX + 60 / 60) % tw;
      g.fillStyle = '#34d399';
      for (var x = -tickerX; x < W; x += tw) g.fillText(msg, x, y + fs * 0.78);
    }

    function updateParts(dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'spark' || p.kind === 'glyph') p.vy += 260 * dt;
        else if (p.kind === 'coin') p.vy += 120 * dt;
        else if (p.kind === 'text') p.vy *= 1 - 1.5 * dt;
        p.rot += p.vr * dt;
      }
    }
    function drawParts() {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var k = p.age / p.life;
        var a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        g.globalAlpha = a;
        if (p.kind === 'spark') {
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, TAU);
          g.fill();
        } else if (p.kind === 'conf') {
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.fillStyle = p.color;
          g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          g.restore();
        } else if (p.kind === 'coin') {
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(p.x, p.y, p.size, 0, TAU);
          g.fill();
          g.fillStyle = '#7c4a03';
          g.font = '900 ' + Math.round(p.size * 1.3) + 'px system-ui,sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('$', p.x, p.y + 0.5);
        } else {
          g.font = (p.kind === 'text' ? '900 ' : '700 ') + Math.round(p.size * (p.kind === 'text' ? 1 + 0.2 * easeOut(Math.min(1, k * 4)) : 1)) + 'px ' +
            (TH.mono || p.kind === 'glyph' ? 'ui-monospace,Menlo,Consolas,monospace' : 'system-ui,-apple-system,sans-serif');
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          if (p.kind === 'text') {
            g.lineWidth = 3;
            g.strokeStyle = 'rgba(0,0,0,.55)';
            g.strokeText(p.text, p.x, p.y);
          }
          g.fillStyle = p.color;
          g.fillText(p.text, p.x, p.y);
        }
      }
      g.globalAlpha = 1;
    }

    function render(t, dt) {
      if (!W || !H) return;
      if (bgDirty) renderBg();
      g.save();
      if (shake > 0) g.translate(rand(-1, 1) * shake * U * 0.3, rand(-1, 1) * shake * U * 0.3);
      g.drawImage(bg, 0, 0, W, H);
      drawTicker();
      for (var i = 0; i < desks.length; i++) drawDesk(desks[i], t);
      drawSprint(t);
      drawTerminal();
      drawBubble(t, dt);
      drawParts();
      // boost tint
      if (boost.t > 0) {
        g.fillStyle = 'rgba(253,224,71,' + (0.05 + 0.03 * Math.sin(t * 6)).toFixed(3) + ')';
        g.fillRect(0, 0, W, H);
      }
      g.restore();
    }

    /* ---------------- main loop ---------------- */
    var loop = IGAME.loop(function (dt, t) {
      tNow = t;
      // economy uses real elapsed time so slow devices don't lose income
      var now = performance.now();
      var edt = Math.min(5, Math.max(0, (now - lastEcon) / 1000));
      lastEcon = now;
      var rt = curRate();
      if (rt > 0) earn(rt * edt);
      if (D.rate > S.bestRate) S.bestRate = D.rate;
      if (boost.t > 0) boost.t = Math.max(0, boost.t - edt);
      if (perk('bot')) {
        autoTapAcc += edt * 2;
        while (autoTapAcc >= 1) {
          autoTapAcc -= 1;
          doTap(null, null, true);
        }
      }
      // trending bubble spawner
      if (!bubble && S.tut >= 2) {
        bubbleTimer -= edt * (perk('media') ? 2 : 1);
        if (bubbleTimer <= 0) {
          bubbleTimer = rand(45, 90);
          var fromLeft = Math.random() < 0.5;
          var r = Math.max(14, U * 0.55);
          bubble = { x: fromLeft ? -r : W + r, y0: rand(H * 0.3, H * 0.5), y: 0, vx: (fromLeft ? 1 : -1) * W / rand(8, 11), r: r, t: 0, life: 11 };
        }
      }
      // ambient coin pops from desks (capped)
      deskPopT -= dt;
      if (deskPopT <= 0 && desks.length > 1) {
        deskPopT = rand(0.25, 0.7) * (desks.length > 6 ? 0.6 : 1);
        var d = desks[1 + ((Math.random() * (desks.length - 1)) | 0)];
        spawn('coin', d.x + rand(-U * 0.3, U * 0.3), d.y - U * d.s * 1.4, rand(-15, 15), -70, 0.9, '', Math.max(3, U * d.s * 0.16));
      }
      founderPulse = Math.max(0, founderPulse - dt * 3);
      if (shake > 0) shake = Math.max(0, shake - dt * 1.6);
      updateParts(dt);
      render(t, dt);
      uiTimer -= dt;
      if (uiTimer <= 0) {
        uiTimer = 0.12;
        refreshUI();
      }
    });

    /* ---------------- offline progress ---------------- */
    function applyOffline(seconds, silentIfShort) {
      if (seconds < 2 || D.rate <= 0) return;
      if (silentIfShort && seconds < 60) {
        earn(D.rate * seconds); // tab was only briefly hidden: full credit
        return;
      }
      var capped = Math.min(seconds, OFFLINE_CAP);
      var factor = perk('night') ? 1 : 0.5;
      var amount = D.rate * capped * factor;
      if (amount <= 0) return;
      earn(amount);
      save();
      var ov = ui.overlay(root, {
        title: 'Welcome back!',
        html:
          '<p style="margin:0 0 6px">While you were away for <b>' + IGAME.fmtTime(seconds) + '</b>' + (seconds > OFFLINE_CAP ? ' (8h max)' : '') + ',</p>' +
          '<p style="margin:0;font-size:1.5em;font-weight:900;color:#fde047">' + money(amount) + '</p>' +
          '<p style="margin:6px 0 0">your team earned that at ' + Math.round(factor * 100) + '% speed.</p>',
        buttons: [{ label: 'Collect', primary: true, onClick: function () { ov.close(); sfx('coin'); } }],
      });
    }

    /* ---------------- boot ---------------- */
    recalc();
    buildDesks();
    renderHint();
    setTab(0);
    if (!S.introDone) {
      var intro = ui.overlay(root, {
        title: esc(ctx.title || (variant === 'github' ? 'Garage to Unicorn: Dev Build' : 'Garage to Unicorn')),
        html:
          '<p style="margin:0 0 8px">' + (ctx.isTouch ? 'Tap' : 'Click') + ' your desk' + (ctx.isTouch ? '' : ' (or press <span class="ig-kbd">Space</span>)') + ' to ' + TH.verb + ' and earn cash. Hire a team, ship features, move from a garage to an IPO — then sell the company for permanent Equity.</p>' +
          '<p style="margin:0;font-size:13px;opacity:.8">Progress autosaves. Your team keeps earning while you are away.</p>',
        buttons: [
          {
            label: variant === 'github' ? '$ npm start' : 'Start your startup',
            primary: true,
            onClick: function () {
              intro.close();
              S.introDone = true;
              S.lastSeen = Date.now();
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
    timers.push(saveTimer);
    function onPageHide() { save(); }
    window.addEventListener('pagehide', onPageHide);

    var pausedAt = 0;
    if (ctx.debug) {
      // test hooks (only with ?debug=1)
      root._si = {
        S: function () { return S; },
        give: function (n) { earn(n); },
        D: D,
        offline: function (sec) { S.lastSeen = Date.now() - sec * 1000; applyOffline(sec, false); },
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
        timers.forEach(clearInterval);
        window.removeEventListener('pagehide', onPageHide);
        app.removeEventListener('click', onAppClick);
        view.canvas.removeEventListener('pointerdown', onScenePointer);
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', layout);
        view.destroy();
        if (app.parentNode) app.parentNode.removeChild(app);
        if (style.parentNode) style.parentNode.removeChild(style);
        root.classList.remove('si-root-dev');
      },
    };
  });
})();
