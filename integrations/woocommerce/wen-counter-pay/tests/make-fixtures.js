// Builds parity fixtures from the WCP-1 JavaScript core (lab/counter/counter-core.js).
// Run from the repository root: node integrations/woocommerce/wen-counter-pay/tests/make-fixtures.js · Apache-2.0
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const C = require(path.resolve(__dirname, '../../../../lab/counter/counter-core.js'));
const rnd = (n) => crypto.randomBytes(n);
const b58 = []; for (let i = 0; i < 60; i++) { const len = [32, 64, 1, 5][i % 4]; const b = rnd(len); if (i % 7 === 0) { b[0] = 0; b[1] = 0; } b58.push({ hex: b.toString('hex'), b58: C.b58encode(b) }); }
const addr = () => C.b58encode(rnd(32));
const shop = addr(), ref = addr(), payer = addr(), USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', WEN = 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk';
const urls = [
  { recipient: shop, amount: '12.5', splToken: USDC, reference: ref, label: 'Rose & Co', message: '2 roses · table 5', memo: 'order:42' },
  { recipient: shop, amount: '0.000001', splToken: null, reference: ref, label: "O'Brien (shop)!", message: '', memo: 'order:7 · SKU-42*' },
  { recipient: shop, amount: '100', splToken: WEN, reference: ref, label: 'Магазин 中文 한국어', message: 'a+b=c / ?&#', memo: '' },
].map((u) => ({ in: u, out: C.buildPayURL(u) }));
const memos = [['42', ''], ['k1', 'SKU-42 red roses'], ['9', 'line\nbreak\ttab   spaces'], ['77', 'x'.repeat(200)], ['5', 'Роза · 玫瑰 · 장미 '.repeat(8)]].map(([o, c]) => ({ order: o, comment: c, out: C.buildMemo(o, c) }));
const units = [['24.99', 6], ['1', 9], ['0.000001', 6], ['100', 5], ['123456789.123456', 6]].map(([a, d]) => ({ amount: a, decimals: d, out: String(C.toBaseUnits(a, d)) }));
const solTx = (delta, withRef = true, err = null) => ({ meta: { err, fee: 5000, preBalances: [2e9, 1e9, 1], postBalances: [2e9 - delta - 5000, 1e9 + delta, 1], preTokenBalances: [], postTokenBalances: [] }, transaction: { message: { accountKeys: [{ pubkey: payer }, { pubkey: shop }, { pubkey: withRef ? ref : payer }] } } });
const splTx = (pre, post, mint = USDC) => ({ meta: { err: null, fee: 5000, preBalances: [], postBalances: [], preTokenBalances: [{ owner: shop, mint, uiTokenAmount: { amount: String(pre) } }], postTokenBalances: [{ owner: shop, mint, uiTokenAmount: { amount: String(post) } }] }, transaction: { message: { accountKeys: [payer, shop, ref] } } });
const newAcc = splTx(0, 3000000); newAcc.meta.preTokenBalances = [];
const cases = [
  ['SOL ok', solTx(500000000), null, '500000000'], ['SOL underpaid', solTx(400000000), null, '500000000'], ['missing reference', solTx(500000000, false), null, '500000000'],
  ['failed tx', solTx(500000000, true, { InstructionError: [0, 'x'] }), null, '1'], ['SPL ok', splTx(0, 12500000), USDC, '12500000'], ['SPL wrong mint', splTx(0, 12500000, WEN), USDC, '12500000'],
  ['SPL new account', newAcc, USDC, '3000000'], ['SPL overpaid', splTx(1000, 20001000), USDC, '20000000'], ['SPL balance went down', splTx(5000000, 1000000), USDC, '1'], ['not found', null, USDC, '1'],
].map(([name, tx, mint, expected]) => { const r = C.verifyPayment(tx, { recipient: shop, reference: ref, splToken: mint, expected: BigInt(expected) }); return { name, tx, mint, expected, ok: r.ok, received: String(r.received), fee: String(r.fee) }; });
fs.writeFileSync(path.join(__dirname, 'fixtures.json'), JSON.stringify({ shop, ref, b58, urls, memos, units, cases }, null, 1));
console.log('fixtures written:', b58.length, 'base58,', urls.length, 'urls,', memos.length, 'memos,', units.length, 'units,', cases.length, 'transactions');
