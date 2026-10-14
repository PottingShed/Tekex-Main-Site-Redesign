# 04 — Responsive rules

The owner's brief, verbatim: *"this site needs to look beautiful at every size
always."* Not "works at". Every width below gets **designed**, not reflowed.

## Test widths

```
320   small Android — the real floor
375   iPhone SE / mini
390   iPhone 14/15 — the most common single width
768   iPad portrait  ← the one that gets neglected
1024  iPad landscape / small laptop
1440  desktop
```

Plus **short viewports**: `max-height:700px` matters on a landscape phone and on
a laptop with browser chrome. The event site hides its hero sub-line there
rather than cramming.

## Breakpoints, and why there are two

```
880px   nav collapses to the mobile menu
700px   layout grids collapse to one column
```

**These are deliberately different.** Collapsing both at 880 gave a 768px iPad
the phone treatment — a 768-wide tablet has plenty of room for a two-column
grid, it just can't fit the desktop nav. Keep them separate.

Other breakpoints in use: `1080` (nav rail gaps tighten), `1024`, `640`
(headline regroups), `600`, `560`, `380` (smallest type step-down).

## Measure caps — and the `ch` trap

**`ch` units are not trustworthy in PP Neue Montreal.**

1. `1ch` is the width of the `0` glyph. In this typeface that works out to
   roughly **1.57 real characters** — so `45ch` is about 70 characters, not 45.
2. `ch` normalises for `font-size` but **not for `font-weight`**. The same `ch`
   value on a 400 and an 800 run of text gives different real measures.

This cost two rounds of "the measure cap is too generous". The fix that worked:
**measure px-per-character in the browser on the actual element**, then set the
cap. The values that landed on the event site:

```css
.intro-p2{max-width:47ch}
.intro-p3{max-width:46ch}
.hero-sub{max-width:52ch}   /* ≤1024 only */
.rr-desc {max-width:47ch}
```

Target 60–75 *real* characters per line for body copy. Always add
`text-wrap:pretty` to a capped paragraph.

## Forced line breaks

**`::after{content:"\A"}` does not work on an `inline-block`.** The newline
breaks *inside* the element's own box, so the following content doesn't move.
This swallowed real time on the event site's hero.

What works — a real `<br>`, toggled by media query:

```html
<span class="hl-line">
  <span class="hl-w" style="--i:0">Health</span>
  <span class="hl-w" style="--i:1">is</span>
  <br class="hl-brk-m" aria-hidden="true">
</span>
```

```css
.hl-brk-m{display:none}
@media(max-width:640px){
  .hero-title{white-space:nowrap}
  .hero-title .hl-line{display:inline}
  .hero-title .hl-brk-m{display:inline}
}
```

`aria-hidden` on the `<br>`, and **keep a space before it** — a word glued to a
`<br>` is read fused by screen readers ("howSocial").

## Fitting type to a measure

Where a row of items must hold one line (a date/location/time detail row, a tag
row), the event site measures and sets the exact font-size that fills the
measure. Two rules learned the hard way:

1. **Settle, don't write every pass.** Writing unconditionally is
   self-perpetuating: the write changes the height → the `ResizeObserver` fires
   → it writes again. Stop when the delta is within tolerance.
2. **Tolerance must be tight.** 0.5px of font-size delta left a row 8px over its
   container. **0.05px** is the working threshold.
3. Guard re-entry with a `busy` flag — your own restyle re-enters the observer.
4. Only clear the fitted property *above* the breakpoint, where the row isn't
   fitted at all. Clearing it below re-triggers the loop.

## Overflow

- `main{overflow-x:clip}` and `body{overflow-x:clip}`.
- **`clip`, not `hidden`.** `hidden` creates a scroll container, which breaks
  `position:sticky` inside it and lets the browser scroll the box
  programmatically. `clip` doesn't.
- **But `overflow-x:clip` on `body` propagates to the viewport**, which means
  `body` itself stops clipping. So a wide decorative element is *not* contained
  by the body rule — **give its own section `overflow-x:clip`**. This caught us
  more than once on the event site.
- A screen-blended pseudo-element must be `z-index:-1`, or the `::after` paints
  over the type.
- Full-bleed media that bleeds past the gutter needs a clipping parent, or it
  produces sideways scroll on mobile — the single most common responsive bug.

## Things to check that are easy to miss

- A CTA in a horizontal rail wrapping and escaping its container at tablet
  width. Add `white-space:nowrap`. This shipped and was caught by a team member
  on a cropped window, not by me.
- Background shapes sitting *above* the video on mobile when they sit *behind*
  it on desktop — check `z-index` inside every breakpoint, not just at desktop.
- Equal-width tag rows: set an explicit `em` width (`width:15.2em`) rather than
  relying on content width, or the tags stagger.
- At ≤380px, step the largest numerals down (`clamp(1.6rem,8vw,1.9rem)`).

## Preview-pane artefacts — don't chase phantoms

When verifying in a browser pane, these are **tooling artefacts, not bugs**:

- `requestAnimationFrame` is suspended in a hidden/throttled tab. An **awaited**
  rAF never settles → infinite hang. Always race it against a timeout.
- `IntersectionObserver` may not fire in a hidden tab, so reveal animations look
  broken when they aren't.
- Screenshots come back at the *pane* size, not the viewport size you set.
- A dead dev server returns blank screenshots that look like a rendering bug.
  Check the server is alive before diagnosing.

I once reported "mobile anchor links are broken" from one of these. Verify
against a real viewport before believing a negative result.
