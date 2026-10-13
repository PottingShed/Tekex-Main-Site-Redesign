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
/* Smaller cuts on small screens (hero 960px 2.1MB not 1600px 5.8MB; loop
   960px 1.5MB not 1280px 2.5MB).
   Swapped on data-src before system.js reads it at window.load, so the
   deferred-video module is untouched. Safari is flagged for the CSS
   fallback to the hero's film print (see home.css). */
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
  var PAIRS = [['cw-blue', '#FFDC8A'], ['cw-magenta', '#87FFED'], ['cw-purple', '#D1FFBF'], ['cw-red', '#F6C5FF'], ['cw-aubergine', '#FF6EA5']];
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
  var largest = function (img) {
    var best = img.currentSrc || img.src, bw = 0;
    (img.getAttribute('srcset') || '').split(',').forEach(function (c) {
      var m = c.trim().split(/\s+/), w = parseInt(m[1], 10) || 0;
      if (w > bw) { bw = w; best = m[0]; }
    });
    return best;
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
      var hi = new Image(); hi.src = largest(img); hi.onload = function () { big.src = hi.src; };
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
   progress rule. A poster or its "Line-up" link opens that event in the
   list. The choice of view is kept for the visit. */
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
