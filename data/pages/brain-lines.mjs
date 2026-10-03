export default {
  slug: 'brain-lines',
  keyword: 'Brain Lines',
  volume: 320,
  kd: 27,
  category: 'puzzle',
  engine: 'line-logic',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Line Logic',
    hint: 'Drag to draw lines · Space = Play / Reset · Z = undo',
    saves: 'Stars and best ink per level saved in your browser',
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
    title: 'Brain Lines — Free Draw-to-Solve Physics Puzzle | igame9',
    description:
      'Play a free Brain Lines-style puzzle: draw lines with limited ink, press Play and guide the ball into the basket. 30 levels, gems and 3-star ink goals.',
    h1: 'Brain Lines',
    lede: 'Brain Lines in a nutshell: draw a line, press Play and let physics do the rest — then try again with less ink.',
    card: 'Draw lines, solve physics',
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
    '<p><strong>Brain Lines</strong> is a drawing puzzle game: each level gives you a small task, such as getting a ball into an orange box or making two objects touch, and the only tool you have is your pen. Whatever you draw obeys gravity and collides with everything else, so a single stroke can become a ramp, a wall, a bridge or a lever. It is part of the same family as Brain Dots and other “draw to solve” games, and its appeal is that most levels have more than one correct answer.</p>',
    '<p>Here you can play <em>Line Logic</em>, igame9’s own draw-to-solve physics puzzle in the same spirit. You sketch lines with a limited supply of ink, press Play, and the balls fall, roll and bounce along your lines and the level’s walls. There are 30 hand-made levels with baskets, flags, spikes, spring pads, wind fans and portals, plus gems and an ink “par” for players who want three stars. It runs in any browser, with nothing to install.</p>',
  ],
  howToPlay: [
    'Open a level and read its goal at the top: drop the ball in the <strong>basket</strong>, reach the green <strong>flag</strong>, or make two balls <strong>meet</strong>.',
    '<strong>Drag</strong> with the mouse or a finger to draw. Each line becomes a solid ramp or wall the moment you draw it. The bar above the board shows how much ink is left.',
    'Press <kbd>Space</kbd> or the Play button. The balls drop and roll along your lines. You can keep drawing while they move, but they won’t wait for you.',
    'If it goes wrong, press <kbd>Space</kbd> again to reset the balls (your lines stay), <kbd>Z</kbd> to undo the last line, or <kbd>R</kbd> to start the level over.',
    'Avoid red <strong>spikes</strong> (they pop the ball) and note the red hatched <strong>no-draw zones</strong>: you cannot draw inside them, though balls pass through freely.',
    'Earn up to three stars: one for reaching the goal, one for collecting every ◆ <strong>gem</strong> on the way, and one for using no more ink than the level’s <strong>par</strong> (the yellow marker on the ink bar).',
  ],
  tips: [
    '<strong>Start the ramp right under the ball.</strong> A ball that falls a long way before touching your line arrives fast and bounces off; one that lands gently rolls where you want.',
    '<strong>Fast balls need a backstop.</strong> If the ball flies over the basket, draw a short wall on the far side of the basket instead of re-drawing the whole ramp.',
    '<strong>Smooth curves keep speed; corners kill it.</strong> Every sharp bend absorbs part of the ball’s energy. Draw one flowing stroke when you need the ball to climb back up.',
    '<strong>Short lines win par.</strong> On most levels the three-star solution is one well-placed stroke. Try the smallest deflector that could work before drawing long tracks.',
    '<strong>Lines under the ball are forbidden.</strong> You can’t draw on top of a ball, so leave a small gap and let it drop onto your line.',
    '<strong>Use the hint when you’re really stuck.</strong> The light bulb shows one known solution as a dotted line for a few seconds. Trace it, or use it as a clue and find a cheaper route.',
  ],
  sections: [
    {
      id: 'about-brain-lines',
      h2: 'About the original Brain Lines',
      html: `<p>The original is an HTML5 puzzle game published on browser game portals by <strong>Azgames</strong> in 2025, and it is listed with well over 200 levels. Each stage shows a short instruction, for example tilting a shape to one side, putting an object inside an orange box or making two magnets touch, and you solve it by drawing shapes that then fall and interact under gravity. Its portals describe a light-bulb hint button for difficult stages and reward solving with fewer strokes and in less time.</p>
<p>The game sits in a well-known niche: physics drawing puzzles where you are judged less on reflexes than on imagination. A good solution is often surprisingly small, which is why these games are popular for short breaks on school Chromebooks and phones.</p>`,
    },
    {
      id: 'line-logic-vs-brain-lines',
      h2: 'Line Logic vs. Brain Lines',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Original game</th><th scope="col">Line Logic (this page)</th></tr></thead><tbody>
<tr><td><strong>What you draw</strong></td><td>Shapes that become physical objects and fall</td><td>Lines that stay fixed in place as ramps, walls and bridges</td></tr>
<tr><td><strong>Goals</strong></td><td>Varied tasks: boxes, gates, magnets, walls, tipping objects</td><td>Basket, flag zone, or make two balls meet</td></tr>
<tr><td><strong>Limits</strong></td><td>Fewer strokes and faster solutions score better</td><td>Limited ink per level and a par for the third star</td></tr>
<tr><td><strong>Extras</strong></td><td>Hint button</td><td>Gems, spikes, spring pads, wind fans, portals, pinned balls, hint button</td></tr>
<tr><td><strong>Levels</strong></td><td>200+</td><td>30 hand-designed levels; a harder 24-level set is on <a href="/brain-lines-unblocked/">Brain Lines Unblocked</a></td></tr>
<tr><td><strong>Saves</strong></td><td>Depends on the portal</td><td>Stars and best ink saved in your browser</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'physics-rules',
      h2: 'The physics rules in Line Logic',
      html: `<p>Knowing exactly how the world behaves makes the puzzles much easier to read:</p>
<ul>
<li><strong>Lines are solid and fixed.</strong> They never fall or tip. The ball rolls along the top of a line and bounces a little when it lands hard.</li>
<li><strong>Balls keep their speed.</strong> There is very little friction, so a long slope produces a fast ball. Flat lines slow it down only gradually.</li>
<li><strong>Spring pads</strong> (yellow and black) launch the ball away at high speed whatever angle it hits them from.</li>
<li><strong>Fans</strong> are pale blue zones with moving streaks. Inside, the air pushes the ball in the streaks’ direction; an upward fan can carry a ball higher than where it started.</li>
<li><strong>Portals</strong> are one-way: a ball that rolls into the purple ring comes out of the orange ring with the same speed and direction.</li>
<li><strong>The physics is deterministic.</strong> The same lines always produce the same result, so if a run almost works, a small adjustment really is the fix.</li>
</ul>`,
    },
    {
      id: 'tricky-levels',
      h2: 'Hints for the trickiest levels',
      html: `<p><strong>Short Fuse (15):</strong> with only 150 ink you can’t build a track. The ball bounces straight up and down on the spring pad; one tiny slanted dash in its path is enough to tip it toward the basket.</p>
<p><strong>Crosswind (17):</strong> the wind pushes the falling ball sideways. Draw a short vertical wall on the downwind side so the ball slides down it and falls straight.</p>
<p><strong>Updraft (21):</strong> once the ball is floating in the fan, a line tilted upward toward the basket lets the air push it along the underside and out.</p>
<p><strong>Ski Jump (24):</strong> a straight ramp drops the ball into the pit. Bend the end of your line slightly upward so the ball leaves it rising.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Brain Lines free?',
      a: 'It is free on the web portals that host it, and Line Logic on this page is completely free to play, with no download or account needed.',
    },
    {
      q: 'Who made Brain Lines?',
      a: 'It was published by Azgames in 2025 as an HTML5 browser game. igame9 is not affiliated with Azgames; Line Logic is our own game made in the same draw-to-solve style.',
    },
    {
      q: 'How many levels does Brain Lines have?',
      a: 'The original is listed with more than 240 levels. Line Logic on this page has 30 levels, and a separate, harder set of 24 levels plus a Daily Remix is available on our Brain Lines Unblocked page.',
    },
    {
      q: 'Why does my line stop when I draw over the ball?',
      a: 'Lines can’t overlap a ball or a red hatched no-draw zone. The pen lifts while you are over a forbidden area and starts a new line when you move out of it.',
    },
    {
      q: 'How do I get three stars?',
      a: 'Reach the goal, collect every gem during the same run, and finish with your total ink at or below the level’s par. The yellow marker on the ink bar shows where par is.',
    },
    {
      q: 'Does Brain Lines work on phones?',
      a: 'Yes. Line Logic is built for touch: drag a finger to draw and use the on-screen buttons for Play, Undo and Hint. It also runs on tablets and Chromebooks.',
    },
  ],
  related: ['brain-lines-unblocked', 'war-mahjong', 'drag-to-combine', 'merge-dragons', 'drift-boss', 'run3d'],
};
