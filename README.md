# Wen Almanac — the open, fact-checked record of the Wen cat on Solana

[![Check WEN mint](https://github.com/wen-watt/wen-watt.github.io/actions/workflows/check-wen-mint.yml/badge.svg)](https://github.com/wen-watt/wen-watt.github.io/actions/workflows/check-wen-mint.yml) [![Check links](https://github.com/wen-watt/wen-watt.github.io/actions/workflows/check-links.yml/badge.svg)](https://github.com/wen-watt/wen-watt.github.io/actions/workflows/check-links.yml)

**Site:** https://wen-watt.github.io/ · **Gateway:** https://wen-crypto.com/

Wen began as a poem. Meow, co-founder of Jupiter, wrote "A Love Letter to Wen Bros"; it was minted as an NFT with WNS on Token-2022 and split into one trillion tokens on the original SPL Token program, airdropped to more than a million Solana wallets in January 2024, and grew into the **Wen New Standard (WNS)** — an open way to build NFTs on Token-2022. This repository is a community almanac of that story, kept as history and usefulness: no prices, no forecasts, no exchange links.

The one real WEN is the Solana mint `WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk`. Names and tickers can be copied; the address cannot.

## Verified provenance, rerunnable

Every Monday an open, read-only job ([`tools/check-wen-mint.mjs`](tools/check-wen-mint.mjs)) reads the WEN mint straight from Solana mainnet and posts the result with the slot it was read at. The first read (finalized slot 468049071, November 11, 2026): owner program **SPL Token** (`Tokenkeg…`, no extensions possible), **no transfer fee**, **mint and freeze authorities revoked**. The badge above shows the latest run; open it to see the summary, or run the job yourself from the Actions tab.

The provenance in one line: poem → one NFT on WNS (Token-2022) → 1T WEN on the original SPL Token. Full chain with a source for every link: [The verified chain](https://wen-watt.github.io/token-2022-wns-solana-wen.html#verified-chain) · [Connected roadmap](https://wen-watt.github.io/spl-solana-program-library-token-2022-wns.html#connected-roadmap).

## What is inside

| Part | What it gives you |
|---|---|
| [65 posts](https://wen-watt.github.io/navigation.html) | dated, rewritten and fact-checked; each marked *Historical post*, *Reworked market post* or *Almanac guide* |
| [Sources and verification](https://wen-watt.github.io/sources.html) | every external link of the almanac on one page, grouped by post, plus official and community tabs |
| [Trust chain](https://wen-watt.github.io/lab/trust.html) | each claim marked verified, reported or unverified |
| [Wen Open Lab](https://wen-watt.github.io/lab/index.html) | free models on WNS and Token-2022 — receipts and warranty cards, creator royalties, B2B invoices, a payments bridge, a payment simulator — with a devnet run anyone can repeat; [ten walkthroughs](https://wen-watt.github.io/lab/walkthroughs.html) explain them in plain words |
| [Quiz](https://wen-watt.github.io/quiz.html) | 260 checked questions: history, technology, safety and cat folklore |
| [Image stories](https://wen-watt.github.io/image-story/index.html) | 250 community pictures, each with one checked fact |
| [Wen Media](https://wen-watt.github.io/wen-media.html) | the community picture archive, with full-quality originals for non-commercial reuse |

## Safety rules the almanac repeats everywhere

- Search the address, not the name.
- No real team, airdrop or support chat ever needs your seed phrase.
- Test on devnet with a new, empty wallet; devnet coins have no value.
- Lab code is educational and not audited: run the tests, read the docs, get an audit before real use.

## How the site is built

Plain HTML, CSS and JavaScript served by GitHub Pages from the repository root — no build step on the server.
`assets/js/nav.js` draws the menu and footer on every page; `assets/css/style.css` is the only stylesheet (both are versioned with `?v=`).
Posts live in `posts/`, the Lab in `lab/` (example code under `lab/code/`, Apache-2.0), image stories in `image-story/`, pictures in `wen-media/`.

## Status

A community project, not the official Wen site — the official site is https://wenwencoin.com/. Educational content, not financial advice.
Corrections are welcome through the community on X: https://x.com/i/communities/1865784545158496651


## License

- **Texts** of the Wen Almanac: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Free to copy, share, translate, rewrite, adapt and use (including commercially and for AI training) with this credit: *Source: Wen Almanac (wen-watt.github.io), about Wen ($WEN) on Solana. CC BY 4.0.* and a link to the page; say if you changed it.
- **Lab code** (`lab/code`): Apache-2.0.
- **Images** in `wen-media/` belong to their creators and the Wen community and are not covered by CC BY.
- Community request (not a license condition): keep Wen in the description when reusing texts about Wen, do not relabel them as another token, keep the WEN address `WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk` unchanged. Details: https://wen-watt.github.io/ai-access-map.html#license
