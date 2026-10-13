/* ==========================================================================
   invaders.js — TEKEX Invaders, No. 01 of the arcade (the console is
   js/play.js; the api this codes against is written out in README.md).

   The owner's brief: "Space invaders where the target you are trying to
   hit is a big version of the tekex logo". So there is one invader and it
   is the wordmark, 96px wide, marching and dropping the way a whole
   formation would. It is destructible pixel by pixel: every shot punches a
   ragged crater, the score is the pixels knocked out, and the shape left
   at the end of a wave is a record of how it was played.

   The shields are the three islands the network spans, rastered from the
   site's own coastline icons. The player is a cannon with the brand's plus
   cut into it, holding the shore at the foot of the screen.
   ========================================================================== */
(function () {
  'use strict';
  window.TEKEX_GAMES = window.TEKEX_GAMES || {};

  TEKEX_GAMES.invaders = function (api) {
    var W = api.W, H = api.H, TOP = api.TOP;
    /* The playfield, top to bottom: the bonus lane, the logo's landing row,
       the islands, the cannon, the shore line. The cannon sits one dot
       above the line so the two never merge on the dot matrix. */
    var BONUS_Y = 12, LAND_Y = 12, ISLE_Y = 104, PY = 126, GY = 135;
    var LOGO_W = 96, IW = 24, IH = 18, PW = 11;
    var SPEED = 1.4, SHOT_V = 4, CLEAR = 0.03;
    // west to east, as they lie on the map
    var ISLES = ['isle-of-man', 'guernsey', 'jersey'];

    /* ---- sprites --------------------------------------------------------------
       Chunky and outlined, the handheld's own language. The cannon is the
       arcade silhouette with the brand's plus knocked through it in ground,
       so it still reads as a plus over anything. */
    var CANNON = [
      '.....#.....',
      '....###....',
      '.#########.',
      '#####o#####',
      '####ooo####',
      '#####o#####',
      '###########'
    ];
    var cannon = api.sprite(CANNON);
    // invulnerable: the same cannon in a checker, a ghost rather than a gap
    var ghost = api.sprite(CANNON.map(function (r) { return r.replace(/#/g, ':'); }));
    var pmask = [];
    CANNON.forEach(function (r) { for (var x = 0; x < PW; x++) pmask.push(r[x] && r[x] !== '.' ? 1 : 0); });
    var wreck = [
      api.sprite(['#...#...#..', '..#...#...#', '.#..#.#.#..', '...#####...', '.#.#####.#.', '..#######..', '###########']),
      api.sprite(['..#...#..#.', '#...#...#..', '...#.#.#..#', '.#.#####.#.', '...#####...', '.#########.', '###########'])
    ];
    /* Bombs: a 3x6 zig-zag in two phases. Drawn from the same offsets the
       collision test reads, so what you see is exactly what hits you. */
    var ZIG = [[0, 1, 2, 1, 0, 1], [2, 1, 0, 1, 2, 1]];
    var bombS = ZIG.map(function (o) { return api.sprite(o.map(function (x) { return ['#..', '.#.', '..#'][x]; })); });
    var PLUS = ['...###...', '...###...', '...###...', '#########', '#########', '#########', '...###...', '...###...', '...###...'];
    var plusS = api.sprite(PLUS);
    var plusO = api.sprite(['...###...', '...#o#...', '...#o#...', '####o####', '#ooooooo#', '####o####', '...#o#...', '...#o#...', '...###...']);
    var sparkS = api.sprite(['#...#', '.#.#.', '.....', '.#.#.', '#...#']);
    var splatS = api.sprite(['..#..', '#.#.#', '.###.', '#.#.#', '..#..']);
    /* The shore: the blurb has three islands "between it and the shore", so
       the strip under the line is sand, a dither that thins as it goes. */
    var rep = function (s, n) { return new Array(n + 1).join(s); };
    var sand = api.sprite([rep('.#', 80), rep('.', W), rep('#...', 40), rep('.', W), rep('..#.....', 20), rep('.', W), rep('......#.', 20)]);

    /* ---- state ---------------------------------------------------------------- */
    var base = null, total = 1, logo = null, isleBase = [], isles = [], isleX = [];
    var LX = 0, LY = 0, dir = 1, y0 = 24, marchT = 0, dirty = true, bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
    var px = 0, cool = 0, safeT = 0, downT = -1, deadX = 0, lives = 3, score = 0, wave = 1;
    var phase = 'land', phaseT = 0, bannerT = 0, clearPts = 0, ashore = false, overSent = false;
    var shots = [], bombs = [], parts = [], fx = [], bonus = null, bonusWait = 0, bombT = 0;
    var tick = 0, lastNote = -99, noteI = 0, demo = false;
    var gone = [];

    var clone = function (m) { return { w: m.w, h: m.h, d: new Uint8Array(m.d), n: m.n, v: 0 }; };
    var restore = function (m, src) { m.d.set(src.d); m.n = src.n; m.v++; };
    var setPhase = function (p) { phase = p; phaseT = 0; };

    /* ---- the islands -------------------------------------------------------------
       The icons are coastlines stroked in a 512 square with wide margins and
       no width or height, which browsers size differently and which would
       leave a 24x18 shield mostly air. So each one is cropped to its own
       coast, given an explicit size (true shape, bottoms aligned so the
       three sit on one line), and its stroke thickened before the console
       floods it solid: a hairline coast can let the flood leak inside. */
    var fitIsle = function (svg) {
      var m = /\sd="([^"]+)"/.exec(svg);
      var n = m ? m[1].match(/-?\d*\.?\d+/g) : null;
      if (!n || n.length < 6) return svg;
      // the path is absolute M/L pairs, so its points are its bounds
      var l = 1e9, t = 1e9, r = -1e9, b = -1e9, i;
      for (i = 0; i + 1 < n.length; i += 2) {
        l = Math.min(l, +n[i]); r = Math.max(r, +n[i]);
        t = Math.min(t, +n[i + 1]); b = Math.max(b, +n[i + 1]);
      }
      if (!(r > l && b > t)) return svg;
      var pad = 22;   // half the thickened stroke, and a hair
      var vb = [l - pad, t - pad, r - l + pad * 2, b - t + pad * 2].map(function (v) { return Math.round(v); }).join(' ');
      return svg.replace(/stroke-width="[\d.]+"/, 'stroke-width="40"').replace(/<svg\b([^>]*)>/, function (all, attrs) {
        return '<svg' + attrs.replace(/\s(viewBox|width|height|preserveAspectRatio)="[^"]*"/g, '') +
          ' width="' + IW + '" height="' + IH + '" viewBox="' + vb + '" preserveAspectRatio="xMidYMax meet">';
      });
    };
    // if an icon can't be had, the arcade's own bunker stands in
    var bunker = function () {
      var d = new Uint8Array(IW * IH), n = 0, x, y;
      for (y = 0; y < IH; y++) for (x = 0; x < IW; x++) {
        var c = Math.abs(x - (IW - 1) / 2);
        if ((y < 4 && c > 7.5 + y) || (y > 11 && c < 5)) continue;
        d[y * IW + x] = 1; n++;
      }
      return { w: IW, h: IH, d: d, n: n, v: 0 };
    };
    // and if the wordmark can't be had, five blocks march in its place
    var blocks = function () {
      var w = LOGO_W, h = 20, d = new Uint8Array(w * h), n = 0, i;
      for (i = 0; i < d.length; i++) if ((i % w) % 20 < 16) { d[i] = 1; n++; }
      return { w: w, h: h, d: d, n: n, v: 0 };
    };

    /* ---- the logo's remaining shape ------------------------------------------------
       Edges, drops and the landing all read the pixels that are left, not
       the original box: carve a whole side off and it marches further. */
    var bounds = function () {
      if (!dirty) return;
      dirty = false;
      var w = logo.w, h = logo.h, d = logo.d, x, y;
      bx0 = w; bx1 = -1; by0 = h; by1 = -1;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        if (!d[y * w + x]) continue;
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        by1 = y;
      }
    };
    var lowest = function (c) {
      for (var r = logo.h - 1; r >= 0; r--) if (logo.d[r * logo.w + c]) return r;
      return -1;
    };
    var solid = function (m, x, y) { return x >= 0 && y >= 0 && x < m.w && y < m.h && m.d[y * m.w + x]; };

    /* ---- craters ---------------------------------------------------------------------
       A round core, then a few bites further out so no two craters are the
       same shape. Sizes, as [core radius², bite distance, bites]: the logo
       takes the big one; a bomb takes a mouthful of island; a shot from
       underneath only a narrow plus, so firing through your own island
       wears a channel rather than a canyon. Removed pixels go in `gone`. */
    var BIG = [5, 3, 2], BOMB_BITE = [2, 2, 1], SHOT_BITE = [1, 2, 1];
    var nib = function (m, x, y) {
      if (!solid(m, x, y)) return;
      m.d[y * m.w + x] = 0; m.n--;
      gone.push(x, y);
    };
    var crater = function (m, cx, cy, size) {
      var dx, dy, a, bites = size[2] + Math.floor(Math.random() * (size[2] + 1));
      gone.length = 0;
      for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= size[0]) nib(m, cx + dx, cy + dy);
      while (bites--) {
        a = Math.random() * Math.PI * 2;
        nib(m, cx + Math.round(Math.cos(a) * size[1]), cy + Math.round(Math.sin(a) * size[1]));
      }
      if (gone.length) m.v++;
      return gone.length / 2;
    };
    /* Then whatever the blast has cut loose falls away: any piece smaller
       than `min` dots, counted 8-connected. Specks read as noise on the
       matrix, and a test run without this ended wave one with a hundred
       dots of dust strewn across the screen, unhittable at full march
       speed. Now a wave ends on chunks you can aim at.
       Fallen pixels are listed in `gone`, after any already there. */
    var crumble = function (m, min) {
      var w = m.w, h = m.h, d = m.d, seen = new Uint8Array(d.length), k, p, out = 0;
      for (k = 0; k < d.length; k++) {
        if (!d[k] || seen[k]) continue;
        var piece = [k];
        seen[k] = 1;
        for (p = 0; p < piece.length; p++) {
          var x = piece[p] % w, y = (piece[p] - x) / w, dx, dy;
          for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
            var nx = x + dx, ny = y + dy, nk = ny * w + nx;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[nk] || !d[nk]) continue;
            seen[nk] = 1;
            piece.push(nk);
          }
        }
        if (piece.length >= min) continue;
        for (p = 0; p < piece.length; p++) {
          d[piece[p]] = 0; m.n--; out++;
          gone.push(piece[p] % w, Math.floor(piece[p] / w));
        }
      }
      if (out) m.v++;
      return out;
    };

    /* ---- particles: show only, so reduced motion has none ----------------------------- */
    var part = function (x, y, vx, vy, t) {
      if (api.reduce || parts.length >= 400) return;
      parts.push({ x: x, y: y, vx: vx, vy: vy, t: Math.round(t) });
    };
    /* The crater's own pixels fly out from its centre (kick is which way it
       was hit from); the first `blown` entries of `gone` are the crater,
       the rest broke off, and those just drop. All of it is short-lived:
       in 1-bit a falling dot looks exactly like a bomb, and debris that
       rained down to the cannon's row had the player dodging dust. */
    var debris = function (ox, oy, cx, cy, kick, odds, blown, life) {
      for (var i = 0; i < gone.length; i += 2) {
        var x = gone[i], y = gone[i + 1];
        if (i >= blown * 2) part(ox + x, oy + y, api.rand(-0.15, 0.15), api.rand(0, 0.3), api.rand(life * 0.7, life * 1.2));
        else if (Math.random() < odds) part(ox + x, oy + y, (x - cx) * 0.22 + api.rand(-0.25, 0.25), (y - cy) * 0.22 + kick + api.rand(-0.35, 0.2), api.rand(life * 0.5, life));
      }
    };
    var shatter = function (rows, x, y, kick) {
      rows.forEach(function (r, j) {
        for (var i = 0; i < r.length; i++) if (r[i] !== '.') part(x + i, y + j, api.rand(-1, 1), kick + api.rand(-1, 0.4), api.rand(24, 44));
      });
    };
    var mark = function (s, x, y, t) { fx.push({ s: s, x: x, y: y, t: t }); };
    var pop = function (b) { mark(splatS, b.x - 1, b.y + 1, 6); };

    /* ---- sound ---------------------------------------------------------------------------
       The four-note march, one note per step. At full tilt the logo steps
       every other frame, faster than a note can sound, so notes are held to
       one every six frames: the tempo climbs, then pins, like the arcade's. */
    var note = function () {
      if (tick - lastNote < 6) return;
      lastNote = tick;
      api.sfx('step' + (noteI++ & 3));
    };

    /* ---- the curve ---------------------------------------------------------------------------
       Every number that makes a later wave harder lives here. The march
       waits fewer frames per step as pixels go (the arcade's acceleration,
       which fell out of its CPU having fewer invaders to move), and a
       little less each wave. Bombs come faster as it is damaged, too: a
       wounded logo fights harder. */
    var tempo = function () {
      var pace = Math.max(0.55, 1 - 0.08 * (wave - 1));
      return Math.max(2, Math.round((2 + 28 * logo.n / total) * pace));
    };
    var bombV = function () { return Math.min(1.8, 1 + 0.12 * (wave - 1)); };
    var bombGap = function () {
      var every = Math.max(24, 64 - 6 * (wave - 1));
      return Math.max(10, Math.round(every * (0.35 + 0.65 * logo.n / total) * api.rand(0.7, 1.3)));
    };
    var bombCap = function () { return Math.min(6, 2 + wave); };
    /* Most bombs fall from a random column; some from the column over the
       cannon, if the logo has one. Without those, standing still under a
       gap in the letters is a strategy. */
    var aimOdds = function () { return Math.min(0.5, 0.25 + 0.05 * wave); };

    /* ---- waves ------------------------------------------------------------------------------- */
    var setupWave = function () {
      restore(logo, base);
      for (var i = 0; i < isles.length; i++) restore(isles[i], isleBase[i]);
      dirty = true;
      LX = Math.round((W - logo.w) / 4) * 2;
      LY = LAND_Y; dir = 1; marchT = 0;
      // each wave lands a little lower, to a limit, so wave five isn't over on arrival
      y0 = Math.min(24 + (wave - 1) * 4, 40);
      bombs = []; bonus = null; bombT = 80;
      bannerT = Math.ceil((y0 - LAND_Y) / 2) * 3 + 60;
      setPhase('land');
    };
    var newGame = function () {
      demo = false;
      score = 0; wave = 1; lives = 3;
      px = (W - PW) / 2; cool = 0; safeT = 0; downT = -1; deadX = 0;
      shots = []; parts = []; fx = [];
      bonusWait = Math.round(api.rand(700, 1300));
      ashore = false; overSent = false;
      tick = 0; lastNote = -99; noteI = 0;
      setupWave();
    };
    var clearWave = function () {
      var w = logo.w, cx = LX + w / 2, n = 0, k;
      // what's left goes up in one burst
      for (k = 0; k < logo.d.length; k++) {
        if (!logo.d[k]) continue;
        logo.d[k] = 0; n++;
        var x = LX + k % w, y = LY + Math.floor(k / w);
        part(x, y, (x - cx) * 0.03 + api.rand(-1, 1), api.rand(-1.6, 0.2), api.rand(30, 55));
      }
      logo.n = 0; logo.v++; dirty = true;
      clearPts = 500 * wave;
      score += n + clearPts;
      bombs.forEach(pop); bombs = [];
      api.sfx('goal'); api.flash();
      setPhase('clear');
    };
    // the wordmark arrives at the top and steps down to its wave's row
    var landStep = function () {
      if (phaseT % 3) return;
      if (LY < y0) { LY = Math.min(y0, LY + 2); note(); }
      else { setPhase('play'); api.sfx('bump'); api.shake(4); }
    };

    /* ---- the march ------------------------------------------------------------------------------
       Two pixels sideways per step; at an edge the step becomes a drop of
       four and the march turns. As it comes down it grinds through any
       island it overlaps, and when its lowest pixel reaches the cannon's
       row it has made the shore. */
    var march = function () {
      if (++marchT < tempo()) return;
      marchT = 0;
      bounds();
      if (!logo.n) return;
      var nx = LX + dir * 2;
      if ((dir > 0 && nx + bx1 > W - 3) || (dir < 0 && nx + bx0 < 2)) { LY += 4; dir = -dir; }
      else LX = nx;
      note();
      if (LY + by1 >= ISLE_Y) eraseIsles();
      if (LY + by1 >= PY) invaded();
    };
    var eraseIsles = function () {
      for (var i = 0; i < isles.length; i++) {
        var m = isles[i], ox = isleX[i], hit = false, x, y;
        var xa = Math.max(ox, LX), xb = Math.min(ox + m.w, LX + logo.w);
        var ya = Math.max(ISLE_Y, LY), yb = Math.min(ISLE_Y + m.h, LY + logo.h);
        for (y = ya; y < yb; y++) for (x = xa; x < xb; x++) {
          var k = (y - ISLE_Y) * m.w + (x - ox);
          if (m.d[k] && logo.d[(y - LY) * logo.w + (x - LX)]) { m.d[k] = 0; m.n--; hit = true; }
        }
        if (!hit) continue;
        m.v++;
        gone.length = 0;
        crumble(m, 4);
        debris(ox, ISLE_Y, 0, 0, 0, 0, 0, 12);
      }
    };

    /* ---- bombs ------------------------------------------------------------------------------------ */
    var spawnBomb = function (col) {
      if (!logo.n) return;
      bounds();
      var c = col, r = c >= bx0 && c <= bx1 ? lowest(c) : -1, tries = 8;
      while (r < 0 && tries--) { c = bx0 + Math.floor(Math.random() * (bx1 - bx0 + 1)); r = lowest(c); }
      if (r < 0) return;
      bombs.push({ x: LX + c - 1, y: LY + r + 1, f: Math.floor(Math.random() * 8), acc: 0 });
    };
    var dropBombs = function () {
      if (--bombT > 0) return;
      bombT = bombGap();
      if (bombs.length >= bombCap()) return;
      spawnBomb(Math.random() < aimOdds() ? Math.round(px) + 5 - LX : -1);
    };
    var isleAt = function (x, y) {
      if (y < ISLE_Y || y >= ISLE_Y + IH) return -1;
      for (var i = 0; i < isles.length; i++) if (solid(isles[i], x - isleX[i], y - ISLE_Y)) return i;
      return -1;
    };
    var dig = function (i, x, y, kick, size) {
      var lx = x - isleX[i], ly = y - ISLE_Y, blown = crater(isles[i], lx, ly, size);
      crumble(isles[i], 4);
      debris(isleX[i], ISLE_Y, lx, ly, kick, 0.5, blown, 12);
    };
    // pixel-true: the bomb's lit dots against the cannon's solid ones
    var touches = function (b) {
      var o = ZIG[(b.f >> 2) & 1], cx = Math.round(px);
      for (var j = 0; j < 6; j++) {
        var x = b.x + o[j] - cx, y = b.y + j - PY;
        if (x >= 0 && x < PW && y >= 0 && y < CANNON.length && pmask[y * PW + x]) return true;
      }
      return false;
    };
    /* One pixel at a time, so a fast bomb on a late wave can't step over
       the edge of an island or the barrel of the cannon. */
    var moveBombs = function () {
      var v = demo ? 1 : bombV(), live = !demo && downT < 0 && safeT <= 0 && lives > 0;
      for (var i = bombs.length - 1; i >= 0; i--) {
        var b = bombs[i], done = false;
        b.f++;
        b.acc += v;
        while (b.acc >= 1 && !done) {
          b.acc -= 1; b.y++;
          var lead = b.y + 5;
          /* On the title screen the islands stay whole and nothing bursts:
             a splat on the shore there lands right over the console's
             copyright line, like an accent on TEKEX. The bombs just go. */
          if (lead >= GY) { if (!demo) mark(splatS, b.x - 1, GY - 5, 6); done = true; break; }
          for (var c = 0; c < 3 && !done; c++) {
            var k = isleAt(b.x + c, lead);
            if (k < 0) continue;
            if (!demo) { dig(k, b.x + c, lead, 0.3, BOMB_BITE); mark(splatS, b.x - 1, lead - 2, 5); }
            done = true;
          }
          if (!done && live && touches(b)) { hitCannon(); return; }
        }
        if (done) bombs.splice(i, 1);
      }
    };

    /* ---- the cannon ------------------------------------------------------------------------------ */
    var fire = function () {
      shots.push({ x: Math.round(px) + 5, y: PY - 4 });
      cool = 8;
      api.sfx('shoot');
    };
    var wrecked = function () {
      deadX = Math.round(px); downT = 0;
      shatter(CANNON, deadX, PY, -1.4);
      bombs.forEach(pop); bombs = [];
    };
    var hitCannon = function () {
      lives--;
      api.sfx('boom'); api.shake(10); api.buzz(40);
      wrecked();
      if (lives <= 0) { lives = 0; shots = []; }
    };
    var invaded = function () {
      ashore = true;
      lives = 0;
      if (downT < 0) wrecked();
      shots = []; bombs = [];
      api.sfx('boom'); api.shake(14); api.buzz(60);
    };

    /* ---- shots ------------------------------------------------------------------------------------
       Four pixels a frame, each tested in turn, top pixel first: the bonus,
       a bomb (shots and bombs cancel, as in the arcade), an island from
       underneath, then the logo. Nothing is skipped over. */
    var logoHit = function (x, y) {
      if (!logo.n) return false;
      var lx = x - LX, ly = y - LY;
      if (!solid(logo, lx, ly)) return false;
      var blown = crater(logo, lx, ly, BIG);
      score += blown + crumble(logo, 10);
      dirty = true;
      debris(LX, LY, lx, ly, -0.7, 0.75, blown, 20);
      mark(sparkS, x - 2, y - 2, 5);
      api.sfx('hit');
      if (phase !== 'clear' && lives > 0 && logo.n <= total * CLEAR) clearWave();
      return true;
    };
    // a bomb's whole 3x6 box counts, so a shot clips one it only grazes
    var bombAt = function (x, y) {
      for (var i = 0; i < bombs.length; i++) {
        var b = bombs[i];
        if (x >= b.x && x < b.x + 3 && y >= b.y && y < b.y + 6) return i;
      }
      return -1;
    };
    var hitBonus = function () {
      var bx = Math.round(bonus.x);
      score += 300;
      api.sfx('bonus');
      shatter(PLUS, bx, BONUS_Y, -0.6);
      fx.push({ txt: '300', x: Math.min(W - 12, Math.max(12, bx + 4)), y: BONUS_Y + 1, t: 60 });
      bonus = null;
      bonusWait = Math.round(api.rand(900, 1500));
    };
    var moveShots = function () {
      for (var i = shots.length - 1; i >= 0; i--) {
        var s = shots[i], done = false, k, j, bx;
        for (k = 0; k < SHOT_V && !done; k++) {
          s.y--;
          bx = bonus ? Math.round(bonus.x) : 0;
          if (s.y < TOP) { mark(splatS, s.x - 2, TOP, 6); done = true; }
          else if (bonus && s.x >= bx && s.x < bx + 9 && s.y >= BONUS_Y && s.y < BONUS_Y + 9) { hitBonus(); done = true; }
          else if ((j = bombAt(s.x, s.y)) > -1) { pop(bombs[j]); bombs.splice(j, 1); api.sfx('blip'); done = true; }
          else if ((j = isleAt(s.x, s.y)) > -1) { dig(j, s.x, s.y, -0.5, SHOT_BITE); api.sfx('bump'); done = true; }
          else if (logoHit(s.x, s.y)) done = true;
        }
        if (done) shots.splice(i, 1);
      }
    };

    /* ---- the bonus plus ---------------------------------------------------------------------------
       It only crosses once the logo is clear of its lane, and it can only
       be reached through holes you have made in the logo. */
    var spawnBonus = function () {
      if (bonus || --bonusWait > 0) return;
      bounds();
      if (logo.n && LY + by0 > BONUS_Y + 10) {
        var d = Math.random() < 0.5 ? 1 : -1;
        bonus = { x: d > 0 ? -9 : W, dir: d };
      } else bonusWait = 60;
    };
    var moveBonus = function () {
      if (!bonus) return;
      bonus.x += bonus.dir * 0.8;
      if (bonus.x < -10 || bonus.x > W + 1) { bonus = null; bonusWait = Math.round(api.rand(900, 1500)); return; }
      // a quiet beacon, so it's heard before it's seen
      if (downT < 0 && tick % 16 === 0) api.sfx('select');
    };

    var stepFx = function () {
      var i, p;
      for (i = parts.length - 1; i >= 0; i--) {
        p = parts[i];
        p.vy += 0.08; p.x += p.vx; p.y += p.vy;
        if (--p.t <= 0 || p.y >= GY || p.x < -2 || p.x > W + 2) { parts[i] = parts[parts.length - 1]; parts.pop(); }
      }
      for (i = fx.length - 1; i >= 0; i--) if (--fx[i].t <= 0) fx.splice(i, 1);
    };

    /* ---- one step ------------------------------------------------------------------------------------
       While the cannon is down the logo holds still and holds its fire, as
       the arcade's did; shots already in the air carry on and still count. */
    var update = function () {
      if (!base) return;
      if (demo) newGame();
      tick++; phaseT++;
      if (cool > 0) cool--;
      if (safeT > 0) safeT--;
      if (bannerT > 0) bannerT--;
      if (downT >= 0) {
        downT++;
        if (lives > 0 && downT >= 64) { downT = -1; safeT = 100; }
        else if (lives <= 0 && downT >= 130) {
          // the end beat is over: the console takes it from here
          if (!overSent) { overSent = true; api.hud({ score: score, wave: wave, lives: 0 }); api.over(score); }
          return;
        }
      }
      if (downT < 0) {
        if (api.key('left')) px -= SPEED;
        if (api.key('right')) px += SPEED;
        px = Math.max(1, Math.min(W - PW - 1, px));
        if ((api.hit('a') || api.hit('up')) && shots.length < 2 && cool <= 0) fire();
      }
      moveShots();
      if (phase === 'land') landStep();
      else if (phase === 'play' && downT < 0) {
        march();
        if (downT < 0) { dropBombs(); spawnBonus(); }
      } else if (phase === 'clear' && phaseT >= 120) { wave++; setupWave(); }
      moveBombs();
      moveBonus();
      stepFx();
      api.hud({ score: score, wave: wave, lives: lives });
    };

    /* The title screen: the logo marches along the top, above the card,
       and bombs fall behind it. Nobody to hit, nothing broken, no sound. */
    var attract = function () {
      if (!base) return;
      if (!demo) {
        demo = true;
        restore(logo, base); dirty = true;
        for (var i = 0; i < isles.length; i++) restore(isles[i], isleBase[i]);
        LX = Math.round((W - logo.w) / 4) * 2; LY = LAND_Y; dir = 1; marchT = 0; bombT = 30;
        shots = []; bombs = []; parts = []; fx = []; bonus = null; bannerT = 0;
      }
      tick++;
      if (++marchT >= 6) {
        marchT = 0;
        bounds();
        var nx = LX + dir * 2;
        if ((dir > 0 && nx + bx1 > W - 3) || (dir < 0 && nx + bx0 < 2)) dir = -dir;
        else LX = nx;
      }
      if (--bombT <= 0) {
        bombT = Math.round(api.rand(18, 56));
        if (bombs.length < 4) spawnBomb(-1);
      }
      moveBombs();
      stepFx();
    };

    /* ---- drawing ----------------------------------------------------------------------------------------
       Masks go up as one cached image each (repainted only when a crater
       bumps their version); everything else is a sprite or a dot. */
    var render = function (ctx) {
      var ink = api.ink(), i;
      ctx.fillStyle = api.ground();
      ctx.fillRect(0, 0, W, H);
      if (!base) return;
      if (logo.n) ctx.drawImage(api.maskCanvas(logo), LX, LY);
      for (i = 0; i < isles.length; i++) if (isles[i].n) ctx.drawImage(api.maskCanvas(isles[i]), isleX[i], ISLE_Y);
      if (bonus) api.draw(ctx, api.reduce || (tick >> 3) % 2 ? plusS : plusO, Math.round(bonus.x), BONUS_Y);
      for (i = 0; i < bombs.length; i++) api.draw(ctx, bombS[(bombs[i].f >> 2) & 1], bombs[i].x, bombs[i].y);
      ctx.fillStyle = ink;
      for (i = 0; i < shots.length; i++) ctx.fillRect(shots[i].x, shots[i].y, 1, 4);
      if (!demo) {
        if (downT >= 0) { if (downT < 48) api.draw(ctx, wreck[api.reduce ? 0 : (downT >> 3) & 1], deadX, PY); }
        else api.draw(ctx, safeT > 0 && (api.reduce || (tick >> 2) % 2) ? ghost : cannon, Math.round(px), PY);
      }
      ctx.fillStyle = ink;
      for (i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.y >= TOP) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
      for (i = 0; i < fx.length; i++) {
        var f = fx[i];
        if (f.s) api.draw(ctx, f.s, f.x, f.y);
        else if (api.reduce || f.t > 20 || f.t % 6 < 3) api.text(f.txt, f.x, f.y, { align: 'center' });
      }
      ctx.fillStyle = ink;
      ctx.fillRect(0, GY, W, 1);
      api.draw(ctx, sand, 0, GY + 2);
      if (demo) return;
      if (phase === 'clear') {
        api.text('WAVE ' + wave + ' CLEAR', W / 2, 54, { align: 'center' });
        api.text('+' + clearPts, W / 2, 66, { align: 'center', scale: 2 });
      } else if (bannerT > 0) api.text('WAVE ' + wave, W / 2, 64, { align: 'center', scale: 2 });
      if (ashore && downT >= 16) api.text('ASHORE!', W / 2, 62, { align: 'center', scale: 2, bg: true });
    };

    return {
      init: function () {
        var isleP = ISLES.map(function (name) {
          return api.load('assets/icons/tekex/island-' + name + '.svg')
            .then(function (svg) { return api.raster(fitIsle(svg), IW, IH, { fill: true }); })
            .then(function (m) { return m && m.n > 40 ? m : bunker(); }, bunker);
        });
        var logoP = Promise.resolve(api.logo(LOGO_W)).then(function (m) { return m && m.n > 100 ? m : blocks(); }, blocks);
        return Promise.all([logoP].concat(isleP)).then(function (r) {
          base = r[0]; total = Math.max(1, base.n); logo = clone(base);
          isleBase = r.slice(1); isles = isleBase.map(clone);
          // evenly spaced: centred on the quarter lines
          isleX = isles.map(function (m, i) { return Math.round(W * (i + 1) / 4 - m.w / 2); });
          newGame();
        });
      },
      reset: function () { if (base) newGame(); },
      update: update,
      render: render,
      attract: attract
    };
  };
})();
