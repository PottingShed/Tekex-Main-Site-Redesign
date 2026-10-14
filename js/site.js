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
    (14+ below: articles, gallery, line-ups, footer year)
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
  if (!f) return;
  var paint = function () {
  var ink = tokenRGB('--brand-ink'), ground = tokenRGB('--brand-ground');
  if (!ink || !ground) return;
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
  };
  paint();
  // a Reprint (16) changes the pair mid-visit: the map follows it
  document.addEventListener('tekex:reink', paint);
})();


/* ===== 1b. Film sources ================================================ */
/* Smaller cuts on small screens (hero 960px 2.9MB not 1600px 7.1MB; loop
   960px 2.8MB not 1280px 5.0MB).
   Swapped on data-src before system.js reads it at window.load, so the
   deferred-video module is untouched. */
(function () {
  if (Math.max(screen.width, window.innerWidth) <= 900) {
    Array.prototype.forEach.call(document.querySelectorAll('video[data-src-small]'), function (v) {
      v.setAttribute('data-src', v.getAttribute('data-src-small'));
    });
  }
})();


/* ===== 1c. Films pause off screen ====================================== */
/* The docs' rule for heavy media: deferred, and paused while out of view.
   A film decodes 25 frames a second whether or not anyone can see it, so
   an off-screen one is pure cost. Reduced motion never plays them (system.js strips autoplay). */
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
  var draw = function () {
    var cs = getComputedStyle(root);
    var ink = cs.getPropertyValue('--brand-ink').trim();
    var ground = cs.getPropertyValue('--brand-ground').trim();
    if (!ink || !ground) return;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="' + ground + '"/>' +
      '<path d="M18 10H54V54H10V18" fill="none" stroke="' + ink + '" stroke-width="12"/></svg>';
    var link = document.querySelector('link[rel="icon"]');
    if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  };
  draw();
  document.addEventListener('tekex:reink', draw);
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
    /* while it covers the page, the page behind is out of reach: Tab walked
       straight out of the menu into links nobody could see, and a screen
       reader read on past it (14 Oct audit) */
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== menu && el.tagName !== 'SCRIPT') el.inert = !!state;
    });
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
  // once a flagged address is put right, the complaint goes (it stayed up
  // until the next submit — 14 Oct audit)
  input.addEventListener('input', function () {
    if (form.getAttribute('data-state') === 'error' && input.value.trim() && input.checkValidity()) {
      input.removeAttribute('aria-invalid'); say('', 'idle');
    }
  });
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
   is left empty its [data-events-empty] line is shown instead. On an
   event's own page, [data-event-after] is what takes its place (Register
   gives way to What's on next). A rebuild moves a passed event to the
   archive for good (build/build.py decides what's coming up); this only
   makes sure a missed rebuild can never advertise the past. */
(function () {
  var now = Date.now(), DAY = 864e5;
  var passed = function (el, attr) {
    var t = Date.parse(el.getAttribute(attr));
    return !isNaN(t) && t + DAY < now;
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-event-date]'), function (c) {
    if (passed(c, 'data-event-date')) c.hidden = true;
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-event-after]'), function (c) {
    c.hidden = !passed(c, 'data-event-after');
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-events-empty]'), function (msg) {
    msg.hidden = msg.parentElement.querySelectorAll('[data-event-date]:not([hidden])').length > 0;
  });
})();


/* ===== 11. Poster headline fit ========================================= */
/* Lifted from the Health Innovation site, where it was tuned: the headline
   is set to the exact size at which its widest line fills the measure, so
   the block is flush on both edges at every width. */
(function () {
  var titles = Array.prototype.slice.call(document.querySelectorAll('.poster-title, .page-title, .loop-title'));
  // nothing to fit (articles, the arcade): ready at once, so the gate never waits
  if (!titles.length) { root.classList.add('fit-ok'); return; }
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
  /* First sight waits for the display face: fitted in the fallback, the
     headline was sized for Helvetica, then re-fitted when PP Neue Montreal
     landed — a visible jump on a real connection (owner, 13 Oct: "the type
     starts one size and then pops to be another"). Until fit-ok the titles
     are hidden (css/site.css); two seconds is the most we'll wait. */
  var shown = false;
  var show = function () { if (shown) return; shown = true; reset(); root.classList.add('fit-ok'); };
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 100px "PP Neue Montreal"').then(show, show);
    setTimeout(show, 2000);
  } else show();
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


/* 14. Articles (13 Oct, the Medium pass): copy link, and the nav's rule
   as the reading line. Copy stays hidden without a clipboard rather than
   offering a button that can't work. The rule between the links and Get
   involved fills with the story, measured where the eye is: 0 as the first
   line crosses the middle of the window, full as the last one does, so half
   read is half full (measured from the foot of the window it ran ~20%
   ahead). The kicker's drawn rule, now measuring something. Scroll-linked state, not an animation: it tracks
   the page exactly and has no transition to switch off. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    if (!navigator.clipboard || !window.isSecureContext) return;
    b.hidden = false;
    var note = b.parentNode.querySelector('.share-note'), t;
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        b.classList.add('is-done');
        if (note) note.textContent = 'Link copied';
        clearTimeout(t);
        t = setTimeout(function () { b.classList.remove('is-done'); if (note) note.textContent = ''; }, 2200);
      });
    });
  });

  var body = document.querySelector('.art-body');
  if (!body) return;
  var root = document.documentElement, queued = false;
  root.classList.add('has-read');
  var update = function () {
    queued = false;
    var r = body.getBoundingClientRect(), p = (window.innerHeight / 2 - r.top) / r.height;
    root.style.setProperty('--read', (p < 0 ? 0 : p > 1 ? 1 : p).toFixed(4));
  };
  var queue = function () { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
})();

/* 15. The footer's Play button nudges every ten seconds while the footer
   is on screen, and only then — a hop that fires off-screen is wasted, and
   one that never stops is a nag. Not at all under reduced motion. */
(function () {
  var b = document.querySelector('.footer-play');
  if (!b || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var timer = null, first = null;
  var hop = function () {
    if (b.closest('.has-founders')) return;   // Ed is bonking it himself (the footer moment, below)
    b.classList.remove('is-hop');
    void b.offsetWidth;   // restart the animation
    b.classList.add('is-hop');
  };
  b.addEventListener('animationend', function (e) { if (e.target === b.querySelector('i:last-child')) b.classList.remove('is-hop'); });
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      clearTimeout(first); clearInterval(timer);
      if (!e.isIntersecting) return;
      first = setTimeout(hop, 1400);
      timer = setInterval(hop, 10000);
    });
  }, { threshold: 0.6 }).observe(b);
})();

/* 16. Reprint (moment 6, 13 Oct). The pair changes on every visit and most
   people never find out. The footer's Reprint button prints the page again
   in another of the five: a sheet of the page's own ink rises, the pair
   changes while it covers everything, and it lifts away in the new ink —
   so the screen only ever holds one pair, the brand's rule (it was a white
   sheet first; owner: use the pair on screen). Recorded, so the next page
   load won't repeat it. Reduced motion: it simply changes. */
(function () {
  var b = document.querySelector('[data-reprint]');
  if (!b) return;
  var PAIRS = [['cw-blue', '#FFDC8A'], ['cw-magenta', '#87FFED'], ['cw-purple', '#D1FFBF'], ['cw-red', '#F6C5FF']];
  var sheet = null;
  var swap = function () {
    var cur = PAIRS.filter(function (p) { return root.classList.contains(p[0]); })[0];
    var pool = PAIRS.filter(function (p) { return p !== cur; });
    var p = pool[Math.floor(Math.random() * pool.length)];
    PAIRS.forEach(function (q) { root.classList.remove(q[0]); });
    root.classList.add(p[0]);
    try { sessionStorage.setItem('tkx-cw', p[0]); } catch (e) {}
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', p[1]);
    document.dispatchEvent(new CustomEvent('tekex:reink'));
  };
  b.addEventListener('click', function () {
    if (REDUCE) { swap(); return; }
    if (sheet) return;
    sheet = document.createElement('div');
    sheet.className = 'reprint-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sheet);
    requestAnimationFrame(function () {
      sheet.classList.add('is-in');
      setTimeout(function () {
        swap();
        sheet.classList.remove('is-in');
        sheet.classList.add('is-out');
        setTimeout(function () { sheet.remove(); sheet = null; }, 280);
      }, 190);
    });
  });
})();

/* 17. Reading, the Medium way (moment 5, 13 Oct). Two things on an article:
   select a passage and a small bar offers it to LinkedIn — where the
   network lives — or copies it with the link; click a picture and it opens
   to the size of the window from where it sits, and closes on any click,
   Esc or scroll. Reduced motion: the picture opens without the travel. */
(function () {
  var body = document.querySelector('.art-body');
  if (!body) return;
  var url = (document.querySelector('link[rel="canonical"]') || {}).href || location.href.split('#')[0];
  var share = document.querySelector('[data-copy]');
  if (share) url = share.getAttribute('data-copy');   // the address that works today (the generator's SHARE)

  // -- the passage bar
  var bar = document.createElement('div');
  bar.className = 'hl-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Share this passage');
  bar.hidden = true;
  bar.innerHTML = '<button type="button" data-hl="li"><span class="social-icon" aria-hidden="true"></span>Share</button>' +
    '<button type="button" data-hl="copy">Copy quote</button>';
  bar.querySelector('.social-icon').style.cssText = "-webkit-mask-image:url('../assets/icons/social/linkedin.svg');mask-image:url('../assets/icons/social/linkedin.svg')";
  document.body.appendChild(bar);
  var quote = '';
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var place = function () {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { bar.hidden = true; return; }
    var r = sel.getRangeAt(0);
    if (!body.contains(r.commonAncestorContainer)) { bar.hidden = true; return; }
    var t = sel.toString().replace(/\s+/g, ' ').trim();
    if (t.length < 12) { bar.hidden = true; return; }
    quote = t.length > 260 ? t.slice(0, 257).replace(/\s+\S*$/, '') + '\u2026' : t;
    var rect = r.getBoundingClientRect();
    bar.hidden = false;
    var bw = bar.offsetWidth, bh = bar.offsetHeight;
    var x = Math.max(8, Math.min(window.innerWidth - bw - 8, rect.left + rect.width / 2 - bw / 2));
    // a phone draws its own menu above a selection, so ours goes below
    var y = coarse || rect.top < bh + 16 ? rect.bottom + 12 : rect.top - bh - 12;
    bar.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  };
  var queued = false;
  var later = function () { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; place(); }); } };
  document.addEventListener('selectionchange', later);
  window.addEventListener('scroll', function () { if (!bar.hidden) later(); }, { passive: true });
  bar.addEventListener('mousedown', function (e) { e.preventDefault(); });   // keep the selection
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hl]');
    if (!b) return;
    var text = '\u201C' + quote + '\u201D \u2014 TEKEX Journal';
    if (b.getAttribute('data-hl') === 'li') {
      window.open('https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(text + '\n' + url), '_blank', 'noopener');
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + '\n' + url).then(function () {
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy quote'; }, 1600);
      });
    }
  });

  // -- pictures, opened to the window
  var pics = document.querySelectorAll('.art-cover img, .art-body img');
  // the smallest source that's sharp at the zoomed size on this screen — it
  // was always the largest, 2400px for a 360px phone view (14 Oct audit)
  var sharpest = function (img, cssW) {
    var need = cssW * (window.devicePixelRatio || 1), cands = [];
    (img.getAttribute('srcset') || '').split(',').forEach(function (c) {
      var m = c.trim().split(/\s+/), w = parseInt(m[1], 10) || 0;
      if (m[0] && w) cands.push([w, m[0]]);
    });
    if (!cands.length) return img.currentSrc || img.src;
    cands.sort(function (a, b) { return a[0] - b[0]; });
    for (var i = 0; i < cands.length; i++) if (cands[i][0] >= need) return cands[i][1];
    return cands[cands.length - 1][1];
  };
  var open = null;
  var close = function () {
    if (!open) return;
    var o = open; open = null;
    var done = function () { o.shade.remove(); o.big.remove(); o.img.style.visibility = ''; o.img.focus({ preventScroll: true }); };
    o.shade.classList.remove('is-on');
    if (REDUCE) { done(); return; }
    var r = o.img.getBoundingClientRect();
    o.big.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px) scale(' + (r.width / o.w) + ')';
    setTimeout(done, 420);
  };
  Array.prototype.forEach.call(pics, function (img) {
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'View larger: ' + (img.alt || 'picture'));
    img.setAttribute('data-cursor', 'View');
    var go = function () {
      if (open) return;
      var r = img.getBoundingClientRect();
      var ratio = (+img.getAttribute('width') || r.width) / (+img.getAttribute('height') || r.height);
      var m = Math.min(48, window.innerWidth * 0.04);
      var w = Math.min(window.innerWidth - m * 2, (window.innerHeight - m * 2) * ratio), h = w / ratio;
      var shade = document.createElement('div');
      shade.className = 'zoom-shade';
      shade.setAttribute('role', 'dialog');
      shade.setAttribute('aria-modal', 'true');
      shade.setAttribute('aria-label', img.alt || 'Picture');
      shade.tabIndex = -1;
      var big = new Image();
      big.className = 'zoom-img';
      big.alt = img.alt;
      big.src = img.currentSrc || img.src;
      var hi = new Image(); hi.src = sharpest(img, w); hi.onload = function () { big.src = hi.src; };
      big.style.width = w + 'px'; big.style.height = h + 'px';
      big.style.transformOrigin = '0 0';
      var tx = (window.innerWidth - w) / 2, ty = (window.innerHeight - h) / 2;
      big.style.transform = REDUCE ? 'translate(' + tx + 'px,' + ty + 'px)' : 'translate(' + r.left + 'px,' + r.top + 'px) scale(' + (r.width / w) + ')';
      document.body.appendChild(shade);
      document.body.appendChild(big);
      img.style.visibility = 'hidden';
      open = { img: img, big: big, shade: shade, w: w };
      requestAnimationFrame(function () {
        shade.classList.add('is-on');
        big.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
        shade.focus({ preventScroll: true });
      });
      shade.addEventListener('click', close);
      big.addEventListener('click', close);
    };
    img.addEventListener('click', go);
    img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  document.addEventListener('keydown', function (e) { if (open && (e.key === 'Escape' || e.key === 'Tab')) { e.preventDefault(); close(); } });
  window.addEventListener('wheel', function () { if (open) close(); }, { passive: true });
  window.addEventListener('touchmove', function () { if (open) close(); }, { passive: true });
})();

/* 18. The archive's two views (moment 3). List first — the line-ups are the
   record (owner, 13 Oct) — and Gallery: every poster on one track, dragged,
   stepped (buttons or arrow keys) or jumped by year, with a count and a
   progress rule. A poster, or the Details link of an event without a page
   of its own, opens that event in the list; Event page links simply go to
   the page. The choice of view is kept for the visit. */
(function () {
  var arch = document.querySelector('[data-arch]');
  if (!arch) return;
  var views = arch.querySelectorAll('[data-view]');
  var track = arch.querySelector('[data-gal-track]');
  var slides = track ? Array.prototype.slice.call(track.querySelectorAll('.gal-slide')) : [];
  var at = 0;
  var set = function (v) {
    arch.setAttribute('data-view', v);
    Array.prototype.forEach.call(views, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false'); });
    try { sessionStorage.setItem('tkx-arch', v); } catch (e) {}
    if (v === 'gallery' && typeof sync === 'function') requestAnimationFrame(sync);
  };
  Array.prototype.forEach.call(views, function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-view')); }); });

  if (track && slides.length) {
    var count = arch.querySelector('[data-gal-at]'), bar = arch.querySelector('[data-gal-progress]');
    var years = arch.querySelectorAll('[data-gal-year]'), steps = arch.querySelectorAll('[data-gal-step]');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var left = function (i) { return slides[i].offsetLeft - slides[0].offsetLeft; };
    var go = function (i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: left(i), behavior: REDUCE ? 'auto' : 'smooth' });
    };
    var sync = function () {
      var x = track.scrollLeft, best = 0, d = Infinity;
      slides.forEach(function (s, i) { var dd = Math.abs(left(i) - x); if (dd < d) { d = dd; best = i; } });
      if (best !== at || !slides[best].classList.contains('is-on')) {
        slides[at].classList.remove('is-on');
        at = best;
        slides[at].classList.add('is-on');
        count.textContent = pad(at + 1);
        var y = slides[at].getAttribute('data-gal-yr');
        Array.prototype.forEach.call(years, function (b) { b.classList.toggle('is-on', b.getAttribute('data-gal-year') === y); });
      }
      var max = track.scrollWidth - track.clientWidth;
      bar.style.setProperty('--gal', max > 0 ? (x / max).toFixed(4) : 0);
      steps[0].disabled = x <= 2;
      steps[1].disabled = x >= max - 2;
    };
    var queued = false;
    track.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; sync(); }); } }, { passive: true });
    window.addEventListener('resize', sync);
    Array.prototype.forEach.call(steps, function (b) { b.addEventListener('click', function () { go(at + +b.getAttribute('data-gal-step')); }); });
    Array.prototype.forEach.call(years, function (b) {
      b.addEventListener('click', function () {
        var y = b.getAttribute('data-gal-year');
        for (var i = 0; i < slides.length; i++) if (slides[i].getAttribute('data-gal-yr') === y) { go(i); return; }
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(at + (e.key === 'ArrowRight' ? 1 : -1)); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); go(e.key === 'Home' ? 0 : slides.length - 1); }
    });
    /* Drag with a mouse (touch already scrolls natively). Posters are
       links, and a link pulled sideways starts the browser's own drag of a
       ghost link — which cancelled ours and left it guessing between click
       and drag (owner, 13 Oct). So native link-dragging is off in here, the
       pointer is captured, and the rule is plain: under 6px of travel is a
       click, more is a drag, and a drag never opens a poster. Let go with
       speed and it carries on a poster or two before it settles. */
    Array.prototype.forEach.call(track.querySelectorAll('a, img'), function (el) { el.setAttribute('draggable', 'false'); });
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    var drag = null, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      e.preventDefault();   // no text selection, no native drag
      moved = false;
      drag = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, from: at, hist: [[e.timeStamp, e.clientX]] };
    });
    track.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        track.classList.add('is-drag');
        try { track.setPointerCapture(e.pointerId); } catch (x) {}
      }
      if (!moved) return;
      track.scrollLeft = drag.left - dx;
      drag.hist.push([e.timeStamp, e.clientX]);
      if (drag.hist.length > 6) drag.hist.shift();
    });
    var release = function (e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var h = drag.hist, v = 0;
      if (moved && h.length > 1) {
        var a = h[0], b = h[h.length - 1], ms = Math.max(1, b[0] - a[0]);
        v = (b[1] - a[1]) / ms;   // px per ms; positive = pulled right
      }
      var from = drag.from;
      drag = null;
      if (!moved) return;
      track.classList.remove('is-drag');
      // settle on the nearest poster; a quick flick carries one further in
      // its direction — but never more than two from where the drag began
      var x = track.scrollLeft, best = at, d = Infinity;
      slides.forEach(function (sl, i) { var dd = Math.abs(left(i) - x); if (dd < d) { d = dd; best = i; } });
      var dir = v < 0 ? 1 : -1;
      if (Math.abs(v) > 0.35 && (best - from) * dir <= 0) best += dir;
      go(Math.max(from - 2, Math.min(from + 2, best)));
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('lostpointercapture', release);
    // a drag that ends over a poster must not open it
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    sync();
  }

  var start = 'list';
  try { start = sessionStorage.getItem('tkx-arch') || 'list'; } catch (e) {}
  if (start !== 'gallery') start = 'list';
  if (location.hash && arch.querySelector('.arch-list ' + location.hash.replace(/[^#\w-]/g, ''))) start = 'list';
  set(start);

  arch.addEventListener('click', function (e) {
    var a = e.target.closest('[data-to]');
    if (!a) return;
    e.preventDefault();
    set('list');
    var li = document.getElementById(a.getAttribute('data-to'));
    if (!li) return;
    var d = li.querySelector('details');
    if (d) d.open = true;
    li.scrollIntoView({ block: 'start' });
    var su = li.querySelector('summary');
    if (su) su.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, '', '#' + li.id);
  });
})();

/* the year in the footer, so it never goes stale */
(function () {
  // scoped to the footer: an unscoped [data-year] once wrote the year over
  // the first poster in the Events gallery
  var y = document.querySelector('.footer [data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();

/* Case studies pictures (QA, 14 Oct: "we get a background then they pop
   in"). Each picture waits behind its paste-up clip, and a browser treats a
   clipped image as off screen, so native lazy loading didn't fetch it until
   the clip had begun to open: measured, every frame pasted up ~1s before
   its picture had even been requested. So: fetch each picture when its
   frame is a screen and a half away, and mark the frame .is-ready once the
   picture is in; css/cases.css only pastes a frame up when it is both
   reached (.is-in, 13) and ready. Late on a slow line, the ink frame simply
   waits, then pastes up with the picture already in it. */
(function () {
  var media = Array.prototype.slice.call(document.querySelectorAll('.case-media'));
  if (!media.length) return;
  media.forEach(function (m) {
    var img = m.querySelector('img');
    var ready = function () { m.classList.add('is-ready'); };
    if (!img || (img.complete && img.naturalWidth)) { ready(); return; }
    img.addEventListener('load', ready);
    img.addEventListener('error', ready);
  });
  var fetchNow = function (m) {
    Array.prototype.forEach.call(m.querySelectorAll('img[loading="lazy"]'), function (i) { i.loading = 'eager'; });
  };
  if (!('IntersectionObserver' in window)) { media.forEach(fetchNow); return; }
  // the frame itself is never clipped, so it can be observed
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { fetchNow(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '150% 0px' });
  media.forEach(function (m) { io.observe(m); });
})();

/* The nav logo's sting (css/site.css, build/partials/wordmark.html), when
   someone arrives on the site or refreshes. The boot script decides and
   arms it before first paint (js/boot-colourway.js); this plays it.
   Owner, 14 Oct: "a logo sting people grow to love and remember: rhythm,
   physics, flow, storytelling". It is scored like a sound logo, a phrase
   with a hook:
     the roll   from nothing, T, E, K, E spring up from their feet, each a
                beat after the last, the beats shortening (90, 80, 70,
                60ms) so it gathers pace. Every letter starts fully flat,
                so each is seen only as it arrives (owner, 14 Oct: squashed
                to a 2px line first, the word showed lying down before it
                came, and spoiled each letter's entrance)
     the breath the last letter rises as a plain upright and holds
     the hook   the upright is the X's two strokes lying together: they
                swing apart into the X and lock, two lines meeting
   The motion is physics, not easing curves: every letter is a damped
   spring (spring() below), sampled each frame into keyframes, so it
   overshoots a touch and settles the way a real thing does. A letter
   stretches as it rises past its height and narrows as it stretches,
   keeping its volume (squash and stretch). Springs are soft enough never
   to ring twice. ~1.5s: TEKE by ~.5s, the upright held at ~.7s, the X
   locked by ~.95s. ?debug=logo exposes window.__sting(fw) for reviewing
   it frame by frame. */
(function () {
  if (!root.classList.contains('js-logoprint')) return;
  var fw = document.querySelector('.fw[data-print]');
  if (!fw || !fw.animate) return;   // no Web Animations: CSS shows the artwork after 3s

  /* a damped spring released from 0 towards 1: f, how fast it moves (Hz);
     z, how quickly it settles (1 would be no overshoot at all) */
  var spring = function (f, z, t) {
    var w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t));
  };
  // a spring sampled every frame, as keyframes
  var frames = function (secs, at) {
    var out = [], n = Math.round(secs * 60);
    for (var i = 0; i <= n; i++) out.push(at(i / 60));
    return out;
  };

  /* the score, in seconds */
  var LETTERS = [.1, .19, .27, .34, .4],       // T E K E and the X's upright
      OPEN = .76,                               // the X swings open, after a held beat on its upright
      RISE = { f: 2.5, z: .6, secs: .75 },      // a letter springing up: ~9% past its height, then settled
      STAND = { f: 2.8, z: .75, secs: .6 },     // the X's upright, firmer: still for the held beat
      SWING = { f: 3.4, z: .52, secs: .62 },    // the X locking: ~5.5° past, then settled
      LAND = 1.26;                              // the artwork takes over

  var sting = function (fw) {
    var parts = fw.querySelector('.fw-parts');
    var anims = [];
    var play = function (el, kf, secs, delay, easing) {
      anims.push(el.animate(kf, { duration: secs * 1000, delay: delay * 1000, fill: 'both', easing: easing || 'linear' }));
    };
    // the roll: each letter springs up from its foot; the X's upright on a firmer spring
    var rise = function (sp) {
      var kf = frames(sp.secs, function (t) {
        var sy = spring(sp.f, sp.z, t);                                 // from fully flat
        var sx = sy < 1 ? 1 + .18 * (1 - sy) : 1 - .55 * (sy - 1);   // wider squashed, narrower stretched
        return { transform: 'scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')' };
      });
      kf[kf.length - 1] = { transform: 'none' };
      return kf;
    };
    var letter = rise(RISE), upright = rise(STAND);
    Array.prototype.forEach.call(fw.querySelectorAll('.fw-l'), function (l, i) {
      var x = l.classList.contains('fw-x');
      play(l, x ? upright : letter, (x ? STAND : RISE).secs, LETTERS[i]);
    });
    // the hook: the X's strokes swing apart from the upright and lock
    Array.prototype.forEach.call(fw.querySelectorAll('.fw-xs'), function (x) {
      var a0 = parseFloat(x.style.getPropertyValue('--a'));
      var swing = frames(SWING.secs, function (t) { return { transform: 'rotate(' + (a0 * (1 - spring(SWING.f, SWING.z, t))).toFixed(3) + 'deg)' }; });
      swing[swing.length - 1] = { transform: 'none' };
      play(x, swing, SWING.secs, OPEN);
    });
    // at rest: the artwork fades in over the parts (a fade, not a swap: the
    // parts and the artwork antialias differently, and a cut "clicks")
    play(fw.querySelector('.fw-final'), [{ opacity: 0 }, { opacity: 1 }], .22, LAND, 'ease');
    play(parts, [{ visibility: 'visible' }, { visibility: 'hidden' }], .01, LAND + .24);
    fw.classList.add('is-in');
    return anims;
  };
  if (/[?&]debug=logo\b/.test(location.search)) window.__sting = sting;
  requestAnimationFrame(function () { sting(fw); });
})();


/* The footer moment (owner, 14 Oct). Hover Play — or tab to it — and the
   footer turns into a little game level:
     1  Ed and Tom (the arcade's pixel art, as js/games/land.js) pop out of
        the top of the footer's logo and take the long way down to their own
        game, using the page as furniture. Ed: out of the T's crossbar, off
        its end and in under the overhang onto the stem, down it like a pole,
        onto the closing line ("Three islands…") and down its lines like
        stairs, then a leap onto the wall of nav boxes and down their left
        edges. Tom: out of the X's right arm, a hop over the notch at its
        top, along the E and the K's arm, down onto Events, across it and
        down the boxes' right edges. Both land on the footer bar either side
        of Play, turn to it and point, and Ed bonks it from below.
     2  then they're yours: click one and he jumps; pick him up and he
        dangles, mouth open; throw or drop him anywhere and he falls onto
        whatever is below, is dizzy for a moment if it was a long way, then
        walks and drops his way back to his spot. Hover Play and both get
        excited. Bring the cursor near and they look at it.
   Once per page, the first time Play is hovered or focused (owner, 14 Oct:
   it was the wordmark printing itself on one visit in ten — the print moved
   to the nav logo). Only where the route fits (from ~1000px: floor either
   side of Play, a gap down each side of the grid). Reduced motion: none of
   it. The rules of their world, and how they were tested, are in
   docs/03-motion.md. */
(function () {
  var mark = document.querySelector('.footer-wordmark');
  var svg = mark && mark.querySelector('.fw');
  var footer = document.querySelector('.footer');
  var trigger = footer && footer.querySelector('.footer-play');
  if (!svg || !trigger || REDUCE) return;
  var started = false;
  var go = function () { if (started || !where()) return; started = true; cast(); };
  trigger.addEventListener('pointerenter', go);
  trigger.addEventListener('focus', go);

  var S = 2, G = 2400, SPEED = 210;   // sprite pixel scale, gravity (px/s²), run speed (px/s)
  var FOOT = 9;                       // half the width of a founder's footing: he stands while it overlaps a surface

  /* ---- the founders --------------------------------------------------------- */
  // Tom and Ed, as in js/games/land.js (keep the two in step), plus a
  // pointing body each: the near arm thrown out level, hand open.
  var FOUNDERS = {
    tom: { cloth: ':',
      head: ['.....######.....', '...##########...', '..###::#######..', '..##############', '..#oooooo######.', '..#o#########o#.', '..#o#oo#o#oo#o#.',
             '..###oo###oo#o#.', '..#o####o####oo#', '..#:ooooooooooo#', '..#::o######o##.', '..#::#oooooo#:#.', '...#::#oooo#::#.', '....##########..'],
      faces: { blink: { 7: '..###########o#.' }, jump: { 6: '..#o#o##o#o##o#.', 11: '..#::########:#.', 12: '...#::##oo##::#.' },
               hurt: { 10: '..#::o:####:o##.', 11: '..#:::#oo#:::#..', 12: '...#::####:::#..' } },
      bodies: {
        idle: ['...##S#TT#S##...', '..#SS#STTS#SS#..', '.#SS##STTS##SS#.', '.#oo#SSTTSS#oo#.', '.####SSTTSS####.', '...##########...', '...####..####...', '..#####..######.'],
        run1: ['...##S#TT#S##...', '..#SS#STTS#S###.', '.#S##SSTTSS#Soo#', '#oo#SSSTTSS##oo#', '####SSSTTSS#.##.', '...##########...', '.#####...#####..', '#####.....######'],
        run2: ['...##S#TT#S##...', '..#SS#STTS#SS#..', '..#S#SSTTSS#S#..', '..#oo#STTS#oo#..', '..####STTS####..', '...##########...', '....######......', '....########....'],
        run3: ['...##S#TT#S##...', '..#SS#STTS#SS#..', '.#SS#SSTTSS#S#..', '.#oo#SSTTSS#oo#.', '.####SSTTSS####.', '...##########...', '...###..#####...', '..####...######.'],
        jump: ['...##S#TT#S###oo', '..#SS#STTS#S##oo', '.#SS#SSTTSS#S##.', '#oo#SSSTTSS#S#..', '####SSSTTSS###..', '...##########...', '..####...######.', '.####.....####..'],
        hurt: ['oo##S#TT#S##oo..', 'oo#SS#STTS#SS#oo', '.#SS#SSTTSS#SS##', '..##SSSTTSSS##..', '...#SSSTTSSS#...', '...##########...', '...####..####...', '..#####..#####..'],
        point: ['...##S#TT#S##...', '..#SS#STTS#S####', '.#SS##STTS#SS#oo', '.#oo#SSTTSS#####', '.####SSTTSS#....', '...##########...', '...####..####...', '..#####..######.']
      } },
    ed: { cloth: '|', bob: [0, -1, 0, -1],
      head: ['........###.#...', '......########..', '...###########..', '..############..', '..##oooooooooo#.', '..#ooooooooooo#.', '..#oo#oooo#ooo#.',
             '..#o#o#oo#o#oo#.', '..#ooooooooooo#.', '..#:o########o#.', '..#::#oooooo#:#.', '...#::######:#..', '....#########...'],
      faces: { blink: { 6: '..#ooooooooooo#.', 7: '..#o###oo###oo#.' }, jump: { 10: '..#::########:#.', 11: '...#::##oo##:#..' },
               hurt: { 5: '..#o#o#oo#o#oo#.', 6: '..#oo#oooo#ooo#.', 7: '..#o#o#oo#o#oo#.', 9: '..#:ooo####ooo#.', 10: '..#::o#oooo#o:#.' } },
      bodies: {
        idle: ['...#SS#ooo#SS#..', '..#SSS#ooo#SSS#.', '.#S##S#ooo#S##S#', '.#ooSS#ooo#SSoo#', '.####S#ooo#S####', '...##########...', '..#####..#####..'],
        run1: ['...#SS#ooo#SS##.', '..#SSS#ooo#S#oo#', '.#S##S#ooo#S#oo#', '#oo#SS#ooo#S###.', '.####S#ooo#S#...', '..###########...', '.#####...######.'],
        run2: ['...#SS#ooo#SS#..', '..#SSS#ooo#SSS#.', '..#S#S#ooo#S#S#.', '..#o#S#ooo#S#o#.', '..###S#ooo#S###.', '....#########...', '....##########..'],
        run3: ['..##SS#ooo#SS#..', '.#oo#S#ooo#SSS#.', '..###S#ooo#SS#S#', '....#S#ooo#S#oo#', '....#S#ooo#S#oo#', '...##########...', '..#####...#####.'],
        jump: ['##..#S#ooo#S#.##', '#o##SS#ooo#SS#o#', '##.#SS#ooo#SS.##', '...#SS#ooo#SS#..', '...###########..', '..####....####..', '.####......####.'],
        hurt: ['#o#.#S#ooo#S##o#', '##..#S#ooo#S#.##', '...#SS#ooo#SS#..', '...#SS#ooo#SS#..', '...###########..', '...#####.#####..', '..######.######.'],
        point: ['...#SS#ooo#SS###', '..#SSS#ooo#SS#oo', '.#S##S#ooo#S####', '.#ooSS#ooo#S#...', '.####S#ooo#S#...', '...##########...', '..#####..#####..']
      } }
  };
  // frame: [body, face]. excited = idle body, the jump face (Tom's "WHOA",
  // Ed's "Wheee!"); held = arms up, the same face; dizzy = hurt
  var FRAMES = { idle: ['idle'], blink: ['idle', 'blink'], run1: ['run1'], run2: ['run2'], run3: ['run3'], jump: ['jump', 'jump'],
    point: ['point'], excited: ['idle', 'jump'], held: ['hurt', 'jump'], dizzy: ['hurt', 'hurt'] };
  var RUN = ['run1', 'run2', 'run3', 'run2'];
  var rows = function (id, f) {
    var F = FOUNDERS[id], head = F.head.slice(0), face = FRAMES[f][1] && F.faces[FRAMES[f][1]];
    if (face) for (var r in face) head[+r] = face[r];
    return head.concat(F.bodies[FRAMES[f][0]]).map(function (row) { return row.replace(/S/g, F.cloth).replace(/T/g, 'o'); });
  };
  var INK, GROUND;
  var colours = function () {
    INK = getComputedStyle(mark).color;
    GROUND = getComputedStyle(footer).getPropertyValue('--t-bg').trim() || '#fff';
  };
  var paint = function (c, f) {
    var g = c.getContext('2d'), R = rows(c.dataset.id, f);
    g.clearRect(0, 0, c.width, c.height);
    R.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var ch = row[x], col = ch === '#' ? INK : ch === 'o' ? GROUND : ch === ':' ? ((x + y) % 2 ? GROUND : INK) : ch === '|' ? (x % 2 ? GROUND : INK) : null;
        if (!col) continue;
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }
    });
  };

  /* ---- the level: where everything is, relative to the footer ------------ */
  var where = function () {
    if (window.innerWidth < 1000) return null;
    var fr = footer.getBoundingClientRect();
    var rel = function (el) { var r = el && el.getBoundingClientRect(); return r && { l: r.left - fr.left, t: r.top - fr.top, r: r.right - fr.left, b: r.bottom - fr.top, w: r.width }; };
    var a = footer.querySelectorAll('.footer-nav a');
    var L = { wm: rel(svg), home: rel(a[0]), events: rel(a[1]), play: rel(footer.querySelector('.footer-play')), lines: rel(footer.querySelector('.footer-lines')),
              contact: rel(footer.querySelector('.footer-contact')), bar: rel(footer.querySelector('.footer-bar')), W: 16 * S, fw: fr.width };
    if (!L.home || !L.events || !L.play || !L.lines || !L.contact || !L.bar) return null;
    L.k = L.wm.w / 304;
    L.X = function (u) { return L.wm.l + u * L.k; };
    L.Y = function (v) { return L.wm.t + v * L.k; };
    L.U = function (u) { return L.X(u) - L.W / 2; };                 // a sprite centred on unit u
    L.top = L.Y(0);                                                  // the logo's top edge
    L.edX = L.play.l - 10 - L.W;                                     // floor, left of Play
    L.tomX = L.play.r + 10;                                          // floor, right of Play
    L.floor = L.bar.t;
    if (L.edX < L.lines.r - 4 || L.edX < L.bar.l) return null;       // no room left of Play
    if (L.contact.l - L.events.r < L.W + 6) return null;             // no gap down the right
    if (L.floor - L.play.b < 0 || L.floor - L.play.b > 140) return null;
    // the footer as the founders' world. Everything you can see is
    // something to stand on: every line of type (from its cap height to its
    // baseline, measured from the face itself), every box with a border, every
    // icon, and the logo's letter tops. Each top counts wherever a founder
    // fits under what's above it (surfFor).
    var metric = {};
    var capOf = function (el) {                                      // a text box's top to [cap top, baseline], px
      var cs = getComputedStyle(el), key = cs.fontStyle + cs.fontWeight + cs.fontFamily;
      if (!metric[key]) {
        var g = document.createElement('canvas').getContext('2d'), m;
        g.font = cs.fontStyle + ' ' + cs.fontWeight + ' 100px ' + cs.fontFamily; m = g.measureText('H');
        metric[key] = m.fontBoundingBoxAscent ? [(m.fontBoundingBoxAscent - m.actualBoundingBoxAscent) / 100, m.fontBoundingBoxAscent / 100] : [.1, .8];
      }
      var fs = parseFloat(cs.fontSize);
      return [metric[key][0] * fs, metric[key][1] * fs];
    };
    var solids = [], tops = [];
    var add = function (o) { solids.push(o); tops.push({ l: o.l, r: o.r, y: o.t, from: o, floor: o.floor }); };
    var rg = document.createRange(), tw = document.createTreeWalker(footer, NodeFilter.SHOW_TEXT), n;
    while ((n = tw.nextNode())) {
      var el = n.parentElement;
      if (!n.textContent.trim() || !el || el.closest('.fw, svg')) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      var off = capOf(el);
      rg.selectNodeContents(n);
      Array.prototype.forEach.call(rg.getClientRects(), function (r) {
        if (r.width < 4 || r.height < 4) return;                    // visually-hidden labels
        add({ l: r.left - fr.left, r: r.right - fr.left, t: r.top - fr.top + off[0], b: r.top - fr.top + off[1], text: true, el: el });
      });
    }
    Array.prototype.forEach.call(footer.querySelectorAll('*'), function (el) {
      if (el.closest('.fw') || el.classList.contains('fw-cast') || (el instanceof SVGElement && el.tagName !== 'svg')) return;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') return;
      var boxed = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
      var glyph = el.tagName === 'svg' || el.tagName === 'IMG' || (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') ||
                  !/^(transparent|rgba\(.*,\s*0\))$/.test(cs.backgroundColor);
      if (!boxed && !glyph) return;
      var r = rel(el);
      if (r.w < 4 || r.b - r.t < 4) return;
      add({ l: r.l, r: r.r, t: r.t, b: r.b, el: el, floor: el.matches('.footer-bar, .footer-mark') });
    });
    solids.push({ l: L.wm.l, r: L.wm.r, t: L.wm.t, b: L.wm.b, logo: true });
    L.logoTops = [[2.74, 109.4], [116.5, 136.1], [157, 255.4], [280.4, 303.4]].map(function (q) { return { l: L.X(q[0]), r: L.X(q[1]), y: L.top, from: solids[solids.length - 1] }; });
    tops = tops.concat(L.logoTops);
    // where a founder of height h can stand. A top counts only where there's
    // room above it: nothing overhead lower than his height (2px of hair
    // aside; for a line of type, measured to its baseline, so a head never
    // sits in the letters). So the nav's top boxes, yes; the tight stack
    // under them, no; the type in the bar, no (the bar's own top, always).
    // Pieces at one height that nearly touch join up, so feet don't drop
    // through a crack.
    L.surfFor = function (h) {
      var out = [];
      tops.forEach(function (c) {
        var spans = [[c.l, c.r]];
        if (!c.floor) solids.forEach(function (o) {
          var need = h - 2;
          if (o === c.from || o.r <= c.l || o.l >= c.r || o.t >= c.y - 1 || o.b <= c.y - need) return;
          var a = o.l - 10, b = o.r + 10, next = [];
          spans.forEach(function (q) {
            if (b <= q[0] || a >= q[1]) { next.push(q); return; }
            if (a > q[0]) next.push([q[0], a]);
            if (b < q[1]) next.push([b, q[1]]);
          });
          spans = next;
        });
        spans.forEach(function (q) { if (q[1] - q[0] >= 6) out.push({ l: q[0], r: q[1], y: c.y, floor: c.floor }); });
      });
      out.sort(function (a, b) { return a.y - b.y || a.l - b.l; });
      return out.reduce(function (acc, q) {
        var last = acc[acc.length - 1];
        if (last && Math.abs(last.y - q.y) < 1 && q.l - last.r < 2 * FOOT) { last.r = Math.max(last.r, q.r); last.floor = last.floor || q.floor; }
        else acc.push({ l: q.l, r: q.r, y: q.y, floor: q.floor });
        return acc;
      }, []);
    };
    // the closing line as stairs for Ed's way down: each line's cap top and ends
    var fl = footer.querySelector('.fl-1'), lines = [];
    solids.forEach(function (o) {
      if (o.el !== fl) return;
      var same = lines.filter(function (q) { return Math.abs(q.t - o.t) < 6; })[0];
      if (same) { same.l = Math.min(same.l, o.l); same.r = Math.max(same.r, o.r); }
      else lines.push({ t: o.t, l: o.l, r: o.r });
    });
    lines.sort(function (a, b) { return a.t - b.t; });
    L.stairs = lines;
    L.fh = fr.height;
    L.solids = solids;
    return L;
  };

  function cast() {
    var L = where();
    if (!L) return;                         // too narrow for the level: the print plays alone
    colours();
    var make = function (id) {
      var c = document.createElement('canvas');
      c.className = 'fw-cast'; c.dataset.id = id; c.setAttribute('aria-hidden', 'true');
      c.width = 16; c.height = FOUNDERS[id].head.length + FOUNDERS[id].bodies.idle.length;
      c.style.width = 16 * S + 'px'; c.style.height = c.height * S + 'px';
      footer.appendChild(c);
      return { id: id, c: c, h: c.height * S, x: 0, y: 0, vx: 0, vy: 0, face: 1, mode: 'hidden', clip: null, steps: [], t: 0, run: 0,
               frame: '', blinkAt: 2 + Math.random() * 2, live: false, homing: false, hover: false, hopAt: -1 };
    };
    var ed = make('ed'), tom = make('tom'), both = [ed, tom];
    both.forEach(function (p) { p.surf = L.surfFor(p.h); });
    var here = 0;
    var hop = function () { var b = footer.querySelector('.footer-play'); if (!b) return; b.classList.remove('is-hop'); void b.offsetWidth; b.classList.add('is-hop'); };
    // the hint to click Play: Ed steps under it and jumps, bonks its
    // underside like an arcade block, and it lights up as if hovered while
    // its letters hop (owner, 14 Oct). Then back to his spot. Where there's
    // no room under it for him, a jump on the spot does the same.
    var playBtn = footer.querySelector('.footer-play');
    var hint = function () {
      if (!playBtn) return;
      playBtn.classList.add('is-hint'); hop();
      setTimeout(function () { playBtn.classList.remove('is-hint'); }, 700);
    };
    var tapPlay = function () {
      if (L.floor - L.play.b < ed.h + 4) return [wait(.25), bump(L.floor - ed.h - 40, hint), face(1)];
      return [wait(.25), run(Math.min(L.play.l + 10, L.play.r - L.W - 10)), face(1), bump(L.play.b, hint), wait(.2), run(L.edX), face(1)];
    };
    var arrive = function () {
      if (++here < 2) return;
      footer.classList.add('has-founders');
      both.forEach(function (p) { p.mode = 'point'; p.t = 0; });
      hop();
    };

    /* the script: each step returns true when finished; the next starts in
       the same frame, so one move hands straight into the next */
    var wait = function (s) { return function (p, dt) { return (p.t += dt) >= s; }; };
    var emerge = function (x, top) {
      return function (p, dt) {
        if (p.mode === 'hidden') { p.x = x; p.y = top + p.h; p.vy = -Math.sqrt(2 * G * (p.h + 22)); p.mode = 'air'; p.clip = top; }
        p.vy += G * dt; p.y += p.vy * dt;
        if (p.vy > 0 && p.y >= top) { p.y = top; p.clip = null; p.mode = 'idle'; return true; }
      };
    };
    // a jump to (tx, ty), leaving at speed `up`: worked out exactly from the
    // clock, not stepped frame by frame — stepping drifts past the landing
    // and snaps back, which showed as a 9px jolt where a leap hands on
    var leap = function (tx, ty, up) {
      return function (p, dt) {
        if (!p.leaping) {
          p.leaping = true; p.o = [p.x, p.y]; p.T = (up + Math.sqrt(up * up + 2 * G * (ty - p.y))) / G; p.vx = (tx - p.x) / p.T; p.t = 0; p.mode = 'air';
          if (Math.abs(tx - p.x) > 4) p.face = tx > p.x ? 1 : -1;
        }
        p.t = Math.min(p.T, p.t + dt);
        p.x = p.o[0] + p.vx * p.t; p.y = p.o[1] - up * p.t + G * p.t * p.t / 2; p.vy = G * p.t - up;
        if (p.t >= p.T) { p.x = tx; p.y = ty; p.mode = 'idle'; p.leaping = false; return true; }
      };
    };
    // in under something: the fall's own speed carried into a curve that
    // dips like a swing and comes up at (x1, y1). It starts on the velocity
    // the last move ended with, so there's no seam where one becomes the other
    var swing = function (x1, y1, dur) {
      return function (p, dt) {
        if (!p.swinging) {
          p.swinging = true; p.t = 0; p.mode = 'air'; var c = dur / 3 * .5;   // half the speed: the catch takes some of it
          p.P = [[p.x, p.y], [p.x + p.vx * c, p.y + p.vy * c], [x1 - (x1 - p.x) * .35, y1 + 14], [x1, y1]];
        }
        p.t += dt; var t = Math.min(1, p.t / dur), u = 1 - t, P = p.P, ox = p.x;
        p.x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
        p.y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
        if (Math.abs(p.x - ox) > .2) p.face = p.x > ox ? 1 : -1;
        if (t >= 1) { p.swinging = false; return true; }
      };
    };
    var run = function (tx) {
      return function (p, dt) {
        p.mode = 'run'; p.face = tx > p.x ? 1 : -1; p.run += dt;
        var d = tx - p.x, step = SPEED * dt;
        if (Math.abs(d) <= step) { p.x = tx; p.mode = 'idle'; return true; }
        p.x += step * p.face;
      };
    };
    // down a pole or a wall: hand on the edge, a steady slide
    var slide = function (y1, xAt, speed, f) {
      return function (p, dt) {
        p.mode = 'pole'; p.face = f;
        p.y = Math.min(y1, p.y + speed * dt);
        p.x = xAt(p.y);
        if (p.y >= y1) { p.mode = 'idle'; return true; }
      };
    };
    // straight up into the underside of something at `ceil` (px), a bonk,
    // and back down where he jumped from; `hit` runs at the bonk
    var bump = function (ceil, hit) {
      return function (p, dt) {
        if (!p.bumping) { p.bumping = true; p.t = 0; p.mode = 'air'; p.o = [p.x, p.y]; p.vy = -Math.sqrt(2 * G * Math.max(6, p.y - p.h - ceil + 3)); p.bonked = false; }
        p.vy += G * dt; p.y += p.vy * dt;
        // the bonk: his head at the underside, or the top of his jump,
        // whichever comes first (stepped frame by frame, a jump can peak a
        // pixel or two short of what was aimed for)
        if (!p.bonked && (p.y - p.h <= ceil || p.vy >= 0)) { if (p.y - p.h < ceil) p.y = ceil + p.h; p.vy = Math.max(p.vy, 80); p.bonked = true; if (hit) hit(); }
        if (p.vy > 0 && p.y >= p.o[1]) { p.y = p.o[1]; p.mode = 'idle'; p.bumping = false; return true; }
      };
    };
    var face = function (f) { return function (p) { p.face = f; return true; }; };
    var then = function (fn) { return function () { fn(); return true; }; };

    var plan = function () {
      var U = L.U, X = L.X, Y = L.Y, top = L.top, W = L.W;
      var under = Y(16.05);                                        // the T's crossbar, underneath
      // the T's stem, its left face at a height in px (the italic slant), and
      // where holding it puts him: hand on it at chest height (11px above
      // his feet), so his feet just meet the slant rather than sink into it
      var stemAt = function (py) { var v = (py - L.wm.t) / L.k; return X(18.9 - (v - 16.05) * (7.91 / 46.37)); };
      var onStem = function (feet) { return stemAt(feet - 11) - W + S; };
      var grabY = under + ed.h + 4;
      // to the crossbar's end, a hop off it that drops him clear past its
      // corner (head level with its underside), and a swing in under the
      // overhang onto the stem: one movement, the head never inside the bar
      var e = [wait(.45), emerge(U(40), top), wait(.15), run(X(2.74) - W * .7),
        leap(X(0) - W - 6, under + ed.h + 2, 280),
        swing(onStem(grabY), grabY, .34),
        slide(Y(62.42), onStem, 320, 1)];
      var stairs = L.stairs.filter(function (q) { return q.t > Y(62.42) && q.r > X(0); });
      var x = onStem(Y(62.42));
      stairs.forEach(function (q, i) {
        var end = q.r - W * .55;
        if (i && end <= x + 4) return;              // a shorter line further down: step past it
        e.push(leap(Math.max(x, q.l), q.t, i ? 120 : 90), run(end));
        x = end;
      });
      var grabL = L.home.l - W + 2 * S;
      e.push(leap(grabL, L.home.t + ed.h + 2, 200), slide(L.floor, function () { return grabL; }, 300, 1), run(L.edX), face(1), then(arrive));
      ed.steps = e;
      var grabR = L.events.r - 2 * S;
      tom.steps = [emerge(U(292), top), wait(.12), run(U(284)), leap(U(249), top, 190), run(U(188)),
        leap(Math.min(Math.max(U(188) - 12, L.events.l + 2), L.events.r - W - 2), L.events.t, 230), run(L.events.r - W - 2),
        leap(grabR, L.events.t + tom.h + 2, 150), slide(L.floor, function () { return grabR; }, 300, -1),
        run(L.tomX), face(-1), then(arrive)];
    };
    plan();

    /* ---- play: theirs to pick up once they've arrived -------------------- */
    var spotOf = function (p) { return p === ed ? L.edX : L.tomX; };
    var homeFace = function (p) { return p === ed ? 1 : -1; };
    var pointer = null, playHot = !!(playBtn && playBtn.matches(':hover'));   // usually what started them
    document.addEventListener('pointermove', function (e) { pointer = [e.clientX, e.clientY]; }, { passive: true });
    if (playBtn) {
      playBtn.addEventListener('pointerenter', function () { playHot = true; });
      playBtn.addEventListener('pointerleave', function () { playHot = false; });
    }
    var fr = function () { return footer.getBoundingClientRect(); };
    // let go of: he falls with the throw. Set down half into something he
    // could stand on (its top somewhere between his feet and his chest), he
    // scrambles up onto it rather than dropping through it
    var letGo = function (p, vx, vy) {
      p.vx = vx; p.vy = vy; p.mode = 'fall'; p.homing = true; p.steps = []; p.chose = false; p.lost = 0;
      p.leaping = p.swinging = p.bumping = false;
      if (Math.abs(vx) + Math.abs(vy) > 400) return;
      var cx = p.x + L.W / 2, up = null;
      p.surf.forEach(function (q) { if (cx + FOOT > q.l && cx - FOOT < q.r && q.y < p.y + 2 && q.y > p.y - p.h * .75 && (!up || q.y < up.y)) up = q; });
      if (up) { p.vx = 0; p.vy = -Math.sqrt(2 * G * (p.y - up.y + 8)); }
    };
    // the other founder is furniture too: drop one on the other and he
    // stands on his head for a moment before hopping down
    var heads = function (p) {
      return both.filter(function (o) { return o !== p && !o.steps.length && /^(idle|walk|dizzy|point)$/.test(o.mode); })
        .map(function (o) { return { l: o.x + 4, r: o.x + L.W - 4, y: o.y - o.h + 1, head: o }; });
    };
    // what stepping off one end of a surface would land him on (dir 1:
    // the right end), allowing for the drift: the first surface he'd cross
    var below = function (p, on, dir) {
      var x0 = dir > 0 ? on.r + FOOT : on.l - FOOT, hit = null;
      p.surf.forEach(function (q) {
        if (q.y <= on.y + 1) return;
        var cx = x0 + dir * 60 * Math.sqrt(2 * (q.y - on.y) / G);
        if (cx + 6 > q.l && cx - 6 < q.r && (!hit || q.y < hit.y)) hit = q;
      });
      return hit;
    };
    // what he's standing on, if anything: a surface under his footing
    var support = function (p) {
      var cx = p.x + L.W / 2;
      return p.surf.concat(heads(p)).filter(function (q) { return Math.abs(q.y - p.y) < 1.5 && cx + FOOT > q.l && cx - FOOT < q.r; })[0];
    };
    var goLive = function (p) {
      p.live = true;
      p.c.style.pointerEvents = 'auto';          // no cursor word: they're simply there to be picked up (owner, 14 Oct)
    };
    both.forEach(function (p) {
      var drag = null;
      // the only hint they're there to be played with: they notice you. A
      // little hop as the cursor arrives, then mouth open, eyes on it, for as
      // long as it stays (owner, 14 Oct: subtle, no cursor word)
      p.c.addEventListener('pointerenter', function () {
        if (!p.live) return;
        p.hover = true;
        if (p.steps.length) return;
        if (p.mode === 'idle' && clock - p.hopAt > .6) { p.hopAt = clock; p.mode = 'fall'; p.vx = 0; p.vy = -250; }
      });
      p.c.addEventListener('pointerleave', function () { p.hover = false; });
      p.c.addEventListener('pointerdown', function (e) {
        if (!p.live) return;
        e.preventDefault();
        try { p.c.setPointerCapture(e.pointerId); } catch (x) {}
        drag = { x: e.clientX, y: e.clientY, moved: false, hist: [] };
      });
      p.c.addEventListener('pointermove', function (e) {
        if (!drag) return;
        if (!drag.moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 5) {
          drag.moved = true; p.mode = 'held'; p.homing = false; p.steps = []; p.c.classList.add('is-held');
        }
        if (!drag.moved) return;
        var f = fr();
        p.x = e.clientX - f.left - L.W / 2;
        p.y = e.clientY - f.top + p.h - 6 * S;                     // held by the scruff
        drag.hist.push([e.clientX, e.clientY, performance.now()]);
        if (drag.hist.length > 6) drag.hist.shift();
      });
      var up = function (e) {
        if (!drag) return;
        var d = drag; drag = null;
        p.c.classList.remove('is-held');
        if (d.moved) {
          // let go: thrown with the pointer's speed over its last 100ms,
          // gently damped. Held still before letting go, he's set down
          var now = performance.now(), h = d.hist.filter(function (q) { return now - q[2] < 100; }), a = h[0], b = h[h.length - 1];
          var dtm = h.length > 1 ? Math.max(16, b[2] - a[2]) : 0;
          letGo(p, dtm ? Math.max(-900, Math.min(900, (b[0] - a[0]) / dtm * 600)) : 0, dtm ? Math.max(-900, Math.min(900, (b[1] - a[1]) / dtm * 600)) : 0);
        } else {
          // a click: he jumps (mid-stride, he keeps going)
          if (p.mode !== 'idle' && p.mode !== 'point' && p.mode !== 'walk') return;
          p.vx = p.mode === 'walk' ? p.face * SPEED : 0; p.vy = -560; p.mode = 'fall'; p.homing = true; p.chose = true;
        }
      };
      p.c.addEventListener('pointerup', up);
      p.c.addEventListener('pointercancel', up);
      p.c.addEventListener('lostpointercapture', up);   // let go outside the window: still let go
    });

    // back in through the top of the screen, straight down onto the nearest
    // of the logo's letters — for anyone who falls out of the bottom of the page
    var dropIn = function (p, cx) {
      var vt = -fr().top, best = null;
      L.logoTops.forEach(function (q) {
        var c = Math.max(q.l + FOOT + 6, Math.min(q.r - FOOT - 6, cx));
        if (best == null || Math.abs(c - cx) < Math.abs(best - cx)) best = c;
      });
      p.x = best - L.W / 2; p.y = Math.min(vt, L.top - 2); p.vx = 0; p.vy = Math.min(Math.max(p.vy, 0), 500); p.mode = 'fall'; p.wraps = (p.wraps || 0) + 1;
    };

    // left to themselves: fall, land, and find the way back to the spot
    var live = function (p, dt) {
      if (p.mode === 'held') return;
      // never lost: the drop tests have everyone home inside 6s, but should
      // anything ever strand one, after 15s he drops back in from the top
      if (p.homing && (p.lost = (p.lost || 0) + dt) > 15) { p.lost = 0; dropIn(p, spotOf(p) + L.W / 2); return; }
      if (!p.homing) p.lost = 0;
      if (p.mode === 'fall') {
        var oy = p.y;
        p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0) { p.x = 0; p.vx = -p.vx * .4; }
        if (p.x > L.fw - L.W) { p.x = L.fw - L.W; p.vx = -p.vx * .4; }
        if (Math.abs(p.vx) > 2) p.face = p.vx > 0 ? 1 : -1;
        if (p.vy > 0) {
          // the first surface he comes down on this frame. Landing takes surer
          // footing than standing (6px each side of centre, not 9), so he
          // never lands teetering with half of himself over an edge
          var cx = p.x + L.W / 2, hit = null;
          p.surf.concat(heads(p)).forEach(function (q) { if (cx + 6 > q.l && cx - 6 < q.r && oy <= q.y + .5 && p.y >= q.y && (!hit || q.y < hit.y)) hit = q; });
          if (hit && hit.head) {
            // a head is a springboard: he bounces off it towards home, and
            // the one underneath winces. (Ed's spot is right under the gap
            // between the T and the K, so Tom, walking off the crossbar,
            // lands on him — the drop tests found it; it stays.)
            p.y = hit.y; p.vy = -330; p.vx = (spotOf(p) > p.x ? 1 : -1) * 130; p.chose = true;
            hit.head.ow = clock + .35;
          } else if (hit) {
            // dizzy only from a fall he didn't choose: thrown or dropped from
            // high up. Stepping off something himself, he lands on his feet
            // (it was half of all drops when every big landing counted)
            var hard = p.vy > 1150 && !p.chose;
            p.y = hit.y; p.vx = 0; p.vy = 0;
            p.mode = hard ? 'dizzy' : 'idle'; p.t = 0;
          } else if (p.y - p.h > L.fh + 10) dropIn(p, cx);   // out of the bottom of the page
        }
        return;
      }
      if (p.mode === 'dizzy') { if ((p.t += dt) > .7 || !support(p)) p.mode = 'idle'; return; }
      if (p.mode === 'walk') {
        var d = p.tx - p.x, step = SPEED * dt;
        p.face = d > 0 ? 1 : -1; p.run += dt;
        if (Math.abs(d) <= step) { p.x = p.tx; p.mode = 'idle'; }
        else p.x += step * p.face;
        // walked off the end of something: straight down, drifting on a
        // little. No hop: a hop cleared the 28px gap between the T and the
        // K and he ping-ponged between them forever (drop tests, 14 Oct)
        if (!support(p)) { p.mode = 'fall'; p.vx = p.face * 60; p.vy = 0; p.chose = true; }
        return;
      }
      if (p.mode === 'point') {
        if ((p.t += dt) > 1.8) { p.mode = 'idle'; goLive(p); if (p === ed) { p.steps = tapPlay(); p.idle = 0; } }
        return;
      }
      // and again whenever he's standing at his spot: a bonk every 5–10s, a
      // new gap each time (owner, 14 Oct) — 4–9s standing, plus the ~1.3s
      // walk under Play and back. Not while someone's at Play or at him
      // already, and not with the footer off screen
      if (p === ed) {
        if (p.homing || p.mode !== 'idle' || p.hover || playHot) p.idle = 0;
        else if ((p.idle = (p.idle || 0) + dt) > (p.gap || (p.gap = 4 + Math.random() * 5))) {
          p.idle = 0; p.gap = 4 + Math.random() * 5;
          var fb = fr();
          if (fb.top < innerHeight && fb.bottom > 0) { p.steps = tapPlay(); return; }
        }
      }
      if (p.mode !== 'idle') return;
      var on = support(p);
      if (!on) { p.mode = 'fall'; p.vx = 0; p.vy = 0; return; }
      var spot = spotOf(p);
      if (p.homing) {
        var sc = spot + L.W / 2, mc = p.x + L.W / 2;
        if (Math.abs(on.y - L.floor) < 1.5 && sc > on.l && sc < on.r) {
          // down on the bar: walk to the spot
          if (Math.abs(p.x - spot) > 1) { p.tx = spot; p.mode = 'walk'; }
          else { p.homing = false; p.face = homeFace(p); }
        } else {
          // up on something: walk off the end on the side of home and drop;
          // if home is straight below, off whichever end is nearer
          var dir = sc > mc ? 1 : -1;
          if (sc > on.l - FOOT && sc < on.r + FOOT) dir = mc - on.l < on.r - mc ? -1 : 1;
          // look before you leap: never off an end with nothing below it but
          // the bottom of the page. (At 1024 Ed's spot is under the logo's
          // left end, which overhangs the bar: he stepped off it, fell out of
          // the page, came back in onto the same letter, and again: 16 times)
          if (!below(p, on, dir) && below(p, on, -dir)) dir = -dir;
          p.tx = (dir > 0 ? on.r + FOOT + 4 : on.l - FOOT - 4) - L.W / 2; p.mode = 'walk';
        }
        return;
      }
      // home and idle: look at the cursor if it comes near, else at Play
      if (pointer && !playHot) {
        var f = fr(), px = pointer[0] - f.left, py = pointer[1] - f.top, cxp = p.x + L.W / 2;
        p.face = Math.abs(px - cxp) < 220 && Math.abs(py - (p.y - p.h / 2)) < 220 && Math.abs(px - cxp) > 6 ? (px > cxp ? 1 : -1) : homeFace(p);
      } else p.face = homeFace(p);
    };

    // ?debug=founders: a handle for testing drops — runs a founder's own
    // physics forward without drawing, from any drop point and throw
    if (/[?&]debug=founders\b/.test(location.search)) window.__moment = {
      L: function () { return L; }, ed: ed, tom: tom, support: support,
      run: function (p, x, y, vx, vy, secs) {
        p.x = x; p.y = y; p.wraps = 0; letGo(p, vx || 0, vy || 0);
        var path = [], t = 0;
        while (t < (secs || 40)) {
          live(p, 1 / 60); t += 1 / 60;
          path.push([p.x, p.y, p.mode]);
          if (!p.homing && p.mode === 'idle') break;
        }
        return { t: t, path: path, wraps: p.wraps, home: !p.homing };
      }
    };

    var frameOf = function (p, now) {
      if (p.mode === 'held') return 'held';
      if (p.mode === 'dizzy' || (p.ow > now && (p.mode === 'idle' || p.mode === 'point'))) return 'dizzy';
      if (p.mode === 'air' || p.mode === 'fall') return 'jump';
      if (p.mode === 'run' || p.mode === 'walk') return RUN[Math.floor(p.run * 10) % 4];
      if (p.mode === 'point' || p.mode === 'pole') return 'point';   // on a pole or wall: an arm out, holding on
      if (p.hover && p.live && p.mode === 'idle') return 'excited';
      if (playHot && p.live && !p.homing) return 'excited';
      return now > p.blinkAt && now < p.blinkAt + .14 ? 'blink' : 'idle';
    };
    var draw = function (p, now) {
      if (p.mode === 'hidden') { p.c.style.visibility = 'hidden'; return; }
      p.c.style.visibility = 'visible';
      var f = frameOf(p, now);
      if (f !== p.frame) { paint(p.c, f); p.frame = f; }
      var bob = ((p.mode === 'run' || p.mode === 'walk') && FOUNDERS[p.id].bob) ? FOUNDERS[p.id].bob[Math.floor(p.run * 10) % 4] * S : 0;
      if (f === 'excited' && playHot && !p.hover) bob = -Math.round(Math.abs(Math.sin(now * 9 + (p === ed ? 0 : 1.4))) * 5);   // little hops of excitement
      p.c.style.transform = 'translate3d(' + Math.round(p.x) + 'px,' + Math.round(p.y - p.h + bob) + 'px,0)' + (p.face < 0 ? ' scaleX(-1)' : '');
      // out of the logo: anything still below its top edge is behind it
      p.c.style.clipPath = p.clip == null ? '' : 'inset(0 0 ' + Math.max(0, Math.min(p.h, p.y - p.clip)) + 'px 0)';
      if (now > p.blinkAt + .14) p.blinkAt = now + 2.5 + Math.random() * 2.5;
    };

    var last = performance.now(), clock = 0, stopped = false;
    var tick = function (ms) {
      var dt = Math.min(.05, (ms - last) / 1000); last = ms; clock += dt;
      both.forEach(function (p) {
        if (p.steps.length) {
          var step = dt;
          while (p.steps.length && p.steps[0](p, step)) { p.steps.shift(); p.t = 0; step = 0; }
        } else live(p, dt);
        draw(p, clock);
      });
      if (!stopped) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // a resize re-places them where they'd stand, or stands them down if
    // the level no longer fits
    var settle = function () {
      var n = where();
      if (!n) { both.forEach(function (p) { p.c.style.visibility = 'hidden'; }); stopped = true; footer.classList.remove('has-founders'); return; }
      L = n;
      both.forEach(function (p) { p.surf = L.surfFor(p.h); });
      both.forEach(function (p) { p.steps = []; p.mode = 'idle'; p.clip = null; p.y = L.floor; p.homing = false; p.leaping = p.swinging = p.bumping = false; if (!p.live) goLive(p); });
      footer.classList.add('has-founders');
      ed.x = L.edX; ed.face = 1; tom.x = L.tomX; tom.face = -1;
      if (stopped) { stopped = false; last = performance.now(); requestAnimationFrame(tick); }
    };
    var rs; window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(settle, 120); });
    document.addEventListener('tekex:reink', function () { colours(); both.forEach(function (p) { p.frame = ''; }); });
  }
})();
