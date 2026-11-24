# WooCommerce: Wen Counter Pay plugin

Folder: `integrations/woocommerce/wen-counter-pay/` · installable zip: `integrations/woocommerce/wen-counter-pay.zip` (same files). Current version: 0.2.0 (after the usability audit, `USABILITY-AUDIT.md`).

## Install
1. Show the owner what will be installed and get a yes. Download the zip from the repository and check its SHA-256 (`references/verify.md`), or copy the reviewed folder to `wp-content/plugins/wen-counter-pay/`. On a live shop: staging copy or backup first.
2. WordPress → Plugins → Add New → Upload Plugin → choose the zip → Activate. WooCommerce must be active.
3. WooCommerce → Settings → Payments → **Wen Counter (Solana Pay)** → Manage.

## Configure
- Enable: on.
- Receiving address: the owner's public address (wallet → Receive → Solana). The plugin refuses anything that is not a 32-byte Solana address.
- Network: Devnet. Mainnet only with the confirmation checkbox, after a devnet test.
- Token: USDC by default (on devnet the plugin uses the devnet USDC test mint automatically). Other options (SOL, USDT, other listed tokens or a custom SPL mint) only if the owner asks; do not suggest a specific token.
- Tokens per 1 unit of shop currency: 1 for USD + USDC. Amounts are rounded up, never down.
- Order number in memo: on (public memo `order:<number>`).
- Payment email: on (default). The buyer gets a link back to the payment page; WooCommerce itself sends no email for a pending order.
- RPC endpoint: empty for the public endpoint, or the owner's provider URL (https only).

## Test on devnet
1. Get devnet SOL (faucet.solana.com) and, if paying in USDC, devnet USDC for a test wallet.
2. Place an order, choose *Pay with Solana Pay*.
3. On the order received page scan the QR or press *Open in wallet*; check the first and last five characters of the address in the wallet.
4. Within seconds the page shows "✓ Paid" with an Explorer link; the order becomes Processing with a note.
5. Close-the-tab test: place a second order, close the page, open the link from the payment email, pay; the order becomes paid (on the page, or within 5 minutes by the background check).
6. Pay-again test: open *My account → Orders → Pay* for an unpaid order; the QR and reference stay the same.
7. Quiet shop: if the site has few visitors, ask the host for a real cron job on `wp-cron.php` every 5 minutes.
8. Before mainnet: receive one small USDC payment to the shop address so its USDC account exists (otherwise the first buyer pays the one-time account rent).

## What the plugin does and does not do
- Does: fresh reference per order (kept if the buyer pays again), Solana Pay link and QR, server-side five-point check over up to 25 transactions with the reference (a stray one cannot block the order), one transaction per order, order note with the Explorer link, payment email, background check for 24 hours, no WooCommerce auto-cancel within those 24 hours.
- Does not: hold funds, connect wallets, sign, refund automatically, convert currencies, sum partial payments, match exchange withdrawals or manual transfers (they carry no reference), issue fiscal receipts.

## Run the plugin checks
```bash
node integrations/woocommerce/wen-counter-pay/tests/make-fixtures.js
php integrations/woocommerce/wen-counter-pay/tests/test-core.php
php integrations/woocommerce/wen-counter-pay/tests/test-gateway.php
php integrations/woocommerce/wen-counter-pay/tests/test-safety.php
node integrations/woocommerce/wen-counter-pay/tests/browser.e2e.js
```
