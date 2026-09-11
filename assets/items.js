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
  { file: 'artwork_1.png',             name: 'Caricature',                  sound: 'book'       },
  { file: 'artwork_2.png',             name: 'Rabbit painting',             sound: 'book'       },
  { file: 'balaclava.png',             name: 'Balaclava',                   sound: 'balaclava'  },
  { file: 'bath_salt.png',             name: 'Jar of bath salts',           sound: 'bathsalt'   },
  { file: 'beach_towel.png',           name: 'Beach towel',                 sound: 'cloth'      },
  { file: 'belt_1.png',                name: 'Striped belt',                sound: 'cloth'      },
  { file: 'belt_2.png',                name: 'Brown belt',                  sound: 'cloth'      },
  { file: 'bird_ornament.png',         name: 'Ceramic bird ornament',       sound: 'glass'      },
  { file: 'bobblehead_1.png',          name: 'Vault Boy bobblehead',        sound: 'plastic'    },
  { file: 'bobblehead_2.png',          name: 'Baseball bobblehead',         sound: 'plastic'    },
  { file: 'book_1.png',                name: 'Leather book',                sound: 'book'       },
  { file: 'bowl.png',                  name: 'Wooden bowl',                 sound: 'glass'      },
  { file: 'bowling_bll.png',           name: 'Bowling ball',                sound: 'hardcase'   },
  { file: 'bra.png',                   name: 'Bra',                         sound: 'cloth'      },
  { file: 'camera_digital.png',        name: 'Compact camera',              sound: 'camera'     },
  { file: 'camo_trousers.png',         name: 'Camo trousers',               sound: 'cloth'      },
  { file: 'card.png',                  name: 'Brown envelope',              sound: 'card'       },
  { file: 'cards.png',                 name: 'Playing cards',               sound: 'light'      },
  { file: 'cash.png',                  name: 'Roll of cash',                sound: 'light'      },
  { file: 'charger_2.png',             name: 'White charger',               sound: 'plastic'    },
  { file: 'clock.png',                 name: 'Wall clock',                  sound: 'clock'      },
  { file: 'croissants.png',            name: 'Pack of croissants',          sound: 'croissants' },
  { file: 'denim_jacket.png',          name: 'Denim jacket',                sound: 'cloth'      },
  { file: 'diamond_ring.png',          name: 'Diamond ring',                sound: 'light'      },
  { file: 'disposable_camera.png',     name: 'Disposable camera',           sound: 'dispcam'    },
  { file: 'fidget_spinner.png',        name: 'Fidget spinner',              sound: 'spinner'    },
  { file: 'flippers.png',              name: 'Flippers',                    sound: 'plastic'    },
  { file: 'foot_cream.png',            name: 'Tube of foot cream',          sound: 'plastic'    },
  { file: 'fountain_pen.png',          name: 'Fountain pen',                sound: 'light'      },
  { file: 'fridge_magnet.png',         name: 'South Korea fridge magnet',   sound: 'light'      },
  { file: 'frying_pan.png',            name: 'Frying pan',                  sound: 'hardcase'   },
  { file: 'game_boy.png',              name: 'Game Boy',                    sound: 'hardcase'   },
  { file: 'gardening.png',             name: 'Gardening book',              sound: 'book'       },
  { file: 'girl_with_dragon_tattoo.png', name: 'Paperback novel',             sound: 'book'       },
  { file: 'hairdryer.png',             name: 'Hairdryer',                   sound: 'hardcase'   },
  { file: 'hat_1.png',                 name: 'Bucket hat',                  sound: 'cloth'      },
  { file: 'hat_2.png',                 name: 'Felt hat',                    sound: 'cloth'      },
  { file: 'hat_3.png',                 name: 'Straw hat',                   sound: 'rustle'     },
  { file: 'hat_4.png',                 name: 'Blue sun hat',                sound: 'cloth'      },
  { file: 'high_heels.png',            name: 'Black high heels',            sound: 'hardcase'   },
  { file: 'hoodie.png',                name: 'Hoodie',                      sound: 'cloth'      },
  { file: 'iceland_fridge_magnet.png', name: 'Reykjavik fridge magnet',     sound: 'light'      },
  { file: 'inflatable_knife.png',      name: 'Inflatable knife',            sound: 'plastic'    },
  { file: 'interstellar.png',          name: 'Interstellar Blu-ray',        sound: 'plastic'    },
  { file: 'jeans_1.png',               name: 'Folded jeans',                sound: 'cloth'      },
  { file: 'keyboard.png',              name: 'Keyboard',                    sound: 'hardcase'   },
  { file: 'laptop_3.png',              name: 'Laptop',                      sound: 'hardcase'   },
  { file: 'leather_bag_1.png',         name: 'Leather satchel',             sound: 'cloth'      },
  { file: 'magazine.png',              name: 'Fashion magazine',            sound: 'book'       },
  { file: 'mask.png',                  name: 'Carved wooden mask',          sound: 'hardcase'   },
  { file: 'ms_wiz_1.png',              name: 'The Secret Life of Ms Wiz',   sound: 'book'       },
  { file: 'ms_wiz_3.png',              name: 'Ms Wiz Spells Trouble',       sound: 'book'       },
  { file: 'ms_wiz_4.png',              name: 'Ms Wiz Rules OK',             sound: 'book'       },
  { file: 'ms_wiz_5.png',              name: 'Fangtastic, Ms Wiz',          sound: 'book'       },
  { file: 'mug_1.png',                 name: 'Unicorn mug',                 sound: 'glass'      },
  { file: 'mug_2.png',                 name: 'Speckled mug',                sound: 'glass'      },
  { file: 'newspapers.png',            name: 'Newspapers',                  sound: 'book'       },
  { file: 'paddle.png',                name: 'Table tennis bat',            sound: 'hardcase'   },
  { file: 'paintbrush.png',            name: 'Paintbrush',                  sound: 'light'      },
  { file: 'peanuts.png',               name: 'Bag of chocolate peanuts',    sound: 'plastic'    },
  { file: 'pearl_ring.png',            name: 'Pearl ring',                  sound: 'light'      },
  { file: 'pencil_case.png',           name: 'Pencil case',                 sound: 'plastic'    },
  { file: 'perfume_2.png',             name: 'Perfume, amber',              sound: 'glass'      },
  { file: 'perfume_4.png',             name: 'Perfume, navy',               sound: 'glass'      },
  { file: 'phone_1.png',               name: 'Cracked phone',               sound: 'hardcase'   },
  { file: 'plate.png',                 name: 'Willow plate',                sound: 'glass'      },
  { file: 'recorder.png',              name: 'Recorder',                    sound: 'plastic'    },
  { file: 'red_crisps.png',            name: 'Bag of crisps',               sound: 'plastic'    },
  { file: 'red_sunglasses.png',        name: 'Red sunglasses',              sound: 'plastic'    },
  { file: 'ripped_jeans.png',          name: 'Ripped jeans',                sound: 'cloth'      },
  { file: 'saffron.png',               name: 'Jar of saffron',              sound: 'saffron'    },
  { file: 'scarf_1.png',               name: 'Green scarf',                 sound: 'cloth'      },
  { file: 'scarf_2.png',               name: 'Yellow scarf',                sound: 'cloth'      },
  { file: 'scarf_4.png',               name: 'Red scarf',                   sound: 'cloth'      },
  { file: 'seashell.png',              name: 'Seashell',                    sound: 'glass'      },
  { file: 'shirt_folded.png',          name: 'Folded shirt, blue',          sound: 'cloth'      },
  { file: 'shirt_folded_2.png',        name: 'Folded shirt, grey',          sound: 'cloth'      },
  { file: 'shirt_folded_34.png',       name: 'Folded shirt, pale',          sound: 'cloth'      },
  { file: 'shoes_1.png',               name: 'Battered plimsolls',          sound: 'cloth'      },
  { file: 'shoes_2.png',               name: 'White trainer',               sound: 'hardcase'   },
  { file: 'shoes_3.png',               name: 'Oxblood brogue',              sound: 'hardcase'   },
  { file: 'ski_goggles.png',           name: 'Ski goggles',                 sound: 'plastic'    },
  { file: 'skirt_2.png',               name: 'Grey skirt',                  sound: 'cloth'      },
  { file: 'stripy_trousers.png',       name: 'Striped trousers',            sound: 'cloth'      },
  { file: 'sweets.png',                name: 'Bag of gummy worms',          sound: 'sweets'     },
  { file: 't_shirt_1.png',             name: 'Blue t-shirt',                sound: 'cloth'      },
  { file: 't_shirt_2.png',             name: 'Pink t-shirt',                sound: 'cloth'      },
  { file: 'teddy_bear.png',            name: 'Purple teddy bear',           sound: 'cloth'      },
  { file: 'toothbrush_1.png',          name: 'Electric toothbrush',         sound: 'light'      },
  { file: 'toothbrush_2.png',          name: 'Blue toothbrush',             sound: 'light'      },
  { file: 'toothbrush_3.png',          name: 'Black toothbrush',            sound: 'light'      },
  { file: 'toothpaste.png',            name: 'Toothpaste',                  sound: 'plastic'    },
  { file: 'tote_1.png',                name: 'Tote bag',                    sound: 'rustle'     },
  { file: 'tote_3.png',                name: 'Sunflower tote',              sound: 'rustle'     },
  { file: 'tote_bag_2.png',            name: 'Dream Big tote',              sound: 'rustle'     },
  { file: 'trophy.png',                name: 'Gold trophy',                 sound: 'hardcase'   },
  { file: 'umbrella_2.png',            name: 'Red umbrella',                sound: 'plastic'    },
  { file: 'umbrella_3.png',            name: 'Blue umbrella',               sound: 'plastic'    },
  { file: 'underwear.png',             name: 'Navy briefs',                 sound: 'cloth'      },
  { file: 'underwear_2.png',           name: 'Superhero trunks',            sound: 'cloth'      },
  { file: 'underwear_3.png',           name: 'Lace knickers',               sound: 'cloth'      },
  { file: 'vase.png',                  name: 'Carved vase',                 sound: 'glass'      },
  { file: 'vinyl.png',                 name: 'Vinyl record',                sound: 'book'       },
  { file: 'washbag_1.png',             name: 'Striped wash bag',            sound: 'plastic'    },
  { file: 'washbag_2.png',             name: 'Blue wash bag',               sound: 'hardcase'   },
  { file: 'yellow_bag.png',            name: 'Yellow tote',                 sound: 'rustle'     },
  { file: 'yellow_t_shirt.png',        name: 'Mustard t-shirt',             sound: 'cloth'      }
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
  { file: 'bomb_1.png',                name: 'Bomb',                        sound: 'hardcase'   },
  { file: 'bomb_2.png',                name: 'Bomb, corner',                sound: 'hardcase'   },
  { file: 'flammable_bottle.png',      name: 'Flammable solvent',           sound: 'plastic'    },
  { file: 'flammable_liquid.png',      name: 'Flammable liquid',            sound: 'plastic'    },
  { file: 'gasoline.png',              name: 'Propane cylinder',            sound: 'hardcase'   },
  { file: 'hammer.png',                name: 'Claw hammer',                 sound: 'hardcase'   },
  { file: 'handgun.png',               name: 'Handgun',                     sound: 'hardcase'   },
  { file: 'hydrochloric_acid.png',     name: 'Hydrochloric acid',           sound: 'glass'      },
  { file: 'knife.png',                 name: 'Knife',                       sound: 'light'      },
  { file: 'knife_2.png',               name: 'Knife, upright',              sound: 'light'      },
  { file: 'knife_3.png',               name: 'Sheathed knife',              sound: 'plastic'    },
  { file: 'knife_5.png',               name: 'Sheathed knife, low',         sound: 'plastic'    },
  { file: 'lighter.png',               name: 'Lighter, red',                sound: 'plastic'    },
  { file: 'lighter_2.png',             name: 'Lighter, blue',               sound: 'plastic'    },
  { file: 'lighter_fluid.png',         name: 'Lighter fluid',               sound: 'plastic'    },
  { file: 'pipe_bomb.png',             name: 'Pipe bomb',                   sound: 'hardcase'   },
  { file: 'pliers.png',                name: 'Side cutters',                sound: 'hardcase'   },
  { file: 'pliers_2.png',              name: 'Pliers',                      sound: 'hardcase'   },
  { file: 'poison.png',                name: 'Poison, green flask',         sound: 'glass'      },
  { file: 'poison_2.png',              name: 'Poison bottle',               sound: 'glass'      },
  { file: 'poison_34.png',             name: 'Poison, top edge',            sound: 'glass'      },
  { file: 'scissors_1.png',            name: 'Shears',                      sound: 'light'      },
  { file: 'scissors_2.png',            name: 'Kitchen scissors',            sound: 'light'      },
  { file: 'screwdriver_1.png',         name: 'Screwdriver, yellow',         sound: 'plastic'    },
  { file: 'screwdriver_2.png',         name: 'Screwdriver, blue',           sound: 'plastic'    },
  { file: 'zombie_knife.png',          name: 'Zombie knife',                sound: 'hardcase'   }
];

/* Twenty-six forbidden designs exist; sixteen of them are on the belt in any
   one shift, drawn at random and one card each. Ten sit out, so what counts as
   contraband this round is never quite what it was last round — and nobody can
   learn the deck by heart. */
const RESTRICTED_N = 15;

/* --- how much of it is dealt ------------------------------------------
   Not the whole box. 75 of the 93 permitted designs and 15 of the 26
   forbidden ones go into a shift: 90 cards under 24 suitcases, so a bag holds
   three or four on average and never more than five. Everything sitting out is
   what stops a deck you have played twenty times from being a memory test. */
const PERMITTED_N = 75;
const BAG_CAP = 5;

function restrictedCount() { return RESTRICTED_N; }
function permittedCount() { return PERMITTED_N; }
function bagCap() { return BAG_CAP; }

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

/* --- where the object sits ---------------------------------------------
   The bounding box of the opaque pixels on each card, as fractions of the
   card. The notice board uses it to crop a poster down to the object instead
   of showing a mostly-empty card at thumbnail size. */
const CROP = {
  'artwork_1.png': [0.139, 0.086, 0.786, 0.728],
  'artwork_2.png': [0.032, 0.193, 0.857, 0.797],
  'balaclava.png': [0.045, 0.665, 0.666, 0.280],
  'bath_salt.png': [0.445, 0.807, 0.227, 0.183],
  'beach_towel.png': [0.068, 0.015, 0.843, 0.459],
  'belt_1.png': [0.184, 0.298, 0.509, 0.687],
  'belt_2.png': [0.491, 0.113, 0.327, 0.156],
  'bird_ornament.png': [0.741, 0.394, 0.245, 0.207],
  'bobblehead_1.png': [0.775, 0.543, 0.168, 0.248],
  'bobblehead_2.png': [0.014, 0.235, 0.461, 0.151],
  'bomb_1.png': [0.216, 0.149, 0.493, 0.232],
  'bomb_2.png': [0.766, 0.724, 0.220, 0.194],
  'book_1.png': [0.211, 0.164, 0.418, 0.441],
  'bowl.png': [0.600, 0.318, 0.382, 0.407],
  'bowling_bll.png': [0.020, 0.382, 0.541, 0.387],
  'bra.png': [0.091, 0.018, 0.825, 0.413],
  'camera_digital.png': [0.032, 0.345, 0.250, 0.311],
  'camo_trousers.png': [0.418, 0.083, 0.568, 0.611],
  'card.png': [0.389, 0.186, 0.500, 0.332],
  'cards.png': [0.327, 0.849, 0.473, 0.141],
  'cash.png': [0.843, 0.305, 0.143, 0.156],
  'charger_2.png': [0.014, 0.746, 0.305, 0.230],
  'clock.png': [0.343, 0.300, 0.555, 0.400],
  'croissants.png': [0.114, 0.535, 0.775, 0.321],
  'denim_jacket.png': [0.175, 0.287, 0.811, 0.553],
  'diamond_ring.png': [0.634, 0.642, 0.102, 0.066],
  'disposable_camera.png': [0.507, 0.742, 0.316, 0.126],
  'fidget_spinner.png': [0.359, 0.120, 0.125, 0.091],
  'flammable_bottle.png': [0.261, 0.298, 0.180, 0.323],
  'flammable_liquid.png': [0.652, 0.587, 0.227, 0.342],
  'flippers.png': [0.064, 0.036, 0.895, 0.916],
  'foot_cream.png': [0.709, 0.436, 0.189, 0.316],
  'fountain_pen.png': [0.136, 0.535, 0.373, 0.047],
  'fridge_magnet.png': [0.616, 0.274, 0.148, 0.151],
  'frying_pan.png': [0.014, 0.010, 0.618, 0.588],
  'game_boy.png': [0.486, 0.301, 0.330, 0.389],
  'gardening.png': [0.368, 0.037, 0.516, 0.460],
  'gasoline.png': [0.243, 0.280, 0.364, 0.413],
  'girl_with_dragon_tattoo.png': [0.536, 0.429, 0.450, 0.488],
  'hairdryer.png': [0.427, 0.021, 0.536, 0.455],
  'hammer.png': [0.448, 0.011, 0.539, 0.169],
  'handgun.png': [0.191, 0.227, 0.514, 0.237],
  'hat_1.png': [0.136, 0.404, 0.668, 0.303],
  'hat_2.png': [0.375, 0.010, 0.611, 0.634],
  'hat_3.png': [0.139, 0.386, 0.827, 0.595],
  'hat_4.png': [0.239, 0.010, 0.748, 0.592],
  'high_heels.png': [0.482, 0.569, 0.505, 0.421],
  'hoodie.png': [0.014, 0.057, 0.916, 0.833],
  'hydrochloric_acid.png': [0.459, 0.485, 0.400, 0.371],
  'iceland_fridge_magnet.png': [0.052, 0.135, 0.355, 0.243],
  'inflatable_knife.png': [0.382, 0.157, 0.341, 0.802],
  'interstellar.png': [0.016, 0.601, 0.375, 0.335],
  'jeans_1.png': [0.227, 0.010, 0.759, 0.413],
  'keyboard.png': [0.014, 0.104, 0.545, 0.836],
  'knife.png': [0.170, 0.493, 0.136, 0.331],
  'knife_2.png': [0.516, 0.188, 0.302, 0.280],
  'knife_3.png': [0.886, 0.373, 0.100, 0.253],
  'knife_5.png': [0.386, 0.575, 0.341, 0.279],
  'laptop_3.png': [0.450, 0.243, 0.536, 0.564],
  'leather_bag_1.png': [0.109, 0.010, 0.780, 0.502],
  'lighter.png': [0.520, 0.277, 0.193, 0.115],
  'lighter_2.png': [0.232, 0.710, 0.082, 0.135],
  'lighter_fluid.png': [0.214, 0.178, 0.591, 0.172],
  'magazine.png': [0.043, 0.039, 0.930, 0.613],
  'mask.png': [0.014, 0.316, 0.627, 0.674],
  'ms_wiz_1.png': [0.014, 0.527, 0.386, 0.350],
  'ms_wiz_3.png': [0.386, 0.292, 0.380, 0.417],
  'ms_wiz_4.png': [0.020, 0.105, 0.548, 0.280],
  'ms_wiz_5.png': [0.405, 0.564, 0.432, 0.387],
  'mug_1.png': [0.484, 0.630, 0.441, 0.287],
  'mug_2.png': [0.130, 0.136, 0.470, 0.348],
  'newspapers.png': [0.039, 0.019, 0.727, 0.963],
  'paddle.png': [0.334, 0.323, 0.441, 0.545],
  'paintbrush.png': [0.759, 0.543, 0.086, 0.287],
  'peanuts.png': [0.014, 0.272, 0.386, 0.214],
  'pearl_ring.png': [0.527, 0.264, 0.080, 0.062],
  'pencil_case.png': [0.350, 0.627, 0.636, 0.337],
  'perfume_2.png': [0.384, 0.010, 0.168, 0.167],
  'perfume_4.png': [0.589, 0.645, 0.398, 0.224],
  'phone_1.png': [0.027, 0.645, 0.275, 0.329],
  'pipe_bomb.png': [0.602, 0.447, 0.195, 0.404],
  'plate.png': [0.195, 0.053, 0.682, 0.493],
  'pliers.png': [0.711, 0.173, 0.157, 0.191],
  'pliers_2.png': [0.248, 0.146, 0.143, 0.220],
  'poison.png': [0.564, 0.540, 0.132, 0.156],
  'poison_2.png': [0.832, 0.042, 0.155, 0.194],
  'poison_34.png': [0.248, 0.010, 0.273, 0.086],
  'recorder.png': [0.695, 0.173, 0.120, 0.653],
  'red_crisps.png': [0.405, 0.076, 0.561, 0.287],
  'red_sunglasses.png': [0.359, 0.784, 0.361, 0.110],
  'ripped_jeans.png': [0.443, 0.254, 0.543, 0.446],
  'saffron.png': [0.614, 0.571, 0.180, 0.143],
  'scarf_1.png': [0.336, 0.241, 0.573, 0.400],
  'scarf_2.png': [0.298, 0.559, 0.652, 0.420],
  'scarf_4.png': [0.050, 0.230, 0.470, 0.428],
  'scissors_1.png': [0.273, 0.347, 0.448, 0.109],
  'scissors_2.png': [0.584, 0.130, 0.402, 0.282],
  'screwdriver_1.png': [0.895, 0.371, 0.091, 0.256],
  'screwdriver_2.png': [0.180, 0.773, 0.243, 0.049],
  'seashell.png': [0.118, 0.423, 0.384, 0.548],
  'shirt_folded.png': [0.098, 0.245, 0.734, 0.637],
  'shirt_folded_2.png': [0.220, 0.015, 0.705, 0.569],
  'shirt_folded_34.png': [0.014, 0.010, 0.732, 0.626],
  'shoes_1.png': [0.014, 0.010, 0.577, 0.595],
  'shoes_2.png': [0.243, 0.791, 0.641, 0.199],
  'shoes_3.png': [0.014, 0.010, 0.327, 0.541],
  'ski_goggles.png': [0.036, 0.207, 0.236, 0.277],
  'skirt_2.png': [0.257, 0.010, 0.730, 0.457],
  'stripy_trousers.png': [0.014, 0.399, 0.591, 0.420],
  'sweets.png': [0.020, 0.543, 0.434, 0.376],
  't_shirt_1.png': [0.014, 0.010, 0.743, 0.485],
  't_shirt_2.png': [0.075, 0.298, 0.911, 0.692],
  'teddy_bear.png': [0.095, 0.130, 0.441, 0.271],
  'toothbrush_1.png': [0.861, 0.324, 0.109, 0.462],
  'toothbrush_2.png': [0.077, 0.627, 0.198, 0.363],
  'toothbrush_3.png': [0.014, 0.042, 0.111, 0.546],
  'toothpaste.png': [0.261, 0.613, 0.130, 0.160],
  'tote_1.png': [0.330, 0.177, 0.657, 0.814],
  'tote_3.png': [0.175, 0.010, 0.811, 0.457],
  'tote_bag_2.png': [0.270, 0.297, 0.511, 0.588],
  'trophy.png': [0.273, 0.196, 0.493, 0.614],
  'umbrella_2.png': [0.218, 0.078, 0.607, 0.345],
  'umbrella_3.png': [0.200, 0.831, 0.530, 0.159],
  'underwear.png': [0.141, 0.151, 0.561, 0.331],
  'underwear_2.png': [0.093, 0.614, 0.770, 0.376],
  'underwear_3.png': [0.500, 0.253, 0.343, 0.404],
  'vase.png': [0.068, 0.083, 0.593, 0.831],
  'vinyl.png': [0.186, 0.263, 0.725, 0.525],
  'washbag_1.png': [0.139, 0.812, 0.473, 0.178],
  'washbag_2.png': [0.589, 0.673, 0.332, 0.318],
  'yellow_bag.png': [0.014, 0.162, 0.866, 0.525],
  'yellow_t_shirt.png': [0.114, 0.298, 0.775, 0.556],
  'zombie_knife.png': [0.127, 0.013, 0.830, 0.932]
};
function cropOf(file) { return CROP[file] || [0, 0, 1, 1]; }

/* --- the day's amendments --------------------------------------------
   Two signs go up on the wall every shift and they override the standing
   list. A ban turns an ordinary category contraband; an OK turns a forbidden
   one legal. Both change what a seizure is worth, so a sign you did not read
   is five points every time you get it wrong.

   Categories are deliberately blunt — all shoes means all shoes, heels
   included; trousers means trousers and not skirts — because a rule you have
   to adjudicate is no use with ten seconds on the clock. */
const SIGNS = [
  { file: 'no_books.png', kind: 'ban', label: 'No books',
    blurb: 'Books, novels and magazines are contraband today.',
    designs: ['book_1.png', 'gardening.png', 'girl_with_dragon_tattoo.png',
              'ms_wiz_1.png', 'ms_wiz_3.png', 'ms_wiz_4.png', 'ms_wiz_5.png',
              'magazine.png'] },

  { file: 'no_shoes.png', kind: 'ban', label: 'No shoes',
    blurb: 'All footwear is contraband today, heels included.',
    designs: ['shoes_1.png', 'shoes_2.png', 'shoes_3.png', 'high_heels.png'] },

  { file: 'no_trousers.png', kind: 'ban', label: 'No trousers',
    blurb: 'Trousers of any kind are contraband today. Skirts are fine.',
    designs: ['camo_trousers.png', 'jeans_1.png', 'ripped_jeans.png',
              'stripy_trousers.png'] },

  { file: 'no_toothbrushes.png', kind: 'ban', label: 'No toothbrushes',
    blurb: 'Toothbrushes are contraband today. Toothpaste is fine.',
    designs: ['toothbrush_1.png', 'toothbrush_2.png', 'toothbrush_3.png'] },

  { file: 'no_bowling_balls.png', kind: 'ban', label: 'No bowling balls',
    blurb: 'Bowling balls are contraband today.',
    designs: ['bowling_bll.png'] },

  { file: 'knife_ok.png', kind: 'ok', label: 'Knives permitted',
    blurb: 'Knives are allowed today. Scissors still are not.',
    designs: ['knife.png', 'knife_2.png', 'knife_3.png', 'knife_5.png',
              'zombie_knife.png'] },

  { file: 'guns_ok.png', kind: 'ok', label: 'Firearms permitted',
    blurb: 'Handguns are allowed today.',
    designs: ['handgun.png'] }
];

function pickSigns(n) { return pick(SIGNS, n); }

function pick(list, n) {
  const pool = list.slice();
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
  pick(PERMITTED, PERMITTED_N).forEach(c => add(c, false));
  pick(RESTRICTED, RESTRICTED_N).forEach(c => add(c, true));
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
