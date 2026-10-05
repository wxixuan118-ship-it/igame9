export default {
  slug: 'idle-startup-tycoon-github',
  keyword: 'Idle Startup Tycoon GitHub',
  volume: 260,
  kd: 9,
  category: 'idle',
  engine: 'startup-idle',
  variant: 'github',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Garage to Unicorn: Dev Build',
    hint: 'Space to commit code · 1–5 switch tabs · export your save in config',
    saves: 'Autosaves in your browser; export/import your save as a text string',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Commit code (earn cash)', keyboard: ['Space', 'C'], mouse: 'Click the office scene', touch: 'Tap the office scene' },
      { action: 'Jump to team / roadmap / office / equity / config', keyboard: ['1–5'], mouse: 'Click a tab', touch: 'Tap a tab' },
      { action: 'Cycle buy amount ×1 / ×10 / ×25 / Max', keyboard: ['B'], mouse: 'Click the switch', touch: 'Tap the switch' },
      { action: 'Buy the maximum once', keyboard: ['Shift', 'Ctrl'], mouse: 'Hold Shift or Ctrl and click Hire', touch: 'Select Max, then tap Hire' },
      { action: 'Grab a Trending bubble', keyboard: ['V'], mouse: 'Click the bubble', touch: 'Tap the bubble' },
      { action: 'Export or import a save', keyboard: '—', mouse: 'config → Copy to clipboard / Load save', touch: 'config → Copy to clipboard / Load save' },
    ],
  },
  seo: {
    title: 'Idle Startup Tycoon GitHub — Free Version With Save Export',
    description:
      'Idle Startup Tycoon GitHub copies explained: what the github.io versions are, how to stay safe, and a free startup idle game with save export/import.',
    h1: 'Idle Startup Tycoon GitHub',
    lede: 'What the Idle Startup Tycoon GitHub copies are, how to judge them — and a free dev-mode startup idler with portable saves.',
    card: 'Dev-mode startup idle + saves',
    updated: '2026-10-02',
  },
  original: {
    source: { url: 'https://www.marketjs.com/', label: 'MarketJS, the developer' },
    name: 'Idle Startup Tycoon',
    developer: 'MarketJS',
    released: '2021 (HTML5 web game)',
    genre: 'Idle tycoon / incremental clicker',
    platforms: 'Web browser (licensed to game portals)',
  },
  intro: [
    '<p>Search for <strong>Idle Startup Tycoon GitHub</strong> and you get a long list of <code>github.io</code> pages that host copies of the startup idle game. People look for them for a few reasons: a version without a big portal around it, a page that loads on a restricted network, or simply a link a friend shared. This guide explains what those pages are, what to watch out for, and how saves work across different copies.</p>',
    '<p>You can also play <em>Garage to Unicorn: Dev Build</em> right here. It is igame9’s own free startup idle game, not a copy of the original. It has a dark code-editor look, a live commit log, keyboard shortcuts for every tab, and a feature most copies don’t have: you can <strong>export your save as a text string and import it on another device</strong>.</p>',
  ],
  howToPlay: [
    'Press <strong>$ npm start</strong>, then click the office or press <kbd>Space</kbd> or <kbd>C</kbd> to commit code. Each commit earns cash, the terminal in the corner logs your work, and every 25 commits tags a release that pays a bonus.',
    'Open <strong>team</strong> (<kbd>1</kbd>) and hire Interns, then Junior and Senior Devs and seven more roles. Staff earn every second, and each role doubles its output at 10, 25, 50, 100 and 200 hires.',
    'Open <strong>roadmap</strong> (<kbd>2</kbd>) to ship one-time features: ×2 for a role, faster taps, taps that earn a share of revenue per second, or a boost to all revenue.',
    'Open <strong>office</strong> (<kbd>3</kbd>) to move from the garage to a loft, an office, a campus, a skyscraper and finally IPO Day. Every move multiplies all revenue.',
    'Once a run has earned $10M, open <strong>equity</strong> (<kbd>4</kbd>) and sell the company. You restart with a new startup but keep Equity ★, worth +10% revenue each, plus investor perks.',
    'Open <strong>config</strong> (<kbd>5</kbd>) for stats, the build number, <em>Export save</em>, <em>Import save</em> and a confirmed <em>Reset progress</em>.',
  ],
  tips: [
    '<strong>Export after every exit.</strong> Copy the save string from config and keep it in a notes app or email draft. If your browser data is wiped, Import save brings the company back in seconds.',
    '<strong>Move between devices with the string.</strong> Browser saves stay on one device. Export on your laptop, paste the string into Import save on your phone, and keep playing from the same point.',
    '<strong>Export before importing.</strong> Loading a save replaces your current company after a confirmation, so back up the one you have first.',
    '<strong>Play keyboard-only.</strong> <kbd>Space</kbd> commits, <kbd>1</kbd>–<kbd>5</kbd> jump between tabs, <kbd>B</kbd> cycles ×1/×10/×25/Max and <kbd>V</kbd> grabs a Trending bubble for ×3 revenue.',
    '<strong>Close the tab without worry.</strong> The game uses real elapsed time, so your team keeps earning at 50% speed for up to 8 hours (100% after 40★).',
    '<strong>Sell when growth stalls, not at $10M.</strong> Equity is 3 × the cube root of run earnings in millions: $10M gives 6★, but $1B gives 30★.',
  ],
  sections: [
    {
      id: 'why-github',
      h2: 'Why people search for Idle Startup Tycoon on GitHub',
      html: `<p>Idle Startup Tycoon is an HTML5 game by <strong>MarketJS</strong>, which licenses its games to web portals. Because an HTML5 game is just a folder of HTML, JavaScript and images, anyone with a copy of those files can put them on a free static host. GitHub Pages is the most popular free host, so dozens of repositories now serve the game at addresses ending in <code>github.io</code>, often with words like “unblocked” in the name.</p>
<p>“Unblocked” simply means a page that loads where the big game portals don’t, for example on a network that filters well-known gaming sites. These pages are run by individuals, not by the developer. We found no official MarketJS repository for Idle Startup Tycoon and nothing suggesting the game is open source, so treat the GitHub copies as unofficial re-uploads.</p>`,
    },
    {
      id: 'what-is-github-pages',
      h2: 'What GitHub Pages (github.io) actually is',
      html: `<p>GitHub is a platform where developers store code in repositories. <strong>GitHub Pages</strong> is its free feature for publishing a website directly from a repository: whatever HTML, CSS and JavaScript files are in the repo are served at <code>username.github.io</code> or <code>username.github.io/project</code>. There is no server-side code, which makes it ideal for portfolios, documentation and small browser games.</p>
<p>That also explains the limits. GitHub hosts the files but does not review every game copy, so the person who uploaded a repository decides what is in it. The page may be an unchanged copy, an old version, or a version with extra scripts added. GitHub’s name in the address tells you who hosts the files, not who made the game.</p>`,
    },
    {
      id: 'mirror-safety',
      h2: 'Are GitHub mirrors safe? A quick checklist',
      html: `<ul>
<li><strong>Never download anything.</strong> A browser game runs in the tab. A page that asks you to install a file, an app or a browser extension is a red flag.</li>
<li><strong>Don’t type passwords or personal details.</strong> No idle game needs your school, Google or email login.</li>
<li><strong>Block notification and pop-up prompts.</strong> Some copies wrap the game in ad scripts that redirect or ask to send notifications; decline and close the tab.</li>
<li><strong>Expect saves to be fragile.</strong> Browser saves belong to one website address. Progress on one mirror never carries over to another, and if the repository is deleted, the page and your save’s home go with it.</li>
<li><strong>Prefer the official portals</strong> for the original game, and check the address bar so you know which site you are actually on.</li>
</ul>`,
    },
    {
      id: 'export-import-saves',
      h2: 'Portable saves: how export and import work here',
      html: `<p>Garage to Unicorn: Dev Build stores your company in this browser and autosaves every five seconds. In the <strong>config</strong> tab, <em>Export save</em> shows your whole company — cash, staff, features, office, Equity and stats — as one text string starting with <code>G2U1:</code>. <em>Copy to clipboard</em> copies it. On another device, paste it into <em>Import save</em> and press <em>Load save</em>; after a confirmation the company appears there exactly as you left it.</p>
<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Random github.io copy</th><th scope="col">Garage to Unicorn: Dev Build</th></tr></thead><tbody>
<tr><td><strong>Who runs it</strong></td><td>Whoever uploaded the repository</td><td>igame9 (original game)</td></tr>
<tr><td><strong>Saves</strong></td><td>Tied to that one address</td><td>Autosave plus export/import string</td></tr>
<tr><td><strong>Offline earnings</strong></td><td>Depends on the copy</td><td>Up to 8 h, shown on return</td></tr>
<tr><td><strong>Version info</strong></td><td>Usually none</td><td>Build line in the corner and in config</td></tr>
<tr><td><strong>Downloads or sign-in</strong></td><td>Varies</td><td>None</td></tr>
</tbody></table></div>`,
    },
  ],
  faq: [
    {
      q: 'Is there an official Idle Startup Tycoon GitHub repository?',
      a: 'We could not find one. MarketJS licenses Idle Startup Tycoon to game portals, and the github.io versions are uploaded by other people. igame9 is not affiliated with MarketJS; the game on this page is igame9’s own original startup idle game.',
    },
    {
      q: 'Is Idle Startup Tycoon open source?',
      a: 'Nothing we found shows that it is. It is a commercial HTML5 game that MarketJS offers to websites under license, so a copy on GitHub does not make it open source.',
    },
    {
      q: 'What does “unblocked” mean for this game?',
      a: 'It describes a copy hosted somewhere that loads on networks which filter large game portals. Garage to Unicorn is a lightweight page with no downloads that runs in any modern browser, including Chromebooks; always follow your school’s or workplace’s rules about games.',
    },
    {
      q: 'Will my progress from a github.io copy carry over?',
      a: 'No. Browser saves are stored per website, and Garage to Unicorn is a different game. Within this game you can carry progress between browsers with the export/import save string.',
    },
    {
      q: 'How do I move my save to another computer?',
      a: 'Open the config tab, press Copy to clipboard under Export save, and send the string to yourself. On the other device, open this page, paste it into Import save, press Load save and confirm.',
    },
    {
      q: 'Is Garage to Unicorn: Dev Build free?',
      a: 'Yes. It is free and needs no account or download. When you come back after closing it, it pays out what your team earned while you were away, for up to 8 hours.',
    },
  ],
  related: ['idle-startup-tycoon', 'revolution-idle', 'idle-guy', 'idleon-gaming', 'brain-lines-unblocked', 'temple-run-unblocked-66'],
};
