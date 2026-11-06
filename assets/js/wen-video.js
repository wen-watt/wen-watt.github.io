/* Wen lite video: shows our own poster; the YouTube player (privacy-enhanced, youtube-nocookie.com)
   loads only after a click. No third-party requests before that. */
(function () {
  'use strict';
  function go(b) {
    var id = b.getAttribute('data-yt'); if (!id) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0';
    f.title = b.getAttribute('aria-label') || 'Wen video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true; f.loading = 'lazy';
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
    b.parentNode.replaceChild(f, b);
  }
  function init() {
    var bs = document.querySelectorAll('.wv-btn[data-yt]');
    for (var i = 0; i < bs.length; i++) bs[i].addEventListener('click', function () { go(this); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
