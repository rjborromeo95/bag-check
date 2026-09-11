(function () {
'use strict';

const BAG_CAP = 8;   /* most a suitcase card can physically cover */
const BOUNCE_CAP = 2;
const VP_TRAY = 1;
const VP_SEIZED = 2;
const VP_MISSED = -3;
const FREEZE_MS = 2000;   /* the hold after letting something through */

/* ---------- the bench ----------
   One stage, two lanes facing each other. Officer B works the top half with
   their trays running right to left and their arch mirrored — head below the
   mouth, because they are standing on the other side of it. You work the
   bottom half, left to right, with your detector nearest you. The two seize
   trays sit between you and neither of them ever empties. */

const SW = 820, SH = 768;
const TRAY = { w: 180, h: 118 };
const ITEM = { w: 88, h: 123 };
const LID  = { w: 88, h: 123 };   /* the suitcase front is the same size — it covers the stack exactly */

/* your lane */
const YOU  = { top: 634, offstage: -240, parkIn: 20, parkOut: 566, exit: 880, bench: 452 };
/* theirs, mirrored */
const THEM = { top: 4, offstage: 880, parkIn: 610, parkOut: 30, exit: -240, bench: 180 };

/* the seize trays, and the grid of slots inside one */
const SEIZE_YOU  = { x: 434, y: 312, w: 350, h: 128 };
const SEIZE_THEM = { x: 36,  y: 312, w: 350, h: 128 };
const STOW = { scale: 0.42, cols: 8, dx: 42, dy: 52, ox: 8, oy: 20 };

const SLOTS = [14, 114, 214, 314, 414, 514, 614, 714];
const LID_PARK = 714;

const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bad = it => it.restricted;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

let belt, held, onDeck, phase, opened, cards, started, t0, tick, over, scale = 1;
const you = { trays: 0, seized: [], missed: [] };
const opp = { trays: 0, seized: [], missed: [] };
let oppHeld = null, oppDeck = null, oppCards = [], oppBusy = false;
let stowYou = [], stowThem = [];
let movingYou = 0, movingThem = 0;
let hudShown = 0, hudAnim = null;
const timers = [];

/* every delayed step goes through here so a restart can cancel the lot */
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
function clearTimers() { timers.forEach(clearTimeout); timers.length = 0; }

/* ---------- stage fitting ---------- */

/* The point of the two-lane bench is seeing both stations at once, so the
   stage is fitted to the window as well as to the column. Reserve is the
   buttons and the prompt underneath it — without that the stage fills the
   viewport, you scroll down to reach the controls, and B's half disappears
   off the top of the screen. */
function fit() {
  const wrap = $('stagewrap');
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  const reserve = 150;
  const room = Math.max(320, window.innerHeight - top - reserve);
  scale = Math.min(1, wrap.clientWidth / SW, room / SH);
  $('stage').style.transform = 'scale(' + scale + ')';
  wrap.style.height = Math.round(SH * scale) + 'px';
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

  /* every suitcase needs at least one item, and none can hold more than a
     suitcase card covers — move cards off the fattest onto the thinnest */
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
  started = false; over = false; movingYou = movingThem = 0;
  clearCards(); clearOppCards();
  stowYou.forEach(el => el.remove()); stowYou = [];
  stowThem.forEach(el => el.remove()); stowThem = [];
  ['tray', 'tray2'].forEach(id => park($(id), YOU.offstage));
  ['trayB', 'trayB2'].forEach(id => park($(id), THEM.offstage));
  $('freeze').hidden = true;
  $('result').hidden = true;
  lamp('lamp', false); lamp('lampB', false);
  hudShown = 0; $('hudScore').textContent = '0';
  fit(); drawQueue(); drawTally(); render();
}

function park(el, x) {
  el.hidden = true;
  el.style.transition = 'none';
  el.style.left = x + 'px';
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

function lamp(id, on, flashing) {
  const el = $(id);
  const wasRed = el.classList.contains('red');
  el.className = 'arch-lamp' + (on ? ' red' : '') + (flashing ? ' flash' : '');
  if (on && !wasRed) play('beep', id === 'lamp' ? 0.5 : SFX_THEM);
}

/* Each lane's rollers turn only while something in that lane is moving, so you
   can tell at a glance which side of the bench is busy. Checking a bag stops
   your belt, because nothing of yours is moving while you work. */
function move(el, x, ms, then, mine) {
  if (mine) { movingYou++; $('stage').classList.add('running-you'); }
  else { movingThem++; $('stage').classList.add('running-b'); }
  el.hidden = false;
  el.style.left = x + 'px';
  later(() => {
    if (mine) { movingYou = Math.max(0, movingYou - 1); if (!movingYou) $('stage').classList.remove('running-you'); }
    else { movingThem = Math.max(0, movingThem - 1); if (!movingThem) $('stage').classList.remove('running-b'); }
    if (then) then();
  }, ms);
}

function roll(el, x, ms, then, mine) {
  el.style.transition = 'none';
  void el.offsetWidth;
  el.style.transition = '';
  move(el, x, ms, then, mine);
}

/* ---------- sound ----------
   Foley for the bench. Each group has one or more takes; a take is chosen at
   random and never the same one twice running, with a touch of pitch wobble so
   repeats of a small group don't sound mechanical.

   Cards speak when they move between the tray and the bench, in either
   direction, and the suitcase front speaks when it comes off and goes back on.
   Officer B's case is audible too, quietly, so you can hear the other lane
   working — SFX_THEM is the volume for that, and 0 turns it off. */

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
  beep:     ['beep']
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

/* Browsers refuse audio until the page has been clicked, which is exactly what
   Go is for. */
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

/* a number that lifts off whatever just earned it */
function pop(x, y, text, kind) {
  const el = document.createElement('span');
  el.className = 'pop' + (kind ? ' ' + kind : '');
  el.textContent = text;
  el.style.left = Math.round(x) + 'px';
  el.style.top = Math.round(y) + 'px';
  $('stage').appendChild(el);
  later(() => el.remove(), 1100);
}

/* the headline counter ticks up to the new total rather than jumping to it */
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

function centreOfTray(lane) { return { x: lane.parkOut + TRAY.w / 2, y: lane.top + TRAY.h / 2 }; }

function makeCard(item, front, theirs) {
  const el = document.createElement(theirs ? 'div' : 'button');
  el.className = 'card ' + (item ? 'item' : 'lid') + (theirs ? ' theirs' : '');
  el.innerHTML = item ? itemFace(item) : suitcaseFace(front);
  if (theirs) el.setAttribute('aria-hidden', 'true');
  return el;
}

function spawnCards() {
  const c = centreOfTray(YOU);
  held.bag.items.forEach(it => {
    const el = makeCard(it, null, false);
    el.setAttribute('aria-label', 'Item card, still in the case');
    const jx = (Math.random() * 6) - 3, jy = (Math.random() * 6) - 3;
    const rot = (Math.random() * 2.4) - 1.2;
    place(el, c.x - ITEM.w / 2 + jx, c.y - ITEM.h / 2 + jy, rot);
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

function settle(el, x, y, rot) {
  el.classList.add('settle');
  place(el, x, y, rot);
  later(() => el.classList.remove('settle'), 340);
}

function freeSlot() {
  const taken = cards.filter(c => c.kind === 'item' && !c.inCase).length;
  return SLOTS[taken % SLOTS.length];
}

/* where the next seized card lands inside a seize tray */
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
    if (card.kind === 'item') $('seizeYou').classList.toggle('hot', inSeize(el));
    if (drag.moved > 12 && card.kind === 'lid' && !opened) openCase();
    if (drag.moved > 12 && card.kind === 'item' && card.inCase) { card.inCase = false; playItem(card.item); }
  });

  const release = () => {
    if (!drag || drag.card !== card) return;
    el.classList.remove('lift');
    $('seizeYou').classList.remove('hot');
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
  return c.x > YOU.parkOut - 60 && c.x < YOU.parkOut + TRAY.w + 60 &&
         c.y > YOU.top - 60 && c.y < YOU.top + TRAY.h + 60;
}

/* tap fallback so this works on a phone and with a keyboard */
function onTap(card) {
  if (phase !== 'searching') return;
  if (card.kind === 'lid') {
    if (!opened) { openCase(); settle(card.el, LID_PARK, YOU.bench, -4); }
    else closeCase();
    return;
  }
  if (!opened) return;
  if (card.inCase) {
    card.inCase = false;
    playItem(card.item);
    settle(card.el, freeSlot(), YOU.bench, (Math.random() * 10) - 5);
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
  if (card.item.restricted) pop(c.x - 14, c.y - 28, '+' + VP_SEIZED, 'good');
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
  const c = centreOfTray(YOU);
  let n = 0;
  cards.forEach(cd => {
    if (cd.kind !== 'item') return;
    settle(cd.el, c.x - ITEM.w / 2 + (Math.random() * 10 - 5), c.y - ITEM.h / 2, cd.rot);
    if (!cd.inCase) { const it = cd.item; cd.inCase = true; later(() => playItem(it, SFX_VOL * 0.85), 70 * n++); }
  });
  const lid = cards.find(cd => cd.kind === 'lid');
  if (lid) settle(lid.el, c.x - LID.w / 2, c.y - LID.h / 2, 0);
  later(() => play('shut'), 70 * n + 180);
  opened = false;
  render();
}

/* ---------- lane flow ----------
   Two parking spots. parkIn, before the arch, is where a closed tray waits.
   parkOut, past it, is where a scanned one sits while you work. Go moves the
   belt on one step: it fetches the first tray, and after that it sends
   whatever is waiting through the detector. */

function feedLane() {
  if (over || held) return;
  if (!belt.length) { phase = 'idle'; $('tray').hidden = true; render(); checkEnd(); return; }
  held = belt.shift();
  opened = false;
  clearCards();
  lamp('lamp', false);
  $('trayCase').innerHTML = suitcaseFace(held.front);
  $('trayCase').hidden = false;
  $('tray').style.left = YOU.offstage + 'px';
  phase = 'rolling';
  drawQueue(); render();
  roll($('tray'), YOU.parkIn, 1200, () => {
    if (!over && phase === 'rolling') { phase = 'ready'; render(); }
  }, true);
}

/* the on-deck tray, rolling into the spot the scanned one just left */
function queueNext() {
  if (over || onDeck || !belt.length) return;
  onDeck = belt.shift();
  $('tray2Case').innerHTML = suitcaseFace(onDeck.front);
  $('tray2').style.left = YOU.offstage + 'px';
  drawQueue();
  roll($('tray2'), YOU.parkIn, 1200, null, true);
}

/* the tray you were working has gone; whatever is waiting becomes yours */
function promote() {
  if (over) return;
  if (!onDeck) { feedLane(); return; }
  held = onDeck; onDeck = null;
  opened = false;
  clearCards();
  lamp('lamp', false);
  $('tray2').hidden = true;
  $('trayCase').innerHTML = suitcaseFace(held.front);
  $('trayCase').hidden = false;
  park($('tray'), YOU.parkIn);
  $('tray').hidden = false;
  void $('tray').offsetWidth;
  $('tray').style.transition = '';
  phase = 'ready';
  drawQueue(); render();
}

/* Go */
function goPressed() {
  if (!started) { beginClock(); feedLane(); return; }
  if (phase === 'ready') scan();
}

function scan() {
  phase = 'scanning'; render();
  move($('tray'), YOU.parkOut, 1250, () => {
    if (over) return;
    phase = 'scanned';
    render();
  }, true);
  later(queueNext, 420);
  later(() => { if (!over && held) lamp('lamp', held.bag.items.some(bad), true); }, 700);
}

/* Check — the belt stops and the suitcase becomes yours to open */
function checkPressed() {
  if (phase !== 'scanned') return;
  phase = 'searching';
  $('trayCase').hidden = true;
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
  move($('tray'), YOU.exit, 900, () => {
    $('tray').hidden = true;
    held = null; lamp('lamp', false);
    drawQueue(); wakeOpp();
    promote();
  }, true);
}

/* Anything restricted still in the case goes through, and you get held at the
   bench for it. */
function fileTray() {
  you.trays++;
  const slipped = held.bag.items.filter(bad);
  slipped.forEach(it => you.missed.push(it));
  const c = centreOfTray(YOU);
  if (slipped.length) pop(c.x - 22, c.y - 96, String(VP_MISSED * slipped.length), 'bad');
  else pop(c.x - 12, c.y - 96, '+' + VP_TRAY, 'good');

  phase = 'leaving'; render();
  cards.forEach(cd => cd.el.classList.add('binned'));
  later(clearCards, 320);
  move($('tray'), YOU.exit, 900, () => {
    $('tray').hidden = true;
    held = null; opened = false; lamp('lamp', false);
    drawTally();
    if (slipped.length) freeze(slipped.length); else promote();
  }, true);
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

/* ---------- controls + copy ----------
   Three buttons, always in the same place under your detector, greyed when
   they don't apply. Go runs the belt, Check stops it and opens the case, Pass
   sends the tray on. Bounce is the fourth and only shows when the rules allow
   it — it is a real rule, but not one of the three you press every tray. */

function render() {
  const p = $('prompt');
  const go = $('btnGo'), pass = $('btnPass'), check = $('btnCheck'), back = $('btnBounce');
  const set = (b, on) => { b.disabled = !on; };
  set(go, false); set(pass, false); set(check, false);
  back.hidden = true;
  check.classList.toggle('active', phase === 'searching');

  if (over) { p.textContent = 'Shift over.'; return; }

  if (phase === 'idle') {
    if (!started) {
      set(go, true);
      p.innerHTML = 'Officer B is across the bench, working the same belt. <strong>Go</strong> starts it and pushes the first tray down to you.';
    } else {
      p.textContent = 'Belt empty. Waiting on the other lane.';
    }
    return;
  }
  if (phase === 'rolling') { p.textContent = 'Tray coming down the belt.'; return; }

  if (phase === 'ready') {
    set(go, true);
    p.innerHTML = 'A closed suitcase in a tray. No idea what is under the lid until it goes through. <strong>Go</strong> sends it into the detector.';
    return;
  }
  if (phase === 'scanning') { p.textContent = 'Scanning.'; return; }

  if (phase === 'scanned') {
    set(pass, true); set(check, true);
    back.hidden = held.bounces >= BOUNCE_CAP;
    const dirty = held.bag.items.some(bad);
    p.innerHTML = dirty
      ? 'Red light. Something in there is restricted, and the detector will not say how many. <strong>Check</strong> stops the belt and opens the case. <strong>Pass</strong> sends it through as it is.'
      : 'No light. Nothing restricted in there. <strong>Pass</strong> keeps the tray and moves the belt on.';
    return;
  }

  if (phase === 'searching') {
    if (!opened) {
      set(pass, true);
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
   They work the same way you do, in front of you: tray in, scan, lift the
   front off, lay the cards out, and carry what they find into their own seize
   tray, where it stays. They are deliberately unhurried. What breaks them is
   the tray race — falling behind makes them cut a search short, and that is
   when things get past. */

function wakeOpp() { if (!over && started && !oppBusy && belt.length) later(oppTurn, 900); }
function oppSay(t) { $('oppDoing').textContent = t; }

/* 0 = comfortable, 1 = being buried by the other lane */
function oppRush() { return clamp((you.trays - opp.trays) / 6, 0, 1); }

function oppTurn() {
  if (over) return;
  const fromDeck = !!oppDeck;
  if (oppDeck) { oppHeld = oppDeck; oppDeck = null; $('trayB2').hidden = true; }
  else if (belt.length) { oppHeld = belt.shift(); }
  else { oppBusy = false; oppSay('Nothing on the belt'); checkEnd(); return; }

  oppBusy = true;
  clearOppCards();
  lamp('lampB', false);
  drawQueue();
  $('trayBCase').innerHTML = suitcaseFace(oppHeld.front);
  $('trayBCase').hidden = false;
  oppSay(oppRush() > 0.55 ? 'Hurrying a tray in' : 'Taking the next tray');

  if (fromDeck) {
    park($('trayB'), THEM.parkIn);
    $('trayB').hidden = false;
    void $('trayB').offsetWidth;
    $('trayB').style.transition = '';
    later(oppScan, 700);
  } else {
    $('trayB').style.left = THEM.offstage + 'px';
    roll($('trayB'), THEM.parkIn, 1200, oppScan, false);
  }
}

function oppScan() {
  if (over) return;
  oppSay('Sending it through');
  move($('trayB'), THEM.parkOut, 1250, oppAfterScan, false);
  later(oppQueueNext, 420);
  later(() => { if (!over && oppHeld) lamp('lampB', oppHeld.bag.items.some(bad), true); }, 700);
}

function oppQueueNext() {
  if (over || oppDeck || !belt.length) return;
  oppDeck = belt.shift();
  $('trayB2Case').innerHTML = suitcaseFace(oppDeck.front);
  $('trayB2').style.left = THEM.offstage + 'px';
  drawQueue();
  roll($('trayB2'), THEM.parkIn, 1200, null, false);
}

function oppAfterScan() {
  if (over) return;
  const contraband = oppHeld.bag.items.filter(bad);
  const size = oppHeld.bag.items.length;
  const rush = oppRush();

  if (!contraband.length) {
    oppSay('No light — tray kept');
    later(() => oppFile([]), 800);
    return;
  }

  /* bouncing costs a tray, so an officer who is behind stops doing it */
  const bounceOdds = 0.4 * (1 - rush) * (size >= 5 ? 1 : 0.3);
  if (oppHeld.bounces < BOUNCE_CAP && Math.random() < bounceOdds) {
    oppSay('Pushed a tray back');
    oppHeld.bounces++;
    belt.push(oppHeld);
    drawQueue();
    move($('trayB'), THEM.exit, 900, () => {
      $('trayB').hidden = true;
      oppHeld = null; lamp('lampB', false);
      oppBusy = false;
      later(oppTurn, 500);
    }, false);
    return;
  }

  oppOpen(contraband, size, rush);
}

/* lift the front off and lay the bag out, one card at a time */
function oppOpen(contraband, size, rush) {
  const c = centreOfTray(THEM);
  $('trayBCase').hidden = true;
  oppSay(rush > 0.5 ? 'Skimming a bag' : 'Going through a bag');
  play('open', SFX_THEM);

  oppHeld.bag.items.forEach(it => {
    const el = makeCard(it, null, true);
    const rot = (Math.random() * 2.4) - 1.2;
    place(el, c.x - ITEM.w / 2 + (Math.random() * 6 - 3), c.y - ITEM.h / 2 + (Math.random() * 6 - 3), rot);
    $('stage').appendChild(el);
    oppCards.push({ el, item: it, kind: 'item' });
  });
  const lidEl = makeCard(null, oppHeld.front, true);
  place(lidEl, c.x - LID.w / 2, c.y - LID.h / 2, 0);
  $('stage').appendChild(lidEl);
  oppCards.push({ el: lidEl, kind: 'lid' });

  const step = Math.round(200 * (1 - 0.4 * rush));
  later(() => { if (!over) settle(lidEl, LID_PARK, THEM.bench, 5); }, step);

  const items = oppCards.filter(cd => cd.kind === 'item');
  items.forEach((cd, i) => {
    later(() => {
      if (over) return;
      settle(cd.el, SLOTS[i % SLOTS.length], THEM.bench, (Math.random() * 10) - 5);
      playItem(cd.item, SFX_THEM);
    }, step * (i + 2));
  });

  const laidOut = step * (items.length + 2);
  const dwell = Math.round((500 + 260 * size) * (1 - 0.4 * rush));
  later(() => { if (!over) oppSearch(contraband, size, rush); }, laidOut + dwell);
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

  found.forEach((it, i) => {
    later(() => {
      if (over) return;
      const cd = oppCards.find(x => x.item && x.item.uid === it.uid);
      if (!cd) return;
      oppCards = oppCards.filter(x => x !== cd);
      opp.seized.push(it);
      playItem(it, SFX_THEM);
      stow(cd.el, SEIZE_THEM, stowThem);
      pop(SEIZE_THEM.x + SEIZE_THEM.w - 60, SEIZE_THEM.y - 26, '+' + VP_SEIZED, 'theirs');
      drawTally();
    }, 420 * i);
  });

  later(() => { if (!over) oppClose(missed); }, 420 * found.length + 520);
}

/* everything left goes back in, the front goes back on, the tray files */
function oppClose(missed) {
  if (over) return;
  const c = centreOfTray(THEM);
  let n = 0;
  oppCards.forEach(cd => {
    if (cd.kind !== 'item') return;
    settle(cd.el, c.x - ITEM.w / 2 + (Math.random() * 10 - 5), c.y - ITEM.h / 2, 0);
    const it = cd.item;
    later(() => playItem(it, SFX_THEM * 0.85), 70 * n++);
  });
  const lid = oppCards.find(cd => cd.kind === 'lid');
  if (lid) later(() => settle(lid.el, c.x - LID.w / 2, c.y - LID.h / 2, 0), 220);
  later(() => play('shut', SFX_THEM), 70 * n + 200);
  oppSay('Closing it up');
  later(() => { if (!over) oppFile(missed); }, 800);
}

function oppFile(missed) {
  if (over) return;
  opp.trays++;
  missed.forEach(it => opp.missed.push(it));
  const c = centreOfTray(THEM);
  if (missed.length) pop(c.x - 22, c.y + 92, String(VP_MISSED * missed.length), 'bad');
  else pop(c.x - 12, c.y + 92, '+' + VP_TRAY, 'theirs');
  drawTally();

  oppCards.forEach(cd => cd.el.classList.add('binned'));
  later(clearOppCards, 320);
  oppSay(missed.length ? 'Filed it — something got past' : 'Filed a bag');
  move($('trayB'), THEM.exit, 900, () => {
    $('trayB').hidden = true;
    oppHeld = null; lamp('lampB', false);
    oppBusy = false;
    later(oppTurn, 500);
  }, false);
}

/* ---------- score ---------- */

function scoreOf(p) { return p.trays * VP_TRAY + p.seized.filter(bad).length * VP_SEIZED + p.missed.length * VP_MISSED; }

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

  const rail = $('evidence');
  rail.innerHTML = you.seized.length
    ? you.seized.map(it => '<span class="chip' + (it.restricted ? ' bad' : '') + '">' + itemChip(it) + it.name + '</span>').join('')
    : '<span class="evidence-none">Nothing seized yet</span>';
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
  const falseGrabs = you.seized.filter(it => !it.restricted).length;

  const sheet = (who, p) => {
    const s = p.seized.filter(bad).length;
    return '<div class="sheet"><h3>' + who + '</h3><table>' +
      '<tr><td>Trays kept — ' + p.trays + ' × ' + VP_TRAY + '</td><td>' + (p.trays * VP_TRAY) + '</td></tr>' +
      '<tr><td>Restricted seized — ' + s + ' × ' + VP_SEIZED + '</td><td>' + (s * VP_SEIZED) + '</td></tr>' +
      '<tr class="neg"><td>Let through — ' + p.missed.length + ' × ' + VP_MISSED + '</td><td>' + (p.missed.length * VP_MISSED) + '</td></tr>' +
      '<tr class="total"><td>Total</td><td>' + scoreOf(p) + '</td></tr></table>' +
      (p.missed.length ? '<p class="missed">Walked straight through: ' + p.missed.map(i => i.name.toLowerCase()).join(', ') + '</p>' : '') +
      '</div>';
  };

  $('result').innerHTML =
    '<div class="result-inner"><h2>' + verdict + '</h2>' +
    '<p class="verdict">The belt is empty, so the shift ends. ' +
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
