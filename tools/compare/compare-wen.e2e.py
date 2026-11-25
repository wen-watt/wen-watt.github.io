#!/usr/bin/env python3
"""Browser test for compare-wen.html with a mocked Solana RPC (needs Playwright for Python).
Run from the repository root:  python3 -m http.server 8790 &   then   python3 tools/compare/compare-wen.e2e.py
Checks: SPL and Token-2022 mints are read and compared, powers are flagged, a hostile token name is shown as text,
wallets and token accounts are refused, bad input sends no request, only getAccountInfo is used, ?mint= repeats, mobile fits. Apache-2.0."""
import asyncio, json, sys
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8790/'
SPL = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'; T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
WEN = 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk'; BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; PY = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo'
WALLET = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'; TACC = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
def mint(owner, info, prog): return {'context': {'slot': 470000000}, 'value': {'owner': owner, 'executable': False, 'lamports': 1, 'data': {'program': prog, 'parsed': {'type': 'mint', 'info': info}, 'space': 82}}}
DATA = {
 WEN: mint(SPL, {'decimals': 5, 'supply': '99999987327845760', 'mintAuthority': None, 'freezeAuthority': None, 'isInitialized': True}, 'spl-token'),
 BONK: mint(SPL, {'decimals': 5, 'supply': '8848800000000000000', 'mintAuthority': None, 'freezeAuthority': None, 'isInitialized': True}, 'spl-token'),
 PY: mint(T22, {'decimals': 6, 'supply': '500000000000', 'mintAuthority': 'Auth1111111111111111111111111111111111111', 'freezeAuthority': 'Frz11111111111111111111111111111111111111', 'isInitialized': True,
   'extensions': [{'extension': 'permanentDelegate', 'state': {'delegate': 'Dlg11111111111111111111111111111111111111'}},
     {'extension': 'transferFeeConfig', 'state': {'transferFeeConfigAuthority': 'Fee11111111111111111111111111111111111111', 'newerTransferFee': {'epoch': 1, 'maximumFee': 0, 'transferFeeBasisPoints': 0}}},
     {'extension': 'transferHook', 'state': {'authority': 'Hk111111111111111111111111111111111111111', 'programId': 'HkP11111111111111111111111111111111111111'}},
     {'extension': 'tokenMetadata', 'state': {'updateAuthority': 'Up111111111111111111111111111111111111111', 'name': '<img src=x onerror="window.__xss++">', 'symbol': 'PYUSD'}}]}, 'spl-token-2022'),
 WALLET: {'context': {'slot': 1}, 'value': {'owner': '11111111111111111111111111111111', 'executable': False, 'lamports': 5, 'data': ['', 'base64']}},
 TACC: {'context': {'slot': 1}, 'value': {'owner': SPL, 'executable': False, 'lamports': 5, 'data': {'program': 'spl-token', 'parsed': {'type': 'account', 'info': {}}, 'space': 165}}},
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome') if __import__('os').path.exists('/usr/bin/google-chrome') else await p.chromium.launch(); n = 0; fail = 0; methods = []
        def ck(name, ok, extra=''):
            nonlocal n, fail; n += 1; fail += (not ok); print(('ok ' if ok else 'FAIL ') + name + (' · ' + extra if extra else ''))
        hosts = []; down = set()
        async def route(r):
            host = r.request.url.split('/')[2]; hosts.append(host)
            if host in down: await r.fulfill(status=403, body='forbidden'); return
            body = json.loads(r.request.post_data); methods.append(body['method'])
            await r.fulfill(json={'jsonrpc': '2.0', 'id': 1, 'result': DATA.get(body['params'][0], {'context': {'slot': 1}, 'value': None})})
        ctx = await b.new_context(viewport={'width': 1200, 'height': 1600}); await ctx.add_init_script('window.__xss=0')
        for h in ['https://solana-rpc.publicnode.com', 'https://solana.drpc.org', 'https://api.mainnet-beta.solana.com']:
            await ctx.route(h, route); await ctx.route(h + '/**', route)
        pg = await ctx.new_page(); await pg.goto(BASE + 'compare-wen.html'); await pg.wait_for_timeout(600)
        await pg.click(f'button.cw-preset[data-mint="{BONK}"]'); await pg.wait_for_timeout(700)
        t = await pg.inner_text('#cw-result')
        ck('preset BONK compared, names on cards', 'SPL Token (original)' in t and 'BONK' in t and 'WEN' in t)
        ck('both: no active keys', await pg.locator('.cw-card-s.none').count() == 2)
        await pg.fill('#cw-mint', PY); await pg.click('#cw-run'); await pg.wait_for_timeout(700)
        t = await pg.inner_text('#cw-result')
        ck('Token-2022 read', 'Token-2022' in t)
        ck('permanent delegate flagged', 'ANY holder' in t)
        ck('transfer hook authority shown', 'Can be changed by' in t)
        ck('0% fee with its authority shown', '0% per transfer' in t and 'Fee can be changed' in t)
        ck('five active keys counted', '5 keys can still act' in t)
        ck('differing rows tinted', await pg.locator('tr.diff').count() >= 6)
        ck('hostile token name stays text', await pg.evaluate('window.__xss') == 0 and await pg.locator('#cw-result img').count() == 0)
        for addr, txt, name in [(WALLET, 'Not a token mint', 'wallet refused'), (TACC, 'token account, not a mint', 'token account refused'),
                                ('1111111111111111111111111111111111111111111', 'No account at this address', 'missing account explained')]:
            await pg.fill('#cw-mint', addr); await pg.click('#cw-run'); await pg.wait_for_timeout(500)
            ck(name, txt in await pg.inner_text('#cw-log'))
        before = len(methods); await pg.fill('#cw-mint', 'hello'); await pg.click('#cw-run'); await pg.wait_for_timeout(300)
        ck('bad input refused with no request', 'not a Solana address' in await pg.inner_text('#cw-log') and len(methods) == before)
        ck('only getAccountInfo is used', set(methods) == {'getAccountInfo'}, str(set(methods)))
        down.add('solana-rpc.publicnode.com'); hosts.clear()
        await pg.fill('#cw-mint', BONK); await pg.click('#cw-run'); await pg.wait_for_timeout(800)
        lg = await pg.inner_text('#cw-log')
        ck('first node down: falls back to the next', 'dRPC answered' in lg and 'BONK' in await pg.inner_text('#cw-result'), str(hosts))
        down.update(['solana.drpc.org', 'api.mainnet-beta.solana.com'])
        await pg.click('#cw-run'); await pg.wait_for_timeout(800)
        ck('all nodes down: clear message', 'No RPC answered' in await pg.inner_text('#cw-log'))
        down.clear()
        p2 = await ctx.new_page(); await p2.goto(BASE + 'compare-wen.html?mint=' + PY); await p2.wait_for_timeout(900)
        ck('?mint= repeats the check', 'Token-2022' in await p2.inner_text('#cw-result'))
        m = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True); await m.route('https://solana-rpc.publicnode.com', route)
        mp = await m.new_page(); await mp.goto(BASE + 'compare-wen.html?mint=' + BONK); await mp.wait_for_timeout(1200)
        ck('mobile: no horizontal overflow', await mp.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
        print(f'{n - fail}/{n} checks passed'); await b.close(); sys.exit(1 if fail else 0)
asyncio.run(main())
