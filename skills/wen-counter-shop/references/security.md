# Security review (all green before mainnet)

| Check | Green when |
|---|---|
| Keys | No seed phrase or private key anywhere: code, settings, chat, logs, server |
| Receive-only | No wallet connect, sign or send code added; search for `sendTransaction`, `signTransaction`, `Keypair`, `secretKey` returns nothing |
| Read-only RPC | Only `getSignaturesForAddress`, `getTransaction`, `getAccountInfo` |
| Address | The receiving address in settings matches the owner's wallet (first and last five characters read aloud) |
| Five-point check | An order becomes paid only after reference, recipient, token, amount and success match |
| One tx, one order | A transaction already used for an order cannot pay another |
| Escaping | Shop names, notes and server answers are shown as text, never as HTML |
| Remote code | No scripts from other domains; the QR generator is the local MIT file |
| Devnet | A paid devnet test order exists with an Explorer link |
| Mainnet switch | Done only with the owner's explicit yes |
| Wallet safety | The owner keeps the seed offline; teams use a multisig vault; daily sweep from till wallets if several devices |
| Attribution | `NOTICE` kept in every copy |

Run the automated checks in `verify.md`. If any check fails, do not go live.
