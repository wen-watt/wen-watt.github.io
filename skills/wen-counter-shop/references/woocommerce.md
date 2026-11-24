# WooCommerce: Wen Counter Pay plugin

Folder: `integrations/woocommerce/wen-counter-pay/` · installable zip: `integrations/woocommerce/wen-counter-pay.zip` (same files).

## Install
1. Download the zip from the repository (or copy the folder to `wp-content/plugins/wen-counter-pay/`).
2. WordPress → Plugins → Add New → Upload Plugin → choose the zip → Activate. WooCommerce must be active.
3. WooCommerce → Settings → Payments → **Wen Counter (Solana Pay)** → Manage.

## Configure
- Enable: on.
- Receiving address: the owner's public address (wallet → Receive → Solana). The plugin refuses anything that is not a 32-byte Solana address.
- Network: Devnet. Mainnet only with the confirmation checkbox, after a devnet test.
- Token: USDC by default (on devnet the plugin uses the devnet USDC test mint automatically). Or SOL, WEN, JUP, USDT, or a custom SPL mint (decimals are read from the chain).
- Tokens per 1 unit of shop currency: 1 for USD + USDC. Amounts are rounded up, never down.
- Order number in memo: on (public memo `order:<number>`).
- RPC endpoint: empty for the public endpoint, or the owner's provider URL (https only).

## Test on devnet
1. Get devnet SOL (faucet.solana.com) and, if paying in USDC, devnet USDC for a test wallet.
2. Place an order, choose *Pay with Solana Pay*.
3. On the order received page scan the QR or press *Open in wallet*; check the first and last five characters of the address in the wallet.
4. Within seconds the page shows "✓ Paid" with an Explorer link; the order becomes Processing with a note.
5. Close-the-tab test: pay a second order and close the page; within 5 minutes the background check marks it paid.

## What the plugin does and does not do
- Does: fresh reference per order, Solana Pay link and QR, server-side five-point check, one transaction per order, order note with the Explorer link, background check for 24 hours.
- Does not: hold funds, connect wallets, sign, refund automatically, convert currencies, issue fiscal receipts.

## Run the plugin checks
```bash
node integrations/woocommerce/wen-counter-pay/tests/make-fixtures.js
php integrations/woocommerce/wen-counter-pay/tests/test-core.php
php integrations/woocommerce/wen-counter-pay/tests/test-gateway.php
php integrations/woocommerce/wen-counter-pay/tests/test-safety.php
node integrations/woocommerce/wen-counter-pay/tests/browser.e2e.js
```
