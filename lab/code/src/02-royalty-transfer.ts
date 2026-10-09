// Model 2: creator royalties. Inspect which program enforces royalties on an NFT,
// then transfer it so that the transfer hook (e.g. WNS royalty distribution) runs.
// License: Apache-2.0. Example code, not audited. Devnet first.
import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedWithTransferHookInstruction, getAssociatedTokenAddressSync, getMint, getTransferHook,
} from '@solana/spl-token';
import { WNS_ROYALTY_PROGRAM_ID, detectTokenProgram, getConnection, loadKeypair } from './common.js';

/** Read the transfer-hook program attached to a mint. */
export async function inspectRoyaltyHook(mintAddress: string) {
  const connection = getConnection();
  const mint = new PublicKey(mintAddress);
  const program = await detectTokenProgram(connection, mint);
  if (!program.equals(TOKEN_2022_PROGRAM_ID)) return { mint: mintAddress, hook: null, note: 'Classic SPL token: no transfer hooks' };
  const info = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const hook = getTransferHook(info);
  const hookProgram = hook?.programId ?? null;
  return {
    mint: mintAddress,
    hook: hookProgram?.toBase58() ?? null,
    isWnsRoyalty: hookProgram ? hookProgram.equals(WNS_ROYALTY_PROGRAM_ID) : false,
  };
}

/** Transfer one NFT. The helper resolves the hook's extra accounts on-chain, so royalties logic runs. */
export async function transferWithRoyalties(mintAddress: string, to: string) {
  const connection = getConnection();
  const owner = loadKeypair();
  const mint = new PublicKey(mintAddress);
  const recipient = new PublicKey(to);
  const source = getAssociatedTokenAddressSync(mint, owner.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const destination = getAssociatedTokenAddressSync(mint, recipient, false, TOKEN_2022_PROGRAM_ID);

  const transferIx = await createTransferCheckedWithTransferHookInstruction(
    connection, source, mint, destination, owner.publicKey, 1n, 0, [], 'confirmed', TOKEN_2022_PROGRAM_ID,
  );
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(owner.publicKey, destination, recipient, mint, TOKEN_2022_PROGRAM_ID),
    transferIx,
  );
  // If the hook rejects the transfer (for example, royalties not approved), the whole transaction rolls back.
  return sendAndConfirmTransaction(connection, tx, [owner]);
}

// Example: npx tsx src/02-royalty-transfer.ts <MINT_ADDRESS>
if (process.argv[2]) inspectRoyaltyHook(process.argv[2]).then(r => console.log(r)).catch(e => { console.error(e); process.exit(1); });
