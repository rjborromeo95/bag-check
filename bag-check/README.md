# Bag check — playtest rig

A browser prototype of *Bag check*, a real-time card game about airport
security screening. Two officers work one shared conveyor. The shift ends
when the belt is empty, then you count victory points.

This is a rules-testing tool, not a finished game. It exists to answer one
question quickly: **is the trade-off between speed and thoroughness actually
fun?**

## How it handles

Everything on the bench is a physical object, not a menu.

- A tray rolls in from the left and stops in front of the machine.
- **Send it through** and it travels into the tunnel. Red lamp, or no lamp.
- On a red, **drag the suitcase front off the tray** to open the case.
- **Drag the item cards out** onto the bench to read them. They're clear, so
  the ink prints over itself while they're stacked and only separates when you
  pull them apart.
- **Drag anything restricted into the bin.**
- **Put the suitcase front back on the tray** to close it, which files the tray
  and whatever you failed to spot.

On a touchscreen or with a keyboard, tapping works too: tap the front to lift
it, tap a card to slide it out of the case, tap it again on the bench to seize
it.

No build step, no dependencies, no framework. Three files and a stylesheet.

```
index.html
assets/style.css
assets/items.js     the deck definition
assets/cards/       the item card designs (PNG, clear stock)
assets/suitcases/   the six suitcase fronts (JPG, opaque)
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

79 item cards: 59 permitted and 20 restricted. Every design is real artwork —
no placeholders left. The permitted 59 are all different; the restricted 20 are
14 designs (four knives, three bombs, three poisons, four liquids) with six
doubled to give five cards of each kind. If both copies of a doubled design
land in the same bag the dealer swaps one out, since identical cards stack into
what looks like a single card.

Every card is dealt either way up, at random, which doubles how many places an
object can turn up without printing anything new. It measurably helps: cards
that end up effectively invisible drop from 20% to 17%, and bags with an
invisible item from 27% to 24%.

The restricted objects are small — 2.5% to 10.4% of the card, averaging 5.6%,
against 21% for the average permitted item. That gap is where the difficulty
lives.

18 suitcase fronts from six designs, three copies of each. They are opaque
full-bleed cards, so they cover the stack completely. They are also the only
part of a bag anyone can see before the scan.

Bags are dealt the way the rules say — the 18 suitcase cards shuffled into the
item deck, whatever lands under a suitcase is what's in it. That produces
enormous variance: median bag is 3 cards, one in five is a single card, one in
three runs to six or more. `BAG_CAP` (8) is a physical limit, not a balance
knob: it's the most a suitcase card can actually cover. Anything over spills
onto the thinnest bag, which also guarantees every suitcase holds at least one
item.

To make the game nastier, add `copies: 2` to more entries in `RESTRICTED`.

Restricted items have no artwork yet, so knife, bomb, huge bottle of liquid and
poison are drawn as line placeholders. They follow the same rule as the real
cards: five copies of each, each copy printing the object in a different spot.
Those spots live in `RESTRICTED` in `assets/items.js` and can be moved around
freely — that array is a decent place to design the real positions before
anything gets printed.

Watermarks still on the artwork: `camo_trousers`, all three laptops,
`leather_bag_1` (Vecteezy, across the middle of the object) and `plate`.

The restricted cards are all branded too — Calor Gas, Scripto, Bonderite,
RCI Labscan.

Plenty of designs are recognisable licensed property — the five Ms Wiz covers,
the Stieg Larsson cover, the Vault Boy and Giants bobbleheads, the Game Boy,
the Apple laptops, Bleu de Chanel. `newspapers` is the awkward one: five real
mastheads plus photographs of identifiable people. All fine for a playtest deck,
none of it fine for a print run.

## Knobs worth turning

At the top of `assets/game.js`:

| Constant | Now | What it does |
|---|---|---|
| `BAG_CAP` | 5 | Most item cards one suitcase can hide |
| `BOUNCE_CAP` | 2 | Times a tray may be sent back round the belt |
| `VP_TRAY` | 1 | Points per tray kept |
| `VP_SEIZED` | 2 | Points per restricted item seized |
| `VP_MISSED` | −3 | Points per restricted item you let through |

In `assets/items.js`, the `copies` column sets the deck. It currently deals 20
restricted cards and 44 permitted ones across 64 cards and 18 suitcases —
roughly 3.5 items a bag, with about three bags in ten completely clean.
