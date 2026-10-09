// Model 1: digital receipt and warranty card as a Token-2022 NFT (the same on-chain layout WNS uses:
// zero decimals, supply locked at 1, metadata stored inside the mint).
// License: Apache-2.0. Example code, not audited. Devnet first.
import {
  Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, type TransactionInstruction,
} from '@solana/web3.js';
import {
  AuthorityType, ExtensionType, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, TYPE_SIZE,
  createAssociatedTokenAccountIdempotentInstruction, createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction, createInitializeNonTransferableMintInstruction,
  createMintToInstruction, createSetAuthorityInstruction, getAssociatedTokenAddressSync, getMintLen,
} from '@solana/spl-token';
import { createInitializeInstruction, createUpdateFieldInstruction, pack, type TokenMetadata } from '@solana/spl-token-metadata';
import { createHash } from 'node:crypto';
import { getConnection, loadKeypair } from './common.js';

export interface Order {
  orderId: string;
  sku: string;
  priceMinorUnits: number;      // e.g. cents
  currency: string;             // e.g. "USD"
  purchasedAt: string;          // ISO date
  warrantyMonths: number;
}

/** Hash the order so the chain stores proof of purchase, not the customer's personal data. */
export function orderHash(order: Order): string {
  return createHash('sha256').update(JSON.stringify(order)).digest('hex');
}

export interface ReceiptOptions { soulbound: boolean; uri: string }

/** Everything needed to size and build the receipt mint. */
export function receiptLayout(order: Order, mint: PublicKey, merchant: PublicKey, opts: ReceiptOptions) {
  const warrantyUntil = new Date(order.purchasedAt);
  warrantyUntil.setMonth(warrantyUntil.getMonth() + order.warrantyMonths);
  const metadata: TokenMetadata = {
    mint, updateAuthority: merchant,
    name: `Receipt ${order.orderId}`,
    symbol: 'RCPT',
    uri: opts.uri,                                // JSON with public, non-personal details
    additionalMetadata: [
      ['order_hash', orderHash(order)],
      ['warranty_until', warrantyUntil.toISOString().slice(0, 10)],
      ['sku', order.sku],
    ],
  };
  // A soulbound receipt cannot be transferred: good for a warranty tied to one buyer.
  const extensions = [ExtensionType.MetadataPointer, ...(opts.soulbound ? [ExtensionType.NonTransferable] : [])];
  const mintLen = getMintLen(extensions);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  return { metadata, mintLen, rentSpace: mintLen + metadataLen };
}

/** Build all instructions: create mint, store metadata, mint 1 to the buyer, lock supply. */
export function buildReceiptInstructions(args: {
  order: Order; mint: PublicKey; merchant: PublicKey; buyer: PublicKey; opts: ReceiptOptions; rentLamports: number;
}): { instructions: TransactionInstruction[]; buyerAta: PublicKey } {
  const { order, mint, merchant, buyer, opts } = args;
  const { metadata, mintLen } = receiptLayout(order, mint, merchant, opts);
  const buyerAta = getAssociatedTokenAddressSync(mint, buyer, false, TOKEN_2022_PROGRAM_ID);
  const instructions = [
    SystemProgram.createAccount({
      fromPubkey: merchant, newAccountPubkey: mint, space: mintLen, lamports: args.rentLamports, programId: TOKEN_2022_PROGRAM_ID,
    }),
    // Metadata lives inside the mint itself: no external metadata account.
    createInitializeMetadataPointerInstruction(mint, merchant, mint, TOKEN_2022_PROGRAM_ID),
    ...(opts.soulbound ? [createInitializeNonTransferableMintInstruction(mint, TOKEN_2022_PROGRAM_ID)] : []),
    createInitializeMintInstruction(mint, 0, merchant, null, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID, metadata: mint, updateAuthority: merchant, mint, mintAuthority: merchant,
      name: metadata.name, symbol: metadata.symbol, uri: metadata.uri,
    }),
    ...metadata.additionalMetadata.map(([field, value]) => createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID, metadata: mint, updateAuthority: merchant, field, value,
    })),
    createAssociatedTokenAccountIdempotentInstruction(merchant, buyerAta, buyer, mint, TOKEN_2022_PROGRAM_ID),
    createMintToInstruction(mint, buyerAta, merchant, 1, [], TOKEN_2022_PROGRAM_ID),
    // Lock supply at exactly 1: zero decimals + no mint authority = an NFT, as in WNS.
    createSetAuthorityInstruction(mint, merchant, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID),
  ];
  return { instructions, buyerAta };
}

/** Send on a real cluster (devnet by default). */
export async function mintReceipt(order: Order, buyer: PublicKey, opts: ReceiptOptions) {
  const connection = getConnection();
  const merchant = loadKeypair();
  const mint = Keypair.generate();
  const { rentSpace } = receiptLayout(order, mint.publicKey, merchant.publicKey, opts);
  const rentLamports = await connection.getMinimumBalanceForRentExemption(rentSpace);
  const { instructions, buyerAta } = buildReceiptInstructions({ order, mint: mint.publicKey, merchant: merchant.publicKey, buyer, opts, rentLamports });
  const signature = await sendAndConfirmTransaction(connection, new Transaction().add(...instructions), [merchant, mint]);
  return { mint: mint.publicKey.toBase58(), buyerAta: buyerAta.toBase58(), signature };
}
