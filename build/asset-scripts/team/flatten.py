# Flatten the four team backdrops to one colour (#d3ccc1), keeping the photo's
# grain so the paper doesn't read as a cut-out fill.
#   python3 flatten.py [grain]      grain = share of fine texture kept (default .6)
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# the original studio photos (not in the repo) go in ./originals; the
# results land in ./out, and the -400/-640.webp pairs were copied from there
# into assets/team/
HERE = os.path.dirname(os.path.abspath(__file__)) + '/'
SRC = HERE + 'originals/'
OUT = HERE + 'out/'
os.makedirs(OUT, exist_ok=True)
T = np.array([0xd3, 0xcc, 0xc1], float)
GRAIN = float(sys.argv[1]) if len(sys.argv) > 1 else .6

# name: (source, crop x0, y0, w, h)
PEOPLE = {
    'ed-prow':      ('ed original.jpg',  0, 0, 1064, 1330),
    'tom-langford': ('tom original.jpg', 0, 0, 1064, 1330),
    'louis-pike':   ('Louis V1.png',    42, 0, 1646, 2058),
    'jenson-artus': ('Jenson V1.png',   48, 38, 1696, 2120),
}

def gblur(a, s):
    return ndi.gaussian_filter(a, s, mode='nearest')

def local_mean(img, w, s):
    # normalised convolution: average of backdrop pixels only, extrapolated
    # under the subject, so the estimate never picks up hair or skin
    den = gblur(w, s) + 1e-6
    return np.dstack([gblur(img[..., c] * w, s) / den for c in range(3)])

for name, (f, x0, y0, cw, ch) in PEOPLE.items():
    im = Image.open(SRC + f).convert('RGB').crop((x0, y0, x0 + cw, y0 + ch))
    a = np.asarray(im, float)
    H, W = a.shape[:2]
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    lum = .2126 * R + .7152 * G + .0722 * B
    # the paper's own range, read from strips that are paper in every shot
    # (top edge, both sides down to 55%). Each photo gets its own band:
    # Ed's paper is greener than Jenson's, Tom's grey cap and checked shirt
    # share the paper's chroma but never get within 40 lum of it
    strip = np.zeros((H, W), bool)
    strip[:int(H * .05), :] = True
    strip[:int(H * .55), :int(W * .08)] = True
    strip[:int(H * .55), int(W * .92):] = True
    rb, gb = R - B, G - B
    lo = lambda v: np.percentile(v[strip], 2)
    hi = lambda v: np.percentile(v[strip], 98)
    band = ((rb > lo(rb) - 6) & (rb < hi(rb) + 6) & (gb > lo(gb) - 6) & (gb < hi(gb) + 6)
            & (lum > lo(lum) - 40) & (lum < 242))
    band = ndi.binary_opening(band, iterations=2)
    seeds = np.zeros_like(band)
    seeds[0, :] = True
    seeds[:int(H * .7), 0] = True
    seeds[:int(H * .7), -1] = True
    lab, _ = ndi.label(band)
    keep = np.unique(lab[seeds & band])
    bg = np.isin(lab, keep[keep > 0])
    # paper showing through gaps in the hair: in-band pixels close to the backdrop
    near = ndi.binary_dilation(bg, iterations=int(W * .02))
    bg = bg | (band & near)
    soft = gblur(bg.astype(float), 2.0)
    # local paper colour at a small scale (~1.2% of the width) tracks the
    # blotches; measured from an eroded mask so hair edges don't darken it
    core = ndi.binary_erosion(bg, iterations=4).astype(float)
    sig = W * .012
    loc = np.maximum(local_mean(a, core, sig), 1.0)   # far from paper the weight is ~0
    # fine grain: keep a share of it so the paper still reads as photographed
    g = a / loc                               # ~1.0 on the paper
    g = g / g[core > 0].mean(0)               # centre the grain so the paper averages exactly T
    flat = T * (1 + (g - 1) * GRAIN)
    out = a * (1 - soft[..., None]) + flat * soft[..., None]
    out = np.clip(np.rint(out), 0, 255).astype(np.uint8)   # round, not floor
    Image.fromarray(out).save(OUT + name + '-full.png')
    Image.fromarray((bg * 255).astype(np.uint8)).resize((W // 4, H // 4)).save(OUT + name + '-mask.png')
    for w in (400, 640):
        Image.fromarray(out).resize((w, w * 5 // 4), Image.LANCZOS).save(OUT + f'{name}-{w}.webp', quality=84, method=6)
    pb = out[bg & (core > 0)]
    print(name, (W, H), 'paper mean', pb.mean(0).round(1), 'std', pb.std(0).round(2),
          'before std', a[bg & (core > 0)].std(0).round(1))
