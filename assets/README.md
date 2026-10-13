# Assets

Everything gathered from the Tekex projects on this machine. Provenance is
recorded because several of these came from folders you would not find by
looking in the obvious place.

| Folder | What | Where it came from |
|---|---|---|
| `brand/` | TEKEX logo, `↗TEKEX.CO` lockup, powered-by-Potting-Shed, arrow + geometric marks, gradient | `Tekex Revolut Redesign/Tekex assets and examples/` |
| `social-templates/` | **39 social builds, 1080 and 1200** — the brand's real artwork | same |
| `motifs/` | 4 oversized geometric marks (rings, square, star, tri) | event site |
| `icons/` | 10 audience icons, 5 themed icons, LinkedIn + Instagram | event site |
| `photography/event/` | 2 b/w event photos + 4 "reasons" crops | event site |
| `speakers/` | 15 greyscale cutouts, web-ready `.webp` | event site |
| `logos/` | bdo, c5, rathbones, red5, wildpeak, yoono, pottingshed | event site sponsors |
| `video/` | 5 abstract brand loops + 3 posters | event site |
| `reference/` | Type specimens, site screenshots, collected inspiration | `Tekex assets and examples/` |
| `event-subbrand/` | Health Innovation lockups | event site |
| `team/` | Ed, Tom, Louis, Jenson — 4:5 greyscale WebP at 400 and 640w | `output/Matched Staff Portraits/`, 12 Oct 2026. Ed and Tom are original studio shots; **Louis and Jenson are AI-edited** to match them (see that folder's Generation Notes) — need their sign-off before launch |
| `team/jenson-artus-*`, `team/louis-pike-*` | 13 Oct: "Aligned Black and White plus contrast" (owner-supplied, now in `output/Matched Staff Portraits/v8 - Plus Contrast/`), Lanczos to 400/640, WebP q82 — v6 crops with the highs lifted to Ed and Tom's (face p95 235–242 vs their 221–248). Their backdrops clip to white where Ed and Tom's paper sits at 222–238, but every portrait is printed (`.print`) and all four backdrops resolve to the flat ground, so it does not show. v7 tried and rejected. AI-edited — **Jenson and Louis to sign off** |
| `logos/` additions | `awendio-solaris.svg`, `io-co.svg`, `what3words.svg` (supported-business ticker) | supplied by Luke, 12 Oct 2026. Cleaned for use as CSS masks; what3words built from their official one-colour artwork with the slashes cut through |
| `photography/tekex/` | Real TEKEX event photography + IOM3 key art, greyscale WebP at 800–2400w | scraped from the live tekex.co (Wix media), 12 Oct 2026, with the owner's go-ahead. Temporary until originals are supplied |

## Start with `social-templates/`

This is the single most useful folder. 39 finished social builds showing the
brand system actually applied: the top bar with `↗ TEKEX.CO`, the bottom bar
with the TEKEX logo, a category label (`FUNDRAISING`, `NEWS`, …) and the
powered-by mark, oversized numerals, and the triangle/chevron ground pattern.

**All four colourways appear across the set**, which is how the palette in
`css/tokens.css` was derived — sampled from these, not guessed. Two useful
examples: `1200 build-1.jpg` (blue on butter, "£22M raised through Tekex in
2025") and `1080 build-5.jpg` (red on pink, illustrated event photography).

`1200 build.svg` and `1200 build-1.svg` are editable vector versions.

## Not copied, and why

**`36301 TKX JSY SMTK.pdf` — 203MB, 65 pages**, in
`Tekex Revolut Redesign/Tekex assets and examples/`. A Figma PDF export with
all type outlined, so no text can be pulled from it and it could not be
rendered here. The name suggests a Tekex Jersey summit/toolkit document and it
may well be the full brand guidelines. **Worth opening by hand** — if it
contains the type and colour specification, it supersedes the sampled values
in `docs/01-brand.md`.

**Speaker master cutouts** — 15 transparent PNGs at ~2–3MB each live in
`~/Documents/ChatGPT Co Work/TEKEX SPEAKERS IMAGE EDIT/Transparent PNGS /`
(note the trailing space). Deliberately **not** duplicated here: that folder is
re-exported periodically and is usually newer than any copy. Go to the source
if you need a different crop. The web-ready `.webp` versions in `speakers/` are
derived from them.

**The event film and uncompressed originals** — `film.mp4` (28MB),
`film 2.mp4` (64MB), `Banner Video.mp4` and `Footer Loop.mp4` (28MB each) stay
in the event repo. Event-specific content plus pre-compression masters; ~148MB
of no use to the main site.

## Licensing

The `video/` loops are **Artlist stock**, not original work:

- `hero-loop.mp4` — Artlist "700095 Bouncy Drop Circle Sphere"
- `closing-loop.mp4` — Artlist "700103 Bubble Black Bouncy Square"

Abstract and brand-agnostic, so they carry over fine — but check the Artlist
licence covers a second project before shipping them on tekex.co.

The `reference/imageye_*.jpg` files were scraped from the web as inspiration.
**Reference only — never ship them.**

## Still needed

1. ~~Four team headshots~~ — supplied 12 Oct (Louis/Jenson sign-off pending).
2. **Strategic partner logos** — "to be supplied" per the wireframe.
3. ~~Supported-business logos~~ — all four supplied 12 Oct.
4. **Current event photography** for the hero film and the Events cards. The
   homepage now uses three real shots scraped from tekex.co
   (`photography/tekex/`); originals and the event film edit are still wanted.
   `photography/event/r1–r4` look like stock, not TEKEX — not used.

## Added 12 Oct 2026 (site build)

| Path | What | Source |
|---|---|---|
| `video/tekex-hero-1600.mp4`, `-960.mp4` | Homepage hero film, 47s, greyscale, no audio (5.8MB / 2.1MB) | `Tekex_vid.mp4` supplied by Luke, trimmed to 2.6–49.6s (the TV-graphic shots at each end removed), encoded with ffmpeg. The 99MB original is not in the repo |
| `video/loop-1280.mp4`, `-960.mp4` | "Stay in the loop" film on every page (2.5MB / 1.5MB) | `banner-loop.mp4` from the Health Innovation site, re-encoded greyscale. Artlist stock — **licence to confirm** |
| `icons/tekex/` | Site icons, one family: invest (money plant — not used: the owner, 12 Oct, wants Invest read as growth, not cash, so the card uses `pillars/invest`), inspire (presentation), founders (launch), investors (hand + sprout — business-startups 039 "grow"; replaced the money bag 12 Oct: owner wants no dollar-sign icons anywhere), businesses (building), business-leaders (briefcase), advisers (expert), policymakers (justice), visible (eye — supplied as eye.svg 12 Oct, replacing the pack eye), together (group discussion), forward (summit + flag — business-startups 029 "goal"; replaced the scalability chart 12 Oct, which read as profit, not progress) | Flaticon packs supplied by Luke 12 Oct (business-startups 12333338, consulting 16330642, creativity 9437646, coexistence 10169218 — same designer style as the event-site audience icons). **Flaticon Basic licence: requires visible attribution to Freepik / flaticon.com unless the downloading account is Premium** |
| `icons/pillars/` | Invest / Inspire / Impact card icons — Invest (the sprout) and Impact in use; TEKEX is community-led, so Invest means growth more than returns (owner, 12 Oct) | supplied by Luke |
| `photography/journal/` | Journal covers, colour WebP (shown unprinted on the Journal; printed wherever else they appear) | tekex.co/news, 12 Oct 2026 |
| `photography/events/` | Past-event artwork for the Events archive, 940×470 / 600×300 colour WebP, shown unprinted — each event has its own design (owner, 12 Oct). #32, Health Innovation and T-Gen are monochrome at source | 11 from tekex.co/events; 31 from TEKEX's own Eventbrite listings (organiser 19836932273, back to #10, June 2019); Gsy #5 via Channel Eye — all 12 Oct 2026 |
| `photography/events/*-1880.webp` | 13 Oct: 1880×940 cuts for the Events gallery, from the originals on Eventbrite's CDN (cdn.evbuc.com, the images on each event's own listing), centre-cropped 2:1. 49 of 52; #16 and #21 only exist at 640–880px and Gsy #5 has no listing image, so those three stay at 940. |
| `photography/events/tekex-01` … `tekex-09` | 13 Oct, at the owner's request: posters for TEKEX #1–#9, whose artwork didn't survive, **recreated** in the style of the 2019 series (#10–#13) — a procedural particle-wave render (no stock imagery) with the TEKEX wordmark and the number in PP Neue Montreal Book, synthesised italic. Alt text on the site says "recreated". |
| `photography/tekex/surfers-{640,1100}.webp` | Surfers from above, the About ambition poster's picture — the one photo shown in full colour, under a subtle graded near-black (--ink) wash so the type holds | supplied by Luke, 13 Oct 2026 — **licence/credit to confirm** |
| `og.png`, `og/*.jpg` | Share cards, 1200×630: the site card (from `qa/og-card.html`) and one per article, cut from its cover | made 12 Oct 2026 |
| `icons/tekex/island-*.svg` | Jersey, Guernsey, Isle of Man outlines for the Contact cards | coastlines from OpenStreetMap (ODbL, attribution required) and Natural Earth (public domain), simplified 12 Oct 2026 |

**Now unreferenced** (carried over from the event site, kept until someone
decides): `video/banner-loop.mp4` (5.2MB — superseded by `loop-*`),
`hero-loop.mp4`, `closing-loop.mp4`, `footer-loop.mp4`, `overview-4-5.mp4`
and their posters — ~37MB. Don't deploy them.
