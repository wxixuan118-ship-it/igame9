export default {
  slug: 'zelda-heardle',
  keyword: 'Zelda Heardle',
  volume: 0,
  kd: 0,
  category: 'puzzle',
  engine: 'tune-guess',
  variant: 'default',
  embedUrl: '',
  embedCredit: '',
  game: {
    title: 'Clipsody',
    hint: 'Press ▶, then guess the tune or skip for a longer clip',
    saves: 'Daily progress, streaks and stats saved in your browser',
    playMode: 'SinglePlayer',
    controls: [
      { action: 'Play / stop the clip', keyboard: ['Space'], mouse: 'Click ▶ or the progress bar', touch: 'Tap ▶ or the progress bar' },
      { action: 'Search for a tune', keyboard: 'Start typing (Enter focuses the box)', mouse: 'Click the search box', touch: 'Tap the search box' },
      { action: 'Choose a suggestion', keyboard: ['↑', '↓', 'Enter'], mouse: 'Click it', touch: 'Tap it' },
      { action: 'Submit the guess', keyboard: ['Enter'], mouse: 'Click Submit', touch: 'Tap Submit' },
      { action: 'Skip to a longer clip', keyboard: 'Tab to Skip, then Enter', mouse: 'Click Skip', touch: 'Tap Skip' },
    ],
  },
  seo: {
    title: 'Zelda Heardle — How It Works + Free Daily Tune Game | igame9',
    description:
      'Zelda Heardle explained: the fan-made daily Zelda music quiz, how its six clips work, tips, and a free Heardle-style tune game with public-domain classics.',
    h1: 'Zelda Heardle',
    lede: 'Name the tune from a one-second clip, in six tries or fewer.',
    card: 'Daily guess-the-tune game',
    updated: '2026-10-03',
  },
  original: {
    source: { url: 'https://zeldaheardle.com/', label: 'Zelda Heardle, the fan site' },
    name: 'Zelda Heardle',
    developer: 'Independent fan project',
    released: '2022 (web)',
    genre: 'Daily music guessing game',
    platforms: 'Web browser — desktop and mobile',
  },
  disclaimer:
    'The Legend of Zelda and its music are trademarks and copyrights of Nintendo. Zelda Heardle is an independent fan project, and Heardle was a game by Omakase Studios later owned by Spotify. igame9 is not affiliated with or endorsed by any of them. The playable game on this page, <em>Clipsody</em>, is an original game made for igame9. It plays only public-domain melodies, transcribed and synthesised by us; no Nintendo music is used.',
  intro: [
    '<p><strong>Zelda Heardle</strong> is a fan-made daily music quiz for <em>Legend of Zelda</em> fans. Each day it picks one track from the series and plays you the first second. You type your guess, or skip, and every miss unlocks a longer piece of the song. You get six tries before the answer is revealed, then a grid of coloured squares to share with friends.</p>',
    '<p>The soundtrack belongs to Nintendo, so we can’t play it here. Instead, this page has <em>Clipsody</em>, igame9’s own Heardle-style game built on the same idea with music anyone may use: 50 public-domain classics and folk tunes, from Beethoven and Mozart to Greensleeves and Sakura. Every melody is transcribed by hand and played by a small synthesiser in your browser. It has a shared Daily tune, unlimited Practice, streaks and a shareable result.</p>',
  ],
  howToPlay: [
    'Press the round <strong>▶ button</strong> (or <kbd>Space</kbd>) to hear the first second of today’s tune. Listen as often as you like.',
    'Start typing a title or composer in the search box. Pick a match from the list with a click, a tap or <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>Enter</kbd>, then press <strong>Submit</strong>.',
    'Not sure? Press <strong>Skip</strong>. Each skip or wrong guess unlocks a longer clip: 1, 2, 4, 7, 11 and finally 16 seconds.',
    'Read the colours: red is wrong, amber means the right composer but a different piece, grey is a skip and green is correct.',
    'After six tries, or as soon as you’re right, the full tune plays and you can copy your emoji result. <strong>Daily</strong> is the same tune for everyone on a date; <strong>Practice</strong> deals out new tunes without limit.',
  ],
  tips: [
    '<strong>Listen to the rhythm, not just the notes.</strong> In one second you hear three or four notes at most. Short-short-short-long is a giveaway, and so is a waltz lilt.',
    '<strong>Use the amber hint.</strong> If a guess turns amber you know the composer, so try that composer’s other pieces next. Beethoven, Mozart, Bach, Grieg and Bizet each have several tunes in the list.',
    '<strong>Skip early on hard days.</strong> A skip costs one try, the same as a wrong guess, but it never misleads you. Two quick skips get you to a four-second clip.',
    '<strong>Hum it back.</strong> Replay the clip and hum along. The melody often “finishes itself” in your head before the clip does.',
    '<strong>Search by composer.</strong> Typing “strauss” or “traditional” lists every match, which helps when the title is on the tip of your tongue.',
    '<strong>Practice keeps your streak safe.</strong> Practice rounds have their own stats, so you can warm up before the Daily without touching your Daily streak.',
  ],
  sections: [
    {
      id: 'what-is-zelda-heardle',
      h2: 'What is Zelda Heardle?',
      html: `<p>It is one of many fan spin-offs of <strong>Heardle</strong>, the daily song game London-based Omakase Studios launched in February 2022, inspired by Wordle. Heardle played six snippets of a pop song growing from 1 to 16 seconds. Spotify bought it in July 2022 and shut it down in 2023, but the format lived on in fan versions for movies, anime and game music.</p>
<p>The Zelda edition swaps chart hits for music from <em>The Legend of Zelda</em>. An early version ran on Glitch, and Zelda Dungeon covered it in May 2022. It now lives at its own domain, zeldaheardle.com, with a <strong>Daily</strong> mode and an <strong>Infinite</strong> mode for unlimited rounds. Its track list covers the whole series, from the classic overworld themes to recent releases. It is an unofficial fan project, not a Nintendo product.</p>`,
    },
    {
      id: 'how-zelda-heardle-scoring-works',
      h2: 'How Zelda Heardle clips and scoring work',
      html: `<p>The format is the same in the Zelda version, the original Heardle and Clipsody: one clip, six chances, longer audio after every miss.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Try</th><th scope="col">Clip length</th><th scope="col">What usually gives it away</th></tr></thead><tbody>
<tr><td>1</td><td>1 second</td><td>The first interval and the speed</td></tr>
<tr><td>2</td><td>2 seconds</td><td>The rhythm of the opening phrase</td></tr>
<tr><td>3</td><td>4 seconds</td><td>The first full phrase</td></tr>
<tr><td>4</td><td>7 seconds</td><td>Where the melody turns or repeats</td></tr>
<tr><td>5</td><td>11 seconds</td><td>The answering phrase</td></tr>
<tr><td>6</td><td>16 seconds</td><td>Almost the whole theme</td></tr>
</tbody></table></div>
<p>Your result becomes a row of squares you can paste anywhere without spoiling the answer. Fewer squares before the green one means a better score, and keeping the streak alive day after day is half the fun.</p>`,
    },
    {
      id: 'why-public-domain',
      h2: 'Why our Zelda Heardle alternative uses classics',
      html: `<p>Zelda music is composed and owned by Nintendo, and a melody is protected by copyright even when someone re-plays it on a different instrument. A free site playing those themes, even as short clips, would be using music it has no licence for. So <em>Clipsody</em> plays only pieces whose composers died long ago, or traditional tunes with no single author. Everyone is free to perform those.</p>
<p>We wrote each melody out note by note and play it live with WebAudio. Nothing is a recording, and the page loads no audio files at all. The list includes Beethoven’s <em>Ode to Joy</em>, Grieg’s <em>In the Hall of the Mountain King</em>, Rossini’s <em>William Tell</em> galop, Joplin’s <em>The Entertainer</em>, Bizet’s <em>Habanera</em> and folk songs like <em>Scarborough Fair</em>. The Daily order is shuffled so all 50 come round before any repeats.</p>`,
    },
    {
      id: 'clipsody-vs-zelda-heardle',
      h2: 'Clipsody vs. Zelda Heardle',
      html: `<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">The fan site</th><th scope="col">Clipsody (this page)</th></tr></thead><tbody>
<tr><td><strong>Music</strong></td><td>Tracks from The Legend of Zelda series</td><td>50 public-domain classical pieces and folk tunes</td></tr>
<tr><td><strong>Sound</strong></td><td>Soundtrack audio</td><td>Melodies synthesised live in the browser</td></tr>
<tr><td><strong>Modes</strong></td><td>Daily and Infinite</td><td>Daily and Practice</td></tr>
<tr><td><strong>Tries and clips</strong></td><td>6 tries, clip grows after each miss</td><td>6 tries, 1–2–4–7–11–16 seconds</td></tr>
<tr><td><strong>Extra hint</strong></td><td>None</td><td>Amber square when you name the right composer</td></tr>
<tr><td><strong>Stats</strong></td><td>Shareable result</td><td>Emoji share, win %, streaks and a guess chart saved on your device</td></tr>
</tbody></table></div>`,
    },
  ],
  faq: [
    {
      q: 'Who made Zelda Heardle?',
      a: 'It is an independent fan project with its own site and social accounts. It is not made or endorsed by Nintendo, and igame9 has no connection to it.',
    },
    {
      q: 'Why doesn’t this page play Zelda music?',
      a: 'The Legend of Zelda soundtrack is copyrighted by Nintendo, and even a re-played melody is covered. Clipsody uses only public-domain classics and traditional tunes that anyone may perform.',
    },
    {
      q: 'Is the daily tune the same for everyone?',
      a: 'Yes. The Daily puzzle is chosen from the date, so everyone playing on the same day gets the same tune. A new one starts at midnight your local time.',
    },
    {
      q: 'What does an amber square mean?',
      a: 'You named a piece by the right composer, but not the right piece. Traditional songs have no composer, so they never turn amber.',
    },
    {
      q: 'Are my streak and stats saved?',
      a: 'Your Daily progress, Practice round, streaks and guess chart are saved in this browser’s local storage. Clearing site data or browsing privately resets them.',
    },
    {
      q: 'Why can’t I hear anything?',
      a: 'Check that the speaker button under the game is on and your device isn’t muted, then press ▶. On iPhone, the ring/silent switch can also silence web audio.',
    },
  ],
  related: ['brain-lines', 'war-mahjong', 'drag-to-combine', 'merge-dragons', 'brain-lines-unblocked', 'tralalero-tralala-clicker'],
};
