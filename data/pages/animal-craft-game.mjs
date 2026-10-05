export default {
  slug: 'animal-craft-game',
  keyword: 'Animal Craft Game',
  volume: 0,
  kd: 0,
  category: 'action',
  engine: 'beast-fusion',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Wild Splice',
    hint: 'WASD move · click/Space attack · E ability · L Fusion Lab · T stats',
    saves: 'Level, stats, DNA, hybrids and boss trophies autosave in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Start / confirm', keyboard: ['Enter', 'Space'], mouse: 'Click “Start adventure”', touch: 'Tap “Start adventure”' },
      { action: 'Move', keyboard: ['W A S D', '↑ ↓ ← →'], mouse: '—', touch: 'Left thumb joystick' },
      { action: 'Attack (hold to repeat)', keyboard: ['Space', 'J'], mouse: 'Left click toward the pointer', touch: 'Hold the paw button' },
      { action: 'Special ability', keyboard: ['E', 'Q', 'K'], mouse: 'Right click', touch: 'Second round button' },
      { action: 'Fusion Lab', keyboard: ['L', 'F'], mouse: '🧬 Lab button', touch: '🧬 Lab button' },
      { action: 'Stats & level-up points', keyboard: ['T'], mouse: '⭐ button', touch: '⭐ button' },
      { action: 'Pause / settings', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'Animal Craft Game — Free Animal Fusion RPG Online | igame9',
    description:
      'What the Animal Craft game is, how its animal fusion works, and Wild Splice: a free creature-fusion RPG where you splice heads and bodies and battle bosses.',
    h1: 'Animal Craft Game',
    lede: 'Our Animal Craft game guide, plus a free fusion RPG: splice a fox head onto a polar bear and battle crowned bosses.',
    card: 'Creature fusion survival RPG',
    updated: '2026-10-03',
  },
  original: {
    source: { url: 'https://zapgames.io/animal-craft', label: 'Animal Craft on ZapGames (one of its hosts)' },
    name: 'Animal Craft',
    developer: 'Not clearly credited (portals name different studios)',
    released: 'Unconfirmed — listings say 2024 or January 2026',
    genre: 'Animal-fusion sandbox RPG',
    platforms: 'Web browser (Unity WebGL), desktop and mobile',
  },
  disclaimer:
    'Animal Craft and related names belong to their respective owners; its original developer is not clearly credited by the sites that host it. igame9 is an independent site and is not affiliated with any of them. The playable game on this page, <em>Wild Splice</em>, is an original browser game made for igame9 in a similar style; this guide describes the original for reference.',
  intro: [
    '<p>The <strong>Animal Craft game</strong> is a casual browser RPG built around one irresistible idea: pick two animals, fuse them into a hybrid, and take the result out into an open world to fight, explore and grow stronger. Every pairing looks and plays differently, so half the fun is experimenting with odd combinations.</p>',
    '<p>On this page you can play <em>Wild Splice</em>, an original creature-fusion game made for igame9 in the same spirit. You roam a procedurally generated island with four biomes, defeat wild animals for XP and DNA, and splice two species in the Fusion Lab: the hybrid takes the <strong>head and attack</strong> of one animal and the <strong>body, legs, tail and special ability</strong> of the other, with blended colours and stats. It runs in any modern browser with keyboard, mouse or touch, and autosaves as you play.</p>',
  ],
  howToPlay: [
    'Choose a starter critter — <strong>Bunny</strong>, <strong>Frog</strong> or <strong>Hedgehog</strong> — and press <strong>Start adventure</strong>. You begin next to the Fusion Lab in the middle of the meadow.',
    'Move with <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>, the arrow keys or the left stick. Attack with a click toward the mouse pointer, <kbd>Space</kbd> or the paw button; keyboard and touch attacks auto-aim at the nearest creature.',
    'Every animal you defeat gives XP and <strong>1 DNA</strong> of its species. Shy animals such as bunnies and frogs run away until you hit them; foxes, wolves and scorpions attack on sight.',
    'With 3 DNA from two different species, open the <strong>🧬 Lab</strong> (<kbd>L</kbd>), pick one for the head and one for the body, and press <strong>Fuse</strong>. Your new hybrid joins the collection and becomes your active critter; switch any time in the Collection tab.',
    'Level-ups grant 3 stat points. Spend them on Health, Attack or Speed in the ⭐ menu (<kbd>T</kbd>). Use your special ability with <kbd>E</kbd>, right click or the second button.',
    'Eat berries, cactus fruit and fish to heal. If your critter faints you wake up at the Lab with full health and keep everything you have earned.',
  ],
  tips: [
    '<strong>Read the level tags.</strong> A creature’s level turns red when it is more than three levels above yours. The meadow is safe; the desert and especially the snowfield are not.',
    '<strong>Pick the head for the attack you want.</strong> Frog, Owl, Scorpion and Penguin heads shoot from range, which is safer against bosses. Every other head bites up close and hits harder.',
    '<strong>Pick the body for the ability.</strong> Bunny, Fox, Boar and Lizard bodies dash; Hedgehog, Armadillo and Scorpion bodies burst spikes; Frog and Penguin bodies heal; Owl, Wolf and Polar Bear bodies roar and stun.',
    '<strong>Fused hybrids are stronger than pure animals.</strong> Two different species get a 12% bonus to every base stat, so fuse early even with meadow DNA.',
    '<strong>Retreat to the Lab to heal.</strong> Standing next to it restores health quickly, which makes it a handy base between trips into tougher biomes.',
    '<strong>Train before boss fights.</strong> Bosses have about seven times the health of a normal animal and hit harder. Aim to be within a couple of levels of their tag.',
  ],
  sections: [
    {
      id: 'about-animal-craft',
      h2: 'What is the original Animal Craft?',
      html: `<p>Animal Craft is a free-to-play browser RPG distributed through many web game portals. Its listings describe the same core loop: you <strong>select a Father and a Mother</strong> from a list of animals, the game breeds them into a hybrid with its own look and ability, and you can accept the result or breed again. You then move freely through an open world, click on enemies to attack, collect experience and level up, improving stats such as damage, health, speed or energy, and unlock special powers as you progress. On phones it uses a virtual joystick and on-screen buttons.</p>
<p>Who made it is genuinely unclear. Several portals list themselves as the developer, and their release dates disagree (some say 2024, others January 2026). One major host describes it as an HTML5 Unity WebGL build. Because we could not verify an official studio or website, this page does not credit one, and the quick-facts link points to one of the sites that hosts it.</p>`,
    },
    {
      id: 'how-fusion-works',
      h2: 'How animal fusion works in Wild Splice',
      html: `<p>Twelve species live on the island, three per biome. The head decides how your hybrid attacks; the body decides its legs, tail, colour base and special ability. Base stats are a weighted blend of both parents.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Biome</th><th scope="col">Species</th><th scope="col">As a head</th><th scope="col">As a body (ability)</th></tr></thead><tbody>
<tr><td>Meadow</td><td>Bunny, Frog, Hedgehog</td><td>Bite, ranged bubble, bite</td><td>Pounce Dash, Snack Break, Spike Burst</td></tr>
<tr><td>Forest</td><td>Fox, Owl, Boar</td><td>Bite, ranged feather, bite</td><td>Pounce Dash, Big Roar, Pounce Dash</td></tr>
<tr><td>Desert</td><td>Lizard, Armadillo, Scorpion</td><td>Bite, bite, ranged venom</td><td>Pounce Dash, Spike Burst, Spike Burst</td></tr>
<tr><td>Snowfield</td><td>Penguin, Wolf, Polar Bear</td><td>Ranged snowball, bite, bite</td><td>Snack Break, Big Roar, Big Roar</td></tr>
</tbody></table></div>
<p>Names are spliced too: a Fox head on a Polar Bear body is a <em>Foxear</em>, a Scorpion head on an Armadillo body a <em>Scorpdillo</em>. Fusing the same pair again costs DNA but simply re-selects the creature you already own.</p>`,
    },
    {
      id: 'biomes-and-bosses',
      h2: 'Animal biomes, levels and bosses',
      html: `<p>The meadow around the Lab holds level 1–6 animals. Beyond it the island splits into forest, desert and snowfield, and wild animals get stronger the further you travel from the centre; the desert and snow add a few extra levels on top. Each biome hides a crowned boss, shown as a ★ on the minimap. Beating one drops 5 DNA of its species and a big chunk of XP.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Boss</th><th scope="col">Biome</th><th scope="col">Level</th><th scope="col">How it fights</th></tr></thead><tbody>
<tr><td>Mossjaw</td><td>Meadow</td><td>5</td><td>Giant frog that spits three bubbles at once</td></tr>
<tr><td>Old Bristle</td><td>Forest</td><td>12</td><td>Huge boar that charges in and bites hard</td></tr>
<tr><td>Dune Pincer</td><td>Desert</td><td>18</td><td>Scorpion that sprays venom in a wide fan</td></tr>
<tr><td>Frostfang</td><td>Snowfield</td><td>24</td><td>Fast wolf with the strongest bite on the island</td></tr>
</tbody></table></div>
<p>Defeat all four to be crowned Champion of the Wilds. The island stays open afterwards, so you can keep collecting DNA and filling your collection.</p>`,
    },
    {
      id: 'wild-splice-vs-animal-craft',
      h2: 'Wild Splice vs. Animal Craft',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Animal Craft</th><th scope="col">Wild Splice (this page)</th></tr></thead><tbody>
<tr><td><strong>Fusion</strong></td><td>Pick a Father and a Mother; breed again for a new result</td><td>Pick a head species and a body species; the result is predictable and shown before you fuse</td></tr>
<tr><td><strong>Progress</strong></td><td>XP, levels, stat upgrades and powers</td><td>XP, levels, 3 stat points per level, one ability per body type</td></tr>
<tr><td><strong>World</strong></td><td>Open world with biomes and enemies</td><td>Procedurally generated island with 4 biomes and 4 bosses</td></tr>
<tr><td><strong>Look</strong></td><td>3D (Unity WebGL)</td><td>Colourful top-down 2D, drawn in the browser</td></tr>
<tr><td><strong>Violence</strong></td><td>Creature combat</td><td>Cartoon bonks — defeated animals poof into sparkles</td></tr>
</tbody></table></div>`,
    },
  ],
  faq: [
    {
      q: 'Who made the Animal Craft game?',
      a: 'It is not clear. The portals that host it credit different studios and give different release dates, and we could not find an official website. igame9 is not affiliated with any of them; Wild Splice on this page is an original game.',
    },
    {
      q: 'How do you make a hybrid in Wild Splice?',
      a: 'Collect 3 DNA from two different species by defeating them, open the Fusion Lab with L or the 🧬 button, choose one species for the head and another for the body, and press Fuse.',
    },
    {
      q: 'Does the head or the body matter more?',
      a: 'Both. The head sets the attack (close-range bite or ranged shot), and the body sets the special ability, legs and tail. Stats are a blend, with attack leaning on the head and speed on the body.',
    },
    {
      q: 'What happens when my creature faints?',
      a: 'You wake up at the Fusion Lab with full health. You keep your level, DNA, hybrids and boss trophies, so there is no game over.',
    },
    {
      q: 'Can I play on a phone or Chromebook?',
      a: 'Yes. It runs in any modern browser. On touch screens you get a joystick, an attack button and an ability button; on Chromebooks and laptops use the keyboard and mouse.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Yes, automatically every few seconds in your browser’s local storage, including your position. Clearing site data resets it, and the pause menu has a Reset progress option that asks for confirmation first.',
    },
  ],
  related: ['blood-dos-game', 'merge-dragons', 'drag-to-combine', 'idleon-gaming', 'crazy-shooters'],
};
