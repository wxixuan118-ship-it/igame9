export default {
  slug: 'army-of-ages',
  keyword: 'Army of Ages',
  volume: 0,
  kd: 0,
  category: 'strategy',
  engine: 'age-siege',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Epoch Siege',
    hint: 'Train units (1–4) · evolve with XP (E) · destroy the rival base',
    saves: 'Wins, best times and kills saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Start a battle', keyboard: ['Space', 'Enter'], mouse: 'Click a difficulty', touch: 'Tap a difficulty' },
      { action: 'Train melee / ranged / heavy / flyer', keyboard: ['1', '2', '3', '4'], mouse: 'Unit buttons', touch: 'Unit buttons' },
      { action: 'Mount or upgrade a turret', keyboard: ['T'], mouse: 'Turret button', touch: 'Turret button' },
      { action: 'Special attack', keyboard: ['Q', 'Space'], mouse: 'Special button', touch: 'Special button' },
      { action: 'Evolve (Veterans in the last age)', keyboard: ['E'], mouse: 'Evolve button', touch: 'Evolve button' },
      { action: 'Scroll the battlefield', keyboard: ['←', '→', 'A', 'D'], mouse: 'Drag, wheel or click the map strip', touch: 'Drag or tap the map strip' },
      { action: 'Camera follows the fight', keyboard: ['F'], mouse: '⌖ Follow button', touch: '⌖ button' },
      { action: 'Pause', keyboard: ['P', 'Esc'], mouse: '❚❚ button', touch: '❚❚ button' },
    ],
  },
  seo: {
    title: 'Army of Ages — Play a Free Age-Evolving Battle Game | igame9',
    description:
      'Army of Ages, the 2011 Armor Games battle where you evolve from the Stone Age to the future, explained — plus a free lane-battle game you can play online now.',
    h1: 'Army of Ages',
    lede: 'Train troops, evolve through five ages and storm the rival base.',
    card: 'Evolve from clubs to lasers',
    updated: '2026-10-03',
  },
  original: {
    source: { url: 'https://armorgames.com/play/11789/army-of-ages', label: 'The original on Armor Games' },
    name: 'Army of Ages',
    developer: 'Louissi (published on Armor Games)',
    released: 'June 2011 (Flash)',
    genre: 'Lane battle / strategy',
    platforms: 'Web browser (Flash)',
  },
  intro: [
    '<p><strong>Army of Ages</strong> is a 2011 Flash strategy game by Louissi, published on Armor Games. You lead a Stone Age clan along a single battle lane, train troops that march and fight on their own, and evolve through five eras of technology while an alien enemy pushes back from the other side. It came from the same developer as the 2007 hit <em>Age of War</em> and built a bigger game on that idea: more than 50 units and turrets, plus magic attacks paid for with experience.</p>',
    '<p>On this page you can play <em>Epoch Siege</em>, igame9’s free lane battle in the same spirit. Your base is on the left, a rival tribe’s base is on the right, and both armies evolve from the Stone Age through the Medieval, Gunpowder and Modern eras to the Future Age. Each era brings new units, a turret and a special attack, and the rival trains, evolves and counterattacks too. It is an original game: no art, units or names come from the original.</p>',
  ],
  howToPlay: [
    'Pick <strong>Easy</strong>, <strong>Normal</strong> or <strong>Hard</strong>. Difficulty only changes the rival: how much gold and XP it earns and how quickly it evolves.',
    'Spend gold on four kinds of units with the buttons or keys <kbd>1</kbd>–<kbd>4</kbd>. Melee fighters are cheap. Ranged units shoot from behind and are the only troops that can hit flyers. Heavy units are armored and hit hard. Flyers float over the front line and bomb the ground. Up to five units wait in the training queue.',
    'Units walk right and fight on their own. Every kill pays <strong>gold</strong> and <strong>XP</strong>, and you also earn a little of both over time. When the XP bar fills, press <strong>Evolve</strong> (<kbd>E</kbd>). Your units, base, turret and special all move up an era, and new units are far stronger than old ones.',
    'Mount up to two <strong>turrets</strong> on your base (<kbd>T</kbd>). Pressing it again replaces the oldest turret with one from your current era and refunds half the old one. The <strong>special attack</strong> (<kbd>Q</kbd>) rains damage just ahead of your front line, then recharges for 50 seconds.',
    'Drag the battlefield, use <kbd>←</kbd> <kbd>→</kbd> or click the map strip to look around. <strong>⌖ Follow</strong> re-centres the camera on the fighting. Bring the rival base to zero to win. In the Future Age, Evolve becomes <strong>Veterans</strong>: spare gold buys +25% health and damage for new units.',
  ],
  tips: [
    '<strong>Evolve the moment you can.</strong> A unit from the next era beats several from the previous one. Evolving also heals part of your base. Only delay it if a big rival push is about to hit your base and you need the gold for troops.',
    '<strong>Melee in front, ranged behind.</strong> Units queue up behind each other, so a wall of cheap melee fighters protects your ranged units. Those can fire over them, and they are the only units besides turrets that can hit flyers.',
    '<strong>Answer flyers with ranged units.</strong> When the rival sends flyers, your melee and heavy units can’t touch them. Two or three ranged units, or a turret, clear them up.',
    '<strong>Save the special for a big clump.</strong> It covers a long stretch of ground just ahead of your front line. Fired into a crowded rival push, it can wipe out a whole wave and swing the fight.',
    '<strong>Turrets are insurance.</strong> They fire at anything that reaches your base, flyers included. Upgrade them after each evolution, because an old-era turret barely scratches new-era units.',
    '<strong>Easy for learning, Hard for records.</strong> On Hard the rival earns 30% more gold and evolves within seconds of being ready. Your fastest win on each difficulty is saved.',
  ],
  sections: [
    {
      id: 'about-army-of-eras',
      h2: 'About the original Army of Ages',
      html: `<p>The game was made by <strong>Louissi</strong>, the developer behind the 2007 Flash game <em>Age of War</em>, and appeared on <strong>Armor Games</strong> in June 2011. It kept the core of that earlier game: two bases face each other across a side-scrolling lane, troops walk toward the enemy and fight automatically, and experience lets you evolve to the next era. The Armor Games description promises control over more than 50 units and turrets.</p>
<p>It added a lot on top. A review on Jay is Games describes a Stone Age clan fighting <strong>alien insectoids</strong> while evolving through five eras. Money came from kills and from water carriers who fetched water from three wells. Units came out of buildings with their own spawn timers and a unit cap. Experience paid both for evolving and for magic attacks. The review also notes that evolving clears your existing units and buildings, and that a full game takes about half an hour. On Armor Games you scroll the battlefield with the arrow keys.</p>`,
    },
    {
      id: 'what-army-of-eras-added',
      h2: 'What the 2011 game added to the Age of War idea',
      html: `<ul>
<li><strong>An alien enemy.</strong> Your evolving tribe faces an alien force rather than a mirror-image human army.</li>
<li><strong>An economy to protect.</strong> Water carriers bring in money from three wells, so the lane is not the only thing worth defending.</li>
<li><strong>Buildings instead of a single button.</strong> Units come from buildings with spawn timers and a unit cap, closer to a light real-time strategy game.</li>
<li><strong>More choice per era.</strong> More than 50 units and turrets in total, plus magic attacks paid for with experience.</li>
</ul>
<p>Epoch Siege sits closer to the simpler side of that family. It has one lane, one training queue, two turret slots and one special attack per era, so a full battle takes roughly a quarter of an hour.</p>`,
    },
    {
      id: 'epoch-siege-eras',
      h2: 'The five eras in Epoch Siege',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col">Age</th><th scope="col">Units (melee · ranged · heavy · flyer)</th><th scope="col">Turret</th><th scope="col">Special</th></tr></thead><tbody>
<tr><td><strong>Stone</strong></td><td>Club Brute · Sling Thrower · Mammoth Rider · Leaf Glider</td><td>Rock Dropper</td><td>Meteor Shower</td></tr>
<tr><td><strong>Medieval</strong></td><td>Swordsman · Crossbowman · Lance Knight · War Kite</td><td>Ballista</td><td>Arrow Volley</td></tr>
<tr><td><strong>Gunpowder</strong></td><td>Saber Fencer · Musketeer · Cannon Cart · Bomb Balloon</td><td>Fort Cannon</td><td>Cannon Barrage</td></tr>
<tr><td><strong>Modern</strong></td><td>Shield Trooper · Rifleman · Battle Tank · Gyrocopter</td><td>Flak Gun</td><td>Air Strike</td></tr>
<tr><td><strong>Future</strong></td><td>Plasma Blade · Laser Ranger · Mech Walker · Hover Drone</td><td>Ion Cannon</td><td>Orbital Laser</td></tr>
</tbody></table></div>
<p>Evolving needs 800, 3,000, 9,000 and 24,000 total XP. Unit prices roughly double each era, but health and damage grow even faster, so staying behind is never cheaper in the long run.</p>`,
    },
    {
      id: 'lane-battle-strategy',
      h2: 'Lane battle strategy that works in both games',
      html: `<p>Games in this family reward the same three habits. First, <strong>tempo</strong>: the side that evolves first gets a window where its troops outclass everything on the field, so push hard in that window. Second, <strong>composition</strong>: cheap fighters in front and damage behind beats a pile of expensive units arriving one at a time. Third, <strong>defense at the right moment</strong>: turrets and specials are best spent breaking a push that has already reached your base, because the enemy units there are far from their support. If a battle stalls in the final era, look for whatever turns spare gold into power. In Epoch Siege that is Veterans; in the original it was its wider choice of units and magic.</p>`,
    },
  ],
  faq: [
    {
      q: 'Who made Army of Ages?',
      a: 'It was developed by Louissi, the creator of Age of War, and published on Armor Games in June 2011 as a Flash game. igame9 is not affiliated with Louissi or Armor Games; Epoch Siege on this page is our own original game.',
    },
    {
      q: 'Can I still play the original online?',
      a: 'Armor Games still hosts the original on its game page. If it won’t load where you are, Epoch Siege on this page is a free HTML5 lane battle in the same style that runs in any modern browser.',
    },
    {
      q: 'How many eras does the original game have?',
      a: 'Five. You start in the Stone Age and evolve upward by earning experience. Epoch Siege also has five eras: Stone, Medieval, Gunpowder, Modern and Future.',
    },
    {
      q: 'Is Army of Ages the same as Age of War?',
      a: 'No. They share a developer and the evolve-through-the-eras idea, but the 2011 game adds an alien enemy, an economy with water carriers and wells, unit buildings with spawn timers and XP-powered magic attacks.',
    },
    {
      q: 'How do I beat the Hard rival in Epoch Siege?',
      a: 'Evolve as soon as the button lights up, keep a wall of melee units in front of your ranged ones, and keep the special for the rival’s biggest push. Upgrade turrets after every evolution, and in the Future Age spend spare gold on Veterans.',
    },
    {
      q: 'Does Epoch Siege work on a phone?',
      a: 'Yes. Every action has a large button, you drag to scroll the battlefield, and the map strip under the top bar jumps the camera. Landscape gives you the widest view of the lane.',
    },
  ],
  related: ['bloons-td-unblocked', 'bloons-td-5-unblocked', 'war-mahjong', 'crazy-shooters', 'idleon-gaming', 'stickman-unblocked'],
};
