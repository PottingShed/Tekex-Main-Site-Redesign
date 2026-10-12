# Tekex — main website redesign

Redesign of **tekex.co**. Static site, no build step.

This folder is a handover from the Tekex Health Innovation Jersey event site
build. The design system, motion engine and quality bar all came from that
project and are documented here so this one starts where that one finished.

## Start here

**Starting a new Claude Code conversation on this folder?** Paste `PROMPT.md`.
`CLAUDE.md` loads automatically alongside it.

If you're a person: read `docs/wireframes/` first — they're the approved spec —
then `docs/06-brief.md` and `docs/01-brand.md`.

## Local preview

In Claude Code, use the browser pane rather than a terminal:

```
preview_start {name: "tekex-site"}
```

Or by hand:

```bash
npx -y http-server -p 8150 -c-1
```

## Layout

```
PROMPT.md                  the master prompt — paste this to start a session
CLAUDE.md                  project rules, auto-loaded by Claude Code
docs/                      the handover — brand, system, motion, responsive, brief
docs/wireframes/           the approved spec: homepage D9 + About D3, 3 Oct 2026
css/tokens.css             the four colour pairs, type scale, rhythm
css/base.css               reset, primitives, keyframes, @font-face, skip link
css/components.css         kicker, display headings, buttons, cursor
js/boot-colourway.js       picks the colour pair for this load (inlined in head)
js/system.js               motion engine: scroll, cursor, reveals, marquee, lazy video
fonts/                     PP Neue Montreal — four woff2, licensed and in use
assets/                    all brand, photography, logos, video — see assets/README.md
reference/                 the finished event site, for reference
index.html                 scaffold — proves the system boots, nothing designed yet
```

## The colour system

Tekex is four fixed pairs — one saturated ink on its own pastel ground:
blue/butter, magenta/mint, purple/lime, red/pink. The pairs are never mixed on
screen. **The site picks one at random on every load and never repeats the
previous one**, so it keeps feeling fresh. Refresh the scaffold to see it.

## Before you design anything

Read the wireframes in `docs/wireframes/` — they are the approved spec, not a
suggestion. Then `docs/01-brand.md`.

Outstanding: current figures for the numbers band, four team headshots, and
the partner / supported-business logos. The live tekex.co hero still promotes
an event from November 2021, and its stats stopped counting in the same year.
`docs/06-brief.md` has the full list.
