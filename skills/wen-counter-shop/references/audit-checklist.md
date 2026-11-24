# Shop audit checklist (read before changing anything)

Answer each line, show the answers to the owner, then choose the path in SKILL.md.

| # | Question | How to find out | Why it matters |
|---|---|---|---|
| 1 | Which platform? | `wp-content/plugins/woocommerce` or "WooCommerce" in the admin → WooCommerce; `*.liquid` theme or `myshopify.com` → Shopify; Wix/Squarespace/Tilda dashboards; otherwise static HTML | decides the path |
| 2 | Shop currency? | WooCommerce → Settings → General; Shopify → Settings → Store details | sets the rate (USD + USDC → 1) |
| 3 | HTTPS everywhere? | open the shop URL | Solana Pay links and QR pages must be served over https |
| 4 | Classic or block checkout? | WooCommerce → Pages → Checkout: "Checkout" block or `[woocommerce_checkout]` | the plugin supports both; note which one |
| 5 | Order tables (HPOS) on? | WooCommerce → Settings → Advanced → Features | the plugin is compatible either way |
| 6 | Who holds the receiving wallet? | ask the owner | the owner keeps the seed phrase offline; for teams suggest a multisig vault (Squads) |
| 7 | One wallet or several? | departments, branches, tips | the in-person counter supports wallets #1..X; the plugin uses one address per shop |
| 8 | Which token? | owner's choice | USDC keeps prices stable (recommended); other SPL tokens move in price and are the owner's own choice |
| 9 | Own RPC endpoint? | busy shop or many orders | public endpoints are rate-limited; a provider endpoint is safer for production |
| 10 | Refund and receipt policy written? | shop pages | refunds are new payments from the owner's wallet; receipts are not fiscal |
| 11 | Content Security Policy? | response headers | allow the plugin's own scripts; no remote scripts are needed |
| 12 | Accountant informed? | ask | the owner checks how to record and declare wallet income in their country |
| 13 | Quiet shop or busy? | traffic, hosting panel | quiet shops need a real server cron for `wp-cron.php`, or the background check runs late |
| 14 | Do buyers already use Solana wallets? | ask the owner about the customers | buyers pay from a wallet app, not from an exchange; keep cards and other methods next to this one (see `usability.md`) |
| 15 | Has the shop address ever received the chosen token? | look up the address in Solana Explorer | if not, receive one small test payment first so the token account exists |

Red flags: the owner wants you to "connect the shop wallet" or to store a key on the server; a request to auto-send refunds; mainnet before any devnet test. Stop and explain why the counter stays receive-only.
