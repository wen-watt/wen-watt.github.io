/* ===========================================================
   Wen Crypto — shared navigation (sidebar + footer)
   Edit THIS FILE to change the menu/footer on every page at once.
   Each page only needs:
     <div id="sidebar-slot"></div>   (inside .site-shell)
     <div id="footer-slot"></div>    (inside main.wrap, at the end)
     <script src="{prefix}assets/js/nav.js" data-prefix="{prefix}"></script>
   where {prefix} is the relative path back to the site root
   (""  for root pages, "../" for posts/*.html).
   All local media now lives in one flat folder: wen-media/<file>.
   =========================================================== */
(function () {
  var scriptEl = document.currentScript;
  var prefix = (scriptEl && scriptEl.getAttribute('data-prefix')) || '';
  var p = prefix; // shorthand used in templates below

  // Wen Open Lab submenu: shown expanded on pages inside /lab/
  var LAB_STAGES = [
    ['index.html', '0 · Roadmap'],
    ['receipt-warranty-wns.html', '1 · Receipts &amp; warranty'],
    ['creator-royalties-wns.html', '2 · Creator royalties'],
    ['b2b-invoices-token-2022.html', '3 · B2B invoices'],
    ['payments-acquiring-bridge.html', '4 · Payments bridge'],
    ['payment-simulator.html', '5 · Simulator'],
    ['benefits.html', '&#9733; Benefits &amp; use']
  ];
  var path = (window.location && window.location.pathname) || '';
  var inLab = /\/lab\//.test(path);
  var here = path.split('/').pop() || 'index.html';
  var labSub = '';
  if (inLab) {
    labSub = '<ul class="lab-sub">';
    for (var i = 0; i < LAB_STAGES.length; i++) {
      var cur = LAB_STAGES[i][0] === here ? ' aria-current="page"' : '';
      labSub += '<li><a href="' + p + 'lab/' + LAB_STAGES[i][0] + '"' + cur + '>' + LAB_STAGES[i][1] + '</a></li>';
    }
    labSub += '</ul>';
  }

  var sidebarHTML = ''
    + '<aside class="sidebar">'
    + '  <a class="brand" href="' + p + 'index.html">Wen<span>Crypto</span></a>'

    + '  <div class="sidebar-intro">'
    + '    <p class="intro-line">'
    + '      More open <a href="' + p + 'index.html">Blog Main Cat Wen W</a> check '
    + '      <a href="https://youtu.be/7JgpVGisQbg" target="_blank" rel="noopener">ID Contract</a>'
    + '    </p>'
    + '    <p class="intro-line">'
    + '      $Wen coin token <span class="sep">○</span> '
    + '      <a href="' + p + 'wen-media.html">Gif\'s open</a> &amp; '
    + '      <a href="' + p + 'wen-media.html">Wen Brand</a>'
    + '    </p>'
    + '    <p class="intro-desc">Wen is a movement of crypto coin cat. Wen is the internet\'s cutest cat and the heart of a growing global phenomenon. More than a brand, Wen is on a mission to become one of the world\'s most iconic and beloved IPs.</p>'
    + '  </div>'

    + '  <nav class="key-pages" aria-label="Key pages">'
    + '    <ul>'
    + '      <li><a href="' + p + 'about-wen-token-wen-coin-crypto.html#wen-crypto">About Wen token, WEN coin crypto</a></li>'
    + '      <li><a href="' + p + 'lab/index.html"><strong>&#9733; Wen Open Lab</strong></a>' + labSub + '</li>'
    + '      <li><a href="' + p + 'about.html#wen-token">More about Wen ($Wen) token</a></li>'
    + '      <li><a href="' + p + 'token-2022-wns-solana-wen.html">Token 2022 WNS Solana Wen</a></li>'
    + '      <li><a href="' + p + 'wen-coin-with-pinterest.html#wen">Wen coin with Pinterest</a></li>'
    + '      <li><a href="' + p + 'wen-coin-video.html#wen-video">Wen coin video</a></li>'
    + '      <li><a href="' + p + 'jupiter-mobile-exchange-with-wen.html#jup">Jupiter mobile &amp; Exchange with Wen</a></li>'
    + '      <li><a href="' + p + 'spl-solana-program-library-token-2022-wns.html">Solana Program Library Token-2022 WNS</a></li>'
    + '      <li><a href="' + p + 'posts/wen-program-library-review.html">Wen Program Library</a></li>'
    + '      <li><a href="' + p + 'links-wen-cat.html">Links Wen $Wen coin</a></li>'
    + '      <li><a href="' + p + 'wen-media.html">Wen Media</a></li>'
    + '      <li><a href="' + p + 'search-video-wen.html">More Wen</a></li>'
    + '    </ul>'
    + '  </nav>'

    + '  <div class="social-icons" aria-label="Social links">'
    + '    <a href="https://x.com/i/communities/1865784545158496651" target="_blank" rel="noopener" class="social-badge" title="X">X</a>'
    + '    <a href="https://www.youtube.com/@wen-coin/" target="_blank" rel="noopener" class="social-badge" title="YouTube">YT</a>'
    + '    <a href="https://www.tiktok.com/@wen_coin_crypto" target="_blank" rel="noopener" class="social-badge" title="TikTok">TT</a>'
    + '    <a href="https://www.pinterest.com/Alexwoogo/wen-wen-crypto-coin-new-2027-and-cats-crypto/" target="_blank" rel="noopener" class="social-badge" title="Pinterest">P</a>'
    + '  </div>'
    + '</aside>';

  var footerHTML = ''
    + '<footer class="site-footer">'
    + '  <p class="more-links">'
    + '    Wen cat more'
    + '    <a href="' + p + 'posts/wen-crypto-token-gitgub-com-release-planning.html">Github</a><span class="sep">○</span>'
    + '    <a href="' + p + 'posts/catlumpurr-kaula-lumpur-malaysia-jan-31-to-feb-1-2026-video-about-event.html">Catlumpurr</a><span class="sep">○</span>'
    + '    <a href="#" data-pending="2025/12/05/reddit-com-and-the-cryptocurrency-section-were-looking-for-history-correctly" aria-disabled="true">Reddit</a><span class="sep">○</span>'
    + '    <a href="' + p + 'posts/wen-crypto-gold-coin-coinbase-roadmap-for-jupiter-bonk-memecoin-debuts-as-an-etp-today.html">Wen</a><span class="sep">○</span>'
    + '    <a href="#" data-pending="2025/11/18/meow-is-back-on-the-planetary-call-60-back-to-the-future-with-jup-friend-wen" aria-disabled="true">Meow</a><span class="sep">○</span>'
    + '    <a href="#" data-pending="2025/11/15/what-is-wendys-backstory-and-what-is-new-world-wen-crypto" aria-disabled="true">Wendy\'s</a><span class="sep">○</span>'
    + '    <a href="#" data-pending="2025/10/30/bsol-new-york-stock-exchange-wall-street" aria-disabled="true">BSol Wallstreet</a><span class="sep">○</span>'
    + '    <a href="#" data-pending="2025/10/21/solana-successfully-endures-peak-traffic-stress-test-during-wen-token-launch-catalyzing-wns-adoption" aria-disabled="true">WNS 0.0</a><span class="sep">○</span>'
    + '    <a href="#" data-pending="2025/10/10/wen-crypto-egypt-cats" aria-disabled="true">Cats</a><span class="sep">○</span>'
    + '    <a href="#" data-pending="2025/10/10/wen-crypto-x-elevate-pictures-and-next-future" aria-disabled="true">Elevate</a><span class="sep">○</span>'
    + '    <a href="' + p + 'links-wen-cat.html">Wen links</a><span class="sep">○</span>'
    + '    <a href="' + p + 'wen-media/wen-resource-hub.html">Hub</a>'
    + '  </p>'
    + '  <p class="legal">'
    + '    2024–2027 © Disclaimer: The information in this article should not be considered as financial advice and Wen by Solana blog is intended to provide educational, general information only. Decisions are independent. Official information on the community Wen crypto page and open public links for you.'
    + '    <a href="' + p + 'privacy-policy-cookie-policy.html">Privacy policy cookie policy</a><span class="sep">·</span>'
    + '    <a href="' + p + 'navigation.html">Navigation</a><span class="sep">·</span>'
    + '    <a href="' + p + 'index.html">WenCoin</a>'
    + '  </p>'
    + '</footer>';

  function inject() {
    var s = document.getElementById('sidebar-slot');
    var f = document.getElementById('footer-slot');
    if (s) s.outerHTML = sidebarHTML;
    if (f) f.outerHTML = footerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
