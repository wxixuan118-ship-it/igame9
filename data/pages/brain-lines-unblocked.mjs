export default {
  slug: 'brain-lines-unblocked',
  keyword: 'Brain Lines Unblocked',
  volume: 260,
  kd: 14,
  category: 'puzzle',
  engine: 'line-logic',
  variant: 'unblocked',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Line Logic: Chalkboard',
    hint: 'Drag to draw · Space = Play / Reset · Z = undo · H = hint',
    saves: 'Stars and today’s Daily Remix saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Draw a line', keyboard: '—', mouse: 'Hold left button and drag', touch: 'Drag a finger' },
      { action: 'Play / reset the balls', keyboard: ['Space', 'Enter'], mouse: 'Play button', touch: 'Play button' },
      { action: 'Undo the last line', keyboard: ['Z', 'Ctrl + Z'], mouse: 'Undo button', touch: 'Undo button' },
      { action: 'Erase all lines', keyboard: ['C'], mouse: 'Trash button', touch: 'Trash button' },
      { action: 'Restart the level', keyboard: ['R'], mouse: 'Pause → Restart level', touch: 'Pause → Restart level' },
      { action: 'Show a hint', keyboard: ['H'], mouse: 'Light-bulb button', touch: 'Light-bulb button' },
      { action: 'Pause / level list', keyboard: ['P', 'Esc'], mouse: 'Pause or grid button', touch: 'Pause or grid button' },
    ],
  },
  seo: {
    title: 'Brain Lines Unblocked — Play Free, No Download | igame9',
    description:
      'Play a free Brain Lines Unblocked-style puzzle: a lightweight draw-a-line physics game for any browser or Chromebook, with 24 hard levels and a Daily Remix.',
    h1: 'Brain Lines Unblocked',
    lede: 'Brain Lines Unblocked, chalkboard edition: harder draw-to-solve levels that load fast in any browser, plus a fresh remix every day.',
    card: 'Chalkboard physics + daily',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://azgames.io/brain-lines', label: 'Brain Lines on A-Z Games' },
    name: 'Brain Lines',
    developer: 'Azgames',
    released: '2025 (HTML5)',
    genre: 'Drawing physics puzzle',
    platforms: 'Web browser — desktop, tablet, phone',
  },
  intro: [
    '<p>People who search for <strong>Brain Lines Unblocked</strong> usually want one thing: a version of the Brain Lines drawing puzzle that opens straight in the browser, without an app store, an installer or a login. Brain Lines itself is a 2025 HTML5 puzzle where you draw shapes that obey physics to complete small tasks, so it is already a browser game; the “unblocked” label is simply how players look for copies that load quickly on shared and school computers.</p>',
    '<p>This page offers <em>Line Logic: Chalkboard</em>, igame9’s own physics drawing puzzle in the Brain Lines style. It is a second, harder set of 24 hand-made levels on a chalkboard theme, separate from the 30 gentler levels on our <a href="/brain-lines/">Brain Lines</a> page, and it adds a <strong>Daily Remix</strong> challenge. Everything is drawn in code, the whole game is a small script, and your progress stays in your own browser.</p>',
  ],
  howToPlay: [
    'Press <strong>Play</strong> to open the level list, or <strong>Daily Remix</strong> for today’s challenge. The goal for each level appears on the board and in the bar at the top.',
    '<strong>Drag</strong> to draw chalk lines. Lines are solid as soon as you lift the pen, and the bar above the board shows how much ink is left.',
    'Press <kbd>Space</kbd> or the Play button to drop the balls. Press <kbd>Space</kbd> again to put them back at the start; your lines stay, so you can adjust and retry quickly.',
    'Fix mistakes with <kbd>Z</kbd> (undo the last line), <kbd>C</kbd> (erase all lines) or <kbd>R</kbd> (restart the level). Lines can’t be drawn inside red hatched zones or on top of a ball.',
    'Reach the basket, the flag zone or the other ball without touching red spikes or leaving the board. Some levels need <strong>two balls</strong> in the basket at once.',
    'Stars: one for solving, one for collecting every ◆ gem in the same run, and one for staying within the ink par shown by the yellow marker.',
  ],
  tips: [
    '<strong>Draw, test, nudge.</strong> The physics is fully deterministic, so a run that nearly works only needs a small change. Undo the last line and redraw it a little higher or steeper.',
    '<strong>Curves for climbing.</strong> The Half-Pipe level only works with a smooth upward curve; a straight line or a sharp corner wastes the ball’s speed.',
    '<strong>Gaps must be ball-sized.</strong> If two of your lines leave a gap smaller than the ball, it wedges there. Leave a clear opening wherever the ball has to drop from one line to the next.',
    '<strong>Use the walls.</strong> Fixed posts and the board’s side walls make excellent free backstops; aim the ball at them instead of spending ink on a catcher.',
    '<strong>Draw during the run.</strong> You can still draw after pressing Play. On levels with portals it helps to watch where the ball comes out before you place the catching line.',
    '<strong>Daily Remix is a mirror.</strong> The daily level is an existing level flipped left to right with 10% less ink, so knowing the original layout is a head start.',
  ],
  sections: [
    {
      id: 'what-unblocked-means',
      h2: 'What “unblocked” means for Brain Lines',
      html: `<p>“Unblocked games” is a search term for browser games that can be played on shared, school or work computers without installing anything. Those networks often have their own rules about which sites are allowed, and those rules are set by the people who run them. igame9 does not offer ways around network filters, and you should follow your school’s or employer’s policy.</p>
<p>What we can do is make the game as light and self-contained as possible. Line Logic: Chalkboard needs no download, plug-in, account or external files: the board, balls and effects are drawn with code in a single small script, so it starts fast even on modest Chromebooks. Progress is stored only in your browser’s local storage, and nothing you draw leaves your device.</p>`,
    },
    {
      id: 'pack-comparison',
      h2: 'Chalkboard levels vs. the main Brain Lines page',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col"><a href="/brain-lines/">Brain Lines page</a></th><th scope="col">Brain Lines Unblocked (this page)</th></tr></thead><tbody>
<tr><td><strong>Levels</strong></td><td>30 introductory levels</td><td>24 harder levels + Daily Remix</td></tr>
<tr><td><strong>Ink</strong></td><td>Generous budgets</td><td>Tight budgets; par is close to the minimum</td></tr>
<tr><td><strong>Mechanics</strong></td><td>Introduced one at a time</td><td>Combined: portals with fans, two-ball goals, chain reactions</td></tr>
<tr><td><strong>Look</strong></td><td>Paper notebook</td><td>Green chalkboard</td></tr>
<tr><td><strong>Best for</strong></td><td>Learning the physics</td><td>Players who finished the first set</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'daily-remix',
      h2: 'How the Daily Remix works',
      html: `<p>Each day the game picks one level from both level sets using the date, mirrors it from left to right and trims its ink budget by a tenth. Everyone who opens the page on the same day gets the same remix, and the main menu shows a tick once you’ve solved it. Because the physics is symmetric, every remix is just as solvable as the level it came from, but the flipped layout is surprisingly good at confusing muscle memory.</p>`,
    },
    {
      id: 'hard-level-guide',
      h2: 'Guide to the hardest chalkboard levels',
      html: `<p><strong>Ink Miser (10):</strong> 140 ink is not enough for a track. A small slanted dash above the spring pad tips the bouncing ball into the portal, and the portal does the rest.</p>
<p><strong>Spiral (15):</strong> three long lines zig-zag down the board. Keep each line’s end well clear of the next one, or the ball jams in the gap.</p>
<p><strong>Chain Reaction (21):</strong> roll the orange ball hard into the blue one on its ledge. The wall on the right sends both balls back into the basket.</p>
<p><strong>Grand Finale (24):</strong> send the ball into the purple portal, let the updraft lift it, then, near the top of the fan, draw a line that rises toward the basket: the air pushes the ball along its underside and out over the basket.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Brain Lines Unblocked free to play?',
      a: 'Yes. Line Logic: Chalkboard on this page is free, with no download, account or purchases.',
    },
    {
      q: 'Does it work on a school Chromebook?',
      a: 'It runs in Chrome on Chromebooks, as well as other desktop browsers, tablets and phones, and needs no installation. Whether a particular network allows game sites is up to whoever manages it.',
    },
    {
      q: 'Is this the official Brain Lines?',
      a: 'No. Brain Lines is published by Azgames. This page hosts Line Logic: Chalkboard, an original igame9 game in the same draw-to-solve style, and is not affiliated with Azgames.',
    },
    {
      q: 'Are these the same levels as the Brain Lines page?',
      a: 'No. This page has a separate set of 24 harder levels and a Daily Remix. The 30 starter levels are on our Brain Lines page, and both sets save their stars separately.',
    },
    {
      q: 'Will I lose my progress if I close the tab?',
      a: 'No, stars are saved in your browser’s local storage. They are lost if you clear site data or play in a private window, and they don’t sync between devices.',
    },
    {
      q: 'What if I can’t solve a level?',
      a: 'Press the light-bulb button or H to see one working solution as a dotted line for a few seconds. Every level, including each Daily Remix, has been checked to be solvable with the built-in physics.',
    },
  ],
  related: ['brain-lines', 'temple-run-unblocked-66', 'war-mahjong', 'drag-to-combine', 'drift-boss', 'sprinters'],
};
