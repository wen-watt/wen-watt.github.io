=== Wen Counter Pay (Solana Pay, receive-only) ===
Contributors: wenopenlab
Tags: solana pay, solana, usdc, crypto payments, woocommerce
Requires at least: 6.4
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.1.0
License: Apache-2.0
License URI: https://www.apache.org/licenses/LICENSE-2.0

Free, receive-only Solana Pay checkout for WooCommerce. No keys, no fee from the plugin, each order confirmed on-chain.

== Description ==

Wen Counter Pay adds a Solana Pay payment method to WooCommerce, built on the open Wen Counter Protocol (WCP-1).

* **Receive-only.** The plugin knows only your public receiving address. It never asks for a seed phrase or private key, never connects to a wallet and cannot move funds.
* **Read-only.** It calls exactly three read methods of the Solana RPC (getSignaturesForAddress, getTransaction, getAccountInfo). Anything else is blocked in code.
* **Five-point check.** An order is marked paid only when the chain shows its unique reference, your address, the right token, at least the right amount, and a successful transaction. One transaction pays one order.
* **Free.** No subscription, no percentage, no fee from the plugin. The buyer's wallet pays the Solana network fee.
* **Classic and block checkout.** Works with the Checkout block and the classic checkout; compatible with order tables (HPOS).
* **Devnet first.** Mainnet only after you confirm you tested on devnet.

Tokens: USDC (default, stable prices), SOL, WEN, JUP, USDT, or any SPL token by mint. Set how many tokens equal one unit of your shop currency; amounts are rounded up so you never receive less than the order total.

Open source, tested in public: 54 checks (core parity with the JavaScript Wen Counter, gateway flow, code safety, browser). Source, tests and the AI-agent skill that installs it: https://github.com/wen-watt/wen-watt.github.io

This is example code, not audited. You are responsible for your shop, refunds and taxes in your country.

== Installation ==

1. Upload the `wen-counter-pay` folder to `/wp-content/plugins/` (or upload the zip in Plugins → Add New → Upload).
2. Activate the plugin. WooCommerce must be active.
3. WooCommerce → Settings → Payments → Wen Counter (Solana Pay).
4. Paste your receiving address (your wallet: Receive → Solana). Keep the network on Devnet.
5. Place a test order and pay it from a devnet wallet. The order turns to Processing when the chain confirms it.
6. Only then switch to Mainnet and tick the confirmation.

== Frequently Asked Questions ==

= Does the plugin hold or move my money? =
No. Payments go straight from the buyer's wallet to your address. The plugin only reads the chain.

= What happens if the buyer closes the page? =
A background check runs every 5 minutes for unpaid orders of the last 24 hours.

= How do refunds work? =
A refund is a new payment from your wallet to the buyer, made in your wallet app. Put `refund:` and the original transaction ID in the memo.

= Is a receipt from this plugin a fiscal receipt? =
No. Follow the receipt and tax rules of your country.

== Changelog ==

= 0.1.0 =
* First public version: gateway, block checkout, status endpoint, background check, 54 checks.
