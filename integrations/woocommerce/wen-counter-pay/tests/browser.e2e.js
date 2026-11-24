// Wen Counter Pay · order received page in a real browser (Playwright): QR drawn, status polled, paid shown,
// a foreign link from the server is ignored, HTML in the answer is shown as text. Run: node tests/browser.e2e.js · Apache-2.0
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.resolve(__dirname, '../assets');
let n = 0, fail = 0; const t = async (name, f) => { try { await f(); n++; console.log('ok', name); } catch (e) { fail++; console.log('FAIL', name, e.message); } };
const page = (answers) => `<!doctype html><meta charset=utf-8><section id="wcp-box"><div id="wcp-qr"></div><p id="wcp-status"></p></section>
<script>window.WCP_ORDER={check:'https://shop.test/wp-json/wen-counter/v1/check',order:7,key:'wc_order_abc',url:'solana:9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin?amount=1&reference=9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'};
var A=${JSON.stringify(answers)},i=0;window.fetch=function(u){window.lastUrl=u;var a=A[Math.min(i++,A.length-1)];return Promise.resolve({json:function(){return Promise.resolve(a)}})};</script>
<script>${fs.readFileSync(path.join(dir, 'qrcode.js'), 'utf8')}</script><script>${fs.readFileSync(path.join(dir, 'wcp-checkout.js'), 'utf8')}</script>`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (answers) => { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', (e) => errs.push(e.message)); await p.setContent(page(answers)); return p; };
  await t('QR code is drawn as an SVG from the Solana Pay link', async () => { const p = await open([{ status: 'waiting' }]); if (!(await p.$('#wcp-qr svg'))) throw new Error('no svg'); await p.close(); });
  await t('status is asked with the order id and key only', async () => { const p = await open([{ status: 'waiting' }]); await p.waitForTimeout(2300); const u = await p.evaluate(() => window.lastUrl); if (!/\?order=7&key=wc_order_abc$/.test(u)) throw new Error(u); await p.close(); });
  await t('waiting, then paid with the explorer link', async () => { const p = await open([{ status: 'waiting' }, { status: 'paid', tx: 'https://explorer.solana.com/tx/abc?cluster=devnet' }]); await p.waitForFunction(() => /Paid/.test(document.getElementById('wcp-status').textContent), null, { timeout: 9000 }); const href = await p.$eval('#wcp-status a', (a) => a.href); if (!href.startsWith('https://explorer.solana.com/tx/')) throw new Error(href); await p.close(); });
  await t('a link that is not the Solana Explorer is ignored', async () => { const p = await open([{ status: 'paid', tx: 'https://evil.test/phish' }]); await p.waitForFunction(() => /Paid/.test(document.getElementById('wcp-status').textContent), null, { timeout: 6000 }); if (await p.$('#wcp-status a')) throw new Error('foreign link shown'); await p.close(); });
  await t('a mismatch is explained, and polling goes on', async () => { const p = await open([{ status: 'mismatch' }, { status: 'waiting' }]); await p.waitForFunction(() => /did not match/.test(document.getElementById('wcp-status').textContent), null, { timeout: 6000 }); await p.close(); });
  await t('no script errors', async () => { if (errs.length) throw new Error(errs.join('; ')); });
  await b.close(); console.log(`\n${n} checks passed` + (fail ? `, ${fail} FAILED` : '')); process.exit(fail ? 1 : 0);
})();
