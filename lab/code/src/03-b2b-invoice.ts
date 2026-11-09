// Model 3: B2B settlement token with built-in rules (Token-2022, not the WNS program itself):
//   - Transfer Fees: a platform fee taken by the token itself;
//   - Default Account State = Frozen: only accounts the issuer thaws (verified counterparties) can hold it;
//   - Required Memo: the receiving account rejects any payment that carries no memo at all.
//     Token-2022 checks THAT a memo exists, not WHAT it says: a wrong invoice number still passes on-chain.
//     Matching the invoice number is done off-chain, at reconciliation (see matchInvoicePayment below).
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
export const FEE_BPS: number = 25;                                   // 0.25%
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

/** Fee the token will take: 0.25% capped at 50 units. Must match the mint config exactly.
 *  Token-2022 rounds the fee UP (ceiling division), and TransferCheckedWithFee rejects any other value.
 *  Example: 401 base units at 25 bps = 1.0025 -> fee 2, not 1.  (Fixed 2026-11-09, reported by a reader.) */
export function expectedFee(amount: bigint): bigint {
  if (amount === 0n || FEE_BPS === 0) return 0n;
  const raw = (amount * BigInt(FEE_BPS) + 9_999n) / 10_000n;
  return raw > FEE_CAP ? FEE_CAP : raw;
}

export const invoiceMemo = (invoiceId: string) => `invoice:${invoiceId}`;

/** Memos written by the Memo program, read from transaction logs. The Memo program logs
 *  'Program log: Memo (len N)' and then the text on the next line (older versions: 'Memo (len N): "text"'). */
export function memosFromLogs(logs: string[]): string[] {
  const out: string[] = [];
  logs.forEach((l, i) => {
    const m = /Memo \(len (\d+)\)(?:: "(.*)")?$/.exec(l);
    if (!m) return;
    if (m[2] !== undefined) out.push(m[2]);
    else if (logs[i + 1]?.startsWith('Program log: ')) out.push(logs[i + 1].slice('Program log: '.length));
  });
  return out;
}

/** Reconciliation (off-chain): the on-chain rule only proves that SOME memo was attached.
 *  Accept a payment for an invoice only if it carries exactly one invoice memo and it is the expected one. */
export function matchInvoicePayment(logs: string[], invoiceId: string): boolean {
  const inv = memosFromLogs(logs).filter(m => m.startsWith('invoice:'));
  return inv.length === 1 && inv[0] === invoiceMemo(invoiceId);
}

/** Pay an invoice: the memo instruction must come right before the transfer. */
export function buildPayInvoice(args: { mint: PublicKey; from: PublicKey; to: PublicKey; payer: PublicKey; invoiceId: string | null; amount: bigint }): TransactionInstruction[] {
  return [
    ...(args.invoiceId ? [memoInstruction(invoiceMemo(args.invoiceId), args.payer)] : []),
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
