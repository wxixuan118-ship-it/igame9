export default {
  slug: 'war-mahjong',
  keyword: 'War Mahjong',
  volume: 2400,
  kd: 22,
  category: 'puzzle',
  engine: 'tile-war',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Frontline Tiles',
    hint: 'Click a tile that touches its twin · B = bomb · H = hint',
    saves: 'Sector stars, best scores and Endless record saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Clear a group of twins', keyboard: ['Arrows, then Space', 'Enter'], mouse: 'Click a tile (or drag onto its twin)', touch: 'Tap a tile (or swipe onto its twin)' },
      { action: 'Drop a bomb on one tile', keyboard: ['B, then Space', 'Enter'], mouse: 'Bomb button, then click a tile', touch: 'Bomb button, then tap a tile' },
      { action: 'Show the biggest group', keyboard: ['H'], mouse: 'Light-bulb button', touch: 'Light-bulb button' },
      { action: 'Shuffle the board (costs time)', keyboard: ['S'], mouse: 'Shuffle button', touch: 'Shuffle button' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'War Mahjong — Free Two-Layer Military Tile Puzzle | igame9',
    description:
      'Play a free War Mahjong-style tile game: clear twin military tiles from two stacked layers, chain falling combos, earn bombs and beat 24 timed sectors.',
    h1: 'War Mahjong',
    lede: 'A War Mahjong-style puzzle: clear twin tiles from two stacked layers, chain falling combos and save your bombs for the tight spots.',
    card: 'Two-layer military tile clearing',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://jayisgames.com/review/tiles-of-the-unexpected.php', label: 'Tiles of the Unexpected review on JayIsGames' },
    name: 'War Mahjong',
    released: 'Late 2000s (Flash)',
    genre: 'Two-layer tile matching (SameGame × mahjong)',
    platforms: 'Web browser — originally Flash, now on HTML5 and emulated portals',
  },
  intro: [
    '<p><strong>War Mahjong</strong> is a browser tile puzzle with a military look: medals, stars, tanks and other army symbols sit on a grid of tiles that is <em>two layers deep</em>. You don’t hunt for free tiles in a pyramid like classic mahjong solitaire. Instead you click any tile that touches an identical tile left, right, above or below, and the whole touching group disappears. Clear a top tile and the one underneath appears; clear both and the tiles above drop into the hole, sometimes landing next to a twin and clearing on their own.</p>',
    '<p>On this page you can play <em>Frontline Tiles</em>, igame9’s own game built on that same two-layer, click-the-twins idea. It adds 24 campaign sectors with growing boards, a clock with star targets, bombs you earn from combos and big groups, and an Endless mode where the board refills from the top. It runs in any modern browser on desktop, Chromebook, tablet and phone, with no download or account.</p>',
  ],
  howToPlay: [
    'Press <strong>Campaign</strong> and pick a sector, or start <strong>Endless</strong> for a score attack. Each tile shows one of ten military symbols with its own colour, so you can match by shape or by colour.',
    'Click or tap a tile that touches at least one identical tile (left, right, above or below). The whole connected group clears. Hovering with a mouse previews the group and its points; on touch you can also <strong>swipe from a tile onto its twin</strong>.',
    'Raised tiles have a second tile underneath. Clearing them reveals the lower layer, which sits slightly lower and darker. When a cell is completely empty, the tiles above it <strong>fall down</strong>, and in the campaign an emptied column makes the columns <strong>close in toward the centre</strong>.',
    'If a falling tile lands next to a twin it didn’t touch before, that group clears automatically: a <strong>combo</strong>. Every combo wave gives you +1 bomb and +2 seconds, and later waves score more.',
    'Stuck with no pairs? Press <kbd>B</kbd> or the bomb button and pick any tile to blast it away. Out of bombs, the board reshuffles itself (or press <kbd>S</kbd> to shuffle on purpose) at a cost of 6 seconds.',
    'Clear every tile before the clock runs out. One star for clearing the sector, two or three for finishing with enough time left; the two star markers on the timer bar show the targets.',
  ],
  tips: [
    '<strong>Clear from the bottom up.</strong> Groups near the bottom make everything above them fall, which is where combos come from. Clearing the top row first rarely triggers anything.',
    '<strong>Build groups of four or more.</strong> A group of four or more earns a bomb back, and points grow with the square of the group size: two tiles score 40, four tiles score 160, six tiles score 360.',
    '<strong>Don’t waste bombs early.</strong> You start each sector with two. Keep at least one for the endgame, when a few lonely tiles of different kinds are left and no shuffle can help.',
    '<strong>Bomb the tile that unlocks a fall.</strong> The best bomb target is usually a single tile in a nearly empty column: removing it drops a whole stack and can set off a chain.',
    '<strong>Watch the raised tiles.</strong> A raised tile still has a partner hidden under it, so the column will not fall until both layers are gone. Single, sunken tiles are the ones that open holes.',
    '<strong>In Endless, keep the clock topped up.</strong> Each cleared tile adds a little time and every 80 tiles a new tile kind joins the board, so cash in big groups before the board gets more varied.',
  ],
  sections: [
    {
      id: 'about-war-mahjong',
      h2: 'Where War Mahjong comes from',
      html: `<p>War Mahjong is a re-themed version of a tile game that is older than its name suggests. The same rules first circulated as <strong>Tiles of the Unexpected</strong>, a Flash game from the official website of the virtual band Gorillaz that puzzle blogs were already reviewing in 2007. It was later passed around portals under names such as <em>Gorillaz Tiles</em>, and the military-skinned edition became known as War Mahjong. Most sites that host it today run the original Flash file through an emulator or offer an HTML5 remake, so the credits you see depend on the portal.</p>
<p>What all versions share is the core loop: a board that is two tiles deep, groups of two or more identical neighbours that vanish when clicked, gravity that pulls tiles down into empty cells, automatic clears when a falling tile completes a new pair, and a small stock of bombs for removing a single tile when you have no moves. The original has no timer and tracks how far you progress through its levels.</p>`,
    },
    {
      id: 'frontline-tiles-vs-war-mahjong',
      h2: 'Frontline Tiles vs. War Mahjong',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">War Mahjong (original)</th><th scope="col">Frontline Tiles (this page)</th></tr></thead><tbody>
<tr><td><strong>Board</strong></td><td>Two stacked layers, clear groups of 2+ adjacent twins</td><td>Same two-layer rule; boards grow from 5×4 to 11×8 and come in shapes (pyramid, valley, towers, mixed)</td></tr>
<tr><td><strong>Gravity</strong></td><td>Tiles above an empty cell fall down</td><td>Tiles fall, and empty columns close in toward the centre</td></tr>
<tr><td><strong>Combos</strong></td><td>Falling tiles that form pairs clear automatically and earn bombs</td><td>Same, plus a growing score multiplier and +2 s per combo wave</td></tr>
<tr><td><strong>Bombs</strong></td><td>Limited stock, earned back with combos</td><td>Start with 2 (max 9); earned from combos and from groups of 4+</td></tr>
<tr><td><strong>Stuck boards</strong></td><td>Use a bomb</td><td>Use a bomb, or shuffle for −6 s (automatic when you have no bombs)</td></tr>
<tr><td><strong>Goal</strong></td><td>Clear levels, no time limit</td><td>24 timed sectors with 1–3 stars, plus an Endless refill mode</td></tr>
<tr><td><strong>Controls</strong></td><td>Mouse</td><td>Mouse, touch (tap or swipe) and full keyboard</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'combos-and-bombs',
      h2: 'How combos and bombs really work',
      html: `<p>A combo only happens when tiles <em>move</em> into a new contact. Clearing a top tile and revealing a matching tile underneath does not count; the revealed tile just sits there waiting for you. But when a cell is emptied completely, everything stacked above it drops, and any falling tile that lands beside a twin it was not touching before clears on its own. Those clears can empty more cells, which drops more tiles, which can clear again. Each wave is one step of the combo.</p>
<p>So for every move, look for a group whose removal will <strong>empty a cell</strong>. Single (sunken) tiles open holes because nothing is underneath; three of them at the bottom of a column are often worth more than five raised tiles at the top.</p>
<p>Bombs follow the same logic. A bomb removes exactly one tile, the visible one, so dropping it on a raised tile only reveals the tile underneath. Dropping it on a single tile under a tall column opens a hole and lets the whole column fall. In Frontline Tiles each combo wave also gives a bomb back and adds two seconds, so a well-placed bomb that starts a chain often pays for itself.</p>`,
    },
    {
      id: 'war-mahjong-vs-mahjong-solitaire',
      h2: 'Is War Mahjong real mahjong?',
      html: `<p>Not in the traditional sense. Classic mahjong solitaire (often called Shanghai) uses the 144 Chinese mahjong tiles stacked in a turtle-shaped pyramid, and you remove <em>pairs of free tiles</em> that can be anywhere on the board. Mahjong Connect games ask you to link two matching tiles with a path of no more than two turns. War Mahjong borrows the look of tiles and the idea of matching pairs, but it plays more like SameGame: what matters is which identical tiles <strong>touch</strong>, and how the board collapses after each clear.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is War Mahjong free to play?',
      a: 'Yes. War Mahjong is free on the portals that host it, and Frontline Tiles on this page is completely free, with no download, sign-up or in-game purchases.',
    },
    {
      q: 'Who made War Mahjong?',
      a: 'The gameplay comes from Tiles of the Unexpected, a Flash game released on the Gorillaz website in the 2000s; the war-themed edition was later spread across game portals, and credits vary between sites. igame9 is not affiliated with any of them. Frontline Tiles on this page is our own game in the same style.',
    },
    {
      q: 'How do you play War Mahjong?',
      a: 'Click a tile that touches an identical tile horizontally or vertically to clear the whole group. Tiles come in two layers, tiles above empty cells fall down, and falling tiles that land next to a twin clear automatically as combos. Use bombs to remove a single tile when you are stuck.',
    },
    {
      q: 'What happens when there are no pairs left?',
      a: 'In War Mahjong you use a bomb to remove one tile. In Frontline Tiles you can use a bomb or shuffle the remaining tiles for a 6-second penalty; if you have no bombs, the board shuffles itself so you are never permanently stuck.',
    },
    {
      q: 'Can I play War Mahjong on a phone or Chromebook?',
      a: 'Frontline Tiles works on phones, tablets and Chromebooks: tap a tile, or swipe from a tile onto its twin. On narrow screens the board turns sideways automatically when that makes the tiles bigger.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Your stars per sector, best scores and Endless record are stored in your browser’s local storage. Clearing site data or using a private window resets them.',
    },
    {
      q: 'How do I get three stars?',
      a: 'Clear the sector with enough time left; the two star markers on the timer bar and the pause screen show the exact targets. Clearing from the bottom up for combos is the fastest way, because every combo wave adds two seconds.',
    },
  ],
  related: ['merge-dragons', 'brain-lines', 'drag-to-combine', 'brain-lines-unblocked', 'idle-startup-tycoon', 'drift-boss'],
};
