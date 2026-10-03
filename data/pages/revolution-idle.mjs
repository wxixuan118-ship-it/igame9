export default {
  slug: 'revolution-idle',
  keyword: 'Revolution Idle',
  volume: 170,
  kd: 18,
  category: 'idle',
  engine: 'orbit-idle',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Ringspin',
    hint: 'Click the orbits to pulse · buy Value & Speed · Eclipse, then Supernova',
    saves: 'Rings, Umbra, Nova cores and stats autosave in your browser; offline progress up to 8 h',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Spin pulse (push every orb forward)', keyboard: ['Space'], mouse: 'Click the orbit field', touch: 'Tap the orbit field' },
      { action: 'Buy Value / Speed, unlock a ring', keyboard: '—', mouse: 'Click the button', touch: 'Tap the button' },
      { action: 'Buy the maximum once', keyboard: ['Shift', 'Ctrl'], mouse: 'Hold Shift or Ctrl and click', touch: 'Select Max, then tap' },
      { action: 'Switch buy mode ×1 / Max', keyboard: ['M'], mouse: '×1 / Max switch', touch: '×1 / Max switch' },
      { action: 'Catch a comet', keyboard: ['C'], mouse: 'Click the comet', touch: 'Tap the comet' },
      { action: 'Switch tab (Rings … Settings)', keyboard: ['1–4'], mouse: 'Click a tab or the NEXT box', touch: 'Tap a tab or the NEXT box' },
    ],
  },
  seo: {
    title: 'Revolution Idle — Free Orbit Idle Game Online | igame9',
    description:
      'Revolution Idle guide plus a free orbit idle game in your browser: rings earn per revolution, buy speed and value, then Eclipse and go Supernova. No download.',
    h1: 'Revolution Idle',
    lede: 'A Revolution Idle-style orbit game: orbs circle a glowing core and every lap pays out — speed them up, add rings, then reset for bigger multipliers.',
    card: 'Orbits, eclipses & supernovas',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://store.steampowered.com/app/2763740/Revolution_Idle/', label: 'Steam store page' },
    name: 'Revolution Idle',
    developer: 'Oni Gaming and Nu Games',
    released: 'Steam Early Access Oct 2024; full release May 2025',
    genre: 'Idle / incremental',
    platforms: 'Windows (Steam), Android, iOS',
  },
  intro: [
    '<p><strong>Revolution Idle</strong> is an incremental game built on a very simple picture: coloured circles going round and round. Every time one completes a lap you score, and the rest of the game is about making those laps faster and more valuable, then resetting through layer after layer of prestige to make the numbers grow absurdly large.</p>',
    '<p>On this page you can play <em>Ringspin</em>, igame9’s original orbit incremental in the same genre. Glowing bodies circle a core and pay Stardust each time they cross the line at 12 o’clock. You buy Value and Speed for every ring, unlock new outer rings, catch comets, and then reset through two prestige layers, Eclipse and Supernova, with autobuyers to take over the clicking. It runs in the browser on desktop, Chromebook and phone, with no download.</p>',
  ],
  howToPlay: [
    'Press <strong>Start spinning</strong>. The orb on ring I circles the core; each time it crosses the line at the top it completes a <strong>revolution</strong> and pays Stardust ✦.',
    'In the <strong>Rings</strong> tab buy <strong>Value</strong> (more ✦ per lap, doubled every 25 levels) and <strong>Speed</strong> (+10% laps per second per level, up to level 40) for each ring.',
    'Unlock outer rings as soon as you can afford them: Moonlet (40 ✦), Comet (800), Planet (16K), Gas Giant (400K) and Star (12M). Outer rings are slower but pay far more per lap.',
    'Click or tap the orbit field, or press <kbd>Space</kbd>, for a <strong>spin pulse</strong> that pushes every orb 0.15 seconds forward. Catch the occasional <strong>comet</strong> for ×3 speed for 15 seconds or a lump of Stardust.',
    'After 1M ✦ in one run, <strong>Eclipse</strong>: rings and Stardust reset and you gain Umbra ◐ to spend in the Eclipse shop on multipliers, a head start, autobuyers, offline boosts and more.',
    'Once you have earned 200 ◐ since your last reset, go <strong>Supernova</strong> for Nova cores ◉. Each core doubles all Stardust permanently, and core milestones unlock rings VII and VIII and Auto-Eclipse.',
  ],
  tips: [
    '<strong>Value first, then Speed.</strong> Value levels get 16% pricier each time, Speed levels 55% pricier. Early on, Value on ring I and II is the cheapest growth; buy Speed when it is close in price.',
    '<strong>Push rings to 25, 50 and 75 Value levels.</strong> Each 25 levels doubles that ring’s value (“resonance”), which is a big jump for the last few levels’ cost.',
    '<strong>Unlock every new ring immediately.</strong> Each ring’s base payout is roughly ten times the one inside it, so a fresh ring quickly outearns a heavily levelled inner ring.',
    '<strong>Don’t Eclipse at the first chance.</strong> Umbra = 2 × (run Stardust ÷ 1M)<sup>0.4</sup>: 1M gives 2 ◐, 10M gives 5 ◐ and 100M gives 12 ◐. Reset when the next purchase is minutes away.',
    '<strong>Spend your first Umbra on Dark Matter (1 ◐) and Head Start (2 ◐)</strong>, then Autobuyer: Value (3 ◐). From then on the rings level themselves while you watch.',
    '<strong>Keep the tab handy for comets.</strong> A comet crosses in about seven seconds; Comet Lure (4 ◐) makes them appear twice as often.',
  ],
  sections: [
    {
      id: 'about-revolution-idle',
      h2: 'About the original Revolution Idle',
      html: `<p>The game is developed by <strong>Oni Gaming and Nu Games</strong> and published by Oni Gaming. It is free to play on Windows through Steam and on Android and iOS, with progress that can sync across platforms. On Steam it entered Early Access on 11 October 2024 and had its full release on 1 May 2025; the developers say it has passed two million players.</p>
<p>The core loop is circles doing laps. Each colour has its own speed and its own multiplier gained per revolution, and the product of all the multipliers is the score you earn on every lap. Spending score levels up circles to make them faster; reaching level thresholds lets a circle <em>ascend</em>, resetting its level for a large boost. <em>Prestige</em> resets levels for a bigger multiplier and a higher exponent, and <em>Promotion</em> is a deeper reset that lets you pick between permanent buffs.</p>
<p>The long game starts at <strong>Infinity</strong>, around 1.79e308 — the largest value a standard double-precision number can hold. Infinity unlocks its own points, upgrades and challenges, followed by Eternity and later Unity. The game also features offline progress, a macro builder for automation, a large achievement list and leaderboards.</p>`,
    },
    {
      id: 'ringspin-vs-revolution-idle',
      h2: 'Ringspin vs. Revolution Idle',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Original game</th><th scope="col">Ringspin (this page)</th></tr></thead><tbody>
<tr><td><strong>Core loop</strong></td><td>Coloured circles score on every lap</td><td>8 rings of orbiting bodies pay Stardust on every lap</td></tr>
<tr><td><strong>Upgrades</strong></td><td>Levels, ascensions, multipliers per colour</td><td>Value and Speed per ring; ×2 every 25 Value levels</td></tr>
<tr><td><strong>Prestige layers</strong></td><td>Prestige, Promotion, Infinity, Eternity, Unity</td><td>Eclipse (Umbra shop) and Supernova (Nova cores + milestones)</td></tr>
<tr><td><strong>Automation</strong></td><td>Automations and a macro builder</td><td>Value / Speed autobuyers, Auto-Unlock, Auto-Eclipse</td></tr>
<tr><td><strong>Active play</strong></td><td>Mostly hands-off</td><td>Spin pulses and clickable comets</td></tr>
<tr><td><strong>Platforms</strong></td><td>Steam, Android, iOS</td><td>Any browser, desktop and mobile</td></tr>
</tbody></table></div>`,
    },
    {
      id: 'eclipse-and-supernova',
      h2: 'Eclipse and Supernova: when to reset in Ringspin',
      html: `<p>Both layers trade progress now for faster progress later, and both pay more the longer you wait, but with diminishing returns. A good rule is to reset when your next purchase is several minutes away, not when the button first lights up.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Layer</th><th scope="col">Unlocks at</th><th scope="col">Reward</th><th scope="col">Keeps</th></tr></thead><tbody>
<tr><td><strong>Eclipse</strong></td><td>1M ✦ in one run</td><td>Umbra ◐ = 2 × (run ✦ ÷ 1M)<sup>0.4</sup></td><td>Umbra, Eclipse shop, Nova cores</td></tr>
<tr><td><strong>Supernova</strong></td><td>200 ◐ earned since the last one</td><td>Nova cores ◉ = √(◐ earned ÷ 200); each doubles Stardust</td><td>Nova cores, autobuyers and Auto-Unlock</td></tr>
</tbody></table></div>
<p>A typical path: Eclipse for the first time after 10 to 20 minutes, buy Dark Matter and Head Start, then the autobuyers. Repeat until Dark Matter gets expensive, then Supernova. One core unlocks ring VII (Pulsar), two cores add Auto-Eclipse, four unlock ring VIII (Quasar), seven start every Eclipse with all rings, and twelve triple Umbra gain.</p>`,
    },
    {
      id: 'two-revolution-idles',
      h2: 'Two games called Revolution Idle',
      html: `<p>If an older listing turns up in your search, it is probably a different game: a small browser idle game also named Revolution Idle was published on Kongregate by the developer <strong>NinjaNic</strong> in 2017. It is likewise about circles going round, with clickable upgrades and Ctrl-click to buy the maximum. The Revolution Idle most people mean today is the much larger Steam and mobile game by Oni Gaming and Nu Games.</p>`,
    },
  ],
  faq: [
    {
      q: 'Who made Revolution Idle?',
      a: 'It is developed by Oni Gaming and Nu Games and published by Oni Gaming. igame9 is not affiliated with them; Ringspin on this page is igame9’s own orbit incremental game in a similar style.',
    },
    {
      q: 'Is Revolution Idle free?',
      a: 'Yes. It is free to play on Steam, Android and iOS, with optional in-app purchases. Ringspin on this page is completely free and needs no download or account.',
    },
    {
      q: 'What is Infinity in Revolution Idle?',
      a: 'Infinity is the first big milestone, reached at about 1.79e308 score, the limit of a standard double-precision number. It unlocks Infinity points, new upgrades and challenges before the Eternity layer.',
    },
    {
      q: 'How do I buy max in Ringspin?',
      a: 'Hold Shift or Ctrl while clicking a Value or Speed button, or switch the ×1 / Max toggle above the ring list (press M on a keyboard). On touch screens, select Max and tap.',
    },
    {
      q: 'Does Ringspin keep going when I close it?',
      a: 'Yes. When you return it measures the real time you were away and pays 50% of your Stardust rate for up to 8 hours, or 100% after buying Deep Sleep in the Eclipse shop.',
    },
    {
      q: 'Can I play on a phone or Chromebook?',
      a: 'Yes. Ringspin switches to a portrait layout on phones, with the orbits on top and scrolling tabs below, and supports touch, mouse and keyboard.',
    },
  ],
  related: ['idleon-gaming', 'idle-startup-tycoon', 'idle-guy', 'idle-startup-tycoon-github', 'merge-dragons', 'brain-lines'],
};
