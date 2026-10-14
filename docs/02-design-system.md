# 02 — Design system

Everything here is implemented in `css/tokens.css`, `css/base.css` and
`css/components.css`. This doc explains the reasoning so you extend it rather
than work around it.

## The token pattern

Three layers, and the discipline is in never skipping one:

```
--red, --pink, --ink        raw brand constants   (never used by a component)
      ↓
--t-bg, --t-display, …      semantic slots        (components only use these)
      ↓
.is-invert / .is-punch      a section redefines the slots on itself
```

The payoff: a section flips its entire palette by setting one class. No
component needs to know which section it is in, and there are no
`.dark-section .btn` overrides anywhere. On the event site this held across
eleven sections with zero per-section component CSS.

**Rule: if you write a hex value outside `tokens.css`, you have made a mistake.**

### Colourways

Five pairs, one active per page load — chosen at random by
`js/boot-colourway.js` (inlined in every `<head>`), never the same as the last
load — and applied as a class on `<html>`:

| Class | Ink | Ground |
|---|---|---|
| `.cw-blue` | `#242EFF` | `#FFDC8A` butter |
| `.cw-magenta` | `#F116F9` | `#87FFED` mint |
| `.cw-purple` | `#7824FE` | `#D1FFBF` lime |
| `.cw-red` | `#F80000` | `#F6C5FF` pink |
| `.cw-aubergine` | `#3A0048` | `#FF8BB4` fuchsia |

`css/tokens.css` is the source for these values; this table is a copy.

Each sets `--brand-ink` and `--brand-ground`; every `--t-*` slot resolves from
those two. Put a `.cw-*` on a `<section>` to override locally — sparingly, the
system's logic is one pair per visit.

### The three grounds

Within whichever pair is active:

| Class | Ground | Use |
|---|---|---|
| *(default)* | the pair's pastel | Most of the site. |
| `.is-invert` | `--ink` | Dark band. Breaks up a long page; good behind media. |
| `.is-punch` | the pair's **ink** | The ink becomes the ground. **Once or twice a page, maximum** — it marks the single most important stretch. On the event site: the programme. Here: the numbers band. |

**Design in all five** (`?cw=red` etc. forces a pair). A layout that balances
in blue/butter can fall apart in red/pink — the inks differ a lot in weight.

## Type scale

Two separate systems, and conflating them is the usual mistake.

**UI / label type is fixed rem.** It is interface, not display, and must not
fluid-scale or it becomes unreadable on small screens:

```
--fs-2xs .68rem   --fs-xs .72rem   --fs-sm .8rem
--fs-md  .85rem   --fs-lg .95rem   --fs-xl 1.125rem
```

**Display type is `clamp()` per component.** The house setting:

```css
.h2-display{
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:-.02em;
  line-height:.95;
  font-size:clamp(2.3rem,5.4vw,4.8rem);
  text-wrap:balance;
}
```

`text-wrap:balance` on headings, `text-wrap:pretty` on body paragraphs.

**Body** is 17px / 1.55. Not 16 — 17 reads better in this typeface at this
measure, and it was settled early.

### Tracking

The smaller and more uppercase the type, the more tracking it needs:

```
--tr-2xs .16em   (tiny uppercase labels)
--tr-xs  .14em   (kicker labels)
--tr-sm  .1em    (skip link, small caps rows)
--tr-lg  .06em   (buttons)
```

Display type gets *negative* tracking (`-.02em`). Never positive.

## Rhythm

Two values, site-wide. Every section uses both, which is why the vertical
rhythm is consistent without anyone maintaining a spacing scale:

```css
--gutter:clamp(20px,4vw,48px);        /* horizontal page padding */
--section-gap:clamp(56px,7vw,100px);  /* vertical space between sections */
```

`.container{max-width:1240px;margin:0 auto}` — the measure for everything
except full-bleed media.

## Components in `components.css`

### Kicker row — the section signature

```html
<div class="kicker is-span">
  <span class="k">In their words</span>
  <span class="rule" aria-hidden="true"></span>
  <span class="k k-num" aria-hidden="true">08</span>
</div>
```

The rule draws left-to-right on arrival, then the number lands. It is the
same gesture in every section header, the nav rule and the footer credit, so
arriving somewhere new always feels the same — and the nav logo prints itself
out of it (`docs/03-motion.md`). Needs `class="js-kicker"` on `<html>`.

The draw uses a `linear()` easing with a deliberate overshoot — it is not a
plain ease. Copy the keyframe, don't substitute `ease-out`.

### Buttons

Four variants, all reading the section's `--t-*` slots, so they're right in
every pair and on every ground. Two for the page, two for over the hero film:

```
.btn-solid        accent fill, ground label  → ground fill, accent label on hover
.btn-outline      ground fill, accent border → accent fill on hover
.btn-solid-hero   accent fill, white label   → the pair's ground on hover
.btn-outline-hero ground outline over film   → ground fill on hover
```

`.btn-outline` is filled with the ground, not transparent, so a motif drifting
behind a button is masked rather than seen through it.

All uppercase, `font-weight:700`, `--tr-lg` tracking, `2px` borders.
**Borders are always 2px** across the whole system — cards, buttons, rules.
Transitions are `.16s ease` on colour only; buttons never move or scale.

Add `white-space:nowrap` to any button in a horizontal rail. A ticket CTA
wrapped and escaped its container on the event site at tablet width, caught
only by a team member testing a cropped window.

### Cards

```css
.th-card{background:var(--t-bg);border:2px solid var(--t-accent)}
```

That's it. No shadows, no radius, no gradients anywhere in the system.

### Oversized motif marks

`.th-motif` — large white geometric shapes (`assets/motifs/`) positioned absolutely, often bleeding past the
viewport edge, `z-index:0`, `pointer-events:none`. They drift and rotate
slightly on scroll via `data-fx`. They are the main thing stopping large flat
colour areas feeling empty, and they are cheap. Use them.

The parent needs `overflow:clip` (not `hidden` — see `docs/05-conventions.md`).

## Visibility helpers

```
.th-desktop   hidden ≤880px
.th-mobile    hidden ≥881px
.th-stack     grid collapses to 1 column ≤700px
```

Note the two different breakpoints: **the nav goes mobile at 880, the layout
grids at 700.** Collapsing both at 880 gave a 768px tablet the phone treatment.
