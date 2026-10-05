/*!
 * Clipsody — igame9 original "guess the tune from a clip" daily game (Heardle-style).
 *
 * Every melody here is a public-domain classical piece or traditional folk tune,
 * transcribed by hand into note lists and synthesised live with WebAudio. No recordings,
 * no copyrighted music. Hear a 1-second clip, guess or skip; each miss unlocks a longer
 * clip (1, 2, 4, 7, 11, 16 s). One shared Daily tune per date plus unlimited Practice.
 */
(function () {
  'use strict';

  var CLIPS = [1, 2, 4, 7, 11, 16];
  var MAX_LEN = 16;
  var EPOCH = Date.UTC(2026, 9, 3); // Daily #1 = 3 Oct 2026
  var SAVE_VER = 1;

  // [id, title, composer, info, bpm, notes, aliases]
  // notes: "NOTE:beats" (beats default 1), R = rest. Octave 4 = middle C.
  var TUNES = [
    ['ode', 'Ode to Joy', 'Ludwig van Beethoven', 'Symphony No. 9, finale (1824)', 120,
      'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2 D4 D4 E4 C4 D4 E4:.5 F4:.5 E4 C4 D4 E4:.5 F4:.5 E4 D4 C4 D4 G3:2', 'symphony 9'],
    ['elise', 'Für Elise', 'Ludwig van Beethoven', 'Bagatelle in A minor, WoO 59 (1810)', 100,
      'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 G#4:.5 B4:.5 C5:1.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 C5:.5 B4:.5 A4:2', 'fur elise bagatelle'],
    ['fifth', 'Symphony No. 5 (opening)', 'Ludwig van Beethoven', 'Symphony No. 5 in C minor (1808)', 108,
      'G4:.5 G4:.5 G4:.5 Eb4:3 R:.5 F4:.5 F4:.5 F4:.5 D4:3 R:.5 G4:.5 G4:.5 G4:.5 Eb4:.5 Ab4:.5 Ab4:.5 Ab4:.5 G4:.5 Eb5:.5 Eb5:.5 Eb5:.5 C5:2 R:.5 G4:.5 G4:.5 G4:.5 D4:.5 Ab4:.5 Ab4:.5 Ab4:.5 G4:.5 F5:.5 F5:.5 F5:.5 D5:2', 'fifth symphony 5th'],
    ['moon', 'Moonlight Sonata', 'Ludwig van Beethoven', 'Piano Sonata No. 14, first movement (1801)', 56, 'MOON', 'sonata 14 quasi una fantasia'],
    ['nacht', 'Eine kleine Nachtmusik', 'Wolfgang Amadeus Mozart', 'Serenade No. 13, K. 525 (1787)', 132,
      'G4 R:.5 D4:.5 G4 R:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5 R:.5 A4:.5 C5 R:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:2 G4 R:.5 D4:.5 G4 R:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5 R:.5 A4:.5 C5 R:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 G4:2', 'serenade little night music'],
    ['turca', 'Rondo alla Turca', 'Wolfgang Amadeus Mozart', 'Piano Sonata No. 11, K. 331 (1783)', 120,
      'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:2 A5:.5 C6:.5 B5:.5 A5:.5 G5:.5 A5:.5 B5:.5 A5:.5 G5:.5 A5:.5 B5:.5 A5:.5 G5:.5 F#5:.5 E5:1', 'turkish march'],
    ['sym40', 'Symphony No. 40', 'Wolfgang Amadeus Mozart', 'Symphony No. 40 in G minor, K. 550 (1788)', 112,
      'Eb5:.5 D5:.5 D5 Eb5:.5 D5:.5 D5 Eb5:.5 D5:.5 D5 Bb5:2 Bb5:.5 A5:.5 G5 G5:.5 F5:.5 Eb5 Eb5:.5 D5:.5 C5 C5:2 D5:.5 C5:.5 C5 D5:.5 C5:.5 C5 D5:.5 C5:.5 C5 A5:2 A5:.5 G5:.5 F#5 F#5:.5 Eb5:.5 D5 D5:.5 C5:.5 Bb4 Bb4:2', 'g minor'],
    ['minuet', 'Minuet in G', 'Christian Petzold (long attributed to J. S. Bach)', 'Notebook for Anna Magdalena Bach (c. 1725)', 140,
      'D5 G4:.5 A4:.5 B4:.5 C5:.5 D5 G4 G4 E5 C5:.5 D5:.5 E5:.5 F#5:.5 G5 G4 G4 C5 D5:.5 C5:.5 B4:.5 A4:.5 B4 C5:.5 B4:.5 A4:.5 G4:.5 F#4 G4:.5 A4:.5 B4:.5 G4:.5 A4:3', 'bach minuet anna magdalena'],
    ['toccata', 'Toccata and Fugue in D minor', 'Johann Sebastian Bach', 'BWV 565, organ (early 18th century)', 60,
      'A5:.2 G5:.2 A5:2 G5:.2 F5:.2 E5:.2 D5:.2 C#5:1 D5:2 R:1 A4:.2 G4:.2 A4:2 E4:.5 F4:.5 C#4:.5 D4:2 R:1 A3:.2 G3:.2 A3:2 G3:.2 F3:.2 E3:.2 D3:.2 C#3:1 D3:3', 'bwv 565 organ'],
    ['jesu', 'Jesu, Joy of Man’s Desiring', 'Johann Sebastian Bach', 'Cantata BWV 147 (1723)', 96, 'JESU', 'jesus joy cantata 147'],
    ['prelude', 'Prelude in C major', 'Johann Sebastian Bach', 'The Well-Tempered Clavier, Book I (1722)', 66, 'PRELUDE', 'well tempered clavier bwv 846'],
    ['mountain', 'In the Hall of the Mountain King', 'Edvard Grieg', 'Peer Gynt (1875)', 150,
      'A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4 D#4:.5 B3:.5 D#4 D4:.5 Bb3:.5 D4 A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4:.5 A4:.5 G4:.5 E4:.5 C4:.5 E4:.5 G4:2 E4:.5 F#4:.5 G#4:.5 A4:.5 B4:.5 G#4:.5 B4 C5:.5 G#4:.5 C5 B4:.5 G#4:.5 B4 E4:.5 F#4:.5 G#4:.5 A4:.5 B4:.5 G#4:.5 B4:.5 E5:.5 D5:.5 B4:.5 G#4:.5 B4:.5 D5:2', 'peer gynt hall mountain'],
    ['morning', 'Morning Mood', 'Edvard Grieg', 'Peer Gynt (1875)', 70,
      'G4:.5 E4:.5 D4:.5 C4:.5 D4:.5 E4:.5 G4:.5 E4:.5 D4:.5 C4:.5 D4:.25 E4:.25 D4:.5 E4:.5 G4:.5 E4:.5 G4:.5 A4:.5 E4:.5 A4:.5 G4:.5 E4:.5 D4:.5 C4:1.5 R:.5 G4:.5 E4:.5 D4:.5 C4:.5 D4:.5 E4:.5 G4:.5 E4:.5 D4:.5 C4:.5 D4:.25 E4:.25 D4:.5 E4:.5 G4:.5 E4:.5 G4:.5 A4:.5 E4:.5 A4:.5 G4:.5 E4:.5 D4:.5 C4:1.5', 'morning peer gynt'],
    ['swan', 'Swan Lake (main theme)', 'Pyotr Ilyich Tchaikovsky', 'Swan Lake ballet (1876)', 72,
      'F#4:3 B3:.5 C#4:.5 D4:.5 E4:.5 F#4:1.5 D4:.5 F#4:1.5 D4:.5 F#4:1.5 B3:.5 D4:.5 B3:.5 G3:.5 D4:.5 B3:3 R:1 F#4:3 B3:.5 C#4:.5 D4:.5 E4:.5 F#4:1.5 D4:.5 F#4:1.5 D4:.5 F#4:1.5 B3:.5 D4:.5 B3:.5 G3:.5 D4:.5 B3:3', 'ballet tchaikovsky swan'],
    ['spring', 'Spring (The Four Seasons)', 'Antonio Vivaldi', 'Violin Concerto in E major, RV 269 (1725)', 100,
      'E4 G#4:.5 G#4:.5 G#4:.5 F#4:.25 E4:.25 B4:1.5 B4:.25 A4:.25 G#4:.5 G#4:.5 G#4:.5 F#4:.25 E4:.25 B4:1.5 B4:.25 A4:.25 G#4:.5 A4:.5 B4:.5 A4:.5 G#4 F#4 E4 G#4:.5 G#4:.5 G#4:.5 F#4:.25 E4:.25 B4:1.5 B4:.25 A4:.25 G#4:.5 G#4:.5 G#4:.5 F#4:.25 E4:.25 B4:1.5 B4:.25 A4:.25 G#4:.5 A4:.5 B4:.5 A4:.5 G#4 F#4', 'four seasons la primavera'],
    ['canon', 'Canon in D', 'Johann Pachelbel', 'Canon and Gigue in D (late 17th century)', 60,
      'F#5 E5 D5 C#5 B4 A4 B4 C#5 D5 C#5 B4 A4 G4 F#4 G4 E4 D4:.5 F#4:.5 A4:.5 G4:.5 F#4:.5 D4:.5 F#4:.5 E4:.5 D4:.5 B3:.5 D4:.5 A4:.5 G4:.5 B4:.5 A4:.5 G4:.5', 'pachelbel canon wedding'],
    ['brahms', 'Lullaby (Wiegenlied)', 'Johannes Brahms', 'Op. 49 No. 4 (1868)', 100,
      'E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5 B4:1.5 A4:.5 A4 G4 D4:.5 E4:.5 F4 D4 D4:.5 E4:.5 F4:2 D4:.5 F4:.5 B4:.5 A4:.5 G4 B4 C5:2', 'brahms lullaby cradle song'],
    ['danube', 'The Blue Danube', 'Johann Strauss II', 'Waltz, Op. 314 (1866)', 170,
      'D4 D4 F#4 A4 A4:2 A5 A5:2 F#5 F#5:2 D4 D4 F#4 A4 A4:2 A5 A5:2 G5 G5:2 C#4 C#4 E4 B4 B4:2 B5 B5:2 G5 G5:2 C#4 C#4 E4 B4 B4:2 B5 B5:2 F#5 F#5:2 D4 D4 F#4 A4 D5:2 D6 D6:2 A5 A5:2', 'danube waltz'],
    ['tell', 'William Tell Overture (finale)', 'Gioachino Rossini', 'Opera overture (1829)', 140,
      'E4:.25 E4:.25 E4:.5 E4:.25 E4:.25 E4:.5 E4:.25 E4:.25 A4:.5 B4:.5 C#5:.5 E4:.25 E4:.25 E4:.5 E4:.25 E4:.25 E4:.5 E4:.25 E4:.25 C#5:.5 A4:.5 C#5:.5 E4:.25 E4:.25 E4:.5 E4:.25 E4:.25 E4:.5 E4:.25 E4:.25 A4:.5 B4:.5 C#5:.5 A4:.5 C#5:.5 E5:1.5 E5:.5 C#5:.5 A4:1', 'lone ranger galop'],
    ['cancan', 'Can-Can (Galop infernal)', 'Jacques Offenbach', 'Orpheus in the Underworld (1858)', 150,
      'C4 D4:.5 F4:.5 E4:.5 D4:.5 G4 G4 G4:.5 A4:.5 E4:.5 F4:.5 D4 D4 D4:.5 F4:.5 E4:.5 D4:.5 C4:.5 C5:.5 B4:.5 A4:.5 G4:.5 F4:.5 E4:.5 D4:.5 C4 D4:.5 F4:.5 E4:.5 D4:.5 G4 G4 G4:.5 A4:.5 E4:.5 F4:.5 D4 D4 D4:.5 F4:.5 E4:.5 D4:.5 C4:.5 G4:.5 D4:.5 E4:.5 C4:2', 'can can orpheus'],
    ['habanera', 'Habanera', 'Georges Bizet', 'Carmen (1875)', 72,
      'D5:1.5 C#5:.5 C5 C5:.5 B4:.5 Bb4 A4 A4:.5 Ab4:.5 G4 F4:.5 F4:.5 E4:.5 Eb4:.5 D4:2 R:1 D5:1.5 C#5:.5 C5 C5:.5 B4:.5 Bb4 A4 A4:.5 Ab4:.5 G4 F4:.5 F4:.5 E4:.5 Eb4:.5 D4:2', 'carmen l amour est un oiseau rebelle'],
    ['toreador', 'Toreador Song', 'Georges Bizet', 'Carmen (1875)', 100,
      'C5 D5:.75 C5:.25 A4 A4 A4:.75 G4:.25 A4:.75 Bb4:.25 A4:2 Bb4 G4:.75 C5:.25 A4:2 F4 D4:.75 G4:.25 C4:2 R:1 C5 D5:.75 C5:.25 A4 A4 A4:.75 G4:.25 A4:.75 Bb4:.25 A4:2', 'carmen toreador en garde'],
    ['bridal', 'Bridal Chorus (“Here Comes the Bride”)', 'Richard Wagner', 'Lohengrin (1850)', 70,
      'C4 F4:.75 F4:.25 F4:2 C4 G4:.75 E4:.25 F4:2 C4 F4:.75 Bb4:.25 Bb4 A4:.75 G4:.25 F4:.75 E4:.25 F4:.75 G4:.25 C4:2 C4 F4:.75 F4:.25 F4:2 C4 G4:.75 E4:.25 F4:2', 'here comes the bride lohengrin wedding'],
    ['largo', 'Largo (“Goin’ Home”)', 'Antonín Dvořák', 'Symphony No. 9 “From the New World” (1893)', 60,
      'E4:1.5 G4:.5 G4:2 E4:1.5 D4:.5 C4:2 D4 E4 G4 E4 D4:3 R:1 E4:1.5 G4:.5 G4:2 E4:1.5 D4:.5 C4:2 D4 E4 D4 C4 C4:3', 'new world symphony goin home dvorak'],
    ['funeral', 'Funeral March', 'Frédéric Chopin', 'Piano Sonata No. 2, third movement (1839)', 60,
      'Bb3 Bb3:.75 Bb3:.25 Bb3 Db4:.75 C4:.25 C4:.75 Bb3:.25 Bb3:.75 A3:.25 Bb3:2 Bb3 Bb3:.75 Bb3:.25 Bb3 Db4:.75 C4:.25 C4:.75 Bb3:.25 Bb3:.75 A3:.25 Bb3:2', 'chopin sonata 2 marche funebre'],
    ['entertainer', 'The Entertainer', 'Scott Joplin', 'Ragtime for piano (1902)', 92,
      'D4:.25 D#4:.25 E4:.25 C5:.5 E4:.25 C5:.5 E4:.25 C5:1.25 C5:.25 D5:.25 D#5:.25 E5:.25 C5:.25 D5:.25 E5:.5 B4:.25 D5:.5 C5:1 D4:.25 D#4:.25 E4:.25 C5:.5 E4:.25 C5:.5 E4:.25 C5:1.25 A4:.25 G4:.25 F#4:.25 A4:.25 C5:.25 E5:.5 D5:.25 C5:.25 A4:.25 D5:1.5', 'ragtime joplin rag'],
    ['gymno', 'Gymnopédie No. 1', 'Erik Satie', 'Piano piece (1888)', 72,
      'F#5 A5 G5 F#5 C#5 B4 C#5 D5 A4:3 F#4:6 R:1 F#5 A5 G5 F#5 C#5 B4 C#5 D5 A4:3 F#4:6', 'satie gymnopedie'],
    ['surprise', 'Surprise Symphony', 'Joseph Haydn', 'Symphony No. 94, second movement (1791)', 100,
      'C4:.5 C4:.5 E4:.5 E4:.5 G4:.5 G4:.5 E4 F4:.5 F4:.5 D4:.5 D4:.5 B3:.5 B3:.5 G3 C4:.5 C4:.5 E4:.5 E4:.5 G4:.5 G4:.5 E4 C4:.5 C4:.5 E4:.5 E4:.5 G4:.5 G4:.5 C5:2 R:1 F4:.5 F4:.5 D4:.5 D4:.5 B3:.5 B3:.5 G3 C4:.5 C4:.5 E4:.5 E4:.5 G4:.5 G4:.5 E4', 'haydn 94'],
    ['bee', 'Flight of the Bumblebee', 'Nikolai Rimsky-Korsakov', 'The Tale of Tsar Saltan (1900)', 140, 'BEE', 'bumble bee'],
    ['joy', 'Joy to the World', 'Traditional carol (arr. Lowell Mason)', 'Hymn tune “Antioch” (1839)', 100,
      'D5 C#5:.75 B4:.25 A4:1.5 G4:.5 F#4 E4 D4:1.5 A4:.5 B4:1.5 B4:.5 C#5:1.5 C#5:.5 D5:2.5 D5:.5 D5:.5 C#5:.5 B4:.5 A4:.5 A4:.75 G4:.25 F#4:.5 D5:.5 D5:.5 C#5:.5 B4:.5 A4:.5 A4:.75 G4:.25 F#4:.5', 'christmas carol antioch'],
    ['green', 'Greensleeves', 'Traditional (English)', 'Folk song, 16th century', 100,
      'A4:.5 C5 D5:.5 E5:.75 F5:.25 E5:.5 D5 B4:.5 G4:.75 A4:.25 B4:.5 C5 A4:.5 A4:.75 G#4:.25 A4:.5 B4 G#4:.5 E4 A4:.5 C5 D5:.5 E5:.75 F5:.25 E5:.5 D5 B4:.5 G4:.75 A4:.25 B4:.5 C5:.75 B4:.25 A4:.5 G#4:.75 F#4:.25 G#4:.5 A4:1.5', 'what child is this'],
    ['scarb', 'Scarborough Fair', 'Traditional (English)', 'Ballad, medieval origin', 120,
      'D4:2 D4 A4:2 A4 E4:1.5 F4:.5 E4 D4:3 R:1 A4 C5 D5:2 C5 A4 B4 G4 A4:3 R:1 D5:2 D5 D5:2 C5 A4 A4 G4 F#4 E4 C4:2 D4:3', 'parsley sage rosemary thyme'],
    ['twinkle', 'Twinkle, Twinkle, Little Star', 'Traditional (French)', '“Ah ! vous dirai-je, maman” (18th century)', 110,
      'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2', 'abc song ah vous dirai je maman alphabet'],
    ['frere', 'Frère Jacques', 'Traditional (French)', 'Round, 18th century', 120,
      'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2', 'are you sleeping brother john'],
    ['auld', 'Auld Lang Syne', 'Traditional (Scottish)', 'Words by Robert Burns (1788)', 90,
      'C4 F4:1.5 F4:.5 F4 A4 G4:1.5 F4:.5 G4 A4 F4:1.5 F4:.5 A4 C5 D5:3 D5 C5:1.5 A4:.5 A4 F4 G4:1.5 F4:.5 G4 A4 F4:1.5 D4:.5 D4 C4 F4:3', 'new year'],
    ['grace', 'Amazing Grace', 'Traditional (American hymn tune “New Britain”)', 'Tune first printed 1829', 90,
      'G4 C5:2 E5:.5 C5:.5 E5:2 D5 C5:2 A4 G4:2 G4 C5:2 E5:.5 C5:.5 E5:2 D5 G5:3 R:1 E5 G5:2 E5:.5 C5:.5 E5:2 D5 C5:2 A4 G4:2 G4 C5:2 E5:.5 C5:.5 E5:2 D5 C5:3', 'hymn new britain'],
    ['jingle', 'Jingle Bells', 'James Lord Pierpont', 'Song (1857)', 130,
      'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 E4 D4 D4 E4 D4:2 G4:2', 'christmas one horse open sleigh'],
    ['silent', 'Silent Night', 'Franz Xaver Gruber', 'Carol “Stille Nacht” (1818)', 76,
      'G4:1.5 A4:.5 G4 E4:3 G4:1.5 A4:.5 G4 E4:3 D5:2 D5 B4:3 C5:2 C5 G4:3 A4:2 A4 C5:1.5 B4:.5 A4 G4:1.5 A4:.5 G4 E4:3', 'stille nacht christmas'],
    ['deck', 'Deck the Halls', 'Traditional (Welsh)', 'Carol “Nos Galan” (18th century)', 120,
      'G4:1.5 F4:.5 E4 D4 C4 D4 E4 C4 D4:.5 E4:.5 F4:.5 D4:.5 E4:1.5 D4:.5 C4 B3 C4:2 G4:1.5 F4:.5 E4 D4 C4 D4 E4 C4 D4:.5 E4:.5 F4:.5 D4:.5 E4:1.5 D4:.5 C4 B3 C4:2', 'christmas fa la la nos galan'],
    ['merry', 'We Wish You a Merry Christmas', 'Traditional (English)', 'Carol, West Country tradition', 150,
      'D4 G4 G4:.5 A4:.5 G4:.5 F#4:.5 E4 E4 E4 A4 A4:.5 B4:.5 A4:.5 G4:.5 F#4 D4 D4 B4 B4:.5 C5:.5 B4:.5 A4:.5 G4 E4 D4:.5 D4:.5 E4 A4 F#4 G4:2', 'christmas carol'],
    ['saints', 'When the Saints Go Marching In', 'Traditional (American)', 'Spiritual, early 20th century', 150,
      'C4 E4 F4 G4:4 C4 E4 F4 G4:4 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:4 E4 E4 D4 C4:3 C4 E4 G4:2 G4 F4:3 E4 F4 G4:2 E4:2 C4:2 D4:2 C4:4', 'saints marching'],
    ['susanna', 'Oh! Susanna', 'Stephen Foster', 'Song (1848)', 140,
      'C4:.5 D4:.5 E4 G4 G4:1.5 A4:.5 G4 E4 C4:1.5 D4:.5 E4 E4 D4 C4 D4:3 C4:.5 D4:.5 E4 G4 G4:1.5 A4:.5 G4 E4 C4:1.5 D4:.5 E4 E4 D4 D4 C4:4', 'oh susanna banjo'],
    ['camptown', 'Camptown Races', 'Stephen Foster', 'Song (1850)', 140,
      'G4:.5 G4:.5 E4:.5 G4:.5 A4:.5 G4:.5 E4 E4:.5 D4:1.5 E4:.5 D4:1.5 G4:.5 G4:.5 E4:.5 G4:.5 A4:.5 G4:.5 E4 D4 E4:.5 D4:.5 C4:2 G4:.5 G4:.5 E4:.5 G4:.5 A4:.5 G4:.5 E4 E4:.5 D4:1.5 E4:.5 D4:1.5 G4:.5 G4:.5 E4:.5 G4:.5 A4:.5 G4:.5 E4 D4 E4:.5 D4:.5 C4:2', 'doo dah'],
    ['yankee', 'Yankee Doodle', 'Traditional (American)', 'Song, 18th century', 140,
      'C4 C4 D4 E4 C4 E4 D4:2 C4 C4 D4 E4 C4:2 B3:2 C4 C4 D4 E4 F4 E4 D4 C4 B3 G3 A3 B3 C4:2 C4:2', 'yankee doodle dandy'],
    ['london', 'London Bridge Is Falling Down', 'Traditional (English)', 'Nursery rhyme, 17th century or earlier', 120,
      'G4:1.5 A4:.5 G4 F4 E4 F4 G4:2 D4 E4 F4:2 E4 F4 G4:2 G4:1.5 A4:.5 G4 F4 E4 F4 G4:2 D4:2 G4:2 E4 C4:3', 'london bridge'],
    ['mary', 'Mary Had a Little Lamb', 'Traditional (American)', 'Nursery song, 1830s', 120,
      'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4', 'little lamb'],
    ['row', 'Row, Row, Row Your Boat', 'Traditional', 'Round, 19th century', 100,
      'C4:1.5 C4:1.5 C4 D4:.5 E4:1.5 E4 D4:.5 E4 F4:.5 G4:3 C5:.5 C5:.5 C5:.5 G4:.5 G4:.5 G4:.5 E4:.5 E4:.5 E4:.5 C4:.5 C4:.5 C4:.5 G4 F4:.5 E4 D4:.5 C4:3', 'row your boat'],
    ['macdonald', 'Old MacDonald Had a Farm', 'Traditional', 'Children’s song', 130,
      'G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:3 D4 G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:3', 'old mcdonald farm e i e i o'],
    ['clementine', 'Oh My Darling, Clementine', 'Traditional (American)', 'Folk ballad (1880s)', 130,
      'C4 C4 C4 G3:2 E4 E4 E4 C4:2 C4 E4 G4:2 G4 F4 E4 D4:3 D4 E4 F4:2 F4 E4 D4 E4:2 C4 C4 E4 D4:2 G3 B3 D4 C4:3', 'clementine darling'],
    ['sakura', 'Sakura Sakura', 'Traditional (Japanese)', 'Folk song, Edo period', 80,
      'A4 A4 B4:2 A4 A4 B4:2 A4 B4 C5 B4 A4 B4:.5 A4:.5 F4:2 E4 C4 E4 F4 E4 E4:.5 C4:.5 B3:2 A4 B4 C5 B4 A4 B4:.5 A4:.5 F4:2', 'cherry blossoms'],
  ];

  // patterned pieces are generated rather than typed out
  function gen(id) {
    var out = [];
    function rep(notes, n, d) { for (var k = 0; k < n; k++) notes.forEach(function (x) { out.push(x + ':' + d); }); }
    if (id === 'MOON') {
      var t = 1 / 3;
      rep(['G#3', 'C#4', 'E4'], 4, t); rep(['G#3', 'C#4', 'E4'], 4, t);
      rep(['A3', 'C#4', 'E4'], 2, t); rep(['A3', 'D4', 'F#4'], 2, t);
      rep(['G#3', 'C4', 'F#4'], 2, t); rep(['G#3', 'C#4', 'E4'], 1, t); rep(['F#3', 'C#4', 'D#4'], 1, t);
      rep(['E3', 'G#3', 'C#4'], 4, t);
      out.push('G#4:1.5', 'G#4:.5', 'G#4:2');
    } else if (id === 'JESU') {
      'G4 A4 B4 D5 C5 C5 E5 D5 D5 G5 F#5 G5 D5 B4 G4 A4 B4 C5 D5 E5 D5 C5 B4 A4 B4 G4 F#4 G4 A4 D4 F#4 A4 C5 B4 A4 B4 G4 A4 B4 D5 C5 C5 E5 D5 D5 G5 F#5 G5 D5 B4 G4 A4 B4 E4 D5 C5 B4 A4 G4 D4 G4 F#4 G4:1'
        .split(' ').forEach(function (x) { out.push(x.indexOf(':') > 0 ? x : x + ':' + 1 / 3); });
    } else if (id === 'PRELUDE') {
      [['C4', 'E4', 'G4', 'C5', 'E5'], ['C4', 'D4', 'A4', 'D5', 'F5'], ['B3', 'D4', 'G4', 'D5', 'F5'], ['C4', 'E4', 'G4', 'C5', 'E5'], ['C4', 'E4', 'A4', 'E5', 'A5'], ['C4', 'D4', 'F#4', 'A4', 'D5']].forEach(function (c) {
        rep([c[0], c[1], c[2], c[3], c[4], c[2], c[3], c[4]], 2, 0.25);
      });
    } else if (id === 'BEE') {
      var hi = ['E5', 'D#5', 'D5', 'C#5', 'C5', 'F5', 'E5', 'D#5', 'E5', 'D#5', 'D5', 'C#5', 'C5', 'C#5', 'D5', 'D#5'];
      var lo = ['A4', 'G#4', 'G4', 'F#4', 'F4', 'Bb4', 'A4', 'G#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'F#4', 'G4', 'G#4'];
      rep(hi, 2, 0.25); rep(lo, 2, 0.25); rep(hi, 2, 0.25);
    }
    return out.join(' ');
  }

  var NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freqOf(n) {
    var m = /^([A-G])([#b]?)(\d)$/.exec(n);
    if (!m) return 0;
    var semi = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
    return 440 * Math.pow(2, (semi - 69) / 12);
  }
  // Parse into [{t, d, f}] in seconds and repeat (with a short breath) to fill the longest clip.
  function compile(tune) {
    var src = /^[A-Z]+$/.test(tune.notes) ? gen(tune.notes) : tune.notes;
    var beat = 60 / tune.bpm;
    var once = [], t = 0;
    src.trim().split(/\s+/).forEach(function (tok) {
      var p = tok.split(':');
      var d = (p[1] ? parseFloat(p[1]) : 1) * beat;
      if (p[0] !== 'R') once.push({ t: t, d: d, f: freqOf(p[0]) });
      t += d;
    });
    var len = t, ev = [], off = 0;
    while (off < MAX_LEN + 0.5) {
      for (var i = 0; i < once.length; i++) ev.push({ t: once[i].t + off, d: once[i].d, f: once[i].f });
      off += len + beat;
    }
    return ev;
  }

  var LIST = TUNES.map(function (r) {
    return { id: r[0], title: r[1], composer: r[2], info: r[3], bpm: r[4], notes: r[5], alias: r[6] || '', ev: null };
  });
  var BY_ID = {};
  LIST.forEach(function (x, i) { x.idx = i; BY_ID[x.id] = x; });
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  LIST.forEach(function (x) { x.key = norm(x.title + ' ' + x.composer + ' ' + x.alias); x.nt = norm(x.title); });
  function lastName(c) { return /^Traditional/.test(c) ? '' : c.replace(/\s*\(.*\)$/, '').split(' ').pop(); }

  // deterministic daily order: seeded shuffle so each tune comes once per cycle
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var ORDER = (function () {
    var r = mulberry(20261003), a = LIST.map(function (x, i) { return i; });
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    return a;
  })();
  function todayNum() {
    var d = new Date();
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5) + 1;
  }
  function dailyTune(n) { var k = ((n - 1) % ORDER.length + ORDER.length) % ORDER.length; return LIST[ORDER[k]]; }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmtS(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  var CSS = [
    '.tg-app{position:absolute;inset:0;overflow:hidden;font-size:var(--tg-fs,15px);color:#f4ecff;background:radial-gradient(120% 90% at 50% 0%,#3a1f5c 0%,#1a1033 55%,#0e0820 100%);line-height:1.3;-webkit-user-select:none;user-select:none}',
    '.tg-app *{box-sizing:border-box}',
    '.tg-bgc{position:absolute;inset:0;pointer-events:none}',
    '.tg-col{position:relative;z-index:1;height:100%;max-width:34em;margin:0 auto;padding:.6em .8em .7em;display:flex;flex-direction:column;gap:.45em}',
    '.tg-head{display:flex;align-items:center;gap:.4em;flex:none}',
    '.tg-logo{font-weight:900;font-size:1.25em;letter-spacing:-.02em;white-space:nowrap;margin-right:auto;color:#fff}',
    '.tg-logo i{font-style:normal;color:#ffc857}',
    '.tg-seg{display:inline-flex;background:rgba(0,0,0,.35);border-radius:.7em;padding:.15em;flex:none}',
    '.tg-seg button{border:0;background:transparent;color:#bfb0e0;font:inherit;font-weight:800;font-size:.82em;padding:.35em .6em;border-radius:.55em;cursor:pointer;white-space:nowrap;touch-action:manipulation}',
    '.tg-seg button.is-on{background:#ffc857;color:#2a1640}',
    '.tg-ib{flex:none;width:2.1em;height:2.1em;border-radius:.6em;border:0;background:rgba(255,255,255,.1);color:#fff;font:inherit;font-weight:900;cursor:pointer;touch-action:manipulation}',
    '.tg-ib:hover,.tg-seg button:hover{filter:brightness(1.15)}',
    '.tg-board{flex:0 1 auto;min-height:0;display:flex;flex-direction:column;gap:.28em;margin-top:.3em}',
    '.tg-slot{flex:0 1 2em;min-height:1.45em;max-height:2.3em;display:flex;align-items:center;gap:.5em;padding:0 .7em;border-radius:.55em;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);font-weight:700;font-size:.9em;white-space:nowrap;overflow:hidden}',
    '.tg-slot span{overflow:hidden;text-overflow:ellipsis}',
    '.tg-slot b{flex:none;width:1.3em;text-align:center}',
    '.tg-slot.is-cur{border-color:#ffc857;background:rgba(255,200,87,.08)}',
    '.tg-slot.is-skip{color:#a598c8}',
    '.tg-slot.is-wrong{background:rgba(255,92,122,.16);border-color:rgba(255,92,122,.45)}',
    '.tg-slot.is-near{background:rgba(255,200,87,.16);border-color:rgba(255,200,87,.55)}',
    '.tg-slot.is-right{background:rgba(62,230,168,.2);border-color:#3ee6a8}',
    '.tg-slot small{margin-left:auto;flex:none;font-size:.78em;opacity:.8}',
    '.tg-shake{animation:tgShake .4s ease}',
    '@keyframes tgShake{20%{transform:translateX(-.4em)}40%{transform:translateX(.35em)}60%{transform:translateX(-.25em)}80%{transform:translateX(.15em)}}',
    '.tg-viz{flex:1 1 2.4em;min-height:1.6em;max-height:9em;position:relative}',
    '.tg-viz canvas{position:absolute;inset:0}',
    '.tg-bar{flex:none;position:relative;height:1.1em;border-radius:.55em;background:rgba(0,0,0,.4);overflow:hidden;cursor:pointer}',
    '.tg-bar .tg-un{position:absolute;left:0;top:0;bottom:0;background:rgba(255,200,87,.28)}',
    '.tg-bar .tg-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ff7aa8,#ffc857)}',
    '.tg-bar .tg-tick{position:absolute;top:0;bottom:0;width:2px;background:rgba(14,8,32,.85)}',
    '.tg-times{flex:none;display:flex;justify-content:space-between;font-size:.75em;color:#bfb0e0;margin-top:-.2em;font-variant-numeric:tabular-nums}',
    '.tg-ctrl{flex:none;display:flex;align-items:center;justify-content:space-between;gap:.6em}',
    '.tg-play{flex:none;width:3.3em;height:3.3em;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg,#ffc857,#ff7aa8);box-shadow:0 .25em 1em rgba(255,122,168,.4);display:grid;place-items:center;touch-action:manipulation;transition:transform .1s}',
    '.tg-play:active{transform:scale(.94)}',
    '.tg-play svg{width:1.3em;height:1.3em;fill:#2a1640}',
    '.tg-btn{border:0;border-radius:.7em;padding:.6em .9em;font:inherit;font-weight:900;font-size:.9em;cursor:pointer;touch-action:manipulation;color:#2a1640;background:#ffc857;white-space:nowrap}',
    '.tg-btn.sec{background:rgba(255,255,255,.12);color:#f4ecff}',
    '.tg-btn[disabled]{opacity:.45;cursor:default}',
    '.tg-ctrl .tg-btn{min-width:6.6em}',
    '.tg-guess{flex:none;position:relative;display:flex;gap:.4em}',
    '.tg-in{flex:1;min-width:0;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;border-radius:.7em;padding:.55em .7em;font:inherit;font-size:max(16px,.95em);outline:none;-webkit-user-select:text;user-select:text}',
    '.tg-in:focus{border-color:#ffc857}',
    '.tg-in::placeholder{color:#9c8fc0}',
    '.tg-sug{position:absolute;left:0;right:0;bottom:calc(100% + .3em);max-height:min(15em,60vh);overflow-y:auto;overscroll-behavior:contain;background:#2a1a48;border:1px solid rgba(255,255,255,.18);border-radius:.7em;box-shadow:0 -.5em 1.5em rgba(0,0,0,.5);z-index:5;display:none;padding:.25em}',
    '.tg-sug.is-open{display:block}',
    '.tg-opt{display:block;width:100%;text-align:left;border:0;background:transparent;color:#f4ecff;font:inherit;font-size:.9em;padding:.45em .6em;border-radius:.5em;cursor:pointer;touch-action:manipulation}',
    '.tg-opt small{display:block;color:#a598c8;font-size:.8em}',
    '.tg-opt.is-hl,.tg-opt:hover{background:rgba(255,200,87,.2)}',
    '.tg-opt mark{background:none;color:#ffc857;font-weight:900}',
    '.tg-res{flex:none;text-align:center;background:rgba(0,0,0,.3);border-radius:.9em;padding:.6em .7em}',
    '.tg-res h3{margin:0;font-size:1.15em;line-height:1.2}',
    '.tg-res p{margin:.15em 0;color:#cfc3ee;font-size:.85em}',
    '.tg-res .tg-row{display:flex;gap:.4em;justify-content:center;flex-wrap:wrap;margin-top:.45em}',
    '.tg-big{font-size:1.25em;font-weight:900;letter-spacing:.08em}',
    '.tg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.3em;margin:.2em 0 .6em}',
    '.tg-stats div{background:rgba(255,255,255,.07);border-radius:.6em;padding:.35em .1em}',
    '.tg-stats b{display:block;font-size:1.4em;color:#fff}',
    '.tg-stats span{font-size:.72em;color:#bfb0e0}',
    '.tg-dist{text-align:left;font-size:.8em}',
    '.tg-dist div{display:flex;align-items:center;gap:.4em;margin:.18em 0}',
    '.tg-dist i{font-style:normal;width:1.2em;text-align:right;color:#bfb0e0}',
    '.tg-dist em{font-style:normal;display:block;min-width:1.6em;padding:.1em .4em;border-radius:.3em;background:#4a3a72;color:#fff;font-weight:800;text-align:right}',
    '.tg-dist em.is-hi{background:#3ee6a8;color:#14202a}',
    '.tg-share{width:100%;min-height:4.5em;margin-top:.5em;border-radius:.6em;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);color:#fff;font:13px/1.35 ui-monospace,monospace;padding:.5em;resize:none}',
  ].join('\n');

  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
  var ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  IGAME.register('tune-guess', function (ctx) {
    var ui = IGAME.ui;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var root = ctx.root;
    var destroyed = false;

    /* ---------------- persistent state ---------------- */
    function freshStats() { return { played: 0, won: 0, streak: 0, max: 0, last: 0, dist: [0, 0, 0, 0, 0, 0, 0] }; }
    function loadStats(k) {
      var s = store.get(k, null), f = freshStats();
      if (!s || typeof s !== 'object') return f;
      ['played', 'won', 'streak', 'max', 'last'].forEach(function (x) { var n = Number(s[x]); if (isFinite(n) && n >= 0) f[x] = n; });
      if (Array.isArray(s.dist)) for (var i = 0; i < 7; i++) f.dist[i] = Math.max(0, Number(s.dist[i]) || 0);
      return f;
    }
    var stats = { daily: loadStats('statsDaily'), practice: loadStats('statsPractice') };
    var introSeen = !!store.get('intro', false);
    var recent = store.get('recent', []);
    if (!Array.isArray(recent)) recent = [];

    var DAY = todayNum();
    var mode = 'daily';
    var G = null; // current round: {tune, guesses:[{r, id}], done, won, day}

    function validGuesses(arr) {
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (g) { return g && /^(skip|wrong|near|right)$/.test(g.r) && (g.r === 'skip' || BY_ID[g.id]); }).slice(0, 6);
    }
    function startDaily() {
      var saved = store.get('daily', null);
      var tune = dailyTune(DAY);
      G = { tune: tune, guesses: [], done: false, won: false, day: DAY };
      if (saved && saved.v === SAVE_VER && saved.day === DAY) {
        G.guesses = validGuesses(saved.guesses);
        G.done = !!saved.done;
        G.won = !!saved.won;
      }
    }
    function startPractice(keep) {
      var saved = keep ? store.get('practice', null) : null;
      if (saved && saved.v === SAVE_VER && BY_ID[saved.id] && !saved.done) {
        G = { tune: BY_ID[saved.id], guesses: validGuesses(saved.guesses), done: false, won: false, day: 0 };
        return;
      }
      var pool = LIST.filter(function (x) { return recent.indexOf(x.id) < 0; });
      if (!pool.length) pool = LIST;
      var t = pool[Math.floor(Math.random() * pool.length)];
      recent.push(t.id);
      while (recent.length > Math.min(20, LIST.length - 5)) recent.shift();
      store.set('recent', recent);
      G = { tune: t, guesses: [], done: false, won: false, day: 0 };
      saveRound();
    }
    function saveRound() {
      var o = { v: SAVE_VER, guesses: G.guesses, done: G.done, won: G.won };
      if (mode === 'daily') { o.day = G.day; store.set('daily', o); }
      else { o.id = G.tune.id; store.set('practice', o); }
    }

    /* ---------------- audio ---------------- */
    var AC = null, master = null, voices = [], playing = false, playT0 = 0, playLen = 0;
    function audio() {
      if (!AC) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        try { AC = new C(); } catch (e) { return null; }
      }
      if (AC.state === 'suspended' && AC.resume) AC.resume();
      return AC;
    }
    function play(len) {
      stopAudio();
      if (IGAME.isMuted && IGAME.isMuted()) {
        ui.toast(root, 'Sound is off: turn it on with the speaker button', 1800);
        return;
      }
      var a = audio();
      if (!a) { ui.toast(root, 'Audio is not available in this browser', 1600); return; }
      var tune = G.tune;
      if (!tune.ev) tune.ev = compile(tune);
      // a fresh master bus per clip: disconnecting it silences everything still scheduled
      master = a.createGain();
      master.gain.value = 0.55;
      var comp = a.createDynamicsCompressor();
      var echo = a.createDelay(1);
      echo.delayTime.value = 0.21;
      var fb = a.createGain();
      fb.gain.value = 0.22;
      var wet = a.createBiquadFilter();
      wet.type = 'lowpass';
      wet.frequency.value = 2200;
      master.connect(comp);
      master.connect(echo);
      echo.connect(wet);
      wet.connect(fb);
      fb.connect(echo);
      wet.connect(comp);
      comp.connect(a.destination);
      master._nodes = [comp, echo, fb, wet];
      var t0 = a.currentTime + 0.06;
      voices = [];
      for (var i = 0; i < tune.ev.length; i++) {
        var n = tune.ev[i];
        if (n.t >= len) break;
        var st = t0 + n.t;
        var end = Math.min(n.t + n.d * 0.92, len);
        var dur = Math.max(0.05, end - n.t);
        var gn = a.createGain();
        var o1 = a.createOscillator();
        var o2 = a.createOscillator();
        var g2 = a.createGain();
        o1.type = 'triangle';
        o1.frequency.value = n.f;
        o2.type = 'sine';
        o2.frequency.value = n.f * 2;
        g2.gain.value = 0.28;
        var peak = 0.32;
        gn.gain.setValueAtTime(0.0001, st);
        gn.gain.exponentialRampToValueAtTime(peak, st + 0.012);
        gn.gain.exponentialRampToValueAtTime(peak * 0.55, st + Math.min(0.25, dur * 0.6));
        gn.gain.setValueAtTime(peak * 0.55, st + Math.max(0.02, dur - 0.05));
        gn.gain.exponentialRampToValueAtTime(0.0001, st + dur + 0.08);
        o1.connect(gn);
        o2.connect(g2);
        g2.connect(gn);
        gn.connect(master);
        o1.start(st);
        o2.start(st);
        o1.stop(st + dur + 0.1);
        o2.stop(st + dur + 0.1);
        voices.push({ t: n.t, d: dur, f: n.f });
      }
      playing = true;
      playT0 = t0;
      playLen = len;
      syncPlayBtn();
    }
    function stopAudio() {
      if (master && AC) {
        var m = master;
        try {
          m.gain.cancelScheduledValues(AC.currentTime);
          m.gain.setValueAtTime(m.gain.value, AC.currentTime);
          m.gain.linearRampToValueAtTime(0, AC.currentTime + 0.03);
        } catch (e) {}
        setTimeout(function () {
          try { m.disconnect(); m._nodes.forEach(function (x) { x.disconnect(); }); } catch (e) {}
        }, 60);
      }
      master = null;
      playing = false;
      syncPlayBtn();
    }
    function playPos() { return playing && AC ? clamp(AC.currentTime - playT0, 0, playLen) : 0; }
    function clipLen() { return G.done ? MAX_LEN : CLIPS[Math.min(G.guesses.length, 5)]; }

    /* ---------------- DOM ---------------- */
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var app = ui.el('div', 'tg-app');
    root.appendChild(app);
    var bgView = IGAME.createCanvas(app, { onResize: function () { bgDirty = true; } });
    bgView.canvas.className = 'tg-bgc';
    var bgDirty = true;
    var col = ui.el('div', 'tg-col');
    app.appendChild(col);
    col.innerHTML =
      '<div class="tg-head"><div class="tg-logo">Clip<i>sody</i></div>' +
      '<div class="tg-seg"><button type="button" data-act="mode" data-m="daily"></button><button type="button" data-act="mode" data-m="practice">Practice</button></div>' +
      '<button type="button" class="tg-ib" data-act="stats" aria-label="Statistics" title="Statistics">▥</button>' +
      '<button type="button" class="tg-ib" data-act="help" aria-label="How to play" title="How to play">?</button></div>' +
      '<div class="tg-board"></div>' +
      '<div class="tg-viz"></div>' +
      '<div class="tg-bar" data-act="playbar"><div class="tg-un"></div><div class="tg-fill"></div></div>' +
      '<div class="tg-times"><span class="tg-t0">0:00</span><span class="tg-t1">0:16</span></div>' +
      '<div class="tg-ctrl"><button type="button" class="tg-btn sec" data-act="skip"></button>' +
      '<button type="button" class="tg-play" data-act="play" aria-label="Play clip"></button>' +
      '<button type="button" class="tg-btn" data-act="submit">Submit</button></div>' +
      '<div class="tg-guess"><div class="tg-sug" role="listbox"></div><input class="tg-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Guess the tune" placeholder="Know it? Search title or composer…"></div>' +
      '<div class="tg-res" hidden></div>';
    var $ = function (s) { return col.querySelector(s); };
    var boardEl = $('.tg-board'), barEl = $('.tg-bar'), unEl = $('.tg-un'), fillEl = $('.tg-fill');
    var t0El = $('.tg-t0'), t1El = $('.tg-t1');
    var ctrlEl = $('.tg-ctrl'), skipBtn = $('[data-act=skip]'), playBtn = $('.tg-play'), submitBtn = $('[data-act=submit]');
    var guessEl = $('.tg-guess'), inputEl = $('.tg-in'), sugEl = $('.tg-sug'), resEl = $('.tg-res');
    var dailyBtn = $('[data-m=daily]'), pracBtn = $('[data-m=practice]');
    for (var tk = 0; tk < CLIPS.length - 1; tk++) {
      var tick = ui.el('div', 'tg-tick');
      tick.style.left = (CLIPS[tk] / MAX_LEN) * 100 + '%';
      barEl.appendChild(tick);
    }
    var vizView = IGAME.createCanvas($('.tg-viz'), {});

    function layout() {
      var r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var fs = clamp(Math.min(r.width / 25, r.height / 29), 11, 17);
      app.style.setProperty('--tg-fs', fs.toFixed(2) + 'px');
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
    if (ro) ro.observe(root);
    else window.addEventListener('resize', layout);
    layout();

    /* ---------------- rendering the round ---------------- */
    var selected = null; // tune chosen from suggestions
    function syncPlayBtn() {
      playBtn.innerHTML = playing ? ICON_STOP : ICON_PLAY;
      playBtn.setAttribute('aria-label', playing ? 'Stop' : G && G.done ? 'Play the full tune' : 'Play clip');
    }
    function render() {
      dailyBtn.textContent = 'Daily #' + DAY;
      dailyBtn.classList.toggle('is-on', mode === 'daily');
      pracBtn.classList.toggle('is-on', mode === 'practice');
      var h = '';
      for (var i = 0; i < 6; i++) {
        var gq = G.guesses[i];
        if (!gq) {
          h += '<div class="tg-slot' + (i === G.guesses.length && !G.done ? ' is-cur' : '') + '"><b>' + (i + 1) + '</b><span style="opacity:.45">' + CLIPS[i] + ' s clip</span></div>';
        } else if (gq.r === 'skip') h += '<div class="tg-slot is-skip"><b>»</b><span>Skipped</span></div>';
        else {
          var tt = BY_ID[gq.id];
          h += '<div class="tg-slot is-' + gq.r + '"><b>' + (gq.r === 'right' ? '✓' : '✗') + '</b><span>' + esc(tt.title) + '</span>' + (gq.r === 'near' ? '<small>right composer</small>' : '') + '</div>';
        }
      }
      boardEl.innerHTML = h;
      var len = clipLen();
      unEl.style.width = (len / MAX_LEN) * 100 + '%';
      t1El.textContent = fmtS(MAX_LEN);
      var left = 5 - G.guesses.length;
      skipBtn.textContent = left > 0 ? 'Skip (+' + (CLIPS[G.guesses.length + 1] - CLIPS[G.guesses.length]) + 's)' : 'Give up';
      ctrlEl.style.display = G.done ? 'none' : '';
      guessEl.style.display = G.done ? 'none' : '';
      resEl.hidden = !G.done;
      if (G.done) renderResult();
      syncPlayBtn();
    }
    function squares() {
      var s = '';
      for (var i = 0; i < 6; i++) {
        var gq = G.guesses[i];
        s += !gq ? '⬜' : gq.r === 'right' ? '🟩' : gq.r === 'near' ? '🟨' : gq.r === 'wrong' ? '🟥' : '⬛';
      }
      return s;
    }
    function shareText() {
      var head = mode === 'daily' ? 'Clipsody #' + DAY : 'Clipsody (practice)';
      return head + ' 🎵\n🔊' + squares() + '\n' + location.host + location.pathname;
    }
    function nextDailyIn() {
      var d = new Date(), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      var s = Math.max(0, Math.floor((m - d) / 1000));
      return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
    }
    function renderResult() {
      var t = G.tune;
      var n = G.guesses.length;
      resEl.innerHTML =
        '<p>' + (G.won ? (n === 1 ? 'Incredible: first second!' : 'You got it in ' + n + '!') : 'Out of tries. The tune was:') + '</p>' +
        '<h3>' + esc(t.title) + '</h3><p>' + esc(t.composer) + ' · ' + esc(t.info) + '</p>' +
        '<div class="tg-big">' + squares() + '</div>' +
        '<div class="tg-row"><button type="button" class="tg-btn" data-act="share">Share result</button>' +
        (mode === 'daily'
          ? '<button type="button" class="tg-btn sec" data-act="mode" data-m="practice">Practice mode</button>'
          : '<button type="button" class="tg-btn sec" data-act="next">Next tune ▸</button>') +
        '</div>' + (mode === 'daily' ? '<p class="tg-cd">Next daily tune in ' + nextDailyIn() + '</p>' : '');
    }

    /* ---------------- guessing ---------------- */
    var hl = 0, opts = [];
    function updateSug() {
      var q = norm(inputEl.value);
      selected = null;
      if (!q) { sugEl.classList.remove('is-open'); opts = []; return; }
      var words = q.split(' ');
      opts = LIST.filter(function (x) { return words.every(function (w) { return x.key.indexOf(w) >= 0; }); });
      opts.sort(function (a, b) { return (a.nt.indexOf(q) === 0 ? 0 : 1) - (b.nt.indexOf(q) === 0 ? 0 : 1) || a.title.localeCompare(b.title); });
      opts = opts.slice(0, 8);
      hl = 0;
      if (!opts.length) {
        sugEl.innerHTML = '<div class="tg-opt" style="cursor:default;opacity:.7">No tune matches “' + esc(inputEl.value) + '”</div>';
        sugEl.classList.add('is-open');
        return;
      }
      var re = new RegExp('(' + inputEl.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(/\s+/).join('|') + ')', 'ig');
      sugEl.innerHTML = opts.map(function (x, i) {
        return '<button type="button" class="tg-opt' + (i === hl ? ' is-hl' : '') + '" data-act="pick" data-id="' + x.id + '" role="option">' +
          esc(x.title).replace(re, '<mark>$1</mark>') + '<small>' + esc(x.composer) + '</small></button>';
      }).join('');
      sugEl.classList.add('is-open');
    }
    function moveHl(d) {
      if (!opts.length) return;
      hl = (hl + d + opts.length) % opts.length;
      var b = sugEl.querySelectorAll('.tg-opt');
      for (var i = 0; i < b.length; i++) b[i].classList.toggle('is-hl', i === hl);
      if (b[hl] && b[hl].scrollIntoView) b[hl].scrollIntoView({ block: 'nearest' });
    }
    function pick(id) {
      selected = BY_ID[id];
      inputEl.value = selected.title;
      sugEl.classList.remove('is-open');
      opts = [];
    }
    function submit() {
      if (G.done) return;
      var t = selected;
      if (!t) {
        var q = norm(inputEl.value);
        if (!q) { inputEl.focus(); ui.toast(root, 'Type a title, or press Skip', 1200); return; }
        t = LIST.filter(function (x) { return x.nt === q; })[0] || (opts.length === 1 ? opts[0] : null) || (opts.length && sugEl.classList.contains('is-open') ? opts[hl] : null);
        if (!t) { sfx('error'); ui.toast(root, 'Pick a tune from the list', 1300); return; }
      }
      if (G.guesses.some(function (gq) { return gq.id === t.id; })) { sfx('error'); ui.toast(root, 'Already guessed that one', 1200); return; }
      inputEl.value = '';
      selected = null;
      sugEl.classList.remove('is-open');
      stopAudio();
      if (t.id === G.tune.id) {
        G.guesses.push({ r: 'right', id: t.id });
        finish(true);
        return;
      }
      var near = lastName(t.composer) && lastName(t.composer) === lastName(G.tune.composer);
      G.guesses.push({ r: near ? 'near' : 'wrong', id: t.id });
      sfx('error');
      afterMiss(near ? 'Right composer, wrong piece!' : 'Not it, listen to a longer clip');
    }
    function skip() {
      if (G.done) return;
      stopAudio();
      G.guesses.push({ r: 'skip' });
      sfx('slide');
      afterMiss('');
    }
    function afterMiss(msg) {
      if (G.guesses.length >= 6) { finish(false); return; }
      saveRound();
      render();
      var row = boardEl.children[G.guesses.length - 1];
      if (row) { row.classList.add('tg-shake'); }
      if (msg) ui.toast(root, msg, 1300);
      burst(0.5, 0.5, G.guesses[G.guesses.length - 1].r === 'near' ? '#ffc857' : '#ff5c7a', 8);
    }
    function finish(won) {
      G.done = true;
      G.won = won;
      saveRound();
      var st = mode === 'daily' ? stats.daily : stats.practice;
      st.played++;
      if (won) {
        st.won++;
        st.dist[G.guesses.length - 1]++;
        if (mode === 'daily') st.streak = st.last === G.day - 1 ? st.streak + 1 : 1;
        else st.streak++;
        st.max = Math.max(st.max, st.streak);
      } else {
        st.dist[6]++;
        st.streak = 0;
      }
      if (mode === 'daily') st.last = won ? G.day : st.last;
      store.set(mode === 'daily' ? 'statsDaily' : 'statsPractice', st);
      render();
      if (won) { sfx('win'); confetti(); }
      else sfx('lose');
      // reveal: play the whole 16 s once the jingle is done
      revealTimer = setTimeout(function () { if (!destroyed && G.done) play(MAX_LEN); }, 900);
    }
    var revealTimer = 0;

    function setMode(m) {
      stopAudio();
      clearTimeout(revealTimer);
      mode = m;
      if (m === 'daily') startDaily();
      else startPractice(true);
      inputEl.value = '';
      selected = null;
      sugEl.classList.remove('is-open');
      render();
    }

    /* ---------------- overlays ---------------- */
    function showHelp(first) {
      var ov = ui.overlay(root, {
        title: first ? esc(ctx.title || 'Clipsody') : 'How to play',
        html:
          '<p style="margin:0 0 8px">Press ▶ to hear the opening second of a famous tune. Guess it from the list, or skip to hear more: clips grow to <b>1, 2, 4, 7, 11 and 16 seconds</b>. You have 6 tries.</p>' +
          '<p style="margin:0 0 8px">🟥 wrong · 🟨 right composer, wrong piece · ⬛ skipped · 🟩 correct</p>' +
          '<p style="margin:0;font-size:13px;opacity:.8">' + LIST.length + ' public-domain classics and folk songs, played by a built-in synth. Daily is the same tune for everyone today; Practice is unlimited.' + (ctx.isTouch ? '' : ' Keys: <span class="ig-kbd">Space</span> play · <span class="ig-kbd">Enter</span> guess.') + '</p>',
        buttons: [{ label: first ? 'Start listening' : 'Got it', primary: true, onClick: function () { ov.close(); if (first) { introSeen = true; store.set('intro', true); } } }],
      });
    }
    function showStats() {
      var cur = mode;
      var ov = ui.overlay(root, { title: 'Statistics', html: '<div class="tg-stbody"></div>', buttons: [{ label: 'Close', primary: true, onClick: function () { ov.close(); } }] });
      var bodyEl = ov.panel.querySelector('.tg-stbody');
      function draw() {
        var st = stats[cur];
        var mx = Math.max.apply(null, st.dist.concat([1]));
        var hiIdx = G.done && G.won && mode === cur ? G.guesses.length - 1 : G.done && mode === cur ? 6 : -1;
        bodyEl.innerHTML =
          '<div class="tg-seg" style="margin-bottom:.6em"><button type="button" data-st="daily" class="' + (cur === 'daily' ? 'is-on' : '') + '">Daily</button><button type="button" data-st="practice" class="' + (cur === 'practice' ? 'is-on' : '') + '">Practice</button></div>' +
          '<div class="tg-stats"><div><b>' + st.played + '</b><span>Played</span></div><div><b>' + (st.played ? Math.round((st.won / st.played) * 100) : 0) + '%</b><span>Win %</span></div><div><b>' + st.streak + '</b><span>Streak</span></div><div><b>' + st.max + '</b><span>Best streak</span></div></div>' +
          '<div class="tg-dist">' + st.dist.map(function (v, i) {
            return '<div><i>' + (i < 6 ? i + 1 : '✗') + '</i><em class="' + (i === hiIdx ? 'is-hi' : '') + '" style="width:' + Math.max(8, (v / mx) * 100) + '%">' + v + '</em></div>';
          }).join('') + '</div>';
      }
      bodyEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-st]');
        if (!b) return;
        e.stopPropagation();
        cur = b.getAttribute('data-st');
        sfx('click');
        draw();
      });
      draw();
    }
    function share() {
      var txt = shareText();
      function fallback() {
        var ov = ui.overlay(root, {
          title: 'Copy your result',
          html: '<textarea class="tg-share" readonly>' + esc(txt) + '</textarea>',
          buttons: [{ label: 'Done', primary: true, onClick: function () { ov.close(); } }],
        });
        var ta = ov.panel.querySelector('textarea');
        setTimeout(function () { try { ta.focus(); ta.select(); } catch (e) {} }, 40);
      }
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(function () { if (!destroyed) ui.toast(root, 'Result copied to clipboard!', 1400); }, function () { if (!destroyed) fallback(); });
      } else fallback();
    }

    /* ---------------- events ---------------- */
    function onClick(e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t || !col.contains(t)) {
        if (!guessEl.contains(e.target)) sugEl.classList.remove('is-open');
        return;
      }
      var act = t.getAttribute('data-act');
      if (act === 'play' || act === 'playbar') {
        if (playing) stopAudio();
        else play(clipLen());
      } else if (act === 'skip') skip();
      else if (act === 'submit') submit();
      else if (act === 'pick') { pick(t.getAttribute('data-id')); sfx('click'); inputEl.focus(); }
      else if (act === 'mode') { sfx('click'); setMode(t.getAttribute('data-m')); }
      else if (act === 'next') { sfx('click'); stopAudio(); clearTimeout(revealTimer); startPractice(false); render(); }
      else if (act === 'share') share();
      else if (act === 'stats') { sfx('click'); showStats(); }
      else if (act === 'help') { sfx('click'); showHelp(false); }
    }
    col.addEventListener('click', onClick);
    function onInput() { updateSug(); }
    function onInKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!sugEl.classList.contains('is-open')) updateSug(); else moveHl(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveHl(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (sugEl.classList.contains('is-open') && opts.length) pick(opts[hl].id);
        else submit();
      } else if (e.key === 'Escape') { sugEl.classList.remove('is-open'); }
    }
    function onFocus() { if (inputEl.value) updateSug(); }
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onInKey);
    inputEl.addEventListener('focus', onFocus);

    ctx.captureKeys(['Enter']);
    ctx.onKey(function (code, down, ev) {
      if (!down) return;
      var ov = root.querySelector('.ig-overlay');
      if (ov) {
        if (code === 'Space' || code === 'Enter') {
          var f = document.activeElement;
          var btn = f && ov.contains(f) && f.tagName === 'BUTTON' ? f : ov.querySelector('.ig-btn:not(.secondary)') || ov.querySelector('.ig-btn');
          if (btn) btn.click();
        }
        return;
      }
      if (code === 'Space') { if (playing) stopAudio(); else play(clipLen()); }
      else if (code === 'Enter') {
        var fe = document.activeElement;
        if (fe && fe.tagName === 'BUTTON' && col.contains(fe)) fe.click();
        else if (!G.done) inputEl.focus();
      } else if (!G.done && ev && ev.key && ev.key.length === 1 && /[a-z0-9]/i.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        // start typing anywhere in the game to search
        ev.preventDefault();
        inputEl.focus();
        inputEl.value += ev.key;
        updateSug();
      }
    });

    /* ---------------- canvas: background notes + visualiser ---------------- */
    var floaters = [];
    for (var fi = 0; fi < 14; fi++) floaters.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8, v: 0.01 + Math.random() * 0.02, r: Math.random() * 6 });
    var parts = [];
    function burst(fx, fy, color, n) {
      var w = bgView.width, h = bgView.height;
      for (var i = 0; i < n && parts.length < 160; i++) {
        var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
        parts.push({ x: w * fx, y: h * fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 0.8 + Math.random() * 0.6, c: color, s: 3 + Math.random() * 4, rot: Math.random() * 6 });
      }
    }
    function confetti() {
      var cs = ['#ffc857', '#ff7aa8', '#3ee6a8', '#7ab8ff', '#c69cff'];
      for (var k = 0; k < 5; k++) burst(0.2 + k * 0.15, 0.35, cs[k], 18);
    }
    function drawNoteGlyph(g, x, y, s) {
      g.beginPath();
      g.ellipse(x, y, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + s * 0.42, y - s * 1.6, s * 0.14, s * 1.6);
    }
    var bars = new Float32Array(28);
    var loop = IGAME.loop(function (dt, t) {
      if (playing) {
        if (IGAME.isMuted && IGAME.isMuted()) stopAudio();
        else if (playPos() >= playLen - 0.001 && AC && AC.currentTime > playT0 + playLen + 0.05) stopAudio();
      }
      // progress bar
      var pos = playPos();
      var w = playing ? (pos / MAX_LEN) * 100 : 0;
      fillEl.style.width = w.toFixed(2) + '%';
      t0El.textContent = fmtS(pos);
      // background
      var g = bgView.ctx, W = bgView.width, H = bgView.height;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.06)';
      for (var i = 0; i < floaters.length; i++) {
        var f = floaters[i];
        f.y -= f.v * dt * (playing ? 3 : 1);
        if (f.y < -0.1) { f.y = 1.1; f.x = Math.random(); }
        drawNoteGlyph(g, f.x * W + Math.sin(t * 0.6 + f.r) * 10, f.y * H, 9 * f.s);
      }
      for (var p = parts.length - 1; p >= 0; p--) {
        var q = parts[p];
        q.life += dt;
        if (q.life > q.max) { parts.splice(p, 1); continue; }
        q.vy += 260 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += dt * 8;
        g.globalAlpha = 1 - q.life / q.max;
        g.fillStyle = q.c;
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.rot);
        g.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2);
        g.restore();
      }
      g.globalAlpha = 1;
      // visualiser: bars react to the notes sounding right now (no pitch letters shown)
      var v = vizView.ctx, VW = vizView.width, VH = vizView.height;
      v.clearRect(0, 0, VW, VH);
      var level = 0, pitch = 0;
      if (playing) {
        for (var k = 0; k < voices.length; k++) {
          var vo = voices[k];
          if (pos >= vo.t && pos < vo.t + vo.d + 0.05) {
            var age = pos - vo.t;
            level = Math.max(level, Math.exp(-age * 3) * 0.6 + 0.4);
            pitch = Math.log2(vo.f / 130);
          }
        }
      }
      var n = bars.length, bw = VW / n;
      for (var b = 0; b < n; b++) {
        var center = clamp(pitch / 4, 0, 1) * (n - 1);
        var target = level * (0.25 + 0.75 * Math.exp(-Math.pow((b - center) / 4.5, 2))) * (0.75 + 0.25 * Math.sin(t * 9 + b * 1.7));
        if (!playing) target = 0.06 + 0.03 * Math.sin(t * 2 + b * 0.5);
        bars[b] += (target - bars[b]) * Math.min(1, dt * 14);
        var bh = Math.max(2, bars[b] * VH);
        var gr = v.createLinearGradient(0, VH, 0, VH - bh);
        gr.addColorStop(0, '#ff7aa8');
        gr.addColorStop(1, '#ffc857');
        v.fillStyle = gr;
        v.fillRect(b * bw + bw * 0.18, VH - bh, bw * 0.64, bh);
      }
    });

    /* ---------------- boot ---------------- */
    startDaily();
    render();
    if (!introSeen) showHelp(true);
    loop.start();
    var cdTimer = setInterval(function () {
      var cd = resEl.querySelector('.tg-cd');
      if (cd) cd.textContent = 'Next daily tune in ' + nextDailyIn();
      if (todayNum() !== DAY && !playing) {
        DAY = todayNum();
        if (mode === 'daily') { startDaily(); render(); }
      }
    }, 20000);

    if (ctx.debug) {
      root._tg = {
        G: function () { return G; },
        answer: function () { return G.tune.title; },
        list: function () { return LIST.map(function (x) { return x.title; }); },
        durations: function () { return LIST.map(function (x) { var e = compile(x); return [x.id, +(e.length ? e[e.length - 1].t : 0).toFixed(1)]; }); },
      };
    }

    return {
      pause: function () { stopAudio(); loop.stop(); },
      resume: function () { loop.start(); },
      destroy: function () {
        destroyed = true;
        stopAudio();
        clearTimeout(revealTimer);
        clearInterval(cdTimer);
        loop.stop();
        col.removeEventListener('click', onClick);
        inputEl.removeEventListener('input', onInput);
        inputEl.removeEventListener('keydown', onInKey);
        inputEl.removeEventListener('focus', onFocus);
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', layout);
        vizView.destroy();
        bgView.destroy();
        if (AC && AC.close) { try { AC.close(); } catch (e) {} }
        AC = null;
        if (app.parentNode) app.parentNode.removeChild(app);
        if (style.parentNode) style.parentNode.removeChild(style);
      },
    };
  });
})();
