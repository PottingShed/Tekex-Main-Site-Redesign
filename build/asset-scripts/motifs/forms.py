# The four 3D forms (owner, 14 Oct): gradient tubes knotted into marks, used
# in place of the middle one of a page's oversized flat white motifs. The
# site prints them in the pair (css/site.css, .motif-form), so these files
# carry only shape and light: each is turned to greyscale and its tones
# stretched so its deepest shadow is black and its brightest light white
# (a saturated blue is only ~25% luminance, so unstretched the ink never
# reached full strength), trimmed to its edges and saved at 800 and 1600px
# wide (never upscaled), keeping its transparency.
#
#   python3 build/asset-scripts/motifs/forms.py
#
# Sources: build/asset-scripts/motifs/src/*.webp, the owner's originals
# (transparent, ~2000px). Writes assets/motifs/forms/<name>-<width>.webp.
# Needs Pillow with WebP support.
import os, glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'motifs', 'forms')
os.makedirs(OUT, exist_ok=True)
for src in sorted(glob.glob(os.path.join(HERE, 'src', '*.webp'))):
    name = os.path.splitext(os.path.basename(src))[0]
    im = Image.open(src).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
    alpha = im.getchannel('A')
    grey = im.convert('L')
    # levels from the solid pixels only, 0.5% clipped each end
    vals = sorted(g for g, a in zip(grey.getdata(), alpha.getdata()) if a > 200)
    lo, hi = vals[len(vals) // 200], vals[-len(vals) // 200 - 1]
    grey = grey.point(lambda v: max(0, min(255, round((v - lo) * 255 / max(1, hi - lo)))))
    im = Image.merge('RGBA', (grey, grey, grey, alpha))
    for w in (800, 1600):
        if w > im.width: continue
        out = os.path.join(OUT, '%s-%d.webp' % (name, w))
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(out, quality=86, method=6)
        print('wrote', os.path.relpath(out, ROOT), '%dx%d' % (w, round(im.height * w / im.width)), '%d KB' % (os.path.getsize(out) // 1024))
