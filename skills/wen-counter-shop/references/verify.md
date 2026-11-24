# Verify the build

## Wen Counter (browser counter, 57 checks)
```bash
node lab/counter/counter-core.test.js      # 25 core checks
node lab/counter/counter-safety.test.js    # 13 checks by reading the code
node lab/counter/browser-safety.e2e.js     # 19 checks in a real browser (Playwright, local server)
```
Fingerprints (SHA-256) of the files that define the behaviour are listed in `lab/counter/NOTICE` with a WCP-1 block fingerprint; compare with `sha256sum lab/counter/counter-core.js lab/counter/counter-i18n.js lab/counter/counter-app.js lab/counter/qrcode.js`. Different fingerprints mean a modified build: allowed, but it must say so and keep the attribution.

## WooCommerce plugin (54 checks)
See `woocommerce.md` → Run the plugin checks. The PHP core is a port of `counter-core.js`; `test-core.php` proves the same answers on fixtures generated from the JavaScript core.
