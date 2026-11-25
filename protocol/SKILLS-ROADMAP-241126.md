# Skill search roadmap, points 1–5 (§99 / §100) — ready-to-use texts

Do these after `upload-241126-stage8-shops.zip` is live and checked.

---

## 1. SKILL.md in the public repo
Done when the package is uploaded. Check that these open:
- https://github.com/wen-watt/wen-watt.github.io/blob/main/skills/wen-counter-shop/SKILL.md
- https://wen-watt.github.io/skills/wen-counter-shop/SKILL.md
- https://wen-watt.github.io/AGENTS.md

## 2. One-command install (skills.sh)
On any computer with Node.js:
```bash
npx skills add wen-watt/wen-watt.github.io
```
Expected result: the installer lists `wen-counter-shop` and asks which assistants to install it for (Claude Code, Cursor, Codex, Copilot and others). Send me a screenshot of the output. If it finds nothing, I'll check the frontmatter.

Once installed, it should also show up on skills.sh, where the leaderboard is built from installs.

## 3. skillagent.dev → Submit
- **Repository URL:** https://github.com/wen-watt/wen-watt.github.io
- **Skill path:** skills/wen-counter-shop
- **Name:** wen-counter-shop
- **Category:** E-commerce / Payments
- **Short description (≤160):**
  Audit an online shop and add a free, receive-only Solana Pay checkout (WooCommerce plugin, links, hosted till). No keys, no fees, devnet first.
- **Long description:**
  The skill guides an AI assistant through four steps: audit the shop (platform, theme, checkout, currency, hosting), pick the right path, install it, and verify it. The paths are:
  - the Wen Counter Pay WooCommerce plugin;
  - a Solana Pay link or QR for Shopify, Wix and Squarespace;
  - the hosted Wen Counter till.

  Safety rules are built in: it only ever uses the public receiving address and never asks for a seed phrase or private key. It reads the chain with just three RPC read methods, tests on devnet before mainnet, and marks an order paid only after a five-point check.

  Built on the open Wen Counter Protocol (WCP-1), with 54 open checks for the plugin. Apache-2.0. Free forever.
- **Tags:** solana, solana-pay, woocommerce, ecommerce, payments, checkout, usdc, wordpress

## 4. PRs to curated lists

Before sending, open each list's README/CONTRIBUTING and put the line in the section and format they use. Some lists only accept skills that have installs or stars. If a list refuses, we accept that and don't argue.

### 4a. VoltAgent/awesome-agent-skills
**Line:**
```
- [wen-watt/wen-counter-shop](https://github.com/wen-watt/wen-watt.github.io/tree/main/skills/wen-counter-shop) - Audit an online shop and add a free, receive-only Solana Pay checkout (WooCommerce plugin, payment links). No keys, devnet first.
```
**PR title:** `Add wen-counter-shop (free receive-only Solana Pay checkout for shops)`

**PR body:**
```
Adds wen-counter-shop, an agent skill that audits an online shop and installs a free, receive-only Solana Pay checkout.

- SKILL.md + references (audit checklist, WooCommerce, other platforms, security review, verify, sources)
- Companion WooCommerce plugin in the same repo, 54 open checks
- Safety: public address only, never seed phrases or private keys, three read-only RPC methods, devnet first
- License: Apache-2.0, free, no fees

Install: npx skills add wen-watt/wen-watt.github.io
```

### 4b. heilcheng/awesome-agent-skills
**Line:**
```
- [wen-counter-shop](https://github.com/wen-watt/wen-watt.github.io/tree/main/skills/wen-counter-shop) — shop audit + free receive-only Solana Pay checkout (WooCommerce plugin, links, hosted till). Apache-2.0.
```
PR title and body: same as 4a.

## 5. WordPress.org plugin directory (later, a separate step)
Checklist before submitting at https://wordpress.org/plugins/developers/add/ :
- [ ] Owner's devnet run of the plugin on a test WordPress + WooCommerce (order → QR → payment → "paid").
- [ ] License. The directory requires GPLv2-or-later compatibility. Apache-2.0 is compatible with GPLv3, so it is usually accepted. If the reviewers ask, the PHP can be dual-licensed "Apache-2.0 OR GPL-2.0-or-later". That is the owner's decision.
- [ ] Plugin slug: check that `wen-counter-pay` is free.
- [ ] readme.txt: `Tested up to` set to the current WordPress version, `Stable tag: 0.1.0`, and the screenshots listed.
- [ ] No external scripts or CDN (already true: the QR is local), no tracking, and escaped output (covered by test-safety.php).
- [ ] Plugin Check (the official PCP plugin) run with no errors.
- [ ] Have an svn client ready after approval.

## Then (point e of §99)
Write the dev.to and Hashnode articles about Stage 8 using our model, in 4 languages. Then move on to "Compare WEN" (public RPC verification data; CoinGecko without a key, optional, with attribution).
