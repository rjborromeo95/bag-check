(function () {
'use strict';

const BOUNCE_CAP = 2;
const VP_TRAY = 1;
const VP_SEIZED = 3;      /* a forbidden item, taken off the belt */
const VP_WRONG = -5;      /* somebody's hairdryer, taken off the belt */
const VP_MISSED = -3;     /* a forbidden item you let through, per item */
const VP_DIRTY_BAG = -10; /* or, on the budget shift, per bag rather than per item */

/* Stolen goods are squared: one is worth 1, three is worth 9, five is 25.
   Nothing else in the game rewards a run like that, which is what makes
   remembering the list the thing worth doing. */
const WANTED_N = 10;      /* on the table in total, both modes */
const WANTED_EACH = 5;    /* on the budget shift, planted five a side */
const FREEZE_MS = 2000;   /* the hold after letting something through */
const VP_LEFT = -1;       /* a tray still on the belt when the shift ends */

/* ---------- three games ----------
   Same deck, same bench, three different questions.

   detector — the original. The arch says whether a bag is dirty before you
     open it, so the decision is how fast you can work a bag you already know
     is bad.
   clock — no lamp, so the only way to know is to look, and a shift clock says
     how much looking you can afford. The decision is when to stop.
   budget — no lamp and no clock, but a fixed number of inspections against a
     queue of your own. The decision is which bags are worth one.

   The two without a lamp also put the misses back where the card game has
   them: you do not find out what you let through until the cases are opened
   at the end. */
const MODES = {
  classic: { key: 'classic', name: 'Detector',          lamp: true,  hold: true,  reveal: true,  shared: true,  clock: 0,      budget: 0,  bounce: true },
  clock:   { key: 'clock',   name: 'Clock shift',       lamp: false, hold: false, reveal: false, shared: true,  clock: 120000, budget: 0,  bounce: true },
  budget:  { key: 'budget',  name: 'Inspection budget', lamp: false, hold: false, reveal: false, shared: false, clock: 0,      budget: 10, bounce: false, planted: true, bagMiss: true },
  rapid:   { key: 'rapid',   name: 'Ten seconds',       lamp: false, hold: false, reveal: false, shared: false, clock: 0,      budget: 0,  bounce: false, planted: true, auto: true, tray: 10000, cut: true }
};
let M = MODES.classic;

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

const SLOTS = [266, 446, 626, 806, 986];
/* the front gets set down on the belt next to the tray, not on the bench —
   the right-hand end of each bench row belongs to the notice board */
function lidPark(lane) { return { x: 760, y: lane.top - 8 }; }

const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bad = it => it.restricted;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

let belt, held, onDeck, phase, opened, cards, started, t0, tick, over, scale = 1;
let deadline = 0, leftovers = 0;
const you = { trays: 0, seized: [], missed: [], checks: 0 };
const opp = { trays: 0, seized: [], missed: [], checks: 0 };
let oppHeld = null, oppDeck = null, oppCards = [], oppBusy = false;
let stowYou = [], stowThem = [];
let wanted = [], wantedThem = [];   /* stolen goods, yours to find and theirs */
let briefed = false;
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

/* ---------- phone ----------
   A touch screen gets the stage and nothing else: the header, belt bar,
   sidebar and prompt come off, and the handful of numbers worth having sit
   over the bench instead. Portrait is refused rather than shrunk, because
   1360x712 in a phone's portrait width is a bench you cannot read. */

let compact = false;

function checkCompact() {
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const small = Math.min(window.innerWidth, window.innerHeight) <= 700;
  compact = coarse && small;
  document.body.classList.toggle('compact', compact);
  document.body.classList.toggle('portrait', compact && window.innerHeight > window.innerWidth);
}

/* ---------- stage fitting ---------- */

/* The point of the two-lane bench is seeing both stations at once, so the
   stage is fitted to the window as well as to the column. Reserve is the
   button row and the prompt underneath it. The stage is deliberately
   landscape: when the window is short, a wide stage scaled to fit the height
   still fills the width, which makes the cards bigger than a squarer one. */
function fit() {
  checkCompact();
  const wrap = $('stagewrap');
  const stage = $('stage');

  if (compact) {
    /* the whole screen, and the controls float on top of it */
    const w = window.innerWidth, h = window.innerHeight;
    scale = Math.min(1, w / SW, h / SH);
    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';
    stage.style.transform = 'translate(' + Math.round((w - SW * scale) / 2) + 'px,' +
      Math.round((h - SH * scale) / 2) + 'px) scale(' + scale + ')';
    return;
  }

  stage.style.transformOrigin = 'top left';
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  const reserve = 96;
  const room = Math.max(300, window.innerHeight - top - reserve);
  scale = Math.min(1, wrap.clientWidth / SW, room / SH);
  stage.style.transform = 'scale(' + scale + ')';
  wrap.style.height = Math.round(SH * scale) + 'px';
  wrap.style.width = Math.round(SW * scale) + 'px';
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 120));

/* getBoundingClientRect already includes the translate, so this works for
   both layouts without knowing which one is on */
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
    if (small.items.length >= 1 && big.items.length <= bagCap()) break;
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
  const dealt = deal();
  if (M.shared) {
    belt = dealt;
    YOU.queue = belt; THEM.queue = belt;
  } else {
    /* a queue each: you work yours, they work theirs, nobody hands anything over */
    const half = Math.ceil(dealt.length / 2);
    YOU.queue = dealt.slice(0, half);
    THEM.queue = dealt.slice(half);
    belt = YOU.queue;
  }
  deadline = M.clock ? 0 : 0; leftovers = 0;
  held = null; onDeck = null; phase = 'idle'; opened = false; cards = [];
  oppHeld = null; oppDeck = null; oppBusy = false;
  you.trays = opp.trays = 0; you.seized = []; you.missed = []; opp.seized = []; opp.missed = [];
  you.checks = opp.checks = 0;
  you.dirtyBags = opp.dirtyBags = 0;
  oppCut = false; searchedTray = false; stopTrayClock();
  started = false; over = false;
  clearCards(); clearOppCards();
  stowYou.forEach(el => el.remove()); stowYou = [];
  stowThem.forEach(el => el.remove()); stowThem = [];
  initLane(YOU); initLane(THEM);
  plantGoods();
  briefed = false;
  $('freeze').hidden = true;
  $('weigh').hidden = true;
  showLens('you', null); showLens('them', null);
  $('lensYou').classList.remove('hot');
  $('bannedFoot').textContent = restrictedCount() + ' of them on the belt today';
  $('result').hidden = true;
  $('stage').classList.remove('running-you', 'running-b');
  lamp(YOU, false); lamp(THEM, false);
  hudShown = 0; $('hudScore').textContent = '0';
  $('modeName').textContent = M.name;
  $('clock').className = 'clock';
  $('clock').textContent = M.clock ? clockText(M.clock) : '0:00';
  fit(); drawQueue(); drawTally(); render();
}

/* ---------- stolen goods ----------
   Ten of them, and they are chosen out of the bags rather than off the
   catalogue, so every one is guaranteed to be on the belt somewhere. One per
   suitcase, ten different suitcases.

   On the budget shift they are planted rather than reported: five in your
   queue by Officer B, five in theirs by you, which is why you get told five
   and not ten. That is the physical game too — the other player picks them
   and tells you what they are.

   You are told once, in words, at the start. No picture, no list to check
   against later. Remembering is the mechanic. */

function plantInto(trays, n, taken) {
  const out = [];
  const pool = shuffle(trays.slice()).filter(t => t.bag.items.some(it => !bad(it)));
  for (let i = 0; i < pool.length && out.length < n; i++) {
    const options = pool[i].bag.items.filter(it => !bad(it) && !taken[it.design]);
    if (!options.length) continue;
    const pickOne = options[Math.floor(Math.random() * options.length)];
    taken[pickOne.design] = true;
    out.push({ file: pickOne.design, name: pickOne.name });
  }
  return out;
}

function plantGoods() {
  const taken = {};
  if (M.planted) {
    wanted = plantInto(YOU.queue, WANTED_EACH, taken);
    wantedThem = plantInto(THEM.queue, WANTED_EACH, taken);
  } else {
    wanted = plantInto(YOU.queue, WANTED_N, taken);
    wantedThem = wanted;
  }
  you.wantSet = {}; wanted.forEach(x => { you.wantSet[x.file] = true; });
  opp.wantSet = {}; wantedThem.forEach(x => { opp.wantSet[x.file] = true; });

  /* Officer B has to remember them too, and does not manage all of them */
  opp.recall = {};
  wantedThem.forEach(x => { if (Math.random() < OPP_RECALL) opp.recall[x.file] = true; });
}

function isWantedFor(p, item) { return !!(p.wantSet && p.wantSet[item.design]); }

function briefText() {
  const lines = wanted.map(x => '<li>' + x.name + '</li>').join('');
  const mine = M.planted
    ? 'Officer B has hidden <strong>' + wanted.length + ' stolen items</strong> in your queue, one to a suitcase, and has told you what they are.'
    : '<strong>' + wanted.length + ' items</strong> have been reported stolen. They are ordinary things, they are somewhere on the belt, and both of you are looking for them.';
  const plantedBack = M.planted && wantedThem.length
    ? '<p class="brief-foot">You have hidden ' + wantedThem.map(x => x.name.toLowerCase()).join(', ') + ' in theirs.</p>'
    : '';
  return '<p class="brief-lede">' + mine + '</p>' +
    '<p class="brief-warn">Read them now. You will not be shown them again.</p>' +
    '<ul class="brief-list">' + lines + '</ul>' +
    '<p class="brief-score">Recovering them scores the <strong>square</strong> of how many you get — ' +
    'one is 1 point, three is 9, five is 25.</p>' + plantedBack;
}

function showBriefing() {
  $('briefBody').innerHTML = briefText();
  $('brief').hidden = false;
}

/* ---------- queue ---------- */

function drawQueue() {
  const q = YOU.queue;
  const b = $('belt');
  b.innerHTML = q.length
    ? q.map((t, i) => '<span class="qtray' + (i === 0 ? ' next' : '') + '" data-bounces="' + t.bounces + '"></span>').join('')
    : '<span class="belt-empty">Belt empty</span>';
  const word = M.shared ? ' on the belt' : ' in your queue';
  $('beltCount').textContent = q.length + (q.length === 1 ? ' tray' : ' trays') + word;
  $('hudBelt').textContent = q.length + word;
}

/* ---------- clock ---------- */

function clockText(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function timeLeft() { return M.clock ? Math.max(0, deadline - Date.now()) : Infinity; }

function beginClock() {
  if (started) return;
  started = true; t0 = Date.now();
  if (M.clock) deadline = t0 + M.clock;
  tick = setInterval(() => {
    if (M.clock) {
      const left = timeLeft();
      const el = $('clock');
      el.textContent = clockText(left);
      el.className = 'clock' + (left <= 10000 ? ' out' : left <= 45000 ? ' low' : '');
      if (left <= 0) { clearInterval(tick); timeUp(); }
    } else {
      const s = Math.floor((Date.now() - t0) / 1000);
      $('clock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
  }, 250);
  startAmbience();
  later(oppTurn, 2600);
}

/* The belt does not clear itself. Anything still on it costs both officers a
   point, which is what stops a losing player downing tools to spoil it. */
function timeUp() {
  if (over) return;
  leftovers = (M.shared ? belt.length : YOU.queue.length + THEM.queue.length) +
              (held ? 1 : 0) + (onDeck ? 1 : 0) + (oppHeld ? 1 : 0) + (oppDeck ? 1 : 0);
  finish();
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

  /* ten objects that got their own noise rather than a group's. All of them
     are permitted, so none of this tells you anything about contraband — but
     a stolen item with a sound of its own is one you can find by ear, which
     is the first help the memory mechanic has had. */
  balaclava:  ['obj_balaclava'],
  bathsalt:   ['obj_bathsalt'],
  camera:     ['obj_camera'],
  card:       ['obj_card'],
  clock:      ['obj_clock'],
  croissants: ['obj_croissants'],
  dispcam:    ['obj_dispcam'],
  spinner:    ['obj_spinner'],
  saffron:    ['obj_saffron'],
  sweets:     ['obj_sweets'],

  beep:     ['beep'],
  conveyor: ['conveyor']
};
const SFX_VOL = 0.65;
const SFX_THEM = 0.2;
const OPP_RECALL = 0.6;   /* how much of the stolen list Officer B actually remembers */
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
  $('hudMute').textContent = on ? 'Muted' : 'Sound';
  $('hudMute').classList.toggle('off', on);
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
  const target = shown(you);
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
  if (isWantedFor(you, card.item)) pop(c.x - 14, c.y - 28, 'Stolen', 'good');
  else if (card.item.restricted) pop(c.x - 14, c.y - 28, '+' + VP_SEIZED, 'good');
  else pop(c.x - 18, c.y - 28, String(VP_WRONG), 'bad');
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
  searchedTray = false;
  if (!YOU.queue.length) { phase = 'idle'; render(); checkEnd(); return; }
  held = YOU.queue.shift();
  opened = false;
  clearCards();
  lamp(YOU, false);
  YOU.work = takeTray(YOU, held.front);
  phase = 'rolling';
  drawQueue(); render();
  roll(YOU, YOU.work, X.parkIn, 1200, () => {
    if (!over && phase === 'rolling') { phase = 'ready'; render(); later(autoRun, 350); }
  });
}

/* the on-deck tray, rolling into the spot the scanned one just left */
function queueNext() {
  if (over || onDeck || !YOU.queue.length) return;
  onDeck = YOU.queue.shift();
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
  opened = false; searchedTray = false;
  clearCards();
  lamp(YOU, false);
  YOU.work = YOU.deck; YOU.deck = null;
  YOU.work.el.classList.remove('waiting');
  phase = 'ready';
  drawQueue(); render();
  later(autoRun, 350);
}

/* Three coarse bands. Coarse on purpose: it should narrow the guess, not make
   it for you. A heavy bag is likelier to be hiding something and costs more to
   work, which is the whole trade in one number you are allowed to know. */
function weighBand(n) {
  const cap = bagCap();
  if (n <= cap - 3) return ['Light', 1];
  if (n <= cap - 2) return ['Medium', 2];
  return ['Heavy', 3];
}

function showWeight(on) {
  const box = $('weigh');
  if (!on || M.lamp || !held) { box.hidden = true; return; }
  const b = weighBand(held.bag.items.length);
  $('weighWord').textContent = b[0];
  $('weighBars').innerHTML = '<i class="' + (b[1] > 0 ? 'on' : '') + '"></i>' +
    '<i class="' + (b[1] > 1 ? 'on' : '') + '"></i>' +
    '<i class="' + (b[1] > 2 ? 'on' : '') + '"></i>';
  box.hidden = false;
}

function goPressed() {
  if (!started) { beginClock(); beltNoise(YOU); feedLane(); return; }
  if (phase === 'ready') { beltNoise(YOU); scan(); }
}

/* On the ten-second shift nobody presses Go twice: the belt runs itself and
   the only decisions left are Check, seize and Pass. */
function autoRun() {
  if (!M.auto || over) return;
  if (phase === 'ready') { beltNoise(YOU); scan(); }
}

function scan() {
  phase = 'scanning'; render();
  move(YOU, YOU.work, X.parkOut, 1250, () => {
    if (over) return;
    phase = 'scanned';
    showWeight(true);
    startTrayClock();
    render();
  });
  later(queueNext, 420);
  if (M.lamp) later(() => { if (!over && held) lamp(YOU, held.bag.items.some(bad), true); }, 700);
}

/* Check — the belt stops and the suitcase becomes yours to open */
function checkPressed() {
  showWeight(false);
  if (phase !== 'scanned') return;
  if (M.budget && you.checks >= M.budget) return;
  if (M.budget) { you.checks++; drawTally(); }
  phase = 'searching';
  searchedTray = true;
  YOU.work.box.hidden = true;
  spawnCards();
  render();
}

/* Pass — this tray is done with, whatever is still in it */
function passPressed() {
  showWeight(false);
  if (phase === 'scanned') { fileTray(); return; }
  if (phase === 'searching' && !opened) fileTray();
}

function bounce() {
  showWeight(false);
  held.bounces++;
  YOU.queue.push(held);
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

function fileTray(expired) {
  const early = M.cut && !expired && searchedTray && trayEnd && Date.now() < trayEnd;
  stopTrayClock();
  you.trays++;
  const slipped = held.bag.items.filter(bad);
  slipped.forEach(it => you.missed.push(it));
  if (slipped.length) you.dirtyBags++;
  const c = trayCentre(YOU);
  if (slipped.length && M.reveal) pop(c.x - 22, c.y - 96, String(VP_MISSED * slipped.length), 'bad');
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
  if (early) cutOpp();
  later(() => {
    if (over) return;
    if (slipped.length && M.hold) freeze(slipped.length); else promote();
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

/* ---------- ten seconds ----------
   A clock on the tray rather than on the shift. It starts the moment the bag
   is in front of you and it does not stop while you search: at zero the tray
   goes, finished or not.

   The rule that makes it a game rather than a stopwatch is the cut. Passing
   early does not only bank your tray, it ends the other officer's tray too —
   so being quick is not just worth points to you, it takes the time off them.
   Both sides run their own ten seconds and whoever finishes first stops the
   other one where they stand. */

let trayEnd = 0, trayTick = null, oppCut = false, searchedTray = false;

/* Cutting Officer B off mid-bag is not as simple as setting a flag. Their turn
   is a chain of a dozen delayed steps, and a flag that gets cleared when the
   next bag starts lets every stale step from the cut bag fire into it — which
   double-files a tray, empties their lane and leaves them standing there doing
   nothing for the rest of the shift. So each bag gets a number, every step of
   theirs remembers which bag it was scheduled for, and anything belonging to
   an older one is dropped on the floor. */
let oppGen = 0;
function oppLater(fn, ms) {
  const g = oppGen;
  return later(() => { if (over || g !== oppGen) return; fn(); }, ms);
}
function oppMove(t, x, ms, then) {
  const g = oppGen;
  move(THEM, t, x, ms, () => { if (over || g !== oppGen) return; if (then) then(); });
}
function oppRoll(t, x, ms, then) {
  const g = oppGen;
  roll(THEM, t, x, ms, () => { if (over || g !== oppGen) return; if (then) then(); });
}

function stopTrayClock() {
  clearInterval(trayTick); trayTick = null; trayEnd = 0;
  $('trayTime').hidden = true;
  $('trayTime').classList.remove('urgent');
}

function startTrayClock() {
  if (!M.tray) return;
  clearInterval(trayTick);
  trayEnd = Date.now() + M.tray;
  const box = $('trayTime');
  box.hidden = false;
  let warned = false;
  trayTick = setInterval(() => {
    if (over || !M.tray) { stopTrayClock(); return; }
    const left = Math.max(0, trayEnd - Date.now());
    box.textContent = (left / 1000).toFixed(1);
    box.classList.toggle('urgent', left <= 3000);
    if (left <= 3000 && !warned) { warned = true; play('beep', 0.35); }
    if (left <= 0) {
      stopTrayClock();
      if (phase === 'scanned' || phase === 'searching') fileTray(true);
    }
  }, 80);
  timers.push(trayTick);
}

/* You passed with time to spare, so Officer B loses the rest of theirs. */
function cutOpp() {
  if (!M.cut || over || !oppBusy || !oppHeld || !oppHeld.bag || !THEM.work) return;
  oppCut = true;
  oppGen++;               /* everything still pending for this bag is now void */
  oppSay('Cut short');
  oppFile(oppHeld.bag.items.filter(bad));
}

/* And the same the other way, which is the half you feel. */
function cutYou() {
  if (!M.cut || over) return;
  if (phase !== 'scanned' && phase !== 'searching') return;
  stopTrayClock();
  const box = $('trayTime');
  box.hidden = false; box.textContent = 'CUT'; box.classList.add('urgent');
  later(() => { box.hidden = true; box.classList.remove('urgent'); }, 900);
  fileTray(true);
}

/* ---------- controls + copy ---------- */

function render() {
  const p = $('prompt');
  later(() => { $('hudLine').textContent = p.textContent; }, 0);
  const go = $('btnGo'), pass = $('btnPass'), check = $('btnCheck'), back = $('btnBounce');
  go.disabled = pass.disabled = check.disabled = true;
  back.hidden = true;
  check.classList.toggle('active', phase === 'searching');

  if (over) { p.textContent = 'Shift over.'; return; }

  if (phase === 'idle') {
    if (!started) {
      go.disabled = false;
      p.innerHTML = M.shared
        ? 'Officer B is across the bench, working the same belt. <strong>Go</strong> starts it and pushes the first tray down to you.'
        : 'Officer B has a queue of their own and so do you. <strong>Go</strong> brings your first tray down.';
    } else {
      p.textContent = 'Belt empty. Waiting on the other lane.';
    }
    return;
  }
  if (phase === 'rolling') { p.textContent = 'Tray coming down the belt.'; return; }

  if (phase === 'ready') {
    /* the ten-second belt runs itself, so Go is only ever pressed once */
    go.disabled = !!M.auto;
    p.innerHTML = 'A closed suitcase in a tray. No idea what is under the lid until it goes through. <strong>Go</strong> sends it into the detector.';
    return;
  }
  if (phase === 'scanning') { p.textContent = 'Scanning.'; return; }

  if (phase === 'scanned') {
    if (!held) return;
    pass.disabled = false;
    const spent = M.budget && you.checks >= M.budget;
    check.disabled = spent;
    check.textContent = M.budget ? 'Check (' + (M.budget - you.checks) + ')' : 'Check';
    back.hidden = !M.bounce || held.bounces >= BOUNCE_CAP;
    if (M.lamp) {
      const dirty = held.bag.items.some(bad);
      p.innerHTML = dirty
        ? 'Red light. Something in there is restricted, and the detector will not say how many. <strong>Check</strong> stops the belt and opens the case. <strong>Pass</strong> sends it through as it is.'
        : 'No light. Nothing restricted in there. <strong>Pass</strong> keeps the tray and moves the belt on.';
    } else if (spent) {
      p.innerHTML = 'No inspections left. Everything from here goes through on the strength of how it looks. <strong>Pass</strong>.';
    } else if (M.budget) {
      p.innerHTML = 'No machine, no lamp — only the weight in your hands. <strong>Check</strong> spends one of your ' + M.budget +
        ' inspections — ' + (M.budget - you.checks) + ' left, ' + (YOU.queue.length + 1) +
        ' trays including this one. <strong>Pass</strong> costs nothing and tells you nothing.';
    } else {
      p.innerHTML = 'No machine, no lamp. The only way to know is to look, and looking costs you the clock. <strong>Check</strong> opens it, <strong>Pass</strong> sends it on.';
    }
    return;
  }

  if (phase === 'searching') {
    if (!opened) {
      pass.disabled = false;
      p.innerHTML = M.reveal
        ? 'The case is shut and the bag is packed. <strong>Pass</strong> files the tray — there is no second scan, so whatever is still in there goes with it.'
        : 'The case is shut and the bag is packed. <strong>Pass</strong> files the tray. You will find out what you left in it when the cases are opened at the end.';
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

function wakeOpp() { if (!over && started && !oppBusy && THEM.queue.length) later(oppTurn, 900); }
function oppSay(t) { $('oppDoing').textContent = t; }

/* 0 = comfortable, 1 = being buried by the other lane */
function oppRush() { return clamp((you.trays - opp.trays) / 6, 0, 1); }

function oppTurn() {
  if (over) return;
  oppCut = false;
  oppGen++;
  const fromDeck = !!oppDeck;
  if (oppDeck) { oppHeld = oppDeck; oppDeck = null; }
  else if (THEM.queue.length) { oppHeld = THEM.queue.shift(); }
  else { oppBusy = false; oppSay('Nothing on the belt'); checkEnd(); return; }

  oppBusy = true;
  clearOppCards();
  lamp(THEM, false);
  drawQueue();
  oppSay(oppRush() > 0.55 ? 'Hurrying a tray in' : 'Taking the next tray');

  if (fromDeck) {
    THEM.work = THEM.deck; THEM.deck = null;
    THEM.work.el.classList.remove('waiting');
    oppLater(oppScan, Math.round(rnd(450, 900)));
  } else {
    THEM.work = takeTray(THEM, oppHeld.front);
    oppRoll(THEM.work, X.parkIn, 1200, () => oppLater(oppScan, Math.round(rnd(250, 700))));
  }
}

function oppScan() {
  if (over || !oppHeld || !THEM.work) return;
  oppSay('Sending it through');
  beltNoise(THEM);
  oppMove(THEM.work, X.parkOut, 1250, oppAfterScan);
  oppLater(oppQueueNext, 420);
  if (M.lamp) oppLater(() => { if (oppHeld) lamp(THEM, oppHeld.bag.items.some(bad), true); }, 700);
}

function oppQueueNext() {
  if (over || oppDeck || !THEM.queue.length) return;
  oppDeck = THEM.queue.shift();
  THEM.deck = takeTray(THEM, oppDeck.front);
  THEM.deck.el.classList.add('waiting');
  drawQueue();
  roll(THEM, THEM.deck, X.parkIn, 1200);
}

/* With no lamp B is in the same position you are: all they have to go on is
   how fat the bag looks, and whatever the mode lets them spend. */
function oppWantsSearch(size) {
  if (M.lamp) return true;                       /* the lamp already told them */
  if (M.budget) {
    const spare = M.budget - opp.checks;
    if (spare <= 0) return false;
    if (spare >= THEM.queue.length + 1) return true;   /* can afford the lot */
    return size >= 4 ? Math.random() < 0.85 : Math.random() < 0.3;
  }
  if (M.clock) {
    const left = timeLeft();
    if (left < 25000) return size >= 5 && Math.random() < 0.4;
    if (left < 70000) return Math.random() < (size >= 4 ? 0.7 : 0.35);
    return Math.random() < (size >= 3 ? 0.92 : 0.65);
  }
  return true;
}

function oppAfterScan() {
  if (over || !oppHeld) return;
  const contraband = oppHeld.bag.items.filter(bad);
  const size = oppHeld.bag.items.length;
  const rush = oppRush();

  if (M.lamp && !contraband.length) {
    oppSay('No light — tray kept');
    oppLater(() => oppFile([]), Math.round(rnd(600, 1100)));
    return;
  }

  if (!oppWantsSearch(size)) {
    oppSay(size >= 5 ? 'Waved a heavy one through' : 'Waved a bag through');
    oppLater(() => oppFile(contraband), Math.round(rnd(500, 950)));
    return;
  }
  if (M.budget) opp.checks++;

  /* bouncing costs a tray, so an officer who is behind stops doing it */
  const bounceOdds = M.bounce ? 0.4 * (1 - rush) * (size >= 5 ? 1 : 0.3) : 0;
  if (oppHeld.bounces < BOUNCE_CAP && Math.random() < bounceOdds) {
    oppSay('Pushed a tray back');
    oppHeld.bounces++;
    THEM.queue.push(oppHeld);
    drawQueue();
    const t = THEM.work; THEM.work = null;
    oppMove(t, X.exit, 900, () => {
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
  if (over || !oppHeld) return;
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
  oppLater(() => { const lp = lidPark(THEM); settle(lidEl, lp.x, lp.y, 5, Math.round(rnd(280, 420))); }, t);

  const items = oppCards.filter(cd => cd.kind === 'item');
  items.forEach((cd, i) => {
    /* an uneven hand: mostly quick, occasionally a long look at one card */
    let gap = rnd(120, 300);
    if (Math.random() < 0.22) gap += rnd(250, 650) * (1 - rush);
    t += Math.round(gap * pace);
    oppLater(() => {
      settle(cd.el, SLOTS[i % SLOTS.length], THEM.bench, rnd(-5, 5), Math.round(rnd(240, 420)));
      playItem(cd.item, SFX_THEM);
      flashLens(cd.item);
    }, t);
  });

  const dwell = Math.round(rnd(400, 900) * pace + 180 * size * pace);
  oppLater(() => oppSearch(contraband, size, rush), t + dwell);
}

/* Two sweeps if they have time, one if they are panicking. A thin bag gets
   picked clean either way; a fat one is where a hurried officer loses things. */
function oppSearch(contraband, size, rush) {
  if (over || !oppHeld) return;
  const perPass = clamp(0.92 - 0.03 * (size - 1) - 0.13 * rush, 0.55, 0.96);
  const passes = rush < 0.6 ? 2 : 1;
  const odds = 1 - Math.pow(1 - perPass, passes);

  const found = [], missed = [];
  contraband.forEach(it => (Math.random() < odds ? found : missed).push(it));
  /* B is looking at the same notice board you are */
  oppCards.forEach(cd => {
    if (cd.item && opp.recall[cd.item.design] && Math.random() < odds) found.push(cd.item);
  });

  let t = 0;
  found.forEach(it => {
    t += Math.round(rnd(280, 620));
    oppLater(() => {
      const cd = oppCards.find(x => x.item && x.item.uid === it.uid);
      if (!cd) return;
      oppCards = oppCards.filter(x => x !== cd);
      opp.seized.push(it);
      oppHeld.bag.items = oppHeld.bag.items.filter(x => x.uid !== it.uid);
      playItem(it, SFX_THEM);
      stow(cd.el, SEIZE_THEM, stowThem);
      pop(SEIZE_THEM.x + SEIZE_THEM.w - 60, SEIZE_THEM.y - 26,
          isWantedFor(opp, it) ? 'Stolen' : '+' + VP_SEIZED, 'theirs');
      drawTally();
    }, t);
  });

  oppLater(() => oppClose(missed), t + Math.round(rnd(350, 700)));
}

/* everything left goes back in one at a time, not all at once */
function oppClose(missed) {
  if (over || !oppHeld) return;
  const c = trayCentre(THEM);
  const items = oppCards.filter(cd => cd.kind === 'item');
  let t = 0;
  items.forEach(cd => {
    t += Math.round(rnd(110, 260));
    const it = cd.item;
    oppLater(() => {
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
  oppLater(() => oppFile(missed), t + Math.round(rnd(420, 780)));
}

function oppFile(missed) {
  if (over) return;
  const theyWereQuick = M.cut && !oppCut;
  opp.trays++;
  missed.forEach(it => opp.missed.push(it));
  if (missed.length) opp.dirtyBags++;
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
  if (theyWereQuick) cutYou();
  later(oppTurn, Math.round(rnd(500, 1100)));
}

/* ---------- score ---------- */

function wantedTaken(p) { return p.seized.filter(it => isWantedFor(p, it)).length; }
function wrongGrabs(p) { return p.seized.filter(it => !it.restricted && !isWantedFor(p, it)).length; }
/* squared, which is why four is worth more than twice two */
function wantedScore(p) { const k = wantedTaken(p); return k * k; }
function missPenalty(p) { return M.bagMiss ? p.dirtyBags * VP_DIRTY_BAG : p.missed.length * VP_MISSED; }

/* The final figure. Everything counts. */
function scoreOf(p) {
  return p.trays * VP_TRAY
    + p.seized.filter(bad).length * VP_SEIZED
    + wantedScore(p)
    + wrongGrabs(p) * VP_WRONG
    + missPenalty(p)
    + leftovers * VP_LEFT;
}

/* What the scoreboard is allowed to show mid-shift. Without a detector you do
   not know what went past you, so the running total does not either. */
function shown(p) {
  return M.reveal ? scoreOf(p)
    : p.trays * VP_TRAY + p.seized.filter(bad).length * VP_SEIZED + wantedScore(p) + wrongGrabs(p) * VP_WRONG;
}

function drawTally() {
  $('youTrays').textContent = you.trays;
  $('youSeized').textContent = you.seized.filter(bad).length;
  $('youScore').textContent = shown(you);
  $('oppTrays').textContent = opp.trays;
  $('oppSeized').textContent = opp.seized.filter(bad).length;
  $('oppScore').textContent = shown(opp);
  $('seizeN').textContent = you.seized.length;
  $('seizeNB').textContent = opp.seized.length;
  $('hudYou').textContent = shown(you);
  $('hudOpp').textContent = shown(opp);
  const bud = $('budget');
  bud.hidden = !M.budget;
  if (M.budget) bud.textContent = (M.budget - you.checks) + ' checks left';
  drawHud();
}

function checkEnd() {
  if (over) return;
  if (!YOU.queue.length && !THEM.queue.length && !held && !onDeck && !oppHeld && !oppDeck && !oppBusy) finish();
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
  const falseGrabs = wrongGrabs(you);

  const sheet = (who, p) => {
    const s = p.seized.filter(bad).length;
    return '<div class="sheet"><h3>' + who + '</h3><table>' +
      '<tr><td>Trays kept — ' + p.trays + ' × ' + VP_TRAY + '</td><td>' + (p.trays * VP_TRAY) + '</td></tr>' +
      '<tr><td>Forbidden seized — ' + s + ' × ' + VP_SEIZED + '</td><td>' + (s * VP_SEIZED) + '</td></tr>' +
      '<tr><td>Stolen goods — ' + wantedTaken(p) + ' recovered, squared</td><td>' + wantedScore(p) + '</td></tr>' +
      (wrongGrabs(p) ? '<tr class="neg"><td>Taken off somebody for nothing — ' + wrongGrabs(p) + ' × ' + VP_WRONG + '</td><td>' + (wrongGrabs(p) * VP_WRONG) + '</td></tr>' : '') +
      '<tr class="neg"><td>' + (M.bagMiss
        ? 'Bags through with something in — ' + p.dirtyBags + ' × ' + VP_DIRTY_BAG
        : 'Let through — ' + p.missed.length + ' × ' + VP_MISSED) +
        '</td><td>' + missPenalty(p) + '</td></tr>' +
      (leftovers ? '<tr class="neg"><td>Belt not cleared — ' + leftovers + ' × ' + VP_LEFT + '</td><td>' + (leftovers * VP_LEFT) + '</td></tr>' : '') +
      (M.budget ? '<tr><td>Inspections used</td><td>' + p.checks + ' / ' + M.budget + '</td></tr>' : '') +
      '<tr class="total"><td>Total</td><td>' + scoreOf(p) + '</td></tr></table>' +
      (p.missed.length ? '<p class="missed">Walked straight through: ' + p.missed.map(i => i.name.toLowerCase()).join(', ') + '</p>' : '') +
      '</div>';
  };

  $('result').innerHTML =
    '<div class="result-inner"><h2>' + verdict + '</h2>' +
    '<p class="verdict">' + M.name + '. ' +
    (leftovers ? leftovers + ' tray' + (leftovers === 1 ? '' : 's') + ' never got looked at, which costs you both. ' : '') +
    'You were looking for: ' +
    wanted.map(x => (you.seized.some(it => it.design === x.file)
      ? '<b>' + x.name.toLowerCase() + '</b>' : x.name.toLowerCase())).join(', ') +
    ' — bold is what you got. ' +
    (falseGrabs ? 'You also confiscated ' + falseGrabs + ' thing' + (falseGrabs === 1 ? '' : 's') +
      ' nobody was smuggling, which scores nothing and cost you time.' : '') + '</p>' +
    '<div class="sheets">' + sheet('You', you) + sheet('Officer B', opp) + '</div>' +
    '<div class="controls again"><button class="go" id="again">Run another shift</button>' +
    '<button class="check" id="menuBtn">Change the rules</button></div></div>';
  $('result').hidden = false;
  $('again').onclick = () => { oppSay('Walking to the lane'); start(); };
  $('menuBtn').onclick = () => { $('result').hidden = true; showMenu(); };
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- wiring ---------- */

function showMenu() {
  clearTimers(); clearInterval(tick);
  over = true;                       /* nothing may run behind the menu */
  if (ambience) ambience.pause();
  $('menu').hidden = false;
}

function startMode(key) {
  M = MODES[key] || MODES.classic;
  $('menu').hidden = true;
  start();
  showBriefing();
}

loadSfx();
$('menu').hidden = false;
[].forEach.call(document.querySelectorAll('.mode'), b => {
  b.onclick = () => startMode(b.getAttribute('data-mode'));
});
$('btnGo').onclick = goPressed;
$('btnPass').onclick = passPressed;
$('btnCheck').onclick = checkPressed;
$('btnBounce').onclick = () => { if (phase === 'scanned') bounce(); };
$('mute').onclick = () => setMuted(!muted);
$('hudMute').onclick = () => setMuted(!muted);
$('briefGo').onclick = () => { $('brief').hidden = true; briefed = true; render(); };
setMuted(false);
start();
showMenu();
})();
