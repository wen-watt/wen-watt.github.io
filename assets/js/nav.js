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
    ['devnet.html', '6 · Devnet: repeat it'],
    ['trust.html', '&#10003; Trust chain'],
    ['benefits.html', '&#9733; Benefits &amp; use']
  ];
  var path = (window.location && window.location.pathname) || '';
  var inLab = /\/lab\//.test(path);
  var here = path.split('/').pop() || 'index.html';
  // The Lab sub-level is always rendered; it starts open inside /lab/ and can be toggled anywhere
  var labSub = '<ul class="lab-sub" id="lab-sub">';
  for (var i = 0; i < LAB_STAGES.length; i++) {
    var cur = (inLab && LAB_STAGES[i][0] === here) ? ' aria-current="page"' : '';
    labSub += '<li><a href="' + p + 'lab/' + LAB_STAGES[i][0] + '"' + cur + '>' + LAB_STAGES[i][1] + '</a></li>';
  }
  labSub += '</ul>';

  var sidebarHTML = ''
    + '<aside class="sidebar" id="site-menu" aria-label="Site menu">'
    + '  <button type="button" class="m-close" aria-label="Close menu">&times;</button>'
    + '  <a class="brand" href="' + p + 'index.html"><img class="brand-logo" src="' + p + 'assets/icons/wen-logo-96.png" width="40" height="40" alt="Wen cat logo, the Wen Almanac sign"><span class="brand-text"><span class="brand-name">Wen <span>Almanac</span></span><small class="brand-tag">open your mind</small></span></a>'

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
    + '      <li class="has-sub' + (inLab ? ' open' : '') + '"><a href="' + p + 'lab/index.html"><strong>&#9733; Wen Open Lab</strong></a><button type="button" class="sub-toggle" aria-controls="lab-sub" aria-expanded="' + (inLab ? 'true' : 'false') + '" aria-label="Show Wen Open Lab stages"></button>' + labSub + '</li>'
    + '      <li><a href="' + p + 'quiz.html"><strong>&#10067; What do you know about Wen?</strong></a></li>'
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
    + '    <a href="' + p + 'posts/meow-is-back-on-the-planetary-call-60-back-to-the-future-with-jup-friend-wen.html">Meow</a><span class="sep">○</span>'
    + '    <a href="' + p + 'posts/what-is-wendys-backstory-and-what-is-new-world-wen-crypto.html">Wendy\'s</a><span class="sep">○</span>'
    + '    <a href="' + p + 'posts/bsol-new-york-stock-exchange-wall-street.html">BSol Wallstreet</a><span class="sep">○</span>'
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
    + '    <a href="' + p + 'index.html">Wen Almanac</a>'
    + '  </p>'
    + '</footer>';

  function inject() {
    var s = document.getElementById('sidebar-slot');
    var f = document.getElementById('footer-slot');
    if (s) s.outerHTML = sidebarHTML;
    if (f) f.outerHTML = footerHTML;
    try { enhance(); } catch (e) { /* menu still works as plain links */ }
  }

  // ---------- Levels, "you are here" trail and the mobile menu ----------
  function clean(u) { return String(u).split('#')[0].split('?')[0].replace(/\/$/, '/index.html'); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function enhance() {
    var side = document.getElementById('site-menu');
    if (!side) return;
    var me = clean(window.location.href);
    var activeText = '';

    // 1. Mark the current page in the menu
    Array.prototype.forEach.call(side.querySelectorAll('nav.key-pages a'), function (a) {
      if (clean(a.href) === me) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
        if (!activeText) activeText = a.textContent.replace(/^[\s\u2605\u2753]+/, '').trim();
      }
    });

    // 2. Sub-level toggles (open / close a section)
    Array.prototype.forEach.call(side.querySelectorAll('.has-sub > .sub-toggle'), function (b) {
      b.addEventListener('click', function () {
        var li = b.parentNode, open = !li.classList.contains('open');
        li.classList.toggle('open', open);
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    // 3. "You are here" trail: level > sub-level > page
    var trail = [['Home', p + 'index.html']];
    var h1 = document.querySelector('main h1');
    var title = h1 ? h1.textContent.trim() : document.title;
    if (inLab) {
      trail.push(['Wen Open Lab', p + 'lab/index.html']);
      for (var k = 0; k < LAB_STAGES.length; k++) {
        if (LAB_STAGES[k][0] === here && here !== 'index.html') {
          trail.push([LAB_STAGES[k][1].replace(/&amp;/g, '&').replace(/&#\d+;\s*/g, '').replace(/^\d+\s\u00b7\s/, ''), null]);
        }
      }
    } else if (/\/media\//.test(window.location.pathname)) {
      trail.push(['Wen Media', p + 'wen-media.html']);
      trail.push([title, null]);
    } else if (/\/posts\//.test(window.location.pathname)) {
      trail.push(['Posts', p + 'navigation.html']);
      trail.push([title, null]);
    } else if (here !== 'index.html' && here !== '') {
      trail.push([activeText || title, null]);
    }
    var crumbs = '<ol>';
    trail.forEach(function (t, n) {
      var last = n === trail.length - 1;
      crumbs += last ? '<li aria-current="page"><span>' + esc(t[0]) + '</span></li>'
                     : '<li><a href="' + t[1] + '">' + esc(t[0]) + '</a></li>';
    });
    crumbs += '</ol>';

    // 4. Compact mobile header: logo, trail, menu button (hidden on desktop by CSS)
    var head = document.createElement('div');
    head.className = 'm-head';
    head.innerHTML = '<div class="m-bar">'
      + '<a class="m-brand" href="' + p + 'index.html"><img src="' + p + 'assets/icons/wen-logo-96.png" width="34" height="34" alt="Wen cat logo"><span>Wen <span>Almanac</span></span></a>'
      + '<button type="button" class="m-burger" aria-controls="site-menu" aria-expanded="false"><span class="m-lines" aria-hidden="true"></span>Menu</button>'
      + '</div>'
      + '<nav class="m-crumbs" aria-label="You are here">' + crumbs + '</nav>';
    document.body.insertBefore(head, document.body.firstChild);
    var shade = document.createElement('div');
    shade.className = 'm-backdrop';
    document.body.appendChild(shade);

    var burger = head.querySelector('.m-burger');
    var closeBtn = side.querySelector('.m-close');
    function setOpen(open) {
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { setTimeout(function () { (closeBtn || side).focus(); }, 60); var cur = side.querySelector('[aria-current="page"]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' }); }
      else burger.focus();
    }
    burger.addEventListener('click', function () { setOpen(!document.body.classList.contains('menu-open')); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    shade.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setOpen(false);
    });
    side.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && document.body.classList.contains('menu-open')) document.body.classList.remove('menu-open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
