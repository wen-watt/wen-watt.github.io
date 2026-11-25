#!/usr/bin/env python3
"""Wen says cards: cut square cards with a caption from a triptych (3 panels with white gaps).

Usage:
  python3 tools/media/wen_says.py tools/media/wen-says-<batch>.json            # make cards into wen-media-f/
  python3 tools/media/wen_says.py tools/media/wen-says-<batch>.json --gallery  # + add to media.json and rebuild Wen Media

Batch JSON:
  {"sources": {"A": "wen-media-f/wen-hero-triptych-day.jpg", ...},
   "items": [{"src": "A", "panel": 0, "y0": 190, "slug": "be-strong",
              "title": "Be strong.", "sub": "Stay strong, fren. Fly anyway.",
              "alt": "...", "note": "..."}]}
Panels are found automatically from the white gaps. y0 = top of the square inside the panel.
"""
import json, os, sys, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); os.chdir(ROOT)
SER = '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'; I = '/usr/share/fonts/opentype/inter/'
F = lambda p, s: ImageFont.truetype(p, s)
TEAL = (79, 209, 197); GOLD = (240, 190, 90); S = 1080


def panels(im):
    a = np.asarray(im.convert('L'), float); col = (a > 240).mean(0); white = np.where(col > 0.97)[0]
    gaps = []
    for x in white:
        if gaps and x == gaps[-1][-1] + 1: gaps[-1].append(x)
        else: gaps.append([x])
    edges = [0] + [v for g in gaps for v in (g[0] - 1, g[-1] + 1)] + [im.size[0] - 1]
    return [(edges[i], edges[i + 1]) for i in range(0, len(edges), 2)]


def card(im, pan, y0, title, sub, kicker='WEN SAYS'):
    x0, x1 = pan; w = x1 - x0 + 1; y0 = max(0, min(y0, im.size[1] - w))
    sq = im.crop((x0, y0, x0 + w, y0 + w)).resize((S, S), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
    g = Image.new('L', (1, S))
    for j in range(S): g.putpixel((0, j), int(min(1, max(0, (j - S * 0.55) / (S * 0.33))) ** 1.1 * 238))
    sq = Image.composite(Image.new('RGB', (S, S), (6, 10, 22)), sq, g.resize((S, S)))
    sh = Image.new('L', (S, S), 0); ds = ImageDraw.Draw(sh); d = ImageDraw.Draw(sq); jobs = []
    def ctr(y, txt, font, fill, track=0):
        x = (S - (sum(d.textlength(c, font=font) for c in txt) + track * (len(txt) - 1))) / 2
        jobs.append((x, y, txt, font, fill, track))
        for c in txt: ds.text((x + 2, y + 3), c, font=font, fill=255); x += d.textlength(c, font=font) + track
    ctr(800, kicker, F(I + 'Inter-Bold.otf', 30), TEAL, 8)
    ctr(842, title, F(SER, 96 if len(title) < 18 else 80), (255, 255, 255))
    ctr(965, sub, F(I + 'Inter-Regular.otf', 36), (205, 212, 228))
    sq = Image.composite(Image.new('RGB', (S, S)), sq, sh.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * .75)))
    d = ImageDraw.Draw(sq)
    for x, y, txt, font, fill, track in jobs:
        for c in txt: d.text((x, y), c, font=font, fill=fill); x += d.textlength(c, font=font) + track
    wm = 'wen-watt.github.io'; fw = F(I + 'Inter-SemiBold.otf', 22); d.text((S - d.textlength(wm, font=fw) - 28, S - 44), wm, font=fw, fill=GOLD)
    return sq


def main():
    b = json.load(open(sys.argv[1])); srcs = {k: Image.open(v).convert('RGB') for k, v in b['sources'].items()}
    pans = {k: panels(v) for k, v in srcs.items()}; made = []
    for it in b['items']:
        out = f'wen-media-f/wen-says-{it["slug"]}.jpg'
        card(srcs[it['src']], pans[it['src']][it['panel']], it['y0'], it['title'], it['sub'], it.get('kicker', 'WEN SAYS')).save(out, quality=88, optimize=True, progressive=True)
        made.append((out, it)); print('card', out)
    if '--gallery' in sys.argv:
        db = json.load(open('tools/media/media.json')); have = {d['file'] for d in db}
        new = [{'file': o, 'alt': it['alt'], 'note': it['note'], 'link': it.get('link', ''), 'series': 'Wen says'} for o, it in made if o not in have]
        json.dump(new + db, open('tools/media/media.json', 'w'), ensure_ascii=False, indent=1)
        subprocess.run([sys.executable, 'tools/media/build_media.py'], check=True)


if __name__ == '__main__':
    main()
