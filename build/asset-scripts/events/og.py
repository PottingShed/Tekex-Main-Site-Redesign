# The share image for every event page: a 1200x630 JPG cut from the event's
# artwork, so a link to events/<slug>.html shows that event's own card on
# LinkedIn, Slack and the rest (LinkedIn won't show a WebP).
#
#   python3 build/asset-scripts/events/og.py
#
# Reads EVENTS from build/build.py and the largest artwork it lists, scales
# it to cover 1200x630 and crops the centre: the artwork is 2:1, so that
# costs 2.5% off each side and nothing top or bottom. Writes
# assets/og/events/<slug>.jpg; then run build/build.py, which uses each one
# once it exists (and the site's own share image until then).
# Needs Pillow with WebP support (pip install pillow).
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'build'))
import build as B

W, H = 1200, 630
out_dir = os.path.join(ROOT, 'assets', 'og', 'events')
os.makedirs(out_dir, exist_ok=True)
for e in B.EVENTS:
    w = B.ev_sizes(e['img'])[-1]
    im = Image.open(os.path.join(ROOT, '%s-%d.webp' % (B.ev_base(e['img']), w))).convert('RGB')
    k = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    out = os.path.join(out_dir, e['slug'] + '.jpg')
    im.crop((x, y, x + W, y + H)).save(out, quality=86, optimize=True, progressive=True)
    print('wrote', os.path.relpath(out, ROOT), '%d KB' % (os.path.getsize(out) // 1024), 'from', w, 'px')
