// Global site settings. Change `url` before deploying to another domain.
export const site = {
  name: 'igame9',
  url: 'https://igame9.ai',
  locale: 'en_US',
  lang: 'en',
  tagline: 'Free browser games — no download, no login',
  description:
    'Play free online games on igame9: idle tycoons, drifting, temple runners, mahjong, merge and physics puzzles. No download or login, on desktop or mobile.',
  themeColor: '#0b0d17',
};

// Category order here is the order used on the hub page.
export const categories = {
  idle: {
    name: 'Idle & Tycoon',
    h2: 'Idle & tycoon games',
    short: 'Idle',
    icon: '💰',
    blurb:
      'Incremental games where numbers keep climbing while you are away. Build a startup, level a party of heroes or spin orbits for exponential score.',
  },
  racing: {
    name: 'Racing & Drifting',
    h2: 'Racing & drifting games',
    short: 'Racing',
    icon: '🏎️',
    blurb:
      'Car games built around timing and throttle control — one-tap cliff drifting, tandem drift scoring and two-player split-keyboard races.',
  },
  runner: {
    name: 'Endless Runners',
    h2: 'Endless runner games',
    short: 'Runner',
    icon: '🏃',
    blurb:
      'Swipe, jump and slide through temples, emerald roads and gravity-flipping space tunnels. Every run is a new high-score attempt.',
  },
  puzzle: {
    name: 'Puzzle & Merge',
    h2: 'Puzzle & merge games',
    short: 'Puzzle',
    icon: '🧩',
    blurb:
      'Brain games for short breaks: two-layer mahjong, element crafting, dragon merging and draw-a-line physics puzzles.',
  },
  action: {
    name: 'Action & Sports',
    h2: 'Action & sports games',
    short: 'Action',
    icon: '🎯',
    blurb:
      'Fast reflex games — arena first-person shooting against bots and rhythm-tapping 100 m sprints.',
  },
};
