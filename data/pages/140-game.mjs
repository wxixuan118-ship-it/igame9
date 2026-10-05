export default {
  slug: '140-game',
  keyword: '140',
  volume: 0,
  kd: 0,
  category: 'action',
  engine: 'beat-platformer',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Offbeat',
    hint: '← → / A D run · Space / ↑ jump (hold = higher) · M music · P pause',
    saves: 'Unlocked levels and fewest deaths per level saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Start / continue', keyboard: ['Space', 'Enter'], mouse: 'Click “Play”', touch: 'Tap “Play”' },
      { action: 'Run left / right', keyboard: ['←', '→', 'A', 'D'], mouse: '—', touch: '◀ ▶ buttons' },
      { action: 'Jump (hold for higher)', keyboard: ['Space', '↑', 'W'], mouse: '—', touch: '▲ button' },
      { action: 'Music on / off', keyboard: ['M'], mouse: '♪ button', touch: '♪ button' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: '140 Game — Free Minimalist Rhythm Platformer | igame9',
    description:
      'What is 140, the award-winning rhythm platformer by Jeppe Carlsen? Its history, how the music drives every jump, and a free 140 BPM platformer to play.',
    h1: '140',
    lede: '140 is the minimalist platformer where the music runs the level — here is the story, plus a free rhythm platformer at 140 BPM.',
    card: 'Rhythm platformer at 140 BPM',
    updated: '2026-10-03',
  },
  original: {
    source: { url: 'https://en.wikipedia.org/wiki/140_(video_game)', label: '140 (video game) on Wikipedia' },
    name: '140',
    developer: 'Carlsen Games (Jeppe Carlsen)',
    released: 'October 2013 (PC); consoles 2016; Switch 2020',
    genre: 'Rhythm platformer',
    platforms: 'Windows, macOS, Linux, PS4, Xbox One, Wii U, Switch',
  },
  intro: [
    '<p>The game is a small, sharp indie platformer from Danish designer <strong>Jeppe Carlsen</strong>, who earlier designed puzzles for Playdead’s <em>Limbo</em>. Everything in it is abstract: flat colour blocks, a simple shape for a hero, and an electronic soundtrack that does far more than set the mood. Platforms step, blink and slide on the beat, so the real skill is listening and moving in time. It won the Excellence in Audio award at the 2013 Independent Games Festival.</p>',
    '<p>On this page you can play <em>Offbeat</em>, igame9’s own free rhythm platformer built on the same idea. Its music is original and generated live in your browser at a fixed tempo: blocks blink in and out, lasers fire, spikes pop and lifts move with the beat, and every checkpoint adds a new instrument. Four levels each end in a boss fight set to the music. It runs on desktop, Chromebook and phone with no download.</p>',
  ],
  howToPlay: [
    'Choose a level and press <kbd>Space</kbd> or <strong>Play</strong>. Run with <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> (◀ ▶ on touch screens) and jump with <kbd>Space</kbd>, <kbd>↑</kbd> or <kbd>W</kbd> (▲). Hold jump for a higher jump; let go early for a short hop.',
    'Watch the four beat dots at the top. Solid coloured blocks are there now; dashed outlines are blocks that will blink in on a later beat. A block flickers just before it changes, so you can see the switch coming.',
    'Lasers show a thin dotted line while they are off, a bright line one moment before they fire, and a thick beam while they are deadly. Black-and-white spikes are always deadly; spike rows that pop up do so on fixed beats. Yellow pads launch you high, but only when the beat lands.',
    'Pass a flag to save a checkpoint. If you die, you restart there straight away and the music keeps playing. Each checkpoint adds an instrument and new colours.',
    'At the end of each level a boss takes over the arena. It drops blocks, sends shock waves along the floor and fires beams, always on the beat, with a white flash one beat before each attack. Grab the glowing orb that appears to hit it; three hits break it and clear the level.',
  ],
  tips: [
    '<strong>Count in fours.</strong> Every pattern repeats each bar of four beats. Watch a blinking block for one bar before you jump and the timing becomes obvious.',
    '<strong>Wait on safe ground.</strong> Nothing chases you, so standing still is always allowed. Pause at the edge, wait for the beat, then go.',
    '<strong>Leave on the beat, not after it.</strong> Blocks that are on for two beats give you about 0.85 seconds. Start your jump right as the block appears and you have plenty of time.',
    '<strong>Use short hops.</strong> Tapping jump gives a low, quick hop. It is safer under beams and between spike rows than a full jump.',
    '<strong>Ride lifts without jumping.</strong> Moving blocks carry you. Stand still on a lift and step off when it is level with the next ledge.',
    '<strong>In boss fights, move after the flash.</strong> A white column, side flash or line warns you one beat ahead. Step out of the column, hop the shock wave, and use the floating platforms to stay above low beams.',
    '<strong>Turn the music on.</strong> The game is fully playable with the music off (press <kbd>M</kbd>), but the kick drum on every beat is the best timing aid there is.',
  ],
  sections: [
    {
      id: 'about-140',
      h2: 'About the 140 game',
      html: `<p>The game was made by <strong>Carlsen Games</strong>, the studio of Jeppe Carlsen, with music and audio by <strong>Jakob Schmid</strong> (then an audio programmer at Playdead) and art by Niels Fyrst Lausdahl and Andreas Arnild Peitersen. Carlsen built it in his spare time over more than two years, using Unity. It came out for Windows, macOS and Linux on <strong>16 October 2013</strong>. Versions for Xbox One, PlayStation 4 and Wii U followed in 2016, and a Nintendo Switch version in January 2020.</p>
<p>The name is the tempo. The project first ran at 120 beats per minute, and moving it to 140 BPM changed how it played so much that the number became the title. At the 2013 Independent Games Festival it won the <strong>Excellence in Audio</strong> award and an honourable mention for Technical Excellence. On Steam it lists the Nordic Game Awards 2014 prize for Best Artistic Achievement. In June 2017 a free update added a large new level with new mechanics and another boss fight.</p>`,
    },
    {
      id: 'how-the-music-works',
      h2: 'How the music drives a 140 level',
      html: `<p>You play a tiny geometric shape: a square when standing still, a circle when moving and a triangle in the air. Each of the game’s four levels has its own soundtrack, and every moving part of the level is tied to it. Platforms appear and move on the beat, and enemies attack in time. Along the way you collect floating coloured balls and drop them into sockets in the ground. Each one adds a new layer to the music, changes the colours and brings in a new kind of obstacle. Touching the static-filled hazards sends you back to the last checkpoint. The rhythm is never spelled out — you are expected to feel it.</p>`,
    },
    {
      id: 'offbeat-vs-140',
      h2: 'Offbeat vs. the original 140 rhythm platformer',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">140 (2013)</th><th scope="col">Offbeat (this page)</th></tr></thead><tbody>
<tr><td><strong>Music</strong></td><td>Jakob Schmid’s electronic soundtrack</td><td>Original loops generated live in the browser at 140 BPM</td></tr>
<tr><td><strong>Layers</strong></td><td>Added by placing collected balls in sockets</td><td>Added at each checkpoint flag (drums → bass → arpeggio → claps → lead)</td></tr>
<tr><td><strong>Obstacles</strong></td><td>Beat-synced platforms and static-filled hazards</td><td>Blinking blocks, lifts, lasers, pop-up spikes and bounce pads</td></tr>
<tr><td><strong>Bosses</strong></td><td>Rhythm-based boss sequences</td><td>Four bosses with dropping blocks, shock waves and beams</td></tr>
<tr><td><strong>Price</strong></td><td>Paid, on PC and consoles</td><td>Free in any browser</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'offbeat-levels',
      h2: 'The four levels of Offbeat',
      html: `<ol><li><strong>Downbeat</strong> — blocks that blink on for two beats at a time, a lift that climbs one step per beat, and spike rows that pop up on beats 1 and 3. Boss: <em>Tick Core</em>, which drops blocks on your head and rolls shock waves along the floor.</li>
<li><strong>Backbeat</strong> — lasers that fire on beats 2 and 4, and bounce pads that throw you onto high ledges on the beat. Boss: <em>Snare Prism</em>, with falling blocks and low and high beams.</li>
<li><strong>Offbeat</strong> — patterns move on eighth notes, between the beats: syncopated stepping stones, a lift that moves twice per beat and lasers that fire on the “and”. Boss: <em>Swing Engine</em>.</li>
<li><strong>Overdrive</strong> — everything at once and faster, with two-beat cycles. Boss: <em>Overclock</em>, which uses every attack.</li></ol>
<p>Clearing a level unlocks the next one. The level menu remembers your fewest deaths, so you can come back and replay a level more cleanly.</p>`,
    },
  ],
  faq: [
    {
      q: 'Who made 140?',
      a: 'Jeppe Carlsen, formerly lead gameplay designer at Playdead, made it with composer Jakob Schmid and artists Niels Fyrst Lausdahl and Andreas Arnild Peitersen. It is published by Carlsen Games. igame9 is not affiliated with them.',
    },
    {
      q: 'Why is the game called 140?',
      a: 'It refers to the tempo of its music: 140 beats per minute. The game started at 120 BPM, and the faster tempo changed it so much that it became the name.',
    },
    {
      q: 'What platforms is 140 on?',
      a: 'Windows, macOS and Linux (2013), then PlayStation 4, Xbox One and Wii U (2016) and Nintendo Switch (2020). It has no official browser version; Offbeat on this page is a free browser game in the same style.',
    },
    {
      q: 'What awards did 140 win?',
      a: 'It won Excellence in Audio at the 2013 Independent Games Festival and got an honourable mention for Technical Excellence. Its Steam page also lists the Nordic Game Awards 2014 prize for Best Artistic Achievement.',
    },
    {
      q: 'Can I play Offbeat with the sound off?',
      a: 'Yes. The beat keeps running with the music muted (press M or use the ♪ button), and the beat dots, flickers and warning flashes show every change. The sound button under the game mutes everything.',
    },
    {
      q: 'Does Offbeat work on a phone?',
      a: 'Yes. On touch screens you get ◀ ▶ and ▲ buttons, and the view zooms to fit. Unlocked levels and your fewest deaths are saved in the browser on that device.',
    },
  ],
  related: ['sprinters', 'extreme-run-3d', 'run3d', 'crazy-shooters', 'brain-lines', 'drift-boss'],
};
