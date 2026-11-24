/* Wen Counter Pay · order received page: draws the Solana Pay QR and asks the shop server for the status.
 * The server checks the chain (read-only); this script never talks to a wallet and holds no keys. Apache-2.0. */
(function () {
  'use strict';
  var o = window.WCP_ORDER; if (!o || !o.url) return;
  var box = document.getElementById('wcp-qr'), status = document.getElementById('wcp-status');
  try { var q = qrcode(0, 'M'); q.addData(o.url); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 4, scalable: true }); } catch (e) { box.textContent = ''; }
  var tries = 0, done = false;
  function say(cls, text) { status.className = 'wcp-status ' + cls; status.textContent = text; }
  function tick() {
    if (done) return; tries++;
    var u = o.check + (o.check.indexOf('?') < 0 ? '?' : '&') + 'order=' + encodeURIComponent(o.order) + '&key=' + encodeURIComponent(o.key);
    fetch(u, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.status === 'paid') {
          done = true; say('wcp-ok', '✓ Paid. Confirmed on-chain.');
          if (d.tx && /^https:\/\/explorer\.solana\.com\/tx\//.test(d.tx)) { var a = document.createElement('a'); a.href = d.tx; a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' View the transaction'; status.appendChild(a); }
          box.style.opacity = '0.35'; return;
        }
        if (d && d.status === 'mismatch') say('wcp-warn', 'A payment was found but did not match this order. The shop will check it.');
        schedule();
      })
      .catch(schedule);
  }
  function schedule() { if (!done) setTimeout(tick, tries < 60 ? 3000 : 10000); }
  setTimeout(tick, 2000);
})();
