# Wen Almanac — wen-watt.github.io

Static site (plain HTML/CSS/JS, no build step) served by GitHub Pages from the
repository root. It is the maintained home of the $WEN almanac, migrated post by
post from wen-crypto.com.

Working rules live in `WEN_PROTOCOL.md` (kept outside the site, with the owner).
State of this archive: 2026-10-10 (all posts and key pages rewritten; SEO metadata on every indexable page; author "Wen", the community voice).

## Structure

```
index.html                 home: migrated posts only, newest first
navigation.html            HTML site map (all posts by date, key pages, media)
wen-media.html             Wen Media gallery (file list inline in FILES array)
sitemap.xml, robots.txt
<9 key pages>.html         flat, in the root
posts/<wp-slug>.html       one flat file per post (example-post-slug.html = template)
lab/                       Wen Open Lab: roadmap, models 1-5, benefits (own submenu in nav.js)
lab/code/                  open example code (Apache-2.0): npm install && npm run typecheck && npm test
assets/css/style.css       the only stylesheet
assets/js/nav.js           sidebar menu + footer for every page (edit here only)
assets/js/main.js
wen-media/                 all images (.jpeg), PDFs and HTML attachments — flat
```

## Posts (13)

| Date | File |
|---|---|
| 2026-10-10 | posts/wen-program-library-review.html (original review, also in the left menu) |
| 2026-09-07 | posts/solanas-wns-roadmap-how-a-meme-cat-poem.html |
| 2026-09-03 | posts/wns-w-token-2022-and-economic-solana-wen.html |
| 2026-09-02 | posts/south-korea-cbdc-and-tokenization.html |
| 2026-09-02 | posts/how-sol-achieved-proven-global-recognition-2022-2026.html |
| 2026-09-02 | posts/ultimate-solana-token-2022-and-wen-compliance-and-testing.html |
| 2026-07-25 | posts/wen-cat-iq-wiki.html |
| 2026-06-23 | posts/wen-token-network-re-examination.html |
| 2026-01-08 | posts/wen-crypto-token-gitgub-com-release-planning.html |
| 2025-12-25 | posts/may-the-spirit-of-christmas-bring-you-an-unexpected-miracle-wen-cat.html |
| 2025-12-24 | posts/catlumpurr-kaula-lumpur-malaysia-jan-31-to-feb-1-2026-video-about-event.html |
| 2025-12 (approx.) | posts/w-coin-wen-crypto-coin-expanding-the-gates.html |
| 2025-12-03 | posts/wen-crypto-gold-coin-coinbase-roadmap-for-jupiter-bonk-memecoin-debuts-as-an-etp-today.html |

## Not migrated yet (links are inactive: `href="#" data-pending="<yyyy/mm/dd/slug>"`)

reddit-com-and-the-cryptocurrency-section-were-looking-for-history-correctly (2025-12-05),
meow-is-back-on-the-planetary-call-60-back-to-the-future-with-jup-friend-wen (2025-11-18),
what-is-wendys-backstory-and-what-is-new-world-wen-crypto (2025-11-15),
bsol-new-york-stock-exchange-wall-street (2025-10-30),
wen-x-bonk-playground-drops-toysmak-3rs-partners (2025-10-29),
drop-001-wen-x-bonk-october-29-12-pm-et-2025 (2025-10-25),
wen-crypto-gears-up-for-global-expansion-partnership-with-elevate-pictures-signals-multimedia-revolution (2025-10-22),
solana-successfully-endures-peak-traffic-stress-test-during-wen-token-launch-catalyzing-wns-adoption (2025-10-21),
the-wen-crypto-usefulness-of-the-wns-standard-for-cryptocurrency-implementation (2025-10-21),
wen-crypto-egypt-cats (2025-10-10),
wen-crypto-x-elevate-pictures-and-next-future (2025-10-10),
wen-new-standard-wns-0-0-wen-crypto-inform (2025-09-23).

To activate one: search the repo for `data-pending="…/<slug>"`, replace `href="#"`
with the local path and remove `data-pending` (and `aria-disabled` in nav.js).

## Adding a post (checklist)

1. `posts/<slug>.html` from the template; text rewritten block by block (same meaning, facts, links and length), images `wen-media/<name>.jpeg`.
   Metadata between `<!-- seo:start -->` and `<!-- seo:end -->`: title 40–60 chars, description 135–160, keywords, Open Graph, JSON-LD BlogPosting.
2. Wen Media roller block (8 images, schema.org ImageGallery) before the provenance note.
3. Card on `index.html` in date order.
4. Line in `navigation.html` and `<url>` in `sitemap.xml` (lastmod = publication date).
5. Activate the post's footer slot / pending links if any.
6. Link check.

## Wen Open Lab

Seven pages in `lab/` (roadmap, receipts, royalties, B2B invoices, payments bridge, simulator,
benefits). Example code lives in `lab/code/` and runs in LiteSVM (local Solana VM, no network):
25 checks, see `lab/code/test/results.txt`. Do not install the npm package
`@wen-community/wen-new-standard`: npm removed it as malicious.

## Indexing notes

- Home canonical: `https://wen-watt.github.io/`.
- Stub pages with "Content pending" carry `noindex, follow` and are not in the
  sitemap: `privacy-policy-cookie-policy.html`, `wen-crypto-by-solana-gifs.html`,
  `wenwencoin-com-content-wen-brand.html`.
