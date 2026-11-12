# Wen Counter · an open point of sale in your browser

Show a Solana Pay QR, let the buyer pay from their own wallet, see "✓ Paid" when the chain confirms it.
No server, no app store, no card data, no fixed fee per sale. Part of the [Wen Open Lab](https://wen-watt.github.io/lab/counter.html).

## Run it in two minutes
1. Put this folder on any static host: GitHub Pages, Netlify, Cloudflare Pages or your own web server. It must be served over **https** (needed for installing to the home screen).
   To try it on a computer: `python3 -m http.server 8080` in this folder, then open http://localhost:8080.
2. Open it on the phone or tablet at your till and choose **Add to Home Screen**.
3. **Setup** (locked by the setup PIN: first `1111` from `counter-deploy.js`, then set your own): shop name, your receiving wallet (Jupiter, Phantom, Solflare, Backpack, Squads or any Solana wallet), its **public** receiving address (press *Check this address on-chain*), network (start on **devnet**), what you accept (USDC, SOL, WEN, JUP; USDT optional; mainnet-only tokens are greyed out on devnet), your card terms for comparison. Optional: **more receiving wallets**, each with a number, a type and a name: `#2 · Department · Furniture`, `#3 · Branch · Downtown`, `#4 · Tips · Bar tips`, `#5 · Online · Web orders`.
4. **Sell**: choose the department or branch (if you added more wallets), type the amount and, if you like, a comment (what for, product code or name; it goes to the CSV and travels as a memo where the buyer's wallet supports it), show the QR, wait for "✓ Paid". Then give the buyer a receipt: a receipt QR (link to the transaction), the copied text, or a receipt NFT from Model 1. Not a fiscal receipt.
5. **Ledger**: *Today you kept …* at the top, then confirmed sales, card fees avoided, the effective card rate of your ticket mix. Filter by wallet; *By wallet · head office view* adds up sales per wallet and token. The ↩ button copies a refund note (`refund:` + transaction ID) for the memo of the refund you make in your wallet. Export CSV for today, this week, month, year, last year, a quarter or any period.

## Setup PIN (set it before the counter goes to the till)
- Wallets and settings open only with the PIN. Set the first PIN in `counter-deploy.js` when you deploy (`setupPin: '1111'` by default), then change it in Setup → *Setup PIN and device*.
- Leaving Setup locks it; five wrong tries pause it for 30 seconds; clearing the ledger needs the PIN. Stored only as a salted SHA-256.
- Forgot it: reinstall the app on the device, enter the receiving wallets again, set a new PIN. An employee cannot quietly swap the wallet: a reinstall leaves no wallet, the address is on every QR, and takings stop arriving in the company wallet.

## Your own till, in five steps
1. Take this tool. 2. Create a wallet. 3. Register it in Setup. 4. Paste the receiving address: that is your open, free till. 5. Manage money in your own wallet: refunds, purchases, tax records.

**Chains and larger companies**: a till wallet per branch or department plus one central company wallet (for example a Squads multisig). A responsible manager runs the day's takings; in the evening the day's takings go to the central wallet. The counter stays receive-only everywhere.

Voilà: your ready acquiring mechanism. Your own Wen Counter.

## Make it yours (style replacement)
- **Colors, font, corner radius**: edit `theme.css` only. Keep the variable names. A florist example is inside.
- **Logo**: replace `icons/icon-192.png` and `icons/icon-512.png` (same names and sizes).
- **App name** on the home screen: `name` and `short_name` in `manifest.webmanifest`, and `<title>` in `index.html`.
- **Shop name in the buyer's wallet**: set in Setup, no code change needed.
- After changing files, bump `CACHE` in `sw.js` (for example `wen-counter-v4`) so phones load the new version.

## Extend it
- Pizzeria: put the order number in the note; a kitchen screen can watch the same reference.
- Florist: print one QR per bouquet tag (Copy pay link → any QR printer).
- Online shop: use the pay link in checkout; for a server webhook see Model 4 of the Wen Open Lab.

## Check it (57 open checks)
- `node counter-core.test.js` · 25 checks: base58, reference keys, amounts, the pay URL, payment verification for SOL and SPL tokens, failures, the savings model, the address check, the turnover estimate, export periods, refund notes, the receipt text, wallet tags, the head office view, the sale memo and the PIN format.
- `node counter-safety.test.js` · 13 checks that prove, by reading the code, that the counter cannot sign, send or reach a wallet: no wallet providers, no connect or sign calls, no keys, only three allow-listed read requests, no inbound API, strict CSP, no network data as HTML, interface words bound to the core fingerprint and written as text only, Setup behind the PIN, the deployment file holding parameters only. It also prints the identity line and the WCP-1 block fingerprint.
- `node browser-safety.e2e.js http://localhost:8080/` · 19 checks in a real browser (needs Playwright): fake wallets that record any touch, hostile text, hostile network answers, a payment to another address, the buyer receipt, the refund note, period export a sale into a department wallet, the wallet tag on the payment screen, the head office view, the setup PIN (locked, wrong PIN, 1111, relock) and the sale comment in the pay request and the CSV.

## Safety
- **Receive-only by design**: the counter never connects to a wallet, never asks it to sign and holds no key. Refunds and transfers are made inside the wallet app. Keep it that way if you extend it.
- Only the **public** receiving address is ever entered. The page never asks for a seed phrase or private key and cannot move funds.
- Every payment is verified on-chain: reference, recipient, token, amount and success.
- Strict Content Security Policy: only this folder's own scripts run; no trackers, no third-party scripts.
- The ledger stays on the device (browser storage). Export it regularly.
- Devnet first, with a new empty wallet. Mainnet only after a full devnet run.

## Before you scale (seven answers)
1. **Who it is for**: crypto communities, events, online shops for their own audience. Not mass adoption; open to everyone who finds it useful.
2. **Several departments**: wallets by number, type and name; the ledger adds them up per wallet.
3. **A real company**: use your own RPC endpoint (public ones have rate limits); prepare the wallet side (who holds which wallet, who approves transfers); build the wallets into your accounting and check with your accountant that you may use a wallet and how to declare. A useful tip, not advice.
4. **Fiscal rules**: the counter declares nothing and is not a fiscal device. If your rules allow it, keep the wallet statements per period, declare the income, show receipts and refunds. If your accountant says yes, scale it.
5. **Responsibility and open audit**: you use it on your own responsibility; we do not know what you change. The mechanism takes nothing, holds nothing and charges nothing, and follows the Solana network's rules. Read the code, rerun the checks, open an issue with what you find.
6. **Languages**: all interface words are in `counter-i18n.js`, bound to the core fingerprint (`FOR_CORE`). Translations go there only; the safety test fails if the core changed without a fresh look.
7. **USDT** stays optional.

## The open story
Wen is not just a cat drifting through space. Wen is a gathering of useful things: an idea and the strongest free pool and mechanism for real life, fewer intermediaries, costs cancelled where they were always unnecessary. Take everything open: Solana, SPL Token, WEN, Token-2022, these test builds, the instructions and notes of the Wen Open Lab, and build your own solutions.
> *I'm a cat. I only showed you that you can do more than lie on the windowsill licking your paws: you can make something useful. For you, friends.*

## Naming
We require nothing. Post on X or on your site that you use the WEN solution, with our name. It is nice for us and it settles usage and rights. Nobody will ever ask how many copies or shops you run: no money, no intermediary fees. And don't forget to pet the scratchy one.

## Translate it
Add a dictionary next to `en` in `counter-i18n.js` (same keys), keep `FOR_CORE` equal to the SHA-256 of `counter-core.js`, run `node counter-safety.test.js`. Words are text, never HTML.

## License and attribution
Apache License 2.0 (`LICENSE`). Copies and derivative works must keep `NOTICE` and credit **Wen Open Lab · wen-watt.github.io**.
The QR generator is MIT (header of `qrcode.js`).
Example code, not audited. Not financial, tax or legal advice.
