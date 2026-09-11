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
  { file: 'artwork_1.png',     name: 'Caricature' },
  { file: 'artwork_2.png',     name: 'Rabbit painting' },
  { file: 'artwork_3.png',     name: 'Portrait sketch' },
  { file: 'beach_towel.png',   name: 'Beach towel' },
  { file: 'belt_1.png',        name: 'Striped belt' },
  { file: 'belt_2.png',        name: 'Brown belt' },
  { file: 'belt_3.png',        name: 'Tan belt' },
  { file: 'belt_4.png',        name: 'Webbing belt' },
  { file: 'bobblehead_1.png',  name: 'Vault Boy bobblehead' },
  { file: 'bobblehead_2.png',  name: 'Baseball bobblehead' },
  { file: 'book_1.png',        name: 'Leather book' },
  { file: 'book_2.png',        name: 'Book, flat' },
  { file: 'book_spine.png',    name: 'Book spine' },
  { file: 'bowl.png',          name: 'Wooden bowl' },
  { file: 'bowling_bll.png',   name: 'Bowling ball' },
  { file: 'bra.png',           name: 'Bra' },
  { file: 'camo_trousers.png', name: 'Camo trousers' },
  { file: 'cards.png',         name: 'Playing cards' },
  { file: 'cash.png',          name: 'Roll of cash' },
  { file: 'charger_1.png',     name: 'Black charger' },
  { file: 'charger_2.png',     name: 'White charger' },
  { file: 'flippers.png',      name: 'Flippers' },
  { file: 'game_boy.png',      name: 'Game Boy' },
  { file: 'gardening.png',     name: 'Gardening book' },
  { file: 'girl_with_dragon_tattoo.png', name: 'Paperback novel' },
  { file: 'hairdryer.png',     name: 'Hairdryer' },
  { file: 'hat_1.png',         name: 'Bucket hat' },
  { file: 'hat_2.png',         name: 'Felt hat' },
  { file: 'hat_3.png',         name: 'Straw hat' },
  { file: 'hat_4.png',         name: 'Blue sun hat' },
  { file: 'hoodie.png',        name: 'Hoodie' },
  { file: 'jeans_1.png',       name: 'Folded jeans' },
  { file: 'jeans_2.png',       name: 'Jeans, corner' },
  { file: 'jeans_3.png',       name: 'Stack of jeans' },
  { file: 'jeans_4.png',       name: 'Row of jeans' },
  { file: 'keyboard.png',      name: 'Keyboard' },
  { file: 'laptop.png',        name: 'Laptop, high' },
  { file: 'laptop_2.png',      name: 'Laptop, low' },
  { file: 'laptop_3.png',      name: 'Laptop, right' },
  { file: 'leather_bag_1.png', name: 'Leather satchel' },
  { file: 'ms_wiz_1.png',      name: 'The Secret Life of Ms Wiz' },
  { file: 'ms_wiz_2.png',      name: 'Ms Wiz paperback' },
  { file: 'ms_wiz_3.png',      name: 'Ms Wiz Spells Trouble' },
  { file: 'ms_wiz_4.png',      name: 'Ms Wiz Rules OK' },
  { file: 'ms_wiz_5.png',      name: 'Fangtastic, Ms Wiz' },
  { file: 'mug_1.png',         name: 'Unicorn mug' },
  { file: 'mug_2.png',         name: 'Speckled mug' },
  { file: 'newspapers.png',    name: 'Newspapers' },
  { file: 'paddle.png',        name: 'Table tennis bat' },
  { file: 'pencil_case.png',   name: 'Pencil case' },
  { file: 'perfume_1.png',     name: 'Perfume, square' },
  { file: 'perfume_2.png',     name: 'Perfume, amber' },
  { file: 'perfume_4.png',     name: 'Perfume, navy' },
  { file: 'phone_1.png',       name: 'Cracked phone' },
  { file: 'plate.png',         name: 'Willow plate' },
  { file: 'recorder.png',      name: 'Recorder' },
  { file: 'ripped_jeans.png',  name: 'Ripped jeans' },
  { file: 'scarf_1.png',       name: 'Green scarf' },
  { file: 'scarf_2.png',       name: 'Yellow scarf' },
  { file: 'scarf_4.png',       name: 'Red scarf' },
  { file: 'shirt_folded.png',  name: 'Folded shirt, blue' },
  { file: 'shirt_folded_2.png',name: 'Folded shirt, grey' },
  { file: 'shirt_folded_34.png', name: 'Folded shirt, pale' },
  { file: 'shirting.png',      name: 'Striped shirt' },
  { file: 'shoes_1.png',       name: 'Battered plimsolls' },
  { file: 'shoes_2.png',       name: 'White trainer' },
  { file: 'shoes_3.png',       name: 'Oxblood brogue' },
  { file: 'skirt_1.png',       name: 'Houndstooth skirt' },
  { file: 'skirt_2.png',       name: 'Grey skirt' },
  { file: 'stripy_trousers.png', name: 'Striped trousers' },
  { file: 't_shirt_1.png',     name: 'Blue t-shirt' },
  { file: 't_shirt_2.png',     name: 'Pink t-shirt' },
  { file: 'toothbrush_1.png',  name: 'Electric toothbrush' },
  { file: 'toothbrush_2.png',  name: 'Blue toothbrush' },
  { file: 'toothbrush_3.png',  name: 'Black toothbrush' },
  { file: 'toothpaste.png',    name: 'Toothpaste' },
  { file: 'toothpaste_2.png',  name: 'Toothpaste, small' },
  { file: 'tote_1.png',        name: 'Tote bag' },
  { file: 'tote_2.png',        name: 'Dream Big tote' },
  { file: 'tote_3.png',        name: 'Sunflower tote' },
  { file: 'umbrella_1.png',    name: 'Teal umbrella' },
  { file: 'umbrella_2.png',    name: 'Red umbrella' },
  { file: 'umbrella_3.png',    name: 'Blue umbrella' },
  { file: 'underwear_1.png',   name: 'Navy briefs' },
  { file: 'underwear_2.png',   name: 'Superhero trunks' },
  { file: 'underwear_3.png',   name: 'Lace knickers' },
  { file: 'vase.png',          name: 'Carved vase' },
  { file: 'washbag_1.png',     name: 'Striped wash bag' },
  { file: 'washbag_2.png',     name: 'Blue wash bag' },
  { file: 'washbag_3.png',     name: 'Bronze wash bag' },
  { file: 'yellow_bag.png',    name: 'Yellow tote' },
  { file: 'yellow_t_shirt.png',name: 'Mustard t-shirt' }
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
  { file: 'knife.png',             name: 'Knife' },
  { file: 'knife_2.png',           name: 'Knife, upright' },
  { file: 'knife_3.png',           name: 'Sheathed knife',      copies: 2 },
  { file: 'knife_5.png',           name: 'Sheathed knife, low' },

  { file: 'bomb_1.png',            name: 'Bomb',                copies: 2 },
  { file: 'bomb_2.png',            name: 'Bomb, corner',        copies: 2 },
  { file: 'pipe_bomb.png',         name: 'Pipe bomb' },

  { file: 'poison.png',            name: 'Poison, green flask' },
  { file: 'poison_2.png',          name: 'Poison bottle',       copies: 2 },
  { file: 'poison_34.png',         name: 'Poison, top edge',    copies: 2 },

  { file: 'flammable_bottle.png',  name: 'Flammable solvent' },
  { file: 'gasoline.png',          name: 'Propane cylinder',    copies: 2 },
  { file: 'hydrochloric_acid.png', name: 'Hydrochloric acid' },
  { file: 'lighter_fluid.png',     name: 'Lighter fluid' }
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
