# Wen Almanac — wen-watt.github.io

Static site (plain HTML/CSS/JS, no build step) served by GitHub Pages from the
repository root. It is the maintained home of the $WEN almanac, migrated post by
post from wen-crypto.com.

Working rules live in `WEN_PROTOCOL.md` (kept outside the site, with the owner).
State of this archive: 2026-10-12 (24 posts, 9 key pages, Wen Open Lab, the quiz "What do you know about Wen?"; SEO metadata on every indexable page; author "Wen", the community voice; favicon and mobile menu).

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

## Posts (24)

| Date | File |
|---|---|
| 2026-10-12 | posts/wen-quiz-review.html |
| 2026-10-10 | posts/wen-open-lab-review.html |
| 2026-10-10 | posts/wen-program-library-review.html |
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
| 2025-12-04 | posts/w-coin-wen-crypto-coin-expanding-the-gates.html |
| 2025-12-03 | posts/wen-crypto-gold-coin-coinbase-roadmap-for-jupiter-bonk-memecoin-debuts-as-an-etp-today.html |
| 2025-11-18 | posts/meow-is-back-on-the-planetary-call-60-back-to-the-future-with-jup-friend-wen.html |
| 2025-11-17 | posts/football-tournament-nov-19-ethereum-bangkok-wen-bonk-bitso-onchain-web3-tech-efdevcon.html |
| 2025-11-15 | posts/the-copa-de-los-memes-is-a-gamified-irl-football-tournament-nov-19-ethereum-devcon-bangkok-by-bitsoonchain-wen-wenwencoin-bonk.html |
| 2025-11-15 | posts/what-is-wendys-backstory-and-what-is-new-world-wen-crypto.html |
| 2025-11-11 | posts/wen-crypto-nov-11-2025-new-open-source-crypto-community-material.html |
| 2025-11-07 | posts/crypto-fantasy-or-the-inverted-almanac.html |
| 2025-10-30 | posts/bsol-new-york-stock-exchange-wall-street.html |
| 2025-10-29 | posts/wen-x-bonk-playground-drops-toysmak-3rs-partners.html |
| 2025-10-28 | posts/solana-and-western-union-bridging-traditional-finance-and-blockchain-for-global-payments.html |

## Not migrated yet (links are inactive: `href="#" data-pending="<yyyy/mm/dd/slug>"`)

wen-new-standard-wns-0-0-wen-crypto-inform (2025-09-23),
solana-successfully-endures-peak-traffic-stress-test-during-wen-token-launch-catalyzing-wns-adoption (2025-10-21),
the-wen-crypto-usefulness-of-the-wns-standard-for-cryptocurrency-implementation (2025-10-21),
reddit-com-and-the-cryptocurrency-section-were-looking-for-history-correctly (2025-12-05),
wen-crypto-x-elevate-pictures-and-next-future (2025-10-10),
wen-crypto-egypt-cats (2025-10-10).

When a post arrives, its pending links are activated automatically by the build (activate step).

## Adding a post (checklist)

1. `posts/<slug>.html` from the template; text rewritten block by block (same meaning, facts, links and length), images `wen-media/<name>.jpeg`.
   Metadata between `<!-- seo:start -->` and `<!-- seo:end -->`: title 40–60 chars, description 135–160, keywords, Open Graph, JSON-LD BlogPosting.
2. Wen Media roller block (8 images, schema.org ImageGallery) before the provenance note.
3. Card on `index.html` in date order.
4. Line in `navigation.html` and `<url>` in `sitemap.xml` (lastmod = date of the last change of the file).
5. Activate the post's footer slot / pending links if any.
6. Link check.

## Wen Open Lab

Nine pages in `lab/` (roadmap, receipts, royalties, B2B invoices, payments bridge, simulator,
devnet, trust chain, benefits). Example code lives in `lab/code/` and runs in LiteSVM (local Solana VM, no network):
25 checks, see `lab/code/test/results.txt`. Do not install the npm package
`@wen-community/wen-new-standard`: npm removed it as malicious.

## Indexing notes

- Home canonical: `https://wen-watt.github.io/`. Every indexable page has its own canonical, title 40–60, description 135–160, JSON-LD.
- `sitemap.xml` lists every indexable page with `lastmod`; `robots.txt` allows everything and points to it.
- Out of the index on purpose (`noindex`, not in the sitemap): `wen-crypto-by-solana-gifs.html`,
  `wenwencoin-com-content-wen-brand.html` (both lead to Wen Media) and the template `posts/example-post-slug.html`.
- IndexNow (Bing, Yandex and others): key file `eb3892c4f3d77297493bd02f6a4a5ed2.txt` in the root. Submit a changed page with
  `https://www.bing.com/indexnow?url=<page URL>&key=eb3892c4f3d77297493bd02f6a4a5ed2`.
