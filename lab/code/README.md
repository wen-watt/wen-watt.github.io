# Wen Open Lab — example code

Open, free examples built on public Solana tools: SPL Token-2022, the token layout used by
the Wen New Standard (WNS), and Solana Pay. License: Apache-2.0.

**Not audited. Not financial or legal advice. Always verify your own model: run the tests,
use devnet first, read the official docs, and get an audit before mainnet.**

| File | Model |
|---|---|
| `src/01-receipt-nft.ts` | Digital receipt and warranty card as a Token-2022 NFT |
| `src/02-royalty-transfer.ts` | Read the royalty hook of an NFT and transfer it with the hook |
| `src/03-b2b-invoice.ts` | B2B settlement token: fee, approved counterparties, invoice memo |
| `src/04-solana-pay-bridge.ts` | E-commerce payment link + payment watcher + webhook |
| `src/05-verify-receipt.ts` | Verify a receipt card like a machine: issuer, one-of-one, soulbound, holder, order hash, warranty date |
| `src/06-inspect-mint.ts` | Read any mint like an auditor: program, authorities, extensions, plain-language notes for holders |
| `test/run-litesvm.ts` | Runs Models 1–6 inside LiteSVM (local Solana VM, no network) |
| `test/results.txt` | Output of the last run |

```bash
npm install
npm run typecheck
npm test            # local VM, no network, no real funds
```

Security note: do not install the npm package `@wen-community/wen-new-standard` — npm removed it
as malicious (security holding package). These examples do not need it.

The $WEN token mint: `WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk` (verify on Solana Explorer / CoinMarketCap).

## Changelog

### 2026-11-09 — reader fixes (Model 3), 41 checks
Two readers reviewed Model 3 and found two gaps. Thank you.

1. **Fee rounding (bug, fixed).** Token-2022 rounds the transfer fee **up** (ceiling division);
   `expectedFee` used integer division and rounded **down**. Example: 401 base units at 25 bps
   = 1.0025, Token-2022 expects a fee of 2, we passed 1, and `TransferCheckedWithFee` rejected the
   payment ("Calculated fee does not match expected fee"). `expectedFee` now uses the same formula.
   New tests: a 401-base-unit payment goes through, and `expectedFee` equals the Token-2022 fee
   formula (`calculateFee` from `@solana/spl-token`) on ten edge amounts, including the cap boundary.
2. **Memo content (known Token-2022 behaviour, now documented and tested).** The Required Memo
   extension checks that a memo **exists** before the transfer, not what it says. A payment with
   a wrong invoice number still passes on-chain. New: `memosFromLogs` and `matchInvoicePayment`
   (off-chain reconciliation accepts a payment only if it carries exactly one invoice memo and it
   is the expected one) and two tests: the wrong-number payment passes on-chain, reconciliation
   rejects it.

Earlier walkthroughs, articles and videos mention 37 checks; that was the count before this fix.
