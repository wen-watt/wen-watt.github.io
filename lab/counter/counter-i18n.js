/* Wen Counter · interface words (WCP-1) · Wen Open Lab · wen-watt.github.io
 * All words of the interface live here, so a translation never touches counter-core.js or counter-app.js.
 * Each dictionary is bound to the core fingerprint it was written for (FOR_CORE): if the core changes,
 * the safety test says so, and the translation is checked again. Words are written as text, never as HTML.
 * English today; Chinese and Italian are planned. License: Apache-2.0.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WenCounterI18n = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const FOR_CORE = '435b057ab3bd02d24430c6944ff89fe2235ce962d27cfafc2fb865809b384c3d'; // SHA-256 of counter-core.js
  const DICT = {
    en: {
      "tab.sell": "Sell",
      "tab.ledger": "Ledger",
      "tab.setup": "Setup",
      "sell.whatFor": "Comment: what for, product code or name (optional)",
      "sell.commentNote": "Goes to your ledger and CSV. If the buyer's wallet supports it, it also travels with the payment as a public memo; if not, it stays only on your side.",
      "sell.showQr": "Show QR",
      "pay.copyLink": "Copy pay link",
      "pay.newSale": "New sale",
      "rcpt.title": "Receipt for the buyer",
      "rcpt.qr": "Show receipt QR",
      "rcpt.copy": "Copy receipt",
      "led.today": "Today you kept",
      "led.show": "Show",
      "led.refunds": "Refunds",
      "led.export": "Export for your accountant",
      "led.period": "Period",
      "led.exportCsv": "Export CSV",
      "lock.title": "Setup is locked",
      "lock.pin": "Setup PIN",
      "lock.unlock": "Unlock",
      "lock.why": "Only the owner of this device sets the receiving wallets, so nobody at the till can put their own wallet in. Forgot the PIN? Reinstall the app on this device, enter the receiving wallets again and set a new PIN.",
      "set.shop": "Shop name (shown in the buyer's wallet)",
      "set.wallet": "Your receiving wallet (Solana)",
      "set.address": "Receiving address (public key only)",
      "set.check": "Check this address on-chain",
      "set.more": "More receiving wallets (optional)",
      "set.add": "+ Add a wallet",
      "set.network": "Network",
      "set.accept": "Accept",
      "set.save": "Save",
      "pin.title": "Setup PIN and device",
      "pin.text": "Set the PIN that protects these settings on this device (4 to 8 digits). Keep it with the owner, not at the till.",
      "pin.new": "New PIN",
      "pin.repeat": "Repeat",
      "pin.set": "Save new PIN",
      "pin.lock": "Lock setup",
      "led.clear": "Clear ledger",
      "pin.clearNote": "Clearing the ledger needs the PIN too. Export it first.",
      "set.install": "Install"
    },
  };
  const PLANNED = ['zh', 'it'];
  const pick = (lang) => (DICT[lang] ? lang : 'en');
  /** One interface word in the chosen language, English when missing. */
  function t(lang, key) { return (DICT[pick(lang)] || {})[key] || DICT.en[key] || key; }
  /** Write the words into every element marked data-i18n, as text only. */
  function apply(doc, lang) { for (const el of doc.querySelectorAll('[data-i18n]')) el.textContent = t(lang, el.getAttribute('data-i18n')); }
  return { FOR_CORE, DICT, PLANNED, languages: Object.keys(DICT), t, apply };
});
