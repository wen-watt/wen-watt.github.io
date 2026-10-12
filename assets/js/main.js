// Site scripts. Menu and footer live in nav.js.

// Wen Media viewer: a click on a Wen Media image that has no photo page of its own
// opens it in a light window (image, caption, links home) instead of leaving the site.
// Photos that carry a fact link to their own page in /media/ and are not intercepted.
(function () {
  var IMG = /(^|\/)wen-media\/[^\/?#]+\.(jpe?g|png|gif|webp)$/i;
  var box = null, lastFocus = null;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function close() {
    if (!box) return;
    box.parentNode.removeChild(box); box = null;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function open(a) {
    var href = a.getAttribute('href');
    var pre = href.slice(0, href.indexOf('wen-media/'));
    var img = a.querySelector('img');
    var cap = a.getAttribute('title') || (img && img.getAttribute('alt')) || 'Wen Media';
    lastFocus = a;
    box = document.createElement('div');
    box.className = 'wm-view';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', cap);
    box.innerHTML = '<div class="wm-inner">'
      + '<button type="button" class="wm-close" aria-label="Close">&times;</button>'
      + '<img src="' + esc(href) + '" alt="' + esc(cap) + '">'
      + '<p class="wm-cap">' + esc(cap) + '</p>'
      + '<p class="wm-links"><a href="' + esc(pre) + 'index.html">Home: the Wen Almanac</a>'
      + '<a href="' + esc(pre) + 'wen-media.html">All of Wen Media</a>'
      + '<a href="' + esc(pre) + 'quiz.html">&#10067; What do you know about Wen?</a>'
      + '<a href="' + esc(href) + '" target="_blank" rel="noopener">Open the original</a></p>'
      + '</div>';
    document.body.appendChild(box);
    document.documentElement.style.overflow = 'hidden';
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    box.querySelector('.wm-close').addEventListener('click', close);
    box.querySelector('.wm-close').focus();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !IMG.test(a.getAttribute('href') || '')) return;
    if (a.closest('.wm-view')) return;
    e.preventDefault();
    open(a);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
