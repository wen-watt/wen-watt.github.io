#!/usr/bin/env python3
"""Wen Media builder.
Source of truth: tools/media/media.json (file, alt, note, link, series).
Writes the static grid, the ImageGallery JSON-LD and the notes section into
wen-media.html, refreshes alt text on image-story pages and the image entries
of wen-media.html in sitemap.xml.

First run migrates the old JavaScript FILES/PAGES arrays into media.json.
To add images later: append entries to media.json (newest first), run this."""
import json, re, os, html, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(ROOT)
BASE = 'https://wen-watt.github.io/'
PAGE = 'wen-media.html'
DB = 'tools/media/media.json'
E = lambda s: html.escape(s, quote=True)

HYPE = [' goes bluechip', ' to the moon', ' holds strong', ' long term', ' world class', ' keeps growing']


def clean(alt):
    for h in HYPE:
        alt = alt.replace(h, '')
    return re.sub(r'\s+', ' ', alt).strip()


def story_note(page):
    p = f'image-story/{page}'
    if not os.path.exists(p):
        return ''
    s = open(p).read()
    m = re.search(r'<meta name="description" content="([^"]*)"', s)
    if not m:
        return ''
    d = html.unescape(m.group(1))
    d = re.sub(r'\s*A Wen Media photo with a checked fact from the Wen almanac\.?$', '', d)
    return d.strip()


def migrate():
    s = open(PAGE).read()
    files = re.findall(r'\["([^"]+)", "([^"]*)"\]', s[s.find('var FILES'):])
    pages = json.loads(re.search(r'var PAGES = (\{.*?\});', s, re.S).group(1))
    new = json.load(open('tools/media/new-2611.json'))
    db = [{'file': f, 'alt': a, 'note': n, 'link': l, 'series': ser} for f, a, n, l, ser in new]
    have = {d['file'] for d in db}
    for f, a in files:
        if f in have:
            continue
        st = pages.get(f, '')
        db.append({'file': f, 'alt': clean(a), 'note': story_note(st) if st else '',
                   'link': f'image-story/{st}' if st else '', 'series': 'Image story' if st else ''})
    json.dump(db, open(DB, 'w'), ensure_ascii=False, indent=1)
    return db


def src(f):
    # owner uploads live in wen-media/ (bare file name); Claude-made graphics in wen-media-f/ (path with a folder)
    return f if '/' in f else f'wen-media/{f}'


def dims(f):
    try:
        with Image.open(src(f)) as im:
            return im.size
    except Exception:
        return None


def build(db):
    s = open(PAGE).read()
    n = len(db)
    tiles = []
    for d in db:
        f = d['file']
        href = d['link'] or src(f)
        cls = ' class="has-fact"' if d['link'].startswith('image-story/') else (' class="has-note"' if d['link'] else '')
        title = d['alt'] + (f' — {d["note"]}' if d['note'] and not d['link'].startswith('image-story/') else '')
        wh = dims(f)
        size = f' width="{wh[0]}" height="{wh[1]}"' if wh else ''
        tiles.append(f'<a href="{E(href)}"{cls} title="{E(title)}"><img src="{E(src(f))}" alt="{E(d["alt"])}" loading="lazy" decoding="async"{size}></a>')
    grid = '<div id="media-grid">\n' + '\n'.join(tiles) + '\n</div>'
    s = re.sub(r'<div id="media-grid">.*?</div>(?=\s*\n\s*<(p|section) )', grid, s, count=1, flags=re.S) if '<div id="media-grid">\n<a' in s \
        else s.replace('<div id="media-grid"></div>', grid, 1)

    # notes now live on image-story pages: drop the old notes section if present
    s = re.sub(r'\n*<section id="media-notes".*?</section>', '', s, count=1, flags=re.S)
    stories = sum(1 for d in db if d['link'].startswith('image-story/'))
    s = re.sub(r'All \d+ stories are collected on the', f'All {stories} stories are collected on the', s)

    # intro count and maintenance note
    s = re.sub(r'in one place — \d+ tiles below', f'in one place — {n} tiles below', s)
    s = re.sub(r'<p style="margin-top:28px;font-size:13px;color:var\(--ink-dim\);"><em>How this stays current:</em>.*?</p>',
               '<p style="margin-top:28px;font-size:13px;color:var(--ink-dim);"><em>How this stays current:</em> '
               'the gallery is plain HTML, so every picture, its description and its link are visible to readers and search engines '
               'without running any script. The list lives in <code>tools/media/media.json</code> (file, description, note, link); '
               '<code>tools/media/build_media.py</code> rebuilds this page, the image stories\' descriptions and the image sitemap.</p>', s, count=1, flags=re.S)

    # JSON-LD: ImageGallery with ImageObjects
    imgs = []
    for d in [x for x in db if x['note']]:
        o = {'@type': 'ImageObject', 'contentUrl': f'{BASE}{src(d["file"])}', 'name': d['alt'],
             'creditText': 'Wen community', 'acquireLicensePage': f'{BASE}originals.html'}
        if d['note']:
            o['description'] = d['note']
        imgs.append(o)
    ld = {'@context': 'https://schema.org', '@type': 'ImageGallery',
          'name': 'Wen Media: Wen Cat, Meme and Gold Coin Image Archive',
          'description': f'Wen Media, the full image archive: {n} Wen cat, Wen meme and golden Wen coin pictures from the community, '
                         'each described, many with a checked fact or the article where it is used.',
          'url': f'{BASE}{PAGE}', 'inLanguage': 'en',
          'publisher': {'@type': 'Organization', 'name': 'Wen Almanac', 'url': BASE},
          'numberOfItems': n, 'image': imgs}  # described images only; every image is also an <img> in the grid
    s = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "(WebPage|ImageGallery)".*?</script>',
               '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', s, count=1, flags=re.S)

    # replace the old JS builder with a tiny enhancer (count + missing files)
    js = ('<script>\n(function(){var g=document.getElementById("media-grid");if(!g)return;'
          'var c=document.getElementById("media-count");if(c)c.textContent=g.children.length+" images";'
          'g.querySelectorAll("img").forEach(function(img){img.addEventListener("error",function(){'
          'var a=img.parentNode,m=document.createElement("span");m.className="missing";'
          'm.textContent=img.getAttribute("src").replace("wen-media/","");a.replaceChild(m,img);});});})();\n</script>')
    s = re.sub(r'<script>\n\(function\(\) \{\n  var FILES = \[.*?</script>', js, s, count=1, flags=re.S)
    s = re.sub(r'<script>\n\(function\(\)\{var g=document.getElementById\("media-grid"\).*?</script>', js, s, count=1, flags=re.S)
    css = ('<style id="media-css">#media-grid a.has-note::after{content:"\\2197";position:absolute;top:6px;right:6px;width:20px;height:20px;'
           'border-radius:50%;background:var(--teal,#4fd1c5);color:#06201d;font:700 12px/20px Inter,sans-serif;text-align:center;}'
           '</style>')
    if 'id="media-css"' not in s:
        s = s.replace('</head>', css + '\n</head>', 1)
    open(PAGE, 'w').write(s)
    return n


def stories(db):
    k = 0
    for d in db:
        if not d['link'].startswith('image-story/'):
            continue
        p = d['link']
        s = open(p).read()
        t = re.sub(r'(<img src="\.\./wen-media/' + re.escape(d['file']) + r'" alt=")[^"]*(")', lambda m: m.group(1) + E(d['alt']) + m.group(2), s, count=1)
        t = re.sub(r'(<figcaption[^>]*>)[^<·]*(·)', lambda m: m.group(1) + E(d['alt']) + ' ' + m.group(2), t, count=1)
        if t != s:
            open(p, 'w').write(t)
            k += 1
    return k


def sitemap(db):
    s = open('sitemap.xml').read()
    blk = re.search(r'(<url>\s*<loc>https://wen-watt.github.io/wen-media.html</loc>)(.*?)(</url>)', s, re.S)
    lastmod = re.search(r'<lastmod>[^<]*</lastmod>', blk.group(2))
    lm = '\n    <lastmod>2026-11-24</lastmod>' if lastmod else ''
    imgs = ''.join(f'\n    <image:image>\n      <image:loc>{BASE}{E(src(d["file"]))}</image:loc>\n    </image:image>' for d in db)
    s = s[:blk.start()] + blk.group(1) + lm + imgs + '\n  ' + blk.group(3) + s[blk.end():]
    open('sitemap.xml', 'w').write(s)


if __name__ == '__main__':
    db = json.load(open(DB)) if os.path.exists(DB) else migrate()
    n = build(db)
    k = stories(db)
    sitemap(db)
    print('tiles', n, '| story pages updated', k, '| with notes', sum(1 for d in db if d['note']))
