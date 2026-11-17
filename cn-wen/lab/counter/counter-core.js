/* Wen Counter · core (Model 7 of the Wen Open Lab) · Wen Counter Protocol 1.0 (WCP-1)
 * A browser-only point of sale on Solana Pay: no server, no app store, no card data.
 * Pure functions only, so they can be tested in Node and reused in any shop.
 * License: Apache-2.0. Example code, not audited. Devnet first.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WenCounterCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const MAP = {}; for (let i = 0; i < ALPHABET.length; i++) MAP[ALPHABET[i]] = i;

  /** Base58 encode a Uint8Array. */
  function b58encode(bytes) {
    let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
    let out = ''; while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
    return '1'.repeat(zeros) + out;
  }

  /** Base58 decode to Uint8Array, or null if the string is not base58. */
  function b58decode(str) {
    if (typeof str !== 'string' || !str.length) return null;
    let n = 0n;
    for (const c of str) { if (!(c in MAP)) return null; n = n * 58n + BigInt(MAP[c]); }
    const bytes = []; while (n > 0n) { bytes.unshift(Number(n % 256n)); n /= 256n; }
    let zeros = 0; while (zeros < str.length && str[zeros] === '1') zeros++;
    return Uint8Array.from([...new Array(zeros).fill(0), ...bytes]);
  }

  /** A Solana address is 32 bytes in base58. Shape check only; it does not prove the key exists. */
  function isAddress(str) { const b = b58decode(str); return !!b && b.length === 32; }

  /** A fresh, never-reused reference key for one sale (32 random bytes, base58). */
  function newReference(rand) {
    const bytes = new Uint8Array(32);
    (rand || ((a) => crypto.getRandomValues(a)))(bytes);
    return b58encode(bytes);
  }

  /** "24.99" -> 2499000000n for 8 decimals. Throws on bad input or too many decimals. */
  function toBaseUnits(amount, decimals) {
    const s = String(amount).trim();
    if (!/^\d+(\.\d+)?$/.test(s)) throw new Error('Amount must be a positive number like 12.50');
    const [whole, frac = ''] = s.split('.');
    if (frac.length > decimals) throw new Error(`At most ${decimals} decimal places for this token`);
    const v = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
    if (v <= 0n) throw new Error('Amount must be greater than zero');
    return v;
  }

  /** Solana Pay transfer request URL (spec: solana:<recipient>?amount=&spl-token=&reference=&label=&message=&memo=). */
  function buildPayURL({ recipient, amount, splToken, reference, label, message, memo }) {
    if (!isAddress(recipient)) throw new Error('Recipient is not a Solana address');
    if (splToken && !isAddress(splToken)) throw new Error('Token mint is not a Solana address');
    if (!isAddress(reference)) throw new Error('Reference is not a Solana address');
    const q = [['amount', String(amount).trim()]];
    if (splToken) q.push(['spl-token', splToken]);
    q.push(['reference', reference]);
    if (label) q.push(['label', label]);
    if (message) q.push(['message', message]);
    if (memo) q.push(['memo', memo]);
    // Percent-encoding (spaces as %20), as the Solana Pay spec expects.
    return `solana:${recipient}?` + q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  }

  /**
   * Validate a confirmed transaction (getTransaction, encoding jsonParsed) against the sale.
   * Returns { ok, received, fee, reasons[] }. received is in base units, fee in lamports.
   */
  function verifyPayment(tx, { recipient, reference, splToken, expected }) {
    const reasons = [];
    if (!tx || !tx.meta || !tx.transaction) return { ok: false, received: 0n, fee: 0n, reasons: ['Transaction not found'] };
    if (tx.meta.err) reasons.push('Transaction failed on-chain');
    const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey));
    if (!keys.includes(reference)) reasons.push('Reference key is not in the transaction');
    let received = 0n;
    if (splToken) {
      const sum = (arr) => (arr || []).filter((b) => b.owner === recipient && b.mint === splToken)
        .reduce((a, b) => a + BigInt(b.uiTokenAmount.amount), 0n);
      received = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
    } else {
      const i = keys.indexOf(recipient);
      if (i < 0) reasons.push('Recipient is not in the transaction');
      else received = BigInt(tx.meta.postBalances[i]) - BigInt(tx.meta.preBalances[i]);
    }
    if (received < expected) reasons.push(`Received ${received} base units, expected ${expected}`);
    return { ok: reasons.length === 0, received, fee: BigInt(tx.meta.fee || 0), reasons };
  }

  /** What the same sale would cost through card acquiring: pct of amount plus a fixed fee. */
  function cardFee(amount, pct, fixed) { return amount * pct / 100 + fixed; }

  /** Effective card rate for one ticket size, in percent. The fixed fee makes small tickets expensive. */
  function effectiveRate(amount, pct, fixed) { return amount > 0 ? (cardFee(amount, pct, fixed) / amount) * 100 : 0; }

  /**
   * The savings model for a ledger of confirmed sales (amounts in the shop's currency).
   * cardPct/cardFixed: the shop's card terms. offrampPct: cost to convert to fiat, if the shop does.
   * Returns totals plus the weighted effective card rate of this shop's real ticket mix.
   */
  function savings(sales, { cardPct, cardFixed, offrampPct = 0 }) {
    let volume = 0, cardCost = 0, offramp = 0, networkLamports = 0n;
    for (const s of sales) {
      volume += s.amount;
      cardCost += cardFee(s.amount, cardPct, cardFixed);
      offramp += s.amount * offrampPct / 100;
      networkLamports += BigInt(s.feeLamports || 0);
    }
    const net = cardCost - offramp;
    return {
      count: sales.length, volume, cardCost, offramp, net,
      mixRate: volume > 0 ? (cardCost / volume) * 100 : 0,
      networkLamports,
    };
  }

  const SYSTEM = '11111111111111111111111111111111';
  const TOKEN_PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];

  /**
   * Classify a receiving address from getAccountInfo (any encoding). Receive-only check:
   * it never asks the wallet for anything, it only reads what the chain says about the address.
   * Returns { ok, kind, message }.
   */
  function classifyAccount(info) {
    if (info === null || info === undefined) return { ok: true, kind: 'new', message: 'No account on this network yet. Normal for a new wallet: it appears with the first deposit. Check the address character by character.' };
    if (info.executable) return { ok: false, kind: 'program', message: 'This is a program, not a wallet. Paste your wallet\'s receiving address.' };
    if (TOKEN_PROGRAMS.includes(info.owner)) return { ok: false, kind: 'token', message: 'This is a token account or a mint. Paste your wallet\'s main address instead.' };
    if (info.owner === SYSTEM) return { ok: true, kind: 'wallet', message: 'A regular wallet account. Payments to it can only be moved from inside your wallet.' };
    return { ok: true, kind: 'other', message: 'This address is managed by another program (for example a multisig vault). Make sure it is the receiving address your wallet shows.' };
  }

  /**
   * What card acquiring would cost for a turnover: a typical range and the shop's own mix rate.
   * Rates in percent. Used to show "at your turnover, cards would take about ...".
   */
  function acquiringEstimate(turnover, mixRate, low = 1.5, high = 3) {
    const t = Math.max(0, Number(turnover) || 0);
    return { low: t * low / 100, high: t * high / 100, mix: mixRate > 0 ? t * mixRate / 100 : null };
  }

  /** Sales of one calendar day (local time) from a ledger. */
  function sameDay(ts, ref) { const a = new Date(ts), b = new Date(ref); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  /**
   * Time range for exports: today, week, month, year, lastyear, q1..q4 (current year), custom (from/to as YYYY-MM-DD).
   * Weeks start on Monday. Returns { start, end, label } in milliseconds, end exclusive.
   */
  function periodRange(kind, now = Date.now(), from, to) {
    const d = new Date(now), y = d.getFullYear(), m = d.getMonth();
    const at = (Y, M, D) => new Date(Y, M, D).getTime();
    switch (kind) {
      case 'today': return { start: at(y, m, d.getDate()), end: at(y, m, d.getDate() + 1), label: 'today' };
      case 'week': { const wd = (d.getDay() + 6) % 7; return { start: at(y, m, d.getDate() - wd), end: at(y, m, d.getDate() - wd + 7), label: 'this-week' }; }
      case 'month': return { start: at(y, m, 1), end: at(y, m + 1, 1), label: 'this-month' };
      case 'year': return { start: at(y, 0, 1), end: at(y + 1, 0, 1), label: String(y) };
      case 'lastyear': return { start: at(y - 1, 0, 1), end: at(y, 0, 1), label: String(y - 1) };
      case 'q1': case 'q2': case 'q3': case 'q4': { const q = Number(kind[1]) - 1; return { start: at(y, q * 3, 1), end: at(y, q * 3 + 3, 1), label: `${y}-Q${q + 1}` }; }
      case 'custom': {
        const re = /^(\d{4})-(\d{2})-(\d{2})$/; const a = re.exec(from || ''), b = re.exec(to || '');
        if (!a || !b) throw new Error('Choose both dates');
        const start = at(+a[1], +a[2] - 1, +a[3]), end = at(+b[1], +b[2] - 1, +b[3] + 1);
        if (end <= start) throw new Error('The end date is before the start date');
        return { start, end, label: `${from}_to_${to}` };
      }
      default: return { start: 0, end: Infinity, label: 'all' };
    }
  }
  const inRange = (ts, r) => ts >= r.start && ts < r.end;

  /** The memo text for a refund: "refund:" plus the original transaction ID, so anyone can match it. */
  function refundNote(sig) {
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(String(sig))) throw new Error('Not a transaction signature');
    return 'refund:' + sig;
  }

  /** A plain-text receipt for the buyer. Not a fiscal receipt. */
  function receiptText({ shop, amount, token, sig, at, network, dept, note }) {
    return [
      `Receipt · ${shop || 'Wen Counter'}${dept ? ' · ' + dept : ''}`,
      `Paid: ${amount} ${token}`,
      ...(note ? [`For: ${note}`] : []),
      `Time: ${new Date(at).toISOString()}`,
      `Transaction: ${sig}`,
      `Check: https://explorer.solana.com/tx/${sig}${network === 'devnet' ? '?cluster=devnet' : ''}`,
      'Paid on Solana through Wen Counter. Not a fiscal receipt.',
    ].join('\n');
  }

  /** Kinds of receiving wallet a shop can label: what the money in that wallet is for. */
  const WALLET_TYPES = ['Main', 'Department', 'Branch', 'Till', 'Tips', 'Online', 'Events', 'Other'];

  /** Short tag for a receiving wallet: "#2 · Tips · Bar tips". The type is left out when it repeats the name. */
  function walletTag({ id, type, label }) {
    const parts = ['#' + id];
    if (type && type !== label) parts.push(type);
    parts.push(label || 'Wallet');
    return parts.join(' · ');
  }

  /**
   * Head office view: confirmed sales grouped by receiving wallet and token, from one ledger.
   * wallets: [{ id, type, label, address }], the first one is the main wallet (sales without "to" belong to it).
   * Returns rows { id, type, label, address, token, count, amount } in wallet order; unknown addresses come last.
   */
  function walletSummary(sales, wallets) {
    const byAddr = new Map(wallets.map((w) => [w.address, w]));
    const main = wallets[0];
    const rows = new Map();
    for (const s of sales) {
      const w = byAddr.get(s.to || (main && main.address)) || { id: '?', type: 'Other', label: 'Removed wallet', address: s.to || '' };
      const key = w.address + '|' + s.token;
      const r = rows.get(key) || { id: w.id, type: w.type, label: w.label, address: w.address, token: s.token, count: 0, amount: 0 };
      r.count += 1; r.amount += Number(s.amount) || 0; rows.set(key, r);
    }
    const order = (r) => (typeof r.id === 'number' ? r.id : 1e9);
    return [...rows.values()].sort((a, b) => order(a) - order(b) || String(a.token).localeCompare(String(b.token)));
  }

  /**
   * The comment of a sale (what for, product code or name) as it travels in the Solana Pay request.
   * memo goes on-chain only if the buyer's wallet supports it, and it is public; the ledger keeps the comment either way.
   * Line breaks are flattened and the text is cut to 120 characters.
   */
  function buildMemo(orderId, comment) {
    const c = String(comment || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    const m = 'order:' + orderId + (c ? ' · ' + c : '');
    return m.length > 120 ? m.slice(0, 119) + '…' : m;
  }

  /** A setup PIN is 4 to 8 digits. It locks the settings on a shared device; it is not a wallet key. */
  const isPin = (s) => /^\d{4,8}$/.test(String(s));

  return { buildMemo, isPin, WALLET_TYPES, walletTag, walletSummary, periodRange, inRange, refundNote, receiptText, classifyAccount, acquiringEstimate, sameDay, b58encode, b58decode, isAddress, newReference, toBaseUnits, buildPayURL, verifyPayment, cardFee, effectiveRate, savings };
});
