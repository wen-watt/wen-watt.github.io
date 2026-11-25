/* Compare WEN: reads two Solana mints with one read-only RPC method (getAccountInfo,
   jsonParsed) and compares what the chain says. No prices, no wallet, no keys.
   Part of Wen Open Lab (Model 6, the mint inspector, in the browser). Apache-2.0. */
(function () {
  'use strict';
  var WEN = 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk';
  var SPL = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  var T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
  var DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
  var B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  var LABEL = {};

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function log(msg, kind) {
    var li = el('li', kind || '', msg);
    $('cw-log').appendChild(li);
  }

  function rpc(url, addr) {
    return fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [addr, { encoding: 'jsonParsed', commitment: 'confirmed' }] })
    }).then(function (r) { if (!r.ok) throw new Error('RPC answered HTTP ' + r.status); return r.json(); })
      .then(function (j) { if (j.error) throw new Error('RPC error: ' + (j.error.message || 'unknown')); return j.result; });
  }

  function fmtSupply(raw, dec) {
    try {
      var s = BigInt(raw).toString(); dec = dec | 0;
      var whole = dec ? (s.length > dec ? s.slice(0, s.length - dec) : '0') : s;
      var frac = dec ? s.padStart(dec + 1, '0').slice(-dec).replace(/0+$/, '') : '';
      whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return frac ? whole + '.' + frac.slice(0, 4) + (frac.length > 4 ? '…' : '') : whole;
    } catch (e) { return String(raw); }
  }

  function short(a) { return a && a.length > 12 ? a.slice(0, 4) + '…' + a.slice(-4) : String(a); }

  /* Turn one getAccountInfo result into rows. power = a key that can still act on holders' tokens or the token itself. */
  function analyze(res, addr) {
    var v = res && res.value;
    if (!v) return { error: 'No account at this address on mainnet. Check the address.' };
    if (v.owner !== SPL && v.owner !== T22) return { error: 'Not a token mint: this address belongs to program ' + short(v.owner) + '. A wallet address is refused, not misread.' };
    var p = v.data && v.data.parsed;
    if (!p || p.type !== 'mint') return { error: 'This is a token account, not a mint. Paste the mint address of the token.' };
    var i = p.info || {}; var ext = i.extensions || [];
    var out = { addr: addr, slot: res.context && res.context.slot, program: v.owner === T22 ? 'Token-2022' : 'SPL Token (original)', rows: {}, powers: [], name: '' };
    var R = out.rows;
    R.program = { v: out.program, note: v.owner === T22 ? 'Token-2022 can carry extensions: extra rules written into the token itself.' : 'The original program cannot carry extensions, so no fee or hook can exist on this token.' };
    R.decimals = { v: String(i.decimals) };
    R.supply = { v: fmtSupply(i.supply, i.decimals), note: 'Total tokens that exist now (not a price).' };
    R.mint = i.mintAuthority ? { v: 'Present: ' + short(i.mintAuthority), power: true, note: 'This key can create new tokens.' } : { v: 'Revoked', note: 'No one can create new tokens.' };
    R.freeze = i.freezeAuthority ? { v: 'Present: ' + short(i.freezeAuthority), power: true, note: 'This key can freeze a holder\'s token account.' } : { v: 'Revoked', note: 'No one can freeze holders.' };
    R.ext = { v: ext.length ? ext.length + ': ' + ext.map(function (e) { return e.extension; }).join(', ') : 'None' };
    function E(name) { for (var k = 0; k < ext.length; k++) if (ext[k].extension === name) return ext[k].state || {}; return null; }
    var x;
    if ((x = E('transferFeeConfig'))) {
      var f = x.newerTransferFee || x.olderTransferFee || {}; var bps = +f.transferFeeBasisPoints || 0;
      R.fee = { v: (bps / 100) + '% per transfer' + (f.maximumFee ? ', max ' + f.maximumFee + ' base units' : ''), power: bps > 0 || !!x.transferFeeConfigAuthority,
        note: x.transferFeeConfigAuthority ? 'Fee can be changed by ' + short(x.transferFeeConfigAuthority) + '.' : 'Fee rule cannot be changed.' };
    } else R.fee = { v: 'None', note: 'Transfers carry no token fee (the Solana network fee is separate).' };
    if ((x = E('permanentDelegate')) && x.delegate) R.delegate = { v: 'Present: ' + short(x.delegate), power: true, note: 'This key can move or burn tokens from ANY holder. Normal for some regulated assets; know it before you hold.' };
    else R.delegate = { v: 'None' };
    if ((x = E('transferHook')) && x.programId) R.hook = { v: 'Program ' + short(x.programId), power: !!x.authority, note: 'Runs on every transfer. ' + (x.authority ? 'Can be changed by ' + short(x.authority) + '.' : 'Cannot be changed.') };
    else R.hook = { v: 'None' };
    if ((x = E('defaultAccountState')) && x.accountState === 'frozen') R.frozen = { v: 'Frozen by default', power: true, note: 'New holders start frozen until the issuer thaws them.' };
    else R.frozen = { v: 'No' };
    if (E('nonTransferable')) R.soul = { v: 'Yes (soulbound)', note: 'The token cannot be sent on.' }; else R.soul = { v: 'No' };
    if ((x = E('mintCloseAuthority')) && x.closeAuthority) R.close = { v: 'Present: ' + short(x.closeAuthority), power: true, note: 'This key can close the mint when supply is zero.' }; else R.close = { v: 'None' };
    if ((x = E('pausableConfig'))) R.pause = { v: x.paused ? 'Paused now' : 'Pausable', power: !!x.authority, note: x.authority ? 'Transfers can be paused by ' + short(x.authority) + '.' : '' }; else R.pause = { v: 'No' };
    if ((x = E('tokenMetadata'))) { out.name = [x.name, x.symbol].filter(Boolean).join(' · '); R.meta = { v: 'In the mint' + (x.updateAuthority ? ', editable by ' + short(x.updateAuthority) : ', fixed') }; }
    else R.meta = { v: v.owner === T22 && E('metadataPointer') ? 'Pointer to ' + short((E('metadataPointer') || {}).metadataAddress) : 'Kept outside the mint' };
    Object.keys(R).forEach(function (k) { if (R[k].power) out.powers.push(k); });
    return out;
  }

  var LABELS = [['program', 'Token program'], ['decimals', 'Decimals'], ['supply', 'Supply'], ['mint', 'Mint authority'], ['freeze', 'Freeze authority'],
    ['ext', 'Extensions'], ['fee', 'Transfer fee'], ['delegate', 'Permanent delegate'], ['hook', 'Transfer hook'], ['frozen', 'New accounts start frozen'],
    ['soul', 'Non-transferable'], ['close', 'Mint close authority'], ['pause', 'Pausable'], ['meta', 'Metadata']];

  function card(title, a) {
    var c = el('div', 'cw-card');
    c.appendChild(el('p', 'cw-card-k', title));
    c.appendChild(el('p', 'cw-card-n', a.name || short(a.addr)));
    c.appendChild(el('p', 'cw-card-p', a.program));
    var n = a.powers.length;
    c.appendChild(el('p', 'cw-card-s ' + (n ? 'has' : 'none'), n ? n + ' key' + (n > 1 ? 's' : '') + ' can still act on this token' : 'No key can change this token or touch holders'));
    var addr = el('code', 'cw-addr', a.addr); c.appendChild(addr);
    return c;
  }

  function render(w, o) {
    var box = $('cw-result'); box.textContent = '';
    var head = el('div', 'cw-cards'); head.appendChild(card('WEN', w)); head.appendChild(card('Compared token', o)); box.appendChild(head);
    var t = el('table', 'cw-table'); var th = el('thead'); var hr = el('tr');
    ['What the chain says', 'WEN', o.name || short(o.addr)].forEach(function (h) { hr.appendChild(el('th', '', h)); });
    th.appendChild(hr); t.appendChild(th); var tb = el('tbody');
    LABELS.forEach(function (L) {
      var a = w.rows[L[0]] || { v: '—' }, b = o.rows[L[0]] || { v: '—' };
      var tr = el('tr', a.v !== b.v ? 'diff' : '');
      tr.appendChild(el('th', '', L[1]));
      [a, b].forEach(function (c) {
        var td = el('td', c.power ? 'power' : ''); td.appendChild(el('span', 'v', c.v));
        if (c.note) td.appendChild(el('span', 'n', c.note));
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb); box.appendChild(t);
    box.appendChild(el('p', 'cw-foot', 'Read at slot ' + (w.slot || '?') + ' (WEN) and ' + (o.slot || '?') + ' (compared token) with one read-only request each. A key that can act is not good or bad by itself: stablecoins and regulated assets often need freeze or a permanent delegate by law. Compare the powers, then decide. Not financial advice.'));
  }

  function run() {
    var addr = $('cw-mint').value.trim(); var url = ($('cw-rpc').value.trim() || DEFAULT_RPC);
    $('cw-log').textContent = ''; $('cw-result').textContent = '';
    if (!B58.test(addr)) { log('Step 1 · This is not a Solana address. Paste a mint address (32 to 44 base58 characters).', 'bad'); return; }
    if (!/^https:\/\//.test(url)) { log('The RPC address must start with https://', 'bad'); return; }
    var btn = $('cw-run'); btn.disabled = true;
    try { history.replaceState(null, '', '?mint=' + encodeURIComponent(addr)); } catch (e) {}
    log('Step 1 · Reading the WEN mint from Solana mainnet…');
    var w;
    rpc(url, WEN).then(function (r) {
      w = analyze(r, WEN); if (w.error) throw new Error('WEN: ' + w.error); if (!w.name) w.name = 'WEN';
      log('Step 1 · WEN read at slot ' + w.slot + ': ' + w.program + '.', 'ok');
      log('Step 2 · Reading the compared mint ' + short(addr) + '…');
      return rpc(url, addr);
    }).then(function (r) {
      var o = analyze(r, addr);
      if (o.error) { log('Step 2 · ' + o.error, 'bad'); return; }
      if (!o.name && LABEL[addr]) o.name = LABEL[addr];
      log('Step 2 · Read at slot ' + o.slot + ': ' + o.program + (o.name ? ', ' + o.name : '') + '.', 'ok');
      log('Step 3 · Comparing ' + LABELS.length + ' properties: ' + w.powers.length + ' active key(s) on WEN, ' + o.powers.length + ' on the compared token.', 'ok');
      render(w, o);
    }).catch(function (e) {
      log(String(e && e.message || e) + '. Public RPC can be busy: try again, or paste your own RPC address.', 'bad');
    }).then(function () { btn.disabled = false; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('cw-run')) return;
    $('cw-run').addEventListener('click', run);
    $('cw-mint').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    Array.prototype.forEach.call(document.querySelectorAll('.cw-preset'), function (b) {
      LABEL[b.getAttribute('data-mint')] = b.textContent;
      b.addEventListener('click', function () { $('cw-mint').value = b.getAttribute('data-mint'); run(); });
    });
    $('cw-copy').addEventListener('click', function () {
      var u = location.origin + location.pathname + '?mint=' + encodeURIComponent($('cw-mint').value.trim());
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { $('cw-copy').textContent = 'Link copied'; });
    });
    var q = new URLSearchParams(location.search).get('mint');
    if (q && B58.test(q)) { $('cw-mint').value = q; run(); }
  });

  window.__compareWen = { analyze: analyze, fmtSupply: fmtSupply };
})();
