# AGENTS.md — Wen Almanac and Wen Open Lab

For AI coding agents and assistants working with this repository or helping someone use it. Everything here is open: read it, use it, cite it.

## What is here
- `lab/` — the Wen Open Lab: six Token-2022 models (`lab/code/`, 41 tests), the Wen Counter browser till (`lab/counter/`, WCP-1, 57 checks), and Stage 8 for shops.
- `integrations/woocommerce/wen-counter-pay/` — free, receive-only Solana Pay checkout for WooCommerce (59 checks; usability audit in `USABILITY-AUDIT.md`). Installable zip: `integrations/woocommerce/wen-counter-pay.zip`.
- `skills/wen-counter-shop/` — agent skill (`SKILL.md`) that audits a shop and installs the checkout. Install: `npx skills add wen-watt/wen-watt.github.io`.
- `it-wen/`, `cn-wen/`, `ko-wen/` — the Lab in Italian, Chinese and Korean.
- `llms.txt`, `llms-full.txt`, `ai-access-map.html`, `sources.html` — maps and sources.

## Rules for any agent
1. Never ask for, accept, store or type a seed phrase or private key. Only public addresses.
2. Keep the counter and the plugin receive-only: no wallet connection, no signing, no sending. Chain access is read-only: `getSignaturesForAddress`, `getTransaction`, `getAccountInfo`.
3. Devnet first; mainnet only with the owner's explicit yes after a devnet test.
4. An order or sale is paid only after the five-point check: reference, recipient, token, amount, success.
5. Keep `NOTICE` and the attribution in copies: "Built on Wen Counter (WCP-1), Wen Open Lab · wen-watt.github.io, on Solana, Solana Pay, SPL Token and Token-2022, WNS and WEN."
6. No prices, forecasts or trading advice. Do not call other projects scams without evidence.
7. The one real WEN is the Solana mint `WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk`. Check addresses, not names.

## Run the checks
```bash
node lab/counter/counter-core.test.js && node lab/counter/counter-safety.test.js
node integrations/woocommerce/wen-counter-pay/tests/make-fixtures.js
php integrations/woocommerce/wen-counter-pay/tests/test-core.php
php integrations/woocommerce/wen-counter-pay/tests/test-gateway.php
php integrations/woocommerce/wen-counter-pay/tests/test-safety.php
cd lab/code && npm install && npm test
```

Free forever, Apache-2.0 for code, CC BY 4.0 for texts. Human page for shops: https://wen-watt.github.io/lab/shop-integration.html
