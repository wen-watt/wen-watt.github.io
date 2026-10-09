// Model 3: B2B settlement token with built-in rules (Token-2022, not the WNS program itself):
//   - Transfer Fees: a platform fee taken by the token itself;
//   - Default Account State = Frozen: only accounts the issuer thaws (verified counterparties) can hold it;
//   - Required Memo: the receiving account rejects any payment without an invoice number.
// License: Apache-2.0. Example code, not audited. Devnet first. A real stablecoin issuer is a licensed entity.
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  AccountState, ExtensionType, TOKEN_2022_PROGRAM_ID,
  createEnableRequiredMemoTransfersInstruction, createInitializeAccount3Instruction,
  createInitializeDefaultAccountStateInstruction, createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction, createThawAccountInstruction,
  createTransferCheckedWithFeeInstruction, getAccountLen, getMintLen,
} from '@solana/spl-token';
import { getConnection, loadKeypair } from './common.js';

export const DECIMALS = 6;

/** The canonical SPL Memo program that Token-2022 checks for "required memo" accounts.
 *  Note: newer @solana/spl-memo releases default to a different program ID, so we build the memo ourselves. */
export const SPL_MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export function memoInstruction(text: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: SPL_MEMO_PROGRAM_ID,
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    data: Buffer.from(text, 'utf8'),
  });
}
export const FEE_BPS = 25;                                   // 0.25%
export const FEE_CAP = 50n * 10n ** BigInt(DECIMALS);        // at most 50 units per transfer

export const settlementMintSpace = () => getMintLen([ExtensionType.TransferFeeConfig, ExtensionType.DefaultAccountState]);
export const invoiceAccountSpace = () => getAccountLen([ExtensionType.TransferFeeAmount, ExtensionType.MemoTransfer]);

/** Issuer creates the settlement mint. It keeps the freeze authority: thawing = approving a counterparty. */
export function buildSettlementMint(issuer: PublicKey, mint: PublicKey, rentLamports: number): TransactionInstruction[] {
  return [
    SystemProgram.createAccount({ fromPubkey: issuer, newAccountPubkey: mint, space: settlementMintSpace(), lamports: rentLamports, programId: TOKEN_2022_PROGRAM_ID }),
    createInitializeTransferFeeConfigInstruction(mint, issuer, issuer, FEE_BPS, FEE_CAP, TOKEN_2022_PROGRAM_ID),
    createInitializeDefaultAccountStateInstruction(mint, AccountState.Frozen, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint, DECIMALS, issuer, issuer, TOKEN_2022_PROGRAM_ID),
  ];
}

/** A company opens an account that demands an invoice memo on every incoming payment. */
export function buildInvoiceAccount(company: PublicKey, account: PublicKey, mint: PublicKey, rentLamports: number, requireMemo = true): TransactionInstruction[] {
  return [
    SystemProgram.createAccount({ fromPubkey: company, newAccountPubkey: account, space: invoiceAccountSpace(), lamports: rentLamports, programId: TOKEN_2022_PROGRAM_ID }),
    createInitializeAccount3Instruction(account, mint, company, TOKEN_2022_PROGRAM_ID),
    ...(requireMemo ? [createEnableRequiredMemoTransfersInstruction(account, company, [], TOKEN_2022_PROGRAM_ID)] : []),
  ];
}

/** Issuer approves (thaws) an account after its own KYB checks off-chain. */
export function buildApproveCounterparty(issuer: PublicKey, mint: PublicKey, account: PublicKey): TransactionInstruction[] {
  return [createThawAccountInstruction(account, mint, issuer, [], TOKEN_2022_PROGRAM_ID)];
}

/** Fee the token will take: 0.25% capped at 50 units. Must match the mint config exactly. */
export function expectedFee(amount: bigint): bigint {
  const pct = (amount * BigInt(FEE_BPS)) / 10_000n;
  return pct > FEE_CAP ? FEE_CAP : pct;
}

/** Pay an invoice: the memo instruction must come right before the transfer. */
export function buildPayInvoice(args: { mint: PublicKey; from: PublicKey; to: PublicKey; payer: PublicKey; invoiceId: string | null; amount: bigint }): TransactionInstruction[] {
  return [
    ...(args.invoiceId ? [memoInstruction(`invoice:${args.invoiceId}`, args.payer)] : []),
    createTransferCheckedWithFeeInstruction(args.from, args.mint, args.to, args.payer, args.amount, DECIMALS, expectedFee(args.amount), [], TOKEN_2022_PROGRAM_ID),
  ];
}

/** Example of sending one step on a real cluster (devnet by default). */
export async function createSettlementMint() {
  const connection = getConnection();
  const issuer = loadKeypair();
  const mint = Keypair.generate();
  const rent = await connection.getMinimumBalanceForRentExemption(settlementMintSpace());
  await sendAndConfirmTransaction(connection, new Transaction().add(...buildSettlementMint(issuer.publicKey, mint.publicKey, rent)), [issuer, mint]);
  return mint.publicKey;
}
