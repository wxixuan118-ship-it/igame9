/*!
 * Critter Pop TD — igame9 original balloon-popping tower defense (engine "pop-defense").
 *
 * Garden critters pop drifting party balloons before they reach the burrow.
 * Variants:
 *   classic — 3 maps, 6 critters, 2 upgrade paths × 2 tiers (all buyable), 30 waves
 *   five    — 5 maps, 9 critters (incl. Mole Miner income + Lantern Moth support),
 *             2 paths × 4 tiers (one path past tier 2), an ability per critter, 50 waves + freeplay
 *
 * World units are tiles on a 16×10 grid. Balloons travel along polyline paths by distance `d`.
 * A hit of N damage peels N layers: an outer layer pops and the balloon turns into its first
 * child in place (siblings spawn just behind), which keeps pops cheap and order-stable.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var GW = 16;
  var GH = 10;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function rngFrom(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ================================================================== */
  /* Balloons                                                            */
  /* ================================================================== */
  // speed: tiles/s · hp: hits per layer · leak: lives lost · kids: what is inside
  var BT = [
    { id: 'pip', name: 'Pip', hp: 1, speed: 1.6, r: 0.22, leak: 1, cash: 1, kids: null, col: '#b794f6', dark: '#6d3fc7' },
    { id: 'bop', name: 'Bop', hp: 1, speed: 2.0, r: 0.23, leak: 2, cash: 1, kids: [0], col: '#22c3b5', dark: '#0b7d73' },
    { id: 'zip', name: 'Zip', hp: 1, speed: 2.6, r: 0.23, leak: 3, cash: 1, kids: [1], col: '#ff8a3d', dark: '#c2540f' },
    { id: 'twin', name: 'Twin', hp: 1, speed: 2.8, r: 0.25, leak: 7, cash: 1, kids: [2, 2], col: '#ffd23f', dark: '#a87d00', twin: true },
    { id: 'stripe', name: 'Stripe', hp: 1, speed: 2.5, r: 0.27, leak: 15, cash: 1, kids: [3, 3], col: '#e84393', dark: '#9c1c5c', stripe: '#ffe3f1' },
    { id: 'tin', name: 'Tin', hp: 1, speed: 1.6, r: 0.26, leak: 7, cash: 1, kids: [2, 2], col: '#aeb8c6', dark: '#4f5967', armored: true },
    { id: 'jumbo', name: 'Jumbo', hp: 10, speed: 1.9, r: 0.33, leak: 40, cash: 2, kids: [4, 4], col: '#d08c4a', dark: '#6e4219', quilt: true },
    { id: 'whale', name: 'Cloud Whale', hp: 200, speed: 0.75, r: 0.7, leak: 150, cash: 30, kids: [6, 6, 6, 6], col: '#e6f5ff', dark: '#4f86b3', big: true },
    { id: 'storm', name: 'Storm Whale', hp: 700, speed: 0.5, r: 0.9, leak: 500, cash: 100, kids: [7, 7, 7, 7], col: '#5d618f', dark: '#23264a', big: true, storm: true },
  ];
  function rbeOf(T) {
    var n = T.hp;
    if (T.kids) for (var i = 0; i < T.kids.length; i++) n += rbeOf(BT[T.kids[i]]);
    return n;
  }
  BT.forEach(function (T) {
    T.rbe = rbeOf(T);
  });
  var UNLOCK = [1, 3, 6, 10, 15, 17, 21, 28, 44];
  var SPACING = [0.6, 0.5, 0.42, 0.42, 0.5, 0.75, 0.9, 5, 9];
  var NEW_TIP = {
    zip: 'Zips are fast — place critters near the end of the path too.',
    twin: 'Twins split into two Zips when popped.',
    stripe: 'Stripes hide two Twins — pierce and blasts shine here.',
    tin: 'Tin balloons shrug off sharp hits! Use blasts, hot quills, steel talons or wasps.',
    jumbo: 'Jumbos take 10 hits before they burst into Stripes.',
    whale: 'A Cloud Whale! 200 hits, then 4 Jumbos. Bring heavy damage.',
    storm: 'A Storm Whale! 700 hits and four Cloud Whales inside.',
  };

  /* ================================================================== */
  /* Critters (towers)                                                   */
  /* ================================================================== */
  // Upgrade fx: numbers add, keys ending in "Mul" multiply, booleans replace.
  var DEF_STATS = {
    range: 2, rate: 1, dmg: 1, pierce: 1, speed: 10, count: 1, spread: 0.2, size: 0.1,
    heavy: false, detect: false, radius: 0, frags: 0, bigDmg: 0, stun: 0,
    slow: 0, slowT: 0, splash: 0, acid: 0, freeze: 0, keepSlow: false, slowBig: false,
    shots: 1, chains: 0, chainR: 1.3, bolts: 1, field: 0, beeLife: 2.6, nova: false,
    coins: 0, value: 0, endBonus: 0, interest: 0,
    aura: 0, rangeBuff: 0, rateBuff: 0, heavyAura: false, dmgBuff: 0, discount: 0, reveal: false, slowAura: 0,
  };

  var TOWERS = {
    squirrel: {
      id: 'squirrel', name: 'Burr Squirrel', emoji: '🐿️', cost: 200, kind: 'proj',
      desc: 'Slings sticky burrs at one balloon. Cheap and reliable.',
      base: { range: 2.4, rate: 0.8, dmg: 1, pierce: 2, speed: 15, count: 1, spread: 0.2, size: 0.11 },
      paths: [
        { name: 'Sling', ups: [
          { name: 'Stretchy Sling', cost: 140, desc: 'Longer range, burrs pop 1 more balloon.', fx: { pierce: 1, range: 0.4 } },
          { name: 'Double Burrs', cost: 260, desc: 'Slings two burrs per shot.', fx: { count: 1 } },
          { name: 'Burr Barrage', cost: 750, desc: 'Slings more than twice as fast.', fx: { rateMul: 0.45 } },
          { name: 'Burr Hurricane', cost: 2600, desc: 'Five-burr fans, +1 damage, +3 pierce.', fx: { count: 3, pierce: 3, dmg: 1 } },
        ] },
        { name: 'Aim', ups: [
          { name: 'Keen Eyes', cost: 100, desc: 'Much longer range.', fx: { range: 0.8 } },
          { name: 'Night Goggles', cost: 220, desc: 'Sees and targets hidden balloons.', fx: { detect: true } },
          { name: 'Spiked Burrs', cost: 900, desc: '+1 damage and +3 pierce.', fx: { dmg: 1, pierce: 3 } },
          { name: 'Giant Pinecone', cost: 2200, desc: 'Huge pinecones crush armor and roll through crowds.', fx: { heavy: true, dmg: 2, pierce: 15, size: 0.12, speedMul: 0.7 } },
        ] },
      ],
      ability: { name: 'Burr Blitz', desc: 'Triple attack speed for 8 s', cd: 45 },
    },
    hedgehog: {
      id: 'hedgehog', name: 'Spiny Hedgehog', emoji: '🦔', cost: 280, kind: 'ring', noTarget: true,
      desc: 'Fires spines in every direction. Great on corners.',
      base: { range: 1.7, rate: 1.1, dmg: 1, pierce: 1, speed: 9, count: 8, size: 0.09 },
      paths: [
        { name: 'Spines', ups: [
          { name: 'Long Spines', cost: 160, desc: 'More range, spines pop 2 balloons.', fx: { range: 0.4, pierce: 1 } },
          { name: 'Spine Storm', cost: 320, desc: '12 spines per volley.', fx: { count: 4 } },
          { name: 'Bristle Burst', cost: 850, desc: '16 spines, almost twice as fast.', fx: { rateMul: 0.55, count: 4 } },
          { name: 'Thorn Cyclone', cost: 3000, desc: '24 spines, +1 damage, +3 pierce.', fx: { count: 8, pierce: 3, dmg: 1 } },
        ] },
        { name: 'Heat', ups: [
          { name: 'Quick Quills', cost: 220, desc: 'Fires 33% faster.', fx: { rateMul: 0.75 } },
          { name: 'Hot Quills', cost: 400, desc: 'Hot spines pop Tin balloons.', fx: { heavy: true } },
          { name: 'Ember Ring', cost: 1100, desc: 'A burning ring hits everything in range.', fx: { nova: true, dmg: 1 } },
          { name: 'Sun Ring', cost: 3400, desc: 'Bigger, hotter, faster ring.', fx: { range: 0.6, dmg: 2, rateMul: 0.7 } },
        ] },
      ],
      ability: { name: 'Spine Nova', desc: '48 hot spines burst out at once', cd: 40 },
    },
    beetle: {
      id: 'beetle', name: 'Bombardier Beetle', emoji: '🪲', cost: 520, kind: 'bomb',
      desc: 'Lobs seed bombs that blast groups and pop Tin balloons.',
      base: { range: 2.4, rate: 1.3, dmg: 1, pierce: 14, speed: 8, radius: 0.85, heavy: true, size: 0.15 },
      paths: [
        { name: 'Blast', ups: [
          { name: 'Bigger Blasts', cost: 260, desc: 'Wider blasts that pop 8 more.', fx: { radius: 0.3, pierce: 8 } },
          { name: 'Burst Pods', cost: 400, desc: 'Each blast throws 6 seed fragments.', fx: { frags: 6 } },
          { name: 'Thunder Pod', cost: 1200, desc: '+4 damage to Jumbos and whales.', fx: { bigDmg: 4 } },
          { name: 'Garden Quake', cost: 3600, desc: 'Massive blasts: +3 damage, huge radius.', fx: { dmg: 3, radius: 0.6, pierce: 30, bigDmg: 8 } },
        ] },
        { name: 'Launcher', ups: [
          { name: 'Long Lob', cost: 200, desc: 'Much longer range.', fx: { range: 0.8 } },
          { name: 'Quick Fuse', cost: 320, desc: 'Throws 40% faster.', fx: { rateMul: 0.72 } },
          { name: 'Stun Spores', cost: 950, desc: 'Blasts stun balloons for a moment.', fx: { stun: 0.6 } },
          { name: 'Spore Storm', cost: 2900, desc: 'Longer stuns, faster throws, wider blasts.', fx: { stun: 0.6, rateMul: 0.6, radius: 0.3 } },
        ] },
      ],
      ability: { name: 'Seed Barrage', desc: '10 heavy bombs rain on the path', cd: 45 },
    },
    snail: {
      id: 'snail', name: 'Slime Snail', emoji: '🐌', cost: 260, kind: 'slime',
      desc: 'Spits slime that slows balloons down. Prefers unslimed ones.',
      base: { range: 2.1, rate: 1.1, dmg: 0, pierce: 1, speed: 10, slow: 0.5, slowT: 4, size: 0.12 },
      paths: [
        { name: 'Goo', ups: [
          { name: 'Gooier Slime', cost: 150, desc: 'Stronger, longer slow that sticks to inner layers.', fx: { slow: 0.1, slowT: 6, keepSlow: true } },
          { name: 'Splat Slime', cost: 300, desc: 'Slime splashes onto 4 nearby balloons.', fx: { splash: 4 } },
          { name: 'Acid Slime', cost: 800, desc: 'Slimed balloons lose a layer every 1.5 s.', fx: { acid: 1 } },
          { name: 'Super Slime', cost: 2600, desc: 'Slows whales too; stronger acid, bigger splash.', fx: { splash: 8, acid: 1, slowBig: true } },
        ] },
        { name: 'Spit', ups: [
          { name: 'Quick Spit', cost: 130, desc: 'Spits 65% faster.', fx: { rateMul: 0.6 } },
          { name: 'Long Spit', cost: 200, desc: 'Much longer range.', fx: { range: 0.9 } },
          { name: 'Frost Slime', cost: 900, desc: 'Slimed balloons freeze solid briefly.', fx: { freeze: 0.9 } },
          { name: 'Glacier Snail', cost: 2400, desc: 'Longer freezes, stronger slow, faster spit.', fx: { freeze: 0.6, slow: 0.15, rateMul: 0.6 } },
        ] },
      ],
      ability: { name: 'Slime Flood', desc: 'Slows every balloon on the map for 6 s', cd: 45 },
    },
    owl: {
      id: 'owl', name: 'Barn Owl', emoji: '🦉', cost: 350, kind: 'snipe',
      desc: 'Swoops on balloons anywhere on the map. Sees hidden balloons.',
      base: { range: 99, rate: 1.7, dmg: 2, pierce: 1, detect: true },
      paths: [
        { name: 'Talons', ups: [
          { name: 'Sharp Talons', cost: 300, desc: '+2 damage.', fx: { dmg: 2 } },
          { name: 'Steel Talons', cost: 450, desc: '+1 damage and pops Tin balloons.', fx: { heavy: true, dmg: 1 } },
          { name: 'Great Horned', cost: 2200, desc: '+8 damage per swoop.', fx: { dmg: 8 } },
          { name: 'Night Hunter', cost: 5000, desc: '+18 damage, +20 vs whales.', fx: { dmg: 18, bigDmg: 20 } },
        ] },
        { name: 'Wings', ups: [
          { name: 'Quick Wings', cost: 250, desc: 'Swoops 43% faster.', fx: { rateMul: 0.7 } },
          { name: 'Swift Wings', cost: 400, desc: 'Swoops 43% faster again.', fx: { rateMul: 0.7 } },
          { name: 'Owlet Trio', cost: 2600, desc: 'Hits three balloons per swoop.', fx: { shots: 2 } },
          { name: 'Moonlit Parliament', cost: 5200, desc: 'Six targets per swoop, much faster.', fx: { shots: 3, rateMul: 0.55 } },
        ] },
      ],
      ability: { name: 'Talon Strike', desc: '500 damage to the strongest balloon', cd: 50 },
    },
    hive: {
      id: 'hive', name: 'Bumble Hive', emoji: '🐝', cost: 600, kind: 'bees',
      desc: 'Releases bees that chase balloons and sting through several.',
      base: { range: 2.6, rate: 0.85, dmg: 1, pierce: 3, speed: 6.5, count: 1, beeLife: 2.6 },
      paths: [
        { name: 'Swarm', ups: [
          { name: 'More Bees', cost: 300, desc: 'Two bees per release.', fx: { count: 1 } },
          { name: 'Wasp Escort', cost: 600, desc: '+3 pierce, stings pop Tin.', fx: { pierce: 3, heavy: true } },
          { name: "Queen's Guard", cost: 1600, desc: 'Four bees per release.', fx: { count: 2 } },
          { name: 'Swarm Queen', cost: 5000, desc: 'Six bees, +2 damage each.', fx: { count: 2, dmg: 2 } },
        ] },
        { name: 'Honey', ups: [
          { name: 'Busy Bees', cost: 220, desc: 'Releases bees 33% faster.', fx: { rateMul: 0.75 } },
          { name: 'Honey Sting', cost: 450, desc: 'Stung balloons slow down.', fx: { slow: 0.3, slowT: 1.5 } },
          { name: 'Royal Jelly', cost: 1300, desc: 'Much faster and longer range.', fx: { rateMul: 0.6, range: 0.6 } },
          { name: 'Honey Flood', cost: 3900, desc: '+1 damage, +6 pierce, faster.', fx: { dmg: 1, pierce: 6, rateMul: 0.7 } },
        ] },
      ],
      ability: { name: 'Swarm', desc: 'Releases 30 bees at once', cd: 40 },
    },
    firefly: {
      id: 'firefly', name: 'Storm Firefly', emoji: '✨', cost: 750, kind: 'zap',
      desc: 'Chain lightning jumps between balloons and pops Tin.',
      base: { range: 2.3, rate: 1.25, dmg: 1, chains: 4, chainR: 1.3, heavy: true, bolts: 1 },
      paths: [
        { name: 'Arc', ups: [
          { name: 'Longer Arc', cost: 300, desc: 'Lightning jumps 3 more times.', fx: { chains: 3 } },
          { name: 'Forked Bolts', cost: 650, desc: 'Two bolts per zap.', fx: { bolts: 1 } },
          { name: 'Thunder Jar', cost: 1900, desc: '+1 damage, 5 more jumps.', fx: { dmg: 1, chains: 5 } },
          { name: 'Storm Lord', cost: 5600, desc: 'Three bolts, +3 damage, 6 more jumps.', fx: { dmg: 3, bolts: 1, chains: 6 } },
        ] },
        { name: 'Glow', ups: [
          { name: 'Static Charge', cost: 250, desc: 'Zaps 33% faster.', fx: { rateMul: 0.75 } },
          { name: 'Bright Glow', cost: 320, desc: 'Sees hidden balloons, more range.', fx: { detect: true, range: 0.4 } },
          { name: 'Spark Field', cost: 1500, desc: 'Sparks hit every balloon in range.', fx: { field: 1 } },
          { name: 'Plasma Bulb', cost: 4400, desc: 'Triple-speed sparks, faster bolts.', fx: { field: 2, rateMul: 0.6 } },
        ] },
      ],
      ability: { name: 'Thunderclap', desc: 'Zaps up to 40 balloons for 3 damage', cd: 45 },
    },
    mole: {
      id: 'mole', name: 'Mole Miner', emoji: '⛏️', cost: 900, kind: 'farm', noTarget: true,
      desc: 'Digs up coins during every wave. Pays for itself over time.',
      base: { coins: 4, value: 20 },
      paths: [
        { name: 'Dig', ups: [
          { name: 'Deeper Tunnels', cost: 400, desc: 'Digs 2 more coins each wave.', fx: { coins: 2 } },
          { name: 'Gem Vein', cost: 900, desc: 'Coins are worth $10 more.', fx: { value: 10 } },
          { name: 'Gold Seam', cost: 2400, desc: '4 more coins, +$5 each.', fx: { coins: 4, value: 5 } },
          { name: 'Treasure Den', cost: 5000, desc: '4 more coins, +$15 each.', fx: { coins: 4, value: 15 } },
        ] },
        { name: 'Trade', ups: [
          { name: 'Lucky Clover', cost: 300, desc: '+$40 when each wave ends.', fx: { endBonus: 40 } },
          { name: 'Coin Cart', cost: 700, desc: '+$80 more when each wave ends.', fx: { endBonus: 80 } },
          { name: 'Garden Bank', cost: 2000, desc: '4% interest on your cash after each wave (max $400).', fx: { interest: 0.04 } },
          { name: 'Golden Mole', cost: 4500, desc: '+$300 per wave and 6% interest.', fx: { endBonus: 300, interest: 0.02 } },
        ] },
      ],
      ability: { name: 'Treasure Dig', desc: 'Digs up $600 right now', cd: 60 },
    },
    moth: {
      id: 'moth', name: 'Lantern Moth', emoji: '🌙', cost: 700, kind: 'aura', noTarget: true,
      desc: 'Support: critters in its glow see hidden balloons and get +10% range.',
      base: { aura: 2.0, rangeBuff: 0.1 },
      paths: [
        { name: 'Light', ups: [
          { name: 'Bright Lantern', cost: 300, desc: 'Bigger glow.', fx: { aura: 0.6 } },
          { name: 'Warm Glow', cost: 900, desc: 'Critters in the glow attack 15% faster.', fx: { rateBuff: 0.15 } },
          { name: 'Beacon', cost: 2200, desc: 'Critters in the glow pop Tin balloons.', fx: { heavyAura: true } },
          { name: 'Moon Lantern', cost: 5000, desc: '+1 damage and +10% speed in the glow.', fx: { dmgBuff: 1, rateBuff: 0.1 } },
        ] },
        { name: 'Lure', ups: [
          { name: 'Reveal Dust', cost: 250, desc: 'Hidden balloons in the glow are revealed for good.', fx: { reveal: true } },
          { name: 'Glow Market', cost: 600, desc: 'Critters and upgrades in the glow cost 10% less.', fx: { discount: 0.1 } },
          { name: 'Moth Dust', cost: 1500, desc: 'Balloons in the glow move 20% slower.', fx: { slowAura: 0.2 } },
          { name: 'Moonbeam', cost: 3800, desc: 'Even slower balloons, 15% discount.', fx: { slowAura: 0.15, discount: 0.05 } },
        ] },
      ],
      ability: { name: 'Full Moon', desc: 'All critters attack twice as fast for 8 s', cd: 60 },
    },
  };

  /* ================================================================== */
  /* Maps (paths in tile coordinates; tile centres are x + 0.5)          */
  /* ================================================================== */
  var MAPS = {
    meadow: {
      id: 'meadow', name: 'Sunny Meadow', level: 'Beginner',
      grass: ['#7cc46a', '#73bb61'], path: '#e2c48f', edge: '#b08d5e',
      paths: [[[-1, 1.5], [13.5, 1.5], [13.5, 4.5], [2.5, 4.5], [2.5, 8.5], [17, 8.5]]],
      water: [], rocks: [[6, 7], [10, 6]], seed: 11,
    },
    pond: {
      id: 'pond', name: 'Lily Pond', level: 'Intermediate',
      grass: ['#6fbf73', '#66b56a'], path: '#d9b98a', edge: '#a07f55',
      paths: [[[8.5, -1], [8.5, 2.5], [2.5, 2.5], [2.5, 7.5], [12.5, 7.5], [12.5, 3.5], [17, 3.5]]],
      water: [[5, 4, 6, 2]], rocks: [[0, 0], [15, 9]], seed: 23,
    },
    creek: {
      id: 'creek', name: 'Crossing Creek', level: 'Intermediate',
      grass: ['#86c46b', '#7dba62'], path: '#cfb184', edge: '#9a7a4f',
      paths: [[[-1, 3.5], [11.5, 3.5], [11.5, 8.5], [6.5, 8.5], [6.5, 1.5], [14.5, 1.5], [14.5, 11]]],
      water: [[1, 6, 3, 2]], rocks: [[9, 6], [3, 0]], seed: 37,
    },
    ridge: {
      id: 'ridge', name: 'Windy Ridge', level: 'Advanced',
      grass: ['#8fbf62', '#86b55a'], path: '#c9b08a', edge: '#8e7553',
      paths: [[[-1, 5.5], [5.5, 5.5], [5.5, 1.5], [10.5, 1.5], [10.5, 8.5], [17, 8.5]]],
      water: [], rocks: [[1, 2], [2, 8], [8, 4], [8, 5], [13, 4], [14, 2], [7, 8], [3, 3]], seed: 53,
    },
    burrows: {
      id: 'burrows', name: 'Twin Burrows', level: 'Expert',
      grass: ['#79b86a', '#70ae61'], path: '#d6b98c', edge: '#9c7c52',
      paths: [
        [[-1, 1.5], [9.5, 1.5], [9.5, 3.5], [17, 3.5]],
        [[-1, 8.5], [5.5, 8.5], [5.5, 6.5], [17, 6.5]],
      ],
      water: [], rocks: [[13, 0], [2, 5], [12, 9]], seed: 71,
    },
  };

  var DIFFS = [
    { id: 'easy', name: 'Easy', lives: 200, cost: 0.85, speed: 1, medal: '#d08b4a', note: '200 lives · 15% cheaper' },
    { id: 'medium', name: 'Medium', lives: 150, cost: 1, speed: 1, medal: '#c9d2dc', note: '150 lives · normal prices' },
    { id: 'hard', name: 'Hard', lives: 100, cost: 1.1, speed: 1.1, medal: '#facc15', note: '100 lives · pricier, faster' },
  ];

  var VARIANTS = {
    classic: {
      towers: ['squirrel', 'hedgehog', 'beetle', 'snail', 'owl', 'hive'],
      maps: ['meadow', 'pond', 'ridge'],
      waves: 30, tiers: 2, crossLimit: false, abilities: false, freeplay: false,
    },
    five: {
      towers: ['squirrel', 'hedgehog', 'beetle', 'snail', 'owl', 'hive', 'firefly', 'mole', 'moth'],
      maps: ['meadow', 'pond', 'creek', 'ridge', 'burrows'],
      waves: 50, tiers: 4, crossLimit: true, abilities: true, freeplay: true,
    },
  };

  var TARGETS = ['First', 'Last', 'Strong', 'Close'];
  var START_CASH = 650;

  var CSS = [
    '.pd-panel{position:absolute;z-index:3;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:10px;background:linear-gradient(180deg,#1a3a27,#10261a);color:#eafbe9;font:600 13px/1.25 var(--font,system-ui,sans-serif);user-select:none;-webkit-user-select:none;touch-action:manipulation;overflow:hidden}',
    '.pd-panel.pd-side{border-left:2px solid #2f6343}',
    '.pd-panel.pd-bottom{border-top:2px solid #2f6343;padding:7px 8px;gap:6px}',
    '.pd-top{display:flex;flex-direction:column;gap:6px}',
    '.pd-bottom .pd-top{flex-direction:row;align-items:stretch}',
    '.pd-stats{display:flex;gap:5px}',
    '.pd-bottom .pd-stats{flex:1 1 auto;min-width:0}',
    '.pd-stat{flex:1 1 0;min-width:0;background:rgba(0,0,0,.3);border-radius:10px;padding:5px 3px;font-weight:900;font-size:14px;white-space:nowrap;text-align:center;overflow:hidden;text-overflow:ellipsis}',
    '.pd-bottom .pd-stat{font-size:13px;padding:6px 4px}',
    '.pd-stat small{display:block;font-size:10px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:.06em}',
    '.pd-bottom .pd-stat small{display:none}',
    '.pd-ctrls{display:flex;gap:5px}',
    '.pd-b{font:800 13px var(--font,system-ui,sans-serif);color:#fff;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.09);border-radius:10px;padding:6px 9px;cursor:pointer;touch-action:manipulation;min-height:34px;white-space:nowrap}',
    '.pd-b:hover{background:rgba(255,255,255,.16)}',
    '.pd-b:focus-visible,.pd-item:focus-visible,.pd-up:focus-visible,.pd-map:focus-visible{outline:2px solid #fde047;outline-offset:1px}',
    '.pd-b.pd-on{background:#f59e0b;color:#231600;border-color:transparent}',
    '.pd-b[disabled]{opacity:.45;cursor:default}',
    '.pd-go{flex:1 1 auto;background:linear-gradient(135deg,#22c55e,#15803d);border-color:transparent}',
    '.pd-go.pd-busy{background:rgba(255,255,255,.08)}',
    '.pd-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}',
    '.pd-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}',
    '.pd-bottom .pd-shop{grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:5px}',
    '.pd-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px 4px;border-radius:10px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font:700 11px var(--font,system-ui,sans-serif);touch-action:manipulation;min-width:0}',
    '.pd-item:hover{background:rgba(255,255,255,.12)}',
    '.pd-item canvas{width:38px;height:38px;display:block}',
    '.pd-bottom .pd-item canvas{width:32px;height:32px}',
    '.pd-item .pd-nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pd-price{color:#fde047;font-weight:900}',
    '.pd-item.pd-poor{opacity:.45}',
    '.pd-item.pd-sel{border-color:#fde047;background:rgba(253,224,71,.18)}',
    '.pd-key{position:absolute;top:2px;left:5px;font-size:10px;opacity:.5}',
    '.pd-hint{font-size:12px;color:#c4e8cc;line-height:1.3}',
    '.pd-hint b{color:#fff}',
    '.pd-next{font-size:11px;color:#a7d3b2;margin-top:6px;line-height:1.35}',
    '.pd-next b{color:#fff}',
    '.pd-info{display:flex;flex-direction:column;gap:6px}',
    '.pd-ihead{display:flex;align-items:center;gap:8px}',
    '.pd-ihead canvas{width:34px;height:34px;flex:0 0 auto}',
    '.pd-iname{flex:1 1 auto;min-width:0;font-weight:900;font-size:15px;line-height:1.1}',
    '.pd-iname small{display:block;font-size:11px;font-weight:600;opacity:.75}',
    '.pd-x{min-height:30px;padding:4px 10px}',
    '.pd-ups{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
    '.pd-up{text-align:left;display:flex;flex-direction:column;gap:2px;padding:6px 7px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(34,197,94,.16);color:#fff;cursor:pointer;font:700 12px var(--font,system-ui,sans-serif);min-width:0;touch-action:manipulation}',
    '.pd-up:hover{background:rgba(34,197,94,.26)}',
    '.pd-pips{letter-spacing:1px;font-size:10px;color:#fde047}',
    '.pd-pips i{font-style:normal;opacity:.35}',
    '.pd-uname{font-weight:900;line-height:1.15}',
    '.pd-udesc{font-weight:500;font-size:11px;opacity:.82;line-height:1.25}',
    '.pd-up.pd-poor{background:rgba(255,255,255,.06)}',
    '.pd-up.pd-poor .pd-price{color:#fca5a5}',
    '.pd-up.pd-max,.pd-up.pd-lock{background:rgba(0,0,0,.2);cursor:default}',
    '.pd-irow{display:flex;gap:6px}',
    '.pd-irow .pd-b{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '.pd-sell{background:rgba(239,68,68,.22)}',
    '.pd-ab{background:linear-gradient(135deg,#8b5cf6,#4f46e5);border-color:transparent}',
    '.pd-tight .pd-udesc{display:none}',
    '.pd-abbar{position:absolute;z-index:3;display:flex;gap:5px;pointer-events:none}',
    '.pd-abbtn{pointer-events:auto;position:relative;width:38px;height:38px;border-radius:50%;border:2px solid #fde047;background:rgba(20,30,50,.75);font-size:18px;line-height:34px;text-align:center;cursor:pointer;padding:0;color:#fff;touch-action:manipulation}',
    '.pd-abbtn[disabled]{border-color:rgba(255,255,255,.3);cursor:default}',
    '.pd-abbtn span{position:absolute;inset:0;border-radius:50%;font:800 11px/34px var(--font,system-ui,sans-serif);background:rgba(0,0,0,.55);color:#fff}',
    '.pd-maps{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin:2px 0 10px;text-align:left}',
    '.pd-map{display:flex;flex-direction:column;gap:3px;padding:6px;border-radius:12px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;cursor:pointer;font:700 12px var(--font,system-ui,sans-serif);touch-action:manipulation}',
    '.pd-map.pd-msel{border-color:#fde047;background:rgba(253,224,71,.12)}',
    '.pd-map canvas{width:100%;height:auto;aspect-ratio:16/10;border-radius:8px;display:block}',
    '.pd-map b{font-size:13px}',
    '.pd-mrow{display:flex;justify-content:space-between;align-items:center;gap:4px;opacity:.9}',
    '.pd-medals{display:flex;gap:3px}',
    '.pd-medals i{width:11px;height:11px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);display:inline-block}',
    '.pd-diffs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px}',
    '.pd-diffs .pd-b{display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 4px;white-space:normal}',
    '.pd-diffs small{font-size:10px;font-weight:600;opacity:.85}',
    '.pd-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7;margin:0 0 6px;text-align:left}',
    '.pd-statrow{display:flex;justify-content:center;gap:20px;margin:2px 0 12px}',
    '.pd-statrow div{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.8}',
    '.pd-statrow b{display:block;font:900 22px var(--font,system-ui,sans-serif);color:#fff;letter-spacing:0}',
    '.pd-help{text-align:left;font-size:13px;line-height:1.45;margin:0 0 12px;padding-left:18px}',
    '.pd-help li{margin:3px 0}',
  ].join('\n');

  /* ================================================================== */
  /* Path helpers                                                        */
  /* ================================================================== */
  function buildPath(pts) {
    var segs = [];
    var len = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var dx = pts[i + 1][0] - pts[i][0];
      var dy = pts[i + 1][1] - pts[i][1];
      var l = Math.sqrt(dx * dx + dy * dy);
      segs.push({ x0: pts[i][0], y0: pts[i][1], dx: dx / l, dy: dy / l, l: l, s: len });
      len += l;
    }
    return { pts: pts, segs: segs, len: len };
  }
  function pathAt(P, d, out) {
    var segs = P.segs;
    var lo = 0;
    var hi = segs.length - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (segs[mid].s <= d) lo = mid;
      else hi = mid - 1;
    }
    var s = segs[lo];
    var u = clamp(d - s.s, 0, s.l);
    out.x = s.x0 + s.dx * u;
    out.y = s.y0 + s.dy * u;
    out.a = Math.atan2(s.dy, s.dx);
  }
  function distToSeg(px, py, x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var l2 = dx * dx + dy * dy;
    var u = l2 ? clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1) : 0;
    var qx = x0 + dx * u - px;
    var qy = y0 + dy * u - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  // Which tiles are buildable: 0 free · 1 path · 2 water · 3 rock
  function buildTiles(M) {
    var tiles = new Uint8Array(GW * GH);
    for (var y = 0; y < GH; y++)
      for (var x = 0; x < GW; x++) {
        var cx = x + 0.5;
        var cy = y + 0.5;
        for (var p = 0; p < M.paths.length && !tiles[y * GW + x]; p++) {
          var pts = M.paths[p];
          for (var i = 0; i < pts.length - 1; i++)
            if (distToSeg(cx, cy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < 0.75) {
              tiles[y * GW + x] = 1;
              break;
            }
        }
      }
    M.water.forEach(function (w) {
      for (var y = w[1]; y < w[1] + w[3]; y++) for (var x = w[0]; x < w[0] + w[2]; x++) if (!tiles[y * GW + x]) tiles[y * GW + x] = 2;
    });
    M.rocks.forEach(function (r) {
      if (!tiles[r[1] * GW + r[0]]) tiles[r[1] * GW + r[0]] = 3;
    });
    return tiles;
  }

  /* ================================================================== */
  /* Drawing helpers shared by sprites, icons and the map                */
  /* All in tile units: (0,0) is the centre, 1 = one tile.               */
  /* ================================================================== */
  function ell(c, x, y, rx, ry, rot) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }
  function circ(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  }

  function drawBalloon(c, T, hidden) {
    var r = T.r;
    c.save();
    if (hidden) c.globalAlpha = 0.5;
    // string
    c.strokeStyle = 'rgba(255,255,255,.7)';
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(0, r * 1.02);
    c.quadraticCurveTo(r * 0.35, r * 1.35, 0, r * 1.7);
    c.stroke();
    var lobes = T.twin ? [[-r * 0.42, 0.04, r * 0.7], [r * 0.42, -0.04, r * 0.7]] : [[0, 0, r]];
    for (var i = 0; i < lobes.length; i++) {
      var lx = lobes[i][0];
      var ly = lobes[i][1];
      var lr = lobes[i][2];
      // knot
      c.fillStyle = T.dark;
      c.beginPath();
      c.moveTo(lx - lr * 0.16, ly + lr * 1.08);
      c.lineTo(lx + lr * 0.16, ly + lr * 1.08);
      c.lineTo(lx, ly + lr * 0.9);
      c.closePath();
      c.fill();
      ell(c, lx, ly, lr * 0.88, lr, 0);
      var gr = c.createRadialGradient(lx - lr * 0.35, ly - lr * 0.4, lr * 0.1, lx, ly, lr * 1.1);
      if (T.armored) {
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.35, T.col);
        gr.addColorStop(1, T.dark);
      } else {
        gr.addColorStop(0, 'rgba(255,255,255,.9)');
        gr.addColorStop(0.25, T.col);
        gr.addColorStop(1, T.dark);
      }
      c.fillStyle = gr;
      c.fill();
      if (T.stripe || T.quilt) {
        c.save();
        ell(c, lx, ly, lr * 0.88, lr, 0);
        c.clip();
        if (T.stripe) {
          c.strokeStyle = T.stripe;
          c.globalAlpha *= 0.8;
          c.lineWidth = lr * 0.22;
          for (var k = -3; k <= 3; k++) {
            c.beginPath();
            c.moveTo(lx + k * lr * 0.55 - lr, ly - lr * 1.2);
            c.lineTo(lx + k * lr * 0.55 + lr, ly + lr * 1.2);
            c.stroke();
          }
        } else {
          // patchwork quilt: four coloured patches with stitches
          var cols = ['#e7a35f', '#9b5d2a', '#c46a3a', '#f0c27a'];
          for (var q = 0; q < 4; q++) {
            c.fillStyle = cols[q];
            c.globalAlpha = 0.55;
            c.fillRect(lx + (q % 2 ? 0 : -lr), ly + (q < 2 ? -lr * 1.1 : 0), lr, lr * 1.1);
          }
          c.globalAlpha = hidden ? 0.5 : 1;
          c.strokeStyle = '#fff3dc';
          c.lineWidth = 0.02;
          c.setLineDash([0.05, 0.04]);
          c.beginPath();
          c.moveTo(lx, ly - lr);
          c.lineTo(lx, ly + lr);
          c.moveTo(lx - lr, ly);
          c.lineTo(lx + lr, ly);
          c.stroke();
          c.setLineDash([]);
        }
        c.restore();
        if (hidden) c.globalAlpha = 0.5;
      }
      if (T.armored) {
        c.fillStyle = 'rgba(40,48,60,.7)';
        for (var rv = 0; rv < 6; rv++) {
          var ra = (rv / 6) * TAU + 0.3;
          circ(c, lx + Math.cos(ra) * lr * 0.68, ly + Math.sin(ra) * lr * 0.78, lr * 0.07);
          c.fill();
        }
      }
      // shine
      c.fillStyle = 'rgba(255,255,255,.55)';
      ell(c, lx - lr * 0.34, ly - lr * 0.42, lr * 0.2, lr * 0.3, -0.5);
      c.fill();
      c.strokeStyle = T.dark;
      c.lineWidth = 0.03;
      ell(c, lx, ly, lr * 0.88, lr, 0);
      c.stroke();
    }
    if (hidden) {
      c.globalAlpha = 0.95;
      c.strokeStyle = '#ffffff';
      c.lineWidth = 0.035;
      c.setLineDash([0.07, 0.06]);
      circ(c, 0, 0, r * 1.18);
      c.stroke();
      c.setLineDash([]);
    }
    c.restore();
  }

  function drawWhale(c, T, ang, hpFrac, t) {
    var r = T.r;
    c.save();
    c.rotate(ang);
    if (Math.cos(ang) < 0) c.scale(1, -1);
    // shadow-ish outline
    var L = r * 1.25;
    var Hh = r * 0.72;
    // tail
    c.fillStyle = T.dark;
    c.beginPath();
    c.moveTo(-L * 0.85, 0);
    c.lineTo(-L * 1.25, -Hh * 0.75 + Math.sin(t * 4) * 0.05);
    c.lineTo(-L * 1.12, 0);
    c.lineTo(-L * 1.25, Hh * 0.75 - Math.sin(t * 4) * 0.05);
    c.closePath();
    c.fill();
    // body
    var gr = c.createLinearGradient(0, -Hh, 0, Hh);
    gr.addColorStop(0, T.storm ? '#8c90c8' : '#ffffff');
    gr.addColorStop(0.55, T.col);
    gr.addColorStop(1, T.dark);
    c.fillStyle = gr;
    ell(c, 0, 0, L, Hh, 0);
    c.fill();
    c.strokeStyle = T.dark;
    c.lineWidth = 0.04;
    c.stroke();
    // belly stripes
    c.strokeStyle = T.storm ? 'rgba(250,204,21,.85)' : 'rgba(79,134,179,.45)';
    c.lineWidth = T.storm ? 0.07 : 0.035;
    c.beginPath();
    if (T.storm) {
      c.moveTo(-L * 0.6, -Hh * 0.1);
      c.lineTo(-L * 0.2, Hh * 0.2);
      c.lineTo(0, -Hh * 0.05);
      c.lineTo(L * 0.35, Hh * 0.28);
    } else {
      for (var i = -1; i <= 1; i++) {
        c.moveTo(-L * 0.4, Hh * (0.35 + i * 0.12));
        c.quadraticCurveTo(0, Hh * (0.55 + i * 0.12), L * 0.55, Hh * (0.3 + i * 0.1));
      }
    }
    c.stroke();
    // fin
    c.fillStyle = T.dark;
    ell(c, -L * 0.05, Hh * 0.55, L * 0.22, Hh * 0.18, 0.5);
    c.fill();
    // eye
    c.fillStyle = '#fff';
    circ(c, L * 0.6, -Hh * 0.18, r * 0.13);
    c.fill();
    c.fillStyle = '#1f2937';
    circ(c, L * 0.63, -Hh * 0.18, r * 0.07);
    c.fill();
    // smile
    c.strokeStyle = T.dark;
    c.lineWidth = 0.03;
    c.beginPath();
    c.arc(L * 0.7, Hh * 0.05, r * 0.16, 0.2, 1.4);
    c.stroke();
    // little gondola cable + basket
    c.restore();
    // hp bar (unrotated)
    var w = r * 1.6;
    c.fillStyle = 'rgba(0,0,0,.55)';
    c.fillRect(-w / 2, -r * 1.05, w, 0.09);
    c.fillStyle = hpFrac > 0.5 ? '#4ade80' : hpFrac > 0.25 ? '#facc15' : '#f87171';
    c.fillRect(-w / 2 + 0.015, -r * 1.05 + 0.015, (w - 0.03) * clamp(hpFrac, 0, 1), 0.06);
  }

  // Critters. `ang` is facing (radians), `tiers` [a, b], `t` time for idle animation.
  function drawCritter(c, id, ang, tiers, t) {
    var ta = tiers ? tiers[0] : 0;
    var tb = tiers ? tiers[1] : 0;
    c.save();
    // shadow
    c.fillStyle = 'rgba(0,0,0,.18)';
    ell(c, 0.03, 0.1, 0.36, 0.28, 0);
    c.fill();
    switch (id) {
      case 'squirrel': {
        c.rotate(ang);
        // tail
        c.fillStyle = '#8b4f24';
        ell(c, -0.24, 0.02, 0.17, 0.25, 0);
        c.fill();
        c.fillStyle = '#c47d3e';
        ell(c, -0.26, 0.02, 0.09, 0.16, 0);
        c.fill();
        // body
        c.fillStyle = '#b5703a';
        ell(c, -0.02, 0, 0.19, 0.16, 0);
        c.fill();
        // head
        c.fillStyle = '#c98146';
        circ(c, 0.14, 0, 0.12);
        c.fill();
        c.fillStyle = '#7a4019';
        c.beginPath();
        c.moveTo(0.1, -0.09);
        c.lineTo(0.17, -0.2);
        c.lineTo(0.2, -0.08);
        c.moveTo(0.1, 0.09);
        c.lineTo(0.17, 0.2);
        c.lineTo(0.2, 0.08);
        c.fill();
        c.fillStyle = '#1b1b1b';
        circ(c, 0.19, -0.05, 0.025);
        c.fill();
        circ(c, 0.19, 0.05, 0.025);
        c.fill();
        if (tb >= 2) {
          c.strokeStyle = '#22d3ee';
          c.lineWidth = 0.025;
          circ(c, 0.19, -0.05, 0.045);
          c.stroke();
          circ(c, 0.19, 0.05, 0.045);
          c.stroke();
        }
        // slingshot
        c.strokeStyle = ta >= 3 ? '#facc15' : '#5b3313';
        c.lineWidth = 0.04;
        c.beginPath();
        c.moveTo(0.26, 0);
        c.lineTo(0.34, 0);
        c.moveTo(0.34, 0);
        c.lineTo(0.42, -0.08);
        c.moveTo(0.34, 0);
        c.lineTo(0.42, 0.08);
        c.stroke();
        c.strokeStyle = '#f43f5e';
        c.lineWidth = 0.02;
        c.beginPath();
        c.moveTo(0.42, -0.08);
        c.lineTo(0.37, 0);
        c.lineTo(0.42, 0.08);
        c.stroke();
        if (tb >= 4) {
          c.fillStyle = '#7c4a1e';
          ell(c, 0.36, 0, 0.07, 0.05, 0);
          c.fill();
        }
        break;
      }
      case 'hedgehog': {
        var hot = tb >= 2;
        var n = 14 + Math.min(10, ta * 2);
        c.fillStyle = hot ? '#ea580c' : '#4a3426';
        c.beginPath();
        for (var i = 0; i < n; i++) {
          var a = (i / n) * TAU + t * 0.2;
          var a1 = a - 0.18;
          var a2 = a + 0.18;
          c.moveTo(Math.cos(a1) * 0.25, Math.sin(a1) * 0.25);
          c.lineTo(Math.cos(a) * 0.42, Math.sin(a) * 0.42);
          c.lineTo(Math.cos(a2) * 0.25, Math.sin(a2) * 0.25);
        }
        c.fill();
        if (tb >= 3) {
          c.strokeStyle = 'rgba(253,186,116,.8)';
          c.lineWidth = 0.03;
          circ(c, 0, 0, 0.36 + Math.sin(t * 6) * 0.02);
          c.stroke();
        }
        c.fillStyle = hot ? '#9a3412' : '#7c5a44';
        circ(c, 0, 0, 0.27);
        c.fill();
        c.fillStyle = '#e8c9a0';
        ell(c, 0.07, 0.07, 0.15, 0.13, 0.6);
        c.fill();
        c.fillStyle = '#1b1b1b';
        circ(c, 0.17, 0.17, 0.035);
        c.fill();
        circ(c, 0.02, 0.07, 0.025);
        c.fill();
        circ(c, 0.12, 0.0, 0.025);
        c.fill();
        break;
      }
      case 'beetle': {
        c.rotate(ang);
        c.strokeStyle = '#1c1917';
        c.lineWidth = 0.03;
        c.beginPath();
        for (var l = -1; l <= 1; l++) {
          c.moveTo(l * 0.12, -0.18);
          c.lineTo(l * 0.14 - 0.03, -0.32);
          c.moveTo(l * 0.12, 0.18);
          c.lineTo(l * 0.14 - 0.03, 0.32);
        }
        c.stroke();
        var shell = ta >= 4 ? '#7c2d12' : ta >= 3 ? '#b45309' : tb >= 3 ? '#6d28d9' : '#3f6212';
        c.fillStyle = shell;
        ell(c, -0.03, 0, 0.3, 0.23, 0);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.22)';
        ell(c, -0.1, -0.08, 0.14, 0.06, -0.2);
        c.fill();
        c.strokeStyle = 'rgba(0,0,0,.45)';
        c.lineWidth = 0.02;
        c.beginPath();
        c.moveTo(-0.32, 0);
        c.lineTo(0.2, 0);
        c.stroke();
        c.fillStyle = '#1c1917';
        circ(c, 0.25, 0, 0.1);
        c.fill();
        // launcher tube
        c.fillStyle = '#44403c';
        c.fillRect(-0.12, -0.06, 0.2, 0.12);
        c.fillStyle = '#facc15';
        circ(c, 0.09, 0, 0.05);
        c.fill();
        break;
      }
      case 'snail': {
        c.rotate(ang);
        c.fillStyle = tb >= 3 ? '#7dd3fc' : '#a3e635';
        ell(c, 0.05, 0.02, 0.33, 0.12, 0);
        c.fill();
        c.strokeStyle = tb >= 3 ? '#0369a1' : '#4d7c0f';
        c.lineWidth = 0.025;
        c.beginPath();
        c.moveTo(0.3, -0.04);
        c.lineTo(0.42, -0.14);
        c.moveTo(0.3, 0.02);
        c.lineTo(0.44, -0.02);
        c.stroke();
        c.fillStyle = '#1b1b1b';
        circ(c, 0.42, -0.14, 0.03);
        c.fill();
        circ(c, 0.44, -0.02, 0.03);
        c.fill();
        c.fillStyle = ta >= 3 ? '#facc15' : '#f472b6';
        circ(c, -0.06, -0.02, 0.22);
        c.fill();
        c.strokeStyle = ta >= 3 ? '#a16207' : '#9d174d';
        c.lineWidth = 0.03;
        c.beginPath();
        for (var k = 0; k < 40; k++) {
          var aa = k * 0.32;
          var rr = 0.19 * (1 - k / 44);
          var px = -0.06 + Math.cos(aa) * rr;
          var py = -0.02 + Math.sin(aa) * rr;
          if (k) c.lineTo(px, py);
          else c.moveTo(px, py);
        }
        c.stroke();
        break;
      }
      case 'owl': {
        c.rotate(ang + Math.PI / 2);
        c.fillStyle = ta >= 3 ? '#8b6b4a' : '#c9955c';
        ell(c, 0, 0.02, 0.3, 0.32, 0);
        c.fill();
        c.fillStyle = ta >= 3 ? '#5c4630' : '#9c6b3a';
        ell(c, -0.26, 0.06, 0.1, 0.22, 0.2);
        c.fill();
        ell(c, 0.26, 0.06, 0.1, 0.22, -0.2);
        c.fill();
        c.fillStyle = '#fbf3e4';
        c.beginPath();
        c.moveTo(0, -0.08);
        c.bezierCurveTo(-0.08, -0.26, -0.3, -0.18, -0.22, 0.02);
        c.bezierCurveTo(-0.16, 0.18, 0, 0.16, 0, 0.16);
        c.bezierCurveTo(0, 0.16, 0.16, 0.18, 0.22, 0.02);
        c.bezierCurveTo(0.3, -0.18, 0.08, -0.26, 0, -0.08);
        c.fill();
        c.fillStyle = '#111827';
        circ(c, -0.1, -0.02, 0.055);
        c.fill();
        circ(c, 0.1, -0.02, 0.055);
        c.fill();
        c.fillStyle = tb >= 3 ? '#a5b4fc' : '#fde047';
        circ(c, -0.09, -0.04, 0.018);
        c.fill();
        circ(c, 0.11, -0.04, 0.018);
        c.fill();
        c.fillStyle = '#d97706';
        c.beginPath();
        c.moveTo(-0.03, 0.04);
        c.lineTo(0.03, 0.04);
        c.lineTo(0, 0.1);
        c.fill();
        break;
      }
      case 'hive': {
        var bands = ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706'];
        for (var b = 3; b >= 0; b--) {
          c.fillStyle = bands[b];
          ell(c, 0, 0.16 - b * 0.11, 0.33 - b * 0.05, 0.11, 0);
          c.fill();
          c.strokeStyle = 'rgba(120,53,15,.5)';
          c.lineWidth = 0.02;
          c.stroke();
        }
        c.fillStyle = '#3b1d06';
        ell(c, 0, 0.12, 0.07, 0.05, 0);
        c.fill();
        if (ta >= 2) {
          c.fillStyle = '#7c2d12';
          ell(c, 0, -0.3, 0.06, 0.04, 0);
          c.fill();
        }
        // orbiting bee
        var ba = t * 3;
        drawBee(c, Math.cos(ba) * 0.34, Math.sin(ba) * 0.2 - 0.05, ba + Math.PI / 2, 0.7);
        break;
      }
      case 'firefly': {
        c.rotate(ang);
        var glow = 0.6 + Math.sin(t * 5) * 0.25;
        var gg = c.createRadialGradient(-0.12, 0, 0.02, -0.12, 0, 0.4);
        gg.addColorStop(0, 'rgba(253,224,71,' + (0.55 * glow).toFixed(3) + ')');
        gg.addColorStop(1, 'rgba(253,224,71,0)');
        c.fillStyle = gg;
        circ(c, -0.12, 0, 0.4);
        c.fill();
        c.fillStyle = 'rgba(226,232,240,.75)';
        ell(c, 0.02, -0.15, 0.17, 0.08, 0.5);
        c.fill();
        ell(c, 0.02, 0.15, 0.17, 0.08, -0.5);
        c.fill();
        c.fillStyle = tb >= 3 ? '#a5f3fc' : '#fde047';
        ell(c, -0.14, 0, 0.15, 0.1, 0);
        c.fill();
        c.fillStyle = '#1e293b';
        ell(c, 0.08, 0, 0.1, 0.08, 0);
        c.fill();
        circ(c, 0.2, 0, 0.065);
        c.fill();
        c.strokeStyle = '#1e293b';
        c.lineWidth = 0.02;
        c.beginPath();
        c.moveTo(0.24, -0.03);
        c.lineTo(0.33, -0.1);
        c.moveTo(0.24, 0.03);
        c.lineTo(0.33, 0.1);
        c.stroke();
        break;
      }
      case 'mole': {
        c.fillStyle = '#7a5230';
        ell(c, 0, 0.12, 0.38, 0.2, 0);
        c.fill();
        c.fillStyle = '#5c3b1e';
        circ(c, -0.2, 0.18, 0.05);
        c.fill();
        circ(c, 0.22, 0.2, 0.04);
        c.fill();
        var pop = Math.sin(t * 2) * 0.02;
        c.fillStyle = '#6b5b53';
        ell(c, 0, -0.02 + pop, 0.18, 0.2, 0);
        c.fill();
        c.fillStyle = '#f9a8d4';
        circ(c, 0, 0.08 + pop, 0.045);
        c.fill();
        c.fillStyle = '#111';
        circ(c, -0.06, -0.02 + pop, 0.02);
        c.fill();
        circ(c, 0.06, -0.02 + pop, 0.02);
        c.fill();
        c.fillStyle = ta >= 3 ? '#facc15' : '#eab308';
        c.beginPath();
        c.arc(0, -0.08 + pop, 0.18, Math.PI, 0);
        c.fill();
        c.fillStyle = '#fff7c2';
        circ(c, 0, -0.2 + pop, 0.04);
        c.fill();
        if (tb >= 1) {
          c.fillStyle = '#22c55e';
          for (var cl = 0; cl < 3; cl++) {
            circ(c, 0.28 + Math.cos(cl * 2.1) * 0.04, -0.12 + Math.sin(cl * 2.1) * 0.04, 0.035);
            c.fill();
          }
        }
        break;
      }
      case 'moth': {
        var flap = 0.85 + Math.sin(t * 6) * 0.15;
        var lg = c.createRadialGradient(0, 0.12, 0.02, 0, 0.12, 0.42);
        lg.addColorStop(0, 'rgba(254,240,138,.75)');
        lg.addColorStop(1, 'rgba(254,240,138,0)');
        c.fillStyle = lg;
        circ(c, 0, 0.12, 0.42);
        c.fill();
        c.fillStyle = tb >= 3 ? '#c4b5fd' : '#ede9fe';
        ell(c, -0.17 * flap, -0.1, 0.18 * flap, 0.13, -0.5);
        c.fill();
        ell(c, 0.17 * flap, -0.1, 0.18 * flap, 0.13, 0.5);
        c.fill();
        ell(c, -0.12 * flap, 0.08, 0.12 * flap, 0.09, 0.4);
        c.fill();
        ell(c, 0.12 * flap, 0.08, 0.12 * flap, 0.09, -0.4);
        c.fill();
        c.fillStyle = '#7c3aed';
        circ(c, -0.19 * flap, -0.1, 0.04);
        c.fill();
        circ(c, 0.19 * flap, -0.1, 0.04);
        c.fill();
        c.fillStyle = '#57534e';
        ell(c, 0, 0, 0.045, 0.16, 0);
        c.fill();
        // lantern
        c.fillStyle = ta >= 3 ? '#fde047' : '#fbbf24';
        c.fillRect(-0.05, 0.16, 0.1, 0.12);
        c.strokeStyle = '#78350f';
        c.lineWidth = 0.02;
        c.strokeRect(-0.05, 0.16, 0.1, 0.12);
        break;
      }
    }
    c.restore();
    // upgrade pips
    if (tiers && (ta || tb)) {
      for (var pa = 0; pa < ta; pa++) {
        c.fillStyle = '#facc15';
        circ(c, -0.34 + pa * 0.09, 0.42, 0.035);
        c.fill();
      }
      for (var pb = 0; pb < tb; pb++) {
        c.fillStyle = '#38bdf8';
        circ(c, 0.34 - pb * 0.09, 0.42, 0.035);
        c.fill();
      }
    }
  }

  function drawBee(c, x, y, a, sc) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.scale(sc, sc);
    c.fillStyle = 'rgba(255,255,255,.75)';
    ell(c, -0.01, -0.06, 0.05, 0.035, 0.4);
    c.fill();
    ell(c, -0.01, 0.06, 0.05, 0.035, -0.4);
    c.fill();
    c.fillStyle = '#facc15';
    ell(c, 0, 0, 0.08, 0.05, 0);
    c.fill();
    c.fillStyle = '#1c1917';
    c.fillRect(-0.03, -0.05, 0.025, 0.1);
    c.fillRect(0.02, -0.045, 0.02, 0.09);
    c.restore();
  }

  /* ================================================================== */
  /* Engine                                                              */
  /* ================================================================== */
  IGAME.register('pop-defense', function (ctx) {
    var V = VARIANTS[ctx.variant] || VARIANTS.classic;
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;
    var TLIST = V.towers.map(function (id) {
      return TOWERS[id];
    });
    var MLIST = V.maps.map(function (id) {
      return MAPS[id];
    });

    /* ---------------- persistent data ---------------- */
    var medals = store.get('medals', {});
    var bestWave = store.get('bestWave', {});
    var totalPops = store.get('pops', 0);
    var autoStart = !!store.get('auto', false);
    var lastPick = store.get('pick', { map: 0, diff: 1 });

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    /* ---------------- layout ---------------- */
    var L = { w: 0, h: 0, t: 40, mx: 0, my: 0, mw: 0, mh: 0, side: true };
    var booted = false;
    var view = IGAME.createCanvas(root, { onResize: onResize });
    var g = view.ctx;
    var bg = document.createElement('canvas');
    var bgc = bg.getContext('2d');

    /* ---------------- DOM: side / bottom panel ---------------- */
    var panel = ui.el('div', 'pd-panel pd-side');
    var topBox = ui.el('div', 'pd-top');
    var statsBox = ui.el('div', 'pd-stats');
    var stLives = ui.el('div', 'pd-stat');
    var stCash = ui.el('div', 'pd-stat');
    var stWave = ui.el('div', 'pd-stat');
    statsBox.appendChild(stLives);
    statsBox.appendChild(stCash);
    statsBox.appendChild(stWave);
    var ctrls = ui.el('div', 'pd-ctrls');
    var bPause = mkBtn('❚❚', 'Pause (P)', 'pause');
    var bSpeed = mkBtn('1×', 'Speed (F)', 'speed');
    var bGo = mkBtn('▶ Wave 1', 'Start next wave (Space)', 'go');
    bGo.className += ' pd-go';
    ctrls.appendChild(bPause);
    ctrls.appendChild(bSpeed);
    ctrls.appendChild(bGo);
    topBox.appendChild(statsBox);
    topBox.appendChild(ctrls);
    var body = ui.el('div', 'pd-body');
    panel.appendChild(topBox);
    panel.appendChild(body);
    root.appendChild(panel);
    var abBar = ui.el('div', 'pd-abbar');
    root.appendChild(abBar);

    function mkBtn(label, title, act) {
      var b = ui.el('button', 'pd-b', label);
      b.type = 'button';
      b.title = title;
      b.setAttribute('aria-label', title);
      b.setAttribute('data-act', act);
      return b;
    }

    function onResize(w, h) {
      L.w = w;
      L.h = h;
      var panelMin = 230;
      var tSide = Math.min((w - panelMin) / GW, h / GH);
      var tBottom = Math.min(w / GW, (h - 168) / GH);
      L.side = tSide >= tBottom;
      if (L.side) {
        L.t = Math.max(8, tSide);
        L.mw = L.t * GW;
        L.mh = L.t * GH;
        var pw = clamp(w - L.mw, panelMin, 330);
        L.mx = Math.round((w - pw - L.mw) / 2);
        L.my = Math.round((h - L.mh) / 2);
        L.px = w - pw;
        L.py = 0;
        L.pw = pw;
        L.ph = h;
      } else {
        L.t = Math.max(8, tBottom);
        L.mw = L.t * GW;
        L.mh = L.t * GH;
        L.mx = Math.round((w - L.mw) / 2);
        L.my = 0;
        L.px = 0;
        L.py = Math.round(L.mh);
        L.pw = w;
        L.ph = h - L.py;
      }
      if (!booted) return;
      layoutPanel();
      renderBg();
      buildSprites();
    }

    function layoutPanel() {
      panel.className = 'pd-panel ' + (L.side ? 'pd-side' : 'pd-bottom') + (L.ph < 215 || (L.side && L.ph < 470) ? ' pd-tight' : '');
      panel.style.left = L.px + 'px';
      panel.style.top = L.py + 'px';
      panel.style.width = L.pw + 'px';
      panel.style.height = L.ph + 'px';
      abBar.style.left = L.mx + 6 + 'px';
      abBar.style.top = L.my + 6 + 'px';
    }

    /* ---------------- run state ---------------- */
    var state = 'title'; // title | build | wave | paused | over | won
    var prevState = 'build';
    var M = null; // current map
    var tiles = null;
    var PATHS = [];
    var diff = DIFFS[1];
    var mapIdx = clamp(lastPick.map | 0, 0, MLIST.length - 1);
    var diffIdx = clamp(lastPick.diff | 0, 0, 2);
    var cash = START_CASH;
    var lives = 150;
    var waveN = 0;
    var freeplay = false;
    var runPops = 0;
    var speed = 1;
    var balloons = [];
    var bigs = [];
    var towers = [];
    var projs = [];
    var parts = [];
    var rings = [];
    var texts = [];
    var bolts = [];
    var coins = [];
    var wave = null;
    var bid = 0;
    var pid = 0;
    var tid = 0;
    var time = 0;
    var shake = 0;
    var fullMoonT = 0;
    var placing = null;
    var ghost = { tx: -1, ty: -1, on: false, touch: false };
    var cursor = { tx: 7, ty: 5, on: false };
    var selected = null;
    var overlay = null;
    var autoT = -1;
    var overT = 0;
    var demoT = 0;
    var tmp = { x: 0, y: 0, a: 0 };
    var sndPop = 0;
    var sndBoom = 0;
    var sndTink = 0;
    var sndLeak = 0;
    var sprites = [];
    var spritesHid = [];
    var spriteScale = 0;
    var leaf = null;
    var slimeSpr = null;
    var iceSpr = null;

    // Spatial buckets (1 tile) over a padded grid so off-map balloons still collide.
    var BX0 = -2;
    var BY0 = -2;
    var BW = GW + 4;
    var BH = GH + 4;
    var buckets = [];
    for (var bi = 0; bi < BW * BH; bi++) buckets.push([]);

    function setMap(i) {
      mapIdx = i;
      M = MLIST[i];
      tiles = buildTiles(M);
      PATHS = M.paths.map(buildPath);
      if (booted) renderBg();
    }

    /* ---------------- sprites ---------------- */
    function makeSprite(T, hidden) {
      var sc = L.t * view.dpr;
      var sz = Math.ceil(T.r * 4 * sc) + 4;
      var cv = document.createElement('canvas');
      cv.width = sz;
      cv.height = sz;
      var c = cv.getContext('2d');
      c.translate(sz / 2, sz / 2 - T.r * 0.45 * sc);
      c.scale(sc, sc);
      drawBalloon(c, T, hidden);
      return { cv: cv, w: sz / sc, h: sz / sc, oy: T.r * 0.45 };
    }
    function makeOverlay(fn, r) {
      var sc = L.t * view.dpr;
      var sz = Math.ceil(r * 2 * sc) + 4;
      var cv = document.createElement('canvas');
      cv.width = sz;
      cv.height = sz;
      var c = cv.getContext('2d');
      c.translate(sz / 2, sz / 2);
      c.scale(sc, sc);
      fn(c);
      return { cv: cv, w: sz / sc, h: sz / sc };
    }
    function buildSprites() {
      var sc = L.t * view.dpr;
      if (sc === spriteScale) return;
      spriteScale = sc;
      sprites = [];
      spritesHid = [];
      for (var i = 0; i < 7; i++) {
        sprites.push(makeSprite(BT[i], false));
        spritesHid.push(makeSprite(BT[i], true));
      }
      leaf = makeOverlay(function (c) {
        c.fillStyle = '#22c55e';
        ell(c, -0.05, 0, 0.08, 0.04, -0.6);
        c.fill();
        ell(c, 0.05, 0, 0.08, 0.04, 0.6);
        c.fill();
        c.strokeStyle = '#166534';
        c.lineWidth = 0.02;
        c.beginPath();
        c.moveTo(0, 0.08);
        c.lineTo(0, -0.02);
        c.stroke();
      }, 0.12);
      slimeSpr = makeOverlay(function (c) {
        c.fillStyle = 'rgba(132,204,22,.7)';
        ell(c, 0, -0.08, 0.2, 0.1, 0);
        c.fill();
        for (var k = -1; k <= 1; k++) {
          ell(c, k * 0.1, 0.02 + Math.abs(k) * -0.03, 0.035, 0.07, 0);
          c.fill();
        }
      }, 0.26);
      iceSpr = makeOverlay(function (c) {
        c.fillStyle = 'rgba(186,230,253,.55)';
        c.strokeStyle = 'rgba(255,255,255,.9)';
        c.lineWidth = 0.025;
        c.beginPath();
        for (var k = 0; k < 6; k++) {
          var a = (k / 6) * TAU;
          c.lineTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
        }
        c.closePath();
        c.fill();
        c.stroke();
      }, 0.32);
    }

    /* ---------------- map background ---------------- */
    function paintMap(c, Mp, tl) {
      var tilesL = buildTiles(Mp);
      var rnd = rngFrom(Mp.seed);
      for (var y = 0; y < GH; y++)
        for (var x = 0; x < GW; x++) {
          c.fillStyle = Mp.grass[(x + y) % 2];
          c.fillRect(x, y, 1.01, 1.01);
        }
      // grass tufts & flowers
      for (var i = 0; i < 70; i++) {
        var fx = rnd() * GW;
        var fy = rnd() * GH;
        var kind = rnd();
        if (kind < 0.6) {
          c.strokeStyle = 'rgba(40,110,40,.35)';
          c.lineWidth = 0.03;
          c.beginPath();
          c.moveTo(fx, fy);
          c.lineTo(fx - 0.05, fy - 0.12);
          c.moveTo(fx, fy);
          c.lineTo(fx + 0.06, fy - 0.1);
          c.stroke();
        } else {
          var fc = ['#fef08a', '#fda4af', '#ffffff', '#c4b5fd'][Math.floor(rnd() * 4)];
          c.fillStyle = fc;
          for (var p = 0; p < 5; p++) {
            var pa = (p / 5) * TAU;
            circ(c, fx + Math.cos(pa) * 0.05, fy + Math.sin(pa) * 0.05, 0.04);
            c.fill();
          }
          c.fillStyle = '#f59e0b';
          circ(c, fx, fy, 0.03);
          c.fill();
        }
      }
      // water
      Mp.water.forEach(function (w) {
        c.fillStyle = '#3b82c4';
        roundRect(c, w[0] + 0.08, w[1] + 0.08, w[2] - 0.16, w[3] - 0.16, 0.45);
        c.fill();
        c.fillStyle = '#5aa6e0';
        roundRect(c, w[0] + 0.22, w[1] + 0.2, w[2] - 0.44, w[3] - 0.4, 0.35);
        c.fill();
        for (var k = 0; k < w[2]; k++) {
          c.fillStyle = '#4ade80';
          c.beginPath();
          var lx = w[0] + 0.6 + k * 0.95;
          var ly = w[1] + 0.5 + (k % 2) * 0.9;
          c.arc(lx, ly, 0.16, 0.4, TAU - 0.1);
          c.lineTo(lx, ly);
          c.fill();
          if (k % 3 === 1) {
            c.fillStyle = '#f9a8d4';
            circ(c, lx + 0.05, ly - 0.04, 0.06);
            c.fill();
          }
        }
      });
      // path: border then fill
      Mp.paths.forEach(function (pts) {
        c.lineJoin = 'round';
        c.lineCap = 'butt';
        c.strokeStyle = Mp.edge;
        c.lineWidth = 0.98;
        c.beginPath();
        pts.forEach(function (p, i) {
          if (i) c.lineTo(p[0], p[1]);
          else c.moveTo(p[0], p[1]);
        });
        c.stroke();
      });
      Mp.paths.forEach(function (pts) {
        c.strokeStyle = Mp.path;
        c.lineWidth = 0.8;
        c.beginPath();
        pts.forEach(function (p, i) {
          if (i) c.lineTo(p[0], p[1]);
          else c.moveTo(p[0], p[1]);
        });
        c.stroke();
        // pebbles along the path
        var P = buildPath(pts);
        c.fillStyle = 'rgba(120,90,50,.28)';
        for (var d = 0.4; d < P.len; d += 0.7) {
          pathAt(P, d, tmp);
          var off = (rnd() - 0.5) * 0.5;
          circ(c, tmp.x - Math.sin(tmp.a) * off, tmp.y + Math.cos(tmp.a) * off, 0.035 + rnd() * 0.03);
          c.fill();
        }
      });
      // rocks
      Mp.rocks.forEach(function (r) {
        if (tilesL[r[1] * GW + r[0]] !== 3) return;
        var cx = r[0] + 0.5;
        var cy = r[1] + 0.55;
        c.fillStyle = 'rgba(0,0,0,.18)';
        ell(c, cx + 0.04, cy + 0.12, 0.38, 0.22, 0);
        c.fill();
        c.fillStyle = '#9ca3af';
        ell(c, cx, cy, 0.36, 0.28, 0);
        c.fill();
        c.fillStyle = '#d1d5db';
        ell(c, cx - 0.1, cy - 0.09, 0.15, 0.09, -0.3);
        c.fill();
        c.fillStyle = '#6b7280';
        ell(c, cx + 0.2, cy + 0.06, 0.12, 0.1, 0);
        c.fill();
      });
      // exits: a burrow at the end of each path
      Mp.paths.forEach(function (pts) {
        var P = buildPath(pts);
        var inside = P.len;
        for (var d = P.len; d > 0; d -= 0.1) {
          pathAt(P, d, tmp);
          if (tmp.x > 0.3 && tmp.x < GW - 0.3 && tmp.y > 0.3 && tmp.y < GH - 0.3) {
            inside = d;
            break;
          }
        }
        pathAt(P, inside, tmp);
        c.fillStyle = '#5b3a1e';
        ell(c, tmp.x, tmp.y, 0.42, 0.32, 0);
        c.fill();
        c.fillStyle = '#2a1708';
        ell(c, tmp.x, tmp.y + 0.03, 0.28, 0.2, 0);
        c.fill();
      });
    }
    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }
    function renderBg() {
      if (!M) return;
      var dpr = view.dpr;
      bg.width = Math.max(1, Math.round(L.mw * dpr));
      bg.height = Math.max(1, Math.round(L.mh * dpr));
      bgc.setTransform(L.t * dpr, 0, 0, L.t * dpr, 0, 0);
      paintMap(bgc, M, L.t);
    }
    function mapPreview(cv, Mp) {
      var c = cv.getContext('2d');
      var sc = cv.width / GW;
      c.setTransform(sc, 0, 0, sc, 0, 0);
      paintMap(c, Mp, sc);
    }
    function iconCanvas(id, cssPx) {
      var cv = document.createElement('canvas');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(cssPx * dpr);
      cv.height = Math.round(cssPx * dpr);
      var c = cv.getContext('2d');
      var sc = (cssPx * dpr) / 1.0;
      c.setTransform(sc, 0, 0, sc, cv.width / 2, cv.height / 2);
      drawCritter(c, id, -Math.PI / 4, null, 0.5);
      return cv;
    }

    /* ================================================================ */
    /* Prices                                                            */
    /* ================================================================ */
    function discountAt(x, y) {
      var dsc = 0;
      for (var i = 0; i < towers.length; i++) {
        var m = towers[i];
        if (m.def.kind !== 'aura' || !m.s.discount) continue;
        var dx = m.x - x;
        var dy = m.y - y;
        if (dx * dx + dy * dy <= m.s.aura * m.s.aura) dsc = Math.max(dsc, m.s.discount);
      }
      return dsc;
    }
    function price(base, x, y) {
      var dsc = x == null ? 0 : discountAt(x, y);
      return Math.max(5, Math.round((base * diff.cost * (1 - dsc)) / 5) * 5);
    }
    function upPrice(t, p) {
      var up = t.def.paths[p].ups[t.tiers[p]];
      return up ? price(up.cost, t.x, t.y) : 0;
    }
    // Upgrade availability: 'ok' | 'max' | 'lock'
    function upState(t, p) {
      if (t.tiers[p] >= V.tiers) return 'max';
      // only one path may go past tier 2
      if (V.crossLimit && t.tiers[p] + 1 > 2 && t.tiers[1 - p] > 2) return 'lock';
      return 'ok';
    }

    /* ================================================================ */
    /* Towers                                                            */
    /* ================================================================ */
    function computeStats(t) {
      var s = {};
      var k;
      for (k in DEF_STATS) s[k] = DEF_STATS[k];
      for (k in t.def.base) s[k] = t.def.base[k];
      for (var p = 0; p < 2; p++)
        for (var i = 0; i < t.tiers[p]; i++) {
          var fx = t.def.paths[p].ups[i].fx;
          for (k in fx) {
            var v = fx[k];
            if (k.slice(-3) === 'Mul') s[k.slice(0, -3)] *= v;
            else if (typeof v === 'number') s[k] = (s[k] || 0) + v;
            else s[k] = v;
          }
        }
      t.s = s;
    }
    function recalcBuffs() {
      for (var i = 0; i < towers.length; i++) {
        var t = towers[i];
        var b = t.buff;
        b.range = 0;
        b.rate = 0;
        b.dmg = 0;
        b.heavy = false;
        b.detect = false;
        if (t.def.kind === 'aura') continue;
        for (var j = 0; j < towers.length; j++) {
          var m = towers[j];
          if (m.def.kind !== 'aura') continue;
          var dx = m.x - t.x;
          var dy = m.y - t.y;
          if (dx * dx + dy * dy > m.s.aura * m.s.aura) continue;
          b.detect = true;
          b.range = Math.max(b.range, m.s.rangeBuff);
          b.rate = Math.max(b.rate, m.s.rateBuff);
          b.dmg = Math.max(b.dmg, m.s.dmgBuff);
          if (m.s.heavyAura) b.heavy = true;
        }
      }
    }
    function effRange(t) {
      return t.s.range * (1 + t.buff.range);
    }
    function canDetect(t) {
      return t.s.detect || t.buff.detect || fullMoonT > 0;
    }
    function isHeavy(t) {
      return t.s.heavy || t.buff.heavy;
    }
    function effDmg(t) {
      return t.s.dmg + t.buff.dmg;
    }
    function rateMul(t) {
      return (1 + t.buff.rate) * (t.blitz > 0 ? 3 : 1) * (fullMoonT > 0 ? 2 : 1);
    }

    function addTower(id, tx, ty, tiersAB, spent) {
      var def = TOWERS[id];
      var t = {
        id: ++tid, def: def, tx: tx, ty: ty, x: tx + 0.5, y: ty + 0.5,
        tiers: tiersAB ? [tiersAB[0], tiersAB[1]] : [0, 0], spent: spent || 0, target: 0,
        cd: 0.2, ang: -Math.PI / 2, pops: 0, s: null, buff: { range: 0, rate: 0, dmg: 0, heavy: false, detect: false },
        abCd: 0, blitz: 0, kick: 0, fieldCd: 0, coinQ: 0, coinT: 0, spin: 0, pop: 0.25,
      };
      computeStats(t);
      towers.push(t);
      recalcBuffs();
      return t;
    }
    function towerAt(tx, ty) {
      for (var i = 0; i < towers.length; i++) if (towers[i].tx === tx && towers[i].ty === ty) return towers[i];
      return null;
    }
    function canPlace(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return 'Off the map';
      var k = tiles[ty * GW + tx];
      if (k === 1) return 'Not on the path';
      if (k === 2) return 'Critters can’t swim';
      if (k === 3) return 'A rock is in the way';
      if (towerAt(tx, ty)) return 'Tile taken';
      return '';
    }
    function tryPlace(tx, ty) {
      if (!placing) return false;
      var why = canPlace(tx, ty);
      var def = TOWERS[placing];
      var cost = price(def.cost, tx + 0.5, ty + 0.5);
      if (!why && cash < cost) why = 'Need $' + (cost - cash) + ' more';
      if (why) {
        sfx('error');
        toast(why);
        return false;
      }
      cash -= cost;
      var t = addTower(placing, tx, ty, null, cost);
      for (var k = 0; k < 10; k++) burst(t.x, t.y, '#fde68a', 1.2);
      sfx('buy');
      placing = null;
      ghost.on = false;
      selectTower(t);
      saveRunIfIdle();
      dirty();
      return true;
    }
    function upgrade(t, p) {
      if (!t) return;
      var st = upState(t, p);
      if (st !== 'ok') {
        sfx('error');
        toast(st === 'max' ? 'Path maxed out' : 'Only one path can go past tier 2');
        return;
      }
      var cost = upPrice(t, p);
      if (cash < cost) {
        sfx('error');
        toast('Need $' + (cost - cash) + ' more');
        return;
      }
      cash -= cost;
      t.spent += cost;
      t.tiers[p]++;
      computeStats(t);
      recalcBuffs();
      t.pop = 0.35;
      for (var k = 0; k < 14; k++) burst(t.x, t.y, p ? '#7dd3fc' : '#fde047', 1.6);
      sfx('levelup');
      if (V.abilities && abilityUnlocked(t) && t.abCd === 0 && !t.abShown) {
        t.abShown = true;
        toast(t.def.ability.name + ' unlocked!');
      }
      saveRunIfIdle();
      buildInfo();
      dirty();
    }
    function sellValue(t) {
      return Math.floor(t.spent * 0.75);
    }
    function sell(t) {
      if (!t) return;
      var v = sellValue(t);
      cash += v;
      towers.splice(towers.indexOf(t), 1);
      recalcBuffs();
      floatText(t.x, t.y, '+$' + v, '#fde047');
      for (var k = 0; k < 10; k++) burst(t.x, t.y, '#a3a3a3', 1.2);
      sfx('coin');
      selected = null;
      saveRunIfIdle();
      showShop();
      dirty();
    }
    function abilityUnlocked(t) {
      return V.abilities && (t.tiers[0] >= 3 || t.tiers[1] >= 3);
    }

    /* ================================================================ */
    /* Balloons                                                          */
    /* ================================================================ */
    function spawnBalloon(type, p, d, hid, rg, rgMax, hpMul, spdMul) {
      var T = BT[type];
      var b = {
        id: ++bid, t: type, hp: Math.max(1, Math.round(T.hp * (hpMul || 1))), hpMul: hpMul || 1, spdMul: spdMul || 1,
        d: d, p: p, x: -5, y: -5, a: 0, hid: !!hid, rg: !!rg, rgMax: rgMax == null ? type : rgMax, rgT: 0,
        slow: 0, slowT: 0, keep: false, acid: 0, acidT: 0, stun: 0, frz: 0, immune: 0, dead: false,
        ph: Math.random() * TAU,
      };
      pathAt(PATHS[p], d, tmp);
      b.x = tmp.x;
      b.y = tmp.y;
      b.a = tmp.a;
      balloons.push(b);
      if (T.big) bigs.push(b);
      return b;
    }
    function isBig(b) {
      return !!BT[b.t].big;
    }

    // Deal damage; returns false if the hit was blocked by armor.
    function hurt(b, dmg, heavy, tw, projId) {
      if (b.dead) return true;
      var T = BT[b.t];
      if (T.armored && !heavy) {
        if (time - sndTink > 0.12) {
          sndTink = time;
          sfx({ f: 2400, d: 0.03, type: 'square', v: 0.03 });
        }
        spark(b.x, b.y, '#e5e7eb');
        return false;
      }
      while (dmg > 0 && !b.dead) {
        T = BT[b.t];
        if (T.armored && !heavy) break;
        if (b.hp > dmg) {
          b.hp -= dmg;
          return true;
        }
        dmg -= b.hp;
        popLayer(b, tw, projId);
      }
      return true;
    }
    function popLayer(b, tw, projId) {
      var T = BT[b.t];
      cash += T.cash;
      runPops++;
      totalPops++;
      if (tw) tw.pops++;
      // particles
      var n = T.big ? 26 : T.hp > 1 ? 10 : 5;
      for (var i = 0; i < n; i++) burst(b.x, b.y, i % 2 ? T.col : T.dark, T.big ? 3 : 1.4);
      rings.push({ x: b.x, y: b.y, r: T.r * 0.6, r2: T.r * (T.big ? 2.2 : 1.5), t: 0, d: 0.18, col: 'rgba(255,255,255,.8)', w: 0.03 });
      if (T.big) {
        shake = Math.max(shake, 0.25);
        sfx('explode');
      } else if (time - sndPop > 0.05) {
        sndPop = time;
        sfx({ f: 520 + Math.random() * 520, f2: 1300, d: 0.05, type: 'sine', v: 0.06 });
      }
      if (!T.kids) {
        b.dead = true;
        return;
      }
      var chain = b.t <= 4;
      var rgMax = chain ? b.rgMax : null;
      var kids = T.kids;
      var spread = T.big ? 0.35 : 0.16;
      for (var k = 1; k < kids.length; k++) {
        var kt = kids[k];
        var nb = spawnBalloon(kt, b.p, Math.max(0, b.d - spread * k), b.hid, b.rg, rgMax == null ? kt : Math.min(rgMax, 4), b.hpMul, b.spdMul);
        nb.immune = projId;
        if (b.keep && b.slowT > 0) {
          nb.slow = b.slow;
          nb.slowT = b.slowT;
          nb.keep = true;
          nb.acid = b.acid;
          nb.acidT = b.acidT;
        }
      }
      // the balloon itself becomes the first child
      var first = kids[0];
      b.t = first;
      b.hp = Math.max(1, Math.round(BT[first].hp * (BT[first].hp > 1 ? b.hpMul : 1)));
      b.rgMax = rgMax == null ? first : Math.min(rgMax, 4);
      b.rgT = 0;
      b.immune = projId;
      if (!b.keep) {
        b.slow = 0;
        b.slowT = 0;
        b.acid = 0;
      }
      b.frz = 0;
      // a whale that became a Jumbo leaves `bigs` at the end of this step (compaction)
    }

    function applySlime(b, s, tw) {
      if (b.dead) return;
      if (isBig(b) && !s.slowBig) return;
      var sl = isBig(b) ? s.slow * 0.5 : s.slow;
      b.slow = Math.max(b.slow, sl);
      b.slowT = Math.max(b.slowT, s.slowT);
      b.keep = b.keep || s.keepSlow;
      if (s.acid) {
        b.acid = Math.max(b.acid, s.acid);
        if (!b.acidT) b.acidT = 1.5;
        b.acidBy = tw;
      }
      if (s.freeze && !isBig(b)) b.frz = Math.max(b.frz, s.freeze);
    }

    /* ================================================================ */
    /* Waves                                                             */
    /* ================================================================ */
    function waveDef(n) {
      var rng = rngFrom(n * 7919 + 101);
      var groups = [];
      var fp = Math.max(0, n - V.waves);
      var budget = 12 + 3 * n + 0.9 * n * n;
      if (fp) budget *= Math.pow(1.07, fp);
      if (n === 1) groups.push([0, 18, 0.85, 0, 0]);
      else if (n === 2) groups.push([0, 26, 0.6, 0, 0]);
      else if (n === 3) {
        groups.push([0, 16, 0.6, 0, 0]);
        groups.push([1, 6, 0.8, 0, 0]);
      } else {
        var bigGroups = [];
        if (n >= UNLOCK[8] && (n === UNLOCK[8] || n % 4 === 2 || n % 10 === 0 || fp)) {
          var ns = Math.max(1, Math.floor((budget * 0.45) / BT[8].rbe));
          bigGroups.push([8, ns, SPACING[8], 0, 0]);
          budget -= ns * BT[8].rbe;
        }
        if (n >= UNLOCK[7] && (n % 2 === 0 || n >= 35)) {
          var nw = Math.max(1, Math.round((budget * 0.3) / BT[7].rbe));
          bigGroups.push([7, nw, SPACING[7], 0, 0]);
          budget -= nw * BT[7].rbe;
        }
        budget = Math.max(budget, 30);
        var cand = [];
        // Tin joins the regular mix a few waves after its small introduction
        for (var t = 0; t < 7; t++) if (UNLOCK[t] <= n && (t !== 5 || n >= 21)) cand.push(t);
        if (n >= UNLOCK[5] && n < 21) groups.push([5, 4 + (n - UNLOCK[5]) * 2, SPACING[5], 0, 0]);
        cand.sort(function (a, b) {
          return BT[a].rbe - BT[b].rbe || a - b;
        });
        var top = cand.slice(-3);
        var shares = [0.5, 0.3, 0.2];
        if (rng() < 0.4) shares = [0.4, 0.4, 0.2];
        for (var i = 0; i < top.length; i++) {
          var ty = top[top.length - 1 - i];
          var sh = shares[i] + (top.length < 3 && i === 0 ? 0.2 * (3 - top.length) : 0);
          var cnt = clamp(Math.round((budget * sh) / BT[ty].rbe), 1, 70);
          // hidden groups arrive from wave 14 (smaller); wave 13 is a gentle introduction
          var hid = n > 13 && rng() < 0.24 && (ty !== 5 || n >= 30) ? 1 : 0;
          var rg = n >= 19 && (n === 19 ? i === 0 : rng() < 0.28) && ty !== 5 ? 1 : 0;
          if (hid) cnt = Math.max(1, Math.round(cnt * 0.7));
          groups.push([ty, cnt, SPACING[ty], hid, rg]);
        }
        if (n === 13) groups.push([2, 8, SPACING[2], 1, 0]);
        // first appearance of a new type gets its own announced group
        for (var u = 2; u < 7; u++)
          if (UNLOCK[u] === n && !groups.some(function (gq) { return gq[0] === u; }))
            groups.unshift([u, Math.max(3, Math.round((budget * 0.25) / BT[u].rbe)), SPACING[u], 0, 0]);
        groups.sort(function (a, b) {
          return BT[a[0]].rbe - BT[b[0]].rbe;
        });
        groups = groups.concat(bigGroups);
      }
      // to spawn list
      var spawns = [];
      var T0 = 0;
      var tight = Math.max(0.38, 1 - n / 70);
      var si = 0;
      for (var gi = 0; gi < groups.length; gi++) {
        var gr = groups[gi];
        var sp = gr[2] * (BT[gr[0]].big ? 1 : tight);
        for (var k = 0; k < gr[1]; k++) {
          spawns.push({ t: T0 + k * sp, type: gr[0], hid: gr[3], rg: gr[4], p: si++ % Math.max(1, PATHS.length) });
        }
        T0 += gr[1] * sp * 0.6 + 0.8;
      }
      spawns.sort(function (a, b) {
        return a.t - b.t;
      });
      return { groups: groups, spawns: spawns, fp: fp };
    }
    function waveSummary(n) {
      var d = waveDef(n);
      return d.groups
        .map(function (gq) {
          return BT[gq[0]].name + ' ×' + gq[1] + (gq[3] ? ' (hidden)' : '') + (gq[4] ? ' (regrow)' : '');
        })
        .join(' · ');
    }

    function startWave() {
      if (state !== 'build') return;
      waveN++;
      var def = waveDef(waveN);
      wave = { n: waveN, q: def.spawns, qi: 0, t: 0, fp: def.fp };
      state = 'wave';
      autoT = -1;
      // income critters schedule their coins across the first ~18 s of the wave
      towers.forEach(function (t) {
        if (t.def.kind === 'farm') {
          t.coinQ = Math.round(t.s.coins);
          t.coinT = 1 + Math.random();
        }
      });
      // announce new balloon types
      var seen = {};
      def.groups.forEach(function (gq) {
        var T = BT[gq[0]];
        if (UNLOCK[gq[0]] === waveN && !seen[T.id] && NEW_TIP[T.id]) {
          seen[T.id] = 1;
          toast('New: ' + T.name + '!', 1800);
          hintText = NEW_TIP[T.id];
        }
      });
      if (waveN === 13) hintText = 'Hidden balloons! Only critters that can see them will aim at them — Barn Owl, Night Goggles' + (V.abilities ? ', Bright Glow or a Lantern Moth.' : '.');
      if (waveN === 19) hintText = 'Balloons with a leaf regrow their layers if you leave them alone — pop them fast.';
      sfx('boost');
      dirty();
    }
    function endWave() {
      var bonus = 100 + waveN;
      var extra = 0;
      towers.forEach(function (t) {
        if (t.def.kind === 'farm') {
          extra += t.s.endBonus;
          if (t.s.interest) extra += Math.min(400, Math.floor(cash * t.s.interest));
        }
      });
      cash += bonus + extra;
      wave = null;
      bolts.length = 0;
      sfx('match');
      var key = M.id;
      if (waveN > (bestWave[key] || 0)) {
        bestWave[key] = waveN;
        store.set('bestWave', bestWave);
      }
      store.set('pops', totalPops);
      if (waveN >= V.waves && !freeplay) {
        winGame();
        return;
      }
      toast('Wave ' + waveN + ' cleared  +$' + (bonus + extra), 1500);
      state = 'build';
      hintText = '';
      saveRun();
      if (autoStart) autoT = 1.5;
      dirty();
    }

    /* ================================================================ */
    /* Save / load a run between waves                                   */
    /* ================================================================ */
    function saveRun() {
      if (!M || state === 'over' || state === 'won' || state === 'title') return;
      store.set('run', {
        v: 1, map: M.id, diff: diff.id, wave: waveN, cash: Math.floor(cash), lives: lives, fp: freeplay, pops: runPops,
        towers: towers.map(function (t) {
          return [t.def.id, t.tx, t.ty, t.tiers[0], t.tiers[1], t.target, t.spent, t.pops];
        }),
      });
    }
    function saveRunIfIdle() {
      if (state === 'build') saveRun();
    }
    function loadRunInfo() {
      var r = store.get('run', null);
      if (!r || r.v !== 1) return null;
      var mi = V.maps.indexOf(r.map);
      if (mi < 0) return null;
      return r;
    }

    /* ================================================================ */
    /* Effects                                                           */
    /* ================================================================ */
    function burst(x, y, col, sp) {
      if (parts.length > 320) return;
      var a = Math.random() * TAU;
      var v = (0.6 + Math.random() * 1.6) * (sp || 1);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, t: 0, d: 0.35 + Math.random() * 0.3, col: col, s: 0.04 + Math.random() * 0.05 });
    }
    function spark(x, y, col) {
      for (var i = 0; i < 2; i++) burst(x, y, col, 1.4);
    }
    function floatText(x, y, txt, col) {
      if (texts.length > 30) texts.shift();
      texts.push({ x: x, y: y, txt: txt, col: col, t: 0 });
    }
    var hintText = '';
    var toastEnds = [];
    // At most three stacked toasts at a time (the shell stacks them downward).
    function toast(msg, ms) {
      var now = Date.now();
      toastEnds = toastEnds.filter(function (e) {
        return e > now;
      });
      if (toastEnds.length > 2) return;
      toastEnds.push(now + (ms || 1300) + 400);
      ui.toast(root, msg, ms || 1300);
    }

    /* ================================================================ */
    /* Targeting & attacks                                               */
    /* ================================================================ */
    function remaining(b) {
      return PATHS[b.p].len - b.d;
    }
    function findTarget(t, range, detect, mode, exclude, preferUnslimed) {
      var best = null;
      var bestScore = -Infinity;
      for (var i = 0; i < balloons.length; i++) {
        var b = balloons[i];
        if (b.dead || (b.hid && !detect) || b.d < 0.05) continue;
        if (b.x < -0.3 || b.y < -0.3 || b.x > GW + 0.3 || b.y > GH + 0.3) continue;
        var dx = b.x - t.x;
        var dy = b.y - t.y;
        var d2 = dx * dx + dy * dy;
        var rr = range + BT[b.t].r * 0.6;
        if (d2 > rr * rr) continue;
        if (exclude && exclude.indexOf(b) > -1) continue;
        var sc;
        if (mode === 0) sc = -remaining(b);
        else if (mode === 1) sc = remaining(b);
        else if (mode === 2) sc = BT[b.t].rbe * 1000 - remaining(b);
        else sc = -d2;
        if (preferUnslimed && b.slowT <= 0 && !(isBig(b) && !t.s.slowBig)) sc += 1e7;
        if (sc > bestScore) {
          bestScore = sc;
          best = b;
        }
      }
      return best;
    }
    function anyInRange(t, range, detect) {
      for (var i = 0; i < balloons.length; i++) {
        var b = balloons[i];
        if (b.dead || (b.hid && !detect)) continue;
        var dx = b.x - t.x;
        var dy = b.y - t.y;
        var rr = range + BT[b.t].r * 0.6;
        if (dx * dx + dy * dy <= rr * rr) return true;
      }
      return false;
    }
    function newProj(kind, t, x, y, ang, spd, life, o) {
      if (projs.length > 700) return null;
      var p = {
        id: ++pid, kind: kind, tw: t, x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, spd: spd, ang: ang,
        life: life, pierce: o.pierce, dmg: o.dmg, heavy: !!o.heavy, r: o.r || 0.1, hits: [], bigDmg: o.bigDmg || 0,
        detect: !!o.detect, tgt: o.tgt || null, tx: o.tx, ty: o.ty, slow: o.slow || 0, slowT: o.slowT || 0,
        radius: o.radius || 0, stun: o.stun || 0, frags: o.frags || 0, s: o.s || null,
        hitsObj: kind === 'bee' ? [] : null,
      };
      projs.push(p);
      return p;
    }

    function fire(t) {
      var s = t.s;
      var kind = t.def.kind;
      var range = effRange(t);
      var det = canDetect(t);
      var heavy = isHeavy(t);
      var dmg = effDmg(t);
      var b;
      if (kind === 'proj') {
        b = findTarget(t, range, det, t.target);
        if (!b) return false;
        t.ang = Math.atan2(b.y - t.y, b.x - t.x);
        var cnt = Math.round(s.count);
        for (var i = 0; i < cnt; i++) {
          var a = t.ang + (i - (cnt - 1) / 2) * s.spread;
          newProj(s.heavy && s.size > 0.15 ? 'cone' : 'burr', t, t.x + Math.cos(a) * 0.3, t.y + Math.sin(a) * 0.3, a, s.speed, (range + 1.2) / s.speed, {
            pierce: s.pierce, dmg: dmg, heavy: heavy, r: s.size,
          });
        }
        t.kick = 0.12;
        if (Math.random() < 0.5) sfx({ f: 300, f2: 180, d: 0.04, type: 'triangle', v: 0.03 });
        return true;
      }
      if (kind === 'ring') {
        if (!anyInRange(t, range, det)) return false;
        if (s.nova) {
          var hit = 0;
          for (var j = 0; j < balloons.length && hit < 40; j++) {
            b = balloons[j];
            if (b.dead) continue;
            var dx = b.x - t.x;
            var dy = b.y - t.y;
            var rr = range + BT[b.t].r * 0.5;
            if (dx * dx + dy * dy > rr * rr) continue;
            hurt(b, dmg, true, t, -t.id);
            hit++;
          }
          rings.push({ x: t.x, y: t.y, r: 0.3, r2: range, t: 0, d: 0.3, col: 'rgba(251,146,60,.9)', w: 0.12 });
          if (time - sndBoom > 0.1) {
            sndBoom = time;
            sfx({ f: 180, f2: 90, d: 0.15, type: 'sawtooth', v: 0.05 });
          }
        } else {
          var n = Math.round(s.count);
          t.spin += 0.37;
          for (var k = 0; k < n; k++) {
            var aa = (k / n) * TAU + t.spin;
            newProj('spine', t, t.x, t.y, aa, s.speed, range / s.speed + 0.05, { pierce: s.pierce, dmg: dmg, heavy: heavy, r: s.size });
          }
          if (Math.random() < 0.5) sfx({ f: 900, f2: 500, d: 0.05, type: 'triangle', v: 0.025 });
        }
        t.kick = 0.12;
        return true;
      }
      if (kind === 'bomb') {
        b = findTarget(t, range, det, t.target);
        if (!b) return false;
        t.ang = Math.atan2(b.y - t.y, b.x - t.x);
        var dist = Math.sqrt((b.x - t.x) * (b.x - t.x) + (b.y - t.y) * (b.y - t.y));
        var tt = dist / s.speed;
        // lead the target along its path
        var spdB = BT[b.t].speed * diff.speed * b.spdMul * (b.slowT > 0 ? 1 - b.slow : 1);
        pathAt(PATHS[b.p], Math.min(PATHS[b.p].len, b.d + spdB * tt * 0.9), tmp);
        var tx = tmp.x;
        var ty = tmp.y;
        var a2 = Math.atan2(ty - t.y, tx - t.x);
        var d2 = Math.sqrt((tx - t.x) * (tx - t.x) + (ty - t.y) * (ty - t.y));
        newProj('bomb', t, t.x, t.y, a2, s.speed, d2 / s.speed + 0.02, {
          pierce: Math.round(s.pierce), dmg: dmg, heavy: true, r: 0.14, tx: tx, ty: ty, radius: s.radius, stun: s.stun,
          frags: s.frags, bigDmg: s.bigDmg,
        });
        t.kick = 0.18;
        sfx({ f: 220, f2: 140, d: 0.08, type: 'square', v: 0.035 });
        return true;
      }
      if (kind === 'slime') {
        b = findTarget(t, range, det, t.target, null, true);
        if (!b) return false;
        t.ang = Math.atan2(b.y - t.y, b.x - t.x);
        newProj('slime', t, t.x + Math.cos(t.ang) * 0.3, t.y + Math.sin(t.ang) * 0.3, t.ang, s.speed, (range + 1) / s.speed, { pierce: 1, dmg: 0, r: s.size, s: s });
        t.kick = 0.12;
        sfx({ f: 160, f2: 320, d: 0.07, type: 'sine', v: 0.05 });
        return true;
      }
      if (kind === 'snipe') {
        var picked = [];
        for (var sh = 0; sh < Math.round(s.shots); sh++) {
          b = findTarget(t, 99, det, t.target, picked);
          if (!b) break;
          picked.push(b);
          if (!sh) t.ang = Math.atan2(b.y - t.y, b.x - t.x);
          bolts.push({ pts: [t.x, t.y, b.x, b.y], t: 0, d: 0.16, col: 'rgba(255,248,220,.95)', w: 0.06 });
          for (var f = 0; f < 4; f++) burst(b.x, b.y, '#f5deb3', 1.4);
          hurt(b, dmg + (isBig(b) ? s.bigDmg : 0), heavy, t, -t.id);
        }
        if (!picked.length) return false;
        t.kick = 0.2;
        sfx({ f: 1400, f2: 300, d: 0.09, type: 'sawtooth', v: 0.035 });
        return true;
      }
      if (kind === 'bees') {
        b = findTarget(t, range, det, t.target);
        if (!b) return false;
        var nb = Math.round(s.count);
        for (var q = 0; q < nb; q++) {
          var ba = Math.atan2(b.y - t.y, b.x - t.x) + (Math.random() - 0.5) * 1.6;
          newProj('bee', t, t.x, t.y - 0.1, ba, s.speed, s.beeLife, {
            pierce: s.pierce, dmg: dmg, heavy: heavy, r: 0.1, tgt: b, detect: det, slow: s.slow, slowT: s.slowT,
          });
        }
        if (Math.random() < 0.4) sfx({ f: 220, f2: 260, d: 0.12, type: 'sawtooth', v: 0.02 });
        return true;
      }
      if (kind === 'zap') {
        var visited = [];
        var any = false;
        for (var bo = 0; bo < Math.round(s.bolts); bo++) {
          b = findTarget(t, range, det, t.target, visited);
          if (!b) break;
          any = true;
          if (!bo) t.ang = Math.atan2(b.y - t.y, b.x - t.x);
          var chain = [b];
          visited.push(b);
          var cur = b;
          for (var c = 0; c < s.chains; c++) {
            var nx = nearestTo(cur.x, cur.y, s.chainR, visited, det);
            if (!nx) break;
            chain.push(nx);
            visited.push(nx);
            cur = nx;
          }
          var pts = [t.x, t.y];
          for (var z = 0; z < chain.length; z++) {
            pts.push(chain[z].x, chain[z].y);
          }
          bolts.push({ pts: jag(pts), t: 0, d: 0.14, col: 'rgba(254,249,195,.95)', w: 0.05 });
          for (var zz = 0; zz < chain.length; zz++) hurt(chain[zz], dmg, true, t, -t.id);
        }
        if (!any) return false;
        if (time - sndBoom > 0.08) {
          sndBoom = time;
          sfx({ f: 1800, f2: 200, d: 0.08, type: 'sawtooth', v: 0.035 });
        }
        return true;
      }
      return false;
    }
    function nearestTo(x, y, r, exclude, det) {
      var best = null;
      var bd = r * r;
      for (var i = 0; i < balloons.length; i++) {
        var b = balloons[i];
        if (b.dead || (b.hid && !det) || exclude.indexOf(b) > -1) continue;
        var dx = b.x - x;
        var dy = b.y - y;
        var d2 = dx * dx + dy * dy;
        if (d2 < bd) {
          bd = d2;
          best = b;
        }
      }
      return best;
    }
    // Lightning: insert a jittered midpoint between each pair of points.
    function jag(pts) {
      var out = [pts[0], pts[1]];
      for (var i = 2; i < pts.length; i += 2) {
        var x0 = pts[i - 2];
        var y0 = pts[i - 1];
        var x1 = pts[i];
        var y1 = pts[i + 1];
        var mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 0.4;
        var my = (y0 + y1) / 2 + (Math.random() - 0.5) * 0.4;
        out.push(mx, my, x1, y1);
      }
      return out;
    }

    function explode(x, y, p) {
      var R = p.radius;
      var hit = 0;
      var list = [];
      for (var i = 0; i < balloons.length && hit < p.pierce; i++) {
        var b = balloons[i];
        if (b.dead) continue;
        var dx = b.x - x;
        var dy = b.y - y;
        var rr = R + BT[b.t].r * 0.7;
        if (dx * dx + dy * dy > rr * rr) continue;
        list.push(b);
        hit++;
      }
      for (var j = 0; j < list.length; j++) {
        var bb = list[j];
        var big = isBig(bb);
        if (p.stun) bb.stun = Math.max(bb.stun, big ? p.stun * 0.3 : p.stun);
        hurt(bb, p.dmg + (big || BT[bb.t].hp > 1 ? p.bigDmg : 0), true, p.tw, p.id);
      }
      rings.push({ x: x, y: y, r: 0.1, r2: R, t: 0, d: 0.25, col: 'rgba(255,200,80,.9)', w: 0.1, fill: 'rgba(255,170,60,.25)' });
      for (var k = 0; k < 8; k++) burst(x, y, k % 2 ? '#fb923c' : '#78350f', 2.2);
      if (R > 1.2) shake = Math.max(shake, 0.12);
      if (time - sndBoom > 0.12) {
        sndBoom = time;
        sfx({ f: 140, f2: 40, d: 0.22, type: 'sine', v: 0.12 });
        IGAME.sfx.noise({ d: 0.18, f: 700, v: 0.08 });
      }
      for (var f = 0; f < p.frags; f++) {
        var a = (f / p.frags) * TAU;
        newProj('frag', p.tw, x, y, a, 9, 0.28, { pierce: 1, dmg: 1, heavy: false, r: 0.08 });
      }
    }

    /* ---------------- abilities (five) ---------------- */
    function useAbility(t) {
      if (!t || !abilityUnlocked(t) || t.abCd > 0 || (state !== 'wave' && state !== 'build')) {
        if (t && abilityUnlocked(t) && t.abCd > 0) {
          sfx('error');
          toast('Recharging: ' + Math.ceil(t.abCd) + ' s');
        }
        return;
      }
      var A = t.def.ability;
      t.abCd = A.cd;
      sfx('boost');
      var s = t.s;
      switch (t.def.id) {
        case 'squirrel':
          t.blitz = 8;
          break;
        case 'hedgehog':
          for (var k = 0; k < 48; k++) newProj('spine', t, t.x, t.y, (k / 48) * TAU, 8, 0.7, { pierce: 5, dmg: 2, heavy: true, r: 0.1 });
          rings.push({ x: t.x, y: t.y, r: 0.2, r2: 3, t: 0, d: 0.4, col: 'rgba(251,146,60,.8)', w: 0.08 });
          break;
        case 'beetle': {
          var targets = balloons.filter(function (b) { return !b.dead && b.x > 0 && b.x < GW && b.y > 0 && b.y < GH; });
          targets.sort(function (a, b) { return remaining(a) - remaining(b); });
          for (var i = 0; i < 10; i++) {
            var tb = targets[Math.floor((i / 10) * targets.length)];
            var px;
            var py;
            if (tb) {
              px = tb.x;
              py = tb.y;
            } else {
              pathAt(PATHS[i % PATHS.length], PATHS[i % PATHS.length].len * (0.2 + i * 0.07), tmp);
              px = tmp.x;
              py = tmp.y;
            }
            var a = Math.atan2(py - t.y, px - t.x);
            var dd = Math.sqrt((px - t.x) * (px - t.x) + (py - t.y) * (py - t.y));
            var pr = newProj('bomb', t, t.x, t.y, a, 9, dd / 9 + 0.02 + i * 0.01, {
              pierce: 40, dmg: 4, heavy: true, r: 0.16, tx: px, ty: py, radius: 1.1, stun: 0.4, frags: 0, bigDmg: 4,
            });
            void pr;
          }
          break;
        }
        case 'snail':
          balloons.forEach(function (b) {
            if (b.dead) return;
            b.slow = Math.max(b.slow, isBig(b) ? 0.3 : 0.6);
            b.slowT = Math.max(b.slowT, 6);
          });
          rings.push({ x: GW / 2, y: GH / 2, r: 0.5, r2: 10, t: 0, d: 0.6, col: 'rgba(132,204,22,.6)', w: 0.3 });
          break;
        case 'owl': {
          var best = null;
          var bs = -1;
          balloons.forEach(function (b) {
            if (b.dead) return;
            var sc = BT[b.t].rbe * 1000 + b.hp;
            if (sc > bs) {
              bs = sc;
              best = b;
            }
          });
          if (best) {
            bolts.push({ pts: [t.x, t.y, best.x, best.y], t: 0, d: 0.35, col: 'rgba(255,255,255,1)', w: 0.16 });
            shake = Math.max(shake, 0.2);
            hurt(best, 500, true, t, -t.id);
          }
          break;
        }
        case 'hive':
          for (var q = 0; q < 30; q++) {
            var tg = balloons.length ? balloons[Math.floor(Math.random() * balloons.length)] : null;
            newProj('bee', t, t.x, t.y, Math.random() * TAU, s.speed, 4, { pierce: s.pierce, dmg: effDmg(t), heavy: isHeavy(t), r: 0.1, tgt: tg, detect: true });
          }
          break;
        case 'firefly': {
          var list = balloons.filter(function (b) { return !b.dead && b.x > -0.3 && b.x < GW + 0.3 && b.y > -0.3 && b.y < GH + 0.3; });
          list.sort(function (a, b) {
            return (a.x - t.x) * (a.x - t.x) + (a.y - t.y) * (a.y - t.y) - ((b.x - t.x) * (b.x - t.x) + (b.y - t.y) * (b.y - t.y));
          });
          list = list.slice(0, 40);
          list.forEach(function (b) {
            bolts.push({ pts: jag([t.x, t.y, b.x, b.y]), t: 0, d: 0.3, col: 'rgba(254,249,195,.95)', w: 0.05 });
            hurt(b, 3, true, t, -t.id);
          });
          shake = Math.max(shake, 0.15);
          break;
        }
        case 'mole':
          cash += 600;
          floatText(t.x, t.y - 0.4, '+$600', '#fde047');
          for (var m = 0; m < 16; m++) burst(t.x, t.y, '#fde047', 2);
          sfx('coin');
          break;
        case 'moth':
          fullMoonT = 8;
          rings.push({ x: t.x, y: t.y, r: 0.3, r2: 12, t: 0, d: 0.8, col: 'rgba(254,240,138,.7)', w: 0.25 });
          break;
      }
      toast(A.name + '!');
      buildInfo();
      dirty();
    }

    /* ================================================================ */
    /* Simulation                                                        */
    /* ================================================================ */
    function step(dt) {
      time += dt;
      if (fullMoonT > 0) fullMoonT -= dt;

      // spawns
      if (wave) {
        wave.t += dt;
        while (wave.qi < wave.q.length && wave.q[wave.qi].t <= wave.t) {
          var sp = wave.q[wave.qi++];
          var fp = wave.fp;
          spawnBalloon(sp.type, sp.p, 0, sp.hid, sp.rg, sp.type <= 4 ? sp.type : sp.type === 5 ? 2 : 4, fp ? 1 + 0.08 * fp : 1, fp ? Math.min(1.5, 1 + 0.012 * fp) : 1);
        }
      }

      // moths with slow/reveal auras
      var moths = null;
      for (var mi = 0; mi < towers.length; mi++) {
        var mt = towers[mi];
        if (mt.def.kind === 'aura' && (mt.s.slowAura || mt.s.reveal)) (moths || (moths = [])).push(mt);
      }

      // balloons
      for (var i = 0; i < balloons.length; i++) {
        var bl = balloons[i];
        if (bl.dead) continue;
        var T = BT[bl.t];
        var spd = T.speed * diff.speed * bl.spdMul;
        if (bl.slowT > 0) {
          bl.slowT -= dt;
          spd *= 1 - bl.slow;
          if (bl.slowT <= 0) {
            bl.slow = 0;
            bl.acid = 0;
          } else if (bl.acid > 0) {
            bl.acidT -= dt;
            if (bl.acidT <= 0) {
              bl.acidT = 1.5;
              hurt(bl, bl.acid, true, bl.acidBy || null, 0);
              if (bl.dead) continue;
            }
          }
        }
        if (moths) {
          for (var mj = 0; mj < moths.length; mj++) {
            var m = moths[mj];
            var mdx = m.x - bl.x;
            var mdy = m.y - bl.y;
            if (mdx * mdx + mdy * mdy <= m.s.aura * m.s.aura) {
              if (m.s.reveal) bl.hid = false;
              if (m.s.slowAura) spd *= 1 - Math.min(0.5, m.s.slowAura) * (isBig(bl) ? 0.5 : 1);
            }
          }
        }
        if (bl.stun > 0) {
          bl.stun -= dt;
          spd = 0;
        }
        if (bl.frz > 0) {
          bl.frz -= dt;
          spd = 0;
        }
        bl.d += spd * dt;
        // regrow one layer every 2.5 s, up to the balloon it started as
        if (bl.rg && bl.t < bl.rgMax && bl.t < 4) {
          bl.rgT += dt;
          if (bl.rgT > 2.5) {
            bl.rgT = 0;
            bl.t++;
            bl.hp = 1;
            for (var gk = 0; gk < 3; gk++) burst(bl.x, bl.y, '#4ade80', 0.8);
          }
        }
        var P = PATHS[bl.p];
        if (bl.d >= P.len) {
          leak(bl);
          continue;
        }
        pathAt(P, bl.d, tmp);
        bl.x = tmp.x;
        bl.y = tmp.y;
        bl.a = tmp.a;
      }
      if (state === 'over') return;

      // buckets
      for (var bk = 0; bk < buckets.length; bk++) buckets[bk].length = 0;
      for (var j = 0; j < balloons.length; j++) {
        var bb = balloons[j];
        if (bb.dead || BT[bb.t].big) continue;
        var cx = clamp(Math.floor(bb.x) - BX0, 0, BW - 1);
        var cy = clamp(Math.floor(bb.y) - BY0, 0, BH - 1);
        buckets[cy * BW + cx].push(bb);
      }

      // towers
      for (var k = 0; k < towers.length; k++) {
        var t = towers[k];
        if (t.kick > 0) t.kick -= dt;
        if (t.pop > 0) t.pop -= dt;
        if (t.abCd > 0) t.abCd = Math.max(0, t.abCd - dt);
        if (t.blitz > 0) t.blitz -= dt;
        var kind = t.def.kind;
        if (kind === 'farm') {
          if (wave && t.coinQ > 0) {
            t.coinT -= dt;
            if (t.coinT <= 0) {
              t.coinQ--;
              t.coinT = 16 / Math.max(1, t.s.coins);
              coins.push({ x: t.x, y: t.y, vx: (Math.random() - 0.5) * 1.6, vy: -2.4, t: 0, val: Math.round(t.s.value) });
            }
          }
          continue;
        }
        if (kind === 'aura') continue;
        if (wave || balloons.length) {
          t.cd -= dt * rateMul(t);
          if (t.cd <= 0) {
            if (fire(t)) t.cd += t.s.rate;
            else t.cd = 0;
          }
          if (t.s.field) {
            t.fieldCd -= dt * rateMul(t);
            if (t.fieldCd <= 0) {
              t.fieldCd = 1.2 / t.s.field;
              var fr = effRange(t);
              var fdet = canDetect(t);
              var nh = 0;
              for (var fi = 0; fi < balloons.length && nh < 25; fi++) {
                var fb = balloons[fi];
                if (fb.dead || (fb.hid && !fdet)) continue;
                var fdx = fb.x - t.x;
                var fdy = fb.y - t.y;
                if (fdx * fdx + fdy * fdy > fr * fr) continue;
                nh++;
                if (bolts.length < 60) bolts.push({ pts: [t.x, t.y, fb.x, fb.y], t: 0, d: 0.08, col: 'rgba(165,243,252,.7)', w: 0.025 });
                hurt(fb, 1, true, t, -t.id);
              }
            }
          }
        }
      }

      // projectiles
      for (var pi = 0; pi < projs.length; pi++) {
        var p = projs[pi];
        if (p.kind === 'bomb') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) {
            explode(p.tx, p.ty, p);
            p.pierce = 0;
          } else if (touchAny(p)) {
            explode(p.x, p.y, p);
            p.pierce = 0;
          }
          continue;
        }
        if (p.kind === 'bee') {
          var tg = p.tgt;
          if (!tg || tg.dead || (tg.hid && !p.detect) || p.hits.indexOf(tg.id) > -1) {
            p.tgt = tg = nearestTo(p.x, p.y, 3.5, p.hitsObj, p.detect);
          }
          if (tg) {
            var want = Math.atan2(tg.y - p.y, tg.x - p.x);
            var da = want - p.ang;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            p.ang += clamp(da, -9 * dt, 9 * dt);
          } else p.ang += Math.sin(time * 7 + p.id) * dt * 3;
          p.vx = Math.cos(p.ang) * p.spd;
          p.vy = Math.sin(p.ang) * p.spd;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0 || p.x < -1.5 || p.y < -1.5 || p.x > GW + 1.5 || p.y > GH + 1.5) {
          p.pierce = 0;
          continue;
        }
        collide(p);
      }
      var w = 0;
      for (var pc = 0; pc < projs.length; pc++) if (projs[pc].pierce > 0) projs[w++] = projs[pc];
      projs.length = w;

      // compact balloons
      w = 0;
      for (var bc = 0; bc < balloons.length; bc++) if (!balloons[bc].dead) balloons[w++] = balloons[bc];
      balloons.length = w;
      if (bigs.length) {
        w = 0;
        for (var gc = 0; gc < bigs.length; gc++) if (!bigs[gc].dead && BT[bigs[gc].t].big) bigs[w++] = bigs[gc];
        bigs.length = w;
      }

      // wave over?
      if (wave && wave.qi >= wave.q.length && balloons.length === 0 && state === 'wave') endWave();
    }

    function touchAny(p) {
      var x0 = clamp(Math.floor(p.x - 0.5) - BX0, 0, BW - 1);
      var x1 = clamp(Math.floor(p.x + 0.5) - BX0, 0, BW - 1);
      var y0 = clamp(Math.floor(p.y - 0.5) - BY0, 0, BH - 1);
      var y1 = clamp(Math.floor(p.y + 0.5) - BY0, 0, BH - 1);
      for (var cy = y0; cy <= y1; cy++)
        for (var cx = x0; cx <= x1; cx++) {
          var arr = buckets[cy * BW + cx];
          for (var i = 0; i < arr.length; i++) {
            var b = arr[i];
            if (b.dead) continue;
            var dx = b.x - p.x;
            var dy = b.y - p.y;
            var rr = p.r + BT[b.t].r * 0.8;
            if (dx * dx + dy * dy < rr * rr) return true;
          }
        }
      for (var k = 0; k < bigs.length; k++) {
        var g2 = bigs[k];
        var ddx = g2.x - p.x;
        var ddy = g2.y - p.y;
        var r2 = p.r + BT[g2.t].r * 0.9;
        if (ddx * ddx + ddy * ddy < r2 * r2) return true;
      }
      return false;
    }

    function collide(p) {
      var x0 = clamp(Math.floor(p.x - p.r - 0.4) - BX0, 0, BW - 1);
      var x1 = clamp(Math.floor(p.x + p.r + 0.4) - BX0, 0, BW - 1);
      var y0 = clamp(Math.floor(p.y - p.r - 0.4) - BY0, 0, BH - 1);
      var y1 = clamp(Math.floor(p.y + p.r + 0.4) - BY0, 0, BH - 1);
      for (var cy = y0; cy <= y1; cy++)
        for (var cx = x0; cx <= x1; cx++) {
          var arr = buckets[cy * BW + cx];
          for (var i = 0; i < arr.length; i++) {
            var b = arr[i];
            if (b.dead || b.immune === p.id || p.hits.indexOf(b.id) > -1) continue;
            var dx = b.x - p.x;
            var dy = b.y - p.y;
            var rr = p.r + BT[b.t].r * 0.85;
            if (dx * dx + dy * dy < rr * rr) {
              onHit(p, b);
              if (p.pierce <= 0) return;
            }
          }
        }
      for (var k = 0; k < bigs.length; k++) {
        var g2 = bigs[k];
        if (g2.dead || p.hits.indexOf(g2.id) > -1) continue;
        var ddx = g2.x - p.x;
        var ddy = g2.y - p.y;
        var r2 = p.r + BT[g2.t].r * 0.9;
        if (ddx * ddx + ddy * ddy < r2 * r2) {
          onHit(p, g2);
          if (p.pierce <= 0) return;
        }
      }
    }

    function onHit(p, b) {
      p.hits.push(b.id);
      if (p.hitsObj) p.hitsObj.push(b);
      if (p.kind === 'slime') {
        p.pierce = 0;
        var s = p.s;
        applySlime(b, s, p.tw);
        if (s.splash) {
          var near = [b];
          for (var k = 0; k < s.splash; k++) {
            var nb = nearestTo(b.x, b.y, 1.0, near, true);
            if (!nb) break;
            near.push(nb);
            applySlime(nb, s, p.tw);
          }
        }
        for (var q = 0; q < 5; q++) burst(b.x, b.y, '#84cc16', 1);
        return;
      }
      p.pierce--;
      var big = isBig(b);
      var ok = hurt(b, p.dmg + (big ? p.bigDmg : 0), p.heavy, p.tw, p.id);
      if (!ok) {
        p.pierce = 0;
        return;
      }
      if (p.slow && !b.dead && !big) {
        b.slow = Math.max(b.slow, p.slow);
        b.slowT = Math.max(b.slowT, p.slowT);
      }
    }

    function leak(b) {
      var T = BT[b.t];
      b.dead = true;
      lives -= T.leak;
      shake = Math.max(shake, T.big ? 0.4 : 0.12);
      floatText(b.x - 0.4, b.y, '-' + T.leak + ' ❤', '#fca5a5');
      if (time - sndLeak > 0.25) {
        sndLeak = time;
        sfx('hit');
      }
      if (lives <= 0) {
        lives = 0;
        loseGame();
      }
      dirty();
    }

    function updateFx(dt) {
      var w = 0;
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i];
        q.t += dt;
        if (q.t >= q.d) continue;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy += 3 * dt;
        q.vx *= 0.97;
        parts[w++] = q;
      }
      parts.length = w;
      w = 0;
      for (var j = 0; j < rings.length; j++) {
        rings[j].t += dt;
        if (rings[j].t < rings[j].d) rings[w++] = rings[j];
      }
      rings.length = w;
      w = 0;
      for (var k = 0; k < texts.length; k++) {
        texts[k].t += dt;
        if (texts[k].t < 1.1) texts[w++] = texts[k];
      }
      texts.length = w;
      w = 0;
      for (var l = 0; l < bolts.length; l++) {
        bolts[l].t += dt;
        if (bolts[l].t < bolts[l].d) bolts[w++] = bolts[l];
      }
      bolts.length = w;
      w = 0;
      for (var m = 0; m < coins.length; m++) {
        var c = coins[m];
        c.t += dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 6 * dt;
        if (c.t > 0.75) {
          cash += c.val;
          floatText(c.x, c.y - 0.2, '+$' + c.val, '#fde047');
          sfx('coin');
          dirty();
          continue;
        }
        coins[w++] = c;
      }
      coins.length = w;
      if (shake > 0) shake = Math.max(0, shake - dt);
    }

    /* ================================================================ */
    /* Rendering                                                         */
    /* ================================================================ */
    function render() {
      var dpr = view.dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#0f2418';
      g.fillRect(0, 0, L.w, L.h);
      if (!M) return;
      var sx = 0;
      var sy = 0;
      if (shake > 0) {
        sx = (Math.random() - 0.5) * shake * L.t * 0.4;
        sy = (Math.random() - 0.5) * shake * L.t * 0.4;
      }
      g.drawImage(bg, L.mx + sx, L.my + sy, L.mw, L.mh);
      var T0 = L.t * dpr;
      g.save();
      g.beginPath();
      g.rect(L.mx, L.my, L.mw, L.mh);
      g.clip();
      g.setTransform(T0, 0, 0, T0, (L.mx + sx) * dpr, (L.my + sy) * dpr);

      // auras (moth glow) under everything
      for (var a = 0; a < towers.length; a++) {
        var mt = towers[a];
        if (mt.def.kind !== 'aura') continue;
        g.fillStyle = 'rgba(254,240,138,' + (0.07 + Math.sin(time * 2 + a) * 0.02).toFixed(3) + ')';
        circ(g, mt.x, mt.y, mt.s.aura);
        g.fill();
      }

      // placement ghost / range
      var showRangeOf = selected;
      if (placing && ghost.on) {
        var why = canPlace(ghost.tx, ghost.ty);
        var def = TOWERS[placing];
        var gx = ghost.tx + 0.5;
        var gy = ghost.ty + 0.5;
        var gr = def.kind === 'aura' ? def.base.aura : def.kind === 'farm' ? 0 : def.base.range > 50 ? 0 : def.base.range;
        g.fillStyle = why ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.14)';
        g.fillRect(ghost.tx, ghost.ty, 1, 1);
        if (gr) {
          g.fillStyle = why ? 'rgba(239,68,68,.12)' : 'rgba(255,255,255,.12)';
          g.strokeStyle = why ? 'rgba(239,68,68,.8)' : 'rgba(255,255,255,.7)';
          g.lineWidth = 0.04;
          circ(g, gx, gy, gr);
          g.fill();
          g.stroke();
        }
        g.save();
        g.translate(gx, gy);
        g.globalAlpha = why ? 0.45 : 0.85;
        drawCritter(g, placing, -Math.PI / 2, null, time);
        g.restore();
      }
      if (showRangeOf && showRangeOf.def.kind !== 'farm') {
        var rr = showRangeOf.def.kind === 'aura' ? showRangeOf.s.aura : showRangeOf.s.range > 50 ? 0 : effRange(showRangeOf);
        if (rr) {
          g.fillStyle = 'rgba(255,255,255,.12)';
          g.strokeStyle = 'rgba(255,255,255,.75)';
          g.lineWidth = 0.04;
          circ(g, showRangeOf.x, showRangeOf.y, rr);
          g.fill();
          g.stroke();
        }
      }
      if (cursor.on && !placing) {
        g.strokeStyle = 'rgba(253,224,71,.9)';
        g.lineWidth = 0.05;
        g.strokeRect(cursor.tx + 0.04, cursor.ty + 0.04, 0.92, 0.92);
      }

      // towers
      for (var i = 0; i < towers.length; i++) {
        var t = towers[i];
        g.save();
        var kick = t.kick > 0 ? t.kick * 0.4 : 0;
        g.translate(t.x - Math.cos(t.ang) * kick, t.y - Math.sin(t.ang) * kick);
        if (t.pop > 0) {
          var sc = 1 + Math.sin((t.pop / 0.35) * Math.PI) * 0.18;
          g.scale(sc, sc);
        }
        if (t === selected) {
          g.strokeStyle = '#fde047';
          g.lineWidth = 0.05;
          circ(g, 0, 0, 0.46);
          g.stroke();
        }
        drawCritter(g, t.def.id, t.ang, t.tiers, time + t.id);
        if (t.blitz > 0 || (fullMoonT > 0 && t.def.kind !== 'aura' && t.def.kind !== 'farm')) {
          g.strokeStyle = 'rgba(253,224,71,' + (0.5 + Math.sin(time * 12) * 0.3).toFixed(3) + ')';
          g.lineWidth = 0.04;
          circ(g, 0, 0, 0.5);
          g.stroke();
        }
        g.restore();
      }

      // balloons
      for (var j = 0; j < balloons.length; j++) {
        var b = balloons[j];
        if (b.dead || BT[b.t].big) continue;
        var spr = b.hid ? spritesHid[b.t] : sprites[b.t];
        if (!spr) continue;
        var by = b.y + Math.sin(time * 3 + b.ph) * 0.03;
        g.drawImage(spr.cv, b.x - spr.w / 2, by - spr.h / 2 + spr.oy, spr.w, spr.h);
        if (b.rg && leaf) g.drawImage(leaf.cv, b.x - leaf.w / 2, by - BT[b.t].r - leaf.h * 0.4, leaf.w, leaf.h);
        if (b.slowT > 0 && slimeSpr) g.drawImage(slimeSpr.cv, b.x - slimeSpr.w / 2, by - BT[b.t].r * 0.75 - slimeSpr.h * 0.2, slimeSpr.w, slimeSpr.h);
        if (b.frz > 0 && iceSpr) g.drawImage(iceSpr.cv, b.x - iceSpr.w / 2, by - iceSpr.h / 2, iceSpr.w, iceSpr.h);
        if (b.stun > 0) {
          g.fillStyle = '#fde047';
          for (var st = 0; st < 3; st++) {
            var sa = time * 6 + (st * TAU) / 3;
            circ(g, b.x + Math.cos(sa) * 0.22, by - 0.3 + Math.sin(sa) * 0.06, 0.035);
            g.fill();
          }
        }
        if (BT[b.t].hp > 1 && b.hp < BT[b.t].hp * b.hpMul) {
          var f = b.hp / (BT[b.t].hp * b.hpMul);
          g.fillStyle = 'rgba(0,0,0,.5)';
          g.fillRect(b.x - 0.25, by - 0.47, 0.5, 0.06);
          g.fillStyle = '#fbbf24';
          g.fillRect(b.x - 0.24, by - 0.46, 0.48 * f, 0.04);
        }
      }
      for (var k = 0; k < bigs.length; k++) {
        var wb = bigs[k];
        if (wb.dead) continue;
        g.save();
        g.translate(wb.x, wb.y + Math.sin(time * 1.5 + wb.ph) * 0.04);
        if (wb.hid) g.globalAlpha = 0.55;
        drawWhale(g, BT[wb.t], wb.a, wb.hp / (BT[wb.t].hp * wb.hpMul), time);
        if (wb.slowT > 0) {
          g.fillStyle = 'rgba(132,204,22,.45)';
          ell(g, 0, -0.1, 0.5, 0.2, 0);
          g.fill();
        }
        g.restore();
      }

      // projectiles
      for (var pi = 0; pi < projs.length; pi++) {
        var p = projs[pi];
        switch (p.kind) {
          case 'burr':
            g.fillStyle = '#6b3f12';
            circ(g, p.x, p.y, p.r * 0.8);
            g.fill();
            g.strokeStyle = '#a16207';
            g.lineWidth = 0.025;
            g.beginPath();
            for (var bs = 0; bs < 4; bs++) {
              var ba = bs * 0.785 + time * 10;
              g.moveTo(p.x + Math.cos(ba) * p.r * 1.3, p.y + Math.sin(ba) * p.r * 1.3);
              g.lineTo(p.x - Math.cos(ba) * p.r * 1.3, p.y - Math.sin(ba) * p.r * 1.3);
            }
            g.stroke();
            break;
          case 'cone':
            g.save();
            g.translate(p.x, p.y);
            g.rotate(time * 8);
            g.fillStyle = '#7c4a1e';
            ell(g, 0, 0, p.r * 1.1, p.r * 0.8, 0);
            g.fill();
            g.strokeStyle = '#d6a15f';
            g.lineWidth = 0.025;
            g.beginPath();
            g.moveTo(-p.r, 0);
            g.lineTo(p.r, 0);
            g.moveTo(0, -p.r * 0.7);
            g.lineTo(0, p.r * 0.7);
            g.stroke();
            g.restore();
            break;
          case 'spine':
          case 'frag':
            g.strokeStyle = p.heavy ? '#fb923c' : p.kind === 'frag' ? '#78350f' : '#3f2a1c';
            g.lineWidth = 0.045;
            g.beginPath();
            g.moveTo(p.x, p.y);
            g.lineTo(p.x - (p.vx / p.spd) * 0.22, p.y - (p.vy / p.spd) * 0.22);
            g.stroke();
            break;
          case 'bomb': {
            g.fillStyle = 'rgba(0,0,0,.25)';
            ell(g, p.x, p.y + 0.2, 0.1, 0.05, 0);
            g.fill();
            g.fillStyle = '#3f2a14';
            circ(g, p.x, p.y, 0.13);
            g.fill();
            g.fillStyle = '#fbbf24';
            circ(g, p.x + 0.06, p.y - 0.09, 0.04 + Math.random() * 0.02);
            g.fill();
            break;
          }
          case 'slime':
            g.fillStyle = '#84cc16';
            circ(g, p.x, p.y, p.r);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,.5)';
            circ(g, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35);
            g.fill();
            break;
          case 'bee':
            drawBee(g, p.x, p.y, p.ang, 1.15);
            break;
        }
      }

      // bolts & strikes
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (var bi2 = 0; bi2 < bolts.length; bi2++) {
        var bo = bolts[bi2];
        var al = 1 - bo.t / bo.d;
        g.strokeStyle = bo.col;
        g.globalAlpha = al;
        g.lineWidth = bo.w;
        g.beginPath();
        g.moveTo(bo.pts[0], bo.pts[1]);
        for (var q = 2; q < bo.pts.length; q += 2) g.lineTo(bo.pts[q], bo.pts[q + 1]);
        g.stroke();
      }
      g.globalAlpha = 1;

      // rings
      for (var ri = 0; ri < rings.length; ri++) {
        var r = rings[ri];
        var u = r.t / r.d;
        var rad = r.r + (r.r2 - r.r) * (1 - (1 - u) * (1 - u));
        g.globalAlpha = 1 - u;
        if (r.fill) {
          g.fillStyle = r.fill;
          circ(g, r.x, r.y, rad);
          g.fill();
        }
        g.strokeStyle = r.col;
        g.lineWidth = r.w;
        circ(g, r.x, r.y, rad);
        g.stroke();
      }
      g.globalAlpha = 1;

      // particles
      for (var pa = 0; pa < parts.length; pa++) {
        var pp = parts[pa];
        g.globalAlpha = 1 - pp.t / pp.d;
        g.fillStyle = pp.col;
        g.fillRect(pp.x - pp.s / 2, pp.y - pp.s / 2, pp.s, pp.s);
      }
      g.globalAlpha = 1;

      // coins
      for (var ci = 0; ci < coins.length; ci++) {
        var cn = coins[ci];
        g.fillStyle = '#facc15';
        ell(g, cn.x, cn.y, 0.12 * Math.abs(Math.cos(cn.t * 10)) + 0.02, 0.12, 0);
        g.fill();
        g.strokeStyle = '#a16207';
        g.lineWidth = 0.025;
        g.stroke();
      }
      g.restore();

      // floating texts in pixels (fonts don't like tiny tile units)
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (texts.length) {
        g.textAlign = 'center';
        g.font = '900 ' + Math.round(clamp(L.t * 0.36, 11, 22)) + 'px system-ui, sans-serif';
        for (var ti = 0; ti < texts.length; ti++) {
          var tx = texts[ti];
          g.globalAlpha = 1 - tx.t / 1.1;
          g.fillStyle = 'rgba(0,0,0,.6)';
          var X = L.mx + tx.x * L.t;
          var Y = L.my + (tx.y - tx.t * 0.8) * L.t;
          g.fillText(tx.txt, X + 1, Y + 1);
          g.fillStyle = tx.col;
          g.fillText(tx.txt, X, Y);
        }
        g.globalAlpha = 1;
      }
      // wave / speed badge on the map
      if (state === 'wave' && speed > 1) {
        g.font = '900 ' + Math.round(clamp(L.t * 0.32, 11, 18)) + 'px system-ui, sans-serif';
        g.textAlign = 'right';
        g.fillStyle = 'rgba(0,0,0,.45)';
        g.fillText('▶▶ ' + speed + '×', L.mx + L.mw - 8, L.my + L.mh - 9);
        g.fillStyle = '#fde047';
        g.fillText('▶▶ ' + speed + '×', L.mx + L.mw - 9, L.my + L.mh - 10);
      }
    }

    /* ================================================================ */
    /* Panel UI                                                          */
    /* ================================================================ */
    var uiDirty = true;
    var panelMode = '';
    var shopEls = [];
    var infoRefs = null;
    var lastStat = '';
    function dirty() {
      uiDirty = true;
    }
    function updateStats() {
      var waveLabel = state === 'wave' ? waveN : Math.max(1, waveN);
      var total = freeplay ? '∞' : V.waves;
      var key = lives + '|' + Math.floor(cash) + '|' + waveLabel + '|' + state + '|' + speed + '|' + (wave ? 1 : 0);
      if (key === lastStat) return;
      lastStat = key;
      stLives.innerHTML = '<small>Lives</small><span style="color:#fb7185">♥</span>' + lives;
      stCash.innerHTML = '<small>Cash</small><span style="color:#fde047">$' + IGAME.fmt(Math.floor(cash)) + '</span>';
      stWave.innerHTML = '<small>Wave</small>' + waveLabel + '/' + total;
      bSpeed.textContent = speed + '×';
      bSpeed.classList.toggle('pd-on', speed > 1);
      if (state === 'wave') {
        bGo.textContent = 'Wave ' + waveN + '…';
        bGo.disabled = true;
        bGo.classList.add('pd-busy');
      } else {
        bGo.textContent = '▶ Wave ' + (waveN + 1);
        bGo.disabled = state !== 'build';
        bGo.classList.remove('pd-busy');
      }
    }

    function showShop() {
      panelMode = 'shop';
      selected = null;
      infoRefs = null;
      body.innerHTML = '';
      var shop = ui.el('div', 'pd-shop');
      shopEls = [];
      TLIST.forEach(function (def, i) {
        var it = ui.el('button', 'pd-item');
        it.type = 'button';
        it.setAttribute('data-act', 'buy');
        it.setAttribute('data-id', def.id);
        it.title = def.name + ' — ' + def.desc;
        it.setAttribute('aria-label', def.name + ', $' + price(def.cost));
        it.appendChild(iconCanvas(def.id, 38));
        it.appendChild(ui.el('span', 'pd-nm', def.name.split(' ').pop()));
        var pr = ui.el('span', 'pd-price', '$' + price(def.cost));
        it.appendChild(pr);
        if (!ctx.isTouch) it.appendChild(ui.el('span', 'pd-key', String(i + 1)));
        shop.appendChild(it);
        shopEls.push({ el: it, def: def, pr: pr });
      });
      body.appendChild(shop);
      var hint = ui.el('div', 'pd-hint');
      hint.style.marginTop = '8px';
      body.appendChild(hint);
      var next = ui.el('div', 'pd-next');
      body.appendChild(next);
      shopEls.hint = hint;
      shopEls.next = next;
      shopEls.nextFor = -1;
      dirty();
    }
    function refreshShop() {
      shopEls.forEach(function (s) {
        var pr = price(s.def.cost);
        s.pr.textContent = '$' + pr;
        s.el.classList.toggle('pd-poor', cash < pr);
        s.el.classList.toggle('pd-sel', placing === s.def.id);
      });
      var h = '';
      if (placing) {
        var d = TOWERS[placing];
        h = '<b>' + d.name + '</b> — ' + d.desc + '<br>' + (ctx.isTouch ? 'Tap a grass tile, then tap again to place.' : 'Click a grass tile to place · Esc / right-click to cancel.');
      } else if (hintText) h = hintText;
      else if (state === 'build' && waveN === 0 && !towers.length) h = 'Pick a critter, place it next to the path, then press <b>▶ Wave 1</b>.';
      else if (state === 'build') h = 'Tap a critter on the map to upgrade it. ' + (ctx.isTouch ? '' : 'Space starts the next wave.');
      if (shopEls.hint && shopEls.hintCache !== h) {
        shopEls.hintCache = h;
        shopEls.hint.innerHTML = h;
      }
      var nn = state === 'wave' ? -1 : waveN + 1;
      if (shopEls.next && shopEls.nextFor !== nn) {
        shopEls.nextFor = nn;
        shopEls.next.innerHTML = nn > 0 && (nn <= V.waves || freeplay) ? '<b>Next wave:</b> ' + waveSummary(nn) : '';
      }
    }

    function selectTower(t) {
      selected = t;
      placing = null;
      ghost.on = false;
      if (t) buildInfo();
      else showShop();
      dirty();
    }
    function buildInfo() {
      var t = selected;
      if (!t) return;
      panelMode = 'info';
      body.innerHTML = '';
      var box = ui.el('div', 'pd-info');
      var head = ui.el('div', 'pd-ihead');
      head.appendChild(iconCanvas(t.def.id, 34));
      var nm = ui.el('div', 'pd-iname', t.def.name + '<small></small>');
      head.appendChild(nm);
      var x = mkBtn('✕', 'Close (Esc)', 'close');
      x.className += ' pd-x';
      head.appendChild(x);
      box.appendChild(head);
      var ups = ui.el('div', 'pd-ups');
      var upEls = [];
      for (var p = 0; p < 2; p++) {
        var b = ui.el('button', 'pd-up');
        b.type = 'button';
        b.setAttribute('data-act', 'up' + p);
        ups.appendChild(b);
        upEls.push(b);
      }
      box.appendChild(ups);
      var row = ui.el('div', 'pd-irow');
      var tgt = mkBtn('', 'Change targeting (C)', 'target');
      var sl = mkBtn('', 'Sell (Delete)', 'sell');
      sl.className += ' pd-sell';
      if (!t.def.noTarget) row.appendChild(tgt);
      row.appendChild(sl);
      box.appendChild(row);
      var ab = null;
      if (V.abilities) {
        ab = mkBtn('', 'Use ability (V)', 'ability');
        ab.className += ' pd-ab';
        box.appendChild(ab);
      }
      body.appendChild(box);
      infoRefs = { nm: nm, ups: upEls, tgt: tgt, sell: sl, ab: ab, key: '' };
      refreshInfo(true);
    }
    function refreshInfo(force) {
      var t = selected;
      if (!t || !infoRefs) return;
      var abKey = V.abilities ? (abilityUnlocked(t) ? Math.ceil(t.abCd) : -1) : 0;
      var key = Math.floor(cash) + '|' + t.tiers.join(',') + '|' + t.target + '|' + t.pops + '|' + abKey + '|' + diff.id;
      if (!force && key === infoRefs.key) return;
      infoRefs.key = key;
      infoRefs.nm.querySelector('small').textContent = 'Pops: ' + IGAME.fmt(t.pops) + (t.def.kind === 'farm' ? ' · ~$' + Math.round(t.s.coins * t.s.value + t.s.endBonus) + '/wave' : '');
      for (var p = 0; p < 2; p++) {
        var el = infoRefs.ups[p];
        var path = t.def.paths[p];
        var st = upState(t, p);
        var pips = '';
        for (var k = 0; k < V.tiers; k++) pips += k < t.tiers[p] ? '●' : '<i>●</i>';
        var html = '<span class="pd-pips">' + pips + ' ' + path.name + '</span>';
        el.className = 'pd-up';
        if (st === 'max') {
          html += '<span class="pd-uname">Maxed</span><span class="pd-udesc">' + path.ups[V.tiers - 1].name + '</span>';
          el.className += ' pd-max';
        } else if (st === 'lock') {
          html += '<span class="pd-uname">Locked</span><span class="pd-udesc">Only one path can go past tier 2.</span>';
          el.className += ' pd-lock';
        } else {
          var up = path.ups[t.tiers[p]];
          var cost = upPrice(t, p);
          html += '<span class="pd-uname">' + up.name + '</span><span class="pd-udesc">' + up.desc + '</span><span class="pd-price">$' + cost + '</span>';
          if (cash < cost) el.className += ' pd-poor';
        }
        el.innerHTML = html;
        el.title = (p ? 'X' : 'Z') + ' — ' + el.textContent;
      }
      infoRefs.tgt.textContent = '🎯 ' + TARGETS[t.target];
      infoRefs.sell.textContent = 'Sell $' + sellValue(t);
      if (infoRefs.ab) {
        var A = t.def.ability;
        if (!abilityUnlocked(t)) {
          infoRefs.ab.textContent = '🔒 ' + A.name + ' (tier 3)';
          infoRefs.ab.disabled = true;
        } else if (t.abCd > 0) {
          infoRefs.ab.textContent = '⏳ ' + A.name + ' ' + Math.ceil(t.abCd) + 's';
          infoRefs.ab.disabled = true;
        } else {
          infoRefs.ab.textContent = '⚡ ' + A.name;
          infoRefs.ab.disabled = false;
        }
        infoRefs.ab.title = A.name + ': ' + A.desc + ' (V)';
      }
    }

    var abKeyCache = '';
    function refreshAbilityBar() {
      if (!V.abilities) return;
      var list = towers.filter(abilityUnlocked).slice(0, 8);
      var key = list.map(function (t) {
        return t.id + ':' + Math.ceil(t.abCd);
      }).join(',') + '|' + state;
      if (key === abKeyCache) return;
      abKeyCache = key;
      abBar.innerHTML = '';
      if (state !== 'build' && state !== 'wave') return;
      list.forEach(function (t) {
        var b = ui.el('button', 'pd-abbtn', t.def.emoji);
        b.type = 'button';
        b.setAttribute('data-act', 'abil');
        b.setAttribute('data-tid', t.id);
        b.title = t.def.ability.name + ': ' + t.def.ability.desc;
        b.setAttribute('aria-label', t.def.ability.name);
        if (t.abCd > 0) {
          b.disabled = true;
          b.appendChild(ui.el('span', '', Math.ceil(t.abCd) + 's'));
        }
        abBar.appendChild(b);
      });
    }

    var uiTick = 0;
    function updateUI(dt) {
      uiTick -= dt;
      if (!uiDirty && uiTick > 0) return;
      uiTick = 0.2;
      uiDirty = false;
      updateStats();
      if (panelMode === 'shop') refreshShop();
      else if (panelMode === 'info') refreshInfo(false);
      refreshAbilityBar();
    }

    function onPanelClick(e) {
      var el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el || !(panel.contains(el) || abBar.contains(el))) return;
      var act = el.getAttribute('data-act');
      if (act === 'pause') return pauseGame();
      if (act === 'speed') return toggleSpeed();
      if (act === 'go') return startWave();
      if (state !== 'build' && state !== 'wave') return;
      if (act === 'buy') {
        var id = el.getAttribute('data-id');
        pickTower(id);
      } else if (act === 'close') {
        sfx('click');
        selectTower(null);
      } else if (act === 'up0') upgrade(selected, 0);
      else if (act === 'up1') upgrade(selected, 1);
      else if (act === 'target') cycleTarget();
      else if (act === 'sell') sell(selected);
      else if (act === 'ability') useAbility(selected);
      else if (act === 'abil') {
        var tidv = +el.getAttribute('data-tid');
        for (var i = 0; i < towers.length; i++) if (towers[i].id === tidv) useAbility(towers[i]);
      }
    }
    function pickTower(id) {
      if (placing === id) {
        placing = null;
        ghost.on = false;
        sfx('click');
        dirty();
        return;
      }
      var def = TOWERS[id];
      if (cash < price(def.cost)) {
        sfx('error');
        toast('Need $' + (price(def.cost) - cash) + ' more');
        return;
      }
      if (selected) showShop();
      placing = id;
      sfx('click');
      if (cursor.on) {
        ghost.tx = cursor.tx;
        ghost.ty = cursor.ty;
        ghost.on = true;
      } else ghost.on = false;
      dirty();
    }
    function cycleTarget() {
      if (!selected || selected.def.noTarget) return;
      selected.target = (selected.target + 1) % 4;
      sfx('click');
      saveRunIfIdle();
      refreshInfo(true);
    }
    function toggleSpeed() {
      speed = speed === 1 ? 2 : 1;
      sfx('click');
      dirty();
    }

    /* ================================================================ */
    /* Map input                                                         */
    /* ================================================================ */
    function toTile(e) {
      var r = view.canvas.getBoundingClientRect();
      var px = e.clientX - r.left - L.mx;
      var py = e.clientY - r.top - L.my;
      return { tx: Math.floor(px / L.t), ty: Math.floor(py / L.t), inside: px >= 0 && py >= 0 && px < L.mw && py < L.mh };
    }
    function onMove(e) {
      if (e.pointerType === 'touch') return;
      var p = toTile(e);
      if (placing) {
        ghost.on = p.inside;
        ghost.tx = p.tx;
        ghost.ty = p.ty;
      }
      cursor.on = false;
    }
    function onLeave(e) {
      if (e.pointerType !== 'touch' && placing) ghost.on = false;
    }
    function onDown(e) {
      if (e.button != null && e.button > 0) {
        if (e.button === 2 && placing) {
          placing = null;
          ghost.on = false;
          dirty();
        }
        return;
      }
      if (state !== 'build' && state !== 'wave') return;
      var p = toTile(e);
      if (!p.inside) return;
      cursor.on = false;
      if (placing) {
        var touch = e.pointerType === 'touch' || e.pointerType === 'pen';
        if (touch && !(ghost.on && ghost.tx === p.tx && ghost.ty === p.ty)) {
          ghost.on = true;
          ghost.tx = p.tx;
          ghost.ty = p.ty;
          var why = canPlace(p.tx, p.ty);
          if (why) {
            sfx('error');
            toast(why);
          } else sfx('tick');
          return;
        }
        tryPlace(p.tx, p.ty);
        return;
      }
      var t = towerAt(p.tx, p.ty);
      if (t) {
        sfx('click');
        selectTower(t);
      } else if (selected) selectTower(null);
    }
    function onCtx(e) {
      e.preventDefault();
    }

    function moveCursor(dx, dy) {
      if (!cursor.on) {
        cursor.on = true;
        if (selected) {
          cursor.tx = selected.tx;
          cursor.ty = selected.ty;
        }
      } else {
        cursor.tx = clamp(cursor.tx + dx, 0, GW - 1);
        cursor.ty = clamp(cursor.ty + dy, 0, GH - 1);
      }
      if (placing) {
        ghost.on = true;
        ghost.tx = cursor.tx;
        ghost.ty = cursor.ty;
      }
      sfx('tick');
    }
    function cursorAction() {
      if (placing) {
        if (!cursor.on) {
          moveCursor(0, 0);
          return;
        }
        tryPlace(cursor.tx, cursor.ty);
        return;
      }
      if (!cursor.on) {
        moveCursor(0, 0);
        return;
      }
      var t = towerAt(cursor.tx, cursor.ty);
      if (t) selectTower(t);
      else if (selected) selectTower(null);
    }

    /* ================================================================ */
    /* Game flow & menus                                                 */
    /* ================================================================ */
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
    }
    function resetField() {
      balloons.length = 0;
      bigs.length = 0;
      towers.length = 0;
      projs.length = 0;
      parts.length = 0;
      rings.length = 0;
      texts.length = 0;
      bolts.length = 0;
      coins.length = 0;
      wave = null;
      fullMoonT = 0;
      placing = null;
      selected = null;
      ghost.on = false;
      hintText = '';
    }
    function newGame(mi, di, fromSave) {
      closeOverlay();
      setMap(mi);
      diffIdx = di;
      diff = DIFFS[di];
      store.set('pick', { map: mi, diff: di });
      resetField();
      cash = START_CASH;
      lives = diff.lives;
      waveN = 0;
      freeplay = false;
      runPops = 0;
      if (fromSave) {
        cash = fromSave.cash;
        lives = fromSave.lives;
        waveN = fromSave.wave;
        freeplay = !!fromSave.fp;
        runPops = fromSave.pops || 0;
        fromSave.towers.forEach(function (a) {
          if (!TOWERS[a[0]] || V.towers.indexOf(a[0]) < 0) return;
          var t = addTower(a[0], a[1], a[2], [Math.min(a[3], V.tiers), Math.min(a[4], V.tiers)], a[6]);
          t.target = a[5] || 0;
          t.pops = a[7] || 0;
          t.pop = 0;
        });
        recalcBuffs();
      }
      state = 'build';
      speed = 1;
      renderBg();
      showShop();
      saveRun();
      if (!fromSave) toast(M.name + ' · ' + diff.name, 1400);
      else toast('Welcome back — wave ' + (waveN + 1) + ' is next', 1600);
      ctx.focus();
      dirty();
    }

    function stat(label, val) {
      return '<div>' + label + '<b>' + val + '</b></div>';
    }
    function medalCount() {
      var n = 0;
      V.maps.forEach(function (id) {
        var m = medals[id];
        if (m) DIFFS.forEach(function (d) {
          if (m[d.id]) n++;
        });
      });
      return n;
    }

    function showTitle() {
      closeOverlay();
      state = 'title';
      resetField();
      setMap(mapIdx);
      renderBg();
      showShop();
      var save = loadRunInfo();
      var btns = [{ label: '▶ Play', primary: true, onClick: showMaps }];
      if (save) {
        btns.unshift({
          label: '⟲ Continue · ' + MAPS[save.map].name + ' W' + (save.wave + 1),
          primary: true,
          onClick: function () {
            var di = 0;
            DIFFS.forEach(function (d, i) {
              if (d.id === save.diff) di = i;
            });
            newGame(V.maps.indexOf(save.map), di, save);
          },
        });
        btns[1].primary = false;
      }
      btns.push({ label: '? How to play', onClick: showHelp });
      overlay = ui.overlay(root, {
        title: ctx.title || 'Critter Pop TD',
        text: 'Place garden critters beside the path and pop every balloon before it reaches the burrow.',
        html:
          '<div class="pd-statrow">' + stat('Medals', medalCount() + '/' + V.maps.length * 3) + stat('Waves', V.waves + (V.freeplay ? '+' : '')) + stat('Total pops', IGAME.fmt(totalPops)) + '</div>',
        buttons: btns,
      });
      dirty();
    }

    function showHelp() {
      closeOverlay();
      var html =
        '<ul class="pd-help">' +
        '<li><b>Buy</b> a critter in the panel, then ' + (ctx.isTouch ? 'tap a grass tile and tap again to place it.' : 'click a grass tile to place it (keys 1–' + TLIST.length + ').') + '</li>' +
        '<li>Press <b>▶ Wave</b> (Space) to send balloons. Each layer popped pays $1, each cleared wave pays a bonus.</li>' +
        '<li>Tap a placed critter to <b>upgrade</b> it (Z / X), change its <b>target</b> (C) or <b>sell</b> it.</li>' +
        (V.crossLimit ? '<li>Each critter has two upgrade paths of four tiers. Only one path can go past tier 2. Tier 3 unlocks its <b>ability</b> (V).</li>' : '<li>Each critter has two upgrade paths with two tiers each — buy all four.</li>') +
        '<li><b>Hidden</b> balloons (dashed outline) can only be targeted by critters that see them. <b>Tin</b> balloons need heavy hits. <b>Leafy</b> balloons regrow.</li>' +
        '<li>Escaping balloons cost lives. Survive ' + V.waves + ' waves to earn a medal' + (V.freeplay ? ', then keep going in freeplay.' : '.') + '</li>' +
        '</ul>';
      overlay = ui.overlay(root, {
        title: 'How to play',
        html: html,
        buttons: [{ label: '▶ Play', primary: true, onClick: showMaps }, { label: '← Back', onClick: showTitle }],
      });
      overlay.panel.style.width = 'min(520px, 100%)';
    }

    var pickMap = 0;
    var pickDiff = 1;
    function showMaps() {
      closeOverlay();
      state = 'title';
      pickMap = mapIdx;
      pickDiff = diffIdx;
      var wrap = ui.el('div', '');
      wrap.appendChild(ui.el('div', 'pd-lbl', 'Choose a map'));
      var grid = ui.el('div', 'pd-maps');
      MLIST.forEach(function (Mp, i) {
        var card = ui.el('button', 'pd-map');
        card.type = 'button';
        var cv = document.createElement('canvas');
        cv.width = 192;
        cv.height = 120;
        mapPreview(cv, Mp);
        card.appendChild(cv);
        var row = ui.el('div', 'pd-mrow');
        row.appendChild(ui.el('b', '', Mp.name));
        var md = ui.el('span', 'pd-medals');
        DIFFS.forEach(function (d) {
          var dot = ui.el('i', '');
          if (medals[Mp.id] && medals[Mp.id][d.id]) {
            dot.style.background = d.medal;
            dot.style.borderColor = d.medal;
          }
          dot.title = d.name + (medals[Mp.id] && medals[Mp.id][d.id] ? ' medal' : ' — not yet');
          md.appendChild(dot);
        });
        row.appendChild(md);
        card.appendChild(row);
        card.appendChild(ui.el('span', '', Mp.level + (bestWave[Mp.id] ? ' · best wave ' + bestWave[Mp.id] : '')));
        card.addEventListener('click', function (e) {
          e.stopPropagation();
          pickMap = i;
          sfx('click');
          syncPick();
        });
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      wrap.appendChild(ui.el('div', 'pd-lbl', 'Difficulty'));
      var drow = ui.el('div', 'pd-diffs');
      DIFFS.forEach(function (d, i) {
        var b = ui.el('button', 'pd-b', d.name + '<small>' + d.note + '</small>');
        b.type = 'button';
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          pickDiff = i;
          sfx('click');
          syncPick();
        });
        drow.appendChild(b);
      });
      wrap.appendChild(drow);
      function syncPick() {
        Array.prototype.forEach.call(grid.children, function (c, i) {
          c.classList.toggle('pd-msel', i === pickMap);
        });
        Array.prototype.forEach.call(drow.children, function (c, i) {
          c.classList.toggle('pd-on', i === pickDiff);
        });
      }
      overlay = ui.overlay(root, {
        title: 'Pick your garden',
        buttons: [
          { label: '▶ Start', primary: true, onClick: function () { store.remove('run'); newGame(pickMap, pickDiff, null); } },
          { label: '← Back', onClick: showTitle },
        ],
      });
      overlay.panel.style.width = 'min(600px, 100%)';
      overlay.panel.insertBefore(wrap, overlay.panel.querySelector('.ig-actions'));
      overlay.syncPick = syncPick;
      overlay.onArrow = function (dx, dy) {
        if (dx) pickMap = (pickMap + dx + MLIST.length) % MLIST.length;
        if (dy) pickDiff = clamp(pickDiff + dy, 0, 2);
        sfx('tick');
        syncPick();
      };
      syncPick();
    }

    function pauseGame() {
      if (state !== 'build' && state !== 'wave') return;
      prevState = state;
      state = 'paused';
      closeOverlay();
      var autoBtn;
      overlay = ui.overlay(root, {
        title: 'Paused',
        text: M.name + ' · ' + diff.name + ' · wave ' + Math.max(1, waveN) + (freeplay ? ' (freeplay)' : '/' + V.waves),
        buttons: [
          { label: '▶ Resume', primary: true, onClick: resumeGame },
          { label: 'Auto-start: ' + (autoStart ? 'On' : 'Off'), onClick: function () {
            autoStart = !autoStart;
            store.set('auto', autoStart);
            autoBtn.textContent = 'Auto-start: ' + (autoStart ? 'On' : 'Off');
          } },
          { label: '↻ Restart map', onClick: function () { store.remove('run'); newGame(mapIdx, diffIdx, null); } },
          { label: '⌂ Menu', onClick: function () { saveRun(); showTitle(); } },
        ],
      });
      autoBtn = overlay.panel.querySelectorAll('.ig-btn')[1];
      overlay.panel.appendChild(ui.el('p', 'ig-sub', '<span style="font-size:12px">Progress is saved at the start of every wave.</span>'));
      dirty();
    }
    function resumeGame() {
      closeOverlay();
      state = prevState;
      ctx.focus();
      dirty();
    }

    function loseGame() {
      if (state === 'over') return;
      state = 'over';
      store.remove('run');
      store.set('pops', totalPops);
      sfx('lose');
      placing = null;
      overT = 0.9;
      dirty();
    }
    function showLose() {
        closeOverlay();
        overlay = ui.overlay(root, {
          title: freeplay ? 'Freeplay over' : 'The balloons got through!',
          html:
            '<div class="pd-statrow">' + stat('Wave', waveN) + stat('Pops', IGAME.fmt(runPops)) + stat('Best', bestWave[M.id] || 0) + '</div>' +
            '<p class="ig-sub">' + (freeplay ? 'You held the garden well past the final wave.' : 'Tip: ' + loseTip()) + '</p>',
          buttons: [
            { label: '↻ Retry', primary: true, onClick: function () { newGame(mapIdx, diffIdx, null); } },
            { label: '⌂ Maps', onClick: showMaps },
          ],
        });
    }
    function loseTip() {
      if (waveN >= 28) return 'whales need heavy damage — Steel Talons, Thunder Pods and big blasts.';
      if (waveN >= 17) return 'Tin balloons ignore sharp hits. Mix in beetles, hot quills or steel talons.';
      if (waveN >= 13) return 'hidden balloons need a Barn Owl or Night Goggles nearby.';
      return 'place critters where the path bends so they get more shots.';
    }
    function winGame() {
      state = 'won';
      var m = medals[M.id] || (medals[M.id] = {});
      var fresh = !m[diff.id];
      m[diff.id] = 1;
      store.set('medals', medals);
      store.remove('run');
      sfx('win');
      for (var k = 0; k < 60; k++) burst(GW / 2 + (Math.random() - 0.5) * 8, GH / 2 + (Math.random() - 0.5) * 4, ['#fde047', '#f472b6', '#38bdf8', '#4ade80'][k % 4], 3);
      closeOverlay();
      var btns = [];
      if (V.freeplay)
        btns.push({ label: '▶ Freeplay', primary: true, onClick: function () {
          closeOverlay();
          freeplay = true;
          state = 'build';
          saveRun();
          toast('Freeplay: waves keep getting tougher', 1800);
          ctx.focus();
          dirty();
        } });
      btns.push({ label: '⌂ Maps', primary: !V.freeplay, onClick: showMaps });
      btns.push({ label: '↻ Replay', onClick: function () { newGame(mapIdx, diffIdx, null); } });
      overlay = ui.overlay(root, {
        title: 'Garden saved!',
        html:
          '<div style="font-size:42px;line-height:1;margin:4px 0 6px;color:' + diff.medal + '">●</div>' +
          '<p class="ig-sub">' + (fresh ? 'New ' : '') + diff.name + ' medal on ' + M.name + '</p>' +
          '<div class="pd-statrow">' + stat('Waves', waveN) + stat('Lives left', lives) + stat('Pops', IGAME.fmt(runPops)) + '</div>',
        buttons: btns,
      });
      dirty();
    }

    /* ================================================================ */
    /* Keyboard                                                          */
    /* ================================================================ */
    var DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];
    ctx.captureKeys(['Enter', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyF', 'KeyP', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Backspace', 'Delete', 'Escape'].concat(DIGITS));
    ctx.onKey(function (code, down) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          var act = document.activeElement;
          if (act && overlay.el.contains(act) && act.classList.contains('ig-btn')) act.click();
          else {
            var pb = overlay.panel.querySelector('.ig-actions .ig-btn');
            if (pb) pb.click();
          }
        } else if (overlay.onArrow) {
          if (code === 'ArrowLeft') overlay.onArrow(-1, 0);
          else if (code === 'ArrowRight') overlay.onArrow(1, 0);
          else if (code === 'ArrowUp') overlay.onArrow(0, -1);
          else if (code === 'ArrowDown') overlay.onArrow(0, 1);
        } else if ((code === 'Escape' || code === 'KeyP') && state === 'paused') resumeGame();
        return;
      }
      if (state !== 'build' && state !== 'wave') return;
      var di = DIGITS.indexOf(code);
      if (di > -1) {
        if (TLIST[di]) pickTower(TLIST[di].id);
        return;
      }
      switch (code) {
        case 'KeyP':
          pauseGame();
          break;
        case 'Escape':
          if (placing) {
            placing = null;
            ghost.on = false;
            dirty();
          } else if (selected) selectTower(null);
          else pauseGame();
          break;
        case 'Space':
          if (placing) cursorAction();
          else startWave();
          break;
        case 'Enter':
          cursorAction();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveCursor(-1, 0);
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveCursor(1, 0);
          break;
        case 'ArrowUp':
        case 'KeyW':
          moveCursor(0, -1);
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveCursor(0, 1);
          break;
        case 'KeyZ':
          upgrade(selected, 0);
          break;
        case 'KeyX':
          upgrade(selected, 1);
          break;
        case 'KeyC':
          cycleTarget();
          break;
        case 'KeyV':
          useAbility(selected);
          break;
        case 'KeyF':
          toggleSpeed();
          break;
        case 'Backspace':
        case 'Delete':
          sell(selected);
          break;
      }
    });

    /* ================================================================ */
    /* Loop                                                              */
    /* ================================================================ */
    var dbgSpeed = 1;
    var loop = IGAME.loop(function (dt) {
      if (state === 'build' || state === 'wave') {
        var total = dt * speed * dbgSpeed;
        var n = Math.max(1, Math.ceil(total / (1 / 60)));
        var h = total / n;
        for (var i = 0; i < n && (state === 'build' || state === 'wave'); i++) step(h);
        updateFx(total);
        if (autoT > 0 && state === 'build') {
          autoT -= dt;
          if (autoT <= 0) startWave();
        }
      } else if (state === 'title') {
        // gentle demo: a few balloons drift along the path behind the menu
        demoT -= dt;
        if (demoT <= 0 && PATHS.length) {
          demoT = 1.1;
          spawnBalloon(Math.floor(Math.random() * 4), Math.floor(Math.random() * PATHS.length), 0, false, false, 0, 1, 0.6);
        }
        for (var j = 0; j < balloons.length; j++) {
          var b = balloons[j];
          b.d += BT[b.t].speed * 0.6 * dt;
          var P = PATHS[b.p];
          if (b.d >= P.len) b.dead = true;
          else {
            pathAt(P, b.d, tmp);
            b.x = tmp.x;
            b.y = tmp.y;
          }
        }
        var w = 0;
        for (var k = 0; k < balloons.length; k++) if (!balloons[k].dead) balloons[w++] = balloons[k];
        balloons.length = w;
        time += dt;
      } else if (state === 'over' || state === 'won') {
        updateFx(dt);
        time += dt;
        if (overT > 0) {
          overT -= dt;
          if (overT <= 0 && state === 'over') showLose();
        }
      }
      render();
      updateUI(dt);
    });

    /* ---------------- boot ---------------- */
    view.canvas.addEventListener('pointerdown', onDown);
    view.canvas.addEventListener('pointermove', onMove);
    view.canvas.addEventListener('pointerleave', onLeave);
    view.canvas.addEventListener('contextmenu', onCtx);
    panel.addEventListener('click', onPanelClick);
    abBar.addEventListener('click', onPanelClick);
    booted = true;
    setMap(mapIdx);
    diff = DIFFS[diffIdx];
    onResize(view.width, view.height);
    showTitle();
    loop.start();

    if (ctx.debug) {
      window.__popDefense = {
        state: function () {
          return {
            state: state, wave: waveN, cash: Math.floor(cash), lives: lives, balloons: balloons.length, towers: towers.length,
            projs: projs.length, parts: parts.length, map: M && M.id, diff: diff.id, freeplay: freeplay, layout: L.side ? 'side' : 'bottom', tile: L.t,
          };
        },
        newGame: function (mi, di) { newGame(mi || 0, di == null ? 1 : di, null); },
        place: function (id, tx, ty) { placing = id; return tryPlace(tx, ty); },
        upgrade: function (tx, ty, p) { var t = towerAt(tx, ty); if (t) { selected = t; buildInfo(); upgrade(t, p); } return t && t.tiers; },
        ability: function (tx, ty) { useAbility(towerAt(tx, ty)); },
        cash: function (n) { cash = n; dirty(); },
        lives: function (n) { lives = n; dirty(); },
        start: startWave,
        speed: function (n) { dbgSpeed = n; },
        skipTo: function (n) { waveN = n - 1; dirty(); },
        free: function () { var out = []; for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) if (!canPlace(x, y)) out.push([x, y]); return out; },
        wave: function (n) { return waveSummary(n); },
      };
    }

    return {
      pause: function () {
        if (state === 'wave' || state === 'build') pauseGame();
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        booted = false;
        if (state === 'build') saveRun();
        store.set('pops', totalPops);
        closeOverlay();
        view.canvas.removeEventListener('pointerdown', onDown);
        view.canvas.removeEventListener('pointermove', onMove);
        view.canvas.removeEventListener('pointerleave', onLeave);
        view.canvas.removeEventListener('contextmenu', onCtx);
        panel.removeEventListener('click', onPanelClick);
        abBar.removeEventListener('click', onPanelClick);
        view.destroy();
        if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        if (abBar.parentNode) abBar.parentNode.removeChild(abBar);
        if (ctx.debug) delete window.__popDefense;
      },
    };
  });
})();
