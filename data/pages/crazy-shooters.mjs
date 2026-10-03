export default {
  slug: 'crazy-shooters',
  keyword: 'Crazy Shooters',
  volume: 1300,
  kd: 28,
  category: 'action',
  engine: 'arena-shooters',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Hexfire Arena',
    hint: 'WASD move · mouse aim (click to lock) · click/Space fire · R reload · 1–5 weapons',
    saves: 'Settings, wins, best kills per arena and best streak saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Start a match', keyboard: ['Enter', 'Space'], mouse: 'Click ▶ Play', touch: 'Tap ▶ Play' },
      { action: 'Move', keyboard: ['W A S D', '↑ ↓'], mouse: '—', touch: 'Left thumb joystick' },
      { action: 'Turn / aim', keyboard: ['← →'], mouse: 'Move mouse (click to lock pointer)', touch: 'Drag on the right side' },
      { action: 'Fire (hold for auto)', keyboard: ['Space'], mouse: 'Left button', touch: 'Hold FIRE' },
      { action: 'Aim down sights', keyboard: '—', mouse: 'Hold right button', touch: '—' },
      { action: 'Reload (also automatic when empty)', keyboard: ['R'], mouse: '—', touch: '⟳ button' },
      { action: 'Switch weapon', keyboard: ['1–5', 'Q (last weapon)'], mouse: 'Mouse wheel (pointer locked)', touch: 'Weapon number button' },
      { action: 'Sprint', keyboard: ['Shift'], mouse: '—', touch: 'Push the joystick to its edge' },
      { action: 'Pause / release mouse', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'Crazy Shooters — Free Online FPS Arena Game | igame9',
    description:
      'Play a free Crazy Shooters-style FPS in your browser: deathmatch robot bots in 3 arenas with 5 weapons, pickups and a kill feed. No download needed.',
    h1: 'Crazy Shooters',
    lede: 'Crazy Shooters-style action: fast free-for-all gunfights in a retro 3D arena — strafe, shoot, grab armor and top the scoreboard.',
    card: 'Arena FPS deathmatch vs bots',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://freezenova.com/', label: 'FreezeNova, the developer' },
    name: 'Crazy Shooters',
    developer: 'FreezeNova',
    released: '2018 (browser)',
    genre: 'Multiplayer first-person shooter',
    platforms: 'Web browser (desktop, keyboard and mouse)',
  },
  intro: [
    '<p><strong>Crazy Shooters</strong> is a room-based multiplayer first-person shooter that runs in the browser. You create or join a room, pick Free-For-All or Team mode and drop into one of four maps with a loadout that ranges from a combat knife to sniper rifles and rocket launchers. Rounds are short, respawns are quick, and the whole thing is built for a few minutes of chaotic gunfire between classes or meetings.</p>',
    '<p>The game on this page is <em>Hexfire Arena</em>, igame9’s own take on that style. Instead of online rooms it gives you a free-for-all deathmatch against robot bots that patrol, flank, strafe and fight each other, so a match is always full even when you are playing alone. It is a lightweight retro 3D shooter drawn straight in the browser: no download, no account, and it runs on desktop, Chromebook and touch screens.</p>',
  ],
  howToPlay: [
    'Choose an arena (<strong>Rustworks</strong>, <strong>Sunken Plaza</strong> or <strong>Neon Vault</strong>), the number of bots (3, 5 or 7), their skill (Easy, Normal or Hard) and the kill goal (10, 15 or 25), then press <strong>Play</strong>.',
    'On desktop the game locks your mouse pointer: move the mouse to aim and use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move. Press <kbd>Esc</kbd> to release the mouse, which also pauses the match. Without a mouse, <kbd>←</kbd> <kbd>→</kbd> turn and <kbd>↑</kbd> <kbd>↓</kbd> move.',
    'Shoot with the left mouse button or <kbd>Space</kbd> and hold it for automatic fire. <kbd>R</kbd> reloads early; an empty magazine reloads by itself.',
    'Switch weapons with <kbd>1</kbd>–<kbd>5</kbd> or the mouse wheel: Pistol, SMG, Shotgun, Rifle and Launcher. Hold the right mouse button to aim down sights — the Rifle zooms in furthest.',
    'Run over pickups: green <strong>health kits</strong> (+40 HP), blue <strong>armor</strong> (+50, soaks up most incoming damage) and yellow <strong>ammo crates</strong> (refill your reserve ammo). They respawn after a short wait.',
    'The first fighter to reach the kill goal wins. If nobody gets there, the match ends after 5 minutes and the most kills wins. You respawn three seconds after being eliminated.',
  ],
  tips: [
    '<strong>Never stand still in a fight.</strong> Bots hit a moving target less often and a sprinting one even less, so strafe left and right while you shoot.',
    '<strong>Shoot first, then peek.</strong> A bot needs a split second to react after it spots you. Step out, fire, and step back behind cover before it settles its aim.',
    '<strong>Match the gun to the distance.</strong> The Shotgun deletes bots up close but falls off fast; the Rifle and right-click zoom win long corridors; the SMG covers everything in between.',
    '<strong>Use the Launcher on groups and corners.</strong> Rockets explode with splash damage, so aim at the floor or wall next to a target — but not at a wall right in front of you, because the blast hurts you too.',
    '<strong>Watch the minimap and the red arcs.</strong> Enemies show up on the minimap while they are firing or close and in sight, and the red arc around your crosshair points to whoever is shooting you.',
    '<strong>Control the armor.</strong> Armor takes a big share of every hit until it runs out. Knowing where it respawns on each arena is worth more than any single gun.',
    '<strong>Let bots soften each other up.</strong> In free-for-all the bots fight one another too. When you hear a firefight, arrive late and finish off the survivor.',
  ],
  sections: [
    {
      id: 'about-crazy-shooters',
      h2: 'About the original Crazy Shooters',
      html: `<p>Crazy Shooters was released in <strong>2018</strong> by <strong>FreezeNova</strong>, the studio behind the browser shooter Masked Forces. It is an online multiplayer FPS built around rooms: you name a room, set a player limit of up to 16, choose <strong>Free-For-All</strong> or <strong>Team</strong> mode and pick a map. Anyone can join a public room, or you can host a private match for friends.</p>
<p>The original ships with four maps — <strong>Factory</strong>, <strong>Arena</strong>, <strong>Towers</strong> and <strong>GasPlant</strong> — that range from tight indoor corridors to open yards, and nine weapons that cover a ballistic knife, a pistol, SMG and assault rifles, sniper rifles, a grenade and two launchers. Controls follow PC shooter conventions: WASD to move, left click to fire, right click to aim, R to reload, Space to jump, Shift to run, C to crouch, number keys to change weapon and T to chat. A sequel, <strong>Crazy Shooters 2</strong>, keeps the same room-based Free-For-All and Team Deathmatch formula with more maps.</p>`,
    },
    {
      id: 'hexfire-vs-crazy-shooters',
      h2: 'Hexfire Arena vs. Crazy Shooters',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Crazy Shooters</th><th scope="col">Hexfire Arena (this page)</th></tr></thead><tbody>
<tr><td><strong>Opponents</strong></td><td>Real players in online rooms (up to 16)</td><td>3, 5 or 7 robot bots with three skill levels</td></tr>
<tr><td><strong>Modes</strong></td><td>Free-For-All and Team</td><td>Free-for-all deathmatch: first to 10, 15 or 25 kills, 5-minute limit</td></tr>
<tr><td><strong>Maps</strong></td><td>Factory, Arena, Towers, GasPlant</td><td>Rustworks, Sunken Plaza, Neon Vault</td></tr>
<tr><td><strong>Weapons</strong></td><td>9, from a knife to an RPG</td><td>5: Pistol, SMG, Shotgun, Rifle, Launcher</td></tr>
<tr><td><strong>Graphics</strong></td><td>Full 3D</td><td>Retro raycast 3D that runs smoothly on low-end laptops</td></tr>
<tr><td><strong>Devices</strong></td><td>Built for desktop keyboard and mouse</td><td>Desktop, Chromebook, phone and tablet (touch joystick)</td></tr>
<tr><td><strong>Internet</strong></td><td>Needs a live connection to play</td><td>Runs entirely in the page once it has loaded</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'weapon-guide',
      h2: 'Weapon guide: which gun for which fight',
      html: `<p>Every fighter respawns with the full set of five weapons, so the skill is in switching at the right moment rather than in collecting guns.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Key</th><th scope="col">Weapon</th><th scope="col">Magazine / reserve</th><th scope="col">Best use</th></tr></thead><tbody>
<tr><td><kbd>1</kbd></td><td>Pistol</td><td>12 / unlimited</td><td>Accurate backup that never runs dry; finish wounded bots at any range.</td></tr>
<tr><td><kbd>2</kbd></td><td>SMG</td><td>30 / 120</td><td>Default all-rounder. Fast fire for close and mid range, spreads when you move.</td></tr>
<tr><td><kbd>3</kbd></td><td>Shotgun</td><td>6 / 24</td><td>Nine pellets per shot. Brutal around corners and in Neon Vault’s corridors.</td></tr>
<tr><td><kbd>4</kbd></td><td>Rifle</td><td>6 / 24</td><td>Heavy single shots with almost no spread; hold right click for a deep zoom.</td></tr>
<tr><td><kbd>5</kbd></td><td>Launcher</td><td>1 / 4</td><td>Slow rockets with splash damage; great against groups, risky up close.</td></tr>
</tbody></table></div>
<p>Ammo crates top up the SMG, Shotgun, Rifle and Launcher. When a weapon is completely empty the game switches you to the next one automatically, so you are never left clicking an empty gun in the middle of a fight.</p>`,
    },
    {
      id: 'how-the-bots-play',
      h2: 'How the bots play (and how to beat them)',
      html: `<p>Hexfire’s bots are not aimbots. Each one roams between points of interest, hunts toward the last place it saw an enemy and heads for health or armor when it is hurt. Once it sees a target it turns to face it, strafes from side to side and tries to hold a range that suits its weapon: shotgun bots rush in, rifle bots hang back. Their shots use a hit chance that drops with distance and with how fast you are moving, and they need a moment to settle their aim after spotting you.</p>
<p>That gives you three reliable edges: keep moving during every exchange, take the first shot before a bot has fully reacted, and pick fights at the range where your weapon is stronger than theirs. On <strong>Hard</strong> the bots see further, turn faster and react sooner, so cover and pickups matter much more. Newly spawned fighters flicker for a moment and take reduced damage, so do not waste a rocket on someone who has just appeared.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Crazy Shooters free to play?',
      a: 'Yes. Crazy Shooters is free on web game portals, and Hexfire Arena on this page is free too, with no download, sign-up or in-game purchases.',
    },
    {
      q: 'Who made Crazy Shooters?',
      a: 'Crazy Shooters was developed by FreezeNova and released in 2018. igame9 is not affiliated with FreezeNova; Hexfire Arena is igame9’s own Crazy Shooters-style game.',
    },
    {
      q: 'Is the game on this page multiplayer?',
      a: 'No. The original Crazy Shooters is online multiplayer with rooms of up to 16 players. Hexfire Arena is a single-player deathmatch against 3 to 7 bots, so you can play instantly without waiting for a room to fill.',
    },
    {
      q: 'How many maps and weapons does Crazy Shooters have?',
      a: 'The original has four maps — Factory, Arena, Towers and GasPlant — and nine weapons. Hexfire Arena has three arenas of its own and five weapons.',
    },
    {
      q: 'Why does my mouse disappear when I click the game?',
      a: 'Hexfire Arena uses pointer lock so the mouse can turn you freely, like any PC shooter. Press Esc to get the cursor back; this also pauses the match. Press Resume, or click inside the game, to lock the mouse again.',
    },
    {
      q: 'Can I play on a Chromebook, phone or tablet?',
      a: 'Yes. It runs in any modern browser on Chromebooks and laptops. On touch screens you get a virtual joystick on the left, drag-to-look on the right and buttons for fire, reload and switching weapons.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Your match settings, total wins, best kill count on each arena and best kill streak are stored in your browser’s local storage. Clearing site data or using a private window resets them.',
    },
  ],
  related: ['sprinters', 'drift-hunters', 'run3d', 'driving-bros', 'temple-run-3'],
};
