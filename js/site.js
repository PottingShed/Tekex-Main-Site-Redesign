/* ==========================================================================
   site.js — page behaviour for tekex.co. The motion engine (cursor, smooth
   scroll, rule draw, parallax, marquee, deferred video) is js/system.js and
   is not touched from here; this file only adds what a page needs on top.
   Loaded deferred, BEFORE system.js, so the ticker is filled before the
   marquee starts measuring it.

     1. Photo print      — gradient map written from the live pair's tokens
        (1b film sources by screen size, 1c films pause off screen)
     2. Favicon          — drawn in the live pair
     3. Mobile menu
     4. Nav CTA draw     — the rule springs out to "Get involved" once
     5. Reveals          — [data-reveal] rises once, when reached
     6. Numbers          — count up once on arrival
     7. Ticker           — filled to two identical halves
     8. Footer credit    — the rule draws to the Potting Shed mark
     9. Signup           — honest until a list provider is chosen
    10. Event expiry     — a passed event can never stay advertised
    11. Poster fit       — the hero headline fills the measure exactly
    12. Nav state        — bare over the homepage film, boxed after
    13. Poster stack     — About's ambition: each line fitted, one entrance, hover tilt
   ========================================================================== */

var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var root = document.documentElement;

/* read a token as [r,g,b] 0–1 — the pair is decided before first paint by
   the inline boot script, so by now the custom properties are final */
function tokenRGB(name) {
  var v = getComputedStyle(root).getPropertyValue(name).trim();
  if (v.charAt(0) === '#') {
    if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return [1, 3, 5].map(function (i) { return parseInt(v.substr(i, 2), 16) / 255; });
  }
  var m = v.match(/[\d.]+/g);
  return m && m.length >= 3 ? m.slice(0, 3).map(function (n) { return n / 255; }) : null;
}


/* ===== 1. Photo print ================================================== */
/* Every photograph prints in the pair: ink in the shadows, ground in the
   highlights. A straight two-stop map turns every mid-grey into an even mix
   of the two, which reads as mud; the S-curve pushes tones toward the two
   pure colours so the photo reads as a two-colour print, the way the brand's
   own pink/red "The Donald" build does. Strength .55 was set by eye across
   all four pairs — stronger and faces posterise in blue/butter. */
(function () {
  var f = document.getElementById('tkx-print');
  var ink = tokenRGB('--brand-ink'), ground = tokenRGB('--brand-ground');
  if (!f || !ink || !ground) return;
  var STEPS = 11, K = 0.55;
  var curve = function (t) {
    var s = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    return K * s + (1 - K) * t;
  };
  var funcs = f.querySelectorAll('feFuncR, feFuncG, feFuncB');
  for (var c = 0; c < 3; c++) {
    var vals = [];
    for (var i = 0; i < STEPS; i++) {
      var t = curve(i / (STEPS - 1));
      vals.push((ink[c] + (ground[c] - ink[c]) * t).toFixed(4));
    }
    funcs[c].setAttribute('tableValues', vals.join(' '));
  }
  root.classList.add('js-print');
})();


/* ===== 1b. Film sources ================================================ */
/* Smaller cuts on small screens (hero 960px 2.1MB not 1600px 5.8MB; loop
   960px 1.5MB not 1280px 2.5MB).
   Swapped on data-src before system.js reads it at window.load, so the
   deferred-video module is untouched. Safari is flagged for the CSS
   fallback to the film print (see home.css). */
(function () {
  if (Math.max(screen.width, window.innerWidth) <= 900) {
    Array.prototype.forEach.call(document.querySelectorAll('video[data-src-small]'), function (v) {
      v.setAttribute('data-src', v.getAttribute('data-src-small'));
    });
  }
  var ua = navigator.userAgent;
  if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/.test(ua)) root.classList.add('is-safari');
})();


/* ===== 1c. Films pause off screen ====================================== */
/* The docs' rule for heavy media: deferred, and paused while out of view.
   Each film runs an SVG print filter per frame, so an off-screen one is
   pure cost. Reduced motion never plays them (system.js strips autoplay). */
(function () {
  var vids = document.querySelectorAll('video[data-src]');
  if (!vids.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (!v.src) return;                      // not loaded yet — system.js sets src at load
      if (e.isIntersecting) { if (!REDUCE) { var p = v.play(); if (p) p.catch(function () {}); } }
      else v.pause();
    });
  }, { threshold: 0 });
  Array.prototype.forEach.call(vids, function (v) { io.observe(v); });
})();


/* ===== 2. Favicon ====================================================== */
/* the corner mark from the social builds, in whichever pair this visit got,
   so the tab matches the page it belongs to */
(function () {
  var cs = getComputedStyle(root);
  var ink = cs.getPropertyValue('--brand-ink').trim();
  var ground = cs.getPropertyValue('--brand-ground').trim();
  if (!ink || !ground) return;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="' + ground + '"/>' +
    '<path d="M18 10H54V54H10V18" fill="none" stroke="' + ink + '" stroke-width="12"/></svg>';
  var link = document.querySelector('link[rel="icon"]');
  if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
})();


/* ===== 3. Mobile menu ================================================== */
(function () {
  var btn = document.getElementById('nav-toggle');
  var menu = document.getElementById('nav-menu');
  if (!btn || !menu) return;
  var closeBtn = document.getElementById('nav-menu-close');
  var open = function (state) {
    btn.setAttribute('aria-expanded', state ? 'true' : 'false');
    menu.hidden = !state;
    document.body.style.overflow = state ? 'hidden' : '';
    if (state && closeBtn) closeBtn.focus();
    else if (!state) btn.focus({ preventScroll: true });
  };
  btn.addEventListener('click', function () { open(menu.hidden); });
  if (closeBtn) closeBtn.addEventListener('click', function () { open(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) open(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) open(false); });
  // never leave it open when the window grows past the mobile nav
  window.addEventListener('resize', function () { if (window.innerWidth > 880 && !menu.hidden) open(false); });
})();


/* ===== 4. Nav CTA draw ================================================= */
(function () {
  if (document.querySelector('.nav-cta')) root.classList.add('js-navcta');
})();


/* ===== 5. Reveals ====================================================== */
(function () {
  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length || REDUCE || !('IntersectionObserver' in window)) return;
  root.classList.add('js-reveal');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (el) { io.observe(el); });
})();


/* ===== 6. Numbers ====================================================== */
/* Each figure counts up once, when the band is reached. The markup holds
   the final value, so no-JS and reduced motion simply read it. Widths are
   deliberately NOT locked: each figure owns its line in the 2×2, so growing
   from the left disturbs nothing, whereas a locked right-aligned box left
   the "£" stranded a gap away from the digits mid-count. */
(function () {
  var band = document.querySelector('.numbers');
  if (!band || REDUCE || !('IntersectionObserver' in window)) return;
  var nums = Array.prototype.slice.call(band.querySelectorAll('.n[data-to]'));
  nums.forEach(function (n) { n.textContent = '0'; });
  var run = function () {
    var DUR = 1500, t0 = null, done = false;
    var ease = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };   // expo out
    var finish = function () { done = true; nums.forEach(function (n) { n.textContent = n.dataset.to; }); };
    var step = function (now) {
      if (done) return;
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / DUR);
      nums.forEach(function (n) { n.textContent = Math.round(+n.dataset.to * ease(p)); });
      if (p < 1) requestAnimationFrame(step); else finish();
    };
    requestAnimationFrame(step);
    /* A throttled tab runs rAF slowly or not at all — never leave a part-
       counted figure on screen. The done flag matters: without it a frame
       that was already queued wrote 989 back over the final 1000. */
    setTimeout(finish, DUR + 400);
  };
  var io = new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) { io.disconnect(); run(); }
  }, { threshold: 0.35 });
  io.observe(band.querySelector('.stats'));
})();


/* ===== 7. Ticker ======================================================= */
/* The marquee in system.js needs the track to be two identical halves, each
   at least a screen wide, or the wrap shows. The four logos run ~1600px at
   1440 but ~800px on a phone and short of a 2560 screen, so the set is
   repeated to fill the half and then the half is doubled. Only the
   first set is read out; every clone is aria-hidden. Refilled on resize. */
(function () {
  var wrap = document.getElementById('ticker');
  if (!wrap) return;
  var track = wrap.querySelector('.ticker-track');
  var base = Array.prototype.slice.call(track.children);
  var lastW = 0;
  var clone = function (el) {
    var c = el.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.setAttribute('data-clone', '');
    return c;
  };
  var fill = function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    Array.prototype.forEach.call(track.querySelectorAll('[data-clone]'), function (c) { c.remove(); });
    var setW = track.scrollWidth || 1;
    var reps = Math.max(1, Math.ceil((window.innerWidth + 120) / setW));
    for (var r = 1; r < reps; r++) base.forEach(function (el) { track.appendChild(clone(el)); });
    Array.prototype.slice.call(track.children).forEach(function (el) { track.appendChild(clone(el)); });
  };
  fill();
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fill, 150); });
})();


/* ===== 8. Footer credit ================================================ */
(function () {
  var footer = document.querySelector('.footer');
  var bar = document.querySelector('.footer-bar');
  if (!footer || !bar || !('IntersectionObserver' in window)) return;
  root.classList.add('js-footer');
  /* watch the bar itself and wait until it is wholly on screen — observing
     the whole footer fired while the bar was still below the fold */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { footer.classList.add('is-in'); io.disconnect(); } });
  }, { threshold: 1, rootMargin: '0px 0px -20px 0px' });
  io.observe(bar);
})();


/* ===== 9. Signup ======================================================= */
/* No mailing-list provider has been chosen (brief, open question 7). Until
   data-endpoint is set the form says so plainly rather than pretending to
   subscribe anyone. When it is set, this posts {email} as JSON. */
(function () {
  var form = document.getElementById('signup');
  if (!form) return;
  var input = form.querySelector('input[type="email"]');
  var status = form.querySelector('.signup-status');
  var say = function (msg, state) { status.textContent = msg; form.setAttribute('data-state', state); };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input.value.trim() || !input.checkValidity()) {
      say('Please enter a valid email address.', 'error');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      say('Sign-up opens at launch. Until then, email hello@tekex.co and we’ll add you.', 'pending');
      return;
    }
    say('Sending…', 'busy');
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: input.value.trim() }) })
      .then(function (r) { if (!r.ok) throw r; say('You’re in the loop. Thank you.', 'done'); form.reset(); })
      .catch(function () { say('That didn’t go through. Please try again, or email hello@tekex.co.', 'error'); });
  });
})();


/* ===== 10. Upcoming events retire themselves =========================== */
/* The live site was still promoting an event from November 2021 years
   later. Any card carrying data-event-date is hidden once that moment has
   passed (plus a day's grace, so it stays up on the night), and if a list
   is left empty its [data-events-empty] line is shown instead. Static HTML
   still needs the card moving to the archive eventually — this only makes
   sure a missed update can never advertise the past. */
(function () {
  var cards = document.querySelectorAll('[data-event-date]');
  if (!cards.length) return;
  var now = Date.now(), DAY = 864e5;
  Array.prototype.forEach.call(cards, function (c) {
    var t = Date.parse(c.getAttribute('data-event-date'));
    if (!isNaN(t) && t + DAY < now) c.hidden = true;
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-events-empty]'), function (msg) {
    var scope = msg.parentElement;
    var live = scope.querySelectorAll('[data-event-date]:not([hidden])').length;
    msg.hidden = live > 0;
  });
})();


/* ===== 11. Poster headline fit ========================================= */
/* Lifted from the Health Innovation site, where it was tuned: the headline
   is set to the exact size at which its widest line fills the measure, so
   the block is flush on both edges at every width. */
(function () {
  var titles = Array.prototype.slice.call(document.querySelectorAll('.poster-title, .page-title'));
  if (!titles.length) return;
  var cache = new WeakMap();
  /* Negative tracking ends the last glyph's advance short of its ink, so a
     line fitted to its advance overhung the measure (~3px at 1440 with
     -.03em, measured). Fit the ink: read each title's own tracking, in em. */
  var track = function (el) {
    var cs = getComputedStyle(el);
    return Math.max(0, -(parseFloat(cs.letterSpacing) || 0) / parseFloat(cs.fontSize));
  };

  var measure = function (el) {
    var cs = getComputedStyle(el);
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' +
      cs.fontWeight + ' 100px ' + cs.fontFamily + ';letter-spacing:' + (-track(el)) + 'em;text-transform:uppercase';
    document.body.appendChild(probe);
    var ems = Array.prototype.map.call(el.querySelectorAll('.hl-line'), function (l) {
      probe.textContent = l.textContent.replace(/\s+/g, ' ').trim();
      return probe.getBoundingClientRect().width / 100;
    });
    probe.remove();
    cache.set(el, ems);
    return ems;
  };

  /* Below 640 the words regroup into four lines via forced breaks, so the
     probe can't know the groupings from the markup — measure what rendered.
     Rows are rebuilt from the words' layout boxes (offsetTop/Left ignore the
     entrance transforms): a visual row can span two .hl-line spans, and
     measuring each range fragment on its own missed "AMBITION WITH" and let
     it run 50px past the measure at 390 (caught in the four-pair sheet).
     Settle within 0.05px rather than write every pass, or the observer below
     keeps re-firing on its own output. */
  var widestRow = function (el) {
    var rows = {};
    Array.prototype.forEach.call(el.querySelectorAll('.hl-w'), function (w) {
      var k = w.offsetTop, row = rows[k] || (rows[k] = [Infinity, -Infinity]);
      row[0] = Math.min(row[0], w.offsetLeft);
      row[1] = Math.max(row[1], w.offsetLeft + w.offsetWidth);
    });
    var widest = 0;
    for (var k in rows) widest = Math.max(widest, rows[k][1] - rows[k][0]);
    return widest;
  };
  var fitRendered = function (el) {
    var target = el.clientWidth;
    if (!target) return;
    for (var pass = 0; pass < 3; pass++) {
      var size = parseFloat(getComputedStyle(el).fontSize);
      var widest = widestRow(el);
      if (!widest) return;
      var next = size * target / (widest + track(el) * size);
      if (Math.abs(next - size) < 0.05) return;
      el.style.setProperty('--hero-fit', next.toFixed(2) + 'px');
    }
  };

  var fit = function () {
    titles.forEach(function (el) {
      if (window.innerWidth <= 640) { fitRendered(el); return; }
      var ems = cache.get(el) || measure(el);
      if (!ems.length) return;
      var want = el.getBoundingClientRect().width / (Math.max.apply(null, ems) + track(el));
      if (Math.abs(want - parseFloat(getComputedStyle(el).fontSize)) < 0.05) return;
      el.style.setProperty('--hero-fit', want.toFixed(2) + 'px');
    });
  };
  var reset = function () { titles.forEach(function (el) { cache.delete(el); }); fit(); };

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reset);
  fit();
  window.addEventListener('resize', reset);
  if (window.ResizeObserver) {
    var busy = false;
    var ro = new ResizeObserver(function () {
      if (busy) return;
      busy = true;
      requestAnimationFrame(function () { reset(); busy = false; });
    });
    titles.forEach(function (el) { ro.observe(el); });
  }
})();


/* ===== 12. Nav: bare over the film, boxed after ======================== */
/* The nav sits bare over the homepage film (and About's ink head) and
   boxes up the moment the hero has scrolled out from under it — measured against the hero's foot,
   not a fixed scroll distance, so it stays bare across the whole film. */
(function () {
  var nav = document.querySelector('.nav[data-over]');
  var hero = document.querySelector('.hero-film-sec, .page-head.is-photo');
  if (!nav || !hero) return;
  var ticking = false;
  var update = function () {
    ticking = false;
    nav.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < nav.offsetHeight);
  };
  update();
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
})();


/* ===== 13. Poster stack ================================================ */
/* About's ambition, set like a letterpress poster: every line of the
   punchline is sized on its own so each fills the panel's measure. The
   hero fitter (11) sizes a block off its widest line; this sizes every
   line. Fitted to the ink, not the advance, as 11 does: -.035em tracking
   ends the last glyph's advance short of its ink. offsetWidth ignores the
   entrance transforms, so it can fit mid-animation. Then the poster's one
   entrance (about.css), once, when a third of it is in view. */
(function () {
  var posters = Array.prototype.slice.call(document.querySelectorAll('[data-stack]'));
  if (!posters.length) return;
  root.classList.add('js-stack');
  var TRACK = 0.035;
  var fit = function (p) {
    var lines = p.querySelectorAll('.sl');
    if (!lines.length) return;
    var target = lines[0].clientWidth;
    if (!target) return;
    Array.prototype.forEach.call(lines, function (l) {
      var size = parseFloat(getComputedStyle(l).fontSize);
      var want = target / (l.firstElementChild.offsetWidth / size + TRACK);
      if (Math.abs(want - size) > 0.05) l.style.setProperty('--sl', want.toFixed(2) + 'px');
    });
  };
  var fitAll = function () { posters.forEach(fit); };
  fitAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  window.addEventListener('resize', fitAll);

  /* Hover: the poster tilts toward the pointer and a sheen follows it
     (owner, 13 Oct) — up to 5° on each axis, so it reads as a print
     catching the light, not a card flipping. The box is measured on enter
     and only re-measured on scroll: measuring it mid-tilt would feed the
     tilt back into itself. Fine pointers only; reduced motion keeps it still. */
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    posters.forEach(function (p) {
      var box = null, sy = 0, x = 0.5, y = 0.5, raf = 0;
      var measure = function () {
        var t = p.style.transform; p.style.transform = 'none';
        box = p.getBoundingClientRect(); sy = window.scrollY; p.style.transform = t;
      };
      var paint = function () {
        raf = 0;
        p.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
        p.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
        p.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        p.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      };
      p.addEventListener('pointerenter', function () { measure(); p.classList.add('is-tilting'); });
      p.addEventListener('pointermove', function (e) {
        if (!box || window.scrollY !== sy) measure();
        x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
        y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
        if (!raf) raf = requestAnimationFrame(paint);
      });
      p.addEventListener('pointerleave', function () { p.classList.remove('is-tilting'); x = y = 0.5; paint(); });
    });
  }

  if (!('IntersectionObserver' in window)) { posters.forEach(function (p) { p.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.3 });
  posters.forEach(function (p) { io.observe(p); });
})();


/* the year in the footer, so it never goes stale */
(function () {
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
