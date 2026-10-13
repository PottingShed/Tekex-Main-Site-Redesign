/* ==========================================================================
   play.js — the arcade behind the footer's sixth button (owner, 13 Oct: "a
   moment where people find it and think 'oh my god this is amazing!'").

   A handheld rises out of the bottom of the page with the TEKEX logo where
   the console's name would be. Its screen is a 160x144 dot matrix — the
   original handheld's — printed in the active pair, which is exactly what
   the brand's duotone already is: one ink on one ground. On a phone the
   handheld's own D-pad and buttons are the controls; on a desktop it is
   the keyboard, with the keys listed to one side.

   One of three games per load, never the one played last. Every death
   re-inks the whole page in a new pair. High scores take a name, entered
   on the screen's own letter grid; rude words are refused at the door and
   the owner edits the board by hand for anything that gets past.

   This file is the console: game choice, the pair, input, the synth, the
   screen, the scenes every game shares (power-on, title, select, pause,
   game over, name entry, scores) and the leaderboard. The games are
   js/games/<id>.js and only the chosen one is fetched. Their contract is
   the `api` object at the bottom, written out in js/games/README.md.
   ========================================================================== */
(function () {
  'use strict';
  var stage = document.querySelector('[data-play]');
  if (!stage) return;

  var W = 160, H = 144, TOP = 10, STEP = 1000 / 60;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg = window.TEKEX_PLAY || {};
  var me = document.currentScript && document.currentScript.src;
  var base = me ? me.replace(/js\/play\.js.*$/, '') : '';

  var gb = stage.querySelector('[data-gb]');
  var view = gb.querySelector('canvas');
  var vctx = view.getContext('2d');
  var buf = document.createElement('canvas');
  buf.width = W; buf.height = H;
  var ctx = buf.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  var live = document.querySelector('[data-play-live]');
  var boardEl = document.querySelector('[data-board]');
  var boardNote = document.querySelector('[data-board-note]');
  var muteBtn = document.querySelector('[data-mute]');

  var pad = function (n, l) { n = String(Math.max(0, Math.round(n))); while (n.length < l) n = '0' + n; return n; };
  var fmtTime = function (ms) {
    ms = Math.max(0, Math.round(ms || 0));
    return Math.floor(ms / 60000) + ':' + pad(Math.floor(ms / 1000) % 60, 2) + '.' + pad(Math.floor(ms / 10) % 100, 2);
  };
  var dots = function (n) { return new Array(Math.max(0, n || 0) + 1).join('•'); };

  /* ---- the three games ----------------------------------------------------- */
  var META = {
    invaders: {
      num: '02', name: 'TEKEX Space', word: 'SPACE', metric: 'score',
      blurb: 'The logo has landed and it is coming down. Three islands stand between it and the shore. Shoot it to pieces.',
      keys: [['← →', 'Move'], ['Space', 'Fire'], ['Enter', 'Start / pause'], ['M', 'Sound']],
      hud: function (v) { return [pad(v.score || 0, 6), 'WAVE ' + (v.wave || 1), dots(v.lives)]; }
    },
    pong: {
      num: '03', name: 'TEKEX Pong', word: 'PONG', metric: 'score',
      blurb: 'Two logos, one dot. Every return scores. Let three past you and it is over.',
      keys: [['↑ ↓', 'Move'], ['Mouse or drag', 'Move'], ['Enter', 'Start / pause'], ['M', 'Sound']],
      hud: function (v) { return ['YOU ' + (v.you || 0), pad(v.score || 0, 6), dots(v.lives)]; }
    },
    land: {
      num: '01', name: 'TEKEX Jump', word: 'JUMP', metric: 'time',
      blurb: 'Pick a founder. Run, jump the gaps between the letters and reach HQ. Fastest times win.',
      keys: [['← →', 'Run'], ['Space', 'Jump'], ['Shift', 'Sprint'], ['Enter', 'Start / pause'], ['M', 'Sound']],
      hud: function (v) { return [String(v.who || '').toUpperCase(), '+' + pad(v.plus || 0, 2), fmtTime(v.time)]; },
      song: 'land'
    }
  };
  var IDS = ['land', 'invaders', 'pong'];   // Jump, Space, Pong (owner, 13 Oct)

  /* A refresh serves a different game (the owner's brief, and the pairs'
     own never-repeat rule). Choosing one — the Jump | Space | Pong picker,
     or SELECT on the title screen — leaves it in sessionStorage for exactly
     the next load, so the reload after that is random again. ?g=<id> also
     forces one (the picker's no-JS fallback, and review). */
  var forced = /[?&]g=(invaders|pong|land)\b/.exec(location.search);
  var picked = null, swapped = false;
  try { picked = sessionStorage.getItem('tkx-play-pick'); sessionStorage.removeItem('tkx-play-pick'); } catch (e) {}
  var last = null;
  try { last = localStorage.getItem('tkx-play-last'); } catch (e) {}
  var choice = IDS.filter(function (g) { return g !== last; });
  var id = META.hasOwnProperty(picked) ? picked : forced ? forced[1] : choice[Math.floor(Math.random() * choice.length)];
  if (META.hasOwnProperty(picked)) swapped = true;
  try { localStorage.setItem('tkx-play-last', id); } catch (e) {}
  // a ?g= link chose this load; take it out of the address so a reload is random
  if (forced && window.history.replaceState) history.replaceState(null, '', location.pathname + location.search.replace(/[?&]g=[a-z]+/, '').replace(/^&/, '?') + location.hash);
  var pick = function (g) {
    try { sessionStorage.setItem('tkx-play-pick', g); } catch (e) {}
    location.href = location.pathname + location.search.replace(/[?&]g=[a-z]+/, '').replace(/^&/, '?');
  };
  var meta = META[id];
  var asc = meta.metric === 'time';

  /* ---- the pair --------------------------------------------------------------
     Every death re-inks the page in another pair, never the current one,
     and records it so the next page load won't repeat it either. */
  var PAIRS = [['cw-blue', '#FFDC8A'], ['cw-magenta', '#87FFED'], ['cw-purple', '#D1FFBF'], ['cw-red', '#F6C5FF'], ['cw-aubergine', '#FF6EA5']];
  var INK = '#000', GROUND = '#fff', inkGen = 0;
  var readInk = function () {
    var cs = getComputedStyle(root);
    INK = cs.getPropertyValue('--brand-ink').trim() || INK;
    GROUND = cs.getPropertyValue('--brand-ground').trim() || GROUND;
    inkGen++;
  };
  var reink = function () {
    var cur = PAIRS.filter(function (p) { return root.classList.contains(p[0]); })[0];
    var pool = PAIRS.filter(function (p) { return p !== cur; });
    var p = pool[Math.floor(Math.random() * pool.length)];
    PAIRS.forEach(function (q) { root.classList.remove(q[0]); });
    root.classList.add(p[0]);
    try { sessionStorage.setItem('tkx-cw', p[0]); } catch (e) {}
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', p[1]);
    readInk();
    // as a Reprint does: the cursor's dark/light line, the favicon and the
    // photo print all follow the new pair
    document.dispatchEvent(new CustomEvent('tekex:reink'));
  };
  readInk();

  /* ---- 1-bit drawing ------------------------------------------------------------
     Sprites are rows of characters, painted in the current pair:
       .  nothing     #  ink        o  ground (opaque: faces, whites, glass)
       :  checker     |  vertical stripes (corduroy)
       =  horizontal stripes        -  sparse dots (stubble, spray)
     Each sprite's canvas is cached for the current pair, rebuilt on a re-ink. */
  var paintChar = function (c, x, y) {
    switch (c) {
      case '#': return INK;
      case 'o': return GROUND;
      case ':': return (x + y) % 2 ? GROUND : INK;
      case '|': return x % 2 ? GROUND : INK;
      case '=': return y % 2 ? GROUND : INK;
      case '-': return (x % 2 || y % 2) ? GROUND : INK;
      default: return null;
    }
  };
  var sprite = function (rows) {
    return { rows: rows, w: rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0), h: rows.length, c: {} };
  };
  var spriteCanvas = function (s, flip) {
    var key = inkGen + (flip ? 'f' : 'n');
    if (s.c[key]) return s.c[key];
    if (s.gen !== inkGen) { s.c = {}; s.gen = inkGen; }
    var cv = document.createElement('canvas');
    cv.width = s.w; cv.height = s.h;
    var g = cv.getContext('2d');
    s.rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var col = paintChar(row[x], x, y);
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(flip ? s.w - 1 - x : x, y, 1, 1);
      }
    });
    s.c[key] = cv;
    return cv;
  };
  var draw = function (g, s, x, y, flip, scale) {
    var cv = spriteCanvas(s, flip);
    if (scale && scale !== 1) g.drawImage(cv, Math.round(x), Math.round(y), s.w * scale, s.h * scale);
    else g.drawImage(cv, Math.round(x), Math.round(y));
  };

  /* masks: { w, h, d: Uint8Array (1 = solid), n: solid count, v: version }.
     Change m.d, bump m.v, and maskCanvas repaints it. */
  var hexRgb = function (h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  var maskCanvas = function (m, color) {
    var key = inkGen + ':' + m.v + ':' + (color || 'ink');
    if (m._k === key) return m._c;
    var cv = m._c || document.createElement('canvas');
    cv.width = m.w; cv.height = m.h;
    var g = cv.getContext('2d'), img = g.createImageData(m.w, m.h);
    var rgb = hexRgb(color === 'ground' ? GROUND : INK);
    for (var i = 0; i < m.d.length; i++) {
      if (!m.d[i]) continue;
      img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    m._c = cv; m._k = key;
    return cv;
  };

  var texts = {};
  var load = function (path) {
    if (!texts[path]) texts[path] = fetch(base + path).then(function (r) { return r.text(); });
    return texts[path];
  };
  /* An SVG into a 1-bit mask, w x h. rotate: 90 / -90 stands it on its side
     (the Pong paddles). fill: floods an outline icon solid (the islands are
     stroked line icons; as shields they need to be land). */
  var raster = function (svg, w, h, o) {
    o = o || {};
    var img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return (img.decode ? img.decode() : new Promise(function (res) { img.onload = res; })).then(function () {
      var rot = o.rotate === 90 || o.rotate === -90;
      var cw = rot ? h : w, ch = rot ? w : h;
      var cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      var g = cv.getContext('2d');
      if (rot) { g.translate(cw / 2, ch / 2); g.rotate(o.rotate * Math.PI / 180); g.drawImage(img, -w / 2, -h / 2, w, h); }
      else g.drawImage(img, 0, 0, w, h);
      var px = g.getImageData(0, 0, cw, ch).data, d = new Uint8Array(cw * ch), n = 0, i;
      for (i = 0; i < d.length; i++) if (px[i * 4 + 3] > (o.threshold || 110)) { d[i] = 1; n++; }
      if (o.fill) {
        var out = new Uint8Array(d.length), stack = [], x, y;
        for (x = 0; x < cw; x++) stack.push(x, (ch - 1) * cw + x);
        for (y = 0; y < ch; y++) stack.push(y * cw, y * cw + cw - 1);
        while (stack.length) {
          var k = stack.pop();
          if (out[k] || d[k]) continue;
          out[k] = 1;
          var kx = k % cw;
          if (kx > 0) stack.push(k - 1);
          if (kx < cw - 1) stack.push(k + 1);
          if (k >= cw) stack.push(k - cw);
          if (k < d.length - cw) stack.push(k + cw);
        }
        n = 0;
        for (i = 0; i < d.length; i++) { d[i] = out[i] ? 0 : 1; n += d[i]; }
      }
      return { w: cw, h: ch, d: d, n: n, v: 0 };
    });
  };
  var logoCache = {};
  var logo = function (w, o) {
    o = o || {};
    var key = w + ':' + (o.rotate || 0) + ':' + (o.paths || 'all');
    if (logoCache[key]) return logoCache[key];
    logoCache[key] = load('assets/brand/tekex-logo.svg').then(function (svg) {
      if (o.paths) {
        // keep only the listed <path>s (Land splits the wordmark into TE and KEX)
        var i = -1;
        svg = svg.replace(/<path\b[^>]*\/>/g, function (p) { i++; return o.paths.indexOf(i) > -1 ? p : ''; });
      }
      var h = o.h || Math.round(w * 63 / 304);
      return raster(svg, w, h, { rotate: o.rotate });
    });
    return logoCache[key];
  };

  /* ---- the screen's type -----------------------------------------------------------
     A 5x7 pixel face, drawn in-game, so the titles, scores and name entry
     are part of the screen like everything else on it. */
  var F = {
    'A': '.###.#...##...#######...##...##...#', 'B': '####.#...##...#####.#...##...#####.',
    'C': '.###.#...##....#....#....#...#.###.', 'D': '####.#...##...##...##...##...#####.',
    'E': '######....#....####.#....#....#####', 'F': '######....#....####.#....#....#....',
    'G': '.###.#...##....#.####...##...#.####', 'H': '#...##...##...#######...##...##...#',
    'I': '.###...#....#....#....#....#...###.', 'J': '..###...#....#....#.#..#.#..#..##..',
    'K': '#...##..#.#.#..##...#.#..#..#.#...#', 'L': '#....#....#....#....#....#....#####',
    'M': '#...###.###.#.##.#.##...##...##...#', 'N': '#...##...###..##.#.##..###...##...#',
    'O': '.###.#...##...##...##...##...#.###.', 'P': '####.#...##...#####.#....#....#....',
    'Q': '.###.#...##...##...##.#.##..#..##.#', 'R': '####.#...##...#####.#.#..#..#.#...#',
    'S': '.#####....#.....###.....#....#####.', 'T': '#####..#....#....#....#....#....#..',
    'U': '#...##...##...##...##...##...#.###.', 'V': '#...##...##...##...##...#.#.#...#..',
    'W': '#...##...##...##.#.##.#.##.#.#.#.#.', 'X': '#...##...#.#.#...#...#.#.#...##...#',
    'Y': '#...##...#.#.#...#....#....#....#..', 'Z': '#####....#...#...#...#...#....#####',
    '0': '.###.#...##..###.#.###..##...#.###.', '1': '..#...##....#....#....#....#...###.',
    '2': '.###.#...#....#...#...#...#...#####', '3': '####.....#....#.###.....#....#####.',
    '4': '...#...##..#.#.#..#.#####...#....#.', '5': '######....####.....#....##...#.###.',
    '6': '..##..#...#....####.#...##...#.###.', '7': '#####....#...#...#...#....#....#...',
    '8': '.###.#...##...#.###.#...##...#.###.', '9': '.###.#...##...#.####....#...#..##..',
    '.': '..........................##...##..', ',': '.....................##....#...#...',
    '!': '..#....#....#....#....#.........#..', '?': '.###.#...#....#...#...#.........#..',
    '-': '...............#####...............', ':': '......##...##........##...##.......',
    '\'': '..#....#...#.......................', '/': '....#...#....#...#...#....#...#....',
    '+': '.......#....#..#####..#....#.......', '(': '...#...#...#....#....#.....#.....#.',
    ')': '.#.....#.....#....#....#...#...#...', '\u2022': '...........###..###..###...........',
    '>': '.#....##...###..####.###..##...#...', '<': '...#...##..###.####..###...##....#.',
    '_': '..............................#####', '=': '..........#####.....#####..........',
    '#': '.#.#..#.#.#####.#.#.#####.#.#..#.#.', '%': '##...##..#...#...#...#...#..##...##',
    '\u2191': '..#...###.#.#.#..#....#....#.......', '\u2193': '.......#....#....#..#.#.#.###...#..',
    '\u2190': '.......#...#...#####.#.....#.......', '\u2192': '.......#.....#.#####...#...#.......'
  };
  var glyphs = {};
  var glyph = function (ch, color) {
    var key = ch + (color || 'ink');
    if (glyphs[key]) return glyphs[key];
    var g = F[ch] || F['?'], rows = [];
    for (var r = 0; r < 7; r++) rows.push(g.slice(r * 5, r * 5 + 5).replace(/#/g, color === 'ground' ? 'o' : '#'));
    return (glyphs[key] = sprite(rows));
  };
  var textW = function (s, sc) { s = String(s); return s.length ? (s.length * 6 - 1) * (sc || 1) : 0; };
  var text = function (str, x, y, o) {
    o = o || {};
    var sc = o.scale || 1;
    str = String(str).toUpperCase();
    var w = textW(str, sc);
    if (o.align === 'center') x -= Math.floor(w / 2);
    else if (o.align === 'right') x -= w;
    if (o.bg) { ctx.fillStyle = o.color === 'ground' ? INK : GROUND; ctx.fillRect(x - 2, y - 2, w + 4, 7 * sc + 4); }
    for (var i = 0; i < str.length; i++) {
      if (str[i] !== ' ') draw(ctx, glyph(str[i], o.color), x + i * 6 * sc, y, false, sc);
    }
    return w;
  };
  var box = function (x, y, w, h, inverse) {
    ctx.fillStyle = inverse ? INK : GROUND; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = inverse ? GROUND : INK;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  };

  /* ---- the synth ----------------------------------------------------------------
     The handheld's own palette of sound: two pulse channels (12.5, 25 and
     50% duty), a soft wave channel for bass, and noise from a 15-bit and a
     7-bit shift register (the metallic one). No files. The context can only
     start after a key or a tap, so every input calls audio(). */
  var AC = null, master = null, waves = {}, noiseBuf = {}, muted = false;
  try { muted = localStorage.getItem('tkx-play-mute') === '1'; } catch (e) {}
  var audio = function () {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
      master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  };
  var pulse = function (duty) {
    if (waves[duty]) return waves[duty];
    var n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (var i = 1; i < n; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * duty);
    return (waves[duty] = AC.createPeriodicWave(re, im));
  };
  var lfsr = function (short) {
    if (noiseBuf[short]) return noiseBuf[short];
    var len = AC.sampleRate, b = AC.createBuffer(1, len, AC.sampleRate), ch = b.getChannelData(0);
    var r = 0x7fff, hold = Math.max(1, Math.round(AC.sampleRate / 16000)), v = 1;
    for (var i = 0; i < len; i++) {
      if (i % hold === 0) {
        var bit = (r ^ (r >> 1)) & 1;
        r = (r >> 1) | (bit << 14);
        if (short) r = (r & ~0x40) | (bit << 6);
        v = r & 1 ? -1 : 1;
      }
      ch[i] = v * 0.5;
    }
    return (noiseBuf[short] = b);
  };
  var voice = function (f0, f1, dur, o) {
    o = o || {};
    var t = AC.currentTime + (o.at || 0), g = AC.createGain(), src;
    if (o.noise !== undefined) {
      src = AC.createBufferSource();
      src.buffer = lfsr(o.noise);
      src.loop = true;
      src.playbackRate.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) src.playbackRate.exponentialRampToValueAtTime(f1, t + dur);
    } else {
      src = AC.createOscillator();
      if (o.wave === 'tri') src.type = 'triangle'; else src.setPeriodicWave(pulse(o.duty || 0.5));
      src.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) src.frequency.exponentialRampToValueAtTime(f1, t + dur);
    }
    var vol = o.vol || 0.05;
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur * (o.sustain || 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.03);
  };
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var hz = function (n) {
    var m = /^([A-G])(#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] ? 1 : 0) + (+m[3] + 1) * 12 - 69) / 12);
  };
  var arp = function (list, gap, o) { list.forEach(function (n, i) { var f = hz(n); voice(f, f, gap * 1.1, Object.assign({ at: i * gap }, o)); }); };
  var SFX = {
    shoot: function () { voice(1600, 380, 0.11, { duty: 0.25, vol: 0.035 }); },
    hit: function () { voice(1.6, 0.8, 0.08, { noise: 0, vol: 0.07 }); },
    boom: function () { voice(0.9, 0.12, 0.55, { noise: 0, vol: 0.11, sustain: 0.1 }); voice(140, 40, 0.4, { wave: 'tri', vol: 0.09 }); },
    bonus: function () { arp(['G5', 'B5', 'D6', 'G6', 'B6'], 0.05, { duty: 0.125, vol: 0.035 }); },
    step0: function () { voice(98, 98, 0.08, { wave: 'tri', vol: 0.12 }); },
    step1: function () { voice(87, 87, 0.08, { wave: 'tri', vol: 0.12 }); },
    step2: function () { voice(78, 78, 0.08, { wave: 'tri', vol: 0.12 }); },
    step3: function () { voice(73, 73, 0.08, { wave: 'tri', vol: 0.12 }); },
    blip: function () { voice(523, 523, 0.04, { duty: 0.5, vol: 0.035 }); },
    pad: function () { voice(784, 784, 0.06, { duty: 0.25, vol: 0.04 }); },
    goal: function () { arp(['C5', 'E5', 'G5', 'C6'], 0.07, { duty: 0.25, vol: 0.04 }); },
    miss: function () { voice(392, 98, 0.35, { duty: 0.5, vol: 0.04 }); },
    jump: function () { voice(262, 784, 0.14, { duty: 0.125, vol: 0.035 }); },
    bump: function () { voice(165, 98, 0.09, { duty: 0.5, vol: 0.05 }); },
    plus: function () { voice(988, 988, 0.06, { duty: 0.5, vol: 0.035 }); voice(1319, 1319, 0.16, { duty: 0.5, vol: 0.035, at: 0.06 }); },
    stomp: function () { voice(2.4, 0.6, 0.1, { noise: 1, vol: 0.06 }); voice(330, 110, 0.12, { duty: 0.25, vol: 0.04 }); },
    die: function () { arp(['B5', 'F5', 'F5', 'F5', 'E5', 'D5', 'C5'], 0.11, { duty: 0.5, vol: 0.04 }); },
    win: function () { arp(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6'], 0.09, { duty: 0.25, vol: 0.04 }); },
    start: function () { arp(['C6', 'G6'], 0.08, { duty: 0.5, vol: 0.04 }); },
    select: function () { voice(1047, 1047, 0.03, { duty: 0.125, vol: 0.03 }); },
    type: function () { voice(1319, 1319, 0.03, { duty: 0.25, vol: 0.03 }); },
    err: function () { voice(110, 98, 0.25, { duty: 0.5, vol: 0.05 }); },
    over: function () { arp(['G4', 'E4', 'C4', 'G3'], 0.16, { wave: 'tri', vol: 0.12 }); },
    /* power-on: our own two-note chime, not the console's */
    pling: function () { voice(hz('G6'), hz('G6'), 0.07, { duty: 0.5, vol: 0.04 }); voice(hz('D7'), hz('D7'), 0.7, { duty: 0.5, vol: 0.04, at: 0.07, sustain: 0.2 }); }
  };
  var sfx = function (name) {
    if (muted || !SFX[name] || !AC || AC.state !== 'running') return;
    try { SFX[name](); } catch (e) {}
  };

  /* Music: Land runs to its own little tune (an original — no borrowed
     melodies). Tokens are notes, '-' holds, '.' rests. */
  var SONGS = {
    /* Jump's bright-idea power-up: double time, up an octave — a dash */
    rush: {
      step: 0.085,
      tracks: [
        { duty: 0.125, vol: 0.024, notes: 'C6 E6 G6 C7 G6 E6 C6 E6 D6 F6 A6 D7 A6 F6 D6 F6 E6 G6 B6 E7 B6 G6 E6 G6 F6 A6 C7 F7 C7 A6 G6 B6' },
        { wave: 'tri', vol: 0.07, notes: 'C3 . C3 . G2 . C3 . D3 . D3 . A2 . D3 . E3 . E3 . B2 . E3 . F3 . F3 . G3 . G2 .' },
        { noise: 1, vol: 0.02, notes: 'x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x' }
      ]
    },
    land: {
      step: 0.16,
      tracks: [
        { duty: 0.25, vol: 0.022, notes: 'E5 - G5 - C6 - A5 G5 E5 - D5 - C5 - . . D5 - E5 - F5 - A5 G5 E5 - C5 - D5 - . . E5 - G5 - C6 - D6 C6 A5 - G5 - E5 G5 A5 - G5 - E5 - D5 - C5 - - - . .' },
        { wave: 'tri', vol: 0.07, notes: 'C3 . G2 . C3 . G2 . A2 . E2 . A2 . E2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . B2 . C3 . G2 . C3 . E3 . F2 . C3 . F2 . A2 . G2 . D3 . G2 . G2 .' },
        { noise: 1, vol: 0.018, notes: 'x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x x . x x' }
      ]
    }
  };
  var song = null, songTimer = null, songAt = 0, songI = 0;
  var parseSong = function (s) {
    if (s.parsed) return s;
    s.tracks.forEach(function (t) { t.seq = t.notes.split(/\s+/); });
    s.len = s.tracks.reduce(function (m, t) { return Math.max(m, t.seq.length); }, 0);
    s.parsed = true;
    return s;
  };
  var schedule = function () {
    if (!song || !AC) return;
    while (songAt < AC.currentTime + 0.25) {
      var i = songI % song.len, at = songAt - AC.currentTime;
      song.tracks.forEach(function (t) {
        var n = t.seq[i % t.seq.length];
        if (!n || n === '.' || n === '-') return;
        var hold = 1;
        while (t.seq[(i + hold) % t.seq.length] === '-') hold++;
        var dur = song.step * hold * 0.92;
        if (t.noise !== undefined) voice(2.2, 2.2, 0.04, { noise: t.noise, vol: t.vol, at: at, sustain: 0.1 });
        else { var f = hz(n); voice(f, f, dur, { duty: t.duty, wave: t.wave, vol: t.vol, at: at, sustain: 0.7 }); }
      });
      songAt += song.step; songI++;
    }
  };
  var playSong = function (name) {
    stopSong();
    if (!name || !SONGS[name]) return;
    song = parseSong(SONGS[name]);
    if (muted || !AC || AC.state !== 'running') return;
    songI = 0; songAt = AC.currentTime + 0.05;
    songTimer = setInterval(schedule, 60);
    schedule();
  };
  var stopSong = function () { clearInterval(songTimer); songTimer = null; };
  var setMute = function (m) {
    muted = m;
    try { localStorage.setItem('tkx-play-mute', m ? '1' : '0'); } catch (e) {}
    if (muteBtn) { muteBtn.setAttribute('aria-pressed', m ? 'false' : 'true'); muteBtn.querySelector('span').textContent = m ? 'Sound off' : 'Sound on'; }
    if (m) stopSong(); else if (scene === 'play' && meta.song) playSong(meta.song);
  };
  if (muteBtn) muteBtn.addEventListener('click', function () { audio(); setMute(!muted); });

  /* Full screen, on a desktop (owner, 13 Oct: "have the gameboy grow in size
     as the transition and knock the text and other elements off screen —
     they all fly off with real physics"). It fills the browser window (see
     theatre, above): the handheld grows to that size (FLIP, so it's one
     smooth move) while everything around it is struck in a ripple outward
     from it — each piece thrown away from the device with its own spin,
     then falling under gravity until it's off the screen. Esc, F or the
     button bring them back. Reduced motion: no flight, they simply go.
     Not offered on touch screens (the handheld already fills a phone). */
  var fullBtn = document.querySelector('[data-full]');
  var canFull = !window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var toggleFull = function () {
    if (!canFull) return;
    theatre = !theatre;
    onFull();
  };
  var bodies = [], physics = 0;
  var knock = function (dev) {
    cancelAnimationFrame(physics);
    var cx = dev.left + dev.width / 2, cy = dev.top + dev.height / 2;
    var els = Array.prototype.slice.call(document.querySelectorAll('.play-info > *, .nav-mark, .nav-rail'));
    var far = Math.hypot(window.innerWidth, window.innerHeight);
    bodies = els.map(function (el) {
      var r = el.getBoundingClientRect(), ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      var dx = ex - cx, dy = ey - cy, d = Math.hypot(dx, dy) || 1;
      el.style.willChange = 'transform';
      return { el: el, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, nx: dx / d, ny: dy / d, hit: 90 + d / far * 520, live: false, h: r.height };
    });
    var t0 = performance.now(), last = t0, g = 0.9;
    var step = function (now) {
      var dt = Math.min(2.5, (now - last) / 16.67); last = now;
      var t = now - t0, alive = 0;
      bodies.forEach(function (b) {
        if (!b.live && t >= b.hit) {
          // struck: thrown away from the device, kicked up, set spinning
          var sp = 15 + Math.random() * 9;
          b.vx = b.nx * sp + (Math.random() - 0.5) * 4;
          b.vy = Math.min(b.ny * sp, 0) - 7 - Math.random() * 6;
          b.vr = (b.nx >= 0 ? 1 : -1) * (3 + Math.random() * 7);
          b.live = true;
        }
        if (b.live) {
          b.vy += g * dt; b.vx *= Math.pow(0.995, dt);
          b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
          b.el.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px) rotate(' + b.r.toFixed(1) + 'deg)';
        }
        var r = b.el.getBoundingClientRect();
        if (!b.live || (r.top < window.innerHeight + 40 && r.bottom > -400 && r.right > -400 && r.left < window.innerWidth + 400)) alive++;
      });
      if (alive && t < 3200) physics = requestAnimationFrame(step);
      else root.classList.add('play-knocked');
    };
    physics = requestAnimationFrame(step);
  };
  var restore = function () {
    cancelAnimationFrame(physics);
    root.classList.remove('play-knocked');
    bodies.forEach(function (b, i) {
      b.el.style.transition = 'none';
      b.el.style.transform = reduce ? '' : 'translateY(-28px)';
      b.el.style.opacity = reduce ? '' : '0';
      requestAnimationFrame(function () {
        b.el.style.transition = reduce ? '' : 'transform .7s cubic-bezier(.16,1,.3,1) ' + (i * 0.04) + 's, opacity .5s ease ' + (i * 0.04) + 's';
        b.el.style.transform = ''; b.el.style.opacity = '';
        setTimeout(function () { b.el.style.transition = ''; b.el.style.willChange = ''; }, 1400);
      });
    });
    bodies = [];
  };
  var onFull = function () {
    var f = isFull();
    var first = gb.getBoundingClientRect();
    if (f && !reduce) knock(first);
    root.classList.toggle('play-full', f);
    if (f && reduce) root.classList.add('play-knocked');
    if (!f) restore();
    fit();
    if (fullBtn) fullBtn.querySelector('span').textContent = f ? 'Leave full screen' : 'Full screen';
    if (reduce) return;
    // the handheld moves from where it was to where it now is, in one go
    var last = gb.getBoundingClientRect();
    gb.style.transition = 'none';
    gb.style.transformOrigin = '0 0';
    gb.style.transform = 'translate(' + (first.left - last.left) + 'px,' + (first.top - last.top) + 'px) scale(' + (first.width / last.width) + ')';
    void gb.offsetWidth;
    gb.style.transition = 'transform ' + (f ? '1.05s cubic-bezier(.34,1.32,.5,1)' : '.8s cubic-bezier(.16,1,.3,1)');
    gb.style.transform = 'none';
    setTimeout(function () { gb.style.transition = ''; gb.style.transform = ''; gb.style.transformOrigin = ''; }, 1150);
  };
  if (fullBtn && canFull) { fullBtn.hidden = false; fullBtn.addEventListener('click', function () { audio(); toggleFull(); }); }

  /* ---- input --------------------------------------------------------------------
     Keyboard on a desktop, the handheld's own buttons on a phone. Pressing a
     key presses the matching button on the device too, so the two always
     agree about what you're doing. */
  var keys = { left: 0, right: 0, up: 0, down: 0, a: 0, b: 0, start: 0, select: 0 };
  var prev = {};
  for (var k0 in keys) prev[k0] = 0;
  var MAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'a', KeyZ: 'a', KeyK: 'a', KeyX: 'b', KeyJ: 'b', ShiftLeft: 'b', ShiftRight: 'b', Enter: 'start', KeyP: 'start'
  };
  var hit = function (k) { return !!keys[k] && !prev[k]; };
  var anyHit = function () { for (var k in keys) if (hit(k)) return true; return false; };
  var pointerY = null;

  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    // the side panel's own buttons keep Enter and Space
    if (e.target && e.target.tagName === 'BUTTON' && !e.target.closest('[data-gb]') && (e.code === 'Space' || e.code === 'Enter')) return;
    audio();
    if (scene === 'entry') {
      if (e.key === 'Backspace') { e.preventDefault(); entryDel(); return; }
      if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) { e.preventDefault(); if (!e.repeat) entryType(e.key.toUpperCase()); return; }
    }
    if (e.code === 'KeyM') { setMute(!muted); return; }
    if (e.code === 'KeyF') { toggleFull(); return; }
    if (e.code === 'Escape' && theatre) { e.preventDefault(); toggleFull(); return; }
    var k = MAP[e.code] || (e.code === 'Escape' && (scene === 'play' || scene === 'pause') ? 'start' : null);
    if (!k) return;
    e.preventDefault();   // the arrows and space play the game, not the page
    keys[k] = 1;
  });
  window.addEventListener('keyup', function (e) {
    // a shortcut (cmd-shift-4 for a screenshot) can swallow a key's release
    // — Shift is B — so letting go of cmd lets go of everything
    if (e.key === 'Meta' || e.key === 'Control') { for (var j in keys) keys[j] = 0; return; }
    var k = MAP[e.code] || (e.code === 'Escape' ? 'start' : null);
    if (k) keys[k] = 0;
  });
  window.addEventListener('blur', function () { for (var k in keys) keys[k] = 0; });

  /* SELECT, as the console used it: on the title screen it changes the game
     (Jump, Space, Pong in turn); anywhere else it switches the sound */
  /* SELECT opens the console's menu (owner, 13 Oct: "on a phone … maybe the
     select button pulls up a little menu?"): the three games, the sound,
     close. It pauses whatever was running and puts it back as it was. */
  var MENU = IDS.concat(['sound', 'close']);
  var menu = { from: null, at: 0 };
  var openMenu = function () {
    if (!game || scene === 'entry' || scene === 'off' || scene === 'menu') return;
    menu.from = scene; menu.at = IDS.indexOf(id);
    if (scene === 'play') stopSong();
    scene = 'menu'; sfx('select');
    say('Menu. Jump, Space, Pong, sound, close. Use up and down, then A.');
  };
  var closeMenu = function () {
    scene = menu.from || 'title';
    if (scene === 'play' && meta.song) playSong(meta.song);
    sfx('select');
  };
  var selectBtn = function () {
    if (scene === 'menu') closeMenu(); else openMenu();
  };
  /* a buzz only once a finger has touched the device: on a desktop the
     browser refuses vibrate() without a tap, and says so in the console */
  var touched = false;
  window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') touched = true; }, { capture: true, passive: true });
  var buzz = function () { if (touched && navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} };
  Array.prototype.forEach.call(gb.querySelectorAll('[data-btn]'), function (b) {
    var k = b.getAttribute('data-btn');
    if (b.closest('[data-dpad]')) return;
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); audio(); buzz();
      if (k === 'select') { selectBtn(); return; }
      keys[k] = 1;
      try { b.setPointerCapture(e.pointerId); } catch (x) {}
    });
    var up = function () { if (k !== 'select') keys[k] = 0; };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    // keyboard activation of a device button (Tab to it, Enter): one tap
    b.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      if (k === 'select') { selectBtn(); return; }
      keys[k] = 1; setTimeout(function () { keys[k] = 0; }, 90);
    });
  });
  /* The D-pad is one surface, read by where the thumb is from its centre,
     so a thumb can roll from left to up-left to up without lifting. */
  var dpad = gb.querySelector('[data-dpad]');
  var dpadOn = false;
  var dpadSet = function (e) {
    var r = dpad.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), dead = r.width * 0.1;
    var ax = Math.abs(dx), ay = Math.abs(dy);
    keys.left = dx < -dead && ax > ay * 0.45 ? 1 : 0;
    keys.right = dx > dead && ax > ay * 0.45 ? 1 : 0;
    keys.up = dy < -dead && ay > ax * 0.45 ? 1 : 0;
    keys.down = dy > dead && ay > ax * 0.45 ? 1 : 0;
  };
  dpad.addEventListener('pointerdown', function (e) { e.preventDefault(); audio(); buzz(); dpadOn = true; try { dpad.setPointerCapture(e.pointerId); } catch (x) {} dpadSet(e); });
  dpad.addEventListener('pointermove', function (e) { if (dpadOn) dpadSet(e); });
  var dpadOff = function () { dpadOn = false; keys.left = keys.right = keys.up = keys.down = 0; };
  dpad.addEventListener('pointerup', dpadOff);
  dpad.addEventListener('pointercancel', dpadOff);
  dpad.addEventListener('lostpointercapture', dpadOff);
  Array.prototype.forEach.call(dpad.querySelectorAll('[data-btn]'), function (b) {
    b.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      var k = b.getAttribute('data-btn');
      keys[k] = 1; setTimeout(function () { keys[k] = 0; }, 90);
    });
  });
  gb.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Pong's paddle follows a pointer over the screen
  var track = function (e) {
    var r = view.getBoundingClientRect();
    if (e.clientX < r.left - 30 || e.clientX > r.right + 30 || e.clientY < r.top - 30 || e.clientY > r.bottom + 30) { pointerY = null; return; }
    pointerY = (e.clientY - r.top) / r.height * H;
  };
  view.addEventListener('pointermove', track);
  view.addEventListener('pointerdown', function (e) { audio(); track(e); });
  view.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') pointerY = null; });
  // a lifted finger is no longer pointing anywhere (a mouse at rest still is)
  view.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') pointerY = null; });
  view.addEventListener('pointercancel', function () { pointerY = null; });
  /* the dot cursor is the Pong ball's double, and over a game in play it
     is only in the way — it steps back */
  view.addEventListener('pointerenter', function () { root.classList.add('play-over-screen'); });
  view.addEventListener('pointerleave', function () { root.classList.remove('play-over-screen'); });

  var btnEls = {};
  Array.prototype.forEach.call(gb.querySelectorAll('[data-btn]'), function (b) { btnEls[b.getAttribute('data-btn')] = b; });
  var syncButtons = function () {
    for (var k in btnEls) btnEls[k].classList.toggle('is-down', !!keys[k]);
    var dir = (keys.up ? 'u' : '') + (keys.down ? 'd' : '') + (keys.left ? 'l' : '') + (keys.right ? 'r' : '');
    if (dpad.getAttribute('data-dir') !== dir) dpad.setAttribute('data-dir', dir);
    root.classList.toggle('play-nocursor', scene === 'play');
  };

  /* ---- leaderboard --------------------------------------------------------------
     Shared when js/play-config.js names a Supabase project (url + anon
     key; table `scores` — js/games/README.md has the SQL and the
     moderation steps). Without one, scores live on this device and the
     panel says so rather than implying a public board. */
  var remote = cfg.board && cfg.board.url && cfg.board.key ? cfg.board : null;
  var LIMIT = 10;
  var order = function (a, b) { return asc ? a.score - b.score : b.score - a.score; };
  var localGet = function () { try { return JSON.parse(localStorage.getItem('tkx-play-board-' + id) || '[]'); } catch (e) { return []; } };
  var localPut = function (l) { try { localStorage.setItem('tkx-play-board-' + id, JSON.stringify(l)); } catch (e) {} };
  var rest = function (q, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ apikey: remote.key, Authorization: 'Bearer ' + remote.key }, opts.headers || {});
    return fetch(remote.url.replace(/\/$/, '') + '/rest/v1/' + (remote.table || 'scores') + q, opts);
  };
  var Board = {
    top: function () {
      if (!remote) return Promise.resolve(localGet().sort(order).slice(0, LIMIT));
      return rest('?select=name,score,created_at&game=eq.' + id + '&order=score.' + (asc ? 'asc' : 'desc') + ',created_at.asc&limit=' + LIMIT)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return localGet().sort(order).slice(0, LIMIT); });
    },
    add: function (name, score) {
      var entry = { name: name, score: Math.round(score), created_at: new Date().toISOString() };
      var keep = function () { localPut(localGet().concat([entry]).sort(order).slice(0, LIMIT)); };
      if (!remote) { keep(); return Promise.resolve(entry); }
      return rest('', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ game: id, name: name, score: entry.score }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return entry; })
        .catch(function () { keep(); return entry; });
    },
    qualifies: function (list, score) {
      if (!(score > 0)) return false;
      if (list.length < LIMIT) return true;
      var worst = list[list.length - 1].score;
      return asc ? score < worst : score > worst;
    }
  };
  var best = [], mine = null;
  var fmtScore = function (v) { return asc ? fmtTime(v) : pad(v, 6); };
  var showBoard = function () {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    if (!best.length) {
      var li = document.createElement('li');
      li.className = 'board-empty';
      li.textContent = asc ? 'No times yet. Be the first.' : 'No scores yet. Be the first.';
      boardEl.appendChild(li);
      return;
    }
    best.forEach(function (e, i) {
      var li = document.createElement('li');
      if (mine && e.name === mine.name && e.score === mine.score) li.className = 'is-you';
      [['board-r', pad(i + 1, 2)], ['board-n', e.name], ['board-s', fmtScore(e.score)]].forEach(function (c) {
        var s = document.createElement('span'); s.className = c[0]; s.textContent = c[1]; li.appendChild(s);
      });
      boardEl.appendChild(li);
    });
  };
  var refresh = function () { return Board.top().then(function (l) { best = l; showBoard(); return l; }); };
  if (boardNote) boardNote.textContent = remote ? 'Shared with everyone who plays. Keep names friendly.' : 'Kept on this device.';

  /* Rude words. Normalised for l33t and spacing, and a letter stretched to
     three or more ("fuuuck") is taken back to one — never an ordinary double
     letter: squashing every double once took a list entry down to a single
     "k" and refused LUKEVID, DICKENS and PEACOCK (owner, 13 Oct). Strong
     words match anywhere in a name; short ones that hide inside ordinary
     words only as a whole word; and a few real words that happen to contain
     a strong one (Scunthorpe, Penistone, Hancock) are lifted out first.
     ROT13 only so the file doesn't read as a list of obscenities. Nothing
     catches everything — the owner edits the board for what does. */
  var rot = function (s) { return s.replace(/[a-z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97); }); };
  var ANY = 'shpx,shx,spx,sphx,cuhpx,fuvg,fuvgr,phag,xhag,avttre,avttn,avtn,avtt,snttbg,sntbg,jnax,gjng,obyybpx,oryyraq,cvff,fyhg,juber,ovgpu,onfgneq,ergneq,fcnfgvp,encvfg,uvgyre,cbea,cravf,intvan,chffl,nffubyr,nefrubyr,qvyqb,wvmm,fchax,zvatr,gbffre,abapr,cnrqb,crqbcuvyr,cnrqbcuvyr,puvax,jrgonpx,genaal,yrfob,xvyylbhefrys,xlf,anmvf,ubeal,zvys,obare,oybjwbo,unaqwbo,phzfubg'.split(',').map(rot);
  var WORD = 'nff,nefr,nefrf,nffrf,gvg,gvgf,gvggl,phz,pbpx,pbpxf,qvpx,qvpxf,encr,encrq,encvat,anmv,snt,sntf,nany,nahf,frk,frkl,funt,fynt,xabo,cevpx,pyvg,penc,cbb,cbbc,sneg,ohz,gheq,zhss,pbba,cnxv,fcvp,tbbx,xvxr,ubzb,qlxr,crqb,ahqr,anxrq,obbo,obbof,jgs,fgsh,gubg,ohttre,oybbql,qnza,uryy,cvff,cvffrq,abo,gvg,fcnm,chor,chorf,xxx'.split(',').map(rot);
  var SAFE = 'fphagubecr,cravfgbar,unapbpx,crnpbpx,onopbpx,uvgpupbpx,pbpxohea,pbpxrery,pbpxgnvy,qvpxraf,qvpxfba,qvpxvafba,nffrff,nffrffbe,onffvfg,pynffvp,fhffrk,rffrk,jrffrk,fuvvgnxr,nefrany,gurencvfg,phzoevn,phzoevna,tencrf,fpencr,frkgnag,nanylfg,gvgna,gvgnavp'.split(',').map(rot);
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g' };
  var stretch = function (s) { return s.replace(/(.)\1{2,}/g, '$1'); };
  var rude = function (name) {
    var n = name.toLowerCase().replace(/[01345789]/g, function (c) { return LEET[c]; });
    // each name is checked as typed and with stretched letters taken back
    var raw = n.split(/[^a-z]+/).filter(Boolean).filter(function (t) { return SAFE.indexOf(t) < 0 && SAFE.indexOf(stretch(t)) < 0; });
    var cands = raw.concat(raw.map(stretch), [raw.join(''), raw.map(stretch).join('')]);
    if (ANY.some(function (w) { return cands.some(function (c) { return c.indexOf(w) > -1; }); })) return true;
    return WORD.some(function (w) { return cands.indexOf(w) > -1; });
  };
  var cleanName = function (s) { return s.toUpperCase().replace(/[^A-Z0-9 ]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 10); };

  /* ---- scenes ---------------------------------------------------------------------- */
  var scene = 'off', t = 0, game = null, result = 0, qualifies = false, hudVals = {}, ready = false, bootLogo = null, cardLogo = null;
  var go = function (s) { scene = s; t = 0; };
  var say = function (msg) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); } };
  var blink = function (rate) { return reduce || Math.floor(t / (rate || 30)) % 2 === 0; };

  var startPressed = function () {
    sfx('start');
    if (game.select) { go('select'); say('Choose your founder with the arrow keys, then press Space.'); }
    else begin();
  };
  var begin = function () {
    game.reset();
    hudVals = {};
    go('play');
    say(meta.name + '. Go.');
    if (meta.song) playSong(meta.song);
  };
  var restart = function () { reink(); begin(); };

  // the founder select (Land)
  var pickAt = 0;
  // the name grid
  var GRID = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ0123', '456789'];
  var cells = [];
  GRID.forEach(function (row, r) { for (var c = 0; c < row.length; c++) cells.push({ r: r, x: 17 + c * 14, y: 52 + r * 12, w: 11, v: row[c], l: row[c] }); });
  [['SP', ' '], ['DEL', 'DEL'], ['END', 'END']].forEach(function (b, i) { cells.push({ r: 4, x: 17 + i * 46, y: 104, w: 34, v: b[1], l: b[0] }); });
  var entry = { name: '', at: 0, msg: '', msgT: 0, busy: false };
  var cellMove = function (dx, dy) {
    var c = cells[entry.at];
    if (dx) {
      var row = cells.filter(function (x) { return x.r === c.r; });
      var i = row.indexOf(c);
      entry.at = cells.indexOf(row[(i + dx + row.length) % row.length]);
    } else {
      var r = (c.r + dy + 5) % 5, cx = c.x + c.w / 2, bestD = 1e9;
      cells.forEach(function (x, i) { if (x.r === r) { var d = Math.abs(x.x + x.w / 2 - cx); if (d < bestD) { bestD = d; entry.at = i; } } });
    }
    sfx('select');
  };
  var entryType = function (ch) {
    if (scene !== 'entry' || entry.busy) return;
    if (entry.name.length >= 10) { sfx('err'); return; }
    entry.name += ch; entry.msg = ''; sfx('type');
  };
  var entryDel = function () {
    if (scene !== 'entry' || entry.busy) return;
    entry.name = entry.name.slice(0, -1); sfx('select');
  };
  var entryEnd = function () {
    if (entry.busy) return;
    var name = cleanName(entry.name);
    if (!name) { entry.msg = 'TYPE A NAME'; entry.msgT = 0; sfx('err'); return; }
    if (rude(name)) { entry.msg = 'KEEP IT FRIENDLY!'; entry.msgT = 0; entry.name = ''; sfx('err'); say('Let’s keep it friendly. Try another name.'); return; }
    entry.busy = true;
    try { localStorage.setItem('tkx-play-name', name); } catch (e) {}
    Board.add(name, result).then(function (e) {
      mine = e;
      return refresh();
    }).then(function () {
      entry.busy = false;
      var rank = best.indexOf(best.filter(function (x) { return x.name === mine.name && x.score === mine.score; })[0]) + 1;
      sfx('win');
      go('board');
      say('Saved' + (rank ? ', number ' + rank : '') + '. Press Enter to play again.');
    });
  };

  var afterOver = function () {
    if (qualifies) {
      var remembered = '';
      try { remembered = localStorage.getItem('tkx-play-name') || ''; } catch (e) {}
      entry.name = cleanName(remembered); entry.at = cells.length - 1; entry.msg = ''; entry.busy = false;
      go('entry');
      say((asc ? 'A top ten time. ' : 'A high score. ') + 'Type your name and press Enter.');
    } else { go('board'); say('Press Enter to play again.'); }
  };
  var ended = function (value, won) {
    if (scene !== 'play') return;
    stopSong();
    result = value; mine = null;
    sfx(won ? 'win' : 'over');
    go('over');
    say((won ? 'You made it in ' + fmtTime(value) : 'Game over. Score ' + value) + '.');
    refresh().then(function (l) { qualifies = Board.qualifies(l, value); });
  };

  var step = function () {
    t++;
    switch (scene) {
      case 'boot':
        if (t === (reduce ? 10 : 84)) sfx('pling');
        if (ready && (t > (reduce ? 70 : 150) || (t > 20 && anyHit()))) { go('title'); say(meta.name + '. Press Enter to start.'); }
        break;
      case 'title':
        if (game.attract && !reduce) game.attract();
        if (t > 8 && (hit('start') || hit('a'))) startPressed();
        break;
      case 'select':
        if (hit('left') || hit('right')) { pickAt = (pickAt + 1) % game.select.length; sfx('select'); }
        if (t > 8 && (hit('a') || hit('start'))) { sfx('start'); game.choose(game.select[pickAt].id); begin(); }
        break;
      case 'play':
        if (hit('start')) { go('pause'); stopSong(); say('Paused. Press Enter to carry on.'); break; }
        game.update();
        break;
      case 'pause':
        if (t > 4 && (hit('start') || hit('a'))) { scene = 'play'; if (meta.song) playSong(meta.song); }
        break;
      case 'over':
        if ((t > 50 && (hit('start') || hit('a'))) || t > 170) afterOver();
        break;
      case 'entry':
        entry.msgT++;
        if (hit('left')) cellMove(-1, 0);
        if (hit('right')) cellMove(1, 0);
        if (hit('up')) cellMove(0, -1);
        if (hit('down')) cellMove(0, 1);
        if (hit('b')) entryDel();
        if (hit('start')) entryEnd();
        if (hit('a')) {
          var c = cells[entry.at];
          if (c.v === 'DEL') entryDel(); else if (c.v === 'END') entryEnd(); else entryType(c.v);
        }
        break;
      case 'board':
        if (t > 20 && (hit('start') || hit('a'))) restart();
        break;
      case 'menu':
        if (hit('up')) { menu.at = (menu.at + MENU.length - 1) % MENU.length; sfx('select'); }
        if (hit('down')) { menu.at = (menu.at + 1) % MENU.length; sfx('select'); }
        if (hit('b')) { closeMenu(); break; }
        if (hit('a') || hit('start')) {
          var m = MENU[menu.at];
          if (m === 'sound') setMute(!muted);
          else if (m === 'close' || m === id) closeMenu();
          else { sfx('start'); pick(m); }
        }
        break;
    }
    for (var k in keys) prev[k] = keys[k];
  };

  /* ---- drawing the scenes --------------------------------------------------------------- */
  var drawHud = function () {
    var v = meta.hud(hudVals);
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, TOP - 1);
    text(v[0], 2, 1); text(v[1], W / 2, 1, { align: 'center' }); text(v[2], W - 2, 1, { align: 'right' });
  };
  var drawBoot = function () {
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    if (!bootLogo) return;
    var end = 58, y = reduce ? end : Math.min(end, -bootLogo.h + (end + bootLogo.h) * (1 - Math.pow(1 - Math.min(1, t / 80), 3)));
    ctx.drawImage(maskCanvas(bootLogo), Math.round((W - bootLogo.w) / 2), Math.round(y));
    if (t > (reduce ? 10 : 84)) text('ARCADE', W / 2, 84, { align: 'center' });
  };
  var drawTitle = function () {
    box(16, 34, 128, 82);
    if (cardLogo) ctx.drawImage(maskCanvas(cardLogo), Math.round((W - cardLogo.w) / 2), 42);
    text(meta.word, W / 2, 62, { align: 'center', scale: 2 });
    var top = best[0];
    text(top ? 'TOP ' + fmtScore(top.score) : 'NO. ' + meta.num + ' OF 03', W / 2, 84, { align: 'center' });
    if (blink()) text('PUSH START', W / 2, 100, { align: 'center' });
    ctx.fillStyle = GROUND; ctx.fillRect(0, H - 10, W, 10);
    text(Math.floor(t / 150) % 2 ? 'SELECT: MENU' : '(C) 2026 TEKEX', W / 2, H - 8, { align: 'center' });
  };
  var drawSelect = function () {
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    text('CHOOSE YOUR', W / 2, 5, { align: 'center' });
    text('FOUNDER', W / 2, 15, { align: 'center', scale: 2 });
    // laid out from the sprites' own height, so a bigger founder still fits
    var sh = game.select.reduce(function (m, p) { return Math.max(m, p.sprite.h); }, 16);
    var sc = sh * 3 > 72 ? 2 : 3, top = 34 + Math.max(0, Math.floor((72 - sh * sc) / 2));
    var nameY = top + sh * sc + 6;
    game.select.forEach(function (p, i) {
      var cx = i ? 116 : 44, on = i === pickAt;
      var frames = p.frames || [p.sprite];
      var f = on && !reduce ? frames[Math.floor(t / 8) % frames.length] : p.sprite;
      draw(ctx, f, Math.round(cx - f.w * sc / 2), top + (sh - f.h) * sc, false, sc);
      text(p.name, cx, nameY, { align: 'center', color: on ? 'ground' : 'ink', bg: on });
      text(p.role, cx, nameY + 12, { align: 'center' });
    });
    if (blink()) text('PUSH A', W / 2, H - 10, { align: 'center' });
  };
  var drawPause = function () {
    box(36, 52, 88, 40);
    text('PAUSE', W / 2, 60, { align: 'center', scale: 2 });
    if (blink()) text('START', W / 2, 80, { align: 'center' });
  };
  var drawOver = function () {
    box(14, 46, 132, 52);
    text(asc ? 'FINISH!' : 'GAME OVER', W / 2, 54, { align: 'center', scale: 2 });
    text((asc ? 'TIME ' : 'SCORE ') + fmtScore(result), W / 2, 78, { align: 'center' });
  };
  var drawEntry = function () {
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    text(asc ? 'NEW BEST TIME!' : 'NEW HIGH SCORE!', W / 2, 6, { align: 'center' });
    text(fmtScore(result), W / 2, 18, { align: 'center' });
    // ten slots, the next one blinking
    for (var i = 0; i < 10; i++) {
      var x = 20 + i * 12, ch = entry.name[i];
      if (ch && ch !== ' ') text(ch, x, 32);
      ctx.fillStyle = INK;
      if (i !== entry.name.length || blink(15)) ctx.fillRect(x, 41, 5, 1);
    }
    cells.forEach(function (c, i) {
      var on = i === entry.at;
      if (on) { ctx.fillStyle = INK; ctx.fillRect(c.x - 3, c.y - 2, c.w + 6, 11); }
      text(c.l, c.x + Math.round(c.w / 2), c.y, { align: 'center', color: on ? 'ground' : 'ink' });
    });
    if (entry.busy) text('SAVING…'.replace('…', '...'), W / 2, 122, { align: 'center' });
    else if (entry.msg && (entry.msgT < 90 ? blink(8) : true)) text(entry.msg, W / 2, 122, { align: 'center' });
    else text('A TYPE  B DEL  START OK', W / 2, 122, { align: 'center' });
    ctx.fillStyle = INK; ctx.fillRect(0, 133, W, 1);
    text(remote ? 'SHARED BOARD' : 'THIS DEVICE', W / 2, 136, { align: 'center' });
  };
  var drawBoard = function () {
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    text(asc ? 'FASTEST TIMES' : 'HIGH SCORES', W / 2, 5, { align: 'center' });
    ctx.fillStyle = INK; ctx.fillRect(10, 15, W - 20, 1);
    if (!best.length) text('NO SCORES YET', W / 2, 60, { align: 'center' });
    best.forEach(function (e, i) {
      var y = 21 + i * 10, you = mine && e.name === mine.name && e.score === mine.score;
      if (you) { ctx.fillStyle = INK; ctx.fillRect(4, y - 2, W - 8, 10); }
      var c = you ? 'ground' : 'ink';
      if (you && !blink(20)) return;
      text(pad(i + 1, 2), 8, y, { color: c });
      text(e.name, 26, y, { color: c });
      text(fmtScore(e.score), W - 8, y, { align: 'right', color: c });
    });
    ctx.fillStyle = GROUND; ctx.fillRect(0, H - 12, W, 12);
    if (blink()) text('PUSH START', W / 2, H - 9, { align: 'center' });
  };

  /* The dot matrix. The console paints the 160x144 buffer onto the display
     itself, straight into device pixels at whatever scale fits: each game
     pixel's edges are computed (round(i * scale)), its ink drawn in runs, and
     a one-device-pixel ground gap laid on the same edges — so every lit pixel
     reads as a dot, the LCD's own texture, in the pair's two colours only.
     Scaling by drawImage was tried: whole-number scales wasted up to a
     quarter of the window on 1.5x and 1.6x displays (owner, 13 Oct: "the
     gameboy could fill the screen more"), and any fractional resample either
     blurred or dropped rows of the grid. The gap is skipped below three
     device pixels a dot, where it would eat the picture. */
  var xs = [], ys = [], shakeT = 0, flashT = 0, inkRGB = [0, 0, 0], gndRGB = [255, 255, 255], rgbGen = -1;
  /* Grain (owner, 13 Oct: "so it feels authentic" — then "way too strong,
     more subtle"): single device-pixel specks, far finer than a game pixel
     so they read as the glass rather than the game, at 0.35% (it was 1.1%
     of CSS-pixel specks). Ink specks show on the ground, ground specks on
     the ink — still only the pair's two colours. Three tiles dealt at random
     offsets twenty times a second; reduced motion holds one still. */
  var grain = null, grainGen = -1, grainT = 0, grainAt = [0, 0, 0];
  var makeGrain = function () {
    var dot = 1, size = 128;
    grain = [0, 1, 2].map(function () {
      var c = document.createElement('canvas'); c.width = c.height = size;
      var g = c.getContext('2d'), n = Math.round((size / dot) * (size / dot) * 0.0035);
      for (var i = 0; i < n; i++) {
        g.fillStyle = i % 2 ? INK : GROUND;
        g.fillRect(Math.floor(Math.random() * size / dot) * dot, Math.floor(Math.random() * size / dot) * dot, dot, dot);
      }
      return vctx.createPattern(c, 'repeat');
    });
    grainGen = inkGen;
  };
  var edges = function () {
    var cw = view.width / W, ch = view.height / H, i;
    xs.length = 0; ys.length = 0;
    for (i = 0; i <= W; i++) xs.push(Math.round(i * cw));
    for (i = 0; i <= H; i++) ys.push(Math.round(i * ch));
  };
  var present = function () {
    if (rgbGen !== inkGen) { inkRGB = hexRgb(INK); gndRGB = hexRgb(GROUND); rgbGen = inkGen; }
    var px = ctx.getImageData(0, 0, W, H).data;
    var ox = 0, oy = 0;
    if (shakeT > 0) { ox = Math.round(Math.random() * 2 - 1); oy = Math.round(Math.random() * 2 - 1); shakeT--; }
    var vw = view.width, vh = view.height;
    vctx.fillStyle = GROUND; vctx.fillRect(0, 0, vw, vh);
    vctx.fillStyle = INK;
    // a pixel is ink if it is nearer the ink than the ground (covers any
    // anti-aliased edge a game lets slip through)
    var ir = inkRGB[0], ig = inkRGB[1], ib = inkRGB[2], gr = gndRGB[0], gg = gndRGB[1], gb2 = gndRGB[2];
    for (var y = 0; y < H; y++) {
      var Y = y + oy; if (Y < 0 || Y >= H) continue;
      var y0 = ys[Y], hh = ys[Y + 1] - y0, run = -1;
      for (var x = 0; x <= W; x++) {
        var on = false;
        if (x < W) {
          var k = (y * W + x) * 4, r = px[k], g = px[k + 1], b = px[k + 2];
          on = (r - ir) * (r - ir) + (g - ig) * (g - ig) + (b - ib) * (b - ib) < (r - gr) * (r - gr) + (g - gg) * (g - gg) + (b - gb2) * (b - gb2);
        }
        if (on && run < 0) run = x;
        else if (!on && run >= 0) {
          var X0 = Math.min(W, Math.max(0, run + ox)), X1 = Math.min(W, Math.max(0, x + ox));
          if (X1 > X0) vctx.fillRect(xs[X0], y0, xs[X1] - xs[X0], hh);
          run = -1;
        }
      }
    }
    if (vw / W >= 3) {
      vctx.fillStyle = GROUND;
      for (var i = 1; i < W; i++) vctx.fillRect(xs[i] - 1, 0, 1, vh);
      for (var j = 1; j < H; j++) vctx.fillRect(0, ys[j] - 1, vw, 1);
    }
    if (grainGen !== inkGen || !grain) makeGrain();
    if (!reduce && (grainT++ % 3 === 0)) grainAt = [Math.floor(Math.random() * 3), Math.floor(Math.random() * 128), Math.floor(Math.random() * 128)];
    var gp = grain[grainAt[0]];
    if (gp.setTransform && window.DOMMatrix) gp.setTransform(new DOMMatrix([1, 0, 0, 1, grainAt[1], grainAt[2]]));
    vctx.fillStyle = gp; vctx.fillRect(0, 0, vw, vh);
    if (flashT > 0) { vctx.fillStyle = INK; vctx.globalAlpha = 0.8; vctx.fillRect(0, 0, vw, vh); vctx.globalAlpha = 1; flashT--; }
  };
  // what the menu sits over: the scene it was opened from, frozen
  var drawUnder = function (sc) {
    if (sc === 'title') { game.render(ctx); drawTitle(); }
    else if (sc === 'select') drawSelect();
    else if (sc === 'board') drawBoard();
    else if (sc === 'boot') drawBoot();
    else { game.render(ctx); drawHud(); }
  };
  var NAMES = { land: 'JUMP', invaders: 'SPACE', pong: 'PONG' };
  var drawMenu = function () {
    var x = 30, y = 24, w = 100, h = 98;
    box(x, y, w, h);
    ctx.fillStyle = INK; ctx.fillRect(x, y, w, 12);
    text('MENU', x + w / 2, y + 3, { align: 'center', color: 'ground' });
    MENU.forEach(function (m, i) {
      var ry = y + 18 + i * 12 + (i >= IDS.length ? 6 : 0), on = i === menu.at;
      var label = m === 'sound' ? (muted ? 'SOUND OFF' : 'SOUND ON') : m === 'close' ? 'CLOSE' : NAMES[m];
      if (on) { ctx.fillStyle = INK; ctx.fillRect(x + 6, ry - 2, w - 12, 11); }
      text(label, x + 18, ry, { color: on ? 'ground' : 'ink' });
      if (on) text('>', x + 9, ry, { color: 'ground' });
      if (m === id) text('\u2022', x + w - 14, ry, { color: on ? 'ground' : 'ink' });
    });
    ctx.fillStyle = INK; ctx.fillRect(x + 6, y + 18 + IDS.length * 12 + 1, w - 12, 1);
  };
  var render = function () {
    switch (scene) {
      case 'off': ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H); break;
      case 'boot': drawBoot(); break;
      case 'title': game.render(ctx); drawTitle(); break;
      case 'select': drawSelect(); break;
      case 'play': game.render(ctx); drawHud(); break;
      case 'pause': game.render(ctx); drawHud(); drawPause(); break;
      case 'over': game.render(ctx); drawHud(); drawOver(); break;
      case 'entry': drawEntry(); break;
      case 'board': drawBoard(); break;
      case 'menu': drawUnder(menu.from); drawMenu(); break;
    }
    present();
  };

  /* ---- fitting the handheld to the window -------------------------------------------
     --lw is the screen's width; the whole device is drawn in multiples of
     it (css/play.css). A desktop gets the classic proportions and lets the
     controls run below the fold — the device held up from below; a phone
     gets a slimmer bezel so the screen can be 2x and the whole device,
     buttons and all, fits the window. 1x displays keep whole pixels only. */
  var touch = window.matchMedia('(hover: none) and (pointer: coarse)');
  /* "Full screen" fills the browser window, not the display (owner, 13 Oct:
     "within that browser panel, not forced to actual full screen mode") —
     an in-page mode, so no browser takeover bar and no gesture rules. */
  var theatre = false;
  var isFull = function () { return theatre; };
  var fit = function () {
    var full = isFull();
    var compact = !full && window.innerWidth < 760;
    gb.classList.toggle('is-compact', compact);
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    var cs = getComputedStyle(stage.querySelector('.play-stage')), one = window.innerWidth < 900;
    // the stage's own padding, so the device lands inside the window exactly
    var used = full ? 64 : parseFloat(cs.paddingTop) + (one ? 8 : parseFloat(cs.paddingBottom) + 4);
    var col = full ? window.innerWidth : stage.querySelector('.play-device').clientWidth;
    var vh = window.innerHeight, s;
    /* The whole handheld fits the window (owner, 13 Oct: no cropping) — 2.13
       screen-widths tall, 1.9 with the phone's slimmer bezel. Full screen
       drops the buttons (the keyboard plays), leaving 1.46 of screen, bezel
       and wordmark, so the screen gets every pixel the display has. */
    var tall = full ? 1.46 : compact ? 1.9 : 2.14;
    s = Math.min(compact ? Math.min(col, 480) / 1.16 : col / 1.44, (vh - used) / tall) / W;
    s = Math.max(1.2, s);
    var lw = Math.round(W * s);
    gb.style.setProperty('--lw', lw + 'px');
    var bw = Math.round(W * s * dpr), bh = Math.round(H * s * dpr);
    if (view.width !== bw || view.height !== bh) { view.width = bw; view.height = bh; edges(); }
    view.style.width = (W * s) + 'px';
    view.style.height = (H * s) + 'px';
  };
  window.addEventListener('resize', fit);

  /* ---- the loop -------------------------------------------------------------------------
     Fixed 60Hz steps, drawn every frame. Shake and flash are the only
     effects on top; reduced motion takes both away (and the rise, the logo's
     drop and every blink). The game itself is the player's own doing. */
  var acc = 0, lastT = 0;
  var loop = function (now) {
    requestAnimationFrame(loop);
    var dt = lastT ? Math.min(250, now - lastT) : STEP;
    lastT = now;
    acc += dt;
    var n = 0;
    while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    if (scene !== 'off' && (scene === 'boot' || game)) render(); else { ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H); present(); }
    syncButtons();
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden && scene === 'play') { go('pause'); stopSong(); } });

  var api = {
    W: W, H: H, TOP: TOP, reduce: reduce,
    ink: function () { return INK; }, ground: function () { return GROUND; },
    key: function (k) { return !!keys[k]; },
    hit: hit,
    pointerY: function () { return pointerY; },
    sfx: sfx, sprite: sprite, draw: draw, text: text, textW: textW, box: box,
    maskCanvas: maskCanvas, raster: raster, load: load, logo: logo,
    hud: function (o) { for (var k in o) hudVals[k] = o[k]; },
    /* a game can switch tunes mid-play (Jump's power-up): music('rush'),
       then music() to go back to the game's own */
    music: function (name) { if (scene === 'play') playSong(name || meta.song); },
    shake: function (n) { if (!reduce) shakeT = Math.max(shakeT, n || 8); },
    flash: function () { if (!reduce) flashT = 3; },
    buzz: function (ms) { if (touched && navigator.vibrate) try { navigator.vibrate(ms || 30); } catch (e) {} },
    over: function (score) { ended(score, false); },
    finish: function (ms) { ended(ms, true); },
    reload: function () { reink(); game.reset(); hudVals = {}; if (meta.song) playSong(meta.song); },
    frame: function () { return t; },
    rand: function (a, b) { return a + Math.random() * (b - a); }
  };

  /* the picker: a real link each (no JS still works), swapped in place */
  Array.prototype.forEach.call(document.querySelectorAll('[data-pick]'), function (a) {
    var g = a.getAttribute('data-pick');
    if (g === id) { a.setAttribute('aria-current', 'true'); a.classList.add('is-on'); }
    a.addEventListener('click', function (e) { e.preventDefault(); if (g !== id) pick(g); });
  });

  /* ---- boot ---------------------------------------------------------------------------- */
  document.querySelector('[data-play-num]').textContent = 'No. ' + meta.num + ' of 03';
  document.querySelector('[data-play-title]').textContent = meta.name;
  document.querySelector('[data-play-blurb]').textContent = meta.blurb;
  document.querySelector('[data-play-keys]').innerHTML = meta.keys.map(function (k) {
    return '<div><dt>' + k[0] + '</dt><dd>' + k[1] + '</dd></div>';
  }).join('');
  var bt = document.querySelector('[data-board-title]');
  if (bt) bt.textContent = asc ? 'Fastest times' : 'High scores';
  view.setAttribute('aria-label', meta.name + ' — game screen');
  stage.setAttribute('data-game', id);
  setMute(muted);
  fit();
  refresh();
  logo(80).then(function (m) { bootLogo = m; });
  logo(64).then(function (m) { cardLogo = m; });
  requestAnimationFrame(loop);

  /* The handheld rises out of the bottom of the page, then powers on.
     Reduced motion: it is simply there, already on. */
  var powerOn = function () { if (scene === 'off') { go('boot'); gb.classList.add('is-on'); } };
  if (reduce || swapped) {
    // already in hand: no rise (and no transition sneaking one in)
    gb.style.transition = 'none'; gb.classList.add('is-up'); void gb.offsetWidth; gb.style.transition = '';
    powerOn();
  }
  else {
    requestAnimationFrame(function () { requestAnimationFrame(function () { gb.classList.add('is-up'); }); });
    gb.addEventListener('transitionend', function (e) { if (e.target === gb && e.propertyName === 'transform') powerOn(); });
    setTimeout(powerOn, 1600);
  }

  var s = document.createElement('script');
  // the game file carries the page's own version stamp (?v= on play.js)
  var ver = (me && /[?&]v=([^&#]+)/.exec(me)) ? '?v=' + /[?&]v=([^&#]+)/.exec(me)[1] : '';
  s.src = base + 'js/games/' + id + '.js' + ver;
  s.onload = function () {
    var make = window.TEKEX_GAMES && window.TEKEX_GAMES[id];
    if (!make) return;
    var g = make(api);
    Promise.resolve(g.init ? g.init() : null).then(function () { g.reset(); game = g; ready = true; });
  };
  document.body.appendChild(s);
})();
