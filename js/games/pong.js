/* ==========================================================================
   pong.js — TEKEX Pong, No. 02 of the arcade. js/play.js is the console;
   the contract between them is written out in js/games/README.md.

   The owner's brief: "Pong where the paddles each side are vertical
   versions of the tekex logo and the same kind of dot we are using for the
   cursors is the ball." So:

   - The paddles are the wordmark stood on end: yours on the left reading
     up the screen, the CPU's on the right reading down, the feet of the
     letters facing the court on both sides. They collide as their bounding
     box, not their letterforms — a ball slipping through the gap in an E
     would feel like a cheat, and the box is what the eye reads as the bat.
   - The ball is the site's dot cursor (js/system.js). Over a link the
     cursor swells to about twice its size and inverts whatever is under
     it; the ball does the same when it meets a paddle — a disc twice as
     wide that flips every pixel beneath it, ink for ground and ground for
     ink — then settles back to the plain dot.
   - The centre line is the brand's dot motif: 2x2 dots on a 6px beat.

   Every return scores 10, every goal 100. Three lives. The ball gains 5% a
   hit, so a long rally runs away from both players (the trail behind it is
   the speedometer); the CPU only quickens as you score, so it is beatable
   from the first serve and stays fair all the way up.
   ========================================================================== */
(function () {
  'use strict';
  window.TEKEX_GAMES = window.TEKEX_GAMES || {};

  window.TEKEX_GAMES.pong = function (api) {
    var W = api.W, H = api.H, reduce = api.reduce;

    /* ---- the court -------------------------------------------------------------
       The console's HUD owns y 0-8. The walls are 1px lines at 10 and 142 —
       on the dot matrix a 1px line reads as a row of dots, the house look —
       and the ball and paddles live between them, y 11-141. */
    var WALL_T = api.TOP, WALL_B = H - 2;
    var CT = WALL_T + 1, CB = WALL_B;          // play area, CB exclusive
    var MID = (CT + CB) / 2;
    /* 21 dots, 15...136, so the middle one sits on the court's centre row
       and the served ball sits on it */
    var NET_X = W / 2 - 1, NET_Y0 = 15, NET_N = 21;
    var EDGE = 6;                               // paddle to screen edge, both sides

    /* ---- the dot -------------------------------------------------------------
       6px is the smallest dot that reads as round on the matrix, and an
       even size means 8, 10 and 12 all share its centre, so the lens grows
       true round it. The cursor goes from 16px to 34px over a link; 6 to 12
       is the same gesture. Its growth runs on the cursor's ease (fast out, a beat
       held, a soft return); with reduced motion the cursor has no transition
       and neither does this — it simply swaps size. */
    var D = 6;
    var HOT = reduce ? [12, 12, 12, 12, 12, 12, 12, 12] : [10, 12, 12, 12, 12, 12, 10, 8];
    var SERVE_X = (W - D) / 2, SERVE_Y = Math.floor(MID - D / 2);

    /* Feel. 1.5px a frame crosses the court in about a second and a half;
       +5% a hit doubles that in 15 hits and caps at 4 after 20, the point
       where the dot outruns a paddle and somebody has to lose. Edges of
       the bat send it off at up to 55 degrees, and a moving bat adds a
       little spin, so meeting the ball on the move is a skill. */
    var SP0 = 1.5, SP_SERVE_MAX = 2, SP_GAIN = 1.05, SP_MAX = 4;
    var MAX_ANG = 55 * Math.PI / 180, SPIN = 0.05, GRACE = 1;

    /* Your bat: keys start at 1px a frame (so a tap is a 1px nudge) and
       build to 2.4; a pointer pulls the bat's centre to it, quick but not
       instant, so it still has weight. */
    var KEY_V0 = 1, KEY_ACC = 0.3, KEY_MAX = 2.4, PTR_EASE = 0.45, PTR_MAX = 4;

    /* The CPU. It only reads the ball once it's coming its way and within
       sight, aims for a random point on its own bat (re-rolled on every
       return of yours) and now and then misjudges. Every goal you score
       makes it a little quicker, longer-sighted, surer and wider-angled,
       and teaches it to read where the ball will land rather than chase
       where it is — a fresh CPU is beaten by any shot off a wall; a
       seasoned one has to be beaten by pace. Tuned against simulated
       players with human reaction lag and misreads: a first-timer lasts
       about two minutes and scores two or three goals, a casual player
       three minutes and four or five, a strong one a quarter of an hour
       and a dozen-odd — each harder won than the last. */
    var CPU_V0 = 1.3, CPU_STEP = 0.1, CPU_CAP = 2.6;
    var SEE0 = 84, SEE_STEP = 6;
    var FLUB0 = 0.1, FLUB_STEP = 0.006, FLUB_MIN = 0.02;
    var WIDE0 = 0.65, WIDE_STEP = 0.035;
    var WIT_STEP = 0.08;
    var DEMO_V = 2;

    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

    /* Discs as row spans [offset, length], cached per size: the ball, the
       lens and the trail are all the same round dot at different sizes. */
    var discs = {};
    var disc = function (s) {
      if (discs[s]) return discs[s];
      var rows = [], r = s / 2;
      for (var y = 0; y < s; y++) {
        var dy = y + 0.5 - r, x0 = 0;
        while (x0 < r && (x0 + 0.5 - r) * (x0 + 0.5 - r) + dy * dy > r * r) x0++;
        rows.push([x0, s - 2 * x0]);
      }
      return (discs[s] = rows);
    };

    /* ---- the paddles ------------------------------------------------------------
       x0..x1, y0..y1 are the mask's bounding box (exclusive ends): the
       collision box. Until the logo loads, or if it never does, the bat is
       that box drawn solid, and the game plays the same. */
    var paddle = function (side) {
      var p = { side: side, x: 0, y: 0, v: 0, aim: 0, kick: 0, m: null,
                max: CPU_V0, see: SEE0, flub: FLUB0, wide: WIDE0, wit: 0,
                x0: 0, x1: 7, y0: 0, y1: 36, dx: 0, dy: 0 };
      place(p);
      return p;
    };
    var place = function (p) { p.x = p.side < 0 ? EDGE - p.x0 : W - EDGE - p.x1; };
    var fit = function (p, m) {
      var x0 = m.w, x1 = 0, y0 = m.h, y1 = 0;
      for (var y = 0; y < m.h; y++) {
        for (var x = 0; x < m.w; x++) {
          if (!m.d[y * m.w + x]) continue;
          if (x < x0) x0 = x;
          if (x + 1 > x1) x1 = x + 1;
          if (y < y0) y0 = y;
          if (y + 1 > y1) y1 = y + 1;
        }
      }
      if (x1 <= x0) return;   // an empty mask: keep the plain bat
      p.m = m; p.x0 = x0; p.x1 = x1; p.y0 = y0; p.y1 = y1;
      place(p);
    };
    var mid = function (p) { return p.y + (p.y0 + p.y1) / 2; };
    var centre = function (p) { p.y = Math.round(MID - (p.y0 + p.y1) / 2); p.v = 0; };
    // keep the box between the walls
    var hold = function (p) {
      var lo = CT - p.y0, hi = CB - p.y1;
      if (p.y < lo) { p.y = lo; p.v = 0; } else if (p.y > hi) { p.y = hi; p.v = 0; }
    };
    // collisions use the bat where it is drawn, so what you see is what hits
    var meets = function (p) {
      var top = Math.round(p.y) + p.y0, bot = Math.round(p.y) + p.y1;
      return b.y + D > top - GRACE && b.y < bot + GRACE;
    };

    /* ---- state ------------------------------------------------------------------ */
    var me = paddle(-1), cpu = paddle(1);
    var b = { x: SERVE_X, y: SERVE_Y, vx: 0, vy: 0, sp: SP0, hot: -1, path: [] };
    var phase = 'serve', t = 0, toward = -1, hidden = false;
    var score = 0, you = 0, lives = 3, demo = false;
    var mode = 0, lastPtr = null;

    var snd = function (n) { if (!demo) api.sfx(n); };

    var level = function () {
      cpu.max = Math.min(CPU_CAP, CPU_V0 + you * CPU_STEP);
      cpu.see = Math.min(W, SEE0 + you * SEE_STEP);
      cpu.flub = Math.max(FLUB_MIN, FLUB0 - you * FLUB_STEP);
      cpu.wide = Math.min(1, WIDE0 + you * WIDE_STEP);
      cpu.wit = Math.min(1, you * WIT_STEP);
    };

    /* Where on its bat the AI means to take the ball. Mostly somewhere
       inside the bat, so its returns come back at honest angles; sometimes
       a misjudgement right at the edge or past it. In the title's demo
       both bats play wide, so the dot spends more time above and below the
       card where it can be seen. */
    var roll = function (p) {
      var reach = (p.y1 - p.y0 + D) / 2;
      if (Math.random() < p.flub) p.aim = (Math.random() < 0.5 ? -1 : 1) * api.rand(reach * 0.85, reach * 1.3);
      else p.aim = api.rand(-1, 1) * reach * p.wide;
    };

    // where the dot's centre will meet this bat's face, walls folded in
    var landing = function (p) {
      var at = p.side > 0 ? p.x + p.x0 - D : p.x + p.x1;
      var n = (at - b.x) / b.vx, span = CB - D - CT;
      if (!(n > 0)) return b.y + D / 2;
      var u = (b.y + b.vy * n - CT) % (2 * span);
      if (u < 0) u += 2 * span;
      return CT + (u > span ? 2 * span - u : u) + D / 2;
    };

    /* A serve: the dot waits at the centre, blinks twice (with a tick each
       time it comes back — ready, steady) and goes. After a goal it first
       stays away a moment, so the point has room to land. */
    var SERVE = 48, SHOW = 36;
    var serve = function (dir, wait, away) {
      phase = 'serve'; t = wait; toward = dir; hidden = !!away;
      b.x = SERVE_X; b.y = SERVE_Y; b.vx = b.vy = 0; b.hot = -1; b.path.length = 0;
    };
    var launch = function () {
      var a = api.rand(0.2, 0.6) * (Math.random() < 0.5 ? -1 : 1);
      b.sp = Math.min(SP_SERVE_MAX, SP0 + you * 0.04);
      b.vx = toward * b.sp * Math.cos(a);
      b.vy = b.sp * Math.sin(a);
      phase = 'rally';
      roll(cpu);
      if (demo) roll(me);
    };
    var dotShown = function () {
      if (phase === 'rally') return true;
      if (phase !== 'serve' || (hidden && t > SHOW)) return false;
      return reduce || !((t > 18 && t <= 24) || (t > 6 && t <= 12));
    };

    /* ---- the bats move -------------------------------------------------------------
       Keys or pointer, whichever you touched last: a pointer left resting
       on the screen mustn't drag the bat back the moment you let go of a
       key, and a thumb on the D-pad after a drag shouldn't fight it. */
    var steer = function () {
      var up = api.key('up'), dn = api.key('down'), py = api.pointerY(), v = me.v;
      if (up || dn) mode = 1;
      else if (py !== null && py !== lastPtr) mode = 2;
      lastPtr = py;
      if (mode === 1 && up !== dn) {
        var dir = dn ? 1 : -1;
        v = v * dir > 0 ? Math.min(KEY_MAX, Math.abs(v) + KEY_ACC) * dir : KEY_V0 * dir;
      } else if (mode === 2 && py !== null) {
        v = clamp((py - mid(me)) * PTR_EASE, -PTR_MAX, PTR_MAX);
      } else {
        v = Math.abs(v) < 0.3 ? 0 : v * 0.5;
      }
      me.v = v; me.y += v; hold(me);
    };

    var think = function (p) {
      var face = p.side > 0 ? p.x + p.x0 : p.x + p.x1;
      var gap = p.side > 0 ? face - (b.x + D) : b.x - face;
      var coming = phase === 'rally' && b.vx * p.side > 0 && gap < p.see;
      // ball away: drift home at half pace, so it never sits on an edge
      var target = MID, max = p.max * 0.5;
      if (coming) {
        target = b.y + D / 2;
        if (p.wit) target += (landing(p) - target) * p.wit;
        target += p.aim;
        max = p.max;
      }
      p.v = clamp((target - mid(p)) * 0.3, -max, max);
      p.y += p.v; hold(p);
    };

    /* ---- the dot moves -------------------------------------------------------------
       In steps of at most 1px, so at full speed it still can't jump a
       wall or a 7px bat between frames. A bat only counts from its face:
       once the dot is past it, it's gone. */
    var strike = function (p) {
      var reach = (p.y1 - p.y0 + D) / 2;
      var off = clamp((b.y + D / 2 - (Math.round(p.y) + (p.y0 + p.y1) / 2)) / reach, -1, 1);
      var ang = clamp(off * MAX_ANG + clamp(p.v, -PTR_MAX, PTR_MAX) * SPIN, -MAX_ANG, MAX_ANG);
      b.sp = Math.min(SP_MAX, b.sp * SP_GAIN);
      b.vx = -p.side * b.sp * Math.cos(ang);
      b.vy = b.sp * Math.sin(ang);
      b.hot = 0;
      p.kick = 4;
      snd('pad');
      if (p === me) {
        if (!demo) score += 10;
        roll(cpu);
      } else if (demo) roll(me);
    };
    var move = function () {
      var n = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)))), wall = false;
      for (var i = 0; i < n; i++) {
        var px = b.x, f;
        b.x += b.vx / n; b.y += b.vy / n;
        if (b.y < CT) { b.y = 2 * CT - b.y; b.vy = Math.abs(b.vy); wall = true; }
        else if (b.y + D > CB) { b.y = 2 * (CB - D) - b.y; b.vy = -Math.abs(b.vy); wall = true; }
        if (b.vx < 0) {
          f = me.x + me.x1;
          if (px >= f && b.x < f && meets(me)) { b.x = 2 * f - b.x; strike(me); }
        } else {
          f = cpu.x + cpu.x0;
          if (px + D <= f && b.x + D > f && meets(cpu)) { b.x = 2 * (f - D) - b.x; strike(cpu); }
        }
      }
      if (wall) snd('blip');
    };

    var point = function (yours) {
      if (yours) {
        if (!demo) {
          you++; score += 100; level();
          snd('goal'); api.shake(6);
        }
        serve(1, SERVE, true);   // to the side that conceded
      } else {
        if (!demo) {
          lives--;
          snd('miss'); api.buzz(40);
          if (lives <= 0) { phase = 'end'; t = 50; return; }
        }
        serve(-1, SERVE, true);
      }
    };

    /* ---- one step ---------------------------------------------------------------- */
    var tick = function () {
      if (me.kick) me.kick--;
      if (cpu.kick) cpu.kick--;
      if (b.hot >= 0 && ++b.hot >= HOT.length) b.hot = -1;
      if (demo) think(me); else steer();
      think(cpu);

      if (phase === 'serve') {
        t--;
        if (t === 18 || t === 6) snd('select');
        if (t <= 0) launch();
      } else if (phase === 'rally') {
        move();
        // the trail's memory: where the dot's centre has been, newest first
        if (!reduce) {
          b.path.unshift(Math.round(b.x) + D / 2, Math.round(b.y) + D / 2);
          if (b.path.length > 20) b.path.length = 20;
        }
        if (b.x > W + 4) point(true);
        else if (b.x + D < -4) point(false);
      } else if (phase === 'end') {
        // a beat with the court empty before the console's GAME OVER
        if (--t <= 0) { phase = 'done'; api.over(score); return; }
      }
      if (!demo) api.hud({ score: score, you: you, lives: lives });
    };

    var reset = function () {
      demo = false;
      score = 0; you = 0; lives = 3;
      mode = 0; lastPtr = api.pointerY();
      centre(me); centre(cpu);
      me.kick = cpu.kick = 0;
      level();
      // the first serve comes to you, with a longer breath to find the bat
      serve(-1, SERVE + 12, false);
    };

    /* ---- drawing ------------------------------------------------------------------ */
    var ink, gnd;
    // floor, not s / 2: an odd size centred on a pixel corner is otherwise half a pixel out
    var spot = function (ctx, cx, cy, s) {
      var rows = disc(s), x = Math.floor(cx - s / 2), y = Math.floor(cy - s / 2);
      for (var r = 0; r < s; r++) ctx.fillRect(x + rows[r][0], y + r, rows[r][1], 1);
    };
    // is this screen pixel ink, before the dot is drawn? (for the lens)
    var inkAt = function (x, y) {
      if (y === WALL_T || y === WALL_B) return true;
      if ((x === NET_X || x === NET_X + 1) && y >= NET_Y0 && y < NET_Y0 + NET_N * 6 && (y - NET_Y0) % 6 < 2) return true;
      return batAt(me, x, y) || batAt(cpu, x, y);
    };
    var batAt = function (p, x, y) {
      var mx = x - p.dx, my = y - p.dy;
      if (!p.m) return mx >= p.x0 && mx < p.x1 && my >= p.y0 && my < p.y1;
      return mx >= 0 && my >= 0 && mx < p.m.w && my < p.m.h && !!p.m.d[my * p.m.w + mx];
    };
    /* The hot dot: the cursor over a link. Not a bigger ink dot but a lens
       that turns everything under it over — the dot included. So on the bare
       court the dot opens into a ring (ink lens, ground where the dot was),
       which reads as swelled-and-inverted where a bigger solid dot only reads
       as bigger; and in the frame or two it overlaps the bat, the letters
       under it go negative, exactly as the site's cursor does to a label. As
       it settles, the ring thins back onto the dot. */
    var core = disc(D);
    var lens = function (ctx, cx, cy, s) {
      var rows = disc(s), x0 = cx - s / 2, y0 = cy - s / 2, r, x, y, c;
      ctx.fillStyle = ink;
      spot(ctx, cx, cy, s);
      ctx.fillStyle = gnd;
      for (r = 0; r < s; r++) {
        y = y0 + r;
        c = core[y - (cy - D / 2)];
        for (x = x0 + rows[r][0]; x < x0 + rows[r][0] + rows[r][1]; x++) {
          var dx = x - (cx - D / 2);
          if (inkAt(x, y) || (c && dx >= c[0] && dx < c[0] + c[1])) ctx.fillRect(x, y, 1, 1);
        }
      }
    };
    var drawBat = function (ctx, p) {
      // a struck bat gives a pixel, away from the court, for four frames
      p.dx = p.x + (p.kick && !reduce ? p.side : 0);
      p.dy = Math.round(p.y);
      if (p.m) ctx.drawImage(api.maskCanvas(p.m, 'ink'), p.dx, p.dy);
      else ctx.fillRect(p.dx + p.x0, p.dy + p.y0, p.x1 - p.x0, p.y1 - p.y0);
    };
    /* The trail is the speedometer: a dot behind the ball once a rally is
       quick, two, then three as it runs away — each smaller, the dot motif
       again. [speed, px behind, size]: placed by distance, not by frame, so
       the gaps stay an even 3px at any speed and the count is what changes.
       It follows the real path, so it bends round walls and bats. Decoration
       only: reduced motion goes without. */
    var TRAIL = [[2.2, 8, 4], [2.8, 14, 2], [3.4, 19, 1]];
    var drawTrail = function (ctx) {
      for (var i = 0; i < TRAIL.length; i++) {
        var k = Math.round(TRAIL[i][1] / b.sp) * 2;
        if (b.sp < TRAIL[i][0] || b.path.length <= k) break;
        spot(ctx, b.path[k], b.path[k + 1], TRAIL[i][2]);
      }
    };

    var render = function (ctx) {
      ink = api.ink(); gnd = api.ground();
      ctx.fillStyle = gnd;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = ink;
      ctx.fillRect(0, WALL_T, W, 1);
      ctx.fillRect(0, WALL_B, W, 1);
      for (var i = 0; i < NET_N; i++) ctx.fillRect(NET_X, NET_Y0 + i * 6, 2, 2);
      drawBat(ctx, me);
      drawBat(ctx, cpu);
      if (phase === 'rally' && !reduce) drawTrail(ctx);
      if (!dotShown()) return;
      var cx = Math.round(b.x) + D / 2, cy = Math.round(b.y) + D / 2;
      if (b.hot >= 0) lens(ctx, cx, cy, HOT[b.hot]);
      else spot(ctx, cx, cy, D);
    };

    return {
      init: function () {
        return Promise.all([api.logo(36, { rotate: -90 }), api.logo(36, { rotate: 90 })]).then(function (m) {
          fit(me, m[0]);
          fit(cpu, m[1]);
        }, function () {});   // no logo: plain bats, same game
      },
      reset: reset,
      update: function () {
        // straight from the title's demo into a game: start clean
        if (demo) reset();
        tick();
      },
      render: render,
      /* The title's demo: CPU against CPU, silent, behind the card. The
         bats stand clear of the card either side and the dot shows above
         and below it, so the title screen is a game already in play. */
      attract: function () {
        if (!demo) {
          demo = true;
          [me, cpu].forEach(function (p) {
            p.max = DEMO_V; p.see = W; p.flub = 0.1; p.wide = 0.8; p.wit = 0.5;
          });
          serve(1, 24, false);
        }
        tick();
      }
    };
  };
})();
