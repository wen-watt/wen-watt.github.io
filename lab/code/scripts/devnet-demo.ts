// Wen Open Lab: run Models 1 and 3 on PUBLIC DEVNET and print explorer links anyone can open.
// Devnet only. Use a NEW, EMPTY wallet created just for this. No real funds are ever needed.
// License: Apache-2.0. Example code, not audited.
//
//   solana-keygen new -o devnet-wallet.json          # new throwaway wallet
//   solana airdrop 2 $(solana-keygen pubkey devnet-wallet.json) --url devnet
//   KEYPAIR=./devnet-wallet.json npx tsx scripts/devnet-demo.ts
import { Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction, type TransactionInstruction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, createMintToInstruction } from '@solana/spl-token';
import { getConnection, loadKeypair } from '../src/common.js';
import { buildReceiptInstructions, receiptLayout, type Order } from '../src/01-receipt-nft.js';
import {
  buildApproveCounterparty, buildInvoiceAccount, buildPayInvoice, buildSettlementMint,
  invoiceAccountSpace, settlementMintSpace, DECIMALS,
} from '../src/03-b2b-invoice.js';

const connection = getConnection();
const wallet = loadKeypair();
const link = (kind: 'tx' | 'address', id: string) => `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

async function send(label: string, ixs: TransactionInstruction[], signers: Keypair[]) {
  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), signers);
  console.log(`  ${label}\n    ${link('tx', sig)}`);
  return sig;
}

async function main() {
  const endpoint = (connection as unknown as { rpcEndpoint: string }).rpcEndpoint;
  if (!/devnet/.test(endpoint)) throw new Error(`Refusing to run outside devnet: ${endpoint}`);
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet ${wallet.publicKey.toBase58()} has ${balance / LAMPORTS_PER_SOL} devnet SOL`);
  if (balance < 0.2 * LAMPORTS_PER_SOL) throw new Error('Need at least 0.2 devnet SOL: run `solana airdrop 2 <address> --url devnet`');

  // ---- Model 1: receipt NFT (soulbound) to a fresh "buyer" address ----
  console.log('\nModel 1 — receipt and warranty NFT');
  const buyer = Keypair.generate();
  const mint = Keypair.generate();
  const order: Order = { orderId: `DEVNET-${Date.now()}`, sku: 'WEN-PLUSH-01', priceMinorUnits: 2500, currency: 'USD', purchasedAt: new Date().toISOString(), warrantyMonths: 12 };
  const opts = { soulbound: true, uri: 'https://wen-watt.github.io/lab/receipt-warranty-wns.html' };
  const { rentSpace } = receiptLayout(order, mint.publicKey, wallet.publicKey, opts);
  const rent = await connection.getMinimumBalanceForRentExemption(rentSpace);
  const { instructions, buyerAta } = buildReceiptInstructions({ order, mint: mint.publicKey, merchant: wallet.publicKey, buyer: buyer.publicKey, opts, rentLamports: rent });
  await send('receipt minted, supply locked at 1', instructions, [wallet, mint]);
  console.log(`    receipt mint: ${link('address', mint.publicKey.toBase58())}`);
  console.log(`    buyer holds it in: ${link('address', buyerAta.toBase58())}`);

  // ---- Model 3: B2B settlement token with fee, allowlist and invoice memo ----
  console.log('\nModel 3 — B2B invoice settlement');
  const settle = Keypair.generate();
  await send('settlement mint created (fee 0.25% cap 50, frozen by default)',
    buildSettlementMint(wallet.publicKey, settle.publicKey, await connection.getMinimumBalanceForRentExemption(settlementMintSpace())), [wallet, settle]);
  const accRent = await connection.getMinimumBalanceForRentExemption(invoiceAccountSpace());
  const payerAcc = Keypair.generate(), sellerAcc = Keypair.generate();
  // In this demo one wallet plays both companies; in real life they are different owners.
  await send('buyer account opened', buildInvoiceAccount(wallet.publicKey, payerAcc.publicKey, settle.publicKey, accRent, false), [wallet, payerAcc]);
  await send('seller account opened (invoice memo required)', buildInvoiceAccount(wallet.publicKey, sellerAcc.publicKey, settle.publicKey, accRent, true), [wallet, sellerAcc]);
  await send('both companies approved by the issuer', [
    ...buildApproveCounterparty(wallet.publicKey, settle.publicKey, payerAcc.publicKey),
    ...buildApproveCounterparty(wallet.publicKey, settle.publicKey, sellerAcc.publicKey),
  ], [wallet]);
  const unit = 10n ** BigInt(DECIMALS);
  await send('buyer funded with 10,000 test units', [createMintToInstruction(settle.publicKey, payerAcc.publicKey, wallet.publicKey, 10_000n * unit, [], TOKEN_2022_PROGRAM_ID)], [wallet]);
  await send('invoice INV-DEVNET-0001 paid: 1,000 units, memo on-chain',
    buildPayInvoice({ mint: settle.publicKey, from: payerAcc.publicKey, to: sellerAcc.publicKey, payer: wallet.publicKey, invoiceId: 'INV-DEVNET-0001', amount: 1_000n * unit }), [wallet]);

  try {
    await send('payment WITHOUT invoice number (must fail)',
      buildPayInvoice({ mint: settle.publicKey, from: payerAcc.publicKey, to: sellerAcc.publicKey, payer: wallet.publicKey, invoiceId: null, amount: 1n * unit }), [wallet]);
    console.log('  !! unexpected: payment without memo succeeded');
  } catch {
    console.log('  payment WITHOUT invoice number was rejected, as designed');
  }
  console.log(`    settlement mint: ${link('address', settle.publicKey.toBase58())}`);
  console.log('\nDone. Paste these links into the Lab devnet page so anyone can inspect them.');
}

main().catch(e => { console.error(e); process.exit(1); });
