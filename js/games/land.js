/* ==========================================================================
   land.js — TEKEX Jump (id `land`), game 03 of the arcade. js/play.js is
   the console; this file is only the game.

   A handheld platformer in the spirit of a classic first level: run right,
   bump the "+" blocks, stomp the bugs, cross the sea and reach HQ. The
   centrepiece is the owner's: "running/jumping over a huge version of the
   tekex logo (so you have to jump the gaps between letters)". The wordmark
   rises out of the sea at 1:1 — 304 x 63 — and its letter tops are the
   platforms.

   Everything is the brand's own: "+" signs to collect (the brand's plus —
   never coins; Tekex is community, not cash), a sprouting "+" flower for
   the power-up (growth, not money), granite for the islands, and two of
   the team as the players.

   THE CLOCK. Fastest time wins, and every bug you defeat — stomped, hit by
   a seed, or knocked off a block from below — takes ONE SECOND off it (a
   "-1" rises from the bug). The time shown and the time sent to the board
   are max(0, elapsed - bonus). A death sends you back to the start in a
   fresh colour pair (the console re-inks) with the clock and bonus reset.

   1-bit on the console's 160x144 screen: only api.ink() and api.ground(),
   whole pixels, an 8x8 tile rhythm. Collision is a bitmap the size of the
   level, stamped from the tiles and the logo masks, so the letters' italic
   slants and notches collide exactly as they are drawn.
   ========================================================================== */
(function () {
  'use strict';
  window.TEKEX_GAMES = window.TEKEX_GAMES || {};

  TEKEX_GAMES.land = function (api) {
    var W = api.W, H = api.H;
    var T = 8, ROWS = 18;              // 18 rows of 8px tiles fill the 144px screen
    var GY = 128;                      // the promenade's top: two tile rows of ground below
    var SEA = 132;                     // the waterline sits a little below the promenade
    var DROWN = 138;                   // feet this far under: gone

    /* ---- feel ------------------------------------------------------------------
       Tuned so the numbers the level is built on hold: a full jump rises
       4.3^2 / (2 x 0.25) = 37px (a 4-tile pillar, 32px, is a real but fair
       jump), and covers ~48px walking, ~72px running. Release early and the
       rise is cut — short hops for short gaps. Coyote time and a jump buffer
       forgive a press a few frames early or late, which is most of what
       makes a platformer feel "tight" rather than "strict". The hitbox is
       narrower than the sprite (10 of 16px) so near misses stay misses. */
    var G = 0.25, FALL = 4, JUMP = -4.3, CUT = -1.6;
    var WALK = 1.4, RUN = 2.1, ACC = 0.09, AIR = 0.07, DEC = 0.12, SKID = 0.24;
    var COYOTE = 6, BUFFER = 6, NUDGE = 3;
    var PW = 10, PH = 18;              // hitbox; the sprite is 16x22 around it
    var SW = 16, SH = 22;
    var LEAD = 72;                     // camera holds the player here, 88px of view ahead
    var BW = 8, BH = 7;                // a bug's hitbox
    var INV = 120;                     // 2s of grace after losing the flower

    var spr = api.sprite;

    /* ---- the founders ------------------------------------------------------------
       16x22, facing right, after the small hero of the classic handheld
       platformer: a big head (14 of 22 rows), a thick ink outline round the
       whole figure, ground-coloured skin and hands inside it, dark boots.
       Drawn from the team photos (assets/team/*-640.webp):

       Tom — the dark cap with its brim jutting forward, the heavy
       rectangular glasses (two open frames and a bridge, the first thing
       you see — the owner asked for exactly that), a short beard round the
       jaw and the big grin from his photo; checked flannel (':') open over
       a light tee. Ed — dark hair, tousled at the tips and swept up and
       back into a quiff, straight brows, a half smile in dark stubble; the
       open corduroy jacket ('|') over a white tee.

       Heads are drawn once and bodies swap per frame. In a body, S is the
       outer layer and T the tee; the flower turns the outer layer to 'o'
       (a light shirt/jacket) so the change reads at 1x. */
    var HEADS = {
      tom: [
        '.....######.....',
        '...##########...',
        '..###::#######..',
        '..##############',
        '..#oooooo######.',
        '..#o#########o#.',
        '..#o#oo#o#oo#o#.',
        '..###oo###oo#o#.',
        '..#o####o####oo#',
        '..#:ooooooooooo#',
        '..#::o######o##.',
        '..#::#oooooo#:#.',
        '...#::#oooo#::#.',
        '....##########..'
      ],
      ed: [
        '........#.###...',
        '......#.######..',
        '.....#######o##.',
        '....######o####.',
        '...######o####..',
        '..############..',
        '..###ooooooooo#.',
        '..##o###oo###o#.',
        '..#ooooooooooo#.',
        '..#ooo#oooo#ooo#',
        '..#ooo#oooo#ooo#',
        '..#:oooooo#o###.',
        '..#::o####o:#...',
        '...##:::::::#...'
      ]
    };
    // the hurt face: a shocked open mouth (Ed screws his eyes shut too)
    var HURT_FACE = {
      tom: { 10: '..#::o:####:o##.', 11: '..#:::#oo#:::#..', 12: '...#::####:::#..' },
      ed: { 9: '..#oo###oo###oo#', 10: '..#ooooooooooo##', 12: '..#::o:#oo#::#..' }
    };
    var BODIES = {
      idle: [
        '...##S#TT#S##...',
        '..#SS#STTS#SS#..',
        '.#SS##STTS##SS#.',
        '.#oo#SSTTSS#oo#.',
        '.####SSTTSS####.',
        '...##########...',
        '...####..####...',
        '..#####..######.'
      ],
      // three-frame run: stride, pass, push-off (the select screen cycles them)
      run1: [
        '...##S#TT#S##...',
        '..#SS#STTS#S###.',
        '.#S##SSTTSS#Soo#',
        '#oo#SSSTTSS##oo#',
        '####SSSTTSS#.##.',
        '...##########...',
        '.#####...#####..',
        '#####.....######'
      ],
      run2: [
        '...##S#TT#S##...',
        '..#SS#STTS#SS#..',
        '..#S#SSTTSS#S#..',
        '..#oo#STTS#oo#..',
        '..####STTS####..',
        '...##########...',
        '....######......',
        '....########....'
      ],
      run3: [
        '...##S#TT#S##...',
        '..#SS#STTS#SS#..',
        '.#SS#SSTTSS#S#..',
        '.#oo#SSTTSS#oo#.',
        '.####SSTTSS####.',
        '...##########...',
        '...###..#####...',
        '..####...######.'
      ],
      jump: [
        '...##S#TT#S###oo',
        '..#SS#STTS#S##oo',
        '.#SS#SSTTSS#S##.',
        '#oo#SSSTTSS#S#..',
        '####SSSTTSS###..',
        '...##########...',
        '..####...######.',
        '.####.....####..'
      ],
      hurt: [
        'oo##S#TT#S##oo..',
        'oo#SS#STTS#SS#oo',
        '.#SS#SSTTSS#SS##',
        '..##SSSTTSSS##..',
        '...#SSSTTSSS#...',
        '...##########...',
        '...####..####...',
        '..#####..#####..'
      ]
    };
    var makeChar = function (id, cloth) {
      var out = {};
      for (var f in BODIES) {
        var head = HEADS[id].slice(0);
        if (f === 'hurt') for (var r in HURT_FACE[id]) head[+r] = HURT_FACE[id][r];
        var body = BODIES[f].map(function (row) { return row.replace(/S/g, cloth).replace(/T/g, 'o'); });
        out[f] = spr(head.concat(body));
      }
      return out;
    };
    var CH = { tom: makeChar('tom', ':'), ed: makeChar('ed', '|') };
    var POWER = { tom: makeChar('tom', 'o'), ed: makeChar('ed', 'o') };
    var NAMES = { tom: 'TOM', ed: 'ED' };
    var SPROUT_AT = { tom: 5, ed: 9 };   // where the worn sprout sits on cap / hair
    var RUN_CYCLE = ['run1', 'run2', 'run3', 'run2'];
    var who = 'tom';

    /* ---- the world's sprites ------------------------------------------------------ */
    // the brand's plus, outlined so it reads against sky and stone alike
    var PLUS = spr([
      '..###..',
      '..#o#..',
      '###o###',
      '#ooooo#',
      '###o###',
      '..#o#..',
      '..###..'
    ]);
    /* The power-up: a "+" in flower — the brand's plus as the bloom, two
       leaves on the stem. It sways (the bloom leans a pixel) unless motion
       is reduced. Worn, it shrinks to a sprout on the founder's head. */
    var FLOWER = [spr([
      '...###...',
      '...#o#...',
      '.###o###.',
      '.#ooooo#.',
      '.###o###.',
      '...#o#...',
      '.##.#.##.',
      '#oo#.#oo#',
      '.##.#.##.',
      '....#....'
    ]), spr([
      '....###..',
      '....#o#..',
      '..###o###',
      '..#ooooo#',
      '..###o###',
      '....#o#..',
      '.##.#.##.',
      '#oo#.#oo#',
      '.##.#.##.',
      '....#....'
    ])];
    var SPROUT = spr([
      '##.##',
      '#o#o#',
      '.###.',
      '..#..'
    ]);
    // the seed the flower throws, spinning
    var SEED = [spr(['.##.', '#o##', '####', '.##.']), spr(['.##.', '####', '##o#', '.##.'])];
    // bugs: small beetles, facing left (the way they first walk). Two leg
    // frames, the squash, and on its back for a bug knocked out from below
    var BUG = [spr([
      '...####.',
      '..#:#::#',
      '.#::#::#',
      '#o#::#:#',
      '########',
      '.#..#.#.',
      '#..#..#.'
    ]), spr([
      '...####.',
      '..#:#::#',
      '.#::#::#',
      '#o#::#:#',
      '########',
      '..#.#..#',
      '..#.#..#'
    ])];
    var BUG_FLAT = spr([
      '.######.',
      '#:#:#:##',
      '########'
    ]);
    var BUG_FLIP = spr([
      '#..#..#.',
      '.#..#.#.',
      '########',
      '#o#::#:#',
      '.#::#::#',
      '..#:#::#',
      '...####.'
    ]);

    // tiles, 8x8
    var TILE = {
      // the promenade: granite setts in running bond, a fleck in each
      ground: spr([
        '########',
        '#ooooooo',
        '#ooo#ooo',
        '#ooooooo',
        '########',
        'oooo#ooo',
        'o#oo#ooo',
        'oooo#ooo'
      ]),
      brick: spr([
        '########',
        ':#:::#::',
        '#:#:#:#:',
        '########',
        ':::#:::#',
        '::#:#:#:',
        ':::#:::#',
        '########'
      ]),
      // the "+" block: a bold ground plus on ink — the brand's own mark
      plus: spr([
        '########',
        '###oo###',
        '###oo###',
        '#oooooo#',
        '#oooooo#',
        '###oo###',
        '###oo###',
        '########'
      ]),
      plusLit: spr([
        '########',
        '#::oo::#',
        '#::oo::#',
        '#oooooo#',
        '#oooooo#',
        '#::oo::#',
        '#::oo::#',
        '########'
      ]),
      used: spr([
        '########',
        '#oooooo#',
        '#o#oo#o#',
        '#oooooo#',
        '#oooooo#',
        '#o#oo#o#',
        '#oooooo#',
        '########'
      ]),
      // stair stone: lit top-left, shaded bottom-right
      hard: spr([
        '########',
        '#oooooo#',
        '#o::::##',
        '#o::::##',
        '#o::::##',
        '#o::::##',
        '#o######',
        '########'
      ])
    };
    /* Granite pillars stand in for the classic's pipes: dressed stone, two
       tiles wide, with a capstone. Not pipes — the islands' own granite. */
    var CAP = spr([
      '################',
      '#oooooooooooooo#',
      '#o-o-o-o-o-o-o:#',
      '#::::::::::::::#',
      '################',
      '.#ooooo#ooooo:#.',
      '.#o-ooo#oo-oo:#.',
      '.#ooooo#ooooo:#.'
    ]);
    var SHAFT = spr([
      '.##############.',
      '.#oo#ooooo#oo:#.',
      '.#oo#o-ooo#o-:#.',
      '.#oo#ooooo#oo:#.',
      '.##############.',
      '.#ooooo#ooooo:#.',
      '.#o-ooo#oo-oo:#.',
      '.#ooooo#ooooo:#.'
    ]);
    var FLAG = spr([
      '############',
      '#####oo#####',
      '#####oo#####',
      '##oooooooo##',
      '##oooooooo##',
      '#####oo#####',
      '#####oo#####',
      '############'
    ]);
    var MINI_FLAG = spr([
      '#######',
      '###o###',
      '##ooo##',
      '###o###',
      '#######'
    ]);
    var BALL = spr(['.##.', '#oo#', '#o##', '.##.']);

    /* Clouds and hills are drawn from shapes rather than typed out: an
       outlined blob, ink on its edge, a fill inside. Clouds are filled with
       sky so they hide what passes behind; hills get sparse dots, the
       lightest dither, so they sit back. */
    var blob = function (w, h, inside, fillCh) {
      var at = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && inside(x + 0.5, y + 0.5); };
      var rows = [];
      for (var y = 0; y < h; y++) {
        var r = '';
        for (var x = 0; x < w; x++) {
          if (!at(x, y)) r += '.';
          else if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) r += '#';
          else r += fillCh;
        }
        rows.push(r);
      }
      return spr(rows);
    };
    var discs = function (list, floor) {
      return function (x, y) {
        if (y > floor) return false;
        for (var i = 0; i < list.length; i++) {
          var d = list[i], dx = x - d[0], dy = y - d[1];
          if (dx * dx + dy * dy <= d[2] * d[2]) return true;
        }
        return false;
      };
    };
    var CLOUD_L = blob(28, 12, discs([[7, 8, 4.6], [13, 5.5, 5.4], [20, 7, 5], [24, 9, 2.6]], 11), 'o');
    var CLOUD_S = blob(18, 9, discs([[5, 6, 3.6], [10, 4.5, 4.4], [14, 6.5, 3]], 8), 'o');
    var hill = function (w, h) {
      return blob(w, h + 1, function (x, y) {
        var dx = (x - w / 2) / (w / 2), dy = (y - h) / h;
        return dx * dx + dy * dy <= 1;
      }, '-');
    };
    var HILL_L = hill(56, 22), HILL_S = hill(34, 12);

    /* ---- the level -------------------------------------------------------------------
       Built once, in tiles. map0 holds the pristine tiles (blocks change as
       they are used, so each run copies it); sol is the collision bitmap,
       one byte per pixel, which the logo masks are stamped into as well. */
    var LWT = 226, LW = LWT * T;
    var GRD = 1, BRK = 2, PLS = 3, USED = 4, HARD = 5, PCAP = 6, PSHAFT = 7, PRIGHT = 8;
    var BLOOM = 255;                   // a "+" block's contents: the flower, not pluses
    var map0 = new Uint8Array(LWT * ROWS), cont0 = new Uint8Array(LWT * ROWS);
    var sol = new Uint8Array(LW * H);
    var sea = new Uint8Array(LWT);
    var items0 = [], bugs0 = [], clouds = [], hills = [];

    var fill = function (x, y, w, h) {
      for (var yy = Math.max(0, y); yy < Math.min(H, y + h); yy++)
        for (var xx = Math.max(0, x); xx < Math.min(LW, x + w); xx++) sol[yy * LW + xx] = 1;
    };
    var setT = function (tx, ty, c, n) {
      if (tx < 0 || tx >= LWT || ty < 0 || ty >= ROWS) return;
      map0[ty * LWT + tx] = c;
      cont0[ty * LWT + tx] = n || 0;
      fill(tx * T, ty * T, T, T);
    };
    var ground = function (a, b) { for (var tx = a; tx < b; tx++) { setT(tx, 16, GRD); setT(tx, 17, GRD); } };
    var column = function (tx, h) { for (var k = 1; k <= h; k++) setT(tx, 16 - k, HARD); };
    var stairs = function (tx, n, down) { for (var k = 0; k < n; k++) column(tx + k, down ? n - k : k + 1); };
    var pillar = function (tx, h) {
      for (var k = 1; k <= h; k++) { setT(tx, 16 - k, k === h ? PCAP : PSHAFT); setT(tx + 1, 16 - k, PRIGHT); }
    };
    var brick = function (tx, ty) { setT(tx, ty, BRK); };
    var block = function (tx, ty, n) { setT(tx, ty, PLS, n || 1); };
    var item = function (x, y) { items0.push({ x: x, y: y, got: false }); };
    var itemT = function (tx, ty) { item(tx * T, ty * T); };
    var bug = function (x, y) { bugs0.push({ x: x, y: y, rx: 0, ry: 0, vx: -0.5, vy: 0, st: 0, t: 0 }); };
    var bugT = function (tx) { bug(tx * T, GY - BH); };

    /* The run, left to right. Rows: 16 is the promenade's top; "+" blocks at
       row 12 leave three clear tiles to walk under and are reachable from
       the ground; row 8 is reachable only from the tops of row 12. */
    // a flat start, and the first block: a flower, so everyone finds one
    ground(0, 64);
    block(16, 12, BLOOM);
    // a row of bricks with "+" blocks, one more up high, and the first bug
    brick(20, 12); block(21, 12); brick(22, 12); block(23, 12); brick(24, 12);
    block(22, 8);
    bugT(25);
    // granite pillars, rising — bugs pace the gaps between them
    pillar(29, 2);
    pillar(38, 3); bugT(42);
    pillar(47, 4); bugT(51); bugT(53);
    pillar(57, 4);
    // the first stretch of sea, with an arc of pluses over it
    itemT(64, 12); itemT(65, 11); itemT(66, 12);
    ground(67, 97);
    // a floating platform with pluses along its top; a second flower below it
    brick(70, 12); block(71, 12, BLOOM); brick(72, 12);
    for (var k = 74; k < 82; k++) { brick(k, 8); itemT(k, 7); }
    bugT(77); bugT(79);
    // a generous one: five pluses in a single block
    brick(85, 12); block(86, 12, 5); brick(87, 12);
    // the stair up, the gap, the stair down
    stairs(92, 4); column(96, 4);
    ground(99, 135);
    column(99, 4); stairs(100, 3, true);
    // more bricks and bugs, and the last flower before the logo
    brick(108, 12); block(109, 12); brick(110, 12); brick(111, 12); block(112, 12, BLOOM);
    bugT(110); bugT(114);
    pillar(118, 2); bugT(122); bugT(124);
    itemT(126, 13); itemT(127, 13); itemT(128, 13);
    // up to the logo: four high, then open sea
    stairs(130, 4); column(134, 4);

    /* The wordmark. TE at its natural place; KEX moved KX px further right,
       so the TE|K gap (7px in the logo) becomes 25px of open sea — a real
       jump. The other gaps are the logo's own: the V between K's stem and
       its arm, and the V at the top of the X. Masks arrive in init(); the
       letter tops sit at LOGO_Y, 15px above the stair top, with the bases
       under the waves. */
    var LX = 135 * T + 16, KX = 18, LOGO_W = 304, LOGO_Y = H - 63;
    var TE = null, KEX = null, SIGN = null, plain = false;
    // pluses mark the line: over each gap, and along the long top of KEX
    item(LX + 114, 58); item(LX + 124, 54);
    item(LX + KX + 141, 60);
    item(LX + KX + 186, 70); item(LX + KX + 200, 70); item(LX + KX + 214, 70); item(LX + KX + 228, 70);
    item(LX + KX + 263, 58);
    bug(LX + KX + 236, LOGO_Y - BH);

    // ashore again: a last few bugs and blocks, the big stair, the flag, HQ
    ground(181, LWT);
    bugT(187); bugT(189);
    brick(192, 12); block(193, 12); brick(194, 12);
    bugT(197);
    stairs(200, 8); column(208, 8);
    var POLE_T = 212, POLE_X = POLE_T * T + 3, POLE_TOP = 26, BASE_Y = GY - T;
    setT(POLE_T, 15, HARD);
    var FLAG_TOP = POLE_TOP + 4, FLAG_LOW = BASE_Y - 12;
    var HQ_X = 216 * T, HQ_W = 48, DOOR_X = HQ_X + HQ_W / 2;

    // open sea wherever the promenade is missing
    for (var c0 = 0; c0 < LWT; c0++) sea[c0] = map0[16 * LWT + c0] === GRD ? 0 : 1;

    // scenery, kept clear of the sea and the logo so nothing competes with it
    hills.push({ x: -6, s: HILL_L }, { x: 40, s: HILL_S }, { x: 84 * T, s: HILL_L }, { x: 104 * T, s: HILL_S },
      { x: 183 * T, s: HILL_L }, { x: 196 * T, s: HILL_S });
    [[30, 16, 1], [118, 24, 0], [210, 38, 1], [330, 20, 0], [430, 30, 1], [560, 18, 0], [700, 34, 1],
      [820, 22, 0], [960, 28, 1], [1100, 24, 0], [1230, 18, 1], [1380, 30, 0], [1520, 22, 1], [1660, 30, 0]]
      .forEach(function (c) { clouds.push({ x: c[0], y: c[1], s: c[2] ? CLOUD_L : CLOUD_S }); });

    var stampMask = function (m, ox, oy) {
      if (!m || !m.d) return;
      for (var y = 0; y < m.h; y++) {
        var wy = oy + y;
        if (wy < 0 || wy >= H) continue;
        for (var x = 0; x < m.w; x++) {
          var wx = ox + x;
          if (m.d[y * m.w + x] && wx >= 0 && wx < LW) sol[wy * LW + wx] = 1;
        }
      }
    };
    /* Without the logo (the SVG failed to load) the run must still be
       finishable: the same four platforms, as plain blocks of ink. */
    var PLAIN = [[3, 106], [KX + 117, 19], [KX + 157, 98], [KX + 281, 22]];
    var usePlain = function () {
      if (plain || TE) return;
      plain = true;
      PLAIN.forEach(function (r) { fill(LX + r[0], LOGO_Y, r[1], H - LOGO_Y); });
    };

    /* ---- a run's state -----------------------------------------------------------------
       Everything that changes during a run lives in S, so reset() is one
       assignment and nothing from the last run — the flower, the bonus, a
       half-risen sprout — can leak into the next. */
    var S = null;
    var copy = function (o) { var c = {}; for (var k in o) c[k] = o[k]; return c; };
    var reset = function () {
      S = {
        tick: 0, frames: 0, done: false, endF: 0, fin: false,
        camX: 0, plus: 0, bonus: 0, power: false,
        map: new Uint8Array(map0), cont: new Uint8Array(cont0),
        bt: new Uint8Array(LWT * ROWS), bumps: [],
        items: items0.map(copy), bugs: bugs0.map(copy), pops: [], minus: [], flowers: [], seeds: [],
        flagY: FLAG_TOP, hqFlag: 0,
        demo: false, dbug: { x: 120, rx: 0, vx: -0.5 },
        p: { x: 3 * T, y: GY - PH, rx: 0, ry: 0, vx: 0, vy: 0, w: PW, h: PH, py: GY - PH,
          face: 1, ground: true, coy: 0, buf: 0, cut: false, st: 'play', t: 0, anim: 0, inv: 0, throwT: 0 }
      };
      hud();
    };
    // the clock as shown and as submitted: elapsed, less a second per bug
    var clock = function () {
      return Math.max(0, (S.done ? S.endF : S.frames) * 1000 / 60 - S.bonus);
    };
    var hud = function () { api.hud({ who: NAMES[who], plus: S.plus, time: clock() }); };

    /* ---- collision ------------------------------------------------------------------------
       A box is free if no solid pixel lies inside it. The level's ends are
       walls; above the screen and below it are open, so you can jump past
       the top and fall into the sea. */
    var free = function (x, y, w, h) {
      if (x < 0 || x + w > LW) return false;
      var y0 = Math.max(0, y), y1 = Math.min(H, y + h);
      for (var yy = y0; yy < y1; yy++) {
        var row = yy * LW;
        for (var xx = x; xx < x + w; xx++) if (sol[row + xx]) return false;
      }
      return true;
    };
    var overlap = function (ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    };

    /* Moves resolve one pixel at a time, x then y, so nothing tunnels and a
       corner is always met exactly. Walking up a 1px lip just steps over it
       (the logo's anti-aliased edges and the slit where K's arm meets the
       E would otherwise snag your feet). */
    var moveX = function (p, dx) {
      p.rx += dx;
      var m = Math.round(p.rx);
      p.rx -= m;
      var s = m > 0 ? 1 : -1;
      while (m !== 0) {
        var nx = p.x + s;
        if (nx < S.camX) { p.vx = 0; p.rx = 0; return; }      // the screen's left edge is a wall
        if (free(nx, p.y, p.w, p.h)) p.x = nx;
        else if (p.ground && free(nx, p.y - 1, p.w, p.h)) { p.x = nx; p.y--; }
        else { p.vx = 0; p.rx = 0; return; }
        m -= s;
      }
    };
    var moveY = function (p, dy) {
      p.ry += dy;
      var m = Math.round(p.ry);
      p.ry -= m;
      var s = m > 0 ? 1 : -1;
      while (m !== 0) {
        if (free(p.x, p.y + s, p.w, p.h)) { p.y += s; m -= s; continue; }
        if (s < 0) {
          /* Clipped a corner by a pixel or three on the way up: slide round
             it rather than stopping dead. A jump that looks clear is clear. */
          var slid = false;
          for (var n = 1; n <= NUDGE && !slid; n++) {
            if (p.x - n >= S.camX && free(p.x - n, p.y - 1, p.w, p.h) && !free(p.x + n, p.y - 1, p.w, p.h)) { p.x -= n; slid = true; }
            else if (free(p.x + n, p.y - 1, p.w, p.h) && !free(p.x - n, p.y - 1, p.w, p.h)) { p.x += n; slid = true; }
          }
          if (slid) { p.y--; m++; continue; }
          headBump(p);
        }
        p.vy = 0; p.ry = 0;
        return;
      }
    };

    /* ---- bugs defeated ---------------------------------------------------------------------
       However a bug goes — stomped flat, or flipped by a seed or a block
       from below — it is a second off the clock, and a "-1" says so. */
    var defeat = function (b, flat) {
      if (flat) { b.st = 2; b.t = 0; } else { b.st = 3; b.vy = -2.6; }
      S.bonus += 1000;
      // the pop leans away from the founder, who is usually right on top
      var p = S.p, away = p.x + p.w / 2 <= b.x + BW / 2 ? 1 : -1;
      S.minus.push({ x: b.x - 1 + away * 12, y: b.y - 12, t: 0 });
      api.sfx('stomp');
    };

    /* ---- blocks ------------------------------------------------------------------------------ */
    var BUMP = [0, 2, 3, 4, 4, 3, 2, 1];
    var headBump = function (p) {
      var y = p.y - 1;
      if (y < 0 || y >= H) return;
      var ty = (y / T) | 0, a = (p.x / T) | 0, b = ((p.x + p.w - 1) / T) | 0;
      var mid = p.x + p.w / 2, best = -1, bd = 99;
      for (var tx = a; tx <= b; tx++) {
        var c = S.map[ty * LWT + tx];
        if (c !== BRK && c !== PLS && c !== USED) continue;
        var d = Math.abs(tx * T + T / 2 - mid);
        if (d < bd) { bd = d; best = tx; }
      }
      if (best < 0) { api.sfx('bump'); return; }
      bumpBlock(best, ty);
    };
    var bumpBlock = function (tx, ty) {
      var i = ty * LWT + tx;
      if (!S.bt[i]) { S.bt[i] = BUMP.length; S.bumps.push(i); }
      if (S.map[i] === PLS && S.cont[i] === BLOOM) {
        // the flower grows up out of the block and waits on top of it
        S.cont[i] = 0; S.map[i] = USED;
        S.flowers.push({ x: tx * T - 1, top: ty * T, rise: 0 });
        api.sfx('blip');
      } else if (S.map[i] === PLS && S.cont[i] > 0) {
        S.cont[i]--;
        if (!S.cont[i]) S.map[i] = USED;
        S.plus++;
        S.pops.push({ x: tx * T, y: ty * T - T, vy: -3.2, t: 0 });
        api.sfx('plus');
      } else api.sfx('bump');
      // a bug standing on a bumped block is knocked off it; a plus resting
      // there is knocked loose and caught
      var top = ty * T, x0 = tx * T;
      S.bugs.forEach(function (b) {
        if (b.st === 1 && Math.abs(b.y + BH - top) < 2 && b.x + BW > x0 && b.x < x0 + T) defeat(b, false);
      });
      S.items.forEach(function (it) {
        if (!it.got && it.y + 7 > top - T && it.y < top && it.x + 7 > x0 && it.x < x0 + T) {
          it.got = true; S.plus++;
          S.pops.push({ x: it.x, y: it.y, vy: -2.4, t: 0 });
        }
      });
    };
    var tickFx = function () {
      var i;
      for (i = S.bumps.length - 1; i >= 0; i--) {
        var k = S.bumps[i];
        if (!--S.bt[k]) S.bumps.splice(i, 1);
      }
      for (i = S.pops.length - 1; i >= 0; i--) {
        var q = S.pops[i];
        q.t++;
        if (!api.reduce) { q.y += q.vy; q.vy += G; }
        if (q.t > (api.reduce ? 14 : 24)) S.pops.splice(i, 1);
      }
      // "-1": rises 10px over 40 frames (holds still when motion is reduced)
      for (i = S.minus.length - 1; i >= 0; i--) if (++S.minus[i].t >= 40) S.minus.splice(i, 1);
      for (i = 0; i < S.flowers.length; i++) if (S.flowers[i].rise < 10 && S.tick % 3 === 0) S.flowers[i].rise++;
    };

    /* ---- the player --------------------------------------------------------------------------- */
    var jumpHeld = function () { return api.key('a') || api.key('up'); };
    var control = function (p) {
      var dir = (api.key('right') ? 1 : 0) - (api.key('left') ? 1 : 0);
      var max = api.key('b') ? RUN : WALK;
      if (dir) {
        p.face = dir;
        var nv = p.vx + dir * (p.ground ? (p.vx * dir < 0 ? SKID : ACC) : AIR);
        if (nv * dir > max) {
          // already over the cap (let go of run): ease back down on the
          // ground, hold it in the air — a running jump stays a running
          // jump, but a walking one never speeds up into one
          if (p.vx * dir > max) nv = p.ground ? dir * Math.max(max, p.vx * dir - DEC) : p.vx;
          else nv = dir * max;
        }
        p.vx = nv;
      } else if (p.ground) {
        p.vx = Math.abs(p.vx) <= DEC ? 0 : p.vx - DEC * (p.vx > 0 ? 1 : -1);
      } else p.vx *= 0.985;

      if (api.hit('a') || api.hit('up')) p.buf = BUFFER; else if (p.buf) p.buf--;
      if (p.ground) p.coy = COYOTE; else if (p.coy) p.coy--;
      if (p.buf && p.coy) {
        p.vy = JUMP; p.buf = 0; p.coy = 0; p.ground = false; p.cut = true;
        api.sfx('jump');
      }
      if (p.cut && p.vy < CUT && !jumpHeld()) p.vy = CUT;
      if (p.vy >= 0) p.cut = false;
      p.vy = Math.min(FALL, p.vy + G);

      /* B is run while held and, with the flower, throw on the press — the
         original's own double duty. Two seeds in the air at most. */
      if (S.power && api.hit('b') && S.seeds.length < 2) {
        S.seeds.push({ x: p.face > 0 ? p.x + p.w - 2 : p.x - 2, y: p.y + 7, rx: 0, ry: 0, vx: 2.4 * p.face, vy: 1.2, t: 0 });
        p.throwT = 8;
        api.sfx('shoot');
      }
      if (p.throwT) p.throwT--;
    };
    var camera = function (p) {
      var want = p.x + (p.w >> 1) - LEAD;
      if (want > S.camX) S.camX = Math.min(LW - W, want);
    };
    var die = function (p) {
      if (p.st === 'dead') return;
      p.st = 'dead'; p.t = 0; p.vx = 0; p.vy = 0; p.inv = 0;
      api.sfx('die');
      api.buzz(60);
    };
    // a bug got you: with the flower you lose the flower (and blink, safe,
    // for two seconds); without it, the run is over. The sea always wins.
    var hurt = function (p) {
      if (p.inv) return;
      if (S.power) {
        S.power = false; p.inv = INV;
        api.sfx('miss');
        api.buzz(30);
      } else die(p);
    };
    /* The classic exit: a beat of stillness, a hop, and off the bottom of
       the screen. Reduced motion keeps the beat and drops the hop. Then the
       console re-inks the page and calls reset(). */
    var dying = function (p) {
      p.t++;
      if (!api.reduce && p.t > 18) {
        if (p.t === 19) p.vy = -4;
        p.vy = Math.min(FALL + 1, p.vy + G);
        p.y += p.vy;
      }
      if (p.t >= (api.reduce ? 50 : 76)) { api.reload(); return true; }
      return false;
    };

    /* ---- bugs ------------------------------------------------------------------------------------
       They wake as they come on screen, walk at half a pixel a frame, turn
       at walls and at each other, and walk off ledges — into the sea, if
       that is where the ledge is. */
    var bugsStep = function () {
      var list = S.bugs, i, b;
      for (i = list.length - 1; i >= 0; i--) {
        b = list[i];
        if (b.st === 0) { if (b.x < S.camX + W + 8) b.st = 1; else continue; }
        if (b.st === 2) { if (++b.t > 30) list.splice(i, 1); continue; }
        if (b.st === 3) { b.vy = Math.min(FALL, b.vy + G); b.y += b.vy; if (b.y > H) list.splice(i, 1); continue; }
        b.t++;
        b.rx += b.vx;
        var m = Math.round(b.rx);
        b.rx -= m;
        if (m) { if (free(b.x + m, b.y, BW, BH)) b.x += m; else { b.vx = -b.vx; b.rx = 0; } }
        b.vy = Math.min(FALL, b.vy + G);
        b.ry += b.vy;
        var n = Math.round(b.ry);
        b.ry -= n;
        while (n > 0) {
          if (free(b.x, b.y + 1, BW, BH)) { b.y++; n--; } else { b.vy = 0; b.ry = 0; break; }
        }
        if (b.y > SEA || b.x + BW < S.camX - 32) list.splice(i, 1);
      }
      for (i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var a = list[i], c = list[j];
          if (a.st !== 1 || c.st !== 1 || !overlap(a.x, a.y, BW, BH, c.x, c.y, BW, BH)) continue;
          var l = a.x <= c.x ? a : c, r = l === a ? c : a;
          l.vx = -Math.abs(l.vx); r.vx = Math.abs(r.vx);
        }
      }
    };
    // fall onto one from above and it squashes, and you bounce (higher if
    // you hold jump); meet one any other way and it gets you
    var touchBugs = function (p) {
      for (var i = 0; i < S.bugs.length; i++) {
        var b = S.bugs[i];
        if (b.st !== 1 || !overlap(p.x + 1, p.y + 2, p.w - 2, p.h - 2, b.x, b.y, BW, BH)) continue;
        if (p.vy > 0 && p.py + p.h <= b.y + 3) {
          defeat(b, true);
          var held = jumpHeld();
          p.vy = held ? JUMP : -2.6; p.cut = held; p.ry = 0;
        } else { hurt(p); if (p.st !== 'play') return; }
      }
    };
    var collect = function (p) {
      S.items.forEach(function (it) {
        if (it.got || !overlap(p.x, p.y, p.w, p.h, it.x, it.y, 7, 7)) return;
        it.got = true; S.plus++;
        api.sfx('plus');
      });
      // the flower's touch box is a little wider than its block, so a jump
      // straight up from beside the block takes it — no need to land on it
      for (var i = S.flowers.length - 1; i >= 0; i--) {
        var f = S.flowers[i];
        if (f.rise < 10 || !overlap(p.x, p.y, p.w, p.h, f.x - 2, f.top - 10, 13, 10)) continue;
        S.flowers.splice(i, 1);
        S.power = true;
        api.sfx('bonus');
      }
    };

    /* ---- seeds ------------------------------------------------------------------------------------
       Thrown low and forward, they bounce along the ground like the
       original's fireball, burst on a wall, fizzle after two seconds, and
       flip any bug they touch. The hop is kept to ~5px: any higher and a
       seed sails clean over a 7px bug at the top of its bounce. */
    var seedsStep = function () {
      for (var i = S.seeds.length - 1; i >= 0; i--) {
        var s = S.seeds[i], gone = ++s.t > 120;
        s.rx += s.vx;
        var m = Math.round(s.rx), d = m > 0 ? 1 : -1;
        s.rx -= m;
        while (m !== 0 && !gone) {
          if (free(s.x + d, s.y, 4, 4)) { s.x += d; m -= d; } else gone = true;
        }
        s.vy = Math.min(FALL, s.vy + 0.4);
        s.ry += s.vy;
        var n = Math.round(s.ry), e = n > 0 ? 1 : -1;
        s.ry -= n;
        while (n !== 0 && !gone) {
          if (free(s.x, s.y + e, 4, 4)) { s.y += e; n -= e; }
          else { s.vy = e > 0 ? -2 : 0.5; s.ry = 0; break; }
        }
        if (s.y > SEA || s.x < S.camX - 8 || s.x > S.camX + W + 8) gone = true;
        for (var j = 0; j < S.bugs.length && !gone; j++) {
          var b = S.bugs[j];
          if (b.st === 1 && overlap(s.x - 1, s.y - 1, 6, 6, b.x, b.y, BW, BH)) { defeat(b, false); gone = true; }
        }
        if (gone) S.seeds.splice(i, 1);
      }
    };

    /* ---- the finish ---------------------------------------------------------------------------------
       Touch the pole and the clock stops. Slide down it as the flag comes
       down with you, hop off, walk in at HQ's door; its flag goes up, and
       the console takes the time. */
    var poleCheck = function (p) {
      if (!overlap(p.x, p.y, p.w, p.h, POLE_X, POLE_TOP, 2, BASE_Y - POLE_TOP)) return;
      S.done = true; S.endF = S.frames;
      p.st = 'pole'; p.t = 0; p.vx = 0; p.vy = 0; p.rx = 0; p.ry = 0; p.face = 1; p.inv = 0;
      p.x = POLE_X - p.w;
      api.sfx('goal');
    };
    var ending = function (p) {
      if (p.st === 'pole') {
        if (p.y + p.h < BASE_Y) p.y = Math.min(BASE_Y - p.h, p.y + 2);
        if (S.flagY < FLAG_LOW) S.flagY = Math.min(FLAG_LOW, S.flagY + 2);
        if (p.y + p.h >= BASE_Y && S.flagY >= FLAG_LOW && ++p.t > 14) {
          p.st = 'walk'; p.t = 0; p.x = POLE_X + 2; p.vx = 0; p.vy = 0;
        }
      } else if (p.st === 'walk') {
        p.vx = 1.2;
        moveX(p, p.vx);
        p.vy = Math.min(FALL, p.vy + G);
        moveY(p, p.vy);
        p.ground = !free(p.x, p.y + 1, p.w, p.h);
        p.anim += 0.16;
        camera(p);
        if (p.x + p.w / 2 >= DOOR_X) { p.st = 'in'; p.t = 0; }
      } else if (p.st === 'in') {
        p.t++;
        if (S.hqFlag < 10) S.hqFlag += 0.25;
        if (p.t >= 50 && !S.fin) {
          S.fin = true;
          // never 0: the board only takes a positive time
          api.finish(Math.max(1, Math.round(clock())));
          return true;
        }
      }
      return false;
    };

    /* ---- one step ------------------------------------------------------------------------------------- */
    var update = function () {
      var p = S.p;
      S.demo = false;
      S.tick++;
      tickFx();
      if (p.st === 'dead') { if (dying(p)) return; hud(); return; }
      if (!S.done) S.frames++;
      if (p.st !== 'play') { seedsStep(); if (ending(p)) return; hud(); return; }

      control(p);
      p.py = p.y;
      moveX(p, p.vx);
      moveY(p, p.vy);
      p.ground = !free(p.x, p.y + 1, p.w, p.h);
      if (p.ground && p.vy > 0) p.vy = 0;
      p.anim = p.ground && Math.abs(p.vx) > 0.15 ? p.anim + Math.abs(p.vx) * 0.11 : (p.ground ? 0 : p.anim);
      if (p.inv) p.inv--;
      camera(p);
      bugsStep();
      seedsStep();
      collect(p);
      touchBugs(p);
      if (p.st === 'play' && p.y + p.h > DROWN) die(p);
      if (p.st === 'play') poleCheck(p);
      hud();
    };

    /* ---- drawing ---------------------------------------------------------------------------------------- */
    // the sea's surface: a slow swell, 16px long, with two lines of glints
    var WAVE = [];
    for (var w0 = 0; w0 < 16; w0++) WAVE.push(Math.round(1.5 + 1.5 * Math.cos(w0 * Math.PI / 8)));
    var drawSea = function (ctx, cx, INK, GR) {
      var t0 = api.reduce ? 0 : (S.tick >> 3);
      var a = Math.max(0, (cx >> 3) - 1), b = Math.min(LWT - 1, ((cx + W) >> 3) + 1);
      for (var tx = a; tx <= b; tx++) {
        if (!sea[tx]) continue;
        var x0 = tx * T - cx;
        // the water hides what is under it: the letters rise out of it
        ctx.fillStyle = GR; ctx.fillRect(x0, SEA - 1, T, H - SEA + 1);
        ctx.fillStyle = INK;
        for (var k = 0; k < T; k++) {
          var wx = tx * T + k;
          var ph = (wx + t0) & 15;
          ctx.fillRect(x0 + k, SEA - 1 + WAVE[ph], 1, 1);
          if (WAVE[ph] === 0) ctx.fillRect(x0 + k, SEA - 2, 1, 1);
          if (((wx - t0) & 31) < 5) ctx.fillRect(x0 + k, SEA + 6, 1, 1);
          if (((wx + 13 + (t0 >> 1)) & 31) < 3) ctx.fillRect(x0 + k, SEA + 10, 1, 1);
        }
      }
    };
    var drawTile = function (ctx, c, x, y, tx) {
      switch (c) {
        case GRD:
          api.draw(ctx, TILE.ground, x, y);
          // a cliff edge where the promenade meets the sea
          ctx.fillStyle = api.ink();
          if (tx > 0 && sea[tx - 1]) ctx.fillRect(x, y, 1, T);
          if (tx < LWT - 1 && sea[tx + 1]) ctx.fillRect(x + T - 1, y, 1, T);
          break;
        case BRK: api.draw(ctx, TILE.brick, x, y); break;
        case PLS:
          // a glint now and then so a "+" block reads as one to hit
          api.draw(ctx, !api.reduce && (S.tick + tx * 5) % 90 < 6 ? TILE.plusLit : TILE.plus, x, y);
          break;
        case USED: api.draw(ctx, TILE.used, x, y); break;
        case HARD: api.draw(ctx, TILE.hard, x, y); break;
        case PCAP: api.draw(ctx, CAP, x, y); break;
        case PSHAFT: api.draw(ctx, SHAFT, x, y); break;
      }
    };
    var drawHQ = function (ctx, cx, INK, GR) {
      var x0 = HQ_X - cx;
      if (x0 > W || x0 + HQ_W < 0) return;
      var i, j;
      // walls of the same granite as the promenade
      for (j = 0; j < 4; j++) for (i = 0; i < HQ_W / T; i++) api.draw(ctx, TILE.ground, x0 + i * T, GY - 32 + j * T);
      ctx.fillStyle = INK;
      ctx.fillRect(x0, GY - 32, 1, 32); ctx.fillRect(x0 + HQ_W - 1, GY - 32, 1, 32);
      // cornice, and the sign on it with the wordmark
      ctx.fillRect(x0 - 2, GY - 36, HQ_W + 4, 4);
      ctx.fillRect(x0 + 2, GY - 50, HQ_W - 4, 14);
      ctx.fillStyle = GR; ctx.fillRect(x0 + 3, GY - 49, HQ_W - 6, 12);
      if (SIGN) ctx.drawImage(api.maskCanvas(SIGN, 'ink'), x0 + 4, GY - 47);
      else api.text('TEKEX', x0 + HQ_W / 2, GY - 46, { align: 'center' });
      // the roof flagpole; its flag goes up when you are home
      ctx.fillStyle = INK; ctx.fillRect(x0 + HQ_W / 2, GY - 66, 1, 16);
      if (S.hqFlag > 0) api.draw(ctx, MINI_FLAG, x0 + HQ_W / 2 + 1, Math.round(GY - 56 - S.hqFlag));
      // windows
      for (i = 0; i < 2; i++) {
        var wx = x0 + (i ? 35 : 5), wy = GY - 28;
        ctx.fillStyle = INK; ctx.fillRect(wx, wy, 8, 8);
        ctx.fillStyle = GR; ctx.fillRect(wx + 1, wy + 1, 6, 6);
        ctx.fillStyle = INK; ctx.fillRect(wx + 1, wy + 3, 6, 1); ctx.fillRect(wx + 3, wy + 1, 1, 6);
      }
      // the door, arched, tall enough to walk in at
      var dx = DOOR_X - cx - 7;
      ctx.fillStyle = INK;
      ctx.fillRect(dx, GY - 22, 14, 22);
      ctx.fillRect(dx + 1, GY - 23, 12, 1); ctx.fillRect(dx + 3, GY - 24, 8, 1);
    };
    var drawPlayer = function (ctx, cx) {
      var p = S.p;
      if (p.st === 'in') return;
      // the grace period blinks — unless motion is reduced, when it is
      // simply safe
      if (p.inv && !api.reduce && (p.inv >> 2) % 2) return;
      var set = S.power ? POWER[who] : CH[who], f;
      if (p.st === 'dead') f = set.hurt;
      else if (p.st === 'pole' || !p.ground) f = set.jump;
      else if (p.throwT) f = set.run1;
      else if (Math.abs(p.vx) > 0.15) f = set[RUN_CYCLE[(p.anim | 0) % 4]];
      else f = set.idle;
      var flip = p.face < 0 && p.st !== 'dead';
      var sx = p.x - (SW - PW) / 2 - cx, sy = p.y + PH - SH;
      api.draw(ctx, f, sx, sy, flip);
      if (S.power && p.st !== 'dead') {
        var at = SPROUT_AT[who];
        api.draw(ctx, SPROUT, sx + (flip ? SW - at - SPROUT.w : at), sy - SPROUT.h + 1, flip);
      }
    };

    var render = function (ctx) {
      var INK = api.ink(), GR = api.ground();
      var cx = S.camX | 0, i;
      ctx.fillStyle = GR; ctx.fillRect(0, 0, W, H);

      // sky: clouds drift (not under reduced motion), hills sit still
      var drift = api.reduce ? 0 : (S.tick >> 4);
      for (i = 0; i < clouds.length; i++) {
        var cl = clouds[i], span = LW + 64;
        var x = ((cl.x - drift) % span + span) % span - 32 - cx;
        if (x > -cl.s.w && x < W) api.draw(ctx, cl.s, x, cl.y);
      }
      for (i = 0; i < hills.length; i++) {
        var hl = hills[i];
        if (hl.x - cx < W && hl.x + hl.s.w - cx > 0) api.draw(ctx, hl.s, hl.x - cx, GY - hl.s.h + 1);
      }

      // the wordmark, then the sea in front of its feet
      if (LX - cx < W && LX + KX + LOGO_W - cx > 0) {
        if (TE) ctx.drawImage(api.maskCanvas(TE, 'ink'), LX - cx, LOGO_Y);
        if (KEX) ctx.drawImage(api.maskCanvas(KEX, 'ink'), LX + KX - cx, LOGO_Y);
        if (plain) {
          ctx.fillStyle = INK;
          PLAIN.forEach(function (r) { ctx.fillRect(LX + r[0] - cx, LOGO_Y, r[1], H - LOGO_Y); });
        }
      }
      drawSea(ctx, cx, INK, GR);

      // flowers go behind the tiles, so one still rising is half inside its block
      var sway = api.reduce ? 0 : (S.tick >> 5) & 1;
      for (i = 0; i < S.flowers.length; i++) {
        var fl = S.flowers[i];
        if (fl.x - cx > -10 && fl.x - cx < W) api.draw(ctx, FLOWER[fl.rise >= 10 ? sway : 0], fl.x - cx, fl.top - fl.rise);
      }

      // tiles: one column early, so a pillar's right half never goes missing
      var a = Math.max(0, (cx >> 3) - 1), b = Math.min(LWT - 1, (cx + W) >> 3);
      for (var tx = a; tx <= b; tx++) {
        for (var ty = 0; ty < ROWS; ty++) {
          var k = ty * LWT + tx, c = S.map[k];
          if (!c || c === PRIGHT) continue;
          var off = S.bt[k] ? BUMP[BUMP.length - S.bt[k]] : 0;
          drawTile(ctx, c, tx * T - cx, ty * T - off, tx);
        }
      }

      // the flagpole
      var px = POLE_X - cx;
      if (px > -16 && px < W + 4) {
        ctx.fillStyle = INK; ctx.fillRect(px, POLE_TOP, 2, BASE_Y - POLE_TOP);
        api.draw(ctx, BALL, px - 1, POLE_TOP - 4);
        api.draw(ctx, FLAG, px - 12, Math.round(S.flagY));
      }
      drawHQ(ctx, cx, INK, GR);

      // pluses: a gentle bob, unless motion is reduced
      for (i = 0; i < S.items.length; i++) {
        var it = S.items[i];
        if (it.got || it.x - cx < -8 || it.x - cx > W) continue;
        var bob = api.reduce ? 0 : ((S.tick >> 4) + (it.x >> 3)) % 4 === 0 ? -1 : 0;
        api.draw(ctx, PLUS, it.x - cx, it.y + bob);
      }
      for (i = 0; i < S.pops.length; i++) {
        var q = S.pops[i];
        if (api.reduce || q.t < 18 || q.t % 2) api.draw(ctx, PLUS, q.x - cx, Math.round(q.y));
      }

      for (i = 0; i < S.bugs.length; i++) {
        var g = S.bugs[i], gx = g.x - cx;
        if (g.st === 0 || gx < -10 || gx > W) continue;
        if (g.st === 2) api.draw(ctx, BUG_FLAT, gx, g.y + BH - 3);
        else if (g.st === 3) api.draw(ctx, BUG_FLIP, gx, Math.round(g.y));
        else api.draw(ctx, BUG[(g.t >> 3) & 1], gx, g.y, g.vx > 0);
      }
      for (i = 0; i < S.seeds.length; i++) {
        var s = S.seeds[i];
        api.draw(ctx, SEED[api.reduce ? 0 : (s.t >> 2) & 1], s.x - cx, s.y);
      }

      // "-1" on its own ground plate (in 1-bit, ink on ink vanishes, and the
      // pop always starts over its bug), drawn under the founder so the
      // plate never blanks him out
      for (i = 0; i < S.minus.length; i++) {
        var mn = S.minus[i];
        api.text('-1', mn.x - cx, mn.y - (api.reduce ? 0 : mn.t >> 2), { scale: 1, bg: true });
      }

      if (S.demo) {
        var d = S.dbug;
        api.draw(ctx, BUG[(S.tick >> 3) & 1], d.x, GY - BH, d.vx > 0);
      } else drawPlayer(ctx, cx);

    };

    var game = {
      init: function () {
        var te = api.logo(LOGO_W, { paths: [0, 2, 4] });
        var kex = api.logo(LOGO_W, { paths: [1, 3] });
        var sign = api.logo(40).then(function (m) { SIGN = m; }, function () {});
        return Promise.all([te, kex]).then(function (m) {
          TE = m[0]; KEX = m[1];
          LOGO_Y = H - TE.h;
          stampMask(TE, LX, LOGO_Y);
          stampMask(KEX, LX + KX, LOGO_Y);
        }, function () { usePlain(); }).then(function () { return sign; });
      },
      reset: reset,
      update: update,
      render: render,
      // the title screen: a bug patrols the promenade under the card
      attract: function () {
        S.demo = true;
        S.tick++;
        var d = S.dbug;
        d.rx += d.vx;
        var m = Math.round(d.rx);
        d.rx -= m; d.x += m;
        if (d.x < 4) d.vx = 0.5;
        if (d.x > W - 12) d.vx = -0.5;
      },
      select: [
        { id: 'tom', name: 'TOM', role: 'PARTNER', sprite: CH.tom.idle, frames: RUN_CYCLE.map(function (f) { return CH.tom[f]; }) },
        { id: 'ed', name: 'ED', role: 'FOUNDER', sprite: CH.ed.idle, frames: RUN_CYCLE.map(function (f) { return CH.ed[f]; }) }
      ],
      choose: function (id) { if (CH[id]) who = id; if (S) hud(); }
    };
    reset();
    return game;
  };
})();
