/*!
 * Element Craft — igame9 original drag-to-combine discovery game.
 * Drag discovered items from the library onto the workspace and drop one item
 * onto another to discover something new. Two content sets share this engine:
 *   variant "elements" — Elementa: 4 classical elements → 140+ items (nature, weather, life, tech, myth, space)
 *   variant "auras"    — Aura Forge: 4 base auras → 100+ auras with rarity tiers and a Fusion Altar
 *                        (legendary auras only fuse on the altar, with a success chance + cooldown)
 * All icons are drawn procedurally with Canvas 2D (glyph library below), so they look
 * identical on every OS.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Content sets                                                        */
  /* item:   'id|Name|glyph[/overlay]|mainColour|accentColour'           */
  /* recipe: 'a+b=result'   ('!' suffix = legendary, Fusion Altar only)  */
  /* ------------------------------------------------------------------ */
  var SETS = {
    elements: {
      title: 'Elementa',
      noun: 'element',
      start: ['water', 'fire', 'earth', 'air'],
      items: [
        'water|Water|drop|#2f8cff|#9fd4ff', 'fire|Fire|flame|#ff5a1f|#ffd23f', 'earth|Earth|rock|#8a5a2b|#c98d4f', 'air|Air|swirl|#7cc8f0|#e8f7ff',
        'steam|Steam|steam|#b9c9da|#ffffff', 'mud|Mud|puddle|#6b4a2b|#9c7046', 'lava|Lava|puddle|#ff4500|#ffb000', 'energy|Energy|bolt|#ffd400|#fff5a0',
        'dust|Dust|dots|#bfa58a|#e6d5bf', 'sea|Sea|waves|#1e6fd9|#7fc3ff', 'land|Land|hills|#4caf50|#a5d66f', 'wind|Wind|wind|#7fd3f7|#ffffff',
        'mist|Mist|fog|#a9bccf|#eef3f8', 'cloud|Cloud|cloud|#f2f7ff|#b3c8e0', 'rain|Rain|rain|#5aa9ff|#e8f0fa', 'stone|Stone|rock|#8c8f99|#c3c6cf',
        'sand|Sand|dune|#e8c27a|#f6e1a8', 'glass|Glass|pane|#8fdcf5|#ffffff', 'metal|Metal|ingot|#8b98aa|#dfe7f1', 'brick|Brick|brick|#c0502e|#e88a5e',
        'lightning|Lightning|bolt|#fff36b|#7a5cff', 'storm|Storm|storm|#5b6578|#ffe14d', 'plant|Plant|sprout|#3fbf4a|#9be36d', 'volcano|Volcano|volcano|#6d4c41|#ff5722',
        'ocean|Ocean|waves|#0d47a1|#42a5f5', 'wave|Wave|waves|#29b6f6|#e1f5fe', 'frost|Frost|snowflake|#5fc1f5|#ffffff', 'ice|Ice|cube|#a8e6ff|#e9fbff',
        'snow|Snow|snowflake|#ffffff|#b8dcff', 'sky|Sky|sky|#64b5f6|#ffffff', 'sun|Sun|sun|#ffb300|#fff176', 'moon|Moon|moon|#e0e4ff|#9aa3d6',
        'star|Star|star|#ffd640|#fff9c4', 'rainbow|Rainbow|rainbow|#ff5252|#40c4ff', 'night|Night|night|#3949ab|#e8eaff', 'eclipse|Eclipse|eclipse|#1d1d2b|#ffca28',
        'time|Time|hourglass|#c58b3a|#f4d58d', 'clock|Clock|clock|#8d5a3b|#fff3e0', 'swamp|Swamp|reeds|#556b2f|#8fbc5a', 'life|Life|heart|#ff4f81|#ffc1d3',
        'grass|Grass|grass|#43a047|#a5d6a7', 'tree|Tree|tree|#2e7d32|#8d6e63', 'forest|Forest|forest|#1b5e20|#66bb6a', 'flower|Flower|flower|#ff6fb5|#ffe082',
        'seed|Seed|seed|#a1785f|#e0c9b8', 'fruit|Fruit|apple|#e53935|#66bb6a', 'tool|Tool|hammer|#78909c|#a1887f', 'wood|Wood|log|#8d5a2b|#d7a86e',
        'coal|Coal|rock|#3a3b42|#6b6e78', 'paper|Paper|sheet|#fafafa|#90a4ae', 'book|Book|book|#6a3fb5|#f3e5f5', 'house|House|house|#e57373|#ffe0b2',
        'village|Village|village|#ef8a65|#fff3e0', 'city|City|city|#5c6bc0|#ffd54f', 'boat|Boat|boat|#8d5a2b|#ffffff', 'ship|Sailing Ship|ship|#6d4c41|#f5f5f5',
        'wheel|Wheel|wheel|#6d4c41|#bcaaa4', 'bicycle|Bicycle|bicycle|#e53935|#424242', 'engine|Engine|gear|#607d8b|#cfd8dc', 'car|Car|car|#e53935|#90caf9',
        'electricity|Electricity|bolt|#00e5ff|#ffffff', 'lamp|Lamp|bulb|#ffeb3b|#fff9c4', 'chip|Chip|chip|#2e7d32|#ffd54f', 'computer|Computer|monitor|#37474f|#4fc3f7',
        'internet|Internet|globe|#1e88e5|#b3e5fc', 'phone|Phone|phone|#263238|#80deea', 'robot|Robot|robot|#90a4ae|#ff7043', 'bird|Bird|bird|#42a5f5|#ffca28',
        'fish|Fish|fish|#ff8f00|#ffe082', 'animal|Animal|beast|#a1887f|#5d4037', 'egg|Egg|egg|#fff3e0|#ffb74d', 'lizard|Lizard|lizard|#7cb342|#dcedc8',
        'dragon|Dragon|dragon|#d32f2f|#ffca28', 'bug|Bug|bug|#e53935|#212121', 'bee|Bee|bee|#ffc107|#3e2723', 'honey|Honey|jar|#ffb300|#fff8e1',
        'butterfly|Butterfly|butterfly|#ab47bc|#4fc3f7', 'clay|Clay|rock|#c97b4a|#e8a87c', 'human|Human|person|#ffcc80|#5c6bc0', 'farm|Farm|house|#c62828|#ffffff',
        'wheat|Wheat|wheat|#fbc02d|#fff59d', 'bread|Bread|bread|#d48a3c|#f6c48a', 'cake|Cake|cake|#f48fb1|#fff8e1', 'cow|Cow|beast|#fafafa|#3e2723',
        'milk|Milk|cup|#ffffff|#90caf9', 'wolf|Wolf|beast|#78909c|#eceff1', 'dog|Dog|beast|#c58b4a|#5d4037', 'cat|Cat|beast|#ff9800|#fff3e0',
        'horse|Horse|beast|#8d6e63|#3e2723', 'unicorn|Unicorn|beast/horn|#ffffff|#f48fb1', 'pegasus|Pegasus|beast/wings|#e3f2fd|#90caf9', 'phoenix|Phoenix|bird/wings|#ff5722|#ffeb3b',
        'whale|Whale|whale|#3f51b5|#c5cae9', 'mermaid|Mermaid|tail|#26a69a|#ffcc80', 'magic|Magic|sparkle|#b388ff|#ffffff', 'wizard|Wizard|hat|#5e35b1|#ffd54f',
        'potion|Potion|potion|#7c4dff|#b9f6ca', 'golem|Golem|robot|#8c8f99|#4dd0e1', 'fairy|Fairy|person/wings|#f8bbd0|#80deea', 'ghost|Ghost|ghost|#f5f5ff|#9fa8da',
        'spellbook|Spellbook|book|#311b92|#ffd740', 'elixir|Elixir|potion|#ff4081|#fff176', 'mountain|Mountain|mountain|#78909c|#ffffff', 'giant|Giant|person|#a1887f|#4e342e',
        'castle|Castle|castle|#9e9e9e|#e53935', 'sword|Sword|sword|#cfd8dc|#8d6e63', 'knight|Knight|helmet|#b0bec5|#e53935', 'gold|Gold|ingot|#ffc107|#fff59d',
        'king|King|crown|#ffc107|#e53935', 'pirate|Pirate|flag|#263238|#ffffff', 'treasure|Treasure|chest|#8d5a2b|#ffc107', 'desert|Desert|dune|#f4a261|#ffe0a3',
        'oasis|Oasis|palm|#ffd180|#4fc3f7', 'cactus|Cactus|cactus|#43a047|#f48fb1', 'camel|Camel|beast|#d4a373|#7f5539', 'pyramid|Pyramid|pyramid|#e9c46a|#b5893a',
        'island|Island|palm|#ffcc80|#1e88e5', 'beach|Beach|beach|#f6d48f|#4fc3f7', 'continent|Continent|hills|#388e3c|#8bc34a', 'world|World|globe|#1565c0|#66bb6a',
        'planet|Planet|ring|#7e57c2|#ffcc80', 'galaxy|Galaxy|galaxy|#6a1b9a|#e1bee7', 'universe|Universe|galaxy|#1a1a40|#7c4dff', 'comet|Comet|comet|#80d8ff|#ffffff',
        'meteor|Meteor|comet|#ff7043|#ffd180', 'blizzard|Blizzard|cloud/snowflake|#cfd8dc|#e3f2fd', 'tornado|Tornado|tornado|#90a4ae|#eceff1', 'hurricane|Hurricane|swirl|#455a64|#80deea',
        'fog|Fog|fog|#cfd8dc|#90a4ae', 'hail|Hail|rain|#b3e5fc|#ffffff', 'aurora|Aurora|aurora|#00e676|#d500f9', 'geyser|Geyser|geyser|#4fc3f7|#8d6e63',
        'obsidian|Obsidian|crystal|#2b2140|#7e57c2', 'crystal|Crystal|crystal|#4dd0e1|#e0f7fa', 'diamond|Diamond|crystal|#e3f2fd|#81d4fa', 'river|River|river|#29b6f6|#66bb6a',
        'waterfall|Waterfall|waterfall|#4fc3f7|#78909c', 'bridge|Bridge|bridge|#8d6e63|#29b6f6', 'windmill|Windmill|windmill|#fff3e0|#e57373', 'lighthouse|Lighthouse|lighthouse|#e53935|#fff59d',
        'gunpowder|Gunpowder|barrel|#6d4c41|#ff7043', 'explosion|Explosion|burst|#ff6d00|#ffea00', 'firework|Firework|burst|#e040fb|#18ffff', 'plane|Airplane|plane|#eceff1|#1e88e5',
        'rocket|Rocket|rocket|#eceff1|#ff5722', 'satellite|Satellite|satellite|#b0bec5|#1e88e5', 'astronaut|Astronaut|spacehelm|#eceff1|#4fc3f7', 'telescope|Telescope|telescope|#5d4037|#ffd54f',
      ],
      recipes:
        'water+fire=steam water+earth=mud fire+earth=lava fire+air=energy earth+air=dust water+water=sea earth+earth=land air+air=wind air+water=mist ' +
        'steam+air=cloud cloud+water=rain lava+water=stone stone+wind=sand sand+fire=glass stone+fire=metal mud+fire=brick cloud+energy=lightning ' +
        'cloud+wind=storm rain+earth=plant lava+land=volcano sea+sea=ocean sea+wind=wave mist+wind=frost water+frost=ice rain+frost=snow cloud+air=sky ' +
        'sky+fire=sun sky+stone=moon sky+energy=star rain+sun=rainbow moon+sky=night sun+moon=eclipse sand+glass=time time+tool=clock mud+plant=swamp ' +
        'swamp+energy=life plant+earth=grass plant+land=tree tree+tree=forest plant+sun=flower flower+wind=seed tree+flower=fruit metal+stone=tool ' +
        'tree+tool=wood wood+fire=coal wood+water=paper paper+paper=book brick+wood=house house+house=village village+village=city wood+sea=boat ' +
        'boat+wind=ship wood+tool=wheel wheel+wheel=bicycle steam+metal=engine engine+wheel=car metal+lightning=electricity electricity+glass=lamp ' +
        'sand+electricity=chip chip+metal=computer computer+computer=internet computer+wave=phone metal+life=robot life+sky=bird life+sea=fish ' +
        'life+land=animal life+stone=egg egg+swamp=lizard lizard+fire=dragon life+dust=bug bug+flower=bee bee+tree=honey bug+rainbow=butterfly ' +
        'mud+sand=clay clay+life=human human+land=farm farm+seed=wheat wheat+fire=bread bread+honey=cake animal+grass=cow cow+human=milk ' +
        'animal+moon=wolf wolf+human=dog animal+house=cat animal+wind=horse horse+rainbow=unicorn horse+bird=pegasus bird+fire=phoenix fish+ocean=whale ' +
        'fish+human=mermaid rainbow+energy=magic human+magic=wizard magic+water=potion stone+magic=golem butterfly+magic=fairy mist+night=ghost ' +
        'book+magic=spellbook potion+life=elixir stone+land=mountain human+mountain=giant house+stone=castle tool+metal=sword human+sword=knight ' +
        'metal+sun=gold knight+castle=king human+ship=pirate pirate+gold=treasure sand+sand=desert desert+water=oasis desert+plant=cactus ' +
        'desert+animal=camel desert+brick=pyramid sea+land=island sand+sea=beach land+land=continent continent+ocean=world world+sky=planet ' +
        'star+star=galaxy galaxy+galaxy=universe star+ice=comet star+stone=meteor snow+storm=blizzard storm+wind=tornado storm+ocean=hurricane ' +
        'cloud+land=fog rain+ice=hail night+rainbow=aurora steam+earth=geyser lava+ice=obsidian stone+energy=crystal coal+volcano=diamond ' +
        'water+land=river river+mountain=waterfall river+wood=bridge wind+house=windmill lamp+house=lighthouse dust+fire=gunpowder ' +
        'gunpowder+fire=explosion gunpowder+star=firework engine+bird=plane plane+star=rocket rocket+computer=satellite human+rocket=astronaut ' +
        'glass+star=telescope',
    },
    auras: {
      title: 'Aura Forge',
      noun: 'aura',
      start: ['aqua', 'ember', 'terra', 'zephyr'],
      items: [
        'aqua|Aqua|drop|#36a3ff|#c8ecff', 'ember|Ember|flame|#ff6a2a|#ffd76a', 'terra|Terra|rock|#b07a43|#e8c08a', 'zephyr|Zephyr|swirl|#5fd8c8|#effffb',
        'vapor|Vapor|steam|#cfdcea|#ffffff', 'magma|Magma|puddle|#ff4d1a|#ffb02e', 'mire|Mire|reeds|#6f7d3c|#b9c46a', 'spark|Spark|bolt|#ffe14a|#fffbe0',
        'dune|Dune|dune|#f0c27a|#fff0c8', 'mist|Mist|fog|#b4c6de|#f4f8ff', 'tide|Tide|waves|#2a7bea|#9ad3ff', 'inferno|Inferno|flame|#e8202a|#ff9a3c',
        'quake|Quake|mountain|#8a6b52|#e8d8c4', 'gust|Gust|wind|#9debff|#ffffff', 'nimbus|Nimbus|cloud|#eef4ff|#a9bfe0', 'drizzle|Drizzle|rain|#6cb6ff|#e2eefb',
        'thunder|Thunder|storm|#59627a|#ffe14a', 'frost|Frost|snowflake|#7fd4ff|#ffffff', 'glacier|Glacier|cube|#a6ecff|#ecfdff', 'snowfall|Snowfall|cloud/snowflake|#f2f7ff|#9cc9f0',
        'obsidian|Obsidian|crystal|#3a2b5c|#9b7bff', 'volcano|Volcano|volcano|#5d4037|#ff5722', 'sandstorm|Sandstorm|tornado|#d9a85b|#ffe2a8', 'mirage|Mirage|pane|#ffd48a|#fff6dc',
        'bloom|Bloom|sprout|#4cd964|#b6f59a', 'verdant|Verdant|grass|#2fbf5a|#b5f0a0', 'grove|Grove|forest|#1e7a3c|#7fd88f', 'petal|Petal|flower|#ff7ac0|#fff1a8',
        'azure|Azure|sky|#4ea8ff|#ffffff', 'solar|Solar|sun|#ffb000|#fff27a', 'lunar|Lunar|moon|#e4e8ff|#9aa5e0', 'stellar|Stellar|star|#ffe46b|#fffbd6',
        'radiance|Radiance|sparkle|#ffe86a|#ffffff', 'eclipse|Eclipse|eclipse|#1a1430|#ffcf40', 'umbra|Umbra|moon|#6a55c0|#2a1f58', 'void|Void|galaxy|#1c1238|#7a5cff',
        'vital|Vital|heart|#ff4f86|#ffc4d6', 'spirit|Spirit|ghost|#e8f0ff|#9fb0ff', 'toxic|Toxic|potion|#7dff4a|#3a7a1a', 'venom|Venom|drop|#a2ff3a|#6a1aa8',
        'coral|Coral|tree|#ff7f8a|#ffd2c4', 'abyss|Abyss|waves|#14286a|#2f6bff', 'tempest|Tempest|storm|#3b4560|#9adfff', 'cyclone|Cyclone|tornado|#8fa6c0|#e6f0ff',
        'maelstrom|Maelstrom|galaxy|#0d3a7a|#5fd0ff', 'volt|Volt|bolt|#3ae6ff|#ffffff', 'plasma|Plasma|burst|#ff3ad8|#ffd0f6', 'ash|Ash|dots|#8a8a96|#c8c8d2',
        'cinder|Cinder|flame|#8a2f1a|#ff7a2a', 'ore|Ore|rock|#6c6878|#ffb74d', 'forge|Forge|hammer|#5a5f6e|#ff8a3c', 'steel|Steel|ingot|#a8b4c4|#eef3f8',
        'cog|Cog|gear|#8a96a8|#d8dee8', 'circuit|Circuit|chip|#1f8a5a|#7dffc0', 'neon|Neon|bulb|#ff4fd8|#fff0fb', 'glitchwave|Glitchwave|monitor|#2a1f4a|#39ffb0',
        'hologram|Hologram|cube|#5ff0ff|#d8fbff', 'datastream|Datastream|rain|#1f4a33|#3aff7a', 'automaton|Automaton|robot|#9aa6b8|#ff7a3c', 'joy|Joy|flower|#ffd23a|#ff8a3a',
        'sorrow|Sorrow|rain|#4a5a8a|#a8b8e0', 'rage|Rage|burst|#ff2a2a|#ffb03a', 'serene|Serene|waves|#7fd8e8|#e8fbff', 'hope|Hope|heart|#ffd24a|#fff6c8',
        'dream|Dream|cloud|#d8c4ff|#fff0ff', 'nightmare|Nightmare|ghost|#3a2a5a|#ff3a6a', 'prism|Prism|crystal|#c8f0ff|#ff9ae0', 'spectrum|Spectrum|rainbow|#ff5a5a|#5ac8ff',
        'borealis|Borealis|aurora|#3affa0|#c03aff', 'comet|Comet|comet|#8ae0ff|#ffffff', 'starfall|Starfall|comet|#ff8a3a|#ffe08a', 'nebula|Nebula|galaxy|#ff6ad0|#ffd0f0',
        'galactic|Galactic|galaxy|#5a2aa8|#e0c8ff', 'horizon|Event Horizon|ring|#14141f|#ff9a3a', 'cosmos|Cosmos|star|#9a6aff|#e8dcff', 'quartz|Quartz|crystal|#f0e6ff|#c8a8ff',
        'thornveil|Thornveil|cactus|#2f7a3a|#e04a9a', 'wildwind|Wildwind|wind|#6ae08a|#e8ffe8', 'feral|Feral|beast|#c08a4a|#5a3a1a', 'moonhowl|Moonhowl|beast|#9aa6c0|#e8ecff',
        'skywing|Skywing|bird|#5ab8ff|#ffe08a', 'wyrm|Wyrm|lizard|#6ac04a|#e0ff8a', 'drake|Drake|dragon|#d83a3a|#ffcf40', 'seraph|Seraph|person/wings|#fff6d8|#ffd24a',
        'infernal|Infernal|flame/horn|#a01428|#ff6a2a', 'wraith|Wraith|ghost|#5a6a8a|#c8d8ff', 'chrono|Chrono|hourglass|#c89a4a|#ffe6a8', 'clockwork|Clockwork|clock|#a8743a|#fff0d8',
        'paradox|Paradox|hourglass|#7a3aff|#3affe0', 'frostfire|Frostfire|flame|#3ad8ff|#e8ffff', 'golem|Golem|robot|#8a7a6a|#3affd0', 'sakura|Sakura|flower|#ffb0d0|#ffffff',
        'miasma|Miasma|cloud|#9ad04a|#e8ffb0', 'sunflare|Sunflare|sun|#ff4a1a|#ffd03a', 'moonstone|Moonstone|crystal|#dfe6ff|#a0b0ff', 'starlight|Starlight|star|#fffbe8|#ffe27a',
        'constellation|Constellation|sparkle|#8ab8ff|#ffffff', 'bloodmoon|Blood Moon|moon|#d8203a|#ff9aa8', 'frostheart|Frostheart|heart|#7ae0ff|#e8ffff', 'mirrorshard|Mirrorshard|pane|#d8e4f0|#ffffff',
        'pulse|Pulse|bolt|#ff5a9a|#ffe0ee', 'spectral|Spectral|ghost|#c8b0ff|#7affe0', 'ethereal|Ethereal|fog|#d8c8ff|#ffffff', 'ink|Ink|drop|#23233a|#7a7ab0',
        'pixel|Pixel|dots|#ff4a8a|#4affd8', 'overclock|Overclock|chip|#c0301a|#ffb03a', 'quantum|Quantum|sparkle|#3affd8|#c8a8ff', 'gravity|Gravity Well|ring|#3a2a6a|#a88aff',
        'tsunami|Tsunami|waves|#1a5ad8|#e8f8ff', 'monsoon|Monsoon|rain|#2a5a8a|#8ad0ff', 'whiteout|Whiteout|cloud/snowflake|#ffffff|#c8d8e8', 'permafrost|Permafrost|cube|#8ab0c8|#6a5a4a',
        'geyser|Geyser|geyser|#7ad8ff|#a0785a', 'ashstorm|Ashstorm|tornado|#6a6a7a|#c8c0c0',
        'leviathan|Leviathan|whale|#0a3a8a|#3affe0', 'phoenix|Everflame Phoenix|bird/wings|#ff5a1a|#ffe03a', 'worldroot|World Root|tree|#2a8a3a|#ffd84a', 'skyserpent|Skyserpent|dragon|#3a9aff|#e8f8ff',
        'stormcaller|Stormcaller|storm|#2a2a4a|#ffd84a', 'titan|Glacial Titan|robot|#9ad8ff|#ffffff', 'singularity|Singularity|ring|#000000|#ff3ad8', 'veil|Aurora Veil|aurora|#3affd8|#ff8aff',
        'prismheart|Prismheart|heart|#ff9ae0|#9ae8ff', 'sovereign|Chrono Sovereign|hourglass|#ffd84a|#7a3aff', 'dawn|Seraphic Dawn|sun|#fff2c8|#ff9a6a', 'genesis|Genesis|sparkle|#ffffff|#ffd84a',
      ],
      recipes:
        'aqua+ember=vapor ember+terra=magma aqua+terra=mire ember+zephyr=spark terra+zephyr=dune aqua+zephyr=mist aqua+aqua=tide ember+ember=inferno ' +
        'terra+terra=quake zephyr+zephyr=gust vapor+zephyr=nimbus nimbus+aqua=drizzle nimbus+spark=thunder mist+gust=frost frost+tide=glacier ' +
        'drizzle+frost=snowfall magma+aqua=obsidian magma+quake=volcano dune+gust=sandstorm dune+inferno=mirage drizzle+terra=bloom bloom+bloom=verdant ' +
        'verdant+terra=grove bloom+zephyr=petal nimbus+zephyr=azure azure+inferno=solar azure+frost=lunar azure+spark=stellar solar+azure=radiance ' +
        'solar+lunar=eclipse lunar+mist=umbra umbra+umbra=void bloom+spark=vital vital+mist=spirit mire+bloom=toxic toxic+vital=venom tide+vital=coral ' +
        'tide+void=abyss thunder+gust=tempest tempest+gust=cyclone tempest+tide=maelstrom thunder+thunder=volt volt+inferno=plasma inferno+terra=ash ' +
        'ash+ember=cinder obsidian+quake=ore ore+inferno=forge forge+aqua=steel steel+steel=cog cog+volt=circuit volt+mist=neon circuit+void=glitchwave ' +
        'circuit+mirage=hologram circuit+drizzle=datastream cog+vital=automaton solar+bloom=joy drizzle+umbra=sorrow inferno+thunder=rage tide+mist=serene ' +
        'radiance+vital=hope lunar+nimbus=dream dream+umbra=nightmare mirage+radiance=prism drizzle+solar=spectrum spectrum+lunar=borealis ' +
        'stellar+glacier=comet stellar+quake=starfall stellar+mist=nebula nebula+stellar=galactic void+galactic=horizon galactic+galactic=cosmos ' +
        'obsidian+radiance=quartz grove+venom=thornveil grove+gust=wildwind vital+terra=feral feral+lunar=moonhowl vital+azure=skywing venom+feral=wyrm ' +
        'wyrm+inferno=drake spirit+radiance=seraph spirit+inferno=infernal spirit+umbra=wraith dune+mirage=chrono chrono+cog=clockwork chrono+glitchwave=paradox ' +
        'frost+inferno=frostfire quake+automaton=golem petal+gust=sakura toxic+nimbus=miasma solar+plasma=sunflare lunar+quartz=moonstone ' +
        'stellar+radiance=starlight stellar+stellar=constellation lunar+rage=bloodmoon glacier+vital=frostheart mirage+steel=mirrorshard vital+volt=pulse ' +
        'spirit+spectrum=spectral spirit+azure=ethereal umbra+tide=ink glitchwave+prism=pixel circuit+inferno=overclock cosmos+circuit=quantum ' +
        'quake+void=gravity tide+quake=tsunami drizzle+tempest=monsoon snowfall+gust=whiteout glacier+terra=permafrost vapor+quake=geyser ash+gust=ashstorm ' +
        'abyss+maelstrom=leviathan! cinder+hope=phoenix! grove+spirit=worldroot! drake+tempest=skyserpent! volt+cyclone=stormcaller! golem+glacier=titan! ' +
        'horizon+glitchwave=singularity! borealis+spirit=veil! prism+hope=prismheart! paradox+clockwork=sovereign! seraph+solar=dawn! singularity+worldroot=genesis!',
    },
  };

  // Rarity tiers (auras). Non-legendary rarity comes from recipe depth.
  var RARITY = [
    { id: 'common', name: 'Common', col: '#c9d2e3' },
    { id: 'uncommon', name: 'Uncommon', col: '#4ade80' },
    { id: 'rare', name: 'Rare', col: '#38bdf8' },
    { id: 'epic', name: 'Epic', col: '#c084fc' },
    { id: 'mythic', name: 'Mythic', col: '#fb7185' },
    { id: 'legendary', name: 'Legendary', col: '#fbbf24' },
  ];

  function pairKey(a, b) {
    return a < b ? a + '+' + b : b + '+' + a;
  }

  // Parse a content set into lookup tables (done once per mount; cheap).
  function buildSet(src) {
    var items = {};
    var order = [];
    src.items.forEach(function (s) {
      var p = s.split('|');
      var g = p[2].split('/');
      items[p[0]] = { id: p[0], name: p[1], glyph: g[0], over: g[1] || '', c1: p[3], c2: p[4], depth: -1, rarity: 0, legendary: false };
      order.push(p[0]);
    });
    var recipes = {};
    var uses = {};
    var made = {};
    src.recipes.split(/\s+/).forEach(function (r) {
      if (!r) return;
      var leg = r.charAt(r.length - 1) === '!';
      if (leg) r = r.slice(0, -1);
      var m = r.split('=');
      var ab = m[0].split('+');
      var key = pairKey(ab[0], ab[1]);
      recipes[key] = { a: ab[0], b: ab[1], r: m[1], altar: leg };
      made[m[1]] = recipes[key];
      (uses[ab[0]] = uses[ab[0]] || []).push(key);
      if (ab[1] !== ab[0]) (uses[ab[1]] = uses[ab[1]] || []).push(key);
      if (leg && items[m[1]]) items[m[1]].legendary = true;
    });
    // Depth = generations away from the starting items (drives aura rarity).
    src.start.forEach(function (id) { items[id].depth = 0; });
    for (var pass = 0; pass < 40; pass++) {
      var changed = false;
      for (var k in recipes) {
        var rc = recipes[k];
        var da = items[rc.a].depth, db = items[rc.b].depth;
        if (da < 0 || db < 0) continue;
        var d = Math.max(da, db) + 1;
        var it = items[rc.r];
        if (it.depth < 0 || d < it.depth) { it.depth = d; changed = true; }
      }
      if (!changed) break;
    }
    order.forEach(function (id) {
      var it = items[id];
      it.rarity = it.legendary ? 5 : it.depth <= 1 ? 0 : it.depth <= 3 ? 1 : it.depth <= 5 ? 2 : it.depth <= 6 ? 3 : 4;
    });
    return { title: src.title, noun: src.noun, start: src.start, items: items, order: order, recipes: recipes, uses: uses, made: made, total: order.length };
  }

  /* ------------------------------------------------------------------ */
  /* Colour helpers                                                      */
  /* ------------------------------------------------------------------ */
  var TAU = Math.PI * 2;
  function rgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // mix(hex, hex2, t) → css rgb string
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }
  function shade(a, t) {
    return t >= 0 ? mix(a, '#ffffff', t) : mix(a, '#000000', -t);
  }
  function rgba(hex, al) {
    var x = rgb(hex);
    return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + al + ')';
  }

  /* ------------------------------------------------------------------ */
  /* Glyph library — every icon is drawn in a 0..100 box.                */
  /* g = 2D context with outline style preset; a = main, b = accent.     */
  /* ------------------------------------------------------------------ */
  var OL = '#1b1c33';
  var LW = 3.6;
  function B(g) { g.beginPath(); }
  function F(g, c) { g.fillStyle = c; g.fill(); g.stroke(); }
  function FO(g, c) { g.fillStyle = c; g.fill(); }
  function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
  function ell(g, x, y, rx, ry, rot) {
    rot = rot || 0;
    g.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
    g.ellipse(x, y, rx, ry, rot, 0, TAU);
  }
  function rr(g, x, y, w, h, r) {
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function poly(g, p) {
    g.moveTo(p[0], p[1]);
    for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
  }
  // Union of shapes with a single clean outline: stroke double width, then fill.
  function blob(g, build, c) {
    B(g);
    build();
    var lw = g.lineWidth;
    g.lineWidth = lw * 2;
    g.stroke();
    g.lineWidth = lw;
    FO(g, c);
  }
  function circles(g, list, c) {
    blob(g, function () { list.forEach(function (k) { circ(g, k[0], k[1], k[2]); }); }, c);
  }
  // Outlined thick line ("tube").
  function tube(g, build, c, w) {
    B(g);
    build();
    var lw = g.lineWidth, sc = g.strokeStyle;
    g.lineWidth = w + lw * 2;
    g.stroke();
    g.lineWidth = w;
    g.strokeStyle = c;
    g.stroke();
    g.lineWidth = lw;
    g.strokeStyle = sc;
  }
  function line(g, x1, y1, x2, y2, c, w) {
    tube(g, function () { g.moveTo(x1, y1); g.lineTo(x2, y2); }, c, w);
  }
  function shine(g, x, y, rx, ry, rot) {
    B(g);
    ell(g, x, y, rx, ry, rot || -0.5);
    FO(g, 'rgba(255,255,255,0.55)');
  }
  function star5(g, x, y, r, r2) {
    for (var i = 0; i < 10; i++) {
      var an = -Math.PI / 2 + (i * Math.PI) / 5;
      var rad = i % 2 ? r2 : r;
      if (i) g.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad);
      else g.moveTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad);
    }
    g.closePath();
  }
  function star4(g, x, y, r) {
    var t = r * 0.28;
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x + t, y - t, x + r, y);
    g.quadraticCurveTo(x + t, y + t, x, y + r);
    g.quadraticCurveTo(x - t, y + t, x - r, y);
    g.quadraticCurveTo(x - t, y - t, x, y - r);
    g.closePath();
  }
  // Draw another glyph scaled into a sub-box (keeps outline width constant).
  function sub(g, fn, x, y, s, a, b) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    var lw = g.lineWidth;
    g.lineWidth = lw / s;
    fn(g, a, b);
    g.lineWidth = lw;
    g.restore();
  }
  function smallDrop(g, x, y, s, c) {
    B(g);
    g.moveTo(x, y - 9 * s);
    g.bezierCurveTo(x + 3 * s, y - 4 * s, x + 6 * s, y, x + 6 * s, y + 3 * s);
    g.arc(x, y + 3 * s, 6 * s, 0, Math.PI);
    g.bezierCurveTo(x - 6 * s, y, x - 3 * s, y - 4 * s, x, y - 9 * s);
    F(g, c);
  }
  function crescent(g, cx, cy, s, c) {
    B(g);
    g.moveTo(cx + 6 * s, cy - 32 * s);
    g.bezierCurveTo(cx - 20 * s, cy - 28 * s, cx - 28 * s, cy, cx - 18 * s, cy + 18 * s);
    g.bezierCurveTo(cx - 8 * s, cy + 34 * s, cx + 16 * s, cy + 38 * s, cx + 30 * s, cy + 22 * s);
    g.bezierCurveTo(cx + 8 * s, cy + 26 * s, cx - 8 * s, cy + 10 * s, cx - 6 * s, cy - 8 * s);
    g.bezierCurveTo(cx - 4 * s, cy - 20 * s, cx, cy - 26 * s, cx + 6 * s, cy - 32 * s);
    F(g, c);
  }
  function pine(g, x, y, s, c) {
    B(g);
    rr(g, x - 3 * s, y - 12 * s, 6 * s, 12 * s, 1);
    F(g, '#6d4c41');
    B(g);
    poly(g, [x, y - 56 * s, x + 16 * s, y - 30 * s, x + 9 * s, y - 30 * s, x + 20 * s, y - 10 * s, x - 20 * s, y - 10 * s, x - 9 * s, y - 30 * s, x - 16 * s, y - 30 * s]);
    F(g, c);
  }
  function wingShape(g, x, y, s, flip, c) {
    g.save();
    g.translate(x, y);
    g.scale(flip ? -s : s, s);
    var lw = g.lineWidth;
    g.lineWidth = lw / s;
    B(g);
    g.moveTo(0, 0);
    g.bezierCurveTo(-2, -26, 20, -40, 36, -34);
    g.bezierCurveTo(30, -26, 32, -20, 24, -18);
    g.bezierCurveTo(30, -12, 26, -6, 18, -6);
    g.bezierCurveTo(20, 0, 12, 4, 0, 0);
    F(g, c);
    g.lineWidth = lw;
    g.restore();
  }

  var G = {
    drop: function (g, a) {
      B(g); g.moveTo(50, 10); g.bezierCurveTo(60, 30, 76, 44, 76, 62); g.arc(50, 62, 26, 0, Math.PI); g.bezierCurveTo(24, 44, 40, 30, 50, 10); F(g, a);
      shine(g, 40, 62, 5, 10, 0.3);
    },
    flame: function (g, a, b) {
      B(g); g.moveTo(50, 8); g.bezierCurveTo(56, 28, 78, 40, 76, 62); g.bezierCurveTo(75, 80, 62, 90, 50, 90); g.bezierCurveTo(37, 90, 24, 80, 24, 63);
      g.bezierCurveTo(24, 50, 32, 42, 36, 34); g.bezierCurveTo(38, 44, 42, 48, 46, 50); g.bezierCurveTo(44, 36, 46, 20, 50, 8); F(g, a);
      B(g); g.moveTo(50, 46); g.bezierCurveTo(58, 58, 64, 66, 62, 74); g.bezierCurveTo(60, 86, 40, 86, 38, 74); g.bezierCurveTo(37, 66, 44, 58, 50, 46); F(g, b);
    },
    rock: function (g, a, b) {
      B(g); poly(g, [16, 76, 24, 46, 44, 28, 66, 32, 82, 52, 86, 76]); F(g, a);
      B(g); poly(g, [44, 28, 66, 32, 60, 50, 36, 48]); F(g, b);
      B(g); poly(g, [24, 46, 36, 48, 30, 64]); FO(g, shade(a, -0.18));
      B(g); circ(g, 64, 64, 4); circ(g, 46, 66, 3); FO(g, shade(a, -0.25));
    },
    swirl: function (g, a, b) {
      tube(g, function () { g.moveTo(14, 40); g.bezierCurveTo(34, 20, 72, 22, 76, 42); g.bezierCurveTo(80, 58, 56, 64, 52, 50); }, a, 8);
      tube(g, function () { g.moveTo(22, 64); g.bezierCurveTo(42, 56, 64, 62, 68, 72); g.bezierCurveTo(70, 82, 58, 86, 54, 78); }, b, 7);
      tube(g, function () { g.moveTo(12, 54); g.lineTo(40, 54); }, a, 6);
    },
    cloud: function (g, a, b) {
      circles(g, [[32, 60, 16], [50, 46, 20], [68, 58, 16], [50, 64, 14]], a);
      B(g); ell(g, 52, 68, 22, 5); FO(g, rgba(b, 0.55));
    },
    steam: function (g, a) {
      for (var i = 0; i < 3; i++) {
        var x = 32 + i * 18;
        tube(g, function () { g.moveTo(x, 86); g.bezierCurveTo(x - 10, 72, x + 10, 60, x, 48); g.bezierCurveTo(x - 10, 36, x + 8, 26, x, 14); }, a, 8);
      }
    },
    puddle: function (g, a, b) {
      blob(g, function () { ell(g, 50, 66, 36, 18); ell(g, 38, 52, 16, 12); ell(g, 62, 54, 14, 10); }, a);
      B(g); circ(g, 40, 62, 5); circ(g, 62, 68, 4); circ(g, 54, 52, 3); F(g, b);
    },
    bolt: function (g, a, b) {
      B(g); poly(g, [58, 8, 24, 56, 46, 56, 38, 92, 78, 40, 55, 40, 66, 8]); F(g, a);
      B(g); poly(g, [58, 14, 34, 50, 44, 50, 54, 22]); FO(g, rgba(b, 0.7));
    },
    dots: function (g, a, b) {
      var d = [[34, 40, 12, a], [62, 32, 9, b], [58, 60, 14, a], [30, 68, 8, b], [78, 60, 7, a], [46, 82, 5, b]];
      d.forEach(function (k) { B(g); circ(g, k[0], k[1], k[2]); F(g, k[3]); });
    },
    waves: function (g, a, b) {
      B(g); g.moveTo(12, 50); g.bezierCurveTo(22, 36, 32, 36, 38, 48); g.bezierCurveTo(46, 36, 58, 36, 64, 48); g.bezierCurveTo(72, 36, 82, 36, 88, 48);
      g.lineTo(88, 80); g.quadraticCurveTo(88, 86, 82, 86); g.lineTo(18, 86); g.quadraticCurveTo(12, 86, 12, 80); g.closePath(); F(g, a);
      tube(g, function () { g.moveTo(20, 68); g.bezierCurveTo(28, 60, 36, 60, 42, 68); g.bezierCurveTo(50, 60, 58, 60, 64, 68); g.bezierCurveTo(70, 60, 78, 60, 82, 68); }, b, 5);
    },
    hills: function (g, a, b) {
      B(g); g.moveTo(8, 82); g.bezierCurveTo(22, 34, 50, 34, 64, 82); g.closePath(); F(g, b);
      B(g); g.moveTo(34, 82); g.bezierCurveTo(52, 28, 80, 32, 92, 82); g.closePath(); F(g, a);
      B(g); circ(g, 70, 54, 3); circ(g, 58, 64, 3); FO(g, shade(a, 0.35));
    },
    wind: function (g, a, b) {
      tube(g, function () { g.moveTo(14, 36); g.lineTo(60, 36); g.bezierCurveTo(74, 36, 76, 20, 64, 20); g.bezierCurveTo(56, 20, 56, 30, 62, 30); }, a, 7);
      tube(g, function () { g.moveTo(14, 54); g.lineTo(74, 54); g.bezierCurveTo(90, 54, 90, 74, 76, 74); g.bezierCurveTo(68, 74, 68, 64, 74, 64); }, a, 7);
      tube(g, function () { g.moveTo(20, 72); g.lineTo(50, 72); }, b, 6);
    },
    fog: function (g, a, b) {
      line(g, 16, 32, 68, 32, a, 8); line(g, 30, 47, 86, 47, b, 8); line(g, 14, 62, 64, 62, a, 8); line(g, 36, 77, 82, 77, b, 8);
    },
    rain: function (g, a, b) {
      circles(g, [[34, 40, 14], [52, 32, 17], [70, 42, 12], [52, 46, 12]], b);
      smallDrop(g, 32, 70, 1, a); smallDrop(g, 52, 80, 1, a); smallDrop(g, 72, 68, 1, a);
    },
    dune: function (g, a, b) {
      B(g); g.moveTo(8, 72); g.bezierCurveTo(26, 48, 46, 46, 60, 60); g.bezierCurveTo(70, 50, 84, 48, 92, 56); g.lineTo(92, 86); g.lineTo(8, 86); g.closePath(); F(g, a);
      tube(g, function () { g.moveTo(20, 76); g.bezierCurveTo(34, 66, 48, 66, 60, 74); }, b, 4);
      B(g); circ(g, 70, 26, 10); F(g, shade(a, 0.45));
    },
    pane: function (g, a) {
      B(g); rr(g, 20, 14, 60, 72, 6); F(g, rgba(a, 0.85));
      g.save(); B(g); rr(g, 20, 14, 60, 72, 6); g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 5;
      B(g); g.moveTo(26, 50); g.lineTo(58, 18); g.moveTo(30, 66); g.lineTo(74, 22); g.stroke();
      g.restore();
      B(g); rr(g, 20, 14, 60, 72, 6); g.stroke();
    },
    ingot: function (g, a, b) {
      B(g); poly(g, [14, 72, 86, 72, 76, 46, 24, 46]); F(g, a);
      B(g); poly(g, [24, 46, 76, 46, 68, 32, 32, 32]); F(g, b);
      B(g); poly(g, [30, 64, 46, 52, 50, 52, 34, 64]); FO(g, 'rgba(255,255,255,0.5)');
    },
    brick: function (g, a, b) {
      var rows = [[16, 26, 32], [50, 26, 34], [16, 46, 16], [34, 46, 32], [68, 46, 16], [16, 66, 32], [50, 66, 34]];
      rows.forEach(function (k, i) { B(g); rr(g, k[0], k[1], k[2], 18, 3); F(g, i % 3 === 1 ? b : a); });
    },
    storm: function (g, a, b) {
      circles(g, [[32, 42, 15], [52, 34, 19], [70, 44, 14], [50, 50, 14]], a);
      B(g); poly(g, [54, 52, 38, 74, 50, 74, 42, 94, 66, 66, 54, 66, 60, 52]); F(g, b);
    },
    sprout: function (g, a, b) {
      B(g); ell(g, 50, 82, 28, 8); F(g, '#8d6e63');
      tube(g, function () { g.moveTo(50, 80); g.bezierCurveTo(50, 66, 48, 56, 50, 44); }, a, 6);
      B(g); ell(g, 34, 46, 17, 8, -0.5); F(g, a);
      B(g); ell(g, 66, 38, 18, 9, 0.5); F(g, b);
    },
    volcano: function (g, a, b) {
      circles(g, [[46, 20, 8], [56, 13, 7], [64, 21, 6]], '#cfd8dc');
      B(g); poly(g, [8, 86, 38, 34, 62, 34, 92, 86]); F(g, a);
      B(g); poly(g, [38, 34, 62, 34, 60, 46, 54, 42, 50, 56, 46, 42, 40, 48]); F(g, b);
      B(g); poly(g, [64, 50, 70, 62, 66, 60]); FO(g, b);
    },
    snowflake: function (g, a, b) {
      for (var k = 0; k < 6; k++) {
        var an = (k * Math.PI) / 3 - Math.PI / 2, c = Math.cos(an), s = Math.sin(an);
        line(g, 50, 50, 50 + c * 36, 50 + s * 36, a, 6);
        var mx = 50 + c * 22, my = 50 + s * 22;
        line(g, mx, my, mx + Math.cos(an + 0.7) * 11, my + Math.sin(an + 0.7) * 11, a, 4);
        line(g, mx, my, mx + Math.cos(an - 0.7) * 11, my + Math.sin(an - 0.7) * 11, a, 4);
      }
      B(g); circ(g, 50, 50, 7); F(g, b);
    },
    cube: function (g, a, b) {
      B(g); poly(g, [50, 14, 84, 32, 50, 50, 16, 32]); F(g, b);
      B(g); poly(g, [16, 32, 50, 50, 50, 86, 16, 68]); F(g, a);
      B(g); poly(g, [50, 50, 84, 32, 84, 68, 50, 86]); F(g, shade(a, -0.18));
      B(g); poly(g, [24, 42, 30, 45, 30, 64, 24, 61]); FO(g, 'rgba(255,255,255,0.6)');
    },
    sky: function (g, a, b) {
      B(g); rr(g, 12, 16, 76, 68, 16); F(g, a);
      B(g); circ(g, 66, 38, 11); F(g, '#ffd54f');
      circles(g, [[34, 62, 11], [48, 55, 14], [62, 63, 10]], b);
    },
    sun: function (g, a, b) {
      for (var k = 0; k < 8; k++) {
        var an = (k * TAU) / 8;
        B(g); poly(g, [50 + Math.cos(an - 0.2) * 26, 50 + Math.sin(an - 0.2) * 26, 50 + Math.cos(an) * 44, 50 + Math.sin(an) * 44, 50 + Math.cos(an + 0.2) * 26, 50 + Math.sin(an + 0.2) * 26]);
        F(g, a);
      }
      B(g); circ(g, 50, 50, 24); F(g, b);
      shine(g, 42, 42, 7, 4, -0.7);
    },
    moon: function (g, a, b) {
      crescent(g, 50, 50, 1, a);
      B(g); circ(g, 34, 54, 4); circ(g, 42, 72, 3); FO(g, b);
    },
    star: function (g, a, b) {
      B(g); star5(g, 50, 53, 42, 18); F(g, a);
      B(g); star5(g, 50, 53, 18, 8); FO(g, rgba(b, 0.8));
    },
    rainbow: function (g) {
      var cols = ['#ff5252', '#ffab40', '#ffee58', '#66bb6a', '#42a5f5', '#7e57c2'];
      B(g); g.arc(50, 70, 42, Math.PI, TAU); g.arc(50, 70, 13, TAU, Math.PI, true); g.closePath(); F(g, '#ffffff');
      for (var i = 0; i < cols.length; i++) {
        B(g); g.arc(50, 70, 38.5 - i * 4.6, Math.PI, TAU);
        var lw = g.lineWidth, sc = g.strokeStyle;
        g.lineWidth = 4.8; g.strokeStyle = cols[i]; g.stroke(); g.lineWidth = lw; g.strokeStyle = sc;
      }
      circles(g, [[12, 72, 8], [22, 75, 7]], '#ffffff');
      circles(g, [[78, 75, 7], [88, 72, 8]], '#ffffff');
    },
    night: function (g, a, b) {
      B(g); rr(g, 12, 12, 76, 76, 18); F(g, a);
      crescent(g, 46, 52, 0.75, b);
      B(g); star5(g, 70, 30, 7, 3); star5(g, 74, 62, 5, 2); star5(g, 28, 24, 4, 2); FO(g, b);
    },
    eclipse: function (g, a, b) {
      for (var k = 0; k < 12; k++) {
        var an = (k * TAU) / 12;
        line(g, 50 + Math.cos(an) * 36, 50 + Math.sin(an) * 36, 50 + Math.cos(an) * 44, 50 + Math.sin(an) * 44, b, 4);
      }
      B(g); circ(g, 50, 50, 31); F(g, b);
      B(g); circ(g, 55, 47, 28); F(g, a);
    },
    hourglass: function (g, a, b) {
      B(g); g.moveTo(30, 20); g.lineTo(70, 20); g.bezierCurveTo(70, 40, 55, 45, 55, 50); g.bezierCurveTo(55, 55, 70, 60, 70, 80); g.lineTo(30, 80);
      g.bezierCurveTo(30, 60, 45, 55, 45, 50); g.bezierCurveTo(45, 45, 30, 40, 30, 20); g.closePath(); F(g, 'rgba(225,242,255,0.92)');
      B(g); poly(g, [36, 78, 64, 78, 50, 62]); FO(g, b);
      B(g); poly(g, [37, 30, 63, 30, 50, 44]); FO(g, b);
      B(g); rr(g, 22, 12, 56, 9, 3); F(g, a);
      B(g); rr(g, 22, 79, 56, 9, 3); F(g, a);
    },
    clock: function (g, a, b) {
      B(g); circ(g, 28, 22, 8); circ(g, 72, 22, 8); F(g, a);
      B(g); circ(g, 50, 54, 34); F(g, a);
      B(g); circ(g, 50, 54, 26); F(g, b);
      var lw = g.lineWidth; g.lineWidth = 4.5;
      B(g); g.moveTo(50, 54); g.lineTo(50, 36); g.moveTo(50, 54); g.lineTo(63, 60); g.stroke();
      g.lineWidth = lw;
      B(g); circ(g, 50, 54, 3); FO(g, OL);
    },
    reeds: function (g, a, b) {
      B(g); ell(g, 50, 74, 38, 14); F(g, a);
      line(g, 34, 72, 30, 32, b, 4); line(g, 50, 74, 52, 24, b, 4); line(g, 66, 72, 72, 34, b, 4);
      B(g); ell(g, 30, 34, 4.5, 10); ell(g, 52, 27, 4.5, 10); ell(g, 72, 37, 4.5, 9); F(g, '#6d4c41');
      B(g); ell(g, 44, 78, 12, 3); FO(g, 'rgba(255,255,255,0.35)');
    },
    heart: function (g, a, b) {
      B(g); g.moveTo(50, 86); g.bezierCurveTo(16, 62, 12, 40, 24, 27); g.bezierCurveTo(35, 16, 48, 21, 50, 33);
      g.bezierCurveTo(52, 21, 65, 16, 76, 27); g.bezierCurveTo(88, 40, 84, 62, 50, 86); g.closePath(); F(g, a);
      B(g); ell(g, 33, 38, 6, 9, 0.6); FO(g, rgba(b, 0.8));
    },
    tree: function (g, a, b) {
      B(g); rr(g, 44, 54, 12, 32, 3); F(g, b);
      circles(g, [[50, 34, 20], [32, 48, 15], [68, 48, 15], [50, 54, 15]], a);
      B(g); circ(g, 42, 30, 5); circ(g, 62, 46, 4); FO(g, 'rgba(255,255,255,0.35)');
    },
    forest: function (g, a, b) {
      pine(g, 28, 84, 0.85, b); pine(g, 72, 84, 0.85, b); pine(g, 50, 88, 1.1, a);
    },
    grass: function (g, a, b) {
      var tips = [[22, 34], [30, 22], [40, 38], [50, 16], [58, 34], [70, 24], [78, 40]];
      tips.forEach(function (t, i) { var x = 18 + i * 10.5; B(g); poly(g, [x - 6, 84, t[0], t[1], x + 6, 84]); F(g, i % 2 ? b : a); });
      B(g); rr(g, 10, 80, 80, 8, 4); F(g, shade(a, -0.25));
    },
    flower: function (g, a, b) {
      line(g, 50, 90, 50, 56, '#43a047', 6);
      B(g); ell(g, 62, 74, 10, 5, -0.5); F(g, '#66bb6a');
      blob(g, function () { for (var k = 0; k < 5; k++) { var an = -Math.PI / 2 + (k * TAU) / 5; circ(g, 50 + Math.cos(an) * 15, 40 + Math.sin(an) * 15, 12); } }, a);
      B(g); circ(g, 50, 40, 9); F(g, b);
    },
    seed: function (g, a, b) {
      B(g); ell(g, 50, 54, 20, 30, 0.4); F(g, a);
      tube(g, function () { g.moveTo(44, 36); g.bezierCurveTo(52, 50, 54, 62, 58, 72); }, b, 3);
      line(g, 38, 28, 32, 16, '#66bb6a', 4);
    },
    apple: function (g, a, b) {
      line(g, 50, 36, 54, 18, '#6d4c41', 5);
      circles(g, [[39, 58, 22], [61, 58, 22]], a);
      B(g); ell(g, 64, 24, 11, 5, -0.5); F(g, b);
      shine(g, 34, 52, 5, 9, 0.3);
    },
    hammer: function (g, a, b) {
      g.save(); g.translate(50, 50); g.rotate(-0.65);
      B(g); rr(g, -5, -8, 10, 50, 4); F(g, b);
      B(g); rr(g, -24, -26, 48, 20, 4); F(g, a);
      B(g); rr(g, -20, -22, 18, 5, 2); FO(g, 'rgba(255,255,255,0.45)');
      g.restore();
    },
    log: function (g, a, b) {
      B(g); rr(g, 12, 32, 68, 36, 16); F(g, a);
      B(g); ell(g, 78, 50, 12, 18); F(g, b);
      B(g); ell(g, 78, 50, 6, 10); g.stroke();
      line(g, 24, 42, 52, 42, shade(a, -0.25), 3); line(g, 30, 58, 62, 58, shade(a, -0.25), 3);
    },
    sheet: function (g, a, b) {
      B(g); poly(g, [24, 12, 64, 12, 78, 26, 78, 88, 24, 88]); F(g, a);
      B(g); poly(g, [64, 12, 64, 26, 78, 26]); F(g, b);
      g.save(); g.strokeStyle = b; g.lineWidth = 4; B(g);
      [40, 52, 64, 76].forEach(function (y) { g.moveTo(32, y); g.lineTo(70, y); });
      g.stroke(); g.restore();
    },
    book: function (g, a, b) {
      B(g); rr(g, 26, 24, 56, 62, 5); F(g, '#fffaf0');
      B(g); rr(g, 18, 16, 56, 64, 6); F(g, a);
      B(g); rr(g, 18, 16, 11, 64, 4); F(g, shade(a, -0.25));
      B(g); star5(g, 51, 46, 12, 5); F(g, b);
    },
    house: function (g, a, b) {
      B(g); rr(g, 24, 46, 52, 40, 3); F(g, b);
      B(g); poly(g, [14, 52, 50, 18, 86, 52]); F(g, a);
      B(g); rr(g, 42, 62, 14, 24, 3); F(g, shade(a, -0.25));
      B(g); rr(g, 61, 58, 10, 10, 2); F(g, '#90caf9');
    },
    village: function (g, a, b) {
      sub(g, G.house, 34, 18, 0.62, shade(a, -0.1), b);
      sub(g, G.house, 0, 34, 0.62, a, b);
    },
    city: function (g, a, b) {
      var bl = [[12, 40, 18, 46], [32, 22, 20, 64], [54, 34, 16, 52], [72, 48, 16, 38]];
      bl.forEach(function (k, i) {
        B(g); rr(g, k[0], k[1], k[2], k[3], 2); F(g, i % 2 ? shade(a, 0.2) : a);
        g.fillStyle = b;
        for (var y = k[1] + 6; y < 80; y += 10) for (var x = k[0] + 4; x < k[0] + k[2] - 5; x += 7) g.fillRect(x, y, 4, 5);
      });
    },
    boat: function (g, a, b) {
      B(g); rr(g, 36, 38, 26, 20, 3); F(g, b);
      B(g); circ(g, 49, 47, 4); F(g, '#90caf9');
      B(g); poly(g, [10, 58, 90, 58, 76, 80, 24, 80]); F(g, a);
      line(g, 18, 88, 82, 88, '#4fc3f7', 4);
    },
    ship: function (g, a, b) {
      line(g, 50, 66, 50, 12, '#8d6e63', 5);
      B(g); poly(g, [54, 16, 54, 58, 84, 58]); F(g, b);
      B(g); poly(g, [46, 24, 46, 58, 20, 58]); F(g, b);
      B(g); poly(g, [50, 12, 62, 8, 50, 4]); F(g, '#e53935');
      B(g); poly(g, [12, 64, 88, 64, 76, 86, 24, 86]); F(g, a);
    },
    wheel: function (g, a, b) {
      for (var k = 0; k < 6; k++) { var an = (k * TAU) / 6; line(g, 50, 50, 50 + Math.cos(an) * 28, 50 + Math.sin(an) * 28, b, 4); }
      tube(g, function () { circ(g, 50, 50, 31); }, a, 10);
      B(g); circ(g, 50, 50, 8); F(g, a);
    },
    bicycle: function (g, a, b) {
      tube(g, function () { circ(g, 27, 62, 17); }, b, 4);
      tube(g, function () { circ(g, 73, 62, 17); }, b, 4);
      tube(g, function () { g.moveTo(27, 62); g.lineTo(44, 38); g.lineTo(66, 38); g.lineTo(73, 62); g.moveTo(44, 38); g.lineTo(50, 62); g.lineTo(27, 62); g.moveTo(50, 62); g.lineTo(66, 38); }, a, 5);
      line(g, 40, 30, 50, 30, b, 5); line(g, 66, 38, 62, 26, a, 4); line(g, 58, 26, 68, 26, b, 4);
    },
    gear: function (g, a, b) {
      blob(g, function () {
        circ(g, 50, 50, 28);
        for (var k = 0; k < 8; k++) {
          var an = (k * TAU) / 8, c = Math.cos(an), s = Math.sin(an), px = -s, py = c;
          poly(g, [50 + c * 24 + px * 8, 50 + s * 24 + py * 8, 50 + c * 40 + px * 6, 50 + s * 40 + py * 6, 50 + c * 40 - px * 6, 50 + s * 40 - py * 6, 50 + c * 24 - px * 8, 50 + s * 24 - py * 8]);
        }
      }, a);
      B(g); circ(g, 50, 50, 11); F(g, b);
    },
    car: function (g, a, b) {
      B(g); g.moveTo(12, 68); g.lineTo(12, 56); g.quadraticCurveTo(14, 46, 28, 46); g.lineTo(34, 46); g.lineTo(42, 30); g.lineTo(66, 30); g.lineTo(76, 46);
      g.quadraticCurveTo(90, 48, 90, 58); g.lineTo(90, 68); g.closePath(); F(g, a);
      B(g); poly(g, [45, 35, 54, 35, 54, 46, 39, 46]); F(g, b);
      B(g); poly(g, [58, 35, 64, 35, 71, 46, 58, 46]); F(g, b);
      B(g); circ(g, 30, 69, 10); circ(g, 72, 69, 10); F(g, '#263238');
      B(g); circ(g, 30, 69, 4); circ(g, 72, 69, 4); FO(g, '#b0bec5');
    },
    bulb: function (g, a, b) {
      for (var k = 0; k < 5; k++) { var an = Math.PI + 0.25 + k * 0.66; line(g, 50 + Math.cos(an) * 32, 40 + Math.sin(an) * 32, 50 + Math.cos(an) * 42, 40 + Math.sin(an) * 42, a, 4); }
      blob(g, function () { circ(g, 50, 40, 23); rr(g, 40, 50, 20, 18, 4); }, a);
      B(g); rr(g, 39, 66, 22, 16, 4); F(g, '#90a4ae');
      line(g, 41, 72, 59, 72, '#607d8b', 2);
      shine(g, 42, 32, 5, 8, 0.5);
      B(g); circ(g, 50, 40, 9); FO(g, rgba(b, 0.9));
    },
    chip: function (g, a, b) {
      for (var i = 0; i < 4; i++) {
        var p = 32 + i * 12;
        B(g); rr(g, p - 2, 16, 4, 12, 1); rr(g, p - 2, 72, 4, 12, 1); rr(g, 16, p - 2, 12, 4, 1); rr(g, 72, p - 2, 12, 4, 1); F(g, b);
      }
      B(g); rr(g, 24, 24, 52, 52, 7); F(g, a);
      B(g); rr(g, 38, 38, 24, 24, 3); F(g, shade(a, -0.3));
      B(g); circ(g, 31, 31, 2.5); FO(g, b);
    },
    monitor: function (g, a, b) {
      B(g); poly(g, [42, 70, 58, 70, 62, 84, 38, 84]); F(g, a);
      B(g); rr(g, 10, 16, 80, 56, 7); F(g, a);
      B(g); rr(g, 17, 23, 66, 42, 3); F(g, b);
      B(g); poly(g, [22, 58, 40, 28, 50, 28, 32, 58]); FO(g, 'rgba(255,255,255,0.35)');
    },
    globe: function (g, a, b) {
      B(g); circ(g, 50, 50, 34); F(g, a);
      g.save(); B(g); circ(g, 50, 50, 34); g.clip();
      B(g); ell(g, 38, 38, 14, 10, 0.4); ell(g, 64, 64, 14, 9, -0.3); ell(g, 64, 32, 8, 5); ell(g, 30, 66, 6, 8); F(g, b);
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2;
      B(g); ell(g, 50, 50, 14, 34); g.moveTo(16, 50); g.lineTo(84, 50); g.stroke();
      g.restore();
      B(g); circ(g, 50, 50, 34); g.stroke();
    },
    phone: function (g, a, b) {
      B(g); rr(g, 29, 10, 42, 80, 9); F(g, a);
      B(g); rr(g, 34, 20, 32, 56, 3); F(g, b);
      B(g); circ(g, 50, 83, 3); FO(g, b);
      B(g); poly(g, [38, 64, 52, 24, 58, 24, 44, 64]); FO(g, 'rgba(255,255,255,0.35)');
    },
    robot: function (g, a, b) {
      line(g, 50, 24, 50, 12, OL, 2); B(g); circ(g, 50, 11, 5); F(g, b);
      B(g); rr(g, 30, 68, 40, 20, 6); F(g, shade(a, -0.18));
      B(g); rr(g, 18, 36, 8, 16, 3); rr(g, 74, 36, 8, 16, 3); F(g, b);
      B(g); rr(g, 24, 22, 52, 46, 10); F(g, a);
      B(g); circ(g, 39, 42, 7); circ(g, 61, 42, 7); F(g, '#ffffff');
      B(g); circ(g, 40, 43, 3); circ(g, 62, 43, 3); FO(g, OL);
      B(g); rr(g, 38, 56, 24, 5, 2); FO(g, b);
    },
    fish: function (g, a, b) {
      B(g); poly(g, [70, 50, 90, 32, 88, 68]); F(g, b);
      B(g); ell(g, 46, 50, 32, 21); F(g, a);
      B(g); poly(g, [42, 30, 56, 18, 60, 32]); F(g, b);
      tube(g, function () { g.moveTo(56, 36); g.bezierCurveTo(62, 44, 62, 56, 56, 64); }, b, 3);
      B(g); circ(g, 30, 46, 6); F(g, '#ffffff'); B(g); circ(g, 29, 46, 2.5); FO(g, OL);
    },
    bird: function (g, a, b) {
      B(g); poly(g, [72, 58, 92, 48, 88, 72]); F(g, a);
      B(g); circ(g, 50, 54, 27); F(g, a);
      B(g); ell(g, 58, 60, 15, 9, -0.4); F(g, shade(a, -0.2));
      B(g); poly(g, [25, 46, 10, 53, 25, 58]); F(g, b);
      B(g); circ(g, 38, 46, 6); F(g, '#ffffff'); B(g); circ(g, 37, 46, 2.5); FO(g, OL);
      B(g); ell(g, 52, 70, 12, 6); FO(g, rgba(b, 0.55));
    },
    beast: function (g, a, b) {
      var leg = shade(a, -0.15);
      [[30, 60], [42, 62], [62, 62], [73, 60]].forEach(function (p) { B(g); rr(g, p[0], p[1], 9, 24, 3); F(g, leg); });
      tube(g, function () { g.moveTo(80, 50); g.quadraticCurveTo(90, 44, 88, 32); }, a, 6);
      B(g); ell(g, 56, 56, 27, 17); F(g, a);
      B(g); ell(g, 60, 52, 8, 6); FO(g, rgba(b, 0.75));
      B(g); poly(g, [22, 30, 27, 14, 37, 28]); F(g, b);
      B(g); circ(g, 30, 42, 16); F(g, a);
      B(g); ell(g, 19, 49, 9, 7); F(g, b);
      B(g); circ(g, 29, 38, 3.2); FO(g, OL);
    },
    horn: function (g, a, b, base) {
      if (base === 'beast') { B(g); poly(g, [24, 30, 16, 4, 33, 26]); F(g, '#ffe082'); line(g, 21, 18, 27, 20, '#ffb300', 2); return; }
      B(g); g.moveTo(32, 30); g.quadraticCurveTo(18, 22, 20, 6); g.quadraticCurveTo(30, 18, 40, 22); g.closePath(); F(g, '#f5f5f5');
      B(g); g.moveTo(68, 30); g.quadraticCurveTo(82, 22, 80, 6); g.quadraticCurveTo(70, 18, 60, 22); g.closePath(); F(g, '#f5f5f5');
    },
    wings: function (g, a, b, base) {
      if (base === 'person') { wingShape(g, 34, 60, 0.9, true, '#ffffff'); wingShape(g, 66, 60, 0.9, false, '#ffffff'); return; }
      if (base === 'bird') { wingShape(g, 50, 52, 1.05, false, b); return; }
      wingShape(g, 52, 46, 1, false, b === '#ffffff' ? '#e3f2fd' : '#ffffff');
    },
    egg: function (g, a, b) {
      B(g); ell(g, 50, 54, 27, 33); F(g, a);
      B(g); circ(g, 42, 44, 5); circ(g, 60, 60, 6); circ(g, 46, 70, 4); circ(g, 61, 38, 3.5); FO(g, b);
      shine(g, 38, 40, 4, 8, 0.4);
    },
    lizard: function (g, a, b) {
      line(g, 36, 52, 26, 66, a, 6); line(g, 62, 62, 70, 76, a, 6); line(g, 46, 48, 52, 34, a, 6);
      tube(g, function () { g.moveTo(22, 40); g.bezierCurveTo(40, 40, 46, 64, 64, 64); g.bezierCurveTo(78, 64, 86, 56, 92, 46); }, a, 14);
      B(g); ell(g, 20, 40, 13, 9, -0.2); F(g, a);
      B(g); circ(g, 18, 36, 3); FO(g, OL);
      B(g); circ(g, 44, 52, 3); circ(g, 58, 62, 3); circ(g, 72, 62, 2.5); FO(g, b);
    },
    dragon: function (g, a, b) {
      var w = shade(a, -0.22);
      B(g); poly(g, [32, 50, 6, 22, 14, 44, 4, 56, 22, 60]); F(g, w);
      B(g); poly(g, [68, 50, 94, 22, 86, 44, 96, 56, 78, 60]); F(g, w);
      B(g); poly(g, [36, 36, 28, 12, 46, 30]); poly(g, [64, 36, 72, 12, 54, 30]); F(g, b);
      B(g); circ(g, 50, 52, 25); F(g, a);
      B(g); ell(g, 50, 64, 15, 10); F(g, shade(a, 0.3));
      B(g); circ(g, 45, 63, 2); circ(g, 55, 63, 2); FO(g, OL);
      B(g); circ(g, 40, 46, 6.5); circ(g, 60, 46, 6.5); F(g, '#ffffff');
      B(g); circ(g, 41, 47, 3); circ(g, 61, 47, 3); FO(g, OL);
    },
    bug: function (g, a, b) {
      line(g, 44, 22, 38, 12, OL, 2); line(g, 56, 22, 62, 12, OL, 2);
      B(g); circ(g, 50, 30, 11); F(g, b);
      B(g); ell(g, 50, 60, 25, 28); F(g, a);
      line(g, 50, 34, 50, 86, b, 3);
      B(g); circ(g, 40, 52, 5); circ(g, 60, 52, 5); circ(g, 40, 70, 4); circ(g, 60, 70, 4); FO(g, b);
    },
    bee: function (g, a, b) {
      B(g); ell(g, 42, 30, 11, 15, -0.4); ell(g, 60, 30, 11, 15, 0.4); F(g, 'rgba(227,242,253,0.95)');
      B(g); ell(g, 54, 58, 28, 21); F(g, a);
      g.save(); B(g); ell(g, 54, 58, 28, 21); g.clip(); g.fillStyle = b; g.fillRect(46, 30, 8, 60); g.fillRect(62, 30, 8, 60); g.restore();
      B(g); ell(g, 54, 58, 28, 21); g.stroke();
      B(g); poly(g, [82, 56, 92, 58, 82, 62]); F(g, b);
      B(g); circ(g, 26, 58, 11); F(g, b);
      B(g); circ(g, 23, 55, 2.5); FO(g, '#ffffff');
    },
    jar: function (g, a, b) {
      B(g); rr(g, 22, 30, 56, 56, 14); F(g, a);
      B(g); rr(g, 28, 16, 44, 16, 4); F(g, shade(a, -0.35));
      B(g); rr(g, 32, 48, 36, 22, 4); F(g, b);
      B(g); g.moveTo(30, 34); g.quadraticCurveTo(34, 46, 38, 34); FO(g, shade(a, -0.15));
      shine(g, 30, 60, 3, 10, 0);
    },
    butterfly: function (g, a, b) {
      B(g); ell(g, 33, 38, 19, 16, -0.4); ell(g, 67, 38, 19, 16, 0.4); F(g, a);
      B(g); ell(g, 37, 66, 13, 13); ell(g, 63, 66, 13, 13); F(g, b);
      B(g); circ(g, 31, 36, 5); circ(g, 69, 36, 5); FO(g, 'rgba(255,255,255,0.6)');
      B(g); ell(g, 50, 52, 5, 24); F(g, '#3e2723');
      line(g, 48, 30, 40, 16, OL, 2); line(g, 52, 30, 60, 16, OL, 2);
    },
    person: function (g, a, b) {
      B(g); g.moveTo(24, 90); g.bezierCurveTo(24, 64, 36, 56, 50, 56); g.bezierCurveTo(64, 56, 76, 64, 76, 90); g.closePath(); F(g, b);
      B(g); circ(g, 50, 36, 18); F(g, a);
      B(g); circ(g, 44, 36, 2.5); circ(g, 56, 36, 2.5); FO(g, OL);
      B(g); g.arc(50, 41, 6, 0.3, Math.PI - 0.3); g.stroke();
    },
    wheat: function (g, a, b) {
      line(g, 50, 90, 50, 22, '#c8a24a', 4);
      for (var i = 0; i < 5; i++) {
        var y = 28 + i * 10;
        B(g); ell(g, 42, y + 4, 8, 4.5, -0.7); ell(g, 58, y + 4, 8, 4.5, 0.7); F(g, i % 2 ? b : a);
      }
      B(g); ell(g, 50, 22, 4.5, 8); F(g, a);
    },
    bread: function (g, a, b) {
      B(g); g.moveTo(14, 70); g.bezierCurveTo(12, 40, 34, 30, 50, 30); g.bezierCurveTo(66, 30, 88, 40, 86, 70); g.lineTo(86, 76); g.quadraticCurveTo(86, 80, 80, 80);
      g.lineTo(20, 80); g.quadraticCurveTo(14, 80, 14, 76); g.closePath(); F(g, a);
      line(g, 36, 42, 30, 56, b, 4); line(g, 52, 40, 46, 56, b, 4); line(g, 68, 42, 62, 56, b, 4);
    },
    cake: function (g, a, b) {
      B(g); ell(g, 50, 82, 40, 8); F(g, '#eceff1');
      B(g); rr(g, 18, 50, 64, 32, 6); F(g, a);
      B(g); g.moveTo(18, 58); g.lineTo(18, 52); g.quadraticCurveTo(18, 46, 26, 46); g.lineTo(74, 46); g.quadraticCurveTo(82, 46, 82, 52); g.lineTo(82, 60);
      g.quadraticCurveTo(76, 66, 72, 58); g.quadraticCurveTo(66, 68, 60, 58); g.quadraticCurveTo(52, 68, 46, 58); g.quadraticCurveTo(38, 68, 32, 58); g.quadraticCurveTo(24, 66, 18, 58); g.closePath(); F(g, b);
      B(g); rr(g, 46, 22, 8, 24, 2); F(g, '#90caf9');
      B(g); g.moveTo(50, 8); g.quadraticCurveTo(57, 16, 50, 21); g.quadraticCurveTo(43, 16, 50, 8); F(g, '#ffb300');
    },
    cup: function (g, a, b) {
      tube(g, function () { g.arc(68, 56, 12, -Math.PI / 2, Math.PI / 2); }, a, 7);
      B(g); rr(g, 22, 30, 46, 52, 8); F(g, a);
      B(g); ell(g, 45, 34, 19, 5); F(g, b);
      shine(g, 30, 56, 3, 12, 0);
    },
    whale: function (g, a, b) {
      tube(g, function () { g.moveTo(38, 30); g.quadraticCurveTo(34, 18, 26, 14); g.moveTo(38, 30); g.quadraticCurveTo(42, 16, 50, 12); }, '#80d8ff', 4);
      B(g); g.moveTo(10, 58); g.bezierCurveTo(10, 34, 44, 28, 64, 42); g.bezierCurveTo(72, 46, 78, 46, 84, 40); g.lineTo(94, 28); g.lineTo(90, 48); g.lineTo(96, 64);
      g.lineTo(80, 56); g.bezierCurveTo(70, 74, 40, 80, 24, 74); g.bezierCurveTo(14, 70, 10, 64, 10, 58); g.closePath(); F(g, a);
      B(g); g.moveTo(16, 64); g.bezierCurveTo(30, 74, 52, 74, 66, 60); g.bezierCurveTo(54, 80, 26, 80, 16, 64); FO(g, b);
      B(g); circ(g, 26, 52, 3.2); FO(g, OL);
    },
    tail: function (g, a, b) {
      B(g); g.moveTo(40, 12); g.bezierCurveTo(30, 40, 34, 60, 48, 72); g.lineTo(28, 88); g.quadraticCurveTo(48, 80, 52, 78); g.quadraticCurveTo(56, 82, 76, 88);
      g.lineTo(58, 70); g.bezierCurveTo(70, 52, 68, 30, 62, 12); g.closePath(); F(g, a);
      g.save(); g.strokeStyle = shade(a, 0.4); g.lineWidth = 2.5; B(g);
      [24, 36, 48].forEach(function (y) { for (var x = 42; x < 62; x += 8) { g.moveTo(x - 4, y); g.arc(x, y, 4, Math.PI, 0, true); } });
      g.stroke(); g.restore();
      B(g); circ(g, 51, 12, 7); F(g, b);
    },
    sparkle: function (g, a, b) {
      B(g); star4(g, 46, 54, 36); F(g, a);
      B(g); star4(g, 77, 24, 12); F(g, b);
      B(g); star4(g, 22, 22, 9); F(g, b);
      B(g); star4(g, 46, 54, 12); FO(g, 'rgba(255,255,255,0.65)');
    },
    hat: function (g, a, b) {
      B(g); ell(g, 50, 78, 40, 11); F(g, a);
      B(g); g.moveTo(26, 78); g.bezierCurveTo(36, 56, 44, 30, 62, 10); g.bezierCurveTo(62, 30, 68, 56, 74, 78); g.closePath(); F(g, a);
      B(g); rr(g, 30, 66, 42, 8, 3); F(g, b);
      B(g); star5(g, 50, 48, 7, 3); star5(g, 60, 30, 4, 2); FO(g, b);
    },
    potion: function (g, a, b) {
      var flask = function () { g.moveTo(42, 16); g.lineTo(58, 16); g.lineTo(58, 36); g.bezierCurveTo(76, 44, 82, 58, 78, 70); g.bezierCurveTo(74, 88, 26, 88, 22, 70); g.bezierCurveTo(18, 58, 24, 44, 42, 36); g.closePath(); };
      B(g); flask(); F(g, 'rgba(232,244,255,0.95)');
      g.save(); B(g); flask(); g.clip(); g.fillStyle = a; g.fillRect(0, 52, 100, 48); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, 52, 100, 4); g.restore();
      B(g); flask(); g.stroke();
      B(g); circ(g, 44, 66, 4); circ(g, 58, 72, 3); circ(g, 52, 60, 2.5); FO(g, b);
      B(g); rr(g, 39, 8, 22, 11, 3); F(g, '#a1887f');
    },
    mountain: function (g, a, b) {
      B(g); poly(g, [40, 86, 66, 30, 92, 86]); F(g, shade(a, -0.18));
      B(g); poly(g, [8, 86, 38, 20, 70, 86]); F(g, a);
      B(g); poly(g, [38, 20, 28, 42, 34, 39, 38, 46, 43, 38, 48, 42]); F(g, b);
      B(g); poly(g, [66, 30, 59, 44, 66, 41, 72, 44]); F(g, b);
    },
    castle: function (g, a, b) {
      line(g, 50, 30, 50, 10, OL, 2); B(g); poly(g, [51, 10, 64, 14, 51, 19]); F(g, b);
      B(g); rr(g, 30, 44, 40, 42, 2); F(g, shade(a, 0.15));
      [[12, 30], [66, 30]].forEach(function (p) {
        B(g); rr(g, p[0], p[1], 22, 56, 2); F(g, a);
        B(g); rr(g, p[0] - 1, p[1] - 8, 7, 9, 1); rr(g, p[0] + 7.5, p[1] - 8, 7, 9, 1); rr(g, p[0] + 16, p[1] - 8, 7, 9, 1); F(g, a);
      });
      B(g); g.moveTo(42, 86); g.lineTo(42, 70); g.arc(50, 70, 8, Math.PI, 0); g.lineTo(58, 86); g.closePath(); F(g, shade(a, -0.4));
      B(g); rr(g, 19, 46, 8, 10, 3); rr(g, 73, 46, 8, 10, 3); F(g, '#455a64');
    },
    helmet: function (g, a, b) {
      blob(g, function () { ell(g, 62, 18, 20, 9, -0.3); }, b);
      B(g); g.moveTo(24, 86); g.lineTo(24, 46); g.bezierCurveTo(24, 18, 76, 18, 76, 46); g.lineTo(76, 86); g.closePath(); F(g, a);
      B(g); rr(g, 30, 46, 40, 7, 3); FO(g, OL);
      B(g); circ(g, 40, 66, 2.5); circ(g, 50, 66, 2.5); circ(g, 60, 66, 2.5); circ(g, 45, 74, 2.5); circ(g, 55, 74, 2.5); FO(g, OL);
      B(g); rr(g, 30, 28, 6, 14, 3); FO(g, 'rgba(255,255,255,0.5)');
    },
    crown: function (g, a, b) {
      B(g); circ(g, 14, 28, 5); circ(g, 50, 18, 5); circ(g, 86, 28, 5); F(g, a);
      B(g); poly(g, [18, 76, 14, 30, 34, 52, 50, 22, 66, 52, 86, 30, 82, 76]); F(g, a);
      B(g); rr(g, 17, 66, 66, 14, 3); F(g, shade(a, -0.12));
      B(g); circ(g, 33, 73, 4); circ(g, 50, 73, 5); circ(g, 67, 73, 4); F(g, b);
    },
    flag: function (g, a, b) {
      line(g, 26, 90, 26, 12, '#8d6e63', 5);
      B(g); g.moveTo(29, 14); g.bezierCurveTo(48, 6, 60, 24, 84, 16); g.lineTo(84, 52); g.bezierCurveTo(60, 60, 48, 44, 29, 50); g.closePath(); F(g, a);
      B(g); circ(g, 56, 31, 9); FO(g, b);
      B(g); circ(g, 53, 30, 2.2); circ(g, 59, 30, 2.2); FO(g, a);
      line(g, 46, 44, 66, 38, b, 3); line(g, 46, 38, 66, 44, b, 3);
    },
    chest: function (g, a, b) {
      B(g); rr(g, 14, 46, 72, 38, 4); F(g, a);
      B(g); g.moveTo(14, 48); g.lineTo(14, 36); g.bezierCurveTo(14, 20, 86, 20, 86, 36); g.lineTo(86, 48); g.closePath(); F(g, shade(a, 0.12));
      B(g); rr(g, 26, 25, 7, 59, 2); rr(g, 67, 25, 7, 59, 2); F(g, b);
      B(g); rr(g, 43, 42, 14, 16, 3); F(g, b);
      B(g); circ(g, 50, 49, 2.5); FO(g, OL);
    },
    galaxy: function (g, a, b) {
      for (var arm = 0; arm < 2; arm++) {
        tube(g, function () {
          for (var i = 0; i <= 20; i++) {
            var t = i / 20, an = arm * Math.PI + t * 3.4, r = 5 + t * 34;
            if (i) g.lineTo(50 + Math.cos(an) * r, 50 + Math.sin(an) * r * 0.8);
            else g.moveTo(50 + Math.cos(an) * r, 50 + Math.sin(an) * r * 0.8);
          }
        }, a, 10 - arm * 2);
      }
      B(g); circ(g, 50, 50, 10); F(g, b);
      B(g); circ(g, 22, 24, 2.5); circ(g, 80, 74, 2.5); circ(g, 78, 22, 2); circ(g, 18, 78, 2); FO(g, b);
    },
    comet: function (g, a, b) {
      B(g); poly(g, [36, 50, 90, 10, 78, 36, 92, 46, 52, 66]); F(g, rgba(b, 0.9));
      B(g); poly(g, [44, 54, 80, 26, 62, 56]); FO(g, rgba(a, 0.6));
      B(g); circ(g, 38, 62, 18); F(g, a);
      B(g); circ(g, 33, 58, 4); circ(g, 44, 68, 3); FO(g, shade(a, -0.2));
    },
    ring: function (g, a, b) {
      tube(g, function () { g.ellipse(50, 52, 44, 12, -0.3, Math.PI, TAU); }, b, 6);
      B(g); circ(g, 50, 50, 25); F(g, a);
      g.save(); B(g); circ(g, 50, 50, 25); g.clip(); g.fillStyle = shade(a, 0.25); g.fillRect(20, 40, 60, 6); g.fillRect(20, 56, 60, 4); g.restore();
      tube(g, function () { g.ellipse(50, 52, 44, 12, -0.3, 0, Math.PI); }, b, 6);
    },
    tornado: function (g, a, b) {
      for (var i = 5; i >= 0; i--) {
        B(g); ell(g, 50 + Math.sin(i * 1.3) * 5, 22 + i * 12, 36 - i * 5.4, 7); F(g, i % 2 ? shade(a, 0.2) : a);
      }
      B(g); circ(g, 22, 70, 3); circ(g, 80, 60, 3); circ(g, 74, 84, 2.5); F(g, b);
    },
    crystal: function (g, a, b) {
      B(g); poly(g, [24, 44, 34, 52, 32, 86, 20, 86, 16, 56]); F(g, b);
      B(g); poly(g, [76, 40, 86, 54, 80, 86, 68, 86, 66, 52]); F(g, b);
      B(g); poly(g, [50, 8, 66, 30, 60, 88, 40, 88, 34, 30]); F(g, a);
      B(g); poly(g, [50, 8, 50, 88, 40, 88, 34, 30]); FO(g, 'rgba(255,255,255,0.3)');
    },
    cactus: function (g, a, b) {
      tube(g, function () { g.moveTo(40, 58); g.lineTo(28, 58); g.lineTo(28, 40); }, a, 10);
      tube(g, function () { g.moveTo(60, 50); g.lineTo(72, 50); g.lineTo(72, 32); }, a, 10);
      B(g); rr(g, 39, 20, 22, 70, 11); F(g, a);
      line(g, 50, 30, 50, 82, shade(a, -0.2), 2);
      B(g); circ(g, 50, 20, 7); F(g, b);
    },
    pyramid: function (g, a, b) {
      B(g); poly(g, [8, 84, 50, 18, 92, 84]); F(g, a);
      B(g); poly(g, [50, 18, 92, 84, 60, 84]); F(g, b);
      g.save(); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; B(g); g.moveTo(30, 52); g.lineTo(70, 52); g.moveTo(20, 68); g.lineTo(80, 68); g.stroke(); g.restore();
    },
    palm: function (g, a, b) {
      B(g); ell(g, 50, 80, 44, 12); F(g, b);
      B(g); ell(g, 50, 74, 30, 10); F(g, a);
      tube(g, function () { g.moveTo(46, 74); g.quadraticCurveTo(44, 50, 56, 30); }, '#8d6e63', 6);
      [[-2.6, 20], [-1.9, 18], [-0.6, 20], [0.1, 18]].forEach(function (k) {
        B(g); ell(g, 56 + Math.cos(k[0]) * 14, 30 + Math.sin(k[0]) * 10, k[1], 6, k[0] + 0.2); F(g, '#43a047');
      });
      B(g); circ(g, 54, 34, 4); circ(g, 60, 35, 4); F(g, '#6d4c41');
    },
    beach: function (g, a, b) {
      B(g); rr(g, 10, 14, 80, 74, 14); F(g, b);
      B(g); circ(g, 72, 32, 10); F(g, '#ffd54f');
      B(g); g.moveTo(10, 60); g.quadraticCurveTo(50, 50, 90, 78); g.lineTo(90, 76); g.quadraticCurveTo(90, 88, 78, 88); g.lineTo(22, 88); g.quadraticCurveTo(10, 88, 10, 76); g.closePath(); F(g, a);
      line(g, 18, 52, 40, 48, '#ffffff', 3);
    },
    river: function (g, a, b) {
      B(g); rr(g, 10, 12, 80, 76, 14); F(g, b);
      tube(g, function () { g.moveTo(42, 12); g.bezierCurveTo(70, 34, 24, 60, 58, 88); }, a, 18);
      line(g, 50, 40, 46, 50, '#ffffff', 2.5);
    },
    waterfall: function (g, a, b) {
      B(g); rr(g, 12, 12, 76, 40, 8); F(g, b);
      B(g); rr(g, 36, 12, 28, 66, 4); F(g, a);
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.5; B(g); g.moveTo(44, 20); g.lineTo(44, 70); g.moveTo(56, 26); g.lineTo(56, 74); g.stroke(); g.restore();
      B(g); ell(g, 50, 80, 38, 10); F(g, a);
      circles(g, [[36, 76, 6], [50, 72, 7], [64, 76, 6]], '#ffffff');
    },
    bridge: function (g, a, b) {
      B(g); rr(g, 8, 66, 84, 22, 8); F(g, b);
      B(g); g.moveTo(6, 50); g.lineTo(94, 50); g.lineTo(94, 80); g.lineTo(78, 80); g.bezierCurveTo(74, 56, 26, 56, 22, 80); g.lineTo(6, 80); g.closePath(); F(g, a);
      B(g); rr(g, 6, 40, 88, 6, 2); F(g, shade(a, -0.2));
      [16, 34, 50, 66, 84].forEach(function (x) { line(g, x, 42, x, 50, shade(a, -0.2), 3); });
    },
    windmill: function (g, a, b) {
      B(g); poly(g, [36, 88, 43, 40, 57, 40, 64, 88]); F(g, a);
      B(g); rr(g, 45, 70, 10, 18, 3); F(g, shade(b, -0.2));
      B(g); poly(g, [40, 42, 50, 28, 60, 42]); F(g, b);
      g.save(); g.translate(50, 34);
      for (var k = 0; k < 4; k++) { g.rotate(Math.PI / 2); B(g); rr(g, 4, -6, 30, 12, 2); F(g, '#fafafa'); }
      g.restore();
      B(g); circ(g, 50, 34, 5); F(g, b);
    },
    lighthouse: function (g, a, b) {
      B(g); poly(g, [60, 30, 96, 18, 96, 42]); poly(g, [40, 30, 4, 18, 4, 42]); FO(g, rgba(b, 0.55));
      var tw = function () { poly(g, [34, 88, 41, 38, 59, 38, 66, 88]); };
      B(g); tw(); F(g, '#ffffff');
      g.save(); B(g); tw(); g.clip(); g.fillStyle = a; g.fillRect(0, 48, 100, 10); g.fillRect(0, 68, 100, 10); g.restore();
      B(g); tw(); g.stroke();
      B(g); rr(g, 40, 24, 20, 15, 2); F(g, b);
      B(g); poly(g, [37, 26, 50, 10, 63, 26]); F(g, a);
    },
    barrel: function (g, a, b) {
      tube(g, function () { g.moveTo(50, 22); g.quadraticCurveTo(54, 12, 60, 10); }, '#8d6e63', 3);
      B(g); star4(g, 62, 9, 7); F(g, b);
      B(g); g.moveTo(30, 22); g.bezierCurveTo(20, 42, 20, 62, 30, 84); g.lineTo(70, 84); g.bezierCurveTo(80, 62, 80, 42, 70, 22); g.closePath(); F(g, a);
      line(g, 26, 38, 74, 38, shade(a, -0.35), 4); line(g, 26, 68, 74, 68, shade(a, -0.35), 4);
    },
    burst: function (g, a, b) {
      B(g);
      for (var i = 0; i < 24; i++) { var an = (i * TAU) / 24, r = i % 2 ? 26 : 44; if (i) g.lineTo(50 + Math.cos(an) * r, 50 + Math.sin(an) * r); else g.moveTo(50 + r, 50); }
      g.closePath(); F(g, a);
      B(g);
      for (var j = 0; j < 16; j++) { var an2 = (j * TAU) / 16 + 0.2, r2 = j % 2 ? 12 : 24; if (j) g.lineTo(50 + Math.cos(an2) * r2, 50 + Math.sin(an2) * r2); else g.moveTo(50 + Math.cos(an2) * r2, 50 + Math.sin(an2) * r2); }
      g.closePath(); F(g, b);
    },
    plane: function (g, a, b) {
      g.save(); g.translate(50, 50); g.rotate(-0.45); g.translate(-50, -50);
      B(g); poly(g, [44, 46, 30, 14, 40, 14, 62, 46]); poly(g, [44, 54, 30, 86, 40, 86, 62, 54]); F(g, b);
      B(g); poly(g, [16, 48, 10, 34, 22, 46]); F(g, b);
      B(g); ell(g, 50, 50, 38, 9); F(g, a);
      B(g); circ(g, 70, 49, 2.5); circ(g, 62, 49, 2.5); circ(g, 54, 49, 2.5); FO(g, b);
      g.restore();
    },
    rocket: function (g, a, b) {
      g.save(); g.translate(50, 50); g.rotate(0.6); g.translate(-50, -50);
      B(g); poly(g, [42, 66, 50, 92, 58, 66]); F(g, '#ffb300');
      B(g); poly(g, [38, 50, 24, 72, 38, 66]); poly(g, [62, 50, 76, 72, 62, 66]); F(g, b);
      B(g); g.moveTo(50, 8); g.bezierCurveTo(66, 22, 66, 46, 62, 68); g.lineTo(38, 68); g.bezierCurveTo(34, 46, 34, 22, 50, 8); g.closePath(); F(g, a);
      B(g); circ(g, 50, 36, 7); F(g, '#81d4fa');
      g.restore();
    },
    satellite: function (g, a, b) {
      [[8, 40], [66, 40]].forEach(function (p) {
        B(g); rr(g, p[0], p[1], 26, 20, 2); F(g, b);
        g.save(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; B(g); g.moveTo(p[0] + 13, p[1]); g.lineTo(p[0] + 13, p[1] + 20); g.moveTo(p[0], p[1] + 10); g.lineTo(p[0] + 26, p[1] + 10); g.stroke(); g.restore();
      });
      B(g); rr(g, 38, 34, 24, 32, 4); F(g, a);
      line(g, 50, 34, 50, 20, OL, 2);
      B(g); g.arc(50, 18, 9, Math.PI * 0.1, Math.PI * 0.9, true); g.closePath(); F(g, a);
    },
    spacehelm: function (g, a, b) {
      B(g); rr(g, 28, 72, 44, 14, 6); F(g, shade(a, -0.15));
      B(g); circ(g, 50, 46, 32); F(g, a);
      B(g); ell(g, 52, 46, 23, 17); F(g, b);
      B(g); ell(g, 44, 40, 7, 4, -0.5); FO(g, 'rgba(255,255,255,0.7)');
    },
    telescope: function (g, a, b) {
      line(g, 50, 60, 34, 90, b, 4); line(g, 50, 60, 66, 90, b, 4); line(g, 50, 60, 50, 90, b, 4);
      g.save(); g.translate(50, 50); g.rotate(-0.5);
      B(g); rr(g, -36, -8, 56, 16, 4); F(g, a);
      B(g); rr(g, 18, -12, 10, 24, 3); F(g, b);
      B(g); rr(g, -42, -5, 8, 10, 2); F(g, b);
      g.restore();
    },
    sword: function (g, a, b) {
      g.save(); g.translate(50, 50); g.rotate(0.78);
      B(g); poly(g, [-6, -40, 0, -48, 6, -40, 6, 16, -6, 16]); F(g, a);
      line(g, 0, -40, 0, 12, 'rgba(255,255,255,0.7)', 1.5);
      B(g); rr(g, -17, 16, 34, 8, 3); F(g, b);
      B(g); rr(g, -4, 24, 8, 16, 2); F(g, '#5d4037');
      B(g); circ(g, 0, 44, 5); F(g, b);
      g.restore();
    },
    ghost: function (g, a, b) {
      B(g); g.moveTo(24, 84); g.lineTo(24, 46); g.bezierCurveTo(24, 14, 76, 14, 76, 46); g.lineTo(76, 84); g.lineTo(67, 77); g.lineTo(58, 86); g.lineTo(50, 78);
      g.lineTo(42, 86); g.lineTo(33, 77); g.closePath(); F(g, a);
      B(g); ell(g, 40, 46, 5, 7); ell(g, 60, 46, 5, 7); FO(g, OL);
      B(g); ell(g, 34, 58, 5, 3); ell(g, 66, 58, 5, 3); FO(g, rgba(b, 0.8));
    },
    geyser: function (g, a, b) {
      B(g); ell(g, 50, 82, 38, 9); F(g, b);
      B(g); g.moveTo(42, 82); g.bezierCurveTo(44, 60, 40, 40, 44, 26); g.lineTo(56, 26); g.bezierCurveTo(60, 40, 56, 60, 58, 82); g.closePath(); F(g, a);
      circles(g, [[40, 24, 10], [54, 18, 11], [66, 26, 8], [32, 30, 7]], shade(a, 0.45));
    },
    aurora: function (g, a, b) {
      B(g); rr(g, 10, 10, 80, 80, 18); F(g, '#1a1f5c');
      B(g); g.moveTo(16, 26); g.bezierCurveTo(30, 16, 44, 36, 58, 22); g.lineTo(58, 70); g.bezierCurveTo(44, 82, 30, 62, 16, 74); g.closePath(); FO(g, rgba(a, 0.85));
      B(g); g.moveTo(44, 30); g.bezierCurveTo(56, 20, 70, 38, 84, 26); g.lineTo(84, 66); g.bezierCurveTo(70, 78, 56, 60, 44, 72); g.closePath(); FO(g, rgba(b, 0.75));
      B(g); circ(g, 24, 18, 1.8); circ(g, 76, 16, 1.8); circ(g, 66, 80, 1.5); FO(g, '#ffffff');
      B(g); rr(g, 10, 10, 80, 80, 18); g.stroke();
    },
  };

  /* ------------------------------------------------------------------ */
  /* Icon rendering (cached per item)                                    */
  /* ------------------------------------------------------------------ */
  var ICON_PX = 128;

  function lum(hex) {
    var c = rgb(hex);
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  }
  function paintGlyph(g, def, outline) {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = outline;
    g.lineWidth = LW;
    (G[def.glyph] || G.sparkle)(g, def.c1, def.c2, '');
    if (def.over && G[def.over]) {
      if (def.over === 'horn' || def.over === 'wings') G[def.over](g, def.c1, def.c2, def.glyph);
      else sub(g, G[def.over], 52, 54, 0.46, def.c2 === '#ffffff' ? '#e3f2fd' : '#ffffff', def.c2);
    }
  }
  // Light "sticker token" for the elements set.
  function tokenBase(g, def) {
    var grd = g.createRadialGradient(40, 32, 4, 50, 50, 48);
    grd.addColorStop(0, mix(def.c1, '#ffffff', 0.9));
    grd.addColorStop(1, mix(def.c1, '#ffffff', 0.6));
    B(g); circ(g, 50, 50, 46); g.fillStyle = grd; g.fill();
    g.lineWidth = 2.6; g.strokeStyle = mix(def.c1, '#1b1c33', 0.55); g.stroke();
    B(g); g.ellipse(50, 30, 30, 13, 0, Math.PI, TAU); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  }
  // Dark glowing orb with a rarity-coloured frame for the auras set.
  function auraBase(g, def) {
    var rc = RARITY[def.rarity].col;
    var og = g.createRadialGradient(50, 50, 30, 50, 50, 50);
    og.addColorStop(0, rgba(rc, 0.6)); og.addColorStop(1, rgba(rc, 0));
    B(g); circ(g, 50, 50, 50); g.fillStyle = og; g.fill();
    if (def.rarity === 5) {
      g.fillStyle = rc;
      for (var k = 0; k < 12; k++) {
        var an = (k * TAU) / 12;
        B(g); poly(g, [50 + Math.cos(an - 0.1) * 38, 50 + Math.sin(an - 0.1) * 38, 50 + Math.cos(an) * 49, 50 + Math.sin(an) * 49, 50 + Math.cos(an + 0.1) * 38, 50 + Math.sin(an + 0.1) * 38]);
        g.fill();
      }
    }
    var grd = g.createRadialGradient(42, 36, 3, 50, 50, 40);
    grd.addColorStop(0, mix(def.c1, '#0a0618', 0.45));
    grd.addColorStop(0.75, mix(def.c1, '#0a0618', 0.78));
    grd.addColorStop(1, '#07040f');
    B(g); circ(g, 50, 50, 39); g.fillStyle = grd; g.fill();
    g.lineWidth = def.rarity >= 3 ? 4.2 : 3.2; g.strokeStyle = rc; g.stroke();
    B(g); circ(g, 50, 50, 34.5); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.22)'; g.stroke();
    if (def.rarity >= 3 && def.rarity < 5) {
      g.fillStyle = '#ffffff';
      [[0.6, 4.4], [2.4, 3.4], [4.3, 3.8]].forEach(function (s) { B(g); star4(g, 50 + Math.cos(s[0]) * 40, 50 + Math.sin(s[0]) * 40, s[1]); g.fill(); });
    }
  }
  function makeIcon(def, aura) {
    var px = ICON_PX;
    var c = document.createElement('canvas');
    c.width = c.height = px;
    var g = c.getContext('2d');
    g.scale(px / 100, px / 100);
    if (!aura) {
      tokenBase(g, def);
      g.save(); g.translate(50, 50); g.scale(0.74, 0.74); g.translate(-50, -50);
      paintGlyph(g, def, OL);
      g.restore();
      return c;
    }
    auraBase(g, def);
    // Glyph on its own layer so the glow is applied once to the whole silhouette.
    var gc = document.createElement('canvas');
    gc.width = gc.height = px;
    var gg = gc.getContext('2d');
    gg.scale(px / 100, px / 100);
    gg.translate(50, 50); gg.scale(0.58, 0.58); gg.translate(-50, -50);
    paintGlyph(gg, def, mix(lum(def.c1) > 0.3 ? def.c1 : def.c2, '#ffffff', 0.7));
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.shadowColor = lum(def.c1) > 0.18 ? def.c1 : def.c2;
    g.shadowBlur = px * 0.09;
    g.drawImage(gc, 0, 0);
    g.restore();
    return c;
  }
  function glowSprite(col) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, rgba(col, 0.9)); grd.addColorStop(0.45, rgba(col, 0.35)); grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return c;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var SVG = {
    hint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg>',
  };

  var CSS =
    '.ec-hud{position:absolute;z-index:5;display:flex;gap:6px;align-items:center;pointer-events:none;flex-wrap:wrap}' +
    '.ec-hud>*{pointer-events:auto}' +
    '.ec-count{display:flex;flex-direction:column;gap:4px;min-width:86px;padding:6px 12px 7px;border-radius:12px;background:rgba(6,8,20,.74);border:1px solid rgba(255,255,255,.14);color:#fff;font:800 14px/1 var(--font,system-ui)}' +
    '.ec-count small{font-weight:600;color:#aab0d8;font-size:11px}' +
    '.ec-count i{display:block;height:4px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden}' +
    '.ec-count i b{display:block;height:100%;width:0;background:linear-gradient(90deg,#2dd4f0,#8b6cff);transition:width .5s}' +
    '.ec-hb{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;min-width:36px;padding:0 11px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:rgba(6,8,20,.74);color:#fff;font:700 13px var(--font,system-ui);cursor:pointer;touch-action:manipulation}' +
    '.ec-hb svg{width:18px;height:18px;flex:none}' +
    '.ec-hb:disabled{opacity:.6;cursor:default}' +
    '.ec-hb:hover:not(:disabled){background:rgba(40,46,90,.9)}' +
    '.ec-hb:focus-visible,.ec-tile:focus-visible{outline:2px solid #2dd4f0;outline-offset:1px}' +
    '.ec-hb.ready{border-color:rgba(251,191,36,.6);color:#fde68a}' +
    '.ec-lib{position:absolute;z-index:4;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(15,18,40,.97),rgba(9,11,26,.98));border-left:1px solid rgba(255,255,255,.1)}' +
    '.ec-lib.bottom{border-left:0;border-top:1px solid rgba(255,255,255,.12)}' +
    '.ec-lib.trash::after{content:attr(data-trash);position:absolute;inset:0;display:grid;place-items:center;color:#fecaca;font:800 15px var(--font,system-ui);background:rgba(70,14,24,.82);box-shadow:inset 0 0 0 2px #f87171;pointer-events:none}' +
    '.ec-lhead{display:flex;gap:6px;padding:8px 8px 6px;align-items:center}' +
    '.ec-search{flex:1;min-width:0;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:600 14px var(--font,system-ui);padding:0 10px;outline:none;-webkit-user-select:text;user-select:text}' +
    '.ec-search::placeholder{color:#8f95c2}' +
    '.ec-search:focus{border-color:#8b6cff;box-shadow:0 0 0 2px rgba(139,108,255,.35)}' +
    '.ec-grid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--tw),1fr));grid-auto-rows:max-content;gap:6px;padding:2px 8px 10px;align-content:start;touch-action:pan-y;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}' +
    '.ec-lib.bottom .ec-grid{grid-template-columns:none;grid-auto-flow:column;grid-template-rows:repeat(var(--rows),max-content);grid-auto-columns:var(--tw);overflow-x:auto;overflow-y:hidden;touch-action:pan-x;align-content:start;padding-bottom:8px}' +
    '.ec-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;padding:6px 2px 5px;margin:0;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);color:#e9ebff;font:650 11.5px/1.15 var(--font,system-ui);cursor:grab;touch-action:inherit}' +
    '.ec-tile canvas{width:var(--ti);height:var(--ti);pointer-events:none}' +
    '.ec-tile span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 3px;pointer-events:none}' +
    '.ec-tile:hover{background:rgba(255,255,255,.1)}' +
    '.ec-tile.done{opacity:.48}' +
    '.ec-tile.done::before{content:"\\2713";position:absolute;top:3px;left:6px;font-size:10px;color:#8f95c2}' +
    '.ec-tile.final::before{content:"\\2605";position:absolute;top:3px;left:6px;font-size:10px;color:#fbbf24}' +
    '.ec-tile.fresh::after{content:"";position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 6px #34d399}' +
    '.ec-tile.hint{animation:ecHint .7s ease-in-out infinite alternate;border-color:#fbbf24;opacity:1}' +
    '.ec-tile.lift{opacity:.35}' +
    '.ec-tile.pop{animation:ecPop .9s ease}' +
    '@keyframes ecPop{0%{transform:scale(.4);background:rgba(52,211,153,.5)}35%{transform:scale(1.12)}100%{transform:scale(1)}}' +
    '@keyframes ecHint{to{background:rgba(251,191,36,.28);box-shadow:0 0 14px rgba(251,191,36,.65)}}' +
    '.ec-none{grid-column:1/-1;grid-row:1;color:#8f95c2;font:600 13px var(--font,system-ui);padding:10px 4px;white-space:nowrap}' +
    '.ec-ghost{position:absolute;left:0;top:0;z-index:30;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;will-change:transform;filter:drop-shadow(0 10px 12px rgba(0,0,0,.5))}' +
    '.ec-ghost span{font:700 12px var(--font,system-ui);color:#fff;background:rgba(6,8,20,.82);padding:2px 8px;border-radius:8px;white-space:nowrap}' +
    '.ec-card{position:absolute;z-index:8;display:flex;align-items:center;gap:12px;padding:10px 18px 10px 10px;border-radius:16px;background:rgba(12,14,34,.94);border:1px solid rgba(255,255,255,.18);box-shadow:0 14px 34px rgba(0,0,0,.55);pointer-events:none;animation:ecCard 2.8s ease forwards;max-width:94%;white-space:nowrap}' +
    '.ec-card canvas{width:58px;height:58px;flex:none}' +
    '.ec-card.sm{gap:9px;padding:6px 12px 6px 6px;border-radius:13px}.ec-card.sm canvas{width:40px;height:40px}.ec-card.sm b{font-size:16px}.ec-card.sm em{font-size:11px}.ec-card.sm small{font-size:10px}' +
    '.ec-card small{display:block;font:800 11px var(--font,system-ui);letter-spacing:.08em;text-transform:uppercase;color:#34d399}' +
    '.ec-card b{display:block;font:900 21px/1.15 var(--font,system-ui);color:#fff;overflow:hidden;text-overflow:ellipsis}' +
    '.ec-card em{display:block;font:600 12px var(--font,system-ui);color:#c4c8ea;font-style:normal}' +
    '@keyframes ecCard{0%{opacity:0;transform:translate(-50%,-10px) scale(.75)}9%{opacity:1;transform:translate(-50%,0) scale(1.06)}15%{transform:translate(-50%,0) scale(1)}86%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-8px)}}' +
    '.ec-help{text-align:left;margin:0;padding-left:18px}.ec-help li{margin:5px 0}' +
    '.ec-stats{display:grid;grid-template-columns:1fr auto;gap:4px 14px;text-align:left;margin:0 auto 4px;max-width:280px}.ec-stats b{color:#fff}' +
    '.ec-rar{display:inline-block;padding:1px 8px;border-radius:999px;font:800 10px var(--font,system-ui);letter-spacing:.06em;text-transform:uppercase;color:#0b0d17;margin-top:3px}';

  /* ------------------------------------------------------------------ */
  /* Engine                                                              */
  /* ------------------------------------------------------------------ */
  IGAME.register('element-craft', function (ctx) {
    var root = ctx.root;
    var store = ctx.store;
    var sfx = ctx.sfx;
    var ui = IGAME.ui;
    var AURA = ctx.variant === 'auras';
    var S = buildSet(SETS[AURA ? 'auras' : 'elements']);
    var TITLE = ctx.title || S.title;
    var NOUN = S.noun;
    var NOUNS = NOUN + 's';
    var MAX_WS = 60;
    var HINT_CD = 30000;
    var ALTAR_FAIL_CD = 10000;
    var ALTAR_OK_CD = 3000;

    /* ---------- state ---------- */
    var found = {};
    var foundOrder = [];
    var fresh = {};
    var ws = []; // workspace items {uid,id,x,y,born,shake,hidden,fly}
    var uidSeq = 1;
    var stats = { tries: 0, made: 0, time: 0, done: 0 };
    var hintEnd = 0;
    var altar = { x: 0, y: 0, r: 40, cd: 0, pity: 0 };
    var bestTime = store.get('bestTime', 0);
    var selected = null;
    var hint = null; // {a,b,until}
    var drag = null;
    var lastTap = { uid: 0, t: 0 };
    var lastDragEnd = 0;
    var sortMode = 'az';
    var started = false;
    var overlay = null;
    var toastEl = null;
    var cardEl = null;
    var timers = [];
    var iconCache = {};
    var labelW = {};
    var glow = {};
    var particles = [];
    var rings = [];
    var shake = 0;
    var nowT = 0;
    var saveTimer = 0;

    function later(fn, ms) {
      var id = setTimeout(function () {
        timers.splice(timers.indexOf(id), 1);
        fn();
      }, ms);
      timers.push(id);
      return id;
    }
    function icon(id) {
      return iconCache[id] || (iconCache[id] = makeIcon(S.items[id], AURA));
    }
    function glowFor(col) {
      return glow[col] || (glow[col] = glowSprite(col));
    }

    /* ---------- persistence ---------- */
    function load() {
      var sv = store.get('save', null);
      if (sv && sv.f && sv.f.length) {
        sv.f.forEach(function (id) {
          if (S.items[id] && !found[id]) { found[id] = true; foundOrder.push(id); }
        });
        (sv.fr || []).forEach(function (id) { if (found[id]) fresh[id] = true; });
        if (sv.st) stats = { tries: sv.st.tries || 0, made: sv.st.made || 0, time: sv.st.time || 0, done: sv.st.done || 0 };
        hintEnd = sv.h || 0;
        altar.cd = sv.ac || 0;
        altar.pity = sv.ap || 0;
        (sv.ws || []).forEach(function (w) {
          if (found[w[0]]) ws.push({ uid: uidSeq++, id: w[0], nx: w[1], ny: w[2], x: 0, y: 0, born: -1, shake: 0 });
        });
      }
      S.start.forEach(function (id) {
        if (!found[id]) { found[id] = true; foundOrder.push(id); fresh[id] = true; }
      });
      return !!(sv && sv.f && sv.f.length);
    }
    function save() {
      clearTimeout(saveTimer);
      store.set('save', {
        v: 1,
        f: foundOrder,
        fr: Object.keys(fresh),
        st: stats,
        h: hintEnd,
        ac: altar.cd,
        ap: altar.pity,
        ws: ws.filter(function (it) { return !it.fly && !it.dead; }).map(function (it) {
          return [it.id, Math.round(((it.x - IN.x) / IN.w) * 1000) / 1000, Math.round(((it.y - IN.y) / IN.h) * 1000) / 1000];
        }),
      });
    }
    function saveSoon() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 500);
    }
    var hadSave = load();

    /* ---------- DOM ---------- */
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    var bgCanvas = document.createElement('canvas');
    var view = IGAME.createCanvas(root, { onResize: layout });
    var c2 = view.ctx;
    view.canvas.style.zIndex = '1';

    var hud = ui.el('div', 'ec-hud');
    var countEl = ui.el('div', 'ec-count', '');
    var hintBtn = ui.el('button', 'ec-hb', SVG.hint + '<span>Hint</span>');
    var clearBtn = ui.el('button', 'ec-hb', SVG.clear);
    var menuBtn = ui.el('button', 'ec-hb', SVG.menu);
    [hintBtn, clearBtn, menuBtn].forEach(function (b) { b.type = 'button'; });
    hintBtn.title = 'Hint (H)';
    hintBtn.setAttribute('aria-label', 'Show a hint');
    clearBtn.title = 'Clear workspace (C)';
    clearBtn.setAttribute('aria-label', 'Clear workspace');
    menuBtn.title = 'Menu (Esc)';
    menuBtn.setAttribute('aria-label', 'Menu');
    hud.appendChild(countEl);
    hud.appendChild(hintBtn);
    hud.appendChild(clearBtn);
    hud.appendChild(menuBtn);
    root.appendChild(hud);

    var lib = ui.el('div', 'ec-lib');
    lib.setAttribute('data-trash', 'Drop here to remove');
    var lhead = ui.el('div', 'ec-lhead');
    var search = document.createElement('input');
    search.type = 'search';
    search.className = 'ec-search';
    search.setAttribute('aria-label', 'Search discovered ' + NOUNS);
    search.autocomplete = 'off';
    search.spellcheck = false;
    var sortBtn = ui.el('button', 'ec-hb', SVG.sort);
    sortBtn.type = 'button';
    sortBtn.setAttribute('aria-label', 'Change sort order');
    lhead.appendChild(search);
    lhead.appendChild(sortBtn);
    var grid = ui.el('div', 'ec-grid');
    grid.setAttribute('role', 'list');
    var noneEl = ui.el('div', 'ec-none', 'No matches');
    lib.appendChild(lhead);
    lib.appendChild(grid);
    root.appendChild(lib);

    var ghost = ui.el('div', 'ec-ghost');
    var ghostCv = document.createElement('canvas');
    var ghostName = document.createElement('span');
    ghost.appendChild(ghostCv);
    ghost.appendChild(ghostName);
    ghost.style.display = 'none';
    root.appendChild(ghost);

    /* ---------- layout ---------- */
    var W = 0, H = 0, portrait = false;
    var WS = { x: 0, y: 0, w: 1, h: 1 };
    var LIB = { x: 0, y: 0, w: 1, h: 1 };
    var IN = { x: 0, y: 0, w: 1, h: 1 }; // inner rect where item centres may sit
    var SZ = 56; // workspace item size
    var FS = 12; // label font size
    var hudH = 50;
    var tilesBuilt = false;

    function layout(w, h) {
      if (!lib || !view) return; // first call comes from createCanvas() before the DOM exists
      // remember normalised positions before the rect changes
      ws.forEach(function (it) {
        if (it.born !== -1 || it.nx == null) {
          it.nx = IN.w > 1 ? (it.x - IN.x) / IN.w : 0.5;
          it.ny = IN.h > 1 ? (it.y - IN.y) / IN.h : 0.5;
        }
      });
      W = w;
      H = h;
      portrait = w < h * 1.02;
      if (!portrait) {
        var lw = clamp(Math.round(w * 0.3), 180, 360);
        LIB = { x: w - lw, y: 0, w: lw, h: h };
        WS = { x: 0, y: 0, w: w - lw, h: h };
      } else {
        var lh = clamp(Math.round(h * 0.4), 150, 320);
        LIB = { x: 0, y: h - lh, w: w, h: lh };
        WS = { x: 0, y: 0, w: w, h: h - lh };
      }
      SZ = Math.round(clamp(Math.min(WS.w, WS.h) * 0.15, 46, 88));
      FS = Math.round(clamp(SZ * 0.2, 10.5, 14));
      labelW = {};
      lib.className = 'ec-lib' + (portrait ? ' bottom' : '');
      lib.style.left = LIB.x + 'px';
      lib.style.top = LIB.y + 'px';
      lib.style.width = LIB.w + 'px';
      lib.style.height = LIB.h + 'px';
      var tw, ti;
      if (portrait) {
        var rows = clamp(Math.floor((LIB.h - 52) / 60), 1, 4);
        ti = clamp(Math.floor((LIB.h - 54) / rows) - 34, 26, 42);
        tw = ti + 32;
        lib.style.setProperty('--rows', String(rows));
      } else {
        var cols = Math.max(2, Math.floor((LIB.w - 10) / 78));
        tw = Math.floor((LIB.w - 28 - (cols - 1) * 6) / cols);
        ti = clamp(tw - 32, 32, 46);
      }
      lib.style.setProperty('--tw', tw + 'px');
      lib.style.setProperty('--ti', ti + 'px');
      var pad = clamp(Math.round(Math.min(w, h) * 0.018), 8, 14);
      hud.style.left = WS.x + pad + 'px';
      hud.style.top = pad + 'px';
      hud.style.maxWidth = WS.w - pad * 2 + 'px';
      hudH = pad + 44;
      IN = {
        x: WS.x + SZ * 0.5 + 8,
        y: WS.y + hudH + SZ * 0.5,
        w: Math.max(1, WS.w - SZ - 16),
        h: Math.max(1, WS.h - hudH - SZ - FS - 30),
      };
      if (AURA) {
        altar.r = Math.round(clamp(SZ * 0.82, 34, 66));
        altar.x = WS.x + WS.w - altar.r - 18;
        altar.y = WS.y + WS.h - altar.r - 30;
      }
      ws.forEach(function (it) {
        it.x = IN.x + clamp(it.nx, 0, 1) * IN.w;
        it.y = IN.y + clamp(it.ny, 0, 1) * IN.h;
        if (it.born === -1) it.born = 0;
      });
      drawBackground();
      if (!tilesBuilt) buildTiles();
      updateHud();
    }

    function drawBackground() {
      var dpr = view.dpr;
      bgCanvas.width = Math.max(1, Math.round(W * dpr));
      bgCanvas.height = Math.max(1, Math.round(H * dpr));
      var g = bgCanvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var grd = g.createLinearGradient(0, 0, WS.w * 0.3, H);
      if (AURA) {
        grd.addColorStop(0, '#1a1036'); grd.addColorStop(0.55, '#120b28'); grd.addColorStop(1, '#0a0716');
      } else {
        grd.addColorStop(0, '#11294a'); grd.addColorStop(0.6, '#0d1c36'); grd.addColorStop(1, '#0a1426');
      }
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      var rg = g.createRadialGradient(WS.x + WS.w * 0.5, WS.y + WS.h * 0.45, 10, WS.x + WS.w * 0.5, WS.y + WS.h * 0.45, Math.max(WS.w, WS.h) * 0.7);
      rg.addColorStop(0, AURA ? 'rgba(160,90,255,0.18)' : 'rgba(80,190,255,0.14)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
      if (AURA) {
        // faint star field (deterministic so it doesn't flicker on resize)
        var seed = 7;
        var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (var i = 0; i < 90; i++) {
          g.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd() * 0.45).toFixed(2) + ')';
          var r = rnd() < 0.85 ? 1 : 1.8;
          g.fillRect(WS.x + rnd() * WS.w, WS.y + rnd() * WS.h, r, r);
        }
      } else {
        g.fillStyle = 'rgba(255,255,255,0.07)';
        var step = Math.max(22, Math.round(SZ * 0.5));
        for (var y = WS.y + step / 2; y < WS.y + WS.h; y += step) for (var x = WS.x + step / 2; x < WS.x + WS.w; x += step) g.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    /* ---------- library tiles ---------- */
    var tiles = {};
    function buildTiles() {
      tilesBuilt = true;
      grid.innerHTML = '';
      tiles = {};
      foundOrder.forEach(function (id) { addTile(id, true); });
      sortTiles();
      refreshDone();
      search.placeholder = 'Search ' + foundOrder.length + ' ' + NOUNS + '…';
    }
    function addTile(id, quiet) {
      if (tiles[id]) return tiles[id];
      var def = S.items[id];
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'ec-tile' + (fresh[id] ? ' fresh' : '');
      t.setAttribute('role', 'listitem');
      t.setAttribute('data-id', id);
      t.title = def.name + (AURA ? ' · ' + RARITY[def.rarity].name : '');
      var cv = document.createElement('canvas');
      var px = Math.round(46 * Math.min(2, window.devicePixelRatio || 1));
      cv.width = cv.height = px;
      cv.getContext('2d').drawImage(icon(id), 0, 0, px, px);
      var sp = document.createElement('span');
      sp.textContent = def.name;
      if (AURA) sp.style.color = def.rarity >= 2 ? mix(RARITY[def.rarity].col, '#ffffff', 0.35) : '';
      t.appendChild(cv);
      t.appendChild(sp);
      if (AURA && def.rarity >= 3) t.style.borderColor = rgba(RARITY[def.rarity].col, 0.55);
      tiles[id] = t;
      grid.appendChild(t);
      if (!quiet) { sortTiles(); applyFilter(); }
      return t;
    }
    function sortTiles() {
      var ids = foundOrder.slice();
      if (sortMode === 'az') ids.sort(function (a, b) { return S.items[a].name.localeCompare(S.items[b].name); });
      else if (sortMode === 'rarity') ids.sort(function (a, b) { return S.items[b].rarity - S.items[a].rarity || S.items[a].name.localeCompare(S.items[b].name); });
      else ids.reverse();
      ids.forEach(function (id) { if (tiles[id]) grid.appendChild(tiles[id]); });
      sortBtn.title = 'Sort: ' + (sortMode === 'az' ? 'A–Z' : sortMode === 'rarity' ? 'rarity' : 'newest first');
    }
    function applyFilter() {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      foundOrder.forEach(function (id) {
        var on = !q || S.items[id].name.toLowerCase().indexOf(q) > -1;
        tiles[id].style.display = on ? '' : 'none';
        if (on) shown++;
      });
      if (!shown) { noneEl.textContent = 'No ' + NOUNS + ' match “' + search.value.trim() + '”'; grid.appendChild(noneEl); }
      else if (noneEl.parentNode) noneEl.parentNode.removeChild(noneEl);
    }
    // An item is "done" when every recipe that uses it has already been discovered.
    function isDone(id) {
      var u = S.uses[id] || [];
      for (var i = 0; i < u.length; i++) if (!found[S.recipes[u[i]].r]) return false;
      return true;
    }
    function refreshDone() {
      foundOrder.forEach(function (id) {
        var t = tiles[id];
        if (!t) return;
        var fin = !(S.uses[id] || []).length;
        t.classList.toggle('final', fin);
        t.classList.toggle('done', !fin && isDone(id));
      });
    }
    function firstVisibleTile() {
      var kids = grid.children;
      for (var i = 0; i < kids.length; i++) if (kids[i].classList.contains('ec-tile') && kids[i].style.display !== 'none') return kids[i];
      return null;
    }
    function scrollTileIntoView(t) {
      if (!t) return;
      if (portrait) grid.scrollLeft = t.offsetLeft - grid.clientWidth / 2 + t.offsetWidth / 2;
      else grid.scrollTop = t.offsetTop - grid.clientHeight / 2 + t.offsetHeight / 2;
    }

    /* ---------- HUD ---------- */
    var lastHintTxt = '';
    function updateHud() {
      var n = foundOrder.length;
      countEl.innerHTML = '<span>' + n + ' / ' + S.total + ' <small>' + NOUNS + '</small></span><i><b style="width:' + ((n / S.total) * 100).toFixed(1) + '%"></b></i>';
      countEl.title = n + ' of ' + S.total + ' ' + NOUNS + ' discovered';
      search.placeholder = 'Search ' + n + ' ' + NOUNS + '…';
      updateHintBtn(true);
    }
    function updateHintBtn(force) {
      var left = Math.ceil((hintEnd - Date.now()) / 1000);
      var txt = left > 0 ? left + 's' : 'Hint';
      if (!force && txt === lastHintTxt) return;
      lastHintTxt = txt;
      hintBtn.querySelector('span').textContent = txt;
      hintBtn.disabled = left > 0;
      hintBtn.classList.toggle('ready', left <= 0);
    }

    /* ---------- workspace items ---------- */
    function spawn(id, x, y, opts) {
      opts = opts || {};
      var it = { uid: uidSeq++, id: id, x: x, y: y, born: opts.instant ? 0 : nowT, shake: 0 };
      ws.push(it);
      var alive = ws.filter(function (w) { return !w.fly && !w.dead; });
      if (alive.length > MAX_WS) {
        var old = alive[0] === selected ? alive[1] : alive[0];
        removeItem(old, true);
      }
      return it;
    }
    function removeItem(it, poof) {
      var i = ws.indexOf(it);
      if (i > -1) ws.splice(i, 1);
      if (selected === it) selected = null;
      if (poof) burst(it.x, it.y, [S.items[it.id].c1, '#ffffff'], 10, 0.6);
    }
    function clampIn(p) {
      p.x = clamp(p.x, IN.x, IN.x + IN.w);
      p.y = clamp(p.y, IN.y, IN.y + IN.h);
      return p;
    }
    function freeSpot() {
      var best = null, bestD = -1;
      for (var i = 0; i < 28; i++) {
        var p = { x: IN.x + IN.w * (0.12 + Math.random() * 0.76), y: IN.y + IN.h * (0.1 + Math.random() * 0.8) };
        var d = 1e9;
        ws.forEach(function (it) { d = Math.min(d, Math.hypot(it.x - p.x, it.y - p.y)); });
        if (AURA) d = Math.min(d, Math.hypot(altar.x - p.x, altar.y - p.y) - altar.r * 0.6);
        if (d > bestD) { bestD = d; best = p; }
      }
      return best;
    }
    function itemAt(x, y, except) {
      for (var i = ws.length - 1; i >= 0; i--) {
        var it = ws[i];
        if (it === except || it.fly || it.hidden || it.dead) continue;
        if (Math.abs(it.x - x) < SZ * 0.5 && Math.abs(it.y - y) < SZ * 0.5 + FS * 0.6) return it;
      }
      return null;
    }
    // Nearest item close enough to count as "dropped onto".
    function targetAt(x, y, except) {
      var best = null, bd = SZ * 0.72;
      for (var i = 0; i < ws.length; i++) {
        var it = ws[i];
        if (it === except || it.fly || it.hidden || it.dead) continue;
        var d = Math.hypot(it.x - x, it.y - y);
        if (d < bd) { bd = d; best = it; }
      }
      return best;
    }
    // A free spot next to `target`, preferring the side facing (fromX, fromY).
    function besidePos(target, fromX, fromY) {
      var base = Math.atan2(fromY - target.y, fromX - target.x);
      if (Math.hypot(fromX - target.x, fromY - target.y) < 4) base = Math.atan2(IN.y + IN.h / 2 - target.y, IN.x + IN.w / 2 - target.x);
      var first = null;
      for (var k = 0; k < 16; k++) {
        var an = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45;
        var dist = SZ * (k < 8 ? 1.12 : 1.6);
        var p = { x: target.x + Math.cos(an) * dist, y: target.y + Math.sin(an) * dist };
        if (p.x < IN.x || p.x > IN.x + IN.w || p.y < IN.y || p.y > IN.y + IN.h) continue;
        if (!first) first = p;
        var ok = true;
        for (var i = 0; i < ws.length; i++) {
          var it = ws[i];
          if (it === target || it.hidden || it.fly) continue;
          if (Math.hypot(it.x - p.x, it.y - p.y) < SZ * 0.85) { ok = false; break; }
        }
        if (ok) return p;
      }
      return first || clampIn({ x: target.x - SZ * 1.1, y: target.y });
    }
    function onAltar(it) {
      return AURA && Math.hypot(it.x - altar.x, it.y - altar.y) < altar.r * 0.95;
    }
    function altarChance() {
      return Math.min(1, 0.5 + altar.pity * 0.1);
    }

    /* ---------- combining ---------- */
    // src: {id, item?, x, y}; target: workspace item
    function combine(src, target) {
      stats.tries++;
      var rc = S.recipes[pairKey(src.id, target.id)];
      var now = Date.now();
      function keepBeside() {
        if (src.item) {
          // workspace items bounce back to where they came from
          src.item.hidden = false;
          var hx = src.hx != null ? src.hx : src.x, hy = src.hy != null ? src.hy : src.y;
          if (Math.hypot(hx - target.x, hy - target.y) < SZ * 0.8) { var bp = besidePos(target, src.x, src.y); hx = bp.x; hy = bp.y; }
          flyTo(src.id, src.x, src.y, hx, hy, function (fit) { fit.shake = 0.3; }, src.item);
          src.item.fly.dur = 0.22;
        } else {
          var p = besidePos(target, src.x, src.y);
          spawn(src.id, p.x, p.y);
        }
      }
      if (!rc) {
        sfx('error');
        target.shake = 0.45;
        keepBeside();
        saveSoon();
        return;
      }
      if (rc.altar) {
        if (!onAltar(target)) {
          keepBeside();
          target.shake = 0.3;
          sfx({ f: 520, f2: 780, d: 0.25, type: 'sine', v: 0.1 });
          toast('✦ These two resonate… fuse them on the Fusion Altar');
          saveSoon();
          return;
        }
        if (now < altar.cd) {
          keepBeside();
          sfx('error');
          toast('The altar is recharging · ' + Math.ceil((altar.cd - now) / 1000) + 's');
          return;
        }
        var chance = altarChance();
        if (Math.random() >= chance) {
          altar.pity++;
          altar.cd = now + ALTAR_FAIL_CD;
          keepBeside();
          target.shake = 0.6;
          shake = 0.35;
          burst(altar.x, altar.y, ['#6b7280', '#a78bfa', '#1f2937'], 26, 1);
          sfx('lose');
          toast('Fusion failed! Next try: ' + Math.round(altarChance() * 100) + '% chance');
          save();
          return;
        }
        altar.pity = 0;
        altar.cd = now + ALTAR_OK_CD;
      }
      // success
      if (src.item) removeItem(src.item, false);
      removeItem(target, false);
      var res = spawn(rc.r, target.x, target.y);
      var def = S.items[rc.r];
      stats.made++;
      var isNew = !found[rc.r];
      burst(res.x, res.y, [def.c1, def.c2, '#ffffff'], isNew ? 34 : 16, isNew ? 1.25 : 0.8);
      rings.push({ x: res.x, y: res.y, t: 0, col: AURA ? RARITY[def.rarity].col : def.c1, big: isNew });
      if (isNew) { if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl); discover(rc.r, rc); }
      else sfx('merge');
      selected = null;
      save();
    }

    function discover(id, rc) {
      found[id] = true;
      foundOrder.push(id);
      fresh[id] = true;
      var tile = addTile(id);
      refreshDone();
      updateHud();
      if (!search.value) scrollTileIntoView(tile);
      tile.classList.add('pop');
      later(function () { tile.classList.remove('pop'); }, 900);
      var def = S.items[id];
      shake = Math.max(shake, def.rarity === 5 ? 0.5 : 0.18);
      if (def.rarity === 5) sfx('win');
      else sfx('levelup');
      showCard(id, rc);
      var n = foundOrder.length, pct = n / S.total;
      [0.25, 0.5, 0.75].forEach(function (m) {
        if (pct >= m && (n - 1) / S.total < m) later(function () { toast(Math.round(m * 100) + '% of all ' + NOUNS + ' discovered!'); sfx('coin'); }, 1400);
      });
      if (n >= S.total && !stats.done) {
        stats.done = Math.max(1, Math.round(stats.time));
        if (!bestTime || stats.done < bestTime) { bestTime = stats.done; store.set('bestTime', bestTime); }
        later(showComplete, 1800);
      }
    }

    function showCard(id, rc) {
      if (cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
      var def = S.items[id];
      var card = ui.el('div', 'ec-card' + (WS.h < 360 || WS.w < 420 ? ' sm' : ''));
      var cv = document.createElement('canvas');
      cv.width = cv.height = 116;
      cv.getContext('2d').drawImage(icon(id), 0, 0, 116, 116);
      var info = document.createElement('div');
      var label = def.rarity === 5 ? 'Legendary ' + NOUN + '!' : 'New ' + NOUN + '!';
      info.innerHTML =
        '<small' + (AURA ? ' style="color:' + RARITY[def.rarity].col + '"' : '') + '>' + label + '</small><b></b><em></em>' +
        (AURA ? '<span class="ec-rar" style="background:' + RARITY[def.rarity].col + '">' + RARITY[def.rarity].name + '</span>' : '');
      info.querySelector('b').textContent = def.name;
      info.querySelector('em').textContent = S.items[rc.a].name + ' + ' + S.items[rc.b].name + (rc.altar ? ' · Fusion Altar' : '');
      card.appendChild(cv);
      card.appendChild(info);
      card.style.left = WS.x + WS.w / 2 + 'px';
      card.style.top = hudH + 4 + 'px';
      root.appendChild(card);
      cardEl = card;
      later(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 2850);
    }

    function toast(text) {
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      toastEl = ui.toast(root, text, 1700);
      toastEl.style.left = WS.x + WS.w / 2 + 'px';
      toastEl.style.top = 'auto';
      toastEl.style.bottom = H - (WS.y + WS.h) + 44 + 'px';
      toastEl.style.maxWidth = WS.w - 24 + 'px';
      toastEl.style.whiteSpace = 'normal';
      toastEl.style.width = 'max-content';
      toastEl.style.textAlign = 'center';
    }

    /* ---------- fly animation (tap-to-add / tap-to-combine) ---------- */
    function flyTo(id, fx, fy, tx, ty, onArrive, item) {
      var it = item || { uid: uidSeq++, id: id, x: fx, y: fy, born: 0, shake: 0 };
      it.fly = { x0: fx, y0: fy, x1: tx, y1: ty, t: 0, dur: 0.28, done: onArrive };
      if (ws.indexOf(it) < 0) ws.push(it);
      else { ws.splice(ws.indexOf(it), 1); ws.push(it); }
      return it;
    }
    function tileCenter(t) {
      var r = t.getBoundingClientRect(), rr2 = root.getBoundingClientRect();
      return { x: r.left - rr2.left + r.width / 2, y: r.top - rr2.top + r.height * 0.4 };
    }
    function tapLibrary(id, tileEl) {
      if (!started) return;
      markUsed(id);
      var from = tileEl ? tileCenter(tileEl) : { x: LIB.x + LIB.w / 2, y: LIB.y + 40 };
      if (selected && ws.indexOf(selected) > -1) {
        var target = selected;
        sfx('pop');
        flyTo(id, from.x, from.y, target.x, target.y, function (fit) {
          ws.splice(ws.indexOf(fit), 1);
          if (ws.indexOf(target) < 0) { spawn(id, fit.x, fit.y); return; }
          combine({ id: id, x: fit.x - 1, y: fit.y + 1 }, target);
        });
        return;
      }
      var p = freeSpot();
      sfx('pop');
      flyTo(id, from.x, from.y, p.x, p.y, function (fit) {
        fit.fly = null;
        fit.born = nowT;
        if (ws.filter(function (w) { return !w.fly; }).length > MAX_WS) removeItem(ws[0], true);
        saveSoon();
      });
    }
    function markUsed(id) {
      if (fresh[id]) {
        delete fresh[id];
        if (tiles[id]) tiles[id].classList.remove('fresh');
      }
    }
    function select(it) {
      selected = it;
      if (it) sfx('tick');
    }
    function tapWorkspaceItem(it) {
      var t = performance.now();
      if (lastTap.uid === it.uid && t - lastTap.t < 320) {
        // double-tap / double-click → duplicate
        lastTap.uid = 0;
        duplicate(it);
        return;
      }
      lastTap = { uid: it.uid, t: t };
      if (selected && selected !== it && ws.indexOf(selected) > -1) {
        var a = selected, target = it, hx = a.x, hy = a.y;
        selected = null;
        flyTo(a.id, a.x, a.y, target.x, target.y, function (fit) {
          fit.fly = null;
          if (ws.indexOf(target) < 0) return;
          combine({ id: fit.id, item: fit, x: fit.x, y: fit.y, hx: hx, hy: hy }, target);
        }, a);
        return;
      }
      select(selected === it ? null : it);
    }
    function duplicate(it) {
      if (!it || ws.indexOf(it) < 0) return;
      var p = besidePos(it, it.x + SZ * 0.6, it.y + SZ * 0.25);
      spawn(it.id, p.x, p.y);
      sfx('pop');
      saveSoon();
    }
    function clearWorkspace() {
      if (!ws.length) return;
      ws.slice().forEach(function (it) { if (!it.fly) removeItem(it, true); });
      selected = null;
      sfx('slide');
      save();
    }

    /* ---------- hint ---------- */
    function giveHint() {
      if (!started) return;
      var now = Date.now();
      if (now < hintEnd) return;
      var cands = [], legs = [];
      for (var k in S.recipes) {
        var rc = S.recipes[k];
        if (found[rc.a] && found[rc.b] && !found[rc.r]) (rc.altar ? legs : cands).push(rc);
      }
      var pool = cands.length ? cands : legs;
      if (!pool.length) { toast('Nothing left to discover — you found them all!'); return; }
      var rc2 = pool[Math.floor(Math.random() * pool.length)];
      hint = { a: rc2.a, b: rc2.b, until: nowT + 8 };
      hintEnd = now + HINT_CD;
      updateHintBtn(true);
      search.value = '';
      applyFilter();
      [rc2.a, rc2.b].forEach(function (id) { if (tiles[id]) tiles[id].classList.add('hint'); });
      scrollTileIntoView(tiles[rc2.a]);
      sfx('match');
      var na = S.items[rc2.a].name, nb = S.items[rc2.b].name;
      toast(rc2.altar ? 'Hint: fuse ' + na + ' + ' + nb + ' on the Fusion Altar' : 'Hint: try ' + na + ' + ' + nb);
      later(function () { [rc2.a, rc2.b].forEach(function (id) { if (tiles[id]) tiles[id].classList.remove('hint'); }); }, 8000);
      saveSoon();
    }

    /* ---------- particles ---------- */
    function burst(x, y, cols, n, power) {
      for (var i = 0; i < n; i++) {
        if (particles.length > 260) break;
        var an = Math.random() * TAU, sp = (60 + Math.random() * 220) * power;
        particles.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 40 * power, life: 0, max: 0.5 + Math.random() * 0.6, s: 2 + Math.random() * 3.5 * power, c: cols[i % cols.length], star: Math.random() < 0.3 });
      }
    }

    /* ---------- pointer input ---------- */
    function local(e) {
      var r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function inLib(p) {
      return p.x >= LIB.x && p.x <= LIB.x + LIB.w && p.y >= LIB.y && p.y <= LIB.y + LIB.h;
    }
    function showGhost(id) {
      var s = Math.round(SZ * 1.12);
      var px = Math.round(s * view.dpr);
      if (ghostCv.width !== px) { ghostCv.width = ghostCv.height = px; }
      ghostCv.style.width = ghostCv.style.height = s + 'px';
      var g = ghostCv.getContext('2d');
      g.clearRect(0, 0, px, px);
      g.drawImage(icon(id), 0, 0, px, px);
      ghostName.textContent = S.items[id].name;
      ghost.style.display = 'flex';
    }
    function moveGhost(x, y) {
      var s = SZ * 1.12;
      ghost.style.transform = 'translate3d(' + Math.round(x - ghost.offsetWidth / 2) + 'px,' + Math.round(y - s / 2) + 'px,0)';
    }
    function hideGhost() {
      ghost.style.display = 'none';
      lib.classList.remove('trash');
    }
    function beginDragVisual() {
      showGhost(drag.id);
      moveGhost(drag.x, drag.y);
      if (drag.item) drag.item.hidden = true;
      if (drag.tile) drag.tile.classList.add('lift');
      markUsed(drag.id);
      sfx('tick');
    }

    function onCanvasDown(e) {
      if (!started || overlay || drag) return;
      if (document.activeElement === search) search.blur();
      var p = local(e);
      var it = itemAt(p.x, p.y);
      if (!it) {
        if (selected) select(null);
        return;
      }
      e.preventDefault();
      drag = { src: 'ws', id: it.id, item: it, hx: it.x, hy: it.y, pid: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, ox: p.x - it.x, oy: p.y - it.y, moved: false, touch: e.pointerType === 'touch' };
    }
    function onGridDown(e) {
      if (!started || overlay || drag) return;
      var t = e.target.closest && e.target.closest('.ec-tile');
      if (!t) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var p = local(e);
      drag = { src: 'lib', id: t.getAttribute('data-id'), tile: t, pid: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, ox: 0, oy: 0, moved: false, touch: e.pointerType !== 'mouse' };
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var p = local(e);
      drag.x = p.x;
      drag.y = p.y;
      if (!drag.moved) {
        var dx = p.x - drag.sx, dy = p.y - drag.sy;
        var dist = Math.hypot(dx, dy);
        if (drag.src === 'lib' && drag.touch) {
          // Touch in the library: movement along the scroll axis scrolls, across it drags.
          var along = portrait ? Math.abs(dx) : Math.abs(dy);
          var across = portrait ? Math.abs(dy) : Math.abs(dx);
          if (along > 10 && along >= across) { drag = null; return; }
          if (across < 10) return;
        } else if (dist < 6) return;
        drag.moved = true;
        beginDragVisual();
      }
      if (e.cancelable) e.preventDefault();
      var cx = drag.x - drag.ox, cy = drag.y - drag.oy;
      moveGhost(cx, cy);
      lib.classList.toggle('trash', drag.src === 'ws' && inLib(p));
      drag.over = inLib(p) ? null : targetAt(cx, cy, drag.item);
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag;
      drag = null;
      if (d.tile) d.tile.classList.remove('lift');
      if (!d.moved) {
        if (d.src === 'ws' && e.type === 'pointerup') tapWorkspaceItem(d.item);
        return; // library taps are handled by the tile's click event
      }
      lastDragEnd = Date.now();
      hideGhost();
      var p = local(e);
      var cx = p.x - d.ox, cy = p.y - d.oy;
      if (e.type === 'pointercancel') { if (d.item) d.item.hidden = false; return; }
      if (inLib(p)) {
        if (d.item) { removeItem(d.item, true); sfx('pop'); saveSoon(); }
        return;
      }
      var pos = clampIn({ x: cx, y: cy });
      var target = targetAt(cx, cy, d.item);
      if (target) {
        if (d.item) { d.item.x = cx; d.item.y = cy; }
        combine({ id: d.id, item: d.item, x: cx, y: cy, hx: d.hx, hy: d.hy }, target);
      } else if (d.item) {
        d.item.x = pos.x;
        d.item.y = pos.y;
        d.item.hidden = false;
        ws.splice(ws.indexOf(d.item), 1);
        ws.push(d.item);
        sfx('tick');
        saveSoon();
      } else {
        spawn(d.id, pos.x, pos.y);
        sfx('pop');
        saveSoon();
      }
    }
    function onGridClick(e) {
      var t = e.target.closest && e.target.closest('.ec-tile');
      if (!t) return;
      if (Date.now() - lastDragEnd < 350) return;
      tapLibrary(t.getAttribute('data-id'), t);
    }

    view.canvas.addEventListener('pointerdown', onCanvasDown);
    grid.addEventListener('pointerdown', onGridDown);
    grid.addEventListener('click', onGridClick);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    hintBtn.addEventListener('click', giveHint);
    clearBtn.addEventListener('click', function () { if (started) clearWorkspace(); });
    menuBtn.addEventListener('click', function () { if (started) showMenu(); });
    sortBtn.addEventListener('click', function () {
      var modes = AURA ? ['az', 'new', 'rarity'] : ['az', 'new'];
      sortMode = modes[(modes.indexOf(sortMode) + 1) % modes.length];
      sortTiles();
      applyFilter();
      sfx('tick');
      toast('Sorted ' + (sortMode === 'az' ? 'A–Z' : sortMode === 'rarity' ? 'by rarity' : 'newest first'));
    });
    search.addEventListener('input', applyFilter);
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var t = firstVisibleTile();
        if (t) tapLibrary(t.getAttribute('data-id'), t);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        search.value = '';
        applyFilter();
        search.blur();
      } else if (e.key === 'ArrowDown') {
        var t2 = firstVisibleTile();
        if (t2) { e.preventDefault(); t2.focus(); }
      }
    });

    /* ---------- keyboard ---------- */
    ctx.captureKeys(['KeyH', 'KeyC', 'KeyD', 'KeyF', 'Slash', 'Delete', 'Backspace', 'KeyM']);
    ctx.onKey(function (code, down, e) {
      if (!down) return;
      if (overlay) {
        if (code === 'Space' || code === 'Enter') {
          var b = overlay.panel.querySelector('.ig-btn:focus') || overlay.panel.querySelector('.ig-actions .ig-btn');
          if (b) { if (e) e.preventDefault(); b.click(); }
        }
        return;
      }
      if (!started) return;
      var active = document.activeElement;
      if (code === 'Space' && active && active.classList && active.classList.contains('ec-tile')) { active.click(); return; }
      if (code === 'KeyH') giveHint();
      else if (code === 'KeyC') clearWorkspace();
      else if (code === 'KeyD') duplicate(selected);
      else if (code === 'Delete' || code === 'Backspace') { if (selected) { removeItem(selected, true); sfx('pop'); saveSoon(); } }
      else if (code === 'Slash' || code === 'KeyF') { if (e) e.preventDefault(); search.focus(); }
      else if (code === 'Escape' || code === 'KeyM') { if (selected && code === 'Escape') select(null); else showMenu(); }
      else if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown') cycleSelection(code === 'ArrowLeft' || code === 'ArrowUp' ? -1 : 1);
    });
    function cycleSelection(dir) {
      var list = ws.filter(function (it) { return !it.fly && !it.hidden; }).sort(function (a, b) { return a.x - b.x || a.y - b.y; });
      if (!list.length) return;
      var i = list.indexOf(selected);
      select(list[(i + dir + list.length) % list.length] || list[0]);
    }

    /* ---------- overlays ---------- */
    function closeOverlay() {
      if (overlay) overlay.close();
      overlay = null;
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }
    function helpHtml() {
      return (
        '<ul class="ec-help">' +
        '<li><b>Drag</b> ' + NOUNS + ' from the library onto the workspace, then drop one onto another to combine them.</li>' +
        '<li><b>Tap</b> a library ' + NOUN + ' to add it. Tap an item on the workspace to select it, then tap another (or a library ' + NOUN + ') to combine.</li>' +
        '<li><b>Double-tap</b> an item to copy it. Drag it back to the library to remove it.</li>' +
        (AURA ? '<li><b>Legendary auras</b> only fuse on the <b>Fusion Altar</b>: put one ingredient on the altar and drop the other onto it. 50% chance, +10% after every miss, short cooldown.</li>' : '') +
        '<li>Faded library ' + NOUNS + ' have nothing left to give; ★ marks final ' + NOUNS + '. Stuck? Use <b>Hint</b>.</li>' +
        '<li>Keys: <span class="ig-kbd">/</span> search · <span class="ig-kbd">Enter</span> add first result · <span class="ig-kbd">←</span><span class="ig-kbd">→</span> select · <span class="ig-kbd">D</span> copy · <span class="ig-kbd">Del</span> remove · <span class="ig-kbd">H</span> hint · <span class="ig-kbd">C</span> clear</li>' +
        '</ul>'
      );
    }
    function showStart() {
      closeOverlay();
      var n = foundOrder.length;
      var btns = [{ label: hadSave && n > 4 ? 'Continue (' + n + '/' + S.total + ')' : 'Play', primary: true, onClick: startGame }];
      btns.push({ label: 'How to play', onClick: function () { showHelp(showStart); } });
      overlay = ui.overlay(root, {
        title: TITLE,
        text: AURA
          ? 'Drag one aura onto another to fuse a new one. Start with 4 — collect all ' + S.total + ', from Common to Legendary.'
          : 'Drag one element onto another to discover a new one. Start with 4 — find all ' + S.total + '.',
        buttons: btns,
      });
    }
    function showHelp(back) {
      closeOverlay();
      overlay = ui.overlay(root, { title: 'How to play', html: helpHtml(), buttons: [{ label: 'Got it', primary: true, onClick: back }] });
      overlay.panel.style.width = 'min(520px, 100%)';
    }
    function fmtT(s) { return IGAME.fmtTime(s); }
    function statsHtml() {
      var leg = 0, legTot = 0;
      if (AURA) S.order.forEach(function (id) { if (S.items[id].rarity === 5) { legTot++; if (found[id]) leg++; } });
      return (
        '<div class="ec-stats">' +
        '<span>Discovered</span><b>' + foundOrder.length + ' / ' + S.total + '</b>' +
        (AURA ? '<span>Legendary auras</span><b>' + leg + ' / ' + legTot + '</b>' : '') +
        '<span>Combinations tried</span><b>' + stats.tries + '</b>' +
        '<span>Time played</span><b>' + fmtT(stats.time) + '</b>' +
        (bestTime ? '<span>Best completion</span><b>' + fmtT(bestTime) + '</b>' : '') +
        '</div>'
      );
    }
    function showMenu() {
      if (overlay) return;
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      overlay = ui.overlay(root, {
        title: 'Menu',
        html: statsHtml(),
        buttons: [
          { label: 'Resume', primary: true, onClick: closeOverlay },
          { label: 'How to play', onClick: function () { showHelp(function () { closeOverlay(); showMenu(); }); } },
          { label: 'Reset progress', onClick: confirmReset },
        ],
      });
    }
    function confirmReset() {
      closeOverlay();
      overlay = ui.overlay(root, {
        title: 'Start over?',
        text: 'This forgets all ' + foundOrder.length + ' discovered ' + NOUNS + ' and clears the workspace.',
        buttons: [
          { label: 'Keep playing', primary: true, onClick: closeOverlay },
          { label: 'Reset', onClick: resetAll },
        ],
      });
    }
    function resetAll() {
      closeOverlay();
      found = {};
      foundOrder = [];
      fresh = {};
      ws = [];
      selected = null;
      stats = { tries: 0, made: 0, time: 0, done: 0 };
      hintEnd = 0;
      altar.cd = 0;
      altar.pity = 0;
      S.start.forEach(function (id) { found[id] = true; foundOrder.push(id); fresh[id] = true; });
      buildTiles();
      updateHud();
      seedWorkspace();
      save();
      sfx('click');
    }
    function showComplete() {
      closeOverlay();
      sfx('win');
      for (var i = 0; i < 6; i++) later(function () { burst(WS.x + WS.w * (0.2 + Math.random() * 0.6), WS.y + WS.h * (0.25 + Math.random() * 0.4), ['#fbbf24', '#34d399', '#8b6cff', '#2dd4f0', '#fb7185'], 30, 1.4); }, i * 220);
      overlay = ui.overlay(root, {
        title: 'Collection complete!',
        text: 'You discovered all ' + S.total + ' ' + NOUNS + ' in ' + fmtT(stats.done) + ' with ' + stats.tries + ' combinations.',
        html: bestTime ? '<p style="margin:0">Best completion time: <b>' + fmtT(bestTime) + '</b></p>' : '',
        buttons: [
          { label: 'Keep playing', primary: true, onClick: closeOverlay },
          { label: 'Start a new collection', onClick: resetAll },
        ],
      });
      save();
    }
    function seedWorkspace() {
      // Lay the four starting items out in a neat row so a new player can start immediately.
      var n = S.start.length;
      // keep clear of the Fusion Altar in the bottom-right corner
      var right = AURA ? Math.min(IN.x + IN.w, altar.x - altar.r - SZ * 0.55) : IN.x + IN.w;
      var avail = Math.max(SZ * n, right - IN.x);
      var y = AURA ? Math.min(IN.y + IN.h * 0.38, altar.y - altar.r - SZ * 0.9) : IN.y + IN.h * 0.38;
      S.start.forEach(function (id, i) {
        var x = IN.x + avail * (0.5 + (i - (n - 1) / 2) * Math.min(0.22, 0.92 / n));
        spawn(id, x, Math.max(IN.y, y));
      });
    }
    function startGame() {
      closeOverlay();
      started = true;
      if (!ws.length && foundOrder.length <= S.start.length + 1) seedWorkspace();
      sfx('click');
      save();
    }

    /* ---------- render loop ---------- */
    var lastSaveT = 0;
    var loop = IGAME.loop(function (dt) {
      nowT += dt;
      if (started && !overlay) stats.time += dt;
      if (nowT - lastSaveT > 10) { lastSaveT = nowT; if (started) save(); }
      if (shake > 0) shake = Math.max(0, shake - dt);
      updateHintBtn(false);
      // fly animations
      for (var i = ws.length - 1; i >= 0; i--) {
        var it = ws[i];
        if (!it) continue;
        if (it.shake > 0) it.shake = Math.max(0, it.shake - dt);
        if (it.fly) {
          var f = it.fly;
          f.t += dt / f.dur;
          var k = easeInOut(Math.min(1, f.t));
          it.x = f.x0 + (f.x1 - f.x0) * k;
          it.y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * SZ * 0.4;
          if (f.t >= 1) { it.x = f.x1; it.y = f.y1; var cb = f.done; it.fly = null; if (cb) cb(it); }
        }
      }
      for (var p = particles.length - 1; p >= 0; p--) {
        var q = particles[p];
        q.life += dt;
        if (q.life >= q.max) { particles[p] = particles[particles.length - 1]; particles.pop(); continue; }
        q.vy += 380 * dt;
        q.vx *= 1 - 1.8 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
      for (var r = rings.length - 1; r >= 0; r--) { rings[r].t += dt; if (rings[r].t > 0.6) rings.splice(r, 1); }
      if (hint && nowT > hint.until) hint = null;
      render();
    });

    function render() {
      var g = c2;
      g.save();
      if (shake > 0) g.translate((Math.random() - 0.5) * shake * 14, (Math.random() - 0.5) * shake * 14);
      g.drawImage(bgCanvas, 0, 0, W, H);
      if (AURA) drawAltar(g);
      // empty-state guidance
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (started && !ws.length) {
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.font = '700 ' + Math.round(clamp(WS.w * 0.03, 13, 18)) + 'px ' + 'system-ui, sans-serif';
        g.fillText(portrait ? 'Tap or drag ' + NOUNS + ' up from the library' : 'Drag ' + NOUNS + ' here from the library →', WS.x + WS.w / 2, WS.y + WS.h * 0.45);
      }
      // drop-target highlight
      if (drag && drag.moved && drag.over) {
        var o = drag.over;
        var rc = S.recipes[pairKey(drag.id, o.id)];
        g.globalAlpha = 0.85;
        g.drawImage(glowFor(rc ? (rc.altar && !onAltar(o) ? '#a78bfa' : '#34d399') : '#ffffff'), o.x - SZ, o.y - SZ, SZ * 2, SZ * 2);
        g.globalAlpha = 1;
      }
      for (var i = 0; i < ws.length; i++) if (!ws[i].fly) drawItem(g, ws[i]);
      for (var j = 0; j < ws.length; j++) if (ws[j].fly) drawItem(g, ws[j]);
      // rings + particles
      for (var r = 0; r < rings.length; r++) {
        var rg = rings[r], k = rg.t / 0.6;
        g.globalAlpha = 1 - k;
        g.strokeStyle = rg.col;
        g.lineWidth = (rg.big ? 6 : 3) * (1 - k) + 1;
        g.beginPath();
        g.arc(rg.x, rg.y, SZ * (0.4 + k * (rg.big ? 1.6 : 0.9)), 0, TAU);
        g.stroke();
      }
      for (var p = 0; p < particles.length; p++) {
        var q = particles[p], a = 1 - q.life / q.max;
        g.globalAlpha = a;
        g.fillStyle = q.c;
        if (q.star) { g.beginPath(); star4(g, q.x, q.y, q.s * 1.6); g.fill(); }
        else g.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
      }
      g.globalAlpha = 1;
      // status line
      if (started) {
        var msg;
        if (selected && ws.indexOf(selected) > -1) msg = S.items[selected.id].name + ' selected — tap another ' + NOUN + ' to combine';
        else if (WS.w < 460) msg = ctx.isTouch ? 'Drag one onto another · double-tap to copy' : 'Drop one on another · double-click to copy';
        else msg = ctx.isTouch ? 'Drag onto another to combine · tap to select · double-tap to copy' : 'Drop one ' + NOUN + ' on another · double-click to copy · drag to library to remove';
        g.font = '600 ' + Math.round(clamp(WS.w * 0.022, 11, 13)) + 'px system-ui, sans-serif';
        g.fillStyle = selected ? 'rgba(253,230,138,0.95)' : 'rgba(255,255,255,0.42)';
        g.textAlign = 'left';
        var maxW = WS.w - 24 - (AURA ? altar.r * 2 + 20 : 0);
        var tx = WS.x + 12;
        if (g.measureText(msg).width > maxW && !selected) msg = ctx.isTouch ? 'Drag one onto another' : 'Drop one on another';
        if (g.measureText(msg).width > maxW) msg = fitText(g, msg, maxW);
        g.fillText(msg, tx, WS.y + WS.h - 14);
      }
      g.restore();
    }
    function fitText(g, s, w) {
      while (s.length > 4 && g.measureText(s + '…').width > w) s = s.slice(0, -1);
      return s + '…';
    }

    function drawItem(g, it) {
      if (it.hidden) return;
      var def = S.items[it.id];
      var sc = 1;
      if (it.born > 0) {
        var t = (nowT - it.born) / 0.38;
        if (t < 1) sc = Math.max(0.05, easeOutBack(t));
      }
      if (it.fly) sc = 1.06;
      var x = it.x, y = it.y;
      if (it.shake > 0) x += Math.sin(nowT * 60) * it.shake * 9;
      var s = SZ * sc;
      // shadow
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.beginPath();
      g.ellipse(x, y + s * 0.44, s * 0.36, s * 0.1, 0, 0, TAU);
      g.fill();
      if (AURA && def.rarity >= 3) {
        g.globalAlpha = 0.35 + 0.25 * Math.sin(nowT * 3 + it.uid);
        var gs = s * (def.rarity === 5 ? 2.1 : 1.7);
        g.drawImage(glowFor(RARITY[def.rarity].col), x - gs / 2, y - gs / 2, gs, gs);
        g.globalAlpha = 1;
      }
      if (hint && (it.id === hint.a || it.id === hint.b)) {
        g.globalAlpha = 0.5 + 0.4 * Math.sin(nowT * 8);
        g.drawImage(glowFor('#fbbf24'), x - s, y - s, s * 2, s * 2);
        g.globalAlpha = 1;
      }
      g.drawImage(icon(it.id), x - s / 2, y - s / 2, s, s);
      if (selected === it) {
        g.strokeStyle = '#fde68a';
        g.lineWidth = 2.5;
        g.setLineDash([6, 5]);
        g.lineDashOffset = -nowT * 30;
        g.beginPath();
        g.arc(x, y, s * 0.58, 0, TAU);
        g.stroke();
        g.setLineDash([]);
      }
      if (sc < 0.6) return;
      // name label
      var key = it.id;
      g.font = '700 ' + FS + 'px system-ui, sans-serif';
      var lw = labelW[key] || (labelW[key] = g.measureText(def.name).width);
      var ly = y + s / 2 + FS * 0.75;
      g.fillStyle = 'rgba(6,8,20,0.72)';
      g.beginPath();
      if (g.roundRect) g.roundRect(x - lw / 2 - 6, ly - FS * 0.72, lw + 12, FS * 1.44, FS * 0.6);
      else g.rect(x - lw / 2 - 6, ly - FS * 0.72, lw + 12, FS * 1.44);
      g.fill();
      g.fillStyle = AURA && def.rarity >= 2 ? mixCache(def.rarity) : '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(def.name, x, ly + 0.5);
    }
    var rarText = {};
    function mixCache(r) {
      return rarText[r] || (rarText[r] = mix(RARITY[r].col, '#ffffff', 0.35));
    }

    function drawAltar(g) {
      var A = altar, now = Date.now();
      var ready = now >= A.cd;
      var pulse = 0.5 + 0.5 * Math.sin(nowT * 2.4);
      g.globalAlpha = ready ? 0.45 + 0.25 * pulse : 0.2;
      g.drawImage(glowFor('#fbbf24'), A.x - A.r * 1.7, A.y - A.r * 1.7, A.r * 3.4, A.r * 3.4);
      g.globalAlpha = 1;
      // platform
      g.fillStyle = 'rgba(30,18,60,0.92)';
      g.beginPath();
      g.arc(A.x, A.y, A.r, 0, TAU);
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = ready ? '#fbbf24' : '#6b7280';
      g.stroke();
      g.lineWidth = 1.5;
      g.strokeStyle = ready ? 'rgba(251,191,36,0.6)' : 'rgba(150,150,170,0.4)';
      g.beginPath();
      g.arc(A.x, A.y, A.r * 0.72, 0, TAU);
      g.stroke();
      // rotating rune ticks
      var rot = nowT * (ready ? 0.6 : 0.15);
      g.strokeStyle = ready ? 'rgba(253,230,138,0.85)' : 'rgba(160,160,180,0.5)';
      g.lineWidth = 2;
      g.beginPath();
      for (var k = 0; k < 12; k++) {
        var an = rot + (k * TAU) / 12;
        g.moveTo(A.x + Math.cos(an) * A.r * 0.78, A.y + Math.sin(an) * A.r * 0.78);
        g.lineTo(A.x + Math.cos(an) * A.r * 0.9, A.y + Math.sin(an) * A.r * 0.9);
      }
      g.stroke();
      // star in the centre
      g.fillStyle = ready ? 'rgba(251,191,36,0.35)' : 'rgba(120,120,140,0.3)';
      g.beginPath();
      star5(g, A.x, A.y, A.r * 0.5, A.r * 0.22);
      g.fill();
      if (!ready) {
        var frac = (A.cd - now) / (A.pity ? ALTAR_FAIL_CD : ALTAR_OK_CD);
        g.strokeStyle = '#a78bfa';
        g.lineWidth = 4;
        g.beginPath();
        g.arc(A.x, A.y, A.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1));
        g.stroke();
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '800 ' + Math.round(clamp(A.r * 0.2, 9, 12)) + 'px system-ui, sans-serif';
      g.fillStyle = ready ? '#fde68a' : '#c4b5fd';
      g.fillText('FUSION ALTAR', A.x, A.y - A.r - 12);
      g.font = '700 ' + Math.round(clamp(A.r * 0.19, 9, 12)) + 'px system-ui, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillText(ready ? Math.round(altarChance() * 100) + '% chance' : 'Recharging ' + Math.ceil((A.cd - now) / 1000) + 's', A.x, A.y + A.r + 12);
    }

    /* ---------- boot ---------- */
    layout(view.width, view.height);
    showStart();
    loop.start();
    if (ctx.debug) window.__ec = { S: S, icon: icon, spawn: spawn, altarObj: altar, found: found, ws: ws, discover: discover, combine: combine, giveHint: giveHint, state: function () { return { found: foundOrder.length, ws: ws.length, started: started, altar: altar }; } };

    return {
      pause: function () {
        loop.stop();
      },
      resume: function () {
        loop.start();
      },
      destroy: function () {
        loop.stop();
        try { if (started) save(); } catch (e) {}
        clearTimeout(saveTimer);
        timers.forEach(clearTimeout);
        timers = [];
        view.canvas.removeEventListener('pointerdown', onCanvasDown);
        grid.removeEventListener('pointerdown', onGridDown);
        grid.removeEventListener('click', onGridClick);
        window.removeEventListener('pointermove', onMove, { passive: false });
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        view.destroy();
        if (ctx.debug) delete window.__ec;
        root.innerHTML = '';
      },
    };
  });
})();
