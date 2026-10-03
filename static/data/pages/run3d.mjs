export default {
  slug: 'run3d',
  keyword: 'Run3D',
  volume: 140,
  kd: 18,
  category: 'runner',
  engine: 'void-runner',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Star Tunnel Runner',
    hint: '← → move (walk onto a wall to flip gravity) · ↑ / Space jump · P pause',
    saves: 'Unlocked levels, power cells and endless best saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Start / next level', keyboard: ['Space', 'Enter'], mouse: 'Click “Play”', touch: 'Tap “Play”' },
      { action: 'Move left / right', keyboard: ['←', '→', 'A', 'D'], mouse: 'Hold the left / right half', touch: 'Hold ◀ ▶ or a screen half' },
      { action: 'Flip gravity onto a wall', keyboard: ['Keep holding ← or →'], mouse: 'Keep holding a side', touch: 'Keep holding ◀ or ▶' },
      { action: 'Jump (hold for higher)', keyboard: ['↑', 'W', 'Space'], mouse: 'Drag up', touch: '▲ button or swipe up' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'Run3D — Play a Free Run 3-Style Space Tunnel Game | igame9',
    description:
      'Looking for Run3D? Play a free Run 3-style tunnel runner: jump gaps, walk onto walls to flip gravity, clear 10 tunnels or go endless. No download needed.',
    h1: 'Run3D',
    lede: 'Run3D-style tunnel running: sprint through tunnels floating in space, and step onto a wall to make it the new floor.',
    card: 'Gravity-flip space tunnels',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://www.kongregate.com/games/player_03/run-3', label: 'Run 3 on Kongregate' },
    name: 'Run 3',
    developer: 'Joseph Cloutier (player_03)',
    released: '2014 (Flash; later HTML5)',
    genre: '3D tunnel platform runner',
    platforms: 'Web browser',
  },
  intro: [
    '<p><strong>Run3D</strong> is how many players search for <strong>Run 3</strong>, Joseph Cloutier’s browser game. In it, a little grey alien runs through tunnels that hang in outer space. The tunnels look 3D, the tiles have holes, and there is one rule that makes the series special: walk onto a side wall and the whole tunnel rotates, so that wall becomes your new floor. Fall through a gap and you drift off into space.</p>',
    '<p>On this page you can play <em>Star Tunnel Runner</em>, igame9’s free, original game built on the same idea. Run through square, pentagonal, hexagonal and octagonal tunnels. Jump gaps, outrun crumbling tiles and flip gravity by stepping onto the walls. Clear the 10 hand-scripted levels, or chase a best distance in Endless mode. It runs in any browser on desktop, Chromebook and phone, with no download.</p>',
  ],
  howToPlay: [
    'Press <kbd>Space</kbd> or click <strong>Play level 1</strong>. Your runner moves forward on their own. You only steer and jump.',
    'Hold <kbd>←</kbd> / <kbd>→</kbd> (or <kbd>A</kbd> / <kbd>D</kbd>) to run sideways. On touch screens, hold the ◀ ▶ buttons or press and hold the left or right half of the screen.',
    'Keep moving past the edge of the floor and you step onto the wall next to it. Gravity flips with you, so the wall becomes the floor and the camera rolls round. Use this to escape when the floor drops away.',
    'Press <kbd>↑</kbd>, <kbd>W</kbd> or <kbd>Space</kbd> (or swipe up / tap ▲) to jump over holes and whole missing rings. Hold the key a little longer for a higher, longer jump.',
    'Collect glowing <strong>power cells</strong> and reach the golden gate at the end of each tunnel to unlock the next one. In <strong>Endless</strong> mode the tunnel never ends: it speeds up, and every so often you leap a gap into a tunnel with a different shape.',
  ],
  tips: [
    '<strong>Look two rows ahead, not at your feet.</strong> At these speeds a hole right in front of you is already too late to dodge sideways. Pick your lane early.',
    '<strong>Walls are escape routes.</strong> When the whole floor is missing, the side walls usually aren’t. Start moving sideways as soon as you see the gap, and you’ll be on the wall before it reaches you.',
    '<strong>Tap for short hops, hold for long jumps.</strong> A quick press clears a single missing row. Holding the jump carries you over the three-row ring gaps in later levels.',
    '<strong>Red tiles crumble.</strong> They drop away a moment after you step on them. Keep moving and never land on the same red tile twice.',
    '<strong>Spirals rotate around you.</strong> In the Spiral Arm and later tunnels a missing wall twists along the tunnel. Jump the short holes or sidestep onto the next wall.',
    '<strong>Fewer sides, wider walls.</strong> Square tunnels have five-tile-wide walls and are forgiving. Octagons have narrow two-tile walls, so you flip gravity much more often.',
  ],
  sections: [
    {
      id: 'run3d-or-run-3',
      h2: 'Run3D or Run 3? What you’re probably looking for',
      html: `<p>We couldn’t find a well-known game actually called “Run3D”. The search almost always points to <strong>Run 3</strong>. The “3” is the sequel number, but the game is also strikingly 3D for a browser game, which is likely why the two get mixed up. If you want the original, it is published by its creator and offered on established portals: Coolmath Games and Poki both carry the HTML5 version.</p>
<p>If you want something in the same spirit that loads instantly on this page, Star Tunnel Runner is our take. It isn’t a copy: the tunnels, levels, runner and art are original. The core idea of running on any wall of a floating tunnel is the same.</p>`,
    },
    {
      id: 'about-run-3',
      h2: 'About Run 3, the game behind Run3D searches',
      html: `<p>The Run games are the work of <strong>Joseph Cloutier</strong>, known online as <strong>player_03</strong>. The series started on Kongregate as Flash games:</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Game</th><th scope="col">Released</th><th scope="col">Notes</th></tr></thead><tbody>
<tr><td><strong>Run</strong></td><td>October 2008</td><td>The first Flash game: an alien running through space tunnels where walls rotate into floors</td></tr>
<tr><td><strong>Run 2</strong></td><td>March 2011</td><td>Sequel with new tunnels and obstacles</td></tr>
<tr><td><strong>Run 3</strong></td><td>June 2014 (Kongregate)</td><td>The big one: many levels and characters, Explore and Infinite modes</td></tr>
</tbody></table></div>
<p>Run 3 has two main modes. <strong>Explore Mode</strong> organises its tunnels on a Galaxy Map you work through level by level. <strong>Infinite Mode</strong> generates random tunnels; you collect <strong>power cells</strong> there and can spend them to continue a run with another character. The game has a roster of unlockable characters with different running and jumping abilities. When browsers dropped Flash, Coolmath Games converted Run 3 to HTML5 so it stayed playable.</p>`,
    },
    {
      id: 'gravity-flip-explained',
      h2: 'How the Run3D gravity flip works',
      html: `<p>Each tunnel is a ring of flat walls, and you always stand on one of them. “Down” always points out through that wall. When you run sideways past the edge of your floor, you touch the next wall. The game then makes <em>that</em> wall the floor and rolls the camera so it’s at the bottom of the screen again. From your point of view you just keep running sideways. The tunnel turns around you.</p>
<p>This works in mid-air too. Drift toward a wall during a long jump and you land on it. It’s the most useful trick in the game: when a section has the floor and ceiling missing, step onto either side wall and carry on as if nothing happened. In Star Tunnel Runner the roll takes a fraction of a second, and the stars and planet in the background turn with the camera, so you always know which way is up.</p>`,
    },
    {
      id: 'levels-and-endless',
      h2: 'Run3D levels and Endless mode in Star Tunnel Runner',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Run 3</th><th scope="col">Star Tunnel Runner (this page)</th></tr></thead><tbody>
<tr><td><strong>Level mode</strong></td><td>Explore Mode on a Galaxy Map</td><td>10 tunnels, from Launch Pad to Void Core, unlocked in order</td></tr>
<tr><td><strong>Endless</strong></td><td>Infinite Mode</td><td>Endless mode: speeds up, changes tunnel shape every section</td></tr>
<tr><td><strong>Collectibles</strong></td><td>Power cells</td><td>Power cells per level (your best count is saved)</td></tr>
<tr><td><strong>Tunnel shapes</strong></td><td>Many, plus special areas</td><td>4, 5, 6 and 8 sides; crumbling tiles, spirals, checkerboards, ring gaps</td></tr>
<tr><td><strong>Characters</strong></td><td>Unlockable cast</td><td>One small alien explorer with a jet-pack</td></tr>
<tr><td><strong>Where</strong></td><td>Coolmath Games, Poki and other licensed portals</td><td>Right here, free, in any browser</td></tr>
</tbody></table></div>`,
    },
  ],
  faq: [
    {
      q: 'Is Run3D the same as Run 3?',
      a: 'Almost always, yes. We found no well-known game titled “Run3D”. People usually mean Run 3 by Joseph Cloutier, the space-tunnel runner. The game on this page, Star Tunnel Runner, is igame9’s original game in the same style.',
    },
    {
      q: 'Who made Run 3?',
      a: 'Joseph Cloutier, who goes by player_03. Run (2008) and Run 2 (2011) came first; Run 3 launched on Kongregate in June 2014 and was later converted to HTML5. igame9 is not affiliated with him.',
    },
    {
      q: 'How do you walk on the walls?',
      a: 'Just keep moving sideways past the edge of the floor. When you touch the next wall, gravity switches to it and the camera rolls so that wall is the new floor. It works in mid-air as well.',
    },
    {
      q: 'Can I play on a phone or tablet?',
      a: 'Yes. On touch screens you get ◀ ▶ and ▲ buttons, or you can hold the left or right half of the screen to move and swipe up to jump.',
    },
    {
      q: 'How many levels are there?',
      a: 'Star Tunnel Runner has 10 levels, from the square Launch Pad tunnel to the fast hexagonal Void Core, plus an Endless mode that keeps generating tunnels and saves your best distance.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Unlocked levels, your best power-cell count on each level and your Endless best distance are saved in your browser on this device. Clearing site data resets them.',
    },
  ],
  related: ['temple-run-3', 'temple-run-unblocked-66', 'temple-run-oz', 'drift-boss', 'brain-lines', 'driving-bros'],
};
