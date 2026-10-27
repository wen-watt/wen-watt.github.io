// Runs Models 1-6 inside LiteSVM (a local Solana VM with the real SPL Token-2022 and Memo programs).
// No network needed. Each check prints PASS or FAIL.
import { LiteSVM, FailedTransactionMetadata } from 'litesvm';
import { parseURL } from '@solana/pay';
import { createPaymentRequest, ACCEPTED } from '../src/04-solana-pay-bridge.js';
import { WNS_ROYALTY_PROGRAM_ID } from '../src/common.js';
import { address, lamports, getTransactionDecoder } from '@solana/kit';
import { Keypair, PublicKey, SystemProgram, Transaction, type TransactionInstruction } from '@solana/web3.js';
import {
  ExtensionType, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction,
  createTransferCheckedInstruction, getAssociatedTokenAddressSync, getExtensionData, unpackAccount, unpackMint,
  getMintLen, createInitializeTransferHookInstruction, createInitializeMintInstruction, getTransferHook,
  MINT_SIZE, TOKEN_PROGRAM_ID, AuthorityType, createSetAuthorityInstruction, createInitializePermanentDelegateInstruction,
  createInitializeTransferFeeConfigInstruction,
} from '@solana/spl-token';
import { unpack as unpackMetadata } from '@solana/spl-token-metadata';
import { buildReceiptInstructions, receiptLayout, orderHash, type Order } from '../src/01-receipt-nft.js';
import { verifyReceipt } from '../src/05-verify-receipt.js';
import { inspectMint } from '../src/06-inspect-mint.js';
import {
  buildApproveCounterparty, buildInvoiceAccount, buildPayInvoice, buildSettlementMint, expectedFee,
  invoiceAccountSpace, settlementMintSpace, DECIMALS,
} from '../src/03-b2b-invoice.js';

const svm = new LiteSVM();
let failures = 0;
const check = (name: string, ok: boolean, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!ok) failures++; };

function send(ixs: TransactionInstruction[], signers: Keypair[]) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = signers[0].publicKey;
  tx.recentBlockhash = svm.latestBlockhash();
  tx.sign(...signers);
  const kitTx = getTransactionDecoder().decode(tx.serialize());
  const res = svm.sendTransaction(kitTx);
  svm.expireBlockhash();
  return res instanceof FailedTransactionMetadata ? { ok: false, err: res.toString(), logs: res.meta().logs() } : { ok: true, logs: res.logs() };
}
const fund = (k: Keypair) => svm.airdrop(address(k.publicKey.toBase58()), lamports(10_000_000_000n));
const rent = (space: number) => Number(svm.minimumBalanceForRentExemption(BigInt(space)));
function account(pk: PublicKey) {
  const a = svm.getAccount(address(pk.toBase58()));
  if (!a.exists) throw new Error('missing account ' + pk.toBase58());
  return { data: Buffer.from(a.data), owner: new PublicKey(a.programAddress), lamports: Number(a.lamports), executable: a.executable };
}

// ---------- Model 1: receipt NFT ----------
{
  const merchant = Keypair.generate(), buyer = Keypair.generate(), other = Keypair.generate();
  [merchant, buyer, other].forEach(fund);
  const order: Order = { orderId: 'A-1001', sku: 'WEN-PLUSH-01', priceMinorUnits: 2500, currency: 'USD', purchasedAt: '2026-10-10T00:00:00.000Z', warrantyMonths: 12 };

  for (const soulbound of [true, false]) {
    const mint = Keypair.generate();
    const opts = { soulbound, uri: 'https://example.com/receipts/A-1001.json' };
    const { rentSpace } = receiptLayout(order, mint.publicKey, merchant.publicKey, opts);
    const { instructions, buyerAta } = buildReceiptInstructions({ order, mint: mint.publicKey, merchant: merchant.publicKey, buyer: buyer.publicKey, opts, rentLamports: rent(rentSpace) });
    const r = send(instructions, [merchant, mint]);
    check(`M1 receipt minted (soulbound=${soulbound})`, r.ok, r.ok ? '' : r.err);
    if (!r.ok) { console.log(r.logs?.join('\n')); continue; }

    const m = unpackMint(mint.publicKey, account(mint.publicKey) as any, TOKEN_2022_PROGRAM_ID);
    check('M1 supply is exactly 1, decimals 0, mint authority removed', m.supply === 1n && m.decimals === 0 && m.mintAuthority === null);
    const md = unpackMetadata(getExtensionData(ExtensionType.TokenMetadata, m.tlvData)!);
    const fields = Object.fromEntries(md.additionalMetadata);
    check('M1 metadata inside the mint: name, order hash, warranty date', md.name === 'Receipt A-1001' && fields.order_hash === orderHash(order) && fields.warranty_until === '2027-10-10',
      `warranty_until=${fields.warranty_until}`);
    const acc = unpackAccount(buyerAta, account(buyerAta) as any, TOKEN_2022_PROGRAM_ID);
    check('M1 buyer holds the receipt', acc.amount === 1n && acc.owner.equals(buyer.publicKey));

    const otherAta = getAssociatedTokenAddressSync(mint.publicKey, other.publicKey, false, TOKEN_2022_PROGRAM_ID);
    const t = send([
      createAssociatedTokenAccountIdempotentInstruction(buyer.publicKey, otherAta, other.publicKey, mint.publicKey, TOKEN_2022_PROGRAM_ID),
      createTransferCheckedInstruction(buyerAta, mint.publicKey, otherAta, buyer.publicKey, 1n, 0, [], TOKEN_2022_PROGRAM_ID),
    ], [buyer]);
    if (soulbound) check('M1 soulbound receipt cannot be transferred', !t.ok, t.ok ? 'transfer unexpectedly succeeded' : 'rejected by Token-2022');
    else check('M1 transferable receipt can be resold or gifted', t.ok, t.ok ? '' : t.err);

    const again = send([createMintToInstruction(mint.publicKey, buyerAta, merchant.publicKey, 1, [], TOKEN_2022_PROGRAM_ID)], [merchant]);
    check('M1 nobody can mint a second copy', !again.ok);
  }
}

// ---------- Model 3: B2B settlement with fee, allowlist and invoice memo ----------
{
  const issuer = Keypair.generate(), buyerCo = Keypair.generate(), sellerCo = Keypair.generate(), stranger = Keypair.generate();
  [issuer, buyerCo, sellerCo, stranger].forEach(fund);
  const mint = Keypair.generate();
  let r = send(buildSettlementMint(issuer.publicKey, mint.publicKey, rent(settlementMintSpace())), [issuer, mint]);
  check('M3 settlement mint created (fee 0.25% cap 50, frozen by default)', r.ok, r.ok ? '' : r.err);

  const buyerAcc = Keypair.generate(), sellerAcc = Keypair.generate(), strangerAcc = Keypair.generate();
  send(buildInvoiceAccount(buyerCo.publicKey, buyerAcc.publicKey, mint.publicKey, rent(invoiceAccountSpace()), false), [buyerCo, buyerAcc]);
  r = send(buildInvoiceAccount(sellerCo.publicKey, sellerAcc.publicKey, mint.publicKey, rent(invoiceAccountSpace()), true), [sellerCo, sellerAcc]);
  check('M3 seller account requires an invoice memo', r.ok, r.ok ? '' : r.err);
  send(buildInvoiceAccount(stranger.publicKey, strangerAcc.publicKey, mint.publicKey, rent(invoiceAccountSpace()), true), [stranger, strangerAcc]);

  // Issuer approves buyer and seller only.
  send([...buildApproveCounterparty(issuer.publicKey, mint.publicKey, buyerAcc.publicKey), ...buildApproveCounterparty(issuer.publicKey, mint.publicKey, sellerAcc.publicKey)], [issuer]);
  const unit = 10n ** BigInt(DECIMALS);
  const mt = send([createMintToInstruction(mint.publicKey, buyerAcc.publicKey, issuer.publicKey, 100_000n * unit, [], TOKEN_2022_PROGRAM_ID)], [issuer]);
  check('M3 issuer funds the buyer account', mt.ok, mt.ok ? '' : mt.err);

  const noMemo = send(buildPayInvoice({ mint: mint.publicKey, from: buyerAcc.publicKey, to: sellerAcc.publicKey, payer: buyerCo.publicKey, invoiceId: null, amount: 1_000n * unit }), [buyerCo]);
  check('M3 payment WITHOUT invoice number is rejected', !noMemo.ok && (noMemo.logs ?? []).some(l => /memo/i.test(l)), (noMemo.logs ?? []).find(l => /memo/i.test(l)) ?? '');

  const toStranger = send(buildPayInvoice({ mint: mint.publicKey, from: buyerAcc.publicKey, to: strangerAcc.publicKey, payer: buyerCo.publicKey, invoiceId: 'INV-7', amount: 1_000n * unit }), [buyerCo]);
  check('M3 payment to a NOT approved company is rejected (account frozen)', !toStranger.ok && (toStranger.logs ?? []).some(l => /frozen/i.test(l)), (toStranger.logs ?? []).find(l => /frozen/i.test(l)) ?? '');

  const amount = 1_000n * unit;
  const ok = send(buildPayInvoice({ mint: mint.publicKey, from: buyerAcc.publicKey, to: sellerAcc.publicKey, payer: buyerCo.publicKey, invoiceId: 'INV-2026-0042', amount }), [buyerCo]);
  check('M3 invoice INV-2026-0042 paid with memo to approved company', ok.ok, ok.ok ? '' : ok.err);
  if (!ok.ok) console.log((ok.logs ?? []).join('\n'));
  const memoLogged = (ok.logs ?? []).some(l => l.includes('invoice:INV-2026-0042'));
  check('M3 invoice number is recorded on-chain (memo in logs)', memoLogged);
  const sellerState = unpackAccount(sellerAcc.publicKey, account(sellerAcc.publicKey) as any, TOKEN_2022_PROGRAM_ID);
  const fee = expectedFee(amount);
  check('M3 seller received amount minus fee; fee withheld for the platform', sellerState.amount === amount - fee,
    `received ${Number(sellerState.amount) / 1e6}, fee ${Number(fee) / 1e6}`);

  const big = 100_000n * unit; // fee cap check: 0.25% of 100k = 250 > cap 50
  check('M3 fee cap works (fee on 100,000 is 50, not 250)', expectedFee(big) === 50n * unit);
}

// ---------- Model 2: which program enforces royalties ----------
{
  const creator = Keypair.generate(); fund(creator);
  const mint = Keypair.generate();
  const space = getMintLen([ExtensionType.TransferHook]);
  const r = send([
    SystemProgram.createAccount({ fromPubkey: creator.publicKey, newAccountPubkey: mint.publicKey, space, lamports: rent(space), programId: TOKEN_2022_PROGRAM_ID }),
    createInitializeTransferHookInstruction(mint.publicKey, creator.publicKey, WNS_ROYALTY_PROGRAM_ID, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey, 0, creator.publicKey, null, TOKEN_2022_PROGRAM_ID),
  ], [creator, mint]);
  check('M2 NFT mint created with a transfer hook', r.ok, r.ok ? '' : r.err);
  const hook = getTransferHook(unpackMint(mint.publicKey, account(mint.publicKey) as any, TOKEN_2022_PROGRAM_ID));
  check('M2 hook program read from the mint = WNS royalty distribution', !!hook && hook.programId.equals(WNS_ROYALTY_PROGRAM_ID), hook?.programId.toBase58() ?? 'none');
}

// ---------- Model 4: Solana Pay payment link ----------
{
  const req = await createPaymentRequest('A-1001', ACCEPTED.WEN_MAINNET, 1000, ACCEPTED.WEN_MAINNET);
  const parsed = parseURL(req.url) as any;
  check('M4 payment link round-trips: recipient, amount, token, reference, memo',
    parsed.recipient === req.recipient && String(parsed.amount) === '1000' && parsed.splToken === ACCEPTED.WEN_MAINNET &&
    (parsed.reference?.[0] ?? parsed.reference) === req.reference && parsed.memo === 'order:A-1001', req.url.slice(0, 60) + '…');
  const req2 = await createPaymentRequest('A-1002', ACCEPTED.WEN_MAINNET, 5, ACCEPTED.USDC_MAINNET);
  check('M4 every order gets a unique reference', req2.reference !== req.reference);
}

// ---------- Model 5: verify a receipt like a machine ----------
{
  const merchant = Keypair.generate(), buyer = Keypair.generate(), stranger = Keypair.generate();
  [merchant, buyer].forEach(fund);
  const order: Order = { orderId: 'A-2001', sku: 'WEN-PLUSH-02', priceMinorUnits: 1900, currency: 'USD', purchasedAt: '2026-10-10T00:00:00.000Z', warrantyMonths: 12 };
  const issue = (soulbound: boolean) => {
    const mint = Keypair.generate();
    const opts = { soulbound, uri: 'https://example.com/receipts/A-2001.json' };
    const { rentSpace } = receiptLayout(order, mint.publicKey, merchant.publicKey, opts);
    const { instructions, buyerAta } = buildReceiptInstructions({ order, mint: mint.publicKey, merchant: merchant.publicKey, buyer: buyer.publicKey, opts, rentLamports: rent(rentSpace) });
    const r = send(instructions, [merchant, mint]);
    if (!r.ok) throw new Error(r.err);
    return { mint: mint.publicKey, ata: buyerAta };
  };
  const info = (pk: PublicKey) => { try { return account(pk) as any; } catch { return null; } };
  const run = (c: { mint: PublicKey; ata: PublicKey }, exp: any, ata = c.ata) => verifyReceipt(c.mint, info(c.mint), ata, info(ata), exp);
  const failed = (r: { checks: { name: string; ok: boolean }[] }) => r.checks.filter(x => !x.ok).map(x => x.name).join('; ');

  const card = issue(true);
  const good = run(card, { merchant: merchant.publicKey, holder: buyer.publicKey, order, today: '2026-11-01' });
  check('M5 genuine soulbound card passes every check', good.valid, `${good.checks.length} checks`);
  const r1 = run(card, { merchant: merchant.publicKey, holder: buyer.publicKey, order: { ...order, priceMinorUnits: 1 }, today: '2026-11-01' });
  check('M5 a different order is rejected (hash mismatch)', !r1.valid, failed(r1));
  const r2 = run(card, { merchant: stranger.publicKey, holder: buyer.publicKey, today: '2026-11-01' });
  check('M5 a card from another issuer is rejected', !r2.valid, failed(r2));
  const r3 = run(card, { merchant: merchant.publicKey, holder: buyer.publicKey, today: '2027-12-01' });
  check('M5 an expired warranty is rejected', !r3.valid, failed(r3));
  const strangerAta = getAssociatedTokenAddressSync(card.mint, stranger.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const r4 = run(card, { merchant: merchant.publicKey, holder: stranger.publicKey, today: '2026-11-01' }, strangerAta);
  check('M5 a wallet that does not hold the card is rejected', !r4.valid, failed(r4));
  const loose = issue(false);
  const r5 = run(loose, { merchant: merchant.publicKey, holder: buyer.publicKey, today: '2026-11-01' });
  check('M5 a transferable (not soulbound) card is flagged', !r5.valid, failed(r5));
}

// ---------- Model 6: inspect any mint like an auditor ----------
{
  const issuer = Keypair.generate(), delegate = Keypair.generate(); fund(issuer);
  const info = (pk: PublicKey) => account(pk) as any;
  // a) classic SPL token, mint and freeze authority kept
  const classic = Keypair.generate();
  let r = send([
    SystemProgram.createAccount({ fromPubkey: issuer.publicKey, newAccountPubkey: classic.publicKey, space: MINT_SIZE, lamports: rent(MINT_SIZE), programId: TOKEN_PROGRAM_ID }),
    createInitializeMintInstruction(classic.publicKey, 6, issuer.publicKey, issuer.publicKey, TOKEN_PROGRAM_ID),
  ], [issuer, classic]);
  const a = inspectMint(classic.publicKey, info(classic.publicKey));
  check('M6 classic SPL mint: no extensions, both authorities reported', r.ok && a.program === 'classic-spl' && a.extensions.length === 0 && a.notes.length === 2,
    a.notes.map(n => n.split(':')[0]).join(' / '));
  // b) Token-2022 mint with a permanent delegate and a transfer fee, authorities removed
  const risky = Keypair.generate();
  const space = getMintLen([ExtensionType.PermanentDelegate, ExtensionType.TransferFeeConfig]);
  r = send([
    SystemProgram.createAccount({ fromPubkey: issuer.publicKey, newAccountPubkey: risky.publicKey, space, lamports: rent(space), programId: TOKEN_2022_PROGRAM_ID }),
    createInitializePermanentDelegateInstruction(risky.publicKey, delegate.publicKey, TOKEN_2022_PROGRAM_ID),
    createInitializeTransferFeeConfigInstruction(risky.publicKey, issuer.publicKey, issuer.publicKey, 100, 1_000_000n, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(risky.publicKey, 6, issuer.publicKey, null, TOKEN_2022_PROGRAM_ID),
    createSetAuthorityInstruction(risky.publicKey, issuer.publicKey, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID),
  ], [issuer, risky]);
  const b = inspectMint(risky.publicKey, info(risky.publicKey));
  check('M6 Token-2022 mint created with permanent delegate and transfer fee', r.ok, r.ok ? '' : r.err);
  check('M6 permanent delegate is flagged for holders', b.notes.some(n => n.includes('ANY holder') && n.includes(delegate.publicKey.toBase58())));
  check('M6 transfer fee is read from the mint (1% capped)', b.notes.some(n => n.startsWith('Transfer fee: 1%')), b.extensions.join(', '));
  check('M6 removed authorities are reported as none', b.mintAuthority === null && b.freezeAuthority === null);
  // c) a non-mint account is refused
  let refused = false; try { inspectMint(issuer.publicKey, info(issuer.publicKey)); } catch { refused = true; }
  check('M6 a wallet address is refused, not parsed as a mint', refused);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures ? 1 : 0);
