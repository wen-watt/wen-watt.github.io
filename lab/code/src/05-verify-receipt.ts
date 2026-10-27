// Model 5: check a receipt / warranty card the way a machine would.
// Reads only public chain data and answers one question: "is this a genuine, single, soulbound card
// from this shop, held by this wallet, for this order, and is the warranty still valid?"
// Wen Open Lab: built on the open heritage of Wen and the Wen New Standard (WNS), free for everyone.
// License: Apache-2.0. Example code, not audited. Devnet first.
import { PublicKey, type AccountInfo } from '@solana/web3.js';
import {
  ExtensionType, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, getExtensionData, getExtensionTypes,
  getMetadataPointerState, unpackAccount, unpackMint,
} from '@solana/spl-token';
import { unpack as unpackMetadata } from '@solana/spl-token-metadata';
import { orderHash, type Order } from './01-receipt-nft.js';
import { getConnection } from './common.js';

export interface Expected {
  merchant: PublicKey;      // who must have issued the card (metadata update authority)
  holder: PublicKey;        // whose wallet must hold it
  order?: Order;            // optional: the buyer's own order JSON, to prove "this card is for this order"
  today?: string;           // ISO date to check the warranty against (default: today)
}
export interface Check { name: string; ok: boolean; detail?: string }

/** Pure check over raw account data: easy to test, no network. */
export function verifyReceipt(mint: PublicKey, mintInfo: AccountInfo<Buffer> | null, holderAta: PublicKey,
  ataInfo: AccountInfo<Buffer> | null, exp: Expected): { valid: boolean; checks: Check[] } {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail = '') => checks.push({ name, ok, detail });

  if (!mintInfo || !mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    add('mint is owned by Token-2022', false, mintInfo ? mintInfo.owner.toBase58() : 'not found');
    return { valid: false, checks };
  }
  add('mint is owned by Token-2022', true);
  const m = unpackMint(mint, mintInfo, TOKEN_2022_PROGRAM_ID);
  add('one of one: supply 1, decimals 0, mint authority removed', m.supply === 1n && m.decimals === 0 && m.mintAuthority === null,
    `supply=${m.supply} decimals=${m.decimals}`);
  add('soulbound: NonTransferable extension present', getExtensionTypes(m.tlvData).includes(ExtensionType.NonTransferable));

  const ptr = getMetadataPointerState(m);
  add('metadata pointer points to the mint itself', !!ptr?.metadataAddress?.equals(mint));
  const raw = getExtensionData(ExtensionType.TokenMetadata, m.tlvData);
  if (!raw) { add('metadata stored inside the mint', false); return { valid: false, checks }; }
  const md = unpackMetadata(raw);
  const f = Object.fromEntries(md.additionalMetadata);
  add('issued by the expected shop (update authority)', !!md.updateAuthority?.equals(exp.merchant), md.updateAuthority?.toBase58() ?? 'none');

  const today = exp.today ?? new Date().toISOString().slice(0, 10);
  add('warranty still valid', typeof f.warranty_until === 'string' && f.warranty_until >= today, `until ${f.warranty_until ?? '?'}, today ${today}`);
  if (exp.order) add('order hash matches the buyer\'s order', f.order_hash === orderHash(exp.order));

  const expectedAta = getAssociatedTokenAddressSync(mint, exp.holder, false, TOKEN_2022_PROGRAM_ID);
  let held = false;
  if (ataInfo && holderAta.equals(expectedAta)) {
    const a = unpackAccount(holderAta, ataInfo, TOKEN_2022_PROGRAM_ID);
    held = a.amount === 1n && a.owner.equals(exp.holder) && a.mint.equals(mint);
  }
  add('held by the expected wallet', held);
  return { valid: checks.every(c => c.ok), checks };
}

/** Same check against a live cluster (devnet by default). */
export async function verifyReceiptOnChain(mintAddress: string, exp: Expected) {
  const connection = getConnection();
  const mint = new PublicKey(mintAddress);
  const ata = getAssociatedTokenAddressSync(mint, exp.holder, false, TOKEN_2022_PROGRAM_ID);
  const [mintInfo, ataInfo] = await connection.getMultipleAccountsInfo([mint, ata]);
  return verifyReceipt(mint, mintInfo, ata, ataInfo, exp);
}

// Example: npx tsx src/05-verify-receipt.ts <MINT> <MERCHANT> <HOLDER>
if (process.argv[4]) {
  verifyReceiptOnChain(process.argv[2], { merchant: new PublicKey(process.argv[3]), holder: new PublicKey(process.argv[4]) })
    .then(r => { for (const c of r.checks) console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name}${c.detail ? '  — ' + c.detail : ''}`); console.log(r.valid ? 'VALID' : 'NOT VALID'); })
    .catch(e => { console.error(e); process.exit(1); });
}
