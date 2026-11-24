#!/usr/bin/env python3
"""Add image-story pages in the same model as the first 250:
question title, the photo with a described caption, a "Did you know?" block
with one checked fact and a "read more" link, the quiz button, prev/next ring.

Usage: python3 tools/media/build_stories.py tools/media/stories-batchN.json
Each entry: file, q, kicker, bold, f, l (almanac path, may carry #anchor).
Alt text comes from tools/media/media.json. Then run build_media.py."""
import json, re, os, sys, html
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(ROOT)
BASE = 'https://wen-watt.github.io/'
TPL = 'image-story/best-crypto-memes-in-the-world.html'
DATE = os.environ.get('WEN_DATE', '2026-11-25')
E = lambda s: html.escape(s, quote=True)


def slug(file):
    return re.sub(r'\.(jpe?g|png|webp)$', '', file) + '.html'


def short(q, n=48):
    if len(q) <= n + 2:
        return q
    cut = q[:n].rsplit(' ', 1)[0]
    return cut + '…'


def page(st, alt, prev, nxt):
    t = open(TPL).read()
    page_url = f'{BASE}image-story/{slug(st["file"])}'
    img_url = f'{BASE}wen-media/{st["file"]}'
    title = f'{short(st["q"])} | Wen Media'
    desc = f'Did you know? {st["f"]} A Wen Media photo with a checked fact from the Wen almanac.'
    head_ld = {"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": desc, "url": page_url,
               "inLanguage": "en",
               "primaryImageOfPage": {"@type": "ImageObject", "contentUrl": img_url, "url": img_url, "name": alt,
                                      "caption": st["f"], "creditText": "Wen community archive",
                                      "isPartOf": {"@type": "CollectionPage", "name": "Wen Image Stories", "url": f"{BASE}image-story/index.html"}},
               "about": {"@type": "Thing", "name": st["q"]},
               "mentions": {"@type": "CreativeWork", "url": BASE + st["l"].split('#')[0]},
               "isPartOf": {"@type": "WebSite", "name": "Wen Almanac", "url": BASE},
               "publisher": {"@type": "Organization", "name": "Wen Almanac", "url": BASE}}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE},
        {"@type": "ListItem", "position": 2, "name": "Image stories", "item": f"{BASE}image-story/index.html"},
        {"@type": "ListItem", "position": 3, "name": st["q"], "item": page_url}]}
    t = re.sub(r'<title>.*?</title>', f'<title>{E(title)}</title>', t, flags=re.S)
    t = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{page_url}">', t)
    t = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{E(desc)}">', t)
    t = re.sub(r'<meta name="keywords" content="[^"]*">', f'<meta name="keywords" content="Wen Media, Wen cat photo, {E(st["kicker"])}, Wen almanac, Solana">', t)
    t = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{E(title)}">', t)
    t = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{E(desc)}">', t)
    t = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{page_url}">', t)
    t = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{img_url}">', t)
    t = re.sub(r'<meta property="og:image:alt" content="[^"]*">', f'<meta property="og:image:alt" content="{E(alt)}">', t)
    t = re.sub(r'<meta name="twitter:image" content="[^"]*">', f'<meta name="twitter:image" content="{img_url}">', t)
    t = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "WebPage".*?</script>',
               '<script type="application/ld+json">' + json.dumps(head_ld, ensure_ascii=False) + '</script>', t, count=1, flags=re.S)
    t = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "BreadcrumbList".*?</script>',
               '<script type="application/ld+json">' + json.dumps(crumbs, ensure_ascii=False) + '</script>', t, count=1, flags=re.S)
    t = re.sub(r'<h1>.*?</h1>', f'<h1>{E(st["q"])}</h1>', t, count=1, flags=re.S)
    t = re.sub(r'<figure class="photo-view">.*?</figure>',
               f'<figure class="photo-view">\n      <img src="../wen-media/{E(st["file"])}" alt="{E(alt)}">\n'
               f'      <figcaption>{E(alt)} · from the <a href="../wen-media.html">Wen Media</a> community archive · '
               f'<a href="../wen-media/{E(st["file"])}">open the original</a></figcaption>\n    </figure>', t, count=1, flags=re.S)
    t = re.sub(r'<section class="dyk" aria-label="Did you know\?">.*?</section>',
               f'<section class="dyk" aria-label="Did you know?">\n      <p class="dyk-kicker">Did you know? · {E(st["kicker"])}</p>\n'
               f'      <p><strong>{E(st["bold"])}</strong> {E(st["f"])}</p>\n'
               f'      <p style="margin:0;"><a href="../{E(st["l"])}">Read more in the almanac &rarr;</a></p>\n    </section>', t, count=1, flags=re.S)
    t = re.sub(r'<a href="[^"]*" rel="prev">', f'<a href="{prev}" rel="prev">', t, count=1)
    t = re.sub(r'<a href="[^"]*" rel="next">', f'<a href="{nxt}" rel="next">', t, count=1)
    return t


def main(batch):
    stories = json.load(open(batch))
    db = json.load(open('tools/media/media.json'))
    byfile = {d['file']: d for d in db}
    idx = open('image-story/index.html').read()
    order = re.findall(r'<a class="story" href="([^"]+)"', idx)
    first, last = order[0], order[-1]
    new = [s for s in stories if not os.path.exists('image-story/' + slug(s['file']))]
    names = [slug(s['file']) for s in new]
    ring = [last] + names + [first]
    for i, st in enumerate(new):
        alt = byfile[st['file']]['alt']
        open('image-story/' + names[i], 'w').write(page(st, alt, ring[i], ring[i + 2]))
    # relink the old ends of the ring
    for p, rel, target in [(last, 'next', names[0]), (first, 'prev', names[-1])]:
        s = open('image-story/' + p).read()
        s = re.sub(r'<a href="[^"]*" rel="' + rel + '">', f'<a href="{target}" rel="{rel}">', s, count=1)
        open('image-story/' + p, 'w').write(s)
    # index: cards, hasPart, counts
    total = len(order) + len(new)
    cards = ''
    for i, st in enumerate(new):
        with Image.open('wen-media/' + st['file']) as im:
            w, h = im.size
        ww, hh = (300, round(300 * h / w)) if w >= h else (round(300 * w / h), 300)
        cards += (f'\n      <a class="story" href="{names[i]}"><img src="../wen-media/{E(st["file"])}" alt="{E(byfile[st["file"]]["alt"])}" '
                  f'loading="lazy" width="{ww}" height="{hh}"><span>{E(st["q"])}</span></a>')
    last_card = re.search(r'<a class="story" href="' + re.escape(last) + r'">.*?</a>', idx, re.S)
    idx = idx[:last_card.end()] + cards + idx[last_card.end():]
    parts = ''.join(', ' + json.dumps({"@type": "WebPage", "name": st["q"], "url": f"{BASE}image-story/{names[i]}"}, ensure_ascii=False)
                    for i, st in enumerate(new))
    idx = re.sub(r'(("hasPart": \[.*?)\])(\})', lambda m: m.group(2) + parts + ']' + m.group(3), idx, count=1, flags=re.S)
    old = len(order)
    idx = idx.replace(f'{old} Photos, {old} Checked Facts', f'{total} Photos, {total} Checked Facts')
    idx = idx.replace(f'Wen image stories: {old} Wen cat photos', f'Wen image stories: {total} Wen cat photos')
    idx = idx.replace(f'<p class="intro">{old} photos', f'<p class="intro">{total} photos')
    # clean promotional tails in card alts too
    for h in [' goes bluechip', ' to the moon', ' holds strong', ' long term', ' world class', ' keeps growing']:
        idx = idx.replace(h + '"', '"')
    open('image-story/index.html', 'w').write(idx)
    # media.json: point tiles to the stories, the fact becomes the note
    for i, st in enumerate(new):
        d = byfile[st['file']]
        d['link'] = 'image-story/' + names[i]
        d['note'] = st['f']
        d['series'] = 'Image story'
    json.dump(db, open('tools/media/media.json', 'w'), ensure_ascii=False, indent=1)
    # sitemap entries for the new pages
    sm = open('sitemap.xml').read()
    add = ''.join(f'  <url>\n    <loc>{BASE}image-story/{names[i]}</loc>\n    <image:image>\n      <image:loc>{BASE}wen-media/{st["file"]}</image:loc>\n'
                  f'    </image:image>\n    <lastmod>{DATE}</lastmod>\n    <priority>0.4</priority>\n  </url>\n'
                  for i, st in enumerate(new) if f'image-story/{names[i]}<' not in sm)
    sm = sm.replace('</urlset>', add + '</urlset>')
    open('sitemap.xml', 'w').write(sm)
    print('new stories', len(new), '| total', total)
    return old, total


if __name__ == '__main__':
    old, total = main(sys.argv[1])
    open('tools/media/.story-count', 'w').write(f'{old} {total}')
