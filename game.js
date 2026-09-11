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
   their trays running right to left; you work the bottom half, left to right.
   The seized bin sits in the middle and both of you reach into it. */

const SW = 820, SH = 752;
const TRAY = { w: 180, h: 118 };
const ITEM = { w: 88, h: 123 };
const LID  = { w: 88, h: 123 };   /* the suitcase front is the same size — it covers the stack exactly */
const BIN = { x: 310, y: 350, w: 200, h: 80 };

/* your lane */
const YOU = { top: 622, offstage: -240, parkIn: 20, parkOut: 566, exit: 880, bench: 442 };
/* theirs, mirrored */
const THEM = { top: 42, offstage: 880, parkIn: 610, parkOut: 30, exit: -240, bench: 216 };

const SLOTS = [14, 114, 214, 314, 414, 514, 614, 714];

const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bad = it => it.restricted;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

let belt, held, onDeck, phase, opened, cards, started, t0, tick, oppTimer, over, scale = 1;
const you = { trays: 0, seized: [], missed: [] };
const opp = { trays: 0, seized: [], missed: [] };
let oppHeld = null, oppDeck = null, oppCards = [], oppBusy = false;
let movingYou = 0, movingThem = 0;
let hudShown = 0, hudAnim = null;
const timers = [];

/* every delayed step goes through here so a restart can cancel the lot */
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
function clearTimers() { timers.forEach(clearTimeout); timers.length = 0; }

/* ---------- stage fitting ---------- */

/* The whole point of the two-lane bench is seeing both stations at once, so
   the stage is fitted to the window as well as to the column. Reserve is the
   prompt and the buttons underneath it — without that the stage fills the
   viewport, you scroll down to reach the controls, and Officer B's half
   disappears off the top of the screen. */
function fit() {
  const wrap = $('stagewrap');
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  const reserve = 140;
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
  oppTimer = later(oppTurn, 2600);
}

/* ---------- machine ---------- */

function lamp(id, on, flashing) {
  $(id).className = 'arch-lamp' + (on ? ' red' : '') + (flashing ? ' flash' : '');
}

/* Each lane's rollers turn only while something in that lane is moving, so you
   can tell at a glance which side of the bench is busy. */
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

/* ---------- dragging (your side only) ---------- */

let drag = null;

function bindDrag(card) {
  const el = card.el;
  el.addEventListener('pointerdown', e => {
    if (phase !== 'flagged' && phase !== 'clear') return;
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
    if (card.kind === 'item') $('bin').classList.toggle('hot', inBin(el));
    if (drag.moved > 12 && card.kind === 'lid' && !opened) openCase();
    if (drag.moved > 12 && card.kind === 'item') card.inCase = false;
  });

  const release = () => {
    if (!drag || drag.card !== card) return;
    el.classList.remove('lift');
    $('bin').classList.remove('hot');
    const tap = drag.moved < 10;
    drag = null;
    if (tap) { onTap(card); return; }
    if (card.kind === 'item' && inBin(el)) seize(card);
    if (card.kind === 'lid' && onTray(el)) closeCase();
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}

function centreOf(el) {
  return { x: parseFloat(el.style.left) + ITEM.w / 2, y: parseFloat(el.style.top) + ITEM.h / 2 };
}

function inBin(el) {
  const c = centreOf(el);
  return c.x > BIN.x && c.x < BIN.x + BIN.w && c.y > BIN.y && c.y < BIN.y + BIN.h;
}

function onTray(el) {
  const c = centreOf(el);
  return c.x > YOU.parkOut - 60 && c.x < YOU.parkOut + TRAY.w + 60 &&
         c.y > YOU.top - 60 && c.y < YOU.top + TRAY.h + 60;
}

/* tap fallback so this works on a phone and with a keyboard */
function onTap(card) {
  if (phase !== 'flagged' && phase !== 'clear') return;
  if (card.kind === 'lid') {
    if (!opened) { openCase(); settle(card.el, 714, YOU.bench, -4); }
    else closeCase();
    return;
  }
  if (!opened) return;
  if (card.inCase) {
    card.inCase = false;
    settle(card.el, freeSlot(), YOU.bench, (Math.random() * 10) - 5);
    card.el.setAttribute('aria-label', 'Item card on the bench. Select again to seize it.');
  } else {
    seize(card);
  }
}

function openCase() {
  if (opened) return;
  opened = true;
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
  card.el.classList.add('binned');
  later(() => card.el.remove(), 320);
  cards = cards.filter(other => other !== card);
  drawTally();
}

function closeCase() {
  const c = centreOfTray(YOU);
  cards.forEach(cd => {
    if (cd.kind === 'item') settle(cd.el, c.x - ITEM.w / 2 + (Math.random() * 10 - 5), c.y - ITEM.h / 2, cd.rot);
  });
  const lid = cards.find(cd => cd.kind === 'lid');
  if (lid) settle(lid.el, c.x - LID.w / 2, c.y - LID.h / 2, 0);
  phase = 'closing';
  render();
  later(() => fileTray(true), 620);
}

/* ---------- your lane flow ----------
   Two parking spots. parkIn, before the arch, is where a closed tray waits.
   parkOut, past it, is where a scanned one sits while you work. Sending a tray
   through vacates parkIn, so the next rolls straight in and there is always
   something at your elbow. */

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

function scan() {
  phase = 'scanning'; render();
  move($('tray'), YOU.parkOut, 1250, () => {
    if (over) return;
    const dirty = held.bag.items.some(bad);
    lamp('lamp', dirty, dirty);
    phase = dirty ? 'flagged' : 'clear';
    $('trayCase').hidden = true;
    spawnCards();
    render();
  }, true);
  later(queueNext, 420);
  later(() => { if (!over && held) lamp('lamp', held.bag.items.some(bad), true); }, 600);
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

/* Closing a case files it. Anything restricted still inside goes through, and
   you get held at the bench for it. */
function fileTray(wasOpened) {
  you.trays++;
  const slipped = wasOpened ? held.bag.items.filter(bad) : [];
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

/* ---------- the hold ----------
   Letting something through costs points at the end anyway. The freeze is the
   part you feel during the shift: two seconds at your half of the bench while
   the belt keeps moving and B keeps working in front of you. */

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

function btn(label, fn, primary) {
  const b = document.createElement('button');
  b.textContent = label; b.onclick = fn;
  if (primary) b.className = 'go';
  return b;
}

function render() {
  const c = $('controls'); c.innerHTML = '';
  const p = $('prompt');

  if (over) { p.textContent = 'Shift over.'; return; }

  if (phase === 'idle') {
    if (!started) {
      p.innerHTML = 'Officer B is across the bench, working the same belt. Trays keep arriving until it is empty — whatever you leave on it, <strong>B can take</strong>.';
      c.appendChild(btn('Start the shift', () => { beginClock(); feedLane(); }, true));
    } else {
      p.textContent = 'Belt empty. Waiting on the other lane.';
    }
    return;
  }
  if (phase === 'rolling') { p.textContent = 'Tray coming down the belt.'; return; }
  if (phase === 'ready') {
    p.textContent = 'A closed suitcase in a tray. No idea what is under the lid until it goes through.';
    c.appendChild(btn('Send it through', scan, true));
    return;
  }
  if (phase === 'scanning') { p.textContent = 'Scanning.'; return; }

  if (phase === 'clear') {
    p.innerHTML = 'No light. Nothing restricted in there. Bin the suitcase and <strong>keep the tray</strong>.';
    c.appendChild(btn('Keep the tray', () => fileTray(false), true));
    if (held.bounces < BOUNCE_CAP) c.appendChild(btn('Back on the belt', bounce));
    return;
  }

  if (phase === 'flagged' && !opened) {
    p.innerHTML = 'Red light. Something in there is restricted, and the detector will not say how many. ' +
      '<strong>Drag the suitcase front off the tray</strong> to open it' +
      (held.bounces < BOUNCE_CAP ? ', or push the whole tray back onto the belt.' : '. This tray has been round twice, so it is yours now.');
    if (held.bounces < BOUNCE_CAP) c.appendChild(btn('Back on the belt', bounce));
    return;
  }

  if (phase === 'flagged' && opened) {
    p.innerHTML = 'The item cards are clear, so they print over each other. Slide them out onto the bench to read them, ' +
      'drag what is restricted into the middle bin, then <strong>put the front back on the tray to close it</strong>. There is no second scan.';
    return;
  }

  if (phase === 'closing') { p.textContent = 'Closing it up.'; return; }
  if (phase === 'leaving') { p.textContent = 'Tray away.'; return; }
  if (phase === 'frozen') { p.textContent = 'Held at the bench. The belt does not wait for you.'; return; }
}

/* ---------- Officer B ----------
   They work the same way you do, in front of you: tray in, scan, lift the
   front off, lay the cards out, and carry what they find into the shared bin.
   They are deliberately unhurried. What breaks them is the tray race — falling
   behind makes them cut a search short, and that is when things get past. */

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
  later(() => { if (!over && oppHeld) lamp('lampB', oppHeld.bag.items.some(bad), true); }, 600);
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
  lamp('lampB', contraband.length > 0, false);

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
  /* the front comes off first, set down beside the tray */
  later(() => { if (!over) settle(lidEl, 714, THEM.bench, 5); }, step);

  const items = oppCards.filter(cd => cd.kind === 'item');
  items.forEach((cd, i) => {
    later(() => { if (!over) settle(cd.el, SLOTS[i % SLOTS.length], THEM.bench, (Math.random() * 10) - 5); },
      step * (i + 2));
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
      settle(cd.el, BIN.x + BIN.w / 2 - ITEM.w / 2, BIN.y + BIN.h / 2 - ITEM.h / 2, 0);
      pop(BIN.x + BIN.w / 2 + 40, BIN.y - 6, '+' + VP_SEIZED, 'theirs');
      later(() => { cd.el.classList.add('binned'); later(() => cd.el.remove(), 320); }, 380);
      drawTally();
    }, 420 * i);
  });

  later(() => { if (!over) oppClose(missed); }, 420 * found.length + 520);
}

/* everything left goes back in, the front goes back on, the tray files */
function oppClose(missed) {
  if (over) return;
  const c = centreOfTray(THEM);
  oppCards.forEach(cd => {
    if (cd.kind === 'item') settle(cd.el, c.x - ITEM.w / 2 + (Math.random() * 10 - 5), c.y - ITEM.h / 2, 0);
  });
  const lid = oppCards.find(cd => cd.kind === 'lid');
  if (lid) later(() => settle(lid.el, c.x - LID.w / 2, c.y - LID.h / 2, 0), 220);
  oppSay('Closing it up');
  later(() => { if (!over) oppFile(missed); }, 700);
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

start();
})();
