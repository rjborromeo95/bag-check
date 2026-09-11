(function () {
'use strict';

const BAG_CAP = 8;   /* most a suitcase card can physically cover */
const BOUNCE_CAP = 2;
const VP_TRAY = 1;
const VP_SEIZED = 2;
const VP_MISSED = -3;
const FREEZE_MS = 2000;   /* the hold after letting something through */

const SW = 760, SH = 540;
const TRAY = { w: 200, h: 170, top: 82 };
const PARK_IN = 24, PARK_OUT = 500, OFFSTAGE = -240, EXIT = 820;
const ITEM = { w: 104, h: 146 };
const LID  = { w: 104, h: 146 };   /* the suitcase front is the same size — it covers the stack exactly */
const BIN = { x: 30, y: 352, w: 200, h: 156 };
const SLOTS = [[266, 282], [388, 282], [510, 282], [632, 282], [388, 380], [510, 380], [632, 380], [266, 380]];

const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bad = it => it.restricted;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

let belt, held, onDeck, phase, opened, cards, started, t0, tick, oppTimer, over, scale = 1;
const you = { trays: 0, seized: [], missed: [] };
const opp = { trays: 0, seized: [], missed: [] };
let oppBusy = false;
let moving = 0;
let hudShown = 0, hudAnim = null;

/* ---------- stage fitting ---------- */

function fit() {
  const wrap = $('stagewrap');
  scale = Math.min(1, wrap.clientWidth / SW);
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
  belt = deal(); held = null; onDeck = null; phase = 'idle'; opened = false; cards = [];
  you.trays = opp.trays = 0; you.seized = []; you.missed = []; opp.seized = []; opp.missed = [];
  started = false; over = false; oppBusy = false; moving = 0;
  clearCards();
  ['tray', 'tray2'].forEach(id => {
    const t = $(id);
    t.hidden = true; t.style.transition = 'none'; t.style.left = OFFSTAGE + 'px';
  });
  $('freeze').hidden = true;
  $('result').hidden = true;
  lamp(false);
  hudShown = 0; $('hudScore').textContent = '0';
  fit(); drawQueue(); drawTally(); render();
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
  oppTimer = setTimeout(oppTurn, 3200);
}

/* ---------- machine ---------- */

function lamp(on, flashing) {
  const l = $('lamp');
  l.className = 'arch-lamp' + (on ? ' red' : '') + (flashing ? ' flash' : '');
}

function rolling(on) { $('stage').classList.toggle('running', !!on); }

/* Every tray movement goes through here, so the rollers turn whenever
   anything is actually moving — there can be two trays in the lane now. */
function move(el, x, ms, then) {
  moving++; rolling(true);
  el.style.left = x + 'px';
  setTimeout(() => {
    moving = Math.max(0, moving - 1);
    if (!moving) rolling(false);
    if (then) then();
  }, ms);
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
  setTimeout(() => el.remove(), 1100);
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

function clearCards() {
  cards.forEach(c => c.el.remove());
  cards = [];
}

function trayCentre() { return { x: PARK_OUT + TRAY.w / 2, y: TRAY.top + TRAY.h / 2 }; }

function spawnCards() {
  const c = trayCentre();
  held.bag.items.forEach(it => {
    const el = document.createElement('button');
    el.className = 'card item';
    el.innerHTML = itemFace(it);
    el.setAttribute('aria-label', 'Item card, still in the case');
    const jx = (Math.random() * 6) - 3, jy = (Math.random() * 6) - 3;
    const rot = (Math.random() * 2.4) - 1.2;
    place(el, c.x - ITEM.w / 2 + jx, c.y - ITEM.h / 2 + jy, rot);
    $('stage').appendChild(el);
    const card = { el, item: it, kind: 'item', inCase: true, rot };
    cards.push(card);
    bindDrag(card);
  });

  const lid = document.createElement('button');
  lid.className = 'card lid';
  lid.innerHTML = suitcaseFace(held.front);
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

function settle(card, x, y, rot) {
  card.el.classList.add('settle');
  place(card.el, x, y, rot);
  setTimeout(() => card.el.classList.remove('settle'), 340);
}

function freeSlot() {
  const taken = cards.filter(c => c.kind === 'item' && !c.inCase).length;
  return SLOTS[taken % SLOTS.length];
}

/* ---------- dragging ---------- */

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
    const w = card.kind === 'lid' ? LID.w : ITEM.w;
    const h = card.kind === 'lid' ? LID.h : ITEM.h;
    const nx = clamp(p.x - drag.dx, 4, SW - w - 6);
    const ny = clamp(p.y - drag.dy, 4, SH - h - 6);
    drag.moved += Math.abs(nx - parseFloat(el.style.left)) + Math.abs(ny - parseFloat(el.style.top));
    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
    if (card.kind === 'item') $('bin').classList.toggle('hot', inBin(card));
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
    if (card.kind === 'item' && inBin(card)) seize(card);
    if (card.kind === 'lid' && onTray(card)) closeCase();
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}

function centreOf(card) {
  const w = card.kind === 'lid' ? LID.w : ITEM.w;
  const h = card.kind === 'lid' ? LID.h : ITEM.h;
  return { x: parseFloat(card.el.style.left) + w / 2, y: parseFloat(card.el.style.top) + h / 2 };
}

function inBin(card) {
  const c = centreOf(card);
  return c.x > BIN.x && c.x < BIN.x + BIN.w && c.y > BIN.y && c.y < BIN.y + BIN.h;
}

function onTray(card) {
  const c = centreOf(card);
  return c.x > PARK_OUT - 60 && c.x < PARK_OUT + TRAY.w + 60 && c.y > TRAY.top - 60 && c.y < TRAY.top + TRAY.h + 60;
}

/* tap fallback so this works on a phone and with a keyboard */
function onTap(card) {
  if (phase !== 'flagged' && phase !== 'clear') return;
  if (card.kind === 'lid') {
    if (!opened) { openCase(); settle(card, 96, 300, -4); }
    else closeCase();
    return;
  }
  if (!opened) return;
  if (card.inCase) {
    const s = freeSlot();
    card.inCase = false;
    settle(card, s[0], s[1], (Math.random() * 10) - 5);
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
  const c = centreOf(card);
  held.bag.items = held.bag.items.filter(x => x.uid !== card.item.uid);
  you.seized.push(card.item);
  if (card.item.restricted) pop(c.x - 14, c.y - 28, '+' + VP_SEIZED, 'good');
  card.el.classList.add('binned');
  setTimeout(() => card.el.remove(), 320);
  cards = cards.filter(other => other !== card);
  drawTally();
}

function closeCase() {
  const c = trayCentre();
  cards.forEach(cd => {
    if (cd.kind === 'item') settle(cd, c.x - ITEM.w / 2 + (Math.random() * 10 - 5), c.y - ITEM.h / 2, cd.rot);
  });
  const lid = cards.find(cd => cd.kind === 'lid');
  if (lid) settle(lid, c.x - LID.w / 2, c.y - LID.h / 2, 0);
  phase = 'closing';
  render();
  setTimeout(() => fileTray(true), 620);
}

/* ---------- lane flow ----------
   Two parking spots. PARK_IN, left of the arch, is where a closed tray waits.
   PARK_OUT, right of it, is where a scanned one sits while you work. Sending a
   tray through vacates PARK_IN, so the next one rolls straight in and there is
   always something waiting on your left. */

function feedLane() {
  if (over || held) return;
  if (!belt.length) { phase = 'idle'; $('tray').hidden = true; render(); checkEnd(); return; }
  held = belt.shift();
  opened = false;
  clearCards();
  lamp(false);
  const t = $('tray');
  $('trayCase').innerHTML = suitcaseFace(held.front);
  $('trayCase').hidden = false;
  t.hidden = false;
  t.style.transition = 'none';
  t.style.left = OFFSTAGE + 'px';
  void t.offsetWidth;
  t.style.transition = '';
  phase = 'rolling';
  drawQueue(); render();
  move(t, PARK_IN, 1200, () => { if (!over && phase === 'rolling') { phase = 'ready'; render(); } });
}

/* the on-deck tray, rolling into the spot the scanned one just left */
function queueNext() {
  if (over || onDeck || !belt.length) return;
  onDeck = belt.shift();
  const t = $('tray2');
  $('tray2Case').innerHTML = suitcaseFace(onDeck.front);
  t.hidden = false;
  t.style.transition = 'none';
  t.style.left = OFFSTAGE + 'px';
  void t.offsetWidth;
  t.style.transition = '';
  drawQueue();
  move(t, PARK_IN, 1200);
}

/* the tray you were working has gone; whatever is waiting becomes yours */
function promote() {
  if (over) return;
  if (!onDeck) { feedLane(); return; }
  held = onDeck; onDeck = null;
  opened = false;
  clearCards();
  lamp(false);
  $('tray2').hidden = true;
  const t = $('tray');
  $('trayCase').innerHTML = suitcaseFace(held.front);
  $('trayCase').hidden = false;
  t.style.transition = 'none';
  t.style.left = PARK_IN + 'px';
  t.hidden = false;
  void t.offsetWidth;
  t.style.transition = '';
  phase = 'ready';
  drawQueue(); render();
}

function scan() {
  phase = 'scanning'; render();
  move($('tray'), PARK_OUT, 1250, () => {
    if (over) return;
    const dirty = held.bag.items.some(bad);
    lamp(dirty, dirty);
    phase = dirty ? 'flagged' : 'clear';
    $('trayCase').hidden = true;
    spawnCards();
    render();
  });
  setTimeout(queueNext, 420);
  setTimeout(() => { if (!over && held) lamp(held.bag.items.some(bad), true); }, 600);
}

function bounce() {
  held.bounces++;
  belt.push(held);
  clearCards();
  phase = 'leaving'; render();
  move($('tray'), EXIT, 900, () => {
    $('tray').hidden = true;
    held = null; lamp(false);
    drawQueue(); wakeOpp();
    promote();
  });
}

/* Closing a case files it. Anything restricted still inside goes through, and
   you get held at the bench for it. */
function fileTray(wasOpened) {
  you.trays++;
  const slipped = wasOpened ? held.bag.items.filter(bad) : [];
  slipped.forEach(it => you.missed.push(it));
  const c = trayCentre();
  if (slipped.length) pop(c.x - 22, c.y - 86, String(VP_MISSED * slipped.length), 'bad');
  else pop(c.x - 12, c.y - 86, '+' + VP_TRAY, 'good');

  phase = 'leaving'; render();
  cards.forEach(cd => cd.el.classList.add('binned'));
  setTimeout(() => clearCards(), 320);
  move($('tray'), EXIT, 900, () => {
    $('tray').hidden = true;
    held = null; opened = false; lamp(false);
    drawTally();
    if (slipped.length) freeze(slipped.length); else promote();
  });
}

/* ---------- the hold ----------
   Letting something through costs points at the end anyway. The freeze is the
   part you feel during the shift: two seconds at the bench while the belt keeps
   moving and Officer B keeps working. */

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
      p.innerHTML = 'Two officers, one belt. Trays keep arriving until it is empty — whatever you leave on it, <strong>Officer B can take</strong>.';
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
      'drop what is restricted in the bin, then <strong>put the front back on the tray to close it</strong>. There is no second scan.';
    return;
  }

  if (phase === 'closing') { p.textContent = 'Closing it up.'; return; }
  if (phase === 'leaving') { p.textContent = 'Tray away.'; return; }
  if (phase === 'frozen') { p.textContent = 'Held at the bench. The belt does not wait for you.'; return; }
}

/* ---------- opponent ----------
   Officer B is not fast, but they are methodical: they work a bag in passes,
   and a thin bag gets picked clean. What breaks them is falling behind on
   trays. Being buried makes them hurry — one pass instead of two, less time
   on each bag, and no appetite for pushing anything back. */

function wakeOpp() { if (!over && started && !oppBusy && belt.length) setTimeout(oppTurn, 900); }
function oppSay(t) { $('oppDoing').textContent = t; }

/* 0 = comfortable, 1 = being buried by the other lane */
function oppRush() { return clamp((you.trays - opp.trays) / 5, 0, 1); }

function oppTurn() {
  if (over) return;
  if (!belt.length) { oppBusy = false; oppSay('Nothing on the belt'); checkEnd(); return; }
  oppBusy = true;
  const tray = belt.shift();
  drawQueue();
  const rush = oppRush();
  oppSay(rush > 0.55 ? 'Hurrying a tray through' : 'Scanning a tray');

  setTimeout(() => {
    if (over) return;
    const contraband = tray.bag.items.filter(bad);
    const size = tray.bag.items.length;

    if (!contraband.length) {
      oppSay('No light — tray kept');
      setTimeout(() => { opp.trays++; drawTally(); oppBusy = false; oppTurn(); }, 800);
      return;
    }

    /* bouncing costs a tray, so an officer who is behind stops doing it */
    const bounceOdds = 0.45 * (1 - rush) * (size >= 5 ? 1 : 0.35);
    if (tray.bounces < BOUNCE_CAP && Math.random() < bounceOdds) {
      oppSay('Pushed a tray back');
      tray.bounces++;
      setTimeout(() => { belt.push(tray); drawQueue(); oppBusy = false; oppTurn(); }, 1000);
      return;
    }

    /* one sweep of a bag: thin bags read easily, fat ones hide things.
       A calm officer gets two sweeps, a hurrying one gets a single look. */
    const perPass = clamp(0.82 - 0.05 * (size - 1) - 0.22 * rush, 0.28, 0.92);
    const passes = rush < 0.5 ? 2 : 1;
    const odds = 1 - Math.pow(1 - perPass, passes);
    const dwell = (1600 + size * 820) * (1 - 0.45 * rush);
    oppSay(passes === 2 ? 'Going through a bag properly' : 'Skimming a bag');

    setTimeout(() => {
      if (over) return;
      contraband.forEach(it => { if (Math.random() < odds) opp.seized.push(it); else opp.missed.push(it); });
      opp.trays++; drawTally();
      oppSay(rush > 0.55 ? 'Filed it and moved on' : 'Filed a bag');
      oppBusy = false; oppTurn();
    }, dwell);
  }, 1100);
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
  if (belt.length === 0 && !held && !onDeck && !oppBusy) finish();
}

function finish() {
  over = true;
  clearInterval(tick); clearTimeout(oppTimer);
  $('freeze').hidden = true;
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
