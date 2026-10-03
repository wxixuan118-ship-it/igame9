export default {
  slug: 'idleon-gaming',
  keyword: 'IdleOn Gaming',
  volume: 2900,
  kd: 15,
  category: 'idle',
  engine: 'idle-questers',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Idle Questers',
    hint: 'Heroes fight & gather on their own · tap the scene to speed them up',
    saves: 'Heroes, zones and Star Shards autosave in your browser; offline gains up to 8h',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Strike / gather faster', keyboard: ['Space'], mouse: 'Click the scene', touch: 'Tap the scene' },
      { action: 'Select a hero', keyboard: ['1–4', '← →'], mouse: 'Click a party slot', touch: 'Tap a party slot' },
      { action: 'Switch panel tab', keyboard: ['↑ ↓'], mouse: 'Click a tab', touch: 'Tap a tab' },
      { action: 'Challenge the zone boss', keyboard: ['B'], mouse: 'Boss button (Map tab or goal bar)', touch: 'Boss button' },
      { action: 'Recruit a hero', keyboard: ['1–4 on the empty slot'], mouse: 'Click “+ Recruit”', touch: 'Tap “+ Recruit”' },
      { action: 'Close a pop-up', keyboard: ['Esc'], mouse: 'Click a button', touch: 'Tap a button' },
    ],
  },
  seo: {
    title: 'IdleOn Gaming: Idle MMO Guide + Free Browser Idle RPG',
    description:
      'IdleOn gaming explained: how Legends of IdleOn’s idle MMO works — classes, skills, AFK gains, where to play — plus a free IdleOn-style idle RPG to play now.',
    h1: 'IdleOn Gaming',
    lede: 'IdleOn gaming explained: what Legends of IdleOn is, how idle-MMO progress works while you’re away — and a free idle party RPG to play here.',
    card: 'Idle MMO party RPG + guide',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://www.legendsofidleon.com/', label: 'Official Legends of IdleOn site' },
    name: 'Legends of IdleOn (IdleOn – The Incremental MMO)',
    developer: 'LavaFlame2',
    released: 'Nov 2020 (Android & web) · Steam 2021 · iOS 2022',
    genre: 'Idle MMORPG / incremental RPG',
    platforms: 'Web browser, Windows (Steam), Android, iOS',
  },
  intro: [
    '<p>When people talk about <strong>IdleOn gaming</strong>, they almost always mean <strong>Legends of IdleOn</strong> — the free idle MMO by LavaFlame2 where a whole family of characters keeps fighting monsters, mining, chopping trees and fishing while you are offline. You log in, claim what they earned, spend it on upgrades, point everyone at their next job and close the game again.</p>',
    '<p>This guide covers what IdleOn is, how its AFK gains work, its classes and skills, where to play it and what “Gaming” means inside IdleOn. Above it you can play <em>Idle Questers</em>, igame9’s own free idle party RPG in the same spirit — four pixel heroes, real offline progress, crafting, zone bosses and a rebirth layer — in your browser with nothing to install.</p>',
  ],
  howToPlay: [
    'Pick your first hero: the <strong>Vanguard</strong> (sword, +25% Mining), the <strong>Pathfinder</strong> (fast bow, crits, +25% Chopping) or the <strong>Arcanist</strong> (slow, heavy staff hits, +25% Fishing). They start fighting in Dewdrop Meadow on their own.',
    '<strong>Tap or click the scene</strong> (or press <kbd>Space</kbd>) to push the shown hero’s next attack or swing forward. Kills drop gold and sometimes glimmer.',
    'Save 40 gold and tap <strong>+ Recruit</strong> in the party bar. New heroes start on a gathering job; switch any hero’s activity on the <strong>Hero</strong> tab.',
    'Spend each level’s talent point on the <strong>Hero</strong> tab, craft weapons and tools on the <strong>Gear</strong> tab and build party-wide upgrades on the <strong>Camp</strong> tab.',
    'Defeat enough monsters in your newest zone and the <strong>Boss</strong> button lights up (Map tab or the goal bar). Every hero set to Fight joins; win within 30 seconds to unlock the next zone.',
    'After four bosses, the <strong>Rebirth</strong> tab trades your run for <strong>Star Shards</strong> — permanent upgrades that make every later run faster. Heroes keep earning offline at 50% for up to 8 hours.',
  ],
  tips: [
    '<strong>Cover all three gathering skills.</strong> Weapons need ore (and glimmer from +3), pickaxes and rods need wood, hatchets need ore, and fish feeds the Cookfire and Lucky Totem.',
    '<strong>Match jobs to class perks.</strong> A Vanguard mining, a Pathfinder chopping and an Arcanist fishing each get +25% yield — the “right character for the right skill” idea IdleOn players plan around.',
    '<strong>Gang up on bosses.</strong> Every hero set to Fight joins a boss battle. Switch gatherers to Fight just before pressing Boss, tap fast, then switch them back.',
    '<strong>Read “hits per kill” on the Map.</strong> A zone your fighter clears in one or two hits often pays more per second than a tougher zone needing eight.',
    '<strong>Spend talents by job.</strong> Fighters want Might, Haste and Cleave or Keen Eye; gatherers want Gatherer and Haste. Refunds are free.',
    '<strong>Don’t rebirth at the first chance.</strong> The Star Shard reward grows ×1.55 per extra boss, so one more zone usually beats an early reset. Good first buys: Comet Blade and Sage Star.',
  ],
  sections: [
    {
      id: 'what-is-idleon',
      h2: 'What is IdleOn? Legends of IdleOn in a nutshell',
      html: `<p><strong>Legends of IdleOn</strong> is a free-to-play idle MMORPG created by the independent developer <strong>LavaFlame2</strong>. It launched on Android and the web in November 2020, arrived on Steam in Early Access on April 2, 2021, and came to iOS in August 2022. On Steam it is now listed as <em>IdleOn – The Incremental MMO</em> and left Early Access on November 6, 2025. The official site also offers a browser version.</p>
<p>You don’t control one hero — you run a small guild. Each character fights a chosen monster or trains a skill and keeps earning while you are away. Steam lists 20 skills and says all classes, maps, skills and bosses are available without paying; purchases are cosmetic or convenience items.</p>
<p>The world is split into themed worlds — Blunder Hills, Yum Yum Desert, Frostbite Tundra, Hyperion Nebula, Smolderin’ Plateau, Spirited Valley and Shimmerfin Deep at the time of writing — each adding new skills and systems. According to the community wiki, extra character slots unlock as your characters’ total class levels grow.</p>`,
    },
    {
      id: 'how-idle-mmo-works',
      h2: 'How IdleOn gaming works: AFK gains and the check-in loop',
      html: `<p>In a normal MMO you only progress while your hands are on the keyboard. In IdleOn, a character left on a monster or skill keeps working as <strong>AFK gains</strong>. The community wiki lists a basic AFK rate of 20% per character, which items, cards and talents push higher — active play is faster, but idle time is never wasted.</p>
<p>That creates a distinctive daily rhythm:</p>
<ul>
<li><strong>Claim:</strong> log in and collect what each character earned while you were away.</li>
<li><strong>Spend:</strong> turn the haul into upgrades — equipment, talents and account-wide systems.</li>
<li><strong>Re-assign:</strong> move characters to tougher monsters or better skilling spots and log out again.</li>
</ul>
<p>Because every character can do a different job, IdleOn strategy is about <strong>specialisation</strong>: one farms drops, another mines, another fishes, and their outputs feed each other’s upgrades. <em>Idle Questers</em> uses the same loop on a smaller scale — four heroes, one job each, shared materials and offline gains based on the real time you were away.</p>`,
    },
    {
      id: 'idleon-classes-skills',
      h2: 'IdleOn classes, skills — and the “Gaming” skill',
      html: `<p>Every IdleOn character starts as a <strong>Beginner</strong> and later chooses a class path. The community wiki lists this tree for the main lines:</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Base class</th><th scope="col">Subclasses</th><th scope="col">Elite classes</th></tr></thead><tbody>
<tr><td><strong>Warrior</strong></td><td>Barbarian, Squire</td><td>Blood Berserker, Divine Knight</td></tr>
<tr><td><strong>Archer</strong></td><td>Bowman, Hunter</td><td>Siege Breaker, Beast Master</td></tr>
<tr><td><strong>Mage</strong></td><td>Wizard, Shaman</td><td>Elemental Sorcerer, Bubonic Conjuror</td></tr>
<tr><td><strong>Journeyman</strong> (secret)</td><td>Maestro</td><td>Voidwalker</td></tr>
</tbody></table></div>
<p>Skills arrive world by world. World 1 introduces <strong>Mining, Smithing and Choppin’</strong>; World 2 adds <strong>Fishing, Catching and Alchemy</strong>; later worlds bring Construction, Trapping, Worship, Cooking, Breeding, Laboratory, Sailing, Divinity, Gaming, Farming, Sneaking, Summoning and more.</p>
<p><strong>Searching for “IdleOn Gaming” the skill?</strong> Gaming is a World 5 (Smolderin’ Plateau) skill. You harvest sprouts that pop up on a field to earn a currency called <strong>Bits</strong>, spend them on upgrades such as Fertilizer (bit value, growth time, sprout cap), unlock Imports, and later buy account-wide <strong>Superbits</strong>. It is one of IdleOn’s most “idle game inside an idle game” systems.</p>`,
    },
    {
      id: 'idle-questers-vs-idleon',
      h2: 'Idle Questers vs. Legends of IdleOn',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Legends of IdleOn</th><th scope="col">Idle Questers (this page)</th></tr></thead><tbody>
<tr><td><strong>Party</strong></td><td>A growing roster of characters, unlocked by total class level</td><td>Up to 4 heroes, recruited with gold</td></tr>
<tr><td><strong>Classes</strong></td><td>Beginner → Warrior, Archer, Mage or Journeyman, then sub-, elite and master classes</td><td>Vanguard, Pathfinder, Arcanist, each with a signature talent and a skill perk</td></tr>
<tr><td><strong>Skills</strong></td><td>20 skills across seven worlds</td><td>Mining, Chopping, Fishing</td></tr>
<tr><td><strong>Offline progress</strong></td><td>AFK gains per character, boosted by many bonuses</td><td>50% of active rate for up to 8h, raised by Star upgrades</td></tr>
<tr><td><strong>Long-term layer</strong></td><td>Dozens of account-wide systems</td><td>Starfall rebirth with 8 permanent Star upgrades</td></tr>
<tr><td><strong>Multiplayer</strong></td><td>Yes — MMO town, guilds, trading</td><td>Single-player</td></tr>
<tr><td><strong>Where</strong></td><td>Official web version, Steam, Android, iOS</td><td>Right here in the browser; saves locally</td></tr>
</tbody></table></div>
<p>Idle Questers gives you IdleOn’s “set everyone to work and come back later” feeling in a single browser tab. For the full MMO, its worlds and its community, play the official game.</p>`,
    },
  ],
  faq: [
    {
      q: 'What does “IdleOn gaming” mean?',
      a: 'Usually it means playing Legends of IdleOn, the idle MMO by LavaFlame2. Inside IdleOn, “Gaming” is also the name of a World 5 skill where you harvest sprouts for a currency called Bits.',
    },
    {
      q: 'Is Legends of IdleOn free to play?',
      a: 'Yes. IdleOn is free to play with optional purchases; its Steam page says all classes, maps, skills and bosses are available without paying. Idle Questers on this page is also completely free.',
    },
    {
      q: 'Can I play IdleOn in a web browser?',
      a: 'Yes. LavaFlame2’s official site offers a browser version alongside the Steam, Android and iOS releases. For a quick IdleOn-style session without logging in, Idle Questers runs right on this page.',
    },
    {
      q: 'Does IdleOn progress while I’m offline?',
      a: 'Yes — characters keep earning AFK gains at a reduced rate that you can raise with upgrades. Idle Questers works the same way: when you return it shows a “While you were away” summary based on the real time that passed (50% rate, up to 8 hours at first).',
    },
    {
      q: 'Is Idle Questers the official IdleOn?',
      a: 'No. Idle Questers is an original game made for igame9 in the idle-MMO style. It uses its own heroes, monsters, zones and art and is not affiliated with LavaFlame2.',
    },
    {
      q: 'Where is my Idle Questers progress saved?',
      a: 'In your browser’s local storage, autosaved every few seconds and whenever you leave the page. Clearing site data or using a private window starts a new save; the ⚙ More tab also has a confirmed Reset button.',
    },
  ],
  related: ['revolution-idle', 'idle-guy', 'idle-startup-tycoon', 'merge-dragons', 'idle-startup-tycoon-github', 'drag-to-combine'],
};
