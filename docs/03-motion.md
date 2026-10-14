# 03 — Motion and interaction

All of this is implemented in `js/system.js`. The constants were tuned against
real user feedback, not taste. Each one below records what it is and why it is
that number, so you don't re-litigate a settled argument.

## 1. Inertial smooth scroll

Lenis-style, hand-rolled, ~65 lines. **One always-on `requestAnimationFrame`
loop** — the wheel event only moves a target value, the loop eases `current`
toward it and calls `window.scrollTo`.

```js
EASE = 0.7
```

### Why 0.7 and not lower

A team member said the cursor/scroll lag felt wrong and that the site hadn't had
it the day before. The maths:

```
steadyLag = ((1 - α) / α) × 16.67ms
α = 0.22  →  59ms   (the original — perceptible, and it was the complaint)
α = 0.70  →   7ms   (sub-frame, feels native, still eases)
```

The owner's call: *"I like what you've done with the red/pink cursor… if it has
to have lag to look good that's fine… maybe we keep the easing but make it VERY
subtle."* 0.7 is that answer. **Do not lower it to make the easing more
visible.** `prefers-reduced-motion` sets it to 1 (instant).

### The scroll "jump" bug — don't reintroduce it

The wheel handler must yield to overlays and to *sideways* gestures only:

```js
var over = e.target.closest('[data-hscroll],[data-scrolllock]');
if (over) {
  if (over.matches('[data-scrolllock]')) return;          // modal/menu: yield all
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;    // horizontal: yield
}
e.preventDefault();
target = clamp(target + e.deltaY);
```

The original yielded **every** gesture over a horizontal track. Those tracks are
full-width and about 6% of the page, so scrolling through one dropped you onto
the native scroll path mid-flight — instant instead of eased — and the resync
listener then cancelled whatever was still easing. That read as a jump. Vertical
intent over a horizontal track is page scrolling and must ease like everywhere
else.

A `scroll` listener resyncs if anything else moves the page (keyboard,
`scrollIntoView`, the mobile menu) rather than fighting it.

In-page `a[href^="#"]` links ease to their target with a 116px offset for the
fixed nav — and still do what a native jump does: the address follows
(`pushState`, each entry remembering its scroll position, so Back glides back
to where you were) and keyboard focus moves to the target. Without that,
"Skip to content" scrolled the page but left the next Tab in the nav, and
Back left the page (14 Oct audit). Links another script already handled, and
modified clicks, are left alone.

**Mark up:** `data-hscroll` on horizontally-scrolling tracks, `data-scrolllock`
on modals and the mobile menu.

## 2. Two-tone dot cursor

`position:fixed`, `z-index:9999`, `pointer-events:none`; `html.js-cursor` sets
`cursor:none` and the dot becomes the pointer. It's a 72px element whose
`::after` is scaled — 16px at rest, 34px over anything clickable, the full
72px when it carries a word — so growing it never touches layout.

### It samples, it does not blend

The dot reads the relative luminance of whatever is directly beneath it and
snaps to **exactly** the active pair's ink or **exactly** its ground. Never an
interpolation. The owner's stated preference is "nearly white or nearly black
and changes depending on the background section for legibility" — here that
is the pair's two colours doing the same job.

Sampling walks `document.elementsFromPoint(x, y)` — the **hit-test stack**, not
the ancestor chain. This matters: siblings like a background video, a scrim or
an absolutely-positioned photo never appear among a node's ancestors, so an
ancestor walk reports the section's colour and the dot vanishes over footage.
Video and anything with a `background-image` count as dark; masked icons are
read past, to what they sit on.

The check runs **every other frame**, not every frame — it is the expensive part
and 30Hz is imperceptible for a colour snap.

It follows `pointermove`, not `mousemove`. A drag that cancels its
`pointerdown` (the events gallery, the footer's founders — so text doesn't
select) stops the browser sending mouse events until it's let go, and the dot
froze where the drag began (owner, 14 Oct).

### The hover state inverts — within the pair

Over anything clickable the dot becomes a lens that swaps the pair's two
colours: ink shows as ground, ground as ink, and nothing off-palette (owner,
14 Oct). A plain invert or a greyscale invert would throw colours that aren't
in the brand. The swap is `x → ink + ground − x` per channel, which a browser
can't blend in one step, so the lens is three circles stacked over the page
(`.cursor-lens`, made in `js/system.js`, which has the arithmetic):
difference with white, then difference / plus-lighter by `ink + ground − 255`.
Recomputed when the pair changes. Without `plus-lighter` support: the solid dot.

The lens is placed with the `translate` property and grown with `scale`.
**Never position it with `transform`:** the `scale` property applies on top of
a transform and scales the position too, which dragged the lens towards the
top-left corner, worst as it grew (owner, 14 Oct).

Targets: `a, button, [role="button"], input, label, summary, [data-hot]`.
Give a custom card `data-hot` rather than extending the selector list.

### Words

`data-cursor="Read"` (or View, Drag, Play…) on an element puts that word in
the dot, which grows to full size, solid rather than inverted, so the word is
always ink on ground or ground on ink.

## 3. Section rule draw

Every section header's rule scales in from the left, then the trailing label
lands. `IntersectionObserver`, fires once.

```css
animation: ps-draw .82s linear(
  0, .2 6%, .58 13%, .89 20%, 1.013 28%, 1.017 34%,
  1.008 42%, .999 53%, .9973 63%, 1.0006 78%, 1) .15s forwards;
```

That `linear()` is a spring with a real overshoot (peaks at 1.017). It is the
signature timing of the whole site — the same curve appears on the nav rule and
the footer credit. Substituting `cubic-bezier(.16,1,.3,1)` loses it.

The label lands at `.355s` — after the rule has nearly arrived, not with it.

## 4. Parallax and motif drift

One rAF loop drives every element, gated by a `ticking` flag.

Progress is normalised `-1` (below fold) → `0` (centred) → `+1` (passed):

```js
var p = (vh / 2 - centre) / (vh / 2 + r.height / 2);
```

**Mark up:** `data-parallax="34"` on an image (the number is the amount in px),
or `data-fx` + `data-amt` for a motif. Disabled entirely under
`prefers-reduced-motion`.

Keep amounts small — 34px was the most used. Parallax that announces itself
looks cheap.

## 5. Marquees

Driven by `scrollLeft`, not a CSS transform. Two reasons: hover never freezes
them, and the user can grab and drag one, after which auto-advance pauses
briefly (`userUntil`) before resuming.

**`scrollLeft` snaps to whole pixels**, so the fractional position has to be
tracked in a separate variable (`pos`) and written to `scrollLeft` each frame.
Reading `scrollLeft` back as the source of truth loses the fraction and the
marquee judders. The extracted code already does this — don't simplify it.

**Mark up:** `<div data-hscroll data-marquee="46">` where the number is px/sec.
The inner track must contain **two identical copies** of the content for the
wrap to be seamless. Speeds used on the event site: 38, 46, 62.

A marquee in a background browser-pane tab looks frozen because rAF is
suspended there. That is the tooling, not the code.

## 6. Deferred heavy video

```html
<video autoplay muted loop playsinline poster="…-poster.jpg" data-src="…mp4">
```

`system.js` swaps `data-src` → `src` on `window.load`. `autoplay` stays on the
element so the browser's own playback machinery owns starting it — including
retrying when a background tab comes forward, which a one-shot `play()` misses.

**This is not optional.** The event site shipped a 29MB loop that loaded before
first paint. Re-encoding and deferring it was one of the biggest wins on the
project. Also pause video that is off-screen via `IntersectionObserver`.

## 7. Entrance animations

```css
@keyframes th-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
```

18px, not 40. Word-by-word staggers on display headlines use `--i` as the index
with a small per-word delay. Entrances fire **when the section is reached**, not
on page load — a stagger that already finished before you scrolled to it is
wasted.

## Reduced motion

Every animation is inside `@media(prefers-reduced-motion:no-preference)` or
guarded in JS. `EASE` becomes 1, parallax returns early, the cursor transition
is removed, `autoplay` is stripped from video. This is already correct
throughout — keep it that way when you add anything.

## The nav logo — drawn by the rule (14 Oct 2026)

The logo in the top bar draws itself: the site's one signature piece of
motion. Every section announces itself with a rule drawing in; the logo is
born from that gesture. TEKEX is built of horizontal bars (its E's have no
spine) with four slanted strokes between, so the wordmark is rebuilt from
those parts — three rows of bars and four strokes, each its own absolutely
positioned layer (`build/partials/wordmark.html`) — and, at rest, hands over
to the original artwork (`.fw-final`), so the word you're left with is
exactly the logo file.

**When someone arrives on the site, or refreshes** — not as they click from
page to page (owner, 14 Oct; once per visit was tried first, and read as
"it did it once but never again"). The boot script (js/boot-colourway.js)
decides before first paint and arms it with `html.js-logoprint`: a reload, or
no referrer from this site (a link from elsewhere, a search, a bookmark, a
typed address). Reduced motion: never. `?print` forces it; js/site.js starts
it. Don't name the class `js-print`: that one already means "the photo print
filter is ready" (js/site.js, 1), and the collision had the logo replaying on
every page.

**Rebuilt on Disney's principles (14 Oct).** The first version ran 2.6s and a
visitor called it clunky: .4s before anything showed, 1.3s of creep at the
end, three mechanisms one after another (three pens, then the bars swelling,
then the strokes rising from below), and half-risen strokes that read as
broken letters. Now it is one idea — the rule becomes the word — in ~1.2s:

| t | what | principle | how |
|---|---|---|---|
| 0–.25s | one pen stroke draws a single rule through the middle of the mark: all three rows lie on the middle one, so they draw as one | anticipation, staging | `clip-path` wipe with the italic's 9.7° leading edge, on the kicker rule's own curve (the `linear()` in components.css, .82s; drawn by ~.2s, so there is no dead start) |
| .24–.86s | the rule splits: the top and bottom rows travel out to their places along the italic, 23.185 units up or down and 3.97 across | arcs, squash and stretch | `transform` on the row, from `translate(3.97u·(r−1), 23.185u·(1−r))` to none |
| .3–.96s | each bar thickens from hairline (~2.5px, `--line`) to full, a beat behind its position | overlapping action | `scaleY` on the row's artwork |
| .32–1.06s | T stem, K, its arm and X open out of the rule, up and down from it at once, .06s apart, so the X lands last | follow-through | `clip-path: inset()` from the line (`--oy`, where the rule crosses each stroke's box) to fully open |
| 1.04–1.26s | the artwork fades in over the parts, then the parts hide (1.3s) | — | `opacity` .22s, then `visibility`. A cross-fade, not a cut: the parts and the artwork antialias differently, and a hard swap showed as the K "clicking into place" (owner, 14 Oct). The artwork needs `z-index:1`, or its fade runs hidden beneath the parts |

Everything that arrives is fast-out, slow-in (`cubic-bezier(.2,0,0,1)`) and
settles without overshoot: the owner ruled out springs, bounce and press on 14
Oct, and none of Disney's principles needs them. Timing is for the size — a
25px mark in a nav bar is legible as TEKEX by ~.6s and still by ~1.2s;
anything longer reads as waiting. Only `transform`, `clip-path` and `opacity`
move, on separate small layers. Squash the row's *artwork*, never the row:
the pen's clip must stay full height or the thin rule's soft edges show past
it. To study it frame by frame, freeze copies at set times (each copy's
`getAnimations({subtree:true})`, paused, `currentTime` set): that's how this
version was designed. Reduced motion: never armed, the artwork simply sits.
If the script that starts it never runs, CSS shows the artwork after 3s
anyway.

## Footer moment — the founders (14 Oct 2026)

**Hover Play** (or tab to it) and, the first time on each page, Ed and Tom
(the arcade's sprites, copied from js/games/land.js — keep them in step) pop
out of the top of the footer's logo and use the page as game furniture on
their way down to Play. (Owner, 14 Oct: it was tied to the footer logo's
print, on one visit in ten; now it's the visitor's to find.) From ~1000px,
where the route fits; reduced motion, none of it:

- **Ed**: out of the T's crossbar, runs to its end, hops off past the corner,
  swings in under the overhang onto the stem, slides down it like a pole
  (hand on the italic at chest height, so his feet meet the slant), drops
  onto the closing line ("Three islands…") and takes its lines like stairs,
  leaps to the Home box and slides down its left edge.
- **Tom**: out of the X's right arm (not its V — there's nothing to stand on
  there), hops the notch, runs the E and the K's arm, drops onto Events,
  slides down its right edge.
- Both land on the bar either side of Play, turn to it and point; Play hops.

Then the hint: once they've pointed, Ed steps under Play, jumps and bonks
its underside like an arcade block — it takes its hover fill for a moment and
its letters hop. Then again every 5–10s (a new gap each time) for as long as
he's standing at his spot with the footer on screen — not while someone is
hovering Play or him. While the founders are there, Play's own ten-second hop
(js/site.js, 15) stands aside: Ed is doing it. Where there's no room under
Play for him (41px at 1024), he jumps beside it.

Then they're the visitor's. No cursor word — the owner wanted it subtle — so
the hint is that they notice you: an ~11px hop when the cursor arrives, mouth
open and facing it while it stays. Click: a 61px jump (mid-stride too). Pick
up: they dangle by the scruff. Cursor within ~220px: they look at it. Hover
Play: both excited, bouncing out of step.

### Their world — the rules (drop-tested, 14 Oct)

1. **Everything visible is furniture.** Scanned from the footer itself, so it
   follows the layout at any width: every line of type (cap height to
   baseline, measured from the face), every box with a border, every icon,
   the logo's letter tops, the bar — and each other's heads.
2. **Headroom.** A top counts only where he fits under whatever is above it
   (2px of hair; for type, measured to its baseline, so a head is never in the
   letters). So: the nav's top row yes, the tight stack beneath no; the type
   inside the bar no; the © row under the bar no; the tagline under
   "Economy." no. The bar's own top always.
3. **Footing.** He stands while 9px either side of his centre is on something,
   but lands only with 6px either side — never teetering half off an edge.
   Gaps narrower than his footing are bridged.
4. **Letting go.** Only the pointer's last 100ms of movement is a throw; held
   still first, he's set down. Set down half into something (its top between
   his feet and chest), he scrambles up onto it rather than dropping through.
5. **Finding home.** Walk towards the spot; off the end of whatever he's on on
   home's side; if home is straight below, off the nearer end. **Look before
   you leap**: never off an end with nothing below but the bottom of the page.
6. **Stepping off** is a straight drop with a little drift. A hop cleared the
   28px gap between the T and the K, and he ping-ponged between them forever.
7. **Dizzy** only from a fall he didn't choose (thrown or dropped, landing
   faster than 1150px/s). Stepping off something himself, he lands on his feet.
8. **Heads are springboards**: he bounces off towards home and the one
   underneath winces. Ed's spot is under the T–K gap, so Tom walking off the
   crossbar lands on him — found by the tests, kept.
9. **Out of the bottom of the page**, he comes back in through the top of the
   screen, onto the nearest letter of the logo.
10. **Never lost**: released outside the window still counts as let go, and
    anyone not home after 15s drops back in from the top.

Tested with `?debug=founders` (then hover Play), which exposes
`window.__moment.run(founder, x, y, vx, vy)` — his own physics, run forward without drawing. A drop every
20×60px across the footer plus 800 random throws, at 1024, 1280 and 1440:
every run home, slowest 5.8s, never more than one wrap, no body overlapping
any box, icon or line of type, no dithering. Re-run it after any change to
the footer's layout.

Rules learned building it:

- Each step of the script hands straight to the next **in the same frame**
  (`while (step(p, dt)) next`). One idle frame between "leap" and "slide"
  read as Ed landing on something that isn't there.
- Leaps are computed exactly from the clock, never stepped frame by frame:
  stepping drifts past the landing time and snaps back (a 9px jolt).
- A move through the furniture is checked against the letter geometry
  (viewBox 0 0 304 63): at 1280px the head stays clear of the crossbar
  throughout; only the hand meets the stem, by design.
- A dot-matrix version of the logo was tried as the stage and rejected —
  the vector logo looked better (owner, 14 Oct).
