export default {
  slug: 'drift-hunters',
  keyword: 'Drift Hunters',
  volume: 210,
  kd: 21,
  category: 'racing',
  engine: 'drift-point',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Drift Point',
    hint: 'W/↑ gas · A D steer · Space handbrake · chain drifts up to ×8',
    saves: 'Cash, cars, upgrades, best scores and medals saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Accelerate', keyboard: ['W', '↑'], mouse: 'Hold left button (drives toward the pointer)', touch: 'GAS button' },
      { action: 'Steer', keyboard: ['A / D', '← / →'], mouse: 'Move the pointer while holding', touch: '◀ ▶ buttons' },
      { action: 'Handbrake (kick the tail out)', keyboard: ['Space'], mouse: 'Hold right button', touch: 'DRIFT button' },
      { action: 'Brake / reverse', keyboard: ['S', '↓'], mouse: '—', touch: 'BRAKE button' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: 'Pause button', touch: 'Pause button' },
      { action: 'Put the car back on the road', keyboard: ['R'], mouse: 'Pause → Reset car', touch: 'Pause → Reset car' },
      { action: 'Start session / change track', keyboard: ['Enter', '← / →'], mouse: 'Click', touch: 'Tap' },
    ],
  },
  seo: {
    title: 'Drift Hunters — Play a Free Drifting Game Online | igame9',
    description:
      'Play a free Drift Hunters-style drifting game in your browser: slide rear-drive cars on 3 tracks, chain drifts up to ×8, earn cash and tune 5 cars.',
    h1: 'Drift Hunters',
    lede: 'Drift Hunters-style drifting: throttle, handbrake, counter-steer — chain long slides for points, then spend them on cars and tuning.',
    card: 'Chain drifts, tune your car',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://www.drifted.com/drift-hunters/', label: 'Drifted.com game page' },
    name: 'Drift Hunters',
    developer: 'Studionum43 (Ilya Kaminetsky)',
    released: 'February 2017 (browser, Unity WebGL)',
    genre: 'Drifting / car tuning',
    platforms: 'Web browser (desktop), iOS, Android',
  },
  intro: [
    '<p><strong>Drift Hunters</strong> is one of the best-known free drifting games on the web: a 3D Unity game where you throw a rear-wheel-drive car sideways around a track, rack up drift points and turn those points into cash for new cars and tuning parts. There is no lap timer and no opponent — just you, the throttle, the handbrake and how long you can hold a slide.</p>',
    '<p>On this page you can play <em>Drift Point</em>, igame9’s own drifting game built around the same loop. It is a top-down game rather than 3D, but the physics are a real slip-angle model: the rear tyres break loose under power or handbrake, you catch the slide with counter-steer, and points come from angle × speed with a growing combo multiplier. Drift for two minutes, bank your score and upgrade your garage — in any modern browser on desktop, Chromebook or phone, with no download.</p>',
  ],
  howToPlay: [
    'Pick a track — <strong>Foundry Lot</strong> (a wide practice loop), <strong>Harbor Loop</strong> (tight city streets) or <strong>Cedar Pass</strong> (a mountain touge) — and press <em>Start</em>. A two-minute session begins after a 3-2-1 countdown.',
    'Hold <kbd>W</kbd> or <kbd>↑</kbd> to accelerate and steer with <kbd>A</kbd>/<kbd>D</kbd> or the arrow keys. On a phone, use the on-screen <em>GAS</em>, <em>BRAKE</em>, <em>DRIFT</em> and ◀ ▶ buttons.',
    'To start a drift, turn into a corner and tap <kbd>Space</kbd> (the handbrake). Stronger cars will also step out if you stay on full throttle mid-corner.',
    'Keep the throttle down to hold the slide. The front wheels counter-steer on their own, like a real car’s caster: tap steering <em>into</em> the corner for more angle, tap the other way to reduce it, and lift off the gas to straighten up.',
    'Points flow while you slide — more angle and more speed score faster — and the multiplier climbs from ×1 to ×8 the longer the chain lasts. After a drift ends you have 1.6 seconds to start the next one (“LINK IT!”) before the chain is banked.',
    'Hitting a wall hard or spinning out loses the unbanked chain. When the timer runs out, your score turns into cash (and medal bonuses) to spend on cars and upgrades in the <em>Garage</em>.',
  ],
  tips: [
    '<strong>Flick the handbrake, don’t hold it.</strong> A short tap rotates the car; holding <kbd>Space</kbd> scrubs speed, and speed is half of your score.',
    '<strong>Stay on the gas in the slide.</strong> Lifting gives the rear tyres their grip back and the drift ends. Use steering taps, not the throttle, to adjust the angle.',
    '<strong>Steer in small taps.</strong> Holding a direction for a full second either spins the angle up to the limit or snaps the car straight. Short taps keep the angle around 30–50°, the sweet spot for points.',
    '<strong>Link corners.</strong> The 1.6-second link window is long enough to carry a chain through an S-bend. On Cedar Pass, linking two or three corners is the quickest way to ×4 and beyond.',
    '<strong>Use “wall kiss” carefully.</strong> Drifting within a car’s width of the barrier pays ×1.5, but any real contact throws the whole chain away. Bank a big chain with a calm exit before you get greedy.',
    '<strong>Upgrade steering early.</strong> The Steering upgrade adds lock and raises the maximum drift angle, which directly raises points per second. Engine upgrades matter more on the heavier cars.',
  ],
  sections: [
    {
      id: 'about-drift-hunters',
      h2: 'About the original Drift Hunters',
      html: `<p>The game was made by <strong>Studionum43</strong>, the label of Ukrainian developer <strong>Ilya Kaminetsky</strong>, and appeared in February 2017. It is built in Unity and plays in the browser through WebGL, which is a big reason it spread across school and office computers: it loads in a tab and still feels like a proper 3D driving game. Official versions are also available for iOS and Android.</p>
<p>The core loop is simple. You choose a car and a map — the game has around ten of them, ranging from a stadium and docks to forest roads and a mountain touge — and drift freely. Points earned while sliding are your currency: the longer you hold a drift, the higher the multiplier climbs. Cash unlocks more than two dozen cars and buys upgrades for the engine, turbo, gearbox, brakes and weight, from “street” to “pro” levels. There is also a fine-tuning screen for camber, wheel offset, ride height and brake balance, plus paint and wheels.</p>
<p>The default keyboard controls are WASD or the arrow keys, <kbd>Space</kbd> for the handbrake, <kbd>C</kbd> to change the camera and <kbd>Shift</kbd>/<kbd>Ctrl</kbd> for manual gear changes.</p>`,
    },
    {
      id: 'drift-point-vs-drift-hunters',
      h2: 'Drift Point vs. Drift Hunters',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Original game</th><th scope="col">Drift Point (this page)</th></tr></thead><tbody>
<tr><td><strong>View</strong></td><td>3D, chase and other cameras</td><td>Top-down 2D with a speed-sensitive zoom</td></tr>
<tr><td><strong>Physics</strong></td><td>3D car simulation with manual gear shifting</td><td>Slip-angle tyre model: wheelspin, handbrake, weight transfer, self-centring counter-steer</td></tr>
<tr><td><strong>Goal</strong></td><td>Free drifting, no time limit</td><td>Two-minute sessions, best score and three medals per track</td></tr>
<tr><td><strong>Tracks</strong></td><td>About ten maps</td><td>Three: practice lot, city circuit, mountain touge</td></tr>
<tr><td><strong>Cars &amp; tuning</strong></td><td>Over two dozen cars modelled on real tuner and sports cars, detailed tuning</td><td>Five original cars, four upgrades with three levels each, eight paints</td></tr>
<tr><td><strong>Phones</strong></td><td>Separate iOS / Android apps</td><td>Same page, on-screen touch buttons</td></tr>
<tr><td><strong>Saves</strong></td><td>Depends on the version and site</td><td>Cash, cars, upgrades, bests and medals in your browser</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'drift-scoring',
      h2: 'How drift scoring works (and how to score more)',
      html: `<p>In Drift Point the car is “drifting” when it travels sideways by more than about 12° at a decent speed. Every second of drifting adds points equal to the angle (minus a small dead zone) times your speed, so a 45° slide at 70 km/h scores roughly twice as fast as a timid 25° one. Sliding close to a wall adds a ×1.5 “wall kiss” bonus.</p>
<p>Those points collect in a <strong>chain</strong>. The multiplier steps up as the chain grows — ×2 after the first 1,000 points, then ×3, ×4 and so on up to ×8 — and the whole chain is multiplied when it is banked. That is why one long, linked drift beats five short ones, and why a wall hit late in a chain hurts so much.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Track</th><th scope="col">Bronze</th><th scope="col">Silver</th><th scope="col">Gold</th></tr></thead><tbody>
<tr><td>Foundry Lot</td><td>25,000</td><td>100,000</td><td>250,000</td></tr>
<tr><td>Harbor Loop</td><td>20,000</td><td>80,000</td><td>200,000</td></tr>
<tr><td>Cedar Pass</td><td>20,000</td><td>80,000</td><td>200,000</td></tr>
</tbody></table></div>
<p>Each medal pays a one-time cash bonus ($500, $1,500 and $4,000) on top of the normal rate of $1 per 20 points.</p>`,
    },
    {
      id: 'drift-hunters-max',
      h2: 'Drift Hunters MAX and other versions',
      html: `<p>The original browser game is still widely hosted on game portals. In February 2022, Ilya Kaminetsky and the team behind Drifted.com released <strong>Drift Hunters MAX</strong>, a follow-up exclusive to that site with 39 cars, 13 tracks and three modes: classic Freestyle, Drift Attack, and an Open World city with AI traffic. Many other sites host copies of the original under names like “Drift Hunters unblocked”, so check who publishes a version before assuming it is a new game.</p>
<p>Drift Point is none of these: it is a separate, lightweight game made for igame9 around the part most people come back for — balancing a slide on the throttle while the multiplier climbs.</p>`,
    },
  ],
  faq: [
    {
      q: 'Is Drift Hunters free to play?',
      a: 'Yes. The original is free on many web game sites, and Drift Point on this page is completely free with no download, account or in-game purchases.',
    },
    {
      q: 'Who made Drift Hunters?',
      a: 'It was developed by Studionum43, the studio name of Ukrainian developer Ilya Kaminetsky, and released in 2017. igame9 is not affiliated with the developer; the game on this page is igame9’s own Drift Hunters-style game.',
    },
    {
      q: 'What are the controls in Drift Hunters?',
      a: 'In the original, WASD or the arrow keys drive, Space is the handbrake, C changes the camera and Shift/Ctrl change gear. Drift Point uses the same driving keys and handbrake, plus P to pause and R to put the car back on the road.',
    },
    {
      q: 'Can I play Drift Hunters on a phone or Chromebook?',
      a: 'The original browser version is designed for desktop, with separate official apps for iOS and Android. Drift Point runs on Chromebooks and in mobile browsers, with on-screen GAS, BRAKE, DRIFT and steering buttons.',
    },
    {
      q: 'How do you earn money fast?',
      a: 'Hold long, linked drifts instead of many short ones: the multiplier only reaches ×5–×8 on long chains. In Drift Point, the wide Foundry Lot is the safest place to practise and keep one chain alive, and first-time medals add bonus cash.',
    },
    {
      q: 'Which car should I buy first in Drift Point?',
      a: 'The Ronin RS is the best all-rounder: more power than the starter Sparrow S without being twitchy. Add the Steering upgrade first for bigger angles, then Engine.',
    },
    {
      q: 'Is my progress saved?',
      a: 'Yes. Cash, cars, upgrades, paint, best scores and medals are stored in your browser’s local storage. Clearing site data or using a private window resets them.',
    },
  ],
  related: ['drift-boss', 'driving-bros', 'run3d', 'temple-run-3', 'crazy-shooters'],
};
