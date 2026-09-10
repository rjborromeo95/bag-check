/* Item cards. In the physical game each of these is printed on a clear
   card, so a suitcase holding five of them is five drawings on top of
   each other. Material decides the X-ray colour: dense metal reads cold,
   organic matter reads warm. Two restricted items sit in each band so
   colour never gives the answer away. */

const ART = {
  knife:      '<path d="M10 46 L62 34 L62 58 L10 54 Z"/><rect x="62" y="38" width="30" height="16" rx="4"/>',
  bomb:       '<circle cx="44" cy="62" r="28"/><rect x="56" y="24" width="16" height="14" rx="3"/><path d="M64 24 C 68 10, 84 14, 80 4"/>',
  liquid:     '<path d="M40 12 h20 v14 l8 10 v54 a4 4 0 0 1 -4 4 h-28 a4 4 0 0 1 -4 -4 v-54 l8 -10 z"/><path d="M36 50 h28"/><path d="M36 62 h28"/>',
  poison:     '<path d="M40 28 h20 v10 l10 12 v34 h-40 v-34 l10 -12 z"/><path d="M34 22 h32"/><circle cx="44" cy="62" r="4"/><circle cx="56" cy="62" r="4"/><path d="M44 74 h12"/>',

  sunglasses: '<path d="M8 42 h84"/><rect x="12" y="42" width="32" height="24" rx="11"/><rect x="56" y="42" width="32" height="24" rx="11"/><path d="M44 50 q6 -6 12 0"/>',
  shoes:      '<path d="M14 40 v28 h64 a10 10 0 0 0 10 -10 c0 -8 -14 -10 -22 -16 l-14 -10 z"/><path d="M14 60 h74"/>',
  laptop:     '<rect x="22" y="22" width="56" height="42" rx="3"/><path d="M10 64 h80 l6 14 h-92 z"/>',
  phone:      '<rect x="32" y="10" width="36" height="80" rx="7"/><path d="M44 18 h12"/><circle cx="50" cy="80" r="3"/>',
  keys:       '<circle cx="28" cy="32" r="14"/><circle cx="28" cy="32" r="5"/><path d="M38 42 L84 88"/><path d="M64 68 l10 -10"/><path d="M74 78 l10 -10"/>',
  book:       '<path d="M16 20 h30 a8 8 0 0 1 8 8 v52 a8 8 0 0 0 -8 -8 h-30 z"/><path d="M84 20 h-30 a8 8 0 0 0 -8 8 v52 a8 8 0 0 1 8 -8 h30 z"/>',
  camera:     '<rect x="10" y="28" width="80" height="54" rx="6"/><circle cx="50" cy="55" r="18"/><circle cx="50" cy="55" r="8"/><path d="M34 28 l6 -10 h20 l6 10"/>',
  headphones: '<path d="M18 62 v-10 a32 32 0 0 1 64 0 v10"/><rect x="8" y="56" width="18" height="30" rx="7"/><rect x="74" y="56" width="18" height="30" rx="7"/>',
  umbrella:   '<path d="M8 50 a42 42 0 0 1 84 0 z"/><path d="M50 50 v32 a10 10 0 0 0 20 0"/>',
  watch:      '<circle cx="50" cy="50" r="20"/><path d="M50 38 v12 h9"/><path d="M38 34 l-4 -24 h32 l-4 24"/><path d="M38 66 l-4 24 h32 l-4 -24"/>',
  charger:    '<rect x="30" y="12" width="40" height="36" rx="6"/><path d="M40 12 v-8"/><path d="M60 12 v-8"/><path d="M50 48 v14 a12 12 0 0 1 -12 12 h-16"/>',
  hairbrush:  '<rect x="30" y="8" width="40" height="48" rx="17"/><path d="M50 56 v36"/><path d="M38 20 v10 M50 18 v12 M62 20 v10 M38 40 v8 M62 40 v8"/>',
  teddy:      '<circle cx="30" cy="26" r="12"/><circle cx="70" cy="26" r="12"/><circle cx="50" cy="40" r="22"/><ellipse cx="50" cy="76" rx="21" ry="16"/>',
  toothbrush: '<rect x="12" y="40" width="28" height="18" rx="7"/><path d="M40 49 h48"/><path d="M18 40 v-9 M26 40 v-9 M34 40 v-9"/>',
  belt:       '<path d="M12 40 h64 a12 12 0 0 1 0 24 h-64 z"/><rect x="58" y="34" width="26" height="36" rx="4"/><path d="M71 34 v36"/>'
};

/* copies = how many of that card are in the 64-card item deck */
const CATALOGUE = [
  { key:'knife',      name:'Knife',                 restricted:true,  material:'metal',   copies:5 },
  { key:'bomb',       name:'Bomb',                  restricted:true,  material:'metal',   copies:5 },
  { key:'liquid',     name:'Huge bottle of liquid', restricted:true,  material:'organic', copies:5 },
  { key:'poison',     name:'Poison',                restricted:true,  material:'organic', copies:5 },

  { key:'sunglasses', name:'Sunglasses',            restricted:false, material:'organic', copies:3 },
  { key:'shoes',      name:'Shoes',                 restricted:false, material:'organic', copies:3 },
  { key:'laptop',     name:'Laptop',                restricted:false, material:'metal',   copies:3 },
  { key:'phone',      name:'Phone',                 restricted:false, material:'metal',   copies:3 },
  { key:'keys',       name:'Keys',                  restricted:false, material:'metal',   copies:3 },
  { key:'book',       name:'Paperback',             restricted:false, material:'organic', copies:3 },
  { key:'camera',     name:'Camera',                restricted:false, material:'metal',   copies:3 },
  { key:'headphones', name:'Headphones',            restricted:false, material:'organic', copies:3 },
  { key:'umbrella',   name:'Umbrella',              restricted:false, material:'organic', copies:3 },
  { key:'watch',      name:'Watch',                 restricted:false, material:'metal',   copies:3 },
  { key:'charger',    name:'Charger',               restricted:false, material:'metal',   copies:3 },
  { key:'hairbrush',  name:'Hairbrush',             restricted:false, material:'organic', copies:3 },
  { key:'teddy',      name:'Teddy bear',            restricted:false, material:'organic', copies:3 },
  { key:'toothbrush', name:'Toothbrush',            restricted:false, material:'organic', copies:3 },
  { key:'belt',       name:'Belt',                  restricted:false, material:'metal',   copies:2 }
];

function buildItemDeck() {
  const deck = [];
  let n = 0;
  CATALOGUE.forEach(c => {
    for (let i = 0; i < c.copies; i++) {
      deck.push({ uid: 'i' + (n++), key: c.key, name: c.name, restricted: c.restricted, material: c.material });
    }
  });
  return deck;
}

function itemSVG(item) {
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><g>' + ART[item.key] + '</g></svg>';
}
