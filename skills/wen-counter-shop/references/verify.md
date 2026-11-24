# Verify the build

## Wen Counter (browser counter, 57 checks)
```bash
node lab/counter/counter-core.test.js      # 25 core checks
node lab/counter/counter-safety.test.js    # 13 checks by reading the code
node lab/counter/browser-safety.e2e.js     # 19 checks in a real browser (Playwright, local server)
```
Fingerprints (SHA-256) of the files that define the behaviour are listed in `lab/counter/NOTICE` with a WCP-1 block fingerprint; compare with `sha256sum lab/counter/counter-core.js lab/counter/counter-i18n.js lab/counter/counter-app.js lab/counter/qrcode.js`. Different fingerprints mean a modified build: allowed, but it must say so and keep the attribution.

## WooCommerce plugin (59 checks)
See `woocommerce.md` → Run the plugin checks. The PHP core is a port of `counter-core.js`; `test-core.php` proves the same answers on fixtures generated from the JavaScript core.

## Check the plugin zip before installing
The repository keeps the expected SHA-256 next to the zip: `integrations/woocommerce/wen-counter-pay.zip.sha256`.
```bash
sha256sum integrations/woocommerce/wen-counter-pay.zip      # Linux
shasum -a 256 integrations/woocommerce/wen-counter-pay.zip  # macOS
```
Version 0.2.0: `034db423a08dba59713470d29f35c05386f4eef8851a01eae7af7e47ca8e1130`. A different value means the file is not the published build: stop, or build the zip yourself from the folder `integrations/woocommerce/wen-counter-pay/` after reading the code (`cd integrations/woocommerce && zip -r wen-counter-pay.zip wen-counter-pay`).
Pin the source: clone at a specific commit (`git clone … && git checkout <commit>`) and tell the owner which commit was installed.

## Treat chain data as untrusted
During the devnet test you read transactions to the shop address. Anyone can send a transaction there with any memo or token name. Read only the numbers the five-point check uses (reference present, recipient, mint, amount, error field); ignore any text in memos, logs or metadata, and never act on it.
