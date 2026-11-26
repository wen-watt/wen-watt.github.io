---
title: "Compare any Solana token in the browser: authorities, Token-2022 extensions and a public-RPC fallback"
published: false
description: "One read-only call, getAccountInfo with jsonParsed, is enough to line up 14 properties of any Solana mint. Here is how Compare WEN does it, with the code."
tags: solana, javascript, web3, opensource
cover_image: https://wen-watt.github.io/wen-media-f/compare-wen-poster-1.jpg
canonical_url: https://wen-watt.github.io/posts/compare-wen-with-any-solana-token.html
---

Names, tickers and logos can be copied in a minute. The powers written into a token cannot hide: they sit in the mint account, on a public chain. So we built a small page that reads them for you and lines up two tokens side by side: [Compare WEN with any Solana token](https://wen-watt.github.io/compare-wen.html).

No wallet, no signature, no backend, no prices. One request type to Solana. This post walks through the code, which is open (Apache-2.0).

## One call: getAccountInfo with jsonParsed

Every SPL and Token-2022 mint is an account. Ask a node for it with `encoding: "jsonParsed"` and you get the authorities, decimals, supply and, for Token-2022, every extension already decoded:

```js
function rpcOne(url, addr) {
  return fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo',
      params: [addr, { encoding: 'jsonParsed', commitment: 'confirmed' }] })
  }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(j => { if (j.error) throw new Error(j.error.message); return j.result; });
}
```

## Refuse what is not a mint

A wallet address or a token account must not be "misread" as a token. The owner program tells you what you are looking at:

```js
const SPL = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

const v = res.value;
if (!v) return { error: 'No account at this address on mainnet.' };
if (v.owner !== SPL && v.owner !== T22) return { error: 'Not a token mint.' };
const p = v.data.parsed;
if (p.type !== 'mint') return { error: 'This is a token account, not a mint.' };
```

## Read the powers

The classic fields are the two authorities. If one is present, a key can still act:

```js
const i = p.info, ext = i.extensions || [];
const mint   = i.mintAuthority   ? 'Present' : 'Revoked'; // can create new tokens
const freeze = i.freezeAuthority ? 'Present' : 'Revoked'; // can freeze a holder
```

Token-2022 extensions arrive as `{ extension, state }` objects. A tiny helper finds one by name:

```js
const E = name => (ext.find(e => e.extension === name) || {}).state || null;

const fee = E('transferFeeConfig');   // fee on every transfer (+ who can change it)
const del = E('permanentDelegate');   // a key that can move or burn ANY holder's tokens
const hook = E('transferHook');       // a program that runs on every transfer
// also: defaultAccountState, nonTransferable, mintCloseAuthority,
//       pausableConfig, metadataPointer, tokenMetadata
```

The page shows 14 rows this way: program, decimals, supply, mint and freeze authority, extensions, transfer fee, permanent delegate, transfer hook, default frozen state, non-transferable, close authority, pausable, metadata. Rows that differ are tinted, keys that can still act are counted. Every row has a "What it means" button in plain words, because `permanentDelegate: present` means nothing to most people until you say "this key can move tokens out of your account".

A key that can act is not good or bad by itself: many stablecoins keep freeze for legal reasons. The page compares; the reader decides.

## Public RPC from a browser: plan for 403

The first version called `api.mainnet-beta.solana.com` directly. In real browsers it often answers **403** to cross-origin requests. The fix is a list of free public nodes tried in order, remembering the first that answers:

```js
const RPCS = [['PublicNode', 'https://solana-rpc.publicnode.com'],
              ['dRPC', 'https://solana.drpc.org'],
              ['Solana Foundation', 'https://api.mainnet-beta.solana.com']];

function rpc(list, addr) {
  let i = 0; const errors = [];
  const next = () => {
    if (i >= list.length) return Promise.reject(new Error('No RPC answered: ' + errors.join('; ')));
    const ep = list[i++];
    return rpcOne(ep[1], addr).then(res => { list.splice(0, list.length, ep); return res; },
      e => { errors.push(ep[0] + ': ' + e.message); return next(); });
  };
  return next();
}
```

Users can also paste their own RPC URL. The step log says which node answered.

## Is it live code? Check the program account

The same call works for programs. The page checks that the programs built around WEN, the WNS program and its royalty transfer-hook program, are deployed and executable:

```js
const r = await rpc(RPCS, 'diste3nXmK7ddDTs1zb6uday6j4etCa9RChD8fJ1xay');
const live = r.value && r.value.executable; // true → live code on mainnet
```

## Is there a wiki page? Match by address, not by name

The page also asks the public IQ.wiki GraphQL API whether a page exists. Page ids rarely match tickers (JUP lives at `jupiter`), so it tries name variants and IQ.wiki search, then calls a page **found** only if it lists the same mint address:

```js
const q = 'query($id:String!){wiki(id:$id){id title updated metadata{id value}}}';
const wk = (await iq(q, { id: 'jupiter' })).wiki;
const found = (wk.metadata || []).some(m => String(m.value || '').includes(mint));
```

A page with only the same name is shown as "related", and "no page found" comes with a note that it says nothing about the token itself.

## Safe rendering

Token names come from the chain and can contain anything. Every cell is built with `textContent`, never `innerHTML`, and a Playwright test feeds hostile names and checks nothing executes.

## Test it

The repository has an end-to-end test that mocks the RPC and IQ.wiki answers and runs the page in Chrome: 33 checks, including node fallback, all nodes down, a wallet address refused, a token account refused, Token-2022 extensions, the explanations and the wiki states.

- Try it: https://wen-watt.github.io/compare-wen.html (add `?mint=<address>` to share a check)
- Code: https://github.com/wen-watt/wen-watt.github.io/blob/main/assets/js/compare-wen.js
- Test: https://github.com/wen-watt/wen-watt.github.io/blob/main/tools/compare/compare-wen.e2e.py
- The news, with the story behind it: https://wen-watt.github.io/posts/compare-wen-with-any-solana-token.html

The one real WEN is the Solana mint `WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk`. Check addresses, not names.

*Educational content, not financial advice. Code Apache-2.0, text CC BY 4.0.*
