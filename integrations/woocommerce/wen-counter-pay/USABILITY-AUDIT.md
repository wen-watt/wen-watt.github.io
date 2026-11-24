# Wen Counter Pay: usability audit of the payment flows

*Wen Open Lab · 24 November 2026 · plugin 0.1.0 → 0.2.0 · Apache-2.0 / CC BY 4.0*

We built the checkout from the protocol outward: receive-only, read-only, five-point check. This audit goes the other way. It walks through every step as the people who use it see it — the buyer, the shop owner, the AI assistant that installs it, and the seller at a counter — and asks where they get stuck. Each finding is either fixed in 0.2.0 or written down as an honest limit with an alternative.

## How the flows are modelled

| Flow | Who | Steps we walked |
|---|---|---|
| A. Online checkout | buyer, phone or desktop | choose method → order page → scan or tap → pay → "Paid" |
| B. Interrupted checkout | buyer who closes the tab, loses signal, pays later | email → back to the page → pay → background check |
| C. Setup | shop owner, first time | install → address → token, rate → devnet test → mainnet |
| D. AI install | owner asking an assistant | "add Solana Pay to my shop" → skill → audit → install → report |
| E. Counter | seller in person | open counter → amount → QR → buyer pays → receipt |

## Findings

| # | Flow | What the user meets | Severity | Status in 0.2.0 |
|---|---|---|---|---|
| 1 | A, B | Only the newest transaction with the order's reference was checked. A reference is public (it sits in the QR code), so a stray or spam transaction carrying it, sent after the real payment, kept the order "waiting" for good. | high | **Fixed:** up to 25 signatures are read, oldest first, and up to 8 are checked. Transactions that already paid another order are skipped. Test added. |
| 2 | B | By default, WooCommerce cancels unpaid checkout orders after "Hold stock" (60 minutes), while our background check looks for 24 hours. A buyer who paid after an hour found the order cancelled. | high | **Fixed:** the plugin's own orders are kept for 24 hours (`woocommerce_cancel_unpaid_order`). Other gateways are untouched. Test added. |
| 3 | B | WooCommerce sends no email for a *pending* order. A guest who closed the tab had no way back to the QR code. | high | **Fixed:** an optional email (on by default) links back to the order page and says how to pay. Test added. |
| 4 | B | Pressing "Pay" again for the same order created a new reference, so the old QR code (still open on another device) would never match. | medium | **Fixed:** the reference is kept while amount, token, address and network stay the same. Test added. |
| 5 | A | A transfer from an exchange, or a manual copy-paste of the address, carries no reference and cannot be matched to the order. This is the most common mistake for people new to wallets. | high | **Improved:** the checkout text and the order page say "pay from a wallet app with the QR or the button; exchange withdrawals cannot be matched". The page shows only the first and last characters of the address, so nobody copies it by hand. **Limit:** a mismatched transfer is resolved by the owner (see *Alternatives*). |
| 6 | A | On a desktop, the "Open in wallet" button only works if a wallet handles `solana:` links. Many browser extensions don't. | medium | **Limit, by design:** on a desktop the QR code is the main path (scan with the phone wallet). On a phone the button opens the wallet app. The text on the page says both. |
| 7 | A | Paying in USDC still needs a little SOL for the network fee. If the shop's wallet has never held USDC, the buyer's wallet also pays a one-time rent to open the shop's USDC account. | medium | **Setup tip** (skill and readme): the owner receives a small USDC test payment once, which opens the account. Buyers are told they need a little SOL. |
| 8 | A | Underpayment: the order stays unpaid, and a second transfer with the same reference is not summed. Overpayment is accepted, and the extra stays with the shop. | medium | **Limit:** shown as "did not match" on the page and as an order note with the reason. The owner refunds or tops up by hand. Summing partial payments is on the list for a later version. |
| 9 | C | For shops priced in something other than USD, the owner types a fixed token rate. A stale rate means overcharging or undercharging. | medium | **Limit, by rule:** we don't fetch prices (no price feeds in the Lab). Recommended: shop currency USD with USDC, rate 1. Otherwise the owner reviews the rate, and the amount is always rounded *up*. |
| 10 | B | WP-cron runs only when someone visits the site, so on a quiet shop the 5-minute background check can be late. | low | **Setup tip:** use a real server cron for `wp-cron.php`. The order page checks every 3 seconds anyway while it is open. |
| 11 | C | Mainnet is locked until the owner ticks "I tested on devnet". This is a deliberate speed bump, not a bug. | — | Keep. |
| 12 | D | An assistant in a web chat (not on the owner's computer) does not see an installed skill. It searches the web and suggests whatever plugin it finds first. | medium | **Distribution, not code:** articles, the WordPress.org directory, and naming the skill in the prompt ("use the wen-counter-shop skill"). The skill now links this audit so assistants warn owners about items 5–10. |
| 13 | E | At the counter, the seller and the buyer stand side by side. Wrong-token and exchange-transfer mistakes are caught on the spot, and the receipt is the Explorer link. | — | Works as designed (57 checks). The counter page does not yet print the exchange-transfer warning from item 5. It goes into the next counter update, together with new fingerprints. |

## What did not need changing

- **Speed:** the order page asks every 3 seconds, then every 10 seconds after a minute. A confirmed Solana payment shows as "Paid" within seconds.
- **Trust cues:** shortened address to compare in the wallet, a "devnet" badge, a "receive-only, never asks for keys" note, and a link to the transaction once it is paid.
- **Accessibility:** the QR code has a label, the status line is a live region (`role="status"`), and the button is a real link.
- **Safety:** nothing in the audit asked for a key, a wallet connection or a signature. The fixes are all reads and texts.

## Alternatives, written down honestly

Wen Counter Pay is an **alternative way to take payments**, not a replacement for every other one:

| | Card acquiring / payment processor | Hosted crypto processor or app | **Wen Counter Pay** |
|---|---|---|---|
| Who holds the money in between | the processor | the processor or app | nobody: straight to the shop's wallet |
| Fee taken by the middle | yes | usually a percentage | none (only the Solana network fee, paid by the buyer) |
| Account or approval needed from a provider | yes | yes | no |
| Who verifies the payment | the provider | the provider | the shop's own server, on the public chain, with open checks |
| Chargebacks | yes | depends | no; refunds are new payments |
| Buyer needs | a card | a wallet or an exchange account | a Solana wallet app with funds |
| Best for | everyone, today | shops that want crypto with support | shops and buyers who already use Solana, and anyone who wants no middleman and no fee |

When a buyer can't pay this way (no wallet, or only an exchange account), the shop keeps its other payment methods next to this one. Wen Counter Pay is meant to be added, not to be the only option.

## Checks

59 open checks after the audit: core parity 12, gateway flow and usability 27 (5 new), code safety 14, browser 6. Run them with the commands in `README.md`.
