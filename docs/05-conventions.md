# 05 — Code conventions, and the bugs that bit us

## Structure

Static. No framework, no bundler, no `npm install`; the site is served as
plain files.

The pages themselves are **built**: `python3 build/build.py` writes every HTML
file from the sources in `build/` (the homepage, the shared partials, each
page's builder, the data). Never hand-edit a built page — the README has the
map of where each thing is edited.

```
css/tokens.css     colour, type scale, rhythm — the only place hex lives
css/base.css       reset, primitives, keyframes, @font-face, skip link
css/components.css kicker, display headings, buttons, cursor
css/site.css       site-wide sections, nav, footer
css/<page>.css     one per page
js/system.js       the motion engine (do not edit the constants casually)
js/site.js         site features, numbered modules
```

Load order matters: `tokens → base → components → site → page`.

Per-page CSS goes in `css/<page>.css`. Don't grow `components.css` with
one-page styles.

## Markup conventions

Behaviour is wired by `data-*` attributes, not classes, so `system.js` never
needs editing when you add a section:

| Attribute | Does |
|---|---|
| `data-hscroll` | Horizontal track — smooth scroll yields sideways gestures |
| `data-scrolllock` | Modal / mobile menu — smooth scroll yields entirely |
| `data-parallax="34"` | Parallax this image by N px |
| `data-fx` + `data-amt` | Scroll-driven rotate/scale on a motif |
| `data-marquee="46"` | Auto-advancing marquee at N px/sec |
| `data-hot` | The inverting cursor grows over this |
| `data-cursor="Read"` | The cursor carries this word over the element |
| `data-stack` | Children stack in as it scrolls into view |
| `data-event-date` | An event card hides itself the day after this date |
| `video[data-src]` | Deferred until `window.load` |

Required on `<html>`: `class="js-cursor js-kicker"`. Both are progressive — drop
them and the page is static but correct.

## Comments

Record the **decision and the reason**, not what the code does. The event site's
comments are the model:

```css
/* the nav goes mobile at 880, but the layout grids should not — collapsing
   everything at the same width gave a 768 tablet the phone treatment */
```

That comment is why nobody has "tidied up" the two breakpoints into one. Write
comments that stop the next person undoing a decision.

## Accessibility baseline

Non-negotiable, all already in place on the event site and worth matching:

- A `.skip` link, first focusable element.
- `alt` on every image. The event site had 106/106.
- `a:focus-visible, button:focus-visible{outline:3px solid currentColor;outline-offset:3px}`
- One `<h1>` per page, no heading-level jumps.
- No duplicate `id`s.
- `aria-hidden` on decorative `<br>`s and motifs.
- `prefers-reduced-motion` honoured in every animation.
- Contrast is the one known failure: red on pink is about 2.6:1, below AA.
  The pairs are the brand and the owner has settled the trade-off — don't
  change a pair's colours without asking.

## Meta and SEO — the launch checklist

The event site reached launch with three `example.com` placeholders still in it.
Here, every page's share tags, canonical, `theme-color`, favicon and JSON-LD
are written by the build. Canonicals already point at `https://www.tekex.co/`.
The share URLs (`og:url`, `og:image`, `twitter:image`) come from `SHARE` in
`build/build.py`, which points at the preview for now: **set it to
`https://www.tekex.co/` and rebuild before launch.** A relative `og:image`
silently does not render in shares, so it must stay absolute.

The social image is `assets/og.png`, 1200×630.

## Performance

- Nothing heavy before first paint. Defer video, lazy-load below-fold rasters.
- GIFs used as animation are the usual offender — a muted looping `<video>` or
  webm is roughly **10× smaller**.
- Give every deferred media element a **fixed size in CSS** so the swap causes
  no layout shift.
- Audit for unreferenced assets before shipping. The event repo still carries
  **146MB** of unused video that nobody noticed until it was looked for.

## Cross-browser risk to check

- `mask-image` needs a `-webkit-` prefix or it is **invisible on older Safari**.
- `color-mix()` needs a solid fallback declared first.
- `backdrop-filter` needs an `@supports not` fallback (the cursor has one).
- `overflow:clip` is well supported now but check if you need older Safari.

---

## Bugs worth not repeating

Collected from this project. Each one was a confidently-wrong answer at some
point.

**`CSSStyleRule.cssRules` is empty-but-truthy.** Since CSS nesting landed, every
style rule has a `cssRules` list. So `if (r.cssRules) continue;` — intended to
skip at-rules — skips *every rule*. An audit script using that reported "no
motion found" on every site it was pointed at, including sites full of motion.

**`document.elementsFromPoint` only works for on-screen elements.** A contrast
checker using it happily hit-tested things scrolled out of view and returned
nonsense. Scroll the element into view first, or don't use hit-testing.

**An awaited `requestAnimationFrame` never settles in a throttled tab.** It
hangs forever, with no error. Always `Promise.race` it against a timeout.

**`querySelectorAll('*')` per section looks like a hang** on a large page. Scope
it.

**A default-cursor check matched `<html class="js-cursor">`** and concluded the
cursor was fine when it wasn't. Be specific about which node you're asserting on.

**A non-moving cursor reports `0ms` lag**, which looks like a perfect score.
Verify the thing moved before measuring how smoothly it moved.

**`while read` in bash drops the last line of a file with no trailing newline.**
This silently left `index.html` out of a deploy bundle. Use Python for file
lists, or `while read || [ -n "$line" ]`.

**A `ResizeObserver` that writes a style re-triggers itself.** Settle within a
tolerance and guard with a `busy` flag. See `docs/04-responsive.md`.
