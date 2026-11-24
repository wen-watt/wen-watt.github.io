---
name: wen-counter-shop
description: Audit an online shop and add a free, receive-only Solana Pay checkout built on the open Wen Counter Protocol (WCP-1). Use when someone asks to accept Solana, USDC or crypto payments in WooCommerce, Shopify, Wix, Squarespace, Tilda or a plain website, or to add "Wen Counter" or "Solana Pay" to a store. No keys, no fee, devnet first.
license: Apache-2.0
---

# Wen Counter for shops

A free, receive-only Solana Pay checkout for any shop, from the Wen Open Lab. Free forever: no fee, no subscription, no middleman. The shop's wallet is only a public address; nothing in this skill can sign or move funds.

Source of truth: https://github.com/wen-watt/wen-watt.github.io (folders `lab/counter/`, `integrations/woocommerce/wen-counter-pay/`, `skills/wen-counter-shop/`). Human pages: https://wen-watt.github.io/lab/shop-integration.html and https://wen-watt.github.io/lab/counter.html.

## Rules that never change

1. **Never ask for, accept, store or type a seed phrase or private key.** Only the public receiving address. If the user pastes words or a long secret, stop and tell them to keep it private.
2. **Receive-only.** Do not add wallet connection, signing or sending to anything you build from this skill. A build that can send funds is a different product and must not be called Wen Counter.
3. **Read-only chain access:** `getSignaturesForAddress`, `getTransaction`, `getAccountInfo`. Nothing else.
4. **Devnet first.** Switch to mainnet only after a paid test order on devnet and the user's explicit yes.
5. **Five-point check before "paid":** reference, recipient, token, amount (at least), success. One transaction pays one order.
6. **Keep attribution:** copies keep `NOTICE` (Apache-2.0, section 4(d)): "Built on Wen Counter (WCP-1), Wen Open Lab · wen-watt.github.io".
7. No prices, forecasts or trading advice. No promises about taxes: the shop owner checks the rules with their accountant.

## Steps

1. **Audit the shop** with `references/audit-checklist.md`: platform, currency, HTTPS, checkout type, who controls the wallet, who handles refunds. Report findings before changing anything.
2. **Choose the path:**
   - WooCommerce → install the plugin: `references/woocommerce.md`.
   - Shopify, Wix, Squarespace, Tilda, static sites → payment link, button or hosted counter: `references/other-platforms.md`.
   - In-person sales (shop counter, market stall, events) → the browser counter at `/lab/counter/` or the kit `lab/counter/wen-counter-kit.zip`.
3. **Configure:** paste only the public receiving address; network Devnet; token USDC (stable) unless the owner chooses another; rate = tokens per one unit of shop currency (USD + USDC → 1).
4. **Test on devnet:** place an order, pay from a devnet wallet with devnet USDC or SOL, confirm the order becomes paid and the transaction opens in Solana Explorer with `?cluster=devnet`.
5. **Verify the build** with `references/verify.md`: run the checks, compare fingerprints.
6. **Security review** with `references/security.md`. Fix anything red before going live.
7. **Go live:** switch to mainnet only with the owner's yes; tell the owner that refunds are new payments from their wallet and that the receipt is not fiscal.
8. **Report back:** what you changed, where, the test transaction link, and what the owner must do themselves (wallet backup, accountant, refund policy).

## Where the ideas come from

Every claim here has a source page; see `references/sources.md` for the full chain (Wen Counter protocol, safety page with 57 checks, Lab models, verification log, trust chain, translations).
