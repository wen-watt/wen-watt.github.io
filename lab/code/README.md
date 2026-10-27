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
