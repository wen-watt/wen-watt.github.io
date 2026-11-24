# Shopify, Wix, Squarespace, Tilda and plain websites

There is no Wen Counter app in those app stores yet. Three honest options, all receive-only:

## A. Payment link or button (any page)
Build a Solana Pay link per order or per product and show it as a button or QR:

`solana:<RECEIVING_ADDRESS>?amount=<AMOUNT>&spl-token=<MINT>&reference=<NEW_REFERENCE>&label=<SHOP>&message=<ORDER>&memo=order%3A<NUMBER>`

- Generate a new reference (32 random bytes, base58) for every order; never reuse it.
- USDC mint on mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; on devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`. Omit `spl-token` for SOL.
- Use `buildPayURL` from `lab/counter/counter-core.js` (browser or Node) so the link matches the spec and the tests.
- Confirming the payment: open the counter's ledger, or check the reference in Solana Explorer. Orders are not marked paid automatically on these platforms; tell the owner.

## B. Hosted counter for staff
The owner opens https://wen-watt.github.io/lab/counter/ (or a copy on their own domain from the kit) on a phone or tablet, sets the receiving address in Setup (locked by a PIN), and takes payments by QR. Good for pop-ups, events, phone orders. Translated copies: `/it-wen/lab/counter/`, `/cn-wen/lab/counter/`, `/ko-wen/lab/counter/`.

## C. Self-hosted kit
`lab/counter/wen-counter-kit.zip` (20 files): put it on any static https host, change `theme.css` and icons, keep `NOTICE`. Set the language with `lang` in `counter-deploy.js` (en, it, zh, ko).

## Platform notes
- **Shopify:** add the link or QR to the order status page with a custom liquid block or a page; do not mark orders paid by hand until the reference is confirmed on-chain.
- **Wix / Squarespace / Tilda:** add an HTML embed with the button or a link to the hosted counter.
- **Static sites and landing pages:** one HTML button per product with a fixed amount, plus a new reference per order if you track orders.
