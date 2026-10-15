"""Builds every page of the site.

    python3 build/build.py

Python 3, standard library only — nothing to install. It writes the site's
HTML files (index.html, about.html, events.html, case-studies.html,
contact.html, journal.html, journal/*.html, events/*.html, play/index.html
and the play.html redirect) as plain static pages, which are committed, so the site
needs no build step to be served: any static host will do.

Don't edit those HTML files by hand — the next build overwrites them. Edit:

    build/pages/index.html   the homepage, as HTML
    build/partials/*.html    the parts every page shares: footer, team,
                             updates (Stay in the loop), get involved, and the
                             print filter. The colour-pair boot script is
                             inlined from js/boot-colourway.js
    build/build.py           the other pages: each has a build_<name>()
                             function below, and their content (events,
                             case studies, team copy) is in it
    build/data/*.json        the events (events.json, checked against
                             events.schema.json), the journal articles (from
                             the old Wix site) and the event history

CSS, JS, fonts and assets are used as they are; nothing here touches them.
"""
import datetime, hashlib, json, re, os, html, math, sys, urllib.parse

BUILD = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BUILD)                       # the site: one level up
DATA = os.path.join(BUILD, 'data')

def read(*path):
    return open(os.path.join(*path), encoding='utf-8').read()

def partial(name):
    return read(BUILD, 'partials', name + '.html').rstrip('\n')

# The colour pair is picked by a script inlined in every <head>, above the
# stylesheets: it must run before first paint or the default pair flashes.
# Its one source is js/boot-colourway.js; the build inlines it without its
# comments (the file is where the reasoning lives).
def boot_script():
    js = read(ROOT, 'js', 'boot-colourway.js')
    js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
    js = re.sub(r'(?m)^[ \t]*//.*\n', '', js)
    js = '\n'.join(l.rstrip() for l in js.splitlines() if l.strip())
    return ('<!-- Colour pair for this load. INLINE and ABOVE the stylesheets on purpose:\n'
            '     it must run before first paint or the default pair flashes. Inlined\n'
            '     from js/boot-colourway.js by build/build.py — edit it there. -->\n'
            '<script>\n' + js + '\n</script>')

BOOT = boot_script()
PRINT_DEFS = partial('print-defs')
FOOTER = partial('footer')
TEAM = partial('team')
UPDATES = partial('updates')
INVOLVED = partial('involved')
WORDMARK = partial('wordmark')    # the nav logo, with the parts it's printed from

def prefix_paths(block, p):
    """re-root relative asset and page links for a page p levels deep"""
    if not p: return block
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if attr == 'srcset':
            val = ', '.join(x.strip() if x.strip().startswith(('http', '#')) else p + x.strip() for x in val.split(','))
        else:
            val = p + val
        return '%s="%s"' % (attr, val)
    # attribute names matched whole (\b), so data-src and data-src-small are
    # handled as themselves rather than by accident through the "src" suffix
    block = re.sub(r'\b(data-src-small|data-src|srcset|src|href)="(?!https?:|mailto:|tel:|#|data:|/)([^"]+)"', fix, block)
    block = re.sub(r"url\('(?!https?:|data:|/)([^']+)'\)", lambda m: "url('%s%s')" % (p, m.group(1)), block)
    return block

def page_links(block, p, here):
    """the homepage's in-page links become cross-page links elsewhere"""
    home = p + 'index.html'
    block = block.replace('href="#top">Home', 'href="%s">Home' % home)
    block = block.replace('href="#team">Contact', 'href="%s">Contact' % ('#team' if here == 'about' else p + 'about.html#team'))
    return block

# Where the site is served. Share images must be absolute URLs that resolve —
# while tekex.co is still the old Wix build, pointing them there 404'd and
# Slack showed an empty card (owner, 12 Oct). AT LAUNCH: set this to
# 'https://www.tekex.co/' and rebuild; every page takes it from here.
SHARE = 'https://lukevidamour.github.io/Tekex-Main-Site-Redesign/'

# The version stamp on every stylesheet and script link (?v=…), so a
# returning visitor never gets new HTML with old CSS (static hosts cache:
# GitHub Pages for ten minutes). It's a fingerprint of the CSS and JS
# themselves, so it changes exactly when they do — nothing to bump by hand.
def fingerprint():
    h = hashlib.sha1()
    for d in ('css', 'js'):
        for dp, dn, fn in sorted(os.walk(os.path.join(ROOT, d))):
            dn.sort()
            for f in sorted(fn):
                if f.endswith(('.css', '.js')):
                    h.update(os.path.relpath(os.path.join(dp, f), ROOT).encode())
                    h.update(open(os.path.join(dp, f), 'rb').read())
    return h.hexdigest()[:10]

VER = fingerprint()

def head(title, desc, canonical, css, p='', jsonld=None, og_image=None, og_alt='TEKEX. Invest. Inspire. Impact. Jersey, Guernsey and the Isle of Man.'):
    og_image = og_image or SHARE + 'assets/og.png'
    links = '\n'.join('<link rel="stylesheet" href="%scss/%s.css?v=%s">' % (p, c, VER) for c in ['tokens', 'base', 'components', 'site'] + css)
    ld = ''.join('\n<script type="application/ld+json">\n%s\n</script>' % json.dumps(j, indent=2, ensure_ascii=False) for j in (jsonld or []))
    return f'''<!DOCTYPE html>
<!-- js-cursor arms the two-tone dot cursor, js-kicker arms the rule-draw.
     Both are progressive: remove them and the page is static but correct. -->
<html lang="en-GB" class="js-cursor js-kicker">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc, quote=True)}">
<meta name="theme-color" content="#FFDC8A">

<meta property="og:type" content="website">
<meta property="og:site_name" content="TEKEX">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{html.escape(desc, quote=True)}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(og_alt, quote=True)}">
<meta name="twitter:image" content="{og_image}">
<meta property="og:url" content="{SHARE}{canonical}">
<link rel="canonical" href="https://www.tekex.co/{canonical}">

{BOOT}

<link rel="preload" href="{p}fonts/PPNeueMontreal-SemiBold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{p}fonts/PPNeueMontreal-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{p}fonts/PPNeueMontreal-Medium.woff2" as="font" type="font/woff2" crossorigin>
{links}
<link rel="icon" href="{p}assets/brand/favicon.svg" type="image/svg+xml">{ld}
</head>'''

def nav(p, here, over=False):
    """The top bar and the phone menu, on every page. On the homepage the
    logo and the menu's Home go to #top rather than reloading the page."""
    def cur(k): return ' aria-current="page"' if k == here else ''
    contact = p + 'contact.html'
    home_href, home_label = ('#top', 'TEKEX, back to top') if here == 'home' else (p + 'index.html', 'TEKEX home')
    # Contact is the button now, not a link (owner, 13 Oct): the rail's
    # Contact and the old Get involved button both led to the Contact page
    items = [('home', home_href, 'Home'), ('events', p + 'events.html', 'Events'), ('about', p + 'about.html', 'About'),
             ('cases', p + 'case-studies.html', 'Case studies'), ('journal', p + 'journal.html', 'Journal')]
    # the desktop rail has no Home: the logo beside it is home (owner, 12 Oct);
    # the phone menu keeps it, as its overlay covers the logo
    links = '\n'.join('        <a href="%s"%s>%s</a>' % (h, cur(k), t) for k, h, t in items if k != 'home')
    mlinks = '\n'.join('    <a href="%s"%s><span aria-hidden="true">%02d</span>%s</a>' % (h, cur(k), i + 1, t) for i, (k, h, t) in enumerate(items))
    ccur = cur('contact')
    return f'''<a class="skip" href="#main">Skip to content</a>

{PRINT_DEFS}

<!-- ================= NAV ================= -->
<!-- The social builds' top bar, as the event site's boxed rail. Only the
     boxes carry the ground — the bar between them stays transparent (a
     filled backdrop outside the boxes was rejected on the event site). The
     logo plays its sting when someone arrives or refreshes (js/site.js). -->
<header class="nav" id="nav"{' data-over' if over else ''}>
  <div class="nav-inner">
    <a class="nav-mark" href="{home_href}" aria-label="{home_label}">{WORDMARK}</a>
    <div class="nav-rail">
      <nav class="th-desktop nav-links" aria-label="Main">
        <!-- no Home link: the logo beside it is home (owner, 12 Oct). The
             phone menu keeps one, because its overlay covers the logo.
             No Contact link either: Contact is the button (owner, 13 Oct) —
             the rail's Contact and the old Get involved button both led to
             the Contact page. -->
{links}
      </nav>
      <span class="th-desktop nav-gap" aria-hidden="true"></span>
      <span class="th-desktop nav-rule" aria-hidden="true"></span>
      <a class="btn btn-outline nav-cta" href="{contact}"{ccur}>Contact <span aria-hidden="true">&rarr;</span></a>
      <button type="button" class="nav-toggle th-mobile" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu">
        <span class="nav-toggle-bars" aria-hidden="true"><i></i><i></i></span>
        <span class="visually-hidden">Menu</span>
      </button>
    </div>
  </div>
</header>

<div class="nav-menu is-punch" id="nav-menu" role="dialog" aria-modal="true" aria-label="Menu" data-scrolllock hidden>
  <button type="button" class="nav-menu-close" id="nav-menu-close" aria-label="Close menu">
    <span aria-hidden="true"></span><span aria-hidden="true"></span>
  </button>
  <nav aria-label="Main">
{mlinks}
  </nav>
  <div class="nav-menu-foot">
    <span class="nav-menu-meta"><span>Jersey</span><span>Guernsey</span><span>Isle of Man</span></span>
    <a class="btn btn-solid" href="{contact}"{ccur}>Contact <span aria-hidden="true">&rarr;</span></a>
  </div>
</div>'''

def kicker(label, num, k_extra=''):
    return f'''    <div class="kicker is-span">
      <span class="k">{label}</span>
      <span class="rule" aria-hidden="true"></span>
      <span class="k k-num" aria-hidden="true">{num:02d}</span>
    </div>'''

def renumber(block, num):
    return re.sub(r'(<span class="k k-num" aria-hidden="true">)\d+(</span>)', r'\g<1>%02d\2' % num, block, count=1)

def footer(p, here):
    f = prefix_paths(FOOTER, p)
    f = f.replace('href="#top">Home', 'href="%sindex.html">Home' % p)
    f = f.replace('href="contact.html">Contact', 'href="%scontact.html">Contact' % p) if p else f
    return f

def tail(p, here):
    return f'''
{footer(p, here)}

<script src="{p}js/site.js?v={VER}" defer></script>
<script src="{p}js/system.js?v={VER}" defer></script>
</body>
</html>
'''

def wordspans(text, start=0):
    out = []
    for i, w in enumerate(text.split()):
        out.append('<span class="hl-w" style="--i:%d">%s</span>' % (start + i, w))
    return ' '.join(out)

# Typesetting (13 Oct, "meticulous attention to detail on typography"): the
# journal and the events archive come from the Wix site and Eventbrite, typed
# on keyboards — straight quotes, hyphens for dashes, three full stops. Every
# generated page passes through this on the way out, text nodes only (tags,
# attributes, scripts and styles are split out and left alone), so the
# sources stay as they were found and a rebuild can never undo it.
_RAW = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<pre\b.*?</pre>|<code\b.*?</code>|<!--.*?-->|<[^>]+>)', re.S | re.I)
def _smart(t):
    if not t.strip():
        return t
    t = t.replace('&#39;', "'").replace('&#x27;', "'").replace('&quot;', '"')
    t = re.sub(r'\.{3,}', '\u2026', t)                                    # ... -> ellipsis
    # spaced hyphen -> spaced en dash. Not an em dash: the long dash reads as
    # machine-written copy (Scarlett, 14 Oct), and the site has none
    t = re.sub(r'(?<=\S) -{1,2} (?=\S)', ' \u2013 ', t)
    t = re.sub(r'(?<![\w/.\-])(\d{1,4}(?:am|pm)?)-(\d{1,4}(?:am|pm)?)(?![\w/\-])', '\\1\u2013\\2', t)  # ranges -> en dash
    t = re.sub(r"(?<=\w)'(?=\w)", '\u2019', t)                           # don't, it's
    t = re.sub(r"(?:^|(?<=[\s(\[\u201c\u2014\u2013]))'(?=\d0s)", '\u2019', t)  # '90s
    t = re.sub(r"(?:^|(?<=[\s(\[\u201c\u2014\u2013]))'(?=\S)", '\u2018', t)     # opening single
    t = t.replace("'", '\u2019')                                       # closing / plural possessive
    t = re.sub(r'(?:^|(?<=[\s(\[\u2018\u2014\u2013]))"(?=\S)', '\u201c', t)     # opening double
    t = t.replace('"', '\u201d')
    t = re.sub(r'\bTekex\b', 'TEKEX', t)                                 # the brand is always caps
    t = re.sub(r'(?<=\S) {2,}(?=\S)', ' ', t)
    return t
def typeset(s):
    parts = _RAW.split(s)
    return ''.join(p if i % 2 else _smart(p) for i, p in enumerate(parts))

BANNER = '<!-- Built by build/build.py. Don\'t edit this file: edit build/ and run  python3 build/build.py -->'

# The 3D forms (assets/motifs/forms/, build/asset-scripts/motifs/forms.py):
# each one's size at 800px wide, and the widths it was saved at. The build is
# standard library only, so it can't read the files; keep this in step with them.
FORMS = {'form-link': (800, 734, (800, 1600)), 'form-zig': (800, 832, (800, 1600)),
         'form-curl': (800, 696, (800,)), 'form-bolt': (800, 903, (800, 1600))}

def mark(name, spin, sizes='(min-width:701px) 46vw, 84vw', p='', cls=''):
    """An oversized mark: a flat white motif (rings, square, tri) or a 3D form
    printed in the pair (css/site.css, .motif-form). No mark twice on a page:
    write() checks."""
    if name not in FORMS:
        return '<span class="th-motif motif motif-%s%s" aria-hidden="true" data-fx="rotate" data-amt="%d"></span>' % (name, cls, spin)
    w, h, ws = FORMS[name]
    srcset = ', '.join('%sassets/motifs/forms/%s-%d.webp %dw' % (p, name, x, x) for x in ws)
    return ('<span class="th-motif motif motif-form%s" style="--ar:%d/%d" aria-hidden="true" data-fx="rotate" data-amt="%d">'
            '<img class="print" src="%sassets/motifs/forms/%s-800.webp" srcset="%s" sizes="%s" width="%d" height="%d" alt="" loading="lazy" decoding="async"></span>'
            % (cls, w, h, spin, p, name, srcset, sizes, w, h))

def check_marks(rel, s):
    """No mark twice on one page (owner, 14 Oct: About had the rings twice).
    A flat motif counts by shape, a 3D form by name; a page that swaps a
    form for a flat mark on small screens (.is-wide / .is-narrow) shows only
    one of the two, but each still counts, so neither may repeat another."""
    marks = re.findall(r'class="th-motif motif motif-(\w+)', s) + re.findall(r'motifs/forms/(form-\w+)-800\.webp"', s)
    marks = [m for m in marks if m != 'form']
    dup = sorted({m for m in marks if marks.count(m) > 1})
    if dup: sys.exit('%s uses the same mark twice: %s' % (rel, ', '.join(dup)))

def write(rel, s, smart=True):
    check_marks(rel, s)
    if smart: s = typeset(s)
    # every built page says so, straight under the doctype
    s = re.sub(r'^(<!DOCTYPE html>\n)', lambda m: m.group(1) + BANNER + '\n', s, count=1, flags=re.I)
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(s)
    print('wrote', rel, len(s), 'bytes')

# ====================================================================== HOME
def build_index():
    """The homepage is written as HTML in build/pages/index.html. Its shared
    parts are <!-- @include name --> markers, filled from build/partials (and
    the boot script, the testimonials from VOICES: <!-- @include voices 08 -->
    for section 08, and the upcoming events from EVENTS: event-cards and their
    structured data, event-ld); {{v}} is the version stamp, {{share}} the
    SHARE origin.
    Typeset by hand, so it skips the typesetting pass the other pages get."""
    page = read(BUILD, 'pages', 'index.html')
    ups = upcoming()
    parts = {'boot': BOOT, 'nav': nav('', 'home', over=True), 'print-defs': PRINT_DEFS, 'footer': FOOTER, 'team': team_section(cta=True), 'updates': UPDATES, 'involved': INVOLVED,
             'event-cards': '\n'.join(ev_card(e) for e in ups),
             'event-ld': ''.join('<script type="application/ld+json">\n%s\n</script>\n' % json.dumps(ev_ld(e), indent=2, ensure_ascii=False) for e in ups).rstrip('\n')}
    def include(m):
        name, num = m.group(1), m.group(2)
        if name == 'voices': return voices_section(int(num or 0))   # from VOICES, numbered for the page
        if name not in parts: sys.exit('build/pages/index.html: no partial called "%s"' % name)
        return parts[name]
    page = re.sub(r'<!-- @include ([\w-]+)(?: (\d+))? -->', include, page)
    # nothing coming up: the empty line shows from the start, script or none
    if not ups: page = page.replace('data-events-empty hidden', 'data-events-empty')
    page = page.replace('{{v}}', VER).replace('{{share}}', SHARE)
    write('index.html', page, smart=False)

# ===================================================================== ABOUT
def build_about():
    team = TEAM
    team = re.sub(r'\s*<!-- voice, 13 Oct review; was "Let’s start a conversation." -->', '', team)
    team = team.replace('<h2 class="h2-display" id="team-h">Introductions are what we do.</h2>', '<h2 class="h2-display" id="team-h">The people behind TEKEX.</h2>')
    team = re.sub(r'<p class="talk-copy">.*?</p>', '<p class="talk-copy">Have a question, an idea or an introduction to make? Speak directly with Ed, Tom, Louis or Jenson about getting involved in the network.</p>', team, flags=re.S)
    team = renumber(team, 5)
    updates = renumber(UPDATES, 7)
    main = f'''<main id="main">

<!-- ================= 01 PAGE HEAD ================= -->
<!-- D3: "Connection should not be left to chance." over existing TEKEX event
     photography. Owner, 12 Oct: one head for every inner page, the same
     height as Events and Journal, with the homepage's poster-on-film feel —
     so it is the shared page head on the ink, a TEKEX room printed behind
     it, and the line set as a fitted two-line poster. The room is IOM2 from
     the mezzanine (owner, 15 Oct: "a stronger image than what is currently
     used" — the C5 / Alt Collective room until then): the whole evening in
     one picture. 1600 at most: printed at .42 under the ink, more pixels
     would only cost load time. -->
<section class="page-head is-photo is-punch" id="top" aria-labelledby="page-title">
  <div class="page-head-media" aria-hidden="true">
    <div class="page-head-move" data-parallax="24">
      <img class="print" src="assets/photography/tekex/iom-room-1600.webp"
        srcset="assets/photography/tekex/iom-room-800.webp 800w, assets/photography/tekex/iom-room-1600.webp 1600w"
        sizes="(max-width:700px) 1010px, 100vw" width="1600" height="978" alt="" fetchpriority="high" decoding="async">
    </div>
  </div>
  <div class="container">
{kicker('About TEKEX', 1)}
    <h1 class="page-title is-lines" id="page-title">
      <span class="hl-line"><span class="hl-w" style="--i:0">Connection</span> <br class="hl-brk-m" aria-hidden="true"><span class="hl-w" style="--i:1">should</span> <span class="hl-w" style="--i:2">not</span></span>
      <span class="hl-line"><span class="hl-w" style="--i:3">be</span> <br class="hl-brk-m" aria-hidden="true"><span class="hl-w" style="--i:4">left</span> <span class="hl-w" style="--i:5">to</span> <span class="hl-w" style="--i:6">chance.</span></span>
    </h1>
    <div class="page-head-foot">
      <div class="page-actions">
        <a class="btn btn-solid" href="index.html#get-involved">Get involved <span aria-hidden="true">&rarr;</span></a>
        <a class="btn btn-outline" href="events.html">Explore events <span aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
  </div>
  <p class="visually-hidden">Photograph: a full room at TEKEX in the Isle of Man, at the Santander Work Cafe in Douglas, watching a speaker at the screen.</p>
</section>

<!-- ================= 02 WHY WE EXIST ================= -->
<section class="sec why" id="why" aria-labelledby="why-h">
  {mark('tri', -12)}
  <div class="container">
{kicker('Why we exist', 2)}
    <div class="split">
      <h2 class="h2-display" id="why-h">The ingredients are here. <br aria-hidden="true">They need connecting.</h2>
      <div class="split-copy">
        <p class="lead">The Crown Dependencies do not lack ambition, capital or expertise. But too often, the people building businesses and the people who could help them grow operate in separate networks.</p>
        <p>TEKEX exists to change that. We make innovation visible, create opportunities for people to meet and help good businesses find the people and resources they need for their next stage.</p>
      </div>
    </div>
  </div>
</section>

<!-- ================= 03 HOW WE WORK ================= -->
<section class="sec how" id="how" aria-labelledby="how-h">
  <!-- the middle of About's oversized marks is one of the 3D forms, printed
       in the pair (owner, 14 Oct); the others stay flat -->
  {mark('form-zig', 8, '(min-width:701px) 42vw, 80vw')}
  <div class="container">
{kicker('How we work', 3)}
    <h2 class="h2-display" id="how-h">The event is the beginning. <br aria-hidden="true">Not the end.</h2>
    <p class="sec-sub">Events give people a reason to meet. The wider value comes through the investment conversations, introductions, shared expertise and partnerships that follow.</p>
    <div class="pillars is-long">
      <article class="pillar th-card" style="--d:0">
        <span class="pillar-icon" aria-hidden="true" style="-webkit-mask-image:url('assets/icons/tekex/visible.svg');mask-image:url('assets/icons/tekex/visible.svg')"></span>
        <h3 class="pillar-title">Make innovation visible.</h3>
        <p class="pillar-body">Give ambitious businesses a platform to share what they are building, and bring fresh ideas and perspectives into the islands.</p>
      </article>
      <article class="pillar th-card" style="--d:1">
        <span class="pillar-icon" aria-hidden="true" style="-webkit-mask-image:url('assets/icons/tekex/together.svg');mask-image:url('assets/icons/tekex/together.svg')"></span>
        <h3 class="pillar-title">Bring people together.</h3>
        <p class="pillar-body">Create opportunities for founders, investors, business leaders and advisers to meet, ask questions and explore where they can help one another.</p>
      </article>
      <article class="pillar th-card" style="--d:2">
        <span class="pillar-icon" aria-hidden="true" style="-webkit-mask-image:url('assets/icons/tekex/forward.svg');mask-image:url('assets/icons/tekex/forward.svg')"></span>
        <h3 class="pillar-title">Help businesses move forward.</h3>
        <p class="pillar-body">Connect businesses with the capital, customers, mentors, expertise and partnerships that can help them take their next step.</p>
      </article>
    </div>
  </div>
</section>

<!-- ================= 04 OUR AMBITION — the page's one punch band ========= -->
<section class="sec ambition is-punch" id="ambition" aria-labelledby="ambition-h">
  <div class="container">
{kicker('Our ambition', 4)}
    <div class="split">
      <div>
        <h2 class="h2-display" id="ambition-h">Three islands. <br aria-hidden="true">A bigger opportunity.</h2>
        <div class="split-copy"><p class="lead">Connecting Jersey, Guernsey and the Isle of Man gives our businesses access to a network larger than any one island, with the collective reach to open doors further afield.</p></div>
      </div>
      <!-- The ambition as a poster (owner, 12 Oct: "feel more like a poster",
           colours inverted): a ground panel pasted on the ink band, the
           punchline stacked letterpress-style with every line fitted to the
           measure (js/site.js, 13), and one entrance when it is reached.
           It is still one sentence for screen readers. -->
      <aside class="ahead" aria-labelledby="ahead-k" data-stack>
        <img class="ahead-photo" src="assets/photography/tekex/surfers-640.webp" srcset="assets/photography/tekex/surfers-640.webp 640w, assets/photography/tekex/surfers-1100.webp 1100w" sizes="(min-width:881px) 40vw, 92vw" width="1100" height="1649" loading="lazy" decoding="async" alt="" aria-hidden="true">
        <span class="ahead-tint" aria-hidden="true"></span>
        <div class="ahead-bar">
          <p class="ahead-k" id="ahead-k"><span aria-hidden="true">&#8600;</span> Looking further ahead</p>
          <span class="ahead-rule" aria-hidden="true"></span>
          <span class="ahead-plus" aria-hidden="true">+</span>
        </div>
        <p class="ahead-line"><span class="ahead-lead">Our long-term ambition is to help make the Crown Dependencies</span> <span class="sl" style="--n:0"><span class="sl-in">the most</span></span> <span class="sl" style="--n:1"><span class="sl-in">innovative</span></span> <span class="sl" style="--n:2"><span class="sl-in">group of</span></span> <span class="sl" style="--n:3"><span class="sl-in">jurisdictions</span></span> <span class="sl" style="--n:4"><span class="sl-in">on earth.</span></span></p>
        <p class="ahead-p">An economy where ambitious ideas are backed, businesses are built and innovation creates jobs and opportunity for the wider community.</p>
        <div class="ahead-bar ahead-sign" aria-hidden="true">
          <span class="ahead-k">Invest. Inspire. Impact.</span>
          <span class="ahead-rule"></span>
          <span class="ahead-wm"></span>
        </div>
      </aside>
    </div>
  </div>
</section>

<!-- ================= 05 TEAM ================= -->
{team}

<!-- ================= 06 WHERE WE ARE (Scarlett, 14 Oct) ================= -->
{islands_section(6, mark('form-curl', 8, '(min-width:701px) 44vw, 80vw'))}

<!-- ================= 07 EVENT UPDATES ================= -->
{updates}

</main>'''
    s = head('About TEKEX | Connection should not be left to chance',
             'TEKEX connects founders, investors and business leaders across Jersey, Guernsey and the Isle of Man. Why we exist, how we work, and the people behind the network.',
             'about.html', ['about'],
             jsonld=[{"@context": "https://schema.org", "@type": "AboutPage", "name": "About TEKEX", "url": "https://www.tekex.co/about.html",
                      "about": {"@type": "Organization", "name": "TEKEX", "url": "https://www.tekex.co/"}}])
    s += '\n<body class="page-about">\n\n' + nav('', 'about', over=True) + '\n\n' + main + tail('', 'about')
    write('about.html', s)

# =================================================================== CONTACT
# ============================================================= WHERE WE ARE
# Addresses from the tekex.co contact page, 12 Oct 2026 (TO CONFIRM). No Isle
# of Man address is listed there; its events run at the Santander Work Cafe.
ISLANDS = [('Jersey', ['3 Mulcaster Street', 'St Helier', 'JE2 3NJ'], 'Ed Prow', 'Founder', 'ed@tekex.co'),
           ('Guernsey', ['Trinity Square', 'St Peter Port', 'GY1 1LX'], 'Louis Pike', 'Guernsey Lead', 'louis@tekex.co'),
           ('Isle of Man', ['Events at the Santander Work Cafe', 'Douglas'], 'Jenson Artus', 'Isle of Man Lead', 'jenson@tekex.co')]

def islands_section(num, where_mark):
    """The three islands, each with its address and who to write to: on
    Contact, and on About after the team (Scarlett, 14 Oct). Its mark comes
    from the page, which knows what it already uses: no mark twice on a page
    (owner, 14 Oct; write() checks)."""
    isl = '\n'.join(f'''      <article class="island" style="--d:{i}">
        <span class="island-icon" aria-hidden="true" style="-webkit-mask-image:url('assets/icons/tekex/island-{n.lower().replace(' ', '-')}.svg');mask-image:url('assets/icons/tekex/island-{n.lower().replace(' ', '-')}.svg')"></span>
        <h3 class="island-name">{n}</h3>
        <p class="island-addr">{' <br>'.join(a)}</p>
        <p class="island-lead"><span>{l}, {r}</span><a href="mailto:{e}">{e}</a></p>
      </article>''' for i, (n, a, l, r, e) in enumerate(ISLANDS))
    return f'''<section class="sec where" id="where" aria-labelledby="where-h">
  {where_mark}
  <div class="container">
{kicker('Where we are', num)}
    <h2 class="h2-display" id="where-h">Three islands. <br aria-hidden="true">One network.</h2>
    <div class="islands-grid">
{isl}
    </div>
  </div>
</section>'''

def build_contact():
    updates = renumber(UPDATES, 4)
    routes = [('Founders', 'Raising capital or ready to grow.', 'Founder%20enquiry'),
              ('Investors', 'Looking for your next opportunity.', 'Investor%20enquiry'),
              ('Businesses', 'Bringing expertise to the ecosystem.', 'Business%20enquiry'),
              ('Partners', 'Helping build the network with us.', 'Partnering%20with%20TEKEX')]
    rows = '\n'.join(f'''        <li><a class="route" href="mailto:hello@tekex.co?subject={s}"><span class="route-k">{k}</span><span class="route-d">{d}</span><span class="route-go" aria-hidden="true">&rarr;</span></a></li>''' for k, d, s in routes)
    main = f'''<main id="main">

<!-- ================= 01 PAGE HEAD ================= -->
<section class="page-head" id="top" aria-labelledby="page-title">
  <span class="th-motif motif motif-square" aria-hidden="true" data-fx="rotate" data-amt="-8"></span>
  <div class="container">
{kicker('Let&rsquo;s talk', 1)}
    <h1 class="page-title" id="page-title"><span class="hl-line">{wordspans('Contact')}</span></h1>
    <p class="page-intro">Have a question, an idea or an introduction to make? Whether you&rsquo;re ready to get involved or simply curious about TEKEX, we&rsquo;d love to hear from you.</p>
  </div>
</section>

<!-- ================= 02 GET IN TOUCH ================= -->
<!-- One inbox (D9: audience links use hello@tekex.co with separate
     subjects), so each route is that inbox with its own subject line. -->
<section class="sec contact" id="get-in-touch" aria-labelledby="contact-h">
  <div class="container">
{kicker('Get in touch', 2)}
    <div class="contact-grid">
      <div class="contact-lead">
        <h2 class="visually-hidden" id="contact-h">Email TEKEX</h2>
        <a class="contact-mail" href="mailto:hello@tekex.co">hello@<br class="cm-brk" aria-hidden="true">tekex.co</a>
        <!-- PLACEHOLDER COPY for approval -->
        <p class="contact-note">One inbox for everything. Tell us a little about you and we&rsquo;ll make sure it reaches the right person.</p>
        <p class="contact-social"><a href="https://www.linkedin.com/company/tekex/" target="_blank" rel="noopener"><span class="social-icon" aria-hidden="true" style="-webkit-mask-image:url('assets/icons/social/linkedin.svg');mask-image:url('assets/icons/social/linkedin.svg')"></span>TEKEX on LinkedIn<span class="visually-hidden"> (opens in a new tab)</span></a></p>
      </div>
      <div>
        <p class="lineup-label">Or start with the right subject</p>
        <ul class="routes" role="list">
{rows}
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- Get involved and the team, which stood here, went 13 Oct (owner: the
     page "should pretty much only be this"): Get involved repeated the
     subject routes above, and the team was its third showing after Home and
     About. Where we are stays — the islands' addresses and who to write to
     in each are found nowhere else. -->

<!-- ================= 03 WHERE WE ARE ================= -->
<!-- Addresses from the tekex.co contact page, 12 Oct 2026 — TO CONFIRM.
     No Isle of Man address is listed there; its events run at the
     Santander Work Cafe in Douglas. -->
{islands_section(3, mark('rings', 10))}

<!-- ================= 04 EVENT UPDATES ================= -->
{updates}

</main>'''
    s = head('Contact | TEKEX', 'Contact TEKEX: email hello@tekex.co, or speak directly with the team in Jersey, Guernsey and the Isle of Man.', 'contact.html', ['contact'],
             jsonld=[{"@context": "https://schema.org", "@type": "ContactPage", "name": "Contact TEKEX", "url": "https://www.tekex.co/contact.html",
                      "about": {"@type": "Organization", "name": "TEKEX", "email": "hello@tekex.co", "url": "https://www.tekex.co/"}}])
    s += '\n<body class="page-contact">\n\n' + nav('', 'contact') + '\n\n' + main + tail('', 'contact')
    write('contact.html', s)


# ===================================================================== 404
def build_404():
    """Page not found (14 Oct audit): a mistyped or old link — the Wix
    site's addresses are still out there — lands on the site's own page, not
    the host's, with the ways back in. GitHub Pages (and most hosts) serve
    404.html for any missing address, at any depth, so its links and assets
    resolve from <base href> — the site's root, SHARE — not from wherever the
    visitor happens to be. noindex: it's nothing a search should list."""
    main = f'''<main id="main">
<section class="page-head" id="top" aria-labelledby="page-title">
  <span class="th-motif motif motif-square" aria-hidden="true" data-fx="rotate" data-amt="-8"></span>
  <div class="container">
{kicker('Page not found', 1)}
    <h1 class="page-title" id="page-title"><span class="hl-line">{wordspans('Off the map.')}</span></h1>
    <div class="page-head-foot">
      <p class="page-intro">That page isn&rsquo;t here. It may have moved when the site did, so these will get you back on course.</p>
      <div class="page-actions">
        <a class="btn btn-solid" href="index.html">Home <span aria-hidden="true">&rarr;</span></a>
        <a class="btn btn-outline" href="events.html">Events</a>
        <a class="btn btn-outline" href="journal.html">Journal</a>
        <a class="btn btn-outline" href="contact.html">Contact</a>
      </div>
    </div>
  </div>
</section>
</main>'''
    s = head('Page not found | TEKEX', 'This page isn’t on the TEKEX site. Find your way back to events, the journal or the team.', '404.html', [])
    s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="%s">\n<meta name="robots" content="noindex">' % SHARE, 1)
    s += '\n<body class="page-404">\n\n' + nav('', '404') + '\n\n' + main + tail('', '404')
    write('404.html', s)


# Event posters are the official Eventbrite artwork (owner, 14 Oct), each
# cropped as its listing displays it (build/asset-scripts/events/process.py)
# and never upscaled, so the sizes differ: most have 600/940/1200, the 2:1
# originals 1880 too, and the two small ones (#16, #21) only 600 and their
# own width. Every srcset is built from the files that exist.
def ev_base(img):
    """an event's artwork is assets/photography/events/<img>-<width>.webp,
    or a path under assets/photography/ when the name has a folder in it
    (IOM3's key art, made for the homepage, is in tekex/)"""
    return 'assets/photography/' + (img if '/' in img else 'events/' + img)
def ev_sizes(img):
    import glob
    ws = sorted(int(re.search(r'-(\d+)\.webp$', f).group(1)) for f in glob.glob(os.path.join(ROOT, ev_base(img) + '-*.webp'))
                if re.search(r'-\d+\.webp$', f))
    if not ws: sys.exit('build/build.py: no artwork at %s-<width>.webp' % ev_base(img))
    return ws
def ev_srcset(img, upto=None):
    ws = [w for w in ev_sizes(img) if upto is None or w <= upto] or ev_sizes(img)[:1]
    return ', '.join('%s-%d.webp %dw' % (ev_base(img), w, w) for w in ws), ws

# ==================================================================== EVENTS
# Every event with a write-up lives in build/data/events.json, one record per
# event in one fixed shape (owner, 15 Oct: "easy to add to a CMS in the future
# by having consistent categories, details"). build/data/events.schema.json
# defines every field and category; a CMS can be set up from it, and nothing
# here builds until the data passes it. Each event gets its own page,
# events/<slug>.html; the ones still to come lead the Events page and the
# homepage; the rest join the archive. Its share image is
# assets/og/events/<slug>.jpg (build/asset-scripts/events/og.py), the site's
# own until that exists.
def check_schema(v, sch, where):
    """the parts of JSON Schema events.schema.json uses: type, enum, pattern,
    required, properties, additionalProperties, items, min/maxItems"""
    bad = []
    t = sch.get('type')
    kinds = {'string': str, 'integer': int, 'array': list, 'object': dict}
    if t and not (isinstance(v, kinds[t]) and not (t == 'integer' and isinstance(v, bool))):
        return ['%s should be %s, not %r' % (where, 'a list' if t == 'array' else 'an ' + t if t[0] in 'aeiou' else 'a ' + t, v)]
    if 'enum' in sch and v not in sch['enum']:
        bad.append('%s is %r: one of %s' % (where, v, ', '.join(sch['enum'])))
    if 'pattern' in sch and isinstance(v, str) and not re.search(sch['pattern'], v):
        bad.append('%s %r is not in the right form (%s)' % (where, v, sch['pattern']))
    if isinstance(v, list):
        if len(v) < sch.get('minItems', 0): bad.append('%s needs at least %d' % (where, sch['minItems']))
        if 'maxItems' in sch and len(v) > sch['maxItems']: bad.append('%s takes at most %d' % (where, sch['maxItems']))
        for i, x in enumerate(v): bad += check_schema(x, sch.get('items', {}), '%s[%d]' % (where, i))
    if isinstance(v, dict):
        props = sch.get('properties', {})
        bad += ['%s needs %s' % (where, k) for k in sch.get('required', []) if k not in v]
        if sch.get('additionalProperties') is False:
            bad += ['%s has %r, which isn\'t a field (a typo?)' % (where, k) for k in v if k not in props]
        for k, x in v.items():
            if k in props: bad += check_schema(x, props[k], '%s.%s' % (where, k))
    return bad

def load_events():
    data = json.load(open(os.path.join(DATA, 'events.json'), encoding='utf-8'))
    schema = json.load(open(os.path.join(DATA, 'events.schema.json'), encoding='utf-8'))
    bad = check_schema(data, schema, 'events')
    slugs = [e.get('slug') for e in data]
    bad += ['%s is used twice' % s for s in sorted({s for s in slugs if slugs.count(s) > 1})]
    for e in data:
        w = e.get('slug', '?')
        if 'series' in e and 'edition' not in e: bad.append('%s: a series needs an edition' % w)
        if 'series' not in e and 'label' not in e: bad.append('%s: without a series it needs a label' % w)
        if e.get('end', 'Z') <= e.get('start', ''): bad.append('%s: it ends before it starts' % w)
    if bad: sys.exit('build/data/events.json:\n  ' + '\n  '.join(bad))
    return [shape_event(e) for e in sorted(data, key=lambda e: e['start'], reverse=True)]

def andlist(xs): return xs[0] if len(xs) == 1 else ', '.join(xs[:-1]) + ' and ' + xs[-1]

def shape_event(e):
    """an events.json record, as the page templates use it"""
    d = datetime.date.fromisoformat(e['start'][:10])
    series = {'TEKEX': '#%d', 'TEKEX IOM': 'IOM%d', 'TEKEX GSY': 'GSY%d'}
    v = e['venue']
    lineup = e.get('lineup', [])
    def credit(p):   # one line for the archive: role, organisation: talk
        line = ', '.join(x for x in (p.get('role'), p.get('organisation')) if x)
        return line + (': ' if line and p.get('talk') else '') + p.get('talk', '')
    desc = list(e['description'])
    if e.get('partners'): desc.append('In collaboration with %s.' % andlist(e['partners']))
    return dict(slug=e['slug'], title=e['title'], lines=e.get('titleLines'), type=e['type'], theme=e.get('theme'),
                num=series[e['series']] % e['edition'] if e.get('series') else e['label'], word=not e.get('series'),
                iso=e['start'], end=e.get('end'), doors=e.get('doors'), date='%d %s' % (d.day, d.strftime('%B %Y')),
                islands=e['islands'], island=andlist(e['islands']),
                venue=', '.join(x for x in (v['name'], v.get('town'), v.get('note')) if x), venue_parts=v,
                strap=e['strap'], desc=desc, people=lineup, lineup=[(p['name'], credit(p)) for p in lineup],
                price=e.get('price'), reg=e.get('registration'), img=e['image']['file'], alt=e['image'].get('alt'), photo=e.get('photo'), note=e.get('note'))

EVENTS = load_events()

# What counts as coming up is decided when the site is built: an event
# stays in What's on until the day after it, then a rebuild moves it to the
# archive. Between rebuilds js/site.js (10) hides it once it has passed, so
# a page can never advertise the past.
TODAY = datetime.date.today().isoformat()
def upcoming(): return sorted((e for e in EVENTS if e['iso'][:10] >= TODAY), key=lambda e: e['iso'])
def is_upcoming(e): return e['iso'][:10] >= TODAY

def ev_when(e):
    """the date as the cards print it, 04/11/26, and the time"""
    y, m, d = e['iso'][:10].split('-')
    return '%s/%s/%s' % (d, m, y[2:]), e['iso'][11:16]

def ev_alt(e): return e.get('alt') or '%s event artwork' % e['title']

def ev_img(e, p='', sizes='100vw', lazy=True, first=False):
    srcset, ws = ev_srcset(e['img'])
    src = [w for w in ws if w <= 1200][-1:] or ws[:1]
    attrs = ' loading="lazy"' if lazy else (' fetchpriority="high"' if first else '')
    return ('<img src="%s%s-%d.webp" srcset="%s" sizes="%s" width="%d" height="%d"%s decoding="async" alt="%s">'
            % (p, ev_base(e['img']), src[0], ', '.join(p + x for x in srcset.split(', ')), sizes, ws[-1], ws[-1] // 2, attrs, html.escape(ev_alt(e))))

def ev_actions(e, p='', page=True):
    """What a visitor can do about an event, the same wherever it appears
    (14 Oct, owner: the labels a visitor would use, not ours). Coming up:
    Register now, which leaves for Eventbrite and says so, then the event's
    page. Past: the page alone; a past event's ticket listing is a dead end,
    so it isn't offered (the sources stay in the data, for the record)."""
    out = []
    if is_upcoming(e) and e.get('reg'):
        out.append(f'''<a class="btn btn-solid event-cta" href="{e['reg']}" target="_blank" rel="noopener">Register now <span aria-hidden="true">&#8599;</span><span class="visually-hidden"> for {html.escape(e['title'])} on Eventbrite (opens in a new tab)</span></a>''')
    if page:
        kind = 'btn-outline' if out else 'btn-solid'
        out.append(f'''<a class="btn {kind} event-cta" href="{p}events/{e['slug']}.html">Event page <span aria-hidden="true">&rarr;</span><span class="visually-hidden">: {html.escape(e['title'])}</span></a>''')
    return '<div class="event-actions">%s</div>' % ''.join(out)

def ev_card(e, p='', dated=True):
    """an event as a card: the homepage's What's on, and More events on an
    event's page. dated cards retire themselves once the event has passed."""
    d, t = ev_when(e)
    return f'''      <article class="event-card"{(' data-event-date="%s"' % e['iso']) if dated else ''}>
        <div class="event-media">
          {ev_img(e, p, '(min-width:1340px) 1240px, 94vw')}
        </div>
        <div class="event-body">
          <p class="event-when"><time datetime="{e['iso']}"><span class="ew-date">{d}</span><span class="ew-sep" aria-hidden="true">/</span><span class="ew-time">{t}</span></time></p>
          <h3 class="event-title">{html.escape(e['title'])}</h3>
          <p class="event-strap">{html.escape(e['strap'])}</p>
          <p class="event-where"><span>{html.escape(e['island'])}</span><span class="sep" aria-hidden="true">/</span><span>{html.escape(e['venue'])}</span></p>
          {ev_actions(e, p)}
        </div>
      </article>'''

COUNTRY = {'Jersey': 'JE', 'Guernsey': 'GG', 'Isle of Man': 'IM'}
def ev_ld(e):
    v = e['venue_parts']
    addr = {"@type": "PostalAddress", "addressRegion": e['island']}
    if v.get('town'): addr['addressLocality'] = v['town']
    if v.get('postcode'): addr['postalCode'] = v['postcode']
    if len(e['islands']) == 1: addr['addressCountry'] = COUNTRY[e['islands'][0]]
    place = {"@type": "Place", "name": v['name'], "address": addr}
    ld = {"@context": "https://schema.org", "@type": "Event", "name": e['title'], "description": e['strap'], "startDate": e['iso'],
          "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": place, "image": ev_og(e), "organizer": {"@type": "Organization", "name": "TEKEX", "url": "https://www.tekex.co/"},
          "url": "https://www.tekex.co/events/%s.html" % e['slug']}
    if e.get('end'): ld['endDate'] = e['end']
    if e['people']: ld['performer'] = [{"@type": "Person", "name": p['name']} for p in e['people']]
    if e.get('reg') and is_upcoming(e):
        ld['offers'] = {"@type": "Offer", "url": e['reg'], "availability": "https://schema.org/InStock"}
        if e.get('price') == 'Free': ld['offers'].update(price=0, priceCurrency='GBP')
        elif (e.get('price') or '').startswith('£'): ld['offers'].update(price=e['price'][1:], priceCurrency='GBP')
    return ld

def ev_og(e):
    """the share image: a 1200x630 JPG (LinkedIn won't show a WebP), or the
    site's own until build/asset-scripts/events/og.py has made one"""
    rel = 'assets/og/events/%s.jpg' % e['slug']
    return SHARE + (rel if os.path.exists(os.path.join(ROOT, rel)) else 'assets/og.png')

def lineup_html(e, indent='          '):
    """a line-up: the name, then role and organisation, then what they spoke on"""
    out = []
    for p in e['people']:
        line = ', '.join(x for x in (p.get('role'), p.get('organisation')) if x)
        out.append(f'{indent}<li><span class="lu-name">{html.escape(p["name"])}</span>'
                   + (f'<span class="lu-role">{html.escape(line)}</span>' if line else '')
                   + (f'<span class="lu-talk">‘{html.escape(p["talk"])}’</span>' if p.get('talk') else '') + '</li>')
    return '\n'.join(out)

def build_events():
    ups = upcoming()
    # The whole record, not just the last two years (owner, 12 Oct): the
    # events above plus everything on TEKEX's Eventbrite since #10 in June
    # 2019, and Gsy #5 from Channel Eye (hist/history.json, built from
    # hist/history.py). Each row links back to its original listing.
    hist = json.load(open(os.path.join(DATA, 'history.json'), encoding='utf-8'))
    for e in EVENTS: e['page'] = True
    past = sorted([e for e in EVENTS if not is_upcoming(e)] + hist, key=lambda e: e['iso'], reverse=True)
    # Event artwork runs unprinted, in its own colours: each event has its own
    # design (owner, 12 Oct).
    # #4–#9 (13 Oct): recovered from the 2018–19 tekex.co, archived by the
    # Wayback Machine — dates, venues and speakers as posted; no artwork or
    # photographs survive. src records the archived page each came from (not
    # shown: a visitor gains nothing from it, 14 Oct). #8 and #9 were written up afterwards (May 2019) without a
    # date, so they are dated by season. Spellings as the pages had them,
    # except Galaxkey's founder, Ricky Magalhaes ("Malghaes" on the page).
    WB = 'https://web.archive.org/web/'
    early = [
        dict(slug='tekex-9', num='#9', title='TEKEX #9', iso='2019-04-15T17:00', date='Spring 2019', venue='Jersey',
             strap='Secure email, aviation software and the crowdfunding question.',
             desc=['Galaxkey and TrustFlight on stage, then updates from two earlier speakers, including where the crowdfunding work with the JFSC and Digital Jersey had got to.'],
             lineup=[('Ricky Magalhaes', 'Galaxkey'), ('Dr Richard Steeves', 'TrustFlight'), ('Robbie Andrews', 'withgoto.com, an update'), ('Ed Daubeney', 'Crowdfunding with the JFSC and Digital Jersey, an update')],
             src=WB + '20190819124138/https://www.tekex.co/events/2019/5/16/tekex-9'),
        dict(slug='tekex-8', num='#8', title='TEKEX #8', iso='2019-02-15T17:00', date='Winter 2019', venue='Jersey',
             strap='A pre-launch, security tokens and the elevator pitch.',
             desc=['Stratton Street in the elevator, a first look at rvoke before it launched, and a talk on security tokens.'],
             lineup=[('Andy Seaman', 'Stratton Street, in the elevator'), ('Gus Fraser', 'rvoke.com, pre-launch'), ('Joachim Merten', 'Security tokens')],
             src=WB + '20190819115640/https://www.tekex.co/events/2019/5/15/tekex-10'),
        dict(slug='tekex-7', num='#7', title='TEKEX #7', iso='2018-11-08T17:00', date='8 November 2018', venue='Infuse Group office, Jersey',
             strap='Artificial intelligence, an investment journey and a pitch in the elevator.',
             desc=['Julian Box, founder of Calligo, on his investment journey and mostly on artificial intelligence, after a pitch in the elevator; then withgoto.com. Beers and snacks, as usual.'],
             lineup=[('Toby Sawyer', 'In the elevator'), ('Julian Box', 'CEO and founder, Calligo'), ('Robbie Andrews', 'withgoto.com')],
             src=WB + '20190719095451/https://www.tekex.co/events/2018/10/6/tekex-7-thursday-8th-november-5pm'),
        dict(slug='tekex-6', num='#6', title='TEKEX #6', iso='2018-07-18T16:00', date='18 July 2018', venue='Infuse Group office, Jersey',
             strap='Drinks, nibbles and two talks.',
             desc=['Julian Gums on his start-up Drop Express, and a talk from Aaron Chatterley.'],
             lineup=[('Julian Gums', 'Drop Express'), ('Aaron Chatterley', '')],
             src=WB + '20190719110153/https://www.tekex.co/events/2018/6/25/tekex-6'),
        dict(slug='tekex-5', num='#5', title='TEKEX #5', iso='2018-05-25T16:00', date='25 May 2018', venue='Lovin’ Spoonful, St Helier',
             strap='Drinks from four, talks, then on to Bastille.',
             desc=['Two talks over drinks at Lovin’ Spoonful, before the evening moved on to Bastille.'],
             lineup=[('Ed Daubeney', ''), ('Tom Hacquoil', '')],
             src=WB + '20190719100126/https://www.tekex.co/events/2018/4/25/tekex-4'),
        dict(slug='tekex-4', num='#4', title='TEKEX #4', iso='2018-04-06T16:00', date='6 April 2018', venue='Project 52, St Helier',
             strap='Short talks, then drinks. Bring a plus one or two.',
             desc=['Short talks from Jenson Nixen and MyKii, followed by networking drinks.'],
             lineup=[('Jenson Nixen', ''), ('MyKii', '')],
             src=WB + '20190719103421/https://www.tekex.co/events/2018/3/19/friday-april-6th-4pm-7pm'),
    ]
    # Their artwork didn't survive; the owner asked (13 Oct) for posters in
    # the 2019 series' own style — the abstract render and "TEKEX #10" of
    # #10–#13 — so #1–#9 have one each, recreated: tekex-01 … tekex-09.
    # The alt text says so.
    for e in early:
        e['island'] = 'Jersey'; e['archived'] = True
        e['img'] = 'tekex-0' + e['num'][1:]
        e['recreated'] = True
    past = sorted(past + early, key=lambda e: e['iso'], reverse=True)
    # #1–#3 left no trace online — the 2018 site's own list began at #4 — so
    # they keep one honest row until the founders fill them in
    past.append(dict(stub=True, slug='tekex-1-3', num='#1–3', title='TEKEX #1 – #3', iso='2018-02-01T17:00', date='Early 2018',
                     strap='Where it started, early 2018, before the website. Records to come.'))
    # archive grouped by year
    years = {}
    for e in past: years.setdefault(e['iso'][:4], []).append(e)
    arch = []
    for y in sorted(years, reverse=True):
        arch.append(f'    <h3 class="past-year">{y}</h3>\n    <ul class="past-list" role="list">')
        for e in years[y]:
            if e.get('stub'):
                arch.append(f'''      <li id="{e['slug']}">
        <div class="past is-stub">
          <span class="past-num" aria-hidden="true">{e['num']}</span>
          <span class="past-date">{e['date']}</span>
          <span class="past-main"><span class="past-title">{html.escape(e['title'])}</span><span class="past-strap">{html.escape(e['strap'])}</span></span>
        </div>
      </li>''')
                continue
            lineup = ''
            if e['lineup']:
                lineup = '\n            <ul class="past-lineup" role="list">\n' + '\n'.join(
                    f'              <li><b>{html.escape(n)}</b>{(", " + html.escape(r)) if r else ""}</li>' for n, r in e['lineup']) + '\n            </ul>'
            paras = '\n'.join(f'            <p>{html.escape(t)}</p>' for t in e['desc'])
            src = ('\n            <p class="past-links"><a href="events/%s.html">Event page <span aria-hidden="true">&rarr;</span><span class="visually-hidden">: %s</span></a></p>'
                   % (e['slug'], html.escape(e['title']))) if e.get('page') else ''
            ss, ws = ev_srcset(e['img'], 940) if e.get('img') else ('', [600])
            art = (f'''<figure class="past-art"><img src="{ev_base(e['img'])}-{ws[-1]}.webp" srcset="{ss}" sizes="(min-width:701px) 46vw, 100vw" width="{ws[-1]}" height="{ws[-1] // 2}" loading="lazy" decoding="async" alt="{html.escape(e['title'])} {'poster, recreated in the style of the 2019 series' if e.get('recreated') else 'event artwork'}"></figure>
            ''') if e.get('img') else ''
            arch.append(f'''      <li id="{e['slug']}">
        <details class="past">
          <summary data-cursor="Open">
            <span class="past-num{' is-word' if e.get('word') or len(e['num']) > 3 else ''}" aria-hidden="true">{e['num']}</span>
            <time class="past-date" datetime="{e['iso']}">{e['date']}</time>
            <span class="past-main"><span class="past-title">{html.escape(e['title'])}</span><span class="past-strap">{html.escape(e['strap'])}</span></span>
            <span class="past-toggle" aria-hidden="true"></span>
          </summary>
          <div class="past-body{'' if e.get('img') else ' is-text'}">
            {art}<div class="past-copy">
              <p class="where">{html.escape(e['venue'])}</p>
{paras}{lineup}{src}
            </div>
          </div>
        </details>
      </li>''')
        arch.append('    </ul>')
    # The gallery (moment 3, 13 Oct; rethought the same day — owner: "like an
    # awwwards-winning digital gallery", and the list first). Every event's
    # poster, newest first, large, one at a time on a full-bleed track you
    # can drag, step or jump through by year; each poster opens its line-up.
    # #1–#3 have one track slide each. 1880px artwork where we have it.
    def art(img, alt):
        srcset, ws = ev_srcset(img)
        top = [w for w in ws if w <= 940] or ws[:1]
        return (f'<img src="{ev_base(img)}-{top[-1]}.webp" srcset="{srcset}" sizes="(min-width:1100px) 760px, 84vw" '
                f'width="940" height="470" loading="lazy" decoding="async" alt="{html.escape(alt)}">')
    slides, total = [], 0
    for y in sorted(years, reverse=True):
        for e in years[y]:
            if e.get('stub'):
                group = [(f'#{n}', f'TEKEX #{n}', 'Early 2018', 'Jersey', 'tekex-0%d' % n, e['slug'], f'TEKEX #{n} poster, recreated in the style of the 2019 series', False) for n in (3, 2, 1)]
            else:
                alt = f"{e['title']} {'poster, recreated in the style of the 2019 series' if e.get('recreated') else 'event artwork'}"
                group = [(e['num'] if len(e['num']) <= 7 else '', e['title'], e['date'], e.get('island', ''), e['img'], e['slug'], alt, e.get('page'))]
            for num, title, date, isle, img, slug, alt, *page in group:
                total += 1
                where = (' &middot; ' + html.escape(isle)) if isle else ''
                slides.append(f'''      <li class="gal-slide" data-gal-yr="{y}">
        <a class="gal-poster" href="#{slug}" data-to="{slug}" tabindex="-1" aria-hidden="true">{art(img, alt)}</a>
        <div class="gal-cap">
          <span class="gal-num" aria-hidden="true">{html.escape(num)}</span>
          <p class="gal-meta"><b>{html.escape(title)}</b><span>{html.escape(date)}{where}</span></p>
          {(f'<a class="gal-link" href="events/{slug}.html">Event page <span aria-hidden="true">&rarr;</span><span class="visually-hidden">: {html.escape(title)}</span></a>') if page and page[0] else (f'<a class="gal-link" href="#{slug}" data-to="{slug}">Details <span aria-hidden="true">&rarr;</span><span class="visually-hidden">: {html.escape(title)}</span></a>')}
        </div>
      </li>''')
    yrs = '\n'.join(f'        <li><button type="button" data-gal-year="{y}">{y}</button></li>' for y in sorted(years, reverse=True))
    archive = f'''    <div class="arch" data-arch>
    <div class="arch-views" role="group" aria-label="Show the archive as">
      <button type="button" data-view="list" aria-pressed="true">List</button>
      <button type="button" data-view="gallery" aria-pressed="false">Gallery</button>
    </div>
    <div class="arch-gallery">
      <div class="gal-bar">
        <ol class="gal-years" role="list" aria-label="Jump to a year">
{yrs}
        </ol>
        <div class="gal-ctrl">
          <p class="gal-count"><b data-gal-at>01</b><span>/ {total:02d}</span></p>
          <button type="button" class="gal-btn" data-gal-step="-1" aria-label="Previous poster"><span aria-hidden="true">&larr;</span></button>
          <button type="button" class="gal-btn" data-gal-step="1" aria-label="Next poster"><span aria-hidden="true">&rarr;</span></button>
        </div>
      </div>
      <ol class="gal-track" data-gal-track data-hscroll data-cursor="Drag" tabindex="0" role="list" aria-label="Every TEKEX event poster, newest first. Use the arrow keys to move.">
''' + '\n'.join(slides) + '''
      </ol>
      <div class="gal-progress" aria-hidden="true"><i data-gal-progress></i></div>
    </div>
    <div class="arch-list">
''' + '\n'.join(arch) + '''
    </div>
    </div>'''
    updates = renumber(UPDATES, 4)
    updates = updates.replace('<h2 class="h2-display" id="updates-h">Stay in the loop.</h2>', '<h2 class="h2-display" id="updates-h">Hear about the next one first.</h2>')
    main = f'''<main id="main">

<!-- ================= 01 PAGE HEAD ================= -->
<section class="page-head" id="top" aria-labelledby="page-title">
  <span class="th-motif motif motif-rings" aria-hidden="true" data-fx="rotate" data-amt="10"></span>
  <div class="container">
{kicker('Meet. Connect. Discover.', 1)}
    <h1 class="page-title" id="page-title"><span class="hl-line">{wordspans('Events')}</span></h1>
    <!-- copy: Scarlett, 14 Oct -->
    <p class="page-intro">Founders and industry experts on stage, investors and curious minds in the room, and the networking conversations that&nbsp;follow.</p>
  </div>
</section>

<!-- ================= 02 NEXT UP ================= -->
<!-- Every event still to come (EVENTS, decided at build time), each as the
     homepage's feature card plus its full details. data-event-date retires
     one automatically once it has passed (js/site.js), and the empty line
     takes the section's place when none are left. -->
<section class="sec events" id="upcoming" aria-labelledby="upcoming-h">
  <div class="container">
{kicker('Next up', 2)}
    <!-- a visible heading (Scarlett, 14 Oct: "add in a What's on? or Upcoming
         events title"); it had been hidden to keep the event above the fold
         on a 1280×720 laptop. When nothing is coming up, the empty line says so. -->
    <h2 class="h2-display upcoming-h" id="upcoming-h">What&rsquo;s on</h2>
    <p class="events-empty" data-events-empty{' hidden' if ups else ''}>There aren&rsquo;t any upcoming events right now. Read about <a href="#past">previous events</a> below, or <a href="#updates">stay in the loop</a> to hear about the next one first.</p>
{chr(10).join(upcoming_block(e) for e in ups)}
  </div>
</section>

<!-- ================= 03 PAST EVENTS ================= -->
<!-- From the tekex.co events listing and each event's page, 12 Oct 2026.
     Write-ups are the originals, trimmed and put into the past tense where
     they were announcements; obvious typos fixed. -->
<section class="sec archive" id="past" aria-labelledby="past-h">
  <span class="th-motif motif motif-square" aria-hidden="true" data-fx="rotate" data-amt="-8"></span>
  <div class="container">
{kicker('Past events', 3)}
    <h2 class="h2-display" id="past-h">The story so far.</h2>
    <p class="sec-sub">More than fifty evenings since 2018, in Jersey, Guernsey and the Isle of&nbsp;Man and, for a year, online. Open any one for the full story.</p>
{archive}
  </div>
</section>

<!-- ================= 04 EVENT UPDATES ================= -->
{updates}

</main>'''
    s = head('Events | TEKEX', 'TEKEX events across Jersey, Guernsey and the Isle of Man: what is coming up next, and every event so far.', 'events.html', ['events'], jsonld=[ev_ld(e) for e in ups])
    s += '\n<body class="page-events">\n\n' + nav('', 'events') + '\n\n' + main + tail('', 'events')
    write('events.html', s)
    build_event_pages()

def upcoming_block(e):
    """an event still to come, on the Events page: the feature card, then its
    write-up and line-up beside each other"""
    d, t = ev_when(e)
    desc = '\n'.join('          <p%s>%s</p>' % (' class="lead"' if i == 0 else '', html.escape(x)) for i, x in enumerate(e['desc']))
    note = ('\n          <p class="event-note">%s</p>' % html.escape(e['note'])) if e.get('note') else ''
    lineup = (f'''
        <div>
          <p class="lineup-label">Line-up</p>
          <ul class="lineup" role="list">
{lineup_html(e)}
          </ul>
        </div>''') if e['lineup'] else ''
    return f'''    <div id="{e['slug']}" data-event-date="{e['iso']}">
      <div class="events-grid">
        <article class="event-card">
          <div class="event-media">
            {ev_img(e, '', '(min-width:1340px) 1240px, 94vw', lazy=False)}
          </div>
          <div class="event-body">
            <p class="event-when"><time datetime="{e['iso']}"><span class="ew-date">{d}</span><span class="ew-sep" aria-hidden="true">/</span><span class="ew-time">{t}</span></time></p>
            <h3 class="event-title">{html.escape(e['title'])}</h3>
            <p class="event-strap">{html.escape(e['strap'])}</p>
            <p class="event-where"><span>{html.escape(e['island'])}</span><span class="sep" aria-hidden="true">/</span><span>{html.escape(e['venue'])}</span>{('<span class="sep" aria-hidden="true">/</span><span>' + html.escape(e['price']) + '</span>') if e.get('price') else ''}</p>
            {ev_actions(e)}
          </div>
        </article>
      </div>
      <div class="event-detail{'' if e['lineup'] else ' is-solo'}">
        <div class="event-desc">
{desc}{note}
        </div>{lineup}
      </div>
    </div>'''

def build_event_pages():
    """events/<slug>.html for every event in EVENTS (Scarlett, 14 Oct: "how
    we'd link to the specific event on the website, rather than the main
    event page", for social posts). Built like a journal article: the head
    names it, the Events page's feature card carries the artwork, when,
    where and what to do next, then the write-up and line-up, a share bar,
    and three more events to go on to."""
    evs = sorted(EVENTS, key=lambda e: e['iso'], reverse=True)
    p = '../'
    for i, e in enumerate(evs):
        d, t = ev_when(e)
        up = is_upcoming(e)
        # the title as a poster, broken where the name and theme meet;
        # the colon is kept for screen readers only
        lines = e.get('lines') or e['title'].split(': ')
        h1, n = [], 0
        for k, ln in enumerate(lines):
            colon = '<span class="visually-hidden">:</span>' if ': ' in e['title'] and k < len(lines) - 1 else ''
            h1.append('<span class="hl-line">%s%s</span>' % (wordspans(html.escape(ln), n), colon))
            n += len(ln.split())
        # what a visitor can do: register while it's coming up. Once it has
        # passed the page says so plainly and points to what's coming up, as
        # anyone arriving from an old post needs to know; for the event
        # that's still to come, js/site.js (10) makes that swap the day after
        passed = ('''<div class="event-passed"%s><p class="event-status">This event has passed</p>
            <a class="btn btn-outline event-cta" href="../events.html#upcoming">Upcoming events <span aria-hidden="true">&rarr;</span></a></div>''')
        if up and e.get('reg'):
            cta = (f'''<a class="btn btn-solid event-cta" href="{e['reg']}" target="_blank" rel="noopener" data-event-date="{e['iso']}">Register now <span aria-hidden="true">&#8599;</span><span class="visually-hidden"> on Eventbrite (opens in a new tab)</span></a>
            ''' + passed % (' data-event-after="%s" hidden' % e['iso']))
        elif up:
            cta = '''<div class="event-passed"><p class="event-status">Registration opens soon</p>
            <a class="btn btn-outline event-cta" href="#updates">Get updates <span aria-hidden="true">&rarr;</span></a></div>'''
        else:
            cta = passed % ''
        desc = '\n'.join('          <p%s>%s</p>' % (' class="lead"' if k == 0 else '', html.escape(x)) for k, x in enumerate(e['desc']))
        note = ('\n          <p class="event-note">%s</p>' % html.escape(e['note'])) if e.get('note') else ''
        lineup = (f'''
        <div>
          <p class="lineup-label">Line-up</p>
          <ul class="lineup" role="list">
{lineup_html(e)}
          </ul>
        </div>''') if e['lineup'] else ''
        # a photograph of the event itself, once there is one (events.json:
        # photo): full width under the write-up, in the card's frame and the
        # artwork's 2:1, in its own colours, credited to whoever took it
        photo = ''
        if e.get('photo'):
            ph = e['photo']
            srcset, ws = ev_srcset(ph['file'])
            cap = ('\n      <figcaption>Photograph: %s</figcaption>' % html.escape(ph['credit'])) if ph.get('credit') else ''
            photo = ('\n    <figure class="ev-photo">\n      <img src="%s%s-%d.webp" srcset="%s" sizes="(min-width:1340px) 1240px, 94vw" '
                     'width="%d" height="%d" loading="lazy" decoding="async" alt="%s">%s\n    </figure>'
                     % (p, ev_base(ph['file']), ([w for w in ws if w <= 1600] or ws)[-1], ', '.join(p + x for x in srcset.split(', ')),
                        ws[-1], ws[-1] // 2, html.escape(ph['alt']), cap))
        share_url = SHARE + 'events/%s.html' % e['slug']
        li_href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + urllib.parse.quote(share_url, safe='')
        # the three nearest events in time, so the page leads on to others
        near = sorted((x for x in evs if x is not e), key=lambda x: abs(evs.index(x) - i))[:3]
        more = '\n'.join(ev_card(x, p, dated=False) for x in sorted(near, key=lambda x: x['iso'], reverse=True))
        updates = prefix_paths(renumber(UPDATES, 3), p)
        updates = updates.replace('<h2 class="h2-display" id="updates-h">Stay in the loop.</h2>', '<h2 class="h2-display" id="updates-h">Hear about the next one first.</h2>')
        # each page its own mark, at the Events head's oversize scale: the
        # three in use (the asterisk is retired), each with its usual spin
        mark, spin = [('rings', 10), ('tri', -12), ('square', -8)][i % 3]
        main = f'''<main id="main">

<!-- ================= 01 PAGE HEAD ================= -->
<section class="page-head ev-head" id="top" aria-labelledby="page-title">
  <span class="th-motif motif motif-{mark}" aria-hidden="true" data-fx="rotate" data-amt="{spin}"></span>
  <div class="container">
    <div class="kicker is-span">
      <a class="k" href="../events.html">Events</a>
      <span class="rule" aria-hidden="true"></span>
      <span class="k">{html.escape(e['island'])}</span>
    </div>
    <h1 class="page-title{' is-2' if len(lines) > 1 else ''}" id="page-title">{''.join(h1)}</h1>
    <p class="page-intro">{html.escape(e['strap'])}</p>
  </div>
</section>

<!-- ================= THE EVENT ================= -->
<!-- The Events page's feature card, its bar trimmed to when, where and what
     to do next: the name and strap are already in the head. -->
<section class="sec ev-sec" aria-label="{html.escape(e['title'])}: when, where and the line-up">
  <div class="container">
    <div class="events-grid">
      <div class="event-card is-page">
        <div class="event-media">
          {ev_img(e, p, '(min-width:1340px) 1240px, 94vw', lazy=False, first=True)}
        </div>
        <div class="event-body">
          <p class="event-when"><time datetime="{e['iso']}"><span class="ew-date">{d}</span><span class="ew-sep" aria-hidden="true">/</span><span class="ew-time">{t}{('&ndash;' + e['end'][11:16]) if e.get('end') else ''}</span></time><span class="visually-hidden">, {e['date']}</span></p>
          <p class="event-venue">{html.escape(e['venue'])}</p>
          <p class="event-where"><span>{html.escape(e['island'])}</span>{('<span class="sep" aria-hidden="true">/</span><span>' + html.escape(e['price']) + '</span>') if e.get('price') else ''}{('<span class="sep" aria-hidden="true">/</span><span>Doors ' + e['doors'] + '</span>') if e.get('doors') else ''}</p>
          <div class="event-actions">{cta}</div>
        </div>
      </div>
    </div>
    <div class="event-detail{'' if e['lineup'] else ' is-solo'}">
      <div class="event-desc">
{desc}{note}
      </div>{lineup}
    </div>{photo}
    <div class="ev-foot">
      <a href="../events.html"><span aria-hidden="true">&larr;</span>&nbsp;All events</a>
      <div class="art-share"><span class="share-k" aria-hidden="true">Share</span>
        <a class="share-btn" href="{html.escape(li_href)}" target="_blank" rel="noopener" aria-label="Share this event on LinkedIn (opens in a new tab)"><span class="social-icon" style="-webkit-mask-image:url('../assets/icons/social/linkedin.svg');mask-image:url('../assets/icons/social/linkedin.svg')" aria-hidden="true"></span></a>
        <button class="share-btn" type="button" data-copy="{share_url}" hidden aria-label="Copy the link to this event"><span class="social-icon" style="-webkit-mask-image:url('../assets/icons/tekex/link.svg');mask-image:url('../assets/icons/tekex/link.svg')" aria-hidden="true"></span></button>
        <span class="share-note" role="status"></span>
      </div>
      <a href="#top">Back to top <span aria-hidden="true">&uarr;</span></a>
    </div>
  </div>
</section>

<!-- ================= 02 MORE EVENTS ================= -->
<section class="sec events ev-more" aria-labelledby="more-h">
  <div class="container">
{kicker('More events', 2)}
    <div class="sec-head">
      <h2 class="h2-display" id="more-h">More evenings like this.</h2>
      <a class="link-arrow" href="../events.html">All events <span aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="events-grid">
{more}
    </div>
  </div>
</section>

<!-- ================= 03 EVENT UPDATES ================= -->
{updates}

</main>'''
        title = '%s, %s | TEKEX Events' % (e['title'], e['date'])
        desc_meta = '%s %s at %s.' % (e['strap'], e['date'], e['venue'])
        s = head(title, desc_meta, 'events/%s.html' % e['slug'], ['events'], p=p, jsonld=[ev_ld(e)], og_image=ev_og(e), og_alt=ev_alt(e))
        s += '\n<body class="page-event">\n\n' + nav(p, 'events') + '\n\n' + main + tail(p, 'events')
        write('events/%s.html' % e['slug'], s)

# =================================================================== JOURNAL
POSTS_META = {
 'tekex-health-innovation-jersey': dict(cover='../assets/photography/tekex/audience', cw=[800, 1400, 2400], ar=(2400, 1351), alt='The TEKEX Health Innovation Jersey audience applauding'),
 'tekex-female-founders-event-sparks-powerful-community-support-for-next-generation-of-innovators': dict(cover='../assets/photography/tekex/event-room', cw=[800, 1600], ar=(1600, 1200), alt='The TEKEX #35 Female Founders audience at the C5 hub'),
 'insert-affiliate-born-from-the-challenges-of-promoting-an-app': dict(cover='../assets/photography/journal/insert-affiliate-wide', cw=[800, 1600], ar=(1600, 1200), alt='Illustration for Insert Affiliate'),
 'how-do-i-know-if-i-have-a-good-idea-for-a-startup': dict(cover='../assets/photography/journal/how-do-i-know-if-i-have-a-good-idea-for-a-startup', cw=[800, 1400], ar=(1400, 934), alt='A man in a suit and a hat with a light bulb on top, pointing upward'),
 'do-you-need-a-physical-presence-to-launch': dict(cover='../assets/photography/journal/do-you-need-a-physical-presence-to-launch', cw=[800, 1400], ar=(1400, 1048), alt='A founder working at a desk in a wooden barn'),
 'covid-19-driving-the-pace-of-innovation': dict(cover='../assets/photography/journal/covid-19-driving-the-pace-of-innovation', cw=[800, 1400], ar=(1400, 788), alt='A crumpled ball of paper beside a folded paper aeroplane'),
 'more-success-for-redshield': dict(cover='../assets/photography/journal/more-success-for-redshield', cw=[800, 1400], ar=(1400, 788), alt='Redshield promotional image'),
 'the-positive-outcomes-of-covid': dict(cover='../assets/photography/journal/the-positive-outcomes-of-covid', cw=[800, 1400], ar=(1400, 788), alt='A coffee mug on a wooden table'),
}
MONTHS = dict(Jan=1, Feb=2, Mar=3, Apr=4, May=5, Jun=6, Jul=7, Aug=8, Sep=9, Sept=9, Oct=10, Nov=11, Dec=12)

def clean_post(slug, blocks):
    """normalise the Wix export into clean article markup"""
    title = re.sub(r'<[^>]+>', '', blocks[0]['html']).strip()
    rest = [b for b in blocks[1:] if b['t'] != 'img']
    # the Wix export put an empty twin before some links (<a href=x></a><a
    # href=x>x</a>): invisible, but a screen reader announces a nameless link
    for b in rest: b['html'] = re.sub(r'<a\b[^>]*>\s*</a>', '', b['html'])
    date_txt = re.sub(r'<[^>]+>', '', rest[0]['html']).strip(); rest = rest[1:]
    d, mon, y = date_txt.split(); iso = '%s-%02d-%02d' % (y, MONTHS[mon], int(d))
    # heading levels: the post's first heading level becomes h2, the next h3
    levels = sorted({b['t'] for b in rest if re.match(r'h\d', b['t'])})
    hmap = {lv: ('h2' if i == 0 else 'h3') for i, lv in enumerate(levels)}
    out = []
    i = 0
    while i < len(rest):
        b = rest[i]; t = b['t']; h = b['html']
        if t in hmap:
            out.append((hmap[t], re.sub(r'</?strong>', '', h).strip())); i += 1; continue
        if t == 'li':
            items = []
            while i < len(rest) and rest[i]['t'] == 'li':
                items.append(re.sub(r'^\[ \]\s*', '', rest[i]['html']).strip()); i += 1
            out.append(('ul', items)); continue
        # paragraphs: a bold-only paragraph is a subhead; blank-line runs split
        plain = re.sub(r'<[^>]+>', '', h).strip()
        if re.fullmatch(r'\s*<strong>[^<]*</strong>\s*', h) and len(plain) < 90 and slug != 'covid-19-driving-the-pace-of-innovation':
            out.append(('h2', plain)); i += 1; continue
        for part in re.split(r'\n\s*\n+', h):
            part = part.strip().replace('\n', '<br>')
            if part: out.append(('p', part))
        i += 1
    # per-post editorial fixes, recorded so the next person knows why
    if slug == 'covid-19-driving-the-pace-of-innovation':
        new = []
        for k, (t, v) in enumerate(out):
            if t == 'p' and v.startswith('“Be fearful'):
                cite = re.sub(r'<[^>]+>', '', out[k + 1][1]).strip() if k + 1 < len(out) else ''
                new.append(('quote', (v, cite))); continue
            if t == 'p' and re.fullmatch(r'<strong>\s*Warren Buffett\s*</strong>', v): continue
            new.append((t, v))
        out = new
    if slug == 'more-success-for-redshield':
        new, awards = [], []
        for t, v in out:
            if t == 'p' and re.match(r'^\d{4} \|', v): awards.append(v); continue
            if awards: new.append(('ul', awards)); awards = []
            new.append((t, v))
        out = new
    return title, iso, date_txt, out

def render_body(out):
    parts = []
    for t, v in out:
        if t == 'ul': parts.append('<ul>\n' + '\n'.join('  <li>%s</li>' % x for x in v) + '\n</ul>')
        elif t == 'quote': parts.append('<blockquote><p>%s</p><cite>%s</cite></blockquote>' % v)
        else: parts.append('<%s>%s</%s>' % (t, v, t))
    return '\n'.join(parts)

def words_of(out):
    txt = ' '.join(re.sub(r'<[^>]+>', ' ', v if isinstance(v, str) else ' '.join(v) if t == 'ul' else ' '.join(v)) for t, v in out)
    return len(txt.split())

def excerpt(out, n=150):
    for t, v in out:
        if t == 'p':
            s = html.unescape(re.sub(r'<[^>]+>', '', v)).strip()
            if len(s) > 60:
                if len(s) <= n: return s
                cut = s[:n].rsplit(' ', 1)[0].rstrip(',;:—-')
                return cut + '…'
    return ''

# Journal photos run in their own colour (owner, 12 Oct: "on the journal page
# and article images can be their normal colour") — no .print here. The same
# files still print in the pair wherever else they appear (home, About).
def cover_img(m, p='', sizes='100vw', lazy=True, cls='', decor=False, first=False):
    """first: the biggest thing on screen when the page opens (an article's
    cover), so the browser fetches it ahead of everything else"""
    base = m['cover'][3:] if p == '' else m['cover']   # '../' prefix only from inside journal/
    srcset = ', '.join('%s-%d.webp %dw' % (base, w, w) for w in m['cw'])
    w, h = m['ar']
    return '<img%s src="%s-%d.webp" srcset="%s" sizes="%s" width="%d" height="%d"%s decoding="async" alt="%s"%s>' % (
        ' class="%s"' % cls if cls else '', base, m['cw'][0], srcset, sizes, w, h, ' loading="lazy"' if lazy else (' fetchpriority="high"' if first else ''),
        '' if decor else html.escape(m['alt'], quote=True), ' aria-hidden="true"' if decor else '')

def card(post, p, cls='jcard', sizes='(min-width:1025px) 30vw, (min-width:621px) 46vw, 92vw', lazy=True, extra=''):
    href = ('journal/' if p == '' else '') + post['slug'] + '.html'
    return f'''<article class="{cls}" data-cursor="Read"{extra}>
        <figure class="jcover">{cover_img(post['meta'], p, sizes, lazy)}{cover_img(post['meta'], p, sizes, lazy, cls='print jcover-print', decor=True)}</figure>
        <div class="jbody">
          <p class="jmeta"><time datetime="{post['iso']}">{post['date']}</time><i aria-hidden="true">·</i><span>{post['mins']} min read</span></p>
          <h3 class="jtitle"><a href="{href}">{html.escape(post['title'])}</a></h3>
          <p class="jexcerpt">{html.escape(post['excerpt'])}</p>
          <span class="jmore" aria-hidden="true">Read the article &rarr;</span>
        </div>
      </article>'''

def build_journal():
    raw = json.load(open(os.path.join(DATA, 'posts.json'), encoding='utf-8'))
    posts = []
    for slug, blocks in raw.items():
        title, iso, date_txt, out = clean_post(slug, blocks)
        d, mon, y = date_txt.split()
        date_disp = '%d %s %s' % (int(d), {'Sept': 'Sep'}.get(mon, mon), y)
        posts.append(dict(slug=slug, title=title, iso=iso, date=date_disp, out=out, mins=max(1, math.ceil(words_of(out) / 230)),
                          excerpt=excerpt(out), meta=POSTS_META[slug]))
    posts.sort(key=lambda x: x['iso'], reverse=True)

    # ---- index
    feat, rest = posts[0], posts[1:]
    cards = '\n'.join('      <li>' + card(x, '') + '</li>' for i, x in enumerate(rest))
    updates = renumber(UPDATES, 4)
    main = f'''<main id="main">

<!-- ================= 01 PAGE HEAD ================= -->
<section class="page-head" id="top" aria-labelledby="page-title">
  <span class="th-motif motif motif-tri" aria-hidden="true" data-fx="rotate" data-amt="-12"></span>
  <div class="container">
{kicker('TEKEX Journal', 1)}
    <h1 class="page-title" id="page-title"><span class="hl-line">{wordspans('Journal')}</span></h1>
    <!-- PLACEHOLDER COPY for approval — D9/D3 don't spec this page -->
    <p class="page-intro">Event write-ups, founder stories, milestone announcements and thought leadership pieces.</p>
  </div>
</section>

<!-- ================= 02 LATEST ================= -->
<!-- Articles imported from tekex.co/news, 12 Oct 2026; newest first. -->
<section class="sec" id="latest" aria-labelledby="latest-h">
  <div class="container">
{kicker('Latest', 2)}
    <h2 class="visually-hidden" id="latest-h">Latest article</h2>
    {card(feat, '', cls='jfeature', sizes='(min-width:881px) 56vw, 92vw', lazy=False)}
  </div>
</section>

<!-- ================= 03 ALL ARTICLES ================= -->
<section class="sec" id="articles" aria-labelledby="articles-h">
  <div class="container">
{kicker('From the archive', 3)}
    <h2 class="h2-display" id="articles-h">Stories from the network.</h2>
    <ul class="jgrid" role="list">
{cards}
    </ul>
  </div>
</section>

<!-- ================= 04 EVENT UPDATES ================= -->
{updates}

</main>'''
    s = head('Journal | TEKEX', 'Event write-ups, founder stories and practical thinking from the TEKEX network in Jersey, Guernsey and the Isle of Man.', 'journal.html', ['journal'])
    s += '\n<body class="page-journal">\n\n' + nav('', 'journal') + '\n\n' + main + tail('', 'journal')
    write('journal.html', s)

    # ---- articles
    for i, post in enumerate(posts):
        others = [x for x in posts if x is not post][:3]
        more = '\n'.join('      <li>' + card(x, '../').replace('href="' + x['slug'], 'href="' + x['slug']) + '</li>' for x in others)
        m = post['meta']
        share_url = SHARE + 'journal/' + post['slug'] + '.html'
        li_href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + urllib.parse.quote(share_url, safe='')
        share = f'''<div class="art-share">
        <a class="share-btn" href="{html.escape(li_href)}" target="_blank" rel="noopener" aria-label="Share on LinkedIn (opens in a new tab)"><span class="social-icon" style="-webkit-mask-image:url('../assets/icons/social/linkedin.svg');mask-image:url('../assets/icons/social/linkedin.svg')" aria-hidden="true"></span></a>
        <button class="share-btn" type="button" data-copy="{share_url}" hidden aria-label="Copy the link to this article"><span class="social-icon" style="-webkit-mask-image:url('../assets/icons/tekex/link.svg');mask-image:url('../assets/icons/tekex/link.svg')" aria-hidden="true"></span></button>
        <span class="share-note" role="status"></span>
      </div>'''
        share_foot = share.replace('<div class="art-share">', '<div class="art-share"><span class="share-k" aria-hidden="true">Share</span>')
        updates = prefix_paths(renumber(UPDATES, 3), '../')
        main = f'''<main id="main">

<!-- White paper for reading (owner, 12 Oct); signup and footer stay in the
     pair. Imported from {html.escape('https://www.tekex.co/news/' + post['slug'])} on 12 Oct 2026. -->
<div class="is-paper">
<article class="art" id="top" aria-labelledby="art-title">
  <header class="art-head">
    <div class="kicker is-span">
      <a class="k" href="../journal.html">Journal</a>
      <span class="rule" aria-hidden="true"></span>
      <span class="k">{post['mins']} min read</span>
    </div>
    <h1 class="art-title" id="art-title">{html.escape(post['title'])}</h1>
    <div class="art-byline">
      <span class="art-avatar" aria-hidden="true"></span>
      <p class="art-by"><b>TEKEX Journal</b><time datetime="{post['iso']}">{post['date']}</time></p>
      {share}
    </div>
  </header>
  <!-- Every article runs title and cover at the same 1000px width (owner,
       13 Oct). Insert Affiliate's portrait illustration (800x1200, the Wix
       original) is cropped 4:3 to keep the apple, his face and the laptop;
       the 1600 file is a Lanczos upscale of that crop for retina screens. -->
  <figure class="art-cover">{cover_img(m, '../', '(min-width:1040px) 1000px, 100vw', lazy=False, first=True)}</figure>
  <div class="art-col art-body">
{render_body(post['out'])}
  </div>
  <footer class="art-col art-foot">
    <a href="../journal.html"><span aria-hidden="true">&larr;</span>&nbsp;All articles</a>
    {share_foot}
    <a href="#top">Back to top <span aria-hidden="true">&uarr;</span></a>
  </footer>
</article>

<section class="more-reads" aria-labelledby="more-h">
  <div class="container">
{kicker('Keep reading', 2)}
    <h2 class="h2-display" id="more-h">More stories from the network.</h2>
    <ul class="jgrid" role="list">
{more}
    </ul>
  </div>
</section>
</div>

<!-- ================= EVENT UPDATES ================= -->
{updates}

</main>'''
        # a 1200×630 JPG cut from the cover: LinkedIn won't show a WebP share image
        img_abs = SHARE + 'assets/og/%s.jpg' % post['slug']
        ld = [{"@context": "https://schema.org", "@type": "BlogPosting", "headline": post['title'], "datePublished": post['iso'],
               "image": img_abs, "author": {"@type": "Organization", "name": "TEKEX"}, "publisher": {"@type": "Organization", "name": "TEKEX"},
               "mainEntityOfPage": "https://www.tekex.co/journal/%s.html" % post['slug']}]
        s = head('%s | TEKEX Journal' % post['title'], post['excerpt'], 'journal/%s.html' % post['slug'], ['journal'], p='../', jsonld=ld, og_image=img_abs, og_alt=m['alt'])
        s += '\n<body class="page-article">\n\n' + nav('../', 'journal') + '\n\n' + main + tail('../', 'journal')
        write('journal/%s.html' % post['slug'], s)
    return posts

# ============================================================== CASE STUDIES
# Owner, 14 Oct: the case studies are the four businesses on the homepage's
# "TEKEX is proud to have supported" band, chosen in a client meeting —
# what3words first, as the best known. They replace a first three (Taxteq,
# Bank Clarity, Parent Sense). Ed to review.
# Every fact is from the company's own site or named press, researched
# 13-14 Oct 2026 (sources beside each case). The TEKEX links come from
# TEKEX's own event records. Awendio Solaris has none on record: its
# "Where TEKEX comes in" is PLACEHOLDER COPY for Ed.
# Pictures: each company's own (what3words' beach header, a photograph
# from Yoono's homepage (owner's pick, 14 Oct; its metadata suggests
# licensed stock, so check Yoono's licence covers TEKEX using it), Awendio Solaris' factory render), except iO-CO, whose site has no
# usable photograph — an Unsplash photo of lion's mane, the fungus its State
# Mode product is grown from (photo-1625286535466 by Kier in Sight Archives,
# Unsplash licence). Logos: the homepage band's own one-colour SVGs.
INTRO = 'Four businesses TEKEX is proud to have supported: what they&rsquo;re building, and where the network comes in.'
DESC = 'what3words, Yoono, Awendio Solaris and iO-CO: four businesses TEKEX is proud to have supported, what they are building and where the network comes in.'
CASES = [
    # what3words.com/about; /news/emergency (85%, 26 Jul 2022);
    # bailiwickexpress.com (Jersey Fire and Rescue cliff-path rescue, Jun 2025)
    dict(slug='what3words', name='what3words', logo='what3words', ar=5.943, s=.472, where='London', sector='Location technology',
         line='Every three metres has a name.',
         lead='what3words has divided the world into 3-metre squares and given each of its 57 trillion a unique three-word address, so anyone can find, share and save an exact spot: a front door, a beach entrance, a walker on a cliff path.',
         how='Co-founder and CEO Chris Sheldrick has headlined TEKEX on two islands, at #36 in Jersey and IOM2 in the Isle of Man. Closer to home, Jersey Fire and Rescue used a three-word address to reach an injured student on a cliff path in 2025.',
         facts=[('85%', 'Of UK police, fire and ambulance services use it'), ('60+', 'Languages'), ('193', 'Countries')],
         site=('what3words.com', 'https://what3words.com/'),
         img='what3words', ar_img=(2560, 1440), pos='50% 45%', alt='A beach and its clifftop, two exact spots on it labelled with their three-word addresses'),
    # yoono.ai; yoono.ai/our-journey; jerseyfinance.com directory and news
    # (Catapult: FundTech 2026); TEKEX records (#36, IOM2; event partner)
    dict(slug='yoono', name='Yoono', logo='yoono', ar=5.05, s=.445, where='Jersey', sector='AI and due diligence',
         line='One name. Minutes, not days.',
         lead='Yoono is an AI people-intelligence platform, built in Jersey for regulated firms. Trust and corporate service providers, fund managers and law firms type in a single name and get an audit-ready due-diligence report in minutes.',
         how='Founder and CEO Richard Tavernor has taken Yoono to the TEKEX stage in Jersey and the Isle of Man, and Yoono backs TEKEX events as a partner. In 2026 it was named one of ten fintech innovators for Catapult: FundTech in Luxembourg.',
         facts=[('Top 10', 'Catapult: FundTech innovators, 2026'), ('2018', 'Founded, as Checkyr'), ('1', 'Name in, one audit-ready report out')],
         site=('yoono.ai', 'https://www.yoono.ai/'),
         img='yoono', ar_img=(5353, 3569), pos='50% 38%', alt='Two colleagues smiling over a laptop at a meeting table'),
    # awendiosolaris.com, /products, /post/awendio-solaris-advances-u-s-solar-
    # manufacturing-and-domestic-supply-strategy (Sep 2026); Companies House
    # 15124382. The Dec 2025 Montreal plan is no longer on its site: not used.
    dict(slug='awendio-solaris', name='Awendio Solaris', logo='awendio-solaris', ar=2.907, s=.704, where='UK and North America', sector='Solar manufacturing',
         line='Solar, made where it’s needed.',
         lead='Awendio Solaris is building a vertically integrated solar manufacturer for North America: high-efficiency TOPCon cells and panels for utility-scale developers, commercial installers and utilities in the US and Canada.',
         how='One of the businesses TEKEX is proud to have supported.',
         note='PLACEHOLDER COPY: where TEKEX came in, for Ed to supply. Nothing in TEKEX records or press links Awendio to TEKEX or the islands.',
         facts=[('2 GW', 'Phase one of its US platform'), ('30', 'Year power output warranty'), ('2023', 'Founded')],
         site=('awendiosolaris.com', 'https://www.awendiosolaris.com/'),
         img='awendio', ar_img=(2940, 1656), pos='50% 55%', alt='A render of an Awendio Solaris factory, its roof covered in solar panels'),
    # io-co.io, /process, /products, /team; jerseyeveningpost.com 20 May 2026
    # (the Jersey lab); TEKEX records (#26, Health Innovation Jersey, IOM3)
    dict(slug='io-co', name='iO-CO', logo='io-co', ar=3.8, s=.513, where='Jersey and Ascot', sector='Health and human performance',
         line='From neuroscience to everyday life.',
         lead='iO-CO turns neuroscience research into protected IP, then into health and wellbeing products for cognition, sleep and stress, each spun out as a company of its own. Its lab in Jersey tests them with real users in real environments.',
         how='Founder Nik Rose first presented iO-CO’s model at TEKEX #26 in 2023 and returned for Health Innovation Jersey in 2026. Head of Production Josh Dawkins takes it to the Isle of Man at IOM3.',
         facts=[('2', 'Spin-outs so far: State Mode and AIROS Sleep'), ('5', 'Stages from research to market'), ('11', 'People on the team')],
         site=('io-co.io', 'https://www.io-co.io/'),
         img='io-co', ar_img=(2600, 1733), pos='50% 50%', alt='Lion’s mane mushrooms, close up'),
]

# Supplied by the owner, 13 Oct
# Each speaker's organisation mark sits on the right of their name (owner,
# 14 Oct): NASA's worm (supplied by the owner) and the homepage band's
# what3words. --s sizes them by area, as on the band (w3w .472 at 5.943:1;
# the worm at 3.585:1 takes .608 for the same area). Hidden from screen
# readers: the role line already names the organisation. A small square
# portrait before each name (owner, 14 Oct; photos supplied by the owner),
# alt="" because the name beside it says who it is.
VOICES = [
    ('It was an absolute pleasure speaking at TEKEX. What a community you have built!', 'Dr Omar Hatamleh', 'CAIO, NASA', 'nasa', 3.585, .608, 'omar-hatamleh'),
    ('TEKEX has brought me to Jersey and connected me to something incredibly exciting.', 'Chris Sheldrick', 'CEO, what3words', 'what3words', 5.943, .472, 'chris-sheldrick'),
]

# The case studies' sign-off, also at the foot of the homepage's team, after
# the four people (owner, 14 Oct: "would feel really natural there"; it had
# closed the homepage's testimonials). About shares the team without it.
CASES_CTA = """
    <div class="cases-cta">
      <p class="cases-cta-line">Building something the islands should know about?</p>
      <a class="btn btn-solid talk-cta" href="contact.html">Talk to us <span aria-hidden="true">&rarr;</span></a>
    </div>"""

def team_section(cta=False):
    """The team (build/partials/team.html), on the homepage and About; on the
    homepage it ends in the case studies' sign-off"""
    if not cta: return TEAM
    end = '    </div>\n  </div>\n</section>'
    if not TEAM.rstrip().endswith(end.strip()): sys.exit('build/partials/team.html: expected it to end with the grid, container and section closing')
    i = TEAM.rstrip().rfind(end.strip())
    return TEAM[:i] + '</div>' + CASES_CTA + '\n  </div>\n</section>' + TEAM.rstrip()[i + len(end.strip()):]

def voices_section(num):
    """The testimonials band, on the case studies page and the homepage
    (owner, 14 Oct) — one source, VOICES above, numbered for its page."""
    voices = '\n'.join(f'''      <figure class="voice">
        <blockquote class="voice-q"><p>{q}</p></blockquote>
        <figcaption class="voice-by"><img class="voice-face" src="assets/photography/voices/{fc}-144.webp?v=2" srcset="assets/photography/voices/{fc}-96.webp?v=2 96w, assets/photography/voices/{fc}-144.webp?v=2 144w, assets/photography/voices/{fc}-192.webp?v=2 192w" sizes="64px" width="144" height="144" loading="lazy" decoding="async" alt=""><span class="voice-who"><b>{nm}</b><span>{r}</span></span><span class="voice-logo" aria-hidden="true" style="-webkit-mask-image:url('assets/logos/{lg}.svg');mask-image:url('assets/logos/{lg}.svg');--ar:{ar};--s:{sc}"></span></figcaption>
      </figure>''' for q, nm, r, lg, ar, sc, fc in VOICES)
    return f'''<section class="sec voices is-punch" id="voices" aria-labelledby="voices-h">
  <div class="container">
{kicker('In their words', num)}
    <h2 class="visually-hidden" id="voices-h">What people say about TEKEX</h2>
    <div class="voices-grid">
{voices}
    </div>
  </div>
</section>'''

def build_cases():
    n = len(CASES)
    tiles, arts = [], []
    for i, c in enumerate(CASES):
        num = '%02d' % (i + 1)
        # --s is each mark's optical size, the homepage band's own values: at one
        # height a long wordmark outweighs a square one, so the size goes by area
        logo = "-webkit-mask-image:url('assets/logos/%s.svg');mask-image:url('assets/logos/%s.svg');--ar:%s;--s:%s" % (c['logo'], c['logo'], c['ar'], c['s'])
        tiles.append(f'''      <li><a class="ci" href="#{c['slug']}"><span class="ci-top"><span>{num}</span><span class="ci-go" aria-hidden="true">&darr;</span></span><span class="ci-logo" role="img" aria-label="{html.escape(c['name'])}" style="{logo}"></span></a></li>''')
        w, h = c['ar_img']
        src = 'assets/photography/cases/%s' % c['img']
        # only the sizes that exist: no source is upscaled
        ws = [x for x in (800, 1600, 1920, 2400) if os.path.exists(os.path.join(ROOT, '%s-%d.webp' % (src, x)))]
        srcset = ', '.join('%s-%d.webp %dw' % (src, x, x) for x in ws)
        pos = c.get('pos', '50% 50%')
        # The picture is cropped to cover a frame overscanned 96px for the
        # parallax, so on narrower frames it renders wider than the frame:
        # ~1.9x the screen in the 4:3 phone frame, ~1.2x in the 16:9 tablet
        # one, the frame's own width only in the 21:9 desktop band.
        CASE_SIZES = '(min-width:1340px) 1240px, (min-width:1025px) 94vw, (min-width:561px) 120vw, 190vw'
        img = (f'<img src="{src}-1600.webp" srcset="{srcset}" sizes="{CASE_SIZES}" width="{w}" height="{h}" loading="lazy" decoding="async" alt="{html.escape(c["alt"], quote=True)}" style="object-position:{pos}">'
               f'<img class="print case-print" src="{src}-1600.webp" srcset="{srcset}" sizes="{CASE_SIZES}" width="{w}" height="{h}" loading="lazy" decoding="async" alt="" aria-hidden="true" style="object-position:{pos}">')
        facts = '\n'.join('          <div class="case-fact"><dt>%s</dt><dd>%s</dd></div>' % (k, v) for v, k in c['facts'])
        flag = ('\n        <!-- %s -->' % c['note']) if c.get('note') else ''
        hid = 'case-%s-h' % c['slug']
        arts.append(f'''    <article class="case" id="{c['slug']}" aria-labelledby="{hid}">
      <div class="case-bar"><span class="case-k">{num} <i aria-hidden="true">/</i> {n:02d}</span><span class="case-rule" aria-hidden="true"></span><span class="case-k">{c['where']} <i aria-hidden="true">·</i> {c['sector']}</span></div>
      <figure class="case-media" data-stack>
        <div class="case-move" data-parallax="40">{img}</div>
        <span class="case-mark" aria-hidden="true" style="{logo}"></span>
      </figure>
      <div class="case-body">
        <h3 class="case-line" id="{hid}"><span class="visually-hidden">{html.escape(c['name'])}: </span>{c['line']}</h3>
        <div class="case-copy">
          <p class="case-lead">{c['lead']}</p>{flag}
          <p class="case-how"><b>Where TEKEX comes in.</b> {c['how']}</p>
          <a class="case-site" href="{c['site'][1]}" target="_blank" rel="noopener">{c['site'][0]} <span aria-hidden="true">&#8599;</span><span class="visually-hidden"> (opens in a new tab)</span></a>
        </div>
        <dl class="case-facts">
{facts}
        </dl>
      </div>
    </article>''')
    index = '\n'.join(tiles)
    cases = '\n\n'.join(arts)
    updates = renumber(UPDATES, 4)
    main = f'''<main id="main">

<!-- ================= 01 PAGE HEAD ================= -->
<section class="page-head" id="top" aria-labelledby="page-title">
  <span class="th-motif motif motif-square" aria-hidden="true" data-fx="rotate" data-amt="-8"></span>
  <div class="container">
{kicker('From the network', 1)}
    <h1 class="page-title" id="page-title"><span class="hl-line">{wordspans('Case studies')}</span></h1>
    <p class="page-intro">{INTRO}</p>
  </div>
</section>

<!-- ================= 02 CASE STUDIES ================= -->
<!-- An index of the four, then each as a chapter (css/cases.css). -->
<section class="sec cases" id="cases" aria-labelledby="cases-h">
  <div class="container">
{kicker('Four businesses', 2)}
    <h2 class="h2-display" id="cases-h">From introduction <br aria-hidden="true">to impact.</h2>
    <ul class="cases-index" role="list" aria-label="The case studies">
{index}
    </ul>
{cases}
{CASES_CTA}
  </div>
</section>

<!-- ================= 03 IN THEIR WORDS — the page's one punch band ====== -->
<!-- Set as the display, so the heading is for screen readers only. -->
{voices_section(3)}

<!-- ================= 04 EVENT UPDATES ================= -->
{updates}

</main>'''
    s = head('Case studies | TEKEX', DESC, 'case-studies.html', ['cases'],
             jsonld=[{"@context": "https://schema.org", "@type": "CollectionPage", "name": "TEKEX case studies", "url": "https://www.tekex.co/case-studies.html",
                      "about": {"@type": "Organization", "name": "TEKEX", "url": "https://www.tekex.co/"}}])
    s += '\n<body class="page-cases">\n\n' + nav('', 'cases') + '\n\n' + main + tail('', 'cases')
    write('case-studies.html', s)

# ===================================================================== PLAY
def build_play():
    """The arcade (owner, 13 Oct). Everything on the handheld is drawn by
    css/play.css; the screen, scenes and games by js/play.js."""
    main = f'''<main id="main" class="play" data-play>
<section class="play-stage" aria-labelledby="play-title">
  <div class="play-info">
    <div class="kicker is-span">
      <span class="k">TEKEX Arcade</span>
      <span class="rule" aria-hidden="true"></span>
      <span class="k" data-play-num>No. 01 of 03</span>
    </div>
    <nav class="play-pick" aria-label="Choose a game">
      <a href="?g=land" data-pick="land" data-cursor="Play">Jump</a>
      <a href="?g=invaders" data-pick="invaders" data-cursor="Play">Space</a>
      <a href="?g=pong" data-pick="pong" data-cursor="Play">Pong</a>
    </nav>
    <h1 class="play-title" id="play-title" data-play-title>Play</h1>
    <p class="play-blurb" data-play-blurb>A little something for anyone who scrolled all the way down.</p>
    <dl class="play-keys" data-play-keys></dl>
    <div class="play-actions">
      <button type="button" class="play-btn" data-mute aria-pressed="true"><span>Sound on</span></button>
      <button type="button" class="play-btn is-full" data-full hidden><span>Full screen</span></button>
    </div>
    <p class="play-reload">Reload the page for another game.</p>
    <div class="play-scores">
      <h2 class="play-board-h" data-board-title>High scores</h2>
      <ol class="play-board" data-board></ol>
      <p class="play-board-note" data-board-note></p>
    </div>
  </div>

  <div class="play-device">
    <div class="gb" data-gb>
      <div class="gb-top" aria-hidden="true"><span>&#9664; Off &bull; On &#9654;</span></div>
      <div class="gb-bezel">
        <p class="gb-label" aria-hidden="true"><i></i><span>Dot matrix in two colours</span><i></i></p>
        <span class="gb-led" aria-hidden="true"></span><span class="gb-led-k" aria-hidden="true">Power</span>
        <div class="gb-lcd"><canvas width="160" height="144" role="img" aria-label="Game screen" tabindex="-1"></canvas></div>
      </div>
      <div class="gb-brand" aria-hidden="true"><span class="gb-logo"></span></div>
      <div class="gb-controls">
        <div class="gb-dpad" data-dpad role="group" aria-label="Direction pad">
          <button type="button" data-btn="up" aria-label="Up"></button>
          <button type="button" data-btn="left" aria-label="Left"></button>
          <button type="button" data-btn="right" aria-label="Right"></button>
          <button type="button" data-btn="down" aria-label="Down"></button>
          <span class="gb-dpad-hub" aria-hidden="true"></span>
        </div>
        <div class="gb-ab">
          <div><button type="button" data-btn="b" aria-label="B"><span></span></button><span class="gb-k" aria-hidden="true">B</span></div>
          <div><button type="button" data-btn="a" aria-label="A"><span></span></button><span class="gb-k" aria-hidden="true">A</span></div>
        </div>
      </div>
      <div class="gb-ss">
        <div><button type="button" data-btn="select" aria-label="Select: open the menu"></button><span class="gb-k" aria-hidden="true">Select</span></div>
        <div><button type="button" data-btn="start" aria-label="Start"></button><span class="gb-k" aria-hidden="true">Start</span></div>
      </div>
      <div class="gb-speaker" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <p class="play-full-hint" aria-hidden="true"><b>Esc</b> to leave full screen <span data-full-keys></span></p>
  </div>

</section>
<p class="visually-hidden" aria-live="polite" data-play-live></p>
</main>
<script src="../js/play-config.js?v=''' + VER + '''" defer></script>
<script src="../js/play.js?v=''' + VER + '''" defer></script>'''
    s = head('Play | TEKEX', 'A little something for anyone who scrolled all the way down: three pocket games in the TEKEX colours.', 'play/', ['play'], p='../')
    # no footer: the arcade is one screen (owner, 13 Oct)
    s += '\n<body class="page-play">\n\n' + nav('../', 'play') + '\n\n' + main + '''
<script src="../js/site.js?v=''' + VER + '''" defer></script>
<script src="../js/system.js?v=''' + VER + '''" defer></script>
</body>
</html>
'''
    # The arcade lives in its own folder, so tekex.co/play (and /play/)
    # reach it on any static host, not only ones that map /play to
    # play.html. The old address forwards, for any link already shared.
    write('play/index.html', s)
    write('play.html', '''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Play | TEKEX</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://www.tekex.co/play/">
<meta http-equiv="refresh" content="0; url=play/">
<script>location.replace('play/' + location.search + location.hash);</script>
</head>
<body><p><a href="play/">TEKEX Arcade</a></p></body>
</html>
''')

if __name__ == '__main__':
    build_index(); build_about(); build_contact(); build_events(); build_cases(); build_play(); build_journal(); build_404()
    print('version stamp', VER)
