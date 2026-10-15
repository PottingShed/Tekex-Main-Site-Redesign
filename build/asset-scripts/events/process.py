# Event posters, from the official Eventbrite listings (owner, 14 Oct: "go
# back to all the official event posters from eventbrite so they are all
# accurate and in the same format"). Each original from cdn.evbuc.com,
# cropped with the listing's own crop box (rect) as Eventbrite displays it,
# or centred at 2:1 where the listing has none. Sizes 600 / 940 / 1200 /
# 1880, never upscaled.
import json, os, sys
from PIL import Image, ImageCms, ImageOps
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, '..', '..', '..', 'assets', 'photography', 'events')   # straight into the site
# the originals (not in the repo) go in ./orig — their cdn.evbuc.com URLs are in originals.json
crops = json.load(open(os.path.join(D, 'crops.json')))
NAME = {'tekex-iom-3': 'tekex-iom-3'}   # the upcoming poster gets its own name
def rgb(im):
    if im.mode == 'CMYK':
        # Photoshop CMYK JPEGs carry inverted channels; PIL handles the Adobe
        # marker, but convert through a profile when one is embedded
        icc = im.info.get('icc_profile')
        if icc:
            try:
                import io
                src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
                return ImageCms.profileToProfile(im, src, ImageCms.createProfile('sRGB'), outputMode='RGB')
            except Exception:
                pass
        return im.convert('RGB')
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[3]); return bg
    return im.convert('RGB')
report = []
# python3 process.py <slug> …  processes just those (the originals for the rest needn't be here)
only = sys.argv[1:]
for slug, c in crops.items():
    if only and slug not in only: continue
    im = rgb(Image.open(os.path.join(D, 'orig', slug)))
    W, H = im.size
    if c.startswith('rect:'):
        x, y, w, h = map(int, c[5:].split(','))
        im = im.crop((x, y, min(W, x + w), min(H, y + h)))
    W, H = im.size
    # exactly 2:1, centred (the rects are 2:1 to within a pixel)
    if W / H > 2: nw = round(H * 2); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    elif W / H < 2: nh = round(W / 2); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    W, H = im.size
    name = NAME.get(slug, slug)
    import glob, re
    for p in glob.glob(os.path.join(OUT, name + '-*.webp')):
        if re.fullmatch(re.escape(name) + r'-\d+\.webp', os.path.basename(p)): os.remove(p)
    made = []
    for w in (600, 940, 1200, 1880):
        if w > W: continue
        im.resize((w, w // 2), Image.LANCZOS).save(os.path.join(OUT, '%s-%d.webp' % (name, w)), quality=82, method=6)
        made.append(w)
    # a poster smaller than a step also keeps its own full width (#16 is 880,
    # #21 640), so the largest file is always the original's size
    if W not in made and W < 1880:
        im.save(os.path.join(OUT, '%s-%d.webp' % (name, W)), quality=82, method=6); made.append(W)
    report.append('%-26s %4dx%-4d %s' % (slug, W, H, made))
print('\n'.join(report))
