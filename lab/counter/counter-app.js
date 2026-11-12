/* Wen Counter · app (Model 7) · Wen Counter Protocol 1.0 (WCP-1): receive-only, read-only in code, five-point verification, wallet as identity, local ledger.
 * Built on Solana, Solana Pay, SPL Token and Token-2022, WNS and WEN · Wen Open Lab · wen-watt.github.io
 * Browser only: shows a Solana Pay QR, watches the chain, keeps a local ledger.
 * Never asks for keys. License: Apache-2.0. Example code, not audited. Devnet first.
 */
(function () {
  'use strict';
  const C = window.WenCounterCore;
  const I = window.WenCounterI18n; // interface words; bound to the core fingerprint
  const $ = (id) => document.getElementById(id);

  // Order chosen for shops: USDC, SOL, WEN, JUP; USDT optional. Decimals are confirmed from the chain before each sale.
  const TOKENS = {
    'usdc-devnet': { label: 'USDC (devnet)', mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', decimals: 6, net: 'devnet', stable: true },
    'usdc-mainnet': { label: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, net: 'mainnet', stable: true },
    'sol': { label: 'SOL', mint: null, decimals: 9 },
    'wen': { label: 'WEN', mint: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk', decimals: 5, net: 'mainnet' },
    'jup': { label: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, net: 'mainnet' },
    'usdt': { label: 'USDT (optional)', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, net: 'mainnet', stable: true },
    'custom': { label: 'Custom token', mint: null, decimals: 6 },
  };
  const RPC = { devnet: 'https://api.devnet.solana.com', mainnet: 'https://api.mainnet-beta.solana.com' };

  // ---- storage (per device; may be unavailable in private modes) ----
  const store = {
    get(k, d) { try { const v = localStorage.getItem('wen-counter:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('wen-counter:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  let cfg = Object.assign({ shop: '', recipient: '', network: 'devnet', rpc: '', token: 'usdc-devnet', mainLabel: 'Main', mainType: 'Main', extra: [], lang: 'en', mint: '', dec: 6, pct: 2.9, fixed: 0.30, off: 0, mainOk: false, unit: '', walletName: 'Jupiter', turnover: '', checked: null }, store.get('cfg', {}));
  let ledger = store.get('ledger', []);

  const tok = () => cfg.token === 'custom' ? { label: 'token', mint: cfg.mint, decimals: Number(cfg.dec) } : TOKENS[cfg.token];
  const rpcUrl = () => cfg.rpc || RPC[cfg.network];
  const explorer = (sig) => `https://explorer.solana.com/tx/${sig}${cfg.network === 'devnet' ? '?cluster=devnet' : ''}`;
  const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/; // a transaction signature in base58
  /** A safe explorer link, built without innerHTML; anything that is not a signature becomes plain text. */
  function txLink(sig, text) {
    if (!SIG_RE.test(String(sig))) { const s = document.createElement('span'); s.textContent = 'invalid signature'; return s; }
    const a = document.createElement('a'); a.href = explorer(sig); a.target = '_blank'; a.rel = 'noopener'; a.textContent = text; return a;
  }
  const fmt = (x) => (Math.round(x * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Receive-only guarantee in code: the counter may send only these three read requests. Nothing that signs or sends.
  const READ_ONLY = new Set(['getSignaturesForAddress', 'getTransaction', 'getAccountInfo']);
  async function rpc(method, params) {
    if (!READ_ONLY.has(method)) throw new Error('Blocked: the counter only reads the chain');
    const r = await fetch(rpcUrl(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    const j = await r.json(); if (j.error) throw new Error(j.error.message || 'RPC error'); return j.result;
  }

  // ---- tabs ----
  function show(tab) {
    document.querySelectorAll('nav button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ['sell', 'ledger', 'setup'].forEach((t) => { $(t).hidden = t !== tab; });
    if (tab === 'ledger') renderLedger();
    if (tab !== 'setup') setLocked(true); // leaving Setup locks it again
    else if (!unlocked) setTimeout(() => $('pinIn').focus(), 0);
  }

  // ---- setup PIN: only the owner of the device sets the receiving wallets ----
  // The PIN locks Setup on a shared device (a till phone), so a manager cannot put their own wallet in.
  // The first PIN comes from the deployment file (counter-deploy.js, default 1111); the owner sets a new one in Setup.
  // Stored only as a salted SHA-256. Forgot it? Reinstall the app on the device, enter the wallets again, set a new PIN.
  const DEPLOY = window.WenCounterDeploy || {};
  const DEFAULT_PIN = C.isPin(DEPLOY.setupPin) ? String(DEPLOY.setupPin) : '1111';
  let unlocked = false, fails = 0, waitUntil = 0;
  async function sha256hex(text) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
  async function pinMatches(pin) {
    const lock = store.get('lock', null);
    if (lock && lock.salt && lock.hash) return (await sha256hex(lock.salt + ':' + pin)) === lock.hash;
    return pin === DEFAULT_PIN;
  }
  function setLocked(v) {
    unlocked = !v; $('lockForm').hidden = !v; $('setupForm').hidden = v; $('pinCard').hidden = v;
    $('lockHint').textContent = store.get('lock', null) ? 'Enter the setup PIN of this device.' : 'First start: enter the PIN from the deployment (1111 unless your counter-deploy.js says otherwise). Then set your own PIN below the settings.';
  }
  $('lockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = $('pinIn').value.trim(); $('pinIn').value = '';
    if (Date.now() < waitUntil) { $('pinMsg').textContent = `Too many tries. Wait ${Math.ceil((waitUntil - Date.now()) / 1000)} s.`; return; }
    if (C.isPin(pin) && await pinMatches(pin)) { fails = 0; $('pinMsg').textContent = ''; setLocked(false); return; }
    fails++; if (fails >= 5) { fails = 0; waitUntil = Date.now() + 30000; }
    $('pinMsg').textContent = 'Wrong PIN. Forgot it? Reinstall the app on this device, enter the receiving wallets again and set a new PIN.';
  });
  $('lockNow').addEventListener('click', () => setLocked(true));
  $('setPin').addEventListener('click', async () => {
    if (!unlocked) return;
    const p1 = $('newPin').value.trim(), p2 = $('newPin2').value.trim();
    if (!C.isPin(p1)) { $('pinSaved').textContent = 'The PIN is 4 to 8 digits.'; return; }
    if (p1 !== p2) { $('pinSaved').textContent = 'The two PINs differ.'; return; }
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((x) => x.toString(16).padStart(2, '0')).join('');
    const ok = store.set('lock', { salt, hash: await sha256hex(salt + ':' + p1), at: Date.now() });
    $('newPin').value = ''; $('newPin2').value = '';
    $('pinSaved').textContent = ok ? 'New setup PIN saved on this device.' : 'Storage is blocked: the PIN could not be saved.';
  });
  document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  document.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); show(a.dataset.go); }));

  // ---- setup ----
  function fillTokens() {
    const sel = $('token'); sel.innerHTML = '';
    for (const [k, t] of Object.entries(TOKENS)) {
      if (t.net === 'devnet' && cfg.network !== 'devnet') continue;
      if (k === 'usdc-mainnet' && cfg.network === 'devnet') continue;
      const o = document.createElement('option'); o.value = k; o.textContent = t.label;
      if (t.net === 'mainnet' && cfg.network === 'devnet') { o.disabled = true; o.textContent += ' · mainnet only'; }
      sel.appendChild(o);
    }
    if (![...sel.options].some((o) => o.value === cfg.token && !o.disabled)) cfg.token = cfg.network === 'devnet' ? 'usdc-devnet' : 'usdc-mainnet';
    sel.value = cfg.token; $('customTok').hidden = cfg.token !== 'custom';
  }
  function loadSetup() {
    $('shop').value = cfg.shop; $('recipient').value = cfg.recipient; $('network').value = cfg.network; $('rpc').value = cfg.rpc;
    $('mint').value = cfg.mint; $('dec').value = cfg.dec; $('pct').value = cfg.pct; $('fixed').value = cfg.fixed; $('off').value = cfg.off;
    $('mainOk').checked = !!cfg.mainOk; $('mainLabel').value = cfg.mainLabel || 'Main'; $('mainType').value = cfg.mainType || 'Main'; renderExtras(); $('unit').value = cfg.unit; $('walletName').value = cfg.walletName; $('turnover').value = cfg.turnover; walletHint(); showChecked(); $('mainWarn').hidden = cfg.network !== 'mainnet';
    const preset = `${cfg.pct}|${Number(cfg.fixed).toFixed(2)}`; $('terms').value = [...$('terms').options].some((o) => o.value === preset) ? preset : 'custom';
    fillTokens(); refreshHeader();
  }
  function refreshHeader() {
    const b = $('netBadge'); b.textContent = cfg.network; b.className = 'badge' + (cfg.network === 'mainnet' ? ' main' : '');
    $('tokLabel').textContent = tok().label; $('needSetup').hidden = C.isAddress(cfg.recipient);
    const ws = wallets(), sel = $('dept'); sel.replaceChildren();
    ws.forEach((w, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = `${C.walletTag(w)} · ${w.address.slice(0, 5)}…${w.address.slice(-5)}`; sel.appendChild(o); });
    $('deptRow').hidden = ws.length < 2;
    const f = $('deptFilter'), keep = f.value; f.replaceChildren(); const all = document.createElement('option'); all.value = ''; all.textContent = 'All wallets'; f.appendChild(all);
    ws.forEach((w) => { const o = document.createElement('option'); o.value = w.address; o.textContent = C.walletTag(w); f.appendChild(o); }); f.value = keep;
  }
  $('network').addEventListener('change', (e) => { cfg.network = e.target.value; $('mainWarn').hidden = cfg.network !== 'mainnet'; fillTokens(); });
  $('token').addEventListener('change', (e) => { cfg.token = e.target.value; $('customTok').hidden = cfg.token !== 'custom'; if (TOKENS[cfg.token] && TOKENS[cfg.token].stable) $('unit').value = '1'; });
  $('terms').addEventListener('change', (e) => { if (e.target.value !== 'custom') { const [p, f] = e.target.value.split('|'); $('pct').value = p; $('fixed').value = f; } });
  $('setupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!unlocked) return;
    const recipient = $('recipient').value.trim();
    if (recipient && !C.isAddress(recipient)) { $('saved').textContent = 'That is not a Solana address. Check it character by character.'; return; }
    if ($('network').value === 'mainnet' && !$('mainOk').checked) { $('saved').textContent = 'Tick “I understand” to use mainnet, or stay on devnet.'; return; }
    if ($('token').value === 'custom' && !C.isAddress($('mint').value.trim())) { $('saved').textContent = 'The token mint is not a Solana address.'; return; }
    const bad = readExtras(true); if (bad) { $('saved').textContent = bad; return; }
    Object.assign(cfg, {
      shop: $('shop').value.trim(), recipient, network: $('network').value, rpc: $('rpc').value.trim(), token: $('token').value,
      mint: $('mint').value.trim(), dec: Number($('dec').value) || 6, pct: Number($('pct').value) || 0, fixed: Number($('fixed').value) || 0,
      off: Number($('off').value) || 0, mainOk: $('mainOk').checked,
      unit: $('unit').value.trim().replace(',', '.'), walletName: $('walletName').value, turnover: $('turnover').value.trim().replace(',', '.'),
      checked: (cfg.checked && cfg.checked.address === recipient && cfg.checked.net === $('network').value) ? cfg.checked : null,
      mainLabel: $('mainLabel').value.trim() || 'Main', mainType: $('mainType').value, extra: readExtras(),
    });
    $('saved').textContent = store.set('cfg', cfg) ? 'Saved on this device.' : 'Saved for this session only (storage is blocked).';
    refreshHeader();
  });

  // ---- receiving wallet: identity = the address the shop pastes, checked on-chain at setup ----
  const HINTS = {
    Jupiter: 'Jupiter Wallet: open it, tap Receive, choose Solana and copy the address.',
    Phantom: 'Phantom: tap Receive, choose Solana and copy the address.',
    Solflare: 'Solflare: tap Receive and copy your Solana address.',
    Backpack: 'Backpack: tap Receive, choose Solana and copy the address.',
    Squads: 'Squads: copy the vault address of your multisig. Sending from it needs approvals from your team members.',
    Other: 'Any Solana wallet works. Use the address shown under Receive; never paste a seed phrase or private key anywhere.',
  };
  function walletHint() { $('walletHint').textContent = HINTS[$('walletName').value] || ''; }
  $('walletName').addEventListener('change', walletHint);
  function showChecked() {
    const c = cfg.checked, r = $('addrResult');
    if (c && c.address === cfg.recipient) { r.className = c.ok ? 'addr-ok' : 'addr-bad'; r.textContent = `${c.ok ? '✓' : '✗'} ${c.wallet} · ${c.address.slice(0, 5)}…${c.address.slice(-5)} · ${c.message} Checked ${new Date(c.at).toLocaleString()} on ${c.net}.`; }
  }
  $('checkAddr').addEventListener('click', async () => {
    const addr = $('recipient').value.trim(), r = $('addrResult');
    if (!C.isAddress(addr)) { r.className = 'addr-bad'; r.textContent = '✗ Not a Solana address. Check it character by character.'; return; }
    r.className = 'dim'; r.textContent = 'Reading the chain…';
    const prevNet = cfg.network, prevRpc = cfg.rpc; cfg.network = $('network').value; cfg.rpc = $('rpc').value.trim();
    try {
      const res = await rpc('getAccountInfo', [addr, { encoding: 'base64', dataSlice: { offset: 0, length: 0 }, commitment: 'confirmed' }]);
      const v = C.classifyAccount(res ? res.value : null);
      cfg.checked = { address: addr, wallet: $('walletName').value, ok: v.ok, kind: v.kind, message: v.message, at: Date.now(), net: cfg.network };
      r.className = v.ok ? (v.kind === 'wallet' ? 'addr-ok' : 'addr-warn') : 'addr-bad';
      r.textContent = `${v.ok ? '✓' : '✗'} ${addr.slice(0, 5)}…${addr.slice(-5)} · ${v.message}`;
    } catch (e) { r.className = 'addr-warn'; r.textContent = 'Could not reach the network: ' + e.message; }
    finally { cfg.network = prevNet; cfg.rpc = prevRpc; }
  });

  // ---- more receiving wallets: departments or branches (1 to X), each receive-only ----
  /** All receiving wallets: the main one first, then the extras with valid addresses. */
  function wallets() {
    const out = [];
    // Wallet numbers are stable: #1 is the main wallet, #2.. follow the order in Setup.
    if (C.isAddress(cfg.recipient)) out.push({ id: 1, type: cfg.mainType || 'Main', label: cfg.mainLabel || 'Main', wallet: cfg.walletName, address: cfg.recipient });
    (cfg.extra || []).forEach((x, i) => { if (C.isAddress(x.address)) out.push(Object.assign({ type: 'Department' }, x, { id: i + 2 })); });
    return out;
  }
  function extraRow(x) {
    const row = document.createElement('div'); row.className = 'xrow';
    const mk = (tag, props) => Object.assign(document.createElement(tag), props);
    const label = mk('input', { maxLength: 24, placeholder: 'Name, e.g. Toys or Branch 2', value: x.label || '' }); label.className = 'x-label';
    const type = mk('select', {}); type.className = 'x-type'; type.setAttribute('aria-label', 'What this wallet is for');
    for (const v of C.WALLET_TYPES.filter((k) => k !== 'Main')) type.appendChild(mk('option', { value: v, textContent: v }));
    type.value = x.type || 'Department';
    const wallet = mk('select', {}); wallet.className = 'x-wallet';
    for (const v of ['Jupiter', 'Phantom', 'Solflare', 'Backpack', 'Squads', 'Other']) wallet.appendChild(mk('option', { value: v, textContent: v }));
    wallet.value = x.wallet || 'Jupiter';
    const addr = mk('input', { placeholder: 'Receiving address', value: x.address || '', spellcheck: false, autocomplete: 'off' }); addr.className = 'mono x-addr';
    const res = mk('p', { className: 'dim' });
    const check = mk('button', { type: 'button', textContent: 'Check', className: 'mini' });
    const del = mk('button', { type: 'button', textContent: 'Remove', className: 'mini' });
    check.addEventListener('click', async () => {
      const a = addr.value.trim(); if (!C.isAddress(a)) { res.className = 'addr-bad'; res.textContent = '✗ Not a Solana address.'; return; }
      res.className = 'dim'; res.textContent = 'Reading the chain…';
      try { const r = await rpc('getAccountInfo', [a, { encoding: 'base64', dataSlice: { offset: 0, length: 0 }, commitment: 'confirmed' }]); const v = C.classifyAccount(r ? r.value : null); res.className = v.ok ? (v.kind === 'wallet' ? 'addr-ok' : 'addr-warn') : 'addr-bad'; res.textContent = `${v.ok ? '✓' : '✗'} ${a.slice(0, 5)}…${a.slice(-5)} · ${v.message}`; }
      catch (e) { res.className = 'addr-warn'; res.textContent = 'Could not reach the network: ' + e.message; }
    });
    del.addEventListener('click', () => row.remove());
    const top = mk('div', {}); top.className = 'row';
    const c0 = mk('div', {}); c0.className = 'narrow'; c0.append(type); const c1 = mk('div', {}); c1.append(label); const c2 = mk('div', {}); c2.className = 'narrow'; c2.append(wallet); top.append(c0, c1, c2);
    const bot = mk('div', {}); bot.className = 'row'; const c3 = mk('div', {}); c3.append(addr); const c4 = mk('div', {}); c4.className = 'narrow'; c4.append(check, del); bot.append(c3, c4);
    row.append(top, bot, res); return row;
  }
  function renderExtras() { const l = $('extraList'); l.replaceChildren(); for (const x of cfg.extra || []) l.appendChild(extraRow(x)); }
  /** Read the extra wallets from the form; with validate=true return an error message or ''. */
  function readExtras(validate) {
    const rows = [...document.querySelectorAll('#extraList .xrow')];
    const list = rows.map((r) => ({ label: r.querySelector('.x-label').value.trim(), type: r.querySelector('.x-type').value, wallet: r.querySelector('.x-wallet').value, address: r.querySelector('.x-addr').value.trim() })).filter((x) => x.address || x.label);
    if (validate) { for (const x of list) { if (!x.label) return 'Give every extra wallet a name.'; if (!C.isAddress(x.address)) return `“${x.label}”: not a Solana address.`; } return ''; }
    return list;
  }
  $('addExtra').addEventListener('click', () => $('extraList').appendChild(extraRow({})));

  // Confirm a token's decimals from the chain before the first sale (read-only).
  const decCache = {};
  async function mintDecimals(t) {
    if (!t.mint) return t.decimals;
    const key = cfg.network + ':' + t.mint; if (decCache[key] !== undefined) return decCache[key];
    const r = await rpc('getAccountInfo', [t.mint, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
    const v = r && r.value, p = v && v.data && v.data.parsed;
    if (!p || p.type !== 'mint' || !['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'].includes(v.owner)) throw new Error(`${t.label} is not a token mint on ${cfg.network}`);
    decCache[key] = Number(p.info.decimals); return decCache[key];
  }

  // ---- sell ----
  let current = null, timer = null, lastPaid = null;
  $('saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ws = wallets(); if (!ws.length) { show('setup'); return; }
    const w = ws[Number($('dept').value) || 0] || ws[0];
    const t = tok(); const amount = $('amount').value.trim().replace(',', '.');
    let expected; try { const dec = await mintDecimals(t); expected = C.toBaseUnits(amount, dec); } catch (err) { alertLine(err.message); return; }
    const reference = C.newReference(); const id = Date.now().toString(36);
    const url = C.buildPayURL({ recipient: w.address, amount, splToken: t.mint || undefined, reference, label: cfg.shop || 'Wen Counter', message: $('note').value.trim() || undefined, memo: C.buildMemo(id, $('note').value) });
    current = { id, amount: Number(amount), amountText: amount, note: $('note').value.trim(), reference, expected, url, started: Date.now(), token: t, to: w.address, dept: w.label, walletId: w.id, walletType: w.type };
    drawQR(url); $('receipt').hidden = true;
    $('payAmount').textContent = `${amount} ${t.label}`; $('payTo').textContent = `to ${C.walletTag(w)} · ${w.address.slice(0, 5)}…${w.address.slice(-5)} · ${w.wallet || 'wallet'} · check it in the buyer's wallet`; setStatus('wait', 'Waiting for payment…'); $('sigLine').textContent = '';
    $('saleForm').hidden = true; $('pay').hidden = false; poll();
  });
  function alertLine(msg) { $('status').textContent = msg; $('status').className = 'status bad'; $('pay').hidden = false; $('qrbox').innerHTML = ''; $('payAmount').textContent = ''; }
  function drawQR(text) {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    $('qrbox').innerHTML = q.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
  }
  function setStatus(kind, text) { const s = $('status'); s.className = 'status ' + kind; s.textContent = text; }
  function reset() { clearTimeout(timer); current = null; lastPaid = null; $('receipt').hidden = true; $('pay').hidden = true; $('saleForm').hidden = false; $('amount').value = ''; $('note').value = ''; $('amount').focus(); }
  $('cancel').addEventListener('click', reset);
  $('copyLink').addEventListener('click', async () => { if (!current) return; $('sigLine').textContent = current.url; try { await navigator.clipboard.writeText(current.url); setStatus('wait', 'Link copied. Still waiting…'); } catch (e) { /* the link stays on screen to copy by hand */ } });

  async function poll() {
    if (!current) return;
    const sale = current;
    if (Date.now() - sale.started > 15 * 60 * 1000) { setStatus('bad', 'No payment after 15 minutes. Start a new sale.'); return; }
    try {
      const sigs = await rpc('getSignaturesForAddress', [sale.reference, { limit: 1, commitment: 'confirmed' }]);
      if (sigs && sigs.length) {
        const sig = sigs[0].signature;
        if (!SIG_RE.test(String(sig))) throw new Error('unexpected RPC answer');
        const tx = await rpc('getTransaction', [sig, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]);
        const v = C.verifyPayment(tx, { recipient: sale.to, reference: sale.reference, splToken: sale.token.mint || undefined, expected: sale.expected });
        if (sale !== current) return;
        if (v.ok) {
          setStatus('ok', '✓ Paid');
          $('sigLine').replaceChildren(txLink(sig, sig.slice(0, 20) + '…'));
          const unit = Number(cfg.unit) > 0 ? Number(cfg.unit) : null;
          const entry = { t: Date.now(), amount: sale.amount, token: sale.token.label, note: sale.note, sig, feeLamports: String(v.fee), net: cfg.network, value: unit ? sale.amount * unit : null, to: sale.to, dept: sale.dept, walletId: sale.walletId, walletType: sale.walletType };
          ledger.push(entry); lastPaid = entry; $('receipt').hidden = false;
          store.set('ledger', ledger);
          if (navigator.vibrate) navigator.vibrate(120);
          return;
        }
        setStatus('bad', 'Payment found but not valid: ' + v.reasons.join('; '));
        return;
      }
    } catch (e) { setStatus('wait', 'Waiting… (network: ' + e.message + ')'); }
    timer = setTimeout(poll, 2000);
  }

  // ---- receipt for the buyer ----
  $('rcptQr').addEventListener('click', () => { if (!lastPaid) return; drawQR(explorer(lastPaid.sig)); setStatus('ok', '✓ Paid · receipt QR: the buyer scans it to keep the transaction'); });
  $('rcptCopy').addEventListener('click', async () => {
    if (!lastPaid) return;
    const text = C.receiptText({ shop: cfg.shop, amount: lastPaid.amount, token: lastPaid.token, sig: lastPaid.sig, at: lastPaid.t, network: lastPaid.net, dept: lastPaid.dept, note: lastPaid.note });
    $('sigLine').textContent = text; try { await navigator.clipboard.writeText(text); setStatus('ok', '✓ Paid · receipt copied'); } catch (e) { setStatus('ok', '✓ Paid · receipt shown below, copy it by hand'); }
  });

  // ---- ledger ----
  function renderLedger() {
    const only = $('deptFilter').value;
    const sales = ledger.filter((s) => s.net === cfg.network && (!only || s.to === only || (!s.to && only === cfg.recipient)));
    const now = Date.now();
    const today = sales.filter((x) => C.sameDay(x.t, now) && typeof x.value === 'number').map((x) => ({ amount: x.value, feeLamports: x.feeLamports }));
    const st = C.savings(today, { cardPct: cfg.pct, cardFixed: cfg.fixed, offrampPct: cfg.off });
    $('tKept').textContent = fmt(st.net);
    $('tLine').textContent = st.count ? `${st.count} sale${st.count > 1 ? 's' : ''} today · turnover ${fmt(st.volume)} · card acquiring would have cost ${fmt(st.cardCost)} at your terms (${st.mixRate.toFixed(2)}%).` : 'No confirmed sales today yet.';
    const valued = sales.filter((x) => typeof x.value === 'number').map((x) => ({ amount: x.value, feeLamports: x.feeLamports }));
    const s = C.savings(valued, { cardPct: cfg.pct, cardFixed: cfg.fixed, offrampPct: cfg.off });
    const raw = C.savings(sales.map((x) => ({ amount: 0, feeLamports: x.feeLamports })), { cardPct: 0, cardFixed: 0 });
    $('noCompare').hidden = valued.length > 0 || sales.length === 0;
    $('sCount').textContent = sales.length; $('sVolume').textContent = fmt(s.volume); $('sCard').textContent = fmt(s.cardCost);
    $('sOff').textContent = fmt(s.offramp); $('sNet').textContent = fmt(s.net); $('sMix').textContent = s.mixRate.toFixed(2) + '%';
    $('sLamports').textContent = raw.networkLamports.toString();
    const rows = $('rows'); rows.innerHTML = '';
    for (const x of sales.slice().reverse()) {
      const tr = document.createElement('tr');
      const d = new Date(x.t);
      const cells = [`${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, `${x.amount} ${x.token}`, (x.dept && wallets().length > 1 ? '[' + (x.walletId ? '#' + x.walletId + ' ' : '') + x.dept + '] ' : '') + (x.note || '')];
      for (const c of cells) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }
      const td = document.createElement('td'); td.appendChild(txLink(x.sig, String(x.sig).slice(0, 6) + '…')); tr.appendChild(td);
      const tdr = document.createElement('td'); const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'mini'; rb.textContent = '↩'; rb.title = 'Copy the refund note';
      rb.addEventListener('click', async () => { let note; try { note = C.refundNote(x.sig); } catch (e) { $('refundMsg').textContent = e.message; return; } $('refundMsg').textContent = 'Refund note for the memo in your wallet: ' + note; try { await navigator.clipboard.writeText(note); $('refundMsg').textContent = 'Copied. Paste it into the memo of the refund payment in your wallet: ' + note; } catch (e) { /* the note stays on screen to copy by hand */ } });
      tdr.appendChild(rb); tr.appendChild(tdr);
      rows.appendChild(tr);
    }
    // Head office view: every wallet of this counter, sales and amounts per token (all time, this network).
    const sum = C.walletSummary(ledger.filter((z) => z.net === cfg.network), wallets());
    const bw = $('byWallet'); bw.replaceChildren(); $('byWalletCard').hidden = sum.length === 0;
    for (const r of sum) {
      const tr = document.createElement('tr');
      for (const c of [C.walletTag(r), r.token, String(r.count), String(Math.round(r.amount * 1e6) / 1e6)]) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }
      bw.appendChild(tr);
    }
    drawCurve(s.count ? s.volume / s.count : 0);
    const T = Number(cfg.turnover);
    if (T > 0) {
      const e = C.acquiringEstimate(T, s.mixRate);
      $('estCard').hidden = false;
      $('estLine').textContent = `At ${fmt(T)} a month in card sales, acquiring typically costs ${fmt(e.low)}–${fmt(e.high)} a month (1.5–3%), ${fmt(e.low * 12)}–${fmt(e.high * 12)} a year.` + (e.mix !== null ? ` At the rate of your own ticket mix (${s.mixRate.toFixed(2)}%): ${fmt(e.mix)} a month.` : '') + ' Every share of sales paid by wallet keeps that share of the fee.';
    } else $('estCard').hidden = true;
  }
  function drawCurve(avg) {
    const svg = $('curve'), W = 320, H = 170, L = 34, B = 140, maxT = 200, maxR = 15;
    const x = (t) => L + (Math.log10(t) / Math.log10(maxT)) * (W - L - 8);
    const y = (r) => B - (Math.min(r, maxR) / maxR) * (B - 12);
    let d = ''; for (let t = 1; t <= maxT; t *= 1.08) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ',' + y(C.effectiveRate(t, cfg.pct, cfg.fixed)).toFixed(1);
    const ticks = [1, 5, 25, 100, 200].map((t) => `<text x="${x(t)}" y="${B + 16}" fill="#9aa6c2" font-size="10" text-anchor="middle">${t}</text>`).join('');
    const rt = [0, 5, 10, 15].map((r) => `<line x1="${L}" x2="${W - 8}" y1="${y(r)}" y2="${y(r)}" stroke="#24304a"/><text x="${L - 4}" y="${y(r) + 3}" fill="#9aa6c2" font-size="10" text-anchor="end">${r}%</text>`).join('');
    const dot = avg >= 1 ? `<circle cx="${x(Math.min(avg, maxT))}" cy="${y(C.effectiveRate(avg, cfg.pct, cfg.fixed))}" r="5" fill="#5eead4"/>` : '';
    svg.innerHTML = rt + `<path d="${d}" fill="none" stroke="#fbbf24" stroke-width="2.5"/>` + ticks + dot + `<text x="${W - 8}" y="${H - 2}" fill="#9aa6c2" font-size="10" text-anchor="end">ticket size</text>`;
  }
  $('deptFilter').addEventListener('change', renderLedger);
  $('period').addEventListener('change', () => { $('customRange').hidden = $('period').value !== 'custom'; });
  $('exportCsv').addEventListener('click', () => {
    let r; try { r = C.periodRange($('period').value, Date.now(), $('from').value, $('to').value); } catch (e) { $('exportMsg').textContent = e.message; return; }
    const only = $('deptFilter').value;
    const rows = ledger.filter((x) => C.inRange(x.t, r) && (!only || x.to === only));
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = 'time,network,wallet_id,wallet_type,wallet_name,receiving_address,amount,token,value_in_shop_currency,comment,signature,network_fee_lamports,card_fee_equivalent\n';
    const body = rows.map((x) => [new Date(x.t).toISOString(), x.net, x.walletId || 1, q(x.walletType || cfg.mainType || 'Main'), q(x.dept || cfg.mainLabel || 'Main'), x.to || cfg.recipient, x.amount, x.token, x.value == null ? '' : x.value.toFixed(2), q(x.note), x.sig, x.feeLamports, x.value == null ? '' : C.cardFee(x.value, cfg.pct, cfg.fixed).toFixed(4)].join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }));
    a.download = `wen-counter-${r.label}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    $('exportMsg').textContent = `${rows.length} sale${rows.length === 1 ? '' : 's'} exported (${r.label}).`;
  });
  $('clearLedger').addEventListener('click', () => { if (!unlocked) return; if (confirm('Clear the ledger on this device? Export it first if you need it.')) { ledger = []; store.set('ledger', ledger); renderLedger(); } });

  // ---- PWA ----
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  if (I) I.apply(document, cfg.lang || 'en');
  setLocked(true);
  loadSetup();
  if (!wallets().length) show('setup');
})();
