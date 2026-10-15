# Event photographs, web-sized: each original cropped once, here, and written
# as WebP at the widths the pages ask for (never upscaled).
#
#   python3 build/asset-scripts/photos/process.py
#
# The originals are the photographers' full-size files, in "Photo assets/"
# at the repo root (not in the repo: 10-16MB each). Needs Pillow with WebP
# support (pip install pillow).
import os
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
SRC = os.path.join(ROOT, 'Photo assets')

# out (under assets/photography/): (original, crop box in its pixels, widths)
PHOTOS = {
    # TEKEX IOM2, 7 May 2026, Santander Work Cafe, Douglas: the whole room
    # from the mezzanine (DK Photography IOM; owner, 15 Oct: "a stronger
    # image than what is currently used"). Used for About's page head and the
    # IOM2 page. The top 290px come off: that's the venue's own sign, which
    # had no place at the head of a TEKEX page; the cut lands just above the
    # screen's frame.
    'tekex/iom-room': ('DK Photography IOM (15 Oct)/dkphotographyiom-Tekex-240.jpg', (0, 290, 5240, 3493), [800, 1600, 2400]),
}

for out, (src, box, widths) in PHOTOS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert('RGB').crop(box)
    for w in widths:
        if w > im.width: continue
        r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        path = os.path.join(ROOT, 'assets', 'photography', '%s-%d.webp' % (out, w))
        r.save(path, quality=78, method=6)
        print('wrote', os.path.relpath(path, ROOT), '%dx%d' % r.size, '%d KB' % (os.path.getsize(path) // 1024))
