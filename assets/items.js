/* The deck.
   ---------------------------------------------------------------
   Permitted cards are the real artwork: a photographic cut-out printed on
   clear stock, with the object sitting in a DIFFERENT PLACE on every card.
   That placement is the mechanic. Stack them and you get a collage of
   objects, not a pile of centred pictures — and anything printed on a card
   above will hide part of a card below.

   Restricted cards are placeholders until the real artwork exists. They use
   the same rule: each copy prints its object somewhere different. */

const PERMITTED = [
  { file: 'artwork_1.png',          name: 'Caricature',                 sound: 'book' },
  { file: 'artwork_2.png',          name: 'Rabbit painting',            sound: 'book' },
  { file: 'artwork_3.png',          name: 'Portrait sketch',            sound: 'book' },
  { file: 'beach_towel.png',        name: 'Beach towel',                sound: 'cloth' },
  { file: 'belt_1.png',             name: 'Striped belt',               sound: 'cloth' },
  { file: 'belt_2.png',             name: 'Brown belt',                 sound: 'cloth' },
  { file: 'belt_3.png',             name: 'Tan belt',                   sound: 'cloth' },
  { file: 'belt_4.png',             name: 'Webbing belt',               sound: 'cloth' },
  { file: 'bobblehead_1.png',       name: 'Vault Boy bobblehead',       sound: 'plastic' },
  { file: 'bobblehead_2.png',       name: 'Baseball bobblehead',        sound: 'plastic' },
  { file: 'book_1.png',             name: 'Leather book',               sound: 'book' },
  { file: 'book_2.png',             name: 'Book, flat',                 sound: 'book' },
  { file: 'book_spine.png',         name: 'Book spine',                 sound: 'book' },
  { file: 'bowl.png',               name: 'Wooden bowl',                sound: 'glass' },
  { file: 'bowling_bll.png',        name: 'Bowling ball',               sound: 'hardcase' },
  { file: 'bra.png',                name: 'Bra',                        sound: 'cloth' },
  { file: 'camo_trousers.png',      name: 'Camo trousers',              sound: 'cloth' },
  { file: 'cards.png',              name: 'Playing cards',              sound: 'light' },
  { file: 'cash.png',               name: 'Roll of cash',               sound: 'light' },
  { file: 'charger_1.png',          name: 'Black charger',              sound: 'plastic' },
  { file: 'charger_2.png',          name: 'White charger',              sound: 'plastic' },
  { file: 'flippers.png',           name: 'Flippers',                   sound: 'plastic' },
  { file: 'game_boy.png',           name: 'Game Boy',                   sound: 'hardcase' },
  { file: 'gardening.png',          name: 'Gardening book',             sound: 'book' },
  { file: 'girl_with_dragon_tattoo.png',name: 'Paperback novel',            sound: 'book' },
  { file: 'hairdryer.png',          name: 'Hairdryer',                  sound: 'hardcase' },
  { file: 'hat_1.png',              name: 'Bucket hat',                 sound: 'cloth' },
  { file: 'hat_2.png',              name: 'Felt hat',                   sound: 'cloth' },
  { file: 'hat_3.png',              name: 'Straw hat',                  sound: 'rustle' },
  { file: 'hat_4.png',              name: 'Blue sun hat',               sound: 'cloth' },
  { file: 'hoodie.png',             name: 'Hoodie',                     sound: 'cloth' },
  { file: 'jeans_1.png',            name: 'Folded jeans',               sound: 'cloth' },
  { file: 'jeans_2.png',            name: 'Jeans, corner',              sound: 'cloth' },
  { file: 'jeans_3.png',            name: 'Stack of jeans',             sound: 'cloth' },
  { file: 'jeans_4.png',            name: 'Row of jeans',               sound: 'cloth' },
  { file: 'keyboard.png',           name: 'Keyboard',                   sound: 'hardcase' },
  { file: 'laptop.png',             name: 'Laptop, high',               sound: 'hardcase' },
  { file: 'laptop_2.png',           name: 'Laptop, low',                sound: 'hardcase' },
  { file: 'laptop_3.png',           name: 'Laptop, right',              sound: 'hardcase' },
  { file: 'leather_bag_1.png',      name: 'Leather satchel',            sound: 'cloth' },
  { file: 'ms_wiz_1.png',           name: 'The Secret Life of Ms Wiz',  sound: 'book' },
  { file: 'ms_wiz_2.png',           name: 'Ms Wiz paperback',           sound: 'book' },
  { file: 'ms_wiz_3.png',           name: 'Ms Wiz Spells Trouble',      sound: 'book' },
  { file: 'ms_wiz_4.png',           name: 'Ms Wiz Rules OK',            sound: 'book' },
  { file: 'ms_wiz_5.png',           name: 'Fangtastic, Ms Wiz',         sound: 'book' },
  { file: 'mug_1.png',              name: 'Unicorn mug',                sound: 'glass' },
  { file: 'mug_2.png',              name: 'Speckled mug',               sound: 'glass' },
  { file: 'newspapers.png',         name: 'Newspapers',                 sound: 'book' },
  { file: 'paddle.png',             name: 'Table tennis bat',           sound: 'hardcase' },
  { file: 'pencil_case.png',        name: 'Pencil case',                sound: 'rustle' },
  { file: 'perfume_1.png',          name: 'Perfume, square',            sound: 'glass' },
  { file: 'perfume_2.png',          name: 'Perfume, amber',             sound: 'glass' },
  { file: 'perfume_4.png',          name: 'Perfume, navy',              sound: 'glass' },
  { file: 'phone_1.png',            name: 'Cracked phone',              sound: 'hardcase' },
  { file: 'plate.png',              name: 'Willow plate',               sound: 'glass' },
  { file: 'recorder.png',           name: 'Recorder',                   sound: 'plastic' },
  { file: 'ripped_jeans.png',       name: 'Ripped jeans',               sound: 'cloth' },
  { file: 'scarf_1.png',            name: 'Green scarf',                sound: 'cloth' },
  { file: 'scarf_2.png',            name: 'Yellow scarf',               sound: 'cloth' },
  { file: 'scarf_4.png',            name: 'Red scarf',                  sound: 'cloth' },
  { file: 'shirt_folded.png',       name: 'Folded shirt, blue',         sound: 'cloth' },
  { file: 'shirt_folded_2.png',     name: 'Folded shirt, grey',         sound: 'cloth' },
  { file: 'shirt_folded_34.png',    name: 'Folded shirt, pale',         sound: 'cloth' },
  { file: 'shirting.png',           name: 'Striped shirt',              sound: 'cloth' },
  { file: 'shoes_1.png',            name: 'Battered plimsolls',         sound: 'cloth' },
  { file: 'shoes_2.png',            name: 'White trainer',              sound: 'cloth' },
  { file: 'shoes_3.png',            name: 'Oxblood brogue',             sound: 'light' },
  { file: 'skirt_1.png',            name: 'Houndstooth skirt',          sound: 'cloth' },
  { file: 'skirt_2.png',            name: 'Grey skirt',                 sound: 'cloth' },
  { file: 'stripy_trousers.png',    name: 'Striped trousers',           sound: 'cloth' },
  { file: 't_shirt_1.png',          name: 'Blue t-shirt',               sound: 'cloth' },
  { file: 't_shirt_2.png',          name: 'Pink t-shirt',               sound: 'cloth' },
  { file: 'toothbrush_1.png',       name: 'Electric toothbrush',        sound: 'light' },
  { file: 'toothbrush_2.png',       name: 'Blue toothbrush',            sound: 'light' },
  { file: 'toothbrush_3.png',       name: 'Black toothbrush',           sound: 'light' },
  { file: 'toothpaste.png',         name: 'Toothpaste',                 sound: 'plastic' },
  { file: 'toothpaste_2.png',       name: 'Toothpaste, small',          sound: 'plastic' },
  { file: 'tote_1.png',             name: 'Tote bag',                   sound: 'rustle' },
  { file: 'tote_2.png',             name: 'Dream Big tote',             sound: 'rustle' },
  { file: 'tote_3.png',             name: 'Sunflower tote',             sound: 'rustle' },
  { file: 'umbrella_1.png',         name: 'Teal umbrella',              sound: 'plastic' },
  { file: 'umbrella_2.png',         name: 'Red umbrella',               sound: 'plastic' },
  { file: 'umbrella_3.png',         name: 'Blue umbrella',              sound: 'plastic' },
  { file: 'underwear_1.png',        name: 'Navy briefs',                sound: 'cloth' },
  { file: 'underwear_2.png',        name: 'Superhero trunks',           sound: 'cloth' },
  { file: 'underwear_3.png',        name: 'Lace knickers',              sound: 'cloth' },
  { file: 'vase.png',               name: 'Carved vase',                sound: 'glass' },
  { file: 'washbag_1.png',          name: 'Striped wash bag',           sound: 'rustle' },
  { file: 'washbag_2.png',          name: 'Blue wash bag',              sound: 'hardcase' },
  { file: 'washbag_3.png',          name: 'Bronze wash bag',            sound: 'rustle' },
  { file: 'yellow_bag.png',         name: 'Yellow tote',                sound: 'rustle' },
  { file: 'yellow_t_shirt.png',     name: 'Mustard t-shirt',            sound: 'cloth' }
];

/* 92 permitted designs, one card each, plus 20 restricted = a 112-card item
   deck. Each card is dealt either way up, at random. */

/* --- restricted --------------------------------------------------------
   Fourteen designs: four knives, three bombs, three poisons, four liquids.
   Six are doubled to bring the restricted count to 20, five of each kind.

   These objects are small — 2.6% to 10.4% of the card, against 19% for the
   average permitted item — so almost anything printed above will cover one.
   That size gap is where the difficulty lives. */

const RESTRICTED = [
  { file: 'knife.png',              name: 'Knife',                      sound: 'light' },
  { file: 'knife_2.png',            name: 'Knife, upright',             sound: 'light' },
  { file: 'knife_3.png',            name: 'Sheathed knife',             sound: 'plastic', copies: 2 },
  { file: 'knife_5.png',            name: 'Sheathed knife, low',        sound: 'plastic' },

  { file: 'bomb_1.png',             name: 'Bomb',                       sound: 'hardcase', copies: 2 },
  { file: 'bomb_2.png',             name: 'Bomb, corner',               sound: 'hardcase', copies: 2 },
  { file: 'pipe_bomb.png',          name: 'Pipe bomb',                  sound: 'hardcase' },

  { file: 'poison.png',             name: 'Poison, green flask',        sound: 'glass' },
  { file: 'poison_2.png',           name: 'Poison bottle',              sound: 'glass', copies: 2 },
  { file: 'poison_34.png',          name: 'Poison, top edge',           sound: 'glass', copies: 2 },

  { file: 'flammable_bottle.png',   name: 'Flammable solvent',          sound: 'plastic' },
  { file: 'gasoline.png',           name: 'Propane cylinder',           sound: 'hardcase', copies: 2 },
  { file: 'hydrochloric_acid.png',  name: 'Hydrochloric acid',          sound: 'glass' },
  { file: 'lighter_fluid.png',      name: 'Lighter fluid',              sound: 'plastic' }
];

/* --- suitcase fronts ---------------------------------------------------
   Thirty-two designs, twenty-four of which go on the belt in any one shift.
   Every tray therefore gets a front nobody else has, which matters because
   the front is the only part of a bag you can see before the scan — and the
   only way to recognise a tray that has already been round the belt once.
   The eight that sit out are a different eight every game. */
const TRAYS = 24;
function trayCount() { return TRAYS; }

const SUITCASES = ['case_black.jpg', 'case_burgundy.jpg', 'case_beige.jpg',
                   'case_navy.jpg', 'case_labels.jpg', 'case_orange.jpg',
                   'case_mustard.jpg', 'case_silver.jpg', 'case_white.jpg',
                   'case_stripes.jpg', 'case_floral.jpg', 'case_red.jpg',
                   'case_purple.jpg', 'case_leather.jpg', 'case_stickers.jpg',
                   'case_olive.jpg', 'case_slate.jpg', 'case_pocket.jpg',
                   'case_denim.jpg', 'case_cowprint.jpg', 'case_candy.jpg',
                   'case_bronze.jpg', 'case_shard.jpg', 'case_amber.jpg',
                   'case_onyx.jpg', 'case_ivory.jpg', 'case_nylon.jpg',
                   'case_duffel.jpg', 'case_quilt.jpg', 'case_charcoal.jpg',
                   'case_croc.jpg', 'case_scarlet.jpg'];

/* The dealer takes TRAYS of them. With fewer designs than that in the list it
   pads with repeats rather than leaving a tray without a front, so the array
   above can be trimmed freely. */
function buildSuitcaseDeck() {
  const d = SUITCASES.slice();
  for (let i = 0; d.length < TRAYS; i++) d.push(SUITCASES[i % SUITCASES.length]);
  return d;
}

function suitcaseFace(file) {
  return '<img class="face" src="assets/suitcases/' + file + '" alt="" draggable="false">';
}

/* --- sound ------------------------------------------------------------
   Every design names the noise it makes when it lands: book, cloth, glass,
   light, hardcase, plastic or rustle. The files for each live in assets/sfx,
   some with more than one take, and one take is chosen at random each time.

   The one rule that matters here: no sound group is contraband-only. Glass is
   the perfumes, the mugs and the plate as well as the poisons; hardcase is the
   laptops and the Game Boy as well as the bombs; light is the toothbrushes and
   the cash as well as the knives. If a group ever ended up used by restricted
   items alone, the audio would be telling you the answer. */
const SOUND_OF = {};
PERMITTED.concat(RESTRICTED).forEach(c => { SOUND_OF[c.file] = c.sound || 'light'; });
function soundFor(design) { return SOUND_OF[design] || 'light'; }

/* --- stolen goods ------------------------------------------------------
   Three permitted designs a shift, drawn at random, that border control has
   already been told about. They are ordinary objects — a hat, a book, a mug —
   so nothing about the bag or the detector gives them away. The only way to
   find one is to be looking properly at a bag you have opened for some other
   reason, which is the point: it gives searching a red tray a second payoff
   and gives a permitted seizure a reason to exist.

   Restricted designs are never eligible. A wanted knife would just be a knife. */
function pickWanted(n) {
  const pool = PERMITTED.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return pool.slice(0, n);
}

function buildItemDeck() {
  const deck = [];
  let n = 0;
  const add = (c, restricted) => {
    for (let i = 0; i < (c.copies || 1); i++) {
      deck.push({
        uid: 'i' + (n++), design: c.file, name: c.name, restricted: restricted,
        /* every card goes into the bag whichever way up it came out of the
           shuffle, which doubles how many places an object can turn up */
        flipped: Math.random() < 0.5
      });
    }
  };
  PERMITTED.forEach(c => add(c, false));
  RESTRICTED.forEach(c => add(c, true));
  return deck;
}

/* the printed face of a card — transparent everywhere the object isn't */
function itemFace(item) {
  return '<img class="face' + (item.flipped ? ' flip' : '') +
    '" src="assets/cards/' + item.design + '" alt="" draggable="false">';
}

/* small icon for the evidence list */
/* small icon for the evidence list, always the right way up */
function itemChip(item) {
  return '<img class="chipimg" src="assets/cards/' + item.design + '" alt="">';
}
