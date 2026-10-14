# Asset scripts

A record of how some of the site's images were made, kept so the work can be
repeated or adjusted. **They are not part of the page build** and nothing on
the site runs them — the images they produced are already in `assets/`.

Each needs source files that are **not in this repo** (the owner's original
photos, or downloads), so put those where the script says before running it.
They need Python 3 with Pillow, NumPy and SciPy (`pip install pillow numpy
scipy`); `liftmask.swift` needs a Mac (it uses macOS's Vision framework).

| Script | Made | Needs |
|---|---|---|
| `team/flatten.py` | `assets/team/*` — the four team portraits on one flat `#d3ccc1` backdrop, grain kept | the original studio shots in `team/originals/` (`ed original.jpg`, `tom original.jpg`, `Louis V1.png`, `Jenson V1.png`) |
| `voices/cutout.py` + `liftmask.swift` | `assets/photography/voices/*` — the two testimonial portraits, cut out, on the same backdrop, heads matched in size | the owner's `chris.jpg` and `omar.jpg` beside the script; masks from `swift liftmask.swift chris.jpg chris-mask.png` (and the same for omar) |
| `events/process.py` | `assets/photography/events/*` — every event poster, cropped as its Eventbrite listing shows it, at 600/940/1200/1880, never upscaled | the originals in `events/orig/`, downloaded from the URLs in `originals.json`; crops in `crops.json` |

The full reasoning for each is in `assets/README.md`.
