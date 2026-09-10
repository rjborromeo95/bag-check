(function () {
'use strict';

const BAG_CAP = 5;        /* most item cards a single suitcase can hide */
const BOUNCE_CAP = 2;     /* times one tray may be sent back round */
const VP_TRAY = 1;
const VP_SEIZED = 2;
const VP_MISSED = -3;

const CASE_ART =
  '<svg viewBox="0 0 200 150"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round">' +
  '<rect x="14" y="30" width="172" height="112" rx="10"/>' +
  '<path d="M74 30v-12a8 8 0 0 1 8-8h36a8 8 0 0 1 8 8v12"/>' +
  '<path d="M14 62h172M14 110h172"/><rect x="86" y="78" width="28" height="16" rx="3"/>' +
  '</g></svg>';

const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bad = it => it.restricted;

let belt, held, phase, seizedThisBag, started, t0, tick, oppTimer, over;
const you = { trays: 0, seized: [], missed: [] };
const opp = { trays: 0, seized: [], missed: [] };

/* ---------- setup ---------- */

function deal() {
  const items = shuffle(buildItemDeck());
  const bags = [];
  for (let i = 0; i < 18; i++) bags.push({ items: [items.pop()] });
  while (items.length) {
    const open = bags.filter(b => b.items.length < BAG_CAP);
    if (!open.length) break;
    open[Math.floor(Math.random() * open.length)].items.push(items.pop());
  }
  return shuffle(bags).map((bag, i) => ({ id: i, bag, bounces: 0 }));
}

function start() {
  belt = deal(); held = null; phase = 'idle'; seizedThisBag = [];
  you.trays = opp.trays = 0; you.seized = []; you.missed = []; opp.seized = []; opp.missed = [];
  started = false; over = false; oppBusy = false;
  $('result').hidden = true;
  drawBelt(); drawTally(); render();
}

/* ---------- conveyor ---------- */

function drawBelt() {
  const b = $('belt');
  if (!belt.length) { b.innerHTML = '<span class="belt-empty">Belt empty</span>'; }
  else {
    b.innerHTML = belt.map((t, i) =>
      '<span class="tray' + (i === 0 ? ' next' : '') + '" data-bounces="' + t.bounces + '"></span>').join('');
  }
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
  oppTimer = setTimeout(oppTurn, 2600);
}

/* ---------- render ---------- */

function lamps(g, r, pulsing) {
  $('lampG').className = 'lamp lamp-g' + (g ? ' on' : '');
  $('lampR').className = 'lamp lamp-r' + (r ? ' on' : '') + (pulsing ? ' pulse' : '');
}

function btn(label, fn, primary) {
  const b = document.createElement('button');
  b.textContent = label; b.onclick = fn;
  if (primary) b.className = 'go';
  return b;
}

function render() {
  const c = $('controls'); c.innerHTML = '';
  const xr = $('xray'); const empty = $('screenEmpty');
  xr.hidden = true; xr.innerHTML = ''; xr.className = 'xray';
  $('sweep').hidden = true;
  empty.hidden = false;
  empty.className = 'screen-empty'; empty.innerHTML = '';

  if (over) { lamps(0, 0); $('readout').textContent = 'Lane closed'; empty.textContent = 'Shift over.'; return; }

  if (phase === 'idle') {
    lamps(0, 0);
    $('readout').textContent = 'Standby';
    empty.textContent = belt.length ? 'Belt running. Pull a tray to start screening.' : 'Belt empty. Waiting on the other lane.';
    $('prompt').innerHTML = 'Trays are shared. Whatever you leave on the belt, <strong>Officer B can take</strong>.';
    if (belt.length) c.appendChild(btn('Pull next tray', pull, true));
    return;
  }

  if (phase === 'loaded' || phase === 'scanning') {
    lamps(0, 0, false);
    $('readout').textContent = phase === 'scanning' ? 'Scanning' : 'Tray loaded';
    empty.className = 'screen-empty case'; empty.innerHTML = CASE_ART;
    if (phase === 'loaded') {
      $('prompt').innerHTML = 'A suitcase, closed. You have no idea what is under it until it goes through.';
      c.appendChild(btn('Send it through', scan, true));
    } else {
      $('prompt').textContent = '';
      $('sweep').hidden = false;
    }
    return;
  }

  if (phase === 'green') {
    lamps(1, 0);
    $('readout').textContent = 'Clear';
    empty.className = 'screen-empty case'; empty.innerHTML = CASE_ART;
    $('prompt').innerHTML = 'Nothing restricted in there. Bin the suitcase and <strong>keep the tray</strong>.';
    c.appendChild(btn('Keep the tray', () => fileBag(false), true));
    return;
  }

  if (phase === 'red') {
    lamps(0, 1, true);
    $('readout').textContent = 'Restricted item detected';
    empty.className = 'screen-empty case'; empty.innerHTML = CASE_ART;
    const canBounce = held.bounces < BOUNCE_CAP;
    $('prompt').innerHTML = 'Something in there is restricted — the detector will not tell you how many. ' +
      (canBounce ? 'Search it, or push it back onto the belt and let someone else deal with it.'
                 : 'This tray has been round twice already. <strong>You have to deal with it.</strong>');
    c.appendChild(btn('Open the suitcase', () => { phase = 'open'; render(); }, true));
    if (canBounce) c.appendChild(btn('Back on the belt', bounce));
    return;
  }

  if (phase === 'open') {
    lamps(0, 1, false);
    $('readout').textContent = 'Suitcase open';
    empty.hidden = true;
    xr.hidden = false;
    drawXray();
    $('prompt').innerHTML = 'Pull out what is restricted. There is <strong>no second scan</strong> — once you close it, it goes in your pile as it is.';
    c.appendChild(btn('Close it and file the tray', () => fileBag(true), true));
    return;
  }
}

const SLOTS = [[2, 4], [28, 0], [52, 10], [6, 30], [32, 26], [54, 40], [20, 50], [44, 52]];

function drawXray() {
  const xr = $('xray');
  const slots = shuffle(SLOTS.slice()).slice(0, held.bag.items.length);
  held.bag.items.forEach((it, i) => {
    const b = document.createElement('button');
    const jx = (Math.random() * 10) - 5, jy = (Math.random() * 10) - 5;
    const rot = (Math.random() * 50) - 25;
    b.className = 'xray-item';
    b.dataset.material = it.material;
    b.style.left = (slots[i][0] + jx) + '%';
    b.style.top = (slots[i][1] + jy) + '%';
    b.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';
    b.setAttribute('aria-label', 'Unidentified item ' + (i + 1));
    b.innerHTML = itemSVG(it);
    b.onclick = () => seize(it, b);
    xr.appendChild(b);
  });
}

function seize(item, node) {
  if (node.classList.contains('gone')) return;
  node.classList.add('gone');
  held.bag.items = held.bag.items.filter(x => x.uid !== item.uid);
  seizedThisBag.push(item);
  you.seized.push(item);
  node.setAttribute('aria-label', item.name + ', seized');
  drawTally();
}

/* ---------- actions ---------- */

function pull() {
  beginClock();
  held = belt.shift();
  seizedThisBag = [];
  phase = 'loaded';
  drawBelt(); render();
}

function scan() {
  phase = 'scanning'; render();
  setTimeout(() => {
    if (over) return;
    phase = held.bag.items.some(bad) ? 'red' : 'green';
    render();
  }, 1000);
}

function bounce() {
  held.bounces++;
  belt.push(held);
  held = null; phase = 'idle';
  drawBelt(); render(); wakeOpp(); checkEnd();
}

function fileBag(wasOpened) {
  you.trays++;
  if (wasOpened) held.bag.items.filter(bad).forEach(it => you.missed.push(it));
  held = null; seizedThisBag = []; phase = 'idle';
  drawTally(); render(); checkEnd();
}

/* ---------- opponent ---------- */

let oppBusy = false;

function wakeOpp() { if (!over && started && !oppBusy && belt.length) setTimeout(oppTurn, 900); }

function oppSay(t) { $('oppDoing').textContent = t; }

function oppTurn() {
  if (over) return;
  if (!belt.length) { oppBusy = false; oppSay('Nothing on the belt'); checkEnd(); return; }
  oppBusy = true;
  const tray = belt.shift();
  drawBelt();
  oppSay('Scanning a tray');

  setTimeout(() => {
    if (over) return;
    const contraband = tray.bag.items.filter(bad);
    const size = tray.bag.items.length;

    if (!contraband.length) {
      oppSay('Clear — tray kept');
      setTimeout(() => { opp.trays++; drawTally(); oppBusy = false; oppTurn(); }, 900);
      return;
    }

    if (tray.bounces < BOUNCE_CAP && size >= 4 && Math.random() < 0.4) {
      oppSay('Pushed a tray back');
      tray.bounces++;
      setTimeout(() => { belt.push(tray); drawBelt(); oppBusy = false; oppTurn(); }, 1000);
      return;
    }

    oppSay('Searching a bag');
    const hitRate = Math.max(0.45, 0.97 - 0.10 * (size - 1));
    setTimeout(() => {
      if (over) return;
      contraband.forEach(it => { if (Math.random() < hitRate) opp.seized.push(it); else opp.missed.push(it); });
      opp.trays++;
      drawTally();
      oppSay('Filed a bag');
      oppBusy = false;
      oppTurn();
    }, 1400 + size * 900);
  }, 1100);
}

/* ---------- tally + scoring ---------- */

function scoreOf(p) { return p.trays * VP_TRAY + p.seized.filter(bad).length * VP_SEIZED + p.missed.length * VP_MISSED; }

function drawTally() {
  $('youTrays').textContent = you.trays;
  $('youSeized').textContent = you.seized.filter(bad).length;
  $('youScore').textContent = you.trays * VP_TRAY + you.seized.filter(bad).length * VP_SEIZED;
  $('oppTrays').textContent = opp.trays;
  $('oppSeized').textContent = opp.seized.filter(bad).length;
  $('oppScore').textContent = opp.trays * VP_TRAY + opp.seized.filter(bad).length * VP_SEIZED;

  const rail = $('evidence');
  if (!you.seized.length) { rail.innerHTML = '<span class="evidence-none">Nothing seized yet</span>'; return; }
  rail.innerHTML = you.seized.map(it =>
    '<span class="chip' + (it.restricted ? ' bad' : '') + '">' + itemSVG(it) + it.name + '</span>').join('');
}

function checkEnd() {
  if (over) return;
  if (belt.length === 0 && !held && !oppBusy) finish();
}

function finish() {
  over = true;
  clearInterval(tick); clearTimeout(oppTimer);
  render(); drawBelt();

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
      (p.missed.length ? '<p class="missed">Walked straight through: ' +
        p.missed.map(i => i.name.toLowerCase()).join(', ') + '</p>' : '') +
      '</div>';
  };

  $('result').innerHTML =
    '<div class="result-inner"><h2>' + verdict + '</h2>' +
    '<p class="verdict">The belt is empty, so the shift ends and the paperwork starts. ' +
    (falseGrabs ? 'You also confiscated ' + falseGrabs + ' thing' + (falseGrabs === 1 ? '' : 's') +
      ' nobody was smuggling, which scores nothing and cost you time.' : '') + '</p>' +
    '<div class="sheets">' + sheet('You', you) + sheet('Officer B', opp) + '</div>' +
    '<div class="controls again"><button class="go" id="again">Run another shift</button></div></div>';
  $('result').hidden = false;
  $('again').onclick = () => { $('clock').textContent = '0:00'; oppSay('Walking to the lane'); oppBusy = false; start(); };
  $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

start();
})();
