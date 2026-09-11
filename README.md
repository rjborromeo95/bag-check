# Bag check — playtest rig

A browser prototype of *Bag check*, a real-time card game about airport
security screening. Two officers work one shared conveyor. The shift ends
when the belt is empty, then you count victory points.

This is a rules-testing tool, not a finished game. It exists to answer one
question quickly: **is the trade-off between speed and thoroughness actually
fun?**

## How it handles

Everything on the bench is a physical object, not a menu.

- A tray rolls in from the left and stops in front of the machine. There is
  always one waiting there: sending a tray through frees the spot and the next
  one rolls straight into it.
- **Send it through** and it travels into the tunnel. Red lamp, or no lamp.
- On a red, **drag the suitcase front off the tray** to open the case.
- **Drag the item cards out** onto the bench to read them. They're clear, so
  the ink prints over itself while they're stacked and only separates when you
  pull them apart.
- **Drag anything restricted into the bin.**
- **Put the suitcase front back on the tray** to close it, which files the tray
  and whatever you failed to spot. If anything restricted was still in there you
  are held at the bench for two seconds while the belt keeps moving.

On a touchscreen or with a keyboard, tapping works too: tap the front to lift
it, tap a card to slide it out of the case, tap it again on the bench to seize
it.

No build step, no dependencies, no framework. Three files and a stylesheet.

```
index.html
assets/style.css
assets/items.js     the deck definition
assets/cards/       the item card designs (PNG, clear stock)
assets/suitcases/   the 32 suitcase fronts (JPG, opaque)
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

**4. Changing things later**

Open any file on GitHub, click the pencil icon, edit, commit. Vercel rebuilds
and redeploys automatically. `assets/items.js` is the one to open if you want
to change what's in the deck — the catalogue at the bottom of that file sets
every card and how many copies of it exist.

## The deck in this build

112 item cards: 92 permitted and 20 restricted. Every design is real artwork —
no placeholders left. The permitted 92 are all different; the restricted 20 are
14 designs (four knives, three bombs, three poisons, four liquids) with six
doubled to give five cards of each kind. If both copies of a doubled design
land in the same bag the dealer swaps one out, since identical cards stack into
what looks like a single card.

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

The restricted objects are small — 2.6% to 10.4% of the card, averaging 5.1%,
against 19% for the average permitted item. That gap is where the difficulty
lives, but it is no longer a tell: fourteen permitted designs are now under 6%
of the card too, and 32 sit inside the restricted size range, so a small object
is only contraband 38% of the time — down from 43%.

32 suitcase fronts, no two alike, of which 24 go on the belt each shift — a
different eight sit out every game. They are opaque full-bleed cards, so they
cover the stack completely, and they are the only part of a bag anyone can see
before the scan. Making them all different does more than add variety: a tray
that has been sent back round the belt is now recognisable on sight, so
bouncing something nasty at the other lane is a decision both officers can
remember. Six designs at three copies each, which is what this used to be, made
the front almost useless as an identifier.

Bags are dealt the way the rules say — the 24 suitcase cards shuffled into the
item deck, whatever lands under a suitcase is what's in it. 112 cards across 24
suitcases averages 4.7 a bag: median 4, a fifth at the eight-card cap, and 43%
of bags completely clean. Going from 18 trays to 24 is what pulled that back
into shape — at 18 the median bag was 6 and a third of them were pinned at the
cap. `BAG_CAP` (8) is a physical limit, not a balance knob: it's the most a
suitcase card can actually cover.

To make the game nastier, add `copies: 2` to more entries in `RESTRICTED`.

Watermarks still on the artwork: `camo_trousers`, all three laptops,
`leather_bag_1` (Vecteezy, across the middle of the object), `plate`,
`yellow_bag` (tiled across the whole bag, faint but legible) and
`case_stickers` (a stock-library watermark down the right-hand side).

The restricted cards are all branded too — Calor Gas, Scripto, Bonderite,
RCI Labscan. So are a third of the suitcase fronts: Ted Baker on
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

**Officer B works in passes.** They were previously a flat dice roll per item.
Now they sweep a bag, and a calm officer gets two sweeps where a hurried one
gets a single look — so a thin bag gets picked clean and a fat one hides things.
What breaks them is the tray race: `oppRush()` reads how far behind they are and
being buried makes them cut to one pass, spend less time per bag, and stop
pushing trays back. Get ahead and they start letting things through; let them
settle and they are hard to beat. They are deliberately not fast — the dwell is
1.6 seconds plus 0.8 a card, halved at most when they're panicking.

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
