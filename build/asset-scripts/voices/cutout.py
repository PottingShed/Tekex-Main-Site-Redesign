# The two testimonial portraits, cut out and set on the team portraits' flat
# backdrop (#d3ccc1), with their heads at one size (owner, 14 Oct).
# Masks from macOS Vision (liftmask.swift). The old background is lifted out
# of the hair edges before compositing (each edge pixel's own background
# colour estimated from nearby background and removed), so no green or grey
# fringe is left around the new paper.
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, '..', '..', '..', 'assets', 'photography', 'voices')   # straight into the site
# the owner's photos chris.jpg and omar.jpg (not in the repo) go beside this
# script, with their masks: swift liftmask.swift chris.jpg chris-mask.png
T = np.array([0xd3, 0xcc, 0xc1], float)
FACE = .42      # face box height as a share of the square
FACE_Y = .40    # face box centre, down the square
PEOPLE = {      # source, face box (x, y, w, h) from OpenCV's frontal-face cascade
    'chris-sheldrick': ('chris', (336, 131, 339, 339)),
    'omar-hatamleh':   ('omar', (135, 27, 134, 134)),
}

def nconv(img, w, s):
    den = ndi.gaussian_filter(w, s) + 1e-6
    return np.dstack([ndi.gaussian_filter(img[..., c] * w, s) / den for c in range(3)])

sheet = []
for name, (src, (fx, fy, fw, fh)) in PEOPLE.items():
    P = np.asarray(Image.open(os.path.join(D, src + '.jpg')).convert('RGB'), float)
    a = np.asarray(Image.open(os.path.join(D, src + '-mask.png')).convert('L'), float) / 255
    H, W = a.shape
    # Chris was shot against leaves, and Vision's mask is solid out to the
    # tips of his flyaway hair, so the leaves between the wisps came with it
    # (a khaki tuft on the new paper). Near the hair's outer edge, above the
    # brow, each pixel's coverage is re-measured as how far it sits from the
    # local leaf colour towards his hair colour: wisps fade, solid hair stays.
    # Omar's grey studio backdrop needs none of this.
    if src == 'chris':
        bg0 = (a < .05).astype(float)
        Bl = nconv(P, bg0, W * .03)                         # the leaves behind, locally
        dist = np.sqrt(((P - Bl) ** 2).sum(-1))
        est = np.clip((dist - 12) / 38, 0, 1)               # within 12 of the leaves: background; 50 away: hair
        # only along the hair's outer edge, and faded in and out (no seams):
        # strongest at the outline, gone ~40px inside it and below the brow
        inside = ndi.distance_transform_edt(a > .5)
        w_edge = np.clip(1 - inside / (W * .04), 0, 1)
        yy = np.arange(H)[:, None] * np.ones((1, W))
        w_top = np.clip((fy + fh * .15 - yy) / (fh * .2), 0, 1)
        w = w_edge * w_top
        a = a * (1 - w) + np.minimum(a, est) * w
        a = ndi.gaussian_filter(a, .6)
    # the old background behind each edge pixel, from pixels that are clearly background
    bgw = (a < .05).astype(float)
    B = nconv(P, bgw, max(4, W * .015))
    A = a[..., None]
    F = np.where(A > .04, (P - (1 - A) * B) / np.maximum(A, .04), P)
    F = np.clip(F, 0, 255)
    comp = F * A + T * (1 - A)
    # square crop with the face at the same size and height in both
    side = fh / FACE
    cx, cy = fx + fw / 2, fy + fh / 2
    x0, y0 = cx - side / 2, cy - FACE_Y * side
    pad = int(side)  # crops may run past the photo's edge: the paper simply continues
    canvas = np.empty((H + 2 * pad, W + 2 * pad, 3)); canvas[:] = T
    canvas[pad:pad + H, pad:pad + W] = comp
    # the subject is cut by the photo's own bottom edge; carry the body down by
    # repeating the last row under the subject only where the crop needs it
    bottom = int(round(y0 + side))
    if bottom > H:
        last = comp[-1]; la = a[-1][:, None]
        for yy in range(H, min(bottom + 2, H + pad)):
            canvas[pad + yy, pad:pad + W] = last * la + T * (1 - la)
    box = (int(round(x0 + pad)), int(round(y0 + pad)), int(round(x0 + pad + side)), int(round(y0 + pad + side)))
    sq = Image.fromarray(np.clip(np.rint(canvas), 0, 255).astype(np.uint8)).crop(box)
    for w in (96, 144, 192):
        sq.resize((w, w), Image.LANCZOS).save(os.path.join(OUT, '%s-%d.webp' % (name, w)), quality=86, method=6)
    sheet.append(sq.resize((240, 240), Image.LANCZOS))
    print(name, 'crop side %.0f px' % side, 'box', box)

out = Image.new('RGB', (2 * 240 + 20, 240), 'white')
for i, im in enumerate(sheet): out.paste(im, (i * 260, 0))
out.save(os.path.join(D, 'cutout-sheet.png'))
