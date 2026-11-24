# Usability: what buyers and owners meet

Full audit with all 13 findings: `../../../integrations/woocommerce/wen-counter-pay/USABILITY-AUDIT.md` (online: https://github.com/wen-watt/wen-watt.github.io/blob/main/integrations/woocommerce/wen-counter-pay/USABILITY-AUDIT.md).

Tell the owner these before going live:

1. **Wallet app, not exchange.** Buyers pay with the QR code or the "Open in wallet" button from a Solana wallet app. A withdrawal from an exchange or a manual copy-paste of the address carries no order reference and cannot be matched; the owner then resolves it by hand.
2. **A little SOL for the fee.** Even when paying in USDC, the buyer needs a small amount of SOL for the network fee.
3. **Open the shop's USDC account once.** Receive one small USDC test payment to the shop address first, so buyers don't pay the one-time account rent.
4. **Desktop = QR, phone = button.** On a desktop the buyer scans the QR with a phone wallet; on a phone the button opens the wallet app.
5. **Late payers are covered.** Version 0.2.0 emails the buyer a link back to the payment page and keeps the order open for 24 hours (WooCommerce would otherwise cancel it after the "Hold stock" time).
6. **Underpayment and overpayment.** An underpaid order stays unpaid with a note; the owner refunds or asks for a new payment. Overpayment is accepted; the owner returns the extra if they wish.
7. **Shop currency.** Best: prices in USD and token USDC, rate 1. For other currencies the owner sets and reviews the rate; we never fetch prices.
8. **Quiet shops:** set a real server cron for `wp-cron.php` so the background check runs every 5 minutes.
9. **An alternative, not the only way.** Keep cards or other methods next to this one for buyers without a Solana wallet.
