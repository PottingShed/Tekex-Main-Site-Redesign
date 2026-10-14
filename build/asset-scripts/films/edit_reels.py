# The two background films, cut from TEKEX's event footage and the brand
# work built on the 3D logo (Ed, 14 Oct: the renders "mixed in the same edit
# as the footage of people at the event").
#
#   python3 build/asset-scripts/films/edit_reels.py            (both)
#   python3 build/asset-scripts/films/edit_reels.py hero-reel  (just one)
#
# hero  the homepage hero: led by people (networking, speakers) with the
#       logo work cut in; ~40s, in colour (the site lays a dark scrim over
#       it, top and bottom)
# loop  behind Stay in the loop: led by the logo work, in colour (the site
#       lays a dark wash over it), with people cut in; ~37s
#
# Rules the cut keeps: nothing on screen that reads as text or a graphic (no
# captions, title cards, slides or shop signs with words: live type sits on
# top), though the logo itself, rendered or photographed, is the point;
# moving footage only, shots of 1.6-3.5s, hard cuts. (The AI logo variants
# were in as stills with a push-in until 14 Oct; the owner felt they let it
# down beside the moving logo work, so they're out.) And variety, which
# check() enforces before anything renders: no two shots of the same kind
# back to back; never more than two people shots, or two logo or abstract
# shots, in a row; and among those, never two centred, straight-on logos one
# after the other, since much of the logo work is framed that way and a run
# of them reads as one picture. Both films loop, so the last shot counts as
# next to the first.
#
# Sources live in "Video assets/" (not in the repo: large originals) and
# assets/video/banner-loop.mp4. Needs ffmpeg (on PATH, or the imageio-ffmpeg
# Python package).
import os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
VA = os.path.join(ROOT, 'Video assets')
BF = os.path.join(VA, 'Brand films (14 Oct)')
SRC = {
    'people':  os.path.join(BF, 'Tekex_vid (event footage).mp4'),           # the event, 1080p
    't37':     os.path.join(BF, 'tekex_37_full_version_v1_v1.mp4'),         # the logo as a tattoo, in a puddle
    'midyear': os.path.join(BF, 'tekex_for_mid_year_v1.mp4'),               # particles resolve into the logo
    'tk35':    os.path.join(VA, '37237 TKX Tekex35 Event Video D2.mp4'),    # the logo in flowers
    'bubble':  os.path.join(VA, 'full bubble vid.mp4'),                     # soap bubbles, then the logo in foam
    'banner':  os.path.join(ROOT, 'assets', 'video', 'banner-loop.mp4'),    # Health Innovation renders, 2s shots on the even seconds
}

# (kind, source, in, seconds). The kind is what the shot shows, which
# check() reads:
#   people    room (the crowd, wide), close (faces, hands, a glass), speaker
#   logo      render (the 3D logo as an object in a scene), matter (the logo
#             forming out of flowers, foam, particles), real (filmed: the
#             tattoo, the street); "front" added when the logo sits centred
#             and straight on
#   abstract  no logo: the DNA, particles, glass spheres, soap bubbles
HERO = [
    ('room', 'people', 4.40, 2.20),                    # the room, through the glass
    ('close', 'people', 6.75, 1.70),                   # listening (out before the foreground wipes him)
    ('matter front', 'tk35', 36.80, 3.00),             # flowers gather into the logo: the first logo, a soft one
    ('close', 'people', 21.10, 2.30),                  # laughter
    ('real', 't37', 35.20, 3.00),                      # the logo tattooed
    ('room', 'people', 25.95, 2.25),                   # a speaker, from behind
    ('abstract', 'banner', 8.04, 1.92),                # particles in light
    ('close', 'people', 14.10, 2.10),                  # pouring
    ('speaker', 'people', 47.55, 2.25),                # at the lectern
    ('matter', 'bubble', 25.30, 2.50),                 # the foam K, close
    ('render front', 'banner', 14.04, 1.92),           # the shuttle launch
    ('room', 'people', 37.95, 2.25),                   # the audience
    ('render', 'banner', 18.04, 1.92),                 # the logo grown in a dish
    ('close', 'people', 9.15, 2.65),                   # conversation
    ('speaker', 'people', 35.55, 2.25),                # over a shoulder, to the room
    ('matter front', 'midyear', 32.50, 3.00),          # the logo, out of the particles
    ('room', 'people', 30.70, 2.30),                   # a speaker and the room
    ('abstract', 'banner', 16.04, 1.92),               # the DNA strand turning
]
LOOP = [
    ('matter', 'bubble', 13.00, 3.00),                 # foam drifting into letters
    ('render front', 'banner', 2.04, 1.92),            # the logo in blood bags
    ('room', 'people', 18.70, 2.30),                   # a circle of conversation
    ('real', 't37', 68.80, 2.40),                      # the tattooist at work, pushing in to the arm
    ('abstract', 'banner', 0.04, 1.92),                # glass spheres rolling together
    ('close', 'people', 42.70, 2.30),                  # listening, close
    ('render', 'banner', 22.04, 1.92),                 # the logo in bubbles, in a dish
    ('speaker', 'people', 48.10, 1.65),                # at the lectern (out before the cut at 49.82)
    ('matter front', 'tk35', 50.00, 3.50),             # flowers in smoke
    ('abstract', 'bubble', 3.00, 3.00),                # a soap bubble splitting
    ('close', 'people', 16.40, 1.80),                  # a glass of wine
    ('render', 'banner', 10.04, 1.92),                 # the glass heart
    ('matter', 'midyear', 9.80, 3.00),                 # particles swirl round the logo
    ('room', 'people', 2.00, 2.10),                    # the room, through the glass (between cuts at 1.74 and 4.26)
    ('real front', 't37', 55.80, 2.30),                # the logo in a puddle (out before the camera moves at 58.16)
    ('close', 'people', 29.00, 1.60),                  # a speaker's hands
]
OUT = {  # name: (shot list, greyscale, [(width, crf, maxrate)])
    'hero-reel': (HERO, False, [(1600, 25, '1800k'), (960, 27, '800k')]),
    'loop-reel': (LOOP, False, [(1280, 26, '1500k'), (960, 27, '800k')]),
}

PEOPLE = {'room', 'close', 'speaker'}

def span(s):   # the stretch of source a shot uses
    return (s[2], s[2] + s[3])

def check(name, shots):
    kind = [s[0].split()[0] for s in shots]
    people = [k in PEOPLE for k in kind]
    n, bad = len(shots), []
    label = lambda i: '%d (%s %s)' % (i % n + 1, shots[i % n][1], shots[i % n][2])
    for i in range(n):
        if kind[i] == kind[i - 1]:
            bad.append('%s and %s: two %s shots back to back' % (label(i - 1), label(i), kind[i]))
        if people[i] == people[(i + 1) % n] == people[(i + 2) % n]:
            bad.append('%s to %s: three %s shots in a row' % (label(i), label(i + 2), 'people' if people[i] else 'logo'))
        for j in range(i):
            if shots[j][1] == shots[i][1] and span(shots[j])[0] < span(shots[i])[1] and span(shots[i])[0] < span(shots[j])[1]:
                bad.append('%s and %s: the same footage twice' % (label(j), label(i)))
    logos = [i for i in range(n) if not people[i]]
    for a, b in zip(logos, logos[1:] + logos[:1]):
        if 'front' in shots[a][0] and 'front' in shots[b][0]:
            bad.append('%s then %s: two centred logos in succession' % (label(a), label(b)))
    if bad:
        sys.exit('%s breaks the variety rules:\n  ' % name + '\n  '.join(bad))

def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe: return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
NORM = 'scale=1920:1080:flags=lanczos,fps=25,setsar=1,format=yuv420p'

def run(*a):
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y'] + list(a), check=True)

def cut(shots, tmp, tag):
    parts = []
    for i, (_, src, at, dur) in enumerate(shots):
        p = os.path.join(tmp, '%s_%02d.mp4' % (tag, i))
        run('-ss', str(at), '-i', SRC[src], '-t', str(dur), '-an', '-vf', NORM, '-c:v', 'libx264', '-crf', '14', '-preset', 'veryfast', p)
        parts.append(p)
    lst = os.path.join(tmp, tag + '.txt')
    open(lst, 'w').write(''.join("file '%s'\n" % p for p in parts))
    master = os.path.join(tmp, tag + '_master.mp4')
    run('-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', master)
    return master

if __name__ == '__main__':
    tmp = tempfile.mkdtemp(prefix='tekex-reels-')
    names = sys.argv[1:] or list(OUT)
    for name in names:
        check(name, OUT[name][0])
    for name in names:
        shots, grey, sizes = OUT[name]
        master = cut(shots, tmp, name)
        for w, crf, cap in sizes:
            vf = 'scale=%d:-2:flags=lanczos' % w + (',hue=s=0' if grey else '') + ',format=yuv420p'
            out = os.path.join(ROOT, 'assets', 'video', '%s-%d.mp4' % (name, w))
            run('-i', master, '-an', '-vf', vf, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', str(crf),
                '-maxrate', cap, '-bufsize', cap.replace('k', '') + 'k', '-g', '50', '-movflags', '+faststart', out)
            print('wrote', os.path.relpath(out, ROOT), '%.1f MB' % (os.path.getsize(out) / 1e6))
    shutil.rmtree(tmp)
