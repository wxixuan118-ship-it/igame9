export default {
  slug: 'merge-dragons',
  keyword: 'Merge Dragons',
  volume: 390,
  kd: 18,
  category: 'puzzle',
  engine: 'dragon-merge',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Dragonbloom Isle',
    hint: 'Drag 3 alike together to merge · tap coins, orbs and chests',
    saves: 'Level records, coins and your Home Island saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Move an item', keyboard: 'Arrows to aim, Space to pick up and drop', mouse: 'Drag it', touch: 'Drag it' },
      { action: 'Merge', keyboard: 'Drop next to two identical items', mouse: 'Drop next to two identical items', touch: 'Drop next to two identical items' },
      { action: 'Collect / open / harvest', keyboard: ['Enter'], mouse: 'Click the item', touch: 'Tap the item' },
      { action: 'Hint', keyboard: ['H'], mouse: 'Hint button', touch: 'Hint button' },
      { action: 'Shop', keyboard: ['S'], mouse: 'Shop button', touch: 'Shop button' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'Merge Dragons — Play a Free Merge Game Online | igame9',
    description:
      'Play a free Merge Dragons-style game online: merge 3 to level up, 5 for a bonus, heal cursed land and hatch baby dragons. Six levels plus a saved home island.',
    h1: 'Merge Dragons',
    lede: 'A Merge Dragons-style island: merge three of a kind, heal the cursed land and raise a flight of baby dragons.',
    card: 'Merge, heal and hatch dragons',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://www.mergedragons.com/', label: 'Official Merge Dragons site' },
    name: 'Merge Dragons!',
    developer: 'Gram Games (Zynga)',
    released: 'June 2017 (iOS), later Android',
    genre: 'Merge puzzle',
    platforms: 'iOS, Android',
  },
  intro: [
    '<p><strong>Merge Dragons!</strong> is the mobile puzzle game that made “merge three” a genre of its own. You drag objects around a magical land, and whenever three identical ones touch they combine into something better: seeds into flowers, flowers into trees, eggs into dragons. The land itself has been cursed, so much of every level is spent healing dead ground to free the treasures trapped on it, while your dragons fly around harvesting for you.</p>',
    '<p>The official game lives on phones and tablets. On this page you can play <em>Dragonbloom Isle</em>, igame9’s own free merge game in the same style, right in your browser. It has six goal-based levels, a persistent Home Island sandbox, five merge chains, chests, coins and cute procedurally drawn dragons that harvest for you — with no download, account or in-app purchases.</p>',
  ],
  howToPlay: [
    'Press <strong>Play</strong> and pick a level — the six levels unlock in order — or choose <strong>Home Island</strong> for the endless sandbox that saves automatically.',
    '<strong>Drag items around the grid.</strong> When three identical items touch side by side (not diagonally), they merge into one item of the next level. Five identical items merge into <strong>two</strong>.',
    '<strong>Purple withered land</strong> traps items under thorns. Merge Life plants — Seedling, Sprig, Blossom, Lifebloom, Sun Tree, Elder Tree — on or next to it to heal the tiles and free whatever is on them. Life plants can be planted on withered tiles that touch healthy grass.',
    '<strong>Tap</strong> coins and orbs to collect coins and Dragon Power, tap chests to open them, tap Sun Trees and Elder Trees for free plants and Gem Spires for gold.',
    'Merge three <strong>Dragon Eggs</strong> to hatch a Hatchling. Dragons fly to nearby plants and big stones and harvest orbs or coins from them; merge three dragons of the same kind to grow a Whelp, a Drake and finally an Elder Dragon.',
    'Each level lists its goals — heal all the land, make a certain item, hatch a dragon or collect resources. Finish in fewer moves to set a new best.',
  ],
  tips: [
    '<strong>Wait for five.</strong> Five identical items give two upgrades instead of one, which saves about a fifth of your items on the way up a chain. Hold four in a cluster and only merge when the fifth arrives.',
    '<strong>Merge on the edge of the curse.</strong> Plant Life items on withered tiles next to healthy grass, then merge there: the tiles under the merge heal as well as the extra ones the merge spreads to.',
    '<strong>Bigger plants heal more.</strong> Besides the tiles under it, every Sprig a merge creates heals 4 more tiles, every Blossom 6, every Lifebloom 8 and so on — so climb the Life chain near the curse.',
    '<strong>Park dragons in the middle.</strong> A Hatchling only flies two tiles to harvest; each growth stage adds one more. Keep Sprigs, Blossoms and Boulders within reach.',
    '<strong>Don’t merge small coins for nothing.</strong> Three Copper (1 each) make one Silver worth 3 — no gain — but three Silver (9) make a Gold worth 10, and five of anything earns the bonus.',
    '<strong>Spend coins on Seedlings.</strong> In the shop a Seedling costs 5, a Pebble 4, a Wood Chest 18 and a Dragon Egg 40. Seedlings heal land, which usually frees more loot than it costs.',
  ],
  sections: [
    {
      id: 'about-merge-dragons',
      h2: 'About the original Merge Dragons!',
      html: `<p>Merge Dragons! was made by <strong>Gram Games</strong>, a studio with offices in London and Istanbul, and launched on iOS on June 29, 2017 as the company’s first game built around in-app purchases, with an Android release following. It climbed into the top-grossing charts within a year, and in May 2018 <strong>Zynga</strong> bought Gram Games for $250 million in cash plus an earn-out. Zynga has kept the game running with regular events ever since.</p>
<p>The story is simple: evil Zomblins have cursed the dragon realm, leaving <strong>Dead Land</strong> behind. You heal it with the power of Life Flowers and their long merge chain, discover dragon eggs, and grow dragons that harvest objects for you. Between levels you return to your <strong>Camp</strong>, where you grow your dragon collection, discover new merge chains and collect level and event rewards.</p>`,
    },
    {
      id: 'dragonbloom-vs-merge-dragons',
      h2: 'Dragonbloom Isle vs. Merge Dragons!',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Merge Dragons!</th><th scope="col">Dragonbloom Isle (this page)</th></tr></thead><tbody>
<tr><td><strong>Core rule</strong></td><td>Merge 3 identical objects; 5 give a bonus</td><td>Same: 3 make 1, 5 make 2</td></tr>
<tr><td><strong>Cursed ground</strong></td><td>Dead Land, healed with life power</td><td>Withered land, healed by merging Life plants on or beside it</td></tr>
<tr><td><strong>Dragons</strong></td><td>Many dragon families with several growth stages</td><td>Four growth stages from Hatchling to Elder Dragon</td></tr>
<tr><td><strong>Structure</strong></td><td>Hundreds of levels plus the Camp</td><td>6 goal levels plus a saved Home Island</td></tr>
<tr><td><strong>Platform</strong></td><td>iOS and Android app</td><td>Any web browser, including Chromebooks</td></tr>
<tr><td><strong>Price</strong></td><td>Free with in-app purchases</td><td>Free, no purchases</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'merge-math',
      h2: 'The 3-versus-5 merge math',
      html: `<p>Why do experienced players hoard items instead of merging every trio straight away? Because the bonus compounds. To build one item three levels up using only three-way merges you need 3 × 3 × 3 = <strong>27</strong> starting items. Using five-way merges wherever possible you can do it with about <strong>21</strong>: thirteen base items become five of the next level (5 → 2, 5 → 2, 3 → 1), those five become two of the level after, and eight more base items supply the third.</p>
<p>The same arithmetic works for coins in Dragonbloom Isle. Merging five Silver coins (15) gives two Gold coins (20), while three Silver (9) give a single Gold (10). Tapping a coin early is never wrong, but patience pays.</p>`,
    },
    {
      id: 'levels-and-home-island',
      h2: 'Levels and the Home Island',
      html: `<p>The six levels each teach one idea: <strong>First Bloom</strong> (your first merges), <strong>Withered Meadow</strong> (healing), <strong>The First Egg</strong> (hatching and Dragon Power), <strong>Stone Garden</strong> (stone chains and coins), <strong>Cursed Grove</strong> (a large curse and a Sun Tree) and <strong>Dragon’s Roost</strong> (raising a Drake). Your best move count is saved for each one, and a level can never get stuck: if nothing can be merged or tapped — or you run out of Life plants and coins while land is still withered — the Hint button hands you three free Seedlings.</p>
<p>The <strong>Home Island</strong> is a bigger, mostly withered island packed with trapped eggs, chests and stones. Everything you do there is saved, and a free chest appears every two minutes — up to three wait for you while you are away.</p>`,
    },
  ],
  faq: [
    {
      q: 'Can I play Merge Dragons in a browser?',
      a: 'Merge Dragons! itself is a mobile app for iOS and Android. Dragonbloom Isle on this page is a free merge game in the same style that runs in any browser, including on Chromebooks and phones.',
    },
    {
      q: 'Who makes Merge Dragons?',
      a: 'Merge Dragons! was developed by Gram Games, which Zynga acquired in 2018. igame9 is not affiliated with either company.',
    },
    {
      q: 'How does merging work?',
      a: 'Put three identical items next to each other — horizontally or vertically — and they merge into one item of the next level. Five identical items merge into two, which is the most efficient way to climb a chain.',
    },
    {
      q: 'How do I heal the withered land?',
      a: 'Merge Life plants on top of or right next to the purple tiles. You can plant Seedlings and other Life items on withered tiles that border healthy grass, and higher-level Life merges heal more tiles at once.',
    },
    {
      q: 'How do I get a dragon in Dragonbloom Isle?',
      a: 'Merge three Dragon Eggs to hatch a Hatchling. Eggs come from levels, chests (Iron and Gold chests can contain them) and the shop for 40 coins.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Yes. Coins, Dragon Power, level records and the whole Home Island are stored in your browser’s local storage. Clearing site data or private browsing starts fresh.',
    },
  ],
  related: ['drag-to-combine', 'drag-to-combine-roblox', 'idle-guy', 'war-mahjong', 'brain-lines', 'idle-startup-tycoon'],
};
