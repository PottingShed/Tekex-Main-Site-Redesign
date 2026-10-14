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
| `films/edit_reels.py` | `assets/video/hero-reel-*.mp4` and `loop-reel-*.mp4`: the hero film and the Stay in the loop film, each shot listed with its source, in-point and what it shows. Before rendering it checks the cut's variety rules (no two shots of a kind back to back, no more than two people or logo shots in a row, never two centred logos in succession) and stops with the offending shots named. `python3 build/asset-scripts/films/edit_reels.py hero-reel` renders just one | the source films in `Video assets/` (the event footage, the brand films from 14 Oct, the TEKEX 33/35 films, the bubble film) and `assets/video/banner-loop.mp4`; ffmpeg (or the `imageio-ffmpeg` package) |
| `motifs/forms.py` | `assets/motifs/forms/*` — the four 3D forms, greyscale with their tones stretched (the site prints them in the pair), trimmed, at 800 and 1600px | the owner's originals in `motifs/src/` (in the repo); Pillow with WebP support |
| `events/og.py` | `assets/og/events/<slug>.jpg`: the share image for each event page, 1200×630, cut from its artwork (LinkedIn won't show a WebP) | `EVENTS` in `build/build.py` and the artwork in `assets/photography/events/`; Pillow with WebP support |
| `events/process.py` | `assets/photography/events/*` — every event poster, cropped as its Eventbrite listing shows it, at 600/940/1200/1880, never upscaled | the originals in `events/orig/`, downloaded from the URLs in `originals.json`; crops in `crops.json` |

The full reasoning for each is in `assets/README.md`.
