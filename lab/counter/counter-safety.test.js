// Receive-only safety tests for Wen Counter. Run: node counter-safety.test.js · Apache-2.0
// They prove, by reading the code the browser runs, that the counter cannot sign, send or reach a wallet.
const fs = require('fs'), path = require('path'), assert = require('assert');
const dir = __dirname;
const app = fs.readFileSync(path.join(dir, 'counter-app.js'), 'utf8');
const core = fs.readFileSync(path.join(dir, 'counter-core.js'), 'utf8');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
const i18n = fs.readFileSync(path.join(dir, 'counter-i18n.js'), 'utf8');
const deploy = fs.readFileSync(path.join(dir, 'counter-deploy.js'), 'utf8');
const ours = app + '\n' + core + '\n' + sw + '\n' + i18n + '\n' + deploy;
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };

t('no wallet provider is ever touched (window.solana, phantom, solflare, backpack, wallet adapters)', () => {
  for (const w of ['window.solana', 'window.phantom', 'window.solflare', 'window.backpack', 'window.jupiter', 'wallet-adapter', 'WalletAdapter', 'wallet-standard', 'getWallets'])
    assert.ok(!ours.includes(w), 'found ' + w);
});
t('no connect or sign calls of any kind', () => {
  for (const w of ['.connect(', 'signTransaction', 'signAllTransactions', 'signMessage', 'signAndSendTransaction', 'requestAccounts'])
    assert.ok(!ours.includes(w), 'found ' + w);
});
t('no keys: no secret-key parsing, no keypair objects, no seed phrases', () => {
  for (const w of ['fromSecretKey', 'secretKey', 'Keypair', 'mnemonic', 'seed phrase input', 'privateKey'])
    assert.ok(!ours.includes(w), 'found ' + w);
});
t('only three read RPC methods exist in the code, and they are allow-listed', () => {
  const used = [...app.matchAll(/rpc\('([A-Za-z]+)'/g)].map((m) => m[1]);
  assert.deepStrictEqual([...new Set(used)].sort(), ['getAccountInfo', 'getSignaturesForAddress', 'getTransaction']);
  assert.ok(/READ_ONLY = new Set\(\['getSignaturesForAddress', 'getTransaction', 'getAccountInfo'\]\)/.test(app));
  assert.ok(app.includes("if (!READ_ONLY.has(method)) throw"));
  for (const w of ['sendTransaction', 'simulateTransaction', 'requestAirdrop', 'sendRawTransaction'])
    assert.ok(!ours.includes(w), 'found ' + w);
});
t('no inbound API: no message listeners, no URL parameters that trigger actions, no remote code', () => {
  for (const w of ["addEventListener('message'", 'addEventListener("message"', 'onmessage', 'location.search', 'location.hash', 'eval(', 'new Function(', 'importScripts(', 'document.write('])
    assert.ok(!ours.includes(w), 'found ' + w);
});
t('strict Content Security Policy: own scripts only, no inline script, no third-party origins', () => {
  const m = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, 'CSP missing');
  const csp = m[1];
  assert.ok(csp.includes("script-src 'self'") && !/script-src[^;]*unsafe/.test(csp));
  assert.ok(csp.includes("object-src 'none'") && csp.includes("base-uri 'none'") && csp.includes("form-action 'none'"));
  assert.ok(!/<script(?![^>]*src=)[^>]*>/.test(html), 'inline script found');
  for (const src of [...html.matchAll(/<script src="([^"]+)"/g)].map((x) => x[1])) assert.ok(!/^https?:/.test(src), 'external script ' + src);
});
t('network data is never written as HTML (signatures go through a format check and DOM nodes)', () => {
  assert.ok(!/innerHTML\s*=\s*`[^`]*\$\{(sig|x\.sig|tx|res)/.test(app));
  assert.ok(app.includes('SIG_RE.test(String(sig))'));
  assert.ok(/textContent = c;/.test(app));
});
t('the service worker never caches or proxies the chain', () => {
  assert.ok(sw.includes("u.origin !== location.origin) return"));
});
t('verification needs all five: reference, recipient, token, amount, success', () => {
  for (const w of ['Reference key is not in the transaction', 'Recipient is not in the transaction', 'mint === splToken', 'expected', 'Transaction failed on-chain'])
    assert.ok(core.includes(w), 'missing ' + w);
});
t('interface words are bound to the core fingerprint (a translation cannot silently ride on a changed core)', () => {
  const hash = require('crypto').createHash('sha256').update(core).digest('hex');
  const I = require(path.join(dir, 'counter-i18n.js'));
  assert.strictEqual(I.FOR_CORE, hash, 'counter-i18n.js was written for another core: check the translations again and update FOR_CORE');
});
t('interface words are written as text only, never as HTML', () => {
  for (const w of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write']) assert.ok(!i18n.includes(w), 'found ' + w);
  assert.ok(i18n.includes('el.textContent = t('));
  const I = require(path.join(dir, 'counter-i18n.js'));
  for (const [lang, d] of Object.entries(I.DICT)) for (const [k, v] of Object.entries(d)) assert.ok(!/[<>]/.test(v), lang + '.' + k + ' contains markup');
});
t('Setup is behind a PIN: hidden until unlocked, every change guarded, PIN kept only as a salted SHA-256', () => {
  assert.ok(html.includes('<form id="setupForm" hidden>'), 'setup form must start hidden');
  assert.ok((app.match(/if \(!unlocked\) return;/g) || []).length >= 3, 'save, new PIN and clear ledger must check the lock');
  assert.ok(app.includes("if (tab !== 'setup') setLocked(true);"), 'leaving Setup must lock it');
  assert.ok(app.includes("crypto.subtle.digest('SHA-256'"));
  assert.ok(app.includes("store.set('lock', { salt, hash: await sha256hex(salt + ':' + p1), at: Date.now() })"));
  assert.ok(!/store\.set\('lock',[^\n]*\bpin\b/.test(app), 'a raw PIN must never be stored');
  assert.ok(!/id="clearLedger"/.test(html.slice(html.indexOf('<section id="ledger"'), html.indexOf('<section id="setup"'))), 'clearing the ledger lives behind the PIN');
});
t('the deployment file holds parameters only, no code', () => {
  const body = deploy.replace(/\/\*[\s\S]*?\*\//, '').trim();
  assert.ok(/^self\.WenCounterDeploy = \{ setupPin: '\d{4,8}' \};$/.test(body), 'counter-deploy.js: ' + body);
});
// Identity (information, not a failure): do the files match the fingerprints in NOTICE?
try {
  const crypto = require('crypto');
  const notice = fs.readFileSync(path.join(dir, 'NOTICE'), 'utf8');
  const rows = [...notice.matchAll(/^\s+([0-9a-f]{64})\s+(\S+)$/gm)];
  const same = rows.length > 0 && rows.every(([, h, f]) => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex') === h);
  // Block fingerprint: one SHA-256 over the list of the files' actual fingerprints, so the whole WCP-1 block has one identity.
  const list = rows.map(([, , f]) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')}  ${f}`).sort((a, b) => a.split('  ')[1].localeCompare(b.split('  ')[1])).join('\n') + '\n';
  const block = crypto.createHash('sha256').update(list).digest('hex');
  const m = notice.match(/^WCP-1 block: ([0-9a-f]{64})$/m);
  console.log('block fingerprint: ' + block + (m ? (m[1] === block ? ' (matches NOTICE)' : ' (differs from NOTICE)') : ''));
  console.log(same ? 'identity: original Wen Counter build (WCP-1 fingerprints match NOTICE)' : 'identity: changed build. Fine under Apache-2.0: say so, keep NOTICE and the credit.');
} catch (e) { console.log('identity: NOTICE not found'); }
console.log(`\n${n} safety checks passed`);
