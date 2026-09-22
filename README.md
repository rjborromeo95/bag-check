# Bag check — playtest rig

A browser prototype of *Bag check*, a real-time card game about airport
security screening. Two officers work one shared conveyor. The shift ends
when the belt is empty, then you count victory points.

This is a rules-testing tool, not a finished game. It exists to answer one
question quickly: **is the trade-off between speed and thoroughness actually
fun?**

## How it handles

Everything on the bench is a physical object, not a menu. You and Officer B
work opposite sides of one bench: their lane runs across the top of the stage,
yours along the bottom, and the two seize trays sit in the middle. Both belts
run the same way — in from the left, out to the right — because two lanes
running opposite ways read as two different machines rather than one bench.
Their arch is flipped instead, head below the mouth, since they are standing on
the other side of it. A passed tray slides right and parks at the end of the
lane, one per officer, until the next one pushes it off.

Three buttons sit under your detector and never move. **Go** runs the belt:
the first press fetches a tray, every press after that sends the waiting one
through the detector. **Check** stops the belt and hands you the suitcase.
**Pass** files the tray and moves on. A fourth, **Back on the belt**, appears
only while the rules allow a bounce.

- Nothing happens until you press Go. The first press pushes a tray down to you.
- Go again and it travels into the tunnel. Red lamp, or no lamp.
- On a red, press **Check**. Your belt stops and the suitcase becomes yours to
  open — **drag the front off the tray**.
- **Drag the item cards out** onto the bench to read them. They're clear, so
  the ink prints over itself while they're stacked and only separates when you
  pull them apart.
- **Drag anything restricted into your seize tray** in the middle of the bench.
  It stays there, in view, for the rest of the shift.
- **Put the suitcase front back on the tray** to pack the bag up, then press
  **Pass**. That files the tray and whatever you failed to spot. If anything
  restricted was still in there you are held at the bench for two seconds while
  the belt keeps moving.

On a touchscreen or with a keyboard, tapping works too: tap the front to lift
it, tap a card to slide it out of the case, tap it again on the bench to seize
it.

No build step, no dependencies, no framework. Three files and a stylesheet.

```
index.html
manifest.webmanifest   the phone app definition
sw.js                  offline cache
assets/style.css
assets/items.js     the deck definition
assets/cards/       the item card designs (PNG, clear stock)
assets/suitcases/   the 32 suitcase fronts (JPG, opaque)
assets/sfx/         the bench foley and the ambience loop (MP3, mono)
assets/game.js      dealing, conveyor, detector, opponent, scoring
RULES.md            the rules exactly as this build implements them
```

## Putting it online, without a terminal

Everything below happens in a browser tab.

**1. Make the repository**

Go to [github.com/new](https://github.com/new). Name it `bag-check`, leave it
public, and **do not** tick "Add a README" — you already have one. Create it.

**2. Upload the files**

On the empty repo page, click *uploading an existing file*. Drag in
`index.html`, `README.md`, `RULES.md`, and the whole `assets` folder together.
GitHub keeps the folder structure. Write a commit message and click
*Commit changes*.

**3. Deploy**

Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and import
`bag-check`. Vercel will detect a static site on its own:

- Framework preset: **Other**
- Build command: leave empty
- Output directory: leave empty
- Root directory: leave as `./`

Click *Deploy*. You get a live URL in under a minute.

**A note on caching**

`index.html` loads the stylesheet and scripts with `?v=10` on the end. Bump
that number whenever you change `style.css` or `game.js`. Without it a browser
— and Vercel's edge cache — will happily serve you last week's stylesheet with
this week's HTML, which looks like the layout has broken rather than like a
caching problem.

**If the buttons ever appear inside the board, check the tags.** Removing the
hold overlay took `#stage`'s and `#stagewrap`'s closing `</div>` with it, which
put the controls inside the scaled stage: Go ended up behind the detector arch
with a `z-index` of 5 on top of it, so the game looked frozen when it was only
hidden. Nothing in the console, nothing in the logic. If the page ever goes
strange after an edit, count the divs before you look anywhere else.

**Two things that look like bugs and aren't**

`index.html` loads the stylesheet and scripts with `?v=` on the end. Bump that
number whenever you change `style.css` or `game.js`. Without it a browser — and
Vercel's edge cache — will serve last week's stylesheet with this week's HTML,
which looks like the layout has collapsed rather than like a caching problem.

The stylesheet also carries `[hidden]{display:none !important}` near the top.
That is not tidying: a panel with `display:flex` in its own rule beats the
`hidden` attribute, so the code hides it and it stays on screen anyway. The
supervisor's-hold overlay did exactly that and sat over the bottom half of the
bench permanently.

**4. Changing things later**

Open any file on GitHub, click the pencil icon, edit, commit. Vercel rebuilds
and redeploys automatically. `assets/items.js` is the one to open if you want
to change what's in the deck — the catalogue at the bottom of that file sets
every card and how many copies of it exist.

## The deck in this build

109 item cards a shift: 93 permitted and 16 restricted, drawn from a pool of
26 forbidden designs, so ten of them sit out every round and nobody can learn
the deck by heart. The full deck is 119 designs. Every design is real artwork. The forbidden
pool runs to blades, bombs, poisons, flammables, tools and a handgun — seven
knives including a machete and two pairs of scissors, three bombs, four
poisons, six flammables including two lighters, five tools, one firearm — and
`RESTRICTED_N` (16) is how many of them are dealt. No design is ever doubled
now, so the old both-copies-in-one-bag swap is gone.

The permitted deck gained an inflatable knife, which is the joke the rest of
the deck has been waiting for: it is a toy, it is the size of a machete, and it
is perfectly legal. Watch what people do with it in playtest.

The most recent 14 permitted designs are a wash bag, an umbrella, a tote, a
pair of pants and a t-shirt in three or two colourways each, plus a carved
vase. They exist to pad the ordinary half of the deck: more of what a real bag
is full of, and — because five of them are small — more small objects that turn
out to be nothing.

Every card is dealt either way up, at random, which doubles how many places an
object can turn up without printing anything new. It measurably helps: cards
that end up effectively invisible drop from 20% to 17%, and bags with an
invisible item from 27% to 24%. Those two figures were measured on the 98-card
build and have not been re-run since; fatter bags will have nudged both up.

The restricted objects are small — 2.1% to 12.2% of the card, against 19% for
the average permitted item. That gap is where the difficulty
lives, but it is no longer a tell: fourteen permitted designs are under 6% of the
card too, and the magnifier exists so that size is a reason to look closer
rather than a reason to guess.

32 suitcase fronts, no two alike, of which 24 go on the belt each shift — a
different eight sit out every game. They are opaque full-bleed cards, so they
cover the stack completely, and they are the only part of a bag anyone can see
before the scan. Making them all different does more than add variety: a tray
that has been sent back round the belt is now recognisable on sight, so
bouncing something nasty at the other lane is a decision both officers can
remember. Six designs at three copies each, which is what this used to be, made
the front almost useless as an identifier.

Bags are dealt the way the rules say — the 24 suitcase cards shuffled into the
item deck, whatever lands under a suitcase is what's in it. 109 cards across 24
suitcases averages 4.5 a bag: median 4, and 51% of bags completely clean.
That last number is the one to watch: dropping from 20 restricted cards to 16
took clean bags from 43% to 51%, so half your trays are now a green lamp and a
Pass, before the amendments are applied. `RESTRICTED_N` is the dial if a shift
starts feeling quiet. Going from 18 trays to 24 is what pulled that back
into shape — at 18 the median bag was 6 and a third of them were pinned at the
cap. `BAG_CAP` (8) is a physical limit, not a balance knob: it's the most a
suitcase card can actually cover.

To make the game nastier, add `copies: 2` to more entries in `RESTRICTED`.

Watermarks still on the artwork: `camo_trousers`, all three laptops,
`leather_bag_1` (Vecteezy, across the middle of the object), `plate`,
`yellow_bag` (tiled across the whole bag, faint but legible) and
`case_stickers` (a stock-library watermark down the right-hand side).

The restricted cards are all branded too — Calor Gas, Scripto, Bonderite,
RCI Labscan. `magazine` is a real Vogue cover with an identifiable face on it, which puts it
in the same bracket as `newspapers`. So are a third of the suitcase fronts: Ted Baker on
`case_burgundy`, Rock on `case_red` and `case_purple`, Travelpro on
`case_olive`, CALPAK on `case_bronze`, it luggage on `case_cowprint`, travelite
on `case_charcoal`, and a maker's plate on `case_croc`.

Plenty of designs are recognisable licensed property — the five Ms Wiz covers,
the Stieg Larsson cover, the Vault Boy and Giants bobbleheads, the Game Boy,
the Apple laptops, Bleu de Chanel, the Superman crest on `underwear_2` and the
Macquarie logo on `umbrella_2`. `newspapers` is the awkward one: five real
mastheads plus photographs of identifiable people. All fine for a playtest deck,
none of it fine for a print run.

## What the rig adds that the cards don't have

Four things exist only in the digital version, because they are all about
pressure in real time.

**The lane never empties.** Sending a tray through vacates the spot in front of
you and the next one rolls into it immediately, so there is always something
waiting on your left and no button to press to fetch it. The trade is that you
now reserve two trays at once — the one you're working and the one on deck —
which quietly tilts the tray race your way.

**Numbers lift off what earned them.** +2 off a seized item, +1 off a filed
tray, −3 off a bag you let through, and a counter in the signage that ticks up
to the new total rather than jumping. The running score includes misses, which
the tabletop rules don't: on a table you find out at the end.

**The two-second hold.** Covered in `RULES.md` as the third invented rule. The
thing to watch in playtest is whether it makes people thorough or just makes
them slow.

**A magnifier each.** A plate at the right-hand end of each bench. Drag a card
over yours and it appears at two and a bit times the size in the panel above,
which is the difference between seeing a screwdriver and seeing a smudge — and
it matters more now that the forbidden pool has lighters and pliers in it at
2% of a card. Officer B uses theirs too: every card they lay out passes over
it, which is what reading a bag looks like from the other side of a bench.

**The wall.** The standing chart of what is forbidden, pinned on the left of
the bench, with the day's two amendments pinned above it.

**Two seize trays, always in view.** One each, side by side between the two
lanes. Whatever either of you takes out of a bag is laid out in your own tray
and stays there — you can see how many things B has found without reading a
number, and they can see yours. Each tray lays out sixteen cards before it
starts stacking; the count in the corner is always right.

**You can watch Officer B work.** They are not a status line any more. Their
tray rolls in, goes through their arch, their lamp lights, they lift the front
off, lay the cards out across their bench a card at a time, and carry what they
find into the shared bin in the middle. Their detector and rollers run
independently of yours, so you can tell at a glance which side is busy.

**The whole bench fits on one screen.** The stage scales to the window height
as well as to the column, leaving room for the buttons underneath. Without that
the stage fills the viewport, you scroll down to reach the controls, and B's
half slides off the top — which defeats the point of putting them in front of
you. `reserve` in `fit()` is how much room the controls get.

The stage is 1150 × 712, deliberately landscape. Windows are usually wider than
they are tall, so on a short window a squarer stage scaled down to fit the
height leaves a band of dead space either side and shrinks the cards for no
reason. A wide one scaled to the same height still fills the width, which is
about a third more card for the same window.

**The bench makes a noise.** Every card in the catalogue names the sound it
makes — `book`, `cloth`, `glass`, `light`, `hardcase`, `plastic` or `rustle` —
and plays it when it comes out of the tray onto the bench and again when it
goes back in. Groups with more than one take pick one at random, never the same
take twice running, with a little pitch wobble on top so a small group doesn't
sound like a machine. `light` has six takes, `cloth` four, `hardcase` and
`glass` three. The suitcase front has four opening takes and one closing thud,
the detector beeps when the lamp goes red, and the belt itself rumbles on every
Go — quietly on B's side, so you hear them working the moment they send one
through.

Under all of it, a checkpoint ambience loops at `AMBIENCE_VOL` (0.17). It is
cut at 115 seconds with a two-and-a-half second crossfade so the loop point
doesn't click, and it starts on the first Go, because browsers refuse to play
audio before the page has been clicked. Closing a bag stages the cards 70ms apart so a full one sounds
like repacking rather than a single clatter. Officer B's case is audible at
`SFX_THEM` (0.2) so you can hear the other lane working; set it to 0 for
silence. There's a Sound on/off toggle in the signage.

Ten objects now have a noise of their own rather than a group's — the
balaclava, the bath salts, both cameras, the envelope, the clock, the
croissants, the fidget spinner, the saffron and the sweets. All ten are
permitted, so none of it tells you anything about contraband. What it does do
is make those ten findable by ear, which matters on an amendment shift: if
today's ban happens to cover one of them, you will hear it land whether or not
you were looking at it.

That thinned the shared groups, so three cards moved to keep the shared sounds
honest — chocolate peanuts, the pencil case and the striped wash bag now sound
like plastic. Shared groups sit at glass 27%, hardcase 34%, light 33%, plastic
34% contraband, and book, cloth and rustle never.

The knife and bomb takes went into `light` and `hardcase` rather than getting
groups of their own, which is the rule the sound map has to keep: no group
belongs to contraband alone. Glass is the mugs, the perfumes, the plate, the bowl and the vase as
well as the poisons; hardcase is the laptops, the Game Boy and the bowling ball
as well as the bombs. The twelve new forbidden designs were spread across four groups rather than
piled into one: pliers, hammer, handgun and the machete sound like hardcase
along with the laptops and the Game Boy, the screwdrivers and lighters sound
like plastic along with the chargers and umbrellas, the scissors sound like
light along with the toothbrushes. As dealt that puts every group between 27%
and 33% contraband, with book, cloth and rustle never. That is a hint
rather than an answer, and it only reaches you once you have already pulled the
card out and can see it — the exception being a card that landed completely
hidden under another, which you would now hear even though you cannot see it.
Whether that's a help too far is a playtest question. `sound:` in
`assets/items.js` is where to argue with it.

**You cannot reach across.** Every card on B's side carries `.theirs`, which is
`pointer-events: none` and never gets a drag handler bound to it. Clicking their
suitcase does nothing at all. This is purely so playtesting doesn't turn into
fighting the interface.

**Officer B has hands, not a metronome.** Every timing on their side is
jittered: the gap between cards coming out of a bag is random, one card in five
gets a long look, the front comes off at its own speed, and everything goes
back in one at a time rather than all at once. Each card's travel time varies
too. Even spacing was the single thing that made them read as a machine rather
than a person — the odds of them finding something never changed, only the
rhythm.

**Officer B works in passes.** They were previously a flat dice roll per item.
Now they sweep a bag, and a calm officer gets two sweeps where a hurried one
gets a single look, so a thin bag gets picked clean and a fat one hides things.
Calm, they catch 92–99% of what's in front of them depending on bag size. What
breaks them is the tray race: `oppRush()` reads how far behind they are, and
being six trays down makes them cut to one pass, spend less time per bag, and
stop pushing trays back — which drops them to 58–79%. Get well ahead and things
start walking past them; let them settle and they are hard to beat. They are
deliberately unhurried either way: a flagged bag takes them four to six seconds
of visible work.

## The lean shift — the one to build on

The first card on the menu, and deliberately small. Eighteen punch-out pieces
and a board of eleven signs, so every rule can be seen working rather than
buried under a hundred and seven objects.

**The pieces.** Knives, hats, t-shirts and trousers, cut out of the four sheets
along their outlines. The top half of each sheet is fronts and the bottom half
backs; each front was matched to its back by colour, size and shape, and all
eighteen pairs were checked by eye. Both sides are rendered at one shared
transform so turning a piece over never changes its size. Everything stays
upright except the three knives, which lie diagonally — at card size a knife
laid flat was ten pixels thick. Because the back of a knife is the drawn mirror
of its front, the two faces turn in opposite directions, so flipping one swaps
which way it points, as a real one would.

**Two sides, and either can get it confiscated.** Each face carries its own
tags. The black t-shirt has a guitar on the back only; the beanie has a smiley
on the front only; the white t-shirt has a panel on the back. A piece is
contraband if **either** side qualifies — so under No instruments the black
t-shirt is contraband even lying plain side up, and the only way to know is to
turn it over. Tap a piece on the bench to flip it. Seizing is now a drag to the
tray, since tapping is taken.

**The deck.** One of each knife and three of everything else: 48 pieces into
six pouches of eight. Knives are rare on purpose — they are the only piece that
does anything.

**The board.** Eleven signs: knives, hats, t-shirts, trousers, green, white,
red, yellow, black, instruments, belts. Only knives start red. After three
rounds of grace two more turn every round.

Two signs had no partner in the set you sent. **Instruments allowed** turned out
to share its music-note icon with **No music**, so those two are simply the pair.
**Green allowed** did not exist at all; it is made from Yellow allowed with the
disc recoloured to the exact green of No green, and a white keyline round the
tick so it does not disappear into a green disc.

**The knife.** Take one and you can stab a sign before a round turns: it cannot
turn that round, and a small blade marks it on the wall. Signs only turn after
the grace rounds, so a stab is kept until a round where it would do something
rather than burned on a round where nothing moves. Officer B stabs with theirs.

**Judgement calls you may want to change**, all in `LEAN_PIECES`:
- The olive trousers count as **green**.
- The bucket hat's **belt** is on both faces — the buckle only shows on the
  front, but the band is visible from either side.
- Jeans and the beanie carry no colour, since there is no blue sign.
- The beanie's smiley is tagged `smiley` already, ready for a sign that does
  not exist yet.
- Knives, the bucket hat and the jeans make the `light` sound and everything
  else `cloth`, so the sound of a knife is not, on its own, a giveaway.

## The game

Twelve trays each, ten seconds a bag, no detector. The belt runs itself — Go is
pressed once and never again. The countdown sits on the tray, turns red at three
and beeps. At zero the bag files itself with whatever is still in it.

**The cut.** Finish searching and pass with time left and Officer B has to pass
too, wherever they have got to: mid-search, cards on the bench. They do it to
you and your clock says CUT. Passing a bag you never opened does not count as
finishing it and cuts nobody, which is what stops Pass-spamming from being a way
to deny the whole game.

**Best of one or best of three.** A round is a shift. The match goes to whoever
takes two rounds, so a three can finish in two. Every round deals a fresh deck
and posts fresh amendments. A drawn round counts for nobody; a match level on
rounds is settled on points across all of them.

**What was cut, and why.** The detector shift, the clock shift and the
inspection budget were all built and all played: the detector answered the
question the cards exist to ask, the clock had no direction to its pressure, the
budget was slower. An across-the-table variant where you searched each other's
bags was built and cut too — the gesture is the whole point of it and a screen
cannot deliver the gesture, so it read as the same game with a confusing
animation. It is worth trying with real cards.

**Stolen goods went last, and they were the closest call.** Five ordinary
objects hidden in your queue, named to you once, scored squared. The problem was
that the amendments arrived afterwards and did the same job better: both ask you
to remember a list of ordinary objects, and with ten seconds a bag nobody keeps
two lists apart. The amendments are also the theme rather than a second fiction
bolted alongside it. One list, not two.

**The cut may still be too strong.** Measured: a player who searches properly
and passes as soon as they are done cuts B on every single tray. B seized
nothing across twelve and finished 12 to 37. B does four to six seconds of
visible work a bag by design, so against anyone competent they never finish one.
The levers are making the cut leave two seconds rather than none, or capping how
many cuts you get a shift.

**The cut needed a generation counter, not a flag.** Officer B's turn is a chain
of a dozen delayed steps. A boolean cleared when their next bag starts lets every
stale step from the cut bag fire into it: a tray gets filed twice, the lane
empties, and B stands there doing nothing for the rest of the shift. Every bag of
theirs now carries a number, every scheduled step remembers which bag it belonged
to, and anything from an older one is dropped. `oppLater`, `oppMove` and `oppRoll`
are the whole fix.

## The policy shift

A second game on the menu, and the one where the two of you actually push on
each other.

**Colours are tagged by hand, not by filename.** They started out read off the
artwork names, which left **a third of the deck with no colour at all** — the red
Dream Big tote was not red, and the red crisps were not red either, because an
underscore is a word character and `\bred\b` never matched `red_crisps`. So a
sign would fire for some of a colour and silently ignore the rest, which is the
worst possible failure for a rule you are being scored against.

I tried detecting the dominant colour from the pixels. It is close but not good
enough for a rule people argue over: it reads brown leather as orange, a wooden
bowl as red and a lilac teddy as white. So the 33 gaps were filled by eye, and
**anything brown, beige, silver or genuinely mixed carries no colour at all** —
sixteen cards, including the croissants, the leather bag, the wooden mask and
the teddy. A colour sign should never turn on a judgement call. Counts now: 19
black, 17 red, 16 white, 14 blue, 14 green, 10 yellow, 9 orange.

**A wider deck.** 107 designs built so the categories overlap on purpose. Blue
jeans answer to No blue and to No trousers. The croissant teddy answers to No
croissants and to No teddies. The yellow croissant top answers to three. Each
card carries its own tags, so a sign is a tag rather than a hand-written list —
add an object and it joins every category it belongs to automatically.

**Seven bags, six and two.** Seven suitcases in the whole game, and every one
is built to the same recipe rather than shuffled out of a stream: six ordinary
things and two off the standing forbidden list. 42 permitted and 14 forbidden,
56 cards. Because every bag is identical in size, **the weight readout tells you
nothing on this shift** — there is no such thing as a light one and no way to
triage. Seven is also few enough to start recognising them as they come round,
which is the point of the number. The on-deck tray is suppressed when two or
fewer bags are circulating, or the two of you would be holding four of the seven
and the belt would stall.

The recipe is a starting condition, not a standing one: seizures take cards out
for good, so by the third lap the bags are thinner than eight and getting
thinner. Nothing puts anything back, so the bags only ever get thinner.

**One clock, one round.** Both benches take a bag at the same moment, both get
the same ten seconds, and neither starts the next until both have filed. Putting
Officer B on a matching timer was not enough on its own — each side still ran
its own pipeline, and a single skipped bag or a slow roll-in put them a bag
apart, which only grew. A wall that turns over every round means two different
things to two officers who are not on the same round.

The round controller is the fix: `beginRound` hands out both bags and
`roundCheck` will not start another until `youDone` and `oppDone` are both set.
Anyone stood down still spends the round standing there. Verified across a full
shift with nearly three thousand samples: the two never drifted more than the
one bag a sit-out accounts for.

**Both officers are on the same clock.** Officer B's bag lands on their bench,
they get exactly as long with it as you get with yours, and finishing early buys
them nothing — they stand there with it shut until the time is up, same as you.
Before this they simply started the next one the moment they were done, and
worked through the shift a good deal faster than anybody could match. Measured
after the fix: your cadence is a flat 12.3 seconds a bag, theirs 12.0 to 12.6.

The occasional 15 second outlier on their side is the belt running dry rather
than them being slow — with seven bags in the whole game and two officers, the
loop sometimes has nothing to hand them for a moment.

**Back to ten seconds a bag.** Fifteen was tried and reverted.

**No passing, and no button to open with.** The bag arrives, opens itself, lays
the front on the bench and gives you fifteen seconds. There is nothing to press
and nothing to decide except what to take. That took the cut and the pass gate
out with it — with no early pass there is nothing to cut anybody off with, so
two rules that had caused trouble since they were built simply stopped existing.

**One currency, and it is the number already on your tray.** A forbidden thing
is worth one. Your own secret line is worth two. Nothing else scores — trays
kept, bags emptied and bags that went past you are counts on the sheet and
nothing more, and letting something through costs nothing at all. So the running
total on your seize tray *is* your score, with nothing to reconcile at the end,
and the target is just that number.

**Nine to a bag, but the mix is dealt rather than built.** Every suitcase holds
the same number of things, so weight still tells you nothing — but the twenty-one
forbidden items go into the shuffle with the forty-two ordinary ones and land
where they land. Three a bag is the average and nothing more: over 20,000 deals,
24% of bags come out with two, 30% with three, 21% with four, and one bag in
eight has five or more. Two per cent are clean.

That was the point of changing it. A guaranteed three meant you knew what you
were hunting before the case opened and could rack up an early score on
arithmetic rather than looking. Now a bag can be nearly empty or half
contraband, and the only way to find out is to get into it.

The wall
turns over far harder: three rounds of grace, then **two more categories go red
every single round**. Measured: 7 red for rounds one to three, then 9, 11, 13,
15.

**Take something legal and you sit out the next bag.** That replaces the points
penalty as the thing you actually feel: the tray comes down the belt with its
front still on, runs the length of your lane and out the other end without ever
being opened, and you watch it go. Nobody checks it — it goes straight back into
circulation. In a race to a seizure target a lost bag is worth far more than
five points. Officer B misreads the crowded wall about one bag in six and is
stood down for it too.

The bag you lose is usually the one already waiting on deck, which is why the
skip has to be caught on two separate paths — the one that fetches a fresh bag
and the one that promotes the waiting one. It was only on the first, so for
several builds the penalty silently did nothing at all.

**The scoreboard is gone.** Both officers' progress lives on their seize trays
as a count against the target, so the side panel was repeating itself. B's
status line moved onto their tray and the stage took the width.

**How long it runs.** A perfect player reached 21 in five to seven bags —
roughly a hundred seconds. Two guaranteed forbidden items a bag plus whatever
the wall has banned makes four or five seizures a bag, so the target arrives
fast. First to 41 is the one to pick if that feels over before it started.

**A board of thirty-four categories, two faces each.** The whole policy is on
the wall at once now rather than accumulating a sign at a time. At the start
only the genuinely dangerous categories are turned to red — knives, scissors,
screwdrivers, poison, explosives, firearms, lighters — and every other thing a
passenger might own is green and legal. Every third bag, **two more green signs
turn over and stay over**. Measured: 7 red at the start, 9 by tray three, 11 by
six, 13 by nine.

That inverts what the wall used to mean. It was a short list of what is banned;
it is now a long list of what is still allowed, shrinking. Red beats green where
they overlap, so blue jeans become contraband the moment either No blue or No
trousers turns. Anything no category covers at all — the hammer, the pliers, the
gasoline — falls back to the standing list and is never legal.

**One secret line each.** Each officer is dealt one of the seven dangerous
categories, face down. It is still contraband and you still have to get it out
of the bag, but every one you take counts **two** towards your target, and the
other officer never learns what yours is.

**This is the policy shift only.** The standard shift keeps its two posted signs
and knows nothing about the board — `M.useBoard` is the switch, and every place
that asks what is contraband checks it.

**It ends on a seizure target**, 21 or 41, chosen on the menu. Only correct
seizures count, so grabbing everything in sight gets you there no faster — it
just costs five a time.

**Why a target rather than an ending condition about the bags.** The first
version ended when somebody stripped three bags bare, and I measured it: a
correct player went **211 trays without emptying a single one**. The reason is a
selection effect — the cards that survive a lap are precisely the ones no posted
sign covers, so the survivors are always the hardest things to ban. A seizure
target converges because seizing is the thing that always happens. First to 21
came in at about 20 trays and 8 signs; first to 41 at about 34 trays and 15.

**The wall shrinks rather than spills.** Signs keep arriving all shift, so they
step down in size as they multiply — full size up to two, then 64px to six, 48px
to twelve, 34px beyond. Twenty fit on the board with nothing clipped and nothing
scrolled out of sight, and a counter next to the heading says how many are up.

**How it actually played.** A full first-to-21 came in at **35 trays, 10 signs
posted by each side, 22 on the wall by the end — and a 21–20 finish**. That
scoreline is the pass gate working: the leader keeps getting held to the full
clock while the one behind waves bags through, so the race stays a race. Expect
six to eight minutes; first to 41 will be roughly double, which may be more
shift than anyone wants.

**How fast the wall closes in.** Measured over the 62-card policy deal: two
signs make about 15 cards contraband, six make 23, ten make 31, twenty make 45
of 62. That last number is why the draft had to move from every three seizures
to every two — with a smaller deck each sign catches fewer cards, and at the old
rate the shift starved. The first attempt at seven a side managed twelve
seizures in fifty-one trays before running out of things worth taking.

**A belt watcher, because there is no event to wait on.** Either officer can
run dry for a moment — the bags circulate, so your next one only exists once
the other has finished with it. Whoever runs out has to be woken when one turns
up, and nothing was doing that: the old wake-up hung off the bounce rule, which
was deleted three builds earlier. So the first time Officer B's queue emptied
they stood there saying "nothing on the belt" for the rest of the game, with
bags still going round.

It is fixed with a 600ms watcher rather than another callback, because the
thing an idle officer is waiting for happens on the other side of the bench and
there is no single moment to hang a handler on. `oppTurn` gained a guard
against being entered twice, since the watcher can now call it at any time.
Measured with a passive player, which is the worst case: B filed nine trays and
reached the target, longest gap twelve seconds, and that gap was a genuine
search of a fat bag rather than a stall.

**The pause is real, not cosmetic.** Your tray clock is held and restarted with
the time you had left, and Officer B freezes where they stand. That last part
needed their delayed steps rewritten to count down rather than fire on a
deadline — otherwise a whole chain of theirs arrives at once the moment the
pause lifts.

**And it still exposes the cut problem.** Against a player who searches properly
and passes early, B gets cut on nearly every tray, never reaches three, and
never posts a sign. Left alone, B reached 21 and posted six. So the cut does not
just cost B time, it switches off their half of this mode. Capping cuts at three
a shift is the fix.

## The day's amendments

Two signs go up on the wall every shift, drawn from sixteen, and **they beat
the standing list both ways**. A ban makes an ordinary category contraband — books,
shoes, trousers, toothbrushes, bowling balls. An OK makes a forbidden one legal
— knives, firearms. So some days the paperback is worth +3 and the machete is
worth −5, and the only reason you know is that you read the wall.

Everything that asks "is this bad" goes through one function, which is why the
opponent, the scoring and the misses all obey the signs without being told
about them separately.

**Two of the sixteen change no rule at all.** Tote bags permitted, and
underwear permitted — both of which were always permitted. They are worth more
than they look: a sign that names a category makes you check that category, and
on a ten-second bench attention is the resource. Somebody will burn four seconds
squinting at a tote bag that was never going anywhere. The draw refuses to pair
a sign with its own opposite, so you will never see No tote bags next to Tote
bags permitted.

**The categories are deliberately blunt**, because a rule you have to
adjudicate is no use with ten seconds on the clock. All shoes means all shoes.
Trousers means trousers and not skirts. Judgement calls I made and you may want
to change, all in `SIGNS` in `assets/items.js`:

- **No books** covers books, novels, the magazine and the newspapers.
- **No shoes** covers the three pairs, the heels and the flippers.
- **No underwear** includes the bra.
- **Poisons permitted** includes the hydrochloric acid.
- **Knives permitted** covers the five knives. Scissors are not in it.
- **No bobbleheads** covers the two bobbleheads. The icon reads more like a
  trophy than a bobblehead, and there is a gold trophy in the deck that is not
  in the category — one line if you want it.
- **No croissants** and **No bowling balls** cover one card each, and each of
  those cards is only dealt in about seven shifts out of ten. They are joke
  signs and they will sometimes do nothing at all.

**They swing the difficulty hard, on purpose.** A No books shift adds roughly
six cards to the fifteen already forbidden — a 40% jump. Two bans at once is a
brutal shift; knives and firearms both permitted is a quiet one. That variance
is the point of the mechanic, but it means a bad round might be the deal rather
than you.

One side effect worth knowing: the sounds are tuned so no group is mostly
contraband, and a ban breaks that — on a No books shift, a book landing on the
bench means contraband most of the time. That is fair rather than a leak,
because the sign told you.

## The maths, as it now stands

**The deck is now exactly what is in `object cards.zip`.** 107 permitted
designs and 26 forbidden, 133 in total, and nothing else: twenty cards that
were in the catalogue but not in that folder have been deleted outright rather
than just unlisted. Names and sounds carried over for everything that already
had them; twelve new designs needed both.

The **inflatable knife is permitted**, despite being filed under Restricted
Objects in that folder. It is a toy the size of a machete and it is perfectly
legal: the point of it is watching somebody seize it and lose five for the
privilege. As contraband it would just be another knife.

One thing worth knowing is that the folder reinstates some designs an earlier pass had cut as duplicates —
a second and third umbrella, a third folded shirt, a third toothbrush. That is
fine now in a way it was not before, because each has a name that tells them
apart in a briefing: "Red umbrella" points at exactly one card even though
there are three umbrellas. The one that still does not is the **four Ms Wiz
paperbacks**, which differ only by a title you cannot read at card size.

**The deal.** 75 of the 107 permitted designs and 15 of the 26 forbidden ones —
90 cards under 24 suitcases, capped at five a bag. What comes out of that is
tighter than it was: bags of 3 are half the shift, bags of 4 or 5 are the other
half, bags of 1 or 2 have effectively vanished. Mean 3.75. **51% of bags have
nothing forbidden in them at all.**

That compression is what makes weight worth reading. Measured over 20,000
deals:

| Weight | Share of bags | Chance it's dirty |
|---|---|---|
| Light (≤2) | 3% | 31% |
| Medium (3) | 51% | 43% |
| Heavy (4–5) | 46% | 58% |

A heavy bag is half again as likely to be hiding something *and* takes half
again as long to work. Neither band is the obvious answer, which is what you
want from the only thing you're allowed to know before deciding.

**Scoring.** Tray kept +1. Forbidden item seized **+3**. Anything else taken off
a passenger **−5**, which is new and is the biggest change in feel: confiscating
a hairdryer used to cost you nothing but seconds, and now it costs more than
catching a knife earns. Letting something through is −3 an item on the clock
shift, and **−10 a bag** on the budget shift.

## Weight

With the lamp gone there has to be *something* to decide on, or the inspection
budget is arithmetic rather than judgement. Weight is that something, and it is
the only thing about a closed bag you could honestly know at a real bench,
because you are holding it.

Three coarse bands — Light (1-3 cards), Medium (4-6), Heavy (7+) — shown on the
tray before you commit. Coarse on purpose: it should narrow the guess, not make
it. The trade it creates is real, because the two things a heavy bag does pull
against each other. Measured on the current deck: bags over six cards are 25%
of the shift and hold 43% of all the contraband — so a heavy bag is much more
likely to be worth opening, and much more expensive to work through. A light
bag is cheap and usually nothing. Neither is the obvious answer, which is the
point.

It only shows in the two modes without a lamp. Detector mode is the baseline
you play the others against, so it stays as it was.

## Playing it on a phone

There is no app store build and there doesn't need to be one. This is a PWA:
open the deployed URL on a phone, add it to the home screen, and it launches
full-screen with its own icon and works with no signal.

- **iPhone:** open in Safari (not Chrome — only Safari can install on iOS),
  Share → *Add to Home Screen*.
- **Android:** open in Chrome, menu → *Install app* / *Add to Home screen*.

It has to be served over https for any of that to work, which Vercel does by
default. Opening `index.html` off the disk gives you the game but not the
install or the offline cache.

**What changes on a touch screen.** `checkCompact()` looks for a coarse pointer
on a small screen, and when it finds one the header, belt bar, sidebar and
prompt all come off. The stage takes the entire screen and the few numbers
worth having — both scores, the belt count, one line of prompt — sit over it,
along with the Go / Pass / Check row floating at the bottom.

That is the whole trick, and it is worth understanding why. The bench is
1360 × 712. On a landscape iPhone, page chrome and all, it scales to about
0.3 and a card is 26px, which is not a game. Full-screen it scales to 0.55 and
a card is 48px, which is. The chrome was costing more than half the bench.

**Portrait is refused**, not shrunk: 1360 across a phone's portrait width would
be a 0.28 scale. The app asks you to turn the phone instead, and the manifest
requests landscape so it usually does it for you.

Everything already worked by touch — cards have had a tap path since the first
build, and the magnifier is a drag, which is exactly what a finger does.

**The service worker** is split deliberately. HTML, CSS and JS are
network-first, so a deploy actually lands rather than being shadowed by a stale
cache; artwork and audio are cache-first, since they never change without also
changing name. `CACHE` at the top of `sw.js` must be bumped alongside the `?v=`
in `index.html`, or a phone that has already installed the app keeps the old
shell.

## Knobs worth turning

At the top of `assets/game.js`:

| Constant | Now | What it does |
|---|---|---|
| `BAG_CAP` | 8 | Most item cards one suitcase can hide |
| `FREEZE_MS` | 2000 | How long the bench holds you after a miss |
| `BOUNCE_CAP` | 2 | Times a tray may be sent back round the belt |
| `VP_TRAY` | 1 | Points per tray kept |
| `VP_SEIZED` | 2 | Points per restricted item seized |
| `VP_MISSED` | −3 | Points per restricted item you let through |

`TRAYS` (24) lives in `assets/items.js`, next to the suitcase list, because it
sets both the number of trays and how many fronts get dealt.

In `assets/items.js`, the `copies` column sets the deck. It currently deals 92
permitted and 20 restricted across 112 cards and 24 suitcases — about 4.7 items
a bag. Restricted cards are 18% of the deck, and with 24 bags to spread across, 43% of
bags come out completely clean. Adding `copies: 2` to more `RESTRICTED` entries
is the way to make a red lamp more common.
