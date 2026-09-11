(function () {
'use strict';

const BAG_CAP = 8;   /* most a suitcase card can physically cover */
const BOUNCE_CAP = 2;
const VP_TRAY = 1;
const VP_SEIZED = 2;
const VP_MISSED = -3;
const VP_WANTED = 3;    /* a reported-stolen item, found in a bag you opened */
const WANTED_N = 3;
const FREEZE_MS = 2000;   /* the hold after letting something through */

/* ---------- the bench ----------
   One stage, two lanes facing each other. Both belts run the same way — in
   from the left, out to the right — because two lanes running opposite ways
   read as two different machines rather than one bench. Officer B is the top
   lane with their arch flipped, head below the mouth, since they are standing
   on the other side of it. A passed tray parks on the right and stays there
   until the next one pushes it off, one per officer. */

const SW = 1360, SH = 712;
const TRAY = { w: 180, h: 108 };
const ITEM = { w: 88, h: 123 };
const LID  = { w: 88, h: 123 };   /* the suitcase front is the same size — it covers the stack exactly */

/* the same x positions for both lanes */
const X = { offstage: -230, parkIn: 16, parkOut: 520, done: 1150, exit: 1430 };

const YOU  = { top: 594, bench: 418, mine: true,  lamp: 'lamp',  ids: ['tya', 'tyb', 'tyc'] };
const THEM = { top: 8,   bench: 160, mine: false, lamp: 'lampB', ids: ['tba', 'tbb', 'tbc'] };

const SEIZE_YOU  = { x: 700, y: 292, w: 400, h: 116 };
const SEIZE_THEM = { x: 270, y: 292, w: 400, h: 116 };

/* the magnifier plates, one at the right-hand end of each bench row */
const LENS_YOU  = { x: 1152, y: 418, w: 196, h: 123 };
const LENS_THEM = { x: 1152, y: 160, w: 196, h: 123 };
const STOW = { scale: 0.42, cols: 9, dx: 42, dy: 46, ox: 8, oy: 18 };

const SLOTS = [266, 378, 490, 602, 714, 826, 938, 1050];
/* the front gets set down on the belt next to the tray, not on the bench —
   the right-hand end of each bench row belongs to the notice board */
function lidPark(lane) { return { x: 760, y: lane.top - 8 }; }

const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bad = it => it.restricted;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

let belt, held, onDeck, phase, opened, cards, started, t0, tick, over, scale = 1;
const you = { trays: 0, seized: [], missed: [] };
const opp = { trays: 0, seized: [], missed: [] };
let oppHeld = null, oppDeck = null, oppCards = [], oppBusy = false;
let stowYou = [], stowThem = [];
let wanted = [], wantedSet = null;
let hudShown = 0, hudAnim = null;
const timers = [];

/* every delayed step goes through here so a restart can cancel the lot */
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
function clearTimers() { timers.forEach(clearTimeout); timers.length = 0; }

/* ---------- tray pool ----------
   Three tray objects per lane, rotating through four roles: free, on deck at
   parkIn, being worked at parkOut, and parked on the right after a pass. */

function initLane(lane) {
  lane.pool = lane.ids.map(id => ({ el: $(id), box: $(id + 'c') }));
  lane.free = lane.pool.slice();
  lane.work = null; lane.deck = null; lane.done = null;
  lane.moving = 0;
}

function takeTray(lane, front) {
  const t = lane.free.pop() || lane.pool[0];
  t.box.innerHTML = suitcaseFace(front);
  t.el.className = 'tray ' + (lane.mine ? 'lane-tray-you' : 'lane-tray-b');
  t.el.style.transition = 'none';
  t.el.style.left = X.offstage + 'px';
  t.el.hidden = true;
  return t;
}

function freeTray(lane, t) {
  if (!t) return;
  t.el.hidden = true;
  t.el.className = 'tray ' + (lane.mine ? 'lane-tray-you' : 'lane-tray-b');
  if (lane.free.indexOf(t) < 0) lane.free.push(t);
}

/* ---------- stage fitting ---------- */

/* The point of the two-lane bench is seeing both stations at once, so the
   stage is fitted to the window as well as to the column. Reserve is the
   button row and the prompt underneath it. The stage is deliberately
   landscape: when the window is short, a wide stage scaled to fit the height
   still fills the width, which makes the cards bigger than a squarer one. */
function fit() {
  const wrap = $('stagewrap');
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  const reserve = 96;
  const room = Math.max(300, window.innerHeight - top - reserve);
  scale = Math.min(1, wrap.clientWidth / SW, room / SH);
  $('stage').style.transform = 'scale(' + scale + ')';
  wrap.style.height = Math.round(SH * scale) + 'px';
  wrap.style.width = Math.round(SW * scale) + 'px';
}
window.addEventListener('resize', fit);

function toStage(e) {
  const r = $('stage').getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}

/* ---------- setup ---------- */

/* The physical deal: the suitcase cards are shuffled into the item deck, and
   whatever sits under a suitcase is what's in that bag. The shuffle does the
   work, so bag sizes vary — that variance is the point. Anything above the
   topmost suitcase wraps round to the last one so no card is lost. */
function deal() {
  const stream = shuffle(buildItemDeck().concat(new Array(trayCount()).fill(null)));
  const bags = [];
  let cur = null, orphans = [];
  stream.forEach(c => {
    if (c === null) { cur = { items: [] }; bags.push(cur); }
    else if (cur) cur.items.push(c);
    else orphans.push(c);
  });
  bags[bags.length - 1].items = bags[bags.length - 1].items.concat(orphans);

  const by = k => bags.slice().sort((a, b) => k * (a.items.length - b.items.length))[0];
  for (let guard = 0; guard < 400; guard++) {
    const big = by(-1), small = by(1);
    if (small.items.length >= 1 && big.items.length <= BAG_CAP) break;
    if (big.items.length < 2) break;
    small.items.push(big.items.pop());
  }
  /* six designs appear twice in the deck; if both copies land in one bag they
     stack into what looks like a single card, so swap one out */
  bags.forEach(b => {
    b.items.forEach((it, i) => {
      if (!b.items.some((o, j) => j < i && o.design === it.design)) return;
      const host = bags.find(o => o !== b && !o.items.some(x => x.design === it.design));
      if (!host) return;
      const k = Math.floor(Math.random() * host.items.length);
      if (b.items.some(x => x.design === host.items[k].design)) return;
      b.items[i] = host.items[k];
      host.items[k] = it;
    });
  });

  const fronts = shuffle(buildSuitcaseDeck());
  return shuffle(bags).map((bag, i) => ({ id: i, bag, bounces: 0, front: fronts[i] }));
}

function start() {
  clearTimers();
  clearInterval(tick);
  belt = deal();
  held = null; onDeck = null; phase = 'idle'; opened = false; cards = [];
  oppHeld = null; oppDeck = null; oppBusy = false;
  you.trays = opp.trays = 0; you.seized = []; you.missed = []; opp.seized = []; opp.missed = [];
  started = false; over = false;
  clearCards(); clearOppCards();
  stowYou.forEach(el => el.remove()); stowYou = [];
  stowThem.forEach(el => el.remove()); stowThem = [];
  initLane(YOU); initLane(THEM);
  wanted = pickWanted(WANTED_N);
  wantedSet = {};
  wanted.forEach(w => { wantedSet[w.file] = true; });
  drawBoard();
  $('freeze').hidden = true;
  showLens('you', null); showLens('them', null);
  $('lensYou').classList.remove('hot');
  $('bannedFoot').textContent = restrictedCount() + ' of them on the belt today';
  $('result').hidden = true;
  $('stage').classList.remove('running-you', 'running-b');
  lamp(YOU, false); lamp(THEM, false);
  hudShown = 0; $('hudScore').textContent = '0';
  fit(); drawQueue(); drawTally(); render();
}

/* ---------- the notice board ---------- */

/* A card is mostly empty space, so a thumbnail of the whole thing shows very
   little. CROP says where the object actually sits; this scales and offsets
   the card art inside a small tile so the object fills it. */
function tile(file, tw, th) {
  const c = cropOf(file);
  const W = 440, H = 617;
  const k = Math.min(tw / (c[2] * W), th / (c[3] * H));
  const iw = W * k, ih = H * k;
  const left = -c[0] * iw + (tw - c[2] * iw) / 2;
  const top  = -c[1] * ih + (th - c[3] * ih) / 2;
  return '<span class="ptile" style="width:' + tw + 'px;height:' + th + 'px">' +
    '<img src="assets/cards/' + file + '" alt="" style="width:' + Math.round(iw) +
    'px;height:' + Math.round(ih) + 'px;left:' + Math.round(left) + 'px;top:' +
    Math.round(top) + 'px">' + '</span>';
}

function isWanted(item) { return !!(wantedSet && wantedSet[item.design]); }

function foundWanted(who, file) {
  return who.seized.some(it => it.design === file);
}

function drawBoard() {
  $('boardList').innerHTML = wanted.map(w => {
    const mine = foundWanted(you, w.file);
    const theirs = foundWanted(opp, w.file);
    const tag = mine ? '<span class="poster-got">Recovered</span>'
              : theirs ? '<span class="poster-got">B recovered it</span>' : '';
    return '<div class="poster' + (mine || theirs ? ' found' : '') + '">' +
      tile(w.file, 44, 40) +
      '<span class="poster-name">' + w.name + tag + '</span></div>';
  }).join('');
}

/* ---------- queue ---------- */

function drawQueue() {
  const b = $('belt');
  b.innerHTML = belt.length
    ? belt.map((t, i) => '<span class="qtray' + (i === 0 ? ' next' : '') + '" data-bounces="' + t.bounces + '"></span>').join('')
    : '<span class="belt-empty">Belt empty</span>';
  $('beltCount').textContent = belt.length + (belt.length === 1 ? ' tray on the belt' : ' trays on the belt');
}

/* ---------- clock ---------- */

function beginClock() {
  if (started) return;
  started = true; t0 = Date.now();
  tick = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $('clock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }, 500);
  startAmbience();
  later(oppTurn, 2600);
}

/* ---------- machine ---------- */

function lamp(lane, on, flashing) {
  const el = $(lane.lamp);
  const wasRed = el.classList.contains('red');
  el.className = 'arch-lamp' + (on ? ' red' : '') + (flashing ? ' flash' : '');
  if (on && !wasRed) play('beep', lane.mine ? 0.5 : SFX_THEM);
}

/* Each lane's rollers turn only while something in that lane is moving, so you
   can tell at a glance which side of the bench is busy — and checking a bag
   stops your belt, because nothing of yours is moving while you work. */
function move(lane, t, x, ms, then) {
  const cls = lane.mine ? 'running-you' : 'running-b';
  lane.moving++;
  $('stage').classList.add(cls);
  t.el.hidden = false;
  t.el.style.left = x + 'px';
  later(() => {
    lane.moving = Math.max(0, lane.moving - 1);
    if (!lane.moving) $('stage').classList.remove(cls);
    if (then) then();
  }, ms);
}

/* the belt itself, whenever a tray is sent anywhere */
function beltNoise(lane) { play('conveyor', lane.mine ? 0.5 : SFX_THEM); }

function roll(lane, t, x, ms, then) {
  t.el.style.transition = 'none';
  void t.el.offsetWidth;
  t.el.style.transition = '';
  move(lane, t, x, ms, then);
}

function parkAt(t, x) {
  t.el.style.transition = 'none';
  t.el.style.left = x + 'px';
  t.el.hidden = false;
  void t.el.offsetWidth;
  t.el.style.transition = '';
}

/* ---------- sound ----------
   Foley for the bench. Each group has one or more takes; a take is chosen at
   random and never the same one twice running, with a touch of pitch wobble so
   repeats of a small group don't sound mechanical. */

const SFX = {
  book:     ['book_1', 'book_2'],
  cloth:    ['cloth_1', 'cloth_2', 'cloth_3', 'cloth_4'],
  glass:    ['glass_1', 'glass_2', 'glass_3'],
  light:    ['light_1', 'light_2', 'light_3', 'light_4', 'light_5', 'light_6'],
  hardcase: ['hardcase_1', 'hardcase_2', 'hollow_1'],
  plastic:  ['plastic_1'],
  rustle:   ['rustle_1', 'rustle_2'],
  open:     ['open_1', 'open_2', 'open_3', 'open_4'],
  shut:     ['shut_1'],
  beep:     ['beep'],
  conveyor: ['conveyor']
};
const SFX_VOL = 0.65;
const SFX_THEM = 0.2;
const AMBIENCE_VOL = 0.17;

const sfxBank = {};
const lastTake = {};
let ambience = null;
let muted = false;

function loadSfx() {
  Object.keys(SFX).forEach(group => {
    SFX[group].forEach(name => {
      const a = new Audio('assets/sfx/' + name + '.mp3');
      a.preload = 'auto';
      sfxBank[name] = a;
    });
  });
  ambience = new Audio('assets/sfx/ambience.mp3');
  ambience.loop = true;
  ambience.preload = 'auto';
  ambience.volume = AMBIENCE_VOL;
}

/* Browsers refuse audio until the page has been clicked, which is what Go is
   for. */
function startAmbience() {
  if (!ambience || muted) return;
  const p = ambience.play();
  if (p && p.catch) p.catch(() => {});
}

function play(group, volume) {
  if (muted) return;
  const takes = SFX[group] || SFX.light;
  let i = Math.floor(Math.random() * takes.length);
  if (takes.length > 1 && i === lastTake[group]) i = (i + 1) % takes.length;
  lastTake[group] = i;
  const src = sfxBank[takes[i]];
  if (!src) return;
  const a = src.cloneNode();
  a.volume = clamp(volume === undefined ? SFX_VOL : volume, 0, 1);
  a.playbackRate = 0.94 + Math.random() * 0.12;
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
}

function playItem(item, volume) { play(soundFor(item.design), volume); }

function setMuted(on) {
  muted = on;
  const b = $('mute');
  b.textContent = on ? 'Sound off' : 'Sound on';
  b.setAttribute('aria-pressed', String(on));
  b.classList.toggle('off', on);
  if (!ambience) return;
  if (on) ambience.pause();
  else if (started) startAmbience();
}

/* ---------- score feedback ---------- */

function pop(x, y, text, kind) {
  const el = document.createElement('span');
  el.className = 'pop' + (kind ? ' ' + kind : '');
  el.textContent = text;
  el.style.left = Math.round(x) + 'px';
  el.style.top = Math.round(y) + 'px';
  $('stage').appendChild(el);
  later(() => el.remove(), 1100);
}

function drawHud() {
  const target = scoreOf(you);
  if (target === hudShown) return;
  cancelAnimationFrame(hudAnim);
  const from = hudShown, delta = target - from, at = performance.now(), dur = 420;
  const el = $('hudScore');
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  const step = now => {
    const k = Math.min(1, (now - at) / dur);
    el.textContent = Math.round(from + delta * (1 - Math.pow(1 - k, 3)));
    if (k < 1) hudAnim = requestAnimationFrame(step); else hudShown = target;
  };
  hudAnim = requestAnimationFrame(step);
}

/* ---------- cards ---------- */

function clearCards() { cards.forEach(c => c.el.remove()); cards = []; }
function clearOppCards() { oppCards.forEach(c => c.el.remove()); oppCards = []; }

function trayCentre(lane) { return { x: X.parkOut + TRAY.w / 2, y: lane.top + TRAY.h / 2 }; }

function makeCard(item, front, theirs) {
  const el = document.createElement(theirs ? 'div' : 'button');
  el.className = 'card ' + (item ? 'item' : 'lid') + (theirs ? ' theirs' : '');
  el.innerHTML = item ? itemFace(item) : suitcaseFace(front);
  if (theirs) el.setAttribute('aria-hidden', 'true');
  return el;
}

function spawnCards() {
  const c = trayCentre(YOU);
  held.bag.items.forEach(it => {
    const el = makeCard(it, null, false);
    el.setAttribute('aria-label', 'Item card, still in the case');
    const rot = rnd(-1.2, 1.2);
    place(el, c.x - ITEM.w / 2 + rnd(-3, 3), c.y - ITEM.h / 2 + rnd(-3, 3), rot);
    $('stage').appendChild(el);
    const card = { el, item: it, kind: 'item', inCase: true, rot };
    cards.push(card);
    bindDrag(card);
  });

  const lid = makeCard(null, held.front, false);
  lid.setAttribute('aria-label', 'Suitcase front. Lift it off to open the case.');
  place(lid, c.x - LID.w / 2, c.y - LID.h / 2, 0);
  $('stage').appendChild(lid);
  const card = { el: lid, kind: 'lid', inCase: true, rot: 0 };
  cards.push(card);
  bindDrag(card);
}

function place(el, x, y, rot) {
  el.style.left = Math.round(x) + 'px';
  el.style.top = Math.round(y) + 'px';
  el.style.transform = 'rotate(' + (rot || 0).toFixed(1) + 'deg)';
}

/* ms is optional: a hand does not move every card at the same speed */
function settle(el, x, y, rot, ms) {
  el.classList.add('settle');
  if (ms) el.style.transitionDuration = ms + 'ms';
  place(el, x, y, rot);
  later(() => { el.classList.remove('settle'); el.style.transitionDuration = ''; }, (ms || 320) + 30);
}

function freeSlot() {
  const taken = cards.filter(c => c.kind === 'item' && !c.inCase).length;
  return SLOTS[taken % SLOTS.length];
}

function stowSpot(tray, n) {
  const i = n % (STOW.cols * 2);
  return {
    x: tray.x + STOW.ox + (i % STOW.cols) * STOW.dx,
    y: tray.y + STOW.oy + Math.floor(i / STOW.cols) * STOW.dy
  };
}

function stow(el, tray, list) {
  const s = stowSpot(tray, list.length);
  el.classList.add('settle');
  el.style.left = Math.round(s.x) + 'px';
  el.style.top = Math.round(s.y) + 'px';
  el.style.transform = 'scale(' + STOW.scale + ')';
  later(() => { el.classList.remove('settle'); el.classList.add('stowed'); }, 340);
  list.push(el);
}

/* ---------- the magnifier ----------
   Hold a card over your plate and it is shown large in the panel above it. B
   has one too, and uses it: every card they lay out passes over theirs, which
   is what reading a bag looks like from the other side of a bench. */

function overLens(el, lens) {
  const c = centreOf(el);
  return c.x > lens.x && c.x < lens.x + lens.w && c.y > lens.y && c.y < lens.y + lens.h;
}

function showLens(which, item) {
  const box = $(which === 'you' ? 'lensViewYou' : 'lensViewB');
  if (!item) { box.hidden = true; box.innerHTML = ''; return; }
  box.innerHTML = itemFace(item);
  box.hidden = false;
}

let lensTimer = null;
function flashLens(item) {
  showLens('them', item);
  clearTimeout(lensTimer);
  lensTimer = setTimeout(() => showLens('them', null), 820);
  timers.push(lensTimer);
}

/* ---------- dragging (your side only, and only while checking) ---------- */

let drag = null;

function bindDrag(card) {
  const el = card.el;
  el.addEventListener('pointerdown', e => {
    if (phase !== 'searching') return;
    e.preventDefault();
    $('stage').appendChild(el);
    el.setPointerCapture(e.pointerId);
    const p = toStage(e);
    drag = { card, dx: p.x - parseFloat(el.style.left), dy: p.y - parseFloat(el.style.top), moved: 0 };
    el.classList.add('lift');
    el.classList.remove('settle');
  });

  el.addEventListener('pointermove', e => {
    if (!drag || drag.card !== card) return;
    const p = toStage(e);
    const nx = clamp(p.x - drag.dx, 4, SW - ITEM.w - 6);
    const ny = clamp(p.y - drag.dy, 4, SH - ITEM.h - 6);
    drag.moved += Math.abs(nx - parseFloat(el.style.left)) + Math.abs(ny - parseFloat(el.style.top));
    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
    if (card.kind === 'item') {
      $('seizeYou').classList.toggle('hot', inSeize(el));
      const lensed = overLens(el, LENS_YOU);
      $('lensYou').classList.toggle('hot', lensed);
      showLens('you', lensed ? card.item : null);
    }
    if (drag.moved > 12 && card.kind === 'lid' && !opened) openCase();
    if (drag.moved > 12 && card.kind === 'item' && card.inCase) { card.inCase = false; playItem(card.item); }
  });

  const release = () => {
    if (!drag || drag.card !== card) return;
    el.classList.remove('lift');
    $('seizeYou').classList.remove('hot');
    $('lensYou').classList.remove('hot');
    showLens('you', null);
    const tap = drag.moved < 10;
    drag = null;
    if (tap) { onTap(card); return; }
    if (card.kind === 'item' && inSeize(el)) seize(card);
    if (card.kind === 'lid' && onTray(el)) closeCase();
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}

function centreOf(el) {
  return { x: parseFloat(el.style.left) + ITEM.w / 2, y: parseFloat(el.style.top) + ITEM.h / 2 };
}

function inSeize(el) {
  const c = centreOf(el);
  return c.x > SEIZE_YOU.x && c.x < SEIZE_YOU.x + SEIZE_YOU.w &&
         c.y > SEIZE_YOU.y && c.y < SEIZE_YOU.y + SEIZE_YOU.h;
}

function onTray(el) {
  const c = centreOf(el);
  return c.x > X.parkOut - 60 && c.x < X.parkOut + TRAY.w + 60 &&
         c.y > YOU.top - 60 && c.y < YOU.top + TRAY.h + 60;
}

/* tap fallback so this works on a phone and with a keyboard */
function onTap(card) {
  if (phase !== 'searching') return;
  if (card.kind === 'lid') {
    if (!opened) { const lp = lidPark(YOU); openCase(); settle(card.el, lp.x, lp.y, -4); }
    else closeCase();
    return;
  }
  if (!opened) return;
  if (card.inCase) {
    card.inCase = false;
    playItem(card.item);
    settle(card.el, freeSlot(), YOU.bench, rnd(-5, 5));
    card.el.setAttribute('aria-label', 'Item card on the bench. Select again to seize it.');
  } else {
    seize(card);
  }
}

function openCase() {
  if (opened) return;
  opened = true;
  play('open');
  cards.forEach(c => { if (c.kind === 'item') c.el.setAttribute('aria-label', 'Item card in the open case. Select to slide it out.'); });
  render();
}

function seize(card) {
  if (card.seized) return;
  card.seized = true;
  const c = centreOf(card.el);
  held.bag.items = held.bag.items.filter(x => x.uid !== card.item.uid);
  you.seized.push(card.item);
  if (isWanted(card.item)) { pop(c.x - 14, c.y - 28, '+' + VP_WANTED, 'good'); drawBoard(); }
  else if (card.item.restricted) pop(c.x - 14, c.y - 28, '+' + VP_SEIZED, 'good');
  playItem(card.item);
  cards = cards.filter(other => other !== card);
  stow(card.el, SEIZE_YOU, stowYou);
  drawTally();
  render();
}

/* Putting the front back packs the bag up. It does not file the tray — that is
   what Pass is for. */
function closeCase() {
  if (!opened) return;
  const c = trayCentre(YOU);
  let t = 0;
  cards.forEach(cd => {
    if (cd.kind !== 'item') return;
    const gap = cd.inCase ? 0 : Math.round(rnd(60, 150));
    t += gap;
    const it = cd.item, wasOut = !cd.inCase;
    cd.inCase = true;
    later(() => {
      settle(cd.el, c.x - ITEM.w / 2 + rnd(-5, 5), c.y - ITEM.h / 2, cd.rot, Math.round(rnd(230, 360)));
      if (wasOut) playItem(it, SFX_VOL * 0.85);
    }, t);
  });
  const lid = cards.find(cd => cd.kind === 'lid');
  later(() => {
    if (lid) settle(lid.el, c.x - LID.w / 2, c.y - LID.h / 2, 0);
    play('shut');
  }, t + 220);
  opened = false;
  render();
}

/* ---------- your lane flow ----------
   Go moves the belt on one step: it fetches the first tray, and after that it
   sends whatever is waiting through the detector. */

function feedLane() {
  if (over || held) return;
  if (!belt.length) { phase = 'idle'; render(); checkEnd(); return; }
  held = belt.shift();
  opened = false;
  clearCards();
  lamp(YOU, false);
  YOU.work = takeTray(YOU, held.front);
  phase = 'rolling';
  drawQueue(); render();
  roll(YOU, YOU.work, X.parkIn, 1200, () => {
    if (!over && phase === 'rolling') { phase = 'ready'; render(); }
  });
}

/* the on-deck tray, rolling into the spot the scanned one just left */
function queueNext() {
  if (over || onDeck || !belt.length) return;
  onDeck = belt.shift();
  YOU.deck = takeTray(YOU, onDeck.front);
  YOU.deck.el.classList.add('waiting');
  drawQueue();
  roll(YOU, YOU.deck, X.parkIn, 1200);
}

/* the tray you were working has gone; whatever is waiting becomes yours */
function promote() {
  if (over) return;
  if (!onDeck) { feedLane(); return; }
  held = onDeck; onDeck = null;
  opened = false;
  clearCards();
  lamp(YOU, false);
  YOU.work = YOU.deck; YOU.deck = null;
  YOU.work.el.classList.remove('waiting');
  phase = 'ready';
  drawQueue(); render();
}

function goPressed() {
  if (!started) { beginClock(); beltNoise(YOU); feedLane(); return; }
  if (phase === 'ready') { beltNoise(YOU); scan(); }
}

function scan() {
  phase = 'scanning'; render();
  move(YOU, YOU.work, X.parkOut, 1250, () => {
    if (over) return;
    phase = 'scanned';
    render();
  });
  later(queueNext, 420);
  later(() => { if (!over && held) lamp(YOU, held.bag.items.some(bad), true); }, 700);
}

/* Check — the belt stops and the suitcase becomes yours to open */
function checkPressed() {
  if (phase !== 'scanned') return;
  phase = 'searching';
  YOU.work.box.hidden = true;
  spawnCards();
  render();
}

/* Pass — this tray is done with, whatever is still in it */
function passPressed() {
  if (phase === 'scanned') { fileTray(); return; }
  if (phase === 'searching' && !opened) fileTray();
}

function bounce() {
  held.bounces++;
  belt.push(held);
  clearCards();
  phase = 'leaving'; render();
  const t = YOU.work; YOU.work = null;
  move(YOU, t, X.exit, 900, () => {
    freeTray(YOU, t);
    held = null; lamp(YOU, false);
    drawQueue(); wakeOpp();
    promote();
  });
}

/* A passed tray slides right and parks. The one already parked gets pushed off
   the end to make room, so there is exactly one sitting there per officer. */
function shelve(lane, t) {
  const old = lane.done;
  lane.done = t;
  t.el.classList.add('done');
  move(lane, t, X.done, 900);
  if (old) move(lane, old, X.exit, 900, () => freeTray(lane, old));
}

function fileTray() {
  you.trays++;
  const slipped = held.bag.items.filter(bad);
  slipped.forEach(it => you.missed.push(it));
  const c = trayCentre(YOU);
  if (slipped.length) pop(c.x - 22, c.y - 96, String(VP_MISSED * slipped.length), 'bad');
  else pop(c.x - 12, c.y - 96, '+' + VP_TRAY, 'good');

  phase = 'leaving'; render();
  cards.forEach(cd => cd.el.classList.add('binned'));
  later(clearCards, 320);
  const t = YOU.work; YOU.work = null;
  t.box.hidden = false;
  shelve(YOU, t);
  held = null; opened = false;
  lamp(YOU, false);
  drawTally();
  later(() => {
    if (over) return;
    if (slipped.length) freeze(slipped.length); else promote();
  }, 700);
}

/* ---------- the hold ---------- */

function freeze(n) {
  phase = 'frozen';
  const box = $('freeze');
  box.hidden = false;
  $('freezeWhy').textContent = n === 1
    ? 'One restricted item went through'
    : n + ' restricted items went through';
  render();
  const end = Date.now() + FREEZE_MS;
  const t = setInterval(() => {
    const left = Math.max(0, end - Date.now());
    $('freezeCount').textContent = (left / 1000).toFixed(1) + 's';
    if (left <= 0) {
      clearInterval(t);
      box.hidden = true;
      if (!over) promote();
    }
  }, 80);
  timers.push(t);
}

/* ---------- controls + copy ---------- */

function render() {
  const p = $('prompt');
  const go = $('btnGo'), pass = $('btnPass'), check = $('btnCheck'), back = $('btnBounce');
  go.disabled = pass.disabled = check.disabled = true;
  back.hidden = true;
  check.classList.toggle('active', phase === 'searching');

  if (over) { p.textContent = 'Shift over.'; return; }

  if (phase === 'idle') {
    if (!started) {
      go.disabled = false;
      p.innerHTML = 'Officer B is across the bench, working the same belt. <strong>Go</strong> starts it and pushes the first tray down to you.';
    } else {
      p.textContent = 'Belt empty. Waiting on the other lane.';
    }
    return;
  }
  if (phase === 'rolling') { p.textContent = 'Tray coming down the belt.'; return; }

  if (phase === 'ready') {
    go.disabled = false;
    p.innerHTML = 'A closed suitcase in a tray. No idea what is under the lid until it goes through. <strong>Go</strong> sends it into the detector.';
    return;
  }
  if (phase === 'scanning') { p.textContent = 'Scanning.'; return; }

  if (phase === 'scanned') {
    pass.disabled = false; check.disabled = false;
    back.hidden = held.bounces >= BOUNCE_CAP;
    const dirty = held.bag.items.some(bad);
    p.innerHTML = dirty
      ? 'Red light. Something in there is restricted, and the detector will not say how many. <strong>Check</strong> stops the belt and opens the case. <strong>Pass</strong> sends it through as it is.'
      : 'No light. Nothing restricted in there. <strong>Pass</strong> keeps the tray and moves the belt on.';
    return;
  }

  if (phase === 'searching') {
    if (!opened) {
      pass.disabled = false;
      p.innerHTML = 'The case is shut and the bag is packed. <strong>Pass</strong> files the tray — there is no second scan, so whatever is still in there goes with it.';
    } else {
      p.innerHTML = 'The item cards are clear, so they print over each other. Slide them out onto the bench to read them, drag what is restricted into <strong>your seize tray</strong>, then put the front back on the tray to close it.';
    }
    return;
  }

  if (phase === 'leaving') { p.textContent = 'Tray away.'; return; }
  if (phase === 'frozen') { p.textContent = 'Held at the bench. The belt does not wait for you.'; return; }
}

/* ---------- Officer B ----------
   They work the same way you do, in front of you. The timings are all
   jittered: no two cards come out of a bag at the same rate, they pause on
   some of them, and everything goes back in one at a time. Even, regular
   spacing was the thing that made them read as a machine. */

function wakeOpp() { if (!over && started && !oppBusy && belt.length) later(oppTurn, 900); }
function oppSay(t) { $('oppDoing').textContent = t; }

/* 0 = comfortable, 1 = being buried by the other lane */
function oppRush() { return clamp((you.trays - opp.trays) / 6, 0, 1); }

function oppTurn() {
  if (over) return;
  const fromDeck = !!oppDeck;
  if (oppDeck) { oppHeld = oppDeck; oppDeck = null; }
  else if (belt.length) { oppHeld = belt.shift(); }
  else { oppBusy = false; oppSay('Nothing on the belt'); checkEnd(); return; }

  oppBusy = true;
  clearOppCards();
  lamp(THEM, false);
  drawQueue();
  oppSay(oppRush() > 0.55 ? 'Hurrying a tray in' : 'Taking the next tray');

  if (fromDeck) {
    THEM.work = THEM.deck; THEM.deck = null;
    THEM.work.el.classList.remove('waiting');
    later(oppScan, Math.round(rnd(450, 900)));
  } else {
    THEM.work = takeTray(THEM, oppHeld.front);
    roll(THEM, THEM.work, X.parkIn, 1200, () => later(oppScan, Math.round(rnd(250, 700))));
  }
}

function oppScan() {
  if (over || !THEM.work) return;
  oppSay('Sending it through');
  beltNoise(THEM);
  move(THEM, THEM.work, X.parkOut, 1250, oppAfterScan);
  later(oppQueueNext, 420);
  later(() => { if (!over && oppHeld) lamp(THEM, oppHeld.bag.items.some(bad), true); }, 700);
}

function oppQueueNext() {
  if (over || oppDeck || !belt.length) return;
  oppDeck = belt.shift();
  THEM.deck = takeTray(THEM, oppDeck.front);
  THEM.deck.el.classList.add('waiting');
  drawQueue();
  roll(THEM, THEM.deck, X.parkIn, 1200);
}

function oppAfterScan() {
  if (over) return;
  const contraband = oppHeld.bag.items.filter(bad);
  const size = oppHeld.bag.items.length;
  const rush = oppRush();

  if (!contraband.length) {
    oppSay('No light — tray kept');
    later(() => oppFile([]), Math.round(rnd(600, 1100)));
    return;
  }

  /* bouncing costs a tray, so an officer who is behind stops doing it */
  const bounceOdds = 0.4 * (1 - rush) * (size >= 5 ? 1 : 0.3);
  if (oppHeld.bounces < BOUNCE_CAP && Math.random() < bounceOdds) {
    oppSay('Pushed a tray back');
    oppHeld.bounces++;
    belt.push(oppHeld);
    drawQueue();
    const t = THEM.work; THEM.work = null;
    move(THEM, t, X.exit, 900, () => {
      freeTray(THEM, t);
      oppHeld = null; lamp(THEM, false);
      oppBusy = false;
      later(oppTurn, Math.round(rnd(400, 900)));
    });
    return;
  }

  oppOpen(contraband, size, rush);
}

/* lift the front off and lay the bag out, a card at a time, unevenly */
function oppOpen(contraband, size, rush) {
  const c = trayCentre(THEM);
  THEM.work.box.hidden = true;
  oppSay(rush > 0.5 ? 'Skimming a bag' : 'Going through a bag');
  play('open', SFX_THEM);

  oppHeld.bag.items.forEach(it => {
    const el = makeCard(it, null, true);
    place(el, c.x - ITEM.w / 2 + rnd(-3, 3), c.y - ITEM.h / 2 + rnd(-3, 3), rnd(-1.2, 1.2));
    $('stage').appendChild(el);
    oppCards.push({ el, item: it, kind: 'item' });
  });
  const lidEl = makeCard(null, oppHeld.front, true);
  place(lidEl, c.x - LID.w / 2, c.y - LID.h / 2, 0);
  $('stage').appendChild(lidEl);
  oppCards.push({ el: lidEl, kind: 'lid' });

  const pace = 1 - 0.4 * rush;
  let t = Math.round(rnd(150, 320) * pace);
  later(() => { if (!over) { const lp = lidPark(THEM); settle(lidEl, lp.x, lp.y, 5, Math.round(rnd(280, 420))); } }, t);

  const items = oppCards.filter(cd => cd.kind === 'item');
  items.forEach((cd, i) => {
    /* an uneven hand: mostly quick, occasionally a long look at one card */
    let gap = rnd(120, 300);
    if (Math.random() < 0.22) gap += rnd(250, 650) * (1 - rush);
    t += Math.round(gap * pace);
    later(() => {
      if (over) return;
      settle(cd.el, SLOTS[i % SLOTS.length], THEM.bench, rnd(-5, 5), Math.round(rnd(240, 420)));
      playItem(cd.item, SFX_THEM);
      flashLens(cd.item);
    }, t);
  });

  const dwell = Math.round(rnd(400, 900) * pace + 180 * size * pace);
  later(() => { if (!over) oppSearch(contraband, size, rush); }, t + dwell);
}

/* Two sweeps if they have time, one if they are panicking. A thin bag gets
   picked clean either way; a fat one is where a hurried officer loses things. */
function oppSearch(contraband, size, rush) {
  if (over) return;
  const perPass = clamp(0.92 - 0.03 * (size - 1) - 0.13 * rush, 0.55, 0.96);
  const passes = rush < 0.6 ? 2 : 1;
  const odds = 1 - Math.pow(1 - perPass, passes);

  const found = [], missed = [];
  contraband.forEach(it => (Math.random() < odds ? found : missed).push(it));
  /* B is looking at the same notice board you are */
  oppCards.forEach(cd => {
    if (cd.item && isWanted(cd.item) && Math.random() < odds) found.push(cd.item);
  });

  let t = 0;
  found.forEach(it => {
    t += Math.round(rnd(280, 620));
    later(() => {
      if (over) return;
      const cd = oppCards.find(x => x.item && x.item.uid === it.uid);
      if (!cd) return;
      oppCards = oppCards.filter(x => x !== cd);
      opp.seized.push(it);
      oppHeld.bag.items = oppHeld.bag.items.filter(x => x.uid !== it.uid);
      playItem(it, SFX_THEM);
      stow(cd.el, SEIZE_THEM, stowThem);
      pop(SEIZE_THEM.x + SEIZE_THEM.w - 60, SEIZE_THEM.y - 26,
          '+' + (isWanted(it) ? VP_WANTED : VP_SEIZED), 'theirs');
      if (isWanted(it)) drawBoard();
      drawTally();
    }, t);
  });

  later(() => { if (!over) oppClose(missed); }, t + Math.round(rnd(350, 700)));
}

/* everything left goes back in one at a time, not all at once */
function oppClose(missed) {
  if (over) return;
  const c = trayCentre(THEM);
  const items = oppCards.filter(cd => cd.kind === 'item');
  let t = 0;
  items.forEach(cd => {
    t += Math.round(rnd(110, 260));
    const it = cd.item;
    later(() => {
      if (over) return;
      settle(cd.el, c.x - ITEM.w / 2 + rnd(-5, 5), c.y - ITEM.h / 2, rnd(-1.5, 1.5), Math.round(rnd(220, 360)));
      playItem(it, SFX_THEM * 0.85);
    }, t);
  });
  const lid = oppCards.find(cd => cd.kind === 'lid');
  t += Math.round(rnd(200, 380));
  later(() => {
    if (over) return;
    if (lid) settle(lid.el, c.x - LID.w / 2, c.y - LID.h / 2, 0, 320);
    play('shut', SFX_THEM);
  }, t);
  oppSay('Closing it up');
  later(() => { if (!over) oppFile(missed); }, t + Math.round(rnd(420, 780)));
}

function oppFile(missed) {
  if (over) return;
  opp.trays++;
  missed.forEach(it => opp.missed.push(it));
  const c = trayCentre(THEM);
  if (missed.length) pop(c.x - 22, c.y + 92, String(VP_MISSED * missed.length), 'bad');
  else pop(c.x - 12, c.y + 92, '+' + VP_TRAY, 'theirs');
  drawTally();

  oppCards.forEach(cd => cd.el.classList.add('binned'));
  later(clearOppCards, 320);
  oppSay(missed.length ? 'Filed it — something got past' : 'Filed a bag');

  const t = THEM.work; THEM.work = null;
  if (t) { t.box.hidden = false; shelve(THEM, t); }
  oppHeld = null; lamp(THEM, false);
  oppBusy = false;
  later(oppTurn, Math.round(rnd(500, 1100)));
}

/* ---------- score ---------- */

function wantedTaken(p) { return p.seized.filter(isWanted).length; }
function scoreOf(p) {
  return p.trays * VP_TRAY
    + p.seized.filter(bad).length * VP_SEIZED
    + wantedTaken(p) * VP_WANTED
    + p.missed.length * VP_MISSED;
}

function drawTally() {
  $('youTrays').textContent = you.trays;
  $('youSeized').textContent = you.seized.filter(bad).length;
  $('youScore').textContent = scoreOf(you);
  $('oppTrays').textContent = opp.trays;
  $('oppSeized').textContent = opp.seized.filter(bad).length;
  $('oppScore').textContent = scoreOf(opp);
  $('seizeN').textContent = you.seized.length;
  $('seizeNB').textContent = opp.seized.length;
  drawHud();
}

function checkEnd() {
  if (over) return;
  if (belt.length === 0 && !held && !onDeck && !oppHeld && !oppDeck && !oppBusy) finish();
}

function finish() {
  over = true;
  clearInterval(tick);
  clearTimers();
  if (ambience) ambience.pause();
  $('freeze').hidden = true;
  $('stage').classList.remove('running-you', 'running-b');
  render();

  const ys = scoreOf(you), os = scoreOf(opp);
  const verdict = ys > os ? 'You win the shift.' : ys < os ? 'Officer B wins the shift.' : 'Dead heat.';
  const falseGrabs = you.seized.filter(it => !it.restricted && !isWanted(it)).length;

  const sheet = (who, p) => {
    const s = p.seized.filter(bad).length;
    return '<div class="sheet"><h3>' + who + '</h3><table>' +
      '<tr><td>Trays kept — ' + p.trays + ' × ' + VP_TRAY + '</td><td>' + (p.trays * VP_TRAY) + '</td></tr>' +
      '<tr><td>Restricted seized — ' + s + ' × ' + VP_SEIZED + '</td><td>' + (s * VP_SEIZED) + '</td></tr>' +
      '<tr><td>Stolen goods recovered — ' + wantedTaken(p) + ' × ' + VP_WANTED + '</td><td>' + (wantedTaken(p) * VP_WANTED) + '</td></tr>' +
      '<tr class="neg"><td>Let through — ' + p.missed.length + ' × ' + VP_MISSED + '</td><td>' + (p.missed.length * VP_MISSED) + '</td></tr>' +
      '<tr class="total"><td>Total</td><td>' + scoreOf(p) + '</td></tr></table>' +
      (p.missed.length ? '<p class="missed">Walked straight through: ' + p.missed.map(i => i.name.toLowerCase()).join(', ') + '</p>' : '') +
      '</div>';
  };

  $('result').innerHTML =
    '<div class="result-inner"><h2>' + verdict + '</h2>' +
    '<p class="verdict">Reported stolen this shift: ' +
    wanted.map(x => x.name.toLowerCase()).join(', ') + '. ' +
    (falseGrabs ? 'You also confiscated ' + falseGrabs + ' thing' + (falseGrabs === 1 ? '' : 's') +
      ' nobody was smuggling, which scores nothing and cost you time.' : '') + '</p>' +
    '<div class="sheets">' + sheet('You', you) + sheet('Officer B', opp) + '</div>' +
    '<div class="controls again"><button class="go" id="again">Run another shift</button></div></div>';
  $('result').hidden = false;
  $('again').onclick = () => { $('clock').textContent = '0:00'; oppSay('Walking to the lane'); start(); };
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- wiring ---------- */

loadSfx();
$('btnGo').onclick = goPressed;
$('btnPass').onclick = passPressed;
$('btnCheck').onclick = checkPressed;
$('btnBounce').onclick = () => { if (phase === 'scanned') bounce(); };
$('mute').onclick = () => setMuted(!muted);
setMuted(false);
start();
})();
