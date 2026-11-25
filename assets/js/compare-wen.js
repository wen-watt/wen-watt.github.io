/* Compare WEN: reads two Solana mints with one read-only RPC method (getAccountInfo,
   jsonParsed) and compares what the chain says. No prices, no wallet, no keys.
   Part of Wen Open Lab (Model 6, the mint inspector, in the browser). Apache-2.0. */
(function () {
  'use strict';
  var WEN = 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk';
  var SPL = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  var T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
  /* Free public mainnet endpoints that answer browser requests, tried in order.
     Only the two mint addresses are sent. Your own RPC in the field replaces this list. */
  var RPCS = [['PublicNode', 'https://solana-rpc.publicnode.com'], ['dRPC', 'https://solana.drpc.org'], ['Solana Foundation', 'https://api.mainnet-beta.solana.com']];
  var B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  var LABEL = {};

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function log(msg, kind) {
    var li = el('li', kind || '', msg);
    $('cw-log').appendChild(li);
  }

  function rpcOne(url, addr) {
    return fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [addr, { encoding: 'jsonParsed', commitment: 'confirmed' }] })
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { if (j.error) throw new Error('RPC error: ' + (j.error.message || 'unknown')); if (!j.result) throw new Error('empty answer'); return j.result; });
  }

  /* Try the endpoints in order; remember the first one that answers for the next read. */
  function rpc(list, addr) {
    var i = 0, errors = [];
    function next() {
      if (i >= list.length) return Promise.reject(new Error('No RPC answered (' + errors.join('; ') + ')'));
      var ep = list[i++];
      return rpcOne(ep[1], addr).then(function (res) {
        if (list.indexOf(ep) > 0 || !list.used) log('Node: ' + ep[0] + ' answered.', 'ok');
        list.splice(0, list.length, ep); list.used = true; return res;
      }, function (e) { errors.push(ep[0] + ': ' + e.message); log('Node: ' + ep[0] + ' did not answer (' + e.message + '), trying the next one.'); return next(); });
    }
    return next();
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

  /* What each row means, in plain words, with the image story that explains it (if there is one). */
  var EXPLAIN = {
    program: ['Which program created the token and keeps its rules. The original SPL Token is simple and cannot carry extensions; Token-2022 can carry extra rules inside the token.', 'wen-card-verified-1-spl-token.html'],
    decimals: ['How finely one token can be divided. 5 decimals means the smallest piece is 0.00001.', 'wns-china-wen-crypto.html'],
    supply: ['How many tokens exist right now, read from the mint. It is a count, not a price.', 'wen-coin-crypto-token-1.html'],
    mint: ['The mint authority is the key that can create new tokens. Revoked means the supply can never grow.', 'solana-memecoin-crypto-cat-wen.html'],
    freeze: ['The freeze authority can lock a holder\'s token account so it cannot send. Revoked means no one can freeze you.', 'elevate-wen-coin-start-2025.html'],
    ext: ['Extensions are extra rules written into a Token-2022 mint (fees, hooks, delegates, metadata). The original SPL Token has none.', 'spl-wns-rwa-token-2022-1.html'],
    fee: ['A transfer fee takes a share of every transfer for the issuer. It is separate from the small Solana network fee.', 'back-to-the-future.html'],
    delegate: ['A permanent delegate can move or burn tokens from any holder\'s account, with no permission from the holder.', 'testing-jup-wen-solana.html'],
    hook: ['A transfer hook runs a program on every transfer. WNS uses one for creator royalties; whoever holds the hook authority can change the rule later.', 'spl-wns-rwa-token-2022-2.html'],
    frozen: ['If new accounts start frozen, a new holder cannot use the token until the issuer approves (thaws) the account.', 'elevate-wen-coin-start-2025.html'],
    soul: ['A non-transferable (soulbound) token stays with its owner: good for receipts and badges, not for trading.', 'wns-wen-crypto.html'],
    close: ['The close authority can delete the mint account once the supply is zero.', ''],
    pause: ['A pausable token can have all transfers stopped by its pause authority.', ''],
    meta: ['Where the name, symbol and picture live. WNS keeps them inside the mint; classic tokens keep them in a separate account.', 'wns-sol-spl-token-2022.html']
  };

  var LABELS = [['program', 'Token program'], ['decimals', 'Decimals'], ['supply', 'Supply'], ['mint', 'Mint authority'], ['freeze', 'Freeze authority'],
    ['ext', 'Extensions'], ['fee', 'Transfer fee'], ['delegate', 'Permanent delegate'], ['hook', 'Transfer hook'], ['frozen', 'New accounts start frozen'],
    ['soul', 'Non-transferable'], ['close', 'Mint close authority'], ['pause', 'Pausable'], ['meta', 'Metadata']];

  var LIVE = {};
  var WIKI = {}; /* preset mint -> likely IQ.wiki ids (only a hint: a match still needs the mint address on the page) */

  /* IQ.wiki presence: read-only GraphQL queries to the public IQ.wiki API. */
  var IQ = 'https://api.iq.wiki/graphql';
  function iq(query, vars) {
    var ctl = window.AbortController ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return fetch(IQ, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: query, variables: vars }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return j && j.data ? j.data : {}; });
  }
  function iqWiki(id) {
    return iq('query($id:String!){wiki(id:$id){id title updated metadata{id value}}}', { id: id }).then(function (d) { return d.wiki || null; });
  }
  function iqSearch(q) {
    return iq('query($q:String!){search(query:$q){suggestions{id title}}}', { q: q })
      .then(function (d) { return (d.search && d.search.suggestions) || []; }, function () { return []; });
  }
  function slug(n) { return String(n || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function mentions(wk, addr) {
    return (wk.metadata || []).some(function (m) { return String(m.value || '').indexOf(addr) !== -1; });
  }
  /* Returns {state:'found'|'name'|'none'|'unreachable', id, title, updated}.
     'found' only when the page lists this exact mint address (or is WEN's known page). */
  function iqCheck(addr, name, knownId, hints) {
    var nm = String(name || '').trim(); var sn = slug(nm);
    var ids = [];
    function add(x) { x = slug(x); if (x && ids.indexOf(x) === -1) ids.push(x); }
    if (knownId) add(knownId);
    (hints || []).forEach(add);
    if (sn) { add(sn); add(sn + '-token'); add(sn + '-coin'); }
    var reached = false, byName = null, seen = {};
    function look(id) {
      if (seen[id]) return Promise.resolve(null); seen[id] = 1;
      return iqWiki(id).then(function (wk) {
        reached = true;
        if (!wk) return null;
        if ((knownId && wk.id === knownId) || mentions(wk, addr)) return wk;
        if (!byName && nm && (String(wk.title || '').toLowerCase() === nm.toLowerCase() || (hints || []).indexOf(wk.id) !== -1)) byName = wk;
        return null;
      }, function () { return null; });
    }
    function seq(list) {
      var c = Promise.resolve(null);
      list.forEach(function (id) { c = c.then(function (f) { return f || look(id); }); });
      return c;
    }
    return seq(ids).then(function (f) {
      if (f) return f;
      var qs = nm ? [nm, addr] : [addr];
      return Promise.all(qs.map(iqSearch)).then(function (lists) {
        var cand = [];
        lists.forEach(function (l) { l.slice(0, 6).forEach(function (x) { if (x && x.id && cand.indexOf(x.id) === -1) cand.push(x.id); }); });
        return seq(cand);
      });
    }).then(function (wk) {
      var hit = wk || byName;
      if (!hit) return reached ? { state: 'none' } : { state: 'unreachable' };
      return { state: wk ? 'found' : 'name', id: hit.id, title: hit.title, updated: String(hit.updated || '').slice(0, 10) };
    }, function () { return reached ? { state: 'none' } : { state: 'unreachable' }; });
  }
  function iqCell(r, addr, name, isWen) {
    var td = el('td');
    if (!r) { td.appendChild(el('span', 'n', 'Not checked.')); return td; }
    if (r.state === 'unreachable') {
      td.appendChild(el('span', 'v', 'Could not be checked from this browser'));
      td.appendChild(el('span', 'n', 'IQ.wiki did not answer. You can search it yourself: '));
      var s1 = el('a', '', 'search IQ.wiki'); s1.href = 'https://iq.wiki/search/' + encodeURIComponent(name || addr); s1.rel = 'nofollow noopener'; s1.target = '_blank'; td.lastChild.appendChild(s1);
      return td;
    }
    if (r.state === 'none') {
      td.appendChild(el('span', 'v', 'No page found'));
      td.appendChild(el('span', 'n', name ? 'Searched by the name \u201c' + name + '\u201d and by the address. This says nothing about the token itself.' : 'Searched by the address only (no name given). Type the token name above to search by name.'));
      return td;
    }
    td.appendChild(el('span', 'v', r.state === 'found' ? 'Page found: ' + r.title : 'Related page: ' + r.title));
    td.appendChild(el('span', 'n', (r.state === 'found' ? (isWen ? 'The wiki entry the almanac lists among its sources.' : 'The page lists this mint address.') : 'The page does not list this mint address, so it may describe a project or another token with this name.') + (r.updated ? ' Last edit ' + r.updated + '.' : '')));
    var a = el('a', '', 'iq.wiki/wiki/' + r.id);
    if (isWen) { a.href = 'sources.html#off-10'; } else { a.href = 'https://iq.wiki/wiki/' + encodeURIComponent(r.id); a.rel = 'nofollow noopener'; a.target = '_blank'; }
    var sp = el('span', 'n'); sp.appendChild(a); td.appendChild(sp);
    return td;
  }
  function almanac() {
    var n = document.getElementById('cw-almanac');
    try { return n ? JSON.parse(n.textContent) : []; } catch (e) { return []; }
  }

  /* Read the programs built around WEN (from the almanac record) and say if they are live code on mainnet. */
  function checkAround(list) {
    var rec = almanac().filter(function (x) { return x.live; });
    var chain = Promise.resolve();
    rec.forEach(function (x) {
      chain = chain.then(function () {
        if (LIVE[x.live]) return;
        return rpc(list, x.live).then(function (r) {
          var v = r && r.value;
          LIVE[x.live] = v && v.executable ? 'live on mainnet, executable (slot ' + (r.context && r.context.slot) + ')' : 'not found as a program';
          log('Around WEN · ' + x.t + ': ' + LIVE[x.live] + '.', v && v.executable ? 'ok' : 'bad');
        }, function () { LIVE[x.live] = 'could not be read now'; log('Around WEN · ' + x.t + ': could not be read now.', 'bad'); });
      });
    });
    return chain;
  }

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
      var th0 = el('th', '', L[1] + ' ');
      var ex = EXPLAIN[L[0]];
      if (ex) {
        var q = el('button', 'cw-q', 'What it means'); q.type = 'button'; q.setAttribute('aria-expanded', 'false');
        th0.appendChild(q);
        var er = el('tr', 'cw-explain'); er.hidden = true; var ec = el('td'); ec.colSpan = 3;
        ec.appendChild(el('span', '', ex[0] + ' '));
        if (ex[1]) { var sl = el('a', '', 'See the picture story \u2192'); sl.href = 'image-story/' + ex[1]; ec.appendChild(sl); }
        er.appendChild(ec);
        q.addEventListener('click', (function (row, btn) { return function () { row.hidden = !row.hidden; btn.setAttribute('aria-expanded', String(!row.hidden)); }; })(er, q));
      }
      tr.appendChild(th0);
      [a, b].forEach(function (c) {
        var td = el('td', c.power ? 'power' : ''); td.appendChild(el('span', 'v', c.v));
        if (c.note) td.appendChild(el('span', 'n', c.note));
        tr.appendChild(td);
      });
      tb.appendChild(tr);
      if (ex) tb.appendChild(er);
    });
    t.appendChild(tb); box.appendChild(t);
    if (w.iq || o.iq) {
      box.appendChild(el('h3', 'cw-h3', 'In the open crypto encyclopedia: IQ.wiki'));
      box.appendChild(el('p', 'cw-foot', 'Checked live with the public IQ.wiki API: is there a wiki page for the token? A page is a sign of public documentation, not of quality or value.'));
      var t3 = el('table', 'cw-table cw-iq'); var h3 = el('thead'); var r3 = el('tr');
      ['Encyclopedia', 'WEN', o.name || short(o.addr)].forEach(function (h) { r3.appendChild(el('th', '', h)); });
      h3.appendChild(r3); t3.appendChild(h3); var b3 = el('tbody'); var tr3 = el('tr');
      tr3.appendChild(el('th', '', 'Page on IQ.wiki'));
      tr3.appendChild(iqCell(w.iq, w.addr, 'Wen', true));
      tr3.appendChild(iqCell(o.iq, o.addr, o.name, false));
      b3.appendChild(tr3); t3.appendChild(b3); box.appendChild(t3);
    }
    var rec = almanac();
    if (rec.length) {
      box.appendChild(el('h3', 'cw-h3', 'Beyond the mint: what the Wen Almanac has recorded'));
      box.appendChild(el('p', 'cw-foot', 'Facts the chain alone cannot show, each from a page of the almanac with its source and status. For other tokens these rows say only that the almanac has no record: check their own sources before drawing conclusions.'));
      var t2 = el('table', 'cw-table cw-rec'); var h2 = el('thead'); var r2 = el('tr');
      ['From the Wen Almanac', 'WEN', o.name || short(o.addr)].forEach(function (h) { r2.appendChild(el('th', '', h)); });
      h2.appendChild(r2); t2.appendChild(h2); var b2 = el('tbody');
      rec.forEach(function (x, k) {
        var tr = el('tr'); tr.appendChild(el('th', '', (k + 1) + '. ' + x.t));
        var td = el('td'); td.appendChild(el('span', 'v', x.f));
        var meta = el('span', 'n', x.m + ' ');
        var st = el('span', 'cw-st ' + x.s, x.s === 'verified' ? 'verified' : 'reported'); meta.appendChild(st);
        if (x.live && LIVE[x.live]) { meta.appendChild(document.createTextNode(' ')); meta.appendChild(el('span', 'cw-st live', LIVE[x.live])); }
        td.appendChild(meta);
        var links = el('span', 'n');
        var a1 = el('a', '', 'Source in the almanac'); a1.href = x.src; links.appendChild(a1);
        if (x.story) { links.appendChild(document.createTextNode(' \u00b7 ')); var a2 = el('a', '', 'Picture story'); a2.href = 'image-story/' + x.story; links.appendChild(a2); }
        td.appendChild(links); tr.appendChild(td);
        tr.appendChild(el('td', 'cw-none', 'No record in the Wen Almanac'));
        b2.appendChild(tr);
      });
      t2.appendChild(b2); box.appendChild(t2);
    }
    box.appendChild(el('p', 'cw-foot', 'Read at slot ' + (w.slot || '?') + ' (WEN) and ' + (o.slot || '?') + ' (compared token) with one read-only request each. A key that can act is not good or bad by itself: stablecoins and regulated assets often need freeze or a permanent delegate by law. Compare the powers, then decide. Not financial advice.'));
  }

  function run() {
    var addr = $('cw-mint').value.trim(); var own = $('cw-rpc').value.trim();
    var list = own ? [['your RPC', own]] : RPCS.slice();
    $('cw-log').textContent = ''; $('cw-result').textContent = '';
    if (!B58.test(addr)) { log('Step 1 · This is not a Solana address. Paste a mint address (32 to 44 base58 characters).', 'bad'); return; }
    if (own && !/^https:\/\//.test(own)) { log('The RPC address must start with https://', 'bad'); return; }
    var btn = $('cw-run'); btn.disabled = true;
    var nmq = $('cw-name') && $('cw-name').value.trim() ? '&name=' + encodeURIComponent($('cw-name').value.trim()) : '';
    try { history.replaceState(null, '', '?mint=' + encodeURIComponent(addr) + nmq); } catch (e) {}
    log('Step 1 · Reading the WEN mint from Solana mainnet…');
    var w;
    rpc(list, WEN).then(function (r) {
      w = analyze(r, WEN); if (w.error) throw new Error('WEN: ' + w.error); if (!w.name) w.name = 'WEN';
      log('Step 1 · WEN read at slot ' + w.slot + ': ' + w.program + '.', 'ok');
      log('Step 2 · Reading the compared mint ' + short(addr) + '…');
      return rpc(list, addr);
    }).then(function (r) {
      var o = analyze(r, addr);
      if (o.error) { log('Step 2 · ' + o.error, 'bad'); return; }
      if (!o.name && LABEL[addr]) o.name = LABEL[addr];
      var typed = $('cw-name') ? $('cw-name').value.trim().slice(0, 60) : '';
      if (typed) o.name = typed;
      log('Step 2 · Read at slot ' + o.slot + ': ' + o.program + (o.name ? ', ' + o.name : '') + '.', 'ok');
      log('Step 3 · Checking the programs built around WEN (WNS and its royalty transfer hook)…');
      return checkAround(list).then(function () {
        log('Step 4 · Looking for wiki pages on IQ.wiki…');
        return Promise.all([iqCheck(WEN, 'Wen', 'wen'), iqCheck(addr, o.name, '', WIKI[addr] ? WIKI[addr].split(',') : [])]).then(function (rr) {
          w.iq = rr[0]; o.iq = rr[1];
          var say = function (r) { return r.state === 'found' ? 'page found (' + r.id + ')' : r.state === 'name' ? 'related page, address not on it (' + r.id + ')' : r.state === 'none' ? 'no page found' : 'IQ.wiki did not answer'; };
          log('Step 4 · IQ.wiki: WEN ' + say(w.iq) + '; compared token ' + say(o.iq) + '.', rr[0].state === 'unreachable' ? 'bad' : 'ok');
        });
      }).then(function () {
        log('Step 5 · Comparing ' + LABELS.length + ' on-chain properties and ' + almanac().length + ' almanac facts: ' + w.powers.length + ' active key(s) on WEN, ' + o.powers.length + ' on the compared token.', 'ok');
        render(w, o);
      });
    }).catch(function (e) {
      log(String(e && e.message || e) + '. Public nodes can be busy: try again in a minute, or paste your own RPC address.', 'bad');
    }).then(function () { btn.disabled = false; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('cw-run')) return;
    $('cw-run').addEventListener('click', run);
    $('cw-mint').addEventListener('input', function () { if ($('cw-name')) $('cw-name').value = ''; });
    $('cw-mint').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    Array.prototype.forEach.call(document.querySelectorAll('.cw-preset'), function (b) {
      LABEL[b.getAttribute('data-mint')] = b.textContent;
      if (b.getAttribute('data-wiki')) WIKI[b.getAttribute('data-mint')] = b.getAttribute('data-wiki');
      b.addEventListener('click', function () { $('cw-mint').value = b.getAttribute('data-mint'); if ($('cw-name')) $('cw-name').value = b.textContent; run(); });
    });
    $('cw-copy').addEventListener('click', function () {
      var u = location.origin + location.pathname + '?mint=' + encodeURIComponent($('cw-mint').value.trim()) + ($('cw-name') && $('cw-name').value.trim() ? '&name=' + encodeURIComponent($('cw-name').value.trim()) : '');
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { $('cw-copy').textContent = 'Link copied'; });
    });
    var qn = new URLSearchParams(location.search).get('name');
    if (qn && $('cw-name')) $('cw-name').value = qn.slice(0, 60);
    var q = new URLSearchParams(location.search).get('mint');
    if (q && B58.test(q)) { $('cw-mint').value = q; run(); }
  });

  window.__compareWen = { analyze: analyze, fmtSupply: fmtSupply };
})();
