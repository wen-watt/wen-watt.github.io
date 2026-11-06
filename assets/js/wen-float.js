/* Wen floating mini player: a small looping Wen clip in the corner that opens a card with links.
   No trackers, no third-party requests. Loads its video only after the page is idle.
   Options on the <script> tag: data-watch (series link), data-lab (Lab link), data-title. */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me || window.__wenFloat) return; window.__wenFloat = 1;
  var base = me.src.replace(/js\/wen-float\.js.*$/, '');
  var media = base + 'media/';
  var watch = me.getAttribute('data-watch') || 'https://www.youtube.com/@wen-coin';
  var lab = me.getAttribute('data-lab') || base.replace(/assets\/$/, '') + 'lab/';
  var title = me.getAttribute('data-title') || 'Wen Open Lab · video series';
  var KEY = 'wenFloatHidden';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = '' +
    '.wf{position:fixed;right:18px;bottom:18px;z-index:9990;font-family:Inter,system-ui,sans-serif;color:#e9ebee}' +
    '.wf *{box-sizing:border-box}' +
    '.wf-bub{position:relative;width:92px;height:92px;border-radius:50%;padding:0;border:3px solid #57b3ad;background:#0a0c14 center/cover no-repeat;cursor:pointer;overflow:visible;box-shadow:0 8px 28px rgba(0,0,0,.55)}' +
    '.wf-bub video{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}' +
    '.wf-bub:after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2px solid rgba(87,179,173,.55);animation:wfp 2.4s ease-out infinite}' +
    '@keyframes wfp{0%{transform:scale(.9);opacity:1}100%{transform:scale(1.25);opacity:0}}' +
    '.wf-play{position:absolute;right:-4px;bottom:-4px;width:30px;height:30px;border-radius:50%;background:#e0a444;color:#0a0c14;display:grid;place-items:center;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.5)}' +
    '.wf-x{position:absolute;top:-8px;left:-8px;width:26px;height:26px;border-radius:50%;border:1px solid #333c4a;background:#161b26;color:#8d97a6;font:600 15px/1 Inter,sans-serif;cursor:pointer;display:grid;place-items:center}' +
    '.wf-card{display:none;width:250px;border-radius:16px;overflow:hidden;background:#161b26;border:1px solid #333c4a;box-shadow:0 14px 44px rgba(0,0,0,.6)}' +
    '.wf.open .wf-card{display:block}.wf.open .wf-bubwrap{display:none}' +
    '.wf-vid{position:relative;aspect-ratio:9/16;max-height:52vh;width:100%;background:#0a0c14 center/cover no-repeat}' +
    '.wf-vid video{width:100%;height:100%;object-fit:cover;display:block}' +
    '.wf-cl{position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;border:0;background:rgba(10,12,20,.75);color:#e9ebee;font-size:17px;cursor:pointer}' +
    '.wf-b{padding:12px 14px 14px}' +
    '.wf-t{font:600 14px/1.3 Inter,sans-serif;margin:0 0 10px}' +
    '.wf-a{display:block;text-align:center;text-decoration:none;font:600 14px Inter,sans-serif;padding:10px;border-radius:10px;margin-top:8px}' +
    '.wf-a1{background:#e0a444;color:#0a0c14}.wf-a2{border:1px solid #57b3ad;color:#57b3ad}' +
    '.wf-tab{display:none;border:1px solid #333c4a;background:#161b26;color:#e9ebee;border-radius:999px;padding:8px 14px;font:600 13px Inter,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)}' +
    '.wf.min .wf-bubwrap,.wf.min .wf-card{display:none}.wf.min .wf-tab{display:block}' +
    '@media (max-width:600px){.wf{right:12px;bottom:12px}.wf-bub{width:72px;height:72px}.wf-card{width:210px}}' +
    '@media (prefers-reduced-motion:reduce){.wf-bub:after{animation:none}}' +
    '@media print{.wf{display:none}}';

  function vid() {
    if (reduce) return '';
    return '<video muted loop playsinline preload="none" poster="' + media + 'wen-float-poster.jpg">' +
      '<source data-src="' + media + 'wen-float-loop.webm" type="video/webm">' +
      '<source data-src="' + media + 'wen-float-loop.mp4" type="video/mp4"></video>';
  }
  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var w = document.createElement('div'); w.className = 'wf' + (get() ? ' min' : '');
    w.setAttribute('role', 'complementary'); w.setAttribute('aria-label', 'Wen video');
    var poster = 'background-image:url(' + media + 'wen-float-poster.jpg)';
    w.innerHTML =
      '<div class="wf-bubwrap" style="position:relative">' +
        '<button class="wf-bub" type="button" aria-label="Open the Wen video card" style="' + poster + '">' + vid() + '<span class="wf-play" aria-hidden="true">▶</span></button>' +
        '<button class="wf-x" type="button" aria-label="Hide the Wen video">×</button></div>' +
      '<div class="wf-card" role="dialog" aria-label="' + title + '">' +
        '<div class="wf-vid" style="' + poster + '">' + vid() + '<button class="wf-cl" type="button" aria-label="Close">×</button></div>' +
        '<div class="wf-b"><p class="wf-t">' + title + '</p>' +
        '<a class="wf-a wf-a1" href="' + watch + '" target="_blank" rel="noopener">▶ Watch the series</a>' +
        '<a class="wf-a wf-a2" href="' + lab + '">Open the Lab</a></div></div>' +
      '<button class="wf-tab" type="button" aria-label="Show the Wen video">▶ Wen video</button>';
    document.body.appendChild(w);
    var vids = w.querySelectorAll('video');
    function load() {
      for (var i = 0; i < vids.length; i++) {
        var s = vids[i].querySelectorAll('source');
        for (var j = 0; j < s.length; j++) if (!s[j].src) s[j].src = s[j].getAttribute('data-src');
        vids[i].load();
      }
      play();
    }
    function play() {
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i], vis = v.offsetParent !== null;
        if (vis) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      }
    }
    var loaded = false;
    function ensure() { if (!loaded && vids.length) { loaded = true; load(); } else play(); }
    w.querySelector('.wf-bub').onclick = function () { w.classList.add('open'); ensure(); };
    w.querySelector('.wf-cl').onclick = function () { w.classList.remove('open'); play(); };
    w.querySelector('.wf-x').onclick = function () { w.classList.add('min'); set('1'); play(); };
    w.querySelector('.wf-tab').onclick = function () { w.classList.remove('min'); set(null); ensure(); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && w.classList.contains('open')) { w.classList.remove('open'); play(); } });
    if (!get()) { var idle = window.requestIdleCallback || function (f) { setTimeout(f, 2500); }; setTimeout(function () { idle(ensure); }, 1500); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
