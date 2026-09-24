(function () {
'use strict';

const BOUNCE_CAP = 2;
const VP_TRAY = 0;      /* keeping a tray is the job, not a score */
const VP_SEIZED = 1;    /* one a piece, and your own line counts two */      /* a forbidden item, taken off the belt */
const VP_WRONG = 0;     /* the penalty is a lost bag, not a number */      /* somebody's hairdryer, taken off the belt */
const VP_MISSED = 0;    /* letting one through costs nothing */     /* a forbidden item you let through, per item */
const VP_DIRTY_BAG = -10; /* or, on the budget shift, per bag rather than per item */

/* Stolen goods are squared: one is worth 1, three is worth 9, five is 25.
   Nothing else in the game rewards a run like that, which is what makes
   remembering the list the thing worth doing. */
const FREEZE_MS = 2000;   /* the hold after letting something through */
const VP_LEFT = -1;       /* a tray still on the belt when the shift ends */

/* ---------- the game ----------
   Twelve trays each, ten seconds a bag, no detector. The belt runs itself: at
   zero the suitcase goes, finished or not.

   Before the shift you each hide five stolen items in the other's queue and
   tell them what they are, once, in words. Recovering them is squared, so
   three is worth nine.

   And the cut: finish searching and pass with time left and the other officer
   has to pass too, wherever they have got to. Passing a bag you never opened
   does not count as finishing it and cuts nobody.

   The detector, the shift clock and the inspection budget were all tried and
   are all gone. This is what is left. */
const GAMES = {
  /* The standing shift. Two amendments posted before the belt starts and no
     more after that. */
  standard: { key: 'standard', name: 'Standard shift', tray: 10000, cut: true,
              reveal: false, wide: false, banEvery: 0,
              perSide: 12, permitted: 75, restricted: 15, cap: 5 },

  /* The policy shift. A broader deck built so the sign categories overlap,
     and every fifth thing you seize correctly buys you a sign of your own:
     the belt stops, you post one, and it applies to both of you for the rest
     of the shift. Officer B earns them the same way. The wall fills up and
     what counts as contraband keeps moving under you. */
  policy:   { key: 'policy',   name: 'Policy shift',   tray: 10000, cut: true,
              reveal: false, wide: true,  banAfter: 3, banCount: 2, useBoard: true,
              perSide: 7, bags: 7, cap: 9,
              fixedBag: 9,       /* nine in every bag; the mix is the shuffle's business */
              permitted: 42, restricted: 21,
              noPass: true,      /* no waving anything through; the clock decides */
              lockstep: true,    /* both benches take a bag together and file together */
              autoOpen: true,    /* and no button to open it either */
              skipOnWrong: true, /* take something legal and you sit the next one out */
              circulate: true,   /* bags go round and round rather than away */
              recircCap: 400 }   /* a backstop; the seizure target normally lands first */
};
/* The lean shift. Forty-one two-sided punch-out pieces — knives, lighters,
   screwdrivers, hats, t-shirts, trousers, dresses, tote bags, bottles —
   twelve pouches of eight, and a board of eighteen signs laid out six by
   three. The wall never turns by itself: only knives, lighters and
   screwdrivers move it. Everything else about the policy shift carries over:
   one clock for both benches, bags that go round, no passing, and a lost bag
   for taking something legal. */
GAMES.lean = {
  key: 'lean', name: 'Lean shift', tray: 10000, cut: true, reveal: false,
  lean: true, wide: true, useBoard: true, banAfter: 3, banCount: 2,
  perSide: 6, bags: 12, cap: 8, fixedBag: 8, permitted: 85, restricted: 11,
  noPass: true, autoOpen: true, skipOnWrong: true, lockstep: true,
  circulate: true, recircCap: 400
};

let M = GAMES.standard;

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

/* eight bench positions, because the policy shift deals bags of up to eight.
   The standard shift caps at five and simply never uses the last three. */
const SLOTS = [266, 364, 462, 560, 658, 756, 854, 952, 1050];
/* the front gets set down on the belt next to the tray, not on the bench —
   the right-hand end of each bench row belongs to the notice board */
function lidPark(lane) { return { x: 760, y: lane.top - 8 }; }

const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* What counts as contraband is not fixed. Two signs go up every shift and they
   beat the standing list both ways: a banned category is contraband today even
   though it is a t-shirt, and an allowed one is legal today even though it is a
   gun. Everything in the game that asks "is this bad" comes through here, which
   is why the opponent, the scoring and the stolen-goods picker all obey the
   signs without being told about them separately. */
let signsToday = [], banToday = {}, okToday = {};

/* ---------- the board, policy shift only ----------
   Thirty-four categories, each showing a green face or a red one. At the start
   only the genuinely dangerous ones are red; everything else a passenger might
   own is allowed. Every third bag, two more green ones go over and stay over.

   Red beats green, because a card sits in several categories at once — blue
   jeans are contraband the moment either No blue or No trousers turns. Anything
   no category covers falls back to the standing list, which is why the hammer
   and the pliers never stop being contraband: they have no sign of their own.

   The standard shift ignores all of this and keeps its two posted signs. */
let board = [], boardBan = {}, boardHas = {}, tagCache = null;

function tagIndex() { return tagCache || (tagCache = designTags()); }

function recomputeBoard() {
  boardBan = {}; boardHas = {};
  const idx = tagIndex();
  board.forEach(row => {
    Object.keys(idx).forEach(design => {
      if (idx[design].indexOf(row.cat.tag) < 0) return;
      boardHas[design] = true;
      if (row.banned) boardBan[design] = true;
    });
  });
}

function setUpBoard() {
  board = categoryList().map(cat => ({ cat: cat, banned: !!cat.start }));
  recomputeBoard();
}

/* One category each, secret, drawn from the ones that start red. It is still
   contraband and still has to come out of the bag — but yours counts two
   towards the target, and the other officer is never told what it is. */
function dealBonus() {
  const two = pick(categoryList().filter(c => c.start), 2);
  you.bonus = two[0] || null;
  opp.bonus = two[1] || two[0] || null;
}

function isBonus(p, it) {
  return !!(p.bonus && (tagIndex()[it.design] || []).indexOf(p.bonus.tag) >= 0);
}

function turnSigns(n) {
  const green = board.filter(r => !r.banned && !r.stabbed);
  if (!green.length) return [];
  const picked = pick(green, Math.min(n, green.length));
  picked.forEach(r => { r.banned = true; });
  recomputeBoard();
  drawSigns();
  return picked.map(r => r.cat.label);
}
let paused = false, recirc = 0, seizeGoal = 0;

/* Contraband is no longer the same thing for both officers. Each of them is
   carrying a permit nobody else has seen, and for the holder that category is
   simply legal — which is what makes putting one back in a bag corruption
   rather than a mistake. */
function badFor(p, it) {
  if (M.useBoard) {
    if (boardBan[it.design]) return true;
    if (boardHas[it.design]) return false;
    return it.restricted;
  }
  if (banToday[it.design]) return true;
  if (okToday[it.design]) return false;
  return it.restricted;
}

/* the unqualified one is the bench's view: yours */
function bad(it) { return badFor(you, it); }

/* a sign posted mid-shift folds into the same two maps */
function foldSign(sg) {
  const into = sg.kind === 'ban' ? banToday : okToday;
  sg.designs.forEach(d => { into[d] = true; });
}

function applySigns() {
  signsToday = pickSigns(2);
  banToday = {}; okToday = {};
  signsToday.forEach(sg => {
    const into = sg.kind === 'ban' ? banToday : okToday;
    sg.designs.forEach(d => { into[d] = true; });
  });
}

function drawSigns() {
  if (M.useBoard) {
    const red = board.filter(r => r.banned).length;
    $('signRow').className = 'sign-row sign-board' + (M.lean ? ' sign-grid' : '');
    $('signRow').style.gridTemplateColumns = M.lean ? 'repeat(' + LEAN_COLS + ', minmax(0, 1fr))' : '';
    $('signRow').innerHTML = board.map(r =>
      '<span class="sign sign-' + (r.banned ? 'ban' : 'ok') + (r.stabbed ? ' stabbed' : '') + (r.lit ? ' lit' : '') +
      '" title="' + r.cat.label + '">' +
      '<img src="assets/ui/signs/' + (r.banned ? r.cat.banned : r.cat.allowed) + '" alt="' + r.cat.label + '"></span>'
    ).join('');
    $('signCount').textContent = red + ' of ' + board.length + (M.lean ? ' red' : ' turned');
    return;
  }
  const n = signsToday.length;
  /* the wall is a fixed size, so the signs shrink as they multiply rather
     than spilling off the bottom of it */
  const size = n <= 2 ? 'two' : n <= 6 ? 'six' : n <= 12 ? 'twelve' : 'many';
  $('signRow').className = 'sign-row sign-' + size;
  $('signRow').innerHTML = signsToday.map(sg =>
    '<span class="sign sign-' + sg.kind + '" title="' + sg.label + '">' +
    '<img src="assets/ui/signs/' + sg.file + '" alt="' + sg.label + '">' +
    (n <= 2 ? '<b>' + sg.label + '</b>' : '') + '</span>').join('');
  $('signCount').textContent = n + (n === 1 ? ' sign up' : ' signs up');
}

/* ---------- the day's amendments, updated ----------
   Nobody chooses these. Every third bag you finish, two more ordinary
   categories are struck off the permitted list at random and go up on the
   wall. It is policy arriving from somewhere above the bench, which is both
   funnier and less work than picking, and it means neither officer can aim
   anything at the other. */

function postSign(sg) {
  if (!sg) return;
  signsToday.push(sg);
  foldSign(sg);
}

function newBans(n) {
  const up = {};
  signsToday.forEach(sg => { up[sg.file] = true; });
  const left = signPool().filter(sg => sg.kind === 'ban' && !up[sg.file]);
  return pick(left, Math.min(n, left.length));
}

/* A correct seizure is the only thing that counts toward the target. */
function creditSeizure(p, it) {
  const worth = (M.useBoard && it && isBonus(p, it)) ? 2 : 1;
  p.hits = (p.hits || 0) + worth;
  if (worth === 2) p.doubles = (p.doubles || 0) + 1;
  if (seizeGoal) { drawTally(); checkEnd(); }
  return worth;
}

/* Three bags of grace, then two more categories go over every single bag. With
   twenty-seven green at the start the board is nearly all red inside twenty
   rounds, and the shift is over long before that. */
function amendmentDue() {
  if (!M.useBoard) return;
  if (roundNo <= (M.banAfter || 0)) return;
  const turned = turnSigns(M.banCount || 2);
  if (turned.length) toast('New policy: no ' + turned.join(', no ').toLowerCase(), true);
}

function toast(text, mine) {
  const el = document.createElement('div');
  el.className = 'toast' + (mine ? ' mine' : '');
  el.textContent = text;
  $('stage').appendChild(el);
  later(() => el.remove(), 2600);
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

let belt, held, onDeck, phase, opened, cards, started, t0, tick, over, scale = 1;
let deadline = 0, leftovers = 0;
const you = { trays: 0, seized: [], missed: [], checks: 0 };
const opp = { trays: 0, seized: [], missed: [], checks: 0 };
let oppHeld = null, oppDeck = null, oppCards = [], oppBusy = false;
let stowYou = [], stowThem = [];
let briefed = false;
let hudShown = 0, hudAnim = null;

/* Best of one or best of three. A round is a shift; the match goes to whoever
   takes two of them, so a three can finish in two. A drawn round counts for
   nobody, and if a match ends level on rounds the points across all of them
   break it. */
const series = { best: 1, round: 0, youWins: 0, oppWins: 0, youPts: 0, oppPts: 0, done: false };
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
  lane.donePile = [];
  lane.moving = 0;
}

function takeTray(lane, front) {
  const t = lane.free.pop() || lane.pool[0];
  t.box.innerHTML = suitcaseFace(front);
  t.el.className = 'tray';
  t.el.style.transition = 'none';
  t.el.style.left = X.offstage + 'px';
  t.el.style.top = (lane.mine ? YOU.top : THEM.top) + 'px';
  t.el.hidden = true;
  return t;
}

function freeTray(lane, t) {
  if (!t) return;
  t.el.hidden = true;
  t.el.className = 'tray';
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
  /* The policy shift does not shuffle bags out of one stream — every suitcase
     is built to the same recipe, six ordinary things and two off the standing
     forbidden list, so weight tells you nothing and there is no such thing as
     an easy bag. */
  /* Every suitcase holds the same number of things, so weight tells you
     nothing — but the mix inside is dealt, not built. Twenty-one forbidden
     items go into the shuffle with the forty-two ordinary ones and land where
     they land. Three a bag is only the average: some come out nearly clean and
     some are half contraband, and you cannot know which until it is open. */
  if (M.fixedBag) {
    const deck = shuffle(buildItemDeck());
    const fronts = shuffle(buildSuitcaseDeck());
    const out = [];
    for (let i = 0; i < trayCount(); i++) {
      out.push({ id: i, bag: { items: deck.splice(0, M.fixedBag) }, bounces: 0, front: fronts[i] });
    }
    return shuffle(out);
  }

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
  clearInterval(beltWatch); beltWatch = null;
  const dealt = deal();
  if (false) {
    belt = dealt;
    YOU.queue = belt; THEM.queue = belt;
  } else {
    /* a queue each: you work yours, they work theirs, nobody hands anything over */
    const half = Math.ceil(dealt.length / 2);
    YOU.queue = dealt.slice(0, half);
    THEM.queue = dealt.slice(half);
    belt = YOU.queue;
  }
  leftovers = 0;
  held = null; onDeck = null; phase = 'idle'; opened = false; cards = [];
  oppHeld = null; oppDeck = null; oppBusy = false;
  you.trays = opp.trays = 0; you.seized = []; you.missed = []; opp.seized = []; opp.missed = [];
  you.checks = opp.checks = 0;
  you.dirtyBags = opp.dirtyBags = 0;
  oppCut = false; searchedTray = false; stopTrayClock();
  recirc = 0; you.emptied = 0; opp.emptied = 0; you.hits = 0; opp.hits = 0;
  paused = false; you.run = 0; opp.run = 0; you.doubles = 0; opp.doubles = 0;
  you.skipped = 0; opp.skipped = 0;
  roundNo = 0; youDone = oppDone = false; roundGoing = false;
  you.stabs = 0; opp.stabs = 0;
  you.lights = 0; opp.lights = 0;
  you.screws = 0; opp.screws = 0;
  $('tool').hidden = true;
  you.skipNext = false; opp.skipNext = false;

  started = false; over = false;
  clearCards(); clearOppCards();
  stowYou.forEach(el => el.remove()); stowYou = [];
  stowThem.forEach(el => el.remove()); stowThem = [];
  initLane(YOU); initLane(THEM);
  if (M.useBoard) { setUpBoard(); if (!M.lean) dealBonus(); else { you.bonus = opp.bonus = null; } }
  else applySigns();
  drawSigns();

  briefed = false;

  $('weigh').hidden = true;
  showLens('you', null); showLens('them', null);
  $('lensYou').classList.remove('hot');
  $('bannedFoot').textContent = restrictedCount() + ' of them on the belt today';
  $('result').hidden = true;
  $('stage').classList.remove('running-you', 'running-b');
  lamp(YOU, false); lamp(THEM, false);
  hudShown = 0; $('hudScore').textContent = '0';
  document.body.classList.toggle('no-tally', !!M.circulate);
  $('modeName').textContent = M.name + (seizeGoal ? '  ·  first to ' + seizeGoal : '') +
    (series.best > 1
      ? '  ·  Round ' + series.round + ' of ' + series.best + '  ·  ' + series.youWins + '–' + series.oppWins
      : '');
  $('clock').className = 'clock';
  $('clock').textContent = '0:00';
  fit(); drawQueue(); drawTally(); render();
}

/* ---------- the briefing ----------
   One thing to read before the belt starts: the two amendments. There is no
   second list any more. Stolen goods asked you to hold five ordinary objects
   in your head at the same time as the signs, and with ten seconds a bag
   nobody could keep the two apart — the signs do that job better, and they
   are the joke as well. */

function boardBlock() {
  return '<div class="brief-board">' + board.filter(r => r.banned).map(r =>
    '<span class="brief-chip"><img src="assets/ui/signs/' + r.cat.banned + '" alt="">' +
    r.cat.label + '</span>').join('') + '</div>';
}

function amendBlock() {
  return '<div class="brief-signs">' + signsToday.map(sg =>
    '<span class="brief-sign sign-' + sg.kind + '">' +
    '<img src="assets/ui/signs/' + sg.file + '" alt="">' +
    '<span><b>' + sg.label + '</b>' + sg.blurb +
    (sg.blurbNote ? ' <em>' + sg.blurbNote + '</em>' : '') +
    '</span></span>').join('') + '</div>';
}

function briefText() {
  if (M.useBoard && M.lean) {
    return '<p class="brief-rules">Red on the wall. Everything else is allowed — for now.</p>' +
      boardBlock() +
      '<p class="brief-lede">Every other sign is <strong>green</strong>, and taking one of those off a passenger ' +
      'costs you the next bag. <strong>Every piece has two sides</strong> and either can get it confiscated — tap a ' +
      'piece to turn it over, drag it to the tray to seize it.</p>' +
      '<p class="brief-lede"><strong>The wall never turns by itself.</strong> It only moves when somebody uses ' +
      'something they have seized, before the next bag:</p>' +
      '<ul class="brief-tools">' +
      '<li><b>Screwdriver</b> — four in the game. Turn any one sign over, green to red or red to green.</li>' +
      '<li><b>Lighter</b> — four in the game. Strike it on a red sign: that sign and every red sign joined to it, ' +
      'up, down or sideways, burns back to green.</li>' +
      '<li><b>Knife</b> — three in the game. Stab any sign and nothing can turn it this round. Fire stops at it.</li>' +
      '</ul>' +
      '<p class="brief-score">The bags go round and round; the shift ends when somebody has seized <strong>' +
      seizeGoal + '</strong>.</p>';
  }
  if (M.useBoard) {
    return '<p class="brief-rules">Red on the wall. Everything else is allowed — for now.</p>' +
      boardBlock() +
      '<p class="brief-lede">Every other category on that board is <strong>green</strong>, and taking one of ' +
      'those off a passenger costs you the next bag. After <strong>' + (M.banAfter || 0) + '</strong> rounds, ' +
      '<strong>' + (M.banCount || 2) + '</strong> more green signs turn over every round and stay over.</p>' +
      (M.lean
        ? '<p class="brief-lede"><strong>Every piece has two sides</strong>, and the one facing up is not always ' +
          'the one that gets it confiscated — tap a piece to turn it over, drag it to the tray to seize it. ' +
          'There are only three knives in the whole game: take one and you can <strong>stab a sign</strong> ' +
          'before the next turn, and it stays green that round.</p>' +
          '<p class="brief-lede">There are four <strong>lighters</strong>. Take one and, before any round, you can ' +
          'set fire to the board: pick a <strong>red</strong> sign and the signs directly above, below and either ' +
          'side of it turn red too; pick a <strong>green</strong> sign and just that one turns. A stabbed sign ' +
          'will not catch.</p>'
        : '') +
      (you.bonus
        ? '<div class="brief-permit"><img src="assets/ui/signs/' + you.bonus.allowed + '" alt="">' +
          '<span><b>Your own line: ' + you.bonus.label + '</b>' +
          'A private arrangement, and nobody else knows about it. It is still contraband and you still have to ' +
          'get it out of the bag — but every one you take counts <strong>two</strong> towards your total. ' +
          'Officer B has a line of their own.</span></div>'
        : '') +
      '<p class="brief-score">The bags go round and round; the shift ends when somebody has seized <strong>' +
      seizeGoal + '</strong>.</p>';
  }
  return '<p class="brief-rules">Two amendments are up on the wall for this shift. They beat the standing list.</p>' +
    amendBlock() +
    '<p class="brief-lede">They hold for this shift only, and they cut both ways: a banned category is ' +
    '<strong>+3</strong> to seize, and anything you take off a passenger that is not forbidden today ' +
    'is <strong>\u22125</strong>.</p>' +
    '<p class="brief-warn">Read them now. They stay on the wall, but you will not have time to look.</p>' +

    (M.banEvery
      ? '<p class="brief-score">Every <strong>' + M.banEvery + '</strong> bags, two more ordinary things are ' +
        'struck off and go up on the wall. Nobody chooses them and they apply to both of you. ' +
        'The bags go round and round; the shift ends when somebody has seized <strong>' + seizeGoal + '</strong>.</p>'
      : '');
}

function showBriefing() {
  $('briefBody').innerHTML = briefText();
  $('brief').hidden = false;
}

/* ---------- queue ---------- */

/* When your own twelve run out you take what the other officer has finished
   with, in the order they finished it. Bags keep circling until somebody
   strips three of them bare; a bag with nothing left in it leaves the game. */
function nextBag(mine) {
  const own = mine ? YOU : THEM, other = mine ? THEM : YOU;
  if (own.queue.length) return own.queue.shift();
  if (M.circulate && other.donePile.length) { recirc++; return other.donePile.shift(); }
  return null;
}

function bagsLeft() {
  return YOU.queue.length + THEM.queue.length + YOU.donePile.length + THEM.donePile.length;
}

/* A bag with nothing left in it is out of the game — there is nothing to
   search and it would only clog the loop. Everything else goes back round to
   the other officer, in the order it was finished with. */
function retire(tray, p) {
  if (!M.circulate) return;
  if (!tray.bag.items.length) {
    p.emptied = (p.emptied || 0) + 1;
    toast((p === you ? 'You emptied a bag' : 'Officer B emptied a bag') + ' — it leaves the game', p === you);
    return;
  }
  (p === you ? YOU : THEM).donePile.push(tray);
}

function drawQueue() {
  const q = YOU.queue;
  const b = $('belt');
  b.innerHTML = q.length
    ? q.map((t, i) => '<span class="qtray' + (i === 0 ? ' next' : '') + '" data-bounces="' + t.bounces + '"></span>').join('')
    : '<span class="belt-empty">Belt empty</span>';
  const word = ' in your queue';
  const extra = M.circulate ? '  ·  ' + bagsLeft() + ' bags going round' : '';
  $('beltCount').textContent = q.length + (q.length === 1 ? ' tray' : ' trays') + word + extra;
  $('hudBelt').textContent = q.length + word;
}

/* ---------- clock ---------- */

function clockText(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}


function beginClock() {
  if (started) return;
  started = true; t0 = Date.now();

  tick = setInterval(() => {
    {
      const s = Math.floor((Date.now() - t0) / 1000);
      $('clock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
  }, 250);
  startAmbience();
  startBeltWatch();
  if (!M.lockstep) later(oppTurn, 2600);
}

/* The belt does not clear itself. Anything still on it costs both officers a
   point, which is what stops a losing player downing tools to spoil it. */
function timeUp() {
  if (over) return;
  leftovers = (YOU.queue.length + THEM.queue.length) +
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

function stow(el, tray, list, item) {
  if (item) { el.dataset.design = item.design; el.dataset.item = JSON.stringify(item); }
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

/* A two-sided piece turns over when you tap it on the bench. What you see
   is only half of it, and the half you cannot see may be the half that makes
   it contraband. */
function turnOver(card) {
  const it = card.item;
  if (!it || !it.sides) return;
  const img = card.el.querySelector('img.face');
  card.el.classList.add('turning');
  later(() => {
    it.side = it.side ? 0 : 1;
    if (img) img.src = 'assets/cards/' + it.sides[it.side];
    card.el.classList.remove('turning');
  }, 110);
  playItem(it, 0.35);
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
    card.el.setAttribute('aria-label', card.item.sides
      ? 'Piece on the bench. Select to turn it over; drag it to the tray to seize it.'
      : 'Item card on the bench. Select again to seize it.');
  } else if (card.item && card.item.sides) {
    turnOver(card);                 /* on the lean shift a tap turns it; dragging seizes */
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
  if (bad(card.item)) {
    if (M.lean && isKnife(card.item)) {
      you.stabs = (you.stabs || 0) + 1;
      toast('A knife — you can stab a sign before the next bag', true);
    }
    if (M.lean && isLighter(card.item)) {
      you.lights = (you.lights || 0) + 1;
      toast('A lighter — you can burn red signs off the wall before the next bag', true);
    }
    if (M.lean && isScrewdriver(card.item)) {
      you.screws = (you.screws || 0) + 1;
      toast('A screwdriver — you can turn a sign over before the next bag', true);
    }
    const worth = creditSeizure(you, card.item);
    pop(c.x - 24, c.y - 28, worth === 2 ? 'Yours \u00b7 2' : '+' + VP_SEIZED, 'good');
  }
  else {
    pop(c.x - 18, c.y - 28, String(VP_WRONG), 'bad');
    if (M.skipOnWrong && !you.skipNext) {
      you.skipNext = true;
      toast('That was legal — you sit out the next bag', true);
    }
  }
  playItem(card.item);
  cards = cards.filter(other => other !== card);
  stow(card.el, SEIZE_YOU, stowYou, card.item);
  drawTally();
  if (M.circulate && held && !held.bag.items.length) render();
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
  held = nextBag(true);
  if (!held) { phase = 'idle'; render(); checkEnd(); return; }
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
  if (M.lockstep) return;           /* one bag a round, nothing waiting */
  if (over || onDeck) return;
  if (M.circulate && bagsLeft() <= 2) return;   /* seven bags cannot spare one */
  onDeck = nextBag(true);
  if (!onDeck) return;
  YOU.deck = takeTray(YOU, onDeck.front);
  YOU.deck.el.classList.add('waiting');
  drawQueue();
  roll(YOU, YOU.deck, X.parkIn, 1200);
}

/* Somebody who took something legal off a passenger loses their next bag: it
   comes down the belt, they are stood back from the bench, and it goes on to
   the other officer untouched. */
/* The bag you have lost has to go past you, not vanish. It comes down the belt
   with its front still on, runs the length of the lane and out the other end
   without ever being opened, and you watch it go. */
function serveSkip(tray, p, mine) {
  const lane = mine ? YOU : THEM;
  p.skipNext = false;
  p.skipped = (p.skipped || 0) + 1;
  toast((mine ? 'Stood down — this one goes past you' : 'Officer B is stood down for this one'), mine);

  const t = takeTray(lane, tray.front);
  t.el.classList.add('waiting');
  roll(lane, t, X.parkOut, 1100, () => {
    move(lane, t, X.exit, 1000, () => {
      freeTray(lane, t);
      retire(tray, p);
      if (M.lockstep) { if (mine) { phase = 'idle'; render(); } else oppBusy = false; return; }
      if (mine) { phase = 'idle'; render(); feedLane(); }
      else { oppBusy = false; oppTurn(); }
    });
  });
  return true;
}

/* the tray you were working has gone; whatever is waiting becomes yours */
function promote() {
  if (over) return;
  if (!onDeck) { feedLane(); return; }
  /* the tray already waiting is the one you lose, and it has to be seen to go */
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
  if (!on || !held) { box.hidden = true; return; }
  const b = weighBand(held.bag.items.length);
  $('weighWord').textContent = b[0];
  $('weighBars').innerHTML = '<i class="' + (b[1] > 0 ? 'on' : '') + '"></i>' +
    '<i class="' + (b[1] > 1 ? 'on' : '') + '"></i>' +
    '<i class="' + (b[1] > 2 ? 'on' : '') + '"></i>';
  box.hidden = false;
}

function goPressed() {
  if (!started) {
    beginClock(); beltNoise(YOU);
    if (M.lockstep) beginRound(); else feedLane();
    return;
  }
  if (phase === 'ready') { beltNoise(YOU); scan(); }
}

/* On the ten-second shift nobody presses Go twice: the belt runs itself and
   the only decisions left are Check, seize and Pass. */
function autoRun() {
  if (over) return;
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
    if (M.autoOpen) later(autoOpenBag, 120);   /* it opens itself; the clock is the game */
  });
  later(queueNext, 420);
}

/* With no Pass to press there is nothing to decide about opening a bag, so the
   rig does it: the tray stops, the case opens and the front goes on the bench
   by itself. All fifteen seconds go on looking. */
function autoOpenBag() {
  if (over || phase !== 'scanned') return;
  checkPressed();
  const lid = cards.find(cd => cd.kind === 'lid');
  if (lid) { const lp = lidPark(YOU); openCase(); settle(lid.el, lp.x, lp.y, -4); }
  render();
}

/* Check — the belt stops and the suitcase becomes yours to open */
function checkPressed() {
  showWeight(false);
  if (phase !== 'scanned') return;
  phase = 'searching';
  searchedTray = true;
  YOU.work.box.hidden = true;
  spawnCards();
  render();
}

/* Pass — this tray is done with, whatever is still in it */
function passPressed() {
  if (M.noPass) return;
  if (!mayPass(you, opp)) return;
  showWeight(false);
  if (phase === 'scanned') { fileTray(); return; }
  if (phase === 'searching' && !opened) fileTray();
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
  retire(held, you);
  held = null; opened = false;
  lamp(YOU, false);
  drawTally();
  if (early) cutOpp();
  later(() => {
    if (over) return;
    if (M.lockstep) { phase = 'idle'; render(); roundEnd(true); return; }
    checkEnd();
    if (over) return;
    amendmentDue();
    promote();
  }, 700);
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
/* Every one of B's delayed steps counts down rather than fires on a deadline,
   so a pause for a draft freezes them where they stand instead of letting the
   whole chain arrive at once when it lifts. */
function oppLater(fn, ms) {
  const g = oppGen;
  let left = ms, last = Date.now();
  const step = () => {
    if (over || g !== oppGen) return;
    const now = Date.now();
    if (!paused) left -= (now - last);
    last = now;
    if (left <= 25) { fn(); return; }
    later(step, Math.min(left, 110));
  };
  later(step, Math.min(ms, 110));
  return null;
}
function oppMove(t, x, ms, then) {
  const g = oppGen;
  move(THEM, t, x, ms, () => { if (over || g !== oppGen) return; if (then) then(); });
}
function oppRoll(t, x, ms, then) {
  const g = oppGen;
  roll(THEM, t, x, ms, () => { if (over || g !== oppGen) return; if (then) then(); });
}

let trayHeld = 0;
function holdTrayClock() {
  if (!trayEnd) return;
  trayHeld = Math.max(0, trayEnd - Date.now());
  clearInterval(trayTick); trayTick = null;
}
function resumeTrayClock() {
  if (!trayHeld) return;
  const left = trayHeld; trayHeld = 0;
  startTrayClock(left);
}

function stopTrayClock() {
  clearInterval(trayTick); trayTick = null; trayEnd = 0; trayHeld = 0;
  $('trayTime').hidden = true;
  $('trayTime').classList.remove('urgent');
}

function startTrayClock(ms) {
  if (!M.tray) return;
  clearInterval(trayTick);
  trayEnd = Date.now() + (ms || M.tray);
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
  oppFile(oppHeld.bag.items.filter(it => badFor(opp, it)));
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

/* Passing early is a weapon — it banks your tray and cuts the other officer's
   bag short. So it belongs to whoever is behind. Lead on seizures and the bag
   in front of you goes when the clock says so and not before, which is a
   handbrake on the runaway the cut used to be. */
function mayPass(p, other) {
  if (M.noPass) return false;
  if (!M.passGate) return true;
  return (p.hits || 0) <= (other.hits || 0);
}

/* ---------- controls + copy ---------- */

function render() {
  const p = $('prompt');
  later(() => { $('hudLine').textContent = p.textContent; }, 0);
  const go = $('btnGo'), pass = $('btnPass'), check = $('btnCheck');
  go.disabled = pass.disabled = check.disabled = true;
  pass.hidden = !!M.noPass;
  check.hidden = !!M.autoOpen;
  check.classList.toggle('active', phase === 'searching');

  if (over) { p.textContent = 'Shift over.'; return; }

  go.hidden = started && !!M.autoOpen;
  if (phase === 'idle') {
    if (!started) {
      go.hidden = false; go.disabled = false;
      p.innerHTML = (M.circulate
        ? (M.bags || 7) + ' bags going round and ' + Math.round(M.tray / 1000) + ' seconds on each. '
        : M.perSide + ' trays each and ' + Math.round(M.tray / 1000) + ' seconds a bag. ') +
        '<strong>Go</strong> starts the belt, and after that it does not stop.';
    } else {
      p.textContent = 'Belt empty. Waiting on the other lane.';
    }
    return;
  }
  if (phase === 'rolling') { p.textContent = 'Tray coming down the belt.'; return; }
  if (phase === 'skipped') {
    p.innerHTML = 'You took something legal off a passenger, so <strong>this one goes straight past</strong>. ' +
      'It is not checked by anybody — it just goes back round.';
    return;
  }

  if (phase === 'ready') {
    /* the ten-second belt runs itself, so Go is only ever pressed once */
    go.disabled = true;
    p.textContent = 'Tray coming through.';
    return;
  }
  if (phase === 'scanning') { p.textContent = 'Scanning.'; return; }

  if (phase === 'scanned') {
    if (!held) return;
    if (M.noPass) { p.textContent = 'Opening it.'; return; }
    const may = mayPass(you, opp);
    pass.disabled = !may;
    check.disabled = false;
    check.textContent = 'Check';
    p.innerHTML = may
      ? 'No machine, no lamp — only the weight in your hands and the clock on the tray. ' +
        '<strong>Check</strong> opens it. <strong>Pass</strong> sends it on, and if you are quick it ends their bag too.'
      : 'You are ahead on seizures, so you cannot wave this one through — the bag goes when the clock does. ' +
        '<strong>Check</strong> it and use the time.';
    return;
  }

  if (phase === 'searching') {
    if (M.noPass) {
      p.innerHTML = 'Eight things, fifteen seconds, and no way to wave it through. Slide them out, ' +
        'take what is forbidden <strong>today</strong>, and leave everything else alone — anything legal ' +
        'you pull out and you sit out the next bag.';
      return;
    }
    if (!opened) {
      const may = mayPass(you, opp);
      pass.disabled = !may;
      p.innerHTML = may
        ? 'The case is shut and the bag is packed. <strong>Pass</strong> files the tray and, with time on the clock, cuts Officer B off mid-bag.'
        : 'Packed and ready, but you are ahead on seizures — this one waits for the clock. Keep looking.';
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

/* ---------- rounds ----------
   Both benches work to one clock. A round hands a bag to each officer at the
   same moment, both get the same ten seconds, and neither starts the next one
   until both have filed. Without this each side ran its own pipeline and they
   drifted apart within a few bags — Officer B opening their fourth while you
   were still on your third, which makes a wall that keeps turning over mean two
   different things to the two of you.

   Somebody stood down still spends the round standing there: their bag goes
   past and they wait for the other officer to finish. */
let roundNo = 0, youDone = false, oppDone = false, roundGoing = false;

/* ---------- the knife, the lighter and the screwdriver ----------
   On the lean shift nothing on the wall moves by itself any more. Signs only
   turn when somebody uses something they took off a passenger:

   - a SCREWDRIVER turns one sign over, either way: green to red or red to
     green. Four in the game.
   - a LIGHTER is struck on a red sign and puts it out: that sign, and every
     red sign joined to it up, down or sideways, goes back to green. It runs
     along a chain of reds as far as the chain goes. Four in the game.
   - a KNIFE stabs one sign, either colour, and nothing can turn it this round:
     not a screwdriver, and not fire, which stops at it like a firebreak.
     Three in the game.

   Everything is kept until you choose to spend it, and it is spent between
   bags, never during one, so it costs nothing off your ten seconds. */
function flipsThisRound() {
  return !!M.useBoard && !M.lean && roundNo > (M.banAfter || 0);
}

function isKnife(it)       { return !!(it && it.design && it.design.indexOf('lean_knives') === 0); }
function isLighter(it)     { return !!(it && it.design && it.design.indexOf('lean_lighters') === 0); }
function isScrewdriver(it) { return !!(it && it.design && it.design.indexOf('lean_screwdrivers') === 0); }

/* what each tool would change if used on square i, without doing it */
function fireReach(i) {
  const start = board[i];
  if (!start || !start.banned || start.stabbed) return [];
  const seen = {}, out = [], todo = [i];
  seen[i] = true;
  while (todo.length) {
    const k = todo.shift();
    out.push(board[k]);
    leanNeighbours(k).forEach(n => {
      if (seen[n]) return;
      seen[n] = true;
      if (board[n] && board[n].banned && !board[n].stabbed) todo.push(n);
    });
  }
  return out;
}
function turnReach(i) {
  const r = board[i];
  return r && !r.stabbed ? [r] : [];
}
function stabReach(i) {
  const r = board[i];
  return r && !r.stabbed ? [r] : [];
}

function names(rows) {
  const n = rows.map(r => r.cat.label.toLowerCase());
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : (n[0] || '');
}

const TOOLS = {
  stab: {
    count: 'stabs', reach: stabReach,
    kicker: 'You took a knife', head: 'Stab a sign',
    lede: 'Pick any sign, red or green. Nothing can turn it this round — not a screwdriver, and not fire, ' +
          'which stops dead at it.',
    skip: 'Keep the knife in your pocket',
    hint: (r, reach) => !reach.length ? r.cat.label + ' is already stabbed.'
                                      : r.cat.label + ' stays ' + (r.banned ? 'red' : 'green') + ' this round.',
    apply: rows => { rows.forEach(r => { r.stabbed = true; }); },
    said: (who, rows) => who + ' stabbed ' + names(rows) + ' — it stays put this round'
  },
  light: {
    count: 'lights', reach: fireReach,
    kicker: 'You took a lighter', head: 'Burn a sign off the wall',
    lede: 'Strike it on a <strong>red</strong> sign. That sign goes back to green, and so does every red sign ' +
          'touching it — above, below or either side — and every red sign touching those, as far as the red runs. ' +
          'A stabbed sign will not burn and the fire stops at it.',
    skip: 'Keep the lighter for later',
    hint: (r, reach) => !reach.length
      ? (r.stabbed ? r.cat.label + ' is stabbed — it will not burn.' : r.cat.label + ' is green — nothing to burn.')
      : 'Burns ' + names(reach) + ' back to green.',
    apply: rows => { rows.forEach(r => { r.banned = false; r.lit = true; }); },
    said: (who, rows) => who + ' burnt ' + (rows.length > 1 ? rows.length + ' signs' : 'a sign') +
                         ' off the wall: ' + names(rows) + ' allowed again'
  },
  screw: {
    count: 'screws', reach: turnReach,
    kicker: 'You took a screwdriver', head: 'Turn a sign over',
    lede: 'Pick one sign. Green turns <strong>red</strong>, red turns <strong>green</strong>. ' +
          'Just the one. A stabbed sign will not turn.',
    skip: 'Keep the screwdriver for later',
    hint: (r, reach) => !reach.length ? r.cat.label + ' is stabbed — it will not turn.'
                                      : r.cat.label + ' turns ' + (r.banned ? 'green' : 'red') + '.',
    apply: rows => { rows.forEach(r => { r.banned = !r.banned; r.lit = true; }); },
    said: (who, rows) => who + ' turned a sign: ' +
                         (rows[0].banned ? 'no ' + names(rows) : names(rows) + ' allowed')
  }
};

function useTool(kind, i) {
  const tool = TOOLS[kind];
  const rows = tool.reach(i);
  if (!rows.length) return rows;
  tool.apply(rows);
  recomputeBoard();
  drawSigns();
  return rows;
}

/* One picker for all three: the wall itself, big enough to aim at. With a
   mouse, hovering shows what will change and a click commits; on a
   touchscreen the first tap aims and a second tap on the same sign commits. */
function offerTool(kind, then) {
  const tool = TOOLS[kind];
  if (!(you[tool.count] > 0) || !board.some((r, i) => tool.reach(i).length)) { then(); return; }
  paused = true;
  $('toolKicker').textContent = tool.kicker;
  $('toolHead').textContent = tool.head;
  $('toolLede').innerHTML = tool.lede;
  $('toolSkip').textContent = tool.skip;
  $('toolCount').textContent = you[tool.count] > 1 ? 'You have ' + you[tool.count] + '.' : '';
  const list = $('toolList');
  list.style.gridTemplateColumns = 'repeat(' + LEAN_COLS + ', minmax(0, 1fr))';
  list.innerHTML = board.map((r, i) =>
    '<button class="light-pick light-' + (r.banned ? 'ban' : 'ok') + (r.stabbed ? ' stabbed' : '') +
    '" type="button" data-i="' + i + '" title="' + r.cat.label + '">' +
    '<img src="assets/ui/signs/' + (r.banned ? r.cat.banned : r.cat.allowed) + '" alt=""><b>' + r.cat.label + '</b></button>'
  ).join('');
  const buttons = [].slice.call(list.querySelectorAll('.light-pick'));
  const hint = $('toolHint');
  const say = i => {
    buttons.forEach(b => b.classList.remove('reach', 'aim'));
    if (i == null) { hint.textContent = 'Pick a sign.'; return; }
    const reach = tool.reach(i);
    buttons[i].classList.add('aim');
    reach.forEach(x => buttons[board.indexOf(x)].classList.add('reach'));
    hint.textContent = tool.hint(board[i], reach);
  };
  const done = i => {
    $('tool').hidden = true;
    paused = false;
    if (i != null) {
      you[tool.count]--;
      const rows = useTool(kind, i);
      if (rows.length) toast(tool.said('You', rows), true);
    }
    then();
  };
  const hover = matchMedia('(hover: hover)').matches;
  let aimed = null;
  buttons.forEach(b => {
    const i = Number(b.getAttribute('data-i'));
    if (hover) { b.onmouseenter = () => say(i); b.onmouseleave = () => say(aimed); }
    b.onclick = () => {
      if ((hover || aimed === i) && tool.reach(i).length) { done(i); return; }
      aimed = i; say(i);
    };
  });
  say(null);
  $('toolSkip').onclick = () => done(null);
  $('tool').hidden = false;
}

/* ---------- Officer B's hand ----------
   B reads the same wall and plays simply, and in plain sight:
   - a screwdriver goes straight on the green sign with the most pieces still
     going round, because more contraband is how anybody gets to the target;
   - a lighter is only struck on a chain of two or more reds, the biggest one;
   - a knife is only drawn when you are holding a lighter or a screwdriver,
     and it goes on the red sign that covers the most pieces in play. */
function piecesLeft() {
  const n = {};
  [].concat(YOU.queue || [], THEM.queue || [], YOU.donePile || [], THEM.donePile || [],
            held ? [held] : [], oppHeld ? [oppHeld] : [])
    .forEach(t => t && t.bag && t.bag.items.forEach(it => {
      (tagIndex()[it.design] || []).forEach(tg => { n[tg] = (n[tg] || 0) + 1; });
    }));
  return n;
}

function oppPlay(kind, i) {
  const rows = useTool(kind, i);
  if (!rows.length) return false;
  opp[TOOLS[kind].count]--;
  toast(TOOLS[kind].said('Officer B', rows), false);
  return true;
}

function oppStabs() {
  if (!(opp.stabs > 0) || !((you.lights || 0) + (you.screws || 0))) return;
  const left = piecesLeft();
  let best = -1, most = -1;
  board.forEach((r, i) => {
    if (!r.banned || r.stabbed) return;
    const n = (left[r.cat.tag] || 0) + Math.random() * 0.5;
    if (n > most) { most = n; best = i; }
  });
  if (best >= 0) oppPlay('stab', best);
}

function oppTools() {
  if (opp.lights > 0) {
    let best = -1, most = 1;
    board.forEach((r, i) => {
      const n = fireReach(i).length + Math.random() * 0.5;
      if (n >= 2 && n > most) { most = n; best = i; }
    });
    if (best >= 0) oppPlay('light', best);
  }
  if (opp.screws > 0) {
    const left = piecesLeft();
    let best = -1, most = 0;
    board.forEach((r, i) => {
      if (r.banned || r.stabbed) return;
      const n = (left[r.cat.tag] || 0) + Math.random() * 0.5;
      if (n > most) { most = n; best = i; }
    });
    if (best >= 0) oppPlay('screw', best);
  }
}

/* Before a round: Officer B draws a knife first, where you can see it, then
   you get your knife, your lighter and your screwdriver in that order, then B
   uses theirs. A stab lasts until the end of the round it was made in. */
function beginRound() {
  if (over || !M.lockstep) return;
  roundNo++;
  youDone = false; oppDone = false; roundGoing = true;
  board.forEach(r => { r.lit = false; });
  if (M.lean) {
    oppStabs();
    const steps = ['stab', 'light', 'screw'].map(k => then => offerTool(k, then));
    const run = () => { const step = steps.shift(); if (step) step(run); else dealRound(); };
    run();
    return;
  }
  dealRound();
}

function dealRound() {
  if (over) return;
  if (M.lean) oppTools();
  else amendmentDue();                          /* the lean wall never turns by itself */
  board.forEach(r => { r.stabbed = false; });   /* a stab holds for one turn only */
  if (M.useBoard) drawSigns();

  if (you.skipNext) {
    you.skipNext = false;
    const bag = nextBag(true);
    youDone = true;
    phase = 'skipped'; render();
    if (bag) serveSkip(bag, you, true); else toast('Stood down for this one', true);
  } else {
    feedLane();
  }

  if (opp.skipNext) {
    opp.skipNext = false;
    const bag = nextBag(false);
    oppDone = true;
    oppSay('Stood down for this one');
    if (bag) serveSkip(bag, opp, false);
  } else {
    oppTurn();
  }
  roundCheck();
}

function roundEnd(mine) {
  if (mine) youDone = true; else oppDone = true;
  roundCheck();
}

function roundCheck() {
  if (!M.lockstep || over || !roundGoing) return;
  if (!youDone || !oppDone) return;
  roundGoing = false;
  checkEnd();
  if (over) return;
  later(beginRound, 900);
}

/* ---------- the belt watcher ----------
   Either officer can run dry for a moment: the bags circulate, so your next
   one only exists once the other has finished with it. Whoever runs out has
   to be woken when one turns up, and nothing was doing that — the old wake-up
   hung off the bounce rule, which was deleted, so the first time Officer B's
   queue emptied they stood there for the rest of the game.

   A watcher is the right shape for this rather than another callback: there is
   no single event to hang it on, because the thing they are waiting for
   happens on the other side of the bench. */
let beltWatch = null;

function startBeltWatch() {
  clearInterval(beltWatch);
  beltWatch = setInterval(() => {
    if (over) { clearInterval(beltWatch); beltWatch = null; return; }
    if (paused) return;
    if (M.lockstep) {
      /* rounds drive everything; the watcher only rescues a stalled one */
      if (roundGoing && !held && !oppHeld && !oppBusy && phase === 'idle') { youDone = oppDone = true; roundCheck(); }
      return;
    }
    if (!oppBusy && !oppHeld) oppTurn();
    if (!held && phase === 'idle') feedLane();
  }, 600);
  timers.push(beltWatch);
}
function oppSay(t) { $('oppDoing').textContent = t; $('oppDoingStage').textContent = t; }

/* 0 = comfortable, 1 = being buried by the other lane */
function oppRush() { return clamp((you.trays - opp.trays) / 6, 0, 1); }

function oppTurn() {
  if (over || oppBusy) return;      /* the watcher may call this at any time */
  oppCut = false;
  oppGen++;
  if (opp.skipNext && oppDeck) {
    const skipped = oppDeck; oppDeck = null;
    if (THEM.deck) { freeTray(THEM, THEM.deck); THEM.deck = null; }
    oppBusy = true;
    serveSkip(skipped, opp, false);
    return;
  }
  const fromDeck = !!oppDeck;
  if (oppDeck) { oppHeld = oppDeck; oppDeck = null; }
  else { oppHeld = nextBag(false); }
  if (!oppHeld) {
    oppBusy = false;
    oppSay('Waiting on a bag');
    checkEnd();                     /* the watcher tries them again shortly */
    return;
  }

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
}

function oppQueueNext() {
  if (M.lockstep) return;
  if (over || oppDeck) return;
  oppDeck = nextBag(false);
  if (!oppDeck) return;
  THEM.deck = takeTray(THEM, oppDeck.front);
  THEM.deck.el.classList.add('waiting');
  drawQueue();
  roll(THEM, THEM.deck, X.parkIn, 1200);
}

/* With no lamp B is in the same position you are: all they have to go on is
   how fat the bag looks, and whatever the mode lets them spend. */
function oppWantsSearch(size) {
  /* Ten seconds is not long enough to be precious about it: B opens almost
     everything, and skips the odd thin one to save the time. */
  return size >= 3 ? true : Math.random() < 0.8;
}

/* Officer B is on the same clock you are. Their bag lands on their bench, they
   get exactly as long with it as you get with yours, and finishing early buys
   them nothing — they stand there with it shut until the time is up, the same
   as you do. Without this they simply started the next one, and worked through
   the shift a good deal faster than you could. */
let oppTrayStart = 0;

function oppFileWhenDue(missed, soonest) {
  const leftOnClock = M.tray ? (oppTrayStart + M.tray) - Date.now() : 0;
  oppLater(() => oppFile(missed), Math.max(soonest, leftOnClock));
}

function oppAfterScan() {
  if (over || !oppHeld) return;
  oppTrayStart = Date.now();
  const contraband = oppHeld.bag.items.filter(it => badFor(opp, it));
  const size = oppHeld.bag.items.length;
  const rush = oppRush();

  if (false) {
    oppSay('No light — tray kept');
    oppFileWhenDue([], Math.round(rnd(600, 1100)));
    return;
  }

  if (!oppWantsSearch(size)) {
    oppSay(size >= 5 ? 'Waved a heavy one through' : 'Waved a bag through');
    oppFileWhenDue(contraband, Math.round(rnd(500, 950)));
    return;
  }

  /* bouncing costs a tray, so an officer who is behind stops doing it */
  const bounceOdds = 0;
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

  /* B misreads the wall sometimes — with twenty signs up, who would not */
  if (M.skipOnWrong && !opp.skipNext && Math.random() < 0.18) {
    const legal = oppCards.filter(cd => cd.item && !badFor(opp, cd.item));
    if (legal.length) {
      const slip = legal[Math.floor(Math.random() * legal.length)].item;
      opp.seized.push(slip);
      oppHeld.bag.items = oppHeld.bag.items.filter(x => x.uid !== slip.uid);
      opp.skipNext = true;
      toast('Officer B took something legal — they sit out the next one', false);
    }
  }

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
      stow(cd.el, SEIZE_THEM, stowThem, it);
      if (M.lean && isKnife(it)) opp.stabs = (opp.stabs || 0) + 1;
      if (M.lean && isLighter(it)) opp.lights = (opp.lights || 0) + 1;
      if (M.lean && isScrewdriver(it)) opp.screws = (opp.screws || 0) + 1;
      creditSeizure(opp, it);
      pop(SEIZE_THEM.x + SEIZE_THEM.w - 60, SEIZE_THEM.y - 26,
          '+' + VP_SEIZED, 'theirs');
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
  /* and if they were quick about it, they wait like everybody else */
  if (M.tray) {
    const spare = (oppTrayStart + M.tray) - Date.now();
    if (spare > 1200) oppLater(() => { if (oppHeld) oppSay('Done early — waiting on the belt'); }, 900);
  }
  oppFileWhenDue(missed, t + Math.round(rnd(420, 780)));
}

function oppFile(missed) {
  if (over) return;
  const theyWereQuick = M.cut && !M.noPass && !oppCut && mayPass(opp, you);
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
  retire(oppHeld, opp);
  oppHeld = null; lamp(THEM, false);
  checkEnd();
  if (over) return;
  oppBusy = false;
  if (theyWereQuick) cutYou();
  if (M.lockstep) { oppSay('Waiting on the next round'); roundEnd(false); return; }
  later(oppTurn, Math.round(rnd(500, 1100)));
}

/* ---------- score ---------- */

function wrongGrabs(p) { return p.seized.filter(it => !badFor(p, it)).length; }
function missPenalty(p) { return p.missed.length * VP_MISSED; }

/* One currency. A forbidden thing is worth one, your own secret line is worth
   two, and nothing else scores at all — trays kept, bags emptied and things
   that went past you are all just counts on the sheet. Which means the running
   number on your seize tray IS the score, and there is nothing to reconcile at
   the end. */
function scoreOf(p) {
  if (M.useBoard) return p.hits || 0;
  return p.trays * VP_TRAY
    + p.seized.filter(it => badFor(p, it)).length * VP_SEIZED
    + wrongGrabs(p) * VP_WRONG
    + missPenalty(p)
    + leftovers * VP_LEFT;
}

/* What the scoreboard is allowed to show mid-shift. Without a detector you do
   not know what went past you, so the running total does not either. */
function shown(p) {
  if (M.useBoard) return p.hits || 0;
  return M.reveal ? scoreOf(p)
    : p.trays * VP_TRAY + p.seized.filter(it => badFor(p, it)).length * VP_SEIZED + wrongGrabs(p) * VP_WRONG;
}

function drawTally() {
  $('youTrays').textContent = you.trays;
  $('youSeized').textContent = you.seized.filter(it => badFor(you, it)).length;
  $('youScore').textContent = shown(you);
  $('oppTrays').textContent = opp.trays;
  $('oppSeized').textContent = opp.seized.filter(it => badFor(opp, it)).length;
  $('oppScore').textContent = shown(opp);
  $('seizeN').textContent = seizeGoal ? (you.hits || 0) + ' / ' + seizeGoal : you.seized.length;
  $('seizeNB').textContent = seizeGoal ? (opp.hits || 0) + ' / ' + seizeGoal : opp.seized.length;
  $('hudYou').textContent = shown(you);
  $('hudOpp').textContent = shown(opp);
  const bud = $('budget');
  bud.hidden = true;
  drawHud();
}

function checkEnd() {
  if (over) return;
  if (M.circulate) {
    /* The shift runs until somebody has taken the target off the belt. Only
       correct seizures count, so grabbing everything in sight gets you there
       no faster — it just costs five a time. */
    if (seizeGoal && ((you.hits || 0) >= seizeGoal || (opp.hits || 0) >= seizeGoal)) return finish();
    if (recirc >= M.recircCap) return finish();
  }
  if (!bagsLeft() && !held && !onDeck && !oppHeld && !oppDeck && !oppBusy) finish();
}

function finish() {
  over = true;
  clearInterval(tick);
  clearInterval(beltWatch); beltWatch = null;
  clearTimers();
  if (ambience) ambience.pause();

  $('stage').classList.remove('running-you', 'running-b');
  render();

  const ys = scoreOf(you), os = scoreOf(opp);
  recordRound(ys, os);
  const roundLine = ys > os ? 'You win the round.' : ys < os ? 'Officer B wins the round.' : 'The round is a dead heat.';
  const why = !M.circulate ? ''
    : (seizeGoal && (you.hits || 0) >= seizeGoal) ? 'You reached ' + seizeGoal + ' seized and the shift stopped. '
    : (seizeGoal && (opp.hits || 0) >= seizeGoal) ? 'Officer B reached ' + seizeGoal + ' seized and the shift stopped. '
    : recirc >= M.recircCap ? 'The bags went round until there was nothing left worth taking. '
    : 'Nothing left on the belt. ';
  const verdict = series.best === 1 ? roundLine
    : series.done ? seriesVerdict()
    : roundLine + ' ' + series.youWins + '–' + series.oppWins + '.';
  const falseGrabs = wrongGrabs(you);

  const sheet = (who, p) => {
    const s = p.seized.filter(it => badFor(p, it)).length;
    return '<div class="sheet"><h3>' + who + '</h3><table>' +
      '<tr><td>Forbidden seized — ' + ((p.hits || 0) - (p.doubles || 0) * 2) + ' × 1</td><td>' +
        ((p.hits || 0) - (p.doubles || 0) * 2) + '</td></tr>' +
      '<tr><td>Your own line — ' + (p.doubles || 0) + ' × 2</td><td>' + ((p.doubles || 0) * 2) + '</td></tr>' +
      '<tr><td>Bags that went past you</td><td>' + (p.skipped || 0) + '</td></tr>' +
      '<tr><td>Forbidden seized — ' + s + ' × ' + VP_SEIZED + '</td><td>' + (s * VP_SEIZED) + '</td></tr>' +
      (wrongGrabs(p) ? '<tr class="neg"><td>Taken off somebody for nothing — ' + wrongGrabs(p) + ' × ' + VP_WRONG + '</td><td>' + (wrongGrabs(p) * VP_WRONG) + '</td></tr>' : '') +
      '<tr class="neg"><td>Let through — ' + p.missed.length + ' × ' + VP_MISSED +
        '</td><td>' + missPenalty(p) + '</td></tr>' +
      (leftovers ? '<tr class="neg"><td>Belt not cleared — ' + leftovers + ' × ' + VP_LEFT + '</td><td>' + (leftovers * VP_LEFT) + '</td></tr>' : '') +

      '<tr class="total"><td>Total</td><td>' + scoreOf(p) + '</td></tr></table>' +
      (p.missed.length ? '<p class="missed">Walked straight through: ' + p.missed.map(i => i.name.toLowerCase()).join(', ') + '</p>' : '') +
      '</div>';
  };

  $('result').innerHTML =
    '<div class="result-inner"><h2>' + verdict + '</h2>' +
    '<p class="verdict">' + (series.best > 1
      ? 'Round ' + series.round + ' of ' + series.best + ', standing at ' + series.youWins + '–' + series.oppWins + '. '
      : '') +
    (leftovers ? leftovers + ' tray' + (leftovers === 1 ? '' : 's') + ' never got looked at, which costs you both. ' : '') +
    why + (M.useBoard
      ? 'Turned over by the end: ' + board.filter(r => r.banned).map(r => r.cat.label.toLowerCase()).join(', ')
      : 'On the wall: ' + signsToday.map(sg => sg.label.toLowerCase()).join(', ')) + '. ' +
    (falseGrabs ? 'You also confiscated ' + falseGrabs + ' thing' + (falseGrabs === 1 ? '' : 's') +
      ' nobody was smuggling, which scores nothing and cost you time.' : '') + '</p>' +
    '<div class="sheets">' + sheet('You', you) + sheet('Officer B', opp) + '</div>' +
    (series.done ? '' :
      '<p class="verdict"><strong>' + (series.youWins > series.oppWins
        ? 'One more round and the match is yours.'
        : series.oppWins > series.youWins ? 'Lose the next one and the match is theirs.'
        : 'Level. The next round decides it.') + '</strong></p>') +
    '<div class="controls again">' +
    (series.done
      ? '<button class="go" id="again">Play again</button>'
      : '<button class="go" id="again">Next round</button>') +
    '<button class="check" id="menuBtn">Back to the menu</button></div></div>';
  $('result').hidden = false;
  $('again').onclick = () => {
    oppSay('Walking to the lane');
    if (series.done) { $('result').hidden = true; showMenu(); }
    else nextRound();
  };
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

function startSeries(gameKey, best, goal) {
  M = GAMES[gameKey] || GAMES.standard;
  useWide(!!M.wide);
  useLean(!!M.lean);
  tagCache = null;                  /* the board index differs per shift */
  setDeal(M.bags || M.perSide * 2, M.permitted, M.restricted, M.cap);
  seizeGoal = goal || 0;
  series.best = best; series.round = 1;
  series.youWins = series.oppWins = 0;
  series.youPts = series.oppPts = 0;
  series.done = false;
  $('menu').hidden = true;
  start();
  showBriefing();
}

function nextRound() {
  series.round++;
  $('result').hidden = true;
  start();
  showBriefing();
}

/* A drawn round goes to nobody. A match that ends level on rounds is settled
   on points across all of them, because somebody has to win. */
function recordRound(ys, os) {
  series.youPts += ys; series.oppPts += os;
  if (ys > os) series.youWins++; else if (os > ys) series.oppWins++;
  const need = series.best > 1 ? 2 : 1;
  const played = series.round;
  series.done = series.youWins >= need || series.oppWins >= need || played >= series.best;
}

function seriesVerdict() {
  if (series.youWins !== series.oppWins) return series.youWins > series.oppWins ? 'You take the match.' : 'Officer B takes the match.';
  if (series.youPts !== series.oppPts) return series.youPts > series.oppPts ? 'You take it on points.' : 'Officer B takes it on points.';
  return 'The match is a dead heat.';
}


loadSfx();
$('menu').hidden = false;
[].forEach.call(document.querySelectorAll('.mode'), b => {
  b.onclick = () => startSeries(b.getAttribute('data-game'),
    Number(b.getAttribute('data-best') || 1),
    Number(b.getAttribute('data-goal') || 0));
});
$('btnGo').onclick = goPressed;
$('btnPass').onclick = passPressed;
$('btnCheck').onclick = checkPressed;
$('mute').onclick = () => setMuted(!muted);
$('hudMute').onclick = () => setMuted(!muted);
$('briefGo').onclick = () => { $('brief').hidden = true; briefed = true; render(); };
setMuted(false);
start();
showMenu();
})();
