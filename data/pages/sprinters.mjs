export default {
  slug: 'sprinters',
  keyword: 'Sprinters',
  volume: 140,
  kd: 23,
  category: 'action',
  engine: 'sprint-100',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Photo Finish',
    hint: 'Alternate ← → (or A/D) in an even rhythm · wait for the gun',
    saves: 'Personal bests per round, furthest round, medals and track record saved in your browser',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    controls: [
      { action: 'Start / next race', keyboard: ['Enter', 'Space'], mouse: 'Click the menu button', touch: 'Tap the menu button' },
      { action: 'Run (alternate)', keyboard: ['← then →', 'A then D'], mouse: 'Click the left and right halves in turn', touch: 'Tap the two big buttons in turn' },
      { action: 'Start from the blocks', keyboard: ['First key after the gun'], mouse: 'First click after the gun', touch: 'First tap after the gun' },
      { action: '2-player race', keyboard: ['P1: A / D', 'P2: ← / →'], mouse: '—', touch: 'Four on-screen buttons' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'Sprinters — Play a Free 100m Sprint Game Online | igame9',
    description:
      'Play Sprinters online: tap ← and → in rhythm to win the 100 m from the heats to the final, then chase the track record. Free, with a 2-player mode.',
    h1: 'Sprinters',
    lede: 'Sprinters made simple: tap left, right, left, right — keep the rhythm, beat the gun and dip for the line.',
    card: 'Tap-in-rhythm 100 m race',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://www.gamedesign.jp/flash/sprinter/sprinter.html', label: 'Sprinter on Gamedesign.jp' },
    name: 'Sprinter',
    developer: 'Gamedesign.jp',
    released: '2006 (Flash)',
    genre: 'Key-tapping 100 m sprint',
    platforms: 'Web browser (Flash original; now via emulation and HTML5 on game portals)',
  },
  intro: [
    '<p>If you are looking for <strong>Sprinters</strong>, you are most likely thinking of <em>Sprinter</em>, the classic browser game where you win 100 m races by tapping the left and right arrow keys one after the other. The idea is older than the web — arcade athletics games used alternating run buttons back in the 1980s — but the Flash game turned it into a browser classic: one race takes about ten seconds, and every round the other runners get faster.</p>',
    '<p>On this page you can play <em>Photo Finish</em>, igame9’s own sprint game in the same spirit. Alternate <kbd>←</kbd> and <kbd>→</kbd> in an even rhythm, react to the starting gun without jumping it, and race seven CPU sprinters from the heats through the quarter-final, semi-final and final, then take on the track record. There is also a same-keyboard 2-player mode, and big tap buttons for phones and tablets.</p>',
  ],
  howToPlay: [
    'Press <strong>Start career</strong> (or <kbd>Enter</kbd>). The round is announced, then the starter calls “On your marks” and “Set…” while the runners settle in their blocks.',
    'Wait for the gun. Pressing during “Set…” is a <strong>false start</strong>, and so is a reaction quicker than 0.100 s after the gun. The first one is a warning; the second disqualifies you.',
    'After the gun, alternate <kbd>←</kbd> and <kbd>→</kbd> (or <kbd>A</kbd> and <kbd>D</kbd>). On a touch screen, tap the two big buttons in turn; with a mouse, click the left and right halves of the game.',
    'Speed comes from <strong>how fast and how evenly</strong> you alternate. The Rhythm bar turns green when your taps are steady. Hitting the same key twice, or both keys at once, is a <strong>misstep</strong> that costs speed.',
    'Finish in the qualifying places to advance: top 3 in the heat and quarter-final, top 2 in the semi-final. Win the final for gold and unlock record attempts, where you must win <em>and</em> beat the track record.',
  ],
  tips: [
    '<strong>Rhythm beats panic.</strong> Ragged mashing drags your top speed down and invites missteps, so a steady pace often beats a faster but uneven one. Keep the Rhythm bar green.',
    '<strong>Use two fingers, not one.</strong> Rest one finger on each key (or a thumb on each button) and rock between them. Moving one finger between two keys is slower and less steady.',
    '<strong>React, don’t guess.</strong> The pause after “Set…” is random. A good reaction is around 0.15–0.20 s; anything under 0.100 s counts as a false start, so listen for the bang instead of predicting it.',
    '<strong>Build speed in the first 30 m.</strong> Your runner leans forward in the drive phase and needs a few seconds to reach top speed. Losing rhythm early costs more than losing it at the end.',
    '<strong>Keep tapping through the line.</strong> Times are measured to the hundredth at the moment you cross 100 m. Easing off in the last few metres is how photo finishes are lost.',
    '<strong>Practise in the heats.</strong> The heats are forgiving. Use them to find a cadence you can hold for a full race, then push harder in the semi-final and final.',
  ],
  sections: [
    {
      id: 'sprinter-or-sprinters',
      h2: 'Sprinter or Sprinters? About the original game',
      html: `<p><strong>Sprinter</strong> is a Flash game by the Japanese studio <strong>Gamedesign.jp</strong>, released in 2006. You control one runner in a line-up of sprinters and win a 100 m race by tapping the left and right arrow keys rapidly and in time — tap out of step and your runner stumbles. Beat the field and you move on to a more serious competition where the opponents are faster, and each level comes with its own funky theme tune. The whole game can be finished in a few minutes, which is a big part of its charm.</p>
<p>Flash is no longer supported by browsers, so today the original is played through emulators such as Ruffle on game portals, and some portals offer an HTML5 version. Because people remember “the sprinters game” rather than its exact title, searches for <em>Sprinters</em> usually lead back to it.</p>`,
    },
    {
      id: 'photo-finish-vs-sprinter',
      h2: 'Photo Finish vs. the classic Sprinter',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Sprinter (2006)</th><th scope="col">Photo Finish (this page)</th></tr></thead><tbody>
<tr><td><strong>Running</strong></td><td>Alternate ← and → quickly and in time</td><td>Same, with a live Rhythm bar, speed in km/h and steps per second</td></tr>
<tr><td><strong>Start</strong></td><td>Race begins and you start tapping</td><td>“On your marks”, “Set…”, gun; reaction time measured, false starts penalised</td></tr>
<tr><td><strong>Progression</strong></td><td>Levels with faster opponents</td><td>Heat → Quarter-final → Semi-final → Final → endless record attempts</td></tr>
<tr><td><strong>Results</strong></td><td>Win or lose the level</td><td>Full results table with times to 0.01 s and reaction times</td></tr>
<tr><td><strong>Players</strong></td><td>1</td><td>1, or 2 on the same keyboard (A/D vs ←/→)</td></tr>
<tr><td><strong>Devices</strong></td><td>Desktop keyboard</td><td>Keyboard, mouse, phone and tablet</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'rhythm-technique',
      h2: 'The Sprinters rhythm technique that makes you faster',
      html: `<p>In Photo Finish every alternating tap is a stride. The game tracks your <strong>cadence</strong> (steps per second) and your <strong>evenness</strong> (how similar each gap between taps is to the last few). Cadence sets the speed you are aiming for; evenness scales it. That is why a steady, slightly slower rhythm often beats frantic mashing, and why the Rhythm bar is worth watching more than the speed number.</p>
<p>As a rough guide, about six or seven even steps per second gets you through the heats, around nine is needed to reach the final, and winning gold takes roughly eleven held for the whole race. The record attempts are meant to be brutal. The CPU sprinters each have their own style too — some explode out of the blocks, others are strong finishers — so a race can change hands in the last 20 metres. On touch screens the CPU field is eased slightly, because tapping glass is slower than pressing keys.</p>`,
    },
    {
      id: 'false-starts',
      h2: 'Reaction times and false starts in Sprinters',
      html: `<p>Real sprint starts use a reaction threshold: a runner who reacts within <strong>0.100 seconds</strong> of the gun is judged to have anticipated it, because humans cannot genuinely react that fast. Photo Finish uses the same rule. The time between the gun and your first tap is shown as your reaction in the results table; CPU runners typically react between 0.12 and 0.20 s.</p>
<p>In elite athletics a single false start now means disqualification. Photo Finish is a little kinder: the first false start in a race is a warning and everyone goes back to their marks, the second disqualifies you. The “Set…” pause is random every time, so the safest habit is to keep your fingers still until you hear the bang.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Sprinters the same game as Sprinter?',
      a: 'Most people searching for Sprinters mean Sprinter, the 2006 Flash game by Gamedesign.jp. Photo Finish on this page is igame9’s own 100 m game in the same alternating-keys style; it is not the original.',
    },
    {
      q: 'Who made the original Sprinter game?',
      a: 'Sprinter was made by Gamedesign.jp and released as a Flash game in 2006. igame9 is not affiliated with Gamedesign.jp.',
    },
    {
      q: 'How do I run faster?',
      a: 'Alternate the two keys as quickly as you can while keeping the gaps between taps even. Pressing the same key twice or both keys together causes a misstep and slows you down.',
    },
    {
      q: 'Can two people play on one keyboard?',
      a: 'Yes. Choose 2 players on the menu: Player 1 runs with A and D, Player 2 with ← and →, against six CPU runners. On a tablet each player gets two on-screen buttons.',
    },
    {
      q: 'Does it work on phones and Chromebooks?',
      a: 'Yes. It runs in any modern browser. On touch screens two large buttons appear at the bottom, and on a Chromebook you can use the arrow keys or A and D.',
    },
    {
      q: 'What is a good 100 m time in the game?',
      a: 'Heats are usually won in the low 11s, the final takes around 10.1 s or better, and the track record starts at 9.79 s. For reference, the real men’s 100 m world record is 9.58 s.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Your personal best for each round, the furthest round you reached, your medals and the track record are saved in your browser’s local storage, so Continue takes you straight back to that round.',
    },
  ],
  related: ['crazy-shooters', 'driving-bros', 'temple-run-3', 'run3d', 'drift-boss'],
};
