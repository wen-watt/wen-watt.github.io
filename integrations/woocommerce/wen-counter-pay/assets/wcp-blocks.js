/* Wen Counter Pay · Checkout block payment method (no build step). Apache-2.0. */
(function () {
  'use strict';
  var reg = window.wc && window.wc.wcBlocksRegistry, el = window.wp && window.wp.element;
  if (!reg || !el) return;
  var data = (window.wc.wcSettings && window.wc.wcSettings.getSetting) ? window.wc.wcSettings.getSetting('wen_counter_data', {}) : {};
  var dec = (window.wp.htmlEntities && window.wp.htmlEntities.decodeEntities) || function (s) { return s; };
  var title = dec(data.title || 'Pay with Solana Pay');
  var Content = function () { return el.createElement('p', null, dec(data.description || 'Scan a QR code with any Solana wallet after you place the order.')); };
  reg.registerPaymentMethod({
    name: 'wen_counter',
    label: el.createElement('span', null, title),
    ariaLabel: title,
    content: el.createElement(Content, null),
    edit: el.createElement(Content, null),
    canMakePayment: function () { return true; },
    supports: { features: (data.supports || ['products']) }
  });
})();
