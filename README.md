# TEKEX — tekex.co redesign

The new tekex.co, designed and built by Potting Shed. Plain static HTML, CSS
and JavaScript: no framework, no bundler, nothing to install to serve it.

## Run it locally

Any static web server, from the repo root:

```bash
python3 -m http.server 8150
```

Then open <http://localhost:8150>. (Open it through a server, not as a file:
the pages load fonts and scripts by relative URL.)

## How the pages are made

The HTML files in the repo root, `journal/` and `play/` are **built** — each
says so in a comment under its doctype. Don't edit them by hand: the next
build overwrites them. Edit the sources in `build/` and run:

```bash
python3 build/build.py
```

Python 3, standard library only. It rewrites every page in a fraction of a second;
commit the source change and the rebuilt pages together.

| To change | Edit |
|---|---|
| The homepage | `build/pages/index.html` |
| Anything every page shares — footer, team, Stay in the loop, Get involved, the photo print filter | `build/partials/*.html` |
| The top bar and phone menu | `nav()` in `build/build.py`; its logo (which draws itself on arrival) is `build/partials/wordmark.html` |
| The colour-pair boot script (inlined into every `<head>`) | `js/boot-colourway.js` |
| About, Contact, Events, Case studies, Journal, Play | that page's `build_<name>()` function in `build/build.py` |
| Testimonials (case studies and homepage) | `VOICES` in `build/build.py` |
| Journal articles | `build/data/posts.json` |
| Events | `EVENTS` in `build/build.py`: one entry per event makes its page (`events/<slug>.html`), its place in What's on or the archive, and the homepage's event card. The older archive records are in `build/data/history.json` and `eventbrite.json` |
| Styles, scripts, fonts, images | `css/`, `js/`, `fonts/`, `assets/` directly — the build doesn't touch them |

Why a build at all: the pages share a lot (head, nav, footer, sign-up, team),
and keeping fifteen hand-edited copies in step is how sites drift. The build
keeps one copy of each shared part, and it also writes the **version stamp**
(`?v=…`) on every CSS and JS link — a fingerprint of their contents, so it
changes exactly when they do and a returning visitor never gets new HTML with
old CSS. There is nothing to bump by hand.

`build/asset-scripts/` is separate: a record of how some images were made.
Nothing runs it; see its README.

## What's where

```
index.html, about.html, …   the site's pages (built — see above)
journal/                    journal articles (built)
events/                     a page for each event in EVENTS (built)
play/                       the TEKEX Arcade (built page; games in js/games/)
play.html                   redirect to play/ (built)
404.html                    page not found, served by the host for any missing
                            address (built; links resolve from <base href>)
css/
  tokens.css                colour pairs, type scale, spacing — start here
  base.css                  reset, @font-face, primitives, keyframes
  components.css            kicker, headings, buttons, cursor
  site.css                  site-wide sections, nav, footer
  about.css, events.css, …  one per page
js/
  boot-colourway.js         picks the colour pair before first paint (inlined)
  system.js                 the motion engine: smooth scroll, cursor, reveals,
                            parallax, marquees, deferred video
  site.js                   site features, numbered modules (the footer
                            moment is the last)
  play.js, games/           the arcade
fonts/                      PP Neue Montreal, four woff2 weights (licensed)
assets/                     images, logos, video — assets/README.md maps it all
build/                      page sources and the build (see above)
```

## The colour system

TEKEX is four colour pairs, each one saturated ink on its own ground:
blue/butter, magenta/mint, purple/lime, red/pink. One pair
is the whole look: the site picks one at random on every page load, never the
same as the last, and never puts two pairs on screen together.

Components never name a colour. They use `--t-*` slots, which each section sets
from the active pair (`css/tokens.css`). New components should do the same.

## Conventions

- Behaviour is wired with `data-*` attributes, not classes: `data-parallax`,
  `data-marquee`, `data-hot` (cursor grows), `data-cursor="Read"` (cursor
  word), `data-stack`, `video[data-src]` (deferred video) and so on. The
  modules that read them are in `js/system.js` and `js/site.js`.
- Every animation honours `prefers-reduced-motion`.
- Comments explain *why* — the decision and the reason — so the next person
  doesn't undo it.
- Heavy media never loads before first paint.

## Preview switches

URL parameters for reviewing; visitors never carry them.

| | |
|---|---|
| `?cw=blue` (`magenta`, `purple`, `red`) | force a colour pair |
| `?print` | play the nav logo's sting (it otherwise plays when someone arrives on the site or refreshes, not as they click between pages) |
| `?debug=logo` | with `?print`: expose `window.__sting(fw)` for studying the sting frame by frame — see `docs/03-motion.md` |
| `?debug=founders` | expose `window.__moment` in the console for testing Ed and Tom's physics once they're out (hover Play) — see `docs/03-motion.md` |

## Further reading

The reasoning behind the system, with the bugs it cost to get there — read
these before changing how something looks or moves:

- `docs/02-design-system.md` — the colour tokens, type scale, rhythm, components
- `docs/03-motion.md` — smooth scroll, the cursor, reveals, the nav logo's
  print, and Ed and Tom in the footer (with the rules of their world)
- `docs/04-responsive.md` — breakpoints, measure caps, overflow
- `docs/05-conventions.md` — code conventions, accessibility, launch meta

The brief, brand guidelines and approved wireframes are Potting Shed's and
come with the handover, outside this repo.

## Hosting

Static files, so any static host works. The preview is GitHub Pages, served
from `main` (`.nojekyll` is there so Pages serves the files as they are).

## Before launch

- **Share URL.** Set `SHARE` in `build/build.py` to `https://www.tekex.co/`
  and rebuild — every page's share image and URL come from it. (It points at
  the GitHub Pages preview for now, because tekex.co is still the old site.)
- **Mailing list.** The sign-up form has no endpoint yet: until it has one, it
  tells people to email hello@tekex.co. Set `data-endpoint` on
  `form#signup` (in `build/partials/updates.html`) to a URL that accepts a
  JSON `POST` of `{ "email": "…" }`, and add the provider's consent wording.
- **Privacy notice and cookie policy** link to the old site's pages
  (`www.tekex.co/privacy-policy`). They need pages on the new site.
- **Content still to confirm** with TEKEX: the figures in the numbers band,
  partner logos, and on the case studies — Awendio's "Where TEKEX comes in"
  is placeholder copy, what3words' 85% and Yoono's Top 10 to be confirmed,
  and the Yoono photo's licence.
- **Adding an event:** add an entry to `EVENTS` in `build/build.py` (the
  comment above it lists the fields), add its artwork to
  `assets/photography/events/`, run `build/asset-scripts/events/og.py` for its
  share image, then rebuild. It gets its own page, `events/<slug>.html`, and
  appears in What's on and on the homepage.
- **After an event:** what counts as coming up is decided when the site is
  built, so rebuild once an event has passed to move it into the archive.
  Until then it hides itself the day after (`data-event-date`), and on its
  own page Register gives way to What's on next.
