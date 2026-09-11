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
Pass. Fewer searches also means fewer chances at the stolen goods, since those
can only be found in a bag you open. `RESTRICTED_N` is the dial if the shift
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
the bench. The stolen-goods board used to sit under it and doesn't any more:
it is read, not handled, so it was taking bench space from the half of the
stage you actually work in. It lives in the sidebar now, where the posters are
big enough to read properly.

**Three things are reported stolen every shift.** `pickWanted(3)` in
`assets/items.js` draws three permitted designs at random and pins them on the
board in the sidebar, above the scores, where they stay legible all
shift. Each poster crops the card art down to the object's bounding box —
`CROP` in `assets/items.js` — because a thumbnail of a whole card is mostly
empty space. Recovering one is worth `VP_WANTED` (3), and the poster crosses
itself off when either of you finds it.

They are deliberately ordinary — a hat, a book, a mug — so nothing about the
bag or the lamp gives them away. The only way to find one is to be looking
properly at a bag you already had a reason to open, which is what the mechanic
is for: it gives a red tray a second payoff, it makes seizing a permitted item
worth doing for the first time, and it means the deck plays differently every
round without changing the deck. Restricted designs are never eligible — a
wanted knife would just be a knife.

The side effect worth watching in playtest: a wanted item can easily sit in a
bag that never flags, in which case nobody gets it. That is the intended shape
— three leads, and you are lucky to see two of them — but if it feels like
wasted print, `WANTED_N` is the number to turn.

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
is make those ten findable by ear, which is the first help the stolen-goods
memory mechanic has had: if the thing you are hunting happens to be one of
them, you will hear it land whether or not you were looking at it.

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

## Ten seconds

The fourth mode. Twelve trays each, five stolen goods planted in your queue by
Officer B and five in theirs by you, and **ten seconds a bag**. The belt runs
itself: Go is pressed once at the start and never again, trays arrive, go
through, and leave on their own. The countdown sits on the tray, turns red at
three and beeps once. At zero the bag files itself with whatever is still in
it.

**The cut is the rule that makes it.** Finish searching and pass with time left
and you do not only bank your own tray, you end Officer B's tray where it
stands — mid-search, cards still on the bench. They do the same to you, and
when they do, your clock says CUT and your bag goes. Both sides run their own
ten seconds; the first to finish stops the other. It is the only rule in any of
the four where being fast does something *to* the other officer rather than
merely ahead of them.

**One thing to watch, with numbers.** A player who refuses to engage can force
a draw. I ran a bot that hammered Pass on every tray without looking: it cut B
off twelve times out of twelve, B seized nothing, and both finished on 12
points. Requiring an actual search before the cut counts — which is what
"finishes searching" says, and what the code now does — kills the crudest
version of it: the same bot now loses 12 to 61. But a player who presses Check,
opens the case and immediately passes still denies B every tray at the cost of
all their own scoring, and still lands on 12-all.

Whether that matters depends on whether a forced draw is a legitimate thing for
a losing player to reach for. If it is not, the two levers are making the cut
leave them two seconds rather than none, or making a cut forfeit your own tray
point so denial actively costs you.

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

**Stolen goods are squared.** Ten on the table. One is worth 1, three is 9, five
is 25 — nothing else in the game pays a run like that, and it is the only thing
that makes carrying ten descriptions in your head worth the effort. They are
drawn out of the bags after the deal rather than off the catalogue, so every one
of them is guaranteed to be somewhere on the belt, one to a suitcase.

**No picture, and no list to check.** You are told once, in words, on a card you
have to dismiss before the shift starts. That is the whole mechanic. On the
budget shift they are planted rather than reported — five in your queue by
Officer B, five in theirs by you — which is why you get told five and not ten,
and it is what the physical game does: the other player picks them and tells
you what they are.

Officer B has the same problem and is not perfect at it: `OPP_RECALL` (0.6) is
how much of the list they actually hold on to.

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
along with the Go / Pass / Check row floating at the bottom. The stolen-goods
board becomes a button that opens a sheet.

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
