/* ==========================================================================
   system.js — the motion engine, extracted verbatim from the Health
   Innovation site. Every value in here was tuned against real feedback;
   do not "improve" the constants without reading docs/03-motion.md first.

   Modules, in load order:
     1. Two-tone dot cursor      (hit-test sampled, EASE = 0.7)
     2. Inertial smooth scroll   (lenis-style, one always-on rAF loop)
     3. Section rule draw        (kicker lines draw in on reach)
     4. Parallax / motif drift
     5. Marquees                 (scrollLeft based, hover never freezes)
     6. Deferred heavy video     (data-src swap on approach)

   Requires on <html>: class="js-cursor" for the cursor to take over, and
   class="js-kicker" for the rule-draw to arm (both are progressive —
   without the classes the page is static but correct).
   ========================================================================== */

/* ===== 1. Two-tone dot cursor ========================================== */
/* Inverted dot cursor */
(function () {
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  var dot = document.createElement('div');
  dot.className = 'cursor-dot is-hidden';
  dot.setAttribute('aria-hidden', 'true');
  /* the dot's word: anything with data-cursor="Read" (or Open, Play) swaps
     the inverting ring for a solid dot carrying the word. Only on targets
     that are wholly clickable — a word that promises a click on dead space
     is worse than none. */
  var word = document.createElement('span');
  word.className = 'cursor-word';
  dot.appendChild(word);
  var said = '';
  document.body.appendChild(dot);
  document.documentElement.classList.add('js-cursor');

  var tx = 0, ty = 0, cx = 0, cy = 0, seen = false;
  /* Anything the enlarged inverting dot should grow over. Add a site-specific
     card or row by giving it data-hot rather than editing this list. */
  var HOT = 'a,button,[role="button"],input,label,summary,[data-hot]';

  /* Relative luminance of whatever is directly beneath the pointer. Video and
     anything with a background image count as dark — that is the b/w footage
     and the audience photo, where pink is the only one of the two that reads. */
  function lum(c) {
    var m = c && c.match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    if (m.length > 3 && parseFloat(m[3]) < 0.35) return null;   // effectively transparent
    var v = [m[0], m[1], m[2]].map(function (n) {
      n = n / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  /* "Dark" means nearer the pair's ink than its ground, so the line sits
     halfway between the two. It was a fixed 0.5, which every pastel ground
     clears easily — but the aubergine pair's fuchsia ground is a mid-tone
     (0.26), so it counted as dark and the dot turned fuchsia on fuchsia and
     vanished (owner, 13 Oct). Re-read when a Reprint changes the pair. */
  var MID = 0.5;
  function hexLum(h) {
    h = (h || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    if (h.length !== 6) return null;
    return lum('rgb(' + [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(',') + ')');
  }
  function readMid() {
    var cs = getComputedStyle(document.documentElement);
    var a = hexLum(cs.getPropertyValue('--brand-ink')), b = hexLum(cs.getPropertyValue('--brand-ground'));
    MID = a !== null && b !== null ? (a + b) / 2 : 0.5;
  }
  readMid();
  document.addEventListener('tekex:reink', readMid);

  function backdropIsDark(x, y) {
    /* Walk the hit-test stack, not the ancestor chain. The film, the scrim and
       the audience photograph are all siblings painted behind the content, so
       they never appear among an element's ancestors — walking upward from the
       headline went straight past the video to the pink on body and kept the
       dot red for the whole of the hero, which is where it most needed to be
       pink. elementsFromPoint returns what is actually stacked under the point,
       topmost first, so the first surface that paints wins. */
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (el === document.documentElement) break;
      var cs = getComputedStyle(el);
      /* icons and logos are drawn as a colour through a mask: glyphs, not
         surfaces, so read past them to what they sit on — over the team's
         mail icon the dot read the icon's ink as a dark backdrop (13 Oct) */
      var mask = cs.maskImage || cs.webkitMaskImage;
      if (mask && mask !== 'none') continue;
      if (el.tagName === 'VIDEO' || cs.backgroundImage !== 'none') return true;
      var l = lum(cs.backgroundColor);
      if (l !== null) return l < MID;
    }
    return false;
  }

  document.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!seen) { cx = tx; cy = ty; seen = true; dot.classList.remove('is-hidden'); }
    dot.classList.toggle('is-hot', !!(e.target.closest && e.target.closest(HOT)));
    var w = e.target.closest && e.target.closest('[data-cursor]');
    var say = w ? w.getAttribute('data-cursor') : '';
    if (w && w.tagName === 'SUMMARY' && w.parentElement.open) say = 'Close';
    if (say !== said) {
      said = say;
      if (say) word.textContent = say;   // keep the old word while it fades out
      dot.classList.toggle('has-word', !!say);
    }
  }, { passive: true });

  document.addEventListener('mouseleave', function () { dot.classList.add('is-hidden'); });
  document.addEventListener('mouseenter', function () { if (seen) dot.classList.remove('is-hidden'); });

  /* The native cursor is hidden, so this dot is the pointer and any easing is
     latency on the thing you aim with. Keep only enough to take the mechanical
     edge off: .7 lands about 7ms — roughly 6px behind at a normal pointer
     speed, under what the eye picks up — against 59ms at the .22 it was
     written with. Anyone who has asked for reduced motion gets none at all. */
  var EASE = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.7;

  var tick = 0;
  (function frame() {
    requestAnimationFrame(frame);
    cx += (tx - cx) * EASE;
    cy += (ty - cy) * EASE;
    dot.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
    /* Every other frame now, not every fourth. While the dot trailed by 59ms
       the swap kept pace with it; now the dot arrives promptly the sampling is
       the slow part, and at 15Hz the colour visibly lagged crossing onto the
       film. 30Hz halves that to about a frame and a half. */
    if (seen && (tick = (tick + 1) % 2) === 0) {
      dot.classList.toggle('on-dark', backdropIsDark(cx, cy));
    }
  })();
})();


/* ===== 2. Inertial smooth scroll ======================================= */
/* Inertial smooth scroll. The wheel moves a target, a single always-on rAF loop
   eases the page toward it. Native scroll-behavior is switched off while this is
   active — leaving it on makes the browser animate every frame we set, which
   reads as stall-then-lurch. Desktop pointers only; touch keeps native inertia. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var docEl = document.documentElement;
  docEl.style.scrollBehavior = 'auto';

  var target = window.scrollY, current = target, applied = target;
  var EASE = 0.085;
  var maxScroll = function () { return Math.max(0, docEl.scrollHeight - window.innerHeight); };
  var clamp = function (v) { return Math.min(maxScroll(), Math.max(0, v)); };

  (function frame() {
    requestAnimationFrame(frame);
    var delta = target - current;
    if (Math.abs(delta) < 0.08) { current = target; return; }
    current += delta * EASE;
    applied = Math.round(current * 100) / 100;
    window.scrollTo(0, applied);
  })();

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return;                                  // pinch-zoom
    var over = e.target.closest &&
      e.target.closest('[data-hscroll],[data-scrolllock]');
    if (over) {
      /* The overlays scroll vertically in their own right, so hand them the
         whole gesture. The three horizontal tracks cannot: they are overflow-y
         hidden and full width, together about 6% of the page. Yielding every
         gesture over them dropped vertical scrolling back to the native path
         mid-flight — instant instead of eased, and the resync below then
         cancelled whatever was still easing, which read as a jump. Yield only
         to a genuinely sideways gesture; vertical is page scrolling and should
         ease here as it does everywhere else. */
      if (over.matches('[data-scrolllock]')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    }
    e.preventDefault();
    target = clamp(target + e.deltaY);
  }, { passive: false });

  // in-page links ease to their destination instead of jumping
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    target = clamp(el.getBoundingClientRect().top + window.scrollY - 116);
  });

  // anything that scrolls the page by other means (keyboard, scrollIntoView,
  // the mobile menu) wins — resync rather than fight it
  window.addEventListener('scroll', function () {
    if (Math.abs(window.scrollY - applied) > 2) { target = current = applied = window.scrollY; }
  }, { passive: true });
  window.addEventListener('resize', function () { target = current = applied = window.scrollY; });
})();


/* ===== 3. Section rule draw ============================================ */
/* Section headers: each rule draws as its section is reached */
(function () {
  var kickers = document.querySelectorAll('.kicker');
  if (!kickers.length || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-kicker');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 1, rootMargin: '0px 0px -12% 0px' });
  kickers.forEach(function (k) { io.observe(k); });
})();


/* ===== 4. Parallax and motif drift ===================================== */
/* Scroll effects: parallax on the full-bleed photos, and subtle scale/rotate/drift
   on the oversized white marks. One rAF loop drives every element. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-fx]'));
  var photos = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  photos.forEach(function (p) {
    els.push(p);
    p.setAttribute('data-fx', 'parallaximg');
    p.setAttribute('data-amt', p.getAttribute('data-parallax') || '34');
  });
  if (!els.length) return;

  // -1 = element still below the fold, 0 = centred, +1 = passed above
  var progress = function (r) {
    var vh = window.innerHeight;
    var centre = r.top + r.height / 2;
    var p = (vh / 2 - centre) / (vh / 2 + r.height / 2);
    return p < -1 ? -1 : p > 1 ? 1 : p;
  };

  var ticking = false;
  var update = function () {
    ticking = false;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
      var p = progress(r);
      var amt = parseFloat(el.getAttribute('data-amt')) || 0;
      switch (el.getAttribute('data-fx')) {
        case 'rotate': el.style.setProperty('--rot', (p * amt).toFixed(2) + 'deg'); break;
        case 'scale': el.style.setProperty('--scl', (1 + p * amt).toFixed(4)); break;
        case 'driftx': el.style.setProperty('--dx', (p * amt).toFixed(1) + 'px'); break;
        case 'parallaximg':
        case 'parallax': el.style.setProperty('--py', (p * amt).toFixed(1) + 'px'); break;
        /* develop: 1 = the image's own colours, 0 = printed in the pair.
           Full colour while the card is within ~15% of centre stage,
           back to the print by ~55% out, smoothstepped between so it
           eases rather than switches (owner, 12 Oct) */
        case 'develop':
          var t = (Math.abs(p) - 0.15) / 0.4;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          el.style.setProperty('--dev', (1 - t * t * (3 - 2 * t)).toFixed(3)); break;
      }
    }
  };
  update();
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
})();


/* ===== 5. Marquees ===================================================== */
/* Marquees: auto-advance by scrollLeft so hover never freezes them, while the
   track stays natively scrollable. Auto-advance yields briefly to real user input. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var init = function (wrap, pxPerSec) {
    if (!wrap) return;
    var track = wrap.firstElementChild;
    if (!track) return;
    // scrollLeft snaps to whole pixels, so keep the true position as a float here —
    // otherwise every marquee would round up to the same 1px-per-frame speed
    var pos = 0, userUntil = 0, last = null;

    wrap.addEventListener('scroll', function () {
      if (Math.abs(wrap.scrollLeft - Math.round(pos)) > 2) {
        userUntil = performance.now() + 900;
        pos = wrap.scrollLeft;
      }
    }, { passive: true });

    var step = function (now) {
      requestAnimationFrame(step);
      if (last === null) { last = now; return; }
      var dt = Math.min(now - last, 50);
      last = now;
      var h = track.scrollWidth / 2;
      if (h <= 0) return;
      if (reduce || now <= userUntil) { pos = wrap.scrollLeft; return; }
      pos += (pxPerSec * dt) / 1000;
      // seamless wrap — the track holds two identical copies
      if (pos >= h) pos -= h; else if (pos < 0) pos += h;
      wrap.scrollLeft = pos;
    };
    requestAnimationFrame(step);
  };
  /* Mark up a marquee as <div data-hscroll data-marquee="46"> where the
     number is px/sec. The inner track must hold TWO identical copies of the
     content for the wrap to be seamless. data-hscroll is what tells the
     smooth-scroll module to yield sideways gestures here. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-marquee]'), function (wrap) {
    init(wrap, parseFloat(wrap.getAttribute('data-marquee')) || 46);
  });
})();

/* ===== 6. Deferred heavy video ========================================= */
/* The hero loop is the single heaviest thing on the page, and with autoplay the
   browser fetches it before first paint no matter what preload says. Hold the
   source back until the page has loaded, so the type lands on the flat ground
   first — which is what the entrance was designed to do anyway — and the film
   arrives into its own bloom rather than delaying everything behind it.
   A film further down (the sign-up band's) waits again, until it is a screen
   away: before 13 Oct every film started at load, 2.6MB on every page for a
   band most visits never reach. And a phone gets data-src-small — the 960px
   cut, 2.1MB against the hero's 6.0MB — which was written into the markup but
   never read. */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('video[data-src]'));
  if (!vids.length) return;
  /* autoplay stays on the element but has nothing to fetch until the source
     arrives, so the browser's own playback machinery still owns starting it —
     including retrying when a background tab is brought forward, which a
     one-shot play() call would miss. */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 900px)').matches;
  var load = function (v) {
    if (v.src) return;
    if (reduce) v.removeAttribute('autoplay');
    v.src = (small && v.dataset.srcSmall) || v.dataset.src;
  };
  var start = function () {
    var io = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '100% 0px' });
    vids.forEach(function (v) {
      if (!io || v.getBoundingClientRect().top < window.innerHeight * 1.5) load(v);
      else io.observe(v);
    });
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();

