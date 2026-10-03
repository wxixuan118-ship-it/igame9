/*!
 * Idle Questers — igame9 original idle RPG (idle-MMO style).
 * A party of up to four pixel heroes fights monsters, mines ore, chops wood and fishes
 * on its own. Levels give talent points, materials craft gear and camp upgrades, zone
 * bosses open new zones, and a Starfall rebirth trades a run for permanent Star Shards.
 * Progress continues while the page is closed (offline gains measured with Date.now()).
 *
 * Layout: DOM UI (scoped .iq-* classes) + one canvas for the animated scene of the
 * selected hero. Wide frames put the panel on the right; tall frames stack it below.
 */
(function () {
  'use strict';

  /* ================================================================== */
  /* Static data                                                         */
  /* ================================================================== */
  var CLASSES = {
    vanguard: {
      name: 'Vanguard', weapon: 'Sword', dmg: 1, int: 0.9, perk: 'mine',
      role: 'Sturdy sword fighter', perkText: '+25% Mining yield',
      sig: { id: 'sig', name: 'Cleave', text: '+4% chance to strike twice', max: 25 },
    },
    pathfinder: {
      name: 'Pathfinder', weapon: 'Bow', dmg: 0.8, int: 0.7, perk: 'chop',
      role: 'Quick archer', perkText: '+25% Chopping yield',
      sig: { id: 'sig', name: 'Keen Eye', text: '+3% critical hit chance (crits deal ×2.5)', max: 25 },
    },
    arcanist: {
      name: 'Arcanist', weapon: 'Staff', dmg: 1.35, int: 1.15, perk: 'fish',
      role: 'Slow, heavy-hitting mage', perkText: '+25% Fishing yield',
      sig: { id: 'sig', name: 'Insight', text: '+8% XP from everything', max: 50 },
    },
  };
  var CLASS_IDS = ['vanguard', 'pathfinder', 'arcanist'];

  var TALENTS = [
    { id: 'might', name: 'Might', text: '+10% damage', max: 0 },
    { id: 'haste', name: 'Haste', text: '+3% action speed', max: 25 },
    { id: 'fortune', name: 'Fortune', text: '+8% gold & glimmer', max: 0 },
    { id: 'gather', name: 'Gatherer', text: '+10% mining, chopping & fishing yield', max: 0 },
  ];

  var SKILLS = {
    mine: { name: 'Mining', verb: 'Mining', res: 'ore', tool: 'pick' },
    chop: { name: 'Chopping', verb: 'Chopping', res: 'wood', tool: 'axe' },
    fish: { name: 'Fishing', verb: 'Fishing', res: 'fish', tool: 'rod' },
  };
  var ACTS = ['fight', 'mine', 'chop', 'fish'];
  var ACT_LABEL = { fight: 'Fight', mine: 'Mine', chop: 'Chop', fish: 'Fish' };

  var RES = {
    gold: { name: 'Gold', color: '#fcd34d' },
    ore: { name: 'Ore', color: '#a5b4fc' },
    wood: { name: 'Wood', color: '#d6a46b' },
    fish: { name: 'Fish', color: '#7dd3fc' },
    glim: { name: 'Glimmer', color: '#f9a8d4' },
  };
  var RES_IDS = ['gold', 'ore', 'wood', 'fish', 'glim'];

  var TIERS = ['Wooden', 'Copper', 'Iron', 'Steel', 'Silver', 'Mithril', 'Starmetal', 'Voidglass', 'Dawnforged', 'Mythic'];

  var CAMP = [
    { id: 'cook', name: 'Cookfire', text: 'XP for all heroes', per: 0.15, cost: function (c) { return { fish: 20 * Math.pow(2.1, c), wood: 10 * Math.pow(2.1, c) }; } },
    { id: 'forge', name: 'Forge', text: 'damage for all heroes', per: 0.12, cost: function (c) { return { ore: 25 * Math.pow(2.1, c), wood: 15 * Math.pow(2.1, c) }; } },
    { id: 'totem', name: 'Lucky Totem', text: 'gold & glimmer', per: 0.15, cost: function (c) { return { fish: 30 * Math.pow(2.2, c), glim: 5 * Math.pow(2.1, c) }; } },
    { id: 'bench', name: 'Workbench', text: 'gathering yield', per: 0.1, cost: function (c) { return { wood: 30 * Math.pow(2.2, c), ore: 30 * Math.pow(2.2, c) }; } },
  ];

  // Star upgrades bought with Star Shards (kept through rebirth).
  var STARS = [
    { id: 'dmg', name: 'Comet Blade', text: '×1.2 damage', max: 0, cost: function (l) { return Math.ceil(Math.pow(1.35, l)); } },
    { id: 'gold', name: 'Lucky Star', text: '×1.2 gold & glimmer', max: 0, cost: function (l) { return Math.ceil(Math.pow(1.35, l)); } },
    { id: 'xp', name: 'Sage Star', text: '×1.2 hero & skill XP', max: 0, cost: function (l) { return Math.ceil(Math.pow(1.35, l)); } },
    { id: 'gath', name: 'Harvest Moon', text: '×1.2 gathering yield', max: 0, cost: function (l) { return Math.ceil(Math.pow(1.35, l)); } },
    { id: 'speed', name: 'Swift Wind', text: '+5% action speed', max: 10, cost: function (l) { return 2 + 2 * l; } },
    { id: 'dream', name: 'Dreamcatcher', text: '+10% offline efficiency', max: 5, cost: function (l) { return 3 + 3 * l; } },
    { id: 'nap', name: 'Long Nap', text: '+2h offline time cap', max: 4, cost: function (l) { return 4 + 4 * l; } },
    { id: 'friends', name: 'Old Friends', text: 'keep one more hero after rebirth', max: 3, cost: function (l) { return [5, 15, 40][l] || 999; } },
  ];

  var RECRUIT_COST = [0, 40, 2000, 50000];
  var BOSS_HP_MULT = 30;
  var BOSS_TIME = 30;
  var REBIRTH_BOSSES = 4;
  var BASE_OFFLINE_EFF = 0.5;
  var BASE_OFFLINE_CAP = 8 * 3600;
  var RESPAWN = 0.4;
  var GATHER_INT = 2.0;

  var NAMES = ['Bram', 'Lyra', 'Odo', 'Mira', 'Fenn', 'Tova', 'Juno', 'Rook', 'Wren', 'Pip', 'Saro', 'Nell', 'Ivo', 'Kestra', 'Dax', 'Yara', 'Tam', 'Elio'];

  // Zones: monster sprite type + palettes + background theme
  var ZONES = [
    { name: 'Dewdrop Meadow', mon: 'Gloop', boss: 'King Gloop', type: 'blob', pal: { m: '#6ee06a', M: '#3aa04a', w: '#e2ffd8' },
      bg: { s1: '#7cc8ff', s2: '#d8f2ff', h1: '#8fd18b', h2: '#62b864', g1: '#6cc35a', g2: '#8a5a3b', deco: 'trees', sun: '#fff6b0' } },
    { name: 'Bramble Woods', mon: 'Capling', boss: 'Elder Capling', type: 'shroom', pal: { m: '#e5484d', M: '#a8323a', w: '#fff3e0', c: '#f3dfc1', C: '#c9ac88' },
      bg: { s1: '#93c2a0', s2: '#e3f1d8', h1: '#4f8a4a', h2: '#3b6e3b', g1: '#4e8c3e', g2: '#5e3b26', deco: 'bigtrees', sun: '#fffbd0' } },
    { name: 'Sunscorch Dunes', mon: 'Snapclaw', boss: 'Sandlord Snapclaw', type: 'crab', pal: { m: '#f0a35a', M: '#c06a2c', w: '#ffe0b0', c: '#e07b39' },
      bg: { s1: '#ffc477', s2: '#fff0d4', h1: '#ecbd78', h2: '#d9a058', g1: '#f0c987', g2: '#c99a5b', deco: 'cacti', sun: '#fff1a8' } },
    { name: 'Frostpeak Pass', mon: 'Frostgloop', boss: 'Glacier Gloop', type: 'blob', pal: { m: '#9adfff', M: '#4a9bd6', w: '#ffffff' },
      bg: { s1: '#a9ccf5', s2: '#eef6ff', h1: '#dce7f5', h2: '#bccde6', g1: '#f2f7ff', g2: '#9fb3cc', deco: 'pines', sun: '#ffffff' } },
    { name: 'Ember Caverns', mon: 'Cinderwisp', boss: 'Magma Wisp', type: 'wisp', pal: { m: '#ff8a3d', M: '#d1491f', w: '#ffe27a' },
      bg: { s1: '#2b1010', s2: '#7a2e1e', h1: '#4a2020', h2: '#331515', g1: '#5a2c20', g2: '#2d1510', deco: 'lava', sun: '' } },
    { name: 'Coral Depths', mon: 'Reefclaw', boss: 'Tidecrusher', type: 'crab', pal: { m: '#3fd1c0', M: '#22897f', w: '#c8fff7', c: '#ff6fa8' },
      bg: { s1: '#0d3f66', s2: '#3aa3c2', h1: '#1d6f8a', h2: '#155a70', g1: '#e8d2a0', g2: '#b89c66', deco: 'coral', sun: '' } },
    { name: 'Gloomcap Marsh', mon: 'Shadecap', boss: 'Rotking Shadecap', type: 'shroom', pal: { m: '#8a5cd6', M: '#5b3a9c', w: '#e0d0ff', c: '#c9c0e0', C: '#8f86ad' },
      bg: { s1: '#211b36', s2: '#56467a', h1: '#3a3058', h2: '#2a2242', g1: '#4a5a3a', g2: '#2e3624', deco: 'shrooms', sun: '#d8ccff' } },
    { name: 'Starfall Spire', mon: 'Voidwisp', boss: 'The Hollow Star', type: 'wisp', pal: { m: '#7b6cff', M: '#3a2fb0', w: '#e0dcff' },
      bg: { s1: '#07071f', s2: '#2b1e5e', h1: '#1d1748', h2: '#141038', g1: '#3a2e6e', g2: '#1e1840', deco: 'spires', sun: '#f5f0ff' } },
  ];

  /* ================================================================== */
  /* Pixel sprites (palette letters → colors)                            */
  /* ================================================================== */
  var HERO_SPR = {
    vanguard: [
      '.....rr.....', '....rrr.....', '...oooooo...', '..ohwhhhho..', '..ohhhhhho..', '..oHHHHHHo..',
      '..osssssso..', '..ossesseo..', '..osssssso..', '...oSSSSo...', '..obbbbbbo..', '.obbbggbbbo.',
      '.osbbbbbbso.', '..oBBBBBBo..', '..opp..ppo..', '..opp..ppo..', '..off..ffo..', '..ooo..ooo..',
    ],
    pathfinder: [
      '........gg..', '.......gg...', '...oooooo...', '..ohhwhhho..', '..ohhhhhho..', '..ohHHHHho..',
      '..ohssssho..', '..ohsesseo..', '..ohssssho..', '...ohSSho...', '..obbbbbbo..', '.obbgbbbbbo.',
      '.osbbgbbbso.', '..oBBBgBBo..', '..opp..ppo..', '..opp..ppo..', '..off..ffo..', '..ooo..ooo..',
    ],
    arcanist: [
      '.......oo...', '......ohho..', '.....ohhgho.', '....ohhhhho.', '..ooHHHHHHoo', '..osssssso..',
      '..ossesseo..', '..osssssso..', '..owwwwwwo..', '...owwwwo...', '..obbbbbbo..', '.obbbggbbbo.',
      '.osbbbbbbso.', '..oBBBBBBo..', '..oBBBBBBo..', '..oBB..BBo..', '..off..ffo..', '..ooo..ooo..',
    ],
  };
  var HERO_PAL = {
    vanguard: { h: '#c7cfdd', H: '#7d8799', w: '#ffffff', b: '#d64545', B: '#9c2f3a', g: '#f5c542', r: '#e63946' },
    pathfinder: { h: '#3fa34d', H: '#2a6e35', w: '#9be39f', b: '#8a5a3b', B: '#5e3b26', g: '#e8c27a' },
    arcanist: { h: '#6c4ad6', H: '#45309a', w: '#f4f4f4', b: '#3d6fd8', B: '#2a4a9a', g: '#f5c542' },
  };
  var BASE_PAL = { o: '#1b1530', s: '#f4c7a1', S: '#d79f7a', e: '#1b1530', p: '#3a3352', f: '#5b3b2b' };

  var MON_SPR = {
    blob: [
      '................', '......oooo......', '....oommmmoo....', '...ommwwmmmmo...', '..ommwmmmmmmmo..', '..ommmmmmmmmmo..',
      '.ommmmmmmmmmmmo.', '.ommmeemmmeemmo.', '.ommmeemmmeemmo.', '.ommmmmmmmmmmmo.', '.oMmmmmMMmmmmMo.', '..oMMMMMMMMMMo..',
      '...oooooooooo...',
    ],
    shroom: [
      '.....oooooo.....', '...oommwwmmoo...', '..ommmwwwwmmmo..', '.ommwwmmmmmmwwmo', 'ommmmmmmmmmmmmmo', 'oMMMMMMMMMMMMMMo',
      '.oooccccccccooo.', '...occeccecco...', '...occcccccco...', '...oCccccccCo...', '....oCCCCCCo....', '.....oooooo.....',
    ],
    crab: [
      '..oo........oo..', '.occo......occo.', '.occo..ee..occo.', '..oco..oo..oco..', '...oommmmmmoo...', '..ommwwmmmmmmo..',
      '.ommmmmmmmmmmmo.', '.oMmmmmmmmmmmMo.', '..oMMMMMMMMMMo..', '..o.o.o..o.o.o..',
    ],
    wisp: [
      '.......oo.......', '......omo.......', '.....ommo...o...', '....ommmo..omo..', '...ommmmmooommo.', '..ommmwwmmmmmmo.',
      '..ommwwwwmmmmmo.', '.ommwwewwwewmmo.', '.ommwwewwwewmmo.', '.ommmwwwwwwmmmo.', '..ommmmmmmmmmo..', '...oMmmmmmmMo...',
      '....oMMoMMMo....', '.....oo.ooo.....',
    ],
  };

  function makeSprite(rows, pal, flash) {
    var h = rows.length, w = rows[0].length;
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var g = c.getContext('2d');
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ch = rows[y].charAt(x);
        if (ch === '.' || ch === '') continue;
        var col = pal[ch] || BASE_PAL[ch];
        if (!col) continue;
        g.fillStyle = flash || col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  /* ================================================================== */
  /* Small helpers                                                       */
  /* ================================================================== */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function seeded(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Tiny inline SVG icons (same on every OS)
  var ICON = {
    gold: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="#f59e0b"/><circle cx="8" cy="8" r="4.6" fill="#fcd34d"/><rect x="7" y="5" width="2" height="6" rx="1" fill="#f59e0b"/></svg>',
    ore: '<svg viewBox="0 0 16 16"><path d="M8 1.5 14 5.5 12 13H4L2 5.5Z" fill="#6366f1"/><path d="M8 1.5 14 5.5 8 7 2 5.5Z" fill="#a5b4fc"/><path d="M8 7 12 13H4Z" fill="#818cf8"/></svg>',
    wood: '<svg viewBox="0 0 16 16"><rect x="1.5" y="4.5" width="13" height="7" rx="3.5" fill="#92582e"/><ellipse cx="12" cy="8" rx="2.6" ry="3.5" fill="#e3b27a"/><ellipse cx="12" cy="8" rx="1.2" ry="1.7" fill="#b57b45"/></svg>',
    fish: '<svg viewBox="0 0 16 16"><path d="M2 8C4 4 9 3.5 12 8 9 12.5 4 12 2 8Z" fill="#38bdf8"/><path d="M11.5 8 15 4.5V11.5Z" fill="#0ea5e9"/><circle cx="5" cy="7.3" r="1" fill="#0c4a6e"/></svg>',
    glim: '<svg viewBox="0 0 16 16"><path d="M8 1 9.8 6.2 15 8 9.8 9.8 8 15 6.2 9.8 1 8 6.2 6.2Z" fill="#f472b6"/><path d="M8 4.5 8.9 7.1 11.5 8 8.9 8.9 8 11.5 7.1 8.9 4.5 8 7.1 7.1Z" fill="#fce7f3"/></svg>',
    shard: '<svg viewBox="0 0 16 16"><path d="M8 .8 10 6 15.2 6.3 11.1 9.6 12.5 15 8 12 3.5 15 4.9 9.6.8 6.3 6 6Z" fill="#fde68a"/><path d="M8 4 9 7 12 7.2 9.6 9 10.4 12 8 10.3 5.6 12 6.4 9 4 7.2 7 7Z" fill="#fffbeb"/></svg>',
    fight: '<svg viewBox="0 0 16 16"><path d="M13.5 1.5 14.5 2.5 6 11 5 10Z" fill="#e2e8f0"/><path d="M3 9.5 6.5 13 5.5 14 2 10.5Z" fill="#f59e0b"/><path d="M3.5 12.5 1.5 14.5" stroke="#92400e" stroke-width="1.6"/></svg>',
    mine: '<svg viewBox="0 0 16 16"><path d="M2 5C5 1.5 11 1.5 14 5 11 3.6 5 3.6 2 5Z" fill="#cbd5e1"/><rect x="7.2" y="3" width="1.8" height="12" rx=".8" fill="#a16207"/></svg>',
    chop: '<svg viewBox="0 0 16 16"><rect x="7" y="2" width="1.8" height="13" rx=".8" fill="#a16207"/><path d="M8.5 2.5C12 2 14 4 14 7.5 11.5 7 10 7 8.5 7.5Z" fill="#cbd5e1"/></svg>',
    fishAct: '<svg viewBox="0 0 16 16"><path d="M2 15 12 2" stroke="#a16207" stroke-width="1.6"/><path d="M12 2 13.5 9" stroke="#e2e8f0" stroke-width=".8"/><circle cx="13.5" cy="10.5" r="1.6" fill="#ef4444"/></svg>',
    lock: '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="#94a3b8"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="#94a3b8" stroke-width="1.8" fill="none"/></svg>',
    plus: '<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    boss: '<svg viewBox="0 0 16 16"><path d="M2 12 3 4 6 7 8 2.5 10 7 13 4 14 12Z" fill="#fbbf24"/><rect x="2" y="12.5" width="12" height="2" rx="1" fill="#f59e0b"/></svg>',
  };
  var ACT_ICON = { fight: ICON.fight, mine: ICON.mine, chop: ICON.chop, fish: ICON.fishAct };

  var CSS = [
    '.iq-app{position:absolute;inset:0;display:grid;background:#0c0f1f;color:#eef0ff;font-size:var(--iqfs,14px);line-height:1.3;overflow:hidden}',
    '.iq-app.wide{grid-template-columns:minmax(0,1fr) minmax(0,var(--iqside,40%));grid-template-rows:minmax(0,1fr)}',
    '.iq-app.narrow{grid-template-columns:minmax(0,1fr);grid-template-rows:var(--iqscene,44%) auto auto minmax(0,1fr)}',
    '.iq-app svg,.iq-ov svg{width:1.15em;height:1.15em;flex:none;display:inline-block;vertical-align:-0.2em}',
    '.iq-ov .ig-panel{font-size:var(--iqfs,14px)}',
    '.iq-ov .ig-body p{margin:0 0 .6em}',
    '.iq-scene{position:relative;overflow:hidden;min-height:0;cursor:pointer}',
    '.iq-res{position:absolute;left:.5em;right:.5em;top:.5em;display:flex;flex-wrap:wrap;gap:.3em;pointer-events:none;z-index:3}',
    '.iq-pill{display:inline-flex;align-items:center;gap:.3em;font-weight:800;font-size:.9em;color:#fff;background:rgba(8,10,24,.66);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:.18em .6em .18em .4em;white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.iq-pill.bump{animation:iqBump .3s ease}',
    '@keyframes iqBump{40%{transform:scale(1.12)}}',
    '.iq-goal{position:absolute;left:.5em;right:.5em;display:flex;align-items:center;gap:.5em;z-index:3;background:rgba(8,10,24,.72);border:1px solid rgba(255,255,255,.14);border-radius:.8em;padding:.35em .45em .35em .7em;font-size:.88em;pointer-events:auto;cursor:default}',
    '.iq-goal .t{flex:1;min-width:0}',
    '.iq-goal .t b{color:#fde68a}',
    '.iq-goal .bar{height:.32em;border-radius:9px;background:rgba(255,255,255,.12);margin-top:.25em;overflow:hidden}',
    '.iq-goal .bar i{display:block;height:100%;background:linear-gradient(90deg,#fbbf24,#f472b6);border-radius:9px;transition:width .25s}',
    '.iq-boss{position:absolute;left:50%;transform:translateX(-50%);width:min(80%,26em);z-index:3;text-align:center;font-weight:900;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.6);pointer-events:none}',
    '.iq-boss .hp{height:.8em;border-radius:9px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.3);overflow:hidden;margin-top:.2em}',
    '.iq-boss .hp i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f97316)}',
    '.iq-boss .tm{font-size:.8em;opacity:.9;margin-top:.15em}',
    '.iq-party{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.35em;padding:.4em;z-index:3}',
    '.iq-app.wide .iq-party{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(5,6,16,.75) 35%)}',
    '.iq-app.narrow .iq-party{background:#12152b;border-top:1px solid rgba(255,255,255,.08)}',
    '.iq-slot{position:relative;display:flex;align-items:center;gap:.35em;min-width:0;border-radius:.7em;border:1px solid rgba(255,255,255,.14);background:rgba(20,24,52,.92);color:#fff;padding:.3em .35em;cursor:pointer;font:inherit;text-align:left;touch-action:manipulation}',
    '.iq-slot:hover{border-color:rgba(255,255,255,.3)}',
    '.iq-slot.sel{border-color:#fbbf24;box-shadow:0 0 0 1px #fbbf24 inset,0 0 14px rgba(251,191,36,.25)}',
    '.iq-slot canvas{width:2.3em;height:2.3em;image-rendering:pixelated;flex:none;border-radius:.4em;background:rgba(255,255,255,.06)}',
    '.iq-slot .nm{font-weight:800;font-size:.82em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.iq-slot .lv{font-size:.74em;color:#c4c8ea;display:flex;align-items:center;gap:.25em;white-space:nowrap}',
    '.iq-slot .lv svg{width:1em;height:1em}',
    '.iq-slot .xp{position:absolute;left:.5em;right:.5em;bottom:.15em;height:.18em;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}',
    '.iq-slot .xp i{display:block;height:100%;background:#a78bfa}',
    '.iq-slot .dot,.iq-tab .dot{position:absolute;top:.2em;right:.25em;width:.55em;height:.55em;border-radius:50%;background:#f43f5e;box-shadow:0 0 0 2px #12152b;display:none}',
    '.iq-slot.has-dot .dot,.iq-tab.has-dot .dot{display:block}',
    '.iq-slot.locked{justify-content:center;color:#a5abd6;background:rgba(20,24,52,.6);border-style:dashed;flex-direction:column;gap:.1em;font-size:.82em;text-align:center}',
    '.iq-slot.locked.can{color:#fde68a;border-color:#fbbf24;animation:iqGlow 1.6s ease-in-out infinite}',
    '@keyframes iqGlow{50%{box-shadow:0 0 16px rgba(251,191,36,.45)}}',
    '.iq-side{display:flex;flex-direction:column;min-height:0;background:#12152b;border-left:1px solid rgba(255,255,255,.08)}',
    '.iq-app.narrow .iq-side{display:contents}',
    '.iq-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));background:#0e1124;border-bottom:1px solid rgba(255,255,255,.08)}',
    '.iq-tab{position:relative;font:inherit;font-size:.8em;font-weight:800;color:#a5abd6;background:none;border:0;border-bottom:2px solid transparent;padding:.65em .1em;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation}',
    '.iq-tab:hover{color:#fff}',
    '.iq-tab.on{color:#fff;border-bottom-color:#fbbf24;background:rgba(251,191,36,.07)}',
    '.iq-panel{overflow-y:auto;overflow-x:hidden;min-height:0;padding:.6em;touch-action:pan-y;overscroll-behavior:contain;background:#12152b;scrollbar-width:thin;scrollbar-color:#3b4270 transparent}',
    '.iq-h{font-weight:900;font-size:1.05em;margin:.1em 0 .45em;display:flex;align-items:center;gap:.4em;flex-wrap:wrap}',
    '.iq-h small{font-weight:700;color:#a5abd6;font-size:.78em}',
    '.iq-sub{color:#a5abd6;font-size:.84em;margin:-.2em 0 .6em}',
    '.iq-card{background:#1a1e3d;border:1px solid rgba(255,255,255,.08);border-radius:.8em;padding:.55em .65em;margin-bottom:.5em}',
    '.iq-card.dim{opacity:.6}',
    '.iq-row{display:flex;align-items:center;gap:.5em}',
    '.iq-row .grow{flex:1;min-width:0}',
    '.iq-name{font-weight:800}',
    '.iq-desc{color:#a5abd6;font-size:.8em}',
    '.iq-desc b{color:#e0e3ff}',
    '.iq-costs{display:flex;flex-wrap:wrap;gap:.25em .55em;font-size:.8em;margin-top:.2em;font-weight:700;color:#e0e3ff}',
    '.iq-costs span{display:inline-flex;align-items:center;gap:.2em}',
    '.iq-costs span.short{color:#fb7185}',
    '.iq-btn{font:inherit;font-size:.85em;font-weight:800;color:#fff;border:0;border-radius:.6em;padding:.5em .85em;cursor:pointer;background:linear-gradient(135deg,#8b6cff,#2dd4f0);white-space:nowrap;touch-action:manipulation;min-height:2.3em}',
    '.iq-btn.gold{background:linear-gradient(135deg,#f59e0b,#f43f5e)}',
    '.iq-btn.sec{background:#2b3160}',
    '.iq-btn.sm{padding:.3em .6em;min-height:2em;font-size:.8em}',
    '.iq-btn:hover:not([disabled]){filter:brightness(1.1)}',
    '.iq-btn:active:not([disabled]){transform:translateY(1px)}',
    '.iq-btn[disabled]{opacity:.42;cursor:not-allowed;filter:grayscale(.5)}',
    '.iq-acts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.3em;margin:.2em 0 .45em}',
    '.iq-act{font:inherit;font-size:.82em;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:.15em;padding:.45em .1em;border-radius:.6em;border:1px solid rgba(255,255,255,.12);background:#222750;color:#d6d9ff;cursor:pointer;touch-action:manipulation}',
    '.iq-act svg{width:1.4em;height:1.4em}',
    '.iq-act.on{background:linear-gradient(135deg,rgba(139,108,255,.45),rgba(45,212,240,.3));border-color:#8b6cff;color:#fff}',
    '.iq-bar{height:.45em;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:.25em}',
    '.iq-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#8b6cff,#2dd4f0)}',
    '.iq-bar.g i{background:linear-gradient(90deg,#34d399,#a3e635)}',
    '.iq-bar.y i{background:linear-gradient(90deg,#fbbf24,#f472b6)}',
    '.iq-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(7.5em,1fr));gap:.35em;margin-bottom:.5em}',
    '.iq-stat{background:#1a1e3d;border-radius:.6em;padding:.35em .55em;font-size:.82em;color:#a5abd6}',
    '.iq-stat b{display:block;color:#fff;font-size:1.12em;font-variant-numeric:tabular-nums}',
    '.iq-lvl{font-size:.75em;font-weight:800;color:#c4b5fd;background:rgba(139,108,255,.18);border-radius:999px;padding:.05em .5em}',
    '.iq-badge{display:inline-flex;align-items:center;gap:.25em;font-size:.78em;font-weight:800;border-radius:999px;padding:.1em .55em;background:rgba(251,191,36,.16);color:#fde68a}',
    '.iq-toggle{display:flex;align-items:center;justify-content:space-between;gap:.6em;padding:.45em 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.9em}',
    '.iq-classes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5em;margin-top:.4em}',
    '.iq-class{font:inherit;color:#fff;background:#1c2144;border:1px solid rgba(255,255,255,.14);border-radius:.8em;padding:.5em .3em;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:.2em;touch-action:manipulation}',
    '.iq-class:hover,.iq-class:focus-visible{border-color:#fbbf24;outline:none}',
    '.iq-class canvas{width:3.6em;height:5.4em;image-rendering:pixelated}',
    '.iq-class b{font-size:.95em}',
    '.iq-class span{font-size:.72em;color:#a5abd6;line-height:1.25}',
    '.iq-off{text-align:left;margin:.2em 0 .2em;display:grid;gap:.3em}',
    '.iq-off div{display:flex;align-items:center;gap:.45em;font-weight:700;color:#e0e3ff}',
    '.iq-off div b{color:#fde68a}',
    '.iq-kbd{display:inline-block;font:700 .8em ui-monospace,monospace;padding:0 .4em;border-radius:.3em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}',
  ].join('\n');

  /* ================================================================== */
  /* Engine                                                              */
  /* ================================================================== */
  IGAME.register('idle-questers', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;
    var fmt = IGAME.fmt;
    var destroyed = false;
    var timers = [];

    /* ---------------- state ---------------- */
    function freshState() {
      return {
        v: 1, last: Date.now(), intro: false,
        gold: 0, ore: 0, wood: 0, fish: 0, glim: 0,
        heroes: [], sel: 0, frontier: 0, kills: {},
        camp: { cook: 0, forge: 0, totem: 0, bench: 0 },
        shards: 0, stars: { dmg: 0, gold: 0, xp: 0, gath: 0, speed: 0, dream: 0, nap: 0, friends: 0 },
        rebirths: 0, taps: 0,
        st: { kills: 0, bosses: 0, goldAll: 0, play: 0, bestZone: 0, shardsAll: 0, offline: 0 },
        opt: { fx: true, nums: true },
      };
    }
    function newHero(cls, name) {
      return {
        name: name, cls: cls, lvl: 1, xp: 0, tp: 0,
        tal: { might: 0, haste: 0, fortune: 0, gather: 0, sig: 0 },
        act: 'fight', zone: 0,
        sk: { mine: { l: 1, x: 0 }, chop: { l: 1, x: 0 }, fish: { l: 1, x: 0 } },
        gear: { weapon: 0, pick: 0, axe: 0, rod: 0 },
      };
    }
    function loadState() {
      var s = store.get('save', null);
      if (!s || typeof s !== 'object' || !Array.isArray(s.heroes)) return freshState();
      var d = freshState();
      for (var k in d) if (s[k] === undefined) s[k] = d[k];
      ['camp', 'stars', 'st', 'opt'].forEach(function (k) { for (var j in d[k]) if (s[k][j] === undefined) s[k][j] = d[k][j]; });
      s.heroes.forEach(function (h) {
        if (!CLASSES[h.cls]) h.cls = 'vanguard';
        if (ACTS.indexOf(h.act) < 0) h.act = 'fight';
      });
      if (s.sel >= s.heroes.length) s.sel = 0;
      return s;
    }
    var S = loadState();
    function save() {
      S.last = Date.now();
      store.set('save', S);
    }

    // Transient per-hero runtime (not saved): action timer, current monster HP, respawn, anims
    var RT = [];
    function rt(i) {
      if (!RT[i]) RT[i] = { t: 0, mhp: -1, mmax: 1, resp: 0, swing: 9, flash: 9, hurt: 9, die: 9, cast: 0, proj: [] };
      return RT[i];
    }
    function resetRT() { RT = []; }

    /* ---------------- model ---------------- */
    function zoneDef(z) {
      if (z < ZONES.length) return ZONES[z];
      var base = ZONES[z % ZONES.length];
      var bg = { s1: '#140a2b', s2: '#5b21b6', h1: base.bg.h1, h2: base.bg.h2, g1: base.bg.g1, g2: base.bg.g2, deco: base.bg.deco, sun: '#f0abfc' };
      return { name: 'Rift Depth ' + (z - ZONES.length + 1), mon: 'Rift ' + base.mon, boss: 'Rift Warden', type: base.type, pal: base.pal, bg: bg, rift: true };
    }
    function mHP(z) { return 10 * Math.pow(4.6, z); }
    function zGold(z) { return 1.2 * Math.pow(4.4, z); }
    function zXp(z) { return 3 * Math.pow(3.4, z); }
    function killsReq(z) { return 15 + 10 * z; }
    function bossHP(z) { return mHP(z) * BOSS_HP_MULT; }
    function xpNeed(l) { return 8 * Math.pow(1.28, l - 1); }
    function skNeed(l) { return 10 * Math.pow(1.22, l - 1) * (1 + 0.5 * (l - 1)); }

    function speedMult(h) { return (1 + 0.03 * h.tal.haste) * (1 + 0.05 * S.stars.speed); }
    function atkInt(h) { return CLASSES[h.cls].int / speedMult(h); }
    function gatherInt(h) { return GATHER_INT / speedMult(h); }
    function actInt(h) { return h.act === 'fight' ? atkInt(h) : gatherInt(h); }
    function dmgOf(h) {
      return (3 + h.lvl) * CLASSES[h.cls].dmg * Math.pow(1.32, h.gear.weapon) * (1 + 0.1 * h.tal.might) *
        (1 + 0.12 * S.camp.forge) * Math.pow(1.2, S.stars.dmg);
    }
    function critChance(h) { return h.cls === 'pathfinder' ? Math.min(0.75, 0.03 * h.tal.sig) : 0; }
    function dblChance(h) { return h.cls === 'vanguard' ? Math.min(1, 0.04 * h.tal.sig) : 0; }
    function avgHitMult(h) { return (1 + critChance(h) * 1.5) * (1 + dblChance(h)); }
    function xpMult(h) {
      return (1 + 0.15 * S.camp.cook) * Math.pow(1.2, S.stars.xp) * (h && h.cls === 'arcanist' ? 1 + 0.08 * h.tal.sig : 1);
    }
    function goldMult(h) { return (1 + 0.08 * h.tal.fortune) * (1 + 0.15 * S.camp.totem) * Math.pow(1.2, S.stars.gold); }
    function gatherYield(h, sk) {
      return (1 + 0.12 * (h.sk[sk].l - 1)) * Math.pow(1.25, h.gear[SKILLS[sk].tool]) * (1 + 0.1 * h.tal.gather) *
        (CLASSES[h.cls].perk === sk ? 1.25 : 1) * (1 + 0.1 * S.camp.bench) * Math.pow(1.2, S.stars.gath);
    }
    function dps(h) { return (dmgOf(h) * avgHitMult(h)) / atkInt(h); }
    function hitsToKill(h, z) { return Math.max(1, Math.ceil(mHP(z) / (dmgOf(h) * avgHitMult(h)))); }
    // Expected per-second rates (used for offline gains and for the info lines in the UI)
    function rates(h) {
      var r = { gold: 0, xp: 0, glim: 0, kills: 0, res: null, resAmt: 0, skx: 0 };
      if (h.act === 'fight') {
        var z = h.zone;
        var kps = 1 / (hitsToKill(h, z) * atkInt(h) + RESPAWN);
        r.kills = kps;
        r.gold = kps * zGold(z) * goldMult(h);
        r.xp = kps * zXp(z) * xpMult(h);
        r.glim = kps * 0.25 * (1 + z) * goldMult(h);
      } else {
        var sk = h.act, l = h.sk[sk].l;
        var aps = 1 / gatherInt(h);
        r.res = SKILLS[sk].res;
        r.resAmt = aps * gatherYield(h, sk);
        r.skx = aps * (1 + 0.5 * (l - 1)) * xpMult(h);
        r.xp = aps * 1.2 * Math.pow(1.12, l) * xpMult(h);
      }
      return r;
    }
    function offlineEff() { return Math.min(1, BASE_OFFLINE_EFF + 0.1 * S.stars.dream); }
    function offlineCap() { return BASE_OFFLINE_CAP + 2 * 3600 * S.stars.nap; }
    function sumLevels() { var s = 0; S.heroes.forEach(function (h) { s += h.lvl; }); return s; }
    function shardGain() {
      if (S.frontier < REBIRTH_BOSSES) return 0;
      return Math.max(1, Math.floor((sumLevels() / 12) * Math.pow(1.55, S.frontier - 3)));
    }
    function recruitCost() { return RECRUIT_COST[S.heroes.length] || Infinity; }
    function gearCost(h, slot) {
      var w = h.gear[slot];
      if (slot === 'weapon') {
        var c = { gold: 12 * Math.pow(1.95, w) };
        if (w >= 1) c.ore = 4 * Math.pow(1.8, w);
        if (w >= 3) c.glim = 2 * Math.pow(1.75, w - 3);
        return c;
      }
      if (slot === 'pick') return { gold: 10 * Math.pow(2, w), wood: 5 * Math.pow(1.85, w) };
      if (slot === 'axe') return { gold: 10 * Math.pow(2, w), ore: 5 * Math.pow(1.85, w) };
      return { gold: 10 * Math.pow(2, w), wood: 4 * Math.pow(1.85, w) };
    }
    function canPay(c) { for (var k in c) if (S[k] + 1e-9 < c[k]) return false; return true; }
    function pay(c) { for (var k in c) S[k] = Math.max(0, S[k] - c[k]); }
    function gearName(h, slot) {
      var lv = h.gear[slot];
      var tier = TIERS[Math.min(TIERS.length - 1, Math.floor(lv / 4))];
      var item = slot === 'weapon' ? CLASSES[h.cls].weapon : slot === 'pick' ? 'Pickaxe' : slot === 'axe' ? 'Hatchet' : 'Fishing Rod';
      return tier + ' ' + item;
    }

    /* ---------------- gains & events ---------------- */
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
    function addXp(h, amt, live) {
      h.xp += amt;
      var ups = 0;
      while (h.xp >= xpNeed(h.lvl)) {
        h.xp -= xpNeed(h.lvl);
        h.lvl++;
        h.tp++;
        ups++;
      }
      if (ups && live) {
        var i = S.heroes.indexOf(h);
        if (i === S.sel) {
          addFloat(heroX(), groundY - heroH() * 1.25, 'LEVEL ' + h.lvl + '!', '#c4b5fd', 1.25);
          burst(heroX(), groundY - heroH() * 0.6, 16, ['#c4b5fd', '#fde68a', '#ffffff'], 1.2);
        }
        sfx('levelup');
        if (i !== S.sel) toast(esc(h.name) + ' reached Lv ' + h.lvl + ' · +1 talent point');
        dirtyPanel = true;
      }
      return ups;
    }
    function addSkillXp(h, sk, amt, live) {
      var s = h.sk[sk];
      s.x += amt;
      var ups = 0;
      while (s.x >= skNeed(s.l)) { s.x -= skNeed(s.l); s.l++; ups++; }
      if (ups && live) {
        if (S.heroes.indexOf(h) === S.sel) addFloat(heroX(), groundY - heroH() * 1.25, SKILLS[sk].name + ' ' + s.l + '!', '#86efac', 1.1);
        sfx({ f: 880, f2: 1320, d: 0.18, type: 'triangle', v: 0.1 });
        dirtyPanel = true;
      }
    }
    function addGold(n) { S.gold += n; S.st.goldAll += n; }
    function addKill(z, n) {
      if (z === S.frontier) S.kills[z] = (S.kills[z] || 0) + n;
      S.st.kills += n;
    }

    /* ---------------- boss ---------------- */
    var boss = null; // {z, hp, max, time}
    function fighters() { return S.heroes.filter(function (h) { return h.act === 'fight'; }); }
    function bossReady() { return (S.kills[S.frontier] || 0) >= killsReq(S.frontier); }
    function startBoss() {
      if (boss) return;
      if (!bossReady()) { sfx('error'); toast('Defeat more monsters in ' + esc(zoneDef(S.frontier).name) + ' first'); return; }
      if (!fighters().length) { sfx('error'); toast('Set at least one hero to Fight'); return; }
      var z = S.frontier;
      boss = { z: z, hp: bossHP(z), max: bossHP(z), time: BOSS_TIME, intro: 1 };
      var sh = S.heroes[S.sel];
      if (!sh || sh.act !== 'fight') S.sel = S.heroes.indexOf(fighters()[0]);
      RT.forEach(function (r) { if (r) { r.t = 0; r.proj.length = 0; } });
      sfx('boost');
      shake(6);
      dirtyPanel = true;
      refreshParty(true);
    }
    function endBoss(won) {
      var z = boss.z;
      boss = null;
      if (won) {
        S.frontier = Math.max(S.frontier, z + 1);
        S.kills[S.frontier] = S.kills[S.frontier] || 0;
        S.st.bosses++;
        S.st.bestZone = Math.max(S.st.bestZone, S.frontier);
        var g = zGold(z) * 40;
        addGold(g);
        S.glim += 10 * (z + 1);
        fighters().forEach(function (h) { addXp(h, zXp(z) * 20 * xpMult(h), true); });
        sfx('win');
        burst(monX(), groundY - heroH() * 0.8, 40, ['#fde68a', '#fbbf24', '#f472b6', '#ffffff'], 1.8);
        shake(10);
        overlayMsg('Boss defeated!', '<p>' + esc(zoneDef(z).boss) + ' falls. You found <b>' + fmt(g) + ' gold</b> and <b>' + fmt(10 * (z + 1)) + ' glimmer</b>.</p>' +
          '<p>New zone unlocked: <b>' + esc(zoneDef(z + 1).name) + '</b>. Send fighters there from the Map tab when they can handle it — tougher monsters drop more gold and XP.</p>',
          [{ label: 'Travel there now', primary: true, onClick: function () { fighters().forEach(function (h) { h.zone = S.frontier; }); resetFights(); dirtyPanel = true; } }, { label: 'Stay', primary: false }]);
      } else {
        sfx('lose');
        overlayMsg('The boss escaped', '<p>' + esc(zoneDef(z).boss) + ' still had <b>' + Math.ceil((boss ? 0 : lastBossHpPct) * 100) + '%</b> HP left.</p>' +
          '<p>Level up, upgrade weapons (Gear tab) and Forge (Camp tab), or switch more heroes to <b>Fight</b> — every fighter joins the boss battle. Tapping the scene helps too.</p>',
          [{ label: 'OK', primary: true }]);
      }
      resetFights();
      save();
      dirtyPanel = true;
      refreshParty(true);
    }
    var lastBossHpPct = 0;
    function resetFights() { RT.forEach(function (r) { if (r) { r.mhp = -1; r.resp = 0; r.proj.length = 0; } }); }

    /* ---------------- real-time simulation ---------------- */
    function heroAct(i, h) {
      var r = rt(i);
      var sel = i === S.sel;
      if (h.act === 'fight') {
        var target = boss ? 'boss' : 'mob';
        if (!boss && r.mhp <= 0) return; // respawning
        var hits = Math.random() < dblChance(h) ? 2 : 1;
        for (var k = 0; k < hits; k++) {
          var crit = Math.random() < critChance(h);
          var d = dmgOf(h) * (crit ? 2.5 : 1);
          if (sel) {
            r.swing = 0;
            if (h.cls === 'vanguard') applyHit(i, h, d, crit, target, k * 0.08);
            else r.proj.push({ t: 0, d: d, crit: crit, delay: k * 0.1, target: target });
          } else applyHit(i, h, d, crit, target, 0);
        }
      } else {
        var sk = h.act;
        var y = gatherYield(h, sk);
        S[SKILLS[sk].res] += y;
        addSkillXp(h, sk, (1 + 0.5 * (h.sk[sk].l - 1)) * xpMult(h), true);
        addXp(h, 1.2 * Math.pow(1.12, h.sk[sk].l) * xpMult(h), true);
        if (sel) gatherFx(sk, y, true);
      }
    }
    // Damage lands (immediately for melee/background heroes, on projectile arrival for the shown hero)
    function applyHit(i, h, d, crit, target, delay) {
      var r = rt(i);
      var sel = i === S.sel;
      if (target === 'boss') {
        if (!boss) return;
        boss.hp -= d;
        if (sel || !S.heroes[S.sel] || S.heroes[S.sel].act !== 'fight') {
          bossFlash = 0;
          if (S.opt.nums) addFloat(monX() + rand(-20, 20), groundY - monH() * 1.6, fmt(d), crit ? '#fbbf24' : '#ffffff', crit ? 1.25 : 1, delay);
          hitSpark(monX() - monW() * 0.3, groundY - monH() * 0.6);
          if (crit) shake(4);
          sfx({ f: crit ? 240 : 170, f2: 70, d: 0.08, type: 'square', v: 0.06 });
        }
        if (boss.hp <= 0) { lastBossHpPct = 0; endBoss(true); }
        return;
      }
      if (r.mhp <= 0) return;
      r.mhp -= d;
      if (sel) {
        r.hurt = 0;
        if (S.opt.nums) addFloat(monX() + rand(-12, 12), groundY - monH() * 1.35, fmt(d), crit ? '#fbbf24' : '#ffffff', crit ? 1.2 : 0.95, delay);
        hitSpark(monX() - monW() * 0.25, groundY - monH() * 0.55);
        if (crit) shake(3);
        sfx({ f: crit ? 520 : 300, f2: 120, d: 0.06, type: 'square', v: 0.05 });
      }
      if (r.mhp <= 0) killMob(i, h, sel);
    }
    function killMob(i, h, sel) {
      var r = rt(i);
      var z = h.zone;
      var g = zGold(z) * goldMult(h);
      addGold(g);
      addXp(h, zXp(z) * xpMult(h), true);
      var gl = 0;
      if (Math.random() < 0.25) { gl = (1 + z) * goldMult(h); S.glim += gl; }
      addKill(z, 1);
      r.resp = RESPAWN;
      r.die = 0;
      if (sel) {
        burst(monX(), groundY - monH() * 0.5, 14, [zoneDef(z).pal.m, zoneDef(z).pal.M, '#ffffff'], 1);
        coinBurst(monX(), groundY - monH() * 0.6, 5);
        addFloat(monX(), groundY - monH() * 1.7, '+' + fmt(g) + ' gold', '#fcd34d', 1, 0.05);
        if (gl) addFloat(monX() + 20, groundY - monH() * 2.1, '+' + fmt(gl) + ' glimmer', '#f9a8d4', 0.9, 0.2);
        sfx('pop');
        bump('gold');
      }
      if (z === S.frontier && (S.kills[z] || 0) === killsReq(z)) {
        toast('Boss ready in ' + esc(zoneDef(z).name) + '!');
        sfx('match');
        dirtyPanel = true;
      }
    }
    function tick(dt) {
      if (!S.intro) return;
      S.st.play += dt;
      for (var i = 0; i < S.heroes.length; i++) {
        var h = S.heroes[i];
        var r = rt(i);
        if (h.act === 'fight' && !boss) {
          if (r.mhp <= 0) {
            if (r.resp > 0) { r.resp -= dt; continue; }
            r.mmax = mHP(h.zone);
            r.mhp = r.mmax;
            r.die = 9;
          }
        }
        r.t += dt;
        var it = actInt(h);
        var guard = 0;
        while (r.t >= it && guard++ < 5) {
          r.t -= it;
          heroAct(i, h);
          if (h.act === 'fight' && !boss && r.mhp <= 0) { r.t = 0; break; }
        }
      }
      if (boss) {
        boss.time -= dt;
        if (boss.intro > 0) boss.intro -= dt;
        if (boss.time <= 0) { lastBossHpPct = boss.hp / boss.max; endBoss(false); }
      }
    }
    // Player taps the scene: the shown hero's current action jumps ahead.
    var lastTap = 0;
    function tapAction(px, py) {
      if (!S.intro) return;
      var now = performance.now();
      if (now - lastTap < 70) return;
      lastTap = now;
      var h = S.heroes[S.sel];
      if (!h) return;
      var r = rt(S.sel);
      S.taps++;
      if (h.act === 'fight' && !boss && r.mhp <= 0) r.resp = Math.max(0, r.resp - 0.15);
      else r.t += actInt(h) * 0.35;
      if (px != null) tapRing(px, py);
      sfx({ f: 760 + Math.random() * 120, d: 0.035, type: 'triangle', v: 0.05 });
    }

    /* ---------------- offline gains ---------------- */
    function applyOffline(sec, quiet) {
      var cap = offlineCap();
      var capped = sec > cap;
      sec = Math.min(sec, cap);
      if (sec < 1 || !S.intro || !S.heroes.length) return null;
      var eff = offlineEff();
      var before = { gold: S.gold, ore: S.ore, wood: S.wood, fish: S.fish, glim: S.glim, lv: S.heroes.map(function (h) { return h.lvl; }), kills: S.st.kills };
      var chunks = clamp(Math.ceil(sec / 60), 1, 40);
      var dt = (sec / chunks) * eff;
      for (var c = 0; c < chunks; c++) {
        S.heroes.forEach(function (h) {
          var r = rates(h);
          if (h.act === 'fight') {
            addGold(r.gold * dt);
            S.glim += r.glim * dt;
            addKill(h.zone, r.kills * dt);
            addXp(h, r.xp * dt, false);
          } else {
            S[r.res] += r.resAmt * dt;
            addSkillXp(h, h.act, r.skx * dt, false);
            addXp(h, r.xp * dt, false);
          }
        });
      }
      S.st.offline += sec;
      // round kill counter so the boss requirement reads cleanly
      if (S.kills[S.frontier]) S.kills[S.frontier] = Math.floor(S.kills[S.frontier]);
      S.st.kills = Math.floor(S.st.kills);
      var sum = { sec: sec, capped: capped, eff: eff, gains: {}, lv: [] };
      RES_IDS.forEach(function (k) { sum.gains[k] = S[k] - before[k]; });
      S.heroes.forEach(function (h, i) { if (h.lvl > before.lv[i]) sum.lv.push([h.name, before.lv[i], h.lvl]); });
      sum.kills = S.st.kills - before.kills;
      dirtyPanel = true;
      if (!quiet) showOffline(sum);
      return sum;
    }
    function showOffline(sum) {
      var rows = '';
      RES_IDS.forEach(function (k) {
        if (sum.gains[k] >= 1) rows += '<div>' + ICON[k] + '<span>+<b>' + fmt(sum.gains[k]) + '</b> ' + RES[k].name.toLowerCase() + '</span></div>';
      });
      if (sum.kills >= 1) rows += '<div>' + ICON.fight + '<span><b>' + fmt(sum.kills) + '</b> monsters defeated</span></div>';
      sum.lv.forEach(function (l) { rows += '<div>' + ICON.plus + '<span>' + esc(l[0]) + ': Lv ' + l[1] + ' → <b>' + l[2] + '</b></span></div>'; });
      if (!rows) rows = '<div>Your heroes were just getting started.</div>';
      overlayMsg('While you were away…',
        '<p>Your party kept questing for <b>' + IGAME.fmtTime(sum.sec) + '</b> at ' + Math.round(sum.eff * 100) + '% efficiency' +
          (sum.capped ? ' (offline time is capped at ' + Math.round(offlineCap() / 3600) + 'h)' : '') + '.</p><div class="iq-off">' + rows + '</div>',
        [{ label: 'Collect', primary: true, onClick: function () { sfx('coin'); coinBurst(W * 0.5, H * 0.5, 14); } }]);
    }

    /* ---------------- DOM ---------------- */
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    root.appendChild(styleEl);

    var app = ui.el('div', 'iq-app wide');
    var scene = ui.el('div', 'iq-scene');
    var resBar = ui.el('div', 'iq-res');
    var goalEl = ui.el('div', 'iq-goal');
    var bossEl = ui.el('div', 'iq-boss');
    var party = ui.el('div', 'iq-party');
    var side = ui.el('div', 'iq-side');
    var tabsEl = ui.el('div', 'iq-tabs');
    var panel = ui.el('div', 'iq-panel');
    scene.appendChild(resBar);
    scene.appendChild(goalEl);
    scene.appendChild(bossEl);
    side.appendChild(tabsEl);
    side.appendChild(panel);
    app.appendChild(scene);
    app.appendChild(side);
    root.appendChild(app);
    bossEl.style.display = 'none';

    var pills = {};
    RES_IDS.forEach(function (k) {
      var p = ui.el('span', 'iq-pill', ICON[k] + '<span>0</span>');
      p.title = RES[k].name;
      pills[k] = { el: p, txt: p.lastChild, shown: -1 };
      resBar.appendChild(p);
    });
    function bump(k) {
      var p = pills[k];
      if (!p || !S.opt.fx) return;
      p.el.classList.remove('bump');
      void p.el.offsetWidth;
      p.el.classList.add('bump');
    }

    goalEl.innerHTML = '<div class="t"><div class="gt"></div><div class="bar"><i></i></div></div>';
    var goalText = goalEl.querySelector('.gt');
    var goalBar = goalEl.querySelector('.bar');
    var goalFill = goalEl.querySelector('.bar i');
    var goalBtn = ui.el('button', 'iq-btn sm gold', '');
    goalBtn.type = 'button';
    goalEl.appendChild(goalBtn);
    var goalAction = null;
    goalBtn.addEventListener('click', function (e) { e.stopPropagation(); if (goalAction) { sfx('click'); goalAction(); } });
    goalEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

    /* ---- tabs ---- */
    var TABS = [
      { id: 'hero', label: 'Hero' },
      { id: 'gear', label: 'Gear' },
      { id: 'camp', label: 'Camp' },
      { id: 'map', label: 'Map' },
      { id: 'star', label: 'Rebirth' },
      { id: 'more', label: '⚙ More' },
    ];
    var tab = store.get('tab', 'hero');
    if (!TABS.some(function (t) { return t.id === tab; })) tab = 'hero';
    var tabBtns = {};
    TABS.forEach(function (t) {
      var b = ui.el('button', 'iq-tab', esc(t.label) + '<span class="dot"></span>');
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

    /* ---- party bar ---- */
    var slotEls = [];
    for (var si = 0; si < 4; si++) {
      (function (i) {
        var b = ui.el('button', 'iq-slot', '');
        b.type = 'button';
        b.addEventListener('click', function () { clickSlot(i); });
        party.appendChild(b);
        slotEls.push({ el: b, key: '' });
      })(si);
    }
    // Arrows/orbs still in flight land instantly when the camera switches to another hero.
    function selectHero(i) {
      var r = RT[S.sel], h = S.heroes[S.sel];
      if (r && h && i !== S.sel) {
        var pending = r.proj.splice(0);
        pending.forEach(function (pr) { applyHit(S.sel, h, pr.d, pr.crit, pr.target, 0); });
      }
      S.sel = i;
    }
    function clickSlot(i) {
      if (i < S.heroes.length) {
        selectHero(i);
        sfx('click');
        refreshParty(true);
        renderPanel();
        return;
      }
      if (i !== S.heroes.length) { sfx('error'); toast('Recruit heroes in order'); return; }
      var c = recruitCost();
      if (S.gold < c) { sfx('error'); toast('Recruiting costs ' + fmt(c) + ' gold'); return; }
      sfx('click');
      chooseClass(function (cls) {
        if (S.gold < c) return;
        S.gold -= c;
        var h = newHero(cls, pickName());
        h.act = S.heroes.length === 1 ? 'mine' : S.heroes.length === 2 ? 'chop' : 'fish';
        S.heroes.push(h);
        selectHero(S.heroes.length - 1);
        sfx('buy');
        toast(esc(h.name) + ' the ' + CLASSES[cls].name + ' joined! Set to ' + ACT_LABEL[h.act]);
        save();
        refreshParty(true);
        setTab('hero');
      }, 'Recruit hero #' + (S.heroes.length + 1), 'Pick a class. You can change what they do at any time.');
    }
    function pickName() {
      var used = S.heroes.map(function (h) { return h.name; });
      var pool = NAMES.filter(function (n) { return used.indexOf(n) < 0; });
      return pool[Math.floor(Math.random() * pool.length)] || 'Hero';
    }
    // Portrait cache per class
    var spriteCache = {};
    function heroSprite(cls, flash) {
      var k = cls + (flash ? '!' : '');
      if (!spriteCache[k]) spriteCache[k] = makeSprite(HERO_SPR[cls], HERO_PAL[cls], flash ? '#ffffff' : null);
      return spriteCache[k];
    }
    function monSprite(z, flash) {
      var d = zoneDef(z);
      var k = 'm' + (z % ZONES.length) + d.type + (flash ? '!' : '');
      if (!spriteCache[k]) spriteCache[k] = makeSprite(MON_SPR[d.type], d.pal, flash ? '#ffffff' : null);
      return spriteCache[k];
    }
    function portrait(cls, cssW, cssH, full) {
      var c = document.createElement('canvas');
      var spr = heroSprite(cls);
      var rows = full ? spr.height : 11;
      c.width = spr.width * 4;
      c.height = rows * 4;
      var g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(spr, 0, 0, spr.width, rows, 0, 0, spr.width * 4, rows * 4);
      return c;
    }
    function refreshParty(full) {
      for (var i = 0; i < 4; i++) {
        var s = slotEls[i];
        var h = S.heroes[i];
        var key = h ? 'h' + h.cls + h.name : i === S.heroes.length ? 'r' : 'l';
        if (full || key !== s.key) {
          s.key = key;
          s.el.className = 'iq-slot';
          s.el.innerHTML = '';
          if (h) {
            s.el.appendChild(portrait(h.cls));
            var info = ui.el('div', '', '<div class="nm"></div><div class="lv"></div>');
            info.style.minWidth = '0';
            s.el.appendChild(info);
            s.el.appendChild(ui.el('div', 'xp', '<i></i>'));
            s.el.appendChild(ui.el('span', 'dot', ''));
            s.nm = info.firstChild;
            s.lv = info.lastChild;
            s.xp = s.el.querySelector('.xp i');
            s.nm.textContent = h.name;
            s.el.setAttribute('aria-label', h.name + ', ' + CLASSES[h.cls].name);
          } else if (i === S.heroes.length) {
            s.el.classList.add('locked');
            s.el.innerHTML = '<span>' + ICON.plus + ' Recruit</span><span class="rc"></span>';
            s.rc = s.el.querySelector('.rc');
            s.el.setAttribute('aria-label', 'Recruit a hero');
          } else {
            s.el.classList.add('locked');
            s.el.innerHTML = ICON.lock;
            s.el.setAttribute('aria-label', 'Locked slot');
          }
          s.lvKey = '';
        }
        if (h) {
          s.el.classList.toggle('sel', i === S.sel);
          s.el.classList.toggle('has-dot', h.tp > 0);
          var lk = h.lvl + h.act + (boss && h.act === 'fight' ? 'B' : '');
          if (lk !== s.lvKey) {
            s.lvKey = lk;
            s.lv.innerHTML = ACT_ICON[h.act] + '<span>Lv ' + h.lvl + '</span>';
          }
          s.xp.style.width = Math.min(100, (h.xp / xpNeed(h.lvl)) * 100) + '%';
        } else if (i === S.heroes.length) {
          var c = recruitCost();
          s.el.classList.toggle('can', S.gold >= c);
          var txt = fmt(c) + ' gold';
          if (s.rc.textContent !== txt) s.rc.textContent = txt;
        }
      }
    }

    /* ---- panel rendering: build once per change, cheap updaters in between ---- */
    var updaters = [];
    var dirtyPanel = false;
    function renderPanel() {
      var st = panel.scrollTop;
      panel.innerHTML = '';
      updaters = [];
      var f = PANELS[tab];
      if (f) f(panel);
      panel.scrollTop = st;
      updatePanel();
      dirtyPanel = false;
    }
    function updatePanel() { for (var i = 0; i < updaters.length; i++) updaters[i](); }
    function el(tag, cls, html, parent) { var n = ui.el(tag, cls, html); if (parent) parent.appendChild(n); return n; }
    function button(label, cls, onClick, parent, enabled) {
      var b = el('button', 'iq-btn' + (cls ? ' ' + cls : ''), label, parent);
      b.type = 'button';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (b.disabled) return;
        onClick();
      });
      if (enabled) {
        var upd = function () { var en = !!enabled(); if (b.disabled === en) b.disabled = !en; };
        upd();
        updaters.push(upd);
      }
      return b;
    }
    function costs(c, parent) {
      var wrap = el('div', 'iq-costs', '', parent);
      var spans = [];
      for (var k in c) {
        if (!(c[k] > 0)) continue;
        var sp = el('span', '', ICON[k] + fmt(c[k]), wrap);
        spans.push([sp, k, c[k]]);
      }
      updaters.push(function () { spans.forEach(function (s) { s[0].classList.toggle('short', S[s[1]] + 1e-9 < s[2]); }); });
      return wrap;
    }
    function bar(parent, cls, fn) {
      var b = el('div', 'iq-bar' + (cls ? ' ' + cls : ''), '<i></i>', parent);
      var i = b.firstChild;
      var upd = function () { i.style.width = clamp(fn() * 100, 0, 100).toFixed(1) + '%'; };
      upd();
      updaters.push(upd);
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
    function afterBuy() { sfx('buy'); save(); renderPanel(); refreshParty(); updateHud(); }

    var PANELS = {
      hero: function (p) {
        var h = S.heroes[S.sel];
        if (!h) return;
        var c = CLASSES[h.cls];
        var head = el('div', 'iq-row', '', p);
        head.style.marginBottom = '.4em';
        var pc = portrait(h.cls);
        pc.style.cssText = 'width:2.8em;height:2.6em;image-rendering:pixelated;border-radius:.5em;background:rgba(255,255,255,.06)';
        head.appendChild(pc);
        var hd = el('div', 'grow', '', head);
        el('div', 'iq-h', esc(h.name) + ' <small>' + c.name + ' · ' + esc(c.role) + '</small>', hd).style.margin = '0';
        live(hd, 'div', 'iq-desc', function () { return 'Level <b>' + h.lvl + '</b> · XP ' + fmt(h.xp) + ' / ' + fmt(xpNeed(h.lvl)); });
        bar(hd, '', function () { return h.xp / xpNeed(h.lvl); });

        el('div', 'iq-desc', 'Activity', p).style.marginTop = '.2em';
        var acts = el('div', 'iq-acts', '', p);
        ACTS.forEach(function (a) {
          var b = el('button', 'iq-act' + (h.act === a ? ' on' : ''), ACT_ICON[a] + '<span>' + ACT_LABEL[a] + '</span>', acts);
          b.type = 'button';
          b.addEventListener('click', function () {
            if (h.act === a) return;
            if (boss && h.act === 'fight' && fighters().length === 1) { sfx('error'); toast('Your last fighter can’t leave a boss battle'); return; }
            h.act = a;
            var r = rt(S.sel);
            r.t = 0; r.mhp = -1; r.resp = 0; r.proj.length = 0;
            sfx('click');
            save();
            renderPanel();
            refreshParty();
          });
        });
        live(p, 'div', 'iq-card', function () {
          var r = rates(h);
          if (h.act === 'fight') {
            var z = h.zone, zd = zoneDef(z);
            return '<div class="iq-desc">' + (boss ? 'Fighting the boss <b>' + esc(zoneDef(boss.z).boss) + '</b>' : 'Fighting <b>' + esc(zd.mon) + 's</b> in <b>' + esc(zd.name) + '</b>') +
              '</div><div class="iq-costs"><span>' + ICON.gold + fmt(r.gold) + '/s</span><span>XP ' + fmt(r.xp) + '/s</span><span>' + ICON.glim + fmt(r.glim) + '/s</span></div>' +
              '<div class="iq-desc" style="margin-top:.2em">Damage <b>' + fmt(dmgOf(h)) + '</b> · ' + (1 / atkInt(h)).toFixed(2) + ' hits/s' +
              (critChance(h) ? ' · crit ' + Math.round(critChance(h) * 100) + '%' : '') + (dblChance(h) ? ' · double ' + Math.round(dblChance(h) * 100) + '%' : '') +
              ' · ' + hitsToKill(h, z) + (hitsToKill(h, z) === 1 ? ' hit' : ' hits') + ' per kill</div>';
          }
          var sk = SKILLS[h.act];
          return '<div class="iq-desc">' + sk.verb + ' (Lv <b>' + h.sk[h.act].l + '</b>)' + (c.perk === h.act ? ' · <b>class bonus +25%</b>' : '') +
            '</div><div class="iq-costs"><span>' + ICON[sk.res] + fmt(r.resAmt) + '/s</span><span>XP ' + fmt(r.xp) + '/s</span><span>' + (gatherInt(h)).toFixed(2) + 's per swing</span></div>';
        });

        el('div', 'iq-desc', 'Skills', p).style.marginTop = '.3em';
        var sks = el('div', 'iq-stats', '', p);
        ['mine', 'chop', 'fish'].forEach(function (k) {
          var s = el('div', 'iq-stat', '', sks);
          live(s, 'div', '', function () { return SKILLS[k].name + '<b>Lv ' + h.sk[k].l + '</b>'; });
          bar(s, 'g', function () { return h.sk[k].x / skNeed(h.sk[k].l); });
        });

        var th = el('div', 'iq-h', 'Talents ', p);
        th.style.marginTop = '.4em';
        live(th, 'span', 'iq-badge', function () { return h.tp + ' point' + (h.tp === 1 ? '' : 's'); });
        var list = TALENTS.concat([c.sig]);
        list.forEach(function (t) {
          var card = el('div', 'iq-card', '', p);
          var row = el('div', 'iq-row', '', card);
          var g = el('div', 'grow', '', row);
          el('div', 'iq-name', esc(t.name) + ' <span class="iq-lvl">Lv ' + h.tal[t.id] + (t.max ? ' / ' + t.max : '') + '</span>', g);
          el('div', 'iq-desc', esc(t.text) + ' per level' + (t === c.sig ? ' · <b>' + c.name + ' only</b>' : ''), g);
          button(ICON.plus, 'sm', function () {
            if (h.tp <= 0 || (t.max && h.tal[t.id] >= t.max)) return;
            h.tp--;
            h.tal[t.id]++;
            afterBuy();
          }, row, function () { return h.tp > 0 && !(t.max && h.tal[t.id] >= t.max); }).setAttribute('aria-label', 'Raise ' + t.name);
        });
        var spent = 0;
        for (var k in h.tal) spent += h.tal[k];
        if (spent > 0) {
          button('Refund all talent points', 'sec sm', function () {
            for (var k in h.tal) { h.tp += h.tal[k]; h.tal[k] = 0; }
            sfx('click');
            save();
            renderPanel();
            refreshParty();
          }, p);
        }
      },

      gear: function (p) {
        var h = S.heroes[S.sel];
        if (!h) return;
        el('div', 'iq-h', esc(h.name) + '’s gear <small>Craft upgrades from materials</small>', p);
        [
          ['weapon', ICON.fight, 'Damage', function (l) { return '×' + fmt(Math.pow(1.32, l), 2); }],
          ['pick', ICON.mine, 'Mining yield', function (l) { return '×' + fmt(Math.pow(1.25, l), 2); }],
          ['axe', ICON.chop, 'Chopping yield', function (l) { return '×' + fmt(Math.pow(1.25, l), 2); }],
          ['rod', ICON.fishAct, 'Fishing yield', function (l) { return '×' + fmt(Math.pow(1.25, l), 2); }],
        ].forEach(function (g) {
          var slot = g[0];
          var lv = h.gear[slot];
          var used = (slot === 'weapon' && h.act === 'fight') || (SKILLS[h.act] && SKILLS[h.act].tool === slot);
          var card = el('div', 'iq-card', '', p);
          var row = el('div', 'iq-row', '', card);
          el('span', '', g[1], row).style.fontSize = '1.4em';
          var info = el('div', 'grow', '', row);
          el('div', 'iq-name', esc(gearName(h, slot)) + ' <span class="iq-lvl">+' + lv + '</span>' + (used ? ' <span class="iq-badge">in use</span>' : ''), info);
          el('div', 'iq-desc', g[2] + ' <b>' + g[3](lv) + '</b> → <b>' + g[3](lv + 1) + '</b>', info);
          var c = gearCost(h, slot);
          costs(c, info);
          button('Upgrade', '', function () {
            var cc = gearCost(h, slot);
            if (!canPay(cc)) { sfx('error'); return; }
            pay(cc);
            h.gear[slot]++;
            if (S.sel === S.heroes.indexOf(h)) burst(heroX(), groundY - heroH() * 0.5, 12, ['#fde68a', '#ffffff', '#a5b4fc'], 1);
            afterBuy();
          }, row, function () { return canPay(gearCost(h, slot)); });
        });
        el('div', 'iq-sub', 'Weapons need ore (and glimmer from Lv 3). Pickaxes and rods need wood, hatchets need ore — keep a gatherer on each skill.', p).style.marginTop = '.4em';
      },

      camp: function (p) {
        el('div', 'iq-h', 'Camp <small>Upgrades for the whole party</small>', p);
        CAMP.forEach(function (cdef) {
          var lv = S.camp[cdef.id];
          var card = el('div', 'iq-card', '', p);
          var row = el('div', 'iq-row', '', card);
          var info = el('div', 'grow', '', row);
          el('div', 'iq-name', esc(cdef.name) + ' <span class="iq-lvl">Lv ' + lv + '</span>', info);
          el('div', 'iq-desc', '+' + Math.round(cdef.per * 100 * lv) + '% → <b>+' + Math.round(cdef.per * 100 * (lv + 1)) + '%</b> ' + esc(cdef.text), info);
          costs(cdef.cost(lv), info);
          button(lv ? 'Upgrade' : 'Build', '', function () {
            var c = cdef.cost(S.camp[cdef.id]);
            if (!canPay(c)) { sfx('error'); return; }
            pay(c);
            S.camp[cdef.id]++;
            afterBuy();
          }, row, function () { return canPay(cdef.cost(S.camp[cdef.id])); });
        });
        el('div', 'iq-sub', 'Fish comes from fishing, wood from chopping, ore from mining and glimmer drops from monsters.', p).style.marginTop = '.4em';
      },

      map: function (p) {
        var h = S.heroes[S.sel];
        el('div', 'iq-h', 'World map <small>' + (h ? 'Choose where ' + esc(h.name) + ' fights' : '') + '</small>', p);
        for (var z = S.frontier + 1; z >= 0; z--) {
          (function (z) {
            var zd = zoneDef(z);
            var locked = z > S.frontier;
            var card = el('div', 'iq-card' + (locked ? ' dim' : ''), '', p);
            var row = el('div', 'iq-row', '', card);
            var cv = document.createElement('canvas');
            var spr = monSprite(z);
            cv.width = spr.width; cv.height = spr.height;
            cv.getContext('2d').drawImage(spr, 0, 0);
            cv.style.cssText = 'width:2.4em;height:' + (2.4 * spr.height / spr.width).toFixed(2) + 'em;image-rendering:pixelated;flex:none';
            row.appendChild(cv);
            var info = el('div', 'grow', '', row);
            el('div', 'iq-name', (z + 1) + '. ' + esc(zd.name), info);
            if (locked) {
              el('div', 'iq-desc', ICON.lock + ' Defeat <b>' + esc(zoneDef(z - 1).boss) + '</b> to unlock', info);
              return;
            }
            var here = S.heroes.filter(function (x) { return x.act === 'fight' && x.zone === z; }).map(function (x) { return esc(x.name); });
            el('div', 'iq-desc', esc(zd.mon) + ' · HP ' + fmt(mHP(z)) + ' · ' + ICON.gold + fmt(zGold(z)) + ' · XP ' + fmt(zXp(z)) +
              (h && h.act === 'fight' ? ' · ' + hitsToKill(h, z) + (hitsToKill(h, z) === 1 ? ' hit' : ' hits') + ' for ' + esc(h.name) : '') + (here.length ? '<br>Fighting here: <b>' + here.join(', ') + '</b>' : ''), info);
            if (z === S.frontier) {
              live(info, 'div', 'iq-desc', function () {
                return ICON.boss + ' Boss <b>' + esc(zd.boss) + '</b> · HP ' + fmt(bossHP(z)) + ' · ' + BOSS_TIME + 's · kills ' + Math.min(killsReq(z), Math.floor(S.kills[z] || 0)) + '/' + killsReq(z);
              });
              bar(info, 'y', function () { return (S.kills[z] || 0) / killsReq(z); });
            } else el('div', 'iq-desc', ICON.boss + ' Boss defeated', info);
            var btns = el('div', '', '', row);
            btns.style.cssText = 'display:flex;flex-direction:column;gap:.3em';
            if (h) {
              var isHere = h.act === 'fight' && h.zone === z;
              button(isHere ? 'Here' : 'Fight here', 'sm' + (isHere ? ' sec' : ''), function () {
                if (boss) { sfx('error'); toast('Finish the boss battle first'); return; }
                h.act = 'fight';
                h.zone = z;
                var r = rt(S.sel);
                r.mhp = -1; r.resp = 0; r.t = 0;
                sfx('click');
                save();
                renderPanel();
                refreshParty();
              }, btns, function () { return !isHere; });
            }
            if (z === S.frontier) {
              button(boss ? 'Fighting…' : 'Boss', 'sm gold', function () { startBoss(); }, btns, function () { return !boss && bossReady() && fighters().length > 0; });
            }
          })(z);
        }
      },

      star: function (p) {
        el('div', 'iq-h', ICON.shard + ' Starfall rebirth', p);
        el('div', 'iq-sub', 'Start a new adventure with permanent Star Shards. Heroes, gold, materials, gear, camp and zones reset; Star upgrades and stats stay.', p);
        var st = el('div', 'iq-stats', '', p);
        live(st, 'div', 'iq-stat', function () { return 'Star Shards<b>' + fmt(S.shards) + '</b>'; });
        live(st, 'div', 'iq-stat', function () { return 'Rebirth reward<b>+' + fmt(shardGain()) + '</b>'; });
        live(st, 'div', 'iq-stat', function () { return 'Rebirths<b>' + S.rebirths + '</b>'; });
        var card = el('div', 'iq-card', '', p);
        live(card, 'div', 'iq-desc', function () {
          if (S.frontier < REBIRTH_BOSSES) return 'Unlocks after defeating <b>' + REBIRTH_BOSSES + ' zone bosses</b> (' + S.frontier + '/' + REBIRTH_BOSSES + ').';
          return 'Reward grows with total hero levels (<b>' + sumLevels() + '</b>) and ×1.55 for every extra boss beaten. Pushing one more zone often beats rebirthing early.';
        });
        var rb = button('Rebirth now', 'gold', function () { confirmRebirth(); }, card, function () { return S.frontier >= REBIRTH_BOSSES && !boss; });
        rb.style.marginTop = '.45em';
        el('div', 'iq-h', 'Star upgrades', p).style.marginTop = '.5em';
        STARS.forEach(function (sd) {
          var lv = S.stars[sd.id];
          var maxed = sd.max && lv >= sd.max;
          var c = el('div', 'iq-card', '', p);
          var row = el('div', 'iq-row', '', c);
          var info = el('div', 'grow', '', row);
          el('div', 'iq-name', esc(sd.name) + ' <span class="iq-lvl">Lv ' + lv + (sd.max ? ' / ' + sd.max : '') + '</span>', info);
          el('div', 'iq-desc', esc(sd.text) + ' per level' + (maxed ? '' : ' · cost ' + ICON.shard + ' <b>' + sd.cost(lv) + '</b>'), info);
          button(maxed ? 'Max' : 'Buy', 'sm', function () {
            var cost = sd.cost(S.stars[sd.id]);
            if (S.shards < cost || (sd.max && S.stars[sd.id] >= sd.max)) return;
            S.shards -= cost;
            S.stars[sd.id]++;
            afterBuy();
          }, row, function () { return !maxed && S.shards >= sd.cost(S.stars[sd.id]); });
        });
      },

      more: function (p) {
        el('div', 'iq-h', 'Stats', p);
        var st = el('div', 'iq-stats', '', p);
        [
          ['Play time', function () { return IGAME.fmtTime(S.st.play); }],
          ['Offline time', function () { return IGAME.fmtTime(S.st.offline); }],
          ['Monsters', function () { return fmt(S.st.kills); }],
          ['Bosses', function () { return fmt(S.st.bosses); }],
          ['Gold earned', function () { return fmt(S.st.goldAll); }],
          ['Best zone', function () { return String(S.st.bestZone + 1); }],
          ['Rebirths', function () { return String(S.rebirths); }],
          ['Shards earned', function () { return fmt(S.st.shardsAll); }],
          ['Offline rate', function () { return Math.round(offlineEff() * 100) + '% · ' + Math.round(offlineCap() / 3600) + 'h'; }],
        ].forEach(function (s) { live(st, 'div', 'iq-stat', function () { return s[0] + '<b>' + s[1]() + '</b>'; }); });
        el('div', 'iq-h', 'Settings', p).style.marginTop = '.5em';
        [['fx', 'Screen shake & particles'], ['nums', 'Damage numbers']].forEach(function (o) {
          var row = el('div', 'iq-toggle', '<span>' + o[1] + '</span>', p);
          button(S.opt[o[0]] ? 'On' : 'Off', 'sm' + (S.opt[o[0]] ? '' : ' sec'), function () {
            S.opt[o[0]] = !S.opt[o[0]];
            sfx('click');
            save();
            renderPanel();
          }, row);
        });
        var r2 = el('div', 'iq-toggle', '<span>How to play</span>', p);
        button('Show', 'sm sec', function () { showHelp(); }, r2);
        var r3 = el('div', 'iq-toggle', '<span>Reset all progress</span>', p);
        button('Reset…', 'sm sec', function () { confirmReset(); }, r3).style.color = '#fb7185';
        el('div', 'iq-sub',
          'Keys: <span class="iq-kbd">Space</span> strike/gather · <span class="iq-kbd">1</span>–<span class="iq-kbd">4</span> or <span class="iq-kbd">←</span><span class="iq-kbd">→</span> pick hero · <span class="iq-kbd">↑</span><span class="iq-kbd">↓</span> switch tab · <span class="iq-kbd">B</span> boss. Progress autosaves in this browser.',
          p).style.marginTop = '.6em';
      },
    };

    /* ---- overlays ---- */
    var modal = null;
    function closeModal() { if (modal) { modal.close(); modal = null; } }
    function overlayMsg(title, html, buttons) {
      closeModal();
      var m = ui.overlay(root, {
        title: title,
        html: html,
        buttons: (buttons || []).map(function (b) {
          return { label: b.label, primary: b.primary, onClick: function () { closeModal(); if (b.onClick) b.onClick(); } };
        }),
      });
      m.el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      m.el.classList.add('iq-ov');
      m.el.style.setProperty('--iqfs', app.style.getPropertyValue('--iqfs'));
      modal = m;
      return m;
    }
    function chooseClass(onPick, title, text) {
      closeModal();
      var m = ui.overlay(root, { title: title, text: text });
      m.el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      m.el.classList.add('iq-ov');
      m.el.style.setProperty('--iqfs', app.style.getPropertyValue('--iqfs'));
      var grid = el('div', 'iq-classes', '', m.panel);
      grid.style.fontSize = 'var(--iqfs,14px)';
      CLASS_IDS.forEach(function (id) {
        var c = CLASSES[id];
        var b = el('button', 'iq-class', '', grid);
        b.type = 'button';
        b.appendChild(portrait(id, 0, 0, true));
        el('b', '', c.name, b);
        el('span', '', esc(c.role) + '<br>' + esc(c.perkText), b);
        b.addEventListener('click', function () { closeModal(); sfx('click'); onPick(id); });
      });
      if (S.intro) {
        var row = el('div', 'ig-actions', '', m.panel);
        row.style.marginTop = '.8em';
        var cb = el('button', 'ig-btn secondary', 'Cancel', row);
        cb.type = 'button';
        cb.addEventListener('click', function () { closeModal(); });
      }
      modal = m;
    }
    function showIntro() {
      chooseClass(function (cls) {
        S.heroes = [newHero(cls, pickName())];
        S.sel = 0;
        S.intro = true;
        S.last = Date.now();
        save();
        refreshParty(true);
        setTab('hero');
        sfx('win');
        toast((ctx.isTouch ? 'Tap' : 'Click') + ' the scene to strike faster!', 2200);
      }, 'Idle Questers', 'Your heroes fight, mine, chop and fish on their own — even while you’re away. Pick your first hero:');
    }
    function showHelp() {
      overlayMsg('How to play',
        '<div style="text-align:left;display:grid;gap:.45em">' +
          '<div>⚔ Heroes act automatically. ' + (ctx.isTouch ? 'Tap' : 'Click') + ' the scene (or press Space) to speed up the shown hero.</div>' +
          '<div>👥 Recruit up to 4 heroes in the party bar and give each an activity: Fight, Mine, Chop or Fish.</div>' +
          '<div>⬆ Levels give talent points. Ore, wood, fish and glimmer craft gear (Gear) and camp upgrades (Camp).</div>' +
          '<div>👑 Defeat monsters to call the zone boss on the Map. All fighters join; beat it within 30s to open the next zone.</div>' +
          '<div>✦ After 4 bosses you can Rebirth for Star Shards — permanent boosts for every future run.</div>' +
          '<div>🌙 Closed the tab? Your party keeps earning offline (50% rate, up to 8h; Star upgrades raise both).</div></div>',
        [{ label: 'Got it', primary: true }]);
    }
    function confirmReset() {
      overlayMsg('Reset all progress?', '<p>This deletes your heroes, zones, Star Shards, upgrades and stats. It cannot be undone.</p>', [
        { label: 'Cancel', primary: true },
        { label: 'Delete everything', primary: false, onClick: function () {
          store.remove('save');
          S = freshState();
          boss = null;
          resetRT();
          parts.length = 0;
          floats.length = 0;
          refreshParty(true);
          setTab('hero');
          showIntro();
        } },
      ]);
    }
    function confirmRebirth() {
      var g = shardGain();
      overlayMsg('Rebirth for ' + fmt(g) + ' Star Shards?',
        '<p>Heroes return to level 1 with new gear, and gold, materials, camp and zones reset. You keep Star Shards, Star upgrades and stats' +
          (S.stars.friends ? ', plus ' + Math.min(S.stars.friends + 1, S.heroes.length) + ' of your heroes' : '') + '.</p>',
        [{ label: 'Rebirth', primary: true, onClick: doRebirth }, { label: 'Not yet', primary: false }]);
    }
    function doRebirth() {
      var g = shardGain();
      if (!g) return;
      S.shards += g;
      S.st.shardsAll += g;
      S.rebirths++;
      var keep = Math.min(S.heroes.length, 1 + S.stars.friends);
      var kept = S.heroes.slice(0, keep).map(function (h) { var n = newHero(h.cls, h.name); n.act = h.act; return n; });
      S.heroes = kept;
      S.sel = 0;
      S.gold = 0; S.ore = 0; S.wood = 0; S.fish = 0; S.glim = 0;
      S.frontier = 0;
      S.kills = {};
      S.camp = { cook: 0, forge: 0, totem: 0, bench: 0 };
      boss = null;
      resetRT();
      save();
      sfx('win');
      starfall = 2.2;
      refreshParty(true);
      setTab('star');
      toast('Starfall! +' + fmt(g) + ' Star Shards', 2200);
    }

    /* ---- next goal (always visible) ---- */
    // Priority list: the most useful next step is always shown in the goal bar.
    function computeGoal() {
      var n = S.heroes.length;
      var f = S.frontier, fz = zoneDef(f);
      var tapWord = ctx.isTouch ? 'Tap' : 'Click';
      if (boss) return { text: 'Boss battle! ' + tapWord + ' fast to help your fighters', prog: null };
      if (bossReady()) {
        if (!fighters().length) return { text: 'Boss ready — set a hero to <b>Fight</b> first', prog: 1 };
        return { text: 'Boss ready: <b>' + esc(fz.boss) + '</b>', prog: 1, btn: 'Fight boss', act: startBoss };
      }
      if (n < 4 && S.gold >= recruitCost()) return { text: '<b>Recruit</b> hero #' + (n + 1), prog: 1, btn: 'Recruit', act: function () { clickSlot(n); } };
      if (S.frontier >= REBIRTH_BOSSES && S.rebirths === 0 && tab !== 'star') {
        return { text: 'Rebirth unlocked: <b>+' + fmt(shardGain()) + ' Star Shards</b> available', prog: 1, btn: 'View', act: function () { setTab('star'); } };
      }
      var anyTp = -1;
      S.heroes.forEach(function (h, i) { if (h.tp > 0 && anyTp < 0) anyTp = i; });
      if (anyTp >= 0 && S.taps > 3 && !(tab === 'hero' && S.sel === anyTp)) {
        return { text: '<b>' + esc(S.heroes[anyTp].name) + '</b> has a talent point to spend', prog: null, btn: 'Spend', act: function () { selectHero(anyTp); refreshParty(true); setTab('hero'); } };
      }
      // early on, point at an affordable upgrade for gear a hero is actually using (tab dots cover the rest)
      for (var i = 0; i < n; i++) {
        var h = S.heroes[i];
        var slot = h.act === 'fight' ? 'weapon' : SKILLS[h.act].tool;
        if (h.gear[slot] < 3 && canPay(gearCost(h, slot)) && !(tab === 'gear' && S.sel === i)) {
          return { text: 'Upgrade <b>' + esc(h.name) + '’s ' + esc(gearName(h, slot)) + '</b>', prog: 1, btn: 'Gear', act: (function (i) { return function () { selectHero(i); refreshParty(true); setTab('gear'); }; })(i) };
        }
      }
      if (n < 2 || (n < 4 && S.gold >= recruitCost() * 0.5)) {
        return { text: 'Goal: save <b>' + fmt(recruitCost()) + ' gold</b> to recruit hero #' + (n + 1), prog: S.gold / recruitCost() };
      }
      var inF = S.heroes.some(function (h) { return h.act === 'fight' && h.zone === f; });
      if (!inF) return { text: 'Send a fighter to <b>' + esc(fz.name) + '</b> to reach its boss', prog: (S.kills[f] || 0) / killsReq(f), btn: 'Map', act: function () { setTab('map'); } };
      var left = killsReq(f) - Math.floor(S.kills[f] || 0);
      return { text: 'Defeat <b>' + left + '</b> more ' + esc(fz.mon) + (left === 1 ? '' : 's') + ' to face <b>' + esc(fz.boss) + '</b>', prog: (S.kills[f] || 0) / killsReq(f) };
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

    function updateHud() {
      RES_IDS.forEach(function (k) {
        var v = Math.floor(S[k]);
        var p = pills[k];
        if (v !== p.shown) { p.shown = v; p.txt.textContent = fmt(v); }
        p.el.style.display = k === 'gold' || S[k] > 0 || S.heroes.length > 1 ? '' : 'none';
      });
      refreshParty(false);
      updateGoal();
      // tab badges
      var h = S.heroes[S.sel];
      tabBtns.hero.classList.toggle('has-dot', !!(h && h.tp > 0));
      tabBtns.gear.classList.toggle('has-dot', !!(h && ['weapon', 'pick', 'axe', 'rod'].some(function (s) {
        var used = (s === 'weapon' && h.act === 'fight') || (SKILLS[h.act] && SKILLS[h.act].tool === s);
        return used && canPay(gearCost(h, s));
      })));
      tabBtns.camp.classList.toggle('has-dot', S.heroes.length > 1 && CAMP.some(function (c) { return canPay(c.cost(S.camp[c.id])); }));
      tabBtns.map.classList.toggle('has-dot', bossReady() && !boss);
      tabBtns.star.classList.toggle('has-dot', S.frontier >= REBIRTH_BOSSES || STARS.some(function (sd) { return !(sd.max && S.stars[sd.id] >= sd.max) && S.shards >= sd.cost(S.stars[sd.id]); }));
      if (boss) {
        bossEl.style.display = '';
        lastBossHpPct = boss.hp / boss.max;
        bossEl.innerHTML = '<div>' + ICON.boss + ' ' + esc(zoneDef(boss.z).boss) + '</div><div class="hp"><i style="width:' + clamp(boss.hp / boss.max * 100, 0, 100).toFixed(1) + '%"></i></div><div class="tm">' +
          fmt(Math.max(0, boss.hp)) + ' HP · ' + Math.max(0, boss.time).toFixed(1) + 's left</div>';
      } else bossEl.style.display = 'none';
    }

    /* ---------------- layout ---------------- */
    var W = 0, H = 0, P = 4, groundY = 0, narrow = false;
    function layout() {
      var r = root.getBoundingClientRect();
      var w = r.width, h = r.height;
      if (!w || !h) return;
      var wasNarrow = narrow;
      narrow = w / h < 1.1 || w < 560;
      app.className = 'iq-app ' + (narrow ? 'narrow' : 'wide');
      var fs = narrow ? clamp(w / 360 * 12.5, 12, 17) : clamp(Math.min(w / 1140, h / 640) * 14, 12, 19);
      app.style.setProperty('--iqfs', fs.toFixed(1) + 'px');
      app.style.setProperty('--iqside', w > 900 ? '40%' : '44%');
      app.style.setProperty('--iqscene', h < 520 ? '41%' : '44%');
      if (narrow) {
        if (party.parentNode !== app) app.insertBefore(party, side);
      } else if (party.parentNode !== scene) scene.appendChild(party);
      if (wasNarrow !== narrow) placeOverlays();
    }
    function placeOverlays() {
      var resH = resBar.offsetHeight || 24;
      goalEl.style.top = 'calc(' + (resH + 6) + 'px + .55em)';
      bossEl.style.top = 'calc(' + (resH + goalEl.offsetHeight + 12) + 'px + .7em)';
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { layout(); placeOverlays(); if (view) recalcGeom(); }) : null;
    if (ro) ro.observe(root);
    else window.addEventListener('resize', layout);
    layout();

    var view = IGAME.createCanvas(scene, {
      onResize: function (w, h) {
        W = w;
        H = h;
        recalcGeom();
      },
    });
    function recalcGeom() {
        var w = W, h = H;
        if (!w || !h) return;
        var partyH = narrow ? 0 : party.offsetHeight || 60;
        P = narrow ? Math.round(Math.min(h * 0.3 / 18, w * 0.13 / 12)) : Math.floor(Math.min((h - partyH) * 0.25 / 18, w * 0.11 / 12));
        P = Math.max(2, P);
        groundY = Math.round(narrow ? h - Math.max(P * 4, h * 0.12) : h - partyH - Math.max(P * 5, h * 0.05));
        bgKey = '';
        placeOverlays();
    }
    var g = view.ctx;
    scene.insertBefore(view.canvas, scene.firstChild);

    /* ---------------- scene geometry ---------------- */
    function heroW() { return 12 * P; }
    function heroH() { return 18 * P; }
    function heroX() {
      var h = S.heroes[S.sel];
      var m = sceneMode();
      if (boss && h && h.act === 'fight') m = 'fight';
      if (m === 'fight') return h && h.cls === 'vanguard' ? Math.round(monX() - monW() / 2 - P * 9) : Math.round(W * 0.3);
      if (m === 'fish') return Math.round(W * 0.3);
      return Math.round(monX() - P * 15);
    }
    function monX() { return Math.round(W * 0.68); }
    function monScale() { return boss ? 1.9 : 1; }
    function monW() { return 16 * P * monScale(); }
    function monH() { var d = zoneDef(curZone()); return MON_SPR[d.type].length * P * monScale(); }
    function curZone() { var h = S.heroes[S.sel]; return boss ? boss.z : h ? h.zone : 0; }
    function sceneMode() {
      var h = S.heroes[S.sel];
      if (!h) return 'fight';
      return h.act === 'fight' ? 'fight' : h.act;
    }

    /* ---------------- particles & floating text (pooled) ---------------- */
    var parts = [];
    var floats = [];
    var MAXP = 140;
    function addPart(x, y, vx, vy, life, color, size, grav, kind) {
      if (!S.opt.fx && kind !== 'coin') return;
      if (parts.length >= MAXP) parts.shift();
      parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, c: color, s: size, gr: grav, k: kind || 0 });
    }
    function burst(x, y, n, colors, power) {
      for (var i = 0; i < n; i++) {
        var a = rand(0, Math.PI * 2), sp = rand(60, 220) * (power || 1);
        addPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 60, rand(0.4, 0.9), colors[i % colors.length], P * rand(0.7, 1.3), 420);
      }
    }
    function coinBurst(x, y, n) {
      for (var i = 0; i < n; i++) addPart(x, y, rand(-90, 90), rand(-260, -160), rand(0.7, 1), '#fcd34d', P * 1.4, 520, 'coin');
    }
    function hitSpark(x, y) {
      for (var i = 0; i < 5; i++) addPart(x, y, rand(-160, 40), rand(-160, 60), rand(0.15, 0.3), i % 2 ? '#ffffff' : '#fde68a', P * 0.8, 0);
    }
    function tapRing(x, y) {
      addPart(x, y, 0, 0, 0.35, '#ffffff', P * 2, 0, 'ring');
    }
    function addFloat(x, y, text, color, scale, delay) {
      if (floats.length > 26) floats.shift();
      floats.push({ x: x, y: y, t: -(delay || 0), text: text, c: color, s: scale || 1 });
    }
    function gatherFx(sk, y, done) {
      var tx = monX() - P * 4, ty = groundY - P * 6;
      if (sk === 'mine') {
        for (var i = 0; i < 8; i++) addPart(tx, ty, rand(-180, 60), rand(-220, -60), rand(0.4, 0.8), i % 3 ? '#8b8fa8' : '#a5b4fc', P * rand(0.7, 1.2), 600);
        sfx({ f: 140, f2: 90, d: 0.07, type: 'square', v: 0.07 });
        sfx.noise && sfx.noise({ d: 0.06, f: 2400, v: 0.08 });
      } else if (sk === 'chop') {
        for (var j = 0; j < 7; j++) addPart(tx, groundY - P * rand(8, 22), rand(-80, 80), rand(-120, 20), rand(0.8, 1.4), j % 2 ? '#4ade80' : '#22c55e', P * rand(0.8, 1.2), 90, 'leaf');
        for (var k = 0; k < 4; k++) addPart(tx, ty, rand(-150, 20), rand(-160, -40), rand(0.3, 0.6), '#c08a55', P * 0.9, 600);
        sfx({ f: 200, f2: 120, d: 0.06, type: 'triangle', v: 0.1 });
      } else {
        var bx = fishBobberX(), by = waterY();
        for (var m = 0; m < 10; m++) addPart(bx, by, rand(-90, 90), rand(-200, -60), rand(0.4, 0.7), m % 2 ? '#bae6fd' : '#ffffff', P * rand(0.6, 1.1), 600);
        fishJump = 0;
        sfx({ f: 500, f2: 900, d: 0.1, type: 'sine', v: 0.08 });
      }
      if (done) {
        var res = SKILLS[sk].res;
        addFloat(sk === 'fish' ? fishBobberX() : tx, groundY - P * 24, '+' + fmt(y) + ' ' + RES[res].name.toLowerCase(), RES[res].color, 0.95);
        bump(res);
        swingAnim = 0;
      }
    }

    /* ---------------- backgrounds (cached offscreen) ---------------- */
    var bgCanvas = document.createElement('canvas');
    var bgKey = '';
    function drawBg(mode, z) {
      var key = mode + '|' + (mode === 'fight' ? z % 64 : '') + '|' + W + 'x' + H + '|' + view.dpr + '|' + P;
      if (key === bgKey) return;
      bgKey = key;
      var dpr = view.dpr;
      bgCanvas.width = Math.round(W * dpr);
      bgCanvas.height = Math.round(H * dpr);
      var b = bgCanvas.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rnd = seeded(7 + (mode === 'fight' ? z * 31 : mode.length * 977));
      if (mode === 'fight') paintZone(b, zoneDef(z), z, rnd);
      else if (mode === 'mine') paintMine(b, rnd);
      else if (mode === 'chop') paintForest(b, rnd);
      else paintLake(b, rnd);
    }
    function grad(b, y0, y1, c0, c1) {
      var gr = b.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, c0);
      gr.addColorStop(1, c1);
      return gr;
    }
    function hills(b, base, amp, freq, phase, color) {
      b.fillStyle = color;
      b.beginPath();
      b.moveTo(0, H);
      for (var x = 0; x <= W + P * 2; x += P * 2) {
        var y = base - (Math.sin(x * freq + phase) * 0.6 + Math.sin(x * freq * 2.3 + phase * 1.7) * 0.4) * amp;
        b.lineTo(x, Math.round(y / P) * P);
      }
      b.lineTo(W, H);
      b.closePath();
      b.fill();
    }
    function ground(b, top, bot) {
      b.fillStyle = bot;
      b.fillRect(0, groundY, W, H - groundY);
      b.fillStyle = top;
      b.fillRect(0, groundY, W, P * 2);
      for (var x = 0; x < W; x += P * 3) if ((x / P) % 7 < 3) b.fillRect(x, groundY + P * 2, P, P);
      b.fillStyle = 'rgba(0,0,0,.12)';
      for (var i = 0; i < W / (P * 5); i++) b.fillRect(Math.round((i * 53) % W / P) * P, groundY + P * (4 + (i * 7) % 6), P * 2, P);
    }
    function pixelTree(b, x, y, s, trunk, leaf, leaf2) {
      b.fillStyle = trunk;
      b.fillRect(x - s, y - s * 5, s * 2, s * 5);
      b.fillStyle = leaf;
      b.fillRect(x - s * 4, y - s * 10, s * 8, s * 5);
      b.fillRect(x - s * 3, y - s * 12, s * 6, s * 2);
      b.fillStyle = leaf2;
      b.fillRect(x - s * 4, y - s * 6, s * 8, s);
      b.fillRect(x + s, y - s * 11, s * 2, s * 2);
    }
    function pine(b, x, y, s, c1, c2, snow) {
      b.fillStyle = '#5b3b2b';
      b.fillRect(x - s, y - s * 3, s * 2, s * 3);
      for (var i = 0; i < 4; i++) {
        var w = (5 - i) * s;
        b.fillStyle = i % 2 ? c2 : c1;
        b.fillRect(x - w, y - s * (3 + i * 3) - s * 3, w * 2, s * 3);
        if (snow) { b.fillStyle = snow; b.fillRect(x - w + s, y - s * (3 + i * 3) - s * 3, w * 2 - s * 2, s); }
      }
    }
    function paintZone(b, zd, z, rnd) {
      var c = zd.bg;
      b.fillStyle = grad(b, 0, groundY, c.s1, c.s2);
      b.fillRect(0, 0, W, groundY + 2);
      if (c.sun) {
        b.fillStyle = c.sun;
        var sx = W * 0.8, sy = H * 0.22, sr = Math.max(P * 4, H * 0.07);
        b.globalAlpha = 0.25;
        b.beginPath(); b.arc(sx, sy, sr * 1.6, 0, Math.PI * 2); b.fill();
        b.globalAlpha = 1;
        b.beginPath(); b.arc(sx, sy, sr, 0, Math.PI * 2); b.fill();
      }
      if (c.deco === 'spires' || z >= ZONES.length || c.deco === 'shrooms') {
        b.fillStyle = 'rgba(255,255,255,.8)';
        for (var s = 0; s < 40; s++) b.fillRect(Math.floor(rnd() * W / P) * P, Math.floor(rnd() * groundY * 0.7 / P) * P, P * (rnd() < 0.2 ? 2 : 1) * 0.6, P * 0.6);
      }
      hills(b, groundY - H * 0.2, H * 0.08, 0.008, z * 1.3, c.h1);
      hills(b, groundY - H * 0.08, H * 0.05, 0.013, z * 2.1 + 1, c.h2);
      var d = c.deco;
      var n = Math.ceil(W / (P * 26));
      for (var i = 0; i < n; i++) {
        var x = Math.round((i + 0.3 + rnd() * 0.5) * W / n / P) * P;
        if (Math.abs(x - heroX()) < P * 6 || Math.abs(x - monX()) < P * 10) continue;
        var s = Math.max(1, Math.round(P * rand(0.5, 0.8)));
        var y = groundY;
        if (d === 'trees') pixelTree(b, x, y, s, '#7a4b2a', '#3fae4b', '#2f8a3a');
        else if (d === 'bigtrees') pixelTree(b, x, y, s + 1, '#4a2f1e', '#2f6b34', '#245528');
        else if (d === 'pines') pine(b, x, y, s, '#2f6b4f', '#285c44', '#ffffff');
        else if (d === 'cacti') {
          b.fillStyle = '#4c9a50';
          b.fillRect(x - s, y - s * 9, s * 2, s * 9);
          b.fillRect(x - s * 4, y - s * 6, s * 2, s * 3);
          b.fillRect(x - s * 3, y - s * 4, s * 2, s);
          b.fillRect(x + s * 2, y - s * 7, s * 2, s * 3);
          b.fillRect(x + s, y - s * 5, s * 2, s);
        } else if (d === 'lava') {
          b.fillStyle = '#2a120d';
          b.fillRect(x - s * 4, y - s * 3, s * 8, s * 3);
          b.fillStyle = '#ff7a2f';
          b.fillRect(x - s * 2, y - s * 2, s * 4, s);
          b.fillStyle = 'rgba(255,120,40,.35)';
          b.fillRect(x - s, y - s * 10, s * 2, s * 7);
        } else if (d === 'coral') {
          b.fillStyle = i % 2 ? '#ff6fa8' : '#ffb347';
          b.fillRect(x - s, y - s * 8, s * 2, s * 8);
          b.fillRect(x - s * 3, y - s * 6, s * 2, s * 2);
          b.fillRect(x - s * 3, y - s * 9, s * 2, s * 3);
          b.fillRect(x + s, y - s * 5, s * 3, s * 2);
          b.fillRect(x + s * 3, y - s * 7, s * 2, s * 2);
        } else if (d === 'shrooms') {
          b.fillStyle = '#c9c0e0';
          b.fillRect(x - s, y - s * 7, s * 2, s * 7);
          b.fillStyle = i % 2 ? '#7c4dd6' : '#3fb6a8';
          b.fillRect(x - s * 5, y - s * 10, s * 10, s * 3);
          b.fillRect(x - s * 3, y - s * 12, s * 6, s * 2);
        } else if (d === 'spires') {
          b.fillStyle = '#4c3fa8';
          b.fillRect(x - s * 2, y - s * 14, s * 4, s * 14);
          b.fillStyle = '#a99bff';
          b.fillRect(x - s, y - s * 16, s * 2, s * 2);
        }
      }
      ground(b, c.g1, c.g2);
      if (zd.rift) {
        // violet haze over the far hills only, so the ground stays readable
        b.fillStyle = 'rgba(91,33,182,.28)';
        b.fillRect(0, 0, W, groundY);
      }
    }
    function paintMine(b, rnd) {
      b.fillStyle = grad(b, 0, groundY, '#16121f', '#3a2c2a');
      b.fillRect(0, 0, W, H);
      b.fillStyle = '#241c22';
      for (var x = 0; x < W; x += P * 4) {
        var h = Math.round((rnd() * 0.1 + 0.04) * H / P) * P;
        b.fillRect(x, 0, P * 4, h);
        b.fillRect(x + P, h, P * 2, P * 2);
      }
      hills(b, groundY - H * 0.18, H * 0.06, 0.01, 2, '#2b2128');
      for (var i = 0; i < 9; i++) {
        var cx = rnd() * W, cy = H * 0.2 + rnd() * (groundY - H * 0.3);
        b.fillStyle = ['#7dd3fc', '#c4b5fd', '#f9a8d4'][i % 3];
        b.globalAlpha = 0.9;
        b.fillRect(Math.round(cx / P) * P, Math.round(cy / P) * P, P, P * 3);
        b.fillRect(Math.round(cx / P) * P + P, Math.round(cy / P) * P + P, P, P * 2);
        b.globalAlpha = 1;
      }
      // lantern posts
      b.fillStyle = '#4a3020';
      b.fillRect(W * 0.08, groundY - P * 16, P * 2, P * 16);
      b.fillStyle = '#ffcf5a';
      b.fillRect(W * 0.08 - P, groundY - P * 18, P * 4, P * 3);
      ground(b, '#5a4a42', '#2c2224');
    }
    function paintForest(b, rnd) {
      b.fillStyle = grad(b, 0, groundY, '#8fd0b0', '#e6f6dc');
      b.fillRect(0, 0, W, H);
      hills(b, groundY - H * 0.22, H * 0.06, 0.009, 4, '#6fae7c');
      for (var i = 0; i < W / (P * 9); i++) {
        var x = Math.round(rnd() * W / P) * P;
        if (Math.abs(x - monX()) < P * 12) continue;
        pixelTree(b, x, groundY - P * Math.floor(rnd() * 3), Math.max(1, Math.round(P * 0.55)), '#5b3b2b', '#3d8b47', '#2f6e38');
      }
      ground(b, '#5fb04f', '#6b4630');
    }
    function paintLake(b, rnd) {
      b.fillStyle = grad(b, 0, groundY, '#8cc8ff', '#fde7c4');
      b.fillRect(0, 0, W, H);
      b.fillStyle = '#ffe8a3';
      b.beginPath(); b.arc(W * 0.78, waterY() - H * 0.02, Math.max(P * 5, H * 0.08), Math.PI, 0); b.fill();
      hills(b, waterY() - H * 0.02, H * 0.08, 0.007, 1, '#7a9cc4');
      hills(b, waterY(), H * 0.03, 0.02, 3, '#5e86b0');
      b.fillStyle = grad(b, waterY(), H, '#3b82c4', '#1e4f8a');
      b.fillRect(0, waterY(), W, H - waterY());
      // dock under the hero
      var dx = heroX() - P * 10, dw = P * 22;
      b.fillStyle = '#8a5a3b';
      b.fillRect(dx, groundY, dw, P * 2);
      b.fillStyle = '#6b4630';
      for (var x = dx; x < dx + dw; x += P * 4) b.fillRect(x, groundY, P, P * 2);
      b.fillRect(dx + P * 2, groundY + P * 2, P * 2, H - groundY);
      b.fillRect(dx + dw - P * 4, groundY + P * 2, P * 2, H - groundY);
      // shore on the left
      b.fillStyle = '#c9a66b';
      b.fillRect(0, groundY + P, Math.max(0, dx), H - groundY);
      b.fillStyle = '#5fb04f';
      b.fillRect(0, groundY, Math.max(0, dx), P * 2);
      void rnd;
    }
    function waterY() { return groundY - P * 2; }
    function fishBobberX() { return Math.round(W * (narrow ? 0.72 : 0.7)); }

    /* ---------------- scene drawing ---------------- */
    var swingAnim = 9, fishJump = 9, bossFlash = 9, shakeT = 0, shakeA = 0, starfall = 0, time = 0;
    var clouds = [0.1, 0.45, 0.8].map(function (x, i) { return { x: x, y: 0.12 + i * 0.07, s: 0.7 + i * 0.25 }; });
    function shake(a) { if (S.opt.fx) { shakeA = Math.max(shakeA, a); shakeT = 0.25; } }

    // swing: seconds since the last action; prog: 0..1 progress toward the next one
    function drawHero(h, x, y, swing, prog, mode) {
      var spr = heroSprite(h.cls);
      var bob = Math.round(Math.sin(time * 3) * 0.5) * P * 0.5;
      var lunge = 0;
      if (mode === 'fight' && h.cls === 'vanguard' && swing < 0.22) lunge = Math.sin(swing / 0.22 * Math.PI) * P * 3;
      var hx = Math.round(x - heroW() / 2 + lunge), hy = Math.round(y - heroH() + bob);
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(x - P * 4 + lunge, y - P * 0.5, P * 8, P);
      g.drawImage(spr, hx, hy, heroW(), heroH());
      var handX = hx + P * 9.5, handY = hy + P * 12.5;
      var ang, rest;
      if (mode === 'fight') {
        if (h.cls === 'vanguard') {
          // quick overhead slash, then ease back to a ready stance
          rest = 0.35 - prog * 1.2;
          if (swing < 0.08) ang = -1.1 + (swing / 0.08) * 3.1;
          else if (swing < 0.32) ang = 2.0 + (rest - 2.0) * easeOut((swing - 0.08) / 0.24);
          else ang = rest;
          drawTool('sword', handX, handY, ang);
        } else if (h.cls === 'pathfinder') {
          drawTool('bow', handX + P, handY - P * 2, 0);
        } else drawTool('staff', handX, handY, -0.25 + (swing < 0.3 ? Math.sin(swing / 0.3 * Math.PI) * 0.6 : 0));
      } else if (mode === 'mine' || mode === 'chop') {
        // raise the tool while the action charges, slam it down when it completes
        rest = 0.3 - prog * 1.6;
        if (swing < 0.09) ang = -1.3 + (swing / 0.09) * 3.0;
        else if (swing < 0.3) ang = 1.7 + (rest - 1.7) * easeOut((swing - 0.09) / 0.21);
        else ang = rest;
        drawTool(mode === 'mine' ? 'pick' : 'axe', handX, handY, ang);
      } else if (mode === 'fish') {
        drawTool('rod', handX, handY, ROD_ANG);
      }
    }
    var ROD_ANG = 0.9;
    function drawTool(kind, x, y, ang) {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      var p = P;
      if (kind === 'sword') {
        g.fillStyle = '#5b3b2b'; g.fillRect(-p * 0.5, -p, p, p * 2);
        g.fillStyle = '#f5c542'; g.fillRect(-p * 1.5, -p * 1.5, p * 3, p);
        g.fillStyle = '#e5e7eb'; g.fillRect(-p * 0.5, -p * 8.5, p, p * 7);
        g.fillStyle = '#ffffff'; g.fillRect(-p * 0.5, -p * 8.5, p * 0.5, p * 6);
      } else if (kind === 'bow') {
        g.fillStyle = '#8a5a3b';
        g.fillRect(p * 0.5, -p * 5, p, p * 2); g.fillRect(p * 1.5, -p * 3, p, p * 6); g.fillRect(p * 0.5, p * 3, p, p * 2);
        g.fillStyle = '#f1f5f9'; g.fillRect(0, -p * 4, p * 0.4, p * 8);
      } else if (kind === 'staff') {
        g.fillStyle = '#7a4b2a'; g.fillRect(-p * 0.5, -p * 9, p, p * 12);
        g.fillStyle = '#a78bfa'; g.fillRect(-p * 1.5, -p * 11.5, p * 3, p * 3);
        g.fillStyle = '#f5f3ff'; g.fillRect(-p * 0.5, -p * 11, p, p);
      } else if (kind === 'pick') {
        g.fillStyle = '#8a5a3b'; g.fillRect(-p * 0.5, -p * 8, p, p * 9);
        g.fillStyle = '#cbd5e1'; g.fillRect(-p * 4, -p * 9, p * 8, p * 1.5); g.fillRect(-p * 5, -p * 8, p * 1.5, p); g.fillRect(p * 3.5, -p * 8, p * 1.5, p);
      } else if (kind === 'axe') {
        g.fillStyle = '#8a5a3b'; g.fillRect(-p * 0.5, -p * 8, p, p * 9);
        g.fillStyle = '#cbd5e1'; g.fillRect(p * 0.5, -p * 8.5, p * 3, p * 3.5);
        g.fillStyle = '#94a3b8'; g.fillRect(p * 3, -p * 8.5, p * 0.7, p * 3.5);
      } else if (kind === 'rod') {
        g.fillStyle = '#8a5a3b'; g.fillRect(-p * 0.5, -p * 14, p * 0.8, p * 15);
        g.fillStyle = '#ef4444'; g.fillRect(-p * 0.8, -p * 2, p * 1.4, p * 1.4);
      }
      g.restore();
    }
    function drawMonster(z, x, y, r, isBoss) {
      var d = zoneDef(z);
      var flash = isBoss ? bossFlash < 0.08 : r.hurt < 0.08;
      var spr = monSprite(z, flash);
      var sc = isBoss ? 1.9 : 1;
      var w = spr.width * P * sc, h = spr.height * P * sc;
      var t = time * (isBoss ? 2.2 : 3.2);
      var sq = 1 + Math.sin(t) * 0.05;
      var knock = (isBoss ? bossFlash : r.hurt) < 0.15 ? P * 2 * (1 - (isBoss ? bossFlash : r.hurt) / 0.15) : 0;
      var dieS = 1;
      if (!isBoss && r.mhp <= 0) {
        if (r.die > 0.25) return;
        dieS = 1 - r.die / 0.25;
      }
      var dw = w * (2 - sq) * dieS, dh = h * sq * dieS;
      var hover = d.type === 'wisp' ? Math.sin(t * 0.8) * P * 1.5 - P * 2 : 0;
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(x - w * 0.35, y - P * 0.5, w * 0.7, P);
      g.save();
      g.translate(Math.round(x + knock), Math.round(y + hover));
      g.scale(-1, 1); // face the hero
      g.drawImage(spr, -dw / 2, -dh, dw, dh);
      g.restore();
      if (isBoss) {
        // crown
        var cx = x + knock, cy = y + hover - dh - P * 2;
        g.fillStyle = '#fbbf24';
        g.fillRect(cx - P * 4, cy, P * 8, P * 2);
        g.fillRect(cx - P * 4, cy - P * 2, P * 2, P * 2);
        g.fillRect(cx - P, cy - P * 3, P * 2, P * 3);
        g.fillRect(cx + P * 2, cy - P * 2, P * 2, P * 2);
        g.fillStyle = '#ef4444';
        g.fillRect(cx - P * 0.5, cy + P * 0.5, P, P);
      } else if (r.mhp > 0) {
        // HP bar
        var bw = Math.max(P * 12, w * 0.9), by = y + hover - h - P * 3;
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.fillRect(x - bw / 2 - 1, by - 1, bw + 2, P + 2);
        g.fillStyle = '#ef4444';
        g.fillRect(x - bw / 2, by, bw * clamp(r.mhp / r.mmax, 0, 1), P);
      }
    }
    function drawProjectiles(h, r, x0, y0, x1, y1, dt) {
      for (var i = r.proj.length - 1; i >= 0; i--) {
        var pr = r.proj[i];
        pr.t += dt;
        var tt = (pr.t - pr.delay) / 0.22;
        if (tt < 0) continue;
        if (tt >= 1) {
          r.proj.splice(i, 1);
          applyHit(S.sel, h, pr.d, pr.crit, pr.target, 0);
          continue;
        }
        var px = x0 + (x1 - x0) * tt, py = y0 + (y1 - y0) * tt - Math.sin(tt * Math.PI) * P * 4;
        if (h.cls === 'pathfinder') {
          g.fillStyle = '#e2e8f0';
          g.fillRect(px - P * 3, py, P * 4, P * 0.6);
          g.fillStyle = '#ef4444';
          g.fillRect(px - P * 3.5, py - P * 0.3, P, P * 1.2);
        } else {
          g.fillStyle = pr.crit ? '#fde68a' : '#c4b5fd';
          g.fillRect(px - P, py - P, P * 2, P * 2);
          g.fillStyle = '#ffffff';
          g.fillRect(px - P * 0.5, py - P * 0.5, P, P);
          if (S.opt.fx && Math.random() < 0.5) addPart(px, py, rand(-30, 30), rand(-30, 30), 0.25, '#a78bfa', P * 0.7, 0);
        }
      }
    }

    function render(dt) {
      var h = S.heroes[S.sel];
      var mode = sceneMode();
      var z = curZone();
      if (boss && h && h.act === 'fight') mode = 'fight';
      drawBg(mode, z);
      g.imageSmoothingEnabled = false;
      var sx = 0, sy = 0;
      if (shakeT > 0) {
        shakeT -= dt;
        sx = rand(-shakeA, shakeA);
        sy = rand(-shakeA, shakeA);
        if (shakeT <= 0) shakeA = 0;
      }
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      g.translate(sx, sy);
      g.drawImage(bgCanvas, 0, 0, W, H);
      // clouds (day scenes)
      if ((mode === 'fight' && zoneDef(z).bg.sun) || mode === 'chop' || mode === 'fish') {
        g.fillStyle = 'rgba(255,255,255,.75)';
        clouds.forEach(function (c) {
          c.x += dt * 0.006 * c.s;
          if (c.x > 1.15) c.x = -0.15;
          var cx = Math.round(c.x * W / P) * P, cy = Math.round(c.y * H / P) * P, s = Math.max(1, Math.round(P * c.s * 0.8));
          g.fillRect(cx, cy, s * 10, s * 2);
          g.fillRect(cx + s * 2, cy - s * 2, s * 5, s * 2);
        });
      }
      if (!h) {
        g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        return;
      }
      var r = rt(S.sel);
      var hx = heroX(), mx = monX();
      if (mode === 'fight') {
        if (boss) {
          drawMonster(boss.z, mx, groundY, r, true);
          bossFlash += dt;
        } else {
          r.hurt += dt;
          if (r.mhp <= 0) r.die += dt;
          drawMonster(h.zone, mx, groundY, r, false);
        }
        r.swing += dt;
        var prog0 = clamp(r.t / actInt(h), 0, 1);
        drawHero(h, hx, groundY, r.swing, prog0, 'fight');
        drawProjectiles(h, r, hx + P * 5, groundY - P * 10, mx - P * 4, groundY - (boss ? monH() * 0.5 : P * 6), dt);
      } else if (mode === 'mine') {
        drawRock(mx, groundY, r);
        swingAnim += dt;
        drawHero(h, hx, groundY, swingAnim, clamp(r.t / actInt(h), 0, 1), 'mine');
      } else if (mode === 'chop') {
        drawTree(mx, groundY);
        swingAnim += dt;
        drawHero(h, hx, groundY, swingAnim, clamp(r.t / actInt(h), 0, 1), 'chop');
      } else {
        drawWater(dt);
        drawHero(h, hx, groundY, 9, 0, 'fish');
        drawLine(h, hx, r);
      }
      // action progress bar under the hero (shows how taps speed things up)
      if (!boss || h.act !== 'fight') {
        var prog = clamp(r.t / actInt(h), 0, 1);
        var bw = P * 12, bx = hx - bw / 2, by = groundY + P * 1.5;
        if (by + P < H) {
          g.fillStyle = 'rgba(0,0,0,.45)';
          g.fillRect(bx - 1, by - 1, bw + 2, P + 2);
          g.fillStyle = h.act === 'fight' ? '#fbbf24' : '#34d399';
          g.fillRect(bx, by, bw * prog, P);
        }
      }
      drawParts(dt);
      drawFloats(dt);
      if (starfall > 0) {
        starfall -= dt;
        if (S.opt.fx && Math.random() < 0.6) addPart(rand(0, W), -10, rand(-40, 40), rand(200, 380), 1.2, Math.random() < 0.5 ? '#fde68a' : '#ffffff', P * 1.2, 0);
      }
      // first-run hint
      if (S.intro && S.taps < 3 && !modal) {
        var a = 0.6 + Math.sin(time * 5) * 0.4;
        g.globalAlpha = a;
        g.fillStyle = '#ffffff';
        g.font = '800 ' + Math.max(12, Math.round(P * 3)) + 'px system-ui, sans-serif';
        g.textAlign = 'center';
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(10,8,25,.6)';
        var hint = (ctx.isTouch ? 'TAP' : 'CLICK') + (h.act === 'fight' ? ' TO STRIKE FASTER' : ' TO WORK FASTER');
        g.strokeText(hint, W / 2, groundY - heroH() - P * 7);
        g.fillText(hint, W / 2, groundY - heroH() - P * 7);
        g.globalAlpha = 1;
      }
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    }
    function drawRock(x, y, r) {
      var s = P;
      var wob = swingAnim < 0.12 ? Math.round(Math.sin(swingAnim * 80) * s * 0.5) : 0;
      x += wob;
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(x - s * 9, y - s * 0.5, s * 18, s);
      g.fillStyle = '#5b5f73';
      g.fillRect(x - s * 8, y - s * 7, s * 16, s * 7);
      g.fillRect(x - s * 6, y - s * 10, s * 12, s * 3);
      g.fillRect(x - s * 3, y - s * 12, s * 7, s * 2);
      g.fillStyle = '#7b8098';
      g.fillRect(x - s * 5, y - s * 10, s * 6, s * 2);
      g.fillRect(x - s * 7, y - s * 7, s * 3, s * 2);
      g.fillStyle = '#a5b4fc';
      g.fillRect(x - s * 2, y - s * 6, s * 2, s * 2);
      g.fillRect(x + s * 3, y - s * 9, s * 2, s * 2);
      g.fillRect(x + s * 4, y - s * 4, s * 2, s);
      g.fillStyle = '#e0e7ff';
      g.fillRect(x - s * 2, y - s * 6, s, s);
      void r;
    }
    function drawTree(x, y) {
      var s = P;
      var wob = swingAnim < 0.3 ? Math.sin(swingAnim * 40) * (1 - swingAnim / 0.3) * s : 0;
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(x - s * 7, y - s * 0.5, s * 14, s);
      g.fillStyle = '#6b4630';
      g.fillRect(x - s * 2, y - s * 12, s * 4, s * 12);
      g.fillStyle = '#8a5a3b';
      g.fillRect(x - s * 2, y - s * 12, s, s * 12);
      g.fillStyle = '#c08a55';
      g.fillRect(x - s * 2, y - s * 5, s * 2, s * 2); // chopped notch
      g.save();
      g.translate(x + wob, y - s * 12);
      g.fillStyle = '#2f8a3a';
      g.fillRect(-s * 8, -s * 9, s * 16, s * 9);
      g.fillRect(-s * 6, -s * 12, s * 12, s * 3);
      g.fillStyle = '#3fae4b';
      g.fillRect(-s * 6, -s * 11, s * 7, s * 4);
      g.fillRect(-s * 7, -s * 6, s * 5, s * 3);
      g.fillStyle = '#ef4444';
      g.fillRect(s * 3, -s * 7, s, s);
      g.fillRect(-s * 3, -s * 4, s, s);
      g.restore();
    }
    function drawWater(dt) {
      var wy = waterY();
      g.fillStyle = 'rgba(255,255,255,.35)';
      for (var i = 0; i < 14; i++) {
        var x = ((i * 97 + time * 18 * (i % 2 ? 1 : -1)) % (W + 60) + W + 60) % (W + 60) - 30;
        var y = wy + P * 3 + (i % 5) * (H - wy) / 5.5;
        if (x > heroX() - P * 10 && x < heroX() + P * 12 && y < groundY + P * 3) continue;
        g.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, P * 4, P * 0.6);
      }
      // jumping fish
      if (fishJump < 0.8) {
        fishJump += dt;
        var t = fishJump / 0.8;
        var fx = fishBobberX() + t * P * 14, fy = wy - Math.sin(t * Math.PI) * P * 16;
        g.fillStyle = '#38bdf8';
        g.fillRect(fx - P * 3, fy - P, P * 5, P * 2);
        g.fillStyle = '#0ea5e9';
        g.fillRect(fx - P * 4, fy - P * 1.5, P, P * 3);
        g.fillStyle = '#0c4a6e';
        g.fillRect(fx + P, fy - P * 0.5, P * 0.7, P * 0.7);
      }
    }
    function drawLine(h, hx, r) {
      // rod tip: hand position rotated by ROD_ANG, rod length 14 art pixels
      var handX = hx - heroW() / 2 + P * 9.5, handY = groundY - heroH() + P * 12.5;
      var tx = handX + Math.sin(ROD_ANG) * P * 14, ty = handY - Math.cos(ROD_ANG) * P * 14;
      var bx = fishBobberX(), by = waterY() + Math.sin(time * 4) * P * 0.6 + (clamp(r.t / actInt(h), 0, 1) > 0.85 ? Math.sin(time * 30) * P * 0.8 : 0);
      g.strokeStyle = 'rgba(255,255,255,.75)';
      g.lineWidth = Math.max(1, P * 0.25);
      g.beginPath();
      g.moveTo(tx, ty);
      g.quadraticCurveTo((tx + bx) / 2, Math.max(ty, by) + P * 3, bx, by);
      g.stroke();
      g.fillStyle = '#ef4444';
      g.fillRect(bx - P, by - P, P * 2, P);
      g.fillStyle = '#ffffff';
      g.fillRect(bx - P, by, P * 2, P);
    }
    function drawParts(dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.gr * dt;
        if (p.k === 'leaf') p.vx += Math.sin(time * 4 + i) * 60 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        var a = Math.min(1, p.life / p.max * 2);
        g.globalAlpha = a;
        if (p.k === 'ring') {
          var rr = (1 - p.life / p.max) * P * 8 + P * 2;
          g.strokeStyle = p.c;
          g.lineWidth = Math.max(1, P * 0.6);
          g.beginPath();
          g.arc(p.x, p.y, rr, 0, Math.PI * 2);
          g.stroke();
        } else if (p.k === 'coin') {
          g.fillStyle = '#b45309';
          g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
          g.fillStyle = p.c;
          g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s * 0.75, p.s * 0.75);
        } else {
          g.fillStyle = p.c;
          g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
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
        if (f.t < 0) continue;
        if (f.t > 1.1) { floats.splice(i, 1); continue; }
        var pop = f.t < 0.12 ? 0.6 + (f.t / 0.12) * 0.4 : 1;
        var size = Math.round(Math.max(12, P * 3.2) * f.s * pop);
        g.font = '900 ' + size + 'px system-ui, -apple-system, Segoe UI, sans-serif';
        g.globalAlpha = f.t > 0.75 ? 1 - (f.t - 0.75) / 0.35 : 1;
        var y = f.y - easeOut(Math.min(1, f.t / 0.9)) * P * 8;
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
      tapAction(e.clientX - r.left, e.clientY - r.top);
    }
    view.canvas.addEventListener('pointerdown', onScenePointer);
    ctx.captureKeys(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyB']);
    ctx.onKey(function (code, down) {
      if (!down || destroyed) return;
      if (code === 'Escape' && modal && S.intro) { closeModal(); return; } // the first-hero picker can't be dismissed
      if (modal) {
        // the shell blocks Space's default, so let Space press the pop-up's main button
        if (code === 'Space') { var pb = modal.el.querySelector('.ig-btn:not(.secondary)'); if (pb) pb.click(); }
        return;
      }
      if (!S.intro) return;
      if (code === 'Space') tapAction(heroX() + rand(-P * 4, P * 4), groundY - heroH() * 0.5);
      else if (/^Digit[1-4]$/.test(code)) clickSlot(+code.charAt(5) - 1);
      else if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (S.heroes.length < 2) return;
        selectHero((S.sel + (code === 'ArrowLeft' ? -1 : 1) + S.heroes.length) % S.heroes.length);
        sfx('click');
        refreshParty(true);
        renderPanel();
      } else if (code === 'ArrowUp' || code === 'ArrowDown') {
        var i = TABS.findIndex(function (t) { return t.id === tab; });
        i = (i + (code === 'ArrowUp' ? -1 : 1) + TABS.length) % TABS.length;
        setTab(TABS[i].id);
        sfx('click');
      } else if (code === 'KeyB') startBoss();
    });

    /* ---------------- loop & lifecycle ---------------- */
    var hudT = 0, saveT = 0, lastWall = Date.now();
    var loop = IGAME.loop(function (dt) {
      // Catch up if the browser throttled us (e.g. tab in background without a visibility event)
      var now = Date.now();
      var gap = (now - lastWall) / 1000;
      lastWall = now;
      if (gap > 3 && S.intro) {
        var sum = applyOffline(gap, true);
        if (sum && sum.gains.gold >= 1) toast('Welcome back! +' + fmt(sum.gains.gold) + ' gold');
      }
      time += dt;
      tick(dt);
      render(dt);
      pumpToast();
      hudT += dt;
      if (hudT > 0.2) {
        hudT = 0;
        updateHud();
        if (dirtyPanel && !panelHover()) renderPanel();
        else updatePanel();
      }
      saveT += dt;
      if (saveT > 5) { saveT = 0; if (S.intro) save(); }
    });
    // Avoid rebuilding the panel under the user's finger/mouse (keeps clicks reliable).
    var pointerInPanel = false;
    function onPanelEnter() { pointerInPanel = true; }
    function onPanelLeave() { pointerInPanel = false; if (dirtyPanel) renderPanel(); }
    panel.addEventListener('pointerenter', onPanelEnter);
    panel.addEventListener('pointerleave', onPanelLeave);
    function panelHover() { return pointerInPanel && !ctx.isTouch; }

    // Startup: offline gains, intro, first render
    for (var k in tabBtns) tabBtns[k].classList.toggle('on', k === tab);
    refreshParty(true);
    renderPanel();
    updateHud();
    if (!S.intro) showIntro();
    else {
      var away = (Date.now() - (S.last || Date.now())) / 1000;
      if (away > 30) applyOffline(away, false);
      else if (away > 1) applyOffline(away, true);
      renderPanel();
    }
    layout();
    placeOverlays();
    recalcGeom();
    loop.start();

    var pausedAt = 0;
    if (ctx.debug) {
      window.__iq = {
        get S() { return S; },
        offline: function (sec) { return applyOffline(sec, false); },
        give: function (n) { S.gold += n; S.ore += n; S.wood += n; S.fish += n; S.glim += n; },
        kills: function () { S.kills[S.frontier] = killsReq(S.frontier); },
        running: function () { return loop.isRunning(); },
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
        if (S.intro && away > 30) applyOffline(away, false);
        else if (S.intro && away > 1) applyOffline(away, true);
        loop.start();
      },
      destroy: function () {
        if (destroyed) return;
        if (S.intro) save();
        destroyed = true;
        loop.stop();
        timers.forEach(clearTimeout);
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', layout);
        view.canvas.removeEventListener('pointerdown', onScenePointer);
        panel.removeEventListener('pointerenter', onPanelEnter);
        panel.removeEventListener('pointerleave', onPanelLeave);
        closeModal();
        view.destroy();
        if (ctx.debug && window.__iq) delete window.__iq;
        root.innerHTML = '';
      },
    };
  });
})();
