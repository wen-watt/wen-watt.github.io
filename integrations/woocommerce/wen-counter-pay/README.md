# Wen Counter Pay · WooCommerce

Free, receive-only Solana Pay checkout for WooCommerce, built on the Wen Counter Protocol (WCP-1) of the [Wen Open Lab](https://wen-watt.github.io/lab/shop-integration.html). Apache-2.0.

**How an order is paid**
1. The buyer chooses *Pay with Solana Pay* and places the order.
2. The plugin gives the order a fresh reference key and a Solana Pay link: your address, the amount in the chosen token, the reference, and `order:<number>` as memo.
3. The order received page shows the QR and an *Open in wallet* button. The buyer pays from their own wallet.
4. The shop server reads the chain (three read methods only) and runs the five-point check: reference, recipient, token, amount, success. Then the order is paid. One transaction pays one order.
5. If the tab is closed, a background check every 5 minutes finishes the job.

**Run the checks**
```bash
node tests/make-fixtures.js   # fixtures from lab/counter/counter-core.js (run from the repository root)
php tests/test-core.php       # 12: PHP core gives the same answers as the JavaScript core
php tests/test-gateway.php    # 27: settings, order, chain check, REST status, background check, usability (stray transaction, same QR, no auto-cancel, payment email, wallet-app hint)
php tests/test-safety.php     # 14: no keys, no signing, read-only RPC, escaped output, attribution
node tests/browser.e2e.js     # 6: QR, polling, paid, foreign link ignored (Playwright)
```

**Files**
- `wen-counter-pay.php` — bootstrap, REST status endpoint, background check, block checkout registration.
- `includes/class-wcp-core.php` — PHP port of the WCP-1 pure functions (base58, amounts, Solana Pay URL, memo, five-point check).
- `includes/class-wcp-rpc.php` — read-only RPC client (allow-list of three methods).
- `includes/class-wc-gateway-wen-counter.php` — the payment gateway.
- `includes/class-wcp-blocks.php`, `assets/wcp-blocks.js` — Checkout block support.
- `assets/wcp-checkout.js`, `assets/qrcode.js` (MIT, same file as the Wen Counter), `assets/wcp.css`.

Built on Wen Counter (WCP-1), Wen Open Lab · wen-watt.github.io, on Solana, Solana Pay, SPL Token and Token-2022, WNS and WEN. Keep the NOTICE. Example code, not audited. Devnet first.
