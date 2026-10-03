export default {
  slug: 'drag-to-combine',
  keyword: 'Drag to Combine',
  volume: 1000,
  kd: 29,
  category: 'puzzle',
  engine: 'element-craft',
  variant: 'elements',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Elementa',
    hint: 'Drop one element on another · tap to add · double-tap to copy',
    saves: 'Discoveries and workspace saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Add an element', keyboard: 'Press /, type a name, Enter', mouse: 'Drag it from the library, or click it', touch: 'Drag it up from the library, or tap it' },
      { action: 'Combine two elements', keyboard: 'Select with ← →, then search + Enter', mouse: 'Drop one element onto another', touch: 'Drag onto another, or tap one then the other' },
      { action: 'Copy an element', keyboard: ['D'], mouse: 'Double-click it', touch: 'Double-tap it' },
      { action: 'Remove an element', keyboard: ['Delete'], mouse: 'Drag it back to the library', touch: 'Drag it back to the library' },
      { action: 'Hint', keyboard: ['H'], mouse: 'Hint button', touch: 'Hint button' },
      { action: 'Clear workspace', keyboard: ['C'], mouse: 'Trash button', touch: 'Trash button' },
      { action: 'Menu & stats', keyboard: ['Esc', 'M'], mouse: 'Menu button', touch: 'Menu button' },
    ],
  },
  seo: {
    title: 'Drag to Combine — Free Element Crafting Game | igame9',
    description:
      'Play a free Drag to Combine game online: drop Water on Fire, discover 148 elements with hints and search. Runs in any browser, no download, progress saved.',
    h1: 'Drag to Combine',
    lede: 'Start with four elements, drag them together and discover 144 more.',
    card: 'Craft 148 elements by dragging',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://littlealchemy2.com/', label: 'Little Alchemy 2' },
    name: 'Element-crafting games',
    released: 'Genre popular since Little Alchemy (2010)',
    genre: 'Element combination puzzle',
    platforms: 'Web browser, iOS, Android, Roblox',
  },
  disclaimer:
    'Little Alchemy is a game by Recloak, Infinite Craft is a game by Neal Agarwal, and the Roblox experience of the same name is by The Pure Element. igame9 is an independent site and is not affiliated with or endorsed by any of them. The playable game on this page, <em>Elementa</em>, is an original browser game made for igame9 in the same element-crafting style.',
  intro: [
    '<p><strong>Drag to Combine</strong> describes one of the simplest and most addictive ideas in casual gaming: you drag one thing onto another and something new appears. Water on Fire makes Steam. Steam and Air make a Cloud. A few hundred drags later you are building cities, rockets and dragons out of the same four elements you started with. Little Alchemy made the format famous, Infinite Craft gave it endless AI-generated results, and on Roblox, The Pure Element turned it into an aura collection game.</p>',
    '<p>On this page you can play <em>Elementa</em>, igame9’s own element-crafting game. It has 148 elements linked by 144 hand-written recipes covering weather, nature, life, technology, myth and space, with a searchable library, hints and saved progress. It runs right in the browser on desktop, Chromebook and phone. Looking for the Roblox game? Our <a href="/drag-to-combine-roblox/">Roblox aura guide</a> covers it and has an aura-themed version to play.</p>',
  ],
  howToPlay: [
    'Press <strong>Play</strong>. Water, Fire, Earth and Air are already on the workspace, and all four sit in the library on the right (at the bottom on phones).',
    '<strong>Drag one element and drop it on another.</strong> If the pair is a recipe, both turn into a new element and a “New element!” card pops up. If not, the element you dragged bounces back.',
    'Need more copies? Drag a tile out of the library, click or tap a library tile to drop it in a free spot, or double-click / double-tap an element on the workspace to copy it.',
    'Prefer tapping? Tap an element on the workspace to select it, then tap a second element — on the workspace or in the library — and the two combine.',
    'Use the <strong>search box</strong> to find an element by name and the sort button to switch between A–Z and newest first. Faded tiles have no new recipes left; a ★ marks final elements that can’t be combined further.',
    'Stuck? <strong>Hint</strong> highlights two elements that make something you haven’t found yet (then recharges for 30 seconds). Find all 148 to complete the collection.',
  ],
  tips: [
    '<strong>Pair every new element with the four basics.</strong> About one recipe in five is “something + Water, Fire, Earth or Air”, so those four are the quickest first tests whenever something new appears.',
    '<strong>Try elements with themselves.</strong> Water + Water, Earth + Earth and Air + Air all work, and so do many later doubles such as two Stars or two Houses.',
    '<strong>Think like nature.</strong> Fire heats and hardens, Water grows and erodes, Air carries and cools, Earth gives mass. Mud + Fire, for example, makes a building material.',
    '<strong>Unlock the hub elements early.</strong> Stone, Life, Human, Metal and Sky are each used in six to ten recipes and open whole branches — materials, animals, people, tools and space.',
    '<strong>Let the faded tiles guide you.</strong> When a tile fades it has nothing left to give, so stop testing it and focus on the bright ones.',
    '<strong>Keep the workspace tidy.</strong> Drag leftovers back into the library or press Clear. Your discoveries are never lost — only the copies on the table.',
  ],
  sections: [
    {
      id: 'what-is-drag-to-combine',
      h2: 'What does “drag to combine” mean?',
      html: `<p>It is the core action of the element-crafting genre. There is no timer and no score to chase: the goal is discovery. Every successful combination adds a new item to your collection, and every new item creates more pairs to try, so the game grows outward like a family tree.</p>
<p>The best-known example is <strong>Little Alchemy</strong>, designed by Jakub Koziol at Recloak and first released on the Chrome Web Store in December 2010. It launched with around 100 elements and grew to well over 500 through updates. Its sequel, <strong>Little Alchemy 2</strong>, arrived in August 2017 with 720 items, again starting from Air, Earth, Fire and Water. In January 2024 Neal Agarwal released <strong>Infinite Craft</strong>, which starts with Water, Fire, Wind and Earth but lets a large language model invent the result of each pair, so the list of possible items is effectively endless. And since July 2024, Roblox players have been crafting auras in <strong>The Pure Element</strong>’s experience of the same name.</p>`,
    },
    {
      id: 'crafting-games-compared',
      h2: 'Drag-to-combine games compared',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Starting items</th><th scope="col">Total items</th><th scope="col">How results are decided</th><th scope="col">Where to play</th></tr></thead><tbody>
<tr><td><strong>Little Alchemy 2</strong></td><td>Air, Earth, Fire, Water</td><td>720</td><td>Hand-made recipes</td><td>Browser, iOS, Android</td></tr>
<tr><td><strong>Infinite Craft</strong></td><td>Water, Fire, Wind, Earth</td><td>Unlimited</td><td>Generated by an AI language model</td><td>Browser</td></tr>
<tr><td><strong>Drag to Combine! (Roblox)</strong></td><td>Water, Fire, Earth, Wind</td><td>About 340 auras, per community guides</td><td>Hand-made recipes, plus legendary fusions and shop rolls</td><td>Roblox</td></tr>
<tr><td><strong>Elementa (this page)</strong></td><td>Water, Fire, Earth, Air</td><td>148</td><td>144 hand-written recipes, one result per pair</td><td>Any browser, no account</td></tr>
</tbody></table></div>
<p>Elementa is deliberately compact. A full collection takes an evening rather than weeks, every recipe follows real-world logic, and the hint button means you never have to leave the page to look up an answer.</p>`,
    },
    {
      id: 'elementa-recipe-tree',
      h2: 'How the Elementa recipe tree is organised',
      html: `<p>The 148 elements fall into a handful of branches that connect to each other:</p>
<ul>
<li><strong>Weather and sky</strong> — steam, clouds, rain, storms, frost and snow lead up to the Sky, the Sun, the Moon and the stars.</li>
<li><strong>Land and materials</strong> — mud, stone, sand, glass, metal and brick feed both buildings and tools.</li>
<li><strong>Life</strong> — a swamp with a spark of energy brings Life, which leads to plants, animals, eggs and people.</li>
<li><strong>Civilisation and technology</strong> — houses grow into villages and cities, wheels into bicycles and cars, electricity into chips, computers and the internet.</li>
<li><strong>Myth and magic</strong> — a rainbow full of energy becomes Magic, which unlocks wizards, potions, golems and fairies; fire-breathing lizards are not far away.</li>
<li><strong>Space</strong> — stars become galaxies, rockets become satellites, and the world itself becomes a planet.</li>
</ul>
<p>Here are the first few recipes to get you going: <strong>Water + Fire</strong> = Steam, <strong>Water + Earth</strong> = Mud, <strong>Fire + Earth</strong> = Lava, <strong>Fire + Air</strong> = Energy, <strong>Earth + Air</strong> = Dust and <strong>Air + Water</strong> = Mist. The rest is up to you.</p>`,
    },
  ],
  faq: [
    {
      q: 'What is Drag to Combine?',
      a: 'It is the name for crafting games where you drag one item onto another to discover a new one, as in Little Alchemy or Infinite Craft. It is also the title of a Roblox experience by The Pure Element, in which the items are called auras.',
    },
    {
      q: 'Is this the Roblox game?',
      a: 'No. The game on this page is Elementa, igame9’s own browser game in the same style. The Roblox experience is made by The Pure Element and only runs on Roblox — see our <a href="/drag-to-combine-roblox/">Roblox aura-crafting guide</a>.',
    },
    {
      q: 'How many elements are there in Elementa?',
      a: '148 in total: the 4 starting elements plus 144 you can discover. The counter at the top left shows how many you have found, and completing the collection shows your finishing time.',
    },
    {
      q: 'How do I combine elements on a phone or Chromebook?',
      a: 'Drag an element onto another with your finger, or tap one element to select it and then tap a second one. Tapping a tile in the library adds a copy to the workspace. Mouse and keyboard work too.',
    },
    {
      q: 'What do the faded tiles and the star mean?',
      a: 'A faded tile has no undiscovered recipes left, so it is not worth testing any more. A ★ marks a final element, one that is not used in any recipe at all.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Yes. Your discoveries, the elements on your workspace and your stats are stored in your browser’s local storage. Clearing site data or using a private window starts a fresh collection.',
    },
  ],
  related: ['drag-to-combine-roblox', 'merge-dragons', 'brain-lines', 'war-mahjong', 'idle-startup-tycoon'],
};
