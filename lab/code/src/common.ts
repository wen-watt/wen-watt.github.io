// Wen Open Lab: shared helpers. License: Apache-2.0. Example code, not audited.
// Always run on devnet first and verify every step against the official docs.
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { readFileSync } from 'node:fs';

/** The $WEN token mint on Solana mainnet. Always re-check it on CoinMarketCap or Solana Explorer. */
export const WEN_MINT = new PublicKey('WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk');

/** WNS program IDs from the official Wen Program Library README (github.com/wen-community/wen-program-library). */
export const WNS_PROGRAM_ID = new PublicKey('wns1gDLt8fgLcGhWi5MqAqgXpwEP1JftKE9eZnXS1HM');
export const WNS_ROYALTY_PROGRAM_ID = new PublicKey('diste3nXmK7ddDTs1zb6uday6j4etCa9RChD8fJ1xay');

/** RPC connection. Set RPC_URL to your own endpoint; defaults to public devnet. */
export function getConnection(): Connection {
  return new Connection(process.env.RPC_URL ?? clusterApiUrl('devnet'), 'confirmed');
}

/** Load a keypair from a Solana CLI JSON file (KEYPAIR env var, default ./devnet-wallet.json). */
export function loadKeypair(path = process.env.KEYPAIR ?? './devnet-wallet.json'): Keypair {
  const secret = Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]);
  return Keypair.fromSecretKey(secret);
}

/** Which token program owns a mint: classic SPL Token or Token-2022. Never assume, always check. */
export async function detectTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint ${mint.toBase58()} not found on this cluster`);
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  throw new Error(`Account ${mint.toBase58()} is not a token mint`);
}
