export default {
  slug: 'drift-boss',
  keyword: 'Drift Boss',
  volume: 1000,
  kd: 21,
  category: 'racing',
  engine: 'edge-drift',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Edge Drift',
    hint: 'Hold to drift right · release to swing left',
    saves: 'Best score, coins and cars saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Start a run', keyboard: ['Space', 'Enter'], mouse: 'Click', touch: 'Tap' },
      { action: 'Drift right', keyboard: ['Space', '→'], mouse: 'Hold left button', touch: 'Hold anywhere' },
      { action: 'Swing back left', keyboard: ['Release key'], mouse: 'Release button', touch: 'Lift finger' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
    ],
  },
  seo: {
    title: 'Drift Boss — Play a Free One-Tap Drift Game Online | igame9',
    description:
      'Play a free Drift Boss-style game in your browser: hold to drift right, release to swing left and stay on the floating track. Coins, cars and boosters.',
    h1: 'Drift Boss',
    lede: 'One-button drifting on a narrow floating track — hold, release, don’t fall.',
    card: 'One-tap cliff-edge drifting',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://www.marketjs.com/', label: 'MarketJS, the developer' },
    name: 'Drift Boss',
    developer: 'MarketJS',
    released: '2019 (HTML5)',
    genre: 'One-button arcade driving',
    platforms: 'Web browser — desktop, phone, tablet',
  },
  intro: [
    '<p><strong>Drift Boss</strong> is the one-button driving game where a little car slides around the corners of an endless zig-zag track floating in the sky. You never touch the gas — the car drives itself. Your only job is timing: hold to swing the car right, let go to swing it back left, and keep all four wheels on the road for as long as you can.</p>',
    '<p>On this page you can play <em>Edge Drift</em>, igame9’s free take on the Drift Boss formula. It keeps the same hold-and-release steering and the same “one more run” loop, and adds its own track, cars and boosters. It runs straight in the browser on desktop, Chromebook and phone, with nothing to install.</p>',
  ],
  howToPlay: [
    'Tap the screen, click or press <kbd>Space</kbd> to start the engine. The first straight runs up-left, so you don’t need to press anything yet.',
    'As the road bends to the right, <strong>hold</strong> the mouse button, your finger or <kbd>Space</kbd>. The car turns right and slides around the corner.',
    '<strong>Release</strong> before the next bend and the car swings back to the left. Every corner is a hold-or-release decision.',
    'Grab gold coins on the straights. Spend them on new cars and on boosters such as a Spare Tire that saves you from one fall.',
    'The car speeds up the longer you survive and the road narrows, so a long run is about staying calm, not reacting late.',
  ],
  tips: [
    '<strong>Start the turn early.</strong> The car drifts, so it keeps sliding outward after you change direction. Press or release just before the corner, not on it.',
    '<strong>Aim for the middle of the road.</strong> Exiting a corner near the centre line gives you room to correct the next one; hugging an edge leaves no margin.',
    '<strong>Don’t tap — hold.</strong> Short nervous taps make the car wobble. Commit to a hold through the whole right-hand bend.',
    '<strong>Watch two corners ahead.</strong> Short zig-zag sections need quick hold-release rhythm; long straights let you reset.',
    '<strong>Buy the Spare Tire for record attempts.</strong> One extra life is worth more than any cosmetic car when you are chasing a best score.',
    '<strong>Save coins in the early game.</strong> Cars are cosmetic; boosters actually help you score.',
  ],
  sections: [
    {
      id: 'about-drift-boss',
      h2: 'About the original Drift Boss',
      html: `<p>The game was made by <strong>MarketJS</strong>, a studio that builds HTML5 games for web portals and brands. It became one of the most-played browser driving games because it strips racing down to a single input: the car turns one way while you hold and the other way when you let go. Runs last seconds at first, which makes the game easy to pick up and hard to put down.</p>
<p>The original adds coins you can spend on new cars and a set of boosters — extra life, bonus coins and double score — and it gradually adds track variations as you survive longer. Because it works with one finger, it is popular on phones, school Chromebooks and anywhere a full keyboard isn’t handy.</p>`,
    },
    {
      id: 'edge-drift-vs-drift-boss',
      h2: 'Edge Drift vs. Drift Boss',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Original game</th><th scope="col">Edge Drift (this page)</th></tr></thead><tbody>
<tr><td><strong>Steering</strong></td><td>Hold to turn right, release to turn left</td><td>Same one-button steering</td></tr>
<tr><td><strong>Track</strong></td><td>Endless floating zig-zag platform</td><td>Endless floating dusk highway that narrows as you go</td></tr>
<tr><td><strong>Progression</strong></td><td>Coins unlock cars; boosters</td><td>Coins unlock 6 cars; 3 boosters (Spare Tire, Coin Magnet, Turbo Score)</td></tr>
<tr><td><strong>Saves</strong></td><td>Depends on the site you play on</td><td>Best score, coins and cars saved in your browser</td></tr>
<tr><td><strong>Price</strong></td><td>Free with ads on most portals</td><td>Free</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'cars-and-boosters',
      h2: 'Cars and boosters in Edge Drift',
      html: `<p>Every coin you pick up is banked when a run ends, even if you fall on the very next corner. Coins buy two kinds of things, and it pays to know the difference before you spend them.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Car</th><th scope="col">Price</th><th scope="col">Look</th></tr></thead><tbody>
<tr><td><strong>Mini</strong></td><td>Free</td><td>Small red hatchback — the starter car</td></tr>
<tr><td><strong>Cab</strong></td><td>150 coins</td><td>Yellow taxi with a roof sign</td></tr>
<tr><td><strong>Patrol</strong></td><td>300 coins</td><td>White police car with a flashing light bar</td></tr>
<tr><td><strong>Sprint GT</strong></td><td>600 coins</td><td>Low orange sports car with a rear wing</td></tr>
<tr><td><strong>Hauler</strong></td><td>1,000 coins</td><td>Green pickup truck with an open bed</td></tr>
<tr><td><strong>Neon</strong></td><td>1,600 coins</td><td>Black street racer with cyan underglow</td></tr>
</tbody></table></div>
<p>All six cars handle exactly the same, so buy them for style, not for an advantage. <strong>Boosters</strong> are different: you arm them on the start or game-over screen, they cost coins each time, and they last for one run. <strong>Spare Tire</strong> (120) catches you after one fall and puts you back on the road. <strong>Coin Magnet</strong> (80) pulls in coins that are near the car, so you can stay on the racing line instead of chasing them. <strong>Turbo Score</strong> (100) multiplies every point you earn that run by 1.5. Tapping an armed booster again refunds it.</p>`,
    },
    {
      id: 'mobile-chromebook',
      h2: 'Playing on a phone, tablet or Chromebook',
      html: `<p>Because the whole game is a single input, it works the same with a finger as with a mouse. Hold anywhere on the track to turn right and lift your finger to swing left; the screen won’t scroll while you play. On a phone, rotate to landscape or tap the fullscreen button under the game for a wider view of the corners ahead. On Chromebooks and laptops, <kbd>Space</kbd> is the most precise control because there is no touch latency, and <kbd>P</kbd> or <kbd>Esc</kbd> pauses mid-run. Your best score, coins and cars are stored in the browser on that device, so they won’t follow you to a different computer.</p>`,
    },
    {
      id: 'why-cars-fall',
      h2: 'Why does my car keep falling off?',
      html: `<p>Almost every fall comes from one of three mistakes. <strong>Late input:</strong> the car needs a moment to rotate and a moment more for the slide to settle, so pressing at the corner is already too late. <strong>Over-holding:</strong> keeping the button down after the car has turned makes it continue toward the right edge. <strong>Panic tapping:</strong> rapid taps cancel the drift halfway and leave the car pointed diagonally. Fix them in that order and your average score will jump quickly.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Drift Boss free to play?',
      a: 'Yes. It is free on most web game portals, and Edge Drift on this page is completely free with no download or sign-up.',
    },
    {
      q: 'Who made Drift Boss?',
      a: 'It was developed by MarketJS, an HTML5 game studio. igame9 is not affiliated with MarketJS; the game on this page is igame9’s own Drift Boss-style game.',
    },
    {
      q: 'How do you control the car in Drift Boss?',
      a: 'Hold the mouse button, the space bar or your finger to turn right, and release it to turn left. The car accelerates on its own.',
    },
    {
      q: 'Can I play Drift Boss on a phone or Chromebook?',
      a: 'Yes. The one-button controls work with touch, and Edge Drift runs in any modern browser on phones, tablets and Chromebooks.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Edge Drift stores your best score, coins and unlocked cars in your browser’s local storage. Clearing site data or browsing privately resets it.',
    },
    {
      q: 'Do the cars in Edge Drift handle differently?',
      a: 'No. All six cars are cosmetic and drive identically, so the only things that affect your score are your timing and the boosters you arm before a run.',
    },
    {
      q: 'What is a good score in Edge Drift?',
      a: 'Most first runs end within a few hundred points. Passing 1,000 means you have learned to start turns early; past 3,000 you are consistently handling the narrow, fast sections.',
    },
  ],
  related: ['drift-hunters', 'driving-bros', 'run3d', 'temple-run-3', 'sprinters', 'crazy-shooters'],
};
