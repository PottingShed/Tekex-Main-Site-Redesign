# The TEKEX arcade

`play.html` is the easter egg behind the footer's sixth button. A handheld
rises out of the page; its screen plays one of three games, never the one
you played last. `js/play.js` is the console. Each game is one file here and
only the chosen one is loaded.

| No. | on screen | id | file | metric |
|---|---|---|---|---|
| 01 | TEKEX Jump | `land` | `land.js` | time in ms, lower is better (each bug squashed takes a second off) |
| 02 | TEKEX Space | `invaders` | `invaders.js` | score, higher is better |
| 03 | TEKEX Pong | `pong` | `pong.js` | score, higher is better |

Visitors choose with the Jump | Space | Pong picker beside the handheld, or
SELECT on the title screen; a reload serves a different game.

`?g=<id>` forces a game; `?cw=<pair>` forces a colour pair.

## The screen

- 160 × 144 pixels, 1-bit, in the active pair only: `api.ink()` and
  `api.ground()`. No other colours, no alpha, no anti-aliasing — round every
  coordinate. Mid-tones are dithers (sprite chars `:` `|` `=` `-`).
- The console draws a HUD strip over **y 0–8** after your `render()`. Keep
  anything that matters at `api.TOP` (10) and below.
- `render(ctx)` paints the whole frame every time, starting with a ground fill.
- The screen is shown as a dot matrix: every lit pixel gets a hairline gap.
  Single-pixel detail survives; 1px lines read as dotted, which is the look.
- All three games share one visual language — the original handheld's: 8×8
  tile rhythm, chunky outlined sprites, ink on ground. They should look like
  one console's library.

## The api (from `js/play.js`)

```
W, H, TOP                 160, 144, 10
reduce                    prefers-reduced-motion: no bobbing/particles for show;
                          shake and flash already no-op. Gameplay unchanged.
ink(), ground()           current colours (they change on every death)
key(k), hit(k)            held / pressed this step. k: left right up down a b
                          (start and select belong to the console)
pointerY()                pointer height over the screen in game px, or null
sfx(name)                 shoot hit boom bonus step0-3 blip pad goal miss jump
                          bump plus stomp die win start select type err over
sprite(rows)              rows of chars: . clear  # ink  o ground (opaque)
                          : checker  | v-stripes  = h-stripes  - sparse dots
draw(ctx, s, x, y, flip, scale)
text(str, x, y, {scale, align:'left|center|right', color:'ink|ground', bg})
textW(str, scale), box(x, y, w, h, inverse)
maskCanvas(mask, 'ink'|'ground')    cached canvas of a mask; bump mask.v after
                                    editing mask.d to repaint it
raster(svg, w, h, {rotate:±90, fill, threshold}) -> Promise<mask>
load(path) -> Promise<text>         site-root relative
logo(w, {rotate, paths, h}) -> Promise<mask>   the wordmark as a mask.
                          paths keeps only those <path>s of the logo SVG and
                          the full 304×63 frame: 0 first E's middle bar,
                          1 second E's middle bar, 2 T + first E's top bar,
                          3 K + second E + X, 4 first E's bottom bar.
hud({...})                values for the HUD strip (see META in play.js)
shake(frames), flash(), buzz(ms)
over(score)               game over — the console takes it from here
finish(ms)                Land: run complete
reload()                  Land: a death — re-inks the page, calls reset()
music(name)              switch tune mid-play ('rush'); music() returns to the game's own
frame(), rand(a, b)
```

mask: `{ w, h, d: Uint8Array (1 solid), n: solid count, v: version }`

A game file registers a factory:

```js
window.TEKEX_GAMES = window.TEKEX_GAMES || {};
TEKEX_GAMES.invaders = function (api) {
  return {
    init: function () { /* optional, may return a Promise (masks) */ },
    reset: function () { /* a fresh game */ },
    update: function () { /* one 60Hz step */ },
    render: function (ctx) { /* the whole frame */ },
    attract: function () { /* optional: animates the title screen */ }
    // Land only: select: [{ id, name, role, sprite, frames }], choose(id)
  };
};
```

The title card covers x 16–144, y 34–116 of the attract scene.

Test headless before opening a browser: `node qa/game-harness.mjs <id>`.

## The leaderboard

Scores are kept on the visitor's device until the board is shared. To share
it (about ten minutes, needs a free Supabase account):

1. Create a project at supabase.com. In **SQL editor**, run:

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  game text not null check (game in ('invaders', 'pong', 'land')),
  name text not null check (name ~ '^[A-Z0-9 ]{1,10}$'),
  score integer not null check (score > 0 and score < 100000000),
  created_at timestamptz not null default now()
);
create index scores_board on public.scores (game, score);
alter table public.scores enable row level security;
create policy "anyone reads" on public.scores for select using (true);
create policy "anyone adds" on public.scores for insert with check (true);
-- no update or delete policy: visitors can add, never change or remove
```

2. **Project settings → API**: copy the project URL and the `anon` public
   key into `js/play-config.js`. The anon key is meant to be public; the
   row-level security above is what protects the table.

**Moderation.** The name filter in `play.js` refuses rude words, l33t
spellings and stretched letters, but nothing catches everything. To remove
or rename an entry: Supabase → **Table editor → scores**, edit or delete the
row. Scores are submitted by the browser, so a determined person could post
a fake one; delete it the same way.
