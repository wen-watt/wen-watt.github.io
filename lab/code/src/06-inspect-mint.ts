// Model 6: read any token mint like an auditor. Which program owns it, who can still mint or freeze,
// which Token-2022 extensions it carries, and what each one means for a holder. Read-only, public data only.
// Wen Open Lab: built on the open heritage of Wen and the Wen New Standard (WNS), free for everyone.
// License: Apache-2.0. Example code, not audited.
import { PublicKey, type AccountInfo } from '@solana/web3.js';
import {
  ExtensionType, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getDefaultAccountState, getExtensionTypes,
  getPermanentDelegate, getTransferFeeConfig, getTransferHook, getMintCloseAuthority, unpackMint, AccountState,
} from '@solana/spl-token';
import { getConnection } from './common.js';

export interface MintReport {
  program: 'token-2022' | 'classic-spl';
  decimals: number;
  supply: bigint;
  mintAuthority: string | null;      // can still create new tokens
  freezeAuthority: string | null;    // can freeze holders' accounts
  extensions: string[];
  notes: string[];                   // plain-language notes for a holder
}

/** Pure inspection over raw account data (no network). */
export function inspectMint(mint: PublicKey, info: AccountInfo<Buffer> | null): MintReport {
  if (!info) throw new Error(`Mint ${mint.toBase58()} not found on this cluster`);
  const is2022 = info.owner.equals(TOKEN_2022_PROGRAM_ID);
  if (!is2022 && !info.owner.equals(TOKEN_PROGRAM_ID)) throw new Error(`Account ${mint.toBase58()} is not a token mint`);
  const m = unpackMint(mint, info, is2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID);
  const notes: string[] = [];
  if (m.mintAuthority) notes.push('Mint authority is set: more tokens can still be created.');
  if (m.freezeAuthority) notes.push('Freeze authority is set: holder accounts can be frozen.');

  const types = is2022 ? getExtensionTypes(m.tlvData) : [];
  for (const t of types) {
    if (t === ExtensionType.PermanentDelegate) {
      const d = getPermanentDelegate(m);
      notes.push(`Permanent delegate ${d?.delegate.toBase58()}: can transfer or burn tokens from ANY holder.`);
    } else if (t === ExtensionType.TransferFeeConfig) {
      const c = getTransferFeeConfig(m)!;
      const f = c.newerTransferFee;
      notes.push(`Transfer fee: ${f.transferFeeBasisPoints / 100}% capped at ${f.maximumFee} base units, taken on every transfer.`);
    } else if (t === ExtensionType.TransferHook) {
      const h = getTransferHook(m);
      notes.push(`Transfer hook: program ${h?.programId.toBase58()} runs on every transfer` +
        (h?.authority ? `; authority ${h.authority.toBase58()} can change it.` : '; it cannot be changed.'));
    } else if (t === ExtensionType.DefaultAccountState) {
      const s = getDefaultAccountState(m);
      if (s?.state === AccountState.Frozen) notes.push('New accounts start frozen: the issuer must approve each holder.');
    } else if (t === ExtensionType.NonTransferable) {
      notes.push('Non-transferable (soulbound): tokens cannot be moved to another wallet.');
    } else if (t === ExtensionType.MintCloseAuthority) {
      notes.push(`Mint close authority ${getMintCloseAuthority(m)?.closeAuthority.toBase58()}: the mint can be closed when supply is zero.`);
    }
  }
  return {
    program: is2022 ? 'token-2022' : 'classic-spl',
    decimals: m.decimals, supply: m.supply,
    mintAuthority: m.mintAuthority?.toBase58() ?? null,
    freezeAuthority: m.freezeAuthority?.toBase58() ?? null,
    extensions: types.map(t => ExtensionType[t]),
    notes,
  };
}

export async function inspectMintOnChain(mintAddress: string) {
  const mint = new PublicKey(mintAddress);
  return inspectMint(mint, await getConnection().getAccountInfo(mint));
}

// Example: RPC_URL=https://api.mainnet-beta.solana.com npx tsx src/06-inspect-mint.ts <MINT>
if (process.argv[2]) {
  inspectMintOnChain(process.argv[2]).then(r => {
    console.log(`${r.program}, decimals ${r.decimals}, supply ${r.supply}`);
    console.log(`mint authority: ${r.mintAuthority ?? 'none'} · freeze authority: ${r.freezeAuthority ?? 'none'}`);
    console.log(`extensions: ${r.extensions.join(', ') || 'none'}`);
    for (const n of r.notes) console.log('- ' + n);
  }).catch(e => { console.error(e); process.exit(1); });
}
