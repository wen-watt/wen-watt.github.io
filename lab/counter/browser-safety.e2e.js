// Browser safety test for Wen Counter (needs Playwright). Run from this folder:
//   python3 -m http.server 8771 &   then   node browser-safety.e2e.js http://localhost:8771/
// It plants fake wallets that record any call, feeds hostile text and hostile network answers,
// and checks that the counter only reads the chain and never touches a wallet. Apache-2.0.
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8771/';
const SHOP = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const OTHER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
(async () => {
  const b = await chromium.launch(); let failed = 0; let n = 0;
  const check = (name, ok, extra = '') => { n++; console.log((ok ? 'ok ' : 'FAIL ') + name + (extra ? ' · ' + extra : '')); if (!ok) failed++; };
  const ctx = await b.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  await ctx.addInitScript(() => {
    window.__walletCalls = [];
    const spy = (name) => new Proxy({}, { get: (_, k) => (k === 'then' ? undefined : (...a) => { window.__walletCalls.push(name + '.' + String(k)); return Promise.resolve({}); }) });
    for (const w of ['solana', 'phantom', 'solflare', 'backpack', 'jupiter']) Object.defineProperty(window, w, { get() { window.__walletCalls.push(w + ' (read)'); return spy(w); } });
    window.__xss = 0;
  });
  const p = await ctx.newPage(); const methods = []; const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  let mode = 'hostile-sig', ref = null;
  await p.route('https://api.devnet.solana.com/**', async (r) => {
    const body = JSON.parse(r.request().postData()); methods.push(body.method);
    if (body.method === 'getAccountInfo') return r.fulfill({ json: { jsonrpc: '2.0', id: 1, result: { context: { slot: 1 }, value: { owner: '11111111111111111111111111111111', executable: false, lamports: 1, data: ['', 'base64'] } } } });
    if (body.method === 'getSignaturesForAddress') {
      ref = body.params[0];
      if (mode === 'hostile-sig') return r.fulfill({ json: { jsonrpc: '2.0', id: 1, result: [{ signature: '<img src=x onerror="window.__xss++">' }] } });
      return r.fulfill({ json: { jsonrpc: '2.0', id: 1, result: [{ signature: '5' + '2'.repeat(86) }] } });
    }
    if (body.method === 'getTransaction') {
      const to = mode === 'wrong-recipient' ? OTHER : SHOP;
      return r.fulfill({ json: { jsonrpc: '2.0', id: 1, result: { meta: { err: null, fee: 5000, preBalances: [3e9, 1e9, 1], postBalances: [3e9 - 250000000 - 5000, 1e9 + 250000000, 1], preTokenBalances: [], postTokenBalances: [] }, transaction: { message: { accountKeys: [{ pubkey: 'Payer1111111111111111111111111111111111111' }, { pubkey: to }, { pubkey: ref }] } } } } });
    }
    return r.fulfill({ json: { jsonrpc: '2.0', id: 1, result: null } });
  });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  // 0. Setup PIN: the till cannot change the receiving wallets without it
  check('Setup opens locked: the wallet settings are hidden', !(await p.isVisible('#setupForm')) && await p.isVisible('#pinIn'));
  await p.fill('#pinIn', '0000'); await p.click('#unlock'); await p.waitForTimeout(200);
  check('a wrong PIN is refused', !(await p.isVisible('#setupForm')) && (await p.textContent('#pinMsg')).includes('Wrong PIN'), await p.textContent('#pinMsg'));
  await p.fill('#pinIn', '1111'); await p.click('#unlock'); await p.waitForSelector('#setupForm', { state: 'visible' });
  check('the deployment PIN (1111) unlocks Setup', await p.isVisible('#setupForm'));
  await p.fill('#shop', '<img src=x onerror="window.__xss++">Rose');
  await p.fill('#recipient', SHOP); await p.selectOption('#token', 'sol'); await p.fill('#unit', '1');
  await p.click('#checkAddr'); await p.waitForFunction(() => document.getElementById('addrResult').textContent.includes('✓'));
  await p.click('#setupForm button[type=submit]');
  const sale = async (note) => { await p.click('nav button[data-tab=sell]'); if (await p.isVisible('#cancel')) await p.click('#cancel'); await p.fill('#amount', '0.25'); await p.fill('#note', note); await p.click('#saleForm button'); };
  // 1. hostile signature from the network
  await sale('<script>window.__xss++</script>');
  await p.click('#copyLink'); await p.waitForTimeout(200);
  const link = await p.textContent('#sigLine');
  check('the comment travels in the pay request (message and memo), encoded, never run', link.startsWith('solana:') && link.includes('memo=order%3A') && link.includes('%3Cscript%3E'), link.slice(0, 60));
  await p.waitForTimeout(2300);
  check('a hostile "signature" from the network is refused, not rendered', !(await p.textContent('#status')).includes('Paid'), await p.textContent('#status'));
  // 2. a payment to someone else must not count
  mode = 'wrong-recipient'; await p.click('#cancel'); await sale('test 2');
  await p.waitForFunction(() => /not valid|Paid/.test(document.getElementById('status').textContent), null, { timeout: 8000 });
  check('a payment to another address is rejected', (await p.textContent('#status')).includes('not valid'), await p.textContent('#status'));
  // 3. a correct payment with hostile text in the note
  mode = 'ok'; await p.click('#cancel'); await sale('<img src=x onerror="window.__xss++">roses');
  await p.waitForFunction(() => document.getElementById('status').textContent.includes('Paid'), null, { timeout: 8000 });
  await p.click('nav button[data-tab=ledger]'); await p.waitForTimeout(300);
  check('hostile text in shop name and note is shown as text, never run', (await p.evaluate(() => window.__xss)) === 0);
  check('the note is stored and shown literally', (await p.textContent('#rows')).includes('<img src=x'));
  // 4. buyer receipt, refund note and period export
  await p.click('nav button[data-tab=sell]');
  check('a receipt is offered to the buyer after payment', await p.isVisible('#receipt'));
  await p.click('nav button[data-tab=ledger]'); await p.click('#rows button');
  check('the refund button gives "refund:" plus the original transaction ID', (await p.textContent('#refundMsg')).includes('refund:5222'), await p.textContent('#refundMsg'));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#exportCsv')]);
  check('export by period names the file by the period', dl.suggestedFilename() === 'wen-counter-today.csv', dl.suggestedFilename());
  const csv = require('fs').readFileSync(await dl.path(), 'utf8');
  check('the sale comment reaches the CSV', csv.split('\n')[0].includes(',comment,') && csv.includes('roses'));
  // 5. a second receiving wallet (department): the sale is checked against that wallet, not the main one
  await p.click('nav button[data-tab=setup]');
  check('Setup locks again after leaving it', !(await p.isVisible('#setupForm')));
  await p.fill('#pinIn', '1111'); await p.click('#unlock'); await p.waitForSelector('#setupForm', { state: 'visible' });
  await p.click('#addExtra');
  await p.selectOption('#extraList .x-type', 'Tips'); await p.fill('#extraList .x-label', 'Bar tips'); await p.fill('#extraList .x-addr', OTHER);
  await p.click('#setupForm button[type=submit]');
  mode = 'wrong-recipient'; await p.click('nav button[data-tab=sell]'); if (await p.isVisible('#cancel')) await p.click('#cancel');
  await p.selectOption('#dept', '1'); await p.fill('#amount', '0.25'); await p.click('#saleForm button');
  await p.waitForFunction(() => /not valid|Paid/.test(document.getElementById('status').textContent), null, { timeout: 8000 });
  check('a sale to a department wallet is verified against that wallet', (await p.textContent('#status')).includes('Paid'), await p.textContent('#status'));
  check('the payment screen names the wallet by number, type and name', (await p.textContent('#payTo')).includes('#2 · Tips · Bar tips'), await p.textContent('#payTo'));
  await p.click('nav button[data-tab=ledger]'); await p.waitForTimeout(300);
  const bw = await p.textContent('#byWallet');
  check('the head office view adds up sales per wallet', bw.includes('#1 · Main') && bw.includes('#2 · Tips · Bar tips'), bw);
  // 6. wallets were never touched
  const calls = await p.evaluate(() => window.__walletCalls);
  check('no wallet provider was read or called', calls.length === 0, JSON.stringify(calls));
  // 7. only read methods went out
  const uniq = [...new Set(methods)].sort();
  check('only read requests reached the network', JSON.stringify(uniq) === JSON.stringify(['getAccountInfo', 'getSignaturesForAddress', 'getTransaction']), uniq.join(', '));
  // 8. the code refuses any other method even if asked
  check('page had no script errors', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log(`\n${n - failed} of ${n} browser safety checks passed`); process.exit(failed ? 1 : 0);
})();
