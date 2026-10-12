/* Picks one of the four Tekex colour pairs for this page load.

   This file is INLINED into <head> rather than linked, and it must stay above
   the stylesheet links. It has to run before first paint — a linked or
   deferred script lets the default pair paint first and the swap reads as a
   flash.

   It never repeats the pair the previous load used, so a refresh always
   visibly changes. That is the whole point: "every time you refresh it is a
   different one of the colour pairings, so the site keeps feeling fresh."
   A plain Math.random() would serve the same pair twice in a row about a
   quarter of the time, which just reads as the refresh not working. */
(function () {
  var PAIRS = [
    { cls: 'cw-blue',    chrome: '#FFDC8A' },
    { cls: 'cw-magenta', chrome: '#81FFE7' },
    { cls: 'cw-purple',  chrome: '#D1FFBF' },
    { cls: 'cw-red',     chrome: '#F0BFFF' }
  ];

  var last = null;
  try { last = sessionStorage.getItem('tkx-cw'); } catch (e) {}

  // choose from everything except the pair we served last time
  var pool = PAIRS.filter(function (p) { return p.cls !== last; });
  var pick = pool[Math.floor(Math.random() * pool.length)];

  /* Review hook: ?cw=blue|magenta|purple|red forces a pair, so a layout can
     be checked in all four on purpose rather than by refreshing until the
     right one turns up (qa/pairs.html uses it). Visitors never carry the
     parameter, so the random, never-repeating behaviour is untouched. */
  var forced = /[?&]cw=(blue|magenta|purple|red)\b/.exec(location.search);
  if (forced) pick = PAIRS.filter(function (p) { return p.cls === 'cw-' + forced[1]; })[0];

  document.documentElement.classList.add(pick.cls);
  try { sessionStorage.setItem('tkx-cw', pick.cls); } catch (e) {}

  /* match the mobile browser chrome to the ground, or the status bar sits in
     the wrong pair for the whole visit */
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', pick.chrome);
})();
