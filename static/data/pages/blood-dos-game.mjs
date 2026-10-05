export default {
  slug: 'blood-dos-game',
  keyword: 'Blood DOS Game',
  volume: 0,
  kd: 0,
  category: 'action',
  engine: 'crypt-shooter',
  variant: 'crypt',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Gravewick',
    hint: 'WASD move · mouse aim (click to lock) · click/Space fire · 1–5 weapons · M map',
    saves: 'Unlocked levels, carried weapons, best times and settings saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Start a level / confirm', keyboard: ['Enter', 'Space'], mouse: 'Click ▶ Play', touch: 'Tap ▶ Play' },
      { action: 'Move and strafe', keyboard: ['W A S D', '↑ ↓'], mouse: '—', touch: 'Left thumb joystick' },
      { action: 'Turn / aim', keyboard: ['← →'], mouse: 'Move mouse (click to lock pointer)', touch: 'Drag on the right side' },
      { action: 'Fire / swing (hold for repeat)', keyboard: ['Space'], mouse: 'Left button', touch: 'Hold FIRE' },
      { action: 'Run', keyboard: ['Shift'], mouse: '—', touch: 'Push the joystick to its edge' },
      { action: 'Choose weapon', keyboard: ['1–5', 'Q (last weapon)'], mouse: 'Mouse wheel (pointer locked)', touch: 'Weapon number button' },
      { action: 'Automap', keyboard: ['M'], mouse: 'Map button', touch: 'Map button' },
      { action: 'Pause / release mouse', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'Blood DOS Game — 1997 Shooter Guide + Free Retro FPS | igame9',
    description:
      'The Blood DOS game explained: Monolith’s 1997 Build-engine shooter, how to play it today, and Gravewick, a free gothic retro FPS that runs in your browser.',
    h1: 'Blood DOS Game',
    lede: 'A guide to the Blood DOS game from 1997, plus Gravewick, our own free gothic retro shooter you can play right here.',
    card: 'Retro gothic crypt shooter',
    updated: '2026-10-03',
  },
  original: {
    source: { url: 'https://en.wikipedia.org/wiki/Blood_(video_game)', label: 'Blood (video game) on Wikipedia' },
    name: 'Blood',
    developer: 'Monolith Productions',
    released: '1997 (MS-DOS; remastered as Fresh Supply in 2019)',
    genre: 'First-person shooter (gothic horror)',
    platforms: 'MS-DOS, Windows; Fresh Supply on PC (2019) and consoles (2025)',
  },
  intro: [
    '<p><strong>Blood</strong> is the gothic horror shooter that Monolith Productions released for MS-DOS in 1997. Built on the same Build engine family as other mid-90s 3D shooters, it put you in the boots of Caleb, an undead gunslinger hunting the cult that betrayed him, and became a cult classic for its dark humour, inventive weapons and dense, secret-packed levels. People still search for it by its platform because the original release was a DOS program that needs some help to run on a modern PC.</p>',
    '<p>The playable shooter on this page is <em>Gravewick</em>, an original retro FPS made for igame9 in the same spirit: candle-lit crypts, chunky low-resolution pixels, keys and locked doors, breakable secret walls and a short episode of four campy levels. It borrows no characters, weapons, maps or sounds from Monolith’s work. Everything is drawn and synthesised in the browser, so it runs on desktop, Chromebook and phone with no download or emulator.</p>',
  ],
  howToPlay: [
    'Pick an unlocked level (I–IV), a skill setting (<strong>Mild</strong>, <strong>Medium</strong> or <strong>Spicy</strong>) and a pixel filter: <strong>Chunky</strong> renders about 320 pixels wide for the old DOS look, <strong>Crisp</strong> doubles that. Press <strong>Play</strong>.',
    'On desktop the mouse pointer locks to the view: move it to aim, walk with <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> and hold <kbd>Shift</kbd> to run. On phones, use the left stick, drag the right half of the screen to look and hold <strong>FIRE</strong>.',
    'Every level is a small maze. Doors slide open as you walk up to them, but silver and gold doors need the matching key. Find the key, open the door, and step onto the glowing green <strong>exit sigil</strong> to finish.',
    'Collect weapons as you go: the Grave Spade and Ember Pistol come first, then the Coach Gun, Garlic Bombs and Volt Crossbow. Your weapons, ammo and armour carry over to the next level.',
    'Look for walls with a visible crack. Hit them with the spade, shoot them or blast them with a garlic bomb to open a secret stash. Press <kbd>M</kbd> or the map button for an automap of everything you have seen.',
    'If you go down, you restart the level with the loadout you had when you entered it. Clearing level IV ends the episode.',
  ],
  tips: [
    '<strong>Burn first, shoot second.</strong> Ember Pistol hits set monsters alight for a couple of seconds, so one flare plus a few seconds of strafing often finishes a zealot without wasting more embers.',
    '<strong>Save shells for ghouls.</strong> Grumblers are slow but tough. A point-blank Coach Gun blast deals most of its damage up close and falls off with distance.',
    '<strong>Statues are not always statues.</strong> Gargoyles sit perfectly still until you get close or hurt them. If a stone figure has a little too much detail, shoot it from a distance first.',
    '<strong>Throw garlic around corners.</strong> Bombs bounce off walls and go off after about a second, which makes them ideal for clearing a room before you walk in — and for opening cracked walls.',
    '<strong>Use the Volt Crossbow on groups.</strong> Each bolt arcs to up to two more monsters nearby, so aim at the one in the middle of a pack.',
    '<strong>Strafe the hex flames.</strong> Zealot projectiles are slow enough to sidestep. Moving sideways while you fire is the single best habit in any retro shooter.',
  ],
  sections: [
    {
      id: 'about-blood',
      h2: 'About the original Blood (1997)',
      html: `<p>Blood was developed by <strong>Monolith Productions</strong> on the Build engine and published by <strong>GT Interactive</strong>. A shareware version for MS-DOS appeared on <strong>7 March 1997</strong>, and the full release followed on 21 May 1997 in North America. Its hero, Caleb, fights his way through the followers of a cult called the Cabal and the creatures that serve the dark god Tchernobog, across a strange mix of 1920s-style settings: cemeteries, trains, carnivals, mansions and catacombs.</p>
<p>Reviewers praised its level design, its humour and pop-culture references, and its unusual arsenal, much of which has an alternate fire mode. It also used voxels for pickups and some decorations, hid "super secret" areas in its maps and offered a deathmatch mode called BloodBath alongside co-op. Two expansions followed in 1997 — <em>Cryptic Passage</em> by Sunstorm Interactive and Monolith’s own <em>Plasma Pak</em> — and the 1998 sequel <em>Blood II: The Chosen</em> moved to a new engine.</p>`,
    },
    {
      id: 'play-blood-today',
      h2: 'How to play the original today',
      html: `<p>The 1997 executable was written for MS-DOS, so on a modern computer it needs a DOS emulator to run. The easier route is <strong>Blood: Fresh Supply</strong>, a remaster by Nightdive Studios released for Windows on 9 May 2019. It runs on Nightdive’s Kex engine and supports modern resolutions and controls. On 4 December 2025 Nightdive followed it with <strong>Blood: Refreshed Supply</strong>, bringing the remaster to PlayStation, Xbox and Nintendo Switch.</p>
<p>No legitimate version of the full campaign runs inside a web page, which is why this page offers Gravewick instead: an original, browser-native shooter with the same retro feel that you can try in a few seconds before deciding whether to buy the remaster.</p>`,
    },
    {
      id: 'gravewick-vs-blood',
      h2: 'Gravewick vs. the 1997 original',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Blood (1997)</th><th scope="col">Gravewick (this page)</th></tr></thead><tbody>
<tr><td><strong>Setting</strong></td><td>Caleb versus the Cabal across a full campaign</td><td>A gravekeeper’s night shift: cemetery, catacombs, cathedral and bell tower</td></tr>
<tr><td><strong>Length</strong></td><td>Multiple episodes plus expansions</td><td>One short episode of 4 levels with 6 secrets</td></tr>
<tr><td><strong>Engine</strong></td><td>Build engine, MS-DOS</td><td>Software raycaster with light maps, in the browser</td></tr>
<tr><td><strong>Look</strong></td><td>Low-resolution sprites, voxels</td><td>Chunky or crisp pixel filter, candle-light falloff</td></tr>
<tr><td><strong>Tone</strong></td><td>Dark horror with black humour</td><td>Spooky but cartoonish — no blood or gore, puns in every level name</td></tr>
<tr><td><strong>Multiplayer</strong></td><td>BloodBath and co-op</td><td>Single player</td></tr>
<tr><td><strong>Devices</strong></td><td>PC (and consoles via the 2025 remaster)</td><td>Any modern browser, including phones with touch controls</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'gravewick-arsenal',
      h2: 'Gravewick weapons and monsters',
      html: `<p>All five weapons are original to Gravewick. Slots 2–5 are found in the levels and keep their ammo between levels.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Key</th><th scope="col">Weapon</th><th scope="col">What it does</th></tr></thead><tbody>
<tr><td><kbd>1</kbd></td><td>Grave Spade</td><td>Unlimited melee swing; also cracks secret walls.</td></tr>
<tr><td><kbd>2</kbd></td><td>Ember Pistol</td><td>Glowing flare that sets targets on fire. Uses embers.</td></tr>
<tr><td><kbd>3</kbd></td><td>Coach Gun</td><td>Both barrels at once: a wide spray of pellets. Uses two shells.</td></tr>
<tr><td><kbd>4</kbd></td><td>Garlic Bombs</td><td>Bouncing bulbs that burst after a second with splash damage.</td></tr>
<tr><td><kbd>5</kbd></td><td>Volt Crossbow</td><td>Fast bolt that chains lightning to two nearby monsters.</td></tr>
</tbody></table></div>
<p>The monsters are just as homemade. <strong>Hooded Zealots</strong> keep their distance and lob purple hex flames. <strong>Grumblers</strong> are slow, goggle-eyed ghouls that hit hard up close. <strong>Belfry Bats</strong> zigzag in fast but go down in one hit. <strong>Gutter Gargoyles</strong> pretend to be statues, then take off and spit hot rocks. The bell tower belongs to <strong>Grand Spout</strong>, a giant bronze gargoyle that fires spreads of rocks, calls in bats and gets angrier at half health.</p>`,
    },
  ],
  faq: [
    {
      q: 'Who made the Blood DOS game?',
      a: 'Blood was developed by Monolith Productions and published by GT Interactive in 1997. igame9 is not affiliated with Monolith, GT Interactive or Nightdive Studios; Gravewick is an original game made for this site.',
    },
    {
      q: 'Can I play the original Blood in my browser?',
      a: 'Not legitimately. The original is an MS-DOS program and the official way to play it today is the Fresh Supply remaster (PC, 2019) or Refreshed Supply (consoles, 2025). Gravewick on this page is a separate, free retro shooter in a similar style.',
    },
    {
      q: 'Is Gravewick a remake of Blood?',
      a: 'No. It shares the genre and the gothic, tongue-in-cheek mood, but its hero, monsters, weapons, levels, art and sound are all original.',
    },
    {
      q: 'Is Gravewick gory?',
      a: 'No. Monsters burst into smoke, dust or rubble and there is no blood at all. The horror is cartoonish: hooded cultists, goofy ghouls and grumpy gargoyles.',
    },
    {
      q: 'How do I find the secrets?',
      a: 'Watch for stone walls with a visible jagged crack. Hit them with the spade, shoot them or bomb them until they crumble. Every level has at least one, and the automap (M) helps you spot dead ends worth checking.',
    },
    {
      q: 'Does it work on phones and Chromebooks?',
      a: 'Yes. Chromebooks and laptops use keyboard and mouse with pointer lock. On touch screens you get a joystick, drag-to-look, a fire button and a weapon button. If it feels slow on an older device, keep the Chunky pixel filter on.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Unlocked levels, the loadout you carry into each level, best times and your settings are stored in your browser’s local storage. Clearing site data or using a private window resets them.',
    },
  ],
  related: ['crazy-shooters', 'animal-craft-game', 'run3d', 'temple-run-3', 'drift-hunters'],
};
