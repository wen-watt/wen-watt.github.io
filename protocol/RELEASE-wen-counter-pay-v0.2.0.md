# GitHub Release · Wen Counter Pay 0.2.0 (для владельца)

Из сессии Claude создавать релизы GitHub не разрешено (403), поэтому релиз публикует владелец, ~1 минута.

1. https://github.com/wen-watt/wen-watt.github.io/releases/new
2. Choose a tag → ввести **wen-counter-pay-v0.2.0** → Create new tag (target: main).
3. Release title: **Wen Counter Pay 0.2.0 (pre-release, devnet test pending)**
4. Описание — текст ниже целиком.
5. Attach binaries: файл **integrations/woocommerce/wen-counter-pay.zip** из репозитория (скачать: https://github.com/wen-watt/wen-watt.github.io/raw/main/integrations/woocommerce/wen-counter-pay.zip).
6. Отметить **Set as a pre-release** → Publish release.

SHA-256 архива: `034db423a08dba59713470d29f35c05386f4eef8851a01eae7af7e47ca8e1130`

---

**Wen Counter Pay 0.2.0** — a free, receive-only Solana Pay checkout for WooCommerce, from the Wen Open Lab, plus the `wen-counter-shop` agent skill that installs it.

**Pre-release:** the code passes its 59 checks; the devnet run on a live WordPress shop is still to come. Use devnet first. Mainnet only after your own devnet test.

What is inside
- Receive-only: the buyer pays from their own wallet to the shop's public address; the server reads the chain (getSignaturesForAddress, getTransaction). No keys, no signing, no fee, no middleman.
- An order is paid only after the five-point check: reference, recipient, token, amount, success.
- Usability audit and an "alternative payment method" note: `integrations/woocommerce/wen-counter-pay/USABILITY-AUDIT.md`.
- Agent skill: `npx skills add wen-watt/wen-watt.github.io` (or the small mirror `npx skills add wen-watt/skills`).

Files
- `wen-counter-pay.zip` — install in WordPress → Plugins → Add New → Upload.
- SHA-256: `034db423a08dba59713470d29f35c05386f4eef8851a01eae7af7e47ca8e1130`

Human guide: https://wen-watt.github.io/lab/shop-integration.html · Skill hub: https://wen-watt.github.io/skills/

Apache-2.0 for code, CC BY 4.0 for texts. Keep NOTICE and the attribution: "Built on Wen Counter (WCP-1), Wen Open Lab · wen-watt.github.io, on Solana, Solana Pay, SPL Token and Token-2022, WNS and WEN." Not financial, tax or legal advice; check local rules for accepting crypto.
