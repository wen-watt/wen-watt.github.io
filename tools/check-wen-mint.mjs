// Reads the WEN mint straight from Solana mainnet (read-only, no wallet, no keys)
// and prints what anyone can verify in an explorer: owner program, authorities,
// and Token-2022 extensions such as a transfer fee.
// Usage: node tools/check-wen-mint.mjs [MINT] [RPC_URL]
const MINT = process.argv[2] || 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk';
const RPC = process.argv[3] || 'https://api.mainnet-beta.solana.com';
const PROGRAMS = {
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'SPL Token (original program, no extensions possible)',
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: 'Token-2022 (Token Extensions)',
};

export function summarize(mint, value) {
  if (!value) return { ok: false, lines: [`Account ${mint} not found.`] };
  const info = value.data?.parsed?.info ?? {};
  const exts = info.extensions ?? [];
  const fee = exts.find(e => e.extension === 'transferFeeConfig');
  const hook = exts.find(e => e.extension === 'transferHook');
  const delegate = exts.find(e => e.extension === 'permanentDelegate');
  const lines = [
    `Mint: ${mint}`,
    `Owner program: ${value.owner} = ${PROGRAMS[value.owner] ?? 'UNKNOWN, not a token program'}`,
    `Account type: ${value.data?.parsed?.type ?? 'unknown'}`,
    `Decimals: ${info.decimals}`,
    `Mint authority: ${info.mintAuthority ?? 'none (revoked)'}`,
    `Freeze authority: ${info.freezeAuthority ?? 'none (revoked)'}`,
    `Extensions: ${exts.length ? exts.map(e => e.extension).join(', ') : 'none'}`,
    `Transfer fee: ${fee ? JSON.stringify(fee.state?.newerTransferFee ?? fee.state) : 'none'}`,
    `Transfer hook: ${hook ? JSON.stringify(hook.state) : 'none'}`,
    `Permanent delegate: ${delegate ? JSON.stringify(delegate.state) : 'none'}`,
  ];
  return { ok: !!PROGRAMS[value.owner], lines, fee: !!fee };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = await fetch(RPC, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [MINT, { encoding: 'jsonParsed', commitment: 'finalized' }] }),
  });
  const j = await res.json();
  if (j.error) { console.error('RPC error:', JSON.stringify(j.error)); process.exit(1); }
  const out = summarize(MINT, j.result?.value);
  // Second link of the chain: the WNS program (wen_new_standard) on mainnet.
  const WNS = 'wns1gDLt8fgLcGhWi5MqAqgXpwEP1JftKE9eZnXS1HM';
  let wnsLines = [];
  try {
    const r2 = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getAccountInfo', params: [WNS, { encoding: 'base64', commitment: 'finalized', dataSlice: { offset: 0, length: 0 } }] }) });
    const v = (await r2.json()).result?.value;
    wnsLines = ['', `WNS program: ${WNS}`,
      v ? `  exists: yes · executable: ${v.executable} · loader: ${v.owner}` : '  exists: no account found'];
  } catch (e) { wnsLines = ['', `WNS program: check failed (${e.message})`]; }
  const text = [`Checked at slot ${j.result?.context?.slot} (finalized), ${new Date().toISOString()}`, ...out.lines, ...wnsLines].join('\n');
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## WEN mint, read from Solana mainnet\n\n\`\`\`\n${text}\n\`\`\`\n`);
  }
  process.exit(out.ok ? 0 : 1);
}
